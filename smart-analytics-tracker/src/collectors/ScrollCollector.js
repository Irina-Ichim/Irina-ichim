/**
 * ScrollCollector - Tracking inteligente de scroll
 * Detecta scroll depth, velocidad y patrones de lectura
 */
export class ScrollCollector {
  constructor(config = {}) {
    this.config = {
      milestones: [25, 50, 75, 90, 100],  // Porcentajes clave
      scrollVelocityThreshold: 500,        // px/s para considerar "rápido"
      slowScrollThreshold: 100,            // px/s para considerar "lectura"
      sampleRate: 100,                     // Samplear cada 100ms
      trackDirection: true,                // Trackear dirección (up/down)
      ...config
    };
    
    this.eventBus = null;
    this.metrics = null;
    this.reachedMilestones = new Set();
    this.lastScrollY = 0;
    this.lastScrollTime = Date.now();
    this.maxScrollDepth = 0;
    this.scrollSessions = [];
    this.currentSession = null;
    this.directionChanges = 0;
    this.lastDirection = null;
  }

  setEventBus(eventBus) {
    this.eventBus = eventBus;
  }

  setMetrics(metrics) {
    this.metrics = metrics;
  }

  start() {
    console.log('📜 ScrollCollector iniciado');
    
    // Suscribirse a eventos de scroll
    this.eventBus.on('scroll:detected', (scrollData) => {
      this.processScroll(scrollData);
    });
    
    // Iniciar primera sesión
    this.startSession();
  }

  /**
   * Iniciar nueva sesión de scroll
   */
  startSession() {
    this.currentSession = {
      startTime: Date.now(),
      startY: window.scrollY,
      endTime: null,
      endY: null,
      maxDepth: 0,
      totalDistance: 0,
      events: [],
      milestones: [],
      avgVelocity: 0,
      scrollType: 'unknown' // 'reading', 'scanning', 'searching'
    };
    
    this.scrollSessions.push(this.currentSession);
  }

  /**
   * Procesar evento de scroll
   */
  processScroll(scrollData) {
    const { scrollY, scrollPercent, timestamp } = scrollData;
    
    if (!this.currentSession) {
      this.startSession();
    }
    
    // 1. Actualizar profundidad máxima
    if (scrollPercent > this.maxScrollDepth) {
      this.maxScrollDepth = scrollPercent;
      this.currentSession.maxDepth = scrollPercent;
    }
    
    // 2. Calcular velocidad
    const velocity = this.calculateVelocity(scrollY, timestamp);
    
    // 3. Detectar dirección
    const direction = this.detectDirection(scrollY);
    
    // 4. Clasificar tipo de scroll
    const scrollType = this.classifyScrollType(velocity);
    
    // 5. Actualizar sesión
    this.currentSession.events.push({
      scrollY,
      scrollPercent,
      velocity,
      direction,
      type: scrollType,
      timestamp
    });
    
    this.currentSession.totalDistance += Math.abs(scrollY - this.lastScrollY);
    
    // 6. Detectar milestones
    this.checkMilestones(scrollPercent, timestamp);
    
    // 7. Guardar en métricas
    this.metrics.scroll.push({
      scrollY,
      scrollPercent,
      velocity,
      direction,
      type: scrollType,
      timestamp
    });
    
    // 8. Emitir eventos específicos
    this.emitScrollEvents(scrollData, velocity, direction, scrollType);
    
    // Actualizar para próximo cálculo
    this.lastScrollY = scrollY;
    this.lastScrollTime = timestamp;
  }

  /**
   * Calcular velocidad de scroll (px/s)
   */
  calculateVelocity(currentScrollY, currentTime) {
    const distance = Math.abs(currentScrollY - this.lastScrollY);
    const timeDiff = (currentTime - this.lastScrollTime) / 1000; // a segundos
    
    if (timeDiff === 0) return 0;
    
    return Math.round(distance / timeDiff);
  }

  /**
   * Detectar dirección de scroll
   */
  detectDirection(currentScrollY) {
    const direction = currentScrollY > this.lastScrollY ? 'down' : 
                     currentScrollY < this.lastScrollY ? 'up' : 
                     'none';
    
    // Detectar cambios de dirección
    if (this.lastDirection && direction !== this.lastDirection && direction !== 'none') {
      this.directionChanges++;
      
      this.eventBus.emit('scroll:direction-changed', {
        from: this.lastDirection,
        to: direction,
        totalChanges: this.directionChanges,
        timestamp: Date.now()
      });
    }
    
    if (direction !== 'none') {
      this.lastDirection = direction;
    }
    
    return direction;
  }

  /**
   * Clasificar tipo de scroll según velocidad
   */
  classifyScrollType(velocity) {
    if (velocity < this.config.slowScrollThreshold) {
      return 'reading';      // Lectura atenta
    } else if (velocity < this.config.scrollVelocityThreshold) {
      return 'scanning';     // Escaneo moderado
    } else {
      return 'searching';    // Búsqueda rápida
    }
  }

