/**
 * StyleManager - Gestión de estilos
 * Smart Forms & Quiz - Admin Builder v2
 */

(function($) {
    'use strict';

    class SFQ_StyleManager {
    constructor(formBuilder) {
        this.formBuilder = formBuilder;
    }

    /**
     * Inicializar StyleManager
     */
    init() {
        // No hay inicialización específica requerida para StyleManager
        // Los eventos se manejan a través del EventManager
    }

    /**
     * Actualizar estilos en tiempo real
     */
    updatePreviewStyles() {
        // Crear o actualizar el elemento de estilo dinámico
        let $styleElement = $('#sfq-dynamic-styles');
        if ($styleElement.length === 0) {
            $styleElement = $('<style id="sfq-dynamic-styles"></style>');
            $('head').append($styleElement);
        }

        // Recopilar valores actuales
        const styles = this.collectCurrentStyles();
        
        // Aplicar opacidades a los colores
        const processedStyles = this.processStylesWithOpacity(styles);
        
        // Generar CSS dinámico
        const css = this.generateDynamicCSS(processedStyles);
        
        // Aplicar el CSS
        $styleElement.html(css);
        
        // Aplicar atributos data para el ancho si hay elementos en la página
        this.applyDataAttributes(processedStyles);
        
    }

    /**
     * Recopilar estilos actuales del formulario
     */
    collectCurrentStyles() {
        return {
            primaryColor: $('#primary-color').val() || '#007cba',
            secondaryColor: $('#secondary-color').val() || '#6c757d',
            backgroundColor: $('#background-color').val() || '#ffffff',
            optionsBackgroundColor: $('#options-background-color').val() || '#ffffff',
            optionsBorderColor: $('#options-border-color').val() || '#e0e0e0',
            inputBorderColor: $('#input-border-color').val() || '#ddd',
            textColor: $('#text-color').val() || '#333333',
            borderRadius: $('#border-radius').val() || '12',
            fontFamily: $('#font-family').val() || 'inherit',
            formContainerBorderRadius: $('#form-container-border-radius').val() || '20',
            formContainerShadow: $('#form-container-shadow').is(':checked'),
            formContainerWidth: $('#form-container-width').val() || 'responsive',
            formContainerCustomWidth: $('#form-container-custom-width').val() || '720',
            questionContentWidth: $('#question-content-width').val() || 'responsive',
            questionContentCustomWidth: $('#question-content-custom-width').val() || '600',
            questionTextSize: $('#question-text-size').val() || '24',
            optionTextSize: $('#option-text-size').val() || '16',
            questionTextAlign: $('#question-text-align').val() || 'left',
            generalTextAlign: $('#general-text-align').val() || 'left',
            // Configuraciones de imagen de fondo
            backgroundImageUrl: $('#background-image-url').val() || '',
            backgroundSize: $('#background-size').val() || 'cover',
            backgroundRepeat: $('#background-repeat').val() || 'no-repeat',
            backgroundPosition: $('#background-position').val() || 'center center',
            backgroundAttachment: $('#background-attachment').val() || 'scroll',
            backgroundOpacity: $('#background-opacity').val() !== '' ? $('#background-opacity').val() : '1',
            backgroundOverlay: $('#background-overlay').is(':checked'),
            backgroundOverlayColor: $('#background-overlay-color').val() || '#000000',
            backgroundOverlayOpacity: $('#background-overlay-opacity').val() !== '' ? $('#background-overlay-opacity').val() : '0.3',
            // Valores de opacidad
            primaryColorOpacity: $('#primary-color-opacity').val() !== '' ? $('#primary-color-opacity').val() : '1',
            secondaryColorOpacity: $('#secondary-color-opacity').val() !== '' ? $('#secondary-color-opacity').val() : '1',
            backgroundColorOpacity: $('#background-color-opacity').val() !== '' ? $('#background-color-opacity').val() : '1',
            optionsBackgroundColorOpacity: $('#options-background-color-opacity').val() !== '' ? $('#options-background-color-opacity').val() : '1',
            optionsBorderColorOpacity: $('#options-border-color-opacity').val() !== '' ? $('#options-border-color-opacity').val() : '1',
            textColorOpacity: $('#text-color-opacity').val() !== '' ? $('#text-color-opacity').val() : '1',
            inputBorderColorOpacity: $('#input-border-color-opacity').val() !== '' ? $('#input-border-color-opacity').val() : '1'
        };
    }

    /**
     * Procesar estilos aplicando opacidades
     */
    processStylesWithOpacity(styles) {
        return {
            ...styles,
            primaryColor: this.applyOpacity(styles.primaryColor, styles.primaryColorOpacity),
            secondaryColor: this.applyOpacity(styles.secondaryColor, styles.secondaryColorOpacity),
            backgroundColor: this.applyOpacity(styles.backgroundColor, styles.backgroundColorOpacity),
            optionsBackgroundColor: this.applyOpacity(styles.optionsBackgroundColor, styles.optionsBackgroundColorOpacity),
            optionsBorderColor: this.applyOpacity(styles.optionsBorderColor, styles.optionsBorderColorOpacity),
            textColor: this.applyOpacity(styles.textColor, styles.textColorOpacity),
            inputBorderColor: this.applyOpacity(styles.inputBorderColor, styles.inputBorderColorOpacity)
        };
    }

    /**
     * Aplicar opacidad a colores
     */
    applyOpacity(color, opacity) {
        if (opacity === '1' || opacity === 1) return color;
        
        // Convertir hex a rgba
        if (color.startsWith('#')) {
            const hex = color.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
        }
        
        // Si ya es rgba/rgb, intentar modificar la opacidad
        if (color.startsWith('rgba(')) {
            return color.replace(/,\s*[\d.]+\)$/, `, ${opacity})`);
        } else if (color.startsWith('rgb(')) {
            return color.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`);
        }
        
        return color; // Fallback
    }

    /**
     * Generar CSS dinámico
     */
    generateDynamicCSS(styles) {
        // Generar estilos de imagen de fondo
        let backgroundImageStyles = '';
        if (styles.backgroundImageUrl && styles.backgroundImageUrl.trim() !== '') {
            backgroundImageStyles = 'position: relative !important;';
        }

        let css = `
            /* Estilos dinámicos aplicados en tiempo real */
            .sfq-form-container {
                --sfq-primary-color: ${styles.primaryColor} !important;
                --sfq-secondary-color: ${styles.secondaryColor} !important;
                --sfq-background-color: ${styles.backgroundColor} !important;
                --sfq-options-background-color: ${styles.optionsBackgroundColor} !important;
                --sfq-options-border-color: ${styles.optionsBorderColor} !important;
                --sfq-input-border-color: ${styles.inputBorderColor} !important;
                --sfq-text-color: ${styles.textColor} !important;
                --sfq-border-radius: ${styles.borderRadius}px !important;
                --sfq-font-family: ${styles.fontFamily} !important;
                --sfq-form-container-border-radius: ${styles.formContainerBorderRadius}px !important;
                --sfq-form-container-shadow: ${styles.formContainerShadow ? '0 4px 20px rgba(0, 0, 0, 0.1)' : 'none'} !important;
                --sfq-question-text-size: ${styles.questionTextSize}px !important;
                --sfq-option-text-size: ${styles.optionTextSize}px !important;
                --sfq-question-text-align: ${styles.questionTextAlign} !important;
                --sfq-general-text-align: ${styles.generalTextAlign} !important;
                
                /* Aplicar estilos directamente al contenedor */
                background-color: ${styles.backgroundColor} !important;
                color: ${styles.textColor} !important;
                border-radius: ${styles.formContainerBorderRadius}px !important;
                font-family: ${styles.fontFamily} !important;
                box-shadow: var(--sfq-form-container-shadow) !important;
                
                ${backgroundImageStyles}
            }
        `;

        // Añadir estilos de imagen de fondo
        css += this.generateBackgroundImageCSS(styles);

        // Añadir estilos de ancho del contenedor
        css += this.generateContainerWidthCSS(styles);

        // Añadir estilos específicos de elementos
        css += this.generateElementSpecificCSS(styles);

        // Añadir estilos del preview
        css += this.generatePreviewCSS(styles);

        return css;
    }

    /**
     * Generar CSS para imagen de fondo
     */
    generateBackgroundImageCSS(styles) {
        let css = '';

        if (styles.backgroundImageUrl && styles.backgroundImageUrl.trim() !== '') {
            css += `
                .sfq-form-container::before {
                    content: '' !important;
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    background-image: url('${styles.backgroundImageUrl}') !important;
                    background-size: ${styles.backgroundSize} !important;
                    background-repeat: ${styles.backgroundRepeat} !important;
                    background-position: ${styles.backgroundPosition} !important;
                    background-attachment: ${styles.backgroundAttachment} !important;
                    opacity: ${styles.backgroundOpacity} !important;
                    pointer-events: none !important;
                    border-radius: inherit !important;
                    z-index: 0 !important;
                }
                
                .sfq-form-container > * {
                    position: relative !important;
                    z-index: 2 !important;
                }
            `;

            // Overlay para imagen de fondo
            if (styles.backgroundOverlay) {
                css += `
                    .sfq-form-container::after {
                        content: '' !important;
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        right: 0 !important;
                        bottom: 0 !important;
                        background-color: ${styles.backgroundOverlayColor} !important;
                        opacity: ${styles.backgroundOverlayOpacity} !important;
                        pointer-events: none !important;
                        border-radius: inherit !important;
                        z-index: 1 !important;
                    }
                `;
            }
        }

        return css;
    }

    /**
     * Generar CSS para ancho del contenedor
     */
    generateContainerWidthCSS(styles) {
        return `
            /* Ancho del contenedor según configuración */
            .sfq-form-container[data-width="full"] {
                max-width: 100% !important;
                width: 100% !important;
            }
            
            .sfq-form-container[data-width="responsive"] {
                max-width: 720px !important;
            }
            
            .sfq-form-container[data-width="custom"] {
                max-width: ${styles.formContainerCustomWidth}px !important;
            }
            
            /* Ancho del contenido de preguntas - aplicado a sfq-question-screen */
            .sfq-question-screen[data-width="full"] {
                width: 100% !important;
                max-width: 100% !important;
            }
            
            .sfq-question-screen[data-width="responsive"] {
                width: 100% !important;
                max-width: 720px !important;
                margin: 0 auto !important;
            }
            
            .sfq-question-screen[data-width="custom"] {
                width: 100% !important;
                max-width: ${styles.questionContentCustomWidth}px !important;
                margin: 0 auto !important;
            }
        `;
    }

    /**
     * Generar CSS específico para elementos
     */
    generateElementSpecificCSS(styles) {
        return `
            /* CRÍTICO: Aplicar estilos a elementos específicos con mayor especificidad */
            .sfq-form-container .sfq-option-card,
            .sfq-option-card {
                background-color: ${styles.optionsBackgroundColor} !important;
                border-radius: ${styles.borderRadius}px !important;
                border-color: ${styles.optionsBorderColor || '#e0e0e0'} !important;
            }
            
            /* Aplicar color de borde a inputs de texto y estrellas */
            .sfq-form-container .sfq-text-input,
            .sfq-text-input {
                border-color: ${styles.inputBorderColor} !important;
            }
            
            .sfq-form-container .sfq-star svg,
            .sfq-star svg {
                stroke: ${styles.inputBorderColor} !important;
            }
            
            .sfq-form-container .sfq-question-text,
            .sfq-question-text,
            .sfq-preview-question-text {
                font-size: ${styles.questionTextSize}px !important;
                text-align: ${styles.questionTextAlign} !important;
                color: ${styles.textColor} !important;
            }
            
            .sfq-form-container .sfq-option-text,
            .sfq-option-text {
                font-size: ${styles.optionTextSize}px !important;
                text-align: ${styles.generalTextAlign} !important;
                color: ${styles.textColor} !important;
            }
            
            /* Aplicar también a elementos del admin para previsualización */
            .sfq-builder-wrap .sfq-form-container,
            .sfq-builder-wrap .sfq-question-text,
            .sfq-builder-wrap .sfq-option-text,
            .sfq-builder-wrap .sfq-option-card {
                transition: all 0.3s ease !important;
            }
        `;
    }

    /**
     * Generar CSS para el preview
     */
    generatePreviewCSS(styles) {
        return `
            /* Asegurar que los elementos del preview también reciban los estilos */
            #sfq-preview-iframe .sfq-form-container {
                --sfq-primary-color: ${styles.primaryColor} !important;
                --sfq-secondary-color: ${styles.secondaryColor} !important;
                --sfq-background-color: ${styles.backgroundColor} !important;
                --sfq-options-background-color: ${styles.optionsBackgroundColor} !important;
                --sfq-text-color: ${styles.textColor} !important;
                --sfq-border-radius: ${styles.borderRadius}px !important;
                --sfq-form-container-border-radius: ${styles.formContainerBorderRadius}px !important;
                --sfq-question-text-size: ${styles.questionTextSize}px !important;
                --sfq-option-text-size: ${styles.optionTextSize}px !important;
                --sfq-question-text-align: ${styles.questionTextAlign} !important;
                --sfq-general-text-align: ${styles.generalTextAlign} !important;
            }
        `;
    }

    /**
     * Aplicar atributos data para elementos
     */
    applyDataAttributes(styles) {
        if ($('.sfq-form-container').length > 0) {
            $('.sfq-form-container').attr('data-width', styles.formContainerWidth);
            $('.sfq-form-container').attr('data-shadow', styles.formContainerShadow ? 'true' : 'false');
            
            // Aplicar ancho personalizado como variable CSS si es necesario
            if (styles.formContainerWidth === 'custom') {
                $('.sfq-form-container').css('--sfq-form-container-custom-width', styles.formContainerCustomWidth + 'px');
            }
        }
        
        if ($('.sfq-question-content').length > 0) {
            $('.sfq-question-content').attr('data-width', styles.questionContentWidth);
            
            // Aplicar ancho personalizado como variable CSS si es necesario
            if (styles.questionContentWidth === 'custom') {
                $('.sfq-question-content').css('--sfq-question-content-custom-width', styles.questionContentCustomWidth + 'px');
            }
        }
        
        // CRÍTICO: También aplicar atributos a .sfq-question-screen
        if ($('.sfq-question-screen').length > 0) {
            $('.sfq-question-screen').attr('data-width', styles.questionContentWidth);
            
            // Aplicar ancho personalizado como variable CSS si es necesario
            if (styles.questionContentWidth === 'custom') {
                $('.sfq-question-screen').css('--sfq-question-content-custom-width', styles.questionContentCustomWidth + 'px');
            }
        }
    }

    /**
     * Actualizar resumen dinámico de límites
     */
    updateLimitsSummary() {
        const summaryContainer = $('#sfq-limits-summary');
        const summaryContent = $('#sfq-limits-summary-content');
        
        const limits = [];
        
        // 1. Límite de envíos
        const submissionCount = $('#submission-limit-count').val();
        const submissionPeriod = $('#submission-limit-period').val();
        if (submissionCount && submissionCount > 0 && submissionPeriod !== 'no_limit') {
            const periodText = {
                'day': 'día',
                'week': 'semana', 
                'month': 'mes',
                'year': 'año',
                'forever': 'para siempre'
            };
            
            const limitType = $('#limit-type').val() === 'ip_address' ? 'por IP' : 'por sesión';
            limits.push(`📝 Máximo <strong>${submissionCount}</strong> envío(s) cada <strong>${periodText[submissionPeriod]}</strong> (${limitType})`);
        }
        
        // 2. Login requerido
        if ($('#require-login').is(':checked')) {
            limits.push('🔒 Solo para <strong>usuarios registrados</strong>');
        }
        
        // 3. Programación
        if ($('#enable-schedule').is(':checked')) {
            const startDate = $('#schedule-start').val();
            const endDate = $('#schedule-end').val();
            
            if (startDate && endDate) {
                const start = new Date(startDate).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                const end = new Date(endDate).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric', 
                    hour: '2-digit',
                    minute: '2-digit'
                });
                limits.push(`🕐 Disponible del <strong>${start}</strong> al <strong>${end}</strong>`);
            } else if (startDate) {
                const start = new Date(startDate).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit', 
                    minute: '2-digit'
                });
                limits.push(`🕐 Disponible desde el <strong>${start}</strong>`);
            } else if (endDate) {
                const end = new Date(endDate).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                limits.push(`🕐 Disponible hasta el <strong>${end}</strong>`);
            }
        }
        
        // 4. Límite de participantes
        if ($('#enable-max-submissions').is(':checked')) {
            const maxSubmissions = $('#max-submissions').val();
            if (maxSubmissions && maxSubmissions > 0) {
                const limitType = $('#max-submissions-limit-type').val() === 'ip_address' ? 'por IP' : 'por sesión';
                limits.push(`👥 Máximo <strong>${maxSubmissions}</strong> participantes (${limitType})`);
            }
        }
        
        // Mostrar u ocultar el resumen
        if (limits.length > 0) {
            const summaryHtml = '<ul style="margin: 10px 0 0 0; padding-left: 20px;">' + 
                limits.map(limit => `<li style="margin-bottom: 8px;">${limit}</li>`).join('') + 
                '</ul>';
            summaryContent.html(summaryHtml);
            summaryContainer.slideDown();
        } else {
            summaryContainer.slideUp();
        }
    }

    /**
     * Aplicar preset de estilo
     */
    applyStylePreset(presetName) {
        const presets = {
            modern: {
                primaryColor: '#007cba',
                secondaryColor: '#6c757d',
                backgroundColor: '#ffffff',
                textColor: '#212529',
                borderRadius: '12',
                fontFamily: 'inherit'
            },
            classic: {
                primaryColor: '#0073aa',
                secondaryColor: '#666666',
                backgroundColor: '#ffffff',
                textColor: '#333333',
                borderRadius: '8',
                fontFamily: 'Georgia, serif'
            },
            dark: {
                primaryColor: '#bb86fc',
                secondaryColor: '#03dac6',
                backgroundColor: '#121212',
                textColor: '#ffffff',
                borderRadius: '16',
                fontFamily: 'inherit'
            },
            minimal: {
                primaryColor: '#000000',
                secondaryColor: '#666666',
                backgroundColor: '#ffffff',
                textColor: '#000000',
                borderRadius: '4',
                fontFamily: 'Arial, sans-serif'
            }
        };

        const preset = presets[presetName];
        if (!preset) {
            console.error('SFQ: Preset not found:', presetName);
            return;
        }

        // Aplicar valores del preset
        Object.keys(preset).forEach(key => {
            const fieldId = this.camelToKebab(key);
            const $field = $(`#${fieldId}`);
            
            if ($field.length > 0) {
                $field.val(preset[key]);
                
                // Trigger change event para color pickers
                if ($field.hasClass('sfq-color-picker')) {
                    $field.wpColorPicker('color', preset[key]);
                }
            }
        });

        // Actualizar preview
        this.updatePreviewStyles();
        
        // Marcar como modificado
        this.formBuilder.isDirty = true;
        
        // Mostrar notificación
        this.formBuilder.uiRenderer.showNotice(`Preset "${presetName}" aplicado correctamente`, 'success');
    }

    /**
     * Convertir camelCase a kebab-case
     */
    camelToKebab(str) {
        return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
    }

    /**
     * Exportar estilos actuales
     */
    exportStyles() {
        const styles = this.collectCurrentStyles();
        const dataStr = JSON.stringify(styles, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = 'sfq-styles.json';
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }

    /**
     * Importar estilos
     */
    importStyles(file) {
        const reader = new FileReader();
        const self = this;
        
        reader.onload = function(e) {
            try {
                const styles = JSON.parse(e.target.result);
                
                if (typeof styles !== 'object' || styles === null) {
                    throw new Error('El archivo no contiene un objeto de estilos válido');
                }
                
                // Aplicar estilos importados
                Object.keys(styles).forEach(key => {
                    const fieldId = self.camelToKebab(key);
                    const $field = $(`#${fieldId}`);
                    
                    if ($field.length > 0) {
                        if ($field.is(':checkbox')) {
                            $field.prop('checked', styles[key]);
                        } else {
                            $field.val(styles[key]);
                            
                            // Trigger change event para color pickers
                            if ($field.hasClass('sfq-color-picker')) {
                                $field.wpColorPicker('color', styles[key]);
                            }
                        }
                    }
                });
                
                // Actualizar preview
                self.updatePreviewStyles();
                
                // Marcar como modificado
                self.formBuilder.isDirty = true;
                
                alert('Estilos importados correctamente');
                
            } catch (error) {
                alert('Error al importar estilos: ' + error.message);
            }
        };
        
        reader.readAsText(file);
    }

    /**
     * Resetear estilos a valores por defecto
     */
    resetStyles() {
        if (!confirm('¿Estás seguro de resetear todos los estilos a los valores por defecto?')) {
            return;
        }
        
        const defaultStyles = {
            primaryColor: '#007cba',
            secondaryColor: '#6c757d',
            backgroundColor: '#ffffff',
            optionsBackgroundColor: '#ffffff',
            optionsBorderColor: '#e0e0e0',
            inputBorderColor: '#ddd',
            textColor: '#333333',
            questionTextColor: '#333333',
            introTitleColor: '#333333',
            introDescriptionColor: '#666666',
            borderRadius: '8',
            fontFamily: 'inherit',
            formContainerBorderRadius: '20',
            formContainerShadow: false,
            formContainerWidth: 'responsive',
            questionContentWidth: 'responsive',
            questionTextSize: '24',
            optionTextSize: '16',
            questionTextAlign: 'left',
            generalTextAlign: 'left'
        };
        
        // Aplicar valores por defecto
        Object.keys(defaultStyles).forEach(key => {
            const fieldId = this.camelToKebab(key);
            const $field = $(`#${fieldId}`);
            
            if ($field.length > 0) {
                if ($field.is(':checkbox')) {
                    $field.prop('checked', defaultStyles[key]);
                } else {
                    $field.val(defaultStyles[key]);
                    
                    // Trigger change event para color pickers
                    if ($field.hasClass('sfq-color-picker')) {
                        $field.wpColorPicker('color', defaultStyles[key]);
                    }
                }
            }
        });
        
        // Resetear opacidades
        $('.sfq-opacity-range').val('1');
        $('.sfq-opacity-value').text('100%');
        
        // Actualizar preview
        this.updatePreviewStyles();
        
        // Marcar como modificado
        this.formBuilder.isDirty = true;
        
        this.formBuilder.uiRenderer.showNotice('Estilos reseteados a valores por defecto', 'success');
    }
}

    // Export para uso en otros módulos
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = SFQ_StyleManager;
    } else {
        window.SFQ_StyleManager = SFQ_StyleManager;
    }

})(jQuery);
