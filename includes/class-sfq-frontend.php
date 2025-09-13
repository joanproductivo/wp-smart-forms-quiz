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
        add_action('wp_enqueue_scripts', array(__CLASS__, 'enqueue_ajax_loader_script'));
    }
    
    /**
     * Enqueue script de carga AJAX para formularios
     */
    public static function enqueue_ajax_loader_script() {
        // Solo encolar si no estamos en el admin
        if (is_admin()) {
            return;
        }

        wp_enqueue_script(
            'sfq-frontend-ajax-loader',
            SFQ_PLUGIN_URL . 'assets/js/frontend-ajax-loader.js',
            array('jquery'),
            SFQ_VERSION,
            true
        );

        // Localizar script con la URL de AJAX y un nonce inicial
        wp_localize_script('sfq-frontend-ajax-loader', 'sfq_ajax', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('sfq_nonce')
        ));
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
                            // ✅ SOLUCIÓN: Renderizar script para limpiar localStorage y luego ocultar
                            return $this->render_timer_cleanup_script($form_id);
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
        
        // ✅ NUEVO: Verificar modo de carga segura
        $secure_loading = isset($settings['secure_loading']) && $settings['secure_loading'];
        
        ob_start();
        ?>
        <div class="sfq-form-container" 
             id="sfq-form-<?php echo $form_id; ?>" 
             data-form-id="<?php echo $form_id; ?>"
             data-session-id="<?php echo $session_id; ?>"
             data-settings='<?php echo json_encode($settings); ?>'
             data-secure-loading="<?php echo $secure_loading ? 'true' : 'false'; ?>">
            
            <?php // ✅ NUEVO: Gradiente animado para pantalla de introducción ?>
            <?php if (!empty($styles['intro_animated_background']) && $styles['intro_animated_background']) : ?>
                <div class="sfq-animated-gradient-bg" style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(<?php echo esc_attr($styles['intro_gradient_angle'] ?? '-45'); ?>deg, 
                        <?php echo esc_attr($styles['intro_gradient_color_1'] ?? '#ee7752'); ?>, 
                        <?php echo esc_attr($styles['intro_gradient_color_2'] ?? '#e73c7e'); ?>, 
                        <?php echo esc_attr($styles['intro_gradient_color_3'] ?? '#23a6d5'); ?>, 
                        <?php echo esc_attr($styles['intro_gradient_color_4'] ?? '#23d5ab'); ?>);
                    background-size: <?php echo esc_attr($styles['intro_gradient_size'] ?? '400'); ?>% <?php echo esc_attr($styles['intro_gradient_size'] ?? '400'); ?>%;
                    animation: sfq-gradient-animation <?php echo esc_attr($styles['intro_gradient_speed'] ?? '15'); ?>s ease infinite;
                    pointer-events: none;
                    border-radius: inherit;
                    z-index: 0;
                "></div>
            <?php endif; ?>
            
            <?php // ✅ NUEVO: Imagen de fondo separada con opacidad independiente ?>
            <?php if (!empty($styles['background_image_url'])) : ?>
                <div class="sfq-background-image" style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-image: url('<?php echo esc_url($styles['background_image_url']); ?>');
                    background-size: <?php echo esc_attr($styles['background_size'] ?? 'cover'); ?>;
                    background-repeat: <?php echo esc_attr($styles['background_repeat'] ?? 'no-repeat'); ?>;
                    background-position: <?php echo esc_attr($styles['background_position'] ?? 'center center'); ?>;
                    background-attachment: <?php echo esc_attr($styles['background_attachment'] ?? 'scroll'); ?>;
                    opacity: <?php echo esc_attr($styles['background_opacity'] ?? '1'); ?>;
                    pointer-events: none;
                    border-radius: inherit;
                    z-index: 1;
                "></div>
            <?php endif; ?>
            
            <?php // ✅ NUEVO: Overlay separado si está activado ?>
            <?php if (!empty($styles['background_image_url']) && !empty($styles['background_overlay']) && $styles['background_overlay']) : ?>
                <div class="sfq-overlay" style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: <?php echo esc_attr($styles['background_overlay_color'] ?? '#000000'); ?>;
                    opacity: <?php echo esc_attr($styles['background_overlay_opacity'] ?? '0.3'); ?>;
                    pointer-events: none;
                    border-radius: inherit;
                    z-index: 1;
                "></div>
            <?php endif; ?>
            
            <?php // ✅ NUEVO: Contenedor con z-index para estar sobre el overlay ?>
            <div class="sfq-content-wrapper" style="position: relative; z-index: 2;">
            
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
                    <?php // ✅ NUEVO: Gradiente animado específico para pantalla de introducción ?>
                    <?php if (!empty($styles['intro_screen_animated_background']) && $styles['intro_screen_animated_background']) : ?>
                        <div class="sfq-intro-animated-gradient-bg" style="
                            position: absolute;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            background: linear-gradient(<?php echo esc_attr($styles['intro_screen_gradient_angle'] ?? '-45'); ?>deg, 
                                <?php echo esc_attr($styles['intro_screen_gradient_color_1'] ?? '#ee7752'); ?>, 
                                <?php echo esc_attr($styles['intro_screen_gradient_color_2'] ?? '#e73c7e'); ?>, 
                                <?php echo esc_attr($styles['intro_screen_gradient_color_3'] ?? '#23a6d5'); ?>, 
                                <?php echo esc_attr($styles['intro_screen_gradient_color_4'] ?? '#23d5ab'); ?>);
                            background-size: <?php echo esc_attr($styles['intro_screen_gradient_size'] ?? '400'); ?>% <?php echo esc_attr($styles['intro_screen_gradient_size'] ?? '400'); ?>%;
                            animation: sfq-gradient-animation <?php echo esc_attr($styles['intro_screen_gradient_speed'] ?? '15'); ?>s ease infinite;
                            pointer-events: none;
                            border-radius: inherit;
                            z-index: 0;
                        "></div>
                    <?php endif; ?>
                    
                    <div class="sfq-intro-content" style="position: relative; z-index: 1;">
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
                <?php 
                // ✅ CRÍTICO: Separar preguntas normales de pantallas finales
                $normal_questions = array();
                $final_screen_questions = array();
                
                foreach ($form->questions as $question) {
                    $is_final_screen = (isset($question->pantallaFinal) && $question->pantallaFinal);
                    if ($is_final_screen) {
                        $final_screen_questions[] = $question;
                    } else {
                        $normal_questions[] = $question;
                    }
                }
                ?>
                
                <?php if ($secure_loading) : ?>
                    <!-- ✅ MODO SEGURO: Solo renderizar la primera pregunta -->
                    <?php if (!empty($normal_questions)) : ?>
                        <?php 
                        $first_question = $normal_questions[0];
                        $is_first_screen = !$show_intro || (empty($form->intro_title) && empty($form->intro_description));
                        $question_settings = $first_question->settings ?? array();
                        $show_next_button = isset($question_settings['show_next_button']) ? $question_settings['show_next_button'] : true;
                        $next_button_text = isset($question_settings['next_button_text']) ? $question_settings['next_button_text'] : '';
                        ?>
                        <div class="sfq-screen sfq-question-screen <?php echo $is_first_screen ? 'active' : ''; ?>" 
                             data-question-id="<?php echo $first_question->id; ?>"
                             data-question-index="0"
                             data-question-type="<?php echo esc_attr($first_question->question_type); ?>"
                             data-show-next-button="<?php echo $show_next_button ? 'true' : 'false'; ?>"
                             data-next-button-text="<?php echo esc_attr($next_button_text); ?>"
                             data-pantalla-final="false"
                             data-block-question="<?php echo (isset($first_question->settings['block_question']) && $first_question->settings['block_question']) ? 'true' : 'false'; ?>">
                            
                            <div class="sfq-question-content">
                                <!-- Número de pregunta -->
                                <?php if (!empty($settings['show_question_numbers'])) : ?>
                                    <div class="sfq-question-number">
                                        <?php echo sprintf(__('Pregunta %d de %d', 'smart-forms-quiz'), 1, count($normal_questions)); ?>
                                    </div>
                                <?php endif; ?>
                                
                                <!-- Texto de la pregunta -->
                                <?php 
                                $question_settings = $first_question->settings ?? array();
                                $hide_title = isset($question_settings['hide_title']) && $question_settings['hide_title'];
                                ?>
                                <?php if (!$hide_title) : ?>
                                    <h3 class="sfq-question-text">
                                        <?php echo esc_html($first_question->question_text); ?>
                                        <?php if ($first_question->required) : ?>
                                            <span class="sfq-required">*</span>
                                        <?php endif; ?>
                                    </h3>
                                <?php endif; ?>
                                
                                <!-- Renderizar según el tipo de pregunta -->
                                <div class="sfq-answer-container">
                                    <?php $this->render_question_type($first_question); ?>
                                </div>
                                
                <!-- Botones de navegación -->
                <?php 
                // ✅ SOLUCIÓN: Verificar si se debe ocultar la navegación
                $block_question = false;
                if (isset($first_question->settings) && is_array($first_question->settings)) {
                    $block_question = !empty($first_question->settings['block_question']);
                } elseif (isset($first_question->settings) && is_object($first_question->settings)) {
                    $block_question = !empty($first_question->settings->block_question);
                }
                
                if (!$block_question) : ?>
                    <div class="sfq-navigation">
                        <?php 
                        // Determinar si mostrar el botón "Siguiente" basado en la configuración de la pregunta
                        $should_show_next = true;
                        
                        if (isset($question_settings['show_next_button'])) {
                            $should_show_next = $question_settings['show_next_button'];
                        } else {
                            // Lógica por defecto
                            $auto_advance_types = array('single_choice', 'rating', 'image_choice');
                            $should_show_next = !($settings['auto_advance'] && in_array($first_question->question_type, $auto_advance_types));
                        }
                        
                        if ($should_show_next) : 
                            $button_text = !empty($next_button_text) ? $next_button_text : __('Siguiente', 'smart-forms-quiz');
                            
                        // ✅ NUEVO: Aplicar estilos personalizados del botón si están configurados
                        $button_styles = '';
                        $button_classes = 'sfq-button sfq-button-primary sfq-next-button';
                        $button_data_attrs = '';
                        
                        if (isset($first_question->settings['next_button_custom_style']) && $first_question->settings['next_button_custom_style'] && 
                            isset($first_question->settings['next_button_style'])) {
                            $style_config = $first_question->settings['next_button_style'];
                            $button_styles = $this->generate_button_styles($style_config);
                            $button_classes .= ' sfq-custom-styled-button';
                            
                            // ✅ NUEVO: Añadir atributos de datos para estilos personalizados
                            $button_data_attrs = 'data-custom-style="true" data-style-config=\'' . json_encode($style_config) . '\'';
                        }
                        ?>
                            <button class="<?php echo esc_attr($button_classes); ?>" 
                                    <?php echo !empty($button_styles) ? 'style="' . esc_attr($button_styles) . '"' : ''; ?>
                                    <?php echo $button_data_attrs; ?>>
                                <?php echo esc_html($button_text); ?>
                            </button>
                        <?php endif; ?>
                    </div>
                <?php endif; ?>
                            </div>
                        </div>
                        
                        <!-- Contenedor para preguntas cargadas dinámicamente -->
                        <div id="sfq-dynamic-questions-container"></div>
                    <?php endif; ?>
                    
                    <!-- ✅ MODO SEGURO: NO renderizar pantallas finales inicialmente -->
                    <!-- Las pantallas finales se cargarán dinámicamente solo cuando sea necesario -->
                    
                <?php else : ?>
                    <!-- ✅ MODO NORMAL: Renderizar todas las preguntas como antes -->
                    <?php foreach ($normal_questions as $index => $question) : ?>
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
                         data-next-button-text="<?php echo esc_attr($next_button_text); ?>"
                         data-pantalla-final="false"
                         data-block-question="<?php echo (isset($question->settings['block_question']) && $question->settings['block_question']) ? 'true' : 'false'; ?>">
                        
                        <div class="sfq-question-content">
                            <!-- Número de pregunta -->
                            <?php if (!empty($settings['show_question_numbers'])) : ?>
                                <div class="sfq-question-number">
                                    <?php echo sprintf(__('Pregunta %d de %d', 'smart-forms-quiz'), $index + 1, count($form->questions)); ?>
                                </div>
                            <?php endif; ?>
                            
                            <!-- Texto de la pregunta -->
                            <?php 
                            $question_settings = $question->settings ?? array();
                            $hide_title = isset($question_settings['hide_title']) && $question_settings['hide_title'];
                            ?>
                            <?php if (!$hide_title) : ?>
                                <h3 class="sfq-question-text">
                                    <?php echo esc_html($question->question_text); ?>
                                    <?php if ($question->required) : ?>
                                        <span class="sfq-required">*</span>
                                    <?php endif; ?>
                                </h3>
                            <?php endif; ?>
                            
                            <!-- Renderizar según el tipo de pregunta -->
                            <div class="sfq-answer-container">
                                <?php $this->render_question_type($question); ?>
                            </div>
                            
                            <!-- Botones de navegación -->
                            <?php 
                            // ✅ SOLUCIÓN: Verificar si se debe ocultar la navegación
                            $block_question = false;
                            if (isset($question->settings) && is_array($question->settings)) {
                                $block_question = !empty($question->settings['block_question']);
                            } elseif (isset($question->settings) && is_object($question->settings)) {
                                $block_question = !empty($question->settings->block_question);
                            }
                            
                            if (!$block_question) : ?>
                                <div class="sfq-navigation">
                                    <?php if ($index > 0 && !empty($settings['allow_back'])) : ?>
                                        <button class="sfq-button sfq-button-secondary sfq-prev-button">
                                            <?php _e('Anterior', 'smart-forms-quiz'); ?>
                                        </button>
                                    <?php endif; ?>
                                    
                                    <?php 
                                    // ✅ NUEVO: Verificar si es una pantalla final PRIMERO
                                    $is_pantalla_final = (isset($question->pantallaFinal) && $question->pantallaFinal);
                                    
                                    // Determinar si mostrar el botón "Siguiente" basado en la configuración de la pregunta
                                    $should_show_next = true;
                                    
                                    // ✅ CRÍTICO: Si es una pantalla final, NUNCA mostrar botón siguiente
                                    if ($is_pantalla_final) {
                                        $should_show_next = false;
                                    } elseif (isset($question_settings['show_next_button'])) {
                                        // Si la pregunta tiene configuración específica, respetarla
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
                                            $button_text = ($index === count($form->questions) - 1) ? __('Siguiente', 'smart-forms-quiz') : __('Siguiente', 'smart-forms-quiz');
                                        }
                                        
                                        // ✅ NUEVO: Aplicar estilos personalizados del botón si están configurados
                                        $button_styles = '';
                                        $button_classes = 'sfq-button sfq-button-primary sfq-next-button';
                                        $navigation_styles = '';
                                        $button_data_attrs = '';
                                        
                                        if (isset($question->settings['next_button_custom_style']) && $question->settings['next_button_custom_style'] && 
                                            isset($question->settings['next_button_style'])) {
                                            $style_config = $question->settings['next_button_style'];
                                            $button_styles = $this->generate_button_styles($style_config);
                                            $button_classes .= ' sfq-custom-styled-button';
                                            
                                            // ✅ NUEVO: Añadir atributos de datos para estilos personalizados
                                            $button_data_attrs = 'data-custom-style="true" data-style-config=\'' . json_encode($style_config) . '\'';
                                            
                                            // Aplicar alineación al contenedor de navegación
                                            if (!empty($style_config['alignment'])) {
                                                switch ($style_config['alignment']) {
                                                    case 'left':
                                                        $navigation_styles = 'text-align: left;';
                                                        break;
                                                    case 'center':
                                                        $navigation_styles = 'text-align: center;';
                                                        break;
                                                    case 'right':
                                                        $navigation_styles = 'text-align: right;';
                                                        break;
                                                }
                                            }
                                        }
                                    ?>
                                        <div class="sfq-button-container" <?php echo !empty($navigation_styles) ? 'style="' . esc_attr($navigation_styles) . '"' : ''; ?>>
                                            <button class="<?php echo esc_attr($button_classes); ?>" 
                                                    <?php echo !empty($button_styles) ? 'style="' . esc_attr($button_styles) . '"' : ''; ?>
                                                    <?php echo $button_data_attrs; ?>>
                                                <?php echo esc_html($button_text); ?>
                                            </button>
                                        </div>
                                    <?php endif; ?>
                                </div>
                            <?php endif; ?>
                        </div>
                    </div>
                    <?php endforeach; ?>
                
                <?php endif; ?>
                
                <?php // ✅ CRÍTICO: Solo renderizar pantallas finales en modo normal ?>
                <?php if (!$secure_loading) : ?>
                    <?php foreach ($final_screen_questions as $question) : ?>
                        <?php 
                        // Obtener configuración de mostrar botón siguiente (siempre false para pantallas finales)
                        $question_settings = $question->settings ?? array();
                        $show_next_button = false; // Las pantallas finales NUNCA muestran botón siguiente
                        $next_button_text = isset($question_settings['next_button_text']) ? $question_settings['next_button_text'] : '';
                        ?>
                        <div class="sfq-screen sfq-question-screen sfq-final-screen-hidden" 
                             data-question-id="<?php echo $question->id; ?>"
                             data-question-index="<?php echo count($normal_questions) + array_search($question, $final_screen_questions); ?>"
                             data-question-type="<?php echo esc_attr($question->question_type); ?>"
                             data-show-next-button="false"
                             data-next-button-text="<?php echo esc_attr($next_button_text); ?>"
                             data-pantalla-final="true">
                            
                            <div class="sfq-question-content">
                                <!-- Texto de la pregunta -->
                                <?php 
                                $question_settings = $question->settings ?? array();
                                $hide_title = isset($question_settings['hide_title']) && $question_settings['hide_title'];
                                ?>
                                <?php if (!$hide_title) : ?>
                                    <h3 class="sfq-question-text">
                                        <?php echo esc_html($question->question_text); ?>
                                        <?php if ($question->required) : ?>
                                            <span class="sfq-required">*</span>
                                        <?php endif; ?>
                                    </h3>
                                <?php endif; ?>
                                
                                <!-- Renderizar según el tipo de pregunta -->
                                <div class="sfq-answer-container">
                                    <?php $this->render_question_type($question); ?>
                                </div>
                                
                                <!-- Las pantallas finales NO tienen botones de navegación -->
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            <?php endif; ?>
            
            <!-- ✅ CRÍTICO: Solo renderizar pantalla de agradecimiento en modo normal -->
            <?php if (!$secure_loading) : ?>
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
            <?php endif; ?>
            <!-- ✅ MODO SEGURO: La pantalla de agradecimiento se cargará dinámicamente solo cuando sea necesario -->
            
            <!-- Variables ocultas para lógica condicional -->
            <?php 
            // ✅ CRÍTICO: Inicializar variables globales desde la configuración del formulario
            $global_variables = array();
            if (isset($form->global_variables) && is_array($form->global_variables)) {
                foreach ($form->global_variables as $variable) {
                    $initial_value = $variable['initial_value'] ?? '';
                    
                    // Convertir valor inicial según el tipo
                    switch ($variable['type'] ?? 'text') {
                        case 'number':
                            $global_variables[$variable['name']] = floatval($initial_value);
                            break;
                        case 'boolean':
                            $global_variables[$variable['name']] = in_array(strtolower($initial_value), ['true', '1', 'yes']);
                            break;
                        default:
                            $global_variables[$variable['name']] = $initial_value;
                    }
                }
            }
            ?>
            <input type="hidden" id="sfq-variables-<?php echo $form_id; ?>" value='<?php echo json_encode($global_variables); ?>'>
            <input type="hidden" id="sfq-redirect-url-<?php echo $form_id; ?>" value="<?php echo esc_attr($form->redirect_url); ?>">
            
            <?php // ✅ NUEVO: Cerrar contenedor de contenido ?>
            </div>
        </div>
        
        <!-- Estilos personalizados -->
        <?php if (!empty($styles)) : ?>
            <style>
                #sfq-form-<?php echo $form_id; ?> {
                    --sfq-primary-color: <?php echo esc_attr($styles['primary_color'] ?? '#007cba'); ?>;
                    --sfq-secondary-color: <?php echo esc_attr($styles['secondary_color'] ?? '#6c757d'); ?>;
                    --sfq-background-color: <?php echo esc_attr($styles['background_color'] ?? '#ffffff'); ?>;
                    --sfq-options-background-color: <?php echo esc_attr($styles['options_background_color'] ?? '#ffffff'); ?>;
                    --sfq-options-border-color: <?php echo esc_attr($styles['options_border_color'] ?? '#e0e0e0'); ?>;
                --sfq-text-color: <?php echo esc_attr($styles['text_color'] ?? '#333333'); ?>;
                --sfq-question-text-color: <?php echo esc_attr($styles['question_text_color'] ?? '#333333'); ?>;
                --sfq-intro-title-color: <?php echo esc_attr($styles['intro_title_color'] ?? '#333333'); ?>;
                --sfq-intro-description-color: <?php echo esc_attr($styles['intro_description_color'] ?? '#666666'); ?>;
                --sfq-border-radius: <?php echo esc_attr($styles['border_radius'] ?? '12'); ?>px;
                    --sfq-font-family: <?php echo esc_attr($styles['font_family'] ?? 'system-ui, -apple-system, sans-serif'); ?>;
                    
                    /* Nuevas variables CSS para las opciones de estilo */
                    --sfq-form-container-border-radius: <?php echo esc_attr($styles['form_container_border_radius'] ?? '20'); ?>px;
                    --sfq-form-container-padding: <?php echo esc_attr($styles['form_container_padding'] ?? '2rem 2rem 3rem'); ?>;
                    --sfq-question-text-size: <?php echo esc_attr($styles['question_text_size'] ?? '24'); ?>px;
                    --sfq-option-text-size: <?php echo esc_attr($styles['option_text_size'] ?? '16'); ?>px;
                    --sfq-question-content-min-height: <?php echo esc_attr($styles['question_content_min_height'] ?? '0'); ?>px;
                    --sfq-question-text-align: <?php echo esc_attr($styles['question_text_align'] ?? 'left'); ?>;
                    --sfq-general-text-align: <?php echo esc_attr($styles['general_text_align'] ?? 'left'); ?>;
                    
                    /* ✅ NUEVO: Variables CSS para imagen de fondo */
                    <?php if (!empty($styles['background_image_url'])) : ?>
                    --sfq-background-image-url: url('<?php echo esc_url($styles['background_image_url']); ?>');
                    --sfq-background-size: <?php echo esc_attr($styles['background_size'] ?? 'cover'); ?>;
                    --sfq-background-repeat: <?php echo esc_attr($styles['background_repeat'] ?? 'no-repeat'); ?>;
                    --sfq-background-position: <?php echo esc_attr($styles['background_position'] ?? 'center center'); ?>;
                    --sfq-background-attachment: <?php echo esc_attr($styles['background_attachment'] ?? 'scroll'); ?>;
                    --sfq-background-opacity: <?php echo esc_attr($styles['background_opacity'] ?? '1'); ?>;
                    <?php if (!empty($styles['background_overlay']) && $styles['background_overlay']) : ?>
                    --sfq-background-overlay-color: <?php echo esc_attr($styles['background_overlay_color'] ?? '#000000'); ?>;
                    --sfq-background-overlay-opacity: <?php echo esc_attr($styles['background_overlay_opacity'] ?? '0.3'); ?>;
                    <?php endif; ?>
                    <?php endif; ?>
                }
                
                /* ✅ NUEVO: Estilos para la nueva estructura separada de imagen de fondo y overlay */
                <?php if (!empty($styles['background_image_url'])) : ?>
                /* Asegurar que el contenedor principal tenga posición relativa para los elementos absolutos */
                #sfq-form-<?php echo $form_id; ?> {
                    position: relative !important;
                }
                
                /* Estilos para el elemento de imagen de fondo separado */
                #sfq-form-<?php echo $form_id; ?> .sfq-background-image {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-size: <?php echo esc_attr($styles['background_size'] ?? 'cover'); ?>;
                    background-repeat: <?php echo esc_attr($styles['background_repeat'] ?? 'no-repeat'); ?>;
                    background-position: <?php echo esc_attr($styles['background_position'] ?? 'center center'); ?>;
                    background-attachment: <?php echo esc_attr($styles['background_attachment'] ?? 'scroll'); ?>;
                    opacity: <?php echo esc_attr($styles['background_opacity'] ?? '1'); ?>;
                    pointer-events: none;
                    border-radius: inherit;
                    z-index: 0;
                }
                
                <?php if (!empty($styles['background_overlay']) && $styles['background_overlay']) : ?>
                /* Estilos para el overlay separado */
                #sfq-form-<?php echo $form_id; ?> .sfq-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: <?php echo esc_attr($styles['background_overlay_color'] ?? '#000000'); ?>;
                    opacity: <?php echo esc_attr($styles['background_overlay_opacity'] ?? '0.3'); ?>;
                    pointer-events: none;
                    border-radius: inherit;
                    z-index: 1;
                }
                <?php endif; ?>
                
                /* Asegurar que el contenedor de contenido esté por encima */
                #sfq-form-<?php echo $form_id; ?> .sfq-content-wrapper {
                    position: relative;
                    z-index: 2;
                }
                <?php endif; ?>
                
                /* Aplicar estilos específicos con las variables CSS */
                #sfq-form-<?php echo $form_id; ?> {
                    border-radius: var(--sfq-form-container-border-radius) !important;
                    padding: var(--sfq-form-container-padding) !important;
                    <?php if (!empty($styles['form_container_shadow'])) : ?>
                    box-shadow: none !important;
                    <?php else : ?>
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1) !important;
                    <?php endif; ?>
                }
                
                #sfq-form-<?php echo $form_id; ?> .sfq-option-card {
                    <?php 
                    // Aplicar colores con opacidad
                    $options_bg_color = $styles['options_background_color'] ?? '#ffffff';
                    $options_bg_opacity = $styles['options_background_color_opacity'] ?? '1';
                    $options_border_color = $styles['options_border_color'] ?? '#e0e0e0';
                    $options_border_opacity = $styles['options_border_color_opacity'] ?? '1';
                    
                    // Convertir hex a rgba si hay opacidad diferente de 1
                    if ($options_bg_opacity != '1') {
                        $bg_rgba = $this->hex_to_rgba($options_bg_color, $options_bg_opacity);
                        echo "background-color: {$bg_rgba} !important;";
                    } else {
                        echo "background-color: {$options_bg_color} !important;";
                    }
                    
                    if ($options_border_opacity != '1') {
                        $border_rgba = $this->hex_to_rgba($options_border_color, $options_border_opacity);
                        echo "border-color: {$border_rgba} !important;";
                    } else {
                        echo "border-color: {$options_border_color} !important;";
                    }
                    ?>
                }
                
                /* Aplicar opacidad a otros elementos del formulario */
                #sfq-form-<?php echo $form_id; ?> {
                    <?php 
                    // Color de fondo principal con opacidad
                    $bg_color = $styles['background_color'] ?? '#ffffff';
                    $bg_opacity = $styles['background_color_opacity'] ?? '1';
                    if ($bg_opacity != '1') {
                        $bg_rgba = $this->hex_to_rgba($bg_color, $bg_opacity);
                        echo "background-color: {$bg_rgba} !important;";
                    }
                    
                    // Color de texto con opacidad
                    $text_color = $styles['text_color'] ?? '#333333';
                    $text_opacity = $styles['text_color_opacity'] ?? '1';
                    if ($text_opacity != '1') {
                        $text_rgba = $this->hex_to_rgba($text_color, $text_opacity);
                        echo "color: {$text_rgba} !important;";
                    }
                    ?>
                }
                
                /* Color primario con opacidad para botones y elementos activos */
                <?php 
                $primary_color = $styles['primary_color'] ?? '#007cba';
                $primary_opacity = $styles['primary_color_opacity'] ?? '1';
                if ($primary_opacity != '1') {
                    $primary_rgba = $this->hex_to_rgba($primary_color, $primary_opacity);
                    echo "#sfq-form-{$form_id} .sfq-button-primary { background-color: {$primary_rgba} !important; }";
                    echo "#sfq-form-{$form_id} .sfq-progress-fill { background: linear-gradient(90deg, {$primary_rgba}, var(--sfq-secondary-color)) !important; }";
                    echo "#sfq-form-{$form_id} .sfq-option-card.selected { border-color: {$primary_rgba} !important; }";
                    echo "#sfq-form-{$form_id} .sfq-text-input:focus { border-bottom-color: {$primary_rgba} !important; }";
                    echo "#sfq-form-{$form_id} .sfq-input-line { background: {$primary_rgba} !important; }";
                }
                ?>
                
                /* Color secundario con opacidad */
                <?php 
                $secondary_color = $styles['secondary_color'] ?? '#6c757d';
                $secondary_opacity = $styles['secondary_color_opacity'] ?? '1';
                if ($secondary_opacity != '1') {
                    $secondary_rgba = $this->hex_to_rgba($secondary_color, $secondary_opacity);
                    echo "#sfq-form-{$form_id} .sfq-button-secondary { background-color: {$secondary_rgba} !important; }";
                    echo "#sfq-form-{$form_id} .sfq-question-number { color: {$secondary_rgba} !important; }";
                }
                ?>
                
                /* Color de borde de inputs con opacidad */
                <?php 
                $input_border_color = $styles['input_border_color'] ?? '#ddd';
                $input_border_opacity = $styles['input_border_color_opacity'] ?? '1';
                if ($input_border_opacity != '1') {
                    $input_border_rgba = $this->hex_to_rgba($input_border_color, $input_border_opacity);
                    echo "#sfq-form-{$form_id} .sfq-text-input { border-bottom-color: {$input_border_rgba} !important; }";
                    echo "#sfq-form-{$form_id} .sfq-star svg { stroke: {$input_border_rgba} !important; }";
                }
                ?>
                
                #sfq-form-<?php echo $form_id; ?> .sfq-question-text {
                    font-size: var(--sfq-question-text-size) !important;
                    color: var(--sfq-question-text-color) !important;
                    text-align: var(--sfq-question-text-align) !important;
                }
                
                #sfq-form-<?php echo $form_id; ?> .sfq-intro-title {
                    color: var(--sfq-intro-title-color) !important;
                }
                
                #sfq-form-<?php echo $form_id; ?> .sfq-intro-description {
                    color: var(--sfq-intro-description-color) !important;
                }
                
                #sfq-form-<?php echo $form_id; ?> .sfq-option-text {
                    font-size: var(--sfq-option-text-size) !important;
                    text-align: var(--sfq-general-text-align) !important;
                }
                
                #sfq-form-<?php echo $form_id; ?> .sfq-question-content {
                    min-height: var(--sfq-question-content-min-height) !important;
                }
                
                /* Ancho del contenedor según configuración */
                <?php 
                $container_width = $styles['form_container_width'] ?? 'responsive';
                if ($container_width === 'full') : ?>
                #sfq-form-<?php echo $form_id; ?> {
                    max-width: 100% !important;
                    width: 100% !important;
                }
                <?php elseif ($container_width === 'custom') : ?>
                #sfq-form-<?php echo $form_id; ?> {
                    max-width: <?php echo esc_attr($styles['form_container_custom_width'] ?? '720'); ?>px !important;
                }
                <?php else : ?>
                #sfq-form-<?php echo $form_id; ?> {
                    max-width: 720px !important;
                }
                <?php endif; ?>
                
                /* Ancho del contenido de preguntas según configuración - aplicado a sfq-question-screen */
                <?php 
                $content_width = $styles['question_content_width'] ?? 'responsive';
                if ($content_width === 'full') : ?>
                #sfq-form-<?php echo $form_id; ?> .sfq-question-screen {
                    width: 100% !important;
                    max-width: 100% !important;
                }
                <?php elseif ($content_width === 'custom') : ?>
                #sfq-form-<?php echo $form_id; ?> .sfq-question-screen {
                    width: 100% !important;
                    max-width: <?php echo esc_attr($styles['question_content_custom_width'] ?? '600'); ?>px !important;
                    margin: 0 auto !important;
                }
                <?php else : ?>
                #sfq-form-<?php echo $form_id; ?> .sfq-question-screen {
                    width: 100% !important;
                    max-width: 720px !important;
                    margin: 0 auto !important;
                }
                <?php endif; ?>
                
                /* ✅ MEJORADO: Ocultar pantallas finales con múltiples técnicas para máxima compatibilidad */
                #sfq-form-<?php echo $form_id; ?> .sfq-question-screen[data-pantalla-final="true"]:not(.sfq-conditional-access),
                #sfq-form-<?php echo $form_id; ?> .sfq-final-screen-hidden:not(.sfq-conditional-access) {
                    display: none !important;
                    visibility: hidden !important;
                    position: absolute !important;
                    left: -9999px !important;
                    top: -9999px !important;
                    opacity: 0 !important;
                    pointer-events: none !important;
                    z-index: -1 !important;
                }
                
                /* ✅ MEJORADO: Mostrar pantallas finales solo cuando se accede por lógica condicional */
                #sfq-form-<?php echo $form_id; ?> .sfq-question-screen[data-pantalla-final="true"].sfq-conditional-access,
                #sfq-form-<?php echo $form_id; ?> .sfq-final-screen-hidden.sfq-conditional-access {
                    display: block !important;
                    visibility: visible !important;
                    position: relative !important;
                    left: auto !important;
                    top: auto !important;
                    opacity: 1 !important;
                    pointer-events: auto !important;
                    z-index: auto !important;
                }
                
                /* ✅ NUEVO: Asegurar que las pantallas finales nunca aparezcan en navegación secuencial */
                #sfq-form-<?php echo $form_id; ?> .sfq-question-screen.active[data-pantalla-final="true"]:not(.sfq-conditional-access) {
                    display: none !important;
                }
                
                /* ✅ NUEVO: Estilos para alineación del botón personalizado usando el selector correcto */
                <?php 
                // Aplicar estilos de alineación para botones personalizados
                foreach ($form->questions as $question) {
                    if ($question->question_type === 'freestyle' && 
                        isset($question->settings['next_button_custom_style']) && 
                        $question->settings['next_button_custom_style'] && 
                        isset($question->settings['next_button_style']['alignment'])) {
                        
                        $alignment = $question->settings['next_button_style']['alignment'];
                        $question_selector = '[data-question-id="' . $question->id . '"]';
                        
                        switch ($alignment) {
                            case 'left':
                                echo "#sfq-form-{$form_id} {$question_selector} .sfq-navigation:has(.sfq-next-button:only-child) { justify-content: flex-start !important; }\n";
                                break;
                            case 'center':
                                echo "#sfq-form-{$form_id} {$question_selector} .sfq-navigation:has(.sfq-next-button:only-child) {  justify-content: center !important; }\n";
                                break;
                            case 'right':
                                echo "#sfq-form-{$form_id} {$question_selector} .sfq-navigation:has(.sfq-next-button:only-child) { justify-content: flex-end !important; }\n";
                                break;
                        }
                    }
                }
                ?>
            </style>
        <?php endif; ?>
        
        <?php
        return ob_get_clean();
    }
    
    /**
     * Renderizar tipo de pregunta específico con imagen y video posicionados
     */
    private function render_question_type($question) {
        // Verificar si la pregunta tiene imagen configurada
        $settings = $question->settings ?? array();
        $has_image = !empty($settings['question_image']) && 
                     is_array($settings['question_image']) && 
                     !empty($settings['question_image']['url']);
        
        // ✅ NUEVO: Verificar si la pregunta tiene video configurado
        $has_video = !empty($settings['question_video']) && 
                     is_array($settings['question_video']) && 
                     !empty($settings['question_video']['url']);
        
        if ($has_image || $has_video) {
            $this->render_question_with_positioned_media($question);
        } else {
            $this->render_question_without_media($question);
        }
    }
    
    /**
     * Renderizar pregunta con imagen y/o video posicionados correctamente
     */
    private function render_question_with_positioned_media($question) {
        $settings = $question->settings ?? array();
        
        // Configuración de imagen
        $image_config = $settings['question_image'] ?? null;
        $has_image = $image_config && !empty($image_config['url']);
        
        // ✅ NUEVO: Configuración de video
        $video_config = $settings['question_video'] ?? null;
        $has_video = $video_config && !empty($video_config['url']);
        
        // Determinar posición (priorizar imagen si ambos están presentes)
        $position = 'top';
        $width = 300;
        $shadow = false;
        $mobile_force = false;
        $mobile_width = null;
        
        if ($has_image) {
            $position = $image_config['position'] ?? 'top';
            $width = $image_config['width'] ?? 300;
            $shadow = $image_config['shadow'] ?? false;
            $mobile_force = $image_config['mobile_force_position'] ?? false;
            $mobile_width = $image_config['mobile_width'] ?? null;
        } elseif ($has_video) {
            $position = $video_config['position'] ?? 'top';
            $width = $video_config['width'] ?? 300;
            $shadow = $video_config['shadow'] ?? false;
            $mobile_force = $video_config['mobile_force_position'] ?? false;
            $mobile_width = $video_config['mobile_width'] ?? null;
        }
        
        // Clases CSS para posicionamiento
        $container_classes = array('sfq-question-with-media');
        $container_classes[] = 'position-' . $position;
        
        if ($mobile_force) {
            $container_classes[] = 'mobile-force-position';
        }
        
        // ✅ NUEVO: Preparar atributos para ancho móvil personalizado
        $mobile_width_attr = '';
        $mobile_width_style = '';
        if ($mobile_force && !empty($mobile_width)) {
            $mobile_width_attr = 'data-mobile-width="' . intval($mobile_width) . '"';
            $mobile_width_style = '--sfq-mobile-media-width: ' . intval($mobile_width) . 'px;';
        }
        
        ?>
        <div class="<?php echo esc_attr(implode(' ', $container_classes)); ?>" 
             <?php echo !empty($mobile_width_style) ? 'style="' . esc_attr($mobile_width_style) . '"' : ''; ?>>
            <?php if ($position === 'top') : ?>
                <!-- Media arriba -->
                <div class="sfq-question-media-container" 
                     style="width: <?php echo intval($width); ?>px; max-width: 100%; margin: auto;"
                     <?php echo $mobile_width_attr; ?>>
                    <?php $this->render_question_media_content($question, $shadow); ?>
                </div>
                <!-- Contenido de la pregunta -->
                <?php $this->render_question_without_media($question); ?>
            <?php elseif ($position === 'bottom') : ?>
                <!-- Contenido de la pregunta -->
                <?php $this->render_question_without_media($question); ?>
                <!-- Media abajo -->
                <div class="sfq-question-media-container" 
                     style="width: <?php echo intval($width); ?>px; max-width: 100%; margin: auto;"
                     <?php echo $mobile_width_attr; ?>>
                    <?php $this->render_question_media_content($question, $shadow); ?>
                </div>
            <?php else : ?>
                <!-- Media a la izquierda o derecha -->
                <div class="sfq-question-media-container" 
                     style="width: <?php echo intval($width); ?>px; max-width: 100%;"
                     <?php echo $mobile_width_attr; ?>>
                    <?php $this->render_question_media_content($question, $shadow); ?>
                </div>
                <!-- Contenido de la pregunta -->
                <div class="sfq-question-content-with-media">
                    <?php $this->render_question_without_media($question); ?>
                </div>
            <?php endif; ?>
        </div>
        <?php
    }
    
    /**
     * ✅ NUEVO: Renderizar contenido de media (imagen y/o video) de la pregunta
     */
    private function render_question_media_content($question, $shadow = false) {
        $settings = $question->settings ?? array();
        
        // Configuración de imagen
        $image_config = $settings['question_image'] ?? null;
        $has_image = $image_config && !empty($image_config['url']);
        
        // Configuración de video
        $video_config = $settings['question_video'] ?? null;
        $has_video = $video_config && !empty($video_config['url']);
        
        // Clases para el contenedor de media
        $media_classes = array('sfq-question-media');
        if ($shadow) {
            $media_classes[] = 'with-shadow';
        }
        
        ?>
        <div class="<?php echo esc_attr(implode(' ', $media_classes)); ?>">
            <?php if ($has_video) : ?>
                <!-- ✅ NUEVO: Renderizar video primero si está presente -->
                <?php $this->render_question_video_content($video_config); ?>
                <?php if ($has_image) : ?>
                    <!-- Separador entre video e imagen -->
                    <div style="margin: 15px 0;"></div>
                <?php endif; ?>
            <?php endif; ?>
            
            <?php if ($has_image) : ?>
                <!-- Renderizar imagen -->
                <?php $this->render_question_image_content($image_config); ?>
            <?php endif; ?>
        </div>
        <?php
    }
    
    /**
     * ✅ NUEVO: Renderizar contenido de video de pregunta
     */
    private function render_question_video_content($video_config) {
        $video_url = $video_config['url'];
        $video_alt = $video_config['alt'] ?? 'Video de la pregunta';
        
        // Convertir URL de video a embed
        $video_embed = $this->convert_video_url_to_embed($video_url);
        
        if ($video_embed) {
            ?>
            <div class="sfq-question-video-embed" style="width: 100%; margin-bottom: 10px;">
                <?php echo $video_embed; ?>
            </div>
            <?php
        } else {
            ?>
            <div class="sfq-question-video-error" style="padding: 20px; background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; text-align: center;">
                <p style="margin: 0; color: #6c757d;">
                    <?php _e('No se pudo cargar el video. Verifica que la URL sea válida.', 'smart-forms-quiz'); ?>
                </p>
            </div>
            <?php
        }
    }
    
    /**
     * ✅ NUEVO: Renderizar contenido de imagen de pregunta
     */
    private function render_question_image_content($image_config) {
        $image_url = $image_config['url'];
        $image_alt = $image_config['alt'] ?? 'Imagen de la pregunta';
        
        ?>
        <img src="<?php echo esc_url($image_url); ?>" 
             alt="<?php echo esc_attr($image_alt); ?>"
             class="sfq-question-image-element"
             style="width: 100%; height: auto; display: block;"
             loading="lazy">
        <?php
    }
    
    /**
     * Renderizar pregunta sin media (método original renombrado)
     */
    private function render_question_without_media($question) {
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
     * Renderizar pregunta sin imagen (método original - mantenido para compatibilidad)
     */
    private function render_question_without_image($question) {
        return $this->render_question_without_media($question);
    }
    
    /**
     * Renderizar opción única (cards modernas)
     */
    private function render_single_choice($question) {
        if (empty($question->options)) {
            return;
        }
        
        // ✅ NUEVO: Obtener condiciones de la pregunta
        $question_conditions = $this->get_question_conditions_for_frontend($question->id);
        
        ?>
        <div class="sfq-options-grid sfq-single-choice" data-question-id="<?php echo $question->id; ?>">
            <?php foreach ($question->options as $index => $option) : ?>
                <?php 
                // ✅ CRÍTICO: Normalizar opción a array para acceso consistente
                $option_data = is_object($option) ? (array) $option : $option;
                $option_text = $option_data['text'] ?? '';
                $option_value = $option_data['value'] ?? $option_text;
                $option_icon = $option_data['icon'] ?? '';
                
                // ✅ CORREGIDO: Obtener condiciones que aplican a esta opción específica
                $option_conditions = $this->get_conditions_for_option_value($question_conditions, $option_value);
                ?>
                <div class="sfq-option-card" 
                     data-value="<?php echo esc_attr($option_value); ?>"
                     data-conditions='<?php echo json_encode($option_conditions); ?>'
                     data-has-conditions="<?php echo !empty($option_conditions) ? 'true' : 'false'; ?>">
                    
                    <?php if (!empty($option_icon)) : ?>
                        <span class="sfq-option-icon"><?php echo esc_html($option_icon); ?></span>
                    <?php endif; ?>
                    
                    <span class="sfq-option-text"><?php echo esc_html($option_text); ?></span>
                    
                    <input type="radio" 
                           name="question_<?php echo $question->id; ?>" 
                           value="<?php echo esc_attr($option_value); ?>"
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
                <?php 
                // ✅ CRÍTICO: Normalizar opción a array para acceso consistente
                $option_data = is_object($option) ? (array) $option : $option;
                $option_text = $option_data['text'] ?? '';
                $option_value = $option_data['value'] ?? $option_text;
                ?>
                <div class="sfq-option-card sfq-checkbox-card" 
                     data-value="<?php echo esc_attr($option_value); ?>">
                    
                    <div class="sfq-checkbox-wrapper">
                        <input type="checkbox" 
                               name="question_<?php echo $question->id; ?>[]" 
                               value="<?php echo esc_attr($option_value); ?>"
                               id="option_<?php echo $question->id; ?>_<?php echo $index; ?>"
                               class="sfq-checkbox-input">
                        
                        <label for="option_<?php echo $question->id; ?>_<?php echo $index; ?>">
                            <span class="sfq-checkbox-box">
                                <svg class="sfq-checkbox-icon" viewBox="0 0 24 24">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                                </svg>
                            </span>
                            <span class="sfq-option-text"><?php echo esc_html($option_text); ?></span>
                        </label>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
        <?php
    }
    
    
    /**
     * Renderizar campo de email
     */
    private function render_email_input($question) {
        $settings = $question->settings ?: array();
        
        // Obtener todas las condiciones de la pregunta
        $question_conditions = $this->get_question_conditions_for_frontend($question->id);
        // Las condiciones para inputs de texto se evalúan en base a la respuesta del input
        $input_conditions = $this->get_conditions_for_input_field($question_conditions);
        ?>
        <div class="sfq-input-wrapper">
            <input type="email" 
                   name="question_<?php echo $question->id; ?>" 
                   class="sfq-text-input sfq-email-input"
                   placeholder="<?php echo esc_attr($settings['placeholder'] ?? 'tu@email.com'); ?>"
                   data-conditions='<?php echo json_encode($input_conditions); ?>'
                   data-has-conditions="<?php echo !empty($input_conditions) ? 'true' : 'false'; ?>"
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
        
        // Obtener todas las condiciones de la pregunta
        $question_conditions = $this->get_question_conditions_for_frontend($question->id);
        
        
        
        ?>
        <div class="sfq-rating-wrapper" data-question-id="<?php echo $question->id; ?>" data-type="<?php echo $type; ?>">
            <?php if ($type === 'stars') : ?>
                <div class="sfq-stars-rating">
                    <?php for ($i = 1; $i <= $max; $i++) : ?>
                        <?php
                        // Filtrar condiciones para el valor de calificación actual
                        $rating_conditions = $this->get_conditions_for_option_value($question_conditions, (string)$i);
                        ?>
                        <button class="sfq-star"
                                data-value="<?php echo $i; ?>"
                                type="button"
                                data-conditions='<?php echo json_encode($rating_conditions); ?>'
                                data-has-conditions="<?php echo !empty($rating_conditions) ? 'true' : 'false'; ?>">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                        </button>
                    <?php endfor; ?>
                    <input type="hidden" name="question_<?php echo $question->id; ?>" value="">
                </div>
            <?php else : ?>
                <div class="sfq-emoji-rating">
                    <?php
                    $default_emojis = array('😞', '😐', '🙂', '😊', '😍');
                    for ($i = 1; $i <= $max; $i++) :
                        $emoji = $settings['icons'][$i-1] ?? $default_emojis[$i-1] ?? '⭐';
                        // Filtrar condiciones para el valor de calificación actual
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
    
    /**
     * Renderizar selección de imagen
     */
    private function render_image_choice($question) {
        if (empty($question->options)) {
            return;
        }
        
        // ✅ NUEVO: Obtener condiciones de la pregunta
        $question_conditions = $this->get_question_conditions_for_frontend($question->id);
        
        ?>
        <div class="sfq-image-grid" data-question-id="<?php echo $question->id; ?>">
            <?php foreach ($question->options as $index => $option) : ?>
                <?php 
                // ✅ CRÍTICO: Normalizar opción a array para acceso consistente
                $option_data = is_object($option) ? (array) $option : $option;
                $option_image = $option_data['image'] ?? '';
                $option_text = $option_data['text'] ?? '';
                $option_value = $option_data['value'] ?? $option_text;
                $option_alt = $option_data['image_alt'] ?? $option_text;
                
                // ✅ CORREGIDO: Obtener condiciones que aplican a esta opción específica
                $option_conditions = $this->get_conditions_for_option_value($question_conditions, $option_value);
                ?>
                <div class="sfq-image-option" 
                     data-value="<?php echo esc_attr($option_value); ?>"
                     data-conditions='<?php echo json_encode($option_conditions); ?>'
                     data-has-conditions="<?php echo !empty($option_conditions) ? 'true' : 'false'; ?>">
                    
                    <?php if (!empty($option_image)) : ?>
                        <img src="<?php echo esc_url($option_image); ?>" 
                             alt="<?php echo esc_attr($option_alt); ?>"
                             loading="lazy">
                    <?php else : ?>
                        <div class="sfq-image-placeholder">
                            <span class="dashicons dashicons-format-image"></span>
                        </div>
                    <?php endif; ?>
                    
                    <?php if (!empty($option_text)) : ?>
                        <span class="sfq-image-label"><?php echo esc_html($option_text); ?></span>
                    <?php endif; ?>
                    
                    <input type="radio" 
                           name="question_<?php echo $question->id; ?>" 
                           value="<?php echo esc_attr($option_value); ?>"
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
                box-shadow: var(--sfq-shadow);
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
        if (is_string($content) && strpos($content, '<svg') === 0) {
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
        if (is_string($content) && strpos($content, '<') !== false && strpos($content, '>') !== false) {
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
     * Renderizar campo de texto
     */
    private function render_text_input($question) {
        $settings = $question->settings ?: array();
        
        // Obtener todas las condiciones de la pregunta
        $question_conditions = $this->get_question_conditions_for_frontend($question->id);
        // Las condiciones para inputs de texto se evalúan en base a la respuesta del input
        $input_conditions = $this->get_conditions_for_input_field($question_conditions);
        ?>
        <div class="sfq-input-wrapper">
            <input type="text" 
                   name="question_<?php echo $question->id; ?>" 
                   class="sfq-text-input"
                   placeholder="<?php echo esc_attr($settings['placeholder'] ?? __('Escribe tu respuesta aquí...', 'smart-forms-quiz')); ?>"
                   data-conditions='<?php echo json_encode($input_conditions); ?>'
                   data-has-conditions="<?php echo !empty($input_conditions) ? 'true' : 'false'; ?>"
                   <?php echo $question->required ? 'required' : ''; ?>>
            <div class="sfq-input-line"></div>
        </div>
        <?php
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
     * ✅ NUEVO: Renderizar script para limpiar localStorage del timer hide-all
     */
    private function render_timer_cleanup_script($form_id) {
        ob_start();
        ?>
        <div class="sfq-timer-cleanup-container" id="sfq-form-<?php echo $form_id; ?>">
            <script>
            (function() {
                'use strict';
                
                const formId = <?php echo intval($form_id); ?>;
                
                // Limpiar todos los estados relacionados con el timer de este formulario
                localStorage.removeItem('sfq_timer_expired_' + formId);
                localStorage.removeItem('sfq_timer_expired_hide_all_' + formId);
                
                // Ocultar el contenedor inmediatamente
                const container = document.getElementById('sfq-form-' + formId);
                if (container) {
                    container.style.display = 'none';
                    container.style.visibility = 'hidden';
                    container.style.opacity = '0';
                    container.style.height = '0';
                    container.style.overflow = 'hidden';
                    container.style.margin = '0';
                    container.style.padding = '0';
                }
                
                console.log('SFQ Timer: Cleaned up localStorage and hid container for form', formId);
            })();
            </script>
        </div>
        <?php
        return ob_get_clean();
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
        
        // Detectar YouTube (incluyendo Shorts)
        if (preg_match('/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/', $url, $matches)) {
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

        // 1. Obtener todas las condiciones de la pregunta
        $question_conditions = $this->get_question_conditions_for_frontend($question->id);
        $has_conditions = !empty($question_conditions) ? 'true' : 'false';
        ?>
        <div class="sfq-freestyle-container" 
             data-question-id="<?php echo $question->id; ?>"
             data-layout="<?php echo esc_attr($layout); ?>"
             data-spacing="<?php echo esc_attr($spacing); ?>"
             data-pantalla-final="<?php echo (isset($question->pantallaFinal) && $question->pantallaFinal) ? 'true' : 'false'; ?>"
             data-conditions='<?php echo json_encode($question_conditions); ?>'
             data-has-conditions="<?php echo $has_conditions; ?>">
            
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
                        <?php $this->render_freestyle_element($element, $question->id, $question_conditions); ?>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
        <?php
    }
    
    /**
     * Renderizar elemento freestyle específico
     */
    private function render_freestyle_element($element, $question_id, $question_conditions) { // Added $question_conditions
        $element_id = $element['id'];
        $element_type = $element['type'];
        $settings = $element['settings'] ?? array();
        
        switch ($element_type) {
            case 'text':
                $this->render_freestyle_text($element, $question_id, $question_conditions);
                break;
                
            case 'email':
                $this->render_freestyle_email($element, $question_id, $question_conditions);
                break;
                
            case 'phone':
                $this->render_freestyle_phone($element, $question_id, $question_conditions);
                break;
                
            case 'video':
                $this->render_freestyle_video($element, $question_id, $question_conditions);
                break;
                
            case 'image':
                $this->render_freestyle_image($element, $question_id, $question_conditions);
                break;
                
            case 'file_upload':
                $this->render_freestyle_file_upload($element, $question_id, $question_conditions);
                break;
                
            case 'button':
                $this->render_freestyle_button($element, $question_id, $question_conditions);
                break;
                
            case 'rating':
                $this->render_freestyle_rating($element, $question_id, $question_conditions);
                break;
                
            case 'dropdown':
                $this->render_freestyle_dropdown($element, $question_id, $question_conditions);
                break;
                
            case 'checkbox':
                $this->render_freestyle_checkbox($element, $question_id, $question_conditions);
                break;
                
            case 'countdown':
                $this->render_freestyle_countdown($element, $question_id, $question_conditions);
                break;
                
            case 'legal_text':
                $this->render_freestyle_legal_text($element, $question_id, $question_conditions);
                break;
                
            case 'variable_display':
                $this->render_freestyle_variable_display($element, $question_id, $question_conditions);
                break;
                
            case 'styled_text':
                $this->render_freestyle_styled_text($element, $question_id, $question_conditions);
                break;
                
            default:
                echo '<p>' . sprintf(__('Tipo de elemento "%s" no soportado', 'smart-forms-quiz'), esc_html($element_type)) . '</p>';
        }
    }
    
    /**
     * Renderizar elemento de texto freestyle
     */
    private function render_freestyle_text($element, $question_id, $question_conditions) { // Added $question_conditions
        $settings = $element['settings'] ?? array();
        $placeholder = $settings['placeholder'] ?? __('Escribe aquí...', 'smart-forms-quiz');
        $max_length = $settings['max_length'] ?? '';
        $multiline = $settings['multiline'] ?? false;
        
        // Obtener condiciones relevantes para este campo de texto freestyle
        $element_conditions = $this->get_conditions_for_freestyle_input_field($question_conditions);
        ?>
        <div class="sfq-freestyle-text-wrapper">
            <?php if ($multiline) : ?>
                <textarea name="freestyle[<?php echo $question_id; ?>][<?php echo $element['id']; ?>]"
                          id="element_<?php echo $element['id']; ?>"
                          class="sfq-freestyle-textarea"
                          placeholder="<?php echo esc_attr($placeholder); ?>"
                          data-conditions='<?php echo json_encode($element_conditions); ?>'
                          data-has-conditions="<?php echo !empty($element_conditions) ? 'true' : 'false'; ?>"
                          <?php echo $max_length ? 'maxlength="' . esc_attr($max_length) . '"' : ''; ?>
                          rows="<?php echo esc_attr($settings['rows'] ?? 3); ?>"></textarea>
            <?php else : ?>
                <input type="text" 
                       name="freestyle[<?php echo $question_id; ?>][<?php echo $element['id']; ?>]"
                       id="element_<?php echo $element['id']; ?>"
                       class="sfq-freestyle-input"
                       placeholder="<?php echo esc_attr($placeholder); ?>"
                       data-conditions='<?php echo json_encode($element_conditions); ?>'
                       data-has-conditions="<?php echo !empty($element_conditions) ? 'true' : 'false'; ?>"
                       <?php echo $max_length ? 'maxlength="' . esc_attr($max_length) . '"' : ''; ?>>
            <?php endif; ?>
            <div class="sfq-input-line"></div>
        </div>
        <?php
    }
    
    /**
     * Renderizar elemento de email freestyle
     */
    private function render_freestyle_email($element, $question_id, $question_conditions) { // Added $question_conditions
        $settings = $element['settings'] ?? array();
        $placeholder = $settings['placeholder'] ?? 'tu@email.com';
        
        // Obtener condiciones relevantes para este campo de email freestyle
        $element_conditions = $this->get_conditions_for_freestyle_input_field($question_conditions);
        ?>
        <div class="sfq-freestyle-email-wrapper">
            <input type="email" 
                   name="freestyle[<?php echo $question_id; ?>][<?php echo $element['id']; ?>]"
                   id="element_<?php echo $element['id']; ?>"
                   class="sfq-freestyle-input sfq-email-input"
                   placeholder="<?php echo esc_attr($placeholder); ?>"
                   data-conditions='<?php echo json_encode($element_conditions); ?>'
                   data-has-conditions="<?php echo !empty($element_conditions) ? 'true' : 'false'; ?>">
            <div class="sfq-input-line"></div>
            <span class="sfq-input-error"><?php _e('Por favor, introduce un email válido', 'smart-forms-quiz'); ?></span>
        </div>
        <?php
    }
    
    /**
     * Renderizar elemento de teléfono freestyle
     */
    private function render_freestyle_phone($element, $question_id, $question_conditions) { // Added $question_conditions
        $settings = $element['settings'] ?? array();
        $placeholder = $settings['placeholder'] ?? '+34 600 000 000';
        $pattern = $settings['pattern'] ?? '';
        
        // Obtener condiciones relevantes para este campo de teléfono freestyle
        $element_conditions = $this->get_conditions_for_freestyle_input_field($question_conditions);
        ?>
        <div class="sfq-freestyle-phone-wrapper">
            <input type="tel" 
                   name="freestyle[<?php echo $question_id; ?>][<?php echo $element['id']; ?>]"
                   id="element_<?php echo $element['id']; ?>"
                   class="sfq-freestyle-input sfq-phone-input"
                   placeholder="<?php echo esc_attr($placeholder); ?>"
                   data-conditions='<?php echo json_encode($element_conditions); ?>'
                   data-has-conditions="<?php echo !empty($element_conditions) ? 'true' : 'false'; ?>"
                   <?php echo $pattern ? 'pattern="' . esc_attr($pattern) . '"' : ''; ?>>
            <div class="sfq-input-line"></div>
        </div>
        <?php
    }
    
    /**
     * Renderizar elemento de video freestyle
     */
    private function render_freestyle_video($element, $question_id, $question_conditions) { // Added $question_conditions
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
    private function render_freestyle_image($element, $question_id, $question_conditions) { // Added $question_conditions
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

        $image_conditions = array();
        if ($clickable) {
            // If clickable, treat it like a button with a 'clicked' value
            $image_conditions = $this->get_conditions_for_option_value($question_conditions, 'clicked');
        }
        ?>
        <div class="sfq-freestyle-image-wrapper">
            <?php if ($clickable) : ?>
                <div class="sfq-clickable-image" 
                     data-element-id="<?php echo $element['id']; ?>"
                     data-value="clicked"
                     data-conditions='<?php echo json_encode($image_conditions); ?>'
                     data-has-conditions="<?php echo !empty($image_conditions) ? 'true' : 'false'; ?>"
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
    private function render_freestyle_file_upload($element, $question_id, $question_conditions) { // Added $question_conditions
        $settings = $element['settings'] ?? array();
        $accept = $settings['accept'] ?? 'image/*';
        $max_size = $settings['max_size'] ?? '5MB';
        $multiple = $settings['multiple'] ?? false;

        // For file upload, conditions might be based on 'file_uploaded' or similar.
        // For now, we'll pass all relevant conditions for input fields, and the JS will handle it.
        $element_conditions = $this->get_conditions_for_freestyle_input_field($question_conditions);
        ?>
        <div class="sfq-freestyle-file-wrapper">
            <div class="sfq-file-upload-area" 
                 data-element-id="<?php echo $element['id']; ?>"
                 data-conditions='<?php echo json_encode($element_conditions); ?>'
                 data-has-conditions="<?php echo !empty($element_conditions) ? 'true' : 'false'; ?>">
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
    private function render_freestyle_button($element, $question_id, $question_conditions) { // Added $question_conditions
        $settings = $element['settings'] ?? array();
        $button_text = $settings['button_text'] ?? $element['label'] ?? __('Botón', 'smart-forms-quiz');
        $button_url = $settings['button_url'] ?? '';
        $open_new_tab = $settings['open_new_tab'] ?? false;
        $css_selector = $settings['css_selector'] ?? '';
        
        // Aplicar estilos personalizados desde las configuraciones
        $styles = array();
        
        // Tamaño de fuente
        if (!empty($settings['font_size'])) {
            $styles['font-size'] = intval($settings['font_size']) . 'px';
        }
        
        // Tipo de fuente
        if (!empty($settings['font_family'])) {
            $styles['font-family'] = $settings['font_family'];
        }
        
        // Peso de fuente (negrita) - CORREGIDO: Verificar tanto font_weight como font_bold
        if (!empty($settings['font_weight'])) {
            $styles['font-weight'] = $settings['font_weight'];
        } elseif (!empty($settings['font_bold']) && $settings['font_bold']) {
            $styles['font-weight'] = 'bold';
        }
        
        // Estilo de fuente (cursiva) - CORREGIDO: Verificar tanto font_style como italic
        if (!empty($settings['font_style']) && $settings['font_style'] === 'italic') {
            $styles['font-style'] = 'italic';
        } elseif (!empty($settings['font_italic']) && $settings['font_italic']) {
            $styles['font-style'] = 'italic';
        }
        
        // Decoración de texto (tachado) - CORREGIDO: Verificar tanto text_decoration como font_strikethrough
        if (!empty($settings['text_decoration']) && $settings['text_decoration'] === 'line-through') {
            $styles['text-decoration'] = 'line-through';
        } elseif (!empty($settings['font_strikethrough']) && $settings['font_strikethrough']) {
            $styles['text-decoration'] = 'line-through';
        }
        
        // Alineación de texto
        if (!empty($settings['text_align'])) {
            $styles['text-align'] = $settings['text_align'];
        }
        
        // Color de texto
        if (!empty($settings['text_color'])) {
            $styles['color'] = $settings['text_color'];
        }
        
        // ✅ NUEVO: Verificar si el gradiente animado está habilitado
        $gradient_enabled = false;
        if (isset($settings['gradient_enabled'])) {
            $gradient_enabled = ($settings['gradient_enabled'] === true || 
                               $settings['gradient_enabled'] === 'true' || 
                               $settings['gradient_enabled'] === '1' || 
                               $settings['gradient_enabled'] === 1);
        }
        
        if ($gradient_enabled) {
            // ✅ CORREGIDO: No aplicar opacidad directamente al botón para evitar afectar el texto
            // El gradiente se aplicará mediante pseudo-elemento en el CSS
            
            // ✅ NUEVO: Aplicar efectos adicionales si están configurados
            if (!empty($settings['gradient_blur']) && intval($settings['gradient_blur']) > 0) {
                $blur = intval($settings['gradient_blur']);
                $styles['backdrop-filter'] = "blur({$blur}px)";
                $styles['-webkit-backdrop-filter'] = "blur({$blur}px)";
            }
            
            if (!empty($settings['gradient_saturate']) && $settings['gradient_saturate'] !== '100') {
                $saturate = intval($settings['gradient_saturate']);
                $styles['filter'] = "saturate({$saturate}%)";
            }
            
        } else {
            // Color de fondo sólido con opacidad (comportamiento original)
            if (!empty($settings['background_color'])) {
                $bg_color = $settings['background_color'];
                $bg_opacity = $settings['background_opacity'] ?? '1';
                
                if ($bg_opacity != '1') {
                    $styles['background-color'] = $this->hex_to_rgba($bg_color, $bg_opacity);
                } else {
                    $styles['background-color'] = $bg_color;
                }
            }
        }
        
        // Color de borde con opacidad
        if (!empty($settings['border_color'])) {
            $border_color = $settings['border_color'];
            $border_opacity = $settings['border_opacity'] ?? '1';
            
            if ($border_opacity != '1') {
                $border_rgba = $this->hex_to_rgba($border_color, $border_opacity);
                $styles['border'] = '2px solid ' . $border_rgba;
            } else {
                $styles['border'] = '2px solid ' . $border_color;
            }
        }
        
        // Radio del borde
        if (!empty($settings['border_radius'])) {
            $styles['border-radius'] = intval($settings['border_radius']) . 'px';
        }
        
        // Sombra de texto
        if (!empty($settings['text_shadow']) && $settings['text_shadow']) {
            $styles['text-shadow'] = '2px 2px 4px rgba(0,0,0,0.3)';
        }
        
        // Sombra del recuadro
        if (!empty($settings['box_shadow']) && $settings['box_shadow']) {
            $styles['box-shadow'] = '0 4px 8px rgba(0,0,0,0.1)';
        }
        
        // Padding y estilos básicos del botón
        $styles['padding'] = '12px 24px';
        $styles['border'] = $styles['border'] ?? 'none';
        $styles['cursor'] = 'pointer';
        $styles['transition'] = 'all 0.2s ease';
        $styles['text-decoration'] = $styles['text-decoration'] ?? 'none';
        $styles['display'] = 'inline-block';
        $styles['position'] = 'relative';
        $styles['overflow'] = 'hidden';
        
        // Convertir array de estilos a string CSS
        $style_string = '';
        foreach ($styles as $property => $value) {
            $style_string .= $property . ': ' . $value . '; ';
        }
        
        // Clases CSS adicionales
        $css_classes = 'sfq-freestyle-button';
        if (!empty($css_selector)) {
            $css_classes .= ' ' . esc_attr($css_selector);
        }
        if ($gradient_enabled) {
            $css_classes .= ' sfq-gradient-button';
        }
        
        // ✅ NUEVO: Generar ID único para el botón si tiene gradiente
        $unique_id = '';
        if ($gradient_enabled) {
            $unique_id = 'sfq-gradient-btn-' . $element['id'] . '-' . substr(md5($question_id . $element['id']), 0, 8);
        }

        // For buttons, the data-value is 'clicked'
        $button_conditions = $this->get_conditions_for_option_value($question_conditions, 'clicked');
        ?>
        <div class="sfq-freestyle-button-wrapper" style="text-align: <?php echo esc_attr($settings['text_align'] ?? 'left'); ?>;">
            <?php if (!empty($button_url)) : ?>
                <a href="<?php echo esc_url($button_url); ?>" 
                   class="<?php echo esc_attr($css_classes); ?>"
                   <?php echo $unique_id ? 'id="' . esc_attr($unique_id) . '"' : ''; ?>
                   <?php echo $open_new_tab ? 'target="_blank" rel="noopener"' : ''; ?>
                   data-element-id="<?php echo esc_attr($element['id']); ?>"
                   data-value="clicked"
                   data-conditions='<?php echo json_encode($button_conditions); ?>'
                   data-has-conditions="<?php echo !empty($button_conditions) ? 'true' : 'false'; ?>"
                   <?php if ($gradient_enabled && !empty($settings['gradient_hover_pause']) && $settings['gradient_hover_pause']) : ?>
                   data-hover-pause="true"
                   <?php endif; ?>
                   style="<?php echo esc_attr(trim($style_string)); ?>">
                    <?php echo esc_html($button_text); ?>
                </a>
            <?php else : ?>
                <button type="button" 
                        class="<?php echo esc_attr($css_classes); ?>"
                        <?php echo $unique_id ? 'id="' . esc_attr($unique_id) . '"' : ''; ?>
                        data-element-id="<?php echo esc_attr($element['id']); ?>"
                        data-value="clicked"
                        data-conditions='<?php echo json_encode($button_conditions); ?>'
                        data-has-conditions="<?php echo !empty($button_conditions) ? 'true' : 'false'; ?>"
                        <?php if ($gradient_enabled && !empty($settings['gradient_hover_pause']) && $settings['gradient_hover_pause']) : ?>
                        data-hover-pause="true"
                        <?php endif; ?>
                        style="<?php echo esc_attr(trim($style_string)); ?>">
                    <?php echo esc_html($button_text); ?>
                </button>
            <?php endif; ?>
            
            <input type="hidden" 
                   name="freestyle[<?php echo $question_id; ?>][<?php echo $element['id']; ?>]"
                   value=""
                   class="sfq-button-click-tracker">
        </div>
        
        <?php if ($gradient_enabled) : ?>
        <!-- ✅ CORREGIDO: CSS específico para este botón con gradiente -->
        <?php
        // ✅ CORREGIDO: Definir variables del gradiente aquí
        $color1 = $settings['gradient_color_1'] ?? '#ee7752';
        $color2 = $settings['gradient_color_2'] ?? '#e73c7e';
        $color3 = $settings['gradient_color_3'] ?? '#23a6d5';
        $color4 = $settings['gradient_color_4'] ?? '#23d5ab';
        $angle = $settings['gradient_angle'] ?? '-45';
        $size = $settings['gradient_size'] ?? '400';
        $speed = $settings['gradient_speed'] ?? '15';
        $opacity = $settings['gradient_opacity'] ?? '1';
        
        // Crear gradiente lineal con múltiples colores
        $gradient = "linear-gradient({$angle}deg, {$color1}, {$color2}, {$color3}, {$color4})";
        ?>
        <style>
            /* Animación de gradiente para el botón específico */
            @keyframes sfq-button-gradient-animation {
                0% {
                    background-position: 0% 50%;
                }
                50% {
                    background-position: 100% 50%;
                }
                100% {
                    background-position: 0% 50%;
                }
            }
            
            <?php if ($unique_id) : ?>
            /* ✅ CORREGIDO: Usar pseudo-elemento para el gradiente sin !important en animación */
            #<?php echo esc_attr($unique_id); ?> {
                position: relative;
                overflow: hidden;
                z-index: 1;
            }
            
            #<?php echo esc_attr($unique_id); ?>::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: <?php echo esc_attr($gradient); ?>;
                background-size: <?php echo esc_attr($size); ?>% <?php echo esc_attr($size); ?>%;
                animation: sfq-button-gradient-animation <?php echo esc_attr($speed); ?>s ease infinite;
                opacity: <?php echo esc_attr($opacity); ?>;
                z-index: -1;
                border-radius: inherit;
                <?php if (!empty($settings['gradient_reverse_animation']) && $settings['gradient_reverse_animation']) : ?>
                animation-direction: reverse;
                <?php endif; ?>
            }
            
            <?php if (!empty($settings['gradient_hover_pause']) && $settings['gradient_hover_pause']) : ?>
            /* Pausar animación al hover */
            #<?php echo esc_attr($unique_id); ?>:hover::before {
                animation-play-state: paused;
            }
            <?php endif; ?>
            
            /* Efectos hover adicionales */
            #<?php echo esc_attr($unique_id); ?>:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0,0,0,0.2);
            }
            
            /* Asegurar que el texto esté por encima del gradiente */
            #<?php echo esc_attr($unique_id); ?> * {
                position: relative;
                z-index: 2;
            }
            <?php endif; ?>
        </style>
        <?php endif; ?>
        <?php
    }
    
    /**
     * Renderizar elemento de valoración freestyle
     */
    private function render_freestyle_rating($element, $question_id, $question_conditions) { // Added $question_conditions
        $settings = $element['settings'] ?? array();
        $rating_type = $settings['rating_type'] ?? 'stars';
        $max_rating = $settings['max_rating'] ?? 5;
        $icons = $settings['icons'] ?? array();

        // Obtener todas las condiciones de la pregunta
        // $question_conditions = $this->get_question_conditions_for_frontend($question_id); // Already passed
        ?>
        <div class="sfq-freestyle-rating-wrapper"
             data-element-id="<?php echo $element['id']; ?>"
             data-type="<?php echo esc_attr($rating_type); ?>">

            <?php if ($rating_type === 'stars') : ?>
                <div class="sfq-freestyle-stars">
                    <?php for ($i = 1; $i <= $max_rating; $i++) : ?>
                        <?php
                        // Filtrar condiciones para el valor de calificación actual
                        $rating_conditions = $this->get_conditions_for_option_value($question_conditions, (string)$i);
                        ?>
                        <button class="sfq-freestyle-star"
                                data-value="<?php echo $i; ?>"
                                type="button"
                                data-conditions='<?php echo json_encode($rating_conditions); ?>'
                                data-has-conditions="<?php echo !empty($rating_conditions) ? 'true' : 'false'; ?>">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                        </button>
                    <?php endfor; ?>
                </div>
            <?php elseif ($rating_type === 'hearts') : ?>
                <div class="sfq-freestyle-hearts">
                    <?php for ($i = 1; $i <= $max_rating; $i++) : ?>
                        <?php
                        // Filtrar condiciones para el valor de calificación actual
                        $rating_conditions = $this->get_conditions_for_option_value($question_conditions, (string)$i);
                        ?>
                        <button class="sfq-freestyle-heart"
                                data-value="<?php echo $i; ?>"
                                type="button"
                                data-conditions='<?php echo json_encode($rating_conditions); ?>'
                                data-has-conditions="<?php echo !empty($rating_conditions) ? 'true' : 'false'; ?>">❤️</button>
                    <?php endfor; ?>
                </div>
            <?php else : ?>
                <div class="sfq-freestyle-emojis">
                    <?php
                    $default_emojis = array('😞', '😐', '🙂', '😊', '😍');
                    for ($i = 1; $i <= $max_rating; $i++) :
                        $emoji = $icons[$i-1] ?? $default_emojis[$i-1] ?? '⭐';
                        // Filtrar condiciones para el valor de calificación actual
                        $rating_conditions = $this->get_conditions_for_option_value($question_conditions, (string)$i);
                    ?>
                        <button class="sfq-freestyle-emoji"
                                data-value="<?php echo $i; ?>"
                                type="button"
                                data-conditions='<?php echo json_encode($rating_conditions); ?>'
                                data-has-conditions="<?php echo !empty($rating_conditions) ? 'true' : 'false'; ?>"><?php echo $emoji; ?></button>
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
    private function render_freestyle_dropdown($element, $question_id, $question_conditions) { // Added $question_conditions
        $settings = $element['settings'] ?? array();
        $options = $settings['options'] ?? array();
        $placeholder = $settings['placeholder'] ?? __('Selecciona una opción...', 'smart-forms-quiz');

        // Obtener todas las condiciones de la pregunta
        // $question_conditions = $this->get_question_conditions_for_frontend($question_id); // Already passed
        ?>
        <div class="sfq-freestyle-dropdown-wrapper">
            <select name="freestyle[<?php echo $question_id; ?>][<?php echo $element['id']; ?>]"
                    id="element_<?php echo $element['id']; ?>"
                    class="sfq-freestyle-select"
                    data-element-id="<?php echo $element['id']; ?>"
                    data-question-id="<?php echo $question_id; ?>">
                <option value=""
                        data-conditions='<?php echo json_encode($this->get_conditions_for_option_value($question_conditions, '')); ?>'
                        data-has-conditions="<?php echo !empty($this->get_conditions_for_option_value($question_conditions, '')) ? 'true' : 'false'; ?>">
                    <?php echo esc_html($placeholder); ?>
                </option>
                <?php foreach ($options as $option) : ?>
                    <?php
                    $option_value = $option['value'] ?? $option['text'];
                    $option_conditions = $this->get_conditions_for_option_value($question_conditions, $option_value);
                    ?>
                    <option value="<?php echo esc_attr($option_value); ?>"
                            data-conditions='<?php echo json_encode($option_conditions); ?>'
                            data-has-conditions="<?php echo !empty($option_conditions) ? 'true' : 'false'; ?>">
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
    private function render_freestyle_checkbox($element, $question_id, $question_conditions) { // Added $question_conditions
        $settings = $element['settings'] ?? array();
        $checkbox_text = $settings['checkbox_text'] ?? $element['label'] ?? '';
        $required_check = $settings['required_check'] ?? false;

        // Obtener todas las condiciones de la pregunta
        // $question_conditions = $this->get_question_conditions_for_frontend($question_id); // Already passed

        // Filtrar condiciones para el valor "checked"
        $checked_conditions = $this->get_conditions_for_option_value($question_conditions, 'checked');
        // También se pueden añadir condiciones para el estado "unchecked" si es necesario,
        // pero el motor de condiciones en frontend.js ya maneja el valor vacío para 'answer_not_equals'.
        ?>
        <div class="sfq-freestyle-checkbox-wrapper">
            <label class="sfq-freestyle-checkbox-label">
                <input type="checkbox"
                       name="freestyle[<?php echo $question_id; ?>][<?php echo $element['id']; ?>]"
                       id="element_<?php echo $element['id']; ?>"
                       class="sfq-freestyle-checkbox"
                       value="checked"
                       data-conditions='<?php echo json_encode($checked_conditions); ?>'
                       data-has-conditions="<?php echo !empty($checked_conditions) ? 'true' : 'false'; ?>"
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
    private function render_freestyle_countdown($element, $question_id, $question_conditions) { // Added $question_conditions
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
    private function render_freestyle_legal_text($element, $question_id, $question_conditions) { // Added $question_conditions
        $settings = $element['settings'] ?? array();
        $text_content = $settings['text_content'] ?? '';
        $require_acceptance = $settings['require_acceptance'] ?? false;
        $acceptance_text = $settings['acceptance_text'] ?? __('He leído y acepto', 'smart-forms-quiz');
        
        if (empty($text_content)) {
            echo '<p class="sfq-legal-error">' . __('Contenido del texto legal no configurado', 'smart-forms-quiz') . '</p>';
            return;
        }

        $legal_conditions = array();
        if ($require_acceptance) {
            // If acceptance is required, treat it like a checkbox with 'accepted' value
            $legal_conditions = $this->get_conditions_for_option_value($question_conditions, 'accepted');
        }
        ?>
        <div class="sfq-freestyle-legal-wrapper">
            <div class="sfq-legal-content">
                <?php echo do_shortcode($text_content); ?>
            </div>
            
            <?php if ($require_acceptance) : ?>
                <div class="sfq-legal-acceptance">
                    <label class="sfq-legal-acceptance-label">
                        <input type="checkbox" 
                               name="freestyle[<?php echo $question_id; ?>][<?php echo $element['id']; ?>]"
                               id="element_<?php echo $element['id']; ?>"
                               class="sfq-legal-checkbox"
                               value="accepted"
                               data-conditions='<?php echo json_encode($legal_conditions); ?>'
                               data-has-conditions="<?php echo !empty($legal_conditions) ? 'true' : 'false'; ?>"
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
     * Renderizar elemento de mostrar variable freestyle
     */
    private function render_freestyle_variable_display($element, $question_id, $question_conditions) { // Added $question_conditions
        $settings = $element['settings'] ?? array();
        $variable_name = $settings['variable_name'] ?? '';
        $preview_value = $settings['preview_value'] ?? '0';
        
        // ✅ NUEVO: Configuración de texto opcional
        $optional_text = $settings['optional_text'] ?? '';
        $text_position = $settings['text_position'] ?? 'right';
        $text_spacing = $settings['text_spacing'] ?? 'normal';
        
        if (empty($variable_name)) {
            echo '<p class="sfq-variable-error">' . __('Variable no configurada', 'smart-forms-quiz') . '</p>';
            return;
        }
        
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
        
        // Aplicar estilos personalizados desde las configuraciones
        $styles = array();
        
        // ✅ NUEVO: Ancho adaptado al contenido
        $styles['display'] = 'inline-block';
        $styles['width'] = 'auto';
        $styles['max-width'] = '100%';
        
        // Tamaño de fuente
        if (!empty($settings['font_size'])) {
            $styles['font-size'] = intval($settings['font_size']) . 'px';
        }
        
        // Peso de fuente
        if (!empty($settings['font_weight'])) {
            $styles['font-weight'] = $settings['font_weight'];
        }
        
        // Alineación de texto
        if (!empty($settings['text_align'])) {
            $styles['text-align'] = $settings['text_align'];
        }
        
        // Color de texto
        if (!empty($settings['text_color'])) {
            $styles['color'] = $settings['text_color'];
        }
        
        // Color de fondo
        if (!empty($settings['background_color'])) {
            $styles['background-color'] = $settings['background_color'];
        }
        
        // Color de borde con opacidad
        if (!empty($settings['border_color'])) {
            $border_color = $settings['border_color'];
            $border_opacity = $settings['border_opacity'] ?? '1';
            
            if ($border_opacity != '1') {
                $border_rgba = $this->hex_to_rgba($border_color, $border_opacity);
                $styles['border'] = '2px solid ' . $border_rgba;
            } else {
                $styles['border'] = '2px solid ' . $border_color;
            }
        }
        
        // Radio del borde
        if (!empty($settings['border_radius'])) {
            $styles['border-radius'] = intval($settings['border_radius']) . 'px';
        }
        
        // Padding
        if (!empty($settings['padding'])) {
            $styles['padding'] = $settings['padding'];
        } else {
            $styles['padding'] = '12px 16px';
        }
        
        // Opacidad del fondo
        if (!empty($settings['background_opacity']) && $settings['background_opacity'] != '1') {
            if (!empty($settings['background_color'])) {
                $styles['background-color'] = $this->hex_to_rgba($settings['background_color'], $settings['background_opacity']);
            }
        }
        
        // Sombra de texto
        if (!empty($settings['text_shadow']) && $settings['text_shadow']) {
            $styles['text-shadow'] = '1px 1px 2px rgba(0,0,0,0.3)';
        }
        
        // Convertir array de estilos a string CSS
        $style_string = '';
        foreach ($styles as $property => $value) {
            $style_string .= $property . ': ' . $value . '; ';
        }
        
        // ✅ NUEVO: Calcular espaciado según configuración
        $spacing_values = array(
            'none' => '0px',
            'small' => '4px',
            'normal' => '8px',
            'large' => '12px'
        );
        $spacing = $spacing_values[$text_spacing] ?? '8px';
        
        // ✅ NUEVO: Determinar estructura según posición del texto
        $has_optional_text = !empty($optional_text);
        
        // ✅ NUEVO: Estilos específicos para el texto opcional
        $optional_text_styles = array();
        
        // Tamaño del texto opcional
        if (!empty($settings['optional_text_size']) && $settings['optional_text_size'] !== 'inherit') {
            $optional_text_styles['font-size'] = intval($settings['optional_text_size']) . 'px';
        }
        
        // Color del texto opcional
        if (!empty($settings['optional_text_color']) && $settings['optional_text_color'] !== 'inherit') {
            $optional_text_styles['color'] = $settings['optional_text_color'];
        }
        
        // Convertir estilos del texto opcional a string CSS
        $optional_text_style_string = '';
        foreach ($optional_text_styles as $property => $value) {
            $optional_text_style_string .= $property . ': ' . $value . '; ';
        }
        
        ?>
        <div class="sfq-freestyle-variable-display-wrapper" style="text-align: <?php echo esc_attr($settings['text_align'] ?? 'left'); ?>;">
            <div class="sfq-freestyle-variable-display" 
                 data-element-id="<?php echo esc_attr($element['id']); ?>"
                 data-variable-name="<?php echo esc_attr($variable_name); ?>"
                 style="<?php echo esc_attr(trim($style_string)); ?>">
                
                <?php if ($has_optional_text) : ?>
                    <!-- ✅ CORREGIDO: Texto opcional dentro del mismo recuadro con estilos independientes -->
                    <div class="sfq-variable-content-with-text" 
                         data-text-position="<?php echo esc_attr($text_position); ?>"
                         style="<?php echo $this->get_position_styles($text_position, $spacing); ?>">
                        
                        <?php if ($text_position === 'top') : ?>
                            <span class="sfq-variable-optional-text" style="<?php echo esc_attr(trim($optional_text_style_string)); ?>">
                                <?php echo esc_html($optional_text); ?>
                            </span>
                        <?php endif; ?>
                        
                        <?php if ($text_position === 'left') : ?>
                            <span class="sfq-variable-optional-text" style="<?php echo esc_attr(trim($optional_text_style_string)); ?>">
                                <?php echo esc_html($optional_text); ?>
                            </span>
                        <?php endif; ?>
                        
                        <span class="sfq-variable-value" data-variable="<?php echo esc_attr($variable_name); ?>">
                            <?php echo esc_html($display_value); ?>
                        </span>
                        
                        <?php if ($text_position === 'right') : ?>
                            <span class="sfq-variable-optional-text" style="<?php echo esc_attr(trim($optional_text_style_string)); ?>">
                                <?php echo esc_html($optional_text); ?>
                            </span>
                        <?php endif; ?>
                        
                        <?php if ($text_position === 'bottom') : ?>
                            <span class="sfq-variable-optional-text" style="<?php echo esc_attr(trim($optional_text_style_string)); ?>">
                                <?php echo esc_html($optional_text); ?>
                            </span>
                        <?php endif; ?>
                    </div>
                <?php else : ?>
                    <!-- Sin texto opcional, renderizado original -->
                    <span class="sfq-variable-value" data-variable="<?php echo esc_attr($variable_name); ?>">
                        <?php echo esc_html($display_value); ?>
                    </span>
                <?php endif; ?>
            </div>
        </div>
        
        <!-- Campo oculto para registrar que se mostró la variable -->
        <input type="hidden" 
               name="freestyle[<?php echo $question_id; ?>][<?php echo $element['id']; ?>]"
               value="variable_displayed"
               class="sfq-variable-tracker">
        <?php
    }
    
    /**
     * ✅ NUEVO: Renderizar elemento de texto con estilo personalizado
     */
    private function render_freestyle_styled_text($element, $question_id) {
        $settings = $element['settings'] ?? array();
        $text_content = $settings['text_content'] ?? $element['label'] ?? __('Texto de ejemplo', 'smart-forms-quiz');
        $text_type = $settings['text_type'] ?? 'paragraph'; // 'title' o 'paragraph'
        
        // Aplicar estilos personalizados desde las configuraciones
        $styles = array();
        
        // ✅ NUEVO: Configuración de ancho personalizado y alineación del contenedor
        $width_type = $settings['width_type'] ?? 'auto';
        $container_align = $settings['container_align'] ?? 'center';
        
        // Estilos del contenedor wrapper
        $wrapper_styles = array();
        
        switch ($width_type) {
            case 'full':
                $styles['width'] = '100%';
                $styles['display'] = 'block';
                // Para ancho completo, aplicar alineación usando margin
                switch ($container_align) {
                    case 'center':
                    default:
                        $styles['margin-left'] = 'auto !important';
                        $styles['margin-right'] = 'auto !important';
                        break;
                    case 'left':
                        $styles['margin-left'] = '0 !important';
                        $styles['margin-right'] = 'auto !important';
                        break;
                    case 'right':
                        $styles['margin-left'] = 'auto !important';
                        $styles['margin-right'] = '0 !important';
                        break;
                }
                break;
            case 'custom':
                $custom_width = intval($settings['custom_width'] ?? 300);
                // Validar rango de ancho personalizado
                $custom_width = max(50, min(1200, $custom_width));
                $styles['width'] = $custom_width . 'px';
                $styles['max-width'] = '100%';
                $styles['display'] = 'block';
                // Para ancho personalizado, aplicar alineación usando margin
                switch ($container_align) {
                    case 'left':
                        $styles['margin-left'] = '0!important';
                        $styles['margin-right'] = 'auto!important';
                        break;
                    case 'right':
                        $styles['margin-left'] = 'auto!important';
                        $styles['margin-right'] = '0!important';
                        break;
                    case 'center':
                    default:
                        $styles['margin-left'] = 'auto!important';
                        $styles['margin-right'] = 'auto!important';
                        break;
                }
                break;
            case 'auto':
            default:
                $styles['width'] = 'auto!important';
                $styles['display'] = 'inline-block!important';
                // Para ancho automático, no aplicar alineación especial
                break;
        }
        
        // Tamaño de fuente
        if (!empty($settings['font_size'])) {
            $styles['font-size'] = intval($settings['font_size']) . 'px';
        }
        
        // Tipo de fuente
        if (!empty($settings['font_family'])) {
            $styles['font-family'] = $settings['font_family'];
        }
        
        // Peso de fuente (negrita)
        if (!empty($settings['font_weight'])) {
            $styles['font-weight'] = $settings['font_weight'];
        }
        
        // Estilo de fuente (cursiva)
        if (!empty($settings['italic']) && $settings['italic']) {
            $styles['font-style'] = 'italic';
        }
        
        // Decoración de texto (tachado)
        if (!empty($settings['strikethrough']) && $settings['strikethrough']) {
            $styles['text-decoration'] = 'line-through';
        }
        
        // Alineación de texto
        if (!empty($settings['text_align'])) {
            $styles['text-align'] = $settings['text_align'];
        }
        
        // Color de texto
        if (!empty($settings['text_color'])) {
            $styles['color'] = $settings['text_color'];
        }
        
        // Color de fondo con opacidad
        if (!empty($settings['background_color'])) {
            $bg_color = $settings['background_color'];
            $bg_opacity = $settings['background_opacity'] ?? '0';
            
            if ($bg_opacity != '0') {
                if ($bg_opacity != '1') {
                    $styles['background-color'] = $this->hex_to_rgba($bg_color, $bg_opacity);
                } else {
                    $styles['background-color'] = $bg_color;
                }
            }
        }
        
        // Color de borde con opacidad
        if (!empty($settings['border_color'])) {
            $border_color = $settings['border_color'];
            $border_opacity = $settings['border_opacity'] ?? '0';
            
            if ($border_opacity != '0') {
                if ($border_opacity != '1') {
                    $border_rgba = $this->hex_to_rgba($border_color, $border_opacity);
                    $styles['border'] = '2px solid ' . $border_rgba;
                } else {
                    $styles['border'] = '2px solid ' . $border_color;
                }
            }
        }
        
        // Radio del borde
        if (!empty($settings['border_radius'])) {
            $styles['border-radius'] = intval($settings['border_radius']) . 'px';
        }
        
        // Sombra de texto
        if (!empty($settings['text_shadow']) && $settings['text_shadow']) {
            $styles['text-shadow'] = '2px 2px 4px rgba(0,0,0,0.3)';
        }
        
        // Sombra del recuadro
        if (!empty($settings['box_shadow']) && $settings['box_shadow']) {
            $styles['box-shadow'] = '0 4px 8px rgba(0,0,0,0.1)';
        }
        
        // Padding por defecto para el recuadro
        $styles['padding'] = '0rem 0.5rem';
        $styles['margin'] = 'auto';
        $styles['box-sizing'] = 'border-box';
        
        // Convertir array de estilos a string CSS
        $style_string = '';
        foreach ($styles as $property => $value) {
            $style_string .= $property . ': ' . $value . '; ';
        }
        
        // Convertir estilos del wrapper a string CSS
        $wrapper_style_string = '';
        foreach ($wrapper_styles as $property => $value) {
            $wrapper_style_string .= $property . ': ' . $value . '; ';
        }
        
        // Determinar el tag HTML según el tipo de texto
        $tag = ($text_type === 'title') ? 'h3' : 'p';
        
        ?>
        <div class="sfq-freestyle-styled-text-wrapper" style="<?php echo esc_attr(trim($wrapper_style_string)); ?>">
            <<?php echo $tag; ?> class="sfq-freestyle-styled-text" 
                 data-element-id="<?php echo esc_attr($element['id']); ?>"
                 data-text-type="<?php echo esc_attr($text_type); ?>"
                 data-width-type="<?php echo esc_attr($width_type); ?>"
                 data-container-align="<?php echo esc_attr($container_align); ?>"
                 style="<?php echo esc_attr(trim($style_string)); ?>">
                <?php echo do_shortcode($text_content); ?>
            </<?php echo $tag; ?>>
            
            <!-- Campo oculto para registrar que se mostró el texto -->
            <input type="hidden" 
                   name="freestyle[<?php echo $question_id; ?>][<?php echo $element['id']; ?>]"
                   value="styled_text_displayed"
                   class="sfq-styled-text-tracker">
        </div>
        <?php
    }
    
    /**
     * ✅ NUEVO: Obtener el ID del formulario actual basado en el ID de pregunta
     */
  private function get_current_form_id($question_id) {
    if (empty($question_id)) {
        return null;
    }

    global $wpdb;
    $table_name = $wpdb->prefix . 'sfq_questions';

    $form_id = $wpdb->get_var($wpdb->prepare(
        "SELECT form_id FROM {$table_name} WHERE id = %d",
        $question_id
    ));

    return $form_id ? intval($form_id) : null;
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
    
    /**
     * Convertir color hexadecimal a RGBA con opacidad
     */
    private function hex_to_rgba($hex, $opacity = 1) {
        // Limpiar el hex (quitar # si existe)
        $hex = ltrim($hex, '#');
        
        // Validar formato hex
        if (!preg_match('/^[a-fA-F0-9]{3}$|^[a-fA-F0-9]{6}$/', $hex)) {
            return $hex; // Devolver original si no es hex válido
        }
        
        // Convertir hex de 3 dígitos a 6 dígitos
        if (strlen($hex) === 3) {
            $hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
        }
        
        // Convertir a RGB
        $r = hexdec(substr($hex, 0, 2));
        $g = hexdec(substr($hex, 2, 2));
        $b = hexdec(substr($hex, 4, 2));
        
        // Asegurar que la opacidad esté entre 0 y 1
        $opacity = max(0, min(1, floatval($opacity)));
        
        return "rgba({$r}, {$g}, {$b}, {$opacity})";
    }
    
    /**
     * ✅ NUEVO: Generar estilos CSS para posicionamiento del texto opcional
     */
    private function get_position_styles($position, $spacing) {
        switch ($position) {
            case 'top':
                return "display: flex; flex-direction: column; align-items: center; gap: {$spacing};";
            case 'bottom':
                return "display: flex; flex-direction: column; align-items: center; gap: {$spacing};";
            case 'left':
                return "display: flex; flex-direction: row; align-items: center; gap: {$spacing};";
            case 'right':
            default:
                return "display: flex; flex-direction: row; align-items: center; gap: {$spacing};";
        }
    }
    
    /**
     * ✅ NUEVO: Obtener condiciones de una pregunta para el frontend
     */
 private function get_question_conditions_for_frontend($question_id) {
        global $wpdb;
        
        // Cache estático para evitar consultas repetidas
        static $conditions_cache = array();
        
        if (!isset($conditions_cache[$question_id])) {
            $conditions_cache[$question_id] = $wpdb->get_results($wpdb->prepare(
                "SELECT * FROM {$wpdb->prefix}sfq_conditions 
                WHERE question_id = %d 
                ORDER BY order_position ASC",
                $question_id
            ));
        }
        
        return $conditions_cache[$question_id];
    }
    
    /**
     * ✅ NUEVO: Filtrar condiciones que aplican a un valor de opción específico
     */
    private function get_conditions_for_option_value($all_conditions, $option_value) {
        $matching_conditions = array();
        
        foreach ($all_conditions as $condition) {
            // Incluir condiciones que evalúan respuestas
            if (in_array($condition->condition_type, ['answer_equals', 'answer_contains', 'answer_not_equals'])) {
                if ($condition->condition_value === $option_value) {
                    $matching_conditions[] = array(
                        'condition_type' => $condition->condition_type,
                        'condition_value' => $condition->condition_value,
                        'action_type' => $condition->action_type,
                        'action_value' => $condition->action_value,
                        'variable_amount' => $condition->variable_amount,
                        'comparison_value' => $condition->comparison_value ?? '',
                        'order_position' => $condition->order_position
                    );
                }
            }
            // También incluir condiciones de variables que se ejecutan independientemente
            elseif (in_array($condition->condition_type, ['variable_greater', 'variable_greater_equal', 'variable_less', 'variable_less_equal', 'variable_equals'])) {
                // Las condiciones de variables se evalúan siempre, no dependen del valor de la opción
                $matching_conditions[] = array(
                    'condition_type' => $condition->condition_type,
                    'condition_value' => $condition->condition_value,
                    'action_type' => $condition->action_type,
                    'action_value' => $condition->action_value,
                    'variable_amount' => $condition->variable_amount,
                    'comparison_value' => $condition->comparison_value ?? '',
                    'order_position' => $condition->order_position
                );
            }
        }
        
        return $matching_conditions;
    }
    
    /**
     * Obtener condiciones relevantes para un campo de entrada freestyle (texto, email, teléfono).
     * Estas condiciones no se filtran por un valor de opción específico en el backend,
     * sino que se envían al frontend para su evaluación dinámica.
     */
    private function get_conditions_for_freestyle_input_field($all_conditions) {
        $relevant_conditions = array();
        
        foreach ($all_conditions as $condition) {
            // Incluir condiciones que evalúan respuestas de texto
            if (in_array($condition->condition_type, ['answer_equals', 'answer_contains', 'answer_not_equals'])) {
                $relevant_conditions[] = array(
                    'condition_type' => $condition->condition_type,
                    'condition_value' => $condition->condition_value,
                    'action_type' => $condition->action_type,
                    'action_value' => $condition->action_value,
                    'variable_amount' => $condition->variable_amount,
                    'comparison_value' => $condition->comparison_value ?? '',
                    'order_position' => $condition->order_position
                );
            }
            // También incluir condiciones de variables que se ejecutan independientemente
            elseif (in_array($condition->condition_type, ['variable_greater', 'variable_greater_equal', 'variable_less', 'variable_less_equal', 'variable_equals'])) {
                $relevant_conditions[] = array(
                    'condition_type' => $condition->condition_type,
                    'condition_value' => $condition->condition_value,
                    'action_type' => $condition->action_type,
                    'action_value' => $condition->action_value,
                    'variable_amount' => $condition->variable_amount,
                    'comparison_value' => $condition->comparison_value ?? '',
                    'order_position' => $condition->order_position
                );
            }
        }
        
        return $relevant_conditions;
    }
    
    /**
     * ✅ NUEVO: Obtener condiciones relevantes para un campo de entrada de texto/email.
     * Estas condiciones no se filtran por un valor de opción específico en el backend,
     * sino que se envían al frontend para su evaluación dinámica.
     */
    private function get_conditions_for_input_field($all_conditions) {
        $relevant_conditions = array();
        
        foreach ($all_conditions as $condition) {
            // Incluir condiciones que evalúan respuestas de texto
            if (in_array($condition->condition_type, ['answer_equals', 'answer_contains', 'answer_not_equals', 'answer_greater', 'answer_less'])) {
                $relevant_conditions[] = array(
                    'condition_type' => $condition->condition_type,
                    'condition_value' => $condition->condition_value,
                    'action_type' => $condition->action_type,
                    'action_value' => $condition->action_value,
                    'variable_amount' => $condition->variable_amount,
                    'comparison_value' => $condition->comparison_value ?? '',
                    'order_position' => $condition->order_position
                );
            }
            // También incluir condiciones de variables que se ejecutan independientemente
            elseif (in_array($condition->condition_type, ['variable_greater', 'variable_greater_equal', 'variable_less', 'variable_less_equal', 'variable_equals'])) {
                $relevant_conditions[] = array(
                    'condition_type' => $condition->condition_type,
                    'condition_value' => $condition->condition_value,
                    'action_type' => $condition->action_type,
                    'action_value' => $condition->action_value,
                    'variable_amount' => $condition->variable_amount,
                    'comparison_value' => $condition->comparison_value ?? '',
                    'order_position' => $condition->order_position
                );
            }
        }
        
        return $relevant_conditions;
    }
    
    /**
     * ✅ NUEVO: Renderizar pregunta con imagen posicionada
     */
    private function render_question_with_image($question) {
        $image_config = $question->settings['question_image'] ?? null;
        
        if (!$image_config || empty($image_config['url'])) {
            return $this->render_question_type($question);
        }
        
        $position = $image_config['position'] ?? 'left';
        $width = $image_config['width'] ?? 300;
        $shadow = $image_config['shadow'] ?? false;
        $mobile_force = $image_config['mobile_force_position'] ?? false;
        
        // Renderizar con imagen según posición
        return $this->render_question_with_positioned_image($question, $image_config);
    }
    
    /**
     * ✅ NUEVO: Renderizar pregunta con imagen posicionada específicamente
     */
    private function render_question_with_positioned_image($question, $image_config) {
        $position = $image_config['position'] ?? 'left';
        $width = $image_config['width'] ?? 300;
        $shadow = $image_config['shadow'] ?? false;
        $mobile_force = $image_config['mobile_force_position'] ?? false;
        $image_url = $image_config['url'];
        $image_alt = $image_config['alt'] ?? '';
        
        // Clases CSS para posicionamiento
        $container_classes = array('sfq-question-with-image');
        $container_classes[] = 'position-' . $position;
        
        if ($mobile_force) {
            $container_classes[] = 'mobile-force-position';
        }
        
        // Clases para la imagen
        $image_classes = array('sfq-question-image');
        if ($shadow) {
            $image_classes[] = 'with-shadow';
        }
        
        ob_start();
        ?>
        <div class="<?php echo esc_attr(implode(' ', $container_classes)); ?>">
            <div class="<?php echo esc_attr(implode(' ', $image_classes)); ?>" 
                 style="width: <?php echo intval($width); ?>px; max-width: 100%;">
                <img src="<?php echo esc_url($image_url); ?>" 
                     alt="<?php echo esc_attr($image_alt); ?>"
                     style="width: 100%; height: auto; display: block;"
                     loading="lazy">
            </div>
            <div class="sfq-question-content-with-image">
                <?php $this->render_question_type($question); ?>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
    
    /**
     * ✅ NUEVO: Renderizar imagen de pregunta si está configurada (método simplificado)
     */
    private function render_question_image($question) {
        // Verificar si la pregunta tiene configuración de imagen
        $settings = $question->settings ?? array();
        
        // ✅ CORREGIDO: Verificar la nueva estructura de configuración
        if (empty($settings['question_image']) || !is_array($settings['question_image'])) {
            return; // No hay imagen configurada
        }
        
        $image_config = $settings['question_image'];
        $image_url = $image_config['url'] ?? '';
        
        if (empty($image_url)) {
            return; // No hay URL de imagen
        }
        
        // Obtener configuraciones de la imagen
        $image_position = $image_config['position'] ?? 'top';
        $image_width = $image_config['width'] ?? 300;
        $image_shadow = $image_config['shadow'] ?? false;
        $force_mobile_position = $image_config['mobile_force_position'] ?? false;
        $image_alt = $image_config['alt'] ?? '';
        
        // Generar estilos CSS para la imagen
        $image_styles = array();
        $image_styles['width'] = intval($image_width) . 'px';
        $image_styles['max-width'] = '100%';
        $image_styles['height'] = 'auto';
        $image_styles['display'] = 'block';
        
        if ($image_shadow) {
            $image_styles['box-shadow'] = '0 4px 12px rgba(0, 0, 0, 0.15)';
            $image_styles['border-radius'] = '8px';
        }
        
        // Convertir estilos a string CSS
        $style_string = '';
        foreach ($image_styles as $property => $value) {
            $style_string .= $property . ': ' . $value . '; ';
        }
        
        // Generar clases CSS para posicionamiento
        $container_classes = array('sfq-question-image-container');
        $container_classes[] = 'sfq-position-' . $image_position;
        
        if ($force_mobile_position) {
            $container_classes[] = 'sfq-mobile-force-position';
        }
        
        // Generar estilos del contenedor según la posición
        $container_styles = array();
        
        switch ($image_position) {
            case 'left':
                $container_styles['display'] = 'flex';
                $container_styles['align-items'] = 'flex-start';
                $container_styles['gap'] = '20px';
                $container_styles['margin-bottom'] = '20px';
                break;
            case 'right':
                $container_styles['display'] = 'flex';
                $container_styles['align-items'] = 'flex-start';
                $container_styles['flex-direction'] = 'row-reverse';
                $container_styles['gap'] = '20px';
                $container_styles['margin-bottom'] = '20px';
                break;
            case 'bottom':
                $container_styles['margin-top'] = '20px';
                $container_styles['text-align'] = 'center';
                break;
            case 'top':
            default:
                $container_styles['margin-bottom'] = '20px';
                $container_styles['text-align'] = 'center';
                break;
        }
        
        // Convertir estilos del contenedor a string CSS
        $container_style_string = '';
        foreach ($container_styles as $property => $value) {
            $container_style_string .= $property . ': ' . $value . '; ';
        }
        
        ?>
        <div class="<?php echo esc_attr(implode(' ', $container_classes)); ?>" 
             style="<?php echo esc_attr(trim($container_style_string)); ?>">
            <img src="<?php echo esc_url($image_url); ?>" 
                 alt="<?php echo esc_attr($image_alt); ?>"
                 class="sfq-question-image"
                 style="<?php echo esc_attr(trim($style_string)); ?>"
                 loading="lazy">
        </div>
        
        <style>
            /* Estilos responsive para imagen de pregunta */
            @media (max-width: 768px) {
                .sfq-question-image-container.sfq-position-left:not(.sfq-mobile-force-position),
                .sfq-question-image-container.sfq-position-right:not(.sfq-mobile-force-position) {
                    flex-direction: column !important;
                    text-align: center !important;
                }
                
                .sfq-question-image-container.sfq-mobile-force-position.sfq-position-left {
                    flex-direction: row !important;
                    text-align: left !important;
                }
                
                .sfq-question-image-container.sfq-mobile-force-position.sfq-position-right {
                    flex-direction: row-reverse !important;
                    text-align: right !important;
                }
                
                .sfq-question-image {
                    max-width: 100% !important;
                    width: auto !important;
                    max-height: 300px !important;
                }
            }
        </style>
        <?php
    }
    
    /**
     * ✅ NUEVO: Generar estilos CSS para el botón personalizado
     */
    private function generate_button_styles($style_config) {
        $styles = array();
        
        // ✅ CORREGIDO: Color de fondo con opacidad y degradado
        if (!empty($style_config['background_color'])) {
            $bg_color = $style_config['background_color'];
            $bg_opacity = isset($style_config['background_opacity']) ? floatval($style_config['background_opacity']) : 1.0;
            
            // ✅ CORREGIDO: Verificar degradado con múltiples condiciones
            $gradient_enabled = false;
            if (isset($style_config['gradient_enabled'])) {
                // Verificar diferentes formas de representar true
                $gradient_enabled = ($style_config['gradient_enabled'] === true || 
                                   $style_config['gradient_enabled'] === 'true' || 
                                   $style_config['gradient_enabled'] === '1' || 
                                   $style_config['gradient_enabled'] === 1);
            }
            
            if ($gradient_enabled && !empty($style_config['gradient_color'])) {
                $gradient_color = $style_config['gradient_color'];
                
                // ✅ NUEVO: Verificar si el degradado debe ser animado
                $gradient_animated = false;
                if (isset($style_config['gradient_animated'])) {
                    $gradient_animated = ($style_config['gradient_animated'] === true || 
                                        $style_config['gradient_animated'] === 'true' || 
                                        $style_config['gradient_animated'] === '1' || 
                                        $style_config['gradient_animated'] === 1);
                }
                
                // ✅ CRÍTICO: Aplicar opacidad a ambos colores del degradado
                if ($bg_opacity != 1.0) {
                    $bg_rgba = $this->hex_to_rgba($bg_color, $bg_opacity);
                    $gradient_rgba = $this->hex_to_rgba($gradient_color, $bg_opacity);
                    
                    if ($gradient_animated) {
                        // Degradado animado con múltiples paradas de color
                        $styles['background'] = "linear-gradient(-45deg, {$bg_rgba}, {$gradient_rgba}, {$bg_rgba}, {$gradient_rgba}) !important";
                        $styles['background-size'] = '400% 400% !important';
                        $styles['animation'] = 'sfq-gradient-animation 4s ease infinite !important';
                    } else {
                        // Degradado estático
                        $styles['background'] = "linear-gradient(135deg, {$bg_rgba}, {$gradient_rgba}) !important";
                    }
                } else {
                    if ($gradient_animated) {
                        // Degradado animado con múltiples paradas de color
                        $styles['background'] = "linear-gradient(-45deg, {$bg_color}, {$gradient_color}, {$bg_color}, {$gradient_color}) !important";
                        $styles['background-size'] = '400% 400% !important';
                        $styles['animation'] = 'sfq-gradient-animation 4s ease infinite !important';
                    } else {
                        // Degradado estático
                        $styles['background'] = "linear-gradient(135deg, {$bg_color}, {$gradient_color}) !important";
                    }
                }
                
                // ✅ CRÍTICO: Asegurar que no se sobrescriba el degradado
                // No establecer background-color cuando hay degradado activo
            } else {
                // Color sólido con opacidad
                if ($bg_opacity != 1.0) {
                    $styles['background-color'] = $this->hex_to_rgba($bg_color, $bg_opacity) . ' !important';
                } else {
                    $styles['background-color'] = $bg_color . ' !important';
                }
            }
        }
        
        // ✅ CORREGIDO: Color y opacidad del borde
        if (!empty($style_config['border_color'])) {
            $border_color = $style_config['border_color'];
            $border_opacity = isset($style_config['border_opacity']) ? floatval($style_config['border_opacity']) : 1.0;
            
            if ($border_opacity != 1.0) {
                $border_rgba = $this->hex_to_rgba($border_color, $border_opacity);
                $styles['border'] = '2px solid ' . $border_rgba . ' !important';
            } else {
                $styles['border'] = '2px solid ' . $border_color . ' !important';
            }
        }
        
        // ✅ CORREGIDO: Radio del botón
        if (isset($style_config['border_radius']) && $style_config['border_radius'] !== '') {
            $styles['border-radius'] = intval($style_config['border_radius']) . 'px !important';
        }
        
        // ✅ CORREGIDO: Sombreado del botón con verificación mejorada
        $box_shadow_enabled = false;
        if (isset($style_config['box_shadow'])) {
            $box_shadow_enabled = ($style_config['box_shadow'] === true || 
                                 $style_config['box_shadow'] === 'true' || 
                                 $style_config['box_shadow'] === '1' || 
                                 $style_config['box_shadow'] === 1);
        }
        if ($box_shadow_enabled) {
            $styles['box-shadow'] = '0 4px 12px rgba(0, 0, 0, 0.15) !important';
        }
        
        // ✅ CORREGIDO: Tamaño del texto
        if (isset($style_config['font_size']) && $style_config['font_size'] !== '') {
            $styles['font-size'] = intval($style_config['font_size']) . 'px !important';
        }
        
        // ✅ CORREGIDO: Grosor del texto
        if (!empty($style_config['font_weight'])) {
            $styles['font-weight'] = $style_config['font_weight'] . ' !important';
        }
        
        // ✅ CORREGIDO: Color del texto
        if (!empty($style_config['text_color'])) {
            $styles['color'] = $style_config['text_color'] . ' !important';
        }
        
        // ✅ CORREGIDO: Sombra del texto con verificación mejorada
        $text_shadow_enabled = false;
        if (isset($style_config['text_shadow'])) {
            $text_shadow_enabled = ($style_config['text_shadow'] === true || 
                                   $style_config['text_shadow'] === 'true' || 
                                   $style_config['text_shadow'] === '1' || 
                                   $style_config['text_shadow'] === 1);
        }
        if ($text_shadow_enabled) {
            $styles['text-shadow'] = '1px 1px 2px rgba(0, 0, 0, 0.3) !important';
        }
        
        // Estilos básicos del botón
        $styles['padding'] = '12px 24px !important';
        $styles['cursor'] = 'pointer !important';
        $styles['transition'] = 'all 0.2s ease !important';
        $styles['text-decoration'] = 'none !important';
        $styles['display'] = 'inline-block !important';
        
        // ✅ CORREGIDO: Solo establecer border si no se ha establecido ya
        if (!isset($styles['border'])) {
            $styles['border'] = 'none !important';
        }
        
        // Convertir array de estilos a string CSS
        $style_string = '';
        foreach ($styles as $property => $value) {
            $style_string .= $property . ': ' . $value . '; ';
        }
        
        return trim($style_string);
    }
}
