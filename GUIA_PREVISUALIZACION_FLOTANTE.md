# Guía de Implementación: Previsualización Flotante
## Smart Forms & Quiz Plugin - WordPress

### Versión: 1.0
### Fecha: Agosto 2025

---

## 📋 Índice

1. [Introducción](#introducción)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Componentes Principales](#componentes-principales)
4. [Implementación Realizada](#implementación-realizada)
5. [Configuración y Uso](#configuración-y-uso)
6. [Buenas Prácticas y Mantenimiento](#buenas-prácticas-y-mantenimiento)
7. [Solución de Problemas](#solución-de-problemas)

---

## 🎯 Introducción

La **Previsualización Flotante** es una funcionalidad avanzada que permite a los usuarios ver en tiempo real cómo se verán las preguntas del formulario y los mensajes de configuración mientras los están editando.

### Características Implementadas

- **Posicionamiento Lateral Fijo**: Se posiciona a la izquierda para preguntas y a la derecha para mensajes
- **Actualización en Tiempo Real**: Refleja cambios instantáneamente mientras se escribe (con debouncing)
- **Previsualización Completa**: Muestra preguntas, opciones, mensajes de bloqueo y límites
- **Configuración Flexible**: Se puede activar/desactivar desde la pestaña de Configuración
- **Diseño Idéntico al Frontend**: Usa exactamente los mismos estilos que el frontend
- **Posición Fija**: No se mueve con el scroll, mantiene posición estable

---

## 🏗️ Arquitectura del Sistema

### Integración con FormBuilderCore

```javascript
FormBuilderCore
├── PreviewManager (implementado)
│   ├── Event Handlers
│   ├── Position Calculator
│   ├── Question Renderer
│   ├── Message Renderer
│   └── Style Manager
├── StateManager (existente)
├── QuestionManager (existente)
└── UIRenderer (existente)
```

### Flujo de Datos Implementado

```
Usuario hace focus en campo
    ↓
Event Listener detecta contexto (pregunta/mensaje)
    ↓
PreviewManager determina tipo y posición
    ↓
Renderer genera HTML con estilos exactos del frontend
    ↓
Previsualización se muestra en posición lateral fija
    ↓
Usuario escribe → Debounced update → Previsualización se actualiza
```

---

## 🔧 Componentes Principales

### 1. PreviewManager (Clase Principal)

**Archivo:** `assets/js/preview-manager.js`

**Responsabilidades:**
- Gestionar el ciclo de vida de las previsualizaciones
- Detectar contexto de edición (pregunta vs mensaje vs bloqueo)
- Manejar posicionamiento lateral fijo
- Aplicar debouncing para optimizar rendimiento
- Coordinar renderizado con estilos exactos del frontend

**Métodos Principales:**
```javascript
class PreviewManager {
    init()                                    // Inicialización y binding de eventos
    createPreviewContainer()                  // Crear contenedor flotante
    bindEvents()                             // Event listeners para focus/input/blur
    showQuestionPreview(container, input)    // Mostrar previsualización de pregunta
    showMessagePreview(input)                // Mostrar previsualización de mensaje
    showBlockMessagePreview(input)           // Mostrar previsualización de bloqueo
    calculatePosition(element, side)         // Calcular posición lateral fija
    renderQuestionPreview(data)              // Renderizar pregunta con estilos frontend
    getFormStyles()                          // Obtener colores de configuración
    debounceUpdate(key, callback)            // Optimización de actualizaciones
    destroy()                                // Cleanup completo
}
```

### 2. Sistema de Posicionamiento

**Algoritmo Implementado:**
```javascript
// Posicionamiento lateral fijo
if (preferredSide === 'left') {
    left = 20; // Izquierda para preguntas
} else {
    left = windowWidth - previewWidth - 20; // Derecha para mensajes
}
top = 80; // Posición fija desde arriba
```

**Características:**
- **Preguntas**: Siempre a la izquierda (20px del borde)
- **Mensajes de límites**: Siempre a la derecha
- **Mensajes de bloqueo**: Siempre a la derecha
- **Top fijo**: 80px desde arriba, no se mueve con scroll
- **Responsive**: Se adapta a diferentes tamaños de pantalla

### 3. Sistema de Renderizado

**Tipos de Preguntas Soportados:**
- **Texto simple y email**: Input con línea animada
- **Opción única**: Cards con estructura exacta del frontend
- **Opción múltiple**: Cards con checkboxes y SVG icons
- **Rating**: Estrellas con colores configurables
- **Genérico**: Placeholder para tipos no implementados

**Tipos de Mensajes Soportados:**
- **Formulario bloqueado**: Con video, timer y configuraciones
- **Límite de envíos**: Con iconos y botones personalizables
- **Límite de participantes**: Con colores configurables
- **Login requerido**: Con estilos específicos
- **Programación**: Con mensajes de disponibilidad

### 4. Sistema de Estilos

**Obtención de Colores:**
```javascript
getFormStyles() {
    // Obtener colores desde la pestaña "Estilo" (tab-style)
    const primaryColor = $('#primary-color').val() || '#007cba';
    const secondaryColor = $('#secondary-color').val() || '#6c757d';
    const backgroundColor = $('#background-color').val() || '#ffffff';
    const textColor = $('#text-color').val() || '#333333';
    const borderRadius = $('#border-radius').val() || '12';
    const fontFamily = $('#font-family').val() || 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    // ... resto de configuraciones
}
```

**Estilos Aplicados:**
- **Colores exactos del frontend**: `#ffffff`, `#333333`, `#007cba`, `#e0e0e0`
- **Estructura HTML idéntica**: Usa las mismas clases CSS
- **Transiciones y sombras**: Exactamente como el frontend
- **Responsive**: Se adapta a diferentes pantallas

---

## 📝 Implementación Realizada

### Archivos Creados/Modificados

#### 1. PreviewManager Principal
**Archivo:** `assets/js/preview-manager.js`
- Clase completa con todos los métodos implementados
- Event handlers para focus, input, blur
- Renderizadores para preguntas y mensajes
- Sistema de posicionamiento lateral fijo
- Debouncing y optimizaciones de rendimiento

#### 2. Estilos CSS
**Archivo:** `assets/css/preview-floating.css`
- Contenedor flotante con posición fija
- Estilos exactos del frontend para opciones
- Header y footer de previsualización
- Estados de hover y transiciones
- Responsive design completo
- Temas y variaciones (incluyendo modo oscuro)

#### 3. Integración con Admin
**Archivo:** `includes/class-sfq-admin.php`
- Checkbox de configuración en pestaña "Configuración"
- Enqueue de archivos CSS y JS
- Integración con sistema de guardado

#### 4. Integración con FormBuilder
**Archivo:** `assets/js/admin-builder-v2.js`
- Inicialización de PreviewManager
- Binding con configuración de activación
- Integración con sistema de guardado/carga
- Cleanup en destroy

### Configuración Implementada

**En la pestaña "Configuración":**
```html
<div class="sfq-field-group">
    <label>
        <input type="checkbox" id="enable-floating-preview">
        🔍 Activar previsualización flotante
    </label>
    <p class="description">
        Muestra una previsualización en tiempo real de las preguntas y mensajes mientras los editas
    </p>
</div>
```

### Event Handlers Implementados

```javascript
// Preguntas
$(document).on('focus', '.sfq-question-text-input', handler);
$(document).on('input', '.sfq-question-text-input', debouncedHandler);
$(document).on('focus', '.sfq-option-input', handler);

// Mensajes de límites
$(document).on('focus', '#tab-limits input, #tab-limits textarea', handler);

// Mensajes de bloqueo
$(document).on('focus', '#tab-general #block-form-container input, textarea', handler);

// Configuración
$(document).on('change', '#enable-floating-preview', toggleHandler);
```

---

## ⚙️ Configuración y Uso

### Activación

1. **Ir a la pestaña "Configuración"** en el constructor de formularios
2. **Marcar el checkbox** "🔍 Activar previsualización flotante"
3. **Guardar el formulario** para persistir la configuración

### Uso Durante la Edición

#### Para Preguntas:
1. **Hacer clic** en el campo de texto de una pregunta o en una opción
2. **La previsualización aparece** automáticamente a la izquierda (20px del borde)
3. **Escribir** actualiza la previsualización en tiempo real
4. **Cambiar de campo** oculta la previsualización después de 500ms

#### Para Mensajes de Límites:
1. **Ir a la pestaña "Límites"**
2. **Hacer clic** en cualquier campo de configuración de mensajes
3. **La previsualización aparece** a la derecha
4. **Escribir** actualiza el mensaje en tiempo real

#### Para Mensajes de Bloqueo:
1. **Ir a la pestaña "General"**
2. **Hacer clic** en campos del "Bloqueo de Formulario"
3. **La previsualización aparece** a la derecha
4. **Incluye** video, timer y configuraciones visuales

### Características de Uso

- **Posición fija**: No se mueve al hacer scroll
- **Actualización instantánea**: Cambios se reflejan mientras escribes
- **Colores dinámicos**: Usa los colores configurados en el formulario
- **Responsive**: Se adapta a pantallas pequeñas
- **No interfiere**: Posicionamiento lateral que no tapa el contenido

---

## 🛠️ Buenas Prácticas y Mantenimiento

### Optimizaciones Implementadas

#### 1. Debouncing
```javascript
debounceUpdate(key, callback) {
    if (this.debounceTimers[key]) {
        clearTimeout(this.debounceTimers[key]);
    }
    this.debounceTimers[key] = setTimeout(() => {
        callback();
        delete this.debounceTimers[key];
    }, this.config.debounceDelay); // 300ms
}
```

#### 2. Event Namespacing
```javascript
const ns = '.preview-' + this.formBuilder.instanceId;
$(document).on('focus' + ns, selector, handler);
```

#### 3. Memory Management
```javascript
destroy() {
    // Limpiar event listeners
    $(document).off(ns);
    $(window).off(ns);
    
    // Limpiar timers
    Object.values(this.debounceTimers).forEach(timer => clearTimeout(timer));
    
    // Remover DOM elements
    if (this.previewContainer) {
        this.previewContainer.remove();
    }
}
```

### Mantenimiento de Estilos

#### Sincronización con Frontend
Para mantener la previsualización idéntica al frontend:

1. **Revisar cambios en `frontend.css`** regularmente
2. **Actualizar colores** en `getFormStyles()` si se añaden nuevos campos
3. **Mantener estructura HTML** idéntica en los renderizadores
4. **Probar responsive** en diferentes dispositivos

#### Añadir Nuevos Tipos de Pregunta
```javascript
// En renderQuestionPreview()
case 'nuevo_tipo':
    html += this.renderNuevoTipo(questionData.options, styles);
    break;

// Implementar método específico
renderNuevoTipo(options, styles) {
    // Usar estructura exacta del frontend
    // Aplicar estilos dinámicos
    // Retornar HTML completo
}
```

### Performance Guidelines

1. **Usar debouncing** para todas las actualizaciones en tiempo real
2. **Limpiar event listeners** correctamente en destroy
3. **Evitar manipulación DOM excesiva** - regenerar HTML completo es más eficiente
4. **Usar CSS transforms** para animaciones suaves
5. **Implementar lazy loading** si se añaden más tipos de previsualización

---

## 🔧 Solución de Problemas

### Problemas Comunes y Soluciones

#### 1. Previsualización no aparece
**Síntomas:** No se muestra al hacer focus en campos
**Soluciones:**
- Verificar que el checkbox esté marcado: `$('#enable-floating-preview').is(':checked')`
- Comprobar que PreviewManager esté inicializado: `this.previewManager.isEnabled`
- Revisar errores en consola del navegador

#### 2. Colores incorrectos
**Síntomas:** Los colores no coinciden con el frontend
**Soluciones:**
- Verificar que los campos de color existan en el DOM
- Añadir nuevos selectores en `getFormStyles()` si se cambian los IDs
- Forzar colores por defecto: `#007cba`, `#333333`, `#ffffff`

#### 3. Posicionamiento incorrecto
**Síntomas:** Previsualización aparece en lugar equivocado
**Soluciones:**
- Verificar `calculatePosition()` con diferentes tamaños de pantalla
- Ajustar valores de `left` y `top` según necesidades
- Comprobar que `position: fixed` esté aplicado correctamente

#### 4. Fondo oscuro en elementos
**Síntomas:** Elementos tienen fondo oscuro en lugar de blanco
**Soluciones:**
- Añadir `background: transparent` o `background: #ffffff` en estilos inline
- Verificar herencia de estilos CSS del admin de WordPress
- Usar selectores más específicos en CSS: `.sfq-preview-content .elemento`

#### 5. Previsualización se mueve con scroll
**Síntomas:** La previsualización no mantiene posición fija
**Soluciones:**
- Verificar `position: fixed !important` en CSS
- Usar `getBoundingClientRect()` en lugar de `offset()` para posicionamiento
- Asegurar que `top` sea fijo, no relativo al scroll

### Debugging

#### Console Logs Útiles
```javascript
console.log('PreviewManager: Inicialización completa. Habilitado:', this.isEnabled);
console.log('PreviewManager: Question focus detected', e.target);
console.log('PreviewManager: Position calculated:', position);
```

#### Verificación de Estado
```javascript
// En consola del navegador
window.formBuilder.previewManager.isEnabled
window.formBuilder.previewManager.currentContext
window.formBuilder.previewManager.currentPreview
```

### Extensibilidad

#### Añadir Nuevos Contextos
```javascript
// En bindEvents()
$(document).on('focus', '.nuevo-selector', (e) => {
    if (this.isEnabled) {
        this.handleNuevoContexto(e);
    }
});

// Implementar handler
handleNuevoContexto(e) {
    this.currentContext = 'nuevo-contexto';
    // Lógica específica
}
```

#### Personalizar Posicionamiento
```javascript
// Modificar calculatePosition() para nuevas reglas
if (this.currentContext === 'nuevo-contexto') {
    left = windowWidth / 2 - previewWidth / 2; // Centrado
    top = 50; // Más arriba
}
```

---

## 📚 Referencias Técnicas

### Archivos del Sistema
- `assets/js/preview-manager.js` - Clase principal
- `assets/css/preview-floating.css` - Estilos completos
- `includes/class-sfq-admin.php` - Integración con admin
- `assets/js/admin-builder-v2.js` - Integración con FormBuilder

### Dependencias
- jQuery 3.x
- FormBuilderCore (existente)
- CSS Grid y Flexbox support
- ES6 Classes support

### Configuraciones Clave
- Debounce delay: 300ms
- Animation duration: 250ms
- Preview width: 380px (max), 280px (min)
- Top position: 80px (fixed)
- Z-index: 10000

### Colores por Defecto
- Primary: `#007cba`
- Secondary: `#6c757d`
- Background: `#ffffff`
- Text: `#333333`
- Border: `#e0e0e0`

---

**Versión:** 1.0 - Implementación completa y funcional
**Última actualización:** Agosto 2025
**Estado:** Producción - Completamente probado y optimizado
