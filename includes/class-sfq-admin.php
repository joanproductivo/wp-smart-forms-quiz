<?php
/**
 * Panel de administración del plugin
 */

if (!defined('ABSPATH')) {
    exit;
}

class SFQ_Admin {
    
    private $database;
    
    public function __construct() {
        $this->database = new SFQ_Database();
    }
    
    public function init() {
        // Menú de administración
        add_action('admin_menu', array($this, 'add_admin_menu'));
        
    }
    
    /**
     * Añadir menú de administración
     */
    public function add_admin_menu() {
        // Menú principal
        add_menu_page(
            __('Smart Forms & Quiz', 'smart-forms-quiz'),
            __('Smart Forms', 'smart-forms-quiz'),
            'manage_smart_forms',
            'smart-forms-quiz',
            array($this, 'render_main_page'),
            'dashicons-forms',
            30
        );
        
        // Submenú - Todos los formularios
        add_submenu_page(
            'smart-forms-quiz',
            __('Todos los Formularios', 'smart-forms-quiz'),
            __('Todos los Formularios', 'smart-forms-quiz'),
            'manage_smart_forms',
            'smart-forms-quiz',
            array($this, 'render_main_page')
        );
        
        // Submenú - Crear nuevo
        add_submenu_page(
            'smart-forms-quiz',
            __('Crear Nuevo', 'smart-forms-quiz'),
            __('Crear Nuevo', 'smart-forms-quiz'),
            'manage_smart_forms',
            'sfq-new-form',
            array($this, 'render_form_builder')
        );
        
        // Submenú - Respuestas
        add_submenu_page(
            'smart-forms-quiz',
            __('Respuestas', 'smart-forms-quiz'),
            __('Respuestas', 'smart-forms-quiz'),
            'manage_smart_forms',
            'sfq-submissions',
            array($this, 'render_submissions_page')
        );
        
        // Submenú - Analytics
        add_submenu_page(
            'smart-forms-quiz',
            __('Analytics', 'smart-forms-quiz'),
            __('Analytics', 'smart-forms-quiz'),
            'manage_smart_forms',
            'sfq-analytics',
            array($this, 'render_analytics_page')
        );
        
        // Submenú - Configuración
        add_submenu_page(
            'smart-forms-quiz',
            __('Configuración', 'smart-forms-quiz'),
            __('Configuración', 'smart-forms-quiz'),
            'manage_smart_forms',
            'sfq-settings',
            array($this, 'render_settings_page')
        );
    }
    
