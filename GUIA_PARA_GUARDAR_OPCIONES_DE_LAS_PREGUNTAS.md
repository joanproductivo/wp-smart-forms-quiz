# Cómo Guardar Opciones de las preguntas - Guía Completa

## Resumen Ejecutivo

Esta guía documenta cómo implementar correctamente el guardado de opciones de preguntas en el plugin Smart Forms Quiz, usando como ejemplos principales:
- ✅ "Pregunta obligatoria" (`sfq-required-checkbox`) - **FUNCIONANDO CORRECTAMENTE**
- ✅ "Ocultar título de la pregunta" (`sfq-hide-title-checkbox`) - **PROBLEMA RESUELTO**

Ambas opciones siguen un flujo completo desde la interfaz de administración hasta el almacenamiento en base de datos y su posterior recuperación.

## ⚠️ PROBLEMAS CRÍTICOS RESUELTOS

### 🔧 PROBLEMA 1: Conversión de Objeto a Array

#### Problema Identificado
El checkbox "Ocultar título de la pregunta" (`sfq-hide-title-checkbox`) se guardaba como `[]` (array vacío) en lugar del valor correcto `{hide_title: true/false}`.

#### Causa Raíz
JavaScript estaba convirtiendo el objeto `question.settings` en un **array** con propiedades nombradas en lugar de mantenerlo como un **objeto plano**.

### 🎯 PROBLEMA 2: Checkbox No Aparecía en Preguntas de Estilo Libre

#### Problema Identificado
El checkbox "Ocultar título de la pregunta" (`sfq-hide-title-checkbox`) **no se mostraba** en las preguntas de tipo "Estilo Libre" (freestyle), solo aparecía en preguntas normales (single_choice, multiple_choice, text, etc.).

#### Causa Raíz
La función `renderFreestyleQuestion()` no incluía el checkbox `sfq-hide-title-checkbox` en la sección de configuración de la pregunta, mientras que `renderQuestion()` sí lo incluía.

#### Síntomas del Problema
- ✅ Preguntas normales: Checkbox visible y funcional
- ❌ Preguntas freestyle: Checkbox **ausente** en la interfaz
- 🔄 Inconsistencia: Diferentes tipos de preguntas tenían opciones diferentes

#### Solución Implementada
```javascript
// ✅ SOLUCIÓN: Añadir checkbox a renderFreestyleQuestion()
<div class="sfq-question-settings">
    <label>
        <input type="checkbox" class="sfq-required-checkbox" 
               ${question.required ? 'checked' : ''}>
        Pregunta obligatoria
    </label>
    <label>
        <input type="checkbox" class="sfq-hide-title-checkbox" 
               ${question.settings?.hide_title ? 'checked' : ''}>
        Ocultar título de la pregunta
    </label>
</div>
```

#### Ubicación del Cambio
**Archivo**: `assets/js/admin-builder-v2.js`  
**Función**: `renderFreestyleQuestion()`  
**Líneas**: Sección `.sfq-question-settings`

#### Resultado
- ✅ **Consistencia total**: Todos los tipos de preguntas ahora tienen las mismas opciones básicas
- ✅ **Funcionalidad completa**: El checkbox funciona igual en preguntas freestyle que en preguntas normales
- ✅ **Guardado correcto**: Usa la misma lógica robusta para evitar conversión a array

### 🔒 PROBLEMA 3: Opción No Se Aplicaba en Modo Seguro

#### Problema Identificado
El checkbox "Ocultar título de la pregunta" (`sfq-hide-title-checkbox`) se guardaba correctamente en la base de datos, pero **no se aplicaba** cuando el formulario usaba **modo seguro** (`secure_loading = true`). En modo seguro, los títulos de las preguntas seguían apareciendo aunque estuviera marcada la opción de ocultarlos.

#### Causa Raíz
En el modo seguro, las preguntas se cargan dinámicamente vía AJAX usando el método `render_secure_question()` en `includes/class-sfq-ajax.php`. Este método **no estaba procesando** la opción `hide_title` de los settings de la pregunta, por lo que siempre renderizaba el título independientemente de la configuración guardada.

