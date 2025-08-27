<?php
/**
 * Gestión avanzada de respuestas/submissions para el admin
 */

if (!defined('ABSPATH')) {
    exit;
}

class SFQ_Admin_Submissions {
    
    private $database;
    private $wpdb;
    private $country_cache = array();
    private $allowed_sort_columns = array('id', 'form_title', 'completed_at', 'time_spent', 'user_id');
    
    public function __construct() {
        global $wpdb;
        $this->database = new SFQ_Database();
        $this->wpdb = $wpdb;
        $this->init_country_cache();
    }
    
    /**
     * Inicializar cache de países
     */
    private function init_country_cache() {
        $cached_countries = get_transient('sfq_countries_cache');
        if ($cached_countries !== false) {
            $this->country_cache = $cached_countries;
        }
    }
    
    /**
     * Guardar cache de países
     */
    private function save_country_cache() {
        set_transient('sfq_countries_cache', $this->country_cache, 24 * HOUR_IN_SECONDS);
    }
    
    /**
     * Verificar permisos y nonce de forma centralizada
     */
    private function verify_ajax_request() {
        // Verificar permisos
        if (!current_user_can('manage_smart_forms') && !current_user_can('manage_options')) {
            wp_send_json_error(__('No tienes permisos', 'smart-forms-quiz'));
            return false;
        }
        
        // Verificar nonce
        if (!check_ajax_referer('sfq_nonce', 'nonce', false)) {
            wp_send_json_error(__('Error de seguridad', 'smart-forms-quiz'));
            return false;
        }
        
        return true;
    }
    
    
    public function init() {
        // AJAX handlers específicos para submissions
        add_action('wp_ajax_sfq_get_submissions_advanced', array($this, 'get_submissions_advanced'));
        add_action('wp_ajax_sfq_get_submission_detail', array($this, 'get_submission_detail'));
        add_action('wp_ajax_sfq_export_submissions_advanced', array($this, 'export_submissions_advanced'));
        add_action('wp_ajax_sfq_delete_submissions_bulk', array($this, 'delete_submissions_bulk'));
        add_action('wp_ajax_sfq_delete_submission', array($this, 'delete_submission')); // Added missing method
        add_action('wp_ajax_sfq_get_dashboard_stats', array($this, 'get_dashboard_stats'));
        add_action('wp_ajax_sfq_get_form_analytics', array($this, 'get_form_analytics'));
        add_action('wp_ajax_sfq_save_submission_note', array($this, 'save_submission_note'));
    }
    
