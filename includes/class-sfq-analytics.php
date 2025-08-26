<?php
/**
 * Sistema de Analytics
 */

if (!defined('ABSPATH')) {
    exit;
}

class SFQ_Analytics {
    
    private $database;
    
    public function __construct() {
        $this->database = new SFQ_Database();
    }
    
    public function init() {
        // AJAX handlers para analytics
        add_action('wp_ajax_sfq_get_analytics_data', array($this, 'ajax_get_analytics_data'));
        add_action('wp_ajax_sfq_export_submissions', array($this, 'ajax_export_submissions'));
        
        // Programar limpieza de datos antiguos
        add_action('sfq_cleanup_old_data', array($this, 'cleanup_old_data'));
        
        if (!wp_next_scheduled('sfq_cleanup_old_data')) {
            wp_schedule_event(time(), 'daily', 'sfq_cleanup_old_data');
        }
    }
    
    /**
     * Obtener estadísticas (REST API)
     */
    public function get_stats($request) {
        if (!current_user_can('manage_smart_forms')) {
            return new WP_Error('unauthorized', __('No autorizado', 'smart-forms-quiz'), array('status' => 403));
        }
        
        $form_id = $request['id'];
        $stats = $this->get_form_analytics($form_id);
        
        return rest_ensure_response($stats);
    }
    
    /**
     * AJAX: Obtener datos de analytics
     */
    public function ajax_get_analytics_data() {
        check_ajax_referer('sfq_nonce', 'nonce');
        
        if (!current_user_can('manage_smart_forms')) {
            wp_send_json_error(__('No autorizado', 'smart-forms-quiz'));
        }
        
        $form_id = intval($_POST['form_id'] ?? 0);
        $date_range = sanitize_text_field($_POST['date_range'] ?? '7days');
        
        $data = array();
        
        if ($form_id) {
            $data = $this->get_form_analytics($form_id, $date_range);
        } else {
            $data = $this->get_global_analytics($date_range);
        }
        
        wp_send_json_success($data);
    }
    
    /**
     * Obtener analytics de un formulario específico
     */
    public function get_form_analytics($form_id, $date_range = '7days') {
        global $wpdb;
        
        $date_condition = $this->get_date_condition($date_range);
        
        // Estadísticas generales
        $stats = array(
            'overview' => $this->get_form_overview($form_id, $date_condition),
            'daily_stats' => $this->get_daily_stats($form_id, $date_condition),
            'question_stats' => $this->get_question_stats($form_id, $date_condition),
            'completion_funnel' => $this->get_completion_funnel($form_id, $date_condition),
            'average_time' => $this->get_average_completion_time($form_id, $date_condition),
            'device_stats' => $this->get_device_stats($form_id, $date_condition),
            'top_answers' => $this->get_top_answers($form_id, $date_condition)
        );
        
        return $stats;
    }
    