#### Síntomas del Problema
- ✅ **Modo normal**: La opción funcionaba correctamente
- ❌ **Modo seguro**: Los títulos aparecían siempre, ignorando la configuración
- 🔄 **Inconsistencia**: Comportamiento diferente según el modo de carga
- 📊 **Datos correctos**: Los settings se guardaban bien en la base de datos

#### Contexto del Modo Seguro
El modo seguro (`secure_loading = true`) es una funcionalidad que:
- Carga solo la primera pregunta inicialmente
- Carga las siguientes preguntas dinámicamente vía AJAX
- Evita que los usuarios vean todas las preguntas en el código fuente
- Usa el método `render_secure_question()` para renderizar preguntas dinámicamente

#### Solución Implementada
```php
// ✅ SOLUCIÓN: Procesar hide_title en render_secure_question()
<?php 
// Verificar si se debe ocultar el título
$hide_title = false;
if (isset($question->settings) && is_array($question->settings)) {
    $hide_title = !empty($question->settings['hide_title']);
} elseif (isset($question->settings) && is_object($question->settings)) {
    $hide_title = !empty($question->settings->hide_title);
}

if (!$hide_title) : ?>
    <h3 class="sfq-question-text">
        <?php echo esc_html($question->question_text); ?>
        <?php if ($question->required) : ?>
            <span class="sfq-required">*</span>
        <?php endif; ?>
    </h3>
<?php endif; ?>
```

#### Ubicación del Cambio
**Archivo**: `includes/class-sfq-ajax.php`  
**Método**: `render_secure_question()`  
**Líneas**: Sección de renderizado del título de la pregunta

#### Características de la Solución
1. **Verificación robusta**: Maneja tanto arrays como objetos para `question->settings`
2. **Compatibilidad total**: Funciona con la estructura de datos existente
3. **Consistencia**: Usa la misma lógica que el modo normal
4. **Seguridad**: Mantiene la validación y escape de datos apropiados

#### Resultado
- ✅ **Modo normal**: Sigue funcionando correctamente (sin cambios)
- ✅ **Modo seguro**: Ahora también funciona correctamente
- ✅ **Consistencia total**: Comportamiento idéntico en ambos modos
- ✅ **Compatibilidad**: Funciona con todos los tipos de preguntas

### Síntomas del Problema
```javascript
// ❌ INCORRECTO: Se guardaba como array
console.log('Settings is array:', Array.isArray(question.settings)); // true
console.log('Settings content:', question.settings); // [hide_title: true]

// ✅ CORRECTO: Debe ser objeto
console.log('Settings is array:', Array.isArray(question.settings)); // false  
console.log('Settings content:', question.settings); // {hide_title: true}
```

### Solución Implementada
```javascript
// ✅ SOLUCIÓN: Forzar creación de objeto plano
if (!question.settings || Array.isArray(question.settings) || typeof question.settings !== 'object') {
    question.settings = Object.create(null); // Crear objeto sin prototipo
    question.settings = {}; // Luego asignar objeto literal limpio
}

// ✅ CRÍTICO: Crear nuevo objeto para evitar referencias de array
const newSettings = {};

// Copiar settings existentes si los hay
if (question.settings && typeof question.settings === 'object' && !Array.isArray(question.settings)) {
    Object.keys(question.settings).forEach(key => {
        newSettings[key] = question.settings[key];
    });
}

// Establecer el nuevo valor
newSettings.hide_title = $(e.target).is(':checked');

// Asignar el nuevo objeto
question.settings = newSettings;
```

## 🛡️ MEJORES PRÁCTICAS PARA EVITAR PROBLEMAS

### 1. Validación de Tipo de Settings
```javascript
// ✅ SIEMPRE verificar que settings sea un objeto válido
if (!question.settings || Array.isArray(question.settings) || typeof question.settings !== 'object') {
    question.settings = {};
}
```

### 2. Creación Segura de Objetos
```javascript
// ✅ MÉTODO SEGURO: Crear nuevo objeto en lugar de modificar directamente
const newSettings = {};
Object.keys(question.settings || {}).forEach(key => {
    newSettings[key] = question.settings[key];
});
newSettings.nueva_propiedad = valor;
question.settings = newSettings;

// ❌ EVITAR: Modificación directa que puede causar conversión a array
question.settings.nueva_propiedad = valor;
```