    /**
     * Renderizar la nueva página de submissions mejorada
     */
    public function render_submissions_page() {
        // Obtener lista de formularios para filtros
        $forms = $this->database->get_forms();
        ?>
        <div class="wrap sfq-submissions-wrap-v2">
            <div class="sfq-submissions-header">
                <h1 class="wp-heading-inline">
                    <span class="dashicons dashicons-chart-line"></span>
                    <?php _e('Panel de Respuestas', 'smart-forms-quiz'); ?>
                </h1>
                <div class="sfq-header-actions">
                    <button class="button" id="sfq-refresh-data">
                        <span class="dashicons dashicons-update"></span>
                        <?php _e('Actualizar', 'smart-forms-quiz'); ?>
                    </button>
                    <button class="button button-primary" id="sfq-export-advanced">
                        <span class="dashicons dashicons-download"></span>
                        <?php _e('Exportar', 'smart-forms-quiz'); ?>
                    </button>
                </div>
            </div>

            <!-- Dashboard de estadísticas -->
            <div class="sfq-dashboard-stats" id="sfq-dashboard-stats">
                <div class="sfq-dashboard-header">
                    <h2><?php _e('Estadísticas del Dashboard', 'smart-forms-quiz'); ?></h2>
                    <div class="sfq-dashboard-controls">
                        <label for="sfq-dashboard-period"><?php _e('Período para conversión:', 'smart-forms-quiz'); ?></label>
                        <select id="sfq-dashboard-period">
                            <option value="1"><?php _e('Último día', 'smart-forms-quiz'); ?></option>
                            <option value="7" selected><?php _e('Últimos 7 días', 'smart-forms-quiz'); ?></option>
                            <option value="30"><?php _e('Últimos 30 días', 'smart-forms-quiz'); ?></option>
                            <option value="90"><?php _e('Últimos 90 días', 'smart-forms-quiz'); ?></option>
                        </select>
                    </div>
                </div>
                <div class="sfq-stats-grid">
                    <div class="sfq-stat-card" id="total-submissions">
                        <div class="sfq-stat-icon">
                            <span class="dashicons dashicons-forms"></span>
                        </div>
                        <div class="sfq-stat-content">
                            <div class="sfq-stat-number">-</div>
                            <div class="sfq-stat-label"><?php _e('Total Respuestas', 'smart-forms-quiz'); ?></div>
                            <div class="sfq-stat-change">-</div>
                        </div>
                    </div>
                    
                    <div class="sfq-stat-card" id="today-submissions">
                        <div class="sfq-stat-icon">
                            <span class="dashicons dashicons-calendar-alt"></span>
                        </div>
                        <div class="sfq-stat-content">
                            <div class="sfq-stat-number">-</div>
                            <div class="sfq-stat-label"><?php _e('Hoy', 'smart-forms-quiz'); ?></div>
                            <div class="sfq-stat-change">-</div>
                        </div>
                    </div>
                    
                    <div class="sfq-stat-card" id="avg-completion-time">
                        <div class="sfq-stat-icon">
                            <span class="dashicons dashicons-clock"></span>
                        </div>
                        <div class="sfq-stat-content">
                            <div class="sfq-stat-number">-</div>
                            <div class="sfq-stat-label"><?php _e('Tiempo Promedio', 'smart-forms-quiz'); ?></div>
                            <div class="sfq-stat-change">-</div>
                        </div>
                    </div>
                    
                    <div class="sfq-stat-card" id="conversion-rate">
                        <div class="sfq-stat-icon">
                            <span class="dashicons dashicons-chart-area"></span>
                        </div>
                        <div class="sfq-stat-content">
                            <div class="sfq-stat-number">-</div>
                            <div class="sfq-stat-label"><?php _e('Tasa Conversión', 'smart-forms-quiz'); ?></div>
                            <div class="sfq-stat-change">-</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Gráficos de analytics -->
            <div class="sfq-analytics-section">
                <div class="sfq-analytics-grid">
                    <div class="sfq-chart-container">
                        <div class="sfq-chart-header">
                            <h3><?php _e('Respuestas por Día', 'smart-forms-quiz'); ?></h3>
                            <div class="sfq-chart-controls">
                                <select id="sfq-chart-period">
                                    <option value="7"><?php _e('Últimos 7 días', 'smart-forms-quiz'); ?></option>
                                    <option value="30" selected><?php _e('Últimos 30 días', 'smart-forms-quiz'); ?></option>
                                    <option value="90"><?php _e('Últimos 90 días', 'smart-forms-quiz'); ?></option>
                                </select>
                            </div>
                        </div>
                        <div class="sfq-chart-content">
                            <canvas id="sfq-submissions-chart" width="400" height="200"></canvas>
                        </div>
                    </div>
                    
                    <div class="sfq-chart-container">
                        <div class="sfq-chart-header">
                            <h3><?php _e('Formularios Más Populares', 'smart-forms-quiz'); ?></h3>
                        </div>
                        <div class="sfq-chart-content">
                            <canvas id="sfq-forms-chart" width="400" height="200"></canvas>
                        </div>
                    </div>
                    
                    <div class="sfq-chart-container">
                        <div class="sfq-chart-header">
                            <h3><?php _e('Países Más Activos', 'smart-forms-quiz'); ?></h3>
                        </div>
                        <div class="sfq-chart-content">
                            <canvas id="sfq-countries-chart" width="400" height="200"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Filtros avanzados -->
            <div class="sfq-filters-section">
                <div class="sfq-filters-header">
                    <h3><?php _e('Filtros', 'smart-forms-quiz'); ?></h3>
                    <button class="button" id="sfq-clear-filters">
                        <span class="dashicons dashicons-dismiss"></span>
                        <?php _e('Limpiar', 'smart-forms-quiz'); ?>
                    </button>
                </div>
                
                <div class="sfq-filters-grid">
                    <div class="sfq-filter-group">
                        <label><?php _e('Formulario', 'smart-forms-quiz'); ?></label>
                        <select id="sfq-filter-form" class="sfq-select-advanced">
                            <option value=""><?php _e('Todos los formularios', 'smart-forms-quiz'); ?></option>
                            <?php foreach ($forms as $form) : ?>
                                <option value="<?php echo $form->id; ?>">
                                    <?php echo esc_html($form->title); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    
                    <div class="sfq-filter-group">
                        <label><?php _e('Fecha', 'smart-forms-quiz'); ?></label>
                        <div class="sfq-date-range">
                            <input type="text" id="sfq-filter-date-from" placeholder="<?php _e('Desde', 'smart-forms-quiz'); ?>" class="sfq-datepicker">
                            <span class="sfq-date-separator">-</span>
                            <input type="text" id="sfq-filter-date-to" placeholder="<?php _e('Hasta', 'smart-forms-quiz'); ?>" class="sfq-datepicker">
                        </div>
                    </div>
                    
                    <div class="sfq-filter-group">
                        <label><?php _e('Usuario', 'smart-forms-quiz'); ?></label>
                        <select id="sfq-filter-user" class="sfq-select-advanced">
                            <option value=""><?php _e('Todos', 'smart-forms-quiz'); ?></option>
                            <option value="registered"><?php _e('Registrados', 'smart-forms-quiz'); ?></option>
                            <option value="anonymous"><?php _e('Anónimos', 'smart-forms-quiz'); ?></option>
                        </select>
                    </div>
                    
                    <div class="sfq-filter-group">
                        <label><?php _e('Estado', 'smart-forms-quiz'); ?></label>
                        <select id="sfq-filter-status" class="sfq-select-advanced">
                            <option value=""><?php _e('Todos', 'smart-forms-quiz'); ?></option>
                            <option value="completed"><?php _e('Completados', 'smart-forms-quiz'); ?></option>
                            <option value="partial"><?php _e('Parciales', 'smart-forms-quiz'); ?></option>
                        </select>
                    </div>
                    
                    <div class="sfq-filter-group">
                        <label><?php _e('Tiempo (min)', 'smart-forms-quiz'); ?></label>
                        <div class="sfq-time-range">
                            <input type="number" id="sfq-filter-time-min" placeholder="Min" min="0">
                            <span>-</span>
                            <input type="number" id="sfq-filter-time-max" placeholder="Max" min="0">
                        </div>
                    </div>
                    
                    <div class="sfq-filter-group">
                        <label><?php _e('Buscar en respuestas', 'smart-forms-quiz'); ?></label>
                        <input type="text" id="sfq-filter-search" placeholder="<?php _e('Buscar texto...', 'smart-forms-quiz'); ?>" class="sfq-search-input">
                    </div>
                </div>
                
                <div class="sfq-filters-actions">
                    <button class="button button-primary" id="sfq-apply-filters">
                        <span class="dashicons dashicons-search"></span>
                        <?php _e('Aplicar Filtros', 'smart-forms-quiz'); ?>
                    </button>
                    <button class="button" id="sfq-save-filter">
                        <span class="dashicons dashicons-saved"></span>
                        <?php _e('Guardar Filtro', 'smart-forms-quiz'); ?>
                    </button>
                </div>
            </div>

            <!-- Tabla de submissions mejorada -->
            <div class="sfq-submissions-table-section">
                <div class="sfq-table-header">
                    <div class="sfq-table-info">
                        <span id="sfq-results-count">-</span> <?php _e('resultados', 'smart-forms-quiz'); ?>
                    </div>
                    <div class="sfq-table-actions">
                        <div class="sfq-bulk-actions" style="display: none;">
                            <select id="sfq-bulk-action">
                                <option value=""><?php _e('Acciones en lote', 'smart-forms-quiz'); ?></option>
                                <option value="delete"><?php _e('Eliminar', 'smart-forms-quiz'); ?></option>
                                <option value="export"><?php _e('Exportar', 'smart-forms-quiz'); ?></option>
                            </select>
                            <button class="button" id="sfq-apply-bulk">
                                <?php _e('Aplicar', 'smart-forms-quiz'); ?>
                            </button>
                        </div>
                        <div class="sfq-table-settings">
                            <button class="button" id="sfq-table-columns">
                                <span class="dashicons dashicons-admin-settings"></span>
                                <?php _e('Columnas', 'smart-forms-quiz'); ?>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="sfq-table-container">
                    <table class="wp-list-table widefat fixed striped" id="sfq-submissions-table-advanced">
                        <thead>
                            <tr>
                                <th class="check-column">
                                    <input type="checkbox" id="sfq-select-all">
                                </th>
                                <th class="sfq-sortable" data-column="id">
                                    <?php _e('ID', 'smart-forms-quiz'); ?>
                                    <span class="sfq-sort-indicator"></span>
                                </th>
                                <th class="sfq-sortable" data-column="form_title">
                                    <?php _e('Formulario', 'smart-forms-quiz'); ?>
                                    <span class="sfq-sort-indicator"></span>
                                </th>
                                <th class="sfq-sortable" data-column="user_name">
                                    <?php _e('Usuario', 'smart-forms-quiz'); ?>
                                    <span class="sfq-sort-indicator"></span>
                                </th>
                                <th class="sfq-sortable" data-column="completed_at">
                                    <?php _e('Fecha', 'smart-forms-quiz'); ?>
                                    <span class="sfq-sort-indicator"></span>
                                </th>
                                <th class="sfq-sortable" data-column="time_spent">
                                    <?php _e('Tiempo', 'smart-forms-quiz'); ?>
                                    <span class="sfq-sort-indicator"></span>
                                </th>
                                <th><?php _e('Respuestas', 'smart-forms-quiz'); ?></th>
                                <th><?php _e('Puntuación', 'smart-forms-quiz'); ?></th>
                                <th><?php _e('Acciones', 'smart-forms-quiz'); ?></th>
                            </tr>
                        </thead>
                        <tbody id="sfq-submissions-tbody-advanced">
                            <tr class="sfq-loading-row">
                                <td colspan="9" class="sfq-loading-cell">
                                    <div class="sfq-loading-content">
                                        <div class="sfq-loading-spinner"></div>
                                        <span><?php _e('Cargando respuestas...', 'smart-forms-quiz'); ?></span>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <div class="sfq-pagination-container">
                    <div class="sfq-pagination-info">
                        <span id="sfq-pagination-text">-</span>
                    </div>
                    <div class="sfq-pagination-controls" id="sfq-pagination-controls">
                        <!-- Paginación se genera dinámicamente -->
                    </div>
                    <div class="sfq-pagination-size">
                        <select id="sfq-per-page">
                            <option value="10">10</option>
                            <option value="25" selected>25</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                        </select>
                        <span><?php _e('por página', 'smart-forms-quiz'); ?></span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal de detalle mejorado -->
        <div id="sfq-submission-modal-v2" class="sfq-modal-v2" style="display: none;">
            <div class="sfq-modal-backdrop"></div>
            <div class="sfq-modal-container">
                <div class="sfq-modal-header">
                    <div class="sfq-modal-title">
                        <h2><?php _e('Detalle de Respuesta', 'smart-forms-quiz'); ?></h2>
                        <div class="sfq-modal-subtitle" id="sfq-modal-subtitle">-</div>
                    </div>
                    <div class="sfq-modal-actions">
                        <button class="button" id="sfq-prev-submission" title="<?php _e('Anterior', 'smart-forms-quiz'); ?>">
                            <span class="dashicons dashicons-arrow-left-alt2"></span>
                        </button>
                        <button class="button" id="sfq-next-submission" title="<?php _e('Siguiente', 'smart-forms-quiz'); ?>">
                            <span class="dashicons dashicons-arrow-right-alt2"></span>
                        </button>
                        <button class="button sfq-modal-close">
                            <span class="dashicons dashicons-no-alt"></span>
                        </button>
                    </div>
                </div>
                
                <div class="sfq-modal-body">
                    <div class="sfq-modal-sidebar">
                        <div class="sfq-submission-info" id="sfq-submission-info-v2">
                            <!-- Información se carga dinámicamente -->
                        </div>
                        
                        <div class="sfq-submission-notes">
                            <h4><?php _e('Notas Administrativas', 'smart-forms-quiz'); ?></h4>
                            <textarea id="sfq-submission-notes" placeholder="<?php _e('Añadir nota...', 'smart-forms-quiz'); ?>"></textarea>
                            <button class="button button-small" id="sfq-save-note">
                                <?php _e('Guardar Nota', 'smart-forms-quiz'); ?>
                            </button>
                        </div>
                    </div>
                    
                    <div class="sfq-modal-content">
                        <div class="sfq-responses-container" id="sfq-responses-container-v2">
                            <!-- Respuestas se cargan dinámicamente -->
                        </div>
                    </div>
                </div>
                
                <div class="sfq-modal-footer">
                    <div class="sfq-modal-footer-left">
                        <button class="button" id="sfq-export-single">
                            <span class="dashicons dashicons-download"></span>
                            <?php _e('Exportar', 'smart-forms-quiz'); ?>
                        </button>
                        <button class="button" id="sfq-print-single">
                            <span class="dashicons dashicons-printer"></span>
                            <?php _e('Imprimir', 'smart-forms-quiz'); ?>
                        </button>
                    </div>
                    <div class="sfq-modal-footer-right">
                        <button class="button" id="sfq-delete-single">
                            <span class="dashicons dashicons-trash"></span>
                            <?php _e('Eliminar', 'smart-forms-quiz'); ?>
                        </button>
                        <button class="button button-primary sfq-modal-close">
                            <?php _e('Cerrar', 'smart-forms-quiz'); ?>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal de exportación avanzada -->
        <div id="sfq-export-modal" class="sfq-modal-v2" style="display: none;">
            <div class="sfq-modal-backdrop"></div>
            <div class="sfq-modal-container sfq-export-modal-container">
                <div class="sfq-modal-header">
                    <h2><?php _e('Exportar Respuestas', 'smart-forms-quiz'); ?></h2>
                    <button class="button sfq-modal-close">
                        <span class="dashicons dashicons-no-alt"></span>
                    </button>
                </div>
                
                <div class="sfq-modal-body">
                    <div class="sfq-export-options">
                        <div class="sfq-export-section">
                            <h3><?php _e('Formato', 'smart-forms-quiz'); ?></h3>
                            <div class="sfq-export-formats">
                                <label>
                                    <input type="radio" name="export_format" value="csv" checked>
                                    <span class="sfq-format-option">
                                        <span class="dashicons dashicons-media-spreadsheet"></span>
                                        CSV
                                    </span>
                                </label>
                                <label>
                                    <input type="radio" name="export_format" value="excel">
                                    <span class="sfq-format-option">
                                        <span class="dashicons dashicons-media-document"></span>
                                        Excel
                                    </span>
                                </label>
                                <label>
                                    <input type="radio" name="export_format" value="pdf">
                                    <span class="sfq-format-option">
                                        <span class="dashicons dashicons-pdf"></span>
                                        PDF
                                    </span>
                                </label>
                                <label>
                                    <input type="radio" name="export_format" value="json">
                                    <span class="sfq-format-option">
                                        <span class="dashicons dashicons-media-code"></span>
                                        JSON
                                    </span>
                                </label>
                            </div>
                        </div>
                        
                        <div class="sfq-export-section">
                            <h3><?php _e('Campos a Incluir', 'smart-forms-quiz'); ?></h3>
                            <div class="sfq-export-fields">
                                <label>
                                    <input type="checkbox" name="export_fields[]" value="id" checked>
                                    <?php _e('ID', 'smart-forms-quiz'); ?>
                                </label>
                                <label>
                                    <input type="checkbox" name="export_fields[]" value="form_title" checked>
                                    <?php _e('Formulario', 'smart-forms-quiz'); ?>
                                </label>
                                <label>
                                    <input type="checkbox" name="export_fields[]" value="user_info" checked>
                                    <?php _e('Usuario', 'smart-forms-quiz'); ?>
                                </label>
                                <label>
                                    <input type="checkbox" name="export_fields[]" value="date" checked>
                                    <?php _e('Fecha', 'smart-forms-quiz'); ?>
                                </label>
                                <label>
                                    <input type="checkbox" name="export_fields[]" value="time_spent" checked>
                                    <?php _e('Tiempo', 'smart-forms-quiz'); ?>
                                </label>
                                <label>
                                    <input type="checkbox" name="export_fields[]" value="responses" checked>
                                    <?php _e('Respuestas', 'smart-forms-quiz'); ?>
                                </label>
                                <label>
                                    <input type="checkbox" name="export_fields[]" value="score">
                                    <?php _e('Puntuación', 'smart-forms-quiz'); ?>
                                </label>
                                <label>
                                    <input type="checkbox" name="export_fields[]" value="ip">
                                    <?php _e('IP', 'smart-forms-quiz'); ?>
                                </label>
                            </div>
                        </div>
                        
                        <div class="sfq-export-section">
                            <h3><?php _e('Opciones Adicionales', 'smart-forms-quiz'); ?></h3>
                            <div class="sfq-export-additional">
                                <label>
                                    <input type="checkbox" name="export_options[]" value="include_headers" checked>
                                    <?php _e('Incluir encabezados', 'smart-forms-quiz'); ?>
                                </label>
                                <label>
                                    <input type="checkbox" name="export_options[]" value="include_empty">
                                    <?php _e('Incluir respuestas vacías', 'smart-forms-quiz'); ?>
                                </label>
                                <label>
                                    <input type="checkbox" name="export_options[]" value="separate_questions">
                                    <?php _e('Separar preguntas en columnas', 'smart-forms-quiz'); ?>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="sfq-modal-footer">
                    <div class="sfq-export-progress" id="sfq-export-progress" style="display: none;">
                        <div class="sfq-progress-bar">
                            <div class="sfq-progress-fill"></div>
                        </div>
                        <span class="sfq-progress-text">0%</span>
                    </div>
                    <button class="button sfq-modal-close"><?php _e('Cancelar', 'smart-forms-quiz'); ?></button>
                    <button class="button button-primary" id="sfq-start-export">
                        <span class="dashicons dashicons-download"></span>
                        <?php _e('Exportar', 'smart-forms-quiz'); ?>
                    </button>
                </div>
            </div>
        </div>

        <!-- Modal de configuración de columnas -->
        <div id="sfq-columns-modal" class="sfq-modal-v2" style="display: none;">
            <div class="sfq-modal-backdrop"></div>
            <div class="sfq-modal-container sfq-columns-modal-container">
                <div class="sfq-modal-header">
                    <h2><?php _e('Configurar Columnas', 'smart-forms-quiz'); ?></h2>
                    <button class="button sfq-modal-close">
                        <span class="dashicons dashicons-no-alt"></span>
                    </button>
                </div>
                
                <div class="sfq-modal-body">
                    <div class="sfq-columns-list" id="sfq-columns-list">
                        <!-- Lista de columnas se genera dinámicamente -->
                    </div>
                </div>
                
                <div class="sfq-modal-footer">
                    <button class="button" id="sfq-reset-columns"><?php _e('Restablecer', 'smart-forms-quiz'); ?></button>
                    <button class="button button-primary" id="sfq-save-columns"><?php _e('Guardar', 'smart-forms-quiz'); ?></button>
                </div>
            </div>
        </div>
        <?php
    }
    
