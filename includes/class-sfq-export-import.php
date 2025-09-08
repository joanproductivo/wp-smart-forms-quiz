<?php
/**
 * Sistema de Exportación e Importación para Smart Forms Quiz
 * 
 * Maneja la exportación e importación completa de formularios incluyendo:
 * - Datos básicos del formulario
 * - Preguntas normales y freestyle
 * - Elementos freestyle (12 tipos)
 * - Variables globales
 * - Condiciones y lógica condicional
 * - Configuraciones de límites y estilos
 * - Validaciones de seguridad completas
 */

if (!defined('ABSPATH')) {
    exit;
}

class SFQ_Export_Import {
    
    private $database;
    private $version = '2.0.0';
    
    // Tipos de elementos freestyle válidos
    private $valid_freestyle_types = [
        'text', 'video', 'image', 'countdown', 'phone', 'email', 
        'file_upload', 'button', 'rating', 'dropdown', 'checkbox', 
        'legal_text', 'variable_display', 'styled_text'
    ];
    
    // Tipos de preguntas válidos
    private $valid_question_types = [
        'single_choice', 'multiple_choice', 'text', 'email', 
        'rating', 'image_choice', 'freestyle'
    ];
    
    // Tipos de condiciones válidos
    private $valid_condition_types = [
        'answer_equals', 'answer_contains', 'answer_not_equals',
        'variable_greater', 'variable_less', 'variable_equals'
    ];
    
    // Tipos de acciones válidos
    private $valid_action_types = [
        'goto_question', 'skip_to_end', 'redirect_url', 
        'show_message', 'add_variable', 'set_variable'
    ];
    
    public function __construct() {
        $this->database = new SFQ_Database();
    }
    
    /**
     * Exportar formulario completo
     */
    public function export_form($form_id) {
        try {
            // Validar ID del formulario
            $form_id = intval($form_id);
            if ($form_id <= 0) {
                throw new Exception(__('ID de formulario inválido', 'smart-forms-quiz'));
            }
            
            // Obtener formulario completo
            $form = $this->database->get_form($form_id);
            if (!$form) {
                throw new Exception(__('Formulario no encontrado', 'smart-forms-quiz'));
            }
            
            // Construir datos de exportación
            $export_data = $this->build_export_data($form);
            
            // Validar datos de exportación
            $this->validate_export_data($export_data);
            
            // Generar nombre de archivo
            $filename = $this->generate_export_filename($form->title);
            
            return [
                'success' => true,
                'data' => $export_data,
                'filename' => $filename,
                'message' => __('Formulario exportado correctamente', 'smart-forms-quiz')
            ];
            
        } catch (Exception $e) {
            error_log('SFQ Export Error: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => $e->getMessage(),
                'debug' => WP_DEBUG ? $e->getTraceAsString() : null
            ];
        }
    }
    
    /**
     * Construir datos completos de exportación
     */
    private function build_export_data($form) {
        $export_data = [
            // Metadatos de exportación
            'export_info' => [
                'plugin_version' => SFQ_VERSION ?? '2.0.0',
                'export_version' => $this->version,
                'export_date' => current_time('mysql'),
                'export_timestamp' => current_time('timestamp'),
                'wordpress_version' => get_bloginfo('version'),
                'php_version' => PHP_VERSION,
                'exported_by' => get_current_user_id(),
                'site_url' => get_site_url()
            ],
            
            // Datos básicos del formulario
            'form_data' => [
                'title' => $form->title,
                'description' => $form->description,
                'type' => $form->type,
                'status' => $form->status,
                'intro_title' => $form->intro_title,
                'intro_description' => $form->intro_description,
                'intro_button_text' => $form->intro_button_text,
                'thank_you_message' => $form->thank_you_message,
                'redirect_url' => $form->redirect_url
            ],
            
            // Configuraciones del formulario
            'settings' => $this->export_form_settings($form->settings ?? []),
            
            // Configuraciones de estilo
            'style_settings' => $this->export_style_settings($form->style_settings ?? []),
            
            // Variables globales
            'global_variables' => $this->export_global_variables($form->global_variables ?? []),
            
            // Preguntas con todos sus datos
            'questions' => $this->export_questions($form->questions ?? []),
            
            // Estadísticas de exportación
            'export_stats' => [
                'total_questions' => count($form->questions ?? []),
                'freestyle_questions' => $this->count_freestyle_questions($form->questions ?? []),
                'normal_questions' => $this->count_normal_questions($form->questions ?? []),
                'total_conditions' => $this->count_total_conditions($form->questions ?? []),
                'total_freestyle_elements' => $this->count_freestyle_elements($form->questions ?? [])
            ]
        ];
        
        return $export_data;
    }
    
