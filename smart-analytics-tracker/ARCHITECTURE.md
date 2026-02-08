# 🏗️ Arquitectura del Smart Analytics Tracker

Este documento explica la arquitectura técnica del proyecto y las decisiones de diseño.

---

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Principios de Diseño](#principios-de-diseño)
3. [Componentes Core](#componentes-core)
4. [Collectors](#collectors)
5. [Observers](#observers)
6. [Flujo de Datos](#flujo-de-datos)
7. [Patrones Utilizados](#patrones-utilizados)
8. [Performance](#performance)

---

## Visión General

### Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                      TrackerEngine                          │
│                    (Orquestador)                            │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │              EventBus                              │   │
│  │         (Publisher-Subscriber)                     │   │
│  └────────────────────────────────────────────────────┘   │
│                          │                                  │
│      ┌───────────────────┼───────────────────┐            │
│      │                   │                   │            │
│  ┌───▼────┐       ┌──────▼─────┐      ┌────▼─────┐      │
│  │ Click  │       │ Visibility │      │  Scroll  │      │
│  │Collector│       │ Collector  │      │Collector │      │
│  └───┬────┘       └──────┬─────┘      └────┬─────┘      │
│      │                   │                   │            │
│  ┌───▼────────────────────▼───────────────────▼─────┐   │
│  │             Metrics Storage                      │   │
│  │    { clicks, visibility, scroll, rageClicks }    │   │
│  └──────────────────────────────────────────────────┘   │
│                          │                                  │
│  ┌───────────────────────▼──────────────────────────┐   │
│  │        Export Layer                              │   │
│  │   (JSON, CSV, API, LocalStorage)                │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Stack Tecnológico

- **JavaScript Vanilla** (ES6+)
- **No dependencias externas**
- **Módulos ES6** nativos
- **APIs del navegador:**
  - IntersectionObserver
  - MutationObserver
  - PerformanceAPI
  - Canvas API

---

## Principios de Diseño

### 1. Desacoplamiento (Loose Coupling)

Cada módulo es independiente y se comunica mediante eventos:

```javascript
// ClickCollector no conoce a VisibilityCollector
// Ambos solo conocen al EventBus

clickCollector.emit('click:registered', data);
visibilityCollector.on('click:registered', handleClick);
```

**Ventaja:** Podemos agregar/remover collectors sin romper nada.

### 2. Single Responsibility

Cada clase tiene una responsabilidad única:

- `TrackerEngine` → Orquestación
- `ClickCollector` → Solo tracking de clicks
- `EventBus` → Solo comunicación

### 3. Open/Closed Principle

Abierto para extensión, cerrado para modificación:

```javascript
// Fácil agregar nuevo collector
class CustomCollector {
  setEventBus(eventBus) { /* ... */ }
  start() { /* ... */ }
  stop() { /* ... */ }
}

tracker.use(new CustomCollector());
```

### 4. Dependency Injection

Los módulos reciben sus dependencias:

```javascript
class ClickCollector {
  setEventBus(eventBus) {
    this.eventBus = eventBus;  // Inyectado
  }
  
  setMetrics(metrics) {
    this.metrics = metrics;    // Inyectado
  }
}
```

---

## Componentes Core

### TrackerEngine

**Responsabilidad:** Orquestador principal del sistema.

**Funciones clave:**
- Event delegation global
- Gestión del ciclo de vida (start/stop)
- Registro de collectors
- Exportación de métricas

**Decisiones de diseño:**

1. **Event Delegation en Capturing Phase:**
   ```javascript
   document.addEventListener('click', handler, true);
   //                                          ^^^^
   //                                  Capturing phase
   ```
   **Por qué:** Interceptamos eventos ANTES que listeners específicos.

2. **requestAnimationFrame para scroll:**
   ```javascript
   window.addEventListener('scroll', () => {
     if (!isScrolling) {
       isScrolling = true;
       requestAnimationFrame(() => {
         handleScroll();
         isScrolling = false;
       });
     }
   }, { passive: true });
   ```
   **Por qué:** Limita callbacks a ~60fps, evita jank.

3. **Passive Listeners:**
   ```javascript
   { passive: true }
   ```
   **Por qué:** No bloqueamos scroll, mejor performance.

### EventBus

**Responsabilidad:** Sistema de comunicación pub-sub.

**Patrón implementado:** Publisher-Subscriber (Observer Pattern)

```javascript
// Publisher
eventBus.emit('rage:detected', { selector: '.btn' });

// Subscriber
eventBus.on('rage:detected', (data) => {
  console.log('Rage!', data);
});
```

**Ventajas:**
- Desacopla productores y consumidores
- Permite N:N comunicación
- Fácil debug (modo debug)

---

## Collectors

### ClickCollector

**Funcionalidades:**

1. **Tracking básico** → Registra todos los clicks
2. **Heatmap** → Agrupa clicks en grid espacial
3. **Rage Detection** → Detecta patrones de frustración

**Algoritmo Rage Detection:**

```javascript
// Pseudo-código
Si (clicks_en_radio_50px >= 3) 
  Y (tiempo_entre_clicks < 2000ms)
→ RAGE CLICK
```

**Estructura del heatmap:**

```javascript
Map {
  "10,5" => {
    x: 500,      // Posición del grid
    y: 250,
    count: 15,   // Número de clicks
    intensity: 75 // 0-100, relativo al máximo
  }
}
```

### VisibilityCollector

**Usa:** IntersectionObserver API

**Flujo:**

```
Elemento entra viewport
    ↓
IntersectionObserver detecta (threshold: 0.5)
    ↓
Inicia timer (setInterval 1s)
    ↓
Actualiza totalTime cada segundo
    ↓
Elemento sale viewport
    ↓
Detiene timer
    ↓
Guarda sesión en métricas
```

**Optimizaciones:**

1. **Lazy observation:** Observa elementos dinámicos cada 5s
2. **Batch updates:** Agrupa actualizaciones de UI
3. **Min visibility time:** Ignora vistas < 1s

### ScrollCollector

**Tracking:**

1. **Depth** → % máximo scrolleado
2. **Velocity** → Velocidad en px/s
3. **Pattern** → Tipo de scroll (reading/scanning/searching)
4. **Milestones** → Hitos alcanzados (25%, 50%, etc.)

**Clasificación de patrones:**

```javascript
velocity < 100 px/s    → 'reading'    (lectura)
velocity < 500 px/s    → 'scanning'   (escaneo)
velocity >= 500 px/s   → 'searching'  (búsqueda)
```

**Detección de engagement:**

```javascript
if (pattern === 'reading' && maxDepth > 75%) {
  return 'engaged_reader';
}
```

---

## Observers

### MutationObserver

**Propósito:** Detectar contenido que se agrega dinámicamente.

**Configuración:**

```javascript
{
  childList: true,      // Nodos agregados/removidos
  attributes: true,     // Cambios en atributos
  subtree: true,        // Observar todo el árbol
  attributeOldValue: true
}
```

**Debouncing:**

Para evitar spam de mutaciones:

```javascript
debounceTime: 100ms
```

Agrupa mutaciones y las procesa en lotes.

### IntersectionManager

**Propósito:** Wrapper sobre IntersectionObserver con features adicionales.

**Features:**
- Múltiples observers simultáneos
- Tracking de tiempo de visibilidad
- Eventos granulares (half-visible, fully-visible)

---

## Flujo de Datos

### Flujo de un Click

```
1. Usuario hace click
       ↓
2. Event Delegation captura (capturing phase)
       ↓
3. TrackerEngine.handleClick()
       ↓
4. EventBus.emit('click:registered', data)
       ↓
5. ClickCollector.processClick()
   - Guarda en metrics.clicks
   - Actualiza heatmap
   - Detecta rage click
       ↓
6. EventBus.emit('click:processed', data)
       ↓
7. Dashboard UI actualiza
```

### Flujo de Visibilidad

```
1. Elemento entra viewport
       ↓
2. IntersectionObserver callback
       ↓
3. VisibilityCollector.handleIntersection()
       ↓
4. Inicia timer (setInterval)
       ↓
5. EventBus.emit('visibility:update') cada 1s
       ↓
6. Elemento sale viewport
       ↓
7. Detiene timer
       ↓
8. EventBus.emit('visibility:stopped')
       ↓
9. Guarda en metrics.visibility
```

---

## Patrones Utilizados

### 1. Publisher-Subscriber (EventBus)

```javascript
// Publishers
clickCollector.emit('rage:detected', data);

// Subscribers
dashboard.on('rage:detected', showAlert);
logger.on('rage:detected', logEvent);
```

### 2. Strategy Pattern (Collectors)

Diferentes estrategias de tracking intercambiables:

```javascript
tracker
  .use(new ClickCollector())      // Estrategia 1
  .use(new VisibilityCollector()) // Estrategia 2
  .use(new ScrollCollector());    // Estrategia 3
```

### 3. Builder Pattern (TrackerEngine)

```javascript
const tracker = new TrackerEngine({ config })
  .use(collector1)
  .use(collector2)
  .start();
```

### 4. Singleton Pattern (Metrics)

Un solo objeto de métricas compartido:

```javascript
this.metrics = {
  clicks: [],
  scroll: [],
  visibility: []
};

// Todos los collectors lo comparten
collector.setMetrics(this.metrics);
```

### 5. Module Pattern (ES6 Modules)

```javascript
export class ClickCollector { /* ... */ }
export class TrackerEngine { /* ... */ }
```

---

## Performance

### Optimizaciones Implementadas

#### 1. Event Delegation

```javascript
// En lugar de N listeners
buttons.forEach(btn => {
  btn.addEventListener('click', handler);
});

// Un solo listener
document.addEventListener('click', handler, true);
```

**Ahorro:** 
- Memoria: ~50 bytes por listener evitado
- CPU: Un solo check en lugar de N

#### 2. requestAnimationFrame

```javascript
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

**Beneficio:** Máximo 60 llamadas/segundo sincronizadas con refresh.

#### 3. DocumentFragment

```javascript
const fragment = document.createDocumentFragment();
for (let i = 0; i < 1000; i++) {
  fragment.appendChild(createElement());
}
container.appendChild(fragment); // Un solo reflow
```

**Ahorro:** 999 reflows evitados.

#### 4. Passive Listeners

```javascript
{ passive: true }
```

**Beneficio:** No bloquea scroll, permite optimizaciones del navegador.

#### 5. Debouncing (MutationObserver)

```javascript
debounceTime: 100ms
```

**Beneficio:** Agrupa mutaciones, reduce procesamiento.

### Métricas de Performance

En una página típica:

```
Inicialización:     ~5ms
Click handling:     ~0.5ms
Scroll handling:    ~1ms (con rAF)
Visibility check:   ~2ms
Export JSON:        ~10ms (1000 eventos)
```

**Memoria:**
- Base: ~200KB
- Por evento: ~500 bytes
- 10,000 eventos: ~5MB

---

## Decisiones Técnicas

### ¿Por qué NO usar TypeScript?

**Decisión:** JavaScript vanilla

**Razones:**
1. Accesibilidad: Código más fácil de entender para principiantes
2. No requiere build step
3. Demo funciona directamente en el navegador
4. Enfoque educativo del proyecto

### ¿Por qué NO usar framework?

**Decisión:** JavaScript vanilla (sin React/Vue)

**Razones:**
1. Demostrar conceptos puros del DOM
2. Cero dependencias
3. Aprender los fundamentals
4. Más ligero y rápido

### ¿Por qué Modules en lugar de bundler?

**Decisión:** ES6 Modules nativos

**Razones:**
1. Soporte nativo en navegadores modernos
2. No requiere Webpack/Rollup
3. Más simple para aprender
4. Carga bajo demanda (tree shaking nativo)

---

## Extensibilidad

### Agregar Nuevo Collector

```javascript
export class FormCollector {
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
    // Tu lógica aquí
    this.eventBus.on('submit', this.handleSubmit);
  }
  
  stop() {
    // Cleanup
  }
}

// Uso
tracker.use(new FormCollector());
```

### Agregar Custom Event

```javascript
// En cualquier collector
this.eventBus.emit('custom:event', { data });

// En dashboard
tracker.eventBus.on('custom:event', (data) => {
  console.log('Custom event!', data);
});
```

---

## Testing Strategy

**Áreas a testear:**

1. **Unit Tests**
   - EventBus
   - Collectors (aislados)
   - Utilidades

2. **Integration Tests**
   - TrackerEngine + Collectors
   - Flujo completo de eventos

3. **E2E Tests**
   - Demo page
   - Interacciones reales

**Framework recomendado:** Jest + Testing Library

---

## Mejoras Futuras

### Roadmap

- [ ] TypeScript types (`.d.ts`)
- [ ] Tests unitarios
- [ ] Build optimizado (minify)
- [ ] Web Workers para procesamiento
- [ ] IndexedDB para almacenamiento masivo
- [ ] Server-side tracking opcional
- [ ] React/Vue integrations

---

## Referencias

- [IntersectionObserver API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [MutationObserver API](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver)
- [Event Delegation](https://javascript.info/event-delegation)
- [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame)

---

**Creado por FemCoders Club con 💜**
