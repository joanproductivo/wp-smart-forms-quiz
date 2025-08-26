<?php
/**
 * Clase de seguridad para Smart Forms Quiz
 * Maneja la sanitización y validación de entradas de usuario
 */

if (!defined('ABSPATH')) {
    exit;
}

class SFQ_Security {
    
    /**
     * Sanitizar respuesta de formulario según el tipo de pregunta
     */
    public static function sanitize_form_response($response, $question_type, $question_id = null) {
        // Validar entrada básica
        if ($response === null || $response === '') {
            return '';
        }
        
        // Obtener configuraciones de seguridad
        $security_settings = get_option('sfq_security_settings', array());
        
        // Si la protección XSS está deshabilitada, usar sanitización básica
        if (!($security_settings['enable_xss_protection'] ?? true)) {
            return sanitize_text_field($response);
        }
        
        // Validar longitud máxima configurable - pero no lanzar excepción, solo truncar
        $max_length = $security_settings['max_response_length'] ?? 2000;
        if (is_string($response) && strlen($response) > $max_length) {
            error_log("SFQ Warning: Response too long, truncating from " . strlen($response) . " to {$max_length} characters");
            $response = substr($response, 0, $max_length);
        }
        
        // Asegurar que question_type sea válido
        if (empty($question_type)) {
            error_log("SFQ Warning: Empty question_type, using default text sanitization");
            $question_type = 'text';
        }
        
        try {
            switch ($question_type) {
                case 'text':
                    // Eliminar TODO el HTML para prevenir XSS
                    return wp_kses($response, array());
                    
                case 'email':
                    $email = sanitize_email($response);
                    if (!is_email($email) && !empty($response)) {
                        // Log warning pero devolver valor sanitizado
                        error_log("SFQ Warning: Invalid email format: {$response}, returning sanitized version");
                    }
                    return $email;
                    
                case 'single_choice':
                    return self::validate_choice_response($response, $question_id);
                    
                case 'multiple_choice':
                    if (!is_array($response)) {
                        // Log warning pero no lanzar excepción
                        error_log("SFQ Warning: Multiple choice response is not array, converting: " . print_r($response, true));
                        // Convertir a array si es posible
                        if (is_string($response) && !empty($response)) {
                            $response = array($response);
                        } else {
                            $response = array();
                        }
                    }
                    
                    // Sanitizar cada elemento del array
                    $sanitized_array = array();
                    foreach ($response as $item) {
                        $sanitized_item = self::validate_choice_response($item, $question_id);
                        if (!empty($sanitized_item)) {
                            $sanitized_array[] = $sanitized_item;
                        }
                    }
                    return $sanitized_array;
                    
                case 'rating':
                    $rating = intval($response);
                    if ($rating < 1 || $rating > 10) {
                        // Log warning pero no lanzar excepción
                        error_log("SFQ Warning: Invalid rating value: {$rating}, clamping to valid range");
                        // Clamp al rango válido
                        $rating = max(1, min(10, $rating));
                    }
                    return $rating;
                    
                case 'image_choice':
                    return self::validate_choice_response($response, $question_id);
                    
                default:
                    error_log("SFQ Warning: Unknown question type: {$question_type}, using text sanitization");
                    return sanitize_text_field($response);
            }
        } catch (Exception $e) {
            // Capturar cualquier excepción inesperada y devolver valor seguro
            error_log("SFQ Error in sanitize_form_response: " . $e->getMessage() . " for question_type: {$question_type}");
            return sanitize_text_field($response);
        }
    }
    
    /**
     * Validar respuesta de opción múltiple/única contra opciones válidas
     */
    private static function validate_choice_response($response, $question_id) {
        if (!$question_id) {
            return sanitize_text_field($response);
        }
        
        global $wpdb;
        
        // Obtener opciones válidas de la pregunta
        $question = $wpdb->get_row($wpdb->prepare(
            "SELECT options FROM {$wpdb->prefix}sfq_questions WHERE id = %d",
            $question_id
        ));
        
        if (!$question) {
            // Log warning pero no lanzar excepción
            error_log("SFQ Warning: Question not found for ID: {$question_id}");
            return sanitize_text_field($response);
        }
        
        $options = json_decode($question->options, true);
        if (!is_array($options)) {
            return sanitize_text_field($response);
        }
        
        // Extraer valores válidos
        $valid_values = array();
        foreach ($options as $option) {
            if (is_array($option)) {
                $valid_values[] = $option['value'] ?? $option['text'] ?? '';
            } else {
                $valid_values[] = $option;
            }
        }
        
        // Validar que la respuesta esté en las opciones válidas
        if (!in_array($response, $valid_values)) {
            // Log warning pero no lanzar excepción - permitir la respuesta
            error_log("SFQ Warning: Invalid choice option '{$response}' for question {$question_id}. Valid options: " . implode(', ', $valid_values));
            // Aún así sanitizar y permitir la respuesta
            return sanitize_text_field($response);
        }
        
        return sanitize_text_field($response);
    }
    
