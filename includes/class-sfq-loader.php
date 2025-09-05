<?php
/**
 * Clase principal para cargar todos los componentes del plugin
 */

if (!defined('ABSPATH')) {
    exit;
}

class SFQ_Loader {
    
    private $admin;
    private $frontend;
    private $ajax;
    private $shortcode;
    private $analytics;
    private $form_statistics;
    private $admin_submissions;
    
    public function init() {
        // Inicializar componentes según el contexto
        if (is_admin()) {
            $this->admin = new SFQ_Admin();
            $this->admin->init();
            
            // Inicializar estadísticas de formulario si existe la clase
            if (class_exists('SFQ_Form_Statistics')) {
                $this->form_statistics = new SFQ_Form_Statistics();
                $this->form_statistics->init();
            }
            
            // Inicializar submissions avanzadas si existe la clase
            if (class_exists('SFQ_Admin_Submissions')) {
                $this->admin_submissions = new SFQ_Admin_Submissions();
                $this->admin_submissions->init();
            }
        }
        
        // Frontend siempre se carga para shortcodes
        $this->frontend = new SFQ_Frontend();
        $this->frontend->init();
        
        // AJAX handlers
        $this->ajax = new SFQ_Ajax();
        $this->ajax->init();
        
        // Shortcodes
        $this->shortcode = new SFQ_Shortcode();
        $this->shortcode->init();
        
        // Analytics
        $this->analytics = new SFQ_Analytics();
        $this->analytics->init();
        
        // Button Views tracking
        if (class_exists('SFQ_Button_Views')) {
            $button_views = new SFQ_Button_Views();
            $button_views->init();
        }
        
        // Hooks generales
        $this->setup_hooks();
    }
    
