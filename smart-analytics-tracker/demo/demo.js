/**
 * Demo Script - Inicialización y UI del Smart Analytics Tracker
 */

import { TrackerEngine } from '../src/core/TrackerEngine.js';
import { ClickCollector } from '../src/collectors/ClickCollector.js';
import { VisibilityCollector } from '../src/collectors/VisibilityCollector.js';
import { ScrollCollector } from '../src/collectors/ScrollCollector.js';
import { MutationManager } from '../src/observers/MutationManager.js';
import { createFragment, createElement, renderLargeList } from '../src/utils/performance.js';

// ===================================
// Inicialización del Tracker
// ===================================

const tracker = new TrackerEngine({
  debugMode: true,
  autoExport: false
});

// Agregar collectors
const clickCollector = new ClickCollector({
  rageClickThreshold: 3,
  rageClickWindow: 2000,
  heatmapGridSize: 50
});

const visibilityCollector = new VisibilityCollector({
  threshold: 0.5,
  minVisibilityTime: 1000,
  trackSelectors: [
    '[data-track-visibility]',
    '.product-card',
    'section'
  ]
});

const scrollCollector = new ScrollCollector({
  milestones: [25, 50, 75, 90, 100],
  scrollVelocityThreshold: 500
});

const mutationManager = new MutationManager({
  trackChildList: true,
  trackAttributes: true
});

tracker
  .use(clickCollector)
  .use(visibilityCollector)
  .use(scrollCollector)
  .use(mutationManager);

// Iniciar tracking
tracker.start();

// ===================================
// Dashboard UI
// ===================================

class DashboardUI {
  constructor(tracker) {
    this.tracker = tracker;
    this.isCollapsed = false;
    this.activeTab = 'clicks';
    
    this.setupEventListeners();
    this.startUpdates();
  }
  
  setupEventListeners() {
    // Toggle dashboard
    document.getElementById('toggle-dashboard').addEventListener('click', () => {
      this.isCollapsed = !this.isCollapsed;
      document.querySelector('.dashboard').classList.toggle('collapsed', this.isCollapsed);
    });
    
    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });
    
    // Export JSON
    document.getElementById('export-json').addEventListener('click', () => {
      tracker.export();
    });
    
    // Clear metrics
    document.getElementById('clear-metrics').addEventListener('click', () => {
      if (confirm('¿Limpiar todas las métricas?')) {
        tracker.clear();
        this.updateDashboard();
      }
    });
    
    // Event listeners del tracker
    this.tracker.eventBus.on('rage:detected', (data) => {
      this.showRageAlert(data);
      this.logCustomEvent('Rage Click', data);
    });
    
    this.tracker.eventBus.on('milestone:reached', (data) => {
      this.logCustomEvent('Scroll Milestone', data);
    });
    
    this.tracker.eventBus.on('visibility:update', (data) => {
      this.updateVisibilityTimers(data);
    });
  }
  
  switchTab(tabName) {
    this.activeTab = tabName;
    
    // Update tabs
    document.querySelectorAll('.tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tabName);
    });
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(c => {
      c.classList.toggle('active', c.dataset.content === tabName);
    });
    
    this.updateTabContent(tabName);
  }
  
  startUpdates() {
    // Actualizar dashboard cada segundo
    setInterval(() => {
      this.updateDashboard();
    }, 1000);
  }
  
  updateDashboard() {
    const metrics = this.tracker.getMetrics();
    
    // Métricas generales
    document.getElementById('total-clicks').textContent = metrics.summary.totalClicks;
    document.getElementById('rage-clicks').textContent = metrics.summary.totalRageClicks;
    
    // Scroll depth
    const scrollDepth = scrollCollector.maxScrollDepth;
    document.getElementById('scroll-depth').textContent = `${scrollDepth}%`;
    
    // Elementos visibles
    const visibleElements = visibilityCollector.getCurrentlyVisible().length;
    document.getElementById('visible-elements').textContent = visibleElements;
    
    // Actualizar tab activo
    this.updateTabContent(this.activeTab);
  }
  
  updateTabContent(tabName) {
    switch (tabName) {
      case 'clicks':
        this.updateClicksList();
        break;
      case 'scroll':
        this.updateScrollInfo();
        break;
      case 'visibility':
        this.updateVisibilityList();
        break;
      case 'heatmap':
        this.updateHeatmap();
        break;
    }
  }
  
  updateClicksList() {
    const list = document.getElementById('clicks-list');
    const clicks = this.tracker.metrics.clicks.slice(-10).reverse();
    
    if (clicks.length === 0) {
      list.innerHTML = '<p style="color: #6b7280;">No hay clicks registrados</p>';
      return;
    }
    
    list.innerHTML = clicks.map(click => `
      <div class="event-item">
        <div class="event-type">Click en ${click.selector}</div>
        <div class="event-time">${new Date(click.timestamp).toLocaleTimeString()}</div>
      </div>
    `).join('');
  }
  
  updateScrollInfo() {
    const stats = scrollCollector.getScrollStats();
    const pattern = scrollCollector.getBehaviorPattern();
    
    document.getElementById('scroll-pattern').textContent = pattern.description;
    document.getElementById('scroll-velocity').textContent = stats.avgVelocity;
    document.getElementById('scroll-milestones').textContent = 
      stats.milestonesReached.length > 0 
        ? stats.milestonesReached.map(m => `${m}%`).join(', ')
        : 'Ninguno';
  }
  
  updateVisibilityList() {
    const list = document.getElementById('visibility-list');
    const topViewed = visibilityCollector.getTopViewed(5);
    
    if (topViewed.length === 0) {
      list.innerHTML = '<p style="color: #6b7280;">No hay datos de visibilidad</p>';
      return;
    }
    
    list.innerHTML = topViewed.map(item => `
      <div class="event-item">
        <div class="event-type">${item.element.text || item.element.tag}</div>
        <div class="event-time">Visto: ${Math.round(item.totalTime / 1000)}s (${item.sessions} sesiones)</div>
      </div>
    `).join('');
  }
  
  updateHeatmap() {
    const zones = document.getElementById('heatmap-zones');
    const topZones = clickCollector.getTopClickZones(10);
    
    if (topZones.length === 0) {
      zones.innerHTML = '<p style="color: #6b7280;">No hay datos de heatmap</p>';
      return;
    }
    
    zones.innerHTML = topZones.map(zone => `
      <div class="zone-item">
        <div class="zone-coords">Zona (${zone.x}, ${zone.y})</div>
        <div class="zone-count">${zone.count} clicks</div>
      </div>
    `).join('');
  }
  
  showRageAlert(data) {
    const alert = document.getElementById('rage-alert');
    alert.style.display = 'block';
    
    setTimeout(() => {
      alert.style.display = 'none';
    }, 3000);
  }
  
  logCustomEvent(type, data) {
    const log = document.getElementById('custom-events-log');
    const event = document.createElement('div');
    event.className = 'event';
    event.textContent = `[${new Date().toLocaleTimeString()}] ${type}: ${JSON.stringify(data, null, 2)}`;
    
    log.prepend(event);
    
    // Limitar a 20 eventos
    while (log.children.length > 20) {
      log.removeChild(log.lastChild);
    }
  }
  
  updateVisibilityTimers(data) {
    const cards = document.querySelectorAll('.product-card');
    cards.forEach(card => {
      if (card.dataset.trackId === data.elementId) {
        const timer = card.querySelector('.visibility-timer span');
        if (timer) {
          timer.textContent = `${Math.round(data.totalTime / 1000)}s`;
        }
      }
    });
  }
}

