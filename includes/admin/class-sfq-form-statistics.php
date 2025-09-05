<?php
/**
 * Gestión de estadísticas específicas por formulario
 */

if (!defined('ABSPATH')) {
    exit;
}

class SFQ_Form_Statistics {
    
    private $database;
    private $wpdb;
    
    public function __construct() {
        global $wpdb;
        $this->database = new SFQ_Database();
        $this->wpdb = $wpdb;
    }
    
    /**
     * Inicializar hooks y acciones
     */
    public function init() {
        // AJAX handlers para estadísticas
        add_action('wp_ajax_sfq_get_form_statistics', array($this, 'get_form_statistics'));
        add_action('wp_ajax_sfq_get_question_analytics', array($this, 'get_question_analytics'));
        add_action('wp_ajax_sfq_export_form_statistics', array($this, 'export_form_statistics'));
        add_action('wp_ajax_sfq_get_form_country_stats', array($this, 'get_form_country_stats'));
        // ✅ NUEVO: AJAX handlers para análisis de abandono
        add_action('wp_ajax_sfq_get_abandonment_analytics', array($this, 'get_abandonment_analytics'));
        add_action('wp_ajax_sfq_get_partial_responses_list', array($this, 'get_partial_responses_list'));
        // ✅ NUEVO: AJAX handlers para visitantes y clics
        add_action('wp_ajax_sfq_get_visitors_analytics', array($this, 'get_visitors_analytics'));
        add_action('wp_ajax_sfq_export_visitors_data', array($this, 'export_visitors_data'));
    }
    
    /**
     * Renderizar página de estadísticas del formulario
     */
    public function render_statistics_page() {
        $form_id = isset($_GET['form_id']) ? intval($_GET['form_id']) : 0;
        
        if (!$form_id) {
            wp_die(__('ID de formulario inválido', 'smart-forms-quiz'));
        }
        
        // Obtener información del formulario
        $form = $this->database->get_form($form_id);
        
        if (!$form) {
            wp_die(__('Formulario no encontrado', 'smart-forms-quiz'));
        }
        
        // Obtener preguntas del formulario
        $questions = $this->wpdb->get_results($this->wpdb->prepare(
            "SELECT * FROM {$this->wpdb->prefix}sfq_questions 
            WHERE form_id = %d 
            ORDER BY order_position ASC",
            $form_id
        ));
        ?>
        <div class="wrap sfq-statistics-wrap">
            <!-- Header -->
            <div class="sfq-stats-header">
                <div class="sfq-stats-header-left">
                    <h1>
                        <span class="dashicons dashicons-chart-pie"></span>
                        <?php _e('Estadísticas de', 'smart-forms-quiz'); ?>: <?php echo esc_html($form->title); ?>
                    </h1>
                    <p class="sfq-stats-description">
                        <?php echo esc_html($form->description); ?>
                    </p>
                </div>
                <div class="sfq-stats-header-right">
                    <a href="<?php echo admin_url('admin.php?page=smart-forms-quiz'); ?>" class="button">
                        <span class="dashicons dashicons-arrow-left-alt"></span>
                        <?php _e('Volver a Formularios', 'smart-forms-quiz'); ?>
                    </a>
                    <button class="button" id="sfq-refresh-stats">
                        <span class="dashicons dashicons-update"></span>
                        <?php _e('Actualizar', 'smart-forms-quiz'); ?>
                    </button>
                    <button class="button button-primary" id="sfq-export-stats">
                        <span class="dashicons dashicons-download"></span>
                        <?php _e('Exportar CSV', 'smart-forms-quiz'); ?>
                    </button>
                </div>
            </div>

            <!-- Filtros de fecha -->
            <div class="sfq-stats-filters">
                <div class="sfq-filter-group">
                    <label><?php _e('Período', 'smart-forms-quiz'); ?></label>
                    <select id="sfq-stats-period">
                        <option value="all"><?php _e('Todo el tiempo', 'smart-forms-quiz'); ?></option>
                        <option value="today"><?php _e('Hoy', 'smart-forms-quiz'); ?></option>
                        <option value="week"><?php _e('Última semana', 'smart-forms-quiz'); ?></option>
                        <option value="month" selected><?php _e('Último mes', 'smart-forms-quiz'); ?></option>
                        <option value="year"><?php _e('Último año', 'smart-forms-quiz'); ?></option>
                        <option value="custom"><?php _e('Personalizado', 'smart-forms-quiz'); ?></option>
                    </select>
                </div>
                
                <div class="sfq-filter-group sfq-custom-dates" style="display: none;">
                    <label><?php _e('Desde', 'smart-forms-quiz'); ?></label>
                    <input type="date" id="sfq-stats-date-from">
                    <label><?php _e('Hasta', 'smart-forms-quiz'); ?></label>
                    <input type="date" id="sfq-stats-date-to">
                </div>
                
                <div class="sfq-filter-group">
                    <button class="button button-primary" id="sfq-apply-stats-filter">
                        <?php _e('Aplicar Filtros', 'smart-forms-quiz'); ?>
                    </button>
                </div>
            </div>

            <!-- Resumen General -->
            <div class="sfq-stats-summary">
                <div class="sfq-summary-grid">
                    <div class="sfq-summary-card">
                        <div class="sfq-summary-icon">
                            <span class="dashicons dashicons-groups"></span>
                        </div>
                        <div class="sfq-summary-content">
                            <div class="sfq-summary-value" id="total-responses">-</div>
                            <div class="sfq-summary-label"><?php _e('Total Respuestas', 'smart-forms-quiz'); ?></div>
                        </div>
                    </div>
                    
                    <div class="sfq-summary-card">
                        <div class="sfq-summary-icon">
                            <span class="dashicons dashicons-yes-alt"></span>
                        </div>
                        <div class="sfq-summary-content">
                            <div class="sfq-summary-value" id="completion-rate">-</div>
                            <div class="sfq-summary-label"><?php _e('Tasa Completado', 'smart-forms-quiz'); ?></div>
                        </div>
                    </div>
                    
                    <div class="sfq-summary-card">
                        <div class="sfq-summary-icon">
                            <span class="dashicons dashicons-clock"></span>
                        </div>
                        <div class="sfq-summary-content">
                            <div class="sfq-summary-value" id="avg-time">-</div>
                            <div class="sfq-summary-label"><?php _e('Tiempo Promedio', 'smart-forms-quiz'); ?></div>
                        </div>
                    </div>
                    
                    <div class="sfq-summary-card">
                        <div class="sfq-summary-icon">
                            <span class="dashicons dashicons-admin-site-alt3"></span>
                        </div>
                        <div class="sfq-summary-content">
                            <div class="sfq-summary-value" id="countries-count">-</div>
                            <div class="sfq-summary-label"><?php _e('Países', 'smart-forms-quiz'); ?></div>
                        </div>
                    </div>
                    
                    <div class="sfq-summary-card">
                        <div class="sfq-summary-icon">
                            <span class="dashicons dashicons-backup"></span>
                        </div>
                        <div class="sfq-summary-content">
                            <div class="sfq-summary-value" id="partial-responses">-</div>
                            <div class="sfq-summary-label"><?php _e('Respuestas Parciales', 'smart-forms-quiz'); ?></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tabs de contenido -->
            <div class="sfq-stats-tabs">
                <nav class="sfq-tabs-nav">
                    <button class="sfq-tab-button active" data-tab="visitors">
                        <span class="dashicons dashicons-visibility"></span>
                        <?php _e('Visitantes y Clics', 'smart-forms-quiz'); ?>
                    </button>
                    <button class="sfq-tab-button" data-tab="questions">
                        <span class="dashicons dashicons-editor-help"></span>
                        <?php _e('Estadísticas por Pregunta', 'smart-forms-quiz'); ?>
                    </button>
                    <button class="sfq-tab-button" data-tab="countries">
                        <span class="dashicons dashicons-admin-site-alt3"></span>
                        <?php _e('Análisis por País', 'smart-forms-quiz'); ?>
                    </button>
                    <button class="sfq-tab-button" data-tab="timeline">
                        <span class="dashicons dashicons-chart-line"></span>
                        <?php _e('Evolución Temporal', 'smart-forms-quiz'); ?>
                    </button>
                    <button class="sfq-tab-button" data-tab="abandonment">
                        <span class="dashicons dashicons-warning"></span>
                        <?php _e('Análisis de Abandono', 'smart-forms-quiz'); ?>
                    </button>
                    <button class="sfq-tab-button" data-tab="responses">
                        <span class="dashicons dashicons-list-view"></span>
                        <?php _e('Respuestas Individuales', 'smart-forms-quiz'); ?>
                    </button>
                </nav>
            </div>

            <!-- Tab: Estadísticas por Pregunta -->
            <div class="sfq-tab-content" id="tab-questions">
                <div class="sfq-questions-stats" id="sfq-questions-container">
                    <?php if (empty($questions)) : ?>
                        <div class="sfq-no-data">
                            <span class="dashicons dashicons-info"></span>
                            <p><?php _e('No hay preguntas en este formulario', 'smart-forms-quiz'); ?></p>
                        </div>
                    <?php else : ?>
                        <div class="sfq-loading-stats">
                            <div class="sfq-loading-spinner"></div>
                            <p><?php _e('Cargando estadísticas...', 'smart-forms-quiz'); ?></p>
                        </div>
                    <?php endif; ?>
                </div>
            </div>

            <!-- Tab: Análisis por País -->
            <div class="sfq-tab-content" id="tab-countries">
                <div class="sfq-countries-container">
                    <div class="sfq-countries-grid">
                        <!-- Mapa de países -->
                        <div class="sfq-countries-map">
                            <h3><?php _e('Distribución Geográfica', 'smart-forms-quiz'); ?></h3>
                            <div class="sfq-map-container">
                                <canvas id="sfq-countries-chart" width="400" height="300"></canvas>
                            </div>
                        </div>
                        
                        <!-- Lista de países -->
                        <div class="sfq-countries-list">
                            <h3><?php _e('Top Países', 'smart-forms-quiz'); ?></h3>
                            <div id="sfq-countries-table">
                                <div class="sfq-loading-stats">
                                    <div class="sfq-loading-spinner"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Estadísticas por país y pregunta -->
                    <div class="sfq-country-questions">
                        <h3><?php _e('Respuestas por País', 'smart-forms-quiz'); ?></h3>
                        <div class="sfq-country-filter">
                            <select id="sfq-select-country">
                                <option value=""><?php _e('Selecciona un país', 'smart-forms-quiz'); ?></option>
                            </select>
                        </div>
                        <div id="sfq-country-responses">
                            <p class="sfq-select-country-msg">
                                <?php _e('Selecciona un país para ver el desglose de respuestas', 'smart-forms-quiz'); ?>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tab: Evolución Temporal -->
            <div class="sfq-tab-content" id="tab-timeline">
                <div class="sfq-timeline-container">
                    <div class="sfq-timeline-chart">
                        <h3><?php _e('Respuestas a lo largo del tiempo', 'smart-forms-quiz'); ?></h3>
                        <canvas id="sfq-timeline-chart" width="800" height="400"></canvas>
                    </div>
                    
                    <div class="sfq-timeline-stats">
                        <div class="sfq-timeline-grid">
                            <div class="sfq-timeline-card">
                                <h4><?php _e('Mejor día', 'smart-forms-quiz'); ?></h4>
                                <div class="sfq-timeline-value" id="best-day">-</div>
                            </div>
                            <div class="sfq-timeline-card">
                                <h4><?php _e('Promedio diario', 'smart-forms-quiz'); ?></h4>
                                <div class="sfq-timeline-value" id="daily-avg">-</div>
                            </div>
                            <div class="sfq-timeline-card">
                                <h4><?php _e('Tendencia', 'smart-forms-quiz'); ?></h4>
                                <div class="sfq-timeline-value" id="trend">-</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tab: Análisis de Abandono -->
            <div class="sfq-tab-content" id="tab-abandonment">
                <div class="sfq-abandonment-container">
                    <!-- Resumen de abandono -->
                    <div class="sfq-abandonment-summary">
                        <div class="sfq-abandonment-grid">
                            <div class="sfq-abandonment-card">
                                <div class="sfq-abandonment-icon">
                                    <span class="dashicons dashicons-backup"></span>
                                </div>
                                <div class="sfq-abandonment-content">
                                    <div class="sfq-abandonment-value" id="partial-responses-count">-</div>
                                    <div class="sfq-abandonment-label"><?php _e('Respuestas Parciales', 'smart-forms-quiz'); ?></div>
                                </div>
                            </div>
                            
                            <div class="sfq-abandonment-card">
                                <div class="sfq-abandonment-icon">
                                    <span class="dashicons dashicons-warning"></span>
                                </div>
                                <div class="sfq-abandonment-content">
                                    <div class="sfq-abandonment-value" id="abandonment-rate">-</div>
                                    <div class="sfq-abandonment-label"><?php _e('Tasa de Abandono', 'smart-forms-quiz'); ?></div>
                                </div>
                            </div>
                            
                            <div class="sfq-abandonment-card">
                                <div class="sfq-abandonment-icon">
                                    <span class="dashicons dashicons-location-alt"></span>
                                </div>
                                <div class="sfq-abandonment-content">
                                    <div class="sfq-abandonment-value" id="top-exit-question">-</div>
                                    <div class="sfq-abandonment-label"><?php _e('Pregunta con Más Abandonos', 'smart-forms-quiz'); ?></div>
                                </div>
                            </div>
                            
                            <div class="sfq-abandonment-card">
                                <div class="sfq-abandonment-icon">
                                    <span class="dashicons dashicons-admin-site-alt3"></span>
                                </div>
                                <div class="sfq-abandonment-content">
                                    <div class="sfq-abandonment-value" id="top-abandonment-country">-</div>
                                    <div class="sfq-abandonment-label"><?php _e('País con Más Abandonos', 'smart-forms-quiz'); ?></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Gráficos de abandono -->
                    <div class="sfq-abandonment-charts">
                        <div class="sfq-abandonment-charts-grid">
                            <!-- Gráfico de puntos de abandono -->
                            <div class="sfq-chart-container">
                                <div class="sfq-chart-header">
                                    <h3><?php _e('Puntos de Abandono por Pregunta', 'smart-forms-quiz'); ?></h3>
                                    <div class="sfq-chart-info">
                                        <span class="dashicons dashicons-info"></span>
                                        <div class="sfq-tooltip">
                                            <?php _e('Muestra en qué preguntas los usuarios abandonan más el formulario', 'smart-forms-quiz'); ?>
                                        </div>
                                    </div>
                                </div>
                                <div class="sfq-chart-content">
                                    <canvas id="sfq-abandonment-questions-chart" width="400" height="300"></canvas>
                                </div>
                            </div>
                            
                            <!-- Gráfico de países con más abandonos -->
                            <div class="sfq-chart-container">
                                <div class="sfq-chart-header">
                                    <h3><?php _e('Abandonos por País', 'smart-forms-quiz'); ?></h3>
                                    <div class="sfq-chart-info">
                                        <span class="dashicons dashicons-info"></span>
                                        <div class="sfq-tooltip">
                                            <?php _e('Distribución geográfica de los abandonos del formulario', 'smart-forms-quiz'); ?>
                                        </div>
                                    </div>
                                </div>
                                <div class="sfq-chart-content">
                                    <canvas id="sfq-abandonment-countries-chart" width="400" height="300"></canvas>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Gráfico temporal de abandonos -->
                        <div class="sfq-chart-container sfq-chart-full-width">
                            <div class="sfq-chart-header">
                                <h3><?php _e('Evolución Temporal de Abandonos', 'smart-forms-quiz'); ?></h3>
                                <div class="sfq-chart-controls">
                                    <select id="sfq-abandonment-timeline-period">
                                        <option value="today"><?php _e('Hoy', 'smart-forms-quiz'); ?></option>
                                        <option value="7"><?php _e('Últimos 7 días', 'smart-forms-quiz'); ?></option>
                                        <option value="30" selected><?php _e('Últimos 30 días', 'smart-forms-quiz'); ?></option>
                                        <option value="90"><?php _e('Últimos 90 días', 'smart-forms-quiz'); ?></option>
                                    </select>
                                </div>
                            </div>
                            <div class="sfq-chart-content">
                                <canvas id="sfq-abandonment-timeline-chart" width="800" height="300"></canvas>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Tabla detallada de abandonos -->
                    <div class="sfq-abandonment-details">
                        <div class="sfq-abandonment-details-header">
                            <h3><?php _e('Detalles de Respuestas Parciales', 'smart-forms-quiz'); ?></h3>
                            <div class="sfq-abandonment-filters">
                                <select id="sfq-abandonment-filter-country">
                                    <option value=""><?php _e('Todos los países', 'smart-forms-quiz'); ?></option>
                                </select>
                                <select id="sfq-abandonment-filter-question">
                                    <option value=""><?php _e('Todas las preguntas', 'smart-forms-quiz'); ?></option>
                                </select>
                                <button class="button" id="sfq-apply-abandonment-filters">
                                    <?php _e('Filtrar', 'smart-forms-quiz'); ?>
                                </button>
                            </div>
                        </div>
                        
                        <div class="sfq-abandonment-table">
                            <table class="wp-list-table widefat fixed striped">
                                <thead>
                                    <tr>
                                        <th><?php _e('Sesión', 'smart-forms-quiz'); ?></th>
                                        <th><?php _e('País', 'smart-forms-quiz'); ?></th>
                                        <th><?php _e('Última Pregunta', 'smart-forms-quiz'); ?></th>
                                        <th><?php _e('Progreso', 'smart-forms-quiz'); ?></th>
                                        <th><?php _e('Tiempo Transcurrido', 'smart-forms-quiz'); ?></th>
                                        <th><?php _e('Última Actividad', 'smart-forms-quiz'); ?></th>
                                        <th><?php _e('Estado', 'smart-forms-quiz'); ?></th>
                                    </tr>
                                </thead>
                                <tbody id="sfq-abandonment-tbody">
                                    <tr>
                                        <td colspan="7" class="sfq-loading-cell">
                                            <div class="sfq-loading-spinner"></div>
                                            <?php _e('Cargando datos de abandono...', 'smart-forms-quiz'); ?>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        
                        <div class="sfq-abandonment-pagination" id="sfq-abandonment-pagination">
                            <!-- Paginación se genera dinámicamente -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tab: Visitantes y Clics -->
            <div class="sfq-tab-content active" id="tab-visitors">
                <div class="sfq-visitors-container">
                    <!-- Resumen de visitantes y clics -->
                    <div class="sfq-visitors-summary">
                        <div class="sfq-visitors-grid">
                            <div class="sfq-visitors-card">
                                <div class="sfq-visitors-icon">
                                    <span class="dashicons dashicons-visibility"></span>
                                </div>
                                <div class="sfq-visitors-content">
                                    <div class="sfq-visitors-value" id="unique-visitors">-</div>
                                    <div class="sfq-visitors-label"><?php _e('Visitantes Únicos', 'smart-forms-quiz'); ?></div>
                                </div>
                            </div>
                            
                            <div class="sfq-visitors-card">
                                <div class="sfq-visitors-icon">
                                    <span class="dashicons dashicons-admin-page"></span>
                                </div>
                                <div class="sfq-visitors-content">
                                    <div class="sfq-visitors-value" id="total-visits">-</div>
                                    <div class="sfq-visitors-label"><?php _e('Total Visitas', 'smart-forms-quiz'); ?></div>
                                </div>
                            </div>
                            
                            <div class="sfq-visitors-card">
                                <div class="sfq-visitors-icon">
                                    <span class="dashicons dashicons-admin-users"></span>
                                </div>
                                <div class="sfq-visitors-content">
                                    <div class="sfq-visitors-value" id="unique-clicks">-</div>
                                    <div class="sfq-visitors-label"><?php _e('Clics Únicos', 'smart-forms-quiz'); ?></div>
                                </div>
                            </div>
                            
                            <div class="sfq-visitors-card">
                                <div class="sfq-visitors-icon">
                                    <span class="dashicons dashicons-controls-forward"></span>
                                </div>
                                <div class="sfq-visitors-content">
                                    <div class="sfq-visitors-value" id="total-clicks">-</div>
                                    <div class="sfq-visitors-label"><?php _e('Total Clics', 'smart-forms-quiz'); ?></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- Estadísticas adicionales -->
                    <div class="sfq-visitors-additional-stats">
                        <div class="sfq-visitors-additional-grid">
                            <div class="sfq-stat-box">
                                <h4><?php _e('País con Más Clics Únicos', 'smart-forms-quiz'); ?></h4>
                                <div class="sfq-stat-highlight" id="top-country-unique-clicks">
                                    <span class="sfq-country-flag">🌍</span>
                                    <span class="sfq-country-name">-</span>
                                    <span class="sfq-country-count">(-)</span>
                                </div>
                            </div>
                            
                            <div class="sfq-stat-box">
                                <h4><?php _e('Tasa de Conversión Global', 'smart-forms-quiz'); ?></h4>
                                <div class="sfq-stat-highlight" id="global-conversion-rate">
                                    <span class="sfq-conversion-percentage">-%</span>
                                    <span class="sfq-conversion-description"><?php _e('visitantes que hicieron clic', 'smart-forms-quiz'); ?></span>
                                </div>
                            </div>
                            
                            <div class="sfq-stat-box">
                                <h4><?php _e('Promedio de Clics por Visitante', 'smart-forms-quiz'); ?></h4>
                                <div class="sfq-stat-highlight" id="avg-clicks-per-visitor">
                                    <span class="sfq-avg-number">-</span>
                                    <span class="sfq-avg-description"><?php _e('clics por visitante', 'smart-forms-quiz'); ?></span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- Gráficos de visitantes y clics -->
                    <div class="sfq-visitors-charts">
                        <div class="sfq-visitors-charts-grid">
                            <!-- Gráfico de evolución temporal -->
                            <div class="sfq-chart-container">
                                <div class="sfq-chart-header">
                                    <h3><?php _e('Evolución de Visitantes y Clics', 'smart-forms-quiz'); ?></h3>
                                    <div class="sfq-chart-controls">
                                        <select id="sfq-visitors-timeline-period">
                                            <option value="7"><?php _e('Últimos 7 días', 'smart-forms-quiz'); ?></option>
                                            <option value="30" selected><?php _e('Últimos 30 días', 'smart-forms-quiz'); ?></option>
                                            <option value="90"><?php _e('Últimos 90 días', 'smart-forms-quiz'); ?></option>
                                        </select>
                                    </div>
                                </div>
                                <div class="sfq-chart-content">
                                    <canvas id="sfq-visitors-timeline-chart" width="300" height="300"></canvas>
                                </div>
                            </div>
                            
                            <!-- Gráfico de países con más clics únicos -->
                            <div class="sfq-chart-container">
                                <div class="sfq-chart-header">
                                    <h3><?php _e('Países con Más Clics Únicos', 'smart-forms-quiz'); ?></h3>
                                    <div class="sfq-chart-info">
                                        <span class="dashicons dashicons-info"></span>
                                        <div class="sfq-tooltip">
                                            <?php _e('Distribución geográfica de los clics únicos del formulario', 'smart-forms-quiz'); ?>
                                        </div>
                                    </div>
                                </div>
                                <div class="sfq-chart-content">
                                    <canvas id="sfq-visitors-countries-chart" width="400" height="300"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Tabla de países con estadísticas detalladas -->
                    <div class="sfq-visitors-countries-table">
                        <div class="sfq-visitors-countries-header">
                            <h3><?php _e('Estadísticas Detalladas por País', 'smart-forms-quiz'); ?></h3>
                            <div class="sfq-visitors-countries-controls">
                                <button class="button" id="sfq-refresh-visitors-data">
                                    <span class="dashicons dashicons-update"></span>
                                    <?php _e('Actualizar', 'smart-forms-quiz'); ?>
                                </button>
                                <button class="button button-primary" id="sfq-export-visitors-data">
                                    <span class="dashicons dashicons-download"></span>
                                    <?php _e('Exportar CSV', 'smart-forms-quiz'); ?>
                                </button>
                            </div>
                        </div>
                        
                        <div class="sfq-visitors-table-container">
                            <table class="wp-list-table widefat fixed striped">
                                <thead>
                                    <tr>
                                        <th><?php _e('País', 'smart-forms-quiz'); ?></th>
                                        <th><?php _e('Visitantes Únicos', 'smart-forms-quiz'); ?></th>
                                        <th><?php _e('Total Visitas', 'smart-forms-quiz'); ?></th>
                                        <th><?php _e('Clics Únicos', 'smart-forms-quiz'); ?></th>
                                        <th><?php _e('Total Clics', 'smart-forms-quiz'); ?></th>
                                        <th><?php _e('Tasa de Conversión', 'smart-forms-quiz'); ?></th>
                                        <th><?php _e('% del Total', 'smart-forms-quiz'); ?></th>
                                    </tr>
                                </thead>
                                <tbody id="sfq-visitors-countries-tbody">
                                    <tr>
                                        <td colspan="7" class="sfq-loading-cell">
                                            <div class="sfq-loading-spinner"></div>
                                            <?php _e('Cargando datos de visitantes...', 'smart-forms-quiz'); ?>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <!-- Estadísticas de botones y URLs -->
                    <div class="sfq-button-stats-section">
                        <div class="sfq-button-stats-header">
                            <h3><?php _e('Estadísticas de Botones y URLs', 'smart-forms-quiz'); ?></h3>
                            <div class="sfq-button-stats-info">
                                <span class="dashicons dashicons-info"></span>
                                <div class="sfq-tooltip">
                                    <?php _e('Clics en botones con URLs del formulario', 'smart-forms-quiz'); ?>
                                </div>
                            </div>
                        </div>
                        
                        <div class="sfq-button-stats-content" id="sfq-button-stats-content">
                            <div class="sfq-loading-spinner"></div>
                            <p><?php _e('Cargando estadísticas de botones...', 'smart-forms-quiz'); ?></p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tab: Respuestas Individuales -->
            <div class="sfq-tab-content" id="tab-responses">
                <div class="sfq-responses-container">
                    <div class="sfq-responses-filters">
                        <input type="text" id="sfq-search-responses" placeholder="<?php _e('Buscar en respuestas...', 'smart-forms-quiz'); ?>">
                        <select id="sfq-filter-country-responses">
                            <option value=""><?php _e('Todos los países', 'smart-forms-quiz'); ?></option>
                        </select>
                        <button class="button" id="sfq-filter-responses">
                            <?php _e('Filtrar', 'smart-forms-quiz'); ?>
                        </button>
                    </div>
                    
                    <div class="sfq-responses-table">
                        <table class="wp-list-table widefat fixed striped">
                            <thead>
                                <tr>
                                    <th><?php _e('ID', 'smart-forms-quiz'); ?></th>
                                    <th><?php _e('Usuario', 'smart-forms-quiz'); ?></th>
                                    <th><?php _e('País', 'smart-forms-quiz'); ?></th>
                                    <th><?php _e('Fecha', 'smart-forms-quiz'); ?></th>
                                    <th><?php _e('Tiempo', 'smart-forms-quiz'); ?></th>
                                    <th><?php _e('Acciones', 'smart-forms-quiz'); ?></th>
                                </tr>
                            </thead>
                            <tbody id="sfq-responses-tbody">
                                <tr>
                                    <td colspan="6" class="sfq-loading-cell">
                                        <div class="sfq-loading-spinner"></div>
                                        <?php _e('Cargando respuestas...', 'smart-forms-quiz'); ?>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="sfq-responses-pagination" id="sfq-responses-pagination">
                        <!-- Paginación se genera dinámicamente -->
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal para ver respuesta individual -->
        <div id="sfq-response-detail-modal" class="sfq-modal" style="display: none;">
            <div class="sfq-modal-backdrop"></div>
            <div class="sfq-modal-content">
                <div class="sfq-modal-header">
                    <h2><?php _e('Detalle de Respuesta', 'smart-forms-quiz'); ?></h2>
                    <button class="sfq-modal-close">&times;</button>
                </div>
                <div class="sfq-modal-body" id="sfq-response-detail-content">
                    <!-- Contenido se carga dinámicamente -->
                </div>
            </div>
        </div>

        <!-- Hidden form data -->
        <input type="hidden" id="sfq-form-id" value="<?php echo $form_id; ?>">
        <input type="hidden" id="sfq-form-type" value="<?php echo esc_attr($form->type); ?>">
        <?php
    }
    
