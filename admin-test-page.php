<?php
/**
 * Página de prueba para ejecutar desde el admin de WordPress
 * Acceso: wp-admin/admin.php?page=sfq-test-fixes
 */

// Prevenir acceso directo
if (!defined('ABSPATH')) {
    exit;
}

// Añadir página de menú temporal para testing
add_action('admin_menu', 'sfq_add_test_page');

function sfq_add_test_page() {
    add_submenu_page(
        'tools.php',
        'Smart Forms - Test Critical Fixes',
        'SFQ Test Fixes',
        'manage_options',
        'sfq-test-fixes',
        'sfq_render_test_page'
    );
}

function sfq_render_test_page() {
    echo '<div class="wrap">';
    echo '<h1>Smart Forms & Quiz - Test Critical Fixes</h1>';
    
    if (isset($_GET['run_test'])) {
        // Incluir las clases necesarias
        if (file_exists(plugin_dir_path(__FILE__) . 'includes/class-sfq-database.php')) {
            require_once plugin_dir_path(__FILE__) . 'includes/class-sfq-database.php';
        }
        if (file_exists(plugin_dir_path(__FILE__) . 'includes/class-sfq-ajax.php')) {
            require_once plugin_dir_path(__FILE__) . 'includes/class-sfq-ajax.php';
        }
        
        // Incluir y ejecutar el test
        if (file_exists(plugin_dir_path(__FILE__) . 'test-critical-fixes.php')) {
            include plugin_dir_path(__FILE__) . 'test-critical-fixes.php';
        } else {
            echo '<div class="notice notice-error"><p>No se pudo encontrar el archivo de test.</p></div>';
        }
    } else {
        echo '<div class="notice notice-info">';
        echo '<p><strong>Este test verificará que los tres problemas críticos han sido resueltos:</strong></p>';
        echo '<ol>';
        echo '<li>Las preguntas no se cargan al editar formularios</li>';
        echo '<li>La sección de lógica condicional no es accesible</li>';
        echo '<li>La lógica de redirección por URL no funciona</li>';
        echo '</ol>';
        echo '</div>';
        
        echo '<p><a href="?page=sfq-test-fixes&run_test=1" class="button button-primary button-hero">Ejecutar Test de Critical Fixes</a></p>';
        
        echo '<hr>';
        echo '<h2>Instrucciones Alternativas</h2>';
        echo '<p>También puedes ejecutar el test directamente accediendo a esta URL:</p>';
        echo '<code>' . site_url() . '/wp-content/plugins/smart-forms-quiz/test-critical-fixes.php?run_test=1</code>';
        
        echo '<h2>Test de Diagnóstico</h2>';
        echo '<p>Para un diagnóstico más completo, puedes usar:</p>';
        echo '<code>' . site_url() . '/wp-content/plugins/smart-forms-quiz/debug-form-editing.php?run_debug=1</code>';
    }
    
    echo '</div>';
}

// Activar la página de test solo si estamos en el admin
if (is_admin()) {
    // El hook ya está definido arriba
}
