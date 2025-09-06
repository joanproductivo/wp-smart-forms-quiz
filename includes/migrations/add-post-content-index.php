<?php
/**
 * Migración para añadir índices de base de datos para optimizar consultas de formularios
 * 
 * Esta migración añade índices FULLTEXT y compuestos para mejorar el rendimiento
 * de las consultas que buscan formularios en el contenido de los posts.
 */

if (!defined('ABSPATH')) {
    exit;
}

class SFQ_Migration_Add_Post_Content_Index {
    
    private $version = '1.2.0';
    private $option_key = 'sfq_post_content_index_version';
    
    /**
     * Ejecutar migración si es necesaria
     */
    public function maybe_run() {
        $current_version = get_option($this->option_key, '0.0.0');
        
        if (version_compare($current_version, $this->version, '<')) {
            $this->run_migration();
            update_option($this->option_key, $this->version);
        }
    }
    
    /**
     * Ejecutar la migración
     */
    private function run_migration() {
        global $wpdb;
        
        try {
            // Verificar si ya existen los índices antes de crearlos
            if (!$this->index_exists('idx_sfq_post_content_search')) {
                $this->add_post_content_search_index();
            }
            
            if (!$this->index_exists('idx_sfq_post_status_type_date')) {
                $this->add_composite_index();
            }
            
            // Log de éxito
            error_log('SFQ: Índices de base de datos añadidos correctamente');
            
        } catch (Exception $e) {
            // Log del error pero no fallar completamente
            error_log('SFQ: Error al añadir índices de base de datos: ' . $e->getMessage());
        }
    }
    
    /**
     * Verificar si un índice existe
     */
    private function index_exists($index_name) {
        global $wpdb;
        
        try {
            // Método principal usando INFORMATION_SCHEMA
            $result = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
                WHERE table_schema = %s 
                AND table_name = %s 
                AND index_name = %s",
                DB_NAME,
                $wpdb->posts,
                $index_name
            ));
            
