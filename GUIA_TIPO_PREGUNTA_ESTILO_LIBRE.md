# Guía para Implementar Tipo de Pregunta "Estilo Libre"
## Smart Forms & Quiz Plugin - WordPress

### Versión: 1.0
### Fecha: Enero 2025

---

## 📋 Índice

1. [Introducción](#introducción)
2. [Arquitectura del Tipo "Estilo Libre"](#arquitectura-del-tipo-estilo-libre)
3. [Estructura de Datos](#estructura-de-datos)
4. [Elementos Disponibles](#elementos-disponibles)
5. [Implementación Paso a Paso](#implementación-paso-a-paso)
6. [Patrones de Código](#patrones-de-código)
7. [Validaciones y Seguridad](#validaciones-y-seguridad)
8. [Testing y Verificación](#testing-y-verificación)
9. [Plan de Fases](#plan-de-fases)

---

## 🎯 Introducción

El tipo de pregunta **"Estilo libre"** (`freestyle`) es un contenedor flexible que permite combinar múltiples elementos de diferentes tipos dentro de una sola pregunta. Esta funcionalidad revoluciona la creación de formularios al permitir diseños complejos y personalizados.

### Características Principales

- **🔧 Modular**: Cada elemento es independiente con sus propias configuraciones
- **🎨 Flexible**: Combina diferentes tipos de elementos en una pregunta
- **📱 Responsivo**: Adaptable a diferentes dispositivos
- **⚡ Eficiente**: Reutiliza componentes existentes del sistema
- **🔒 Seguro**: Validaciones específicas por tipo de elemento

---

## 🏗️ Arquitectura del Tipo "Estilo Libre"

### Concepto Base

```
Pregunta "Estilo Libre"
├── Texto de la pregunta principal
├── Elemento 1 (ej: Campo de texto)
│   ├── Configuraciones específicas
│   └── Validaciones propias
├── Elemento 2 (ej: Video de YouTube)
│   ├── Configuraciones específicas
│   └── Validaciones propias
└── Elemento N (ej: Valoración con estrellas)
    ├── Configuraciones específicas
    └── Validaciones propias
```

### Integración con Sistema Existente

El tipo `freestyle` se integra perfectamente con la arquitectura actual:

- **Base de datos**: Usa el campo `options` existente para almacenar `freestyle_elements`
- **Admin Builder**: Extiende `QuestionManager` con nuevos renderizadores
- **Frontend**: Añade `render_freestyle_question()` a `SFQ_Frontend`
- **Validación**: Utiliza `SFQ_Utils` para validaciones específicas

---

## 📊 Estructura de Datos

### Formato JSON en Base de Datos

```json
{
  "question_type": "freestyle",
  "question_text": "Completa tu perfil",
  "required": true,
  "freestyle_elements": [
    {
      "id": "element_1",
      "type": "text",
      "label": "Nombre completo",
      "settings": {
        "placeholder": "Introduce tu nombre",
        "required": true,
        "max_length": 100,
        "validation_pattern": ""
      },
      "order": 1
    },
    {
      "id": "element_2",
      "type": "video",
      "label": "Video de presentación",
      "settings": {
        "video_url": "https://www.youtube.com/watch?v=...",
        "autoplay": false,
        "show_controls": true,
        "width": "100%",
        "height": "315"
      },
      "order": 2
    },
    {
      "id": "element_3",
      "type": "rating",
      "label": "¿Cómo nos valoras?",
      "settings": {
        "max_rating": 5,
        "rating_type": "stars",
        "required": false,
        "custom_icons": {
          "empty": "☆",
          "filled": "★"
        }
      },
      "order": 3
    }
  ],
  "global_settings": {
    "layout": "vertical",
    "spacing": "normal",
    "show_element_numbers": false,
    "allow_reorder": false
  }
}
```

---

## 🧩 Elementos Disponibles

### 1. 📝 Texto (`text`)

**Propósito**: Campo de texto libre para respuestas cortas o largas.

**Configuraciones**:
```json
{
  "type": "text",
  "settings": {
    "input_type": "text|textarea|password",
    "placeholder": "Texto de ayuda",
    "required": true,
    "min_length": 0,
    "max_length": 500,
    "validation_pattern": "",
    "validation_message": "Formato inválido",
    "rows": 3,
    "cols": 50
  }
}
```

**Renderizado Frontend**:
```php
private function render_freestyle_text($element) {
    $settings = $element['settings'];
    $input_type = $settings['input_type'] ?? 'text';
    
    if ($input_type === 'textarea') {
        return sprintf(
            '<textarea name="freestyle_%s" placeholder="%s" rows="%d" cols="%d" %s class="sfq-freestyle-textarea">%s</textarea>',
            esc_attr($element['id']),
            esc_attr($settings['placeholder'] ?? ''),
            intval($settings['rows'] ?? 3),
            intval($settings['cols'] ?? 50),
            ($settings['required'] ?? false) ? 'required' : '',
            esc_textarea($element['value'] ?? '')
        );
    } else {
        return sprintf(
            '<input type="%s" name="freestyle_%s" placeholder="%s" maxlength="%d" %s class="sfq-freestyle-input" value="%s">',
            esc_attr($input_type),
            esc_attr($element['id']),
            esc_attr($settings['placeholder'] ?? ''),
            intval($settings['max_length'] ?? 500),
            ($settings['required'] ?? false) ? 'required' : '',
            esc_attr($element['value'] ?? '')
        );
    }
}
```

### 2. 🎥 Video (`video`)

**Propósito**: Insertar videos de YouTube, Vimeo o archivos locales.

**Configuraciones**:
```json
{
  "type": "video",
  "settings": {
    "video_url": "https://www.youtube.com/watch?v=...",
    "video_type": "youtube|vimeo|local",
    "autoplay": false,
    "show_controls": true,
    "muted": false,
    "loop": false,
    "width": "100%",
    "height": "315",
    "responsive": true
  }
}
```

### 3. 🖼️ Imagen (`image`)

**Propósito**: Mostrar imágenes desde URL o archivos subidos.

**Configuraciones**:
```json
{
  "type": "image",
  "settings": {
    "image_url": "https://ejemplo.com/imagen.jpg",
    "alt_text": "Descripción de la imagen",
    "width": "auto",
    "height": "auto",
    "alignment": "center|left|right",
    "clickable": false,
    "click_url": "",
    "caption": "Pie de imagen"
  }
}
```

### 4. ⏰ Cuenta Atrás (`countdown`)

**Propósito**: Mostrar un timer de cuenta atrás.

**Configuraciones**:
```json
{
  "type": "countdown",
  "settings": {
    "target_date": "2025-12-31 23:59:59",
    "timezone": "Europe/Madrid",
    "format": "dhms|hms|ms",
    "labels": {
      "days": "días",
      "hours": "horas", 
      "minutes": "min",
      "seconds": "seg"
    },
    "on_finish": "hide|show_message|redirect",
    "finish_message": "¡Tiempo agotado!",
    "finish_url": ""
  }
}
```

### 5. 📞 Teléfono (`phone`)

**Propósito**: Campo de teléfono con validación internacional.

**Configuraciones**:
```json
{
  "type": "phone",
  "settings": {
    "required": true,
    "country_code": "ES",
    "format": "international|national|e164",
    "placeholder": "+34 600 000 000",
    "validation_strict": true,
    "allowed_countries": ["ES", "FR", "IT"]
  }
}
```

### 6. 📧 Email (`email`)

**Propósito**: Campo de email con validación avanzada.

**Configuraciones**:
```json
{
  "type": "email",
  "settings": {
    "required": true,
    "placeholder": "tu@email.com",
    "confirm_email": false,
    "blocked_domains": ["tempmail.com"],
    "allowed_domains": [],
    "validation_message": "Email inválido"
  }
}
```

### 7. 📤 Subir Imagen (`file_upload`)

**Propósito**: Permitir subida de archivos de imagen.

**Configuraciones**:
```json
{
  "type": "file_upload",
  "settings": {
    "required": false,
    "accepted_types": ["jpg", "jpeg", "png", "gif"],
    "max_file_size": 5242880,
    "max_files": 1,
    "preview": true,
    "upload_text": "Seleccionar archivo",
    "drag_drop": true
  }
}
```

### 8. 🔘 Botón (`button`)

**Propósito**: Botón personalizable con diferentes acciones.

**Configuraciones**:
```json
{
  "type": "button",
  "settings": {
    "button_text": "Hacer clic aquí",
    "button_style": "primary|secondary|outline",
    "action_type": "url|javascript|submit|next",
    "action_value": "https://ejemplo.com",
    "target": "_blank|_self",
    "icon": "dashicons-external",
    "disabled": false
  }
}
```

### 9. ⭐ Valoración (`rating`)

**Propósito**: Sistema de valoración personalizable.

**Configuraciones**:
```json
{
  "type": "rating",
  "settings": {
    "max_rating": 5,
    "rating_type": "stars|hearts|thumbs|numbers|custom",
    "required": false,
    "allow_half": false,
    "custom_icons": {
      "empty": "☆",
      "filled": "★",
      "half": "⭐"
    },
    "labels": ["Muy malo", "Malo", "Regular", "Bueno", "Excelente"]
  }
}
```

### 10. 📋 Desplegable (`dropdown`)

**Propósito**: Lista desplegable de opciones.

**Configuraciones**:
```json
{
  "type": "dropdown",
  "settings": {
    "required": false,
    "placeholder": "Selecciona una opción",
    "multiple": false,
    "searchable": false,
    "options": [
      {"value": "opcion1", "text": "Opción 1"},
      {"value": "opcion2", "text": "Opción 2"}
    ]
  }
}
```

### 11. ☑️ Opción Check (`checkbox`)

**Propósito**: Checkbox individual para confirmaciones.

**Configuraciones**:
```json
{
  "type": "checkbox",
  "settings": {
    "required": true,
    "checked_by_default": false,
    "checkbox_text": "Acepto los términos y condiciones",
    "validation_message": "Debes aceptar para continuar"
  }
}
```

### 12. ⚖️ Texto RGPD (`legal_text`)

**Propósito**: Texto legal con enlaces y formato especial.

**Configuraciones**:
```json
{
  "type": "legal_text",
  "settings": {
    "text_content": "Al enviar este formulario aceptas nuestra [política de privacidad](url) y [términos de uso](url).",
    "text_size": "small|normal|large",
    "text_style": "normal|italic|bold",
    "background": true,
    "border": true,
    "links": [
      {"text": "política de privacidad", "url": "/privacidad"},
      {"text": "términos de uso", "url": "/terminos"}
    ]
  }
}
```

---

## 🔧 Implementación Paso a Paso

### Paso 1: Modificar Admin Builder (`admin-builder-v2.js`)

#### 1.1 Añadir Botón "Estilo Libre"

Localizar `.sfq-question-type-grid` en `class-sfq-admin.php` y añadir:

```php
<button class="sfq-add-question" data-type="freestyle">
    <span class="dashicons dashicons-admin-tools"></span>
    <?php _e('Estilo Libre', 'smart-forms-quiz'); ?>
</button>
```

#### 1.2 Extender QuestionManager

Añadir en `admin-builder-v2.js`:

```javascript
// Añadir al método createQuestionObject
createQuestionObject(data, index) {
    // ... código existente ...
    
    if (data.question_type === 'freestyle') {
        return {
            id: questionId,
            originalId: data.id || null,
            text: data.question_text || '',
            type: 'freestyle',
            freestyle_elements: this.processFreestyleElements(data.freestyle_elements || []),
            required: this.formBuilder.dataValidator.normalizeBoolean(data.required),
            order: index,
            conditions: [],
            settings: data.settings || {},
            global_settings: data.global_settings || {
                layout: 'vertical',
                spacing: 'normal',
                show_element_numbers: false
            }
        };
    }
    
    // ... resto del código existente ...
}

// Nuevo método para procesar elementos freestyle
processFreestyleElements(elements) {
    if (!Array.isArray(elements)) return [];
    
    return elements.map((element, index) => ({
        id: element.id || 'element_' + Date.now() + '_' + index,
        type: element.type || 'text',
        label: element.label || '',
        settings: element.settings || {},
        order: element.order || index,
        value: element.value || ''
    }));
}
```

#### 1.3 Extender UIRenderer

```javascript
// Añadir al método renderQuestion
renderQuestion(question) {
    if (question.type === 'freestyle') {
        return this.renderFreestyleQuestion(question);
    }
    
    // ... código existente ...
}

// Nuevo método para renderizar pregunta freestyle
renderFreestyleQuestion(question) {
    const typeLabels = {
        'freestyle': 'Estilo Libre'
    };

    const elementsHtml = this.renderFreestyleElements(question.freestyle_elements || []);
    const controlsHtml = this.renderFreestyleControls(question.id);

    const html = `
        <div class="sfq-question-item sfq-freestyle-question" id="${question.id}" data-type="freestyle">
            <div class="sfq-question-header">
                <span class="sfq-question-type-label">${typeLabels.freestyle}</span>
                <div class="sfq-question-actions">
                    <button class="sfq-question-action sfq-move-handle" type="button" title="Mover">
                        <span class="dashicons dashicons-move"></span>
                    </button>
                    <button class="sfq-question-action sfq-duplicate-question" type="button" title="Duplicar">
                        <span class="dashicons dashicons-admin-page"></span>
                    </button>
                    <button class="sfq-question-action sfq-delete-question" type="button" title="Eliminar">
                        <span class="dashicons dashicons-trash"></span>
                    </button>
                </div>
            </div>
            
            <div class="sfq-question-content">
                <input type="text" class="sfq-question-text-input" 
                       placeholder="Escribe tu pregunta aquí..." 
                       value="${this.escapeHtml(question.text)}">
                
                <div class="sfq-freestyle-container">
                    <div class="sfq-freestyle-elements" id="freestyle-elements-${question.id}">
                        ${elementsHtml}
                    </div>
                    
                    ${controlsHtml}
                </div>
                
                <div class="sfq-question-settings">
                    <label>
                        <input type="checkbox" class="sfq-required-checkbox" 
                               ${question.required ? 'checked' : ''}>
                        Pregunta obligatoria
                    </label>
                </div>
            </div>
        </div>
    `;

    return $(html);
}

// Renderizar elementos freestyle
renderFreestyleElements(elements) {
    if (!elements || elements.length === 0) {
        return '<div class="sfq-freestyle-empty">No hay elementos añadidos</div>';
    }
    
    return elements.map(element => this.renderFreestyleElement(element)).join('');
}

// Renderizar elemento individual
renderFreestyleElement(element) {
    const elementTypes = {
        'text': '📝 Texto',
        'video': '🎥 Video', 
        'image': '🖼️ Imagen',
        'countdown': '⏰ Cuenta atrás',
        'phone': '📞 Teléfono',
        'email': '📧 Email',
        'file_upload': '📤 Subir imagen',
        'button': '🔘 Botón',
        'rating': '⭐ Valoración',
        'dropdown': '📋 Desplegable',
        'checkbox': '☑️ Opción Check',
        'legal_text': '⚖️ Texto RGPD'
    };
    
    return `
        <div class="sfq-freestyle-element" data-element-id="${element.id}" data-element-type="${element.type}">
            <div class="sfq-freestyle-element-header">
                <span class="sfq-freestyle-element-type">${elementTypes[element.type] || element.type}</span>
                <div class="sfq-freestyle-element-actions">
                    <button class="sfq-freestyle-action sfq-move-element" type="button" title="Mover">
                        <span class="dashicons dashicons-move"></span>
                    </button>
                    <button class="sfq-freestyle-action sfq-configure-element" type="button" title="Configurar">
                        <span class="dashicons dashicons-admin-generic"></span>
                    </button>
                    <button class="sfq-freestyle-action sfq-duplicate-element" type="button" title="Duplicar">
                        <span class="dashicons dashicons-admin-page"></span>
                    </button>
                    <button class="sfq-freestyle-action sfq-delete-element" type="button" title="Eliminar">
                        <span class="dashicons dashicons-trash"></span>
                    </button>
                </div>
            </div>
            
            <div class="sfq-freestyle-element-content">
                <div class="sfq-freestyle-element-label">
                    <input type="text" placeholder="Etiqueta del elemento" 
                           value="${this.escapeHtml(element.label)}" 
                           class="sfq-element-label-input">
                </div>
                
                <div class="sfq-freestyle-element-preview">
                    ${this.renderElementPreview(element)}
                </div>
                
                <div class="sfq-freestyle-element-settings" style="display: none;">
                    ${this.renderElementSettings(element)}
                </div>
            </div>
        </div>
    `;
}

// Renderizar controles para añadir elementos
renderFreestyleControls(questionId) {
    return `
        <div class="sfq-freestyle-controls">
            <div class="sfq-freestyle-add-buttons">
                <button class="sfq-add-freestyle-element" data-type="text" data-question="${questionId}">
                    📝 Texto
                </button>
                <button class="sfq-add-freestyle-element" data-type="video" data-question="${questionId}">
                    🎥 Video
                </button>
                <button class="sfq-add-freestyle-element" data-type="image" data-question="${questionId}">
                    🖼️ Imagen
                </button>
                <button class="sfq-add-freestyle-element" data-type="countdown" data-question="${questionId}">
                    ⏰ Cuenta atrás
                </button>
                <button class="sfq-add-freestyle-element" data-type="phone" data-question="${questionId}">
                    📞 Teléfono
                </button>
                <button class="sfq-add-freestyle-element" data-type="email" data-question="${questionId}">
                    📧 Email
                </button>
                <button class="sfq-add-freestyle-element" data-type="file_upload" data-question="${questionId}">
                    📤 Subir imagen
                </button>
                <button class="sfq-add-freestyle-element" data-type="button" data-question="${questionId}">
                    🔘 Botón
                </button>
                <button class="sfq-add-freestyle-element" data-type="rating" data-question="${questionId}">
                    ⭐ Valoración
                </button>
                <button class="sfq-add-freestyle-element" data-type="dropdown" data-question="${questionId}">
                    📋 Desplegable
                </button>
                <button class="sfq-add-freestyle-element" data-type="checkbox" data-question="${questionId}">
                    ☑️ Opción Check
                </button>
                <button class="sfq-add-freestyle-element" data-type="legal_text" data-question="${questionId}">
                    ⚖️ Texto RGPD
                </button>
            </div>
        </div>
    `;
}
```

### Paso 2: Modificar Frontend (`class-sfq-frontend.php`)

#### 2.1 Añadir Renderizado Freestyle

```php
// Añadir al método render_question_type
private function render_question_type($question) {
    switch ($question->question_type) {
        // ... casos existentes ...
        
        case 'freestyle':
            $this->render_freestyle_question($question);
            break;
            
        default:
            echo '<p>' . __('Tipo de pregunta no soportado', 'smart-forms-quiz') . '</p>';
    }
}

// Nuevo método para renderizar pregunta freestyle
private function render_freestyle_question($question) {
    $elements = $question->freestyle_elements ?? array();
    
    if (empty($elements)) {
        echo '<p>' . __('No hay elementos configurados', 'smart-forms-quiz') . '</p>';
        return;
    }
    
    // Ordenar elementos por orden
    usort($elements, function($a, $b) {
        return ($a['order'] ?? 0) - ($b['order'] ?? 0);
    });
    
    echo '<div class="sfq-freestyle-container" data-question-id="' . esc_attr($question->id) . '">';
    
    foreach ($elements as $element) {
        $this->render_freestyle_element($element, $question);
    }
    
    echo '</div>';
}

// Renderizar elemento individual
private function render_freestyle_element($element, $question) {
    $element_type = $element['type'] ?? 'text';
    $element_id = $element['id'] ?? 'element_' . uniqid();
    $label = $element['label'] ?? '';
    $settings = $element['settings'] ?? array();
    
    echo '<div class="sfq-freestyle-element sfq-element-' . esc_attr($element_type) . '" data-element-id="' . esc_attr($element_id) . '">';
    
    if (!empty($label)) {
        echo '<label class="sfq-freestyle-label">' . esc_html($label) . '</label>';
    }
    
    switch ($element_type) {
        case 'text':
            $this->render_freestyle_text($element);
            break;
        case 'video':
            $this->render_freestyle_video($element);
            break;
        case 'image':
            $this->render_freestyle_image($element);
            break;
        case 'countdown':
            $this->render_freestyle_countdown($element);
            break;
        case 'phone':
            $this->render_freestyle_phone($element);
            break;
        case 'email':
            $this->render_freestyle_email($element);
            break;
        case 'file_upload':
            $this->render_freestyle_file_upload($element);
            break;
        case 'button':
            $this->render_freestyle_button($element);
            break;
        case 'rating':
            $this->render_freestyle_rating($element);
            break;
        case 'dropdown':
            $this->render_freestyle_dropdown($element);
            break;
        case 'checkbox':
            $this->render_freestyle_checkbox($element);
            break;
        case 'legal_text':
            $this->render_freestyle_legal_text($element);
            break;
        default:
            echo '<p>' . sprintf(__('Elemento tipo "%s" no soportado', 'smart-forms-quiz'), esc_html($element_type)) . '</p>';
    }
    
    echo '</div>';
}
```

#### 2.2 Implementar Renderizadores Específicos

```php
// Renderizar elemento de texto
private function render_freestyle_text($element) {
    $settings = $element['settings'] ?? array();
    $input_type = $settings['input_type'] ?? 'text';
    $placeholder = $settings['placeholder'] ?? '';
    $required = $settings['required'] ?? false;
    $max_length = $settings['max_length'] ?? 500;
    $value = $element['value'] ?? '';
    
    if ($input_type === 'textarea') {
        $rows = $settings['rows'] ?? 3;
        $cols = $settings['cols'] ?? 50;
        
        printf(
            '<textarea name="freestyle_%s" placeholder="%s" rows="%d" cols="%d" maxlength="%d" %s class="sfq-freestyle-textarea">%s</textarea>',
            esc_attr($element['id']),
            esc_attr($placeholder),
            intval($rows),
            intval($cols),
            intval($max_length),
            $required ? 'required' : '',
            esc_textarea($value)
        );
    } else {
        printf(
            '<input type="%s" name="freestyle_%s" placeholder="%s" maxlength="%d" %s class="sfq-freestyle-input" value="%s">',
            esc_attr($input_type),
            esc_attr($element['id']),
            esc_attr($placeholder),
            intval($max_length),
            $required ? 'required' : '',
            esc_attr($value)
        );
    }
}

// Renderizar elemento de video
private function render_freestyle_video($element) {
    $settings = $element['settings'] ?? array();
    $video_url = $settings['video_url'] ?? '';
    
    if (empty($video_url)) {
        echo '<p class="sfq-error">' . __('URL de video no configurada', 'smart-forms-quiz') . '</p>';
        return;
    }
    
    $video_embed = $this->convert_video_url_to_embed($video_url);
    
    if ($video_embed) {
        echo '<div class="sfq-freestyle-video-container">' . $video_embed . '</div>';
    } else {
        echo '<p class="sfq-error">' . __('URL de video no válida', 'smart-forms-quiz') . '</p>';
    }
}

// Renderizar elemento de imagen
private function render_freestyle_image($element) {
    $settings = $element['settings'] ?? array();
    $image_url = $settings['image_url'] ?? '';
    $alt_text = $settings['alt_text'] ?? '';
    $width = $settings['width'] ?? 'auto';
    $height = $settings['height'] ?? 'auto';
    $alignment = $settings['alignment'] ?? 'center';
    $caption = $settings['caption'] ?? '';
    
    if (empty($image_url)) {
        echo '<p class="sfq-error">' . __('URL de imagen no configurada', 'smart-forms-quiz') . '</p>';
        return;
    }
    
    $style = sprintf(
        'width: %s; height: %s; text-align: %s;',
        esc_attr($width),
        esc_attr($height),
        esc_attr($alignment)
    );
    
    echo '<div class="sfq-freestyle-image-container" style="' . $style . '">';
    echo '<img src="' . esc_url($image_url) . '" alt="' . esc_attr($alt_text) . '" class="sfq-freestyle-image">';
    
    if (!empty($caption)) {
        echo '<div class="sfq-freestyle-image-caption">' . esc_html($caption) . '</div>';
    }
    
    echo '</div>';
}

// Renderizar elemento de cuenta atrás
private function render_freestyle_countdown($element) {
    $settings = $element['settings'] ?? array();
    $target_date = $settings['target_date'] ?? '';
    $format = $settings['format'] ?? 'dhms';
    $labels = $settings['labels'] ?? array(
        'days' => __('días', 'smart-forms-quiz'),
        'hours' => __('horas', 'smart-forms-quiz'),
        'minutes' => __('min', 'smart-forms-quiz'),
        'seconds' => __('seg', 'smart-forms-quiz')
    );
    
    if (empty($target_date)) {
        echo '<p class="sfq-error">' . __('Fecha objetivo no configurada', 'smart-forms-quiz') . '</p>';
        return;
    }
    
    $element_id = 'countdown_' . $element['id'];
    
    echo '<div class="sfq-freestyle-countdown" id="' . esc_attr($element_id) . '" data-target="' . esc_attr($target_date) . '" data-format="' . esc_attr($format) . '">';
    echo '<div class="sfq-countdown-display">';
    
    if (strpos($format, 'd') !== false) {
        echo '<div class="sfq-countdown-unit"><span class="sfq-countdown-number" id="days-' . esc_attr($element_id) . '">0</span><span class="sfq-countdown-label">' . esc_html($labels['days']) . '</span></div>';
    }
    if (strpos($format, 'h') !== false) {
        echo '<div class="sfq-countdown-unit"><span class="sfq-countdown-number" id="hours-' . esc_attr($element_id) . '">0</span><span class="sfq-countdown-label">' . esc_html($labels['hours']) . '</span></div>';
    }
    if (strpos($format, 'm') !== false) {
        echo '<div class="sfq-countdown-unit"><span class="sfq-countdown-number" id="minutes-' . esc_attr($element_id) . '">0</span><span class="sfq-countdown-label">' . esc_html($labels['minutes']) . '</span></div>';
    }
    if (strpos($format, 's') !== false) {
        echo '<div class="sfq-countdown-unit"><span class="sfq-countdown-number" id="seconds-' . esc_attr($element_id) . '">0</span><span class="sfq-countdown-label">' . esc_html($labels['seconds']) . '</span></div>';
    }
    
    echo '</div>';
    echo '</div>';
}

// Renderizar elemento de teléfono
private function render_freestyle_phone($element) {
    $settings = $element['settings'] ?? array();
    $placeholder = $settings['placeholder'] ?? '+34 600 000 000';
    $required = $settings['required'] ?? false;
    $country_code = $settings['country_code'] ?? 'ES';
    
    printf(
        '<input type="tel" name="freestyle_%s" placeholder="%s" %s class="sfq-freestyle-phone" data-country="%s">',
        esc_attr($element['id']),
        esc_attr($placeholder),
        $required ? 'required' : '',
        esc_attr($country_code)
    );
}

// Renderizar elemento de email
private function render_freestyle_email($element) {
    $settings = $element['settings'] ?? array();
    $placeholder = $settings['placeholder'] ?? 'tu@email.com';
    $required = $settings['required'] ?? false;
    $confirm_email = $settings['confirm_email'] ?? false;
    
    printf(
        '<input type="email" name="freestyle_%s" placeholder="%s" %s class="sfq-freestyle-email">',
        esc_attr($element['id']),
        esc_attr($placeholder),
        $required ? 'required' : ''
    );
    
    if ($confirm_email) {
        printf(
            '<input type="email" name="freestyle_%s_confirm" placeholder="%s" %s class="sfq-freestyle-email-confirm">',
            esc_attr($element['id']),
            __('Confirmar email', 'smart-forms-quiz'),
            $required ? 'required' : ''
        );
    }
}

// Renderizar elemento de subida de archivo
private function render_freestyle_file_upload($element) {
    $settings = $element['settings'] ?? array();
    $accepted_types = $settings['accepted_types'] ?? array('jpg', 'jpeg', 'png', 'gif');
    $max_file_size = $settings['max_file_size'] ?? 5242880; // 5MB
    $upload_text = $settings['upload_text'] ?? __('Seleccionar archivo', 'smart-forms-quiz');
    $required = $settings['required'] ?? false;
    
    $accept_attr = 'image/' . implode(',image/', $accepted_types);
    
    echo '<div class="sfq-freestyle-file-upload">';
    printf(
        '<input type="file" name="freestyle_%s" accept="%s" %s class="sfq-freestyle-file-input" id="file_%s">',
        esc_attr($element['id']),
        esc_attr($accept_attr),
        $required ? 'required' : '',
        esc_attr($element['id'])
    );
    printf(
        '<label for="file_%s" class="sfq-freestyle-file-label">%s</label>',
        esc_attr($element['id']),
        esc_html($upload_text)
    );
    echo '<div class="sfq-freestyle-file-preview"></div>';
    echo '</div>';
}

// Renderizar elemento de botón
private function render_freestyle_button($element) {
    $settings = $element['settings'] ?? array();
    $button_text = $settings['button_text'] ?? __('Hacer clic aquí', 'smart-forms-quiz');
    $button_style = $settings['button_style'] ?? 'primary';
    $action_type = $settings['action_type'] ?? 'url';
    $action_value = $settings['action_value'] ?? '';
    $target = $settings['target'] ?? '_self';
    $disabled = $settings['disabled'] ?? false;
    
    $class = 'sfq-freestyle-button sfq-button-' . esc_attr($button_style);
    $attributes = '';
    
    if ($action_type === 'url' && !empty($action_value)) {
        printf(
            '<a href="%s" target="%s" class="%s">%s</a>',
            esc_url($action_value),
            esc_attr($target),
            esc_attr($class),
            esc_html($button_text)
        );
    } else {
        printf(
            '<button type="button" class="%s" data-action="%s" data-value="%s" %s>%s</button>',
            esc_attr($class),
            esc_attr($action_type),
            esc_attr($action_value),
            $disabled ? 'disabled' : '',
            esc_html($button_text)
        );
    }
}

// Renderizar elemento de valoración
private function render_freestyle_rating($element) {
    $settings = $element['settings'] ?? array();
    $max_rating = $settings['max_rating'] ?? 5;
    $rating_type = $settings['rating_type'] ?? 'stars';
    $required = $settings['required'] ?? false;
    $custom_icons = $settings['custom_icons'] ?? array();
    
    echo '<div class="sfq-freestyle-rating" data-element-id="' . esc_attr($element['id']) . '" data-type="' . esc_attr($rating_type) . '">';
    
    if ($rating_type === 'stars') {
        for ($i = 1; $i <= $max_rating; $i++) {
            printf(
                '<button class="sfq-rating-star" data-value="%d" type="button">★</button>',
                $i
            );
        }
    } elseif ($rating_type === 'hearts') {
        for ($i = 1; $i <= $max_rating; $i++) {
            printf(
                '<button class="sfq-rating-heart" data-value="%d" type="button">♥</button>',
                $i
            );
        }
    }
    
    printf(
        '<input type="hidden" name="freestyle_%s" value="" %s>',
        esc_attr($element['id']),
        $required ? 'required' : ''
    );
    
    echo '</div>';
}

// Renderizar elemento desplegable
private function render_freestyle_dropdown($element) {
    $settings = $element['settings'] ?? array();
    $placeholder = $settings['placeholder'] ?? __('Selecciona una opción', 'smart-forms-quiz');
    $required = $settings['required'] ?? false;
    $multiple = $settings['multiple'] ?? false;
    $options = $settings['options'] ?? array();
    
    printf(
        '<select name="freestyle_%s%s" %s %s class="sfq-freestyle-dropdown">',
        esc_attr($element['id']),
        $multiple ? '[]' : '',
        $required ? 'required' : '',
        $multiple ? 'multiple' : ''
    );
    
    if (!$multiple) {
        printf('<option value="">%s</option>', esc_html($placeholder));
    }
    
    foreach ($options as $option) {
        printf(
            '<option value="%s">%s</option>',
            esc_attr($option['value']),
            esc_html($option['text'])
        );
    }
    
    echo '</select>';
}

// Renderizar elemento checkbox
private function render_freestyle_checkbox($element) {
    $settings = $element['settings'] ?? array();
    $checkbox_text = $settings['checkbox_text'] ?? __('Acepto los términos', 'smart-forms-quiz');
    $required = $settings['required'] ?? false;
    $checked_by_default = $settings['checked_by_default'] ?? false;
    
    printf(
        '<label class="sfq-freestyle-checkbox-label"><input type="checkbox" name="freestyle_%s" value="1" %s %s class="sfq-freestyle-checkbox"> %s</label>',
        esc_attr($element['id']),
        $required ? 'required' : '',
        $checked_by_default ? 'checked' : '',
        esc_html($checkbox_text)
    );
}

// Renderizar elemento de texto legal
private function render_freestyle_legal_text($element) {
    $settings = $element['settings'] ?? array();
    $text_content = $settings['text_content'] ?? '';
    $text_size = $settings['text_size'] ?? 'normal';
    $text_style = $settings['text_style'] ?? 'normal';
    $background = $settings['background'] ?? true;
    $border = $settings['border'] ?? true;
    $links = $settings['links'] ?? array();
    
    $class = 'sfq-freestyle-legal-text';
    $class .= ' sfq-text-' . esc_attr($text_size);
    $class .= ' sfq-style-' . esc_attr($text_style);
    if ($background) $class .= ' sfq-with-background';
    if ($border) $class .= ' sfq-with-border';
    
    // Procesar enlaces en el texto
    $processed_text = $text_content;
    foreach ($links as $link) {
        $link_html = sprintf('<a href="%s" target="_blank">%s</a>', esc_url($link['url']), esc_html($link['text']));
        $processed_text = str_replace('[' . $link['text'] . '](url)', $link_html, $processed_text);
    }
    
    printf(
        '<div class="%s">%s</div>',
        esc_attr($class),
        wp_kses_post($processed_text)
    );
}
```

### Paso 3: Añadir Estilos CSS

Crear archivo `assets/css/freestyle.css`:

```css
/* Estilos para preguntas Freestyle */
.sfq-freestyle-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.sfq-freestyle-element {
    background: var(--sfq-options-background-color);
    border: 2px solid #e0e0e0;
    border-radius: var(--sfq-border-radius);
    padding: 1.25rem;
    transition: var(--sfq-transition);
}

.sfq-freestyle-label {
    display: block;
    font-weight: 600;
    margin-bottom: 0.75rem;
    color: var(--sfq-text-color);
}

/* Elementos específicos */
.sfq-freestyle-input,
.sfq-freestyle-textarea,
.sfq-freestyle-phone,
.sfq-freestyle-email,
.sfq-freestyle-dropdown {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d0d0d0;
    border-radius: calc(var(--sfq-border-radius) / 2);
    font-family: var(--sfq-font-family);
    font-size: 1rem;
    transition: var(--sfq-transition);
}

.sfq-freestyle-input:focus,
.sfq-freestyle-textarea:focus,
.sfq-freestyle-phone:focus,
.sfq-freestyle-email:focus,
.sfq-freestyle-dropdown:focus {
    outline: none;
    border-color: var(--sfq-primary-color);
    box-shadow: 0 0 0 3px rgba(var(--sfq-primary-color), 0.1);
}

/* Video container */
.sfq-freestyle-video-container {
    position: relative;
    padding-bottom: 56.25%;
    height: 0;
    overflow: hidden;
    border-radius: var(--sfq-border-radius);
}

.sfq-freestyle-video-container iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: 0;
}

/* Imagen */
.sfq-freestyle-image {
    max-width: 100%;
    height: auto;
    border-radius: calc(var(--sfq-border-radius) / 2);
}

.sfq-freestyle-image-caption {
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: var(--sfq-secondary-color);
    text-align: center;
}

/* Cuenta atrás */
.sfq-freestyle-countdown {
    text-align: center;
    padding: 1rem;
}

.sfq-countdown-display {
    display: flex;
    justify-content: center;
    gap: 1rem;
    flex-wrap: wrap;
}

.sfq-countdown-unit {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 60px;
    padding: 1rem 0.5rem;
    background: var(--sfq-background-color);
    border: 2px solid #e0e0e0;
    border-radius: calc(var(--sfq-border-radius) / 2);
}

.sfq-countdown-number {
    font-size: 2rem;
    font-weight: 700;
    color: var(--sfq-primary-color);
    line-height: 1;
}

.sfq-countdown-label {
    font-size: 0.75rem;
    color: var(--sfq-secondary-color);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 0.25rem;
}

/* Subida de archivos */
.sfq-freestyle-file-upload {
    text-align: center;
}

.sfq-freestyle-file-input {
    display: none;
}

.sfq-freestyle-file-label {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    background: var(--sfq-primary-color);
    color: white;
    border-radius: calc(var(--sfq-border-radius) / 2);
    cursor: pointer;
    transition: var(--sfq-transition);
}

.sfq-freestyle-file-label:hover {
    background: color-mix(in srgb, var(--sfq-primary-color) 85%, black);
}

/* Botones */
.sfq-freestyle-button {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: calc(var(--sfq-border-radius) / 2);
    font-family: var(--sfq-font-family);
    font-weight: 600;
    cursor: pointer;
    transition: var(--sfq-transition);
    text-decoration: none;
    display: inline-block;
}

.sfq-button-primary {
    background: var(--sfq-primary-color);
    color: white;
}

.sfq-button-secondary {
    background: transparent;
    color: var(--sfq-primary-color);
    border: 2px solid var(--sfq-primary-color);
}

.sfq-button-outline {
    background: transparent;
    color: var(--sfq-text-color);
    border: 2px solid var(--sfq-text-color);
}

/* Valoración */
.sfq-freestyle-rating {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
}

.sfq-rating-star,
.sfq-rating-heart {
    background: none;
    border: none;
    font-size: 2rem;
    cursor: pointer;
    color: #d0d0d0;
    transition: var(--sfq-transition);
}

.sfq-rating-star:hover,
.sfq-rating-star.active,
.sfq-rating-heart:hover,
.sfq-rating-heart.active {
    color: var(--sfq-primary-color);
    transform: scale(1.1);
}

/* Checkbox */
.sfq-freestyle-checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
}

.sfq-freestyle-checkbox {
    width: 20px;
    height: 20px;
    accent-color: var(--sfq-primary-color);
}

/* Texto legal */
.sfq-freestyle-legal-text {
    padding: 1rem;
    line-height: 1.6;
}

.sfq-freestyle-legal-text.sfq-with-background {
    background: rgba(var(--sfq-secondary-color), 0.1);
}

.sfq-freestyle-legal-text.sfq-with-border {
    border: 1px solid var(--sfq-secondary-color);
}

.sfq-text-small { font-size: 0.875rem; }
.sfq-text-normal { font-size: 1rem; }
.sfq-text-large { font-size: 1.125rem; }

.sfq-style-italic { font-style: italic; }
.sfq-style-bold { font-weight: 600; }

/* Admin Builder Styles */
.sfq-freestyle-question .sfq-question-content {
    background: #f8f9fa;
    border-radius: var(--sfq-border-radius);
    padding: 1.5rem;
}

.sfq-freestyle-elements {
    min-height: 200px;
    border: 2px dashed #d0d0d0;
    border-radius: var(--sfq-border-radius);
    padding: 1rem;
    margin-bottom: 1rem;
}

.sfq-freestyle-empty {
    text-align: center;
    color: var(--sfq-secondary-color);
    font-style: italic;
    padding: 2rem;
}

.sfq-freestyle-element {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: calc(var(--sfq-border-radius) / 2);
    margin-bottom: 1rem;
    overflow: hidden;
}

.sfq-freestyle-element-header {
    background: #f8f9fa;
    padding: 0.75rem 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #e0e0e0;
}

.sfq-freestyle-element-type {
    font-weight: 600;
    color: var(--sfq-text-color);
}

.sfq-freestyle-element-actions {
    display: flex;
    gap: 0.25rem;
}

.sfq-freestyle-action {
    background: none;
    border: none;
    padding: 0.25rem;
    cursor: pointer;
    border-radius: 4px;
    transition: var(--sfq-transition);
}

.sfq-freestyle-action:hover {
    background: rgba(var(--sfq-primary-color), 0.1);
}

.sfq-freestyle-controls {
    margin-top: 1rem;
    padding: 1rem;
    background: white;
    border-radius: var(--sfq-border-radius);
    border: 1px solid #e0e0e0;
}

.sfq-freestyle-add-buttons {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.5rem;
}

.sfq-add-freestyle-element {
    padding: 0.5rem 0.75rem;
    background: var(--sfq-primary-color);
    color: white;
    border: none;
    border-radius: calc(var(--sfq-border-radius) / 2);
    cursor: pointer;
    font-size: 0.875rem;
    transition: var(--sfq-transition);
}

.sfq-add-freestyle-element:hover {
    background: color-mix(in srgb, var(--sfq-primary-color) 85%, black);
}

/* Responsive */
@media (max-width: 768px) {
    .sfq-freestyle-add-buttons {
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    }
    
    .sfq-countdown-display {
        gap: 0.5rem;
    }
    
    .sfq-countdown-unit {
        min-width: 50px;
        padding: 0.75rem 0.25rem;
    }
    
    .sfq-countdown-number {
        font-size: 1.5rem;
    }
}
```

---

## 🔒 Validaciones y Seguridad

### Validaciones por Tipo de Elemento

```php
// Añadir a SFQ_Utils
public static function validate_freestyle_element($element, $value) {
    $errors = array();
    $settings = $element['settings'] ?? array();
    $required = $settings['required'] ?? false;
    
    // Validación de campo requerido
    if ($required && empty($value)) {
        $errors[] = sprintf(__('El campo "%s" es requerido', 'smart-forms-quiz'), $element['label']);
        return $errors;
    }
    
    switch ($element['type']) {
        case 'text':
            $errors = array_merge($errors, self::validate_text_element($element, $value));
            break;
        case 'email':
            $errors = array_merge($errors, self::validate_email_element($element, $value));
            break;
        case 'phone':
            $errors = array_merge($errors, self::validate_phone_element($element, $value));
            break;
        case 'file_upload':
            $errors = array_merge($errors, self::validate_file_element($element, $value));
            break;
        case 'rating':
            $errors = array_merge($errors, self::validate_rating_element($element, $value));
            break;
        case 'dropdown':
            $errors = array_merge($errors, self::validate_dropdown_element($element, $value));
            break;
    }
    
    return $errors;
}

private static function validate_text_element($element, $value) {
    $errors = array();
    $settings = $element['settings'] ?? array();
    
    if (!empty($value)) {
        $min_length = $settings['min_length'] ?? 0;
        $max_length = $settings['max_length'] ?? 500;
        $pattern = $settings['validation_pattern'] ?? '';
        
        if (strlen($value) < $min_length) {
            $errors[] = sprintf(__('Mínimo %d caracteres requeridos', 'smart-forms-quiz'), $min_length);
        }
        
        if (strlen($value) > $max_length) {
            $errors[] = sprintf(__('Máximo %d caracteres permitidos', 'smart-forms-quiz'), $max_length);
        }
        
        if (!empty($pattern) && !preg_match($pattern, $value)) {
            $message = $settings['validation_message'] ?? __('Formato inválido', 'smart-forms-quiz');
            $errors[] = $message;
        }
    }
    
    return $errors;
}

private static function validate_email_element($element, $value) {
    $errors = array();
    $settings = $element['settings'] ?? array();
    
    if (!empty($value)) {
        if (!is_email($value)) {
            $errors[] = __('Email inválido', 'smart-forms-quiz');
        } else {
            // Verificar dominios bloqueados
            $blocked_domains = $settings['blocked_domains'] ?? array();
            $domain = substr(strrchr($value, "@"), 1);
            
            if (in_array($domain, $blocked_domains)) {
                $errors[] = __('Dominio de email no permitido', 'smart-forms-quiz');
            }
            
            // Verificar dominios permitidos
            $allowed_domains = $settings['allowed_domains'] ?? array();
            if (!empty($allowed_domains) && !in_array($domain, $allowed_domains)) {
                $errors[] = __('Solo se permiten ciertos dominios de email', 'smart-forms-quiz');
            }
        }
    }
    
    return $errors;
}
```

---

## 🧪 Testing y Verificación

### Checklist de Pruebas

#### ✅ Funcionalidad Básica
- [ ] El botón "Estilo Libre" aparece en el admin
- [ ] Se puede crear una pregunta freestyle
- [ ] Se pueden añadir elementos de diferentes tipos
- [ ] Los elementos se guardan correctamente
- [ ] Los elementos se cargan correctamente al editar

#### ✅ Elementos Individuales
- [ ] **Texto**: Input y textarea funcionan
- [ ] **Video**: YouTube y Vimeo se embeben correctamente
- [ ] **Imagen**: Se muestran imágenes desde URL
- [ ] **Cuenta atrás**: Timer funciona correctamente
- [ ] **Teléfono**: Validación de formato
- [ ] **Email**: Validación y confirmación
- [ ] **Subir imagen**: Upload funciona
- [ ] **Botón**: Acciones funcionan
- [ ] **Valoración**: Selección funciona
- [ ] **Desplegable**: Opciones se muestran
- [ ] **Checkbox**: Estado se guarda
- [ ] **Texto RGPD**: Enlaces funcionan

#### ✅ Validación y Seguridad
- [ ] Campos requeridos se validan
- [ ] Sanitización de datos funciona
- [ ] No hay vulnerabilidades XSS
- [ ] Archivos subidos se validan
- [ ] Límites de tamaño se respetan

#### ✅ Frontend
- [ ] Elementos se renderizan correctamente
- [ ] Estilos se aplican bien
- [ ] Responsive funciona
- [ ] JavaScript no tiene errores

---

## 📋 Plan de Fases

### Fase 1: Estructura Base (Semana 1)
- [x] Crear estructura de datos
- [ ] Implementar tipo `freestyle` básico
- [ ] Añadir botón en admin builder
- [ ] Crear renderizadores base

### Fase 2: Elementos Básicos (Semana 2)
- [ ] Implementar elemento `text`
- [ ] Implementar elemento `email`
- [ ] Implementar elemento `phone`
- [ ] Añadir validaciones básicas

### Fase 3: Elementos Multimedia (Semana 3)
- [ ] Implementar elemento `video`
- [ ] Implementar elemento `image`
- [ ] Implementar elemento `file_upload`
- [ ] Optimizar carga de medios

### Fase 4: Elementos Interactivos (Semana 4)
- [ ] Implementar elemento `button`
- [ ] Implementar elemento `rating`
- [ ] Implementar elemento `dropdown`
- [ ] Implementar elemento `checkbox`

### Fase 5: Elementos Especiales (Semana 5)
- [ ] Implementar elemento `countdown`
- [ ] Implementar elemento `legal_text`
- [ ] Añadir configuraciones avanzadas
- [ ] Optimizar rendimiento

### Fase 6: Pulido y Testing (Semana 6)
- [ ] Testing exhaustivo
- [ ] Optimización de UX/UI
- [ ] Documentación final
- [ ] Preparar para producción

---

## 🎯 Consideraciones Finales

### Buenas Prácticas

1. **🔧 Modularidad**: Cada elemento es independiente
2. **🎨 Consistencia**: Usar patrones existentes del sistema
3. **📱 Responsividad**: Todos los elementos deben ser responsive
4. **🔒 Seguridad**: Validar y sanitizar todos los datos
5. **⚡ Performance**: Optimizar carga de elementos multimedia

### Extensibilidad

El sistema está diseñado para ser fácilmente extensible:

- **Nuevos elementos**: Seguir el patrón establecido
- **Configuraciones**: Añadir nuevas opciones en `settings`
- **Validaciones**: Extender `validate_freestyle_element()`
- **Estilos**: Usar variables CSS existentes

### Compatibilidad

- **✅ WordPress**: 5.0+
- **✅ PHP**: 7.4+
- **✅ Navegadores**: Modernos (ES6+)
- **✅ Móviles**: Responsive design

---

*Documento creado para Smart Forms & Quiz Plugin v1.5.0*
*Última actualización: Enero 2025*
