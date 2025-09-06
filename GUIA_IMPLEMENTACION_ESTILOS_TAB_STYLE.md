# Guía para Implementar Nuevos Estilos en Tab-Style

Esta guía explica el proceso completo para añadir nuevos estilos, colores y opciones de diseño en la pestaña "Estilo" del constructor de formularios, asegurando que funcionen correctamente tanto en la previsualización como en el formulario real.

## 📋 Índice

1. [Flujo de Implementación](#flujo-de-implementación)
2. [Paso 1: JavaScript (Admin Builder)](#paso-1-javascript-admin-builder)
3. [Paso 2: Backend PHP (Frontend Class)](#paso-2-backend-php-frontend-class)
4. [Paso 3: CSS Frontend](#paso-3-css-frontend)
5. [Ejemplos Prácticos](#ejemplos-prácticos)
6. [Tipos de Estilos Comunes](#tipos-de-estilos-comunes)
7. [Mejores Prácticas](#mejores-prácticas)
8. [Solución de Problemas](#solución-de-problemas)

## 🔄 Flujo de Implementación

```
1. JavaScript (admin-builder-v2.js)
   ↓ Guarda configuración en style_settings
   
2. PHP (class-sfq-frontend.php)
   ↓ Lee style_settings y genera variables CSS
   
3. CSS (frontend.css)
   ↓ Usa variables CSS para aplicar estilos
   
4. Formulario Real
   ✅ Estilos aplicados correctamente
```

## 🎯 Paso 1: JavaScript (Admin Builder)

**Archivo:** `assets/js/admin-builder-v2.js`

### 1.1 Añadir el Control en la Interfaz

Busca la sección `sfq-tab-content active` y añade tu nuevo control:

```javascript
// Ejemplo: Añadir control de color de borde
<div class="sfq-style-group">
    <label>Color de Borde de Opciones</label>
    <input type="color" 
           id="options-border-color" 
           value="#e0e0e0">
</div>
```

### 1.2 Añadir Event Listener

En la función `initStyleControls()`, añade el listener:

```javascript
// Event listener para color de borde de opciones
$('#options-border-color').on('input', function() {
    const color = $(this).val();
    
    // Aplicar en preview inmediatamente
    $('.sfq-option-card').css('border-color', color);
    
    // Guardar en configuración
    if (currentFormData.style_settings) {
        currentFormData.style_settings.options_border_color = color;
        saveFormData();
    }
});
```

### 1.3 Cargar Valores Existentes

En la función `loadStyleSettings()`, añade la carga del valor:

```javascript
function loadStyleSettings(styleSettings) {
    // ... otros estilos ...
    
    // Cargar color de borde de opciones
    if (styleSettings.options_border_color) {
        $('#options-border-color').val(styleSettings.options_border_color);
        $('.sfq-option-card').css('border-color', styleSettings.options_border_color);
    }
}
```

## 🔧 Paso 2: Backend PHP (Frontend Class)

**Archivo:** `includes/class-sfq-frontend.php`

### 2.1 Añadir Variable CSS

En la función `render_form()`, dentro del bloque de estilos personalizados:

```php
<style>
    #sfq-form-<?php echo $form_id; ?> {
        /* Variables existentes */
        --sfq-primary-color: <?php echo esc_attr($styles['primary_color'] ?? '#007cba'); ?>;
        
        /* NUEVA VARIABLE - Seguir este patrón exacto */
        --sfq-options-border-color: <?php echo esc_attr($styles['options_border_color'] ?? '#e0e0e0'); ?>;
    }
    
    /* APLICAR LA VARIABLE - Muy importante usar !important */
    #sfq-form-<?php echo $form_id; ?> .sfq-option-card {
        border-color: var(--sfq-options-border-color) !important;
    }
</style>
```

### 2.2 Patrón para Estilos Condicionales

Para estilos que se activan/desactivan:

```php
<?php if (!empty($styles['enable_custom_shadows'])) : ?>
#sfq-form-<?php echo $form_id; ?> .sfq-option-card {
    box-shadow: <?php echo esc_attr($styles['custom_shadow_value'] ?? '0 2px 8px rgba(0,0,0,0.1)'); ?> !important;
}
<?php else : ?>
#sfq-form-<?php echo $form_id; ?> .sfq-option-card {
    box-shadow: none !important;
}
<?php endif; ?>
```

### 2.3 Patrón para Valores con Unidades

```php
/* Para tamaños, márgenes, etc. */
--sfq-custom-spacing: <?php echo esc_attr($styles['custom_spacing'] ?? '16'); ?>px;
--sfq-custom-font-size: <?php echo esc_attr($styles['custom_font_size'] ?? '1'); ?>rem;
```

## 🎨 Paso 3: CSS Frontend

**Archivo:** `assets/css/frontend.css`

### 3.1 Definir Variables por Defecto

```css
/* Variables CSS personalizables */
.sfq-form-container {
    /* Variables existentes */
    --sfq-primary-color: #007cba;
    
    /* NUEVA VARIABLE CON VALOR POR DEFECTO */
    --sfq-options-border-color: #e0e0e0;
}
```

### 3.2 Aplicar Variables en Selectores

```css
/* Aplicar la variable en el elemento correspondiente */
.sfq-option-card {
    border: 2px solid var(--sfq-options-border-color);
    /* Otros estilos... */
}
```

## 💡 Ejemplos Prácticos

### Ejemplo 1: Color de Texto de Botones

**JavaScript:**
```javascript
// 1. HTML del control
<div class="sfq-style-group">
    <label>Color de Texto de Botones</label>
    <input type="color" id="button-text-color" value="#ffffff">
</div>

// 2. Event listener
$('#button-text-color').on('input', function() {
    const color = $(this).val();
    $('.sfq-button-primary').css('color', color);
    if (currentFormData.style_settings) {
        currentFormData.style_settings.button_text_color = color;
        saveFormData();
    }
});

// 3. Cargar valor
if (styleSettings.button_text_color) {
    $('#button-text-color').val(styleSettings.button_text_color);
    $('.sfq-button-primary').css('color', styleSettings.button_text_color);
}
```

**PHP:**
```php
/* Variable CSS */
--sfq-button-text-color: <?php echo esc_attr($styles['button_text_color'] ?? '#ffffff'); ?>;

/* Aplicar estilo */
#sfq-form-<?php echo $form_id; ?> .sfq-button-primary {
    color: var(--sfq-button-text-color) !important;
}
```

**CSS:**
```css
.sfq-form-container {
    --sfq-button-text-color: #ffffff;
}

.sfq-button-primary {
    color: var(--sfq-button-text-color);
    box-shadow: var(--sfq-shadow)
}
```

### Ejemplo 2: Espaciado Personalizado

**JavaScript:**
```javascript
// 1. HTML del control
<div class="sfq-style-group">
    <label>Espaciado entre Opciones</label>
    <input type="range" id="options-spacing" min="8" max="32" value="16">
    <span class="sfq-range-value">16px</span>
</div>

// 2. Event listener
$('#options-spacing').on('input', function() {
    const spacing = $(this).val();
    $('.sfq-range-value').text(spacing + 'px');
    $('.sfq-options-grid').css('gap', spacing + 'px');
    if (currentFormData.style_settings) {
        currentFormData.style_settings.options_spacing = spacing;
        saveFormData();
    }
});
```

**PHP:**
```php
--sfq-options-spacing: <?php echo esc_attr($styles['options_spacing'] ?? '16'); ?>px;

#sfq-form-<?php echo $form_id; ?> .sfq-options-grid {
    gap: var(--sfq-options-spacing) !important;
}
```

### Ejemplo 3: Checkbox con Estilo Condicional

**JavaScript:**
```javascript
// 1. HTML del control
<div class="sfq-style-group">
    <label>
        <input type="checkbox" id="enable-gradient-buttons"> 
        Activar Botones con Gradiente
    </label>
</div>

// 2. Event listener
$('#enable-gradient-buttons').on('change', function() {
    const enabled = $(this).is(':checked');
    if (enabled) {
        $('.sfq-button-primary').css('background', 'linear-gradient(135deg, #007cba, #005a8b)');
    } else {
        $('.sfq-button-primary').css('background', '');
    }
    if (currentFormData.style_settings) {
        currentFormData.style_settings.enable_gradient_buttons = enabled;
        saveFormData();
    }
});
```

**PHP:**
```php
<?php if (!empty($styles['enable_gradient_buttons'])) : ?>
#sfq-form-<?php echo $form_id; ?> .sfq-button-primary {
    background: linear-gradient(135deg, var(--sfq-primary-color), color-mix(in srgb, var(--sfq-primary-color) 80%, black)) !important;
}
<?php endif; ?>
```

## 🎛️ Tipos de Estilos Comunes

### 1. Colores
```javascript
// Control de color
<input type="color" id="element-color" value="#007cba">

// PHP
--sfq-element-color: <?php echo esc_attr($styles['element_color'] ?? '#007cba'); ?>;
```

### 2. Tamaños (con unidades)
```javascript
// Control de rango
<input type="range" id="element-size" min="12" max="48" value="16">

// PHP
--sfq-element-size: <?php echo esc_attr($styles['element_size'] ?? '16'); ?>px;
```

### 3. Selectores (dropdown)
```javascript
// Control select
<select id="text-align">
    <option value="left">Izquierda</option>
    <option value="center">Centro</option>
    <option value="right">Derecha</option>
</select>

// PHP
--sfq-text-align: <?php echo esc_attr($styles['text_align'] ?? 'left'); ?>;
```

### 4. Checkboxes (activar/desactivar)
```javascript
// Control checkbox
<input type="checkbox" id="enable-feature">

// PHP (condicional)
<?php if (!empty($styles['enable_feature'])) : ?>
    /* Estilos cuando está activado */
<?php else : ?>
    /* Estilos cuando está desactivado */
<?php endif; ?>
```

## ✅ Mejores Prácticas

### 1. Nomenclatura Consistente
```javascript
// Usar guiones para separar palabras
options_border_color     ✅
optionsBorderColor       ❌
options-border-color     ❌
```

### 2. Valores por Defecto
```php
// Siempre proporcionar valores por defecto
<?php echo esc_attr($styles['color'] ?? '#007cba'); ?>     ✅
<?php echo esc_attr($styles['color']); ?>                  ❌
```

### 3. Usar !important en PHP
```php
// En el PHP, usar !important para sobrescribir CSS base
border-color: var(--sfq-border-color) !important;    ✅
border-color: var(--sfq-border-color);               ❌
```

### 4. Escapar Valores
```php
// Siempre usar esc_attr() para valores dinámicos
<?php echo esc_attr($styles['value']); ?>    ✅
<?php echo $styles['value']; ?>              ❌
```

### 5. Validación de Entrada
```javascript
// Validar valores antes de aplicar
$('#color-input').on('input', function() {
    const color = $(this).val();
    if (/^#[0-9A-F]{6}$/i.test(color)) {  // Validar formato hex
        // Aplicar color
    }
});
```

## 🔧 Solución de Problemas

### Problema 1: Los estilos no se aplican en el formulario real
**Causa:** Falta la implementación en PHP
**Solución:** Verificar que la variable CSS esté definida en `class-sfq-frontend.php`

### Problema 2: Los estilos se aplican pero no se guardan
**Causa:** Falta el `saveFormData()` en el event listener
**Solución:** Añadir `saveFormData()` después de modificar `currentFormData.style_settings`

### Problema 3: Los valores no se cargan al editar formulario
**Causa:** Falta la carga en `loadStyleSettings()`
**Solución:** Añadir la carga del valor en la función correspondiente

### Problema 4: Los estilos no tienen prioridad
**Causa:** Falta `!important` en el CSS generado por PHP
**Solución:** Añadir `!important` a las propiedades CSS en PHP

### Problema 5: Valores con unidades incorrectas
**Causa:** No se especifica la unidad en PHP
**Solución:** Concatenar la unidad: `<?php echo esc_attr($value); ?>px`

### ⚠️ Problema 6: Selectores CSS Incorrectos (CRÍTICO)
**Causa:** Aplicar estilos al selector equivocado
**Ejemplo Problemático:**
```php
/* ❌ INCORRECTO - Aplicar ancho personalizado directamente */
#sfq-form-<?php echo $form_id; ?> .sfq-question-content {
    width: <?php echo esc_attr($styles['custom_width']); ?>px !important;
}
```

**Solución Correcta:**
```php
/* ✅ CORRECTO - Usar width: 100% y max-width personalizable */
#sfq-form-<?php echo $form_id; ?> .sfq-question-screen {
    width: 100% !important;
    max-width: <?php echo esc_attr($styles['custom_width']); ?>px !important;
    margin: 0 auto !important;
}
```

**Regla de Oro:** Para anchos personalizables, siempre usar `width: 100%` y controlar con `max-width`

### ⚠️ Problema 7: Aplicación Redundante de Estilos
**Causa:** Aplicar el mismo estilo a múltiples selectores innecesariamente
**Ejemplo Problemático:**
```php
/* ❌ INCORRECTO - Aplicación redundante */
#sfq-form-<?php echo $form_id; ?> .sfq-question-screen {
    max-width: <?php echo esc_attr($styles['custom_width']); ?>px !important;
}
#sfq-form-<?php echo $form_id; ?> .sfq-question-content {
    max-width: 100% !important; /* Redundante y confuso */
}
```

**Solución:** Aplicar estilos solo donde sean necesarios y lógicos

### ⚠️ Problema 8: Inconsistencia entre JavaScript y PHP
**Causa:** Los selectores en JavaScript no coinciden con los de PHP
**Ejemplo Problemático:**
```javascript
// ❌ JavaScript aplica a .sfq-question-content
$('.sfq-question-content').css('max-width', width + 'px');
```
```php
/* ❌ Pero PHP aplica a .sfq-question-screen */
#sfq-form-<?php echo $form_id; ?> .sfq-question-screen {
    max-width: <?php echo esc_attr($styles['custom_width']); ?>px !important;
}
```

**Solución:** Mantener consistencia absoluta entre JavaScript y PHP:
```javascript
// ✅ JavaScript y PHP usan el mismo selector
$('.sfq-question-screen').css('max-width', width + 'px');
```

## 🚨 Casos Específicos y Lecciones Aprendidas

### Caso 1: Anchos Personalizables - La Regla del 100%
**Problema:** Los anchos personalizables no funcionan correctamente cuando se aplica el valor directamente a `width`.

**Solución Correcta:**
```php
/* ✅ SIEMPRE usar este patrón para anchos personalizables */
#sfq-form-<?php echo $form_id; ?> .sfq-element {
    width: 100% !important;                    /* Siempre 100% */
    max-width: <?php echo esc_attr($styles['custom_width'] ?? '600'); ?>px !important;  /* Valor personalizable */
    margin: 0 auto !important;                 /* Centrar */
}
```

**JavaScript correspondiente:**
```javascript
// ✅ Mantener consistencia en JavaScript
$('.sfq-element').css({
    'width': '100%',
    'max-width': customWidth + 'px',
    'margin': '0 auto'
});
```

### Caso 2: Selectores Específicos vs Genéricos
**Problema:** Aplicar estilos a selectores demasiado genéricos o incorrectos.

**Reglas de Selectores:**
- `.sfq-question-screen` → Para el contenedor completo de la pregunta
- `.sfq-question-content` → Para el contenido interno (texto, opciones)
- `.sfq-option-card` → Para cada opción individual
- `.sfq-form-container` → Para el contenedor principal del formulario

**Ejemplo Correcto:**
```php
/* ✅ Aplicar ancho al contenedor correcto */
#sfq-form-<?php echo $form_id; ?> .sfq-question-screen {
    max-width: <?php echo esc_attr($styles['question_width']); ?>px !important;
}

/* ✅ Aplicar estilos de texto al elemento correcto */
#sfq-form-<?php echo $form_id; ?> .sfq-question-text {
    font-size: var(--sfq-question-text-size) !important;
}
```

### Caso 3: Variables CSS vs Valores Directos
**Cuándo usar Variables CSS:**
- ✅ Para valores que se reutilizan en múltiples lugares
- ✅ Para valores que pueden cambiar dinámicamente
- ✅ Para mantener consistencia en el tema

**Cuándo usar Valores Directos:**
- ✅ Para valores únicos y específicos
- ✅ Para estilos condicionales complejos

**Ejemplo:**
```php
/* ✅ Variable CSS para valores reutilizables */
--sfq-primary-color: <?php echo esc_attr($styles['primary_color']); ?>;

/* ✅ Valor directo para configuración específica */
<?php if ($styles['enable_shadows']) : ?>
box-shadow: 0 4px 20px rgba(0,0,0,0.1) !important;
<?php endif; ?>
```

### Caso 4: Orden de Aplicación de Estilos
**Orden Correcto en PHP:**
1. Definir variables CSS primero
2. Aplicar estilos que usan variables
3. Aplicar estilos condicionales al final

```php
<style>
    /* 1. Variables CSS */
    #sfq-form-<?php echo $form_id; ?> {
        --sfq-primary-color: <?php echo esc_attr($styles['primary_color']); ?>;
        --sfq-border-radius: <?php echo esc_attr($styles['border_radius']); ?>px;
    }
    
    /* 2. Estilos que usan variables */
    #sfq-form-<?php echo $form_id; ?> .sfq-option-card {
        border-radius: var(--sfq-border-radius) !important;
        background: var(--sfq-primary-color) !important;
    }
    
    /* 3. Estilos condicionales */
    <?php if ($styles['enable_shadows']) : ?>
    #sfq-form-<?php echo $form_id; ?> .sfq-option-card {
        box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
    }
    <?php endif; ?>
</style>
```

## 📝 Checklist de Implementación

Para cada nuevo estilo, verificar:

- [ ] ✅ Control HTML añadido en JavaScript
- [ ] ✅ Event listener implementado
- [ ] ✅ Función de carga en `loadStyleSettings()`
- [ ] ✅ Variable CSS definida en PHP
- [ ] ✅ Estilo aplicado con `!important` en PHP
- [ ] ✅ Variable por defecto en CSS
- [ ] ✅ Selector CSS correcto y específico
- [ ] ✅ Valores escapados con `esc_attr()`
- [ ] ✅ Valores por defecto proporcionados
- [ ] ✅ Consistencia entre JavaScript y PHP
- [ ] ✅ Prueba en previsualización
- [ ] ✅ Prueba en formulario real
- [ ] ✅ Prueba de guardado y carga
- [ ] ✅ Verificar que no hay aplicación redundante
- [ ] ✅ Comprobar que los selectores son los correctos

## 🎯 Ejemplo Completo: Color de Fondo de Navegación

### JavaScript (admin-builder-v2.js)
```javascript
// 1. HTML del control (en sfq-tab-content active)
<div class="sfq-style-group">
    <label>Color de Fondo de Navegación</label>
    <input type="color" id="navigation-bg-color" value="#f8f9fa">
</div>

// 2. Event listener (en initStyleControls())
$('#navigation-bg-color').on('input', function() {
    const color = $(this).val();
    $('.sfq-navigation').css('background-color', color);
    if (currentFormData.style_settings) {
        currentFormData.style_settings.navigation_bg_color = color;
        saveFormData();
    }
});

// 3. Cargar valor (en loadStyleSettings())
if (styleSettings.navigation_bg_color) {
    $('#navigation-bg-color').val(styleSettings.navigation_bg_color);
    $('.sfq-navigation').css('background-color', styleSettings.navigation_bg_color);
}
```

### PHP (class-sfq-frontend.php)
```php
<!-- En el bloque de estilos personalizados -->
<style>
    #sfq-form-<?php echo $form_id; ?> {
        /* Variables existentes */
        --sfq-primary-color: <?php echo esc_attr($styles['primary_color'] ?? '#007cba'); ?>;
        
        /* Nueva variable */
        --sfq-navigation-bg-color: <?php echo esc_attr($styles['navigation_bg_color'] ?? 'transparent'); ?>;
    }
    
    /* Aplicar estilo */
    #sfq-form-<?php echo $form_id; ?> .sfq-navigation {
        background-color: var(--sfq-navigation-bg-color) !important;
        padding: 1rem !important;
        border-radius: var(--sfq-border-radius) !important;
    }
</style>
```

### CSS (frontend.css)
```css
/* Variables CSS personalizables */
.sfq-form-container {
    /* Variables existentes */
    --sfq-primary-color: #007cba;
    
    /* Nueva variable con valor por defecto */
    --sfq-navigation-bg-color: transparent;
}

/* Aplicar variable */
.sfq-navigation {
    background-color: var(--sfq-navigation-bg-color);
    transition: var(--sfq-transition);
}
```

---

## 🎉 Conclusión

Siguiendo esta guía, podrás añadir cualquier nuevo estilo al tab-style de manera consistente y sin errores. El patrón es siempre el mismo:

1. **JavaScript**: Control + Event Listener + Carga
2. **PHP**: Variable CSS + Aplicación con !important
3. **CSS**: Variable por defecto + Selector

¡Recuerda siempre probar tanto en la previsualización como en el formulario real!
