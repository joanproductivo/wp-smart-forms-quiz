<?php
/**
 * Manejo de límites de envío
 */

if (!defined('ABSPATH')) {
    exit;
}

class SFQ_Limits {
    
    private $database;
    
    public function __construct() {
        $this->database = new SFQ_Database();
    }
    
    /**
     * Verificar si se puede enviar el formulario - nueva estructura flexible
     */
    public function can_submit_form($form_id, $user_identifier = null) {
        $form = $this->database->get_form($form_id);
        
        if (!$form) {
            return array('allowed' => true);
        }
        
        $settings = $form->settings;
        
        // PASO 1: Verificar límites que bloquean completamente (programación, login)
        $blocking_limits_check = $this->check_blocking_limits($settings);
        if (!$blocking_limits_check['allowed']) {
            return $blocking_limits_check;
        }
        
        // PASO 2: Verificar límite máximo de participantes (puede permitir o bloquear nuevos usuarios)
        $max_participants_check = $this->check_max_submissions($form_id, $settings);
        if (!$max_participants_check['allowed']) {
            return $max_participants_check;
        }
        
        // PASO 3: Verificar límites de envío (solo si hay límites configurados)
        $limit_count = intval($settings['submission_limit_count'] ?? 0);
        $limit_period = $settings['submission_limit_period'] ?? 'no_limit';
        
        // Si no hay período seleccionado o está vacío, considerar como sin límite
        if (empty($limit_period) || $limit_period === 'no_limit') {
            $limit_period = 'no_limit';
        }
        
        // Si no hay límites de envío configurados, permitir el envío
        if ($limit_count <= 0 || $limit_period === 'no_limit') {
            return array('allowed' => true, 'reason' => 'no_submission_limits');
        }
        
        // Hay límites de envío configurados, verificarlos
        $limit_type = $settings['limit_type'] ?? 'session_id';
        $limit_message = $settings['limit_message'] ?? __('Has alcanzado el límite de envíos. Inténtalo más tarde.', 'smart-forms-quiz');
        
        // Obtener identificador del usuario para límites de envío
        if (!$user_identifier) {
            $user_identifier = $this->get_user_identifier($limit_type);
        }
        
        // Contar envíos en el período según el tipo de límite de envío
        $submission_count = $this->count_submissions_in_period($form_id, $user_identifier, $limit_count, $limit_period, $limit_type);
        
        if ($submission_count >= $limit_count) {
            return array(
                'allowed' => false,
                'message' => $limit_message,
                'count' => $submission_count,
                'limit' => $limit_count,
                'period' => $limit_period,
                'type' => $limit_type,
                'code' => 'SUBMISSION_LIMIT_EXCEEDED'
            );
        }
        
        return array(
            'allowed' => true,
            'count' => $submission_count,
            'limit' => $limit_count,
            'remaining' => $limit_count - $submission_count
        );
    }
    
    /**
     * Verificar límites que bloquean completamente (programación, login)
     */
    private function check_blocking_limits($settings) {
        // Verificar límites de programación
        $schedule_check = $this->check_schedule_limits($settings);
        if (!$schedule_check['allowed']) {
            return $schedule_check;
        }
        
        // Verificar requerimiento de login
        $login_check = $this->check_login_requirement($settings);
        if (!$login_check['allowed']) {
            return $login_check;
        }
        
        return array('allowed' => true);
    }
    
    /**
     * Verificar otros límites (programación, login, máximo total)
     * @deprecated - Usar check_blocking_limits() y check_max_submissions() por separado
     */
    private function check_other_limits($form_id, $settings) {
        // Verificar límites de programación
        $schedule_check = $this->check_schedule_limits($settings);
        if (!$schedule_check['allowed']) {
            return $schedule_check;
        }
        
        // Verificar requerimiento de login
        $login_check = $this->check_login_requirement($settings);
        if (!$login_check['allowed']) {
            return $login_check;
        }
        
        // Verificar límite máximo de respuestas
        $max_submissions_check = $this->check_max_submissions($form_id, $settings);
        if (!$max_submissions_check['allowed']) {
            return $max_submissions_check;
        }
        
        return array('allowed' => true);
    }
    
    /**
     * Verificar límites de programación
     */
    private function check_schedule_limits($settings) {
        if (!isset($settings['enable_schedule']) || !$settings['enable_schedule']) {
            return array('allowed' => true);
        }
        
        $now = current_time('timestamp');
        $start_time = !empty($settings['schedule_start']) ? strtotime($settings['schedule_start']) : null;
        $end_time = !empty($settings['schedule_end']) ? strtotime($settings['schedule_end']) : null;
        
        if ($start_time && $now < $start_time) {
            $message = !empty($settings['schedule_not_started_message']) 
                ? $settings['schedule_not_started_message'] 
                : __('Este formulario aún no está disponible.', 'smart-forms-quiz');
                
            return array(
                'allowed' => false,
                'message' => $message,
                'code' => 'SCHEDULE_NOT_STARTED'
            );
        }
        
        if ($end_time && $now > $end_time) {
            $message = !empty($settings['schedule_ended_message']) 
                ? $settings['schedule_ended_message'] 
                : __('Este formulario ya no está disponible.', 'smart-forms-quiz');
                
            return array(
                'allowed' => false,
                'message' => $message,
                'code' => 'SCHEDULE_ENDED'
            );
        }
        
        return array('allowed' => true);
    }
    