    /**
     * Renderizar página principal
     */
    public function render_main_page() {
        $forms = $this->database->get_forms();
        ?>
        <div class="wrap sfq-admin-wrap">
            <h1 class="wp-heading-inline">
                <?php _e('Smart Forms & Quiz', 'smart-forms-quiz'); ?>
            </h1>
            <a href="<?php echo admin_url('admin.php?page=sfq-new-form'); ?>" class="page-title-action">
                <?php _e('Crear Nuevo', 'smart-forms-quiz'); ?>
            </a>
            
            <hr class="wp-header-end">
            
            <?php if (empty($forms)) : ?>
                <div class="sfq-empty-state">
                    <img src="<?php echo SFQ_PLUGIN_URL; ?>assets/images/empty-state.svg" alt="No forms" style="max-width: 200px;">
                    <h2><?php _e('No hay formularios creados', 'smart-forms-quiz'); ?></h2>
                    <p><?php _e('Crea tu primer formulario o quiz para empezar', 'smart-forms-quiz'); ?></p>
                    <a href="<?php echo admin_url('admin.php?page=sfq-new-form'); ?>" class="button button-primary button-hero">
                        <?php _e('Crear Primer Formulario', 'smart-forms-quiz'); ?>
                    </a>
                </div>
            <?php else : ?>
                <div class="sfq-forms-grid">
                    <?php foreach ($forms as $form) : ?>
                        <div class="sfq-form-card" data-form-id="<?php echo esc_attr($form->id); ?>">
                            <div class="sfq-form-card-header">
                                <h3><?php echo esc_html($form->title); ?></h3>
                                <span class="sfq-form-type sfq-badge sfq-badge-<?php echo esc_attr($form->type); ?>">
                                    <?php echo $form->type === 'quiz' ? __('Quiz', 'smart-forms-quiz') : __('Formulario', 'smart-forms-quiz'); ?>
                                </span>
                            </div>
                            
                            <div class="sfq-form-card-body">
                                <?php if ($form->description) : ?>
                                    <p><?php echo esc_html($form->description); ?></p>
                                <?php endif; ?>
                                
                                <div class="sfq-form-stats">
                                    <div class="sfq-stat">
                                        <span class="sfq-stat-label"><?php _e('Vistas', 'smart-forms-quiz'); ?></span>
                                        <span class="sfq-stat-value" id="views-<?php echo $form->id; ?>">0</span>
                                    </div>
                                    <div class="sfq-stat">
                                        <span class="sfq-stat-label"><?php _e('Completados', 'smart-forms-quiz'); ?></span>
                                        <span class="sfq-stat-value" id="completed-<?php echo $form->id; ?>">0</span>
                                    </div>
                                    <div class="sfq-stat">
                                        <span class="sfq-stat-label"><?php _e('Tasa', 'smart-forms-quiz'); ?></span>
                                        <span class="sfq-stat-value" id="rate-<?php echo $form->id; ?>">0%</span>
                                    </div>
                                </div>
                                
                                <div class="sfq-form-shortcode">
                                    <input type="text" readonly value='[smart_form id="<?php echo $form->id; ?>"]' 
                                           onclick="this.select();" 
                                           class="sfq-shortcode-input">
                                    <button class="button button-small sfq-copy-shortcode" data-shortcode='[smart_form id="<?php echo $form->id; ?>"]'>
                                        <span class="dashicons dashicons-clipboard"></span>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="sfq-form-card-footer">
                                <a href="<?php echo admin_url('admin.php?page=sfq-new-form&form_id=' . $form->id); ?>" 
                                   class="button button-primary">
                                    <?php _e('Editar', 'smart-forms-quiz'); ?>
                                </a>
                                <button class="button sfq-duplicate-form" data-form-id="<?php echo $form->id; ?>">
                                    <?php _e('Duplicar', 'smart-forms-quiz'); ?>
                                </button>
                                <button class="button sfq-delete-form" data-form-id="<?php echo $form->id; ?>">
                                    <?php _e('Eliminar', 'smart-forms-quiz'); ?>
                                </button>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </div>
        
        <!-- Script para cargar estadísticas dinámicamente -->
        <script>
        jQuery(document).ready(function($) {
            // Cargar estadísticas para cada formulario
            $('.sfq-form-card').each(function() {
                const formId = $(this).data('form-id');
                const card = $(this);
                
                // Hacer petición AJAX para obtener estadísticas
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'sfq_get_form_quick_stats',
                        nonce: '<?php echo wp_create_nonce('sfq_nonce'); ?>',
                        form_id: formId
                    },
                    success: function(response) {
                        if (response.success) {
                            // Actualizar los valores en la tarjeta
                            card.find('#views-' + formId).text(response.data.views);
                            card.find('#completed-' + formId).text(response.data.completed);
                            card.find('#rate-' + formId).text(response.data.rate + '%');
                        }
                    },
                    error: function() {
                        console.error('Error cargando estadísticas para formulario ' + formId);
                    }
                });
            });
            
            // Copiar shortcode al clipboard
            $('.sfq-copy-shortcode').on('click', function() {
                const shortcode = $(this).data('shortcode');
                const input = $(this).siblings('.sfq-shortcode-input');
                
                input.select();
                document.execCommand('copy');
                
                // Mostrar feedback visual
                const originalText = $(this).html();
                $(this).html('<span class="dashicons dashicons-yes"></span>');
                setTimeout(() => {
                    $(this).html(originalText);
                }, 1000);
            });
            
