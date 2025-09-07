<?php
/**
 * Sistema de Webhooks para Smart Forms Quiz
 * Envía respuestas de formularios a servicios externos como N8N
 */

if (!defined('ABSPATH')) {
    exit;
}

class SFQ_Webhooks {
    
    private $webhook_table;
    private $logs_table;
    private $encryption_key;
    
    public function __construct() {
        global $wpdb;
        $this->webhook_table = $wpdb->prefix . 'sfq_webhook_config';
        $this->logs_table = $wpdb->prefix . 'sfq_webhook_logs';
        $this->encryption_key = $this->get_encryption_key();
        
        // ✅ DEBUG: Log de construcción de la clase
    }
    
    /**
     * Obtener o generar clave de cifrado
     */
    private function get_encryption_key() {
        $key = get_option('sfq_webhook_encryption_key');
        if (!$key) {
            $key = wp_generate_password(32, false);
            update_option('sfq_webhook_encryption_key', $key);
        }
        return $key;
    }
    
    /**
     * Cifrar datos sensibles
     */
    private function encrypt_data($data) {
        if (empty($data)) {
            return '';
        }
        
        $iv = openssl_random_pseudo_bytes(16);
        $encrypted = openssl_encrypt($data, 'AES-256-CBC', $this->encryption_key, 0, $iv);
        return base64_encode($iv . $encrypted);
    }
    
    /**
     * Descifrar datos sensibles
     */
    private function decrypt_data($encrypted_data) {
        if (empty($encrypted_data)) {
            return '';
        }
        
        // Verificar que las extensiones necesarias estén disponibles
        if (!function_exists('openssl_decrypt')) {
            return '';
        }
        
        $data = base64_decode($encrypted_data);
        if ($data === false || strlen($data) < 16) {
            // Datos corruptos o no cifrados
            return '';
        }
        
        $iv = substr($data, 0, 16);
        $encrypted = substr($data, 16);
        
        $decrypted = openssl_decrypt($encrypted, 'AES-256-CBC', $this->encryption_key, 0, $iv);
        
        // Verificar que el descifrado fue exitoso
        if ($decrypted === false) {
            return '';
        }
        
        return $decrypted;
    }
    
    /**
     * Método público para descifrar datos (usado por admin)
     */
    public function decrypt_data_public($encrypted_data) {
        return $this->decrypt_data($encrypted_data);
    }
    
    /**
     * Validar URL para prevenir SSRF
     */
    private function validate_webhook_url($url) {
        // Validar formato básico
        if (!filter_var($url, FILTER_VALIDATE_URL)) {
            return false;
        }
        
        $parsed = parse_url($url);
        
        // Solo permitir HTTP/HTTPS
        if (!in_array($parsed['scheme'], ['http', 'https'])) {
            return false;
        }
        
        // Verificar si está en modo desarrollo
        $dev_mode = get_option('sfq_webhook_dev_mode', false);
        
        // Verificar whitelist de URLs confiables
        if ($this->is_url_in_whitelist($url)) {
            return true; // URL en whitelist, permitir
        }
        
        // Si está en modo desarrollo, permitir URLs locales con log de advertencia
        if ($dev_mode && $this->is_local_url($url)) {
            return true;
        }
        
        // Resolver IP para verificar que no sea interna
        $ip = gethostbyname($parsed['host']);
        
        // Bloquear IPs privadas y localhost
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
            return false;
        }
        
