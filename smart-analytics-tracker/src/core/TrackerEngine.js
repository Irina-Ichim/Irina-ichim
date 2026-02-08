/**
 * TrackerEngine - Orquestador principal del sistema de analytics
 * Gestiona event delegation, collectors y exportación de métricas
 */
import { EventBus } from './EventBus.js';

export class TrackerEngine {
  constructor(config = {}) {
    this.config = {
      enableClicks: true,
      enableScroll: true,
      enableVisibility: true,
      exportInterval: 30000, // 30 segundos
      autoExport: false,
      debugMode: false,
      ...config
    };
    
    this.eventBus = new EventBus();
    this.eventBus.setDebugMode(this.config.debugMode);
    
    this.metrics = {
      clicks: [],
      scroll: [],
      visibility: [],
      rageClicks: [],
      mutations: []
    };
    
    this.collectors = [];
    this.isTracking = false;
    this.startTime = null;
    this.exportTimer = null;
    
    // Bindings
    this.handleClick = this.handleClick.bind(this);
    this.handleScroll = this.handleScroll.bind(this);
  }

  /**
   * Iniciar tracking
   */
  start() {
    if (this.isTracking) {
      console.warn('⚠️ Tracker ya está activo');
      return;
    }
    
    this.startTime = Date.now();
    this.isTracking = true;
    
    console.log('🚀 Smart Analytics Tracker iniciado');
    console.log('⚙️ Configuración:', this.config);
    
    // Setup event delegation
    this.setupGlobalListeners();
    
    // Iniciar collectors
    this.collectors.forEach(collector => {
      try {
        collector.start();
      } catch (error) {
        console.error('Error iniciando collector:', error);
      }
    });
    
    // Auto-export
    if (this.config.autoExport && this.config.exportInterval) {
      this.exportTimer = setInterval(() => {
        const metrics = this.getMetrics();
        this.eventBus.emit('metrics:ready', metrics);
        
        if (this.config.debugMode) {
          console.log('📊 Métricas auto-exportadas', metrics);
        }
      }, this.config.exportInterval);
    }
    
    this.eventBus.emit('tracker:started', { startTime: this.startTime });
  }

  /**
   * Event Delegation - Setup de listeners globales
   */
  setupGlobalListeners() {
    if (this.config.enableClicks) {
      // Capturing phase para interceptar antes que cualquier otro listener
      document.addEventListener('click', this.handleClick, true);
    }

    if (this.config.enableScroll) {
      // Passive listener para mejor performance
      let isScrolling = false;
      
      window.addEventListener('scroll', () => {
        if (!isScrolling) {
          isScrolling = true;
          
          // requestAnimationFrame para optimizar performance
          requestAnimationFrame(() => {
            this.handleScroll();
            isScrolling = false;
          });
        }
      }, { passive: true });
    }
  }

  /**
   * Handler de clicks con event delegation
   */
  handleClick(e) {
    const clickData = {
      x: e.clientX,
      y: e.pageY,
      screenX: e.screenX,
      screenY: e.screenY,
      target: e.target.tagName,
      selector: this.getSelector(e.target),
      timestamp: Date.now(),
      path: this.getEventPath(e)
    };
    
    this.eventBus.emit('click:registered', clickData);
  }

  /**
   * Handler de scroll optimizado
   */
  handleScroll() {
    const scrollData = {
      scrollY: window.scrollY,
      scrollX: window.scrollX,
      scrollPercent: this.getScrollPercent(),
      timestamp: Date.now()
    };
    
    this.eventBus.emit('scroll:detected', scrollData);
  }

  /**
   * Obtener selector CSS único del elemento
   */
  getSelector(element) {
    if (element.id) {
      return `#${element.id}`;
    }
    
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ').filter(c => c.trim());
      if (classes.length) {
        return `.${classes.join('.')}`;
      }
    }
    
