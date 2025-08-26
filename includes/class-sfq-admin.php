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
