# Guía de Implementación de Lógica Condicional para Tipos de Pregunta

## 📋 Resumen Ejecutivo

Este documento explica cómo implementar la lógica condicional en diferentes tipos de pregunta del plugin Smart Forms Quiz. La lógica condicional permite que las respuestas del usuario desencadenen acciones automáticas como redirecciones, saltos de pregunta y actualización de variables.

## 🎯 Objetivo

Proporcionar una guía paso a paso para que cualquier desarrollador pueda implementar lógica condicional en nuevos tipos de pregunta o corregir problemas en tipos existentes.

---

## 🔍 Análisis del Problema Original

### **Tipos que NO funcionaban:**
- ❌ **Multiple Choice** (Opción Múltiple)
- ❌ **Text Input** (Campo de Texto)  
- ❌ **Image Choice** (Selección de Imagen)
- ❌ **Rating** (Valoración)

### **Tipo que SÍ funcionaba:**
- ✅ **Single Choice** (Opción Única)

### **Causa del Problema:**
Los tipos que no funcionaban **NO tenían** la llamada a `processConditionsImmediate()` en sus manejadores de eventos, por lo que nunca se evaluaban las condiciones configuradas.

---

## 🛠️ Solución Implementada

### **Patrón de Implementación Estándar**

Todos los tipos de pregunta deben seguir este patrón en su manejador de eventos:

```javascript
async handleTipoPregunta(e) {
    // 1. LÓGICA ESPECÍFICA DEL TIPO
    // - Capturar elemento clickeado/modificado
    // - Actualizar estado visual
    // - Guardar respuesta en this.responses[questionId]
    
    // 2. PROCESAMIENTO DE CONDICIONES (CRÍTICO)
    try {
        // Mostrar indicador de procesamiento
        this.showProcessingIndicator(container);

        // Crear elemento temporal o usar elemento real para condiciones
        const elementForConditions = /* elemento con data-conditions */;
        
        const redirectResult = await this.processConditionsImmediate(elementForConditions, questionId);
        
        // 3. MANEJAR REDIRECCIONES
        if (redirectResult && redirectResult.shouldRedirect) {
            if (redirectResult.markAsCompleted) {
                // Marcar formulario como completado antes de redirigir
                this.showRedirectProcessingIndicator();
                await this.markFormAsCompleted();
                setTimeout(() => {
                    window.location.href = redirectResult.redirectUrl;
                }, 1500);
            } else {
                // Redirección inmediata
                window.location.href = redirectResult.redirectUrl;
            }
            return;
        }

        // 4. MANEJAR SALTOS DE PREGUNTA
        if (redirectResult && redirectResult.skipToQuestion) {
            this.skipToQuestion = redirectResult.skipToQuestion;
        }

        // 5. ACTUALIZAR VARIABLES GLOBALES
        if (redirectResult && redirectResult.variables) {
            this.variables = { ...redirectResult.variables };
        }
        
    } catch (error) {
        console.error('Error processing conditions:', error);
        this.showError('Error al procesar las condiciones. Continuando...');
    } finally {
        // Ocultar indicador de procesamiento
        this.hideProcessingIndicator(container);
    }

    // 6. LÓGICA ADICIONAL (auto-advance, etc.)
}
```

---

## 📝 Implementaciones Específicas

### **1. Multiple Choice (Opción Múltiple)**

```javascript
async handleMultipleChoice(e) {
    const checkbox = e.target;
    const card = checkbox.closest('.sfq-option-card');
    const questionContainer = checkbox.closest('.sfq-multiple-choice');
    const questionId = questionContainer.dataset.questionId;

    // 1. LÓGICA ESPECÍFICA: Toggle visual y guardar respuestas
    if (checkbox.checked) {
        card.classList.add('selected');
    } else {
        card.classList.remove('selected');
    }

    const selectedValues = [];
    questionContainer.querySelectorAll('.sfq-checkbox-input:checked').forEach(cb => {
        selectedValues.push(cb.value);
    });
    this.responses[questionId] = selectedValues;

    // 2. PROCESAMIENTO DE CONDICIONES
    try {
        this.showProcessingIndicator(questionContainer);

        // ✅ CLAVE: Crear elemento temporal con condiciones
        const tempElement = document.createElement('div');
        tempElement.dataset.conditions = checkbox.dataset.conditions || '[]';
        tempElement.dataset.value = selectedValues.join(',');
        
        const redirectResult = await this.processConditionsImmediate(tempElement, questionId);
        
        // [... resto del patrón estándar ...]
        
    } catch (error) {
        console.error('Error processing conditions in multiple choice:', error);
    } finally {
        this.hideProcessingIndicator(questionContainer);
    }
}
```

