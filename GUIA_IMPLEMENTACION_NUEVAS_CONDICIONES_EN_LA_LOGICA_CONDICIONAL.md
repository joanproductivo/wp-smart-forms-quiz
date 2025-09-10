### Guía para Añadir Nuevas Opciones de Lógica Condicional en Smart Forms & Quiz

Añadir una nueva opción de lógica condicional requiere modificar el código en varias capas del plugin para asegurar que la condición se defina, guarde, cargue, renderice y evalúe correctamente. El error que experimentamos ("si la variable es menor o igual que") se debió a que la condición se definía y evaluaba correctamente, pero no se estaba incluyendo en el HTML del frontend, lo que impedía que el JavaScript la detectara.

Sigue estos pasos para añadir una nueva condición:

#### 1. Definición de la Condición en la Interfaz de Usuario (Admin Builder)

Primero, debes asegurarte de que la nueva condición sea una opción seleccionable en el editor de formularios.

*   **Archivo:** `assets/js/admin-builder-v2/components/UIRenderer.js`
*   **Método:** `renderCondition(condition)`

**Acción:**
Localiza el `<select class="sfq-condition-type">` dentro del método `renderCondition`. Añade una nueva opción (`<option>`) con el `value` que representará tu nueva condición y un texto descriptivo.

**Ejemplo (si quisieras añadir `variable_not_equals`):**
```javascript
// assets/js/admin-builder-v2/components/UIRenderer.js
// ...
renderCondition(condition) {
    // ...
    return `
        <div class="sfq-condition-item" id="${condition.id}">
            <!-- ... -->
            <div class="sfq-condition-row">
                <select class="sfq-condition-type">
                    <!-- ... opciones existentes ... -->
                    <option value="variable_greater_equal" ${condition.type === 'variable_greater_equal' ? 'selected' : ''}>
                        Si la variable es mayor o igual que
                    </option>
                    <option value="variable_less_equal" ${condition.type === 'variable_less_equal' ? 'selected' : ''}>
                        Si la variable es menor o igual que
                    </option>
                    <option value="variable_not_equals" ${condition.type === 'variable_not_equals' ? 'selected' : ''}>
                        Si la variable no es igual a
                    </option>
                </select>
                <!-- ... -->
            </div>
            <!-- ... -->
        </div>
    `;
}
// ...
```

#### 2. Manejo de la Condición en la Lógica del Editor (Admin Builder)

El `ConditionEngine` del editor necesita saber cómo manejar la nueva condición cuando se carga y se guarda.

*   **Archivo:** `assets/js/admin-builder-v2/managers/ConditionEngine.js`
*   **Métodos:** `loadConditions(questionId, conditionsData)`, `getConditionsData(questionId)`, `generateConditionValueField(condition)` (en `UIRenderer.js`, pero es relevante aquí).

**Acción:**
*   **`loadConditions`:** Este método ya mapea `cond.condition_type` a `condition.type` directamente, por lo que no suele requerir cambios a menos que la nueva condición necesite un manejo especial de datos al cargar.
*   **`getConditionsData`:** Este método mapea `condition.type` a `condition_type` para guardar. Asegúrate de que cualquier dato específico de tu nueva condición (como `comparison_value`) se incluya en el objeto `conditionData`.
*   **`generateConditionValueField` (en `UIRenderer.js`):** Si tu nueva condición requiere campos de entrada específicos (por ejemplo, un campo de texto, un selector de variables, etc.), deberás añadir un nuevo `case` en este método para renderizar la UI adecuada.

**Ejemplo (si `variable_not_equals` usa los mismos campos que otras condiciones de variable):**
```javascript
// assets/js/admin-builder-v2/components/UIRenderer.js
// ...
generateConditionValueField(condition) {
    switch (condition.type) {
        case 'variable_greater':
        case 'variable_greater_equal':
        case 'variable_less':
        case 'variable_less_equal':
        case 'variable_equals':
        case 'variable_not_equals': // <-- Añadir aquí
            return this.generateVariableConditionFields(condition);
        // ...
    }
}
// ...
```

#### 3. Procesamiento y Almacenamiento en el Backend (PHP AJAX)

El backend debe ser capaz de recibir, validar y guardar la nueva condición, y también evaluarla si es necesario (por ejemplo, para la navegación condicional vía AJAX o el modo seguro).

*   **Archivo:** `includes/class-sfq-ajax.php`
*   **Métodos:** `validate_and_structure_conditions($conditions)`, `evaluate_condition($condition, $answer, $variables)`

**Acción:**
*   **`validate_and_structure_conditions`:** Asegúrate de que tu nueva condición y sus datos asociados (como `comparison_value`) se incluyan en el array `$structured_conditions`. Este método ya incluye `comparison_value`, por lo que si tu condición lo usa, no debería necesitar cambios.
*   **`evaluate_condition`:** Este es el corazón de la evaluación en el backend. Añade un nuevo `case` para tu `condition_type` y define la lógica de comparación utilizando `smart_compare`.

**Ejemplo (para `variable_not_equals`):**
```php
// includes/class-sfq-ajax.php
// ...
private function evaluate_condition($condition, $answer, $variables) {
    // ...
    switch ($condition_type) {
        // ... casos existentes ...
        case 'variable_equals':
            $result = $this->smart_compare($var_value, $comparison_value, '==');
            break;
        case 'variable_not_equals': // <-- Añadir aquí
            $result = $this->smart_compare($var_value, $comparison_value, '!='); // Usar el operador correcto
            break;
        default:
            $result = false;
            break;
    }
    // ...
}
// ...
```