### 3. Logging para Debugging
```javascript
// ✅ LOGGING DETALLADO para detectar problemas
console.log('Settings type:', typeof question.settings);
console.log('Settings is array:', Array.isArray(question.settings));
console.log('Settings keys:', question.settings ? Object.keys(question.settings) : 'NO SETTINGS');
```

### 4. Inicialización Correcta al Cargar
```javascript
// ✅ INICIALIZACIÓN SEGURA al cargar preguntas existentes
if (!question.settings || typeof question.settings !== 'object') {
    question.settings = {};
}

const hideTitle = question.settings.hide_title === true; // Comparación estricta
$question.find('.sfq-hide-title-checkbox').prop('checked', hideTitle);
```

### 5. Consideraciones para Modo Seguro
```php
// ✅ VERIFICACIÓN ROBUSTA en render_secure_question()
$hide_title = false;
if (isset($question->settings) && is_array($question->settings)) {
    $hide_title = !empty($question->settings['hide_title']);
} elseif (isset($question->settings) && is_object($question->settings)) {
    $hide_title = !empty($question->settings->hide_title);
}

// ✅ APLICAR CONDICIONALMENTE el renderizado
if (!$hide_title) : ?>
    <h3 class="sfq-question-text">
        <?php echo esc_html($question->question_text); ?>
        <?php if ($question->required) : ?>
            <span class="sfq-required">*</span>
        <?php endif; ?>
    </h3>
<?php endif; ?>
```

### 6. Consistencia entre Modos
```php
// ✅ PATRÓN RECOMENDADO: Usar la misma lógica en ambos modos
// Modo normal (includes/class-sfq-frontend.php)
if (empty($question->settings['hide_title'])) {
    // Renderizar título
}

// Modo seguro (includes/class-sfq-ajax.php)
if (!$hide_title) {
    // Renderizar título (usando la misma lógica)
}
```

### 7. Testing de Opciones en Ambos Modos
```javascript
// ✅ CHECKLIST DE TESTING para nuevas opciones
// 1. Verificar que el checkbox aparece en todos los tipos de pregunta
// 2. Verificar que se guarda correctamente en la base de datos
// 3. Verificar que se carga correctamente al editar
// 4. Verificar que funciona en modo normal
// 5. Verificar que funciona en modo seguro
// 6. Verificar que funciona con navegación condicional
```

## 1. Estructura de la Base de Datos

### Tabla: `wp_sfq_questions`
```sql
CREATE TABLE wp_sfq_questions (
    id INT(11) NOT NULL AUTO_INCREMENT,
    form_id INT(11) NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL,
    options LONGTEXT,
    settings LONGTEXT,
    required BOOLEAN DEFAULT FALSE,  -- ✅ CAMPO CLAVE
    order_position INT(11) DEFAULT 0,
    variable_name VARCHAR(100),
    variable_value INT(11) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY form_id (form_id),
    KEY order_position (order_position)
);
```

**Campo clave**: `required BOOLEAN DEFAULT FALSE`

## 2. Flujo de Guardado (Admin → Base de Datos)

### 2.1 Interfaz de Usuario (HTML)
**Archivo**: `assets/js/admin-builder-v2.js` (líneas 1024-1028)

```html
<label>
    <input type="checkbox" class="sfq-required-checkbox" 
           ${question.required ? 'checked' : ''}>
    Pregunta obligatoria
</label>
```

### 2.2 Event Binding (JavaScript)
**Archivo**: `assets/js/admin-builder-v2.js` (líneas 1014-1017)

```javascript
// Update required
$question.find('.sfq-required-checkbox').off('change').on('change', (e) => {
    question.required = $(e.target).is(':checked');
    this.formBuilder.isDirty = true;
});
```

**Proceso**:
1. El usuario marca/desmarca el checkbox
2. Se ejecuta el event handler `change`
3. Se actualiza la propiedad `question.required` del objeto JavaScript
4. Se marca el formulario como "dirty" (`isDirty = true`)

### 2.3 Recolección de Datos (JavaScript)
**Archivo**: `assets/js/admin-builder-v2.js` (método `getQuestionsData()`)

