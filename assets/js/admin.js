/**
 * Smart Forms & Quiz - Admin JavaScript
 * Maneja el constructor de formularios y la interfaz de administración
 */

jQuery(document).ready(function($) {
    'use strict';

    // Verificar que sfq_ajax esté disponible
    if (typeof sfq_ajax === 'undefined') {
        console.error('Smart Forms & Quiz: sfq_ajax object not found. Please check that scripts are loading correctly.');
        return;
    }

    // Constructor de formularios
    class FormBuilder {
        constructor() {
            this.formId = $('#sfq-form-id').val() || 0;
            this.questions = [];
            this.currentQuestionId = 0;
            this.isInitialized = false;
            this.init();
        }

        init() {
            if (this.isInitialized) {
                return;
            }
            
            this.bindEvents();
            this.initSortable();
            this.initColorPickers();
            this.loadFormData();
            this.updateStats();
            this.isInitialized = true;
        }

        bindEvents() {
            // Tabs
            $('.sfq-tab-button').on('click', (e) => this.switchTab(e));

            // Añadir pregunta
            $('.sfq-add-question').on('click', (e) => this.addQuestion(e));

            // Guardar formulario
            $('#sfq-save-form').on('click', () => this.saveForm());

            // Vista previa
            $('#sfq-preview-form').on('click', () => this.showPreview());

            // Cerrar vista previa
            $('.sfq-close-preview').on('click', () => this.closePreview());

            // Range slider
            $('#border-radius').on('input', function() {
                $('.sfq-range-value').text($(this).val() + 'px');
            });

            // Copiar shortcode
            $('.sfq-copy-shortcode').on('click', function() {
                const shortcode = $(this).data('shortcode');
                navigator.clipboard.writeText(shortcode);
                $(this).text('¡Copiado!');
                setTimeout(() => {
                    $(this).html('<span class="dashicons dashicons-clipboard"></span>');
                }, 2000);
            });

            // Eliminar formulario
            $('.sfq-delete-form').on('click', (e) => this.deleteForm(e));

            // Duplicar formulario
            $('.sfq-duplicate-form').on('click', (e) => this.duplicateForm(e));
            
            // Toggle pantalla de introducción
            $('#show-intro-screen').on('change', function() {
                if ($(this).is(':checked')) {
                    $('#intro-screen-settings').show();
                } else {
                    $('#intro-screen-settings').hide();
                }
            });
        }

        switchTab(e) {
            const button = $(e.currentTarget);
            const tab = button.data('tab');

            // Actualizar botones
            $('.sfq-tab-button').removeClass('active');
            button.addClass('active');

            // Actualizar contenido
            $('.sfq-tab-content').removeClass('active');
            $(`#tab-${tab}`).addClass('active');
        }

        addQuestion(e) {
            const type = $(e.currentTarget).data('type');
            const questionId = 'q_' + Date.now();
            
            const questionHtml = this.createQuestionElement({ id: questionId, type: type });
            
            // Remover mensaje vacío si existe
            $('.sfq-empty-questions').remove();
            
            // Añadir pregunta al contenedor
            $('#sfq-questions-container').append(questionHtml);
            
            // Añadir a la lista de preguntas
            this.questions.push({
                id: questionId,
                type: type,
                text: '',
                options: [],
                required: false,
                conditions: []
            });
            
            // Bind eventos de la nueva pregunta
            this.bindQuestionEvents(questionId);
            
            // Hacer scroll a la nueva pregunta
            $(`#${questionId}`)[0].scrollIntoView({ behavior: 'smooth' });
        }

        createQuestionElement(questionData) {
            const { id: questionId, type, text = '', options = [], required = false } = questionData;
            
            const typeLabels = {
                'single_choice': 'Opción Única',
                'multiple_choice': 'Opción Múltiple',
                'text': 'Texto',
                'email': 'Email',
                'rating': 'Valoración',
                'image_choice': 'Selección de Imagen'
            };

            let optionsHtml = '';
            if (['single_choice', 'multiple_choice', 'image_choice'].includes(type)) {
                let optionsList = '';
                
                // Process options correctly - ensure we have at least 2 empty options if none provided
                let processedOptions = options.length > 0 ? options : [{ text: '' }, { text: '' }];
                
                // Ensure options are in the correct format
                processedOptions = processedOptions.map(option => {
                    if (typeof option === 'string') {
                        return { text: option, value: option };
                    } else if (typeof option === 'object' && option !== null) {
                        return {
                            text: option.text || option.value || '',
                            value: option.value || option.text || ''
                        };
                    }
                    return { text: '', value: '' };
                });

                processedOptions.forEach((option, index) => {
                    const optionText = option.text || '';
                    optionsList += `
                        <div class="sfq-option-item">
                            <input type="text" class="sfq-option-input" placeholder="Opción ${index + 1}" value="${this.escapeHtml(optionText)}">
                            <button class="sfq-option-remove" type="button">
                                <span class="dashicons dashicons-trash"></span>
                            </button>
                        </div>
                    `;
                });

                optionsHtml = `
                    <div class="sfq-options-list" id="options-${questionId}">
                        ${optionsList}
                    </div>
                    <button class="sfq-add-option" type="button" data-question="${questionId}">
                        + Añadir opción
                    </button>
                `;
            }

            return `
                <div class="sfq-question-item" id="${questionId}" data-type="${type}">
                    <div class="sfq-question-header">
                        <span class="sfq-question-type-label">${typeLabels[type] || type}</span>
                        <div class="sfq-question-actions">
                            <button class="sfq-question-action sfq-move-handle" type="button">
                                <span class="dashicons dashicons-move"></span>
                            </button>
                            <button class="sfq-question-action sfq-duplicate-question" type="button" data-question="${questionId}">
                                <span class="dashicons dashicons-admin-page"></span>
                            </button>
                            <button class="sfq-question-action sfq-delete-question" type="button" data-question="${questionId}">
                                <span class="dashicons dashicons-trash"></span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="sfq-question-content">
                        <input type="text" class="sfq-question-text-input" 
                               placeholder="Escribe tu pregunta aquí..." 
                               data-question="${questionId}"
                               value="${this.escapeHtml(text)}">
                        
                        ${optionsHtml}
                        
                        <div class="sfq-question-settings">
                            <label>
                                <input type="checkbox" class="sfq-required-checkbox" data-question="${questionId}" ${required ? 'checked' : ''}>
                                Pregunta obligatoria
                            </label>
                        </div>
                        
                        <details class="sfq-conditions-section">
                            <summary>Lógica condicional</summary>
                            <div class="sfq-conditions-container" id="conditions-${questionId}">
                                <button class="sfq-add-condition" type="button" data-question="${questionId}">
                                    + Añadir condición
                                </button>
                            </div>
                        </details>
                    </div>
                </div>
            `;
        }

        bindQuestionEvents(questionId) {
            const questionEl = $(`#${questionId}`);
            
            // Eliminar pregunta
            questionEl.find('.sfq-delete-question').on('click', () => {
                if (confirm(sfq_ajax.strings.confirm_delete || '¿Estás seguro de eliminar esta pregunta?')) {
                    questionEl.remove();
                    this.questions = this.questions.filter(q => q.id !== questionId);
                    
                    if ($('#sfq-questions-container').children().length === 0) {
                        $('#sfq-questions-container').html(`
                            <div class="sfq-empty-questions">
                                <p>No hay preguntas todavía</p>
                                <p>Añade preguntas desde el panel lateral</p>
                            </div>
                        `);
                    }
                }
            });
            
            // Duplicar pregunta
            questionEl.find('.sfq-duplicate-question').on('click', () => {
                const originalQuestion = this.questions.find(q => q.id === questionId);
                const newQuestionId = 'q_' + Date.now();
                const newQuestion = { ...originalQuestion, id: newQuestionId };
                
                const newQuestionHtml = this.createQuestionElement(newQuestion);
                questionEl.after(newQuestionHtml);
                
                this.questions.push(newQuestion);
                this.bindQuestionEvents(newQuestionId);
            });
            
            // Actualizar texto de pregunta
            questionEl.find('.sfq-question-text-input').on('input', (e) => {
                const question = this.questions.find(q => q.id === questionId);
                if (question) {
                    question.text = $(e.target).val();
                }
            });
            
            // Checkbox requerido
            questionEl.find('.sfq-required-checkbox').on('change', (e) => {
                const question = this.questions.find(q => q.id === questionId);
                if (question) {
                    question.required = $(e.target).is(':checked');
                }
            });
            
            // Añadir opción
            questionEl.find('.sfq-add-option').on('click', () => {
                const optionHtml = `
                    <div class="sfq-option-item">
                        <input type="text" class="sfq-option-input" placeholder="Nueva opción">
                        <button class="sfq-option-remove" type="button">
                            <span class="dashicons dashicons-trash"></span>
                        </button>
                    </div>
                `;
                $(`#options-${questionId}`).append(optionHtml);
                this.bindOptionEvents(questionId);
            });
            
            // Bind eventos de opciones existentes
            this.bindOptionEvents(questionId);
            
            // Añadir condición
            questionEl.find('.sfq-add-condition').on('click', () => {
                this.addCondition(questionId);
            });
        }

        bindOptionEvents(questionId) {
            const questionEl = $(`#${questionId}`);
            
            // Eliminar opción
            questionEl.find('.sfq-option-remove').off('click').on('click', function() {
                const optionItem = $(this).closest('.sfq-option-item');
                if (questionEl.find('.sfq-option-item').length > 2) {
                    optionItem.remove();
                } else {
                    alert('Debe haber al menos 2 opciones');
                }
            });
            
            // Actualizar opciones
            questionEl.find('.sfq-option-input').off('input').on('input', () => {
                const question = this.questions.find(q => q.id === questionId);
                if (question) {
                    question.options = [];
                    questionEl.find('.sfq-option-input').each(function() {
                        if ($(this).val()) {
                            question.options.push({
                                text: $(this).val(),
                                value: $(this).val()
                            });
                        }
                    });
                }
            });
        }

        addCondition(questionId) {
            const conditionId = 'c_' + Date.now();
            const conditionHtml = `
                <div class="sfq-condition-item" id="${conditionId}">
                    <select class="sfq-condition-type">
                        <option value="answer_equals">Si la respuesta es igual a</option>
                        <option value="variable_greater">Si la variable es mayor que</option>
                        <option value="variable_less">Si la variable es menor que</option>
                    </select>
                    <input type="text" class="sfq-condition-value" placeholder="Valor">
                    <select class="sfq-action-type">
                        <option value="goto_question">Ir a pregunta</option>
                        <option value="redirect_url">Redirigir a URL</option>
                        <option value="add_variable">Sumar a variable</option>
                    </select>
                    <input type="text" class="sfq-action-value" placeholder="Valor de acción">
                    <button class="sfq-remove-condition" type="button">
                        <span class="dashicons dashicons-trash"></span>
                    </button>
                </div>
            `;
            
            $(`#conditions-${questionId}`).prepend(conditionHtml);
            
            // Bind evento de eliminar
            $(`#${conditionId} .sfq-remove-condition`).on('click', function() {
                $(this).closest('.sfq-condition-item').remove();
            });
        }

        initSortable() {
            if ($.fn.sortable) {
                $('#sfq-questions-container').sortable({
                    handle: '.sfq-move-handle',
                    placeholder: 'sfq-question-placeholder',
                    update: () => {
                        // Actualizar orden de preguntas
                        const newOrder = [];
                        $('#sfq-questions-container .sfq-question-item').each((index, el) => {
                            const questionId = $(el).attr('id');
                            const question = this.questions.find(q => q.id === questionId);
                            if (question) {
                                question.order = index;
                                newOrder.push(question);
                            }
                        });
                        this.questions = newOrder;
                    }
                });
            }
        }

        initColorPickers() {
            if ($.fn.wpColorPicker) {
                $('.sfq-color-picker').each(function() {
                    $(this).wpColorPicker({
                        change: function(event, ui) {
                            // Actualizar preview en tiempo real si está abierto
                            if ($('.sfq-builder-preview').hasClass('active')) {
                                // Actualizar colores en el iframe
                            }
                        }
                    });
                });
            }
        }

        saveForm() {
            // Retornar una Promise para poder usar async/await
            return new Promise((resolve, reject) => {
                // Validar formulario
                if (!$('#form-title').val()) {
                    alert(sfq_ajax.strings.required_fields || 'Por favor, introduce un título para el formulario');
                    reject('No title');
                    return;
                }
                
                // Mostrar loading
                $('#sfq-save-form').prop('disabled', true).html('<span class="sfq-loading-spinner"></span> ' + (sfq_ajax.strings.saving || 'Guardando...'));
                
                // Recopilar datos del formulario
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
                    settings: {
                        show_progress_bar: $('#show-progress-bar').is(':checked'),
                        auto_advance: $('#auto-advance').is(':checked'),
                        allow_back: $('#allow-back').is(':checked'),
                        randomize_questions: $('#randomize-questions').is(':checked'),
                        save_partial: $('#save-partial').is(':checked'),
                        show_intro_screen: $('#show-intro-screen').is(':checked')
                    },
                    style_settings: {
                        primary_color: $('#primary-color').val() || '#007cba',
                        secondary_color: $('#secondary-color').val() || '#6c757d',
                        background_color: $('#background-color').val() || '#ffffff',
                        text_color: $('#text-color').val() || '#333333',
                        border_radius: $('#border-radius').val() || '8',
                        font_family: $('#font-family').val() || 'inherit'
                    },
                    questions: this.getQuestionsData()
                };
                
                // Enviar datos usando el objeto sfq_ajax correcto
                $.ajax({
                    url: sfq_ajax.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'sfq_save_form',
                        nonce: sfq_ajax.nonce,
                        form_data: JSON.stringify(formData)
                    },
                    success: (response) => {
                        if (response.success) {
                            this.formId = response.data.form_id;
                            $('#sfq-form-id').val(this.formId);
                            
                            // Mostrar notificación
                            this.showNotice(sfq_ajax.strings.saved || 'Formulario guardado correctamente', 'success');
                            
                            // Actualizar URL si es nuevo formulario
                            if (window.history && window.history.pushState) {
                                const newUrl = window.location.pathname + '?page=sfq-new-form&form_id=' + this.formId;
                                window.history.pushState({}, '', newUrl);
                            }
                            
                            resolve(response);
                        } else {
                            this.showNotice(response.data?.message || sfq_ajax.strings.error || 'Error al guardar el formulario', 'error');
                            reject(response);
                        }
                    },
                    error: (xhr, status, error) => {
                        console.error('Error saving form:', error);
                        this.showNotice(sfq_ajax.strings.error || 'Error de conexión', 'error');
                        reject(error);
                    },
                    complete: () => {
                        $('#sfq-save-form').prop('disabled', false).html('<span class="dashicons dashicons-saved"></span> Guardar Formulario');
                    }
                });
            });
        }

        getQuestionsData() {
            const questionsData = [];
            
            $('#sfq-questions-container .sfq-question-item').each((index, el) => {
                const $el = $(el);
                const questionId = $el.attr('id');
                const type = $el.data('type');
                
                const questionData = {
                    question_text: $el.find('.sfq-question-text-input').val(),
                    question_type: type,
                    required: $el.find('.sfq-required-checkbox').is(':checked') ? 1 : 0,
                    order_position: index,
                    options: [],
                    conditions: []
                };
                
                // Recopilar opciones
                $el.find('.sfq-option-input').each(function() {
                    if ($(this).val()) {
                        questionData.options.push({
                            text: $(this).val(),
                            value: $(this).val()
                        });
                    }
                });
                
                // Recopilar condiciones
                $el.find('.sfq-condition-item').each(function() {
                    const $condition = $(this);
                    questionData.conditions.push({
                        condition_type: $condition.find('.sfq-condition-type').val(),
                        condition_value: $condition.find('.sfq-condition-value').val(),
                        action_type: $condition.find('.sfq-action-type').val(),
                        action_value: $condition.find('.sfq-action-value').val()
                    });
                });
                
                questionsData.push(questionData);
            });
            
            return questionsData;
        }

        loadFormData() {
            if (!this.formId || this.formId === '0') return;
            
            console.log('Loading form data for ID:', this.formId);
            
            // Mostrar indicador de carga
            this.showLoadingIndicator();
            
            $.ajax({
                url: sfq_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'sfq_get_form_data',
                    nonce: sfq_ajax.nonce,
                    form_id: this.formId
                },
                timeout: 30000, // 30 segundos timeout
                success: (response) => {
                    console.log('Form data response:', response);
                    
                    if (response.success && response.data) {
                        const form = response.data;
                        
                        try {
                            // Cargar datos generales con validación
                            $('#form-title').val(this.sanitizeString(form.title));
                            $('#form-description').val(this.sanitizeString(form.description));
                            $('#form-type').val(form.type === 'quiz' ? 'quiz' : 'form');
                            $('#intro-title').val(this.sanitizeString(form.intro_title));
                            $('#intro-description').val(this.sanitizeString(form.intro_description));
                            $('#intro-button-text').val(this.sanitizeString(form.intro_button_text) || 'Comenzar');
                            $('#thank-you-message').val(this.sanitizeString(form.thank_you_message));
                            $('#redirect-url').val(this.sanitizeString(form.redirect_url));
                            
                            // Cargar configuraciones con valores por defecto
                            const settings = form.settings || {};
                            $('#show-progress-bar').prop('checked', settings.show_progress_bar !== false);
                            $('#auto-advance').prop('checked', settings.auto_advance !== false);
                            $('#allow-back').prop('checked', settings.allow_back === true);
                            $('#randomize-questions').prop('checked', settings.randomize_questions === true);
                            $('#save-partial').prop('checked', settings.save_partial === true);
                            
                            // Cargar configuración de pantalla de introducción
                            const showIntroScreen = settings.show_intro_screen !== false; // Por defecto true
                            $('#show-intro-screen').prop('checked', showIntroScreen);
                            
                            // Mostrar/ocultar configuraciones de intro según el estado
                            if (showIntroScreen) {
                                $('#intro-screen-settings').show();
                            } else {
                                $('#intro-screen-settings').hide();
                            }
                            
                            // Cargar estilos con valores por defecto
                            const styles = form.style_settings || {};
                            $('#primary-color').val(styles.primary_color || '#007cba').trigger('change');
                            $('#secondary-color').val(styles.secondary_color || '#6c757d').trigger('change');
                            $('#background-color').val(styles.background_color || '#ffffff').trigger('change');
                            $('#text-color').val(styles.text_color || '#333333').trigger('change');
                            $('#border-radius').val(styles.border_radius || '8');
                            $('.sfq-range-value').text((styles.border_radius || '8') + 'px');
                            $('#font-family').val(styles.font_family || 'inherit');
                            
                            // Cargar preguntas con validación mejorada
                            this.loadQuestionsFromData(form.questions || []);
                            
                            this.showNotice('Formulario cargado correctamente', 'success');
                        } catch (error) {
                            console.error('Error processing form data:', error);
                            this.showNotice('Error al procesar los datos del formulario', 'error');
                        }
                    } else {
                        console.error('Invalid response:', response);
                        const errorMessage = response.data?.message || 'Error al cargar los datos del formulario';
                        this.showNotice(errorMessage, 'error');
                    }
                },
                error: (xhr, status, error) => {
                    console.error('Error loading form data:', error, xhr.responseText);
                    let errorMessage = 'Error de conexión al cargar el formulario';
                    
                    if (status === 'timeout') {
                        errorMessage = 'Tiempo de espera agotado. Por favor, intenta de nuevo.';
                    } else if (xhr.status === 403) {
                        errorMessage = 'No tienes permisos para acceder a este formulario';
                    } else if (xhr.status === 404) {
                        errorMessage = 'Formulario no encontrado';
                    }
                    
                    this.showNotice(errorMessage, 'error');
                },
                complete: () => {
                    this.hideLoadingIndicator();
                }
            });
        }

        loadQuestionsFromData(questions) {
            console.log('SFQ: Starting to load questions data:', questions);
            
            // Limpiar contenedor y resetear lista de preguntas
            $('#sfq-questions-container').empty();
            this.questions = [];
            
            if (!questions || !Array.isArray(questions) || questions.length === 0) {
                console.log('SFQ: No questions found, showing empty state');
                $('#sfq-questions-container').html(`
                    <div class="sfq-empty-questions">
                        <p>No hay preguntas todavía</p>
                        <p>Añade preguntas desde el panel lateral</p>
                    </div>
                `);
                return;
            }
            
            console.log(`SFQ: Processing ${questions.length} questions`);
            
            // Ordenar preguntas por posición
            questions.sort((a, b) => {
                const posA = this.getNumericValue(a.order_position, 9999);
                const posB = this.getNumericValue(b.order_position, 9999);
                return posA - posB;
            });
            
            let successCount = 0;
            let errorCount = 0;
            
            questions.forEach((question, index) => {
                try {
                    console.log(`SFQ: Processing question ${index + 1}:`, {
                        id: question.id,
                        text: question.question_text?.substring(0, 50) + '...',
                        type: question.question_type,
                        options_count: Array.isArray(question.options) ? question.options.length : 0,
                        conditions_count: Array.isArray(question.conditions) ? question.conditions.length : 0
                    });
                    
                    const questionData = this.processQuestionForRendering(question, index);
                    
                    if (!questionData) {
                        throw new Error('Failed to process question data');
                    }
                    
                    const questionHtml = this.createQuestionElement(questionData);
                    $('#sfq-questions-container').append(questionHtml);
                    
                    // Bind eventos después de añadir al DOM
                    this.bindQuestionEvents(questionData.id);
                    
                    // Cargar condiciones si existen
                    if (question.conditions && Array.isArray(question.conditions) && question.conditions.length > 0) {
                        this.loadQuestionConditions($(`#${questionData.id}`), question, questionData.id);
                    }
                    
                    this.questions.push(questionData);
                    successCount++;
                    
                } catch (error) {
                    console.error(`SFQ: Error loading question ${index + 1}:`, error, question);
                    errorCount++;
                }
            });
            
            console.log(`SFQ: Questions loading completed. Success: ${successCount}, Errors: ${errorCount}`);
            
            if (successCount === 0 && errorCount > 0) {
                this.showNotice('Error al cargar las preguntas del formulario', 'error');
            } else if (errorCount > 0) {
                this.showNotice(`Se cargaron ${successCount} preguntas, ${errorCount} con errores`, 'warning');
            }
        }
        
        processQuestionForRendering(question, index) {
            try {
                // Generar ID único para la pregunta
                const questionId = 'q_' + (question.id ? question.id + '_' + Date.now() : Date.now() + index);
                
                // Procesar opciones con validación robusta
                let processedOptions = [];
                if (question.options) {
                    if (Array.isArray(question.options)) {
                        processedOptions = this.validateAndProcessOptions(question.options);
                    } else if (typeof question.options === 'string') {
                        try {
                            const parsed = JSON.parse(question.options);
                            if (Array.isArray(parsed)) {
                                processedOptions = this.validateAndProcessOptions(parsed);
                            }
                        } catch (e) {
                            console.warn('SFQ: Failed to parse options JSON:', question.options);
                        }
                    }
                }
                
                // Procesar campo required con múltiples formatos
                const isRequired = this.processRequiredField(question.required);
                
                const questionData = {
                    id: questionId,
                    text: this.sanitizeString(question.question_text || question.text || ''),
                    type: question.question_type || question.type || 'text',
                    required: isRequired,
                    options: processedOptions,
                    originalId: question.id || null
                };
                
                console.log(`SFQ: Processed question data:`, {
                    id: questionData.id,
                    type: questionData.type,
                    required: questionData.required,
                    options_count: questionData.options.length,
                    text_length: questionData.text.length
                });
                
                return questionData;
                
            } catch (error) {
                console.error('SFQ: Error processing question for rendering:', error);
                return null;
            }
        }
        
        validateAndProcessOptions(options) {
            if (!Array.isArray(options)) {
                return [];
            }
            
            const processedOptions = [];
            
            options.forEach((option, index) => {
                try {
                    let processedOption = null;
                    
                    if (typeof option === 'string') {
                        processedOption = {
                            text: option,
                            value: option
                        };
                    } else if (typeof option === 'object' && option !== null) {
                        processedOption = {
                            text: option.text || option.value || '',
                            value: option.value || option.text || ''
                        };
                    }
                    
                    if (processedOption && processedOption.text.trim() !== '') {
                        processedOptions.push(processedOption);
                    }
                } catch (error) {
                    console.warn(`SFQ: Error processing option ${index}:`, error, option);
                }
            });
            
            // Asegurar que hay al menos 2 opciones para preguntas de selección
            if (processedOptions.length === 0) {
                return [
                    { text: '', value: '' },
                    { text: '', value: '' }
                ];
            } else if (processedOptions.length === 1) {
                processedOptions.push({ text: '', value: '' });
            }
            
            return processedOptions;
        }
        
        processRequiredField(required) {
            if (typeof required === 'boolean') {
                return required;
            }
            
            if (typeof required === 'number') {
                return required === 1;
            }
            
            if (typeof required === 'string') {
                const normalizedRequired = required.toLowerCase().trim();
                return ['1', 'true', 'yes', 'on'].includes(normalizedRequired);
            }
            
            return false;
        }
        
        getNumericValue(value, defaultValue = 0) {
            if (typeof value === 'number') {
                return value;
            }
            
            if (typeof value === 'string') {
                const parsed = parseInt(value, 10);
                return isNaN(parsed) ? defaultValue : parsed;
            }
            
            return defaultValue;
        }

        validateOptions(options) {
            if (!options || !Array.isArray(options)) {
                return [];
            }
            
            return options.map(option => {
                if (typeof option === 'string') {
                    return { text: option, value: option };
                } else if (typeof option === 'object' && option !== null) {
                    return {
                        text: option.text || option.value || '',
                        value: option.value || option.text || ''
                    };
                }
                return { text: '', value: '' };
            }).filter(option => option.text.trim() !== '');
        }

        validateConditions(conditions) {
            if (!conditions || !Array.isArray(conditions)) {
                return [];
            }
            
            return conditions.filter(condition => {
                return condition && 
                       typeof condition === 'object' && 
                       condition.condition_type && 
                       condition.action_type;
            });
        }

        loadQuestionConditions($question, question, questionId) {
            try {
                console.log('Loading conditions for question:', questionId, question.conditions);
                
                // Handle case where conditions might be null or undefined
                const conditions = question.conditions || [];
                if (!Array.isArray(conditions) || conditions.length === 0) {
                    console.log('No conditions to load for question:', questionId);
                    return;
                }
                
                const $conditionsContainer = $question.find(`#conditions-${questionId}`);
                if ($conditionsContainer.length === 0) {
                    console.error('Conditions container not found for question:', questionId);
                    return;
                }
                
                // Limpiar condiciones existentes (excepto el botón de añadir)
                $conditionsContainer.find('.sfq-condition-item').remove();
                
                // Validate conditions before processing
                const validConditions = this.validateConditions(conditions);
                
                validConditions.forEach((condition, index) => {
                    const conditionId = 'c_' + questionId + '_' + index + '_' + Date.now();
                    console.log(`Adding condition ${index + 1}:`, condition);
                    
                    // Ensure condition properties exist with default values
                    const conditionType = condition.condition_type || condition.type || 'answer_equals';
                    const conditionValue = condition.condition_value || condition.value || '';
                    const actionType = condition.action_type || condition.action || 'goto_question';
                    const actionValue = condition.action_value || condition.actionValue || '';
                    
                    const conditionHtml = `
                        <div class="sfq-condition-item" id="${conditionId}">
                            <select class="sfq-condition-type">
                                <option value="answer_equals" ${conditionType === 'answer_equals' ? 'selected' : ''}>Si la respuesta es igual a</option>
                                <option value="variable_greater" ${conditionType === 'variable_greater' ? 'selected' : ''}>Si la variable es mayor que</option>
                                <option value="variable_less" ${conditionType === 'variable_less' ? 'selected' : ''}>Si la variable es menor que</option>
                            </select>
                            <input type="text" class="sfq-condition-value" placeholder="Valor" value="${this.escapeHtml(conditionValue)}">
                            <select class="sfq-action-type">
                                <option value="goto_question" ${actionType === 'goto_question' ? 'selected' : ''}>Ir a pregunta</option>
                                <option value="redirect_url" ${actionType === 'redirect_url' ? 'selected' : ''}>Redirigir a URL</option>
                                <option value="add_variable" ${actionType === 'add_variable' ? 'selected' : ''}>Sumar a variable</option>
                            </select>
                            <input type="text" class="sfq-action-value" placeholder="Valor de acción" value="${this.escapeHtml(actionValue)}">
                            <button class="sfq-remove-condition" type="button">
                                <span class="dashicons dashicons-trash"></span>
                            </button>
                        </div>
                    `;
                    
                    // Insertar antes del botón de añadir condición
                    const $addButton = $conditionsContainer.find('.sfq-add-condition');
                    if ($addButton.length > 0) {
                        $addButton.before(conditionHtml);
                    } else {
                        $conditionsContainer.append(conditionHtml);
                    }
                    
                    // Bind evento de eliminar condición
                    $(`#${conditionId} .sfq-remove-condition`).on('click', function() {
                        console.log('Removing condition:', conditionId);
                        $(this).closest('.sfq-condition-item').remove();
                    });
                });
                
                console.log(`Conditions loaded successfully for question ${questionId}. Total conditions: ${$conditionsContainer.find('.sfq-condition-item').length}`);
            } catch (error) {
                console.error('Error loading conditions for question:', questionId, error);
            }
        }

        escapeHtml(text) {
            if (typeof text !== 'string') return '';
            return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }

        async showPreview() {
            try {
                // Guardar primero
                await this.saveForm();
                
                // Abrir preview
                const previewUrl = window.location.origin + '/?sfq_preview=' + this.formId;
                $('#sfq-preview-iframe').attr('src', previewUrl);
                $('.sfq-builder-preview').addClass('active');
            } catch (error) {
                console.error('Error showing preview:', error);
            }
        }

        closePreview() {
            $('.sfq-builder-preview').removeClass('active');
            $('#sfq-preview-iframe').attr('src', '');
        }

        deleteForm(e) {
            const formId = $(e.currentTarget).data('form-id');
            
            if (!confirm(sfq_ajax.strings.confirm_delete_form || '¿Estás seguro de eliminar este formulario? Esta acción no se puede deshacer.')) {
                return;
            }
            
            $.ajax({
                url: sfq_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'sfq_delete_form',
                    nonce: sfq_ajax.nonce,
                    form_id: formId
                },
                success: (response) => {
                    if (response.success) {
                        const card = $(`.sfq-form-card[data-form-id="${formId}"]`);
                        card.fadeOut(400, function() {
                            $(this).remove();
                            // Verificar si quedan formularios
                            if ($('.sfq-form-card').length === 0) {
                                location.reload();
                            }
                        });
                        this.showNotice('Formulario eliminado correctamente', 'success');
                    }
                },
                error: (xhr, status, error) => {
                    console.error('Error deleting form:', error);
                    this.showNotice('Error al eliminar el formulario', 'error');
                }
            });
        }

        duplicateForm(e) {
            const formId = $(e.currentTarget).data('form-id');
            
            $.ajax({
                url: sfq_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'sfq_duplicate_form',
                    nonce: sfq_ajax.nonce,
                    form_id: formId
                },
                success: (response) => {
                    if (response.success) {
                        location.reload();
                    }
                },
                error: (xhr, status, error) => {
                    console.error('Error duplicating form:', error);
                    this.showNotice('Error al duplicar el formulario', 'error');
                }
            });
        }

        updateStats() {
            if (!sfq_ajax.rest_url) return;
            
            $('.sfq-form-card').each(function() {
                const formId = $(this).data('form-id');
                
                $.ajax({
                    url: sfq_ajax.rest_url + 'analytics/' + formId,
                    type: 'GET',
                    beforeSend: function(xhr) {
                        xhr.setRequestHeader('X-WP-Nonce', sfq_ajax.nonce);
                    },
                    success: (data) => {
                        if (data && data.overview) {
                            $(`#views-${formId}`).text(data.overview.total_views || 0);
                            $(`#completed-${formId}`).text(data.overview.total_completed || 0);
                            $(`#rate-${formId}`).text((data.overview.completion_rate || 0) + '%');
                        }
                    },
                    error: (xhr, status, error) => {
                        console.log('Stats not available for form ' + formId);
                    }
                });
            });
        }

        showNotice(message, type = 'success') {
            const notice = $(`
                <div class="sfq-notice sfq-notice-${type}">
                    ${message}
                </div>
            `);
            
            // Buscar el contenedor adecuado
            let container = $('.sfq-builder-header');
            if (!container.length) {
                container = $('.sfq-admin-wrap').first();
            }
            
            container.after(notice);
            
            setTimeout(() => {
                notice.fadeOut(400, function() {
                    $(this).remove();
                });
            }, 3000);
        }

        showLoadingIndicator() {
            // Crear indicador de carga si no existe
            if ($('.sfq-loading-indicator').length === 0) {
                const loadingHtml = `
                    <div class="sfq-loading-indicator">
                        <div class="sfq-loading-spinner"></div>
                        <p>Cargando formulario...</p>
                    </div>
                `;
                $('.sfq-builder-container').prepend(loadingHtml);
            }
        }

        hideLoadingIndicator() {
            $('.sfq-loading-indicator').remove();
        }

        sanitizeString(str) {
            if (typeof str !== 'string') {
                return '';
            }
            return str.trim();
        }
    }

    // Inicializar constructor si estamos en la página correcta
    if ($('.sfq-builder-wrap').length) {
        // Esperar a que el DOM esté completamente cargado
        $(window).on('load', function() {
            window.sfqFormBuilder = new FormBuilder();
        });
        
        // Fallback en caso de que window.load no se dispare
        setTimeout(function() {
            if (typeof window.sfqFormBuilder === 'undefined') {
                window.sfqFormBuilder = new FormBuilder();
            }
        }, 1000);
    }

    // Actualizar estadísticas en la página principal
    if ($('.sfq-forms-grid').length) {
        const statsUpdater = new FormBuilder();
        statsUpdater.updateStats();
    }
});
