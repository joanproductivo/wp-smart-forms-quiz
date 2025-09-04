# Solución: Problema con imágenes en opciones de preguntas tipo "image_choice"

## 🔍 Problema Identificado

El problema está en el método `validate_and_structure_options` del archivo `includes/class-sfq-ajax.php`. Este método no está preservando correctamente los datos de imagen (`image`, `image_id`, `image_alt`) cuando procesa las opciones de las preguntas tipo "image_choice".

### Ubicación del problema:
- **Archivo**: `includes/class-sfq-ajax.php`
- **Método**: `validate_and_structure_options` (línea aproximada 1420)
- **Síntoma**: Las imágenes se guardan correctamente pero no se recuperan al recargar el editor

## 🛠️ Solución

### 1. Reemplazar el método `validate_and_structure_options`

Buscar este método en `includes/class-sfq-ajax.php` y reemplazarlo completamente:

```php
/**
 * Validar y estructurar opciones de pregunta
 * ✅ CORREGIDO: Preservar datos de imagen para preguntas image_choice
 */
private function validate_and_structure_options($options) {
    if (!is_array($options)) {
        return [];
    }
    
    $structured_options = [];
    
    foreach ($options as $option) {
        if (is_string($option)) {
            // Opción simple como string
            $structured_options[] = [
                'text' => $option,
                'value' => $option,
                'image' => '',
                'image_id' => '',
                'image_alt' => ''
            ];
        } elseif (is_array($option) || is_object($option)) {
            $option = (array) $option;
            
            // ✅ CRÍTICO: Preservar TODOS los datos de imagen
            $structured_option = [
                'text' => $option['text'] ?? $option['value'] ?? '',
                'value' => $option['value'] ?? $option['text'] ?? '',
                'image' => $option['image'] ?? '',
                'image_id' => $option['image_id'] ?? '',
                'image_alt' => $option['image_alt'] ?? ''
            ];
            
            $structured_options[] = $structured_option;
        }
    }
    
    // Filtrar opciones vacías (pero mantener las que tienen imagen aunque no tengan texto)
    $structured_options = array_filter($structured_options, function($option) {
        return !empty(trim($option['text'])) || !empty(trim($option['image']));
    });
    
    return array_values($structured_options); // Reindexar array
}
```

### 2. Verificar el método en `class-sfq-utils.php`

También asegurarse de que el método `process_question_options` en `includes/class-sfq-utils.php` preserve los datos de imagen:

```php
/**
 * Procesar opciones de pregunta
 * ✅ CORREGIDO: Preservar datos de imagen
 */
public static function process_question_options($options) {
    if (!is_array($options)) {
        return [];
    }
    
    $processed_options = [];
    
    foreach ($options as $option) {
        if (is_string($option)) {
            $processed_options[] = [
                'text' => $option,
                'value' => $option,
                'image' => '',
                'image_id' => '',
                'image_alt' => ''
            ];
        } elseif (is_array($option) || is_object($option)) {
            $option = (array) $option;
            
            $processed_option = [
                'text' => $option['text'] ?? '',
                'value' => $option['value'] ?? $option['text'] ?? ''
            ];
            
            // ✅ CRÍTICO: Preservar datos de imagen
            if (isset($option['image'])) {
                $processed_option['image'] = $option['image'];
            }
            if (isset($option['image_id'])) {
                $processed_option['image_id'] = $option['image_id'];
            }
            if (isset($option['image_alt'])) {
                $processed_option['image_alt'] = $option['image_alt'];
            }
            
            $processed_options[] = $processed_option;
        }
    }
    
    return $processed_options;
}
```

### 3. Verificar la estructura de la base de datos

Asegurarse de que las opciones se guarden correctamente en la base de datos. El campo `options` en la tabla `sfq_questions` debe ser un JSON que contenga la estructura completa:

```json
[
    {
        "text": "Opción 1",
        "value": "opcion_1",
        "image": "https://ejemplo.com/imagen1.jpg",
        "image_id": "123",
        "image_alt": "Descripción de imagen 1"
    },
    {
        "text": "Opción 2", 
        "value": "opcion_2",
        "image": "https://ejemplo.com/imagen2.jpg",
        "image_id": "124",
        "image_alt": "Descripción de imagen 2"
    }
]
```

## 🧪 Cómo probar la solución

1. **Crear una pregunta tipo "image_choice"**
2. **Añadir opciones con imágenes** usando el botón "Subir Imagen" o pegando URLs
3. **Guardar el formulario**
4. **Recargar la página del editor**
5. **Verificar que las imágenes aparecen correctamente** en las opciones

## 🔧 Debugging adicional

Si el problema persiste, añadir estos logs temporales en el método `get_form_data`:

```php
// En el método get_form_data, después de cargar el formulario
error_log('SFQ Debug: Form questions loaded: ' . json_encode($form->questions));

// Específicamente para preguntas image_choice
foreach ($form->questions as $question) {
    if ($question->question_type === 'image_choice') {
        error_log('SFQ Debug: Image choice question options: ' . json_encode($question->options));
    }
}
```

## 📝 Resumen del problema

El método `validate_and_structure_options` estaba creando opciones con solo `text` y `value`, perdiendo los campos `image`, `image_id` e `image_alt` que son esenciales para las preguntas de tipo "image_choice". La solución preserva estos campos durante el procesamiento de datos.

## ✅ Resultado esperado

Después de aplicar esta solución:
- Las imágenes se guardarán correctamente en la base de datos
- Las imágenes se cargarán correctamente al recargar el editor
- Los campos `<input type="url" class="sfq-image-url-input">` tendrán sus valores correctos
- Las previsualizaciones de imagen aparecerán automáticamente
