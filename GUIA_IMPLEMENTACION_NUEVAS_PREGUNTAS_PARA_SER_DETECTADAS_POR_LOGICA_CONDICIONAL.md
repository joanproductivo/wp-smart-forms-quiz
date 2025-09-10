# Guía para Implementar Lógica Condicional en Nuevos Elementos/Preguntas

Esta guía explica el proceso para integrar la lógica condicional en nuevos tipos de preguntas o elementos dentro del sistema Smart Forms & Quiz. La clave para que el motor de lógica condicional (`ConditionalLogicEngine` en `assets/js/frontend.js`) funcione es asegurarse de que los elementos interactivos en el frontend tengan el atributo `data-conditions` con las reglas configuradas.

## Entendiendo el Problema

El motor de lógica condicional en el frontend (`frontend.js`) necesita saber qué condiciones se aplican a un elemento específico cuando un usuario interactúa con él (por ejemplo, al hacer clic en una opción, seleccionar una estrella, etc.). Esta información se espera que esté presente en el HTML del elemento a través del atributo `data-conditions`. Si este atributo está ausente o vacío, el motor no tendrá reglas que evaluar, aunque el valor de la respuesta se capture correctamente.

## Proceso General para Implementar Lógica Condicional

Para cualquier nuevo tipo de pregunta o elemento interactivo que desees que dispare lógica condicional, debes seguir estos pasos en el archivo PHP que renderiza el HTML del frontend (generalmente `includes/class-sfq-frontend.php`):

1.  **Identificar el método de renderizado:** Localiza el método `private function render_your_new_question_type($question)` (o similar) que es responsable de generar el HTML para tu nuevo tipo de pregunta o elemento.

2.  **Obtener todas las condiciones de la pregunta:** Al inicio de este método, recupera todas las condiciones que se han configurado para la pregunta actual desde la base de datos. Esto se hace utilizando el método auxiliar `get_question_conditions_for_frontend()`:

    ```php
    // Obtener todas las condiciones de la pregunta
    $question_conditions = $this->get_question_conditions_for_frontend($question->id);
    ```

3.  **Iterar sobre los elementos interactivos:** Dentro de tu bucle que genera las opciones o sub-elementos interactivos (por ejemplo, cada botón de opción, cada estrella de calificación, etc.), necesitarás:

    a.  **Obtener el valor de la opción/elemento:** Asegúrate de que cada elemento interactivo tenga un `data-value` que represente su respuesta. Este valor será crucial para filtrar las condiciones.

    b.  **Filtrar condiciones específicas para el valor:** Utiliza el método auxiliar `get_conditions_for_option_value()` para obtener solo las condiciones que aplican al `data-value` de la opción/elemento actual:

        ```php
        // Suponiendo que $current_option_value es el valor de la opción actual (ej. '1', 'Sí', 'Opción A')
        $option_conditions = $this->get_conditions_for_option_value($question_conditions, $current_option_value);
        ```

4.  **Añadir atributos `data-conditions` al HTML:** Incluye los atributos `data-conditions` y `data-has-conditions` en la etiqueta HTML del elemento interactivo. El valor de `data-conditions` debe ser el JSON codificado de `$option_conditions`.

    ```html
    <div class="your-interactive-element"
         data-value="<?php echo esc_attr($current_option_value); ?>"
         data-conditions='<?php echo json_encode($option_conditions); ?>'
         data-has-conditions="<?php echo !empty($option_conditions) ? 'true' : 'false'; ?>">
        <!-- Contenido del elemento -->
    </div>
    ```
    El atributo `data-has-conditions` es útil para optimizaciones en el frontend, indicando rápidamente si hay condiciones que procesar.

## Ejemplos de Implementación

A continuación, se muestran ejemplos de cómo se ha implementado esto en tipos de preguntas existentes:

### 1. Preguntas de Opción Única (`render_single_choice`)

```php
private function render_single_choice($question) {
    if (empty($question->options)) {
        return;
    }

    // 1. Obtener todas las condiciones de la pregunta
    $question_conditions = $this->get_question_conditions_for_frontend($question->id);

    ?>
    <div class="sfq-options-grid sfq-single-choice" data-question-id="<?php echo $question->id; ?>">
        <?php foreach ($question->options as $index => $option) : ?>
            <?php
            $option_data = is_object($option) ? (array) $option : $option;
            $option_text = $option_data['text'] ?? '';
            $option_value = $option_data['value'] ?? $option_text;

            // 2. Filtrar condiciones que aplican a esta opción específica
            $option_conditions = $this->get_conditions_for_option_value($question_conditions, $option_value);
            ?>
            <div class="sfq-option-card"
                 data-value="<?php echo esc_attr($option_value); ?>"
                 data-conditions='<?php echo json_encode($option_conditions); ?>'
                 data-has-conditions="<?php echo !empty($option_conditions) ? 'true' : 'false'; ?>">
                <!-- Contenido de la opción -->
                <span class="sfq-option-text"><?php echo esc_html($option_text); ?></span>
                <input type="radio" name="question_<?php echo $question->id; ?>" value="<?php echo esc_attr($option_value); ?>" class="sfq-hidden-input">
            </div>
        <?php endforeach; ?>
    </div>
    <?php
}
```

