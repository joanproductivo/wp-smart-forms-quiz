# Análisis Detallado del Flujo de Webhooks en Smart Forms Quiz

## Introducción

Este documento analiza al detalle y profundamente cómo se envía la información por webhook cuando se envía un formulario en el plugin Smart Forms Quiz. El análisis cubre todo el flujo desde el frontend hasta el envío final al endpoint externo.

## Arquitectura General del Sistema

### Componentes Principales

1. **Frontend JavaScript** (`assets/js/frontend.js`)
   - Maneja la interacción del usuario
   - Recopila respuestas del formulario
   - Envía datos al backend vía AJAX

2. **Controlador AJAX** (`includes/class-sfq-ajax.php`)
   - Procesa las peticiones del frontend
   - Valida y sanitiza los datos
   - Dispara el hook para webhooks

3. **Sistema de Webhooks** (`includes/class-sfq-webhooks.php`)
   - Gestiona la configuración de webhooks
   - Procesa y envía datos a endpoints externos
   - Maneja reintentos y logging

4. **Panel de Administración** (`includes/admin/class-sfq-webhook-admin.php`)
   - Interfaz para configurar webhooks
   - Gestión de logs y estadísticas

## Flujo Detallado Paso a Paso

### FASE 1: Recopilación de Datos en el Frontend

#### 1.1 Inicialización del Formulario
```javascript
// En frontend.js - Constructor de SmartFormQuiz
constructor(container) {
    this.container = container;
    this.formId = container.dataset.formId;
    this.sessionId = container.dataset.sessionId;
    this.responses = {};
    this.variables = {};
    this.startTime = Date.now();
}
```

**Datos inicializados:**
- `formId`: ID único del formulario
- `sessionId`: ID de sesión único para tracking
- `responses`: Objeto para almacenar respuestas del usuario
- `variables`: Objeto para variables calculadas
- `startTime`: Timestamp de inicio para calcular tiempo total

#### 1.2 Captura de Respuestas del Usuario

**Para respuestas de opción única:**
```javascript
async handleSingleChoice(e) {
    const card = e.currentTarget;
    const questionContainer = card.closest('.sfq-single-choice');
    const questionId = questionContainer.dataset.questionId;
    
    // Guardar respuesta
    this.responses[questionId] = card.dataset.value;
    
    // Procesar condiciones inmediatamente
    const redirectResult = await this.processConditionsImmediate(card, questionId);
    
    // Actualizar variables si las hay
    if (redirectResult && redirectResult.variables) {
        this.variables = { ...redirectResult.variables };
        this.updateVariablesInDOM();
    }
}
```

**Para respuestas múltiples:**
```javascript
async handleMultipleChoice(e) {
    const checkbox = e.target;
    const questionContainer = checkbox.closest('.sfq-multiple-choice');
    const questionId = questionContainer.dataset.questionId;

    // Guardar respuestas múltiples
    const selectedValues = [];
    questionContainer.querySelectorAll('.sfq-checkbox-input:checked').forEach(cb => {
        selectedValues.push(cb.value);
    });
    this.responses[questionId] = selectedValues;
}
```

**Para elementos freestyle:**
```javascript
handleFreestyleInput(e) {
    const input = e.target;
    const elementId = input.id.replace('element_', '');
    const questionContainer = input.closest('.sfq-freestyle-container');
    const questionId = questionContainer.dataset.questionId;

    // Inicializar respuesta freestyle si no existe
    if (!this.responses[questionId]) {
        this.responses[questionId] = {};
    }

    this.responses[questionId][elementId] = input.value;
}
```

#### 1.3 Procesamiento de Lógica Condicional

**Evaluación de condiciones locales:**
```javascript
evaluateConditionsForRedirect(conditions, questionId) {
    const answer = this.responses[questionId];
    const result = {
        shouldRedirect: false,
        redirectUrl: null,
        skipToQuestion: null,
        variables: { ...this.variables }
    };
    
    for (const condition of conditions) {
        if (this.evaluateConditionImmediate(condition, answer, questionId)) {
            switch (condition.action_type) {
                case 'add_variable':
                    const varName = condition.action_value;
                    const varAmount = parseInt(condition.variable_amount) || 0;
                    const currentValue = result.variables[varName] || 0;
                    result.variables[varName] = currentValue + varAmount;
                    break;
                    
                case 'redirect_url':
                    result.shouldRedirect = true;
                    result.redirectUrl = condition.action_value;
                    result.markAsCompleted = true;
                    return result;
            }
        }
    }
    
    return result;
}
```

