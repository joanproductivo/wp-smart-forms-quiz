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
        
        // Guardar versión de la base de datos
        update_option('sfq_db_version', '1.0.0');
    }
    
    /**
     * Obtener todos los formularios
     */
    public function get_forms($args = array()) {
        global $wpdb;
        
        $defaults = array(
            'status' => 'active',
            'type' => '',
            'orderby' => 'created_at',
            'order' => 'DESC',
            'limit' => -1,
            'offset' => 0
        );
        
        $args = wp_parse_args($args, $defaults);
        
        $where = array("1=1");
        
        if (!empty($args['status'])) {
            $where[] = $wpdb->prepare("status = %s", $args['status']);
        }
        
        if (!empty($args['type'])) {
            $where[] = $wpdb->prepare("type = %s", $args['type']);
        }
        
        $where_clause = implode(' AND ', $where);
        $order_clause = sprintf("%s %s", $args['orderby'], $args['order']);
        
        $query = "SELECT * FROM {$this->forms_table} WHERE {$where_clause} ORDER BY {$order_clause}";
        
        if ($args['limit'] > 0) {
            $query .= $wpdb->prepare(" LIMIT %d OFFSET %d", $args['limit'], $args['offset']);
        }
        
        return $wpdb->get_results($query);
    }
    
    /**
     * Obtener un formulario por ID
     */
    public function get_form($form_id) {
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
        
        try {
            $questions = $wpdb->get_results($wpdb->prepare(
                "SELECT * FROM {$this->questions_table} 
                WHERE form_id = %d 
                ORDER BY order_position ASC",
                $form_id
            ));
            
            if (!$questions) {
                error_log("SFQ Database: No questions found for form ID {$form_id}");
                return [];
            }
            
            error_log("SFQ Database: Found " . count($questions) . " questions for form ID {$form_id}");
            
            foreach ($questions as $index => &$question) {
                $question = $this->process_question_data($question, $index);
            }
            
            return $questions;
            
        } catch (Exception $e) {
            error_log("SFQ Database Error in get_questions: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Procesar datos de una pregunta individual
     */
    private function process_question_data($question, $index = 0) {
        try {
            // Log datos originales para debugging
            error_log("SFQ Processing question {$index}: ID={$question->id}, Type={$question->question_type}");
            
            // Procesar opciones con validación robusta
            $question->options = $this->process_question_options($question->options, $question->id);
            
            // Procesar configuraciones
            $question->settings = $this->process_question_settings($question->settings);
            
            // Procesar campo required con múltiples formatos posibles
            $question->required = $this->process_required_field($question->required);
            
            // Obtener y procesar condiciones
            $question->conditions = $this->get_conditions($question->id);
            if (!is_array($question->conditions)) {
                $question->conditions = [];
            }
            
            // Asegurar que todos los campos necesarios existan
            $question->question_text = $question->question_text ?? '';
            $question->question_type = $question->question_type ?? 'text';
            $question->order_position = $question->order_position ?? $index;
            
            error_log("SFQ Processed question {$index}: Options=" . count($question->options) . ", Conditions=" . count($question->conditions));
            
            return $question;
            
        } catch (Exception $e) {
            error_log("SFQ Error processing question {$index}: " . $e->getMessage());
            
            // Retornar pregunta con valores por defecto en caso de error
            $question->options = [];
            $question->conditions = [];
            $question->settings = [];
            $question->required = 0;
            
            return $question;
        }
    }
    
    /**
     * Procesar opciones de pregunta
     */
    private function process_question_options($options, $question_id) {
        if (empty($options)) {
            return [];
        }
        
        // Si es string, intentar decodificar JSON
        if (is_string($options)) {
            $decoded = json_decode(stripslashes($options), true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $options = $decoded;
            } else {
                error_log("SFQ Warning: Failed to decode options JSON for question {$question_id}: " . json_last_error_msg());
                return [];
            }
        }
        
        // Si no es array, retornar vacío
        if (!is_array($options)) {
            return [];
        }
        
        // Procesar cada opción para asegurar estructura consistente
        $processed_options = [];
        foreach ($options as $option) {
            if (is_string($option)) {
                $processed_options[] = [
                    'text' => $option,
                    'value' => $option
                ];
            } elseif (is_array($option)) {
                $processed_options[] = [
                    'text' => $option['text'] ?? $option['value'] ?? '',
                    'value' => $option['value'] ?? $option['text'] ?? ''
                ];
            } elseif (is_object($option)) {
                $processed_options[] = [
                    'text' => $option->text ?? $option->value ?? '',
                    'value' => $option->value ?? $option->text ?? ''
                ];
            }
        }
        
        // Filtrar opciones vacías
        $processed_options = array_filter($processed_options, function($option) {
            return !empty(trim($option['text']));
        });
        
        return array_values($processed_options);
    }
    
    /**
     * Procesar configuraciones de pregunta
     */
    private function process_question_settings($settings) {
        if (empty($settings)) {
            return [];
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
        
        return [];
    }
    
    /**
     * Procesar campo required
     */
    private function process_required_field($required) {
        if (is_bool($required)) {
            return $required ? 1 : 0;
        }
        
        if (is_numeric($required)) {
            return intval($required) ? 1 : 0;
        }
        
        if (is_string($required)) {
            $required = strtolower(trim($required));
            return in_array($required, ['1', 'true', 'yes', 'on']) ? 1 : 0;
        }
        
        return 0;
    }
    
    /**
     * Obtener condiciones de una pregunta
     */
    public function get_conditions($question_id) {
        global $wpdb;
        
        return $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$this->conditions_table} 
            WHERE question_id = %d 
            ORDER BY order_position ASC",
            $question_id
        ));
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
        
        return $form_id;
    }
    
    /**
     * Guardar preguntas
     */
    private function save_questions($form_id, $questions) {
        global $wpdb;

        // Obtener las preguntas existentes para comparar
        $existing_questions = $wpdb->get_results($wpdb->prepare(
            "SELECT id, question_text FROM {$this->questions_table} WHERE form_id = %d",
            $form_id
        ), OBJECT_K);

        $updated_question_ids = [];

        foreach ($questions as $index => $question) {
            $question_data = array(
                'form_id' => $form_id,
                'question_text' => sanitize_textarea_field($question['question_text']),
                'question_type' => sanitize_text_field($question['question_type']),
                'options' => json_encode($question['options'] ?? array()),
                'settings' => json_encode($question['settings'] ?? array()),
                'required' => isset($question['required']) && $question['required'] ? 1 : 0,
                'order_position' => $index,
                'variable_name' => sanitize_text_field($question['variable_name'] ?? ''),
                'variable_value' => intval($question['variable_value'] ?? 0)
            );

            // Intentar encontrar una pregunta existente con el mismo texto
            $existing_question_id = null;
            if (isset($question['id'])) {
                $existing_question_id = $question['id'];
            } else {
                foreach ($existing_questions as $id => $existing_question) {
                    if ($existing_question->question_text === $question['question_text']) {
                        $existing_question_id = $id;
                        break;
                    }
                }
            }

            if ($existing_question_id && isset($existing_questions[$existing_question_id])) {
                // Actualizar pregunta existente
                $wpdb->update(
                    $this->questions_table,
                    $question_data,
                    array('id' => $existing_question_id),
                    array('%d', '%s', '%s', '%s', '%s', '%d', '%d', '%s', '%d'),
                    array('%d')
                );
                $question_id = $existing_question_id;
                unset($existing_questions[$existing_question_id]);
            } else {
                // Insertar nueva pregunta
                $wpdb->insert(
                    $this->questions_table,
                    $question_data,
                    array('%d', '%s', '%s', '%s', '%s', '%d', '%d', '%s', '%d')
                );
                $question_id = $wpdb->insert_id;
            }

            $updated_question_ids[] = $question_id;

            // Guardar condiciones si existen
            if (isset($question['conditions']) && is_array($question['conditions'])) {
                $this->save_conditions($question_id, $question['conditions']);
            }
        }

        // Eliminar preguntas que ya no existen
        $questions_to_delete = array_keys($existing_questions);
        if (!empty($questions_to_delete)) {
            $placeholders = implode(',', array_fill(0, count($questions_to_delete), '%d'));
            $wpdb->query($wpdb->prepare(
                "DELETE FROM {$this->questions_table} WHERE id IN ($placeholders)",
                $questions_to_delete
            ));
        }
    }
    
    /**
     * Guardar condiciones
     */
    private function save_conditions($question_id, $conditions) {
        global $wpdb;
        
        // Eliminar condiciones existentes
        $wpdb->delete($this->conditions_table, array('question_id' => $question_id), array('%d'));
        
        foreach ($conditions as $index => $condition) {
            $condition_data = array(
                'question_id' => $question_id,
                'condition_type' => sanitize_text_field($condition['condition_type']),
                'condition_value' => sanitize_text_field($condition['condition_value']),
                'action_type' => sanitize_text_field($condition['action_type']),
                'action_value' => sanitize_text_field($condition['action_value']),
                'variable_operation' => sanitize_text_field($condition['variable_operation'] ?? ''),
                'variable_amount' => intval($condition['variable_amount'] ?? 0),
                'order_position' => $index
            );
            
            $wpdb->insert(
                $this->conditions_table,
                $condition_data,
                array('%d', '%s', '%s', '%s', '%s', '%s', '%d', '%d')
            );
        }
    }
    
    /**
     * Registrar una vista
     */
    public function register_view($form_id, $session_id) {
        global $wpdb;
        
        $wpdb->insert(
            $this->analytics_table,
            array(
                'form_id' => $form_id,
                'event_type' => 'view',
                'session_id' => $session_id,
                'user_ip' => $this->get_user_ip()
            ),
            array('%d', '%s', '%s', '%s')
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
}