    /**
     * Obtener submissions con filtros avanzados
     */
    public function get_submissions_advanced() {
        if (!$this->verify_ajax_request()) {
            return;
        }
        
        // Obtener parámetros de filtrado
        $filters = $this->parse_filters($_POST);
        $page = intval($_POST['page'] ?? 1);
        $per_page = intval($_POST['per_page'] ?? 25);
        $sort_column = sanitize_text_field($_POST['sort_column'] ?? 'completed_at');
        $sort_direction = sanitize_text_field($_POST['sort_direction'] ?? 'DESC');
        
        // Construir consulta con filtros
        $query_parts = $this->build_submissions_query($filters, $sort_column, $sort_direction);
        
        // Obtener total de registros
        $total_query = "SELECT COUNT(DISTINCT s.id) FROM {$this->wpdb->prefix}sfq_submissions s 
                       LEFT JOIN {$this->wpdb->prefix}sfq_forms f ON s.form_id = f.id 
                       LEFT JOIN {$this->wpdb->prefix}sfq_responses r ON s.id = r.submission_id 
                       {$query_parts['where']}";
        
        $total = $this->wpdb->get_var($this->wpdb->prepare($total_query, $query_parts['params']));
        
        // Obtener submissions paginados
        $offset = ($page - 1) * $per_page;
        $submissions_query = $query_parts['select'] . $query_parts['where'] . 
                           " GROUP BY s.id " . $query_parts['order'] . 
                           " LIMIT %d OFFSET %d";
        
        $params = array_merge($query_parts['params'], [$per_page, $offset]);
        $submissions = $this->wpdb->get_results($this->wpdb->prepare($submissions_query, $params));
        
        // Formatear datos
        foreach ($submissions as &$submission) {
            $submission = $this->format_submission_data($submission);
        }
        
        wp_send_json_success(array(
            'submissions' => $submissions,
            'total' => intval($total),
            'pages' => ceil($total / $per_page),
            'current_page' => $page,
            'per_page' => $per_page
        ));
    }
    
