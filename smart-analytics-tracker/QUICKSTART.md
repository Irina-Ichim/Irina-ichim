# ⚡ Quick Start - Smart Analytics Tracker

Guía de 5 minutos para comenzar con el Smart Analytics Tracker.

---

## 🚀 Paso 1: Abrir la Demo

```bash
# Opción A: Usando Python
cd demo
python3 -m http.server 8000

# Opción B: Usando Node
npx http-server -p 8000

# Opción C: Usando PHP
php -S localhost:8000
```

Abre tu navegador en: `http://localhost:8000`

---

## 🎯 Paso 2: Explorar la Demo

### Interacciones disponibles:

1. **Clicks** → Haz click en los botones
2. **Rage Clicks** → Haz click rápido 3+ veces en el botón "roto"
3. **Scroll** → Scrollea por el artículo largo
4. **Visibilidad** → Observa los timers en las product cards
5. **Heatmap** → Presiona `H` para ver el mapa de calor

### Dashboard en Vivo

El dashboard flotante (esquina superior derecha) muestra:
- Total de clicks
- Rage clicks detectados
- Scroll depth
- Elementos visibles

---

## 📦 Paso 3: Usar en Tu Proyecto

### Instalación

Copia la carpeta `src/` a tu proyecto:

```
tu-proyecto/
├── src/
│   └── smart-analytics-tracker/
│       ├── core/
│       ├── collectors/
│       ├── observers/
│       └── utils/
```

### Uso Básico

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Mi Proyecto</title>
</head>
<body>
  <h1>Mi Sitio Web</h1>
  
  <script type="module">
    import { TrackerEngine, ClickCollector } from './src/smart-analytics-tracker/index.js';
    
    // Crear tracker
    const tracker = new TrackerEngine();
    
    // Agregar collectors
    tracker.use(new ClickCollector());
    
    // Iniciar
    tracker.start();
    
    // Exportar métricas después de 30 segundos
    setTimeout(() => {
      tracker.export('mis-metricas.json');
    }, 30000);
  </script>
</body>
</html>
```

---

## 🎓 Paso 4: Conceptos Básicos

### Event Delegation

El tracker captura TODOS los clicks con un solo listener:

```javascript
// ❌ No hagas esto
buttons.forEach(btn => {
  btn.addEventListener('click', handler);
});

// ✅ El tracker lo hace así
document.addEventListener('click', handler, true);
```

### IntersectionObserver

Detecta visibilidad automáticamente:

```html
<!-- Marca elementos para trackear -->
<div class="product-card" data-track-visibility>
  <h3>Producto A</h3>
</div>
```

```javascript
import { VisibilityCollector } from './src/index.js';

tracker.use(new VisibilityCollector({
  trackSelectors: ['[data-track-visibility]']
}));
```

### Custom Events

Escucha eventos del sistema:

```javascript
// Cuando detecta un rage click
tracker.eventBus.on('rage:detected', (data) => {
  console.log('¡Usuario frustrado!', data);
  alert('Parece que algo no funciona bien...');
});

// Cuando alcanza un milestone de scroll
tracker.eventBus.on('milestone:reached', (data) => {
  console.log(`Usuario llegó al ${data.milestone}%`);
});
```

---

## 💾 Paso 5: Exportar Datos

### Exportar como JSON

```javascript
// Manual
document.querySelector('#export-btn').addEventListener('click', () => {
  tracker.export('analytics.json');
});

// Automático cada minuto
const tracker = new TrackerEngine({
  autoExport: true,
  exportInterval: 60000
});
```

### Enviar al Servidor

```javascript
// Al salir de la página
window.addEventListener('beforeunload', async () => {
  await fetch('https://api.example.com/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tracker.getMetrics())
  });
});
```

### Guardar en LocalStorage

```javascript
import { saveToLocalStorage } from './src/utils/export.js';

saveToLocalStorage('analytics', tracker.getMetrics());
```

---

## 🔥 Casos de Uso Comunes

### E-commerce: Productos Más Vistos

```javascript
import { VisibilityCollector } from './src/index.js';

