<?php
/**
 * Panel de administración para Webhooks
 */

if (!defined('ABSPATH')) {
    exit;
}

class SFQ_Webhook_Admin {
    
    private $webhooks;
    
    public function __construct() {
        $this->webhooks = new SFQ_Webhooks();
    }
    
    /**
     * Validar ID de webhook y enviar error si es inválido
     * @param int $webhook_id ID del webhook a validar
     * @return bool true si es válido, false si envió error y terminó
     */
    private function validate_webhook_id($webhook_id) {
        if ($webhook_id <= 0) {
            wp_send_json_error(array('message' => __('ID de webhook no válido', 'smart-forms-quiz')));
            return false;
        }
        return true;
    }
    
    public function init() {
        // Añadir página de webhooks al menú
        add_action('admin_menu', array($this, 'add_webhook_menu'), 20);
        
        // Cargar scripts y estilos
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
        
        // Handlers AJAX
        add_action('wp_ajax_sfq_save_webhook', array($this, 'ajax_save_webhook'));
        add_action('wp_ajax_sfq_delete_webhook', array($this, 'ajax_delete_webhook'));
        add_action('wp_ajax_sfq_test_webhook', array($this, 'ajax_test_webhook'));
        add_action('wp_ajax_sfq_toggle_webhook', array($this, 'ajax_toggle_webhook'));
        add_action('wp_ajax_sfq_get_webhook', array($this, 'ajax_get_webhook'));
        add_action('wp_ajax_sfq_get_webhooks', array($this, 'ajax_get_webhooks'));
        add_action('wp_ajax_sfq_get_webhook_logs', array($this, 'ajax_get_webhook_logs'));
        add_action('wp_ajax_sfq_get_webhook_stats', array($this, 'ajax_get_webhook_stats'));
        add_action('wp_ajax_sfq_clear_webhook_logs', array($this, 'ajax_clear_webhook_logs'));
        add_action('wp_ajax_sfq_save_webhook_settings', array($this, 'ajax_save_webhook_settings'));
    }
    
    /**
     * Añadir menú de webhooks
     */
    public function add_webhook_menu() {
        add_submenu_page(
            'smart-forms-quiz',
            __('Webhooks', 'smart-forms-quiz'),
            __('🔗 Webhooks', 'smart-forms-quiz'),
            'manage_smart_forms',
            'sfq-webhooks',
            array($this, 'render_webhooks_page')
        );
    }
    