**Puntos Clave:**
- ✅ Crear elemento temporal porque no hay un elemento único que represente la selección múltiple
- ✅ Unir valores múltiples con coma para evaluación de condiciones
- ✅ Usar `checkbox.dataset.conditions` del elemento clickeado

### **2. Text Input (Campo de Texto)**

```javascript
async handleTextInput(e) {
    const input = e.target;
    const questionId = input.name.replace('question_', '');
    this.responses[questionId] = input.value;

    // ✅ CLAVE: Debounce para evitar spam de peticiones
    clearTimeout(this.textInputTimeout);
    this.textInputTimeout = setTimeout(async () => {
        try {
            const questionContainer = input.closest('.sfq-question-screen');
            this.showProcessingIndicator(questionContainer);

            // ✅ CLAVE: Crear elemento temporal con valor actual
            const tempElement = document.createElement('div');
            tempElement.dataset.conditions = input.dataset.conditions || '[]';
            tempElement.dataset.value = input.value;
            
            const redirectResult = await this.processConditionsImmediate(tempElement, questionId);
            
            // [... resto del patrón estándar ...]
            
        } catch (error) {
            console.error('Error processing conditions in text input:', error);
        } finally {
            this.hideProcessingIndicator(questionContainer);
        }
    }, 500); // ✅ CLAVE: Esperar 500ms después de que el usuario deje de escribir
}
```

**Puntos Clave:**
- ✅ **Debounce de 500ms** para evitar evaluaciones excesivas mientras el usuario escribe
- ✅ Crear elemento temporal con el valor actual del input
- ✅ Usar `input.dataset.conditions` del campo de texto

### **3. Rating (Valoración)**

```javascript
async handleRating(e) {
    e.preventDefault();
    const button = e.currentTarget;
    const wrapper = button.closest('.sfq-rating-wrapper');
    const questionId = wrapper.dataset.questionId;
    const value = button.dataset.value;

    // 1. LÓGICA ESPECÍFICA: Actualizar estado visual y guardar valor
    wrapper.querySelectorAll('.sfq-star, .sfq-emoji').forEach(b => {
        b.classList.remove('active');
    });

    if (button.classList.contains('sfq-star')) {
        const stars = wrapper.querySelectorAll('.sfq-star');
        stars.forEach((star, index) => {
            if (index < value) {
                star.classList.add('active');
            }
        });
    } else {
        button.classList.add('active');
    }

    wrapper.querySelector('input[type="hidden"]').value = value;
    this.responses[questionId] = value;

    // 2. PROCESAMIENTO DE CONDICIONES
    try {
        this.showProcessingIndicator(wrapper);

        // ✅ CLAVE: Crear elemento temporal con valor del rating
        const tempElement = document.createElement('div');
        tempElement.dataset.conditions = button.dataset.conditions || '[]';
        tempElement.dataset.value = value;
        
        const redirectResult = await this.processConditionsImmediate(tempElement, questionId);
        
        // [... resto del patrón estándar ...]
        
    } catch (error) {
        console.error('Error processing conditions in rating:', error);
    } finally {
        this.hideProcessingIndicator(wrapper);
    }
}
```

**Puntos Clave:**
- ✅ Usar `button.dataset.conditions` del botón clickeado (estrella o emoji)
- ✅ Crear elemento temporal con el valor numérico del rating
- ✅ Manejar tanto estrellas como emojis

### **4. Image Choice (Selección de Imagen)**