    /**
     * Validar y sanitizar datos JSON de entrada
     */
    public static function validate_json_input($json_string, $max_depth = null) {
        if (empty($json_string)) {
            return array();
        }
        
        // Obtener configuraciones de seguridad
        $security_settings = get_option('sfq_security_settings', array());
        
        // Usar profundidad máxima configurable
        if ($max_depth === null) {
            $max_depth = $security_settings['json_max_depth'] ?? 10;
        }
        
        try {
            // Decodificar JSON con límite de profundidad
            $data = json_decode($json_string, true, $max_depth);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                error_log('SFQ Warning: Invalid JSON data: ' . json_last_error_msg() . ' - Input: ' . substr($json_string, 0, 200));
                return array();
            }
            
            if (!is_array($data)) {
                error_log('SFQ Warning: JSON must decode to array, got: ' . gettype($data));
                return array();
            }
            
            return self::deep_sanitize($data);
        } catch (Exception $e) {
            error_log('SFQ Error in validate_json_input: ' . $e->getMessage());
            return array();
        }
    }
    
    /**
     * Sanitización profunda de arrays anidados
     */
    private static function deep_sanitize($data) {
        if (is_array($data)) {
            return array_map(array(self::class, 'deep_sanitize'), $data);
        }
        
        if (is_string($data)) {
            // Eliminar HTML y scripts maliciosos
            return wp_kses($data, array());
        }
        
        if (is_numeric($data)) {
            return $data;
        }
        
        if (is_bool($data)) {
            return $data;
        }
        
        // Para otros tipos, convertir a string y sanitizar
        return sanitize_text_field((string) $data);
    }
    
    /**
     * Validar nonce de forma estricta
     */
    public static function validate_nonce($nonce_action = 'sfq_nonce', $nonce_name = 'nonce') {
        if (!check_ajax_referer($nonce_action, $nonce_name, false)) {
            wp_send_json_error(array(
                'message' => __('Error de seguridad: token inválido', 'smart-forms-quiz'),
                'code' => 'INVALID_NONCE'
            ));
            wp_die();
        }
        
        return true;
    }
    
    /**
     * Validar permisos de usuario
     */
    public static function validate_user_permissions($capability = 'manage_smart_forms') {
        if (!current_user_can($capability) && !current_user_can('manage_options')) {
            wp_send_json_error(array(
                'message' => __('No tienes permisos para realizar esta acción', 'smart-forms-quiz'),
                'code' => 'INSUFFICIENT_PERMISSIONS'
            ));
            wp_die();
        }
        
        return true;
    }
    
    /**
     * Rate limiting mejorado con configuración dinámica
     */
    public static function check_rate_limit($action, $max_requests = null, $time_window = null) {
        // Obtener configuraciones de seguridad
        $security_settings = get_option('sfq_security_settings', array());
        
        // Si rate limiting está deshabilitado, permitir siempre
        if (!($security_settings['enable_rate_limiting'] ?? true)) {
            return true;
        }
        
        // Usar valores de configuración o valores por defecto
        if ($max_requests === null) {
            $max_requests = $security_settings['rate_limit_requests'] ?? 10;
        }
        if ($time_window === null) {
            $time_window = $security_settings['rate_limit_window'] ?? 300;
        }
        
        $user_id = get_current_user_id();
        $ip = SFQ_Utils::get_user_ip();
        $user_agent = sanitize_text_field($_SERVER['HTTP_USER_AGENT'] ?? '');
        
        // Crear clave única basada en múltiples factores
        $key = "sfq_rate_limit_{$action}_" . md5($user_id . $ip . $user_agent);
        
        $current_requests = get_transient($key);
        
        if ($current_requests === false) {
            set_transient($key, 1, $time_window);
            return true;
        }
        
        if ($current_requests >= $max_requests) {
            // Log del intento de abuso
            error_log("SFQ Rate limit exceeded for action: {$action}, IP: {$ip}, User: {$user_id}");
            
            // Para submit_response, ser menos agresivo y solo loggear
            if ($action === 'submit_response') {
                self::log_security_event('rate_limit_exceeded', array(
                    'action' => $action,
                    'requests' => $current_requests,
                    'limit' => $max_requests
                ));
                // Permitir el envío pero con advertencia
                set_transient($key, $current_requests + 1, $time_window);
                return true;
            }
            
            wp_send_json_error(array(
                'message' => __('Demasiadas peticiones. Intenta de nuevo en un momento.', 'smart-forms-quiz'),
                'code' => 'RATE_LIMIT_EXCEEDED'
            ));
            wp_die();
        }
        
        set_transient($key, $current_requests + 1, $time_window);
        return true;
    }
    
    /**
     * Añadir headers de seguridad
     */
    public static function add_security_headers() {
        // Solo añadir en páginas del plugin
        if (!self::is_plugin_page()) {
            return;
        }
        
        // Obtener configuraciones de seguridad
        $security_settings = get_option('sfq_security_settings', array());
        
        // Si los headers de seguridad están deshabilitados, no añadir nada
        if (!($security_settings['enable_security_headers'] ?? true)) {
            return;
        }
        
        // Content Security Policy
        header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;");
        
        // Otros headers de seguridad
        header("X-Content-Type-Options: nosniff");
        header("X-Frame-Options: SAMEORIGIN");
        header("X-XSS-Protection: 1; mode=block");
        header("Referrer-Policy: strict-origin-when-cross-origin");
    }
    
    /**
     * Verificar si estamos en una página del plugin
     */
    private static function is_plugin_page() {
        global $pagenow;
        
        // Admin pages
        if (is_admin() && isset($_GET['page']) && strpos($_GET['page'], 'smart-forms') !== false) {
            return true;
        }
        
        // AJAX requests
        if (defined('DOING_AJAX') && DOING_AJAX) {
            return true;
        }
        
        // Frontend con shortcode (más complejo de detectar, se podría mejorar)
        return false;
    }
    
    /**
     * Sanitizar entrada de usuario con tipo específico
     */
    public static function sanitize_user_input($input, $type = 'text') {
        switch ($type) {
            case 'text':
                return wp_kses($input, array()); // Elimina TODO el HTML
                
            case 'email':
                return sanitize_email($input);
                
            case 'textarea':
                return wp_kses($input, array(
                    'br' => array(),
                    'p' => array()
                ));
                
            case 'url':
                return esc_url_raw($input);
                
            case 'int':
                return intval($input);
                
            case 'float':
                return floatval($input);
                
            case 'bool':
                return (bool) $input;
                
            case 'json':
                return self::validate_json_input($input);
                
            default:
                return sanitize_text_field($input);
        }
    }
    
    /**
     * Validar estructura de datos de formulario
     */
    public static function validate_form_structure($form_data) {
        $errors = array();
        
        // Validaciones básicas
        if (empty($form_data['title'])) {
            $errors['title'] = __('El título es requerido', 'smart-forms-quiz');
        }
        
        if (isset($form_data['questions']) && is_array($form_data['questions'])) {
            foreach ($form_data['questions'] as $index => $question) {
                if (empty($question['question_text'])) {
                    $errors["question_{$index}"] = sprintf(__('La pregunta %d requiere texto', 'smart-forms-quiz'), $index + 1);
                }
                
                if (empty($question['question_type'])) {
                    $errors["question_{$index}_type"] = sprintf(__('La pregunta %d requiere tipo', 'smart-forms-quiz'), $index + 1);
                }
            }
        }
        
        return $errors;
    }
    
    /**
     * Log de eventos de seguridad
     */
    public static function log_security_event($event_type, $details = array()) {
        // Obtener configuraciones de seguridad
        $security_settings = get_option('sfq_security_settings', array());
        
        // Si el logging está deshabilitado, no hacer nada
        if (!($security_settings['log_security_events'] ?? true)) {
            return;
        }
        
        $log_entry = array(
            'timestamp' => current_time('mysql'),
            'event_type' => $event_type,
            'user_id' => get_current_user_id(),
            'ip' => SFQ_Utils::get_user_ip(),
            'user_agent' => sanitize_text_field($_SERVER['HTTP_USER_AGENT'] ?? ''),
            'details' => $details
        );
        
        error_log('SFQ Security Event: ' . json_encode($log_entry));
        
        // Enviar notificación por email si está configurado
        $general_settings = get_option('sfq_settings', array());
        if ($general_settings['notify_security_events'] ?? false) {
            self::send_security_notification($event_type, $log_entry);
        }
        
        // Opcionalmente, guardar en base de datos para análisis posterior
        // self::save_security_log($log_entry);
    }
    
    /**
     * Enviar notificación de evento de seguridad por email
     */
    private static function send_security_notification($event_type, $log_entry) {
        $general_settings = get_option('sfq_settings', array());
        $admin_email = $general_settings['admin_email'] ?? get_option('admin_email');
        
        if (!$admin_email) {
            return;
        }
        
        $subject = sprintf(__('[%s] Evento de Seguridad Detectado', 'smart-forms-quiz'), get_bloginfo('name'));
        
        $message = sprintf(
            __("Se ha detectado un evento de seguridad en Smart Forms Quiz:\n\nTipo: %s\nFecha: %s\nIP: %s\nUsuario: %s\nDetalles: %s", 'smart-forms-quiz'),
            $event_type,
            $log_entry['timestamp'],
            $log_entry['ip'],
            $log_entry['user_id'] ? get_user_by('id', $log_entry['user_id'])->display_name : 'Anónimo',
            json_encode($log_entry['details'], JSON_PRETTY_PRINT)
        );
        
        wp_mail($admin_email, $subject, $message);
    }
}
