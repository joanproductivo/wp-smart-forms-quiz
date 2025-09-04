# Análisis Profundo: Guardado y Recuperación de Variable Display
## Smart Forms & Quiz Plugin - WordPress

### Fecha: Enero 2025
### Problema Analizado: Guardado de `variable_name` y configuraciones del elemento "Mostrar Variable"

---

## 🔍 Resumen Ejecutivo

Este documento analiza en profundidad cómo se guarda y recupera la configuración `variable_name` del elemento "Mostrar Variable" (`variable_display`) en preguntas de estilo libre, así como otras opciones como `font_size`. El análisis revela el flujo completo desde el frontend hasta la base de datos.

---

## 🏗️ Arquitectura del Sistema

### Componentes Involucrados

1. **Frontend JavaScript** (`admin-builder-v2.js`)
2. **Backend AJAX** (`class-sfq-ajax.php`)
3. **Base de Datos** (`class-sfq-database.php`)
4. **Estructura de Datos** (MySQL)

---

## 📊 Estructura de Datos

### Elemento Variable Display
```javascript
{
    id: 'element_1234567890_0',
    type: 'variable_display',
    label: 'Puntuación Total',
    order: 0,
    settings: {
        variable_name: 'puntos_total',        // ✅ CAMPO CRÍTICO
        preview_value: '100',
        font_size: '24',                      // ✅ CAMPO ANALIZADO
        font_weight: 'bold',
        text_align: 'center',
        text_shadow: true,
        text_color: '#333333',
        background_color: '#f8f9fa',
        border_color: '#e9ecef',
        background_opacity: '1',
        border_radius: '8'
    },
    value: ''
}
```

---

## 🔄 Flujo de Guardado Completo

### 1. Configuración en el Frontend

**Ubicación**: `assets/js/admin-builder-v2.js` - Línea ~1850

```javascript
createVariableDisplayConfig(element) {
    const settings = element.settings || {};
    const variables = this.formBuilder.getGlobalVariables() || [];
    
    // Generar opciones del desplegable de variables
    let variableOptions = '<option value="">Selecciona una variable...</option>';
    variables.forEach(variable => {
        const isSelected = settings.variable_name === variable.name ? 'selected' : '';
        variableOptions += `<option value="${variable.name}" ${isSelected}>
            ${this.formBuilder.uiRenderer.escapeHtml(variable.name)} (${variable.type})
        </option>`;
    });
    
    return `
        <h5>🔢 Configuración de Mostrar Variable</h5>
        
        <!-- Selección de variable -->
        <label class="sfq-config-label">
            Variable a mostrar:
            <select class="sfq-config-input" data-setting="variable_name">
                ${variableOptions}
            </select>
        </label>
        
        <!-- Configuración de estilo -->
        <div class="sfq-config-row">
            <label class="sfq-config-label">
                Tamaño de fuente:
                <select class="sfq-config-input" data-setting="font_size">
                    <option value="16" ${settings.font_size === '16' || !settings.font_size ? 'selected' : ''}>16px</option>
                    <option value="18" ${settings.font_size === '18' ? 'selected' : ''}>18px</option>
                    <option value="20" ${settings.font_size === '20' ? 'selected' : ''}>20px</option>
                    <option value="24" ${settings.font_size === '24' ? 'selected' : ''}>24px</option>
                </select>
            </label>
        </div>
        <!-- ... más configuraciones ... -->
    `;
}
```

### 2. Captura de Eventos de Configuración

**Ubicación**: `assets/js/admin-builder-v2.js` - Línea ~2100