    private function setup_hooks() {
        // Registrar scripts y estilos
        add_action('wp_enqueue_scripts', array($this, 'enqueue_frontend_assets'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_assets'));
        
        // REST API endpoints
        add_action('rest_api_init', array($this, 'register_rest_routes'));
        
        // Preview functionality
        add_action('template_redirect', array($this, 'handle_preview'));
    }
    
    public function enqueue_frontend_assets() {
        // Solo cargar si hay formularios en la página o es preview
        if (!$this->should_load_frontend_assets()) {
            return;
        }
        
        // Asegurar que jQuery esté disponible
        wp_enqueue_script('jquery');
        
        // CSS principal - con versionado automático
        $css_version = $this->get_asset_version('assets/css/frontend.css');
        wp_enqueue_style(
            'sfq-frontend',
            SFQ_PLUGIN_URL . 'assets/css/frontend.css',
            array(),
            $css_version
        );
        
        // JavaScript principal - con versionado automático
        $js_version = $this->get_asset_version('assets/js/frontend.js');
        wp_enqueue_script(
            'sfq-frontend',
            SFQ_PLUGIN_URL . 'assets/js/frontend.js',
            array('jquery'),
            $js_version,
            true
        );
        
        // Localización para AJAX - DEBE ir después de enqueue_script
        wp_localize_script('sfq-frontend', 'sfq_ajax', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('sfq_nonce'),
            'rest_url' => rest_url('sfq/v1/'),
            'strings' => array(
                'loading' => __('Cargando...', 'smart-forms-quiz'),
                'error' => __('Ha ocurrido un error', 'smart-forms-quiz'),
                'submit' => __('Enviar', 'smart-forms-quiz'),
                'next' => __('Siguiente', 'smart-forms-quiz'),
                'previous' => __('Anterior', 'smart-forms-quiz'),
                'start' => __('Comenzar', 'smart-forms-quiz')
            )
        ));
    }
    
    public function enqueue_admin_assets($hook) {
        // Verificar si estamos en páginas del plugin con mejor detección
        $plugin_pages = array(
            'toplevel_page_smart-forms-quiz',
            'smart-forms_page_sfq-new-form',
            'smart-forms_page_sfq-submissions',
            'smart-forms_page_sfq-analytics',
            'smart-forms_page_sfq-settings',
            'admin_page_sfq-form-statistics'
        );
        
        $is_plugin_page = in_array($hook, $plugin_pages) || 
                         strpos($hook, 'smart-forms-quiz') !== false || 
                         strpos($hook, 'sfq-') !== false;
        
        if (!$is_plugin_page) {
            return;
        }
        
        // Asegurar que jQuery UI y dependencias estén disponibles
        wp_enqueue_script('jquery');
        wp_enqueue_script('jquery-ui-core');
        wp_enqueue_script('jquery-ui-sortable');
        
        // Color picker de WordPress
        wp_enqueue_style('wp-color-picker');
        wp_enqueue_script('wp-color-picker');
        
        // Media uploader
        wp_enqueue_media();
        
        // CSS admin consolidado (reemplaza admin.css y admin-builder-v2.css) - con versionado automático
        $admin_css_version = $this->get_asset_version('assets/css/admin-consolidated.css');
        wp_enqueue_style(
            'sfq-admin-consolidated',
            SFQ_PLUGIN_URL . 'assets/css/admin-consolidated.css',
            array('wp-color-picker'),
            $admin_css_version
        );
        
        // JavaScript admin - Arquitectura optimizada - con versionado automático
        $admin_js_version = $this->get_asset_version('assets/js/admin-builder-v2.js');
        wp_enqueue_script(
            'sfq-admin',
            SFQ_PLUGIN_URL . 'assets/js/admin-builder-v2.js',
            array('jquery', 'jquery-ui-sortable', 'wp-color-picker'),
            $admin_js_version,
            true
        );
        
        // JavaScript para la lista de formularios (página principal) - con versionado automático
        if ($hook === 'toplevel_page_smart-forms-quiz') {
            $forms_list_js_version = $this->get_asset_version('assets/js/admin-forms-list.js');
            wp_enqueue_script(
                'sfq-admin-forms-list',
                SFQ_PLUGIN_URL . 'assets/js/admin-forms-list.js',
                array('jquery'),
                $forms_list_js_version,
                true
            );
        }
        
        // CSS y JavaScript para la página de submissions avanzada
        if ($hook === 'smart-forms_page_sfq-submissions') {
            $submissions_css_version = $this->get_asset_version('assets/css/admin-submissions.css');
            wp_enqueue_style(
                'sfq-admin-submissions',
                SFQ_PLUGIN_URL . 'assets/css/admin-submissions.css',
                array(),
                $submissions_css_version
            );
            
            $submissions_js_version = $this->get_asset_version('assets/js/admin-submissions-v2.js');
            wp_enqueue_script(
                'sfq-admin-submissions',
                SFQ_PLUGIN_URL . 'assets/js/admin-submissions-v2.js',
                array('jquery'),
                $submissions_js_version,
                true
            );
        }
        
        // CSS y JavaScript para la página de estadísticas de formulario
        if ($hook === 'admin_page_sfq-form-statistics') {
            $statistics_css_version = $this->get_asset_version('assets/css/admin-form-statistics.css');
            wp_enqueue_style(
                'sfq-admin-form-statistics',
                SFQ_PLUGIN_URL . 'assets/css/admin-form-statistics.css',
                array(),
                $statistics_css_version
            );
            
            $statistics_js_version = $this->get_asset_version('assets/js/admin-form-statistics.js');
            wp_enqueue_script(
                'sfq-admin-form-statistics',
                SFQ_PLUGIN_URL . 'assets/js/admin-form-statistics.js',
                array('jquery'),
                $statistics_js_version,
                true
            );
            
            // Localización para AJAX en estadísticas
            wp_localize_script('sfq-admin-form-statistics', 'sfq_ajax', array(
                'ajax_url' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('sfq_nonce'),
                'plugin_url' => SFQ_PLUGIN_URL,
                'strings' => array(
                    'loading' => __('Cargando...', 'smart-forms-quiz'),
                    'error' => __('Error al cargar', 'smart-forms-quiz'),
                    'no_data' => __('No hay datos disponibles', 'smart-forms-quiz'),
                    'export_success' => __('Exportación completada', 'smart-forms-quiz'),
                    'export_error' => __('Error al exportar', 'smart-forms-quiz')
                )
            ));
        }
        
        // Localización para AJAX en admin - DEBE ir después de enqueue_script
        wp_localize_script('sfq-admin', 'sfq_ajax', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('sfq_nonce'),
            'rest_url' => rest_url('sfq/v1/'),
            'plugin_url' => SFQ_PLUGIN_URL,
            'strings' => array(
                'saving' => __('Guardando...', 'smart-forms-quiz'),
                'saved' => __('Guardado correctamente', 'smart-forms-quiz'),
                'error' => __('Error al guardar', 'smart-forms-quiz'),
                'confirm_delete' => __('¿Estás seguro de eliminar esta pregunta?', 'smart-forms-quiz'),
                'confirm_delete_form' => __('¿Estás seguro de eliminar este formulario?', 'smart-forms-quiz'),
                'loading' => __('Cargando...', 'smart-forms-quiz'),
                'preview' => __('Vista previa', 'smart-forms-quiz'),
                'add_option' => __('Añadir opción', 'smart-forms-quiz'),
                'required_fields' => __('Por favor completa todos los campos requeridos', 'smart-forms-quiz')
            )
        ));
        
        
        // Añadir estilos inline para loading y notices
        wp_add_inline_style('sfq-admin', $this->get_admin_inline_styles());
    }
    
