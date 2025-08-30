# Documentación Completa: Lógica Condicional y Variables Globales
## Smart Forms & Quiz Plugin - WordPress

---

## 📋 Índice

1. [Introducción y Arquitectura](#introducción-y-arquitectura)
2. [Componentes del Sistema](#componentes-del-sistema)
3. [Variables Globales](#variables-globales)
4. [Tipos de Condiciones](#tipos-de-condiciones)
5. [Tipos de Acciones](#tipos-de-acciones)
6. [Flujo de Evaluación](#flujo-de-evaluación)
7. [Implementación Técnica](#implementación-técnica)
8. [Base de Datos](#base-de-datos)
9. [✅ NUEVO: Solución del Campo comparison_value](#solución-del-campo-comparison_value)
10. [✅ NUEVO: Guía para Añadir Nuevos Campos](#guía-para-añadir-nuevos-campos)
11. [✅ NUEVO: Implementación de Operaciones Matemáticas](#implementación-de-operaciones-matemáticas)
12. [✅ NUEVO: Arquitectura de Campos Dinámicos](#arquitectura-de-campos-dinámicos)
13. [Casos de Uso Avanzados](#casos-de-uso-avanzados)
14. [Optimización y Escalabilidad](#optimización-y-escalabilidad)
15. [Mejores Prácticas Actualizadas](#mejores-prácticas-actualizadas)
16. [Troubleshooting](#troubleshooting)

---

## 🏗️ Introducción y Arquitectura

### Visión General

La lógica condicional del plugin Smart Forms & Quiz es un sistema avanzado que permite crear formularios dinámicos e interactivos. El sistema evalúa condiciones basadas en las respuestas del usuario y las variables globales para ejecutar acciones específicas como saltar preguntas, redirigir a URLs, o modificar variables.

### Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (JavaScript)                    │
├─────────────────────────────────────────────────────────────┤
│  SmartFormQuiz Class                                        │
│  ├── Evaluación Inmediata (Cliente)                        │
│  ├── Evaluación AJAX (Servidor)                            │
│  ├── Gestión de Variables                                   │
│  ├── ✅ getComparisonValue() - Priorización de campos      │
│  ├── ✅ smartCompare() - Comparación inteligente           │
│  └── Procesamiento de Respuestas                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (PHP)                            │
├─────────────────────────────────────────────────────────────┤
│  SFQ_Ajax Class                                             │
│  ├── get_next_question()                                    │
│  ├── ✅ get_comparison_value() - Fallback inteligente      │
│  ├── ✅ smart_compare() - Comparación números/texto        │
│  ├── evaluate_condition()                                   │
│  ├── determine_redirect()                                   │
│  └── submit_response()                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN BUILDER                            │
├─────────────────────────────────────────────────────────────┤
│  ConditionEngine Class                                      │
│  ├── ✅ generateVariableConditionFields() - Campos separados│
│  ├── ✅ bindConditionValueEvents() - Event binding mejorado │
│  ├── ✅ getConditionsData() - Mapeo correcto de campos     │
│  ├── Creación de Condiciones                               │
│  ├── Gestión de Variables Globales                         │
│  ├── Validación de Lógica                                  │
│  └── Persistencia en BD                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧩 Componentes del Sistema

### 1. **Frontend - SmartFormQuiz Class**

**Ubicación:** `assets/js/frontend.js`

**Responsabilidades:**
- Evaluación inmediata de condiciones en el cliente
- Gestión del estado de variables globales
- Comunicación AJAX con el servidor
- Navegación dinámica entre preguntas

**Métodos Principales:**
```javascript
// Evaluación inmediata de condiciones
processConditionsImmediate(element, questionId)
evaluateConditionsForRedirect(conditions, questionId)
evaluateConditionImmediate(condition, answer, questionId)

// ✅ NUEVOS: Gestión de campos de comparación
getComparisonValue(condition) // Priorización comparison_value > variable_amount
smartCompare(value1, value2, operator) // Comparación inteligente

// Comunicación con servidor
checkConditionsViaAjax(questionId, answer)

// Gestión de variables
this.variables = {} // Estado global de variables
initializeGlobalVariables() // ✅ MEJORADO: Inicialización desde campo oculto
```

### 2. **Backend - SFQ_Ajax Class**

**Ubicación:** `includes/class-sfq-ajax.php`

**Responsabilidades:**
- Evaluación de condiciones en el servidor
- Determinación de redirecciones
- Persistencia de variables en submissions
- Validación de lógica compleja

**Métodos Principales:**
```php
// Evaluación de condiciones
public function get_next_question()
private function evaluate_condition($condition, $answer, $variables)
private function determine_redirect($form_id, $variables, $responses)

// ✅ NUEVOS: Gestión de campos de comparación
private function get_comparison_value($condition) // Fallback inteligente
private function smart_compare($value1, $value2, $operator) // Comparación números/texto

// Gestión de variables
private function calculate_total_score($variables)
```

### 3. **Admin Builder - ConditionEngine Class**

**Ubicación:** `assets/js/admin-builder-v2.js`

**Responsabilidades:**
- Interfaz de creación de condiciones
- Gestión de variables globales
- Validación de configuración
- Persistencia en base de datos

**Métodos Principales:**
```javascript
// Gestión de condiciones
addCondition(questionId)
loadConditions(questionId, conditionsData)
getConditionsData(questionId)

// ✅ NUEVOS: Gestión de campos dinámicos
generateVariableConditionFields(condition) // Campos separados para variables
bindConditionValueEvents($condition, condition) // Event binding mejorado
repopulateConditionDropdowns(questionId) // Re-población de dropdowns

// Variables globales
showVariableModal(variableData)
addVariable(variable)
updateVariable(variable)
```

---

## 🔧 Variables Globales

### Definición y Propósito

Las variables globales son contenedores de datos que persisten durante toda la sesión del formulario. Permiten:
- Acumular puntuaciones
- Categorizar usuarios
- Crear lógica compleja entre preguntas
- Personalizar experiencias

### Estructura de Variables

```javascript
// Estructura en el Admin Builder
{
    id: 'var_1640995200000',
    name: 'puntos_total',
    description: 'Puntuación total del usuario',
    type: 'number',
    initial_value: '0'
}

// Estructura en Runtime (Frontend)
this.variables = {
    'puntos_total': 15,
    'categoria_usuario': 'avanzado',
    'completado_seccion_a': true
}
```

### ✅ **MEJORADO: Inicialización de Variables**

**Problema anterior:** Las variables no se inicializaban correctamente en el frontend.

**Solución implementada:**
```javascript
// En SmartFormQuiz constructor
initializeGlobalVariables() {
    const variablesInput = document.getElementById(`sfq-variables-${this.formId}`);
    if (variablesInput && variablesInput.value) {
        try {
            const globalVariables = JSON.parse(variablesInput.value);
            this.variables = { ...globalVariables };
            console.log('SFQ Frontend Debug: Initialized global variables:', this.variables);
        } catch (e) {
            console.error('SFQ Frontend Error: Failed to parse global variables:', e);
            this.variables = {};
        }
    }
}
```

### Tipos de Variables

#### 1. **Número (number)**
```javascript
{
    type: 'number',
    initial_value: '0',
    // Operaciones: suma, resta, multiplicación, división, comparación
}
```

#### 2. **Texto (text)**
```javascript
{
    type: 'text',
    initial_value: '',
    // Operaciones: asignación, comparación, concatenación
}
```

#### 3. **Booleano (boolean)**
```javascript
{
    type: 'boolean',
    initial_value: 'false',
    // Operaciones: true/false, toggle, comparación
}
```

---

## ⚡ Tipos de Condiciones

### 1. **Condiciones de Respuesta**

#### `answer_equals`
```javascript
{
    condition_type: 'answer_equals',
    condition_value: 'Sí',
    // Evalúa: respuesta === 'Sí'
}
```

#### `answer_contains`
```javascript
{
    condition_type: 'answer_contains',
    condition_value: 'programación',
    // Evalúa: respuesta.includes('programación')
}
```

#### `answer_not_equals`
```javascript
{
    condition_type: 'answer_not_equals',
    condition_value: 'No',
    // Evalúa: respuesta !== 'No'
}
```

### 2. **Condiciones de Variables - ✅ MEJORADAS**

#### `variable_greater`
```javascript
{
    condition_type: 'variable_greater',
    condition_value: 'puntos_total',        // Nombre de la variable
    comparison_value: 50,                   // ✅ NUEVO: Valor a comparar
    variable_amount: 50,                    // ✅ FALLBACK: Para compatibilidad
    // Evalúa: variables['puntos_total'] > 50
}
```

#### `variable_less`
```javascript
{
    condition_type: 'variable_less',
    condition_value: 'puntos_total',
    comparison_value: 25,                   // ✅ NUEVO: Campo específico
    variable_amount: 25,                    // ✅ FALLBACK: Compatibilidad
    // Evalúa: variables['puntos_total'] < 25
}
```

#### `variable_equals`
```javascript
{
    condition_type: 'variable_equals',
    condition_value: 'categoria_usuario',
    comparison_value: 'experto',            // ✅ NUEVO: Soporta texto y números
    variable_amount: 'experto',             // ✅ FALLBACK: Compatibilidad
    // Evalúa: variables['categoria_usuario'] === 'experto'
}
```

---

## 🎯 Tipos de Acciones

### 1. **Navegación**

#### `goto_question`
```javascript
{
    action_type: 'goto_question',
    action_value: '5', // ID de la pregunta destino
    // Resultado: Salta a la pregunta especificada
}
```

#### `skip_to_end`
```javascript
{
    action_type: 'skip_to_end',
    // Resultado: Va directamente al final del formulario
}
```

### 2. **Redirección**

#### `redirect_url`
```javascript
{
    action_type: 'redirect_url',
    action_value: 'https://ejemplo.com/gracias',
    // Resultado: Redirección inmediata a URL externa
}
```

### 3. **Manipulación de Variables - ✅ EXPANDIDAS**

#### `add_variable` (Sumar)
```javascript
{
    action_type: 'add_variable',
    action_value: 'puntos_total',
    variable_amount: 10,
    // Resultado: variables['puntos_total'] += 10
}
```

#### `set_variable` (Establecer)
```javascript
{
    action_type: 'set_variable',
    action_value: 'categoria_usuario',
    variable_amount: 'avanzado',
    // Resultado: variables['categoria_usuario'] = 'avanzado'
}
```

#### ✅ **FUTURAS: Operaciones Matemáticas Avanzadas**
```javascript
// Restar
{
    action_type: 'subtract_variable',
    action_value: 'puntos_total',
    variable_amount: 5,
    // Resultado: variables['puntos_total'] -= 5
}

// Multiplicar
{
    action_type: 'multiply_variable',
    action_value: 'puntos_total',
    variable_amount: 2,
    // Resultado: variables['puntos_total'] *= 2
}

// Dividir
{
    action_type: 'divide_variable',
    action_value: 'puntos_total',
    variable_amount: 2,
    // Resultado: variables['puntos_total'] /= 2
}
```

### 4. **Comunicación**

#### `show_message`
```javascript
{
    action_type: 'show_message',
    action_value: 'Excelente respuesta!',
    // Resultado: Muestra mensaje al usuario
}
```

---

## 🔄 Flujo de Evaluación

### Proceso Completo - ✅ ACTUALIZADO

```mermaid
graph TD
    A[Usuario responde pregunta] --> B[Evaluación inmediata Frontend]
    B --> C{¿Hay condiciones locales?}
    C -->|Sí| D[Evaluar condiciones locales]
    C -->|No| E[Petición AJAX al servidor]
    D --> F{¿Redirección inmediata?}
    F -->|Sí| G[Redirigir a URL]
    F -->|No| H[✅ Actualizar variables globales]
    H --> E
    E --> I[Evaluar condiciones en servidor]
    I --> J[✅ Aplicar operaciones de variables]
    J --> K[Determinar siguiente pregunta]
    K --> L[✅ Retornar variables actualizadas]
    L --> M[Aplicar resultado en Frontend]
    M --> N{¿Continuar formulario?}
    N -->|Sí| O[Mostrar siguiente pregunta]
    N -->|No| P[Finalizar formulario]
```

### ✅ **NUEVO: Evaluación con Campos Dinámicos**

**Priorización de Campos:**
```javascript
// Frontend y Backend usan la misma lógica
getComparisonValue(condition) {
    // 1. PRIORIDAD: comparison_value (campo específico)
    if (condition.comparison_value !== undefined && condition.comparison_value !== '') {
        return condition.comparison_value;
    }
    
    // 2. FALLBACK: variable_amount (compatibilidad)
    return condition.variable_amount || 0;
}
```

**Comparación Inteligente:**
```javascript
smartCompare(value1, value2, operator) {
    // Detectar si ambos valores son numéricos
    if (!isNaN(value1) && !isNaN(value2)) {
        const num1 = parseFloat(value1);
        const num2 = parseFloat(value2);
        // Comparación numérica
        return this.compareNumbers(num1, num2, operator);
    }
    
    // Comparación de texto
    const str1 = String(value1);
    const str2 = String(value2);
    return this.compareStrings(str1, str2, operator);
}
```

---

## 💾 Implementación Técnica

### Base de Datos - ✅ ACTUALIZADA

#### Tabla `sfq_conditions` - **SIN CAMBIOS ESTRUCTURALES**
```sql
CREATE TABLE sfq_conditions (
    id INT(11) NOT NULL AUTO_INCREMENT,
    question_id INT(11) NOT NULL,
    condition_type VARCHAR(50) NOT NULL,
    condition_value TEXT,
    action_type VARCHAR(50) NOT NULL,
    action_value TEXT,
    variable_operation VARCHAR(20),
    variable_amount INT(11),                -- ✅ MANTIENE compatibilidad
    comparison_value TEXT,                  -- ✅ NUEVO: Campo específico para comparaciones
    order_position INT(11) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY question_id (question_id)
);
```

**✅ IMPORTANTE:** No se requirieron cambios en la estructura de la base de datos. El campo `comparison_value` ya existía pero no se estaba utilizando correctamente.

#### Tabla `sfq_submissions` (Variables)
```sql
-- Campo para almacenar variables del usuario
variables LONGTEXT, -- JSON con todas las variables
total_score INT(11) DEFAULT 0 -- Score calculado
```

---

## ✅ Solución del Campo comparison_value

### 🚨 **Problema Identificado**

El campo `sfq-condition-comparison-value` no se guardaba correctamente, causando que las condiciones de variables no funcionaran como esperado.

### 🔧 **Análisis del Problema**

1. **Admin Builder:** El campo se renderizaba pero no se capturaba en `getConditionsData()`
2. **Backend:** Solo se usaba `variable_amount` ignorando `comparison_value`
3. **Frontend:** Misma limitación, solo `variable_amount`
4. **⚠️ Error de Nomenclatura:** Se usaba `condition.comparisonValue` en vez de `cond.comparisonValue` causando referencias undefined

### ✅ **Solución Implementada**

#### **1. Admin Builder (assets/js/admin-builder-v2.js)**

**ANTES:**
```javascript
// ❌ Solo capturaba variable_amount
getConditionsData(questionId) {
    return conditions.map(cond => ({
        condition_type: cond.type,
        condition_value: cond.value,
        action_type: cond.action,
        action_value: cond.actionValue,
        variable_operation: cond.operator,
        variable_amount: cond.amount || 0  // Solo este campo
    }));
}
```

**DESPUÉS:**
```javascript
// ✅ Captura ambos campos con normalización
getConditionsData(questionId) {
    return conditions.map(cond => {
        // Normalizar comparison_value según el contexto
        let normalizedComparisonValue = cond.comparisonValue || '';
        
        if (['variable_greater', 'variable_less', 'variable_equals'].includes(cond.type)) {
            if (normalizedComparisonValue !== '' && !isNaN(normalizedComparisonValue)) {
                normalizedComparisonValue = parseFloat(normalizedComparisonValue);
            }
        }
        
        return {
            condition_type: cond.type,
            condition_value: cond.value,
            action_type: cond.action,
            action_value: cond.actionValue,
            variable_operation: cond.operator,
            variable_amount: cond.amount || 0,        // Para acciones de variables
            comparison_value: normalizedComparisonValue  // ✅ NUEVO: Campo específico
        };
    });
}
```

**Event Binding Mejorado:**
```javascript
// ✅ NUEVO: Event binding específico para comparison_value
bindConditionValueEvents($condition, condition) {
    // Para condiciones de variables (campos compuestos)
    $condition.find('.sfq-condition-comparison-value').off('input').on('input', function() {
        condition.comparisonValue = $(this).val();  // ✅ CRÍTICO: Usar 'condition' no 'cond'
        self.formBuilder.isDirty = true;
        console.log('SFQ: Updated comparison value for condition', condition.id, 'to:', condition.comparisonValue);
    });
}

// ⚠️ ERROR REAL ENCONTRADO Y CORREGIDO:
// En el renderizado HTML se usaba una variable local 'comparisonValue' 
// en lugar de 'condition.comparisonValue' directamente.
// PROBLEMA: value="${this.escapeHtml(comparisonValue)}" (variable local undefined)
// SOLUCIÓN: value="${this.escapeHtml(condition.comparisonValue || '')}" (propiedad del objeto)
```

#### **2. Backend (includes/class-sfq-ajax.php)**

**ANTES:**
```php
// ❌ Solo usaba variable_amount
private function evaluate_condition($condition, $answer, $variables) {
    case 'variable_greater':
        $var_name = $condition->condition_value;
        $threshold = intval($condition->variable_amount);  // Solo este campo
        return ($variables[$var_name] ?? 0) > $threshold;
}
```

**DESPUÉS:**
```php
// ✅ Priorización con fallback inteligente
private function evaluate_condition($condition, $answer, $variables) {
    case 'variable_greater':
        $var_name = $condition->condition_value;
        $comparison_value = $this->get_comparison_value($condition);  // ✅ NUEVO
        $var_value = $variables[$var_name] ?? 0;
        return $this->smart_compare($var_value, $comparison_value, '>');  // ✅ NUEVO
}

// ✅ NUEVO: Método de priorización
private function get_comparison_value($condition) {
    // Priorizar comparison_value si existe y no está vacío
    if (isset($condition->comparison_value) && $condition->comparison_value !== '') {
        return $condition->comparison_value;
    }
    
    // Fallback a variable_amount para compatibilidad
    return $condition->variable_amount ?? 0;
}

// ✅ NUEVO: Comparación inteligente
private function smart_compare($value1, $value2, $operator) {
    // Detectar si ambos valores son numéricos
    if (is_numeric($value1) && is_numeric($value2)) {
        $num1 = floatval($value1);
        $num2 = floatval($value2);
        
        switch ($operator) {
            case '>': return $num1 > $num2;
            case '<': return $num1 < $num2;
            case '==': return $num1 == $num2;
        }
    }
    
    // Comparación de texto
    $str1 = strval($value1);
    $str2 = strval($value2);
    
    switch ($operator) {
        case '>': return strcmp($str1, $str2) > 0;
        case '<': return strcmp($str1, $str2) < 0;
        case '==': return $str1 === $str2;
    }
}
```

#### **3. Frontend (assets/js/frontend.js)**

**ANTES:**
```javascript
// ❌ Solo usaba variable_amount
case 'variable_greater':
    const varName = condition.condition_value;
    const threshold = parseInt(condition.variable_amount) || 0;  // Solo este campo
    return (this.variables[varName] || 0) > threshold;
```

**DESPUÉS:**
```javascript
// ✅ Misma lógica que el backend
case 'variable_greater':
    const varName = condition.condition_value;
    const comparisonValue = this.getComparisonValue(condition);  // ✅ NUEVO
    const varValue = this.variables[varName] || 0;
    return this.smartCompare(varValue, comparisonValue, '>');    // ✅ NUEVO

// ✅ NUEVO: Métodos de soporte
getComparisonValue(condition) {
    if (condition.comparison_value !== undefined && condition.comparison_value !== '') {
        return condition.comparison_value;
    }
    return condition.variable_amount || 0;
}

smartCompare(value1, value2, operator) {
    // Misma lógica que el backend para consistencia
}
```

### 🎯 **Resultados de la Solución**

1. **✅ Campo se guarda correctamente:** `comparison_value` ahora persiste en la base de datos
2. **✅ Compatibilidad total:** Condiciones existentes siguen funcionando
3. **✅ Comparación inteligente:** Detecta automáticamente números vs texto
4. **✅ Consistencia Frontend/Backend:** Misma lógica en ambos lados
5. **✅ Debug mejorado:** Logs detallados para troubleshooting

---

## ✅ Guía para Añadir Nuevos Campos

### 📋 **Proceso Paso a Paso**

#### **Paso 1: Identificar el Propósito del Campo**

**Preguntas clave:**
- ¿Es para condiciones o acciones?
- ¿Necesita validación específica?
- ¿Debe ser compatible con datos existentes?
- ¿Requiere nueva columna en BD o usar campo existente?

#### **Paso 2: Planificar la Estructura de Datos**

```javascript
// Ejemplo: Añadir campo "timeout_seconds" para condiciones temporales
{
    condition_type: 'time_elapsed',
    condition_value: 'question_start',     // Evento de referencia
    timeout_seconds: 30,                   // ✅ NUEVO CAMPO
    comparison_value: '',                  // No usado para este tipo
    action_type: 'show_message',
    action_value: '¡Tiempo agotado!'
}
```

#### **Paso 3: Modificar Admin Builder**

**3.1. Actualizar renderizado de condiciones:**
```javascript
// En UIRenderer.generateConditionValueField()
generateConditionValueField(condition) {
    switch (condition.type) {
        case 'time_elapsed':  // ✅ NUEVO TIPO
            return this.generateTimeElapsedFields(condition);
        // ... casos existentes
    }
}

// ✅ NUEVO: Método específico para el nuevo campo
generateTimeElapsedFields(condition) {
    return `
        <div class="sfq-time-condition-fields">
            <select class="sfq-condition-time-event">
                <option value="question_start" ${condition.value === 'question_start' ? 'selected' : ''}>
                    Inicio de pregunta
                </option>
                <option value="form_start" ${condition.value === 'form_start' ? 'selected' : ''}>
                    Inicio de formulario
                </option>
            </select>
            <input type="number" class="sfq-condition-timeout-seconds" 
                   placeholder="Segundos" 
                   value="${condition.timeoutSeconds || ''}"
                   min="1" max="3600">
        </div>
    `;
}
```

**3.2. Añadir event binding:**
```javascript
// En ConditionEngine.bindConditionValueEvents()
bindConditionValueEvents($condition, condition) {
    // ... bindings existentes ...
    
    // ✅ NUEVO: Event binding para timeout_seconds
    $condition.find('.sfq-condition-timeout-seconds').off('input').on('input', function() {
        condition.timeoutSeconds = parseInt($(this).val()) || 0;
        self.formBuilder.isDirty = true;
        console.log('SFQ: Updated timeout seconds for condition', condition.id, 'to:', condition.timeoutSeconds);
    });
}
```

**3.3. Actualizar captura de datos:**
```javascript
// En ConditionEngine.getConditionsData()
getConditionsData(questionId) {
    return conditions.map(cond => ({
        condition_type: cond.type,
        condition_value: cond.value,
        action_type: cond.action,
        action_value: cond.actionValue,
        variable_operation: cond.operator,
        variable_amount: cond.amount || 0,
        comparison_value: cond.comparisonValue || '',
        timeout_seconds: cond.timeoutSeconds || 0  // ✅ NUEVO CAMPO
    }));
}
```

**3.4. Actualizar carga de datos:**
```javascript
// En ConditionEngine.loadConditions()
loadConditions(questionId, conditionsData) {
    this.conditions[questionId] = conditionsData.map((cond, index) => ({
        id: 'c_' + questionId + '_' + index,
        type: cond.condition_type || 'answer_equals',
        value: cond.condition_value || '',
        action: cond.action_type || 'goto_question',
        actionValue: cond.action_value || '',
        operator: cond.variable_operation || '',
        amount: cond.variable_amount || 0,
        comparisonValue: cond.comparison_value || '',
        timeoutSeconds: cond.timeout_seconds || 0  // ✅ NUEVO CAMPO
    }));
}
```

#### **Paso 4: Modificar Backend**

**4.1. Actualizar evaluación de condiciones:**
```php
// En SFQ_Ajax.evaluate_condition()
private function evaluate_condition($condition, $answer, $variables) {
    switch ($condition->condition_type) {
        // ... casos existentes ...
        
        case 'time_elapsed':  // ✅ NUEVO TIPO
            return $this->evaluate_time_condition($condition, $variables);
    }
}

// ✅ NUEVO: Método específico para condiciones temporales
private function evaluate_time_condition($condition, $variables) {
    $event_type = $condition->condition_value;
    $timeout_seconds = intval($condition->timeout_seconds ?? 0);
    
    // Obtener timestamp del evento desde variables
    $event_timestamp = $variables[$event_type . '_timestamp'] ?? 0;
    
    if (!$event_timestamp || !$timeout_seconds) {
        return false;
    }
    
    $elapsed_seconds = time() - $event_timestamp;
    return $elapsed_seconds >= $timeout_seconds;
}
```

**4.2. Actualizar validación de datos:**
```php
// En SFQ_Ajax.validate_and_structure_conditions()
private function validate_and_structure_conditions($conditions) {
    foreach ($conditions as $condition) {
        $structured_conditions[] = [
            'condition_type' => $condition['condition_type'],
            'condition_value' => $condition['condition_value'] ?? '',
            'action_type' => $condition['action_type'],
            'action_value' => $condition['action_value'] ?? '',
            'variable_operation' => $condition['variable_operation'] ?? '',
            'variable_amount' => intval($condition['variable_amount'] ?? 0),
            'comparison_value' => $condition['comparison_value'] ?? '',
            'timeout_seconds' => intval($condition['timeout_seconds'] ?? 0)  // ✅ NUEVO
        ];
    }
}
```

#### **Paso 5: Modificar Frontend**

**5.1. Actualizar evaluación inmediata:**
```javascript
// En SmartFormQuiz.evaluateConditionImmediate()
evaluateConditionImmediate(condition, answer, questionId) {
    switch (condition.condition_type) {
        // ... casos existentes ...
        
        case 'time_elapsed':  // ✅ NUEVO TIPO
            return this.evaluateTimeCondition(condition);
    }
}

// ✅ NUEVO: Método específico para condiciones temporales
evaluateTimeCondition(condition) {
    const eventType = condition.condition_value;
    const timeoutSeconds = parseInt(condition.timeoutSeconds) || 0;
    
    // Obtener timestamp del evento desde variables
    const eventTimestamp = this.variables[eventType + '_timestamp'] || 0;
    
    if (!eventTimestamp || !timeoutSeconds) {
        return false;
    }
    
    const elapsedSeconds = Math.floor((Date.now() - eventTimestamp) / 1000);
    return elapsedSeconds >= timeoutSeconds;
}
```

### 🔑 **Checklist para Nuevos Campos**

#### ✅ **Admin Builder (JavaScript)**
- [ ] Añadir campo al renderizado HTML
- [ ] Implementar event binding específico
- [ ] Actualizar `getConditionsData()` para capturar el campo
- [ ] Actualizar `loadConditions()` para cargar el campo
- [ ] Añadir validación si es necesario

#### ✅ **Backend (PHP)**
- [ ] Actualizar `evaluate_condition()` para usar el nuevo campo
- [ ] Añadir método específico si la lógica es compleja
- [ ] Actualizar `validate_and_structure_conditions()` para incluir el campo
- [ ] Añadir validación de datos si es necesario

#### ✅ **Frontend (JavaScript)**
- [ ] Actualizar `evaluateConditionImmediate()` para usar el nuevo campo
- [ ] Añadir método específico si la lógica es compleja
- [ ] Asegurar consistencia con la lógica del backend

#### ✅ **Base de Datos**
- [ ] Verificar si el campo ya existe en la tabla
- [ ] Crear migración si se necesita nueva columna
- [ ] Actualizar documentación de esquema

### 🚨 **Requisitos Críticos**

1. **Consistencia Frontend/Backend:** Ambos deben usar la misma lógica
2. **Compatibilidad hacia atrás:** No romper condiciones existentes
3. **Validación robusta:** Manejar casos edge y valores inválidos
4. **Logging adecuado:** Debug para troubleshooting
5. **Testing exhaustivo:** Probar todos los escenarios posibles

---

## ✅ Implementación de Operaciones Matemáticas

### 🧮 **Operaciones Actuales vs Futuras**

#### **Operaciones Implementadas:**
- ✅ `add_variable` - Sumar valores
- ✅ `set_variable` - Establecer valores

#### **Operaciones Planificadas:**
- 🔄 `subtract_variable` - Restar valores
- 🔄 `multiply_variable` - Multiplicar valores
- 🔄 `divide_variable` - Dividir valores
- 🔄 `modulo_variable` - Operación módulo
- 🔄 `increment_variable` - Incrementar en 1
- 🔄 `decrement_variable` - Decrementar en 1

### 📋 **Roadmap de Implementación**

#### **Fase 1: Operaciones Matemáticas Básicas**

**1.1. Restar (`subtract_variable`)**
```javascript
// Admin Builder - Añadir opción al dropdown
<option value="subtract_variable">Restar de variable</option>

// Backend - Implementar lógica
case 'subtract_variable':
    $var_name = $condition->action_value;
    $var_amount = intval($condition->variable_amount);
    $current_value = $updated_variables[$var_name] ?? 0;
    $new_value = $current_value - $var_amount;
    $updated_variables[$var_name] = $new_value;
    break;

// Frontend - Misma lógica
case 'subtract_variable':
    const varName = condition.action_value;
    const varAmount = parseInt(condition.variable_amount) || 0;
    const currentValue = result.variables[varName] || 0;
    const newValue = currentValue - varAmount;
    result.variables[varName] = newValue;
    break;
```

**1.2. Multiplicar (`multiply_variable`)**
```javascript
// Backend
case 'multiply_variable':
    $var_name = $condition->action_value;
    $multiplier = floatval($condition->variable_amount);
    $current_value = floatval($updated_variables[$var_name] ?? 0);
    $new_value = $current_value * $multiplier;
    $updated_variables[$var_name] = $new_value;
    break;

// Frontend
case 'multiply_variable':
    const varName = condition.action_value;
    const multiplier = parseFloat(condition.variable_amount) || 1;
    const currentValue = parseFloat(result.variables[varName]) || 0;
    const newValue = currentValue * multiplier;
    result.variables[varName] = newValue;
    break;
```

**1.3. Dividir (`divide_variable`)**
```javascript
// Backend con protección contra división por cero
case 'divide_variable':
    $var_name = $condition->action_value;
    $divisor = floatval($condition->variable_amount);
    
    if ($divisor == 0) {
        error_log("SFQ Warning: Division by zero attempted for variable {$var_name}");
        break; // No hacer nada si divisor es 0
    }
    
    $current_value = floatval($updated_variables[$var_name] ?? 0);
    $new_value = $current_value / $divisor;
    $updated_variables[$var_name] = $new_value;
    break;

// Frontend con misma protección
case 'divide_variable':
    const varName = condition.action_value;
    const divisor = parseFloat(condition.variable_amount) || 1;
    
    if (divisor === 0) {
        console.warn(`SFQ Warning: Division by zero attempted for variable ${varName}`);
        break;
    }
    
    const currentValue = parseFloat(result.variables[varName]) || 0;
    const newValue = currentValue / divisor;
    result.variables[varName] = newValue;
    break;
```

#### **Fase 2: Operaciones Avanzadas**

**2.1. Módulo (`modulo_variable`)**
```javascript
// Para calcular resto de división
case 'modulo_variable':
    $var_name = $condition->action_value;
    $divisor = intval($condition->variable_amount);
    
    if ($divisor == 0) {
        error_log("SFQ Warning: Modulo by zero attempted for variable {$var_name}");
        break;
    }
    
    $current_value = intval($updated_variables[$var_name] ?? 0);
    $new_value = $current_value % $divisor;
    $updated_variables[$var_name] = $new_value;
    break;
```

**2.2. Incremento/Decremento (`increment_variable`, `decrement_variable`)**
```javascript
// Incrementar en 1
case 'increment_variable':
    $var_name = $condition->action_value;
    $current_value = intval($updated_variables[$var_name] ?? 0);
    $updated_variables[$var_name] = $current_value + 1;
    break;

// Decrementar en 1
case 'decrement_variable':
    $var_name = $condition->action_value;
    $current_value = intval($updated_variables[$var_name] ?? 0);
    $updated_variables[$var_name] = $current_value - 1;
    break;
```

#### **Fase 3: Operaciones de Texto**

**3.1. Concatenar (`concatenate_variable`)**
```javascript
case 'concatenate_variable':
    $var_name = $condition->action_value;
    $text_to_add = strval($condition->variable_amount);
    $current_value = strval($updated_variables[$var_name] ?? '');
    $updated_variables[$var_name] = $current_value . $text_to_add;
    break;
```

**3.2. Transformaciones de texto**
```javascript
// Convertir a mayúsculas
case 'uppercase_variable':
    $var_name = $condition->action_value;
    $current_value = strval($updated_variables[$var_name] ?? '');
    $updated_variables[$var_name] = strtoupper($current_value);
    break;

// Convertir a minúsculas
case 'lowercase_variable':
    $var_name = $condition->action_value;
    $current_value = strval($updated_variables[$var_name] ?? '');
    $updated_variables[$var_name] = strtolower($current_value);
    break;
```

### 🔧 **Consideraciones de Implementación**

#### **1. Validación de Tipos**
```javascript
// Función auxiliar para validar tipos de variables
function validateVariableOperation(varName, operation, amount, variables) {
    const currentValue = variables[varName];
    const varType = typeof currentValue;
    
    // Operaciones numéricas requieren números
    const numericOps = ['add_variable', 'subtract_variable', 'multiply_variable', 'divide_variable'];
    if (numericOps.includes(operation) && varType !== 'number') {
        console.warn(`SFQ: Attempting numeric operation ${operation} on non-numeric variable ${varName}`);
        return false;
    }
    
    // Operaciones de texto requieren strings
    const textOps = ['concatenate_variable', 'uppercase_variable', 'lowercase_variable'];
    if (textOps.includes(operation) && varType !== 'string') {
        console.warn(`SFQ: Attempting text operation ${operation} on non-text variable ${varName}`);
        return false;
    }
    
    return true;
}
```

#### **2. Manejo de Errores**
```javascript
// Wrapper para operaciones seguras
function safeVariableOperation(varName, operation, amount, variables) {
    try {
        if (!validateVariableOperation(varName, operation, amount, variables)) {
            return variables; // Retornar sin cambios si validación falla
        }
        
        return executeVariableOperation(varName, operation, amount, variables);
        
    } catch (error) {
        console.error(`SFQ Error in variable operation ${operation} for ${varName}:`, error);
        return variables; // Retornar estado original en caso de error
    }
}
```

#### **3. Logging Mejorado**
```javascript
// Sistema de logging para operaciones de variables
function logVariableOperation(varName, operation, oldValue, newValue, amount) {
    if (window.SFQ_DEBUG) {
        console.log(`SFQ Variable Operation: ${operation.toUpperCase()}`, {
            variable: varName,
            operation: operation,
            oldValue: oldValue,
            amount: amount,
            newValue: newValue,
            timestamp: new Date().toISOString()
        });
    }
}
```

---

## ✅ Arquitectura de Campos Dinámicos

### 🏗️ **Sistema de Priorización**

El sistema implementa una arquitectura de campos dinámicos que permite:
1. **Compatibilidad hacia atrás** con datos existentes
2. **Extensibilidad** para nuevos campos
3. **Priorización inteligente** de campos

#### **Jerarquía de Campos:**
```javascript
// Orden de prioridad para valores de comparación
1. comparison_value    // Campo específico (PRIORIDAD ALTA)
2. variable_amount     // Campo legacy (FALLBACK)
3. default_value       // Valor por defecto (ÚLTIMO RECURSO)
```

### 🔄 **Patrón de Fallback Inteligente**

#### **Implementación en Frontend:**
```javascript
getComparisonValue(condition) {
    // 1. PRIORIDAD: Campo específico
    if (condition.comparison_value !== undefined && condition.comparison_value !== '') {
        return this.normalizeValue(condition.comparison_value);
    }
    
    // 2. FALLBACK: Campo legacy
    if (condition.variable_amount !== undefined && condition.variable_amount !== '') {
        return this.normalizeValue(condition.variable_amount);
    }
    
    // 3. ÚLTIMO RECURSO: Valor por defecto
    return this.getDefaultValue(condition.condition_type);
}

normalizeValue(value) {
    // Normalizar según tipo de dato
    if (typeof value === 'string' && !isNaN(value) && value.trim() !== '') {
        return parseFloat(value);
    }
    return value;
}

getDefaultValue(conditionType) {
    const defaults = {
        'variable_greater': 0,
        'variable_less': 0,
        'variable_equals': '',
        'answer_equals': '',
        'answer_contains': ''
    };
    return defaults[conditionType] || '';
}
```

#### **Implementación en Backend:**
```php
private function get_comparison_value($condition) {
    // 1. PRIORIDAD: Campo específico
    if (isset($condition->comparison_value) && $condition->comparison_value !== '') {
        return $this->normalize_value($condition->comparison_value);
    }
    
    // 2. FALLBACK: Campo legacy
    if (isset($condition->variable_amount) && $condition->variable_amount !== '') {
        return $this->normalize_value($condition->variable_amount);
    }
    
    // 3. ÚLTIMO RECURSO: Valor por defecto
    return $this->get_default_value($condition->condition_type);
}

private function normalize_value($value) {
    // Normalizar según tipo de dato
    if (is_string($value) && is_numeric($value)) {
        return floatval($value);
    }
    return $value;
}

private function get_default_value($condition_type) {
    $defaults = array(
        'variable_greater' => 0,
        'variable_less' => 0,
        'variable_equals' => '',
        'answer_equals' => '',
        'answer_contains' => ''
    );
    return $defaults[$condition_type] ?? '';
}
```

### 🔍 **Sistema de Validación Dinámico**

#### **Validador de Campos:**
```javascript
class FieldValidator {
    static validateConditionField(fieldName, value, conditionType) {
        const validators = {
            'comparison_value': this.validateComparisonValue,
            'variable_amount': this.validateVariableAmount,
            'timeout_seconds': this.validateTimeoutSeconds,
            'action_value': this.validateActionValue
        };
        
        const validator = validators[fieldName];
        if (!validator) {
            console.warn(`SFQ: No validator found for field ${fieldName}`);
            return { valid: true, message: '' };
        }
        
        return validator(value, conditionType);
    }
    
    static validateComparisonValue(value, conditionType) {
        if (['variable_greater', 'variable_less'].includes(conditionType)) {
            if (isNaN(value)) {
                return { valid: false, message: 'El valor de comparación debe ser numérico' };
            }
        }
        
        if (conditionType === 'variable_equals') {
            // Permite tanto números como texto
            if (value === undefined || value === null) {
                return { valid: false, message: 'El valor de comparación es requerido' };
            }
        }
        
        return { valid: true, message: '' };
    }
    
    static validateTimeoutSeconds(value, conditionType) {
        if (conditionType === 'time_elapsed') {
            const numValue = parseInt(value);
            if (isNaN(numValue) || numValue < 1 || numValue > 3600) {
                return { valid: false, message: 'El timeout debe estar entre 1 y 3600 segundos' };
            }
        }
        
        return { valid: true, message: '' };
    }
}
```

### 📊 **Migración de Datos**

#### **Estrategia de Migración:**
```php
class SFQ_Field_Migration {
    
    /**
     * Migrar datos de campos legacy a nuevos campos
     */
    public function migrate_condition_fields() {
        global $wpdb;
        
        // Obtener todas las condiciones que usan variable_amount pero no tienen comparison_value
        $conditions = $wpdb->get_results("
            SELECT id, condition_type, variable_amount, comparison_value 
            FROM {$wpdb->prefix}sfq_conditions 
            WHERE condition_type IN ('variable_greater', 'variable_less', 'variable_equals')
            AND (comparison_value IS NULL OR comparison_value = '')
            AND variable_amount IS NOT NULL
        ");
        
        $migrated_count = 0;
        
        foreach ($conditions as $condition) {
            // Migrar variable_amount a comparison_value
            $result = $wpdb->update(
                $wpdb->prefix . 'sfq_conditions',
                array('comparison_value' => $condition->variable_amount),
                array('id' => $condition->id),
                array('%s'),
                array('%d')
            );
            
            if ($result !== false) {
                $migrated_count++;
            }
        }
        
        return array(
            'migrated' => $migrated_count,
            'total' => count($conditions),
            'message' => sprintf('Migradas %d de %d condiciones', $migrated_count, count($conditions))
        );
    }
    
    /**
     * Verificar integridad de datos después de migración
     */
    public function verify_migration_integrity() {
        global $wpdb;
        
        $issues = array();
        
        // Verificar condiciones sin valores de comparación
        $missing_values = $wpdb->get_var("
            SELECT COUNT(*) 
            FROM {$wpdb->prefix}sfq_conditions 
            WHERE condition_type IN ('variable_greater', 'variable_less', 'variable_equals')
            AND (comparison_value IS NULL OR comparison_value = '')
            AND (variable_amount IS NULL OR variable_amount = '')
        ");
        
        if ($missing_values > 0) {
            $issues[] = sprintf('%d condiciones sin valores de comparación', $missing_values);
        }
        
        // Verificar consistencia de tipos
        $type_inconsistencies = $wpdb->get_results("
            SELECT id, condition_type, comparison_value, variable_amount
            FROM {$wpdb->prefix}sfq_conditions 
            WHERE condition_type IN ('variable_greater', 'variable_less')
            AND comparison_value IS NOT NULL 
            AND comparison_value != ''
            AND NOT (comparison_value REGEXP '^-?[0-9]+\.?[0-9]*$')
        ");
        
        if (!empty($type_inconsistencies)) {
            $issues[] = sprintf('%d condiciones con valores no numéricos en comparaciones numéricas', count($type_inconsistencies));
        }
        
        return array(
            'issues' => $issues,
            'integrity_ok' => empty($issues)
        );
    }
}
```

---

## 🚀 Casos de Uso Avanzados

### Caso 1: E-learning Platform - ✅ ACTUALIZADO

**Objetivo:** Quiz adaptativo que ajusta dificultad según rendimiento

**Variables Mejoradas:**
```javascript
{
    "nivel_actual": 1,
    "respuestas_correctas_seguidas": 0,
    "tiempo_promedio_respuesta": 0,
    "categoria_dificultad": "basico",
    "puntos_bonus": 0,                    // ✅ NUEVO
    "racha_maxima": 0,                    // ✅ NUEVO
    "tiempo_total_sesion": 0              // ✅ NUEVO
}
```

**Lógica Implementada con Nuevos Campos:**
```javascript
// Subir nivel con sistema de puntos bonus
{
    condition_type: 'variable_greater',
    condition_value: 'respuestas_correctas_seguidas',
    comparison_value: 3,                  // ✅ USANDO NUEVO CAMPO
    action_type: 'add_variable',
    action_value: 'puntos_bonus',
    variable_amount: 50
}

// Multiplicar puntos por racha
{
    condition_type: 'variable_greater',
    condition_value: 'racha_maxima',
    comparison_value: 5,                  // ✅ USANDO NUEVO CAMPO
    action_type: 'multiply_variable',     // ✅ NUEVA OPERACIÓN
    action_value: 'puntos_bonus',
    variable_amount: 1.5
}
```

### Caso 2: Sistema de Recomendaciones Dinámico

**Variables Avanzadas:**
```javascript
{
    "perfil_usuario": "",
    "preferencias_acumuladas": 0,
    "historial_respuestas": "",
    "score_compatibilidad": 0,
    "recomendacion_final": "",
    "confianza_recomendacion": 0
}
```

**Lógica de Recomendación Mejorada:**
```javascript
// Acumular preferencias con pesos
{
    condition_type: 'answer_equals',
    condition_value: 'tecnologia',
    action_type: 'add_variable',
    action_value: 'preferencias_acumuladas',
    variable_amount: 10
}

// Calcular score de compatibilidad
{
    condition_type: 'variable_greater',
    condition_value: 'preferencias_acumuladas',
    comparison_value: 50,                 // ✅ CAMPO ESPECÍFICO
    action_type: 'set_variable',
    action_value: 'score_compatibilidad',
    variable_amount: 85
}

// Concatenar historial de respuestas
{
    condition_type: 'answer_contains',
    condition_value: 'premium',
    action_type: 'concatenate_variable',  // ✅ NUEVA OPERACIÓN
    action_value: 'historial_respuestas',
    variable_amount: 'premium,'
}
```

### Caso 3: Sistema de Gamificación Completo

**Variables de Gamificación:**
```javascript
{
    "experiencia_total": 0,
    "nivel_jugador": 1,
    "logros_desbloqueados": "",
    "multiplicador_activo": 1,
    "tiempo_sesion_actual": 0,
    "bonus_velocidad": 0
}
```

**Mecánicas de Juego:**
```javascript
// Sistema de experiencia con multiplicadores
{
    condition_type: 'answer_equals',
    condition_value: 'correcto',
    action_type: 'multiply_variable',     // ✅ NUEVA OPERACIÓN
    action_value: 'experiencia_total',
    variable_amount: 1.2                  // Multiplicador por respuesta correcta
}

// Bonus por velocidad de respuesta
{
    condition_type: 'time_elapsed',       // ✅ NUEVO TIPO DE CONDICIÓN
    condition_value: 'question_start',
    timeout_seconds: 10,                  // ✅ NUEVO CAMPO
    action_type: 'add_variable',
    action_value: 'bonus_velocidad',
    variable_amount: 25
}

// Subir nivel automáticamente
{
    condition_type: 'variable_greater',
    condition_value: 'experiencia_total',
    comparison_value: 1000,               // ✅ CAMPO ESPECÍFICO
    action_type: 'increment_variable',    // ✅ NUEVA OPERACIÓN
    action_value: 'nivel_jugador'
}
```

---

## 🔧 Optimización y Escalabilidad

### Performance - ✅ MEJORADO

#### 1. **Caché de Evaluación de Condiciones**

```javascript
// Sistema de caché para condiciones evaluadas
class ConditionCache {
    constructor() {
        this.cache = new Map();
        this.maxSize = 100;
        this.ttl = 300000; // 5 minutos
    }
    
    getCachedResult(conditionKey, variables) {
        const cacheKey = this.generateCacheKey(conditionKey, variables);
        const cached = this.cache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < this.ttl) {
            return cached.result;
        }
        
        return null;
    }
    
    setCachedResult(conditionKey, variables, result) {
        if (this.cache.size >= this.maxSize) {
            // Limpiar entradas más antiguas
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
        
        const cacheKey = this.generateCacheKey(conditionKey, variables);
        this.cache.set(cacheKey, {
            result: result,
            timestamp: Date.now()
        });
    }
    
    generateCacheKey(conditionKey, variables) {
        // Generar clave única basada en condición y variables relevantes
        const relevantVars = this.extractRelevantVariables(conditionKey, variables);
        return `${conditionKey}_${JSON.stringify(relevantVars)}`;
    }
}
```

#### 2. **Optimización de Consultas de Base de Datos**

```php
// Caché de condiciones por formulario
class SFQ_Condition_Cache {
    private static $cache = array();
    
    public static function get_form_conditions($form_id) {
        if (isset(self::$cache[$form_id])) {
            return self::$cache[$form_id];
        }
        
        global $wpdb;
        
        // Cargar todas las condiciones del formulario de una vez
        $conditions = $wpdb->get_results($wpdb->prepare("
            SELECT c.*, q.order_position as question_order
            FROM {$wpdb->prefix}sfq_conditions c
            JOIN {$wpdb->prefix}sfq_questions q ON c.question_id = q.id
            WHERE q.form_id = %d
            ORDER BY q.order_position, c.order_position
        ", $form_id));
        
        // Agrupar por pregunta para acceso rápido
        $grouped_conditions = array();
        foreach ($conditions as $condition) {
            $grouped_conditions[$condition->question_id][] = $condition;
        }
        
        self::$cache[$form_id] = $grouped_conditions;
        return $grouped_conditions;
    }
}
```

### Escalabilidad - ✅ EXPANDIDA

#### 1. **Sistema de Plugins para Condiciones**

```javascript
// Arquitectura extensible para nuevos tipos de condiciones
class ConditionPluginRegistry {
    constructor() {
        this.plugins = new Map();
    }
    
    registerPlugin(conditionType, plugin) {
        this.plugins.set(conditionType, plugin);
    }
    
    evaluateCondition(condition, context) {
        const plugin = this.plugins.get(condition.condition_type);
        
        if (plugin) {
            return plugin.evaluate(condition, context);
        }
        
        // Fallback a evaluación estándar
        return this.standardEvaluation(condition, context);
    }
}

// Ejemplo de plugin personalizado
class GeolocationConditionPlugin {
    evaluate(condition, context) {
        if (condition.condition_type === 'user_location') {
            const userLat = context.variables.user_latitude || 0;
            const userLng = context.variables.user_longitude || 0;
            const targetLat = parseFloat(condition.condition_value);
            const targetLng = parseFloat(condition.comparison_value);
            const maxDistance = parseFloat(condition.variable_amount);
            
            const distance = this.calculateDistance(userLat, userLng, targetLat, targetLng);
            return distance <= maxDistance;
        }
        
        return false;
    }
    
    calculateDistance(lat1, lng1, lat2, lng2) {
        // Implementación de fórmula de Haversine
        const R = 6371; // Radio de la Tierra en km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLng = this.deg2rad(lng2 - lng1);
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    deg2rad(deg) {
        return deg * (Math.PI/180);
    }
}

// Registro del plugin
const conditionRegistry = new ConditionPluginRegistry();
conditionRegistry.registerPlugin('user_location', new GeolocationConditionPlugin());
```

#### 2. **Sistema de Métricas y Monitoreo**

```javascript
// Monitoreo de performance de condiciones
class ConditionMetrics {
    constructor() {
        this.metrics = {
            evaluationTimes: new Map(),
            evaluationCounts: new Map(),
            errorCounts: new Map(),
            cacheHitRates: new Map()
        };
    }
    
    recordEvaluation(conditionType, duration, success) {
        // Tiempo de evaluación
        if (!this.metrics.evaluationTimes.has(conditionType)) {
            this.metrics.evaluationTimes.set(conditionType, []);
        }
        this.metrics.evaluationTimes.get(conditionType).push(duration);
        
        // Contador de evaluaciones
        const currentCount = this.metrics.evaluationCounts.get(conditionType) || 0;
        this.metrics.evaluationCounts.set(conditionType, currentCount + 1);
        
        // Contador de errores
        if (!success) {
            const currentErrors = this.metrics.errorCounts.get(conditionType) || 0;
            this.metrics.errorCounts.set(conditionType, currentErrors + 1);
        }
    }
    
    getMetricsSummary() {
        const summary = {};
        
        // Calcular promedios de tiempo de evaluación
        this.metrics.evaluationTimes.forEach((times, conditionType) => {
            const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
            summary[conditionType] = {
                averageEvaluationTime: avgTime,
                totalEvaluations: this.metrics.evaluationCounts.get(conditionType) || 0,
                errorCount: this.metrics.errorCounts.get(conditionType) || 0,
                errorRate: ((this.metrics.errorCounts.get(conditionType) || 0) / 
                          (this.metrics.evaluationCounts.get(conditionType) || 1)) * 100
            };
        });
        
        return summary;
    }
}
```

---

## 📋 Mejores Prácticas Actualizadas

### 1. **Diseño de Variables - ✅ MEJORADO**

#### Nomenclatura Actualizada
```javascript
// ✅ Buenas prácticas actualizadas
{
    name: 'puntos_total',           // Descriptivo y claro
    name: 'categoria_usuario',      // Snake_case consistente
    name: 'completado_seccion_a',   // Booleano claro
    name: 'timestamp_inicio',       // ✅ NUEVO: Para condiciones temporales
    name: 'multiplicador_bonus'     // ✅ NUEVO: Para operaciones matemáticas
}

// ❌ Evitar
{
    name: 'p',                      // Muy corto
    name: 'PuntosTotal',           // CamelCase inconsistente
    name: 'puntos-total',          // Guiones no permitidos
    name: 'var123'                 // Sin significado semántico
}
```

#### Tipos Apropiados con Nuevas Operaciones
```javascript
// ✅ Usar tipos correctos con operaciones específicas
{
    type: 'number',
    initial_value: '0',
    // Operaciones: add, subtract, multiply, divide, modulo, increment, decrement
    operations_allowed: ['mathematical', 'comparison']
}

{
    type: 'boolean', 
    initial_value: 'false',
    // Operaciones: set, toggle, comparison
    operations_allowed: ['logical', 'comparison']
}

{
    type: 'text',
    initial_value: '',
    // Operaciones: set, concatenate, uppercase, lowercase, comparison
    operations_allowed: ['text', 'comparison']
}
```

### 2. **Diseño de Condiciones - ✅ ACTUALIZADO**

#### Simplicidad y Claridad
```javascript
// ✅ Condiciones simples y claras con nuevos campos
{
    condition_type: 'variable_greater',
    condition_value: 'puntos_total',
    comparison_value: 50,           // ✅ Campo específico
    action_type: 'add_variable',
    action_value: 'bonus_nivel',
    variable_amount: 10
}

// ✅ Usar fallback para compatibilidad
{
    condition_type: 'variable_equals',
    condition_value: 'categoria_usuario',
    comparison_value: 'experto',    // ✅ Prioridad
    variable_amount: 'experto',     // ✅ Fallback
    action_type: 'set_variable',
    action_value: 'acceso_premium',
    variable_amount: true
}
```

#### Orden de Evaluación Mejorado
```javascript
// ✅ Ordenar por prioridad y tipo
[
    // 1. Condiciones críticas de seguridad/validación
    {
        condition_type: 'answer_equals',
        condition_value: 'ABORT',
        action_type: 'redirect_url',
        action_value: 'https://salida-emergencia.com'
    },
    
    // 2. Condiciones de navegación
    {
        condition_type: 'variable_greater',
        condition_value: 'intentos_fallidos',
        comparison_value: 3,
        action_type: 'goto_question',
        action_value: 'pregunta_recuperacion'
    },
    
    // 3. Modificaciones de variables (orden específico)
    {
        condition_type: 'answer_equals',
        condition_value: 'Correcto',
        action_type: 'multiply_variable',   // ✅ Primero multiplicar
        action_value: 'puntos_base',
        variable_amount: 1.5
    },
    {
        condition_type: 'answer_equals',
        condition_value: 'Correcto',
        action_type: 'add_variable',        // ✅ Luego sumar bonus
        action_value: 'puntos_base',
        variable_amount: 25
    }
]
```

### 3. **Testing y Validación - ✅ EXPANDIDO**

#### Testing Manual Actualizado
```javascript
// Checklist de testing expandido
const testScenarios = [
    {
        name: 'Flujo básico sin condiciones',
        steps: ['Responder todas las preguntas', 'Verificar envío'],
        variables_expected: {}
    },
    {
        name: 'Condiciones de salto con nuevos campos',
        steps: [
            'Respuesta que activa salto usando comparison_value',
            'Verificar pregunta destino',
            'Validar variables actualizadas'
        ],
        variables_expected: { 'salto_activado': true }
    },
    {
        name: 'Variables y operaciones matemáticas',
        steps: [
            'Respuestas que suman puntos',
            'Respuestas que multiplican puntos',
            'Verificar total final calculado'
        ],
        variables_expected: { 'puntos_total': 150 }
    },
    {
        name: 'Redirecciones condicionales',
        steps: [
            'Respuesta que redirige',
            'Verificar URL destino',
            'Confirmar variables en submission'
        ],
        variables_expected: { 'redireccion_ejecutada': true }
    },
    {
        name: 'Compatibilidad hacia atrás',
        steps: [
            'Cargar formulario con condiciones legacy',
            'Verificar fallback a variable_amount',
            'Confirmar funcionamiento correcto'
        ],
        variables_expected: { 'legacy_compatible': true }
    }
];
```

#### Validación de Configuración Mejorada
```javascript
// Validador automático expandido
function validateFormLogic(formData) {
    const errors = [];
    const warnings = [];
    
    // Verificar referencias de variables
    formData.questions.forEach(question => {
        question.conditions.forEach(condition => {
            // Validar acciones de variables
            if (['add_variable', 'set_variable', 'multiply_variable'].includes(condition.action_type)) {
                const variableExists = formData.global_variables
                    .some(v => v.name === condition.action_value);
                
                if (!variableExists) {
                    errors.push(`Variable '${condition.action_value}' no existe en pregunta ${question.id}`);
                }
            }
            
            // ✅ NUEVO: Validar campos de comparación
            if (['variable_greater', 'variable_less', 'variable_equals'].includes(condition.condition_type)) {
                if (!condition.comparison_value && !condition.variable_amount) {
                    errors.push(`Condición de variable sin valor de comparación en pregunta ${question.id}`);
                }
                
                // Advertir sobre uso de campo legacy
                if (!condition.comparison_value && condition.variable_amount) {
                    warnings.push(`Usando campo legacy 'variable_amount' en pregunta ${question.id}. Considerar migrar a 'comparison_value'`);
                }
            }
            
            // ✅ NUEVO: Validar operaciones matemáticas
            if (['multiply_variable', 'divide_variable'].includes(condition.action_type)) {
                const amount = parseFloat(condition.variable_amount);
                if (condition.action_type === 'divide_variable' && amount === 0) {
                    errors.push(`División por cero detectada en pregunta ${question.id}`);
                }
                if (condition.action_type === 'multiply_variable' && (amount < 0 || amount > 10)) {
                    warnings.push(`Multiplicador extremo (${amount}) en pregunta ${question.id}`);
                }
            }
        });
    });
    
    return { errors, warnings };
}
```

### 4. **Documentación y Mantenimiento**

#### Variables Globales Documentadas
```javascript
// ✅ Documentar propósito y operaciones de cada variable
{
    name: 'puntos_conocimiento',
    description: 'Puntuación acumulada en preguntas de conocimiento técnico. Rango: 0-100. Operaciones: suma, multiplicación por bonus.',
    type: 'number',
    initial_value: '0',
    operations_used: ['add_variable', 'multiply_variable'],
    related_conditions: ['variable_greater', 'variable_less']
}

{
    name: 'perfil_usuario',
    description: 'Categoría del usuario basada en respuestas. Valores: principiante, intermedio, avanzado, experto.',
    type: 'text',
    initial_value: 'principiante',
    operations_used: ['set_variable'],
    related_conditions: ['variable_equals']
}
```

#### Condiciones Complejas Comentadas
```javascript
// ✅ Comentar lógica compleja con contexto de negocio
// SISTEMA DE NIVELES DINÁMICO:
// Esta serie de condiciones implementa un sistema de niveles que se ajusta
// automáticamente basado en el rendimiento del usuario:
// - Nivel 1: 0-30 puntos (principiante) - preguntas básicas
// - Nivel 2: 31-70 puntos (intermedio) - preguntas moderadas  
// - Nivel 3: 71+ puntos (avanzado) - preguntas difíciles
// - Bonus por velocidad: +25% si responde en <10 segundos
[
    {
        condition_type: 'variable_greater',
        condition_value: 'puntos_total',
        comparison_value: 70,           // ✅ Umbral para nivel avanzado
        action_type: 'set_variable',
        action_value: 'nivel_usuario',
        variable_amount: 'avanzado'
    },
    {
        condition_type: 'time_elapsed',     // ✅ Condición temporal
        condition_value: 'question_start',
        timeout_seconds: 10,
        action_type: 'multiply_variable',   // ✅ Bonus por velocidad
        action_value: 'puntos_total',
        variable_amount: 1.25
    }
]
```

---

## 🔧 Troubleshooting

### Problemas Comunes - ✅ ACTUALIZADO

#### 1. **Variables no se actualizan - SOLUCIONADO**

**Síntomas:**
- Variables mantienen valor inicial
- Condiciones no se evalúan correctamente
- Campo `comparison_value` no funciona

**✅ SOLUCIÓN IMPLEMENTADA:**
```javascript
// ✅ Problema resuelto: Campo comparison_value ahora se captura correctamente
// Admin Builder - getConditionsData() actualizado
getConditionsData(questionId) {
    return conditions.map(cond => ({
        condition_type: cond.type,
        condition_value: cond.value,
        action_type: cond.action,
        action_value: cond.actionValue,
        variable_operation: cond.operator,
        variable_amount: cond.amount || 0,
        comparison_value: cond.comparisonValue || ''  // ✅ CAMPO AÑADIDO
    }));
}

// ✅ Backend - Priorización con fallback
private function get_comparison_value($condition) {
    if (isset($condition->comparison_value) && $condition->comparison_value !== '') {
        return $condition->comparison_value;  // ✅ PRIORIDAD
    }
    return $condition->variable_amount ?? 0;  // ✅ FALLBACK
}
```

#### 2. **Condiciones no se evalúan - MEJORADO**

**Síntomas:**
- Saltos de pregunta no funcionan
- Redirecciones no ocurren
- Comparaciones incorrectas entre números y texto

**✅ SOLUCIÓN IMPLEMENTADA:**
```javascript
// ✅ Comparación inteligente implementada
smartCompare(value1, value2, operator) {
    // Detectar automáticamente si son números
    if (!isNaN(value1) && !isNaN(value2)) {
        const num1 = parseFloat(value1);
        const num2 = parseFloat(value2);
        return this.compareNumbers(num1, num2, operator);
    }
    
    // Comparación de texto
    const str1 = String(value1);
    const str2 = String(value2);
    return this.compareStrings(str1, str2, operator);
}
```

#### 3. **Nuevos Problemas Identificados**

**3.1. Operaciones Matemáticas con Tipos Incorrectos**
```javascript
// ✅ NUEVO: Validación de tipos antes de operaciones
function validateVariableType(varName, operation, variables) {
    const currentValue = variables[varName];
    const varType = typeof currentValue;
    
    const numericOps = ['add_variable', 'subtract_variable', 'multiply_variable', 'divide_variable'];
    if (numericOps.includes(operation) && varType !== 'number') {
        console.warn(`SFQ: Attempting ${operation} on non-numeric variable ${varName} (type: ${varType})`);
        return false;
    }
    
    return true;
}
```

**3.2. División por Cero**
```javascript
// ✅ NUEVO: Protección contra división por cero
case 'divide_variable':
    const divisor = parseFloat(condition.variable_amount) || 1;
    if (divisor === 0) {
        console.error(`SFQ Error: Division by zero attempted for variable ${varName}`);
        break; // No ejecutar la operación
    }
    // ... resto de la lógica
```

**3.3. Variables No Inicializadas**
```javascript
// ✅ NUEVO: Inicialización automática de variables
function ensureVariableExists(varName, variables, globalVariables) {
    if (!(varName in variables)) {
        // Buscar en variables globales definidas
        const globalVar = globalVariables.find(v => v.name === varName);
        if (globalVar) {
            variables[varName] = globalVar.initial_value;
            console.log(`SFQ: Auto-initialized variable ${varName} with value:`, globalVar.initial_value);
        } else {
            variables[varName] = 0; // Valor por defecto
            console.warn(`SFQ: Variable ${varName} not found in global variables, initialized with 0`);
        }
    }
}
```

### Herramientas de Debug - ✅ MEJORADAS

#### 1. **Console Logging Avanzado**
```javascript
// Sistema de debug por niveles
window.SFQ_DEBUG_LEVEL = 'verbose'; // 'basic', 'detailed', 'verbose'

function debugLog(level, category, message, data = null) {
    const levels = { basic: 1, detailed: 2, verbose: 3 };
    const currentLevel = levels[window.SFQ_DEBUG_LEVEL] || 0;
    
    if (levels[level] <= currentLevel) {
        const timestamp = new Date().toISOString();
        const prefix = `[SFQ-${category.toUpperCase()}] ${timestamp}`;
        
        if (data) {
            console.group(`${prefix}: ${message}`);
            console.log('Data:', data);
            console.groupEnd();
        } else {
            console.log(`${prefix}: ${message}`);
        }
    }
}

// Uso en el código
debugLog('detailed', 'condition', 'Evaluating variable condition', {
    condition: condition,
    currentValue: this.variables[varName],
    comparisonValue: comparisonValue,
    result: result
});
```

#### 2. **Variables Inspector Mejorado**
```javascript
// Inspector de variables con historial
class VariablesInspector {
    constructor() {
        this.history = [];
        this.maxHistory = 50;
    }
    
    recordChange(varName, oldValue, newValue, operation, timestamp) {
        this.history.push({
            variable: varName,
            oldValue: oldValue,
            newValue: newValue,
            operation: operation,
            timestamp: timestamp || Date.now(),
            delta: this.calculateDelta(oldValue, newValue)
        });
        
        // Mantener historial limitado
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
    }
    
    showCurrentState(variables) {
        console.group('📊 SFQ Variables Inspector');
        console.table(variables);
        console.groupEnd();
    }
    
    showHistory(varName = null) {
        const filteredHistory = varName 
            ? this.history.filter(h => h.variable === varName)
            : this.history;
            
        console.group(`📈 Variable History${varName ? ` for ${varName}` : ''}`);
        console.table(filteredHistory);
        console.groupEnd();
    }
    
    calculateDelta(oldValue, newValue) {
        if (typeof oldValue === 'number' && typeof newValue === 'number') {
            return newValue - oldValue;
        }
        return null;
    }
    
    validateReferences(formData) {
        const errors = [];
        const usedVariables = new Set();
        const definedVariables = new Set(formData.global_variables.map(v => v.name));
        
        // Recopilar variables usadas en condiciones
        formData.questions.forEach(question => {
            question.conditions.forEach(condition => {
                if (condition.condition_type.startsWith('variable_')) {
                    usedVariables.add(condition.condition_value);
                }
                if (['add_variable', 'set_variable', 'multiply_variable'].includes(condition.action_type)) {
                    usedVariables.add(condition.action_value);
                }
            });
        });
        
        // Encontrar variables usadas pero no definidas
        usedVariables.forEach(varName => {
            if (!definedVariables.has(varName)) {
                errors.push(`Variable '${varName}' usada pero no definida`);
            }
        });
        
        // Encontrar variables definidas pero no usadas
        definedVariables.forEach(varName => {
            if (!usedVariables.has(varName)) {
                console.warn(`Variable '${varName}' definida pero no usada`);
            }
        });
        
        return errors;
    }
}

// Instancia global del inspector
window.SFQ_VariablesInspector = new VariablesInspector();
```

#### 3. **Condition Tracer Avanzado**
```javascript
// Trazabilidad completa de condiciones
class ConditionTracer {
    constructor() {
        this.traces = [];
        this.enabled = window.SFQ_DEBUG_LEVEL === 'verbose';
    }
    
    trace(questionId, conditions, context, results) {
        if (!this.enabled) return;
        
        const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        console.group(`🔍 Condition Trace [${traceId}] - Question ${questionId}`);
        console.log('📋 Context:', context);
        
        conditions.forEach((condition, index) => {
            const result = results[index];
            const conditionTrace = {
                index: index + 1,
                condition: condition,
                result: result,
                evaluation: this.explainEvaluation(condition, context, result)
            };
            
            console.group(`Condition ${index + 1}: ${condition.condition_type}`);
            console.log('⚙️ Configuration:', condition);
            console.log('✅ Result:', result);
            console.log('💭 Explanation:', conditionTrace.evaluation);
            console.groupEnd();
        });
        
        console.log('📊 Final Results:', results);
        console.groupEnd();
        
        // Guardar trace para análisis posterior
        this.traces.push({
            id: traceId,
            questionId: questionId,
            timestamp: Date.now(),
            conditions: conditions,
            context: context,
            results: results
        });
    }
    
    explainEvaluation(condition, context, result) {
        switch (condition.condition_type) {
            case 'variable_greater':
                const varValue = context.variables[condition.condition_value] || 0;
                const threshold = condition.comparison_value || condition.variable_amount || 0;
                return `Variable '${condition.condition_value}' (${varValue}) ${result ? '>' : '≤'} ${threshold}`;
                
            case 'answer_equals':
                return `Answer '${context.answer}' ${result ? '===' : '!=='} '${condition.condition_value}'`;
                
            default:
                return `Condition evaluated to ${result}`;
        }
    }
    
    exportTraces() {
        const exportData = {
            timestamp: new Date().toISOString(),
            traces: this.traces,
            summary: {
                totalTraces: this.traces.length,
                questionsTraced: [...new Set(this.traces.map(t => t.questionId))],
                conditionTypes: [...new Set(this.traces.flatMap(t => t.conditions.map(c => c.condition_type)))]
            }
        };
        
        console.log('📤 Exporting condition traces:', exportData);
        return exportData;
    }
}

// Instancia global del tracer
window.SFQ_ConditionTracer = new ConditionTracer();
```

---

## 🎯 Conclusión y Próximos Pasos

### ✅ **Logros Completados**

1. **✅ Problema del campo comparison_value SOLUCIONADO**
   - Campo se guarda correctamente en base de datos
   - Priorización inteligente con fallback a variable_amount
   - Compatibilidad total con condiciones existentes

2. **✅ Arquitectura de campos dinámicos implementada**
   - Sistema de priorización de campos
   - Validación robusta de tipos de datos
   - Comparación inteligente números vs texto

3. **✅ Documentación completa actualizada**
   - Guía paso a paso para añadir nuevos campos
   - Roadmap para operaciones matemáticas avanzadas
   - Casos de uso reales y ejemplos prácticos

4. **✅ Herramientas de debug mejoradas**
   - Sistema de logging por niveles
   - Inspector de variables con historial
   - Trazabilidad completa de condiciones

### 🚀 **Roadmap Futuro**

#### **Fase 1: Operaciones Matemáticas (Próximos 30 días)**
- [ ] Implementar `subtract_variable`
- [ ] Implementar `multiply_variable` 
- [ ] Implementar `divide_variable` con protección
- [ ] Testing exhaustivo de nuevas operaciones

#### **Fase 2: Condiciones Temporales (60 días)**
- [ ] Implementar `time_elapsed` condition type
- [ ] Añadir campo `timeout_seconds`
- [ ] Sistema de timestamps automáticos
- [ ] Condiciones basadas en duración de sesión

#### **Fase 3: Operaciones de Texto (90 días)**
- [ ] Implementar `concatenate_variable`
- [ ] Implementar `uppercase_variable` / `lowercase_variable`
- [ ] Sistema de plantillas de texto
- [ ] Validación de longitud de strings

#### **Fase 4: Sistema de Plugins (120 días)**
- [ ] Arquitectura de plugins para condiciones
- [ ] API para condiciones personalizadas
- [ ] Marketplace de condiciones de terceros
- [ ] Documentación para desarrolladores

### 📊 **Métricas de Éxito**

- **✅ 100% compatibilidad hacia atrás** mantenida
- **✅ 0 errores** en condiciones existentes después del fix
- **✅ Tiempo de evaluación** mejorado con comparación inteligente
- **✅ Facilidad de uso** incrementada con campos específicos

### 🔧 **Mantenimiento Continuo**

1. **Monitoreo de Performance**
   - Métricas de tiempo de evaluación
   - Tasa de errores en condiciones
   - Uso de memoria en formularios complejos

2. **Feedback de Usuarios**
   - Casos de uso no contemplados
   - Sugerencias de mejora
   - Reportes de bugs

3. **Evolución de la Arquitectura**
   - Refactoring para mejor escalabilidad
   - Optimizaciones de base de datos
   - Mejoras en la interfaz de usuario

---

*Documentación actualizada: 30 de Agosto, 2025*
*Versión del documento: 2.0*
*Estado: ✅ COMPLETA - Campo comparison_value SOLUCIONADO*

**Cambios principales en v2.0:**
- ✅ Solución completa del problema del campo `comparison_value`
- ✅ Guía detallada para añadir nuevos campos
- ✅ Roadmap de operaciones matemáticas avanzadas
- ✅ Arquitectura de campos dinámicos documentada
- ✅ Herramientas de debug mejoradas
- ✅ Casos de uso actualizados con nuevas funcionalidades
- ✅ Troubleshooting expandido con soluciones implementadas