    /**
     * Obtener estadísticas generales del formulario
     */
    public function get_form_statistics() {
        // Verificar permisos
        if (!current_user_can('manage_smart_forms') && !current_user_can('manage_options')) {
            wp_send_json_error(__('No tienes permisos', 'smart-forms-quiz'));
            return;
        }
        
        // Verificar nonce
        if (!check_ajax_referer('sfq_nonce', 'nonce', false)) {
            wp_send_json_error(__('Error de seguridad', 'smart-forms-quiz'));
            return;
        }
        
        $form_id = intval($_POST['form_id'] ?? 0);
        $period = sanitize_text_field($_POST['period'] ?? 'all');
        $date_from = sanitize_text_field($_POST['date_from'] ?? '');
        $date_to = sanitize_text_field($_POST['date_to'] ?? '');
        
        if (!$form_id) {
            wp_send_json_error(__('ID de formulario inválido', 'smart-forms-quiz'));
            return;
        }
        
        // Construir condición de fecha
        $date_condition = $this->build_date_condition($period, $date_from, $date_to);
        
        try {
            // Verificar que el formulario existe y tiene datos
            $form_verification = $this->verify_form_data($form_id);
            
            // Obtener estadísticas generales
            $stats = $this->calculate_form_stats($form_id, $date_condition);
            
            // Obtener estadísticas por pregunta
            $questions_stats = $this->calculate_questions_stats($form_id, $date_condition);
            
            // Obtener timeline
            $timeline = $this->get_timeline_data($form_id, $date_condition);
            
            wp_send_json_success(array(
                'general' => $stats,
                'questions' => $questions_stats,
                'timeline' => $timeline
            ));
        } catch (Exception $e) {
            error_log('SFQ Statistics Error: ' . $e->getMessage());
            wp_send_json_error('Error al obtener estadísticas: ' . $e->getMessage());
        }
    }
    
    /**
     * Calcular estadísticas generales del formulario (MEJORADO CON VISTAS DE BOTONES)
     */
    private function calculate_form_stats($form_id, $date_condition) {
        global $wpdb;
        
        // ✅ NUEVO: Usar el sistema de vistas de botones para obtener estadísticas precisas
        if (class_exists('SFQ_Button_Views')) {
            $button_views = new SFQ_Button_Views();
            $quick_stats = $button_views->get_form_quick_stats($form_id);
            
            // Usar las estadísticas del nuevo sistema
            $total_responses = $quick_stats['total_responses'];
            $unique_clicks = $quick_stats['unique_clicks'];
            $conversion_rate = $quick_stats['click_rate'];
        } else {
            // Fallback al sistema anterior
            $base_query = "SELECT COUNT(*) FROM {$wpdb->prefix}sfq_submissions WHERE form_id = %d";
            $query_params = [$form_id];
            
            if (!empty($date_condition['params'])) {
                $base_query .= " AND status = 'completed' {$date_condition['where']}";
                $query_params = array_merge($query_params, $date_condition['params']);
            } else {
                $base_query .= " AND status = 'completed'";
            }
            
            $total_responses = $wpdb->get_var($wpdb->prepare($base_query, $query_params));
            $unique_clicks = 0;
            $conversion_rate = 0;
        }
        
        // Total de vistas (mantener lógica existente para compatibilidad)
        $analytics_table = $wpdb->prefix . 'sfq_analytics';
        $table_exists = $wpdb->get_var("SHOW TABLES LIKE '$analytics_table'") === $analytics_table;
        
        $total_views = 0;
        if ($table_exists) {
            $analytics_query = "SELECT COUNT(DISTINCT session_id) FROM {$wpdb->prefix}sfq_analytics 
                               WHERE form_id = %d AND event_type = 'view'";
            $analytics_params = [$form_id];
            
            if (!empty($date_condition['params'])) {
                $analytics_date_condition = str_replace('completed_at', 'created_at', $date_condition['where']);
                $analytics_query .= $analytics_date_condition;
                $analytics_params = array_merge($analytics_params, $date_condition['params']);
            }
            
            $total_views = $wpdb->get_var($wpdb->prepare($analytics_query, $analytics_params));
        }
        
        // Si no hay vistas en analytics, usar total_responses del nuevo sistema
        if ($total_views == 0 && $total_responses > 0) {
            $total_views = $total_responses;
        }
        
        // Tiempo promedio - construir consulta de forma más robusta
        $avg_time_query = "SELECT AVG(time_spent) FROM {$wpdb->prefix}sfq_submissions 
                          WHERE form_id = %d AND status = 'completed' AND time_spent > 0";
        $avg_time_params = [$form_id];
        
        if (!empty($date_condition['params'])) {
            $avg_time_query .= $date_condition['where'];
            $avg_time_params = array_merge($avg_time_params, $date_condition['params']);
        }
        
        $avg_time = $wpdb->get_var($wpdb->prepare($avg_time_query, $avg_time_params));
        
        // Países únicos - usar la misma lógica que get_countries_distribution para consistencia
        $countries_count = $this->get_valid_countries_count($form_id, $date_condition);
        
        // ✅ NUEVO: Obtener conteo de respuestas parciales
        $partial_responses_count = $this->get_partial_responses_count($form_id, $date_condition);
        
        return array(
            'total_responses' => intval($total_responses),
            'total_views' => intval($total_views),
            'completion_rate' => $conversion_rate,
            'avg_time' => $this->format_time(intval($avg_time)),
            'avg_time_seconds' => intval($avg_time),
            'countries_count' => intval($countries_count),
            'partial_responses' => intval($partial_responses_count)
        );
    }
    
