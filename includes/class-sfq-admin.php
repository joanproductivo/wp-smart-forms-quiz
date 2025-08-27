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
            __('Estadísticas', 'smart-forms-quiz'),
            __('Estadísticas', 'smart-forms-quiz'),
            'manage_smart_forms',
            'sfq-submissions',
            array($this, 'render_submissions_page')
        );
        
        // Submenú oculto - Estadísticas de formulario individual
        add_submenu_page(
            null, // Parent slug null para que no aparezca en el menú
            __('Estadísticas del Formulario', 'smart-forms-quiz'),
            __('Estadísticas del Formulario', 'smart-forms-quiz'),
            'manage_smart_forms',
            'sfq-form-statistics',
            array($this, 'render_form_statistics_page')
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
                                <a href="<?php echo admin_url('admin.php?page=sfq-form-statistics&form_id=' . $form->id); ?>" 
                                   class="button sfq-view-responses" 
                                   title="<?php _e('Ver estadísticas de este formulario', 'smart-forms-quiz'); ?>">
                                    <span class="dashicons dashicons-chart-pie"></span>
                                </a>
                                <button class="button sfq-reset-stats" data-form-id="<?php echo $form->id; ?>" title="<?php _e('Borrar estadísticas', 'smart-forms-quiz'); ?>">
                                    <span class="dashicons dashicons-chart-line"></span>
                                    <?php _e('Reset', 'smart-forms-quiz'); ?>
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
        
        <!-- Estilos adicionales -->
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .sfq-reset-stats {
                background-color: #f0f0f1;
                border-color: #dcdcde;
                color: #d63638;
            }
            
            .sfq-reset-stats:hover {
                background-color: #d63638;
                border-color: #d63638;
                color: #fff;
            }
            
            .sfq-reset-stats:disabled {
                background-color: #f6f7f7;
                border-color: #dcdcde;
                color: #a7aaad;
                cursor: not-allowed;
            }
            
            .sfq-view-responses {
                background-color: #f0f0f1;
                border-color: #dcdcde;
                color: #007cba;
                min-width: 40px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }
            
            .sfq-view-responses:hover {
                background-color: #007cba;
                border-color: #007cba;
                color: #fff;
            }
            
            .sfq-view-responses .dashicons {
                font-size: 16px;
                width: 16px;
                height: 16px;
            }
        </style>
        
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
            
            
            // Resetear estadísticas del formulario
            $('.sfq-reset-stats').on('click', function() {
                const formId = $(this).data('form-id');
                const button = $(this);
                
                if (!confirm('¿Estás seguro de que quieres borrar todas las estadísticas de este formulario? Esta acción no se puede deshacer.')) {
                    return;
                }
                
                // Deshabilitar botón y mostrar estado de carga
                const originalHtml = button.html();
                button.prop('disabled', true).html('<span class="dashicons dashicons-update-alt" style="animation: spin 1s linear infinite;"></span> Borrando...');
                
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'sfq_reset_form_stats',
                        nonce: '<?php echo wp_create_nonce('sfq_nonce'); ?>',
                        form_id: formId
                    },
                    success: function(response) {
                        if (response.success) {
                            // Resetear las estadísticas mostradas a 0
                            const card = button.closest('.sfq-form-card');
                            card.find('#views-' + formId).text('0');
                            card.find('#completed-' + formId).text('0');
                            card.find('#rate-' + formId).text('0%');
                            
                            // Mostrar mensaje de éxito
                            alert('Estadísticas borradas correctamente');
                        } else {
                            alert('Error al borrar las estadísticas: ' + (response.data.message || 'Error desconocido'));
                        }
                    },
                    error: function() {
                        alert('Error al borrar las estadísticas');
                    },
                    complete: function() {
                        // Restaurar botón
                        button.prop('disabled', false).html(originalHtml);
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
        // Verificar si existe la clase de submissions avanzadas
        if (class_exists('SFQ_Admin_Submissions')) {
            $submissions_handler = new SFQ_Admin_Submissions();
            $submissions_handler->render_submissions_page();
        } else {
            // Fallback a la versión básica si no existe la clase avanzada
            $this->render_basic_submissions_page();
        }
    }
    
    /**
     * Renderizar página básica de respuestas (fallback)
     */
    private function render_basic_submissions_page() {
        global $wpdb;
        
        // Obtener lista de formularios para el filtro
        $forms = $this->database->get_forms();
        $selected_form = isset($_GET['form_id']) ? intval($_GET['form_id']) : 0;
        ?>
        <div class="wrap sfq-submissions-wrap">
            <h1 class="wp-heading-inline">
                <?php _e('Respuestas de Formularios', 'smart-forms-quiz'); ?>
            </h1>
            
            <div class="notice notice-info">
                <p><?php _e('Versión básica de respuestas. Para funcionalidades avanzadas, asegúrate de que todos los archivos del plugin estén correctamente instalados.', 'smart-forms-quiz'); ?></p>
            </div>
            
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
        </style>
        
        <script>
        jQuery(document).ready(function($) {
            // Implementación básica de submissions
            $('#sfq-submissions-tbody').html('<tr><td colspan="7" style="text-align: center;">Funcionalidad básica - Instala la versión completa para más características</td></tr>');
        });
        </script>
        <?php
    }
    
    /**
     * Renderizar página de estadísticas de formulario individual
     */
    public function render_form_statistics_page() {
        // Verificar si existe la clase de estadísticas
        if (class_exists('SFQ_Form_Statistics')) {
            $statistics_handler = new SFQ_Form_Statistics();
            $statistics_handler->render_statistics_page();
        } else {
            wp_die(__('Error: No se pudo cargar el módulo de estadísticas', 'smart-forms-quiz'));
        }
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
        // Procesar formulario si se envía
        if (isset($_POST['submit']) && check_admin_referer('sfq_settings_nonce')) {
            $this->save_settings();
        }
        
        // Obtener configuraciones actuales
        $settings = get_option('sfq_settings', array());
        $security_settings = get_option('sfq_security_settings', array());
        
        // Valores por defecto
        $defaults = array(
            'rate_limit_requests' => 10,
            'rate_limit_window' => 300,
            'max_response_length' => 2000,
            'json_max_depth' => 10,
            'enable_security_headers' => true,
            'enable_xss_protection' => true,
            'enable_rate_limiting' => true,
            'log_security_events' => true,
            'block_suspicious_ips' => false,
            'allowed_html_tags' => '',
            'enable_honeypot' => false,
            'session_timeout' => 3600
        );
        
        $security_settings = wp_parse_args($security_settings, $defaults);
        ?>
        <div class="wrap sfq-settings-wrap">
            <h1><?php _e('Configuración de Smart Forms Quiz', 'smart-forms-quiz'); ?></h1>
            
            <div class="sfq-settings-tabs">
                <nav class="nav-tab-wrapper">
                    <a href="#general" class="nav-tab nav-tab-active"><?php _e('General', 'smart-forms-quiz'); ?></a>
                    <a href="#security" class="nav-tab"><?php _e('Seguridad', 'smart-forms-quiz'); ?></a>
                    <a href="#performance" class="nav-tab"><?php _e('Rendimiento', 'smart-forms-quiz'); ?></a>
                    <a href="#notifications" class="nav-tab"><?php _e('Notificaciones', 'smart-forms-quiz'); ?></a>
                </nav>
            </div>
            
            <form method="post" action="">
                <?php wp_nonce_field('sfq_settings_nonce'); ?>
                
                <!-- Tab General -->
                <div id="general" class="sfq-tab-content active">
                    <h2><?php _e('Configuración General', 'smart-forms-quiz'); ?></h2>
                    <table class="form-table">
                        <tr>
                            <th scope="row"><?php _e('Capacidad requerida', 'smart-forms-quiz'); ?></th>
                            <td>
                                <select name="sfq_settings[required_capability]">
                                    <option value="manage_options" <?php selected($settings['required_capability'] ?? 'manage_options', 'manage_options'); ?>>
                                        <?php _e('Administrador (manage_options)', 'smart-forms-quiz'); ?>
                                    </option>
                                    <option value="edit_pages" <?php selected($settings['required_capability'] ?? 'manage_options', 'edit_pages'); ?>>
                                        <?php _e('Editor (edit_pages)', 'smart-forms-quiz'); ?>
                                    </option>
                                    <option value="edit_posts" <?php selected($settings['required_capability'] ?? 'manage_options', 'edit_posts'); ?>>
                                        <?php _e('Autor (edit_posts)', 'smart-forms-quiz'); ?>
                                    </option>
                                </select>
                                <p class="description"><?php _e('Capacidad mínima requerida para gestionar formularios', 'smart-forms-quiz'); ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row"><?php _e('Eliminar datos al desinstalar', 'smart-forms-quiz'); ?></th>
                            <td>
                                <label>
                                    <input type="checkbox" name="sfq_settings[delete_data_on_uninstall]" value="1" 
                                           <?php checked($settings['delete_data_on_uninstall'] ?? false); ?>>
                                    <?php _e('Eliminar todos los datos del plugin al desinstalar', 'smart-forms-quiz'); ?>
                                </label>
                                <p class="description"><?php _e('⚠️ Esto eliminará permanentemente todos los formularios, respuestas y configuraciones', 'smart-forms-quiz'); ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row"><?php _e('Modo debug', 'smart-forms-quiz'); ?></th>
                            <td>
                                <label>
                                    <input type="checkbox" name="sfq_settings[debug_mode]" value="1" 
                                           <?php checked($settings['debug_mode'] ?? false); ?>>
                                    <?php _e('Activar modo debug (solo para desarrollo)', 'smart-forms-quiz'); ?>
                                </label>
                                <p class="description"><?php _e('Registra información adicional en los logs de WordPress', 'smart-forms-quiz'); ?></p>
                            </td>
                        </tr>
                    </table>
                </div>
                
                <!-- Tab Seguridad -->
                <div id="security" class="sfq-tab-content">
                    <h2><?php _e('Configuración de Seguridad', 'smart-forms-quiz'); ?></h2>
                    
                    <div class="sfq-security-section">
                        <h3><?php _e('🛡️ Rate Limiting', 'smart-forms-quiz'); ?></h3>
                        <table class="form-table">
                            <tr>
                                <th scope="row"><?php _e('Activar Rate Limiting', 'smart-forms-quiz'); ?></th>
                                <td>
                                    <label>
                                        <input type="checkbox" name="sfq_security[enable_rate_limiting]" value="1" 
                                               <?php checked($security_settings['enable_rate_limiting']); ?>>
                                        <?php _e('Limitar número de envíos por usuario', 'smart-forms-quiz'); ?>
                                    </label>
                                </td>
                            </tr>
                            <tr>
                                <th scope="row"><?php _e('Máximo de envíos', 'smart-forms-quiz'); ?></th>
                                <td>
                                    <input type="number" name="sfq_security[rate_limit_requests]" 
                                           value="<?php echo esc_attr($security_settings['rate_limit_requests']); ?>" 
                                           min="1" max="100" class="small-text">
                                    <p class="description"><?php _e('Número máximo de envíos permitidos por ventana de tiempo', 'smart-forms-quiz'); ?></p>
                                </td>
                            </tr>
                            <tr>
                                <th scope="row"><?php _e('Ventana de tiempo (segundos)', 'smart-forms-quiz'); ?></th>
                                <td>
                                    <input type="number" name="sfq_security[rate_limit_window]" 
                                           value="<?php echo esc_attr($security_settings['rate_limit_window']); ?>" 
                                           min="60" max="3600" class="small-text">
                                    <p class="description"><?php _e('Tiempo en segundos para el límite (300 = 5 minutos)', 'smart-forms-quiz'); ?></p>
                                </td>
                            </tr>
                        </table>
                    </div>
                    
                    <div class="sfq-security-section">
                        <h3><?php _e('🔒 Protección XSS', 'smart-forms-quiz'); ?></h3>
                        <table class="form-table">
                            <tr>
                                <th scope="row"><?php _e('Protección XSS', 'smart-forms-quiz'); ?></th>
                                <td>
                                    <label>
                                        <input type="checkbox" name="sfq_security[enable_xss_protection]" value="1" 
                                               <?php checked($security_settings['enable_xss_protection']); ?>>
                                        <?php _e('Activar protección contra ataques XSS', 'smart-forms-quiz'); ?>
                                    </label>
                                    <p class="description"><?php _e('Elimina automáticamente código HTML/JavaScript malicioso', 'smart-forms-quiz'); ?></p>
                                </td>
                            </tr>
                            <tr>
                                <th scope="row"><?php _e('Longitud máxima de respuesta', 'smart-forms-quiz'); ?></th>
                                <td>
                                    <input type="number" name="sfq_security[max_response_length]" 
                                           value="<?php echo esc_attr($security_settings['max_response_length']); ?>" 
                                           min="100" max="10000" class="small-text">
                                    <p class="description"><?php _e('Caracteres máximos permitidos por respuesta', 'smart-forms-quiz'); ?></p>
                                </td>
                            </tr>
                            <tr>
                                <th scope="row"><?php _e('Tags HTML permitidos', 'smart-forms-quiz'); ?></th>
                                <td>
                                    <input type="text" name="sfq_security[allowed_html_tags]" 
                                           value="<?php echo esc_attr($security_settings['allowed_html_tags']); ?>" 
                                           class="regular-text" placeholder="p,br,strong,em">
                                    <p class="description"><?php _e('Tags HTML permitidos separados por comas (dejar vacío para eliminar todo HTML)', 'smart-forms-quiz'); ?></p>
                                </td>
                            </tr>
                        </table>
                    </div>
                    
                    <div class="sfq-security-section">
                        <h3><?php _e('📊 Validación de Datos', 'smart-forms-quiz'); ?></h3>
                        <table class="form-table">
                            <tr>
                                <th scope="row"><?php _e('Profundidad máxima JSON', 'smart-forms-quiz'); ?></th>
                                <td>
                                    <input type="number" name="sfq_security[json_max_depth]" 
                                           value="<?php echo esc_attr($security_settings['json_max_depth']); ?>" 
                                           min="5" max="50" class="small-text">
                                    <p class="description"><?php _e('Niveles máximos de anidación en datos JSON', 'smart-forms-quiz'); ?></p>
                                </td>
                            </tr>
                            <tr>
                                <th scope="row"><?php _e('Timeout de sesión', 'smart-forms-quiz'); ?></th>
                                <td>
                                    <input type="number" name="sfq_security[session_timeout]" 
                                           value="<?php echo esc_attr($security_settings['session_timeout']); ?>" 
                                           min="300" max="7200" class="small-text">
                                    <p class="description"><?php _e('Tiempo en segundos antes de que expire una sesión de formulario', 'smart-forms-quiz'); ?></p>
                                </td>
                            </tr>
                        </table>
                    </div>
                    
                    <div class="sfq-security-section">
                        <h3><?php _e('🌐 Headers de Seguridad', 'smart-forms-quiz'); ?></h3>
                        <table class="form-table">
                            <tr>
                                <th scope="row"><?php _e('Headers de seguridad', 'smart-forms-quiz'); ?></th>
                                <td>
                                    <label>
                                        <input type="checkbox" name="sfq_security[enable_security_headers]" value="1" 
                                               <?php checked($security_settings['enable_security_headers']); ?>>
                                        <?php _e('Añadir headers de seguridad HTTP', 'smart-forms-quiz'); ?>
                                    </label>
                                    <p class="description"><?php _e('Incluye CSP, X-Frame-Options, X-XSS-Protection, etc.', 'smart-forms-quiz'); ?></p>
                                </td>
                            </tr>
                        </table>
                    </div>
                    
                    <div class="sfq-security-section">
                        <h3><?php _e('📝 Logging y Monitoreo', 'smart-forms-quiz'); ?></h3>
                        <table class="form-table">
                            <tr>
                                <th scope="row"><?php _e('Log de eventos de seguridad', 'smart-forms-quiz'); ?></th>
                                <td>
                                    <label>
                                        <input type="checkbox" name="sfq_security[log_security_events]" value="1" 
                                               <?php checked($security_settings['log_security_events']); ?>>
                                        <?php _e('Registrar intentos de ataques y eventos sospechosos', 'smart-forms-quiz'); ?>
                                    </label>
                                </td>
                            </tr>
                            <tr>
                                <th scope="row"><?php _e('Bloquear IPs sospechosas', 'smart-forms-quiz'); ?></th>
                                <td>
                                    <label>
                                        <input type="checkbox" name="sfq_security[block_suspicious_ips]" value="1" 
                                               <?php checked($security_settings['block_suspicious_ips']); ?>>
                                        <?php _e('Bloquear automáticamente IPs con comportamiento sospechoso', 'smart-forms-quiz'); ?>
                                    </label>
                                    <p class="description"><?php _e('⚠️ Experimental: puede bloquear usuarios legítimos', 'smart-forms-quiz'); ?></p>
                                </td>
                            </tr>
                        </table>
                    </div>
                    
                    <div class="sfq-security-section">
                        <h3><?php _e('🍯 Protección Adicional', 'smart-forms-quiz'); ?></h3>
                        <table class="form-table">
                            <tr>
                                <th scope="row"><?php _e('Campo Honeypot', 'smart-forms-quiz'); ?></th>
                                <td>
                                    <label>
                                        <input type="checkbox" name="sfq_security[enable_honeypot]" value="1" 
                                               <?php checked($security_settings['enable_honeypot']); ?>>
                                        <?php _e('Añadir campo oculto para detectar bots', 'smart-forms-quiz'); ?>
                                    </label>
                                    <p class="description"><?php _e('Campo invisible que solo los bots suelen rellenar', 'smart-forms-quiz'); ?></p>
                                </td>
                            </tr>
                        </table>
                    </div>
                    
                    <div class="sfq-security-status">
                        <h3><?php _e('📊 Estado de Seguridad', 'smart-forms-quiz'); ?></h3>
                        <div class="sfq-security-indicators">
                            <div class="sfq-indicator <?php echo $security_settings['enable_rate_limiting'] ? 'active' : 'inactive'; ?>">
                                <span class="dashicons dashicons-shield-alt"></span>
                                <span><?php _e('Rate Limiting', 'smart-forms-quiz'); ?></span>
                            </div>
                            <div class="sfq-indicator <?php echo $security_settings['enable_xss_protection'] ? 'active' : 'inactive'; ?>">
                                <span class="dashicons dashicons-lock"></span>
                                <span><?php _e('Protección XSS', 'smart-forms-quiz'); ?></span>
                            </div>
                            <div class="sfq-indicator <?php echo $security_settings['enable_security_headers'] ? 'active' : 'inactive'; ?>">
                                <span class="dashicons dashicons-admin-network"></span>
                                <span><?php _e('Headers Seguros', 'smart-forms-quiz'); ?></span>
                            </div>
                            <div class="sfq-indicator <?php echo $security_settings['log_security_events'] ? 'active' : 'inactive'; ?>">
                                <span class="dashicons dashicons-visibility"></span>
                                <span><?php _e('Monitoreo', 'smart-forms-quiz'); ?></span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Tab Rendimiento -->
                <div id="performance" class="sfq-tab-content">
                    <h2><?php _e('Configuración de Rendimiento', 'smart-forms-quiz'); ?></h2>
                    
                    <div class="sfq-performance-section">
                        <h3><?php _e('🚀 Cache y Optimización', 'smart-forms-quiz'); ?></h3>
                        <table class="form-table">
                            <tr>
                                <th scope="row"><?php _e('Cache de formularios', 'smart-forms-quiz'); ?></th>
                                <td>
                                    <label>
                                        <input type="checkbox" name="sfq_settings[enable_form_cache]" value="1" 
                                               <?php checked($settings['enable_form_cache'] ?? true); ?>>
                                        <?php _e('Activar cache de formularios', 'smart-forms-quiz'); ?>
                                    </label>
                                    <p class="description"><?php _e('Mejora el rendimiento cacheando los formularios (recomendado)', 'smart-forms-quiz'); ?></p>
                                </td>
                            </tr>
                            <tr>
                                <th scope="row"><?php _e('Tiempo de cache (minutos)', 'smart-forms-quiz'); ?></th>
                                <td>
                                    <input type="number" name="sfq_settings[cache_duration]" 
                                           value="<?php echo esc_attr($settings['cache_duration'] ?? 5); ?>" 
                                           min="1" max="60" class="small-text">
                                    <p class="description"><?php _e('Tiempo en minutos que se mantienen los formularios en cache', 'smart-forms-quiz'); ?></p>
                                </td>
                            </tr>
                            <tr>
                                <th scope="row"><?php _e('Cache de estadísticas', 'smart-forms-quiz'); ?></th>
                                <td>
                                    <label>
                                        <input type="checkbox" name="sfq_settings[enable_stats_cache]" value="1" 
                                               <?php checked($settings['enable_stats_cache'] ?? true); ?>>
                                        <?php _e('Cachear estadísticas de formularios', 'smart-forms-quiz'); ?>
                                    </label>
                                    <p class="description"><?php _e('Mejora la velocidad de carga del panel de administración', 'smart-forms-quiz'); ?></p>
                                </td>
                            </tr>
                            <tr>
                                <th scope="row"><?php _e('Minificar CSS/JS', 'smart-forms-quiz'); ?></th>
                                <td>
                                    <label>
                                        <input type="checkbox" name="sfq_settings[minify_assets]" value="1" 
                                               <?php checked($settings['minify_assets'] ?? false); ?>>
                                        <?php _e('Minificar archivos CSS y JavaScript', 'smart-forms-quiz'); ?>
                                    </label>
                                </td>
                            </tr>
                            <tr>
                                <th scope="row"><?php _e('Cargar scripts solo cuando sea necesario', 'smart-forms-quiz'); ?></th>
                                <td>
                                    <label>
                                        <input type="checkbox" name="sfq_settings[conditional_loading]" value="1" 
                                               <?php checked($settings['conditional_loading'] ?? true); ?>>
                                        <?php _e('Solo cargar scripts en páginas con formularios', 'smart-forms-quiz'); ?>
                                    </label>
                                </td>
                            </tr>
                        </table>
                    </div>
                    
                    <div class="sfq-performance-section">
                        <h3><?php _e('🗄️ Base de Datos', 'smart-forms-quiz'); ?></h3>
                        <table class="form-table">
                            <tr>
                                <th scope="row"><?php _e('Verificación de conexión', 'smart-forms-quiz'); ?></th>
                                <td>
                                    <label>
                                        <input type="checkbox" name="sfq_settings[enable_db_health_check]" value="1" 
                                               <?php checked($settings['enable_db_health_check'] ?? true); ?>>
                                        <?php _e('Verificar automáticamente la conexión de base de datos', 'smart-forms-quiz'); ?>
                                    </label>
                                    <p class="description"><?php _e('Reconecta automáticamente si se pierde la conexión', 'smart-forms-quiz'); ?></p>
                                </td>
                            </tr>
                            <tr>
                                <th scope="row"><?php _e('Logging de consultas lentas', 'smart-forms-quiz'); ?></th>
                                <td>
                                    <label>
                                        <input type="checkbox" name="sfq_settings[enable_slow_query_log]" value="1" 
                                               <?php checked($settings['enable_slow_query_log'] ?? true); ?>>
                                        <?php _e('Registrar consultas que tarden más de 1 segundo', 'smart-forms-quiz'); ?>
                                    </label>
                                    <p class="description"><?php _e('Ayuda a identificar problemas de rendimiento', 'smart-forms-quiz'); ?></p>
                                </td>
                            </tr>
                            <tr>
                                <th scope="row"><?php _e('Umbral de consulta lenta (segundos)', 'smart-forms-quiz'); ?></th>
                                <td>
                                    <input type="number" name="sfq_settings[slow_query_threshold]" 
                                           value="<?php echo esc_attr($settings['slow_query_threshold'] ?? 1.0); ?>" 
                                           min="0.1" max="10" step="0.1" class="small-text">
                                    <p class="description"><?php _e('Tiempo mínimo para considerar una consulta como lenta', 'smart-forms-quiz'); ?></p>
                                </td>
                            </tr>
                            <tr>
                                <th scope="row"><?php _e('Operaciones batch', 'smart-forms-quiz'); ?></th>
                                <td>
                                    <label>
                                        <input type="checkbox" name="sfq_settings[enable_batch_operations]" value="1" 
                                               <?php checked($settings['enable_batch_operations'] ?? true); ?>>
                                        <?php _e('Usar inserción masiva para múltiples respuestas', 'smart-forms-quiz'); ?>
                                    </label>
                                    <p class="description"><?php _e('Mejora significativamente el rendimiento con muchas respuestas', 'smart-forms-quiz'); ?></p>
                                </td>
                            </tr>
                        </table>
                    </div>
                    
                    <div class="sfq-performance-section">
                        <h3><?php _e('🧹 Mantenimiento Automático', 'smart-forms-quiz'); ?></h3>
                        <table class="form-table">
                            <tr>
                                <th scope="row"><?php _e('Limpieza automática de datos', 'smart-forms-quiz'); ?></th>
                                <td>
                                    <label>
                                        <input type="checkbox" name="sfq_settings[enable_auto_cleanup]" value="1" 
                                               <?php checked($settings['enable_auto_cleanup'] ?? false); ?>>
                                        <?php _e('Eliminar automáticamente datos antiguos', 'smart-forms-quiz'); ?>
                                    </label>
                                    <p class="description"><?php _e('Mantiene la base de datos limpia eliminando datos obsoletos', 'smart-forms-quiz'); ?></p>
                                </td>
                            </tr>
                            <tr>
                                <th scope="row"><?php _e('Días para conservar datos', 'smart-forms-quiz'); ?></th>
                                <td>
                                    <input type="number" name="sfq_settings[cleanup_days]" 
                                           value="<?php echo esc_attr($settings['cleanup_days'] ?? 90); ?>" 
                                           min="30" max="365" class="small-text">
                                    <p class="description"><?php _e('Días que se conservan las respuestas antes de eliminarlas automáticamente', 'smart-forms-quiz'); ?></p>
                                </td>
                            </tr>
                            <tr>
                                <th scope="row"><?php _e('Optimización automática de tablas', 'smart-forms-quiz'); ?></th>
                                <td>
                                    <label>
                                        <input type="checkbox" name="sfq_settings[enable_auto_optimize]" value="1" 
                                               <?php checked($settings['enable_auto_optimize'] ?? false); ?>>
                                        <?php _e('Optimizar tablas automáticamente cada semana', 'smart-forms-quiz'); ?>
                                    </label>
                                    <p class="description"><?php _e('Mantiene las tablas optimizadas para mejor rendimiento', 'smart-forms-quiz'); ?></p>
                                </td>
                            </tr>
                            <tr>
                                <th scope="row"><?php _e('Verificación de integridad', 'smart-forms-quiz'); ?></th>
                                <td>
                                    <label>
                                        <input type="checkbox" name="sfq_settings[enable_integrity_check]" value="1" 
                                               <?php checked($settings['enable_integrity_check'] ?? true); ?>>
                                        <?php _e('Verificar y reparar automáticamente problemas de integridad', 'smart-forms-quiz'); ?>
                                    </label>
                                    <p class="description"><?php _e('Detecta y corrige datos huérfanos o inconsistentes', 'smart-forms-quiz'); ?></p>
                                </td>
                            </tr>
                        </table>
                    </div>
                    
                    <div class="sfq-performance-actions">
                        <h3><?php _e('🔧 Acciones de Mantenimiento', 'smart-forms-quiz'); ?></h3>
                        <p><?php _e('Ejecuta estas acciones manualmente cuando sea necesario:', 'smart-forms-quiz'); ?></p>
                        
                        <div class="sfq-action-buttons">
                            <button type="button" class="button" id="sfq-clear-cache">
                                <span class="dashicons dashicons-trash"></span>
                                <?php _e('Limpiar Cache', 'smart-forms-quiz'); ?>
                            </button>
                            
                            <button type="button" class="button" id="sfq-optimize-db">
                                <span class="dashicons dashicons-performance"></span>
                                <?php _e('Optimizar Base de Datos', 'smart-forms-quiz'); ?>
                            </button>
                            
                            <button type="button" class="button" id="sfq-check-integrity">
                                <span class="dashicons dashicons-search"></span>
                                <?php _e('Verificar Integridad', 'smart-forms-quiz'); ?>
                            </button>
                            
                            <button type="button" class="button" id="sfq-cleanup-old-data">
                                <span class="dashicons dashicons-calendar-alt"></span>
                                <?php _e('Limpiar Datos Antiguos', 'smart-forms-quiz'); ?>
                            </button>
                            
                            <button type="button" class="button" id="sfq-get-db-stats">
                                <span class="dashicons dashicons-chart-pie"></span>
                                <?php _e('Ver Estadísticas BD', 'smart-forms-quiz'); ?>
                            </button>
                        </div>
                        
                        <div id="sfq-maintenance-results" class="sfq-maintenance-results" style="display: none;">
                            <h4><?php _e('Resultados:', 'smart-forms-quiz'); ?></h4>
                            <div class="sfq-results-content"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Tab Notificaciones -->
                <div id="notifications" class="sfq-tab-content">
                    <h2><?php _e('Configuración de Notificaciones', 'smart-forms-quiz'); ?></h2>
                    <table class="form-table">
                        <tr>
                            <th scope="row"><?php _e('Email del administrador', 'smart-forms-quiz'); ?></th>
                            <td>
                                <input type="email" name="sfq_settings[admin_email]" 
                                       value="<?php echo esc_attr($settings['admin_email'] ?? get_option('admin_email')); ?>" 
                                       class="regular-text">
                                <p class="description"><?php _e('Email para recibir notificaciones de nuevas respuestas', 'smart-forms-quiz'); ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row"><?php _e('Notificar nuevas respuestas', 'smart-forms-quiz'); ?></th>
                            <td>
                                <label>
                                    <input type="checkbox" name="sfq_settings[notify_new_responses]" value="1" 
                                           <?php checked($settings['notify_new_responses'] ?? false); ?>>
                                    <?php _e('Enviar email cuando se reciba una nueva respuesta', 'smart-forms-quiz'); ?>
                                </label>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row"><?php _e('Notificar eventos de seguridad', 'smart-forms-quiz'); ?></th>
                            <td>
                                <label>
                                    <input type="checkbox" name="sfq_settings[notify_security_events]" value="1" 
                                           <?php checked($settings['notify_security_events'] ?? false); ?>>
                                    <?php _e('Enviar email cuando se detecten intentos de ataque', 'smart-forms-quiz'); ?>
                                </label>
                            </td>
                        </tr>
                    </table>
                </div>
                
                <?php submit_button(__('Guardar Configuración', 'smart-forms-quiz'), 'primary', 'submit'); ?>
            </form>
        </div>
        
        <style>
            .sfq-settings-wrap {
                max-width: 1200px;
            }
            
            .sfq-settings-tabs {
                margin-bottom: 20px;
            }
            
            .sfq-tab-content {
                display: none;
                background: white;
                padding: 20px;
                border: 1px solid #ccd0d4;
                box-shadow: 0 1px 1px rgba(0,0,0,.04);
            }
            
            .sfq-tab-content.active {
                display: block;
            }
            
            .sfq-security-section, .sfq-performance-section {
                margin-bottom: 30px;
                padding: 20px;
                background: #f8f9fa;
                border-left: 4px solid #007cba;
                border-radius: 4px;
            }
            
            .sfq-security-section h3, .sfq-performance-section h3 {
                margin-top: 0;
                color: #007cba;
            }
            
            .sfq-security-status {
                background: #fff;
                padding: 20px;
                border: 1px solid #ddd;
                border-radius: 8px;
                margin-top: 20px;
            }
            
            .sfq-security-indicators {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin-top: 15px;
            }
            
            .sfq-indicator {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 15px;
                border-radius: 6px;
                font-weight: 500;
            }
            
            .sfq-indicator.active {
                background: #d1eddb;
                color: #155724;
                border: 1px solid #c3e6cb;
            }
            
            .sfq-indicator.inactive {
                background: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
            }
            
            .sfq-indicator .dashicons {
                font-size: 20px;
                width: 20px;
                height: 20px;
            }
            
            .form-table th {
                width: 250px;
            }
            
            .description {
                font-style: italic;
                color: #666;
            }
            
            /* Estilos para las acciones de mantenimiento */
            .sfq-performance-actions {
                background: #fff;
                padding: 20px;
                border: 1px solid #ddd;
                border-radius: 8px;
                margin-top: 20px;
            }
            
            .sfq-action-buttons {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin: 20px 0;
            }
            
            .sfq-action-buttons .button {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 12px 16px;
                height: auto;
                font-weight: 500;
                transition: all 0.2s ease;
            }
            
            .sfq-action-buttons .button:hover {
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .sfq-action-buttons .button:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
                box-shadow: none;
            }
            
            .sfq-action-buttons .button .dashicons {
                font-size: 16px;
                width: 16px;
                height: 16px;
            }
            
            .sfq-maintenance-results {
                margin-top: 20px;
                padding: 15px;
                background: #f8f9fa;
                border: 1px solid #ddd;
                border-radius: 4px;
            }
            
            .sfq-maintenance-results h4 {
                margin-top: 0;
                color: #007cba;
            }
            
            .sfq-results-content {
                font-family: monospace;
                background: #fff;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 3px;
                max-height: 300px;
                overflow-y: auto;
            }
            
            .sfq-result-success {
                color: #155724;
                background: #d1eddb;
                padding: 8px 12px;
                border-radius: 3px;
                margin: 5px 0;
            }
            
            .sfq-result-error {
                color: #721c24;
                background: #f8d7da;
                padding: 8px 12px;
                border-radius: 3px;
                margin: 5px 0;
            }
            
            .sfq-result-info {
                color: #0c5460;
                background: #d1ecf1;
                padding: 8px 12px;
                border-radius: 3px;
                margin: 5px 0;
            }
            
            /* Animación de loading */
            @keyframes sfq-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .sfq-loading .dashicons {
                animation: sfq-spin 1s linear infinite;
            }
        </style>
        
        <script>
        jQuery(document).ready(function($) {
            // Manejo de tabs
            $('.nav-tab').on('click', function(e) {
                e.preventDefault();
                
                // Remover clase activa de todos los tabs
                $('.nav-tab').removeClass('nav-tab-active');
                $('.sfq-tab-content').removeClass('active');
                
                // Activar tab clickeado
                $(this).addClass('nav-tab-active');
                const target = $(this).attr('href');
                $(target).addClass('active');
            });
            
            // Mostrar/ocultar configuraciones dependientes
            $('input[name="sfq_security[enable_rate_limiting]"]').on('change', function() {
                const relatedRows = $(this).closest('table').find('tr').slice(1, 3);
                if ($(this).is(':checked')) {
                    relatedRows.show();
                } else {
                    relatedRows.hide();
                }
            }).trigger('change');
            
            // Validación de formulario
            $('form').on('submit', function(e) {
                const rateLimit = parseInt($('input[name="sfq_security[rate_limit_requests]"]').val());
                const timeWindow = parseInt($('input[name="sfq_security[rate_limit_window]"]').val());
                
                if (rateLimit < 1 || rateLimit > 100) {
                    alert('El número de envíos debe estar entre 1 y 100');
                    e.preventDefault();
                    return false;
                }
                
                if (timeWindow < 60 || timeWindow > 3600) {
                    alert('La ventana de tiempo debe estar entre 60 y 3600 segundos');
                    e.preventDefault();
                    return false;
                }
            });
            
            // Funciones de mantenimiento
            function executeMaintenanceAction(action, buttonId, confirmMessage = null) {
                const $button = $('#' + buttonId);
                const originalHtml = $button.html();
                
                // Confirmar acción si es necesario
                if (confirmMessage && !confirm(confirmMessage)) {
                    return;
                }
                
                // Deshabilitar botón y mostrar loading
                $button.prop('disabled', true).addClass('sfq-loading');
                $button.html('<span class="dashicons dashicons-update-alt"></span> Procesando...');
                
                // Mostrar área de resultados
                $('#sfq-maintenance-results').show();
                $('.sfq-results-content').html('<div class="sfq-result-info">Ejecutando ' + action + '...</div>');
                
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'sfq_maintenance_action',
                        nonce: '<?php echo wp_create_nonce('sfq_maintenance_nonce'); ?>',
                        maintenance_action: action
                    },
                    success: function(response) {
                        if (response.success) {
                            let resultHtml = '<div class="sfq-result-success">✓ ' + response.data.message + '</div>';
                            
                            // Mostrar detalles adicionales si existen
                            if (response.data.details) {
                                if (Array.isArray(response.data.details)) {
                                    response.data.details.forEach(function(detail) {
                                        resultHtml += '<div class="sfq-result-info">• ' + detail + '</div>';
                                    });
                                } else if (typeof response.data.details === 'object') {
                                    Object.keys(response.data.details).forEach(function(key) {
                                        resultHtml += '<div class="sfq-result-info"><strong>' + key + ':</strong> ' + response.data.details[key] + '</div>';
                                    });
                                } else {
                                    resultHtml += '<div class="sfq-result-info">' + response.data.details + '</div>';
                                }
                            }
                            
                            $('.sfq-results-content').html(resultHtml);
                        } else {
                            $('.sfq-results-content').html(
                                '<div class="sfq-result-error">✗ Error: ' + (response.data.message || 'Error desconocido') + '</div>'
                            );
                        }
                    },
                    error: function(xhr, status, error) {
                        $('.sfq-results-content').html(
                            '<div class="sfq-result-error">✗ Error de conexión: ' + error + '</div>'
                        );
                    },
                    complete: function() {
                        // Restaurar botón
                        $button.prop('disabled', false).removeClass('sfq-loading');
                        $button.html(originalHtml);
                    }
                });
            }
            
            // Handlers para botones de mantenimiento
            $('#sfq-clear-cache').on('click', function() {
                executeMaintenanceAction('clear_cache', 'sfq-clear-cache');
            });
            
            $('#sfq-optimize-db').on('click', function() {
                executeMaintenanceAction('optimize_database', 'sfq-optimize-db', 
                    '¿Estás seguro de que quieres optimizar la base de datos? Esto puede tardar unos minutos.');
            });
            
            $('#sfq-check-integrity').on('click', function() {
                executeMaintenanceAction('check_integrity', 'sfq-check-integrity');
            });
            
            $('#sfq-cleanup-old-data').on('click', function() {
                executeMaintenanceAction('cleanup_old_data', 'sfq-cleanup-old-data',
                    '¿Estás seguro de que quieres eliminar datos antiguos? Esta acción no se puede deshacer.');
            });
            
            $('#sfq-get-db-stats').on('click', function() {
                executeMaintenanceAction('get_database_stats', 'sfq-get-db-stats');
            });
        });
        </script>
        <?php
    }
    
    /**
     * Guardar configuraciones
     */
    private function save_settings() {
        // Validar permisos
        if (!current_user_can('manage_options')) {
            wp_die(__('No tienes permisos para realizar esta acción', 'smart-forms-quiz'));
        }
        
        // Sanitizar y guardar configuraciones generales
        $general_settings = array();
        if (isset($_POST['sfq_settings'])) {
            $general_settings = array(
                'required_capability' => sanitize_text_field($_POST['sfq_settings']['required_capability'] ?? 'manage_options'),
                'delete_data_on_uninstall' => isset($_POST['sfq_settings']['delete_data_on_uninstall']),
                'debug_mode' => isset($_POST['sfq_settings']['debug_mode']),
                'enable_form_cache' => isset($_POST['sfq_settings']['enable_form_cache']),
                'minify_assets' => isset($_POST['sfq_settings']['minify_assets']),
                'conditional_loading' => isset($_POST['sfq_settings']['conditional_loading']),
                'admin_email' => sanitize_email($_POST['sfq_settings']['admin_email'] ?? get_option('admin_email')),
                'notify_new_responses' => isset($_POST['sfq_settings']['notify_new_responses']),
                'notify_security_events' => isset($_POST['sfq_settings']['notify_security_events'])
            );
        }
        
        // Sanitizar y guardar configuraciones de seguridad
        $security_settings = array();
        if (isset($_POST['sfq_security'])) {
            $security_settings = array(
                'enable_rate_limiting' => isset($_POST['sfq_security']['enable_rate_limiting']),
                'rate_limit_requests' => max(1, min(100, intval($_POST['sfq_security']['rate_limit_requests'] ?? 10))),
                'rate_limit_window' => max(60, min(3600, intval($_POST['sfq_security']['rate_limit_window'] ?? 300))),
                'enable_xss_protection' => isset($_POST['sfq_security']['enable_xss_protection']),
                'max_response_length' => max(100, min(10000, intval($_POST['sfq_security']['max_response_length'] ?? 2000))),
                'allowed_html_tags' => sanitize_text_field($_POST['sfq_security']['allowed_html_tags'] ?? ''),
                'json_max_depth' => max(5, min(50, intval($_POST['sfq_security']['json_max_depth'] ?? 10))),
                'session_timeout' => max(300, min(7200, intval($_POST['sfq_security']['session_timeout'] ?? 3600))),
                'enable_security_headers' => isset($_POST['sfq_security']['enable_security_headers']),
                'log_security_events' => isset($_POST['sfq_security']['log_security_events']),
                'block_suspicious_ips' => isset($_POST['sfq_security']['block_suspicious_ips']),
                'enable_honeypot' => isset($_POST['sfq_security']['enable_honeypot'])
            );
        }
        
        // Guardar en la base de datos
        update_option('sfq_settings', $general_settings);
        update_option('sfq_security_settings', $security_settings);
        
        // Mostrar mensaje de éxito
        add_action('admin_notices', function() {
            echo '<div class="notice notice-success is-dismissible"><p>' . __('Configuración guardada correctamente', 'smart-forms-quiz') . '</p></div>';
        });
    }
    
}
