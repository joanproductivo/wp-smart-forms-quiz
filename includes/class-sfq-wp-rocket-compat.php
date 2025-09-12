<?php
/**
 * Compatibilidad con WP Rocket
 * 
 * Esta clase maneja toda la lógica necesaria para hacer el plugin
 * compatible con WP Rocket y otros plugins de cache similares.
 */

if (!defined('ABSPATH')) {
    exit;
}

class SFQ_WP_Rocket_Compat {
    
    private static $instance = null;
    private static $static_form_pages_cache = null; // Cache estático para la petición actual
    private $wp_rocket_active = false;
    private $cache_plugins = array();
    private $form_pages_cache = array(); // Cache en memoria para la sesión actual
    private $cache_key = 'sfq_form_pages_cache'; // Clave para transients
    private $cache_duration = 604800; // 7 días en segundos (más agresivo)
    private $lazy_load_enabled = true; // Lazy loading activado
    private $cache_loaded = false; // Flag para saber si el cache ya se cargó
    private $object_cache_key = 'sfq_form_pages_object_cache'; // Cache de objeto
    private $cache_version = '1.3'; // Versión del cache para invalidación (incrementada)
    
    /**
     * Singleton instance
     */
    public static function get_instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Constructor
     */
    private function __construct() {
        $this->detect_cache_plugins();
        $this->init_hooks();
    }
    
    /**
     * Detectar plugins de cache activos
     */
    private function detect_cache_plugins() {
        // Detectar WP Rocket
        if (function_exists('rocket_clean_domain') || defined('WP_ROCKET_VERSION')) {
            $this->wp_rocket_active = true;
            $this->cache_plugins['wp_rocket'] = array(
                'name' => 'WP Rocket',
                'version' => defined('WP_ROCKET_VERSION') ? WP_ROCKET_VERSION : 'unknown',
                'active' => true
            );
        }
        
        // Detectar otros plugins de cache comunes
        $cache_plugins_check = array(
            'w3tc' => array(
                'name' => 'W3 Total Cache',
                'check' => function_exists('w3tc_flush_all')
            ),
            'wp_super_cache' => array(
                'name' => 'WP Super Cache',
                'check' => function_exists('wp_cache_clear_cache')
            ),
            'litespeed' => array(
                'name' => 'LiteSpeed Cache',
                'check' => defined('LSCWP_V')
            ),
            'wp_fastest_cache' => array(
                'name' => 'WP Fastest Cache',
                'check' => class_exists('WpFastestCache')
            ),
            'hummingbird' => array(
                'name' => 'Hummingbird',
                'check' => class_exists('Hummingbird\\WP_Hummingbird')
            )
        );
        
        foreach ($cache_plugins_check as $key => $plugin) {
            if ($plugin['check']) {
                $this->cache_plugins[$key] = array(
                    'name' => $plugin['name'],
                    'active' => true
                );
            }
        }
    }
    
    /**
     * Inicializar hooks
     */
    private function init_hooks() {
        // Solo inicializar si hay plugins de cache activos
        if (empty($this->cache_plugins)) {
            return;
        }
        
        // Hooks principales
        add_action('init', array($this, 'setup_cache_exclusions'), 1);
        add_action('wp_enqueue_scripts', array($this, 'enqueue_cache_compat_scripts'));
        
        // Hooks específicos de WP Rocket
        if ($this->wp_rocket_active) {
            $this->setup_wp_rocket_hooks();
        }
        
        // Hooks para limpiar cache cuando sea necesario
        add_action('sfq_form_submitted', array($this, 'maybe_clear_cache'));
        add_action('sfq_form_updated', array($this, 'clear_form_cache'));
        
        // Hooks para invalidar cache de páginas con formularios (optimizados)
        add_action('save_post', array($this, 'maybe_clear_form_cache_on_save'));
        add_action('delete_post', array($this, 'maybe_clear_form_cache_on_delete'));
        add_action('wp_update_nav_menu', array($this, 'clear_form_pages_cache'));
        
        // AJAX para nonces dinámicos
        add_action('wp_ajax_sfq_refresh_nonce', array($this, 'refresh_nonce'));
        add_action('wp_ajax_nopriv_sfq_refresh_nonce', array($this, 'refresh_nonce'));
        
        // Añadir información de compatibilidad al admin
        add_action('admin_notices', array($this, 'show_compatibility_notices'));
    }
    
