/**
 * Performance Utilities
 * Helpers para optimizar operaciones del DOM
 */

/**
 * Crear elementos usando DocumentFragment para evitar reflows
 * @param {Array} elements - Array de configuraciones de elementos
 * @returns {DocumentFragment}
 */
export function createFragment(elements) {
  const fragment = document.createDocumentFragment();
  
  elements.forEach(config => {
    const element = createElement(config);
    fragment.appendChild(element);
  });
  
  return fragment;
}

/**
 * Crear un elemento DOM con configuración
 * @param {Object} config - Configuración del elemento
 */
export function createElement(config) {
  const {
    tag = 'div',
    className = '',
    id = '',
    attributes = {},
    text = '',
    html = '',
    children = [],
    events = {}
  } = config;
  
  const element = document.createElement(tag);
  
  if (className) element.className = className;
  if (id) element.id = id;
  
  // Atributos
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  
  // Contenido
  if (text) element.textContent = text;
  if (html) element.innerHTML = html;
  
  // Eventos
  Object.entries(events).forEach(([event, handler]) => {
    element.addEventListener(event, handler);
  });
  
  // Hijos
  if (children.length > 0) {
    const childFragment = createFragment(children);
    element.appendChild(childFragment);
  }
  
  return element;
}

/**
 * Actualizar múltiples elementos del DOM de forma optimizada
 * @param {Function} callback - Función que realiza las actualizaciones
 */
export function batchDOMUpdates(callback) {
  requestAnimationFrame(() => {
    callback();
  });
}

/**
 * Throttle usando requestAnimationFrame
 * @param {Function} callback - Función a ejecutar
 * @returns {Function}
 */
export function rafThrottle(callback) {
  let rafId = null;
  let lastArgs = null;
  
  const throttled = function(...args) {
    lastArgs = args;
    
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        callback.apply(this, lastArgs);
        rafId = null;
      });
    }
  };
  
  throttled.cancel = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };
  
  return throttled;
}

/**
 * Debounce función
 * @param {Function} func - Función a debounce
 * @param {number} wait - Tiempo de espera en ms
 * @returns {Function}
 */
export function debounce(func, wait) {
  let timeout;
  
  const debounced = function(...args) {
    const later = () => {
      timeout = null;
      func.apply(this, args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
  
  debounced.cancel = () => {
    clearTimeout(timeout);
  };
  
  return debounced;
}

/**
 * Medir performance de una operación
 * @param {string} name - Nombre de la medición
 * @param {Function} operation - Operación a medir
 */
export async function measurePerformance(name, operation) {
  const startMark = `${name}-start`;
  const endMark = `${name}-end`;
  
  performance.mark(startMark);
  
  try {
    const result = await operation();
    
    performance.mark(endMark);
    performance.measure(name, startMark, endMark);
    
    const measure = performance.getEntriesByName(name)[0];
    console.log(`⚡ ${name}: ${measure.duration.toFixed(2)}ms`);
    
    // Limpiar marks
    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
    performance.clearMeasures(name);
    
    return result;
  } catch (error) {
    console.error(`Error en ${name}:`, error);
    throw error;
  }
}

/**
 * Lazy load de imágenes usando IntersectionObserver
 * @param {string} selector - Selector de imágenes
 */
export function lazyLoadImages(selector = 'img[data-src]') {
  const images = document.querySelectorAll(selector);
  
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        observer.unobserve(img);
      }
    });
  });
  
  images.forEach(img => imageObserver.observe(img));
  
  return imageObserver;
}

/**
 * Renderizar lista grande de forma optimizada
 * @param {Array} items - Items a renderizar
 * @param {Function} renderItem - Función que renderiza un item
 * @param {HTMLElement} container - Contenedor
 * @param {number} batchSize - Tamaño del lote
 */
export function renderLargeList(items, renderItem, container, batchSize = 50) {
  let currentIndex = 0;
  
  function renderBatch() {
    const fragment = document.createDocumentFragment();
    const endIndex = Math.min(currentIndex + batchSize, items.length);
    
    for (let i = currentIndex; i < endIndex; i++) {
      const itemElement = renderItem(items[i], i);
      fragment.appendChild(itemElement);
    }
    
    container.appendChild(fragment);
    currentIndex = endIndex;
    
    if (currentIndex < items.length) {
      requestAnimationFrame(renderBatch);
    }
  }
  
  renderBatch();
}

/**
 * Virtual Scroll - Renderizar solo elementos visibles
 * @param {Object} config - Configuración del virtual scroll
 */
export class VirtualScroll {
  constructor(config) {
    this.container = config.container;
    this.items = config.items;
    this.itemHeight = config.itemHeight;
    this.renderItem = config.renderItem;
    this.buffer = config.buffer || 5;
    
    this.scrollTop = 0;
    this.visibleStart = 0;
    this.visibleEnd = 0;
    
    this.init();
  }
  
  init() {
    // Crear contenedor con altura total
    const totalHeight = this.items.length * this.itemHeight;
    this.container.style.height = `${totalHeight}px`;
    this.container.style.position = 'relative';
    
    // Setup scroll listener
    const handleScroll = rafThrottle(() => {
      this.scrollTop = this.container.scrollTop || window.scrollY;
      this.render();
    });
    
    this.container.addEventListener('scroll', handleScroll);
    window.addEventListener('scroll', handleScroll);
    
    // Render inicial
    this.render();
  }
  
  render() {
    const containerHeight = this.container.clientHeight || window.innerHeight;
    
    this.visibleStart = Math.floor(this.scrollTop / this.itemHeight) - this.buffer;
    this.visibleEnd = Math.ceil((this.scrollTop + containerHeight) / this.itemHeight) + this.buffer;
    
    this.visibleStart = Math.max(0, this.visibleStart);
    this.visibleEnd = Math.min(this.items.length, this.visibleEnd);
    
    const fragment = document.createDocumentFragment();
    
    for (let i = this.visibleStart; i < this.visibleEnd; i++) {
      const item = this.renderItem(this.items[i], i);
      item.style.position = 'absolute';
      item.style.top = `${i * this.itemHeight}px`;
      fragment.appendChild(item);
    }
    
    this.container.innerHTML = '';
    this.container.appendChild(fragment);
  }
  
  update(newItems) {
    this.items = newItems;
    const totalHeight = this.items.length * this.itemHeight;
    this.container.style.height = `${totalHeight}px`;
    this.render();
  }
}

/**
 * Idle Callback helper - Ejecutar en tiempo de inactividad
 * @param {Function} callback - Función a ejecutar
 * @param {Object} options - Opciones
 */
export function runWhenIdle(callback, options = {}) {
  if ('requestIdleCallback' in window) {
    return requestIdleCallback(callback, options);
  } else {
    // Fallback
    return setTimeout(callback, 1);
  }
}

/**
 * Cancelar idle callback
 * @param {number} id - ID del callback
 */
export function cancelIdle(id) {
  if ('cancelIdleCallback' in window) {
    cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
}

/**
 * Observar cambios de tamaño de elemento
 * @param {HTMLElement} element - Elemento a observar
 * @param {Function} callback - Callback cuando cambia el tamaño
 */
export function observeResize(element, callback) {
  if ('ResizeObserver' in window) {
    const resizeObserver = new ResizeObserver(entries => {
      entries.forEach(entry => {
        callback(entry.contentRect);
      });
    });
    
    resizeObserver.observe(element);
    return resizeObserver;
  } else {
    console.warn('ResizeObserver no disponible');
    return null;
  }
}