**Verificación con el servidor:**
```javascript
async checkConditionsViaAjax(questionId, answer) {
    const formData = new FormData();
    formData.append('action', 'sfq_get_next_question');
    formData.append('nonce', this.getCurrentNonce());
    formData.append('form_id', this.formId);
    formData.append('current_question_id', questionId);
    formData.append('answer', answer);
    formData.append('variables', JSON.stringify(this.variables));

    const response = await fetch(this.config.ajaxUrl, {
        method: 'POST',
        body: formData,
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
    });

    const ajaxResult = await response.json();
    
    if (ajaxResult.success && ajaxResult.data) {
        if (ajaxResult.data.variables) {
            this.variables = { ...ajaxResult.data.variables };
        }
        
        if (ajaxResult.data.redirect_url) {
            return {
                shouldRedirect: true,
                redirectUrl: ajaxResult.data.redirect_url,
                markAsCompleted: true
            };
        }
    }
}
```

### FASE 2: Envío del Formulario

#### 2.1 Preparación de Datos para Envío

```javascript
async submitForm() {
    // Calcular tiempo total
    const totalTime = Math.floor((Date.now() - this.startTime) / 1000);

    // Preparar datos
    const formData = new FormData();
    formData.append('action', 'sfq_submit_response');
    formData.append('nonce', sfq_ajax.nonce);
    formData.append('form_id', this.formId);
    formData.append('session_id', this.sessionId);
    formData.append('responses', JSON.stringify(this.responses));
    formData.append('variables', JSON.stringify(this.variables));
    formData.append('time_spent', totalTime);

    const response = await fetch(sfq_ajax.ajax_url, {
        method: 'POST',
        body: formData
    });
}
```

**Estructura de datos enviados:**
- `action`: 'sfq_submit_response'
- `nonce`: Token de seguridad
- `form_id`: ID del formulario
- `session_id`: ID de sesión único
- `responses`: JSON con todas las respuestas del usuario
- `variables`: JSON con variables calculadas
- `time_spent`: Tiempo total en segundos

### FASE 3: Procesamiento en el Backend (AJAX)

#### 3.1 Validación y Seguridad

```php
// En class-sfq-ajax.php - método submit_response()
public function submit_response() {
    // Verificar nonce
    if (!check_ajax_referer('sfq_nonce', 'nonce', false)) {
        wp_send_json_error(__('Error de seguridad', 'smart-forms-quiz'));
        return;
    }
    
    // Verificar rate limiting
    if (!SFQ_Security::check_rate_limit('submit_response')) {
        wp_send_json_error(array(
            'message' => __('Demasiadas peticiones. Intenta de nuevo en un momento.', 'smart-forms-quiz'),
            'code' => 'RATE_LIMIT_EXCEEDED'
        ));
        return;
    }
    
    // Validar datos requeridos
    $form_id = intval($_POST['form_id'] ?? 0);
    $session_id = sanitize_text_field($_POST['session_id'] ?? '');
    
    if (!$form_id || !$session_id) {
        wp_send_json_error(__('Datos del formulario incompletos', 'smart-forms-quiz'));
        return;
    }
}
```

#### 3.2 Verificación de Límites

```php
// Verificación de límites de envío
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
```

#### 3.3 Procesamiento y Almacenamiento

```php
// Decodificar datos JSON
$responses = json_decode(stripslashes($_POST['responses'] ?? '{}'), true);
$variables = json_decode(stripslashes($_POST['variables'] ?? '{}'), true);

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

$submission_id = $wpdb->insert_id;
```

#### 3.4 Procesamiento de Respuestas Complejas

```php
// Guardar respuestas individuales
foreach ($responses as $question_id => $answer) {
    // Procesar la respuesta según su tipo
    $processed_answer = $this->process_answer_for_storage($answer, $submission_id, $question_id);
    
    $response_data = array(
        'submission_id' => $submission_id,
        'question_id' => intval($question_id),
        'answer' => $processed_answer,
        'score' => $this->calculate_answer_score($question_id, $answer)
    );
    
    $wpdb->insert(
        $wpdb->prefix . 'sfq_responses',
        $response_data,
        array('%d', '%d', '%s', '%d')
    );
}
```