```javascript
const baseData = {
    question_text: question.text,
    question_type: question.type,
    required: question.required ? 1 : 0,  // ✅ CONVERSIÓN A ENTERO
    order_position: index,
    conditions: conditionsData,
    settings: question.settings || {}
};
```

**Proceso**:
1. Se recolectan todos los datos de las preguntas
2. El valor `required` se convierte de boolean a entero (1 o 0)
3. Se incluye en el objeto `baseData` que se enviará al servidor

### 2.4 Envío AJAX
**Archivo**: `assets/js/admin-builder-v2.js` (método `saveForm()`)

```javascript
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
```

### 2.5 Procesamiento en el Servidor (PHP)
**Archivo**: `includes/class-sfq-ajax.php` (método `save_form()`)

```php
public function save_form() {
    // Validaciones de seguridad...
    
    // Obtener y validar datos del formulario
    $form_data = $this->get_and_validate_form_data();
    
    // Guardar formulario con manejo de errores mejorado
    $form_id = $this->database->save_form($form_data);
}
```

### 2.6 Guardado en Base de Datos
**Archivo**: `includes/class-sfq-database.php` (método `save_questions()`)

```php
private function save_questions($form_id, $questions) {
    foreach ($questions as $index => $question) {
        $question_data = array(
            'form_id' => $form_id,
            'question_text' => sanitize_textarea_field($question['question_text']),
            'question_type' => sanitize_text_field($question['question_type']),
            'options' => wp_json_encode($options_data),
            'settings' => wp_json_encode($question['settings'] ?? array()),
            'required' => isset($question['required']) && $question['required'] ? 1 : 0,  // ✅ PROCESAMIENTO
            'order_position' => $index,
            // ... otros campos
        );
        
        // INSERT o UPDATE según corresponda
        if ($existing_question_id) {
            $wpdb->update($this->questions_table, $question_data, array('id' => $existing_question_id));
        } else {
            $wpdb->insert($this->questions_table, $question_data);
        }
    }
}
```

**Proceso de normalización**:
```php
'required' => isset($question['required']) && $question['required'] ? 1 : 0
```

## 3. Flujo de Recuperación (Base de Datos → Admin)

### 3.1 Carga desde Base de Datos
**Archivo**: `includes/class-sfq-database.php` (método `get_questions()`)

```php
public function get_questions($form_id) {
    global $wpdb;
    
    $questions = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$this->questions_table} 
        WHERE form_id = %d 
        ORDER BY order_position ASC",
        $form_id
    ));
    
    foreach ($questions as &$question) {
        $question = $this->process_question_data($question);  // ✅ PROCESAMIENTO
    }
    
    return $questions;
}
```

### 3.2 Procesamiento de Datos
**Archivo**: `includes/class-sfq-database.php` (método `process_question_data()`)

```php
private function process_question_data($question) {
    // ... otros procesamientos
    
    // Procesar campo required
    $question->required = $this->process_required_field($question->required);  // ✅ NORMALIZACIÓN
    
    return $question;
}
```

### 3.3 Normalización del Campo Required
**Archivo**: `includes/class-sfq-utils.php` (método `process_required_field()`)

```php
public static function process_required_field($required) {
    if (is_bool($required)) {
        return $required ? 1 : 0;
    }
    
    if (is_numeric($required)) {
        return intval($required) ? 1 : 0;  // ✅ CONVERSIÓN A ENTERO
    }
    
    if (is_string($required)) {
        $required = strtolower(trim($required));
        return in_array($required, array('1', 'true', 'yes', 'on')) ? 1 : 0;
    }
    
    return 0;  // Valor por defecto
}
```

### 3.4 Envío al Frontend (AJAX Response)
**Archivo**: `includes/class-sfq-ajax.php` (método `get_form_data()`)

```php
public function get_form_data() {
    // Obtener formulario de la base de datos
    $form = $this->database->get_form_fresh($form_id);
    
    // Validar y estructurar datos del formulario
    $form = $this->validate_and_structure_form_data($form);
    
    wp_send_json_success($form);  // ✅ ENVÍO AL FRONTEND
}
```

### 3.5 Población en el Frontend
**Archivo**: `assets/js/admin-builder-v2.js` (método `populateFormData()`)

