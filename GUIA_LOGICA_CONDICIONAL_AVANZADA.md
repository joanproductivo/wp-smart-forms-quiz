# Guía de Lógica Condicional Avanzada
## Smart Forms & Quiz Plugin - WordPress

### Versión: 2.0
### Fecha: Agosto 2025

---

## 📋 Índice

1. [Introducción](#introducción)
2. [Características Implementadas](#características-implementadas)
3. [Arquitectura del Sistema](#arquitectura-del-sistema)
4. [Variables Globales](#variables-globales)
5. [Sistema de Condiciones](#sistema-de-condiciones)
6. [Preguntas Estilo Libre](#preguntas-estilo-libre)
7. [Integración Frontend](#integración-frontend)
8. [Casos de Uso](#casos-de-uso)
9. [Guía de Desarrollo](#guía-de-desarrollo)

---

## 🎯 Introducción

El sistema de lógica condicional avanzada permite crear formularios inteligentes que se adaptan dinámicamente según las respuestas del usuario. Este sistema incluye:

- **Variables globales** para almacenar y manipular datos
- **Condiciones avanzadas** basadas en respuestas y variables
- **Preguntas estilo libre** con elementos configurables
- **Acciones dinámicas** que modifican el flujo del formulario

---

## ✨ Características Implementadas

### 🔢 Variables Globales
- ✅ **Creación y gestión** de variables globales
- ✅ **Tipos soportados**: número, texto, boolean
- ✅ **Interfaz completa** con modal de configuración
- ✅ **Validación** de nombres únicos y formatos
- ✅ **Persistencia** en la base de datos

### 🧠 Sistema de Condiciones Avanzadas
- ✅ **Condiciones basadas en respuestas**:
  - Igual a, contiene, no igual a
  - Mayor que, menor que
- ✅ **Condiciones basadas en variables**:
  - Comparaciones numéricas y de texto
  - Rangos (entre valores)
  - Contiene texto
- ✅ **Acciones avanzadas**:
  - Navegación (ir a pregunta, saltar al final, redirigir)
  - Manipulación de variables (sumar, restar, establecer, multiplicar)
  - Mensajes personalizados y categorización

### 🎨 Preguntas Estilo Libre
- ✅ **Panel de lógica condicional** integrado
- ✅ **14 tipos de elementos** configurables:
  - 📝 Texto (simple y multilínea)
  - 🎥 Video (YouTube, Vimeo, MP4)
  - 🖼️ Imagen (con opciones de tamaño)
  - ⏰ Cuenta atrás (con fecha objetivo)
  - 📞 Teléfono (con validación)
  - 📧 Email (con validación de dominio)
  - 📤 Subir imagen (con restricciones)
  - 🔘 Botón (con URL y estilos)
  - ⭐ Valoración (estrellas, corazones, emojis)
  - 📋 Desplegable (con opciones dinámicas)
  - ☑️ Checkbox (con texto personalizable)
  - ⚖️ Texto RGPD (con aceptación opcional)
  - ✨ Texto Estilizado
  - 🔢 Mostrar Variable

### 🎛️ Interfaz de Usuario
- ✅ **Diseño moderno** con gradientes y animaciones
- ✅ **Paneles desplegables** para configuración
- ✅ **Validación en tiempo real**
- ✅ **Responsive design** para móviles
- ✅ **Iconos y emojis** para mejor UX

---

## 🏗️ Arquitectura del Sistema

### Componentes JavaScript

#### 1. **FormBuilderCore**
```javascript
class FormBuilderCore {
    // Controlador principal que coordina todos los módulos
    - stateManager: StateManager
    - questionManager: QuestionManager  
    - conditionEngine: ConditionEngine
    - uiRenderer: UIRenderer
    - dataValidator: DataValidator
}
```

#### 2. **ConditionEngine**
```javascript
class ConditionEngine {
    // Motor de lógica condicional avanzado
    + loadConditions(questionId, conditionsData)
    + addCondition(questionId)
    + bindConditionEvents(conditionId, questionId)
    + renderConditions(questionId)
}
```

#### 3. **QuestionManager**
```javascript
class QuestionManager {
    // Gestión de preguntas y elementos freestyle
    + addFreestyleElement(questionId, elementType)
    + openElementConfigModal(questionId, elementId, elementType)
    + createElementConfigPanel(element, elementType, questionId)
}
```

#### 4. **UIRenderer**
```javascript
class UIRenderer {
    // Renderizado de componentes UI avanzados
    + renderCondition(condition)
    + renderFreestyleQuestion(question)
    + renderFreestyleElement(element)
}
```

### Estructura de Datos

#### Variables Globales
```javascript
{
    id: 'var_1234567890',
    name: 'puntos_total',
    description: 'Puntuación total del usuario',
    type: 'number',
    initial_value: '0'
}
```

#### Condiciones Avanzadas
```javascript
{
    id: 'c_q123_0',
    type: 'variable_greater',
    variable: 'puntos_total',
    value: '50',
    valueMax: '100', // Para condiciones "between"
    action: 'goto_question',
    targetQuestion: 'q456',
    actionVariable: 'categoria_usuario',
    actionValue: 'experto'
}
```

#### Elementos Freestyle
```javascript
{
    id: 'element_1234567890',
    type: 'rating',
    label: 'Califica nuestro servicio',
    order: 0,
    settings: {
        rating_type: 'stars',
        max_rating: 5,
        icons: ['😞', '😐', '🙂', '😊', '😍']
    }
}
```

---

## 🔢 Variables Globales

### Creación de Variables

1. **Acceso**: Tab "Variables" en el constructor de formularios
2. **Botón**: "Añadir Variable Global"
3. **Campos requeridos**:
   - Nombre (solo letras, números, guiones bajos)
   - Descripción (explicación del uso)
   - Tipo (número, texto, boolean)
   - Valor inicial

### Tipos de Variables

#### Número
```javascript
{
    name: 'puntos_total',
    type: 'number',
    initial_value: '0'
}
```

#### Texto
```javascript
{
    name: 'categoria_usuario',
    type: 'text', 
    initial_value: 'principiante'
}
```

#### Boolean
```javascript
{
    name: 'acepta_newsletter',
    type: 'boolean',
    initial_value: 'false'
}
```

### Casos de Uso Comunes

- **🏆 Sistema de Puntuación**: `puntos_total`, `puntos_seccion`
- **📊 Categorización**: `nivel_usuario`, `tipo_personalidad`
- **🎯 Seguimiento**: `respuestas_correctas`, `tiempo_total`
- **🔢 Contadores**: `intentos_fallidos`, `preguntas_respondidas`

---

## 🧠 Sistema de Condiciones

### Tipos de Condiciones

#### 📝 Basadas en Respuesta
- **answer_equals**: La respuesta es igual a
- **answer_contains**: La respuesta contiene
- **answer_not_equals**: La respuesta NO es igual a
- **answer_greater**: La respuesta es mayor que
- **answer_less**: La respuesta es menor que

#### 🔢 Basadas en Variables Globales
- **variable_equals**: Variable es igual a
- **variable_greater**: Variable es mayor que
- **variable_less**: Variable es menor que
- **variable_between**: Variable está entre dos valores
- **variable_contains**: Variable contiene texto

### Tipos de Acciones

#### 🔄 Navegación
- **goto_question**: Ir a pregunta específica
- **skip_to_end**: Saltar al final del formulario
- **redirect_url**: Redirigir a URL externa

#### 🔢 Manipulación de Variables
- **add_variable**: Sumar valor a variable
- **subtract_variable**: Restar valor a variable
- **set_variable**: Establecer valor específico
- **multiply_variable**: Multiplicar variable

#### 💬 Mensajes y Resultados
- **show_message**: Mostrar mensaje personalizado
- **show_category**: Mostrar categoría/resultado

### Ejemplo de Configuración

```javascript
// Condición: Si puntos_total > 80, entonces categoria_usuario = "experto"
{
    type: 'variable_greater',
    variable: 'puntos_total',
    value: '80',
    action: 'set_variable',
    actionVariable: 'categoria_usuario',
    actionValue: 'experto'
}
```

---

## 🎨 Preguntas Estilo Libre

### Elementos Disponibles

#### 📝 Texto
- **Configuración**: Placeholder, multilínea, longitud máxima
- **Uso**: Campos de entrada de texto personalizables

#### 🎥 Video
- **Soporta**: YouTube, Vimeo, archivos MP4
- **Configuración**: Autoplay, controles, dimensiones
- **Ejemplo**: `https://youtube.com/watch?v=VIDEO_ID`

#### 🖼️ Imagen
- **Configuración**: URL, texto alternativo, dimensiones
- **Funcionalidad**: Imagen clickeable para registrar interacciones

#### ⏰ Cuenta Atrás
- **Configuración**: Fecha objetivo, textos personalizados
- **Uso**: Crear urgencia o mostrar eventos próximos

#### 📞 Teléfono
- **Configuración**: Placeholder, patrón de validación
- **Validación**: Expresiones regulares personalizables

#### 📧 Email
- **Configuración**: Placeholder, validación de dominio
- **Validación**: Formato de email automático

#### 📤 Subir Imagen
- **Configuración**: Tipos permitidos, tamaño máximo, múltiples archivos
- **Restricciones**: 1MB-25MB, formatos específicos

#### 🔘 Botón
- **Configuración**: Texto, URL, estilo, nueva pestaña
- **Estilos**: Primario, secundario, contorno

#### ⭐ Valoración
- **Tipos**: Estrellas, corazones, emojis personalizados
- **Configuración**: Máximo (2-10), iconos personalizables

#### 📋 Desplegable
- **Configuración**: Placeholder, opciones dinámicas
- **Gestión**: Añadir/eliminar opciones en tiempo real

#### ☑️ Checkbox
- **Configuración**: Texto personalizable, obligatorio
- **Uso**: Aceptación de términos, opciones binarias

#### ⚖️ Texto RGPD
- **Configuración**: Contenido HTML, aceptación requerida
- **Uso**: Términos legales, políticas de privacidad

### Panel de Configuración

Cada elemento tiene un **panel de configuración inline** que se despliega al hacer clic en el icono de configuración:

```html
<div class="sfq-element-config-panel">
    <div class="sfq-config-header">
        <h4>⚙️ Configurar Elemento</h4>
        <button class="sfq-config-close">×</button>
    </div>
    <div class="sfq-config-content">
        <!-- Configuraciones específicas -->
    </div>
    <div class="sfq-config-actions">
        <button class="sfq-config-cancel">Cancelar</button>
        <button class="sfq-config-save">Guardar cambios</button>
    </div>
</div>
```

---

## 🌐 Integración Frontend

### 🔧 Motor Unificado de Lógica Condicional (v3.0)

#### **Arquitectura Refactorizada** ⚡
El sistema ha sido completamente refactorizado con un **motor unificado** que elimina duplicación de código y mejora la escalabilidad:

```javascript
/**
 * Motor Unificado de Lógica Condicional
 * Centraliza todo el procesamiento de condiciones para evitar duplicación
 */
class ConditionalLogicEngine {
    constructor(formInstance) {
        this.form = formInstance;
        this.cache = new Map();
        this.debugEnabled = true;
    }

    /**
     * Punto de entrada principal para procesar condiciones
     */
    async processConditions(questionId, trigger) {
        const startTime = performance.now();
        
        // Construir contexto para evaluación
        const context = this.buildContext(questionId, trigger);
        
        // Obtener condiciones aplicables según el trigger
        const conditions = await this.getApplicableConditions(questionId, trigger);
        
        // Evaluar condiciones en orden de prioridad
        for (const condition of conditions) {
            if (this.shouldEvaluateCondition(condition, trigger)) {
                const result = await this.evaluateCondition(condition, context);
                
                if (result.shouldExecute) {
                    return await this.executeAction(result.action, context);
                }
            }
        }
        
        return this.getDefaultResult(context);
    }
}
```

#### **Sistema de Triggers Diferenciados** 🎯
El motor unificado utiliza un sistema de triggers para procesar condiciones según el contexto:

```javascript
// Trigger para respuestas del usuario
const answerTrigger = {
    type: 'answer',
    hasAnswer: true,
    answer: userResponse,
    element: clickedElement
};

// Trigger para navegación sin respuesta
const navigationTrigger = {
    type: 'navigation',
    hasAnswer: false,
    answer: null,
    element: null
};

// Procesamiento unificado
const result = await this.conditionalEngine.processConditions(questionId, trigger);
```

#### **Funciones Refactorizadas** 🔄

##### **handleSingleChoice - Migrado al Motor Unificado**
```javascript
async handleSingleChoice(e) {
    // ✅ REFACTORIZADO: Usar motor unificado de lógica condicional
    const trigger = {
        type: 'answer',
        hasAnswer: true,
        answer: card.dataset.value,
        element: card
    };

    const redirectResult = await this.conditionalEngine.processConditions(questionId, trigger);
    
    // Manejar resultado unificado
    if (redirectResult && redirectResult.shouldRedirect) {
        // Lógica de redirección
    }
    
    if (redirectResult && redirectResult.variables) {
        this.variables = { ...redirectResult.variables };
        this.updateVariablesInDOM();
    }
}
```

##### **processConditionsForNavigation - Migrado al Motor Unificado**
```javascript
async processConditionsForNavigation(questionId) {
    // ✅ REFACTORIZADO: Usar motor unificado con trigger de navegación
    const trigger = {
        type: 'navigation',
        hasAnswer: false,
        answer: null,
        element: null
    };

    const result = await this.conditionalEngine.processConditions(questionId, trigger);
    
    // Fallback a AJAX si no hay condiciones locales
    if (!result.shouldRedirect && !result.skipToQuestion) {
        const currentAnswer = this.responses[questionId];
        if (currentAnswer === undefined) {
            const ajaxResult = await this.checkConditionsViaAjax(questionId, null);
            return ajaxResult;
        }
    }
    
    return result;
}
```

#### **Compatibilidad Hacia Atrás** 🔄
Las funciones existentes se mantienen como wrappers para garantizar compatibilidad:

```javascript
/**
 * ✅ REFACTORIZADO: Usar motor unificado para evaluación de condiciones
 * Mantener como wrapper para compatibilidad hacia atrás
 */
evaluateConditionsForRedirect(conditions, questionId, customVariables = null) {
    // Crear contexto temporal para el motor unificado
    const context = {
        questionId,
        answer: this.responses[questionId],
        variables: customVariables || this.variables,
        responses: this.responses,
        isSecureMode: this.isSecureMode,
        timestamp: Date.now()
    };

    // Evaluar usando la lógica del motor unificado
    for (const condition of conditions) {
        const conditionMet = this.conditionalEngine.evaluateConditionLogic(condition, context);
        if (conditionMet) {
            // Ejecutar acciones y retornar resultado
            return this.executeConditionAction(condition, context);
        }
    }
}
```

#### **Beneficios del Motor Unificado** 🚀

##### **1. Eliminación de Duplicación**
- ✅ **Una sola implementación** de lógica condicional
- ✅ **Funciones de utilidad centralizadas** (`getComparisonValue`, `smartCompare`)
- ✅ **Ejecución de acciones unificada**
- ✅ **Sin código huérfano**

##### **2. Escalabilidad Mejorada**
```javascript
// Fácil añadir nuevos tipos de triggers
const triggers = {
    'answer': this.getAnswerConditions,
    'navigation': this.getNavigationConditions,
    'timer': this.getTimerConditions,        // ← Futuro
    'variable_change': this.getVariableConditions, // ← Futuro
    'external_event': this.getExternalConditions   // ← Futuro
}
```

##### **3. Sistema de Cache Integrado**
```javascript
async getApplicableConditions(questionId, trigger) {
    // Cache por tipo de trigger
    const cacheKey = `${questionId}_${trigger.type}`;
    if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
    }
    
    // Procesar y cachear
    const conditions = await this.processConditionsForTrigger(questionId, trigger);
    this.cache.set(cacheKey, conditions);
    return conditions;
}
```

##### **4. Logging y Debug Centralizado**
```javascript
if (this.debugEnabled) {
    console.log('🔧 ConditionalEngine: Processing conditions', {
        questionId,
        triggerType: trigger.type,
        hasAnswer: trigger.hasAnswer,
        answer: trigger.answer
    });
    
    const duration = performance.now() - startTime;
    console.log('🔧 ConditionalEngine: Action executed', {
        condition: condition.condition_type,
        action: result.action.type,
        duration: `${duration.toFixed(2)}ms`
    });
}
```

#### **Procesamiento Sin Respuesta** 🔄
Cuando el usuario hace clic en "Siguiente" sin responder, el sistema ahora:

- ✅ **Usa trigger de navegación** específico
- ✅ **Evalúa solo condiciones de variables** (evita duplicación)
- ✅ **Considera cambios desde preguntas anteriores**
- ✅ **Aplica la primera condición verdadera**
- ✅ **Actualiza variables antes de la navegación**

#### **Prevención de Procesamiento Duplicado** ⚠️
```javascript
async nextQuestion() {
    const questionId = currentQuestion.dataset.questionId;
    const hasCurrentAnswer = this.responses[questionId] !== undefined;
    
    // ✅ SOLUCIÓN: Solo procesar condiciones si NO hay respuesta específica
    // Si hay respuesta, las condiciones ya se procesaron en handleSingleChoice/etc.
    if (!hasCurrentAnswer) {
        const redirectResult = await this.processConditionsForNavigation(questionId);
        // ... manejar resultado
    } else {
        console.log('🔧 Navigation: Answer found, skipping navigation conditions (already processed)');
    }
}
```

### Renderizado de Elementos

El sistema debe renderizar cada tipo de elemento en el frontend:

```php
// En class-sfq-frontend.php
switch ($element['type']) {
    case 'text':
        return $this->render_text_element($element);
    case 'video':
        return $this->render_video_element($element);
    case 'rating':
        return $this->render_rating_element($element);
    // ... otros elementos
}
```

### Procesamiento de Condiciones

```php
// En class-sfq-ajax.php - Procesamiento mejorado
public function process_conditions($question_id, $answer, $variables) {
    $conditions = $this->get_question_conditions($question_id);
    
    // Procesar condiciones en orden de prioridad
    foreach ($conditions as $condition) {
        if ($this->evaluate_condition($condition, $answer, $variables)) {
            $result = $this->execute_action($condition, $variables);
            
            // ✅ NUEVO: Marcar si hay navegación condicional
            $result['has_conditional_navigation'] = true;
            
            return $result;
        }
    }
    
    return [
        'has_conditional_navigation' => false,
        'variables' => $variables
    ];
}
```

### Gestión de Variables

```php
// Actualizar variables según las acciones - Versión mejorada
private function execute_action($condition, &$variables) {
    switch ($condition['action_type']) {
        case 'add_variable':
            $current = isset($variables[$condition['action_variable']]) 
                ? floatval($variables[$condition['action_variable']]) 
                : 0;
            $variables[$condition['action_variable']] = $current + floatval($condition['action_value']);
            break;
            
        case 'set_variable':
            $variables[$condition['action_variable']] = $condition['action_value'];
            break;
            
        case 'redirect_url':
            return [
                'redirect_url' => $condition['action_value'],
                'variables' => $variables
            ];
            
        case 'goto_question':
            return [
                'next_question_id' => $condition['action_value'],
                'has_conditional_navigation' => true,
                'variables' => $variables
            ];
            
        case 'skip_to_end':
            return [
                'form_completed' => true,
                'variables' => $variables
            ];
    }
    
    return ['variables' => $variables];
}
```

### Funciones de Utilidad Frontend

```javascript
// En assets/js/frontend.js - Nuevas funciones de utilidad

/**
 * Encontrar elemento DOM correspondiente a una respuesta
 */
findElementForAnswer(questionContainer, answer) {
    // Buscar por valor exacto
    let element = questionContainer.querySelector(`[data-value="${answer}"]`);
    if (element) return element;
    
    // Para respuestas múltiples
    if (Array.isArray(answer)) {
        for (const value of answer) {
            element = questionContainer.querySelector(`[data-value="${value}"]`);
            if (element) return element;
        }
    }
    
    // Para inputs de texto
    const textInputs = questionContainer.querySelectorAll('input[type="text"], input[type="email"], textarea');
    for (const input of textInputs) {
        if (input.value === answer) return input;
    }
    
    return null;
}

/**
 * Evaluación de condiciones con variables personalizadas
 */
evaluateConditionsForRedirect(conditions, questionId, customVariables = null) {
    const currentVariables = customVariables || this.variables;
    const result = {
        shouldRedirect: false,
        redirectUrl: null,
        skipToQuestion: null,
        variables: { ...currentVariables }
    };
    
    // Procesar condiciones en orden - la primera verdadera se ejecuta
    for (let i = 0; i < conditions.length; i++) {
        const condition = conditions[i];
        const conditionResult = this.evaluateConditionImmediate(condition, answer, questionId);
        
        if (conditionResult) {
            // Ejecutar acción y salir del bucle
            this.executeConditionAction(condition, result);
            break;
        }
    }
    
    return result;
}
```

---

## 💡 Casos de Uso

### 1. Quiz de Personalidad

```javascript
// Variables
{
    name: 'puntos_extroversion',
    type: 'number',
    initial_value: '0'
}

// Condición
{
    type: 'answer_equals',
    value: 'Me gusta socializar',
    action: 'add_variable',
    actionVariable: 'puntos_extroversion',
    actionValue: '10'
}

// Resultado final
{
    type: 'variable_greater',
    variable: 'puntos_extroversion',
    value: '50',
    action: 'show_category',
    actionValue: 'Eres una persona extrovertida'
}
```

### 2. Sistema de Puntuación

```javascript
// Pregunta con puntuación
{
    type: 'answer_equals',
    value: 'Respuesta correcta',
    action: 'add_variable',
    actionVariable: 'puntos_total',
    actionValue: '20'
}

// Navegación condicional
{
    type: 'variable_greater',
    variable: 'puntos_total',
    value: '80',
    action: 'goto_question',
    targetQuestion: 'pregunta_avanzada'
}
```

### 3. Formulario Adaptativo

```javascript
// Mostrar campos adicionales según respuesta
{
    type: 'answer_equals',
    value: 'Empresa',
    action: 'goto_question',
    targetQuestion: 'datos_empresa'
}

// Saltar secciones irrelevantes
{
    type: 'answer_equals',
    value: 'No me interesa',
    action: 'skip_to_end'
}
```

---

## 🛠️ Guía de Desarrollo

### Añadir Nuevo Tipo de Elemento

#### 1. Definir el Tipo
```javascript
// En renderFreestyleControls()
<button class="sfq-add-freestyle-element" data-type="nuevo_elemento">
    🆕 Nuevo Elemento
</button>
```

#### 2. Crear Configuración
```javascript
// En QuestionManager
createNuevoElementoConfig(element) {
    const settings = element.settings || {};
    return `
        <h5>🆕 Configuración de Nuevo Elemento</h5>
        <label class="sfq-config-label">
            Configuración específica:
            <input type="text" class="sfq-config-input" data-setting="config_especifica" 
                   value="${this.formBuilder.uiRenderer.escapeHtml(settings.config_especifica || '')}" 
                   placeholder="Valor por defecto">
        </label>
    `;
}
```

#### 3. Renderizar Vista Previa
```javascript
// En renderElementPreview()
case 'nuevo_elemento':
    return `<div class="sfq-nuevo-preview">🆕 ${element.settings?.config_especifica || 'Nuevo elemento'}</div>`;
```

#### 4. Implementar Frontend
```php
// En class-sfq-frontend.php
private function render_nuevo_elemento_element($element) {
    $settings = $element['settings'] ?? [];
    $config = $settings['config_especifica'] ?? '';
    
    return sprintf(
        '<div class="sfq-nuevo-elemento" data-element-id="%s">%s</div>',
        esc_attr($element['id']),
        esc_html($config)
    );
}
```

### Añadir Nuevo Tipo de Condición

#### 1. Definir en el Select
```javascript
// En renderCondition()
<option value="nueva_condicion">Nueva condición personalizada</option>
```

#### 2. Manejar Lógica
```javascript
// En bindConditionEvents()
if (conditionType === 'nueva_condicion') {
    // Mostrar campos específicos
    $condition.find('.campo-especifico').show();
}
```

#### 3. Implementar Evaluación
```php
// En class-sfq-ajax.php
private function evaluate_condition($condition, $answer, $variables) {
    switch ($condition['condition_type']) {
        case 'nueva_condicion':
            return $this->evaluate_nueva_condicion($condition, $answer, $variables);
        // ... otros casos
    }
}
```

### Mejores Prácticas

#### 1. **Nomenclatura Consistente**
```javascript
// ✅ CORRECTO
'variable_greater'
'add_variable'
'show_message'

// ❌ INCORRECTO
'varGreater'
'addVar'
'showMsg'
```

#### 2. **Validación Robusta**
```javascript
// Siempre validar entrada del usuario
if (!variableName || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variableName)) {
    alert('Nombre de variable inválido');
    return;
}
```

#### 3. **Manejo de Errores**
```javascript
try {
    const result = this.processCondition(condition);
} catch (error) {
    console.error('Error procesando condición:', error);
    this.showNotice('Error en lógica condicional', 'error');
}
```

#### 4. **Performance**
```javascript
// Usar debounce para eventos frecuentes
const debouncedSave = this.debounce(() => this.saveForm(), 500);
```

#### 5. **⚠️ CRÍTICO: Prevención de Procesamiento Duplicado**
```javascript
// ✅ REGLA FUNDAMENTAL: Evitar procesar las mismas condiciones múltiples veces
async nextQuestion() {
    const questionId = currentQuestion.dataset.questionId;
    const hasCurrentAnswer = this.responses[questionId] !== undefined;
    
    // ✅ SOLUCIÓN: Solo procesar condiciones si NO hay respuesta específica
    if (!hasCurrentAnswer) {
        // Las condiciones ya se procesaron en handleSingleChoice/handleMultipleChoice/etc.
        const redirectResult = await this.processConditionsForNavigation(questionId);
        // ... resto de la lógica
    } else {
        console.log('Answer found, skipping navigation conditions (already processed)');
    }
}
```

**Problema común**: Las condiciones se procesan múltiples veces causando:
- ❌ Variables que se incrementan incorrectamente (ej: 0→50→100→150)
- ❌ Acciones duplicadas (redirecciones, saltos de pregunta)
- ❌ Comportamiento impredecible del formulario

**Solución implementada**:
- ✅ Verificar si ya existe una respuesta antes de procesar condiciones
- ✅ Separar condiciones de respuesta vs. condiciones de navegación
- ✅ Procesar condiciones solo una vez por interacción del usuario

#### 6. **Separación de Responsabilidades en Condiciones**
```javascript
// ✅ CORRECTO: Condiciones de respuesta se procesan en handlers específicos
async handleSingleChoice(e) {
    // Procesar condiciones inmediatamente después de la respuesta
    const redirectResult = await this.processConditionsImmediate(card, questionId);
    // ... manejar resultado
}

// ✅ CORRECTO: Condiciones de navegación solo para casos sin respuesta
async processConditionsForNavigation(questionId) {
    // Solo procesar condiciones basadas en variables globales
    const variableOnlyConditions = conditions.filter(condition => {
        return condition.condition_type && 
               condition.condition_type.startsWith('variable_');
    });
    // ... procesar solo condiciones de variables
}
```

#### 7. **Logging y Debug para Condiciones**
```javascript
// ✅ RECOMENDADO: Logging detallado para debug
console.log('🔍 SFQ DEBUG: Processing conditional logic for question:', questionId);
console.log('🔍 SFQ DEBUG: Has current answer:', hasCurrentAnswer);
console.log('🔍 SFQ DEBUG: Current variables:', JSON.stringify(this.variables));

// ✅ ÚTIL: Marcar cuándo se saltan condiciones duplicadas
if (hasCurrentAnswer) {
    console.log('🔍 SFQ DEBUG: Answer found, skipping navigation conditions (already processed)');
}
```

---

## 🎯 Resumen de Archivos Modificados

### JavaScript
- **`assets/js/admin-builder-v2.js`** - Sistema completo implementado

### CSS
- **`assets/css/admin-consolidated.css`** - Estilos para condiciones avanzadas

### Archivos Pendientes (para implementación completa)
- **`includes/class-sfq-frontend.php`** - Renderizado frontend de elementos
- **`includes/class-sfq-ajax.php`** - Procesamiento de condiciones
- **`assets/js/frontend.js`** - Interactividad frontend
- **`assets/css/frontend.css`** - Estilos frontend

---

## 🚀 Próximos Pasos

1. **Implementar renderizado frontend** de todos los elementos freestyle
2. **Crear motor de evaluación** de condiciones en PHP
3. **Añadir validación** de elementos en el frontend
4. **Implementar sistema de variables** en tiempo real
5. **Crear tests** para validar la lógica condicional
6. **Documentar API** para desarrolladores externos

---

**📝 Nota**: Este sistema representa una evolución significativa del plugin, proporcionando capacidades avanzadas de lógica condicional que permiten crear formularios verdaderamente inteligentes y adaptativos.

---

*Documento creado para Smart Forms & Quiz Plugin v2.0*
*Última actualización: Agosto 2025*