    public function register_rest_routes() {
        // Ruta para obtener formulario
        register_rest_route('sfq/v1', '/form/(?P<id>\d+)', array(
            'methods' => 'GET',
            'callback' => array($this->ajax, 'get_form'),
            'permission_callback' => '__return_true'
        ));
        
        // Ruta para enviar respuesta
        register_rest_route('sfq/v1', '/submit', array(
            'methods' => 'POST',
            'callback' => array($this->ajax, 'submit_response'),
            'permission_callback' => '__return_true'
        ));
        
        // Ruta para analytics
        register_rest_route('sfq/v1', '/analytics/(?P<id>\d+)', array(
            'methods' => 'GET',
            'callback' => array($this->analytics, 'get_stats'),
            'permission_callback' => function() {
                return current_user_can('manage_smart_forms');
            }
        ));
    }
    
    /**
     * Handle preview requests
     */
    public function handle_preview() {
        if (!isset($_GET['sfq_preview'])) {
            return;
        }
        
        // Verify user has permission to preview
        if (!current_user_can('manage_smart_forms')) {
            wp_die(__('No tienes permisos para ver esta vista previa', 'smart-forms-quiz'));
        }
        
        $form_id = intval($_GET['sfq_preview']);
        
        if (!$form_id) {
            wp_die(__('ID de formulario inválido', 'smart-forms-quiz'));
        }
        
        // Get form data
        $database = new SFQ_Database();
        $form = $database->get_form($form_id);
        
        if (!$form) {
            wp_die(__('Formulario no encontrado', 'smart-forms-quiz'));
        }
        
        // Output preview HTML
        $this->render_preview_page($form);
        exit;
    }
    
    /**
     * Render preview page
     */
    private function render_preview_page($form) {
        // Enqueue frontend assets manually for preview - con versionado automático
        $css_version = $this->get_asset_version('assets/css/frontend.css');
        wp_enqueue_style(
            'sfq-frontend',
            SFQ_PLUGIN_URL . 'assets/css/frontend.css',
            array(),
            $css_version
        );
        
        $js_version = $this->get_asset_version('assets/js/frontend.js');
        wp_enqueue_script(
            'sfq-frontend',
            SFQ_PLUGIN_URL . 'assets/js/frontend.js',
            array('jquery'),
            $js_version,
            true
        );
        
        // Localización para AJAX
        wp_localize_script('sfq-frontend', 'sfq_ajax', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('sfq_nonce'),
            'rest_url' => rest_url('sfq/v1/'),
            'strings' => array(
                'loading' => __('Cargando...', 'smart-forms-quiz'),
                'error' => __('Ha ocurrido un error', 'smart-forms-quiz'),
                'submit' => __('Enviar', 'smart-forms-quiz'),
                'next' => __('Siguiente', 'smart-forms-quiz'),
                'previous' => __('Anterior', 'smart-forms-quiz'),
                'start' => __('Comenzar', 'smart-forms-quiz')
            )
        ));
        
        ?>
        <!DOCTYPE html>
        <html <?php language_attributes(); ?>>
        <head>
            <meta charset="<?php bloginfo('charset'); ?>">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title><?php echo esc_html($form->title); ?> - <?php _e('Vista Previa', 'smart-forms-quiz'); ?></title>
            
            <!-- Load jQuery -->
            <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
            
            <!-- Load frontend CSS -->
            <link rel="stylesheet" href="<?php echo SFQ_PLUGIN_URL; ?>assets/css/frontend.css?v=<?php echo $this->get_asset_version('assets/css/frontend.css'); ?>">
            
            <style>
                body {
                    margin: 0;
                    padding: 20px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: #f5f5f5;
                }
                .sfq-preview-container {
                    max-width: 800px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                    overflow: hidden;
                }
                .sfq-preview-header {
                    background: #007cba;
                    color: white;
                    padding: 15px 20px;
                    font-size: 14px;
                    text-align: center;
                }
                .sfq-preview-content {
                    padding: 20px;
                }
            </style>
        </head>
        <body>
            <div class="sfq-preview-container">
                <div class="sfq-preview-header">
                    <?php _e('Vista Previa del Formulario', 'smart-forms-quiz'); ?> - <?php echo esc_html($form->title); ?>
                </div>
                <div class="sfq-preview-content">
                    <?php echo $this->frontend->render_form($form->id); ?>
                </div>
            </div>
            
