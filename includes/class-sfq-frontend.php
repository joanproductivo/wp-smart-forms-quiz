<?php
/**
 * Renderizado del frontend
 */

if (!defined('ABSPATH')) {
    exit;
}

class SFQ_Frontend {
    
    private $database;
    
    public function __construct() {
        $this->database = new SFQ_Database();
    }
    
    public function init() {
        // Hooks para el frontend
        add_action('wp_head', array($this, 'add_custom_styles'));
    }
    
    /**
     * Renderizar formulario
     */
    public function render_form($form_id) {
        $form = $this->database->get_form($form_id);
        
        if (!$form) {
            return '<p>' . __('Formulario no encontrado', 'smart-forms-quiz') . '</p>';
        }
        
        // Generar ID de sesión único
        $session_id = 'sfq_' . uniqid();
        
        // Registrar vista
        $this->database->register_view($form_id, $session_id);
        
        // Obtener configuración de estilos
        $styles = $form->style_settings ?: array();
        $settings = $form->settings ?: array();
        
        ob_start();
        ?>
        <div class="sfq-form-container" 
             id="sfq-form-<?php echo $form_id; ?>" 
             data-form-id="<?php echo $form_id; ?>"
             data-session-id="<?php echo $session_id; ?>"
             data-settings='<?php echo json_encode($settings); ?>'>
            
            <!-- Barra de progreso -->
            <?php if (!empty($settings['show_progress_bar'])) : ?>
                <div class="sfq-progress-bar">
                    <div class="sfq-progress-fill" style="width: 0%"></div>
                </div>
            <?php endif; ?>
            
            <!-- Pantalla de introducción -->
            <?php 
            $show_intro = isset($settings['show_intro_screen']) ? $settings['show_intro_screen'] : true;
            if ($show_intro && (!empty($form->intro_title) || !empty($form->intro_description))) : ?>
                <div class="sfq-screen sfq-intro-screen active">
                    <div class="sfq-intro-content">
                        <?php if (!empty($form->intro_title)) : ?>
                            <h2 class="sfq-intro-title"><?php echo esc_html($form->intro_title); ?></h2>
                        <?php endif; ?>
                        
                        <?php if (!empty($form->intro_description)) : ?>
                            <p class="sfq-intro-description"><?php echo esc_html($form->intro_description); ?></p>
                        <?php endif; ?>
                        
                        <button class="sfq-button sfq-button-primary sfq-start-button">
                            <?php echo esc_html($form->intro_button_text ?: __('Comenzar', 'smart-forms-quiz')); ?>
                        </button>
                    </div>
                </div>
            <?php endif; ?>
            
            <!-- Preguntas -->
            <?php if (!empty($form->questions)) : ?>
                <?php foreach ($form->questions as $index => $question) : ?>
                    <?php 
                    // Determinar si esta pregunta debe estar activa inicialmente
                    $is_first_screen = false;
                    if (!$show_intro || (empty($form->intro_title) && empty($form->intro_description))) {
                        $is_first_screen = ($index === 0);
                    }
                    ?>
                    <?php 
                    // Obtener configuración de mostrar botón siguiente
                    $question_settings = $question->settings ?? array();
                    $show_next_button = isset($question_settings['show_next_button']) ? $question_settings['show_next_button'] : true;
                    $next_button_text = isset($question_settings['next_button_text']) ? $question_settings['next_button_text'] : '';
                    ?>
                    <div class="sfq-screen sfq-question-screen <?php echo $is_first_screen ? 'active' : ''; ?>" 
                         data-question-id="<?php echo $question->id; ?>"
                         data-question-index="<?php echo $index; ?>"
                         data-question-type="<?php echo esc_attr($question->question_type); ?>"
                         data-show-next-button="<?php echo $show_next_button ? 'true' : 'false'; ?>"
                         data-next-button-text="<?php echo esc_attr($next_button_text); ?>">
                        
                        <div class="sfq-question-content">
                            <!-- Número de pregunta -->
                            <div class="sfq-question-number">
                                <?php echo sprintf(__('Pregunta %d de %d', 'smart-forms-quiz'), $index + 1, count($form->questions)); ?>
                            </div>
                            
                            <!-- Texto de la pregunta -->
                            <h3 class="sfq-question-text">
                                <?php echo esc_html($question->question_text); ?>
                                <?php if ($question->required) : ?>
                                    <span class="sfq-required">*</span>
                                <?php endif; ?>
                            </h3>
                            
                            <!-- Renderizar según el tipo de pregunta -->
                            <div class="sfq-answer-container">
                                <?php $this->render_question_type($question); ?>
                            </div>
                            
                            <!-- Botones de navegación -->
                            <div class="sfq-navigation">
                                <?php if ($index > 0 && !empty($settings['allow_back'])) : ?>
                                    <button class="sfq-button sfq-button-secondary sfq-prev-button">
                                        <?php _e('Anterior', 'smart-forms-quiz'); ?>
                                    </button>
                                <?php endif; ?>
                                
                                <?php 
                                // Determinar si mostrar el botón "Siguiente" basado en la configuración de la pregunta
                                $should_show_next = true;
                                
                                // Si la pregunta tiene configuración específica, respetarla
                                if (isset($question_settings['show_next_button'])) {
                                    $should_show_next = $question_settings['show_next_button'];
                                } else {
                                    // Lógica por defecto: mostrar siempre para opciones múltiples, texto y email
                                    // Solo ocultar para opciones únicas, rating e imágenes cuando auto-advance está habilitado
                                    $auto_advance_types = array('single_choice', 'rating', 'image_choice');
                                    $should_show_next = !($settings['auto_advance'] && in_array($question->question_type, $auto_advance_types));
                                }
                                
                                if ($should_show_next) : 
                                    // Determinar el texto del botón
                                    $button_text = '';
                                    if (!empty($next_button_text)) {
                                        $button_text = $next_button_text;
                                    } else {
                                        $button_text = ($index === count($form->questions) - 1) ? __('Finalizar', 'smart-forms-quiz') : __('Siguiente', 'smart-forms-quiz');
                                    }
                                ?>
                                    <button class="sfq-button sfq-button-primary sfq-next-button">
                                        <?php echo esc_html($button_text); ?>
                                    </button>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            <?php endif; ?>
            
            <!-- Pantalla de agradecimiento -->
            <div class="sfq-screen sfq-thank-you-screen">
                <div class="sfq-thank-you-content">
                    <div class="sfq-success-icon">
                        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                            <circle cx="40" cy="40" r="38" stroke="currentColor" stroke-width="4"/>
                            <path d="M25 40L35 50L55 30" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    
                    <?php if (!empty($form->thank_you_message)) : ?>
                        <div class="sfq-thank-you-message">
                            <?php echo wp_kses_post($form->thank_you_message); ?>
                        </div>
                    <?php else : ?>
                        <h2><?php _e('¡Gracias por completar el formulario!', 'smart-forms-quiz'); ?></h2>
                        <p><?php _e('Tu respuesta ha sido registrada correctamente.', 'smart-forms-quiz'); ?></p>
                    <?php endif; ?>
                    
                    <?php if (!empty($form->redirect_url)) : ?>
                        <p class="sfq-redirect-message">
                            <?php _e('Serás redirigido en unos segundos...', 'smart-forms-quiz'); ?>
                        </p>
                    <?php endif; ?>
                </div>
            </div>
            
            <!-- Variables ocultas para lógica condicional -->
            <input type="hidden" id="sfq-variables-<?php echo $form_id; ?>" value="{}">
            <input type="hidden" id="sfq-redirect-url-<?php echo $form_id; ?>" value="<?php echo esc_attr($form->redirect_url); ?>">
        </div>
        
        <!-- Estilos personalizados -->
        <?php if (!empty($styles)) : ?>
            <style>
                #sfq-form-<?php echo $form_id; ?> {
                    --sfq-primary-color: <?php echo esc_attr($styles['primary_color'] ?? '#007cba'); ?>;
                    --sfq-secondary-color: <?php echo esc_attr($styles['secondary_color'] ?? '#6c757d'); ?>;
                    --sfq-background-color: <?php echo esc_attr($styles['background_color'] ?? '#ffffff'); ?>;
                    --sfq-text-color: <?php echo esc_attr($styles['text_color'] ?? '#333333'); ?>;
                    --sfq-border-radius: <?php echo esc_attr($styles['border_radius'] ?? '12'); ?>px;
                    --sfq-font-family: <?php echo esc_attr($styles['font_family'] ?? 'system-ui, -apple-system, sans-serif'); ?>;
                }
            </style>
        <?php endif; ?>
        
