/**
 * FormBuilderCore - Controlador principal
 * Smart Forms & Quiz - Admin Builder v2
 */

(function($) {
    'use strict';

    class SFQ_FormBuilderCore {
        constructor() {
            // Generar ID único para esta instancia
            this.instanceId = 'sfq_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            this.formId = $('#sfq-form-id').val() || 0;
            this.isInitialized = false;
            this.isDirty = false;
            this.autoSaveInterval = null;
            this.isSaving = false; // Flag para prevenir guardado duplicado
            this.isDestroyed = false; // Flag para prevenir operaciones después de destruir
            
            // Inicializar módulos
            this.initializeModules();
            
            this.init();
        }

        initializeModules() {
            console.log('SFQ: Initializing modules...');
            
            // Verificar que todas las clases estén disponibles
            const requiredClasses = {
                SFQ_StateManager: window.SFQ_StateManager,
                SFQ_DataValidator: window.SFQ_DataValidator,
                SFQ_UIRenderer: window.SFQ_UIRenderer,
                SFQ_ConditionEngine: window.SFQ_ConditionEngine,
                SFQ_EventManager: window.SFQ_EventManager
            };
            
            // Verificar clases faltantes
            const missingClasses = Object.keys(requiredClasses).filter(className => {
                return !requiredClasses[className];
            });
            
            if (missingClasses.length > 0) {
                console.error('SFQ: Missing required classes:', missingClasses);
                throw new Error('Missing required modules: ' + missingClasses.join(', '));
            }
            
            // Inicializar módulos core
            this.stateManager = new SFQ_StateManager();
            this.dataValidator = new SFQ_DataValidator();
            this.uiRenderer = new SFQ_UIRenderer(this);
            this.conditionEngine = new SFQ_ConditionEngine(this);
            this.eventManager = new SFQ_EventManager(this);
            
            // QuestionManager necesita ser inicializado después porque depende de otros módulos
            if (window.SFQ_QuestionManager) {
                this.questionManager = new SFQ_QuestionManager(this);
            } else {
                console.error('SFQ: SFQ_QuestionManager not available');
                throw new Error('SFQ_QuestionManager module is required');
            }
            
            // Módulos opcionales (componentes)
            this.freestyleElements = window.SFQ_FreestyleElements ? new SFQ_FreestyleElements(this) : null;
            this.imageManager = window.SFQ_ImageManager ? new SFQ_ImageManager(this) : null;
            this.variableManager = window.SFQ_VariableManager ? new SFQ_VariableManager(this) : null;
            this.styleManager = window.SFQ_StyleManager ? new SFQ_StyleManager(this) : null;
            this.blockFormTimerManager = window.SFQ_BlockFormTimerManager ? new SFQ_BlockFormTimerManager(this) : null;
            this.previewManager = window.SFQ_PreviewManager ? new SFQ_PreviewManager(this) : null;
            this.cacheCompatibility = window.SFQ_CacheCompatibility ? new SFQ_CacheCompatibility(this) : null;
            
            console.log('SFQ: Modules initialized successfully');
        }

        init() {
            if (this.isInitialized || this.isDestroyed) return;
            
            console.log('SFQ: Initializing FormBuilderCore...');
            
            // Inicializar módulos
            this.initializeModuleComponents();
            
            // Cargar datos del formulario
            this.loadFormData();
            
            // Configurar auto-guardado
            this.setupAutoSave();
            
            this.isInitialized = true;
            console.log('SFQ: FormBuilderCore initialized successfully');
        }

        initializeModuleComponents() {
            // Inicializar componentes de módulos
            if (this.questionManager) {
                this.questionManager.init();
            }
            
            if (this.conditionEngine) {
                this.conditionEngine.init();
            }
            
            if (this.uiRenderer) {
                this.uiRenderer.init();
            }
            
            if (this.eventManager) {
                this.eventManager.init();
            }
            
            // Inicializar módulos opcionales
            if (this.freestyleElements) {
                this.freestyleElements.init();
            }
            
            if (this.imageManager) {
                this.imageManager.init();
            }
            
            if (this.variableManager) {
                this.variableManager.init();
            }
            
            if (this.styleManager) {
                this.styleManager.init();
            }
            
            if (this.blockFormTimerManager) {
                this.blockFormTimerManager.init();
            }
            
            if (this.previewManager) {
                this.previewManager.init();
            }
            
            if (this.cacheCompatibility) {
                this.cacheCompatibility.init();
            }
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
            console.log('SFQ: Populating form data:', formData);
            
            // Store complete form data in state
            this.stateManager.setState('formData', formData);
            
            // Populate basic form fields
            this.populateBasicFields(formData);
            
            // Populate settings
            this.populateSettings(formData.settings || {});
            
            // Populate style settings
            this.populateStyleSettings(formData.style_settings || {});
            
            // Load questions
            if (formData.questions && Array.isArray(formData.questions)) {
                this.questionManager.loadQuestions(formData.questions);
            }
            
            // Render variables if available
            if (this.variableManager) {
                this.variableManager.renderVariables();
            }
        }

        populateBasicFields(formData) {
            $('#form-title').val(formData.title || '');
            $('#form-description').val(formData.description || '');
            $('#form-type').val(formData.type || 'form');
            $('#intro-title').val(formData.intro_title || '');
            $('#intro-description').val(formData.intro_description || '');
            $('#intro-button-text').val(formData.intro_button_text || 'Comenzar');
            $('#thank-you-message').val(formData.thank_you_message || '');
            $('#redirect-url').val(formData.redirect_url || '');
        }

        populateSettings(settings) {
            // Basic settings
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
            $('#enable-auto-save').prop('checked', settings.enable_auto_save !== false); // Default to true
            
            // Processing indicator settings
            $('#processing-indicator-text').val(settings.processing_indicator_text || '...');
            $('#processing-indicator-opacity').val(settings.processing_indicator_opacity !== undefined ? settings.processing_indicator_opacity : '0.7');
            $('.sfq-processing-opacity-value').text(settings.processing_indicator_opacity !== undefined ? settings.processing_indicator_opacity : '0.7');
            $('#processing-indicator-bg-color').val(settings.processing_indicator_bg_color || '#ffffff').trigger('change');
            $('#processing-indicator-text-color').val(settings.processing_indicator_text_color || '#666666').trigger('change');
            $('#processing-indicator-spinner-color').val(settings.processing_indicator_spinner_color || '#007cba').trigger('change');
            $('#processing-indicator-delay').val(settings.processing_indicator_delay || '100');
            
            // Show/hide processing indicator settings
            if (settings.show_processing_indicator === true) {
                $('#processing-indicator-settings').show();
            } else {
                $('#processing-indicator-settings').hide();
            }
            
            // Block form
            $('#block-form').prop('checked', settings.block_form === true).trigger('change');
            
            // Secure loading
            $('#secure-loading').prop('checked', settings.secure_loading === true);
            
            // Show/hide intro settings
            $('#intro-screen-settings').toggle(settings.show_intro_screen !== false);
            
            // Load limits settings
            this.populateLimitsSettings(settings);
        }

        populateLimitsSettings(settings) {
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
            
            // Show/hide fields based on loaded configuration
            const hasCount = settings.submission_limit_count && settings.submission_limit_count > 0;
            const period = settings.submission_limit_period || 'no_limit';
            if (hasCount && period !== 'no_limit') {
                $('#limit-type-container, #limit-message-container').show();
            } else {
                $('#limit-type-container, #limit-message-container').hide();
            }
            
            // Update limits summary after loading data
            this.updateLimitsSummary();
        }

        populateStyleSettings(styles) {
            // Basic colors
            $('#primary-color').val(styles.primary_color || '#007cba').trigger('change');
            $('#secondary-color').val(styles.secondary_color || '#6c757d').trigger('change');
            $('#background-color').val(styles.background_color || '#ffffff').trigger('change');
            $('#options-background-color').val(styles.options_background_color || '#ffffff').trigger('change');
            $('#options-border-color').val(styles.options_border_color || '#e0e0e0').trigger('change');
            $('#text-color').val(styles.text_color || '#333333').trigger('change');
            $('#question-text-color').val(styles.question_text_color || '#333333').trigger('change');
            $('#intro-title-color').val(styles.intro_title_color || '#333333').trigger('change');
            $('#intro-description-color').val(styles.intro_description_color || '#666666').trigger('change');
            $('#input-border-color').val(styles.input_border_color || '#ddd').trigger('change');
            
            // Animated gradient settings
            this.populateAnimatedGradientSettings(styles);
            
            // Opacity values
            this.populateOpacityValues(styles);
            
            // Layout settings
            $('#border-radius').val(styles.border_radius || '8');
            $('.sfq-range-value').text((styles.border_radius || '8') + 'px');
            $('#font-family').val(styles.font_family || 'inherit');
            
            // Container settings
            this.populateContainerSettings(styles);
            
            // Background image settings
            this.populateBackgroundImageSettings(styles);
            
            // Message customization settings
            this.populateMessageSettings(styles);
        }

        populateOpacityValues(styles) {
            const opacityFields = [
                'primary_color', 'secondary_color', 'background_color', 'options_background_color',
                'options_border_color', 'text_color', 'input_border_color'
            ];
            
            opacityFields.forEach(field => {
                const opacityValue = styles[field + '_opacity'] !== undefined ? styles[field + '_opacity'] : '1';
                $(`#${field.replace(/_/g, '-')}-opacity`).val(opacityValue);
                $(`.sfq-opacity-value[data-for="${field.replace(/_/g, '-')}"]`).text(Math.round(opacityValue * 100) + '%');
            });
        }

        populateContainerSettings(styles) {
            $('#form-container-border-radius').val(styles.form_container_border_radius || '20');
            $('.sfq-form-container-radius-value').text((styles.form_container_border_radius || '20') + 'px');
            $('#form-container-shadow').prop('checked', styles.form_container_shadow === true);
            $('#form-container-padding').val(styles.form_container_padding || '2rem 2rem 3rem'); // Permitir cadena vacía para valores CSS
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
        }

        populateBackgroundImageSettings(styles) {
            $('#background-image-url').val(styles.background_image_url || '');
            $('#background-image-id').val(styles.background_image_id || '');
            $('#background-image-data').val(styles.background_image_data || '');
            $('#background-size').val(styles.background_size || 'cover');
            $('#background-repeat').val(styles.background_repeat || 'no-repeat');
            $('#background-position').val(styles.background_position || 'center center');
            $('#background-attachment').val(styles.background_attachment || 'scroll');
            $('#background-opacity').val(styles.background_opacity !== undefined ? styles.background_opacity : '1');
            $('.sfq-background-opacity-value').text(styles.background_opacity !== undefined ? styles.background_opacity : '1');
            $('#background-overlay').prop('checked', styles.background_overlay === true);
            $('#background-overlay-color').val(styles.background_overlay_color || '#000000').trigger('change');
            $('#background-overlay-opacity').val(styles.background_overlay_opacity !== undefined ? styles.background_overlay_opacity : '0.3');
            $('.sfq-background-overlay-opacity-value').text(styles.background_overlay_opacity !== undefined ? styles.background_overlay_opacity : '0.3');
            
            // Show preview if background image exists
            if (styles.background_image_url && styles.background_image_url.trim() !== '') {
                this.updateBackgroundImagePreview(styles.background_image_url);
                $('#background-image-options').show();
                $('#select-background-image').text('Cambiar Imagen');
                $('#remove-background-image').show();
            }
            
            // Show overlay options if enabled
            if (styles.background_overlay === true) {
                $('#background-overlay-options').show();
            }
        }

        populateAnimatedGradientSettings(styles) {
            // ===== TAB-STYLE GRADIENT (formulario completo) =====
            // Animated gradient activation - CORREGIDO: Usar normalización de boolean
            const tabStyleGradientEnabled = this.dataValidator.normalizeBoolean(styles.intro_animated_background);
            $('#intro-animated-background').prop('checked', tabStyleGradientEnabled);
            
            // Gradient colors
            $('#intro-gradient-color-1').val(styles.intro_gradient_color_1 || '#ee7752').trigger('change');
            $('#intro-gradient-color-2').val(styles.intro_gradient_color_2 || '#e73c7e').trigger('change');
            $('#intro-gradient-color-3').val(styles.intro_gradient_color_3 || '#23a6d5').trigger('change');
            $('#intro-gradient-color-4').val(styles.intro_gradient_color_4 || '#23d5ab').trigger('change');
            
            // Gradient options
            $('#intro-gradient-speed').val(styles.intro_gradient_speed || '15');
            $('.sfq-gradient-speed-value').text((styles.intro_gradient_speed || '15') + 's');
            
            $('#intro-gradient-angle').val(styles.intro_gradient_angle || '-45');
            $('.sfq-gradient-angle-value').text((styles.intro_gradient_angle || '-45') + '°');
            
            $('#intro-gradient-size').val(styles.intro_gradient_size || '400');
            $('.sfq-gradient-size-value').text((styles.intro_gradient_size || '400') + '%');
            
            // Show/hide gradient colors container based on activation - CORREGIDO
            if (tabStyleGradientEnabled) {
                $('#intro-gradient-colors').show();
            } else {
                $('#intro-gradient-colors').hide();
            }
            
            // ===== INTRO SCREEN GRADIENT (solo pantalla de introducción) =====
            // Animated gradient activation for intro screen - CORREGIDO: Usar normalización de boolean
            const introScreenGradientEnabled = this.dataValidator.normalizeBoolean(styles.intro_screen_animated_background);
            $('#intro-animated-background-checkbox').prop('checked', introScreenGradientEnabled);
            
            // Intro screen gradient colors
            $('#intro-screen-gradient-color-1').val(styles.intro_screen_gradient_color_1 || '#ee7752').trigger('change');
            $('#intro-screen-gradient-color-2').val(styles.intro_screen_gradient_color_2 || '#e73c7e').trigger('change');
            $('#intro-screen-gradient-color-3').val(styles.intro_screen_gradient_color_3 || '#23a6d5').trigger('change');
            $('#intro-screen-gradient-color-4').val(styles.intro_screen_gradient_color_4 || '#23d5ab').trigger('change');
            
            // Intro screen gradient options
            $('#intro-screen-gradient-speed').val(styles.intro_screen_gradient_speed || '15');
            $('.sfq-gradient-speed-value').text((styles.intro_screen_gradient_speed || '15') + 's');
            
            $('#intro-screen-gradient-angle').val(styles.intro_screen_gradient_angle || '-45');
            $('.sfq-gradient-angle-value').text((styles.intro_screen_gradient_angle || '-45') + '°');
            
            $('#intro-screen-gradient-size').val(styles.intro_screen_gradient_size || '400');
            $('.sfq-gradient-size-value').text((styles.intro_screen_gradient_size || '400') + '%');
            
            // Show/hide intro screen gradient colors container based on activation - CORREGIDO
            if (introScreenGradientEnabled) {
                $('#intro-gradient-colors-container').show();
            } else {
                $('#intro-gradient-colors-container').hide();
            }
            
            // Update previews if gradients are active - CORREGIDO
            if (tabStyleGradientEnabled) {
                setTimeout(() => {
                    this.updateGradientPreview();
                }, 100);
            }
            
            if (introScreenGradientEnabled) {
                setTimeout(() => {
                    this.updateIntroScreenGradientPreview();
                }, 100);
            }
        }

        populateMessageSettings(styles) {
            // Limit message customization
            $('#limit-submission-icon').val(styles.limit_submission_icon || '');
            $('#limit-submission-title').val(styles.limit_submission_title || '');
            $('#limit-submission-description').val(styles.limit_submission_description || '');
            $('#limit-submission-button-text').val(styles.limit_submission_button_text || '');
            $('#limit-submission-button-url').val(styles.limit_submission_button_url || '');
            
            // Participants limit
            $('#limit-participants-icon').val(styles.limit_participants_icon || '');
            $('#limit-participants-title').val(styles.limit_participants_title || '');
            $('#limit-participants-description').val(styles.limit_participants_description || '');
            $('#max-submissions-message').val(styles.limit_participants_description || '');
            $('#limit-participants-button-text').val(styles.limit_participants_button_text || '');
            $('#limit-participants-button-url').val(styles.limit_participants_button_url || '');
            
            // Login required
            $('#limit-login-icon').val(styles.limit_login_icon || '');
            $('#limit-login-title').val(styles.limit_login_title || '');
            $('#limit-login-description').val(styles.limit_login_description || '');
            $('#limit-login-button-text').val(styles.limit_login_button_text || '');
            
            // Schedule limits
            $('#limit-schedule-icon').val(styles.limit_schedule_icon || '');
            $('#limit-schedule-not-started-title').val(styles.limit_schedule_not_started_title || '');
            $('#limit-schedule-ended-title').val(styles.limit_schedule_ended_title || '');
            $('#limit-schedule-button-text').val(styles.limit_schedule_button_text || '');
            $('#limit-schedule-button-url').val(styles.limit_schedule_button_url || '');
            
            // Message colors
            $('#limit-background-color').val(styles.limit_background_color || '#f8f9fa').trigger('change');
            $('#limit-border-color').val(styles.limit_border_color || '#e9ecef').trigger('change');
            $('#limit-icon-color').val(styles.limit_icon_color || '#6c757d').trigger('change');
            $('#limit-title-color').val(styles.limit_title_color || '#333333').trigger('change');
            $('#limit-text-color').val(styles.limit_text_color || '#666666').trigger('change');
            $('#limit-button-bg-color').val(styles.limit_button_bg_color || '#007cba').trigger('change');
            $('#limit-button-text-color').val(styles.limit_button_text_color || '#ffffff').trigger('change');
            
            // Block form and timer settings
            this.populateBlockFormSettings(styles);
        }

        populateBlockFormSettings(styles) {
            // Basic block form settings
            $('#block-form-icon').val(styles.block_form_icon || '');
            $('#block-form-video-url').val(styles.block_form_video_url || '');
            $('#block-form-title').val(styles.block_form_title || '');
            $('#block-form-description').val(styles.block_form_description || '');
            $('#block-form-button-text').val(styles.block_form_button_text || '');
            $('#block-form-button-url').val(styles.block_form_button_url || '');
            
            // Block form colors
            $('#block-form-bg-color').val(styles.block_form_bg_color || '#f8f9fa').trigger('change');
            $('#block-form-border-color').val(styles.block_form_border_color || '#e9ecef').trigger('change');
            $('#block-form-icon-color').val(styles.block_form_icon_color || '#dc3545').trigger('change');
            $('#block-form-title-color').val(styles.block_form_title_color || '#333333').trigger('change');
            $('#block-form-text-color').val(styles.block_form_text_color || '#666666').trigger('change');
            $('#block-form-button-bg-color').val(styles.block_form_button_bg_color || '#007cba').trigger('change');
            $('#block-form-button-text-color').val(styles.block_form_button_text_color || '#ffffff').trigger('change');
            $('#block-form-disable-shadow').prop('checked', styles.block_form_disable_shadow === true);
            
            // Timer settings via BlockFormTimerManager
            if (this.blockFormTimerManager) {
                this.blockFormTimerManager.populateTimerSettings(styles);
            }
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
            
            console.log('SFQ: Saving form data:', formData);
            
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
            const formData = {
                id: this.formId,
                title: $('#form-title').val(),
                description: $('#form-description').val(),
                type: $('#form-type').val() || 'form',
                intro_title: $('#intro-title').val(),
                intro_description: $('#intro-description').val(),
                intro_button_text: $('#intro-button-text').val() || 'Comenzar',
                thank_you_message: $('#thank-you-message').val(),
                redirect_url: $('#redirect-url').val(),
                settings: this.collectSettings(),
                style_settings: this.collectStyleSettings(),
                questions: this.questionManager.getQuestionsData(),
                global_variables: this.getGlobalVariables()
            };
            
            return formData;
        }

        collectSettings() {
            return {
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
                processing_indicator_opacity: $('#processing-indicator-opacity').val() !== '' ? $('#processing-indicator-opacity').val() : '0.7',
                processing_indicator_bg_color: $('#processing-indicator-bg-color').val() || '#ffffff',
                processing_indicator_text_color: $('#processing-indicator-text-color').val() || '#666666',
                processing_indicator_spinner_color: $('#processing-indicator-spinner-color').val() || '#007cba',
                processing_indicator_delay: $('#processing-indicator-delay').val() || '100',
                block_form: $('#block-form').is(':checked'),
                secure_loading: $('#secure-loading').is(':checked'),
                // Limits settings
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
                max_submissions_message: $('#max-submissions-message').val() || '',
                enable_auto_save: $('#enable-auto-save').is(':checked')
            };
        }

        collectStyleSettings() {
            return {
                primary_color: $('#primary-color').val() || '#007cba',
                primary_color_opacity: $('#primary-color-opacity').val() !== '' ? $('#primary-color-opacity').val() : '1',
                secondary_color: $('#secondary-color').val() || '#6c757d',
                secondary_color_opacity: $('#secondary-color-opacity').val() !== '' ? $('#secondary-color-opacity').val() : '1',
                background_color: $('#background-color').val() || '#ffffff',
                background_color_opacity: $('#background-color-opacity').val() !== '' ? $('#background-color-opacity').val() : '1',
                options_background_color: $('#options-background-color').val() || '#ffffff',
                options_background_color_opacity: $('#options-background-color-opacity').val() !== '' ? $('#options-background-color-opacity').val() : '1',
                options_border_color: $('#options-border-color').val() || '#e0e0e0',
                options_border_color_opacity: $('#options-border-color-opacity').val() !== '' ? $('#options-border-color-opacity').val() : '1',
                text_color: $('#text-color').val() || '#333333',
                text_color_opacity: $('#text-color-opacity').val() !== '' ? $('#text-color-opacity').val() : '1',
                question_text_color: $('#question-text-color').val() || '#333333',
                intro_title_color: $('#intro-title-color').val() || '#333333',
                intro_description_color: $('#intro-description-color').val() || '#666666',
                input_border_color: $('#input-border-color').val() || '#ddd',
                input_border_color_opacity: $('#input-border-color-opacity').val() !== '' ? $('#input-border-color-opacity').val() : '1',
                border_radius: $('#border-radius').val() || '8',
                font_family: $('#font-family').val() || 'inherit',
                // Container settings
                form_container_border_radius: $('#form-container-border-radius').val() || '20',
                form_container_shadow: $('#form-container-shadow').is(':checked'),
                form_container_padding: (() => {
                    const value = $('#form-container-padding').val();
                    return value !== '' ? value : '2rem 2rem 3rem';
                })(),
                form_container_width: $('#form-container-width').val() || 'responsive',
                form_container_custom_width: $('#form-container-custom-width').val() || '720',
                question_content_width: $('#question-content-width').val() || 'responsive',
                question_content_custom_width: $('#question-content-custom-width').val() || '600',
                question_text_size: $('#question-text-size').val() || '24',
                option_text_size: $('#option-text-size').val() || '16',
                question_content_min_height: $('#question-content-min-height').val() || '0',
                question_text_align: $('#question-text-align').val() || 'left',
                general_text_align: $('#general-text-align').val() || 'left',
                // Background image settings
                background_image_url: $('#background-image-url').val() || '',
                background_image_id: $('#background-image-id').val() || '',
                background_image_data: $('#background-image-data').val() || '',
                background_size: $('#background-size').val() || 'cover',
                background_repeat: $('#background-repeat').val() || 'no-repeat',
                background_position: $('#background-position').val() || 'center center',
                background_attachment: $('#background-attachment').val() || 'scroll',
                background_opacity: $('#background-opacity').val() !== '' ? $('#background-opacity').val() : '1',
                background_overlay: $('#background-overlay').is(':checked'),
                background_overlay_color: $('#background-overlay-color').val() || '#000000',
                background_overlay_opacity: $('#background-overlay-opacity').val() !== '' ? $('#background-overlay-opacity').val() : '0.3',
                // Animated gradient settings (Tab-Style - formulario completo)
                intro_animated_background: $('#intro-animated-background').is(':checked'),
                intro_gradient_color_1: $('#intro-gradient-color-1').val() || '#ee7752',
                intro_gradient_color_2: $('#intro-gradient-color-2').val() || '#e73c7e',
                intro_gradient_color_3: $('#intro-gradient-color-3').val() || '#23a6d5',
                intro_gradient_color_4: $('#intro-gradient-color-4').val() || '#23d5ab',
                intro_gradient_speed: $('#intro-gradient-speed').val() || '15',
                intro_gradient_angle: $('#intro-gradient-angle').val() || '-45',
                intro_gradient_size: $('#intro-gradient-size').val() || '400',
                // Intro screen gradient settings (solo pantalla de introducción)
                intro_screen_animated_background: $('#intro-animated-background-checkbox').is(':checked'),
                intro_screen_gradient_color_1: $('#intro-screen-gradient-color-1').val() || '#ee7752',
                intro_screen_gradient_color_2: $('#intro-screen-gradient-color-2').val() || '#e73c7e',
                intro_screen_gradient_color_3: $('#intro-screen-gradient-color-3').val() || '#23a6d5',
                intro_screen_gradient_color_4: $('#intro-screen-gradient-color-4').val() || '#23d5ab',
                intro_screen_gradient_speed: $('#intro-screen-gradient-speed').val() || '15',
                intro_screen_gradient_angle: $('#intro-screen-gradient-angle').val() || '-45',
                intro_screen_gradient_size: $('#intro-screen-gradient-size').val() || '400',
                // Block form and timer settings
                ...this.collectBlockFormSettings()
            };
        }

        collectBlockFormSettings() {
            const blockFormSettings = {
                // Basic block form settings
                block_form_icon: $('#block-form-icon').val() || '',
                block_form_video_url: $('#block-form-video-url').val() || '',
                block_form_title: $('#block-form-title').val() || '',
                block_form_description: $('#block-form-description').val() || '',
                block_form_button_text: $('#block-form-button-text').val() || '',
                block_form_button_url: $('#block-form-button-url').val() || '',
                // Block form colors
                block_form_bg_color: $('#block-form-bg-color').val() || '#f8f9fa',
                block_form_border_color: $('#block-form-border-color').val() || '#e9ecef',
                block_form_icon_color: $('#block-form-icon-color').val() || '#dc3545',
                block_form_title_color: $('#block-form-title-color').val() || '#333333',
                block_form_text_color: $('#block-form-text-color').val() || '#666666',
                block_form_button_bg_color: $('#block-form-button-bg-color').val() || '#007cba',
                block_form_button_text_color: $('#block-form-button-text-color').val() || '#ffffff',
                block_form_disable_shadow: $('#block-form-disable-shadow').is(':checked')
            };

            // Timer settings via BlockFormTimerManager
            if (this.blockFormTimerManager) {
                const timerSettings = this.blockFormTimerManager.collectTimerSettings();
                Object.assign(blockFormSettings, timerSettings);
            }

            return blockFormSettings;
        }

        setupAutoSave() {
            // Clear any existing interval to prevent duplicates
            if (this.autoSaveInterval) {
                clearInterval(this.autoSaveInterval);
                this.autoSaveInterval = null;
            }

            // Only set up auto-save if enabled
            if ($('#enable-auto-save').is(':checked')) {
                this.autoSaveInterval = setInterval(() => {
                    if (this.isDirty && this.formId && !this.isSaving && !this.isDestroyed) {
                        this.saveForm();
                    }
                }, 30000);
            }
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

        // Variables globales
        getGlobalVariables() {
            const formData = this.stateManager.getState('formData');
            return formData?.global_variables || [];
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

        // Background image methods (placeholders - will be implemented by ImageManager)
        updateBackgroundImagePreview(url) {
            if (this.imageManager) {
                this.imageManager.updateBackgroundImagePreview(url);
            }
        }

        hideBackgroundImagePreview() {
            if (this.imageManager) {
                this.imageManager.hideBackgroundImagePreview();
            }
        }

        removeBackgroundImage() {
            if (this.imageManager) {
                this.imageManager.removeBackgroundImage();
            }
        }

        openBackgroundImageSelector() {
            if (this.imageManager) {
                this.imageManager.openBackgroundImageSelector();
            }
        }

        isValidImageUrl(url) {
            if (this.imageManager) {
                return this.imageManager.isValidImageUrl(url);
            }
            return false;
        }

        // Style update method (placeholder - will be implemented by StyleManager)
        updatePreviewStyles() {
            if (this.styleManager) {
                this.styleManager.updatePreviewStyles();
            }
        }

        // Gradient preview update method
        updateGradientPreview() {
            const color1 = $('#intro-gradient-color-1').val();
            const color2 = $('#intro-gradient-color-2').val();
            const color3 = $('#intro-gradient-color-3').val();
            const color4 = $('#intro-gradient-color-4').val();
            const speed = $('#intro-gradient-speed').val();
            const angle = $('#intro-gradient-angle').val();
            const size = $('#intro-gradient-size').val();
            
            const $preview = $('#intro-gradient-preview');
            
            // Crear el gradiente CSS
            const gradient = `linear-gradient(${angle}deg, ${color1}, ${color2}, ${color3}, ${color4})`;
            
            // Aplicar estilos al preview
            $preview.css({
                'background': gradient,
                'background-size': `${size}% ${size}%`,
                'animation': `sfq-gradient-animation ${speed}s ease infinite`
            });
            
            // Actualizar la animación CSS dinámicamente
            this.updateGradientAnimation(speed);
        }

        // Update gradient animation duration
        updateGradientAnimation(speed) {
            // Buscar si ya existe una regla de animación personalizada
            let styleSheet = document.getElementById('sfq-dynamic-gradient-styles');
            if (!styleSheet) {
                styleSheet = document.createElement('style');
                styleSheet.id = 'sfq-dynamic-gradient-styles';
                document.head.appendChild(styleSheet);
            }
            
            // Actualizar la regla CSS para ambos previews
            styleSheet.textContent = `
                #intro-gradient-preview, #intro-screen-gradient-preview {
                    animation-duration: ${speed}s !important;
                }
            `;
        }

        // ✅ NUEVO: Función para actualizar preview del gradiente de pantalla de introducción
        updateIntroScreenGradientPreview() {
            const color1 = $('#intro-screen-gradient-color-1').val();
            const color2 = $('#intro-screen-gradient-color-2').val();
            const color3 = $('#intro-screen-gradient-color-3').val();
            const color4 = $('#intro-screen-gradient-color-4').val();
            const speed = $('#intro-screen-gradient-speed').val();
            const angle = $('#intro-screen-gradient-angle').val();
            const size = $('#intro-screen-gradient-size').val();
            
            const $preview = $('#intro-screen-gradient-preview');
            
            // Crear el gradiente CSS
            const gradient = `linear-gradient(${angle}deg, ${color1}, ${color2}, ${color3}, ${color4})`;
            
            // Aplicar estilos al preview
            $preview.css({
                'background': gradient,
                'background-size': `${size}% ${size}%`,
                'animation': `sfq-gradient-animation ${speed}s ease infinite`
            });
            
            // Actualizar la animación CSS dinámicamente
            this.updateIntroScreenGradientAnimation(speed);
        }

        // ✅ NUEVO: Actualizar animación específica para pantalla de introducción
        updateIntroScreenGradientAnimation(speed) {
            // Buscar si ya existe una regla de animación personalizada
            let styleSheet = document.getElementById('sfq-dynamic-intro-gradient-styles');
            if (!styleSheet) {
                styleSheet = document.createElement('style');
                styleSheet.id = 'sfq-dynamic-intro-gradient-styles';
                document.head.appendChild(styleSheet);
            }
            
            // Actualizar la regla CSS específica para intro screen
            styleSheet.textContent = `
                #intro-screen-gradient-preview {
                    animation-duration: ${speed}s !important;
                }
            `;
        }

        destroy() {
            this.isDestroyed = true;
            
            // Clear auto-save interval
            if (this.autoSaveInterval) {
                clearInterval(this.autoSaveInterval);
                this.autoSaveInterval = null;
            }
            
            // Destroy modules
            if (this.eventManager) {
                this.eventManager.destroy();
            }
            
            if (this.questionManager) {
                this.questionManager.destroy();
            }
            
            if (this.conditionEngine) {
                this.conditionEngine.destroy();
            }
            
            if (this.freestyleElements) {
                this.freestyleElements.destroy();
            }
            
            if (this.imageManager) {
                this.imageManager.destroy();
            }
            
            if (this.variableManager) {
                this.variableManager.destroy();
            }
            
            if (this.styleManager) {
                this.styleManager.destroy();
            }
            
            if (this.blockFormTimerManager) {
                this.blockFormTimerManager.destroy();
            }
            
            if (this.previewManager) {
                this.previewManager.destroy();
            }
            
            if (this.cacheCompatibility) {
                this.cacheCompatibility.destroy();
            }
            
            // Clear references
            this.stateManager = null;
            this.questionManager = null;
            this.conditionEngine = null;
            this.uiRenderer = null;
            this.dataValidator = null;
            this.eventManager = null;
            this.freestyleElements = null;
            this.imageManager = null;
            this.variableManager = null;
            this.styleManager = null;
            this.previewManager = null;
        }
    }

    // Export para uso en otros módulos
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = SFQ_FormBuilderCore;
    } else {
        window.SFQ_FormBuilderCore = SFQ_FormBuilderCore;
    }

})(jQuery);
