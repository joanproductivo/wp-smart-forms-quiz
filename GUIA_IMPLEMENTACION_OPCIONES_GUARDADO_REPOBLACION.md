# Guía Completa: Implementación de Opciones con Guardado y Repoblación Correcta

## 📋 Índice
1. [Introducción](#introducción)
2. [Checklist de Implementación](#checklist-de-implementación)
3. [Tipos de Datos y Validación](#tipos-de-datos-y-validación)
4. [Implementación Paso a Paso](#implementación-paso-a-paso)
5. [Patrones Comunes](#patrones-comunes)
6. [Errores Frecuentes y Soluciones](#errores-frecuentes-y-soluciones)
7. [Testing y Verificación](#testing-y-verificación)
8. [Ejemplos Completos](#ejemplos-completos)

---

## Introducción

Esta guía asegura que **TODAS** las nuevas opciones se implementen correctamente con guardado y repoblación automática. Sigue estos pasos **SIEMPRE** para evitar problemas como el del fondo animado con gradiente.

### ⚠️ Problema Principal Identificado
**Los valores booleanos se guardan correctamente pero no se repueblan** porque:
- PHP guarda: `true` (boolean)
- JavaScript recibe: `"true"` (string)
- Comparación falla: `"true" === true` → `false`

---

## Checklist de Implementación

### ✅ Lista de Verificación Obligatoria

**Antes de implementar cualquier nueva opción:**

- [ ] **1. HTML**: ¿Tiene inicialización PHP correcta?
- [ ] **2. JavaScript**: ¿Usa `normalizeBoolean()` para booleans?
- [ ] **3. Guardado**: ¿Se incluye en `collectStyleSettings()` o `collectSettings()`?
- [ ] **4. Repoblación**: ¿Se incluye en `populateStyleSettings()` o `populateSettings()`?
- [ ] **5. Contenedores**: ¿Los contenedores dependientes se muestran/ocultan correctamente?
- [ ] **6. Eventos**: ¿Los eventos están vinculados correctamente?
- [ ] **7. Validación**: ¿Se valida en backend si es necesario?
- [ ] **8. Testing**: ¿Se ha probado guardar, recargar y verificar?

---

## Tipos de Datos y Validación

### 🔢 Tipos de Datos Soportados

| Tipo | HTML Input | PHP Guardado | JS Recibido | Normalización |
|------|------------|--------------|-------------|---------------|
| **Boolean** | `checkbox` | `true/false` | `"true"/"false"` | `normalizeBoolean()` |
| **String** | `text/textarea` | `"texto"` | `"texto"` | `sanitizeText()` |
| **Number** | `number/range` | `123` | `"123"` | `parseInt()/parseFloat()` |
| **Color** | `color` | `"#ff0000"` | `"#ff0000"` | `validateColor()` |
| **URL** | `url` | `"https://..."` | `"https://..."` | `validateUrl()` |
| **Select** | `select` | `"option"` | `"option"` | Validar opciones |

### 🛡️ Métodos de Normalización Disponibles

```javascript
// En DataValidator.js
this.dataValidator.normalizeBoolean(value)    // Para checkboxes
this.dataValidator.sanitizeText(value)        // Para texto
this.dataValidator.validateEmail(value)       // Para emails
this.dataValidator.validateUrl(value)         // Para URLs
```

---

## Implementación Paso a Paso

### 📝 Paso 1: HTML con Inicialización PHP

**✅ CORRECTO - Checkbox con inicialización:**
```php
<input type="checkbox" id="mi-nueva-opcion" 
       <?php echo ($form && isset($form->style_settings['mi_nueva_opcion']) && $form->style_settings['mi_nueva_opcion']) ? 'checked' : ''; ?>>
```

**❌ INCORRECTO - Sin inicialización:**
```php
<input type="checkbox" id="mi-nueva-opcion">
```

**✅ CORRECTO - Input de texto con valor:**
```php
<input type="text" id="mi-texto" 
       value="<?php echo $form && isset($form->style_settings['mi_texto']) ? esc_attr($form->style_settings['mi_texto']) : 'valor_por_defecto'; ?>">
```

**✅ CORRECTO - Select con opción seleccionada:**
```php
<select id="mi-select">
    <option value="opcion1" <?php echo ($form && isset($form->style_settings['mi_select']) && $form->style_settings['mi_select'] === 'opcion1') ? 'selected' : ''; ?>>Opción 1</option>
    <option value="opcion2" <?php echo ($form && isset($form->style_settings['mi_select']) && $form->style_settings['mi_select'] === 'opcion2') ? 'selected' : ''; ?>>Opción 2</option>
</select>
```

### 📝 Paso 2: Contenedores Dependientes

**✅ CORRECTO - Contenedor que se muestra/oculta:**
```php
<div id="mi-contenedor-dependiente" style="<?php echo ($form && isset($form->style_settings['mi_nueva_opcion']) && $form->style_settings['mi_nueva_opcion']) ? '' : 'display: none;'; ?>">
    <!-- Contenido que depende del checkbox -->
</div>
```

### 📝 Paso 3: JavaScript - Guardado

**Añadir en `collectStyleSettings()` o `collectSettings()`:**

```javascript
// En FormBuilderCore.js - collectStyleSettings()
collectStyleSettings() {
    return {
        // ... otras opciones existentes
        
        // ✅ NUEVO: Añadir la nueva opción
        mi_nueva_opcion: $('#mi-nueva-opcion').is(':checked'),
        mi_texto: $('#mi-texto').val() || 'valor_por_defecto',
        mi_select: $('#mi-select').val() || 'opcion1',
        mi_numero: $('#mi-numero').val() || '0',
        mi_color: $('#mi-color').val() || '#ffffff'
    };
}
```

### 📝 Paso 4: JavaScript - Repoblación

**Añadir en `populateStyleSettings()` o `populateSettings()`:**

```javascript
// En FormBuilderCore.js - populateStyleSettings()
populateStyleSettings(styles) {
    // ... otras opciones existentes
    
    // ✅ NUEVO: Repoblar la nueva opción
    // CRÍTICO: Usar normalizeBoolean para checkboxes
    const miNuevaOpcionEnabled = this.dataValidator.normalizeBoolean(styles.mi_nueva_opcion);
    $('#mi-nueva-opcion').prop('checked', miNuevaOpcionEnabled);
    
    // Para otros tipos de datos
    $('#mi-texto').val(styles.mi_texto || 'valor_por_defecto');
    $('#mi-select').val(styles.mi_select || 'opcion1');
    $('#mi-numero').val(styles.mi_numero || '0');
    $('#mi-color').val(styles.mi_color || '#ffffff').trigger('change');
    
    // ✅ CRÍTICO: Mostrar/ocultar contenedores dependientes
    if (miNuevaOpcionEnabled) {
        $('#mi-contenedor-dependiente').show();
    } else {
        $('#mi-contenedor-dependiente').hide();
    }
}
```

### 📝 Paso 5: Eventos JavaScript

**Añadir eventos en `EventManager.js` o en el archivo correspondiente:**

```javascript
// Evento para checkbox principal
$('#mi-nueva-opcion').on('change', function() {
    const isChecked = $(this).is(':checked');
    
    // Mostrar/ocultar contenedor dependiente
    if (isChecked) {
        $('#mi-contenedor-dependiente').slideDown();
    } else {
        $('#mi-contenedor-dependiente').slideUp();
    }
    
    // Marcar formulario como modificado
    formBuilder.isDirty = true;
});

// Eventos para campos dependientes
$('#mi-texto, #mi-select, #mi-numero').on('input change', function() {
    formBuilder.isDirty = true;
});

// Evento especial para color pickers
$('#mi-color').wpColorPicker({
    change: function(event, ui) {
        formBuilder.isDirty = true;
    }
});
```

### 📝 Paso 6: Validación Backend (Opcional)

**Si necesitas validación en PHP, añadir en `class-sfq-database.php`:**

```php
// En process_style_settings()
private function process_style_settings($style_settings) {
    // ... validaciones existentes
    
    // ✅ NUEVO: Validar nueva opción
    case 'mi_nueva_opcion':
        $processed_settings[$key] = (bool) $value;
        break;
    
    case 'mi_texto':
        $processed_settings[$key] = sanitize_text_field($value);
        break;
    
    case 'mi_color':
        $processed_settings[$key] = $this->validate_color($value);
        break;
    
    case 'mi_numero':
        $processed_settings[$key] = max(0, intval($value));
        break;
}
```

---

## Patrones Comunes

### 🎨 Patrón: Checkbox con Contenedor Dependiente

```php
<!-- HTML -->
<label>
    <input type="checkbox" id="activar-funcion" 
           <?php echo ($form && isset($form->style_settings['activar_funcion']) && $form->style_settings['activar_funcion']) ? 'checked' : ''; ?>>
    Activar función
</label>

<div id="contenedor-funcion" style="<?php echo ($form && isset($form->style_settings['activar_funcion']) && $form->style_settings['activar_funcion']) ? '' : 'display: none;'; ?>">
    <!-- Opciones que dependen del checkbox -->
</div>
```

```javascript
// JavaScript - Guardado
activar_funcion: $('#activar-funcion').is(':checked'),

// JavaScript - Repoblación
const funcionEnabled = this.dataValidator.normalizeBoolean(styles.activar_funcion);
$('#activar-funcion').prop('checked', funcionEnabled);

if (funcionEnabled) {
    $('#contenedor-funcion').show();
} else {
    $('#contenedor-funcion').hide();
}

// JavaScript - Eventos
$('#activar-funcion').on('change', function() {
    const isChecked = $(this).is(':checked');
    $('#contenedor-funcion').toggle(isChecked);
    formBuilder.isDirty = true;
});
```

### 🎨 Patrón: Color Picker con Opacidad

```php
<!-- HTML -->
<label>Color Principal</label>
<input type="text" id="color-principal" class="sfq-color-picker" 
       value="<?php echo $form && isset($form->style_settings['color_principal']) ? esc_attr($form->style_settings['color_principal']) : '#007cba'; ?>">

<label>Opacidad</label>
<input type="range" id="color-principal-opacity" min="0" max="1" step="0.01" 
       value="<?php echo $form && isset($form->style_settings['color_principal_opacity']) ? esc_attr($form->style_settings['color_principal_opacity']) : '1'; ?>">
<span class="opacity-value">100%</span>
```

```javascript
// JavaScript - Guardado
color_principal: $('#color-principal').val() || '#007cba',
color_principal_opacity: $('#color-principal-opacity').val() || '1',

// JavaScript - Repoblación
$('#color-principal').val(styles.color_principal || '#007cba').trigger('change');
$('#color-principal-opacity').val(styles.color_principal_opacity || '1');
$('.opacity-value').text(Math.round((styles.color_principal_opacity || 1) * 100) + '%');

// JavaScript - Eventos
$('#color-principal').wpColorPicker({
    change: function(event, ui) {
        formBuilder.isDirty = true;
    }
});

$('#color-principal-opacity').on('input', function() {
    const value = $(this).val();
    $('.opacity-value').text(Math.round(value * 100) + '%');
    formBuilder.isDirty = true;
});
```

### 🎨 Patrón: Range Slider con Valor Mostrado

```php
<!-- HTML -->
<label>Tamaño del Elemento</label>
<input type="range" id="tamano-elemento" min="10" max="100" 
       value="<?php echo $form && isset($form->style_settings['tamano_elemento']) ? esc_attr($form->style_settings['tamano_elemento']) : '50'; ?>">
<span class="tamano-value">50px</span>
```

```javascript
// JavaScript - Guardado
tamano_elemento: $('#tamano-elemento').val() || '50',

// JavaScript - Repoblación
$('#tamano-elemento').val(styles.tamano_elemento || '50');
$('.tamano-value').text((styles.tamano_elemento || '50') + 'px');

// JavaScript - Eventos
$('#tamano-elemento').on('input', function() {
    const value = $(this).val();
    $('.tamano-value').text(value + 'px');
    formBuilder.isDirty = true;
});
```

---

## Errores Frecuentes y Soluciones

### ❌ Error 1: Checkbox no se marca al recargar

**Problema:**
```javascript
// ❌ INCORRECTO
$('#mi-checkbox').prop('checked', styles.mi_opcion === true);
```

**Solución:**
```javascript
// ✅ CORRECTO
const miOpcionEnabled = this.dataValidator.normalizeBoolean(styles.mi_opcion);
$('#mi-checkbox').prop('checked', miOpcionEnabled);
```

### ❌ Error 2: Contenedor no se muestra/oculta

**Problema:**
```php
<!-- ❌ INCORRECTO - Sin inicialización PHP -->
<div id="mi-contenedor" style="display: none;">
```

**Solución:**
```php
<!-- ✅ CORRECTO - Con inicialización PHP -->
<div id="mi-contenedor" style="<?php echo ($form && isset($form->style_settings['mi_opcion']) && $form->style_settings['mi_opcion']) ? '' : 'display: none;'; ?>">
```

### ❌ Error 3: Valores no se guardan

**Problema:**
```javascript
// ❌ INCORRECTO - Olvidar añadir en collectStyleSettings
collectStyleSettings() {
    return {
        primary_color: $('#primary-color').val(),
        // Falta mi_nueva_opcion
    };
}
```

**Solución:**
```javascript
// ✅ CORRECTO - Incluir TODAS las opciones
collectStyleSettings() {
    return {
        primary_color: $('#primary-color').val(),
        mi_nueva_opcion: $('#mi-nueva-opcion').is(':checked'), // ✅ Añadido
    };
}
```

### ❌ Error 4: Color picker no se inicializa

**Problema:**
```javascript
// ❌ INCORRECTO - Sin trigger('change')
$('#mi-color').val(styles.mi_color || '#ffffff');
```

**Solución:**
```javascript
// ✅ CORRECTO - Con trigger('change') para inicializar color picker
$('#mi-color').val(styles.mi_color || '#ffffff').trigger('change');
```

### ❌ Error 5: Eventos no funcionan en elementos dinámicos

**Problema:**
```javascript
// ❌ INCORRECTO - Binding directo
$('.mi-clase').on('click', function() { ... });
```

**Solución:**
```javascript
// ✅ CORRECTO - Event delegation
$(document).on('click', '.mi-clase', function() { ... });
```

---

## Testing y Verificación

### 🧪 Lista de Pruebas Obligatorias

**Para cada nueva opción implementada:**

1. **✅ Prueba de Guardado:**
   - Cambiar el valor de la opción
   - Guardar el formulario
   - Verificar en la base de datos que se guardó correctamente

2. **✅ Prueba de Repoblación:**
   - Recargar la página
   - Verificar que la opción mantiene su valor
   - Verificar que los contenedores dependientes se muestran/ocultan correctamente

3. **✅ Prueba de Eventos:**
   - Cambiar la opción
   - Verificar que los eventos se disparan correctamente
   - Verificar que `formBuilder.isDirty = true` se establece

4. **✅ Prueba de Validación:**
   - Introducir valores inválidos
   - Verificar que se validan correctamente
   - Verificar que se muestran mensajes de error apropiados

5. **✅ Prueba de Contenedores:**
   - Activar/desactivar opciones que controlan contenedores
   - Verificar que se muestran/ocultan con animaciones suaves
   - Verificar que el estado se mantiene al recargar

### 🔍 Herramientas de Debug

```javascript
// Añadir logs temporales para debugging
console.log('SFQ: Guardando mi_nueva_opcion:', $('#mi-nueva-opcion').is(':checked'));
console.log('SFQ: Repoblando mi_nueva_opcion:', styles.mi_nueva_opcion);
console.log('SFQ: Normalizado:', this.dataValidator.normalizeBoolean(styles.mi_nueva_opcion));
```

```php
// Añadir logs en PHP para debugging
error_log('SFQ: Guardando mi_nueva_opcion: ' . json_encode($style_settings['mi_nueva_opcion']));
```

---

## Ejemplos Completos

### 📋 Ejemplo 1: Checkbox Simple

**Implementación completa de un checkbox que activa/desactiva una función:**

```php
<!-- 1. HTML con inicialización PHP -->
<div class="sfq-field-group">
    <label>
        <input type="checkbox" id="activar-modo-oscuro" 
               <?php echo ($form && isset($form->style_settings['activar_modo_oscuro']) && $form->style_settings['activar_modo_oscuro']) ? 'checked' : ''; ?>>
        Activar modo oscuro
    </label>
    <p class="description">Cambia la apariencia del formulario a colores oscuros</p>
</div>
```

```javascript
// 2. JavaScript - Guardado (en collectStyleSettings)
activar_modo_oscuro: $('#activar-modo-oscuro').is(':checked'),

// 3. JavaScript - Repoblación (en populateStyleSettings)
const modoOscuroEnabled = this.dataValidator.normalizeBoolean(styles.activar_modo_oscuro);
$('#activar-modo-oscuro').prop('checked', modoOscuroEnabled);

// 4. JavaScript - Eventos (en EventManager o init)
$('#activar-modo-oscuro').on('change', function() {
    const isChecked = $(this).is(':checked');
    
    // Aplicar cambios visuales inmediatos si es necesario
    if (isChecked) {
        $('body').addClass('modo-oscuro');
    } else {
        $('body').removeClass('modo-oscuro');
    }
    
    // Marcar como modificado
    formBuilder.isDirty = true;
});
```

### 📋 Ejemplo 2: Checkbox con Contenedor de Opciones

**Implementación completa de un checkbox que muestra/oculta opciones adicionales:**

```php
<!-- 1. HTML con inicialización PHP -->
<div class="sfq-field-group">
    <label>
        <input type="checkbox" id="personalizar-botones" 
               <?php echo ($form && isset($form->style_settings['personalizar_botones']) && $form->style_settings['personalizar_botones']) ? 'checked' : ''; ?>>
        Personalizar botones
    </label>
    <p class="description">Permite configurar colores y estilos de los botones</p>
</div>

<!-- Contenedor dependiente -->
<div id="opciones-botones" class="sfq-field-group" style="<?php echo ($form && isset($form->style_settings['personalizar_botones']) && $form->style_settings['personalizar_botones']) ? '' : 'display: none;'; ?> margin-left: 20px; padding: 15px; background: #f8f9fa; border-radius: 6px;">
    <h4>Configuración de Botones</h4>
    
    <div class="sfq-field-group">
        <label>Color de fondo del botón</label>
        <input type="text" id="boton-bg-color" class="sfq-color-picker" 
               value="<?php echo $form && isset($form->style_settings['boton_bg_color']) ? esc_attr($form->style_settings['boton_bg_color']) : '#007cba'; ?>">
    </div>
    
    <div class="sfq-field-group">
        <label>Color del texto del botón</label>
        <input type="text" id="boton-text-color" class="sfq-color-picker" 
               value="<?php echo $form && isset($form->style_settings['boton_text_color']) ? esc_attr($form->style_settings['boton_text_color']) : '#ffffff'; ?>">
    </div>
    
    <div class="sfq-field-group">
        <label>Radio de bordes del botón</label>
        <input type="range" id="boton-border-radius" min="0" max="50" 
               value="<?php echo $form && isset($form->style_settings['boton_border_radius']) ? esc_attr($form->style_settings['boton_border_radius']) : '6'; ?>">
        <span class="boton-radius-value">6px</span>
    </div>
</div>
```

```javascript
// 2. JavaScript - Guardado (en collectStyleSettings)
personalizar_botones: $('#personalizar-botones').is(':checked'),
boton_bg_color: $('#boton-bg-color').val() || '#007cba',
boton_text_color: $('#boton-text-color').val() || '#ffffff',
boton_border_radius: $('#boton-border-radius').val() || '6',

// 3. JavaScript - Repoblación (en populateStyleSettings)
const personalizarBotonesEnabled = this.dataValidator.normalizeBoolean(styles.personalizar_botones);
$('#personalizar-botones').prop('checked', personalizarBotonesEnabled);

// Repoblar opciones dependientes
$('#boton-bg-color').val(styles.boton_bg_color || '#007cba').trigger('change');
$('#boton-text-color').val(styles.boton_text_color || '#ffffff').trigger('change');
$('#boton-border-radius').val(styles.boton_border_radius || '6');
$('.boton-radius-value').text((styles.boton_border_radius || '6') + 'px');

// Mostrar/ocultar contenedor dependiente
if (personalizarBotonesEnabled) {
    $('#opciones-botones').show();
} else {
    $('#opciones-botones').hide();
}

// 4. JavaScript - Eventos (en EventManager o init)
$('#personalizar-botones').on('change', function() {
    const isChecked = $(this).is(':checked');
    
    if (isChecked) {
        $('#opciones-botones').slideDown(300);
    } else {
        $('#opciones-botones').slideUp(300);
    }
    
    formBuilder.isDirty = true;
});

// Eventos para opciones dependientes
$('#boton-bg-color, #boton-text-color').wpColorPicker({
    change: function(event, ui) {
        formBuilder.isDirty = true;
        // Aplicar cambios en tiempo real si es necesario
        formBuilder.updatePreviewStyles();
    }
});

$('#boton-border-radius').on('input', function() {
    const value = $(this).val();
    $('.boton-radius-value').text(value + 'px');
    formBuilder.isDirty = true;
    formBuilder.updatePreviewStyles();
});
```

### 📋 Ejemplo 3: Select con Opciones Dinámicas

**Implementación completa de un select que cambia opciones disponibles:**

```php
<!-- 1. HTML con inicialización PHP -->
<div class="sfq-field-group">
    <label>Tipo de animación</label>
    <select id="tipo-animacion" class="sfq-select">
        <option value="ninguna" <?php echo ($form && isset($form->style_settings['tipo_animacion']) && $form->style_settings['tipo_animacion'] === 'ninguna') ? 'selected' : ''; ?>>Sin animación</option>
        <option value="fade" <?php echo ($form && isset($form->style_settings['tipo_animacion']) && $form->style_settings['tipo_animacion'] === 'fade') ? 'selected' : ''; ?>>Fade</option>
        <option value="slide" <?php echo ($form && isset($form->style_settings['tipo_animacion']) && $form->style_settings['tipo_animacion'] === 'slide') ? 'selected' : ''; ?>>Slide</option>
        <option value="bounce" <?php echo ($form && isset($form->style_settings['tipo_animacion']) && $form->style_settings['tipo_animacion'] === 'bounce') ? 'selected' : ''; ?>>Bounce</option>
    </select>
</div>

<!-- Contenedor para opciones de animación -->
<div id="opciones-animacion" class="sfq-field-group" style="<?php echo ($form && isset($form->style_settings['tipo_animacion']) && $form->style_settings['tipo_animacion'] !== 'ninguna') ? '' : 'display: none;'; ?>">
    <label>Duración de la animación (ms)</label>
    <input type="number" id="duracion-animacion" min="100" max="3000" step="100" 
           value="<?php echo $form && isset($form->style_settings['duracion_animacion']) ? esc_attr($form->style_settings['duracion_animacion']) : '300'; ?>">
</div>
```

```javascript
// 2. JavaScript - Guardado (en collectStyleSettings)
tipo_animacion: $('#tipo-animacion').val() || 'ninguna',
duracion_animacion: $('#duracion-animacion').val() || '300',

// 3. JavaScript - Repoblación (en populateStyleSettings)
$('#tipo-animacion').val(styles.tipo_animacion || 'ninguna');
$('#duracion-animacion').val(styles.duracion_animacion || '300');

// Mostrar/ocultar opciones de animación
if (styles.tipo_animacion && styles.tipo_animacion !== 'ninguna') {
    $('#opciones-animacion').show();
} else {
    $('#opciones-animacion').hide();
}

// 4. JavaScript - Eventos (en EventManager o init)
$('#tipo-animacion').on('change', function() {
    const tipoSeleccionado = $(this).val();
    
    if (tipoSeleccionado !== 'ninguna') {
        $('#opciones-animacion').slideDown(300);
    } else {
        $('#opciones-animacion').slideUp(300);
    }
    
    formBuilder.isDirty = true;
});

$('#duracion-animacion').on('input', function() {
    formBuilder.isDirty = true;
});
```

---

## 🎯 Resumen Final

### ✅ Reglas de Oro

1. **SIEMPRE** inicializar valores en PHP
2. **SIEMPRE** usar `normalizeBoolean()` para checkboxes en JavaScript
3. **SIEMPRE** incluir en `collectStyleSettings()` y `populateStyleSettings()`
4. **SIEMPRE** manejar contenedores dependientes en PHP y JavaScript
5. **SIEMPRE** añadir eventos para marcar `isDirty = true`
6. **SIEMPRE** probar guardado y repoblación antes de dar por terminado

### 🚨 Señales de Alerta

Si encuentras estos problemas, revisa la implementación:

- ❌ Checkbox no se marca al recargar
- ❌ Contenedor no se muestra/oculta correctamente
- ❌ Valores no se guardan en la base de datos
- ❌ Color picker no se inicializa
- ❌ Eventos no funcionan después de recargar

### 📚 Archivos Clave

- **HTML**: `includes/class-sfq-admin.php`
- **JavaScript Guardado**: `assets/js/admin-builder-v2/core/FormBuilderCore.js` → `collectStyleSettings()`
- **JavaScript Repoblación**: `assets/js/admin-builder-v2/core/FormBuilderCore.js` → `populateStyleSettings()`
- **JavaScript Eventos**: `assets/js/admin-builder-v2/managers/EventManager.js`
- **Validación Backend**: `includes/class-sfq-database.php` → `process_style_settings()`

---

**🎉 ¡Siguiendo esta guía, NUNCA más tendrás problemas de guardado y repoblación!**

*Última actualización: Diciembre 2024*