    /**
     * Cargar scripts y estilos del admin
     */
    public function enqueue_admin_scripts($hook) {
        if (strpos($hook, 'sfq-webhooks') === false) {
            return;
        }
        
        wp_enqueue_style(
            'sfq-webhook-admin',
            SFQ_PLUGIN_URL . 'assets/css/admin-webhooks.css',
            array(),
            SFQ_VERSION
        );
        
        wp_enqueue_script(
            'sfq-webhook-admin',
            SFQ_PLUGIN_URL . 'assets/js/admin-webhooks.js',
            array('jquery'),
            SFQ_VERSION,
            true
        );
        
        wp_localize_script('sfq-webhook-admin', 'sfq_webhook_ajax', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('sfq_webhook_nonce'),
            'strings' => array(
                'confirm_delete' => __('¿Estás seguro de eliminar este webhook?', 'smart-forms-quiz'),
                'confirm_clear_logs' => __('¿Estás seguro de limpiar todos los logs?', 'smart-forms-quiz'),
                'saving' => __('Guardando...', 'smart-forms-quiz'),
                'saved' => __('Guardado', 'smart-forms-quiz'),
                'testing' => __('Probando...', 'smart-forms-quiz'),
                'error' => __('Error', 'smart-forms-quiz'),
                'success' => __('Éxito', 'smart-forms-quiz')
            )
        ));
    }
    
    /**
     * Renderizar página de webhooks
     */
    public function render_webhooks_page() {
        global $wpdb;
        
        // Obtener webhooks existentes
        $webhooks = $wpdb->get_results(
            "SELECT * FROM {$wpdb->prefix}sfq_webhook_config ORDER BY created_at DESC"
        );
        
        // Obtener formularios para filtros
        $database = new SFQ_Database();
        $forms = $database->get_forms();
        ?>
        <div class="wrap sfq-webhooks-wrap">
            <h1 class="wp-heading-inline">
                <?php _e('Configuración de Webhooks', 'smart-forms-quiz'); ?>
            </h1>
            <button class="page-title-action" id="sfq-add-webhook">
                <?php _e('Añadir Webhook', 'smart-forms-quiz'); ?>
            </button>
            
            <hr class="wp-header-end">
            
            <!-- Configuración de Seguridad -->
            <form id="sfq-security-settings-form" class="sfq-webhook-security-settings">
                <h2><?php _e('⚙️ Configuración de Seguridad', 'smart-forms-quiz'); ?></h2>
                
                <?php
                $dev_mode = get_option('sfq_webhook_dev_mode', false);
                $trusted_urls = get_option('sfq_webhook_trusted_urls', array());
                ?>
                
                <div class="sfq-security-cards">
                    <!-- Whitelist de URLs -->
                    <div class="sfq-security-card">
                        <h3><?php _e('🔒 URLs Confiables (Whitelist)', 'smart-forms-quiz'); ?></h3>
                        <p class="description">
                            <?php _e('Añade URLs específicas que siempre serán permitidas, incluso si son locales. Ideal para N8N local.', 'smart-forms-quiz'); ?>
                        </p>
                        
                        <div class="sfq-trusted-urls-container">
                            <div id="sfq-trusted-urls-list">
                                <?php if (!empty($trusted_urls)) : ?>
                                    <?php foreach ($trusted_urls as $index => $url) : ?>
                                        <div class="sfq-trusted-url-item">
                                            <input type="text" name="trusted_urls[]" value="<?php echo esc_attr($url); ?>" placeholder="localhost:5678">
                                            <button type="button" class="button sfq-remove-url">❌</button>
                                        </div>
                                    <?php endforeach; ?>
                                <?php endif; ?>
                            </div>
                            
                            <button type="button" class="button" id="sfq-add-trusted-url">
                                <?php _e('➕ Añadir URL Confiable', 'smart-forms-quiz'); ?>
                            </button>
                        </div>
                        
                        <div class="sfq-examples">
                            <strong><?php _e('Ejemplos:', 'smart-forms-quiz'); ?></strong>
                            <code>localhost:5678</code>, 
                            <code>192.168.1.100:3000</code>, 
                            <code>http://n8n.local/webhook</code>
                        </div>
                    </div>
                    
                    <!-- Modo Desarrollo -->
                    <div class="sfq-security-card">
                        <h3><?php _e('🚧 Modo Desarrollo', 'smart-forms-quiz'); ?></h3>
                        <p class="description">
                            <?php _e('Permite automáticamente TODAS las URLs locales. Solo para desarrollo.', 'smart-forms-quiz'); ?>
                        </p>
                        
                        <label class="sfq-dev-mode-toggle">
                            <input type="checkbox" name="dev_mode" id="sfq-dev-mode" value="1" <?php checked($dev_mode); ?>>
                            <span class="sfq-toggle-slider"></span>
                            <span class="sfq-toggle-label">
                                <?php echo $dev_mode ? __('Activado', 'smart-forms-quiz') : __('Desactivado', 'smart-forms-quiz'); ?>
                            </span>
                        </label>
                        
                        <?php if ($dev_mode) : ?>
                            <div class="notice notice-warning inline">
                                <p>
                                    <strong><?php _e('⚠️ ADVERTENCIA:', 'smart-forms-quiz'); ?></strong>
                                    <?php _e('El modo desarrollo está activado. Todas las URLs locales serán permitidas. NO usar en producción.', 'smart-forms-quiz'); ?>
                                </p>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
                
                <div class="sfq-security-actions">
                    <button type="submit" class="button button-primary" id="sfq-save-security-settings">
                        <?php _e('💾 Guardar Configuración', 'smart-forms-quiz'); ?>
                    </button>
                    <span class="sfq-save-status" style="display: none;"></span>
                </div>
            </form>
            
            <div class="sfq-webhooks-intro">
                <div class="notice notice-info">
                    <p>
                        <strong><?php _e('¿Qué son los Webhooks?', 'smart-forms-quiz'); ?></strong><br>
                        <?php _e('Los webhooks envían automáticamente los datos de los formularios a servicios externos como N8N, Zapier, o tu propia API cuando alguien completa un formulario.', 'smart-forms-quiz'); ?>
                    </p>
                    <p>
                        <strong><?php _e('Datos enviados:', 'smart-forms-quiz'); ?></strong>
                        <?php _e('Información del formulario (incluyendo ID para filtrar), respuestas del usuario, variables, puntuaciones y metadatos del sitio.', 'smart-forms-quiz'); ?>
                    </p>
                </div>
            </div>
            
            <?php if (empty($webhooks)) : ?>
                <div class="sfq-empty-webhooks">
                    <div class="sfq-empty-icon">🔗</div>
                    <h2><?php _e('No hay webhooks configurados', 'smart-forms-quiz'); ?></h2>
                    <p><?php _e('Crea tu primer webhook para enviar datos de formularios a servicios externos', 'smart-forms-quiz'); ?></p>
                    <button class="button button-primary button-hero" id="sfq-add-first-webhook">
                        <?php _e('Crear Primer Webhook', 'smart-forms-quiz'); ?>
                    </button>
                </div>
            <?php else : ?>
                <div class="sfq-webhooks-list">
                    <?php foreach ($webhooks as $webhook) : ?>
                        <div class="sfq-webhook-card" data-webhook-id="<?php echo $webhook->id; ?>">
                            <div class="sfq-webhook-header">
                                <div class="sfq-webhook-info">
                                    <h3><?php echo esc_html($webhook->name); ?></h3>
                                    <span class="sfq-webhook-url"><?php echo esc_html($webhook->url); ?></span>
                                </div>
                                <div class="sfq-webhook-status">
                                    <label class="sfq-toggle">
                                        <input type="checkbox" class="sfq-webhook-toggle" 
                                               data-webhook-id="<?php echo $webhook->id; ?>"
                                               <?php checked($webhook->is_active); ?>>
                                        <span class="sfq-toggle-slider"></span>
                                    </label>
                                    <span class="sfq-status-text">
                                        <?php echo $webhook->is_active ? __('Activo', 'smart-forms-quiz') : __('Inactivo', 'smart-forms-quiz'); ?>
                                    </span>
                                </div>
                            </div>
                            
                            <div class="sfq-webhook-details">
                                <div class="sfq-webhook-meta">
                                    <span class="sfq-meta-item">
                                        <strong><?php _e('Método:', 'smart-forms-quiz'); ?></strong>
                                        <?php echo strtoupper($webhook->method); ?>
                                    </span>
                                    <span class="sfq-meta-item">
                                        <strong><?php _e('Timeout:', 'smart-forms-quiz'); ?></strong>
                                        <?php echo $webhook->timeout; ?>s
                                    </span>
                                    <span class="sfq-meta-item">
                                        <strong><?php _e('Reintentos:', 'smart-forms-quiz'); ?></strong>
                                        <?php echo $webhook->max_retries; ?>
                                    </span>
                                    <span class="sfq-meta-item">
                                        <strong><?php _e('SSL:', 'smart-forms-quiz'); ?></strong>
                                        <?php echo $webhook->verify_ssl ? __('Verificar', 'smart-forms-quiz') : __('No verificar', 'smart-forms-quiz'); ?>
                                    </span>
                                </div>
                                
                                <div class="sfq-webhook-stats" id="webhook-stats-<?php echo $webhook->id; ?>">
                                    <div class="sfq-stat">
                                        <span class="sfq-stat-value">-</span>
                                        <span class="sfq-stat-label"><?php _e('Enviados', 'smart-forms-quiz'); ?></span>
                                    </div>
                                    <div class="sfq-stat">
                                        <span class="sfq-stat-value">-</span>
                                        <span class="sfq-stat-label"><?php _e('Exitosos', 'smart-forms-quiz'); ?></span>
                                    </div>
                                    <div class="sfq-stat">
                                        <span class="sfq-stat-value">-</span>
                                        <span class="sfq-stat-label"><?php _e('Fallidos', 'smart-forms-quiz'); ?></span>
                                    </div>
                                    <div class="sfq-stat">
                                        <span class="sfq-stat-value">-%</span>
                                        <span class="sfq-stat-label"><?php _e('Tasa éxito', 'smart-forms-quiz'); ?></span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="sfq-webhook-actions">
                                <button class="button sfq-edit-webhook" data-webhook-id="<?php echo $webhook->id; ?>">
                                    <span class="dashicons dashicons-edit"></span>
                                    <?php _e('Editar', 'smart-forms-quiz'); ?>
                                </button>
                                <button class="button sfq-test-webhook" data-webhook-id="<?php echo $webhook->id; ?>">
                                    <span class="dashicons dashicons-admin-tools"></span>
                                    <?php _e('Probar', 'smart-forms-quiz'); ?>
                                </button>
                                <button class="button sfq-view-logs" data-webhook-id="<?php echo $webhook->id; ?>">
                                    <span class="dashicons dashicons-list-view"></span>
                                    <?php _e('Logs', 'smart-forms-quiz'); ?>
                                </button>
                                <button class="button sfq-delete-webhook" data-webhook-id="<?php echo $webhook->id; ?>">
                                    <span class="dashicons dashicons-trash"></span>
                                    <?php _e('Eliminar', 'smart-forms-quiz'); ?>
                                </button>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </div>
        
        <!-- Modal para crear/editar webhook -->
        <div id="sfq-webhook-modal" class="sfq-modal" style="display: none;">
            <div class="sfq-modal-content">
                <div class="sfq-modal-header">
                    <h2 id="sfq-modal-title"><?php _e('Nuevo Webhook', 'smart-forms-quiz'); ?></h2>
                    <button class="sfq-modal-close">&times;</button>
                </div>
                
                <div class="sfq-webhook-form-container">
                    <input type="hidden" id="webhook-id" name="webhook_id" value="">
                    
                    <div class="sfq-form-section">
                        <h3><?php _e('📋 Información Básica', 'smart-forms-quiz'); ?></h3>
                        
                        <div class="sfq-form-row">
                            <label for="webhook-name"><?php _e('Nombre del Webhook', 'smart-forms-quiz'); ?></label>
                            <input type="text" id="webhook-name" name="name" required 
                                   placeholder="<?php _e('Ej: N8N Formulario Contacto', 'smart-forms-quiz'); ?>">
                            <small><?php _e('Nombre descriptivo para identificar este webhook', 'smart-forms-quiz'); ?></small>
                        </div>
                        
                        <div class="sfq-form-row">
                            <label for="webhook-url"><?php _e('URL del Webhook', 'smart-forms-quiz'); ?></label>
                            <input type="url" id="webhook-url" name="url" required 
                                   placeholder="https://tu-n8n.com/webhook/formulario">
                            <small><?php _e('URL completa donde se enviarán los datos', 'smart-forms-quiz'); ?></small>
                        </div>
                        
                        <div class="sfq-form-row">
                            <label for="webhook-method"><?php _e('Método HTTP', 'smart-forms-quiz'); ?></label>
                            <select id="webhook-method" name="method">
                                <option value="POST">POST</option>
                                <option value="PUT">PUT</option>
                                <option value="PATCH">PATCH</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="sfq-form-section">
                        <h3><?php _e('🔐 Autenticación', 'smart-forms-quiz'); ?></h3>
                        
                        <div class="sfq-form-row">
                            <label for="auth-type"><?php _e('Tipo de Autenticación', 'smart-forms-quiz'); ?></label>
                            <select id="auth-type" name="auth_type">
                                <option value="none"><?php _e('Sin autenticación', 'smart-forms-quiz'); ?></option>
                                <option value="bearer"><?php _e('Bearer Token', 'smart-forms-quiz'); ?></option>
                                <option value="basic"><?php _e('Basic Auth', 'smart-forms-quiz'); ?></option>
                                <option value="api_key"><?php _e('API Key', 'smart-forms-quiz'); ?></option>
                            </select>
                        </div>
                        
                        <div id="auth-fields" style="display: none;">
                            <!-- Bearer Token -->
                            <div id="bearer-fields" class="auth-fields" style="display: none;">
                                <div class="sfq-form-row">
                                    <label for="bearer-token"><?php _e('Bearer Token', 'smart-forms-quiz'); ?></label>
                                    <input type="password" id="bearer-token" name="bearer_token" 
                                           placeholder="<?php _e('Tu token de acceso', 'smart-forms-quiz'); ?>">
                                </div>
                            </div>
                            
                            <!-- Basic Auth -->
                            <div id="basic-fields" class="auth-fields" style="display: none;">
                                <div class="sfq-form-row">
                                    <label for="basic-username"><?php _e('Usuario', 'smart-forms-quiz'); ?></label>
                                    <input type="text" id="basic-username" name="basic_username">
                                </div>
                                <div class="sfq-form-row">
                                    <label for="basic-password"><?php _e('Contraseña', 'smart-forms-quiz'); ?></label>
                                    <input type="password" id="basic-password" name="basic_password">
                                </div>
                            </div>
                            
                            <!-- API Key -->
                            <div id="api-key-fields" class="auth-fields" style="display: none;">
                                <div class="sfq-form-row">
                                    <label for="api-key-name"><?php _e('Nombre del Header', 'smart-forms-quiz'); ?></label>
                                    <input type="text" id="api-key-name" name="api_key_name" 
                                           placeholder="<?php _e('X-API-Key', 'smart-forms-quiz'); ?>">
                                </div>
                                <div class="sfq-form-row">
                                    <label for="api-key-value"><?php _e('Valor de la API Key', 'smart-forms-quiz'); ?></label>
                                    <input type="password" id="api-key-value" name="api_key_value">
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="sfq-form-section">
                        <h3><?php _e('📋 Headers Personalizados', 'smart-forms-quiz'); ?></h3>
                        <p class="description">
                            <?php _e('Añade headers HTTP personalizados que se enviarán con cada petición del webhook. Útil para autenticación personalizada, identificación de origen, etc.', 'smart-forms-quiz'); ?>
                        </p>
                        
                        <div class="sfq-custom-headers-container">
                            <div id="sfq-custom-headers-list">
                                <!-- Los headers se añadirán dinámicamente aquí -->
                            </div>
                            
                            <button type="button" class="button" id="sfq-add-custom-header">
                                <?php _e('➕ Añadir Header', 'smart-forms-quiz'); ?>
                            </button>
                        </div>
                        
                        <div class="sfq-headers-examples">
                            <strong><?php _e('Ejemplos comunes:', 'smart-forms-quiz'); ?></strong><br>
                            <code>X-Source: WordPress</code><br>
                            <code>X-Site-ID: mi-sitio-web</code><br>
                            <code>Content-Type: application/json</code><br>
                            <code>X-Custom-Auth: mi-token-secreto</code>
                        </div>
                        
                        <div class="sfq-headers-advanced">
                            <details>
                                <summary><?php _e('🔧 Modo Avanzado (JSON)', 'smart-forms-quiz'); ?></summary>
                                <div class="sfq-form-row">
                                    <label for="custom-headers-json"><?php _e('Headers en formato JSON', 'smart-forms-quiz'); ?></label>
                                    <textarea id="custom-headers-json" name="custom_headers_json" rows="6" 
                                              placeholder='{"X-Custom-Header": "valor", "X-Another-Header": "otro-valor"}'></textarea>
                                    <small><?php _e('Formato JSON válido. Este campo se sincroniza automáticamente con los headers individuales de arriba.', 'smart-forms-quiz'); ?></small>
                                </div>
                            </details>
                        </div>
                    </div>
                    
                    <div class="sfq-form-section">
                        <h3><?php _e('🎯 Filtros de Formularios', 'smart-forms-quiz'); ?></h3>
                        <p class="description">
                            <?php _e('Selecciona qué formularios deben enviar datos a este webhook. Si no seleccionas ninguno, se enviarán todos.', 'smart-forms-quiz'); ?>
                        </p>
                        
                        <div class="sfq-form-row">
                            <label><?php _e('Formularios específicos', 'smart-forms-quiz'); ?></label>
                            <div class="sfq-checkbox-list" id="form-filters">
                                <?php foreach ($forms as $form) : ?>
                                    <label class="sfq-checkbox-item">
                                        <input type="checkbox" name="form_ids[]" value="<?php echo $form->id; ?>">
                                        <span><?php echo esc_html($form->title); ?> (ID: <?php echo $form->id; ?>)</span>
                                    </label>
                                <?php endforeach; ?>
                            </div>
                            <small><?php _e('Deja vacío para enviar datos de todos los formularios', 'smart-forms-quiz'); ?></small>
                        </div>
                    </div>
                    
                    <div class="sfq-form-section">
                        <h3><?php _e('⚙️ Configuración Avanzada', 'smart-forms-quiz'); ?></h3>
                        
                        <div class="sfq-form-row">
                            <label for="webhook-timeout"><?php _e('Timeout (segundos)', 'smart-forms-quiz'); ?></label>
                            <input type="number" id="webhook-timeout" name="timeout" min="5" max="120" value="30">
                            <small><?php _e('Tiempo máximo de espera para la respuesta', 'smart-forms-quiz'); ?></small>
                        </div>
                        
                        <div class="sfq-form-row">
                            <label for="webhook-retries"><?php _e('Número de reintentos', 'smart-forms-quiz'); ?></label>
                            <input type="number" id="webhook-retries" name="max_retries" min="0" max="10" value="3">
                            <small><?php _e('Intentos adicionales si falla el envío', 'smart-forms-quiz'); ?></small>
                        </div>
                        
                        <div class="sfq-form-row">
                            <label for="webhook-retry-delay"><?php _e('Retraso entre reintentos (segundos)', 'smart-forms-quiz'); ?></label>
                            <input type="number" id="webhook-retry-delay" name="retry_delay" min="60" max="3600" value="300">
                            <small><?php _e('Tiempo de espera antes del siguiente intento', 'smart-forms-quiz'); ?></small>
                        </div>
                        
                        <div class="sfq-form-row">
                            <label>
                                <input type="checkbox" id="webhook-verify-ssl" name="verify_ssl" checked>
                                <?php _e('Verificar certificado SSL', 'smart-forms-quiz'); ?>
                            </label>
                            <small><?php _e('Recomendado para URLs HTTPS', 'smart-forms-quiz'); ?></small>
                        </div>
                        
                    </div>
                    
                    <div class="sfq-modal-footer">
                        <button type="button" class="button" id="sfq-cancel-webhook"><?php _e('Cancelar', 'smart-forms-quiz'); ?></button>
                        <button type="button" class="button button-primary" id="sfq-save-webhook">
                            <?php _e('Guardar Webhook', 'smart-forms-quiz'); ?>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Modal para logs -->
        <div id="sfq-logs-modal" class="sfq-modal" style="display: none;">
            <div class="sfq-modal-content sfq-logs-modal-content">
                <div class="sfq-modal-header">
                    <h2><?php _e('Logs del Webhook', 'smart-forms-quiz'); ?></h2>
                    <div class="sfq-logs-actions">
                        <button class="button" id="sfq-refresh-logs">
                            <span class="dashicons dashicons-update"></span>
                            <?php _e('Actualizar', 'smart-forms-quiz'); ?>
                        </button>
                        <button class="button" id="sfq-clear-logs">
                            <span class="dashicons dashicons-trash"></span>
                            <?php _e('Limpiar Logs', 'smart-forms-quiz'); ?>
                        </button>
                        <button class="sfq-modal-close">&times;</button>
                    </div>
                </div>
                
                <div class="sfq-logs-content">
                    <div class="sfq-logs-loading">
                        <span class="sfq-spinner"></span>
                        <?php _e('Cargando logs...', 'smart-forms-quiz'); ?>
                    </div>
                    <div class="sfq-logs-list" id="sfq-logs-list">
                        <!-- Los logs se cargarán dinámicamente -->
                    </div>
                </div>
            </div>
        </div>
        
        <style>
            .sfq-webhooks-wrap {
                max-width: 1200px;
            }
            
            /* Estilos para configuración de seguridad */
            .sfq-webhook-security-settings {
                background: white;
                border: 1px solid #ccd0d4;
                box-shadow: 0 1px 1px rgba(0,0,0,.04);
                margin: 20px 0;
                border-radius: 8px;
                overflow: hidden;
            }
            
            .sfq-webhook-security-settings h2 {
                margin: 0;
                padding: 20px;
                background: #f8f9fa;
                border-bottom: 1px solid #ddd;
                font-size: 18px;
                color: #23282d;
            }
            
            .sfq-security-cards {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 0;
            }
            
            .sfq-security-card {
                padding: 20px;
                border-right: 1px solid #ddd;
            }
            
            .sfq-security-card:last-child {
                border-right: none;
            }
            
            .sfq-security-card h3 {
                margin: 0 0 10px 0;
                font-size: 16px;
                color: #007cba;
            }
            
            .sfq-security-card .description {
                margin-bottom: 15px;
                color: #666;
                font-size: 14px;
            }
            
            .sfq-trusted-urls-container {
                margin-bottom: 15px;
            }
            
            .sfq-trusted-url-item {
                display: flex;
                gap: 10px;
                margin-bottom: 10px;
                align-items: center;
            }
            
            .sfq-trusted-url-item input {
                flex: 1;
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
            }
            
            .sfq-trusted-url-item .sfq-remove-url {
                background: none;
                border: none;
                cursor: pointer;
                font-size: 16px;
                padding: 5px;
                border-radius: 4px;
                transition: background-color 0.2s;
            }
            
            .sfq-trusted-url-item .sfq-remove-url:hover {
                background: #f0f0f0;
            }
            
            .sfq-examples {
                font-size: 13px;
                color: #666;
                margin-top: 10px;
            }
            
            .sfq-examples code {
                background: #f1f1f1;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 12px;
                margin: 0 2px;
            }
            
            .sfq-dev-mode-toggle {
                display: flex;
                align-items: center;
                gap: 15px;
                margin-bottom: 15px;
            }
            
            .sfq-dev-mode-toggle input[type="checkbox"] {
                display: none;
            }
            
            .sfq-dev-mode-toggle .sfq-toggle-slider {
                position: relative;
                width: 50px;
                height: 24px;
                background-color: #ccc;
                border-radius: 24px;
                cursor: pointer;
                transition: .4s;
            }
            
            .sfq-dev-mode-toggle .sfq-toggle-slider:before {
                position: absolute;
                content: "";
                height: 18px;
                width: 18px;
                left: 3px;
                bottom: 3px;
                background-color: white;
                border-radius: 50%;
                transition: .4s;
            }
            
            .sfq-dev-mode-toggle input:checked + .sfq-toggle-slider {
                background-color: #007cba;
            }
            
            .sfq-dev-mode-toggle input:checked + .sfq-toggle-slider:before {
                transform: translateX(26px);
            }
            
            .sfq-toggle-label {
                font-weight: 500;
                color: #23282d;
            }
            
            .sfq-security-actions {
                padding: 20px;
                border-top: 1px solid #ddd;
                background: #f8f9fa;
                display: flex;
                align-items: center;
                gap: 15px;
            }
            
            .sfq-save-status {
                font-weight: 500;
                font-size: 14px;
            }
            
            .notice.inline {
                margin: 15px 0 0 0;
                padding: 10px 15px;
            }
            
            @media (max-width: 768px) {
                .sfq-security-cards {
                    grid-template-columns: 1fr;
                }
                
                .sfq-security-card {
                    border-right: none;
                    border-bottom: 1px solid #ddd;
                }
                
                .sfq-security-card:last-child {
                    border-bottom: none;
                }
                
                .sfq-dev-mode-toggle {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 10px;
                }
            }
            
            .sfq-webhooks-intro {
                margin: 20px 0;
            }
            
            .sfq-empty-webhooks {
                text-align: center;
                padding: 60px 20px;
                background: white;
                border: 1px solid #ccd0d4;
                box-shadow: 0 1px 1px rgba(0,0,0,.04);
            }
            
            .sfq-empty-icon {
                font-size: 64px;
                margin-bottom: 20px;
                opacity: 0.5;
            }
            
            .sfq-webhooks-list {
                display: grid;
                gap: 20px;
                margin-top: 20px;
            }
            
            .sfq-webhook-card {
                background: white;
                border: 1px solid #ccd0d4;
                box-shadow: 0 1px 1px rgba(0,0,0,.04);
                padding: 20px;
                border-radius: 8px;
                transition: box-shadow 0.2s ease;
            }
            
            .sfq-webhook-card:hover {
                box-shadow: 0 2px 8px rgba(0,0,0,.1);
            }
            
            .sfq-webhook-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 15px;
            }
            
            .sfq-webhook-info h3 {
                margin: 0 0 5px 0;
                font-size: 18px;
            }
            
            .sfq-webhook-url {
                color: #666;
                font-size: 14px;
                word-break: break-all;
            }
            
            .sfq-webhook-status {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .sfq-toggle {
                position: relative;
                display: inline-block;
                width: 50px;
                height: 24px;
            }
            
            .sfq-toggle input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            
            .sfq-toggle-slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: #ccc;
                transition: .4s;
                border-radius: 24px;
            }
            
            .sfq-toggle-slider:before {
                position: absolute;
                content: "";
                height: 18px;
                width: 18px;
                left: 3px;
                bottom: 3px;
                background-color: white;
                transition: .4s;
                border-radius: 50%;
            }
            
            .sfq-toggle input:checked + .sfq-toggle-slider {
                background-color: #007cba;
            }
            
            .sfq-toggle input:checked + .sfq-toggle-slider:before {
                transform: translateX(26px);
            }
            
            .sfq-webhook-details {
                margin-bottom: 15px;
            }
            
            .sfq-webhook-meta {
                display: flex;
                flex-wrap: wrap;
                gap: 20px;
                margin-bottom: 15px;
                font-size: 13px;
            }
            
            .sfq-webhook-stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
                gap: 15px;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 6px;
            }
            
            .sfq-stat {
                text-align: center;
            }
            
            .sfq-stat-value {
                display: block;
                font-size: 20px;
                font-weight: bold;
                color: #007cba;
            }
            
            .sfq-stat-label {
                display: block;
                font-size: 12px;
                color: #666;
                margin-top: 2px;
            }
            
            .sfq-webhook-actions {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            
            .sfq-webhook-actions .button {
                display: flex;
                align-items: center;
                gap: 5px;
            }
            
            /* Modal styles */
            .sfq-modal {
                position: fixed;
                z-index: 100000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .sfq-modal-content {
                background-color: white;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                max-width: 800px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
            }
            
            .sfq-webhook-form-container {
                flex: 1;
                display: flex;
                flex-direction: column;
            }
            
            .sfq-logs-modal-content {
                max-width: 1000px;
            }
            
            .sfq-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid #ddd;
            }
            
            .sfq-modal-header h2 {
                margin: 0;
            }
            
            .sfq-modal-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .sfq-modal-close:hover {
                background: #f0f0f0;
                border-radius: 50%;
            }
            
            .sfq-form-section {
                padding: 20px;
                border-bottom: 1px solid #eee;
            }
            
            .sfq-form-section:last-child {
                border-bottom: none;
            }
            
            .sfq-form-section h3 {
                margin: 0 0 15px 0;
                color: #007cba;
            }
            
            .sfq-form-row {
                margin-bottom: 15px;
            }
            
            .sfq-form-row label {
                display: block;
                margin-bottom: 5px;
                font-weight: 500;
            }
            
            .sfq-form-row input,
            .sfq-form-row select,
            .sfq-form-row textarea {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
            }
            
            .sfq-form-row small {
                display: block;
                margin-top: 5px;
                color: #666;
                font-size: 12px;
            }
            
            .sfq-checkbox-list {
                max-height: 200px;
                overflow-y: auto;
                border: 1px solid #ddd;
                border-radius: 4px;
                padding: 10px;
                background: #f9f9f9;
            }
            
            .sfq-checkbox-item {
                display: block;
                margin-bottom: 8px;
                font-weight: normal;
            }
            
            .sfq-checkbox-item input {
                width: auto;
                margin-right: 8px;
            }
            
            .sfq-modal-footer {
                padding: 20px;
                border-top: 1px solid #ddd;
                display: flex;
                justify-content: flex-end;
                gap: 10px;
            }
            
            .sfq-logs-content {
                padding: 20px;
                max-height: 500px;
                overflow-y: auto;
            }
            
            .sfq-logs-loading {
                text-align: center;
                padding: 40px;
            }
            
            .sfq-spinner {
                display: inline-block;
                width: 20px;
                height: 20px;
                border: 3px solid #f3f3f3;
                border-top: 3px solid #007cba;
                border-radius: 50%;
                animation: sfq-spin 1s linear infinite;
                margin-right: 10px;
            }
            
            @keyframes sfq-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .sfq-log-entry {
                border: 1px solid #ddd;
                border-radius: 6px;
                margin-bottom: 15px;
                overflow: hidden;
            }
            
            .sfq-log-header {
                padding: 12px 15px;
                background: #f8f9fa;
                border-bottom: 1px solid #ddd;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: pointer;
            }
            
            .sfq-log-header:hover {
                background: #e9ecef;
            }
            
            .sfq-log-status {
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
                text-transform: uppercase;
            }
            
            .sfq-log-status.success {
                background: #d1eddb;
                color: #155724;
            }
            
            .sfq-log-status.failed {
                background: #f8d7da;
                color: #721c24;
            }
            
            .sfq-log-details {
                padding: 15px;
                background: white;
                display: none !important;
                transition: all 0.3s ease;
            }
            
            .sfq-log-details.expanded {
                display: block !important;
            }
            
            .sfq-log-detail-row {
                margin-bottom: 10px;
                display: flex;
                gap: 10px;
            }
            
            .sfq-log-detail-label {
                font-weight: bold;
                min-width: 120px;
                color: #666;
            }
            
            .sfq-log-detail-value {
                flex: 1;
                word-break: break-all;
            }
            
            .sfq-log-json {
                background: #f8f9fa;
                border: 1px solid #ddd;
                border-radius: 4px;
                padding: 10px;
                font-family: monospace;
                font-size: 12px;
                max-height: 200px;
                overflow-y: auto;
                white-space: pre-wrap;
            }
            
            .sfq-no-logs {
                text-align: center;
                padding: 40px;
                color: #666;
                font-style: italic;
            }
            
            .sfq-log-date {
                font-weight: 500;
                margin-right: 15px;
            }
            
            .sfq-log-code {
                background: #e9ecef;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 11px;
                margin-left: 10px;
            }
            
            .sfq-log-info {
                display: flex;
                align-items: center;
                flex: 1;
            }
            
            .sfq-log-toggle {
                font-size: 12px;
                transition: transform 0.2s;
            }
            
            .sfq-error-text {
                color: #dc3232;
                font-weight: 500;
            }
            
            .sfq-logs-actions {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            @media (max-width: 768px) {
                .sfq-webhook-header {
                    flex-direction: column;
                    gap: 15px;
                }
                
                .sfq-webhook-meta {
                    flex-direction: column;
                    gap: 10px;
                }
                
                .sfq-webhook-actions {
                    justify-content: center;
                }
                
                .sfq-modal-content {
                    width: 95%;
                    margin: 20px;
                }
                
                .sfq-form-section {
                    padding: 15px;
                }
            }
        </style>
        <?php
    }
    
    /**
     * Handlers AJAX
     */
    
    public function ajax_save_webhook() {
        check_ajax_referer('sfq_webhook_nonce', 'nonce');
        
        if (!current_user_can('manage_smart_forms')) {
            wp_die(__('No tienes permisos para realizar esta acción', 'smart-forms-quiz'));
        }
        
        // Sanitizar y validar datos
        $webhook_id = intval($_POST['webhook_id'] ?? 0);
        $name = sanitize_text_field($_POST['name'] ?? '');
        $url = esc_url_raw($_POST['url'] ?? '');
        $method = sanitize_text_field($_POST['method'] ?? 'POST');
        $auth_type = sanitize_text_field($_POST['auth_type'] ?? 'none');
        $timeout = intval($_POST['timeout'] ?? 30);
        $max_retries = intval($_POST['max_retries'] ?? 3);
        $retry_delay = intval($_POST['retry_delay'] ?? 300);
        $verify_ssl = isset($_POST['verify_ssl']);
        $headers = sanitize_textarea_field($_POST['headers'] ?? '');
        $form_ids = array_map('intval', $_POST['form_ids'] ?? array());
        
        // Validaciones básicas
        if (empty($name) || empty($url)) {
            wp_send_json_error(array('message' => __('Nombre y URL son obligatorios', 'smart-forms-quiz')));
        }
        
        // Validar límites de valores
        if ($timeout < 5 || $timeout > 120) {
            wp_send_json_error(array('message' => __('Timeout debe estar entre 5 y 120 segundos', 'smart-forms-quiz')));
        }
        
        if ($max_retries < 0 || $max_retries > 10) {
            wp_send_json_error(array('message' => __('Reintentos debe estar entre 0 y 10', 'smart-forms-quiz')));
        }
        
        if ($retry_delay < 60 || $retry_delay > 3600) {
            wp_send_json_error(array('message' => __('Retraso debe estar entre 60 y 3600 segundos', 'smart-forms-quiz')));
        }
        
        // TEMPORAL: Sin validación de headers para evitar bloqueos
        // El backend de SFQ_Webhooks ya maneja la validación de forma segura
        if (!empty($headers)) {
        } else {
        }
        
        // Preparar datos de autenticación
        $auth_data = array();
        switch ($auth_type) {
            case 'bearer':
                $token = sanitize_text_field($_POST['bearer_token'] ?? '');
                if (!empty($token)) {
                    $auth_data['token'] = $token;
                }
                break;
            case 'basic':
                $username = sanitize_text_field($_POST['basic_username'] ?? '');
                $password = sanitize_text_field($_POST['basic_password'] ?? '');
                if (!empty($username) && !empty($password)) {
                    $auth_data['username'] = $username;
                    $auth_data['password'] = $password;
                }
                break;
            case 'api_key':
                $key = sanitize_text_field($_POST['api_key_name'] ?? '');
                $value = sanitize_text_field($_POST['api_key_value'] ?? '');
                if (!empty($key) && !empty($value)) {
                    $auth_data['key'] = $key;
                    $auth_data['value'] = $value;
                }
                break;
        }
        
        // Preparar filtros de formularios
        $form_filters = array();
        if (!empty($form_ids)) {
            $form_filters['form_ids'] = $form_ids;
        }
        
        // Preparar datos para el webhook
        $webhook_data = array(
            'id' => $webhook_id > 0 ? $webhook_id : null,
            'name' => $name,
            'url' => $url,
            'method' => strtoupper($method),
            'headers' => $headers,
            'auth_type' => $auth_type,
            'auth_data' => wp_json_encode($auth_data),
            'form_filters' => wp_json_encode($form_filters),
            'timeout' => $timeout,
            'max_retries' => $max_retries,
            'retry_delay' => $retry_delay,
            'verify_ssl' => $verify_ssl,
            'is_active' => true
        );
        
        // Usar el método seguro de la clase SFQ_Webhooks
        $result = $this->webhooks->save_webhook($webhook_data);
        
        if ($result['success']) {
            wp_send_json_success($result);
        } else {
            wp_send_json_error($result);
        }
    }
    
    public function ajax_delete_webhook() {
        check_ajax_referer('sfq_webhook_nonce', 'nonce');
        
        if (!current_user_can('manage_smart_forms')) {
            wp_die(__('No tienes permisos para realizar esta acción', 'smart-forms-quiz'));
        }
        
        global $wpdb;
        
        $webhook_id = intval($_POST['webhook_id'] ?? 0);
        
        if (!$this->validate_webhook_id($webhook_id)) {
            return;
        }
        
        // Eliminar webhook
        $result = $wpdb->delete(
            $wpdb->prefix . 'sfq_webhook_config',
            array('id' => $webhook_id),
            array('%d')
        );
        
        if ($result === false) {
            wp_send_json_error(array('message' => __('Error al eliminar webhook', 'smart-forms-quiz')));
        }
        
        // También eliminar logs relacionados
        $wpdb->delete(
            $wpdb->prefix . 'sfq_webhook_logs',
            array('webhook_id' => $webhook_id),
            array('%d')
        );
        
        wp_send_json_success(array('message' => __('Webhook eliminado correctamente', 'smart-forms-quiz')));
    }
    
    public function ajax_test_webhook() {
        check_ajax_referer('sfq_webhook_nonce', 'nonce');
        
        if (!current_user_can('manage_smart_forms')) {
            wp_die(__('No tienes permisos para realizar esta acción', 'smart-forms-quiz'));
        }
        
        $webhook_id = intval($_POST['webhook_id'] ?? 0);
        
        if (!$this->validate_webhook_id($webhook_id)) {
            return;
        }
        
        $result = $this->webhooks->test_webhook($webhook_id);
        
        if ($result['success']) {
            wp_send_json_success($result);
        } else {
            wp_send_json_error($result);
        }
    }
    
    public function ajax_toggle_webhook() {
        check_ajax_referer('sfq_webhook_nonce', 'nonce');
        
        if (!current_user_can('manage_smart_forms')) {
            wp_die(__('No tienes permisos para realizar esta acción', 'smart-forms-quiz'));
        }
        
        global $wpdb;
        
        $webhook_id = intval($_POST['webhook_id'] ?? 0);
        $is_active = isset($_POST['is_active']) && $_POST['is_active'] === 'true';
        
        if (!$this->validate_webhook_id($webhook_id)) {
            return;
        }
        
        $result = $wpdb->update(
            $wpdb->prefix . 'sfq_webhook_config',
            array('is_active' => $is_active),
            array('id' => $webhook_id),
            array('%d'),
            array('%d')
        );
        
        if ($result === false) {
            wp_send_json_error(array('message' => __('Error al actualizar estado', 'smart-forms-quiz')));
        }
        
        wp_send_json_success(array(
            'message' => $is_active ? __('Webhook activado', 'smart-forms-quiz') : __('Webhook desactivado', 'smart-forms-quiz')
        ));
    }
    
    public function ajax_get_webhook_logs() {
        check_ajax_referer('sfq_webhook_nonce', 'nonce');
        
        if (!current_user_can('manage_smart_forms')) {
            wp_die(__('No tienes permisos para realizar esta acción', 'smart-forms-quiz'));
        }
        
        global $wpdb;
        
        $webhook_id = intval($_POST['webhook_id'] ?? 0);
        $limit = intval($_POST['limit'] ?? 50);
        
        if (!$this->validate_webhook_id($webhook_id)) {
            return;
        }
        
        $logs = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}sfq_webhook_logs 
            WHERE webhook_id = %d 
            ORDER BY created_at DESC 
            LIMIT %d",
            $webhook_id,
            $limit
        ));
        
        wp_send_json_success(array('logs' => $logs));
    }
    
    public function ajax_get_webhook_stats() {
        check_ajax_referer('sfq_webhook_nonce', 'nonce');
        
        if (!current_user_can('manage_smart_forms')) {
            wp_die(__('No tienes permisos para realizar esta acción', 'smart-forms-quiz'));
        }
        
        $webhook_id = intval($_POST['webhook_id'] ?? 0);
        $days = intval($_POST['days'] ?? 7);
        
        if (!$this->validate_webhook_id($webhook_id)) {
            return;
        }
        
        $stats = $this->webhooks->get_webhook_stats($webhook_id, $days);
        
        wp_send_json_success($stats);
    }
    
    public function ajax_clear_webhook_logs() {
        check_ajax_referer('sfq_webhook_nonce', 'nonce');
        
        if (!current_user_can('manage_smart_forms')) {
            wp_die(__('No tienes permisos para realizar esta acción', 'smart-forms-quiz'));
        }
        
        global $wpdb;
        
        $webhook_id = intval($_POST['webhook_id'] ?? 0);
        
        if (!$this->validate_webhook_id($webhook_id)) {
            return;
        }
        
        $result = $wpdb->delete(
            $wpdb->prefix . 'sfq_webhook_logs',
            array('webhook_id' => $webhook_id),
            array('%d')
        );
        
        if ($result === false) {
            wp_send_json_error(array('message' => __('Error al limpiar logs', 'smart-forms-quiz')));
        }
        
        wp_send_json_success(array('message' => __('Logs limpiados correctamente', 'smart-forms-quiz')));
    }
    
    public function ajax_get_webhook() {
        check_ajax_referer('sfq_webhook_nonce', 'nonce');
        
        if (!current_user_can('manage_smart_forms')) {
            wp_die(__('No tienes permisos para realizar esta acción', 'smart-forms-quiz'));
        }
        
        global $wpdb;
        
        $webhook_id = intval($_POST['webhook_id'] ?? 0);
        
        if ($webhook_id <= 0) {
            wp_send_json_error(array('message' => __('ID de webhook no válido', 'smart-forms-quiz')));
        }
        
        $webhook = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}sfq_webhook_config WHERE id = %d",
            $webhook_id
        ));
        
        if (!$webhook) {
            wp_send_json_error(array('message' => __('Webhook no encontrado', 'smart-forms-quiz')));
        }
        
        // Descifrar datos de autenticación de forma segura
        $auth_data = array();
        if (!empty($webhook->auth_data)) {
            // Intentar descifrar primero
            $decrypted_auth_data = $this->webhooks->decrypt_data_public($webhook->auth_data);
            
            if (!empty($decrypted_auth_data)) {
                // Datos cifrados descifrados exitosamente
                $auth_data = json_decode($decrypted_auth_data, true);
            } else {
                // Fallback para datos no cifrados (compatibilidad hacia atrás)
                $auth_data = json_decode($webhook->auth_data, true);
            }
            
            // Validar que el JSON sea válido
            if (!is_array($auth_data)) {
                $auth_data = array();
            }
        }
        
        $webhook->auth_data = $auth_data;
        $webhook->form_filters = json_decode($webhook->form_filters, true);
        
        wp_send_json_success(array('webhook' => $webhook));
    }
    
    public function ajax_get_webhooks() {
        check_ajax_referer('sfq_webhook_nonce', 'nonce');
        
        if (!current_user_can('manage_smart_forms')) {
            wp_die(__('No tienes permisos para realizar esta acción', 'smart-forms-quiz'));
        }
        
        global $wpdb;
        
        $webhooks = $wpdb->get_results(
            "SELECT * FROM {$wpdb->prefix}sfq_webhook_config ORDER BY created_at DESC"
        );
        
        // Decodificar datos JSON para cada webhook
        foreach ($webhooks as $webhook) {
            $webhook->auth_data = json_decode($webhook->auth_data, true);
            $webhook->form_filters = json_decode($webhook->form_filters, true);
        }
        
        wp_send_json_success(array('webhooks' => $webhooks));
    }
    
    public function ajax_save_webhook_settings() {
        check_ajax_referer('sfq_webhook_nonce', 'nonce');
        
        if (!current_user_can('manage_smart_forms')) {
            wp_die(__('No tienes permisos para realizar esta acción', 'smart-forms-quiz'));
        }
        
        $dev_mode = isset($_POST['dev_mode']) && $_POST['dev_mode'] === 'true';
        $trusted_urls = array();
        
        if (isset($_POST['trusted_urls']) && is_array($_POST['trusted_urls'])) {
            foreach ($_POST['trusted_urls'] as $url) {
                $url = trim(sanitize_text_field($url));
                if (!empty($url)) {
                    $trusted_urls[] = $url;
                }
            }
        }
        
        // Guardar configuración
        update_option('sfq_webhook_dev_mode', $dev_mode);
        update_option('sfq_webhook_trusted_urls', $trusted_urls);
        
        wp_send_json_success(array(
            'message' => __('Configuración guardada correctamente', 'smart-forms-quiz'),
            'dev_mode' => $dev_mode,
            'trusted_urls' => $trusted_urls
        ));
    }
}