            if ($result !== null) {
                return $result > 0;
            }
            
        } catch (Exception $e) {
            error_log('SFQ: Error accediendo a INFORMATION_SCHEMA: ' . $e->getMessage());
        }
        
        // Fallback: usar SHOW INDEX
        try {
            $indexes = $wpdb->get_results("SHOW INDEX FROM {$wpdb->posts}");
            
            if (is_array($indexes)) {
                foreach ($indexes as $index) {
                    if (isset($index->Key_name) && $index->Key_name === $index_name) {
                        return true;
                    }
                }
            }
            
        } catch (Exception $e) {
            error_log('SFQ: Error usando SHOW INDEX: ' . $e->getMessage());
        }
        
        // Si todo falla, asumir que no existe
        return false;
    }
    
    /**
     * Añadir índice FULLTEXT para búsquedas en post_content
     */
    private function add_post_content_search_index() {
        global $wpdb;
        
        try {
            // Verificar que el motor de la tabla soporte FULLTEXT
            $engine = $wpdb->get_var($wpdb->prepare(
                "SELECT ENGINE FROM INFORMATION_SCHEMA.TABLES 
                WHERE table_schema = %s AND table_name = %s",
                DB_NAME,
                $wpdb->posts
            ));
            
            if (in_array(strtoupper($engine), ['MYISAM', 'INNODB'])) {
                // Verificar versión de MySQL para FULLTEXT en InnoDB
                $mysql_version = $wpdb->get_var("SELECT VERSION()");
                $version_number = floatval($mysql_version);
                
                if (strtoupper($engine) === 'INNODB' && $version_number < 5.6) {
                    // InnoDB FULLTEXT solo disponible desde MySQL 5.6
                    $this->add_regular_content_index();
                } else {
                    // Añadir índice FULLTEXT
                    $result = $wpdb->query(
                        "ALTER TABLE {$wpdb->posts} 
                        ADD FULLTEXT INDEX idx_sfq_post_content_search (post_content)"
                    );
                    
                    if ($result === false) {
                        throw new Exception('Error al crear índice FULLTEXT: ' . $wpdb->last_error);
                    }
                    
                    error_log('SFQ: Índice FULLTEXT añadido a post_content');
                }
            } else {
                // Fallback: índice regular si FULLTEXT no está disponible
                $this->add_regular_content_index();
            }
            
        } catch (Exception $e) {
            error_log('SFQ: Error al añadir índice FULLTEXT: ' . $e->getMessage());
            // Intentar índice regular como fallback
            $this->add_regular_content_index();
        }
    }
    
    /**
     * Añadir índice regular en post_content como fallback
     */
    private function add_regular_content_index() {
        global $wpdb;
        
        try {
            $result = $wpdb->query(
                "ALTER TABLE {$wpdb->posts} 
                ADD INDEX idx_sfq_post_content_search (post_content(191))"
            );
            
            if ($result === false) {
                throw new Exception('Error al crear índice regular: ' . $wpdb->last_error);
            }
            
            error_log('SFQ: Índice regular añadido a post_content (longitud 191)');
            
        } catch (Exception $e) {
            error_log('SFQ: Error al añadir índice regular: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Añadir índice compuesto para consultas optimizadas
     */
    private function add_composite_index() {
        global $wpdb;
        
        try {
            // Índice compuesto para las consultas más comunes
            $result = $wpdb->query(
                "ALTER TABLE {$wpdb->posts} 
                ADD INDEX idx_sfq_post_status_type_date (post_status, post_type, post_date)"
            );
            
            if ($result === false) {
                throw new Exception('Error al crear índice compuesto: ' . $wpdb->last_error);
            }
            
            error_log('SFQ: Índice compuesto añadido (post_status, post_type, post_date)');
            
        } catch (Exception $e) {
            error_log('SFQ: Error al añadir índice compuesto: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Revertir migración (para desarrollo/testing)
     */
    public function rollback() {
        global $wpdb;
        
        try {
            // Eliminar índices si existen
            if ($this->index_exists('idx_sfq_post_content_search')) {
                $wpdb->query("ALTER TABLE {$wpdb->posts} DROP INDEX idx_sfq_post_content_search");
            }
            
            if ($this->index_exists('idx_sfq_post_status_type_date')) {
                $wpdb->query("ALTER TABLE {$wpdb->posts} DROP INDEX idx_sfq_post_status_type_date");
            }
            
            // Resetear versión
            delete_option($this->option_key);
            
            error_log('SFQ: Índices de base de datos eliminados (rollback)');
            
        } catch (Exception $e) {
            error_log('SFQ: Error en rollback de índices: ' . $e->getMessage());
        }
    }
    
    /**
     * Obtener información sobre los índices
     */
    public function get_index_info() {
        global $wpdb;
        
        try {
            // Método principal usando INFORMATION_SCHEMA
            $indexes = $wpdb->get_results($wpdb->prepare(
                "SELECT index_name, column_name, index_type 
                FROM INFORMATION_SCHEMA.STATISTICS 
                WHERE table_schema = %s 
                AND table_name = %s 
                AND index_name IN ('idx_sfq_post_content_search', 'idx_sfq_post_status_type_date')
                ORDER BY index_name, seq_in_index",
                DB_NAME,
                $wpdb->posts
            ));
            
            if (is_array($indexes) && !empty($indexes)) {
                return $indexes;
            }
            
        } catch (Exception $e) {
            error_log('SFQ: Error accediendo a INFORMATION_SCHEMA para info de índices: ' . $e->getMessage());
        }
        
        // Fallback: usar SHOW INDEX
        try {
            $all_indexes = $wpdb->get_results("SHOW INDEX FROM {$wpdb->posts}");
            $filtered_indexes = array();
            
            if (is_array($all_indexes)) {
                foreach ($all_indexes as $index) {
                    if (isset($index->Key_name) && 
                        in_array($index->Key_name, ['idx_sfq_post_content_search', 'idx_sfq_post_status_type_date'])) {
                        
                        // Convertir formato de SHOW INDEX a formato similar a INFORMATION_SCHEMA
                        $filtered_indexes[] = (object) array(
                            'index_name' => $index->Key_name,
                            'column_name' => $index->Column_name,
                            'index_type' => isset($index->Index_type) ? $index->Index_type : 'BTREE'
                        );
                    }
                }
            }
            
            return $filtered_indexes;
            
        } catch (Exception $e) {
            error_log('SFQ: Error usando SHOW INDEX para info: ' . $e->getMessage());
        }
        
        return array();
    }
    
    /**
     * Verificar el rendimiento de las consultas
     */
    public function analyze_query_performance() {
        global $wpdb;
        
        // Consulta de ejemplo para analizar
        $explain = $wpdb->get_results(
            "EXPLAIN SELECT DISTINCT ID, post_name, post_type 
            FROM {$wpdb->posts} 
            WHERE post_status = 'publish'
            AND post_type IN ('post', 'page')
            AND (post_content LIKE '%[smart_form%' OR post_content LIKE '%wp:shortcode%smart_form%')
            AND post_date > DATE_SUB(NOW(), INTERVAL 6 MONTH)
            ORDER BY post_date DESC
            LIMIT 500"
        );
        
        return $explain;
    }
}

// Ejecutar migración automáticamente
if (is_admin() || wp_doing_cron()) {
    $migration = new SFQ_Migration_Add_Post_Content_Index();
    $migration->maybe_run();
}