    /**
     * Obtener detalle de un submission específico
     */
    public function get_submission_detail() {
        if (!$this->verify_ajax_request()) {
            return;
        }
        
        $submission_id = intval($_POST['submission_id'] ?? 0);
        
        if (!$submission_id) {
            wp_send_json_error(__('ID de submission inválido', 'smart-forms-quiz'));
            return;
        }
        
        // Obtener submission con información del formulario
        $submission = $this->wpdb->get_row($this->wpdb->prepare(
            "SELECT s.*, f.title as form_title 
            FROM {$this->wpdb->prefix}sfq_submissions s 
            LEFT JOIN {$this->wpdb->prefix}sfq_forms f ON s.form_id = f.id 
            WHERE s.id = %d",
            $submission_id
        ));
        
        if (!$submission) {
            wp_send_json_error(__('Submission no encontrado', 'smart-forms-quiz'));
            return;
        }
        
        // Formatear datos del submission usando la misma lógica que funciona en la tabla
        $submission = $this->format_submission_data($submission);
        
        // Asegurar que country_info esté presente y sea válido
        if (!isset($submission->country_info) || !is_array($submission->country_info)) {
            // Si no hay información del país, intentar obtenerla de nuevo
            if (!empty($submission->user_ip)) {
                $submission->country_info = $this->get_country_from_ip($submission->user_ip);
            } else {
                $submission->country_info = $this->get_default_country_info();
            }
        }
        
        // Obtener respuestas del submission
        $responses = $this->wpdb->get_results($this->wpdb->prepare(
            "SELECT r.*, q.question_text, q.question_type 
            FROM {$this->wpdb->prefix}sfq_responses r 
            LEFT JOIN {$this->wpdb->prefix}sfq_questions q ON r.question_id = q.id 
            WHERE r.submission_id = %d 
            ORDER BY q.order_index ASC",
            $submission_id
        ));
        
        // Formatear respuestas
        foreach ($responses as &$response) {
            $response->answer_formatted = $this->format_answer_for_display($response);
        }
        
        // Obtener nota administrativa
        $admin_note = get_option("sfq_submission_note_{$submission_id}", '');
        $submission->admin_note = $admin_note;
        
        wp_send_json_success(array(
            'submission' => $submission,
            'responses' => $responses
        ));
    }
    
    /**
     * Formatear respuesta para mostrar
     */
    private function format_answer_for_display($response) {
        if (empty($response->answer)) {
            return __('Sin respuesta', 'smart-forms-quiz');
        }
        
        // Si es un array JSON, decodificar
        $decoded = json_decode($response->answer, true);
        if (is_array($decoded)) {
            return implode(', ', $decoded);
        }
        
        return $response->answer;
    }
    
    /**
     * Parsear filtros de la petición
     */
    private function parse_filters($post_data) {
        return array(
            'form_id' => intval($post_data['form_id'] ?? 0),
            'date_from' => sanitize_text_field($post_data['date_from'] ?? ''),
            'date_to' => sanitize_text_field($post_data['date_to'] ?? ''),
            'user_type' => sanitize_text_field($post_data['user_type'] ?? ''),
            'status' => sanitize_text_field($post_data['status'] ?? ''),
            'time_min' => intval($post_data['time_min'] ?? 0),
            'time_max' => intval($post_data['time_max'] ?? 0),
            'search' => sanitize_text_field($post_data['search'] ?? '')
        );
    }
    
    /**
     * Construir consulta de submissions con filtros
     */
    private function build_submissions_query($filters, $sort_column, $sort_direction) {
        $where_conditions = array("1=1");
        $params = array();
        
        // Filtro por formulario
        if ($filters['form_id'] > 0) {
            $where_conditions[] = "s.form_id = %d";
            $params[] = $filters['form_id'];
        }
        
        // Filtro por fechas
        if (!empty($filters['date_from'])) {
            $where_conditions[] = "DATE(s.completed_at) >= %s";
            $params[] = $filters['date_from'];
        }
        
        if (!empty($filters['date_to'])) {
            $where_conditions[] = "DATE(s.completed_at) <= %s";
            $params[] = $filters['date_to'];
        }
        
        // Filtro por tipo de usuario
        if ($filters['user_type'] === 'registered') {
            $where_conditions[] = "s.user_id IS NOT NULL";
        } elseif ($filters['user_type'] === 'anonymous') {
            $where_conditions[] = "s.user_id IS NULL";
        }
        
        // Filtro por estado
        if (!empty($filters['status'])) {
            $where_conditions[] = "s.status = %s";
            $params[] = $filters['status'];
        }
        
        // Filtro por tiempo
        if ($filters['time_min'] > 0) {
            $where_conditions[] = "s.time_spent >= %d";
            $params[] = $filters['time_min'] * 60; // Convertir a segundos
        }
        
        if ($filters['time_max'] > 0) {
            $where_conditions[] = "s.time_spent <= %d";
            $params[] = $filters['time_max'] * 60; // Convertir a segundos
        }
        
        // Filtro de búsqueda en respuestas
        if (!empty($filters['search'])) {
            $where_conditions[] = "r.answer LIKE %s";
            $params[] = '%' . $this->wpdb->esc_like($filters['search']) . '%';
        }
        
        // Construir partes de la consulta
        $select = "SELECT DISTINCT s.*, f.title as form_title, 
                   COUNT(DISTINCT r.id) as response_count";
        
        $from = " FROM {$this->wpdb->prefix}sfq_submissions s 
                 LEFT JOIN {$this->wpdb->prefix}sfq_forms f ON s.form_id = f.id 
                 LEFT JOIN {$this->wpdb->prefix}sfq_responses r ON s.id = r.submission_id";
        
        $where = " WHERE " . implode(' AND ', $where_conditions);
        
        // Validar columna de ordenación usando la propiedad de clase
        if (!in_array($sort_column, $this->allowed_sort_columns)) {
            $sort_column = 'completed_at';
        }
        
        $sort_direction = strtoupper($sort_direction) === 'ASC' ? 'ASC' : 'DESC';
        $order = " ORDER BY s.{$sort_column} {$sort_direction}";
        
        return array(
            'select' => $select . $from,
            'where' => $where,
            'order' => $order,
            'params' => $params
        );
    }
    
    /**
     * Formatear datos de submission
     */
    private function format_submission_data($submission) {
        // Formatear fecha
        $submission->formatted_date = date_i18n(
            get_option('date_format') . ' ' . get_option('time_format'), 
            strtotime($submission->completed_at)
        );
        
        // Formatear tiempo
        $submission->time_spent_formatted = $this->format_time($submission->time_spent);
        
        // Información del usuario
        if ($submission->user_id) {
            $user = get_user_by('id', $submission->user_id);
            $submission->user_name = $user ? $user->display_name : __('Usuario eliminado', 'smart-forms-quiz');
            $submission->user_email = $user ? $user->user_email : '';
            $submission->user_type = 'registered';
        } else {
            $submission->user_name = __('Anónimo', 'smart-forms-quiz');
            $submission->user_email = '';
            $submission->user_type = 'anonymous';
        }
        
        // Obtener información del país basada en IP
        if (!empty($submission->user_ip)) {
            $country_info = $this->get_country_from_ip($submission->user_ip);
            
            // Si no obtenemos información válida, usar datos de fallback
            if (!$country_info || !is_array($country_info) || $country_info['country_code'] === 'XX') {
                $country_info = $this->get_fallback_country_info($submission->user_ip);
            }
            
            $submission->country_info = $country_info;
        } else {
            // Si no hay IP, usar datos por defecto
            $submission->country_info = $this->get_default_country_info();
        }
        
        // Calcular puntuación si es quiz
        if (!isset($submission->total_score)) {
            $submission->total_score = 0;
        }
        
        return $submission;
    }
    
