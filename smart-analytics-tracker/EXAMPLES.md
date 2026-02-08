# 📝 Ejemplos de Uso

Ejemplos prácticos y casos de uso reales del Smart Analytics Tracker.

---

## 📋 Tabla de Contenidos

1. [Inicio Rápido](#inicio-rápido)
2. [E-commerce](#e-commerce)
3. [Blog/Contenido](#blogcontenido)
4. [Landing Pages](#landing-pages)
5. [SPA (Single Page App)](#spa-single-page-app)
6. [Integración con Backend](#integración-con-backend)
7. [Casos Avanzados](#casos-avanzados)

---

## Inicio Rápido

### Ejemplo Mínimo

```javascript
import { TrackerEngine, ClickCollector } from './src/index.js';

const tracker = new TrackerEngine();
tracker.use(new ClickCollector());
tracker.start();

// Exportar métricas después de 30 segundos
setTimeout(() => {
  tracker.export('analytics.json');
}, 30000);
```

### Configuración Completa

```javascript
import { 
  TrackerEngine,
  ClickCollector,
  VisibilityCollector,
  ScrollCollector,
  MutationManager
} from './src/index.js';

const tracker = new TrackerEngine({
  debugMode: false,
  autoExport: true,
  exportInterval: 60000 // 1 minuto
});

// Click tracking con heatmap
tracker.use(new ClickCollector({
  rageClickThreshold: 3,
  rageClickWindow: 2000,
  heatmapGridSize: 50
}));

// Visibility tracking
tracker.use(new VisibilityCollector({
  threshold: 0.5,
  trackSelectors: [
    'article',
    '.product',
    '[data-track]'
  ]
}));

// Scroll analytics
tracker.use(new ScrollCollector({
  milestones: [25, 50, 75, 100],
  scrollVelocityThreshold: 500
}));

// Mutation tracking para SPAs
tracker.use(new MutationManager({
  trackChildList: true,
  trackAttributes: true
}));

tracker.start();
```

---

## E-commerce

### Tracking de Productos

```javascript
import { TrackerEngine, VisibilityCollector, ClickCollector } from './src/index.js';

const tracker = new TrackerEngine();

// Track productos vistos
const visibilityCollector = new VisibilityCollector({
  trackSelectors: [
    '.product-card',
    '[data-product-id]'
  ],
  minVisibilityTime: 2000 // Mínimo 2 segundos
});

tracker.use(visibilityCollector);

// Track clicks en "Agregar al Carrito"
tracker.eventBus.on('click:registered', (data) => {
  if (data.selector.includes('add-to-cart')) {
    console.log('Usuario agregó producto al carrito');
    
    // Enviar a analytics
    gtag('event', 'add_to_cart', {
      product_id: data.path[0].attributes['data-product-id']
    });
  }
});

// Detectar productos que causan frustración
tracker.eventBus.on('rage:detected', (data) => {
  if (data.selector.includes('add-to-cart')) {
    console.error('⚠️ Problema con botón de compra!', {
      producto: data.selector,
      clicks: data.clickCount
    });
    
    // Alertar al equipo
    sendSlackAlert(`Rage click en: ${data.selector}`);
  }
});

tracker.start();

// Análisis al final
window.addEventListener('beforeunload', () => {
  const topViewed = visibilityCollector.getTopViewed(10);
  console.log('Productos más vistos:', topViewed);
  
  // Enviar a backend
  fetch('/api/analytics/products', {
    method: 'POST',
    body: JSON.stringify({ topViewed })
  });
});
```

### A/B Testing de CTAs

```javascript
import { ClickCollector } from './src/collectors/ClickCollector.js';

const tracker = new TrackerEngine();
const clickCollector = new ClickCollector();

tracker.use(clickCollector);
tracker.start();

// Después de 1 minuto, analizar qué CTA funciona mejor
setTimeout(() => {
  const clicks = clickCollector.getElementClicks();
  
  const ctaA = clicks.find(c => c.selector === '.cta-variant-a');
  const ctaB = clicks.find(c => c.selector === '.cta-variant-b');
  
  console.log('CTA A:', ctaA?.count || 0, 'clicks');
  console.log('CTA B:', ctaB?.count || 0, 'clicks');
  
  const winner = (ctaA?.count || 0) > (ctaB?.count || 0) ? 'A' : 'B';
  console.log(`🏆 Ganador: Variante ${winner}`);
}, 60000);
```

---

## Blog/Contenido

### Medir Engagement Real

```javascript
import { ScrollCollector, VisibilityCollector } from './src/index.js';

const tracker = new TrackerEngine();

const scrollCollector = new ScrollCollector({
  milestones: [25, 50, 75, 100]
});

const visibilityCollector = new VisibilityCollector({
  trackSelectors: ['article', 'section']
});

tracker.use(scrollCollector).use(visibilityCollector);
tracker.start();

// Analizar engagement
tracker.eventBus.on('milestone:reached', (data) => {
  if (data.milestone === 100) {
    console.log('✅ Usuario completó el artículo');
    
    // Enviar evento
    gtag('event', 'article_completed', {
      article_id: document.querySelector('article').dataset.id,
      time_to_complete: data.timeToReach
    });
  }
});

// Detectar abandono temprano
setTimeout(() => {
  const stats = scrollCollector.getScrollStats();
  
  if (stats.maxDepth < 25) {
    console.log('❌ Usuario abandonó rápido');
    console.log('Patrón:', stats.dominantPattern);
  } else if (stats.maxDepth > 75) {
    console.log('✅ Buen engagement');
  }
}, 30000); // Después de 30 segundos
```

### Detectar Secciones Más Leídas

```javascript
const visibilityCollector = new VisibilityCollector({
  trackSelectors: ['article section']
});

tracker.use(visibilityCollector);
tracker.start();

// Al final
window.addEventListener('beforeunload', () => {
  const sections = visibilityCollector.getTopViewed();
  
  sections.forEach((section, i) => {
    console.log(`Sección ${i + 1}:`, {
      titulo: section.element.text,
      tiempoVisto: Math.round(section.totalTime / 1000) + 's'
    });
  });
  
  // Enviar a analytics
  fetch('/api/analytics/sections', {
    method: 'POST',
    body: JSON.stringify({ sections })
  });
});
```

---

## Landing Pages

### Optimización de Conversión

```javascript
import { ClickCollector, ScrollCollector } from './src/index.js';

const tracker = new TrackerEngine();
const clickCollector = new ClickCollector();
const scrollCollector = new ScrollCollector();

tracker.use(clickCollector).use(scrollCollector);
tracker.start();

// Heatmap de clicks
tracker.eventBus.on('click:processed', () => {
  const heatmap = clickCollector.getHeatmap();
  const topZones = clickCollector.getTopClickZones(5);
  
  console.log('Top 5 zonas clickeadas:', topZones);
});

// Detectar si usuarios llegan al CTA
tracker.eventBus.on('milestone:reached', (data) => {
  if (data.milestone === 75) {
    console.log('Usuario llegó cerca del CTA');
    
    // Opcional: mostrar popup si no ha clickeado
    setTimeout(() => {
      const ctaClicks = clickCollector.getElementClicks()
        .find(c => c.selector.includes('.cta'));
      
      if (!ctaClicks) {
        console.log('Mostrar popup de conversión');
        // showConversionPopup();
      }
    }, 5000);
  }
});
```

### Tracking de Formularios

```javascript
// Custom collector para formularios
class FormCollector {
  constructor() {
    this.eventBus = null;
    this.metrics = { forms: [] };
  }
  
  setEventBus(eventBus) {
    this.eventBus = eventBus;
  }
  
  setMetrics(metrics) {
    metrics.forms = [];
    this.metrics = metrics;
  }
  
  start() {
    document.querySelectorAll('form').forEach(form => {
      const formData = {
        id: form.id,
        startTime: null,
        submitTime: null,
        abandonTime: null,
        fields: []
      };
      
      // Track cuando empieza a llenar
      form.addEventListener('focusin', (e) => {
        if (!formData.startTime) {
          formData.startTime = Date.now();
        }
      }, { once: true });
      
      // Track campos tocados
      form.querySelectorAll('input, select, textarea').forEach(field => {
        field.addEventListener('change', () => {
          formData.fields.push({
            name: field.name,
            timestamp: Date.now()
          });
        });
      });
      
      // Track submit
      form.addEventListener('submit', () => {
        formData.submitTime = Date.now();
        formData.timeToComplete = formData.submitTime - formData.startTime;
        
        this.metrics.forms.push(formData);
        
        console.log('Formulario completado en:', formData.timeToComplete + 'ms');
      });
    });
  }
  
  stop() {}
}

const tracker = new TrackerEngine();
tracker.use(new FormCollector());
tracker.start();
```

---

## SPA (Single Page App)

### React Integration

```javascript
// hooks/useAnalytics.js
import { useEffect } from 'react';
import { TrackerEngine, ClickCollector, VisibilityCollector } from 'smart-analytics-tracker';

let tracker = null;

export function useAnalytics() {
  useEffect(() => {
    if (!tracker) {
      tracker = new TrackerEngine();
      tracker.use(new ClickCollector());
      tracker.use(new VisibilityCollector({
        trackSelectors: [
          '[data-track]',
          '.component'
        ]
      }));
      tracker.start();
    }
    
    return () => {
      // Cleanup al desmontar la app
      tracker?.stop();
    };
  }, []);
  
  return tracker;
}

// App.js
function App() {
  const tracker = useAnalytics();
  
  return (
    <div className="App">
      {/* Tu contenido */}
    </div>
  );
}
```

### Vue Integration

```javascript
// plugins/analytics.js
import { TrackerEngine, ClickCollector, VisibilityCollector } from 'smart-analytics-tracker';

export default {
  install(app) {
    const tracker = new TrackerEngine();
    tracker.use(new ClickCollector());
    tracker.use(new VisibilityCollector());
    tracker.start();
    
    // Exponer globalmente
    app.config.globalProperties.$tracker = tracker;
    
    // También como provide/inject
    app.provide('tracker', tracker);
  }
};

// main.js
import analytics from './plugins/analytics';

createApp(App)
  .use(analytics)
  .mount('#app');

// En componente
export default {
  inject: ['tracker'],
  
  methods: {
    exportMetrics() {
      this.tracker.export();
    }
  }
};
```

---

## Integración con Backend

### Envío Automático

```javascript
import { TrackerEngine } from './src/index.js';

const tracker = new TrackerEngine({
  autoExport: true,
  exportInterval: 60000 // 1 minuto
});

// Enviar al backend cada vez que haya métricas
tracker.eventBus.on('metrics:ready', async (metrics) => {
  try {
    await fetch('https://api.example.com/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN'
      },
      body: JSON.stringify({
        sessionId: getSessionId(),
        userId: getUserId(),
        metrics
      })
    });
    
    console.log('✅ Métricas enviadas');
  } catch (error) {
    console.error('❌ Error enviando métricas:', error);
    
    // Guardar en localStorage como fallback
    localStorage.setItem('pending-metrics', JSON.stringify(metrics));
  }
});

tracker.start();
```

### Batch Sending

```javascript
import { BatchSender } from './src/utils/export.js';

const batchSender = new BatchSender({
  endpoint: 'https://api.example.com/analytics/batch',
  batchSize: 100,
  flushInterval: 30000 // 30 segundos
});

// Agregar eventos al batch
tracker.eventBus.on('click:registered', (data) => {
  batchSender.add({
    type: 'click',
    data
  });
});

tracker.eventBus.on('visibility:stopped', (data) => {
  batchSender.add({
    type: 'visibility',
    data
  });
});

// Flush final al salir
window.addEventListener('beforeunload', () => {
  batchSender.flush();
});
```

---

## Casos Avanzados

### Correlación Click → Conversión

```javascript
const tracker = new TrackerEngine();
const clickCollector = new ClickCollector();

tracker.use(clickCollector);
tracker.start();

// Track journey del usuario
const userJourney = [];

tracker.eventBus.on('click:registered', (data) => {
  userJourney.push({
    type: 'click',
    selector: data.selector,
    timestamp: data.timestamp
  });
});

tracker.eventBus.on('milestone:reached', (data) => {
  userJourney.push({
    type: 'scroll',
    milestone: data.milestone,
    timestamp: data.timestamp
  });
});

// Al convertir
document.querySelector('#checkout-btn').addEventListener('click', () => {
  console.log('Usuario convirtió!');
  console.log('Journey completo:', userJourney);
  
  // Analizar qué acciones llevaron a conversión
  const clicksBeforeConversion = userJourney
    .filter(e => e.type === 'click')
    .slice(-5); // Últimos 5 clicks
  
  console.log('Clicks previos a conversión:', clicksBeforeConversion);
});
```

### Detección de Usuarios Perdidos

```javascript
const scrollCollector = new ScrollCollector();
tracker.use(scrollCollector);

let userIsLost = false;

// Detectar inactividad
let lastActivity = Date.now();

['click', 'scroll', 'mousemove', 'keypress'].forEach(event => {
  document.addEventListener(event, () => {
    lastActivity = Date.now();
    userIsLost = false;
  });
});

// Check cada 10 segundos
setInterval(() => {
  const timeSinceActivity = Date.now() - lastActivity;
  
  if (timeSinceActivity > 30000 && !userIsLost) { // 30 segundos
    userIsLost = true;
    
    const stats = scrollCollector.getScrollStats();
    
    console.log('⚠️ Usuario perdido detectado');
    console.log('Profundidad antes de perderse:', stats.maxDepth + '%');
    
    // Mostrar exit intent popup
    // showExitIntentPopup();
  }
}, 10000);
```

### Comparación de Sesiones

```javascript
import { loadFromLocalStorage, saveToLocalStorage } from './src/utils/export.js';

const tracker = new TrackerEngine();
tracker.start();

// Guardar cada sesión
window.addEventListener('beforeunload', () => {
  const currentMetrics = tracker.getMetrics();
  
  // Cargar sesiones anteriores
  const previousSessions = loadFromLocalStorage('all-sessions') || [];
  
  // Agregar sesión actual
  previousSessions.push({
    date: new Date().toISOString(),
    metrics: currentMetrics
  });
  
  // Guardar
  saveToLocalStorage('all-sessions', previousSessions);
});

// Análisis de múltiples sesiones
const sessions = loadFromLocalStorage('all-sessions') || [];

if (sessions.length > 1) {
  const avgClicks = sessions.reduce((sum, s) => 
    sum + s.metrics.summary.totalClicks, 0
  ) / sessions.length;
  
  console.log('Promedio de clicks por sesión:', Math.round(avgClicks));
  
  const currentSession = sessions[sessions.length - 1];
  const improvement = (
    (currentSession.metrics.summary.totalClicks - avgClicks) / avgClicks
  ) * 100;
  
  console.log('Mejora vs promedio:', improvement.toFixed(2) + '%');
}
```

---

## Tips y Trucos

### Debug Mode

```javascript
const tracker = new TrackerEngine({
  debugMode: true  // Muestra logs detallados
});
```

### Custom Events Personalizados

```javascript
// Emitir eventos custom
tracker.eventBus.emit('user:achieved-goal', {
  goal: 'newsletter_signup',
  value: 100
});

// Escuchar
tracker.eventBus.on('user:achieved-goal', (data) => {
  console.log('Goal alcanzado:', data.goal);
});
```

### Performance Monitoring

```javascript
import { measurePerformance } from './src/utils/performance.js';

await measurePerformance('tracker-init', async () => {
  tracker.start();
});

await measurePerformance('export-metrics', async () => {
  tracker.export();
});
```

---

**¿Más ejemplos?** Abre un issue o contribuye con tus propios casos de uso! 💜