        // Bloquear puertos peligrosos
        $dangerous_ports = [22, 23, 25, 53, 110, 143, 993, 995];
        if (isset($parsed['port']) && in_array($parsed['port'], $dangerous_ports)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Verificar si una URL está en la whitelist de URLs confiables
     */
    private function is_url_in_whitelist($url) {
        $whitelist = get_option('sfq_webhook_trusted_urls', array());
        
        if (empty($whitelist) || !is_array($whitelist)) {
            return false;
        }
        
        $parsed_url = parse_url($url);
        $host_port = $parsed_url['host'];
        if (isset($parsed_url['port'])) {
            $host_port .= ':' . $parsed_url['port'];
        }
        
        foreach ($whitelist as $trusted_url) {
            $trusted_url = trim($trusted_url);
            if (empty($trusted_url)) {
                continue;
            }
            
            // Permitir coincidencia exacta de host:puerto
            if ($host_port === $trusted_url) {
                return true;
            }
            
            // Permitir coincidencia de URL completa
            if (is_string($url) && is_string($trusted_url) && !empty($url) && !empty($trusted_url) && strpos($url, $trusted_url) === 0) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Verificar si una URL es local (para modo desarrollo)
     */
    private function is_local_url($url) {
        $parsed = parse_url($url);
        $host = strtolower($parsed['host']);
        
        // Hosts locales comunes
        $local_hosts = [
            'localhost',
            '127.0.0.1',
            '0.0.0.0',
            '::1'
        ];
        
        if (in_array($host, $local_hosts)) {
            return true;
        }
        
        // Verificar rangos IP privados
        $ip = gethostbyname($host);
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
            return true;
        }
        
        return false;
    }
    
    
    public function init() {
        // ✅ DEBUG: Log de inicialización de webhooks
        
        // Hook para cuando se envía un formulario
        add_action('sfq_form_submitted', array($this, 'trigger_webhook'), 10, 2);
        
        // Hook para envío asíncrono de webhooks
        add_action('sfq_webhook_send', array($this, 'handle_webhook_send'), 10, 1);
        
        // Cron job para reintentos de webhooks fallidos
        add_action('sfq_webhook_retry', array($this, 'retry_failed_webhook'), 10, 1);
        
        // Limpiar logs antiguos
        add_action('sfq_cleanup_webhook_logs', array($this, 'cleanup_old_logs'));
        
        // Programar limpieza semanal de logs
        if (!wp_next_scheduled('sfq_cleanup_webhook_logs')) {
            wp_schedule_event(time(), 'weekly', 'sfq_cleanup_webhook_logs');
        }
        
        // ✅ DEBUG: Verificar webhooks activos al inicializar
        $active_webhooks = $this->get_active_webhooks();
        foreach ($active_webhooks as $webhook) {
        }
    }
    
    /**
     * Crear tablas necesarias para webhooks
     */
    public function create_tables() {
        global $wpdb;
        $charset_collate = $wpdb->get_charset_collate();
        
        // Tabla de configuración de webhooks
        $sql_config = "CREATE TABLE IF NOT EXISTS {$this->webhook_table} (
            id INT(11) NOT NULL AUTO_INCREMENT,
            name VARCHAR(255) NOT NULL,
            url VARCHAR(500) NOT NULL,
            method VARCHAR(10) DEFAULT 'POST',
            headers LONGTEXT,
            auth_type VARCHAR(50) DEFAULT 'none',
            auth_data LONGTEXT,
            events TEXT,
            form_filters TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            max_retries INT(3) DEFAULT 3,
            retry_delay INT(11) DEFAULT 300,
            timeout INT(11) DEFAULT 30,
            verify_ssl BOOLEAN DEFAULT TRUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY is_active (is_active)
        ) $charset_collate;";
        
        // Tabla de logs de webhooks
        $sql_logs = "CREATE TABLE IF NOT EXISTS {$this->logs_table} (
            id INT(11) NOT NULL AUTO_INCREMENT,
            webhook_id INT(11) NOT NULL,
            form_id INT(11) NOT NULL,
            submission_id INT(11) NOT NULL,
            event_type VARCHAR(50) NOT NULL,
            url VARCHAR(500) NOT NULL,
            method VARCHAR(10) NOT NULL,
            request_headers LONGTEXT,
            request_body LONGTEXT,
            response_code INT(11),
            response_headers LONGTEXT,
            response_body LONGTEXT,
            execution_time DECIMAL(8,3),
            status VARCHAR(20) NOT NULL,
            error_message TEXT,
            retry_count INT(3) DEFAULT 0,
            next_retry_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY webhook_id (webhook_id),
            KEY form_id (form_id),
            KEY submission_id (submission_id),
            KEY status (status),
            KEY created_at (created_at),
            KEY next_retry_at (next_retry_at)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql_config);
        dbDelta($sql_logs);
    }
    
