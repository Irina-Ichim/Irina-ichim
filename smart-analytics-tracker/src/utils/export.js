/**
 * Export Utilities
 * Funciones para exportar y persistir métricas
 */

/**
 * Exportar datos a JSON
 * @param {Object} data - Datos a exportar
 * @param {string} filename - Nombre del archivo
 */
export function exportToJSON(data, filename = 'analytics.json') {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  downloadBlob(blob, filename);
}

/**
 * Exportar datos a CSV
 * @param {Array} data - Array de objetos
 * @param {string} filename - Nombre del archivo
 */
export function exportToCSV(data, filename = 'analytics.csv') {
  if (!Array.isArray(data) || data.length === 0) {
    console.warn('No hay datos para exportar');
    return;
  }
  
  // Obtener headers
  const headers = Object.keys(data[0]);
  
  // Crear CSV
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escapar valores con comas o comillas
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ];
  
  const csv = csvRows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  downloadBlob(blob, filename);
}

/**
 * Descargar blob como archivo
 * @param {Blob} blob - Blob a descargar
 * @param {string} filename - Nombre del archivo
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Guardar en localStorage
 * @param {string} key - Clave
 * @param {*} data - Datos a guardar
 */
export function saveToLocalStorage(key, data) {
  try {
    const json = JSON.stringify(data);
    localStorage.setItem(key, json);
    return true;
  } catch (error) {
    console.error('Error guardando en localStorage:', error);
    return false;
  }
}

/**
 * Cargar de localStorage
 * @param {string} key - Clave
 * @returns {*} Datos cargados o null
 */
export function loadFromLocalStorage(key) {
  try {
    const json = localStorage.getItem(key);
    return json ? JSON.parse(json) : null;
  } catch (error) {
    console.error('Error cargando de localStorage:', error);
    return null;
  }
}

/**
 * Limpiar localStorage
 * @param {string} key - Clave a limpiar
 */
export function clearLocalStorage(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Error limpiando localStorage:', error);
    return false;
  }
}

/**
 * Enviar datos a endpoint
 * @param {string} endpoint - URL del endpoint
 * @param {Object} data - Datos a enviar
 * @param {Object} options - Opciones adicionales
 */
export async function sendToEndpoint(endpoint, data, options = {}) {
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
    
    return await response.json();
  } catch (error) {
    console.error('Error enviando datos:', error);
    throw error;
  }
}

/**
 * Enviar datos con retry automático
 * @param {string} endpoint - URL del endpoint
 * @param {Object} data - Datos a enviar
 * @param {Object} options - Opciones
 */
export async function sendWithRetry(endpoint, data, options = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    backoff = 2,
    ...fetchOptions
  } = options;
  
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await sendToEndpoint(endpoint, data, fetchOptions);
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries - 1) {
        const delay = retryDelay * Math.pow(backoff, attempt);
        console.log(`Reintentando en ${delay}ms... (intento ${attempt + 2}/${maxRetries})`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

/**
 * Utilidad sleep
 * @param {number} ms - Milisegundos
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Batch sender - Envía datos en lotes
 */
export class BatchSender {
  constructor(config = {}) {
    this.endpoint = config.endpoint;
    this.batchSize = config.batchSize || 100;
    this.flushInterval = config.flushInterval || 30000; // 30 segundos
    this.queue = [];
    this.timer = null;
    this.isSending = false;
    
    this.startAutoFlush();
  }
  
  /**
   * Agregar item a la cola
   */
  add(item) {
    this.queue.push({
      ...item,
      timestamp: Date.now()
    });
    
    if (this.queue.length >= this.batchSize) {
      this.flush();
    }
  }
  
  /**
   * Enviar lote actual
   */
  async flush() {
    if (this.isSending || this.queue.length === 0) {
      return;
    }
    
    this.isSending = true;
    const batch = [...this.queue];
    this.queue = [];
    
    try {
      await sendToEndpoint(this.endpoint, {
        batch,
        count: batch.length,
        timestamp: Date.now()
      });
      
      console.log(`📤 Lote enviado: ${batch.length} items`);
    } catch (error) {
      console.error('Error enviando lote:', error);
      // Re-agregar a la cola
      this.queue.unshift(...batch);
    } finally {
      this.isSending = false;
    }
  }
  
  /**
   * Iniciar auto-flush
   */
  startAutoFlush() {
    this.timer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }
  
  /**
   * Detener auto-flush
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    // Flush final
    return this.flush();
  }
}

/**
 * Formatear métricas para diferentes formatos
 */
export class MetricsFormatter {
  /**
   * Formatear para Google Analytics
   */
  static toGoogleAnalytics(metrics) {
    return {
      events: metrics.data.clicks.map(click => ({
        name: 'click',
        params: {
          element: click.selector,
          x: click.x,
          y: click.y
        }
      }))
    };
  }
  
  /**
   * Formatear para Mixpanel
   */
  static toMixpanel(metrics) {
    return {
      events: [
        ...metrics.data.clicks.map(click => ({
          event: 'Element Clicked',
          properties: {
            selector: click.selector,
            timestamp: click.timestamp
          }
        })),
        ...metrics.data.rageClicks.map(rage => ({
          event: 'Rage Click',
          properties: {
            selector: rage.selector,
            clicks: rage.clickCount,
            timestamp: rage.timestamp
          }
        }))
      ]
    };
  }
  
  /**
   * Formatear para tabla resumen
   */
  static toSummaryTable(metrics) {
    return [
      {
        metric: 'Total Clicks',
        value: metrics.summary.totalClicks
      },
      {
        metric: 'Rage Clicks',
        value: metrics.summary.totalRageClicks
      },
      {
        metric: 'Scroll Events',
        value: metrics.summary.scrollEvents
      },
      {
        metric: 'Visibility Events',
        value: metrics.summary.visibilityEvents
      },
      {
        metric: 'Session Duration',
        value: `${Math.round(metrics.session.duration / 1000)}s`
      }
    ];
  }
  
  /**
   * Formatear clicks para heatmap
   */
  static toHeatmapData(clicks) {
    return clicks.map(click => ({
      x: click.x,
      y: click.y,
      value: 1
    }));
  }
}

/**
 * Comprimir datos para reducir tamaño
 * @param {Object} data - Datos a comprimir
 */
export function compressData(data) {
  // Remover campos innecesarios
  const compressed = {
    ...data,
    data: {
      clicks: data.data.clicks.map(c => ({
        x: c.x,
        y: c.y,
        s: c.selector,
        t: c.timestamp
      })),
      scroll: data.data.scroll.map(s => ({
        y: s.scrollY,
        p: s.scrollPercent,
        t: s.timestamp
      }))
    }
  };
  
  return compressed;
}

/**
 * Descomprimir datos
 * @param {Object} compressed - Datos comprimidos
 */
export function decompressData(compressed) {
  return {
    ...compressed,
    data: {
      clicks: compressed.data.clicks.map(c => ({
        x: c.x,
        y: c.y,
        selector: c.s,
        timestamp: c.t
      })),
      scroll: compressed.data.scroll.map(s => ({
        scrollY: s.y,
        scrollPercent: s.p,
        timestamp: s.t
      }))
    }
  };
}