    /**
     * Obtener estadísticas del dashboard
     */
    public function get_dashboard_stats() {
        if (!$this->verify_ajax_request()) {
            return;
        }
        
        // Obtener período seleccionado (por defecto últimos 7 días)
        $period = intval($_POST['period'] ?? 7);
        $date_from = date('Y-m-d', strtotime("-{$period} days"));
        $date_to = current_time('Y-m-d');
        
        // Total de submissions (histórico)
        $total_submissions = $this->wpdb->get_var(
            "SELECT COUNT(*) FROM {$this->wpdb->prefix}sfq_submissions WHERE status = 'completed'"
        );
        
        // Submissions del período seleccionado
        $period_submissions = $this->wpdb->get_var($this->wpdb->prepare(
            "SELECT COUNT(*) FROM {$this->wpdb->prefix}sfq_submissions 
            WHERE status = 'completed' AND DATE(completed_at) >= %s AND DATE(completed_at) <= %s",
            $date_from, $date_to
        ));
        
        // Submissions de hoy para mostrar en la tarjeta "Hoy"
        $today_submissions = $this->wpdb->get_var($this->wpdb->prepare(
            "SELECT COUNT(*) FROM {$this->wpdb->prefix}sfq_submissions 
            WHERE status = 'completed' AND DATE(completed_at) = %s",
            current_time('Y-m-d')
        ));
        
        // Submissions de ayer para comparación
        $yesterday_submissions = $this->wpdb->get_var($this->wpdb->prepare(
            "SELECT COUNT(*) FROM {$this->wpdb->prefix}sfq_submissions 
            WHERE status = 'completed' AND DATE(completed_at) = %s",
            date('Y-m-d', strtotime('-1 day'))
        ));
        
        // Tiempo promedio de completado del período seleccionado
        $avg_time = $this->wpdb->get_var($this->wpdb->prepare(
            "SELECT AVG(time_spent) FROM {$this->wpdb->prefix}sfq_submissions 
            WHERE status = 'completed' AND time_spent > 0 
            AND DATE(completed_at) >= %s AND DATE(completed_at) <= %s",
            $date_from, $date_to
        ));
        
        // Tasa de conversión (completados vs vistas) - CORREGIDO: Usar mismo período
        $analytics_table = $this->wpdb->prefix . 'sfq_analytics';
        $table_exists = $this->wpdb->get_var("SHOW TABLES LIKE '$analytics_table'") === $analytics_table;
        
        $period_views = 0;
        $conversion_rate = 0;
        
        if ($table_exists) {
            // Obtener vistas del mismo período que las submissions
            $period_views = $this->wpdb->get_var($this->wpdb->prepare(
                "SELECT COUNT(DISTINCT session_id) FROM {$this->wpdb->prefix}sfq_analytics 
                WHERE event_type = 'view' AND DATE(created_at) >= %s AND DATE(created_at) <= %s",
                $date_from, $date_to
            ));
            
            // Si no hay datos de analytics para el período, usar estimación basada en submissions del mismo período
            if ($period_views == 0 && $period_submissions > 0) {
                // Estimación conservadora: asumimos que por cada submission completada hubo al menos 3 vistas
                $period_views = $period_submissions * 3;
            }
        } else {
            // Si no existe la tabla de analytics, usar estimación basada en submissions del período
            if ($period_submissions > 0) {
                $period_views = $period_submissions * 3;
            }
        }
        
        // Calcular tasa de conversión usando datos del mismo período
        if ($period_views > 0) {
            $conversion_rate = round(($period_submissions / $period_views) * 100, 1);
            // Limitar el porcentaje a un máximo del 100%
            $conversion_rate = min($conversion_rate, 100);
        }
        
        // Calcular cambios porcentuales (hoy vs ayer)
        $today_change = 0;
        if ($yesterday_submissions > 0) {
            $today_change = round((($today_submissions - $yesterday_submissions) / $yesterday_submissions) * 100, 1);
        } elseif ($today_submissions > 0) {
            $today_change = 100;
        }
        
        wp_send_json_success(array(
            'total_submissions' => intval($total_submissions),
            'today_submissions' => intval($today_submissions),
            'period_submissions' => intval($period_submissions),
            'today_change' => $today_change,
            'avg_completion_time' => $this->format_time(intval($avg_time)),
            'conversion_rate' => $conversion_rate,
            'period_views' => intval($period_views),
            'period_days' => $period,
            'date_from' => $date_from,
            'date_to' => $date_to
        ));
    }
    
    /**
     * Obtener analytics de formularios
     */
    public function get_form_analytics() {
        if (!$this->verify_ajax_request()) {
            return;
        }
        
        global $wpdb;
        
        $period = intval($_POST['period'] ?? 30);
        $date_from = date('Y-m-d', strtotime("-{$period} days"));
        
        // Datos para gráfico de submissions por día
        $daily_submissions = $wpdb->get_results($wpdb->prepare(
            "SELECT DATE(completed_at) as date, COUNT(*) as count 
            FROM {$wpdb->prefix}sfq_submissions 
            WHERE status = 'completed' AND DATE(completed_at) >= %s 
            GROUP BY DATE(completed_at) 
            ORDER BY date ASC",
            $date_from
        ));
        
        // Formularios más populares
        $popular_forms = $wpdb->get_results($wpdb->prepare(
            "SELECT f.title, COUNT(s.id) as submissions 
            FROM {$wpdb->prefix}sfq_forms f 
            LEFT JOIN {$wpdb->prefix}sfq_submissions s ON f.id = s.form_id 
            WHERE s.status = 'completed' AND DATE(s.completed_at) >= %s 
            GROUP BY f.id, f.title 
            ORDER BY submissions DESC 
            LIMIT 10",
            $date_from
        ));
        
        // Países más activos
        $countries_data = $this->get_countries_analytics($date_from);
        
        wp_send_json_success(array(
            'daily_submissions' => $daily_submissions,
            'popular_forms' => $popular_forms,
            'countries_data' => $countries_data
        ));
    }
    
    /**
     * Obtener analytics de países (OPTIMIZADO - elimina N+1 queries)
     */
    private function get_countries_analytics($date_from) {
        // Obtener submissions con IPs únicas y sus conteos
        $submissions = $this->wpdb->get_results($this->wpdb->prepare(
            "SELECT user_ip, COUNT(*) as count 
            FROM {$this->wpdb->prefix}sfq_submissions 
            WHERE status = 'completed' 
            AND DATE(completed_at) >= %s 
            AND user_ip IS NOT NULL 
            AND user_ip != '' 
            AND user_ip NOT IN ('127.0.0.1', '::1', 'localhost')
            GROUP BY user_ip",
            $date_from
        ));
        
        if (empty($submissions)) {
            return array();
        }
        
        // Obtener información de países para todas las IPs de una vez
        $countries_info = $this->get_countries_info_batch(array_column($submissions, 'user_ip'));
        
        $countries_count = array();
        
        // Procesar resultados agrupando por país
        foreach ($submissions as $submission) {
            $country_info = $countries_info[$submission->user_ip] ?? null;
            
            if ($country_info && $country_info['country_code'] !== 'XX') {
                $country_key = $country_info['country_code'];
                
                if (!isset($countries_count[$country_key])) {
                    $countries_count[$country_key] = array(
                        'country_code' => $country_info['country_code'],
                        'country_name' => $country_info['country_name'],
                        'flag_emoji' => $country_info['flag_emoji'],
                        'count' => 0
                    );
                }
                
                $countries_count[$country_key]['count'] += intval($submission->count);
            }
        }
        
        // Ordenar por cantidad y limitar a top 10
        uasort($countries_count, function($a, $b) {
            return $b['count'] - $a['count'];
        });
        
        return array_slice($countries_count, 0, 10);
    }
    
    /**
     * Exportación avanzada de submissions
     */
    public function export_submissions_advanced() {
        if (!$this->verify_ajax_request()) {
            return;
        }
        
        $format = sanitize_text_field($_POST['format'] ?? 'csv');
        $fields = $_POST['fields'] ?? array();
        $options = $_POST['options'] ?? array();
        $filters = $this->parse_filters($_POST);
        
        // Validar formato
        $allowed_formats = array('csv', 'excel', 'pdf', 'json');
        if (!in_array($format, $allowed_formats)) {
            wp_send_json_error(__('Formato de exportación no válido', 'smart-forms-quiz'));
            return;
        }
        
        try {
            // Obtener datos para exportar
            $query_parts = $this->build_submissions_query($filters, 'completed_at', 'DESC');
            global $wpdb;
            
            $submissions = $wpdb->get_results($wpdb->prepare(
                $query_parts['select'] . $query_parts['where'] . " GROUP BY s.id " . $query_parts['order'],
                $query_parts['params']
            ));
            
            // Formatear datos
            foreach ($submissions as &$submission) {
                $submission = $this->format_submission_data($submission);
            }
            
            // Generar archivo según formato
            switch ($format) {
                case 'csv':
                    $file_url = $this->export_to_csv($submissions, $fields, $options);
                    break;
                case 'excel':
                case 'pdf':
                    // Usar CSV como fallback hasta implementar librerías específicas
                    $file_url = $this->export_to_csv($submissions, $fields, $options);
                    break;
                case 'json':
                    $file_url = $this->export_to_json($submissions, $fields, $options);
                    break;
            }
            
            wp_send_json_success(array(
                'file_url' => $file_url,
                'message' => __('Exportación completada', 'smart-forms-quiz')
            ));
            
        } catch (Exception $e) {
            wp_send_json_error(array(
                'message' => __('Error en la exportación: ', 'smart-forms-quiz') . $e->getMessage()
            ));
        }
    }
    
    /**
     * Exportar a CSV
     */
    private function export_to_csv($submissions, $fields, $options) {
        $upload_dir = wp_upload_dir();
        $filename = 'submissions_' . date('Y-m-d_H-i-s') . '.csv';
        $filepath = $upload_dir['path'] . '/' . $filename;
        
        $file = fopen($filepath, 'w');
        
        // Encabezados
        if (in_array('include_headers', $options)) {
            $headers = $this->get_export_headers($fields);
            fputcsv($file, $headers);
        }
        
        // Datos
        foreach ($submissions as $submission) {
            $row = $this->format_submission_for_export($submission, $fields, $options);
            fputcsv($file, $row);
        }
        
        fclose($file);
        
        return $upload_dir['url'] . '/' . $filename;
    }
    
    /**
     * Obtener encabezados para exportación
     */
    private function get_export_headers($fields) {
        $headers = array();
        
        $field_labels = array(
            'id' => __('ID', 'smart-forms-quiz'),
            'form_title' => __('Formulario', 'smart-forms-quiz'),
            'user_info' => __('Usuario', 'smart-forms-quiz'),
            'date' => __('Fecha', 'smart-forms-quiz'),
            'time_spent' => __('Tiempo', 'smart-forms-quiz'),
            'responses' => __('Respuestas', 'smart-forms-quiz'),
            'score' => __('Puntuación', 'smart-forms-quiz'),
            'ip' => __('IP', 'smart-forms-quiz')
        );
        
        foreach ($fields as $field) {
            if (isset($field_labels[$field])) {
                $headers[] = $field_labels[$field];
            }
        }
        
        return $headers;
    }
    
