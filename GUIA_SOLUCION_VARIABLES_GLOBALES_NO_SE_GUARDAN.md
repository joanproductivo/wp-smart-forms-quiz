# Guía de Solución: Variables Globales No Se Guardan en la Base de Datos

## 📋 Descripción del Problema

**Síntoma:** Las variables globales del formulario no se guardan en la base de datos y desaparecen al recargar el formulario de edición en el admin.

**Comportamiento observado:**
- Las variables globales se pueden crear y editar en el admin
- Al guardar el formulario, parecen guardarse correctamente
- Al recargar la página del formulario, las variables desaparecen
- El contenedor `#sfq-global-variables-list` aparece vacío
- En la base de datos no se encuentran las variables globales

## 🔍 Análisis del Problema

### Flujo Esperado vs Flujo Real

**Flujo Esperado:**
1. JavaScript recopila variables → AJAX → PHP guarda → Base de datos
2. Base de datos → PHP recupera → JavaScript → DOM

**Flujo Real (Problemático):**
1. JavaScript recopila variables → AJAX → PHP **NO PROCESA** → Base de datos vacía
2. Base de datos vacía → PHP recupera vacío → JavaScript → DOM vacío

### Causas Identificadas

1. **Backend (PHP):** La función `save_form()` no procesaba las variables globales
2. **Backend (PHP):** Faltaba la función `save_global_variables()`
3. **Backend (PHP):** Las funciones `get_form()` y `get_form_fresh()` no incluían las variables globales
4. **Frontend (JavaScript):** La función `renderVariables()` estaba incompleta

## 🛠️ Solución Implementada

### 1. Backend - Archivo: `includes/class-sfq-database.php`

#### A. Actualizar función `save_form()`

**Problema:** No procesaba las variables globales recibidas del frontend.

**Solución:** Añadir procesamiento de variables globales después de guardar preguntas:

```php
// Guardar preguntas si existen
if (isset($data['questions']) && is_array($data['questions'])) {
    error_log('SFQ: Saving ' . count($data['questions']) . ' questions');
    $this->save_questions($form_id, $data['questions']);
}

// ✅ CRÍTICO: Guardar variables globales si existen
if (isset($data['global_variables']) && is_array($data['global_variables'])) {
    error_log('SFQ: Saving ' . count($data['global_variables']) . ' global variables');
    $this->save_global_variables($form_id, $data['global_variables']);
} else {
    error_log('SFQ: No global variables provided in form data');
}
```

#### B. Implementar función `save_global_variables()`

**Problema:** La función no existía.

**Solución:** Crear función completa con logging:

```php
/**
 * ✅ CRÍTICO: Guardar variables globales del formulario
 */
private function save_global_variables($form_id, $global_variables) {
    if (!is_array($global_variables) || empty($global_variables)) {
        error_log('SFQ: No global variables to save for form ' . $form_id);
        return;
    }
    
    error_log('SFQ: === SAVING GLOBAL VARIABLES ===');
    error_log('SFQ: Form ID: ' . $form_id);
    error_log('SFQ: Variables to save: ' . json_encode($global_variables));
    
    // Las variables globales se guardan en el campo settings del formulario
    global $wpdb;
    
    // Obtener configuraciones actuales del formulario
    $current_settings = $wpdb->get_var($wpdb->prepare(
        "SELECT settings FROM {$this->forms_table} WHERE id = %d",
        $form_id
    ));
    
    // Decodificar configuraciones existentes
    $settings = json_decode($current_settings, true) ?: array();
    
    // Añadir/actualizar las variables globales
    $settings['global_variables'] = $global_variables;
    
    // Guardar de vuelta en la base de datos
    $result = $wpdb->update(
        $this->forms_table,
        array('settings' => json_encode($settings)),
        array('id' => $form_id),
        array('%s'),
        array('%d')
    );
    
    if ($result === false) {
        error_log('SFQ: ERROR saving global variables: ' . $wpdb->last_error);
    } else {
        error_log('SFQ: Successfully saved ' . count($global_variables) . ' global variables');
        
        // Verificar que se guardaron correctamente
        $verification = $wpdb->get_var($wpdb->prepare(
            "SELECT settings FROM {$this->forms_table} WHERE id = %d",
            $form_id
        ));
        
        $verified_settings = json_decode($verification, true);
        if (isset($verified_settings['global_variables'])) {
            error_log('SFQ: Verification - global variables saved correctly: ' . count($verified_settings['global_variables']) . ' variables');
        } else {
            error_log('SFQ: WARNING - global variables not found in verification');
        }
    }
    
    error_log('SFQ: === END SAVING GLOBAL VARIABLES ===');
}
```

#### C. Actualizar función `get_form()`

**Problema:** No incluía las variables globales al recuperar formularios.

**Solución:** Extraer variables globales del campo `settings`:

```php
if ($form) {
    // Decodificar configuraciones JSON
    $form->settings = json_decode($form->settings, true) ?: array();
    $form->style_settings = json_decode($form->style_settings, true) ?: array();
    
    // ✅ CRÍTICO: Extraer variables globales de las configuraciones
    $form->global_variables = isset($form->settings['global_variables']) && is_array($form->settings['global_variables']) 
        ? $form->settings['global_variables'] 
        : array();
    
    // Obtener preguntas
    $form->questions = $this->get_questions($form_id);
    
    // ... resto del código
}
```

#### D. Actualizar función `get_form_fresh()`

**Problema:** Función usada en el admin no incluía variables globales.

**Solución:** Aplicar la misma lógica que en `get_form()`:

```php
if ($form) {
    // Decodificar configuraciones JSON
    $form->settings = json_decode($form->settings, true) ?: array();
    $form->style_settings = json_decode($form->style_settings, true) ?: array();
    
    // ✅ CRÍTICO: Extraer variables globales de las configuraciones (igual que en get_form)
    $form->global_variables = isset($form->settings['global_variables']) && is_array($form->settings['global_variables']) 
        ? $form->settings['global_variables'] 
        : array();
    
    // ... resto del código
}
```

### 2. Frontend - Archivo: `assets/js/admin-builder-v2.js`

#### A. Completar función `renderVariables()`

**Problema:** La función estaba incompleta y no mostraba las variables.

**Solución:** Implementar función completa con logging:

```javascript
renderVariables() {
    console.log('SFQ: === RENDERING VARIABLES ===');
    
    const variables = this.getGlobalVariables();
    console.log('SFQ: Variables to render:', variables);
    
    const $container = $('#sfq-global-variables-list');
    
    if (!$container.length) {
        console.warn('SFQ: Variables container #sfq-global-variables-list not found');
        return;
    }
    
    if (variables.length === 0) {
        console.log('SFQ: No variables found, showing empty state');
        $container.html(`
            <div class="sfq-variables-empty">
                <span class="dashicons dashicons-admin-settings"></span>
                <p>No hay variables globales creadas</p>
                <p>Las variables te permiten crear lógica avanzada en tus formularios</p>
            </div>
        `);
        return;
    }
    
    console.log('SFQ: Rendering', variables.length, 'variables');
    const variablesHtml = variables.map(variable => this.renderVariable(variable)).join('');
    $container.html(variablesHtml);
    
    // Bind events para cada variable
    this.bindVariableEvents();
    
    console.log('SFQ: Variables rendered successfully');
}
```

#### B. Verificar función `collectFormData()`

**Estado:** Ya estaba correcta, incluía las variables globales:

```javascript
collectFormData() {
    return {
        // ... otros datos
        global_variables: this.getGlobalVariables()  // ✅ Ya estaba correcto
    };
}
```

## 🔧 Pasos para Aplicar la Solución

### 1. Identificar el Problema
- Verificar que las variables no aparecen al recargar el formulario
- Comprobar en la base de datos si el campo `settings` contiene `global_variables`
- Revisar los logs del navegador y del servidor

### 2. Aplicar Correcciones Backend
1. Actualizar `save_form()` para procesar variables globales
2. Implementar `save_global_variables()`
3. Actualizar `get_form()` y `get_form_fresh()`
4. Añadir logging para debugging

### 3. Aplicar Correcciones Frontend
1. Completar `renderVariables()`
2. Verificar que `collectFormData()` incluye las variables
3. Añadir logging para debugging

### 4. Verificar la Solución
1. Crear una variable global en el admin
2. Guardar el formulario
3. Recargar la página
4. Verificar que la variable aparece
5. Comprobar en la base de datos que se guardó

## 🚨 Puntos Críticos a Recordar

### 1. Estructura de Datos
- Las variables globales se guardan en `settings['global_variables']`
- Es un array de objetos con estructura: `{id, name, description, type, initial_value}`

### 2. Flujo de Datos
- **Guardado:** JavaScript → `collectFormData()` → AJAX → `save_form()` → `save_global_variables()`
- **Recuperación:** `get_form()` → `form.global_variables` → `renderVariables()` → DOM

### 3. Funciones Clave
- **Backend:** `save_global_variables()`, `get_form()`, `get_form_fresh()`
- **Frontend:** `renderVariables()`, `getGlobalVariables()`, `collectFormData()`

### 4. Debugging
- Usar `error_log()` en PHP para rastrear el guardado
- Usar `console.log()` en JavaScript para rastrear la renderización
- Verificar directamente en la base de datos el campo `settings`

## 🔄 Aplicación a Otros Problemas Similares

Esta misma metodología se puede aplicar a otros elementos que no se guarden:

### 1. Identificar el Elemento
- ¿Qué elemento no se guarda? (configuraciones, opciones, etc.)
- ¿Dónde debería aparecer en el admin?

### 2. Rastrear el Flujo
- **Frontend:** ¿Se incluye en `collectFormData()`?
- **AJAX:** ¿Se envía correctamente al servidor?
- **Backend:** ¿Se procesa en `save_form()`?
- **Base de datos:** ¿Se guarda en el campo correcto?
- **Recuperación:** ¿Se incluye en `get_form()`?
- **Renderizado:** ¿Se muestra en el DOM?

### 3. Aplicar Correcciones
- Seguir el mismo patrón de las variables globales
- Añadir logging en cada paso
- Verificar la solución paso a paso

## 📝 Ejemplo de Otros Elementos

Si tuviéramos problemas con "configuraciones avanzadas":

```php
// Backend - save_form()
if (isset($data['advanced_settings']) && is_array($data['advanced_settings'])) {
    $this->save_advanced_settings($form_id, $data['advanced_settings']);
}

// Backend - get_form()
$form->advanced_settings = isset($form->settings['advanced_settings']) 
    ? $form->settings['advanced_settings'] 
    : array();
```

```javascript
// Frontend - collectFormData()
advanced_settings: this.getAdvancedSettings()

// Frontend - renderizar
renderAdvancedSettings() {
    const settings = this.getAdvancedSettings();
    // ... lógica de renderizado
}
```

## ✅ Conclusión

El problema de las variables globales que no se guardaban se debía a una **ruptura en el flujo de datos** entre el frontend y el backend. La solución requirió:

1. **Completar el procesamiento backend** para guardar y recuperar las variables
2. **Completar el renderizado frontend** para mostrar las variables
3. **Añadir logging detallado** para facilitar el debugging futuro

Esta guía puede servir como plantilla para resolver problemas similares con otros elementos del formulario que no se guarden correctamente.