    /**
     * Disparar webhook cuando se envía un formulario
     */
    public function trigger_webhook($form_id, $submission_id) {
        // ✅ DEBUG: Log detallado del trigger
        
        // Obtener webhooks activos
        $webhooks = $this->get_active_webhooks();
        
        
        if (empty($webhooks)) {
            return;
        }
        
        // Obtener datos del formulario y submission
        $webhook_data = $this->prepare_webhook_data($form_id, $submission_id);
        
        if (!$webhook_data) {
            return;
        }
        
        
        // Enviar a cada webhook configurado
        $scheduled_count = 0;
        foreach ($webhooks as $webhook) {
            
            // Verificar si este webhook debe procesar este formulario
            if (!$this->should_process_form($webhook, $form_id)) {
                continue;
            }
            
            
            // ✅ DEBUG: Verificar estado del cron de WordPress
            $cron_disabled = defined('DISABLE_WP_CRON') && DISABLE_WP_CRON;
            
            // ✅ CORREGIDO: Para ejecución inmediata, ejecutar directamente
            // WP Cron puede no ejecutarse inmediatamente en algunos entornos
            $execution_time = time();
            $scheduled = wp_schedule_single_event($execution_time, 'sfq_webhook_send', array(
                array(
                    'webhook_id' => $webhook->id,
                    'webhook_data' => $webhook_data,
                    'attempt' => 1
                )
            ));
            
            if ($scheduled) {
                $scheduled_count++;
                
                // ✅ DEBUG: Verificar que el evento se programó correctamente
                $next_scheduled = wp_next_scheduled('sfq_webhook_send', array(
                    array(
                        'webhook_id' => $webhook->id,
                        'webhook_data' => $webhook_data,
                        'attempt' => 1
                    )
                ));
                
                // ✅ NUEVO: Para ejecución inmediata, forzar ejecución directa
                // Esto asegura que el webhook se ejecute incluso si WP Cron no funciona inmediatamente
                if ($execution_time <= time()) {
                    
                    // Ejecutar inmediatamente en paralelo
                    $this->handle_webhook_send(array(
                        'webhook_id' => $webhook->id,
                        'webhook_data' => $webhook_data,
                        'attempt' => 1
                    ));
                    
                    // Limpiar el evento programado ya que lo ejecutamos manualmente
                    wp_unschedule_event($execution_time, 'sfq_webhook_send', array(
                        array(
                            'webhook_id' => $webhook->id,
                            'webhook_data' => $webhook_data,
                            'attempt' => 1
                        )
                    ));
                    
                }
                
            } else {
                
                // ✅ CORREGIDO: Solo ejecutar fallback si realmente es necesario
                // Verificar si WP Cron está completamente deshabilitado
                $cron_disabled = defined('DISABLE_WP_CRON') && DISABLE_WP_CRON;
                
                if ($cron_disabled) {
                    $this->handle_webhook_send(array(
                        'webhook_id' => $webhook->id,
                        'webhook_data' => $webhook_data,
                        'attempt' => 1
                    ));
                } else {
                }
            }
        }
        
    }
    
    /**
     * Manejar envío asíncrono de webhook
     */
    public function handle_webhook_send($args) {
        // ✅ DEBUG: Log detallado del handler asíncrono
        
        if (!is_array($args)) {
            return;
        }
        
        
        if (!isset($args['webhook_id'])) {
            return;
        }
        
        if (!isset($args['webhook_data'])) {
            return;
        }
        
        $webhook_id = $args['webhook_id'];
        $attempt = $args['attempt'] ?? 1;
        
        
        
        $this->send_webhook(
            $webhook_id,
            $args['webhook_data'],
            $attempt
        );
        
    }
    
