/**
 * Smart Analytics Tracker
 * Sistema completo de analytics para tracking de interacciones del usuario
 * 
 * @author FemCoders Club
 * @version 1.0.0
 */

// Core
export { EventBus } from './core/EventBus.js';
export { TrackerEngine } from './core/TrackerEngine.js';

// Collectors
export { ClickCollector } from './collectors/ClickCollector.js';
export { VisibilityCollector } from './collectors/VisibilityCollector.js';
export { ScrollCollector } from './collectors/ScrollCollector.js';

// Observers
export { MutationManager } from './observers/MutationManager.js';
export { IntersectionManager } from './observers/IntersectionManager.js';

// Utils
export * from './utils/performance.js';
export * from './utils/export.js';

/**
 * Inicializador rápido con configuración por defecto
 * @param {Object} config - Configuración opcional
 * @returns {TrackerEngine}
 */
export function createTracker(config = {}) {
  const { TrackerEngine } = await import('./core/TrackerEngine.js');
  const { ClickCollector } = await import('./collectors/ClickCollector.js');
  const { VisibilityCollector } = await import('./collectors/VisibilityCollector.js');
  const { ScrollCollector } = await import('./collectors/ScrollCollector.js');
  const { MutationManager } = await import('./observers/MutationManager.js');
  
  const tracker = new TrackerEngine(config);
  
  // Agregar collectors por defecto
  if (config.enableClicks !== false) {
    tracker.use(new ClickCollector(config.clickConfig));
  }
  
  if (config.enableVisibility !== false) {
    tracker.use(new VisibilityCollector(config.visibilityConfig));
  }
  
  if (config.enableScroll !== false) {
    tracker.use(new ScrollCollector(config.scrollConfig));
  }
  
  if (config.enableMutations) {
    tracker.use(new MutationManager(config.mutationConfig));
  }
  
  return tracker;
}

/**
 * Versión del tracker
 */
export const VERSION = '1.0.0';

/**
 * Default export para uso simple
 */
export default {
  createTracker,
  VERSION
};
