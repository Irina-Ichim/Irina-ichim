/**
 * IntersectionManager - Gestión avanzada de IntersectionObserver
 * Proporciona utilidades adicionales para trabajar con visibilidad
 */
export class IntersectionManager {
  constructor(config = {}) {
    this.config = {
      threshold: [0, 0.25, 0.5, 0.75, 1.0],  // Múltiples thresholds
      rootMargin: '0px',
      trackVisibilityTime: true,
      minVisibilityTime: 1000,  // 1 segundo
      ...config
    };
    
    this.eventBus = null;
    this.observers = new Map();  // Múltiples observers
    this.observedElements = new Map();
    this.visibilityTimers = new Map();
  }

  setEventBus(eventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Crear nuevo observer con configuración específica
   */
  createObserver(name, callback, customConfig = {}) {
    const config = { ...this.config, ...customConfig };
    
    const observer = new IntersectionObserver(
      (entries) => this.handleIntersection(entries, callback, name),
      {
        threshold: config.threshold,
        rootMargin: config.rootMargin,
        root: config.root || null
      }
    );
    
    this.observers.set(name, {
      observer,
      config,
      elements: new Set()
    });
    
    console.log(`👁️ IntersectionObserver creado: ${name}`);
    
    return observer;
  }

  /**
   * Observar elemento con observer específico
   */
  observe(observerName, element, metadata = {}) {
    const observerData = this.observers.get(observerName);
    if (!observerData) {
      console.error(`Observer "${observerName}" no existe`);
      return;
    }
    
    // Asignar ID único
    if (!element.dataset.intersectionId) {
      element.dataset.intersectionId = `int-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    const elementId = element.dataset.intersectionId;
    
    // Guardar metadata
    this.observedElements.set(elementId, {
      element,
      observerName,
      metadata,
      isIntersecting: false,
      intersectionRatio: 0,
      visibilityStartTime: null,
      totalVisibilityTime: 0
    });
    
    // Observar
    observerData.observer.observe(element);
    observerData.elements.add(elementId);
  }

  /**
   * Manejar cambios de intersección
   */
  handleIntersection(entries, callback, observerName) {
    entries.forEach(entry => {
      const elementId = entry.target.dataset.intersectionId;
      const elementData = this.observedElements.get(elementId);
      
      if (!elementData) return;
      
      const wasIntersecting = elementData.isIntersecting;
      const isIntersecting = entry.isIntersecting;
      
      // Actualizar estado
      elementData.isIntersecting = isIntersecting;
      elementData.intersectionRatio = entry.intersectionRatio;
      
      // Gestionar tiempo de visibilidad
      if (isIntersecting && !wasIntersecting) {
        this.startVisibilityTimer(elementId, elementData);
      } else if (!isIntersecting && wasIntersecting) {
        this.stopVisibilityTimer(elementId, elementData);
      }
      
      // Ejecutar callback
      if (callback) {
        callback(entry, elementData);
      }
      
      // Emitir eventos
      this.emitIntersectionEvents(entry, elementData, observerName);
    });
  }

  /**
   * Iniciar timer de visibilidad
   */
  startVisibilityTimer(elementId, elementData) {
    elementData.visibilityStartTime = Date.now();
    
    // Timer que actualiza cada segundo
    const timer = setInterval(() => {
      if (elementData.isIntersecting) {
        const currentTime = Date.now() - elementData.visibilityStartTime;
        elementData.totalVisibilityTime += 1000;
        
        if (this.eventBus) {
          this.eventBus.emit('intersection:visibility-update', {
            elementId,
            currentTime,
            totalTime: elementData.totalVisibilityTime
          });
        }
      }
    }, 1000);
    
    this.visibilityTimers.set(elementId, timer);
  }

  /**
   * Detener timer de visibilidad
   */
  stopVisibilityTimer(elementId, elementData) {
    const timer = this.visibilityTimers.get(elementId);
    if (timer) {
      clearInterval(timer);
      this.visibilityTimers.delete(elementId);
    }
    
    if (elementData.visibilityStartTime) {
      const sessionTime = Date.now() - elementData.visibilityStartTime;
      elementData.totalVisibilityTime += sessionTime;
      elementData.visibilityStartTime = null;
      
      if (this.eventBus && sessionTime >= this.config.minVisibilityTime) {
        this.eventBus.emit('intersection:visibility-ended', {
          elementId,
          sessionTime,
          totalTime: elementData.totalVisibilityTime
        });
      }
    }
  }

  /**
   * Emitir eventos de intersección
   */
  emitIntersectionEvents(entry, elementData, observerName) {
    if (!this.eventBus) return;
    
    // Evento genérico
    this.eventBus.emit('intersection:change', {
      observerName,
      elementId: entry.target.dataset.intersectionId,
      isIntersecting: entry.isIntersecting,
      intersectionRatio: entry.intersectionRatio,
      boundingClientRect: entry.boundingClientRect,
      metadata: elementData.metadata
    });
    
    // Eventos específicos
    if (entry.isIntersecting) {
      this.eventBus.emit('intersection:enter', {
        observerName,
        elementId: entry.target.dataset.intersectionId,
        intersectionRatio: entry.intersectionRatio
      });
    } else {
      this.eventBus.emit('intersection:exit', {
        observerName,
        elementId: entry.target.dataset.intersectionId,
        totalTime: elementData.totalVisibilityTime
      });
    }
    
    // Eventos por threshold
    if (entry.intersectionRatio >= 0.5 && elementData.intersectionRatio < 0.5) {
      this.eventBus.emit('intersection:half-visible', {
        elementId: entry.target.dataset.intersectionId
      });
    }
    
    if (entry.intersectionRatio >= 1.0 && elementData.intersectionRatio < 1.0) {
      this.eventBus.emit('intersection:fully-visible', {
        elementId: entry.target.dataset.intersectionId
      });
    }
  }

  /**
   * Dejar de observar elemento
   */
  unobserve(observerName, element) {
    const observerData = this.observers.get(observerName);
    if (!observerData) return;
    
    const elementId = element.dataset.intersectionId;
    if (elementId) {
      // Limpiar timer si existe
      this.stopVisibilityTimer(elementId, this.observedElements.get(elementId));
      
      // Dejar de observar
      observerData.observer.unobserve(element);
      observerData.elements.delete(elementId);
      this.observedElements.delete(elementId);
    }
  }

  /**
   * Obtener elementos actualmente visibles
   */
  getVisibleElements(observerName = null) {
    const elements = Array.from(this.observedElements.entries())
      .filter(([_, data]) => data.isIntersecting)
      .filter(([_, data]) => !observerName || data.observerName === observerName)
      .map(([id, data]) => ({
        elementId: id,
        element: data.element,
        intersectionRatio: data.intersectionRatio,
        metadata: data.metadata,
        visibilityTime: data.totalVisibilityTime
      }));
    
    return elements;
  }

  /**
   * Obtener estadísticas
   */
  getStats(observerName = null) {
    const elements = observerName
      ? Array.from(this.observedElements.values()).filter(d => d.observerName === observerName)
      : Array.from(this.observedElements.values());
    
    return {
      totalObserved: elements.length,
      currentlyVisible: elements.filter(d => d.isIntersecting).length,
      totalVisibilityTime: elements.reduce((sum, d) => sum + d.totalVisibilityTime, 0),
      avgVisibilityTime: elements.length > 0
        ? Math.round(elements.reduce((sum, d) => sum + d.totalVisibilityTime, 0) / elements.length)
        : 0
    };
  }

  /**
   * Destruir observer específico
   */
  destroyObserver(observerName) {
    const observerData = this.observers.get(observerName);
    if (!observerData) return;
    
    // Limpiar todos los elementos
    observerData.elements.forEach(elementId => {
      const elementData = this.observedElements.get(elementId);
      if (elementData) {
        this.stopVisibilityTimer(elementId, elementData);
        this.observedElements.delete(elementId);
      }
    });
    
    // Desconectar observer
    observerData.observer.disconnect();
    this.observers.delete(observerName);
    
    console.log(`👁️ IntersectionObserver destruido: ${observerName}`);
  }

  /**
   * Destruir todos los observers
   */
  destroy() {
    // Limpiar todos los timers
    this.visibilityTimers.forEach(timer => clearInterval(timer));
    this.visibilityTimers.clear();
    
    // Destruir todos los observers
    this.observers.forEach((_, name) => this.destroyObserver(name));
    
    // Limpiar referencias
    this.observedElements.clear();
    
    console.log('👁️ IntersectionManager destruido');
  }
}