    /**
     * Exportar configuraciones del formulario
     */
    private function export_form_settings($settings) {
        if (!is_array($settings)) {
            return [];
        }
        
        // Limpiar y validar configuraciones
        $clean_settings = [];
        
        // Configuraciones básicas
        $basic_settings = [
            'show_progress_bar', 'show_question_numbers', 'auto_advance', 
            'allow_back', 'randomize_questions', 'save_partial',
            'enable_floating_preview', 'auto_scroll_to_form', 'show_processing_indicator',
            'show_submit_loading', 'secure_loading', 'show_intro_screen'
        ];
        
        foreach ($basic_settings as $setting) {
            if (isset($settings[$setting])) {
                $clean_settings[$setting] = (bool) $settings[$setting];
            }
        }
        
        // Configuraciones de texto
        $text_settings = [
            'processing_indicator_text', 'redirect_indicator_text',
            'processing_indicator_bg_color', 'processing_indicator_text_color',
            'processing_indicator_spinner_color', 'redirect_indicator_bg_color',
            'redirect_indicator_text_color', 'redirect_indicator_spinner_color'
        ];
        
        foreach ($text_settings as $setting) {
            if (isset($settings[$setting])) {
                $clean_settings[$setting] = sanitize_text_field($settings[$setting]);
            }
        }
        
        // Configuraciones numéricas
        $numeric_settings = [
            'processing_indicator_delay', 'processing_indicator_opacity',
            'redirect_indicator_opacity'
        ];
        
        foreach ($numeric_settings as $setting) {
            if (isset($settings[$setting])) {
                $clean_settings[$setting] = floatval($settings[$setting]);
            }
        }
        
        // Configuraciones de límites
        $limit_settings = [
            'submission_limit_count', 'submission_limit_period', 'limit_type',
            'require_login', 'enable_schedule', 'schedule_start', 'schedule_end',
            'enable_max_submissions', 'max_submissions', 'max_submissions_limit_type'
        ];
        
        foreach ($limit_settings as $setting) {
            if (isset($settings[$setting])) {
                if (in_array($setting, ['submission_limit_count', 'max_submissions'])) {
                    $clean_settings[$setting] = intval($settings[$setting]);
                } elseif (in_array($setting, ['require_login', 'enable_schedule', 'enable_max_submissions'])) {
                    $clean_settings[$setting] = (bool) $settings[$setting];
                } else {
                    $clean_settings[$setting] = sanitize_text_field($settings[$setting]);
                }
            }
        }
        
        // Mensajes personalizados de límites
        $message_settings = [
            'limit_submission_icon', 'limit_submission_title', 'limit_submission_description',
            'limit_submission_button_text', 'limit_submission_button_url',
            'limit_participants_icon', 'limit_participants_title', 'limit_participants_button_text',
            'limit_participants_button_url', 'limit_login_icon', 'limit_login_title',
            'limit_login_description', 'limit_login_button_text', 'limit_schedule_icon',
            'limit_schedule_not_started_title', 'schedule_not_started_message',
            'limit_schedule_ended_title', 'schedule_ended_message', 'limit_schedule_button_text',
            'limit_schedule_button_url', 'max_submissions_message'
        ];
        
        foreach ($message_settings as $setting) {
            if (isset($settings[$setting])) {
                if (strpos($setting, '_url') !== false) {
                    $clean_settings[$setting] = esc_url_raw($settings[$setting]);
                } elseif (strpos($setting, '_icon') !== false) {
                    $clean_settings[$setting] = wp_kses_post($settings[$setting]);
                } else {
                    $clean_settings[$setting] = sanitize_textarea_field($settings[$setting]);
                }
            }
        }
        
        // Configuraciones de bloqueo de formulario
        $block_settings = [
            'block_form', 'block_form_enable_timer', 'block_form_timer_date',
            'block_form_timer_timezone', 'block_form_timer_show_form', 'block_form_timer_hide_all'
        ];
        
        foreach ($block_settings as $setting) {
            if (isset($settings[$setting])) {
                if (in_array($setting, ['block_form', 'block_form_enable_timer', 'block_form_timer_show_form', 'block_form_timer_hide_all'])) {
                    $clean_settings[$setting] = (bool) $settings[$setting];
                } else {
                    $clean_settings[$setting] = sanitize_text_field($settings[$setting]);
                }
            }
        }
        
        // Preservar cualquier configuración adicional no listada
        foreach ($settings as $key => $value) {
            if (!isset($clean_settings[$key])) {
                $clean_settings[$key] = $this->sanitize_mixed_value($value);
            }
        }
        
        return $clean_settings;
    }
    