const tracker = new TrackerEngine();
const visibilityCollector = new VisibilityCollector({
  trackSelectors: ['.product-card']
});

tracker.use(visibilityCollector);
tracker.start();

// Después de 1 minuto
setTimeout(() => {
  const topProducts = visibilityCollector.getTopViewed(10);
  console.log('Top 10 productos más vistos:', topProducts);
}, 60000);
```

### Blog: Medir Engagement

```javascript
import { ScrollCollector } from './src/index.js';

const tracker = new TrackerEngine();
const scrollCollector = new ScrollCollector();

tracker.use(scrollCollector);
tracker.start();

// Al terminar
window.addEventListener('beforeunload', () => {
  const stats = scrollCollector.getScrollStats();
  const pattern = scrollCollector.getBehaviorPattern();
  
  console.log('Profundidad máxima:', stats.maxDepth + '%');
  console.log('Patrón:', pattern.description);
});
```

### Landing Page: Optimizar CTAs

```javascript
import { ClickCollector } from './src/index.js';

const tracker = new TrackerEngine();
const clickCollector = new ClickCollector();

tracker.use(clickCollector);
tracker.start();

// Después de testing
setTimeout(() => {
  const heatmap = clickCollector.getHeatmap();
  const topZones = clickCollector.getTopClickZones(5);
  
  console.log('Zonas más clickeadas:', topZones);
}, 120000); // 2 minutos
```

---

## 🎨 Personalizar

### Configurar Collectors

```javascript
const clickCollector = new ClickCollector({
  rageClickThreshold: 5,      // 5 clicks en lugar de 3
  rageClickWindow: 3000,       // En 3 segundos
  heatmapGridSize: 100         // Grid más grande
});

const scrollCollector = new ScrollCollector({
  milestones: [10, 25, 50, 75, 90, 100],  // Más milestones
  scrollVelocityThreshold: 300             // Más sensible
});
```

### Crear Custom Collector

```javascript
class MiCollector {
  constructor(config = {}) {
    this.config = config;
    this.eventBus = null;
    this.metrics = null;
  }
  
  setEventBus(eventBus) {
    this.eventBus = eventBus;
  }
  
  setMetrics(metrics) {
    this.metrics = metrics;
  }
  
  start() {
    console.log('Mi collector iniciado');
    // Tu lógica aquí
  }
  
  stop() {
    console.log('Mi collector detenido');
  }
}

// Usar
tracker.use(new MiCollector());
```

---

## 🐛 Debug

### Activar Modo Debug

```javascript
const tracker = new TrackerEngine({
  debugMode: true  // Muestra logs detallados
});
```

### Inspeccionar en Console

```javascript
// Acceder al tracker globalmente
window.tracker = tracker;

// En la consola del navegador:
tracker.getMetrics()
tracker.eventBus.getRegisteredEvents()
clickCollector.getHeatmap()
visibilityCollector.getTopViewed()
```

---

## 📚 Próximos Pasos

1. **Lee el [README.md](./README.md)** - Documentación completa
2. **Revisa [EXAMPLES.md](./EXAMPLES.md)** - Más casos de uso
3. **Explora [ARCHITECTURE.md](./ARCHITECTURE.md)** - Detalles técnicos
4. **Únete a [FemCoders Club](https://femcodersclub.com)** - Comunidad

---

## ❓ FAQ

**P: ¿Necesito instalar dependencias?**  
R: No, es JavaScript vanilla puro.

**P: ¿Funciona con React/Vue?**  
R: Sí, ver [EXAMPLES.md](./EXAMPLES.md#spa-single-page-app)

**P: ¿Cómo envío datos a mi backend?**  
R: Ver [EXAMPLES.md](./EXAMPLES.md#integración-con-backend)

**P: ¿Puedo usar TypeScript?**  
R: El código es compatible, solo necesitas crear los `.d.ts`

**P: ¿Afecta el performance?**  
R: Mínimo. Usa event delegation, rAF, y passive listeners.

---

**¡Listo para comenzar! 🚀**

Si tienes problemas, abre un issue en GitHub o únete a nuestra comunidad.

*Hecho con 💜 por FemCoders Club*