// Inicializar dashboard
const dashboard = new DashboardUI(tracker);

// ===================================
// Demo: Render Performance
// ===================================

document.getElementById('render-test').addEventListener('click', () => {
  const container = document.getElementById('render-container');
  const timeDisplay = document.getElementById('render-time');
  
  const startTime = performance.now();
  
  // Limpiar container
  container.innerHTML = '';
  
  // Crear 1000 elementos usando DocumentFragment
  const items = Array.from({ length: 1000 }, (_, i) => ({
    id: i + 1,
    text: `Item ${i + 1}`
  }));
  
  renderLargeList(
    items,
    (item) => {
      return createElement({
        tag: 'div',
        className: 'item',
        text: item.text,
        attributes: {
          style: 'padding: 0.5rem; margin: 0.25rem 0; background: #f3f4f6; border-radius: 4px;'
        }
      });
    },
    container,
    50 // Batch size
  );
  
  const endTime = performance.now();
  const duration = (endTime - startTime).toFixed(2);
  
  timeDisplay.textContent = `✅ Renderizados 1000 elementos en ${duration}ms usando DocumentFragment + rAF`;
});

// ===================================
// Heatmap Visualization (Canvas)
// ===================================

class HeatmapCanvas {
  constructor(tracker) {
    this.tracker = tracker;
    this.canvas = document.getElementById('heatmap-overlay');
    this.ctx = this.canvas.getContext('2d');
    this.enabled = false;
    
    this.setupCanvas();
    this.setupToggle();
  }
  
  setupCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = document.documentElement.scrollHeight;
    
    window.addEventListener('resize', () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = document.documentElement.scrollHeight;
      if (this.enabled) this.render();
    });
  }
  
  setupToggle() {
    // Toggle con tecla 'H'
    document.addEventListener('keydown', (e) => {
      if (e.key === 'h' || e.key === 'H') {
        this.toggle();
      }
    });
  }
  
  toggle() {
    this.enabled = !this.enabled;
    this.canvas.classList.toggle('active', this.enabled);
    
    if (this.enabled) {
      this.render();
    } else {
      this.clear();
    }
  }
  
  render() {
    this.clear();
    
    const heatmapData = clickCollector.getHeatmapVisualizationData();
    
    heatmapData.forEach(cell => {
      this.ctx.fillStyle = cell.color;
      this.ctx.fillRect(cell.x, cell.y, 50, 50);
      
      // Número de clicks
      this.ctx.fillStyle = 'white';
      this.ctx.font = 'bold 14px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(cell.value, cell.x + 25, cell.y + 30);
    });
  }
  
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

const heatmap = new HeatmapCanvas(tracker);

// Log inicial
console.log('🚀 Smart Analytics Tracker Demo iniciado');
console.log('💡 Presiona "H" para ver el heatmap de clicks');
console.log('📊 Tracker:', tracker);

// Exponer al window para debugging
window.tracker = tracker;
window.clickCollector = clickCollector;
window.visibilityCollector = visibilityCollector;
window.scrollCollector = scrollCollector;