    /**
     * Exportar configuraciones de estilo
     */
    private function export_style_settings($style_settings) {
        if (!is_array($style_settings)) {
            return [];
        }
        
        $clean_styles = [];
        
        // Colores
        $color_settings = [
            'primary_color', 'secondary_color', 'background_color', 'text_color',
            'options_background_color', 'options_border_color', 'input_border_color',
            'question_text_color', 'intro_title_color', 'intro_description_color'
        ];
        
        foreach ($color_settings as $setting) {
            if (isset($style_settings[$setting])) {
                $clean_styles[$setting] = $this->validate_color($style_settings[$setting]);
            }
        }
        
        // Configuraciones de imagen de fondo
        $bg_settings = [
            'background_image_url', 'background_image_id', 'background_image_data',
            'background_size', 'background_repeat', 'background_position',
            'background_attachment', 'background_opacity', 'background_overlay',
            'background_overlay_color', 'background_overlay_opacity'
        ];
        
        foreach ($bg_settings as $setting) {
            if (isset($style_settings[$setting])) {
                if ($setting === 'background_image_url') {
                    $clean_styles[$setting] = esc_url_raw($style_settings[$setting]);
                } elseif ($setting === 'background_image_id') {
                    $clean_styles[$setting] = intval($style_settings[$setting]);
                } elseif (in_array($setting, ['background_opacity', 'background_overlay_opacity'])) {
                    $clean_styles[$setting] = floatval($style_settings[$setting]);
                } elseif ($setting === 'background_overlay') {
                    $clean_styles[$setting] = (bool) $style_settings[$setting];
                } else {
                    $clean_styles[$setting] = sanitize_text_field($style_settings[$setting]);
                }
            }
        }
        
        // Configuraciones de gradiente animado
        $gradient_settings = [
            'intro_animated_background', 'intro_screen_animated_background',
            'intro_gradient_color_1', 'intro_gradient_color_2', 'intro_gradient_color_3', 'intro_gradient_color_4',
            'intro_screen_gradient_color_1', 'intro_screen_gradient_color_2', 'intro_screen_gradient_color_3', 'intro_screen_gradient_color_4',
            'intro_gradient_speed', 'intro_gradient_angle', 'intro_gradient_size',
            'intro_screen_gradient_speed', 'intro_screen_gradient_angle', 'intro_screen_gradient_size'
        ];
        
        foreach ($gradient_settings as $setting) {
            if (isset($style_settings[$setting])) {
                if (strpos($setting, '_color_') !== false) {
                    $clean_styles[$setting] = $this->validate_color($style_settings[$setting]);
                } elseif (in_array($setting, ['intro_animated_background', 'intro_screen_animated_background'])) {
                    $clean_styles[$setting] = (bool) $style_settings[$setting];
                } else {
                    $clean_styles[$setting] = intval($style_settings[$setting]);
                }
            }
        }
        
        // Configuraciones de mensajes de límite
        $limit_style_settings = [
            'limit_background_color', 'limit_border_color', 'limit_icon_color',
            'limit_title_color', 'limit_text_color', 'limit_button_bg_color',
            'limit_button_text_color'
        ];
        
        foreach ($limit_style_settings as $setting) {
            if (isset($style_settings[$setting])) {
                $clean_styles[$setting] = $this->validate_color($style_settings[$setting]);
            }
        }
        
        // Configuraciones de bloqueo de formulario
        $block_style_settings = [
            'block_form_bg_color', 'block_form_border_color', 'block_form_icon_color',
            'block_form_title_color', 'block_form_text_color', 'block_form_button_bg_color',
            'block_form_button_text_color', 'block_form_disable_shadow'
        ];
        
        foreach ($block_style_settings as $setting) {
            if (isset($style_settings[$setting])) {
                if ($setting === 'block_form_disable_shadow') {
                    $clean_styles[$setting] = (bool) $style_settings[$setting];
                } else {
                    $clean_styles[$setting] = $this->validate_color($style_settings[$setting]);
                }
            }
        }
        
        // Preservar configuraciones adicionales
        foreach ($style_settings as $key => $value) {
            if (!isset($clean_styles[$key])) {
                $clean_styles[$key] = $this->sanitize_mixed_value($value);
            }
        }
        
        return $clean_styles;
    }
    
    /**
     * Exportar variables globales
     */
    private function export_global_variables($global_variables) {
        if (!is_array($global_variables)) {
            return [];
        }
        
        $clean_variables = [];
        
        foreach ($global_variables as $variable) {
            if (!is_array($variable)) {
                continue;
            }
            
            $clean_variable = [
                'id' => sanitize_text_field($variable['id'] ?? ''),
                'name' => sanitize_text_field($variable['name'] ?? ''),
                'initial_value' => $this->sanitize_mixed_value($variable['initial_value'] ?? 0),
                'description' => sanitize_textarea_field($variable['description'] ?? '')
            ];
            
            // Solo añadir si tiene nombre válido
            if (!empty($clean_variable['name'])) {
                $clean_variables[] = $clean_variable;
            }
        }
        
        return $clean_variables;
    }
    
    /**
     * Exportar preguntas con todos sus datos
     */
    private function export_questions($questions) {
        if (!is_array($questions)) {
            return [];
        }
        
        $clean_questions = [];
        
        foreach ($questions as $question) {
            $clean_question = $this->export_single_question($question);
            if ($clean_question) {
                $clean_questions[] = $clean_question;
            }
        }
        
        return $clean_questions;
    }
    
    /**
     * Exportar una pregunta individual
     */
    private function export_single_question($question) {
        if (!is_object($question) && !is_array($question)) {
            return null;
        }
        
        $question = (object) $question;
        
        // Validar tipo de pregunta
        if (!in_array($question->question_type ?? '', $this->valid_question_types)) {
            return null;
        }
        
        $clean_question = [
            'question_text' => sanitize_textarea_field($question->question_text ?? ''),
            'question_type' => sanitize_text_field($question->question_type),
            'required' => (bool) ($question->required ?? false),
            'order_position' => intval($question->order_position ?? 0),
            'variable_name' => sanitize_text_field($question->variable_name ?? ''),
            'variable_value' => intval($question->variable_value ?? 0)
        ];
        
        // Exportar configuraciones de la pregunta
        $clean_question['settings'] = $this->export_question_settings($question->settings ?? []);
        
        // Exportar según el tipo de pregunta
        if ($question->question_type === 'freestyle') {
            $clean_question['freestyle_elements'] = $this->export_freestyle_elements($question->freestyle_elements ?? []);
            $clean_question['global_settings'] = $this->export_freestyle_global_settings($question->global_settings ?? []);
            $clean_question['options'] = []; // Las preguntas freestyle no tienen opciones tradicionales
            
            // Exportar campo pantallaFinal si existe
            if (isset($question->pantallaFinal)) {
                $clean_question['pantallaFinal'] = (bool) $question->pantallaFinal;
            }
        } else {
            $clean_question['options'] = $this->export_question_options($question->options ?? []);
            $clean_question['freestyle_elements'] = [];
            $clean_question['global_settings'] = [];
        }
        
        // Exportar condiciones
        $clean_question['conditions'] = $this->export_question_conditions($question->conditions ?? []);
        
        return $clean_question;
    }
    
