<?php
/**
 * Utilidades compartidas del plugin
 */

if (!defined('ABSPATH')) {
    exit;
}

class SFQ_Utils {
    
    /**
     * Obtener IP del usuario
     * Método centralizado para evitar duplicación de código
     */
    public static function get_user_ip() {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        
        // Verificar headers de proxy/load balancer
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            $ip = $_SERVER['HTTP_CLIENT_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            // Tomar la primera IP si hay múltiples
            $forwarded_ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
            $ip = trim($forwarded_ips[0]);
        } elseif (!empty($_SERVER['HTTP_X_REAL_IP'])) {
            $ip = $_SERVER['HTTP_X_REAL_IP'];
        }
        
        // Validar que sea una IP válida
        $ip = filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE);
        if (!$ip) {
            $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
        }
        
        return sanitize_text_field($ip);
    }
    
    /**
     * Formatear tiempo en formato legible
     * Método centralizado para evitar duplicación de código
     */
    public static function format_time($seconds) {
        $seconds = intval($seconds);
        
        if ($seconds < 60) {
            return $seconds . ' ' . __('segundos', 'smart-forms-quiz');
        } elseif ($seconds < 3600) {
            $minutes = floor($seconds / 60);
            $remaining_seconds = $seconds % 60;
            
            if ($remaining_seconds > 0) {
                return $minutes . ' ' . __('min', 'smart-forms-quiz') . ' ' . $remaining_seconds . ' ' . __('seg', 'smart-forms-quiz');
            } else {
                return $minutes . ' ' . __('min', 'smart-forms-quiz');
            }
        } else {
            $hours = floor($seconds / 3600);
            $minutes = floor(($seconds % 3600) / 60);
            
            if ($minutes > 0) {
                return $hours . ' ' . __('h', 'smart-forms-quiz') . ' ' . $minutes . ' ' . __('min', 'smart-forms-quiz');
            } else {
                return $hours . ' ' . __('h', 'smart-forms-quiz');
            }
        }
    }
    
    /**
     * Generar ID de sesión único (método legacy)
     * @deprecated Usar get_or_create_session_id() para mejor tracking
     */
    public static function generate_session_id($prefix = 'sfq') {
        return $prefix . '_' . uniqid() . '_' . wp_generate_password(8, false);
    }
    
    /**
     * Generar fingerprint del usuario para mejor identificación
     */
    public static function generate_user_fingerprint() {
        $components = array(
            self::get_user_ip(),
            $_SERVER['HTTP_USER_AGENT'] ?? '',
            $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '',
            $_SERVER['HTTP_ACCEPT_ENCODING'] ?? '',
            date('Y-m-d') // Renovar diariamente para privacidad
        );
        
        // Filtrar componentes vacíos
        $components = array_filter($components);
        
        return 'fp_' . md5(implode('|', $components));
    }
    
    /**
     * Obtener o crear session ID inteligente que persiste por dispositivo/navegador
     */
    public static function get_or_create_session_id($form_id = null) {
        $form_suffix = $form_id ? "_{$form_id}" : '';
        $cookie_name = "sfq_session{$form_suffix}";
        
        // Intentar obtener de cookie primero
        $stored_session = $_COOKIE[$cookie_name] ?? null;
        
        if ($stored_session && self::is_valid_session($stored_session)) {
            return $stored_session;
        }
        
        // Generar nuevo session_id basado en fingerprint + timestamp
        $fingerprint = self::generate_user_fingerprint();
        $timestamp = time();
        $session_id = $fingerprint . '_' . $timestamp;
        
        // Guardar en cookie (24 horas de duración)
        if (!headers_sent()) {
            setcookie($cookie_name, $session_id, time() + 86400, '/', '', is_ssl(), true);
        }
        
        return $session_id;
    }
    
    /**
     * Validar si un session ID es válido y no ha expirado
     */
    public static function is_valid_session($session_id) {
        if (empty($session_id) || !is_string($session_id)) {
            return false;
        }
        
        // Verificar formato: fp_hash_timestamp
        $parts = explode('_', $session_id);
        if (count($parts) < 3) {
            return false;
        }
        
        // Obtener timestamp (última parte)
        $timestamp = end($parts);
        if (!is_numeric($timestamp)) {
            return false;
        }
        
        // Verificar que no haya expirado (24 horas)
        $expiry_time = intval($timestamp) + 86400;
        if (time() > $expiry_time) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Obtener información extendida de la sesión
     */
    public static function get_session_info($session_id) {
        if (!self::is_valid_session($session_id)) {
            return null;
        }
        
        $parts = explode('_', $session_id);
        $timestamp = end($parts);
        
        return array(
            'session_id' => $session_id,
            'created_at' => date('Y-m-d H:i:s', intval($timestamp)),
            'expires_at' => date('Y-m-d H:i:s', intval($timestamp) + 86400),
            'is_valid' => true,
            'fingerprint' => implode('_', array_slice($parts, 0, -1))
        );
    }
    
    /**
     * Validar email de forma robusta
     */
    public static function validate_email($email) {
        $email = sanitize_email($email);
        return is_email($email) ? $email : false;
    }
    
    /**
     * Sanitizar datos de formulario de forma segura
     */
    public static function sanitize_form_data($data, $allowed_html = array()) {
        if (is_array($data)) {
            return array_map(function($item) use ($allowed_html) {
                return self::sanitize_form_data($item, $allowed_html);
            }, $data);
        }
        
        if (is_string($data)) {
            if (empty($allowed_html)) {
                return sanitize_text_field($data);
            } else {
                return wp_kses($data, $allowed_html);
            }
        }
        
        return $data;
    }
    
    /**
     * Procesar opciones de pregunta de forma consistente
     */
    public static function process_question_options($options) {
        if (empty($options)) {
            return array();
        }
        
        // Decodificar JSON si es string
        if (is_string($options)) {
            $decoded = json_decode(stripslashes($options), true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $options = $decoded;
            } else {
                return array();
            }
        }
        
        if (!is_array($options)) {
            return array();
        }
        
        // Procesar opciones
        $processed_options = array();
        foreach ($options as $option) {
            if (is_string($option)) {
                $processed_options[] = array(
                    'text' => $option,
                    'value' => $option
                );
            } elseif (is_array($option) || is_object($option)) {
                $option = (array) $option;
                $processed_options[] = array(
                    'text' => $option['text'] ?? $option['value'] ?? '',
                    'value' => $option['value'] ?? $option['text'] ?? ''
                );
            }
        }
        
        // Filtrar opciones vacías
        return array_values(array_filter($processed_options, function($option) {
            return !empty(trim($option['text']));
        }));
    }
    
    /**
     * Procesar configuraciones de pregunta
     */
    public static function process_question_settings($settings) {
        if (empty($settings)) {
            return array();
        }
        
        if (is_string($settings)) {
            $decoded = json_decode($settings, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                return $decoded;
            }
        }
        
        if (is_array($settings)) {
            return $settings;
        }
        
        return array();
    }
    
    /**
     * Procesar campo required
     */
    public static function process_required_field($required) {
        if (is_bool($required)) {
            return $required ? 1 : 0;
        }
        
        if (is_numeric($required)) {
            return intval($required) ? 1 : 0;
        }
        
        if (is_string($required)) {
            $required = strtolower(trim($required));
            return in_array($required, array('1', 'true', 'yes', 'on')) ? 1 : 0;
        }
        
        return 0;
    }
    
    /**
     * Validar datos de formulario
     */
    public static function validate_form_data($form_data) {
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
                $question_errors = self::validate_question_data($question, $index);
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
    public static function validate_question_data($question, $index) {
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
     * Validar petición AJAX
     */
    public static function validate_ajax_request($capability = 'manage_smart_forms', $nonce_action = 'sfq_nonce') {
        // Verificar permisos
        if (!current_user_can($capability) && !current_user_can('manage_options')) {
            wp_send_json_error(array(
                'message' => __('No tienes permisos para realizar esta acción', 'smart-forms-quiz'),
                'code' => 'INSUFFICIENT_PERMISSIONS'
            ));
            return false;
        }
        
        // Verificar nonce
        if (!check_ajax_referer($nonce_action, 'nonce', false)) {
            wp_send_json_error(array(
                'message' => __('Error de seguridad', 'smart-forms-quiz'),
                'code' => 'INVALID_NONCE'
            ));
            return false;
        }
        
        // Verificar método de petición
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            wp_send_json_error(array(
                'message' => __('Método de petición no válido', 'smart-forms-quiz'),
                'code' => 'INVALID_METHOD'
            ));
            return false;
        }
        
        return true;
    }
    
    /**
     * Rate limiting - Delegado a la implementación de seguridad
     * @deprecated Usar SFQ_Security::check_rate_limit() directamente
     */
    public static function check_rate_limit($action, $max_requests = 10, $time_window = 60) {
        // Delegar a la implementación más robusta de la clase Security
        return SFQ_Security::check_rate_limit($action, $max_requests, $time_window);
    }
    
    /**
     * Limpiar caché relacionado con formularios
     */
    public static function clear_form_cache($form_id) {
        wp_cache_delete("sfq_form_data_{$form_id}", 'sfq_forms');
        wp_cache_delete("sfq_form_{$form_id}", 'sfq_forms');
        
        // Clear any related caches
        wp_cache_flush_group('sfq_forms');
    }
}