```javascript
async handleImageChoice(e) {
    const option = e.currentTarget;
    const grid = option.closest('.sfq-image-grid');
    const questionId = grid.dataset.questionId;

    // 1. LÓGICA ESPECÍFICA: Limpiar selección previa y marcar nueva
    grid.querySelectorAll('.sfq-image-option').forEach(opt => {
        opt.classList.remove('selected');
        const input = opt.querySelector('input');
        if (input) input.checked = false;
    });

    option.classList.add('selected');
    const input = option.querySelector('input');
    if (input) input.checked = true;

    // ✅ PROBLEMA ESPECÍFICO: Buscar valor en .sfq-image-label
    const imageLabel = option.querySelector('.sfq-image-label');
    const responseValue = imageLabel ? imageLabel.textContent.trim() : (option.dataset.value || '');
    this.responses[questionId] = responseValue;

    // 2. PROCESAMIENTO DE CONDICIONES
    try {
        this.showProcessingIndicator(grid);

        // ✅ CLAVE: Usar elemento real (option) que tiene las condiciones
        const redirectResult = await this.processConditionsImmediate(option, questionId);
        
        // [... resto del patrón estándar ...]
        
    } catch (error) {
        console.error('Error processing conditions in image choice:', error);
    } finally {
        this.hideProcessingIndicator(grid);
    }
}
```

**Puntos Clave:**
- ✅ **Problema específico**: El valor está en `.sfq-image-label`, no en `data-value`
- ✅ Usar elemento real (`option`) que ya tiene `data-conditions`
- ✅ Fallback robusto para obtener el valor

#### **🔧 Corrección Adicional Requerida en PHP**

**PROBLEMA IDENTIFICADO**: Las opciones de imagen no tenían el atributo `data-conditions` en el HTML generado.

**SOLUCIÓN APLICADA** en `includes/class-sfq-frontend.php`:

```php
// ❌ ANTES (no funcionaba):
<div class="sfq-image-option" 
     data-value="<?php echo esc_attr($option_value); ?>">

// ✅ DESPUÉS (funciona):
<?php 
$option_conditions = $option_data['conditions'] ?? array();
?>
<div class="sfq-image-option" 
     data-value="<?php echo esc_attr($option_value); ?>"
     data-conditions='<?php echo json_encode($option_conditions); ?>'>
```

**Cambios realizados:**
1. **Extraer condiciones**: `$option_conditions = $option_data['conditions'] ?? array();`
2. **Añadir atributo**: `data-conditions='<?php echo json_encode($option_conditions); ?>'`

Esto asegura que las opciones de imagen tengan la misma estructura que las opciones de texto, permitiendo que la lógica condicional funcione correctamente.

---

## 🔧 Componentes Clave del Sistema

### **1. processConditionsImmediate()**

Esta función es el corazón del sistema de lógica condicional:

```javascript
async processConditionsImmediate(element, questionId) {
    const conditions = element.dataset.conditions;
    
    if (conditions !== undefined) {
        try {
            const conditionsList = JSON.parse(conditions);
            if (Array.isArray(conditionsList) && conditionsList.length > 0) {
                // Evaluar condiciones localmente
                const localResult = this.evaluateConditionsForRedirect(conditionsList, questionId);
                
                if (localResult.variables) {
                    this.variables = { ...localResult.variables };
                }
                
                if (localResult.shouldRedirect || localResult.skipToQuestion) {
                    return localResult;
                }
            }
        } catch (e) {
            console.error('Error procesando condiciones locales:', e);
        }
        
        // Verificar condiciones adicionales en el servidor
        const ajaxResult = await this.checkConditionsViaAjax(questionId, element.dataset.value);
        
        if (ajaxResult && ajaxResult.variables) {
            this.variables = { ...ajaxResult.variables };
        }
        
        return ajaxResult;
    }
    
    return { shouldRedirect: false, skipToQuestion: null, variables: this.variables };
}
```

### **2. Tipos de Condiciones Soportadas**

```javascript
// Condiciones basadas en respuestas
'answer_equals'     // Respuesta igual a valor
'answer_contains'   // Respuesta contiene texto
'answer_not_equals' // Respuesta diferente a valor

// Condiciones basadas en variables
'variable_greater'  // Variable mayor que valor
'variable_less'     // Variable menor que valor  
'variable_equals'   // Variable igual a valor
```

