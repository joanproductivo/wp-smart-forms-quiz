<?php
/**
 * Manejo de base de datos para el plugin
 */

if (!defined('ABSPATH')) {
    exit;
}

class SFQ_Database {
    
    private $forms_table;
    private $questions_table;
    private $responses_table;
    private $submissions_table;
    private $analytics_table;
    private $conditions_table;
    private $partial_responses_table; // ✅ NUEVO: Tabla para respuestas parciales
    
    public function __construct() {
        global $wpdb;
        $this->forms_table = $wpdb->prefix . 'sfq_forms';
        $this->questions_table = $wpdb->prefix . 'sfq_questions';
        $this->responses_table = $wpdb->prefix . 'sfq_responses';
        $this->submissions_table = $wpdb->prefix . 'sfq_submissions';
        $this->analytics_table = $wpdb->prefix . 'sfq_analytics';
        $this->conditions_table = $wpdb->prefix . 'sfq_conditions';
        $this->partial_responses_table = $wpdb->prefix . 'sfq_partial_responses'; // ✅ NUEVO
        
        // Verificar conexión de base de datos al inicializar
        $this->ensure_db_connection();
    }
    
    /**
     * Asegurar que la conexión de base de datos esté activa
     * Mejora de WordPress best practices para conexiones persistentes
     */
    private function ensure_db_connection() {
        global $wpdb;
        
        // Verificar si la conexión está activa
        if (!$wpdb->check_connection()) {
            // Intentar reconectar
            $wpdb->db_connect();
            
            // Log si hay problemas de conexión
            if (!$wpdb->check_connection()) {
                // Connection failed - log silently
            }
        }
    }
    
    /**
     * Crear todas las tablas necesarias
     */
    public function create_tables() {
        global $wpdb;
        $charset_collate = $wpdb->get_charset_collate();
        
        // Tabla de formularios
        $sql_forms = "CREATE TABLE IF NOT EXISTS {$this->forms_table} (
            id INT(11) NOT NULL AUTO_INCREMENT,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            type ENUM('form', 'quiz') DEFAULT 'form',
            settings LONGTEXT,
            style_settings LONGTEXT,
            intro_title VARCHAR(255),
            intro_description TEXT,
            intro_button_text VARCHAR(100) DEFAULT 'Comenzar',
            thank_you_message TEXT,
            redirect_url VARCHAR(500),
            status VARCHAR(20) DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY status (status),
            KEY type (type)
        ) $charset_collate;";
        