```javascript
bindConfigPanelEvents($panel, questionId, elementId) {
    const question = this.questions.find(q => q.id === questionId);
    const element = question?.freestyle_elements?.find(el => el.id === elementId);
    
    if (!element) return;
    
    const self = this;
    
    // Guardar cambios
    $panel.find('.sfq-config-save').on('click', function() {
        // Actualizar etiqueta básica
        const newLabel = $panel.find('.sfq-element-label-config').val();
        element.label = newLabel;
        
        // ✅ CRÍTICO: Actualizar configuraciones específicas
        $panel.find('[data-setting]').each(function() {
            const $field = $(this);
            const setting = $field.data('setting');
            let value;
            
            if ($field.is(':checkbox')) {
                value = $field.is(':checked');
            } else if ($field.is('select')) {
                value = $field.val();
            } else {
                value = $field.val();
            }
            
            // Inicializar settings si no existe
            if (!element.settings) {
                element.settings = {};
            }
            
            // ✅ CRÍTICO: Log para debugging del problema con variable_name
            if (setting === 'variable_name') {
                console.log('SFQ: Saving variable_name setting:', value);
                console.log('SFQ: Field type:', $field.prop('tagName'), 'Value:', $field.val());
            }
            
            element.settings[setting] = value;
            
            // ✅ VERIFICACIÓN: Log después del guardado
            if (setting === 'variable_name') {
                console.log('SFQ: variable_name saved in element.settings:', element.settings[setting]);
            }
        });
        
        // Marcar formulario como modificado
        self.formBuilder.isDirty = true;
        
        // Re-renderizar elementos para mostrar cambios
        const $elementsContainer = $(`#freestyle-elements-${questionId}`);
        const elementsHtml = self.formBuilder.uiRenderer.renderFreestyleElements(question.freestyle_elements);
        $elementsContainer.html(elementsHtml);
        
        // Rebind events
        self.bindFreestyleElementEvents(questionId);
    });
}
```

### 3. Guardado en el Formulario

**Ubicación**: `assets/js/admin-builder-v2.js` - Línea ~800

```javascript
collectFormData() {
    return {
        id: this.formId,
        title: $('#form-title').val(),
        // ... otros campos ...
        questions: this.questionManager.getQuestionsData(),  // ✅ AQUÍ SE INCLUYEN LOS ELEMENTOS
        global_variables: this.getGlobalVariables()
    };
}
```

**Ubicación**: `assets/js/admin-builder-v2.js` - QuestionManager.getQuestionsData()

```javascript
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

        // Handle freestyle questions
        if (question.type === 'freestyle') {
            baseData.freestyle_elements = question.freestyle_elements || [];  // ✅ ELEMENTOS INCLUIDOS
            baseData.global_settings = question.global_settings || {};
            baseData.options = []; // Freestyle questions don't have traditional options
            baseData.pantallaFinal = question.pantallaFinal || false;
        }

        return baseData;
    });
}
```

### 4. Envío AJAX al Backend

**Ubicación**: `assets/js/admin-builder-v2.js` - Línea ~750

```javascript
async saveForm() {
    // Collect form data
    const formData = this.collectFormData();
    
    // Debug: Log form data being sent to server
    console.log('SFQ: === SAVING FORM DATA ===');
    console.log('SFQ: Questions data being sent:', formData.questions);
    
    try {
        const response = await $.ajax({
            url: sfq_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'sfq_save_form',
                nonce: sfq_ajax.nonce,
                form_data: JSON.stringify(formData)  // ✅ DATOS SERIALIZADOS
            },
            timeout: 30000
        });
        
        if (response.success) {
            this.formId = response.data.form_id;
            this.isDirty = false;
            this.uiRenderer.showNotice('Formulario guardado correctamente', 'success');
        }
    } catch (error) {
        console.error('SFQ Builder v2: Save error:', error);
    }
}
```

---

## 🔧 Procesamiento en el Backend

### 1. Recepción AJAX

**Ubicación**: `includes/class-sfq-ajax.php` - Línea ~1200

```php
public function save_form() {
    // Verificar permisos y nonce
    if (!$this->validate_ajax_request('manage_smart_forms')) {
        return;
    }
    
    // Obtener y validar datos del formulario
    $form_data = $this->get_and_validate_form_data();
    if (!$form_data) {
        return; // Error already sent
    }
    
    try {
        // ✅ CRÍTICO: Guardar formulario con manejo de errores mejorado
        $form_id = $this->database->save_form($form_data);
        
        if ($form_id) {
            wp_send_json_success(array(
                'form_id' => $form_id,
                'message' => __('Formulario guardado correctamente', 'smart-forms-quiz')
            ));
        }
    } catch (Exception $e) {
        wp_send_json_error(array(
            'message' => __('Error interno del servidor', 'smart-forms-quiz')
        ));
    }
}