**Procesamiento especial para archivos subidos:**
```php
private function process_answer_for_storage($answer, $submission_id, $question_id) {
    if (is_array($answer)) {
        $processed_answer = array();
        
        foreach ($answer as $element_id => $element_value) {
            // Verificar si el elemento contiene archivos subidos
            if (is_array($element_value) && $this->is_uploaded_files_array($element_value)) {
                // Procesar archivos subidos y crear registro de relación
                $processed_files = $this->process_uploaded_files($element_value, $submission_id, $question_id, $element_id);
                $processed_answer[$element_id] = $processed_files;
            } else {
                $processed_answer[$element_id] = sanitize_textarea_field($element_value);
            }
        }
        
        return json_encode($processed_answer, JSON_UNESCAPED_UNICODE);
    } else {
        return sanitize_textarea_field($answer);
    }
}
```

### FASE 4: Activación del Sistema de Webhooks

#### 4.1 Disparar Hook de WordPress

```php
// Al final del procesamiento exitoso en submit_response()
// Disparar hook para webhooks
do_action('sfq_form_submitted', $form_id, $submission_id);
```

#### 4.2 Captura del Hook por el Sistema de Webhooks

```php
// En class-sfq-webhooks.php - método init()
public function init() {
    // Hook para cuando se envía un formulario
    add_action('sfq_form_submitted', array($this, 'trigger_webhook'), 10, 2);
}

// Método que maneja el hook
public function trigger_webhook($form_id, $submission_id) {
    // Obtener webhooks activos
    $webhooks = $this->get_active_webhooks();
    
    if (empty($webhooks)) {
        return;
    }
    
    // Obtener datos del formulario y submission
    $webhook_data = $this->prepare_webhook_data($form_id, $submission_id);
    
    if (!$webhook_data) {
        error_log('SFQ Webhooks: No se pudieron obtener datos para form_id=' . $form_id . ', submission_id=' . $submission_id);
        return;
    }
    
    // Enviar a cada webhook configurado
    foreach ($webhooks as $webhook) {
        // Verificar si este webhook debe procesar este formulario
        if (!$this->should_process_form($webhook, $form_id)) {
            continue;
        }
        
        // Programar envío asíncrono
        wp_schedule_single_event(time(), 'sfq_webhook_send', array(
            array(
                'webhook_id' => $webhook->id,
                'webhook_data' => $webhook_data,
                'attempt' => 1
            )
        ));
    }
}
```

### FASE 5: Preparación de Datos del Webhook

#### 5.1 Recopilación de Datos Completos

```php
private function prepare_webhook_data($form_id, $submission_id) {
    global $wpdb;
    
    // Obtener datos del formulario
    $database = new SFQ_Database();
    $form = $database->get_form($form_id);
    
    // Obtener datos del submission
    $submission = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}sfq_submissions WHERE id = %d",
        $submission_id
    ));
    
    // Obtener respuestas detalladas
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
}
```

#### 5.2 Estructura Final del Payload

```php
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
```

### FASE 6: Envío Asíncrono del Webhook

#### 6.1 Procesamiento Asíncrono

```php
// El webhook se envía de forma asíncrona usando WordPress Cron
public function handle_webhook_send($args) {
    if (!is_array($args) || !isset($args['webhook_id']) || !isset($args['webhook_data'])) {
        error_log('SFQ Webhooks: Argumentos inválidos para handle_webhook_send');
        return;
    }
    
    $this->send_webhook(
        $args['webhook_id'],
        $args['webhook_data'],
        $args['attempt'] ?? 1
    );
}
```

#### 6.2 Validaciones de Seguridad

```php
public function send_webhook($webhook_id, $webhook_data, $attempt = 1) {
    global $wpdb;
    
    // Verificar rate limiting
    if (!SFQ_Security::check_rate_limit('webhook_send_' . $webhook_id, 10, 60)) {
        error_log('SFQ Webhooks: Rate limit excedido para webhook ' . $webhook_id);
        return;
    }
    
    // Obtener configuración del webhook
    $webhook = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$this->webhook_table} WHERE id = %d AND is_active = 1",
        $webhook_id
    ));
    
    if (!$webhook) {
        error_log('SFQ Webhooks: Webhook no encontrado o inactivo: ' . $webhook_id);
        return;
    }
    
    // Validar URL para prevenir SSRF
    if (!$this->validate_webhook_url($webhook->url)) {
        error_log('SFQ Webhooks: URL no válida o peligrosa: ' . $webhook->url);
        return;
    }
}
```