    /**
     * Exportar configuraciones de pregunta
     */
    private function export_question_settings($settings) {
        if (!is_array($settings)) {
            return [];
        }
        
        $clean_settings = [];
        
        // Configuraciones básicas
        $basic_settings = [
            'hide_title', 'block_question', 'show_next_button', 'next_button_text',
            'next_button_custom_style', 'placeholder'
        ];
        
        foreach ($basic_settings as $setting) {
            if (isset($settings[$setting])) {
                if (in_array($setting, ['hide_title', 'block_question', 'show_next_button', 'next_button_custom_style'])) {
                    $clean_settings[$setting] = (bool) $settings[$setting];
                } else {
                    $clean_settings[$setting] = sanitize_text_field($settings[$setting]);
                }
            }
        }
        
        // Configuraciones de estilo de botón
        if (isset($settings['next_button_style']) && is_array($settings['next_button_style'])) {
            $clean_settings['next_button_style'] = $this->export_button_style($settings['next_button_style']);
        }
        
        // Configuraciones de rating
        $rating_settings = ['rating_type', 'max_rating'];
        foreach ($rating_settings as $setting) {
            if (isset($settings[$setting])) {
                if ($setting === 'max_rating') {
                    $clean_settings[$setting] = intval($settings[$setting]);
                } else {
                    $clean_settings[$setting] = sanitize_text_field($settings[$setting]);
                }
            }
        }
        
        // Preservar configuraciones adicionales
        foreach ($settings as $key => $value) {
            if (!isset($clean_settings[$key])) {
                $clean_settings[$key] = $this->sanitize_mixed_value($value);
            }
        }
        
        return $clean_settings;
    }
    
    /**
     * Exportar estilo de botón
     */
    private function export_button_style($button_style) {
        if (!is_array($button_style)) {
            return [];
        }
        
        $clean_style = [];
        
        // Colores
        $color_fields = [
            'background_color', 'border_color', 'text_color', 'gradient_color'
        ];
        
        foreach ($color_fields as $field) {
            if (isset($button_style[$field])) {
                $clean_style[$field] = $this->validate_color($button_style[$field]);
            }
        }
        
        // Valores numéricos
        $numeric_fields = [
            'background_opacity', 'border_opacity', 'border_radius', 'font_size'
        ];
        
        foreach ($numeric_fields as $field) {
            if (isset($button_style[$field])) {
                $clean_style[$field] = floatval($button_style[$field]);
            }
        }
        
        // Valores booleanos
        $boolean_fields = [
            'gradient_enabled', 'gradient_animated', 'box_shadow', 'text_shadow'
        ];
        
        foreach ($boolean_fields as $field) {
            if (isset($button_style[$field])) {
                $clean_style[$field] = (bool) $button_style[$field];
            }
        }
        
        // Valores de texto
        $text_fields = ['font_weight'];
        foreach ($text_fields as $field) {
            if (isset($button_style[$field])) {
                $clean_style[$field] = sanitize_text_field($button_style[$field]);
            }
        }
        
        return $clean_style;
    }
    
    /**
     * Exportar opciones de pregunta
     */
    private function export_question_options($options) {
        if (!is_array($options)) {
            return [];
        }
        
        $clean_options = [];
        
        foreach ($options as $option) {
            if (is_string($option)) {
                $clean_options[] = [
                    'text' => sanitize_text_field($option),
                    'value' => sanitize_text_field($option),
                    'image' => '',
                    'image_id' => '',
                    'image_alt' => ''
                ];
            } elseif (is_array($option) || is_object($option)) {
                $option = (array) $option;
                $clean_options[] = [
                    'text' => sanitize_text_field($option['text'] ?? $option['value'] ?? ''),
                    'value' => sanitize_text_field($option['value'] ?? $option['text'] ?? ''),
                    'image' => esc_url_raw($option['image'] ?? ''),
                    'image_id' => intval($option['image_id'] ?? 0),
                    'image_alt' => sanitize_text_field($option['image_alt'] ?? '')
                ];
            }
        }
        
        return array_filter($clean_options, function($option) {
            return !empty($option['text']) || !empty($option['image']);
        });
    }
    
    /**
     * Exportar elementos freestyle
     */
    private function export_freestyle_elements($elements) {
        if (!is_array($elements)) {
            return [];
        }
        
        $clean_elements = [];
        
        foreach ($elements as $element) {
            if (!is_array($element)) {
                continue;
            }
            
            // Validar tipo de elemento
            if (!in_array($element['type'] ?? '', $this->valid_freestyle_types)) {
                continue;
            }
            
            $clean_element = [
                'id' => sanitize_text_field($element['id'] ?? ''),
                'type' => sanitize_text_field($element['type']),
                'label' => sanitize_text_field($element['label'] ?? ''),
                'order' => intval($element['order'] ?? 0),
                'value' => sanitize_textarea_field($element['value'] ?? ''),
                'settings' => $this->export_freestyle_element_settings($element['settings'] ?? [], $element['type'])
            ];
            
            $clean_elements[] = $clean_element;
        }
        
        // Ordenar por orden
        usort($clean_elements, function($a, $b) {
            return $a['order'] - $b['order'];
        });
        
        return $clean_elements;
    }
    