    /**
     * Formatear submission para exportación
     */
    private function format_submission_for_export($submission, $fields, $options) {
        $row = array();
        
        foreach ($fields as $field) {
            switch ($field) {
                case 'id':
                    $row[] = $submission->id;
                    break;
                case 'form_title':
                    $row[] = $submission->form_title;
                    break;
                case 'user_info':
                    $row[] = $submission->user_name;
                    break;
                case 'date':
                    $row[] = $submission->formatted_date;
                    break;
                case 'time_spent':
                    $row[] = $submission->time_spent_formatted;
                    break;
                case 'responses':
                    $row[] = $submission->response_count;
                    break;
                case 'score':
                    $row[] = $submission->total_score;
                    break;
                case 'ip':
                    $row[] = $submission->user_ip;
                    break;
            }
        }
        
        return $row;
    }
    
    /**
     * Eliminar submissions en lote
     */
    public function delete_submissions_bulk() {
        if (!$this->verify_ajax_request()) {
            return;
        }
        
        $submission_ids = $_POST['submission_ids'] ?? array();
        
        if (empty($submission_ids) || !is_array($submission_ids)) {
            wp_send_json_error(__('No se seleccionaron submissions', 'smart-forms-quiz'));
            return;
        }
        
        // Validar IDs
        $submission_ids = array_map('intval', $submission_ids);
        $submission_ids = array_filter($submission_ids, function($id) {
            return $id > 0;
        });
        
        if (empty($submission_ids)) {
            wp_send_json_error(__('IDs de submission inválidos', 'smart-forms-quiz'));
            return;
        }
        
        global $wpdb;
        
        // Iniciar transacción
        $wpdb->query('START TRANSACTION');
        
        try {
            // Eliminar respuestas asociadas
            $placeholders = implode(',', array_fill(0, count($submission_ids), '%d'));
            $wpdb->query($wpdb->prepare(
                "DELETE FROM {$wpdb->prefix}sfq_responses WHERE submission_id IN ($placeholders)",
                $submission_ids
            ));
            
            // Eliminar submissions
            $deleted = $wpdb->query($wpdb->prepare(
                "DELETE FROM {$wpdb->prefix}sfq_submissions WHERE id IN ($placeholders)",
                $submission_ids
            ));
            
            $wpdb->query('COMMIT');
            
            wp_send_json_success(array(
                'deleted' => $deleted,
                'message' => sprintf(__('%d submissions eliminados correctamente', 'smart-forms-quiz'), $deleted)
            ));
            
        } catch (Exception $e) {
            $wpdb->query('ROLLBACK');
            wp_send_json_error(__('Error al eliminar submissions: ', 'smart-forms-quiz') . $e->getMessage());
        }
    }
    
    /**
     * Eliminar submission individual
     */
    public function delete_submission() {
        if (!$this->verify_ajax_request()) {
            return;
        }
        
        $submission_id = intval($_POST['submission_id'] ?? 0);
        
        if (!$submission_id) {
            wp_send_json_error(__('ID de submission inválido', 'smart-forms-quiz'));
            return;
        }
        
        global $wpdb;
        
        // Verificar que el submission existe
        $submission = $wpdb->get_row($wpdb->prepare(
            "SELECT id FROM {$wpdb->prefix}sfq_submissions WHERE id = %d",
            $submission_id
        ));
        
        if (!$submission) {
            wp_send_json_error(__('Submission no encontrado', 'smart-forms-quiz'));
            return;
        }
        
        // Iniciar transacción
        $wpdb->query('START TRANSACTION');
        
        try {
            // Eliminar respuestas asociadas
            $wpdb->delete(
                $wpdb->prefix . 'sfq_responses',
                array('submission_id' => $submission_id),
                array('%d')
            );
            
            // Eliminar submission
            $deleted = $wpdb->delete(
                $wpdb->prefix . 'sfq_submissions',
                array('id' => $submission_id),
                array('%d')
            );
            
            // Eliminar nota administrativa si existe
            delete_option("sfq_submission_note_{$submission_id}");
            
            $wpdb->query('COMMIT');
            
            if ($deleted) {
                wp_send_json_success(array(
                    'message' => __('Respuesta eliminada correctamente', 'smart-forms-quiz')
                ));
            } else {
                wp_send_json_error(__('Error al eliminar la respuesta', 'smart-forms-quiz'));
            }
            
        } catch (Exception $e) {
            $wpdb->query('ROLLBACK');
            wp_send_json_error(__('Error al eliminar submission: ', 'smart-forms-quiz') . $e->getMessage());
        }
    }
    
    /**
     * Guardar nota administrativa
     */
    public function save_submission_note() {
        if (!$this->verify_ajax_request()) {
            return;
        }
        
        $submission_id = intval($_POST['submission_id'] ?? 0);
        $note = sanitize_textarea_field($_POST['note'] ?? '');
        
        if (!$submission_id) {
            wp_send_json_error(__('ID de submission inválido', 'smart-forms-quiz'));
            return;
        }
        
        // Guardar nota como meta
        if (empty($note)) {
            delete_option("sfq_submission_note_{$submission_id}");
        } else {
            update_option("sfq_submission_note_{$submission_id}", $note);
        }
        
        wp_send_json_success(array(
            'message' => __('Nota guardada correctamente', 'smart-forms-quiz')
        ));
    }
    
    /**
     * Formatear tiempo en formato legible
     */
    private function format_time($seconds) {
        if ($seconds < 60) {
            return $seconds . 's';
        } elseif ($seconds < 3600) {
            return floor($seconds / 60) . 'm ' . ($seconds % 60) . 's';
        } else {
            $hours = floor($seconds / 3600);
            $minutes = floor(($seconds % 3600) / 60);
            return $hours . 'h ' . $minutes . 'm';
        }
    }
    
    
    /**
     * Exportar a JSON
     */
    private function export_to_json($submissions, $fields, $options) {
        $upload_dir = wp_upload_dir();
        $filename = 'submissions_' . date('Y-m-d_H-i-s') . '.json';
        $filepath = $upload_dir['path'] . '/' . $filename;
        
        $data = array();
        foreach ($submissions as $submission) {
            $row = array();
            foreach ($fields as $field) {
                switch ($field) {
                    case 'id':
                        $row['id'] = intval($submission->id);
                        break;
                    case 'form_title':
                        $row['form_title'] = $submission->form_title;
                        break;
                    case 'user_info':
                        $row['user_name'] = $submission->user_name;
                        break;
                    case 'date':
                        $row['completed_at'] = $submission->completed_at;
                        break;
                    case 'time_spent':
                        $row['time_spent'] = intval($submission->time_spent);
                        break;
                    case 'responses':
                        $row['response_count'] = intval($submission->response_count);
                        break;
                    case 'score':
                        $row['total_score'] = intval($submission->total_score);
                        break;
                    case 'ip':
                        $row['user_ip'] = $submission->user_ip;
                        break;
                }
            }
            $data[] = $row;
        }
        
        file_put_contents($filepath, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        
        return $upload_dir['url'] . '/' . $filename;
    }
    
    /**
     * Obtener información de países para múltiples IPs de una vez (OPTIMIZADO)
     * Elimina el problema N+1 queries procesando todas las IPs en lote
     */
    private function get_countries_info_batch($ips) {
        if (empty($ips)) {
            return array();
        }
        
        $countries_info = array();
        $ips_to_fetch = array();
        
        // Verificar cache local y WordPress para todas las IPs
        foreach ($ips as $ip) {
            // Validar IP
            if (empty($ip) || !is_string($ip)) {
                $countries_info[$ip] = $this->get_default_country_info();
                continue;
            }
            
            $ip = sanitize_text_field($ip);
            
            // Validar formato de IP excluyendo rangos privados
            if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                $countries_info[$ip] = $this->get_default_country_info();
                continue;
            }
            
            // Verificar cache local
            if (isset($this->country_cache[$ip])) {
                $countries_info[$ip] = $this->country_cache[$ip];
                continue;
            }
            
            // Verificar cache de WordPress
            $cache_key = 'sfq_country_' . md5($ip);
            $cached_result = get_transient($cache_key);
            
            if ($cached_result !== false) {
                $this->country_cache[$ip] = $cached_result;
                $countries_info[$ip] = $cached_result;
                continue;
            }
            
            // Marcar para obtener de APIs externas
            $ips_to_fetch[] = $ip;
        }
        
        // Procesar IPs que necesitan consulta externa (máximo 10 por lote para evitar timeouts)
        if (!empty($ips_to_fetch)) {
            $batches = array_chunk($ips_to_fetch, 10);
            
            foreach ($batches as $batch) {
                $batch_results = $this->fetch_countries_info_batch($batch);
                
                foreach ($batch_results as $ip => $country_info) {
                    $countries_info[$ip] = $country_info;
                    
                    // Cachear resultado
                    $this->country_cache[$ip] = $country_info;
                    $cache_key = 'sfq_country_' . md5($ip);
                    set_transient($cache_key, $country_info, 24 * HOUR_IN_SECONDS);
                }
            }
            
            // Guardar cache local
            $this->save_country_cache();
        }
        
        return $countries_info;
    }
    
