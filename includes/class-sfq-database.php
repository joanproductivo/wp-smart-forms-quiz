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
    
    public function __construct() {
        global $wpdb;
        $this->forms_table = $wpdb->prefix . 'sfq_forms';
        $this->questions_table = $wpdb->prefix . 'sfq_questions';
        $this->responses_table = $wpdb->prefix . 'sfq_responses';
        $this->submissions_table = $wpdb->prefix . 'sfq_submissions';
        $this->analytics_table = $wpdb->prefix . 'sfq_analytics';
        $this->conditions_table = $wpdb->prefix . 'sfq_conditions';
        
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
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql_forms);
        dbDelta($sql_questions);
        dbDelta($sql_responses);
        dbDelta($sql_submissions);
        dbDelta($sql_analytics);
        dbDelta($sql_conditions);
        
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
     * Obtener un formulario por ID con cache optimizado
     */
    public function get_form($form_id) {
        // Verificar cache primero
        $cache_key = "sfq_form_{$form_id}";
        $cached_form = wp_cache_get($cache_key, 'sfq_forms');
        
        if ($cached_form !== false) {
            return $cached_form;
        }
        
        global $wpdb;
        
        $form = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$this->forms_table} WHERE id = %d",
            $form_id
        ));
        
        if ($form) {
            // Decodificar configuraciones JSON
            $form->settings = json_decode($form->settings, true) ?: array();
            $form->style_settings = json_decode($form->style_settings, true) ?: array();
            
            // Obtener preguntas
            $form->questions = $this->get_questions($form_id);
            
            // Ensure questions is always an array
            if (!is_array($form->questions)) {
                $form->questions = array();
            }
            
            // Cachear el resultado por 5 minutos
            wp_cache_set($cache_key, $form, 'sfq_forms', 300);
        }
        
        return $form;
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
        // Procesar según el tipo de pregunta
        if ($question->question_type === 'freestyle') {
            // Para preguntas freestyle, los elementos están en el campo options
            $question->freestyle_elements = $this->process_freestyle_elements($question->options);
            $question->options = []; // Las preguntas freestyle no tienen opciones tradicionales
            
            // Procesar configuraciones globales de freestyle
            $settings = $this->process_question_settings($question->settings);
            $question->global_settings = $settings['global_settings'] ?? [];
            $question->settings = $settings;
        } else {
            // Para preguntas regulares, procesar opciones normalmente
            $question->options = $this->process_question_options($question->options);
        }
        
        // Procesar configuraciones
        if (!isset($question->settings)) {
            $question->settings = $this->process_question_settings($question->settings);
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
        
        if (!is_array($elements)) {
            return [];
        }
        
        // Procesar cada elemento
        $processed_elements = [];
        foreach ($elements as $element) {
            if (!is_array($element) || empty($element['type'])) {
                continue;
            }
            
            // Validar que el tipo sea válido
            $valid_types = ['text', 'video', 'image', 'countdown', 'phone', 'email', 'file_upload', 'button', 'rating', 'dropdown', 'checkbox', 'legal_text'];
            if (!in_array($element['type'], $valid_types)) {
                continue;
            }
            
            $processed_elements[] = [
                'id' => $element['id'] ?? 'element_' . time() . '_' . count($processed_elements),
                'type' => $element['type'],
                'label' => sanitize_text_field($element['label'] ?? ''),
                'order' => intval($element['order'] ?? count($processed_elements)),
                'settings' => is_array($element['settings'] ?? null) ? $element['settings'] : [],
                'value' => sanitize_text_field($element['value'] ?? '')
            ];
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
        error_log("SFQ: === GET CONDITIONS DEBUG ===");
        error_log("SFQ: Question ID: " . $question_id);
        error_log("SFQ: Conditions found: " . count($conditions));
        error_log("SFQ: Conditions data: " . json_encode($conditions));
        error_log("SFQ: === END GET CONDITIONS DEBUG ===");
        
        return $conditions;
    }
    
    /**
     * Guardar un formulario
     */
    public function save_form($data) {
        global $wpdb;
        
        // Preparar datos
        $form_data = array(
            'title' => sanitize_text_field($data['title']),
            'description' => sanitize_textarea_field($data['description'] ?? ''),
            'type' => in_array($data['type'], array('form', 'quiz')) ? $data['type'] : 'form',
            'settings' => json_encode($data['settings'] ?? array()),
            'style_settings' => json_encode($data['style_settings'] ?? array()),
            'intro_title' => sanitize_text_field($data['intro_title'] ?? ''),
            'intro_description' => sanitize_textarea_field($data['intro_description'] ?? ''),
            'intro_button_text' => sanitize_text_field($data['intro_button_text'] ?? 'Comenzar'),
            'thank_you_message' => wp_kses_post($data['thank_you_message'] ?? ''),
            'redirect_url' => esc_url_raw($data['redirect_url'] ?? ''),
            'status' => $data['status'] ?? 'active'
        );
        
        if (isset($data['id']) && $data['id'] > 0) {
            // Actualizar formulario existente
            $result = $wpdb->update(
                $this->forms_table,
                $form_data,
                array('id' => $data['id']),
                array('%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s'),
                array('%d')
            );
            
            $form_id = $data['id'];
        } else {
            // Crear nuevo formulario
            $result = $wpdb->insert(
                $this->forms_table,
                $form_data,
                array('%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s')
            );
            
            $form_id = $wpdb->insert_id;
        }
        
        // Guardar preguntas si existen
        if (isset($data['questions']) && is_array($data['questions'])) {
            $this->save_questions($form_id, $data['questions']);
        }
        
        // Limpiar cache después de guardar
        $this->clear_form_cache($form_id);
        
        return $form_id;
    }
    
    /**
     * Guardar preguntas (optimizado con transacciones)
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

            // Process questions and prepare batch operations
            foreach ($questions as $index => $question) {
                // Para preguntas freestyle, guardar elementos en el campo options
                $options_data = array();
                if ($question['question_type'] === 'freestyle') {
                    $options_data = $question['freestyle_elements'] ?? array();
                } else {
                    $options_data = $question['options'] ?? array();
                }
                
                $question_data = array(
                    'form_id' => $form_id,
                    'question_text' => sanitize_textarea_field($question['question_text']),
                    'question_type' => sanitize_text_field($question['question_type']),
                    'options' => wp_json_encode($options_data),
                    'settings' => wp_json_encode($question['settings'] ?? array()),
                    'required' => isset($question['required']) && $question['required'] ? 1 : 0,
                    'order_position' => $index,
                    'variable_name' => sanitize_text_field($question['variable_name'] ?? ''),
                    'variable_value' => intval($question['variable_value'] ?? 0)
                );

                $existing_question_id = null;
                
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
                    // Prepare for update
                    $questions_to_update[] = array(
                        'id' => $existing_question_id,
                        'data' => $question_data,
                        'conditions' => $question['conditions'] ?? []
                    );
                    $updated_question_ids[] = $existing_question_id;
                    unset($existing_questions[$existing_question_id]);
                } else {
                    // Prepare for insert
                    $questions_to_insert[] = array(
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

                // Save conditions
                if (!empty($update_data['conditions'])) {
                    $this->save_conditions($update_data['id'], $update_data['conditions']);
                }
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

                // Save conditions
                if (!empty($insert_data['conditions'])) {
                    $this->save_conditions($question_id, $insert_data['conditions']);
                }
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
            
        } catch (Exception $e) {
            $wpdb->query('ROLLBACK');
            throw $e;
        }
    }
    
    /**
     * Guardar condiciones
     */
    private function save_conditions($question_id, $conditions) {
        global $wpdb;
        
        // Debug logging
        error_log("SFQ: === SAVE CONDITIONS DEBUG ===");
        error_log("SFQ: Question ID: " . $question_id);
        error_log("SFQ: Conditions received: " . json_encode($conditions));
        error_log("SFQ: Conditions count: " . count($conditions));
        
        // CRÍTICO: Verificar que question_id es válido
        if (!$question_id || !is_numeric($question_id) || intval($question_id) <= 0) {
            error_log("SFQ: ERROR - Invalid question_id: " . $question_id);
            return;
        }
        
        $question_id = intval($question_id);
        
        // PASO 1: Eliminar TODAS las condiciones existentes para esta pregunta
        // Usar una consulta más robusta
        $delete_query = $wpdb->prepare(
            "DELETE FROM {$this->conditions_table} WHERE question_id = %d",
            $question_id
        );
        
        error_log("SFQ: Delete query: " . $delete_query);
        $deleted_count = $wpdb->query($delete_query);
        
        if ($deleted_count === false) {
            error_log("SFQ: ERROR - Failed to delete existing conditions: " . $wpdb->last_error);
            return;
        }
        
        error_log("SFQ: Successfully deleted " . $deleted_count . " existing conditions");
        
        // PASO 2: Verificar que la eliminación fue exitosa
        $remaining_check = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$this->conditions_table} WHERE question_id = %d",
            $question_id
        ));
        
        if ($remaining_check > 0) {
            error_log("SFQ: WARNING - Still " . $remaining_check . " conditions remaining after delete!");
            // Intentar eliminación forzada
            $force_delete = $wpdb->query($wpdb->prepare(
                "DELETE FROM {$this->conditions_table} WHERE question_id = %d",
                $question_id
            ));
            error_log("SFQ: Force delete result: " . $force_delete);
        } else {
            error_log("SFQ: ✅ All existing conditions successfully deleted");
        }
        
        // PASO 3: Insertar las nuevas condiciones (solo si hay alguna)
        $inserted_count = 0;
        
        if (!empty($conditions) && is_array($conditions)) {
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
                    error_log("SFQ: ✅ Successfully inserted condition with ID: " . $wpdb->insert_id);
                } else {
                    error_log("SFQ: ❌ Failed to insert condition: " . $wpdb->last_error);
                }
            }
        } else {
            error_log("SFQ: No conditions to insert (empty or invalid array)");
        }
        
        error_log("SFQ: Total conditions inserted: " . $inserted_count);
        
        // PASO 4: Verificación final
        $final_conditions = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$this->conditions_table} WHERE question_id = %d ORDER BY order_position",
            $question_id
        ));
        
        $final_count = count($final_conditions);
        $expected_count = count($conditions);
        
        error_log("SFQ: === FINAL VERIFICATION ===");
        error_log("SFQ: Expected conditions: " . $expected_count);
        error_log("SFQ: Final conditions in DB: " . $final_count);
        
        if ($final_count === $expected_count) {
            error_log("SFQ: ✅ SUCCESS - Condition count matches expected");
        } else {
            error_log("SFQ: ❌ MISMATCH - Expected " . $expected_count . " but found " . $final_count);
            error_log("SFQ: Final conditions data: " . json_encode($final_conditions));
        }
        
        error_log("SFQ: === END SAVE CONDITIONS DEBUG ===");
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
     * Limpiar cache relacionado con formularios
     * Mejora de WordPress best practices para gestión de cache
     */
    public function clear_form_cache($form_id = null) {
        if ($form_id) {
            // Limpiar cache específico del formulario
            wp_cache_delete("sfq_form_{$form_id}", 'sfq_forms');
            wp_cache_delete("sfq_form_data_{$form_id}", 'sfq_forms');
            wp_cache_delete("sfq_form_stats_{$form_id}", 'sfq_stats');
        } else {
            // Limpiar todo el cache de formularios
            wp_cache_flush_group('sfq_forms');
            wp_cache_flush_group('sfq_stats');
        }
    }
}