    /**
     * Exportar configuraciones de elemento freestyle
     */
    private function export_freestyle_element_settings($settings, $element_type) {
        if (!is_array($settings)) {
            return [];
        }
        
        $clean_settings = [];
        
        // Configuraciones comunes
        $common_settings = [
            'required', 'placeholder', 'description', 'css_class', 'css_id'
        ];
        
        foreach ($common_settings as $setting) {
            if (isset($settings[$setting])) {
                if ($setting === 'required') {
                    $clean_settings[$setting] = (bool) $settings[$setting];
                } else {
                    $clean_settings[$setting] = sanitize_text_field($settings[$setting]);
                }
            }
        }
        
        // Configuraciones específicas por tipo
        switch ($element_type) {
            case 'styled_text':
                $styled_text_settings = [
                    'content', 'text_align', 'font_size', 'font_weight', 'text_color',
                    'background_color', 'padding', 'margin', 'border_radius',
                    'border_width', 'border_color', 'border_style'
                ];
                
                foreach ($styled_text_settings as $setting) {
                    if (isset($settings[$setting])) {
                        if (strpos($setting, '_color') !== false) {
                            $clean_settings[$setting] = $this->validate_color($settings[$setting]);
                        } elseif (in_array($setting, ['font_size', 'padding', 'margin', 'border_radius', 'border_width'])) {
                            $clean_settings[$setting] = intval($settings[$setting]);
                        } else {
                            $clean_settings[$setting] = sanitize_text_field($settings[$setting]);
                        }
                    }
                }
                break;
                
            case 'video':
                $video_settings = ['video_url', 'autoplay', 'controls', 'width', 'height'];
                foreach ($video_settings as $setting) {
                    if (isset($settings[$setting])) {
                        if ($setting === 'video_url') {
                            $clean_settings[$setting] = esc_url_raw($settings[$setting]);
                        } elseif (in_array($setting, ['autoplay', 'controls'])) {
                            $clean_settings[$setting] = (bool) $settings[$setting];
                        } else {
                            $clean_settings[$setting] = intval($settings[$setting]);
                        }
                    }
                }
                break;
                
            case 'image':
                $image_settings = ['image_url', 'alt_text', 'width', 'height', 'clickable', 'click_url'];
                foreach ($image_settings as $setting) {
                    if (isset($settings[$setting])) {
                        if (in_array($setting, ['image_url', 'click_url'])) {
                            $clean_settings[$setting] = esc_url_raw($settings[$setting]);
                        } elseif ($setting === 'clickable') {
                            $clean_settings[$setting] = (bool) $settings[$setting];
                        } elseif (in_array($setting, ['width', 'height'])) {
                            $clean_settings[$setting] = intval($settings[$setting]);
                        } else {
                            $clean_settings[$setting] = sanitize_text_field($settings[$setting]);
                        }
                    }
                }
                break;
                
            case 'button':
                $button_settings = ['button_text', 'button_action', 'button_url', 'button_style'];
                foreach ($button_settings as $setting) {
                    if (isset($settings[$setting])) {
                        if ($setting === 'button_url') {
                            $clean_settings[$setting] = esc_url_raw($settings[$setting]);
                        } elseif ($setting === 'button_style' && is_array($settings[$setting])) {
                            $clean_settings[$setting] = $this->export_button_style($settings[$setting]);
                        } else {
                            $clean_settings[$setting] = sanitize_text_field($settings[$setting]);
                        }
                    }
                }
                break;
                
            case 'rating':
                $rating_settings = ['rating_type', 'max_rating', 'rating_style'];
                foreach ($rating_settings as $setting) {
                    if (isset($settings[$setting])) {
                        if ($setting === 'max_rating') {
                            $clean_settings[$setting] = intval($settings[$setting]);
                        } else {
                            $clean_settings[$setting] = sanitize_text_field($settings[$setting]);
                        }
                    }
                }
                break;
                
            case 'dropdown':
                if (isset($settings['options']) && is_array($settings['options'])) {
                    $clean_settings['options'] = array_map('sanitize_text_field', $settings['options']);
                }
                break;
                
            case 'variable_display':
                $var_settings = ['variable_name', 'display_format', 'prefix', 'suffix'];
                foreach ($var_settings as $setting) {
                    if (isset($settings[$setting])) {
                        $clean_settings[$setting] = sanitize_text_field($settings[$setting]);
                    }
                }
                break;
        }
        
        // Preservar configuraciones adicionales
        foreach ($settings as $key => $value) {
            if (!isset($clean_settings[$key])) {
                $clean_settings[$key] = $this->sanitize_mixed_value($value);
            }
        }
        
        return $clean_settings;
    }
    
    /**
     * Exportar configuraciones globales de freestyle
     */
    private function export_freestyle_global_settings($global_settings) {
        if (!is_array($global_settings)) {
            return [];
        }
        
        $clean_global_settings = [];
        
        foreach ($global_settings as $key => $value) {
            $clean_global_settings[$key] = $this->sanitize_mixed_value($value);
        }
        
        return $clean_global_settings;
    }
    
    /**
     * Exportar condiciones de pregunta
     */
    private function export_question_conditions($conditions) {
        if (!is_array($conditions)) {
            return [];
        }
        
        $clean_conditions = [];
        
        foreach ($conditions as $condition) {
            if (!is_object($condition) && !is_array($condition)) {
                continue;
            }
            
            $condition = (object) $condition;
            
            // Validar tipos
            if (!in_array($condition->condition_type ?? '', $this->valid_condition_types) ||
                !in_array($condition->action_type ?? '', $this->valid_action_types)) {
                continue;
            }
            
            $clean_condition = [
                'condition_type' => sanitize_text_field($condition->condition_type),
                'condition_value' => sanitize_textarea_field($condition->condition_value ?? ''),
                'action_type' => sanitize_text_field($condition->action_type),
                'action_value' => sanitize_textarea_field($condition->action_value ?? ''),
                'variable_operation' => sanitize_text_field($condition->variable_operation ?? ''),
                'variable_amount' => intval($condition->variable_amount ?? 0),
                'comparison_value' => sanitize_text_field($condition->comparison_value ?? ''),
                'order_position' => intval($condition->order_position ?? 0)
            ];
            
            $clean_conditions[] = $clean_condition;
        }
        
        return $clean_conditions;
    }
    
