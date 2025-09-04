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
        
        // ✅ NUEVO: AJAX handler para modo de carga segura
        add_action('wp_ajax_sfq_get_secure_question', array($this, 'get_secure_question'));
        add_action('wp_ajax_nopriv_sfq_get_secure_question', array($this, 'get_secure_question'));
        
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
        add_action('wp_ajax_sfq_check_form_completion', array($this, 'check_form_completion'));
        add_action('wp_ajax_nopriv_sfq_check_form_completion', array($this, 'check_form_completion'));
        add_action('wp_ajax_sfq_cleanup_partial_responses', array($this, 'cleanup_partial_responses'));
        add_action('wp_ajax_sfq_cleanup_partial_for_session', array($this, 'cleanup_partial_for_session'));
        add_action('wp_ajax_nopriv_sfq_cleanup_partial_for_session', array($this, 'cleanup_partial_for_session'));
        
        // ✅ NUEVO: AJAX handler para subida de archivos
        add_action('wp_ajax_sfq_upload_file', array($this, 'upload_file'));
        add_action('wp_ajax_nopriv_sfq_upload_file', array($this, 'upload_file'));
        
        // ✅ NUEVO: AJAX handler para refresh de nonce (compatibilidad con cache)
        add_action('wp_ajax_sfq_refresh_nonce', array($this, 'refresh_nonce'));
        add_action('wp_ajax_nopriv_sfq_refresh_nonce', array($this, 'refresh_nonce'));
        
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
        
        // ✅ CORREGIDO: Decodificar datos JSON sin stripslashes para preservar acentos
        $responses = json_decode($_POST['responses'] ?? '{}', true);
        $variables = json_decode($_POST['variables'] ?? '{}', true);
        
        // ✅ FALLBACK: Si falla, intentar con stripslashes para compatibilidad con datos legacy
        if (json_last_error() !== JSON_ERROR_NONE && isset($_POST['responses'])) {
            $responses = json_decode(stripslashes($_POST['responses']), true);
        }
        if (json_last_error() !== JSON_ERROR_NONE && isset($_POST['variables'])) {
            $variables = json_decode(stripslashes($_POST['variables']), true);
        }
        
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
                $processed_answer = $this->process_answer_for_storage($answer, $submission_id, $question_id);
                
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
            
            // ✅ NUEVO: Limpiar respuesta parcial si existe (ya que el formulario está completado)
            $wpdb->delete(
                $wpdb->prefix . 'sfq_partial_responses',
                array(
                    'form_id' => $form_id,
                    'session_id' => $session_id
                ),
                array('%d', '%s')
            );
            
            // Confirmar transacción
            $wpdb->query('COMMIT');
            
            // Determinar redirección basada en condiciones
            $redirect_url = $this->determine_redirect($form_id, $variables, $responses);
            
            // Enviar notificaciones si está configurado (en background)
            wp_schedule_single_event(time(), 'sfq_send_notifications', array($form_id, $submission_id));
            
            // Disparar hook para limpiar cache después del envío
            do_action('sfq_form_submitted', $form_id, $submission_id);
            
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
        // ✅ CORREGIDO: Decodificar JSON sin stripslashes para preservar acentos
        $event_data = json_decode($_POST['event_data'] ?? '{}', true);
        // ✅ FALLBACK: Si falla, intentar con stripslashes para compatibilidad
        if (json_last_error() !== JSON_ERROR_NONE && isset($_POST['event_data'])) {
            $event_data = json_decode(stripslashes($_POST['event_data']), true);
        }
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
        // ✅ CORREGIDO: Decodificar JSON sin stripslashes para preservar acentos
        $variables = json_decode($_POST['variables'] ?? '{}', true);
        // ✅ FALLBACK: Si falla, intentar con stripslashes para compatibilidad
        if (json_last_error() !== JSON_ERROR_NONE && isset($_POST['variables'])) {
            $variables = json_decode(stripslashes($_POST['variables']), true);
        }
        
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
        $has_conditional_navigation = false; // ✅ NUEVO: Flag para detectar navegación condicional real
        
        foreach ($conditions as $condition) {
            error_log('SFQ Debug: Evaluating condition: ' . json_encode($condition));
            
            if ($this->evaluate_condition($condition, $answer, $updated_variables)) {
                error_log('SFQ Debug: Condition matched! Executing action: ' . $condition->action_type);
                
                // ✅ CRÍTICO: Ejecutar acciones de variables correctamente
                switch ($condition->action_type) {
                    case 'goto_question':
                        $next_question_id = intval($condition->action_value);
                        $has_conditional_navigation = true; // ✅ NUEVO: Marcar como navegación condicional
                        error_log('SFQ Debug: Setting next question to: ' . $next_question_id);
                        break;
                        
                    case 'skip_to_end':
                        $next_question_id = null; // Indica fin del formulario
                        $has_conditional_navigation = true; // ✅ NUEVO: Marcar como navegación condicional
                        error_log('SFQ Debug: Skipping to end');
                        break;
                        
                    case 'redirect_url':
                        $redirect_url = esc_url_raw($condition->action_value);
                        $has_conditional_navigation = true; // ✅ NUEVO: Marcar como navegación condicional
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
        
        // ✅ CORREGIDO: Solo devolver next_question_id si hay navegación condicional real
        // Si no hay condiciones que se cumplan, dejar que el frontend maneje la navegación secuencial
        if (!$has_conditional_navigation) {
            $next_question_id = null; // ✅ CRÍTICO: No devolver ID para navegación secuencial
            error_log('SFQ Debug: No conditional navigation triggered, letting frontend handle sequential navigation');
        }
        
        error_log('SFQ Debug: Final variables state: ' . json_encode($updated_variables));
        error_log('SFQ Debug: Has conditional navigation: ' . ($has_conditional_navigation ? 'true' : 'false'));
        
        wp_send_json_success(array(
            'next_question_id' => $next_question_id,
            'redirect_url' => $redirect_url,
            'variables' => $updated_variables,
            'has_conditional_navigation' => $has_conditional_navigation // ✅ NUEVO: Información adicional para debug
        ));
    }
    
    /**
     * ✅ CORREGIDO: Obtener pregunta específica para modo de carga segura
     */
    public function get_secure_question() {
        // Verificar nonce
        if (!check_ajax_referer('sfq_nonce', 'nonce', false)) {
            wp_send_json_error(__('Error de seguridad', 'smart-forms-quiz'));
            return;
        }
        
        // Rate limiting para carga de preguntas
        if (!$this->check_rate_limit('get_secure_question', 20, 60)) {
            wp_send_json_error(array(
                'message' => __('Demasiadas peticiones. Intenta de nuevo en un momento.', 'smart-forms-quiz'),
                'code' => 'RATE_LIMIT_EXCEEDED'
            ));
            return;
        }
        
        // ✅ CORREGIDO: Validar datos - aceptar question_id O question_index
        $form_id = intval($_POST['form_id'] ?? 0);
        $question_index = isset($_POST['question_index']) ? intval($_POST['question_index']) : null;
        $question_id = isset($_POST['question_id']) ? intval($_POST['question_id']) : null;
        $session_id = sanitize_text_field($_POST['session_id'] ?? '');
        
        if (!$form_id || !$session_id) {
            wp_send_json_error(__('Datos incompletos', 'smart-forms-quiz'));
            return;
        }
        
        // ✅ NUEVO: Validar que se proporcione al menos uno de los parámetros de búsqueda
        if ($question_index === null && $question_id === null) {
            wp_send_json_error(array(
                'message' => __('Debe proporcionar question_index o question_id', 'smart-forms-quiz'),
                'code' => 'MISSING_SEARCH_PARAM'
            ));
            return;
        }
        
        // Verificar que el formulario tenga habilitado el modo seguro
        $form = $this->database->get_form($form_id);
        if (!$form || empty($form->settings['secure_loading'])) {
            wp_send_json_error(array(
                'message' => __('El modo de carga segura no está habilitado para este formulario', 'smart-forms-quiz'),
                'code' => 'SECURE_MODE_DISABLED'
            ));
            return;
        }
        
        // Separar preguntas normales de pantallas finales
        $normal_questions = array();
        $final_screen_questions = array();
        $all_questions_by_id = array();
        
        if (!empty($form->questions)) {
            foreach ($form->questions as $question) {
                $all_questions_by_id[$question->id] = $question;
                
                $is_final_screen = (isset($question->pantallaFinal) && $question->pantallaFinal);
                if ($is_final_screen) {
                    $final_screen_questions[] = $question;
                } else {
                    $normal_questions[] = $question;
                }
            }
        }
        
        $settings = $form->settings ?: array();
        $target_question = null;
        $target_question_index = null;
        $is_final_screen = false;
        
        try {
            // ✅ NUEVO: Lógica de búsqueda mejorada
            if ($question_id !== null) {
                // Búsqueda por ID (navegación condicional)
                if (!isset($all_questions_by_id[$question_id])) {
                    wp_send_json_error(array(
                        'message' => __('Pregunta no encontrada', 'smart-forms-quiz'),
                        'code' => 'QUESTION_NOT_FOUND'
                    ));
                    return;
                }
                
                $target_question = $all_questions_by_id[$question_id];
                $is_final_screen = (isset($target_question->pantallaFinal) && $target_question->pantallaFinal);
                
                // Determinar índice si es pregunta normal
                if (!$is_final_screen) {
                    foreach ($normal_questions as $index => $normal_question) {
                        if ($normal_question->id == $question_id) {
                            $target_question_index = $index;
                            break;
                        }
                    }
                } else {
                    // Para pantallas finales, usar índice especial
                    $target_question_index = -1;
                }
                
            } else {
                // Búsqueda por índice (navegación secuencial)
                if ($question_index < 0) {
                    wp_send_json_error(array(
                        'message' => __('Índice de pregunta inválido', 'smart-forms-quiz'),
                        'code' => 'INVALID_QUESTION_INDEX'
                    ));
                    return;
                }
                
                // ✅ CORREGIDO: Manejar final de formulario correctamente
                if ($question_index >= count($normal_questions)) {
                    // No hay más preguntas normales - finalizar formulario
                    wp_send_json_success(array(
                        'html' => null,
                        'question_id' => null,
                        'question_index' => -1,
                        'is_last_question' => true,
                        'form_completed' => true,
                        'total_questions' => count($normal_questions),
                        'message' => __('Formulario completado - no hay más preguntas', 'smart-forms-quiz')
                    ));
                    return;
                }
                
                $target_question = $normal_questions[$question_index];
                $target_question_index = $question_index;
                $is_final_screen = false;
            }
            
            // ✅ NUEVO: Renderizar según el tipo de pregunta
            if ($is_final_screen) {
                // Renderizar pantalla final
                $question_html = $this->render_secure_final_screen($target_question, $final_screen_questions, $settings);
            } else {
                // Renderizar pregunta normal
                $question_html = $this->render_secure_question($target_question, $target_question_index, $normal_questions, $settings);
            }
            
            if (empty($question_html)) {
                wp_send_json_error(array(
                    'message' => __('No se pudo renderizar la pregunta', 'smart-forms-quiz'),
                    'code' => 'RENDER_ERROR'
                ));
                return;
            }
            
            wp_send_json_success(array(
                'html' => $question_html,
                'question_id' => $target_question->id,
                'question_index' => $target_question_index,
                'question_type' => $target_question->question_type,
                'is_final_screen' => $is_final_screen,
                'is_last_question' => (!$is_final_screen && $target_question_index === count($normal_questions) - 1),
                'total_questions' => count($normal_questions),
                'message' => __('Pregunta cargada correctamente', 'smart-forms-quiz')
            ));
            
        } catch (Exception $e) {
            error_log('SFQ Error in get_secure_question: ' . $e->getMessage());
            
            wp_send_json_error(array(
                'message' => __('Error al cargar la pregunta', 'smart-forms-quiz'),
                'code' => 'INTERNAL_ERROR',
                'debug' => WP_DEBUG ? $e->getMessage() : null
            ));
        }
    }
    
    /**
     * ✅ NUEVO: Renderizar pregunta específica para modo seguro
     */
    private function render_secure_question($question, $question_index, $normal_questions, $settings) {
        $question_settings = $question->settings ?? array();
        $show_next_button = isset($question_settings['show_next_button']) ? $question_settings['show_next_button'] : true;
        $next_button_text = isset($question_settings['next_button_text']) ? $question_settings['next_button_text'] : '';
        
        ob_start();
        ?>
        <div class="sfq-screen sfq-question-screen" 
             data-question-id="<?php echo $question->id; ?>"
             data-question-index="<?php echo $question_index; ?>"
             data-question-type="<?php echo esc_attr($question->question_type); ?>"
             data-show-next-button="<?php echo $show_next_button ? 'true' : 'false'; ?>"
             data-next-button-text="<?php echo esc_attr($next_button_text); ?>"
             data-pantalla-final="false">
            
            <div class="sfq-question-content">
                <!-- Número de pregunta -->
                <?php if (!empty($settings['show_question_numbers'])) : ?>
                    <div class="sfq-question-number">
                        <?php echo sprintf(__('Pregunta %d de %d', 'smart-forms-quiz'), $question_index + 1, count($normal_questions)); ?>
                    </div>
                <?php endif; ?>
                
                <!-- Texto de la pregunta -->
                <?php 
                // ✅ SOLUCIÓN: Verificar si se debe ocultar el título
                $hide_title = false;
                if (isset($question->settings) && is_array($question->settings)) {
                    $hide_title = !empty($question->settings['hide_title']);
                } elseif (isset($question->settings) && is_object($question->settings)) {
                    $hide_title = !empty($question->settings->hide_title);
                }
                
                if (!$hide_title) : ?>
                    <h3 class="sfq-question-text">
                        <?php echo esc_html($question->question_text); ?>
                        <?php if ($question->required) : ?>
                            <span class="sfq-required">*</span>
                        <?php endif; ?>
                    </h3>
                <?php endif; ?>
                
                <!-- Renderizar según el tipo de pregunta -->
                <div class="sfq-answer-container">
                    <?php $this->render_question_type_secure($question); ?>
                </div>
                
                <!-- Botones de navegación -->
                <div class="sfq-navigation">
                    <?php if ($question_index > 0 && !empty($settings['allow_back'])) : ?>
                        <button class="sfq-button sfq-button-secondary sfq-prev-button">
                            <?php _e('Anterior', 'smart-forms-quiz'); ?>
                        </button>
                    <?php endif; ?>
                    
                    <?php 
                    // Determinar si mostrar el botón "Siguiente"
                    $should_show_next = true;
                    
                    if (isset($question_settings['show_next_button'])) {
                        $should_show_next = $question_settings['show_next_button'];
                    } else {
                        // Lógica por defecto
                        $auto_advance_types = array('single_choice', 'rating', 'image_choice');
                        $should_show_next = !($settings['auto_advance'] && in_array($question->question_type, $auto_advance_types));
                    }
                    
                    if ($should_show_next) : 
                        $button_text = !empty($next_button_text) ? $next_button_text : 
                            (($question_index === count($normal_questions) - 1) ? __('Finalizar', 'smart-forms-quiz') : __('Siguiente', 'smart-forms-quiz'));
                    ?>
                        <button class="sfq-button sfq-button-primary sfq-next-button">
                            <?php echo esc_html($button_text); ?>
                        </button>
                    <?php endif; ?>
                </div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
    
    /**
     * ✅ NUEVO: Renderizar pantalla final para modo seguro
     */
    private function render_secure_final_screen($final_screen, $all_final_screens, $settings) {
        $screen_settings = $final_screen->settings ?? array();
        
        ob_start();
        ?>
        <div class="sfq-screen sfq-final-screen" 
             data-question-id="<?php echo $final_screen->id; ?>"
             data-question-index="-1"
             data-question-type="<?php echo esc_attr($final_screen->question_type); ?>"
             data-pantalla-final="true">
            
            <div class="sfq-final-screen-content">
                <!-- Título de la pantalla final -->
                <?php if (!empty($final_screen->question_text) && empty($screen_settings['hide_title'])) : ?>
                    <h2 class="sfq-final-screen-title">
                        <?php echo esc_html($final_screen->question_text); ?>
                    </h2>
                <?php endif; ?>
                
                <!-- Contenido según el tipo de pantalla final -->
                <div class="sfq-final-screen-body">
                    <?php $this->render_final_screen_type_secure($final_screen); ?>
                </div>
                
                <!-- Botones de acción si los hay -->
                <?php if (isset($screen_settings['show_buttons']) && $screen_settings['show_buttons']) : ?>
                    <div class="sfq-final-screen-actions">
                        <?php if (!empty($screen_settings['button_text'])) : ?>
                            <button class="sfq-button sfq-button-primary sfq-final-action-button"
                                    data-action="<?php echo esc_attr($screen_settings['button_action'] ?? 'close'); ?>">
                                <?php echo esc_html($screen_settings['button_text']); ?>
                            </button>
                        <?php endif; ?>
                        
                        <?php if (!empty($screen_settings['secondary_button_text'])) : ?>
                            <button class="sfq-button sfq-button-secondary sfq-final-secondary-button"
                                    data-action="<?php echo esc_attr($screen_settings['secondary_button_action'] ?? 'restart'); ?>">
                                <?php echo esc_html($screen_settings['secondary_button_text']); ?>
                            </button>
                        <?php endif; ?>
                    </div>
                <?php endif; ?>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
    
    /**
     * ✅ CORREGIDO: Renderizar tipo de pantalla final para modo seguro usando lógica del frontend
     */
    private function render_final_screen_type_secure($final_screen) {
        // ✅ CRÍTICO: Las pantallas finales son preguntas freestyle, usar la lógica del frontend existente
        if ($final_screen->question_type === 'freestyle') {
            // Crear instancia temporal del frontend para acceder a sus métodos de renderizado
            $frontend = new SFQ_Frontend();
            
            // Usar reflexión para acceder al método privado render_question_type
            $reflection = new ReflectionClass($frontend);
            $method = $reflection->getMethod('render_question_type');
            $method->setAccessible(true);
            
            // Ejecutar el método de renderizado del frontend (que ya maneja freestyle correctamente)
            $method->invoke($frontend, $final_screen);
        } else {
            // Para otros tipos de pantallas finales (si los hay), mostrar contenido básico
            if (!empty($final_screen->description)) {
                echo '<div class="sfq-final-screen-description">';
                echo wp_kses_post($final_screen->description);
                echo '</div>';
            }
            
            // Si hay opciones, mostrarlas como información adicional
            if (!empty($final_screen->options)) {
                echo '<div class="sfq-final-screen-options">';
                foreach ($final_screen->options as $option) {
                    if (is_array($option)) {
                        echo '<div class="sfq-final-option">' . esc_html($option['text'] ?? $option['value'] ?? '') . '</div>';
                    } else {
                        echo '<div class="sfq-final-option">' . esc_html($option) . '</div>';
                    }
                }
                echo '</div>';
            }
        }
    }
    
    /**
     * ✅ NUEVO: Renderizar elemento freestyle para modo seguro (versión simplificada)
     */
    private function render_freestyle_element_secure($element) {
        $element_type = $element['type'] ?? 'text';
        $element_settings = $element['settings'] ?? array();
        $element_value = $element['value'] ?? '';
        
        switch ($element_type) {
            case 'text':
                echo '<div class="sfq-freestyle-text">';
                echo wp_kses_post($element_value);
                echo '</div>';
                break;
                
            case 'image':
                if (!empty($element_value)) {
                    $alt_text = $element_settings['alt_text'] ?? '';
                    echo '<div class="sfq-freestyle-image">';
                    echo '<img src="' . esc_url($element_value) . '" alt="' . esc_attr($alt_text) . '" />';
                    echo '</div>';
                }
                break;
                
            case 'video':
                if (!empty($element_value)) {
                    echo '<div class="sfq-freestyle-video">';
                    // Detectar si es URL de YouTube/Vimeo o archivo directo
                    if (strpos($element_value, 'youtube.com') !== false || strpos($element_value, 'youtu.be') !== false) {
                        // YouTube embed
                        $video_id = $this->extract_youtube_id($element_value);
                        if ($video_id) {
                            echo '<iframe src="https://www.youtube.com/embed/' . esc_attr($video_id) . '" frameborder="0" allowfullscreen></iframe>';
                        }
                    } elseif (strpos($element_value, 'vimeo.com') !== false) {
                        // Vimeo embed
                        $video_id = $this->extract_vimeo_id($element_value);
                        if ($video_id) {
                            echo '<iframe src="https://player.vimeo.com/video/' . esc_attr($video_id) . '" frameborder="0" allowfullscreen></iframe>';
                        }
                    } else {
                        // Video directo
                        echo '<video controls>';
                        echo '<source src="' . esc_url($element_value) . '" type="video/mp4">';
                        echo __('Tu navegador no soporta el elemento video.', 'smart-forms-quiz');
                        echo '</video>';
                    }
                    echo '</div>';
                }
                break;
                
            case 'button':
                if (!empty($element_value)) {
                    $button_action = $element_settings['action'] ?? 'close';
                    $button_url = $element_settings['url'] ?? '';
                    
                    echo '<div class="sfq-freestyle-button">';
                    if ($button_action === 'url' && !empty($button_url)) {
                        echo '<a href="' . esc_url($button_url) . '" class="sfq-button sfq-button-primary" target="_blank">';
                        echo esc_html($element_value);
                        echo '</a>';
                    } else {
                        echo '<button class="sfq-button sfq-button-primary" data-action="' . esc_attr($button_action) . '">';
                        echo esc_html($element_value);
                        echo '</button>';
                    }
                    echo '</div>';
                }
                break;
                
            default:
                // Para otros tipos, mostrar como texto simple
                if (!empty($element_value)) {
                    echo '<div class="sfq-freestyle-element sfq-freestyle-' . esc_attr($element_type) . '">';
                    echo esc_html($element_value);
                    echo '</div>';
                }
                break;
        }
    }
    
    /**
     * ✅ NUEVO: Extraer ID de video de YouTube
     */
    private function extract_youtube_id($url) {
        preg_match('/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/', $url, $matches);
        return isset($matches[1]) ? $matches[1] : false;
    }
    
    /**
     * ✅ NUEVO: Extraer ID de video de Vimeo
     */
    private function extract_vimeo_id($url) {
        preg_match('/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)(?:$|\/|\?)/', $url, $matches);
        return isset($matches[3]) ? $matches[3] : false;
    }
    
    /**
     * ✅ NUEVO: Renderizar tipo de pregunta para modo seguro (reutiliza lógica del frontend)
     */
    private function render_question_type_secure($question) {
        // Crear instancia temporal del frontend para acceder a sus métodos de renderizado
        $frontend = new SFQ_Frontend();
        
        // Usar reflexión para acceder al método privado render_question_type
        $reflection = new ReflectionClass($frontend);
        $method = $reflection->getMethod('render_question_type');
        $method->setAccessible(true);
        
        // Ejecutar el método de renderizado
        $method->invoke($frontend, $question);
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
        if (!$this->check_rate_limit('save_form', 50, 60)) {
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
                
                // Disparar hook para limpiar cache después de actualizar formulario
                do_action('sfq_form_updated', $form_id);
                
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
        error_log('SFQ: === GET_FORM_DATA AJAX CALLED ===');
        error_log('SFQ: POST data: ' . json_encode($_POST));
        
        // Early validation
        if (!$this->validate_ajax_request('manage_smart_forms')) {
            error_log('SFQ: AJAX validation failed in get_form_data');
            return;
        }
        
        $form_id = intval($_POST['form_id'] ?? 0);
        error_log('SFQ: Form ID requested: ' . $form_id);
        
        if (!$form_id || $form_id < 1) {
            error_log('SFQ: Invalid form ID: ' . $form_id);
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
                error_log('SFQ: Returning cached form data for form ' . $form_id);
                wp_send_json_success($cached_form);
                return;
            }
            
            error_log('SFQ: No cache found, loading fresh form data for form ' . $form_id);
            
        // Obtener formulario de la base de datos (usar versión fresh para admin)
        $form = $this->database->get_form_fresh($form_id);
            
            if (!$form) {
                error_log('SFQ: Form not found in database: ' . $form_id);
                wp_send_json_error(array(
                    'message' => __('Formulario no encontrado', 'smart-forms-quiz'),
                    'code' => 'FORM_NOT_FOUND'
                ));
                return;
            }
            
            error_log('SFQ: Form loaded from database, title: ' . ($form->title ?? 'NO TITLE'));
            error_log('SFQ: Form questions count: ' . (is_array($form->questions) ? count($form->questions) : 'NOT ARRAY'));
            
            // ✅ CRÍTICO: Log específico para preguntas freestyle antes de validar
            if (is_array($form->questions)) {
                $freestyle_questions = array_filter($form->questions, function($q) {
                    return isset($q->question_type) && $q->question_type === 'freestyle';
                });
                
                error_log('SFQ: Freestyle questions found: ' . count($freestyle_questions));
                
                foreach ($freestyle_questions as $index => $fq) {
                    error_log('SFQ: Freestyle question #' . ($index + 1) . ':');
                    error_log('SFQ: - ID: ' . ($fq->id ?? 'NO ID'));
                    error_log('SFQ: - Text: ' . ($fq->question_text ?? 'NO TEXT'));
                    error_log('SFQ: - Elements count: ' . (isset($fq->freestyle_elements) ? count($fq->freestyle_elements) : 'NO ELEMENTS'));
                    
                    if (isset($fq->freestyle_elements) && is_array($fq->freestyle_elements)) {
                        $styled_text_elements = array_filter($fq->freestyle_elements, function($el) {
                            return isset($el['type']) && $el['type'] === 'styled_text';
                        });
                        
                        error_log('SFQ: - styled_text elements: ' . count($styled_text_elements));
                        
                        foreach ($styled_text_elements as $st_index => $st_el) {
                            error_log('SFQ: -- styled_text #' . ($st_index + 1) . ':');
                            error_log('SFQ: --- ID: ' . ($st_el['id'] ?? 'NO ID'));
                            error_log('SFQ: --- Label: ' . ($st_el['label'] ?? 'NO LABEL'));
                            error_log('SFQ: --- Settings: ' . json_encode($st_el['settings'] ?? []));
                        }
                    }
                }
            }
            
            // Validar y estructurar datos del formulario
            $form = $this->validate_and_structure_form_data($form);
            
            error_log('SFQ: Form data validated and structured');
            
            // ✅ CRÍTICO: Log específico después de validar
            if (is_array($form->questions)) {
                $freestyle_questions_after = array_filter($form->questions, function($q) {
                    return isset($q->question_type) && $q->question_type === 'freestyle';
                });
                
                error_log('SFQ: Freestyle questions after validation: ' . count($freestyle_questions_after));
                
                foreach ($freestyle_questions_after as $index => $fq) {
                    if (isset($fq->freestyle_elements) && is_array($fq->freestyle_elements)) {
                        $styled_text_elements_after = array_filter($fq->freestyle_elements, function($el) {
                            return isset($el['type']) && $el['type'] === 'styled_text';
                        });
                        
                        error_log('SFQ: - styled_text elements after validation: ' . count($styled_text_elements_after));
                    }
                }
            }
            
            // Cache the result for 5 minutes
            wp_cache_set($cache_key, $form, 'sfq_forms', 300);
            
            error_log('SFQ: Sending successful response with form data');
            wp_send_json_success($form);
            
        } catch (Exception $e) {
            error_log('SFQ Error in get_form_data: ' . $e->getMessage());
            error_log('SFQ Error stack trace: ' . $e->getTraceAsString());
            wp_send_json_error(array(
                'message' => __('Error al cargar los datos del formulario', 'smart-forms-quiz'),
                'code' => 'INTERNAL_ERROR'
            ));
        }
        
        error_log('SFQ: === END GET_FORM_DATA AJAX ===');
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
     * ✅ CORREGIDO: Preservar datos de imagen para preguntas image_choice
     */
    private function validate_and_structure_options($options) {
        if (!is_array($options)) {
            return [];
        }
        
        $structured_options = [];
        
        foreach ($options as $option) {
            if (is_string($option)) {
                // Opción simple como string
                $structured_options[] = [
                    'text' => $option,
                    'value' => $option,
                    'image' => '',
                    'image_id' => '',
                    'image_alt' => ''
                ];
            } elseif (is_array($option) || is_object($option)) {
                $option = (array) $option;
                
                // ✅ CRÍTICO: Preservar TODOS los datos de imagen
                $structured_option = [
                    'text' => $option['text'] ?? $option['value'] ?? '',
                    'value' => $option['value'] ?? $option['text'] ?? '',
                    'image' => $option['image'] ?? '',
                    'image_id' => $option['image_id'] ?? '',
                    'image_alt' => $option['image_alt'] ?? ''
                ];
                
                $structured_options[] = $structured_option;
            }
        }
        
        // Filtrar opciones vacías (pero mantener las que tienen imagen aunque no tengan texto)
        $structured_options = array_filter($structured_options, function($option) {
            return !empty(trim($option['text'])) || !empty(trim($option['image']));
        });
        
        return array_values($structured_options); // Reindexar array
    }
    
    /**
     * Validar y estructurar elementos freestyle
     */
    private function validate_and_structure_freestyle_elements($elements) {
        error_log('SFQ: === VALIDATE_AND_STRUCTURE_FREESTYLE_ELEMENTS ===');
        error_log('SFQ: Input elements: ' . json_encode($elements));
        error_log('SFQ: Elements is_array: ' . (is_array($elements) ? 'true' : 'false'));
        error_log('SFQ: Elements count: ' . (is_array($elements) ? count($elements) : 'N/A'));
        
        if (!is_array($elements)) {
            error_log('SFQ: Elements is not array, returning empty array');
            return [];
        }
        
        $structured_elements = [];
        
        foreach ($elements as $index => $element) {
            error_log('SFQ: --- Processing element ' . ($index + 1) . ' ---');
            error_log('SFQ: Element data: ' . json_encode($element));
            error_log('SFQ: Element type: ' . gettype($element));
            
            if (is_object($element)) {
                error_log('SFQ: Converting object to array');
                $element = (array) $element;
            }
            
            if (!is_array($element)) {
                error_log('SFQ: SKIPPING - Element is not array after conversion');
                continue;
            }
            
            // Validar que tenga las propiedades mínimas requeridas
            if (empty($element['type'])) {
                error_log('SFQ: SKIPPING - Element has no type');
                error_log('SFQ: Available keys: ' . json_encode(array_keys($element)));
                continue;
            }
            
            $element_type = $element['type'];
            error_log('SFQ: Element type found: ' . $element_type);
            
            // ✅ CRÍTICO: Añadir 'styled_text' a la lista de tipos válidos
            $valid_types = ['text', 'video', 'image', 'countdown', 'phone', 'email', 'file_upload', 'button', 'rating', 'dropdown', 'checkbox', 'legal_text', 'variable_display', 'styled_text'];
            
            if (!in_array($element_type, $valid_types)) {
                error_log('SFQ: SKIPPING - Invalid element type: ' . $element_type);
                error_log('SFQ: Valid types: ' . json_encode($valid_types));
                continue;
            }
            
            error_log('SFQ: Element type is valid: ' . $element_type);
            
            // ✅ CRÍTICO: Log específico para styled_text
            if ($element_type === 'styled_text') {
                error_log('SFQ: *** PROCESSING STYLED_TEXT IN AJAX VALIDATION ***');
                error_log('SFQ: styled_text ID: ' . ($element['id'] ?? 'NO ID'));
                error_log('SFQ: styled_text label: ' . ($element['label'] ?? 'NO LABEL'));
                error_log('SFQ: styled_text settings: ' . json_encode($element['settings'] ?? []));
                error_log('SFQ: styled_text settings type: ' . gettype($element['settings'] ?? null));
                error_log('SFQ: styled_text settings is_array: ' . (is_array($element['settings'] ?? null) ? 'true' : 'false'));
            }
            
            $structured_element = [
                'id' => $element['id'] ?? 'element_' . time() . '_' . $index,
                'type' => $element['type'],
                'label' => sanitize_text_field($element['label'] ?? ''),
                'order' => intval($element['order'] ?? $index),
                'settings' => is_array($element['settings'] ?? null) ? $element['settings'] : [],
                'value' => sanitize_text_field($element['value'] ?? '')
            ];
            
            error_log('SFQ: Structured element: ' . json_encode($structured_element));
            
            // ✅ CRÍTICO: Log específico después de estructurar styled_text
            if ($element_type === 'styled_text') {
                error_log('SFQ: *** STYLED_TEXT AFTER STRUCTURING ***');
                error_log('SFQ: Final settings: ' . json_encode($structured_element['settings']));
                error_log('SFQ: Settings preserved: ' . (count($structured_element['settings']) > 0 ? 'YES' : 'NO'));
            }
            
            $structured_elements[] = $structured_element;
        }
        
        error_log('SFQ: Total structured elements: ' . count($structured_elements));
        
        // Log específico de elementos styled_text en el resultado final
        $styled_text_count = 0;
        foreach ($structured_elements as $element) {
            if ($element['type'] === 'styled_text') {
                $styled_text_count++;
                error_log('SFQ: Final styled_text element #' . $styled_text_count . ': ' . json_encode($element));
            }
        }
        error_log('SFQ: Total styled_text elements in final result: ' . $styled_text_count);
        
        // Ordenar por orden
        usort($structured_elements, function($a, $b) {
            return $a['order'] - $b['order'];
        });
        
        error_log('SFQ: === END VALIDATE_AND_STRUCTURE_FREESTYLE_ELEMENTS ===');
        
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
                    $valid_element_types = array('text', 'video', 'image', 'countdown', 'phone', 'email', 'file_upload', 'button', 'rating', 'dropdown', 'checkbox', 'legal_text', 'variable_display', 'styled_text');
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
            
            // ✅ NUEVO: Eliminar respuestas parciales
            $partial_deleted = $wpdb->delete(
                $wpdb->prefix . 'sfq_partial_responses',
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
                'partial_deleted' => intval($partial_deleted),
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
        
        global $wpdb;
        
        // ✅ CRÍTICO: Verificar si ya existe un submission completado para esta sesión
        $completed_submission = $wpdb->get_row($wpdb->prepare(
            "SELECT id, completed_at FROM {$wpdb->prefix}sfq_submissions 
            WHERE form_id = %d AND session_id = %s AND status = 'completed'
            ORDER BY completed_at DESC
            LIMIT 1",
            $form_id,
            $session_id
        ));
        
        if ($completed_submission) {
            // ✅ NUEVO: Si ya hay un submission completado, no guardar parcial y limpiar existente
            $wpdb->delete(
                $wpdb->prefix . 'sfq_partial_responses',
                array(
                    'form_id' => $form_id,
                    'session_id' => $session_id
                ),
                array('%d', '%s')
            );
            
            wp_send_json_success(array(
                'message' => __('El formulario ya está completado, no se guarda respuesta parcial', 'smart-forms-quiz'),
                'completed_at' => $completed_submission->completed_at,
                'submission_id' => $completed_submission->id,
                'partial_cleaned' => true
            ));
            return;
        }
        
        // ✅ CORREGIDO: Decodificar datos JSON sin stripslashes para preservar acentos
        $responses = json_decode($_POST['responses'] ?? '{}', true);
        $variables = json_decode($_POST['variables'] ?? '{}', true);
        $current_question = intval($_POST['current_question'] ?? 0);
        
        // ✅ FALLBACK: Si falla, intentar con stripslashes para compatibilidad
        if (json_last_error() !== JSON_ERROR_NONE && isset($_POST['responses'])) {
            $responses = json_decode(stripslashes($_POST['responses']), true);
        }
        if (json_last_error() !== JSON_ERROR_NONE && isset($_POST['variables'])) {
            $variables = json_decode(stripslashes($_POST['variables']), true);
        }
        
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
            // ✅ CRÍTICO: Primero verificar si ya existe un submission completado para esta sesión
            error_log("SFQ Backend Debug: Checking completion for form_id={$form_id}, session_id={$session_id}");
            
            $completed_submission = $wpdb->get_row($wpdb->prepare(
                "SELECT id, completed_at, session_id FROM {$wpdb->prefix}sfq_submissions 
                WHERE form_id = %d AND session_id = %s AND status = 'completed'
                ORDER BY completed_at DESC
                LIMIT 1",
                $form_id,
                $session_id
            ));
            
            error_log("SFQ Backend Debug: Completed submission query result: " . ($completed_submission ? json_encode($completed_submission) : 'NULL'));
            
            if ($completed_submission) {
                error_log("SFQ Backend Debug: Found completed submission, cleaning partial responses");
                
                // ✅ NUEVO: Si ya hay un submission completado, limpiar respuesta parcial y retornar false
                $deleted_count = $wpdb->delete(
                    $wpdb->prefix . 'sfq_partial_responses',
                    array(
                        'form_id' => $form_id,
                        'session_id' => $session_id
                    ),
                    array('%d', '%s')
                );
                
                error_log("SFQ Backend Debug: Deleted {$deleted_count} partial responses");
                
                wp_send_json_success(array(
                    'has_partial' => false,
                    'message' => __('El formulario ya está completado', 'smart-forms-quiz'),
                    'completed_at' => $completed_submission->completed_at,
                    'submission_id' => $completed_submission->id
                ));
                return;
            }
            
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
     * ✅ NUEVO: Verificar directamente si un formulario está completado
     */
    public function check_form_completion() {
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
        
        global $wpdb;
        
        try {
            error_log("SFQ Backend Debug: Direct completion check for form_id={$form_id}, session_id={$session_id}");
            
            // Verificar si existe un submission completado para esta sesión
            $completed_submission = $wpdb->get_row($wpdb->prepare(
                "SELECT id, completed_at, status FROM {$wpdb->prefix}sfq_submissions 
                WHERE form_id = %d AND session_id = %s AND status = 'completed'
                ORDER BY completed_at DESC
                LIMIT 1",
                $form_id,
                $session_id
            ));
            
            error_log("SFQ Backend Debug: Direct completion check result: " . ($completed_submission ? json_encode($completed_submission) : 'NULL'));
            
            $is_completed = !empty($completed_submission);
            
            error_log("SFQ Backend Debug: is_completed = " . ($is_completed ? 'true' : 'false'));
            
            wp_send_json_success(array(
                'is_completed' => $is_completed,
                'submission_id' => $is_completed ? $completed_submission->id : null,
                'completed_at' => $is_completed ? $completed_submission->completed_at : null,
                'message' => $is_completed 
                    ? __('El formulario está completado', 'smart-forms-quiz')
                    : __('El formulario no está completado', 'smart-forms-quiz')
            ));
            
        } catch (Exception $e) {
            error_log('SFQ Error in check_form_completion: ' . $e->getMessage());
            
            wp_send_json_error(array(
                'message' => __('Error al verificar completado del formulario', 'smart-forms-quiz'),
                'debug' => WP_DEBUG ? $e->getMessage() : null
            ));
        }
    }
    
    /**
     * ✅ NUEVO: Limpiar respuestas parciales para una sesión específica
     */
    public function cleanup_partial_for_session() {
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
        
        global $wpdb;
        
        try {
            // Eliminar respuestas parciales para esta sesión específica
            $deleted_count = $wpdb->delete(
                $wpdb->prefix . 'sfq_partial_responses',
                array(
                    'form_id' => $form_id,
                    'session_id' => $session_id
                ),
                array('%d', '%s')
            );
            
            wp_send_json_success(array(
                'deleted_count' => intval($deleted_count),
                'form_id' => $form_id,
                'session_id' => $session_id,
                'message' => sprintf(__('Se eliminaron %d respuestas parciales para esta sesión', 'smart-forms-quiz'), $deleted_count)
            ));
            
        } catch (Exception $e) {
            error_log('SFQ Error in cleanup_partial_for_session: ' . $e->getMessage());
            
            wp_send_json_error(array(
                'message' => __('Error al limpiar respuestas parciales de la sesión', 'smart-forms-quiz'),
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
    
    /**
     * ✅ NUEVO: Subir archivos de forma segura
     */
    public function upload_file() {
        // Verificar nonce
        if (!check_ajax_referer('sfq_nonce', 'nonce', false)) {
            wp_send_json_error(array(
                'message' => __('Error de seguridad', 'smart-forms-quiz'),
                'code' => 'INVALID_NONCE'
            ));
            return;
        }
        
        // Rate limiting para subida de archivos (más restrictivo)
        if (!$this->check_rate_limit('upload_file', 5, 300)) {
            wp_send_json_error(array(
                'message' => __('Demasiadas subidas de archivos. Intenta de nuevo en unos minutos.', 'smart-forms-quiz'),
                'code' => 'RATE_LIMIT_EXCEEDED'
            ));
            return;
        }
        
        // Validar datos requeridos
        $form_id = intval($_POST['form_id'] ?? 0);
        $element_id = sanitize_text_field($_POST['element_id'] ?? '');
        
        if (!$form_id || !$element_id) {
            wp_send_json_error(array(
                'message' => __('Datos del formulario incompletos', 'smart-forms-quiz'),
                'code' => 'MISSING_DATA'
            ));
            return;
        }
        
        // Verificar que se subió un archivo
        if (empty($_FILES['file'])) {
            wp_send_json_error(array(
                'message' => __('No se seleccionó ningún archivo', 'smart-forms-quiz'),
                'code' => 'NO_FILE'
            ));
            return;
        }
        
        $file = $_FILES['file'];
        
        // Verificar errores de subida
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $error_messages = array(
                UPLOAD_ERR_INI_SIZE => __('El archivo es demasiado grande (límite del servidor)', 'smart-forms-quiz'),
                UPLOAD_ERR_FORM_SIZE => __('El archivo es demasiado grande', 'smart-forms-quiz'),
                UPLOAD_ERR_PARTIAL => __('El archivo se subió parcialmente', 'smart-forms-quiz'),
                UPLOAD_ERR_NO_FILE => __('No se seleccionó ningún archivo', 'smart-forms-quiz'),
                UPLOAD_ERR_NO_TMP_DIR => __('Error del servidor: directorio temporal no disponible', 'smart-forms-quiz'),
                UPLOAD_ERR_CANT_WRITE => __('Error del servidor: no se puede escribir el archivo', 'smart-forms-quiz'),
                UPLOAD_ERR_EXTENSION => __('Subida bloqueada por extensión de PHP', 'smart-forms-quiz')
            );
            
            wp_send_json_error(array(
                'message' => $error_messages[$file['error']] ?? __('Error desconocido al subir archivo', 'smart-forms-quiz'),
                'code' => 'UPLOAD_ERROR'
            ));
            return;
        }
        
        // Validaciones de seguridad del archivo
        $validation_result = $this->validate_uploaded_file($file);
        if (!$validation_result['valid']) {
            wp_send_json_error(array(
                'message' => $validation_result['message'],
                'code' => 'VALIDATION_FAILED'
            ));
            return;
        }
        
        try {
            // Usar la API de medios de WordPress para subir el archivo
            if (!function_exists('wp_handle_upload')) {
                require_once(ABSPATH . 'wp-admin/includes/file.php');
            }
            
            // Configurar opciones de subida
            $upload_overrides = array(
                'test_form' => false, // No verificar nonce aquí, ya lo hicimos arriba
                'unique_filename_callback' => array($this, 'generate_unique_filename')
            );
            
            // Subir archivo usando WordPress
            $uploaded_file = wp_handle_upload($file, $upload_overrides);
            
            if (isset($uploaded_file['error'])) {
                throw new Exception($uploaded_file['error']);
            }
            
            // Crear entrada en la librería de medios
            $attachment_data = array(
                'post_mime_type' => $uploaded_file['type'],
                'post_title' => sanitize_file_name(pathinfo($file['name'], PATHINFO_FILENAME)),
                'post_content' => '',
                'post_status' => 'inherit'
            );
            
            $attachment_id = wp_insert_attachment($attachment_data, $uploaded_file['file']);
            
            if (is_wp_error($attachment_id)) {
                throw new Exception($attachment_id->get_error_message());
            }
            
            // Generar metadatos del archivo
            if (!function_exists('wp_generate_attachment_metadata')) {
                require_once(ABSPATH . 'wp-admin/includes/image.php');
            }
            
            $attachment_metadata = wp_generate_attachment_metadata($attachment_id, $uploaded_file['file']);
            wp_update_attachment_metadata($attachment_id, $attachment_metadata);
            
            // Obtener información del archivo para la respuesta
            $file_info = array(
                'attachment_id' => $attachment_id,
                'url' => $uploaded_file['url'],
                'filename' => basename($uploaded_file['file']),
                'original_name' => $file['name'],
                'size' => $file['size'],
                'type' => $uploaded_file['type'],
                'form_id' => $form_id,
                'element_id' => $element_id
            );
            
            // Si es una imagen, añadir información adicional
            if (strpos($uploaded_file['type'], 'image/') === 0) {
                $image_info = getimagesize($uploaded_file['file']);
                if ($image_info) {
                    $file_info['width'] = $image_info[0];
                    $file_info['height'] = $image_info[1];
                    $file_info['is_image'] = true;
                    
                    // Obtener URL de thumbnail si existe
                    $thumbnail_url = wp_get_attachment_image_url($attachment_id, 'thumbnail');
                    if ($thumbnail_url) {
                        $file_info['thumbnail_url'] = $thumbnail_url;
                    }
                }
            }
            
            wp_send_json_success(array(
                'message' => __('Archivo subido correctamente', 'smart-forms-quiz'),
                'file' => $file_info
            ));
            
        } catch (Exception $e) {
            error_log('SFQ Error in upload_file: ' . $e->getMessage());
            
            wp_send_json_error(array(
                'message' => __('Error al subir el archivo: ', 'smart-forms-quiz') . $e->getMessage(),
                'code' => 'UPLOAD_FAILED'
            ));
        }
    }
    
    /**
     * Validar archivo subido
     */
    private function validate_uploaded_file($file) {
        // Tamaño máximo: 10MB
        $max_size = 10 * 1024 * 1024;
        if ($file['size'] > $max_size) {
            return array(
                'valid' => false,
                'message' => sprintf(__('El archivo es demasiado grande. Tamaño máximo: %s', 'smart-forms-quiz'), size_format($max_size))
            );
        }
        
        // Verificar tipo MIME
        $allowed_types = array(
            'image/jpeg',
            'image/jpg', 
            'image/png',
            'image/gif',
            'image/webp',
            'application/pdf',
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        
        $file_type = wp_check_filetype($file['name']);
        if (!in_array($file_type['type'], $allowed_types)) {
            return array(
                'valid' => false,
                'message' => __('Tipo de archivo no permitido. Solo se permiten imágenes, PDF y documentos de Office.', 'smart-forms-quiz')
            );
        }
        
        // Verificar que el tipo MIME coincida con la extensión
        if ($file_type['type'] !== $file['type']) {
            return array(
                'valid' => false,
                'message' => __('El tipo de archivo no coincide con su extensión', 'smart-forms-quiz')
            );
        }
        
        // Verificar contenido del archivo (anti-malware básico)
        $file_content = file_get_contents($file['tmp_name'], false, null, 0, 1024);
        if ($file_content === false) {
            return array(
                'valid' => false,
                'message' => __('No se pudo leer el archivo', 'smart-forms-quiz')
            );
        }
        
        // Buscar patrones sospechosos
        $suspicious_patterns = array(
            '/<\?php/i',
            '/<script/i',
            '/eval\s*\(/i',
            '/base64_decode/i',
            '/exec\s*\(/i',
            '/system\s*\(/i'
        );
        
        foreach ($suspicious_patterns as $pattern) {
            if (preg_match($pattern, $file_content)) {
                return array(
                    'valid' => false,
                    'message' => __('El archivo contiene contenido potencialmente peligroso', 'smart-forms-quiz')
                );
            }
        }
        
        return array('valid' => true);
    }
    
    /**
     * Generar nombre único para archivo
     */
    public function generate_unique_filename($dir, $name, $ext) {
        // Sanitizar nombre base
        $name = sanitize_file_name($name);
        
        // Añadir timestamp para unicidad
        $timestamp = time();
        $random = wp_generate_password(8, false);
        
        return "sfq_{$timestamp}_{$random}_{$name}{$ext}";
    }
    
    /**
     * ✅ CORREGIDO: Procesar respuesta para almacenamiento, incluyendo archivos subidos
     */
    private function process_answer_for_storage($answer, $submission_id, $question_id) {
        // Si la respuesta es un array, puede contener archivos subidos
        if (is_array($answer)) {
            $processed_answer = array();
            
            foreach ($answer as $element_id => $element_value) {
                // Verificar si el elemento contiene archivos subidos
                if (is_array($element_value) && $this->is_uploaded_files_array($element_value)) {
                    // Procesar archivos subidos y crear registro de relación
                    $processed_files = $this->process_uploaded_files($element_value, $submission_id, $question_id, $element_id);
                    
                    // ✅ CRÍTICO: Asegurar que los archivos procesados sean arrays simples para JSON
                    $clean_files = array();
                    foreach ($processed_files as $file) {
                        $clean_files[] = $this->sanitize_file_data_for_json($file);
                    }
                    $processed_answer[$element_id] = $clean_files;
                } else {
                    // Para otros tipos de respuestas, sanitizar normalmente
                    if (is_array($element_value)) {
                        // ✅ MEJORADO: Limpiar arrays anidados recursivamente
                        $processed_answer[$element_id] = $this->sanitize_array_for_json($element_value);
                    } else {
                        $processed_answer[$element_id] = sanitize_textarea_field($element_value);
                    }
                }
            }
            
            // ✅ CRÍTICO: Validar que el JSON se puede generar correctamente
            $json_result = json_encode($processed_answer, JSON_UNESCAPED_UNICODE);
            if ($json_result === false) {
                error_log('SFQ JSON Error: Failed to encode answer data - ' . json_last_error_msg());
                error_log('SFQ JSON Error: Data was - ' . print_r($processed_answer, true));
                
                // Fallback: guardar como string simple si el JSON falla
                return 'Error: Datos no serializables - ' . date('Y-m-d H:i:s');
            }
            
            return $json_result;
        } else {
            // Para respuestas simples, sanitizar normalmente
            return sanitize_textarea_field($answer);
        }
    }
    
    /**
     * ✅ NUEVO: Verificar si un array contiene archivos subidos
     */
    private function is_uploaded_files_array($array) {
        if (!is_array($array)) {
            return false;
        }
        
        // Verificar si el primer elemento tiene las propiedades típicas de un archivo subido
        $first_item = reset($array);
        if (is_array($first_item) || is_object($first_item)) {
            $first_item = (array) $first_item;
            return isset($first_item['attachment_id']) && 
                   isset($first_item['url']) && 
                   isset($first_item['filename']);
        }
        
        return false;
    }
    
    /**
     * ✅ NUEVO: Procesar archivos subidos y crear registros de relación
     */
    private function process_uploaded_files($files, $submission_id, $question_id, $element_id) {
        global $wpdb;
        
        $processed_files = array();
        
        foreach ($files as $file_data) {
            if (is_array($file_data) || is_object($file_data)) {
                $file_data = (array) $file_data;
                
                // Validar que tenga los datos mínimos requeridos
                if (!isset($file_data['attachment_id']) || !isset($file_data['url'])) {
                    continue;
                }
                
                $attachment_id = intval($file_data['attachment_id']);
                $file_url = esc_url_raw($file_data['url']);
                $filename = sanitize_file_name($file_data['filename'] ?? '');
                $original_name = sanitize_text_field($file_data['original_name'] ?? '');
                $file_size = intval($file_data['size'] ?? 0);
                $file_type = sanitize_text_field($file_data['type'] ?? '');
                
                // Crear registro en tabla de archivos subidos (si existe)
                $file_record_data = array(
                    'submission_id' => $submission_id,
                    'question_id' => $question_id,
                    'element_id' => sanitize_text_field($element_id),
                    'attachment_id' => $attachment_id,
                    'file_url' => $file_url,
                    'filename' => $filename,
                    'original_name' => $original_name,
                    'file_size' => $file_size,
                    'file_type' => $file_type,
                    'uploaded_at' => current_time('mysql')
                );
                
                // Verificar si existe la tabla de archivos subidos
                $table_name = $wpdb->prefix . 'sfq_uploaded_files';
                if ($this->table_exists($table_name)) {
                    $wpdb->insert(
                        $table_name,
                        $file_record_data,
                        array('%d', '%d', '%s', '%d', '%s', '%s', '%s', '%d', '%s', '%s')
                    );
                    
                    $file_record_id = $wpdb->insert_id;
                    $file_data['file_record_id'] = $file_record_id;
                } else {
                    // Si no existe la tabla, crear una entrada en los metadatos del attachment
                    update_post_meta($attachment_id, '_sfq_submission_id', $submission_id);
                    update_post_meta($attachment_id, '_sfq_question_id', $question_id);
                    update_post_meta($attachment_id, '_sfq_element_id', $element_id);
                    update_post_meta($attachment_id, '_sfq_uploaded_at', current_time('mysql'));
                }
                
                // Mantener información del archivo para la respuesta
                $processed_files[] = array(
                    'attachment_id' => $attachment_id,
                    'url' => $file_url,
                    'filename' => $filename,
                    'original_name' => $original_name,
                    'size' => $file_size,
                    'type' => $file_type,
                    'is_image' => $file_data['is_image'] ?? false,
                    'thumbnail_url' => $file_data['thumbnail_url'] ?? '',
                    'width' => $file_data['width'] ?? null,
                    'height' => $file_data['height'] ?? null
                );
            }
        }
        
        return $processed_files;
    }
    
    /**
     * ✅ NUEVO: Verificar si una tabla existe
     */
    private function table_exists($table_name) {
        global $wpdb;
        
        $table_exists = $wpdb->get_var($wpdb->prepare(
            "SHOW TABLES LIKE %s",
            $table_name
        ));
        
        return $table_exists === $table_name;
    }
    
    /**
     * ✅ NUEVO: Limpiar datos de archivo para serialización JSON segura
     */
    private function sanitize_file_data_for_json($file_data) {
        // Convertir cualquier objeto a array
        if (is_object($file_data)) {
            $file_data = (array) $file_data;
        }
        
        if (!is_array($file_data)) {
            return array();
        }
        
        // Crear array limpio con solo datos serializables
        $clean_data = array();
        
        // Lista de campos permitidos y seguros para JSON
        $allowed_fields = array(
            'attachment_id', 'url', 'filename', 'original_name', 'size', 'type',
            'is_image', 'thumbnail_url', 'width', 'height', 'file_record_id'
        );
        
        foreach ($allowed_fields as $field) {
            if (isset($file_data[$field])) {
                $value = $file_data[$field];
                
                // Sanitizar según el tipo de campo
                switch ($field) {
                    case 'attachment_id':
                    case 'size':
                    case 'width':
                    case 'height':
                    case 'file_record_id':
                        $clean_data[$field] = intval($value);
                        break;
                        
                    case 'url':
                    case 'thumbnail_url':
                        $clean_data[$field] = esc_url_raw($value);
                        break;
                        
                    case 'is_image':
                        $clean_data[$field] = (bool) $value;
                        break;
                        
                    default:
                        $clean_data[$field] = sanitize_text_field($value);
                        break;
                }
            }
        }
        
        return $clean_data;
    }
    
    /**
     * ✅ NUEVO: Limpiar arrays anidados recursivamente para JSON
     */
    private function sanitize_array_for_json($array) {
        if (!is_array($array)) {
            return sanitize_text_field($array);
        }
        
        $clean_array = array();
        
        foreach ($array as $key => $value) {
            $clean_key = sanitize_text_field($key);
            
            if (is_array($value)) {
                $clean_array[$clean_key] = $this->sanitize_array_for_json($value);
            } elseif (is_object($value)) {
                // Convertir objeto a array y limpiar
                $clean_array[$clean_key] = $this->sanitize_array_for_json((array) $value);
            } else {
                $clean_array[$clean_key] = sanitize_text_field($value);
            }
        }
        
        return $clean_array;
    }
    
    /**
     * ✅ NUEVO: Refrescar nonce para compatibilidad con cache
     */
    public function refresh_nonce() {
        // ✅ CRÍTICO: Para refresh de nonce, usar validación más permisiva
        // ya que el nonce actual puede estar expirado
        
        // Verificar que la petición venga de una fuente válida
        if (!wp_doing_ajax()) {
            wp_send_json_error(array(
                'message' => __('Petición inválida', 'smart-forms-quiz'),
                'code' => 'INVALID_REQUEST'
            ));
            return;
        }
        
        // Rate limiting específico para refresh de nonce
        if (!$this->check_rate_limit('refresh_nonce', 10, 60)) {
            wp_send_json_error(array(
                'message' => __('Demasiadas peticiones de refresh. Intenta de nuevo en un momento.', 'smart-forms-quiz'),
                'code' => 'RATE_LIMIT_EXCEEDED'
            ));
            return;
        }
        
        // Obtener datos de la petición
        $old_nonce = sanitize_text_field($_POST['old_nonce'] ?? '');
        $session_id = sanitize_text_field($_POST['session_id'] ?? '');
        
        // Log para debugging
        error_log('SFQ Nonce Refresh: Request received');
        error_log('SFQ Nonce Refresh: Old nonce: ' . substr($old_nonce, 0, 8) . '...');
        error_log('SFQ Nonce Refresh: Session ID: ' . $session_id);
        
        try {
            // ✅ NUEVO: Generar nuevo nonce
            $new_nonce = wp_create_nonce('sfq_nonce');
            
            if (!$new_nonce) {
                throw new Exception('Failed to generate new nonce');
            }
            
            // ✅ NUEVO: Añadir headers anti-cache específicos
            if (!headers_sent()) {
                header('Cache-Control: no-cache, no-store, must-revalidate, max-age=0');
                header('Pragma: no-cache');
                header('Expires: 0');
                header('X-SFQ-Nonce-Refresh: 1');
            }
            
            // Calcular tiempo de vida del nonce (12 horas por defecto)
            $nonce_lifetime = apply_filters('nonce_life', DAY_IN_SECONDS / 2);
            
            error_log('SFQ Nonce Refresh: New nonce generated: ' . substr($new_nonce, 0, 8) . '...');
            error_log('SFQ Nonce Refresh: Nonce lifetime: ' . $nonce_lifetime . ' seconds');
            
            wp_send_json_success(array(
                'nonce' => $new_nonce,
                'lifetime' => $nonce_lifetime,
                'expires_at' => time() + $nonce_lifetime,
                'session_id' => $session_id,
                'message' => __('Nonce refrescado correctamente', 'smart-forms-quiz'),
                'timestamp' => current_time('timestamp')
            ));
            
        } catch (Exception $e) {
            error_log('SFQ Nonce Refresh Error: ' . $e->getMessage());
            
            wp_send_json_error(array(
                'message' => __('Error al refrescar nonce', 'smart-forms-quiz'),
                'code' => 'REFRESH_FAILED',
                'debug' => WP_DEBUG ? $e->getMessage() : null
            ));
        }
    }
    
}
