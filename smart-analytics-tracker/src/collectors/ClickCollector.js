/**
 * ClickCollector - Recopilador de clicks con heatmap y detección de rage clicks
 */
export class ClickCollector {
  constructor(config = {}) {
    this.config = {
      rageClickThreshold: 3,      // Número de clicks para considerar "rage"
      rageClickWindow: 2000,       // Ventana de tiempo en ms
      rageClickRadius: 50,         // Radio en px para considerar mismo punto
      heatmapGridSize: 50,         // Tamaño de celda del grid en px
      trackButtons: true,          // Trackear específicamente botones
      trackLinks: true,            // Trackear específicamente links
      ...config
    };
    
    this.eventBus = null;
    this.metrics = null;
    this.clickBuffer = [];          // Buffer para rage detection
    this.heatmapData = new Map();   // Mapa de calor
    this.elementClicks = new Map(); // Clicks por elemento
  }

  setEventBus(eventBus) {
    this.eventBus = eventBus;
  }

  setMetrics(metrics) {
    this.metrics = metrics;
  }

  start() {
    console.log('👆 ClickCollector iniciado');
    
    // Suscribirse a eventos de click
    this.eventBus.on('click:registered', (clickData) => {
      this.processClick(clickData);
    });
  }

  /**
   * Procesar click recibido
   */
  processClick(clickData) {
    // 1. Guardar en métricas principales
    this.metrics.clicks.push(clickData);
    
    // 2. Actualizar heatmap
    this.updateHeatmap(clickData);
    
    // 3. Trackear clicks por elemento
    this.trackElementClick(clickData);
    
    // 4. Detectar rage clicks
    this.detectRageClick(clickData);
    
    // 5. Emitir evento procesado
    this.eventBus.emit('click:processed', {
      ...clickData,
      heatmapCell: this.getHeatmapCell(clickData.x, clickData.y)
    });
  }

  /**
   * Actualizar heatmap - Agrupa clicks en grid
   */
  updateHeatmap(clickData) {
    const gridSize = this.config.heatmapGridSize;
    
    // Calcular celda del grid
    const cellX = Math.floor(clickData.x / gridSize);
    const cellY = Math.floor(clickData.y / gridSize);
    const cellKey = `${cellX},${cellY}`;
    
    // Inicializar celda si no existe
    if (!this.heatmapData.has(cellKey)) {
      this.heatmapData.set(cellKey, {
        x: cellX * gridSize,
        y: cellY * gridSize,
        width: gridSize,
        height: gridSize,
        count: 0,
        clicks: [],
        intensity: 0
      });
    }
    
    // Actualizar celda
    const cell = this.heatmapData.get(cellKey);
    cell.count++;
    cell.clicks.push({
      timestamp: clickData.timestamp,
      selector: clickData.selector,
      exactX: clickData.x,
      exactY: clickData.y
    });
    
    // Calcular intensidad (normalizada 0-100)
    const maxClicks = Math.max(...Array.from(this.heatmapData.values()).map(c => c.count));
    cell.intensity = Math.min(100, Math.round((cell.count / maxClicks) * 100));
    
    // Emitir actualización de heatmap
    this.eventBus.emit('heatmap:updated', {
      cell: cellKey,
      data: cell,
      totalCells: this.heatmapData.size
    });
  }

  /**
   * Obtener celda de heatmap para coordenadas
   */
  getHeatmapCell(x, y) {
    const gridSize = this.config.heatmapGridSize;
    const cellX = Math.floor(x / gridSize);
    const cellY = Math.floor(y / gridSize);
    return `${cellX},${cellY}`;
  }

  /**
   * Trackear clicks por elemento específico
   */
  trackElementClick(clickData) {
    const selector = clickData.selector;
    
    if (!this.elementClicks.has(selector)) {
      this.elementClicks.set(selector, {
        selector,
        count: 0,
        firstClick: null,
        lastClick: null,
        clicks: []
      });
    }
    
    const element = this.elementClicks.get(selector);
    element.count++;
    element.lastClick = clickData.timestamp;
    
    if (!element.firstClick) {
      element.firstClick = clickData.timestamp;
    }
    
    element.clicks.push({
      x: clickData.x,
      y: clickData.y,
      timestamp: clickData.timestamp
    });
  }

