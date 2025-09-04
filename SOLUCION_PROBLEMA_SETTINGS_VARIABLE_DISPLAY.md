# Solución Completa: Problema de Settings del Elemento "Mostrar Variable"

## 📋 Resumen del Problema

El elemento "Mostrar Variable" de las preguntas de estilo libre tenía un problema crítico donde no se guardaban ni mostraban correctamente las configuraciones (settings) al recargar el editor de formularios. Específicamente:

1. **Variable seleccionada**: No se guardaba ni mostraba la variable seleccionada en `sfq-config-input data-setting="variable_name"`
2. **Opciones de estilo**: No se guardaban ni mostraban opciones como `font_size`, `text_color`, `background_color`, etc.
3. **Valor de preview**: No se mostraba el valor real de la variable en el frontend

## 🔍 Análisis Profundo del Problema

### 1. Problema en el Mapeo de Elementos Freestyle

**Archivo afectado**: `assets/js/admin-builder-v2.js`
**Línea problemática**: 2089

```javascript
// ❌ PROBLEMA: variable_display no estaba mapeado
const freestyleElementsMap = {
    'text': this.createTextConfig,
    'video': this.createVideoConfig,
    'image': this.createImageConfig,
    'countdown': this.createCountdownConfig,
    'phone': this.createPhoneConfig,
    'email': this.createEmailConfig,
    'file_upload': this.createFileUploadConfig,
    'button': this.createButtonConfig,
    'rating': this.createRatingConfig,
    'dropdown': this.createDropdownConfig,
    'checkbox': this.createCheckboxConfig,
    'legal_text': this.createLegalTextConfig
    // ❌ FALTABA: 'variable_display': this.createVariableDisplayConfig
};
```

### 2. Proceso de Guardado de Settings

El proceso de guardado funciona de la siguiente manera:

1. **Captura de datos**: El método `getElementSettings()` recorre todos los inputs con `data-setting`
2. **Mapeo de elementos**: Se usa `freestyleElementsMap` para determinar qué configuración crear
3. **Guardado**: Los settings se almacenan en `element.settings` del objeto pregunta
4. **Persistencia**: Se envía vía AJAX al servidor para guardar en la base de datos

### 3. Proceso de Recuperación y Mostrado

Al recargar el editor:

1. **Carga de datos**: Se obtienen los datos del formulario desde la base de datos
2. **Renderizado**: Se llama a `renderFreestyleElement()` para cada elemento
3. **Configuración**: Se usa el mapeo para crear la configuración específica del elemento
4. **Población**: Se llenan los campos con los valores guardados en `element.settings`

## ✅ Solución Implementada

### 1. Corrección del Mapeo de Elementos

**Archivo**: `assets/js/admin-builder-v2.js`
**Línea**: 2089

```javascript
// ✅ SOLUCIÓN: Añadir variable_display al mapeo
const freestyleElementsMap = {
    'text': this.createTextConfig,
    'video': this.createVideoConfig,
    'image': this.createImageConfig,
    'countdown': this.createCountdownConfig,
    'phone': this.createPhoneConfig,
    'email': this.createEmailConfig,
    'file_upload': this.createFileUploadConfig,
    'button': this.createButtonConfig,
    'rating': this.createRatingConfig,
    'dropdown': this.createDropdownConfig,
    'checkbox': this.createCheckboxConfig,
    'legal_text': this.createLegalTextConfig,
    'variable_display': this.createVariableDisplayConfig  // ✅ AÑADIDO
};
```

### 2. Mejora del Renderizado en Frontend

**Archivo**: `includes/class-sfq-frontend.php`
**Método**: `render_freestyle_variable_display()`

```php
// ✅ NUEVO: Obtener el valor real de la variable desde las variables globales del formulario
$display_value = $preview_value; // Valor por defecto (para admin/preview)

// Intentar obtener el valor real de la variable si estamos en el frontend
if (!is_admin()) {
    // Obtener las variables globales del formulario actual
    $form_id = $this->get_current_form_id($question_id);
    if ($form_id) {
        $form = $this->database->get_form($form_id);
        if ($form && isset($form->global_variables) && is_array($form->global_variables)) {
            // Buscar la variable por nombre
            foreach ($form->global_variables as $global_var) {
                if (isset($global_var['name']) && $global_var['name'] === $variable_name) {
                    $display_value = $global_var['initial_value'] ?? $preview_value;
                    break;
                }
            }
        }
    }
}
```

### 3. Método Auxiliar para Obtener Form ID

**Archivo**: `includes/class-sfq-frontend.php`
**Método**: `get_current_form_id()`

```php
/**
 * ✅ NUEVO: Obtener el ID del formulario actual basado en el ID de pregunta
 */
private function get_current_form_id($question_id) {
    if (empty($question_id)) {
        return null;
    }
    
    // Intentar obtener el form_id desde la base de datos usando el question_id
    global $wpdb;
    $table_name = $wpdb->prefix . 'sfq_forms';
    
    $form_id = $wpdb->get_var($wpdb->prepare(
        "SELECT id FROM {$table_name} WHERE JSON_SEARCH(questions, 'one', %s, NULL, '$[*].id') IS NOT NULL",
        $question_id
    ));
    
    return $form_id ? intval($form_id) : null;
}
```

### 4. Actualización Dinámica de Variables en JavaScript

**Archivo**: `assets/js/frontend.js`
**Método**: `updateVariablesInDOM()`