private function get_and_validate_form_data() {
    if (!isset($_POST['form_data'])) {
        wp_send_json_error(array(
            'message' => __('Datos del formulario no proporcionados', 'smart-forms-quiz')
        ));
        return false;
    }
    
    // ✅ CRÍTICO: Decodificar JSON
    $form_data = json_decode(stripslashes($_POST['form_data']), true);
    
    if (!$form_data || !is_array($form_data)) {
        wp_send_json_error(array(
            'message' => __('Datos del formulario inválidos', 'smart-forms-quiz')
        ));
        return false;
    }
    
    return $form_data;
}
```

### 2. Guardado en Base de Datos

**Ubicación**: `includes/class-sfq-database.php` - Línea ~400

```php
public function save_form($data) {
    global $wpdb;
    
    // Preparar datos del formulario
    $form_data = array(
        'title' => sanitize_text_field($data['title']),
        'description' => sanitize_textarea_field($data['description'] ?? ''),
        'type' => in_array($data['type'], array('form', 'quiz')) ? $data['type'] : 'form',
        'settings' => json_encode($data['settings'] ?? array()),
        'style_settings' => json_encode($this->process_style_settings($data['style_settings'] ?? array())),
        // ... otros campos ...
    );
    
    if (isset($data['id']) && $data['id'] > 0) {
        // Actualizar formulario existente
        $result = $wpdb->update(
            $this->forms_table,
            $form_data,
            array('id' => $data['id']),
            array('%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s'),
            array('%d')
        );
        $form_id = $data['id'];
    } else {
        // Crear nuevo formulario
        $result = $wpdb->insert(
            $this->forms_table,
            $form_data,
            array('%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s')
        );
        $form_id = $wpdb->insert_id;
    }
    
    // ✅ CRÍTICO: Guardar preguntas si existen
    if (isset($data['questions']) && is_array($data['questions'])) {
        $this->save_questions($form_id, $data['questions']);
    }
    
    return $form_id;
}
```

### 3. Guardado de Preguntas y Elementos

**Ubicación**: `includes/class-sfq-database.php` - Línea ~600

```php
private function save_questions($form_id, $questions) {
    global $wpdb;

    // Start transaction for data integrity
    $wpdb->query('START TRANSACTION');

    try {
        foreach ($questions as $index => $question) {
            // ✅ CRÍTICO: Para preguntas freestyle, guardar elementos en el campo options
            $options_data = array();
            if ($question['question_type'] === 'freestyle') {
                $options_data = $question['freestyle_elements'] ?? array();  // ✅ ELEMENTOS AQUÍ
            } else {
                $options_data = $question['options'] ?? array();
            }
            
            $question_data = array(
                'form_id' => $form_id,
                'question_text' => sanitize_textarea_field($question['question_text']),
                'question_type' => sanitize_text_field($question['question_type']),
                'options' => wp_json_encode($options_data),  // ✅ ELEMENTOS SERIALIZADOS
                'settings' => wp_json_encode($question['settings'] ?? array()),
                'required' => isset($question['required']) && $question['required'] ? 1 : 0,
                'order_position' => $index,
                'variable_name' => sanitize_text_field($question['variable_name'] ?? ''),
                'variable_value' => intval($question['variable_value'] ?? 0)
            );
            
            // Insertar o actualizar pregunta
            if ($existing_question_id) {
                $result = $wpdb->update(
                    $this->questions_table,
                    $question_data,
                    array('id' => $existing_question_id),
                    array('%d', '%s', '%s', '%s', '%s', '%d', '%d', '%s', '%d'),
                    array('%d')
                );
            } else {
                $result = $wpdb->insert(
                    $this->questions_table,
                    $question_data,
                    array('%d', '%s', '%s', '%s', '%s', '%d', '%d', '%s', '%d')
                );
            }
        }

        $wpdb->query('COMMIT');
    } catch (Exception $e) {
        $wpdb->query('ROLLBACK');
        throw $e;
    }
}
```

---

## 🔄 Flujo de Recuperación Completo

### 1. Carga desde Base de Datos

**Ubicación**: `includes/class-sfq-database.php` - Línea ~200

```php
public function get_form($form_id) {
    global $wpdb;
    
    $form = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$this->forms_table} WHERE id = %d",
        $form_id
    ));
    
    if ($form) {
        // Decodificar configuraciones JSON
        $form->settings = json_decode($form->settings, true) ?: array();
        $form->style_settings = json_decode($form->style_settings, true) ?: array();
        
        // ✅ CRÍTICO: Obtener preguntas
        $form->questions = $this->get_questions($form_id);
        
        // Ensure questions is always an array
        if (!is_array($form->questions)) {
            $form->questions = array();
        }
    }
    
    return $form;
}