    /**
     * Importar formulario completo
     */
    public function import_form($import_data) {
        try {
            // Validar datos de importación
            $validation_result = $this->validate_import_data($import_data);
            if (!$validation_result['valid']) {
                throw new Exception($validation_result['message']);
            }
            
            // Extraer datos del formulario
            $form_data = $this->extract_form_data($import_data);
            
            // Preparar datos para guardar
            $prepared_data = $this->prepare_import_data($form_data);
            
            // Guardar formulario usando la clase Database
            $form_id = $this->database->save_form($prepared_data);
            
            if (!$form_id) {
                throw new Exception(__('Error al guardar el formulario importado', 'smart-forms-quiz'));
            }
            
            return [
                'success' => true,
                'form_id' => $form_id,
                'form_title' => $prepared_data['title'],
                'message' => __('Formulario importado correctamente', 'smart-forms-quiz'),
                'stats' => $this->get_import_stats($prepared_data)
            ];
            
        } catch (Exception $e) {
            error_log('SFQ Import Error: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => $e->getMessage(),
                'debug' => WP_DEBUG ? $e->getTraceAsString() : null
            ];
        }
    }
    
    /**
     * Validar datos de importación
     */
    private function validate_import_data($import_data) {
        // Log de debug
        error_log('SFQ Import Debug: Starting validation');
        error_log('SFQ Import Debug: Import data keys: ' . json_encode(array_keys($import_data)));
        
        // Verificar que sea un array válido
        if (!is_array($import_data)) {
            error_log('SFQ Import Debug: Data is not array');
            return [
                'valid' => false,
                'message' => __('Los datos de importación no son válidos', 'smart-forms-quiz')
            ];
        }
        
        // Detectar estructura del archivo
        $form_data = null;
        $is_export_structure = false;
        $detection_case = '';
        
        // Caso 1: Estructura completa con export_info (nueva estructura)
        if (isset($import_data['export_info']) && isset($import_data['form_data']) && is_array($import_data['form_data'])) {
            $form_data = $import_data['form_data'];
            $is_export_structure = true;
            $detection_case = 'Case 1: Complete export structure';
            error_log('SFQ Import Debug: ' . $detection_case);
        }
        // Caso 2: Estructura con form_data pero sin export_info
        elseif (isset($import_data['form_data']) && is_array($import_data['form_data'])) {
            $form_data = $import_data['form_data'];
            $is_export_structure = true;
            $detection_case = 'Case 2: Form data without export_info';
            error_log('SFQ Import Debug: ' . $detection_case);
        }
        // Caso 3: Estructura directa de formulario
        elseif (isset($import_data['title']) || isset($import_data['questions'])) {
            $form_data = $import_data;
            $is_export_structure = false;
            $detection_case = 'Case 3: Direct form structure';
            error_log('SFQ Import Debug: ' . $detection_case);
        }
        // Caso 4: Estructura legacy - buscar indicadores
        else {
            $form_indicators = ['title', 'questions', 'type', 'settings'];
            $found_indicators = 0;
            $found_fields = [];
            
            foreach ($form_indicators as $indicator) {
                if (isset($import_data[$indicator])) {
                    $found_indicators++;
                    $found_fields[] = $indicator;
                }
            }
            
            $detection_case = "Case 4: Legacy structure - found {$found_indicators} indicators: " . implode(', ', $found_fields);
            error_log('SFQ Import Debug: ' . $detection_case);
            
            if ($found_indicators >= 1) {
                $form_data = $import_data;
                $is_export_structure = false;
            }
        }
        
        if (!$form_data) {
            error_log('SFQ Import Debug: No form_data detected - VALIDATION FAILED');
            return [
                'valid' => false,
                'message' => __('El archivo no contiene un formulario válido', 'smart-forms-quiz') . ' (Debug: ' . $detection_case . ')'
            ];
        }
        
        error_log('SFQ Import Debug: Form data detected successfully');
        error_log('SFQ Import Debug: Form data keys: ' . json_encode(array_keys($form_data)));
        
        // Validar datos básicos del formulario
        $has_title = !empty($form_data['title']);
        $has_questions = false;
        
        // Buscar preguntas en diferentes ubicaciones según la estructura
        if (isset($form_data['questions']) && is_array($form_data['questions']) && !empty($form_data['questions'])) {
            $has_questions = true;
            error_log('SFQ Import Debug: Found questions in form_data');
        } elseif ($is_export_structure && isset($import_data['questions']) && is_array($import_data['questions']) && !empty($import_data['questions'])) {
            $has_questions = true;
            error_log('SFQ Import Debug: Found questions at root level');
        }
        
        error_log('SFQ Import Debug: Has title: ' . ($has_title ? 'YES' : 'NO'));
        error_log('SFQ Import Debug: Has questions: ' . ($has_questions ? 'YES' : 'NO'));
        
        // Para validación, aceptar formularios que tengan al menos título O preguntas
        // Pero también aceptar formularios vacíos para permitir importación de plantillas
        if (!$has_title && !$has_questions) {
            // Verificar si es una estructura de exportación válida aunque esté vacía
            if ($is_export_structure && isset($import_data['export_info'])) {
                error_log('SFQ Import Debug: Empty form but valid export structure - ALLOWING');
                // Permitir formularios vacíos con estructura de exportación válida
            } else {
                error_log('SFQ Import Debug: No title and no questions - VALIDATION FAILED');
                return [
                    'valid' => false,
                    'message' => __('El formulario debe tener al menos un título o preguntas', 'smart-forms-quiz')
                ];
            }
        }
        
        // Validar preguntas - buscar en el lugar correcto según la estructura
        $questions_to_validate = null;
        if ($is_export_structure && isset($import_data['questions'])) {
            $questions_to_validate = $import_data['questions'];
        } elseif (isset($form_data['questions'])) {
            $questions_to_validate = $form_data['questions'];
        }
        
        if ($questions_to_validate && is_array($questions_to_validate)) {
            error_log('SFQ Import Debug: Validating ' . count($questions_to_validate) . ' questions');
            
            foreach ($questions_to_validate as $index => $question) {
                if (!is_array($question)) {
                    continue;
                }
                
                // Validar tipo de pregunta
                if (empty($question['question_type']) || 
                    !in_array($question['question_type'], $this->valid_question_types)) {
                    error_log('SFQ Import Debug: Invalid question type in question ' . ($index + 1) . ': ' . ($question['question_type'] ?? 'EMPTY'));
                    return [
                        'valid' => false,
                        'message' => sprintf(__('Tipo de pregunta inválido en la pregunta %d', 'smart-forms-quiz'), $index + 1)
                    ];
                }
                
                // Validar elementos freestyle si es necesario
                if ($question['question_type'] === 'freestyle' && 
                    isset($question['freestyle_elements']) && 
                    is_array($question['freestyle_elements'])) {
                    
                    foreach ($question['freestyle_elements'] as $element_index => $element) {
                        if (!is_array($element) || 
                            empty($element['type']) || 
                            !in_array($element['type'], $this->valid_freestyle_types)) {
                            error_log('SFQ Import Debug: Invalid freestyle element in question ' . ($index + 1) . ', element ' . ($element_index + 1));
                            return [
                                'valid' => false,
                                'message' => sprintf(__('Elemento freestyle inválido en la pregunta %d, elemento %d', 'smart-forms-quiz'), $index + 1, $element_index + 1)
                            ];
                        }
                    }
                }
            }
        }
        
        error_log('SFQ Import Debug: Validation successful');
        return ['valid' => true];
    }
    