    /**
     * Calcular estadísticas por pregunta (MEJORADO)
     */
    private function calculate_questions_stats($form_id, $date_condition) {
        global $wpdb;
        
        // Obtener todas las preguntas del formulario
        $questions = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}sfq_questions WHERE form_id = %d ORDER BY order_position ASC",
            $form_id
        ));
        
        if (empty($questions)) {
            return array();
        }
        
        $questions_stats = array();
        
        foreach ($questions as $question) {
            // Construir consulta usando LEFT JOIN como en submissions (más inclusivo)
            $base_query = "SELECT r.answer, COUNT(*) as count 
                          FROM {$wpdb->prefix}sfq_responses r
                          LEFT JOIN {$wpdb->prefix}sfq_submissions s ON r.submission_id = s.id
                          WHERE r.question_id = %d AND s.form_id = %d";
            
            $query_params = array($question->id, $form_id);
            
            // Añadir condiciones de fecha si existen
            if (!empty($date_condition['params'])) {
                $base_query .= " AND s.status = 'completed' {$date_condition['where']}";
                $query_params = array_merge($query_params, $date_condition['params']);
            } else {
                $base_query .= " AND s.status = 'completed'";
            }
            
            $base_query .= " GROUP BY r.answer ORDER BY count DESC";
            
            // Obtener todas las respuestas para esta pregunta
            $responses = $wpdb->get_results($wpdb->prepare($base_query, $query_params));
            
            // Total de respuestas para esta pregunta
            $total_responses = array_sum(array_column($responses, 'count'));
            
            // Procesar opciones según el tipo de pregunta
            $options_stats = array();
            
            if (in_array($question->question_type, ['single_choice', 'multiple_choice', 'image_choice'])) {
                // Para preguntas con opciones predefinidas
                $options = json_decode($question->options, true);
                
                if (is_array($options)) {
                    // Contar el número único de submissions que respondieron esta pregunta
                    $unique_submissions = $wpdb->get_var($wpdb->prepare(
                        "SELECT COUNT(DISTINCT r.submission_id) 
                        FROM {$wpdb->prefix}sfq_responses r
                        LEFT JOIN {$wpdb->prefix}sfq_submissions s ON r.submission_id = s.id
                        WHERE r.question_id = %d AND s.form_id = %d AND s.status = 'completed'" . 
                        (!empty($date_condition['params']) ? $date_condition['where'] : ''),
                        array_merge([$question->id, $form_id], $date_condition['params'] ?? [])
                    ));
                    
                    // CORREGIDO COMPLETAMENTE: Usar el denominador correcto según el tipo de pregunta
                    // - Single choice: usar unique_submissions (número de personas que respondieron)
                    // - Multiple choice: usar unique_submissions (número de personas que respondieron) 
                    // - Image choice: usar unique_submissions (número de personas que respondieron)
                    $total_for_percentage = $unique_submissions;
                    
                    foreach ($options as $option) {
                        $option_text = is_array($option) ? ($option['text'] ?? $option['label'] ?? $option) : $option;
                        $count = 0;
                        
                        // Buscar cuántas veces se seleccionó esta opción
                        foreach ($responses as $response) {
                            // Para multiple choice, la respuesta puede ser un array JSON
                            $answer = json_decode($response->answer, true);
                            if (is_array($answer)) {
                                if (in_array($option_text, $answer)) {
                                    $count += $response->count;
                                }
                            } else if ($response->answer == $option_text) {
                                $count = $response->count;
                            }
                        }
                        
                        // CORREGIDO COMPLETAMENTE: Calcular porcentaje usando unique_submissions para todos los tipos con opciones
                        $percentage = $total_for_percentage > 0 ? round(($count / $total_for_percentage) * 100, 1) : 0;
                        
                        // CORREGIDO: Obtener datos de países para todas las preguntas con opciones
                        $countries_data = $this->get_countries_for_option($question->id, $option_text, $date_condition);
                        
                        $options_stats[] = array(
                            'option' => $option_text,
                            'count' => $count,
                            'percentage' => $percentage,
                            'countries_data' => $countries_data
                        );
                    }
                }
            } else if ($question->question_type == 'rating') {
                // Para preguntas de valoración - usar unique submissions también
                $max_rating = intval($question->max_rating ?? 5);
                
                // Contar unique submissions para rating también
                $unique_submissions = $wpdb->get_var($wpdb->prepare(
                    "SELECT COUNT(DISTINCT r.submission_id) 
                    FROM {$wpdb->prefix}sfq_responses r
                    LEFT JOIN {$wpdb->prefix}sfq_submissions s ON r.submission_id = s.id
                    WHERE r.question_id = %d AND s.form_id = %d AND s.status = 'completed'" . 
                    (!empty($date_condition['params']) ? $date_condition['where'] : ''),
                    array_merge([$question->id, $form_id], $date_condition['params'] ?? [])
                ));
                
                for ($i = 1; $i <= $max_rating; $i++) {
                    $count = 0;
                    foreach ($responses as $response) {
                        if ($response->answer == $i) {
                            $count = $response->count;
                            break;
                        }
                    }
                    
                    // CORREGIDO: Usar unique_submissions para rating también
                    $percentage = $unique_submissions > 0 ? round(($count / $unique_submissions) * 100, 1) : 0;
                    
                    // CORREGIDO: Obtener datos de países para rating también
                    $countries_data = $this->get_countries_for_option($question->id, $i, $date_condition);
                    
                    $options_stats[] = array(
                        'option' => $i . ' ' . str_repeat('⭐', $i),
                        'count' => $count,
                        'percentage' => $percentage,
                        'countries_data' => $countries_data
                    );
                }
            } else if ($question->question_type === 'freestyle') {
                // NUEVO: Procesar preguntas freestyle
                $freestyle_stats = $this->calculate_freestyle_stats($question, $form_id, $date_condition);
                $questions_stats[] = $freestyle_stats;
                continue; // Saltar procesamiento normal
            } else {
                // Para preguntas de texto, email, etc.
                // Contar unique submissions para estos tipos también
                $unique_submissions = $wpdb->get_var($wpdb->prepare(
                    "SELECT COUNT(DISTINCT r.submission_id) 
                    FROM {$wpdb->prefix}sfq_responses r
                    LEFT JOIN {$wpdb->prefix}sfq_submissions s ON r.submission_id = s.id
                    WHERE r.question_id = %d AND s.form_id = %d AND s.status = 'completed'" . 
                    (!empty($date_condition['params']) ? $date_condition['where'] : ''),
                    array_merge([$question->id, $form_id], $date_condition['params'] ?? [])
                ));
                
                // Mostrar las respuestas más comunes
                foreach ($responses as $response) {
                    if (count($options_stats) >= 10) break; // Limitar a 10 respuestas más comunes
                    
                    // CORREGIDO: Usar unique_submissions para texto también
                    $percentage = $unique_submissions > 0 ? round(($response->count / $unique_submissions) * 100, 1) : 0;
                    
                    // CORREGIDO: Obtener datos de países para preguntas de texto también
                    $countries_data = $this->get_countries_for_option($question->id, $response->answer, $date_condition);
                    
                    $options_stats[] = array(
                        'option' => substr($response->answer, 0, 50) . (strlen($response->answer) > 50 ? '...' : ''),
                        'count' => $response->count,
                        'percentage' => $percentage,
                        'countries_data' => $countries_data
                    );
                }
            }
            
            // CORREGIDO: Verificar y ajustar porcentajes para que sumen exactamente 100%
            if ($total_responses > 0 && !empty($options_stats)) {
                $total_percentage = array_sum(array_column($options_stats, 'percentage'));
                
                // Si hay diferencia debido al redondeo, ajustar la opción con más respuestas
                if ($total_percentage != 100.0 && abs($total_percentage - 100.0) <= 2.0) {
                    // Encontrar la opción con más respuestas
                    $max_count = 0;
                    $max_index = 0;
                    foreach ($options_stats as $index => $option) {
                        if ($option['count'] > $max_count) {
                            $max_count = $option['count'];
                            $max_index = $index;
                        }
                    }
                    
                    // Ajustar el porcentaje
                    $options_stats[$max_index]['percentage'] += (100.0 - $total_percentage);
                    $options_stats[$max_index]['percentage'] = round($options_stats[$max_index]['percentage'], 1);
                }
            }
            
            // Ordenar por cantidad descendente
            usort($options_stats, function($a, $b) {
                return $b['count'] - $a['count'];
            });
            
            $questions_stats[] = array(
                'question_id' => $question->id,
                'question_text' => $question->question_text,
                'question_type' => $question->question_type,
                'total_responses' => $total_responses,
                'options' => $options_stats
            );
        }
        
        return $questions_stats;
    }
    
    /**
     * Obtener estadísticas por país
     */
    public function get_form_country_stats() {
        // Verificar permisos
        if (!current_user_can('manage_smart_forms') && !current_user_can('manage_options')) {
            wp_send_json_error(__('No tienes permisos', 'smart-forms-quiz'));
            return;
        }
        
        // Verificar nonce
        if (!check_ajax_referer('sfq_nonce', 'nonce', false)) {
            wp_send_json_error(__('Error de seguridad', 'smart-forms-quiz'));
            return;
        }
        
        $form_id = intval($_POST['form_id'] ?? 0);
        $period = sanitize_text_field($_POST['period'] ?? 'all');
        $date_from = sanitize_text_field($_POST['date_from'] ?? '');
        $date_to = sanitize_text_field($_POST['date_to'] ?? '');
        $country_code = sanitize_text_field($_POST['country_code'] ?? '');
        
        if (!$form_id) {
            wp_send_json_error(__('ID de formulario inválido', 'smart-forms-quiz'));
            return;
        }
        
        $date_condition = $this->build_date_condition($period, $date_from, $date_to);
        
        if ($country_code) {
            // Obtener estadísticas de un país específico
            $country_stats = $this->get_country_specific_stats($form_id, $country_code, $date_condition);
            wp_send_json_success($country_stats);
        } else {
            // Obtener estadísticas generales por país
            $countries_data = $this->get_countries_distribution($form_id, $date_condition);
            wp_send_json_success($countries_data);
        }
    }
    
    /**
     * Obtener distribución de respuestas por país
     */
    private function get_countries_distribution($form_id, $date_condition) {
        global $wpdb;
        
        // Obtener todas las IPs únicas con sus conteos
        $submissions = $wpdb->get_results($wpdb->prepare(
            "SELECT user_ip, COUNT(*) as count 
            FROM {$wpdb->prefix}sfq_submissions 
            WHERE form_id = %d 
            AND status = 'completed' 
            AND user_ip IS NOT NULL 
            AND user_ip != '' 
            {$date_condition['where']}
            GROUP BY user_ip",
            array_merge([$form_id], $date_condition['params'])
        ));
        
        if (empty($submissions)) {
            return array('countries' => array(), 'total' => 0);
        }
        
        // Usar la clase de submissions para obtener información de países
        if (class_exists('SFQ_Admin_Submissions')) {
            $submissions_handler = new SFQ_Admin_Submissions();
            
            // Usar reflection para acceder al método privado (temporal)
            $reflection = new ReflectionClass($submissions_handler);
            $method = $reflection->getMethod('get_countries_info_batch');
            $method->setAccessible(true);
            
            $countries_info = $method->invoke($submissions_handler, array_column($submissions, 'user_ip'));
        } else {
            $countries_info = array();
        }
        
        $countries_count = array();
        $total_responses = 0;
        
        foreach ($submissions as $submission) {
            $country_info = $countries_info[$submission->user_ip] ?? null;
            
            if ($country_info && $country_info['country_code'] !== 'XX') {
                $country_key = $country_info['country_code'];
                
                if (!isset($countries_count[$country_key])) {
                    $countries_count[$country_key] = array(
                        'country_code' => $country_info['country_code'],
                        'country_name' => $country_info['country_name'],
                        'flag_emoji' => $country_info['flag_emoji'],
                        'count' => 0,
                        'percentage' => 0
                    );
                }
                
                $countries_count[$country_key]['count'] += intval($submission->count);
                $total_responses += intval($submission->count);
            }
        }
        
        // Calcular porcentajes - CORREGIDO: Asegurar que los porcentajes sumen 100%
        foreach ($countries_count as &$country) {
            if ($total_responses > 0) {
                $country['percentage'] = round(($country['count'] / $total_responses) * 100, 1);
            } else {
                $country['percentage'] = 0;
            }
        }
        
        // Verificar y ajustar porcentajes para que sumen exactamente 100%
        if ($total_responses > 0 && !empty($countries_count)) {
            $total_percentage = array_sum(array_column($countries_count, 'percentage'));
            
            // Si hay diferencia debido al redondeo, ajustar el país con más respuestas
            if ($total_percentage != 100.0 && abs($total_percentage - 100.0) <= 1.0) {
                $max_country_key = array_keys($countries_count)[0]; // El primero ya está ordenado por cantidad
                $countries_count[$max_country_key]['percentage'] += (100.0 - $total_percentage);
                $countries_count[$max_country_key]['percentage'] = round($countries_count[$max_country_key]['percentage'], 1);
            }
        }
        
        // Ordenar por cantidad
        uasort($countries_count, function($a, $b) {
            return $b['count'] - $a['count'];
        });
        
        return array(
            'countries' => array_values($countries_count),
            'total' => $total_responses
        );
    }
    
    /**
     * Obtener estadísticas específicas de un país
     */
    private function get_country_specific_stats($form_id, $country_code, $date_condition) {
        global $wpdb;
        
        // Obtener todas las submissions de este país
        $submissions_ids = $wpdb->get_col($wpdb->prepare(
            "SELECT s.id 
            FROM {$wpdb->prefix}sfq_submissions s
            WHERE s.form_id = %d 
            AND s.status = 'completed' 
            AND s.user_ip IN (
                SELECT DISTINCT user_ip 
                FROM {$wpdb->prefix}sfq_submissions 
                WHERE form_id = %d
            )
            {$date_condition['where']}",
            array_merge([$form_id, $form_id], $date_condition['params'])
        ));
        
        if (empty($submissions_ids)) {
            return array('questions' => array());
        }
        
        // Obtener estadísticas por pregunta para este país
        $questions = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}sfq_questions 
            WHERE form_id = %d 
            ORDER BY order_position ASC",
            $form_id
        ));
        
        $country_questions_stats = array();
        
        foreach ($questions as $question) {
            // Obtener respuestas de este país para esta pregunta
            $placeholders = implode(',', array_fill(0, count($submissions_ids), '%d'));
            $responses = $wpdb->get_results($wpdb->prepare(
                "SELECT r.answer, COUNT(*) as count 
                FROM {$wpdb->prefix}sfq_responses r
                WHERE r.question_id = %d 
                AND r.submission_id IN ($placeholders)
                GROUP BY r.answer
                ORDER BY count DESC",
                array_merge([$question->id], $submissions_ids)
            ));
            
            $total_responses = array_sum(array_column($responses, 'count'));
            $options_stats = array();
            
            // Procesar según tipo de pregunta
            if (in_array($question->question_type, ['single_choice', 'multiple_choice'])) {
                $options = json_decode($question->options, true);
                if (is_array($options)) {
                    foreach ($options as $option) {
                        $option_text = is_array($option) ? ($option['text'] ?? $option) : $option;
                        $count = 0;
                        
                        foreach ($responses as $response) {
                            if ($response->answer == $option_text) {
                                $count = $response->count;
                                break;
                            }
                        }
                        
                        $percentage = $total_responses > 0 ? round(($count / $total_responses) * 100, 1) : 0;
                        $options_stats[] = array(
                            'option' => $option_text,
                            'count' => $count,
                            'percentage' => $percentage
                        );
                    }
                }
            }
            
            $country_questions_stats[] = array(
                'question_text' => $question->question_text,
                'question_type' => $question->question_type,
                'total_responses' => $total_responses,
                'options' => $options_stats
            );
        }
        
        return array('questions' => $country_questions_stats);
    }
    
    /**
     * Obtener datos de timeline
     */
    private function get_timeline_data($form_id, $date_condition) {
        global $wpdb;
        
        // Obtener respuestas por día
        $daily_data = $wpdb->get_results($wpdb->prepare(
            "SELECT DATE(completed_at) as date, COUNT(*) as count 
            FROM {$wpdb->prefix}sfq_submissions 
            WHERE form_id = %d 
            AND status = 'completed' 
            {$date_condition['where']}
            GROUP BY DATE(completed_at) 
            ORDER BY date ASC",
            array_merge([$form_id], $date_condition['params'])
        ));
        
        // Calcular estadísticas
        $total_days = count($daily_data);
        $total_responses = array_sum(array_column($daily_data, 'count'));
        $daily_avg = $total_days > 0 ? round($total_responses / $total_days, 1) : 0;
        
        // Encontrar mejor día
        $best_day = array('date' => '', 'count' => 0);
        foreach ($daily_data as $day) {
            if ($day->count > $best_day['count']) {
                $best_day = array(
                    'date' => $day->date,
                    'count' => $day->count
                );
            }
        }
        
        // Calcular tendencia (comparar primera mitad vs segunda mitad)
        $trend = 'stable';
        if ($total_days > 7) {
            $half = floor($total_days / 2);
            $first_half = array_slice($daily_data, 0, $half);
            $second_half = array_slice($daily_data, $half);
            
            $first_half_avg = array_sum(array_column($first_half, 'count')) / count($first_half);
            $second_half_avg = array_sum(array_column($second_half, 'count')) / count($second_half);
            
            if ($second_half_avg > $first_half_avg * 1.2) {
                $trend = 'increasing';
            } else if ($second_half_avg < $first_half_avg * 0.8) {
                $trend = 'decreasing';
            }
        }
        
        return array(
            'daily_data' => $daily_data,
            'daily_avg' => $daily_avg,
            'best_day' => $best_day,
            'trend' => $trend
        );
    }
    
    /**
     * Construir condición de fecha para consultas
     */
    private function build_date_condition($period, $date_from, $date_to) {
        $where = '';
        $params = array();
        
        switch ($period) {
            case 'today':
                $where = ' AND DATE(completed_at) = %s';
                $params[] = current_time('Y-m-d');
                break;
            case 'week':
                $where = ' AND DATE(completed_at) >= %s';
                $params[] = date('Y-m-d', current_time('timestamp') - (7 * 24 * 60 * 60));
                break;
            case 'month':
                // Usar el primer día del mes actual para obtener exactamente el último mes
                $where = ' AND DATE(completed_at) >= %s';
                $first_day_current_month = date('Y-m-01', current_time('timestamp'));
                $first_day_last_month = date('Y-m-d', strtotime($first_day_current_month . ' -1 month'));
                $params[] = $first_day_last_month;
                break;
            case 'year':
                $where = ' AND DATE(completed_at) >= %s';
                $params[] = date('Y-m-d', current_time('timestamp') - (365 * 24 * 60 * 60));
                break;
            case 'custom':
                if ($date_from) {
                    $where .= ' AND DATE(completed_at) >= %s';
                    $params[] = $date_from;
                }
                if ($date_to) {
                    $where .= ' AND DATE(completed_at) <= %s';
                    $params[] = $date_to;
                }
                break;
        }
        
        return array('where' => $where, 'params' => $params);
    }
    
    /**
     * Exportar estadísticas del formulario
     */
    public function export_form_statistics() {
        // Verificar permisos
        if (!current_user_can('manage_smart_forms') && !current_user_can('manage_options')) {
            wp_send_json_error(__('No tienes permisos', 'smart-forms-quiz'));
            return;
        }
        
        // Verificar nonce
        if (!check_ajax_referer('sfq_nonce', 'nonce', false)) {
            wp_send_json_error(__('Error de seguridad', 'smart-forms-quiz'));
            return;
        }
        
        $form_id = intval($_POST['form_id'] ?? 0);
        $period = sanitize_text_field($_POST['period'] ?? 'all');
        
        if (!$form_id) {
            wp_send_json_error(__('ID de formulario inválido', 'smart-forms-quiz'));
            return;
        }
        
        // Obtener datos
        $date_condition = $this->build_date_condition($period, '', '');
        $stats = $this->calculate_form_stats($form_id, $date_condition);
        $questions_stats = $this->calculate_questions_stats($form_id, $date_condition);
        
        // Crear CSV
        $upload_dir = wp_upload_dir();
        $filename = 'form_statistics_' . $form_id . '_' . date('Y-m-d_H-i-s') . '.csv';
        $filepath = $upload_dir['path'] . '/' . $filename;
        
        $file = fopen($filepath, 'w');
        
        // Escribir resumen general
        fputcsv($file, array('RESUMEN GENERAL'));
        fputcsv($file, array('Total Respuestas', $stats['total_responses']));
        fputcsv($file, array('Tasa de Completado', $stats['completion_rate'] . '%'));
        fputcsv($file, array('Tiempo Promedio', $stats['avg_time']));
        fputcsv($file, array('Países', $stats['countries_count']));
        fputcsv($file, array(''));
        
        // Escribir estadísticas por pregunta
        fputcsv($file, array('ESTADÍSTICAS POR PREGUNTA'));
        foreach ($questions_stats as $question) {
            fputcsv($file, array(''));
            fputcsv($file, array('Pregunta:', $question['question_text']));
            fputcsv($file, array('Total Respuestas:', $question['total_responses']));
            fputcsv($file, array('Opción', 'Cantidad', 'Porcentaje'));
            
            foreach ($question['options'] as $option) {
                fputcsv($file, array(
                    $option['option'],
                    $option['count'],
                    $option['percentage'] . '%'
                ));
            }
        }
        
        fclose($file);
        
        wp_send_json_success(array(
            'file_url' => $upload_dir['url'] . '/' . $filename,
            'message' => __('Estadísticas exportadas correctamente', 'smart-forms-quiz')
        ));
    }
    
    /**
     * Verificar datos del formulario para debugging
     */
    private function verify_form_data($form_id) {
        global $wpdb;
        
        $verification = array();
        
        // Verificar que el formulario existe
        $form_exists = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$wpdb->prefix}sfq_forms WHERE id = %d",
            $form_id
        ));
        $verification['form_exists'] = intval($form_exists) > 0;
        
        // Contar preguntas
        $questions_count = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$wpdb->prefix}sfq_questions WHERE form_id = %d",
            $form_id
        ));
        $verification['questions_count'] = intval($questions_count);
        
        // Contar submissions totales
        $total_submissions = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$wpdb->prefix}sfq_submissions WHERE form_id = %d",
            $form_id
        ));
        $verification['total_submissions'] = intval($total_submissions);
        
        // Contar submissions completadas
        $completed_submissions = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$wpdb->prefix}sfq_submissions WHERE form_id = %d AND status = 'completed'",
            $form_id
        ));
        $verification['completed_submissions'] = intval($completed_submissions);
        
        // Contar respuestas totales
        $total_responses = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$wpdb->prefix}sfq_responses r 
            INNER JOIN {$wpdb->prefix}sfq_submissions s ON r.submission_id = s.id 
            WHERE s.form_id = %d",
            $form_id
        ));
        $verification['total_responses'] = intval($total_responses);
        
        // Verificar estructura de tablas
        $tables_exist = array();
        $required_tables = array('sfq_forms', 'sfq_questions', 'sfq_submissions', 'sfq_responses');
        
        foreach ($required_tables as $table) {
            $table_name = $wpdb->prefix . $table;
            $exists = $wpdb->get_var("SHOW TABLES LIKE '$table_name'") === $table_name;
            $tables_exist[$table] = $exists;
        }
        $verification['tables_exist'] = $tables_exist;
        
        return $verification;
    }
    
    /**
     * Obtener distribución de países para una opción específica
     */
    private function get_countries_for_option($question_id, $option_text, $date_condition) {
        global $wpdb;
        
        // Obtener todas las submissions que respondieron esta opción específica
        $base_query = "SELECT DISTINCT s.user_ip, COUNT(*) as count
                      FROM {$wpdb->prefix}sfq_responses r
                      LEFT JOIN {$wpdb->prefix}sfq_submissions s ON r.submission_id = s.id
                      WHERE r.question_id = %d 
                      AND s.status = 'completed'
                      AND s.user_ip IS NOT NULL 
                      AND s.user_ip != ''
                      AND (r.answer = %s OR r.answer LIKE %s)";
        
        $query_params = array($question_id, $option_text, '%"' . $option_text . '"%');
        
        // Añadir condiciones de fecha si existen
        if (!empty($date_condition['params'])) {
            $base_query .= $date_condition['where'];
            $query_params = array_merge($query_params, $date_condition['params']);
        }
        
        $base_query .= " GROUP BY s.user_ip";
        
        $submissions = $wpdb->get_results($wpdb->prepare($base_query, $query_params));
        
        if (empty($submissions)) {
            return array();
        }
        
        // Obtener información de países para todas las IPs
        if (class_exists('SFQ_Admin_Submissions')) {
            $submissions_handler = new SFQ_Admin_Submissions();
            
            // Usar reflection para acceder al método privado
            $reflection = new ReflectionClass($submissions_handler);
            $method = $reflection->getMethod('get_countries_info_batch');
            $method->setAccessible(true);
            
            $countries_info = $method->invoke($submissions_handler, array_column($submissions, 'user_ip'));
        } else {
            return array();
        }
        
        $countries_count = array();
        $total_responses = 0;
        
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
                $total_responses += intval($submission->count);
            }
        }
        
        // Calcular porcentajes y ordenar
        foreach ($countries_count as &$country) {
            $country['percentage'] = $total_responses > 0 ? 
                round(($country['count'] / $total_responses) * 100, 1) : 0;
        }
        
        // Ordenar por cantidad descendente y limitar a top 5
        uasort($countries_count, function($a, $b) {
            return $b['count'] - $a['count'];
        });
        
        return array_slice(array_values($countries_count), 0, 5);
    }
    
    /**
     * Obtener conteo de países válidos (consistente con get_countries_distribution)
     */
    private function get_valid_countries_count($form_id, $date_condition) {
        global $wpdb;
        
        // Obtener todas las IPs únicas
        $submissions = $wpdb->get_results($wpdb->prepare(
            "SELECT DISTINCT user_ip 
            FROM {$wpdb->prefix}sfq_submissions 
            WHERE form_id = %d 
            AND status = 'completed' 
            AND user_ip IS NOT NULL 
            AND user_ip != '' 
            {$date_condition['where']}",
            array_merge([$form_id], $date_condition['params'])
        ));
        
        if (empty($submissions)) {
            return 0;
        }
        
        // Usar la clase de submissions para obtener información de países
        if (class_exists('SFQ_Admin_Submissions')) {
            $submissions_handler = new SFQ_Admin_Submissions();
            
            // Usar reflection para acceder al método privado (temporal)
            $reflection = new ReflectionClass($submissions_handler);
            $method = $reflection->getMethod('get_countries_info_batch');
            $method->setAccessible(true);
            
            $countries_info = $method->invoke($submissions_handler, array_column($submissions, 'user_ip'));
        } else {
            // Si no hay clase de submissions, usar conteo simple de IPs
            return count($submissions);
        }
        
        $valid_countries = array();
        
        // Contar solo países válidos (no 'XX')
        foreach ($submissions as $submission) {
            $country_info = $countries_info[$submission->user_ip] ?? null;
            
            if ($country_info && $country_info['country_code'] !== 'XX') {
                $valid_countries[$country_info['country_code']] = true;
            }
        }
        
        return count($valid_countries);
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
     * Calcular estadísticas para preguntas freestyle
     */
    private function calculate_freestyle_stats($question, $form_id, $date_condition) {
        // Obtener elementos freestyle de la pregunta
        $freestyle_elements = json_decode($question->options, true) ?: [];
        
        // Obtener todas las respuestas para esta pregunta
        $responses = $this->get_freestyle_responses($question->id, $form_id, $date_condition);
        
        $elements_stats = [];
        
        foreach ($freestyle_elements as $element) {
            $element_stats = $this->process_freestyle_element(
                $element, 
                $responses, 
                $date_condition
            );
            $elements_stats[] = $element_stats;
        }
        
        return [
            'question_id' => $question->id,
            'question_text' => $question->question_text,
            'question_type' => 'freestyle',
            'total_responses' => count($responses),
            'elements' => $elements_stats
        ];
    }
    
    /**
     * Obtener respuestas freestyle con datos de país
     */
    private function get_freestyle_responses($question_id, $form_id, $date_condition) {
        global $wpdb;
        
        $query = "SELECT r.answer, s.user_ip, s.id as submission_id
                  FROM {$wpdb->prefix}sfq_responses r
                  LEFT JOIN {$wpdb->prefix}sfq_submissions s ON r.submission_id = s.id
                  WHERE r.question_id = %d 
                  AND s.form_id = %d 
                  AND s.status = 'completed'";
        
        $params = [$question_id, $form_id];
        
        if (!empty($date_condition['params'])) {
            $query .= $date_condition['where'];
            $params = array_merge($params, $date_condition['params']);
        }
        
        return $wpdb->get_results($wpdb->prepare($query, $params));
    }
    
    /**
     * Procesar estadísticas de un elemento freestyle específico
     */
    private function process_freestyle_element($element, $responses, $date_condition) {
        $element_id = $element['id'];
        $element_type = $element['type'];
        $element_label = $element['label'] ?? 'Sin etiqueta';
        
        // Extraer respuestas para este elemento específico
        $element_responses = [];
        foreach ($responses as $response) {
            $answer_data = json_decode($response->answer, true);
            if (isset($answer_data[$element_id])) {
                $element_responses[] = [
                    'value' => $answer_data[$element_id],
                    'user_ip' => $response->user_ip,
                    'submission_id' => $response->submission_id
                ];
            }
        }
        
        // Procesar según tipo de elemento
        switch ($element_type) {
            case 'text':
            case 'email':
            case 'phone':
                return $this->process_text_element($element, $element_responses, $date_condition);
                
            case 'rating':
                return $this->process_rating_element($element, $element_responses, $date_condition);
                
            case 'dropdown':
                return $this->process_dropdown_element($element, $element_responses, $date_condition);
                
            case 'checkbox':
                return $this->process_checkbox_element($element, $element_responses, $date_condition);
                
            case 'button':
            case 'image':
                return $this->process_interaction_element($element, $element_responses, $date_condition);
                
            case 'file_upload':
                return $this->process_file_element($element, $element_responses, $date_condition);
                
            case 'countdown':
                return $this->process_countdown_element($element, $element_responses, $date_condition);
                
            case 'legal_text':
                return $this->process_legal_element($element, $element_responses, $date_condition);
                
            default:
                return $this->process_generic_element($element, $element_responses, $date_condition);
        }
    }
    
    /**
     * Procesar elementos de texto (text, email, phone)
     */
    private function process_text_element($element, $element_responses, $date_condition = null) {
        $total_responses = count($element_responses);
        $values = array_column($element_responses, 'value');
        $values = array_filter($values, function($v) { return !empty(trim($v)); });
        
        // Contar valores únicos
        $unique_values = array_unique($values);
        $unique_count = count($unique_values);
        
        // Encontrar valores más comunes
        $value_counts = array_count_values($values);
        arsort($value_counts);
        $most_common = [];
        
        $i = 0;
        foreach ($value_counts as $value => $count) {
            if ($i >= 5) break; // Top 5
            $percentage = $total_responses > 0 ? round(($count / $total_responses) * 100, 1) : 0;
            
            // Obtener datos de países para este valor específico
            $countries_data = $this->get_countries_for_freestyle_element_value(
                $element['id'], 
                $value, 
                $element_responses
            );
            
            $most_common[] = [
                'value' => substr($value, 0, 50) . (strlen($value) > 50 ? '...' : ''),
                'count' => $count,
                'percentage' => $percentage,
                'countries_data' => $countries_data
            ];
            $i++;
        }
        
        // Calcular longitud promedio
        $avg_length = 0;
        if (!empty($values)) {
            $total_length = array_sum(array_map('strlen', $values));
            $avg_length = round($total_length / count($values), 1);
        }
        
        // Análisis específico por tipo
        $specific_stats = [];
        if ($element['type'] === 'email') {
            // Análisis de dominios para emails
            $domains = [];
            foreach ($values as $email) {
                if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    $domain = substr(strrchr($email, "@"), 1);
                    $domains[] = $domain;
                }
            }
            $domain_counts = array_count_values($domains);
            arsort($domain_counts);
            $specific_stats['top_domains'] = array_slice($domain_counts, 0, 5, true);
        }
        
        return [
            'id' => $element['id'],
            'type' => $element['type'],
            'label' => $element['label'],
            'total_responses' => $total_responses,
            'unique_responses' => $unique_count,
            'most_common' => $most_common,
            'avg_length' => $avg_length,
            'specific_stats' => $specific_stats
        ];
    }
    
    /**
     * Procesar elementos de rating
     */
    private function process_rating_element($element, $element_responses) {
        $total_responses = count($element_responses);
        $values = array_map('intval', array_column($element_responses, 'value'));
        $values = array_filter($values, function($v) { return $v > 0; });
        
        $max_rating = intval($element['settings']['max_rating'] ?? 5);
        $rating_type = $element['settings']['rating_type'] ?? 'stars';
        
        // Calcular distribución
        $distribution = [];
        $total_score = 0;
        
        for ($i = 1; $i <= $max_rating; $i++) {
            $count = count(array_filter($values, function($v) use ($i) { return $v == $i; }));
            $percentage = $total_responses > 0 ? round(($count / $total_responses) * 100, 1) : 0;
            
            $distribution[] = [
                'rating' => $i,
                'count' => $count,
                'percentage' => $percentage,
                'label' => $this->get_rating_label($i, $rating_type)
            ];
            
            $total_score += ($i * $count);
        }
        
        // Calcular promedio
        $average = $total_responses > 0 ? round($total_score / $total_responses, 2) : 0;
        
        return [
            'id' => $element['id'],
            'type' => $element['type'],
            'label' => $element['label'],
            'total_responses' => $total_responses,
            'average_rating' => $average,
            'max_rating' => $max_rating,
            'rating_type' => $rating_type,
            'distribution' => $distribution
        ];
    }
    
    /**
     * Procesar elementos dropdown
     */
    private function process_dropdown_element($element, $element_responses, $date_condition = null) {
        $total_responses = count($element_responses);
        $values = array_column($element_responses, 'value');
        $values = array_filter($values, function($v) { return !empty(trim($v)); });
        
        // Obtener opciones configuradas
        $configured_options = $element['settings']['options'] ?? [];
        $option_counts = [];
        
        // Inicializar contadores para todas las opciones configuradas
        foreach ($configured_options as $option) {
            $option_value = is_array($option) ? ($option['value'] ?? $option['text']) : $option;
            $option_counts[$option_value] = 0;
        }
        
        // Contar respuestas
        foreach ($values as $value) {
            if (isset($option_counts[$value])) {
                $option_counts[$value]++;
            } else {
                // Opción no configurada (respuesta libre o error)
                $option_counts[$value] = ($option_counts[$value] ?? 0) + 1;
            }
        }
        
        // Crear distribución
        $distribution = [];
        foreach ($option_counts as $option => $count) {
            $percentage = $total_responses > 0 ? round(($count / $total_responses) * 100, 1) : 0;
            
            // Obtener datos de países para esta opción
            $countries_data = $this->get_countries_for_freestyle_element_value(
                $element['id'], 
                $option, 
                $element_responses
            );
            
            $distribution[] = [
                'option' => $option,
                'count' => $count,
                'percentage' => $percentage,
                'countries_data' => $countries_data
            ];
        }
        
        // Ordenar por cantidad
        usort($distribution, function($a, $b) {
            return $b['count'] - $a['count'];
        });
        
        return [
            'id' => $element['id'],
            'type' => $element['type'],
            'label' => $element['label'],
            'total_responses' => $total_responses,
            'distribution' => $distribution
        ];
    }
    
    /**
     * Procesar elementos checkbox
     */
    private function process_checkbox_element($element, $element_responses) {
        $total_responses = count($element_responses);
        $values = array_column($element_responses, 'value');
        
        $checked_count = 0;
        $unchecked_count = 0;
        
        foreach ($values as $value) {
            if ($value === 'checked' || $value === '1' || $value === true || $value === 'true') {
                $checked_count++;
            } else {
                $unchecked_count++;
            }
        }
        
        $checked_percentage = $total_responses > 0 ? round(($checked_count / $total_responses) * 100, 1) : 0;
        $unchecked_percentage = 100 - $checked_percentage;
        
        return [
            'id' => $element['id'],
            'type' => $element['type'],
            'label' => $element['label'],
            'total_responses' => $total_responses,
            'checked_count' => $checked_count,
            'unchecked_count' => $unchecked_count,
            'checked_percentage' => $checked_percentage,
            'unchecked_percentage' => $unchecked_percentage
        ];
    }
    
    /**
     * Procesar elementos de interacción (button, image)
     */
    private function process_interaction_element($element, $element_responses) {
        global $wpdb;
        
        // Para elementos button, usar el sistema de analytics para obtener vistas únicas
        if ($element['type'] === 'button') {
            // Verificar si existe la tabla de analytics
            $analytics_table = $wpdb->prefix . 'sfq_analytics';
            $table_exists = $wpdb->get_var("SHOW TABLES LIKE '$analytics_table'") === $analytics_table;
            
            if ($table_exists) {
                // Obtener vistas únicas del botón desde sfq_analytics
                $unique_views = $wpdb->get_var($wpdb->prepare(
                    "SELECT COUNT(DISTINCT session_id) FROM {$analytics_table} 
                    WHERE event_type = 'button_view'
                    AND JSON_EXTRACT(event_data, '$.element_id') = %s",
                    $element['id']
                ));
                
                // Obtener clics únicos del botón
                $unique_clicks = $wpdb->get_var($wpdb->prepare(
                    "SELECT COUNT(DISTINCT session_id) FROM {$analytics_table} 
                    WHERE event_type = 'button_click_immediate'
                    AND JSON_EXTRACT(event_data, '$.element_id') = %s",
                    $element['id']
                ));
                
                // Calcular tasa de clics basada en vistas únicas
                $click_rate = $unique_views > 0 ? round(($unique_clicks / $unique_views) * 100, 1) : 0;
                
                return [
                    'id' => $element['id'],
                    'type' => $element['type'],
                    'label' => $element['label'],
                    'total_responses' => intval($unique_views), // Vistas únicas del botón
                    'interaction_count' => intval($unique_clicks),
                    'interaction_rate' => $click_rate,
                    'action_type' => 'clicks'
                ];
            }
        }
        
        // Fallback para elementos que no son button o cuando no hay tabla de analytics
        $total_responses = count($element_responses);
        $values = array_column($element_responses, 'value');
        
        $interaction_count = 0;
        foreach ($values as $value) {
            if ($value === 'clicked' || strpos($value, 'clicked') !== false) {
                $interaction_count++;
            }
        }
        
        $interaction_rate = $total_responses > 0 ? round(($interaction_count / $total_responses) * 100, 1) : 0;
        
        return [
            'id' => $element['id'],
            'type' => $element['type'],
            'label' => $element['label'],
            'total_responses' => $total_responses,
            'interaction_count' => $interaction_count,
            'interaction_rate' => $interaction_rate,
            'action_type' => $element['type'] === 'button' ? 'clicks' : 'views'
        ];
    }
    
    /**
     * ✅ CORREGIDO: Procesar elementos de archivo con manejo mejorado de JSON
     */
    private function process_file_element($element, $element_responses) {
        $total_responses = count($element_responses);
        $values = array_column($element_responses, 'value');
        
        $files_uploaded = 0;
        $file_types = [];
        $total_files = 0;
        $file_sizes = [];
        
        foreach ($values as $value) {
            if (empty($value)) {
                continue;
            }
            
            // ✅ CRÍTICO: Manejo robusto de JSON malformado
            $files = null;
            
            if (is_array($value)) {
                $files = $value;
            } else {
                // Intentar decodificar JSON
                $decoded = json_decode($value, true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                    $files = $decoded;
                } else {
                    // Si el JSON falla, intentar como string simple
                    error_log('SFQ Statistics: Failed to decode file JSON: ' . json_last_error_msg() . ' - Value: ' . substr($value, 0, 100));
                    
                    // Intentar extraer información básica si es un string
                    if (is_string($value) && !empty(trim($value))) {
                        // Si contiene "attachment_id" probablemente sea un archivo
                        if (strpos($value, 'attachment_id') !== false || strpos($value, 'filename') !== false) {
                            $files_uploaded++;
                            $total_files++;
                            
                            // Intentar extraer tipo de archivo del string
                            if (preg_match('/\.([a-zA-Z0-9]+)/', $value, $matches)) {
                                $extension = strtolower($matches[1]);
                                $file_types[$extension] = ($file_types[$extension] ?? 0) + 1;
                            }
                        }
                    }
                    continue;
                }
            }
            
            // Procesar archivos válidos
            if (is_array($files) && !empty($files)) {
                $files_uploaded++;
                $total_files += count($files);
                
                // Analizar cada archivo
                foreach ($files as $file_data) {
                    if (is_array($file_data) || is_object($file_data)) {
                        $file_data = (array) $file_data;
                        
                        // Obtener extensión del archivo
                        $filename = $file_data['filename'] ?? $file_data['original_name'] ?? '';
                        if (!empty($filename)) {
                            $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
                            if (!empty($extension)) {
                                $file_types[$extension] = ($file_types[$extension] ?? 0) + 1;
                            }
                        }
                        
                        // Obtener tamaño del archivo
                        $size = intval($file_data['size'] ?? 0);
                        if ($size > 0) {
                            $file_sizes[] = $size;
                        }
                    } elseif (is_string($file_data)) {
                        // Archivo como string (nombre de archivo)
                        $extension = strtolower(pathinfo($file_data, PATHINFO_EXTENSION));
                        if (!empty($extension)) {
                            $file_types[$extension] = ($file_types[$extension] ?? 0) + 1;
                        }
                    }
                }
            }
        }
        
        $upload_rate = $total_responses > 0 ? round(($files_uploaded / $total_responses) * 100, 1) : 0;
        
        // Calcular tamaño promedio
        $avg_file_size = 0;
        if (!empty($file_sizes)) {
            $avg_file_size = array_sum($file_sizes) / count($file_sizes);
        }
        
        // Ordenar tipos de archivo por frecuencia
        arsort($file_types);
        
        return [
            'id' => $element['id'],
            'type' => $element['type'],
            'label' => $element['label'],
            'total_responses' => $total_responses,
            'files_uploaded' => $files_uploaded,
            'upload_rate' => $upload_rate,
            'total_files' => $total_files,
            'avg_file_size' => round($avg_file_size),
            'avg_file_size_formatted' => $avg_file_size > 0 ? size_format($avg_file_size) : '0 B',
            'file_types' => array_slice($file_types, 0, 5, true)
        ];
    }
    
    /**
     * Procesar elementos countdown
     */
    private function process_countdown_element($element, $element_responses) {
        $total_responses = count($element_responses);
        
        // Para countdown, el valor puede contener información sobre el tiempo restante
        // cuando se completó el formulario
        
        return [
            'id' => $element['id'],
            'type' => $element['type'],
            'label' => $element['label'],
            'total_responses' => $total_responses,
            'note' => 'Estadísticas de countdown en desarrollo'
        ];
    }
    
    /**
     * Procesar elementos legales
     */
    private function process_legal_element($element, $element_responses) {
        $total_responses = count($element_responses);
        $values = array_column($element_responses, 'value');
        
        $accepted_count = 0;
        $rejected_count = 0;
        
        foreach ($values as $value) {
            if ($value === 'checked' || $value === '1' || $value === true || $value === 'true') {
                $accepted_count++;
            } else {
                $rejected_count++;
            }
        }
        
        $acceptance_rate = $total_responses > 0 ? round(($accepted_count / $total_responses) * 100, 1) : 0;
        
        return [
            'id' => $element['id'],
            'type' => $element['type'],
            'label' => $element['label'],
            'total_responses' => $total_responses,
            'accepted_count' => $accepted_count,
            'rejected_count' => $rejected_count,
            'acceptance_rate' => $acceptance_rate
        ];
    }
    
    /**
     * Procesar elementos genéricos
     */
    private function process_generic_element($element, $element_responses) {
        $total_responses = count($element_responses);
        
        return [
            'id' => $element['id'],
            'type' => $element['type'],
            'label' => $element['label'],
            'total_responses' => $total_responses,
            'note' => 'Tipo de elemento no reconocido'
        ];
    }
    
    /**
     * Obtener etiqueta para rating
     */
    private function get_rating_label($rating, $type) {
        switch ($type) {
            case 'stars':
                return str_repeat('⭐', $rating);
            case 'hearts':
                return str_repeat('❤️', $rating);
            case 'emojis':
                $emojis = ['😞', '😐', '🙂', '😊', '😍'];
                return $emojis[$rating - 1] ?? '😐';
            default:
                return (string)$rating;
        }
    }
    
    /**
     * Obtener datos de países para un valor específico de elemento freestyle
     */
    private function get_countries_for_freestyle_element_value($element_id, $value, $element_responses) {
        // Filtrar respuestas que coincidan con el valor específico
        $matching_responses = array_filter($element_responses, function($response) use ($value) {
            return $response['value'] === $value;
        });
        
        if (empty($matching_responses)) {
            return array();
        }
        
        // Extraer IPs únicas
        $ips = array_unique(array_column($matching_responses, 'user_ip'));
        $ips = array_filter($ips, function($ip) { return !empty($ip); });
        
        if (empty($ips)) {
            return array();
        }
        
        // Obtener información de países para todas las IPs
        if (class_exists('SFQ_Admin_Submissions')) {
            $submissions_handler = new SFQ_Admin_Submissions();
            
            // Usar reflection para acceder al método privado
            $reflection = new ReflectionClass($submissions_handler);
            $method = $reflection->getMethod('get_countries_info_batch');
            $method->setAccessible(true);
            
            $countries_info = $method->invoke($submissions_handler, $ips);
        } else {
            return array();
        }
        
        $countries_count = array();
        $total_responses = count($matching_responses);
        
        // Procesar resultados agrupando por país
        foreach ($matching_responses as $response) {
            $country_info = $countries_info[$response['user_ip']] ?? null;
            
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
                
                $countries_count[$country_key]['count']++;
            }
        }
        
        // Calcular porcentajes y ordenar
        foreach ($countries_count as &$country) {
            $country['percentage'] = $total_responses > 0 ? 
                round(($country['count'] / $total_responses) * 100, 1) : 0;
        }
        
        // Ordenar por cantidad descendente y limitar a top 5
        uasort($countries_count, function($a, $b) {
            return $b['count'] - $a['count'];
        });
        
        return array_slice(array_values($countries_count), 0, 5);
    }
    
    /**
     * ✅ NUEVO: Obtener analytics de abandono
     */
    public function get_abandonment_analytics() {
        // Verificar permisos
        if (!current_user_can('manage_smart_forms') && !current_user_can('manage_options')) {
            wp_send_json_error(__('No tienes permisos', 'smart-forms-quiz'));
            return;
        }
        
        // Verificar nonce
        if (!check_ajax_referer('sfq_nonce', 'nonce', false)) {
            wp_send_json_error(__('Error de seguridad', 'smart-forms-quiz'));
            return;
        }
        
        $form_id = intval($_POST['form_id'] ?? 0);
        $period = sanitize_text_field($_POST['period'] ?? 'month');
        
        if (!$form_id) {
            wp_send_json_error(__('ID de formulario inválido', 'smart-forms-quiz'));
            return;
        }
        
        try {
            $date_condition = $this->build_date_condition($period, '', '');
            
            // Obtener estadísticas de abandono
            $abandonment_stats = $this->calculate_abandonment_stats($form_id, $date_condition);
            
            wp_send_json_success($abandonment_stats);
        } catch (Exception $e) {
            error_log('SFQ Abandonment Analytics Error: ' . $e->getMessage());
            wp_send_json_error('Error al obtener analytics de abandono: ' . $e->getMessage());
        }
    }
    
    /**
     * ✅ NUEVO: Obtener lista de respuestas parciales
     */
    public function get_partial_responses_list() {
        // Verificar permisos
        if (!current_user_can('manage_smart_forms') && !current_user_can('manage_options')) {
            wp_send_json_error(__('No tienes permisos', 'smart-forms-quiz'));
            return;
        }
        
        // Verificar nonce
        if (!check_ajax_referer('sfq_nonce', 'nonce', false)) {
            wp_send_json_error(__('Error de seguridad', 'smart-forms-quiz'));
            return;
        }
        
        $form_id = intval($_POST['form_id'] ?? 0);
        $page = intval($_POST['page'] ?? 1);
        $per_page = intval($_POST['per_page'] ?? 20);
        $country_filter = sanitize_text_field($_POST['country_filter'] ?? '');
        $question_filter = intval($_POST['question_filter'] ?? 0);
        
        if (!$form_id) {
            wp_send_json_error(__('ID de formulario inválido', 'smart-forms-quiz'));
            return;
        }
        
        try {
            $partial_responses = $this->get_partial_responses_data($form_id, $page, $per_page, $country_filter, $question_filter);
            wp_send_json_success($partial_responses);
        } catch (Exception $e) {
            error_log('SFQ Partial Responses List Error: ' . $e->getMessage());
            wp_send_json_error('Error al obtener respuestas parciales: ' . $e->getMessage());
        }
    }
    
    /**
     * ✅ NUEVO: Calcular estadísticas de abandono
     */
    private function calculate_abandonment_stats($form_id, $date_condition) {
        global $wpdb;
        
        // Verificar si existe la tabla de respuestas parciales
        $partial_table = $wpdb->prefix . 'sfq_partial_responses';
        $table_exists = $wpdb->get_var($wpdb->prepare("SHOW TABLES LIKE %s", $partial_table)) === $partial_table;
        
        if (!$table_exists) {
            return array(
                'summary' => array(
                    'partial_responses_count' => 0,
                    'abandonment_rate' => 0,
                    'top_exit_question' => 'N/A',
                    'top_abandonment_country' => 'N/A'
                ),
                'questions_chart' => array(),
                'countries_chart' => array(),
                'timeline_chart' => array()
            );
        }
        
        // Obtener respuestas parciales del período
        $partial_query = "SELECT * FROM {$partial_table} WHERE form_id = %d";
        $partial_params = [$form_id];
        
        if (!empty($date_condition['params'])) {
            $partial_date_condition = str_replace('completed_at', 'last_updated', $date_condition['where']);
            $partial_query .= $partial_date_condition;
            $partial_params = array_merge($partial_params, $date_condition['params']);
        }
        
        $partial_responses = $wpdb->get_results($wpdb->prepare($partial_query, $partial_params));
        
        // Obtener respuestas completadas del mismo período para comparar
        $completed_query = "SELECT COUNT(*) FROM {$wpdb->prefix}sfq_submissions WHERE form_id = %d AND status = 'completed'";
        $completed_params = [$form_id];
        
        if (!empty($date_condition['params'])) {
            $completed_query .= $date_condition['where'];
            $completed_params = array_merge($completed_params, $date_condition['params']);
        }
        
        $completed_count = $wpdb->get_var($wpdb->prepare($completed_query, $completed_params));
        
        // Calcular estadísticas de resumen
        $partial_count = count($partial_responses);
        $total_attempts = $partial_count + $completed_count;
        $abandonment_rate = $total_attempts > 0 ? round(($partial_count / $total_attempts) * 100, 1) : 0;
        
        // Analizar puntos de abandono por pregunta
        $questions_abandonment = $this->analyze_abandonment_by_question($form_id, $partial_responses);
        
        // Analizar abandono por país
        $countries_abandonment = $this->analyze_abandonment_by_country($partial_responses);
        
        // Analizar evolución temporal
        $timeline_abandonment = $this->analyze_abandonment_timeline($partial_responses, $date_condition);
        
        // Encontrar pregunta con más abandonos
        $top_exit_question = 'N/A';
        if (!empty($questions_abandonment)) {
            $max_abandonment = max(array_column($questions_abandonment, 'count'));
            foreach ($questions_abandonment as $question) {
                if ($question['count'] === $max_abandonment) {
                    $top_exit_question = substr($question['question_text'], 0, 30) . '...';
                    break;
                }
            }
        }
        
        // Encontrar país con más abandonos
        $top_abandonment_country = 'N/A';
        if (!empty($countries_abandonment)) {
            $max_country_abandonment = max(array_column($countries_abandonment, 'count'));
            foreach ($countries_abandonment as $country) {
                if ($country['count'] === $max_country_abandonment) {
                    $top_abandonment_country = $country['flag_emoji'] . ' ' . $country['country_name'];
                    break;
                }
            }
        }
        
        return array(
            'summary' => array(
                'partial_responses_count' => $partial_count,
                'abandonment_rate' => $abandonment_rate . '%',
                'top_exit_question' => $top_exit_question,
                'top_abandonment_country' => $top_abandonment_country
            ),
            'questions_chart' => $questions_abandonment,
            'countries_chart' => $countries_abandonment,
            'timeline_chart' => $timeline_abandonment
        );
    }
    
    /**
     * ✅ NUEVO: Analizar abandono por pregunta
     */
    private function analyze_abandonment_by_question($form_id, $partial_responses) {
        global $wpdb;
        
        // Obtener todas las preguntas del formulario
        $questions = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}sfq_questions WHERE form_id = %d ORDER BY order_position ASC",
            $form_id
        ));
        
        if (empty($questions)) {
            return array();
        }
        
        // Contar abandonos por pregunta
        $question_abandonment = array();
        
        foreach ($questions as $question) {
            $abandonment_count = 0;
            
            foreach ($partial_responses as $partial) {
                // Verificar si la última pregunta respondida fue esta
                if ($partial->current_question == $question->order_position) {
                    $abandonment_count++;
                }
            }
            
            $question_abandonment[] = array(
                'question_id' => $question->id,
                'question_text' => $question->question_text,
                'order_position' => $question->order_position,
                'count' => $abandonment_count,
                'percentage' => count($partial_responses) > 0 ? round(($abandonment_count / count($partial_responses)) * 100, 1) : 0
            );
        }
        
        // Ordenar por cantidad de abandonos
        usort($question_abandonment, function($a, $b) {
            return $b['count'] - $a['count'];
        });
        
        return $question_abandonment;
    }
    
    /**
     * ✅ NUEVO: Analizar abandono por país
     */
    private function analyze_abandonment_by_country($partial_responses) {
        if (empty($partial_responses)) {
            return array();
        }
        
        // Extraer IPs únicas
        $ips = array_unique(array_filter(array_column($partial_responses, 'user_ip')));
        
        if (empty($ips)) {
            return array();
        }
        
        // Obtener información de países
        if (class_exists('SFQ_Admin_Submissions')) {
            $submissions_handler = new SFQ_Admin_Submissions();
            
            // Usar reflection para acceder al método privado
            $reflection = new ReflectionClass($submissions_handler);
            $method = $reflection->getMethod('get_countries_info_batch');
            $method->setAccessible(true);
            
            $countries_info = $method->invoke($submissions_handler, $ips);
        } else {
            return array();
        }
        
        $countries_count = array();
        
        // Contar abandonos por país
        foreach ($partial_responses as $partial) {
            $country_info = $countries_info[$partial->user_ip] ?? null;
            
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
                
                $countries_count[$country_key]['count']++;
            }
        }
        
        // Calcular porcentajes
        $total_partial = count($partial_responses);
        foreach ($countries_count as &$country) {
            $country['percentage'] = $total_partial > 0 ? round(($country['count'] / $total_partial) * 100, 1) : 0;
        }
        
        // Ordenar por cantidad y limitar a top 10
        uasort($countries_count, function($a, $b) {
            return $b['count'] - $a['count'];
        });
        
        return array_slice(array_values($countries_count), 0, 10);
    }
    
    /**
     * ✅ NUEVO: Analizar evolución temporal de abandonos
     */
    private function analyze_abandonment_timeline($partial_responses, $date_condition) {
        if (empty($partial_responses)) {
            return array();
        }
        
        // Agrupar por fecha
        $daily_abandonment = array();
        
        foreach ($partial_responses as $partial) {
            $date = date('Y-m-d', strtotime($partial->last_updated));
            
            if (!isset($daily_abandonment[$date])) {
                $daily_abandonment[$date] = 0;
            }
            
            $daily_abandonment[$date]++;
        }
        
        // Ordenar por fecha
        ksort($daily_abandonment);
        
        // Convertir a formato para gráfico
        $timeline_data = array();
        foreach ($daily_abandonment as $date => $count) {
            $timeline_data[] = array(
                'date' => $date,
                'count' => $count
            );
        }
        
        return $timeline_data;
    }
    
    /**
     * ✅ NUEVO: Obtener datos de respuestas parciales para tabla
     */
    private function get_partial_responses_data($form_id, $page, $per_page, $country_filter, $question_filter) {
        global $wpdb;
        
        // Verificar si existe la tabla
        $partial_table = $wpdb->prefix . 'sfq_partial_responses';
        $table_exists = $wpdb->get_var($wpdb->prepare("SHOW TABLES LIKE %s", $partial_table)) === $partial_table;
        
        if (!$table_exists) {
            return array(
                'data' => array(),
                'total' => 0,
                'pages' => 0
            );
        }
        
        // Construir consulta con filtros
        $where_conditions = array("form_id = %d");
        $params = array($form_id);
        
        // Aplicar filtros si existen
        if (!empty($country_filter)) {
            // Filtro por país requiere análisis de IP
            $where_conditions[] = "user_ip IS NOT NULL";
        }
        
        if ($question_filter > 0) {
            $where_conditions[] = "current_question = %d";
            $params[] = $question_filter;
        }
        
        $where_clause = implode(' AND ', $where_conditions);
        
        // Obtener total
        $total = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$partial_table} WHERE {$where_clause}",
            $params
        ));
        
        // Obtener datos paginados
        $offset = ($page - 1) * $per_page;
        $partial_responses = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$partial_table} WHERE {$where_clause} 
            ORDER BY last_updated DESC LIMIT %d OFFSET %d",
            array_merge($params, [$per_page, $offset])
        ));
        
        // Procesar datos para la tabla
        $processed_data = array();
        
        foreach ($partial_responses as $partial) {
            // Obtener información del país
            $country_info = array('country_name' => 'Desconocido', 'flag_emoji' => '🌍');
            if (!empty($partial->user_ip) && class_exists('SFQ_Admin_Submissions')) {
                $submissions_handler = new SFQ_Admin_Submissions();
                $reflection = new ReflectionClass($submissions_handler);
                $method = $reflection->getMethod('get_countries_info_batch');
                $method->setAccessible(true);
                
                $countries_info = $method->invoke($submissions_handler, [$partial->user_ip]);
                if (isset($countries_info[$partial->user_ip])) {
                    $country_info = $countries_info[$partial->user_ip];
                }
            }
            
            // Calcular progreso
            $responses_data = json_decode($partial->responses, true) ?: array();
            $total_questions = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$wpdb->prefix}sfq_questions WHERE form_id = %d",
                $form_id
            ));
            
            $progress = $total_questions > 0 ? round((count($responses_data) / $total_questions) * 100, 1) : 0;
            
            // Determinar estado
            $is_expired = strtotime($partial->expires_at) < time();
            $status = $is_expired ? 'expired' : 'active';
            
            // Calcular tiempo transcurrido aproximado
            $time_elapsed = time() - strtotime($partial->last_updated);
            $time_elapsed_formatted = $this->format_time_elapsed($time_elapsed);
            
            $processed_data[] = array(
                'session_id' => substr($partial->session_id, 0, 8) . '...',
                'country' => $country_info['flag_emoji'] . ' ' . $country_info['country_name'],
                'last_question' => $partial->current_question + 1,
                'progress' => $progress . '%',
                'time_elapsed' => $time_elapsed_formatted,
                'last_activity' => date_i18n('d/m/Y H:i', strtotime($partial->last_updated)),
                'status' => $status,
                'expires_at' => date_i18n('d/m/Y H:i', strtotime($partial->expires_at))
            );
        }
        
        return array(
            'data' => $processed_data,
            'total' => intval($total),
            'pages' => ceil($total / $per_page),
            'current_page' => $page
        );
    }
    
    /**
     * ✅ NUEVO: Formatear tiempo transcurrido
     */
    private function format_time_elapsed($seconds) {
        if ($seconds < 60) {
            return $seconds . 's';
        } elseif ($seconds < 3600) {
            return floor($seconds / 60) . 'm';
        } elseif ($seconds < 86400) {
            return floor($seconds / 3600) . 'h';
        } else {
            return floor($seconds / 86400) . 'd';
        }
    }
    
    /**
     * ✅ NUEVO: Obtener conteo de respuestas parciales
     */
    private function get_partial_responses_count($form_id, $date_condition) {
        global $wpdb;
        
        // Verificar si existe la tabla de respuestas parciales
        $partial_table = $wpdb->prefix . 'sfq_partial_responses';
        $table_exists = $wpdb->get_var($wpdb->prepare("SHOW TABLES LIKE %s", $partial_table)) === $partial_table;
        
        if (!$table_exists) {
            return 0;
        }
        
        // Construir consulta con condiciones de fecha
        $query = "SELECT COUNT(*) FROM {$partial_table} WHERE form_id = %d";
        $params = [$form_id];
        
        if (!empty($date_condition['params'])) {
            // Usar last_updated en lugar de completed_at para respuestas parciales
            $partial_date_condition = str_replace('completed_at', 'last_updated', $date_condition['where']);
            $query .= $partial_date_condition;
            $params = array_merge($params, $date_condition['params']);
        }
        
        return intval($wpdb->get_var($wpdb->prepare($query, $params)));
    }
    
    /**
     * ✅ NUEVO: Obtener analytics de visitantes y clics
     */
    public function get_visitors_analytics() {
        // Verificar permisos
        if (!current_user_can('manage_smart_forms') && !current_user_can('manage_options')) {
            wp_send_json_error(__('No tienes permisos', 'smart-forms-quiz'));
            return;
        }
        
        // Verificar nonce
        if (!check_ajax_referer('sfq_nonce', 'nonce', false)) {
            wp_send_json_error(__('Error de seguridad', 'smart-forms-quiz'));
            return;
        }
        
        $form_id = intval($_POST['form_id'] ?? 0);
        $period = sanitize_text_field($_POST['period'] ?? 'month');
        
        if (!$form_id) {
            wp_send_json_error(__('ID de formulario inválido', 'smart-forms-quiz'));
            return;
        }
        
        try {
            $date_condition = $this->build_analytics_date_condition($period);
            
            // Obtener estadísticas de visitantes y clics
            $visitors_stats = $this->calculate_visitors_stats($form_id, $date_condition);
            
            wp_send_json_success($visitors_stats);
        } catch (Exception $e) {
            error_log('SFQ Visitors Analytics Error: ' . $e->getMessage());
            wp_send_json_error('Error al obtener analytics de visitantes: ' . $e->getMessage());
        }
    }
    
    /**
     * ✅ CORREGIDO: Calcular estadísticas de visitantes y clics usando la misma lógica que get_form_quick_stats
     */
    private function calculate_visitors_stats($form_id, $date_condition) {
        global $wpdb;
        
        // Verificar si existe la tabla de analytics
        $analytics_table = $wpdb->prefix . 'sfq_analytics';
        $table_exists = $wpdb->get_var("SHOW TABLES LIKE '$analytics_table'") === $analytics_table;
        
        if (!$table_exists) {
            return array(
                'summary' => array(
                    'unique_visitors' => 0,
                    'total_visits' => 0,
                    'unique_clicks' => 0,
                    'total_clicks' => 0,
                    'conversion_rate' => 0,
                    'avg_clicks_per_visitor' => 0,
                    'top_country_unique_clicks' => array(
                        'flag_emoji' => '🌍',
                        'country_name' => 'N/A',
                        'count' => 0
                    )
                ),
                'timeline_chart' => array(),
                'countries_chart' => array(),
                'countries_table' => array(),
                'button_stats' => array(
                    'button_clicks' => array(),
                    'url_clicks' => array(),
                    'total_button_clicks' => 0,
                    'total_url_clicks' => 0
                )
            );
        }
        
        // ✅ CORREGIDO: Usar la misma lógica exacta que get_form_quick_stats
        
        // Obtener visitantes únicos (sesiones únicas que vieron el formulario)
        $unique_visitors_query = "SELECT COUNT(DISTINCT session_id) FROM {$analytics_table} 
                                 WHERE form_id = %d AND event_type = 'view'";
        $unique_visitors_params = [$form_id];
        
        if (!empty($date_condition['params'])) {
            $unique_visitors_query .= $date_condition['where'];
            $unique_visitors_params = array_merge($unique_visitors_params, $date_condition['params']);
        }
        
        $unique_visitors = $wpdb->get_var($wpdb->prepare($unique_visitors_query, $unique_visitors_params));
        
        // Obtener total de visitas (todas las vistas del formulario)
        $total_visits_query = "SELECT COUNT(*) FROM {$analytics_table} 
                              WHERE form_id = %d AND event_type = 'view'";
        $total_visits_params = [$form_id];
        
        if (!empty($date_condition['params'])) {
            $total_visits_query .= $date_condition['where'];
            $total_visits_params = array_merge($total_visits_params, $date_condition['params']);
        }
        
        $total_visits = $wpdb->get_var($wpdb->prepare($total_visits_query, $total_visits_params));
        
        // ✅ CORREGIDO: Usar la misma lógica exacta que get_form_quick_stats para clics
        
        // Obtener clics únicos (sesiones únicas que hicieron clic en botones inmediatamente)
        $unique_clicks_query = "SELECT COUNT(DISTINCT session_id) FROM {$analytics_table}
                               WHERE form_id = %d AND event_type = 'button_click_immediate'";
        $unique_clicks_params = [$form_id];
        
        if (!empty($date_condition['params'])) {
            $unique_clicks_query .= str_replace('completed_at', 'created_at', $date_condition['where']);
            $unique_clicks_params = array_merge($unique_clicks_params, $date_condition['params']);
        }
        
        $unique_clicks = $wpdb->get_var($wpdb->prepare($unique_clicks_query, $unique_clicks_params));
        
        // Obtener total de clics (todos los clics en botones inmediatos)
        $total_clicks_query = "SELECT COUNT(*) FROM {$analytics_table}
                              WHERE form_id = %d AND event_type = 'button_click_immediate'";
        $total_clicks_params = [$form_id];
        
        if (!empty($date_condition['params'])) {
            $total_clicks_query .= str_replace('completed_at', 'created_at', $date_condition['where']);
            $total_clicks_params = array_merge($total_clicks_params, $date_condition['params']);
        }
        
        $total_clicks = $wpdb->get_var($wpdb->prepare($total_clicks_query, $total_clicks_params));
        
        // ✅ FALLBACK: Si no hay vistas en analytics, usar el contador de submissions como aproximación (igual que get_form_quick_stats)
        if ($unique_visitors == 0 && $total_visits == 0) {
            $total_submissions = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$wpdb->prefix}sfq_submissions 
                WHERE form_id = %d AND status = 'completed'",
                $form_id
            ));
            
            if ($total_submissions > 0) {
                $unique_visitors = $total_submissions;
                $total_visits = $total_submissions * 2; // Estimación conservadora
            }
        }
        
        // Calcular métricas usando la misma lógica que get_form_quick_stats
        $conversion_rate = 0;
        if ($unique_visitors > 0 && $unique_clicks > 0) {
            $conversion_rate = ($unique_clicks / $unique_visitors) * 100;
            $conversion_rate = round($conversion_rate, 1);
            $conversion_rate = max(0, min(100, $conversion_rate));
        }
        
        $avg_clicks_per_visitor = $unique_visitors > 0 ? round($total_clicks / $unique_visitors, 2) : 0;
        
        // Obtener datos por país
        $countries_data = $this->get_visitors_countries_data($form_id, $date_condition);
        
        // Obtener evolución temporal
        $timeline_data = $this->get_visitors_timeline_data($form_id, $date_condition);
        
        // Encontrar país con más clics únicos
        $top_country_unique_clicks = array(
            'flag_emoji' => '🌍',
            'country_name' => 'N/A',
            'count' => 0
        );
        
        if (!empty($countries_data)) {
            $max_unique_clicks = max(array_column($countries_data, 'unique_clicks'));
            foreach ($countries_data as $country) {
                if ($country['unique_clicks'] === $max_unique_clicks) {
                    $top_country_unique_clicks = array(
                        'flag_emoji' => $country['flag_emoji'],
                        'country_name' => $country['country_name'],
                        'count' => $country['unique_clicks']
                    );
                    break;
                }
            }
        }
        
        // Obtener estadísticas de URLs y botones
        $button_stats = $this->get_button_click_stats($form_id, $date_condition);
        
        return array(
            'summary' => array(
                'unique_visitors' => intval($unique_visitors),
                'total_visits' => intval($total_visits),
                'unique_clicks' => intval($unique_clicks),
                'total_clicks' => intval($total_clicks),
                'conversion_rate' => $conversion_rate,
                'avg_clicks_per_visitor' => $avg_clicks_per_visitor,
                'top_country_unique_clicks' => $top_country_unique_clicks
            ),
            'timeline_chart' => $timeline_data,
            'countries_chart' => array_slice($countries_data, 0, 10), // Top 10 para el gráfico
            'countries_table' => $countries_data, // Todos para la tabla
            'button_stats' => $button_stats // Estadísticas de botones y URLs
        );
    }
    
    /**
     * ✅ NUEVO: Obtener datos de visitantes por país
     */
    private function get_visitors_countries_data($form_id, $date_condition) {
        global $wpdb;
        
        // Obtener todas las sesiones con sus IPs para este formulario
        $sessions_query = "SELECT DISTINCT session_id, user_ip FROM {$wpdb->prefix}sfq_analytics 
                          WHERE form_id = %d AND user_ip IS NOT NULL AND user_ip != ''";
        $sessions_params = [$form_id];
        
        if (!empty($date_condition['params'])) {
            $sessions_query .= $date_condition['where'];
            $sessions_params = array_merge($sessions_params, $date_condition['params']);
        }
        
        $sessions = $wpdb->get_results($wpdb->prepare($sessions_query, $sessions_params));
        
        if (empty($sessions)) {
            return array();
        }
        
        // Obtener información de países para todas las IPs
        if (class_exists('SFQ_Admin_Submissions')) {
            $submissions_handler = new SFQ_Admin_Submissions();
            $reflection = new ReflectionClass($submissions_handler);
            $method = $reflection->getMethod('get_countries_info_batch');
            $method->setAccessible(true);
            
            $countries_info = $method->invoke($submissions_handler, array_unique(array_column($sessions, 'user_ip')));
        } else {
            return array();
        }
        
        // Agrupar sesiones por país
        $countries_sessions = array();
        foreach ($sessions as $session) {
            $country_info = $countries_info[$session->user_ip] ?? null;
            
            if ($country_info && $country_info['country_code'] !== 'XX') {
                $country_key = $country_info['country_code'];
                
                if (!isset($countries_sessions[$country_key])) {
                    $countries_sessions[$country_key] = array(
                        'country_code' => $country_info['country_code'],
                        'country_name' => $country_info['country_name'],
                        'flag_emoji' => $country_info['flag_emoji'],
                        'sessions' => array()
                    );
                }
                
                $countries_sessions[$country_key]['sessions'][] = $session->session_id;
            }
        }
        
        // Calcular estadísticas para cada país
        $countries_data = array();
        foreach ($countries_sessions as $country_key => $country_data) {
            $sessions_list = array_unique($country_data['sessions']);
            $sessions_placeholders = implode(',', array_fill(0, count($sessions_list), '%s'));
            
            // Visitantes únicos (sesiones que vieron el formulario)
            $unique_visitors = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(DISTINCT session_id) FROM {$wpdb->prefix}sfq_analytics 
                WHERE form_id = %d AND event_type = 'view' AND session_id IN ($sessions_placeholders)" .
                (!empty($date_condition['params']) ? $date_condition['where'] : ''),
                array_merge([$form_id], $sessions_list, $date_condition['params'] ?? [])
            ));
            
            // Total visitas
            $total_visits = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$wpdb->prefix}sfq_analytics 
                WHERE form_id = %d AND event_type = 'view' AND session_id IN ($sessions_placeholders)" .
                (!empty($date_condition['params']) ? $date_condition['where'] : ''),
                array_merge([$form_id], $sessions_list, $date_condition['params'] ?? [])
            ));
            
            // Clics únicos (sesiones que hicieron clic en botones inmediatamente)
            $unique_clicks = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(DISTINCT session_id) FROM {$wpdb->prefix}sfq_analytics 
                WHERE form_id = %d AND event_type = 'button_click_immediate' AND session_id IN ($sessions_placeholders)" .
                (!empty($date_condition['params']) ? str_replace('completed_at', 'created_at', $date_condition['where']) : ''),
                array_merge([$form_id], $sessions_list, $date_condition['params'] ?? [])
            ));
            
            // Total clics
            $total_clicks = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$wpdb->prefix}sfq_analytics 
                WHERE form_id = %d AND event_type = 'button_click_immediate' AND session_id IN ($sessions_placeholders)" .
                (!empty($date_condition['params']) ? str_replace('completed_at', 'created_at', $date_condition['where']) : ''),
                array_merge([$form_id], $sessions_list, $date_condition['params'] ?? [])
            ));
            
            // Calcular tasa de conversión
            $conversion_rate = $unique_visitors > 0 ? round(($unique_clicks / $unique_visitors) * 100, 1) : 0;
            
            $countries_data[] = array(
                'country_code' => $country_data['country_code'],
                'country_name' => $country_data['country_name'],
                'flag_emoji' => $country_data['flag_emoji'],
                'unique_visitors' => intval($unique_visitors),
                'total_visits' => intval($total_visits),
                'unique_clicks' => intval($unique_clicks),
                'total_clicks' => intval($total_clicks),
                'conversion_rate' => $conversion_rate
            );
        }
        
        // Calcular porcentajes del total
        $total_unique_visitors = array_sum(array_column($countries_data, 'unique_visitors'));
        foreach ($countries_data as &$country) {
            $country['percentage'] = $total_unique_visitors > 0 ? 
                round(($country['unique_visitors'] / $total_unique_visitors) * 100, 1) : 0;
        }
        
        // Ordenar por clics únicos descendente
        usort($countries_data, function($a, $b) {
            return $b['unique_clicks'] - $a['unique_clicks'];
        });
        
        return $countries_data;
    }
    
    /**
     * ✅ NUEVO: Obtener datos de timeline de visitantes
     */
    private function get_visitors_timeline_data($form_id, $date_condition) {
        global $wpdb;
        
        // Obtener datos diarios de visitantes y clics (usando button_click_immediate)
        $timeline_query = "SELECT 
                            DATE(created_at) as date,
                            COUNT(CASE WHEN event_type = 'view' THEN 1 END) as visits,
                            COUNT(DISTINCT CASE WHEN event_type = 'view' THEN session_id END) as unique_visitors,
                            COUNT(CASE WHEN event_type = 'button_click_immediate' THEN 1 END) as clicks,
                            COUNT(DISTINCT CASE WHEN event_type = 'button_click_immediate' THEN session_id END) as unique_clicks
                          FROM {$wpdb->prefix}sfq_analytics
                          WHERE form_id = %d";
        $timeline_params = [$form_id];
        
        if (!empty($date_condition['params'])) {
            $timeline_query .= str_replace('completed_at', 'created_at', $date_condition['where']);
            $timeline_params = array_merge($timeline_params, $date_condition['params']);
        }
        
        $timeline_query .= " GROUP BY DATE(created_at) ORDER BY date ASC";
        
        $timeline_data = $wpdb->get_results($wpdb->prepare($timeline_query, $timeline_params));
        
        return $timeline_data;
    }
    
    /**
     * ✅ NUEVO: Construir condición de fecha para analytics
     */
    private function build_analytics_date_condition($period) {
        $where = '';
        $params = array();
        
        switch ($period) {
            case 'today':
                $where = ' AND DATE(created_at) = %s';
                $params[] = current_time('Y-m-d');
                break;
            case '7':
                $where = ' AND DATE(created_at) >= %s';
                $params[] = date('Y-m-d', current_time('timestamp') - (7 * 24 * 60 * 60));
                break;
            case '30':
                $where = ' AND DATE(created_at) >= %s';
                $params[] = date('Y-m-d', current_time('timestamp') - (30 * 24 * 60 * 60));
                break;
            case '90':
                $where = ' AND DATE(created_at) >= %s';
                $params[] = date('Y-m-d', current_time('timestamp') - (90 * 24 * 60 * 60));
                break;
            default:
                // Sin filtro de fecha
                break;
        }
        
        return array('where' => $where, 'params' => $params);
    }
    
    /**
     * ✅ NUEVO: Exportar datos de visitantes
     */
    public function export_visitors_data() {
        // Verificar permisos
        if (!current_user_can('manage_smart_forms') && !current_user_can('manage_options')) {
            wp_send_json_error(__('No tienes permisos', 'smart-forms-quiz'));
            return;
        }
        
        // Verificar nonce
        if (!check_ajax_referer('sfq_nonce', 'nonce', false)) {
            wp_send_json_error(__('Error de seguridad', 'smart-forms-quiz'));
            return;
        }
        
        $form_id = intval($_POST['form_id'] ?? 0);
        $period = sanitize_text_field($_POST['period'] ?? 'month');
        
        if (!$form_id) {
            wp_send_json_error(__('ID de formulario inválido', 'smart-forms-quiz'));
            return;
        }
        
        try {
            $date_condition = $this->build_analytics_date_condition($period);
            $visitors_stats = $this->calculate_visitors_stats($form_id, $date_condition);
            
            // Crear CSV
            $upload_dir = wp_upload_dir();
            $filename = 'visitors_statistics_' . $form_id . '_' . date('Y-m-d_H-i-s') . '.csv';
            $filepath = $upload_dir['path'] . '/' . $filename;
            
            $file = fopen($filepath, 'w');
            
            // Escribir resumen general
            fputcsv($file, array('RESUMEN DE VISITANTES Y CLICS'));
            fputcsv($file, array('Visitantes Únicos', $visitors_stats['summary']['unique_visitors']));
            fputcsv($file, array('Total Visitas', $visitors_stats['summary']['total_visits']));
            fputcsv($file, array('Clics Únicos', $visitors_stats['summary']['unique_clicks']));
            fputcsv($file, array('Total Clics', $visitors_stats['summary']['total_clicks']));
            fputcsv($file, array('Tasa de Conversión', $visitors_stats['summary']['conversion_rate'] . '%'));
            fputcsv($file, array('Promedio Clics por Visitante', $visitors_stats['summary']['avg_clicks_per_visitor']));
            fputcsv($file, array(''));
            
            // Escribir estadísticas por país
            fputcsv($file, array('ESTADÍSTICAS POR PAÍS'));
            fputcsv($file, array('País', 'Visitantes Únicos', 'Total Visitas', 'Clics Únicos', 'Total Clics', 'Tasa Conversión', '% del Total'));
            
            foreach ($visitors_stats['countries_table'] as $country) {
                fputcsv($file, array(
                    $country['country_name'],
                    $country['unique_visitors'],
                    $country['total_visits'],
                    $country['unique_clicks'],
                    $country['total_clicks'],
                    $country['conversion_rate'] . '%',
                    $country['percentage'] . '%'
                ));
            }
            
            fclose($file);
            
            wp_send_json_success(array(
                'file_url' => $upload_dir['url'] . '/' . $filename,
                'message' => __('Datos de visitantes exportados correctamente', 'smart-forms-quiz')
            ));
            
        } catch (Exception $e) {
            error_log('SFQ Export Visitors Error: ' . $e->getMessage());
            wp_send_json_error('Error al exportar datos de visitantes: ' . $e->getMessage());
        }
    }
    
    /**
     * ✅ CORREGIDO: Obtener estadísticas de clics en botones y URLs desde event_data
     */
    private function get_button_click_stats($form_id, $date_condition) {
        global $wpdb;
        
        // Verificar si existe la tabla de analytics
        $analytics_table = $wpdb->prefix . 'sfq_analytics';
        $table_exists = $wpdb->get_var("SHOW TABLES LIKE '$analytics_table'") === $analytics_table;
        
        if (!$table_exists) {
            return array(
                'button_clicks' => array(),
                'url_clicks' => array(),
                'total_button_clicks' => 0,
                'total_url_clicks' => 0
            );
        }
        
        // ✅ CORREGIDO: Usar event_type = 'button_click_immediate' y extraer datos del JSON correctamente
        $button_clicks_query = "SELECT 
                                  JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.button_text')) as button_text,
                                  JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.button_url')) as button_url,
                                  JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.question_id')) as question_id,
                                  JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.element_id')) as element_id,
                                  COUNT(*) as click_count,
                                  COUNT(DISTINCT session_id) as unique_clicks,
                                  COUNT(DISTINCT user_ip) as unique_users
                                FROM {$analytics_table}
                                WHERE form_id = %d 
                                AND event_type = 'button_click_immediate'
                                AND JSON_EXTRACT(event_data, '$.button_url') IS NOT NULL
                                AND JSON_EXTRACT(event_data, '$.button_url') != ''
                                AND JSON_EXTRACT(event_data, '$.button_url') != 'null'";
        
        $button_params = [$form_id];
        
        if (!empty($date_condition['params'])) {
            $button_clicks_query .= str_replace('completed_at', 'created_at', $date_condition['where']);
            $button_params = array_merge($button_params, $date_condition['params']);
        }
        
        $button_clicks_query .= " GROUP BY JSON_EXTRACT(event_data, '$.button_text'), JSON_EXTRACT(event_data, '$.button_url'), JSON_EXTRACT(event_data, '$.question_id'), JSON_EXTRACT(event_data, '$.element_id')
                                 ORDER BY click_count DESC";
        
        $button_clicks = $wpdb->get_results($wpdb->prepare($button_clicks_query, $button_params));
        
        // Limpiar y procesar datos de botones
        $processed_button_clicks = array();
        $total_button_clicks = 0;
        
        foreach ($button_clicks as $click) {
            $button_text = $click->button_text;
            $button_url = $click->button_url;
            $question_id = intval($click->question_id);
            $element_id = $click->element_id;
            
            if (!empty($button_text) && !empty($button_url)) {
                // Obtener información de la pregunta
                $question_info = $wpdb->get_row($wpdb->prepare(
                    "SELECT question_text, order_position FROM {$wpdb->prefix}sfq_questions WHERE id = %d",
                    $question_id
                ));
                
                // Obtener información de países para este botón específico
                $countries_data = $this->get_button_countries_data_corrected($form_id, $button_text, $button_url, $question_id, $element_id, $date_condition);
                
                $processed_button_clicks[] = array(
                    'button_text' => $button_text,
                    'button_url' => $button_url,
                    'question_id' => $question_id,
                    'element_id' => $element_id,
                    'question_text' => $question_info ? $question_info->question_text : 'Pregunta #' . ($question_info->order_position ?? $question_id),
                    'question_position' => $question_info ? intval($question_info->order_position) + 1 : $question_id,
                    'click_count' => intval($click->click_count),
                    'unique_clicks' => intval($click->unique_clicks),
                    'unique_users' => intval($click->unique_users),
                    'countries_data' => $countries_data
                );
                
                $total_button_clicks += intval($click->click_count);
            }
        }
        
        // Obtener clics por URL (agrupados) - ✅ CORREGIDO
        $url_clicks_query = "SELECT 
                               JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.button_url')) as button_url,
                               COUNT(*) as click_count,
                               COUNT(DISTINCT session_id) as unique_clicks,
                               COUNT(DISTINCT user_ip) as unique_users,
                               GROUP_CONCAT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.button_text'))) as button_texts,
                               GROUP_CONCAT(DISTINCT CONCAT('Q', JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.question_id')))) as question_ids
                             FROM {$analytics_table}
                             WHERE form_id = %d 
                             AND event_type = 'button_click_immediate'
                             AND JSON_EXTRACT(event_data, '$.button_url') IS NOT NULL
                             AND JSON_EXTRACT(event_data, '$.button_url') != ''
                             AND JSON_EXTRACT(event_data, '$.button_url') != 'null'";
        
        $url_params = [$form_id];
        
        if (!empty($date_condition['params'])) {
            $url_clicks_query .= str_replace('completed_at', 'created_at', $date_condition['where']);
            $url_params = array_merge($url_params, $date_condition['params']);
        }
        
        $url_clicks_query .= " GROUP BY JSON_EXTRACT(event_data, '$.button_url')
                              ORDER BY click_count DESC";
        
        $url_clicks = $wpdb->get_results($wpdb->prepare($url_clicks_query, $url_params));
        
        // Procesar datos de URLs
        $processed_url_clicks = array();
        $total_url_clicks = 0;
        
        foreach ($url_clicks as $click) {
            $button_url = $click->button_url;
            $button_texts = $click->button_texts;
            $question_ids = $click->question_ids;
            
            if (!empty($button_url)) {
                // Limpiar textos de botones
                $texts_array = explode(',', $button_texts);
                $clean_texts = array_unique(array_filter($texts_array));
                
                // Limpiar IDs de preguntas
                $questions_array = explode(',', $question_ids);
                $clean_questions = array_unique(array_filter($questions_array));
                
                // Obtener información de países para esta URL
                $countries_data = $this->get_url_countries_data_corrected($form_id, $button_url, $date_condition);
                
                $processed_url_clicks[] = array(
                    'button_url' => $button_url,
                    'button_texts' => $clean_texts,
                    'question_ids' => $clean_questions,
                    'click_count' => intval($click->click_count),
                    'unique_clicks' => intval($click->unique_clicks),
                    'unique_users' => intval($click->unique_users),
                    'countries_data' => $countries_data
                );
                
                $total_url_clicks += intval($click->click_count);
            }
        }
        
        return array(
            'button_clicks' => $processed_button_clicks,
            'url_clicks' => $processed_url_clicks,
            'total_button_clicks' => $total_button_clicks,
            'total_url_clicks' => $total_url_clicks
        );
    }
    
    /**
     * ✅ NUEVO: Obtener datos de países para un botón específico
     */
    private function get_button_countries_data($form_id, $button_text, $button_url, $date_condition) {
        global $wpdb;
        
        $analytics_table = $wpdb->prefix . 'sfq_analytics';
        
        // Obtener todas las IPs que hicieron clic en este botón específico
        $ips_query = "SELECT DISTINCT user_ip, COUNT(*) as clicks
                      FROM {$analytics_table}
                      WHERE form_id = %d 
                      AND event_type = 'button_click'
                      AND JSON_EXTRACT(event_data, '$.button_text') = %s
                      AND JSON_EXTRACT(event_data, '$.button_url') = %s
                      AND user_ip IS NOT NULL AND user_ip != ''";
        
        $ips_params = [$form_id, '"' . $button_text . '"', '"' . $button_url . '"'];
        
        if (!empty($date_condition['params'])) {
            $ips_query .= $date_condition['where'];
            $ips_params = array_merge($ips_params, $date_condition['params']);
        }
        
        $ips_query .= " GROUP BY user_ip";
        
        $ips_data = $wpdb->get_results($wpdb->prepare($ips_query, $ips_params));
        
        if (empty($ips_data)) {
            return array();
        }
        
        // Obtener información de países
        if (class_exists('SFQ_Admin_Submissions')) {
            $submissions_handler = new SFQ_Admin_Submissions();
            $reflection = new ReflectionClass($submissions_handler);
            $method = $reflection->getMethod('get_countries_info_batch');
            $method->setAccessible(true);
            
            $countries_info = $method->invoke($submissions_handler, array_column($ips_data, 'user_ip'));
        } else {
            return array();
        }
        
        $countries_count = array();
        $total_clicks = 0;
        
        foreach ($ips_data as $ip_data) {
            $country_info = $countries_info[$ip_data->user_ip] ?? null;
            
            if ($country_info && $country_info['country_code'] !== 'XX') {
                $country_key = $country_info['country_code'];
                
                if (!isset($countries_count[$country_key])) {
                    $countries_count[$country_key] = array(
                        'country_code' => $country_info['country_code'],
                        'country_name' => $country_info['country_name'],
                        'flag_emoji' => $country_info['flag_emoji'],
                        'clicks' => 0,
                        'unique_users' => 0
                    );
                }
                
                $countries_count[$country_key]['clicks'] += intval($ip_data->clicks);
                $countries_count[$country_key]['unique_users']++;
                $total_clicks += intval($ip_data->clicks);
            }
        }
        
        // Calcular porcentajes
        foreach ($countries_count as &$country) {
            $country['percentage'] = $total_clicks > 0 ? 
                round(($country['clicks'] / $total_clicks) * 100, 1) : 0;
        }
        
        // Ordenar por clics descendente y limitar a top 5
        uasort($countries_count, function($a, $b) {
            return $b['clicks'] - $a['clicks'];
        });
        
        return array_slice(array_values($countries_count), 0, 5);
    }
    
    /**
     * ✅ CORREGIDO: Obtener datos de países para un botón específico usando event_data
     */
    private function get_button_countries_data_corrected($form_id, $button_text, $button_url, $question_id, $element_id, $date_condition) {
        global $wpdb;
        
        $analytics_table = $wpdb->prefix . 'sfq_analytics';
        
        // ✅ CORREGIDO: Usar event_type = 'button_click_immediate' y JSON_UNQUOTE
        $ips_query = "SELECT DISTINCT user_ip, COUNT(*) as clicks
                      FROM {$analytics_table}
                      WHERE form_id = %d 
                      AND event_type = 'button_click_immediate'
                      AND JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.button_text')) = %s
                      AND JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.button_url')) = %s
                      AND JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.question_id')) = %s
                      AND JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.element_id')) = %s
                      AND user_ip IS NOT NULL AND user_ip != ''";
        
        $ips_params = [$form_id, $button_text, $button_url, $question_id, $element_id];
        
        if (!empty($date_condition['params'])) {
            $ips_query .= str_replace('completed_at', 'created_at', $date_condition['where']);
            $ips_params = array_merge($ips_params, $date_condition['params']);
        }
        
        $ips_query .= " GROUP BY user_ip";
        
        $ips_data = $wpdb->get_results($wpdb->prepare($ips_query, $ips_params));
        
        if (empty($ips_data)) {
            return array();
        }
        
        // Obtener información de países
        if (class_exists('SFQ_Admin_Submissions')) {
            $submissions_handler = new SFQ_Admin_Submissions();
            $reflection = new ReflectionClass($submissions_handler);
            $method = $reflection->getMethod('get_countries_info_batch');
            $method->setAccessible(true);
            
            $countries_info = $method->invoke($submissions_handler, array_column($ips_data, 'user_ip'));
        } else {
            return array();
        }
        
        $countries_count = array();
        $total_clicks = 0;
        
        foreach ($ips_data as $ip_data) {
            $country_info = $countries_info[$ip_data->user_ip] ?? null;
            
            if ($country_info && $country_info['country_code'] !== 'XX') {
                $country_key = $country_info['country_code'];
                
                if (!isset($countries_count[$country_key])) {
                    $countries_count[$country_key] = array(
                        'country_code' => $country_info['country_code'],
                        'country_name' => $country_info['country_name'],
                        'flag_emoji' => $country_info['flag_emoji'],
                        'clicks' => 0,
                        'unique_users' => 0
                    );
                }
                
                $countries_count[$country_key]['clicks'] += intval($ip_data->clicks);
                $countries_count[$country_key]['unique_users']++;
                $total_clicks += intval($ip_data->clicks);
            }
        }
        
        // Calcular porcentajes
        foreach ($countries_count as &$country) {
            $country['percentage'] = $total_clicks > 0 ? 
                round(($country['clicks'] / $total_clicks) * 100, 1) : 0;
        }
        
        // Ordenar por clics descendente y limitar a top 5
        uasort($countries_count, function($a, $b) {
            return $b['clicks'] - $a['clicks'];
        });
        
        return array_slice(array_values($countries_count), 0, 5);
    }
    
    /**
     * ✅ CORREGIDO: Obtener datos de países para una URL específica usando event_data
     */
    private function get_url_countries_data_corrected($form_id, $button_url, $date_condition) {
        global $wpdb;
        
        $analytics_table = $wpdb->prefix . 'sfq_analytics';
        
        // ✅ CORREGIDO: Usar event_type = 'button_click_immediate' y JSON_UNQUOTE
        $ips_query = "SELECT DISTINCT user_ip, COUNT(*) as clicks
                      FROM {$analytics_table}
                      WHERE form_id = %d 
                      AND event_type = 'button_click_immediate'
                      AND JSON_UNQUOTE(JSON_EXTRACT(event_data, '$.button_url')) = %s
                      AND user_ip IS NOT NULL AND user_ip != ''";
        
        $ips_params = [$form_id, $button_url];
        
        if (!empty($date_condition['params'])) {
            $ips_query .= str_replace('completed_at', 'created_at', $date_condition['where']);
            $ips_params = array_merge($ips_params, $date_condition['params']);
        }
        
        $ips_query .= " GROUP BY user_ip";
        
        $ips_data = $wpdb->get_results($wpdb->prepare($ips_query, $ips_params));
        
        if (empty($ips_data)) {
            return array();
        }
        
        // Obtener información de países
        if (class_exists('SFQ_Admin_Submissions')) {
            $submissions_handler = new SFQ_Admin_Submissions();
            $reflection = new ReflectionClass($submissions_handler);
            $method = $reflection->getMethod('get_countries_info_batch');
            $method->setAccessible(true);
            
            $countries_info = $method->invoke($submissions_handler, array_column($ips_data, 'user_ip'));
        } else {
            return array();
        }
        
        $countries_count = array();
        $total_clicks = 0;
        
        foreach ($ips_data as $ip_data) {
            $country_info = $countries_info[$ip_data->user_ip] ?? null;
            
            if ($country_info && $country_info['country_code'] !== 'XX') {
                $country_key = $country_info['country_code'];
                
                if (!isset($countries_count[$country_key])) {
                    $countries_count[$country_key] = array(
                        'country_code' => $country_info['country_code'],
                        'country_name' => $country_info['country_name'],
                        'flag_emoji' => $country_info['flag_emoji'],
                        'clicks' => 0,
                        'unique_users' => 0
                    );
                }
                
                $countries_count[$country_key]['clicks'] += intval($ip_data->clicks);
                $countries_count[$country_key]['unique_users']++;
                $total_clicks += intval($ip_data->clicks);
            }
        }
        
        // Calcular porcentajes
        foreach ($countries_count as &$country) {
            $country['percentage'] = $total_clicks > 0 ? 
                round(($country['clicks'] / $total_clicks) * 100, 1) : 0;
        }
        
        // Ordenar por clics descendente y limitar a top 5
        uasort($countries_count, function($a, $b) {
            return $b['clicks'] - $a['clicks'];
        });
        
        return array_slice(array_values($countries_count), 0, 5);
    }
}