            <!-- Load frontend JavaScript -->
            <script>
                // Define sfq_ajax object for frontend
                window.sfq_ajax = {
                    ajax_url: '<?php echo admin_url('admin-ajax.php'); ?>',
                    nonce: '<?php echo wp_create_nonce('sfq_nonce'); ?>',
                    rest_url: '<?php echo rest_url('sfq/v1/'); ?>',
                    strings: {
                        loading: '<?php _e('Cargando...', 'smart-forms-quiz'); ?>',
                        error: '<?php _e('Ha ocurrido un error', 'smart-forms-quiz'); ?>',
                        submit: '<?php _e('Enviar', 'smart-forms-quiz'); ?>',
                        next: '<?php _e('Siguiente', 'smart-forms-quiz'); ?>',
                        previous: '<?php _e('Anterior', 'smart-forms-quiz'); ?>',
                        start: '<?php _e('Comenzar', 'smart-forms-quiz'); ?>'
                    }
                };
            </script>
            <script src="<?php echo SFQ_PLUGIN_URL; ?>assets/js/frontend.js?v=<?php echo $this->get_asset_version('assets/js/frontend.js'); ?>"></script>
        </body>
        </html>
        <?php
    }
    
    /**
     * Check if frontend assets should be loaded (optimized)
     */
    private function should_load_frontend_assets() {
        global $post;
        
        // Always load on preview
        if (isset($_GET['sfq_preview'])) {
            return true;
        }
        
        // Check if current post/page contains shortcode
        if ($post && has_shortcode($post->post_content, 'smart_form')) {
            return true;
        }
        
        // Check for shortcode in widgets (more efficient check)
        $sidebars_widgets = wp_get_sidebars_widgets();
        if (!empty($sidebars_widgets)) {
            foreach ($sidebars_widgets as $sidebar => $widgets) {
                if (is_array($widgets)) {
                    foreach ($widgets as $widget) {
                        if (strpos($widget, 'text') === 0) {
                            $widget_options = get_option('widget_text');
                            if ($widget_options) {
                                foreach ($widget_options as $instance) {
                                    if (isset($instance['text']) && strpos($instance['text'], '[smart_form') !== false) {
                                        return true;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Only load on pages/posts that might contain forms (more restrictive)
        if (is_singular() && $post) {
            // Check post meta for form usage
            $has_form = get_post_meta($post->ID, '_has_smart_form', true);
            if ($has_form) {
                return true;
            }
            
            // Check content for shortcode (fallback)
            if (has_shortcode($post->post_content, 'smart_form')) {
                // Cache this for future requests
                update_post_meta($post->ID, '_has_smart_form', '1');
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Get asset version based on file modification time
     * Falls back to plugin version if file doesn't exist
     */
    private function get_asset_version($asset_path) {
        $file_path = SFQ_PLUGIN_DIR . $asset_path;
        
        // Check if file exists and get modification time
        if (file_exists($file_path)) {
            $file_time = filemtime($file_path);
            
            // In development mode, always use file time for cache busting
            if (defined('WP_DEBUG') && WP_DEBUG) {
                return $file_time;
            }
            
            // In production, combine plugin version with file time for better caching
            return SFQ_VERSION . '.' . $file_time;
        }
        
        // Fallback to plugin version if file doesn't exist
        return SFQ_VERSION;
    }
    
    /**
     * Get admin inline styles
     */
    private function get_admin_inline_styles() {
        return '
            .sfq-loading-indicator {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(255, 255, 255, 0.95);
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                z-index: 9999;
                text-align: center;
            }
            
            .sfq-loading-spinner {
                display: inline-block;
                width: 20px;
                height: 20px;
                border: 2px solid #f3f3f3;
                border-top: 2px solid #007cba;
                border-radius: 50%;
                animation: sfq-spin 1s linear infinite;
                margin-right: 10px;
            }
            
            @keyframes sfq-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .sfq-notice {
                position: fixed;
                top: 32px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 4px;
                color: white;
                font-weight: 500;
                z-index: 9999;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                animation: sfq-notice-slide-in 0.3s ease-out;
            }
            
            .sfq-notice-success {
                background-color: #46b450;
            }
            
            .sfq-notice-error {
                background-color: #dc3232;
            }
            
            @keyframes sfq-notice-slide-in {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            .sfq-builder-preview.active {
                display: block !important;
            }
            
            .sfq-question-placeholder {
                height: 100px;
                background: #f0f0f1;
                border: 2px dashed #c3c4c7;
                border-radius: 4px;
                margin: 10px 0;
            }
        ';
    }
}
