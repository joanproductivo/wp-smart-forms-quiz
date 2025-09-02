# 📖 Guía Completa del Sistema de Imagen de Fondo - sfq-background-image-container

## 🎯 Resumen Ejecutivo

Esta guía documenta al detalle el sistema completo de imagen de fondo implementado en Smart Forms Quiz, específicamente el componente `sfq-background-image-container`. El sistema permite a los usuarios seleccionar, configurar y aplicar imágenes de fondo a sus formularios tanto desde WordPress Media Library como mediante URLs manuales.

## 🏗️ Arquitectura del Sistema

### Componentes Principales

1. **Backend (PHP)**: Gestión de datos y renderizado HTML
2. **Frontend Admin (JavaScript)**: Interfaz de configuración y selección
3. **Frontend Público (JavaScript)**: Aplicación de estilos en tiempo real
4. **CSS**: Estilos y efectos visuales

---

## 📋 1. COMPONENTE HTML - sfq-background-image-container

### Ubicación
- **Archivo**: `includes/class-sfq-admin.php`
- **Línea**: ~1089 (dentro del tab "Estilo")

### Estructura HTML Completa

```html
<div class="sfq-background-image-container">
    <!-- Preview de la imagen -->
    <div class="sfq-background-image-preview" id="background-image-preview" style="display: none;">
        <!-- La imagen se mostrará aquí dinámicamente -->
    </div>
    
    <!-- Controles principales -->
    <div class="sfq-background-image-controls">
        <button type="button" class="button button-secondary" id="select-background-image">
            <span class="dashicons dashicons-format-image"></span>
            Seleccionar Imagen
        </button>
        <button type="button" class="button button-secondary" id="remove-background-image" style="display: none;">
            <span class="dashicons dashicons-no-alt"></span>
            Quitar Imagen
        </button>
    </div>
    
    <!-- Input para URL manual -->
    <div class="sfq-background-url-input" style="margin-top: 10px;">
        <label>O introduce URL de imagen:</label>
        <input type="url" id="background-image-url" class="sfq-input" placeholder="https://ejemplo.com/imagen.jpg">
    </div>
    
    <!-- Inputs ocultos para datos de imagen -->
    <input type="hidden" id="background-image-id" value="">
    <input type="hidden" id="background-image-data" value="">
</div>
```

### Campos de Datos

| Campo | Propósito | Tipo |
|-------|-----------|------|
| `background-image-url` | URL de la imagen seleccionada | URL |
| `background-image-id` | ID de WordPress Media Library | Number |
| `background-image-data` | Metadatos completos de la imagen | JSON |

---

## ⚙️ 2. LÓGICA DE GUARDADO (Backend)

### Archivo: `assets/js/admin-builder-v2.js`

#### 2.1 Recolección de Datos

```javascript
// Función: collectFormData() - Línea ~1847
style_settings: {
    // ✅ Configuración de imagen de fondo con logging detallado
    background_image_url: (() => {
        const value = $('#background-image-url').val() || '';
        console.log('SFQ: Collecting background_image_url:', value);
        return value;
    })(),
    background_image_id: (() => {
        const value = $('#background-image-id').val() || '';
        console.log('SFQ: Collecting background_image_id:', value);
        return value;
    })(),
    background_image_data: (() => {
        const value = $('#background-image-data').val() || '';
        console.log('SFQ: Collecting background_image_data:', value);
        return value;
    })(),
    background_size: $('#background-size').val() || 'cover',
    background_repeat: $('#background-repeat').val() || 'no-repeat',
    background_position: $('#background-position').val() || 'center center',
    background_attachment: $('#background-attachment').val() || 'scroll',
    background_opacity: $('#background-opacity').val() || '1',
    background_overlay: $('#background-overlay').is(':checked'),
    background_overlay_color: $('#background-overlay-color').val() || '#000000',
    background_overlay_opacity: $('#background-overlay-opacity').val() || '0.3'
}
```

#### 2.2 Proceso de Guardado

1. **Recolección**: Los datos se extraen de los campos del formulario
2. **Validación**: Se verifican URLs y formatos
3. **Serialización**: Los datos se convierten a JSON
4. **Envío AJAX**: Se envían al servidor mediante `sfq_save_form`
5. **Almacenamiento**: Se guardan en la base de datos como `style_settings`

---

