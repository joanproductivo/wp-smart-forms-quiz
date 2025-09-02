# Guía de Implementación: Nuevas Opciones en el Sistema de Previsualización

## Introducción

Esta guía documenta cómo implementar nuevas opciones de estilo que se reflejen correctamente en el sistema de previsualización flotante (`sfq-preview-content`). Basada en las correcciones implementadas para imagen de fondo, opacidades y overlay.

## Arquitectura del Sistema

### Componentes Principales

1. **PreviewManager** (`assets/js/preview-manager.js`)
   - Gestiona la previsualización flotante
   - Lee los valores de los campos de estilo
   - Renderiza la previsualización en tiempo real

2. **FormBuilderCore** (`assets/js/admin-builder-v2.js`)
   - Gestiona los estilos dinámicos del formulario
   - Sincroniza con PreviewManager
   - Aplica estilos CSS en tiempo real

## Pasos para Implementar Nuevas Opciones

### 1. Añadir Campos HTML en la Interfaz

Primero, añade los campos HTML necesarios en la pestaña de estilos:

```html
<!-- Ejemplo: Nueva opción de sombra personalizada -->
<div class="sfq-style-option">
    <label>Sombra personalizada:</label>
    <input type="range" id="custom-shadow-blur" class="sfq-range-control" 
           min="0" max="20" value="5">
    <span class="sfq-custom-shadow-value">5px</span>
</div>

<div class="sfq-style-option">
    <label>Color de sombra:</label>
    <input type="text" id="custom-shadow-color" class="sfq-color-picker" 
           value="#000000">
</div>

<div class="sfq-style-option">
    <label>Opacidad de sombra:</label>
    <input type="range" id="custom-shadow-opacity" class="sfq-opacity-control" 
           min="0" max="1" step="0.1" value="0.3" data-for="custom-shadow">
    <span class="sfq-opacity-value" data-for="custom-shadow">0.3</span>
</div>
```

### 2. Actualizar `getFormStyles()` en PreviewManager

Añade la lectura de los nuevos campos en la función `getFormStyles()`:

```javascript
getFormStyles() {
    // ... campos existentes ...
    
    // ✅ NUEVO: Obtener configuración de sombra personalizada
    const customShadowBlur = $('#custom-shadow-blur').val() || '5';
    const customShadowColor = $('#custom-shadow-color').val() || '#000000';
    const customShadowOpacity = $('#custom-shadow-opacity').val() || '0.3';
    
    // ... función applyOpacity existente ...
    
    return {
        // ... propiedades existentes ...
        
        // ✅ NUEVO: Propiedades de sombra personalizada
        customShadowBlur: customShadowBlur,
        customShadowColor: applyOpacity(customShadowColor, customShadowOpacity),
        customShadowOpacity: customShadowOpacity
    };
}
```

### 3. Aplicar Estilos en las Funciones de Renderizado

Actualiza las funciones de renderizado para usar los nuevos estilos:

```javascript
renderSingleChoiceOptions(options, styles) {
    let html = `<div class="sfq-options-grid" style="display: grid; gap: 1rem; grid-template-columns: 1fr;">`;
    options.forEach((option, index) => {
        html += `
            <div class="sfq-option-card" style="
                background: ${styles.optionsBackgroundColor} !important;
                border: 2px solid ${styles.optionsBorderColor} !important;
                border-radius: ${styles.borderRadius};
                box-shadow: 0 ${styles.customShadowBlur}px ${styles.customShadowBlur * 2}px ${styles.customShadowColor} !important;
                /* ... otros estilos ... */
            ">
                <!-- contenido de la opción -->
            </div>
        `;
    });
    html += `</div>`;
    return html;
}
```

### 4. Añadir Event Listeners

Añade los event listeners necesarios en la función `bindEvents()` del PreviewManager:

```javascript
bindEvents() {
    const ns = '.preview-' + this.formBuilder.instanceId;
    
    // ... eventos existentes ...
    
    // ✅ NUEVO: Eventos para sombra personalizada
    $(document).on('focus' + ns, '#custom-shadow-blur, #custom-shadow-color', (e) => {
        if (this.isEnabled) {
            this.handleStyleFocus(e);
        }
    });
    
    $(document).on('input change' + ns, '#custom-shadow-blur, #custom-shadow-color', (e) => {
        if (this.isEnabled && this.currentContext === 'style') {
            this.debounceUpdate('style-custom-shadow', () => {
                this.updateStylePreview();
            });
        }
    });
    
    // Evento específico para el slider de opacidad
    $(document).on('input' + ns, '#custom-shadow-opacity', (e) => {
        $('.sfq-custom-shadow-opacity-value').text($(e.target).val());
        if (this.isEnabled && this.currentContext === 'style') {
            this.debounceUpdate('style-custom-shadow-opacity', () => {
                this.updateStylePreview();
            });
        }
    });
}
```