    /**
     * Configurar hooks específicos de WP Rocket
     */
    private function setup_wp_rocket_hooks() {
        // Excluir páginas con formularios del cache
        add_filter('rocket_cache_reject_uri', array($this, 'exclude_form_pages'));
        
        // Excluir peticiones AJAX del cache
        add_filter('rocket_cache_reject_uri', array($this, 'exclude_ajax_requests'));
        
        // Configurar cookies que invaliden el cache
        add_filter('rocket_cache_mandatory_cookies', array($this, 'add_mandatory_cookies'));
        add_filter('rocket_cache_dynamic_cookies', array($this, 'add_dynamic_cookies'));
        
        // Excluir JavaScript crítico de optimizaciones
        add_filter('rocket_exclude_js', array($this, 'exclude_critical_js'));
        add_filter('rocket_exclude_defer_js', array($this, 'exclude_defer_js'));
        
        // Configurar User Cache para contenido personalizado
        add_filter('rocket_cache_user_cache_cookies', array($this, 'add_user_cache_cookies'));
        
        // Limpiar cache automáticamente
        add_action('sfq_clear_cache', array($this, 'clear_wp_rocket_cache'));
    }
    
    /**
     * Configurar exclusiones de cache
     */
    public function setup_cache_exclusions() {
        try {
            // Obtener todas las páginas que contienen formularios
            $form_pages = $this->get_pages_with_forms();
            
            // Validar que tenemos páginas para procesar
            if (empty($form_pages) || !is_array($form_pages)) {
                return;
            }
            
            // Configurar exclusiones según el plugin de cache
            if ($this->wp_rocket_active) {
                $this->configure_wp_rocket_exclusions($form_pages);
            }
            
            // Configurar exclusiones para otros plugins de cache
            foreach ($this->cache_plugins as $plugin_key => $plugin_data) {
                if ($plugin_key !== 'wp_rocket' && isset($plugin_data['active']) && $plugin_data['active']) {
                    $this->configure_generic_cache_exclusions($plugin_key, $form_pages);
                }
            }
            
        } catch (Exception $e) {
        }
    }
    
    /**
     * Obtener páginas que contienen formularios (con cache optimizado y lazy loading)
     */
    private function get_pages_with_forms() {
        // CRÍTICO: Cache estático para la petición actual - evita consultas repetitivas
        if (self::$static_form_pages_cache !== null) {
            return self::$static_form_pages_cache;
        }
        
        // Lazy loading: solo cargar si es absolutamente necesario
        if ($this->lazy_load_enabled && !$this->should_load_form_pages()) {
            self::$static_form_pages_cache = array();
            return array();
        }
        
        // Verificar cache en memoria primero (más agresivo)
        if (!empty($this->form_pages_cache) && $this->cache_loaded) {
            self::$static_form_pages_cache = $this->form_pages_cache;
            return $this->form_pages_cache;
        }
        
        // Verificar cache de objeto (más rápido que transients)
        $object_cache_key = $this->object_cache_key . '_' . $this->cache_version;
        $cached_pages = wp_cache_get($object_cache_key, 'sfq_form_pages');
        if ($cached_pages !== false && is_array($cached_pages)) {
            $this->form_pages_cache = $cached_pages;
            $this->cache_loaded = true;
            self::$static_form_pages_cache = $cached_pages;
            return $cached_pages;
        }
        
        // Verificar cache persistente (transients) como fallback
        $cached_pages = get_transient($this->cache_key);
        if ($cached_pages !== false && is_array($cached_pages)) {
            $this->form_pages_cache = $cached_pages;
            $this->cache_loaded = true;
            // Guardar también en object cache para próximas consultas
            wp_cache_set($object_cache_key, $cached_pages, 'sfq_form_pages', $this->cache_duration);
            self::$static_form_pages_cache = $cached_pages;
            return $cached_pages;
        }
        
        // Si no hay cache, ejecutar consulta optimizada
        $form_pages = $this->execute_optimized_query();
        
        // Guardar en todos los niveles de cache
        $this->form_pages_cache = $form_pages;
        $this->cache_loaded = true;
        wp_cache_set($object_cache_key, $form_pages, 'sfq_form_pages', $this->cache_duration);
        set_transient($this->cache_key, $form_pages, $this->cache_duration);
        self::$static_form_pages_cache = $form_pages;
        
        return $form_pages;
    }
    
