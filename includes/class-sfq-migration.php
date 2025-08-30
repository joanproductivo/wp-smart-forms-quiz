<?php
/**
 * Migración de base de datos para añadir campo comparison_value
 */

if (!defined('ABSPATH')) {
    exit;
}

class SFQ_Migration {
    
    private $database;
    
    public function __construct() {
        $this->database = new SFQ_Database();
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
            error_log('SFQ Migration: Campo comparison_value ya existe');
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
            error_log('SFQ Migration Error: No se pudo añadir el campo comparison_value: ' . $wpdb->last_error);
            return array(
                'success' => false,
                'message' => 'Error al añadir el campo comparison_value: ' . $wpdb->last_error,
                'migrated_records' => 0
            );
        }
        
        error_log('SFQ Migration: Campo comparison_value añadido exitosamente');
        
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
            error_log('SFQ Migration: No hay condiciones para migrar');
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
                error_log("SFQ Migration: Migrada condición ID {$condition->id} - {$condition->condition_type} - valor: {$condition->variable_amount}");
            } else {
                error_log("SFQ Migration Error: No se pudo migrar condición ID {$condition->id}: " . $wpdb->last_error);
            }
        }
        
        error_log("SFQ Migration: Migradas {$migrated_count} condiciones de un total de " . count($conditions_to_migrate));
        
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
        
        return empty($column_exists);
    }
    
    /**
     * Ejecutar todas las migraciones pendientes
     */
    public function run_all_migrations() {
        $results = array();
        
        // Migración 1: Añadir campo comparison_value
        if ($this->is_migration_needed()) {
            $results['comparison_value'] = $this->migrate_add_comparison_value_field();
        } else {
            $results['comparison_value'] = array(
                'success' => true,
                'message' => 'Migración comparison_value ya aplicada',
                'migrated_records' => 0
            );
        }
        
        // Actualizar versión de la base de datos
        update_option('sfq_db_version', '1.1.0');
        
        return $results;
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
