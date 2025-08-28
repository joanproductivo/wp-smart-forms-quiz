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
                // Verificar si ya es hora de abrir el formulario (igual que schedule-start)
                $timer_date = $styles['block_form_timer_date'];
                
                // Convertir ambas fechas a timestamp para comparación precisa
                $timer_timestamp = strtotime($timer_date);
                $current_timestamp = current_time('timestamp');
                
                if ($current_timestamp >= $timer_timestamp) {
                    // El timer ya expiró - NO bloquear el formulario
                    // Continuar con el renderizado normal del formulario
                } else {
                    // El timer aún no ha expirado - mostrar mensaje con timer
                    $block_check = array(
                        'allowed' => false,
                        'code' => 'FORM_BLOCKED_WITH_TIMER',
                        'message' => __('Este formulario está temporalmente bloqueado.', 'smart-forms-quiz'),
                        'timer_date' => $timer_date,
                        'timer_text' => $styles['block_form_timer_text'] ?? __('El formulario se abrirá en:', 'smart-forms-quiz'),
                        'timer_opened_text' => $styles['block_form_timer_opened_text'] ?? __('¡El formulario ya está disponible!', 'smart-forms-quiz')
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
                
                <h2 class="sfq-limit-title"><?php echo esc_html($title); ?></h2>
                
                <div class="sfq-limit-text">
                    <?php echo wp_kses_post($custom_message); ?>
                </div>
                
                <?php if ($limit_type === 'FORM_BLOCKED_WITH_TIMER' && isset($limit_check['timer_date'])) : ?>
                    <div class="sfq-timer-container">
                        <div class="sfq-timer-text">
                            <?php echo esc_html($limit_check['timer_text'] ?? __('El formulario se abrirá en:', 'smart-forms-quiz')); ?>
                        </div>
                        <div class="sfq-countdown-timer" 
                             data-target-date="<?php echo esc_attr($limit_check['timer_date']); ?>"
                             data-opened-text="<?php echo esc_attr($limit_check['timer_opened_text'] ?? __('¡El formulario ya está disponible!', 'smart-forms-quiz')); ?>"
                             data-form-id="<?php echo esc_attr($form_id); ?>"
                             data-show-form="<?php echo esc_attr($styles['block_form_timer_show_form'] ? 'true' : 'false'); ?>">
                            <div class="sfq-countdown-display">
                                <div class="sfq-countdown-unit">
                                    <span class="sfq-countdown-number" id="days-<?php echo $form_id; ?>">0</span>
                                    <span class="sfq-countdown-label"><?php _e('días', 'smart-forms-quiz'); ?></span>
                                </div>
                                <div class="sfq-countdown-unit">
                                    <span class="sfq-countdown-number" id="hours-<?php echo $form_id; ?>">0</span>
                                    <span class="sfq-countdown-label"><?php _e('horas', 'smart-forms-quiz'); ?></span>
                                </div>
                                <div class="sfq-countdown-unit">
                                    <span class="sfq-countdown-number" id="minutes-<?php echo $form_id; ?>">0</span>
                                    <span class="sfq-countdown-label"><?php _e('min', 'smart-forms-quiz'); ?></span>
                                </div>
                                <div class="sfq-countdown-unit">
                                    <span class="sfq-countdown-number" id="seconds-<?php echo $form_id; ?>">0</span>
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
                padding: 40px 30px;
                text-align: center;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            }
            
            .sfq-limit-icon {
                color: var(--sfq-limit-icon-color);
                margin-bottom: 20px;
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
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
                background: rgba(0, 0, 0, 0.03);
                border-radius: calc(var(--sfq-border-radius) / 2);
                border: 1px solid rgba(0, 0, 0, 0.1);
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
                background: var(--sfq-limit-bg);
                border: 2px solid var(--sfq-limit-border);
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
            
            .sfq-countdown-timer.expired .sfq-countdown-display {
                display: none;
            }
            
            .sfq-countdown-timer.expired .sfq-timer-text {
                font-size: 20px;
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
                    padding: 30px 20px;
                    margin: 0 15px;
                }
                
                .sfq-limit-title {
                    font-size: 20px;
                }
                
                .sfq-limit-icon svg {
                    width: 60px;
                    height: 60px;
                }
                
                .sfq-countdown-display {
                    gap: 10px;
                }
                
                .sfq-countdown-unit {
                    min-width: 50px;
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
        <!-- JavaScript moderno para la cuenta atrás (basado en mejores prácticas SitePoint) -->
        <script>
        (function() {
            'use strict';
            
            // Configuración del timer
            const timerElement = document.querySelector('.sfq-countdown-timer');
            if (!timerElement) return;
            
            const deadline = timerElement.dataset.targetDate;
            const openedText = timerElement.dataset.openedText;
            const formId = timerElement.dataset.formId;
            
            // Referencias a elementos del DOM
            const daysSpan = document.getElementById('days-' + formId);
            const hoursSpan = document.getElementById('hours-' + formId);
            const minutesSpan = document.getElementById('minutes-' + formId);
            const secondsSpan = document.getElementById('seconds-' + formId);
            const timerTextEl = document.querySelector('.sfq-timer-text');
            
            // Función para calcular tiempo restante
            function getTimeRemaining(endtime) {
                const total = Date.parse(endtime) - Date.parse(new Date());
                const seconds = Math.floor((total / 1000) % 60);
                const minutes = Math.floor((total / 1000 / 60) % 60);
                const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
                const days = Math.floor(total / (1000 * 60 * 60 * 24));
                
                return {
                    total,
                    days,
                    hours,
                    minutes,
                    seconds
                };
            }
            
            let timeinterval;
            
            // Función para actualizar el reloj
            function updateClock() {
                const t = getTimeRemaining(deadline);
                
                // Verificar si el timer ha expirado
                if (t.total <= 0) {
                    clearInterval(timeinterval);
                    timerElement.classList.add('expired');
                    if (timerTextEl) timerTextEl.textContent = openedText;
                    
                    // Verificar si debe mostrar formulario sin recargar
                    const showFormDirectly = timerElement.dataset.showForm === 'true';
                    
                    if (showFormDirectly) {
                        // Mostrar formulario sin recargar página
                        setTimeout(function() {
                            // Ocultar mensaje de bloqueo con animación
                            const limitContainer = document.querySelector('.sfq-limit-message-container');
                            if (limitContainer) {
                                limitContainer.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                                limitContainer.style.opacity = '0';
                                limitContainer.style.transform = 'translateY(-20px)';
                                
                                setTimeout(function() {
                                    limitContainer.style.display = 'none';
                                    
                                    // Cargar y mostrar el formulario
                                    loadAndShowForm();
                                }, 500);
                            }
                        }, 2000);
                    } else {
                        // Recargar página después de 3 segundos (comportamiento original)
                        setTimeout(function() {
                            window.location.reload();
                        }, 3000);
                    }
                    return;
                }
                
                // Actualizar display con ceros a la izquierda
                if (daysSpan) daysSpan.textContent = ('0' + t.days).slice(-2);
                if (hoursSpan) hoursSpan.textContent = ('0' + t.hours).slice(-2);
                if (minutesSpan) minutesSpan.textContent = ('0' + t.minutes).slice(-2);
                if (secondsSpan) secondsSpan.textContent = ('0' + t.seconds).slice(-2);
            }
            
            // Función para inicializar el reloj
            function initializeClock() {
                // Verificar inmediatamente si ya expiró
                const t = getTimeRemaining(deadline);
                if (t.total <= 0) {
                    timerElement.classList.add('expired');
                    if (timerTextEl) timerTextEl.textContent = openedText;
                    
                    // Verificar si debe mostrar formulario sin recargar
                    const showFormDirectly = timerElement.dataset.showForm === 'true';
                    
                    if (showFormDirectly) {
                        // Mostrar formulario sin recargar página
                        setTimeout(function() {
                            loadAndShowForm();
                        }, 1000);
                    } else {
                        // Solo recargar si no está configurado para mostrar formulario directamente
                        setTimeout(function() {
                            window.location.reload();
                        }, 1000);
                    }
                    return;
                }
                
                // Actualizar inmediatamente para evitar delay
                updateClock();
                
                // Configurar interval para actualizar cada segundo
                timeinterval = setInterval(updateClock, 1000);
            }
            
            // Función simplificada para mostrar mensaje "empezamos ya" sin loading
            function loadAndShowForm() {
                // Control de estado global para evitar múltiples ejecuciones
                if (window.sfqTimerExpired) {
                    return;
                }
                
                // Marcar que el timer ha expirado
                window.sfqTimerExpired = true;
                
                // Simplemente mostrar el mensaje "empezamos ya" sin loading ni AJAX
                showReadyMessage();
            }
            
            // Mostrar mensaje de "empezamos ya" sin loading
            function showReadyMessage() {
                const limitContainer = document.querySelector('.sfq-limit-message-container');
                if (!limitContainer) return;
                
                // Mostrar mensaje simple sin loading
                limitContainer.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <div style="color: #28a745; font-size: 48px; margin-bottom: 20px;">✅</div>
                        <h3 style="color: #28a745; margin-bottom: 15px;">¡Empezamos ya!</h3>
                        <p style="color: #666; margin-bottom: 20px;">El formulario ya está disponible.</p>
                        <button onclick="window.location.reload()" style="
                            background: #007cba; 
                            color: white; 
                            border: none; 
                            padding: 12px 24px; 
                            border-radius: 6px; 
                            font-size: 16px; 
                            cursor: pointer;
                            transition: background 0.2s ease;
                        " onmouseover="this.style.background='#005a87'" onmouseout="this.style.background='#007cba'">
                            Acceder al formulario
                        </button>
                    </div>
                `;
                
                // Animación de entrada suave
                limitContainer.style.opacity = '0';
                limitContainer.style.transform = 'translateY(20px)';
                limitContainer.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                
                setTimeout(() => {
                    limitContainer.style.opacity = '1';
                    limitContainer.style.transform = 'translateY(0)';
                }, 100);
            }
            
            // Inicializar el reloj
            initializeClock();
            
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
        
        // Verificar si el timer ya expiró naturalmente
        $form = $this->database->get_form($form_id);
        if ($form) {
            $settings = $form->settings ?: array();
            $styles = $form->style_settings ?: array();
            
            if (isset($settings['block_form']) && $settings['block_form'] &&
                !empty($styles['block_form_enable_timer']) && !empty($styles['block_form_timer_date'])) {
                
                $timer_timestamp = strtotime($styles['block_form_timer_date']);
                $current_timestamp = current_time('timestamp');
                
                // Si el timer ya expiró naturalmente, permitir bypass
                if ($current_timestamp >= $timer_timestamp) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Añadir estilos personalizados en el head
     */
    public function add_custom_styles() {
        // Los estilos personalizados se añaden inline con cada formulario
    }
}