```javascript
populateFormData(formData) {
    // ... otros campos
    
    // Load questions
    if (formData.questions && Array.isArray(formData.questions)) {
        this.questionManager.loadQuestions(formData.questions);  // ✅ CARGA DE PREGUNTAS
    }
}
```

### 3.6 Renderizado del Checkbox
**Archivo**: `assets/js/admin-builder-v2.js` (método `renderQuestion()`)

```javascript
renderQuestion(question) {
    const html = `
        <div class="sfq-question-settings">
            <label>
                <input type="checkbox" class="sfq-required-checkbox" 
                       ${question.required ? 'checked' : ''}>  <!-- ✅ ESTADO DEL CHECKBOX -->
                Pregunta obligatoria
            </label>
        </div>
    `;
    
    return $(html);
}
```

## 4. Validación y Normalización

### 4.1 Valores Aceptados como "True"
```php
// En process_required_field()
$true_values = array('1', 'true', 'yes', 'on');
```

### 4.2 Conversiones de Tipo
```javascript
// JavaScript: Boolean → Integer
required: question.required ? 1 : 0
```

```php
// PHP: Mixed → Integer
return intval($required) ? 1 : 0;
```

### 4.3 Valores por Defecto
- **Base de datos**: `DEFAULT FALSE` (0)
- **JavaScript**: `false`
- **PHP**: `0` (después del procesamiento)

## 5. Flujo Completo Resumido

```
[ADMIN UI]
    ↓ (User clicks checkbox)
[JavaScript Event Handler]
    ↓ (Updates question.required)
[Form Save Trigger]
    ↓ (Collects all form data)
[AJAX Request]
    ↓ (JSON serialized data)
[PHP AJAX Handler]
    ↓ (Validates and processes)
[Database Layer]
    ↓ (Normalizes and stores)
[MySQL Database]
    ↓ (required BOOLEAN field)

[RELOAD PROCESS]

[Database Query]
    ↓ (SELECT questions)
[Data Processing]
    ↓ (Normalizes required field)
[AJAX Response]
    ↓ (JSON data to frontend)
[JavaScript Population]
    ↓ (Updates question objects)
[UI Rendering]
    ↓ (Sets checkbox state)
[ADMIN UI]
```

## 6. Archivos Involucrados

### Frontend (JavaScript)
- `assets/js/admin-builder-v2.js` - Lógica principal del builder
- `assets/js/preview-manager.js` - Gestión de preview

### Backend (PHP)
- `includes/class-sfq-ajax.php` - Handlers AJAX
- `includes/class-sfq-database.php` - Operaciones de base de datos
- `includes/class-sfq-utils.php` - Utilidades de procesamiento
- `includes/class-sfq-frontend.php` - Renderizado frontend

### Base de Datos
- Tabla: `wp_sfq_questions`
- Campo: `required BOOLEAN DEFAULT FALSE`

## 7. Puntos Críticos del Sistema

### 7.1 Consistencia de Tipos
- **Problema**: Conversión entre boolean (JS) ↔ integer (PHP) ↔ boolean (MySQL)
- **Solución**: Normalización consistente en `SFQ_Utils::process_required_field()`

### 7.2 Validación de Entrada
- **Validación**: Múltiples formatos aceptados ('1', 'true', 'yes', 'on', true, 1)
- **Normalización**: Siempre se convierte a entero (0 o 1)

### 7.3 Valores por Defecto
- **Consistencia**: Todos los niveles usan `false`/`0` como valor por defecto
- **Robustez**: Fallback a `0` si el valor es inválido

## 8. Consideraciones de Rendimiento

### 8.1 Caching
- Los datos del formulario se cachean por 5 minutos
- Cache key: `sfq_form_data_{$form_id}`

### 8.2 Optimizaciones
- Batch operations para múltiples preguntas
- Transacciones para integridad de datos
- Índices de base de datos para consultas rápidas

## 9. Debugging y Logging

### 9.1 Puntos de Log Importantes
```php
error_log('SFQ: Processing required field: ' . print_r($required, true));
error_log('SFQ: Normalized required value: ' . $normalized_value);
```

### 9.2 Verificación de Estado
```javascript
console.log('SFQ: Question required state:', question.required);
console.log('SFQ: Checkbox checked:', $('.sfq-required-checkbox').is(':checked'));
```