    /**
     * Preparar datos para enviar al webhook
     */
    private function prepare_webhook_data($form_id, $submission_id) {
        global $wpdb;
        
        // Obtener datos del formulario
        $database = new SFQ_Database();
        $form = $database->get_form($form_id);
        
        if (!$form) {
            return false;
        }
        
        // Obtener datos del submission
        $submission = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}sfq_submissions WHERE id = %d",
            $submission_id
        ));
        
        if (!$submission) {
            return false;
        }
        
        // Obtener respuestas
        $responses = $wpdb->get_results($wpdb->prepare(
            "SELECT r.*, q.question_text, q.question_type, q.options
            FROM {$wpdb->prefix}sfq_responses r
            JOIN {$wpdb->prefix}sfq_questions q ON r.question_id = q.id
            WHERE r.submission_id = %d
            ORDER BY q.order_position",
            $submission_id
        ));
        
        // Procesar respuestas
        $processed_responses = array();
        foreach ($responses as $response) {
            $answer = $response->answer;
            
            // Intentar decodificar JSON si es necesario
            $decoded_answer = json_decode($answer, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded_answer)) {
                $answer = $decoded_answer;
            }
            
            $processed_responses[] = array(
                'question_id' => intval($response->question_id),
                'question_text' => $response->question_text,
                'question_type' => $response->question_type,
                'answer' => $answer,
                'score' => intval($response->score)
            );
        }
        
        // Decodificar variables si existen
        $variables = array();
        if (!empty($submission->variables)) {
            $decoded_variables = json_decode($submission->variables, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded_variables)) {
                $variables = $decoded_variables;
            }
        }
        
        // Obtener información del usuario si existe
        $user_info = null;
        if ($submission->user_id) {
            $user = get_user_by('id', $submission->user_id);
            if ($user) {
                $user_info = array(
                    'id' => $user->ID,
                    'username' => $user->user_login,
                    'email' => $user->user_email,
                    'display_name' => $user->display_name
                );
            }
        }
        
        // Construir payload del webhook
        $webhook_data = array(
            'event' => 'form_submitted',
            'timestamp' => current_time('c'), // ISO 8601 format
            'site' => array(
                'name' => get_bloginfo('name'),
                'url' => home_url(),
                'admin_email' => get_option('admin_email')
            ),
            'form' => array(
                'id' => intval($form->id),
                'title' => $form->title,
                'description' => $form->description,
                'type' => $form->type,
                'status' => $form->status
            ),
            'submission' => array(
                'id' => intval($submission->id),
                'user_id' => $submission->user_id ? intval($submission->user_id) : null,
                'user_ip' => $submission->user_ip,
                'user_agent' => $submission->user_agent,
                'total_score' => intval($submission->total_score),
                'status' => $submission->status,
                'started_at' => $submission->started_at,
                'completed_at' => $submission->completed_at,
                'time_spent' => intval($submission->time_spent)
            ),
            'user' => $user_info,
            'responses' => $processed_responses,
            'variables' => $variables,
            'meta' => array(
                'plugin_version' => SFQ_VERSION ?? '1.0.0',
                'wordpress_version' => get_bloginfo('version'),
                'total_questions' => count($processed_responses),
                'response_count' => count($processed_responses)
            )
        );
        
        return $webhook_data;
    }
    
    /**
     * Enviar webhook (ejecutado de forma asíncrona)
     */
    public function send_webhook($webhook_id, $webhook_data, $attempt = 1) {
        global $wpdb;
        
        // Verificar rate limiting
        if (!SFQ_Security::check_rate_limit('webhook_send_' . $webhook_id, 10, 60)) {
            return;
        }
        
        // Obtener configuración del webhook
        $webhook = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$this->webhook_table} WHERE id = %d AND is_active = 1",
            $webhook_id
        ));
        
        if (!$webhook) {
            return;
        }
        
        // Validar URL para prevenir SSRF
        if (!$this->validate_webhook_url($webhook->url)) {
            return;
        }
        
        $start_time = microtime(true);
        $log_data = array(
            'webhook_id' => $webhook_id,
            'form_id' => $webhook_data['form']['id'],
            'submission_id' => $webhook_data['submission']['id'],
            'event_type' => $webhook_data['event'],
            'url' => $webhook->url,
            'method' => $webhook->method,
            'retry_count' => $attempt - 1
        );
        
        try {
            // Preparar headers
            $headers = array(
                'Content-Type' => 'application/json',
                'User-Agent' => 'Smart-Forms-Quiz-Webhook/' . (SFQ_VERSION ?? '1.0.0') . ' (WordPress/' . get_bloginfo('version') . ')'
            );
            
            // Añadir headers personalizados
            if (!empty($webhook->headers)) {
                $custom_headers = json_decode($webhook->headers, true);
                if (is_array($custom_headers) && !empty($custom_headers)) {
                    // Validar y sanitizar headers personalizados
                    foreach ($custom_headers as $header_name => $header_value) {
                        // Validar nombre del header
                        if (is_string($header_name) && is_string($header_value) && 
                            !empty(trim($header_name)) && !empty(trim($header_value))) {
                            
                            // Sanitizar nombre del header (solo caracteres válidos para HTTP headers)
                            $clean_header_name = preg_replace('/[^a-zA-Z0-9\-_]/', '', trim($header_name));
                            $clean_header_value = trim($header_value);
                            
                            if (!empty($clean_header_name) && !empty($clean_header_value)) {
                                // Evitar sobrescribir headers críticos del sistema
                                $protected_headers = ['host', 'content-length', 'connection', 'transfer-encoding'];
                                if (!in_array(strtolower($clean_header_name), $protected_headers)) {
                                    $headers[$clean_header_name] = $clean_header_value;
                                }
                            }
                        }
                    }
                }
            }
            
            // Añadir autenticación
            $headers = $this->add_authentication($headers, $webhook);
            
            // Preparar argumentos para wp_remote_request
            $args = array(
                'method' => strtoupper($webhook->method),
                'headers' => $headers,
                'body' => wp_json_encode($webhook_data),
                'timeout' => intval($webhook->timeout),
                'sslverify' => (bool) $webhook->verify_ssl,
                'user-agent' => $headers['User-Agent']
            );
            
            $log_data['request_headers'] = wp_json_encode($headers);
            $log_data['request_body'] = $args['body'];
            
            // Enviar petición
            $response = wp_remote_request($webhook->url, $args);
            $execution_time = microtime(true) - $start_time;
            
            // Procesar respuesta
            if (is_wp_error($response)) {
                throw new Exception('Error de conexión: ' . $response->get_error_message());
            }
            
            $response_code = wp_remote_retrieve_response_code($response);
            $response_headers = wp_remote_retrieve_headers($response);
            $response_body = wp_remote_retrieve_body($response);
            
            $log_data['response_code'] = $response_code;
            $log_data['response_headers'] = wp_json_encode($response_headers);
            $log_data['response_body'] = $response_body;
            $log_data['execution_time'] = round($execution_time, 3);
            
            // Verificar si fue exitoso
            if ($response_code >= 200 && $response_code < 300) {
                $log_data['status'] = 'success';
                $this->log_webhook_attempt($log_data);
                
            } else {
                throw new Exception('Código de respuesta HTTP: ' . $response_code . '. Respuesta: ' . $response_body);
            }
            
        } catch (Exception $e) {
            $execution_time = microtime(true) - $start_time;
            
            $log_data['status'] = 'failed';
            $log_data['error_message'] = $e->getMessage();
            $log_data['execution_time'] = round($execution_time, 3);
            
            // Programar reintento si no hemos alcanzado el máximo
            if ($attempt < intval($webhook->max_retries)) {
                // Backoff exponencial real: delay * (2^attempt)
                $exponential_delay = intval($webhook->retry_delay) * pow(2, $attempt - 1);
                // Añadir jitter aleatorio para evitar thundering herd
                $jitter = rand(0, min(30, $exponential_delay * 0.1));
                $next_retry = time() + $exponential_delay + $jitter;
                
                $log_data['next_retry_at'] = date('Y-m-d H:i:s', $next_retry);
                
                // Programar reintento
                wp_schedule_single_event($next_retry, 'sfq_webhook_retry', array(
                    'log_id' => $this->log_webhook_attempt($log_data)
                ));
                
                // Log sin información sensible
            } else {
                $this->log_webhook_attempt($log_data);
            }
        }
    }
    
    /**
     * Añadir autenticación a los headers
     */
    private function add_authentication($headers, $webhook) {
        if (empty($webhook->auth_type) || $webhook->auth_type === 'none') {
            return $headers;
        }
        
        // Descifrar datos de autenticación
        $encrypted_auth_data = $webhook->auth_data;
        $decrypted_auth_data = $this->decrypt_data($encrypted_auth_data);
        
        if (empty($decrypted_auth_data)) {
            // Fallback para datos no cifrados (compatibilidad hacia atrás)
            $auth_data = json_decode($webhook->auth_data, true);
        } else {
            $auth_data = json_decode($decrypted_auth_data, true);
        }
        
        if (!is_array($auth_data)) {
            return $headers;
        }
        
        switch ($webhook->auth_type) {
            case 'bearer':
                if (!empty($auth_data['token'])) {
                    $headers['Authorization'] = 'Bearer ' . $auth_data['token'];
                }
                break;
                
            case 'basic':
                if (!empty($auth_data['username']) && !empty($auth_data['password'])) {
                    $headers['Authorization'] = 'Basic ' . base64_encode($auth_data['username'] . ':' . $auth_data['password']);
                }
                break;
                
            case 'api_key':
                if (!empty($auth_data['key']) && !empty($auth_data['value'])) {
                    $headers[$auth_data['key']] = $auth_data['value'];
                }
                break;
        }
        
        return $headers;
    }
    
    /**
     * Guardar webhook con datos cifrados
     */
    public function save_webhook($webhook_data) {
        global $wpdb;
        
        // Validar URL
        if (!$this->validate_webhook_url($webhook_data['url'])) {
            return array(
                'success' => false,
                'message' => 'URL no válida o potencialmente peligrosa'
            );
        }
        
        // Cifrar datos de autenticación si existen
        if (!empty($webhook_data['auth_data'])) {
            $webhook_data['auth_data'] = $this->encrypt_data($webhook_data['auth_data']);
        }
        
        // Preparar datos para inserción/actualización
        $data = array(
            'name' => sanitize_text_field($webhook_data['name']),
            'url' => esc_url_raw($webhook_data['url']),
            'method' => sanitize_text_field($webhook_data['method']),
            'headers' => sanitize_textarea_field($webhook_data['headers']),
            'auth_type' => sanitize_text_field($webhook_data['auth_type']),
            'auth_data' => $webhook_data['auth_data'],
            'form_filters' => sanitize_textarea_field($webhook_data['form_filters']),
            'timeout' => intval($webhook_data['timeout']),
            'max_retries' => intval($webhook_data['max_retries']),
            'retry_delay' => intval($webhook_data['retry_delay']),
            'verify_ssl' => isset($webhook_data['verify_ssl']) ? 1 : 0,
            'is_active' => isset($webhook_data['is_active']) ? 1 : 0
        );
        
        if (isset($webhook_data['id']) && $webhook_data['id'] > 0) {
            // Actualizar webhook existente
            $data['updated_at'] = current_time('mysql');
            $result = $wpdb->update(
                $this->webhook_table,
                $data,
                array('id' => intval($webhook_data['id']))
            );
            $webhook_id = $webhook_data['id'];
        } else {
            // Crear nuevo webhook
            $result = $wpdb->insert($this->webhook_table, $data);
            $webhook_id = $wpdb->insert_id;
        }
        
        if ($result === false) {
            return array(
                'success' => false,
                'message' => 'Error al guardar webhook en la base de datos'
            );
        }
        
        return array(
            'success' => true,
            'message' => 'Webhook guardado correctamente',
            'webhook_id' => $webhook_id
        );
    }
    
    /**
     * Verificar si un webhook debe procesar un formulario específico
     */
    private function should_process_form($webhook, $form_id) {
        if (empty($webhook->form_filters)) {
            return true; // Sin filtros = procesar todos
        }
        
        $filters = json_decode($webhook->form_filters, true);
        if (!is_array($filters)) {
            return true;
        }
        
        // Si hay filtros específicos de formularios
        if (isset($filters['form_ids']) && is_array($filters['form_ids'])) {
            return in_array($form_id, array_map('intval', $filters['form_ids']));
        }
        
        // Si hay filtros por tipo de formulario
        if (isset($filters['form_types']) && is_array($filters['form_types'])) {
            $database = new SFQ_Database();
            $form = $database->get_form($form_id);
            return $form && in_array($form->type, $filters['form_types']);
        }
        
        return true;
    }
    
    /**
     * Obtener webhooks activos
     */
    private function get_active_webhooks() {
        global $wpdb;
        
        return $wpdb->get_results(
            "SELECT * FROM {$this->webhook_table} WHERE is_active = 1 ORDER BY id ASC"
        );
    }
    
    /**
     * Registrar intento de webhook en logs
     */
    private function log_webhook_attempt($log_data) {
        global $wpdb;
        
        $result = $wpdb->insert($this->logs_table, $log_data);
        
        if ($result === false) {
            return false;
        }
        
        return $wpdb->insert_id;
    }
    
    /**
     * Reintentar webhook fallido
     */
    public function retry_failed_webhook($log_id) {
        global $wpdb;
        
        // Obtener datos del log
        $log = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$this->logs_table} WHERE id = %d",
            $log_id
        ));
        
        if (!$log || $log->status !== 'failed') {
            return;
        }
        
        // Reconstruir datos del webhook
        $webhook_data = json_decode($log->request_body, true);
        if (!$webhook_data) {
            return;
        }
        
        // Enviar reintento
        $this->send_webhook($log->webhook_id, $webhook_data, $log->retry_count + 2);
    }
    
    /**
     * Limpiar logs antiguos
     */
    public function cleanup_old_logs() {
        global $wpdb;
        
        // Eliminar logs exitosos más antiguos de 30 días
        $deleted_success = $wpdb->query(
            "DELETE FROM {$this->logs_table} 
            WHERE status = 'success' AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)"
        );
        
        // Eliminar logs fallidos más antiguos de 90 días
        $deleted_failed = $wpdb->query(
            "DELETE FROM {$this->logs_table} 
            WHERE status = 'failed' AND created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)"
        );
        
    }
    
    /**
     * Obtener estadísticas de webhooks
     */
    public function get_webhook_stats($webhook_id = null, $days = 7) {
        global $wpdb;
        
        $where_clause = "WHERE created_at >= DATE_SUB(NOW(), INTERVAL %d DAY)";
        $params = array($days);
        
        if ($webhook_id) {
            $where_clause .= " AND webhook_id = %d";
            $params[] = $webhook_id;
        }
        
        // Estadísticas generales
        $stats = $wpdb->get_row($wpdb->prepare(
            "SELECT 
                COUNT(*) as total_attempts,
                SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                AVG(execution_time) as avg_execution_time,
                MAX(execution_time) as max_execution_time
            FROM {$this->logs_table} 
            {$where_clause}",
            $params
        ));
        
        // Tasa de éxito
        $success_rate = 0;
        if ($stats->total_attempts > 0) {
            $success_rate = round(($stats->successful / $stats->total_attempts) * 100, 2);
        }
        
        return array(
            'total_attempts' => intval($stats->total_attempts),
            'successful' => intval($stats->successful),
            'failed' => intval($stats->failed),
            'success_rate' => $success_rate,
            'avg_execution_time' => round(floatval($stats->avg_execution_time), 3),
            'max_execution_time' => round(floatval($stats->max_execution_time), 3)
        );
    }
    
    /**
     * Probar webhook con datos de ejemplo
     */
    public function test_webhook($webhook_id) {
        global $wpdb;
        
        // Obtener configuración del webhook
        $webhook = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$this->webhook_table} WHERE id = %d",
            $webhook_id
        ));
        
        if (!$webhook) {
            return array(
                'success' => false,
                'message' => 'Webhook no encontrado'
            );
        }
        
        // Crear datos de prueba
        $test_data = array(
            'event' => 'webhook_test',
            'timestamp' => current_time('c'),
            'site' => array(
                'name' => get_bloginfo('name'),
                'url' => home_url(),
                'admin_email' => get_option('admin_email')
            ),
            'form' => array(
                'id' => 999,
                'title' => 'Formulario de Prueba',
                'description' => 'Este es un webhook de prueba',
                'type' => 'form',
                'status' => 'active'
            ),
            'submission' => array(
                'id' => 999,
                'user_id' => null,
                'user_ip' => '127.0.0.1',
                'user_agent' => 'Test User Agent',
                'total_score' => 0,
                'status' => 'completed',
                'started_at' => current_time('mysql'),
                'completed_at' => current_time('mysql'),
                'time_spent' => 60
            ),
            'user' => null,
            'responses' => array(
                array(
                    'question_id' => 1,
                    'question_text' => '¿Cuál es tu nombre?',
                    'question_type' => 'text',
                    'answer' => 'Usuario de Prueba',
                    'score' => 0
                )
            ),
            'variables' => array(),
            'meta' => array(
                'plugin_version' => SFQ_VERSION ?? '1.0.0',
                'wordpress_version' => get_bloginfo('version'),
                'total_questions' => 1,
                'response_count' => 1,
                'is_test' => true
            )
        );
        
        // Enviar webhook de prueba
        try {
            $this->send_webhook($webhook_id, $test_data, 1);
            
            return array(
                'success' => true,
                'message' => 'Webhook de prueba enviado correctamente'
            );
        } catch (Exception $e) {
            return array(
                'success' => false,
                'message' => 'Error al enviar webhook de prueba: ' . $e->getMessage()
            );
        }
    }
}