public function get_questions($form_id) {
    global $wpdb;
    
    $questions = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$this->questions_table} 
        WHERE form_id = %d 
        ORDER BY order_position ASC",
        $form_id
    ));
    
    if (!$questions) {
        return [];
    }
    
    foreach ($questions as &$question) {
        $question = $this->process_question_data($question);  // ✅ PROCESAMIENTO CRÍTICO
    }
    
    return $questions;
}
```

### 2. Procesamiento de Datos de Pregunta

**Ubicación**: `includes/class-sfq-database.php` - Línea ~300

```php
private function process_question_data($question) {
    // Procesar configuraciones primero
    $settings = $this->process_question_settings($question->settings);
    $question->settings = $settings;
    
    // ✅ CRÍTICO: Procesar según el tipo de pregunta
    if ($question->question_type === 'freestyle') {
        // Para preguntas freestyle, los elementos están en el campo options
        $question->freestyle_elements = $this->process_freestyle_elements($question->options);
        $question->options = []; // Las preguntas freestyle no tienen opciones tradicionales
        
        // Procesar configuraciones globales de freestyle
        $question->global_settings = $settings['global_settings'] ?? [];
        
        // CRÍTICO: Extraer el campo pantallaFinal de las configuraciones procesadas
        $question->pantallaFinal = isset($settings['pantallaFinal']) ? (bool) $settings['pantallaFinal'] : false;
    } else {
        // Para preguntas regulares, procesar opciones normalmente
        $question->options = $this->process_question_options($question->options);
    }
    
    // Obtener condiciones
    $question->conditions = $this->get_conditions($question->id);
    
    return $question;
}
```

### 3. Procesamiento de Elementos Freestyle

**Ubicación**: `includes/class-sfq-database.php` - Línea ~450

```php
private function process_freestyle_elements($elements_json) {
    if (empty($elements_json)) {
        return [];
    }
    
    // ✅ CRÍTICO: Decodificar JSON
    $elements = json_decode($elements_json, true);
    
    if (!is_array($elements)) {
        return [];
    }
    
    // Procesar cada elemento
    $processed_elements = [];
    foreach ($elements as $element) {
        if (!is_array($element) || empty($element['type'])) {
            continue;
        }
        
        // Validar que el tipo sea válido
        $valid_types = ['text', 'video', 'image', 'countdown', 'phone', 'email', 'file_upload', 'button', 'rating', 'dropdown', 'checkbox', 'legal_text', 'variable_display'];
        if (!in_array($element['type'], $valid_types)) {
            continue;
        }
        
        // ✅ CRÍTICO: Procesar elemento con todas sus configuraciones
        $processed_elements[] = [
            'id' => $element['id'] ?? 'element_' . time() . '_' . count($processed_elements),
            'type' => $element['type'],
            'label' => sanitize_text_field($element['label'] ?? ''),
            'order' => intval($element['order'] ?? count($processed_elements)),
            'settings' => is_array($element['settings'] ?? null) ? $element['settings'] : [],  // ✅ SETTINGS PRESERVADOS
            'value' => sanitize_text_field($element['value'] ?? '')
        ];
    }
    
    // Ordenar por orden
    usort($processed_elements, function($a, $b) {
        return $a['order'] - $b['order'];
    });
    
    return $processed_elements;
}
```

### 4. Envío al Frontend

**Ubicación**: `includes/class-sfq-ajax.php` - Línea ~1300

```php
public function get_form_data() {
    // Verificar permisos y nonce
    if (!$this->validate_ajax_request('manage_smart_forms')) {
        return;
    }
    
    $form_id = intval($_POST['form_id'] ?? 0);
    
    try {
        // ✅ CRÍTICO: Obtener formulario de la base de datos
        $form = $this->database->get_form_fresh($form_id);
        
        if (!$form) {
            wp_send_json_error(array(
                'message' => __('Formulario no encontrado', 'smart-forms-quiz')
            ));
            return;
        }
        
        // Validar y estructurar datos del formulario
        $form = $this->validate_and_structure_form_data($form);
        
        wp_send_json_success($form);  // ✅ DATOS ENVIADOS AL FRONTEND
        
    } catch (Exception $e) {
        wp_send_json_error(array(
            'message' => __('Error al cargar los datos del formulario', 'smart-forms-quiz')
        ));
    }
}
```

### 5. Población en el Frontend

**Ubicación**: `assets/js/admin-builder-v2.js` - Línea ~400

```javascript
populateFormData(formData) {
    // Store complete form data in state
    this.stateManager.setState('formData', formData);
    
    // General fields
    $('#form-title').val(formData.title || '');
    $('#form-description').val(formData.description || '');
    // ... otros campos ...
    
    // ✅ CRÍTICO: Load questions
    if (formData.questions && Array.isArray(formData.questions)) {
        this.questionManager.loadQuestions(formData.questions);  // ✅ CARGA DE PREGUNTAS
    }
    
    // CRÍTICO: Renderizar variables globales después de cargar los datos
    this.renderVariables();
}
```

### 6. Carga de Preguntas en QuestionManager

**Ubicación**: `assets/js/admin-builder-v2.js` - QuestionManager.loadQuestions()

```javascript
loadQuestions(questionsData) {
    // Clear containers
    this.container.empty();
    $('#sfq-final-screens-container').empty();
    this.questions = [];
    
    if (!questionsData || questionsData.length === 0) {
        this.formBuilder.uiRenderer.showEmptyState();
        return;
    }
    
    // Sort by position
    questionsData.sort((a, b) => (a.order_position || 0) - (b.order_position || 0));
    
    // Process each question
    questionsData.forEach((questionData, index) => {
        const question = this.createQuestionObject(questionData, index);  // ✅ CREACIÓN DE OBJETO
        if (question) {
            this.questions.push(question);
            
            // Renderizar pregunta
            const element = this.formBuilder.uiRenderer.renderQuestion(question);
            this.container.append(element);
            this.bindQuestionEvents(question.id);
        }
    });
}
```

### 7. Creación de Objeto de Pregunta

**Ubicación**: `assets/js/admin-builder-v2.js` - QuestionManager.createQuestionObject()

```javascript
createQuestionObject(data, index) {
    const questionId = 'q_' + Date.now() + '_' + index;
    
    // ✅ CRÍTICO: Handle freestyle questions
    if (data.question_type === 'freestyle') {
        return {
            id: questionId,
            originalId: data.id || null,
            text: data.question_text || '',
            type: 'freestyle',
            freestyle_elements: this.processFreestyleElements(data.freestyle_elements || []),  // ✅ ELEMENTOS PROCESADOS
            required: this.formBuilder.dataValidator.normalizeBoolean(data.required),
            order: index,
            conditions: [],
            settings: data.settings || {},
            global_settings: data.global_settings || {
                layout: 'vertical',
                spacing: 'normal',
                show_element_numbers: false
            },
            pantallaFinal: pantallaFinal
        };
    }
    
    // ... resto del procesamiento ...
}