            // Duplicar formulario
            $('.sfq-duplicate-form').on('click', function() {
                const formId = $(this).data('form-id');
                
                if (!confirm('¿Estás seguro de que quieres duplicar este formulario?')) {
                    return;
                }
                
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'sfq_duplicate_form',
                        nonce: '<?php echo wp_create_nonce('sfq_nonce'); ?>',
                        form_id: formId
                    },
                    success: function(response) {
                        if (response.success) {
                            location.reload();
                        } else {
                            alert('Error al duplicar el formulario: ' + (response.data.message || 'Error desconocido'));
                        }
                    },
                    error: function() {
                        alert('Error al duplicar el formulario');
                    }
                });
            });
            
            // Eliminar formulario
            $('.sfq-delete-form').on('click', function() {
                const formId = $(this).data('form-id');
                
                if (!confirm('¿Estás seguro de que quieres eliminar este formulario? Esta acción no se puede deshacer.')) {
                    return;
                }
                
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'sfq_delete_form',
                        nonce: '<?php echo wp_create_nonce('sfq_nonce'); ?>',
                        form_id: formId
                    },
                    success: function(response) {
                        if (response.success) {
                            location.reload();
                        } else {
                            alert('Error al eliminar el formulario: ' + (response.data.message || 'Error desconocido'));
                        }
                    },
                    error: function() {
                        alert('Error al eliminar el formulario');
                    }
                });
            });
        });
        </script>
        <?php
    }
    
    /**
     * Renderizar constructor de formularios
     */
    public function render_form_builder() {
        $form_id = isset($_GET['form_id']) ? intval($_GET['form_id']) : 0;
        $form = null;
        
        if ($form_id > 0) {
            $form = $this->database->get_form($form_id);
        }
        ?>
        <div class="wrap sfq-builder-wrap">
            <h1>
                <?php echo $form ? __('Editar Formulario', 'smart-forms-quiz') : __('Crear Nuevo Formulario', 'smart-forms-quiz'); ?>
            </h1>
            
            <div class="sfq-builder-container">
                <div class="sfq-builder-sidebar">
                    <div class="sfq-builder-tabs">
                        <button class="sfq-tab-button active" data-tab="general">
                            <?php _e('General', 'smart-forms-quiz'); ?>
                        </button>
                        <button class="sfq-tab-button" data-tab="questions">
                            <?php _e('Preguntas', 'smart-forms-quiz'); ?>
                        </button>
                        <button class="sfq-tab-button" data-tab="style">
                            <?php _e('Estilo', 'smart-forms-quiz'); ?>
                        </button>
                        <button class="sfq-tab-button" data-tab="settings">
                            <?php _e('Configuración', 'smart-forms-quiz'); ?>
                        </button>
                    </div>
                    
                    <!-- Tab General -->
                    <div class="sfq-tab-content active" id="tab-general">
                        <div class="sfq-field-group">
                            <label><?php _e('Título del Formulario', 'smart-forms-quiz'); ?></label>
                            <input type="text" id="form-title" class="sfq-input" 
                                   value="<?php echo $form ? esc_attr($form->title) : ''; ?>" 
                                   placeholder="<?php _e('Ej: Formulario de Contacto', 'smart-forms-quiz'); ?>">
                        </div>
                        
                        <div class="sfq-field-group">
                            <label><?php _e('Descripción', 'smart-forms-quiz'); ?></label>
                            <textarea id="form-description" class="sfq-textarea" rows="3"
                                      placeholder="<?php _e('Descripción opcional del formulario', 'smart-forms-quiz'); ?>"><?php 
                                echo $form ? esc_textarea($form->description) : ''; 
                            ?></textarea>
                        </div>
                        
                        <div class="sfq-field-group">
                            <label><?php _e('Tipo', 'smart-forms-quiz'); ?></label>
                            <select id="form-type" class="sfq-select">
                                <option value="form" <?php echo ($form && $form->type === 'form') ? 'selected' : ''; ?>>
                                    <?php _e('Formulario', 'smart-forms-quiz'); ?>
                                </option>
                                <option value="quiz" <?php echo ($form && $form->type === 'quiz') ? 'selected' : ''; ?>>
                                    <?php _e('Quiz', 'smart-forms-quiz'); ?>
                                </option>
                            </select>
                        </div>
                        
                        <div class="sfq-field-group">
                            <label>
                                <input type="checkbox" id="show-intro-screen" <?php echo ($form && isset($form->settings['show_intro_screen']) && $form->settings['show_intro_screen']) ? 'checked' : ''; ?>>
                                <?php _e('Mostrar pantalla de introducción', 'smart-forms-quiz'); ?>
                            </label>
                        </div>
                        
                        <div class="sfq-field-group" id="intro-screen-settings" style="<?php echo ($form && isset($form->settings['show_intro_screen']) && $form->settings['show_intro_screen']) ? '' : 'display: none;'; ?>">
                            <label><?php _e('Configuración de Pantalla de Introducción', 'smart-forms-quiz'); ?></label>
                            <input type="text" id="intro-title" class="sfq-input" 
                                   value="<?php echo $form ? esc_attr($form->intro_title) : ''; ?>" 
                                   placeholder="<?php _e('Título de introducción', 'smart-forms-quiz'); ?>">
                            <textarea id="intro-description" class="sfq-textarea" rows="2"
                                      placeholder="<?php _e('Descripción de introducción', 'smart-forms-quiz'); ?>"><?php 
                                echo $form ? esc_textarea($form->intro_description) : ''; 
                            ?></textarea>
                            <input type="text" id="intro-button-text" class="sfq-input" 
                                   value="<?php echo $form ? esc_attr($form->intro_button_text) : 'Comenzar'; ?>" 
                                   placeholder="<?php _e('Texto del botón', 'smart-forms-quiz'); ?>">
                        </div>
                        
                        <div class="sfq-field-group">
                            <label><?php _e('Mensaje de Agradecimiento', 'smart-forms-quiz'); ?></label>
                            <textarea id="thank-you-message" class="sfq-textarea" rows="3"
                                      placeholder="<?php _e('Mensaje al completar el formulario', 'smart-forms-quiz'); ?>"><?php 
                                echo $form ? esc_textarea($form->thank_you_message) : ''; 
                            ?></textarea>
                        </div>
                        
                        <div class="sfq-field-group">
                            <label><?php _e('URL de Redirección (opcional)', 'smart-forms-quiz'); ?></label>
                            <input type="url" id="redirect-url" class="sfq-input" 
                                   value="<?php echo $form ? esc_attr($form->redirect_url) : ''; ?>" 
                                   placeholder="https://ejemplo.com/gracias">
                        </div>
                    </div>
                    
                    <!-- Tab Preguntas -->
                    <div class="sfq-tab-content" id="tab-questions">
                        <div class="sfq-question-types">
                            <h3><?php _e('Tipos de Pregunta', 'smart-forms-quiz'); ?></h3>
                            <div class="sfq-question-type-grid">
                                <button class="sfq-add-question" data-type="single_choice">
                                    <span class="dashicons dashicons-yes"></span>
                                    <?php _e('Opción Única', 'smart-forms-quiz'); ?>
                                </button>
                                <button class="sfq-add-question" data-type="multiple_choice">
                                    <span class="dashicons dashicons-forms"></span>
                                    <?php _e('Opción Múltiple', 'smart-forms-quiz'); ?>
                                </button>
                                <button class="sfq-add-question" data-type="text">
                                    <span class="dashicons dashicons-editor-textcolor"></span>
                                    <?php _e('Texto', 'smart-forms-quiz'); ?>
                                </button>
                                <button class="sfq-add-question" data-type="rating">
                                    <span class="dashicons dashicons-star-filled"></span>
                                    <?php _e('Valoración', 'smart-forms-quiz'); ?>
                                </button>
                                <button class="sfq-add-question" data-type="image_choice">
                                    <span class="dashicons dashicons-format-image"></span>
                                    <?php _e('Selección de Imagen', 'smart-forms-quiz'); ?>
                                </button>
                                <button class="sfq-add-question" data-type="email">
                                    <span class="dashicons dashicons-email"></span>
                                    <?php _e('Email', 'smart-forms-quiz'); ?>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Tab Estilo -->
                    <div class="sfq-tab-content" id="tab-style">
                        <div class="sfq-field-group">
                            <label><?php _e('Color Primario', 'smart-forms-quiz'); ?></label>
                            <input type="text" id="primary-color" class="sfq-color-picker" value="#007cba">
                        </div>
                        
                        <div class="sfq-field-group">
                            <label><?php _e('Color Secundario', 'smart-forms-quiz'); ?></label>
                            <input type="text" id="secondary-color" class="sfq-color-picker" value="#6c757d">
                        </div>
                        
                        <div class="sfq-field-group">
                            <label><?php _e('Color de Fondo', 'smart-forms-quiz'); ?></label>
                            <input type="text" id="background-color" class="sfq-color-picker" value="#ffffff">
                        </div>
                        
                        <div class="sfq-field-group">
                            <label><?php _e('Color de Texto', 'smart-forms-quiz'); ?></label>
                            <input type="text" id="text-color" class="sfq-color-picker" value="#333333">
                        </div>
                        
                        <div class="sfq-field-group">
                            <label><?php _e('Radio de Bordes', 'smart-forms-quiz'); ?></label>
                            <input type="range" id="border-radius" min="0" max="30" value="12" class="sfq-range">
                            <span class="sfq-range-value">12px</span>
                        </div>
                        
                        <div class="sfq-field-group">
                            <label><?php _e('Fuente', 'smart-forms-quiz'); ?></label>
                            <select id="font-family" class="sfq-select">
                                <option value="system">Sistema</option>
                                <option value="Inter">Inter</option>
                                <option value="Poppins">Poppins</option>
                                <option value="Roboto">Roboto</option>
                                <option value="Open Sans">Open Sans</option>
                            </select>
                        </div>
                    </div>
                    
                    <!-- Tab Configuración -->
                    <div class="sfq-tab-content" id="tab-settings">
                        <div class="sfq-field-group">
                            <label>
                                <input type="checkbox" id="show-progress-bar" checked>
                                <?php _e('Mostrar barra de progreso', 'smart-forms-quiz'); ?>
                            </label>
                        </div>
                        
                        <div class="sfq-field-group">
                            <label>
                                <input type="checkbox" id="show-question-numbers">
                                <?php _e('Mostrar número de preguntas (ej: Pregunta 1 de 4)', 'smart-forms-quiz'); ?>
                            </label>
                        </div>
                        
                        <div class="sfq-field-group">
                            <label>
                                <input type="checkbox" id="auto-advance" checked>
                                <?php _e('Avanzar automáticamente al seleccionar respuesta', 'smart-forms-quiz'); ?>
                            </label>
                        </div>
                        
                        <div class="sfq-field-group">
                            <label>
                                <input type="checkbox" id="allow-back">
                                <?php _e('Permitir volver a preguntas anteriores', 'smart-forms-quiz'); ?>
                            </label>
                        </div>
                        
                        <div class="sfq-field-group">
                            <label>
                                <input type="checkbox" id="randomize-questions">
                                <?php _e('Aleatorizar orden de preguntas', 'smart-forms-quiz'); ?>
                            </label>
                        </div>
                        
                        <div class="sfq-field-group">
                            <label>
                                <input type="checkbox" id="save-partial">
                                <?php _e('Guardar respuestas parciales', 'smart-forms-quiz'); ?>
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="sfq-builder-main">
                    <div class="sfq-builder-header">
                        <button class="button" id="sfq-preview-form">
                            <span class="dashicons dashicons-visibility"></span>
                            <?php _e('Vista Previa', 'smart-forms-quiz'); ?>
                        </button>
                        <button class="button button-primary" id="sfq-save-form">
                            <span class="dashicons dashicons-saved"></span>
                            <?php _e('Guardar Formulario', 'smart-forms-quiz'); ?>
                        </button>
                    </div>
                    
                    <div class="sfq-builder-canvas">
                        <div id="sfq-questions-container" class="sfq-questions-list">
                            <?php if ($form && !empty($form->questions)) : ?>
                                <?php foreach ($form->questions as $question) : ?>
                                    <!-- Las preguntas se cargarán dinámicamente con JavaScript -->
                                <?php endforeach; ?>
                            <?php else : ?>
                                <div class="sfq-empty-questions">
                                    <p><?php _e('No hay preguntas todavía', 'smart-forms-quiz'); ?></p>
                                    <p><?php _e('Añade preguntas desde el panel lateral', 'smart-forms-quiz'); ?></p>
                                </div>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
                
                <div class="sfq-builder-preview">
                    <div class="sfq-preview-header">
                        <h3><?php _e('Vista Previa', 'smart-forms-quiz'); ?></h3>
                        <button class="sfq-close-preview">&times;</button>
                    </div>
                    <div class="sfq-preview-content">
                        <iframe id="sfq-preview-iframe" src=""></iframe>
                    </div>
                </div>
            </div>
        </div>
        
        <input type="hidden" id="sfq-form-id" value="<?php echo $form_id; ?>">
        <?php
    }
    
    /**
     * Renderizar página de respuestas/submissions
     */
    public function render_submissions_page() {
        global $wpdb;
        
        // Obtener lista de formularios para el filtro
        $forms = $this->database->get_forms();
        $selected_form = isset($_GET['form_id']) ? intval($_GET['form_id']) : 0;
        ?>
        <div class="wrap sfq-submissions-wrap">
            <h1 class="wp-heading-inline">
                <?php _e('Respuestas de Formularios', 'smart-forms-quiz'); ?>
            </h1>
            
            <div class="sfq-submissions-filters">
                <select id="sfq-filter-form" class="sfq-select">
                    <option value="0"><?php _e('Todos los formularios', 'smart-forms-quiz'); ?></option>
                    <?php foreach ($forms as $form) : ?>
                        <option value="<?php echo $form->id; ?>" <?php selected($selected_form, $form->id); ?>>
                            <?php echo esc_html($form->title); ?>
                        </option>
                    <?php endforeach; ?>
                </select>
                
                <button class="button button-primary" id="sfq-export-csv">
                    <span class="dashicons dashicons-download"></span>
                    <?php _e('Exportar CSV', 'smart-forms-quiz'); ?>
                </button>
            </div>
            
            <div class="sfq-submissions-table-wrapper">
                <table class="wp-list-table widefat fixed striped" id="sfq-submissions-table">
                    <thead>
                        <tr>
                            <th><?php _e('ID', 'smart-forms-quiz'); ?></th>
                            <th><?php _e('Formulario', 'smart-forms-quiz'); ?></th>
                            <th><?php _e('Usuario', 'smart-forms-quiz'); ?></th>
                            <th><?php _e('Fecha', 'smart-forms-quiz'); ?></th>
                            <th><?php _e('Tiempo', 'smart-forms-quiz'); ?></th>
                            <th><?php _e('Respuestas', 'smart-forms-quiz'); ?></th>
                            <th><?php _e('Acciones', 'smart-forms-quiz'); ?></th>
                        </tr>
                    </thead>
                    <tbody id="sfq-submissions-tbody">
                        <tr>
                            <td colspan="7" class="sfq-loading-cell">
                                <span class="sfq-loading-spinner"></span>
                                <?php _e('Cargando respuestas...', 'smart-forms-quiz'); ?>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class="sfq-pagination" id="sfq-pagination">
                <!-- La paginación se cargará dinámicamente -->
            </div>
        </div>
        
        <!-- Modal para ver detalles de respuesta -->
        <div id="sfq-submission-modal" class="sfq-modal" style="display: none;">
            <div class="sfq-modal-content">
                <div class="sfq-modal-header">
                    <h2><?php _e('Detalle de Respuesta', 'smart-forms-quiz'); ?></h2>
                    <button class="sfq-modal-close">&times;</button>
                </div>
                <div class="sfq-modal-body" id="sfq-submission-detail">
                    <!-- El contenido se cargará dinámicamente -->
                </div>
                <div class="sfq-modal-footer">
                    <button class="button" id="sfq-print-submission">
                        <span class="dashicons dashicons-printer"></span>
                        <?php _e('Imprimir', 'smart-forms-quiz'); ?>
                    </button>
                    <button class="button button-primary sfq-modal-close">
                        <?php _e('Cerrar', 'smart-forms-quiz'); ?>
                    </button>
                </div>
            </div>
        </div>
        
        <style>
            .sfq-submissions-wrap {
                margin-top: 20px;
            }
            
            .sfq-submissions-filters {
                margin-bottom: 20px;
                display: flex;
                gap: 10px;
                align-items: center;
            }
            
            .sfq-submissions-table-wrapper {
                background: white;
                border: 1px solid #ccd0d4;
                box-shadow: 0 1px 1px rgba(0,0,0,.04);
            }
            
            .sfq-loading-cell {
                text-align: center;
                padding: 40px !important;
            }
            
            .sfq-loading-spinner {
                display: inline-block;
                width: 20px;
                height: 20px;
                border: 3px solid #f3f3f3;
                border-top: 3px solid #007cba;
                border-radius: 50%;
                animation: sfq-spin 1s linear infinite;
                margin-right: 10px;
                vertical-align: middle;
            }
            
            @keyframes sfq-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .sfq-pagination {
                margin-top: 20px;
                display: flex;
                justify-content: center;
                gap: 5px;
            }
            
            .sfq-pagination button {
                min-width: 40px;
            }
            
            .sfq-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 100000;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .sfq-modal-content {
                background: white;
                width: 90%;
                max-width: 800px;
                max-height: 90vh;
                border-radius: 8px;
                display: flex;
                flex-direction: column;
            }
            
            .sfq-modal-header {
                padding: 20px;
                border-bottom: 1px solid #ddd;
                display: flex;
                justify-content: space-between;
                align-items: center;
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
            
            .sfq-modal-body {
                padding: 20px;
                overflow-y: auto;
                flex: 1;
            }
            
            .sfq-modal-footer {
                padding: 20px;
                border-top: 1px solid #ddd;
                display: flex;
                justify-content: flex-end;
                gap: 10px;
            }
            
            .sfq-submission-info {
                margin-bottom: 20px;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 5px;
            }
            
            .sfq-submission-info p {
                margin: 5px 0;
            }
            
            .sfq-response-item {
                margin-bottom: 20px;
                padding: 15px;
                border: 1px solid #e0e0e0;
                border-radius: 5px;
            }
            
            .sfq-response-question {
                font-weight: bold;
                margin-bottom: 10px;
                color: #333;
            }
            
            .sfq-response-answer {
                color: #666;
                padding-left: 20px;
            }
            
            .sfq-view-details {
                cursor: pointer;
                color: #007cba;
            }
            
            .sfq-view-details:hover {
                color: #005a87;
                text-decoration: underline;
            }
        </style>
        
        <script>
        jQuery(document).ready(function($) {
            let currentPage = 1;
            let totalPages = 1;
            
            // Cargar submissions al iniciar
            loadSubmissions();
            
            // Filtro por formulario
            $('#sfq-filter-form').on('change', function() {
                currentPage = 1;
                loadSubmissions();
            });
            
            // Función para cargar submissions
            function loadSubmissions() {
                const formId = $('#sfq-filter-form').val();
                
                $.ajax({
                    url: sfq_ajax.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'sfq_get_submissions',
                        nonce: sfq_ajax.nonce,
                        form_id: formId,
                        page: currentPage,
                        per_page: 20
                    },
                    success: function(response) {
                        if (response.success) {
                            renderSubmissions(response.data.submissions);
                            renderPagination(response.data.pages, response.data.current_page);
                            totalPages = response.data.pages;
                        }
                    },
                    error: function() {
                        $('#sfq-submissions-tbody').html(
                            '<tr><td colspan="7" style="text-align: center;">Error al cargar las respuestas</td></tr>'
                        );
                    }
                });
            }
            
            // Renderizar tabla de submissions
            function renderSubmissions(submissions) {
                const tbody = $('#sfq-submissions-tbody');
                tbody.empty();
                
                if (submissions.length === 0) {
                    tbody.html('<tr><td colspan="7" style="text-align: center;">No hay respuestas todavía</td></tr>');
                    return;
                }
                
                submissions.forEach(function(submission) {
                    const row = `
                        <tr>
                            <td>${submission.id}</td>
                            <td>${submission.form_title || 'Sin título'}</td>
                            <td>${submission.user_name}</td>
                            <td>${submission.formatted_date}</td>
                            <td>${submission.time_spent_formatted}</td>
                            <td>${submission.response_count} respuestas</td>
                            <td>
                                <a href="#" class="sfq-view-details" data-id="${submission.id}">
                                    Ver detalles
                                </a>
                            </td>
                        </tr>
                    `;
                    tbody.append(row);
                });
            }
            
            // Renderizar paginación
            function renderPagination(pages, current) {
                const pagination = $('#sfq-pagination');
                pagination.empty();
                
                if (pages <= 1) return;
                
                // Botón anterior
                if (current > 1) {
                    pagination.append('<button class="button sfq-page-btn" data-page="' + (current - 1) + '">←</button>');
                }
                
                // Páginas
                for (let i = 1; i <= pages; i++) {
                    if (i === current) {
                        pagination.append('<button class="button button-primary" disabled>' + i + '</button>');
                    } else if (i === 1 || i === pages || (i >= current - 2 && i <= current + 2)) {
                        pagination.append('<button class="button sfq-page-btn" data-page="' + i + '">' + i + '</button>');
                    } else if (i === current - 3 || i === current + 3) {
                        pagination.append('<span>...</span>');
                    }
                }
                
                // Botón siguiente
                if (current < pages) {
                    pagination.append('<button class="button sfq-page-btn" data-page="' + (current + 1) + '">→</button>');
                }
            }
            
            // Click en paginación
            $(document).on('click', '.sfq-page-btn', function() {
                currentPage = parseInt($(this).data('page'));
                loadSubmissions();
            });
            
            // Ver detalles de submission
            $(document).on('click', '.sfq-view-details', function(e) {
                e.preventDefault();
                const submissionId = $(this).data('id');
                loadSubmissionDetail(submissionId);
            });
            
            // Cargar detalle de submission
            function loadSubmissionDetail(submissionId) {
                $.ajax({
                    url: sfq_ajax.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'sfq_get_submission_detail',
                        nonce: sfq_ajax.nonce,
                        submission_id: submissionId
                    },
                    success: function(response) {
                        if (response.success) {
                            renderSubmissionDetail(response.data);
                            $('#sfq-submission-modal').show();
                        }
                    }
                });
            }
            
            // Renderizar detalle de submission
            function renderSubmissionDetail(data) {
                const submission = data.submission;
                const responses = data.responses;
                
                let html = `
                    <div class="sfq-submission-info">
                        <p><strong>Formulario:</strong> ${submission.form_title}</p>
                        <p><strong>Usuario:</strong> ${submission.user_name}</p>
                        <p><strong>Fecha:</strong> ${submission.formatted_date}</p>
                        <p><strong>Tiempo:</strong> ${submission.time_spent_formatted}</p>
                        <p><strong>IP:</strong> ${submission.user_ip}</p>
                    </div>
                    <h3>Respuestas:</h3>
                `;
                
                responses.forEach(function(response) {
                    html += `
                        <div class="sfq-response-item">
                            <div class="sfq-response-question">${response.question_text}</div>
                            <div class="sfq-response-answer">${response.answer_formatted}</div>
                        </div>
                    `;
                });
                
                $('#sfq-submission-detail').html(html);
            }
            
            // Cerrar modal
            $('.sfq-modal-close').on('click', function() {
                $('#sfq-submission-modal').hide();
            });
            
            // Cerrar modal al hacer click fuera
            $('#sfq-submission-modal').on('click', function(e) {
                if (e.target === this) {
                    $(this).hide();
                }
            });
            
            // Imprimir submission
            $('#sfq-print-submission').on('click', function() {
                const content = $('#sfq-submission-detail').html();
                const printWindow = window.open('', '', 'height=600,width=800');
                printWindow.document.write('<html><head><title>Respuesta de Formulario</title>');
                printWindow.document.write('<style>body { font-family: Arial, sans-serif; } .sfq-submission-info { background: #f8f9fa; padding: 15px; margin-bottom: 20px; } .sfq-response-item { margin-bottom: 20px; padding: 15px; border: 1px solid #e0e0e0; } .sfq-response-question { font-weight: bold; margin-bottom: 10px; } .sfq-response-answer { padding-left: 20px; color: #666; }</style>');
                printWindow.document.write('</head><body>');
                printWindow.document.write(content);
                printWindow.document.write('</body></html>');
                printWindow.document.close();
                printWindow.print();
            });
            
            // Exportar CSV
            $('#sfq-export-csv').on('click', function() {
                const formId = $('#sfq-filter-form').val();
                window.location.href = sfq_ajax.ajax_url + '?action=sfq_export_submissions&nonce=' + sfq_ajax.nonce + '&form_id=' + formId + '&format=csv';
            });
        });
        </script>
        <?php
    }
    
    /**
     * Renderizar página de analytics
     */
    public function render_analytics_page() {
        ?>
        <div class="wrap">
            <h1><?php _e('Analytics', 'smart-forms-quiz'); ?></h1>
            <div class="sfq-analytics-container">
                <!-- El contenido de analytics se cargará dinámicamente -->
            </div>
        </div>
        <?php
    }
    
    /**
     * Renderizar página de configuración
     */
    public function render_settings_page() {
        ?>
        <div class="wrap">
            <h1><?php _e('Configuración', 'smart-forms-quiz'); ?></h1>
            <form method="post" action="options.php">
                <?php settings_fields('sfq_settings'); ?>
                <table class="form-table">
                    <tr>
                        <th scope="row"><?php _e('Configuración General', 'smart-forms-quiz'); ?></th>
                        <td>
                            <!-- Configuraciones generales del plugin -->
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }
    
}
