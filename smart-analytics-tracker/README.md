# 📊 Smart Analytics Tracker

> Sistema avanzado de tracking de interacciones del usuario construido con JavaScript vanilla y APIs modernas del DOM.

Creado por **[FemCoders Club](https://femcodersclub.com)** para el post: *"Manipulación del DOM como una Ingeniera"*

---

## 🎯 ¿Qué es esto?

Smart Analytics Tracker es un sistema completo de analytics que demuestra patrones avanzados de manipulación del DOM en JavaScript moderno:

- ✅ **Event Delegation** - Un solo listener global para todos los clicks
- ✅ **IntersectionObserver** - Tracking de visibilidad real
- ✅ **MutationObserver** - Detección de cambios dinámicos en el DOM
- ✅ **Custom Events** - Sistema de comunicación desacoplado
- ✅ **Performance Optimization** - DocumentFragment y requestAnimationFrame
- ✅ **Rage Clicks Detection** - Identificación de frustración del usuario
- ✅ **Scroll Depth Analytics** - Medición inteligente de scroll
- ✅ **Heatmap** - Visualización de zonas calientes

---

## 🚀 Demo en Vivo

```bash
# Clonar el repositorio
git clone https://github.com/femcodersclub/smart-analytics-tracker.git

# Entrar al directorio
cd smart-analytics-tracker

# Instalar servidor HTTP (si no tienes uno)
npm install -g http-server

# Ejecutar demo
npm run dev
```

Abre tu navegador en `http://localhost:3000/demo`

**💡 Tip:** Presiona `H` para ver el heatmap de clicks en tiempo real.

---

## 📦 Instalación

### Como módulo ES6

```javascript
import { TrackerEngine, ClickCollector, VisibilityCollector } from './src/index.js';

const tracker = new TrackerEngine();

tracker
  .use(new ClickCollector())
  .use(new VisibilityCollector())
  .start();
```

### Uso rápido

```javascript
import { createTracker } from './src/index.js';

const tracker = createTracker({
  debugMode: true,
  enableClicks: true,
  enableVisibility: true,
  enableScroll: true
});

tracker.start();
```

---

## 🎓 Conceptos Aprendidos

### 1. Event Delegation

En lugar de agregar listeners individuales a cada elemento:

```javascript
// ❌ NO hacer esto
buttons.forEach(btn => {
  btn.addEventListener('click', handleClick);
});

// ✅ Mejor: Event Delegation
document.addEventListener('click', (e) => {
  if (e.target.matches('button')) {
    handleClick(e);
  }
}, true); // Capturing phase
```

**Ventajas:**
- Un solo listener para miles de elementos
- Funciona con elementos dinámicos
- Mejor performance

### 2. IntersectionObserver

Detecta cuando elementos son visibles:

```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      console.log('Elemento visible!', entry.target);
    }
  });
}, {
  threshold: 0.5 // 50% visible
});

observer.observe(element);
```

**Casos de uso:**
- Lazy loading de imágenes
- Infinite scroll
- Analytics de visibilidad
- Animaciones on-scroll

### 3. MutationObserver

Observa cambios en el DOM:

```javascript
const observer = new MutationObserver((mutations) => {
  mutations.forEach(mutation => {
    console.log('DOM cambió:', mutation.type);
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true
});
```

**Casos de uso:**
- Detectar contenido dinámico en SPAs
- Auto-tracking de nuevos elementos
- Detección de cambios de estilos

### 4. Custom Events (EventBus Pattern)

Comunicación desacoplada entre módulos:

```javascript
class EventBus {
  constructor() {
    this.events = {};
  }
  
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }
  
  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(cb => cb(data));
    }
  }
}

// Uso
const bus = new EventBus();
bus.on('user:clicked', (data) => console.log(data));
bus.emit('user:clicked', { x: 100, y: 200 });
```

### 5. Performance con DocumentFragment

Construir DOM sin reflows:

```javascript
// ❌ Causa múltiples reflows
for (let i = 0; i < 1000; i++) {
  const div = document.createElement('div');
  container.appendChild(div); // Reflow en cada iteración
}

// ✅ Un solo reflow
const fragment = document.createDocumentFragment();
for (let i = 0; i < 1000; i++) {
  const div = document.createElement('div');
  fragment.appendChild(div);
}
container.appendChild(fragment); // Un solo reflow
```

### 6. requestAnimationFrame

Sincronizar con el refresh rate del navegador:

```javascript
// ❌ Puede causar jank
window.addEventListener('scroll', () => {
  updateUI(); // Se ejecuta descontroladamente
});

// ✅ Limitado a 60fps
let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      updateUI();
      ticking = false;
    });
    ticking = true;
  }
});
```

---

## 🏗️ Arquitectura

```
TrackerEngine (Orquestador)
    ├── EventBus (Custom Events)
    ├── ClickCollector
    │   ├── Heatmap
    │   └── Rage Clicks Detection
    ├── VisibilityCollector (IntersectionObserver)
    ├── ScrollCollector (requestAnimationFrame)
    └── MutationManager (MutationObserver)
```

Ver [ARCHITECTURE.md](./ARCHITECTURE.md) para más detalles.

---

## 📊 Funcionalidades Principales

### Click Tracking + Heatmap

```javascript
const clickCollector = new ClickCollector({
  rageClickThreshold: 3,      // 3 clicks = rage
  rageClickWindow: 2000,       // En 2 segundos
  heatmapGridSize: 50          // Grid de 50x50px
});

tracker.use(clickCollector);

// Obtener heatmap
const heatmap = clickCollector.getHeatmap();
const topZones = clickCollector.getTopClickZones(10);
```

### Visibility Tracking

```javascript
const visibilityCollector = new VisibilityCollector({
  threshold: 0.5,                    // 50% visible
  trackSelectors: [
    'article',
    '.product-card',
    '[data-track]'
  ]
});

tracker.use(visibilityCollector);

// Obtener elementos más vistos
const topViewed = visibilityCollector.getTopViewed(10);
```

### Scroll Analytics

```javascript
const scrollCollector = new ScrollCollector({
  milestones: [25, 50, 75, 90, 100],
  scrollVelocityThreshold: 500        // px/s
});

tracker.use(scrollCollector);

// Obtener patrón de comportamiento
const pattern = scrollCollector.getBehaviorPattern();
// -> { type: 'engaged_reader', engagement: 'high' }
```

### Rage Clicks Detection

```javascript
tracker.eventBus.on('rage:detected', (data) => {
  console.warn('Usuario frustrado!', {
    selector: data.selector,
    clicks: data.clickCount,
    location: data.location
  });
  
  // Enviar alerta al equipo
  sendSlackAlert(`Rage click en ${data.selector}`);
});
```

---

## 💾 Exportación de Datos

### JSON Export

```javascript
// Exportar como archivo
tracker.export('analytics.json');

// Obtener métricas programáticamente
const metrics = tracker.getMetrics();
```

### Enviar a servidor

```javascript
// POST a endpoint
await tracker.send('https://api.example.com/analytics');

// Con retry automático
import { sendWithRetry } from './src/utils/export.js';

await sendWithRetry(
  'https://api.example.com/analytics',
  tracker.getMetrics(),
  { maxRetries: 3 }
);
```

### LocalStorage

```javascript
import { saveToLocalStorage, loadFromLocalStorage } from './src/utils/export.js';

// Guardar
saveToLocalStorage('analytics', tracker.getMetrics());

// Cargar
const metrics = loadFromLocalStorage('analytics');
```

---

## 🎨 Casos de Uso Reales

### E-commerce

```javascript
// Trackear productos más vistos
const topProducts = visibilityCollector.getTopViewed(10);

// Detectar productos que generan frustración
tracker.eventBus.on('rage:detected', (data) => {
  if (data.selector.includes('.add-to-cart')) {
    console.error('Botón de compra tiene problemas!');
  }
});
```

### Blog/Contenido

```javascript
// Medir engagement real
const scrollStats = scrollCollector.getScrollStats();

if (scrollStats.dominantPattern === 'reading') {
  console.log('✅ Artículo genera buena lectura');
} else if (scrollStats.maxDepth < 25) {
  console.log('❌ Usuarios abandonan rápido');
}
```

### Landing Page

```javascript
// Optimizar CTAs
const ctaClicks = clickCollector.getElementClicks()
  .filter(el => el.selector.includes('.cta'));

const topCTA = ctaClicks[0];
console.log(`CTA más clickeado: ${topCTA.selector}`);
```

---

## 🧪 Proyecto de Demostración

El proyecto incluye una demo completa que muestra:

1. **Event Delegation** - Múltiples botones con un solo listener
2. **Rage Clicks** - Área interactiva para provocar rage clicks
3. **Product Cards** - Tracking de visibilidad en tiempo real
4. **Scroll Analytics** - Artículo largo con detección de patrones
5. **Performance Demo** - Renderizado de 1000 elementos optimizado
6. **Dashboard en Vivo** - Métricas actualizadas en tiempo real
7. **Heatmap Visual** - Canvas overlay con zonas calientes

---

## 🤝 Contribuir

Este proyecto es parte del contenido educativo de **FemCoders Club**.

Si encuentras bugs o tienes sugerencias:

1. Abre un Issue
2. Haz un Pull Request
3. Únete a nuestra comunidad en [femcodersclub.com](https://femcodersclub.com)

---

## 📚 Recursos Adicionales

- [MDN - IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [MDN - MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver)
- [MDN - Event Delegation](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#event_delegation)
- [Web.dev - requestAnimationFrame](https://web.dev/animations-guide/)

---

## 📝 Licencia

MIT License - Ver [LICENSE](LICENSE) para más detalles.

---

## 💜 FemCoders Club

Apoyando a mujeres en tecnología en España desde 2022.

- 🌐 [femcodersclub.com](https://femcodersclub.com)
- 💬 [Comunidad Slack](https://join.slack.com/t/femcodersclub/shared_invite/...)
- 📸 [Instagram](https://instagram.com/femcodersclub)
- 🐦 [Twitter](https://twitter.com/femcodersclub)

---

**Hecho con 💜 por FemCoders Club**