// ✅ CRÍTICO: Nuevo método para procesar elementos freestyle
processFreestyleElements(elements) {
    if (!Array.isArray(elements)) return [];
    
    console.log('SFQ: Processing freestyle elements from database:', elements);
    
    return elements.map((element, index) => {
        // ✅ CRÍTICO: Validar que el tipo de elemento sea válido
        const validTypes = [
            'text', 'video', 'image', 'countdown', 'phone', 'email', 
            'file_upload', 'button', 'rating', 'dropdown', 'checkbox', 
            'legal_text', 'variable_display'
        ];
        
        const elementType = element.type || 'text';
        
        const processedElement = {
            id: element.id || 'element_' + Date.now() + '_' + index,
            type: validTypes.includes(elementType) ? elementType : 'text',
            label: element.label || '',
            settings: element.settings || {},  // ✅ SETTINGS PRESERVADOS INCLUYENDO variable_name
            order: element.order || index,
            value: element.value || ''
        };
        
        console.log('SFQ: Processed element:', processedElement);
        
        return processedElement;
    });
}
```

---

## 🔍 Puntos Críticos del Sistema

### 1. Guardado de `variable_name`

**Problema Identificado**: La configuración `variable_name` se guarda correctamente en `element.settings.variable_name` pero puede perderse durante la serialización/deserialización.

**Ubicación Crítica**: 
- **Guardado**: `bindConfigPanelEvents()` - Línea ~2100
- **Serialización**: `getQuestionsData()` - QuestionManager
- **Base de Datos**: Campo `options` en tabla `sfq_questions`

**Flujo de Datos**:
```
Frontend Config Panel → element.settings.variable_name → 
question.freestyle_elements → formData.questions → 
AJAX → save_questions() → wp_json_encode() → 
DB campo 'options' → JSON string
```

### 2. Recuperación de `variable_name`

**Ubicación Crítica**:
- **Base de Datos**: Campo `options` en tabla `sfq_questions`
- **Deserialización**: `process_freestyle_elements()` - Línea ~450
- **Frontend**: `processFreestyleElements()` - QuestionManager

**Flujo de Datos**:
```
DB campo 'options' → json_decode() → 
process_freestyle_elements() → element['settings'] → 
AJAX response → loadQuestions() → 
createQuestionObject() → element.settings.variable_name
```

### 3. Renderizado de Configuración

**Ubicación Crítica**: `createVariableDisplayConfig()` - Línea ~1850

```javascript
// ✅ CRÍTICO: Verificar que settings.variable_name existe
const isSelected = settings.variable_name === variable.name ? 'selected' : '';
```

**Problema Potencial**: Si `settings.variable_name` es `undefined` o `null`, la comparación falla y no se selecciona la opción correcta.

---

## 🐛 Problemas Identificados

### 1. Pérdida de Configuración durante Serialización

**Síntoma**: La variable seleccionada no se mantiene al recargar el editor.

**Causa Raíz**: 
- Posible pérdida durante `wp_json_encode()` / `json_decode()`
- Configuraciones no inicializadas correctamente
- Problemas de referencia de objetos vs arrays

**Solución**:
```javascript
// En bindConfigPanelEvents(), asegurar inicialización
if (!element.settings) {
    element.settings = {};
}

