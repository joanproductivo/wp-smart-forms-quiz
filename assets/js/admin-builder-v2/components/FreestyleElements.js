/**
 * FreestyleElements - Gestión de elementos freestyle
 * Smart Forms & Quiz - Admin Builder v2
 */

class FreestyleElements {
    constructor(formBuilder) {
        this.formBuilder = formBuilder;
        this.elementTypes = {
            'text': '📝 Texto',
            'video': '🎥 Video', 
            'image': '🖼️ Imagen',
            'countdown': '⏰ Cuenta atrás',
            'phone': '📞 Teléfono',
            'email': '📧 Email',
            'file_upload': '📤 Subir imagen',
            'button': '🔘 Botón',
            'rating': '⭐ Valoración',
            'dropdown': '📋 Desplegable',
            'checkbox': '☑️ Opción Check',
            'legal_text': '⚖️ Texto RGPD',
            'variable_display': '🔢 Mostrar Variable',
            'styled_text': '✨ Texto Estilizado'
        };
    }

    /**
     * Crear nuevo elemento freestyle
     */
    createElement(type, questionId) {
        const elementId = 'element_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        return {
            id: elementId,
            type: type,
            label: '',
            order: 0, // Se establecerá al añadir al array
            settings: this.getDefaultSettings(type),
            value: ''
        };
    }

    /**
     * Obtener configuraciones por defecto según el tipo de elemento
     */
    getDefaultSettings(type) {
        const defaults = {
            text: {
                placeholder: '',
                multiline: false,
                max_length: '',
                rows: 3
            },
            video: {
                video_url: '',
                autoplay: false,
                controls: true,
                width: '100%',
                height: 'auto'
            },
            image: {
                image_url: '',
                alt_text: '',
                width: 'auto',
                height: 'auto',
                clickable: false
            },
            countdown: {
                target_date: '',
                countdown_text: 'Tiempo restante:',
                finished_text: '¡Tiempo agotado!'
            },
            phone: {
                placeholder: '+34 600 000 000',
                pattern: ''
            },
            email: {
                placeholder: 'tu@email.com',
                validate_domain: false
            },
            file_upload: {
                accept: 'image/*',
                max_size: '5MB',
                multiple: false
            },
            button: {
                button_text: 'Hacer clic aquí',
                button_url: '',
                open_new_tab: false,
                font_family: 'Open Sans',
                font_size: '16',
                font_bold: false,
                font_italic: false,
                font_strikethrough: false,
                text_shadow: false,
                text_align: 'center',
                text_color: '#ffffff',
                background_color: '#007cba',
                background_opacity: '1',
                border_color: '#007cba',
                border_opacity: '1',
                border_radius: '8',
                box_shadow: false,
                css_selector: ''
            },
            rating: {
                rating_type: 'stars',
                max_rating: 5,
                icons: ['😞', '😐', '🙂', '😊', '😍']
            },
            dropdown: {
                placeholder: 'Selecciona una opción...',
                options: []
            },
            checkbox: {
                checkbox_text: 'Acepto los términos y condiciones',
                required_check: false
            },
            legal_text: {
                text_content: '',
                require_acceptance: false,
                acceptance_text: 'He leído y acepto'
            },
            variable_display: {
                variable_name: '',
                preview_value: '0',
                optional_text: '',
                text_position: 'right',
                text_spacing: 'normal',
                optional_text_size: 'inherit',
                optional_text_color: 'inherit',
                font_size: '16',
                font_weight: 'normal',
                text_align: 'center',
                text_shadow: false,
                text_color: '#333333',
                border_color: '#e9ecef',
                border_opacity: '1',
                background_color: '#f8f9fa',
                background_opacity: '1',
                border_radius: '8'
            },
            styled_text: {
                text_content: '',
                text_type: 'paragraph',
                width_type: 'auto',
                custom_width: '300',
                container_align: 'center',
                font_family: 'inherit',
                font_size: '16',
                font_weight: 'normal',
                italic: false,
                strikethrough: false,
                text_align: 'left',
                text_shadow: false,
                box_shadow: false,
                text_color: '#333333',
                background_color: '#ffffff',
                background_opacity: '0',
                border_color: '#e0e0e0',
                border_radius: '0',
                border_opacity: '0'
            }
        };

        return defaults[type] || {};
    }

    /**
     * Renderizar elemento freestyle
     */
    renderElement(element) {
        return `
            <div class="sfq-freestyle-element" data-element-id="${element.id}" data-element-type="${element.type}">
                <div class="sfq-freestyle-element-header">
                    <span class="sfq-freestyle-element-type">${this.elementTypes[element.type] || element.type}</span>
                    <div class="sfq-freestyle-element-actions">
                        <button class="sfq-freestyle-action sfq-configure-element" type="button" title="Configurar">
                            <span class="dashicons dashicons-admin-generic"></span>
                        </button>
                        <button class="sfq-freestyle-action sfq-duplicate-element" type="button" title="Duplicar">
                            <span class="dashicons dashicons-admin-page"></span>
                        </button>
                        <button class="sfq-freestyle-action sfq-delete-element" type="button" title="Eliminar">
                            <span class="dashicons dashicons-trash"></span>
                        </button>
                    </div>
                </div>
                
                <div class="sfq-freestyle-element-content">
                    <div class="sfq-freestyle-element-label">
                        <label style="display: block; margin-bottom: 5px; font-size: 12px; color: #666; font-weight: 500;">
                            Texto que verá el usuario (ej: "Tu nombre completo", "Selecciona una opción"):
                        </label>
                        <input type="text" placeholder="Ej: Tu nombre completo, Selecciona una opción..." 
                               value="${this.escapeHtml(element.label)}" 
                               class="sfq-element-label-input">
                    </div>
                    
                    <div class="sfq-freestyle-element-preview">
                        ${this.renderElementPreview(element)}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Renderizar preview del elemento
     */
    renderElementPreview(element) {
        switch (element.type) {
            case 'text':
                return this.renderTextPreview(element);
            case 'email':
                return this.renderEmailPreview(element);
            case 'phone':
                return this.renderPhonePreview(element);
            case 'rating':
                return this.renderRatingPreview(element);
            case 'button':
                return this.renderButtonPreview(element);
            case 'checkbox':
                return this.renderCheckboxPreview(element);
            case 'dropdown':
                return this.renderDropdownPreview(element);
            case 'video':
                return this.renderVideoPreview(element);
            case 'image':
                return this.renderImagePreview(element);
            case 'countdown':
                return this.renderCountdownPreview(element);
            case 'file_upload':
                return this.renderFileUploadPreview(element);
            case 'legal_text':
                return this.renderLegalTextPreview(element);
            case 'variable_display':
                return this.renderVariableDisplayPreview(element);
            case 'styled_text':
                return this.renderStyledTextPreview(element);
            default:
                return `<div class="sfq-element-preview">Vista previa de ${element.type}</div>`;
        }
    }

    /**
     * Renderizar preview de texto
     */
    renderTextPreview(element) {
        const settings = element.settings || {};
        if (settings.multiline) {
            return `<textarea placeholder="${settings.placeholder || 'Texto de ejemplo'}" rows="${settings.rows || 3}" disabled></textarea>`;
        }
        return `<input type="text" placeholder="${settings.placeholder || 'Texto de ejemplo'}" disabled>`;
    }

    /**
     * Renderizar preview de email
     */
    renderEmailPreview(element) {
        const settings = element.settings || {};
        return `<input type="email" placeholder="${settings.placeholder || 'email@ejemplo.com'}" disabled>`;
    }

    /**
     * Renderizar preview de teléfono
     */
    renderPhonePreview(element) {
        const settings = element.settings || {};
        return `<input type="tel" placeholder="${settings.placeholder || '+34 600 000 000'}" disabled>`;
    }

    /**
     * Renderizar preview de valoración
     */
    renderRatingPreview(element) {
        const settings = element.settings || {};
        const type = settings.rating_type || 'stars';
        const max = settings.max_rating || 5;
        
        let icons = '';
        if (type === 'stars') {
            icons = '⭐'.repeat(max);
        } else if (type === 'hearts') {
            icons = '❤️'.repeat(max);
        } else if (type === 'emojis' && settings.icons) {
            icons = settings.icons.slice(0, max).join('');
        } else {
            icons = '⭐'.repeat(max);
        }
        
        return `<div class="sfq-rating-preview">${icons}</div>`;
    }

    /**
     * Renderizar preview de botón
     */
    renderButtonPreview(element) {
        const settings = element.settings || {};
        const buttonText = settings.button_text || 'Botón de ejemplo';
        
        // Aplicar estilos del botón
        const styles = this.getButtonStyles(settings);
        
        return `<button disabled style="${styles}">${buttonText}</button>`;
    }

    /**
     * Obtener estilos CSS para el botón
     */
    getButtonStyles(settings) {
        const styles = [];
        
        if (settings.font_family) styles.push(`font-family: ${settings.font_family}`);
        if (settings.font_size) styles.push(`font-size: ${settings.font_size}px`);
        if (settings.font_bold) styles.push('font-weight: bold');
        if (settings.font_italic) styles.push('font-style: italic');
        if (settings.font_strikethrough) styles.push('text-decoration: line-through');
        if (settings.text_shadow) styles.push('text-shadow: 1px 1px 2px rgba(0,0,0,0.3)');
        if (settings.text_align) styles.push(`text-align: ${settings.text_align}`);
        if (settings.text_color) styles.push(`color: ${settings.text_color}`);
        
        if (settings.background_color && settings.background_opacity) {
            const bgColor = this.hexToRgba(settings.background_color, settings.background_opacity);
            styles.push(`background-color: ${bgColor}`);
        }
        
        if (settings.border_color && settings.border_opacity) {
            const borderColor = this.hexToRgba(settings.border_color, settings.border_opacity);
            styles.push(`border: 2px solid ${borderColor}`);
        }
        
        if (settings.border_radius) styles.push(`border-radius: ${settings.border_radius}px`);
        if (settings.box_shadow) styles.push('box-shadow: 0 2px 4px rgba(0,0,0,0.1)');
        
        styles.push('padding: 10px 20px');
        styles.push('cursor: pointer');
        
        return styles.join('; ');
    }

    /**
     * Renderizar preview de checkbox
     */
    renderCheckboxPreview(element) {
        const settings = element.settings || {};
        return `<label><input type="checkbox" disabled> ${settings.checkbox_text || 'Opción de ejemplo'}</label>`;
    }

    /**
     * Renderizar preview de dropdown
     */
    renderDropdownPreview(element) {
        const settings = element.settings || {};
        const placeholder = settings.placeholder || 'Selecciona una opción';
        
        let options = `<option>${placeholder}</option>`;
        if (settings.options && settings.options.length > 0) {
            options += settings.options.map(opt => `<option>${opt.text}</option>`).join('');
        }
        
        return `<select disabled>${options}</select>`;
    }

    /**
     * Renderizar preview de video
     */
    renderVideoPreview(element) {
        const settings = element.settings || {};
        return `<div class="sfq-video-preview">🎥 Video: ${settings.video_url || 'URL no configurada'}</div>`;
    }

    /**
     * Renderizar preview de imagen
     */
    renderImagePreview(element) {
        const settings = element.settings || {};
        return `<div class="sfq-image-preview">🖼️ Imagen: ${settings.image_url || 'URL no configurada'}</div>`;
    }

    /**
     * Renderizar preview de cuenta atrás
     */
    renderCountdownPreview(element) {
        const settings = element.settings || {};
        return `<div class="sfq-countdown-preview">⏰ Cuenta atrás: ${settings.target_date || 'Fecha no configurada'}</div>`;
    }

    /**
     * Renderizar preview de subida de archivo
     */
    renderFileUploadPreview(element) {
        return `<div class="sfq-file-preview">📤 Subir archivo</div>`;
    }

    /**
     * Renderizar preview de texto legal
     */
    renderLegalTextPreview(element) {
        const settings = element.settings || {};
        return `<div class="sfq-legal-preview">⚖️ ${settings.text_content || 'Texto legal'}</div>`;
    }

    /**
     * Renderizar preview de mostrar variable
     */
    renderVariableDisplayPreview(element) {
        const settings = element.settings || {};
        const variableName = settings.variable_name || 'variable_no_seleccionada';
        const previewValue = settings.preview_value || '0';
        const optionalText = settings.optional_text || '';
        
        const bgColor = this.hexToRgba(settings.background_color || '#f8f9fa', settings.background_opacity || 1);
        const borderColor = this.hexToRgba(settings.border_color || '#e9ecef', settings.border_opacity || 1);
        
        let displayText = `${previewValue}`;
        if (optionalText) {
            const position = settings.text_position || 'right';
            switch (position) {
                case 'left':
                    displayText = `${optionalText} ${previewValue}`;
                    break;
                case 'right':
                    displayText = `${previewValue} ${optionalText}`;
                    break;
                case 'top':
                case 'bottom':
                    displayText = position === 'top' ? `${optionalText}<br>${previewValue}` : `${previewValue}<br>${optionalText}`;
                    break;
            }
        }
        
        return `<div class="sfq-variable-display-preview" style="
            padding: 12px 16px;
            background: ${bgColor};
            border: 2px solid ${borderColor};
            border-radius: ${settings.border_radius || '8'}px;
            color: ${settings.text_color || '#333333'};
            font-size: ${settings.font_size || '16'}px;
            font-weight: ${settings.font_weight || 'normal'};
            text-align: ${settings.text_align || 'center'};
            ${settings.text_shadow ? 'text-shadow: 1px 1px 2px rgba(0,0,0,0.3);' : ''}
        ">
            🔢 Variable: <strong>${variableName}</strong> = ${displayText}
        </div>`;
    }

    /**
     * Renderizar preview de texto estilizado
     */
    renderStyledTextPreview(element) {
        const settings = element.settings || {};
        const textContent = settings.text_content || 'Texto de ejemplo';
        const textType = settings.text_type || 'paragraph';
        const tagName = textType === 'title' ? 'h2' : 'p';
        
        const styledBgColor = this.hexToRgba(settings.background_color || '#ffffff', settings.background_opacity || 0);
        const styledBorderColor = this.hexToRgba(settings.border_color || '#e0e0e0', settings.border_opacity || 0);
        
        // Aplicar ancho personalizado si está configurado
        let widthStyle = '';
        if (settings.width_type === 'full') {
            widthStyle = 'width: 100%;';
        } else if (settings.width_type === 'custom' && settings.custom_width) {
            widthStyle = `width: ${settings.custom_width}px; max-width: 100%;`;
        }
        
        return `<${tagName} class="sfq-styled-text-preview" style="
            font-family: ${settings.font_family || 'inherit'};
            font-size: ${settings.font_size || '16'}px;
            font-weight: ${settings.font_weight || 'normal'};
            font-style: ${settings.italic ? 'italic' : 'normal'};
            text-decoration: ${settings.strikethrough ? 'line-through' : 'none'};
            color: ${settings.text_color || '#333333'};
            text-align: ${settings.text_align || 'left'};
            background: ${styledBgColor};
            border: 2px solid ${styledBorderColor};
            border-radius: ${settings.border_radius || '0'}px;
            padding: 12px;
            margin: auto;
            ${widthStyle}
            ${settings.text_shadow ? 'text-shadow: 2px 2px 4px rgba(0,0,0,0.3);' : ''}
            ${settings.box_shadow ? 'box-shadow: 0 4px 8px rgba(0,0,0,0.1);' : ''}
        ">
            ✨ ${textContent}
        </${tagName}>`;
    }

    /**
     * Duplicar elemento
     */
    duplicateElement(element) {
        const newElementId = 'element_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        return {
            ...element,
            id: newElementId,
            label: element.label + ' (Copia)',
            settings: { ...element.settings } // Deep copy de settings
        };
    }

    /**
     * Validar elemento
     */
    validateElement(element) {
        const errors = [];
        
        // Validaciones básicas
        if (!element.type) {
            errors.push('Tipo de elemento requerido');
        }
        
        if (!this.elementTypes[element.type]) {
            errors.push('Tipo de elemento no válido');
        }
        
        // Validaciones específicas por tipo
        switch (element.type) {
            case 'video':
                if (element.settings?.video_url && !this.isValidUrl(element.settings.video_url)) {
                    errors.push('URL de video no válida');
                }
                break;
            case 'image':
                if (element.settings?.image_url && !this.isValidImageUrl(element.settings.image_url)) {
                    errors.push('URL de imagen no válida');
                }
                break;
            case 'button':
                if (element.settings?.button_url && !this.isValidUrl(element.settings.button_url)) {
                    errors.push('URL de botón no válida');
                }
                break;
            case 'countdown':
                if (element.settings?.target_date && !this.isValidDate(element.settings.target_date)) {
                    errors.push('Fecha de cuenta atrás no válida');
                }
                break;
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Utilidades
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    hexToRgba(hex, opacity = 1) {
        if (!hex || typeof hex !== 'string') return 'rgba(0,0,0,1)';
        
        hex = hex.replace('#', '');
        
        if (hex.length === 3) {
            hex = hex.split('').map(char => char + char).join('');
        }
        
        if (hex.length !== 6 || !/^[0-9A-Fa-f]{6}$/.test(hex)) {
            return 'rgba(0,0,0,1)';
        }
        
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    isValidImageUrl(url) {
        if (!this.isValidUrl(url)) return false;
        const validExtensions = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;
        return validExtensions.test(url);
    }

    isValidDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }
}

// Export para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FreestyleElements;
} else {
    window.SFQ_FreestyleElements = FreestyleElements;
}
