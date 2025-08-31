# Guía Completa: Implementación de Selector de Imágenes en WordPress

## Tabla de Contenidos
1. [Introducción](#introducción)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Implementación Backend](#implementación-backend)
4. [Implementación Frontend](#implementación-frontend)
5. [Mejores Prácticas de WordPress](#mejores-prácticas-de-wordpress)
6. [Manejo de Datos](#manejo-de-datos)
7. [Optimización y Rendimiento](#optimización-y-rendimiento)
8. [Seguridad](#seguridad)
9. [Casos de Uso Avanzados](#casos-de-uso-avanzados)
10. [Troubleshooting](#troubleshooting)

---

## Introducción

Esta guía documenta la implementación completa de un selector de imágenes para WordPress que permite a los usuarios seleccionar imágenes desde la librería de medios de WordPress de forma nativa y eficiente.

### Características Implementadas
- ✅ Integración nativa con la librería de medios de WordPress
- ✅ Soporte para múltiples formatos de imagen
- ✅ Guardado persistente de metadatos (URL, ID, texto alternativo)
- ✅ Renderizado optimizado en frontend
- ✅ Placeholder automático cuando no hay imagen
- ✅ Compatibilidad con sistemas de caché
- ✅ Validación y sanitización de datos
- ✅ Responsive design

---

## Arquitectura del Sistema

### Flujo de Datos
```
Admin Interface (JS) → WordPress Media Library → Database (JSON) → Frontend Rendering
       ↓                        ↓                      ↓                    ↓
   User Selection         Media Metadata         Persistent Storage    Image Display
```

### Componentes Principales
1. **Backend PHP**: Enqueue de scripts, procesamiento de datos
2. **JavaScript**: Interfaz de usuario, integración con Media Library
3. **CSS**: Estilos responsivos y UX
4. **Base de Datos**: Almacenamiento estructurado en JSON

---

## Implementación Backend

### 1. Enqueue de Scripts y Estilos

```php
/**
 * Cargar scripts necesarios para el selector de imágenes
 * Ubicación: includes/class-sfq-admin.php
 */
public function enqueue_admin_scripts($hook) {
    // Solo cargar en páginas del plugin
    if (strpos($hook, 'smart-forms-quiz') === false) {
        return;
    }
    
    // ✅ CRÍTICO: Enqueue de wp.media para acceso a la librería
    wp_enqueue_media();
    
    // Scripts del plugin
    wp_enqueue_script(
        'sfq-admin-builder',
        SFQ_PLUGIN_URL . 'assets/js/admin-builder-v2.js',
        array('jquery', 'wp-util', 'media-upload', 'media-views'),
        SFQ_VERSION,
        true
    );
    
    // Localización para JavaScript
    wp_localize_script('sfq-admin-builder', 'sfqAdmin', array(
        'ajaxUrl' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('sfq_nonce'),
        'strings' => array(
            'selectImage' => __('Seleccionar Imagen', 'smart-forms-quiz'),
            'changeImage' => __('Cambiar Imagen', 'smart-forms-quiz'),
            'removeImage' => __('Quitar Imagen', 'smart-forms-quiz'),
            'mediaTitle' => __('Seleccionar o Subir Imagen', 'smart-forms-quiz'),
            'mediaButton' => __('Usar esta imagen', 'smart-forms-quiz')
        )
    ));
}
```

### 2. Procesamiento de Datos en Base de Datos

```php
/**
 * Procesar opciones de pregunta preservando metadatos de imagen
 * Ubicación: includes/class-sfq-utils.php
 */
public static function process_question_options($options) {
    if (empty($options)) {
        return array();
    }
    
    // Decodificar JSON si es string
    if (is_string($options)) {
        $decoded = json_decode(stripslashes($options), true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            $options = $decoded;
        } else {
            return array();
        }
    }
    
    if (!is_array($options)) {
        return array();
    }
    
    // Procesar opciones preservando TODOS los campos
    $processed_options = array();
    foreach ($options as $option) {
        if (is_string($option)) {
            $processed_options[] = array(
                'text' => $option,
                'value' => $option
            );
        } elseif (is_array($option) || is_object($option)) {
            $option = (array) $option;
            
            // ✅ CRÍTICO: Preservar TODOS los campos
            $processed_option = array(
                'text' => $option['text'] ?? $option['value'] ?? '',
                'value' => $option['value'] ?? $option['text'] ?? ''
            );
            
            // ✅ Preservar campos específicos de imagen
            if (isset($option['image'])) {
                $processed_option['image'] = $option['image'];
            }
            if (isset($option['image_id'])) {
                $processed_option['image_id'] = $option['image_id'];
            }
            if (isset($option['image_alt'])) {
                $processed_option['image_alt'] = $option['image_alt'];
            }
            
            // ✅ Preservar otros campos adicionales
            if (isset($option['icon'])) {
                $processed_option['icon'] = $option['icon'];
            }
            if (isset($option['conditions'])) {
                $processed_option['conditions'] = $option['conditions'];
            }
            
            $processed_options[] = $processed_option;
        }
    }
    
    // Filtrar opciones vacías
    return array_values(array_filter($processed_options, function($option) {
        return !empty(trim($option['text']));
    }));
}
```

---

## Implementación Frontend

### 1. JavaScript - Integración con Media Library

```javascript
/**
 * Implementación del selector de imágenes
 * Ubicación: assets/js/admin-builder-v2.js
 */

// Función para abrir el selector de medios
function openMediaSelector(callback, options = {}) {
    // Configuración por defecto
    const defaultOptions = {
        title: sfqAdmin.strings.mediaTitle || 'Seleccionar Imagen',
        button: { text: sfqAdmin.strings.mediaButton || 'Usar esta imagen' },
        multiple: false,
        library: { type: 'image' }
    };
    
    // Combinar opciones
    const mediaOptions = { ...defaultOptions, ...options };
    
    // ✅ Crear frame de medios usando wp.media
    const frame = wp.media(mediaOptions);
    
    // Manejar selección
    frame.on('select', function() {
        const attachment = frame.state().get('selection').first().toJSON();
        
        // ✅ Extraer metadatos completos
        const imageData = {
            id: attachment.id,
            url: attachment.url,
            alt: attachment.alt || attachment.title || '',
            title: attachment.title || '',
            caption: attachment.caption || '',
            description: attachment.description || '',
            filename: attachment.filename || '',
            mime_type: attachment.mime || '',
            width: attachment.width || 0,
            height: attachment.height || 0,
            sizes: attachment.sizes || {}
        };
        
        // Ejecutar callback con datos
        if (typeof callback === 'function') {
            callback(imageData);
        }
    });
    
    // Abrir frame
    frame.open();
    
    return frame;
}

// Implementación específica para opciones de pregunta
function handleImageSelection(optionElement) {
    const imageContainer = optionElement.find('.sfq-image-container');
    const imagePreview = imageContainer.find('.sfq-image-preview');
    const imageInput = imageContainer.find('input[name$="[image]"]');
    const imageIdInput = imageContainer.find('input[name$="[image_id]"]');
    const imageAltInput = imageContainer.find('input[name$="[image_alt]"]');
    
    openMediaSelector(function(imageData) {
        // ✅ Actualizar preview
        imagePreview.html(`
            <img src="${imageData.url}" 
                 alt="${imageData.alt}" 
                 style="max-width: 100%; height: auto; border-radius: 4px;">
        `).show();
        
        // ✅ Actualizar inputs ocultos
        imageInput.val(imageData.url);
        imageIdInput.val(imageData.id);
        imageAltInput.val(imageData.alt);
        
        // ✅ Actualizar botones
        imageContainer.find('.sfq-select-image').text(sfqAdmin.strings.changeImage);
        imageContainer.find('.sfq-remove-image').show();
        
        // ✅ Marcar como modificado para guardado
        markAsModified();
    });
}

// Función para remover imagen
function removeImage(optionElement) {
    const imageContainer = optionElement.find('.sfq-image-container');
    const imagePreview = imageContainer.find('.sfq-image-preview');
    
    // ✅ Limpiar preview
    imagePreview.hide().empty();
    
    // ✅ Limpiar inputs
    imageContainer.find('input[name$="[image]"]').val('');
    imageContainer.find('input[name$="[image_id]"]').val('');
    imageContainer.find('input[name$="[image_alt]"]').val('');
    
    // ✅ Actualizar botones
    imageContainer.find('.sfq-select-image').text(sfqAdmin.strings.selectImage);
    imageContainer.find('.sfq-remove-image').hide();
    
    // ✅ Marcar como modificado
    markAsModified();
}
```

### 2. Renderizado de Opciones

```javascript
/**
 * Renderizar opción con soporte para imágenes
 */
function renderOption(option, index, questionType) {
    const optionId = `option_${Date.now()}_${index}`;
    
    // ✅ Determinar si mostrar selector de imagen
    const showImageSelector = (questionType === 'image_choice');
    
    let html = `
        <div class="sfq-option" data-index="${index}">
            <div class="sfq-option-header">
                <input type="text" 
                       name="options[${index}][text]" 
                       value="${escapeHtml(option.text || '')}" 
                       placeholder="Texto de la opción"
                       class="sfq-option-text">
                <button type="button" class="sfq-remove-option">×</button>
            </div>
    `;
    
    // ✅ Añadir selector de imagen si es necesario
    if (showImageSelector) {
        html += `
            <div class="sfq-image-container">
                <div class="sfq-image-preview" ${option.image ? '' : 'style="display:none;"'}>
                    ${option.image ? `<img src="${option.image}" alt="${option.image_alt || ''}" style="max-width: 100%; height: auto; border-radius: 4px;">` : ''}
                </div>
                <div class="sfq-image-controls">
                    <button type="button" class="sfq-select-image sfq-button-secondary">
                        ${option.image ? sfqAdmin.strings.changeImage : sfqAdmin.strings.selectImage}
                    </button>
                    <button type="button" class="sfq-remove-image sfq-button-danger" ${option.image ? '' : 'style="display:none;"'}>
                        ${sfqAdmin.strings.removeImage}
                    </button>
                </div>
                
                <!-- ✅ Inputs ocultos para datos de imagen -->
                <input type="hidden" name="options[${index}][image]" value="${option.image || ''}">
                <input type="hidden" name="options[${index}][image_id]" value="${option.image_id || ''}">
                <input type="hidden" name="options[${index}][image_alt]" value="${option.image_alt || ''}">
            </div>
        `;
    }
    
    html += `
            <input type="hidden" name="options[${index}][value]" value="${escapeHtml(option.value || option.text || '')}">
        </div>
    `;
    
    return html;
}
```

### 3. Recolección de Datos para Guardado

```javascript
/**
 * Obtener datos de preguntas incluyendo imágenes
 */
function getQuestionsData() {
    const questions = [];
    
    $('.sfq-question-item').each(function() {
        const questionElement = $(this);
        const questionType = questionElement.find('[name="question_type"]').val();
        
        // Datos básicos de la pregunta
        const questionData = {
            id: questionElement.data('question-id') || null,
            question_text: questionElement.find('[name="question_text"]').val(),
            question_type: questionType,
            required: questionElement.find('[name="required"]').is(':checked'),
            options: [],
            settings: getQuestionSettings(questionElement)
        };
        
        // ✅ Procesar opciones con soporte para imágenes
        questionElement.find('.sfq-option').each(function() {
            const optionElement = $(this);
            const optionData = {
                text: optionElement.find('[name$="[text]"]').val(),
                value: optionElement.find('[name$="[value]"]').val()
            };
            
            // ✅ CRÍTICO: Incluir datos de imagen si existen
            const imageUrl = optionElement.find('[name$="[image]"]').val();
            const imageId = optionElement.find('[name$="[image_id]"]').val();
            const imageAlt = optionElement.find('[name$="[image_alt]"]').val();
            
            if (imageUrl) {
                optionData.image = imageUrl;
            }
            if (imageId) {
                optionData.image_id = parseInt(imageId);
            }
            if (imageAlt) {
                optionData.image_alt = imageAlt;
            }
            
            questionData.options.push(optionData);
        });
        
        questions.push(questionData);
    });
    
    return questions;
}
```

---

## Mejores Prácticas de WordPress

### 1. Uso de APIs Nativas

```php
// ✅ CORRECTO: Usar wp_enqueue_media()
wp_enqueue_media();

// ✅ CORRECTO: Usar wp.media en JavaScript
const frame = wp.media({
    title: 'Seleccionar Imagen',
    button: { text: 'Usar esta imagen' },
    multiple: false,
    library: { type: 'image' }
});

// ❌ INCORRECTO: Implementar selector personalizado
// No reinventar la rueda cuando WordPress ya provee la funcionalidad
```

### 2. Sanitización y Validación

```php
/**
 * Sanitizar datos de imagen
 */
function sanitize_image_data($image_data) {
    return array(
        'image' => esc_url_raw($image_data['image'] ?? ''),
        'image_id' => absint($image_data['image_id'] ?? 0),
        'image_alt' => sanitize_text_field($image_data['image_alt'] ?? '')
    );
}

/**
 * Validar URL de imagen
 */
function validate_image_url($url) {
    if (empty($url)) {
        return false;
    }
    
    // Verificar que sea una URL válida
    if (!filter_var($url, FILTER_VALIDATE_URL)) {
        return false;
    }
    
    // Verificar que sea del dominio actual (seguridad)
    $site_url = site_url();
    if (strpos($url, $site_url) !== 0) {
        return false;
    }
    
    return true;
}
```

### 3. Hooks y Filtros

```php
/**
 * Permitir filtrado de tipos de archivo permitidos
 */
function get_allowed_image_types() {
    $default_types = array('jpg', 'jpeg', 'png', 'gif', 'webp');
    
    return apply_filters('sfq_allowed_image_types', $default_types);
}

/**
 * Hook para procesar imagen después de selección
 */
function process_selected_image($image_data, $context) {
    return apply_filters('sfq_process_selected_image', $image_data, $context);
}
```

### 4. Internacionalización

```php
/**
 * Strings traducibles
 */
$strings = array(
    'selectImage' => __('Seleccionar Imagen', 'smart-forms-quiz'),
    'changeImage' => __('Cambiar Imagen', 'smart-forms-quiz'),
    'removeImage' => __('Quitar Imagen', 'smart-forms-quiz'),
    'mediaTitle' => __('Seleccionar o Subir Imagen', 'smart-forms-quiz'),
    'mediaButton' => __('Usar esta imagen', 'smart-forms-quiz'),
    'imageError' => __('Error al cargar la imagen', 'smart-forms-quiz'),
    'invalidImage' => __('Formato de imagen no válido', 'smart-forms-quiz')
);
```

---

## Manejo de Datos

### 1. Estructura de Datos en Base de Datos

```json
{
  "options": [
    {
      "text": "Opción 1",
      "value": "option_1",
      "image": "https://example.com/wp-content/uploads/2024/01/image.jpg",
      "image_id": 123,
      "image_alt": "Descripción de la imagen"
    },
    {
      "text": "Opción 2", 
      "value": "option_2",
      "image": "https://example.com/wp-content/uploads/2024/01/image2.jpg",
      "image_id": 124,
      "image_alt": "Otra descripción"
    }
  ]
}
```

### 2. Renderizado en Frontend

```php
/**
 * Renderizar selección de imagen en frontend
 * Ubicación: includes/class-sfq-frontend.php
 */
private function render_image_choice($question) {
    if (empty($question->options)) {
        return;
    }
    ?>
    <div class="sfq-image-grid" data-question-id="<?php echo $question->id; ?>">
        <?php foreach ($question->options as $index => $option) : ?>
            <?php 
            // ✅ CRÍTICO: Normalizar opción a array para acceso consistente
            $option_data = is_object($option) ? (array) $option : $option;
            $option_image = $option_data['image'] ?? '';
            $option_text = $option_data['text'] ?? '';
            $option_value = $option_data['value'] ?? $option_text;
            $option_alt = $option_data['image_alt'] ?? $option_text;
            ?>
            <div class="sfq-image-option" 
                 data-value="<?php echo esc_attr($option_value); ?>">
                
                <?php if (!empty($option_image)) : ?>
                    <img src="<?php echo esc_url($option_image); ?>" 
                         alt="<?php echo esc_attr($option_alt); ?>"
                         loading="lazy">
                <?php else : ?>
                    <div class="sfq-image-placeholder">
                        <span class="dashicons dashicons-format-image"></span>
                    </div>
                <?php endif; ?>
                
                <?php if (!empty($option_text)) : ?>
                    <span class="sfq-image-label"><?php echo esc_html($option_text); ?></span>
                <?php endif; ?>
                
                <input type="radio" 
                       name="question_<?php echo $question->id; ?>" 
                       value="<?php echo esc_attr($option_value); ?>"
                       class="sfq-hidden-input">
                
                <div class="sfq-image-overlay">
                    <svg class="sfq-check-icon" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                </div>
            </div>
        <?php endforeach; ?>
    </div>
    <?php
}
```

---

## Optimización y Rendimiento

### 1. Lazy Loading

```php
// ✅ Añadir loading="lazy" a imágenes
<img src="<?php echo esc_url($option_image); ?>" 
     alt="<?php echo esc_attr($option_alt); ?>"
     loading="lazy">
```

### 2. Caché de Metadatos

```php
/**
 * Cachear metadatos de imagen
 */
function get_cached_image_metadata($image_id) {
    $cache_key = "sfq_image_meta_{$image_id}";
    $metadata = wp_cache_get($cache_key, 'sfq_images');
    
    if ($metadata === false) {
        $metadata = wp_get_attachment_metadata($image_id);
        wp_cache_set($cache_key, $metadata, 'sfq_images', 3600); // 1 hora
    }
    
    return $metadata;
}
```

### 3. Optimización de Consultas

```php
/**
 * Cargar imágenes en lote para evitar N+1 queries
 */
function preload_question_images($questions) {
    $image_ids = array();
    
    // Recopilar todos los IDs de imagen
    foreach ($questions as $question) {
        if (!empty($question->options)) {
            foreach ($question->options as $option) {
                if (!empty($option['image_id'])) {
                    $image_ids[] = $option['image_id'];
                }
            }
        }
    }
    
    // Cargar metadatos en una sola consulta
    if (!empty($image_ids)) {
        $attachments = get_posts(array(
            'post_type' => 'attachment',
            'post__in' => array_unique($image_ids),
            'posts_per_page' => -1
        ));
        
        // Cachear resultados
        foreach ($attachments as $attachment) {
            wp_cache_set("sfq_image_meta_{$attachment->ID}", $attachment, 'sfq_images', 3600);
        }
    }
}
```

---

## Seguridad

### 1. Validación de Permisos

```php
/**
 * Verificar permisos para subir imágenes
 */
function can_user_upload_images() {
    return current_user_can('upload_files') || current_user_can('manage_options');
}

/**
 * Verificar que la imagen pertenece al sitio actual
 */
function validate_image_ownership($image_url) {
    $upload_dir = wp_upload_dir();
    $base_url = $upload_dir['baseurl'];
    
    return strpos($image_url, $base_url) === 0;
}
```

### 2. Sanitización Robusta

```php
/**
 * Sanitizar datos de opción con imagen
 */
function sanitize_option_data($option_data) {
    $sanitized = array(
        'text' => sanitize_text_field($option_data['text'] ?? ''),
        'value' => sanitize_text_field($option_data['value'] ?? '')
    );
    
    // Sanitizar datos de imagen si existen
    if (!empty($option_data['image'])) {
        $image_url = esc_url_raw($option_data['image']);
        if (validate_image_ownership($image_url)) {
            $sanitized['image'] = $image_url;
            $sanitized['image_id'] = absint($option_data['image_id'] ?? 0);
            $sanitized['image_alt'] = sanitize_text_field($option_data['image_alt'] ?? '');
        }
    }
    
    return $sanitized;
}
```

### 3. Nonces y CSRF Protection

```javascript
// ✅ Incluir nonce en peticiones AJAX
$.ajax({
    url: sfqAdmin.ajaxUrl,
    type: 'POST',
    data: {
        action: 'sfq_save_form',
        nonce: sfqAdmin.nonce,
        form_data: formData
    },
    success: function(response) {
        // Manejar respuesta
    }
});
```

---

## Casos de Uso Avanzados

### 1. Múltiples Tamaños de Imagen

```javascript
/**
 * Seleccionar tamaño de imagen apropiado
 */
function getOptimalImageSize(attachment, targetWidth = 300) {
    const sizes = attachment.sizes || {};
    
    // Buscar el tamaño más apropiado
    const availableSizes = ['thumbnail', 'medium', 'medium_large', 'large', 'full'];
    
    for (const size of availableSizes) {
        if (sizes[size] && sizes[size].width >= targetWidth) {
            return {
                url: sizes[size].url,
                width: sizes[size].width,
                height: sizes[size].height
            };
        }
    }
    
    // Fallback a imagen completa
    return {
        url: attachment.url,
        width: attachment.width,
        height: attachment.height
    };
}
```

### 2. Validación de Formato de Imagen

```javascript
/**
 * Validar formato de imagen seleccionada
 */
function validateImageFormat(attachment) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!allowedTypes.includes(attachment.mime)) {
        alert('Formato de imagen no permitido. Use JPG, PNG, GIF o WebP.');
        return false;
    }
    
    // Validar tamaño máximo (ejemplo: 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB en bytes
    if (attachment.filesizeInBytes > maxSize) {
        alert('La imagen es demasiado grande. Máximo 5MB.');
        return false;
    }
    
    return true;
}
```

### 3. Preview Avanzado

```javascript
/**
 * Crear preview avanzado con información de imagen
 */
function createAdvancedPreview(imageData) {
    return `
        <div class="sfq-image-preview-advanced">
            <div class="sfq-image-container">
                <img src="${imageData.url}" alt="${imageData.alt}" loading="lazy">
                <div class="sfq-image-overlay">
                    <button type="button" class="sfq-change-image" title="Cambiar imagen">
                        <span class="dashicons dashicons-edit"></span>
                    </button>
                    <button type="button" class="sfq-remove-image" title="Quitar imagen">
                        <span class="dashicons dashicons-no-alt"></span>
                    </button>
                </div>
            </div>
            <div class="sfq-image-info">
                <div class="sfq-image-filename">${imageData.filename}</div>
                <div class="sfq-image-dimensions">${imageData.width} × ${imageData.height}px</div>
                <div class="sfq-image-size">${formatFileSize(imageData.filesizeInBytes)}</div>
            </div>
        </div>
    `;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
```

---

## Troubleshooting

### Problemas Comunes y Soluciones

#### 1. **Problema**: wp.media is not defined
```javascript
// ✅ Solución: Verificar que wp_enqueue_media() esté llamado
// En PHP:
wp_enqueue_media();

// En JavaScript, verificar disponibilidad:
if (typeof wp !== 'undefined' && wp.media) {
    // Usar wp.media
} else {
    console.error('WordPress Media Library no está disponible');
}
```

#### 2. **Problema**: Imágenes no se muestran en frontend
```php
// ✅ Solución: Verificar normalización de datos
$option_data = is_object($option) ? (array) $option : $option;
$option_image = $option_data['image'] ?? '';

// Verificar que la URL sea válida
if (!empty($option_image) && filter_var($option_image, FILTER_VALIDATE_URL)) {
    // Mostrar imagen
}
```

#### 3. **Problema**: Datos de imagen no se guardan
```javascript
// ✅ Solución: Verificar que los campos ocultos estén incluidos
function getQuestionsData() {
    // ... código anterior ...
    
    // CRÍTICO: Incluir datos de imagen
    const imageUrl = optionElement.find('[name$="[image]"]').val();
    const imageId = optionElement.find('[name$="[image_id]"]').val();
    const imageAlt = optionElement.find('[name$="[image_alt]"]').val();
    
    if (imageUrl) {
        optionData.image = imageUrl;
        optionData.image_id = parseInt(imageId) || 0;
        optionData.image_alt = imageAlt || '';
    }
}
```

#### 4. **Problema**: Placeholder no aparece cuando no hay imagen
```css
/* ✅ Solución: Estilos CSS para placeholder */
.sfq-image-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 120px;
    background: #f8f9fa;
    border: 2px dashed #dee2e6;
    border-radius: 8px;
    color: #6c757d;
    font-size: 48px;
}

.sfq-image-placeholder .dashicons {
    width: 48px;
    height: 48px;
    font-size: 48px;
}
```

#### 5. **Problema**: Estilos no se aplican correctamente
```css
/* ✅ Solución: Estilos completos para el selector de imágenes */
.sfq-image-container {
    margin-top: 10px;
    padding: 15px;
    border: 1px solid #e1e5e9;
    border-radius: 8px;
    background: #f8f9fa;
}

.sfq-image-preview {
    margin-bottom: 10px;
    text-align: center;
}

.sfq-image-preview img {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.sfq-image-controls {
    display: flex;
    gap: 10px;
    justify-content: center;
}

.sfq-select-image,
.sfq-remove-image {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
}

.sfq-select-image {
    background: #0073aa;
    color: white;
}

.sfq-select-image:hover {
    background: #005a87;
}

.sfq-remove-image {
    background: #dc3545;
    color: white;
}

.sfq-remove-image:hover {
    background: #c82333;
}

/* Responsive */
@media (max-width: 768px) {
    .sfq-image-controls {
        flex-direction: column;
    }
    
    .sfq-select-image,
    .sfq-remove-image {
        width: 100%;
    }
}
```

---

## Estilos CSS Completos

### 1. Estilos para el Admin

```css
/**
 * Estilos para el selector de imágenes en admin
 * Ubicación: assets/css/admin-consolidated.css
 */

/* Contenedor principal del selector de imágenes */
.sfq-image-container {
    margin-top: 15px;
    padding: 20px;
    border: 1px solid #e1e5e9;
    border-radius: 8px;
    background: #f8f9fa;
    transition: border-color 0.2s ease;
}

.sfq-image-container:hover {
    border-color: #0073aa;
}

/* Preview de imagen */
.sfq-image-preview {
    margin-bottom: 15px;
    text-align: center;
    position: relative;
}

.sfq-image-preview img {
    max-width: 100%;
    max-height: 200px;
    height: auto;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transition: transform 0.2s ease;
}

.sfq-image-preview img:hover {
    transform: scale(1.02);
}

/* Placeholder cuando no hay imagen */
.sfq-image-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 120px;
    background: #ffffff;
    border: 2px dashed #dee2e6;
    border-radius: 8px;
    color: #6c757d;
    font-size: 48px;
    transition: all 0.2s ease;
}

.sfq-image-placeholder:hover {
    border-color: #0073aa;
    color: #0073aa;
}

.sfq-image-placeholder .dashicons {
    width: 48px;
    height: 48px;
    font-size: 48px;
}

/* Controles de imagen */
.sfq-image-controls {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
}

.sfq-select-image,
.sfq-remove-image {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.sfq-select-image {
    background: #0073aa;
    color: white;
    box-shadow: 0 2px 4px rgba(0,115,170,0.3);
}

.sfq-select-image:hover {
    background: #005a87;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0,115,170,0.4);
}

.sfq-remove-image {
    background: #dc3545;
    color: white;
    box-shadow: 0 2px 4px rgba(220,53,69,0.3);
}

.sfq-remove-image:hover {
    background: #c82333;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(220,53,69,0.4);
}

/* Estados de carga */
.sfq-image-container.loading {
    opacity: 0.7;
    pointer-events: none;
}

.sfq-image-container.loading::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 20px;
    height: 20px;
    margin: -10px 0 0 -10px;
    border: 2px solid #0073aa;
    border-top-color: transparent;
    border-radius: 50%;
    animation: sfq-spin 1s linear infinite;
}

@keyframes sfq-spin {
    to { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 768px) {
    .sfq-image-container {
        padding: 15px;
    }
    
    .sfq-image-controls {
        flex-direction: column;
    }
    
    .sfq-select-image,
    .sfq-remove-image {
        width: 100%;
        justify-content: center;
    }
    
    .sfq-image-placeholder {
        min-height: 100px;
        font-size: 36px;
    }
    
    .sfq-image-placeholder .dashicons {
        width: 36px;
        height: 36px;
        font-size: 36px;
    }
}
```

### 2. Estilos para el Frontend

```css
/**
 * Estilos para la visualización de imágenes en frontend
 * Ubicación: assets/css/frontend.css
 */

/* Grid de opciones de imagen */
.sfq-image-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin: 20px 0;
}

/* Opción individual de imagen */
.sfq-image-option {
    position: relative;
    border: 2px solid #e1e5e9;
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.3s ease;
    background: white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.sfq-image-option:hover {
    border-color: var(--sfq-primary-color, #0073aa);
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
}

.sfq-image-option.selected {
    border-color: var(--sfq-primary-color, #0073aa);
    box-shadow: 0 0 0 3px rgba(0,115,170,0.2);
}

/* Imagen dentro de la opción */
.sfq-image-option img {
    width: 100%;
    height: 200px;
    object-fit: cover;
    display: block;
}

/* Placeholder de imagen */
.sfq-image-option .sfq-image-placeholder {
    width: 100%;
    height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f8f9fa;
    color: #6c757d;
    font-size: 48px;
}

/* Etiqueta de texto */
.sfq-image-label {
    display: block;
    padding: 15px;
    font-size: 16px;
    font-weight: 500;
    text-align: center;
    color: var(--sfq-text-color, #333);
    background: white;
}

/* Overlay de selección */
.sfq-image-overlay {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 30px;
    height: 30px;
    background: var(--sfq-primary-color, #0073aa);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transform: scale(0.8);
    transition: all 0.3s ease;
}

.sfq-image-option.selected .sfq-image-overlay {
    opacity: 1;
    transform: scale(1);
}

.sfq-check-icon {
    width: 18px;
    height: 18px;
    fill: white;
}

/* Input oculto */
.sfq-hidden-input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
}

/* Responsive para móviles */
@media (max-width: 768px) {
    .sfq-image-grid {
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 15px;
    }
    
    .sfq-image-option img,
    .sfq-image-option .sfq-image-placeholder {
        height: 150px;
    }
    
    .sfq-image-label {
        padding: 12px;
        font-size: 14px;
    }
    
    .sfq-image-placeholder {
        font-size: 36px;
    }
}

@media (max-width: 480px) {
    .sfq-image-grid {
        grid-template-columns: 1fr 1fr;
        gap: 10px;
    }
    
    .sfq-image-option img,
    .sfq-image-option .sfq-image-placeholder {
        height: 120px;
    }
}
```

---

## Conclusión

Esta guía proporciona una implementación completa y robusta de un selector de imágenes para WordPress siguiendo las mejores prácticas del ecosistema. Los puntos clave incluyen:

### ✅ **Características Implementadas**
- **Integración Nativa**: Uso completo de `wp.media` y la librería de medios de WordPress
- **Persistencia de Datos**: Guardado robusto de URL, ID y metadatos de imagen
- **Renderizado Optimizado**: Normalización de datos y manejo consistente de objetos/arrays
- **UX/UI Moderna**: Interfaz intuitiva con preview, placeholder y controles claros
- **Seguridad**: Validación, sanitización y verificación de permisos
- **Rendimiento**: Lazy loading, caché y optimización de consultas
- **Responsive**: Diseño adaptativo para todos los dispositivos

### 🎯 **Beneficios de esta Implementación**
1. **Compatibilidad Total**: Funciona con cualquier tema y plugin de WordPress
2. **Mantenibilidad**: Código limpio, documentado y siguiendo estándares
3. **Escalabilidad**: Fácil extensión para nuevas funcionalidades
4. **Accesibilidad**: Soporte para lectores de pantalla y navegación por teclado
5. **Internacionalización**: Preparado para múltiples idiomas

### 🚀 **Casos de Uso**
- Formularios con opciones visuales
- Quizzes con imágenes
- Encuestas de productos
- Selección de servicios
- Galerías interactivas
- Configuradores visuales

Esta implementación demuestra cómo aprovechar al máximo las APIs nativas de WordPress para crear funcionalidades robustas y profesionales sin reinventar la rueda.

---

**Autor**: Implementación basada en el proyecto Smart Forms Quiz  
**Versión**: 1.0  
**Fecha**: Agosto 2025  
**Licencia**: GPL v2 o posterior