## 10. Validación en el Frontend del Formulario

### 10.1 Renderizado de Campos Obligatorios
**Archivo**: `includes/class-sfq-frontend.php` (líneas 300-310)

```php
<!-- Texto de la pregunta -->
<h3 class="sfq-question-text">
    <?php echo esc_html($question->question_text); ?>
    <?php if ($question->required) : ?>
        <span class="sfq-required">*</span>
    <?php endif; ?>
</h3>
```

**Proceso**:
1. Se verifica la propiedad `$question->required` 
2. Si es `true`, se añade `<span class="sfq-required">*</span>`
3. El asterisco rojo indica visualmente que el campo es obligatorio

### 10.2 Validación JavaScript en Frontend
**Archivo**: `assets/js/frontend.js` (método `validateCurrentQuestion()`)

```javascript
validateCurrentQuestion() {
    const currentQuestion = this.currentScreen;
    if (!currentQuestion) return true;

    const questionId = currentQuestion.dataset.questionId;
    const questionType = currentQuestion.dataset.questionType;

    // Verificar si es requerida
    const isRequired = currentQuestion.querySelector('.sfq-required');
    if (!isRequired) return true;

    // Validar según tipo
    switch (questionType) {
        case 'single_choice':
        case 'image_choice':
            return this.responses[questionId] !== undefined;
            
        case 'multiple_choice':
            return this.responses[questionId] && this.responses[questionId].length > 0;
            
        case 'text':
        case 'email':
            const input = currentQuestion.querySelector('.sfq-text-input');
            return input && input.value.trim() !== '' && input.checkValidity();
            
        case 'rating':
            return this.responses[questionId] !== undefined;
            
        case 'freestyle':
            return this.validateFreestyleQuestion(currentQuestion);
            
        default:
            return true;
    }
}
```

### 10.3 Validación de Preguntas Freestyle
**Archivo**: `assets/js/frontend.js` (método `validateFreestyleQuestion()`)

```javascript
validateFreestyleQuestion(questionScreen) {
    const questionId = questionScreen.dataset.questionId;
    const freestyleContainer = questionScreen.querySelector('.sfq-freestyle-container');
    
    if (!freestyleContainer) return true;

    // Obtener elementos requeridos
    const requiredElements = freestyleContainer.querySelectorAll('[required], .sfq-required');
    
    for (const element of requiredElements) {
        const elementId = element.id ? element.id.replace('element_', '') : null;
        
        if (!elementId) continue;

        // Verificar si hay respuesta para este elemento
        const hasResponse = this.responses[questionId] && 
                          this.responses[questionId][elementId] && 
                          this.responses[questionId][elementId] !== '';

        if (!hasResponse) {
            // Hacer scroll al elemento problemático
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Añadir clase de error temporal
            element.classList.add('sfq-validation-error');
            setTimeout(() => {
                element.classList.remove('sfq-validation-error');
            }, 3000);
            
            return false;
        }

        // Validación específica para emails
        if (element.type === 'email' && !element.checkValidity()) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('sfq-validation-error');
            setTimeout(() => {
                element.classList.remove('sfq-validation-error');
            }, 3000);
            return false;
        }
    }

    return true;
}
```

### 10.4 Manejo de Errores de Validación
**Archivo**: `assets/js/frontend.js` (método `showError()`)

```javascript
showError(message) {
    // Crear elemento de error si no existe
    let errorDiv = this.container.querySelector('.sfq-error-message');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'sfq-error-message';
        this.currentScreen.querySelector('.sfq-question-content').appendChild(errorDiv);
    }

    errorDiv.textContent = message;
    errorDiv.style.display = 'block';

    // Ocultar después de 3 segundos
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 3000);
}
```

### 10.5 Flujo de Validación Completo

```
[USUARIO HACE CLIC EN "SIGUIENTE"]
    ↓
[JavaScript: nextQuestion()]
    ↓
[Llamada a validateCurrentQuestion()]
    ↓
[Buscar elemento .sfq-required en DOM]
    ↓ (Si existe)
[Validar según tipo de pregunta]
    ↓ (Si falla)
[Mostrar mensaje de error]
[Hacer scroll al campo problemático]
[Añadir clase de error visual]
[DETENER navegación]
    ↓ (Si pasa)
[Continuar con navegación normal]
```