  /**
   * Detectar milestones alcanzados
   */
  checkMilestones(currentPercent, timestamp) {
    this.config.milestones.forEach(milestone => {
      if (currentPercent >= milestone && !this.reachedMilestones.has(milestone)) {
        this.reachedMilestones.add(milestone);
        
        const milestoneData = {
          milestone,
          timestamp,
          timeToReach: timestamp - this.scrollSessions[0].startTime,
          scrollY: this.lastScrollY
        };
        
        this.currentSession.milestones.push(milestoneData);
        
        this.eventBus.emit('milestone:reached', milestoneData);
        
        console.log(`📜 Milestone alcanzado: ${milestone}%`);
      }
    });
  }

  /**
   * Emitir eventos específicos de scroll
   */
  emitScrollEvents(scrollData, velocity, direction, scrollType) {
    // Scroll rápido
    if (velocity > this.config.scrollVelocityThreshold) {
      this.eventBus.emit('scroll:fast', {
        ...scrollData,
        velocity,
        direction
      });
    }
    
    // Scroll lento (lectura)
    if (velocity < this.config.slowScrollThreshold && velocity > 0) {
      this.eventBus.emit('scroll:reading', {
        ...scrollData,
        velocity
      });
    }
    
    // Scroll hacia arriba (re-lectura)
    if (direction === 'up') {
      this.eventBus.emit('scroll:up', {
        ...scrollData,
        velocity
      });
    }
  }

  /**
   * Obtener estadísticas de scroll
   */
  getScrollStats() {
    const sessions = this.scrollSessions;
    const totalEvents = this.metrics.scroll.length;
    
    // Calcular velocidad promedio
    const velocities = this.metrics.scroll.map(s => s.velocity).filter(v => v > 0);
    const avgVelocity = velocities.length > 0 
      ? Math.round(velocities.reduce((sum, v) => sum + v, 0) / velocities.length)
      : 0;
    
    // Contar tipos de scroll
    const types = this.metrics.scroll.reduce((acc, s) => {
      acc[s.type] = (acc[s.type] || 0) + 1;
      return acc;
    }, {});
    
    // Determinar patrón dominante
    const dominantPattern = Object.entries(types)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'unknown';
    
    return {
      maxDepth: this.maxScrollDepth,
      milestonesReached: Array.from(this.reachedMilestones).sort((a, b) => a - b),
      totalScrolls: totalEvents,
      avgVelocity,
      directionChanges: this.directionChanges,
      scrollTypes: types,
      dominantPattern,
      sessions: sessions.length,
      completionRate: this.reachedMilestones.has(100) ? 100 : this.maxScrollDepth
    };
  }

  /**
   * Obtener patrón de comportamiento del usuario
   */
  getBehaviorPattern() {
    const stats = this.getScrollStats();
    
    let pattern = {
      type: 'unknown',
      description: '',
      engagement: 'low'
    };
    
    // Lector comprometido
    if (stats.dominantPattern === 'reading' && stats.maxDepth > 75) {
      pattern = {
        type: 'engaged_reader',
        description: 'Usuario lee el contenido detenidamente',
        engagement: 'high'
      };
    }
    // Escaneador
    else if (stats.dominantPattern === 'scanning' && stats.maxDepth > 50) {
      pattern = {
        type: 'scanner',
        description: 'Usuario escanea el contenido buscando información',
        engagement: 'medium'
      };
    }
    // Buscador
    else if (stats.dominantPattern === 'searching') {
      pattern = {
        type: 'searcher',
        description: 'Usuario busca rápidamente contenido específico',
        engagement: 'medium'
      };
    }
    // Bouncer
    else if (stats.maxDepth < 25 && stats.directionChanges > 3) {
      pattern = {
        type: 'bouncer',
        description: 'Usuario abandona rápidamente',
        engagement: 'low'
      };
    }
    // Re-lector
    else if (stats.directionChanges > 5 && stats.maxDepth > 50) {
      pattern = {
        type: 're_reader',
        description: 'Usuario revisa contenido múltiples veces',
        engagement: 'high'
      };
    }
    
    return pattern;
  }

  /**
   * Obtener timeline de scroll
   */
  getScrollTimeline() {
    return this.scrollSessions.map((session, index) => ({
      session: index + 1,
      startTime: session.startTime,
      duration: session.endTime 
        ? session.endTime - session.startTime 
        : Date.now() - session.startTime,
      maxDepth: session.maxDepth,
      totalDistance: session.totalDistance,
      events: session.events.length,
      milestones: session.milestones
    }));
  }

  /**
   * Finalizar sesión actual
   */
  endSession() {
    if (this.currentSession && !this.currentSession.endTime) {
      this.currentSession.endTime = Date.now();
      this.currentSession.endY = this.lastScrollY;
      
      // Calcular velocidad promedio de la sesión
      const velocities = this.currentSession.events
        .map(e => e.velocity)
        .filter(v => v > 0);
      
      this.currentSession.avgVelocity = velocities.length > 0
        ? Math.round(velocities.reduce((sum, v) => sum + v, 0) / velocities.length)
        : 0;
      
      // Determinar tipo predominante en la sesión
      const types = this.currentSession.events.reduce((acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1;
        return acc;
      }, {});
      
      this.currentSession.scrollType = Object.entries(types)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'unknown';
    }
  }

  stop() {
    this.endSession();
    
    console.log('📜 ScrollCollector detenido', {
      totalScrolls: this.metrics.scroll.length,
      maxDepth: `${this.maxScrollDepth}%`,
      pattern: this.getBehaviorPattern().type
    });
  }
}
