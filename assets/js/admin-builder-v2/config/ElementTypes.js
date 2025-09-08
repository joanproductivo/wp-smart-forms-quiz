/**
 * ElementTypes - Configuraciones de tipos de elementos
 * Smart Forms & Quiz - Admin Builder v2
 */
(function($) {
    'use strict';
const ElementTypes = {
    /**
     * Tipos de preguntas disponibles
     */
    QUESTION_TYPES: {
        single_choice: {
            name: 'Opción Única',
            icon: '🔘',
            description: 'El usuario puede seleccionar solo una opción',
            hasOptions: true,
            minOptions: 2,
            maxOptions: 20,
            defaultOptions: [
                { text: 'Opción 1', value: 'option_1' },
                { text: 'Opción 2', value: 'option_2' }
            ],
            supportedFeatures: ['conditions', 'required', 'randomize_options']
        },
        
        multiple_choice: {
            name: 'Opción Múltiple',
            icon: '☑️',
            description: 'El usuario puede seleccionar múltiples opciones',
            hasOptions: true,
            minOptions: 2,
            maxOptions: 20,
            defaultOptions: [
                { text: 'Opción 1', value: 'option_1' },
                { text: 'Opción 2', value: 'option_2' }
            ],
            supportedFeatures: ['conditions', 'required', 'randomize_options', 'min_selections', 'max_selections']
        },
        
        text: {
            name: 'Texto',
            icon: '📝',
            description: 'Campo de texto libre',
            hasOptions: false,
            supportedFeatures: ['conditions', 'required', 'validation', 'placeholder', 'max_length']
        },
        
        email: {
            name: 'Email',
            icon: '📧',
            description: 'Campo de email con validación',
            hasOptions: false,
            supportedFeatures: ['conditions', 'required', 'validation', 'placeholder']
        },
        
        rating: {
            name: 'Valoración',
            icon: '⭐',
            description: 'Sistema de valoración con estrellas',
            hasOptions: false,
            supportedFeatures: ['conditions', 'required', 'max_rating', 'rating_type']
        },
        
        image_choice: {
            name: 'Selección de Imagen',
            icon: '🖼️',
            description: 'Opciones con imágenes',
            hasOptions: true,
            minOptions: 2,
            maxOptions: 12,
            defaultOptions: [
                { text: 'Opción 1', value: 'option_1', image: '', image_id: '', image_alt: '' },
                { text: 'Opción 2', value: 'option_2', image: '', image_id: '', image_alt: '' }
            ],
            supportedFeatures: ['conditions', 'required', 'randomize_options', 'image_upload']
        },
        
        freestyle: {
            name: 'Estilo Libre',
            icon: '🎨',
            description: 'Pregunta personalizable con elementos múltiples',
            hasOptions: false,
            hasElements: true,
            supportedFeatures: ['conditions', 'required', 'custom_elements', 'final_screen']
        }
    },

    /**
     * Tipos de elementos freestyle
     */
    FREESTYLE_ELEMENTS: {
        text: {
            name: 'Texto',
            icon: '📝',
            description: 'Campo de entrada de texto',
            category: 'input',
            settings: {
                placeholder: { type: 'text', default: '', label: 'Placeholder' },
                multiline: { type: 'boolean', default: false, label: 'Texto multilínea' },
                max_length: { type: 'number', default: '', label: 'Longitud máxima' },
                rows: { type: 'number', default: 3, label: 'Filas (textarea)', condition: 'multiline' }
            }
        },
        
        video: {
            name: 'Video',
            icon: '🎥',
            description: 'Reproductor de video (YouTube, Vimeo, MP4)',
            category: 'media',
            settings: {
                video_url: { type: 'url', default: '', label: 'URL del video', required: true },
                autoplay: { type: 'boolean', default: false, label: 'Reproducir automáticamente' },
                controls: { type: 'boolean', default: true, label: 'Mostrar controles' },
                width: { type: 'text', default: '100%', label: 'Ancho' },
                height: { type: 'text', default: 'auto', label: 'Alto' }
            }
        },
        
        image: {
            name: 'Imagen',
            icon: '🖼️',
            description: 'Mostrar una imagen',
            category: 'media',
            settings: {
                image_url: { type: 'url', default: '', label: 'URL de la imagen', required: true },
                alt_text: { type: 'text', default: '', label: 'Texto alternativo' },
                width: { type: 'text', default: 'auto', label: 'Ancho' },
                height: { type: 'text', default: 'auto', label: 'Alto' },
                clickable: { type: 'boolean', default: false, label: 'Imagen clickeable' }
            }
        },
        
        countdown: {
            name: 'Cuenta Atrás',
            icon: '⏰',
            description: 'Contador regresivo',
            category: 'interactive',
            settings: {
                target_date: { type: 'datetime-local', default: '', label: 'Fecha objetivo', required: true },
                countdown_text: { type: 'text', default: 'Tiempo restante:', label: 'Texto antes del contador' },
                finished_text: { type: 'text', default: '¡Tiempo agotado!', label: 'Texto cuando termine' }
            }
        },
        
        phone: {
            name: 'Teléfono',
            icon: '📞',
            description: 'Campo de número de teléfono',
            category: 'input',
            settings: {
                placeholder: { type: 'text', default: '+34 600 000 000', label: 'Placeholder' },
                pattern: { type: 'text', default: '', label: 'Patrón de validación (regex)' }
            }
        },
        
        email: {
            name: 'Email',
            icon: '📧',
            description: 'Campo de email con validación',
            category: 'input',
            settings: {
                placeholder: { type: 'text', default: 'tu@email.com', label: 'Placeholder' },
                validate_domain: { type: 'boolean', default: false, label: 'Validar dominio del email' }
            }
        },
        
        file_upload: {
            name: 'Subir Archivo',
            icon: '📤',
            description: 'Subida de archivos',
            category: 'input',
            settings: {
                accept: { 
                    type: 'select', 
                    default: 'image/*', 
                    label: 'Tipos de archivo permitidos',
                    options: [
                        { value: 'image/*', text: 'Solo imágenes' },
                        { value: '.pdf', text: 'Solo PDF' },
                        { value: '.doc,.docx', text: 'Solo Word' },
                        { value: '*', text: 'Todos los archivos' }
                    ]
                },
                max_size: { 
                    type: 'select', 
                    default: '5MB', 
                    label: 'Tamaño máximo',
                    options: [
                        { value: '1MB', text: '1 MB' },
                        { value: '5MB', text: '5 MB' },
                        { value: '10MB', text: '10 MB' },
                        { value: '25MB', text: '25 MB' }
                    ]
                },
                multiple: { type: 'boolean', default: false, label: 'Múltiples archivos' }
            }
        },
        
        button: {
            name: 'Botón',
            icon: '🔘',
            description: 'Botón personalizable',
            category: 'interactive',
            settings: {
                button_text: { type: 'text', default: 'Hacer clic aquí', label: 'Texto del botón', required: true },
                button_url: { type: 'url', default: '', label: 'URL de destino (opcional)' },
                open_new_tab: { type: 'boolean', default: false, label: 'Abrir en nueva pestaña' },
                css_selector: { type: 'text', default: '', label: 'CSS Selector personalizado' },
                
                // Tipografía
                font_family: { type: 'select', default: 'inherit', label: 'Familia de fuente' },
                font_size: { type: 'range', default: '16', label: 'Tamaño de letra', min: 12, max: 32 },
                font_bold: { type: 'boolean', default: false, label: 'Negrita' },
                font_italic: { type: 'boolean', default: false, label: 'Cursiva' },
                font_strikethrough: { type: 'boolean', default: false, label: 'Tachado' },
                text_shadow: { type: 'boolean', default: false, label: 'Sombreado de letra' },
                text_align: { type: 'select', default: 'center', label: 'Alineación del contenido' },
                text_color: { type: 'color', default: '#ffffff', label: 'Color del texto' },
                
                // Fondo
                background_color: { type: 'color', default: '#007cba', label: 'Color de fondo' },
                background_opacity: { type: 'range', default: '1', label: 'Opacidad del fondo', min: 0, max: 1, step: 0.1 },
                
                // Borde
                border_color: { type: 'color', default: '#007cba', label: 'Color del borde' },
                border_opacity: { type: 'range', default: '1', label: 'Opacidad del borde', min: 0, max: 1, step: 0.1 },
                border_radius: { type: 'range', default: '8', label: 'Radio del borde', min: 0, max: 50 },
                box_shadow: { type: 'boolean', default: false, label: 'Sombreado del recuadro' }
            }
        },
        
        rating: {
            name: 'Valoración',
            icon: '⭐',
            description: 'Sistema de valoración',
            category: 'input',
            settings: {
                rating_type: { 
                    type: 'select', 
                    default: 'stars', 
                    label: 'Tipo de valoración',
                    options: [
                        { value: 'stars', text: 'Estrellas' },
                        { value: 'hearts', text: 'Corazones' },
                        { value: 'emojis', text: 'Emojis personalizados' }
                    ]
                },
                max_rating: { type: 'number', default: 5, label: 'Máximo', min: 2, max: 10 },
                icons: { type: 'text', default: '', label: 'Emojis (separados por comas)', condition: 'rating_type=emojis' }
            }
        },
        
        dropdown: {
            name: 'Desplegable',
            icon: '📋',
            description: 'Lista desplegable de opciones',
            category: 'input',
            settings: {
                placeholder: { type: 'text', default: 'Selecciona una opción...', label: 'Placeholder' },
                options: { type: 'array', default: [], label: 'Opciones', required: true }
            }
        },
        
        checkbox: {
            name: 'Checkbox',
            icon: '☑️',
            description: 'Casilla de verificación',
            category: 'input',
            settings: {
                checkbox_text: { type: 'text', default: 'Acepto los términos', label: 'Texto del checkbox', required: true },
                required_check: { type: 'boolean', default: false, label: 'Marcar como obligatorio' }
            }
        },
        
        legal_text: {
            name: 'Texto Legal',
            icon: '⚖️',
            description: 'Texto legal con opción de aceptación',
            category: 'content',
            settings: {
                text_content: { type: 'textarea', default: '', label: 'Contenido del texto', required: true },
                require_acceptance: { type: 'boolean', default: false, label: 'Requiere aceptación (checkbox)' },
                acceptance_text: { type: 'text', default: 'He leído y acepto', label: 'Texto de aceptación', condition: 'require_acceptance' }
            }
        },
        
        variable_display: {
            name: 'Mostrar Variable',
            icon: '🔢',
            description: 'Mostrar el valor de una variable global',
            category: 'dynamic',
            settings: {
                variable_name: { type: 'variable_select', default: '', label: 'Variable a mostrar', required: true },
                preview_value: { type: 'text', default: '0', label: 'Valor de ejemplo (solo preview)' },
                
                // Texto opcional
                optional_text: { type: 'text', default: '', label: 'Texto adicional (opcional)' },
                text_position: { 
                    type: 'select', 
                    default: 'right', 
                    label: 'Posición del texto',
                    options: [
                        { value: 'right', text: 'Derecha' },
                        { value: 'left', text: 'Izquierda' },
                        { value: 'top', text: 'Arriba' },
                        { value: 'bottom', text: 'Abajo' }
                    ]
                },
                text_spacing: { 
                    type: 'select', 
                    default: 'normal', 
                    label: 'Espaciado',
                    options: [
                        { value: 'none', text: 'Sin espacio' },
                        { value: 'small', text: 'Pequeño (4px)' },
                        { value: 'normal', text: 'Normal (8px)' },
                        { value: 'large', text: 'Grande (12px)' }
                    ]
                },
                optional_text_size: { type: 'select', default: 'inherit', label: 'Tamaño del texto opcional' },
                optional_text_color: { type: 'color', default: 'inherit', label: 'Color del texto opcional' },
                
                // Estilo
                font_size: { type: 'select', default: '16', label: 'Tamaño de fuente' },
                font_weight: { type: 'select', default: 'normal', label: 'Peso de fuente' },
                text_align: { type: 'select', default: 'center', label: 'Alineación' },
                text_shadow: { type: 'boolean', default: false, label: 'Sombra de texto' },
                
                // Colores
                text_color: { type: 'color', default: '#333333', label: 'Color de texto' },
                background_color: { type: 'color', default: '#f8f9fa', label: 'Color de fondo' },
                background_opacity: { type: 'range', default: '1', label: 'Opacidad del fondo', min: 0, max: 1, step: 0.1 },
                border_color: { type: 'color', default: '#e9ecef', label: 'Color del borde' },
                border_opacity: { type: 'range', default: '1', label: 'Opacidad del borde', min: 0, max: 1, step: 0.1 },
                border_radius: { type: 'range', default: '8', label: 'Radio del borde', min: 0, max: 50 }
            }
        },
        
        styled_text: {
            name: 'Texto Estilizado',
            icon: '✨',
            description: 'Texto con estilos personalizables',
            category: 'content',
            settings: {
                text_content: { type: 'textarea', default: '', label: 'Contenido del texto', required: true },
                text_type: { 
                    type: 'select', 
                    default: 'paragraph', 
                    label: 'Tipo de elemento',
                    options: [
                        { value: 'paragraph', text: 'Párrafo' },
                        { value: 'title', text: 'Título' }
                    ]
                },
                
                // Ancho personalizado
                width_type: { 
                    type: 'select', 
                    default: 'auto', 
                    label: 'Ancho',
                    options: [
                        { value: 'auto', text: 'Automático' },
                        { value: 'full', text: 'Ancho completo (100%)' },
                        { value: 'custom', text: 'Personalizado' }
                    ]
                },
                custom_width: { type: 'number', default: '300', label: 'Ancho personalizado (px)', condition: 'width_type=custom' },
                container_align: { 
                    type: 'select', 
                    default: 'center', 
                    label: 'Alineación del contenedor',
                    condition: 'width_type!=auto'
                },
                
                // Tipografía
                font_family: { type: 'select', default: 'inherit', label: 'Familia de fuente' },
                font_size: { type: 'range', default: '16', label: 'Tamaño de fuente', min: 12, max: 48 },
                font_weight: { type: 'select', default: 'normal', label: 'Peso de fuente' },
                text_align: { type: 'select', default: 'left', label: 'Alineación' },
                italic: { type: 'boolean', default: false, label: 'Cursiva' },
                strikethrough: { type: 'boolean', default: false, label: 'Tachado' },
                text_shadow: { type: 'boolean', default: false, label: 'Sombra de texto' },
                box_shadow: { type: 'boolean', default: false, label: 'Sombra del recuadro' },
                
                // Colores
                text_color: { type: 'color', default: '#333333', label: 'Color del texto' },
                background_color: { type: 'color', default: '#ffffff', label: 'Color de fondo' },
                background_opacity: { type: 'range', default: '0', label: 'Opacidad del fondo', min: 0, max: 1, step: 0.1 },
                border_color: { type: 'color', default: '#e0e0e0', label: 'Color del borde' },
                border_radius: { type: 'range', default: '0', label: 'Radio del borde', min: 0, max: 50 },
                border_opacity: { type: 'range', default: '0', label: 'Opacidad del borde', min: 0, max: 1, step: 0.1 }
            }
        }
    },

    /**
     * Categorías de elementos freestyle
     */
    ELEMENT_CATEGORIES: {
        input: {
            name: 'Campos de Entrada',
            icon: '📝',
            description: 'Elementos para recopilar información del usuario'
        },
        media: {
            name: 'Multimedia',
            icon: '🎥',
            description: 'Elementos de video, imagen y audio'
        },
        interactive: {
            name: 'Interactivos',
            icon: '🔘',
            description: 'Elementos que requieren interacción del usuario'
        },
        content: {
            name: 'Contenido',
            icon: '📄',
            description: 'Elementos de texto y contenido estático'
        },
        dynamic: {
            name: 'Dinámicos',
            icon: '🔄',
            description: 'Elementos que cambian según variables o condiciones'
        }
    },

    /**
     * Tipos de condiciones disponibles
     */
    CONDITION_TYPES: {
        answer_equals: {
            name: 'Respuesta es igual a',
            description: 'La respuesta del usuario coincide exactamente',
            applies_to: ['single_choice', 'multiple_choice', 'text', 'email', 'rating', 'image_choice'],
            value_type: 'text'
        },
        answer_contains: {
            name: 'Respuesta contiene',
            description: 'La respuesta del usuario contiene el texto especificado',
            applies_to: ['text', 'email'],
            value_type: 'text'
        },
        answer_not_equals: {
            name: 'Respuesta no es igual a',
            description: 'La respuesta del usuario no coincide',
            applies_to: ['single_choice', 'multiple_choice', 'text', 'email', 'rating', 'image_choice'],
            value_type: 'text'
        },
        variable_greater: {
            name: 'Variable es mayor que',
            description: 'El valor de una variable es mayor que el especificado',
            applies_to: 'all',
            value_type: 'variable_comparison'
        },
        variable_less: {
            name: 'Variable es menor que',
            description: 'El valor de una variable es menor que el especificado',
            applies_to: 'all',
            value_type: 'variable_comparison'
        },
        variable_equals: {
            name: 'Variable es igual a',
            description: 'El valor de una variable coincide exactamente',
            applies_to: 'all',
            value_type: 'variable_comparison'
        }
    },

    /**
     * Tipos de acciones disponibles
     */
    ACTION_TYPES: {
        goto_question: {
            name: 'Ir a pregunta',
            description: 'Saltar a una pregunta específica',
            value_type: 'question_select'
        },
        skip_to_end: {
            name: 'Saltar al final',
            description: 'Ir directamente a la pantalla de finalización',
            value_type: 'none'
        },
        redirect_url: {
            name: 'Redirigir a URL',
            description: 'Redirigir a una página externa',
            value_type: 'url'
        },
        show_message: {
            name: 'Mostrar mensaje',
            description: 'Mostrar un mensaje personalizado',
            value_type: 'textarea'
        },
        add_variable: {
            name: 'Sumar a variable',
            description: 'Añadir un valor a una variable global',
            value_type: 'variable_select',
            requires_amount: true
        },
        set_variable: {
            name: 'Establecer variable',
            description: 'Establecer el valor de una variable global',
            value_type: 'variable_select',
            requires_amount: true
        }
    },

    /**
     * Validaciones disponibles
     */
    VALIDATION_TYPES: {
        required: {
            name: 'Obligatorio',
            description: 'El campo debe ser completado',
            applies_to: 'all'
        },
        min_length: {
            name: 'Longitud mínima',
            description: 'Número mínimo de caracteres',
            applies_to: ['text', 'email'],
            value_type: 'number'
        },
        max_length: {
            name: 'Longitud máxima',
            description: 'Número máximo de caracteres',
            applies_to: ['text', 'email'],
            value_type: 'number'
        },
        email_format: {
            name: 'Formato de email',
            description: 'Validar formato de email',
            applies_to: ['email'],
            auto_applied: true
        },
        min_selections: {
            name: 'Selecciones mínimas',
            description: 'Número mínimo de opciones a seleccionar',
            applies_to: ['multiple_choice'],
            value_type: 'number'
        },
        max_selections: {
            name: 'Selecciones máximas',
            description: 'Número máximo de opciones a seleccionar',
            applies_to: ['multiple_choice'],
            value_type: 'number'
        }
    },

    /**
     * Obtener configuración de tipo de pregunta
     */
    getQuestionType(type) {
        return this.QUESTION_TYPES[type] || null;
    },

    /**
     * Obtener configuración de elemento freestyle
     */
    getFreestyleElement(type) {
        return this.FREESTYLE_ELEMENTS[type] || null;
    },

    /**
     * Obtener tipos de pregunta por categoría
     */
    getQuestionTypesByCategory() {
        const categories = {
            basic: [],
            advanced: [],
            media: []
        };

        Object.keys(this.QUESTION_TYPES).forEach(key => {
            const type = this.QUESTION_TYPES[key];
            if (['single_choice', 'multiple_choice', 'text'].includes(key)) {
                categories.basic.push({ key, ...type });
            } else if (['email', 'rating'].includes(key)) {
                categories.advanced.push({ key, ...type });
            } else {
                categories.media.push({ key, ...type });
            }
        });

        return categories;
    },

    /**
     * Obtener elementos freestyle por categoría
     */
    getFreestyleElementsByCategory() {
        const categories = {};

        Object.keys(this.FREESTYLE_ELEMENTS).forEach(key => {
            const element = this.FREESTYLE_ELEMENTS[key];
            const category = element.category || 'other';
            
            if (!categories[category]) {
                categories[category] = [];
            }
            
            categories[category].push({ key, ...element });
        });

        return categories;
    },

    /**
     * Validar configuración de elemento
     */
    validateElementConfig(type, settings) {
        const elementConfig = this.getFreestyleElement(type);
        if (!elementConfig) {
            return { valid: false, errors: ['Tipo de elemento no válido'] };
        }

        const errors = [];
        
        // Validar settings requeridos
        Object.keys(elementConfig.settings).forEach(settingKey => {
            const settingConfig = elementConfig.settings[settingKey];
            const value = settings[settingKey];
            
            if (settingConfig.required && (!value || value.trim() === '')) {
                errors.push(`${settingConfig.label} es obligatorio`);
            }
            
            // Validaciones específicas por tipo
            if (value && settingConfig.type === 'url') {
                try {
                    new URL(value);
                } catch {
                    errors.push(`${settingConfig.label} debe ser una URL válida`);
                }
            }
            
            if (value && settingConfig.type === 'number') {
                if (isNaN(value)) {
                    errors.push(`${settingConfig.label} debe ser un número`);
                } else {
                    const num = parseFloat(value);
                    if (settingConfig.min !== undefined && num < settingConfig.min) {
                        errors.push(`${settingConfig.label} debe ser mayor o igual a ${settingConfig.min}`);
                    }
                    if (settingConfig.max !== undefined && num > settingConfig.max) {
                        errors.push(`${settingConfig.label} debe ser menor o igual a ${settingConfig.max}`);
                    }
                }
            }
        });

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
};

// Export para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ElementTypes;
} else {
    window.ElementTypes = ElementTypes;
}
})(jQuery);