#### 4. Renderizado de la Condición en el Frontend (PHP)

**¡Este fue el punto clave del error que encontramos!** Aunque la condición se guarde y evalúe correctamente, si no se incluye en el HTML del frontend, el JavaScript no la detectará.

*   **Archivo:** `includes/class-sfq-frontend.php`
*   **Métodos:** `get_conditions_for_option_value($all_conditions, $option_value)`, `get_conditions_for_freestyle_input_field($all_conditions)`

**Acción:**
En ambos métodos, localiza el array que lista los `condition_type` que deben incluirse en el atributo `data-conditions`. **Asegúrate de añadir tu nueva condición a este array.**

**Ejemplo (para `variable_not_equals`):**
```php
// includes/class-sfq-frontend.php
// ...
private function get_conditions_for_option_value($all_conditions, $option_value) {
    // ...
    // También incluir condiciones de variables que se ejecutan independientemente
    elseif (in_array($condition->condition_type, ['variable_greater', 'variable_greater_equal', 'variable_less', 'variable_less_equal', 'variable_equals', 'variable_not_equals'])) { // <-- Añadir aquí
        // ...
    }
    // ...
}

private function get_conditions_for_freestyle_input_field($all_conditions) {
    // ...
    // También incluir condiciones de variables que se ejecutan independientemente
    elseif (in_array($condition->condition_type, ['variable_greater', 'variable_greater_equal', 'variable_less', 'variable_less_equal', 'variable_equals', 'variable_not_equals'])) { // <-- Añadir aquí
        // ...
    }
    // ...
}
// ...
```

#### 5. Evaluación de la Condición en el Frontend (JavaScript)

Finalmente, el motor de lógica condicional en el frontend debe saber cómo evaluar tu nueva condición.

*   **Archivo:** `assets/js/frontend.js`
*   **Método:** `evaluateConditionLogic(condition, context)`

**Acción:**
Añade un nuevo `case` para tu `condition.condition_type` y define la lógica de comparación utilizando `this.smartCompare`.

**Ejemplo (para `variable_not_equals`):**
```javascript
// assets/js/frontend.js
// ...
evaluateConditionLogic(condition, context) {
    const { answer, variables } = context;
    // ...
    switch (condition.condition_type) {
        // ... casos existentes ...
        case 'variable_equals':
            const varValue3 = variables[condition.condition_value] || 0;
            const compareValue5 = this.getComparisonValue(condition);
            return this.smartCompare(varValue3, compareValue5, '==');
            
        case 'variable_not_equals': // <-- Añadir aquí
            const varValue4 = variables[condition.condition_value] || 0;
            const compareValue6 = this.getComparisonValue(condition);
            return this.smartCompare(varValue4, compareValue6, '!='); // Usar el operador correcto
            
        default:
            console.warn('🔧 ConditionalEngine: Unknown condition type:', condition.condition_type);
            return false;
    }
}
// ...
```

#### 6. Función `smart_compare` (PHP y JS)

Si tu nueva condición utiliza un operador de comparación que no existe en `smart_compare` (por ejemplo, `contains_regex`), deberás añadirlo a esta función en ambos archivos.

*   **Archivos:** `includes/class-sfq-ajax.php` y `assets/js/frontend.js`
*   **Método:** `smart_compare($value1, $value2, $operator)` (PHP) / `smartCompare(value1, value2, operator)` (JS)

**Acción:**
Añade un nuevo `case` para tu operador en la función `smart_compare` (tanto para comparaciones numéricas como de cadena, si aplica).

**Ejemplo (si quisieras añadir un operador `!=`):**
```php
// includes/class-sfq-ajax.php
// ...
private function smart_compare($value1, $value2, $operator) {
    // ...
    if (is_numeric($value1) && is_numeric($value2)) {
        // ...
        switch ($operator) {
            // ... casos existentes ...
            case '==':
                return $num1 === $num2;
            case '!=': // <-- Añadir aquí
                return $num1 !== $num2;
            default:
                return false;
        }
    }
    // ...
    $str1 = strval($value1);
    $str2 = strval($value2);
    // ...
    switch ($operator) {
        // ... casos existentes ...
        case '==':
            return $str1 === $str2;
        case '!=': // <-- Añadir aquí
            return $str1 !== $str2;
        default:
            return false;
    }
}
// ...
```
(Lo mismo para `assets/js/frontend.js` con `smartCompare`)

---

**Resumen de Puntos Clave para Evitar Errores:**

*   **Consistencia:** Asegúrate de que el `condition_type` (el valor interno de la condición) sea el mismo en todos los archivos (UI, guardado, renderizado, evaluación).
*   **Flujo de Datos:** Verifica que la condición y sus valores asociados se pasen correctamente a través de todas las capas:
    1.  Se selecciona en la UI (Admin JS).
    2.  Se guarda en la base de datos (Admin JS -> PHP AJAX).
    3.  Se carga desde la base de datos (PHP AJAX -> Admin JS).
    4.  Se renderiza en el HTML del frontend (PHP Frontend). **¡Este fue nuestro error!**
    5.  Se lee desde el HTML y se evalúa (Frontend JS).
*   **Depuración:** Utiliza `console.log()` en JavaScript y `error_log()` en PHP para inspeccionar los valores y tipos de datos en cada etapa. Esto es invaluable para encontrar dónde se rompe la cadena de información.