### 10.6 Estilos CSS para Validación
**Archivo**: `assets/js/frontend.js` (estilos inline)

```css
.sfq-error-message {
    background: #fee;
    color: #c33;
    padding: 1rem;
    border-radius: 8px;
    margin-top: 1rem;
    display: none;
    animation: shake 0.5s;
}

.sfq-required {
    color: #dc3545;
    font-weight: bold;
    margin-left: 4px;
}

.sfq-validation-error {
    border-color: #dc3545 !important;
    box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25) !important;
}

@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-10px); }
    75% { transform: translateX(10px); }
}
```

### 10.7 Tipos de Validación por Tipo de Pregunta

| Tipo de Pregunta | Validación Aplicada |
|------------------|-------------------|
| `single_choice` | Verificar que `responses[questionId]` no sea `undefined` |
| `multiple_choice` | Verificar que el array tenga al menos un elemento |
| `text` | Verificar que el valor no esté vacío y sea válido |
| `email` | Verificar formato de email con `checkValidity()` |
| `rating` | Verificar que se haya seleccionado una puntuación |
| `image_choice` | Verificar que se haya seleccionado una imagen |
| `freestyle` | Validación personalizada por elemento |

### 10.8 Mensajes de Error Estándar

```javascript
// Mensaje por defecto para campos obligatorios
'Por favor, responde a esta pregunta antes de continuar.'

// Mensaje específico para emails
'Por favor, introduce un email válido'

// Mensajes personalizados según configuración del formulario
this.settings.validation_messages?.required || 'Campo obligatorio'
```

## 11. Flujo Completo: Admin → Base de Datos → Frontend

```
[ADMIN BUILDER]
    ↓ (Marca checkbox "Pregunta obligatoria")
[JavaScript: question.required = true]
    ↓ (Guarda formulario)
[AJAX: sfq_save_form]
    ↓ (Procesa datos)
[PHP: save_questions()]
    ↓ (Normaliza valor)
[MySQL: required BOOLEAN = 1]

[RECARGA DEL ADMIN]
    ↓ (Obtiene formulario)
[PHP: get_questions()]
    ↓ (Procesa datos)
[JavaScript: question.required = true]
    ↓ (Renderiza checkbox)
[HTML: checked="checked"]

[FRONTEND DEL FORMULARIO]
    ↓ (Renderiza pregunta)
[PHP: render_question_type()]
    ↓ (Verifica required)
[HTML: <span class="sfq-required">*</span>]
    ↓ (Usuario intenta avanzar)
[JavaScript: validateCurrentQuestion()]
    ↓ (Busca .sfq-required)
[Validación según tipo de pregunta]
    ↓ (Si falla)
[Mensaje de error + scroll + clase CSS]
    ↓ (Si pasa)
[Navegación normal]
```

## 12. Conclusiones

La opción "Pregunta obligatoria" implementa un flujo completo y robusto que abarca:

### 12.1 Backend (Administración)
1. **Interfaz intuitiva** con checkbox visual
2. **Guardado consistente** con normalización de tipos
3. **Recuperación confiable** con valores por defecto
4. **Validación de entrada** en múltiples capas

### 12.2 Frontend (Formulario Final)
1. **Indicación visual clara** con asterisco rojo
2. **Validación JavaScript robusta** por tipo de pregunta
3. **Mensajes de error informativos** con animaciones
4. **Experiencia de usuario fluida** con scroll automático
5. **Compatibilidad completa** con todos los tipos de pregunta

### 12.3 Características Técnicas
1. **Mantiene consistencia** entre diferentes tipos de datos
2. **Valida entrada** de múltiples formatos
3. **Normaliza valores** a un formato estándar
4. **Preserva estado** correctamente entre sesiones
5. **Maneja errores** graciosamente con valores por defecto
6. **Proporciona feedback visual** inmediato al usuario
7. **Previene envío incompleto** del formulario

El sistema es resiliente y maneja correctamente las conversiones de tipo necesarias para mantener la integridad de los datos a través de toda la aplicación, desde la configuración en el admin hasta la validación final en el frontend.