```javascript
/**
 * ✅ CRÍTICO: Actualizar variables si las hay
 */
updateVariablesInDOM() {
    console.log('SFQ Frontend Debug: Updating variables in DOM:', this.variables);
    
    // Buscar todos los elementos que muestran variables
    const variableElements = this.container.querySelectorAll('.sfq-variable-value[data-variable]');
    
    variableElements.forEach(element => {
        const variableName = element.dataset.variable;
        if (this.variables.hasOwnProperty(variableName)) {
            const newValue = this.variables[variableName];
            console.log(`SFQ Frontend Debug: Updating variable ${variableName} from ${element.textContent} to ${newValue}`);
            
            // ✅ NUEVO: Añadir animación suave al cambio de valor
            if (element.textContent !== newValue.toString()) {
                element.style.transition = 'all 0.3s ease';
                element.style.transform = 'scale(1.1)';
                element.style.opacity = '0.7';
                
                setTimeout(() => {
                    element.textContent = newValue;
                    element.style.transform = 'scale(1)';
                    element.style.opacity = '1';
                }, 150);
            }
        }
    });
}
```

## 🔧 Configuraciones Soportadas

El elemento "Mostrar Variable" ahora soporta correctamente todas estas configuraciones:

### Configuraciones Básicas
- `variable_name`: Nombre de la variable a mostrar
- `preview_value`: Valor de preview para el admin

### Configuraciones de Estilo
- `font_size`: Tamaño de fuente (px)
- `font_weight`: Peso de fuente (normal, bold, etc.)
- `text_align`: Alineación del texto (left, center, right)
- `text_color`: Color del texto
- `background_color`: Color de fondo
- `background_opacity`: Opacidad del fondo
- `border_color`: Color del borde
- `border_radius`: Radio del borde (px)
- `padding`: Espaciado interno
- `text_shadow`: Sombra del texto (boolean)

## 📊 Flujo Completo de Funcionamiento

### 1. Guardado de Settings
```
Usuario configura elemento → 
getElementSettings() captura datos → 
freestyleElementsMap mapea a createVariableDisplayConfig → 
Settings se guardan en element.settings → 
AJAX envía al servidor → 
Base de datos actualizada
```

### 2. Recuperación de Settings
```
Carga del formulario → 
Datos desde base de datos → 
renderFreestyleElement() procesa elemento → 
createVariableDisplayConfig() crea configuración → 
Campos se llenan con element.settings → 
Usuario ve configuración restaurada
```

### 3. Renderizado en Frontend
```
Formulario se renderiza → 
render_freestyle_variable_display() ejecuta → 
get_current_form_id() obtiene form_id → 
Variables globales se consultan → 
Valor real se muestra → 
JavaScript actualiza dinámicamente
```

## 🧪 Verificación de la Solución

### Tests Realizados
1. ✅ Crear elemento "Mostrar Variable"
2. ✅ Configurar variable y opciones de estilo
3. ✅ Guardar formulario
4. ✅ Recargar editor
5. ✅ Verificar que settings se mantienen
6. ✅ Probar en frontend con variables reales
7. ✅ Verificar actualización dinámica de valores

### Logs de Debug Añadidos
```javascript
console.log('SFQ: VARIABLE_DISPLAY ELEMENT DETECTED');
console.log('SFQ: variable_name setting:', element.settings?.variable_name);
console.log('SFQ: All settings for variable_display:', JSON.stringify(element.settings, null, 2));
```

## 🎯 Impacto de la Solución

### Antes de la Corrección
- ❌ Settings no se guardaban
- ❌ Variable seleccionada se perdía
- ❌ Opciones de estilo no persistían
- ❌ Solo mostraba valor de preview

### Después de la Corrección
- ✅ Todos los settings se guardan correctamente
- ✅ Variable seleccionada persiste al recargar
- ✅ Todas las opciones de estilo se mantienen
- ✅ Muestra valor real de la variable en frontend
- ✅ Actualización dinámica con animaciones

## 📝 Archivos Modificados

1. **assets/js/admin-builder-v2.js**
   - Línea 2089: Añadido mapeo de `variable_display`

2. **includes/class-sfq-frontend.php**
   - Método `render_freestyle_variable_display()`: Lógica para valor real
   - Método `get_current_form_id()`: Nuevo método auxiliar

3. **assets/js/frontend.js**
   - Método `updateVariablesInDOM()`: Animaciones suaves
   - Método `initializeGlobalVariables()`: Inicialización mejorada

## 🔮 Funcionalidades Futuras

Esta solución sienta las bases para:
- Variables calculadas dinámicamente
- Fórmulas matemáticas en variables
- Formateo avanzado de valores
- Condiciones basadas en múltiples variables
- Animaciones más complejas en cambios de valor

## 📚 Documentación Relacionada

- [Guía de Implementación de Nuevas Opciones en Formularios](GUIA_IMPLEMENTACION_NUEVAS_OPCIONES_EN_FORMULARIOS.md)
- [Guía de Tipo de Pregunta Estilo Libre](GUIA_TIPO_PREGUNTA_ESTILO_LIBRE.md)
- [Documentación de Lógica Condicional Completa](DOCUMENTACION_LOGICA_CONDICIONAL_COMPLETA.md)

---

**Fecha de Implementación**: 9 de Abril, 2025  
**Estado**: ✅ Completado y Verificado  
**Versión**: 1.0.0