### 2. Preguntas de Selección de Imagen (`render_image_choice`)

El proceso es idéntico al de opción única:

```php
private function render_image_choice($question) {
    if (empty($question->options)) {
        return;
    }

    // 1. Obtener todas las condiciones de la pregunta
    $question_conditions = $this->get_question_conditions_for_frontend($question->id);

    ?>
    <div class="sfq-image-grid" data-question-id="<?php echo $question->id; ?>">
        <?php foreach ($question->options as $index => $option) : ?>
            <?php
            $option_data = is_object($option) ? (array) $option : $option;
            $option_image = $option_data['image'] ?? '';
            $option_text = $option_data['text'] ?? '';
            $option_value = $option_data['value'] ?? $option_text;
            $option_alt = $option_data['image_alt'] ?? $option_text;

            // 2. Filtrar condiciones que aplican a esta opción específica
            $option_conditions = $this->get_conditions_for_option_value($question_conditions, $option_value);
            ?>
            <div class="sfq-image-option"
                 data-value="<?php echo esc_attr($option_value); ?>"
                 data-conditions='<?php echo json_encode($option_conditions); ?>'
                 data-has-conditions="<?php echo !empty($option_conditions) ? 'true' : 'false'; ?>">
                <!-- Contenido de la opción de imagen -->
                <img src="<?php echo esc_url($option_image); ?>" alt="<?php echo esc_attr($option_alt); ?>" loading="lazy">
                <span class="sfq-image-label"><?php echo esc_html($option_text); ?></span>
                <input type="radio" name="question_<?php echo $question->id; ?>" value="<?php echo esc_attr($option_value); ?>" class="sfq-hidden-input">
                <div class="sfq-image-overlay">...</div>
            </div>
        <?php endforeach; ?>
    </div>
    <?php
}
```

### 3. Preguntas de Calificación (Rating) (`render_rating`)

Este es el ejemplo que acabamos de implementar:

```php
private function render_rating($question) {
    $settings = $question->settings ?: array();
    $type = $settings['rating_type'] ?? 'stars';
    $max = $settings['max_rating'] ?? 5;

    // 1. Obtener todas las condiciones de la pregunta
    $question_conditions = $this->get_question_conditions_for_frontend($question->id);
    ?>
    <div class="sfq-rating-wrapper" data-question-id="<?php echo $question->id; ?>" data-type="<?php echo $type; ?>">
        <?php if ($type === 'stars') : ?>
            <div class="sfq-stars-rating">
                <?php for ($i = 1; $i <= $max; $i++) : ?>
                    <?php
                    // 2. Filtrar condiciones para el valor de calificación actual
                    $rating_conditions = $this->get_conditions_for_option_value($question_conditions, (string)$i);
                    ?>
                    <button class="sfq-star"
                            data-value="<?php echo $i; ?>"
                            type="button"
                            data-conditions='<?php echo json_encode($rating_conditions); ?>'
                            data-has-conditions="<?php echo !empty($rating_conditions) ? 'true' : 'false'; ?>">
                        <!-- SVG de la estrella -->
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">...</svg>
                    </button>
                <?php endfor; ?>
                <input type="hidden" name="question_<?php echo $question->id; ?>" value="">
            </div>
        <?php else : // Emojis ?>
            <div class="sfq-emoji-rating">
                <?php
                $default_emojis = array('😞', '😐', '🙂', '😊', '😍');
                for ($i = 1; $i <= $max; $i++) :
                    $emoji = $settings['icons'][$i-1] ?? $default_emojis[$i-1] ?? '⭐';
                    // 2. Filtrar condiciones para el valor de calificación actual
                    $rating_conditions = $this->get_conditions_for_option_value($question_conditions, (string)$i);
                ?>
                    <button class="sfq-emoji"
                            data-value="<?php echo $i; ?>"
                            type="button"
                            data-conditions='<?php echo json_encode($rating_conditions); ?>'
                            data-has-conditions="<?php echo !empty($rating_conditions) ? 'true' : 'false'; ?>"><?php echo $emoji; ?></button>
                <?php endfor; ?>
                <input type="hidden" name="question_<?php echo $question->id; ?>" value="">
            </div>
        <?php endif; ?>
    </div>
    <?php
}
```

## Métodos Auxiliares Clave

*   **`get_question_conditions_for_frontend($question_id)`:**
    Este método (definido en `includes/class-sfq-frontend.php`) consulta la base de datos para obtener todas las condiciones asociadas a una `question_id` específica. Utiliza un caché estático para evitar consultas repetidas.

*   **`get_conditions_for_option_value($all_conditions, $option_value)`:**
    Este método (definido en `includes/class-sfq-frontend.php`) toma un array de todas las condiciones de una pregunta y un `option_value` (el valor de la respuesta de un elemento, como '1', 'Sí', 'Opción A'). Devuelve un sub-array de condiciones que son relevantes para ese `option_value`. Incluye tanto las condiciones que comparan directamente con `answer_equals`, `answer_contains`, `answer_not_equals`, como las condiciones de variables (`variable_greater`, `variable_less`, `variable_equals`) que se evalúan independientemente del valor de la opción.

Siguiendo esta guía, podrás extender la funcionalidad de lógica condicional a cualquier nuevo elemento o tipo de pregunta que implementes en el futuro.
