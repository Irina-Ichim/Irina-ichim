/**
 * MutationManager - Observa cambios dinámicos en el DOM
 * Útil para SPAs y contenido que se carga dinámicamente
 */
export class MutationManager {
  constructor(config = {}) {
    this.config = {
      trackAttributes: true,
      trackChildList: true,
      trackSubtree: true,
      trackCharacterData: false,
      attributeFilter: ['class', 'style', 'data-*'],
      debounceTime: 100,  // Debounce para evitar spam
      ...config
    };
    
    this.eventBus = null;
    this.metrics = null;
    this.observer = null;
    this.mutationQueue = [];
    this.debounceTimer = null;
    this.stats = {
      totalMutations: 0,
      addedNodes: 0,
      removedNodes: 0,
      attributeChanges: 0,
      textChanges: 0
    };
  }

  setEventBus(eventBus) {
    this.eventBus = eventBus;
  }

  setMetrics(metrics) {
    this.metrics = metrics;
  }

  start() {
    console.log('🔍 MutationManager iniciado');
    
    // Crear MutationObserver
    this.observer = new MutationObserver((mutations) => {
      this.handleMutations(mutations);
    });
    
    // Configurar observación
    const observerConfig = {
      childList: this.config.trackChildList,
      attributes: this.config.trackAttributes,
      characterData: this.config.trackCharacterData,
      subtree: this.config.trackSubtree,
      attributeOldValue: true,
      characterDataOldValue: true
    };
    
    if (this.config.attributeFilter && this.config.attributeFilter.length > 0) {
      observerConfig.attributeFilter = this.config.attributeFilter;
    }
    
    // Observar el documento completo
    this.observer.observe(document.body, observerConfig);
    
    console.log('🔍 Observando mutaciones del DOM', observerConfig);
  }