    /**
     * Extraer datos del formulario de la estructura de importación
     */
    private function extract_form_data($import_data) {
        // Detectar estructura y extraer datos
        if (isset($import_data['form_data'])) {
            // Estructura completa
            return [
                'form_data' => $import_data['form_data'],
                'settings' => $import_data['settings'] ?? [],
                'style_settings' => $import_data['style_settings'] ?? [],
                'global_variables' => $import_data['global_variables'] ?? [],
                'questions' => $import_data['questions'] ?? []
            ];
        } else {
            // Estructura directa
            return [
                'form_data' => $import_data,
                'settings' => $import_data['settings'] ?? [],
                'style_settings' => $import_data['style_settings'] ?? [],
                'global_variables' => $import_data['global_variables'] ?? [],
                'questions' => $import_data['questions'] ?? []
            ];
        }
    }
    
    /**
     * Preparar datos para importación
     */
    private function prepare_import_data($extracted_data) {
        $form_data = $extracted_data['form_data'];
        
        $prepared_data = [
            'title' => sanitize_text_field($form_data['title'] ?? 'Formulario Importado'),
            'description' => sanitize_textarea_field($form_data['description'] ?? ''),
            'type' => in_array($form_data['type'] ?? 'form', ['form', 'quiz']) ? $form_data['type'] : 'form',
            'status' => 'active',
            'intro_title' => sanitize_text_field($form_data['intro_title'] ?? ''),
            'intro_description' => sanitize_textarea_field($form_data['intro_description'] ?? ''),
            'intro_button_text' => sanitize_text_field($form_data['intro_button_text'] ?? 'Comenzar'),
            'thank_you_message' => wp_kses_post($form_data['thank_you_message'] ?? ''),
            'redirect_url' => esc_url_raw($form_data['redirect_url'] ?? ''),
            'settings' => $this->import_form_settings($extracted_data['settings']),
            'style_settings' => $this->import_style_settings($extracted_data['style_settings']),
            'global_variables' => $this->import_global_variables($extracted_data['global_variables']),
            'questions' => $this->import_questions($extracted_data['questions'])
        ];
        
        return $prepared_data;
    }
    
    /**
     * Importar configuraciones del formulario
     */
    private function import_form_settings($settings) {
        if (!is_array($settings)) {
            return [];
        }
        
        // Aplicar las mismas validaciones que en la exportación
        return $this->export_form_settings($settings);
    }
    
    /**
     * Importar configuraciones de estilo
     */
    private function import_style_settings($style_settings) {
        if (!is_array($style_settings)) {
            return [];
        }
        
        // Aplicar las mismas validaciones que en la exportación
        return $this->export_style_settings($style_settings);
    }
    
    /**
     * Importar variables globales
     */
    private function import_global_variables($global_variables) {
        if (!is_array($global_variables)) {
            return [];
        }
        
        // Aplicar las mismas validaciones que en la exportación
        return $this->export_global_variables($global_variables);
    }
    
    /**
     * Importar preguntas
     */
    private function import_questions($questions) {
        if (!is_array($questions)) {
            return [];
        }
        
        $imported_questions = [];
        
        foreach ($questions as $question) {
            $imported_question = $this->import_single_question($question);
            if ($imported_question) {
                $imported_questions[] = $imported_question;
            }
        }
        
        return $imported_questions;
    }
    