#### 6.3 Validación de URLs (Seguridad SSRF)

```php
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
    
    // Verificar whitelist de URLs confiables
    if ($this->is_url_in_whitelist($url)) {
        return true;
    }
    
    // Verificar si está en modo desarrollo
    $dev_mode = get_option('sfq_webhook_dev_mode', false);
    if ($dev_mode && $this->is_local_url($url)) {
        error_log('SFQ Webhooks: ADVERTENCIA - URL local permitida en modo desarrollo: ' . $url);
        return true;
    }
    
    // Resolver IP para verificar que no sea interna
    $ip = gethostbyname($parsed['host']);
    
    // Bloquear IPs privadas y localhost
    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
        return false;
    }
    
    return true;
}
```

#### 6.4 Preparación de Headers y Autenticación

```php
// Preparar headers
$headers = array(
    'Content-Type' => 'application/json',
    'User-Agent' => 'Smart-Forms-Quiz-Webhook/' . (SFQ_VERSION ?? '1.0.0') . ' (WordPress/' . get_bloginfo('version') . ')'
);

// Añadir headers personalizados
if (!empty($webhook->headers)) {
    $custom_headers = json_decode($webhook->headers, true);
    if (is_array($custom_headers)) {
        $headers = array_merge($headers, $custom_headers);
    }
}

// Añadir autenticación
$headers = $this->add_authentication($headers, $webhook);
```

**Procesamiento de autenticación:**
```php
private function add_authentication($headers, $webhook) {
    if (empty($webhook->auth_type) || $webhook->auth_type === 'none') {
        return $headers;
    }
    
    // Descifrar datos de autenticación
    $decrypted_auth_data = $this->decrypt_data($webhook->auth_data);
    $auth_data = json_decode($decrypted_auth_data, true);
    
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
```

### FASE 7: Envío HTTP Final

#### 7.1 Configuración de la Petición

```php
// Preparar argumentos para wp_remote_request
$args = array(
    'method' => strtoupper($webhook->method),
    'headers' => $headers,
    'body' => wp_json_encode($webhook_data),
    'timeout' => intval($webhook->timeout),
    'sslverify' => (bool) $webhook->verify_ssl,
    'user-agent' => $headers['User-Agent']
);

$log_data = array(
    'webhook_id' => $webhook_id,
    'form_id' => $webhook_data['form']['id'],
    'submission_id' => $webhook_data['submission']['id'],
    'event_type' => $webhook_data['event'],
    'url' => $webhook->url,
    'method' => $webhook->method,
    'retry_count' => $attempt - 1,
    'request_headers' => wp_json_encode($headers),
    'request_body' => $args['body']
);
```

#### 7.2 Envío y Manejo de Respuesta

```php
try {
    $start_time = microtime(true);
    
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
        
        error_log('SFQ Webhooks: Enviado exitosamente a ' . $webhook->url . ' (código: ' . $response_code . ')');
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
        // Backoff exponencial: delay * (2^attempt)
        $exponential_delay = intval($webhook->retry_delay) * pow(2, $attempt - 1);
        $jitter = rand(0, min(30, $exponential_delay * 0.1));
        $next_retry = time() + $exponential_delay + $jitter;
        
        $log_data['next_retry_at'] = date('Y-m-d H:i:s', $next_retry);
        
        // Programar reintento
        wp_schedule_single_event($next_retry, 'sfq_webhook_retry', array(
            'log_id' => $this->log_webhook_attempt($log_data)
        ));
    } else {
        $this->log_webhook_attempt($log_data);
        error_log('SFQ Webhooks: Falló definitivamente después de ' . $webhook->max_retries . ' intentos');
    }
}
```

### FASE 8: Sistema de Reintentos

#### 8.1 Backoff Exponencial

```php
// Cálculo del retraso con backoff exponencial
$exponential_delay = intval($webhook->retry_delay) * pow(2, $attempt - 1);

// Añadir jitter aleatorio para evitar thundering herd
$jitter = rand(0, min(30, $exponential_delay * 0.1));
$next_retry = time() + $exponential_delay + $jitter;
```

**Ejemplo de tiempos de reintento:**
- Intento 1: Inmediato
- Intento 2: 300 segundos (5 minutos) + jitter
- Intento 3: 600 segundos (10 minutos) + jitter  
- Intento 4: 1200 segundos (20 minutos) + jitter

