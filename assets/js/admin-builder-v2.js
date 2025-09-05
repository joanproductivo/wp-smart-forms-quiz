/**
 * Smart Forms & Quiz - Admin Builder v2
 * Nueva arquitectura modular con gestión de estado mejorada
 */

(function($) {
    'use strict';

    /**
     * FormBuilderCore - Controlador principal
     */
    class FormBuilderCore {
        constructor() {
            // Generar ID único para esta instancia
            this.instanceId = 'sfq_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            this.formId = $('#sfq-form-id').val() || 0;
            this.isInitialized = false;
            this.isDirty = false;
            this.autoSaveInterval = null;
            this.isSaving = false; // Flag para prevenir guardado duplicado
            this.isDestroyed = false; // Flag para prevenir operaciones después de destruir
            
            // Módulos
            this.stateManager = new StateManager();
            this.questionManager = new QuestionManager(this);
            this.conditionEngine = new ConditionEngine(this);
            this.uiRenderer = new UIRenderer(this);
            this.dataValidator = new DataValidator();
            this.previewManager = null; // Se inicializará después
            
            this.init();
        }

        init() {
            if (this.isInitialized || this.isDestroyed) return;
            
            this.bindGlobalEvents();
            this.initializeModules();
            this.loadFormData();
            this.setupAutoSave();
            
            this.isInitialized = true;
        }

        bindGlobalEvents() {
            const ns = '.' + this.instanceId; // Namespace único para esta instancia
            
            // Limpiar eventos previos con este namespace
            $('.sfq-tab-button').off('click' + ns);
            $('#sfq-save-form').off('click' + ns);
            $('#sfq-preview-form').off('click' + ns);
            $('#form-title, #form-description, #form-type').off('change' + ns);
            $('.sfq-tab-content input[type="checkbox"]').off('change' + ns);
            $('#show-intro-screen').off('change' + ns);
            $('#border-radius').off('input' + ns);
            $(window).off('beforeunload' + ns);
            
            // Tabs
            $('.sfq-tab-button').on('click' + ns, (e) => this.switchTab(e));
            
            // Save button - con debounce
            $('#sfq-save-form').on('click' + ns, (e) => {
                e.preventDefault();
                this.saveFormDebounced();
            });
            
            // Preview button
            $('#sfq-preview-form').on('click' + ns, (e) => {
                e.preventDefault();
                this.showPreview();
            });
            
            // Toggle main area button
            $('#sfq-toggle-main').on('click' + ns, (e) => {
                e.preventDefault();
                this.toggleMainArea();
            });
            
            // Form field changes
            $('#form-title, #form-description, #form-type').on('change' + ns, () => {
                if (!this.isDestroyed) {
                    this.isDirty = true;
                }
            });
            
            // Settings checkboxes
            $('.sfq-tab-content input[type="checkbox"]').on('change' + ns, () => {
                if (!this.isDestroyed) {
                    this.isDirty = true;
                }
            });
            
            // Block form toggle
            $('#block-form').on('change' + ns, (e) => {
                if ($(e.target).is(':checked')) {
                    $('#block-form-container').slideDown();
                } else {
                    $('#block-form-container').slideUp();
                }
                
                if (!this.isDestroyed) {
                    this.isDirty = true;
                }
            });
            
            // Intro screen toggle
            $('#show-intro-screen').on('change' + ns, (e) => {
                $('#intro-screen-settings').toggle($(e.target).is(':checked'));
            });
            
            // Color pickers
            this.initColorPickers();
            
            // ✅ CORREGIDO: Event listeners para controles de opacidad con contexto correcto
            $('.sfq-opacity-control').off('input' + ns).on('input' + ns, (e) => {
                const value = $(e.target).val();
                const colorFor = $(e.target).data('for');
                $(`.sfq-opacity-value[data-for="${colorFor}"]`).text(value);
                
                if (!this.isDestroyed) {
                    this.isDirty = true;
                    this.updatePreviewStyles();
                }
            });
            
            // Range slider
            $('#border-radius').on('input' + ns, (e) => {
                $('.sfq-range-value').text($(e.target).val() + 'px');
                if (!this.isDestroyed) {
                    this.isDirty = true;
                }
            });
            
            // Nuevos range sliders para las opciones de estilo
            $('#form-container-border-radius').on('input' + ns, (e) => {
                $('.sfq-form-container-radius-value').text($(e.target).val() + 'px');
                if (!this.isDestroyed) {
                    this.isDirty = true;
                    this.updatePreviewStyles();
                }
            });
            
            $('#question-text-size').on('input' + ns, (e) => {
                $('.sfq-question-text-size-value').text($(e.target).val() + 'px');
                if (!this.isDestroyed) {
                    this.isDirty = true;
                    this.updatePreviewStyles();
                }
            });
            
            $('#option-text-size').on('input' + ns, (e) => {
                $('.sfq-option-text-size-value').text($(e.target).val() + 'px');
                if (!this.isDestroyed) {
                    this.isDirty = true;
                    this.updatePreviewStyles();
                }
            });
            
            $('#question-content-min-height').on('input' + ns, (e) => {
                $('.sfq-question-content-height-value').text($(e.target).val() + 'px');
                if (!this.isDestroyed) {
                    this.isDirty = true;
                    this.updatePreviewStyles();
                }
            });
            
            // Event listeners para las nuevas opciones de estilo
            $('#form-container-shadow, #form-container-width, #question-content-width, #question-text-align, #general-text-align, #form-container-custom-width, #question-content-custom-width').on('change input' + ns, () => {
                if (!this.isDestroyed) {
                    this.isDirty = true;
                    this.updatePreviewStyles();
                }
            });
            
            // Event listeners para actualizar la previsualización en tiempo real
            $('#primary-color, #secondary-color, #background-color, #options-background-color, #options-border-color, #input-border-color, #text-color, #border-radius, #font-family, #form-container-border-radius, #question-text-size, #option-text-size, #form-container-shadow, #form-container-width, #question-content-width, #question-text-align, #general-text-align, #form-container-custom-width, #question-content-custom-width').on('change input' + ns, () => {
                if (!this.isDestroyed) {
                    this.updatePreviewStyles();
                }
            });
            
            // Event listeners específicos para campos personalizados de ancho
            $('#form-container-width').on('change' + ns, (e) => {
                const $customContainer = $('#form-container-custom-width-container');
                if ($(e.target).val() === 'custom') {
                    $customContainer.slideDown(300);
                } else {
                    $customContainer.slideUp(300);
                }
                if (!this.isDestroyed) {
                    this.isDirty = true;
                    this.updatePreviewStyles();
                }
            });
            
            $('#question-content-width').on('change' + ns, (e) => {
                const $customContainer = $('#question-content-custom-width-container');
                if ($(e.target).val() === 'custom') {
                    $customContainer.slideDown(300);
                } else {
                    $customContainer.slideUp(300);
                }
                if (!this.isDestroyed) {
                    this.isDirty = true;
                    this.updatePreviewStyles();
                }
            });
            
            // Límites - Mostrar/ocultar campos dinámicamente
            $('#submission-limit-count').on('input' + ns, (e) => {
                const count = $(e.target).val();
                const $period = $('#submission-limit-period');
                
                if (count && count > 0) {
                    // Si hay un número, cambiar a "día" si está en "sin límite"
                    if ($period.val() === 'no_limit') {
                        $period.val('day');
                    }
                    $('#limit-type-container, #limit-message-container').slideDown();
                } else {
                    // Si no hay número, cambiar a "sin límite"
                    $period.val('no_limit');
                    $('#limit-type-container, #limit-message-container').slideUp();
                }
                
                if (!this.isDestroyed) {
                    this.isDirty = true;
                }
            });
            
            $('#submission-limit-period').on('change' + ns, (e) => {
                const period = $(e.target).val();
                const $count = $('#submission-limit-count');
                
                if (period === 'no_limit') {
                    // Si seleccionan "sin límite", limpiar el número
                    $count.val('');
                    $('#limit-type-container, #limit-message-container').slideUp();
                } else {
                    // Si seleccionan un período, mostrar campos adicionales
                    $('#limit-type-container, #limit-message-container').slideDown();
                    // Si no hay número, poner 1 por defecto
                    if (!$count.val()) {
                        $count.val('1');
                    }
                }
                
                if (!this.isDestroyed) {
                    this.isDirty = true;
                }
            });
            
            // Requerir login
            $('#require-login').on('change' + ns, (e) => {
                if ($(e.target).is(':checked')) {
                    $('#login-message-container').slideDown();
                } else {
                    $('#login-message-container').slideUp();
                }
                
                if (!this.isDestroyed) {
                    this.isDirty = true;
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
            
            // Event listeners para los nuevos campos de mensaje
            $('#login-required-message, #schedule-not-started-message, #schedule-ended-message, #max-submissions-message, #max-submissions-limit-type').on('change input' + ns, () => {
                if (!this.isDestroyed) {
                    this.isDirty = true;
                }
            });
            
            // Event listeners para personalización de mensajes de límite
            $('#limit-submission-icon, #limit-submission-title, #limit-submission-description, #limit-submission-button-text, #limit-submission-button-url').on('change input' + ns, () => {
                if (!this.isDestroyed) {
                    this.isDirty = true;
                }
            });
            
            $('#limit-participants-icon, #limit-participants-title, #limit-participants-description, #limit-participants-button-text, #limit-participants-button-url').on('change input' + ns, () => {
                if (!this.isDestroyed) {
                    this.isDirty = true;
                }
            });
            
            $('#limit-login-icon, #limit-login-title, #limit-login-description, #limit-login-button-text').on('change input' + ns, () => {
                if (!this.isDestroyed) {
                    this.isDirty = true;
                }
            });
            
            $('#limit-schedule-icon, #limit-schedule-not-started-title, #limit-schedule-ended-title, #limit-schedule-button-text, #limit-schedule-button-url').on('change input' + ns, () => {
                if (!this.isDestroyed) {
                    this.isDirty = true;
                }
            });
            
            // Event listeners para colores de mensajes de límite
            $('#limit-background-color, #limit-border-color, #limit-icon-color, #limit-title-color, #limit-text-color, #limit-button-bg-color, #limit-button-text-color').on('change' + ns, () => {
                if (!this.isDestroyed) {
                    this.isDirty = true;
                }
            });
            
            // Event listeners para bloqueo de formulario
            $('#block-form-icon, #block-form-video-url, #block-form-title, #block-form-description, #block-form-button-text, #block-form-button-url').on('change input' + ns, () => {
                if (!this.isDestroyed) {
                    this.isDirty = true;
                }
            });
            
            // Event listeners para colores de bloqueo de formulario
            $('#block-form-bg-color, #block-form-border-color, #block-form-icon-color, #block-form-title-color, #block-form-text-color, #block-form-button-bg-color, #block-form-button-text-color, #block-form-timer-unit-bg-color, #block-form-timer-container-bg-color, #block-form-timer-container-border-color, #block-form-timer-unit-border-color, #block-form-disable-shadow').on('change' + ns, () => {
                if (!this.isDestroyed) {
                    this.isDirty = true;
                }
            });
            
            // Event listeners para timer de bloqueo
            $('#block-form-enable-timer').on('change' + ns, (e) => {
                if ($(e.target).is(':checked')) {
                    $('#block-form-timer-settings').slideDown();
                    $('#block-form-timer-available-section').slideDown();
                    // Mostrar la sección de colores del mensaje de disponibilidad (la última sección)
                    $('.sfq-message-config-section').each(function() {
                        const $section = $(this);
                        const titleText = $section.find('h4').text();
                        // Buscar específicamente la sección que NO incluye "Bloqueo" en el título
                        if (titleText.includes('🎨 Colores del Mensaje') && !titleText.includes('Bloqueo')) {
                            $section.slideDown();
                        }
                    });
                } else {
                    $('#block-form-timer-settings').slideUp();
                    $('#block-form-timer-available-section').slideUp();
                    // Ocultar la sección de colores del mensaje de disponibilidad (la última sección)
                    $('.sfq-message-config-section').each(function() {
                        const $section = $(this);
                        const titleText = $section.find('h4').text();
                        // Buscar específicamente la sección que NO incluye "Bloqueo" en el título
                        if (titleText.includes('🎨 Colores del Mensaje') && !titleText.includes('Bloqueo')) {
                            $section.slideUp();
                        }
                    });
                }
                
                if (!this.isDestroyed) {
                    this.isDirty = true;
                }
            });
            
            // Event listener para mostrar/ocultar la opción de desaparecer completamente
            $('#block-form-timer-show-form').on('change' + ns, (e) => {
                if ($(e.target).is(':checked')) {
                    $('#block-form-timer-hide-all-container').slideDown();
                } else {
                    $('#block-form-timer-hide-all-container').slideUp();
                }
                
                if (!this.isDestroyed) {
                    this.isDirty = true;
                }
            });
            
            $('#block-form-timer-date, #block-form-timer-text, #block-form-timer-opened-text, #block-form-timer-show-form, #block-form-timer-hide-all').on('change input' + ns, () => {
                if (!this.isDestroyed) {
                    this.isDirty = true;
                }
            });
            
            // Event listeners para los nuevos campos del mensaje de disponibilidad del timer
            $('#block-form-timer-available-icon, #block-form-timer-available-title, #block-form-timer-available-description, #block-form-timer-available-button-text, #block-form-timer-available-button-url').on('change input' + ns, () => {
                if (!this.isDestroyed) {
                    this.isDirty = true;
                }
            });
            
            // Event listeners para actualizar el resumen de límites
            $('#submission-limit-count, #submission-limit-period, #limit-type, #require-login, #enable-schedule, #schedule-start, #schedule-end, #enable-max-submissions, #max-submissions, #max-submissions-limit-type').on('change input' + ns, () => {
                this.updateLimitsSummary();
                if (!this.isDestroyed) {
                    this.isDirty = true;
                }
            });
            
        // ✅ NUEVO: Event listeners para imagen de fondo
        this.bindBackgroundImageEvents(ns);
        
        // ✅ NUEVO: Event listeners para opciones de imagen de fondo
        $('#background-size, #background-repeat, #background-position, #background-attachment').off('change' + ns).on('change' + ns, () => {
            if (!this.isDestroyed) {
                this.isDirty = true;
                this.updatePreviewStyles();
            }
        });
        
        // Event listener para opacidad de imagen de fondo
        $('#background-opacity').off('input' + ns).on('input' + ns, (e) => {
            $('.sfq-background-opacity-value').text($(e.target).val());
            if (!this.isDestroyed) {
                this.isDirty = true;
                this.updatePreviewStyles();
            }
        });
        
        // Event listener para checkbox de overlay
        $('#background-overlay').off('change' + ns).on('change' + ns, (e) => {
            const overlayOptions = $('#background-overlay-options');
            if ($(e.target).is(':checked')) {
                overlayOptions.slideDown(300);
            } else {
                overlayOptions.slideUp(300);
            }
            if (!this.isDestroyed) {
                this.isDirty = true;
                this.updatePreviewStyles();
            }
        });
        
        // Event listener para opacidad de overlay
        $('#background-overlay-opacity').off('input' + ns).on('input' + ns, (e) => {
            $('.sfq-background-overlay-opacity-value').text($(e.target).val());
            if (!this.isDestroyed) {
                this.isDirty = true;
                this.updatePreviewStyles();
            }
        });
        
        // Event listener para color de overlay
        $('#background-overlay-color').off('change' + ns).on('change' + ns, () => {
            if (!this.isDestroyed) {
                this.isDirty = true;
                this.updatePreviewStyles();
            }
        });
            
            // Variables globales
            $('#sfq-add-variable').off('click' + ns).on('click' + ns, () => {
                this.showVariableModal();
            });
            
            // Prevent accidental navigation
            $(window).on('beforeunload' + ns, () => {
                if (this.isDirty && !this.isDestroyed) {
                    return 'Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?';
                }
            });
        }

        initializeModules() {
            this.questionManager.init();
            this.conditionEngine.init();
            this.uiRenderer.init();
            
            // Inicializar PreviewManager si está disponible
            if (typeof PreviewManager !== 'undefined') {
                this.previewManager = new PreviewManager(this);
            }
        }

        switchTab(e) {
            const button = $(e.currentTarget);
            const tab = button.data('tab');
            
            $('.sfq-tab-button').removeClass('active');
            button.addClass('active');
            
            $('.sfq-tab-content').removeClass('active');
            $(`#tab-${tab}`).addClass('active');
        }

        async loadFormData() {
            if (!this.formId || this.formId === '0') {
                this.uiRenderer.showEmptyState();
                return;
            }
            this.uiRenderer.showLoading(true);
            
            try {
                const response = await $.ajax({
                    url: sfq_ajax.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'sfq_get_form_data',
                        nonce: sfq_ajax.nonce,
                        form_id: this.formId
                    },
                    timeout: 30000
                });
                
                if (response.success && response.data) {
                    this.populateFormData(response.data);
                    this.isDirty = false;
                } else {
                    throw new Error(response.data?.message || 'Error loading form data');
                }
            } catch (error) {
                console.error('SFQ Builder v2: Error loading form data:', error);
                this.uiRenderer.showNotice('Error al cargar el formulario: ' + error.message, 'error');
            } finally {
                this.uiRenderer.showLoading(false);
            }
        }

        populateFormData(formData) {
            // Store complete form data in state
            this.stateManager.setState('formData', formData);
            
            // General fields
            $('#form-title').val(formData.title || '');
            $('#form-description').val(formData.description || '');
            $('#form-type').val(formData.type || 'form');
            $('#intro-title').val(formData.intro_title || '');
            $('#intro-description').val(formData.intro_description || '');
            $('#intro-button-text').val(formData.intro_button_text || 'Comenzar');
            $('#thank-you-message').val(formData.thank_you_message || '');
            $('#redirect-url').val(formData.redirect_url || '');
            
            // Settings
            const settings = formData.settings || {};
            $('#show-progress-bar').prop('checked', settings.show_progress_bar !== false);
            $('#show-question-numbers').prop('checked', settings.show_question_numbers === true);
            $('#auto-advance').prop('checked', settings.auto_advance !== false);
            $('#allow-back').prop('checked', settings.allow_back === true);
            $('#randomize-questions').prop('checked', settings.randomize_questions === true);
            $('#save-partial').prop('checked', settings.save_partial === true);
            $('#show-intro-screen').prop('checked', settings.show_intro_screen !== false);
            $('#enable-floating-preview').prop('checked', settings.enable_floating_preview === true);
            $('#auto-scroll-to-form').prop('checked', settings.auto_scroll_to_form === true);
            $('#show-processing-indicator').prop('checked', settings.show_processing_indicator === true);
            $('#show-submit-loading').prop('checked', settings.show_submit_loading !== false);
            
            // Cargar configuraciones de indicadores de carga
            $('#processing-indicator-text').val(settings.processing_indicator_text || '...');
            $('#processing-indicator-opacity').val(settings.processing_indicator_opacity || '0.7');
            $('.sfq-processing-opacity-value').text(settings.processing_indicator_opacity || '0.7');
            $('#processing-indicator-bg-color').val(settings.processing_indicator_bg_color || '#ffffff').trigger('change');
            $('#processing-indicator-text-color').val(settings.processing_indicator_text_color || '#666666').trigger('change');
            $('#processing-indicator-spinner-color').val(settings.processing_indicator_spinner_color || '#007cba').trigger('change');
            $('#processing-indicator-delay').val(settings.processing_indicator_delay || '100');
            
            // Mostrar/ocultar configuraciones según el estado del checkbox
            if (settings.show_processing_indicator === true) {
                $('#processing-indicator-settings').show();
            } else {
                $('#processing-indicator-settings').hide();
            }
            
            // Bloqueo de formulario
            $('#block-form').prop('checked', settings.block_form === true).trigger('change');
            
            // ✅ NUEVO: Modo de carga segura
            $('#secure-loading').prop('checked', settings.secure_loading === true);
            
            // Show/hide intro settings
            $('#intro-screen-settings').toggle(settings.show_intro_screen !== false);
            
            // Style settings
            const styles = formData.style_settings || {};
            $('#primary-color').val(styles.primary_color || '#007cba').trigger('change');
            $('#primary-color-opacity').val(styles.primary_color_opacity || '1');
            $('.sfq-opacity-value[data-for="primary-color"]').text(styles.primary_color_opacity || '1');
            $('#secondary-color').val(styles.secondary_color || '#6c757d').trigger('change');
            $('#secondary-color-opacity').val(styles.secondary_color_opacity || '1');
            $('.sfq-opacity-value[data-for="secondary-color"]').text(styles.secondary_color_opacity || '1');
            $('#background-color').val(styles.background_color || '#ffffff').trigger('change');
            $('#background-color-opacity').val(styles.background_color_opacity || '1');
            $('.sfq-opacity-value[data-for="background-color"]').text(styles.background_color_opacity || '1');
            $('#options-background-color').val(styles.options_background_color || '#ffffff').trigger('change');
            $('#options-background-color-opacity').val(styles.options_background_color_opacity || '1');
            $('.sfq-opacity-value[data-for="options-background-color"]').text(styles.options_background_color_opacity || '1');
            $('#options-border-color').val(styles.options_border_color || '#e0e0e0').trigger('change');
            $('#options-border-color-opacity').val(styles.options_border_color_opacity || '1');
            $('.sfq-opacity-value[data-for="options-border-color"]').text(styles.options_border_color_opacity || '1');
            $('#text-color').val(styles.text_color || '#333333').trigger('change');
            $('#text-color-opacity').val(styles.text_color_opacity || '1');
            $('.sfq-opacity-value[data-for="text-color"]').text(styles.text_color_opacity || '1');
            $('#input-border-color').val(styles.input_border_color || '#ddd').trigger('change');
            $('#input-border-color-opacity').val(styles.input_border_color_opacity || '1');
            $('.sfq-opacity-value[data-for="input-border-color"]').text(styles.input_border_color_opacity || '1');
            $('#border-radius').val(styles.border_radius || '8');
            $('.sfq-range-value').text((styles.border_radius || '8') + 'px');
            $('#font-family').val(styles.font_family || 'inherit');
            
            // Nuevas opciones de estilo
            $('#form-container-border-radius').val(styles.form_container_border_radius || '20');
            $('.sfq-form-container-radius-value').text((styles.form_container_border_radius || '20') + 'px');
            $('#form-container-shadow').prop('checked', styles.form_container_shadow === false);
            $('#form-container-width').val(styles.form_container_width || 'responsive');
            $('#question-content-width').val(styles.question_content_width || 'responsive');
            $('#question-content-custom-width').val(styles.question_content_custom_width || '600');
            $('#question-text-size').val(styles.question_text_size || '24');
            $('.sfq-question-text-size-value').text((styles.question_text_size || '24') + 'px');
            $('#option-text-size').val(styles.option_text_size || '16');
            $('.sfq-option-text-size-value').text((styles.option_text_size || '16') + 'px');
            $('#question-content-min-height').val(styles.question_content_min_height || '0');
            $('.sfq-question-content-height-value').text((styles.question_content_min_height || '0') + 'px');
            $('#question-text-align').val(styles.question_text_align || 'left');
            $('#general-text-align').val(styles.general_text_align || 'left');
            
            // Color del borde de opciones
            $('#options-border-color').val(styles.options_border_color || '#e0e0e0').trigger('change');
            
            // Color del borde de inputs y estrellas
            $('#input-border-color').val(styles.input_border_color || '#ddd').trigger('change');
            
            // ✅ NUEVO: Cargar configuración de imagen de fondo con IDs correctos
            $('#background-image-url').val(styles.background_image_url || '');
            $('#background-image-id').val(styles.background_image_id || '');
            $('#background-image-data').val(styles.background_image_data || '');
            $('#background-size').val(styles.background_size || 'cover');
            $('#background-repeat').val(styles.background_repeat || 'no-repeat');
            $('#background-position').val(styles.background_position || 'center center');
            $('#background-attachment').val(styles.background_attachment || 'scroll');
            $('#background-opacity').val(styles.background_opacity || '1');
            $('.sfq-background-opacity-value').text(styles.background_opacity || '1');
            $('#background-overlay').prop('checked', styles.background_overlay === true);
            $('#background-overlay-color').val(styles.background_overlay_color || '#000000').trigger('change');
            $('#background-overlay-opacity').val(styles.background_overlay_opacity || '0.3');
            $('.sfq-background-overlay-opacity-value').text(styles.background_overlay_opacity || '0.3');
            
            // Mostrar preview si hay imagen de fondo
            if (styles.background_image_url && styles.background_image_url.trim() !== '') {
                this.updateBackgroundImagePreview(styles.background_image_url);
                $('#background-image-options').show();
                $('#select-background-image').text('Cambiar Imagen');
                $('#remove-background-image').show();
            }
            
            // Mostrar opciones de overlay si está activado
            if (styles.background_overlay === true) {
                $('#background-overlay-options').show();
            }
            
            // Cargar configuraciones de personalización de mensajes de límite
            $('#limit-submission-icon').val(styles.limit_submission_icon || '');
            $('#limit-submission-title').val(styles.limit_submission_title || '');
            $('#limit-submission-description').val(styles.limit_submission_description || '');
            $('#limit-submission-button-text').val(styles.limit_submission_button_text || '');
            $('#limit-submission-button-url').val(styles.limit_submission_button_url || '');
            $('#limit-participants-icon').val(styles.limit_participants_icon || '');
            $('#limit-participants-title').val(styles.limit_participants_title || '');
            $('#limit-participants-description').val(styles.limit_participants_description || '');
            // También cargar en el campo legacy para compatibilidad
            $('#max-submissions-message').val(styles.limit_participants_description || '');
            $('#limit-participants-button-text').val(styles.limit_participants_button_text || '');
            $('#limit-participants-button-url').val(styles.limit_participants_button_url || '');
            $('#limit-login-icon').val(styles.limit_login_icon || '');
            $('#limit-login-title').val(styles.limit_login_title || '');
            $('#limit-login-description').val(styles.limit_login_description || '');
            $('#limit-login-button-text').val(styles.limit_login_button_text || '');
            $('#limit-schedule-icon').val(styles.limit_schedule_icon || '');
            $('#limit-schedule-not-started-title').val(styles.limit_schedule_not_started_title || '');
            $('#limit-schedule-ended-title').val(styles.limit_schedule_ended_title || '');
            $('#limit-schedule-button-text').val(styles.limit_schedule_button_text || '');
            $('#limit-schedule-button-url').val(styles.limit_schedule_button_url || '');
            
            // Cargar colores de mensajes de límite
            $('#limit-background-color').val(styles.limit_background_color || '#f8f9fa').trigger('change');
            $('#limit-border-color').val(styles.limit_border_color || '#e9ecef').trigger('change');
            $('#limit-icon-color').val(styles.limit_icon_color || '#6c757d').trigger('change');
            $('#limit-title-color').val(styles.limit_title_color || '#333333').trigger('change');
            $('#limit-text-color').val(styles.limit_text_color || '#666666').trigger('change');
            $('#limit-button-bg-color').val(styles.limit_button_bg_color || '#007cba').trigger('change');
            $('#limit-button-text-color').val(styles.limit_button_text_color || '#ffffff').trigger('change');
            
            // Cargar configuraciones de bloqueo de formulario
            $('#block-form-icon').val(styles.block_form_icon || '');
            $('#block-form-video-url').val(styles.block_form_video_url || '');
            $('#block-form-title').val(styles.block_form_title || '');
            $('#block-form-description').val(styles.block_form_description || '');
            $('#block-form-button-text').val(styles.block_form_button_text || '');
            $('#block-form-button-url').val(styles.block_form_button_url || '');
            
            // Cargar configuraciones del timer de bloqueo
            $('#block-form-enable-timer').prop('checked', styles.block_form_enable_timer === true).trigger('change');
            $('#block-form-timer-date').val(styles.block_form_timer_date || '');
            $('#block-form-timer-text').val(styles.block_form_timer_text || '');
            $('#block-form-timer-opened-text').val(styles.block_form_timer_opened_text || '');
            $('#block-form-timer-show-form').prop('checked', styles.block_form_timer_show_form === true).trigger('change');
            $('#block-form-timer-hide-all').prop('checked', styles.block_form_timer_hide_all === true);
            
            // Cargar configuraciones del mensaje de disponibilidad del timer
            $('#block-form-timer-available-icon').val(styles.block_form_timer_available_icon || '');
            $('#block-form-timer-available-title').val(styles.block_form_timer_available_title || '');
            $('#block-form-timer-available-description').val(styles.block_form_timer_available_description || '');
            $('#block-form-timer-available-button-text').val(styles.block_form_timer_available_button_text || '');
            $('#block-form-timer-available-button-url').val(styles.block_form_timer_available_button_url || '');
            
            // Cargar colores del mensaje de disponibilidad del timer
            $('#block-form-timer-available-bg-color').val(styles.block_form_timer_available_bg_color || '#f8f9fa').trigger('change');
            $('#block-form-timer-available-border-color').val(styles.block_form_timer_available_border_color || '#e9ecef').trigger('change');
            $('#block-form-timer-available-icon-color').val(styles.block_form_timer_available_icon_color || '#28a745').trigger('change');
            $('#block-form-timer-available-title-color').val(styles.block_form_timer_available_title_color || '#28a745').trigger('change');
            $('#block-form-timer-available-text-color').val(styles.block_form_timer_available_text_color || '#666666').trigger('change');
            $('#block-form-timer-available-button-bg-color').val(styles.block_form_timer_available_button_bg_color || '#28a745').trigger('change');
            $('#block-form-timer-available-button-text-color').val(styles.block_form_timer_available_button_text_color || '#ffffff').trigger('change');
            
            // Cargar colores específicos de bloqueo de formulario
            $('#block-form-bg-color').val(styles.block_form_bg_color || '#f8f9fa').trigger('change');
            $('#block-form-border-color').val(styles.block_form_border_color || '#e9ecef').trigger('change');
            $('#block-form-icon-color').val(styles.block_form_icon_color || '#dc3545').trigger('change');
            $('#block-form-title-color').val(styles.block_form_title_color || '#333333').trigger('change');
            $('#block-form-text-color').val(styles.block_form_text_color || '#666666').trigger('change');
            $('#block-form-button-bg-color').val(styles.block_form_button_bg_color || '#007cba').trigger('change');
            $('#block-form-button-text-color').val(styles.block_form_button_text_color || '#ffffff').trigger('change');
            $('#block-form-timer-unit-bg-color').val(styles.block_form_timer_unit_bg_color || '#ffffff').trigger('change');
            $('#block-form-timer-container-bg-color').val(styles.block_form_timer_container_bg_color || '#f8f9fa').trigger('change');
            $('#block-form-timer-container-border-color').val(styles.block_form_timer_container_border_color || '#e9ecef').trigger('change');
            $('#block-form-timer-unit-border-color').val(styles.block_form_timer_unit_border_color || '#e9ecef').trigger('change');
            $('#block-form-disable-shadow').prop('checked', styles.block_form_disable_shadow === true);
            
            // Load limits settings - nueva estructura flexible
            $('#submission-limit-count').val(settings.submission_limit_count || '');
            $('#submission-limit-period').val(settings.submission_limit_period || 'no_limit');
            $('#limit-type').val(settings.limit_type || 'session_id');
            $('#limit-message').val(settings.limit_message || '');
            $('#require-login').prop('checked', settings.require_login === true).trigger('change');
            $('#login-required-message').val(settings.login_required_message || '');
            $('#enable-schedule').prop('checked', settings.enable_schedule === true).trigger('change');
            $('#schedule-start').val(settings.schedule_start || '');
            $('#schedule-end').val(settings.schedule_end || '');
            $('#schedule-not-started-message').val(settings.schedule_not_started_message || '');
            $('#schedule-ended-message').val(settings.schedule_ended_message || '');
            $('#enable-max-submissions').prop('checked', settings.enable_max_submissions === true).trigger('change');
            $('#max-submissions').val(settings.max_submissions || '');
            $('#max-submissions-limit-type').val(settings.max_submissions_limit_type || 'session_id');
            $('#max-submissions-message').val(settings.max_submissions_message || '');
            
            // Mostrar/ocultar campos según la configuración cargada
            const hasCount = settings.submission_limit_count && settings.submission_limit_count > 0;
            const period = settings.submission_limit_period || 'no_limit';
            if (hasCount && period !== 'no_limit') {
                $('#limit-type-container, #limit-message-container').show();
            } else {
                $('#limit-type-container, #limit-message-container').hide();
            }
            
            // Load questions
            if (formData.questions && Array.isArray(formData.questions)) {
                this.questionManager.loadQuestions(formData.questions);
            }
            
            // Actualizar resumen de límites después de cargar los datos
            this.updateLimitsSummary();
            
            // CRÍTICO: Renderizar variables globales después de cargar los datos
            this.renderVariables();
        }

        // Crear versión con debounce del saveForm
        saveFormDebounced() {
            if (!this._saveFormDebounced) {
                this._saveFormDebounced = this.debounce(() => this.saveForm(), 500);
            }
            this._saveFormDebounced();
        }
        
        async saveForm() {
            // Prevent saves if destroyed
            if (this.isDestroyed) {
                return;
            }
            
            // Prevent duplicate saves
            if (this.isSaving) {
                return Promise.resolve();
            }
            
            // Validate
            if (!$('#form-title').val()) {
                this.uiRenderer.showNotice('Por favor, introduce un título para el formulario', 'error');
                return Promise.resolve();
            }
            
            // Set saving flag
            this.isSaving = true;
            
            // Show saving state
            const $saveBtn = $('#sfq-save-form');
            const originalText = $saveBtn.html();
            $saveBtn.prop('disabled', true).html('<span class="sfq-loading-spinner"></span> Guardando...');
            
            // Collect form data
            const formData = this.collectFormData();
            
            // Debug: Log form data being sent to server
            console.log('SFQ: === SAVING FORM DATA ===');
            console.log('SFQ: Questions data being sent:', formData.questions);
            formData.questions.forEach((question, index) => {
                console.log(`SFQ: Question ${index + 1} conditions:`, question.conditions);
            });
            console.log('SFQ: === END FORM DATA ===');
            
            try {
                const response = await $.ajax({
                    url: sfq_ajax.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'sfq_save_form',
                        nonce: sfq_ajax.nonce,
                        form_data: JSON.stringify(formData)
                    },
                    timeout: 30000
                });
                
                if (response.success) {
                    this.formId = response.data.form_id;
                    $('#sfq-form-id').val(this.formId);
                    this.isDirty = false;
                    
                    // Update URL if new form
                    if (window.history && window.history.pushState) {
                        const newUrl = window.location.pathname + '?page=sfq-new-form&form_id=' + this.formId;
                        window.history.pushState({}, '', newUrl);
                    }
                    
                    this.uiRenderer.showNotice('Formulario guardado correctamente', 'success');
                } else {
                    throw new Error(response.data?.message || 'Error al guardar');
                }
            } catch (error) {
                console.error('SFQ Builder v2: Save error:', error);
                this.uiRenderer.showNotice('Error al guardar: ' + error.message, 'error');
            } finally {
                this.isSaving = false; // Reset saving flag
                $saveBtn.prop('disabled', false).html(originalText);
            }
        }

    collectFormData() {
        return {
            id: this.formId,
            title: $('#form-title').val(),
            description: $('#form-description').val(),
            type: $('#form-type').val() || 'form',
            intro_title: $('#intro-title').val(),
            intro_description: $('#intro-description').val(),
            intro_button_text: $('#intro-button-text').val() || 'Comenzar',
            thank_you_message: $('#thank-you-message').val(),
            redirect_url: $('#redirect-url').val(),
            settings: {
                show_progress_bar: $('#show-progress-bar').is(':checked'),
                show_question_numbers: $('#show-question-numbers').is(':checked'),
                auto_advance: $('#auto-advance').is(':checked'),
                allow_back: $('#allow-back').is(':checked'),
                randomize_questions: $('#randomize-questions').is(':checked'),
                save_partial: $('#save-partial').is(':checked'),
                show_intro_screen: $('#show-intro-screen').is(':checked'),
                enable_floating_preview: $('#enable-floating-preview').is(':checked'),
                auto_scroll_to_form: $('#auto-scroll-to-form').is(':checked'),
                show_processing_indicator: $('#show-processing-indicator').is(':checked'),
                show_submit_loading: $('#show-submit-loading').is(':checked'),
                processing_indicator_text: $('#processing-indicator-text').val() || '...',
                processing_indicator_opacity: $('#processing-indicator-opacity').val() || '0.7',
                processing_indicator_bg_color: $('#processing-indicator-bg-color').val() || '#ffffff',
                processing_indicator_text_color: $('#processing-indicator-text-color').val() || '#666666',
                processing_indicator_spinner_color: $('#processing-indicator-spinner-color').val() || '#007cba',
                processing_indicator_delay: $('#processing-indicator-delay').val() || '100',
                // Bloqueo de formulario
                block_form: $('#block-form').is(':checked'),
                // ✅ NUEVO: Modo de carga segura
                secure_loading: $('#secure-loading').is(':checked'),
                // Límites de envío - nueva estructura flexible
                submission_limit_count: $('#submission-limit-count').val() || '',
                submission_limit_period: $('#submission-limit-period').val() || 'no_limit',
                limit_type: $('#limit-type').val() || 'session_id',
                limit_message: $('#limit-message').val() || '',
                require_login: $('#require-login').is(':checked'),
                login_required_message: $('#login-required-message').val() || '',
                enable_schedule: $('#enable-schedule').is(':checked'),
                schedule_start: $('#schedule-start').val() || '',
                schedule_end: $('#schedule-end').val() || '',
                schedule_not_started_message: $('#schedule-not-started-message').val() || '',
                schedule_ended_message: $('#schedule-ended-message').val() || '',
                enable_max_submissions: $('#enable-max-submissions').is(':checked'),
                max_submissions: $('#max-submissions').val() || '',
                max_submissions_limit_type: $('#max-submissions-limit-type').val() || 'session_id',
                max_submissions_message: $('#max-submissions-message').val() || ''
            },
            style_settings: {
                primary_color: $('#primary-color').val() || '#007cba',
                primary_color_opacity: $('#primary-color-opacity').val() || '1',
                secondary_color: $('#secondary-color').val() || '#6c757d',
                secondary_color_opacity: $('#secondary-color-opacity').val() || '1',
                background_color: $('#background-color').val() || '#ffffff',
                background_color_opacity: $('#background-color-opacity').val() || '1',
                options_background_color: $('#options-background-color').val() || '#ffffff',
                options_background_color_opacity: $('#options-background-color-opacity').val() || '1',
                options_border_color: $('#options-border-color').val() || '#e0e0e0',
                options_border_color_opacity: $('#options-border-color-opacity').val() || '1',
                text_color: $('#text-color').val() || '#333333',
                text_color_opacity: $('#text-color-opacity').val() || '1',
                input_border_color: $('#input-border-color').val() || '#ddd',
                input_border_color_opacity: $('#input-border-color-opacity').val() || '1',
                border_radius: $('#border-radius').val() || '8',
                font_family: $('#font-family').val() || 'inherit',
                // Nuevas opciones de estilo
                form_container_border_radius: $('#form-container-border-radius').val() || '20',
                form_container_shadow: $('#form-container-shadow').is(':checked'),
                form_container_width: $('#form-container-width').val() || 'responsive',
                form_container_custom_width: $('#form-container-custom-width').val() || '720',
                question_content_width: $('#question-content-width').val() || 'responsive',
                question_content_custom_width: $('#question-content-custom-width').val() || '600',
                question_text_size: $('#question-text-size').val() || '24',
                option_text_size: $('#option-text-size').val() || '16',
                question_content_min_height: $('#question-content-min-height').val() || '0',
                question_text_align: $('#question-text-align').val() || 'left',
                general_text_align: $('#general-text-align').val() || 'left',
                options_border_color: $('#options-border-color').val() || '#e0e0e0',
                input_border_color: $('#input-border-color').val() || '#ddd',
                // ✅ NUEVO: Configuración de imagen de fondo con logging detallado
                background_image_url: (() => {
                    const value = $('#background-image-url').val() || '';
                    console.log('SFQ: Collecting background_image_url:', value);
                    return value;
                })(),
                background_image_id: (() => {
                    const value = $('#background-image-id').val() || '';
                    console.log('SFQ: Collecting background_image_id:', value);
                    return value;
                })(),
                background_image_data: (() => {
                    const value = $('#background-image-data').val() || '';
                    console.log('SFQ: Collecting background_image_data:', value);
                    return value;
                })(),
                background_size: $('#background-size').val() || 'cover',
                background_repeat: $('#background-repeat').val() || 'no-repeat',
                background_position: $('#background-position').val() || 'center center',
                background_attachment: $('#background-attachment').val() || 'scroll',
                background_opacity: $('#background-opacity').val() || '1',
                background_overlay: $('#background-overlay').is(':checked'),
                background_overlay_color: $('#background-overlay-color').val() || '#000000',
                background_overlay_opacity: $('#background-overlay-opacity').val() || '0.3',
                // Personalización de mensajes de límite
                limit_submission_icon: $('#limit-submission-icon').val() || '',
                limit_submission_title: $('#limit-submission-title').val() || '',
                limit_submission_description: $('#limit-submission-description').val() || '',
                limit_submission_button_text: $('#limit-submission-button-text').val() || '',
                limit_submission_button_url: $('#limit-submission-button-url').val() || '',
                limit_participants_icon: $('#limit-participants-icon').val() || '',
                limit_participants_title: $('#limit-participants-title').val() || '',
                limit_participants_description: $('#limit-participants-description').val() || '',
                limit_participants_button_text: $('#limit-participants-button-text').val() || '',
                limit_participants_button_url: $('#limit-participants-button-url').val() || '',
                limit_login_icon: $('#limit-login-icon').val() || '',
                limit_login_title: $('#limit-login-title').val() || '',
                limit_login_description: $('#limit-login-description').val() || '',
                limit_login_button_text: $('#limit-login-button-text').val() || '',
                limit_schedule_icon: $('#limit-schedule-icon').val() || '',
                limit_schedule_not_started_title: $('#limit-schedule-not-started-title').val() || '',
                limit_schedule_ended_title: $('#limit-schedule-ended-title').val() || '',
                limit_schedule_button_text: $('#limit-schedule-button-text').val() || '',
                limit_schedule_button_url: $('#limit-schedule-button-url').val() || '',
                // Colores de mensajes de límite
                limit_background_color: $('#limit-background-color').val() || '#f8f9fa',
                limit_border_color: $('#limit-border-color').val() || '#e9ecef',
                limit_icon_color: $('#limit-icon-color').val() || '#6c757d',
                limit_title_color: $('#limit-title-color').val() || '#333333',
                limit_text_color: $('#limit-text-color').val() || '#666666',
                limit_button_bg_color: $('#limit-button-bg-color').val() || '#007cba',
                limit_button_text_color: $('#limit-button-text-color').val() || '#ffffff',
                // Configuración de bloqueo de formulario
                block_form_icon: $('#block-form-icon').val() || '',
                block_form_video_url: $('#block-form-video-url').val() || '',
                block_form_title: $('#block-form-title').val() || '',
                block_form_description: $('#block-form-description').val() || '',
                block_form_button_text: $('#block-form-button-text').val() || '',
                block_form_button_url: $('#block-form-button-url').val() || '',
                // Configuración del timer de bloqueo
                block_form_enable_timer: $('#block-form-enable-timer').is(':checked'),
                block_form_timer_date: $('#block-form-timer-date').val() || '',
                block_form_timer_text: $('#block-form-timer-text').val() || '',
                block_form_timer_opened_text: $('#block-form-timer-opened-text').val() || '',
                block_form_timer_show_form: $('#block-form-timer-show-form').is(':checked'),
                block_form_timer_hide_all: $('#block-form-timer-hide-all').is(':checked'),
                // Configuración del mensaje de disponibilidad del timer
                block_form_timer_available_icon: $('#block-form-timer-available-icon').val() || '',
                block_form_timer_available_title: $('#block-form-timer-available-title').val() || '',
                block_form_timer_available_description: $('#block-form-timer-available-description').val() || '',
                block_form_timer_available_button_text: $('#block-form-timer-available-button-text').val() || '',
                block_form_timer_available_button_url: $('#block-form-timer-available-button-url').val() || '',
                // Colores del mensaje de disponibilidad del timer
                block_form_timer_available_bg_color: $('#block-form-timer-available-bg-color').val() || '#f8f9fa',
                block_form_timer_available_border_color: $('#block-form-timer-available-border-color').val() || '#e9ecef',
                block_form_timer_available_icon_color: $('#block-form-timer-available-icon-color').val() || '#28a745',
                block_form_timer_available_title_color: $('#block-form-timer-available-title-color').val() || '#28a745',
                block_form_timer_available_text_color: $('#block-form-timer-available-text-color').val() || '#666666',
                block_form_timer_available_button_bg_color: $('#block-form-timer-available-button-bg-color').val() || '#28a745',
                block_form_timer_available_button_text_color: $('#block-form-timer-available-button-text-color').val() || '#ffffff',
                // Colores específicos de bloqueo de formulario
                block_form_bg_color: $('#block-form-bg-color').val() || '#f8f9fa',
                block_form_border_color: $('#block-form-border-color').val() || '#e9ecef',
                block_form_icon_color: $('#block-form-icon-color').val() || '#dc3545',
                block_form_title_color: $('#block-form-title-color').val() || '#333333',
                block_form_text_color: $('#block-form-text-color').val() || '#666666',
                block_form_button_bg_color: $('#block-form-button-bg-color').val() || '#007cba',
                block_form_button_text_color: $('#block-form-button-text-color').val() || '#ffffff',
                block_form_timer_unit_bg_color: $('#block-form-timer-unit-bg-color').val() || '#ffffff',
                block_form_timer_container_bg_color: $('#block-form-timer-container-bg-color').val() || '#f8f9fa',
                block_form_timer_container_border_color: $('#block-form-timer-container-border-color').val() || '#e9ecef',
                block_form_timer_unit_border_color: $('#block-form-timer-unit-border-color').val() || '#e9ecef',
                block_form_disable_shadow: $('#block-form-disable-shadow').is(':checked')
            },
            questions: this.questionManager.getQuestionsData(),
            global_variables: this.getGlobalVariables()
        };
    }

        setupAutoSave() {
            // Auto-save every 30 seconds if there are changes
            this.autoSaveInterval = setInterval(() => {
                if (this.isDirty && this.formId && !this.isSaving && !this.isDestroyed) {
                    this.saveForm();
                }
            }, 30000);
        }

        async showPreview() {
            // Save before preview only if not already saving
            if (!this.isSaving && !this.isDestroyed) {
                await this.saveForm();
            }
            
            const previewUrl = window.location.origin + '/?sfq_preview=' + this.formId;
            $('#sfq-preview-iframe').attr('src', previewUrl);
            $('.sfq-builder-preview').addClass('active');
            
            // Close preview handler with namespace
            const ns = '.' + this.instanceId;
            $('.sfq-close-preview').off('click' + ns).on('click' + ns, () => {
                $('.sfq-builder-preview').removeClass('active');
                $('#sfq-preview-iframe').attr('src', '');
            });
        }

        toggleMainArea() {
            const $mainArea = $('.sfq-builder-main');
            const $toggleButton = $('#sfq-toggle-main');
            const $icon = $toggleButton.find('.dashicons');
            
            if ($mainArea.hasClass('collapsed')) {
                // Expandir
                $mainArea.removeClass('collapsed');
                $icon.removeClass('dashicons-arrow-down-alt2').addClass('dashicons-arrow-up-alt2');
                $toggleButton.attr('title', 'Plegar área principal');
            } else {
                // Colapsar
                $mainArea.addClass('collapsed');
                $icon.removeClass('dashicons-arrow-up-alt2').addClass('dashicons-arrow-down-alt2');
                $toggleButton.attr('title', 'Desplegar área principal');
            }
        }

        initColorPickers() {
            if ($.fn.wpColorPicker) {
                const self = this;
                $('.sfq-color-picker').each(function() {
                    $(this).wpColorPicker({
                        change: function(event, ui) {
                            self.isDirty = true;
                            
                            // CRÍTICO: Llamar a updatePreviewStyles para actualización en tiempo real
                            self.updatePreviewStyles();
                            
                            // Disparar evento personalizado para el PreviewManager
                            $(this).trigger('wpcolorpickerchange');
                        },
                        clear: function() {
                            self.isDirty = true;
                            
                            // CRÍTICO: Llamar a updatePreviewStyles para actualización en tiempo real
                            self.updatePreviewStyles();
                            
                            // Disparar evento personalizado para el PreviewManager
                            $(this).trigger('wpcolorpickerchange');
                        }
                    });
                });
            }
        }

        destroy() {
            this.isDestroyed = true;
            
            // Clear auto-save interval
            if (this.autoSaveInterval) {
                clearInterval(this.autoSaveInterval);
                this.autoSaveInterval = null;
            }
            
            // Unbind all events with this instance's namespace
            const ns = '.' + this.instanceId;
            $('.sfq-tab-button').off(ns);
            $('#sfq-save-form').off(ns);
            $('#sfq-preview-form').off(ns);
            $('#form-title, #form-description, #form-type').off(ns);
            $('.sfq-tab-content input[type="checkbox"]').off(ns);
            $('#show-intro-screen').off(ns);
            $('#border-radius').off(ns);
            $(window).off(ns);
            $('.sfq-close-preview').off(ns);
            
            // Destroy modules
            if (this.questionManager) {
                this.questionManager.destroy();
            }
            if (this.conditionEngine) {
                this.conditionEngine.destroy();
            }
            if (this.previewManager) {
                this.previewManager.destroy();
            }
            
            // Clear references
            this.stateManager = null;
            this.questionManager = null;
            this.conditionEngine = null;
            this.uiRenderer = null;
            this.dataValidator = null;
            this.previewManager = null;
        }
        
        // Actualizar resumen dinámico de límites
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
        
        // Utility function for debouncing
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func.apply(this, args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
        
        // Variables globales
        showVariableModal(variableData = null) {
            const isEdit = variableData !== null;
            const modalHtml = `
                <div class="sfq-variable-modal">
                    <div class="sfq-variable-modal-content">
                        <div class="sfq-variable-modal-header">
                            <h3>${isEdit ? '✏️ Editar Variable' : '➕ Añadir Variable Global'}</h3>
                            <button class="sfq-variable-modal-close" type="button">&times;</button>
                        </div>
                        
                        <div class="sfq-variable-modal-body">
                            <div class="sfq-variable-form-group">
                                <label>Nombre de la variable</label>
                                <input type="text" id="sfq-variable-name" class="sfq-variable-input" 
                                       value="${isEdit ? this.escapeHtml(variableData.name) : ''}"
                                       placeholder="Ej: puntos_total, categoria_usuario">
                                <small>Solo letras, números y guiones bajos. Sin espacios.</small>
                            </div>
                            
                            <div class="sfq-variable-form-group">
                                <label>Descripción</label>
                                <textarea id="sfq-variable-description" class="sfq-variable-textarea" rows="3"
                                          placeholder="Describe para qué se usa esta variable">${isEdit ? this.escapeHtml(variableData.description) : ''}</textarea>
                            </div>
                            
                            <div class="sfq-variable-form-group">
                                <label>Tipo de variable</label>
                                <select id="sfq-variable-type" class="sfq-variable-select">
                                    <option value="number" ${isEdit && variableData.type === 'number' ? 'selected' : ''}>Número</option>
                                    <option value="text" ${isEdit && variableData.type === 'text' ? 'selected' : ''}>Texto</option>
                                    <option value="boolean" ${isEdit && variableData.type === 'boolean' ? 'selected' : ''}>Verdadero/Falso</option>
                                </select>
                            </div>
                            
                            <div class="sfq-variable-form-group">
                                <label>Valor inicial</label>
                                <input type="text" id="sfq-variable-initial-value" class="sfq-variable-input"
                                       value="${isEdit ? this.escapeHtml(variableData.initial_value) : '0'}"
                                       placeholder="Valor por defecto al iniciar el formulario">
                                <small>Para números usa 0, para texto deja vacío, para boolean usa true o false</small>
                            </div>
                        </div>
                        
                        <div class="sfq-variable-modal-footer">
                            <button type="button" class="button button-secondary sfq-variable-cancel">Cancelar</button>
                            <button type="button" class="button button-primary sfq-variable-save">
                                ${isEdit ? 'Actualizar Variable' : 'Crear Variable'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            // Añadir modal al DOM
            $('body').append(modalHtml);
            
            // Bind events
            this.bindVariableModalEvents(isEdit, variableData);
        }
        
        bindVariableModalEvents(isEdit, variableData) {
            const self = this;
            
            // Cerrar modal
            $('.sfq-variable-modal-close, .sfq-variable-cancel').on('click', function() {
                $('.sfq-variable-modal').fadeOut(300, function() {
                    $(this).remove();
                });
            });
            
            // Cerrar al hacer clic fuera
            $('.sfq-variable-modal').on('click', function(e) {
                if (e.target === this) {
                    $(this).fadeOut(300, function() {
                        $(this).remove();
                    });
                }
            });
            
            // Validación en tiempo real del nombre
            $('#sfq-variable-name').on('input', function() {
                const value = $(this).val();
                const isValid = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value);
                
                if (value && !isValid) {
                    $(this).css('border-color', '#dc3232');
                    $(this).siblings('small').text('Solo letras, números y guiones bajos. Debe empezar con letra o guión bajo.').css('color', '#dc3232');
                } else {
                    $(this).css('border-color', '');
                    $(this).siblings('small').text('Solo letras, números y guiones bajos. Sin espacios.').css('color', '');
                }
            });
            
            // Cambio de tipo de variable
            $('#sfq-variable-type').on('change', function() {
                const type = $(this).val();
                const $initialValue = $('#sfq-variable-initial-value');
                
                switch (type) {
                    case 'number':
                        $initialValue.attr('placeholder', '0').val(isEdit ? variableData?.initial_value : '0');
                        $initialValue.siblings('small').text('Valor numérico inicial (ej: 0, 100, -5)');
                        break;
                    case 'text':
                        $initialValue.attr('placeholder', 'Texto inicial').val(isEdit ? variableData?.initial_value : '');
                        $initialValue.siblings('small').text('Texto inicial (puede estar vacío)');
                        break;
                    case 'boolean':
                        $initialValue.attr('placeholder', 'true o false').val(isEdit ? variableData?.initial_value : 'false');
                        $initialValue.siblings('small').text('true (verdadero) o false (falso)');
                        break;
                }
            });
            
            // Guardar variable
            $('.sfq-variable-save').on('click', function() {
                const name = $('#sfq-variable-name').val().trim();
                const description = $('#sfq-variable-description').val().trim();
                const type = $('#sfq-variable-type').val();
                const initialValue = $('#sfq-variable-initial-value').val().trim();
                
                // Validaciones
                if (!name) {
                    alert('El nombre de la variable es obligatorio');
                    return;
                }
                
                if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
                    alert('El nombre de la variable solo puede contener letras, números y guiones bajos, y debe empezar con letra o guión bajo');
                    return;
                }
                
                if (!description) {
                    alert('La descripción es obligatoria');
                    return;
                }
                
                // Validar valor inicial según tipo
                if (type === 'number' && initialValue && isNaN(initialValue)) {
                    alert('El valor inicial debe ser un número válido');
                    return;
                }
                
                if (type === 'boolean' && initialValue && !['true', 'false'].includes(initialValue.toLowerCase())) {
                    alert('El valor inicial para boolean debe ser "true" o "false"');
                    return;
                }
                
                // Verificar que no existe otra variable con el mismo nombre (solo en modo crear)
                if (!isEdit && self.variableExists(name)) {
                    alert('Ya existe una variable con ese nombre');
                    return;
                }
                
                // Crear/actualizar variable
                const variable = {
                    id: isEdit ? variableData.id : 'var_' + Date.now(),
                    name: name,
                    description: description,
                    type: type,
                    initial_value: initialValue || (type === 'number' ? '0' : type === 'boolean' ? 'false' : '')
                };
                
                if (isEdit) {
                    self.updateVariable(variable);
                } else {
                    self.addVariable(variable);
                }
                
                // Cerrar modal
                $('.sfq-variable-modal').fadeOut(300, function() {
                    $(this).remove();
                });
            });
        }
        
        variableExists(name) {
            const variables = this.getGlobalVariables();
            return variables.some(v => v.name === name);
        }
        
        addVariable(variable) {
            let variables = this.getGlobalVariables();
            variables.push(variable);
            this.saveGlobalVariables(variables);
            this.renderVariables();
            this.isDirty = true;
        }
        
        updateVariable(variable) {
            let variables = this.getGlobalVariables();
            const index = variables.findIndex(v => v.id === variable.id);
            if (index !== -1) {
                variables[index] = variable;
                this.saveGlobalVariables(variables);
                this.renderVariables();
                this.isDirty = true;
            }
        }
        
        deleteVariable(variableId) {
            if (!confirm('¿Estás seguro de eliminar esta variable? Esta acción no se puede deshacer.')) {
                return;
            }
            
            let variables = this.getGlobalVariables();
            variables = variables.filter(v => v.id !== variableId);
            this.saveGlobalVariables(variables);
            this.renderVariables();
            this.isDirty = true;
        }
        
        getGlobalVariables() {
            const formData = this.stateManager.getState('formData');
            return formData?.global_variables || [];
        }
        
        saveGlobalVariables(variables) {
            const formData = this.stateManager.getState('formData') || {};
            formData.global_variables = variables;
            this.stateManager.setState('formData', formData);
        }
        
        renderVariables() {
            console.log('SFQ: === RENDERING VARIABLES ===');
            
            const variables = this.getGlobalVariables();
            console.log('SFQ: Variables to render:', variables);
            
            const $container = $('#sfq-global-variables-list');
            
            if (!$container.length) {
                console.warn('SFQ: Variables container #sfq-global-variables-list not found');
                return;
            }
            
            if (variables.length === 0) {
                console.log('SFQ: No variables found, showing empty state');
                $container.html(`
                    <div class="sfq-variables-empty">
                        <span class="dashicons dashicons-admin-settings"></span>
                        <p>No hay variables globales creadas</p>
                        <p>Las variables te permiten crear lógica avanzada en tus formularios</p>
                    </div>
                `);
                return;
            }
            
            console.log('SFQ: Rendering', variables.length, 'variables');
            const variablesHtml = variables.map(variable => this.renderVariable(variable)).join('');
            $container.html(variablesHtml);
            
            // Bind events para cada variable
            this.bindVariableEvents();
            
            console.log('SFQ: Variables rendered successfully');
        }
        
        renderVariable(variable) {
            const typeIcons = {
                'number': '🔢',
                'text': '📝',
                'boolean': '☑️'
            };
            
            const typeNames = {
                'number': 'Número',
                'text': 'Texto',
                'boolean': 'Verdadero/Falso'
            };
            
            return `
                <div class="sfq-variable-item" data-variable-id="${variable.id}">
                    <div class="sfq-variable-icon">
                        ${typeIcons[variable.type] || '🔢'}
                    </div>
                    <div class="sfq-variable-content">
                        <div class="sfq-variable-name">${this.escapeHtml(variable.name)}</div>
                        <div class="sfq-variable-description">
                            ${this.escapeHtml(variable.description)} 
                            <span style="color: #999; font-size: 11px;">(${typeNames[variable.type]})</span>
                        </div>
                    </div>
                    <div class="sfq-variable-value">
                        ${this.escapeHtml(variable.initial_value)}
                    </div>
                    <div class="sfq-variable-actions">
                        <button class="sfq-variable-action edit" type="button" title="Editar variable">
                            <span class="dashicons dashicons-edit"></span>
                        </button>
                        <button class="sfq-variable-action delete" type="button" title="Eliminar variable">
                            <span class="dashicons dashicons-trash"></span>
                        </button>
                    </div>
                </div>
            `;
        }
        
        bindVariableEvents() {
            const self = this;
            
            // Editar variable
            $('.sfq-variable-action.edit').off('click').on('click', function() {
                const $item = $(this).closest('.sfq-variable-item');
                const variableId = $item.data('variable-id');
                const variables = self.getGlobalVariables();
                const variable = variables.find(v => v.id === variableId);
                
                if (variable) {
                    self.showVariableModal(variable);
                }
            });
            
            // Eliminar variable
            $('.sfq-variable-action.delete').off('click').on('click', function() {
                const $item = $(this).closest('.sfq-variable-item');
                const variableId = $item.data('variable-id');
                self.deleteVariable(variableId);
            });
        }
        
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
        
        // ✅ CORREGIDO: Bind events para imagen de fondo con IDs correctos
        bindBackgroundImageEvents(ns) {
            const self = this;
            
            // Botón para seleccionar imagen de fondo - CORREGIDO ID
            $('#select-background-image').off('click' + ns).on('click' + ns, function(e) {
                e.preventDefault();
                self.openBackgroundImageSelector();
            });
            
            // Input URL manual para imagen de fondo
            $('#background-image-url').off('input' + ns).on('input' + ns, function() {
                const url = $(this).val().trim();
                if (url && self.isValidImageUrl(url)) {
                    self.updateBackgroundImagePreview(url);
                    $(this).removeClass('invalid').addClass('valid');
                    // Mostrar opciones de imagen de fondo
                    $('#background-image-options').slideDown(300);
                } else if (url) {
                    $(this).removeClass('valid').addClass('invalid');
                    self.hideBackgroundImagePreview();
                } else {
                    $(this).removeClass('valid invalid');
                    self.hideBackgroundImagePreview();
                }
                
                if (!self.isDestroyed) {
                    self.isDirty = true;
                    self.updatePreviewStyles();
                }
            });
            
            // Botón para eliminar imagen de fondo - CORREGIDO ID
            $('#remove-background-image').off('click' + ns).on('click' + ns, function(e) {
                e.preventDefault();
                self.removeBackgroundImage();
            });
            
            // Event listeners para opciones de imagen de fondo - CORREGIDOS IDs
            $('#background-size, #background-repeat, #background-position, #background-attachment').off('change' + ns).on('change' + ns, () => {
                if (!self.isDestroyed) {
                    self.isDirty = true;
                    self.updatePreviewStyles();
                }
            });
            
            // Event listener para opacidad de imagen de fondo
            $('#background-opacity').off('input' + ns).on('input' + ns, (e) => {
                $('.sfq-background-opacity-value').text($(e.target).val());
                if (!self.isDestroyed) {
                    self.isDirty = true;
                    self.updatePreviewStyles();
                }
            });
            
            // Event listener para checkbox de overlay
            $('#background-overlay').off('change' + ns).on('change' + ns, (e) => {
                const overlayOptions = $('#background-overlay-options');
                if ($(e.target).is(':checked')) {
                    overlayOptions.slideDown(300);
                } else {
                    overlayOptions.slideUp(300);
                }
                if (!self.isDestroyed) {
                    self.isDirty = true;
                    self.updatePreviewStyles();
                }
            });
            
            // Event listener para opacidad de overlay
            $('#background-overlay-opacity').off('input' + ns).on('input' + ns, (e) => {
                $('.sfq-background-overlay-opacity-value').text($(e.target).val());
                if (!self.isDestroyed) {
                    self.isDirty = true;
                    self.updatePreviewStyles();
                }
            });
            
            // Event listener para color de overlay
            $('#background-overlay-color').off('change' + ns).on('change' + ns, () => {
                if (!self.isDestroyed) {
                    self.isDirty = true;
                    self.updatePreviewStyles();
                }
            });
        }
        
         // ✅ NUEVO: Abrir selector de imagen de fondo
       openBackgroundImageSelector() {
    if (typeof wp === 'undefined' || !wp.media) {
        alert('Error: WordPress Media Library no está disponible.');
        return;
    }

    // Crear la instancia una sola vez y guardarla en la clase
    if (!this.mediaUploader) {
        this.mediaUploader = wp.media({
            title: 'Seleccionar Imagen de Fondo',
            button: { text: 'Usar esta imagen' },
            multiple: false,
            library: { type: 'image' }
        });

        this.mediaUploader.on('select', () => {
            const attachment = this.mediaUploader.state().get('selection').first().toJSON();
            console.log('Selected background:', attachment);

            if (!this.isValidImageAttachment(attachment)) {
                alert('Error: El archivo seleccionado no es una imagen válida');
                return;
            }

            this.setBackgroundImage(attachment);

            this.mediaUploader.close();
           
        });
    }
 // limpiar selección para la próxima vez
           
    this.mediaUploader.open();
}
        



        
        // ✅ NUEVO: Validar attachment de imagen
        isValidImageAttachment(attachment) {
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
            return validTypes.includes(attachment.mime) && attachment.url;
        }
        
        // ✅ NUEVO: Validar URL de imagen
        isValidImageUrl(url) {
            try {
                new URL(url);
                const validExtensions = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;
                return validExtensions.test(url);
            } catch {
                return false;
            }
        }
        
        // ✅ NUEVO: Establecer imagen de fondo
        setBackgroundImage(attachment) {
            const url = attachment.url;
            
            // Actualizar input de URL
            $('#background-image-url').val(url).removeClass('invalid').addClass('valid');
            
            // Mostrar preview
            this.updateBackgroundImagePreview(url);
            
            // Marcar como modificado
            this.isDirty = true;
            this.updatePreviewStyles();
        }
        
        // ✅ NUEVO: Actualizar preview de imagen de fondo
        updateBackgroundImagePreview(url) {
            const $preview = $('#background-image-preview');
            const $previewImg = $preview.find('img');
            
            if ($previewImg.length === 0) {
                $preview.html(`<img src="${url}" alt="Vista previa" style="max-width: 100%; height: auto; border-radius: 4px;">`);
            } else {
                $previewImg.attr('src', url);
            }
            
            $preview.show();
            $('#background-image-remove').show();
        }
        
        // ✅ NUEVO: Ocultar preview de imagen de fondo
        hideBackgroundImagePreview() {
            $('#background-image-preview').hide().empty();
            $('#background-image-remove').hide();
        }
        
        // ✅ NUEVO: Eliminar imagen de fondo
        removeBackgroundImage() {
            $('#background-image-url').val('').removeClass('valid invalid');
            this.hideBackgroundImagePreview();
            this.isDirty = true;
            this.updatePreviewStyles();
        }

        // Función para actualizar estilos en tiempo real
        updatePreviewStyles() {
            // Crear o actualizar el elemento de estilo dinámico
            let $styleElement = $('#sfq-dynamic-styles');
            if ($styleElement.length === 0) {
                $styleElement = $('<style id="sfq-dynamic-styles"></style>');
                $('head').append($styleElement);
            }
            
            // ✅ NUEVO: Función helper para aplicar opacidad a colores
            const applyOpacity = (color, opacity) => {
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
            };
            
            // Recopilar valores actuales
            const styles = {
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
                // ✅ NUEVO: Configuraciones de imagen de fondo
                backgroundImageUrl: $('#background-image-url').val() || '',
                backgroundSize: $('#background-size').val() || 'cover',
                backgroundRepeat: $('#background-repeat').val() || 'no-repeat',
                backgroundPosition: $('#background-position').val() || 'center center',
                backgroundAttachment: $('#background-attachment').val() || 'scroll',
                backgroundOpacity: $('#background-opacity').val() || '1',
                backgroundOverlay: $('#background-overlay').is(':checked'),
                backgroundOverlayColor: $('#background-overlay-color').val() || '#000000',
                backgroundOverlayOpacity: $('#background-overlay-opacity').val() || '0.3',
                // ✅ NUEVO: Valores de opacidad
                primaryColorOpacity: $('#primary-color-opacity').val() || '1',
                secondaryColorOpacity: $('#secondary-color-opacity').val() || '1',
                backgroundColorOpacity: $('#background-color-opacity').val() || '1',
                optionsBackgroundColorOpacity: $('#options-background-color-opacity').val() || '1',
                optionsBorderColorOpacity: $('#options-border-color-opacity').val() || '1',
                textColorOpacity: $('#text-color-opacity').val() || '1',
                inputBorderColorOpacity: $('#input-border-color-opacity').val() || '1'
            };
            
            // ✅ NUEVO: Aplicar opacidades a los colores
            const processedStyles = {
                ...styles,
                primaryColor: applyOpacity(styles.primaryColor, styles.primaryColorOpacity),
                secondaryColor: applyOpacity(styles.secondaryColor, styles.secondaryColorOpacity),
                backgroundColor: applyOpacity(styles.backgroundColor, styles.backgroundColorOpacity),
                optionsBackgroundColor: applyOpacity(styles.optionsBackgroundColor, styles.optionsBackgroundColorOpacity),
                optionsBorderColor: applyOpacity(styles.optionsBorderColor, styles.optionsBorderColorOpacity),
                textColor: applyOpacity(styles.textColor, styles.textColorOpacity),
                inputBorderColor: applyOpacity(styles.inputBorderColor, styles.inputBorderColorOpacity)
            };
            
            // ✅ CORREGIDO: Generar estilos de imagen de fondo sin afectar la opacidad del contenedor
            let backgroundImageStyles = '';
            if (styles.backgroundImageUrl && styles.backgroundImageUrl.trim() !== '') {
                // La imagen de fondo se aplicará como pseudo-elemento para controlar la opacidad independientemente
                backgroundImageStyles = `
                    position: relative !important;
                `;
            }
            
            // Generar CSS dinámico mejorado
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
                    
                    /* ✅ CORREGIDO: Aplicar imagen de fondo como pseudo-elemento */
                    ${backgroundImageStyles}
                }
                
                /* ✅ CORREGIDO: Imagen de fondo como pseudo-elemento con opacidad independiente */
                ${styles.backgroundImageUrl && styles.backgroundImageUrl.trim() !== '' ? `
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
                ` : ''}
                
                /* ✅ NUEVO: Overlay para imagen de fondo */
                ${styles.backgroundImageUrl && styles.backgroundOverlay ? `
                .sfq-form-container::before {
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
                
                .sfq-form-container > * {
                    position: relative !important;
                    z-index: 2 !important;
                }
                ` : ''}
                
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
            
            // Aplicar el CSS
            $styleElement.html(css);
            
            // También aplicar atributos data para el ancho si hay elementos en la página
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
            
            console.log('SFQ: Updated preview styles dynamically with improved specificity');
        }
    }

    /**
     * StateManager - Gestión centralizada del estado
     */
    class StateManager {
        constructor() {
            this.state = {
                formData: {},
                questions: [],
                selectedQuestion: null,
                clipboard: null
            };
            this.listeners = {};
        }

        setState(key, value) {
            const oldValue = this.state[key];
            this.state[key] = value;
            this.notify(key, value, oldValue);
        }

        getState(key) {
            return key ? this.state[key] : this.state;
        }

        subscribe(key, callback) {
            if (!this.listeners[key]) {
                this.listeners[key] = [];
            }
            this.listeners[key].push(callback);
        }

        notify(key, newValue, oldValue) {
            if (this.listeners[key]) {
                this.listeners[key].forEach(callback => {
                    callback(newValue, oldValue);
                });
            }
        }
    }

    /**
     * QuestionManager - Gestión de preguntas
     */
    class QuestionManager {
        constructor(formBuilder) {
            this.formBuilder = formBuilder;
            this.questions = [];
            this.container = null;
            this.isAddingQuestion = false; // Flag para prevenir duplicación
            this.idMapping = new Map(); // Mapeo de IDs temporales a IDs reales
        }

        init() {
            this.container = $('#sfq-questions-container');
            this.bindEvents();
            this.initSortable();
        }

        bindEvents() {
            // Add question buttons - Use namespace and prevent duplicates
            $('.sfq-add-question').off('click.sfq').on('click.sfq', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation(); // Prevent any other handlers
                
                // Prevent double-click
                if (this.isAddingQuestion) {
                    return false;
                }
                
                const $button = $(e.currentTarget);
                const type = $button.data('type');
                const isFinalScreen = $button.data('final-screen') === true;
                
                console.log('SFQ: Add question button clicked:', {
                    type: type,
                    isFinalScreen: isFinalScreen,
                    buttonData: $button.data()
                });
                
                if (type && !$button.prop('disabled')) {
                    // Disable button temporarily
                    $button.prop('disabled', true);
                    
                    this.addQuestion(type, isFinalScreen);
                    
                    // Re-enable button after a short delay
                    setTimeout(() => {
                        $button.prop('disabled', false);
                    }, 500);
                }
                
                return false; // Prevent default and stop propagation
            });
        }

        initSortable() {
            if ($.fn.sortable) {
                this.container.sortable({
                    handle: '.sfq-move-handle',
                    placeholder: 'sfq-question-placeholder',
                    update: () => this.updateQuestionsOrder()
                });
            }
        }

        loadQuestions(questionsData) {
            // Clear containers
            this.container.empty();
            $('#sfq-final-screens-container').empty();
            this.questions = [];
            this.idMapping.clear(); // Limpiar mapeo anterior
            
            if (!questionsData || questionsData.length === 0) {
                this.formBuilder.uiRenderer.showEmptyState();
                return;
            }
            
            // Sort by position
            questionsData.sort((a, b) => (a.order_position || 0) - (b.order_position || 0));
            
            // Separar preguntas normales de pantallas finales
            const normalQuestions = [];
            const finalScreenQuestions = [];
            
            // Process each question
            questionsData.forEach((questionData, index) => {
                const question = this.createQuestionObject(questionData, index);
                if (question) {
                    this.questions.push(question);
                    
                    // CRÍTICO: Crear mapeo de ID temporal a ID real
                    if (question.originalId) {
                        this.idMapping.set(question.id, question.originalId);
                        console.log('SFQ: Created ID mapping:', question.id, '->', question.originalId);
                    }
                    
                    // Separar según si es pantalla final o no
                    if (question.type === 'freestyle' && question.pantallaFinal) {
                        finalScreenQuestions.push(question);
                        console.log('SFQ: Question marked as final screen:', question.id, question.text);
                    } else {
                        normalQuestions.push(question);
                    }
                }
            });
            
            // Renderizar preguntas normales
            if (normalQuestions.length > 0) {
                normalQuestions.forEach(question => {
                    const element = this.formBuilder.uiRenderer.renderQuestion(question);
                    this.container.append(element);
                    this.bindQuestionEvents(question.id);
                    
                    // ✅ CRÍTICO: Repoblar previews de imagen para preguntas image_choice
                    if (question.type === 'image_choice') {
                        this.repopulateImagePreviews(question.id, question);
                    }
                    
                    // Load conditions if any
                    const questionData = questionsData.find(q => q.id === question.originalId);
                    if (questionData && questionData.conditions && questionData.conditions.length > 0) {
                        this.formBuilder.conditionEngine.loadConditions(question.id, questionData.conditions);
                    }
                });
            } else {
                // Mostrar estado vacío para preguntas normales
                this.formBuilder.uiRenderer.showEmptyState();
            }
            
            // Renderizar pantallas finales
            const $finalScreensContainer = $('#sfq-final-screens-container');
            if (finalScreenQuestions.length > 0) {
                // Remover estado vacío si existe
                $finalScreensContainer.find('.sfq-empty-final-screens').remove();
                
                finalScreenQuestions.forEach(question => {
                    const element = this.formBuilder.uiRenderer.renderQuestion(question);
                    $finalScreensContainer.append(element);
                    this.bindQuestionEvents(question.id);
                    
                    // ✅ CRÍTICO: Repoblar previews de imagen para preguntas image_choice en pantallas finales
                    if (question.type === 'image_choice') {
                        this.repopulateImagePreviews(question.id, question);
                    }
                    
                    // Load conditions if any
                    const questionData = questionsData.find(q => q.id === question.originalId);
                    if (questionData && questionData.conditions && questionData.conditions.length > 0) {
                        this.formBuilder.conditionEngine.loadConditions(question.id, questionData.conditions);
                    }
                });
                
                console.log('SFQ: Loaded', finalScreenQuestions.length, 'final screen questions');
            } else {
                // Mostrar estado vacío para pantallas finales
                $finalScreensContainer.html(`
                    <div class="sfq-empty-final-screens">
                        <div class="sfq-empty-final-icon">🏁</div>
                        <p>Añade más pantallas finales de estilo libre</p>
                        <p>Marca preguntas como "pantalla final" o crea preguntas tipo "Pantalla Final" para que aparezcan aquí</p>
                    </div>
                `);
            }
            
            console.log('SFQ: Loaded questions summary:', {
                total: this.questions.length,
                normal: normalQuestions.length,
                finalScreens: finalScreenQuestions.length
            });
        }

        createQuestionObject(data, index) {
            const questionId = 'q_' + Date.now() + '_' + index;
            
            // Handle freestyle questions
            if (data.question_type === 'freestyle') {
                // CRÍTICO: Extraer pantallaFinal de las configuraciones si no está en el nivel superior
                let pantallaFinal = false;
                
                // Verificar en múltiples ubicaciones posibles
                if (data.pantallaFinal !== undefined) {
                    pantallaFinal = this.formBuilder.dataValidator.normalizeBoolean(data.pantallaFinal);
                } else if (data.pantalla_final !== undefined) {
                    pantallaFinal = this.formBuilder.dataValidator.normalizeBoolean(data.pantalla_final);
                } else if (data.settings && data.settings.pantallaFinal !== undefined) {
                    pantallaFinal = this.formBuilder.dataValidator.normalizeBoolean(data.settings.pantallaFinal);
                }
                
                console.log('SFQ: Processing freestyle question:', data.question_text);
                console.log('SFQ: pantallaFinal value found:', pantallaFinal);
                console.log('SFQ: Original data.settings:', data.settings);
                
                return {
                    id: questionId,
                    originalId: data.id || null,
                    text: data.question_text || '',
                    type: 'freestyle',
                    freestyle_elements: this.processFreestyleElements(data.freestyle_elements || []),
                    required: this.formBuilder.dataValidator.normalizeBoolean(data.required),
                    order: index,
                    conditions: [],
                    settings: data.settings || {},
                    global_settings: data.global_settings || {
                        layout: 'vertical',
                        spacing: 'normal',
                        show_element_numbers: false
                    },
                    pantallaFinal: pantallaFinal
                };
            }
            
            // Process options for regular questions
            let options = [];
            if (data.options) {
                if (typeof data.options === 'string') {
                    try {
                        options = JSON.parse(data.options);
                    } catch (e) {
                        options = [];
                    }
                } else if (Array.isArray(data.options)) {
                    options = data.options;
                }
            }
            
            // ✅ CORREGIDO: Ensure options have correct structure including image data
            options = options.map(opt => {
                if (typeof opt === 'string') {
                    return { 
                        text: opt, 
                        value: opt,
                        image: '',
                        image_id: '',
                        image_alt: ''
                    };
                }
                return {
                    text: opt.text || opt.value || '',
                    value: opt.value || opt.text || '',
                    image: opt.image || '',
                    image_id: opt.image_id || '',
                    image_alt: opt.image_alt || ''
                };
            }).filter(opt => opt.text);
            
            return {
                id: questionId,
                originalId: data.id || null,
                text: data.question_text || '',
                type: data.question_type || 'text',
                options: options,
                required: this.formBuilder.dataValidator.normalizeBoolean(data.required),
                order: index,
                conditions: [],
                settings: data.settings || {}
            };
        }

        // Nuevo método para procesar elementos freestyle
        processFreestyleElements(elements) {
            if (!Array.isArray(elements)) return [];
            
            console.log('SFQ: Processing freestyle elements from database:', elements);
            
            return elements.map((element, index) => {
                // ✅ CRÍTICO: Validar que el tipo de elemento sea válido
                const validTypes = [
                    'text', 'video', 'image', 'countdown', 'phone', 'email', 
                    'file_upload', 'button', 'rating', 'dropdown', 'checkbox', 
                    'legal_text', 'variable_display', 'styled_text'
                ];
                
                const elementType = element.type || 'text';
                
                if (!validTypes.includes(elementType)) {
                    console.warn('SFQ: Invalid element type found:', elementType, 'defaulting to text');
                }
                
                const processedElement = {
                    id: element.id || 'element_' + Date.now() + '_' + index,
                    type: validTypes.includes(elementType) ? elementType : 'text',
                    label: element.label || '',
                    settings: element.settings || {},
                    order: element.order || index,
                    value: element.value || ''
                };
                
                console.log('SFQ: Processed element:', processedElement);
                
                return processedElement;
            });
        }

        addQuestion(type, isFinalScreen = false) {
            // Prevent duplicate additions
            if (this.isAddingQuestion) {
                return;
            }
            
            this.isAddingQuestion = true;
            
            try {
                const questionId = 'q_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                const question = {
                    id: questionId,
                    type: type,
                    text: '',
                    options: type.includes('choice') ? [
                        { text: '', value: '' },
                        { text: '', value: '' }
                    ] : [],
                    required: false,
                    order: this.questions.length,
                    conditions: []
                };
                
                // Si es una pregunta de estilo libre
                if (type === 'freestyle') {
                    question.freestyle_elements = [];
                    question.global_settings = {
                        layout: 'vertical',
                        spacing: 'normal',
                        show_element_numbers: false
                    };
                    
                    // Marcar como pantalla final si se especifica
                    if (isFinalScreen) {
                        question.pantallaFinal = true;
                        console.log('SFQ: Creating freestyle question as final screen:', questionId);
                    } else {
                        question.pantallaFinal = false;
                    }
                }
                
                this.questions.push(question);
                
                // Remove empty state if exists
                $('.sfq-empty-questions').remove();
                $('.sfq-empty-final-screens').remove();
                
                // Render and append
                const element = this.formBuilder.uiRenderer.renderQuestion(question);
                
                // Determinar dónde añadir la pregunta
                if (type === 'freestyle' && isFinalScreen) {
                    // Añadir a la sección de pantallas finales
                    const $finalScreensContainer = $('#sfq-final-screens-container');
                    if ($finalScreensContainer.length > 0) {
                        $finalScreensContainer.append(element);
                        console.log('SFQ: Added final screen question to final screens section:', questionId);
                    } else {
                        // Fallback: añadir al contenedor normal
                        this.container.append(element);
                    }
                } else {
                    // Añadir al contenedor normal de preguntas
                    this.container.append(element);
                }
                
                this.bindQuestionEvents(questionId);
                
                // Mark as dirty
                this.formBuilder.isDirty = true;
                
                // Scroll to new question
                element[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            } finally {
                // Reset flag after a short delay
                setTimeout(() => {
                    this.isAddingQuestion = false;
                }, 300);
            }
        }

        bindQuestionEvents(questionId) {
            const $question = $(`#${questionId}`);
            const question = this.questions.find(q => q.id === questionId);
            
            if (!question) return;
            
            // Delete question
            $question.find('.sfq-delete-question').off('click').on('click', () => {
                if (confirm('¿Estás seguro de eliminar esta pregunta?')) {
                    this.deleteQuestion(questionId);
                }
            });
            
            // Duplicate question
            $question.find('.sfq-duplicate-question').off('click').on('click', () => {
                this.duplicateQuestion(questionId);
            });
            
            // Update question text
            $question.find('.sfq-question-text-input').off('input').on('input', (e) => {
                question.text = $(e.target).val();
                this.formBuilder.isDirty = true;
            });
            
            // Update required
            $question.find('.sfq-required-checkbox').off('change').on('change', (e) => {
                question.required = $(e.target).is(':checked');
                this.formBuilder.isDirty = true;
            });
            
            // Update hide title
            $question.find('.sfq-hide-title-checkbox').off('change').on('change', (e) => {
                // ✅ SOLUCIÓN: Forzar creación de objeto plano
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
                
                // Establecer el nuevo valor
                newSettings.hide_title = $(e.target).is(':checked');
                
                // Asignar el nuevo objeto
                question.settings = newSettings;
                
                this.formBuilder.isDirty = true;
                
                // Debug logging
                console.log('SFQ: hide_title setting updated for question', question.id, ':', question.settings.hide_title);
                console.log('SFQ: Full settings object:', question.settings);
                console.log('SFQ: Settings is array?', Array.isArray(question.settings));
                console.log('SFQ: Settings type:', typeof question.settings);
            });
            
            // Update block question
            $question.find('.sfq-block-question-checkbox').off('change').on('change', (e) => {
                // ✅ SOLUCIÓN: Forzar creación de objeto plano
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
                
                // Establecer el nuevo valor
                newSettings.block_question = $(e.target).is(':checked');
                
                // Asignar el nuevo objeto
                question.settings = newSettings;
                
                this.formBuilder.isDirty = true;
                
                // Debug logging
                console.log('SFQ: block_question setting updated for question', question.id, ':', question.settings.block_question);
                console.log('SFQ: Full settings object:', question.settings);
            });
            
            // ✅ CRÍTICO: Inicializar el estado del checkbox según los settings guardados
            // SOLUCIÓN: Asegurar que settings existe como objeto antes de acceder a hide_title
            if (!question.settings || typeof question.settings !== 'object' || Array.isArray(question.settings)) {
                console.log('SFQ: FIXING INVALID SETTINGS - was:', typeof question.settings, Array.isArray(question.settings) ? '(array)' : '', question.settings);
                question.settings = {};
                console.log('SFQ: Initialized empty settings object for question', question.id);
            }
            
            const hideTitle = question.settings.hide_title === true;
            $question.find('.sfq-hide-title-checkbox').prop('checked', hideTitle);
            console.log('SFQ: Initialized hide_title checkbox for question', question.id, 'to:', hideTitle);
            console.log('SFQ: Question settings:', question.settings);
            
            // ELIMINADO: Lógica del checkbox para convertir a pantalla final
            // Solo se usará el botón "Pantalla Final" para crear pantallas finales
            
            // Update show next button setting
            $question.find('.sfq-show-next-button-checkbox').off('change').on('change', (e) => {
                if (!question.settings) {
                    question.settings = {};
                }
                question.settings.show_next_button = $(e.target).is(':checked');
                
                // Show/hide the text input field
                const $textSetting = $question.find('.sfq-next-button-text-setting');
                if ($(e.target).is(':checked')) {
                    $textSetting.show();
                } else {
                    $textSetting.hide();
                }
                
                this.formBuilder.isDirty = true;
            });
            
            // Update next button text setting
            $question.find('.sfq-next-button-text-input').off('input').on('input', (e) => {
                if (!question.settings) {
                    question.settings = {};
                }
                question.settings.next_button_text = $(e.target).val();
                this.formBuilder.isDirty = true;
            });
            
            // Add option
            $question.find('.sfq-add-option').off('click').on('click', () => {
                this.addOption(questionId);
            });
            
            // Bind option events
            this.bindOptionEvents(questionId);
            
            // Add condition button
            $question.find('.sfq-add-condition').off('click').on('click', () => {
                this.formBuilder.conditionEngine.addCondition(questionId);
            });
            
            // Freestyle elements events
            if (question.type === 'freestyle') {
                this.bindFreestyleEvents(questionId);
            }
        }

        bindFreestyleEvents(questionId) {
            const $question = $(`#${questionId}`);
            const question = this.questions.find(q => q.id === questionId);
            
            if (!question || question.type !== 'freestyle') return;
            
            // Add freestyle element buttons
            $question.find('.sfq-add-freestyle-element').off('click').on('click', (e) => {
                const elementType = $(e.target).data('type');
                this.addFreestyleElement(questionId, elementType);
            });
            
            // Bind existing element events
            this.bindFreestyleElementEvents(questionId);
        }

        bindFreestyleElementEvents(questionId) {
            const $question = $(`#${questionId}`);
            const question = this.questions.find(q => q.id === questionId);
            
            if (!question) return;
            
            const self = this;
            
            // Element label changes
            $question.find('.sfq-element-label-input').off('input').on('input', function() {
                const $element = $(this).closest('.sfq-freestyle-element');
                const elementId = $element.data('element-id');
                const element = question.freestyle_elements?.find(el => el.id === elementId);
                
                if (element) {
                    element.label = $(this).val();
                    self.formBuilder.isDirty = true;
                }
            });
            
            // Configure element
            $question.find('.sfq-configure-element').off('click').on('click', function() {
                const $element = $(this).closest('.sfq-freestyle-element');
                const elementId = $element.data('element-id');
                const elementType = $element.data('element-type');
                
                self.openElementConfigModal(questionId, elementId, elementType);
            });
            
            // Duplicate element
            $question.find('.sfq-duplicate-element').off('click').on('click', function() {
                const $element = $(this).closest('.sfq-freestyle-element');
                const elementId = $element.data('element-id');
                self.duplicateFreestyleElement(questionId, elementId);
            });
            
            // Delete element
            $question.find('.sfq-delete-element').off('click').on('click', function() {
                const $element = $(this).closest('.sfq-freestyle-element');
                const elementId = $element.data('element-id');
                
                if (confirm('¿Estás seguro de eliminar este elemento?')) {
                    self.deleteFreestyleElement(questionId, elementId);
                }
            });
        }

        addFreestyleElement(questionId, elementType) {
            const question = this.questions.find(q => q.id === questionId);
            if (!question || question.type !== 'freestyle') return;
            
            // Initialize freestyle_elements if not exists
            if (!question.freestyle_elements) {
                question.freestyle_elements = [];
            }
            
            // Create new element
            const elementId = 'element_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            const newElement = {
                id: elementId,
                type: elementType,
                label: '',
                order: question.freestyle_elements.length,
                settings: {},
                value: ''
            };
            
            question.freestyle_elements.push(newElement);
            
            // Re-render elements
            const $elementsContainer = $(`#freestyle-elements-${questionId}`);
            const elementsHtml = this.formBuilder.uiRenderer.renderFreestyleElements(question.freestyle_elements);
            $elementsContainer.html(elementsHtml);
            
            // Rebind events
            this.bindFreestyleElementEvents(questionId);
            
            // Mark as dirty
            this.formBuilder.isDirty = true;
        }

        duplicateFreestyleElement(questionId, elementId) {
            const question = this.questions.find(q => q.id === questionId);
            if (!question || !question.freestyle_elements) return;
            
            const originalElement = question.freestyle_elements.find(el => el.id === elementId);
            if (!originalElement) return;
            
            // Create duplicate
            const newElementId = 'element_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            const duplicateElement = {
                ...originalElement,
                id: newElementId,
                label: originalElement.label + ' (Copia)',
                order: question.freestyle_elements.length
            };
            
            question.freestyle_elements.push(duplicateElement);
            
            // Re-render elements
            const $elementsContainer = $(`#freestyle-elements-${questionId}`);
            const elementsHtml = this.formBuilder.uiRenderer.renderFreestyleElements(question.freestyle_elements);
            $elementsContainer.html(elementsHtml);
            
            // Rebind events
            this.bindFreestyleElementEvents(questionId);
            
            // Mark as dirty
            this.formBuilder.isDirty = true;
        }

        deleteFreestyleElement(questionId, elementId) {
            const question = this.questions.find(q => q.id === questionId);
            if (!question || !question.freestyle_elements) return;
            
            // Remove element from array
            question.freestyle_elements = question.freestyle_elements.filter(el => el.id !== elementId);
            
            // Update order
            question.freestyle_elements.forEach((el, index) => {
                el.order = index;
            });
            
            // Re-render elements
            const $elementsContainer = $(`#freestyle-elements-${questionId}`);
            const elementsHtml = this.formBuilder.uiRenderer.renderFreestyleElements(question.freestyle_elements);
            $elementsContainer.html(elementsHtml);
            
            // Rebind events
            this.bindFreestyleElementEvents(questionId);
            
            // Mark as dirty
            this.formBuilder.isDirty = true;
        }

        openElementConfigModal(questionId, elementId, elementType) {
            const question = this.questions.find(q => q.id === questionId);
            if (!question || !question.freestyle_elements) return;
            
            const element = question.freestyle_elements.find(el => el.id === elementId);
            if (!element) return;
            
            // Nuevo sistema: desplegable inline en lugar de modal
            this.toggleElementConfigPanel(questionId, elementId, elementType);
        }
        
        toggleElementConfigPanel(questionId, elementId, elementType) {
            const $elementContainer = $(`.sfq-freestyle-element[data-element-id="${elementId}"]`);
            const $existingPanel = $elementContainer.find('.sfq-element-config-panel');
            
            // Si ya existe un panel, cerrarlo
            if ($existingPanel.length > 0) {
                $existingPanel.slideUp(300, function() {
                    $(this).remove();
                });
                return;
            }
            
            // Cerrar otros paneles abiertos
            $('.sfq-element-config-panel').slideUp(300, function() {
                $(this).remove();
            });
            
            const question = this.questions.find(q => q.id === questionId);
            const element = question?.freestyle_elements?.find(el => el.id === elementId);
            
            // ✅ CRÍTICO: Validar que el elemento existe y el tipo coincide
            if (!element) {
                console.error('SFQ: Element not found for config panel:', elementId);
                return;
            }
            
            if (element.type !== elementType) {
                console.error('SFQ: Element type mismatch:', element.type, 'vs', elementType);
                return;
            }
            
            // Crear panel de configuración inline
            const configPanel = this.createElementConfigPanel(element, elementType, questionId);
            
            // Insertar después del contenido del elemento
            $elementContainer.find('.sfq-freestyle-element-content').after(configPanel);
            
            // Animar la aparición
            const $panel = $elementContainer.find('.sfq-element-config-panel');
            
            // ✅ NUEVO: Añadir identificadores únicos para prevenir interferencias
            $panel.attr('data-element-id', elementId);
            $panel.attr('data-element-type', elementType);
            $panel.attr('data-question-id', questionId);
            
            $panel.hide().slideDown(300);
            
            // Bind events del panel con validaciones adicionales
            this.bindConfigPanelEvents($panel, questionId, elementId);
            
            // Focus en el primer input
            setTimeout(() => {
                $panel.find('input, select, textarea').first().focus();
            }, 350);
        }
        
        createElementConfigPanel(element, elementType, questionId) {
            const elementTypeNames = {
                'text': 'Texto',
                'video': 'Video',
                'image': 'Imagen',
                'countdown': 'Cuenta atrás',
                'phone': 'Teléfono',
                'email': 'Email',
                'file_upload': 'Subir imagen',
                'button': 'Botón',
                'rating': 'Valoración',
                'dropdown': 'Desplegable',
                'checkbox': 'Opción Check',
                'legal_text': 'Texto RGPD'
            };
            
            // ✅ NUEVO: Validación de tipo de elemento para prevenir interferencias
            if (element.type !== elementType) {
                console.error('SFQ: Element type mismatch in config panel creation:', element.type, 'vs', elementType);
                return '<div class="sfq-config-error">Error: Tipo de elemento no coincide</div>';
            }
            
            // Configuraciones específicas por tipo de elemento
            let specificConfig = '';
            
            switch (elementType) {
                case 'video':
                    specificConfig = this.createVideoConfig(element);
                    break;
                case 'text':
                    specificConfig = this.createTextConfig(element);
                    break;
                case 'email':
                    specificConfig = this.createEmailConfig(element);
                    break;
                case 'phone':
                    specificConfig = this.createPhoneConfig(element);
                    break;
                case 'button':
                    specificConfig = this.createButtonConfig(element);
                    break;
                case 'rating':
                    specificConfig = this.createRatingConfig(element);
                    break;
                case 'dropdown':
                    specificConfig = this.createDropdownConfig(element);
                    break;
                case 'checkbox':
                    specificConfig = this.createCheckboxConfig(element);
                    break;
                case 'image':
                    specificConfig = this.createImageConfig(element);
                    break;
                case 'countdown':
                    specificConfig = this.createCountdownConfig(element);
                    break;
                case 'file_upload':
                    specificConfig = this.createFileUploadConfig(element);
                    break;
                case 'legal_text':
                    specificConfig = this.createLegalTextConfig(element);
                    break;
                case 'variable_display':
                    specificConfig = this.createVariableDisplayConfig(element);
                    break;
                case 'styled_text':
                    specificConfig = this.createStyledTextConfig(element);
                    break;
                default:
                    specificConfig = '<div class="sfq-config-notice">Configuración específica próximamente</div>';
            }
            
            return `
                <div class="sfq-element-config-panel" 
                     data-element-id="${element.id}" 
                     data-element-type="${elementType}" 
                     data-question-id="${questionId}">
                    <div class="sfq-config-header">
                        <h4>⚙️ Configurar ${elementTypeNames[elementType] || elementType}</h4>
                        <button class="sfq-config-close" type="button" title="Cerrar configuración">
                            <span class="dashicons dashicons-no-alt"></span>
                        </button>
                    </div>
                    
                    <div class="sfq-config-content">
                        <!-- Configuración básica -->
                        <div class="sfq-config-section">
                            <label class="sfq-config-label">
                                Etiqueta del elemento:
                                <input type="text" class="sfq-config-input sfq-element-label-config" 
                                       value="${this.formBuilder.uiRenderer.escapeHtml(element.label)}" 
                                       placeholder="Texto que verá el usuario"
                                       data-element-id="${element.id}">
                            </label>
                        </div>
                        
                        <!-- Configuración específica -->
                        <div class="sfq-config-section">
                            ${specificConfig}
                        </div>
                    </div>
                    
                    <div class="sfq-config-actions">
                        <button class="sfq-config-cancel" type="button" data-element-id="${element.id}">Cancelar</button>
                        <button class="sfq-config-save" type="button" data-element-id="${element.id}">Guardar cambios</button>
                    </div>
                </div>
            `;
        }
        
        // Métodos de configuración específicos por tipo de elemento
        createVideoConfig(element) {
            const settings = element.settings || {};
            return `
                <h5>🎥 Configuración de Video</h5>
                <label class="sfq-config-label">
                    URL del video:
                    <input type="url" class="sfq-config-input" data-setting="video_url" 
                           value="${this.formBuilder.uiRenderer.escapeHtml(settings.video_url || '')}" 
                           placeholder="https://youtube.com/watch?v=... o https://vimeo.com/...">
                    <small>Soporta YouTube, Vimeo y archivos MP4 directos</small>
                </label>
                <label class="sfq-config-label">
                    <input type="checkbox" data-setting="autoplay" ${settings.autoplay ? 'checked' : ''}>
                    Reproducir automáticamente
                </label>
                <label class="sfq-config-label">
                    <input type="checkbox" data-setting="controls" ${settings.controls !== false ? 'checked' : ''}>
                    Mostrar controles
                </label>
                <div class="sfq-config-row">
                    <label class="sfq-config-label">
                        Ancho:
                        <input type="text" class="sfq-config-input" data-setting="width" 
                               value="${this.formBuilder.uiRenderer.escapeHtml(settings.width || '100%')}" 
                               placeholder="100%, 500px, etc.">
                    </label>
                    <label class="sfq-config-label">
                        Alto:
                        <input type="text" class="sfq-config-input" data-setting="height" 
                               value="${this.formBuilder.uiRenderer.escapeHtml(settings.height || 'auto')}" 
                               placeholder="auto, 300px, etc.">
                    </label>
                </div>
            `;
        }
        
        createTextConfig(element) {
            const settings = element.settings || {};
            return `
                <h5>📝 Configuración de Texto</h5>
                <label class="sfq-config-label">
                    Placeholder:
                    <input type="text" class="sfq-config-input" data-setting="placeholder" 
                           value="${this.formBuilder.uiRenderer.escapeHtml(settings.placeholder || '')}" 
                           placeholder="Texto de ejemplo para el usuario">
                </label>
                <label class="sfq-config-label">
                    <input type="checkbox" data-setting="multiline" ${settings.multiline ? 'checked' : ''}>
                    Texto multilínea (textarea)
                </label>
                <div class="sfq-config-row">
                    <label class="sfq-config-label">
                        Longitud máxima:
                        <input type="number" class="sfq-config-input" data-setting="max_length" 
                               value="${settings.max_length || ''}" 
                               placeholder="Ej: 100" min="1" max="5000">
                    </label>
                    <label class="sfq-config-label" style="display: ${settings.multiline ? 'block' : 'none'};">
                        Filas (textarea):
                        <input type="number" class="sfq-config-input" data-setting="rows" 
                               value="${settings.rows || 3}" 
                               min="2" max="10">
                    </label>
                </div>
            `;
        }
        
        createEmailConfig(element) {
            const settings = element.settings || {};
            return `
                <h5>📧 Configuración de Email</h5>
                <label class="sfq-config-label">
                    Placeholder:
                    <input type="text" class="sfq-config-input" data-setting="placeholder" 
                           value="${this.formBuilder.uiRenderer.escapeHtml(settings.placeholder || '')}" 
                           placeholder="Ej: tu@email.com">
                </label>
                <label class="sfq-config-label">
                    <input type="checkbox" data-setting="validate_domain" ${settings.validate_domain ? 'checked' : ''}>
                    Validar dominio del email
                </label>
            `;
        }
        
        createPhoneConfig(element) {
            const settings = element.settings || {};
            return `
                <h5>📞 Configuración de Teléfono</h5>
                <label class="sfq-config-label">
                    Placeholder:
                    <input type="text" class="sfq-config-input" data-setting="placeholder" 
                           value="${this.formBuilder.uiRenderer.escapeHtml(settings.placeholder || '')}" 
                           placeholder="Ej: +34 600 000 000">
                </label>
                <label class="sfq-config-label">
                    Patrón de validación:
                    <input type="text" class="sfq-config-input" data-setting="pattern" 
                           value="${this.formBuilder.uiRenderer.escapeHtml(settings.pattern || '')}" 
                           placeholder="Ej: [0-9]{9} para 9 dígitos">
                    <small>Expresión regular para validar el formato</small>
                </label>
            `;
        }
        
        createButtonConfig(element) {
            const settings = element.settings || {};
            return `
                <h5>🔘 Configuración de Botón</h5>
                
                <!-- Configuración básica -->
                <label class="sfq-config-label">
                    Texto del botón:
                    <input type="text" class="sfq-config-input" data-setting="button_text" 
                           value="${this.formBuilder.uiRenderer.escapeHtml(settings.button_text || '')}" 
                           placeholder="Ej: Hacer clic aquí">
                </label>
                <label class="sfq-config-label">
                    URL de destino (opcional):
                    <input type="url" class="sfq-config-input" data-setting="button_url" 
                           value="${this.formBuilder.uiRenderer.escapeHtml(settings.button_url || '')}" 
                           placeholder="https://ejemplo.com">
                    <small>Si no se especifica, solo registrará el clic</small>
                </label>
                <label class="sfq-config-label">
                    <input type="checkbox" data-setting="open_new_tab" ${settings.open_new_tab ? 'checked' : ''}>
                    Abrir en nueva pestaña
                </label>
                
                <!-- Configuración de tipografía -->
                <h6 style="margin-top: 20px; margin-bottom: 10px;">🔤 Tipografía</h6>
                
                <div class="sfq-config-row">
                    <label class="sfq-config-label">
                        Familia de fuente:
                        <select class="sfq-config-input" data-setting="font_family">
                            <option value="inherit" ${settings.font_family === 'inherit' || !settings.font_family ? 'selected' : ''}>Por defecto</option>
                            <option value="Arial, sans-serif" ${settings.font_family === 'Arial, sans-serif' ? 'selected' : ''}>Arial</option>
                            <option value="'Times New Roman', serif" ${settings.font_family === "'Times New Roman', serif" ? 'selected' : ''}>Times New Roman</option>
                            <option value="'Courier New', monospace" ${settings.font_family === "'Courier New', monospace" ? 'selected' : ''}>Courier New</option>
                            <option value="Georgia, serif" ${settings.font_family === 'Georgia, serif' ? 'selected' : ''}>Georgia</option>
                            <option value="Verdana, sans-serif" ${settings.font_family === 'Verdana, sans-serif' ? 'selected' : ''}>Verdana</option>
                            <option value="'Trebuchet MS', sans-serif" ${settings.font_family === "'Trebuchet MS', sans-serif" ? 'selected' : ''}>Trebuchet MS</option>
                        </select>
                    </label>
                    <label class="sfq-config-label">
                        Tamaño de letra:
                        <input type="range" class="sfq-config-input" data-setting="font_size" 
                               min="12" max="32" step="1" 
                               value="${settings.font_size || '16'}">
                        <span class="sfq-button-font-size-display">${settings.font_size || '16'}px</span>
                    </label>
                </div>
                
                <!-- Efectos de texto -->
                <h6 style="margin-top: 15px; margin-bottom: 10px;">✨ Efectos de Texto</h6>
                
                <div class="sfq-config-row">
                    <label class="sfq-config-label">
                        <input type="checkbox" data-setting="font_italic" ${settings.font_italic ? 'checked' : ''}>
                        Cursiva
                    </label>
                    <label class="sfq-config-label">
                        <input type="checkbox" data-setting="font_bold" ${settings.font_bold ? 'checked' : ''}>
                        Negrita
                    </label>
                </div>
                
                <div class="sfq-config-row">
                    <label class="sfq-config-label">
                        <input type="checkbox" data-setting="font_strikethrough" ${settings.font_strikethrough ? 'checked' : ''}>
                        Tachado
                    </label>
                    <label class="sfq-config-label">
                        <input type="checkbox" data-setting="text_shadow" ${settings.text_shadow ? 'checked' : ''}>
                        Sombreado de letra
                    </label>
                </div>
                
                <!-- Alineación -->
                <div class="sfq-config-row">
                    <label class="sfq-config-label">
                        Alineación del contenido:
                        <select class="sfq-config-input" data-setting="text_align">
                            <option value="center" ${settings.text_align === 'center' || !settings.text_align ? 'selected' : ''}>Centro</option>
                            <option value="left" ${settings.text_align === 'left' ? 'selected' : ''}>Izquierda</option>
                            <option value="right" ${settings.text_align === 'right' ? 'selected' : ''}>Derecha</option>
                        </select>
                    </label>
                    <label class="sfq-config-label">
                        Color del texto:
                        <input type="color" class="sfq-config-input" data-setting="text_color" 
                               value="${settings.text_color || '#ffffff'}">
                    </label>
                </div>
                
                <!-- Configuración del fondo -->
                <h6 style="margin-top: 15px; margin-bottom: 10px;">🎨 Fondo del Botón</h6>
                
                <div class="sfq-config-row">
                    <label class="sfq-config-label">
                        Color de fondo:
                        <input type="color" class="sfq-config-input" data-setting="background_color" 
                               value="${settings.background_color || '#007cba'}">
                    </label>
                    <label class="sfq-config-label">
                        Opacidad del fondo:
                        <input type="range" class="sfq-config-input" data-setting="background_opacity" 
                               min="0" max="1" step="0.1" 
                               value="${settings.background_opacity || '1'}">
                        <span class="sfq-button-bg-opacity-display">${settings.background_opacity || '1'}</span>
                    </label>
                </div>
                
                <!-- Configuración del borde -->
                <h6 style="margin-top: 15px; margin-bottom: 10px;">📦 Borde del Botón</h6>
                
                <div class="sfq-config-row">
                    <label class="sfq-config-label">
                        Color del borde:
                        <input type="color" class="sfq-config-input" data-setting="border_color" 
                               value="${settings.border_color || '#007cba'}">
                    </label>
                    <label class="sfq-config-label">
                        Opacidad del borde:
                        <input type="range" class="sfq-config-input" data-setting="border_opacity" 
                               min="0" max="1" step="0.1" 
                               value="${settings.border_opacity || '1'}">
                        <span class="sfq-button-border-opacity-display">${settings.border_opacity || '1'}</span>
                    </label>
                </div>
                
                <div class="sfq-config-row">
                    <label class="sfq-config-label">
                        Radio del borde:
                        <input type="range" class="sfq-config-input" data-setting="border_radius" 
                               min="0" max="50" step="1" 
                               value="${settings.border_radius || '8'}">
                        <span class="sfq-button-border-radius-display">${settings.border_radius || '8'}px</span>
                    </label>
                    <label class="sfq-config-label">
                        <input type="checkbox" data-setting="box_shadow" ${settings.box_shadow ? 'checked' : ''}>
                        Sombreado del recuadro
                    </label>
                </div>
                
                <!-- CSS Selector personalizado -->
                <h6 style="margin-top: 15px; margin-bottom: 10px;">🔧 Seguimiento Avanzado</h6>
                
                <label class="sfq-config-label">
                    CSS Selector personalizado:
                    <input type="text" class="sfq-config-input" data-setting="css_selector" 
                           value="${this.formBuilder.uiRenderer.escapeHtml(settings.css_selector || '')}" 
                           placeholder="Ej: btn-custom-tracking">
                    <small>Clase CSS adicional para herramientas de seguimiento (Google Analytics, etc.)</small>
                </label>
            `;
        }
        
        createRatingConfig(element) {
            const settings = element.settings || {};
            return `
                <h5>⭐ Configuración de Valoración</h5>
                <div class="sfq-config-row">
                    <label class="sfq-config-label">
                        Tipo de valoración:
                        <select class="sfq-config-input" data-setting="rating_type">
                            <option value="stars" ${settings.rating_type === 'stars' ? 'selected' : ''}>Estrellas</option>
                            <option value="hearts" ${settings.rating_type === 'hearts' ? 'selected' : ''}>Corazones</option>
                            <option value="emojis" ${settings.rating_type === 'emojis' ? 'selected' : ''}>Emojis personalizados</option>
                        </select>
                    </label>
                    <label class="sfq-config-label">
                        Máximo:
                        <input type="number" class="sfq-config-input" data-setting="max_rating" 
                               value="${settings.max_rating || 5}" 
                               min="2" max="10">
                    </label>
                </div>
                <div class="sfq-emoji-config" style="display: ${settings.rating_type === 'emojis' ? 'block' : 'none'};">
                    <label class="sfq-config-label">
                        Emojis (separados por comas):
                        <input type="text" class="sfq-config-input" data-setting="icons" 
                               value="${(settings.icons || []).join(', ')}" 
                               placeholder="😞, 😐, 🙂, 😊, 😍">
                        <small>Uno por cada nivel de valoración</small>
                    </label>
                </div>
            `;
        }
        
        createDropdownConfig(element) {
            const settings = element.settings || {};
            const options = settings.options || [];
            return `
                <h5>📋 Configuración de Desplegable</h5>
                <label class="sfq-config-label">
                    Placeholder:
                    <input type="text" class="sfq-config-input" data-setting="placeholder" 
                           value="${this.formBuilder.uiRenderer.escapeHtml(settings.placeholder || '')}" 
                           placeholder="Selecciona una opción...">
                </label>
                <div class="sfq-dropdown-options">
                    <label class="sfq-config-label">Opciones:</label>
                    <div class="sfq-options-list" data-setting="options">
                        ${options.map((option, index) => `
                            <div class="sfq-option-row">
                                <input type="text" placeholder="Texto de la opción" 
                                       value="${this.formBuilder.uiRenderer.escapeHtml(option.text || '')}" 
                                       data-option-field="text" data-option-index="${index}">
                                <input type="text" placeholder="Valor (opcional)" 
                                       value="${this.formBuilder.uiRenderer.escapeHtml(option.value || '')}" 
                                       data-option-field="value" data-option-index="${index}">
                                <button type="button" class="sfq-remove-option">×</button>
                            </div>
                        `).join('')}
                    </div>
                    <button type="button" class="sfq-add-dropdown-option">+ Añadir opción</button>
                </div>
            `;
        }
        
        createCheckboxConfig(element) {
            const settings = element.settings || {};
            return `
                <h5>☑️ Configuración de Checkbox</h5>
                <label class="sfq-config-label">
                    Texto del checkbox:
                    <input type="text" class="sfq-config-input" data-setting="checkbox_text" 
                           value="${this.formBuilder.uiRenderer.escapeHtml(settings.checkbox_text || '')}" 
                           placeholder="Ej: Acepto los términos y condiciones">
                </label>
                <label class="sfq-config-label">
                    <input type="checkbox" data-setting="required_check" ${settings.required_check ? 'checked' : ''}>
                    Marcar como obligatorio
                </label>
            `;
        }
        
        createImageConfig(element) {
            const settings = element.settings || {};
            return `
                <h5>🖼️ Configuración de Imagen</h5>
                <label class="sfq-config-label">
                    URL de la imagen:
                    <input type="url" class="sfq-config-input" data-setting="image_url" 
                           value="${this.formBuilder.uiRenderer.escapeHtml(settings.image_url || '')}" 
                           placeholder="https://ejemplo.com/imagen.jpg">
                </label>
                <label class="sfq-config-label">
                    Texto alternativo:
                    <input type="text" class="sfq-config-input" data-setting="alt_text" 
                           value="${this.formBuilder.uiRenderer.escapeHtml(settings.alt_text || '')}" 
                           placeholder="Descripción de la imagen">
                </label>
                <div class="sfq-config-row">
                    <label class="sfq-config-label">
                        Ancho:
                        <input type="text" class="sfq-config-input" data-setting="width" 
                               value="${this.formBuilder.uiRenderer.escapeHtml(settings.width || 'auto')}" 
                               placeholder="auto, 300px, 50%">
                    </label>
                    <label class="sfq-config-label">
                        Alto:
                        <input type="text" class="sfq-config-input" data-setting="height" 
                               value="${this.formBuilder.uiRenderer.escapeHtml(settings.height || 'auto')}" 
                               placeholder="auto, 200px">
                    </label>
                </div>
                <label class="sfq-config-label">
                    <input type="checkbox" data-setting="clickable" ${settings.clickable ? 'checked' : ''}>
                    Imagen clickeable (registra clics)
                </label>
            `;
        }
        
        createCountdownConfig(element) {
            const settings = element.settings || {};
            return `
                <h5>⏰ Configuración de Cuenta Atrás</h5>
                <label class="sfq-config-label">
                    Fecha objetivo:
                    <input type="datetime-local" class="sfq-config-input" data-setting="target_date" 
                           value="${settings.target_date || ''}">
                </label>
                <label class="sfq-config-label">
                    Texto antes del contador:
                    <input type="text" class="sfq-config-input" data-setting="countdown_text" 
                           value="${this.formBuilder.uiRenderer.escapeHtml(settings.countdown_text || '')}" 
                           placeholder="Tiempo restante:">
                </label>
                <label class="sfq-config-label">
                    Texto cuando termine:
                    <input type="text" class="sfq-config-input" data-setting="finished_text" 
                           value="${this.formBuilder.uiRenderer.escapeHtml(settings.finished_text || '')}" 
                           placeholder="¡Tiempo agotado!">
                </label>
            `;
        }
        
        createFileUploadConfig(element) {
            const settings = element.settings || {};
            return `
                <h5>📤 Configuración de Subida de Archivo</h5>
                <label class="sfq-config-label">
                    Tipos de archivo permitidos:
                    <select class="sfq-config-input" data-setting="accept">
                        <option value="image/*" ${settings.accept === 'image/*' ? 'selected' : ''}>Solo imágenes</option>
                        <option value=".pdf" ${settings.accept === '.pdf' ? 'selected' : ''}>Solo PDF</option>
                        <option value=".doc,.docx" ${settings.accept === '.doc,.docx' ? 'selected' : ''}>Solo Word</option>
                        <option value="*" ${settings.accept === '*' ? 'selected' : ''}>Todos los archivos</option>
                    </select>
                </label>
                <div class="sfq-config-row">
                    <label class="sfq-config-label">
                        Tamaño máximo:
                        <select class="sfq-config-input" data-setting="max_size">
                            <option value="1MB" ${settings.max_size === '1MB' ? 'selected' : ''}>1 MB</option>
                            <option value="5MB" ${settings.max_size === '5MB' ? 'selected' : ''}>5 MB</option>
                            <option value="10MB" ${settings.max_size === '10MB' ? 'selected' : ''}>10 MB</option>
                            <option value="25MB" ${settings.max_size === '25MB' ? 'selected' : ''}>25 MB</option>
                        </select>
                    </label>
                    <label class="sfq-config-label">
                        <input type="checkbox" data-setting="multiple" ${settings.multiple ? 'checked' : ''}>
                        Múltiples archivos
                    </label>
                </div>
            `;
        }
        
        createLegalTextConfig(element) {
            const settings = element.settings || {};
            return `
                <h5>⚖️ Configuración de Texto Legal</h5>
                <label class="sfq-config-label">
                    Contenido del texto:
                    <textarea class="sfq-config-input" data-setting="text_content" rows="4" 
                              placeholder="Introduce aquí el texto legal, términos y condiciones, política de privacidad, etc.">${this.formBuilder.uiRenderer.escapeHtml(settings.text_content || '')}</textarea>
                    <small>Puedes usar HTML básico para formato</small>
                </label>
                <label class="sfq-config-label">
                    <input type="checkbox" data-setting="require_acceptance" ${settings.require_acceptance ? 'checked' : ''}>
                    Requiere aceptación (checkbox)
                </label>
                <div class="sfq-acceptance-config" style="display: ${settings.require_acceptance ? 'block' : 'none'};">
                    <label class="sfq-config-label">
                        Texto de aceptación:
                        <input type="text" class="sfq-config-input" data-setting="acceptance_text" 
                               value="${this.formBuilder.uiRenderer.escapeHtml(settings.acceptance_text || '')}" 
                               placeholder="He leído y acepto">
                    </label>
                </div>
            `;
        }
        
        createVariableDisplayConfig(element) {
            const settings = element.settings || {};
            const variables = this.formBuilder.getGlobalVariables() || [];
            
            // Generar opciones del desplegable de variables
            let variableOptions = '<option value="">Selecciona una variable...</option>';
            variables.forEach(variable => {
                const isSelected = settings.variable_name === variable.name ? 'selected' : '';
                variableOptions += `<option value="${variable.name}" ${isSelected}>
                    ${this.formBuilder.uiRenderer.escapeHtml(variable.name)} (${variable.type})
                </option>`;
            });
            
            return `
                <h5>🔢 Configuración de Mostrar Variable</h5>
                
                <!-- Selección de variable -->
                <label class="sfq-config-label">
                    Variable a mostrar:
                    <select class="sfq-config-input" data-setting="variable_name">
                        ${variableOptions}
                    </select>
                    <small>Selecciona la variable cuyo valor quieres mostrar</small>
                </label>
                
                <!-- Valor de preview para el admin -->
                <label class="sfq-config-label">
                    Valor de ejemplo (solo para vista previa):
                    <input type="text" class="sfq-config-input" data-setting="preview_value" 
                           value="${this.formBuilder.uiRenderer.escapeHtml(settings.preview_value || '0')}" 
                           placeholder="Ej: 100, Excelente, true">
                    <small>Este valor solo se usa para la vista previa en el admin</small>
                </label>
                
                <!-- Configuración de estilo -->
                <h6 style="margin-top: 20px; margin-bottom: 10px;">🎨 Configuración de Estilo</h6>
                
                <div class="sfq-config-row">
                    <label class="sfq-config-label">
                        Tamaño de fuente:
                        <select class="sfq-config-input" data-setting="font_size">
                            <option value="12" ${settings.font_size === '12' ? 'selected' : ''}>12px</option>
                            <option value="14" ${settings.font_size === '14' ? 'selected' : ''}>14px</option>
                            <option value="16" ${settings.font_size === '16' || !settings.font_size ? 'selected' : ''}>16px</option>
                            <option value="18" ${settings.font_size === '18' ? 'selected' : ''}>18px</option>
                            <option value="20" ${settings.font_size === '20' ? 'selected' : ''}>20px</option>
                            <option value="24" ${settings.font_size === '24' ? 'selected' : ''}>24px</option>
                            <option value="28" ${settings.font_size === '28' ? 'selected' : ''}>28px</option>
                            <option value="32" ${settings.font_size === '32' ? 'selected' : ''}>32px</option>
                        </select>
                    </label>
                    <label class="sfq-config-label">
                        Peso de fuente:
                        <select class="sfq-config-input" data-setting="font_weight">
                            <option value="normal" ${settings.font_weight === 'normal' || !settings.font_weight ? 'selected' : ''}>Normal</option>
                            <option value="bold" ${settings.font_weight === 'bold' ? 'selected' : ''}>Negrita</option>
                            <option value="lighter" ${settings.font_weight === 'lighter' ? 'selected' : ''}>Ligera</option>
                        </select>
                    </label>
                </div>
                
                <div class="sfq-config-row">
                    <label class="sfq-config-label">
                        Alineación:
                        <select class="sfq-config-input" data-setting="text_align">
                            <option value="left" ${settings.text_align === 'left' ? 'selected' : ''}>Izquierda</option>
                            <option value="center" ${settings.text_align === 'center' || !settings.text_align ? 'selected' : ''}>Centro</option>
                            <option value="right" ${settings.text_align === 'right' ? 'selected' : ''}>Derecha</option>
                        </select>
                    </label>
                    <label class="sfq-config-label">
                        <input type="checkbox" data-setting="text_shadow" ${settings.text_shadow ? 'checked' : ''}>
                        Sombra de texto
                    </label>
                </div>
                
                <!-- Colores -->
                <h6 style="margin-top: 15px; margin-bottom: 10px;">🎨 Colores</h6>
                
                <div class="sfq-config-row variable-display-colors">
                    <label class="sfq-config-label">
                        Color de texto:
                        <input type="color" class="sfq-config-input" data-setting="text_color" 
                               value="${settings.text_color || '#333333'}">
                    </label>
                    <label class="sfq-config-label">
                        Color del borde:
                        <input type="color" class="sfq-config-input" data-setting="border_color" 
                               value="${settings.border_color || '#e9ecef'}">
                    </label>
                </div>
                
                <div class="sfq-config-row variable-display-colors">
                    <label class="sfq-config-label">
                        Opacidad del borde:
                        <input type="range" class="sfq-config-input" data-setting="border_opacity" 
                               min="0" max="1" step="0.1" 
                               value="${settings.border_opacity || '1'}">
                        <span class="sfq-border-opacity-display">${settings.border_opacity || '1'}</span>
                    </label>
                    <label class="sfq-config-label">
                        Color de fondo:
                        <input type="color" class="sfq-config-input" data-setting="background_color" 
                               value="${settings.background_color || '#f8f9fa'}">
                    </label>
                </div>
                
                <div class="sfq-config-row variable-display-colors">
                    <label class="sfq-config-label">
                        Opacidad del fondo:
                        <input type="range" class="sfq-config-input" data-setting="background_opacity" 
                               min="0" max="1" step="0.1" 
                               value="${settings.background_opacity || '1'}">
                        <span class="sfq-opacity-display">${settings.background_opacity || '1'}</span>
                    </label>
                </div>
                
                <!-- Configuración del recuadro -->
                <h6 style="margin-top: 15px; margin-bottom: 10px;">📦 Recuadro</h6>
                
                <label class="sfq-config-label">
                    Radio del borde:
                    <input type="range" class="sfq-config-input" data-setting="border_radius" 
                           min="0" max="50" step="1" 
                           value="${settings.border_radius || '8'}">
                    <span class="sfq-radius-display">${settings.border_radius || '8'}px</span>
                </label>
            `;
        }
        
        createStyledTextConfig(element) {
            const settings = element.settings || {};
            
            return `
                <h5>✨ Configuración de Texto Estilizado</h5>
                
                <!-- Contenido del texto -->
                <label class="sfq-config-label">
                    Contenido del texto:
                    <textarea class="sfq-config-input" data-setting="text_content" rows="3" 
                              placeholder="Escribe aquí el texto que quieres mostrar">${this.formBuilder.uiRenderer.escapeHtml(settings.text_content || '')}</textarea>
                    <small>Este es el texto que verán los usuarios</small>
                </label>
                
                <!-- Tipo de texto -->
                <label class="sfq-config-label">
                    Tipo de elemento:
                    <select class="sfq-config-input" data-setting="text_type">
                        <option value="paragraph" ${settings.text_type === 'paragraph' || !settings.text_type ? 'selected' : ''}>Párrafo</option>
                        <option value="title" ${settings.text_type === 'title' ? 'selected' : ''}>Título</option>
                    </select>
                    <small>Los títulos tienen mayor peso visual que los párrafos</small>
                </label>
                
                <!-- ✅ NUEVO: Configuración de ancho personalizado -->
                <h6 style="margin-top: 20px; margin-bottom: 10px;">📏 Ancho del Elemento</h6>
                
                <div class="sfq-config-row">
                    <label class="sfq-config-label">
                        Ancho:
                        <select class="sfq-config-input" data-setting="width_type">
                            <option value="auto" ${settings.width_type === 'auto' || !settings.width_type ? 'selected' : ''}>Automático</option>
                            <option value="full" ${settings.width_type === 'full' ? 'selected' : ''}>Ancho completo (100%)</option>
                            <option value="custom" ${settings.width_type === 'custom' ? 'selected' : ''}>Personalizado</option>
                        </select>
                    </label>
                    <label class="sfq-config-label sfq-custom-width-setting" style="display: ${settings.width_type === 'custom' ? 'block' : 'none'};">
                        Ancho personalizado:
                        <input type="number" class="sfq-config-input" data-setting="custom_width" 
                               min="50" max="1200" step="10" 
                               value="${settings.custom_width || '300'}"
                               placeholder="300">
                        <small>Ancho en píxeles (50-1200px)</small>
                    </label>
                </div>
                
                <div class="sfq-config-row sfq-container-alignment-setting" style="display: ${settings.width_type === 'custom' || settings.width_type === 'full' ? 'block' : 'none'};">
                    <label class="sfq-config-label">
                        Alineación del contenedor:
                        <select class="sfq-config-input" data-setting="container_align">
                            <option value="left" ${settings.container_align === 'left' ? 'selected' : ''}>Izquierda</option>
                            <option value="center" ${settings.container_align === 'center' || !settings.container_align ? 'selected' : ''}>Centro</option>
                            <option value="right" ${settings.container_align === 'right' ? 'selected' : ''}>Derecha</option>
                        </select>
                        <small>Controla dónde se posiciona el elemento dentro del contenedor</small>
                    </label>
                </div>
                
                <!-- Configuración de tipografía -->
                <h6 style="margin-top: 20px; margin-bottom: 10px;">🔤 Tipografía</h6>
                
                <div class="sfq-config-row">
                    <label class="sfq-config-label">
                        Familia de fuente:
                        <select class="sfq-config-input" data-setting="font_family">
                            <option value="inherit" ${settings.font_family === 'inherit' || !settings.font_family ? 'selected' : ''}>Por defecto</option>
                            <option value="Arial, sans-serif" ${settings.font_family === 'Arial, sans-serif' ? 'selected' : ''}>Arial</option>
                            <option value="'Times New Roman', serif" ${settings.font_family === "'Times New Roman', serif" ? 'selected' : ''}>Times New Roman</option>
                            <option value="'Courier New', monospace" ${settings.font_family === "'Courier New', monospace" ? 'selected' : ''}>Courier New</option>
                            <option value="Georgia, serif" ${settings.font_family === 'Georgia, serif' ? 'selected' : ''}>Georgia</option>
                            <option value="Verdana, sans-serif" ${settings.font_family === 'Verdana, sans-serif' ? 'selected' : ''}>Verdana</option>
                            <option value="'Trebuchet MS', sans-serif" ${settings.font_family === "'Trebuchet MS', sans-serif" ? 'selected' : ''}>Trebuchet MS</option>
                        </select>
                    </label>
                    <label class="sfq-config-label">
                        Tamaño de fuente:
                        <input type="range" class="sfq-config-input" data-setting="font_size" 
                               min="12" max="48" step="1" 
                               value="${settings.font_size || '16'}">
                        <span class="sfq-font-size-display">${settings.font_size || '16'}px</span>
                    </label>
                </div>
                
                <div class="sfq-config-row">
                    <label class="sfq-config-label">
                        Peso de fuente:
                        <select class="sfq-config-input" data-setting="font_weight">
                            <option value="normal" ${settings.font_weight === 'normal' || !settings.font_weight ? 'selected' : ''}>Normal</option>
                            <option value="bold" ${settings.font_weight === 'bold' ? 'selected' : ''}>Negrita</option>
                            <option value="lighter" ${settings.font_weight === 'lighter' ? 'selected' : ''}>Ligera</option>
                            <option value="600" ${settings.font_weight === '600' ? 'selected' : ''}>Semi-negrita</option>
                        </select>
                    </label>
                    <label class="sfq-config-label">
                        Alineación:
                        <select class="sfq-config-input" data-setting="text_align">
                            <option value="left" ${settings.text_align === 'left' || !settings.text_align ? 'selected' : ''}>Izquierda</option>
                            <option value="center" ${settings.text_align === 'center' ? 'selected' : ''}>Centro</option>
                            <option value="right" ${settings.text_align === 'right' ? 'selected' : ''}>Derecha</option>
                            <option value="justify" ${settings.text_align === 'justify' ? 'selected' : ''}>Justificado</option>
                        </select>
                    </label>
                </div>
                
                <!-- Efectos de texto -->
                <h6 style="margin-top: 15px; margin-bottom: 10px;">✨ Efectos de Texto</h6>
                
                <div class="sfq-config-row">
                    <label class="sfq-config-label">
                        <input type="checkbox" data-setting="italic" ${settings.italic ? 'checked' : ''}>
                        Cursiva
                    </label>
                    <label class="sfq-config-label">
                        <input type="checkbox" data-setting="strikethrough" ${settings.strikethrough ? 'checked' : ''}>
                        Tachado
                    </label>
                </div>
                
                <div class="sfq-config-row">
                    <label class="sfq-config-label">
                        <input type="checkbox" data-setting="text_shadow" ${settings.text_shadow ? 'checked' : ''}>
                        Sombra de texto
                    </label>
                    <label class="sfq-config-label">
                        <input type="checkbox" data-setting="box_shadow" ${settings.box_shadow ? 'checked' : ''}>
                        Sombra del recuadro
                    </label>
                </div>
                
                <!-- Colores -->
                <h6 style="margin-top: 15px; margin-bottom: 10px;">🎨 Colores</h6>
                
                <div class="sfq-config-row">
                    <label class="sfq-config-label">
                        Color del texto:
                        <input type="color" class="sfq-config-input" data-setting="text_color" 
                               value="${settings.text_color || '#333333'}">
                    </label>
                    <label class="sfq-config-label">
                        Color de fondo:
                        <input type="color" class="sfq-config-input" data-setting="background_color" 
                               value="${settings.background_color || '#ffffff'}">
                    </label>
                </div>
                
                <div class="sfq-config-row">
                    <label class="sfq-config-label">
                        Opacidad del fondo:
                        <input type="range" class="sfq-config-input" data-setting="background_opacity" 
                               min="0" max="1" step="0.1" 
                               value="${settings.background_opacity || '0'}">
                        <span class="sfq-bg-opacity-display">${settings.background_opacity || '0'}</span>
                    </label>
                    <label class="sfq-config-label">
                        Color del borde:
                        <input type="color" class="sfq-config-input" data-setting="border_color" 
                               value="${settings.border_color || '#e0e0e0'}">
                    </label>
                </div>
                
                <!-- Configuración del recuadro -->
                <h6 style="margin-top: 15px; margin-bottom: 10px;">📦 Recuadro</h6>
                
                <div class="sfq-config-row">
                    <label class="sfq-config-label">
                        Radio del borde:
                        <input type="range" class="sfq-config-input" data-setting="border_radius" 
                               min="0" max="50" step="1" 
                               value="${settings.border_radius || '0'}">
                        <span class="sfq-border-radius-display">${settings.border_radius || '0'}px</span>
                    </label>
                    <label class="sfq-config-label">
                        Opacidad del borde:
                        <input type="range" class="sfq-config-input" data-setting="border_opacity" 
                               min="0" max="1" step="0.1" 
                               value="${settings.border_opacity || '0'}">
                        <span class="sfq-border-opacity-display">${settings.border_opacity || '0'}</span>
                    </label>
                </div>
            `;
        }
        
        bindConfigPanelEvents($panel, questionId, elementId) {
            const question = this.questions.find(q => q.id === questionId);
            const element = question?.freestyle_elements?.find(el => el.id === elementId);
            
            if (!element) return;
            
            const self = this;
            const eventNamespace = '.config_' + elementId; // ✅ NUEVO: Namespace único
            
            // ✅ NUEVO: Validar tipo de elemento
            const panelElementType = $panel.data('element-type');
            if (panelElementType && panelElementType !== element.type) {
                console.error('SFQ: Element type mismatch in config panel:', panelElementType, 'vs', element.type);
                return;
            }
            
            // Limpiar eventos previos con namespace
            $panel.find('.sfq-config-close, .sfq-config-cancel').off(eventNamespace);
            
            // Cerrar panel con namespace específico
            $panel.find('.sfq-config-close, .sfq-config-cancel').on('click' + eventNamespace, function() {
                $panel.slideUp(300, function() {
                    $(this).remove();
                });
            });
            
            // Limpiar eventos previos con namespace
            $panel.find('.sfq-config-save').off(eventNamespace);
            
            // Guardar cambios con namespace específico
            $panel.find('.sfq-config-save').on('click' + eventNamespace, function() {
                // ✅ NUEVO: Validación adicional de tipo
                if ($panel.data('element-type') && $panel.data('element-type') !== element.type) {
                    console.warn('SFQ: Type validation failed during save');
                    return;
                }
                
                // Actualizar etiqueta básica
                const newLabel = $panel.find('.sfq-element-label-config').val();
                element.label = newLabel;
                
                // Actualizar configuraciones específicas
                $panel.find('[data-setting]').each(function() {
                    const $field = $(this);
                    const setting = $field.data('setting');
                    let value;
                    
                    if ($field.is(':checkbox')) {
                        value = $field.is(':checked');
                    } else if ($field.is('select')) {
                        value = $field.val();
                    } else {
                        value = $field.val();
                    }
                    
                    // Inicializar settings si no existe
                    if (!element.settings) {
                        element.settings = {};
                    }
                    
                    // ✅ CRÍTICO: Log para debugging del problema con variable_name
                    if (setting === 'variable_name') {
                        console.log('SFQ: Saving variable_name setting:', value);
                        console.log('SFQ: Field type:', $field.prop('tagName'), 'Value:', $field.val());
                    }
                    
                    element.settings[setting] = value;
                    
                    // ✅ VERIFICACIÓN: Log después del guardado
                    if (setting === 'variable_name') {
                        console.log('SFQ: variable_name saved in element.settings:', element.settings[setting]);
                    }
                });
                
                // Manejar opciones de dropdown especialmente
                if (element.type === 'dropdown') {
                    const options = [];
                    $panel.find('.sfq-option-row').each(function() {
                        const text = $(this).find('[data-option-field="text"]').val();
                        const value = $(this).find('[data-option-field="value"]').val();
                        if (text) {
                            options.push({ text: text, value: value || text });
                        }
                    });
                    element.settings.options = options;
                }
                
                // Manejar iconos de rating como array
                if (element.type === 'rating' && element.settings.icons) {
                    if (typeof element.settings.icons === 'string') {
                        element.settings.icons = element.settings.icons.split(',').map(icon => icon.trim());
                    }
                }
                
                // Re-renderizar elementos para mostrar cambios
                const $elementsContainer = $(`#freestyle-elements-${questionId}`);
                const elementsHtml = self.formBuilder.uiRenderer.renderFreestyleElements(question.freestyle_elements);
                $elementsContainer.html(elementsHtml);
                
                // Rebind events
                self.bindFreestyleElementEvents(questionId);
                
                // Mark as dirty
                self.formBuilder.isDirty = true;
                
                // Cerrar panel
                $panel.slideUp(300, function() {
                    $(this).remove();
                });
            });
            
            // Eventos específicos para diferentes tipos de elementos
            
            // Mostrar/ocultar filas de textarea según multiline
            $panel.find('[data-setting="multiline"]').on('change', function() {
                const $rowsLabel = $panel.find('[data-setting="rows"]').closest('.sfq-config-label');
                if ($(this).is(':checked')) {
                    $rowsLabel.show();
                } else {
                    $rowsLabel.hide();
                }
            });
            
            // Mostrar/ocultar configuración de emojis según tipo de rating
            $panel.find('[data-setting="rating_type"]').on('change', function() {
                const $emojiConfig = $panel.find('.sfq-emoji-config');
                if ($(this).val() === 'emojis') {
                    $emojiConfig.show();
                } else {
                    $emojiConfig.hide();
                }
            });
            
            // Mostrar/ocultar texto de aceptación según require_acceptance
            $panel.find('[data-setting="require_acceptance"]').on('change', function() {
                const $acceptanceConfig = $panel.find('.sfq-acceptance-config');
                if ($(this).is(':checked')) {
                    $acceptanceConfig.show();
                } else {
                    $acceptanceConfig.hide();
                }
            });
            
            // Eventos específicos para variable_display
            $panel.find('[data-setting="background_opacity"]').on('input', function() {
                const value = $(this).val();
                $panel.find('.sfq-opacity-display').text(value);
            });
            
            $panel.find('[data-setting="border_opacity"]').on('input', function() {
                const value = $(this).val();
                $panel.find('.sfq-border-opacity-display').text(value);
            });
            
            $panel.find('[data-setting="border_radius"]').on('input', function() {
                const value = $(this).val();
                $panel.find('.sfq-radius-display').text(value + 'px');
            });
            
            // Eventos específicos para styled_text
            $panel.find('[data-setting="font_size"]').on('input', function() {
                const value = $(this).val();
                $panel.find('.sfq-font-size-display').text(value + 'px');
            });
            
            $panel.find('[data-setting="background_opacity"]').on('input', function() {
                const value = $(this).val();
                $panel.find('.sfq-bg-opacity-display').text(value);
            });
            
            $panel.find('[data-setting="border_radius"]').on('input', function() {
                const value = $(this).val();
                $panel.find('.sfq-border-radius-display').text(value + 'px');
            });
            
            $panel.find('[data-setting="border_opacity"]').on('input', function() {
                const value = $(this).val();
                $panel.find('.sfq-border-opacity-display').text(value);
            });
            
            // Evento específico para mostrar/ocultar el campo de ancho personalizado
            $panel.find('[data-setting="width_type"]').on('change', function() {
                const $customWidthSetting = $panel.find('.sfq-custom-width-setting');
                const $containerAlignmentSetting = $panel.find('.sfq-container-alignment-setting');
                const widthType = $(this).val();
                
                if (widthType === 'custom') {
                    $customWidthSetting.show();
                    $containerAlignmentSetting.show();
                } else if (widthType === 'full') {
                    $customWidthSetting.hide();
                    $containerAlignmentSetting.show();
                } else {
                    $customWidthSetting.hide();
                    $containerAlignmentSetting.hide();
                }
            });
            
            // Eventos específicos para button (nuevas opciones de estilo)
            $panel.find('[data-setting="font_size"]').on('input', function() {
                const value = $(this).val();
                $panel.find('.sfq-button-font-size-display').text(value + 'px');
            });
            
            $panel.find('[data-setting="background_opacity"]').on('input', function() {
                const value = $(this).val();
                $panel.find('.sfq-button-bg-opacity-display').text(value);
            });
            
            $panel.find('[data-setting="border_opacity"]').on('input', function() {
                const value = $(this).val();
                $panel.find('.sfq-button-border-opacity-display').text(value);
            });
            
            $panel.find('[data-setting="border_radius"]').on('input', function() {
                const value = $(this).val();
                $panel.find('.sfq-button-border-radius-display').text(value + 'px');
            });
            
            // Manejar opciones de dropdown dinámicamente
            $panel.find('.sfq-add-dropdown-option').on('click', function() {
                const $optionsList = $panel.find('.sfq-options-list');
                const index = $optionsList.find('.sfq-option-row').length;
                
                const optionHtml = `
                    <div class="sfq-option-row">
                        <input type="text" placeholder="Texto de la opción" 
                               value="" 
                               data-option-field="text" data-option-index="${index}">
                        <input type="text" placeholder="Valor (opcional)" 
                               value="" 
                               data-option-field="value" data-option-index="${index}">
                        <button type="button" class="sfq-remove-option">×</button>
                    </div>
                `;
                
                $optionsList.append(optionHtml);
                
                // Bind remove event for new option
                $optionsList.find('.sfq-option-row:last .sfq-remove-option').on('click', function() {
                    $(this).closest('.sfq-option-row').remove();
                });
            });
            
            // Remover opciones de dropdown
            $panel.find('.sfq-remove-option').on('click', function() {
                $(this).closest('.sfq-option-row').remove();
            });
        }

        bindOptionEvents(questionId) {
            const $question = $(`#${questionId}`);
            const question = this.questions.find(q => q.id === questionId);
            
            if (!question) return;
            
            const self = this; // Guardar referencia al contexto correcto
            
            // Remove option
            $question.find('.sfq-option-remove').off('click').on('click', function() {
                const $option = $(this).closest('.sfq-option-item');
                const optionIndex = $option.index();
                
                if ($question.find('.sfq-option-item').length > 2) {
                    $option.remove();
                    question.options.splice(optionIndex, 1);
                    self.formBuilder.isDirty = true; // Usar self en lugar de this
                } else {
                    alert('Debe haber al menos 2 opciones');
                }
            });
            
            // Update option text
            $question.find('.sfq-option-input').off('input').on('input', function() {
                const $option = $(this).closest('.sfq-option-item');
                const optionIndex = $option.index();
                const value = $(this).val();
                
                if (question.options[optionIndex]) {
                    question.options[optionIndex] = { 
                        text: value, 
                        value: value,
                        image: question.options[optionIndex].image || '',
                        image_id: question.options[optionIndex].image_id || '',
                        image_alt: question.options[optionIndex].image_alt || ''
                    };
                } else {
                    question.options.push({ text: value, value: value, image: '', image_id: '', image_alt: '' });
                }
                self.formBuilder.isDirty = true; // Usar self en lugar de this
            });
            
            // ✅ NUEVO: Eventos específicos para image_choice
            if (question.type === 'image_choice') {
                this.bindImageChoiceEvents($question, question);
            }
        }

        /**
         * ✅ NUEVO: Bind events específicos para preguntas de tipo image_choice
         */
        bindImageChoiceEvents($question, question) {
            const self = this;
            
            // Evento para abrir WordPress Media Library
            $question.find('.sfq-upload-image-btn').off('click').on('click', function(e) {
                e.preventDefault();
                
                const $button = $(this);
                const $optionItem = $button.closest('.sfq-option-item');
                const optionIndex = $optionItem.index();
                
                self.openMediaLibrary($button, $optionItem, question, optionIndex);
            });
            
            // Evento para URL manual
            $question.find('.sfq-image-url-input').off('input').on('input', function() {
                const $input = $(this);
                const url = $input.val().trim();
                const $optionItem = $input.closest('.sfq-option-item');
                const optionIndex = $optionItem.index();
                
                if (url && self.isValidImageUrl(url)) {
                    // Actualizar datos de la opción
                    if (question.options[optionIndex]) {
                        question.options[optionIndex].image = url;
                        question.options[optionIndex].image_id = '';
                        question.options[optionIndex].image_alt = '';
                    }
                    
                    // Mostrar preview
                    self.updateImagePreview($optionItem, {
                        url: url,
                        alt: 'Imagen desde URL'
                    });
                    
                    // Marcar input como válido
                    $input.removeClass('invalid').addClass('valid');
                } else if (url) {
                    // URL inválida
                    $input.removeClass('valid').addClass('invalid');
                    self.hideImagePreview($optionItem);
                } else {
                    // Campo vacío
                    $input.removeClass('valid invalid');
                    self.hideImagePreview($optionItem);
                    
                    // Limpiar datos de imagen
                    if (question.options[optionIndex]) {
                        question.options[optionIndex].image = '';
                        question.options[optionIndex].image_id = '';
                        question.options[optionIndex].image_alt = '';
                    }
                }
                
                self.formBuilder.isDirty = true;
            });
            
            // Evento para eliminar imagen
            $question.find('.sfq-remove-image').off('click').on('click', function(e) {
                e.preventDefault();
                
                const $optionItem = $(this).closest('.sfq-option-item');
                const optionIndex = $optionItem.index();
                
                self.removeImage($optionItem, question, optionIndex);
            });
        }

        /**
         * ✅ NUEVO: Abrir WordPress Media Library
         */
        openMediaLibrary($button, $optionItem, question, optionIndex) {
            // Verificar que wp.media esté disponible
            if (typeof wp === 'undefined' || !wp.media) {
                alert('Error: WordPress Media Library no está disponible. Asegúrate de que wp_enqueue_media() esté cargado.');
                console.error('SFQ: wp.media is not available. Make sure wp_enqueue_media() is called.');
                return;
            }
            
            console.log('SFQ: Opening Media Library for option', optionIndex);
            
            // Crear instancia del media uploader
            const mediaUploader = wp.media({
                title: 'Seleccionar Imagen para Opción',
                button: {
                    text: 'Usar esta imagen'
                },
                multiple: false,
                library: {
                    type: 'image' // ✅ SEGURIDAD: Solo imágenes
                }
            });
            
            // Evento cuando se selecciona una imagen
            mediaUploader.on('select', () => {
                const attachment = mediaUploader.state().get('selection').first().toJSON();
                
                console.log('SFQ: Selected attachment:', attachment);
                
                // ✅ VALIDACIÓN: Verificar que sea una imagen válida
                if (!this.isValidAttachment(attachment)) {
                    alert('Error: El archivo seleccionado no es una imagen válida');
                    return;
                }
                
                // Actualizar la opción con los datos de la imagen
                this.updateImageOption($optionItem, attachment, question, optionIndex);
            });
            
            // Abrir el uploader
            mediaUploader.open();
        }

        /**
         * ✅ NUEVO: Validar attachment de WordPress Media Library
         */
        isValidAttachment(attachment) {
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
            const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
            
            // Verificar tipo MIME
            if (!validTypes.includes(attachment.mime)) {
                console.error('SFQ: Invalid MIME type:', attachment.mime);
                return false;
            }
            
            // Verificar extensión
            if (attachment.filename) {
                const extension = attachment.filename.split('.').pop().toLowerCase();
                if (!validExtensions.includes(extension)) {
                    console.error('SFQ: Invalid file extension:', extension);
                    return false;
                }
            }
            
            // Verificar que tenga URL
            if (!attachment.url) {
                console.error('SFQ: No URL found in attachment');
                return false;
            }
            
            return true;
        }

        /**
         * ✅ NUEVO: Validar URL de imagen manual
         */
        isValidImageUrl(url) {
            // Verificar que sea una URL válida
            try {
                new URL(url);
            } catch {
                return false;
            }
            
            // Verificar extensión de imagen
            const validExtensions = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;
            return validExtensions.test(url);
        }

        /**
         * ✅ NUEVO: Actualizar opción con imagen seleccionada
         */
        updateImageOption($optionItem, attachment, question, optionIndex) {
            console.log('SFQ: Updating image option', optionIndex, 'with attachment:', attachment);
            
            // Actualizar input de URL
            $optionItem.find('.sfq-image-url-input').val(attachment.url).removeClass('invalid').addClass('valid');
            
            // Actualizar datos de la opción
            if (!question.options[optionIndex]) {
                question.options[optionIndex] = { text: '', value: '' };
            }
            
            question.options[optionIndex].image = attachment.url;
            question.options[optionIndex].image_id = attachment.id || '';
            question.options[optionIndex].image_alt = attachment.alt || attachment.title || '';
            
            console.log('SFQ: Updated option data:', question.options[optionIndex]);
            
            // Mostrar preview
            this.updateImagePreview($optionItem, {
                url: attachment.url,
                alt: attachment.alt || attachment.title || 'Imagen seleccionada'
            });
            
            // Marcar formulario como modificado
            this.formBuilder.isDirty = true;
        }

        /**
         * ✅ CORREGIDO: Mostrar preview de imagen con verificaciones robustas
         */
        updateImagePreview($optionItem, imageData) {
            console.log('SFQ: Updating image preview with data:', imageData);
            
            const $previewContainer = $optionItem.find('.sfq-image-preview-container');
            
            if ($previewContainer.length === 0) {
                console.error('SFQ: Preview container not found, creating it...');
                // ✅ NUEVO: Crear contenedor de preview si no existe
                this._createImagePreviewContainer($optionItem);
                return this.updateImagePreview($optionItem, imageData); // Recursión para intentar de nuevo
            }
            
            let $previewImage = $previewContainer.find('.sfq-preview-image');
            
            // ✅ NUEVO: Crear imagen de preview si no existe
            if ($previewImage.length === 0) {
                console.log('SFQ: Preview image element not found, creating it...');
                $previewContainer.find('.sfq-image-preview').html(`
                    <img src="" alt="Vista previa" class="sfq-preview-image">
                    <button type="button" class="sfq-remove-image" title="Eliminar imagen">
                        <span class="dashicons dashicons-no-alt"></span>
                    </button>
                `);
                $previewImage = $previewContainer.find('.sfq-preview-image');
            }
            
            // ✅ CORREGIDO: Actualizar imagen con manejo de errores
            if ($previewImage.length > 0) {
                $previewImage.attr('src', imageData.url);
                $previewImage.attr('alt', imageData.alt || 'Vista previa');
                
                // ✅ NUEVO: Manejar errores de carga de imagen
                $previewImage.off('error').on('error', function() {
                    console.warn('SFQ: Failed to load image:', imageData.url);
                    $(this).attr('src', 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2VuPC90ZXh0Pjwvc3ZnPg==');
                    $(this).attr('alt', 'Error al cargar imagen');
                });
                
                $previewContainer.show();
                console.log('SFQ: Successfully updated image preview for URL:', imageData.url);
            } else {
                console.error('SFQ: Could not create or find preview image element');
            }
        }
        
        /**
         * ✅ NUEVO: Crear contenedor de preview de imagen si no existe
         */
        _createImagePreviewContainer($optionItem) {
            console.log('SFQ: Creating image preview container');
            
            const previewHtml = `
                <div class="sfq-image-preview-container" style="display: none;">
                    <div class="sfq-image-preview">
                        <img src="" alt="Vista previa" class="sfq-preview-image">
                        <button type="button" class="sfq-remove-image" title="Eliminar imagen">
                            <span class="dashicons dashicons-no-alt"></span>
                        </button>
                    </div>
                </div>
            `;
            
            // Buscar la sección de imagen o crearla
            let $imageSection = $optionItem.find('.sfq-image-upload-section');
            
            if ($imageSection.length === 0) {
                // Si no existe la sección de imagen, crearla completa
                const optionIndex = $optionItem.index();
                this._createImageUploadSection($optionItem, optionIndex);
                $imageSection = $optionItem.find('.sfq-image-upload-section');
            }
            
            // Añadir el contenedor de preview si no existe
            if ($imageSection.find('.sfq-image-preview-container').length === 0) {
                $imageSection.find('.sfq-image-controls').after(previewHtml);
                console.log('SFQ: Created image preview container');
            }
        }

        /**
         * ✅ NUEVO: Ocultar preview de imagen
         */
        hideImagePreview($optionItem) {
            $optionItem.find('.sfq-image-preview-container').hide();
        }

        /**
         * ✅ NUEVO: Eliminar imagen de opción
         */
        removeImage($optionItem, question, optionIndex) {
            console.log('SFQ: Removing image from option', optionIndex);
            
            // Limpiar input de URL
            $optionItem.find('.sfq-image-url-input').val('').removeClass('valid invalid');
            
            // Limpiar datos de la opción
            if (question.options[optionIndex]) {
                question.options[optionIndex].image = '';
                question.options[optionIndex].image_id = '';
                question.options[optionIndex].image_alt = '';
            }
            
            // Ocultar preview
            this.hideImagePreview($optionItem);
            
            // Marcar formulario como modificado
            this.formBuilder.isDirty = true;
            
            console.log('SFQ: Image removed from option', optionIndex);
        }

        addOption(questionId) {
            const question = this.questions.find(q => q.id === questionId);
            if (!question) return;
            
            // ✅ CORREGIDO: Crear opción con estructura completa para image_choice
            const newOption = { 
                text: '', 
                value: '',
                image: '',
                image_id: '',
                image_alt: ''
            };
            question.options.push(newOption);
            
            // ✅ CRÍTICO: Pasar el tipo de pregunta al renderizar la opción
            const optionHtml = this.formBuilder.uiRenderer.renderOption(newOption, question.options.length, question.type);
            $(`#options-${questionId}`).append(optionHtml);
            
            // ✅ CRÍTICO: Re-bind events incluyendo eventos específicos de image_choice
            this.bindOptionEvents(questionId);
            
            // ✅ NUEVO: Si es image_choice, bind eventos específicos de imagen
            if (question.type === 'image_choice') {
                const $question = $(`#${questionId}`);
                this.bindImageChoiceEvents($question, question);
                console.log('SFQ: Bound image choice events for new option in question:', questionId);
            }
            
            this.formBuilder.isDirty = true;
        }

        deleteQuestion(questionId) {
            $(`#${questionId}`).fadeOut(300, () => {
                $(this).remove();
                
                // Remove from array
                this.questions = this.questions.filter(q => q.id !== questionId);
                
                // Show empty state if no questions
                if (this.questions.length === 0) {
                    this.formBuilder.uiRenderer.showEmptyState();
                }
                
                this.formBuilder.isDirty = true;
            });
        }

        duplicateQuestion(questionId) {
            const original = this.questions.find(q => q.id === questionId);
            if (!original) return;
            
            const newId = 'q_' + Date.now();
            const duplicate = {
                ...original,
                id: newId,
                text: original.text + ' (Copia)',
                options: original.options.map(opt => ({ ...opt })),
                conditions: []
            };
            
            this.questions.push(duplicate);
            
            const element = this.formBuilder.uiRenderer.renderQuestion(duplicate);
            $(`#${questionId}`).after(element);
            this.bindQuestionEvents(newId);
            
            this.formBuilder.isDirty = true;
        }

        updateQuestionsOrder() {
            const newOrder = [];
            this.container.find('.sfq-question-item').each((index, el) => {
                const questionId = $(el).attr('id');
                const question = this.questions.find(q => q.id === questionId);
                if (question) {
                    question.order = index;
                    newOrder.push(question);
                }
            });
            this.questions = newOrder;
            this.formBuilder.isDirty = true;
        }
        
        moveFinalScreenQuestion(questionId, isFinaleScreen) {
            const $question = $(`#${questionId}`);
            const $finalScreensContainer = $('#sfq-final-screens-container');
            const $questionsContainer = $('#sfq-questions-container');
            
            console.log('SFQ: === MOVING FINAL SCREEN QUESTION ===');
            console.log('SFQ: Question ID:', questionId);
            console.log('SFQ: Is final screen:', isFinaleScreen);
            console.log('SFQ: Questions array before move:', this.questions.map(q => ({ id: q.id, text: q.text, pantallaFinal: q.pantallaFinal })));
            
            // CRÍTICO: Actualizar la referencia en el array ANTES de mover el DOM
            const question = this.questions.find(q => q.id === questionId);
            if (question) {
                question.pantallaFinal = isFinaleScreen;
                console.log('SFQ: Updated question pantallaFinal property:', question.pantallaFinal);
            } else {
                console.error('SFQ: Question not found in array:', questionId);
                return;
            }
            
            if (isFinaleScreen) {
                // Mover a la sección de pantallas finales
                if ($finalScreensContainer.length > 0) {
                    // Remover el estado vacío si existe
                    $finalScreensContainer.find('.sfq-empty-final-screens').remove();
                    
                    // Mover la pregunta
                    $question.appendTo($finalScreensContainer);
                    
                    console.log('SFQ: Moved question to final screens section:', questionId);
                }
            } else {
                // Mover de vuelta a la sección de preguntas normales
                if ($questionsContainer.length > 0) {
                    // Remover el estado vacío si existe
                    $questionsContainer.find('.sfq-empty-questions').remove();
                    
                    // Mover la pregunta
                    $question.appendTo($questionsContainer);
                    
                    console.log('SFQ: Moved question back to normal questions section:', questionId);
                }
                
                // Si no quedan pantallas finales, mostrar estado vacío
                if ($finalScreensContainer.find('.sfq-question-item').length === 0) {
                    $finalScreensContainer.append(`
                        <div class="sfq-empty-final-screens">
                            <div class="sfq-empty-final-icon">🏁</div>
                            <p>Añade más pantallas finales de estilo libre</p>
                            <p>Marca preguntas como "pantalla final" o crea preguntas tipo "Pantalla Final" para que aparezcan aquí</p>
                        </div>
                    `);
                }
            }
            
            // CRÍTICO: Re-bind events después del movimiento DOM
            this.bindQuestionEvents(questionId);
            
            // Actualizar el orden de las preguntas
            this.updateQuestionsOrder();
            
            console.log('SFQ: Questions array after move:', this.questions.map(q => ({ id: q.id, text: q.text, pantallaFinal: q.pantallaFinal })));
            console.log('SFQ: === END MOVING FINAL SCREEN QUESTION ===');
        }

        getQuestionsData() {
            console.log('SFQ: === GETTING QUESTIONS DATA FOR SAVE ===');
            console.log('SFQ: Questions array state:', this.questions.map(q => ({ 
                id: q.id, 
                text: q.text, 
                pantallaFinal: q.pantallaFinal,
                type: q.type 
            })));
            
            // CRÍTICO: Verificar que todas las preguntas del DOM estén en el array
            const $allQuestions = $('.sfq-question-item');
            console.log('SFQ: DOM questions found:', $allQuestions.length);
            
            $allQuestions.each((index, element) => {
                const questionId = $(element).attr('id');
                const questionInArray = this.questions.find(q => q.id === questionId);
                if (!questionInArray) {
                    console.error('SFQ: Question found in DOM but not in array:', questionId);
                }
            });
            
            return this.questions.map((question, index) => {
                // CRÍTICO: Obtener condiciones del ConditionEngine
                const conditionsData = this.formBuilder.conditionEngine.getConditionsData(question.id);
                
                console.log(`SFQ: Question ${index + 1} (${question.id}):`, {
                    text: question.text,
                    conditions: conditionsData,
                    originalId: question.originalId,
                    temporalId: question.id,
                    pantallaFinal: question.pantallaFinal
                });
                
                const baseData = {
                    question_text: question.text,
                    question_type: question.type,
                    required: question.required ? 1 : 0,
                    order_position: index,
                    conditions: conditionsData,
                    settings: question.settings || {}
                };

                // ✅ CRÍTICO: Debug logging para verificar settings
                console.log(`SFQ: Question ${index + 1} settings being saved:`, question.settings);
                console.log(`SFQ: Question ${index + 1} settings type:`, typeof question.settings);
                console.log(`SFQ: Question ${index + 1} settings is array:`, Array.isArray(question.settings));
                console.log(`SFQ: Question ${index + 1} settings keys:`, question.settings ? Object.keys(question.settings) : 'NO SETTINGS');
                
                if (question.settings && question.settings.hide_title !== undefined) {
                    console.log(`SFQ: Question ${index + 1} hide_title value:`, question.settings.hide_title);
                    console.log(`SFQ: Question ${index + 1} hide_title type:`, typeof question.settings.hide_title);
                } else {
                    console.log(`SFQ: Question ${index + 1} NO hide_title setting found`);
                }
                
                // ✅ VERIFICACIÓN ADICIONAL: Comprobar si settings se está convirtiendo en array
                if (Array.isArray(question.settings)) {
                    console.error(`SFQ: CRITICAL ERROR - Question ${index + 1} settings is an array instead of object!`);
                    console.error(`SFQ: Array contents:`, question.settings);
                    // Convertir array vacío a objeto vacío
                    question.settings = {};
                }

                // CRÍTICO: Incluir IDs para mapeo correcto
                if (question.originalId) {
                    // Si tiene ID original (de la base de datos), usarlo como ID principal
                    baseData.id = question.originalId;
                    baseData.temporal_id = question.id; // Guardar ID temporal para mapeo
                } else {
                    // Si es nueva pregunta, solo incluir el ID temporal
                    baseData.temporal_id = question.id;
                }

                // Handle freestyle questions
                if (question.type === 'freestyle') {
                    // ✅ SOLUCIÓN: Mapeo explícito para preservar settings de elementos freestyle
                    baseData.freestyle_elements = (question.freestyle_elements || []).map(element => {
                        // ✅ CRÍTICO: Preservar todos los datos del elemento incluyendo settings
                        
                        // ✅ DEBUGGING TEMPORAL: Log detallado del elemento
                        console.log('SFQ: === PROCESSING FREESTYLE ELEMENT ===');
                        console.log('SFQ: Element ID:', element.id);
                        console.log('SFQ: Element type:', element.type);
                        console.log('SFQ: Element label:', element.label);
                        console.log('SFQ: Element settings (original):', element.settings);
                        console.log('SFQ: Element settings type:', typeof element.settings);
                        console.log('SFQ: Element settings keys:', element.settings ? Object.keys(element.settings) : 'NO SETTINGS');
                        
                        // Verificar específicamente variable_name si es variable_display
                        if (element.type === 'variable_display') {
                            console.log('SFQ: VARIABLE_DISPLAY ELEMENT DETECTED');
                            console.log('SFQ: variable_name setting:', element.settings?.variable_name);
                            console.log('SFQ: All settings for variable_display:', JSON.stringify(element.settings, null, 2));
                        }
                        
                        const processedElement = {
                            id: element.id,
                            type: element.type,
                            label: element.label || '',
                            settings: element.settings || {},  // ✅ PRESERVAR SETTINGS COMO OBJETO
                            order: element.order || 0,
                            value: element.value || ''
                        };
                        
                        console.log('SFQ: Processed element settings:', processedElement.settings);
                        console.log('SFQ: === END PROCESSING ELEMENT ===');
                        
                        return processedElement;
                    });
                    baseData.global_settings = question.global_settings || {};
                    baseData.options = []; // Freestyle questions don't have traditional options
                    baseData.pantallaFinal = question.pantallaFinal || false; // Incluir campo pantalla final
                } else {
                    // Regular questions with options - CORREGIDO: Preservar todos los datos de imagen
                    baseData.options = question.options ? question.options.filter(opt => opt.text).map(opt => {
                        // Asegurar que se preserven todos los datos de la opción, incluyendo imagen
                        return {
                            text: opt.text || '',
                            value: opt.value || opt.text || '',
                            image: opt.image || '',
                            image_id: opt.image_id || '',
                            image_alt: opt.image_alt || ''
                        };
                    }) : [];
                }

                return baseData;
            });
        }

        /**
         * ✅ CORREGIDO: Repoblar previews de imagen después de cargar datos con timing mejorado
         */
        repopulateImagePreviews(questionId, question) {
            console.log('SFQ: === STARTING IMAGE REPOPULATION ===');
            console.log('SFQ: Question ID:', questionId);
            console.log('SFQ: Question type:', question.type);
            console.log('SFQ: Options count:', question.options ? question.options.length : 0);
            
            // ✅ CORREGIDO: Usar setTimeout para asegurar que el DOM esté completamente renderizado
            setTimeout(() => {
                this._performImageRepopulation(questionId, question);
            }, 150); // Delay suficiente para que el DOM esté listo
        }
        
        /**
         * ✅ NUEVO: Función interna para realizar la repoblación con verificaciones robustas
         */
        _performImageRepopulation(questionId, question) {
            console.log('SFQ: Performing delayed image repopulation for question:', questionId);
            
            // ✅ CORREGIDO: Múltiples selectores para encontrar el elemento
            let $question = $(`#${questionId}`);
            
            // Si no se encuentra con el ID directo, buscar por atributo data
            if ($question.length === 0) {
                $question = $(`.sfq-question-item[data-question-id="${questionId}"]`);
                console.log('SFQ: Trying alternative selector with data-question-id');
            }
            
            // Si aún no se encuentra, buscar en ambos contenedores
            if ($question.length === 0) {
                $question = $(`#sfq-questions-container #${questionId}, #sfq-final-screens-container #${questionId}`);
                console.log('SFQ: Trying container-specific selectors');
            }
            
            if ($question.length === 0) {
                console.error('SFQ: Question element not found after all attempts:', questionId);
                console.log('SFQ: Available question elements:', $('.sfq-question-item').map(function() { return this.id; }).get());
                return;
            }
            
            console.log('SFQ: Found question element:', $question.attr('id'));
            
            // Verificar que tenga opciones con imágenes
            if (!question.options || question.options.length === 0) {
                console.log('SFQ: No options found for question:', questionId);
                return;
            }
            
            // ✅ CORREGIDO: Verificar que existan elementos de opción en el DOM
            const $optionItems = $question.find('.sfq-option-item');
            console.log('SFQ: Found option items in DOM:', $optionItems.length);
            
            if ($optionItems.length === 0) {
                console.error('SFQ: No option items found in DOM for question:', questionId);
                // ✅ NUEVO: Intentar re-renderizar la pregunta si no hay opciones en el DOM
                console.log('SFQ: Attempting to re-render question options...');
                this._reRenderQuestionOptions(questionId, question);
                return;
            }
            
            // Procesar cada opción que tenga imagen
            question.options.forEach((option, index) => {
                if (option.image && option.image.trim() !== '') {
                    console.log(`SFQ: Processing option ${index} with image:`, option.image);
                    
                    const $optionItem = $optionItems.eq(index);
                    
                    if ($optionItem.length > 0) {
                        console.log('SFQ: Found option item for index', index);
                        
                        // ✅ CORREGIDO: Verificar que exista la sección de imagen
                        let $imageSection = $optionItem.find('.sfq-image-upload-section');
                        
                        if ($imageSection.length === 0) {
                            console.warn('SFQ: Image upload section not found, creating it...');
                            this._createImageUploadSection($optionItem, index);
                            $imageSection = $optionItem.find('.sfq-image-upload-section');
                        }
                        
                        if ($imageSection.length > 0) {
                            // Actualizar el input de URL
                            const $urlInput = $imageSection.find('.sfq-image-url-input');
                            if ($urlInput.length > 0) {
                                $urlInput.val(option.image).removeClass('invalid').addClass('valid');
                                console.log('SFQ: Updated URL input for option', index);
                            } else {
                                console.warn('SFQ: URL input not found for option', index);
                            }
                            
                            // Mostrar el preview de la imagen
                            this.updateImagePreview($optionItem, {
                                url: option.image,
                                alt: option.image_alt || 'Imagen cargada'
                            });
                            
                            console.log('SFQ: Successfully repopulated image preview for option', index);
                        } else {
                            console.error('SFQ: Could not create image upload section for option', index);
                        }
                    } else {
                        console.warn('SFQ: Option element not found for index:', index);
                    }
                } else {
                    console.log(`SFQ: Option ${index} has no image, skipping`);
                }
            });
            
            // ✅ NUEVO: Re-vincular eventos después de la repoblación
            this.bindImageChoiceEvents($question, question);
            
            console.log('SFQ: === FINISHED IMAGE REPOPULATION ===');
        }
        
        /**
         * ✅ NUEVO: Re-renderizar opciones de pregunta si no existen en el DOM
         */
        _reRenderQuestionOptions(questionId, question) {
            console.log('SFQ: Re-rendering options for question:', questionId);
            
            const $question = $(`#${questionId}`);
            const $optionsContainer = $question.find(`#options-${questionId}`);
            
            if ($optionsContainer.length === 0) {
                console.error('SFQ: Options container not found for question:', questionId);
                return;
            }
            
            // Limpiar opciones existentes
            $optionsContainer.empty();
            
            // Re-renderizar cada opción
            question.options.forEach((option, index) => {
                const optionHtml = this.formBuilder.uiRenderer.renderOption(option, index + 1, question.type);
                $optionsContainer.append(optionHtml);
            });
            
            // Re-vincular eventos
            this.bindOptionEvents(questionId);
            
            console.log('SFQ: Re-rendered', question.options.length, 'options for question:', questionId);
            
            // ✅ NUEVO: Intentar repoblación nuevamente después de re-renderizar
            setTimeout(() => {
                this._performImageRepopulation(questionId, question);
            }, 100);
        }
        
        /**
         * ✅ NUEVO: Crear sección de subida de imagen si no existe
         */
        _createImageUploadSection($optionItem, index) {
            console.log('SFQ: Creating image upload section for option', index);
            
            const imageUploadHtml = `
                <div class="sfq-image-upload-section">
                    <div class="sfq-image-controls">
                        <button type="button" class="button sfq-upload-image-btn" 
                                data-option-index="${index}">
                            <span class="dashicons dashicons-upload"></span>
                            Subir Imagen
                        </button>
                        <input type="url" class="sfq-image-url-input" 
                               name="options[${index}][image]"
                               placeholder="O pega URL de imagen..." 
                               value="">
                    </div>
                    <div class="sfq-image-preview-container" style="display: none;">
                        <div class="sfq-image-preview">
                            <img src="" alt="Vista previa" class="sfq-preview-image">
                            <button type="button" class="sfq-remove-image" title="Eliminar imagen">
                                <span class="dashicons dashicons-no-alt"></span>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Campos ocultos para datos adicionales de la imagen -->
                    <input type="hidden" name="options[${index}][image_id]" value="">
                    <input type="hidden" name="options[${index}][image_alt]" value="">
                </div>
            `;
            
            // Insertar después del input de texto de la opción
            $optionItem.find('.sfq-option-input').after(imageUploadHtml);
            
            console.log('SFQ: Created image upload section for option', index);
        }

        destroy() {
            if (this.container && $.fn.sortable) {
                this.container.sortable('destroy');
            }
        }
    }

    /**
     * ConditionEngine - Motor de lógica condicional avanzado
     */
    class ConditionEngine {
        constructor(formBuilder) {
            this.formBuilder = formBuilder;
            this.conditions = {};
        }

        init() {
            // Initialize conditions storage
            this.setupGlobalEventDelegation();
        }

        /**
         * Configurar event delegation para eliminación de condiciones - CORREGIDO
         */
        setupGlobalEventDelegation() {
            const self = this;
            
            // Event delegation para botones de eliminar condición
            $(document).off('click.sfq-condition-delete').on('click.sfq-condition-delete', '.sfq-condition-delete', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                if (!confirm('¿Estás seguro de eliminar esta condición?')) {
                    return;
                }
                
                const $condition = $(this).closest('.sfq-condition-item');
                const conditionId = $condition.attr('id');
                
                if (!conditionId) {
                    console.error('SFQ: No condition ID found for deletion');
                    return;
                }
                
                // Encontrar la pregunta que contiene esta condición
                const $questionContainer = $condition.closest('.sfq-question-item');
                const questionId = $questionContainer.attr('id');
                
                if (!questionId) {
                    console.error('SFQ: No question ID found for condition deletion');
                    return;
                }
                
                console.log('SFQ: Deleting condition', conditionId, 'from question', questionId);
                self.deleteCondition(conditionId, questionId);
            });
            
            console.log('SFQ: Event delegation for condition deletion set up');
        }

        loadConditions(questionId, conditionsData) {
            if (!conditionsData || !Array.isArray(conditionsData)) return;
            
            console.log('SFQ: Loading conditions for question', questionId, ':', conditionsData);
            
            this.conditions[questionId] = conditionsData.map((cond, index) => {
                // ✅ CRÍTICO: Usar campos separados para variable_amount y comparison_value
                const condition = {
                    id: 'c_' + questionId + '_' + index,
                    type: cond.condition_type || 'answer_equals',
                    value: cond.condition_value || '',
                    action: cond.action_type || 'goto_question',
                    actionValue: cond.action_value || '',
                    operator: cond.variable_operation || '',
                    amount: cond.variable_amount || 0,  // Para acciones de variables
                    comparisonValue: cond.comparison_value || ''  // Para condiciones de variables
                };
                
                console.log('SFQ: Restored condition with separate fields:', condition);
                
                return condition;
            });
            
            console.log('SFQ: Processed conditions for question', questionId, ':', this.conditions[questionId]);
            
            // Render conditions
            this.renderConditions(questionId);
            
            // CRÍTICO: Re-poblar dropdowns después de renderizar
            setTimeout(() => {
                this.repopulateConditionDropdowns(questionId);
            }, 100);
        }

        renderConditions(questionId) {
            const $container = $(`#conditions-${questionId}`);
            if (!$container.length) return;
            
            console.log('SFQ: Rendering conditions for question', questionId);
            
            // Clear existing conditions (keep add button)
            $container.find('.sfq-condition-item').remove();
            
            const conditions = this.conditions[questionId] || [];
            console.log('SFQ: Conditions to render:', conditions);
            
            conditions.forEach(condition => {
                const html = this.formBuilder.uiRenderer.renderCondition(condition);
                $container.find('.sfq-add-condition').before(html);
                this.bindConditionEvents(condition.id, questionId);
            });
            
            console.log('SFQ: Rendered', conditions.length, 'conditions for question', questionId);
        }

        addCondition(questionId) {
            // ✅ CRÍTICO: Usar el mismo formato que loadConditions para consistencia
            const conditionIndex = (this.conditions[questionId] || []).length;
            const conditionId = 'c_' + questionId + '_' + conditionIndex;
            
            const condition = {
                id: conditionId,
                type: 'answer_equals',
                value: '',
                action: 'goto_question',
                actionValue: '',
                operator: '',
                amount: 0,
                comparisonValue: 0  // ✅ CRÍTICO: Inicializar comparisonValue
            };
            
            console.log('SFQ: Creating new condition with unified ID format:', condition);
            
            if (!this.conditions[questionId]) {
                this.conditions[questionId] = [];
            }
            this.conditions[questionId].push(condition);
            
            const html = this.formBuilder.uiRenderer.renderCondition(condition);
            $(`#conditions-${questionId} .sfq-add-condition`).before(html);
            this.bindConditionEvents(conditionId, questionId);
            
            this.formBuilder.isDirty = true;
        }

        bindConditionEvents(conditionId, questionId) {
            const $condition = $(`#${conditionId}`);
            const conditions = this.conditions[questionId] || [];
            const condition = conditions.find(c => c.id === conditionId);
            
            if (!condition) return;
            
            const self = this; // Guardar referencia al contexto correcto
            
            // Update condition fields
            $condition.find('.sfq-condition-type').off('change').on('change', function() {
                const newConditionType = $(this).val();
                condition.type = newConditionType;
                
                // Regenerar el campo de valor de condición según el nuevo tipo
                const newConditionValueField = self.formBuilder.uiRenderer.generateConditionValueField(condition);
                $condition.find('.sfq-condition-value-container').html(newConditionValueField);
                
                // Rebind events para los nuevos campos
                self.bindConditionValueEvents($condition, condition);
                
                self.formBuilder.isDirty = true;
            });
            
            // Bind initial condition value events
            this.bindConditionValueEvents($condition, condition);
            
            // Handle action type change - regenerate action value field and show/hide amount field
            $condition.find('.sfq-action-type').off('change').on('change', function() {
                const newActionType = $(this).val();
                condition.action = newActionType;
                
                // Limpiar el valor anterior si cambia el tipo de acción
                condition.actionValue = '';
                
                // Regenerar el campo de valor de acción
                const newActionValueField = self.formBuilder.uiRenderer.generateActionValueField(condition);
                $condition.find('.sfq-action-value-container').html(newActionValueField);
                
                // Mostrar/ocultar campo de cantidad según el tipo de acción
                const $amountRow = $condition.find('.sfq-condition-amount-row');
                const $amountLabel = $condition.find('.sfq-condition-amount-label');
                
                if (['add_variable', 'set_variable'].includes(newActionType)) {
                    $amountRow.show();
                    $amountLabel.text(newActionType === 'add_variable' ? 'Cantidad a sumar:' : 'Valor a establecer:');
                } else {
                    $amountRow.hide();
                }
                
                // Rebind events para el nuevo campo
                self.bindActionValueEvents($condition, condition);
                
                self.formBuilder.isDirty = true;
            });
            
            // Handle amount field changes
            $condition.find('.sfq-condition-amount').off('input').on('input', function() {
                condition.amount = parseInt($(this).val()) || 0;
                self.formBuilder.isDirty = true;
            });
            
            // Bind initial action value events
            this.bindActionValueEvents($condition, condition);
            
            // Delete condition button - REMOVIDO: Ahora se maneja por event delegation
            // El event delegation global se encarga de todos los botones de eliminar
        }

        /**
         * Bind events para el campo de valor de acción - MEJORADO
         */
        bindActionValueEvents($condition, condition) {
            const self = this;
            
            // Handle input/change events for action value
            $condition.find('.sfq-action-value').off('input change keyup').on('input change keyup', function() {
                condition.actionValue = $(this).val();
                self.formBuilder.isDirty = true;
                console.log('SFQ: Updated action value for condition', condition.id, 'to:', condition.actionValue);
            });
            
            // Handle select events for dropdowns - MEJORADO con más eventos
            $condition.find('.sfq-question-dropdown, .sfq-variable-dropdown').off('change click focus').on('change click focus', function() {
                const newValue = $(this).val();
                if (newValue !== condition.actionValue) {
                    condition.actionValue = newValue;
                    self.formBuilder.isDirty = true;
                    console.log('SFQ: Updated dropdown value for condition', condition.id, 'to:', condition.actionValue);
                }
            });
            
            // CRÍTICO: Asegurar que el valor inicial esté establecido correctamente
            const $actionValue = $condition.find('.sfq-action-value, .sfq-question-dropdown, .sfq-variable-dropdown');
            if ($actionValue.length > 0 && condition.actionValue) {
                $actionValue.val(condition.actionValue);
                console.log('SFQ: Set initial value for condition', condition.id, 'to:', condition.actionValue);
            }
        }

        /**
         * Bind events para los campos de valor de condición
         */
        bindConditionValueEvents($condition, condition) {
            const self = this;
            
            // Para condiciones de respuesta (campo simple)
            $condition.find('.sfq-condition-value').off('input').on('input', function() {
                condition.value = $(this).val();
                self.formBuilder.isDirty = true;
                console.log('SFQ: Updated condition value for condition', condition.id, 'to:', condition.value);
            });
            
            // Para condiciones de variables (campos compuestos)
            $condition.find('.sfq-condition-variable-name').off('change').on('change', function() {
                condition.value = $(this).val(); // El nombre de la variable va en 'value'
                self.formBuilder.isDirty = true;
                console.log('SFQ: Updated variable name for condition', condition.id, 'to:', condition.value);
            });
            
            // ✅ CRÍTICO: Event binding para el campo de valor de comparación
            $condition.find('.sfq-condition-comparison-value').off('input').on('input', function() {
                condition.comparisonValue = $(this).val(); // El valor de comparación va en 'comparisonValue'
                self.formBuilder.isDirty = true;
                console.log('SFQ: Updated comparison value for condition', condition.id, 'to:', condition.comparisonValue);
            });
        }


        /**
         * CRÍTICO: Re-poblar dropdowns de condiciones después de cargar
         */
        repopulateConditionDropdowns(questionId) {
            console.log('SFQ: Re-populating condition dropdowns for question', questionId);
            
            const conditions = this.conditions[questionId] || [];
            
            conditions.forEach(condition => {
                const $conditionElement = $(`#${condition.id}`);
                if ($conditionElement.length === 0) {
                    console.warn('SFQ: Condition element not found:', condition.id);
                    return;
                }
                
                // Re-generar el campo de valor de acción con el valor correcto
                if (condition.action === 'goto_question') {
                    const newDropdown = this.formBuilder.uiRenderer.generateQuestionDropdown(condition.actionValue);
                    $conditionElement.find('.sfq-action-value-container').html(newDropdown);
                    
                    // Re-bind events para el nuevo dropdown
                    this.bindActionValueEvents($conditionElement, condition);
                    
                    console.log('SFQ: Re-populated question dropdown for condition', condition.id, 'with value', condition.actionValue);
                } else if (condition.action === 'add_variable' || condition.action === 'set_variable') {
                    const newVariableField = this.formBuilder.uiRenderer.generateVariableField(condition.actionValue);
                    $conditionElement.find('.sfq-action-value-container').html(newVariableField);
                    
                    // Re-bind events para el nuevo campo
                    this.bindActionValueEvents($conditionElement, condition);
                    
                    console.log('SFQ: Re-populated variable field for condition', condition.id, 'with value', condition.actionValue);
                }
            });
            
            console.log('SFQ: Finished re-populating dropdowns for question', questionId);
        }

        /**
         * Eliminar una condición específica - MEJORADO CON LOGGING DETALLADO
         */
        deleteCondition(conditionId, questionId) {
            console.log('🗑️ SFQ: === STARTING CONDITION DELETION ===');
            console.log('🗑️ SFQ: Condition ID to delete:', conditionId);
            console.log('🗑️ SFQ: Question ID:', questionId);
            
            // Verificar que existe el array de condiciones para esta pregunta
            if (!this.conditions[questionId]) {
                console.error('❌ SFQ: No conditions array found for question', questionId);
                console.log('🔍 SFQ: Available question IDs:', Object.keys(this.conditions));
                return;
            }
            
            const conditions = this.conditions[questionId];
            console.log('📋 SFQ: Current conditions array before deletion:');
            console.table(conditions.map((c, index) => ({
                index: index,
                id: c.id,
                type: c.type,
                action: c.action
            })));
            
            // Encontrar el índice de la condición a eliminar
            const conditionIndex = conditions.findIndex(c => c.id === conditionId);
            
            if (conditionIndex === -1) {
                console.error('❌ SFQ: Condition not found for deletion:', conditionId);
                console.log('🔍 SFQ: Available condition IDs:', conditions.map(c => c.id));
                console.log('🔍 SFQ: Searching for exact matches...');
                conditions.forEach((c, index) => {
                    console.log(`   Index ${index}: "${c.id}" === "${conditionId}" ? ${c.id === conditionId}`);
                });
                return;
            }
            
            console.log('✅ SFQ: Found condition at index', conditionIndex);
            
            // Mostrar el estado antes de la eliminación
            console.log('📊 SFQ: Array state before splice:');
            console.log('   - Array length:', conditions.length);
            console.log('   - Condition to remove:', conditions[conditionIndex]);
            
            // Eliminar la condición del array
            const removedCondition = conditions.splice(conditionIndex, 1)[0];
            console.log('✂️ SFQ: Spliced condition:', removedCondition);
            
            // Mostrar el estado después de la eliminación
            console.log('📊 SFQ: Array state after splice:');
            console.log('   - New array length:', conditions.length);
            console.log('   - Remaining conditions:', conditions.map(c => c.id));
            
            // Actualizar el array de condiciones
            this.conditions[questionId] = conditions;
            console.log('💾 SFQ: Updated conditions array in this.conditions[' + questionId + ']');
            
            // Verificar que la actualización fue exitosa
            const verifyArray = this.conditions[questionId];
            console.log('🔍 SFQ: Verification - conditions array now contains:', verifyArray.map(c => c.id));
            
            // Eliminar el elemento del DOM
            const $condition = $(`#${conditionId}`);
            if ($condition.length === 0) {
                console.error('❌ SFQ: DOM element not found for condition', conditionId);
            } else {
                console.log('🎭 SFQ: Removing DOM element for condition', conditionId);
                $condition.fadeOut(300, function() {
                    $(this).remove();
                    console.log('✅ SFQ: DOM element removed for condition', conditionId);
                });
            }
            
            // Marcar el formulario como modificado
            this.formBuilder.isDirty = true;
            console.log('💾 SFQ: Marked form as dirty');
            
            console.log('🎉 SFQ: === CONDITION DELETION COMPLETED ===');
            console.log('📈 SFQ: Final summary:');
            console.log('   - Deleted condition ID:', conditionId);
            console.log('   - From question:', questionId);
            console.log('   - Remaining conditions:', this.conditions[questionId].length);
            console.log('   - Remaining IDs:', this.conditions[questionId].map(c => c.id));
        }

        getConditionsData(questionId) {
            const conditions = this.conditions[questionId] || [];
            
            // Debug: Mostrar las condiciones que se van a guardar
            console.log('SFQ: Getting conditions data for question ' + questionId + ':', conditions);
            
            const conditionsData = conditions.map(cond => {
                // ✅ CRÍTICO: Normalizar comparison_value según el contexto
                let normalizedComparisonValue = cond.comparisonValue || '';
                
                // Si es una condición de variable y el valor parece numérico, convertirlo
                if (['variable_greater', 'variable_less', 'variable_equals'].includes(cond.type)) {
                    if (normalizedComparisonValue !== '' && !isNaN(normalizedComparisonValue)) {
                        // Es numérico, convertir a número para consistencia
                        normalizedComparisonValue = parseFloat(normalizedComparisonValue);
                    }
                    // Si no es numérico, mantener como string
                }
                
                const conditionData = {
                    condition_type: cond.type,
                    condition_value: cond.value,
                    action_type: cond.action,
                    action_value: cond.actionValue,
                    variable_operation: cond.operator,
                    variable_amount: cond.amount || 0,  // Para acciones de variables
                    comparison_value: normalizedComparisonValue  // Normalizado según contexto
                };
                
                console.log('SFQ: Mapped condition with normalized comparison_value:', conditionData);
                return conditionData;
            });
            
            console.log('SFQ: Final mapped conditions data for question ' + questionId + ':', conditionsData);
            
            return conditionsData;
        }

        destroy() {
            this.conditions = {};
        }
    }

    /**
     * UIRenderer - Renderizado de componentes UI
     */
    class UIRenderer {
        constructor(formBuilder) {
            this.formBuilder = formBuilder;
        }

        init() {
            // Initialize UI components
        }

        renderQuestion(question) {
            if (question.type === 'freestyle') {
                return this.renderFreestyleQuestion(question);
            }
            
            const typeLabels = {
                'single_choice': 'Opción Única',
                'multiple_choice': 'Opción Múltiple',
                'text': 'Texto',
                'email': 'Email',
                'rating': 'Valoración',
                'image_choice': 'Selección de Imagen',
                'freestyle': 'Estilo Libre'
            };

            let optionsHtml = '';
            if (['single_choice', 'multiple_choice', 'image_choice'].includes(question.type)) {
                const optionsList = question.options.map((option, index) => 
                    this.renderOption(option, index + 1, question.type)
                ).join('');

                optionsHtml = `
                    <div class="sfq-options-list" id="options-${question.id}">
                        ${optionsList}
                    </div>
                    <div class="sfq-options-controls">
                        <button class="sfq-add-option" type="button" data-question="${question.id}">
                            + Añadir opción
                        </button>
                    </div>
                `;
            }

            const html = `
                <div class="sfq-question-item" id="${question.id}" data-type="${question.type}">
                    <div class="sfq-question-header">
                        <span class="sfq-question-type-label">${typeLabels[question.type] || question.type}</span>
                        <div class="sfq-question-actions">
                            <button class="sfq-question-action sfq-move-handle" type="button" title="Mover">
                                <span class="dashicons dashicons-move"></span>
                            </button>
                            <button class="sfq-question-action sfq-duplicate-question" type="button" title="Duplicar">
                                <span class="dashicons dashicons-admin-page"></span>
                            </button>
                            <button class="sfq-question-action sfq-delete-question" type="button" title="Eliminar">
                                <span class="dashicons dashicons-trash"></span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="sfq-question-content">
                        <input type="text" class="sfq-question-text-input" 
                               placeholder="Escribe tu pregunta aquí..." 
                               value="${this.escapeHtml(question.text)}">
                        
                        ${optionsHtml}
                        <div class="sfq-next-button-controls-universal">
                         <label class="sfq-next-button-toggle">
                                <input type="checkbox" class="sfq-show-next-button-checkbox" 
                                       ${question.settings?.show_next_button !== false ? 'checked' : ''}>
                                Mostrar botón "Siguiente"
                            </label>
                            
                            <div class="sfq-next-button-text-setting" style="margin-top: 8px; margin-left: 20px; ${question.settings?.show_next_button === false ? 'display: none;' : ''}">
                                <label style="display: block; margin-bottom: 4px; font-size: 12px; color: #666;">
                                    Texto personalizado del botón:
                                </label>
                                <input type="text" class="sfq-next-button-text-input" 
                                       placeholder="Ej: Continuar, Siguiente paso, Finalizar..." 
                                       value="${this.escapeHtml(question.settings?.next_button_text || '')}"
                                       style="width: 250px; padding: 6px 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">
                                <small style="display: block; margin-top: 4px; color: #666; font-size: 11px;">
                                    Deja vacío para usar el texto por defecto ("Siguiente" o "Finalizar")
                                </small>
                            </div>
                        </div>
                        <div class="sfq-question-settings">
                            <label>
                                <input type="checkbox" class="sfq-required-checkbox" 
                                       ${question.required ? 'checked' : ''}>
                                Pregunta obligatoria
                            </label>
                            <label>
                                <input type="checkbox" class="sfq-hide-title-checkbox" 
                                       ${question.settings?.hide_title ? 'checked' : ''}>
                                Ocultar título de la pregunta
                            </label>
                            <label>
                                <input type="checkbox" class="sfq-block-question-checkbox" 
                                       ${question.settings?.block_question ? 'checked' : ''}>
                                Bloquear formulario en esta pregunta
                            </label>
                        </div>
                        
                        <details class="sfq-conditions-section">
                            <summary>Lógica condicional</summary>
                            <div class="sfq-conditions-container" id="conditions-${question.id}">
                                <button class="sfq-add-condition" type="button">
                                    + Añadir condición
                                </button>
                            </div>
                        </details>
                    </div>
                </div>
            `;

            return $(html);
        }

        renderFreestyleQuestion(question) {
            const elementsHtml = this.renderFreestyleElements(question.freestyle_elements || []);
            const controlsHtml = this.renderFreestyleControls(question.id);
            const isFinaleScreen = question.pantallaFinal || false;

            const html = `
                <div class="sfq-question-item sfq-freestyle-question ${isFinaleScreen ? 'sfq-final-screen' : ''}" id="${question.id}" data-type="freestyle" data-final-screen="${isFinaleScreen}">
                    <div class="sfq-question-header">
                        <span class="sfq-question-type-label">${isFinaleScreen ? '🏁 Pantalla Final' : 'Estilo Libre'}</span>
                        <div class="sfq-question-actions">
                            <button class="sfq-question-action sfq-move-handle" type="button" title="Mover">
                                <span class="dashicons dashicons-move"></span>
                            </button>
                            <button class="sfq-question-action sfq-duplicate-question" type="button" title="Duplicar">
                                <span class="dashicons dashicons-admin-page"></span>
                            </button>
                            <button class="sfq-question-action sfq-delete-question" type="button" title="Eliminar">
                                <span class="dashicons dashicons-trash"></span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="sfq-question-content">
                        <input type="text" class="sfq-question-text-input" 
                               placeholder="Escribe tu pregunta aquí..." 
                               value="${this.escapeHtml(question.text)}">
                        
                        <div class="sfq-freestyle-container">
                            <div class="sfq-freestyle-elements" id="freestyle-elements-${question.id}">
                                ${elementsHtml}
                            </div>
                            
                            ${controlsHtml}
                        </div>
                        
                        <div class="sfq-question-settings">
                            <label>
                                <input type="checkbox" class="sfq-required-checkbox" 
                                       ${question.required ? 'checked' : ''}>
                                Pregunta obligatoria
                            </label>
                            <label>
                                <input type="checkbox" class="sfq-hide-title-checkbox" 
                                       ${question.settings?.hide_title ? 'checked' : ''}>
                                Ocultar título de la pregunta
                            </label>
                            <label>
                                <input type="checkbox" class="sfq-block-question-checkbox" 
                                       ${question.settings?.block_question ? 'checked' : ''}>
                                Bloquear formulario en esta pregunta
                            </label>
                        </div>
                    </div>
                </div>
            `;

            return $(html);
        }

        renderFreestyleElements(elements) {
            if (!elements || elements.length === 0) {
                return '<div class="sfq-freestyle-empty">No hay elementos añadidos</div>';
            }
            
            return elements.map(element => this.renderFreestyleElement(element)).join('');
        }

        renderFreestyleElement(element) {
            const elementTypes = {
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
            
            return `
                <div class="sfq-freestyle-element" data-element-id="${element.id}" data-element-type="${element.type}">
                    <div class="sfq-freestyle-element-header">
                        <span class="sfq-freestyle-element-type">${elementTypes[element.type] || element.type}</span>
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

        renderFreestyleControls(questionId) {
            return `
                <div class="sfq-freestyle-controls">
                    <div class="sfq-freestyle-add-buttons">
                        <button class="sfq-add-freestyle-element" data-type="text" data-question="${questionId}">
                            📝 Texto
                        </button>
                        <button class="sfq-add-freestyle-element" data-type="video" data-question="${questionId}">
                            🎥 Video
                        </button>
                        <button class="sfq-add-freestyle-element" data-type="image" data-question="${questionId}">
                            🖼️ Imagen
                        </button>
                        <button class="sfq-add-freestyle-element" data-type="countdown" data-question="${questionId}">
                            ⏰ Cuenta atrás
                        </button>
                        <button class="sfq-add-freestyle-element" data-type="phone" data-question="${questionId}">
                            📞 Teléfono
                        </button>
                        <button class="sfq-add-freestyle-element" data-type="email" data-question="${questionId}">
                            📧 Email
                        </button>
                        <button class="sfq-add-freestyle-element" data-type="file_upload" data-question="${questionId}">
                            📤 Subir imagen
                        </button>
                        <button class="sfq-add-freestyle-element" data-type="button" data-question="${questionId}">
                            🔘 Botón
                        </button>
                        <button class="sfq-add-freestyle-element" data-type="rating" data-question="${questionId}">
                            ⭐ Valoración
                        </button>
                        <button class="sfq-add-freestyle-element" data-type="dropdown" data-question="${questionId}">
                            📋 Desplegable
                        </button>
                        <button class="sfq-add-freestyle-element" data-type="checkbox" data-question="${questionId}">
                            ☑️ Opción Check
                        </button>
                        <button class="sfq-add-freestyle-element" data-type="legal_text" data-question="${questionId}">
                            ⚖️ Texto RGPD
                        </button>
                        <button class="sfq-add-freestyle-element" data-type="variable_display" data-question="${questionId}">
                            🔢 Mostrar Variable
                        </button>
                        <button class="sfq-add-freestyle-element" data-type="styled_text" data-question="${questionId}">
                            ✨ Texto Estilizado
                        </button>
                    </div>
                </div>
            `;
        }

        // ✅ NUEVO: Función helper para convertir hex a rgba
        hexToRgba(hex, opacity = 1) {
            if (!hex || typeof hex !== 'string') return 'rgba(0,0,0,1)';
            
            // Remover el # si existe
            hex = hex.replace('#', '');
            
            // Manejar formato corto (#RGB)
            if (hex.length === 3) {
                hex = hex.split('').map(char => char + char).join('');
            }
            
            // Validar formato
            if (hex.length !== 6 || !/^[0-9A-Fa-f]{6}$/.test(hex)) {
                return 'rgba(0,0,0,1)';
            }
            
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            
            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
        }

        renderElementPreview(element) {
            switch (element.type) {
                case 'text':
                    return `<input type="text" placeholder="${element.settings?.placeholder || 'Texto de ejemplo'}" disabled>`;
                case 'email':
                    return `<input type="email" placeholder="${element.settings?.placeholder || 'email@ejemplo.com'}" disabled>`;
                case 'phone':
                    return `<input type="tel" placeholder="${element.settings?.placeholder || '+34 600 000 000'}" disabled>`;
                case 'rating':
                    return `<div class="sfq-rating-preview">⭐⭐⭐⭐⭐</div>`;
                case 'button':
                    return `<button disabled>${element.settings?.button_text || 'Botón de ejemplo'}</button>`;
                case 'checkbox':
                    return `<label><input type="checkbox" disabled> ${element.settings?.checkbox_text || 'Opción de ejemplo'}</label>`;
                case 'dropdown':
                    return `<select disabled><option>Selecciona una opción</option></select>`;
                case 'video':
                    return `<div class="sfq-video-preview">🎥 Video: ${element.settings?.video_url || 'URL no configurada'}</div>`;
                case 'image':
                    return `<div class="sfq-image-preview">🖼️ Imagen: ${element.settings?.image_url || 'URL no configurada'}</div>`;
                case 'countdown':
                    return `<div class="sfq-countdown-preview">⏰ Cuenta atrás: ${element.settings?.target_date || 'Fecha no configurada'}</div>`;
                case 'file_upload':
                    return `<div class="sfq-file-preview">📤 Subir archivo</div>`;
                case 'legal_text':
                    return `<div class="sfq-legal-preview">⚖️ ${element.settings?.text_content || 'Texto legal'}</div>`;
                case 'variable_display':
                    const variableName = element.settings?.variable_name || 'variable_no_seleccionada';
                    const previewValue = element.settings?.preview_value || '0';
                    const bgColor = this.hexToRgba(element.settings?.background_color || '#f8f9fa', element.settings?.background_opacity || 1);
                    const borderColor = this.hexToRgba(element.settings?.border_color || '#e9ecef', element.settings?.border_opacity || 1);
                    return `<div class="sfq-variable-display-preview" style="
                        padding: 12px 16px;
                        background: ${bgColor};
                        border: 2px solid ${borderColor};
                        border-radius: ${element.settings?.border_radius || '8'}px;
                        color: ${element.settings?.text_color || '#333333'};
                        font-size: ${element.settings?.font_size || '16'}px;
                        font-weight: ${element.settings?.font_weight || 'normal'};
                        text-align: ${element.settings?.text_align || 'center'};
                        ${element.settings?.text_shadow ? 'text-shadow: 1px 1px 2px rgba(0,0,0,0.3);' : ''}
                    ">
                        🔢 Variable: <strong>${variableName}</strong> = ${previewValue}
                    </div>`;
                case 'styled_text':
                    const textContent = element.settings?.text_content || 'Texto de ejemplo';
                    const textType = element.settings?.text_type || 'paragraph';
                    const tagName = textType === 'title' ? 'h2' : 'p';
                    const styledBgColor = this.hexToRgba(element.settings?.background_color || '#ffffff', element.settings?.background_opacity || 0);
                    const styledBorderColor = this.hexToRgba(element.settings?.border_color || '#e0e0e0', element.settings?.border_opacity || 0);
                    
                    // Aplicar ancho personalizado si está configurado
                    let widthStyle = '';
                    if (element.settings?.width_type === 'full') {
                        widthStyle = 'width: 100%;';
                    } else if (element.settings?.width_type === 'custom' && element.settings?.custom_width) {
                        widthStyle = `width: ${element.settings.custom_width}px; max-width: 100%;`;
                    }
                    
                    return `<${tagName} class="sfq-styled-text-preview" style="
                        font-family: ${element.settings?.font_family || 'inherit'};
                        font-size: ${element.settings?.font_size || '16'}px;
                        font-weight: ${element.settings?.font_weight || 'normal'};
                        font-style: ${element.settings?.italic ? 'italic' : 'normal'};
                        text-decoration: ${element.settings?.strikethrough ? 'line-through' : 'none'};
                        color: ${element.settings?.text_color || '#333333'};
                        text-align: ${element.settings?.text_align || 'left'};
                        background: ${styledBgColor};
                        border: 2px solid ${styledBorderColor};
                        border-radius: ${element.settings?.border_radius || '0'}px;
                        padding: 12px;
                        margin: auto;
                        ${widthStyle}
                        ${element.settings?.text_shadow ? 'text-shadow: 2px 2px 4px rgba(0,0,0,0.3);' : ''}
                        ${element.settings?.box_shadow ? 'box-shadow: 0 4px 8px rgba(0,0,0,0.1);' : ''}
                    ">
                        ✨ ${textContent}
                    </${tagName}>`;
                default:
                    return `<div class="sfq-element-preview">Vista previa de ${element.type}</div>`;
            }
        }

        renderOption(option, index, questionType = null) {
            // Determinar si es una pregunta de tipo image_choice
            const isImageChoice = questionType === 'image_choice';
            
            // HTML base para todas las opciones
            let optionHtml = `
                <div class="sfq-option-item">
                    <input type="text" class="sfq-option-input" 
                           placeholder="Opción ${index}" 
                           value="${this.escapeHtml(option.text || '')}">
            `;
            
            // ✅ NUEVO: Añadir interfaz de subida de imágenes para image_choice
            if (isImageChoice) {
                const hasImage = option.image && option.image.trim() !== '';
                
                optionHtml += `
                    <div class="sfq-image-upload-section">
                        <div class="sfq-image-controls">
                            <button type="button" class="button sfq-upload-image-btn" 
                                    data-option-index="${index - 1}">
                                <span class="dashicons dashicons-upload"></span>
                                Subir Imagen
                            </button>
                            <input type="url" class="sfq-image-url-input ${hasImage ? 'valid' : ''}" 
                                   name="options[${index - 1}][image]"
                                   placeholder="O pega URL de imagen..." 
                                   value="${this.escapeHtml(option.image || '')}">
                        </div>
                        <div class="sfq-image-preview-container" style="display: ${hasImage ? 'block' : 'none'};">
                            <div class="sfq-image-preview">
                                <img src="${this.escapeHtml(option.image || '')}" 
                                     alt="${this.escapeHtml(option.image_alt || 'Vista previa')}" 
                                     class="sfq-preview-image">
                                <button type="button" class="sfq-remove-image" title="Eliminar imagen">
                                    <span class="dashicons dashicons-no-alt"></span>
                                </button>
                            </div>
                        </div>
                        
                        <!-- Campos ocultos para datos adicionales de la imagen -->
                        <input type="hidden" name="options[${index - 1}][image_id]" 
                               value="${this.escapeHtml(option.image_id || '')}">
                        <input type="hidden" name="options[${index - 1}][image_alt]" 
                               value="${this.escapeHtml(option.image_alt || '')}">
                    </div>
                `;
            }
            
            // Botón de eliminar opción
            optionHtml += `
                    <button class="sfq-option-remove" type="button">
                        <span class="dashicons dashicons-trash"></span>
                    </button>
                </div>
            `;
            
            return optionHtml;
        }

        renderCondition(condition) {
            // Generar el campo de valor de acción dinámicamente
            const actionValueField = this.generateActionValueField(condition);
            
            return `
                <div class="sfq-condition-item" id="${condition.id}">
                    <div class="sfq-condition-header">
                        <span class="sfq-condition-title">Condición</span>
                        <button class="sfq-condition-delete" type="button" title="Eliminar condición">
                            <span class="dashicons dashicons-trash"></span>
                        </button>
                    </div>
                    <div class="sfq-condition-row">
                        <select class="sfq-condition-type">
                            <option value="answer_equals" ${condition.type === 'answer_equals' ? 'selected' : ''}>
                                Si la respuesta es igual a
                            </option>
                            <option value="answer_contains" ${condition.type === 'answer_contains' ? 'selected' : ''}>
                                Si la respuesta contiene
                            </option>
                            <option value="answer_not_equals" ${condition.type === 'answer_not_equals' ? 'selected' : ''}>
                                Si la respuesta no es igual a
                            </option>
                            <option value="variable_greater" ${condition.type === 'variable_greater' ? 'selected' : ''}>
                                Si la variable es mayor que
                            </option>
                            <option value="variable_less" ${condition.type === 'variable_less' ? 'selected' : ''}>
                                Si la variable es menor que
                            </option>
                            <option value="variable_equals" ${condition.type === 'variable_equals' ? 'selected' : ''}>
                                Si la variable es igual a
                            </option>
                        </select>
                        <div class="sfq-condition-value-container">
                            ${this.generateConditionValueField(condition)}
                        </div>
                    </div>
                    <div class="sfq-condition-row">
                        <select class="sfq-action-type">
                            <option value="goto_question" ${condition.action === 'goto_question' ? 'selected' : ''}>
                                Ir a pregunta
                            </option>
                            <option value="skip_to_end" ${condition.action === 'skip_to_end' ? 'selected' : ''}>
                                Saltar al final
                            </option>
                            <option value="redirect_url" ${condition.action === 'redirect_url' ? 'selected' : ''}>
                                Redirigir a URL
                            </option>
                            <option value="show_message" ${condition.action === 'show_message' ? 'selected' : ''}>
                                Mostrar mensaje
                            </option>
                            <option value="add_variable" ${condition.action === 'add_variable' ? 'selected' : ''}>
                                Sumar a variable
                            </option>
                            <option value="set_variable" ${condition.action === 'set_variable' ? 'selected' : ''}>
                                Establecer variable
                            </option>
                        </select>
                        <div class="sfq-action-value-container">
                            ${actionValueField}
                        </div>
                    </div>
                    <div class="sfq-condition-amount-row" style="display: ${['add_variable', 'set_variable'].includes(condition.action) ? 'flex' : 'none'};">
                        <label class="sfq-condition-amount-label">
                            ${condition.action === 'add_variable' ? 'Cantidad a sumar:' : 'Valor a establecer:'}
                        </label>
                        <input type="number" class="sfq-condition-amount" 
                               placeholder="${condition.action === 'add_variable' ? '5' : '10'}" 
                               value="${condition.amount || ''}"
                               min="0" step="1">
                    </div>
                </div>
            `;
        }

        /**
         * Generar el campo de valor de acción según el tipo de acción
         */
        generateActionValueField(condition) {
            switch (condition.action) {
                case 'goto_question':
                    return this.generateQuestionDropdown(condition.actionValue);
                case 'redirect_url':
                    return `<input type="url" class="sfq-action-value" 
                                   placeholder="https://ejemplo.com" 
                                   value="${this.escapeHtml(condition.actionValue)}">`;
                case 'show_message':
                    return `<textarea class="sfq-action-value" 
                                      placeholder="Mensaje a mostrar" 
                                      rows="2">${this.escapeHtml(condition.actionValue)}</textarea>`;
                case 'add_variable':
                case 'set_variable':
                    return this.generateVariableField(condition.actionValue);
                default:
                    return `<input type="text" class="sfq-action-value" 
                                   placeholder="Valor de acción" 
                                   value="${this.escapeHtml(condition.actionValue)}">`;
            }
        }

        /**
         * Generar desplegable con las preguntas disponibles - MEJORADO con mapeo de IDs
         */
        generateQuestionDropdown(selectedValue) {
            const questions = this.formBuilder.questionManager.questions || [];
            
            let options = '<option value="">Selecciona una pregunta...</option>';
            
            questions.forEach((question, index) => {
                const questionNumber = index + 1;
                const questionText = question.text || 'Pregunta sin título';
                const truncatedText = questionText.length > 50 ? 
                    questionText.substring(0, 50) + '...' : questionText;
                
                // CRÍTICO: Usar el ID real de la base de datos si existe, sino usar el ID temporal
                const questionId = question.originalId || question.id;
                
                // CRÍTICO: Mejorar la lógica de selección para manejar tanto IDs temporales como reales
                let isSelected = false;
                
                if (selectedValue) {
                    // Primero intentar match directo
                    if (selectedValue == questionId) {
                        isSelected = true;
                    } 
                    // Si no hay match directo, verificar si el selectedValue es un ID temporal
                    // que mapea al ID real de esta pregunta
                    else if (question.originalId && selectedValue == question.id) {
                        isSelected = true;
                        console.log('SFQ: Mapped temporal ID', selectedValue, 'to real ID', question.originalId);
                    }
                    // También verificar el mapeo inverso usando el idMapping del QuestionManager
                    else if (this.formBuilder.questionManager.idMapping.has(selectedValue)) {
                        const mappedId = this.formBuilder.questionManager.idMapping.get(selectedValue);
                        if (mappedId == questionId) {
                            isSelected = true;
                            console.log('SFQ: Used ID mapping', selectedValue, '->', mappedId);
                        }
                    }
                }
                
                const selectedAttr = isSelected ? 'selected' : '';
                
                options += `<option value="${questionId}" ${selectedAttr}>
                    Pregunta ${questionNumber}: ${this.escapeHtml(truncatedText)}
                </option>`;
            });
            
            return `<select class="sfq-action-value sfq-question-dropdown">
                        ${options}
                    </select>`;
        }

        /**
         * Generar campo para variables globales
         */
        generateVariableField(selectedValue) {
            const variables = this.formBuilder.getGlobalVariables() || [];
            
            if (variables.length === 0) {
                return `<input type="text" class="sfq-action-value" 
                               placeholder="Nombre de la variable" 
                               value="${this.escapeHtml(selectedValue)}">
                        <small style="display: block; color: #666; font-size: 11px; margin-top: 4px;">
                            💡 Tip: Crea variables globales en la pestaña "Variables"
                        </small>`;
            }
            
            let options = '<option value="">Selecciona una variable...</option>';
            
            variables.forEach(variable => {
                const isSelected = selectedValue === variable.name ? 'selected' : '';
                options += `<option value="${variable.name}" ${isSelected}>
                    ${this.escapeHtml(variable.name)} (${variable.type})
                </option>`;
            });
            
            return `<select class="sfq-action-value sfq-variable-dropdown">
                        ${options}
                    </select>`;
        }

        /**
         * Generar el campo de valor de condición según el tipo de condición
         */
        generateConditionValueField(condition) {
            switch (condition.type) {
                case 'variable_greater':
                case 'variable_less':
                case 'variable_equals':
                    // Para condiciones de variables, mostrar dropdown de variables + campo de valor
                    return this.generateVariableConditionFields(condition);
                case 'answer_equals':
                case 'answer_contains':
                case 'answer_not_equals':
                default:
                    // Para condiciones de respuesta, campo de texto simple
                    return `<input type="text" class="sfq-condition-value" 
                                   placeholder="Valor" 
                                   value="${this.escapeHtml(condition.value)}">`;
            }
        }

        /**
         * Generar campos específicos para condiciones de variables
         */
        generateVariableConditionFields(condition) {
            const variables = this.formBuilder.getGlobalVariables() || [];
            
            // ✅ CRÍTICO: Usar directamente condition.value y condition.comparisonValue
            const variableName = condition.value || '';
            const comparisonValue = condition.comparisonValue || '';
            
            console.log('SFQ: Generating variable condition fields for condition:', condition.id);
            console.log('SFQ: Variable name:', variableName);
            console.log('SFQ: Comparison value:', comparisonValue);
            
            if (variables.length === 0) {
                return `<div class="sfq-variable-condition-fields">
                            <input type="text" class="sfq-condition-variable-name" 
                                   placeholder="Nombre de variable" 
                                   value="${this.escapeHtml(variableName)}"
                                   style="width: 45%; margin-right: 10px;">
                            <input type="text" class="sfq-condition-comparison-value" 
                                   placeholder="Valor a comparar" 
                                   value="${this.escapeHtml(comparisonValue)}"
                                   style="width: 45%;">
                            <small style="display: block; color: #666; font-size: 11px; margin-top: 4px;">
                                💡 Tip: Crea variables globales en la pestaña "Variables"
                            </small>
                        </div>`;
            }
            
            let variableOptions = '<option value="">Selecciona una variable...</option>';
            
            variables.forEach(variable => {
                const isSelected = variableName === variable.name ? 'selected' : '';
                variableOptions += `<option value="${variable.name}" ${isSelected}>
                    ${this.escapeHtml(variable.name)} (${variable.type})
                </option>`;
            });
            
            return `<div class="sfq-variable-condition-fields">
                        <select class="sfq-condition-variable-name" style="width: 45%; margin-right: 10px;">
                            ${variableOptions}
                        </select>
                        <input type="text" class="sfq-condition-comparison-value" 
                               placeholder="Valor a comparar" 
                               value="${this.escapeHtml(comparisonValue)}"
                               style="width: 45%;">
                    </div>`;
        }

        showEmptyState() {
            const html = `
                <div class="sfq-empty-questions">
                    <p>No hay preguntas todavía</p>
                    <p>Añade preguntas desde el panel lateral</p>
                </div>
            `;
            $('#sfq-questions-container').html(html);
        }

        showLoading(show) {
            if (show) {
                if ($('.sfq-loading-overlay').length === 0) {
                    const loadingHtml = `
                        <div class="sfq-loading-overlay">
                            <div class="sfq-loading-content">
                                <div class="sfq-loading-spinner"></div>
                                <p>Cargando formulario...</p>
                            </div>
                        </div>
                    `;
                    $('body').append(loadingHtml);
                }
                $('.sfq-loading-overlay').fadeIn(200);
            } else {
                $('.sfq-loading-overlay').fadeOut(200, function() {
                    $(this).remove();
                });
            }
        }

        showNotice(message, type = 'success') {
            const noticeId = 'notice_' + Date.now();
            const html = `
                <div id="${noticeId}" class="sfq-notice sfq-notice-${type}">
                    ${this.escapeHtml(message)}
                </div>
            `;
            
            $('body').append(html);
            
            // Position and animate
            const $notice = $(`#${noticeId}`);
            $notice.css({
                position: 'fixed',
                top: '32px',
                right: '20px',
                zIndex: 99999
            }).fadeIn(300);
            
            // Auto-remove after 3 seconds
            setTimeout(() => {
                $notice.fadeOut(300, function() {
                    $(this).remove();
                });
            }, 3000);
        }

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
    }

    /**
     * DataValidator - Validación y sanitización de datos
     */
    class DataValidator {
        normalizeBoolean(value) {
            if (typeof value === 'boolean') return value;
            if (typeof value === 'number') return value !== 0;
            if (typeof value === 'string') {
                const normalized = value.toLowerCase().trim();
                return ['1', 'true', 'yes', 'on'].includes(normalized);
            }
            return false;
        }

        validateEmail(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        }

        validateUrl(url) {
            try {
                new URL(url);
                return true;
            } catch {
                return false;
            }
        }

        sanitizeText(text) {
            if (typeof text !== 'string') return '';
            return text.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        }

        validateQuestion(question) {
            const errors = [];
            
            if (!question.text || question.text.trim() === '') {
                errors.push('El texto de la pregunta es requerido');
            }
            
            if (['single_choice', 'multiple_choice', 'image_choice'].includes(question.type)) {
                const validOptions = question.options.filter(opt => opt.text && opt.text.trim() !== '');
                if (validOptions.length < 2) {
                    errors.push('Se requieren al menos 2 opciones válidas');
                }
            }
            
            return {
                isValid: errors.length === 0,
                errors: errors
            };
        }
    }

    // Initialize when DOM is ready - SINGLETON PATTERN
    $(document).ready(function() {
        // Only initialize on the form builder page
        if ($('.sfq-builder-wrap').length > 0) {
            // CRITICAL: Prevent multiple initializations
            if (window.sfqFormBuilderV2InitLock) {
                return;
            }
            
            // Set initialization lock
            window.sfqFormBuilderV2InitLock = true;
            
            // Destroy old builder if exists
            if (window.sfqFormBuilder && typeof window.sfqFormBuilder.destroy === 'function') {
                window.sfqFormBuilder.destroy();
                window.sfqFormBuilder = null;
            }
            
            // Destroy existing v2 builder if exists
            if (window.sfqFormBuilderV2 && typeof window.sfqFormBuilderV2.destroy === 'function') {
                window.sfqFormBuilderV2.destroy();
                window.sfqFormBuilderV2 = null;
            }
            
            // Small delay to ensure cleanup is complete
            setTimeout(() => {
                window.sfqFormBuilderV2 = new FormBuilderCore();
                
                // Release lock after initialization
                setTimeout(() => {
                    window.sfqFormBuilderV2InitLock = false;
                }, 100);
            }, 50);
        }
    });

})(jQuery);