## 🔄 3. REPOBLACIÓN DE CAMPOS (Carga de Datos)

### Archivo: `assets/js/admin-builder-v2.js`

#### 3.1 Función de Carga

```javascript
// Función: populateFormData() - Línea ~1456
populateFormData(formData) {
    const styles = formData.style_settings || {};
    
    // ✅ Cargar configuración de imagen de fondo con IDs correctos
    $('#background-image-url').val(styles.background_image_url || '');
    $('#background-image-id').val(styles.background_image_id || '');
    $('#background-image-data').val(styles.background_image_data || '');
    $('#background-size').val(styles.background_size || 'cover');
    $('#background-repeat').val(styles.background_repeat || 'no-repeat');
    $('#background-position').val(styles.background_position || 'center center');
    $('#background-attachment').val(styles.background_attachment || 'scroll');
    $('#background-opacity').val(styles.background_opacity || '1');
    $('.sfq-background-opacity-value').text(styles.background_opacity || '1');
    $('#background-overlay').prop('checked', styles.background_overlay === true);
    $('#background-overlay-color').val(styles.background_overlay_color || '#000000').trigger('change');
    $('#background-overlay-opacity').val(styles.background_overlay_opacity || '0.3');
    $('.sfq-background-overlay-opacity-value').text(styles.background_overlay_opacity || '0.3');
    
    // Mostrar preview si hay imagen de fondo
    if (styles.background_image_url && styles.background_image_url.trim() !== '') {
        this.updateBackgroundImagePreview(styles.background_image_url);
        $('#background-image-options').show();
        $('#select-background-image').text('Cambiar Imagen');
        $('#remove-background-image').show();
    }
    
    // Mostrar opciones de overlay si está activado
    if (styles.background_overlay === true) {
        $('#background-overlay-options').show();
    }
}
```

#### 3.2 Proceso de Repoblación

1. **Carga de Datos**: Se obtienen desde `formData.style_settings`
2. **Asignación de Valores**: Se rellenan todos los campos del formulario
3. **Actualización Visual**: Se muestra el preview de la imagen
4. **Estado de Controles**: Se ajustan botones y opciones visibles

---

## 🎨 4. INTERFAZ DE USUARIO (Frontend Admin)

### 4.1 Event Binding

```javascript
// Función: bindBackgroundImageEvents() - Línea ~2765
bindBackgroundImageEvents(ns) {
    const self = this;
    
    // Botón para seleccionar imagen de fondo
    $('#select-background-image').off('click' + ns).on('click' + ns, function(e) {
        e.preventDefault();
        self.openBackgroundImageSelector();
    });
    
    // Input URL manual para imagen de fondo
    $('#background-image-url').off('input' + ns).on('input' + ns, function() {
        const url = $(this).val().trim();
        if (url && self.isValidImageUrl(url)) {
            self.updateBackgroundImagePreview(url);
            $(this).removeClass('invalid').addClass('valid');
            $('#background-image-options').slideDown(300);
        } else if (url) {
            $(this).removeClass('valid').addClass('invalid');
            self.hideBackgroundImagePreview();
        } else {
            $(this).removeClass('valid invalid');
            self.hideBackgroundImagePreview();
        }
        
        if (!self.isDestroyed) {
            self.isDirty = true;
            self.updatePreviewStyles();
        }
    });
    
    // Botón para eliminar imagen de fondo
    $('#remove-background-image').off('click' + ns).on('click' + ns, function(e) {
        e.preventDefault();
        self.removeBackgroundImage();
    });
}
```

### 4.2 WordPress Media Library Integration

```javascript
// Función: openBackgroundImageSelector() - Línea ~2825
openBackgroundImageSelector() {
    // Verificar que wp.media esté disponible
    if (typeof wp === 'undefined' || !wp.media) {
        alert('Error: WordPress Media Library no está disponible.');
        return;
    }
    
    const self = this;
    
    // Crear instancia del media uploader
    const mediaUploader = wp.media({
        title: 'Seleccionar Imagen de Fondo',
        button: {
            text: 'Usar esta imagen'
        },
        multiple: false,
        library: {
            type: 'image'
        }
    });
    
    // Evento cuando se selecciona una imagen
    mediaUploader.on('select', function() {
        const attachment = mediaUploader.state().get('selection').first().toJSON();
        
        if (self.isValidImageAttachment(attachment)) {
            self.setBackgroundImage(attachment);
        } else {
            alert('Error: El archivo seleccionado no es una imagen válida');
        }
    });
    
    // Abrir el uploader
    mediaUploader.open();
}
```