### 5. Sincronizar con FormBuilderCore

Actualiza la función `updatePreviewStyles()` en FormBuilderCore:

```javascript
updatePreviewStyles() {
    // ... código existente ...
    
    const styles = {
        // ... estilos existentes ...
        
        // ✅ NUEVO: Configuraciones de sombra personalizada
        customShadowBlur: $('#custom-shadow-blur').val() || '5',
        customShadowColor: $('#custom-shadow-color').val() || '#000000',
        customShadowOpacity: $('#custom-shadow-opacity').val() || '0.3'
    };
    
    // ✅ NUEVO: Aplicar opacidades a los colores
    const processedStyles = {
        ...styles,
        customShadowColor: applyOpacity(styles.customShadowColor, styles.customShadowOpacity)
    };
    
    // Generar CSS dinámico
    let css = `
        /* ... CSS existente ... */
        
        /* ✅ NUEVO: Sombra personalizada */
        .sfq-form-container .sfq-option-card {
            box-shadow: 0 ${processedStyles.customShadowBlur}px ${processedStyles.customShadowBlur * 2}px ${processedStyles.customShadowColor} !important;
        }
    `;
    
    // ... resto del código ...
}
```

### 6. Añadir Event Listeners en FormBuilderCore

Actualiza los event listeners en FormBuilderCore:

```javascript
bindGlobalEvents() {
    const ns = '.' + this.instanceId;
    
    // ... eventos existentes ...
    
    // ✅ NUEVO: Event listeners para sombra personalizada
    $('#custom-shadow-blur, #custom-shadow-color').off('change input' + ns).on('change input' + ns, () => {
        if (!this.isDestroyed) {
            this.isDirty = true;
            this.updatePreviewStyles();
        }
    });
    
    $('#custom-shadow-opacity').off('input' + ns).on('input' + ns, (e) => {
        $('.sfq-custom-shadow-opacity-value').text($(e.target).val());
        if (!this.isDestroyed) {
            this.isDirty = true;
            this.updatePreviewStyles();
        }
    });
}
```

### 7. Guardar y Cargar Configuración

Actualiza las funciones de guardado y carga:

```javascript
// En collectFormData()
style_settings: {
    // ... configuraciones existentes ...
    
    // ✅ NUEVO: Configuración de sombra personalizada
    custom_shadow_blur: $('#custom-shadow-blur').val() || '5',
    custom_shadow_color: $('#custom-shadow-color').val() || '#000000',
    custom_shadow_opacity: $('#custom-shadow-opacity').val() || '0.3'
}

// En populateFormData()
$('#custom-shadow-blur').val(styles.custom_shadow_blur || '5');
$('.sfq-custom-shadow-value').text((styles.custom_shadow_blur || '5') + 'px');
$('#custom-shadow-color').val(styles.custom_shadow_color || '#000000').trigger('change');
$('#custom-shadow-opacity').val(styles.custom_shadow_opacity || '0.3');
$('.sfq-opacity-value[data-for="custom-shadow"]').text(styles.custom_shadow_opacity || '0.3');
```

## Patrones y Mejores Prácticas

### 1. Nomenclatura Consistente

- **Campos HTML**: Usar kebab-case (`custom-shadow-blur`)
- **JavaScript**: Usar camelCase (`customShadowBlur`)
- **CSS**: Usar kebab-case (`custom-shadow-blur`)
- **Base de datos**: Usar snake_case (`custom_shadow_blur`)

### 2. Estructura de Datos

```javascript
// Patrón para nuevas opciones
const newOption = {
    // Valor principal
    value: $('#new-option-value').val() || 'default',
    
    // Opacidad (si aplica)
    opacity: $('#new-option-opacity').val() || '1',
    
    // Color (si aplica)
    color: $('#new-option-color').val() || '#000000',
    
    // Configuraciones adicionales
    enabled: $('#new-option-enabled').is(':checked'),
    size: $('#new-option-size').val() || 'medium'
};
```

### 3. Función Helper para Opacidad

Siempre usar la función `applyOpacity()` para colores con opacidad:

```javascript
const applyOpacity = (color, opacity) => {
    if (opacity === '1' || opacity === 1) return color;
    
    // Convertir hex a rgba
    if (color.startsWith('#')) {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    
    // Si ya es rgba/rgb, intentar modificar la opacidad
    if (color.startsWith('rgba(')) {
        return color.replace(/,\s*[\d.]+\)$/, `, ${opacity})`);
    } else if (color.startsWith('rgb(')) {
        return color.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`);
    }
    
    return color; // Fallback
};
```

### 4. Uso de !important

Para garantizar que los estilos se apliquen en la previsualización:

```javascript
// ✅ CORRECTO: Usar !important para estilos críticos
style="background: ${styles.backgroundColor} !important;"

// ❌ INCORRECTO: Sin !important puede no aplicarse
style="background: ${styles.backgroundColor};"
```

### 5. Event Listeners con Namespace

Siempre usar namespace único para evitar conflictos:

```javascript
const ns = '.preview-' + this.formBuilder.instanceId;
$(document).on('input' + ns, '#new-field', callback);
```

### 6. Debounce para Performance

Usar debounce para eventos que se disparan frecuentemente:

```javascript
$(document).on('input' + ns, '#frequent-field', (e) => {
    if (this.isEnabled && this.currentContext === 'style') {
        this.debounceUpdate('style-frequent-field', () => {
            this.updateStylePreview();
        });
    }
});
```

## Checklist de Implementación

### ✅ Antes de Implementar
- [ ] Definir la funcionalidad y comportamiento esperado
- [ ] Elegir nombres consistentes para campos y variables
- [ ] Determinar valores por defecto apropiados
- [ ] Planificar la estructura de datos

### ✅ Durante la Implementación
- [ ] Añadir campos HTML con IDs únicos
- [ ] Actualizar `getFormStyles()` en PreviewManager
- [ ] Actualizar funciones de renderizado con nuevos estilos
- [ ] Añadir event listeners en PreviewManager
- [ ] Sincronizar `updatePreviewStyles()` en FormBuilderCore
- [ ] Añadir event listeners en FormBuilderCore
- [ ] Actualizar funciones de guardado y carga

### ✅ Después de Implementar
- [ ] Probar la previsualización en tiempo real
- [ ] Verificar que se guarden y carguen correctamente
- [ ] Probar con diferentes valores y casos extremos
- [ ] Verificar compatibilidad con otros estilos
- [ ] Documentar la nueva funcionalidad

## Casos de Uso Comunes

### 1. Nueva Opción de Color con Opacidad

```javascript
// HTML
<input type="text" id="new-color" class="sfq-color-picker" value="#ff0000">
<input type="range" id="new-color-opacity" class="sfq-opacity-control" 
       min="0" max="1" step="0.1" value="1" data-for="new-color">

// JavaScript
const newColor = $('#new-color').val() || '#ff0000';
const newColorOpacity = $('#new-color-opacity').val() || '1';

return {
    newColor: applyOpacity(newColor, newColorOpacity)
};
```

### 2. Nueva Opción de Tamaño

```javascript
// HTML
<input type="range" id="new-size" min="10" max="50" value="16">

// JavaScript
const newSize = $('#new-size').val() || '16';

return {
    newSize: newSize + 'px'
};
```

### 3. Nueva Opción Booleana

```javascript
// HTML
<input type="checkbox" id="new-feature-enabled">

// JavaScript
const newFeatureEnabled = $('#new-feature-enabled').is(':checked');

return {
    newFeatureEnabled: newFeatureEnabled
};
```

## Troubleshooting

### Problema: Los estilos no se aplican en la previsualización
**Solución**: Añadir `!important` a los estilos críticos

### Problema: Los eventos no se disparan
**Solución**: Verificar que se use el namespace correcto y que los IDs coincidan

### Problema: Los valores no se guardan
**Solución**: Verificar que se incluyan en `collectFormData()` y `populateFormData()`

### Problema: La previsualización no se actualiza
**Solución**: Verificar que se llame a `updateStylePreview()` en los event listeners

## Conclusión

Siguiendo esta guía, podrás implementar nuevas opciones de estilo que se reflejen correctamente en el sistema de previsualización. La clave está en mantener la sincronización entre PreviewManager y FormBuilderCore, usar nomenclatura consistente y aplicar los patrones establecidos.

Para cualquier duda o caso especial, consulta las implementaciones existentes de imagen de fondo, opacidades y overlay como referencia.
