<?php
/**
 * Manejo de shortcodes
 */

if (!defined('ABSPATH')) {
    exit;
}

class SFQ_Shortcode {
    
    private $frontend;
    
    public function __construct() {
        $this->frontend = new SFQ_Frontend();
    }
    
    public function init() {
        // Registrar shortcodes
        add_shortcode('smart_form', array($this, 'render_form_shortcode'));
        add_shortcode('smart_quiz', array($this, 'render_form_shortcode')); // Alias
        
        // Shortcode para mostrar estadísticas
        add_shortcode('smart_form_stats', array($this, 'render_stats_shortcode'));
    }
    
    /**
     * Renderizar shortcode del formulario
     */
    public function render_form_shortcode($atts) {
        $atts = shortcode_atts(array(
            'id' => 0,
            'class' => '',
            'style' => ''
        ), $atts, 'smart_form');
        
        $form_id = intval($atts['id']);
        
        if (!$form_id) {
            return '<p>' . __('Por favor, especifica un ID de formulario válido.', 'smart-forms-quiz') . '</p>';
        }
        
        // Añadir clases y estilos personalizados si se proporcionan
        $wrapper_attrs = '';
        if (!empty($atts['class'])) {
            $wrapper_attrs .= ' class="' . esc_attr($atts['class']) . '"';
        }
        if (!empty($atts['style'])) {
            $wrapper_attrs .= ' style="' . esc_attr($atts['style']) . '"';
        }
        
        // Generar un ID único para el contenedor del formulario
        $unique_id = 'sfq-form-ajax-container-' . uniqid();

        // Obtener o crear el ID de sesión
        $session_id = SFQ_Utils::get_or_create_session_id($form_id);
        
        $output = '<div id="' . esc_attr($unique_id) . '"' . $wrapper_attrs . ' data-form-id="' . esc_attr($form_id) . '" data-session-id="' . esc_attr($session_id) . '" class="sfq-form-ajax-placeholder">';
        $output .= '<div class="sfq-loading-spinner"></div>';
        $output .= '<p>' . __('Cargando formulario...', 'smart-forms-quiz') . '</p>';
        $output .= '</div>';
        
        return $output;
    }
    
    /**
     * Renderizar shortcode de estadísticas
     */
    public function render_stats_shortcode($atts) {
        $atts = shortcode_atts(array(
            'id' => 0,
            'type' => 'completion_rate', // completion_rate, views, submissions
            'format' => 'text' // text, percentage, number
        ), $atts, 'smart_form_stats');
        
        $form_id = intval($atts['id']);
        
        if (!$form_id) {
            return '';
        }
        
        global $wpdb;
        
        // Obtener estadísticas
        $stats = $this->get_form_statistics($form_id);
        
        switch ($atts['type']) {
            case 'completion_rate':
                $value = $stats['completion_rate'];
                if ($atts['format'] === 'percentage') {
                    return $value . '%';
                } else {
                    return sprintf(__('Tasa de completado: %s%%', 'smart-forms-quiz'), $value);
                }
                break;
                
            case 'views':
                $value = $stats['views'];
                if ($atts['format'] === 'number') {
                    return $value;
                } else {
                    return sprintf(__('Vistas: %d', 'smart-forms-quiz'), $value);
                }
                break;
                
            case 'submissions':
                $value = $stats['submissions'];
                if ($atts['format'] === 'number') {
                    return $value;
                } else {
                    return sprintf(__('Envíos: %d', 'smart-forms-quiz'), $value);
                }
                break;
                
            default:
                return '';
        }
    }
    
    /**
     * Obtener estadísticas del formulario
     */
    private function get_form_statistics($form_id) {
        global $wpdb;
        
        // Contar vistas
        $views = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(DISTINCT session_id) 
            FROM {$wpdb->prefix}sfq_analytics 
            WHERE form_id = %d AND event_type = 'view'",
            $form_id
        ));
        
        // Contar envíos completados
        $submissions = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) 
            FROM {$wpdb->prefix}sfq_submissions 
            WHERE form_id = %d AND status = 'completed'",
            $form_id
        ));
        
        // Calcular tasa de completado
        $completion_rate = $views > 0 ? round(($submissions / $views) * 100, 1) : 0;
        
        return array(
            'views' => intval($views),
            'submissions' => intval($submissions),
            'completion_rate' => $completion_rate
        );
    }
}
