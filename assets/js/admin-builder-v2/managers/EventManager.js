/**
 * EventManager - Gestión centralizada de eventos
 * Smart Forms & Quiz - Admin Builder v2
 */

(function($) {
    'use strict';

    class EventManager {
    constructor(formBuilder) {
        this.formBuilder = formBuilder;
        this.eventNamespace = '.' + this.formBuilder.instanceId;
        this.boundEvents = new Map(); // Registro de eventos vinculados
    }

    init() {
        this.bindGlobalEvents();
        this.setupEventDelegation();
    }

    /**
     * Vincular eventos globales del formulario
     */
    bindGlobalEvents() {
        const ns = this.eventNamespace;
        
        // Limpiar eventos previos con este namespace
        this.unbindEvents([
            '.sfq-tab-button',
            '#sfq-save-form',
            '#sfq-preview-form',
            '#sfq-toggle-main',
            '#form-title, #form-description, #form-type',
            '.sfq-tab-content input[type="checkbox"]',
            '#show-intro-screen',
            '#border-radius',
            'window'
        ]);
        
        // Tabs
        $('.sfq-tab-button').on('click' + ns, (e) => this.handleTabSwitch(e));
        
        // Save button - con debounce
        $('#sfq-save-form').on('click' + ns, (e) => {
            e.preventDefault();
            this.formBuilder.saveFormDebounced();
        });
        
        // Preview button
        $('#sfq-preview-form').on('click' + ns, (e) => {
            e.preventDefault();
            this.formBuilder.showPreview();
        });
        
        // Toggle main area button
        $('#sfq-toggle-main').on('click' + ns, (e) => {
            e.preventDefault();
            this.formBuilder.toggleMainArea();
        });
        
        // Form field changes
        $('#form-title, #form-description, #form-type').on('change' + ns, () => {
            if (!this.formBuilder.isDestroyed) {
                this.formBuilder.isDirty = true;
            }
        });
        
        // Settings checkboxes
        $('.sfq-tab-content input[type="checkbox"]').on('change' + ns, () => {
            if (!this.formBuilder.isDestroyed) {
                this.formBuilder.isDirty = true;
            }
        });
        
        // Block form toggle
        $('#block-form').on('change' + ns, (e) => this.handleBlockFormToggle(e));
        
        // Intro screen toggle
        $('#show-intro-screen').on('change' + ns, (e) => {
            $('#intro-screen-settings').toggle($(e.target).is(':checked'));
        });
        
        // Color pickers
        this.initColorPickers();
        
        // Opacity controls
        this.bindOpacityControls();
        
        // Range sliders
        this.bindRangeSliders();
        
        // Style controls
        this.bindStyleControls();
        
        // Limits controls
        this.bindLimitsControls();
        
        // Background image events
        this.bindBackgroundImageEvents();
        
        // Variables globales
        $('#sfq-add-variable').off('click' + ns).on('click' + ns, () => {
            if (this.formBuilder.variableManager) {
                this.formBuilder.variableManager.showVariableModal();
            } else {
                console.error('SFQ: VariableManager not available');
            }
        });
        
        // ✅ NUEVO: Eventos para configuración del botón siguiente en preguntas freestyle
        this.bindFreestyleButtonEvents();
        
        // Prevent accidental navigation
        $(window).on('beforeunload' + ns, () => {
            if (this.formBuilder.isDirty && !this.formBuilder.isDestroyed) {
                return 'Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?';
            }
        });
        
        console.log('SFQ EventManager: Global events bound with namespace', ns);
    }

    /**
     * Configurar delegación de eventos para elementos dinámicos
     */
    setupEventDelegation() {
        const ns = this.eventNamespace;
        
        // Event delegation para elementos que se crean dinámicamente
        $(document).off('click' + ns + '-delegation');
        
        // Delegación para botones de añadir pregunta
        $(document).on('click' + ns + '-delegation', '.sfq-add-question', (e) => {
            this.handleAddQuestion(e);
        });
        
        // Delegación para elementos de preguntas
        $(document).on('click' + ns + '-delegation', '.sfq-delete-question', (e) => {
            this.handleDeleteQuestion(e);
        });
        
        $(document).on('click' + ns + '-delegation', '.sfq-duplicate-question', (e) => {
            this.handleDuplicateQuestion(e);
        });
        
        // Delegación para opciones
        $(document).on('click' + ns + '-delegation', '.sfq-add-option', (e) => {
            this.handleAddOption(e);
        });
        
        $(document).on('click' + ns + '-delegation', '.sfq-option-remove', (e) => {
            this.handleRemoveOption(e);
        });
        
        // Delegación para condiciones
        $(document).on('click' + ns + '-delegation', '.sfq-add-condition', (e) => {
            this.handleAddCondition(e);
        });
        
        console.log('SFQ EventManager: Event delegation set up');
    }

    /**
     * Manejar cambio de pestañas
     */
    handleTabSwitch(e) {
        const button = $(e.currentTarget);
        const tab = button.data('tab');
        
        $('.sfq-tab-button').removeClass('active');
        button.addClass('active');
        
        $('.sfq-tab-content').removeClass('active');
        $(`#tab-${tab}`).addClass('active');
    }

    /**
     * Manejar toggle de bloqueo de formulario
     */
    handleBlockFormToggle(e) {
        if ($(e.target).is(':checked')) {
            $('#block-form-container').slideDown();
        } else {
            $('#block-form-container').slideUp();
        }
        
        if (!this.formBuilder.isDestroyed) {
            this.formBuilder.isDirty = true;
        }
    }

    /**
     * Manejar añadir pregunta
     */
    handleAddQuestion(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const $button = $(e.currentTarget);
        const type = $button.data('type');
        const isFinalScreen = $button.data('final-screen') === true;
        
        if (type && !$button.prop('disabled')) {
            this.formBuilder.questionManager.addQuestion(type, isFinalScreen);
        }
    }

    /**
     * Manejar eliminar pregunta
     */
    handleDeleteQuestion(e) {
        e.preventDefault();
        const $question = $(e.currentTarget).closest('.sfq-question-item');
        const questionId = $question.attr('id');
        
        if (confirm('¿Estás seguro de eliminar esta pregunta?')) {
            this.formBuilder.questionManager.deleteQuestion(questionId);
        }
    }

    /**
     * Manejar duplicar pregunta
     */
    handleDuplicateQuestion(e) {
        e.preventDefault();
        const $question = $(e.currentTarget).closest('.sfq-question-item');
        const questionId = $question.attr('id');
        
        this.formBuilder.questionManager.duplicateQuestion(questionId);
    }

    /**
     * Manejar añadir opción
     */
    handleAddOption(e) {
        e.preventDefault();
        const $button = $(e.currentTarget);
        const questionId = $button.closest('.sfq-question-item').attr('id');
        
        this.formBuilder.questionManager.addOption(questionId);
    }

    /**
     * Manejar eliminar opción
     */
    handleRemoveOption(e) {
        e.preventDefault();
        const $option = $(e.currentTarget).closest('.sfq-option-item');
        const $question = $option.closest('.sfq-question-item');
        
        if ($question.find('.sfq-option-item').length > 2) {
            $option.remove();
            this.formBuilder.isDirty = true;
        } else {
            alert('Debe haber al menos 2 opciones');
        }
    }

    /**
     * Manejar añadir condición
     */
    handleAddCondition(e) {
        e.preventDefault();
        const $button = $(e.currentTarget);
        const questionId = $button.closest('.sfq-question-item').attr('id');
        
        this.formBuilder.conditionEngine.addCondition(questionId);
    }

    /**
     * Inicializar color pickers
     */
    initColorPickers() {
        if ($.fn.wpColorPicker) {
            const self = this;
            $('.sfq-color-picker').each(function() {
                $(this).wpColorPicker({
                    change: function(event, ui) {
                        self.formBuilder.isDirty = true;
                        self.formBuilder.updatePreviewStyles();
                        $(this).trigger('wpcolorpickerchange');
                    },
                    clear: function() {
                        self.formBuilder.isDirty = true;
                        self.formBuilder.updatePreviewStyles();
                        $(this).trigger('wpcolorpickerchange');
                    }
                });
            });
        }
    }

    /**
     * Vincular controles de opacidad
     */
    bindOpacityControls() {
        const ns = this.eventNamespace;
        
        $('.sfq-opacity-range').off('input' + ns).on('input' + ns, (e) => {
            const value = $(e.target).val();
            const percentage = Math.round(value * 100);
            const colorFor = $(e.target).attr('id').replace('-opacity', '');
            $(`.sfq-opacity-value[data-for="${colorFor}"]`).text(percentage + '%');
            
            if (!this.formBuilder.isDestroyed) {
                this.formBuilder.isDirty = true;
                this.formBuilder.updatePreviewStyles();
            }
        });
    }

    /**
     * Vincular range sliders
     */
    bindRangeSliders() {
        const ns = this.eventNamespace;
        
        // Border radius principal
        $('#border-radius').on('input' + ns, (e) => {
            $('.sfq-range-value').text($(e.target).val() + 'px');
            if (!this.formBuilder.isDestroyed) {
                this.formBuilder.isDirty = true;
            }
        });
        
        // Nuevos range sliders para opciones de estilo
        const rangeSliders = [
            { id: '#form-container-border-radius', display: '.sfq-form-container-radius-value' },
            { id: '#question-text-size', display: '.sfq-question-text-size-value' },
            { id: '#option-text-size', display: '.sfq-option-text-size-value' },
            { id: '#question-content-min-height', display: '.sfq-question-content-height-value' }
        ];
        
        rangeSliders.forEach(slider => {
            $(slider.id).on('input' + ns, (e) => {
                $(slider.display).text($(e.target).val() + 'px');
                if (!this.formBuilder.isDestroyed) {
                    this.formBuilder.isDirty = true;
                    this.formBuilder.updatePreviewStyles();
                }
            });
        });
    }

    /**
     * Vincular controles de estilo
     */
    bindStyleControls() {
        const ns = this.eventNamespace;
        
        // Controles de estilo que actualizan preview
        const styleControls = [
            '#form-container-shadow', '#form-container-width', '#question-content-width',
            '#question-text-align', '#general-text-align', '#form-container-custom-width',
            '#question-content-custom-width', '#form-container-padding'
        ];
        
        $(styleControls.join(', ')).on('change input' + ns, () => {
            if (!this.formBuilder.isDestroyed) {
                this.formBuilder.isDirty = true;
                this.formBuilder.updatePreviewStyles();
            }
        });
        
        // Controles de color y estilo que actualizan preview
        const colorStyleControls = [
            '#primary-color', '#secondary-color', '#background-color', '#options-background-color',
            '#options-border-color', '#input-border-color', '#text-color', '#question-text-color',
            '#intro-title-color', '#intro-description-color', '#border-radius', '#font-family',
            '#form-container-border-radius', '#question-text-size', '#option-text-size',
            '#form-container-shadow', '#form-container-width', '#question-content-width',
            '#question-text-align', '#general-text-align', '#form-container-custom-width',
            '#question-content-custom-width'
        ];
        
        $(colorStyleControls.join(', ')).on('change input' + ns, () => {
            if (!this.formBuilder.isDestroyed) {
                this.formBuilder.updatePreviewStyles();
            }
        });
        
        // Campos personalizados de ancho
        this.bindCustomWidthControls();
    }

    /**
     * Vincular controles de ancho personalizado
     */
    bindCustomWidthControls() {
        const ns = this.eventNamespace;
        
        $('#form-container-width').on('change' + ns, (e) => {
            const $customContainer = $('#form-container-custom-width-container');
            if ($(e.target).val() === 'custom') {
                $customContainer.slideDown(300);
            } else {
                $customContainer.slideUp(300);
            }
            if (!this.formBuilder.isDestroyed) {
                this.formBuilder.isDirty = true;
                this.formBuilder.updatePreviewStyles();
            }
        });
        
        $('#question-content-width').on('change' + ns, (e) => {
            const $customContainer = $('#question-content-custom-width-container');
            if ($(e.target).val() === 'custom') {
                $customContainer.slideDown(300);
            } else {
                $customContainer.slideUp(300);
            }
            if (!this.formBuilder.isDestroyed) {
                this.formBuilder.isDirty = true;
                this.formBuilder.updatePreviewStyles();
            }
        });
    }

    /**
     * Vincular controles de límites
     */
    bindLimitsControls() {
        const ns = this.eventNamespace;
        
        // Límites de envío
        $('#submission-limit-count').on('input' + ns, (e) => {
            const count = $(e.target).val();
            const $period = $('#submission-limit-period');
            
            if (count && count > 0) {
                if ($period.val() === 'no_limit') {
                    $period.val('day');
                }
                $('#limit-type-container, #limit-message-container').slideDown();
            } else {
                $period.val('no_limit');
                $('#limit-type-container, #limit-message-container').slideUp();
            }
            
            if (!this.formBuilder.isDestroyed) {
                this.formBuilder.isDirty = true;
            }
        });
        
        $('#submission-limit-period').on('change' + ns, (e) => {
            const period = $(e.target).val();
            const $count = $('#submission-limit-count');
            
            if (period === 'no_limit') {
                $count.val('');
                $('#limit-type-container, #limit-message-container').slideUp();
            } else {
                $('#limit-type-container, #limit-message-container').slideDown();
                if (!$count.val()) {
                    $count.val('1');
                }
            }
            
            if (!this.formBuilder.isDestroyed) {
                this.formBuilder.isDirty = true;
            }
        });
        
        // Otros controles de límites
        this.bindOtherLimitsControls();
        
        // Actualizar resumen de límites
        const limitFields = [
            '#submission-limit-count', '#submission-limit-period', '#limit-type',
            '#require-login', '#enable-schedule', '#schedule-start', '#schedule-end',
            '#enable-max-submissions', '#max-submissions', '#max-submissions-limit-type'
        ];
        
        $(limitFields.join(', ')).on('change input' + ns, () => {
            this.formBuilder.updateLimitsSummary();
            if (!this.formBuilder.isDestroyed) {
                this.formBuilder.isDirty = true;
            }
        });
    }

    /**
     * Vincular otros controles de límites
     */
    bindOtherLimitsControls() {
        const ns = this.eventNamespace;
        
        // Requerir login
        $('#require-login').on('change' + ns, (e) => {
            if ($(e.target).is(':checked')) {
                $('#login-message-container').slideDown();
            } else {
                $('#login-message-container').slideUp();
            }
            
            if (!this.formBuilder.isDestroyed) {
                this.formBuilder.isDirty = true;
            }
        });
        
        // Programar disponibilidad
        $('#enable-schedule').on('change' + ns, (e) => {
            if ($(e.target).is(':checked')) {
                $('#schedule-container').slideDown();
            } else {
                $('#schedule-container').slideUp();
            }
        });
        
        // Límite total de participantes
        $('#enable-max-submissions').on('change' + ns, (e) => {
            if ($(e.target).is(':checked')) {
                $('#max-submissions-container').slideDown();
            } else {
                $('#max-submissions-container').slideUp();
            }
        });
    }

    /**
     * Vincular eventos de imagen de fondo
     */
    bindBackgroundImageEvents() {
        const ns = this.eventNamespace;
        
        // Botón para seleccionar imagen de fondo
        $('#select-background-image').off('click' + ns).on('click' + ns, (e) => {
            e.preventDefault();
            this.formBuilder.openBackgroundImageSelector();
        });
        
        // Input URL manual para imagen de fondo
        $('#background-image-url').off('input' + ns).on('input' + ns, (e) => {
            const url = $(e.target).val().trim();
            if (url && this.formBuilder.isValidImageUrl(url)) {
                this.formBuilder.updateBackgroundImagePreview(url);
                $(e.target).removeClass('invalid').addClass('valid');
                $('#background-image-options').slideDown(300);
            } else if (url) {
                $(e.target).removeClass('valid').addClass('invalid');
                this.formBuilder.hideBackgroundImagePreview();
            } else {
                $(e.target).removeClass('valid invalid');
                this.formBuilder.hideBackgroundImagePreview();
            }
            
            if (!this.formBuilder.isDestroyed) {
                this.formBuilder.isDirty = true;
                this.formBuilder.updatePreviewStyles();
            }
        });
        
        // Botón para eliminar imagen de fondo
        $('#remove-background-image').off('click' + ns).on('click' + ns, (e) => {
            e.preventDefault();
            this.formBuilder.removeBackgroundImage();
        });
        
        // Opciones de imagen de fondo
        const bgOptions = [
            '#background-size', '#background-repeat', '#background-position', '#background-attachment'
        ];
        
        $(bgOptions.join(', ')).off('change' + ns).on('change' + ns, () => {
            if (!this.formBuilder.isDestroyed) {
                this.formBuilder.isDirty = true;
                this.formBuilder.updatePreviewStyles();
            }
        });
        
        // Opacidad de imagen de fondo
        $('#background-opacity').off('input' + ns).on('input' + ns, (e) => {
            $('.sfq-background-opacity-value').text($(e.target).val());
            if (!this.formBuilder.isDestroyed) {
                this.formBuilder.isDirty = true;
                this.formBuilder.updatePreviewStyles();
            }
        });
        
        // Checkbox de overlay
        $('#background-overlay').off('change' + ns).on('change' + ns, (e) => {
            const overlayOptions = $('#background-overlay-options');
            if ($(e.target).is(':checked')) {
                overlayOptions.slideDown(300);
            } else {
                overlayOptions.slideUp(300);
            }
            if (!this.formBuilder.isDestroyed) {
                this.formBuilder.isDirty = true;
                this.formBuilder.updatePreviewStyles();
            }
        });
        
        // Opacidad de overlay
        $('#background-overlay-opacity').off('input' + ns).on('input' + ns, (e) => {
            $('.sfq-background-overlay-opacity-value').text($(e.target).val());
            if (!this.formBuilder.isDestroyed) {
                this.formBuilder.isDirty = true;
                this.formBuilder.updatePreviewStyles();
            }
        });
        
        // Color de overlay
        $('#background-overlay-color').off('change' + ns).on('change' + ns, () => {
            if (!this.formBuilder.isDestroyed) {
                this.formBuilder.isDirty = true;
                this.formBuilder.updatePreviewStyles();
            }
        });
        
        // ✅ SOLUCIÓN: Eventos para gradientes animados de introducción
        this.bindAnimatedGradientEvents();
    }
    
    /**
     * ✅ NUEVO: Vincular eventos para gradientes animados de introducción
     */
    bindAnimatedGradientEvents() {
        const ns = this.eventNamespace;
        
        // Checkbox principal para activar/desactivar gradiente animado
        $('#intro-animated-background').off('change' + ns).on('change' + ns, (e) => {
            const $checkbox = $(e.currentTarget);
            const $gradientContainer = $('#intro-gradient-colors');
            
            if ($checkbox.is(':checked')) {
                $gradientContainer.slideDown(300);
                // Actualizar preview inmediatamente
                setTimeout(() => {
                    this.formBuilder.updateGradientPreview();
                }, 350);
            } else {
                $gradientContainer.slideUp(300);
            }
            
            // ✅ SOLUCIÓN: Marcar como modificado Y guardar automáticamente
            if (!this.formBuilder.isDestroyed) {
                this.formBuilder.isDirty = true;
                this.formBuilder.saveFormDebounced(); // Guardar automáticamente
            }
        });
        
        // Colores del gradiente
        const gradientColorInputs = [
            '#intro-gradient-color-1',
            '#intro-gradient-color-2', 
            '#intro-gradient-color-3',
            '#intro-gradient-color-4'
        ];
        
        gradientColorInputs.forEach(selector => {
            $(selector).off('change input' + ns).on('change input' + ns, () => {
                if (!this.formBuilder.isDestroyed) {
                    this.formBuilder.isDirty = true;
                    this.formBuilder.updateGradientPreview();
                }
            });
        });
        
        // Velocidad del gradiente
        $('#intro-gradient-speed').off('input' + ns).on('input' + ns, (e) => {
            const value = $(e.target).val();
            $('.sfq-gradient-speed-value').text(value + 's');
            
            if (!this.formBuilder.isDestroyed) {
                this.formBuilder.isDirty = true;
                this.formBuilder.updateGradientPreview();
            }
        });
        
        // Ángulo del gradiente
        $('#intro-gradient-angle').off('input' + ns).on('input' + ns, (e) => {
            const value = $(e.target).val();
            $('.sfq-gradient-angle-value').text(value + '°');
            
            if (!this.formBuilder.isDestroyed) {
                this.formBuilder.isDirty = true;
                this.formBuilder.updateGradientPreview();
            }
        });
        
        // Tamaño del gradiente
        $('#intro-gradient-size').off('input' + ns).on('input' + ns, (e) => {
            const value = $(e.target).val();
            $('.sfq-gradient-size-value').text(value + '%');
            
            if (!this.formBuilder.isDestroyed) {
                this.formBuilder.isDirty = true;
                this.formBuilder.updateGradientPreview();
            }
        });
        
        console.log('SFQ EventManager: Animated gradient events bound');
        
        // ✅ NUEVO: Eventos para gradientes de pantalla de introducción
        this.bindIntroScreenGradientEvents();
    }
    
    /**
     * ✅ NUEVO: Vincular eventos para gradientes de pantalla de introducción
     */
    bindIntroScreenGradientEvents() {
        const ns = this.eventNamespace;
        
        // Checkbox principal para activar/desactivar gradiente de pantalla de introducción
        $('#intro-animated-background-checkbox').off('change' + ns).on('change' + ns, (e) => {
            const $checkbox = $(e.currentTarget);
            const $gradientContainer = $('#intro-gradient-colors-container');
            
            if ($checkbox.is(':checked')) {
                $gradientContainer.slideDown(300);
                // Actualizar preview inmediatamente
                setTimeout(() => {
                    this.formBuilder.updateIntroScreenGradientPreview();
                }, 350);
            } else {
                $gradientContainer.slideUp(300);
            }
            
            // ✅ SOLUCIÓN: Marcar como modificado Y guardar automáticamente
            if (!this.formBuilder.isDestroyed) {
                this.formBuilder.isDirty = true;
                this.formBuilder.saveFormDebounced(); // Guardar automáticamente
            }
        });
        
        // Colores del gradiente de pantalla de introducción
        const introScreenGradientColorInputs = [
            '#intro-screen-gradient-color-1',
            '#intro-screen-gradient-color-2', 
            '#intro-screen-gradient-color-3',
            '#intro-screen-gradient-color-4'
        ];
        
        introScreenGradientColorInputs.forEach(selector => {
            $(selector).off('change input' + ns).on('change input' + ns, () => {
                if (!this.formBuilder.isDestroyed) {
                    this.formBuilder.isDirty = true;
                    this.formBuilder.updateIntroScreenGradientPreview();
                }
            });
        });
        
        // Velocidad del gradiente de pantalla de introducción
        $('#intro-screen-gradient-speed').off('input' + ns).on('input' + ns, (e) => {
            const value = $(e.target).val();
            $('.sfq-gradient-speed-value').text(value + 's');
            
            if (!this.formBuilder.isDestroyed) {
                this.formBuilder.isDirty = true;
                this.formBuilder.updateIntroScreenGradientPreview();
            }
        });
        
        // Ángulo del gradiente de pantalla de introducción
        $('#intro-screen-gradient-angle').off('input' + ns).on('input' + ns, (e) => {
            const value = $(e.target).val();
            $('.sfq-gradient-angle-value').text(value + '°');
            
            if (!this.formBuilder.isDestroyed) {
                this.formBuilder.isDirty = true;
                this.formBuilder.updateIntroScreenGradientPreview();
            }
        });
        
        // Tamaño del gradiente de pantalla de introducción
        $('#intro-screen-gradient-size').off('input' + ns).on('input' + ns, (e) => {
            const value = $(e.target).val();
            $('.sfq-gradient-size-value').text(value + '%');
            
            if (!this.formBuilder.isDestroyed) {
                this.formBuilder.isDirty = true;
                this.formBuilder.updateIntroScreenGradientPreview();
            }
        });
        
        console.log('SFQ EventManager: Intro screen gradient events bound');
    }

    /**
     * ✅ NUEVO: Vincular eventos para configuración del botón siguiente en preguntas freestyle
     */
    bindFreestyleButtonEvents() {
        const ns = this.eventNamespace;
        
        // Evento para mostrar/ocultar botón siguiente
        $(document).off('change' + ns, '.sfq-show-next-button-checkbox').on('change' + ns, '.sfq-show-next-button-checkbox', (e) => {
            const $checkbox = $(e.currentTarget);
            const $question = $checkbox.closest('.sfq-question-item');
            const $textSetting = $question.find('.sfq-next-button-text-setting');
            const $styleSetting = $question.find('.sfq-next-button-style-setting');
            
            if ($checkbox.is(':checked')) {
                $textSetting.slideDown(300);
                $styleSetting.slideDown(300);
            } else {
                $textSetting.slideUp(300);
                $styleSetting.slideUp(300);
            }
            
            // Actualizar configuración de la pregunta
            this.updateQuestionButtonSettings($question);
        });
        
        // Evento para cambiar texto del botón
        $(document).off('input' + ns, '.sfq-next-button-text-input').on('input' + ns, '.sfq-next-button-text-input', (e) => {
            const $question = $(e.currentTarget).closest('.sfq-question-item');
            this.updateQuestionButtonSettings($question);
        });
        
        // Evento para cambiar entre estilo global y personalizado
        $(document).off('change' + ns, 'input[name^="button_style_"]').on('change' + ns, 'input[name^="button_style_"]', (e) => {
            const $radio = $(e.currentTarget);
            const $question = $radio.closest('.sfq-question-item');
            const $customPanel = $question.find('.sfq-custom-button-panel');
            
            if ($radio.val() === 'custom') {
                $customPanel.slideDown(300);
            } else {
                $customPanel.slideUp(300);
            }
            
            this.updateQuestionButtonSettings($question);
        });
        
        // Eventos para controles de personalización del botón
        $(document).off('change input' + ns, '.sfq-config-input').on('change input' + ns, '.sfq-config-input', (e) => {
            const $input = $(e.currentTarget);
            const $question = $input.closest('.sfq-question-item');
            
            // Actualizar displays de valores en tiempo real
            this.updateButtonConfigDisplays($input);
            
            // Actualizar configuración de la pregunta
            this.updateQuestionButtonSettings($question);
        });
        
        // Evento específico para checkbox de degradado
        $(document).off('change' + ns, 'input[data-setting="gradient_enabled"]').on('change' + ns, 'input[data-setting="gradient_enabled"]', (e) => {
            const $checkbox = $(e.currentTarget);
            const $question = $checkbox.closest('.sfq-question-item');
            const $gradientSetting = $question.find('.sfq-gradient-color-setting');
            const $gradientAnimationSetting = $question.find('.sfq-gradient-animation-setting');
            
            console.log('SFQ: Gradient checkbox changed:', $checkbox.is(':checked'));
            
            if ($checkbox.is(':checked')) {
                $gradientSetting.slideDown(300);
                $gradientAnimationSetting.slideDown(300);
                console.log('SFQ: Showing gradient settings');
            } else {
                $gradientSetting.slideUp(300);
                $gradientAnimationSetting.slideUp(300);
                console.log('SFQ: Hiding gradient settings');
            }
            
            this.updateQuestionButtonSettings($question);
        });
        
        // Eventos específicos para checkboxes de sombras
        $(document).off('change' + ns, 'input[data-setting="box_shadow"]').on('change' + ns, 'input[data-setting="box_shadow"]', (e) => {
            const $checkbox = $(e.currentTarget);
            const $question = $checkbox.closest('.sfq-question-item');
            
            console.log('SFQ: Box shadow checkbox changed:', $checkbox.is(':checked'));
            this.updateQuestionButtonSettings($question);
        });
        
        $(document).off('change' + ns, 'input[data-setting="text_shadow"]').on('change' + ns, 'input[data-setting="text_shadow"]', (e) => {
            const $checkbox = $(e.currentTarget);
            const $question = $checkbox.closest('.sfq-question-item');
            
            console.log('SFQ: Text shadow checkbox changed:', $checkbox.is(':checked'));
            this.updateQuestionButtonSettings($question);
        });
        
        console.log('SFQ EventManager: Freestyle button events bound');
    }
    
    /**
     * ✅ NUEVO: Actualizar configuración del botón de una pregunta
     */
    updateQuestionButtonSettings($question) {
        if (!$question.length) return;
        
        const questionId = $question.attr('id');
        const question = this.formBuilder.questionManager.getQuestion(questionId);
        
        if (!question || question.type !== 'freestyle') return;
        
        // ✅ SOLUCIÓN: Forzar creación de objeto plano siguiendo la guía
        if (!question.settings || Array.isArray(question.settings) || typeof question.settings !== 'object') {
            question.settings = Object.create(null); // Crear objeto sin prototipo
            question.settings = {}; // Luego asignar objeto literal limpio
        }
        
        // ✅ CRÍTICO: Crear nuevo objeto para evitar referencias de array
        const newSettings = {};
        
        // Copiar settings existentes si los hay
        if (question.settings && typeof question.settings === 'object' && !Array.isArray(question.settings)) {
            Object.keys(question.settings).forEach(key => {
                newSettings[key] = question.settings[key];
            });
        }
        
        // Configuración básica del botón
        const $showCheckbox = $question.find('.sfq-show-next-button-checkbox');
        const $textInput = $question.find('.sfq-next-button-text-input');
        const $styleRadio = $question.find('input[name^="button_style_"]:checked');
        
        newSettings.show_next_button = $showCheckbox.is(':checked');
        newSettings.next_button_text = $textInput.val() || '';
        newSettings.next_button_custom_style = $styleRadio.val() === 'custom';
        
        // Si es estilo personalizado, recoger todas las configuraciones
        if (newSettings.next_button_custom_style) {
            // ✅ CRÍTICO: Crear nuevo objeto para next_button_style también
            const buttonStyle = {};
            
            // Recoger todos los valores de configuración
            $question.find('.sfq-config-input').each((index, input) => {
                const $input = $(input);
                const setting = $input.data('setting');
                
                if (setting) {
                    if ($input.attr('type') === 'checkbox') {
                        buttonStyle[setting] = $input.is(':checked');
                        
                        // ✅ DEBUGGING: Log específico para gradient_enabled
                        if (setting === 'gradient_enabled') {
                            console.log('SFQ: Saving gradient_enabled:', $input.is(':checked'));
                        }
                    } else if ($input.attr('type') === 'range') {
                        buttonStyle[setting] = parseFloat($input.val()) || 0;
                    } else {
                        buttonStyle[setting] = $input.val() || '';
                    }
                }
            });
            
            newSettings.next_button_style = buttonStyle;
            
            // ✅ DEBUGGING: Log del objeto buttonStyle completo
            console.log('SFQ: Button style object created:', buttonStyle);
        }
        
        // ✅ CRÍTICO: Asignar el nuevo objeto completo
        question.settings = newSettings;
        
        // Marcar formulario como modificado
        this.formBuilder.isDirty = true;
        
        // ✅ DEBUGGING: Verificar que settings sigue siendo objeto
        console.log('SFQ: Updated button settings for question:', questionId);
        console.log('SFQ: Settings type:', typeof question.settings);
        console.log('SFQ: Settings is array:', Array.isArray(question.settings));
        console.log('SFQ: Settings content:', question.settings);
        
        if (question.settings.next_button_style) {
            console.log('SFQ: Button style gradient_enabled:', question.settings.next_button_style.gradient_enabled);
        }
    }
    
    /**
     * ✅ NUEVO: Actualizar displays de valores en tiempo real
     */
    updateButtonConfigDisplays($input) {
        const setting = $input.data('setting');
        const value = $input.val();
        
        switch (setting) {
            case 'background_opacity':
                $input.siblings('.sfq-bg-opacity-display').text(value);
                break;
            case 'border_opacity':
                $input.siblings('.sfq-border-opacity-display').text(value);
                break;
            case 'border_radius':
                $input.siblings('.sfq-border-radius-display').text(value + 'px');
                break;
            case 'font_size':
                $input.siblings('.sfq-font-size-display').text(value + 'px');
                break;
        }
    }

    /**
     * Desvincular eventos específicos
     */
    unbindEvents(selectors) {
        const ns = this.eventNamespace;
        selectors.forEach(selector => {
            if (selector === 'window') {
                $(window).off(ns);
            } else {
                $(selector).off(ns);
            }
        });
    }

    /**
     * Destruir el EventManager
     */
    destroy() {
        // Desvincular todos los eventos con el namespace
        const ns = this.eventNamespace;
        
        // Eventos globales
        $('.sfq-tab-button').off(ns);
        $('#sfq-save-form').off(ns);
        $('#sfq-preview-form').off(ns);
        $('#sfq-toggle-main').off(ns);
        $('#form-title, #form-description, #form-type').off(ns);
        $('.sfq-tab-content input[type="checkbox"]').off(ns);
        $('#show-intro-screen').off(ns);
        $('#border-radius').off(ns);
        $(window).off(ns);
        $('.sfq-close-preview').off(ns);
        
        // Event delegation
        $(document).off('click' + ns + '-delegation');
        
        // Limpiar registro de eventos
        this.boundEvents.clear();
        
        console.log('SFQ EventManager: Destroyed and cleaned up all events');
    }
}

    // Export para uso en otros módulos
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = EventManager;
    } else {
        window.EventManager = EventManager;
    }

})(jQuery);