  /**
   * Manejar mutaciones detectadas
   */
  handleMutations(mutations) {
    mutations.forEach(mutation => {
      this.processMutation(mutation);
    });
    
    // Debounce para procesar en lotes
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      this.flushMutationQueue();
    }, this.config.debounceTime);
  }

  /**
   * Procesar una mutación individual
   */
  processMutation(mutation) {
    const mutationData = {
      type: mutation.type,
      target: this.getElementInfo(mutation.target),
      timestamp: Date.now()
    };
    
    this.stats.totalMutations++;
    
    // Procesar según tipo
    switch (mutation.type) {
      case 'childList':
        mutationData.changes = this.processChildListMutation(mutation);
        break;
      
      case 'attributes':
        mutationData.changes = this.processAttributeMutation(mutation);
        break;
      
      case 'characterData':
        mutationData.changes = this.processCharacterDataMutation(mutation);
        break;
    }
    
    // Agregar a cola
    this.mutationQueue.push(mutationData);
    
    // Emitir evento inmediato para ciertos tipos
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      this.eventBus.emit('mutation:nodes-added', mutationData);
    }
  }

  /**
   * Procesar cambios en nodos hijos
   */
  processChildListMutation(mutation) {
    const changes = {
      added: [],
      removed: []
    };
    
    // Nodos agregados
    mutation.addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        this.stats.addedNodes++;
        changes.added.push(this.getElementInfo(node));
        
        // Detectar elementos trackeables agregados dinámicamente
        this.detectTrackableElements(node);
      }
    });
    
    // Nodos removidos
    mutation.removedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        this.stats.removedNodes++;
        changes.removed.push(this.getElementInfo(node));
      }
    });
    
    return changes;
  }

  /**
   * Procesar cambios en atributos
   */
  processAttributeMutation(mutation) {
    this.stats.attributeChanges++;
    
    return {
      attribute: mutation.attributeName,
      oldValue: mutation.oldValue,
      newValue: mutation.target.getAttribute(mutation.attributeName),
      element: this.getElementInfo(mutation.target)
    };
  }

  /**
   * Procesar cambios en texto
   */
  processCharacterDataMutation(mutation) {
    this.stats.textChanges++;
    
    return {
      oldValue: mutation.oldValue,
      newValue: mutation.target.textContent,
      parent: this.getElementInfo(mutation.target.parentElement)
    };
  }

  /**
   * Detectar elementos que deberían ser trackeados
   */
  detectTrackableElements(node) {
    // Buscar elementos con atributos de tracking
    const trackableSelectors = [
      '[data-track]',
      '[data-track-visibility]',
      'article',
      'section',
      '.product-card'
    ];
    
    trackableSelectors.forEach(selector => {
      if (node.matches && node.matches(selector)) {
        this.eventBus.emit('mutation:trackable-element-added', {
          element: node,
          info: this.getElementInfo(node),
          timestamp: Date.now()
        });
      }
      
      // Buscar dentro del nodo
      if (node.querySelectorAll) {
        const children = node.querySelectorAll(selector);
        children.forEach(child => {
          this.eventBus.emit('mutation:trackable-element-added', {
            element: child,
            info: this.getElementInfo(child),
            timestamp: Date.now()
          });
        });
      }
    });
  }

  /**
   * Vaciar cola de mutaciones y guardar en métricas
   */
  flushMutationQueue() {
    if (this.mutationQueue.length === 0) return;
    
    const batch = {
      timestamp: Date.now(),
      count: this.mutationQueue.length,
      mutations: [...this.mutationQueue]
    };
    
    // Guardar en métricas
    this.metrics.mutations.push(batch);
    
    // Emitir evento de lote procesado
    this.eventBus.emit('mutations:batch-processed', batch);
    
    // Limpiar cola
    this.mutationQueue = [];
  }

  /**
   * Obtener información del elemento
   */
  getElementInfo(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      return { type: 'non-element' };
    }
    
    return {
      tag: element.tagName?.toLowerCase(),
      id: element.id || null,
      classes: element.className ? Array.from(element.classList) : [],
      attributes: this.getRelevantAttributes(element)
    };
  }

  /**
   * Obtener atributos relevantes
   */
  getRelevantAttributes(element) {
    const attrs = {};
    const relevantAttrs = [
      'data-track',
      'data-track-visibility',
      'data-product-id',
      'href',
      'src'
    ];
    
    relevantAttrs.forEach(attr => {
      if (element.hasAttribute(attr)) {
        attrs[attr] = element.getAttribute(attr);
      }
    });
    
    return attrs;
  }

  /**
   * Obtener estadísticas de mutaciones
   */
  getStats() {
    return {
      ...this.stats,
      totalBatches: this.metrics.mutations.length,
      avgMutationsPerBatch: this.metrics.mutations.length > 0
        ? Math.round(this.stats.totalMutations / this.metrics.mutations.length)
        : 0
    };
  }

  /**
   * Obtener resumen de actividad
   */
  getActivitySummary() {
    const recentMutations = this.metrics.mutations.slice(-10);
    
    return {
      recent: recentMutations.map(batch => ({
        timestamp: batch.timestamp,
        count: batch.count,
        types: batch.mutations.reduce((acc, m) => {
          acc[m.type] = (acc[m.type] || 0) + 1;
          return acc;
        }, {})
      })),
      stats: this.getStats()
    };
  }

  /**
   * Pausar observación
   */
  pause() {
    if (this.observer) {
      this.observer.disconnect();
      console.log('🔍 MutationManager pausado');
    }
  }

  /**
   * Reanudar observación
   */
  resume() {
    if (this.observer) {
      this.observer.observe(document.body, {
        childList: this.config.trackChildList,
        attributes: this.config.trackAttributes,
        characterData: this.config.trackCharacterData,
        subtree: this.config.trackSubtree
      });
      console.log('🔍 MutationManager reanudado');
    }
  }

  stop() {
    // Vaciar cola pendiente
    this.flushMutationQueue();
    
    // Desconectar observer
    if (this.observer) {
      this.observer.disconnect();
    }
    
    // Limpiar timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    console.log('🔍 MutationManager detenido', this.getStats());
  }
}