    // Fallback: tag name
    return element.tagName.toLowerCase();
  }

  /**
   * Obtener event path (bubbling path)
   */
  getEventPath(event) {
    const path = [];
    let element = event.target;
    
    while (element) {
      path.push({
        tag: element.tagName?.toLowerCase(),
        id: element.id || null,
        classes: element.className ? Array.from(element.classList) : []
      });
      element = element.parentElement;
    }
    
    return path;
  }

  /**
   * Calcular porcentaje de scroll
   */
  getScrollPercent() {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY;
    const scrollable = documentHeight - windowHeight;
    
    if (scrollable <= 0) return 100;
    
    return Math.min(Math.round((scrollTop / scrollable) * 100), 100);
  }

  /**
   * Registrar collector
   */
  use(collector) {
    collector.setEventBus(this.eventBus);
    collector.setMetrics(this.metrics);
    this.collectors.push(collector);
    
    if (this.isTracking) {
      collector.start();
    }
    
    return this; // Chainable
  }

  /**
   * Obtener métricas actuales
   */
  getMetrics() {
    return {
      session: {
        startTime: this.startTime,
        duration: Date.now() - this.startTime,
        url: window.location.href,
        userAgent: navigator.userAgent
      },
      summary: {
        totalClicks: this.metrics.clicks.length,
        totalRageClicks: this.metrics.rageClicks.length,
        scrollEvents: this.metrics.scroll.length,
        visibilityEvents: this.metrics.visibility.length,
        mutations: this.metrics.mutations.length
      },
      data: {
        clicks: this.metrics.clicks,
        rageClicks: this.metrics.rageClicks,
        scroll: this.metrics.scroll,
        visibility: this.metrics.visibility,
        mutations: this.metrics.mutations
      }
    };
  }

  /**
   * Exportar métricas a JSON
   */
  export(filename = null) {
    const data = this.getMetrics();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `analytics-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('💾 Métricas exportadas:', a.download);
    this.eventBus.emit('metrics:exported', data);
  }

  /**
   * Enviar métricas a endpoint
   */
  async send(endpoint, options = {}) {
    const data = this.getMetrics();
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        body: JSON.stringify(data),
        ...options
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('📤 Métricas enviadas exitosamente');
      this.eventBus.emit('metrics:sent', { endpoint, result });
      
      return result;
    } catch (error) {
      console.error('❌ Error enviando métricas:', error);
      this.eventBus.emit('metrics:error', { endpoint, error });
      throw error;
    }
  }

  /**
   * Limpiar métricas
   */
  clear() {
    this.metrics = {
      clicks: [],
      scroll: [],
      visibility: [],
      rageClicks: [],
      mutations: []
    };
    
    this.eventBus.emit('metrics:cleared');
    console.log('🧹 Métricas limpiadas');
  }

  /**
   * Detener tracking
   */
  stop() {
    if (!this.isTracking) {
      console.warn('⚠️ Tracker ya está detenido');
      return;
    }
    
    this.isTracking = false;
    
    // Limpiar listeners
    if (this.config.enableClicks) {
      document.removeEventListener('click', this.handleClick, true);
    }
    
    // Detener collectors
    this.collectors.forEach(collector => {
      try {
        collector.stop();
      } catch (error) {
        console.error('Error deteniendo collector:', error);
      }
    });
    
    // Limpiar timer de export
    if (this.exportTimer) {
      clearInterval(this.exportTimer);
      this.exportTimer = null;
    }
    
    const duration = Date.now() - this.startTime;
    console.log(`⏹️ Tracker detenido (duración: ${Math.round(duration / 1000)}s)`);
    
    this.eventBus.emit('tracker:stopped', { 
      duration,
      metrics: this.getMetrics() 
    });
  }

  /**
   * Destruir tracker completamente
   */
  destroy() {
    this.stop();
    this.eventBus.clear();
    this.collectors = [];
    this.metrics = null;
    console.log('💥 Tracker destruido');
  }
}
