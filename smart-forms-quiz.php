<?php
/**
 * Plugin Name: Smart Forms & Quiz
 * Plugin URI: https://example.com/smart-forms-quiz
 * Description: Plugin eficiente para crear formularios y quiz modernos con lógica condicional y analytics
 * Version: 1.0.2
 * Author: Smart Forms Team
 * License: GPL v2 or later
 * Text Domain: smart-forms-quiz
 */

// Evitar acceso directo
if (!defined('ABSPATH')) {
    exit;
}

// Definir constantes del plugin
define('SFQ_VERSION', '1.0.2');
define('SFQ_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('SFQ_PLUGIN_URL', plugin_dir_url(__FILE__));
define('SFQ_PLUGIN_BASENAME', plugin_basename(__FILE__));

// Cargar clases principales
require_once SFQ_PLUGIN_DIR . 'includes/class-sfq-utils.php';
require_once SFQ_PLUGIN_DIR . 'includes/class-sfq-security.php';
require_once SFQ_PLUGIN_DIR . 'includes/class-sfq-activator.php';
require_once SFQ_PLUGIN_DIR . 'includes/class-sfq-loader.php';
require_once SFQ_PLUGIN_DIR . 'includes/class-sfq-database.php';
require_once SFQ_PLUGIN_DIR . 'includes/class-sfq-admin.php';
require_once SFQ_PLUGIN_DIR . 'includes/class-sfq-frontend.php';
require_once SFQ_PLUGIN_DIR . 'includes/class-sfq-ajax.php';
require_once SFQ_PLUGIN_DIR . 'includes/class-sfq-shortcode.php';
require_once SFQ_PLUGIN_DIR . 'includes/class-sfq-analytics.php';

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
    
    // Añadir headers de seguridad
    add_action('init', array('SFQ_Security', 'add_security_headers'));
    
    // Inicializar componentes
    $loader = new SFQ_Loader();
    $loader->init();
}

// Añadir enlace de configuración en la página de plugins
add_filter('plugin_action_links_' . SFQ_PLUGIN_BASENAME, 'sfq_plugin_action_links');
function sfq_plugin_action_links($links) {
    $settings_link = '<a href="' . admin_url('admin.php?page=smart-forms-quiz') . '">' . __('Configuración', 'smart-forms-quiz') . '</a>';
    array_unshift($links, $settings_link);
    return $links;
}
