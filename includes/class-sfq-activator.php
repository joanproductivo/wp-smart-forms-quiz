<?php
/**
 * Activador del plugin - Maneja la activación y creación de tablas
 */

if (!defined('ABSPATH')) {
    exit;
}

class SFQ_Activator {
    
    /**
     * Método principal de activación
     */
    public static function activate() {
        self::create_tables();
        self::run_migrations();
        self::set_default_options();
        self::create_capabilities();
        
        // Limpiar el caché de rewrite rules
        flush_rewrite_rules();
    }
    
    /**
     * Ejecutar migraciones de base de datos
     */
    private static function run_migrations() {
        $migration = new SFQ_Migration();
        
        // Verificar si necesita migración
        if ($migration->is_migration_needed()) {
            
            $migration_results = $migration->run_all_migrations();
            
            foreach ($migration_results as $migration_name => $result) {
                if ($result['success']) {
                } else {
                }
            }
            
            // Verificar integridad después de la migración
            $integrity_check = $migration->verify_migration_integrity();
            if ($integrity_check['success']) {
            } else {
            }
        } else {
        }
    }
    
    /**
     * Crear todas las tablas necesarias
     */
    public static function create_tables() {
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        
        // Tabla de formularios
        $table_forms = $wpdb->prefix . 'sfq_forms';
        $sql_forms = "CREATE TABLE IF NOT EXISTS $table_forms (
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
        $table_questions = $wpdb->prefix . 'sfq_questions';
        $sql_questions = "CREATE TABLE IF NOT EXISTS $table_questions (
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
        $table_responses = $wpdb->prefix . 'sfq_responses';
        $sql_responses = "CREATE TABLE IF NOT EXISTS $table_responses (
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
        $table_submissions = $wpdb->prefix . 'sfq_submissions';
        $sql_submissions = "CREATE TABLE IF NOT EXISTS $table_submissions (
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
        $table_analytics = $wpdb->prefix . 'sfq_analytics';
        $sql_analytics = "CREATE TABLE IF NOT EXISTS $table_analytics (
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
        $table_conditions = $wpdb->prefix . 'sfq_conditions';
        $sql_conditions = "CREATE TABLE IF NOT EXISTS $table_conditions (
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
        
        // ✅ NUEVA: Tabla de respuestas parciales
        $table_partial_responses = $wpdb->prefix . 'sfq_partial_responses';
        $sql_partial_responses = "CREATE TABLE IF NOT EXISTS $table_partial_responses (
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
        
        // Ejecutar las consultas
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        
        dbDelta($sql_forms);
        dbDelta($sql_questions);
        dbDelta($sql_responses);
        dbDelta($sql_submissions);
        dbDelta($sql_analytics);
        dbDelta($sql_conditions);
        dbDelta($sql_partial_responses); // ✅ NUEVO
        
        // Crear tablas de webhooks
        $webhooks = new SFQ_Webhooks();
        $webhooks->create_tables();
        
        // Verificar que las tablas se crearon correctamente
        $tables_created = self::verify_tables();
        
        if ($tables_created) {
            update_option('sfq_db_version', '1.0.1');
            update_option('sfq_tables_verified', true);
        }
    }
    
