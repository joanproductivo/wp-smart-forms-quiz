<?php
/**
 * Manejo de peticiones AJAX
 */

if (!defined('ABSPATH')) {
    exit;
}

class SFQ_Ajax {
    
    private $database;
    
    public function __construct() {
        $this->database = new SFQ_Database();
    }
    
    public function init() {
        // AJAX handlers para frontend
        add_action('wp_ajax_sfq_submit_response', array($this, 'submit_response'));
        add_action('wp_ajax_nopriv_sfq_submit_response', array($this, 'submit_response'));
        
        add_action('wp_ajax_sfq_track_event', array($this, 'track_event'));
        add_action('wp_ajax_nopriv_sfq_track_event', array($this, 'track_event'));
        
        add_action('wp_ajax_sfq_get_next_question', array($this, 'get_next_question'));
        add_action('wp_ajax_nopriv_sfq_get_next_question', array($this, 'get_next_question'));
        
        // AJAX handlers para admin
        add_action('wp_ajax_sfq_save_form', array($this, 'save_form'));
        add_action('wp_ajax_sfq_get_form_data', array($this, 'get_form_data'));
        add_action('wp_ajax_sfq_get_form_content', array($this, 'get_form_content'));
        add_action('wp_ajax_nopriv_sfq_get_form_content', array($this, 'get_form_content'));
        add_action('wp_ajax_sfq_delete_form', array($this, 'delete_form'));
        add_action('wp_ajax_sfq_duplicate_form', array($this, 'duplicate_form'));
        add_action('wp_ajax_sfq_get_form_quick_stats', array($this, 'get_form_quick_stats'));
        add_action('wp_ajax_sfq_get_submissions', array($this, 'get_submissions'));
        add_action('wp_ajax_sfq_get_submission_detail', array($this, 'get_submission_detail'));
        add_action('wp_ajax_sfq_reset_form_stats', array($this, 'reset_form_stats'));
        add_action('wp_ajax_sfq_maintenance_action', array($this, 'handle_maintenance_action'));
        
        // AJAX handlers para submissions avanzadas
        add_action('wp_ajax_sfq_get_submissions_advanced', array($this, 'get_submissions_advanced'));
        add_action('wp_ajax_sfq_get_dashboard_stats', array($this, 'get_dashboard_stats'));
        add_action('wp_ajax_sfq_get_form_analytics', array($this, 'get_form_analytics'));
        add_action('wp_ajax_sfq_delete_submissions_bulk', array($this, 'delete_submissions_bulk'));
        add_action('wp_ajax_sfq_delete_submission', array($this, 'delete_submission'));
        add_action('wp_ajax_sfq_save_submission_note', array($this, 'save_submission_note'));
        add_action('wp_ajax_sfq_export_submissions_advanced', array($this, 'export_submissions_advanced'));
        
        // AJAX handlers para seguridad y rate limiting
        add_action('wp_ajax_sfq_get_rate_limit_stats', array($this, 'get_rate_limit_stats'));
        add_action('wp_ajax_sfq_clear_rate_limits', array($this, 'clear_rate_limits'));
        
        // ✅ NUEVOS: AJAX handlers para guardado parcial
        add_action('wp_ajax_sfq_save_partial_response', array($this, 'save_partial_response'));
        add_action('wp_ajax_nopriv_sfq_save_partial_response', array($this, 'save_partial_response'));
        add_action('wp_ajax_sfq_get_partial_response', array($this, 'get_partial_response'));
        add_action('wp_ajax_nopriv_sfq_get_partial_response', array($this, 'get_partial_response'));
        add_action('wp_ajax_sfq_cleanup_partial_responses', array($this, 'cleanup_partial_responses'));
        
    }
    
    /**
     * Obtener formulario (REST API)
     */
    public function get_form($request) {
        $form_id = intval($request['id']);
        
        if (!$form_id || $form_id < 1) {
            return new WP_Error('invalid_form_id', __('ID de formulario inválido', 'smart-forms-quiz'), array('status' => 400));
        }
        
        $form = $this->database->get_form($form_id);
        
        if (!$form) {
            return new WP_Error('form_not_found', __('Formulario no encontrado', 'smart-forms-quiz'), array('status' => 404));
        }
        
        return rest_ensure_response($form);
    }
    
    /**
     * Enviar respuesta del formulario
     */
    public function submit_response() {
        // Verificar nonce
        if (!check_ajax_referer('sfq_nonce', 'nonce', false)) {
            wp_send_json_error(__('Error de seguridad', 'smart-forms-quiz'));
            return;
        }
        
        // Verificar rate limiting para envío de respuestas
        if (!$this->check_rate_limit('submit_response')) {
            wp_send_json_error(array(
                'message' => __('Demasiadas peticiones. Intenta de nuevo en un momento.', 'smart-forms-quiz'),
                'code' => 'RATE_LIMIT_EXCEEDED'
            ));
            return;
        }
        
        // Validar datos requeridos
        $form_id = intval($_POST['form_id'] ?? 0);
        $session_id = sanitize_text_field($_POST['session_id'] ?? '');
        
        // Si no se proporciona session_id, generar uno usando el nuevo sistema
        if (empty($session_id)) {
            $session_id = SFQ_Utils::get_or_create_session_id($form_id);
        }
        
        if (!$form_id || !$session_id) {
            wp_send_json_error(__('Datos del formulario incompletos', 'smart-forms-quiz'));
            return;
        }
        
        // ⭐ NUEVA VERIFICACIÓN DE LÍMITES
        $limits_checker = new SFQ_Limits();
        $limit_check = $limits_checker->check_submission_limits($form_id, $session_id);
        
        if (!$limit_check['allowed']) {
            wp_send_json_error(array(
                'message' => $limit_check['message'],
                'code' => $limit_check['code'] ?? 'SUBMISSION_LIMIT_EXCEEDED',
                'limit_info' => $limit_check
            ));
            return;
        }
        
        // Decodificar datos JSON
        $responses = json_decode(stripslashes($_POST['responses'] ?? '{}'), true);
        $variables = json_decode(stripslashes($_POST['variables'] ?? '{}'), true);
        
        if (!is_array($responses)) {
            $responses = array();
        }
        if (!is_array($variables)) {
            $variables = array();
        }
        
        global $wpdb;
        
        // Iniciar transacción para asegurar integridad de datos
        $wpdb->query('START TRANSACTION');
        
        try {
            // Crear registro de envío
            $submission_data = array(
                'form_id' => $form_id,
                'user_id' => get_current_user_id() ?: null,
                'user_ip' => $this->get_user_ip(),
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
                'total_score' => $this->calculate_total_score($variables),
                'variables' => json_encode($variables),
                'status' => 'completed',
                'started_at' => current_time('mysql'),
                'completed_at' => current_time('mysql'),
                'time_spent' => intval($_POST['time_spent'] ?? 0)
            );
            
            $result = $wpdb->insert(
                $wpdb->prefix . 'sfq_submissions',
                $submission_data,
                array('%d', '%d', '%s', '%s', '%d', '%s', '%s', '%s', '%s', '%d')
            );
            
            if ($result === false) {
                throw new Exception('Error al guardar el submission: ' . $wpdb->last_error);
            }
            
            $submission_id = $wpdb->insert_id;
            
            if (!$submission_id) {
                throw new Exception('No se pudo obtener el ID del submission');
            }
            
            // Guardar respuestas individuales
            $responses_saved = 0;
            foreach ($responses as $question_id => $answer) {
                // Validar que question_id sea válido
                if (!is_numeric($question_id) || intval($question_id) <= 0) {
                    continue;
                }
                
                // Procesar la respuesta según su tipo
                $processed_answer = $answer;
                if (is_array($answer)) {
                    $processed_answer = json_encode($answer, JSON_UNESCAPED_UNICODE);
                } else {
                    $processed_answer = sanitize_textarea_field($answer);
                }
                
                $response_data = array(
                    'submission_id' => $submission_id,
                    'question_id' => intval($question_id),
                    'answer' => $processed_answer,
                    'score' => $this->calculate_answer_score($question_id, $answer)
                );
                
                $response_result = $wpdb->insert(
                    $wpdb->prefix . 'sfq_responses',
                    $response_data,
                    array('%d', '%d', '%s', '%d')
                );
                
                if ($response_result !== false) {
                    $responses_saved++;
                }
            }
            
            // Verificar que se guardaron respuestas
            if (count($responses) > 0 && $responses_saved === 0) {
                throw new Exception('No se pudo guardar ninguna respuesta');
            }
            
            // Registrar evento de completado usando el método específico
            $this->database->register_completed($form_id, $session_id, $submission_id);
            
            // Confirmar transacción
            $wpdb->query('COMMIT');
            
            // Determinar redirección basada en condiciones
            $redirect_url = $this->determine_redirect($form_id, $variables, $responses);
            
            // Enviar notificaciones si está configurado (en background)
            wp_schedule_single_event(time(), 'sfq_send_notifications', array($form_id, $submission_id));
            
            
            wp_send_json_success(array(
                'submission_id' => $submission_id,
                'redirect_url' => $redirect_url,
                'responses_saved' => $responses_saved,
                'message' => __('Formulario enviado correctamente', 'smart-forms-quiz')
            ));
            
        } catch (Exception $e) {
            // Rollback en caso de error
            $wpdb->query('ROLLBACK');
            
            error_log('SFQ Error in submit_response: ' . $e->getMessage());
            
            wp_send_json_error(array(
                'message' => __('Error al guardar el formulario. Por favor, intenta de nuevo.', 'smart-forms-quiz')
            ));
        }
    }
    
