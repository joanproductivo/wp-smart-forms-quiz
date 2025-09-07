<?php
/**
 * Migración de base de datos para añadir campo comparison_value
 */

if (!defined('ABSPATH')) {
    exit;
}

class SFQ_Migration {
    
    private $database;
    private static $migration_cache = array();
    private static $migration_lock = false;
    
    public function __construct() {
        $this->database = new SFQ_Database();
    }
    
    /**
     * ✅ NUEVO: Verificar si las migraciones ya están en progreso para evitar ejecuciones múltiples
     */
    private function is_migration_locked() {
        if (self::$migration_lock) {
            return true;
        }
        
        // Verificar lock en base de datos (para múltiples procesos)
        $lock_option = get_option('sfq_migration_lock', 0);
        $lock_time = intval($lock_option);
        
        // Si el lock tiene más de 5 minutos, considerarlo expirado
        if ($lock_time > 0 && (time() - $lock_time) > 300) {
            delete_option('sfq_migration_lock');
            return false;
        }
        
        return $lock_time > 0;
    }
    
    /**
     * ✅ NUEVO: Establecer lock de migración
     */
    private function set_migration_lock() {
        self::$migration_lock = true;
        update_option('sfq_migration_lock', time());
    }
    
    /**
     * ✅ NUEVO: Liberar lock de migración
     */
    private function release_migration_lock() {
        self::$migration_lock = false;
        delete_option('sfq_migration_lock');
    }
    
    /**
     * ✅ NUEVO: Función helper para validación segura de strings
     */
    private function safe_string_check($haystack, $needle) {
        if (!is_string($haystack) || empty($haystack)) {
            return false;
        }
        
        if (!is_string($needle) || empty($needle)) {
            return false;
        }
        
        return strpos($haystack, $needle) !== false;
    }
    
    /**
     * ✅ NUEVO: Función helper para reemplazo seguro de strings
     */
    private function safe_string_replace($search, $replace, $subject) {
        if (!is_string($subject) || empty($subject)) {
            return $subject;
        }
        
        if (!is_string($search) || !is_string($replace)) {
            return $subject;
        }
        
        return str_replace($search, $replace, $subject);
    }
    
    /**
     * Ejecutar migración para añadir campo comparison_value
     */
    public function migrate_add_comparison_value_field() {
        global $wpdb;
        
        $conditions_table = $wpdb->prefix . 'sfq_conditions';
        
        // Verificar si el campo ya existe
        $column_exists = $wpdb->get_results($wpdb->prepare(
            "SHOW COLUMNS FROM {$conditions_table} LIKE %s",
            'comparison_value'
        ));
        
        if (!empty($column_exists)) {
            return array(
                'success' => true,
                'message' => 'Campo comparison_value ya existe',
                'migrated_records' => 0
            );
        }
        
        // Añadir el nuevo campo
        $add_column_sql = "ALTER TABLE {$conditions_table} ADD COLUMN comparison_value VARCHAR(255) DEFAULT '' AFTER variable_amount";
        
        $result = $wpdb->query($add_column_sql);
        
        if ($result === false) {
            return array(
                'success' => false,
                'message' => 'Error al añadir el campo comparison_value: ' . $wpdb->last_error,
                'migrated_records' => 0
            );
        }
        
        
        // Migrar datos existentes
        $migrated_count = $this->migrate_existing_condition_data();
        
        return array(
            'success' => true,
            'message' => 'Campo comparison_value añadido y datos migrados exitosamente',
            'migrated_records' => $migrated_count
        );
    }
    
