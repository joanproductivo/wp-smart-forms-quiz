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
        
        // Usar el nuevo sistema de sesiones inteligente
        $session_id = SFQ_Utils::get_or_create_session_id($form_id);
        
        // NUEVA LÓGICA: Verificar bloqueo de formulario PRIMERO
        // Permitir bypass si el timer ya expiró (verificar tanto GET como AJAX/POST)
        $timer_expired_request = $this->is_timer_expired_request($form_id);
        
        $settings = $form->settings ?: array();
        if (isset($settings['block_form']) && $settings['block_form'] && !$timer_expired_request) {
            // Verificar si hay timer configurado
            $styles = $form->style_settings ?: array();
            if (!empty($styles['block_form_enable_timer']) && !empty($styles['block_form_timer_date'])) {
                // Verificar si ya es hora de abrir el formulario con manejo mejorado de zona horaria
                $timer_date = $styles['block_form_timer_date'];
                $timezone = $styles['block_form_timer_timezone'] ?? wp_timezone_string();
                
                // Convertir ambas fechas a UTC para comparación precisa
                $timer_timestamp = $this->convert_to_utc_timestamp($timer_date, $timezone);
                $current_timestamp = time(); // UTC timestamp
                
                if ($current_timestamp >= $timer_timestamp) {
                    // El timer ya expiró - verificar si debe mantener contador visible
                    if (isset($styles['block_form_timer_show_form']) && $styles['block_form_timer_show_form']) {
                        // Verificar si debe ocultar todo completamente
                        if (isset($styles['block_form_timer_hide_all']) && $styles['block_form_timer_hide_all']) {
                            // No renderizar nada - devolver cadena vacía
                            return '';
                        }
                        
                        // Renderizar contador en estado expirado (mantener solo timer visible)
                        $block_check = array(
                            'allowed' => false,
                            'code' => 'FORM_BLOCKED_WITH_TIMER_EXPIRED',
                            'message' => __('Este formulario está temporalmente bloqueado.', 'smart-forms-quiz'),
                            'timer_date' => $timer_date,
                            'timer_timezone' => $timezone,
                            'timer_utc_timestamp' => $timer_timestamp,
                            'timer_text' => $styles['block_form_timer_opened_text'] ?? __('¡El tiempo se agotó!', 'smart-forms-quiz'),
                            'timer_expired' => true,
                            'keep_counter_visible' => true,
                            // Incluir todas las configuraciones del timer para que se renderice correctamente
                            'available_icon' => $styles['block_form_timer_available_icon'] ?? '✅',
                            'available_title' => $styles['block_form_timer_available_title'] ?? __('¡El tiempo se agotó!', 'smart-forms-quiz'),
                            'available_description' => $styles['block_form_timer_available_description'] ?? __('Puedes acceder al formulario ahora.', 'smart-forms-quiz'),
                            'available_button_text' => $styles['block_form_timer_available_button_text'] ?? __('Acceder al formulario', 'smart-forms-quiz'),
                            'available_button_url' => $styles['block_form_timer_available_button_url'] ?? '',
                            'available_bg_color' => $styles['block_form_timer_available_bg_color'] ?? '#f8f9fa',
                            'available_border_color' => $styles['block_form_timer_available_border_color'] ?? '#e9ecef',
                            'available_icon_color' => $styles['block_form_timer_available_icon_color'] ?? '#28a745',
                            'available_title_color' => $styles['block_form_timer_available_title_color'] ?? '#28a745',
                            'available_text_color' => $styles['block_form_timer_available_text_color'] ?? '#666666',
                            'available_button_bg_color' => $styles['block_form_timer_available_button_bg_color'] ?? '#28a745',
                            'available_button_text_color' => $styles['block_form_timer_available_button_text_color'] ?? '#ffffff'
                        );
                        return $this->render_limit_message($form_id, $block_check, $styles);
                    }
                    // Si no debe mantener contador, continuar con renderizado normal del formulario
                } else {
                    // El timer aún no ha expirado - mostrar mensaje con timer
                    $block_check = array(
                        'allowed' => false,
                        'code' => 'FORM_BLOCKED_WITH_TIMER',
                        'message' => __('Este formulario está temporalmente bloqueado.', 'smart-forms-quiz'),
                        'timer_date' => $timer_date,
                        'timer_timezone' => $timezone,
                        'timer_utc_timestamp' => $timer_timestamp,
                        'timer_text' => $styles['block_form_timer_text'] ?? __('El formulario se abrirá en:', 'smart-forms-quiz'),
                        'available_icon' => $styles['block_form_timer_available_icon'] ?? '✅',
                        'available_title' => $styles['block_form_timer_available_title'] ?? __('¡El tiempo se agotó!', 'smart-forms-quiz'),
                        'available_description' => $styles['block_form_timer_available_description'] ?? __('Puedes acceder al formulario ahora.', 'smart-forms-quiz'),
                        'available_button_text' => $styles['block_form_timer_available_button_text'] ?? __('Acceder al formulario', 'smart-forms-quiz'),
                        'available_button_url' => $styles['block_form_timer_available_button_url'] ?? '',
                        'available_bg_color' => $styles['block_form_timer_available_bg_color'] ?? '#f8f9fa',
                        'available_border_color' => $styles['block_form_timer_available_border_color'] ?? '#e9ecef',
                        'available_icon_color' => $styles['block_form_timer_available_icon_color'] ?? '#28a745',
                        'available_title_color' => $styles['block_form_timer_available_title_color'] ?? '#28a745',
                        'available_text_color' => $styles['block_form_timer_available_text_color'] ?? '#666666',
                        'available_button_bg_color' => $styles['block_form_timer_available_button_bg_color'] ?? '#28a745',
                        'available_button_text_color' => $styles['block_form_timer_available_button_text_color'] ?? '#ffffff'
                    );
                    return $this->render_limit_message($form_id, $block_check, $styles);
                }
            } else {
                // Formulario bloqueado sin timer - bloquear siempre
                $block_check = array(
                    'allowed' => false,
                    'code' => 'FORM_BLOCKED',
                    'message' => __('Este formulario está temporalmente bloqueado.', 'smart-forms-quiz')
                );
                return $this->render_limit_message($form_id, $block_check, $form->style_settings ?: array());
            }
        }
        
        // Verificar límites automáticos después del bloqueo manual
        $limits_checker = new SFQ_Limits();
        $limit_check = $limits_checker->check_submission_limits($form_id, $session_id);
        
        // Si hay límites activos, mostrar mensaje en lugar del formulario
        if (!$limit_check['allowed']) {
            return $this->render_limit_message($form_id, $limit_check, $form->style_settings ?: array());
        }
        
        // Nota: La vista se registra desde JavaScript para evitar duplicados
        // $this->database->register_view($form_id, $session_id);
        
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
                            <?php if (!empty($settings['show_question_numbers'])) : ?>
                                <div class="sfq-question-number">
                                    <?php echo sprintf(__('Pregunta %d de %d', 'smart-forms-quiz'), $index + 1, count($form->questions)); ?>
                                </div>
                            <?php endif; ?>
                            
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
                
            case 'freestyle':
                $this->render_freestyle_question($question);
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
     * Renderizar mensaje de límite cuando el formulario no está disponible
     */
    private function render_limit_message($form_id, $limit_check, $styles = array()) {
        // Determinar el tipo de límite y el icono apropiado
        $limit_type = $limit_check['code'] ?? 'LIMIT_EXCEEDED';
        $message = $limit_check['message'] ?? __('Este formulario no está disponible en este momento.', 'smart-forms-quiz');
        
        // Iconos por defecto según el tipo de límite
        $default_icons = array(
            'SUBMISSION_LIMIT_EXCEEDED' => '<svg width="80" height="80" viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="38" stroke="currentColor" stroke-width="4"/><path d="M25 25L55 55M55 25L25 55" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>',
            'MAX_SUBMISSIONS_REACHED' => '<svg width="80" height="80" viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="38" stroke="currentColor" stroke-width="4"/><path d="M40 20V40M40 52H40.02" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>',
            'SCHEDULE_NOT_STARTED' => '<svg width="80" height="80" viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="38" stroke="currentColor" stroke-width="4"/><path d="M40 20V40L52 52" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>',
            'SCHEDULE_ENDED' => '<svg width="80" height="80" viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="38" stroke="currentColor" stroke-width="4"/><path d="M40 20V40L52 52" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>',
            'LOGIN_REQUIRED' => '<svg width="80" height="80" viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="38" stroke="currentColor" stroke-width="4"/><path d="M40 20C48.28 20 55 26.72 55 35V45C55 53.28 48.28 60 40 60C31.72 60 25 53.28 25 45V35C25 26.72 31.72 20 40 20Z" stroke="currentColor" stroke-width="4"/><path d="M40 35V45" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>'
        );
        
        // Títulos por defecto según el tipo de límite
        $default_titles = array(
            'SUBMISSION_LIMIT_EXCEEDED' => __('Límite de envíos alcanzado', 'smart-forms-quiz'),
            'MAX_SUBMISSIONS_REACHED' => __('Formulario completo', 'smart-forms-quiz'),
            'SCHEDULE_NOT_STARTED' => __('Formulario no disponible aún', 'smart-forms-quiz'),
            'SCHEDULE_ENDED' => __('Formulario cerrado', 'smart-forms-quiz'),
            'LOGIN_REQUIRED' => __('Inicio de sesión requerido', 'smart-forms-quiz'),
            'FORM_BLOCKED' => __('Formulario temporalmente bloqueado', 'smart-forms-quiz')
        );
        
        // Usar configuraciones personalizadas si están disponibles
        $icon = '';
        $title = '';
        $custom_message = '';
        $button_text = '';
        $button_url = '';
        
        switch ($limit_type) {
            case 'SUBMISSION_LIMIT_EXCEEDED':
                $icon = !empty($styles['limit_submission_icon']) ? $this->process_icon_content($styles['limit_submission_icon']) : $default_icons[$limit_type];
                $title = !empty($styles['limit_submission_title']) ? $styles['limit_submission_title'] : $default_titles[$limit_type];
                $custom_message = !empty($styles['limit_submission_description']) ? $styles['limit_submission_description'] : $message;
                $button_text = $styles['limit_submission_button_text'] ?? '';
                $button_url = $styles['limit_submission_button_url'] ?? '';
                break;
                
            case 'MAX_SUBMISSIONS_REACHED':
                $icon = !empty($styles['limit_participants_icon']) ? $this->process_icon_content($styles['limit_participants_icon']) : $default_icons[$limit_type];
                $title = !empty($styles['limit_participants_title']) ? $styles['limit_participants_title'] : $default_titles[$limit_type];
                $custom_message = !empty($styles['limit_participants_description']) ? $styles['limit_participants_description'] : $message;
                $button_text = $styles['limit_participants_button_text'] ?? '';
                $button_url = $styles['limit_participants_button_url'] ?? '';
                break;
                
            case 'LOGIN_REQUIRED':
                $icon = !empty($styles['limit_login_icon']) ? $this->process_icon_content($styles['limit_login_icon']) : $default_icons[$limit_type];
                $title = !empty($styles['limit_login_title']) ? $styles['limit_login_title'] : $default_titles[$limit_type];
                $custom_message = !empty($styles['limit_login_description']) ? $styles['limit_login_description'] : $message;
                $button_text = !empty($styles['limit_login_button_text']) ? $styles['limit_login_button_text'] : __('Iniciar Sesión', 'smart-forms-quiz');
                $button_url = wp_login_url(get_permalink());
                break;
                
            case 'SCHEDULE_NOT_STARTED':
                $icon = !empty($styles['limit_schedule_icon']) ? $this->process_icon_content($styles['limit_schedule_icon']) : $default_icons[$limit_type];
                $title = !empty($styles['limit_schedule_not_started_title']) ? $styles['limit_schedule_not_started_title'] : $default_titles[$limit_type];
                $custom_message = $message; // Usar el mensaje del sistema de programación
                $button_text = $styles['limit_schedule_button_text'] ?? '';
                $button_url = $styles['limit_schedule_button_url'] ?? '';
                break;
                
            case 'SCHEDULE_ENDED':
                $icon = !empty($styles['limit_schedule_icon']) ? $this->process_icon_content($styles['limit_schedule_icon']) : $default_icons[$limit_type];
                $title = !empty($styles['limit_schedule_ended_title']) ? $styles['limit_schedule_ended_title'] : $default_titles[$limit_type];
                $custom_message = $message; // Usar el mensaje del sistema de programación
                $button_text = $styles['limit_schedule_button_text'] ?? '';
                $button_url = $styles['limit_schedule_button_url'] ?? '';
                break;
                
            case 'FORM_BLOCKED':
                $icon = !empty($styles['block_form_icon']) ? $this->process_icon_content($styles['block_form_icon']) : '<svg width="80" height="80" viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="38" stroke="currentColor" stroke-width="4"/><path d="M25 25L55 55M55 25L25 55" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>';
                $title = !empty($styles['block_form_title']) ? $styles['block_form_title'] : $default_titles[$limit_type];
                $custom_message = !empty($styles['block_form_description']) ? $styles['block_form_description'] : $message;
                $button_text = $styles['block_form_button_text'] ?? '';
                $button_url = $styles['block_form_button_url'] ?? '';
                
                // Usar colores específicos de bloqueo si están disponibles
                $use_block_colors = true;
                break;
                
            case 'FORM_BLOCKED_WITH_TIMER':
                $icon = !empty($styles['block_form_icon']) ? $this->process_icon_content($styles['block_form_icon']) : '<svg width="80" height="80" viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="38" stroke="currentColor" stroke-width="4"/><path d="M40 20V40L52 52" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>';
                $title = !empty($styles['block_form_title']) ? $styles['block_form_title'] : __('Formulario temporalmente bloqueado', 'smart-forms-quiz');
                $custom_message = !empty($styles['block_form_description']) ? $styles['block_form_description'] : $message;
                $button_text = $styles['block_form_button_text'] ?? '';
                $button_url = $styles['block_form_button_url'] ?? '';
                
                // Usar colores específicos de bloqueo si están disponibles
                $use_block_colors = true;
                break;
                
            case 'FORM_BLOCKED_WITH_TIMER_EXPIRED':
                $icon = !empty($styles['block_form_icon']) ? $this->process_icon_content($styles['block_form_icon']) : '<svg width="80" height="80" viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="38" stroke="currentColor" stroke-width="4"/><path d="M40 20V40L52 52" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>';
                $title = !empty($styles['block_form_title']) ? $styles['block_form_title'] : __('Formulario temporalmente bloqueado', 'smart-forms-quiz');
                $custom_message = !empty($styles['block_form_description']) ? $styles['block_form_description'] : $message;
                $button_text = $styles['block_form_button_text'] ?? '';
                $button_url = $styles['block_form_button_url'] ?? '';
                
                // Usar colores específicos de bloqueo si están disponibles
                $use_block_colors = true;
                break;
                
            default:
                $icon = $default_icons['SUBMISSION_LIMIT_EXCEEDED'];
                $title = $default_titles['SUBMISSION_LIMIT_EXCEEDED'];
                $custom_message = $message;
                break;
        }
        
        ob_start();
        ?>
        <div class="sfq-limit-message-container" id="sfq-form-<?php echo $form_id; ?>">
            <div class="sfq-limit-message">
                <div class="sfq-limit-icon">
                    <?php echo $icon; ?>
                </div>
                
                <?php 
                // Mostrar video si está configurado (solo para mensajes de bloqueo) - DESPUÉS del icono
                if (isset($use_block_colors) && $use_block_colors && !empty($styles['block_form_video_url'])) {
                    $video_embed = $this->convert_video_url_to_embed($styles['block_form_video_url']);
                    if ($video_embed) {
                        echo '<div class="sfq-video-container" style="margin-bottom: 15px;">' . $video_embed . '</div>';
                    }
                }
                ?>
                
                <h2 class="sfq-limit-title"><?php echo esc_html($title); ?></h2>
                
                <div class="sfq-limit-text">
                    <?php echo wp_kses_post($custom_message); ?>
                </div>
                
                <?php if (($limit_type === 'FORM_BLOCKED_WITH_TIMER' || $limit_type === 'FORM_BLOCKED_WITH_TIMER_EXPIRED') && isset($limit_check['timer_date'])) : ?>
                    <div class="sfq-timer-container">
                        <?php 
                        $timer_text = $limit_check['timer_text'] ?? '';
                        if (!empty(trim($timer_text))) : ?>
                            <div class="sfq-timer-text">
                                <?php echo esc_html($timer_text); ?>
                            </div>
                        <?php endif; ?>
                        <div class="sfq-countdown-timer <?php echo $limit_type === 'FORM_BLOCKED_WITH_TIMER_EXPIRED' ? 'expired keep-visible' : ''; ?>" 
                             data-target-date="<?php echo esc_attr($limit_check['timer_date']); ?>"
                             data-opened-text="<?php echo esc_attr($styles['block_form_timer_opened_text'] ?? __('¡El formulario ya está disponible!', 'smart-forms-quiz')); ?>"
                             data-form-id="<?php echo esc_attr($form_id); ?>"
                             data-show-form="<?php echo esc_attr($styles['block_form_timer_show_form'] ? 'true' : 'false'); ?>">
                            <div class="sfq-countdown-display">
                                <div class="sfq-countdown-unit">
                                    <span class="sfq-countdown-number" id="days-<?php echo $form_id; ?>"><?php echo $limit_type === 'FORM_BLOCKED_WITH_TIMER_EXPIRED' ? '00' : '0'; ?></span>
                                    <span class="sfq-countdown-label"><?php _e('días', 'smart-forms-quiz'); ?></span>
                                </div>
                                <div class="sfq-countdown-unit">
                                    <span class="sfq-countdown-number" id="hours-<?php echo $form_id; ?>"><?php echo $limit_type === 'FORM_BLOCKED_WITH_TIMER_EXPIRED' ? '00' : '0'; ?></span>
                                    <span class="sfq-countdown-label"><?php _e('horas', 'smart-forms-quiz'); ?></span>
                                </div>
                                <div class="sfq-countdown-unit">
                                    <span class="sfq-countdown-number" id="minutes-<?php echo $form_id; ?>"><?php echo $limit_type === 'FORM_BLOCKED_WITH_TIMER_EXPIRED' ? '00' : '0'; ?></span>
                                    <span class="sfq-countdown-label"><?php _e('min', 'smart-forms-quiz'); ?></span>
                                </div>
                                <div class="sfq-countdown-unit">
                                    <span class="sfq-countdown-number" id="seconds-<?php echo $form_id; ?>"><?php echo $limit_type === 'FORM_BLOCKED_WITH_TIMER_EXPIRED' ? '00' : '0'; ?></span>
                                    <span class="sfq-countdown-label"><?php _e('seg', 'smart-forms-quiz'); ?></span>
                                </div>
                            </div>
                        </div>
                    </div>
                <?php endif; ?>
                
                <?php if (isset($limit_check['count']) && isset($limit_check['limit'])) : ?>
                    <div class="sfq-limit-details">
                        <?php 
                        printf(
                            __('Has utilizado %d de %d envíos permitidos.', 'smart-forms-quiz'),
                            $limit_check['count'],
                            $limit_check['limit']
                        ); 
                        ?>
                    </div>
                <?php endif; ?>
                
                <?php if (!empty($button_text)) : ?>
                    <div class="sfq-limit-actions">
                        <?php if (!empty($button_url)) : ?>
                            <a href="<?php echo esc_url($button_url); ?>" class="sfq-button sfq-button-primary">
                                <?php echo esc_html($button_text); ?>
                            </a>
                        <?php else : ?>
                            <div class="sfq-button sfq-button-info">
                                <?php echo esc_html($button_text); ?>
                            </div>
                        <?php endif; ?>
                    </div>
                <?php endif; ?>
            </div>
        </div>
        
        <!-- Estilos para el mensaje de límite -->
        <style>
            #sfq-form-<?php echo $form_id; ?> {
                --sfq-primary-color: <?php echo esc_attr($styles['primary_color'] ?? '#007cba'); ?>;
                --sfq-secondary-color: <?php echo esc_attr($styles['secondary_color'] ?? '#6c757d'); ?>;
                --sfq-background-color: <?php echo esc_attr($styles['background_color'] ?? '#ffffff'); ?>;
                --sfq-text-color: <?php echo esc_attr($styles['text_color'] ?? '#333333'); ?>;
                --sfq-border-radius: <?php echo esc_attr($styles['border_radius'] ?? '12'); ?>px;
                --sfq-font-family: <?php echo esc_attr($styles['font_family'] ?? 'system-ui, -apple-system, sans-serif'); ?>;
                
                /* Colores específicos para mensajes de límite */
                <?php if (isset($use_block_colors) && $use_block_colors) : ?>
                    /* Usar colores específicos de bloqueo de formulario */
                    --sfq-limit-bg: <?php echo esc_attr($styles['block_form_bg_color'] ?? '#f8f9fa'); ?>;
                    --sfq-limit-border: <?php echo esc_attr($styles['block_form_border_color'] ?? '#e9ecef'); ?>;
                    --sfq-limit-icon-color: <?php echo esc_attr($styles['block_form_icon_color'] ?? '#dc3545'); ?>;
                    --sfq-limit-title-color: <?php echo esc_attr($styles['block_form_title_color'] ?? '#333333'); ?>;
                    --sfq-limit-text-color: <?php echo esc_attr($styles['block_form_text_color'] ?? '#666666'); ?>;
                    --sfq-limit-button-bg: <?php echo esc_attr($styles['block_form_button_bg_color'] ?? '#007cba'); ?>;
                    --sfq-limit-button-text: <?php echo esc_attr($styles['block_form_button_text_color'] ?? '#ffffff'); ?>;
                <?php else : ?>
                    /* Usar colores globales de límite */
                    --sfq-limit-bg: <?php echo esc_attr($styles['limit_background_color'] ?? '#f8f9fa'); ?>;
                    --sfq-limit-border: <?php echo esc_attr($styles['limit_border_color'] ?? '#e9ecef'); ?>;
                    --sfq-limit-icon-color: <?php echo esc_attr($styles['limit_icon_color'] ?? '#6c757d'); ?>;
                    --sfq-limit-title-color: <?php echo esc_attr($styles['limit_title_color'] ?? $styles['text_color'] ?? '#333333'); ?>;
                    --sfq-limit-text-color: <?php echo esc_attr($styles['limit_text_color'] ?? $styles['text_color'] ?? '#333333'); ?>;
                    --sfq-limit-button-bg: <?php echo esc_attr($styles['limit_button_bg_color'] ?? '#007cba'); ?>;
                    --sfq-limit-button-text: <?php echo esc_attr($styles['limit_button_text_color'] ?? '#ffffff'); ?>;
                <?php endif; ?>
            }
            
            .sfq-limit-message-container {
                max-width: 600px;
                margin: 0 auto;
                font-family: var(--sfq-font-family);
            }
            
            .sfq-limit-message {
                background: var(--sfq-limit-bg);
                border: 2px solid var(--sfq-limit-border);
                border-radius: var(--sfq-border-radius);
                padding: 10px 30px;
                text-align: center;
                <?php if (empty($styles['block_form_disable_shadow']) || !$styles['block_form_disable_shadow']) : ?>
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                <?php endif; ?>
            }
            
            .sfq-limit-icon {
                color: var(--sfq-limit-icon-color);
                margin-bottom: 10px;
                opacity: 0.8;
            }
            
            .sfq-limit-icon svg {
                width: 80px;
                height: 80px;
            }
            
            /* Estilos para imágenes de iconos */
            .sfq-limit-icon-image {
                width: 80px;
                height: 80px;
                object-fit: contain;
                border-radius: 8px;
                
            }
            
            /* Estilos para texto/emoji de iconos */
            .sfq-limit-icon-text {
                font-size: 48px;
                line-height: 1;
                display: block;
            }
            
            .sfq-limit-title {
                color: var(--sfq-limit-title-color);
                font-size: 24px;
                font-weight: 600;
                margin: 0 0 15px 0;
                line-height: 1.3;
            }
            
            .sfq-limit-text {
                color: var(--sfq-limit-text-color);
                font-size: 16px;
                line-height: 1.5;
                margin-bottom: 20px;
                opacity: 0.9;
                font-weight: normal;
            }
            
            .sfq-limit-details {
                color: var(--sfq-secondary-color);
                font-size: 14px;
                margin-bottom: 25px;
                padding: 12px 20px;
                background: rgba(0, 0, 0, 0.05);
                border-radius: calc(var(--sfq-border-radius) / 2);
                display: inline-block;
            }
            
            .sfq-limit-actions {
                margin-top: 25px;
                margin-bottom: 15px;
            }
            
            .sfq-button {
                display: inline-block;
                padding: 12px 24px;
                border: none;
                border-radius: calc(var(--sfq-border-radius) / 2);
                font-size: 16px;
                font-weight: 500;
                text-decoration: none;
                cursor: pointer;
                transition: all 0.2s ease;
                font-family: inherit;
            }
            
            .sfq-button-primary {
                background: var(--sfq-primary-color);
                color: white;
            }
            
            .sfq-button-primary:hover {
                background: color-mix(in srgb, var(--sfq-primary-color) 85%, black);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            
            .sfq-button-info {
                background: var(--sfq-limit-button-bg);
                color: var(--sfq-limit-button-text);
                cursor: default;
            }
            
            .sfq-button-info:hover {
                background: var(--sfq-limit-button-bg);
                transform: none;
                box-shadow: none;
            }
            
            /* Usar colores específicos según el tipo de bloqueo */
            <?php if (isset($use_block_colors) && $use_block_colors) : ?>
                /* Colores específicos de bloqueo de formulario */
                .sfq-limit-title {
                    color: <?php echo esc_attr($styles['block_form_title_color'] ?? '#333333'); ?> !important;
                }
                
                .sfq-limit-text {
                    color: <?php echo esc_attr($styles['block_form_text_color'] ?? '#666666'); ?> !important;
                }
                
                .sfq-limit-icon {
                    color: <?php echo esc_attr($styles['block_form_icon_color'] ?? '#dc3545'); ?> !important;
                }
                
                .sfq-limit-message {
                    background: <?php echo esc_attr($styles['block_form_bg_color'] ?? '#f8f9fa'); ?> !important;
                    border-color: <?php echo esc_attr($styles['block_form_border_color'] ?? '#e9ecef'); ?> !important;
                }
                
                .sfq-button-info {
                    background: <?php echo esc_attr($styles['block_form_button_bg_color'] ?? '#007cba'); ?> !important;
                    color: <?php echo esc_attr($styles['block_form_button_text_color'] ?? '#ffffff'); ?> !important;
                }
                
                .sfq-button-primary {
                    background: <?php echo esc_attr($styles['block_form_button_bg_color'] ?? '#007cba'); ?> !important;
                    color: <?php echo esc_attr($styles['block_form_button_text_color'] ?? '#ffffff'); ?> !important;
                }
            <?php else : ?>
                /* Colores globales de límite */
                .sfq-limit-title {
                    color: <?php echo esc_attr($styles['limit_title_color'] ?? $styles['text_color'] ?? '#333333'); ?>;
                }
                
                .sfq-limit-text {
                    color: <?php echo esc_attr($styles['limit_text_color'] ?? $styles['text_color'] ?? '#333333'); ?>;
                }
            <?php endif; ?>
            
            /* Estilos para el timer de cuenta atrás */
            .sfq-timer-container {
                margin: 25px 0;
                padding: 20px;
                background: <?php echo esc_attr($styles['block_form_timer_container_bg_color'] ?? '#f8f9fa'); ?>;
                border-radius: calc(var(--sfq-border-radius) / 2);
                border: 1px solid <?php echo esc_attr($styles['block_form_timer_container_border_color'] ?? '#e9ecef'); ?>;
            }
            
            .sfq-timer-text {
                color: var(--sfq-limit-text-color);
                font-size: 18px;
                font-weight: 500;
                margin-bottom: 15px;
                opacity: 0.9;
            }
            
            .sfq-countdown-display {
                display: flex;
                justify-content: center;
                gap: 15px;
                flex-wrap: wrap;
            }
            
            .sfq-countdown-unit {
                display: flex;
                flex-direction: column;
                align-items: center;
                min-width: 60px;
                padding: 12px 8px;
                background: <?php echo esc_attr($styles['block_form_timer_unit_bg_color'] ?? '#ffffff'); ?>;
                border: 2px solid <?php echo esc_attr($styles['block_form_timer_unit_border_color'] ?? '#e9ecef'); ?>;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }
            
            .sfq-countdown-number {
                font-size: 24px;
                font-weight: 700;
                color: var(--sfq-limit-icon-color);
                line-height: 1;
                margin-bottom: 4px;
                font-family: 'Courier New', monospace;
            }
            
            .sfq-countdown-label {
                font-size: 12px;
                color: var(--sfq-limit-text-color);
                text-transform: uppercase;
                letter-spacing: 0.5px;
                font-weight: 500;
                opacity: 0.8;
            }
            
            .sfq-countdown-timer.expired:not(.keep-visible) .sfq-countdown-display {
                display: none;
            }
            
            .sfq-countdown-timer.expired.keep-visible .sfq-countdown-display {
                display: flex;
            }
            
            .sfq-countdown-timer.expired.keep-visible .sfq-countdown-number {
                color: var(--sfq-primary-color);
                animation: sfq-pulse 2s infinite;
            }
            
            .sfq-countdown-timer.expired:not(.keep-visible) .sfq-timer-text {
                font-size: 20px;
                color: var(--sfq-primary-color);
                font-weight: 600;
                text-align: center;
                animation: sfq-pulse 2s infinite;
            }
            
            .sfq-countdown-timer.expired.keep-visible .sfq-timer-text {
                font-size: 18px;
                color: var(--sfq-primary-color);
                font-weight: 600;
                text-align: center;
                animation: sfq-pulse 2s infinite;
            }
            
            @keyframes sfq-pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
            
            /* Responsive */
            @media (max-width: 768px) {
                .sfq-limit-message {
                    padding: 10px 20px;
                    margin: 0 15px;
                }
                 /* Estilos para texto/emoji de iconos */
                .sfq-limit-icon-text {
                font-size: 48px;
                line-height: 1;
                display: block;
            }
                .sfq-limit-title {
                    font-size: 20px;
                }
                
                .sfq-limit-icon svg {
                    width: 60px;
                    height: 60px;
                }
                
                .sfq-countdown-display {
                    gap: 7px;
                }
                
                .sfq-countdown-unit {
                    min-width: 20px;
                    padding: 10px 6px;
                }
                
                .sfq-countdown-number {
                    font-size: 20px;
                }
                
                .sfq-countdown-label {
                    font-size: 11px;
                }
                
                .sfq-timer-text {
                    font-size: 16px;
                }
            }
        </style>
        
        <?php if ($limit_type === 'FORM_BLOCKED_WITH_TIMER' && isset($limit_check['timer_date'])) : ?>
        <!-- JavaScript mejorado para la cuenta atrás con manejo UTC y sin bucles infinitos -->
        <script>
        (function() {
            'use strict';
            
            // Configuración del timer
            const timerElement = document.querySelector('.sfq-countdown-timer');
            if (!timerElement) return;
            
            const openedText = timerElement.dataset.openedText;
            const formId = timerElement.dataset.formId;
            
            // Usar timestamp UTC del servidor para evitar problemas de zona horaria
            const targetTimestamp = <?php echo isset($limit_check['timer_utc_timestamp']) ? $limit_check['timer_utc_timestamp'] : 'null'; ?>;
            const timezone = '<?php echo esc_js($limit_check['timer_timezone'] ?? wp_timezone_string()); ?>';
            
            if (!targetTimestamp) {
                console.error('SFQ Timer: No se pudo obtener el timestamp UTC del timer');
                return;
            }
            
            // Referencias a elementos del DOM
            const daysSpan = document.getElementById('days-' + formId);
            const hoursSpan = document.getElementById('hours-' + formId);
            const minutesSpan = document.getElementById('minutes-' + formId);
            const secondsSpan = document.getElementById('seconds-' + formId);
            const timerTextEl = document.querySelector('.sfq-timer-text');
            
            // Estado del timer para evitar múltiples ejecuciones
            let timerExpired = false;
            let timeinterval = null;
            
            // Función para calcular tiempo restante usando UTC
            function getTimeRemaining() {
                // Obtener timestamp actual en UTC (en segundos)
                const currentTimestamp = Math.floor(Date.now() / 1000);
                const total = (targetTimestamp - currentTimestamp) * 1000; // Convertir a milisegundos
                
                if (total <= 0) {
                    return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
                }
                
                const seconds = Math.floor((total / 1000) % 60);
                const minutes = Math.floor((total / 1000 / 60) % 60);
                const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
                const days = Math.floor(total / (1000 * 60 * 60 * 24));
                
                return { total, days, hours, minutes, seconds };
            }
            
            // Función para actualizar el reloj
            function updateClock() {
                if (timerExpired) return;
                
                const t = getTimeRemaining();
                
                // Verificar si el timer ha expirado
                if (t.total <= 0) {
                    handleTimerExpired();
                    return;
                }
                
                // Actualizar display con ceros a la izquierda
                if (daysSpan) daysSpan.textContent = String(t.days).padStart(2, '0');
                if (hoursSpan) hoursSpan.textContent = String(t.hours).padStart(2, '0');
                if (minutesSpan) minutesSpan.textContent = String(t.minutes).padStart(2, '0');
                if (secondsSpan) secondsSpan.textContent = String(t.seconds).padStart(2, '0');
            }
            
            // Manejar expiración del timer
            function handleTimerExpired() {
                if (timerExpired) return; // Evitar múltiples ejecuciones
                
                timerExpired = true;
                clearInterval(timeinterval);
                
                            // Verificar si está activada la opción de no mostrar mensaje ni formulario
                            const showFormSetting = '<?php echo esc_js($styles['block_form_timer_show_form'] ?? false); ?>';
                            const hideAllSetting = '<?php echo esc_js($styles['block_form_timer_hide_all'] ?? false); ?>';
                            
                            if (showFormSetting === '1' || showFormSetting === 'true') {
                                // Verificar si debe ocultar todo completamente
                                if (hideAllSetting === '1' || hideAllSetting === 'true') {
                                    // Ocultar completamente todo el contenedor del mensaje
                                    const limitContainer = document.querySelector('.sfq-limit-message-container');
                                    if (limitContainer) {
                                        limitContainer.style.transition = 'opacity 0.5s ease, height 0.5s ease';
                                        limitContainer.style.opacity = '0';
                                        limitContainer.style.height = '0';
                                        limitContainer.style.overflow = 'hidden';
                                        limitContainer.style.margin = '0';
                                        limitContainer.style.padding = '0';
                                        
                                        setTimeout(() => {
                                            limitContainer.style.display = 'none';
                                        }, 500);
                                    }
                                    
                                    // Guardar estado en localStorage
                                    localStorage.setItem('sfq_timer_expired_hide_all_' + formId, Date.now().toString());
                                    return;
                                }
                                
                                // Solo mantener el contador visible, no mostrar mensaje ni formulario
                                timerElement.classList.add('expired', 'keep-visible');
                                if (timerTextEl) timerTextEl.textContent = openedText;
                                
                                // Mantener los números en 00:00:00:00
                                if (daysSpan) daysSpan.textContent = '00';
                                if (hoursSpan) hoursSpan.textContent = '00';
                                if (minutesSpan) minutesSpan.textContent = '00';
                                if (secondsSpan) secondsSpan.textContent = '00';
                                
                                // Guardar estado en localStorage
                                localStorage.setItem('sfq_timer_expired_' + formId, Date.now().toString());
                                
                                // No hacer nada más, mantener el contador en pantalla
                                return;
                            }
                
                // Comportamiento normal: mostrar mensaje de disponibilidad
                timerElement.classList.add('expired');
                if (timerTextEl) timerTextEl.textContent = openedText;
                
                // Guardar estado en localStorage para evitar recargas innecesarias
                localStorage.setItem('sfq_timer_expired_' + formId, Date.now().toString());
                
                // Mostrar mensaje de disponibilidad y botón para acceder
                setTimeout(function() {
                    showFormAvailableMessage();
                }, 2000);
            }
            
            // Mostrar mensaje de formulario disponible
            function showFormAvailableMessage() {
                const limitContainer = document.querySelector('.sfq-limit-message-container');
                if (!limitContainer) return;
                
                // Obtener configuraciones personalizables del PHP con valores por defecto
                const availableIcon = '<?php echo esc_js(!empty($limit_check['available_icon']) ? $limit_check['available_icon'] : '✅'); ?>';
                const availableTitle = '<?php echo esc_js(!empty($limit_check['available_title']) ? $limit_check['available_title'] : __('¡El formulario ya está disponible!', 'smart-forms-quiz')); ?>';
                const availableDescription = '<?php echo esc_js(!empty($limit_check['available_description']) ? $limit_check['available_description'] : __('Puedes acceder al formulario ahora.', 'smart-forms-quiz')); ?>';
                const availableButtonText = '<?php echo esc_js(!empty($limit_check['available_button_text']) ? $limit_check['available_button_text'] : __('Acceder al formulario', 'smart-forms-quiz')); ?>';
                const availableButtonUrl = '<?php echo esc_js($limit_check['available_button_url'] ?? ''); ?>';
                
                // Obtener colores personalizados del mensaje de disponibilidad
                const availableBgColor = '<?php echo esc_js($limit_check['available_bg_color'] ?? '#f8f9fa'); ?>';
                const availableBorderColor = '<?php echo esc_js($limit_check['available_border_color'] ?? '#e9ecef'); ?>';
                const availableIconColor = '<?php echo esc_js($limit_check['available_icon_color'] ?? '#28a745'); ?>';
                const availableTitleColor = '<?php echo esc_js($limit_check['available_title_color'] ?? '#28a745'); ?>';
                const availableTextColor = '<?php echo esc_js($limit_check['available_text_color'] ?? '#666666'); ?>';
                const availableButtonBgColor = '<?php echo esc_js($limit_check['available_button_bg_color'] ?? '#28a745'); ?>';
                const availableButtonTextColor = '<?php echo esc_js($limit_check['available_button_text_color'] ?? '#ffffff'); ?>';
                
                // Crear mensaje de formulario disponible con colores personalizados
                const availableMessage = document.createElement('div');
                availableMessage.className = 'sfq-form-available-message';
                availableMessage.innerHTML = `
                    <div style="text-align: center; padding: 40px; background: ${availableBgColor}; border: 2px solid ${availableBorderColor}; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                        <div style="color: ${availableIconColor}; font-size: 48px; margin-bottom: 20px; animation: sfq-bounce 1s ease-in-out;">${availableIcon}</div>
                        <h3 style="color: ${availableTitleColor}; margin-bottom: 15px; font-size: 24px; font-weight: 600;">${availableTitle}</h3>
                        <p style="color: ${availableTextColor}; margin-bottom: 25px; font-size: 16px;">${availableDescription}</p>
                        <button onclick="accessForm()" style="
                            background: ${availableButtonBgColor}; 
                            color: ${availableButtonTextColor}; 
                            border: none; 
                            padding: 14px 28px; 
                            border-radius: 8px; 
                            font-size: 16px; 
                            font-weight: 500;
                            cursor: pointer;
                            transition: all 0.2s ease;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                        " onmouseover="this.style.opacity='0.9'; this.style.transform='translateY(-1px)'" 
                           onmouseout="this.style.opacity='1'; this.style.transform='translateY(0)'">
                            ${availableButtonText}
                        </button>
                    </div>
                `;
                
                // Función global para acceder al formulario
                window.accessForm = function() {
                    // Limpiar localStorage
                    localStorage.removeItem('sfq_timer_expired_' + formId);
                    
                    // Si hay URL personalizada, redirigir ahí, sino recargar para mostrar formulario
                    if (availableButtonUrl && availableButtonUrl.trim() !== '') {
                        window.location.href = availableButtonUrl;
                    } else {
                        // Recargar página para mostrar formulario
                        window.location.reload();
                    }
                };
                
                // Reemplazar contenido con animación
                limitContainer.style.transition = 'opacity 0.3s ease';
                limitContainer.style.opacity = '0';
                
                setTimeout(() => {
                    limitContainer.innerHTML = '';
                    limitContainer.appendChild(availableMessage);
                    limitContainer.style.opacity = '1';
                }, 300);
            }
            
            // Función para inicializar el reloj
            function initializeClock() {
                // Verificar si debe estar completamente oculto (nueva opción)
                const hideAllExpiredTime = localStorage.getItem('sfq_timer_expired_hide_all_' + formId);
                if (hideAllExpiredTime) {
                    const expiredTimestamp = parseInt(hideAllExpiredTime);
                    const now = Date.now();
                    
                    // Si expiró hace menos de 24 horas, mantener oculto
                    if (now - expiredTimestamp < 24 * 60 * 60 * 1000) {
                        const limitContainer = document.querySelector('.sfq-limit-message-container');
                        if (limitContainer) {
                            limitContainer.style.display = 'none';
                        }
                        return;
                    } else {
                        // Si expiró hace más de 24 horas, limpiar localStorage
                        localStorage.removeItem('sfq_timer_expired_hide_all_' + formId);
                    }
                }
                
                // Verificar si el timer ya expiró previamente (localStorage)
                const expiredTime = localStorage.getItem('sfq_timer_expired_' + formId);
                if (expiredTime) {
                    const expiredTimestamp = parseInt(expiredTime);
                    const now = Date.now();
                    
                    // Si expiró hace menos de 5 minutos, mostrar mensaje directamente
                    if (now - expiredTimestamp < 5 * 60 * 1000) {
                        handleTimerExpired();
                        return;
                    } else {
                        // Si expiró hace más de 5 minutos, limpiar localStorage y verificar de nuevo
                        localStorage.removeItem('sfq_timer_expired_' + formId);
                    }
                }
                
                // Verificar inmediatamente si ya expiró
                const t = getTimeRemaining();
                if (t.total <= 0) {
                    handleTimerExpired();
                    return;
                }
                
                // Actualizar inmediatamente para evitar delay
                updateClock();
                
                // Configurar interval para actualizar cada segundo
                timeinterval = setInterval(updateClock, 1000);
            }
            
            // Agregar estilos para animación
            const style = document.createElement('style');
            style.textContent = `
                @keyframes sfq-bounce {
                    0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                    40% { transform: translateY(-10px); }
                    60% { transform: translateY(-5px); }
                }
            `;
            document.head.appendChild(style);
            
            // Inicializar el reloj
            initializeClock();
            
            // Limpiar interval al salir de la página
            window.addEventListener('beforeunload', function() {
                if (timeinterval) {
                    clearInterval(timeinterval);
                }
            });
            
        })();
        </script>
        <?php endif; ?>
        
        <?php
        return ob_get_clean();
    }
    
    /**
     * Procesar contenido de icono (detectar URLs de imagen, SVG, emojis o texto)
     */
    private function process_icon_content($content) {
        if (empty($content)) {
            return '';
        }
        
        $content = trim($content);
        
        // 1. Detectar si es una URL de imagen
        if ($this->is_image_url($content)) {
            return '<img src="' . esc_url($content) . '" alt="Icono" class="sfq-limit-icon-image" loading="lazy">';
        }
        
        // 2. Detectar si es SVG (comienza con <svg)
        if (strpos($content, '<svg') === 0) {
            // Sanitizar SVG básico (permitir solo elementos seguros)
            $allowed_svg_tags = array(
                'svg' => array('width' => true, 'height' => true, 'viewBox' => true, 'fill' => true, 'xmlns' => true),
                'path' => array('d' => true, 'fill' => true, 'stroke' => true, 'stroke-width' => true, 'stroke-linecap' => true, 'stroke-linejoin' => true),
                'circle' => array('cx' => true, 'cy' => true, 'r' => true, 'fill' => true, 'stroke' => true, 'stroke-width' => true),
                'rect' => array('x' => true, 'y' => true, 'width' => true, 'height' => true, 'fill' => true, 'stroke' => true, 'stroke-width' => true),
                'line' => array('x1' => true, 'y1' => true, 'x2' => true, 'y2' => true, 'stroke' => true, 'stroke-width' => true, 'stroke-linecap' => true),
                'polygon' => array('points' => true, 'fill' => true, 'stroke' => true, 'stroke-width' => true),
                'g' => array('fill' => true, 'stroke' => true, 'transform' => true)
            );
            
            return wp_kses($content, $allowed_svg_tags);
        }
        
        // 3. Detectar si es HTML (contiene tags)
        if (strpos($content, '<') !== false && strpos($content, '>') !== false) {
            // Permitir algunos tags HTML básicos para iconos
            $allowed_html_tags = array(
                'i' => array('class' => true, 'style' => true),
                'span' => array('class' => true, 'style' => true),
                'div' => array('class' => true, 'style' => true)
            );
            
            return wp_kses($content, $allowed_html_tags);
        }
        
        // 4. Si no es nada de lo anterior, tratarlo como texto/emoji
        return '<span class="sfq-limit-icon-text">' . esc_html($content) . '</span>';
    }
    
    /**
     * Verificar si una cadena es una URL de imagen válida
     */
    private function is_image_url($url) {
        // Verificar que sea una URL válida
        if (!filter_var($url, FILTER_VALIDATE_URL)) {
            return false;
        }
        
        // Verificar extensiones de imagen comunes
        $image_extensions = array('jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico');
        $url_parts = parse_url($url);
        
        if (!isset($url_parts['path'])) {
            return false;
        }
        
        $path_info = pathinfo($url_parts['path']);
        $extension = strtolower($path_info['extension'] ?? '');
        
        // Verificar si la extensión está en la lista de imágenes
        if (in_array($extension, $image_extensions)) {
            return true;
        }
        
        // Verificar patrones comunes de URLs de imágenes (como CDNs)
        $image_patterns = array(
            '/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?|$)/i',
            '/\/image\//i',
            '/\/img\//i',
            '/\/images\//i',
            '/\/media\//i',
            '/gravatar\.com/i',
            '/unsplash\.com/i',
            '/pixabay\.com/i',
            '/pexels\.com/i'
        );
        
        foreach ($image_patterns as $pattern) {
            if (preg_match($pattern, $url)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Verificar si es una petición de timer expirado (GET o AJAX/POST)
     */
    private function is_timer_expired_request($form_id) {
        // Verificar parámetros GET (método original)
        if (isset($_GET['sfq_timer_expired']) && $_GET['sfq_timer_expired'] === '1' && 
            isset($_GET['sfq_form_id']) && $_GET['sfq_form_id'] == $form_id) {
            return true;
        }
        
        // Verificar parámetros POST (para peticiones AJAX)
        if (isset($_POST['timer_expired']) && $_POST['timer_expired'] === '1' && 
            isset($_POST['form_id']) && $_POST['form_id'] == $form_id) {
            return true;
        }
        
        // Verificar si estamos en una petición AJAX específica para obtener contenido del formulario
        if (defined('DOING_AJAX') && DOING_AJAX && 
            isset($_POST['action']) && $_POST['action'] === 'sfq_get_form_content' &&
            isset($_POST['timer_expired']) && $_POST['timer_expired'] === '1' &&
            isset($_POST['form_id']) && $_POST['form_id'] == $form_id) {
            return true;
        }
        
        // Verificar si el timer ya expiró naturalmente usando UTC
        $form = $this->database->get_form($form_id);
        if ($form) {
            $settings = $form->settings ?: array();
            $styles = $form->style_settings ?: array();
            
            if (isset($settings['block_form']) && $settings['block_form'] &&
                !empty($styles['block_form_enable_timer']) && !empty($styles['block_form_timer_date'])) {
                
                // Usar la nueva lógica UTC para verificar expiración
                $timer_date = $styles['block_form_timer_date'];
                $timezone = $styles['block_form_timer_timezone'] ?? wp_timezone_string();
                
                $timer_timestamp = $this->convert_to_utc_timestamp($timer_date, $timezone);
                $current_timestamp = time(); // UTC timestamp
                
                // Si el timer ya expiró naturalmente, verificar configuración de mostrar formulario
                if ($current_timestamp >= $timer_timestamp) {
                    // 🆕 NUEVA LÓGICA: Verificar configuración de mostrar formulario
                    if (isset($styles['block_form_timer_show_form']) && $styles['block_form_timer_show_form']) {
                        // Si está configurado para MANTENER SOLO EL TIMER, NO permitir bypass
                        return false;
                    }
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Convertir fecha y zona horaria a timestamp UTC
     */
    private function convert_to_utc_timestamp($date_string, $timezone_string) {
        try {
            // Crear objeto DateTime con la zona horaria especificada
            $timezone = new DateTimeZone($timezone_string);
            $datetime = new DateTime($date_string, $timezone);
            
            // Convertir a UTC y obtener timestamp
            $datetime->setTimezone(new DateTimeZone('UTC'));
            return $datetime->getTimestamp();
            
        } catch (Exception $e) {
            // Si hay error con la zona horaria, usar la zona horaria de WordPress
            error_log('SFQ Timer Timezone Error: ' . $e->getMessage());
            
            try {
                $wp_timezone = new DateTimeZone(wp_timezone_string());
                $datetime = new DateTime($date_string, $wp_timezone);
                $datetime->setTimezone(new DateTimeZone('UTC'));
                return $datetime->getTimestamp();
                
            } catch (Exception $e2) {
                // Como último recurso, usar strtotime
                error_log('SFQ Timer Fallback Error: ' . $e2->getMessage());
                return strtotime($date_string);
            }
        }
    }
    
    /**
     * Convertir URL de YouTube/Vimeo a embed responsivo
     */
    private function convert_video_url_to_embed($url) {
        if (empty($url)) {
            return '';
        }
        
        $url = trim($url);
        
        // Detectar YouTube
        if (preg_match('/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/', $url, $matches)) {
            $video_id = $matches[1];
            return $this->create_youtube_embed($video_id);
        }
        
        // Detectar Vimeo
        if (preg_match('/vimeo\.com\/(?:channels\/[^\/]+\/|groups\/[^\/]+\/videos\/|album\/\d+\/video\/|video\/|)(\d+)(?:$|\/|\?)/', $url, $matches)) {
            $video_id = $matches[1];
            return $this->create_vimeo_embed($video_id);
        }
        
        return '';
    }
    
    /**
     * Crear embed de YouTube responsivo
     */
    private function create_youtube_embed($video_id) {
        return sprintf(
            '<div class="sfq-video-embed" style="position: relative; padding-bottom: 56.25%%; height: 0; overflow: hidden; max-width: 100%%; background: #000; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
                <iframe src="https://www.youtube.com/embed/%s?rel=0&showinfo=0&modestbranding=1" 
                        style="position: absolute; top: 0; left: 0; width: 100%%; height: 100%%; border: 0;" 
                        allowfullscreen 
                        loading="lazy"
                        title="Video de YouTube">
                </iframe>
            </div>',
            esc_attr($video_id)
        );
    }
    
    /**
     * Crear embed de Vimeo responsivo
     */
    private function create_vimeo_embed($video_id) {
        return sprintf(
            '<div class="sfq-video-embed" style="position: relative; padding-bottom: 56.25%%; height: 0; overflow: hidden; max-width: 100%%; background: #000; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
                <iframe src="https://player.vimeo.com/video/%s?title=0&byline=0&portrait=0" 
                        style="position: absolute; top: 0; left: 0; width: 100%%; height: 100%%; border: 0;" 
                        allowfullscreen 
                        loading="lazy"
                        title="Video de Vimeo">
                </iframe>
            </div>',
            esc_attr($video_id)
        );
    }
    
    /**
     * Renderizar pregunta freestyle
     */
    private function render_freestyle_question($question) {
        if (empty($question->freestyle_elements)) {
            echo '<p>' . __('No hay elementos configurados para esta pregunta.', 'smart-forms-quiz') . '</p>';
            return;
        }
        
        $global_settings = $question->global_settings ?? array();
        $layout = $global_settings['layout'] ?? 'vertical';
        $spacing = $global_settings['spacing'] ?? 'normal';
        $show_numbers = $global_settings['show_element_numbers'] ?? false;
        ?>
        <div class="sfq-freestyle-container" 
             data-question-id="<?php echo $question->id; ?>"
             data-layout="<?php echo esc_attr($layout); ?>"
             data-spacing="<?php echo esc_attr($spacing); ?>">
            
            <?php foreach ($question->freestyle_elements as $index => $element) : ?>
                <div class="sfq-freestyle-element sfq-element-<?php echo esc_attr($element['type']); ?>" 
                     data-element-id="<?php echo esc_attr($element['id']); ?>"
                     data-element-type="<?php echo esc_attr($element['type']); ?>"
                     data-element-order="<?php echo esc_attr($element['order'] ?? $index); ?>">
                    
                    <?php if ($show_numbers) : ?>
                        <div class="sfq-element-number"><?php echo $index + 1; ?>.</div>
                    <?php endif; ?>
                    
                    <?php if (!empty($element['label'])) : ?>
                        <label class="sfq-element-label" for="element_<?php echo $element['id']; ?>">
                            <?php echo esc_html($element['label']); ?>
                            <?php if ($question->required && $this->is_required_element_type($element['type'])) : ?>
                                <span class="sfq-required">*</span>
                            <?php endif; ?>
                        </label>
                    <?php endif; ?>
                    
                    <div class="sfq-element-content">
                        <?php $this->render_freestyle_element($element, $question->id); ?>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
        <?php
    }
    
    /**
     * Renderizar elemento freestyle específico
     */
    private function render_freestyle_element($element, $question_id) {
        $element_id = $element['id'];
        $element_type = $element['type'];
        $settings = $element['settings'] ?? array();
        
        switch ($element_type) {
            case 'text':
                $this->render_freestyle_text($element, $question_id);
                break;
                
            case 'email':
                $this->render_freestyle_email($element, $question_id);
                break;
                
            case 'phone':
                $this->render_freestyle_phone($element, $question_id);
                break;
                
            case 'video':
                $this->render_freestyle_video($element, $question_id);
                break;
                
            case 'image':
                $this->render_freestyle_image($element, $question_id);
                break;
                
            case 'file_upload':
                $this->render_freestyle_file_upload($element, $question_id);
                break;
                
            case 'button':
                $this->render_freestyle_button($element, $question_id);
                break;
                
            case 'rating':
                $this->render_freestyle_rating($element, $question_id);
                break;
                
            case 'dropdown':
                $this->render_freestyle_dropdown($element, $question_id);
                break;
                
            case 'checkbox':
                $this->render_freestyle_checkbox($element, $question_id);
                break;
                
            case 'countdown':
                $this->render_freestyle_countdown($element, $question_id);
                break;
                
            case 'legal_text':
                $this->render_freestyle_legal_text($element, $question_id);
                break;
                
            default:
                echo '<p>' . sprintf(__('Tipo de elemento "%s" no soportado', 'smart-forms-quiz'), esc_html($element_type)) . '</p>';
        }
    }
    
    /**
     * Renderizar elemento de texto freestyle
     */
    private function render_freestyle_text($element, $question_id) {
        $settings = $element['settings'] ?? array();
        $placeholder = $settings['placeholder'] ?? __('Escribe aquí...', 'smart-forms-quiz');
        $max_length = $settings['max_length'] ?? '';
        $multiline = $settings['multiline'] ?? false;
        ?>
        <div class="sfq-freestyle-text-wrapper">
            <?php if ($multiline) : ?>
                <textarea name="freestyle[<?php echo $question_id; ?>][<?php echo $element['id']; ?>]"
                          id="element_<?php echo $element['id']; ?>"
                          class="sfq-freestyle-textarea"
                          placeholder="<?php echo esc_attr($placeholder); ?>"
                          <?php echo $max_length ? 'maxlength="' . esc_attr($max_length) . '"' : ''; ?>
                          rows="<?php echo esc_attr($settings['rows'] ?? 3); ?>"></textarea>
            <?php else : ?>
                <input type="text" 
                       name="freestyle[<?php echo $question_id; ?>][<?php echo $element['id']; ?>]"
                       id="element_<?php echo $element['id']; ?>"
                       class="sfq-freestyle-input"
                       placeholder="<?php echo esc_attr($placeholder); ?>"
                       <?php echo $max_length ? 'maxlength="' . esc_attr($max_length) . '"' : ''; ?>>
            <?php endif; ?>
            <div class="sfq-input-line"></div>
        </div>
        <?php
    }
    
    /**
     * Renderizar elemento de email freestyle
     */
    private function render_freestyle_email($element, $question_id) {
        $settings = $element['settings'] ?? array();
        $placeholder = $settings['placeholder'] ?? 'tu@email.com';
        ?>
        <div class="sfq-freestyle-email-wrapper">
            <input type="email" 
                   name="freestyle[<?php echo $question_id; ?>][<?php echo $element['id']; ?>]"
                   id="element_<?php echo $element['id']; ?>"
                   class="sfq-freestyle-input sfq-email-input"
                   placeholder="<?php echo esc_attr($placeholder); ?>">
            <div class="sfq-input-line"></div>
            <span class="sfq-input-error"><?php _e('Por favor, introduce un email válido', 'smart-forms-quiz'); ?></span>
        </div>
        <?php
    }
    
    /**
     * Renderizar elemento de teléfono freestyle
     */
    private function render_freestyle_phone($element, $question_id) {
        $settings = $element['settings'] ?? array();
        $placeholder = $settings['placeholder'] ?? '+34 600 000 000';
        $pattern = $settings['pattern'] ?? '';
        ?>
        <div class="sfq-freestyle-phone-wrapper">
            <input type="tel" 
                   name="freestyle[<?php echo $question_id; ?>][<?php echo $element['id']; ?>]"
                   id="element_<?php echo $element['id']; ?>"
                   class="sfq-freestyle-input sfq-phone-input"
                   placeholder="<?php echo esc_attr($placeholder); ?>"
                   <?php echo $pattern ? 'pattern="' . esc_attr($pattern) . '"' : ''; ?>>
            <div class="sfq-input-line"></div>
        </div>
        <?php
    }
    
    /**
     * Renderizar elemento de video freestyle
     */
    private function render_freestyle_video($element, $question_id) {
        $settings = $element['settings'] ?? array();
        $video_url = $settings['video_url'] ?? '';
        $autoplay = $settings['autoplay'] ?? false;
        $controls = $settings['controls'] ?? true;
        $width = $settings['width'] ?? '100%';
        $height = $settings['height'] ?? 'auto';
        
        if (empty($video_url)) {
            echo '<p class="sfq-video-error">' . __('URL de video no configurada', 'smart-forms-quiz') . '</p>';
            return;
        }
        
        // Usar el sistema existente de conversión de video
        $video_embed = $this->convert_video_url_to_embed($video_url);
        
        if ($video_embed) {
            ?>
            <div class="sfq-freestyle-video-wrapper" style="max-width: <?php echo esc_attr($width); ?>;">
                <?php echo $video_embed; ?>
                <!-- Campo oculto para registrar que se vio el video -->
                <input type="hidden" 
                       name="freestyle[<?php echo $question_id; ?>][<?php echo $element['id']; ?>]"
                       value="video_displayed"
                       class="sfq-video-tracker">
            </div>
            <?php
        } else {
            // Fallback para URLs directas de video (MP4, etc.)
            ?>
            <div class="sfq-freestyle-video-wrapper" style="max-width: <?php echo esc_attr($width); ?>;">
                <video class="sfq-freestyle-video" 
                       <?php echo $controls ? 'controls' : ''; ?>
                       <?php echo $autoplay ? 'autoplay muted' : ''; ?>
                       style="width: 100%; height: <?php echo esc_attr($height); ?>;">
                    <source src="<?php echo esc_url($video_url); ?>" type="video/mp4">
                    <?php _e('Tu navegador no soporta el elemento video.', 'smart-forms-quiz'); ?>
                </video>
                <input type="hidden" 
                       name="freestyle[<?php echo $question_id; ?>][<?php echo $element['id']; ?>]"
                       value="video_displayed"
                       class="sfq-video-tracker">
            </div>
            <?php
        }
    }
    
    /**
     * Renderizar elemento de imagen freestyle
     */
    private function render_freestyle_image($element, $question_id) {
        $settings = $element['settings'] ?? array();
        $image_url = $settings['image_url'] ?? '';
        $alt_text = $settings['alt_text'] ?? $element['label'] ?? '';
        $width = $settings['width'] ?? 'auto';
        $height = $settings['height'] ?? 'auto';
        $clickable = $settings['clickable'] ?? false;
        
        if (empty($image_url)) {
            echo '<p class="sfq-image-error">' . __('URL de imagen no configurada', 'smart-forms-quiz') . '</p>';
            return;
        }
        ?>
        <div class="sfq-freestyle-image-wrapper">
            <?php if ($clickable) : ?>
                <div class="sfq-clickable-image" 
                     data-element-id="<?php echo $element['id']; ?>"
                     style="cursor: pointer;">
                    <img src="<?php echo esc_url($image_url); ?>" 
                         alt="<?php echo esc_attr($alt_text); ?>"
                         class="sfq-freestyle-image"
                         style="width: <?php echo esc_attr($width); ?>; height: <?php echo esc_attr($height); ?>;">
                    <input type="hidden" 
                           name="freestyle[<?php echo $question_id; ?>][<?php echo $element['id']; ?>]"
                           value=""
                           class="sfq-image-click-tracker">
                </div>
            <?php else : ?>
                <img src="<?php echo esc_url($image_url); ?>" 
                     alt="<?php echo esc_attr($alt_text); ?>"
                     class="sfq-freestyle-image"
                     style="width: <?php echo esc_attr($width); ?>; height: <?php echo esc_attr($height); ?>;">
                <input type="hidden" 
                       name="freestyle[<?php echo $question_id; ?>][<?php echo $element['id']; ?>]"
                       value="image_displayed">
            <?php endif; ?>
        </div>
        <?php
    }
    
    /**
     * Renderizar elemento de subida de archivo freestyle
     */
    private function render_freestyle_file_upload($element, $question_id) {
        $settings = $element['settings'] ?? array();
        $accept = $settings['accept'] ?? 'image/*';
        $max_size = $settings['max_size'] ?? '5MB';
        $multiple = $settings['multiple'] ?? false;
        ?>
        <div class="sfq-freestyle-file-wrapper">
            <div class="sfq-file-upload-area" data-element-id="<?php echo $element['id']; ?>">
                <input type="file" 
                       name="freestyle[<?php echo $question_id; ?>][<?php echo $element['id']; ?>]<?php echo $multiple ? '[]' : ''; ?>"
                       id="element_<?php echo $element['id']; ?>"
                       class="sfq-file-input"
                       accept="<?php echo esc_attr($accept); ?>"
                       <?php echo $multiple ? 'multiple' : ''; ?>>
                
                <div class="sfq-file-upload-content">
                    <div class="sfq-file-icon">📤</div>
                    <div class="sfq-file-text">
                        <span class="sfq-file-main"><?php _e('Haz clic para subir archivo', 'smart-forms-quiz'); ?></span>
                        <span class="sfq-file-sub"><?php printf(__('Máximo %s', 'smart-forms-quiz'), esc_html($max_size)); ?></span>
                    </div>
                </div>
                
                <div class="sfq-file-preview" style="display: none;"></div>
            </div>
        </div>
        <?php
    }
    
    /**
     * Renderizar elemento de botón freestyle
     */
    private function render_freestyle_button($element, $question_id) {
        $settings = $element['settings'] ?? array();
        $button_text = $settings['button_text'] ?? $element['label'] ?? __('Botón', 'smart-forms-quiz');
        $button_url = $settings['button_url'] ?? '';
        $button_style = $settings['button_style'] ?? 'primary';
        $open_new_tab = $settings['open_new_tab'] ?? false;
        ?>
        <div class="sfq-freestyle-button-wrapper">
            <?php if (!empty($button_url)) : ?>
                <a href="<?php echo esc_url($button_url); ?>" 
                   class="sfq-freestyle-button sfq-button-<?php echo esc_attr($button_style); ?>"
                   <?php echo $open_new_tab ? 'target="_blank" rel="noopener"' : ''; ?>
                   data-element-id="<?php echo $element['id']; ?>">
                    <?php echo esc_html($button_text); ?>
                </a>
            <?php else : ?>
                <button type="button" 
                        class="sfq-freestyle-button sfq-button-<?php echo esc_attr($button_style); ?>"
                        data-element-id="<?php echo $element['id']; ?>">
                    <?php echo esc_html($button_text); ?>
                </button>
            <?php endif; ?>
            
            <input type="hidden" 
                   name="freestyle[<?php echo $question_id; ?>][<?php echo $element['id']; ?>]"
                   value=""
                   class="sfq-button-click-tracker">
        </div>
        <?php
    }
    
    /**
     * Renderizar elemento de valoración freestyle
     */
    private function render_freestyle_rating($element, $question_id) {
        $settings = $element['settings'] ?? array();
        $rating_type = $settings['rating_type'] ?? 'stars';
        $max_rating = $settings['max_rating'] ?? 5;
        $icons = $settings['icons'] ?? array();
        ?>
        <div class="sfq-freestyle-rating-wrapper" 
             data-element-id="<?php echo $element['id']; ?>" 
             data-type="<?php echo esc_attr($rating_type); ?>">
            
            <?php if ($rating_type === 'stars') : ?>
                <div class="sfq-freestyle-stars">
                    <?php for ($i = 1; $i <= $max_rating; $i++) : ?>
                        <button class="sfq-freestyle-star" 
                                data-value="<?php echo $i; ?>" 
                                type="button">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                        </button>
                    <?php endfor; ?>
                </div>
            <?php elseif ($rating_type === 'hearts') : ?>
                <div class="sfq-freestyle-hearts">
                    <?php for ($i = 1; $i <= $max_rating; $i++) : ?>
                        <button class="sfq-freestyle-heart" 
                                data-value="<?php echo $i; ?>" 
                                type="button">❤️</button>
                    <?php endfor; ?>
                </div>
            <?php else : ?>
                <div class="sfq-freestyle-emojis">
                    <?php 
                    $default_emojis = array('😞', '😐', '🙂', '😊', '😍');
                    for ($i = 1; $i <= $max_rating; $i++) : 
                        $emoji = $icons[$i-1] ?? $default_emojis[$i-1] ?? '⭐';
                    ?>
                        <button class="sfq-freestyle-emoji" 
                                data-value="<?php echo $i; ?>" 
                                type="button"><?php echo $emoji; ?></button>
                    <?php endfor; ?>
                </div>
            <?php endif; ?>
            
            <input type="hidden" 
                   name="freestyle[<?php echo $question_id; ?>][<?php echo $element['id']; ?>]"
                   value=""
                   class="sfq-rating-value">
        </div>
        <?php
    }
    
    /**
     * Renderizar elemento desplegable freestyle
     */
    private function render_freestyle_dropdown($element, $question_id) {
        $settings = $element['settings'] ?? array();
        $options = $settings['options'] ?? array();
        $placeholder = $settings['placeholder'] ?? __('Selecciona una opción...', 'smart-forms-quiz');
        ?>
        <div class="sfq-freestyle-dropdown-wrapper">
            <select name="freestyle[<?php echo $question_id; ?>][<?php echo $element['id']; ?>]"
                    id="element_<?php echo $element['id']; ?>"
                    class="sfq-freestyle-select">
                <option value=""><?php echo esc_html($placeholder); ?></option>
                <?php foreach ($options as $option) : ?>
                    <option value="<?php echo esc_attr($option['value'] ?? $option['text']); ?>">
                        <?php echo esc_html($option['text']); ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </div>
        <?php
    }
    
    /**
     * Renderizar elemento checkbox freestyle
     */
    private function render_freestyle_checkbox($element, $question_id) {
        $settings = $element['settings'] ?? array();
        $checkbox_text = $settings['checkbox_text'] ?? $element['label'] ?? '';
        $required_check = $settings['required_check'] ?? false;
        ?>
        <div class="sfq-freestyle-checkbox-wrapper">
            <label class="sfq-freestyle-checkbox-label">
                <input type="checkbox" 
                       name="freestyle[<?php echo $question_id; ?>][<?php echo $element['id']; ?>]"
                       id="element_<?php echo $element['id']; ?>"
                       class="sfq-freestyle-checkbox"
                       value="checked"
                       <?php echo $required_check ? 'required' : ''; ?>>
                
                <span class="sfq-checkbox-custom">
                    <svg class="sfq-checkbox-icon" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                </span>
                
                <?php if (!empty($checkbox_text)) : ?>
                    <span class="sfq-checkbox-text"><?php echo esc_html($checkbox_text); ?></span>
                <?php endif; ?>
            </label>
        </div>
        <?php
    }
    
    /**
     * Renderizar elemento de cuenta atrás freestyle
     */
    private function render_freestyle_countdown($element, $question_id) {
        $settings = $element['settings'] ?? array();
        $target_date = $settings['target_date'] ?? '';
        $countdown_text = $settings['countdown_text'] ?? __('Tiempo restante:', 'smart-forms-quiz');
        $finished_text = $settings['finished_text'] ?? __('¡Tiempo agotado!', 'smart-forms-quiz');
        
        if (empty($target_date)) {
            echo '<p class="sfq-countdown-error">' . __('Fecha objetivo no configurada', 'smart-forms-quiz') . '</p>';
            return;
        }
        ?>
        <div class="sfq-freestyle-countdown-wrapper" data-element-id="<?php echo $element['id']; ?>">
            <?php if (!empty($countdown_text)) : ?>
                <div class="sfq-countdown-text"><?php echo esc_html($countdown_text); ?></div>
            <?php endif; ?>
            
            <div class="sfq-freestyle-countdown" 
                 data-target-date="<?php echo esc_attr($target_date); ?>"
                 data-finished-text="<?php echo esc_attr($finished_text); ?>">
                <div class="sfq-countdown-units">
                    <div class="sfq-countdown-unit">
                        <span class="sfq-countdown-number" data-unit="days">0</span>
                        <span class="sfq-countdown-label"><?php _e('días', 'smart-forms-quiz'); ?></span>
                    </div>
                    <div class="sfq-countdown-unit">
                        <span class="sfq-countdown-number" data-unit="hours">0</span>
                        <span class="sfq-countdown-label"><?php _e('horas', 'smart-forms-quiz'); ?></span>
                    </div>
                    <div class="sfq-countdown-unit">
                        <span class="sfq-countdown-number" data-unit="minutes">0</span>
                        <span class="sfq-countdown-label"><?php _e('min', 'smart-forms-quiz'); ?></span>
                    </div>
                    <div class="sfq-countdown-unit">
                        <span class="sfq-countdown-number" data-unit="seconds">0</span>
                        <span class="sfq-countdown-label"><?php _e('seg', 'smart-forms-quiz'); ?></span>
                    </div>
                </div>
            </div>
            
            <input type="hidden" 
                   name="freestyle[<?php echo $question_id; ?>][<?php echo $element['id']; ?>]"
                   value="countdown_displayed"
                   class="sfq-countdown-tracker">
        </div>
        <?php
    }
    
    /**
     * Renderizar elemento de texto legal freestyle
     */
    private function render_freestyle_legal_text($element, $question_id) {
        $settings = $element['settings'] ?? array();
        $text_content = $settings['text_content'] ?? '';
        $require_acceptance = $settings['require_acceptance'] ?? false;
        $acceptance_text = $settings['acceptance_text'] ?? __('He leído y acepto', 'smart-forms-quiz');
        
        if (empty($text_content)) {
            echo '<p class="sfq-legal-error">' . __('Contenido del texto legal no configurado', 'smart-forms-quiz') . '</p>';
            return;
        }
        ?>
        <div class="sfq-freestyle-legal-wrapper">
            <div class="sfq-legal-content">
                <?php echo wp_kses_post($text_content); ?>
            </div>
            
            <?php if ($require_acceptance) : ?>
                <div class="sfq-legal-acceptance">
                    <label class="sfq-legal-acceptance-label">
                        <input type="checkbox" 
                               name="freestyle[<?php echo $question_id; ?>][<?php echo $element['id']; ?>]"
                               id="element_<?php echo $element['id']; ?>"
                               class="sfq-legal-checkbox"
                               value="accepted"
                               required>
                        
                        <span class="sfq-checkbox-custom">
                            <svg class="sfq-checkbox-icon" viewBox="0 0 24 24">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                            </svg>
                        </span>
                        
                        <span class="sfq-acceptance-text"><?php echo esc_html($acceptance_text); ?></span>
                    </label>
                </div>
            <?php else : ?>
                <input type="hidden" 
                       name="freestyle[<?php echo $question_id; ?>][<?php echo $element['id']; ?>]"
                       value="legal_text_displayed">
            <?php endif; ?>
        </div>
        <?php
    }
    
    /**
     * Verificar si un tipo de elemento requiere validación
     */
    private function is_required_element_type($element_type) {
        $required_types = array('text', 'email', 'phone', 'dropdown', 'rating');
        return in_array($element_type, $required_types);
    }
    
    /**
     * Añadir estilos personalizados en el head
     */
    public function add_custom_styles() {
        // Los estilos personalizados se añaden inline con cada formulario
    }
}