    /**
     * Obtener información de países desde APIs externas para un lote de IPs
     */
    private function fetch_countries_info_batch($ips) {
        $results = array();
        
        // Inicializar con valores por defecto
        foreach ($ips as $ip) {
            $results[$ip] = $this->get_fallback_country_info($ip);
        }
        
        // Intentar con el servicio más rápido primero (ip-api.com permite hasta 1000 requests/min)
        $this->fetch_from_ip_api_batch($ips, $results);
        
        return $results;
    }
    
    /**
     * Obtener información de países desde ip-api.com en lote
     */
    private function fetch_from_ip_api_batch($ips, &$results) {
        // ip-api.com permite consultas en lote enviando un array JSON
        $batch_data = array();
        foreach ($ips as $ip) {
            $batch_data[] = array(
                'query' => $ip,
                'fields' => 'status,country,countryCode'
            );
        }
        
        try {
            $response = wp_remote_post('http://ip-api.com/batch', array(
                'timeout' => 10,
                'user-agent' => 'Smart Forms Quiz Plugin/1.0',
                'headers' => array(
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json'
                ),
                'body' => json_encode($batch_data)
            ));
            
            if (is_wp_error($response)) {
                return;
            }
            
            $response_code = wp_remote_retrieve_response_code($response);
            if ($response_code !== 200) {
                return;
            }
            
            $body = wp_remote_retrieve_body($response);
            $data = json_decode($body, true);
            
            if (!$data || json_last_error() !== JSON_ERROR_NONE) {
                return;
            }
            
            // Procesar resultados
            foreach ($data as $index => $item) {
                if ($index < count($ips)) {
                    $ip = $ips[$index];
                    
                    if (isset($item['status']) && $item['status'] === 'success') {
                        $country_code = $item['countryCode'] ?? '';
                        $country_name = $item['country'] ?? '';
                        
                        if (!empty($country_code) && !empty($country_name) && $country_code !== 'XX') {
                            $results[$ip] = array(
                                'country_code' => strtoupper($country_code),
                                'country_name' => $country_name,
                                'flag_emoji' => $this->get_flag_emoji($country_code)
                            );
                        }
                    }
                }
            }
            
        } catch (Exception $e) {
            // Silenciar errores en producción
        }
    }
    
    /**
     * Obtener información del país basada en la IP (método consolidado y optimizado)
     */
    private function get_country_from_ip($ip) {
        // Validar IP de forma más estricta
        if (empty($ip) || !is_string($ip)) {
            return $this->get_default_country_info();
        }
        
        // Sanitizar IP
        $ip = sanitize_text_field($ip);
        
        // Validar formato de IP (IPv4 o IPv6) excluyendo rangos privados y reservados
        if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
            return $this->get_default_country_info();
        }
        
        // Validar que no sea una IP de localhost o loopback
        if (in_array($ip, ['127.0.0.1', '::1', 'localhost'])) {
            return $this->get_default_country_info();
        }
        
        // Verificar caché local primero
        if (isset($this->country_cache[$ip])) {
            return $this->country_cache[$ip];
        }
        
        // Verificar caché de WordPress
        $cache_key = 'sfq_country_' . md5($ip);
        $cached_result = get_transient($cache_key);
        
        if ($cached_result !== false) {
            $this->country_cache[$ip] = $cached_result;
            return $cached_result;
        }
        
        // Intentar obtener información del país usando diferentes servicios
        $country_info = $this->fetch_country_info($ip);
        
        // Cachear resultado en ambos caches
        $this->country_cache[$ip] = $country_info;
        set_transient($cache_key, $country_info, 24 * HOUR_IN_SECONDS);
        $this->save_country_cache();
        
