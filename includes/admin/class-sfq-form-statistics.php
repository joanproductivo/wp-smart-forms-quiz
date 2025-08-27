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
                </div>
            </div>

            <!-- Tabs de contenido -->
            <div class="sfq-stats-tabs">
                <nav class="sfq-tabs-nav">
                    <button class="sfq-tab-button active" data-tab="questions">
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
                    <button class="sfq-tab-button" data-tab="responses">
                        <span class="dashicons dashicons-list-view"></span>
                        <?php _e('Respuestas Individuales', 'smart-forms-quiz'); ?>
                    </button>
                </nav>
            </div>

            <!-- Tab: Estadísticas por Pregunta -->
            <div class="sfq-tab-content active" id="tab-questions">
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
        
        // Debug: Log AJAX request parameters
        error_log("SFQ Debug: AJAX get_form_statistics called");
        error_log("SFQ Debug: Raw POST data: " . print_r($_POST, true));
        error_log("SFQ Debug: Parsed form_id: $form_id (type: " . gettype($form_id) . ")");
        error_log("SFQ Debug: Period: $period");
        
        if (!$form_id) {
            error_log("SFQ Debug: Invalid form_id received: " . var_export($_POST['form_id'] ?? 'NOT_SET', true));
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
            
            // Añadir información de depuración extendida
            $debug_info = array(
                'form_id' => $form_id,
                'period' => $period,
                'date_condition' => $date_condition,
                'form_verification' => $form_verification,
                'has_questions' => !empty($questions_stats),
                'questions_count' => count($questions_stats),
                'total_responses_found' => $stats['total_responses']
            );
            
            wp_send_json_success(array(
                'general' => $stats,
                'questions' => $questions_stats,
                'timeline' => $timeline,
                'debug' => $debug_info
            ));
        } catch (Exception $e) {
            error_log('SFQ Statistics Error: ' . $e->getMessage());
            wp_send_json_error('Error al obtener estadísticas: ' . $e->getMessage());
        }
    }
    
    /**
     * Calcular estadísticas generales del formulario (MEJORADO)
     */
    private function calculate_form_stats($form_id, $date_condition) {
        global $wpdb;
        
        // Construir consulta base de forma más robusta
        $base_query = "SELECT COUNT(*) FROM {$wpdb->prefix}sfq_submissions WHERE form_id = %d";
        $query_params = [$form_id];
        
        // Añadir condiciones de fecha y status de forma controlada
        if (!empty($date_condition['params'])) {
            $base_query .= " AND status = 'completed' {$date_condition['where']}";
            $query_params = array_merge($query_params, $date_condition['params']);
        } else {
            $base_query .= " AND status = 'completed'";
        }
        
        // Log de la consulta para debugging
        $prepared_query = $wpdb->prepare($base_query, $query_params);
        error_log("SFQ Debug: Total responses query: " . $prepared_query);
        
        $total_responses = $wpdb->get_var($prepared_query);
        
        // Si no hay respuestas completadas, verificar si hay submissions en general
        if ($total_responses == 0) {
            $total_any_status = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$wpdb->prefix}sfq_submissions WHERE form_id = %d",
                $form_id
            ));
            error_log("SFQ Debug: Total submissions (any status) for form $form_id: $total_any_status");
            
            // Si hay submissions pero no completadas, usar esas para mostrar algo
            if ($total_any_status > 0) {
                $total_responses = $total_any_status;
            }
        }
        
        error_log("SFQ Debug: Final total_responses for form $form_id: $total_responses");
        
        // Total de vistas (verificar si la tabla existe)
        $analytics_table = $wpdb->prefix . 'sfq_analytics';
        $table_exists = $wpdb->get_var("SHOW TABLES LIKE '$analytics_table'") === $analytics_table;
        
        $total_views = 0;
        if ($table_exists) {
            $total_views = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(DISTINCT session_id) FROM {$wpdb->prefix}sfq_analytics 
                WHERE form_id = %d AND event_type = 'view' {$date_condition['where']}",
                $query_params
            ));
        }
        
        // Si no hay vistas en analytics, usar el contador de submissions como aproximación
        if ($total_views == 0 && $total_responses > 0) {
            $total_views = $total_responses * 2; // Estimación conservadora
        }
        
        // Tasa de completado
        $completion_rate = 0;
        if ($total_views > 0) {
            $completion_rate = round(($total_responses / $total_views) * 100, 1);
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
        
        // Países únicos - construir consulta de forma más robusta
        $countries_query = "SELECT COUNT(DISTINCT user_ip) FROM {$wpdb->prefix}sfq_submissions 
                           WHERE form_id = %d AND status = 'completed' AND user_ip IS NOT NULL AND user_ip != ''";
        $countries_params = [$form_id];
        
        if (!empty($date_condition['params'])) {
            $countries_query .= $date_condition['where'];
            $countries_params = array_merge($countries_params, $date_condition['params']);
        }
        
        $countries_count = $wpdb->get_var($wpdb->prepare($countries_query, $countries_params));
        
        // Log de resultados para debugging
        error_log("SFQ Debug: Stats for form $form_id - Responses: $total_responses, Views: $total_views, Avg time: $avg_time, Countries: $countries_count");
        
        return array(
            'total_responses' => intval($total_responses),
            'total_views' => intval($total_views),
            'completion_rate' => $completion_rate,
            'avg_time' => $this->format_time(intval($avg_time)),
            'avg_time_seconds' => intval($avg_time),
            'countries_count' => intval($countries_count)
        );
    }
    
    /**
     * Calcular estadísticas por pregunta (MEJORADO)
     */
    private function calculate_questions_stats($form_id, $date_condition) {
        global $wpdb;
        
        // Debug: Log the input parameters
        error_log("SFQ Debug: calculate_questions_stats called with form_id: $form_id");
        error_log("SFQ Debug: date_condition: " . json_encode($date_condition));
        
        // Debug: Verify table exists and form_id parameter
        $table_name = $wpdb->prefix . 'sfq_questions';
        error_log("SFQ Debug: Querying table: $table_name");
        error_log("SFQ Debug: Form ID parameter: $form_id (type: " . gettype($form_id) . ")");
        
        // Debug: Check if table exists
        $table_exists = $wpdb->get_var("SHOW TABLES LIKE '$table_name'") === $table_name;
        error_log("SFQ Debug: Table $table_name exists: " . ($table_exists ? 'YES' : 'NO'));
        
        // Debug: Check wpdb last error before query
        error_log("SFQ Debug: wpdb last_error before query: " . $wpdb->last_error);
        
        // Obtener todas las preguntas del formulario
        $questions_query = "SELECT * FROM {$wpdb->prefix}sfq_questions WHERE form_id = %d ORDER BY order_position ASC";
        $prepared_questions_query = $wpdb->prepare($questions_query, $form_id);
        error_log("SFQ Debug: Questions query: " . $prepared_questions_query);
        
        // Execute query and check for errors
        $questions = $wpdb->get_results($prepared_questions_query);
        
        // Debug: Check for database errors after query
        if ($wpdb->last_error) {
            error_log("SFQ Debug: wpdb error after questions query: " . $wpdb->last_error);
        }
        
        // Debug: Check if wpdb->get_results returned false vs empty array
        if ($questions === false) {
            error_log("SFQ Debug: wpdb->get_results returned FALSE (database error)");
        } elseif ($questions === null) {
            error_log("SFQ Debug: wpdb->get_results returned NULL");
        } elseif (is_array($questions) && empty($questions)) {
            error_log("SFQ Debug: wpdb->get_results returned empty array (no results found)");
        }
        
        // Debug: Log raw result
        error_log("SFQ Debug: Raw questions result: " . print_r($questions, true));
        error_log("SFQ Debug: Questions found: " . count($questions));
        
        if (empty($questions)) {
            error_log("SFQ Debug: No questions found for form_id: $form_id");
            
            // Additional debugging: Check if any questions exist at all
            $all_questions = $wpdb->get_results("SELECT id, form_id, question_text FROM {$wpdb->prefix}sfq_questions LIMIT 10");
            error_log("SFQ Debug: Sample of all questions in database: " . print_r($all_questions, true));
            
            // Check if the specific form_id exists in questions table
            $form_questions_any = $wpdb->get_results($wpdb->prepare(
                "SELECT id, form_id, question_text FROM {$wpdb->prefix}sfq_questions WHERE form_id = %d",
                $form_id
            ));
            error_log("SFQ Debug: Direct query for form_id $form_id: " . print_r($form_questions_any, true));
            
            return array();
        }
        
        error_log("SFQ Debug: Successfully found " . count($questions) . " questions for form_id: $form_id");
        
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
            
            // Log de la consulta para debugging
            $prepared_query = $wpdb->prepare($base_query, $query_params);
            error_log("SFQ Debug: Query for question {$question->id}: " . $prepared_query);
            
            // Obtener todas las respuestas para esta pregunta
            $responses = $wpdb->get_results($prepared_query);
            
            error_log("SFQ Debug: Found " . count($responses) . " responses for question {$question->id}");
            
            // Total de respuestas para esta pregunta
            $total_responses = array_sum(array_column($responses, 'count'));
            
            // Procesar opciones según el tipo de pregunta
            $options_stats = array();
            
            if (in_array($question->question_type, ['single_choice', 'multiple_choice', 'image_choice'])) {
                // Para preguntas con opciones predefinidas
                $options = json_decode($question->options, true);
                
                if (is_array($options)) {
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
                        
                        $percentage = $total_responses > 0 ? round(($count / $total_responses) * 100, 1) : 0;
                        
                        $options_stats[] = array(
                            'option' => $option_text,
                            'count' => $count,
                            'percentage' => $percentage
                        );
                    }
                }
            } else if ($question->question_type == 'rating') {
                // Para preguntas de valoración
                $max_rating = intval($question->max_rating ?? 5);
                
                for ($i = 1; $i <= $max_rating; $i++) {
                    $count = 0;
                    foreach ($responses as $response) {
                        if ($response->answer == $i) {
                            $count = $response->count;
                            break;
                        }
                    }
                    
                    $percentage = $total_responses > 0 ? round(($count / $total_responses) * 100, 1) : 0;
                    
                    $options_stats[] = array(
                        'option' => $i . ' ' . str_repeat('⭐', $i),
                        'count' => $count,
                        'percentage' => $percentage
                    );
                }
            } else {
                // Para preguntas de texto, email, etc.
                // Mostrar las respuestas más comunes
                foreach ($responses as $response) {
                    if (count($options_stats) >= 10) break; // Limitar a 10 respuestas más comunes
                    
                    $percentage = $total_responses > 0 ? round(($response->count / $total_responses) * 100, 1) : 0;
                    
                    $options_stats[] = array(
                        'option' => substr($response->answer, 0, 50) . (strlen($response->answer) > 50 ? '...' : ''),
                        'count' => $response->count,
                        'percentage' => $percentage
                    );
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
        
        // Calcular porcentajes
        foreach ($countries_count as &$country) {
            $country['percentage'] = $total_responses > 0 ? 
                round(($country['count'] / $total_responses) * 100, 1) : 0;
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
                $params[] = date('Y-m-d', strtotime('-7 days'));
                break;
            case 'month':
                $where = ' AND DATE(completed_at) >= %s';
                $params[] = date('Y-m-d', strtotime('-30 days'));
                break;
            case 'year':
                $where = ' AND DATE(completed_at) >= %s';
                $params[] = date('Y-m-d', strtotime('-365 days'));
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
        
        // Log de verificación
        error_log("SFQ Debug: Form verification for ID $form_id: " . json_encode($verification));
        
        return $verification;
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
}
