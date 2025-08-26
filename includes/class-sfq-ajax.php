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
        }
        
        global $wpdb;
        
        $form_id = intval($_POST['form_id']);
        $session_id = sanitize_text_field($_POST['session_id']);
        $responses = json_decode(stripslashes($_POST['responses']), true);
        $variables = json_decode(stripslashes($_POST['variables']), true);
        
        // Crear registro de envío
        $submission_data = array(
            'form_id' => $form_id,
            'user_id' => get_current_user_id() ?: null,
            'user_ip' => $this->get_user_ip(),
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
            'total_score' => $this->calculate_total_score($variables),
            'variables' => json_encode($variables),
            'status' => 'completed',
            'completed_at' => current_time('mysql'),
            'time_spent' => intval($_POST['time_spent'] ?? 0)
        );
        
        $wpdb->insert(
            $wpdb->prefix . 'sfq_submissions',
            $submission_data,
            array('%d', '%d', '%s', '%s', '%d', '%s', '%s', '%s', '%d')
        );
        
        $submission_id = $wpdb->insert_id;
        
        // Guardar respuestas individuales
        foreach ($responses as $question_id => $answer) {
            $response_data = array(
                'submission_id' => $submission_id,
                'question_id' => intval($question_id),
                'answer' => is_array($answer) ? json_encode($answer) : sanitize_textarea_field($answer),
                'score' => $this->calculate_answer_score($question_id, $answer)
            );
            
            $wpdb->insert(
                $wpdb->prefix . 'sfq_responses',
                $response_data,
                array('%d', '%d', '%s', '%d')
            );
        }
        
        // Registrar evento de completado
        $this->register_analytics_event($form_id, 'completed', array(
            'submission_id' => $submission_id,
            'session_id' => $session_id
        ));
        
        // Determinar redirección basada en condiciones
        $redirect_url = $this->determine_redirect($form_id, $variables, $responses);
        
        // Enviar notificaciones si está configurado
        $this->send_notifications($form_id, $submission_id);
        
        wp_send_json_success(array(
            'submission_id' => $submission_id,
            'redirect_url' => $redirect_url,
            'message' => __('Formulario enviado correctamente', 'smart-forms-quiz')
        ));
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
        
        $this->register_analytics_event($form_id, $event_type, $event_data, $session_id);
        
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
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            $ip = $_SERVER['HTTP_CLIENT_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
        }
        
        return sanitize_text_field($ip);
    }
    
    /**
     * Guardar formulario (Admin AJAX)
     */
    public function save_form() {
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
        
        // Obtener y decodificar datos del formulario
        $form_data = json_decode(stripslashes($_POST['form_data']), true);
        
        if (!$form_data) {
            wp_send_json_error(__('Datos del formulario inválidos', 'smart-forms-quiz'));
            return;
        }
        
        // Validar título requerido
        if (empty($form_data['title'])) {
            wp_send_json_error(array(
                'message' => __('El título del formulario es requerido', 'smart-forms-quiz')
            ));
            return;
        }
        
        try {
            // Guardar formulario usando la función de la base de datos
            $form_id = $this->database->save_form($form_data);
            
            if ($form_id) {
                wp_send_json_success(array(
                    'form_id' => $form_id,
                    'message' => __('Formulario guardado correctamente', 'smart-forms-quiz')
                ));
            } else {
                wp_send_json_error(array(
                    'message' => __('Error al guardar el formulario', 'smart-forms-quiz')
                ));
            }
        } catch (Exception $e) {
            wp_send_json_error(array(
                'message' => __('Error: ', 'smart-forms-quiz') . $e->getMessage()
            ));
        }
    }
    
    /**
     * Obtener datos del formulario (Admin AJAX)
     */
    public function get_form_data() {
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
        
        try {
            // Obtener formulario de la base de datos
            $form = $this->database->get_form($form_id);
            
            if (!$form) {
                wp_send_json_error(__('Formulario no encontrado', 'smart-forms-quiz'));
                return;
            }
            
            // Validar y estructurar datos del formulario
            $form = $this->validate_and_structure_form_data($form);
            
            // Log detallado para debugging
            error_log('SFQ Form Data - Form ID: ' . $form_id);
            error_log('SFQ Form Data - Questions count: ' . count($form->questions));
            
            if (!empty($form->questions)) {
                foreach ($form->questions as $index => $question) {
                    error_log("SFQ Question {$index}: " . json_encode([
                        'id' => $question->id ?? 'missing',
                        'text' => substr($question->question_text ?? '', 0, 50),
                        'type' => $question->question_type ?? 'missing',
                        'options_count' => count($question->options ?? []),
                        'conditions_count' => count($question->conditions ?? [])
                    ]));
                }
            }
            
            wp_send_json_success($form);
            
        } catch (Exception $e) {
            error_log('SFQ Error in get_form_data: ' . $e->getMessage());
            wp_send_json_error([
                'message' => __('Error al cargar los datos del formulario', 'smart-forms-quiz'),
                'debug' => WP_DEBUG ? $e->getMessage() : ''
            ]);
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
                $placeholders = implode(',', array_fill(0, count($questions), '%d'));
                $wpdb->query($wpdb->prepare(
                    "DELETE FROM {$wpdb->prefix}sfq_conditions WHERE question_id IN ($placeholders)",
                    $questions
                ));
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
}