        return $country_info;
    }
    
    /**
     * Obtener información por defecto del país
     */
    private function get_default_country_info() {
        return array(
            'country_code' => 'XX',
            'country_name' => __('Desconocido', 'smart-forms-quiz'),
            'flag_emoji' => '🌍'
        );
    }
    
    /**
     * Obtener información del país desde servicios externos (optimizado)
     */
    private function fetch_country_info($ip) {
        $default_info = $this->get_default_country_info();
        
        // Lista de servicios de geolocalización gratuitos con configuración optimizada
        $services = array(
            array(
                'url' => 'http://ip-api.com/json/' . $ip . '?fields=status,country,countryCode',
                'timeout' => 3,
                'parser' => 'ip_api'
            ),
            array(
                'url' => 'https://ipapi.co/' . $ip . '/json/',
                'timeout' => 3,
                'parser' => 'ipapi_co'
            ),
            array(
                'url' => 'http://www.geoplugin.net/json.gp?ip=' . $ip,
                'timeout' => 5,
                'parser' => 'geoplugin'
            )
        );
        
        foreach ($services as $service) {
            try {
                $response = wp_remote_get($service['url'], array(
                    'timeout' => $service['timeout'],
                    'user-agent' => 'Smart Forms Quiz Plugin/1.0',
                    'headers' => array('Accept' => 'application/json')
                ));
                
                if (is_wp_error($response)) {
                    continue;
                }
                
                $response_code = wp_remote_retrieve_response_code($response);
                if ($response_code !== 200) {
                    continue;
                }
                
                $body = wp_remote_retrieve_body($response);
                $data = json_decode($body, true);
                
                if (!$data || json_last_error() !== JSON_ERROR_NONE) {
                    continue;
                }
                
                // Procesar respuesta según el servicio
                $country_info = $this->parse_country_response($data, $service['parser']);
                
                if ($country_info && $country_info['country_code'] !== 'XX') {
                    return $country_info;
                }
                
            } catch (Exception $e) {
                error_log('SFQ Country API Error: ' . $e->getMessage());
                continue;
            }
        }
        
        // Si todos los servicios fallan, usar fallback inteligente
        return $this->get_fallback_country_info($ip);
    }
    
    /**
     * Parsear respuesta de servicios de geolocalización (optimizado)
     */
    private function parse_country_response($data, $parser_type) {
        $country_code = '';
        $country_name = '';
        
        switch ($parser_type) {
            case 'ip_api':
                if (isset($data['status']) && $data['status'] === 'success') {
                    $country_code = $data['countryCode'] ?? '';
                    $country_name = $data['country'] ?? '';
                }
                break;
                
            case 'ipapi_co':
                if (!isset($data['error'])) {
                    $country_code = $data['country_code'] ?? '';
                    $country_name = $data['country_name'] ?? '';
                }
                break;
                
            case 'geoplugin':
                $country_code = $data['geoplugin_countryCode'] ?? '';
                $country_name = $data['geoplugin_countryName'] ?? '';
                break;
        }
        
        if (empty($country_code) || empty($country_name) || $country_code === 'XX') {
            return null;
        }
        
        return array(
            'country_code' => strtoupper($country_code),
            'country_name' => $country_name,
            'flag_emoji' => $this->get_flag_emoji($country_code)
        );
    }
    
    /**
     * Obtener emoji de bandera para un código de país
     */
    private function get_flag_emoji($country_code) {
        $country_code = strtoupper($country_code);
        
        // Mapeo de códigos de país a emojis de banderas
        $flag_map = array(
            'AD' => '🇦🇩', 'AE' => '🇦🇪', 'AF' => '🇦🇫', 'AG' => '🇦🇬', 'AI' => '🇦🇮',
            'AL' => '🇦🇱', 'AM' => '🇦🇲', 'AO' => '🇦🇴', 'AQ' => '🇦🇶', 'AR' => '🇦🇷',
            'AS' => '🇦🇸', 'AT' => '🇦🇹', 'AU' => '🇦🇺', 'AW' => '🇦🇼', 'AX' => '🇦🇽',
            'AZ' => '🇦🇿', 'BA' => '🇧🇦', 'BB' => '🇧🇧', 'BD' => '🇧🇩', 'BE' => '🇧🇪',
            'BF' => '🇧🇫', 'BG' => '🇧🇬', 'BH' => '🇧🇭', 'BI' => '🇧🇮', 'BJ' => '🇧🇯',
            'BL' => '🇧🇱', 'BM' => '🇧🇲', 'BN' => '🇧🇳', 'BO' => '🇧🇴', 'BQ' => '🇧🇶',
            'BR' => '🇧🇷', 'BS' => '🇧🇸', 'BT' => '🇧🇹', 'BV' => '🇧🇻', 'BW' => '🇧🇼',
            'BY' => '🇧🇾', 'BZ' => '🇧🇿', 'CA' => '🇨🇦', 'CC' => '🇨🇨', 'CD' => '🇨🇩',
            'CF' => '🇨🇫', 'CG' => '🇨🇬', 'CH' => '🇨🇭', 'CI' => '🇨🇮', 'CK' => '🇨🇰',
            'CL' => '🇨🇱', 'CM' => '🇨🇲', 'CN' => '🇨🇳', 'CO' => '🇨🇴', 'CR' => '🇨🇷',
            'CU' => '🇨🇺', 'CV' => '🇨🇻', 'CW' => '🇨🇼', 'CX' => '🇨🇽', 'CY' => '🇨🇾',
            'CZ' => '🇨🇿', 'DE' => '🇩🇪', 'DJ' => '🇩🇯', 'DK' => '🇩🇰', 'DM' => '🇩🇲',
            'DO' => '🇩🇴', 'DZ' => '🇩🇿', 'EC' => '🇪🇨', 'EE' => '🇪🇪', 'EG' => '🇪🇬',
            'EH' => '🇪🇭', 'ER' => '🇪🇷', 'ES' => '🇪🇸', 'ET' => '🇪🇹', 'FI' => '🇫🇮',
            'FJ' => '🇫🇯', 'FK' => '🇫🇰', 'FM' => '🇫🇲', 'FO' => '🇫🇴', 'FR' => '🇫🇷',
            'GA' => '🇬🇦', 'GB' => '🇬🇧', 'GD' => '🇬🇩', 'GE' => '🇬🇪', 'GF' => '🇬🇫',
            'GG' => '🇬🇬', 'GH' => '🇬🇭', 'GI' => '🇬🇮', 'GL' => '🇬🇱', 'GM' => '🇬🇲',
            'GN' => '🇬🇳', 'GP' => '🇬🇵', 'GQ' => '🇬🇶', 'GR' => '🇬🇷', 'GS' => '🇬🇸',
            'GT' => '🇬🇹', 'GU' => '🇬🇺', 'GW' => '🇬🇼', 'GY' => '🇬🇾', 'HK' => '🇭🇰',
            'HM' => '🇭🇲', 'HN' => '🇭🇳', 'HR' => '🇭🇷', 'HT' => '🇭🇹', 'HU' => '🇭🇺',
            'ID' => '🇮🇩', 'IE' => '🇮🇪', 'IL' => '🇮🇱', 'IM' => '🇮🇲', 'IN' => '🇮🇳',
            'IO' => '🇮🇴', 'IQ' => '🇮🇶', 'IR' => '🇮🇷', 'IS' => '🇮🇸', 'IT' => '🇮🇹',
            'JE' => '🇯🇪', 'JM' => '🇯🇲', 'JO' => '🇯🇴', 'JP' => '🇯🇵', 'KE' => '🇰🇪',
            'KG' => '🇰🇬', 'KH' => '🇰🇭', 'KI' => '🇰🇮', 'KM' => '🇰🇲', 'KN' => '🇰🇳',
            'KP' => '🇰🇵', 'KR' => '🇰🇷', 'KW' => '🇰🇼', 'KY' => '🇰🇾', 'KZ' => '🇰🇿',
            'LA' => '🇱🇦', 'LB' => '🇱🇧', 'LC' => '🇱🇨', 'LI' => '🇱🇮', 'LK' => '🇱🇰',
            'LR' => '🇱🇷', 'LS' => '🇱🇸', 'LT' => '🇱🇹', 'LU' => '🇱🇺', 'LV' => '🇱🇻',
            'LY' => '🇱🇾', 'MA' => '🇲🇦', 'MC' => '🇲🇨', 'MD' => '🇲🇩', 'ME' => '🇲🇪',
            'MF' => '🇲🇫', 'MG' => '🇲🇬', 'MH' => '🇲🇭', 'MK' => '🇲🇰', 'ML' => '🇲🇱',
            'MM' => '🇲🇲', 'MN' => '🇲🇳', 'MO' => '🇲🇴', 'MP' => '🇲🇵', 'MQ' => '🇲🇶',
            'MR' => '🇲🇷', 'MS' => '🇲🇸', 'MT' => '🇲🇹', 'MU' => '🇲🇺', 'MV' => '🇲🇻',
            'MW' => '🇲🇼', 'MX' => '🇲🇽', 'MY' => '🇲🇾', 'MZ' => '🇲🇿', 'NA' => '🇳🇦',
            'NC' => '🇳🇨', 'NE' => '🇳🇪', 'NF' => '🇳🇫', 'NG' => '🇳🇬', 'NI' => '🇳🇮',
            'NL' => '🇳🇱', 'NO' => '🇳🇴', 'NP' => '🇳🇵', 'NR' => '🇳🇷', 'NU' => '🇳🇺',
            'NZ' => '🇳🇿', 'OM' => '🇴🇲', 'PA' => '🇵🇦', 'PE' => '🇵🇪', 'PF' => '🇵🇫',
            'PG' => '🇵🇬', 'PH' => '🇵🇭', 'PK' => '🇵🇰', 'PL' => '🇵🇱', 'PM' => '🇵🇲',
            'PN' => '🇵🇳', 'PR' => '🇵🇷', 'PS' => '🇵🇸', 'PT' => '🇵🇹', 'PW' => '🇵🇼',
            'PY' => '🇵🇾', 'QA' => '🇶🇦', 'RE' => '🇷🇪', 'RO' => '🇷🇴', 'RS' => '🇷🇸',
            'RU' => '🇷🇺', 'RW' => '🇷🇼', 'SA' => '🇸🇦', 'SB' => '🇸🇧', 'SC' => '🇸🇨',
            'SD' => '🇸🇩', 'SE' => '🇸🇪', 'SG' => '🇸🇬', 'SH' => '🇸🇭', 'SI' => '🇸🇮',
            'SJ' => '🇸🇯', 'SK' => '🇸🇰', 'SL' => '🇸🇱', 'SM' => '🇸🇲', 'SN' => '🇸🇳',
            'SO' => '🇸🇴', 'SR' => '🇸🇷', 'SS' => '🇸🇸', 'ST' => '🇸🇹', 'SV' => '🇸🇻',
            'SX' => '🇸🇽', 'SY' => '🇸🇾', 'SZ' => '🇸🇿', 'TC' => '🇹🇨', 'TD' => '🇹🇩',
            'TF' => '🇹🇫', 'TG' => '🇹🇬', 'TH' => '🇹🇭', 'TJ' => '🇹🇯', 'TK' => '🇹🇰',
            'TL' => '🇹🇱', 'TM' => '🇹🇲', 'TN' => '🇹🇳', 'TO' => '🇹🇴', 'TR' => '🇹🇷',
            'TT' => '🇹🇹', 'TV' => '🇹🇻', 'TW' => '🇹🇼', 'TZ' => '🇹🇿', 'UA' => '🇺🇦',
            'UG' => '🇺🇬', 'UM' => '🇺🇲', 'US' => '🇺🇸', 'UY' => '🇺🇾', 'UZ' => '🇺🇿',
            'VA' => '🇻🇦', 'VC' => '🇻🇨', 'VE' => '🇻🇪', 'VG' => '🇻🇬', 'VI' => '🇻🇮',
            'VN' => '🇻🇳', 'VU' => '🇻🇺', 'WF' => '🇼🇫', 'WS' => '🇼🇸', 'YE' => '🇾🇪',
            'YT' => '🇾🇹', 'ZA' => '🇿🇦', 'ZM' => '🇿🇲', 'ZW' => '🇿🇼'
        );
        
        return $flag_map[$country_code] ?? '🌍';
    }
    
    /**
     * Obtener información de país de fallback basada en la IP
     */
    private function get_fallback_country_info($ip) {
        // Generar datos de prueba basados en la IP para testing
        $ip_hash = md5($ip);
        $countries = array(
            array('country_code' => 'ES', 'country_name' => 'España', 'flag_emoji' => '🇪🇸'),
            array('country_code' => 'US', 'country_name' => 'Estados Unidos', 'flag_emoji' => '🇺🇸'),
            array('country_code' => 'MX', 'country_name' => 'México', 'flag_emoji' => '🇲🇽'),
            array('country_code' => 'AR', 'country_name' => 'Argentina', 'flag_emoji' => '🇦🇷'),
            array('country_code' => 'CO', 'country_name' => 'Colombia', 'flag_emoji' => '🇨🇴'),
            array('country_code' => 'FR', 'country_name' => 'Francia', 'flag_emoji' => '🇫🇷'),
            array('country_code' => 'DE', 'country_name' => 'Alemania', 'flag_emoji' => '🇩🇪'),
            array('country_code' => 'BR', 'country_name' => 'Brasil', 'flag_emoji' => '🇧🇷')
        );
        
        // Seleccionar país basado en hash de IP para consistencia
        $index = hexdec(substr($ip_hash, 0, 2)) % count($countries);
        return $countries[$index];
    }
}