    /**
     * Obtener vista general del formulario
     */
    private function get_form_overview($form_id, $date_condition) {
        global $wpdb;
        
        // Total de vistas
        $total_views = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(DISTINCT session_id) 
            FROM {$wpdb->prefix}sfq_analytics 
            WHERE form_id = %d AND event_type = 'view' {$date_condition}",
            $form_id
        ));
        
        // Total de inicios
        $total_starts = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(DISTINCT session_id) 
            FROM {$wpdb->prefix}sfq_analytics 
            WHERE form_id = %d AND event_type = 'start' {$date_condition}",
            $form_id
        ));
        
        // Total de completados
        $total_completed = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) 
            FROM {$wpdb->prefix}sfq_submissions 
            WHERE form_id = %d AND status = 'completed' {$date_condition}",
            $form_id
        ));
        
        // Total de abandonos
        $total_abandoned = $total_starts - $total_completed;
        
        // Tasas
        $start_rate = $total_views > 0 ? round(($total_starts / $total_views) * 100, 1) : 0;
        $completion_rate = $total_starts > 0 ? round(($total_completed / $total_starts) * 100, 1) : 0;
        $abandonment_rate = $total_starts > 0 ? round(($total_abandoned / $total_starts) * 100, 1) : 0;
        
        return array(
            'total_views' => intval($total_views),
            'total_starts' => intval($total_starts),
            'total_completed' => intval($total_completed),
            'total_abandoned' => intval($total_abandoned),
            'start_rate' => $start_rate,
            'completion_rate' => $completion_rate,
            'abandonment_rate' => $abandonment_rate
        );
    }
    
    /**
     * Obtener estadísticas diarias
     */
    private function get_daily_stats($form_id, $date_condition) {
        global $wpdb;
        
        $results = $wpdb->get_results($wpdb->prepare(
            "SELECT 
                DATE(created_at) as date,
                COUNT(CASE WHEN event_type = 'view' THEN 1 END) as views,
                COUNT(CASE WHEN event_type = 'start' THEN 1 END) as starts,
                COUNT(CASE WHEN event_type = 'completed' THEN 1 END) as completions
            FROM {$wpdb->prefix}sfq_analytics
            WHERE form_id = %d {$date_condition}
            GROUP BY DATE(created_at)
            ORDER BY date DESC
            LIMIT 30",
            $form_id
        ));
        
        return $results;
    }
    
    /**
     * Obtener estadísticas por pregunta
     */
    private function get_question_stats($form_id, $date_condition) {
        global $wpdb;
        
        $questions = $wpdb->get_results($wpdb->prepare(
            "SELECT 
                q.id,
                q.question_text,
                q.question_type,
                COUNT(DISTINCT r.submission_id) as responses,
                AVG(r.score) as avg_score
            FROM {$wpdb->prefix}sfq_questions q
            LEFT JOIN {$wpdb->prefix}sfq_responses r ON q.id = r.question_id
            LEFT JOIN {$wpdb->prefix}sfq_submissions s ON r.submission_id = s.id
            WHERE q.form_id = %d {$date_condition}
            GROUP BY q.id
            ORDER BY q.order_position",
            $form_id
        ));
        
        // Para cada pregunta, obtener distribución de respuestas
        foreach ($questions as &$question) {
            if (in_array($question->question_type, array('single_choice', 'multiple_choice', 'rating'))) {
                $question->answer_distribution = $this->get_answer_distribution($question->id, $date_condition);
            }
        }
        
        return $questions;
    }
    
    /**
     * Obtener distribución de respuestas
     */
    private function get_answer_distribution($question_id, $date_condition) {
        global $wpdb;
        
        $results = $wpdb->get_results($wpdb->prepare(
            "SELECT 
                r.answer,
                COUNT(*) as count,
                ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage
            FROM {$wpdb->prefix}sfq_responses r
            JOIN {$wpdb->prefix}sfq_submissions s ON r.submission_id = s.id
            WHERE r.question_id = %d {$date_condition}
            GROUP BY r.answer
            ORDER BY count DESC",
            $question_id
        ));
        
        return $results;
    }
    
    /**
     * Obtener embudo de completado
     */
    private function get_completion_funnel($form_id, $date_condition) {
        global $wpdb;
        
        // Obtener el número de personas que llegaron a cada pregunta
        $funnel = $wpdb->get_results($wpdb->prepare(
            "SELECT 
                q.order_position,
                q.question_text,
                COUNT(DISTINCT a.session_id) as reached
            FROM {$wpdb->prefix}sfq_questions q
            LEFT JOIN {$wpdb->prefix}sfq_analytics a ON 
                a.form_id = q.form_id AND 
                a.event_type = 'question_viewed' AND
                JSON_EXTRACT(a.event_data, '$.question_id') = q.id
            WHERE q.form_id = %d {$date_condition}
            GROUP BY q.id
            ORDER BY q.order_position",
            $form_id
        ));
        
        return $funnel;
    }
    
    /**
     * Obtener tiempo promedio de completado
     */
    private function get_average_completion_time($form_id, $date_condition) {
        global $wpdb;
        
        $avg_time = $wpdb->get_var($wpdb->prepare(
            "SELECT AVG(time_spent) 
            FROM {$wpdb->prefix}sfq_submissions 
            WHERE form_id = %d AND status = 'completed' AND time_spent > 0 {$date_condition}",
            $form_id
        ));
        
        return array(
            'seconds' => intval($avg_time),
            'formatted' => $this->format_time($avg_time)
        );
    }
    
    /**
     * Obtener estadísticas de dispositivos
     */
    private function get_device_stats($form_id, $date_condition) {
        global $wpdb;
        
        $results = $wpdb->get_results($wpdb->prepare(
            "SELECT 
                CASE 
                    WHEN user_agent LIKE '%%Mobile%%' THEN 'mobile'
                    WHEN user_agent LIKE '%%Tablet%%' THEN 'tablet'
                    ELSE 'desktop'
                END as device_type,
                COUNT(*) as count
            FROM {$wpdb->prefix}sfq_submissions
            WHERE form_id = %d {$date_condition}
            GROUP BY device_type",
            $form_id
        ));
        
        $total = array_sum(array_column($results, 'count'));
        
        foreach ($results as &$result) {
            $result->percentage = $total > 0 ? round(($result->count / $total) * 100, 1) : 0;
        }
        
        return $results;
    }
    
    /**
     * Obtener respuestas más comunes
     */
    private function get_top_answers($form_id, $date_condition) {
        global $wpdb;
        
        return $wpdb->get_results($wpdb->prepare(
            "SELECT 
                q.question_text,
                r.answer,
                COUNT(*) as count
            FROM {$wpdb->prefix}sfq_responses r
            JOIN {$wpdb->prefix}sfq_questions q ON r.question_id = q.id
            JOIN {$wpdb->prefix}sfq_submissions s ON r.submission_id = s.id
            WHERE q.form_id = %d AND q.question_type IN ('single_choice', 'multiple_choice') {$date_condition}
            GROUP BY q.id, r.answer
            ORDER BY count DESC
            LIMIT 10",
            $form_id
        ));
    }
    
    /**
     * Obtener analytics globales
     */
    public function get_global_analytics($date_range = '7days') {
        global $wpdb;
        
        $date_condition = $this->get_date_condition($date_range);
        
        // Total de formularios
        $total_forms = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}sfq_forms WHERE status = 'active'");
        
        // Total de vistas globales
        $total_views = $wpdb->get_var(
            "SELECT COUNT(DISTINCT session_id) 
            FROM {$wpdb->prefix}sfq_analytics 
            WHERE event_type = 'view' {$date_condition}"
        );
        
        // Total de envíos globales
        $total_submissions = $wpdb->get_var(
            "SELECT COUNT(*) 
            FROM {$wpdb->prefix}sfq_submissions 
            WHERE status = 'completed' {$date_condition}"
        );
        
        // Formularios más populares
        $popular_forms = $wpdb->get_results(
            "SELECT 
                f.id,
                f.title,
                COUNT(DISTINCT a.session_id) as views,
                COUNT(DISTINCT s.id) as submissions
            FROM {$wpdb->prefix}sfq_forms f
            LEFT JOIN {$wpdb->prefix}sfq_analytics a ON f.id = a.form_id AND a.event_type = 'view' {$date_condition}
            LEFT JOIN {$wpdb->prefix}sfq_submissions s ON f.id = s.form_id AND s.status = 'completed' {$date_condition}
            WHERE f.status = 'active'
            GROUP BY f.id
            ORDER BY views DESC
            LIMIT 5"
        );
        
        return array(
            'total_forms' => intval($total_forms),
            'total_views' => intval($total_views),
            'total_submissions' => intval($total_submissions),
            'popular_forms' => $popular_forms
        );
    }
    
    /**
     * AJAX: Exportar envíos
     */
    public function ajax_export_submissions() {
        check_ajax_referer('sfq_nonce', 'nonce');
        
        if (!current_user_can('manage_smart_forms')) {
            wp_send_json_error(__('No autorizado', 'smart-forms-quiz'));
        }
        
        $form_id = intval($_POST['form_id']);
        $format = sanitize_text_field($_POST['format'] ?? 'csv');
        
        $submissions = $this->get_submissions_for_export($form_id);
        
        if ($format === 'csv') {
            $this->export_as_csv($submissions, $form_id);
        } else {
            $this->export_as_json($submissions, $form_id);
        }
    }
    
    /**
     * Obtener envíos para exportar
     */
    private function get_submissions_for_export($form_id) {
        global $wpdb;
        
        return $wpdb->get_results($wpdb->prepare(
            "SELECT 
                s.*,
                GROUP_CONCAT(
                    CONCAT(q.question_text, ': ', r.answer) 
                    ORDER BY q.order_position 
                    SEPARATOR '\n'
                ) as responses
            FROM {$wpdb->prefix}sfq_submissions s
            LEFT JOIN {$wpdb->prefix}sfq_responses r ON s.id = r.submission_id
            LEFT JOIN {$wpdb->prefix}sfq_questions q ON r.question_id = q.id
            WHERE s.form_id = %d
            GROUP BY s.id
            ORDER BY s.created_at DESC",
            $form_id
        ));
    }
    
    /**
     * Exportar como CSV
     */
    private function export_as_csv($submissions, $form_id) {
        $filename = 'form_' . $form_id . '_submissions_' . date('Y-m-d') . '.csv';
        
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        
        $output = fopen('php://output', 'w');
        
        // Encabezados
        fputcsv($output, array(
            'ID',
            'Fecha',
            'Usuario',
            'IP',
            'Tiempo (seg)',
            'Puntuación',
            'Respuestas'
        ));
        
        // Datos
        foreach ($submissions as $submission) {
            fputcsv($output, array(
                $submission->id,
                $submission->completed_at,
                $submission->user_id ?: 'Anónimo',
                $submission->user_ip,
                $submission->time_spent,
                $submission->total_score,
                $submission->responses
            ));
        }
        
        fclose($output);
        exit;
    }
    
    /**
     * Exportar como JSON
     */
    private function export_as_json($submissions, $form_id) {
        $filename = 'form_' . $form_id . '_submissions_' . date('Y-m-d') . '.json';
        
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        
        echo json_encode($submissions, JSON_PRETTY_PRINT);
        exit;
    }
    
    /**
     * Obtener condición de fecha para consultas
     */
    private function get_date_condition($date_range) {
        switch ($date_range) {
            case 'today':
                return "AND DATE(created_at) = CURDATE()";
            case 'yesterday':
                return "AND DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)";
            case '7days':
                return "AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
            case '30days':
                return "AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
            case '90days':
                return "AND created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)";
            case 'this_month':
                return "AND MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE())";
            case 'last_month':
                return "AND MONTH(created_at) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)) AND YEAR(created_at) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))";
            case 'this_year':
                return "AND YEAR(created_at) = YEAR(CURRENT_DATE())";
            default:
                return "";
        }
    }
    
    /**
     * Formatear tiempo en formato legible
     */
    private function format_time($seconds) {
        // Usar método centralizado de la clase Utils
        return SFQ_Utils::format_time($seconds);
    }
    
    /**
     * Limpiar datos antiguos
     */
    public function cleanup_old_data() {
        global $wpdb;
        
        // Eliminar eventos de analytics de más de 90 días
        $wpdb->query($wpdb->prepare(
            "DELETE FROM {$wpdb->prefix}sfq_analytics 
            WHERE created_at < DATE_SUB(NOW(), INTERVAL %d DAY)",
            90
        ));
        
        // Optimizar tablas
        $wpdb->query("OPTIMIZE TABLE {$wpdb->prefix}sfq_analytics");
    }
}
