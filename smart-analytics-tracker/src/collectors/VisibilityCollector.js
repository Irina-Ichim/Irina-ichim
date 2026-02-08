/**
 * VisibilityCollector - Tracking de visibilidad usando IntersectionObserver
 * Mide tiempo real de visualización de elementos
 */
export class VisibilityCollector {
  constructor(config = {}) {
    this.config = {
      threshold: 0.5,              // 50% visible para considerar "visto"
      rootMargin: '0px',           // Margen adicional
      trackSelectors: [            // Elementos a trackear
        'article',
        'section',
        '.product-card',
        '.cta-button',
        '[data-track]',
        '[data-track-visibility]'
      ],
      minVisibilityTime: 1000,     // Mínimo 1s para contar como "visto"
      updateInterval: 1000,        // Actualizar cada 1 segundo
      ...config
    };
    
    this.eventBus = null;
    this.metrics = null;
    this.observer = null;
    this.visibilityMap = new Map();  // Estado de cada elemento
    this.activeTimers = new Map();   // Timers de elementos visibles
  }

  setEventBus(eventBus) {
    this.eventBus = eventBus;
  }

  setMetrics(metrics) {
    this.metrics = metrics;
  }

  start() {
    console.log('👁️ VisibilityCollector iniciado');
    
    // Crear IntersectionObserver
    this.observer = new IntersectionObserver(
      (entries) => this.handleIntersection(entries),
      {
        threshold: this.config.threshold,
        rootMargin: this.config.rootMargin
      }
    );
    
    // Observar elementos iniciales
    this.observeElements();
    
    // Observar elementos dinámicos
    this.setupDynamicObservation();
  }

  /**
   * Observar elementos según selectores configurados
   */
  observeElements() {
    const selectors = this.config.trackSelectors.join(',');
    const elements = document.querySelectorAll(selectors);
    
    elements.forEach((element, index) => {
      this.observeElement(element, index);
    });
    
    console.log(`👁️ Observando ${elements.length} elementos`);
  }

  /**
   * Observar un elemento específico
   */
  observeElement(element, index) {
    // Asignar ID único si no tiene
    if (!element.dataset.trackId) {
      element.dataset.trackId = `element-${index}-${Date.now()}`;
    }
    
    const elementId = element.dataset.trackId;
    
    // Inicializar en mapa
    if (!this.visibilityMap.has(elementId)) {
      this.visibilityMap.set(elementId, {
        element: this.getElementInfo(element),
        elementRef: element,
        totalTime: 0,
        sessions: [],
        firstSeen: null,
        lastSeen: null,
        isVisible: false,
        maxVisibleTime: 0
      });
    }
    
    // Observar
    this.observer.observe(element);
  }

  /**
   * Setup para observar elementos que se agregan dinámicamente
   */
  setupDynamicObservation() {
    // Observar cada 5 segundos por si hay nuevos elementos
    setInterval(() => {
      const selectors = this.config.trackSelectors.join(',');
      const elements = document.querySelectorAll(selectors);
      
      elements.forEach((element, index) => {
        if (!element.dataset.trackId) {
          this.observeElement(element, index);
        }
      });
    }, 5000);
  }

  /**
   * Handler de cambios de intersección
   */
  handleIntersection(entries) {
    entries.forEach(entry => {
      const elementId = entry.target.dataset.trackId;
      const data = this.visibilityMap.get(elementId);
      
      if (!data) return;
      
      if (entry.isIntersecting) {
        // Elemento VISIBLE
        this.startTracking(elementId, data, entry);
      } else {
        // Elemento OCULTO
        this.stopTracking(elementId, data);
      }
    });
  }

  /**
   * Iniciar tracking de visibilidad
   */
  startTracking(elementId, data, entry) {
    const now = Date.now();
    
    // Marcar como visible
    data.isVisible = true;
    
    // Registrar primera vez visto
    if (!data.firstSeen) {
      data.firstSeen = now;
    }
    
    // Crear nueva sesión de visualización
    const session = {
      startTime: now,
      endTime: null,
      duration: 0,
      intersectionRatio: entry.intersectionRatio,
      boundingClientRect: entry.boundingClientRect
    };
    
    data.sessions.push(session);
    
    // Timer que actualiza cada segundo
    const timer = setInterval(() => {
      const currentSession = data.sessions[data.sessions.length - 1];
      if (currentSession && !currentSession.endTime) {
        currentSession.duration = Date.now() - currentSession.startTime;
        data.totalTime = data.sessions.reduce((sum, s) => sum + s.duration, 0);
        
        // Actualizar máximo tiempo visible
        if (currentSession.duration > data.maxVisibleTime) {
          data.maxVisibleTime = currentSession.duration;
        }
        
        // Emitir actualización
        this.eventBus.emit('visibility:update', {
          elementId,
          totalTime: data.totalTime,
          currentDuration: currentSession.duration,
          sessionsCount: data.sessions.length
        });
      }
    }, this.config.updateInterval);
    
    this.activeTimers.set(elementId, timer);
    
    // Emitir evento de inicio
    this.eventBus.emit('visibility:started', {
      elementId,
      element: data.element,
      timestamp: now
    });
    
    if (this.config.debugMode) {
      console.log(`👁️ Iniciando tracking: ${elementId}`);
    }
  }