    /**
     * Rastrear eventos de analytics
     */
    public function track_event() {
        // Verificar nonce
        if (!check_ajax_referer('sfq_nonce', 'nonce', false)) {
            wp_send_json_error(__('Error de seguridad', 'smart-forms-quiz'));
            return;
        }
        
        $form_id = intval($_POST['form_id'] ?? 0);
        $event_type = sanitize_text_field($_POST['event_type'] ?? '');
        $event_data = json_decode(stripslashes($_POST['event_data'] ?? '{}'), true);
        $session_id = sanitize_text_field($_POST['session_id'] ?? '');
        
        // Validar datos requeridos
        if (!$form_id || !$event_type || !$session_id) {
            wp_send_json_error(__('Datos incompletos', 'smart-forms-quiz'));
            return;
        }
        
        // Validar que event_data sea un array
        if (!is_array($event_data)) {
            $event_data = array();
        }
        
        // Validar tipos de eventos permitidos
        $allowed_events = array('view', 'start', 'completed', 'question_answered', 'form_abandoned');
        if (!in_array($event_type, $allowed_events)) {
            wp_send_json_error(__('Tipo de evento no válido', 'smart-forms-quiz'));
            return;
        }
        
        // Usar los métodos específicos de la base de datos según el tipo de evento
        switch ($event_type) {
            case 'view':
                $this->database->register_view($form_id, $session_id);
                break;
                
            case 'start':
                $this->database->register_start($form_id, $session_id);
                break;
                
            case 'completed':
                $submission_id = isset($event_data['submission_id']) ? intval($event_data['submission_id']) : null;
                $this->database->register_completed($form_id, $session_id, $submission_id);
                break;
                
            default:
                // Para otros tipos de eventos, usar el método genérico
                $this->register_analytics_event($form_id, $event_type, $event_data, $session_id);
                break;
        }
        
        wp_send_json_success();
    }
    
    /**
     * Obtener siguiente pregunta basada en lógica condicional
     */
    public function get_next_question() {
        // Verificar nonce
        if (!check_ajax_referer('sfq_nonce', 'nonce', false)) {
            wp_send_json_error(__('Error de seguridad', 'smart-forms-quiz'));
            return;
        }
        
        $form_id = intval($_POST['form_id'] ?? 0);
        $current_question_id = intval($_POST['current_question_id'] ?? 0);
        $answer = sanitize_text_field($_POST['answer'] ?? '');
        $variables = json_decode(stripslashes($_POST['variables'] ?? '{}'), true);
        
        // Validar datos requeridos
        if (!$form_id || !$current_question_id) {
            wp_send_json_error(__('Datos incompletos', 'smart-forms-quiz'));
            return;
        }
        
        // Validar que variables sea un array
        if (!is_array($variables)) {
            $variables = array();
        }
        
        // Debug: Log del estado inicial
        error_log('SFQ Debug: Initial variables state: ' . json_encode($variables));
        error_log('SFQ Debug: Processing question ' . $current_question_id . ' with answer: ' . $answer);
        
        // Obtener condiciones de la pregunta actual
        $conditions = $this->get_question_conditions($current_question_id);
        
        error_log('SFQ Debug: Found ' . count($conditions) . ' conditions for question ' . $current_question_id);
        
        $next_question_id = null;
        $redirect_url = null;
        $updated_variables = $variables; // Trabajar con una copia
        
        foreach ($conditions as $condition) {
            error_log('SFQ Debug: Evaluating condition: ' . json_encode($condition));
            
            if ($this->evaluate_condition($condition, $answer, $updated_variables)) {
                error_log('SFQ Debug: Condition matched! Executing action: ' . $condition->action_type);
                
                // ✅ CRÍTICO: Ejecutar acciones de variables correctamente
                switch ($condition->action_type) {
                    case 'goto_question':
                        $next_question_id = intval($condition->action_value);
                        error_log('SFQ Debug: Setting next question to: ' . $next_question_id);
                        break;
                        
                    case 'skip_to_end':
                        $next_question_id = null; // Indica fin del formulario
                        error_log('SFQ Debug: Skipping to end');
                        break;
                        
                    case 'redirect_url':
                        $redirect_url = esc_url_raw($condition->action_value);
                        error_log('SFQ Debug: Setting redirect URL to: ' . $redirect_url);
                        break;
                        
                    case 'add_variable':
                        $var_name = $condition->action_value;
                        $var_amount = intval($condition->variable_amount);
                        $current_value = $updated_variables[$var_name] ?? 0;
                        $new_value = $current_value + $var_amount;
                        $updated_variables[$var_name] = $new_value;
                        
                        error_log("SFQ Debug: ADD_VARIABLE - Variable: {$var_name}, Current: {$current_value}, Adding: {$var_amount}, New: {$new_value}");
                        break;
                        
                    case 'set_variable':
                        $var_name = $condition->action_value;
                        $var_value = $condition->variable_amount;
                        $updated_variables[$var_name] = $var_value;
                        
                        error_log("SFQ Debug: SET_VARIABLE - Variable: {$var_name}, Set to: {$var_value}");
                        break;
                        
                    case 'show_message':
                        // Los mensajes se manejan en el frontend
                        error_log('SFQ Debug: Show message action: ' . $condition->action_value);
                        break;
                }
            } else {
                error_log('SFQ Debug: Condition did not match');
            }
        }
        
        // Si no hay condición específica, obtener siguiente pregunta en orden
        if (!$next_question_id && !$redirect_url) {
            $next_question_id = $this->get_next_question_in_order($form_id, $current_question_id);
            error_log('SFQ Debug: No specific next question, using order-based: ' . $next_question_id);
        }
        
        error_log('SFQ Debug: Final variables state: ' . json_encode($updated_variables));
        
        wp_send_json_success(array(
            'next_question_id' => $next_question_id,
            'redirect_url' => $redirect_url,
            'variables' => $updated_variables
        ));
    }
    
    /**
     * Evaluar condición con comparación inteligente de tipos
     */
    private function evaluate_condition($condition, $answer, $variables) {
        switch ($condition->condition_type) {
            case 'answer_equals':
                return $answer === $condition->condition_value;
                
            case 'answer_contains':
                return strpos($answer, $condition->condition_value) !== false;
                
            case 'answer_not_equals':
                return $answer !== $condition->condition_value;
                
            case 'variable_greater':
                $var_name = $condition->condition_value;
                $comparison_value = $this->get_comparison_value($condition);
                $var_value = $variables[$var_name] ?? 0;
                return $this->smart_compare($var_value, $comparison_value, '>');
                
            case 'variable_less':
                $var_name = $condition->condition_value;
                $comparison_value = $this->get_comparison_value($condition);
                $var_value = $variables[$var_name] ?? 0;
                return $this->smart_compare($var_value, $comparison_value, '<');
                
            case 'variable_equals':
                $var_name = $condition->condition_value;
                $comparison_value = $this->get_comparison_value($condition);
                $var_value = $variables[$var_name] ?? 0;
                return $this->smart_compare($var_value, $comparison_value, '==');
                
            default:
                return false;
        }
    }
    
    /**
     * Obtener valor de comparación con fallback para compatibilidad
     */
    private function get_comparison_value($condition) {
        // Priorizar comparison_value si existe y no está vacío
        if (isset($condition->comparison_value) && $condition->comparison_value !== '') {
            return $condition->comparison_value;
        }
        
        // Fallback a variable_amount para compatibilidad con datos existentes
        return $condition->variable_amount ?? 0;
    }
    
    /**
     * Comparación inteligente que maneja números y texto automáticamente
     */
    private function smart_compare($value1, $value2, $operator) {
        // Si ambos valores parecen números, comparar como números
        if (is_numeric($value1) && is_numeric($value2)) {
            $num1 = floatval($value1);
            $num2 = floatval($value2);
            
            switch ($operator) {
                case '>':
                    return $num1 > $num2;
                case '<':
                    return $num1 < $num2;
                case '==':
                    return $num1 == $num2;
                default:
                    return false;
            }
        }
        
        // Si alguno no es numérico, comparar como strings
        $str1 = strval($value1);
        $str2 = strval($value2);
        
        switch ($operator) {
            case '>':
                return strcmp($str1, $str2) > 0;
            case '<':
                return strcmp($str1, $str2) < 0;
            case '==':
                return $str1 === $str2;
            default:
                return false;
        }
    }
    
