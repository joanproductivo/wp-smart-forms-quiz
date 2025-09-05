<?php
/**
 * Sistema de seguimiento de vistas de botones
 * Registra cuando los usuarios ven botones de preguntas estilo libre
 */

if (!defined('ABSPATH')) {
    exit;
}

class SFQ_Button_Views {
    
    private $database;
    
    public function __construct() {
        $this->database = new SFQ_Database();
    }
    
    public function init() {
        // AJAX handlers para registrar vistas de botones
        add_action('wp_ajax_sfq_register_button_view', array($this, 'register_button_view'));
        add_action('wp_ajax_nopriv_sfq_register_button_view', array($this, 'register_button_view'));
        
        // AJAX handlers para obtener estadísticas de botones
        add_action('wp_ajax_sfq_get_button_stats', array($this, 'get_button_stats'));
    }
    
    /**
     * Registrar vista de botón
     */
    public function register_button_view() {
        // Verificar nonce
        if (!check_ajax_referer('sfq_nonce', 'nonce', false)) {
            wp_send_json_error(__('Error de seguridad', 'smart-forms-quiz'));
            return;
        }
        
        $form_id = intval($_POST['form_id'] ?? 0);
        $question_id = intval($_POST['question_id'] ?? 0);
        $element_id = sanitize_text_field($_POST['element_id'] ?? '');
        $session_id = sanitize_text_field($_POST['session_id'] ?? '');
        $button_text = sanitize_text_field($_POST['button_text'] ?? '');
        $button_url = esc_url_raw($_POST['button_url'] ?? '');
        
        if (!$form_id || !$question_id || !$element_id || !$session_id) {
            wp_send_json_error(__('Datos incompletos', 'smart-forms-quiz'));
            return;
        }
        
        try {
            // Verificar si ya se registró esta vista para esta sesión
            if ($this->is_button_view_already_registered($form_id, $question_id, $element_id, $session_id)) {
                wp_send_json_success(array('message' => 'Vista ya registrada'));
                return;
            }
            
            // Registrar la vista del botón
            $result = $this->save_button_view($form_id, $question_id, $element_id, $session_id, $button_text, $button_url);
            
            if ($result) {
                wp_send_json_success(array('message' => 'Vista registrada correctamente'));
            } else {
                wp_send_json_error(__('Error al registrar vista', 'smart-forms-quiz'));
            }
            
        } catch (Exception $e) {
            error_log('SFQ Button Views Error: ' . $e->getMessage());
            wp_send_json_error('Error interno: ' . $e->getMessage());
        }
    }
    
