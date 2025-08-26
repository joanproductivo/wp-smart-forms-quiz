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
        add_action('wp_ajax_sfq_delete_form', array($this, 'delete_form'));
        add_action('wp_ajax_sfq_duplicate_form', array($this, 'duplicate_form'));
        add_action('wp_ajax_sfq_get_form_quick_stats', array($this, 'get_form_quick_stats'));
        add_action('wp_ajax_sfq_get_submissions', array($this, 'get_submissions'));
        add_action('wp_ajax_sfq_get_submission_detail', array($this, 'get_submission_detail'));
    }
    
    /**
     * Obtener formulario (REST API)
     */
    public function get_form($request) {
        $form_id = $request['id'];
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
        
        // Validar datos requeridos
        $form_id = intval($_POST['form_id'] ?? 0);
        $session_id = sanitize_text_field($_POST['session_id'] ?? '');
        
        if (!$form_id || !$session_id) {
            wp_send_json_error(__('Datos del formulario incompletos', 'smart-forms-quiz'));
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
                } else {
                    error_log('SFQ Error: Failed to save response for question ' . $question_id . ': ' . $wpdb->last_error);
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
            
            // Log de éxito para debugging
            error_log("SFQ Success: Form {$form_id} submitted successfully. Submission ID: {$submission_id}, Responses saved: {$responses_saved}");
            
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
        }
        
        $form_id = intval($_POST['form_id']);
        $event_type = sanitize_text_field($_POST['event_type']);
        $event_data = json_decode(stripslashes($_POST['event_data'] ?? '{}'), true);
        $session_id = sanitize_text_field($_POST['session_id']);
        
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
        }
        
        $form_id = intval($_POST['form_id']);
        $current_question_id = intval($_POST['current_question_id']);
        $answer = sanitize_text_field($_POST['answer']);
        $variables = json_decode(stripslashes($_POST['variables'] ?? '{}'), true);
        
        // Obtener condiciones de la pregunta actual
        $conditions = $this->get_question_conditions($current_question_id);
        
        $next_question_id = null;
        $redirect_url = null;
        $update_variables = array();
        
        foreach ($conditions as $condition) {
            if ($this->evaluate_condition($condition, $answer, $variables)) {
                // Aplicar acción de la condición
                switch ($condition->action_type) {
                    case 'goto_question':
                        $next_question_id = intval($condition->action_value);
                        break;
                        
                    case 'redirect_url':
                        $redirect_url = esc_url_raw($condition->action_value);
                        break;
                        
                    case 'add_variable':
                        $var_name = $condition->action_value;
                        $var_amount = intval($condition->variable_amount);
                        $update_variables[$var_name] = ($variables[$var_name] ?? 0) + $var_amount;
                        break;
                }
                
                // Si hay operación de variable
                if ($condition->variable_operation === 'add') {
                    $var_name = $condition->action_value;
                    $variables[$var_name] = ($variables[$var_name] ?? 0) + intval($condition->variable_amount);
                }
            }
        }
        
        // Si no hay condición específica, obtener siguiente pregunta en orden
        if (!$next_question_id && !$redirect_url) {
            $next_question_id = $this->get_next_question_in_order($form_id, $current_question_id);
        }
        
        wp_send_json_success(array(
            'next_question_id' => $next_question_id,
            'redirect_url' => $redirect_url,
            'variables' => array_merge($variables, $update_variables)
        ));
    }
    
    /**
     * Evaluar condición
     */
    private function evaluate_condition($condition, $answer, $variables) {
        switch ($condition->condition_type) {
            case 'answer_equals':
                return $answer === $condition->condition_value;
                
            case 'answer_contains':
                return strpos($answer, $condition->condition_value) !== false;
                
            case 'variable_greater':
                $var_name = $condition->condition_value;
                $threshold = intval($condition->variable_amount);
                return ($variables[$var_name] ?? 0) > $threshold;
                
            case 'variable_less':
                $var_name = $condition->condition_value;
                $threshold = intval($condition->variable_amount);
                return ($variables[$var_name] ?? 0) < $threshold;
                
            case 'variable_equals':
                $var_name = $condition->condition_value;
                $value = intval($condition->variable_amount);
                return ($variables[$var_name] ?? 0) === $value;
                
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
            
            // Obtener formulario de la base de datos
            $form = $this->database->get_form($form_id);
            
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
        
        // Procesar opciones
        $question->options = $this->validate_and_structure_options($question->options ?? []);
        
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
     * Rate limiting simple
     */
    private function check_rate_limit($action, $max_requests, $time_window) {
        // Usar método centralizado de la clase Utils
        return SFQ_Utils::check_rate_limit($action, $max_requests, $time_window);
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
        
        // Validar opciones para tipos que las requieren
        $types_with_options = array('single_choice', 'multiple_choice', 'image_choice');
        if (in_array($question['question_type'], $types_with_options)) {
            if (empty($question['options']) || !is_array($question['options'])) {
                $errors['options'] = sprintf(__('La pregunta %d requiere opciones', 'smart-forms-quiz'), $index + 1);
            } elseif (count($question['options']) < 2) {
                $errors['options'] = sprintf(__('La pregunta %d requiere al menos 2 opciones', 'smart-forms-quiz'), $index + 1);
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
        
        // Obtener total de vistas (eventos 'view')
        $total_views = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(DISTINCT session_id) 
            FROM {$wpdb->prefix}sfq_analytics 
            WHERE form_id = %d AND event_type = 'view'",
            $form_id
        ));
        
        // Obtener total de completados
        $total_completed = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) 
            FROM {$wpdb->prefix}sfq_submissions 
            WHERE form_id = %d AND status = 'completed'",
            $form_id
        ));
        
        // Calcular tasa de conversión
        $conversion_rate = 0;
        if ($total_views > 0) {
            $conversion_rate = round(($total_completed / $total_views) * 100, 1);
        }
        
        wp_send_json_success(array(
            'views' => intval($total_views),
            'completed' => intval($total_completed),
            'rate' => $conversion_rate
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
     * Formatear tiempo en formato legible
     */
    private function format_time($seconds) {
        // Usar método centralizado de la clase Utils
        return SFQ_Utils::format_time($seconds);
    }
}
