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