  /**
   * Detectar rage clicks - Múltiples clicks rápidos en mismo lugar
   */
  detectRageClick(clickData) {
    const now = Date.now();
    const threshold = this.config.rageClickThreshold;
    const timeWindow = this.config.rageClickWindow;
    const radius = this.config.rageClickRadius;
    
    // Agregar click al buffer
    this.clickBuffer.push(clickData);
    
    // Limpiar clicks antiguos del buffer (fuera de la ventana de tiempo)
    this.clickBuffer = this.clickBuffer.filter(
      click => (now - click.timestamp) < timeWindow
    );
    
    // Buscar clicks cercanos en el buffer
    const nearbyClicks = this.clickBuffer.filter(click => {
      const distance = this.calculateDistance(
        clickData.x, clickData.y,
        click.x, click.y
      );
      return distance < radius;
    });
    
    // ¡RAGE CLICK DETECTADO!
    if (nearbyClicks.length >= threshold) {
      const rageEvent = {
        type: 'rage_click',
        location: { 
          x: clickData.x, 
          y: clickData.y 
        },
        selector: clickData.selector,
        target: clickData.target,
        clickCount: nearbyClicks.length,
        timestamp: now,
        duration: now - nearbyClicks[0].timestamp,
        clicks: nearbyClicks.map(c => ({
          x: c.x,
          y: c.y,
          timestamp: c.timestamp
        }))
      };
      
      // Guardar en métricas
      this.metrics.rageClicks.push(rageEvent);
      
      // Emitir custom event
      this.eventBus.emit('rage:detected', rageEvent);
      
      // Limpiar buffer para evitar duplicados
      this.clickBuffer = this.clickBuffer.filter(
        click => !nearbyClicks.includes(click)
      );
      
      console.warn('😤 RAGE CLICK detectado:', {
        selector: rageEvent.selector,
        clicks: rageEvent.clickCount,
        duration: `${rageEvent.duration}ms`
      });
    }
  }

  /**
   * Calcular distancia euclidiana entre dos puntos
   */
  calculateDistance(x1, y1, x2, y2) {
    return Math.sqrt(
      Math.pow(x2 - x1, 2) + 
      Math.pow(y2 - y1, 2)
    );
  }

  /**
   * Obtener heatmap completo ordenado por intensidad
   */
  getHeatmap() {
    return Array.from(this.heatmapData.entries())
      .map(([key, data]) => ({
        cell: key,
        ...data
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Obtener top zonas más clickeadas
   */
  getTopClickZones(limit = 10) {
    return this.getHeatmap().slice(0, limit);
  }

  /**
   * Obtener clicks por elemento
   */
  getElementClicks(limit = 10) {
    return Array.from(this.elementClicks.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Obtener estadísticas de clicks
   */
  getStats() {
    const totalClicks = this.metrics.clicks.length;
    const totalRageClicks = this.metrics.rageClicks.length;
    const uniqueElements = this.elementClicks.size;
    const heatmapCells = this.heatmapData.size;
    
    return {
      totalClicks,
      totalRageClicks,
      rageClickPercentage: totalClicks > 0 
        ? Math.round((totalRageClicks / totalClicks) * 100) 
        : 0,
      uniqueElements,
      heatmapCells,
      topElement: this.getElementClicks(1)[0] || null,
      topZone: this.getTopClickZones(1)[0] || null
    };
  }

  /**
   * Generar datos para visualización de heatmap
   */
  getHeatmapVisualizationData() {
    const maxIntensity = Math.max(
      ...Array.from(this.heatmapData.values()).map(c => c.intensity),
      1
    );
    
    return Array.from(this.heatmapData.values()).map(cell => ({
      x: cell.x,
      y: cell.y,
      value: cell.count,
      intensity: cell.intensity,
      normalizedIntensity: cell.intensity / maxIntensity,
      color: this.getHeatColor(cell.intensity)
    }));
  }

  /**
   * Obtener color según intensidad (escala de calor)
   */
  getHeatColor(intensity) {
    // Escala: azul -> verde -> amarillo -> rojo
    if (intensity < 25) {
      return `rgba(0, 0, 255, ${0.2 + (intensity / 25) * 0.3})`;
    } else if (intensity < 50) {
      return `rgba(0, 255, 0, ${0.3 + ((intensity - 25) / 25) * 0.3})`;
    } else if (intensity < 75) {
      return `rgba(255, 255, 0, ${0.4 + ((intensity - 50) / 25) * 0.3})`;
    } else {
      return `rgba(255, 0, 0, ${0.5 + ((intensity - 75) / 25) * 0.4})`;
    }
  }

  stop() {
    console.log('👆 ClickCollector detenido', {
      totalClicks: this.metrics.clicks.length,
      rageClicks: this.metrics.rageClicks.length
    });
  }
}
