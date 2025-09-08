<?php
/**
 * Plugin Name: Smart Forms & Quiz
 * Plugin URI: https://github.com/joanproductivo/wp-smart-forms-quiz
 * Description: Plugin eficiente para crear formularios y quiz modernos con lógica condicional y analytics
 * Version: 2.2
 * Author: Joan Planas & IA
 * License: No puedes comercializar con este plugin.
 * Text Domain: smart-forms-quiz
 */

// Evitar acceso directo
if (!defined('ABSPATH')) {
    exit;
}

// Definir constantes del plugin
define('SFQ_VERSION', '2.2');
define('SFQ_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('SFQ_PLUGIN_URL', plugin_dir_url(__FILE__));
define('SFQ_PLUGIN_BASENAME', plugin_basename(__FILE__));

// Cargar clases principales
require_once SFQ_PLUGIN_DIR . 'includes/class-sfq-utils.php';
require_once SFQ_PLUGIN_DIR . 'includes/class-sfq-security.php';
require_once SFQ_PLUGIN_DIR . 'includes/class-sfq-activator.php';
require_once SFQ_PLUGIN_DIR . 'includes/class-sfq-loader.php';
require_once SFQ_PLUGIN_DIR . 'includes/class-sfq-database.php';
require_once SFQ_PLUGIN_DIR . 'includes/class-sfq-migration.php';
require_once SFQ_PLUGIN_DIR . 'includes/class-sfq-limits.php';
require_once SFQ_PLUGIN_DIR . 'includes/class-sfq-admin.php';
require_once SFQ_PLUGIN_DIR . 'includes/class-sfq-frontend.php';
require_once SFQ_PLUGIN_DIR . 'includes/class-sfq-ajax.php';
require_once SFQ_PLUGIN_DIR . 'includes/class-sfq-shortcode.php';
require_once SFQ_PLUGIN_DIR . 'includes/class-sfq-analytics.php';
require_once SFQ_PLUGIN_DIR . 'includes/class-sfq-button-views.php';
require_once SFQ_PLUGIN_DIR . 'includes/class-sfq-wp-rocket-compat.php';

// Cargar clases de webhooks
require_once SFQ_PLUGIN_DIR . 'includes/class-sfq-webhooks.php';

// Cargar clase de exportación/importación
require_once SFQ_PLUGIN_DIR . 'includes/class-sfq-export-import.php';

// Cargar clases de administración avanzadas
if (is_admin()) {
    require_once SFQ_PLUGIN_DIR . 'includes/admin/class-sfq-admin-submissions.php';
    require_once SFQ_PLUGIN_DIR . 'includes/admin/class-sfq-form-statistics.php';
    require_once SFQ_PLUGIN_DIR . 'includes/admin/class-sfq-webhook-admin.php';
}

// Cargar migraciones de base de datos
require_once SFQ_PLUGIN_DIR . 'includes/migrations/add-post-content-index.php';

// Activación del plugin
register_activation_hook(__FILE__, 'sfq_activate');
function sfq_activate() {
    SFQ_Activator::activate();
}

// Desactivación del plugin
register_deactivation_hook(__FILE__, 'sfq_deactivate');
function sfq_deactivate() {
    flush_rewrite_rules();
}

// Inicializar el plugin
add_action('plugins_loaded', 'sfq_init');
function sfq_init() {
    // Cargar textdomain para traducciones
    load_plugin_textdomain('smart-forms-quiz', false, dirname(SFQ_PLUGIN_BASENAME) . '/languages');
    
    // Verificar y ejecutar migraciones si es necesario
    sfq_check_and_run_migrations();
    
    // Añadir headers de seguridad
    add_action('init', array('SFQ_Security', 'add_security_headers'));
    
    // Inicializar compatibilidad con plugins de cache
    SFQ_WP_Rocket_Compat::get_instance();
    
    // Inicializar componentes
    $loader = new SFQ_Loader();
    $loader->init();
}

// Verificar y ejecutar migraciones automáticamente
function sfq_check_and_run_migrations() {
    $current_db_version = get_option('sfq_db_version', '1.0.0');
    $target_db_version = '1.1.0';
    
    // Solo ejecutar si la versión de BD es menor que la objetivo
    if (version_compare($current_db_version, $target_db_version, '<')) {
        $migration = new SFQ_Migration();
        
        if ($migration->is_migration_needed()) {
            error_log('SFQ: Ejecutando migración automática de v' . $current_db_version . ' a v' . $target_db_version);
            
            $migration_results = $migration->run_all_migrations();
            
            // Log de resultados
            foreach ($migration_results as $migration_name => $result) {
                if ($result['success']) {
                    error_log("SFQ: Migración automática {$migration_name} exitosa - {$result['message']}");
                } else {
                    error_log("SFQ: Error en migración automática {$migration_name} - {$result['message']}");
                }
            }
        }
    }
}

// Añadir enlace de configuración en la página de plugins
add_filter('plugin_action_links_' . SFQ_PLUGIN_BASENAME, 'sfq_plugin_action_links');
function sfq_plugin_action_links($links) {
    $settings_link = '<a href="' . admin_url('admin.php?page=smart-forms-quiz') . '">' . __('Configuración', 'smart-forms-quiz') . '</a>';
    array_unshift($links, $settings_link);
    return $links;
}

// ✅ NUEVO: Configurar cron job para limpiar respuestas parciales expiradas
add_action('wp', 'sfq_schedule_partial_cleanup');
function sfq_schedule_partial_cleanup() {
    if (!wp_next_scheduled('sfq_cleanup_partial_responses')) {
        wp_schedule_event(time(), 'daily', 'sfq_cleanup_partial_responses');
    }
}

// ✅ NUEVO: Ejecutar limpieza de respuestas parciales expiradas
add_action('sfq_cleanup_partial_responses', 'sfq_cleanup_expired_partial_responses');
function sfq_cleanup_expired_partial_responses() {
    global $wpdb;
    
    try {
        // Eliminar respuestas parciales expiradas
        $deleted_count = $wpdb->query(
            "DELETE FROM {$wpdb->prefix}sfq_partial_responses 
            WHERE expires_at < NOW()"
        );
        
        if ($deleted_count > 0) {
        }
        
        // Opcional: Limpiar también respuestas muy antiguas (más de 30 días)
        $old_deleted_count = $wpdb->query(
            "DELETE FROM {$wpdb->prefix}sfq_partial_responses 
            WHERE last_updated < DATE_SUB(NOW(), INTERVAL 30 DAY)"
        );
        
        if ($old_deleted_count > 0) {
        }
        
    } catch (Exception $e) {
    }
}

// ✅ NUEVO: Limpiar cron job al desactivar el plugin
register_deactivation_hook(__FILE__, 'sfq_clear_scheduled_hooks');
function sfq_clear_scheduled_hooks() {
    wp_clear_scheduled_hook('sfq_cleanup_partial_responses');
}