// Verificar que el valor se guarda correctamente
element.settings[setting] = value;

// Log para debugging
if (setting === 'variable_name') {
    console.log('SFQ: variable_name saved:', element.settings[setting]);
}
```

### 2. Problemas de Referencia de Datos

**Síntoma**: Configuraciones se pierden entre guardado y carga.

**Causa Raíz**: 
- Referencias de objetos vs copias profundas
- Mutación de datos durante procesamiento

**Solución**:
```php
// En process_freestyle_elements(), preservar settings
$processed_elements[] = [
    'id' => $element['id'] ?? 'element_' . time() . '_' . count($processed_elements),
    'type' => $element['type'],
    'label' => sanitize_text_field($element['label'] ?? ''),
    'order' => intval($element['order'] ?? count($processed_elements)),
    'settings' => is_array($element['settings'] ?? null) ? $element['settings'] : [],  // ✅ PRESERVAR
    'value' => sanitize_text_field($element['value'] ?? '')
];
```

### 3. Problemas de Inicialización de Variables Globales

**Síntoma**: El desplegable de variables aparece vacío.

**Causa Raíz**: Variables globales no cargadas antes de renderizar configuración.

**Solución**:
```javascript
// En populateFormData(), asegurar orden correcto
// 1. Cargar variables globales primero
this.renderVariables();

// 2. Luego cargar preguntas
if (formData.questions && Array.isArray(formData.questions)) {
    this.questionManager.loadQuestions(formData.questions);
}
```

---

## ✅ Verificaciones Recomendadas

### 1. Debugging en Frontend

```javascript
// En createVariableDisplayConfig()
console.log('SFQ: Creating config for element:', element);
console.log('SFQ: Element settings:', element.settings);
console.log('SFQ: Available variables:', variables);
console.log('SFQ: Current variable_name:', settings.variable_name);

// En bindConfigPanelEvents()
console.log('SFQ: Saving setting:', setting, 'with value:', value);
console.log('S