    /**
     * Migrar datos existentes de variable_amount a comparison_value
     */
    private function migrate_existing_condition_data() {
        global $wpdb;
        
        $conditions_table = $wpdb->prefix . 'sfq_conditions';
        
        // Obtener todas las condiciones de variables que necesitan migración
        $conditions_to_migrate = $wpdb->get_results($wpdb->prepare(
            "SELECT id, condition_type, variable_amount 
            FROM {$conditions_table} 
            WHERE condition_type IN ('variable_greater', 'variable_less', 'variable_equals') 
            AND (comparison_value IS NULL OR comparison_value = '')"
        ));
        
        if (empty($conditions_to_migrate)) {
            return 0;
        }
        
        $migrated_count = 0;
        
        foreach ($conditions_to_migrate as $condition) {
            // Para condiciones de variables, mover variable_amount a comparison_value
            $update_result = $wpdb->update(
                $conditions_table,
                array(
                    'comparison_value' => $condition->variable_amount
                ),
                array('id' => $condition->id),
                array('%s'),
                array('%d')
            );
            
            if ($update_result !== false) {
                $migrated_count++;
            } else {
            }
        }
        
        
        return $migrated_count;
    }
    
    /**
     * Verificar si la migración es necesaria
     */
    public function is_migration_needed() {
        global $wpdb;
        
        $conditions_table = $wpdb->prefix . 'sfq_conditions';
        
        // Verificar si el campo comparison_value existe
        $column_exists = $wpdb->get_results($wpdb->prepare(
            "SHOW COLUMNS FROM {$conditions_table} LIKE %s",
            'comparison_value'
        ));
        
        // También verificar si necesita crear la tabla de respuestas parciales
        $partial_table_needed = $this->is_partial_table_migration_needed();
        
        return empty($column_exists) || $partial_table_needed;
    }
    
    /**
     * ✅ NUEVO: Migración para crear tabla de respuestas parciales
     */
    public function migrate_create_partial_responses_table() {
        global $wpdb;
        
        $partial_table = $wpdb->prefix . 'sfq_partial_responses';
        
        // Verificar si la tabla ya existe
        $table_exists = $wpdb->get_var($wpdb->prepare("SHOW TABLES LIKE %s", $partial_table)) === $partial_table;
        
        if ($table_exists) {
            return array(
                'success' => true,
                'message' => 'Tabla sfq_partial_responses ya existe',
                'migrated_records' => 0
            );
        }
        
        $charset_collate = $wpdb->get_charset_collate();
        
        // SQL para crear la tabla de respuestas parciales
        $sql = "CREATE TABLE {$partial_table} (
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
        ) {$charset_collate};";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        
        $result = dbDelta($sql);
        
        // Verificar que la tabla se creó correctamente
        $table_created = $wpdb->get_var($wpdb->prepare("SHOW TABLES LIKE %s", $partial_table)) === $partial_table;
        