### **3. Tipos de Acciones Soportadas**

```javascript
// Acciones de redirección
'redirect_url'      // Redirigir a URL externa
'goto_question'     // Saltar a pregunta específica
'skip_to_end'       // Saltar al final del formulario

// Acciones de variables
'add_variable'      // Sumar valor a variable
'set_variable'      // Establecer valor de variable

// Acciones de interfaz
'show_message'      // Mostrar mensaje al usuario
```

---

## 📋 Checklist para Implementar en Nuevo Tipo

### **Paso 1: Identificar el Manejador de Eventos**
- [ ] Localizar la función `handle[TipoPregunta](e)` en `frontend.js`
- [ ] Verificar que capture correctamente la respuesta del usuario
- [ ] Confirmar que guarde la respuesta en `this.responses[questionId]`

### **Paso 2: Añadir Procesamiento de Condiciones**
- [ ] Hacer la función `async`
- [ ] Añadir bloque `try/catch/finally`
- [ ] Llamar a `this.showProcessingIndicator(container)`
- [ ] Llamar a `await this.processConditionsImmediate(element, questionId)`
- [ ] Manejar resultado de redirección
- [ ] Manejar salto de pregunta
- [ ] Actualizar variables globales
- [ ] Llamar a `this.hideProcessingIndicator(container)`

### **Paso 3: Determinar Elemento para Condiciones**
- [ ] **Opción A**: Usar elemento real si tiene `data-conditions`
- [ ] **Opción B**: Crear elemento temporal con condiciones
- [ ] Asegurar que `element.dataset.value` contenga la respuesta

### **Paso 4: Consideraciones Especiales**
- [ ] **Text Input**: Implementar debounce (500ms)
- [ ] **Multiple Choice**: Unir valores con coma
- [ ] **Image Choice**: Buscar valor en lugar correcto
- [ ] **Rating**: Usar valor numérico del rating

### **Paso 5: Testing**
- [ ] Probar condiciones simples (`answer_equals`)
- [ ] Probar redirecciones externas
- [ ] Probar saltos de pregunta
- [ ] Probar actualización de variables
- [ ] Verificar indicadores visuales

---

## 🚨 Problemas Comunes y Soluciones

### **Problema 1: Condiciones no se evalúan**
```javascript
// ❌ INCORRECTO: No hay llamada a processConditionsImmediate
handleTipoPregunta(e) {
    // Solo lógica específica del tipo
    this.responses[questionId] = value;
}

// ✅ CORRECTO: Incluir procesamiento de condiciones
async handleTipoPregunta(e) {
    this.responses[questionId] = value;
    
    const redirectResult = await this.processConditionsImmediate(element, questionId);
    // Manejar resultado...
}
```

### **Problema 2: Elemento incorrecto para condiciones**
```javascript
// ❌ INCORRECTO: Elemento sin data-conditions
const redirectResult = await this.processConditionsImmediate(container, questionId);

// ✅ CORRECTO: Elemento con condiciones o temporal
const tempElement = document.createElement('div');
tempElement.dataset.conditions = realElement.dataset.conditions || '[]';
tempElement.dataset.value = userResponse;
const redirectResult = await this.processConditionsImmediate(tempElement, questionId);
```

### **Problema 3: Valor incorrecto en respuesta**
```javascript
// ❌ INCORRECTO: Valor en lugar equivocado
this.responses[questionId] = option.dataset.value; // Puede estar vacío

// ✅ CORRECTO: Buscar valor en lugar correcto con fallback
const imageLabel = option.querySelector('.sfq-image-label');
const responseValue = imageLabel ? imageLabel.textContent.trim() : (option.dataset.value || '');
this.responses[questionId] = responseValue;
```

### **Problema 4: Spam de evaluaciones en text input**
```javascript
// ❌ INCORRECTO: Evaluar en cada keystroke
handleTextInput(e) {
    this.responses[questionId] = e.target.value;
    await this.processConditionsImmediate(element, questionId); // ¡Spam!
}

// ✅ CORRECTO: Usar debounce
handleTextInput(e) {
    this.responses[questionId] = e.target.value;
    
    clearTimeout(this.textInputTimeout);
    this.textInputTimeout = setTimeout(async () => {
        await this.processConditionsImmediate(element, questionId);
    }, 500);
}
```