  /**
   * Detener tracking de visibilidad
   */
  stopTracking(elementId, data) {
    const timer = this.activeTimers.get(elementId);
    if (!timer) return;
    
    // Limpiar timer
    clearInterval(timer);
    this.activeTimers.delete(timer);
    
    // Marcar como no visible
    data.isVisible = false;
    
    // Finalizar sesión actual
    const currentSession = data.sessions[data.sessions.length - 1];
    if (currentSession && !currentSession.endTime) {
      currentSession.endTime = Date.now();
      currentSession.duration = currentSession.endTime - currentSession.startTime;
      data.totalTime = data.sessions.reduce((sum, s) => sum + s.duration, 0);
      data.lastSeen = currentSession.endTime;
      
      // Solo guardar en métricas si superó el tiempo mínimo
      if (data.totalTime >= this.config.minVisibilityTime) {
        this.metrics.visibility.push({
          elementId,
          element: data.element,
          totalTime: data.totalTime,
          sessions: data.sessions.length,
          maxVisibleTime: data.maxVisibleTime,
          firstSeen: data.firstSeen,
          lastSeen: data.lastSeen,
          timestamp: Date.now()
        });
      }
      
      // Emitir evento de parada
      this.eventBus.emit('visibility:stopped', {
        elementId,
        totalTime: data.totalTime,
        sessions: data.sessions.length
      });
      
      if (this.config.debugMode) {
        console.log(`👁️ Deteniendo tracking: ${elementId} (${Math.round(data.totalTime / 1000)}s total)`);
      }
    }
  }

  /**
   * Obtener información del elemento
   */
  getElementInfo(element) {
    return {
      tag: element.tagName.toLowerCase(),
      id: element.id || null,
      classes: Array.from(element.classList),
      text: element.textContent?.substring(0, 100).trim() || '',
      attributes: this.getRelevantAttributes(element)
    };
  }

  /**
   * Obtener atributos relevantes del elemento
   */
  getRelevantAttributes(element) {
    const attrs = {};
    const relevantAttrs = ['data-track', 'data-track-visibility', 'data-product-id', 'href', 'src'];
    
    relevantAttrs.forEach(attr => {
      if (element.hasAttribute(attr)) {
        attrs[attr] = element.getAttribute(attr);
      }
    });
    
    return attrs;
  }

  /**
   * Obtener elementos más vistos
   */
  getTopViewed(limit = 10) {
    return Array.from(this.visibilityMap.values())
      .filter(data => data.totalTime >= this.config.minVisibilityTime)
      .map(data => ({
        elementId: data.element.id || 'anonymous',
        element: data.element,
        totalTime: data.totalTime,
        sessions: data.sessions.length,
        maxVisibleTime: data.maxVisibleTime,
        averageSessionTime: data.sessions.length > 0 
          ? Math.round(data.totalTime / data.sessions.length) 
          : 0
      }))
      .sort((a, b) => b.totalTime - a.totalTime)
      .slice(0, limit);
  }

  /**
   * Obtener estadísticas de visibilidad
   */
  getStats() {
    const trackedElements = this.visibilityMap.size;
    const visibleElements = Array.from(this.visibilityMap.values())
      .filter(d => d.isVisible).length;
    const totalViews = this.metrics.visibility.length;
    
    const times = Array.from(this.visibilityMap.values())
      .filter(d => d.totalTime > 0)
      .map(d => d.totalTime);
    
    const avgTime = times.length > 0 
      ? times.reduce((sum, t) => sum + t, 0) / times.length 
      : 0;
    
    return {
      trackedElements,
      currentlyVisible: visibleElements,
      totalViews,
      averageViewTime: Math.round(avgTime),
      topElement: this.getTopViewed(1)[0] || null
    };
  }

  /**
   * Obtener elementos actualmente visibles
   */
  getCurrentlyVisible() {
    return Array.from(this.visibilityMap.entries())
      .filter(([_, data]) => data.isVisible)
      .map(([id, data]) => ({
        elementId: id,
        element: data.element,
        currentSessionTime: data.sessions[data.sessions.length - 1]?.duration || 0,
        totalTime: data.totalTime
      }));
  }

  stop() {
    // Detener todos los elementos visibles
    this.visibilityMap.forEach((data, elementId) => {
      if (data.isVisible) {
        this.stopTracking(elementId, data);
      }
    });
    
    // Limpiar timers
    this.activeTimers.forEach(timer => clearInterval(timer));
    this.activeTimers.clear();
    
    // Desconectar observer
    if (this.observer) {
      this.observer.disconnect();
    }
    
    console.log('👁️ VisibilityCollector detenido', {
      totalTracked: this.visibilityMap.size,
      totalViews: this.metrics.visibility.length
    });
  }
}
