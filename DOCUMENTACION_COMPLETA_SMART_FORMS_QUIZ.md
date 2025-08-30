# Documentación Técnica Completa - Smart Forms & Quiz Plugin

## Tabla de Contenidos

1. [Arquitectura General](#arquitectura-general)
2. [Lógica Condicional](#lógica-condicional)
3. [Variables Globales y Sistema de Sesiones](#variables-globales-y-sistema-de-sesiones)
4. [Base de Datos y Optimizaciones](#base-de-datos-y-optimizaciones)
5. [Sistema de Límites y Restricciones](#sistema-de-límites-y-restricciones)
6. [Tipos de Pregunta y Renderizado](#tipos-de-pregunta-y-renderizado)
7. [Sistema AJAX y Comunicación](#sistema-ajax-y-comunicación)
8. [Requerimientos Técnicos](#requerimientos-técnicos)
9. [Guía de Escalabilidad](#guía-de-escalabilidad)
10. [Cómo Ampliar la Funcionalidad](#cómo-ampliar-la-funcionalidad)

---

## Arquitectura General

### Patrón de Diseño

El plugin utiliza una **arquitectura modular basada en clases** con los siguientes principios:

- **Separación de responsabilidades**: Cada clase tiene una función específica
- **Inyección de dependencias**: Las clases reciben sus dependencias en el constructor
- **Singleton pattern**: Para componentes que requieren una única instancia
- **Observer pattern**: Para hooks y eventos de WordPress

### Estructura de Clases Principales

```
SFQ_Loader (Orquestador principal)
├── SFQ_Admin (Panel de administración)
├── SFQ_Frontend (Renderizado público)
├── SFQ_Ajax (Comunicación asíncrona)
├── SFQ_Database (Gestión de datos)
├── SFQ_Limits (Sistema de restricciones)
├── SFQ_Security (Seguridad y rate limiting)
├── SFQ_Utils (Utilidades compartidas)
├── SFQ_Analytics (Métricas y estadísticas)
└── SFQ_Shortcode (Integración con WordPress)
```

### Flujo de Datos

1. **Inicialización**: `SFQ_Loader` coordina la carga de componentes
2. **Renderizado**: `SFQ_Frontend` genera el HTML del formulario
3. **Interacción**: JavaScript envía datos via AJAX a `SFQ_Ajax`
4. **Procesamiento**: `SFQ_Ajax` evalúa condiciones y guarda datos
5. **Persistencia**: `SFQ_Database` maneja todas las operaciones de BD

### Variables Globales del Sistema

```php
// Constantes principales
define('SFQ_VERSION', '1.5.0');
define('SFQ_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('SFQ_PLUGIN_URL', plugin_dir_url(__FILE__));

// Variables de configuración global
$sfq_global_config = array(
    'max_questions_per_form' => 50,
    'auto_save_interval' => 30, // segundos
    'session_duration' => 86400, // 24 horas
    'cache_timeout' => 300, // 5 minutos
    'rate_limit_window' => 60 // 1 minuto
);
```

---

## Lógica Condicional

### Sistema de Condiciones

El plugin implementa **6 tipos de condiciones** para controlar el flujo del formulario:

#### 1. Condiciones de Respuesta
```php
// Tipos implementados en SFQ_Ajax::evaluate_condition()
'answer_equals'     => 'Si la respuesta es igual a'
'answer_contains'   => 'Si la respuesta contiene'
'answer_not_equals' => 'Si la respuesta no es igual a'
```

#### 2. Condiciones de Variables
```php
'variable_greater' => 'Si la variable es mayor que'
'variable_less'    => 'Si la variable es menor que'
'variable_equals'  => 'Si la variable es igual a'
```

### Sistema de Acciones

**6 tipos de acciones** que se ejecutan cuando se cumple una condición:

```php
// Acciones de navegación
'goto_question' => 'Ir a pregunta específica'
'skip_to_end'   => 'Saltar al final'
'redirect_url'  => 'Redirigir a URL'

// Acciones de contenido
'show_message'  => 'Mostrar mensaje'

// Acciones de variables
'add_variable'  => 'Sumar a variable'
'set_variable'  => 'Establecer variable'
```

### Evaluación de Condiciones

```php
// Método principal en SFQ_Ajax
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
            
        // ... más condiciones
    }
}
```

### Variables del Sistema de Lógica

```php
// Variables globales por formulario
$form_variables = array(
    'score_total'    => 0,    // Puntuación total
    'score_section1' => 0,    // Puntuación por sección
    'user_type'      => '',   // Tipo de usuario detectado
    'completion_time'=> 0,    // Tiempo de completado
    'current_path'   => '',   // Ruta actual del usuario
);

// Variables de sesión
$session_variables = array(
    'session_id'     => '',   // ID único de sesión
    'start_time'     => 0,    // Timestamp de inicio
    'last_activity'  => 0,    // Última actividad
    'form_state'     => '',   // Estado actual del formulario
);
```

---

## Variables Globales y Sistema de Sesiones

### Sistema de Session ID Inteligente

```php
// Implementado en SFQ_Utils::get_or_create_session_id()
public static function get_or_create_session_id($form_id = null) {
    $form_suffix = $form_id ? "_{$form_id}" : '';
    $cookie_name = "sfq_session{$form_suffix}";
    
    // 1. Intentar obtener de cookie
    $stored_session = $_COOKIE[$cookie_name] ?? null;
    
    // 2. Validar sesión existente
    if ($stored_session && self::is_valid_session($stored_session)) {
        return $stored_session;
    }
    
    // 3. Generar nuevo session_id
    $fingerprint = self::generate_user_fingerprint();
    $timestamp = time();
    $session_id = $fingerprint . '_' . $timestamp;
    
    // 4. Guardar en cookie (24 horas)
    setcookie($cookie_name, $session_id, time() + 86400, '/', '', is_ssl(), true);
    
    return $session_id;
}
```

### Fingerprinting de Usuario

```php
// Generación de huella digital única
public static function generate_user_fingerprint() {
    $components = array(
        self::get_user_ip(),
        $_SERVER['HTTP_USER_AGENT'] ?? '',
        $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '',
        $_SERVER['HTTP_ACCEPT_ENCODING'] ?? '',
        date('Y-m') // Renovar mensualmente para privacidad
    );
    
    return 'fp_' . md5(implode('|', array_filter($components)));
}
```

### Variables de Estado Global

```php
// Variables persistentes por formulario
$global_form_state = array(
    'current_question_id' => 0,
    'answered_questions'  => array(),
    'skipped_questions'   => array(),
    'variables'          => array(),
    'start_timestamp'    => 0,
    'last_save'         => 0,
    'completion_status' => 'in_progress'
);
```

---

## Base de Datos y Optimizaciones

### Estructura de Tablas (6 tablas optimizadas)

#### 1. wp_sfq_forms
```sql
CREATE TABLE wp_sfq_forms (
    id INT(11) AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type ENUM('form', 'quiz') DEFAULT 'form',
    settings LONGTEXT,           -- Configuración JSON
    style_settings LONGTEXT,     -- Estilos JSON
    intro_title VARCHAR(255),
    intro_description TEXT,
    intro_button_text VARCHAR(100) DEFAULT 'Comenzar',
    thank_you_message TEXT,
    redirect_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    KEY status (status),
    KEY type (type),
    KEY idx_forms_type_status (type, status, created_at)
);
```

#### 2. wp_sfq_questions
```sql
CREATE TABLE wp_sfq_questions (
    id INT(11) AUTO_INCREMENT PRIMARY KEY,
    form_id INT(11) NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL,
    options LONGTEXT,            -- Opciones JSON
    settings LONGTEXT,           -- Configuración JSON
    required BOOLEAN DEFAULT FALSE,
    order_position INT(11) DEFAULT 0,
    variable_name VARCHAR(100),
    variable_value INT(11) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    KEY form_id (form_id),
    KEY order_position (order_position),
    KEY idx_questions_lookup (form_id, order_position)
);
```

#### 3. wp_sfq_conditions
```sql
CREATE TABLE wp_sfq_conditions (
    id INT(11) AUTO_INCREMENT PRIMARY KEY,
    question_id INT(11) NOT NULL,
    condition_type VARCHAR(50) NOT NULL,
    condition_value TEXT,
    action_type VARCHAR(50) NOT NULL,
    action_value TEXT,
    variable_operation VARCHAR(20),
    variable_amount INT(11),
    order_position INT(11) DEFAULT 0,
    
    KEY question_id (question_id)
);
```

#### 4. wp_sfq_submissions
```sql
CREATE TABLE wp_sfq_submissions (
    id INT(11) AUTO_INCREMENT PRIMARY KEY,
    form_id INT(11) NOT NULL,
    user_id INT(11),
    user_ip VARCHAR(45),
    user_agent TEXT,
    total_score INT(11) DEFAULT 0,
    variables LONGTEXT,          -- Variables JSON
    status VARCHAR(20) DEFAULT 'completed',
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    time_spent INT(11) DEFAULT 0,
    
    KEY form_id (form_id),
    KEY user_id (user_id),
    KEY status (status),
    KEY started_at (started_at),
    KEY idx_submissions_performance (form_id, status, created_at),
    KEY idx_user_submissions (user_id, form_id, status)
);
```

#### 5. wp_sfq_responses
```sql
CREATE TABLE wp_sfq_responses (
    id INT(11) AUTO_INCREMENT PRIMARY KEY,
    submission_id INT(11) NOT NULL,
    question_id INT(11) NOT NULL,
    answer LONGTEXT,
    score INT(11) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    KEY submission_id (submission_id),
    KEY question_id (question_id),
    KEY idx_responses_lookup (submission_id, question_id)
);
```

#### 6. wp_sfq_analytics
```sql
CREATE TABLE wp_sfq_analytics (
    id INT(11) AUTO_INCREMENT PRIMARY KEY,
    form_id INT(11) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_data LONGTEXT,
    user_ip VARCHAR(45),
    session_id VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    KEY form_id (form_id),
    KEY event_type (event_type),
    KEY session_id (session_id),
    KEY created_at (created_at),
    KEY idx_analytics_performance (form_id, event_type, session_id, created_at),
    KEY idx_session_events (session_id, event_type, form_id)
);
```

### Sistema de Caché

```php
// Implementado en SFQ_Database
private function get_form_with_cache($form_id) {
    $cache_key = "sfq_form_{$form_id}";
    $cached_form = wp_cache_get($cache_key, 'sfq_forms');
    
    if ($cached_form !== false) {
        return $cached_form;
    }
    
    $form = $this->get_form_from_db($form_id);
    
    // Cachear por 5 minutos
    wp_cache_set($cache_key, $form, 'sfq_forms', 300);
    
    return $form;
}
```

### Optimizaciones de Performance

```php
// Consultas batch para inserción masiva
public function batch_insert_responses($responses) {
    $values = array();
    $prepare_values = array();
    
    foreach ($responses as $response) {
        $values[] = '(%d, %d, %s, %d)';
        $prepare_values[] = intval($response['submission_id']);
        $prepare_values[] = intval($response['question_id']);
        $prepare_values[] = sanitize_textarea_field($response['answer']);
        $prepare_values[] = intval($response['score'] ?? 0);
    }
    
    $query = "INSERT INTO {$this->responses_table} 
              (submission_id, question_id, answer, score) 
              VALUES " . implode(', ', $values);
    
    return $wpdb->query($wpdb->prepare($query, $prepare_values));
}
```

---

## Sistema de Límites y Restricciones

### Tipos de Límites Implementados

#### 1. Límites de Envío Flexibles
```php
// Configuración en settings del formulario
$submission_limits = array(
    'submission_limit_count'  => 3,        // Número de envíos
    'submission_limit_period' => 'day',    // Período: day, week, month, year, forever
    'limit_type'             => 'session_id', // session_id o ip_address
    'limit_message'          => 'Mensaje personalizado'
);
```

#### 2. Límites de Programación Temporal
```php
$schedule_limits = array(
    'enable_schedule'           => true,
    'schedule_start'           => '2024-01-01 09:00:00',
    'schedule_end'             => '2024-12-31 18:00:00',
    'schedule_not_started_message' => 'Formulario no disponible aún',
    'schedule_ended_message'   => 'Formulario cerrado'
);
```

#### 3. Límites Máximos de Participantes
```php
$max_limits = array(
    'enable_max_submissions'    => true,
    'max_submissions'          => 1000,
    'max_submissions_limit_type' => 'session_id', // Independiente del tipo de envío
    'max_submissions_message'  => 'Límite máximo alcanzado'
);
```

#### 4. Bloqueo Manual con Timer
```php
$block_settings = array(
    'block_form'                    => true,
    'block_form_enable_timer'       => true,
    'block_form_timer_date'         => '2024-06-01 12:00:00',
    'block_form_timer_timezone'     => 'Europe/Madrid',
    'block_form_timer_show_form'    => false, // Mantener solo timer visible
    'block_form_timer_hide_all'     => false, // Ocultar completamente
);
```

### Lógica de Verificación de Límites

```php
// Método principal en SFQ_Limits
public function check_submission_limits($form_id, $session_id = null) {
    $form = $this->database->get_form($form_id);
    
    // 1. Verificar bloqueo manual
    if ($this->is_form_blocked($form)) {
        return $this->get_block_response($form);
    }
    
    // 2. Verificar límites de programación
    $schedule_check = $this->check_schedule_limits($form->settings);
    if (!$schedule_check['allowed']) {
        return $schedule_check;
    }
    
    // 3. Verificar límite máximo de participantes
    $max_check = $this->check_max_submissions($form_id, $form->settings);
    if (!$max_check['allowed']) {
        return $max_check;
    }
    
    // 4. Verificar límites de envío por usuario
    return $this->check_user_submission_limits($form_id, $session_id, $form->settings);
}
```

---

## Tipos de Pregunta y Renderizado

### Tipos de Pregunta Estándar (7 tipos)

#### 1. Single Choice (Opción única)
```php
private function render_single_choice($question) {
    foreach ($question->options as $option) {
        echo '<div class="sfq-option-card" data-value="' . esc_attr($option['value']) . '">';
        echo '<span class="sfq-option-text">' . esc_html($option['text']) . '</span>';
        echo '<input type="radio" name="question_' . $question->id . '" value="' . esc_attr($option['value']) . '">';
        echo '</div>';
    }
}
```

#### 2. Multiple Choice (Opción múltiple)
```php
private function render_multiple_choice($question) {
    foreach ($question->options as $index => $option) {
        echo '<div class="sfq-option-card sfq-checkbox-card">';
        echo '<input type="checkbox" name="question_' . $question->id . '[]" value="' . esc_attr($option['value']) . '">';
        echo '<label>' . esc_html($option['text']) . '</label>';
        echo '</div>';
    }
}
```

#### 3. Text Input (Texto libre)
```php
private function render_text_input($question) {
    $settings = $question->settings ?: array();
    echo '<input type="text" name="question_' . $question->id . '" 
          placeholder="' . esc_attr($settings['placeholder'] ?? 'Escribe aquí...') . '">';
}
```

#### 4. Email Input (Email con validación)
```php
private function render_email_input($question) {
    echo '<input type="email" name="question_' . $question->id . '" 
          placeholder="tu@email.com" required>';
    echo '<span class="sfq-input-error">Email inválido</span>';
}
```

#### 5. Rating (Valoración con estrellas/emojis)
```php
private function render_rating($question) {
    $settings = $question->settings ?: array();
    $type = $settings['rating_type'] ?? 'stars';
    $max = $settings['max_rating'] ?? 5;
    
    for ($i = 1; $i <= $max; $i++) {
        echo '<button class="sfq-star" data-value="' . $i . '">';
        echo '<svg>...</svg>'; // Icono de estrella
        echo '</button>';
    }
}
```

#### 6. Image Choice (Selección de imagen)
```php
private function render_image_choice($question) {
    foreach ($question->options as $option) {
        echo '<div class="sfq-image-option" data-value="' . esc_attr($option['value']) . '">';
        echo '<img src="' . esc_url($option['image']) . '" alt="' . esc_attr($option['text']) . '">';
        echo '<span class="sfq-image-label">' . esc_html($option['text']) . '</span>';
        echo '</div>';
    }
}
```

#### 7. Freestyle (Pregunta de estilo libre)
```php
private function render_freestyle_question($question) {
    foreach ($question->freestyle_elements as $element) {
        switch ($element['type']) {
            case 'text':
                $this->render_freestyle_text($element, $question->id);
                break;
            case 'video':
                $this->render_freestyle_video($element, $question->id);
                break;
            // ... 12 tipos de elementos freestyle
        }
    }
}
```

### Sistema Freestyle (12 elementos)

1. **Text** - Campo de texto/textarea
2. **Email** - Campo de email con validación
3. **Phone** - Campo de teléfono
4. **Video** - Embed de YouTube/Vimeo
5. **Image** - Imagen con opción clickeable
6. **File Upload** - Subida de archivos
7. **Button** - Botón con acción personalizada
8. **Rating** - Valoración (estrellas/corazones/emojis)
9. **Dropdown** - Lista desplegable
10. **Checkbox** - Casilla de verificación
11. **Countdown** - Cuenta atrás
12. **Legal Text** - Texto legal con aceptación

### Variables de Renderizado

```php
// Variables globales de estilo por formulario
$style_variables = array(
    '--sfq-primary-color'    => '#007cba',
    '--sfq-secondary-color'  => '#6c757d',
    '--sfq-background-color' => '#ffffff',
    '--sfq-text-color'      => '#333333',
    '--sfq-border-radius'   => '12px',
    '--sfq-font-family'     => 'system-ui, sans-serif'
);
```

---

## Sistema AJAX y Comunicación

### Endpoints AJAX Principales

```php
// Registrados en SFQ_Ajax::init()
$ajax_endpoints = array(
    // Frontend
    'sfq_submit_response'     => 'Enviar respuesta del formulario',
    'sfq_track_event'        => 'Rastrear eventos de analytics',
    'sfq_get_next_question'  => 'Obtener siguiente pregunta',
    'sfq_get_form_content'   => 'Obtener contenido del formulario',
    
    // Admin
    'sfq_save_form'          => 'Guardar formulario',
    'sfq_get_form_data'      => 'Obtener datos del formulario',
    'sfq_delete_form'        => 'Eliminar formulario',
    'sfq_duplicate_form'     => 'Duplicar formulario',
    'sfq_get_submissions'    => 'Obtener envíos',
    'sfq_reset_form_stats'   => 'Resetear estadísticas',
    
    // Analytics
    'sfq_get_dashboard_stats' => 'Estadísticas del dashboard',
    'sfq_get_form_analytics' => 'Analytics de formulario',
    'sfq_export_submissions' => 'Exportar envíos'
);
```

### Flujo de Envío de Respuesta

```php
// Método principal: SFQ_Ajax::submit_response()
public function submit_response() {
    // 1. Verificar seguridad
    if (!check_ajax_referer('sfq_nonce', 'nonce', false)) {
        wp_send_json_error('Error de seguridad');
        return;
    }
    
    // 2. Verificar rate limiting
    if (!$this->check_rate_limit('submit_response')) {
        wp_send_json_error('Demasiadas peticiones');
        return;
    }
    
    // 3. Validar datos
    $form_id = intval($_POST['form_id'] ?? 0);
    $session_id = sanitize_text_field($_POST['session_id'] ?? '');
    $responses = json_decode(stripslashes($_POST['responses'] ?? '{}'), true);
    
    // 4. Verificar límites
    $limits_checker = new SFQ_Limits();
    $limit_check = $limits_checker->check_submission_limits($form_id, $session_id);
    
    if (!$limit_check['allowed']) {
        wp_send_json_error($limit_check);
        return;
    }
    
    // 5. Procesar y guardar
    $this->process_and_save_submission($form_id, $session_id, $responses);
}
```

### Sistema de Rate Limiting

```php
// Implementado en SFQ_Security
public static function check_rate_limit($action, $max_requests = 10, $time_window = 60) {
    $user_ip = SFQ_Utils::get_user_ip();
    $user_id = get_current_user_id();
    
    // Crear clave única para el límite
    $rate_limit_key = "sfq_rate_limit_{$action}_{$user_ip}_{$user_id}";
    
    // Obtener contador actual
    $current_count = get_transient($rate_limit_key) ?: 0;
    
    // Verificar límite
    if ($current_count >= $max_requests) {
        return false;
    }
    
    // Incrementar contador
    set_transient($rate_limit_key, $current_count + 1, $time_window);
    
    return true;
}
```

---

## Requerimientos Técnicos

### Requerimientos Mínimos

```php
// Verificados en SFQ_Activator::activate()
$requirements = array(
    'wordpress_version' => '5.0',
    'php_version'      => '7.4',
    'mysql_version'    => '5.6',
    'memory_limit'     => '128M', // Recomendado 256M
    'max_execution_time' => 30,
    'extensions' => array(
        'json',
        'mbstring',
        'mysqli',
        'curl'
    )
);
```

### Compatibilidad

```php
// Temas compatibles
$compatible_themes = array(
    'all_standard_wp_themes' => true,
    'popular_themes' => array(
        'Astra', 'GeneratePress', 'OceanWP', 'Neve', 'Kadence'
    ),
    'page_builders' => array(
        'Elementor', 'Beaver Builder', 'Divi', 'Visual Composer'
    )
);

// Plugins compatibles
$compatible_plugins = array(
    'WooCommerce', 'Contact Form 7', 'Yoast SEO', 'WPML',
    'UpdraftPlus', 'Wordfence', 'WP Rocket'
);
```

### Variables de Configuración

```php
// Configurables en wp-config.php
define('SFQ_ENABLE_DEBUG', true);
define('SFQ_AUTO_SAVE_INTERVAL', 30);
define('SFQ_MAX_QUESTIONS_PER_FORM', 50);
define('SFQ_ENABLE_ANALYTICS', true);
define('SFQ_CACHE_TIMEOUT', 300);
define('SFQ_DISABLE_ANIMATIONS', false);
define('SFQ_FORCE_HTTPS', false);
```

---

## Guía de Escalabilidad

### Puntos de Extensión

#### 1. Hooks de Acción Disponibles
```php
// Antes de guardar formulario
do_action('sfq_before_save_form', $form_data);

// Después de enviar respuesta
do_action('sfq_after_submit_response', $form_id, $submission_id, $responses);

// Antes de renderizar formulario
do_action('sfq_before_render_form', $form_id, $form_data);

// Después de completar formulario
do_action('sfq_form_completed', $form_id, $submission_id, $user_data);
```

#### 2. Filtros Disponibles
```php
// Filtrar datos del formulario
$form_data = apply_filters('sfq_form_data', $form_data, $form_id);

// Modificar HTML del formulario
$form_html = apply_filters('sfq_form_html', $form_html, $form_id, $form_data);

// Filtrar opciones de pregunta
$options = apply_filters('sfq_question_options', $options, $question_id, $question_type);

// Personalizar mensaje de límite
$limit_message = apply_filters('sfq_limit_message', $message, $limit_type, $form_id);
```

### Patrones de Extensión Recomendados

#### 1. Añadir Nuevo Tipo de Pregunta
```php
// 1. Registrar el tipo
add_filter('sfq_question_types', function($types) {
    $types['custom_slider'] = __('Slider Personalizado', 'mi-plugin');
    return $types;
});

// 2. Añadir renderizado
add_action('sfq_render_question_custom_slider', function($question) {
    echo '<div class="custom-slider-wrapper">';
    echo '<input type="range" name="question_' . $question->id . '" min="0" max="100">';
    echo '</div>';
});

// 3. Añadir validación
add_filter('sfq_validate_answer_custom_slider', function($is_valid, $answer, $question) {
    return is_numeric($answer) && $answer >= 0 && $answer <= 100;
}, 10, 3);
```

#### 2. Integración con Servicios Externos
```php
// Enviar datos a CRM después del envío
add_action('sfq_after_submit_response', function($form_id, $submission_id, $responses) {
    $crm_integration = new Mi_CRM_Integration();
    $crm_integration->send_lead($responses);
}, 10, 3);
```

### Optimizaciones para Alto Volumen

```php
// 1. Implementar caché Redis
class SFQ_Redis_Cache {
    public function get_form($form_id) {
        $redis = new Redis();
        $redis->connect('127.0.0.1', 6379);
        
        $cache_key = "sfq_form_{$form_id}";
        $cached = $redis->get($cache_key);
        
        if ($cached) {
            return json_decode($cached, true);
        }
        
        $form = $this->database->get_form($form_id);
        $redis->setex($cache_key, 300, json_encode($form)); // 5 minutos
        
        return $form;
    }
}

// 2. Implementar cola de trabajos para procesamiento asíncrono
class SFQ_Queue_Manager {
    public function queue_submission_processing($form_id, $submission_id) {
        wp_schedule_single_event(time(), 'sfq_process_submission', array($form_id, $submission_id));
    }
}
```

---

## Cómo Ampliar la Funcionalidad

### 1. Añadir Nuevos Tipos de Pregunta

#### Paso 1: Registrar el Nuevo Tipo
```php
// En tu plugin o functions.php
add_filter('sfq_question_types', 'add_custom_question_types');
function add_custom_question_types($types) {
    $types['date_picker'] = __('Selector de Fecha', 'mi-plugin');
    $types['color_picker'] = __('Selector de Color', 'mi-plugin');
    $types['signature'] = __('Firma Digital', 'mi-plugin');
    $types['location'] = __('Selector de Ubicación', 'mi-plugin');
    return $types;
}
```

#### Paso 2: Implementar el Renderizado
```php
// Añadir renderizado personalizado
add_action('sfq_render_question_date_picker', 'render_date_picker_question');
function render_date_picker_question($question) {
    $settings = $question->settings ?? array();
    $min_date = $settings['min_date'] ?? '';
    $max_date = $settings['max_date'] ?? '';
    
    echo '<div class="sfq-date-picker-wrapper">';
    echo '<input type="date" 
          name="question_' . $question->id . '" 
          class="sfq-date-input"
          min="' . esc_attr($min_date) . '"
          max="' . esc_attr($max_date) . '"
          ' . ($question->required ? 'required' : '') . '>';
    echo '</div>';
}
```

#### Paso 3: Añadir Validación Backend
```php
add_filter('sfq_validate_answer_date_picker', 'validate_date_picker_answer', 10, 3);
function validate_date_picker_answer($is_valid, $answer, $question) {
    if (empty($answer)) {
        return !$question->required;
    }
    
    // Validar formato de fecha
    $date = DateTime::createFromFormat('Y-m-d', $answer);
    if (!$date || $date->format('Y-m-d') !== $answer) {
        return false;
    }
    
    // Validar rango si está configurado
    $settings = $question->settings ?? array();
    if (!empty($settings['min_date'])) {
        $min_date = new DateTime($settings['min_date']);
        if ($date < $min_date) return false;
    }
    
    if (!empty($settings['max_date'])) {
        $max_date = new DateTime($settings['max_date']);
        if ($date > $max_date) return false;
    }
    
    return true;
}
```

#### Paso 4: Añadir Configuración en el Admin
```php
add_action('sfq_admin_question_settings_date_picker', 'add_date_picker_settings');
function add_date_picker_settings($question) {
    $settings = $question->settings ?? array();
    ?>
    <div class="sfq-setting-group">
        <label><?php _e('Fecha Mínima', 'mi-plugin'); ?></label>
        <input type="date" 
               name="settings[min_date]" 
               value="<?php echo esc_attr($settings['min_date'] ?? ''); ?>">
    </div>
    
    <div class="sfq-setting-group">
        <label><?php _e('Fecha Máxima', 'mi-plugin'); ?></label>
        <input type="date" 
               name="settings[max_date]" 
               value="<?php echo esc_attr($settings['max_date'] ?? ''); ?>">
    </div>
    <?php
}
```

### 2. Crear Nuevos Tipos de Condiciones

#### Registrar Nueva Condición
```php
add_filter('sfq_condition_types', 'add_custom_conditions');
function add_custom_conditions($conditions) {
    $conditions['date_is_before'] = __('Si la fecha es anterior a', 'mi-plugin');
    $conditions['date_is_after'] = __('Si la fecha es posterior a', 'mi-plugin');
    $conditions['answer_length_greater'] = __('Si la respuesta tiene más de X caracteres', 'mi-plugin');
    return $conditions;
}
```

#### Implementar Evaluación de la Condición
```php
add_filter('sfq_evaluate_condition', 'evaluate_custom_conditions', 10, 4);
function evaluate_custom_conditions($result, $condition, $answer, $variables) {
    switch ($condition->condition_type) {
        case 'date_is_before':
            $answer_date = new DateTime($answer);
            $compare_date = new DateTime($condition->condition_value);
            return $answer_date < $compare_date;
            
        case 'date_is_after':
            $answer_date = new DateTime($answer);
            $compare_date = new DateTime($condition->condition_value);
            return $answer_date > $compare_date;
            
        case 'answer_length_greater':
            $min_length = intval($condition->condition_value);
            return strlen($answer) > $min_length;
    }
    
    return $result;
}
```

### 3. Integrar con Servicios Externos

#### Integración con CRM (HubSpot, Salesforce, etc.)
```php
class SFQ_CRM_Integration {
    
    public function __construct() {
        add_action('sfq_after_submit_response', array($this, 'send_to_crm'), 10, 3);
    }
    
    public function send_to_crm($form_id, $submission_id, $responses) {
        // Verificar si el formulario tiene integración CRM habilitada
        $form = (new SFQ_Database())->get_form($form_id);
        $settings = $form->settings ?? array();
        
        if (empty($settings['crm_integration_enabled'])) {
            return;
        }
        
        $crm_type = $settings['crm_type'] ?? 'hubspot';
        
        switch ($crm_type) {
            case 'hubspot':
                $this->send_to_hubspot($responses, $settings);
                break;
            case 'salesforce':
                $this->send_to_salesforce($responses, $settings);
                break;
        }
    }
    
    private function send_to_hubspot($responses, $settings) {
        $api_key = $settings['hubspot_api_key'] ?? '';
        if (empty($api_key)) return;
        
        // Mapear respuestas a campos de HubSpot
        $contact_data = array();
        foreach ($responses as $question_id => $answer) {
            $field_mapping = $settings['hubspot_field_mapping'][$question_id] ?? '';
            if ($field_mapping) {
                $contact_data[$field_mapping] = $answer;
            }
        }
        
        // Enviar a HubSpot API
        $response = wp_remote_post('https://api.hubapi.com/contacts/v1/contact/', array(
            'headers' => array(
                'Authorization' => 'Bearer ' . $api_key,
                'Content-Type' => 'application/json'
            ),
            'body' => json_encode(array(
                'properties' => $contact_data
            ))
        ));
        
        // Log del resultado
        if (is_wp_error($response)) {
            error_log('SFQ HubSpot Integration Error: ' . $response->get_error_message());
        }
    }
}

// Inicializar la integración
new SFQ_CRM_Integration();
```

#### Integración con Email Marketing (Mailchimp, ConvertKit)
```php
class SFQ_Email_Marketing {
    
    public function __construct() {
        add_action('sfq_after_submit_response', array($this, 'add_to_email_list'), 10, 3);
    }
    
    public function add_to_email_list($form_id, $submission_id, $responses) {
        $form = (new SFQ_Database())->get_form($form_id);
        $settings = $form->settings ?? array();
        
        if (empty($settings['email_marketing_enabled'])) {
            return;
        }
        
        // Buscar email en las respuestas
        $email = $this->extract_email_from_responses($responses);
        if (!$email) return;
        
        $service = $settings['email_service'] ?? 'mailchimp';
        
        switch ($service) {
            case 'mailchimp':
                $this->add_to_mailchimp($email, $responses, $settings);
                break;
            case 'convertkit':
                $this->add_to_convertkit($email, $responses, $settings);
                break;
        }
    }
    
    private function extract_email_from_responses($responses) {
        foreach ($responses as $answer) {
            if (is_email($answer)) {
                return $answer;
            }
        }
        return null;
    }
    
    private function add_to_mailchimp($email, $responses, $settings) {
        $api_key = $settings['mailchimp_api_key'] ?? '';
        $list_id = $settings['mailchimp_list_id'] ?? '';
        
        if (empty($api_key) || empty($list_id)) return;
        
        $datacenter = substr($api_key, strpos($api_key, '-') + 1);
        $url = "https://{$datacenter}.api.mailchimp.com/3.0/lists/{$list_id}/members";
        
        $data = array(
            'email_address' => $email,
            'status' => 'subscribed',
            'merge_fields' => $this->map_responses_to_merge_fields($responses, $settings)
        );
        
        wp_remote_post($url, array(
            'headers' => array(
                'Authorization' => 'Basic ' . base64_encode('user:' . $api_key),
                'Content-Type' => 'application/json'
            ),
            'body' => json_encode($data)
        ));
    }
}
```

### 4. Añadir Nuevos Elementos Freestyle

#### Elemento de Mapa Interactivo
```php
add_action('sfq_render_freestyle_element_map', 'render_map_element', 10, 2);
function render_map_element($element, $question_id) {
    $settings = $element['settings'] ?? array();
    $default_lat = $settings['default_lat'] ?? '40.7128';
    $default_lng = $settings['default_lng'] ?? '-74.0060';
    $zoom = $settings['zoom'] ?? 10;
    ?>
    <div class="sfq-map-wrapper">
        <div id="map_<?php echo $element['id']; ?>" 
             class="sfq-interactive-map" 
             style="height: 400px; width: 100%;"
             data-lat="<?php echo esc_attr($default_lat); ?>"
             data-lng="<?php echo esc_attr($default_lng); ?>"
             data-zoom="<?php echo esc_attr($zoom); ?>">
        </div>
        <input type="hidden" 
               name="freestyle[<?php echo $question_id; ?>][<?php echo $element['id']; ?>]"
               id="map_coordinates_<?php echo $element['id']; ?>"
               value="">
    </div>
    
    <script>
    // Inicializar mapa cuando se cargue la página
    document.addEventListener('DOMContentLoaded', function() {
        initializeMap('<?php echo $element['id']; ?>');
    });
    
    function initializeMap(elementId) {
        const mapElement = document.getElementById('map_' + elementId);
        const lat = parseFloat(mapElement.dataset.lat);
        const lng = parseFloat(mapElement.dataset.lng);
        const zoom = parseInt(mapElement.dataset.zoom);
        
        // Usar Google Maps o Leaflet
        const map = new google.maps.Map(mapElement, {
            center: { lat: lat, lng: lng },
            zoom: zoom
        });
        
        let marker = new google.maps.Marker({
            position: { lat: lat, lng: lng },
            map: map,
            draggable: true
        });
        
        // Actualizar coordenadas cuando se mueva el marcador
        marker.addListener('dragend', function() {
            const position = marker.getPosition();
            const coordinates = position.lat() + ',' + position.lng();
            document.getElementById('map_coordinates_' + elementId).value = coordinates;
        });
    }
    </script>
    <?php
}
```

#### Elemento de Firma Digital
```php
add_action('sfq_render_freestyle_element_signature', 'render_signature_element', 10, 2);
function render_signature_element($element, $question_id) {
    $settings = $element['settings'] ?? array();
    $width = $settings['width'] ?? 400;
    $height = $settings['height'] ?? 200;
    ?>
    <div class="sfq-signature-wrapper">
        <canvas id="signature_<?php echo $element['id']; ?>" 
                class="sfq-signature-canvas"
                width="<?php echo $width; ?>" 
                height="<?php echo $height; ?>"
                style="border: 2px solid #ddd; border-radius: 8px;">
        </canvas>
        
        <div class="sfq-signature-controls">
            <button type="button" 
                    onclick="clearSignature('<?php echo $element['id']; ?>')"
                    class="sfq-button sfq-button-secondary">
                <?php _e('Limpiar', 'smart-forms-quiz'); ?>
            </button>
        </div>
        
        <input type="hidden" 
               name="freestyle[<?php echo $question_id; ?>][<?php echo $element['id']; ?>]"
               id="signature_data_<?php echo $element['id']; ?>"
               value="">
    </div>
    
    <script>
    document.addEventListener('DOMContentLoaded', function() {
        initializeSignaturePad('<?php echo $element['id']; ?>');
    });
    
    function initializeSignaturePad(elementId) {
        const canvas = document.getElementById('signature_' + elementId);
        const ctx = canvas.getContext('2d');
        let isDrawing = false;
        
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);
        
        function startDrawing(e) {
            isDrawing = true;
            draw(e);
        }
        
        function draw(e) {
            if (!isDrawing) return;
            
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#000';
            
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y);
            
            // Guardar datos de la firma
            document.getElementById('signature_data_' + elementId).value = canvas.toDataURL();
        }
        
        function stopDrawing() {
            if (!isDrawing) return;
            isDrawing = false;
            ctx.beginPath();
        }
    }
    
    function clearSignature(elementId) {
        const canvas = document.getElementById('signature_' + elementId);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        document.getElementById('signature_data_' + elementId).value = '';
    }
    </script>
    <?php
}
```

### 5. Sistema de Notificaciones Avanzado

#### Notificaciones por Webhook
```php
class SFQ_Webhook_Notifications {
    
    public function __construct() {
        add_action('sfq_after_submit_response', array($this, 'send_webhooks'), 10, 3);
    }
    
    public function send_webhooks($form_id, $submission_id, $responses) {
        $form = (new SFQ_Database())->get_form($form_id);
        $settings = $form->settings ?? array();
        
        $webhooks = $settings['webhooks'] ?? array();
        
        foreach ($webhooks as $webhook) {
            if (empty($webhook['url']) || !$webhook['enabled']) {
                continue;
            }
            
            $this->send_webhook($webhook, $form_id, $submission_id, $responses);
        }
    }
    
    private function send_webhook($webhook, $form_id, $submission_id, $responses) {
        $payload = array(
            'form_id' => $form_id,
            'submission_id' => $submission_id,
            'timestamp' => current_time('c'),
            'responses' => $responses,
            'metadata' => array(
                'user_ip' => SFQ_Utils::get_user_ip(),
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
                'referrer' => $_SERVER['HTTP_REFERER'] ?? ''
            )
        );
        
        // Aplicar transformaciones si están configuradas
        if (!empty($webhook['transform_data'])) {
            $payload = $this->transform_payload($payload, $webhook['transform_data']);
        }
        
        $headers = array('Content-Type' => 'application/json');
        
        // Añadir headers personalizados
        if (!empty($webhook['headers'])) {
            $headers = array_merge($headers, $webhook['headers']);
        }
        
        // Añadir autenticación si está configurada
        if (!empty($webhook['auth_type'])) {
            $headers = $this->add_auth_headers($headers, $webhook);
        }
        
        $response = wp_remote_post($webhook['url'], array(
            'headers' => $headers,
            'body' => json_encode($payload),
            'timeout' => 30
        ));
        
        // Log del resultado
        $this->log_webhook_result($webhook['url'], $response, $payload);
    }
    
    private function add_auth_headers($headers, $webhook) {
        switch ($webhook['auth_type']) {
            case 'bearer':
                $headers['Authorization'] = 'Bearer ' . $webhook['auth_token'];
                break;
            case 'basic':
                $credentials = base64_encode($webhook['auth_username'] . ':' . $webhook['auth_password']);
                $headers['Authorization'] = 'Basic ' . $credentials;
                break;
            case 'api_key':
                $headers[$webhook['api_key_header']] = $webhook['api_key_value'];
                break;
        }
        
        return $headers;
    }
}
```

### 6. Sistema de Reportes Avanzados

#### Generador de Reportes Personalizados
```php
class SFQ_Advanced_Reports {
    
    public function generate_custom_report($form_id, $report_config) {
        $database = new SFQ_Database();
        
        // Obtener datos base
        $submissions = $this->get_submissions_data($form_id, $report_config);
        
        // Aplicar filtros
        if (!empty($report_config['filters'])) {
            $submissions = $this->apply_filters($submissions, $report_config['filters']);
        }
        
        // Generar métricas
        $metrics = $this->calculate_metrics($submissions, $report_config);
        
        // Generar gráficos
        $charts = $this->generate_charts($submissions, $report_config);
        
        return array(
            'submissions' => $submissions,
            'metrics' => $metrics,
            'charts' => $charts,
            'generated_at' => current_time('c')
        );
    }
    
    private function calculate_metrics($submissions, $config) {
        $metrics = array();
        
        // Métricas básicas
        $metrics['total_submissions'] = count($submissions);
        $metrics['completion_rate'] = $this->calculate_completion_rate($submissions);
        $metrics['average_time'] = $this->calculate_average_time($submissions);
        
        // Métricas personalizadas
        if (!empty($config['custom_metrics'])) {
            foreach ($config['custom_metrics'] as $metric) {
                $metrics[$metric['name']] = $this->calculate_custom_metric($submissions, $metric);
            }
        }
        
        return $metrics;
    }
    
    private function generate_charts($submissions, $config) {
        $charts = array();
        
        foreach ($config['charts'] as $chart_config) {
            switch ($chart_config['type']) {
                case 'pie':
                    $charts[] = $this->generate_pie_chart($submissions, $chart_config);
                    break;
                case 'bar':
                    $charts[] = $this->generate_bar_chart($submissions, $chart_config);
                    break;
                case 'line':
                    $charts[] = $this->generate_line_chart($submissions, $chart_config);
                    break;
            }
        }
        
        return $charts;
    }
}
```

### 7. Optimizaciones para Alto Rendimiento

#### Implementar Cola de Trabajos
```php
class SFQ_Job_Queue {
    
    public function __construct() {
        add_action('sfq_after_submit_response', array($this, 'queue_processing'), 5, 3);
        add_action('sfq_process_submission_async', array($this, 'process_submission_async'), 10, 3);
    }
    
    public function queue_processing($form_id, $submission_id, $responses) {
        // Procesar tareas pesadas de forma asíncrona
        wp_schedule_single_event(time(), 'sfq_process_submission_async', array(
            $form_id, 
            $submission_id, 
            $responses
        ));
    }
    
    public function process_submission_async($form_id, $submission_id, $responses) {
        // Enviar notificaciones
        $this->send_notifications($form_id, $submission_id, $responses);
        
        // Integrar con servicios externos
        $this->integrate_external_services($form_id, $submission_id, $responses);
        
        // Generar reportes
        $this->update_reports($form_id, $submission_id, $responses);
    }
}
```

#### Caché Avanzado con Redis
```php
class SFQ_Redis_Cache {
    private $redis;
    
    public function __construct() {
        if (class_exists('Redis')) {
            $this->redis = new Redis();
            $this->redis->connect('127.0.0.1', 6379);
        }
    }
    
    public function get_form_cached($form_id) {
        if (!$this->redis) {
            return false;
        }
        
        $cache_key = "sfq_form_{$form_id}";
        $cached = $this->redis->get($cache_key);
        
        if ($cached) {
            return json_decode($cached, true);
        }
        
        return false;
    }
    
    public function cache_form($form_id, $form_data, $ttl = 300) {
        if (!$this->redis) {
            return false;
        }
        
        $cache_key = "sfq_form_{$form_id}";
        return $this->redis->setex($cache_key, $ttl, json_encode($form_data));
    }
    
    public function invalidate_form_cache($form_id) {
        if (!$this->redis) {
            return false;
        }
        
        $cache_key = "sfq_form_{$form_id}";
        return $this->redis->del($cache_key);
    }
}
```

### 8. Mejores Prácticas para Extensiones

#### Estructura Recomendada para Extensiones
```
mi-extension-sfq/
├── mi-extension-sfq.php          # Archivo principal
├── includes/
│   ├── class-extension-loader.php
│   ├── class-custom-questions.php
│   ├── class-integrations.php
│   └── class-admin-settings.php
├── assets/
│   ├── css/
│   │   └── extension.css
│   └── js/
│       └── extension.js
├── templates/
│   └── question-types/
│       ├── date-picker.php
│       └── signature.php
└── languages/
    ├── mi-extension-sfq.pot
    └── mi-extension-sfq-es_ES.po
```

#### Código Base para Extensión
```php
<?php
/**
 * Plugin Name: Mi Extensión SFQ
 * Description: Extensión personalizada para Smart Forms & Quiz
 * Version: 1.0.0
 * Author: Tu Nombre
 */

if (!defined('ABSPATH')) {
    exit;
}

// Verificar que SFQ esté activo
if (!class_exists('SFQ_Loader')) {
    add_action('admin_notices', function() {
        echo '<div class="notice notice-error"><p>';
        echo __('Mi Extensión SFQ requiere que Smart Forms & Quiz esté activo.', 'mi-extension-sfq');
        echo '</p></div>';
    });
    return;
}

class Mi_Extension_SFQ {
    
    public function __construct() {
        add_action('plugins_loaded', array($this, 'init'));
    }
    
    public function init() {
        // Cargar traducciones
        load_plugin_textdomain('mi-extension-sfq', false, dirname(plugin_basename(__FILE__)) . '/languages');
        
        // Inicializar componentes
        $this->load_includes();
        $this->init_hooks();
    }
    
    private function load_includes() {
        require_once plugin_dir_path(__FILE__) . 'includes/class-custom-questions.php';
        require_once plugin_dir_path(__FILE__) . 'includes/class-integrations.php';
        require_once plugin_dir_path(__FILE__) . 'includes/class-admin-settings.php';
    }
    
    private function init_hooks() {
        // Registrar nuevos tipos de pregunta
        new Mi_Extension_Custom_Questions();
        
        // Inicializar integraciones
        new Mi_Extension_Integrations();
        
        // Configuración de admin
        if (is_admin()) {
            new Mi_Extension_Admin_Settings();
        }
    }
}

// Inicializar la extensión
new Mi_Extension_SFQ();
```

### 9. Hooks y Filtros Disponibles para Extensiones

#### Hooks de Acción Completos
```php
// Ciclo de vida del formulario
do_action('sfq_before_form_render', $form_id, $form_data);
do_action('sfq_after_form_render', $form_id, $form_html);
do_action('sfq_before_question_render', $question_id, $question_data);
do_action('sfq_after_question_render', $question_id, $question_html);

// Procesamiento de respuestas
do_action('sfq_before_submit_response', $form_id, $responses);
do_action('sfq_after_submit_response', $form_id, $submission_id, $responses);
do_action('sfq_before_save_submission', $submission_data);
do_action('sfq_after_save_submission', $submission_id, $submission_data);

// Administración
do_action('sfq_before_save_form', $form_data);
do_action('sfq_after_save_form', $form_id, $form_data);
do_action('sfq_before_delete_form', $form_id);
do_action('sfq_after_delete_form', $form_id);

// Analytics
do_action('sfq_track_event', $form_id, $event_type, $event_data);
do_action('sfq_form_completed', $form_id, $submission_id, $completion_data);
```

#### Filtros Disponibles Completos
```php
// Modificar datos del formulario
$form_data = apply_filters('sfq_form_data', $form_data, $form_id);
$form_html = apply_filters('sfq_form_html', $form_html, $form_id, $form_data);

// Personalizar preguntas
$question_types = apply_filters('sfq_question_types', $question_types);
$question_html = apply_filters('sfq_question_html', $question_html, $question_id, $question_data);
$question_options = apply_filters('sfq_question_options', $options, $question_id, $question_type);

// Validación
$is_valid = apply_filters('sfq_validate_answer', $is_valid, $answer, $question);
$validation_errors = apply_filters('sfq_validation_errors', $errors, $form_id, $responses);

// Condiciones y lógica
$condition_types = apply_filters('sfq_condition_types', $condition_types);
$condition_result = apply_filters('sfq_evaluate_condition', $result, $condition, $answer, $variables);

// Límites y restricciones
$limit_message = apply_filters('sfq_limit_message', $message, $limit_type, $form_id);
$can_submit = apply_filters('sfq_can_submit_form', $can_submit, $form_id, $user_data);

// Estilos y apariencia
$form_styles = apply_filters('sfq_form_styles', $styles, $form_id);
$css_classes = apply_filters('sfq_form_css_classes', $classes, $form_id, $form_type);
```

### 10. Ejemplos de Extensiones Completas

#### Extensión de Integración con WooCommerce
```php
class SFQ_WooCommerce_Integration {
    
    public function __construct() {
        add_action('sfq_after_submit_response', array($this, 'process_woocommerce_integration'), 10, 3);
        add_filter('sfq_question_types', array($this, 'add_product_selector_question'));
    }
    
    public function add_product_selector_question($types) {
        $types['wc_product_selector'] = __('Selector de Productos WooCommerce', 'sfq-wc-integration');
        return $types;
    }
    
    public function process_woocommerce_integration($form_id, $submission_id, $responses) {
        $form = (new SFQ_Database())->get_form($form_id);
        $settings = $form->settings ?? array();
        
        if (empty($settings['wc_integration_enabled'])) {
            return;
        }
        
        // Crear pedido automáticamente
        if (!empty($settings['wc_auto_create_order'])) {
            $this->create_woocommerce_order($responses, $settings);
        }
        
        // Añadir a carrito
        if (!empty($settings['wc_add_to_cart'])) {
            $this->add_products_to_cart($responses, $settings);
        }
        
        // Crear cupón personalizado
        if (!empty($settings['wc_create_coupon'])) {
            $this->create_custom_coupon($responses, $settings);
        }
    }
    
    private function create_woocommerce_order($responses, $settings) {
        // Extraer productos seleccionados de las respuestas
        $products = $this->extract_products_from_responses($responses);
        $customer_data = $this->extract_customer_data($responses);
        
        if (empty($products)) return;
        
        // Crear pedido
        $order = wc_create_order();
        
        // Añadir productos al pedido
        foreach ($products as $product_data) {
            $product_id = $product_data['id'];
            $quantity = $product_data['quantity'] ?? 1;
            $order->add_product(wc_get_product($product_id), $quantity);
        }
        
        // Establecer datos del cliente
        if (!empty($customer_data['email'])) {
            $order->set_billing_email($customer_data['email']);
        }
        
        if (!empty($customer_data['name'])) {
            $order->set_billing_first_name($customer_data['name']);
        }
        
        // Calcular totales y guardar
        $order->calculate_totals();
        $order->save();
        
        // Enviar email de confirmación si está configurado
        if (!empty($settings['wc_send_order_email'])) {
            WC()->mailer()->get_emails()['WC_Email_New_Order']->trigger($order->get_id());
        }
    }
}

// Inicializar la integración
if (class_exists('WooCommerce')) {
    new SFQ_WooCommerce_Integration();
}
```

#### Extensión de Analytics Avanzados con Google Analytics
```php
class SFQ_Google_Analytics_Integration {
    
    public function __construct() {
        add_action('sfq_after_submit_response', array($this, 'track_ga_event'), 10, 3);
        add_action('wp_head', array($this, 'add_ga_tracking_code'));
    }
    
    public function track_ga_event($form_id, $submission_id, $responses) {
        $form = (new SFQ_Database())->get_form($form_id);
        $settings = $form->settings ?? array();
        
        if (empty($settings['ga_tracking_enabled']) || empty($settings['ga_tracking_id'])) {
            return;
        }
        
        // Preparar datos del evento
        $event_data = array(
            'event_category' => 'Smart Forms',
            'event_action' => 'Form Submission',
            'event_label' => $form->title,
            'value' => 1,
            'custom_dimensions' => array()
        );
        
        // Añadir dimensiones personalizadas basadas en las respuestas
        if (!empty($settings['ga_custom_dimensions'])) {
            foreach ($settings['ga_custom_dimensions'] as $dimension) {
                $question_id = $dimension['question_id'];
                $dimension_index = $dimension['dimension_index'];
                
                if (isset($responses[$question_id])) {
                    $event_data['custom_dimensions'][$dimension_index] = $responses[$question_id];
                }
            }
        }
        
        // Enviar evento a Google Analytics
        $this->send_ga_event($settings['ga_tracking_id'], $event_data);
    }
    
    private function send_ga_event($tracking_id, $event_data) {
        // Usar Measurement Protocol de Google Analytics
        $url = 'https://www.google-analytics.com/collect';
        
        $data = array(
            'v' => '1', // Version
            'tid' => $tracking_id, // Tracking ID
            'cid' => $this->get_client_id(), // Client ID
            't' => 'event', // Hit Type
            'ec' => $event_data['event_category'],
            'ea' => $event_data['event_action'],
            'el' => $event_data['event_label'],
            'ev' => $event_data['value']
        );
        
        // Añadir dimensiones personalizadas
        foreach ($event_data['custom_dimensions'] as $index => $value) {
            $data["cd{$index}"] = $value;
        }
        
        wp_remote_post($url, array(
            'body' => http_build_query($data),
            'timeout' => 5
        ));
    }
    
    private function get_client_id() {
        // Generar o recuperar Client ID único
        $client_id = get_transient('sfq_ga_client_id');
        
        if (!$client_id) {
            $client_id = wp_generate_uuid4();
            set_transient('sfq_ga_client_id', $client_id, YEAR_IN_SECONDS);
        }
        
        return $client_id;
    }
}
```

---

## Conclusión

Esta documentación técnica completa del plugin Smart Forms & Quiz proporciona una guía exhaustiva para:

### ✅ **Comprensión del Sistema**
- **Arquitectura modular** bien estructurada con separación clara de responsabilidades
- **Sistema de lógica condicional** robusto con 6 tipos de condiciones y 6 tipos de acciones
- **Variables globales** y sistema de sesiones inteligente para tracking avanzado
- **Base de datos optimizada** con 6 tablas e índices de rendimiento

### ✅ **Funcionalidades Avanzadas**
- **Sistema de límites flexible** con múltiples tipos de restricciones
- **7 tipos de pregunta estándar** + **sistema freestyle con 12 elementos**
- **Comunicación AJAX** segura con rate limiting
- **Analytics integrados** para métricas detalladas

### ✅ **Escalabilidad y Extensibilidad**
- **Hooks y filtros** completos para personalización
- **Patrones de extensión** documentados y probados
- **Ejemplos prácticos** de integraciones con servicios externos
- **Optimizaciones de rendimiento** para alto volumen

### ✅ **Guías de Desarrollo**
- **Estructura recomendada** para extensiones
- **Mejores prácticas** de desarrollo
- **Código base** reutilizable para nuevas funcionalidades
- **Ejemplos completos** de implementación

### 🚀 **Próximos Pasos Recomendados**

1. **Implementar caché Redis** para sitios con alto tráfico
2. **Desarrollar API REST** completa para integraciones externas
3. **Añadir soporte para webhooks** bidireccionales
4. **Crear sistema de plantillas** para formularios predefinidos
5. **Implementar cola de trabajos** para procesamiento asíncrono

### 📚 **Recursos Adicionales**

- **Documentación de WordPress**: [developer.wordpress.org](https://developer.wordpress.org)
- **Estándares de código**: [WordPress Coding Standards](https://make.wordpress.org/core/handbook/best-practices/coding-standards/)
- **Seguridad**: [WordPress Security Guidelines](https://wordpress.org/support/article/hardening-wordpress/)
- **Performance**: [WordPress Performance Optimization](https://wordpress.org/support/article/optimization/)

Esta documentación debe servir como **referencia técnica definitiva** para el desarrollo, mantenimiento y extensión del plugin Smart Forms & Quiz, facilitando futuras modificaciones y asegurando la escalabilidad del sistema.