    /**
     * Verificar si ya se registró la vista del botón para esta sesión
     */
    private function is_button_view_already_registered($form_id, $question_id, $element_id, $session_id) {
        global $wpdb;
        
        $existing = $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM {$wpdb->prefix}sfq_analytics 
            WHERE form_id = %d 
            AND event_type = 'button_view'
            AND session_id = %s
            AND JSON_EXTRACT(event_data, '$.question_id') = %d
            AND JSON_EXTRACT(event_data, '$.element_id') = %s",
            $form_id,
            $session_id,
            $question_id,
            $element_id
        ));
        
        return !empty($existing);
    }
    
    /**
     * Guardar vista de botón en la base de datos
     */
    private function save_button_view($form_id, $question_id, $element_id, $session_id, $button_text, $button_url) {
        global $wpdb;
        
        $event_data = array(
            'question_id' => $question_id,
            'element_id' => $element_id,
            'button_text' => $button_text,
            'button_url' => $button_url,
            'timestamp' => time()
        );
        
        $result = $wpdb->insert(
            $wpdb->prefix . 'sfq_analytics',
            array(
                'form_id' => $form_id,
                'event_type' => 'button_view',
                'event_data' => json_encode($event_data),
                'session_id' => $session_id,
                'user_ip' => $this->get_user_ip(),
                'created_at' => current_time('mysql')
            ),
            array('%d', '%s', '%s', '%s', '%s', '%s')
        );
        
        return $result !== false;
    }
    
    /**
     * Obtener estadísticas de botones
     */
    public function get_button_stats() {
        // Verificar permisos
        if (!current_user_can('manage_smart_forms') && !current_user_can('manage_options')) {
            wp_send_json_error(__('No tienes permisos', 'smart-forms-quiz'));
            return;
        }
        
        // Verificar nonce
        if (!check_ajax_referer('sfq_nonce', 'nonce', false)) {
            wp_send_json_error(__('Error de seguridad', 'smart-forms-quiz'));
            return;
        }
        
        $form_id = intval($_POST['form_id'] ?? 0);
        $question_id = intval($_POST['question_id'] ?? 0);
        $element_id = sanitize_text_field($_POST['element_id'] ?? '');
        
        if (!$form_id) {
            wp_send_json_error(__('ID de formulario inválido', 'smart-forms-quiz'));
            return;
        }
        
        try {
            $stats = $this->calculate_button_stats($form_id, $question_id, $element_id);
            wp_send_json_success($stats);
        } catch (Exception $e) {
            error_log('SFQ Button Stats Error: ' . $e->getMessage());
            wp_send_json_error('Error al obtener estadísticas: ' . $e->getMessage());
        }
    }
    
    /**
     * Calcular estadísticas de botones
     */
    private function calculate_button_stats($form_id, $question_id = 0, $element_id = '') {
        global $wpdb;
        
        $where_conditions = array("form_id = %d", "event_type = 'button_view'");
        $params = array($form_id);
        
        if ($question_id > 0) {
            $where_conditions[] = "JSON_EXTRACT(event_data, '$.question_id') = %d";
            $params[] = $question_id;
        }
        
        if (!empty($element_id)) {
            $where_conditions[] = "JSON_EXTRACT(event_data, '$.element_id') = %s";
            $params[] = $element_id;
        }
        
        $where_clause = implode(' AND ', $where_conditions);
        
        // Total de vistas únicas (sesiones únicas que vieron botones)
        $unique_views = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(DISTINCT session_id) FROM {$wpdb->prefix}sfq_analytics WHERE {$where_clause}",
            $params
        ));
        
        // Total de vistas (todas las vistas de botones)
        $total_views = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$wpdb->prefix}sfq_analytics WHERE {$where_clause}",
            $params
        ));
        
        // Total de clics únicos (sesiones únicas que hicieron clic)
        $click_conditions = str_replace("event_type = 'button_view'", "event_type = 'button_click_immediate'", $where_clause);
        $unique_clicks = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(DISTINCT session_id) FROM {$wpdb->prefix}sfq_analytics WHERE {$click_conditions}",
            $params
        ));
        
        // Total de clics
        $total_clicks = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$wpdb->prefix}sfq_analytics WHERE {$click_conditions}",
            $params
        ));
        
        // Calcular tasa de clics
        $click_rate = $unique_views > 0 ? round(($unique_clicks / $unique_views) * 100, 1) : 0;
        
        // Obtener estadísticas por botón individual
        $button_stats = $this->get_individual_button_stats($form_id, $question_id, $element_id);
        
        return array(
            'summary' => array(
                'unique_views' => intval($unique_views),
                'total_views' => intval($total_views),
                'unique_clicks' => intval($unique_clicks),
                'total_clicks' => intval($total_clicks),
                'click_rate' => $click_rate
            ),
            'buttons' => $button_stats
        );
    }
    
    /**
     * Obtener estadísticas por botón individual
     */
    private function get_individual_button_stats($form_id, $question_id = 0, $element_id = '') {
        global $wpdb;
        
        $where_conditions = array("form_id = %d", "event_type = 'button_view'");
        $params = array($form_id);
        
        if ($question_id > 0) {
            $where_conditions[] = "JSON_EXTRACT(event_data, '$.question_id') = %d";
            $params[] = $question_id;
        }
        
        if (!empty($element_id)) {
            $where_conditions[] = "JSON_EXTRACT(event_data, '$.element_id') = %s";
            $params[] = $element_id;
        }
        
        $where_clause = implode(' AND ', $where_conditions);
        
        // Obtener estadísticas agrupadas por botón
        $button_views = $wpdb->get_results($wpdb->prepare(
            "SELECT 
                JSON_EXTRACT(event_data, '$.question_id') as question_id,
                JSON_EXTRACT(event_data, '$.element_id') as element_id,
                JSON_EXTRACT(event_data, '$.button_text') as button_text,
                JSON_EXTRACT(event_data, '$.button_url') as button_url,
                COUNT(DISTINCT session_id) as unique_views,
                COUNT(*) as total_views
            FROM {$wpdb->prefix}sfq_analytics 
            WHERE {$where_clause}
            GROUP BY JSON_EXTRACT(event_data, '$.question_id'), JSON_EXTRACT(event_data, '$.element_id')
            ORDER BY unique_views DESC",
            $params
        ));
        
        $button_stats = array();
        
        foreach ($button_views as $button) {
            $q_id = intval($button->question_id);
            $e_id = trim($button->element_id, '"');
            $btn_text = trim($button->button_text, '"');
            $btn_url = trim($button->button_url, '"');
            
            // Obtener clics para este botón específico
            $unique_clicks = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(DISTINCT session_id) FROM {$wpdb->prefix}sfq_analytics 
                WHERE form_id = %d 
                AND event_type = 'button_click_immediate'
                AND JSON_EXTRACT(event_data, '$.question_id') = %d
                AND JSON_EXTRACT(event_data, '$.element_id') = %s",
                $form_id,
                $q_id,
                $e_id
            ));
            
            $total_clicks = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$wpdb->prefix}sfq_analytics 
                WHERE form_id = %d 
                AND event_type = 'button_click_immediate'
                AND JSON_EXTRACT(event_data, '$.question_id') = %d
                AND JSON_EXTRACT(event_data, '$.element_id') = %s",
                $form_id,
                $q_id,
                $e_id
            ));
            
            // Calcular tasa de clics para este botón
            $click_rate = intval($button->unique_views) > 0 ? 
                round((intval($unique_clicks) / intval($button->unique_views)) * 100, 1) : 0;
            
            // Obtener información de la pregunta
            $question_info = $wpdb->get_row($wpdb->prepare(
                "SELECT question_text, order_position FROM {$wpdb->prefix}sfq_questions WHERE id = %d",
                $q_id
            ));
            
            $button_stats[] = array(
                'question_id' => $q_id,
                'element_id' => $e_id,
                'button_text' => $btn_text,
                'button_url' => $btn_url,
                'question_text' => $question_info ? $question_info->question_text : 'Pregunta #' . $q_id,
                'question_position' => $question_info ? intval($question_info->order_position) + 1 : $q_id,
                'unique_views' => intval($button->unique_views),
                'total_views' => intval($button->total_views),
                'unique_clicks' => intval($unique_clicks),
                'total_clicks' => intval($total_clicks),
                'click_rate' => $click_rate
            );
        }
        
        return $button_stats;
    }
    
    /**
     * Obtener IP del usuario
     */
    private function get_user_ip() {
        return SFQ_Utils::get_user_ip();
    }
    
    /**
     * Obtener estadísticas rápidas para el dashboard
     */
    public function get_form_quick_stats($form_id) {
        global $wpdb;
        
        // Verificar si existe la tabla de analytics
        $analytics_table = $wpdb->prefix . 'sfq_analytics';
        $table_exists = $wpdb->get_var("SHOW TABLES LIKE '$analytics_table'") === $analytics_table;
        
        if (!$table_exists) {
            return array(
                'total_responses' => 0,
                'unique_clicks' => 0,
                'click_rate' => 0
            );
        }
        
        // Total de vistas únicas de botones (esto es lo que realmente son las "respuestas")
        $total_responses = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(DISTINCT session_id) FROM {$analytics_table} 
            WHERE form_id = %d AND event_type = 'button_view'",
            $form_id
        ));
        
        // Total de clics únicos
        $unique_clicks = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(DISTINCT session_id) FROM {$analytics_table} 
            WHERE form_id = %d AND event_type = 'button_click_immediate'",
            $form_id
        ));
        
        // Calcular tasa de clics
        $click_rate = $total_responses > 0 ? round(($unique_clicks / $total_responses) * 100, 1) : 0;
        
        return array(
            'total_responses' => intval($total_responses),
            'unique_clicks' => intval($unique_clicks),
            'click_rate' => $click_rate
        );
    }
}