        // Tabla de preguntas
        $sql_questions = "CREATE TABLE IF NOT EXISTS {$this->questions_table} (
            id INT(11) NOT NULL AUTO_INCREMENT,
            form_id INT(11) NOT NULL,
            question_text TEXT NOT NULL,
            question_type VARCHAR(50) NOT NULL,
            options LONGTEXT,
            settings LONGTEXT,
            required BOOLEAN DEFAULT FALSE,
            order_position INT(11) DEFAULT 0,
            variable_name VARCHAR(100),
            variable_value INT(11) DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY form_id (form_id),
            KEY order_position (order_position)
        ) $charset_collate;";
        
        // Tabla de respuestas
        $sql_responses = "CREATE TABLE IF NOT EXISTS {$this->responses_table} (
            id INT(11) NOT NULL AUTO_INCREMENT,
            submission_id INT(11) NOT NULL,
            question_id INT(11) NOT NULL,
            answer LONGTEXT,
            score INT(11) DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY submission_id (submission_id),
            KEY question_id (question_id)
        ) $charset_collate;";
        
        // Tabla de envíos
        $sql_submissions = "CREATE TABLE IF NOT EXISTS {$this->submissions_table} (
            id INT(11) NOT NULL AUTO_INCREMENT,
            form_id INT(11) NOT NULL,
            user_id INT(11),
            user_ip VARCHAR(45),
            user_agent TEXT,
            total_score INT(11) DEFAULT 0,
            variables LONGTEXT,
            status VARCHAR(20) DEFAULT 'completed',
            started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME,
            time_spent INT(11) DEFAULT 0,
            PRIMARY KEY (id),
            KEY form_id (form_id),
            KEY user_id (user_id),
            KEY status (status),
            KEY started_at (started_at)
        ) $charset_collate;";
        
        // Tabla de analytics
        $sql_analytics = "CREATE TABLE IF NOT EXISTS {$this->analytics_table} (
            id INT(11) NOT NULL AUTO_INCREMENT,
            form_id INT(11) NOT NULL,
            event_type VARCHAR(50) NOT NULL,
            event_data LONGTEXT,
            user_ip VARCHAR(45),
            session_id VARCHAR(100),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY form_id (form_id),
            KEY event_type (event_type),
            KEY session_id (session_id),
            KEY created_at (created_at)
        ) $charset_collate;";
        
        // Tabla de condiciones
        $sql_conditions = "CREATE TABLE IF NOT EXISTS {$this->conditions_table} (
            id INT(11) NOT NULL AUTO_INCREMENT,
            question_id INT(11) NOT NULL,
            condition_type VARCHAR(50) NOT NULL,
            condition_value TEXT,
            action_type VARCHAR(50) NOT NULL,
            action_value TEXT,
            variable_operation VARCHAR(20),
            variable_amount INT(11),
            comparison_value VARCHAR(255),
            order_position INT(11) DEFAULT 0,
            PRIMARY KEY (id),
            KEY question_id (question_id)
        ) $charset_collate;";
        
        // ✅ NUEVA: Tabla de respuestas parciales
        $sql_partial_responses = "CREATE TABLE IF NOT EXISTS {$this->partial_responses_table} (
            id INT(11) NOT NULL AUTO_INCREMENT,
            form_id INT(11) NOT NULL,
            session_id VARCHAR(100) NOT NULL,
            user_id INT(11) NULL,
            user_ip VARCHAR(45),
            responses LONGTEXT,
            variables LONGTEXT,
            current_question INT(11) DEFAULT 0,
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY unique_form_session (form_id, session_id),
            KEY form_id (form_id),
            KEY session_id (session_id),
            KEY user_id (user_id),
            KEY expires_at (expires_at),
            KEY last_updated (last_updated)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql_forms);
        dbDelta($sql_questions);
        dbDelta($sql_responses);
        dbDelta($sql_submissions);
        dbDelta($sql_analytics);
        dbDelta($sql_conditions);
        dbDelta($sql_partial_responses); // ✅ NUEVO
        
        // Añadir índices adicionales para optimizar rendimiento
        $this->add_performance_indexes();
        
        // Guardar versión de la base de datos
        update_option('sfq_db_version', '1.0.0');
    }
    
    /**
     * Obtener todos los formularios (optimizado)
     */
    public function get_forms($args = array()) {
        global $wpdb;
        
        $defaults = array(
            'status' => 'active',
            'type' => '',
            'orderby' => 'created_at',
            'order' => 'DESC',
            'limit' => -1,
            'offset' => 0,
            'include_stats' => false
        );
        
        $args = wp_parse_args($args, $defaults);
        
        // Build WHERE clause more efficiently
        $where_conditions = array("1=1");
        $prepare_values = array();
        
        if (!empty($args['status'])) {
            $where_conditions[] = "status = %s";
            $prepare_values[] = $args['status'];
        }
        
        if (!empty($args['type'])) {
            $where_conditions[] = "type = %s";
            $prepare_values[] = $args['type'];
        }
        
        $where_clause = implode(' AND ', $where_conditions);
        
        // Validate orderby to prevent SQL injection
        $allowed_orderby = array('id', 'title', 'created_at', 'updated_at', 'type');
        $orderby = in_array($args['orderby'], $allowed_orderby) ? $args['orderby'] : 'created_at';
        $order = strtoupper($args['order']) === 'ASC' ? 'ASC' : 'DESC';
        
        // Build base query
        $base_query = "SELECT * FROM {$this->forms_table}";
        
        if ($args['include_stats']) {
            // Include basic stats in single query
            $base_query = "SELECT f.*, 
                COUNT(DISTINCT s.id) as submission_count,
                COUNT(DISTINCT a.session_id) as view_count
                FROM {$this->forms_table} f
                LEFT JOIN {$this->submissions_table} s ON f.id = s.form_id AND s.status = 'completed'
                LEFT JOIN {$this->analytics_table} a ON f.id = a.form_id AND a.event_type = 'view'";
        }
        
        $query = "{$base_query} WHERE {$where_clause}";
        
        if ($args['include_stats']) {
            $query .= " GROUP BY f.id";
        }
        
        $query .= " ORDER BY {$orderby} {$order}";
        
        if ($args['limit'] > 0) {
            $query .= $wpdb->prepare(" LIMIT %d OFFSET %d", $args['limit'], $args['offset']);
        }
        
        // Prepare query if we have values
        if (!empty($prepare_values)) {
            $query = $wpdb->prepare($query, $prepare_values);
        }
        
        return $wpdb->get_results($query);
    }
    
    /**
     * Obtener un formulario por ID con cache optimizado y consulta única
     */
    public function get_form($form_id) {
        // Verificar cache primero
        $cache_key = "sfq_form_complete_{$form_id}";
        $cached_form = wp_cache_get($cache_key, 'sfq_forms');
        
        if ($cached_form !== false) {
            return $cached_form;
        }
        
        // Usar consulta optimizada
        $form = $this->get_form_optimized($form_id);
        
        if ($form) {
            // Cache por 1 hora
            wp_cache_set($cache_key, $form, 'sfq_forms', 3600);
        }
        
        return $form;
    }
    
    /**
     * ✅ OPTIMIZADO: Obtener formulario completo con una sola consulta (elimina N+1)
     */
    private function get_form_optimized($form_id) {
        global $wpdb;
        
        $query = "
            SELECT 
                f.id as form_id,
                f.title as form_title,
                f.description as form_description,
                f.settings as form_settings,
                f.style_settings as form_style_settings,
                f.intro_title,
                f.intro_description,
                f.intro_button_text,
                f.thank_you_message,
                f.redirect_url,
                f.status as form_status,
                f.type as form_type,
                f.created_at as form_created_at,
                f.updated_at as form_updated_at,
                
                q.id as question_id,
                q.question_text,
                q.question_type,
                q.options,
                q.required,
                q.order_position,
                q.settings as question_settings,
                q.variable_name,
                q.variable_value,
                
                c.id as condition_id,
                c.condition_type,
                c.condition_value,
                c.action_type,
                c.action_value,
                c.variable_operation,
                c.variable_amount,
                c.comparison_value,
                c.order_position as condition_order
                
            FROM {$this->forms_table} f
            LEFT JOIN {$this->questions_table} q ON f.id = q.form_id
            LEFT JOIN {$this->conditions_table} c ON q.id = c.question_id
            WHERE f.id = %d
            ORDER BY q.order_position ASC, c.order_position ASC
        ";
        
        $results = $wpdb->get_results($wpdb->prepare($query, $form_id));
        
        if (empty($results)) {
            return null;
        }
        
        return $this->process_form_results_optimized($results);
    }
    
    /**
     * ✅ OPTIMIZADO: Procesar resultados de la consulta única
     */
    private function process_form_results_optimized($results) {
        $form = null;
        $questions = array();
        
        foreach ($results as $row) {
            // Construir objeto formulario (solo una vez)
            if (!$form) {
                $form = (object) array(
                    'id' => $row->form_id,
                    'title' => $row->form_title,
                    'description' => $row->form_description,
                    'settings' => json_decode($row->form_settings, true) ?: array(),
                    'style_settings' => json_decode($row->form_style_settings, true) ?: array(),
                    'intro_title' => $row->intro_title,
                    'intro_description' => $row->intro_description,
                    'intro_button_text' => $row->intro_button_text,
                    'thank_you_message' => $row->thank_you_message,
                    'redirect_url' => $row->redirect_url,
                    'status' => $row->form_status,
                    'type' => $row->form_type,
                    'created_at' => $row->form_created_at,
                    'updated_at' => $row->form_updated_at
                );
                
                // ✅ CRÍTICO: Extraer variables globales de las configuraciones
                $form->global_variables = isset($form->settings['global_variables']) && is_array($form->settings['global_variables']) 
                    ? $form->settings['global_variables'] 
                    : array();
            }
            
            // Construir preguntas (evitar duplicados)
            if ($row->question_id && !isset($questions[$row->question_id])) {
                $question = (object) array(
                    'id' => $row->question_id,
                    'question_text' => $row->question_text,
                    'question_type' => $row->question_type,
                    'required' => $row->required,
                    'order_position' => $row->order_position,
                    'variable_name' => $row->variable_name,
                    'variable_value' => $row->variable_value,
                    'conditions' => array()
                );
                
                // Procesar datos de la pregunta usando métodos existentes
                $question = $this->process_question_data_optimized($question, $row);
                
                $questions[$row->question_id] = $question;
            }
            
            // Añadir condiciones a las preguntas
            if ($row->condition_id && isset($questions[$row->question_id])) {
                $questions[$row->question_id]->conditions[] = (object) array(
                    'id' => $row->condition_id,
                    'condition_type' => $row->condition_type,
                    'condition_value' => $row->condition_value,
                    'action_type' => $row->action_type,
                    'action_value' => $row->action_value,
                    'variable_operation' => $row->variable_operation,
                    'variable_amount' => $row->variable_amount,
                    'comparison_value' => $row->comparison_value,
                    'order_position' => $row->condition_order
                );
            }
        }
        
        // Convertir a array ordenado
        $form->questions = array_values($questions);
        
        // Ensure questions is always an array
        if (!is_array($form->questions)) {
            $form->questions = array();
        }
        
        return $form;
    }
    
    /**
     * ✅ OPTIMIZADO: Procesar datos de pregunta sin consultas adicionales
     */
    private function process_question_data_optimized($question, $row) {
        // Procesar configuraciones primero para tener acceso a todos los datos
        $settings = $this->process_question_settings($row->question_settings);
        $question->settings = $settings;
        
        // Procesar según el tipo de pregunta
        if ($question->question_type === 'freestyle') {
            // Para preguntas freestyle, los elementos están en el campo options
            $question->freestyle_elements = $this->process_freestyle_elements($row->options);
            $question->options = []; // Las preguntas freestyle no tienen opciones tradicionales
            
            // Procesar configuraciones globales de freestyle
            $question->global_settings = $settings['global_settings'] ?? [];
            
            // CRÍTICO: Extraer el campo pantallaFinal de las configuraciones procesadas
            $question->pantallaFinal = isset($settings['pantallaFinal']) ? (bool) $settings['pantallaFinal'] : false;
        } else {
            // Para preguntas regulares, procesar opciones normalmente
            $question->options = $this->process_question_options($row->options);
        }
        
        // Procesar campo required
        $question->required = $this->process_required_field($question->required);
        
        // Asegurar campos necesarios
        $question->question_text = $question->question_text ?? '';
        $question->question_type = $question->question_type ?? 'text';
        $question->order_position = $question->order_position ?? 0;
        
        return $question;
    }
    
    /**
     * Obtener un formulario por ID sin cache (para admin)
     */
    public function get_form_fresh($form_id) {
        global $wpdb;
        
        $form = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$this->forms_table} WHERE id = %d",
            $form_id
        ));
        
        if ($form) {
            // Decodificar configuraciones JSON
            $form->settings = json_decode($form->settings, true) ?: array();
            $form->style_settings = json_decode($form->style_settings, true) ?: array();
            
            // ✅ CRÍTICO: Extraer variables globales de las configuraciones (igual que en get_form)
            $form->global_variables = isset($form->settings['global_variables']) && is_array($form->settings['global_variables']) 
                ? $form->settings['global_variables'] 
                : array();
            
            // Obtener preguntas
            $form->questions = $this->get_questions($form_id);
            
            // Ensure questions is always an array
            if (!is_array($form->questions)) {
                $form->questions = array();
            }
        }
        
        return $form;
    }
    
    /**
     * Obtener preguntas de un formulario
     */
    public function get_questions($form_id) {
        global $wpdb;
        
        $questions = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$this->questions_table} 
            WHERE form_id = %d 
            ORDER BY order_position ASC",
            $form_id
        ));
        
        if (!$questions) {
            return [];
        }
        
        foreach ($questions as &$question) {
            $question = $this->process_question_data($question);
        }
        
        return $questions;
    }
    
    /**
     * Procesar datos de una pregunta individual
     */
    private function process_question_data($question) {
        // Procesar configuraciones primero para tener acceso a todos los datos
        $settings = $this->process_question_settings($question->settings);
        $question->settings = $settings;
        
        // Procesar según el tipo de pregunta
        if ($question->question_type === 'freestyle') {
            // Para preguntas freestyle, los elementos están en el campo options
            $question->freestyle_elements = $this->process_freestyle_elements($question->options);
            $question->options = []; // Las preguntas freestyle no tienen opciones tradicionales
            
            // Procesar configuraciones globales de freestyle
            $question->global_settings = $settings['global_settings'] ?? [];
            
            // CRÍTICO: Extraer el campo pantallaFinal de las configuraciones procesadas
            $question->pantallaFinal = isset($settings['pantallaFinal']) ? (bool) $settings['pantallaFinal'] : false;
            
            // Debug logging para verificar el procesamiento
        } else {
            // Para preguntas regulares, procesar opciones normalmente
            $question->options = $this->process_question_options($question->options);
        }
        
        // Procesar campo required
        $question->required = $this->process_required_field($question->required);
        
        // Obtener condiciones
        $question->conditions = $this->get_conditions($question->id);
        if (!is_array($question->conditions)) {
            $question->conditions = [];
        }
        
        // Asegurar campos necesarios
        $question->question_text = $question->question_text ?? '';
        $question->question_type = $question->question_type ?? 'text';
        $question->order_position = $question->order_position ?? 0;
        
        return $question;
    }
    
    /**
     * Procesar opciones de pregunta
     */
    private function process_question_options($options) {
        // Usar método centralizado de la clase Utils
        return SFQ_Utils::process_question_options($options);
    }
    
    /**
     * Procesar configuraciones de pregunta
     */
    private function process_question_settings($settings) {
        // Usar método centralizado de la clase Utils
        return SFQ_Utils::process_question_settings($settings);
    }
    
    /**
     * Procesar campo required
     */
    private function process_required_field($required) {
        // Usar método centralizado de la clase Utils
        return SFQ_Utils::process_required_field($required);
    }
    
    /**
     * Procesar elementos freestyle
     */
    private function process_freestyle_elements($elements_json) {
        
        if (empty($elements_json)) {
            return [];
        }
        
        // Decodificar JSON
        $elements = json_decode($elements_json, true);
        error_log('SFQ: Decoded elements: ' . json_encode($elements));
        
        if (!is_array($elements)) {
            return [];
        }
        
        
        // Procesar cada elemento
        $processed_elements = [];
        foreach ($elements as $index => $element) {
            
            if (!is_array($element) || empty($element['type'])) {
                continue;
            }
            
            $element_type = $element['type'];
            
            // Validar que el tipo sea válido
            $valid_types = ['text', 'video', 'image', 'countdown', 'phone', 'email', 'file_upload', 'button', 'rating', 'dropdown', 'checkbox', 'legal_text', 'variable_display', 'styled_text'];
            if (!in_array($element_type, $valid_types)) {
                error_log('SFQ: SKIPPING - Invalid element type: ' . $element_type);
                continue;
            }
            
            // ✅ CRÍTICO: Log específico para styled_text
            if ($element_type === 'styled_text') {
                error_log('SFQ: *** STYLED_TEXT ELEMENT FOUND ***');
                error_log('SFQ: styled_text ID: ' . ($element['id'] ?? 'NO ID'));
                error_log('SFQ: styled_text label: ' . ($element['label'] ?? 'NO LABEL'));
                error_log('SFQ: styled_text settings: ' . json_encode($element['settings'] ?? []));
                error_log('SFQ: styled_text settings size: ' . strlen(json_encode($element['settings'] ?? [])) . ' bytes');
            }
            
            $processed_element = [
                'id' => $element['id'] ?? 'element_' . time() . '_' . count($processed_elements),
                'type' => $element['type'],
                'label' => sanitize_text_field($element['label'] ?? ''),
                'order' => intval($element['order'] ?? count($processed_elements)),
                'settings' => is_array($element['settings'] ?? null) ? $element['settings'] : [],
                'value' => sanitize_text_field($element['value'] ?? '')
            ];
            
            
            // ✅ CRÍTICO: Log específico después del procesamiento de styled_text
            if ($element_type === 'styled_text') {
                error_log('SFQ: *** STYLED_TEXT AFTER PROCESSING ***');
            }
            
            $processed_elements[] = $processed_element;
        }
        
        
        // Log específico de elementos styled_text en el resultado final
        $styled_text_count = 0;
        foreach ($processed_elements as $element) {
            if ($element['type'] === 'styled_text') {
                $styled_text_count++;
            }
        }
        
        // Ordenar por orden
        usort($processed_elements, function($a, $b) {
            return $a['order'] - $b['order'];
        });
        
        
        return $processed_elements;
    }
    
    /**
     * Obtener condiciones de una pregunta
     */
    public function get_conditions($question_id) {
        global $wpdb;
        
        $conditions = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$this->conditions_table} 
            WHERE question_id = %d 
            ORDER BY order_position ASC",
            $question_id
        ));
        
        // Debug logging
        
        return $conditions;
    }
    
    /**
     * Guardar un formulario
     */
    public function save_form($data) {
        global $wpdb;
        
        // ✅ MEJORADO: Logging detallado para debugging
        
        // Log de datos de estilo recibidos
        if (isset($data['style_settings'])) {
            
            // Log específico para imagen de fondo
            $bg_fields = ['background_image_url', 'background_image_id', 'background_image_data', 'background_size', 'background_repeat', 'background_position', 'background_attachment', 'background_opacity', 'background_overlay', 'background_overlay_color', 'background_overlay_opacity'];
            foreach ($bg_fields as $field) {
                if (isset($data['style_settings'][$field])) {
                    error_log('SFQ: ' . $field . ': ' . $data['style_settings'][$field]);
                } else {
                    error_log('SFQ: ' . $field . ': NOT PROVIDED');
                }
            }
        } else {
            error_log('SFQ: WARNING - No style_settings provided in form data');
        }
        
        // ✅ NUEVO: Procesar configuraciones de estilo incluyendo imagen de fondo
        $style_settings = $this->process_style_settings($data['style_settings'] ?? array());
        
        // Log de datos procesados
        
        // Preparar datos
        $form_data = array(
            'title' => sanitize_text_field($data['title']),
            'description' => sanitize_textarea_field($data['description'] ?? ''),
            'type' => in_array($data['type'], array('form', 'quiz')) ? $data['type'] : 'form',
            'settings' => json_encode($data['settings'] ?? array()),
            'style_settings' => json_encode($style_settings),
            'intro_title' => sanitize_text_field($data['intro_title'] ?? ''),
            'intro_description' => sanitize_textarea_field($data['intro_description'] ?? ''),
            'intro_button_text' => sanitize_text_field($data['intro_button_text'] ?? 'Comenzar'),
            'thank_you_message' => wp_kses_post($data['thank_you_message'] ?? ''),
            'redirect_url' => esc_url_raw($data['redirect_url'] ?? ''),
            'status' => $data['status'] ?? 'active'
        );
        
        // Log del JSON final que se guardará
        
        if (isset($data['id']) && $data['id'] > 0) {
            // Actualizar formulario existente
            error_log('SFQ: Updating existing form with ID: ' . $data['id']);
            
            $result = $wpdb->update(
                $this->forms_table,
                $form_data,
                array('id' => $data['id']),
                array('%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s'),
                array('%d')
            );
            
            if ($result === false) {
                error_log('SFQ: ERROR updating form: ' . $wpdb->last_error);
            } else {
            }
            
            $form_id = $data['id'];
        } else {
            // Crear nuevo formulario
            error_log('SFQ: Creating new form');
            
            $result = $wpdb->insert(
                $this->forms_table,
                $form_data,
                array('%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s')
            );
            
            if ($result === false) {
                error_log('SFQ: ERROR creating form: ' . $wpdb->last_error);
            } else {
            }
            
            $form_id = $wpdb->insert_id;
        }
        
        // Verificar que los datos se guardaron correctamente
        if ($form_id) {
            $saved_form = $wpdb->get_row($wpdb->prepare(
                "SELECT style_settings FROM {$this->forms_table} WHERE id = %d",
                $form_id
            ));
            
            if ($saved_form) {
                
                // Verificar campos específicos de imagen de fondo
                $saved_styles = json_decode($saved_form->style_settings, true);
                if ($saved_styles) {
                    foreach ($bg_fields as $field) {
                        if (isset($saved_styles[$field])) {
                        } else {
                            error_log('SFQ: WARNING - ' . $field . ' NOT FOUND in saved data');
                        }
                    }
                } else {
                }
            } else {
                error_log('SFQ: ERROR - Could not retrieve saved form for verification');
            }
        }
        
        // Guardar preguntas si existen
        if (isset($data['questions']) && is_array($data['questions'])) {
            $this->save_questions($form_id, $data['questions']);
        }
        
        // ✅ CRÍTICO: Guardar variables globales si existen
        if (isset($data['global_variables']) && is_array($data['global_variables'])) {
            $this->save_global_variables($form_id, $data['global_variables']);
        } else {
            error_log('SFQ: No global variables provided in form data');
        }
        
        // Limpiar cache después de guardar
        $this->clear_form_cache($form_id);
        
        
        return $form_id;
    }
    
    /**
     * ✅ NUEVO: Procesar y validar configuraciones de estilo incluyendo imagen de fondo
     */
    private function process_style_settings($style_settings) {
        if (!is_array($style_settings)) {
            return array();
        }
        
        $processed_settings = array();
        
        // Procesar cada configuración de estilo con validación
        foreach ($style_settings as $key => $value) {
            switch ($key) {
                // Colores - validar formato hexadecimal
                case 'primary_color':
                case 'secondary_color':
                case 'background_color':
                case 'options_background_color':
                case 'options_border_color':
                case 'input_border_color':
                case 'text_color':
                case 'background_overlay_color':
                case 'limit_background_color':
                case 'limit_border_color':
                case 'limit_icon_color':
                case 'limit_title_color':
                case 'limit_text_color':
                case 'limit_button_bg_color':
                case 'limit_button_text_color':
                case 'block_form_bg_color':
                case 'block_form_border_color':
                case 'block_form_icon_color':
                case 'block_form_title_color':
                case 'block_form_text_color':
                case 'block_form_button_bg_color':
                case 'block_form_button_text_color':
                case 'block_form_timer_unit_bg_color':
                case 'block_form_timer_container_bg_color':
                case 'block_form_timer_container_border_color':
                case 'block_form_timer_unit_border_color':
                case 'block_form_timer_available_bg_color':
                case 'block_form_timer_available_border_color':
                case 'block_form_timer_available_icon_color':
                case 'block_form_timer_available_title_color':
                case 'block_form_timer_available_text_color':
                case 'block_form_timer_available_button_bg_color':
                case 'block_form_timer_available_button_text_color':
                    $processed_settings[$key] = $this->validate_color($value);
                    break;
                
                // ✅ NUEVO: Configuraciones de imagen de fondo
                case 'background_image_url':
                    $processed_settings[$key] = $this->validate_image_url($value);
                    break;
                
                case 'background_image_id':
                    $processed_settings[$key] = intval($value);
                    break;
                
                case 'background_image_data':
                    $processed_settings[$key] = $this->validate_image_data($value);
                    break;
                
                case 'background_size':
                    $valid_sizes = array('cover', 'contain', 'auto', '100% 100%');
                    $processed_settings[$key] = in_array($value, $valid_sizes) ? $value : 'cover';
                    break;
                
                case 'background_repeat':
                    $valid_repeats = array('no-repeat', 'repeat', 'repeat-x', 'repeat-y');
                    $processed_settings[$key] = in_array($value, $valid_repeats) ? $value : 'no-repeat';
                    break;
                
                case 'background_position':
                    $valid_positions = array(
                        'center center', 'top left', 'top center', 'top right',
                        'center left', 'center right', 'bottom left', 'bottom center', 'bottom right'
                    );
                    $processed_settings[$key] = in_array($value, $valid_positions) ? $value : 'center center';
                    break;
                
                case 'background_attachment':
                    $valid_attachments = array('scroll', 'fixed', 'local');
                    $processed_settings[$key] = in_array($value, $valid_attachments) ? $value : 'scroll';
                    break;
                
                case 'background_opacity':
                case 'background_overlay_opacity':
                    $processed_settings[$key] = $this->validate_opacity($value);
                    break;
                
                // ✅ NUEVO: Valores de opacidad para colores
                case 'primary_color_opacity':
                case 'secondary_color_opacity':
                case 'background_color_opacity':
                case 'options_background_color_opacity':
                case 'options_border_color_opacity':
                case 'text_color_opacity':
                case 'input_border_color_opacity':
                    $processed_settings[$key] = $this->validate_opacity($value);
                    break;
                
                // Valores booleanos
                case 'background_overlay':
                case 'form_container_shadow':
                case 'block_form_disable_shadow':
                    $processed_settings[$key] = (bool) $value;
                    break;
                
                // Valores numéricos
                case 'border_radius':
                case 'form_container_border_radius':
                case 'question_text_size':
                case 'option_text_size':
                case 'form_container_custom_width':
                case 'question_content_custom_width':
                    $processed_settings[$key] = max(0, intval($value));
                    break;
                
                // Valores de texto con sanitización
                case 'font_family':
                case 'form_container_width':
                case 'question_content_width':
                case 'question_text_align':
                case 'general_text_align':
                    $processed_settings[$key] = sanitize_text_field($value);
                    break;
                
                // Campos de texto largo (para iconos SVG, etc.)
                case 'limit_submission_icon':
                case 'limit_participants_icon':
                case 'limit_login_icon':
                case 'limit_schedule_icon':
                case 'block_form_icon':
                    $processed_settings[$key] = wp_kses_post($value);
                    break;
                
                // URLs
                case 'block_form_video_url':
                case 'limit_submission_button_url':
                case 'limit_participants_button_url':
                case 'limit_schedule_button_url':
                case 'block_form_button_url':
                case 'block_form_timer_available_button_url':
                    $processed_settings[$key] = esc_url_raw($value);
                    break;
                
                // Texto simple
                default:
                    $processed_settings[$key] = sanitize_text_field($value);
                    break;
            }
        }
        
        return $processed_settings;
    }
    
    /**
     * ✅ NUEVO: Validar color hexadecimal
     */
    private function validate_color($color) {
        if (empty($color)) {
            return '';
        }
        
        // Asegurar que empiece con #
        if (is_string($color) && !empty($color) && strpos($color, '#') !== 0) {
            $color = '#' . $color;
        }
        
        // Validar formato hexadecimal
        if (preg_match('/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/', $color)) {
            return $color;
        }
        
        return '';
    }
    
    /**
     * ✅ CORREGIDO: Validar URL de imagen - Validación menos estricta y más robusta
     */
    private function validate_image_url($url) {
        if (empty($url)) {
            return '';
        }
        
        // Validar que sea una URL válida
        $validated_url = esc_url_raw($url);
        if (!$validated_url) {
            error_log('SFQ: Invalid URL format: ' . $url);
            return '';
        }
        
        // ✅ MEJORADO: Aceptar URLs válidas aunque no tengan extensión visible
        // Muchas URLs de CDN y servicios modernos no muestran extensiones
        
        $url_lower = strtolower($validated_url);
        
        // Verificar extensiones de imagen visibles (método tradicional)
        $valid_extensions = array('jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico');
        $path_info = pathinfo(parse_url($validated_url, PHP_URL_PATH));
        $extension = strtolower($path_info['extension'] ?? '');
        
        if (in_array($extension, $valid_extensions)) {
            return $validated_url;
        }
        
        // ✅ NUEVO: Verificar patrones comunes de URLs de imagen sin extensión visible
        $image_patterns = array(
            '/\/image\//i',           // URLs que contienen /image/
            '/\/img\//i',             // URLs que contienen /img/
            '/\/photo\//i',           // URLs que contienen /photo/
            '/\/picture\//i',         // URLs que contienen /picture/
            '/\/media\//i',           // URLs que contienen /media/
            '/\/upload\//i',          // URLs que contienen /upload/
            '/\/assets\//i',          // URLs que contienen /assets/
            '/\/content\//i',         // URLs que contienen /content/
            '/\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff|ico)(\?|#|$)/i' // Extensiones con parámetros
        );
        
        foreach ($image_patterns as $pattern) {
            if (preg_match($pattern, $url_lower)) {
                return $validated_url;
            }
        }
        
        // ✅ NUEVO: Verificar dominios conocidos de servicios de imágenes
        $image_domains = array(
            'imgur.com', 'i.imgur.com',
            'unsplash.com', 'images.unsplash.com',
            'pixabay.com', 'cdn.pixabay.com',
            'pexels.com', 'images.pexels.com',
            'flickr.com', 'live.staticflickr.com',
            'cloudinary.com',
            'amazonaws.com', 's3.amazonaws.com',
            'googleusercontent.com',
            'wp.com', 'wordpress.com',
            'gravatar.com',
            'cdninstagram.com',
            'fbcdn.net'
        );
        
        $parsed_url = parse_url($validated_url);
        $domain = strtolower($parsed_url['host'] ?? '');
        
        foreach ($image_domains as $image_domain) {
            if (is_string($domain) && strpos($domain, $image_domain) !== false) {
                return $validated_url;
            }
        }
        
        // ✅ MEJORADO: Aceptar cualquier URL válida como potencial imagen
        // Es mejor ser permisivo que rechazar URLs válidas
        return $validated_url;
    }
    
    /**
     * ✅ CORREGIDO: Validar datos de imagen JSON - Validación mucho menos estricta
     */
    private function validate_image_data($data) {
        if (empty($data)) {
            return '';
        }
        
        // Si ya es un array, convertir a JSON
        if (is_array($data)) {
            return wp_json_encode($data);
        }
        
        // Si es string, validar que sea JSON válido
        if (is_string($data)) {
            $decoded = json_decode($data, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                // ✅ MEJORADO: Aceptar cualquier JSON válido, sea array u objeto
                return $data;
            } else {
            }
        }
        
        // ✅ MEJORADO: Aceptar cualquier string no vacío como datos válidos
        // Mejor ser permisivo que rechazar datos potencialmente válidos
        if (is_string($data) && trim($data) !== '') {
            return sanitize_text_field($data);
        }
        
        // ✅ FALLBACK: Aceptar números como strings
        if (is_numeric($data)) {
            return strval($data);
        }
        
        return '';
    }
    
    /**
     * ✅ NUEVO: Validar valor de opacidad
     */
    private function validate_opacity($opacity) {
        $opacity = floatval($opacity);
        return max(0, min(1, $opacity));
    }
    
    /**
     * Guardar preguntas (optimizado con transacciones) - MEJORADO con mapeo de IDs
     */
    private function save_questions($form_id, $questions) {
        global $wpdb;

        // Start transaction for data integrity
        $wpdb->query('START TRANSACTION');

        try {
            // Get existing questions in single query
            $existing_questions = $wpdb->get_results($wpdb->prepare(
                "SELECT id, question_text, order_position FROM {$this->questions_table} WHERE form_id = %d ORDER BY order_position",
                $form_id
            ), OBJECT_K);

            $updated_question_ids = [];
            $questions_to_insert = [];
            $questions_to_update = [];
            $id_mapping = []; // CRÍTICO: Mapeo de IDs temporales a IDs reales

            // Process questions and prepare batch operations
            foreach ($questions as $index => $question) {
                // Para preguntas freestyle, guardar elementos en el campo options
                $options_data = array();
                if ($question['question_type'] === 'freestyle') {
                    $options_data = $question['freestyle_elements'] ?? array();
                    
                    // ✅ CRÍTICO: Log específico para elementos styled_text durante el guardado
                    if (!empty($options_data)) {
                        
                        $styled_text_elements = array_filter($options_data, function($element) {
                            return isset($element['type']) && $element['type'] === 'styled_text';
                        });
                        
                        error_log('SFQ: styled_text elements to save: ' . count($styled_text_elements));
                        
                        foreach ($styled_text_elements as $st_index => $st_element) {
                            error_log('SFQ: styled_text element #' . ($st_index + 1) . ':');
                            error_log('SFQ: - ID: ' . ($st_element['id'] ?? 'NO ID'));
                            error_log('SFQ: - Label: ' . ($st_element['label'] ?? 'NO LABEL'));
                        }
                        
                        // Log del JSON que se va a guardar
                        $json_to_save = wp_json_encode($options_data);
                    }
                } else {
                    $options_data = $question['options'] ?? array();
                }
                
                // ✅ CRÍTICO: Procesar settings correctamente preservando todos los campos
                $settings = $question['settings'] ?? array();
                
                // ✅ DEBUGGING: Log detallado de los settings recibidos
                error_log('SFQ: Raw settings received: ' . json_encode($settings));
                
                // Verificar específicamente hide_title
                if (isset($settings['hide_title'])) {
                    error_log('SFQ: hide_title found in settings: ' . json_encode($settings['hide_title']));
                    error_log('SFQ: hide_title type: ' . gettype($settings['hide_title']));
                } else {
                    error_log('SFQ: hide_title NOT found in settings');
                    error_log('SFQ: Available settings keys: ' . json_encode(array_keys($settings)));
                }
                
                // ✅ SOLUCIÓN: Asegurar que settings sea un array válido
                if (!is_array($settings)) {
                    $settings = array();
                }
                
                // ✅ CRÍTICO: Preservar todos los settings sin modificación
                $processed_settings = $settings;
                

                $question_data = array(
                    'form_id' => $form_id,
                    'question_text' => sanitize_textarea_field($question['question_text']),
                    'question_type' => sanitize_text_field($question['question_type']),
                    'options' => wp_json_encode($options_data),
                    'settings' => wp_json_encode($processed_settings),
                    'required' => isset($question['required']) && $question['required'] ? 1 : 0,
                    'order_position' => $index,
                    'variable_name' => sanitize_text_field($question['variable_name'] ?? ''),
                    'variable_value' => intval($question['variable_value'] ?? 0)
                );
                
                // CRÍTICO: Para preguntas freestyle, incluir el campo pantallaFinal en settings
                if ($question['question_type'] === 'freestyle' && isset($question['pantallaFinal'])) {
                    $settings = json_decode($question_data['settings'], true) ?: array();
                    $settings['pantallaFinal'] = (bool) $question['pantallaFinal'];
                    $question_data['settings'] = wp_json_encode($settings);
                    
                }

                $existing_question_id = null;
                $temporal_id = null;
                
                // CRÍTICO: Capturar el ID temporal si existe
                if (isset($question['temporal_id'])) {
                    $temporal_id = $question['temporal_id'];
                }
                
                // Try to match by ID first, then by text
                if (isset($question['id']) && isset($existing_questions[$question['id']])) {
                    $existing_question_id = $question['id'];
                } else {
                    // Find by text match (less efficient but necessary for new questions)
                    foreach ($existing_questions as $id => $existing_question) {
                        if ($existing_question->question_text === $question['question_text']) {
                            $existing_question_id = $id;
                            break;
                        }
                    }
                }

                if ($existing_question_id) {
                    // CRÍTICO: Crear mapeo si hay ID temporal
                    if ($temporal_id) {
                        $id_mapping[$temporal_id] = $existing_question_id;
                    }
                    
                    // Prepare for update
                    $questions_to_update[] = array(
                        'id' => $existing_question_id,
                        'temporal_id' => $temporal_id,
                        'data' => $question_data,
                        'conditions' => $question['conditions'] ?? []
                    );
                    $updated_question_ids[] = $existing_question_id;
                    unset($existing_questions[$existing_question_id]);
                } else {
                    // Prepare for insert
                    $questions_to_insert[] = array(
                        'temporal_id' => $temporal_id,
                        'data' => $question_data,
                        'conditions' => $question['conditions'] ?? []
                    );
                }
            }

            // Batch update existing questions
            foreach ($questions_to_update as $update_data) {
                $result = $wpdb->update(
                    $this->questions_table,
                    $update_data['data'],
                    array('id' => $update_data['id']),
                    array('%d', '%s', '%s', '%s', '%s', '%d', '%d', '%s', '%d'),
                    array('%d')
                );
                
                if ($result === false) {
                    throw new Exception('Failed to update question ID: ' . $update_data['id']);
                }

                // CRÍTICO: Aplicar mapeo de IDs a las condiciones antes de guardar
                $mapped_conditions = $this->apply_id_mapping_to_conditions($update_data['conditions'], $id_mapping);
                
                // CRÍTICO: Siempre llamar a save_conditions, incluso con array vacío (para eliminar condiciones existentes)
                $this->save_conditions($update_data['id'], $mapped_conditions);
            }

            // Batch insert new questions
            foreach ($questions_to_insert as $insert_data) {
                $result = $wpdb->insert(
                    $this->questions_table,
                    $insert_data['data'],
                    array('%d', '%s', '%s', '%s', '%s', '%d', '%d', '%s', '%d')
                );
                
                if ($result === false) {
                    throw new Exception('Failed to insert new question');
                }

                $question_id = $wpdb->insert_id;
                $updated_question_ids[] = $question_id;
                
                // CRÍTICO: Crear mapeo para nueva pregunta
                if ($insert_data['temporal_id']) {
                    $id_mapping[$insert_data['temporal_id']] = $question_id;
                }

                // CRÍTICO: Aplicar mapeo de IDs a las condiciones antes de guardar
                $mapped_conditions = $this->apply_id_mapping_to_conditions($insert_data['conditions'], $id_mapping);
                
                // CRÍTICO: Siempre llamar a save_conditions, incluso con array vacío (para eliminar condiciones existentes)
                $this->save_conditions($question_id, $mapped_conditions);
            }

            // Delete orphaned questions
            $questions_to_delete = array_keys($existing_questions);
            if (!empty($questions_to_delete)) {
                // Validate that all IDs are positive integers
                $questions_to_delete = array_filter($questions_to_delete, function($id) {
                    return is_numeric($id) && intval($id) > 0;
                });
                
                if (!empty($questions_to_delete)) {
                    // First delete related conditions
                    $placeholders = implode(',', array_fill(0, count($questions_to_delete), '%d'));
                    $wpdb->query($wpdb->prepare(
                        "DELETE FROM {$this->conditions_table} WHERE question_id IN ($placeholders)",
                        $questions_to_delete
                    ));
                    
                    // Then delete questions
                    $wpdb->query($wpdb->prepare(
                        "DELETE FROM {$this->questions_table} WHERE id IN ($placeholders)",
                        $questions_to_delete
                    ));
                }
            }

            $wpdb->query('COMMIT');
            
            // CRÍTICO: Log del mapeo final para debugging
            if (!empty($id_mapping)) {
            }
            
        } catch (Exception $e) {
            $wpdb->query('ROLLBACK');
            throw $e;
        }
    }
    
    /**
     * Guardar condiciones - CORREGIDO para manejar arrays vacíos correctamente
     */
    private function save_conditions($question_id, $conditions) {
        global $wpdb;
        
        // Debug logging
        
        // CRÍTICO: Verificar que question_id es válido
        if (!$question_id || !is_numeric($question_id) || intval($question_id) <= 0) {
            error_log("SFQ: ERROR - Invalid question_id: " . $question_id);
            return false;
        }
        
        $question_id = intval($question_id);
        
        // CRÍTICO: Normalizar el array de condiciones
        if (!is_array($conditions)) {
            $conditions = array();
        }
        
        // PASO 1: Eliminar TODAS las condiciones existentes para esta pregunta
        // Usar DELETE directo sin preparar la consulta dos veces
        $deleted_count = $wpdb->delete(
            $this->conditions_table,
            array('question_id' => $question_id),
            array('%d')
        );
        
        if ($deleted_count === false) {
            error_log("SFQ: ERROR - Failed to delete existing conditions: " . $wpdb->last_error);
            return false;
        }
        
        
        // PASO 2: Verificar que la eliminación fue exitosa
        $remaining_check = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$this->conditions_table} WHERE question_id = %d",
            $question_id
        ));
        
        if ($remaining_check > 0) {
            error_log("SFQ: WARNING - Still " . $remaining_check . " conditions remaining after delete!");
            // Intentar eliminación forzada con TRUNCATE si es necesario
            $force_delete = $wpdb->delete(
                $this->conditions_table,
                array('question_id' => $question_id),
                array('%d')
            );
            error_log("SFQ: Force delete result: " . $force_delete);
            
            // Verificar nuevamente
            $remaining_check = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$this->conditions_table} WHERE question_id = %d",
                $question_id
            ));
            
            if ($remaining_check > 0) {
                error_log("SFQ: CRITICAL ERROR - Cannot delete existing conditions!");
                return false;
            }
        }
        
        error_log("SFQ: ✅ All existing conditions successfully deleted");
        
        // PASO 3: Insertar las nuevas condiciones (solo si hay alguna)
        $inserted_count = 0;
        $expected_count = count($conditions);
        
        // CRÍTICO: Si no hay condiciones, esto es válido (eliminación completa)
        if (empty($conditions)) {
            error_log("SFQ: No conditions to insert - this is valid (complete deletion)");
        } else {
            foreach ($conditions as $index => $condition) {
                // Validar que la condición tiene los campos requeridos
                if (empty($condition['condition_type']) || empty($condition['action_type'])) {
                    error_log("SFQ: Skipping invalid condition at index " . $index . ": " . json_encode($condition));
                    continue;
                }
                
                $condition_data = array(
                    'question_id' => $question_id,
                    'condition_type' => sanitize_text_field($condition['condition_type']),
                    'condition_value' => sanitize_text_field($condition['condition_value'] ?? ''),
                    'action_type' => sanitize_text_field($condition['action_type']),
                    'action_value' => sanitize_text_field($condition['action_value'] ?? ''),
                    'variable_operation' => sanitize_text_field($condition['variable_operation'] ?? ''),
                    'variable_amount' => intval($condition['variable_amount'] ?? 0),
                    'comparison_value' => sanitize_text_field($condition['comparison_value'] ?? ''),
                    'order_position' => $index
                );
                
                error_log("SFQ: Inserting condition " . ($index + 1) . ": " . json_encode($condition_data));
                
                $result = $wpdb->insert(
                    $this->conditions_table,
                    $condition_data,
                    array('%d', '%s', '%s', '%s', '%s', '%s', '%d', '%s', '%d')
                );
                
                if ($result !== false) {
                    $inserted_count++;
                } else {
                    error_log("SFQ: ❌ Failed to insert condition: " . $wpdb->last_error);
                    // Si falla la inserción, esto es un error crítico
                    return false;
                }
            }
        }
        
        
        // PASO 4: Verificación final MEJORADA
        $final_conditions = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$this->conditions_table} WHERE question_id = %d ORDER BY order_position",
            $question_id
        ));
        
        $final_count = count($final_conditions);
        
        error_log("SFQ: Expected conditions: " . $expected_count);
        
        // CRÍTICO: La verificación debe ser exacta
        if ($final_count === $expected_count) {
            error_log("SFQ: ✅ SUCCESS - Condition count matches expected");
            
            // Limpiar caché relacionado para forzar recarga
            wp_cache_delete("sfq_conditions_{$question_id}", 'sfq_conditions');
            
            return true;
        } else {
            error_log("SFQ: ❌ MISMATCH - Expected " . $expected_count . " but found " . $final_count);
            
            // Esto es un error crítico que debe ser reportado
            return false;
        }
        
    }
    
    /**
     * CRÍTICO: Aplicar mapeo de IDs temporales a IDs reales en las condiciones
     */
    private function apply_id_mapping_to_conditions($conditions, $id_mapping) {
        if (empty($conditions) || !is_array($conditions) || empty($id_mapping)) {
            return $conditions;
        }
        
        error_log('SFQ: Applying ID mapping to conditions. Mapping: ' . json_encode($id_mapping));
        
        $mapped_conditions = [];
        
        foreach ($conditions as $condition) {
            $mapped_condition = $condition;
            
            // CRÍTICO: Solo mapear si la acción es 'goto_question' y hay un action_value
            if (isset($condition['action_type']) && $condition['action_type'] === 'goto_question' && 
                !empty($condition['action_value'])) {
                
                $original_action_value = $condition['action_value'];
                
                // Verificar si el action_value es un ID temporal que necesita ser mapeado
                if (isset($id_mapping[$original_action_value])) {
                    $mapped_condition['action_value'] = $id_mapping[$original_action_value];
                    
                } else {
                    error_log('SFQ: No mapping found for action_value: ' . $original_action_value);
                }
            }
            
            $mapped_conditions[] = $mapped_condition;
        }
        
        
        return $mapped_conditions;
    }
    
    /**
     * Registrar una vista
     */
    public function register_view($form_id, $session_id) {
        global $wpdb;
        
        // Registrar vista cada vez que se carga la página (sin verificar vistas previas)
        $result = $wpdb->insert(
            $this->analytics_table,
            array(
                'form_id' => $form_id,
                'event_type' => 'view',
                'event_data' => json_encode(array('timestamp' => time())),
                'session_id' => $session_id,
                'user_ip' => $this->get_user_ip()
            ),
            array('%d', '%s', '%s', '%s', '%s')
        );
        
        if ($result === false) {
            // Failed to register view
        }
    }
    
    /**
     * Registrar evento de inicio de formulario
     */
    public function register_start($form_id, $session_id) {
        global $wpdb;
        
        // Verificar si ya existe un evento de inicio para esta sesión
        $existing_start = $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM {$this->analytics_table} 
            WHERE form_id = %d AND session_id = %s AND event_type = %s",
            $form_id,
            $session_id,
            'start'
        ));
        
        // Solo registrar si no existe un inicio previo
        if (!$existing_start) {
            $result = $wpdb->insert(
                $this->analytics_table,
                array(
                    'form_id' => $form_id,
                    'event_type' => 'start',
                    'event_data' => json_encode(array('timestamp' => time())),
                    'session_id' => $session_id,
                    'user_ip' => $this->get_user_ip()
                ),
                array('%d', '%s', '%s', '%s', '%s')
            );
            
            if ($result === false) {
                // Failed to register start
            }
        }
    }
    
    /**
     * Registrar evento de completado
     */
    public function register_completed($form_id, $session_id, $submission_id = null) {
        global $wpdb;
        
        $event_data = array('timestamp' => time());
        if ($submission_id) {
            $event_data['submission_id'] = $submission_id;
        }
        
        $result = $wpdb->insert(
            $this->analytics_table,
            array(
                'form_id' => $form_id,
                'event_type' => 'completed',
                'event_data' => json_encode($event_data),
                'session_id' => $session_id,
                'user_ip' => $this->get_user_ip()
            ),
            array('%d', '%s', '%s', '%s', '%s')
        );
        
        if ($result === false) {
            // Failed to register completed
        }
    }
    
    /**
     * Añadir índices de rendimiento adicionales
     */
    private function add_performance_indexes() {
        global $wpdb;
        
        // Índices compuestos para mejorar rendimiento de consultas comunes
        $indexes = array(
            // Analytics: consultas por formulario, tipo de evento y sesión
            "ALTER TABLE {$this->analytics_table} ADD INDEX IF NOT EXISTS idx_analytics_performance (form_id, event_type, session_id, created_at)",
            
            // Submissions: consultas por formulario, estado y fecha
            "ALTER TABLE {$this->submissions_table} ADD INDEX IF NOT EXISTS idx_submissions_performance (form_id, status, created_at)",
            
            // Questions: lookup optimizado por formulario y posición
            "ALTER TABLE {$this->questions_table} ADD INDEX IF NOT EXISTS idx_questions_lookup (form_id, order_position)",
            
            // Responses: consultas por submission y pregunta
            "ALTER TABLE {$this->responses_table} ADD INDEX IF NOT EXISTS idx_responses_lookup (submission_id, question_id)",
            
            // Analytics: consultas por sesión y tipo de evento
            "ALTER TABLE {$this->analytics_table} ADD INDEX IF NOT EXISTS idx_session_events (session_id, event_type, form_id)",
            
            // Submissions: consultas por usuario y formulario
            "ALTER TABLE {$this->submissions_table} ADD INDEX IF NOT EXISTS idx_user_submissions (user_id, form_id, status)",
            
            // Forms: consultas por tipo y estado
            "ALTER TABLE {$this->forms_table} ADD INDEX IF NOT EXISTS idx_forms_type_status (type, status, created_at)"
        );
        
        foreach ($indexes as $index_sql) {
            $result = $wpdb->query($index_sql);
            if ($result === false) {
            }
        }
    }
    
    /**
     * Obtener IP del usuario
     */
    private function get_user_ip() {
        // Usar método centralizado de la clase Utils
        return SFQ_Utils::get_user_ip();
    }
    
    /**
     * Insertar respuestas en lote (optimización para grandes volúmenes)
     * Mejora de WordPress best practices para operaciones batch
     */
    public function batch_insert_responses($responses) {
        if (empty($responses) || !is_array($responses)) {
            return false;
        }
        
        global $wpdb;
        
        // Preparar valores para inserción batch
        $values = array();
        $placeholders = array();
        $prepare_values = array();
        
        foreach ($responses as $response) {
            if (!isset($response['submission_id'], $response['question_id'], $response['answer'])) {
                continue; // Skip invalid responses
            }
            
            $values[] = '(%d, %d, %s, %d)';
            $prepare_values[] = intval($response['submission_id']);
            $prepare_values[] = intval($response['question_id']);
            $prepare_values[] = sanitize_textarea_field($response['answer']);
            $prepare_values[] = intval($response['score'] ?? 0);
        }
        
        if (empty($values)) {
            return false;
        }
        
        // Construir consulta batch
        $query = "INSERT INTO {$this->responses_table} (submission_id, question_id, answer, score) VALUES " . implode(', ', $values);
        
        // Ejecutar con monitoreo de tiempo
        $start_time = microtime(true);
        $result = $wpdb->query($wpdb->prepare($query, $prepare_values));
        $execution_time = microtime(true) - $start_time;
        
        // Log consultas lentas
        $this->log_slow_query($query, $execution_time);
        
        return $result;
    }
    
    /**
     * Limpiar datos antiguos (mantenimiento automático)
     * Mejora de WordPress best practices para limpieza de datos
     */
    public function cleanup_old_data($days_old = 90) {
        global $wpdb;
        
        $cutoff_date = date('Y-m-d H:i:s', strtotime("-{$days_old} days"));
        
        // Iniciar transacción para limpieza
        $wpdb->query('START TRANSACTION');
        
        try {
            // Obtener submissions antiguos
            $old_submissions = $wpdb->get_col($wpdb->prepare(
                "SELECT id FROM {$this->submissions_table} WHERE created_at < %s",
                $cutoff_date
            ));
            
            if (!empty($old_submissions)) {
                // Eliminar respuestas asociadas
                $placeholders = implode(',', array_fill(0, count($old_submissions), '%d'));
                $wpdb->query($wpdb->prepare(
                    "DELETE FROM {$this->responses_table} WHERE submission_id IN ($placeholders)",
                    $old_submissions
                ));
                
                // Eliminar submissions
                $wpdb->query($wpdb->prepare(
                    "DELETE FROM {$this->submissions_table} WHERE created_at < %s",
                    $cutoff_date
                ));
            }
            
            // Limpiar analytics antiguos
            $wpdb->query($wpdb->prepare(
                "DELETE FROM {$this->analytics_table} WHERE created_at < %s",
                $cutoff_date
            ));
            
            $wpdb->query('COMMIT');
            
            // Log de limpieza
            
            return count($old_submissions);
            
        } catch (Exception $e) {
            $wpdb->query('ROLLBACK');
            return false;
        }
    }
    
    /**
     * Verificar integridad de la base de datos
     * Mejora de WordPress best practices para mantenimiento
     */
    public function check_database_integrity() {
        global $wpdb;
        
        $issues = array();
        
        // Verificar respuestas huérfanas (sin submission)
        $orphaned_responses = $wpdb->get_var($wpdb->prepare("
            SELECT COUNT(*) 
            FROM {$this->responses_table} r 
            LEFT JOIN {$this->submissions_table} s ON r.submission_id = s.id 
            WHERE s.id IS NULL
        "));
        
        if ($orphaned_responses > 0) {
            $issues[] = "Found {$orphaned_responses} orphaned responses without submissions";
        }
        
        // Verificar preguntas huérfanas (sin formulario)
        $orphaned_questions = $wpdb->get_var($wpdb->prepare("
            SELECT COUNT(*) 
            FROM {$this->questions_table} q 
            LEFT JOIN {$this->forms_table} f ON q.form_id = f.id 
            WHERE f.id IS NULL
        "));
        
        if ($orphaned_questions > 0) {
            $issues[] = "Found {$orphaned_questions} orphaned questions without forms";
        }
        
        // Verificar condiciones huérfanas (sin pregunta)
        $orphaned_conditions = $wpdb->get_var($wpdb->prepare("
            SELECT COUNT(*) 
            FROM {$this->conditions_table} c 
            LEFT JOIN {$this->questions_table} q ON c.question_id = q.id 
            WHERE q.id IS NULL
        "));
        
        if ($orphaned_conditions > 0) {
            $issues[] = "Found {$orphaned_conditions} orphaned conditions without questions";
        }
        
        return $issues;
    }
    
    /**
     * Reparar problemas de integridad
     * Mejora de WordPress best practices para reparación automática
     */
    public function repair_database_integrity() {
        global $wpdb;
        
        $repairs = array();
        
        // Iniciar transacción para reparaciones
        $wpdb->query('START TRANSACTION');
        
        try {
            // Eliminar respuestas huérfanas
            $orphaned_responses = $wpdb->query($wpdb->prepare("
                DELETE r FROM {$this->responses_table} r 
                LEFT JOIN {$this->submissions_table} s ON r.submission_id = s.id 
                WHERE s.id IS NULL
            "));
            
            if ($orphaned_responses > 0) {
                $repairs[] = "Removed {$orphaned_responses} orphaned responses";
            }
            
            // Eliminar preguntas huérfanas
            $orphaned_questions = $wpdb->query($wpdb->prepare("
                DELETE q FROM {$this->questions_table} q 
                LEFT JOIN {$this->forms_table} f ON q.form_id = f.id 
                WHERE f.id IS NULL
            "));
            
            if ($orphaned_questions > 0) {
                $repairs[] = "Removed {$orphaned_questions} orphaned questions";
            }
            
            // Eliminar condiciones huérfanas
            $orphaned_conditions = $wpdb->query($wpdb->prepare("
                DELETE c FROM {$this->conditions_table} c 
                LEFT JOIN {$this->questions_table} q ON c.question_id = q.id 
                WHERE q.id IS NULL
            "));
            
            if ($orphaned_conditions > 0) {
                $repairs[] = "Removed {$orphaned_conditions} orphaned conditions";
            }
            
            $wpdb->query('COMMIT');
            
            // Log de reparaciones
            if (!empty($repairs)) {
            }
            
            return $repairs;
            
        } catch (Exception $e) {
            $wpdb->query('ROLLBACK');
            return false;
        }
    }
    
    /**
     * Obtener estadísticas de performance de la base de datos
     * Mejora de WordPress best practices para monitoreo
     */
    public function get_database_stats() {
        global $wpdb;
        
        $stats = array();
        
        // Contar registros por tabla
        $stats['forms_count'] = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$this->forms_table}"));
        $stats['questions_count'] = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$this->questions_table}"));
        $stats['submissions_count'] = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$this->submissions_table}"));
        $stats['responses_count'] = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$this->responses_table}"));
        $stats['analytics_count'] = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$this->analytics_table}"));
        $stats['conditions_count'] = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$this->conditions_table}"));
        
        // Tamaño aproximado de las tablas
        $table_sizes = $wpdb->get_results($wpdb->prepare("
            SELECT 
                table_name,
                ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
            FROM information_schema.TABLES 
            WHERE table_schema = DATABASE()
            AND table_name LIKE %s
        ", $wpdb->prefix . 'sfq_%'), ARRAY_A);
        
        $stats['table_sizes'] = array();
        foreach ($table_sizes as $table) {
            $stats['table_sizes'][$table['table_name']] = $table['size_mb'] . ' MB';
        }
        
        // Estadísticas de actividad reciente (últimos 30 días)
        $recent_date = date('Y-m-d H:i:s', strtotime('-30 days'));
        $stats['recent_submissions'] = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$this->submissions_table} WHERE created_at > %s",
            $recent_date
        ));
        
        $stats['recent_analytics'] = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$this->analytics_table} WHERE created_at > %s",
            $recent_date
        ));
        
        return $stats;
    }
    
    /**
     * Log de consultas lentas para monitoreo
     * Mejora de WordPress best practices para debugging
     */
    private function log_slow_query($query, $execution_time, $threshold = 1.0) {
        if ($execution_time > $threshold) {
            $formatted_time = number_format($execution_time, 4);
            $short_query = substr(preg_replace('/\s+/', ' ', $query), 0, 200) . '...';
            if (defined('WP_DEBUG') && WP_DEBUG) {
                $formatted_time = number_format($execution_time, 4);
                $short_query = substr(preg_replace('/\s+/', ' ', $query), 0, 200) . '...';
                error_log("SFQ Slow Query ({$formatted_time}s): {$short_query}");
            }
        }
    }
    
    /**
     * Optimizar tablas de la base de datos
     * Mejora de WordPress best practices para mantenimiento
     */
    public function optimize_database_tables() {
        global $wpdb;
        
        $tables = array(
            $this->forms_table,
            $this->questions_table,
            $this->responses_table,
            $this->submissions_table,
            $this->analytics_table,
            $this->conditions_table
        );
        
        $optimized = array();
        
        foreach ($tables as $table) {
            $result = $wpdb->query($wpdb->prepare("OPTIMIZE TABLE {$table}"));
            if ($result !== false) {
                $optimized[] = $table;
            }
        }
        
        if (!empty($optimized)) {
        }
        
        return $optimized;
    }
    
    /**
     * ✅ CRÍTICO: Guardar variables globales del formulario
     */
    private function save_global_variables($form_id, $global_variables) {
        if (!is_array($global_variables) || empty($global_variables)) {
            error_log('SFQ: No global variables to save for form ' . $form_id);
            return;
        }
        
        
        // Las variables globales se guardan en el campo settings del formulario
        global $wpdb;
        
        // Obtener configuraciones actuales del formulario
        $current_settings = $wpdb->get_var($wpdb->prepare(
            "SELECT settings FROM {$this->forms_table} WHERE id = %d",
            $form_id
        ));
        
        // Decodificar configuraciones existentes
        $settings = json_decode($current_settings, true) ?: array();
        
        // Añadir/actualizar las variables globales
        $settings['global_variables'] = $global_variables;
        
        // Guardar de vuelta en la base de datos
        $result = $wpdb->update(
            $this->forms_table,
            array('settings' => json_encode($settings)),
            array('id' => $form_id),
            array('%s'),
            array('%d')
        );
        
        if ($result === false) {
            error_log('SFQ: ERROR saving global variables: ' . $wpdb->last_error);
        } else {
            
            // Verificar que se guardaron correctamente
            $verification = $wpdb->get_var($wpdb->prepare(
                "SELECT settings FROM {$this->forms_table} WHERE id = %d",
                $form_id
            ));
            
            $verified_settings = json_decode($verification, true);
            if (isset($verified_settings['global_variables'])) {
            } else {
                error_log('SFQ: WARNING - global variables not found in verification');
            }
        }
        
    }
    
    /**
     * ✅ CRÍTICO: Obtener variables globales del formulario
     */
    public function get_global_variables($form_id) {
        global $wpdb;
        
        $settings = $wpdb->get_var($wpdb->prepare(
            "SELECT settings FROM {$this->forms_table} WHERE id = %d",
            $form_id
        ));
        
        if (!$settings) {
            return array();
        }
        
        $decoded_settings = json_decode($settings, true);
        
        return isset($decoded_settings['global_variables']) && is_array($decoded_settings['global_variables']) 
            ? $decoded_settings['global_variables'] 
            : array();
    }
    
    /**
     * Limpiar cache relacionado con formularios
     * Mejora de WordPress best practices para gestión de cache
     */
    public function clear_form_cache($form_id = null) {
        if ($form_id) {
            // Limpiar cache específico del formulario (incluyendo cache optimizado)
            wp_cache_delete("sfq_form_{$form_id}", 'sfq_forms');
            wp_cache_delete("sfq_form_complete_{$form_id}", 'sfq_forms'); // ✅ NUEVO: Cache optimizado
            wp_cache_delete("sfq_form_data_{$form_id}", 'sfq_forms');
            wp_cache_delete("sfq_form_stats_{$form_id}", 'sfq_stats');
            
            // También limpiar transients relacionados
            delete_transient("sfq_form_complete_{$form_id}");
        } else {
            // Limpiar todo el cache de formularios
            wp_cache_flush_group('sfq_forms');
            wp_cache_flush_group('sfq_stats');
        }
    }
}