#### 8.2 Procesamiento de Reintentos

```php
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
        error_log('SFQ Webhooks: No se pudieron decodificar datos para reintento del log ' . $log_id);
        return;
    }
    
    // Enviar reintento
    $this->send_webhook($log->webhook_id, $webhook_data, $log->retry_count + 2);
}
```

### FASE 9: Logging y Monitoreo

#### 9.1 Registro de Intentos

```php
private function log_webhook_attempt($log_data) {
    global $wpdb;
    
    $result = $wpdb->insert($this->logs_table, $log_data);
    
    if ($result === false) {
        error_log('SFQ Webhooks: Error al guardar log: ' . $wpdb->last_error);
        return false;
    }
    
    return $wpdb->insert_id;
}
```

#### 9.2 Estructura de Logs

**Tabla `wp_sfq_webhook_logs`:**
- `id`: ID único del log
- `webhook_id`: ID del webhook
- `form_id`: ID del formulario
- `submission_id`: ID del submission
- `event_type`: Tipo de evento ('form_submitted')
- `url`: URL del webhook
- `method`: Método HTTP usado
- `request_headers`: Headers enviados (JSON)
- `request_body`: Cuerpo de la petición (JSON)
- `response_code`: Código de respuesta HTTP
- `response_headers`: Headers de respuesta (JSON)
- `response_body`: Cuerpo de la respuesta
- `execution_time`: Tiempo de ejecución en segundos
- `status`: Estado ('success' o 'failed')
- `error_message`: Mensaje de error si falló
- `retry_count`: Número de reintento
- `next_retry_at`: Fecha del próximo reintento
- `created_at`: Timestamp de creación

#### 9.3 Limpieza Automática de Logs

```php
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
    
    error_log('SFQ Webhooks: Limpieza de logs completada. Eliminados: ' . ($deleted_success + $deleted_failed) . ' registros');
}
```

## Ejemplo Completo de Payload Enviado

### Estructura JSON Completa

```json
{
  "event": "form_submitted",
  "timestamp": "2024-01-15T10:30:00+00:00",
  "site": {
    "name": "Mi Sitio Web",
    "url": "https://mi-sitio.com",
    "admin_email": "admin@mi-sitio.com"
  },
  "form": {
    "id": 123,
    "title": "Formulario de Contacto",
    "description": "Formulario para contactar con nuestro equipo",
    "type": "form",
    "status": "active"
  },
  "submission": {
    "id": 456,
    "user_id": null,
    "user_ip": "192.168.1.100",
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "total_score": 85,
    "status": "completed",
    "started_at": "2024-01-15 10:28:30",
    "completed_at": "2024-01-15 10:30:00",
    "time_spent": 90
  },
  "user": null,
  "responses": [
    {
      "question_id": 1,
      "question_text": "¿Cuál es tu nombre?",
      "question_type": "text",
      "answer": "Juan Pérez",
      "score": 0
    },
    {
      "question_id": 2,
      "question_text": "¿Cuál es tu email?",
      "question_type": "email",
      "answer": "juan@ejemplo.com",
      "score": 0
    },
    {
      "question_id": 3,
      "question_text": "¿Qué servicios te interesan?",
      "question_type": "multiple_choice",
      "answer": ["Desarrollo Web", "SEO", "Marketing Digital"],
      "score": 0
    },
    {
      "question_id": 4,
      "question_text": "Califica nuestro servicio",
      "question_type": "rating",
      "answer": "5",
      "score": 5
    },
    {
      "question_id": 5,
      "question_text": "Información adicional",
      "question_type": "freestyle",
      "answer": {
        "element_123": "clicked",
        "element_124": "Comentarios adicionales del usuario",
        "element_125": [
          {
            "attachment_id": 789,
            "url": "https://mi-sitio.com/wp-content/uploads/2024/01/documento.pdf",
            "filename": "sfq_1705320600_abc123_documento.pdf",
            "original_name": "documento.pdf",
            "size": 245760,
            "type": "application/pdf",
            "is_image": false
          }
        ]
      },
      "score": 0
    }
  ],
  "variables": {
    "score_total": 85,
    "categoria_interes": 30,
    "nivel_satisfaccion": 55,
    "usuario_premium": 1
  },
  "meta": {
    "plugin_version": "1.0.0",
    "wordpress_version": "6.4.2",
    "total_questions": 5,
    "response_count": 5
  }
}
```

