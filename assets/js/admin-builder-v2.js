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
            $('#block-form').on('change' + ns, function() {
                if ($(this).is(':checked')) {
                    $('#block-form-container').slideDown();
                } else {
                    $('#block-form-container').slideUp();
                }
                
                if (!this.isDestroyed) {
                    this.isDirty = true;
                }
            });
            
            // Intro screen toggle
            $('#show-intro-screen').on('change' + ns, function() {
                $('#intro-screen-settings').toggle($(this).is(':checked'));
            });
            
            // Color pickers
            this.initColorPickers();
            
            // Range slider
            $('#border-radius').on('input' + ns, function() {
                $('.sfq-range-value').text($(this).val() + 'px');
            });
            
            // Límites - Mostrar/ocultar campos dinámicamente
            $('#submission-limit-count').on('input' + ns, function() {
                const count = $(this).val();
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
            
            $('#submission-limit-period').on('change' + ns, function() {
                const period = $(this).val();
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
            $('#require-login').on('change' + ns, function() {
                if ($(this).is(':checked')) {
                    $('#login-message-container').slideDown();
                } else {
                    $('#login-message-container').slideUp();
                }
                
                if (!this.isDestroyed) {
                    this.isDirty = true;
                }
            });
            
            // Programar disponibilidad
            $('#enable-schedule').on('change' + ns, function() {
                if ($(this).is(':checked')) {
                    $('#schedule-container').slideDown();
                } else {
                    $('#schedule-container').slideUp();
                }
            });
            
            // Límite total de participantes
            $('#enable-max-submissions').on('change' + ns, function() {
                if ($(this).is(':checked')) {
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
            $('#block-form-enable-timer').on('change' + ns, function() {
                if ($(this).is(':checked')) {
                    $('#block-form-timer-settings').slideDown();
                    $('#block-form-timer-available-section').slideDown();
                    $('.sfq-message-config-section:contains("🎨 Colores del Mensaje de Disponibilidad")').slideDown();
                } else {
                    $('#block-form-timer-settings').slideUp();
                    $('#block-form-timer-available-section').slideUp();
                    $('.sfq-message-config-section:contains("🎨 Colores del Mensaje de Disponibilidad")').slideUp();
                }
                
                if (!this.isDestroyed) {
                    this.isDirty = true;
                }
            });
            
            // Event listener para mostrar/ocultar la opción de desaparecer completamente
            $('#block-form-timer-show-form').on('change' + ns, function() {
                if ($(this).is(':checked')) {
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
            $('#show-question-numbers').prop('checked', settings.show_question_numbers === false);
            $('#auto-advance').prop('checked', settings.auto_advance !== false);
            $('#allow-back').prop('checked', settings.allow_back === true);
            $('#randomize-questions').prop('checked', settings.randomize_questions === true);
            $('#save-partial').prop('checked', settings.save_partial === true);
            $('#show-intro-screen').prop('checked', settings.show_intro_screen !== false);
            
            // Bloqueo de formulario
            $('#block-form').prop('checked', settings.block_form === true).trigger('change');
            
            // Show/hide intro settings
            $('#intro-screen-settings').toggle(settings.show_intro_screen !== false);
            
            // Style settings
            const styles = formData.style_settings || {};
            $('#primary-color').val(styles.primary_color || '#007cba').trigger('change');
            $('#secondary-color').val(styles.secondary_color || '#6c757d').trigger('change');
            $('#background-color').val(styles.background_color || '#ffffff').trigger('change');
            $('#text-color').val(styles.text_color || '#333333').trigger('change');
            $('#border-radius').val(styles.border_radius || '8');
            $('.sfq-range-value').text((styles.border_radius || '8') + 'px');
            $('#font-family').val(styles.font_family || 'inherit');
            
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
                // Bloqueo de formulario
                block_form: $('#block-form').is(':checked'),
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
                secondary_color: $('#secondary-color').val() || '#6c757d',
                background_color: $('#background-color').val() || '#ffffff',
                text_color: $('#text-color').val() || '#333333',
                border_radius: $('#border-radius').val() || '8',
                font_family: $('#font-family').val() || 'inherit',
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
            questions: this.questionManager.getQuestionsData()
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

        initColorPickers() {
            if ($.fn.wpColorPicker) {
                $('.sfq-color-picker').each(function() {
                    $(this).wpColorPicker({
                        change: () => {
                            this.isDirty = true;
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
            
            // Clear references
            this.stateManager = null;
            this.questionManager = null;
            this.conditionEngine = null;
            this.uiRenderer = null;
            this.dataValidator = null;
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
                
                if (type && !$button.prop('disabled')) {
                    // Disable button temporarily
                    $button.prop('disabled', true);
                    
                    this.addQuestion(type);
                    
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
            // Clear container
            this.container.empty();
            this.questions = [];
            
            if (!questionsData || questionsData.length === 0) {
                this.formBuilder.uiRenderer.showEmptyState();
                return;
            }
            
            // Sort by position
            questionsData.sort((a, b) => (a.order_position || 0) - (b.order_position || 0));
            
            // Process each question
            questionsData.forEach((questionData, index) => {
                const question = this.createQuestionObject(questionData, index);
                if (question) {
                    this.questions.push(question);
                    const element = this.formBuilder.uiRenderer.renderQuestion(question);
                    this.container.append(element);
                    this.bindQuestionEvents(question.id);
                    
                    // Load conditions if any
                    if (questionData.conditions && questionData.conditions.length > 0) {
                        this.formBuilder.conditionEngine.loadConditions(question.id, questionData.conditions);
                    }
                }
            });
        }

        createQuestionObject(data, index) {
            const questionId = 'q_' + Date.now() + '_' + index;
            
            // Process options
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
            
            // Ensure options have correct structure
            options = options.map(opt => {
                if (typeof opt === 'string') {
                    return { text: opt, value: opt };
                }
                return {
                    text: opt.text || opt.value || '',
                    value: opt.value || opt.text || ''
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

        addQuestion(type) {
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
                
                this.questions.push(question);
                
                // Remove empty state if exists
                $('.sfq-empty-questions').remove();
                
                // Render and append
                const element = this.formBuilder.uiRenderer.renderQuestion(question);
                this.container.append(element);
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
                    question.options[optionIndex] = { text: value, value: value };
                } else {
                    question.options.push({ text: value, value: value });
                }
                self.formBuilder.isDirty = true; // Usar self en lugar de this
            });
        }

        addOption(questionId) {
            const question = this.questions.find(q => q.id === questionId);
            if (!question) return;
            
            const newOption = { text: '', value: '' };
            question.options.push(newOption);
            
            const optionHtml = this.formBuilder.uiRenderer.renderOption(newOption, question.options.length);
            $(`#options-${questionId}`).append(optionHtml);
            
            this.bindOptionEvents(questionId);
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

        getQuestionsData() {
            return this.questions.map((question, index) => ({
                question_text: question.text,
                question_type: question.type,
                required: question.required ? 1 : 0,
                order_position: index,
                options: question.options.filter(opt => opt.text),
                conditions: this.formBuilder.conditionEngine.getConditionsData(question.id),
                settings: question.settings || {}
            }));
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
        }

        loadConditions(questionId, conditionsData) {
            if (!conditionsData || !Array.isArray(conditionsData)) return;
            
            this.conditions[questionId] = conditionsData.map((cond, index) => ({
                id: 'c_' + questionId + '_' + index,
                type: cond.condition_type || 'answer_equals',
                value: cond.condition_value || '',
                action: cond.action_type || 'goto_question',
                actionValue: cond.action_value || '',
                operator: cond.variable_operation || '',
                amount: cond.variable_amount || 0
            }));
            
            // Render conditions
            this.renderConditions(questionId);
        }

        renderConditions(questionId) {
            const $container = $(`#conditions-${questionId}`);
            if (!$container.length) return;
            
            // Clear existing conditions (keep add button)
            $container.find('.sfq-condition-item').remove();
            
            const conditions = this.conditions[questionId] || [];
            conditions.forEach(condition => {
                const html = this.formBuilder.uiRenderer.renderCondition(condition);
                $container.find('.sfq-add-condition').before(html);
                this.bindConditionEvents(condition.id, questionId);
            });
        }

        addCondition(questionId) {
            const conditionId = 'c_' + Date.now();
            const condition = {
                id: conditionId,
                type: 'answer_equals',
                value: '',
                action: 'goto_question',
                actionValue: '',
                operator: '',
                amount: 0
            };
            
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
                condition.type = $(this).val();
                self.formBuilder.isDirty = true; // Usar self en lugar de this
            });
            
            $condition.find('.sfq-condition-value').off('input').on('input', function() {
                condition.value = $(this).val();
                self.formBuilder.isDirty = true; // Usar self en lugar de this
            });
            
            $condition.find('.sfq-action-type').off('change').on('change', function() {
                condition.action = $(this).val();
                self.formBuilder.isDirty = true; // Usar self en lugar de this
            });
            
            $condition.find('.sfq-action-value').off('input').on('input', function() {
                condition.actionValue = $(this).val();
                self.formBuilder.isDirty = true; // Usar self en lugar de this
            });
            
            // Remove condition
            $condition.find('.sfq-remove-condition').off('click').on('click', () => {
                this.removeCondition(conditionId, questionId);
            });
        }

        removeCondition(conditionId, questionId) {
            $(`#${conditionId}`).fadeOut(300, function() {
                $(this).remove();
            });
            
            if (this.conditions[questionId]) {
                this.conditions[questionId] = this.conditions[questionId].filter(c => c.id !== conditionId);
            }
            
            this.formBuilder.isDirty = true;
        }

        getConditionsData(questionId) {
            const conditions = this.conditions[questionId] || [];
            return conditions.map(cond => ({
                condition_type: cond.type,
                condition_value: cond.value,
                action_type: cond.action,
                action_value: cond.actionValue,
                variable_operation: cond.operator,
                variable_amount: cond.amount
            }));
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
            const typeLabels = {
                'single_choice': 'Opción Única',
                'multiple_choice': 'Opción Múltiple',
                'text': 'Texto',
                'email': 'Email',
                'rating': 'Valoración',
                'image_choice': 'Selección de Imagen'
            };

            let optionsHtml = '';
            if (['single_choice', 'multiple_choice', 'image_choice'].includes(question.type)) {
                const optionsList = question.options.map((option, index) => 
                    this.renderOption(option, index + 1)
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

        renderOption(option, index) {
            return `
                <div class="sfq-option-item">
                    <input type="text" class="sfq-option-input" 
                           placeholder="Opción ${index}" 
                           value="${this.escapeHtml(option.text || '')}">
                    <button class="sfq-option-remove" type="button">
                        <span class="dashicons dashicons-trash"></span>
                    </button>
                </div>
            `;
        }

        renderCondition(condition) {
            return `
                <div class="sfq-condition-item" id="${condition.id}">
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
                        <input type="text" class="sfq-condition-value" 
                               placeholder="Valor" 
                               value="${this.escapeHtml(condition.value)}">
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
                        <input type="text" class="sfq-action-value" 
                               placeholder="Valor de acción" 
                               value="${this.escapeHtml(condition.actionValue)}">
                        <button class="sfq-remove-condition" type="button" title="Eliminar condición">
                            <span class="dashicons dashicons-trash"></span>
                        </button>
                    </div>
                </div>
            `;
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
