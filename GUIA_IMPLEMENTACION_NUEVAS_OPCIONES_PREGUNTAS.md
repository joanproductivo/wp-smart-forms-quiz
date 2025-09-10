# Guía Completa para Implementar Nuevas Opciones en Preguntas

## Índice
1. [Introducción](#introducción)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Implementación de Opciones de Imagen](#implementación-de-opciones-de-imagen)
4. [Implementación de Campos de Texto Descriptivo](#implementación-de-campos-de-texto-descriptivo)
5. [Pasos Generales para Añadir Nuevas Opciones](#pasos-generales-para-añadir-nuevas-opciones)
6. [Ejemplos Prácticos](#ejemplos-prácticos)
7. [Validación y Guardado](#validación-y-guardado)
8. [Troubleshooting](#troubleshooting)

## Introducción

Esta guía explica cómo implementar nuevas opciones en preguntas del plugin Smart Forms & Quiz, usando como ejemplos la implementación de imágenes de pregunta y campos de texto descriptivo. El sistema está diseñado para ser modular y extensible, permitiendo añadir fácilmente nuevas funcionalidades.

### Características del Sistema
- ✅ Arquitectura modular y extensible
- ✅ Soporte para múltiples tipos de pregunta
- ✅ Validación automática de datos
- ✅ Repoblación automática al recargar
- ✅ Responsive design
- ✅ Integración con WordPress Media Library

## Arquitectura del Sistema

### Componentes Principales

```
Smart Forms & Quiz
├── UIRenderer.js          # Renderizado de componentes UI
├── QuestionManager.js     # Gestión de preguntas y opciones
├── EventManager.js        # Manejo de eventos
├── DataValidator.js       # Validación de datos
└── Backend (PHP)
    ├── class-sfq-ajax.php # Procesamiento AJAX
    └── class-sfq-frontend.php # Renderizado frontend
```

### Flujo de Datos

```
1. Usuario configura opción → UIRenderer genera HTML
2. EventManager captura eventos → QuestionManager actualiza datos
3. DataValidator valida → Backend procesa y guarda
4. Al recargar → QuestionManager repobla → UIRenderer muestra
```

## Implementación de Opciones de Imagen

### Paso 1: Definir Tipos de Pregunta Objetivo

En `UIRenderer.js`, define qué tipos de pregunta soportarán la nueva opción:

```javascript
// En UIRenderer.js - Método renderQuestionImageSection
renderQuestionImageSection(question) {
    // ✅ DEFINIR: Tipos de pregunta que soportan imagen
    const targetTypes = ['single_choice', 'multiple_choice', 'rating', 'text', 'email'];
    if (!targetTypes.includes(question.type)) {
        return '';
    }
    
    // Resto de la implementación...
}
```

### Paso 2: Crear la Interfaz HTML

```javascript
// En UIRenderer.js
renderQuestionImageSection(question) {
    const imageConfig = question.settings?.question_image || {};
    const hasImage = imageConfig.url && imageConfig.url.trim() !== '';
    
    return `
        <div class="sfq-question-image-section">
            <h4>🖼️ Imagen de la Pregunta</h4>
            
            <!-- Controles de subida -->
            <div class="sfq-image-controls">
                <button type="button" class="button sfq-upload-question-image-btn">
                    <span class="dashicons dashicons-upload"></span>
                    Subir Imagen
                </button>
                <input type="url" class="sfq-question-image-url-input ${hasImage ? 'valid' : ''}" 
                       placeholder="O pega URL de imagen..." 
                       value="${this.escapeHtml(imageConfig.url || '')}">
            </div>
            
            <!-- Configuración de imagen -->
            <div class="sfq-question-image-config" style="display: ${hasImage ? 'block' : 'none'};">
                <div class="sfq-config-row">
                    <label>
                        <span>Posición:</span>
                        <select class="sfq-question-image-position">
                            <option value="top" ${imageConfig.position === 'top' || !imageConfig.position ? 'selected' : ''}>⬆️ Arriba</option>
                            <option value="left" ${imageConfig.position === 'left' ? 'selected' : ''}>⬅️ Izquierda</option>
                            <option value="right" ${imageConfig.position === 'right' ? 'selected' : ''}>➡️ Derecha</option>
                            <option value="bottom" ${imageConfig.position === 'bottom' ? 'selected' : ''}>⬇️ Abajo</option>
                        </select>
                    </label>
                    
                    <label>
                        <span>Ancho:</span>
                        <input type="range" class="sfq-question-image-width" 
                               min="100" max="800" step="10" 
                               value="${imageConfig.width || 300}">
                        <span class="width-display">${imageConfig.width || 300}px</span>
                    </label>
                </div>
                
                <div class="sfq-config-row">
                    <label>
                        <input type="checkbox" class="sfq-question-image-shadow" 
                               ${imageConfig.shadow ? 'checked' : ''}>
                        <span>🌟 Sombreado</span>
                    </label>
                    
                    <label>
                        <input type="checkbox" class="sfq-question-image-mobile-force" 
                               ${imageConfig.mobile_force_position ? 'checked' : ''}>
                        <span>📱 Forzar posición en móvil</span>
                    </label>
                </div>
            </div>
            
            <!-- Vista previa -->
            <div class="sfq-question-image-preview" style="display: ${hasImage ? 'block' : 'none'};">
                <div class="sfq-image-preview">
                    <img src="${this.escapeHtml(imageConfig.url || '')}" 
                         alt="${this.escapeHtml(imageConfig.alt || 'Vista previa')}" 
                         class="sfq-preview-image">
                    <button type="button" class="sfq-remove-question-image">
                        <span class="dashicons dashicons-no-alt"></span>
                    </button>
                </div>
            </div>
        </div>
    `;
}
```

### Paso 3: Integrar en el Renderizado de Preguntas

```javascript
// En UIRenderer.js - Método renderQuestion
renderQuestion(question) {
    // ... código existente ...
    
    const html = `
        <div class="sfq-question-item" id="${question.id}">
            <!-- ... contenido existente ... -->
            
            <!-- ✅ INTEGRAR: Sección de imagen de pregunta -->
            ${this.renderQuestionImageSection(question)}
            
            <!-- ... resto del contenido ... -->
        </div>
    `;
    
    return $(html);
}
```

### Paso 4: Implementar Event Handlers

En `QuestionManager.js`, añadir eventos específicos:

```javascript
// En QuestionManager.js - Método bindQuestionEvents
bindQuestionEvents(questionId) {
    const $question = $(`#${questionId}`);
    const question = this.questions.find(q => q.id === questionId);
    
    // ... eventos existentes ...
    
    // ✅ NUEVO: Eventos para imagen de pregunta
    if (['single_choice', 'multiple_choice', 'rating', 'text', 'email'].includes(question.type)) {
        this.bindQuestionImageEvents($question, question);
    }
}

// ✅ NUEVO: Método específico para eventos de imagen
bindQuestionImageEvents($question, question) {
    const self = this;
    
    // Evento para abrir WordPress Media Library
    $question.find('.sfq-upload-question-image-btn').off('click').on('click', function(e) {
        e.preventDefault();
        self.openQuestionImageMediaLibrary($(this), $question, question);
    });
    
    // Evento para URL manual
    $question.find('.sfq-question-image-url-input').off('input').on('input', function() {
        const $input = $(this);
        const url = $input.val().trim();
        
        if (url && self.isValidImageUrl(url)) {
            self.updateQuestionImageConfig(question, {
                url: url,
                alt: 'Imagen desde URL'
            });
            self.showQuestionImageConfig($question);
            $input.removeClass('invalid').addClass('valid');
        } else if (url) {
            $input.removeClass('valid').addClass('invalid');
            self.hideQuestionImageConfig($question);
        } else {
            $input.removeClass('valid invalid');
            self.hideQuestionImageConfig($question);
            self.clearQuestionImageConfig(question);
        }
        
        self.formBuilder.isDirty = true;
    });
    
    // Eventos para configuración
    $question.find('.sfq-question-image-position').off('change').on('change', function() {
        self.updateQuestionImageSetting(question, 'position', $(this).val());
    });
    
    $question.find('.sfq-question-image-width').off('input').on('input', function() {
        const value = $(this).val();
        $question.find('.width-display').text(value + 'px');
        self.updateQuestionImageSetting(question, 'width', parseInt(value));
    });
    
    $question.find('.sfq-question-image-shadow').off('change').on('change', function() {
        self.updateQuestionImageSetting(question, 'shadow', $(this).is(':checked'));
    });
    
    $question.find('.sfq-question-image-mobile-force').off('change').on('change', function() {
        const isChecked = $(this).is(':checked');
        self.updateQuestionImageSetting(question, 'mobile_force_position', isChecked);
        
        // Mostrar/ocultar configuración de ancho móvil
        const $mobileConfig = $question.find('.sfq-mobile-width-config');
        if (isChecked) {
            $mobileConfig.show();
        } else {
            $mobileConfig.hide();
        }
    });
    
    // Evento para eliminar imagen
    $question.find('.sfq-remove-question-image').off('click').on('click', function(e) {
        e.preventDefault();
        self.removeQuestionImage($question, question);
    });
}
```

### Paso 5: Implementar Métodos de Gestión

```javascript
// En QuestionManager.js
openQuestionImageMediaLibrary($button, $question, question) {
    if (typeof wp === 'undefined' || !wp.media) {
        alert('WordPress Media Library no está disponible');
        return;
    }
    
    const mediaUploader = wp.media({
        title: 'Seleccionar Imagen para Pregunta',
        button: { text: 'Usar esta imagen' },
        multiple: false,
        library: { type: 'image' }
    });
    
    mediaUploader.on('select', () => {
        const attachment = mediaUploader.state().get('selection').first().toJSON();
        
        if (this.isValidAttachment(attachment)) {
            this.updateQuestionImageConfig(question, {
                url: attachment.url,
                id: attachment.id,
                alt: attachment.alt || attachment.title || 'Imagen de pregunta'
            });
            
            this.updateQuestionImageUI($question, attachment.url);
        }
    });
    
    mediaUploader.open();
}

updateQuestionImageConfig(question, imageData) {
    if (!question.settings) {
        question.settings = {};
    }
    
    if (!question.settings.question_image) {
        question.settings.question_image = {};
    }
    
    Object.assign(question.settings.question_image, imageData);
    this.formBuilder.isDirty = true;
}

updateQuestionImageSetting(question, setting, value) {
    if (!question.settings) {
        question.settings = {};
    }
    
    if (!question.settings.question_image) {
        question.settings.question_image = {};
    }
    
    question.settings.question_image[setting] = value;
    this.formBuilder.isDirty = true;
}
```

### Paso 6: Implementar Repoblación

```javascript
// En QuestionManager.js - Método loadQuestions
loadQuestions(questionsData) {
    // ... código existente ...
    
    normalQuestions.forEach(question => {
        const element = this.formBuilder.uiRenderer.renderQuestion(question);
        this.container.append(element);
        this.bindQuestionEvents(question.id);
        
        // ✅ NUEVO: Repoblar imagen de pregunta para tipos objetivo
        if (['single_choice', 'multiple_choice', 'rating', 'text', 'email'].includes(question.type)) {
            this.repopulateQuestionImage(question.id, question);
        }
    });
}

repopulateQuestionImage(questionId, question) {
    const targetTypes = ['single_choice', 'multiple_choice', 'rating', 'text', 'email'];
    if (!targetTypes.includes(question.type)) {
        return;
    }
    
    const imageConfig = question.settings?.question_image;
    if (!imageConfig || !imageConfig.url) {
        return;
    }
    
    setTimeout(() => {
        this._performQuestionImageRepopulation(questionId, question, imageConfig);
    }, 150);
}
```

## Implementación de Campos de Texto Descriptivo

### Paso 1: Definir la Estructura HTML

```javascript
// En UIRenderer.js
renderQuestionDescriptionSection(question) {
    const targetTypes = ['single_choice', 'multiple_choice', 'rating', 'text', 'email'];
    if (!targetTypes.includes(question.type)) {
        return '';
    }
    
    const descConfig = question.settings?.question_description || {};
    const hasDescription = descConfig.text && descConfig.text.trim() !== '';
    
    return `
        <div class="sfq-question-description-section">
            <h4>📝 Texto Descriptivo</h4>
            
            <!-- Campo de texto -->
            <div class="sfq-description-controls">
                <label>
                    <span>Descripción adicional:</span>
                    <textarea class="sfq-question-description-input" 
                              placeholder="Añade una descripción o instrucciones adicionales..."
                              rows="3">${this.escapeHtml(descConfig.text || '')}</textarea>
                </label>
            </div>
            
            <!-- Configuración de estilo -->
            <div class="sfq-description-config" style="display: ${hasDescription ? 'block' : 'none'};">
                <div class="sfq-config-row">
                    <label>
                        <span>Posición:</span>
                        <select class="sfq-description-position">
                            <option value="top" ${descConfig.position === 'top' || !descConfig.position ? 'selected' : ''}>⬆️ Arriba del título</option>
                            <option value="below_title" ${descConfig.position === 'below_title' ? 'selected' : ''}>⬇️ Debajo del título</option>
                            <option value="below_options" ${descConfig.position === 'below_options' ? 'selected' : ''}>⬇️ Debajo de las opciones</option>
                        </select>
                    </label>
                    
                    <label>
                        <span>Estilo:</span>
                        <select class="sfq-description-style">
                            <option value="normal" ${descConfig.style === 'normal' || !descConfig.style ? 'selected' : ''}>Normal</option>
                            <option value="italic" ${descConfig.style === 'italic' ? 'selected' : ''}>Cursiva</option>
                            <option value="bold" ${descConfig.style === 'bold' ? 'selected' : ''}>Negrita</option>
                            <option value="small" ${descConfig.style === 'small' ? 'selected' : ''}>Texto pequeño</option>
                        </select>
                    </label>
                </div>
                
                <div class="sfq-config-row">
                    <label>
                        <span>Color del texto:</span>
                        <input type="color" class="sfq-description-color" 
                               value="${descConfig.color || '#666666'}">
                    </label>
                    
                    <label>
                        <input type="checkbox" class="sfq-description-highlight" 
                               ${descConfig.highlight ? 'checked' : ''}>
                        <span>Resaltar con fondo</span>
                    </label>
                </div>
            </div>
            
            <!-- Vista previa -->
            <div class="sfq-description-preview" style="display: ${hasDescription ? 'block' : 'none'};">
                <div class="sfq-description-preview-content" 
                     style="color: ${descConfig.color || '#666666'}; 
                            font-style: ${descConfig.style === 'italic' ? 'italic' : 'normal'};
                            font-weight: ${descConfig.style === 'bold' ? 'bold' : 'normal'};
                            font-size: ${descConfig.style === 'small' ? '0.9em' : '1em'};
                            background: ${descConfig.highlight ? '#f0f8ff' : 'transparent'};
                            padding: ${descConfig.highlight ? '8px 12px' : '0'};
                            border-radius: ${descConfig.highlight ? '4px' : '0'};">
                    📝 ${this.escapeHtml(descConfig.text || 'Vista previa del texto descriptivo')}
                </div>
            </div>
        </div>
    `;
}
```

### Paso 2: Implementar Event Handlers

```javascript
// En QuestionManager.js
bindQuestionDescriptionEvents($question, question) {
    const self = this;
    
    // Evento para cambio de texto
    $question.find('.sfq-question-description-input').off('input').on('input', function() {
        const text = $(this).val().trim();
        
        self.updateQuestionDescriptionSetting(question, 'text', text);
        
        if (text) {
            self.showQuestionDescriptionConfig($question);
            self.updateDescriptionPreview($question, question);
        } else {
            self.hideQuestionDescriptionConfig($question);
            self.clearQuestionDescriptionConfig(question);
        }
    });
    
    // Eventos para configuración
    $question.find('.sfq-description-position').off('change').on('change', function() {
        self.updateQuestionDescriptionSetting(question, 'position', $(this).val());
        self.updateDescriptionPreview($question, question);
    });
    
    $question.find('.sfq-description-style').off('change').on('change', function() {
        self.updateQuestionDescriptionSetting(question, 'style', $(this).val());
        self.updateDescriptionPreview($question, question);
    });
    
    $question.find('.sfq-description-color').off('change').on('change', function() {
        self.updateQuestionDescriptionSetting(question, 'color', $(this).val());
        self.updateDescriptionPreview($question, question);
    });
    
    $question.find('.sfq-description-highlight').off('change').on('change', function() {
        self.updateQuestionDescriptionSetting(question, 'highlight', $(this).is(':checked'));
        self.updateDescriptionPreview($question, question);
    });
}

updateDescriptionPreview($question, question) {
    const descConfig = question.settings?.question_description || {};
    const $preview = $question.find('.sfq-description-preview-content');
    
    if ($preview.length > 0 && descConfig.text) {
        $preview.text('📝 ' + descConfig.text);
        $preview.css({
            'color': descConfig.color || '#666666',
            'font-style': descConfig.style === 'italic' ? 'italic' : 'normal',
            'font-weight': descConfig.style === 'bold' ? 'bold' : 'normal',
            'font-size': descConfig.style === 'small' ? '0.9em' : '1em',
            'background': descConfig.highlight ? '#f0f8ff' : 'transparent',
            'padding': descConfig.highlight ? '8px 12px' : '0',
            'border-radius': descConfig.highlight ? '4px' : '0'
        });
    }
}
```

## Pasos Generales para Añadir Nuevas Opciones

### 1. Planificación

**Definir:**
- ✅ Tipos de pregunta que soportarán la opción
- ✅ Estructura de datos necesaria
- ✅ Interfaz de usuario requerida
- ✅ Validaciones necesarias
- ✅ Comportamiento responsive

### 2. Implementación Frontend

**UIRenderer.js:**
```javascript
// 1. Crear método de renderizado
renderNewOptionSection(question) {
    const targetTypes = ['single_choice', 'multiple_choice']; // Definir tipos
    if (!targetTypes.includes(question.type)) {
        return '';
    }
    
    const config = question.settings?.new_option || {};
    
    return `
        <div class="sfq-new-option-section">
            <!-- HTML de la interfaz -->
        </div>
    `;
}

// 2. Integrar en renderQuestion
renderQuestion(question) {
    const html = `
        <div class="sfq-question-item" id="${question.id}">
            <!-- ... contenido existente ... -->
            ${this.renderNewOptionSection(question)}
            <!-- ... resto del contenido ... -->
        </div>
    `;
    return $(html);
}
```

**QuestionManager.js:**
```javascript
// 1. Añadir eventos en bindQuestionEvents
bindQuestionEvents(questionId) {
    // ... eventos existentes ...
    
    if (this.supportsNewOption(question.type)) {
        this.bindNewOptionEvents($question, question);
    }
}

// 2. Implementar eventos específicos
bindNewOptionEvents($question, question) {
    const self = this;
    
    $question.find('.sfq-new-option-input').off('input').on('input', function() {
        const value = $(this).val();
        self.updateNewOptionSetting(question, 'value', value);
    });
}

// 3. Implementar métodos de gestión
updateNewOptionSetting(question, setting, value) {
    if (!question.settings) {
        question.settings = {};
    }
    
    if (!question.settings.new_option) {
        question.settings.new_option = {};
    }
    
    question.settings.new_option[setting] = value;
    this.formBuilder.isDirty = true;
}

// 4. Implementar repoblación
repopulateNewOption(questionId, question) {
    if (!this.supportsNewOption(question.type)) {
        return;
    }
    
    const config = question.settings?.new_option;
    if (!config) {
        return;
    }
    
    setTimeout(() => {
        this._performNewOptionRepopulation(questionId, question, config);
    }, 150);
}
```

### 3. Implementación Backend

**class-sfq-ajax.php:**
```php
// 1. Validar datos en validate_question_data
private function validate_question_data($question, $index) {
    $errors = array();
    
    // Validar nueva opción si existe
    if (isset($question['settings']['new_option'])) {
        $new_option = $question['settings']['new_option'];
        
        // Validaciones específicas
        if (!empty($new_option['value']) && !is_string($new_option['value'])) {
            $errors['new_option'] = 'Valor de nueva opción inválido';
        }
    }
    
    return $errors;
}

// 2. Procesar datos en save_form_data
private function process_question_settings($settings) {
    $processed = array();
    
    // Procesar nueva opción
    if (isset($settings['new_option'])) {
        $processed['new_option'] = array(
            'value' => sanitize_text_field($settings['new_option']['value'] ?? ''),
            'enabled' => (bool) ($settings['new_option']['enabled'] ?? false)
        );
    }
    
    return $processed;
}
```

**class-sfq-frontend.php:**
```php
// 1. Renderizar en frontend
private function render_question_new_option($question) {
    $settings = $question['settings'] ?? array();
    $new_option = $settings['new_option'] ?? array();
    
    if (empty($new_option['enabled']) || empty($new_option['value'])) {
        return '';
    }
    
    return sprintf(
        '<div class="sfq-new-option">%s</div>',
        esc_html($new_option['value'])
    );
}

// 2. Integrar en render_question
private function render_question($question, $form_data) {
    $html = '';
    
    // ... renderizado existente ...
    
    // Añadir nueva opción
    $html .= $this->render_question_new_option($question);
    
    return $html;
}
```

### 4. Estilos CSS

```css
/* En admin-consolidated.css */
.sfq-new-option-section {
    margin-top: 15px;
    padding: 15px;
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 6px;
}

.sfq-new-option-controls {
    display: flex;
    gap: 15px;
    align-items: center;
    flex-wrap: wrap;
}

.sfq-new-option-input {
    flex: 1;
    min-width: 200px;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 13px;
}

.sfq-new-option-preview {
    margin-top: 10px;
    padding: 10px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
}

/* Responsive */
@media (max-width: 768px) {
    .sfq-new-option-controls {
        flex-direction: column;
        align-items: stretch;
    }
    
    .sfq-new-option-input {
        min-width: auto;
    }
}
```

```css
/* En frontend.css */
.sfq-new-option {
    margin: 10px 0;
    padding: 8px 12px;
    background: #f0f8ff;
    border-left: 3px solid #007cba;
    border-radius: 4px;
    font-size: 14px;
    color: #333;
}

.sfq-new-option.highlight {
    background: #fff3cd;
    border-left-color: #ffc107;
}
```

## Ejemplos Prácticos

### Ejemplo 1: Campo de Ayuda Contextual

```javascript
// UIRenderer.js
renderQuestionHelpSection(question) {
    const targetTypes = ['single_choice', 'multiple_choice', 'text'];
    if (!targetTypes.includes(question.type)) {
        return '';
    }
    
    const helpConfig = question.settings?.question_help || {};
    
    return `
        <div class="sfq-question-help-section">
            <h4>❓ Ayuda Contextual</h4>
            
            <div class="sfq-help-controls">
                <label>
                    <span>Texto de ayuda:</span>
                    <textarea class="sfq-question-help-input" 
                              placeholder="Añade texto de ayuda o instrucciones..."
                              rows="2">${this.escapeHtml(helpConfig.text || '')}</textarea>
                </label>
                
                <label>
                    <span>Tipo de ayuda:</span>
                    <select class="sfq-help-type">
                        <option value="tooltip" ${helpConfig.type === 'tooltip' ? 'selected' : ''}>Tooltip</option>
                        <option value="expandable" ${helpConfig.type === 'expandable' ? 'selected' : ''}>Expandible</option>
                        <option value="sidebar" ${helpConfig.type === 'sidebar' ? 'selected' : ''}>Barra lateral</option>
                    </select>
                </label>
            </div>
        </div>
    `;
}
```

### Ejemplo 2: Temporizador de Pregunta

```javascript
// UIRenderer.js
renderQuestionTimerSection(question) {
    const targetTypes = ['single_choice', 'multiple_choice'];
    if (!targetTypes.includes(question.type)) {
        return '';
    }
    
    const timerConfig = question.settings?.question_timer || {};
    
    return `
        <div class="sfq-question-timer-section">
            <h4>⏱️ Temporizador</h4>
            
            <div class="sfq-timer-controls">
                <label>
                    <input type="checkbox" class="sfq-timer-enabled" 
                           ${timerConfig.enabled ? 'checked' : ''}>
                    <span>Activar temporizador</span>
                </label>
                
                <div class="sfq-timer-config" style="display: ${timerConfig.enabled ? 'block' : 'none'};">
                    <label>
                        <span>Tiempo límite (segundos):</span>
                        <input type="number" class="sfq-timer-duration" 
                               min="10" max="300" step="5"
                               value="${timerConfig.duration || 60}">
                    </label>
                    
                    <label>
                        <span>Acción al terminar:</span>
                        <select class="sfq-timer-action">
                            <option value="auto_submit" ${timerConfig.action === 'auto_submit' ? 'selected' : ''}>Enviar automáticamente</option>
                            <option value="show_warning" ${timerConfig.action === 'show_warning' ? 'selected' : ''}>Mostrar advertencia</option>
                            <option value="disable_question" ${timerConfig.action === 'disable_question' ? 'selected' : ''}>Deshabilitar pregunta</option>
                        </select>
                    </label>
                </div>
            </div>
        </div>
    `;
}
```

### Ejemplo 3: Validación Personalizada

```javascript
// UIRenderer.js
renderQuestionValidationSection(question) {
    const targetTypes = ['text', 'email'];
    if (!targetTypes.includes(question.type)) {
        return '';
    }
    
    const validationConfig = question.settings?.question_validation || {};
    
    return `
        <div class="sfq-question-validation-section">
            <h4>✅ Validación Personalizada</h4>
            
            <div class="sfq-validation-controls">
                <label>
                    <input type="checkbox" class="sfq-validation-enabled" 
                           ${validationConfig.enabled ? 'checked' : ''}>
                    <span>Activar validación personalizada</span>
                </label>
                
                <div class="sfq-validation-config" style="display: ${validationConfig.enabled ? 'block' : 'none'};">
                    <label>
                        <span>Tipo de validación:</span>
                        <select class="sfq-validation-type">
                            <option value="regex" ${validationConfig.type === 'regex' ? 'selected' : ''}>Expresión regular</option>
                            <option value="length" ${validationConfig.type === 'length' ? 'selected' : ''}>Longitud</option>
                            <option value="format" ${validationConfig.type === 'format' ? 'selected' : ''}>Formato específico</option>
                        </select>
                    </label>
                    
                    <label>
                        <span>Patrón/Regla:</span>
                        <input type="text" class="sfq-validation-pattern" 
                               value="${this.escapeHtml(validationConfig.pattern || '')}"
                               placeholder="Ej: ^[A-Z]{2}[0-9]{4}$ para formato AA1234">
                    </label>
                    
                    <label>
                        <span>Mensaje de error:</span>
                        <input type="text" class="sfq-validation-message" 
                               value="${this.escapeHtml(validationConfig.message || '')}"
                               placeholder="Mensaje que se mostrará si la validación falla">
                    </label>
                </div>
            </div>
        </div>
    `;
}
```

## Validación y Guardado

### Validación Frontend

```javascript
// En DataValidator.js
validateNewOption(question, optionData) {
    const errors = [];
    
    // Validaciones específicas según el tipo de opción
    switch (optionData.type) {
        case 'question_image':
            if (optionData.url && !this.isValidImageUrl(optionData.url)) {
                errors.push('URL de imagen no válida');
            }
            if (optionData.width && (optionData.width < 50 || optionData.width > 1000)) {
                errors.push('Ancho de imagen debe estar entre 50 y 1000 píxeles');
            }
            break;
            
        case 'question_description':
            if (optionData.text && optionData.text.length > 1000) {
                errors.push('Descripción no puede exceder 1000 caracteres');
            }
            break;
            
        case 'question_timer':
            if (optionData.enabled && (!optionData.duration || optionData.duration < 10)) {
                errors.push('Duración del temporizador debe ser al menos 10 segundos');
            }
            break;
    }
    
    return errors;
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
```

### Validación Backend

```php
// En class-sfq-ajax.php
private function validate_question_settings($settings, $question_type) {
    $errors = array();
    
    // Validar imagen de pregunta
    if (isset($settings['question_image'])) {
        $image_config = $settings['question_image'];
        
        if (!empty($image_config['url'])) {
            if (!filter_var($image_config['url'], FILTER_VALIDATE_URL)) {
                $errors[] = 'URL de imagen de pregunta no válida';
            }
            
            // Validar extensión
            $valid_extensions = array('jpg', 'jpeg', 'png', 'gif', 'webp', 'svg');
            $extension = strtolower(pathinfo(parse_url($image_config['url'], PHP_URL_PATH), PATHINFO_EXTENSION));
            
            if (!in_array($extension, $valid_extensions)) {
                $errors[] = 'Formato de imagen no soportado';
            }
        }
        
        if (isset($image_config['width'])) {
            $width = intval($image_config['width']);
            if ($width < 50 || $width > 1000) {
                $errors[] = 'Ancho de imagen debe estar entre 50 y 1000 píxeles';
            }
        }
    }
    
    // Validar descripción de pregunta
    if (isset($settings['question_description'])) {
        $desc_config = $settings['question_description'];
        
        if (!empty($desc_config['text'])) {
            if (strlen($desc_config['text']) > 1000) {
                $errors[] = 'Descripción de pregunta no puede exceder 1000 caracteres';
            }
            
            // Sanitizar HTML básico
            $allowed_tags = '<b><i><u><strong><em><br>';
            $desc_config['text'] = strip_tags($desc_config['text'], $allowed_tags);
        }
    }
    
    // Validar temporizador
    if (isset($settings['question_timer'])) {
        $timer_config = $settings['question_timer'];
        
        if (!empty($timer_config['enabled'])) {
            $duration = intval($timer_config['duration'] ?? 0);
            if ($duration < 10 || $duration > 3600) {
                $errors[] = 'Duración del temporizador debe estar entre 10 y 3600 segundos';
            }
            
            $valid_actions = array('auto_submit', 'show_warning', 'disable_question');
            if (!in_array($timer_config['action'] ?? '', $valid_actions)) {
                $errors[] = 'Acción del temporizador no válida';
            }
        }
    }
    
    return $errors;
}

private function sanitize_question_settings($settings) {
    $sanitized = array();
    
    // Sanitizar imagen de pregunta
    if (isset($settings['question_image'])) {
        $image_config = $settings['question_image'];
        $sanitized['question_image'] = array(
            'url' => esc_url_raw($image_config['url'] ?? ''),
            'id' => intval($image_config['id'] ?? 0),
            'alt' => sanitize_text_field($image_config['alt'] ?? ''),
            'position' => sanitize_text_field($image_config['position'] ?? 'top'),
            'width' => intval($image_config['width'] ?? 300),
            'shadow' => (bool) ($image_config['shadow'] ?? false),
            'mobile_force_position' => (bool) ($image_config['mobile_force_position'] ?? false),
            'mobile_width' => intval($image_config['mobile_width'] ?? 150)
        );
    }
    
    // Sanitizar descripción de pregunta
    if (isset($settings['question_description'])) {
        $desc_config = $settings['question_description'];
        $sanitized['question_description'] = array(
            'text' => wp_kses_post($desc_config['text'] ?? ''),
            'position' => sanitize_text_field($desc_config['position'] ?? 'below_title'),
            'style' => sanitize_text_field($desc_config['style'] ?? 'normal'),
            'color' => sanitize_hex_color($desc_config['color'] ?? '#666666'),
            'highlight' => (bool) ($desc_config['highlight'] ?? false)
        );
    }
    
    // Sanitizar temporizador
    if (isset($settings['question_timer'])) {
        $timer_config = $settings['question_timer'];
        $sanitized['question_timer'] = array(
            'enabled' => (bool) ($timer_config['enabled'] ?? false),
            'duration' => intval($timer_config['duration'] ?? 60),
            'action' => sanitize_text_field($timer_config['action'] ?? 'show_warning')
        );
    }
    
    return $sanitized;
}
```

### Guardado en Base de Datos

```php
// En class-sfq-ajax.php - Método save_form_data
private function save_question($question_data, $form_id, $order) {
    global $wpdb;
    
    // Procesar settings
    $settings = $this->sanitize_question_settings($question_data['settings'] ?? array());
    
    // Preparar datos para inserción
    $data = array(
        'form_id' => $form_id,
        'question_text' => sanitize_textarea_field($question_data['question_text']),
        'question_type' => sanitize_text_field($question_data['question_type']),
        'required' => (bool) ($question_data['required'] ?? false),
        'order_position' => intval($order),
        'settings' => wp_json_encode($settings), // ✅ Guardar settings como JSON
        'created_at' => current_time('mysql'),
        'updated_at' => current_time('mysql')
    );
    
    // Insertar o actualizar
    if (!empty($question_data['id'])) {
        // Actualizar pregunta existente
        $result = $wpdb->update(
            $wpdb->prefix . 'sfq_questions',
            $data,
            array('id' => intval($question_data['id'])),
            array('%d', '%s', '%s', '%d', '%d', '%s', '%s', '%s'),
            array('%d')
        );
        $question_id = intval($question_data['id']);
    } else {
        // Insertar nueva pregunta
        $result = $wpdb->insert(
            $wpdb->prefix . 'sfq_questions',
            $data,
            array('%d', '%s', '%s', '%d', '%d', '%s', '%s', '%s')
        );
        $question_id = $wpdb->insert_id;
    }
    
    if ($result === false) {
        throw new Exception('Error al guardar pregunta: ' . $wpdb->last_error);
    }
    
    return $question_id;
}
```

## Troubleshooting

### Problema 1: La nueva opción no se muestra

**Síntomas:**
- La sección de la nueva opción no aparece en el admin
- No hay errores en consola

**Solución:**
```javascript
// Verificar que el tipo de pregunta esté incluido
renderNewOptionSection(question) {
    const targetTypes = ['single_choice', 'multiple_choice', 'rating', 'text', 'email'];
    
    // ✅ DEBUG: Log para verificar tipo
    console.log('SFQ: Question type:', question.type, 'Target types:', targetTypes);
    
    if (!targetTypes.includes(question.type)) {
        console.log('SFQ: Question type not supported for new option');
        return '';
    }
    
    // Resto de la implementación...
}

// Verificar que se integre en renderQuestion
renderQuestion(question) {
    const html = `
        <div class="sfq-question-item" id="${question.id}">
            <!-- ... contenido existente ... -->
            
            <!-- ✅ VERIFICAR: Que esta línea esté presente -->
            ${this.renderNewOptionSection(question)}
            
            <!-- ... resto del contenido ... -->
        </div>
    `;
    
    return $(html);
}
```

### Problema 2: Los eventos no funcionan

**Síntomas:**
- Los controles no responden a clics o cambios
- Errores de "handler is not a function"

**Solución:**
```javascript
// En QuestionManager.js - Verificar binding de eventos
bindQuestionEvents(questionId) {
    const $question = $(`#${questionId}`);
    const question = this.questions.find(q => q.id === questionId);
    
    // ... eventos existentes ...
    
    // ✅ VERIFICAR: Que esta línea esté presente
    if (this.supportsNewOption(question.type)) {
        this.bindNewOptionEvents($question, question);
    }
}

// ✅ IMPLEMENTAR: Método de soporte
supportsNewOption(questionType) {
    const supportedTypes = ['single_choice', 'multiple_choice', 'rating', 'text', 'email'];
    return supportedTypes.includes(questionType);
}

// ✅ VERIFICAR: Que los eventos usen el contexto correcto
bindNewOptionEvents($question, question) {
    const self = this; // ✅ CRÍTICO: Guardar referencia
    
    $question.find('.sfq-new-option-input').off('input').on('input', function() {
        const value = $(this).val();
        self.updateNewOptionSetting(question, 'value', value); // ✅ Usar self
    });
}
```

### Problema 3: Los datos no se guardan

**Síntomas:**
- La configuración se pierde al recargar
- No hay errores visibles

**Solución:**
```javascript
// Verificar que updateNewOptionSetting marque como dirty
updateNewOptionSetting(question, setting, value) {
    if (!question.settings) {
        question.settings = {};
    }
    
    if (!question.settings.new_option) {
        question.settings.new_option = {};
    }
    
    question.settings.new_option[setting] = value;
    
    // ✅ CRÍTICO: Marcar como modificado
    this.formBuilder.isDirty = true;
    
    // ✅ DEBUG: Log para verificar
    console.log('SFQ: Updated new option setting:', setting, value);
    console.log('SFQ: Question settings:', question.settings);
}

// Verificar que getQuestionsData incluya los settings
getQuestionsData() {
    return this.questions.map((question, index) => {
        const baseData = {
            question_text: question.text,
            question_type: question.type,
            required: question.required ? 1 : 0,
            order_position: index,
            settings: question.settings || {} // ✅ CRÍTICO: Incluir settings
        };
        
        // ✅ DEBUG: Log para verificar settings
        console.log('SFQ: Question settings being saved:', baseData.settings);
        
        return baseData;
    });
}
```

### Problema 4: La repoblación no funciona

**Síntomas:**
- Los datos se guardan pero no se muestran al recargar
- Los controles aparecen vacíos

**Solución:**
```javascript
// En loadQuestions, verificar que se llame la repoblación
loadQuestions(questionsData) {
    // ... código existente ...
    
    normalQuestions.forEach(question => {
        const element = this.formBuilder.uiRenderer.renderQuestion(question);
        this.container.append(element);
        this.bindQuestionEvents(question.id);
        
        // ✅ VERIFICAR: Que se llame la repoblación
        if (this.supportsNewOption(question.type)) {
            this.repopulateNewOption(question.id, question);
        }
    });
}

// Implementar repoblación con timeout
repopulateNewOption(questionId, question) {
    const config = question.settings?.new_option;
    if (!config) {
        console.log('SFQ: No new option config found for question:', questionId);
        return;
    }
    
    console.log('SFQ: Repopulating new option for question:', questionId, config);
    
    // ✅ CRÍTICO: Usar timeout para asegurar que el DOM esté listo
    setTimeout(() => {
        this._performNewOptionRepopulation(questionId, question, config);
    }, 150);
}

_performNewOptionRepopulation(questionId, question, config) {
    const $question = $(`#${questionId}`);
    
    if ($question.length === 0) {
        console.error('SFQ: Question element not found for repopulation:', questionId);
        return;
    }
    
    // Repoblar cada campo
    Object.keys(config).forEach(key => {
        const $field = $question.find(`[data-setting="${key}"]`);
        
        if ($field.length > 0) {
            if ($field.attr('type') === 'checkbox') {
                $field.prop('checked', config[key]);
            } else {
                $field.val(config[key]);
            }
            
            console.log('SFQ: Repopulated field:', key, config[key]);
        }
    });
}
```

### Problema 5: Conflictos con otros plugins

**Síntomas:**
- Errores JavaScript intermitentes
- Funcionalidad que funciona a veces

**Solución:**
```javascript
// Usar namespaces únicos para eventos
bindNewOptionEvents($question, question) {
    const self = this;
    const namespace = '.sfq_new_option_' + question.id;
    
    // ✅ Limpiar eventos previos con namespace
    $question.find('.sfq-new-option-input').off(namespace);
    
    // ✅ Usar namespace específico
    $question.find('.sfq-new-option-input').on('input' + namespace, function() {
        const value = $(this).val();
        self.updateNewOptionSetting(question, 'value', value);
    });
}

// Verificar dependencias antes de usar
initNewOption() {
    // ✅ Verificar jQuery
    if (typeof $ === 'undefined') {
        console.error('SFQ: jQuery not available');
        return false;
    }
    
    // ✅ Verificar WordPress Media Library si es necesario
    if (this.requiresMediaLibrary && (typeof wp === 'undefined' || !wp.media)) {
        console.error('SFQ: WordPress Media Library not available');
        return false;
    }
    
    return true;
}
```

## Conclusión

Esta guía proporciona un framework completo para implementar nuevas opciones en preguntas del plugin Smart Forms & Quiz. Los puntos clave son:

### Mejores Prácticas

1. **Modularidad**: Cada opción debe ser independiente y reutilizable
2. **Validación**: Implementar validación tanto en frontend como backend
3. **Repoblación**: Asegurar que los datos se restauren correctamente
4. **Responsive**: Considerar el comportamiento en dispositivos móviles
5. **Debugging**: Incluir logs para facilitar el troubleshooting

### Checklist de Implementación

- ✅ Definir tipos de pregunta objetivo
- ✅ Crear interfaz HTML en UIRenderer
- ✅ Implementar eventos en QuestionManager
- ✅ Añadir validación en DataValidator
- ✅ Procesar datos en backend (PHP)
- ✅ Implementar repoblación
- ✅ Añadir estilos CSS
- ✅ Probar en diferentes escenarios
- ✅ Documentar la nueva funcionalidad

### Recursos Adicionales

- **Documentación de WordPress Media Library**: [WordPress Codex](https://codex.wordpress.org/Javascript_Reference/wp.media)
- **Guías existentes del plugin**: Ver otros archivos GUIA_*.md en el proyecto
- **Ejemplos de implementación**: Revisar el código de imagen de pregunta como referencia

Con esta guía, cualquier desarrollador puede extender el plugin añadiendo nuevas opciones de forma consistente y mantenible.