---

## 🎯 Ejemplo Completo: Implementar en Nuevo Tipo

Supongamos que queremos añadir lógica condicional a un nuevo tipo llamado **"Color Picker"**:

```javascript
async handleColorPicker(e) {
    // 1. LÓGICA ESPECÍFICA DEL TIPO
    const colorButton = e.currentTarget;
    const colorContainer = colorButton.closest('.sfq-color-picker');
    const questionId = colorContainer.dataset.questionId;
    const selectedColor = colorButton.dataset.color;

    // Limpiar selección previa
    colorContainer.querySelectorAll('.sfq-color-button').forEach(btn => {
        btn.classList.remove('selected');
    });

    // Marcar como seleccionado
    colorButton.classList.add('selected');

    // Guardar respuesta
    this.responses[questionId] = selectedColor;

    // 2. PROCESAMIENTO DE CONDICIONES (NUEVO)
    try {
        // Mostrar indicador de procesamiento
        this.showProcessingIndicator(colorContainer);

        // Usar elemento real que tiene data-conditions
        const redirectResult = await this.processConditionsImmediate(colorButton, questionId);
        
        // 3. MANEJAR REDIRECCIONES
        if (redirectResult && redirectResult.shouldRedirect) {
            if (redirectResult.markAsCompleted) {
                this.showRedirectProcessingIndicator();
                await this.markFormAsCompleted();
                setTimeout(() => {
                    window.location.href = redirectResult.redirectUrl;
                }, 1500);
            } else {
                window.location.href = redirectResult.redirectUrl;
            }
            return;
        }

        // 4. MANEJAR SALTOS DE PREGUNTA
        if (redirectResult && redirectResult.skipToQuestion) {
            this.skipToQuestion = redirectResult.skipToQuestion;
        }

        // 5. ACTUALIZAR VARIABLES GLOBALES
        if (redirectResult && redirectResult.variables) {
            this.variables = { ...redirectResult.variables };
        }
        
    } catch (error) {
        console.error('Error processing conditions in color picker:', error);
        this.showError('Error al procesar las condiciones. Continuando...');
    } finally {
        // Ocultar indicador de procesamiento
        this.hideProcessingIndicator(colorContainer);
    }

    // 6. LÓGICA ADICIONAL
    if (this.settings.auto_advance) {
        setTimeout(() => this.nextQuestion(), 300);
    }
}
```

---

## 📚 Recursos Adicionales

### **Archivos Relacionados:**
- `assets/js/frontend.js` - Lógica principal del frontend
- `includes/class-sfq-ajax.php` - Procesamiento de condiciones en servidor
- `DOCUMENTACION_LOGICA_CONDICIONAL_COMPLETA.md` - Documentación completa del sistema

### **Funciones Clave:**
- `processConditionsImmediate()` - Evaluación inmediata de condiciones
- `evaluateConditionsForRedirect()` - Evaluación local de condiciones
- `checkConditionsViaAjax()` - Verificación de condiciones en servidor
- `showProcessingIndicator()` / `hideProcessingIndicator()` - Indicadores visuales

---

## ✅ Conclusión

Esta guía proporciona todo lo necesario para implementar lógica condicional en cualquier tipo de pregunta. El patrón es consistente y escalable, permitiendo que futuras implementaciones sean rápidas y confiables.

**Puntos Clave para Recordar:**
1. **Siempre** hacer la función `async` y añadir `await this.processConditionsImmediate()`
2. **Siempre** usar `try/catch/finally` con indicadores de procesamiento
3. **Siempre** manejar redirecciones, saltos y variables
4. **Considerar** casos especiales como debounce o valores en lugares no estándar
5. **Probar** exhaustivamente todas las condiciones y acciones

Con esta guía, cualquier desarrollador puede extender la funcionalidad de lógica condicional a nuevos tipos de pregunta de manera consistente y robusta.