### 4.3 Validación de Imágenes

```javascript
// Validar attachment de imagen
isValidImageAttachment(attachment) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    return validTypes.includes(attachment.mime) && attachment.url;
}

// Validar URL de imagen
isValidImageUrl(url) {
    try {
        new URL(url);
        const validExtensions = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;
        return validExtensions.test(url);
    } catch {
        return false;
    }
}
```

### 4.4 Gestión de Preview

```javascript
// Actualizar preview de imagen de fondo
updateBackgroundImagePreview(url) {
    const $preview = $('#background-image-preview');
    const $previewImg = $preview.find('img');
    
    if ($previewImg.length === 0) {
        $preview.html(`<img src="${url}" alt="Vista previa" style="max-width: 100%; height: auto; border-radius: 4px;">`);
    } else {
        $previewImg.attr('src', url);
    }
    
    $preview.show();
    $('#background-image-remove').show();
}

// Ocultar preview de imagen de fondo
hideBackgroundImagePreview() {
    $('#background-image-preview').hide().empty();
    $('#background-image-remove').hide();
}

// Eliminar imagen de fondo
removeBackgroundImage() {
    $('#background-image-url').val('').removeClass('valid invalid');
    this.hideBackgroundImagePreview();
    this.isDirty = true;
    this.updatePreviewStyles();
}
```

---

## 🌐 5. CONEXIÓN CON EL FRONTEND PÚBLICO

### Archivo: `assets/js/frontend.js`

#### 5.1 Aplicación de Estilos

```javascript
// Función: applyBackgroundImageStyles() - Línea ~1847
applyBackgroundImageStyles() {
    // Obtener configuración de imagen de fondo desde los settings
    const backgroundImageUrl = this.settings.background_image_url;
    const backgroundImageSize = this.settings.background_image_size || 'cover';
    const backgroundImageRepeat = this.settings.background_image_repeat || 'no-repeat';
    const backgroundImagePosition = this.settings.background_image_position || 'center center';
    const backgroundImageAttachment = this.settings.background_image_attachment || 'scroll';
    const backgroundOverlayOpacity = this.settings.background_overlay_opacity || 0;

    console.log('SFQ Background: Applying background image styles');
    console.log('SFQ Background: URL:', backgroundImageUrl);

    // Solo aplicar si hay una imagen configurada
    if (backgroundImageUrl && backgroundImageUrl.trim() !== '') {
        // Aplicar variables CSS al contenedor del formulario
        this.container.style.setProperty('--sfq-background-image-url', `url("${backgroundImageUrl}")`);
        this.container.style.setProperty('--sfq-background-image-size', backgroundImageSize);
        this.container.style.setProperty('--sfq-background-image-repeat', backgroundImageRepeat);
        this.container.style.setProperty('--sfq-background-image-position', backgroundImagePosition);
        this.container.style.setProperty('--sfq-background-image-attachment', backgroundImageAttachment);
        this.container.style.setProperty('--sfq-background-overlay-opacity', backgroundOverlayOpacity);

        console.log('SFQ Background: Background image styles applied successfully');
    } else {
        console.log('SFQ Background: No background image URL configured, skipping');
    }
}
```

#### 5.2 Inicialización

```javascript
// En el constructor de SmartFormQuiz
init() {
    this.bindEvents();
    this.initializeForm();
    
    // ✅ NUEVO: Aplicar estilos de imagen de fondo
    this.applyBackgroundImageStyles();
    
    // Resto de inicialización...
}
```

---

## 🎨 6. ESTILOS CSS

### Archivo: `includes/class-sfq-admin.php` (Estilos inline)