## Configuración y Administración

### Panel de Administración

El sistema incluye un panel completo de administración accesible desde:
**WordPress Admin → Smart Forms → Webhooks**

#### Características del Panel:

1. **Configuración de Seguridad**
   - Whitelist de URLs confiables
   - Modo desarrollo para URLs locales
   - Validación SSRF automática

2. **Gestión de Webhooks**
   - Crear, editar y eliminar webhooks
   - Activar/desactivar webhooks individualmente
   - Configuración de autenticación (Bearer, Basic, API Key)
   - Filtros por formularios específicos

3. **Monitoreo y Logs**
   - Visualización de logs detallados
   - Estadísticas de éxito/fallo
   - Tiempos de respuesta
   - Limpieza automática de logs

4. **Pruebas**
   - Función de prueba integrada
   - Envío de datos de ejemplo
   - Verificación de conectividad

### Configuración de Webhook

```php
// Ejemplo de configuración de webhook
$webhook_config = array(
    'name' => 'N8N Formulario Contacto',
    'url' => 'https://n8n.mi-sitio.com/webhook/formulario-contacto',
    'method' => 'POST',
    'auth_type' => 'bearer',
    'auth_data' => json_encode(array(
        'token' => 'mi-token-secreto'
    )),
    'headers' => json_encode(array(
        'X-Custom-Header' => 'valor-personalizado'
    )),
    'form_filters' => json_encode(array(
        'form_ids' => [123, 456] // Solo estos formularios
    )),
    'timeout' => 30,
    'max_retries' => 3,
    'retry_delay' => 300,
    'verify_ssl' => true,
    'is_active' => true
);
```

## Seguridad y Mejores Prácticas

### Medidas de Seguridad Implementadas

1. **Validación SSRF (Server-Side Request Forgery)**
   - Bloqueo de IPs privadas y localhost
   - Whitelist de URLs confiables
   - Validación de esquemas (solo HTTP/HTTPS)
   - Bloqueo de puertos peligrosos

2. **Autenticación y Cifrado**
   - Cifrado AES-256-CBC para datos sensibles
   - Soporte para múltiples tipos de autenticación
   - Headers personalizados seguros

3. **Rate Limiting**
   - Límites por webhook individual
   - Protección contra spam
   - Backoff exponencial en reintentos

4. **Validación de Datos**
   - Sanitización de todos los inputs
   - Validación de JSON
   - Verificación de nonces

### Configuración Recomendada

```php
// Configuración de seguridad recomendada
update_option('sfq_webhook_dev_mode', false); // Solo true en desarrollo
update_option('sfq_webhook_trusted_urls', array(
    'n8n.mi-empresa.com',
    'hooks.zapier.com',
    'hook.integromat.com'
));
```

## Integración con Servicios Externos

### N8N (Recomendado)

```javascript
// Workflow N8N para procesar webhook
{
  "nodes": [
    {
      "name": "Webhook Smart Forms",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "httpMethod": "POST",
        "path": "smart-forms-contacto"
      }
    },
    {
      "name": "Procesar Datos",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": `
          const formData = items[0].json;
          const responses = formData.responses;
          
          // Extraer datos específicos
          const nombre = responses.find(r => r.question_type === 'text')?.answer || '';
          const email = responses.find(r => r.question_type === 'email')?.answer || '';
          const servicios = responses.find(r => r.question_type === 'multiple_choice')?.answer || [];
          const rating = responses.find(r => r.question_type === 'rating')?.answer || 0;
          
          return [{
            json: {
              nombre: nombre,
              email: email,
              servicios: servicios.join(', '),
              rating: parseInt(rating),
              form_id: formData.form.id,
              submission_id: formData.submission.id,
              timestamp: formData.timestamp,
              variables: formData.variables
            }
          }];
        `
      }
    },
    {
      "name": "Enviar Email",
      "type": "n8n-nodes-base.emailSend",
      "parameters": {
        "toEmail": "={{$json.email}}",
        "subject": "Gracias por contactarnos",
        "text": "Hola {{$json.nombre}}, hemos recibido tu consulta sobre: {{$json.servicios}}"
      }
    },
    {
      "name": "Guardar en CRM",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "https://mi-crm.com/api/contacts",
        "headers": {
          "Authorization": "Bearer mi-token-crm"
        },
        "body": {
          "name": "={{$json.nombre}}",
          "email": "={{$json.email}}",
          "services": "={{$json.servicios}}",
          "rating": "={{$json.rating}}",
          "source": "Smart Forms Quiz",
          "form_id": "={{$json.form_id}}"
        }
      }
    }
  ]
}
```

