# Guía Completa del Componente `sfq-image-upload-section`

## Índice
1. [Introducción](#introducción)
2. [Estructura del Componente](#estructura-del-componente)
3. [Lógica de Guardado](#lógica-de-guardado)
4. [Repoblación de Campos](#repoblación-de-campos)
5. [Conexión Frontend-Backend](#conexión-frontend-backend)
6. [Funcionalidad Dinámica](#funcionalidad-dinámica)
7. [Implementación Paso a Paso](#implementación-paso-a-paso)
8. [Casos de Uso](#casos-de-uso)
9. [Troubleshooting](#troubleshooting)

## Introducción

El componente `sfq-image-upload-section` es un sistema completo de subida y gestión de imágenes diseñado para preguntas de tipo `image_choice` en el plugin Smart Forms & Quiz. Permite a los usuarios subir imágenes tanto desde la librería de medios de WordPress como mediante URLs manuales, con vista previa en tiempo real y validación de seguridad.

### Características Principales
- ✅ Integración con WordPress Media Library
- ✅ Soporte para URLs manuales de imágenes
- ✅ Vista previa en tiempo real
- ✅ Validación de tipos de archivo
- ✅ Guardado automático de metadatos
- ✅ Repoblación automática al recargar
- ✅ Funcionalidad dinámica para múltiples opciones
- ✅ Responsive design

## Estructura del Componente

### HTML Base
```html
<div class="sfq-image-upload-section">
    <!-- Controles de subida -->
    <div class="sfq-image-controls">
        <button type="button" class="button sfq-upload-image-btn" 
                data-option-index="0">
            <span class="dashicons dashicons-upload"></span>
            Subir Imagen
        </button>
        <input type="url" class="sfq-image-url-input" 
               name="options[0][image]"
               placeholder="O pega URL de imagen..." 
               value="">
    </div>
    
    <!-- Contenedor de vista previa -->
    <div class="sfq-image-preview-container" style="display: none;">
        <div class="sfq-image-preview">
            <img src="" alt="Vista previa" class="sfq-preview-image">
            <button type="button" class="sfq-remove-image" title="Eliminar imagen">
                <span class="dashicons dashicons-no-alt"></span>
            </button>
        </div>
    </div>
    
    <!-- Campos ocultos para metadatos -->
    <input type="hidden" name="options[0][image_id]" value="">
    <input type="hidden" name="options[0][image_alt]" value="">
</div>
```

### CSS Estilos Principales
```css
.sfq-image-upload-section {
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid #e1e1e1;
}

.sfq-image-controls {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-bottom: 10px;
    flex-wrap: wrap;
}

.sfq-upload-image-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 8px 12px;
    background: linear-gradient(135deg, var(--sfq-primary) 0%, #005a87 100%);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: var(--sfq-transition);
    box-shadow: 0 2px 4px rgba(0, 124, 186, 0.2);
}

.sfq-image-url-input {
    flex: 1;
    min-width: 200px;
    padding: 6px 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 13px;
    transition: var(--sfq-transition);
    background: white;
}

.sfq-image-url-input.valid {
    border-color: var(--sfq-success);
    box-shadow: 0 0 0 1px var(--sfq-success);
}

.sfq-image-url-input.invalid {
    border-color: var(--sfq-danger);
    box-shadow: 0 0 0 1px var(--sfq-danger);
}

.sfq-image-preview {
    position: relative;
    display: inline-block;
    max-width: 200px;
    border: 2px solid #ddd;
    border-radius: 6px;
    overflow: hidden;
    background: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: var(--sfq-transition);
}

.sfq-preview-image {
    width: 100%;
    height: auto;
    max-height: 120px;
    object-fit: cover;
    display: block;
    transition: var(--sfq-transition);
}

.sfq-remove-image {
    position: absolute;
    top: 5px;
    right: 5px;
    width: 24px;
    height: 24px;
    background: rgba(220, 53, 69, 0.9);
    color: white;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    transition: var(--sfq-transition);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}
```

## Lógica de Guardado

### 1. Estructura de Datos
El componente guarda tres tipos de datos para cada imagen:

```javascript
const imageData = {
    image: 'https://ejemplo.com/imagen.jpg',      // URL de la imagen
    image_id: '123',                              // ID del attachment de WordPress
    image_alt: 'Texto alternativo'               // Texto alternativo
};
```

### 2. Proceso de Guardado en JavaScript
```javascript
// En admin-builder-v2.js - Método updateImageOption
updateImageOption($optionItem, attachment, question, optionIndex) {
    console.log('SFQ: Updating image option', optionIndex, 'with attachment:', attachment);
    
    // Actualizar input de URL
    $optionItem.find('.sfq-image-url-input').val(attachment.url).removeClass('invalid').addClass('valid');
    
    // Actualizar datos de la opción
    if (!question.options[optionIndex]) {
        question.options[optionIndex] = { text: '', value: '' };
    }
    
    question.options[optionIndex].image = attachment.url;
    question.options[optionIndex].image_id = attachment.id || '';
    question.options[optionIndex].image_alt = attachment.alt || attachment.title || '';
    
    console.log('SFQ: Updated option data:', question.options[optionIndex]);
    
    // Mostrar preview
    this.updateImagePreview($optionItem, {
        url: attachment.url,
        alt: attachment.alt || attachment.title || 'Imagen seleccionada'
    });
    
    // Marcar formulario como modificado
    this.formBuilder.isDirty = true;
}
```

### 3. Guardado en Base de Datos
```javascript
// En admin-builder-v2.js - Método collectFormData
collectFormData() {
    return {
        // ... otros datos del formulario
        questions: this.questionManager.getQuestionsData()
    };
}

// En QuestionManager - Método getQuestionsData
getQuestionsData() {
    return this.questions.map((question, index) => {
        const baseData = {
            question_text: question.text,
            question_type: question.type,
            required: question.required ? 1 : 0,
            order_position: index,
            conditions: conditionsData,
            settings: question.settings || {}
        };

        // Para preguntas regulares con opciones
        baseData.options = question.options ? question.options.filter(opt => opt.text).map(opt => {
            return {
                text: opt.text || '',
                value: opt.value || opt.text || '',
                image: opt.image || '',           // ✅ URL de la imagen
                image_id: opt.image_id || '',     // ✅ ID del attachment
                image_alt: opt.image_alt || ''    // ✅ Texto alternativo
            };
        }) : [];

        return baseData;
    });
}
```

### 4. Validación en Backend
```php
// En class-sfq-ajax.php - Método validate_question_data
private function validate_question_data($question, $index) {
    $errors = array();
    
    // Validar opciones para tipos que las requieren
    $types_with_options = array('single_choice', 'multiple_choice', 'image_choice');
    if (in_array($question['question_type'], $types_with_options)) {
        if (empty($question['options']) || !is_array($question['options'])) {
            $errors['options'] = sprintf(__('La pregunta %d requiere opciones', 'smart-forms-quiz'), $index + 1);
        } elseif (count($question['options']) < 2) {
            $errors['options'] = sprintf(__('La pregunta %d requiere al menos 2 opciones', 'smart-forms-quiz'), $index + 1);
        }
        
        // ✅ Validación específica para image_choice
        if ($question['question_type'] === 'image_choice') {
            foreach ($question['options'] as $opt_index => $option) {
                if (!empty($option['image'])) {
                    // Validar URL de imagen
                    if (!filter_var($option['image'], FILTER_VALIDATE_URL)) {
                        $errors['options'][] = sprintf(__('URL de imagen inválida en opción %d de pregunta %d', 'smart-forms-quiz'), $opt_index + 1, $index + 1);
                    }
                    
                    // Validar ID de attachment si existe
                    if (!empty($option['image_id']) && !is_numeric($option['image_id'])) {
                        $errors['options'][] = sprintf(__('ID de imagen inválido en opción %d de pregunta %d', 'smart-forms-quiz'), $opt_index + 1, $index + 1);
                    }
                }
            }
        }
    }
    
    return $errors;
}
```

## Repoblación de Campos

### 1. Carga de Datos desde Base de Datos
```javascript
// En admin-builder-v2.js - Método populateFormData
populateFormData(formData) {
    // ... cargar otros datos del formulario
    
    // Load questions
    if (formData.questions && Array.isArray(formData.questions)) {
        this.questionManager.loadQuestions(formData.questions);
    }
}
```

### 2. Procesamiento de Opciones con Imágenes
```javascript
// En QuestionManager - Método createQuestionObject
createQuestionObject(data, index) {
    // ... procesar datos básicos de la pregunta
    
    // Process options for regular questions
    let options = [];
    if (data.options) {
        if (typeof data.options === 'string') {
            try {
                options = JSON.parse(data.options);
            } catch (e) {
                options = [];
            }
        } else if (Array.isArray(data.options)) {
            options = data.options;
        }
    }
    
    // ✅ CRÍTICO: Ensure options have correct structure including image data
    options = options.map(opt => {
        if (typeof opt === 'string') {
            return { 
                text: opt, 
                value: opt,
                image: '',
                image_id: '',
                image_alt: ''
            };
        }
        return {
            text: opt.text || opt.value || '',
            value: opt.value || opt.text || '',
            image: opt.image || '',           // ✅ URL de la imagen
            image_id: opt.image_id || '',     // ✅ ID del attachment
            image_alt: opt.image_alt || ''    // ✅ Texto alternativo
        };
    }).filter(opt => opt.text);
    
    return {
        id: questionId,
        originalId: data.id || null,
        text: data.question_text || '',
        type: data.question_type || 'text',
        options: options,                     // ✅ Opciones con datos de imagen
        required: this.formBuilder.dataValidator.normalizeBoolean(data.required),
        order: index,
        conditions: [],
        settings: data.settings || {}
    };
}
```

### 3. Repoblación de Previews de Imagen
```javascript
// En QuestionManager - Método repopulateImagePreviews
repopulateImagePreviews(questionId, question) {
    console.log('SFQ: Repopulating image previews for question:', questionId);
    
    const $question = $(`#${questionId}`);
    if ($question.length === 0) {
        console.error('SFQ: Question element not found for repopulation:', questionId);
        return;
    }
    
    // Verificar que tenga opciones con imágenes
    if (!question.options || question.options.length === 0) {
        console.log('SFQ: No options found for question:', questionId);
        return;
    }
    
    // Procesar cada opción que tenga imagen
    question.options.forEach((option, index) => {
        if (option.image && option.image.trim() !== '') {
            const $optionItem = $question.find('.sfq-option-item').eq(index);
            
            if ($optionItem.length > 0) {
                console.log('SFQ: Repopulating image for option', index, 'with URL:', option.image);
                
                // Actualizar el input de URL
                const $urlInput = $optionItem.find('.sfq-image-url-input');
                $urlInput.val(option.image).removeClass('invalid').addClass('valid');
                
                // Mostrar el preview de la imagen
                this.updateImagePreview($optionItem, {
                    url: option.image,
                    alt: option.image_alt || 'Imagen cargada'
                });
                
                console.log('SFQ: Successfully repopulated image preview for option', index);
            } else {
                console.warn('SFQ: Option element not found for index:', index);
            }
        }
    });
    
    console.log('SFQ: Finished repopulating image previews for question:', questionId);
}
```

### 4. Llamada Automática tras Carga
```javascript
// En QuestionManager - Método loadQuestions
loadQuestions(questionsData) {
    // ... procesar y renderizar preguntas
    
    normalQuestions.forEach(question => {
        const element = this.formBuilder.uiRenderer.renderQuestion(question);
        this.container.append(element);
        this.bindQuestionEvents(question.id);
        
        // ✅ CRÍTICO: Repoblar previews de imagen para preguntas image_choice
        if (question.type === 'image_choice') {
            this.repopulateImagePreviews(question.id, question);
        }
        
        // Load conditions if any
        const questionData = questionsData.find(q => q.id === question.originalId);
        if (questionData && questionData.conditions && questionData.conditions.length > 0) {
            this.formBuilder.conditionEngine.loadConditions(question.id, questionData.conditions);
        }
    });
}
```

## Conexión Frontend-Backend

### 1. WordPress Media Library Integration
```javascript
// En QuestionManager - Método openMediaLibrary
openMediaLibrary($button, $optionItem, question, optionIndex) {
    // Verificar que wp.media esté disponible
    if (typeof wp === 'undefined' || !wp.media) {
        alert('Error: WordPress Media Library no está disponible. Asegúrate de que wp_enqueue_media() esté cargado.');
        console.error('SFQ: wp.media is not available. Make sure wp_enqueue_media() is called.');
        return;
    }
    
    console.log('SFQ: Opening Media Library for option', optionIndex);
    
    // Crear instancia del media uploader
    const mediaUploader = wp.media({
        title: 'Seleccionar Imagen para Opción',
        button: {
            text: 'Usar esta imagen'
        },
        multiple: false,
        library: {
            type: 'image' // ✅ SEGURIDAD: Solo imágenes
        }
    });
    
    // Evento cuando se selecciona una imagen
    mediaUploader.on('select', () => {
        const attachment = mediaUploader.state().get('selection').first().toJSON();
        
        console.log('SFQ: Selected attachment:', attachment);
        
        // ✅ VALIDACIÓN: Verificar que sea una imagen válida
        if (!this.isValidAttachment(attachment)) {
            alert('Error: El archivo seleccionado no es una imagen válida');
            return;
        }
        
        // Actualizar la opción con los datos de la imagen
        this.updateImageOption($optionItem, attachment, question, optionIndex);
    });
    
    // Abrir el uploader
    mediaUploader.open();
}
```

### 2. Validación de Archivos
```javascript
// En QuestionManager - Método isValidAttachment
isValidAttachment(attachment) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    
    // Verificar tipo MIME
    if (!validTypes.includes(attachment.mime)) {
        console.error('SFQ: Invalid MIME type:', attachment.mime);
        return false;
    }
    
    // Verificar extensión
    if (attachment.filename) {
        const extension = attachment.filename.split('.').pop().toLowerCase();
        if (!validExtensions.includes(extension)) {
            console.error('SFQ: Invalid file extension:', extension);
            return false;
        }
    }
    
    // Verificar que tenga URL
    if (!attachment.url) {
        console.error('SFQ: No URL found in attachment');
        return false;
    }
    
    return true;
}

// Validación de URLs manuales
isValidImageUrl(url) {
    // Verificar que sea una URL válida
    try {
        new URL(url);
    } catch {
        return false;
    }
    
    // Verificar extensión de imagen
    const validExtensions = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;
    return validExtensions.test(url);
}
```

### 3. Enqueue de Scripts Necesarios
```php
// En class-sfq-admin.php - Método enqueue_admin_scripts
public function enqueue_admin_scripts($hook) {
    // Solo cargar en páginas del plugin
    if (strpos($hook, 'smart-forms-quiz') === false) {
        return;
    }
    
    // ✅ CRÍTICO: Enqueue WordPress Media Library
    wp_enqueue_media();
    
    // Enqueue scripts del plugin
    wp_enqueue_script(
        'sfq-admin-builder-v2',
        SFQ_PLUGIN_URL . 'assets/js/admin-builder-v2.js',
        array('jquery', 'wp-color-picker', 'media-upload', 'media-views'),
        SFQ_VERSION,
        true
    );
    
    // Localizar script con datos necesarios
    wp_localize_script('sfq-admin-builder-v2', 'sfq_ajax', array(
        'ajax_url' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('sfq_nonce'),
        'strings' => array(
            'confirm_delete' => __('¿Estás seguro de eliminar este elemento?', 'smart-forms-quiz'),
            'image_upload_error' => __('Error al subir la imagen', 'smart-forms-quiz'),
            'invalid_image_url' => __('URL de imagen no válida', 'smart-forms-quiz')
        )
    ));
}
```

## Funcionalidad Dinámica

### 1. Añadir Nuevas Opciones
```javascript
// En QuestionManager - Método addOption
addOption(questionId) {
    const question = this.questions.find(q => q.id === questionId);
    if (!question) return;
    
    // ✅ CORREGIDO: Crear opción con estructura completa para image_choice
    const newOption = { 
        text: '', 
        value: '',
        image: '',
        image_id: '',
        image_alt: ''
    };
    question.options.push(newOption);
    
    // ✅ CRÍTICO: Pasar el tipo de pregunta al renderizar la opción
    const optionHtml = this.formBuilder.uiRenderer.renderOption(newOption, question.options.length, question.type);
    $(`#options-${questionId}`).append(optionHtml);
    
    // ✅ CRÍTICO: Re-bind events incluyendo eventos específicos de image_choice
    this.bindOptionEvents(questionId);
    
    // ✅ NUEVO: Si es image_choice, bind eventos específicos de imagen
    if (question.type === 'image_choice') {
        const $question = $(`#${questionId}`);
        this.bindImageChoiceEvents($question, question);
        console.log('SFQ: Bound image choice events for new option in question:', questionId);
    }
    
    this.formBuilder.isDirty = true;
}
```

### 2. Renderizado Dinámico de Opciones
```javascript
// En UIRenderer - Método renderOption
renderOption(option, index, questionType = null) {
    // Determinar si es una pregunta de tipo image_choice
    const isImageChoice = questionType === 'image_choice';
    
    // HTML base para todas las opciones
    let optionHtml = `
        <div class="sfq-option-item">
            <input type="text" class="sfq-option-input" 
                   placeholder="Opción ${index}" 
                   value="${this.escapeHtml(option.text || '')}">
    `;
    
    // ✅ NUEVO: Añadir interfaz de subida de imágenes para image_choice
    if (isImageChoice) {
        const hasImage = option.image && option.image.trim() !== '';
        
        optionHtml += `
            <div class="sfq-image-upload-section">
                <div class="sfq-image-controls">
                    <button type="button" class="button sfq-upload-image-btn" 
                            data-option-index="${index - 1}">
                        <span class="dashicons dashicons-upload"></span>
                        Subir Imagen
                    </button>
                    <input type="url" class="sfq-image-url-input ${hasImage ? 'valid' : ''}" 
                           name="options[${index - 1}][image]"
                           placeholder="O pega URL de imagen..." 
                           value="${this.escapeHtml(option.image || '')}">
                </div>
                <div class="sfq-image-preview-container" style="display: ${hasImage ? 'block' : 'none'};">
                    <div class="sfq-image-preview">
                        <img src="${this.escapeHtml(option.image || '')}" 
                             alt="${this.escapeHtml(option.image_alt || 'Vista previa')}" 
                             class="sfq-preview-image">
                        <button type="button" class="sfq-remove-image" title="Eliminar imagen">
                            <span class="dashicons dashicons-no-alt"></span>
                        </button>
                    </div>
                </div>
                
                <!-- Campos ocultos para datos adicionales de la imagen -->
                <input type="hidden" name="options[${index - 1}][image_id]" 
                       value="${this.escapeHtml(option.image_id || '')}">
                <input type="hidden" name="options[${index - 1}][image_alt]" 
                       value="${this.escapeHtml(option.image_alt || '')}">
            </div>
        `;
    }
    
    // Botón de eliminar opción
    optionHtml += `
            <button class="sfq-option-remove" type="button">
                <span class="dashicons dashicons-trash"></span>
            </button>
        </div>
    `;
    
    return optionHtml;
}
```

### 3. Event Binding Dinámico
```javascript
// En QuestionManager - Método bindImageChoiceEvents
bindImageChoiceEvents($question, question) {
    const self = this;
    
    // Evento para abrir WordPress Media Library
    $question.find('.sfq-upload-image-btn').off('click').on('click', function(e) {
        e.preventDefault();
        
        const $button = $(this);
        const $optionItem = $button.closest('.sfq-option-item');
        const optionIndex = $optionItem.index();
        
        self.openMediaLibrary($button, $optionItem, question, optionIndex);
    });
    
    // Evento para URL manual
    $question.find('.sfq-image-url-input').off('input').on('input', function() {
        const $input = $(this);
        const url = $input.val().trim();
        const $optionItem = $input.closest('.sfq-option-item');
        const optionIndex = $optionItem.index();
        
        if (url && self.isValidImageUrl(url)) {
            // Actualizar datos de la opción
            if (question.options[optionIndex]) {
                question.options[optionIndex].image = url;
                question.options[optionIndex].image_id = '';
                question.options[optionIndex].image_alt = '';
            }
            
            // Mostrar preview
            self.updateImagePreview($optionItem, {
                url: url,
                alt: 'Imagen desde URL'
            });
            
            // Marcar input como válido
            $input.removeClass('invalid').addClass('valid');
        } else if (url) {
            // URL inválida
            $input.removeClass('valid').addClass('invalid');
            self.hideImagePreview($optionItem);
        } else {
            // Campo vacío
            $input.removeClass('valid invalid');
            self.hideImagePreview($optionItem);
            
            // Limpiar datos de imagen
            if (question.options[optionIndex]) {
                question.options[optionIndex].image = '';
                question.options[optionIndex].image_id = '';
                question.options[optionIndex].image_alt = '';
            }
        }
        
        self.formBuilder.isDirty = true;
    });
    
    // Evento para eliminar imagen
    $question.find('.sfq-remove-image').off('click').on('click', function(e) {
        e.preventDefault();
        
        const $optionItem = $(this).closest('.sfq-option-item');
        const optionIndex = $optionItem.index();
        
        self.removeImage($optionItem, question, optionIndex);
    });
}
```

## Implementación Paso a Paso

### Paso 1: Preparar el HTML Base
```html
<!-- Para cada opción de una pregunta image_choice -->
<div class="sfq-option-item">
    <!-- Input de texto para la opción -->
    <input type="text" class="sfq-option-input" placeholder="Texto de la opción">
    
    <!-- Sección de subida de imágenes -->
    <div class="sfq-image-upload-section">
        <div class="sfq-image-controls">
            <button type="button" class="button sfq-upload-image-btn">
                <span class="dashicons dashicons-upload"></span>
                Subir Imagen
            </button>
            <input type="url" class="sfq-image-url-input" placeholder="O pega URL de imagen...">
        </div>
        
        <div class="sfq-image-preview-container" style="display: none;">
            <div class="sfq-image-preview">
                <img src="" alt="Vista previa" class="sfq-preview-image">
                <button type="button" class="sfq-remove-image">
                    <span class="dashicons dashicons-no-alt"></span>
                </button>
            </div>
        </div>
        
        <input type="hidden" name="image_id" value="">
        <input type="hidden" name="image_alt" value="">
    </div>
    
    <button class="sfq-option-remove" type="button">
        <span class="dashicons dashicons-trash"></span>
    </button>
</div>
```

### Paso 2: Añadir los Estilos CSS
```css
/* Copiar los estilos CSS de la sección "Estructura del Componente" */
```

### Paso 3: Implementar la Lógica JavaScript
```javascript
class ImageUploadManager {
    constructor() {
        this.bindEvents();
    }
    
    bindEvents() {
        // Event delegation para botones de subida
        $(document).on('click', '.sfq-upload-image-btn', (e) => {
            e.preventDefault();
            this.openMediaLibrary($(e.target));
        });
        
        // Event delegation para inputs de URL
        $(document).on('input', '.sfq-image-url-input', (e) => {
            this.handleUrlInput($(e.target));
        });
        
        // Event delegation para botones de eliminar
        $(document).on('click', '.sfq-remove-image', (e) => {
            e.preventDefault();
            this.removeImage($(e.target));
        });
    }
    
    openMediaLibrary($button) {
        if (typeof wp === 'undefined' || !wp.media) {
            alert('WordPress Media Library no está disponible');
            return;
        }
        
        const mediaUploader = wp.media({
            title: 'Seleccionar Imagen',
            button: { text: 'Usar esta imagen' },
            multiple: false,
            library: { type: 'image' }
        });
        
        mediaUploader.on('select', () => {
            const attachment = mediaUploader.state().get('selection').first().toJSON();
            this.updateImageOption($button, attachment);
        });
        
        mediaUploader.open();
    }
    
    handleUrlInput($input) {
        const url = $input.val().trim();
        const $optionItem = $input.closest('.sfq-option-item');
        
        if (url && this.isValidImageUrl(url)) {
            $input.removeClass('invalid').addClass('valid');
            this.updateImagePreview($optionItem, { url: url, alt: 'Imagen desde URL' });
        } else if (url) {
            $input.removeClass('valid').addClass('invalid');
            this.hideImagePreview($optionItem);
        } else {
            $input.removeClass('valid invalid');
            this.hideImagePreview($optionItem);
        }
    }
    
    updateImageOption($button, attachment) {
        const $optionItem = $button.closest('.sfq-option-item');
        const $urlInput = $optionItem.find('.sfq-image-url-input');
        
        // Actualizar input de URL
        $urlInput.val(attachment.url).removeClass('invalid').addClass('valid');
        
        // Actualizar campos ocultos
        $optionItem.find('input[name*="image_id"]').val(attachment.id || '');
        $optionItem.find('input[name*="image_alt"]').val(attachment.alt || attachment.title || '');
        
        // Mostrar preview
        this.updateImagePreview($optionItem, {
            url: attachment.url,
            alt: attachment.alt || attachment.title || 'Imagen seleccionada'
        });
    }
    
    updateImagePreview($optionItem, imageData) {
        const $previewContainer = $optionItem.find('.sfq-image-preview-container');
        const $previewImage = $previewContainer.find('.sfq-preview-image');
        
        $previewImage.attr('src', imageData.url);
        $previewImage.attr('alt', imageData.alt || 'Vista previa');
        $previewContainer.show();
    }
    
    hideImagePreview($optionItem) {
        $optionItem.find('.sfq-image-preview-container').hide();
    }
    
    removeImage($button) {
        const $optionItem = $button.closest('.sfq-option-item');
        
        // Limpiar input de URL
        $optionItem.find('.sfq-image-url-input').val('').removeClass('valid invalid');
        
        // Limpiar campos ocultos
        $optionItem.find('input[name*="image_id"]').val('');
        $optionItem.find('input[name*="image_alt"]').val('');
        
        // Ocultar preview
        this.hideImagePreview($optionItem);
    }
    
    isValidImageUrl(url) {
        try {
            new URL(url);
            const validExtensions = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;
            return validExtensions.test(url);
        } catch {
            return false;
        }
    }
}

// Inicializar el manager
$(document).ready(() => {
    new ImageUploadManager();
});
```

### Paso 4: Configurar WordPress Media Library
```php
// En tu archivo principal de admin (ej: class-admin.php)
public function enqueue_admin_scripts($hook) {
    // Solo cargar en páginas del plugin
    if (strpos($hook, 'tu-plugin') === false) {
        return;
    }
    
    // ✅ CRÍTICO: Enqueue WordPress Media Library
    wp_enqueue_media();
    
    // Enqueue tu script
    wp_enqueue_script(
        'tu-plugin-admin',
        plugin_dir_url(__FILE__) . 'assets/js/admin.js',
        array('jquery', 'media-upload', 'media-views'),
        '1.0.0',
        true
    );
}
```

### Paso 5: Implementar Guardado en Backend
```php
// En tu clase de guardado
private function save_question_options($question_data) {
    $options = array();
    
    if (isset($question_data['options']) && is_array($question_data['options'])) {
        foreach ($question_data['options'] as $option) {
            $processed_option = array(
                'text' => sanitize_text_field($option['text'] ?? ''),
                'value' => sanitize_text_field($option['value'] ?? $option['text'] ?? ''),
                'image' => esc_url_raw($option['image'] ?? ''),
                'image_id' => intval($option['image_id'] ?? 0),
                'image_alt' => sanitize_text_field($option['image_alt'] ?? '')
            );
            
            // Validar imagen si existe
            if (!empty($processed_option['image'])) {
                if (!filter_var($processed_option['image'], FILTER_VALIDATE_URL)) {
                    // URL inválida, limpiar datos de imagen
                    $processed_option['image'] = '';
                    $processed_option['image_id'] = 0;
                    $processed_option['image_alt'] = '';
                }
            }
            
            $options[] = $processed_option;
        }
    }
    
    return $options;
}
```

## Casos de Uso

### Caso 1: Pregunta de Selección de Productos
```html
<!-- Pregunta: "¿Cuál es tu producto favorito?" -->
<div class="sfq-question-item" data-type="image_choice">
    <h3>¿Cuál es tu producto favorito?</h3>
    
    <div class="sfq-options-list">
        <!-- Opción 1: Smartphone -->
        <div class="sfq-option-item">
            <input type="text" value="Smartphone" class="sfq-option-input">
            <div class="sfq-image-upload-section">
                <div class="sfq-image-controls">
                    <button class="sfq-upload-image-btn">Subir Imagen</button>
                    <input type="url" class="sfq-image-url-input valid" 
                           value="https://ejemplo.com/smartphone.jpg">
                </div>
                <div class="sfq-image-preview-container" style="display: block;">
                    <div class="sfq-image-preview">
                        <img src="https://ejemplo.com/smartphone.jpg" alt="Smartphone">
                        <button class="sfq-remove-image">×</button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Opción 2: Laptop -->
        <div class="sfq-option-item">
            <input type="text" value="Laptop" class="sfq-option-input">
            <div class="sfq-image-upload-section">
                <!-- Similar estructura para laptop -->
            </div>
        </div>
    </div>
</div>
```

### Caso 2: Quiz de Identificación Visual
```html
<!-- Pregunta: "Identifica este monumento" -->
<div class="sfq-question-item" data-type="image_choice">
    <h3>Identifica este monumento</h3>
    
    <div class="sfq-options-list">
        <!-- Cada opción tiene una imagen del monumento -->
        <div class="sfq-option-item">
            <input type="text" value="Torre Eiffel" class="sfq-option-input">
            <div class="sfq-image-upload-section">
                <!-- Imagen de la Torre Eiffel -->
            </div>
        </div>
        
        <div class="sfq-option-item">
            <input type="text" value="Big Ben" class="sfq-option-input">
            <div class="sfq-image-upload-section">
                <!-- Imagen del Big Ben -->
            </div>
        </div>
    </div>
</div>
```

### Caso 3: Selección de Estilos/Diseños
```html
<!-- Pregunta: "¿Qué estilo prefieres para tu sitio web?" -->
<div class="sfq-question-item" data-type="image_choice">
    <h3>¿Qué estilo prefieres para tu sitio web?</h3>
    
    <div class="sfq-options-list">
        <!-- Opción 1: Minimalista -->
        <div class="sfq-option-item">
            <input type="text" value="Minimalista" class="sfq-option-input">
            <div class="sfq-image-upload-section">
                <!-- Screenshot de diseño minimalista -->
            </div>
        </div>
        
        <!-- Opción 2: Colorido -->
        <div class="sfq-option-item">
            <input type="text" value="Colorido" class="sfq-option-input">
            <div class="sfq-image-upload-section">
                <!-- Screenshot de diseño colorido -->
            </div>
        </div>
    </div>
</div>
```

## Troubleshooting

### Problema 1: WordPress Media Library no se abre
**Síntomas:**
- Al hacer clic en "Subir Imagen" no pasa nada
- Error en consola: "wp.media is not defined"

**Solución:**
```php
// Asegúrate de que wp_enqueue_media() esté llamado
public function enqueue_admin_scripts($hook) {
    wp_enqueue_media(); // ✅ Esta línea es crítica
    
    wp_enqueue_script(
        'tu-script',
        'path/to/script.js',
        array('jquery', 'media-upload', 'media-views'), // ✅ Dependencias correctas
        '1.0.0',
        true
    );
}
```

### Problema 2: Las imágenes no se guardan
**Síntomas:**
- Las imágenes se seleccionan pero no aparecen al recargar
- Los campos ocultos están vacíos

**Solución:**
```javascript
// Verificar que los campos ocultos se actualicen correctamente
updateImageOption($optionItem, attachment) {
    // ✅ Asegurar que los selectores sean correctos
    $optionItem.find('input[name*="image_id"]').val(attachment.id || '');
    $optionItem.find('input[name*="image_alt"]').val(attachment.alt || '');
    
    // ✅ Verificar que los datos se guarden en el objeto de pregunta
    if (this.question && this.question.options && this.question.options[optionIndex]) {
        this.question.options[optionIndex].image = attachment.url;
        this.question.options[optionIndex].image_id = attachment.id;
        this.question.options[optionIndex].image_alt = attachment.alt;
    }
}
```

### Problema 3: Las previews no se repoblan al cargar
**Síntomas:**
- Al recargar la página, las imágenes guardadas no se muestran
- Los inputs de URL están vacíos

**Solución:**
```javascript
// Asegurar que repopulateImagePreviews se llame después del renderizado
loadQuestions(questionsData) {
    questionsData.forEach(questionData => {
        const question = this.createQuestionObject(questionData);
        const element = this.renderQuestion(question);
        this.container.append(element);
        
        // ✅ CRÍTICO: Llamar después de que el DOM esté listo
        if (question.type === 'image_choice') {
            setTimeout(() => {
                this.repopulateImagePreviews(question.id, question);
            }, 100);
        }
    });
}
```

### Problema 4: Validación de URLs falla
**Síntomas:**
- URLs válidas se marcan como inválidas
- Extensiones válidas no se reconocen

**Solución:**
```javascript
// Mejorar la validación de URLs
isValidImageUrl(url) {
    try {
        const urlObj = new URL(url);
        
        // ✅ Verificar protocolo
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
            return false;
        }
        
        // ✅ Verificar extensión (más flexible)
        const validExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff)(\?.*)?$/i;
        return validExtensions.test(url) || 
               url.includes('unsplash.com') || 
               url.includes('pixabay.com') ||
               url.includes('pexels.com');
    } catch {
        return false;
    }
}
```

### Problema 5: Eventos no se bind correctamente en opciones dinámicas
**Síntomas:**
- Las nuevas opciones añadidas no responden a clics
- Solo funcionan las opciones iniciales

**Solución:**
```javascript
// Usar event delegation en lugar de binding directo
bindImageChoiceEvents($question, question) {
    const self = this;
    
    // ✅ Event delegation - funciona para elementos dinámicos
    $question.off('click.image-upload').on('click.image-upload', '.sfq-upload-image-btn', function(e) {
        e.preventDefault();
        const $button = $(this);
        const $optionItem = $button.closest('.sfq-option-item');
        const optionIndex = $optionItem.index();
        self.openMediaLibrary($button, $optionItem, question, optionIndex);
    });
    
    $question.off('input.image-url').on('input.image-url', '.sfq-image-url-input', function() {
        const $input = $(this);
        self.handleUrlInput($input, question);
    });
    
    $question.off('click.remove-image').on('click.remove-image', '.sfq-remove-image', function(e) {
        e.preventDefault();
        const $button = $(this);
        self.removeImage($button, question);
    });
}
```

### Problema 6: Conflictos con otros plugins
**Síntomas:**
- La Media Library se comporta de forma extraña
- Errores JavaScript intermitentes

**Solución:**
```javascript
// Crear instancia única del media uploader
openMediaLibrary($button, $optionItem, question, optionIndex) {
    // ✅ Limpiar instancias previas
    if (this.mediaUploader) {
        this.mediaUploader.off();
        this.mediaUploader = null;
    }
    
    // ✅ Crear nueva instancia
    this.mediaUploader = wp.media({
        title: 'Seleccionar Imagen para Opción',
        button: { text: 'Usar esta imagen' },
        multiple: false,
        library: { type: 'image' }
    });
    
    // ✅ Bind eventos una sola vez
    this.mediaUploader.on('select', () => {
        const attachment = this.mediaUploader.state().get('selection').first().toJSON();
        this.updateImageOption($optionItem, attachment, question, optionIndex);
        
        // ✅ Limpiar después del uso
        this.mediaUploader.off();
        this.mediaUploader = null;
    });
    
    this.mediaUploader.open();
}
```

---

## Conclusión

El componente `sfq-image-upload-section` es un sistema robusto y completo para la gestión de imágenes en formularios. Su arquitectura modular permite:

1. **Reutilización fácil** en diferentes contextos
2. **Escalabilidad** para múltiples opciones dinámicas
3. **Integración nativa** con WordPress
4. **Validación robusta** de seguridad
5. **Experiencia de usuario fluida** con previews en tiempo real

### Puntos Clave para la Implementación:
- ✅ Siempre enqueue `wp_enqueue_media()`
- ✅ Usar event delegation para elementos dinámicos
- ✅ Implementar validación tanto en frontend como backend
- ✅ Manejar correctamente la repoblación de datos
- ✅ Proporcionar feedback visual al usuario
- ✅ Limpiar instancias de media uploader para evitar conflictos

Esta guía proporciona todo lo necesario para implementar un sistema similar en otros proyectos, adaptando los selectores y nombres de clases según sea necesario.