```css
/* Estilos para el selector de imagen de fondo */
.sfq-background-image-container {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 20px;
    background: #f9f9f9;
    margin-bottom: 15px;
}

.sfq-background-image-preview {
    text-align: center;
    margin-bottom: 15px;
    padding: 10px;
    border: 2px dashed #ddd;
    border-radius: 6px;
    background: #fff;
    min-height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.sfq-background-image-preview img {
    max-width: 100%;
    max-height: 200px;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.sfq-background-image-controls {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-bottom: 15px;
}

.sfq-background-image-controls .button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
}

.sfq-background-url-input {
    margin-top: 15px;
}

.sfq-background-url-input label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
    color: #555;
}

.sfq-background-options-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
    margin-top: 15px;
}

.sfq-background-options-grid .sfq-field-group {
    background: #fff;
    padding: 15px;
    border-radius: 6px;
    border: 1px solid #e1e1e1;
}

/* Responsive para móviles */
@media (max-width: 768px) {
    .sfq-background-options-grid {
        grid-template-columns: 1fr;
    }
    
    .sfq-background-image-controls {
        flex-direction: column;
    }
    
    .sfq-background-image-controls .button {
        width: 100%;
        justify-content: center;
    }
}
```

---

## 🔧 7. CONFIGURACIONES AVANZADAS

### 7.1 Opciones de Imagen de Fondo

| Opción | Valores | Descripción |
|--------|---------|-------------|
| `background_size` | cover, contain, auto, 100% 100% | Tamaño de la imagen |
| `background_repeat` | no-repeat, repeat, repeat-x, repeat-y | Repetición |
| `background_position` | center center, top left, etc. | Posición |
| `background_attachment` | scroll, fixed, local | Fijación |
| `background_opacity` | 0.0 - 1.0 | Opacidad de la imagen |

### 7.2 Overlay de Color

```javascript
// Configuración de overlay
background_overlay: $('#background-overlay').is(':checked'),
background_overlay_color: $('#background-overlay-color').val() || '#000000',
background_overlay_opacity: $('#background-overlay-opacity').val() || '0.3'
```

---

## 🚀 8. IMPLEMENTACIÓN EN OTROS LUGARES

### 8.1 Estructura Base Requerida

```html
<!-- Contenedor principal -->
<div class="sfq-background-image-container">
    <!-- Preview -->
    <div class="sfq-background-image-preview" id="background-image-preview" style="display: none;"></div>
    
    <!-- Controles -->
    <div class="sfq-background-image-controls">
        <button type="button" class="button button-secondary" id="select-background-image">
            <span class="dashicons dashicons-format-image"></span>
            Seleccionar Imagen
        </button>
        <button type="button" class="button button-secondary" id="remove-background-image" style="display: none;">
            <span class="dashicons dashicons-no-alt"></span>
            Quitar Imagen
        </button>
    </div>
    
    <!-- Input URL -->
    <div class="sfq-background-url-input">
        <label>O introduce URL de imagen:</label>
        <input type="url" id="background-image-url" class="sfq-input" placeholder="https://ejemplo.com/imagen.jpg">
    </div>
    
    <!-- Campos ocultos -->
    <input type="hidden" id="background-image-id" value="">
    <input type="hidden" id="background-image-data" value="">
</div>
```

### 8.2 JavaScript Requerido

```javascript
// 1. Verificar que wp.media esté disponible
wp_enqueue_media();

// 2. Implementar funciones principales
function openBackgroundImageSelector() {
    const mediaUploader = wp.media({
        title: 'Seleccionar Imagen de Fondo',
        button: { text: 'Usar esta imagen' },
        multiple: false,
        library: { type: 'image' }
    });
    
    mediaUploader.on('select', function() {
        const attachment = mediaUploader.state().get('selection').first().toJSON();
        setBackgroundImage(attachment);
    });
    
    mediaUploader.open();
}

function setBackgroundImage(attachment) {
    $('#background-image-url').val(attachment.url);
    $('#background-image-id').val(attachment.id);
    $('#background-image-data').val(JSON.stringify({
        id: attachment.id,
        url: attachment.url,
        alt: attachment.alt || '',
        title: attachment.title || ''
    }));
    
    updateBackgroundImagePreview(attachment.url);
}

function updateBackgroundImagePreview(url) {
    const $preview = $('#background-image-preview');
    $preview.html(`<img src="${url}" alt="Vista previa">`).show();
    $('#remove-background-image').show();
}

// 3. Bind events
$('#select-background-image').on('click', openBackgroundImageSelector);
$('#remove-background-image').on('click', removeBackgroundImage);
$('#background-image-url').on('input', handleManualUrl);
```

### 8.3 CSS Mínimo