    /**
     * Ejecutar consulta optimizada para encontrar formularios
     */
    private function execute_optimized_query() {
        global $wpdb;
        $form_pages = array();
        
        // CRÍTICO: Verificar que WordPress esté completamente inicializado
        if (!did_action('wp_loaded') || !function_exists('get_permalink')) {
            // Si WordPress no está listo, devolver array vacío y cachear por menos tiempo
            error_log('SFQ: WordPress no está completamente inicializado, posponiendo consulta de formularios');
            return array();
        }
        
        // Verificar que las rewrite rules estén disponibles
        global $wp_rewrite;
        if (!$wp_rewrite || !is_object($wp_rewrite)) {
            error_log('SFQ: WP Rewrite no está disponible, posponiendo consulta de formularios');
            return array();
        }
        
        // Consulta optimizada con filtro temporal y mejor rendimiento
        $posts_with_forms = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT DISTINCT ID, post_name, post_type 
                FROM {$wpdb->posts} 
                WHERE post_status = %s
                AND post_type IN ('post', 'page')
                AND (post_content LIKE %s OR post_content LIKE %s)
                AND post_date > DATE_SUB(NOW(), INTERVAL 6 MONTH)
                ORDER BY post_date DESC
                LIMIT 500",
                'publish',
                '%[smart_form%',
                '%wp:shortcode%smart_form%'
            )
        );
        
        // Si no encontramos nada en los últimos 6 meses, buscar en todo el historial
        if (empty($posts_with_forms)) {
            $posts_with_forms = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT DISTINCT ID, post_name, post_type 
                    FROM {$wpdb->posts} 
                    WHERE post_status = %s
                    AND post_type IN ('post', 'page')
                    AND (post_content LIKE %s OR post_content LIKE %s)
                    ORDER BY post_modified DESC
                    LIMIT 200",
                    'publish',
                    '%[smart_form%',
                    '%wp:shortcode%smart_form%'
                )
            );
        }
        
        foreach ($posts_with_forms as $post) {
            try {
                // CRÍTICO: Verificar que get_permalink esté disponible y funcional
                if (!function_exists('get_permalink')) {
                    continue;
                }
                
                $permalink = get_permalink($post->ID);
                if ($permalink && is_string($permalink) && $permalink !== false) {
                    $parsed_url = parse_url($permalink, PHP_URL_PATH);
                    if ($parsed_url && is_string($parsed_url)) {
                        $form_pages[] = $parsed_url;
                    }
                }
            } catch (Exception $e) {
                error_log('SFQ: Error obteniendo permalink para post ' . $post->ID . ': ' . $e->getMessage());
                continue;
            }
        }
        
        // Buscar en widgets solo si WordPress está completamente cargado
        if (did_action('wp_loaded')) {
            $this->find_forms_in_widgets($form_pages);
        }
        
        // Eliminar duplicados
        return array_unique($form_pages);
    }
    
    /**
     * Determinar si realmente necesitamos cargar las páginas con formularios
     */
    private function should_load_form_pages() {
        // CRÍTICO: No cargar si WordPress no está completamente inicializado
        if (!did_action('wp_loaded')) {
            return false;
        }
        
        // Solo cargar si estamos en contextos donde realmente se necesita
        if (is_admin()) {
            return false; // No necesario en admin
        }
        
        if (wp_doing_ajax()) {
            return false; // No necesario en AJAX (a menos que sea específico)
        }
        
        if (wp_doing_cron()) {
            return false; // No necesario en cron
        }
        
        // NUEVO: No cargar durante la instalación/activación
        if (defined('WP_INSTALLING') && WP_INSTALLING) {
            return false;
        }
        
        // NUEVO: No cargar en peticiones de recursos estáticos
        if (isset($_SERVER['REQUEST_URI'])) {
            $request_uri = $_SERVER['REQUEST_URI'];
            if (preg_match('/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|pdf|zip|mp4|mp3)$/i', $request_uri)) {
                return false;
            }
        }
        
        // NUEVO: No cargar en REST API requests
        if (defined('REST_REQUEST') && REST_REQUEST) {
            return false;
        }
        
        // NUEVO: No cargar en XML-RPC requests
        if (defined('XMLRPC_REQUEST') && XMLRPC_REQUEST) {
            return false;
        }
        
        // NUEVO: No cargar en wp-login.php
        if (isset($GLOBALS['pagenow']) && $GLOBALS['pagenow'] === 'wp-login.php') {
            return false;
        }
        
        // Solo cargar si hay plugins de cache activos
        if (empty($this->cache_plugins)) {
            return false;
        }
        
        // CRÍTICO: Verificar que las funciones necesarias estén disponibles
        if (!function_exists('get_permalink') || !function_exists('parse_url')) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Buscar formularios en widgets (método optimizado)
     */
    private function find_forms_in_widgets(&$form_pages) {
        // Buscar en widgets de texto
        $widget_options = get_option('widget_text', array());
        foreach ($widget_options as $widget) {
            if (is_array($widget) && isset($widget['text']) && 
                is_string($widget['text']) && !empty($widget['text']) && 
                strpos($widget['text'], '[smart_form') !== false) {
                // Si hay formularios en widgets, excluir todo el sitio de cache dinámico
                $form_pages[] = '/*';
                return; // No necesitamos seguir buscando
            }
        }
        
        // Buscar en otros tipos de widgets que puedan contener shortcodes
        $widget_types = array('widget_custom_html', 'widget_block');
        foreach ($widget_types as $widget_type) {
            $widgets = get_option($widget_type, array());
            foreach ($widgets as $widget) {
                if (is_array($widget)) {
                    $content = isset($widget['content']) ? $widget['content'] : 
                              (isset($widget['text']) ? $widget['text'] : '');
                    
                    if (is_string($content) && !empty($content) && strpos($content, '[smart_form') !== false) {
                        $form_pages[] = '/*';
                        return; // No necesitamos seguir buscando
                    }
                }
            }
        }
    }
    
    /**
     * Limpiar cache de páginas con formularios
     */
    public function clear_form_pages_cache() {
        // CRÍTICO: Limpiar cache estático para la petición actual
        self::$static_form_pages_cache = null;
        
        // Limpiar cache en memoria
        $this->form_pages_cache = array();
        $this->cache_loaded = false;
        
        // Limpiar cache de objeto
        $object_cache_key = $this->object_cache_key . '_' . $this->cache_version;
        wp_cache_delete($object_cache_key, 'sfq_form_pages');
        
        // Limpiar cache persistente
        delete_transient($this->cache_key);
        
        // Limpiar cache de plugins si es necesario
        if (!empty($this->cache_plugins)) {
            $this->clear_all_caches();
        }
    }
    
    /**
     * Limpiar cache solo si el post contiene formularios (optimizado)
     */
    public function maybe_clear_form_cache_on_save($post_id) {
        // Evitar ejecución en auto-saves y revisiones
        if (wp_is_post_autosave($post_id) || wp_is_post_revision($post_id)) {
            return;
        }
        
        $post = get_post($post_id);
        if (!$post || $post->post_status !== 'publish') {
            return;
        }
        
        // Solo limpiar cache si el post contiene formularios
        if ($this->post_contains_forms($post)) {
            $this->clear_form_pages_cache();
        }
    }
    
    /**
     * Limpiar cache solo si el post eliminado contiene formularios
     */
    public function maybe_clear_form_cache_on_delete($post_id) {
        $post = get_post($post_id);
        if (!$post) {
            return;
        }
        
        // Solo limpiar cache si el post contiene formularios
        if ($this->post_contains_forms($post)) {
            $this->clear_form_pages_cache();
        }
    }
    
    /**
     * Verificar si un post contiene formularios
     */
    private function post_contains_forms($post) {
        if (!$post || !isset($post->post_content) || !is_string($post->post_content) || empty($post->post_content)) {
            return false;
        }
        
        return (strpos($post->post_content, '[smart_form') !== false || 
                strpos($post->post_content, 'wp:shortcode%smart_form') !== false);
    }
    
    /**
     * Configurar exclusiones específicas de WP Rocket
     * Usar filtros en lugar de modificar opciones directamente (más seguro)
     */
    private function configure_wp_rocket_exclusions($form_pages) {
        // Almacenar páginas para usar en filtros
        $this->form_pages_cache = $form_pages;
        
        // Los filtros ya están configurados en setup_wp_rocket_hooks()
        // Solo necesitamos limpiar cache si es necesario
        if (function_exists('rocket_clean_domain')) {
            rocket_clean_domain();
        }
        
        // Log para debug
    }
    
    /**
     * Excluir páginas con formularios del cache (filtro WP Rocket)
     */
    public function exclude_form_pages($excluded_uris) {
        // Validar que $excluded_uris sea un array
        if (!is_array($excluded_uris)) {
            $excluded_uris = array();
        }
        
        // Usar cache en memoria si está disponible, evitar consulta repetitiva
        if (!empty($this->form_pages_cache)) {
            $form_pages = $this->form_pages_cache;
        } else {
            $form_pages = $this->get_pages_with_forms();
        }
        
        // ✅ MODIFICADO: Ya no excluimos páginas completas por defecto, ya que el formulario se carga vía AJAX.
        // Solo mantenemos las exclusiones basadas en parámetros de URL que indican contenido dinámico.
        
        // Patrones adicionales que siempre deben ser excluidos
        $additional_patterns = array(
            '(.*)sfq_form_id=(.*)',
            '(.*)sfq_session_id=(.*)',
            '(.*)sfq_timer_expired=(.*)'
        );
        
        foreach ($additional_patterns as $pattern) {
            if (!in_array($pattern, $excluded_uris)) {
                $excluded_uris[] = $pattern;
            }
        }
        
        return $excluded_uris;
    }
    
    /**
     * Excluir peticiones AJAX del cache
     */
    public function exclude_ajax_requests($excluded_uris) {
        // Validar que $excluded_uris sea un array
        if (!is_array($excluded_uris)) {
            $excluded_uris = array();
        }
        
        $ajax_actions = array(
            'sfq_submit_response',
            'sfq_track_event',
            'sfq_get_next_question',
            'sfq_save_partial_response',
            'sfq_get_partial_response',
            'sfq_check_form_completion',
            'sfq_upload_file',
            'sfq_refresh_nonce',
            'sfq_get_form_content',// Omite la verificación de nonce bajo la condición de que el temporizador del formulario haya expirado. Esto es crucial para la UX, ya que un usuario que espera la expiración de un temporizador no debería ser bloqueado por un nonce expirado al intentar acceder al formulario.
            'sfq_get_full_form' // Excluir el nuevo endpoint de carga AJAX del formulario
        );
        
        foreach ($ajax_actions as $action) {
            $patterns = array(
                '/wp-admin/admin-ajax.php?action=' . $action,
                '(.*)action=' . $action . '(.*)'
            );
            
            foreach ($patterns as $pattern) {
                if (!in_array($pattern, $excluded_uris)) {
                    $excluded_uris[] = $pattern;
                }
            }
        }
        
        return $excluded_uris;
    }

    /**
     * Añadir cookies obligatorias que invalidan el cache
     */
    public function add_mandatory_cookies($cookies) {
        // Validar que $cookies sea un array
        if (!is_array($cookies)) {
            $cookies = array();
        }
        
        $sfq_cookies = array(
            'sfq_session_*',
            'sfq_form_*',
            'sfq_partial_*',
            'sfq_rate_limit_*'
        );
        
        // Evitar duplicados
        foreach ($sfq_cookies as $cookie) {
            if (!in_array($cookie, $cookies)) {
                $cookies[] = $cookie;
            }
        }
        
        return $cookies;
    }

    /**
     * Añadir cookies dinámicas
     */
    public function add_dynamic_cookies($cookies) {
        // Validar que $cookies sea un array
        if (!is_array($cookies)) {
            $cookies = array();
        }
        
        $sfq_dynamic_cookies = array(
            'sfq_user_progress_*',
            'sfq_form_state_*'
        );
        
        // Evitar duplicados
        foreach ($sfq_dynamic_cookies as $cookie) {
            if (!in_array($cookie, $cookies)) {
                $cookies[] = $cookie;
            }
        }
        
        return $cookies;
    }

    /**
     * Excluir JavaScript crítico de optimizaciones
     */
    public function exclude_critical_js($excluded_js) {
        // Validar que $excluded_js sea un array
        if (!is_array($excluded_js)) {
            $excluded_js = array();
        }
        
        $sfq_js = array(
            SFQ_PLUGIN_URL . 'assets/js/frontend.js',
            SFQ_PLUGIN_URL . 'assets/js/preview-manager.js'
        );
        
        // Evitar duplicados
        foreach ($sfq_js as $js_file) {
            if (!in_array($js_file, $excluded_js)) {
                $excluded_js[] = $js_file;
            }
        }
        
        return $excluded_js;
    }

    /**
     * Excluir JavaScript del defer
     */
    public function exclude_defer_js($excluded_js) {
        return $this->exclude_critical_js($excluded_js);
    }

    /**
     * Añadir cookies para User Cache
     */
    public function add_user_cache_cookies($cookies) {
        // Validar que $cookies sea un array
        if (!is_array($cookies)) {
            $cookies = array();
        }
        
        $sfq_user_cookies = array(
            'sfq_user_id',
            'sfq_session_id'
        );
        
        // Evitar duplicados
        foreach ($sfq_user_cookies as $cookie) {
            if (!in_array($cookie, $cookies)) {
                $cookies[] = $cookie;
            }
        }
        
        return $cookies;
    }
    
    /**
     * Limpiar cache de WP Rocket
     */
    public function clear_wp_rocket_cache($form_id = null) {
        if (!$this->wp_rocket_active) {
            return;
        }
        
        if ($form_id) {
            // Limpiar cache específico del formulario - usar cache en memoria si está disponible
            if (!empty($this->form_pages_cache)) {
                $form_pages = $this->form_pages_cache;
            } else {
                $form_pages = $this->get_pages_with_forms();
            }
            
            foreach ($form_pages as $page) {
                if (function_exists('rocket_clean_files')) {
                    rocket_clean_files($page);
                }
            }
        } else {
            // Limpiar todo el cache del dominio
            if (function_exists('rocket_clean_domain')) {
                rocket_clean_domain();
            }
        }
        
        // Limpiar cache de minificación
        if (function_exists('rocket_clean_minify')) {
            rocket_clean_minify();
        }
    }
    
    /**
     * Configurar exclusiones para otros plugins de cache
     */
    private function configure_generic_cache_exclusions($plugin_key, $form_pages) {
        switch ($plugin_key) {
            case 'w3tc':
                $this->configure_w3tc_exclusions($form_pages);
                break;
                
            case 'wp_super_cache':
                $this->configure_wp_super_cache_exclusions($form_pages);
                break;
                
            case 'litespeed':
                $this->configure_litespeed_exclusions($form_pages);
                break;
                
            case 'wp_fastest_cache':
                $this->configure_wp_fastest_cache_exclusions($form_pages);
                break;
        }
    }
    
    /**
     * Configurar exclusiones para W3 Total Cache
     */
    private function configure_w3tc_exclusions($form_pages) {
        if (!function_exists('w3tc_flush_all') || !function_exists('w3tc_config')) {
            return;
        }
        
        try {
            // W3TC usa diferentes métodos según la configuración
            // Añadir páginas a la lista de exclusión
            $w3tc_config = w3tc_config();
            if ($w3tc_config && method_exists($w3tc_config, 'get_array')) {
                $rejected_uris = $w3tc_config->get_array('pgcache.reject.uri');
                
                // Validar que $rejected_uris sea un array
                if (!is_array($rejected_uris)) {
                    $rejected_uris = array();
                }
                
                foreach ($form_pages as $page) {
                    if (!in_array($page, $rejected_uris)) {
                        $rejected_uris[] = $page;
                    }
                }
                
                $w3tc_config->set('pgcache.reject.uri', $rejected_uris);
                $w3tc_config->save();
                
            }
        } catch (Exception $e) {
        }
    }
    
    /**
     * Configurar exclusiones para WP Super Cache
     */
    private function configure_wp_super_cache_exclusions($form_pages) {
        global $cache_rejected_uri;
        
        if (!is_array($cache_rejected_uri)) {
            $cache_rejected_uri = array();
        }
        
        foreach ($form_pages as $page) {
            if (!in_array($page, $cache_rejected_uri)) {
                $cache_rejected_uri[] = $page;
            }
        }
    }
    
    /**
     * Configurar exclusiones para LiteSpeed Cache
     */
    private function configure_litespeed_exclusions($form_pages) {
        if (!defined('LSCWP_V')) {
            return;
        }
        
        // LiteSpeed Cache maneja exclusiones a través de su API
        foreach ($form_pages as $page) {
            do_action('litespeed_cache_add_exclude', $page);
        }
    }
    
    /**
     * Configurar exclusiones para WP Fastest Cache
     */
    private function configure_wp_fastest_cache_exclusions($form_pages) {
        if (!class_exists('WpFastestCache')) {
            return;
        }
        
        try {
            // WP Fastest Cache usa reglas de exclusión
            $wpfc_options = get_option('WpFastestCache', array());
            
            // Validar que $wpfc_options sea un array
            if (!is_array($wpfc_options)) {
                $wpfc_options = array();
            }
            
            if (!isset($wpfc_options['wpFastestCacheExclude']) || !is_array($wpfc_options['wpFastestCacheExclude'])) {
                $wpfc_options['wpFastestCacheExclude'] = array();
            }
            
            foreach ($form_pages as $page) {
                $exclusion_rule = array(
                    'type' => 'page',
                    'content' => $page,
                    'prefix' => 'contain'
                );
                
                // Evitar duplicados
                $exists = false;
                foreach ($wpfc_options['wpFastestCacheExclude'] as $existing_rule) {
                    if (is_array($existing_rule) && 
                        isset($existing_rule['content']) && 
                        $existing_rule['content'] === $page) {
                        $exists = true;
                        break;
                    }
                }
                
                if (!$exists) {
                    $wpfc_options['wpFastestCacheExclude'][] = $exclusion_rule;
                }
            }
            
            update_option('WpFastestCache', $wpfc_options);
            
            
        } catch (Exception $e) {
        }
    }
    
    /**
     * Limpiar cache cuando sea necesario
     */
    public function maybe_clear_cache($form_id = null) {
        // Limpiar cache después de envío de formulario
        $this->clear_all_caches($form_id);
    }
    
    /**
     * Limpiar cache del formulario
     */
    public function clear_form_cache($form_id) {
        $this->clear_all_caches($form_id);
    }
    
    /**
     * Limpiar cache de todos los plugins detectados
     */
    private function clear_all_caches($form_id = null) {
        foreach ($this->cache_plugins as $plugin_key => $plugin_data) {
            if (!$plugin_data['active']) {
                continue;
            }
            
            switch ($plugin_key) {
                case 'wp_rocket':
                    $this->clear_wp_rocket_cache($form_id);
                    break;
                    
                case 'w3tc':
                    if (function_exists('w3tc_flush_all')) {
                        w3tc_flush_all();
                    }
                    break;
                    
                case 'wp_super_cache':
                    if (function_exists('wp_cache_clear_cache')) {
                        wp_cache_clear_cache();
                    }
                    break;
                    
                case 'litespeed':
                    if (defined('LSCWP_V')) {
                        do_action('litespeed_purge_all');
                    }
                    break;
                    
                case 'wp_fastest_cache':
                    if (class_exists('WpFastestCache')) {
                        $wpfc = new WpFastestCache();
                        $wpfc->deleteCache();
                    }
                    break;
                    
                case 'hummingbird':
                    if (class_exists('Hummingbird\\WP_Hummingbird')) {
                        do_action('wphb_clear_page_cache');
                    }
                    break;
            }
        }
    }
    
    /**
     * Enqueue scripts de compatibilidad con cache
     */
    public function enqueue_cache_compat_scripts() {
        // Solo cargar en páginas que contienen formularios
        if (!$this->page_has_forms()) {
            return;
        }
        
        wp_enqueue_script(
            'sfq-cache-compat',
            SFQ_PLUGIN_URL . 'assets/js/cache-compat.js',
            array('jquery'),
            SFQ_VERSION,
            true
        );
        
        // Pasar datos de configuración al JavaScript
        wp_localize_script('sfq-cache-compat', 'sfqCacheCompat', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce_refresh_action' => 'sfq_refresh_nonce',
            'cache_plugins' => $this->cache_plugins,
            'wp_rocket_active' => $this->wp_rocket_active,
            'nonce_lifetime' => wp_nonce_tick() * 2, // Tiempo de vida del nonce en segundos
            'refresh_interval' => 30 * 60 * 1000, // 30 minutos en milisegundos
        ));
    }
    
    /**
     * Verificar si la página actual contiene formularios
     */
    private function page_has_forms() {
        global $post;
        
        if (!$post) {
            return false;
        }
        
        // Verificar shortcodes en el contenido
        if (has_shortcode($post->post_content, 'smart_form')) {
            return true;
        }
        
        // Verificar bloques de Gutenberg
        if (function_exists('has_block') && has_block('shortcode', $post)) {
            $blocks = parse_blocks($post->post_content);
            foreach ($blocks as $block) {
                if ($block['blockName'] === 'core/shortcode' && 
                    isset($block['attrs']['text']) && 
                    is_string($block['attrs']['text']) && !empty($block['attrs']['text']) &&
                    strpos($block['attrs']['text'], 'smart_form') !== false) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Refrescar nonce vía AJAX
     */
    public function refresh_nonce() {
        // Verificar que la petición sea válida
        if (!wp_verify_nonce($_POST['old_nonce'] ?? '', 'sfq_nonce') && 
            !wp_verify_nonce($_POST['old_nonce'] ?? '', 'sfq_refresh_nonce')) {
            // Si el nonce está muy expirado, permitir refresh basado en sesión
            if (empty($_POST['session_id'])) {
                wp_send_json_error(array(
                    'message' => __('Sesión inválida', 'smart-forms-quiz'),
                    'code' => 'INVALID_SESSION'
                ));
                return;
            }
        }
        
        // Generar nuevo nonce
        $new_nonce = wp_create_nonce('sfq_nonce');
        
        // Información adicional del nonce
        $nonce_info = array(
            'nonce' => $new_nonce,
            'created_at' => time(),
            'expires_at' => time() + (wp_nonce_tick() * 2),
            'tick' => wp_nonce_tick()
        );
        
        wp_send_json_success(array(
            'nonce' => $new_nonce,
            'nonce_info' => $nonce_info,
            'message' => __('Nonce actualizado correctamente', 'smart-forms-quiz')
        ));
    }
    
    /**
     * Mostrar avisos de compatibilidad en el admin
     */
    public function show_compatibility_notices() {
        // Solo mostrar en páginas del plugin
        $screen = get_current_screen();
        if (!$screen || !is_string($screen->id) || strpos($screen->id, 'smart-forms-quiz') === false) {
            return;
        }
        
        if (empty($this->cache_plugins)) {
            return;
        }
        
        // Aviso informativo sobre plugins de cache detectados
        $cache_names = array_column($this->cache_plugins, 'name');
        ?>
        <div class="notice notice-info is-dismissible">
            <p>
                <strong><?php _e('Smart Forms & Quiz - Compatibilidad con Cache', 'smart-forms-quiz'); ?></strong>
            </p>
            <p>
                <?php 
                printf(
                    __('Se han detectado los siguientes plugins de cache: %s. La compatibilidad se ha configurado automáticamente.', 'smart-forms-quiz'),
                    '<strong>' . implode(', ', $cache_names) . '</strong>'
                );
                ?>
            </p>
            <?php if ($this->wp_rocket_active) : ?>
                <p>
                    <em><?php _e('WP Rocket: Se han añadido exclusiones automáticas para formularios dinámicos, peticiones AJAX y cookies de sesión.', 'smart-forms-quiz'); ?></em>
                </p>
            <?php endif; ?>
        </div>
        <?php
    }
    
    /**
     * Obtener información de compatibilidad para debug
     */
    public function get_compatibility_info() {
        return array(
            'cache_plugins_detected' => $this->cache_plugins,
            'wp_rocket_active' => $this->wp_rocket_active,
            'form_pages' => $this->get_pages_with_forms(),
            'exclusions_configured' => !empty($this->cache_plugins),
            'last_cache_clear' => get_option('sfq_last_cache_clear', 'never')
        );
    }
    
    /**
     * Método para debug - mostrar información de compatibilidad
     */
    public function debug_compatibility_info() {
        if (!current_user_can('manage_options') || !WP_DEBUG) {
            return;
        }
        
        $info = $this->get_compatibility_info();
    }
}