        <?php
        return ob_get_clean();
    }
    
    /**
     * Renderizar tipo de pregunta específico
     */
    private function render_question_type($question) {
        switch ($question->question_type) {
            case 'single_choice':
                $this->render_single_choice($question);
                break;
                
            case 'multiple_choice':
                $this->render_multiple_choice($question);
                break;
                
            case 'text':
                $this->render_text_input($question);
                break;
                
            case 'email':
                $this->render_email_input($question);
                break;
                
            case 'rating':
                $this->render_rating($question);
                break;
                
            case 'image_choice':
                $this->render_image_choice($question);
                break;
                
            default:
                echo '<p>' . __('Tipo de pregunta no soportado', 'smart-forms-quiz') . '</p>';
        }
    }
    
    /**
     * Renderizar opción única (cards modernas)
     */
    private function render_single_choice($question) {
        if (empty($question->options)) {
            return;
        }
        ?>
        <div class="sfq-options-grid sfq-single-choice" data-question-id="<?php echo $question->id; ?>">
            <?php foreach ($question->options as $index => $option) : ?>
                <div class="sfq-option-card" 
                     data-value="<?php echo esc_attr($option['value'] ?? $option['text']); ?>"
                     data-conditions='<?php echo json_encode($option['conditions'] ?? array()); ?>'>
                    
                    <?php if (!empty($option['icon'])) : ?>
                        <span class="sfq-option-icon"><?php echo esc_html($option['icon']); ?></span>
                    <?php endif; ?>
                    
                    <span class="sfq-option-text"><?php echo esc_html($option['text']); ?></span>
                    
                    <input type="radio" 
                           name="question_<?php echo $question->id; ?>" 
                           value="<?php echo esc_attr($option['value'] ?? $option['text']); ?>"
                           class="sfq-hidden-input">
                </div>
            <?php endforeach; ?>
        </div>
        <?php
    }
    
    /**
     * Renderizar opción múltiple
     */
    private function render_multiple_choice($question) {
        if (empty($question->options)) {
            return;
        }
        ?>
        <div class="sfq-options-grid sfq-multiple-choice" data-question-id="<?php echo $question->id; ?>">
            <?php foreach ($question->options as $index => $option) : ?>
                <div class="sfq-option-card sfq-checkbox-card" 
                     data-value="<?php echo esc_attr($option['value'] ?? $option['text']); ?>">
                    
                    <div class="sfq-checkbox-wrapper">
                        <input type="checkbox" 
                               name="question_<?php echo $question->id; ?>[]" 
                               value="<?php echo esc_attr($option['value'] ?? $option['text']); ?>"
                               id="option_<?php echo $question->id; ?>_<?php echo $index; ?>"
                               class="sfq-checkbox-input">
                        
                        <label for="option_<?php echo $question->id; ?>_<?php echo $index; ?>">
                            <span class="sfq-checkbox-box">
                                <svg class="sfq-checkbox-icon" viewBox="0 0 24 24">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                                </svg>
                            </span>
                            <span class="sfq-option-text"><?php echo esc_html($option['text']); ?></span>
                        </label>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
        <?php
    }
    
    /**
     * Renderizar campo de texto
     */
    private function render_text_input($question) {
        $settings = $question->settings ?: array();
        ?>
        <div class="sfq-input-wrapper">
            <input type="text" 
                   name="question_<?php echo $question->id; ?>" 
                   class="sfq-text-input"
                   placeholder="<?php echo esc_attr($settings['placeholder'] ?? __('Escribe tu respuesta aquí...', 'smart-forms-quiz')); ?>"
                   <?php echo $question->required ? 'required' : ''; ?>>
            <div class="sfq-input-line"></div>
        </div>
        <?php
    }
    
    /**
     * Renderizar campo de email
     */
    private function render_email_input($question) {
        $settings = $question->settings ?: array();
        ?>
        <div class="sfq-input-wrapper">
            <input type="email" 
                   name="question_<?php echo $question->id; ?>" 
                   class="sfq-text-input sfq-email-input"
                   placeholder="<?php echo esc_attr($settings['placeholder'] ?? 'tu@email.com'); ?>"
                   <?php echo $question->required ? 'required' : ''; ?>>
            <div class="sfq-input-line"></div>
            <span class="sfq-input-error"><?php _e('Por favor, introduce un email válido', 'smart-forms-quiz'); ?></span>
        </div>
        <?php
    }
    
    /**
     * Renderizar valoración (estrellas/emojis)
     */
    private function render_rating($question) {
        $settings = $question->settings ?: array();
        $type = $settings['rating_type'] ?? 'stars';
        $max = $settings['max_rating'] ?? 5;
        ?>
        <div class="sfq-rating-wrapper" data-question-id="<?php echo $question->id; ?>" data-type="<?php echo $type; ?>">
            <?php if ($type === 'stars') : ?>
                <div class="sfq-stars-rating">
                    <?php for ($i = 1; $i <= $max; $i++) : ?>
                        <button class="sfq-star" data-value="<?php echo $i; ?>" type="button">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                        </button>
                    <?php endfor; ?>
                    <input type="hidden" name="question_<?php echo $question->id; ?>" value="">
                </div>
            <?php else : ?>
                <div class="sfq-emoji-rating">
                    <button class="sfq-emoji" data-value="1" type="button">😞</button>
                    <button class="sfq-emoji" data-value="2" type="button">😐</button>
                    <button class="sfq-emoji" data-value="3" type="button">🙂</button>
                    <button class="sfq-emoji" data-value="4" type="button">😊</button>
                    <button class="sfq-emoji" data-value="5" type="button">😍</button>
                    <input type="hidden" name="question_<?php echo $question->id; ?>" value="">
                </div>
            <?php endif; ?>
        </div>
        <?php
    }
    
    /**
     * Renderizar selección de imagen
     */
    private function render_image_choice($question) {
        if (empty($question->options)) {
            return;
        }
        ?>
        <div class="sfq-image-grid" data-question-id="<?php echo $question->id; ?>">
            <?php foreach ($question->options as $index => $option) : ?>
                <div class="sfq-image-option" 
                     data-value="<?php echo esc_attr($option['value'] ?? $option['text']); ?>">
                    
                    <?php if (!empty($option['image'])) : ?>
                        <img src="<?php echo esc_url($option['image']); ?>" 
                             alt="<?php echo esc_attr($option['text']); ?>">
                    <?php else : ?>
                        <div class="sfq-image-placeholder">
                            <span class="dashicons dashicons-format-image"></span>
                        </div>
                    <?php endif; ?>
                    
                    <?php if (!empty($option['text'])) : ?>
                        <span class="sfq-image-label"><?php echo esc_html($option['text']); ?></span>
                    <?php endif; ?>
                    
                    <input type="radio" 
                           name="question_<?php echo $question->id; ?>" 
                           value="<?php echo esc_attr($option['value'] ?? $option['text']); ?>"
                           class="sfq-hidden-input">
                    
                    <div class="sfq-image-overlay">
                        <svg class="sfq-check-icon" viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                        </svg>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
        <?php
    }
    
    /**
     * Añadir estilos personalizados en el head
     */
    public function add_custom_styles() {
        // Los estilos personalizados se añaden inline con cada formulario
    }
}