```css
.sfq-background-image-container {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 20px;
    background: #f9f9f9;
}

.sfq-background-image-preview {
    text-align: center;
    margin-bottom: 15px;
    padding: 10px;
    border: 2px dashed #ddd;
    border-radius: 6px;
    background: #fff;
    min-height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.sfq-background-image-preview img {
    max-width: 100%;
    max-height: 200px;
    border-radius: 4px;
}

.sfq-background-image-controls {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-bottom: 15px;
}
```

---

## 🔍 9. DEBUGGING Y TROUBLESHOOTING

### 9.1 Logs de Debug

El sistema incluye logging detallado:

```javascript
console.log('SFQ: Collecting background_image_url:', value);
console.log('SFQ Background: Applying background image styles');
console.log('SFQ Background: URL:', backgroundImageUrl);
```

### 9.2 Problemas Comunes

| Problema | Causa | Solución |
|----------|-------|----------|
| Media Library no abre | `wp_enqueue_media()` no cargado | Verificar que se carga en admin |
| Preview no se muestra | URL inválida | Validar formato de URL |
| Imagen no se guarda | Campos ocultos vacíos | Verificar `background-image-id` y `background-image-data` |
| Estilos no se aplican | Settings no se pasan al frontend | Verificar `data-settings` en contenedor |

### 9.3 Validaciones

```javascript
// Validar URL de imagen
function isValidImageUrl(url) {
    try {
        new URL(url);
        const validExtensions = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;
        return validExtensions.test(url);
    } catch {
        return false;
    }
}

// Validar attachment de WordPress
function isValidImageAttachment(attachment) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    return validTypes.includes(attachment.mime) && attachment.url;
}
```

---

## 📊 10. FLUJO DE DATOS COMPLETO

```mermaid
graph TD
    A[Usuario selecciona imagen] --> B{Método de selección}
    B -->|Media Library| C[wp.media.open()]
    B -->|URL Manual| D[Input URL]
    
    C --> E[Validar attachment]
    D --> F[Validar URL]
    
    E --> G[setBackgroundImage()]
    F --> G
    
    G --> H[Actualizar campos ocultos]
    H --> I[Mostrar preview]
    I --> J[Marcar como dirty]
    
    J --> K[Usuario guarda formulario]
    K --> L[collectFormData()]
    L --> M[AJAX a servidor]
    M --> N[Guardar en BD]
    
    N --> O[Cargar formulario]
    O --> P[populateFormData()]
    P --> Q[Repoblar campos]
    Q --> R[Mostrar preview]
    
    R --> S[Frontend público]
    S --> T[applyBackgroundImageStyles()]
    T --> U[Aplicar CSS variables]
    U --> V[Imagen visible en formulario]
```

---

## ✅ 11. CHECKLIST DE IMPLEMENTACIÓN

### Backend
- [ ] Crear estructura HTML del contenedor
- [ ] Añadir campos ocultos para datos
- [ ] Implementar guardado en `style_settings`
- [ ] Implementar carga desde BD

### Frontend Admin
- [ ] Cargar `wp_enqueue_media()`
- [ ] Implementar `openBackgroundImageSelector()`
- [ ] Implementar validaciones de imagen
- [ ] Implementar preview y controles
- [ ] Bind events correctamente

### Frontend Público
- [ ] Implementar `applyBackgroundImageStyles()`
- [ ] Pasar settings al frontend
- [ ] Aplicar CSS variables
- [ ] Verificar compatibilidad responsive

### CSS
- [ ] Estilos del contenedor
- [ ] Estilos del preview
- [ ] Estilos de controles
- [ ] Responsive design

---

## 🎯 12. CONCLUSIÓN

El sistema `sfq-background-image-container` es un componente completo y robusto que permite:

1. **Selección flexible**: WordPress Media Library + URL manual
2. **Validación robusta**: Tipos de archivo y formatos URL
3. **Preview en tiempo real**: Visualización inmediata
4. **Guardado persistente**: Almacenamiento en base de datos
5. **Aplicación automática**: Estilos aplicados en frontend
6. **Configuración avanzada**: Múltiples opciones de personalización

Este sistema puede ser reutilizado en cualquier parte del plugin o adaptado para otros proyectos siguiendo la estructura y patrones documentados.

---

**Fecha de creación**: 2 de Septiembre, 2025  
**Versión**: 1.0  
**Autor**: Sistema Smart Forms Quiz