    /**
     * Verificar que todas las tablas existen
     */
    public static function verify_tables() {
        global $wpdb;
        
        $required_tables = array(
            $wpdb->prefix . 'sfq_forms',
            $wpdb->prefix . 'sfq_questions',
            $wpdb->prefix . 'sfq_responses',
            $wpdb->prefix . 'sfq_submissions',
            $wpdb->prefix . 'sfq_analytics',
            $wpdb->prefix . 'sfq_conditions',
            $wpdb->prefix . 'sfq_partial_responses' // ✅ NUEVO
        );
        
        foreach ($required_tables as $table) {
            $table_exists = $wpdb->get_var("SHOW TABLES LIKE '$table'") === $table;
            if (!$table_exists) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Establecer opciones por defecto
     */
    private static function set_default_options() {
        // Opciones generales del plugin
        add_option('sfq_settings', array(
            'enable_analytics' => true,
            'enable_notifications' => false,
            'default_form_type' => 'form',
            'enable_recaptcha' => false,
            'recaptcha_site_key' => '',
            'recaptcha_secret_key' => '',
            'enable_auto_save' => true,
            'auto_save_interval' => 60, // segundos
            'enable_partial_submissions' => true,
            'delete_data_on_uninstall' => false
        ));
        
        // Estilos por defecto
        add_option('sfq_default_styles', array(
            'primary_color' => '#007cba',
            'secondary_color' => '#6c757d',
            'background_color' => '#ffffff',
            'text_color' => '#333333',
            'border_radius' => '8',
            'font_family' => 'inherit',
            'button_style' => 'rounded',
            'animation_type' => 'fade'
        ));
        
        // Mensajes por defecto
        add_option('sfq_default_messages', array(
            'loading' => __('Cargando...', 'smart-forms-quiz'),
            'error' => __('Ha ocurrido un error. Por favor, inténtalo de nuevo.', 'smart-forms-quiz'),
            'required_field' => __('Este campo es obligatorio', 'smart-forms-quiz'),
            'invalid_email' => __('Por favor, introduce un email válido', 'smart-forms-quiz'),
            'submission_success' => __('¡Gracias! Tu respuesta ha sido enviada correctamente.', 'smart-forms-quiz'),
            'submission_error' => __('Error al enviar el formulario. Por favor, inténtalo de nuevo.', 'smart-forms-quiz')
        ));
    }
    
    /**
     * Crear capacidades personalizadas
     */
    private static function create_capabilities() {
        $role = get_role('administrator');
        
        if ($role) {
            $role->add_cap('manage_smart_forms');
            $role->add_cap('create_smart_forms');
            $role->add_cap('edit_smart_forms');
            $role->add_cap('delete_smart_forms');
            $role->add_cap('view_smart_forms_analytics');
            $role->add_cap('export_smart_forms_data');
        }
        
        // También dar permisos a editores
        $editor = get_role('editor');
        if ($editor) {
            $editor->add_cap('manage_smart_forms');
            $editor->add_cap('create_smart_forms');
            $editor->add_cap('edit_smart_forms');
            $editor->add_cap('view_smart_forms_analytics');
        }
    }
    
    /**
     * Crear formulario de ejemplo
     */
    public static function create_sample_form() {
        $database = new SFQ_Database();
        
        $sample_form = array(
            'title' => __('Formulario de Ejemplo', 'smart-forms-quiz'),
            'description' => __('Este es un formulario de ejemplo para demostrar las capacidades del plugin', 'smart-forms-quiz'),
            'type' => 'form',
            'intro_title' => __('¡Bienvenido!', 'smart-forms-quiz'),
            'intro_description' => __('Este es un formulario de ejemplo. Haz clic en comenzar para empezar.', 'smart-forms-quiz'),
            'intro_button_text' => __('Comenzar', 'smart-forms-quiz'),
            'thank_you_message' => __('¡Gracias por completar el formulario!', 'smart-forms-quiz'),
            'settings' => array(
                'show_progress_bar' => true,
                'auto_advance' => true,
                'allow_back' => true
            ),
            'style_settings' => array(
                'primary_color' => '#007cba',
                'border_radius' => '8'
            ),
            'questions' => array(
                array(
                    'question_text' => __('¿Cuál es tu nombre?', 'smart-forms-quiz'),
                    'question_type' => 'text',
                    'required' => true,
                    'order_position' => 0
                ),
                array(
                    'question_text' => __('¿Cuál es tu email?', 'smart-forms-quiz'),
                    'question_type' => 'email',
                    'required' => true,
                    'order_position' => 1
                ),
                array(
                    'question_text' => __('¿Cómo calificarías tu experiencia?', 'smart-forms-quiz'),
                    'question_type' => 'single_choice',
                    'required' => false,
                    'order_position' => 2,
                    'options' => array(
                        array('text' => __('Excelente', 'smart-forms-quiz'), 'value' => 'excellent'),
                        array('text' => __('Buena', 'smart-forms-quiz'), 'value' => 'good'),
                        array('text' => __('Regular', 'smart-forms-quiz'), 'value' => 'regular'),
                        array('text' => __('Mala', 'smart-forms-quiz'), 'value' => 'bad')
                    )
                )
            )
        );
        
        $database->save_form($sample_form);
    }
}