        if (!$table_created) {
            return array(
                'success' => false,
                'message' => 'Error al crear la tabla sfq_partial_responses',
                'migrated_records' => 0
            );
        }
        
        
        return array(
            'success' => true,
            'message' => 'Tabla sfq_partial_responses creada exitosamente',
            'migrated_records' => 0
        );
    }
    
    /**
     * Verificar si la migración de tabla parcial es necesaria
     */
    public function is_partial_table_migration_needed() {
        global $wpdb;
        
        $partial_table = $wpdb->prefix . 'sfq_partial_responses';
        $table_exists = $wpdb->get_var($wpdb->prepare("SHOW TABLES LIKE %s", $partial_table)) === $partial_table;
        
        return !$table_exists;
    }
    
    /**
     * ✅ OPTIMIZADO: Ejecutar todas las migraciones pendientes con sistema de locks
     */
    public function run_all_migrations() {
        // Verificar si las migraciones ya están en progreso
        if ($this->is_migration_locked()) {
            return array(
                'success' => false,
                'message' => 'Las migraciones ya están en progreso. Intenta de nuevo en unos minutos.',
                'locked' => true
            );
        }
        
        // Verificar si realmente necesitamos ejecutar migraciones
        if (!$this->is_migration_needed()) {
            return array(
                'success' => true,
                'message' => 'Todas las migraciones ya están aplicadas',
                'migrated_records' => 0,
                'skipped' => true
            );
        }
        
        // Establecer lock para evitar ejecuciones múltiples
        $this->set_migration_lock();
        
        $results = array();
        
        try {
            // Migración 1: Añadir campo comparison_value
            $comparison_needed = $this->is_comparison_field_migration_needed();
            if ($comparison_needed) {
                $results['comparison_value'] = $this->migrate_add_comparison_value_field();
            } else {
                $results['comparison_value'] = array(
                    'success' => true,
                    'message' => 'Migración comparison_value ya aplicada',
                    'migrated_records' => 0
                );
            }
            
            // Migración 2: Crear tabla de respuestas parciales
            if ($this->is_partial_table_migration_needed()) {
                $results['partial_responses_table'] = $this->migrate_create_partial_responses_table();
            } else {
                $results['partial_responses_table'] = array(
                    'success' => true,
                    'message' => 'Tabla sfq_partial_responses ya existe',
                    'migrated_records' => 0
                );
            }
            
            // Verificar que todas las migraciones fueron exitosas
            $all_successful = true;
            foreach ($results as $migration_result) {
                if (!$migration_result['success']) {
                    $all_successful = false;
                    break;
                }
            }
            
            if ($all_successful) {
                // Actualizar versión de la base de datos solo si todo fue exitoso
                update_option('sfq_db_version', '1.2.0');
                update_option('sfq_last_migration_run', time());
            }
            
            return array(
                'success' => $all_successful,
                'message' => $all_successful ? 'Todas las migraciones completadas exitosamente' : 'Algunas migraciones fallaron',
                'results' => $results,
                'db_version' => $all_successful ? '1.2.0' : get_option('sfq_db_version', '1.0.0')
            );
            
        } catch (Exception $e) {
            error_log('SFQ Migration Error: ' . $e->getMessage());
            
            return array(
                'success' => false,
                'message' => 'Error durante las migraciones: ' . $e->getMessage(),
                'results' => $results
            );
            
        } finally {
            // Siempre liberar el lock
            $this->release_migration_lock();
        }
    }
    
    /**
     * ✅ NUEVO: Verificar específicamente si la migración del campo comparison_value es necesaria
     */
    private function is_comparison_field_migration_needed() {
        // Usar cache para evitar consultas repetidas
        if (isset(self::$migration_cache['comparison_field_needed'])) {
            return self::$migration_cache['comparison_field_needed'];
        }
        
        global $wpdb;
        $conditions_table = $wpdb->prefix . 'sfq_conditions';
        
        // Verificar si el campo comparison_value existe
        $column_exists = $wpdb->get_results($wpdb->prepare(
            "SHOW COLUMNS FROM {$conditions_table} LIKE %s",
            'comparison_value'
        ));
        
        $needed = empty($column_exists);
        self::$migration_cache['comparison_field_needed'] = $needed;
        
        return $needed;
    }
    
    /**
     * Verificar integridad después de la migración
     */
    public function verify_migration_integrity() {
        global $wpdb;
        
        $conditions_table = $wpdb->prefix . 'sfq_conditions';
        
        // Verificar que el campo existe
        $column_exists = $wpdb->get_results($wpdb->prepare(
            "SHOW COLUMNS FROM {$conditions_table} LIKE %s",
            'comparison_value'
        ));
        
        if (empty($column_exists)) {
            return array(
                'success' => false,
                'message' => 'Campo comparison_value no existe después de la migración'
            );
        }
        
        // Verificar que las condiciones de variables tienen valores en comparison_value
        $variable_conditions = $wpdb->get_results($wpdb->prepare(
            "SELECT id, condition_type, variable_amount, comparison_value 
            FROM {$conditions_table} 
            WHERE condition_type IN ('variable_greater', 'variable_less', 'variable_equals')"
        ));
        
        $issues = array();
        
        foreach ($variable_conditions as $condition) {
            if (empty($condition->comparison_value) && !empty($condition->variable_amount)) {
                $issues[] = "Condición ID {$condition->id} ({$condition->condition_type}) tiene variable_amount pero no comparison_value";
            }
        }
        
        if (!empty($issues)) {
            return array(
                'success' => false,
                'message' => 'Se encontraron problemas de integridad',
                'issues' => $issues
            );
        }
        
        return array(
            'success' => true,
            'message' => 'Migración verificada correctamente',
            'variable_conditions_count' => count($variable_conditions)
        );
    }
}