    /**
     * Obtener condiciones de una pregunta
     */
    private function get_question_conditions($question_id) {
        global $wpdb;
        
        return $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}sfq_conditions 
            WHERE question_id = %d 
            ORDER BY order_position ASC",
            $question_id
        ));
    }
    
    /**
     * Obtener siguiente pregunta en orden
     */
    private function get_next_question_in_order($form_id, $current_question_id) {
        global $wpdb;
        
        // Obtener posición actual
        $current_position = $wpdb->get_var($wpdb->prepare(
            "SELECT order_position FROM {$wpdb->prefix}sfq_questions 
            WHERE id = %d",
            $current_question_id
        ));
        
        // Obtener siguiente pregunta
        $next_question = $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM {$wpdb->prefix}sfq_questions 
            WHERE form_id = %d AND order_position > %d 
            ORDER BY order_position ASC 
            LIMIT 1",
            $form_id,
            $current_position
        ));
        
        return $next_question;
    }
    
    /**
     * Calcular puntuación total
     */
    private function calculate_total_score($variables) {
        $total = 0;
        foreach ($variables as $key => $value) {
            if (strpos($key, 'score_') === 0) {
                $total += intval($value);
            }
        }
        return $total;
    }
    
    /**
     * Calcular puntuación de respuesta
     */
    private function calculate_answer_score($question_id, $answer) {
        // Aquí se puede implementar lógica específica de puntuación
        // Por ahora retornamos 0
        return 0;
    }
    
    /**
     * Determinar URL de redirección
     */
    private function determine_redirect($form_id, $variables, $responses) {
        global $wpdb;
        
        // Obtener todas las condiciones del formulario que tienen redirección
        $redirect_conditions = $wpdb->get_results($wpdb->prepare(
            "SELECT c.*, q.id as question_id 
            FROM {$wpdb->prefix}sfq_conditions c
            JOIN {$wpdb->prefix}sfq_questions q ON c.question_id = q.id
            WHERE q.form_id = %d AND c.action_type = 'redirect_url'
            ORDER BY c.order_position ASC",
            $form_id
        ));
        
        // Evaluar condiciones de redirección
        foreach ($redirect_conditions as $condition) {
            $question_id = $condition->question_id;
            $answer = $responses[$question_id] ?? '';
            
            if ($this->evaluate_condition($condition, $answer, $variables)) {
                return esc_url_raw($condition->action_value);
            }
        }
        
        // Si no hay condiciones que se cumplan, obtener URL por defecto del formulario
        $form = $wpdb->get_row($wpdb->prepare(
            "SELECT redirect_url FROM {$wpdb->prefix}sfq_forms WHERE id = %d",
            $form_id
        ));
        
        return $form->redirect_url ?? '';
    }
    
    /**
     * Enviar notificaciones
     */
    private function send_notifications($form_id, $submission_id) {
        // Obtener configuración de notificaciones
        $form = $this->database->get_form($form_id);
        $settings = $form->settings;
        
        if (empty($settings['notifications_enabled'])) {
            return;
        }
        
        // Preparar datos del email
        global $wpdb;
        $submission = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}sfq_submissions WHERE id = %d",
            $submission_id
        ));
        
        $responses = $wpdb->get_results($wpdb->prepare(
            "SELECT r.*, q.question_text 
            FROM {$wpdb->prefix}sfq_responses r
            JOIN {$wpdb->prefix}sfq_questions q ON r.question_id = q.id
            WHERE r.submission_id = %d",
            $submission_id
        ));
        
        // Construir mensaje
        $message = $this->build_notification_message($form, $submission, $responses);
        
        // Enviar email al administrador
        if (!empty($settings['admin_email'])) {
            wp_mail(
                $settings['admin_email'],
                sprintf(__('Nueva respuesta: %s', 'smart-forms-quiz'), $form->title),
                $message,
                array('Content-Type: text/html; charset=UTF-8')
            );
        }
        
        // Enviar email de confirmación al usuario si hay campo de email
        foreach ($responses as $response) {
            if (is_email($response->answer)) {
                wp_mail(
                    $response->answer,
                    sprintf(__('Confirmación: %s', 'smart-forms-quiz'), $form->title),
                    $settings['user_notification_message'] ?? $message,
                    array('Content-Type: text/html; charset=UTF-8')
                );
                break;
            }
        }
    }
    
    /**
     * Construir mensaje de notificación
     */
    private function build_notification_message($form, $submission, $responses) {
        $message = '<html><body>';
        $message .= '<h2>' . esc_html($form->title) . '</h2>';
        $message .= '<p><strong>' . __('Fecha:', 'smart-forms-quiz') . '</strong> ' . $submission->completed_at . '</p>';
        
        if ($submission->user_id) {
            $user = get_user_by('id', $submission->user_id);
            $message .= '<p><strong>' . __('Usuario:', 'smart-forms-quiz') . '</strong> ' . $user->display_name . '</p>';
        }
        
        $message .= '<h3>' . __('Respuestas:', 'smart-forms-quiz') . '</h3>';
        $message .= '<table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse;">';
        
        foreach ($responses as $response) {
            $message .= '<tr>';
            $message .= '<td><strong>' . esc_html($response->question_text) . '</strong></td>';
            $message .= '<td>' . esc_html($response->answer) . '</td>';
            $message .= '</tr>';
        }
        
        $message .= '</table>';
        $message .= '</body></html>';
        
        return $message;
    }
    
    /**
     * Registrar evento de analytics
     */
    private function register_analytics_event($form_id, $event_type, $event_data = array(), $session_id = null) {
        global $wpdb;
        
        $wpdb->insert(
            $wpdb->prefix . 'sfq_analytics',
            array(
                'form_id' => $form_id,
                'event_type' => $event_type,
                'event_data' => json_encode($event_data),
                'user_ip' => $this->get_user_ip(),
                'session_id' => $session_id ?: 'unknown'
            ),
            array('%d', '%s', '%s', '%s', '%s')
        );
    }
    
    /**
     * Obtener IP del usuario
     */
    private function get_user_ip() {
        // Usar método centralizado de la clase Utils
        return SFQ_Utils::get_user_ip();
    }
    
    /**
     * Guardar formulario (Admin AJAX) - Optimizado
     */
    public function save_form() {
        // Early validation for better performance
        if (!$this->validate_ajax_request('manage_smart_forms')) {
            return;
        }
        
        // Rate limiting check
        if (!$this->check_rate_limit('save_form', 10, 60)) {
            wp_send_json_error(__('Demasiadas peticiones. Intenta de nuevo en un momento.', 'smart-forms-quiz'));
            return;
        }
        
        // Obtener y validar datos del formulario
        $form_data = $this->get_and_validate_form_data();
        if (!$form_data) {
            return; // Error already sent
        }
        
        // Validaciones adicionales
        $validation_result = $this->validate_form_data($form_data);
        if (!$validation_result['valid']) {
            wp_send_json_error(array(
                'message' => $validation_result['message'],
                'errors' => $validation_result['errors']
            ));
            return;
        }
        
        try {
            // Guardar formulario con manejo de errores mejorado
            $form_id = $this->database->save_form($form_data);
            
            if ($form_id) {
                // Clear related caches
                $this->clear_form_cache($form_id);
                
                wp_send_json_success(array(
                    'form_id' => $form_id,
                    'message' => __('Formulario guardado correctamente', 'smart-forms-quiz'),
                    'timestamp' => current_time('timestamp')
                ));
            } else {
                wp_send_json_error(array(
                    'message' => __('Error al guardar el formulario', 'smart-forms-quiz'),
                    'code' => 'SAVE_FAILED'
                ));
            }
        } catch (Exception $e) {
            error_log('SFQ Save Form Error: ' . $e->getMessage());
            wp_send_json_error(array(
                'message' => __('Error interno del servidor', 'smart-forms-quiz'),
                'code' => 'INTERNAL_ERROR',
                'debug' => WP_DEBUG ? $e->getMessage() : null
            ));
        }
    }
    
    /**
     * Obtener datos del formulario (Admin AJAX) - Optimizado
     */
    public function get_form_data() {
        // Early validation
        if (!$this->validate_ajax_request('manage_smart_forms')) {
            return;
        }
        
        $form_id = intval($_POST['form_id'] ?? 0);
        
        if (!$form_id || $form_id < 1) {
            wp_send_json_error(array(
                'message' => __('ID de formulario inválido', 'smart-forms-quiz'),
                'code' => 'INVALID_FORM_ID'
            ));
            return;
        }
        
        try {
            // Check cache first
            $cache_key = "sfq_form_data_{$form_id}";
            $cached_form = wp_cache_get($cache_key, 'sfq_forms');
            
            if ($cached_form !== false) {
                wp_send_json_success($cached_form);
                return;
            }
            
        // Obtener formulario de la base de datos (usar versión fresh para admin)
        $form = $this->database->get_form_fresh($form_id);
            
            if (!$form) {
                wp_send_json_error(array(
                    'message' => __('Formulario no encontrado', 'smart-forms-quiz'),
                    'code' => 'FORM_NOT_FOUND'
                ));
                return;
            }
            
            // Validar y estructurar datos del formulario
            $form = $this->validate_and_structure_form_data($form);
            
            // Cache the result for 5 minutes
            wp_cache_set($cache_key, $form, 'sfq_forms', 300);
            
            wp_send_json_success($form);
            
        } catch (Exception $e) {
            error_log('SFQ Error in get_form_data: ' . $e->getMessage());
            wp_send_json_error(array(
                'message' => __('Error al cargar los datos del formulario', 'smart-forms-quiz'),
                'code' => 'INTERNAL_ERROR'
            ));
        }
    }
    
    /**
     * Validar y estructurar datos del formulario
     */
    private function validate_and_structure_form_data($form) {
        // Asegurar que las configuraciones existan
        if (!isset($form->settings) || !is_array($form->settings)) {
            $form->settings = [];
        }
        
        if (!isset($form->style_settings) || !is_array($form->style_settings)) {
            $form->style_settings = [];
        }
        
        // Asegurar que questions sea un array
        if (!isset($form->questions) || !is_array($form->questions)) {
            $form->questions = [];
        }
        
        // Procesar cada pregunta para asegurar estructura correcta
        foreach ($form->questions as $index => &$question) {
            $question = $this->validate_and_structure_question_data($question, $index);
        }
        
        return $form;
    }
    
    /**
     * Validar y estructurar datos de una pregunta
     */
    private function validate_and_structure_question_data($question, $index = 0) {
        // Asegurar propiedades básicas
        $question->id = $question->id ?? 0;
        $question->question_text = $question->question_text ?? '';
        $question->question_type = $question->question_type ?? 'text';
        $question->order_position = $question->order_position ?? $index;
        
        // Procesar campo required
        if (isset($question->required)) {
            if (is_string($question->required)) {
                $question->required = in_array($question->required, ['1', 'true', 'yes']) ? 1 : 0;
            } else {
                $question->required = $question->required ? 1 : 0;
            }
        } else {
            $question->required = 0;
        }
        
        // Procesar según el tipo de pregunta
        if ($question->question_type === 'freestyle') {
            // Para preguntas freestyle, procesar elementos
            $question->freestyle_elements = $this->validate_and_structure_freestyle_elements($question->freestyle_elements ?? []);
            $question->global_settings = $question->global_settings ?? [];
            $question->options = []; // Las preguntas freestyle no tienen opciones tradicionales
        } else {
            // Para preguntas regulares, procesar opciones
            $question->options = $this->validate_and_structure_options($question->options ?? []);
        }
        
        // Procesar condiciones
        $question->conditions = $this->validate_and_structure_conditions($question->conditions ?? []);
        
        // Asegurar configuraciones de pregunta
        if (!isset($question->settings) || !is_array($question->settings)) {
            $question->settings = [];
        }
        
        return $question;
    }
    
    /**
     * Validar y estructurar opciones de pregunta
     */
    private function validate_and_structure_options($options) {
        if (!is_array($options)) {
            return [];
        }
        
        $structured_options = [];
        
        foreach ($options as $option) {
            if (is_string($option)) {
                $structured_options[] = [
                    'text' => $option,
                    'value' => $option
                ];
            } elseif (is_array($option) || is_object($option)) {
                $option = (array) $option;
                $structured_options[] = [
                    'text' => $option['text'] ?? $option['value'] ?? '',
                    'value' => $option['value'] ?? $option['text'] ?? ''
                ];
            }
        }
        
        // Filtrar opciones vacías
        $structured_options = array_filter($structured_options, function($option) {
            return !empty(trim($option['text']));
        });
        
        return array_values($structured_options); // Reindexar array
    }
    
    /**
     * Validar y estructurar elementos freestyle
     */
    private function validate_and_structure_freestyle_elements($elements) {
        if (!is_array($elements)) {
            return [];
        }
        
        $structured_elements = [];
        
        foreach ($elements as $index => $element) {
            if (is_object($element)) {
                $element = (array) $element;
            }
            
            if (!is_array($element)) {
                continue;
            }
            
            // Validar que tenga las propiedades mínimas requeridas
            if (empty($element['type'])) {
                continue;
            }
            
            // Validar que el tipo sea válido
            $valid_types = ['text', 'video', 'image', 'countdown', 'phone', 'email', 'file_upload', 'button', 'rating', 'dropdown', 'checkbox', 'legal_text'];
            if (!in_array($element['type'], $valid_types)) {
                continue;
            }
            
            $structured_elements[] = [
                'id' => $element['id'] ?? 'element_' . time() . '_' . $index,
                'type' => $element['type'],
                'label' => sanitize_text_field($element['label'] ?? ''),
                'order' => intval($element['order'] ?? $index),
                'settings' => is_array($element['settings'] ?? null) ? $element['settings'] : [],
                'value' => sanitize_text_field($element['value'] ?? '')
            ];
        }
        
        // Ordenar por orden
        usort($structured_elements, function($a, $b) {
            return $a['order'] - $b['order'];
        });
        
        return $structured_elements;
    }

    /**
     * Validar y estructurar condiciones de pregunta
     */
    private function validate_and_structure_conditions($conditions) {
        if (!is_array($conditions)) {
            return [];
        }
        
        $structured_conditions = [];
        
        foreach ($conditions as $condition) {
            if (is_object($condition)) {
                $condition = (array) $condition;
            }
            
            if (!is_array($condition)) {
                continue;
            }
            
            // Validar que tenga las propiedades mínimas requeridas
            if (empty($condition['condition_type']) || empty($condition['action_type'])) {
                continue;
            }
            
            $structured_conditions[] = [
                'condition_type' => $condition['condition_type'],
                'condition_value' => $condition['condition_value'] ?? '',
                'action_type' => $condition['action_type'],
                'action_value' => $condition['action_value'] ?? '',
                'variable_operation' => $condition['variable_operation'] ?? '',
                'variable_amount' => intval($condition['variable_amount'] ?? 0),
                'comparison_value' => $condition['comparison_value'] ?? '',  // ✅ CRÍTICO: Incluir nuevo campo
                'order_position' => intval($condition['order_position'] ?? 0)
            ];
        }
        
        return $structured_conditions;
    }
    
    /**
     * Eliminar formulario (Admin AJAX)
     */
    public function delete_form() {
        // Verificar permisos mejorados
        if (!current_user_can('manage_smart_forms') && !current_user_can('manage_options')) {
            wp_send_json_error(__('No tienes permisos para realizar esta acción', 'smart-forms-quiz'));
            return;
        }
        
        // Verificar nonce
        if (!check_ajax_referer('sfq_nonce', 'nonce', false)) {
            wp_send_json_error(__('Error de seguridad', 'smart-forms-quiz'));
            return;
        }
        
        // Verificar método de petición
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            wp_send_json_error(__('Método de petición no válido', 'smart-forms-quiz'));
            return;
        }
        
        $form_id = intval($_POST['form_id']);
        
        if (!$form_id) {
            wp_send_json_error(__('ID de formulario inválido', 'smart-forms-quiz'));
            return;
        }
        
        global $wpdb;
        
        // Iniciar transacción
        $wpdb->query('START TRANSACTION');
        
        try {
            // Eliminar respuestas asociadas
            $wpdb->delete(
                $wpdb->prefix . 'sfq_responses',
                array('submission_id' => $wpdb->prepare(
                    "SELECT id FROM {$wpdb->prefix}sfq_submissions WHERE form_id = %d",
                    $form_id
                )),
                array('%d')
            );
            
            // Eliminar envíos
            $wpdb->delete(
                $wpdb->prefix . 'sfq_submissions',
                array('form_id' => $form_id),
                array('%d')
            );
            
            // Eliminar analytics
            $wpdb->delete(
                $wpdb->prefix . 'sfq_analytics',
                array('form_id' => $form_id),
                array('%d')
            );
            
            // Eliminar condiciones de las preguntas
            $questions = $wpdb->get_col($wpdb->prepare(
                "SELECT id FROM {$wpdb->prefix}sfq_questions WHERE form_id = %d",
                $form_id
            ));
            
            if (!empty($questions)) {
                // Validate that all IDs are positive integers
                $questions = array_filter($questions, function($id) {
                    return is_numeric($id) && intval($id) > 0;
                });
                
                if (!empty($questions)) {
                    $placeholders = implode(',', array_fill(0, count($questions), '%d'));
                    $wpdb->query($wpdb->prepare(
                        "DELETE FROM {$wpdb->prefix}sfq_conditions WHERE question_id IN ($placeholders)",
                        $questions
                    ));
                }
            }
            
            // Eliminar preguntas
            $wpdb->delete(
                $wpdb->prefix . 'sfq_questions',
                array('form_id' => $form_id),
                array('%d')
            );
            
            // Eliminar formulario
            $result = $wpdb->delete(
                $wpdb->prefix . 'sfq_forms',
                array('id' => $form_id),
                array('%d')
            );
            
            if ($result !== false) {
                $wpdb->query('COMMIT');
                wp_send_json_success(array(
                    'message' => __('Formulario eliminado correctamente', 'smart-forms-quiz')
                ));
            } else {
                $wpdb->query('ROLLBACK');
                wp_send_json_error(__('Error al eliminar el formulario', 'smart-forms-quiz'));
            }
        } catch (Exception $e) {
            $wpdb->query('ROLLBACK');
            wp_send_json_error(__('Error al eliminar el formulario: ', 'smart-forms-quiz') . $e->getMessage());
        }
    }
    
    /**
     * Duplicar formulario (Admin AJAX)
     */
    public function duplicate_form() {
        // Verificar permisos
        if (!current_user_can('manage_options')) {
            wp_send_json_error(__('No tienes permisos para realizar esta acción', 'smart-forms-quiz'));
            return;
        }
        
        // Verificar nonce
        if (!check_ajax_referer('sfq_nonce', 'nonce', false)) {
            wp_send_json_error(__('Error de seguridad', 'smart-forms-quiz'));
            return;
        }
        
        $form_id = intval($_POST['form_id']);
        
        if (!$form_id) {
            wp_send_json_error(__('ID de formulario inválido', 'smart-forms-quiz'));
            return;
        }
        
        // Obtener formulario original
        $original_form = $this->database->get_form($form_id);
        
        if (!$original_form) {
            wp_send_json_error(__('Formulario no encontrado', 'smart-forms-quiz'));
            return;
        }
        
        // Preparar datos para duplicación
        $new_form_data = array(
            'title' => $original_form->title . ' (Copia)',
            'description' => $original_form->description,
            'type' => $original_form->type,
            'settings' => $original_form->settings,
            'style_settings' => $original_form->style_settings,
            'intro_title' => $original_form->intro_title,
            'intro_description' => $original_form->intro_description,
            'intro_button_text' => $original_form->intro_button_text,
            'thank_you_message' => $original_form->thank_you_message,
            'redirect_url' => $original_form->redirect_url,
            'status' => 'active',
            'questions' => array()
        );
        
        // Duplicar preguntas
        if (!empty($original_form->questions)) {
            foreach ($original_form->questions as $question) {
                $new_question = array(
                    'question_text' => $question->question_text,
                    'question_type' => $question->question_type,
                    'options' => $question->options,
                    'settings' => $question->settings,
                    'required' => $question->required,
                    'order_position' => $question->order_position,
                    'variable_name' => $question->variable_name,
                    'variable_value' => $question->variable_value,
                    'conditions' => array()
                );
                
                // Duplicar condiciones
                if (!empty($question->conditions)) {
                    foreach ($question->conditions as $condition) {
                        $new_question['conditions'][] = array(
                            'condition_type' => $condition->condition_type,
                            'condition_value' => $condition->condition_value,
                            'action_type' => $condition->action_type,
                            'action_value' => $condition->action_value,
                            'variable_operation' => $condition->variable_operation,
                            'variable_amount' => $condition->variable_amount,
                            'order_position' => $condition->order_position
                        );
                    }
                }
                
                $new_form_data['questions'][] = $new_question;
            }
        }
        
        // Guardar formulario duplicado
        $new_form_id = $this->database->save_form($new_form_data);
        
        if ($new_form_id) {
            wp_send_json_success(array(
                'form_id' => $new_form_id,
                'message' => __('Formulario duplicado correctamente', 'smart-forms-quiz')
            ));
        } else {
            wp_send_json_error(__('Error al duplicar el formulario', 'smart-forms-quiz'));
        }
    }
    
    /**
     * Validar petición AJAX (método auxiliar)
     */
    private function validate_ajax_request($capability = 'manage_smart_forms') {
        // Usar método centralizado de la clase Utils
        return SFQ_Utils::validate_ajax_request($capability);
    }
    
    /**
     * Rate limiting mejorado usando implementación de seguridad
     */
    private function check_rate_limit($action, $max_requests = null, $time_window = null) {
        // Usar método centralizado de la clase Security (más robusto)
        return SFQ_Security::check_rate_limit($action, $max_requests, $time_window);
    }
    
    /**
     * Obtener y validar datos del formulario
     */
    private function get_and_validate_form_data() {
        if (!isset($_POST['form_data'])) {
            wp_send_json_error(array(
                'message' => __('Datos del formulario no proporcionados', 'smart-forms-quiz'),
                'code' => 'MISSING_FORM_DATA'
            ));
            return false;
        }
        
        $form_data = json_decode(stripslashes($_POST['form_data']), true);
        
        if (!$form_data || !is_array($form_data)) {
            wp_send_json_error(array(
                'message' => __('Datos del formulario inválidos', 'smart-forms-quiz'),
                'code' => 'INVALID_JSON'
            ));
            return false;
        }
        
        return $form_data;
    }
    
    /**
     * Validar datos del formulario
     */
    private function validate_form_data($form_data) {
        $errors = array();
        
        // Validar título requerido
        if (empty($form_data['title']) || !is_string($form_data['title'])) {
            $errors['title'] = __('El título del formulario es requerido', 'smart-forms-quiz');
        } elseif (strlen($form_data['title']) > 255) {
            $errors['title'] = __('El título no puede exceder 255 caracteres', 'smart-forms-quiz');
        }
        
        // Validar tipo
        if (isset($form_data['type']) && !in_array($form_data['type'], array('form', 'quiz'))) {
            $errors['type'] = __('Tipo de formulario inválido', 'smart-forms-quiz');
        }
        
        // Validar URL de redirección si está presente
        if (!empty($form_data['redirect_url']) && !filter_var($form_data['redirect_url'], FILTER_VALIDATE_URL)) {
            $errors['redirect_url'] = __('URL de redirección inválida', 'smart-forms-quiz');
        }
        
        // Validar configuraciones de límites de envío - nueva estructura flexible
        if (isset($form_data['settings']) && is_array($form_data['settings'])) {
            $settings = $form_data['settings'];
            
            // Validar límite de envíos flexible
            $limit_count = intval($settings['submission_limit_count'] ?? 0);
            $limit_period = $settings['submission_limit_period'] ?? 'no_limit';
            
            if ($limit_count > 0) {
                // Si hay un número, validar que esté en rango válido
                if ($limit_count < 1 || $limit_count > 999) {
                    $errors['submission_limit_count'] = __('El número de envíos debe estar entre 1 y 999', 'smart-forms-quiz');
                }
                
                // Validar que el período sea válido
                if (!in_array($limit_period, ['day', 'week', 'month', 'year', 'forever'])) {
                    $errors['submission_limit_period'] = __('Período de límite inválido', 'smart-forms-quiz');
                }
            } else {
                // Si no hay número, asegurar que el período sea 'no_limit'
                if ($limit_period !== 'no_limit') {
                    $errors['submission_limit_period'] = __('Debe especificar un número de envíos para usar un período de tiempo', 'smart-forms-quiz');
                }
            }
            
            // Validar tipo de límite
            if (isset($settings['limit_type']) && !in_array($settings['limit_type'], ['session_id', 'ip_address'])) {
                $errors['limit_type'] = __('Tipo de identificación de límite inválido', 'smart-forms-quiz');
            }
            
            // Validar mensaje de límite
            if (isset($settings['limit_message']) && strlen($settings['limit_message']) > 500) {
                $errors['limit_message'] = __('El mensaje de límite no puede exceder 500 caracteres', 'smart-forms-quiz');
            }
            
            // Validar fechas de programación si están habilitadas
            if (isset($settings['enable_schedule']) && $settings['enable_schedule']) {
                if (!empty($settings['schedule_start']) && !empty($settings['schedule_end'])) {
                    $start_time = strtotime($settings['schedule_start']);
                    $end_time = strtotime($settings['schedule_end']);
                    
                    if ($start_time === false) {
                        $errors['schedule_start'] = __('Fecha de inicio inválida', 'smart-forms-quiz');
                    }
                    
                    if ($end_time === false) {
                        $errors['schedule_end'] = __('Fecha de fin inválida', 'smart-forms-quiz');
                    }
                    
                    if ($start_time !== false && $end_time !== false && $start_time >= $end_time) {
                        $errors['schedule_dates'] = __('La fecha de inicio debe ser anterior a la fecha de fin', 'smart-forms-quiz');
                    }
                }
            }
            
            // Validar límite máximo de respuestas
            if (isset($settings['enable_max_submissions']) && $settings['enable_max_submissions']) {
                $max_submissions = intval($settings['max_submissions'] ?? 0);
                if ($max_submissions < 1 || $max_submissions > 10000) {
                    $errors['max_submissions'] = __('El límite máximo de respuestas debe estar entre 1 y 10000', 'smart-forms-quiz');
                }
            }
        }
        
        // Validar preguntas si existen
        if (isset($form_data['questions']) && is_array($form_data['questions'])) {
            foreach ($form_data['questions'] as $index => $question) {
                $question_errors = $this->validate_question_data($question, $index);
                if (!empty($question_errors)) {
                    $errors["questions[{$index}]"] = $question_errors;
                }
            }
        }
        
        return array(
            'valid' => empty($errors),
            'errors' => $errors,
            'message' => empty($errors) ? '' : __('Se encontraron errores de validación', 'smart-forms-quiz')
        );
    }
    
    /**
     * Validar datos de una pregunta
     */
    private function validate_question_data($question, $index) {
        $errors = array();
        
        if (empty($question['question_text'])) {
            $errors['question_text'] = sprintf(__('El texto de la pregunta %d es requerido', 'smart-forms-quiz'), $index + 1);
        }
        
        if (empty($question['question_type'])) {
            $errors['question_type'] = sprintf(__('El tipo de la pregunta %d es requerido', 'smart-forms-quiz'), $index + 1);
        }
        
        // Validar según el tipo de pregunta
        if ($question['question_type'] === 'freestyle') {
            // Para preguntas freestyle, validar elementos si existen
            if (isset($question['freestyle_elements']) && is_array($question['freestyle_elements'])) {
                foreach ($question['freestyle_elements'] as $element_index => $element) {
                    if (empty($element['type'])) {
                        $errors['freestyle_elements'][] = sprintf(__('El elemento %d de la pregunta %d requiere un tipo', 'smart-forms-quiz'), $element_index + 1, $index + 1);
                    }
                    
                    // Validar que el tipo de elemento sea válido
                    $valid_element_types = array('text', 'video', 'image', 'countdown', 'phone', 'email', 'file_upload', 'button', 'rating', 'dropdown', 'checkbox', 'legal_text');
                    if (!empty($element['type']) && !in_array($element['type'], $valid_element_types)) {
                        $errors['freestyle_elements'][] = sprintf(__('Tipo de elemento inválido en el elemento %d de la pregunta %d', 'smart-forms-quiz'), $element_index + 1, $index + 1);
                    }
                }
            }
        } else {
            // Validar opciones para tipos que las requieren
            $types_with_options = array('single_choice', 'multiple_choice', 'image_choice');
            if (in_array($question['question_type'], $types_with_options)) {
                if (empty($question['options']) || !is_array($question['options'])) {
                    $errors['options'] = sprintf(__('La pregunta %d requiere opciones', 'smart-forms-quiz'), $index + 1);
                } elseif (count($question['options']) < 2) {
                    $errors['options'] = sprintf(__('La pregunta %d requiere al menos 2 opciones', 'smart-forms-quiz'), $index + 1);
                }
            }
        }
        
        return $errors;
    }
    
    /**
     * Limpiar caché relacionado con formularios
     */
    private function clear_form_cache($form_id) {
        wp_cache_delete("sfq_form_data_{$form_id}", 'sfq_forms');
        wp_cache_delete("sfq_form_{$form_id}", 'sfq_forms');
        
        // Clear any related caches
        wp_cache_flush_group('sfq_forms');
    }
    
    /**
     * Obtener estadísticas rápidas de un formulario
     */
    public function get_form_quick_stats() {
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
        
        if (!$form_id) {
            wp_send_json_error(__('ID de formulario inválido', 'smart-forms-quiz'));
            return;
        }
        
        global $wpdb;
        
        // Obtener total de submissions (igual que en get_dashboard_stats)
        $total_submissions = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) 
            FROM {$wpdb->prefix}sfq_submissions 
            WHERE form_id = %d AND status = 'completed'",
            $form_id
        ));
        
        // Obtener total de vistas (eventos 'view') - con lógica de fallback igual que en estadísticas detalladas
        $analytics_table = $wpdb->prefix . 'sfq_analytics';
        $table_exists = $wpdb->get_var($wpdb->prepare("SHOW TABLES LIKE %s", $analytics_table)) === $analytics_table;
        
        $total_views = 0;
        if ($table_exists) {
            $total_views = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(DISTINCT session_id) 
                FROM {$wpdb->prefix}sfq_analytics 
                WHERE form_id = %d AND event_type = 'view'",
                $form_id
            ));
        }
        
        // Si no hay vistas en analytics, usar el contador de submissions como aproximación (igual que en estadísticas detalladas)
        if ($total_views == 0 && $total_submissions > 0) {
            $total_views = $total_submissions * 2; // Estimación conservadora
        }
        
        // ✅ NUEVO: Obtener conteo de respuestas parciales
        $partial_table = $wpdb->prefix . 'sfq_partial_responses';
        $partial_table_exists = $wpdb->get_var($wpdb->prepare("SHOW TABLES LIKE %s", $partial_table)) === $partial_table;
        
        $partial_responses_count = 0;
        if ($partial_table_exists) {
            $partial_responses_count = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$partial_table} WHERE form_id = %d",
                $form_id
            ));
        }
        
        // Calcular tasa de conversión: (total_submissions / total_views) * 100
        // Usar la misma lógica exacta que get_dashboard_stats para consistencia
        $conversion_rate = 0;
        
        if ($total_views > 0 && $total_submissions > 0) {
            $conversion_rate = ($total_submissions / $total_views) * 100;
            
            // Redondear a 1 decimal
            $conversion_rate = round($conversion_rate, 1);
            
            // Asegurar que esté en el rango 0-100%
            $conversion_rate = max(0, min(100, $conversion_rate));
        }

        wp_send_json_success(array(
            'views' => intval($total_views),
            'completed' => intval($total_submissions),
            'rate' => $conversion_rate,
            'partial_responses' => intval($partial_responses_count)
        ));
    }
    
    /**
     * Obtener lista de respuestas/submissions
     */
    public function get_submissions() {
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
        
        global $wpdb;
        
        $form_id = intval($_POST['form_id'] ?? 0);
        $page = intval($_POST['page'] ?? 1);
        $per_page = intval($_POST['per_page'] ?? 20);
        $offset = ($page - 1) * $per_page;
        
        // Construir consulta base
        $where_clause = "WHERE 1=1";
        $params = array();
        
        if ($form_id > 0) {
            $where_clause .= " AND s.form_id = %d";
            $params[] = $form_id;
        }
        
        // Obtener total de registros
        $total_query = "SELECT COUNT(*) FROM {$wpdb->prefix}sfq_submissions s $where_clause";
        if (!empty($params)) {
            $total = $wpdb->get_var($wpdb->prepare($total_query, $params));
        } else {
            $total = $wpdb->get_var($total_query);
        }
        
        // Obtener submissions con información del formulario
        $query = "
            SELECT 
                s.*,
                f.title as form_title,
                (SELECT COUNT(*) FROM {$wpdb->prefix}sfq_responses WHERE submission_id = s.id) as response_count
            FROM {$wpdb->prefix}sfq_submissions s
            LEFT JOIN {$wpdb->prefix}sfq_forms f ON s.form_id = f.id
            $where_clause
            ORDER BY s.created_at DESC
            LIMIT %d OFFSET %d
        ";
        
        $params[] = $per_page;
        $params[] = $offset;
        
        $submissions = $wpdb->get_results($wpdb->prepare($query, $params));
        
        // Formatear datos
        foreach ($submissions as &$submission) {
            $submission->formatted_date = date_i18n(get_option('date_format') . ' ' . get_option('time_format'), strtotime($submission->completed_at));
            $submission->time_spent_formatted = $this->format_time($submission->time_spent);
            
            // Obtener información del usuario si existe
            if ($submission->user_id) {
                $user = get_user_by('id', $submission->user_id);
                $submission->user_name = $user ? $user->display_name : __('Usuario eliminado', 'smart-forms-quiz');
                $submission->user_email = $user ? $user->user_email : '';
            } else {
                $submission->user_name = __('Anónimo', 'smart-forms-quiz');
                $submission->user_email = '';
            }
        }
        
        wp_send_json_success(array(
            'submissions' => $submissions,
            'total' => intval($total),
            'pages' => ceil($total / $per_page),
            'current_page' => $page
        ));
    }
    
    /**
     * Obtener detalle de una respuesta específica
     */
    public function get_submission_detail() {
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
        
        $submission_id = intval($_POST['submission_id'] ?? 0);
        
        if (!$submission_id) {
            wp_send_json_error(__('ID de submission inválido', 'smart-forms-quiz'));
            return;
        }
        
        global $wpdb;
        
        // Obtener información del submission
        $submission = $wpdb->get_row($wpdb->prepare(
            "SELECT s.*, f.title as form_title 
            FROM {$wpdb->prefix}sfq_submissions s
            LEFT JOIN {$wpdb->prefix}sfq_forms f ON s.form_id = f.id
            WHERE s.id = %d",
            $submission_id
        ));
        
        if (!$submission) {
            wp_send_json_error(__('Submission no encontrado', 'smart-forms-quiz'));
            return;
        }
        
        // Obtener respuestas detalladas
        $responses = $wpdb->get_results($wpdb->prepare(
            "SELECT r.*, q.question_text, q.question_type, q.options
            FROM {$wpdb->prefix}sfq_responses r
            JOIN {$wpdb->prefix}sfq_questions q ON r.question_id = q.id
            WHERE r.submission_id = %d
            ORDER BY q.order_position",
            $submission_id
        ));
        
        // Formatear respuestas
        foreach ($responses as &$response) {
            // Decodificar respuesta si es JSON (para multiple choice)
            $decoded_answer = json_decode($response->answer, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded_answer)) {
                $response->answer_formatted = implode(', ', $decoded_answer);
            } else {
                $response->answer_formatted = $response->answer;
            }
            
            // Decodificar opciones si es necesario
            if ($response->options) {
                $response->options = json_decode($response->options, true);
            }
        }
        
        // Información del usuario
        if ($submission->user_id) {
            $user = get_user_by('id', $submission->user_id);
            $submission->user_name = $user ? $user->display_name : __('Usuario eliminado', 'smart-forms-quiz');
            $submission->user_email = $user ? $user->user_email : '';
        } else {
            $submission->user_name = __('Anónimo', 'smart-forms-quiz');
            $submission->user_email = '';
        }
        
        // Formatear fechas y tiempos
        $submission->formatted_date = date_i18n(get_option('date_format') . ' ' . get_option('time_format'), strtotime($submission->completed_at));
        $submission->time_spent_formatted = $this->format_time($submission->time_spent);
        
        // Decodificar variables si existen
        if ($submission->variables) {
            $submission->variables = json_decode($submission->variables, true);
        }
        
        wp_send_json_success(array(
            'submission' => $submission,
            'responses' => $responses
        ));
    }
    
    /**
     * Resetear estadísticas de un formulario (Admin AJAX)
     */
    public function reset_form_stats() {
        // Verificar permisos
        if (!current_user_can('manage_smart_forms') && !current_user_can('manage_options')) {
            wp_send_json_error(__('No tienes permisos para realizar esta acción', 'smart-forms-quiz'));
            return;
        }
        
        // Verificar nonce
        if (!check_ajax_referer('sfq_nonce', 'nonce', false)) {
            wp_send_json_error(__('Error de seguridad', 'smart-forms-quiz'));
            return;
        }
        
        // Verificar método de petición
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            wp_send_json_error(__('Método de petición no válido', 'smart-forms-quiz'));
            return;
        }
        
        $form_id = intval($_POST['form_id'] ?? 0);
        
        if (!$form_id) {
            wp_send_json_error(__('ID de formulario inválido', 'smart-forms-quiz'));
            return;
        }
        
        // Verificar que el formulario existe
        $form = $this->database->get_form($form_id);
        if (!$form) {
            wp_send_json_error(__('Formulario no encontrado', 'smart-forms-quiz'));
            return;
        }
        
        global $wpdb;
        
        // Iniciar transacción para asegurar integridad de datos
        $wpdb->query('START TRANSACTION');
        
        try {
            // Obtener todos los submission IDs del formulario
            $submission_ids = $wpdb->get_col($wpdb->prepare(
                "SELECT id FROM {$wpdb->prefix}sfq_submissions WHERE form_id = %d",
                $form_id
            ));
            
            // Eliminar respuestas individuales
            if (!empty($submission_ids)) {
                $placeholders = implode(',', array_fill(0, count($submission_ids), '%d'));
                $wpdb->query($wpdb->prepare(
                    "DELETE FROM {$wpdb->prefix}sfq_responses WHERE submission_id IN ($placeholders)",
                    $submission_ids
                ));
            }
            
            // Eliminar submissions/envíos
            $submissions_deleted = $wpdb->delete(
                $wpdb->prefix . 'sfq_submissions',
                array('form_id' => $form_id),
                array('%d')
            );
            
            // Eliminar eventos de analytics
            $analytics_deleted = $wpdb->delete(
                $wpdb->prefix . 'sfq_analytics',
                array('form_id' => $form_id),
                array('%d')
            );
            
            // Confirmar transacción
            $wpdb->query('COMMIT');
            
            // Limpiar caché relacionado
            $this->clear_form_cache($form_id);
            wp_cache_delete("sfq_form_stats_{$form_id}", 'sfq_stats');
            
            
            wp_send_json_success(array(
                'message' => __('Estadísticas borradas correctamente', 'smart-forms-quiz'),
                'submissions_deleted' => intval($submissions_deleted),
                'analytics_deleted' => intval($analytics_deleted),
                'form_title' => $form->title
            ));
            
        } catch (Exception $e) {
            // Rollback en caso de error
            $wpdb->query('ROLLBACK');
            
            error_log('SFQ Error in reset_form_stats: ' . $e->getMessage());
            
            wp_send_json_error(array(
                'message' => __('Error al borrar las estadísticas. Por favor, intenta de nuevo.', 'smart-forms-quiz'),
                'debug' => WP_DEBUG ? $e->getMessage() : null
            ));
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
     * Manejar acciones de mantenimiento
     */
    public function handle_maintenance_action() {
        // Verificar permisos de administrador
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array(
                'message' => __('No tienes permisos para realizar esta acción', 'smart-forms-quiz')
            ));
            return;
        }
        
        // Verificar nonce específico para mantenimiento
        if (!check_ajax_referer('sfq_maintenance_nonce', 'nonce', false)) {
            wp_send_json_error(array(
                'message' => __('Error de seguridad', 'smart-forms-quiz')
            ));
            return;
        }
        
        // Verificar método de petición
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            wp_send_json_error(array(
                'message' => __('Método de petición no válido', 'smart-forms-quiz')
            ));
            return;
        }
        
        $action = sanitize_text_field($_POST['maintenance_action'] ?? '');
        
        if (empty($action)) {
            wp_send_json_error(array(
                'message' => __('Acción de mantenimiento no especificada', 'smart-forms-quiz')
            ));
            return;
        }
        
        // Validar acciones permitidas
        $allowed_actions = array(
            'clear_cache',
            'optimize_database', 
            'check_integrity',
            'cleanup_old_data',
            'get_database_stats'
        );
        
        if (!in_array($action, $allowed_actions)) {
            wp_send_json_error(array(
                'message' => __('Acción de mantenimiento no válida', 'smart-forms-quiz')
            ));
            return;
        }
        
        try {
            // Ejecutar la acción correspondiente
            switch ($action) {
                case 'clear_cache':
                    $result = $this->clear_all_cache();
                    break;
                    
                case 'optimize_database':
                    $result = $this->database->optimize_database_tables();
                    break;
                    
                case 'check_integrity':
                    $result = $this->database->check_database_integrity();
                    break;
                    
                case 'cleanup_old_data':
                    $result = $this->database->cleanup_old_data();
                    break;
                    
                case 'get_database_stats':
                    $result = $this->database->get_database_stats();
                    break;
                    
                default:
                    throw new Exception(__('Acción no implementada', 'smart-forms-quiz'));
            }
            
            
            wp_send_json_success($result);
            
        } catch (Exception $e) {
            error_log('SFQ Maintenance Error: ' . $e->getMessage());
            
            wp_send_json_error(array(
                'message' => sprintf(__('Error al ejecutar %s: %s', 'smart-forms-quiz'), $action, $e->getMessage()),
                'debug' => WP_DEBUG ? $e->getMessage() : null
            ));
        }
    }
    
    /**
     * Limpiar todo el caché del plugin
     */
    private function clear_all_cache() {
        $cleared_items = array();
        
        // Limpiar caché de WordPress Object Cache
        wp_cache_flush();
        $cleared_items[] = __('Object Cache de WordPress', 'smart-forms-quiz');
        
        // Limpiar grupos específicos del plugin
        wp_cache_flush_group('sfq_forms');
        wp_cache_flush_group('sfq_stats');
        wp_cache_flush_group('sfq_analytics');
        $cleared_items[] = __('Cache específico del plugin', 'smart-forms-quiz');
        
        // Limpiar transients del plugin
        global $wpdb;
        $transients_deleted = $wpdb->query($wpdb->prepare(
            "DELETE FROM {$wpdb->options} 
            WHERE option_name LIKE %s 
            OR option_name LIKE %s",
            '_transient_sfq_%',
            '_transient_timeout_sfq_%'
        ));
        
        if ($transients_deleted > 0) {
            $cleared_items[] = sprintf(__('%d transients eliminados', 'smart-forms-quiz'), $transients_deleted);
        }
        
        // Limpiar caché de opciones específicas
        $plugin_options = array(
            'sfq_forms_cache',
            'sfq_stats_cache',
            'sfq_analytics_cache'
        );
        
        foreach ($plugin_options as $option) {
            delete_option($option);
        }
        $cleared_items[] = __('Opciones de caché del plugin', 'smart-forms-quiz');
        
        return array(
            'message' => __('Cache limpiado correctamente', 'smart-forms-quiz'),
            'details' => $cleared_items
        );
    }
    
    /**
     * Instancia singleton de SFQ_Admin_Submissions para evitar múltiples instanciaciones
     */
    private $submissions_handler = null;
    
    /**
     * Obtener instancia de SFQ_Admin_Submissions (singleton pattern)
     */
    private function get_submissions_handler() {
        if ($this->submissions_handler === null && class_exists('SFQ_Admin_Submissions')) {
            $this->submissions_handler = new SFQ_Admin_Submissions();
        }
        return $this->submissions_handler;
    }
    
    /**
     * Delegador genérico para métodos de submissions avanzadas
     * Consolida la lógica repetida de validación y delegación
     */
    private function delegate_to_submissions_handler($method_name, $fallback_method = null) {
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
        
        // Rate limiting para operaciones sensibles
        $sensitive_methods = ['delete_submissions_bulk', 'delete_submission', 'export_submissions_advanced'];
        if (in_array($method_name, $sensitive_methods)) {
            if (!$this->check_rate_limit($method_name, 5, 60)) {
                wp_send_json_error(__('Demasiadas peticiones. Intenta de nuevo en un momento.', 'smart-forms-quiz'));
                return;
            }
        }
        
        // Obtener handler y ejecutar método
        $handler = $this->get_submissions_handler();
        
        if ($handler && method_exists($handler, $method_name)) {
            try {
                $result = $handler->$method_name();
                wp_send_json($result);
            } catch (Exception $e) {
                error_log("SFQ Error in {$method_name}: " . $e->getMessage());
                wp_send_json_error([
                    'message' => __('Error interno del servidor', 'smart-forms-quiz'),
                    'debug' => WP_DEBUG ? $e->getMessage() : null
                ]);
            }
        } elseif ($fallback_method && method_exists($this, $fallback_method)) {
            // Ejecutar método de fallback si existe
            $this->$fallback_method();
        } else {
            wp_send_json_error(__('Funcionalidad no disponible', 'smart-forms-quiz'));
        }
    }
    
    /**
     * Obtener submissions avanzadas con filtros
     */
    public function get_submissions_advanced() {
        $this->delegate_to_submissions_handler('get_submissions_advanced', 'get_submissions');
    }
    
    /**
     * Obtener estadísticas del dashboard
     */
    public function get_dashboard_stats() {
        $this->delegate_to_submissions_handler('get_dashboard_stats');
    }
    
    /**
     * Obtener analytics de formularios
     */
    public function get_form_analytics() {
        $this->delegate_to_submissions_handler('get_form_analytics');
    }
    
    /**
     * Eliminar submissions en lote
     */
    public function delete_submissions_bulk() {
        $this->delegate_to_submissions_handler('delete_submissions_bulk');
    }
    
    /**
     * Eliminar submission individual
     */
    public function delete_submission() {
        $this->delegate_to_submissions_handler('delete_submission');
    }
    
    /**
     * Guardar nota de submission
     */
    public function save_submission_note() {
        $this->delegate_to_submissions_handler('save_submission_note');
    }
    
    /**
     * Exportar submissions avanzadas
     */
    public function export_submissions_advanced() {
        $this->delegate_to_submissions_handler('export_submissions_advanced');
    }
    
    /**
     * Obtener estadísticas de rate limiting (Admin AJAX)
     */
    public function get_rate_limit_stats() {
        // Verificar permisos de administrador
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array(
                'message' => __('No tienes permisos para realizar esta acción', 'smart-forms-quiz')
            ));
            return;
        }
        
        // Verificar nonce
        if (!check_ajax_referer('sfq_nonce', 'nonce', false)) {
            wp_send_json_error(array(
                'message' => __('Error de seguridad', 'smart-forms-quiz')
            ));
            return;
        }
        
        try {
            // Obtener estadísticas generales
            $general_stats = SFQ_Security::get_rate_limit_stats();
            
            // Obtener estado para acciones específicas del usuario actual
            $actions_status = array();
            $monitored_actions = $general_stats['actions_monitored'];
            
            foreach ($monitored_actions as $action) {
                $actions_status[$action] = SFQ_Security::get_rate_limit_status($action);
            }
            
            wp_send_json_success(array(
                'general_stats' => $general_stats,
                'actions_status' => $actions_status,
                'current_user_id' => get_current_user_id(),
                'current_ip' => SFQ_Utils::get_user_ip()
            ));
            
        } catch (Exception $e) {
            error_log('SFQ Error in get_rate_limit_stats: ' . $e->getMessage());
            
            wp_send_json_error(array(
                'message' => __('Error al obtener estadísticas de rate limiting', 'smart-forms-quiz'),
                'debug' => WP_DEBUG ? $e->getMessage() : null
            ));
        }
    }
    
    /**
     * Limpiar rate limits (Admin AJAX)
     */
    public function clear_rate_limits() {
        // Verificar permisos de administrador
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array(
                'message' => __('No tienes permisos para realizar esta acción', 'smart-forms-quiz')
            ));
            return;
        }
        
        // Verificar nonce
        if (!check_ajax_referer('sfq_nonce', 'nonce', false)) {
            wp_send_json_error(array(
                'message' => __('Error de seguridad', 'smart-forms-quiz')
            ));
            return;
        }
        
        // Verificar método de petición
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            wp_send_json_error(array(
                'message' => __('Método de petición no válido', 'smart-forms-quiz')
            ));
            return;
        }
        
        $action = sanitize_text_field($_POST['action_name'] ?? '');
        $clear_all = isset($_POST['clear_all']) && $_POST['clear_all'] === 'true';
        
        try {
            $cleared_count = 0;
            
            if ($clear_all) {
                // Limpiar todos los rate limits del plugin
                global $wpdb;
                $cleared_count = $wpdb->query($wpdb->prepare(
                    "DELETE FROM {$wpdb->options} 
                    WHERE option_name LIKE %s",
                    '_transient_sfq_rate_limit_%'
                ));
                
                $message = sprintf(__('Se limpiaron %d rate limits activos', 'smart-forms-quiz'), $cleared_count);
                
            } elseif (!empty($action)) {
                // Limpiar rate limit para una acción específica
                $result = SFQ_Security::clear_rate_limit($action);
                $cleared_count = $result ? 1 : 0;
                
                $message = $result 
                    ? sprintf(__('Rate limit limpiado para la acción: %s', 'smart-forms-quiz'), $action)
                    : sprintf(__('No se encontró rate limit activo para la acción: %s', 'smart-forms-quiz'), $action);
                    
            } else {
                wp_send_json_error(array(
                    'message' => __('Debe especificar una acción o marcar limpiar todo', 'smart-forms-quiz')
                ));
                return;
            }
            
            wp_send_json_success(array(
                'message' => $message,
                'cleared_count' => $cleared_count,
                'action' => $action,
                'clear_all' => $clear_all
            ));
            
        } catch (Exception $e) {
            error_log('SFQ Error in clear_rate_limits: ' . $e->getMessage());
            
            wp_send_json_error(array(
                'message' => __('Error al limpiar rate limits', 'smart-forms-quiz'),
                'debug' => WP_DEBUG ? $e->getMessage() : null
            ));
        }
    }
    
    /**
     * Obtener contenido del formulario sin bloqueos (para timer expirado)
     */
    public function get_form_content() {
        // Verificar datos requeridos
        $form_id = intval($_POST['form_id'] ?? 0);
        $timer_expired = isset($_POST['timer_expired']) && $_POST['timer_expired'] === '1';
        
        if (!$form_id) {
            wp_send_json_error(array(
                'message' => __('ID de formulario inválido', 'smart-forms-quiz'),
                'code' => 'INVALID_FORM_ID'
            ));
            return;
        }
        
        // Para peticiones de timer expirado, no requerir nonce si el timer realmente ha expirado
        if ($timer_expired) {
            // Verificar que el timer realmente ha expirado antes de permitir bypass
            if (!$this->verify_timer_expired($form_id)) {
                wp_send_json_error(array(
                    'message' => __('El timer aún no ha expirado', 'smart-forms-quiz'),
                    'code' => 'TIMER_NOT_EXPIRED'
                ));
                return;
            }
        } else {
            // Para otras peticiones, verificar nonce
            if (!check_ajax_referer('sfq_nonce', 'nonce', false)) {
                wp_send_json_error(array(
                    'message' => __('Error de seguridad', 'smart-forms-quiz'),
                    'code' => 'INVALID_NONCE'
                ));
                return;
            }
        }
        
        try {
            // Crear instancia del frontend para renderizar el formulario
            $frontend = new SFQ_Frontend();
            
            // Renderizar el formulario - ahora el método is_timer_expired_request detectará automáticamente
            // que estamos en una petición AJAX válida y permitirá el bypass
            $form_html = $frontend->render_form($form_id);
            
            if (empty($form_html)) {
                wp_send_json_error(array(
                    'message' => __('No se pudo cargar el formulario', 'smart-forms-quiz'),
                    'code' => 'FORM_LOAD_ERROR'
                ));
                return;
            }
            
            // Incluir scripts necesarios para el formulario
            $scripts = array();
            
            // Verificar si necesitamos incluir el script principal del formulario
            if (strpos($form_html, 'sfq-form-container') !== false) {
                // Incluir script para inicializar el formulario
                $scripts[] = '
                    // Reinicializar formularios después de carga dinámica
                    if (typeof SmartFormQuiz !== "undefined") {
                        document.querySelectorAll(".sfq-form-container").forEach(container => {
                            if (!container.dataset.initialized) {
                                new SmartFormQuiz(container);
                                container.dataset.initialized = "true";
                            }
                        });
                    }
                ';
            }
            
            wp_send_json_success(array(
                'html' => $form_html,
                'form_id' => $form_id,
                'scripts' => $scripts,
                'message' => __('Formulario cargado correctamente', 'smart-forms-quiz')
            ));
            
        } catch (Exception $e) {
            error_log('SFQ Error in get_form_content: ' . $e->getMessage());
            
            wp_send_json_error(array(
                'message' => __('Error al cargar el formulario', 'smart-forms-quiz'),
                'code' => 'INTERNAL_ERROR',
                'debug' => WP_DEBUG ? $e->getMessage() : null
            ));
        }
    }
    
    /**
     * Verificar que el timer realmente ha expirado usando UTC
     */
    private function verify_timer_expired($form_id) {
        $form = $this->database->get_form($form_id);
        
        if (!$form) {
            return false;
        }
        
        $settings = $form->settings ?: array();
        $styles = $form->style_settings ?: array();
        
        // Verificar que el formulario esté bloqueado con timer
        if (!isset($settings['block_form']) || !$settings['block_form'] ||
            empty($styles['block_form_enable_timer']) || empty($styles['block_form_timer_date'])) {
            return false;
        }
        
        // Verificar que el timer realmente haya expirado usando UTC
        $timer_date = $styles['block_form_timer_date'];
        $timezone = $styles['block_form_timer_timezone'] ?? wp_timezone_string();
        
        $timer_timestamp = $this->convert_to_utc_timestamp($timer_date, $timezone);
        $current_timestamp = time(); // UTC timestamp
        
        return $current_timestamp >= $timer_timestamp;
    }
    
    /**
     * Convertir fecha y zona horaria a timestamp UTC (método auxiliar para AJAX)
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
            error_log('SFQ Timer Timezone Error (AJAX): ' . $e->getMessage());
            
            try {
                $wp_timezone = new DateTimeZone(wp_timezone_string());
                $datetime = new DateTime($date_string, $wp_timezone);
                $datetime->setTimezone(new DateTimeZone('UTC'));
                return $datetime->getTimestamp();
                
            } catch (Exception $e2) {
                // Como último recurso, usar strtotime
                error_log('SFQ Timer Fallback Error (AJAX): ' . $e2->getMessage());
                return strtotime($date_string);
            }
        }
    }
    
    /**
     * ✅ NUEVO: Guardar respuesta parcial
     */
    public function save_partial_response() {
        // Verificar nonce
        if (!check_ajax_referer('sfq_nonce', 'nonce', false)) {
            wp_send_json_error(__('Error de seguridad', 'smart-forms-quiz'));
            return;
        }
        
        // Rate limiting para guardado parcial (más permisivo que envío completo)
        if (!$this->check_rate_limit('save_partial', 30, 60)) {
            wp_send_json_error(array(
                'message' => __('Demasiadas peticiones de guardado. Intenta de nuevo en un momento.', 'smart-forms-quiz'),
                'code' => 'RATE_LIMIT_EXCEEDED'
            ));
            return;
        }
        
        // Validar datos requeridos
        $form_id = intval($_POST['form_id'] ?? 0);
        $session_id = sanitize_text_field($_POST['session_id'] ?? '');
        
        // Si no se proporciona session_id, generar uno
        if (empty($session_id)) {
            $session_id = SFQ_Utils::get_or_create_session_id($form_id);
        }
        
        if (!$form_id || !$session_id) {
            wp_send_json_error(__('Datos del formulario incompletos', 'smart-forms-quiz'));
            return;
        }
        
        // Verificar que el formulario tenga habilitado el guardado parcial
        $form = $this->database->get_form($form_id);
        if (!$form || empty($form->settings['save_partial'])) {
            wp_send_json_error(array(
                'message' => __('El guardado parcial no está habilitado para este formulario', 'smart-forms-quiz'),
                'code' => 'PARTIAL_SAVE_DISABLED'
            ));
            return;
        }
        
        // Decodificar datos JSON
        $responses = json_decode(stripslashes($_POST['responses'] ?? '{}'), true);
        $variables = json_decode(stripslashes($_POST['variables'] ?? '{}'), true);
        $current_question = intval($_POST['current_question'] ?? 0);
        
        if (!is_array($responses)) {
            $responses = array();
        }
        if (!is_array($variables)) {
            $variables = array();
        }
        
        global $wpdb;
        
        try {
            // Preparar datos para guardado parcial
            $partial_data = array(
                'form_id' => $form_id,
                'session_id' => $session_id,
                'user_id' => get_current_user_id() ?: null,
                'user_ip' => $this->get_user_ip(),
                'responses' => json_encode($responses, JSON_UNESCAPED_UNICODE),
                'variables' => json_encode($variables, JSON_UNESCAPED_UNICODE),
                'current_question' => $current_question,
                'last_updated' => current_time('mysql'),
                'expires_at' => date('Y-m-d H:i:s', strtotime('+7 days')) // Expira en 7 días
            );
            
            // Verificar si ya existe una respuesta parcial para esta sesión
            $existing_partial = $wpdb->get_row($wpdb->prepare(
                "SELECT id FROM {$wpdb->prefix}sfq_partial_responses 
                WHERE form_id = %d AND session_id = %s",
                $form_id,
                $session_id
            ));
            
            if ($existing_partial) {
                // Actualizar respuesta parcial existente
                $result = $wpdb->update(
                    $wpdb->prefix . 'sfq_partial_responses',
                    $partial_data,
                    array('id' => $existing_partial->id),
                    array('%d', '%s', '%d', '%s', '%s', '%s', '%d', '%s', '%s'),
                    array('%d')
                );
                
                $partial_id = $existing_partial->id;
            } else {
                // Crear nueva respuesta parcial
                $result = $wpdb->insert(
                    $wpdb->prefix . 'sfq_partial_responses',
                    $partial_data,
                    array('%d', '%s', '%d', '%s', '%s', '%s', '%d', '%s', '%s')
                );
                
                $partial_id = $wpdb->insert_id;
            }
            
            if ($result === false) {
                throw new Exception('Error al guardar respuesta parcial: ' . $wpdb->last_error);
            }
            
            wp_send_json_success(array(
                'partial_id' => $partial_id,
                'message' => __('Respuesta parcial guardada', 'smart-forms-quiz'),
                'timestamp' => current_time('timestamp'),
                'expires_in_days' => 7
            ));
            
        } catch (Exception $e) {
            error_log('SFQ Error in save_partial_response: ' . $e->getMessage());
            
            wp_send_json_error(array(
                'message' => __('Error al guardar respuesta parcial', 'smart-forms-quiz'),
                'debug' => WP_DEBUG ? $e->getMessage() : null
            ));
        }
    }
    
    /**
     * ✅ NUEVO: Obtener respuesta parcial guardada
     */
    public function get_partial_response() {
        // Verificar nonce
        if (!check_ajax_referer('sfq_nonce', 'nonce', false)) {
            wp_send_json_error(__('Error de seguridad', 'smart-forms-quiz'));
            return;
        }
        
        // Validar datos requeridos
        $form_id = intval($_POST['form_id'] ?? 0);
        $session_id = sanitize_text_field($_POST['session_id'] ?? '');
        
        if (!$form_id || !$session_id) {
            wp_send_json_error(__('Datos del formulario incompletos', 'smart-forms-quiz'));
            return;
        }
        
        // Verificar que el formulario tenga habilitado el guardado parcial
        $form = $this->database->get_form($form_id);
        if (!$form || empty($form->settings['save_partial'])) {
            wp_send_json_success(array(
                'has_partial' => false,
                'message' => __('El guardado parcial no está habilitado', 'smart-forms-quiz')
            ));
            return;
        }
        
        global $wpdb;
        
        try {
            // Buscar respuesta parcial válida (no expirada)
            $partial_response = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM {$wpdb->prefix}sfq_partial_responses 
                WHERE form_id = %d AND session_id = %s AND expires_at > NOW()
                ORDER BY last_updated DESC
                LIMIT 1",
                $form_id,
                $session_id
            ));
            
            if (!$partial_response) {
                wp_send_json_success(array(
                    'has_partial' => false,
                    'message' => __('No hay respuesta parcial guardada', 'smart-forms-quiz')
                ));
                return;
            }
            
            // Decodificar datos JSON
            $responses = json_decode($partial_response->responses, true);
            $variables = json_decode($partial_response->variables, true);
            
            if (!is_array($responses)) {
                $responses = array();
            }
            if (!is_array($variables)) {
                $variables = array();
            }
            
            // Calcular tiempo restante hasta expiración
            $expires_timestamp = strtotime($partial_response->expires_at);
            $current_timestamp = current_time('timestamp');
            $expires_in_hours = max(0, ceil(($expires_timestamp - $current_timestamp) / 3600));
            
            wp_send_json_success(array(
                'has_partial' => true,
                'partial_id' => $partial_response->id,
                'responses' => $responses,
                'variables' => $variables,
                'current_question' => intval($partial_response->current_question),
                'last_updated' => $partial_response->last_updated,
                'expires_in_hours' => $expires_in_hours,
                'message' => sprintf(__('Respuesta parcial encontrada (expira en %d horas)', 'smart-forms-quiz'), $expires_in_hours)
            ));
            
        } catch (Exception $e) {
            error_log('SFQ Error in get_partial_response: ' . $e->getMessage());
            
            wp_send_json_error(array(
                'message' => __('Error al recuperar respuesta parcial', 'smart-forms-quiz'),
                'debug' => WP_DEBUG ? $e->getMessage() : null
            ));
        }
    }
    
    /**
     * ✅ NUEVO: Limpiar respuestas parciales expiradas (Admin AJAX)
     */
    public function cleanup_partial_responses() {
        // Verificar permisos de administrador
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array(
                'message' => __('No tienes permisos para realizar esta acción', 'smart-forms-quiz')
            ));
            return;
        }
        
        // Verificar nonce
        if (!check_ajax_referer('sfq_nonce', 'nonce', false)) {
            wp_send_json_error(array(
                'message' => __('Error de seguridad', 'smart-forms-quiz')
            ));
            return;
        }
        
        global $wpdb;
        
        try {
            // Eliminar respuestas parciales expiradas
            $deleted_count = $wpdb->query(
                "DELETE FROM {$wpdb->prefix}sfq_partial_responses 
                WHERE expires_at < NOW()"
            );
            
            // Obtener estadísticas actuales
            $total_partial = $wpdb->get_var(
                "SELECT COUNT(*) FROM {$wpdb->prefix}sfq_partial_responses"
            );
            
            $oldest_partial = $wpdb->get_var(
                "SELECT MIN(last_updated) FROM {$wpdb->prefix}sfq_partial_responses"
            );
            
            wp_send_json_success(array(
                'deleted_count' => intval($deleted_count),
                'remaining_count' => intval($total_partial),
                'oldest_partial' => $oldest_partial,
                'message' => sprintf(__('Se eliminaron %d respuestas parciales expiradas', 'smart-forms-quiz'), $deleted_count)
            ));
            
        } catch (Exception $e) {
            error_log('SFQ Error in cleanup_partial_responses: ' . $e->getMessage());
            
            wp_send_json_error(array(
                'message' => __('Error al limpiar respuestas parciales', 'smart-forms-quiz'),
                'debug' => WP_DEBUG ? $e->getMessage() : null
            ));
        }
    }
    
}
