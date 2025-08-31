# Guía de Implementación: Guardado de Campos en Smart Forms Quiz

Esta guía documenta el proceso completo para implementar el guardado de nuevos campos en el plugin Smart Forms Quiz, usando como ejemplo la implementación de la imagen de fondo.

## 📋 Índice

1. [Visión General del Sistema](#visión-general-del-sistema)
2. [Paso 1: Identificar los Campos a Guardar](#paso-1-identificar-los-campos-a-guardar)
3. [Paso 2: Modificar la Recopilación de Datos (JavaScript)](#paso-2-modificar-la-recopilación-de-datos-javascript)
4. [Paso 3: Implementar Validación en Base de Datos](#paso-3-implementar-validación-en-base-de-datos)
5. [Paso 4: Modificar la Carga de Datos](#paso-4-modificar-la-carga-de-datos)
6. [Paso 5: Implementar Event Handlers](#paso-5-implementar-event-handlers)
7. [Paso 6: Pruebas y Validación](#paso-6-pruebas-y-validación)
8. [Plantillas de Código Reutilizables](#plantillas-de-código-reutilizables)

---

## Visión General del Sistema

El sistema de guardado en Smart Forms Quiz sigue este flujo:

```
Frontend (JavaScript) → Recopilación → Validación → Base de Datos → Carga → Frontend
```

### Archivos Principales:
- **`assets/js/admin-builder-v2.js`**: Lógica del frontend y recopilación de datos
- **`includes/class-sfq-database.php`**: Validación y guardado en base de datos
- **`includes/class-sfq-admin.php`**: Interfaz de administración

---

## Paso 1: Identificar los Campos a Guardar

### 1.1 Análizar la Interfaz HTML

Primero, identifica todos los campos HTML que necesitas guardar:

```html
<!-- Ejemplo: Campos de imagen de fondo -->
<input type="url" id="background-image-url" class="sfq-input">
<input type="hidden" id="background-image-id" value="">
<input type="hidden" id="background-image-data" value="">
<select id="background-size" class="sfq-select">
<input type="range" id="background-opacity" min="0" max="1" step="0.1" value="1">
<input type="checkbox" id="background-overlay">
<input type="text" id="background-overlay-color" class="sfq-color-picker">
```

### 1.2 Crear Lista de Campos

Documenta cada campo con:
- **ID del elemento HTML**
- **Tipo de dato** (string, number, boolean, JSON)
- **Validación requerida**
- **Valor por defecto**

```javascript
// Ejemplo de documentación de campos
const camposImagenFondo = {
    background_image_url: { tipo: 'string', validacion: 'url_imagen', defecto: '' },
    background_image_id: { tipo: 'string', validacion: 'numerico', defecto: '' },
    background_image_data: { tipo: 'json', validacion: 'json_valido', defecto: '' },
    background_size: { tipo: 'string', validacion: 'enum', opciones: ['cover', 'contain', 'auto'], defecto: 'cover' },
    background_opacity: { tipo: 'number', validacion: 'rango_0_1', defecto: 1 },
    background_overlay: { tipo: 'boolean', validacion: 'booleano', defecto: false },
    background_overlay_color: { tipo: 'string', validacion: 'color_hex', defecto: '#000000' }
};
```

---

## Paso 2: Modificar la Recopilación de Datos (JavaScript)

### 2.1 Ubicar la Función `collectFormData()`

En `assets/js/admin-builder-v2.js`, busca la función `collectFormData()` dentro de la clase `FormBuilderCore`.

### 2.2 Añadir Campos al Objeto `style_settings`

```javascript
collectFormData() {
    return {
        // ... otros campos existentes ...
        style_settings: {
            // ... campos existentes ...
            
            // ✅ NUEVO: Añadir tus campos aquí
            background_image_url: $('#background-image-url').val() || '',
            background_image_id: $('#background-image-id').val() || '',
            background_image_data: $('#background-image-data').val() || '',
            background_size: $('#background-size').val() || 'cover',
            background_repeat: $('#background-repeat').val() || 'no-repeat',
            background_position: $('#background-position').val() || 'center center',
            background_attachment: $('#background-attachment').val() || 'scroll',
            background_opacity: $('#background-opacity').val() || '1',
            background_overlay: $('#background-overlay').is(':checked'),
            background_overlay_color: $('#background-overlay-color').val() || '#000000',
            background_overlay_opacity: $('#background-overlay-opacity').val() || '0.3'
        }
    };
}
```

### 2.3 Plantilla para Diferentes Tipos de Campos

```javascript
// Para campos de texto simples
mi_campo_texto: $('#mi-campo-texto').val() || '',

// Para campos numéricos
mi_campo_numero: parseInt($('#mi-campo-numero').val()) || 0,

// Para checkboxes
mi_campo_checkbox: $('#mi-campo-checkbox').is(':checked'),

// Para selects/dropdowns
mi_campo_select: $('#mi-campo-select').val() || 'valor_defecto',

// Para campos de color
mi_campo_color: $('#mi-campo-color').val() || '#ffffff',

// Para campos de rango/slider
mi_campo_rango: parseFloat($('#mi-campo-rango').val()) || 1.0,

// Para arrays/JSON complejos
mi_campo_json: JSON.stringify(miObjetoComplejo) || '{}',
```

---

## Paso 3: Implementar Validación en Base de Datos

### 3.1 Ubicar el Método `save_form()`

En `includes/class-sfq-database.php`, busca el método `save_form()`.

### 3.2 Crear Método de Procesamiento Específico

```php
/**
 * Procesar y validar configuraciones de [TU_FUNCIONALIDAD]
 */
private function process_mi_funcionalidad_settings($settings) {
    $processed = array();
    
    // Campo de texto con validación de URL
    if (isset($settings['mi_campo_url'])) {
        $url = sanitize_url($settings['mi_campo_url']);
        if (empty($url) || $this->validate_image_url($url)) {
            $processed['mi_campo_url'] = $url;
        }
    }
    
    // Campo numérico con rango
    if (isset($settings['mi_campo_numero'])) {
        $numero = floatval($settings['mi_campo_numero']);
        $processed['mi_campo_numero'] = max(0, min(100, $numero)); // Rango 0-100
    }
    
    // Campo booleano
    if (isset($settings['mi_campo_checkbox'])) {
        $processed['mi_campo_checkbox'] = (bool) $settings['mi_campo_checkbox'];
    }
    
    // Campo de color hexadecimal
    if (isset($settings['mi_campo_color'])) {
        $color = sanitize_text_field($settings['mi_campo_color']);
        if ($this->validate_color($color)) {
            $processed['mi_campo_color'] = $color;
        }
    }
    
    // Campo JSON
    if (isset($settings['mi_campo_json'])) {
        $json_data = $this->validate_json_data($settings['mi_campo_json']);
        if ($json_data !== false) {
            $processed['mi_campo_json'] = $json_data;
        }
    }
    
    return $processed;
}
```

### 3.3 Integrar en el Método Principal

```php
public function save_form($form_data) {
    // ... código existente ...
    
    // Procesar configuraciones de estilo existentes
    if (isset($form_data['style_settings'])) {
        $style_settings = $this->process_style_settings($form_data['style_settings']);
        
        // ✅ NUEVO: Procesar tu funcionalidad
        $mi_funcionalidad_settings = $this->process_mi_funcionalidad_settings($form_data['style_settings']);
        $style_settings = array_merge($style_settings, $mi_funcionalidad_settings);
    }
    
    // ... resto del código ...
}
```

### 3.4 Crear Métodos de Validación Específicos

```php
/**
 * Validar URL de imagen
 */
private function validate_image_url($url) {
    if (empty($url)) return true; // Permitir vacío
    
    // Validar formato de URL
    if (!filter_var($url, FILTER_VALIDATE_URL)) {
        return false;
    }
    
    // Validar extensión de imagen
    $valid_extensions = array('jpg', 'jpeg', 'png', 'gif', 'webp', 'svg');
    $extension = strtolower(pathinfo(parse_url($url, PHP_URL_PATH), PATHINFO_EXTENSION));
    
    return in_array($extension, $valid_extensions);
}

/**
 * Validar color hexadecimal
 */
private function validate_color($color) {
    return preg_match('/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/', $color);
}

/**
 * Validar y procesar datos JSON
 */
private function validate_json_data($json_string) {
    if (empty($json_string)) return '';
    
    $decoded = json_decode($json_string, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        return false;
    }
    
    // Validaciones específicas del JSON si es necesario
    return $json_string;
}

/**
 * Validar rango numérico
 */
private function validate_numeric_range($value, $min = 0, $max = 1) {
    $num = floatval($value);
    return max($min, min($max, $num));
}
```

---

## Paso 4: Modificar la Carga de Datos

### 4.1 Ubicar la Función `populateFormData()`

En `assets/js/admin-builder-v2.js`, busca la función `populateFormData()`.

### 4.2 Añadir Carga de Tus Campos

```javascript
populateFormData(formData) {
    // ... código existente ...
    
    // Style settings
    const styles = formData.style_settings || {};
    
    // ... campos existentes ...
    
    // ✅ NUEVO: Cargar tus campos
    $('#mi-campo-texto').val(styles.mi_campo_texto || '');
    $('#mi-campo-numero').val(styles.mi_campo_numero || 0);
    $('#mi-campo-checkbox').prop('checked', styles.mi_campo_checkbox === true);
    $('#mi-campo-select').val(styles.mi_campo_select || 'valor_defecto');
    $('#mi-campo-color').val(styles.mi_campo_color || '#ffffff').trigger('change');
    $('#mi-campo-rango').val(styles.mi_campo_rango || 1.0);
    $('.mi-campo-rango-value').text((styles.mi_campo_rango || 1.0) + 'px');
    
    // Para campos JSON complejos
    if (styles.mi_campo_json) {
        try {
            const jsonData = JSON.parse(styles.mi_campo_json);
            // Procesar y aplicar datos JSON
            this.aplicarDatosJSON(jsonData);
        } catch (e) {
            console.warn('Error parsing JSON data:', e);
        }
    }
    
    // Mostrar/ocultar elementos según configuración
    if (styles.mi_campo_checkbox === true) {
        $('#mi-seccion-dependiente').show();
    } else {
        $('#mi-seccion-dependiente').hide();
    }
}
```

### 4.3 Plantilla para Diferentes Tipos de Carga

```javascript
// Texto simple
$('#campo-id').val(styles.campo_nombre || 'valor_defecto');

// Número con validación
$('#campo-numero').val(Math.max(0, Math.min(100, styles.campo_numero || 50)));

// Checkbox
$('#campo-checkbox').prop('checked', styles.campo_checkbox === true);

// Select con validación de opciones
const valorSelect = styles.campo_select || 'defecto';
const opcionesValidas = ['opcion1', 'opcion2', 'opcion3'];
$('#campo-select').val(opcionesValidas.includes(valorSelect) ? valorSelect : 'defecto');

// Color picker (requiere trigger para actualizar UI)
$('#campo-color').val(styles.campo_color || '#ffffff').trigger('change');

// Range/slider con actualización de display
$('#campo-rango').val(styles.campo_rango || 1.0);
$('.campo-rango-display').text((styles.campo_rango || 1.0) + 'unidad');

// Mostrar preview o elementos dependientes
if (styles.campo_url && styles.campo_url.trim() !== '') {
    this.mostrarPreview(styles.campo_url);
    $('#opciones-avanzadas').show();
}
```

---

## Paso 5: Implementar Event Handlers

### 5.1 Ubicar la Función `bindGlobalEvents()`

En `assets/js/admin-builder-v2.js`, busca la función `bindGlobalEvents()`.

### 5.2 Añadir Event Listeners

```javascript
bindGlobalEvents() {
    const ns = '.' + this.instanceId; // Namespace único
    
    // ... eventos existentes ...
    
    // ✅ NUEVO: Event listeners para tus campos
    $('#mi-campo-texto, #mi-campo-numero, #mi-campo-select').off('change' + ns).on('change' + ns, () => {
        if (!this.isDestroyed) {
            this.isDirty = true;
            this.updatePreviewStyles(); // Si afecta al preview
        }
    });
    
    // Checkbox con lógica de mostrar/ocultar
    $('#mi-campo-checkbox').off('change' + ns).on('change' + ns, (e) => {
        const isChecked = $(e.target).is(':checked');
        if (isChecked) {
            $('#mi-seccion-dependiente').slideDown();
        } else {
            $('#mi-seccion-dependiente').slideUp();
        }
        
        if (!this.isDestroyed) {
            this.isDirty = true;
        }
    });
    
    // Range/slider con actualización en tiempo real
    $('#mi-campo-rango').off('input' + ns).on('input' + ns, function() {
        $('.mi-campo-rango-display').text($(this).val() + 'px');
        if (!this.isDestroyed) {
            this.isDirty = true;
            this.updatePreviewStyles();
        }
    });
    
    // Color picker
    $('#mi-campo-color').off('change' + ns).on('change' + ns, () => {
        if (!this.isDestroyed) {
            this.isDirty = true;
            this.updatePreviewStyles();
        }
    });
    
    // Eventos especiales (ej: botones, file uploads)
    $('#mi-boton-especial').off('click' + ns).on('click' + ns, (e) => {
        e.preventDefault();
        this.manejarAccionEspecial();
    });
}
```

### 5.3 Crear Métodos de Manejo Específicos

```javascript
/**
 * Manejar acción especial (ejemplo: abrir modal, procesar archivo, etc.)
 */
manejarAccionEspecial() {
    // Lógica específica para tu funcionalidad
    console.log('SFQ: Ejecutando acción especial');
    
    // Ejemplo: Abrir WordPress Media Library
    if (typeof wp !== 'undefined' && wp.media) {
        const mediaUploader = wp.media({
            title: 'Seleccionar Archivo',
            button: { text: 'Usar este archivo' },
            multiple: false
        });
        
        mediaUploader.on('select', () => {
            const attachment = mediaUploader.state().get('selection').first().toJSON();
            this.procesarArchivoSeleccionado(attachment);
        });
        
        mediaUploader.open();
    }
}

/**
 * Procesar archivo seleccionado
 */
procesarArchivoSeleccionado(attachment) {
    // Validar archivo
    if (!this.validarArchivo(attachment)) {
        alert('Archivo no válido');
        return;
    }
    
    // Actualizar campos
    $('#mi-campo-url').val(attachment.url);
    $('#mi-campo-id').val(attachment.id);
    $('#mi-campo-data').val(JSON.stringify({
        id: attachment.id,
        url: attachment.url,
        title: attachment.title,
        alt: attachment.alt
    }));
    
    // Mostrar preview
    this.mostrarPreview(attachment.url);
    
    // Marcar como modificado
    this.isDirty = true;
}

/**
 * Validar archivo
 */
validarArchivo(attachment) {
    const tiposValidos = ['image/jpeg', 'image/png', 'image/gif'];
    return tiposValidos.includes(attachment.mime) && attachment.url;
}

/**
 * Mostrar preview
 */
mostrarPreview(url) {
    const $preview = $('#mi-preview-container');
    $preview.html(`<img src="${url}" alt="Preview" style="max-width: 200px;">`);
    $preview.show();
    $('#mi-boton-eliminar').show();
}
```

---

## Paso 6: Pruebas y Validación

### 6.1 Lista de Verificación

- [ ] **Guardado**: Los campos se guardan correctamente en la base de datos
- [ ] **Carga**: Los campos se cargan correctamente al editar
- [ ] **Validación**: Los datos se validan antes del guardado
- [ ] **Sanitización**: Los datos se sanitizan para seguridad
- [ ] **Preview**: Los cambios se reflejan en tiempo real (si aplica)
- [ ] **Event Handlers**: Los eventos funcionan correctamente
- [ ] **Cleanup**: Los eventos se limpian al destruir la instancia

### 6.2 Casos de Prueba

```javascript
// Casos de prueba para implementar
const casosPrueba = [
    {
        nombre: 'Guardado básico',
        accion: 'Llenar campos y guardar formulario',
        esperado: 'Datos guardados en base de datos'
    },
    {
        nombre: 'Carga de datos',
        accion: 'Editar formulario existente',
        esperado: 'Campos poblados con valores guardados'
    },
    {
        nombre: 'Validación de errores',
        accion: 'Introducir datos inválidos',
        esperado: 'Errores de validación mostrados'
    },
    {
        nombre: 'Preview en tiempo real',
        accion: 'Cambiar valores de campos',
        esperado: 'Preview actualizado inmediatamente'
    }
];
```

### 6.3 Debug y Logging

```javascript
// Añadir logging para debug
console.log('SFQ: Guardando datos de mi funcionalidad:', {
    campo1: $('#mi-campo-1').val(),
    campo2: $('#mi-campo-2').is(':checked'),
    campo3: $('#mi-campo-3').val()
});

// En PHP, añadir logging
error_log('SFQ: Procesando configuraciones de mi funcionalidad: ' . print_r($settings, true));
```

---

## Plantillas de Código Reutilizables

### Plantilla JavaScript para Nuevo Campo

```javascript
// 1. En collectFormData()
mi_nuevo_campo: $('#mi-nuevo-campo').val() || 'valor_defecto',

// 2. En populateFormData()
$('#mi-nuevo-campo').val(styles.mi_nuevo_campo || 'valor_defecto');

// 3. En bindGlobalEvents()
$('#mi-nuevo-campo').off('change' + ns).on('change' + ns, () => {
    if (!this.isDestroyed) {
        this.isDirty = true;
    }
});
```

### Plantilla PHP para Validación

```php
// En process_[funcionalidad]_settings()
if (isset($settings['mi_nuevo_campo'])) {
    $valor = sanitize_text_field($settings['mi_nuevo_campo']);
    if ($this->validate_mi_campo($valor)) {
        $processed['mi_nuevo_campo'] = $valor;
    }
}

// Método de validación
private function validate_mi_campo($valor) {
    // Lógica de validación específica
    return !empty($valor) && strlen($valor) <= 255;
}
```

### Plantilla para Campo con Dependencias

```javascript
// Campo principal que controla otros
$('#campo-principal').off('change' + ns).on('change' + ns, function() {
    const valor = $(this).val();
    const $dependientes = $('#seccion-dependiente');
    
    if (valor === 'mostrar') {
        $dependientes.slideDown();
    } else {
        $dependientes.slideUp();
    }
    
    if (!self.isDestroyed) {
        self.isDirty = true;
    }
});
```

---

## 🎯 Consejos y Mejores Prácticas

### 1. **Nomenclatura Consistente**
- Usa prefijos consistentes: `mi_funcionalidad_campo`
- IDs HTML con guiones: `mi-funcionalidad-campo`
- Variables JavaScript en camelCase: `miFuncionalidadCampo`

### 2. **Validación Robusta**
- Siempre valida en el frontend Y backend
- Usa valores por defecto seguros
- Sanitiza todos los inputs del usuario

### 3. **Manejo de Errores**
- Implementa try-catch para JSON parsing
- Proporciona mensajes de error claros
- Log errores para debugging

### 4. **Performance**
- Usa namespaces para event handlers
- Limpia eventos al destruir instancias
- Evita validaciones innecesarias en tiempo real

### 5. **Compatibilidad**
- Verifica disponibilidad de APIs (wp.media, etc.)
- Proporciona fallbacks para funcionalidades opcionales
- Mantén compatibilidad con versiones anteriores

---

## 📚 Recursos Adicionales

- **WordPress Codex**: https://codex.wordpress.org/
- **jQuery Documentation**: https://api.jquery.com/
- **PHP Manual**: https://www.php.net/manual/
- **JSON Validation**: https://jsonlint.com/

---

*Esta guía fue creada basándose en la implementación exitosa del sistema de imagen de fondo en Smart Forms Quiz. Úsala como referencia para implementar nuevas funcionalidades de guardado.*