    /**
     * Importar una pregunta individual
     */
    private function import_single_question($question) {
        if (!is_array($question)) {
            return null;
        }
        
        // Validar tipo de pregunta
        if (!in_array($question['question_type'] ?? '', $this->valid_question_types)) {
            return null;
        }
        
        $imported_question = [
            'question_text' => sanitize_textarea_field($question['question_text'] ?? ''),
            'question_type' => sanitize_text_field($question['question_type']),
            'required' => (bool) ($question['required'] ?? false),
            'order_position' => intval($question['order_position'] ?? 0),
            'variable_name' => sanitize_text_field($question['variable_name'] ?? ''),
            'variable_value' => intval($question['variable_value'] ?? 0),
            'settings' => $this->import_question_settings($question['settings'] ?? []),
            'conditions' => $this->import_question_conditions($question['conditions'] ?? [])
        ];
        
        // Importar según el tipo de pregunta
        if ($question['question_type'] === 'freestyle') {
            $imported_question['freestyle_elements'] = $this->import_freestyle_elements($question['freestyle_elements'] ?? []);
            $imported_question['global_settings'] = $question['global_settings'] ?? [];
            $imported_question['options'] = [];
            
            // Importar campo pantallaFinal si existe
            if (isset($question['pantallaFinal'])) {
                $imported_question['pantallaFinal'] = (bool) $question['pantallaFinal'];
            }
        } else {
            $imported_question['options'] = $this->import_question_options($question['options'] ?? []);
            $imported_question['freestyle_elements'] = [];
            $imported_question['global_settings'] = [];
        }
        
        return $imported_question;
    }
    
    /**
     * Importar configuraciones de pregunta
     */
    private function import_question_settings($settings) {
        if (!is_array($settings)) {
            return [];
        }
        
        // Aplicar las mismas validaciones que en la exportación
        return $this->export_question_settings($settings);
    }
    
    /**
     * Importar opciones de pregunta
     */
    private function import_question_options($options) {
        if (!is_array($options)) {
            return [];
        }
        
        // Aplicar las mismas validaciones que en la exportación
        return $this->export_question_options($options);
    }
    
    /**
     * Importar elementos freestyle
     */
    private function import_freestyle_elements($elements) {
        if (!is_array($elements)) {
            return [];
        }
        
        // Aplicar las mismas validaciones que en la exportación
        return $this->export_freestyle_elements($elements);
    }
    
    /**
     * Importar condiciones de pregunta
     */
    private function import_question_conditions($conditions) {
        if (!is_array($conditions)) {
            return [];
        }
        
        // Aplicar las mismas validaciones que en la exportación
        return $this->export_question_conditions($conditions);
    }
    
    /**
     * Métodos auxiliares
     */
    
    /**
     * Validar color hexadecimal
     */
    private function validate_color($color) {
        if (empty($color)) {
            return '';
        }
        
        // Asegurar que empiece con #
        if (strpos($color, '#') !== 0) {
            $color = '#' . $color;
        }
        
        // Validar formato hexadecimal
        if (preg_match('/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/', $color)) {
            return $color;
        }
        
        return '';
    }
    
    /**
     * Sanitizar valor mixto
     */
    private function sanitize_mixed_value($value) {
        if (is_array($value)) {
            return array_map([$this, 'sanitize_mixed_value'], $value);
        } elseif (is_string($value)) {
            return sanitize_textarea_field($value);
        } elseif (is_numeric($value)) {
            return $value;
        } elseif (is_bool($value)) {
            return $value;
        } else {
            return '';
        }
    }
    
    /**
     * Generar nombre de archivo de exportación
     */
    private function generate_export_filename($form_title) {
        $safe_title = sanitize_file_name($form_title);
        $safe_title = preg_replace('/[^a-zA-Z0-9_-]/', '_', $safe_title);
        $safe_title = substr($safe_title, 0, 50); // Limitar longitud
        
        if (empty($safe_title)) {
            $safe_title = 'formulario';
        }
        
        return $safe_title . '_' . date('Y-m-d_H-i-s') . '.json';
    }
    
    /**
     * Validar datos de exportación
     */
    private function validate_export_data($export_data) {
        if (!is_array($export_data)) {
            throw new Exception(__('Datos de exportación inválidos', 'smart-forms-quiz'));
        }
        
        if (empty($export_data['form_data']['title'])) {
            throw new Exception(__('El formulario debe tener un título', 'smart-forms-quiz'));
        }
        
        // Validar que el JSON se puede generar
        $json_test = json_encode($export_data);
        if ($json_test === false) {
            throw new Exception(__('Error al generar JSON de exportación', 'smart-forms-quiz'));
        }
        
        return true;
    }
    
    /**
     * Contar preguntas freestyle
     */
    private function count_freestyle_questions($questions) {
        return count(array_filter($questions, function($q) {
            return isset($q->question_type) && $q->question_type === 'freestyle';
        }));
    }
    
    /**
     * Contar preguntas normales
     */
    private function count_normal_questions($questions) {
        return count(array_filter($questions, function($q) {
            return isset($q->question_type) && $q->question_type !== 'freestyle';
        }));
    }
    
    /**
     * Contar total de condiciones
     */
    private function count_total_conditions($questions) {
        $total = 0;
        foreach ($questions as $question) {
            if (isset($question->conditions) && is_array($question->conditions)) {
                $total += count($question->conditions);
            }
        }
        return $total;
    }
    
    /**
     * Contar elementos freestyle
     */
    private function count_freestyle_elements($questions) {
        $total = 0;
        foreach ($questions as $question) {
            if (isset($question->question_type) && $question->question_type === 'freestyle' &&
                isset($question->freestyle_elements) && is_array($question->freestyle_elements)) {
                $total += count($question->freestyle_elements);
            }
        }
        return $total;
    }
    
    /**
     * Obtener estadísticas de importación
     */
    private function get_import_stats($prepared_data) {
        return [
            'total_questions' => count($prepared_data['questions'] ?? []),
            'freestyle_questions' => $this->count_freestyle_questions($prepared_data['questions'] ?? []),
            'normal_questions' => $this->count_normal_questions($prepared_data['questions'] ?? []),
            'total_conditions' => $this->count_total_conditions($prepared_data['questions'] ?? []),
            'global_variables' => count($prepared_data['global_variables'] ?? [])
        ];
    }
}
