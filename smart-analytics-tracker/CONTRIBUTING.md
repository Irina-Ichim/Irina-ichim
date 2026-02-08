# 🤝 Guía de Contribución

¡Gracias por tu interés en contribuir a Smart Analytics Tracker! 💜

Este proyecto es parte del contenido educativo de **FemCoders Club** y damos la bienvenida a todas las contribuciones.

---

## 📋 Tabla de Contenidos

1. [Código de Conducta](#código-de-conducta)
2. [Cómo Contribuir](#cómo-contribuir)
3. [Reportar Bugs](#reportar-bugs)
4. [Sugerir Features](#sugerir-features)
5. [Pull Requests](#pull-requests)
6. [Estilo de Código](#estilo-de-código)
7. [Commit Messages](#commit-messages)

---

## Código de Conducta

Este proyecto sigue el código de conducta de FemCoders Club. Esperamos que todos los participantes:

- Sean respetuosos y considerados
- Acepten críticas constructivas
- Se enfoquen en lo mejor para la comunidad
- Muestren empatía hacia otros miembros

---

## Cómo Contribuir

### 1. Fork del Repositorio

```bash
# Clonar tu fork
git clone https://github.com/TU_USUARIO/smart-analytics-tracker.git

# Agregar upstream
git remote add upstream https://github.com/femcodersclub/smart-analytics-tracker.git
```

### 2. Crear una Rama

```bash
git checkout -b feature/mi-nueva-feature
# o
git checkout -b fix/mi-fix
```

### 3. Hacer Cambios

- Escribe código claro y bien comentado
- Sigue el estilo de código existente
- Agrega tests si es posible
- Actualiza la documentación si es necesario

### 4. Commit

```bash
git add .
git commit -m "feat: descripción de tu cambio"
```

### 5. Push y Pull Request

```bash
git push origin feature/mi-nueva-feature
```

Luego crea un Pull Request en GitHub.

---

## Reportar Bugs

### Antes de reportar

- Busca si el bug ya fue reportado
- Verifica que uses la última versión
- Reproduce el bug en un ambiente limpio

### Template de Bug Report

```markdown
**Descripción del Bug**
Una descripción clara del problema.

**Pasos para Reproducir**
1. Ve a '...'
2. Haz click en '...'
3. Scrollea hasta '...'
4. Ver error

**Comportamiento Esperado**
Lo que debería pasar.

**Screenshots**
Si es posible, agrega screenshots.

**Ambiente:**
- OS: [e.g. Windows 10]
- Browser: [e.g. Chrome 96]
- Versión: [e.g. 1.0.0]
```

---

## Sugerir Features

¡Nos encantan las nuevas ideas!

### Template de Feature Request

```markdown
**¿El feature resuelve un problema? Descríbelo.**
Una descripción clara del problema.

**Solución Propuesta**
Cómo imaginas que funcione.

**Alternativas Consideradas**
Otras soluciones que pensaste.

**Contexto Adicional**
Cualquier otra información relevante.
```

---

## Pull Requests

### Checklist

Antes de enviar un PR, verifica:

- [ ] El código sigue el estilo del proyecto
- [ ] Los commits son claros y descriptivos
- [ ] La documentación está actualizada
- [ ] No hay console.logs olvidados
- [ ] El código funciona en Chrome, Firefox y Safari

### Proceso de Review

1. **Automático:** GitHub Actions verifica formato
2. **Manual:** Un maintainer revisa el código
3. **Feedback:** Posibles cambios solicitados
4. **Merge:** Una vez aprobado, se hace merge

---

## Estilo de Código

### JavaScript

```javascript
// ✅ BIEN
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ❌ MAL
function calc(i) {
  let t = 0;
  for(let x of i) t += x.price;
  return t;
}
```

**Principios:**
- Nombres descriptivos
- Funciones pequeñas y enfocadas
- Comentarios cuando la lógica es compleja
- Preferir const sobre let
- Usar arrow functions cuando sea apropiado

### Comentarios

```javascript
// ✅ BIEN
/**
 * Calcula el tiempo total de visibilidad de un elemento
 * @param {Array} sessions - Array de sesiones de visibilidad
 * @returns {number} Tiempo total en milisegundos
 */
function calculateTotalTime(sessions) {
  return sessions.reduce((sum, s) => sum + s.duration, 0);
}

// ❌ MAL
// calcula tiempo
function calcTime(s) {
  return s.reduce((a, b) => a + b.d, 0);
}
```

### Estructura de Archivos

```javascript
// 1. Imports
import { EventBus } from './EventBus.js';

// 2. Constantes
const DEFAULT_CONFIG = { /* ... */ };

// 3. Clase/Funciones
export class MyClass {
  // Constructor
  constructor() { }
  
  // Métodos públicos
  publicMethod() { }
  
  // Métodos privados (con _)
  _privateMethod() { }
}

// 4. Exports
export default MyClass;
```

---

## Commit Messages

Seguimos [Conventional Commits](https://www.conventionalcommits.org/).

### Formato

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Tipos

- `feat`: Nueva feature
- `fix`: Bug fix
- `docs`: Cambios en documentación
- `style`: Formateo, espacios, etc.
- `refactor`: Refactorización de código
- `test`: Agregar o modificar tests
- `chore`: Tareas de mantenimiento

### Ejemplos

```bash
feat(click-collector): agregar detección de doble click

Implementa un algoritmo para detectar doble clicks
y los diferencia de clicks simples.

Closes #123

---

fix(visibility): corregir timer leak

Los timers no se limpiaban correctamente al detener
el tracker, causando memory leaks.

---

docs(readme): actualizar ejemplos de uso

Agrega ejemplos más claros de configuración
del tracker.
```

---

## Áreas que Necesitan Ayuda

### 🐛 Bugs Conocidos

Revisa los [issues con label "bug"](https://github.com/femcodersclub/smart-analytics-tracker/labels/bug).

### ✨ Features Planeadas

- [ ] Soporte para TypeScript
- [ ] Tests unitarios
- [ ] Dashboard más completo
- [ ] Integración con Google Analytics
- [ ] Export a diferentes formatos

### 📚 Documentación

- Más ejemplos de uso
- Guías paso a paso
- Videos tutoriales
- Traducciones

---

## Preguntas

Si tienes dudas:

1. Revisa la [documentación](./README.md)
2. Busca en [issues cerrados](https://github.com/femcodersclub/smart-analytics-tracker/issues?q=is%3Aissue+is%3Aclosed)
3. Abre un [nuevo issue](https://github.com/femcodersclub/smart-analytics-tracker/issues/new)
4. Únete a nuestra [comunidad Slack](https://femcodersclub.com)

---

## Reconocimientos

Todos los contribuidores serán mencionados en el README.

---

## Licencia

Al contribuir, aceptas que tus contribuciones serán licenciadas bajo MIT License.

---

**¡Gracias por hacer este proyecto mejor! 💜**

*FemCoders Club*
