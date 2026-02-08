/**
 * EventBus - Sistema de comunicación entre módulos mediante Custom Events
 * Implementa el patrón Publisher-Subscriber
 */
export class EventBus {
  constructor() {
    this.events = {};
    this.debugMode = false;
  }

  /**
   * Suscribirse a un evento
   * @param {string} eventName - Nombre del evento
   * @param {Function} callback - Función a ejecutar cuando se emita el evento
   */
  on(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(callback);
    
    if (this.debugMode) {
      console.log(`📡 Suscripción a evento: ${eventName}`);
    }
  }

  /**
   * Emitir un evento
   * @param {string} eventName - Nombre del evento
   * @param {*} data - Datos asociados al evento
   */
  emit(eventName, data) {
    if (!this.events[eventName]) return;
    
    if (this.debugMode) {
      console.log(`📢 Emitiendo evento: ${eventName}`, data);
    }
    
    this.events[eventName].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error en callback de ${eventName}:`, error);
      }
    });
  }

  /**
   * Desuscribirse de un evento
   * @param {string} eventName - Nombre del evento
   * @param {Function} callback - Función a remover
   */
  off(eventName, callback) {
    if (!this.events[eventName]) return;
    
    this.events[eventName] = this.events[eventName].filter(
      cb => cb !== callback
    );
  }

  /**
   * Suscribirse a un evento una sola vez
   * @param {string} eventName - Nombre del evento
   * @param {Function} callback - Función a ejecutar
   */
  once(eventName, callback) {
    const onceCallback = (data) => {
      callback(data);
      this.off(eventName, onceCallback);
    };
    this.on(eventName, onceCallback);
  }

  /**
   * Limpiar todos los eventos
   */
  clear() {
    this.events = {};
  }

  /**
   * Activar/desactivar modo debug
   * @param {boolean} enabled 
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }

  /**
   * Obtener lista de eventos registrados
   */
  getRegisteredEvents() {
    return Object.keys(this.events);
  }
}