    /**
     * Verificar requerimiento de login
     */
    private function check_login_requirement($settings) {
        if (!isset($settings['require_login']) || !$settings['require_login']) {
            return array('allowed' => true);
        }
        
        if (!is_user_logged_in()) {
            $message = !empty($settings['login_required_message']) 
                ? $settings['login_required_message'] 
                : __('Debes iniciar sesión para completar este formulario.', 'smart-forms-quiz');
                
            return array(
                'allowed' => false,
                'message' => $message,
                'code' => 'LOGIN_REQUIRED'
            );
        }
        
        return array('allowed' => true);
    }
    
    /**
     * Verificar límite máximo de respuestas
     */
    private function check_max_submissions($form_id, $settings) {
        if (!isset($settings['enable_max_submissions']) || !$settings['enable_max_submissions']) {
            return array('allowed' => true);
        }
        
        $max_submissions = intval($settings['max_submissions'] ?? 0);
        if ($max_submissions <= 0) {
            return array('allowed' => true);
        }
        
        global $wpdb;
        
        // Obtener el tipo de límite para máximo de participantes (independiente del tipo de límite de envíos)
        $max_limit_type = $settings['max_submissions_limit_type'] ?? 'session_id';
        
        // Obtener el identificador actual del usuario según el tipo de límite máximo
        // CORREGIDO: Usar el form_id correcto para session_id
        $current_user_identifier = $this->get_user_identifier($max_limit_type, $form_id);
        
        // Verificar si el usuario actual ya ha participado
        $user_has_participated = false;
        if ($max_limit_type === 'session_id') {
            $user_has_participated = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$wpdb->prefix}sfq_analytics 
                WHERE form_id = %d AND session_id = %s AND event_type = 'completed'",
                $form_id,
                $current_user_identifier
            )) > 0;
        } else {
            $user_has_participated = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$wpdb->prefix}sfq_analytics 
                WHERE form_id = %d AND user_ip = %s AND event_type = 'completed'",
                $form_id,
                $current_user_identifier
            )) > 0;
        }
        
        // Si el usuario ya ha participado, permitir el envío (no cuenta como nuevo participante)
        // Esto permite que session_ids o IPs que ya participaron puedan responder múltiples veces
        // siempre que no haya otros límites de envío que lo impidan
        if ($user_has_participated) {
            return array(
                'allowed' => true,
                'reason' => 'existing_participant',
                'participant_type' => $max_limit_type
            );
        }
        
        // Contar participantes únicos según el tipo de límite (excluyendo al usuario actual)
        if ($max_limit_type === 'session_id') {
            // Contar por session_id únicos en analytics, excluyendo el actual
            $total_submissions = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(DISTINCT session_id) FROM {$wpdb->prefix}sfq_analytics 
                WHERE form_id = %d AND event_type = 'completed' AND session_id != %s",
                $form_id,
                $current_user_identifier
            ));
        } else {
            // Contar por IP únicas en analytics, excluyendo la actual
            $total_submissions = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(DISTINCT user_ip) FROM {$wpdb->prefix}sfq_analytics 
                WHERE form_id = %d AND event_type = 'completed' AND user_ip != %s",
                $form_id,
                $current_user_identifier
            ));
        }
        
        // Verificar si se ha alcanzado el límite máximo (sin contar al usuario actual)
        // Si permitimos al usuario actual, tendríamos total_submissions + 1 participantes
        if (($total_submissions + 1) > $max_submissions) {
            $message = !empty($settings['max_submissions_message']) 
                ? $settings['max_submissions_message'] 
                : __('Este formulario ha alcanzado el límite máximo de respuestas.', 'smart-forms-quiz');
                
            return array(
                'allowed' => false,
                'message' => $message,
                'code' => 'MAX_SUBMISSIONS_REACHED',
                'total_submissions' => $total_submissions,
                'max_submissions' => $max_submissions,
                'limit_type' => $max_limit_type
            );
        }
        
        return array('allowed' => true);
    }
    
    /**
     * Contar envíos en un período específico - nueva estructura flexible
     */
    private function count_submissions_in_period($form_id, $user_identifier, $limit_count, $limit_period, $limit_type) {
        global $wpdb;
        
        // Calcular fecha de inicio según el período
        $date_intervals = array(
            'day' => '1 DAY',
            'week' => '1 WEEK', 
            'month' => '1 MONTH',
            'year' => '1 YEAR',
            'forever' => '100 YEAR' // Para "para siempre"
        );
        
        $interval = $date_intervals[$limit_period] ?? '1 DAY';
        
        // Usar la tabla de analytics para verificar envíos completados
        if ($limit_type === 'session_id') {
            // Verificar por session_id
            $count = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$wpdb->prefix}sfq_analytics 
                WHERE form_id = %d 
                AND session_id = %s 
                AND event_type = 'completed'
                AND created_at >= DATE_SUB(NOW(), INTERVAL {$interval})",
                $form_id,
                $user_identifier
            ));
        } else {
            // Verificar por IP
            $count = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$wpdb->prefix}sfq_analytics 
                WHERE form_id = %d 
                AND user_ip = %s 
                AND event_type = 'completed'
                AND created_at >= DATE_SUB(NOW(), INTERVAL {$interval})",
                $form_id,
                $user_identifier
            ));
        }
        
        return intval($count);
    }
    
    /**
     * Obtener identificador único del usuario
     */
    private function get_user_identifier($limit_type = 'session_id', $form_id = null) {
        if ($limit_type === 'session_id') {
            // CORREGIDO: Usar form_id específico cuando se proporciona
            $session_form_id = $form_id !== null ? $form_id : 0;
            return SFQ_Utils::get_or_create_session_id($session_form_id);
        } else {
            // Para usuarios no registrados o verificación por IP, usar IP
            return SFQ_Utils::get_user_ip();
        }
    }
    
    /**
     * Registrar intento de envío bloqueado
     */
    public function log_blocked_submission($form_id, $reason = 'limit_exceeded', $details = array()) {
        global $wpdb;
        
        // Obtener configuración del formulario para determinar el tipo de límite
        $form = $this->database->get_form($form_id);
        $limit_type = $form ? ($form->settings['limit_type'] ?? 'session_id') : 'session_id';
        
        $event_data = array(
            'reason' => $reason,
            'user_identifier' => $this->get_user_identifier($limit_type),
            'limit_type' => $limit_type,
            'timestamp' => time(),
            'details' => $details
        );
        
        $wpdb->insert(
            $wpdb->prefix . 'sfq_analytics',
            array(
                'form_id' => $form_id,
                'event_type' => 'submission_blocked',
                'event_data' => json_encode($event_data),
                'user_ip' => SFQ_Utils::get_user_ip(),
                'session_id' => SFQ_Utils::get_or_create_session_id($form_id)
            ),
            array('%d', '%s', '%s', '%s', '%s')
        );
    }
    
    /**
     * Verificar límites antes del envío (método público para AJAX)
     */
    public function check_submission_limits($form_id, $session_id = null) {
        // Obtener la configuración del formulario para determinar el tipo de límite
        $form = $this->database->get_form($form_id);
        
        if (!$form) {
            return array('allowed' => true);
        }
        
        $limit_type = $form->settings['limit_type'] ?? 'session_id';
        
        // Determinar el identificador correcto según el tipo de límite
        $user_identifier = null;
        if ($limit_type === 'session_id') {
            // Usar session_id proporcionado o generar uno nuevo
            $user_identifier = $session_id ?: SFQ_Utils::get_or_create_session_id($form_id);
        } else {
            // Para límite por IP, siempre usar la IP actual
            $user_identifier = SFQ_Utils::get_user_ip();
        }
        
        $result = $this->can_submit_form($form_id, $user_identifier);
        
        // Si no está permitido, registrar el intento bloqueado
        if (!$result['allowed']) {
            $this->log_blocked_submission($form_id, $result['code'] ?? 'limit_exceeded', $result);
        }
        
        return $result;
    }
    
    /**
     * Obtener información de límites para mostrar al usuario
     */
    public function get_limits_info($form_id) {
        $form = $this->database->get_form($form_id);
        
        if (!$form || !isset($form->settings['submission_limit']) || $form->settings['submission_limit'] === 'no_limit') {
            return array('has_limits' => false);
        }
        
        $settings = $form->settings;
        $info = array('has_limits' => true);
        
        // Información de límite de envíos
        if ($settings['submission_limit'] !== 'no_limit') {
            $period_labels = array(
                'once_per_day' => __('una vez al día', 'smart-forms-quiz'),
                'once_per_week' => __('una vez a la semana', 'smart-forms-quiz'),
                'once_per_month' => __('una vez al mes', 'smart-forms-quiz'),
                'once_forever' => __('una sola vez', 'smart-forms-quiz')
            );
            
            $info['submission_limit'] = array(
                'type' => $settings['submission_limit'],
                'label' => $period_labels[$settings['submission_limit']] ?? $settings['submission_limit'],
                'limit_type' => $settings['limit_type'] ?? 'session_id'
            );
        }
        
        // Información de programación
        if (!empty($settings['enable_schedule'])) {
            $info['schedule'] = array(
                'start' => $settings['schedule_start'] ?? null,
                'end' => $settings['schedule_end'] ?? null
            );
        }
        
        // Información de login requerido
        if (!empty($settings['require_login'])) {
            $info['require_login'] = true;
        }
        
        // Información de límite máximo
        if (!empty($settings['enable_max_submissions'])) {
            $info['max_submissions'] = intval($settings['max_submissions'] ?? 0);
        }
        
        return $info;
    }
}