### Zapier

```javascript
// Código Zapier para procesar webhook
const inputData = inputData;
const responses = inputData.responses;

// Crear objeto con datos procesados
const output = {
  nombre: responses.find(r => r.question_type === 'text')?.answer || '',
  email: responses.find(r => r.question_type === 'email')?.answer || '',
  servicios: responses.find(r => r.question_type === 'multiple_choice')?.answer?.join(', ') || '',
  puntuacion: inputData.submission.total_score,
  tiempo_completado: inputData.submission.time_spent,
  formulario: inputData.form.title,
  variables: inputData.variables
};

return [output];
```

### Make.com (Integromat)

```json
{
  "scenario": {
    "name": "Smart Forms Quiz Webhook",
    "modules": [
      {
        "name": "Webhook",
        "type": "webhook",
        "parameters": {
          "hook": "smart-forms-webhook"
        }
      },
      {
        "name": "Router",
        "type": "router",
        "routes": [
          {
            "name": "Formulario Contacto",
            "filter": "{{1.form.id}} = 123",
            "modules": [
              {
                "name": "Enviar Email",
                "type": "email",
                "parameters": {
                  "to": "{{1.responses[1].answer}}",
                  "subject": "Confirmación de contacto",
                  "body": "Gracias {{1.responses[0].answer}} por contactarnos"
                }
              }
            ]
          },
          {
            "name": "Formulario Quiz",
            "filter": "{{1.form.type}} = quiz",
            "modules": [
              {
                "name": "Guardar Resultado",
                "type": "database",
                "parameters": {
                  "table": "quiz_results",
                  "data": {
                    "user": "{{1.responses[0].answer}}",
                    "score": "{{1.submission.total_score}}",
                    "variables": "{{1.variables}}"
                  }
                }
              }
            ]
          }
        ]
      }
    ]
  }
}
```

## Troubleshooting y Debugging

### Problemas Comunes

1. **Webhook no se ejecuta**
   - Verificar que el webhook esté activo
   - Comprobar logs en el panel de administración
   - Verificar que la URL sea accesible
   - Revisar configuración de firewall

2. **Error 403/401**
   - Verificar configuración de autenticación
   - Comprobar que el token no haya expirado
   - Revisar headers personalizados

3. **Timeout**
   - Aumentar el timeout en la configuración
   - Verificar que el endpoint responda rápidamente
   - Comprobar conectividad de red

4. **Datos incompletos**
   - Verificar que todas las preguntas tengan respuesta
   - Comprobar la estructura del JSON recibido
   - Revisar logs para ver el payload exacto enviado

### Debugging Avanzado

```php
// Activar logging detallado
add_action('sfq_before_webhook_send', function($webhook_id, $payload) {
    error_log('SFQ Debug: Enviando webhook ' . $webhook_id);
    error_log('SFQ Debug: Payload: ' . json_encode($payload, JSON_PRETTY_PRINT));
});

add_action('sfq_after_webhook_send', function($webhook_id, $response, $payload) {
    error_log('SFQ Debug: Respuesta webhook ' . $webhook_id . ': ' . json_encode($response));
});

add_action('sfq_webhook_failed', function($webhook_id, $error, $payload) {
    error_log('SFQ Debug: Webhook fallido ' . $webhook_id . ': ' . $error);
});
```

## Conclusión

El sistema de webhooks de Smart Forms Quiz proporciona una solución robusta y segura para integrar formularios con servicios externos. El flujo completo desde la captura de datos en el frontend hasta el envío final al endpoint externo está diseñado para ser:

- **Seguro**: Con validaciones SSRF, cifrado de datos sensibles y rate limiting
- **Confiable**: Con sistema de reintentos, backoff exponencial y logging detallado  
- **Flexible**: Con soporte para múltiples tipos de autenticación y configuración granular
- **Escalable**: Con procesamiento asíncrono y limpieza automática de logs

La arquitectura modular permite fácil mantenimiento y extensión, mientras que el panel de administración proporciona una interfaz intuitiva para la configuración y monitoreo.
