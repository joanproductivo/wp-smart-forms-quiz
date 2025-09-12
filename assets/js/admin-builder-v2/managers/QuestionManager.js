/**
 * QuestionManager - Gestión de preguntas
 * Smart Forms & Quiz - Admin Builder v2
 */

(function($) {
    'use strict';

    /**
     * QuestionManager - Gestión de preguntas
     */
    class SFQ_QuestionManager {
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
                    handle: '.sfq-question-header',
                    placeholder: 'sfq-question-placeholder',
                    cursor: 'grabbing',
                    opacity: 0.8,
                    tolerance: 'intersect', // ✅ CORREGIDO: Cambiar de 'pointer' a 'intersect' para mejor detección
                    distance: 5,
                    scroll: true,
                    scrollSensitivity: 100,
                    scrollSpeed: 20,
                    containment: false, // ✅ CORREGIDO: Cambiar de 'parent' a false para permitir movimiento libre
                    helper: 'clone',
                    axis: false, // ✅ NUEVO: Permitir movimiento en ambas direcciones
                    forceHelperSize: true, // ✅ NUEVO: Mantener tamaño del helper
                    forcePlaceholderSize: true, // ✅ NUEVO: Mantener tamaño del placeholder
                    start: (event, ui) => {
                        // Añadir clase visual al elemento que se está arrastrando
                        ui.item.addClass('sfq-dragging');
                        ui.placeholder.height(ui.item.outerHeight());
                        ui.placeholder.width(ui.item.outerWidth()); // ✅ NUEVO: Mantener ancho también
                        
                        // Mostrar indicador visual
                        this.showDragIndicator();
                    },
                    stop: (event, ui) => {
                        // Remover clase visual
                        ui.item.removeClass('sfq-dragging');
                        
                        // Ocultar indicador visual
                        this.hideDragIndicator();
                        
                        // Actualizar orden
                        this.updateQuestionsOrder();
                        
                        // Mostrar feedback visual
                        this.showReorderFeedback(ui.item);
                    },
                    change: (event, ui) => {
                        // Actualizar placeholder dinámicamente
                        ui.placeholder.html(`
                            <div class="sfq-placeholder-content">
                                <div class="sfq-placeholder-icon">↕️</div>
                                <div class="sfq-placeholder-text">Suelta aquí para reordenar</div>
                            </div>
                        `);
                    },
                    // ✅ NUEVO: Eventos adicionales para debugging
                    over: function(event, ui) {
                        console.log('SFQ: Question sortable over event triggered');
                    },
                    out: function(event, ui) {
                        console.log('SFQ: Question sortable out event triggered');
                    },
                    beforeStop: function(event, ui) {
                        console.log('SFQ: Question sortable beforeStop - current position:', ui.item.index());
                    }
                });
                
                // También hacer sortable el contenedor de pantallas finales
                const $finalScreensContainer = $('#sfq-final-screens-container');
                if ($finalScreensContainer.length > 0) {
                    $finalScreensContainer.sortable({
                        handle: '.sfq-question-header',
                        placeholder: 'sfq-question-placeholder',
                        cursor: 'grabbing',
                        opacity: 0.8,
                        tolerance: 'pointer',
                        distance: 5,
                        scroll: true,
                        scrollSensitivity: 100,
                        scrollSpeed: 20,
                        containment: 'parent',
                        helper: 'clone',
                        start: (event, ui) => {
                            ui.item.addClass('sfq-dragging');
                            ui.placeholder.height(ui.item.outerHeight());
                            this.showDragIndicator();
                        },
                        stop: (event, ui) => {
                            ui.item.removeClass('sfq-dragging');
                            this.hideDragIndicator();
                            this.updateFinalScreensOrder();
                            this.showReorderFeedback(ui.item);
                        },
                        change: (event, ui) => {
                            ui.placeholder.html(`
                                <div class="sfq-placeholder-content">
                                    <div class="sfq-placeholder-icon">🏁</div>
                                    <div class="sfq-placeholder-text">Suelta aquí para reordenar pantalla final</div>
                                </div>
                            `);
                        }
                    });
                }
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
                    
        // ✅ NUEVO: Repoblar imagen de pregunta para tipos objetivo
        if (['single_choice', 'multiple_choice', 'rating', 'text', 'email'].includes(question.type)) {
            this.repopulateQuestionImage(question.id, question);
        }
        
        // ✅ NUEVO: Repoblar video de pregunta para tipos objetivo
        if (['single_choice', 'multiple_choice', 'rating', 'text', 'email'].includes(question.type)) {
            this.repopulateQuestionVideo(question.id, question);
        }
                    
                    // ✅ NUEVO: Repoblar video de pregunta para tipos objetivo
                    if (['single_choice', 'multiple_choice', 'rating', 'text', 'email'].includes(question.type)) {
                        this.repopulateQuestionVideo(question.id, question);
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
                    conditions: [],
                    settings: {
                        collapsed: false // Default to not collapsed when adding new question
                    }
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
            
            // Delete question - REMOVIDO: Ahora se maneja por event delegation en EventManager.js
            // $question.find('.sfq-delete-question').off('click').on('click', () => {
            //     if (confirm('¿Estás seguro de eliminar esta pregunta?')) {
            //         this.deleteQuestion(questionId);
            //     }
            // });
            
            // Duplicate question - REMOVIDO: Ahora se maneja por event delegation en EventManager.js
            // $question.find('.sfq-duplicate-question').off('click').on('click', () => {
            //     this.duplicateQuestion(questionId);
            // });
            
            // Update question text
            $question.find('.sfq-question-text-input').off('input').on('input', (e) => {
                question.text = $(e.target).val();
                this.formBuilder.isDirty = true;
                
                // Update the title preview in the header
                const $titlePreview = $question.find('.sfq-question-title-preview');
                const currentText = question.text || 'Pregunta sin título';
                const truncatedText = currentText.substring(0, 60) + (currentText.length > 60 ? '...' : '');
                $titlePreview.text(truncatedText);
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
            
            // ✅ NUEVO: Inicializar estado de plegado/expansión
            const isCollapsed = question.settings.collapsed === true;
            if (isCollapsed) {
                $question.addClass('collapsed');
                $question.find('.sfq-question-content').addClass('collapsed');
            } else {
                $question.removeClass('collapsed');
                $question.find('.sfq-question-content').removeClass('collapsed');
            }
            console.log('SFQ: Initialized collapsed state for question', question.id, 'to:', isCollapsed);

            // ✅ NUEVO: Inicializar estado de configuración del botón siguiente para preguntas freestyle
            if (question.type === 'freestyle') {
                this.initializeFreestyleButtonSettings($question, question);
            }
            
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
            
            // Add option - REMOVIDO: Ahora se maneja por event delegation en EventManager.js
            // $question.find('.sfq-add-option').off('click').on('click', () => {
            //     this.addOption(questionId);
            // });
            
            // Bind option events
            this.bindOptionEvents(questionId);
            
            // Add condition button - REMOVIDO: Ahora se maneja por event delegation en EventManager.js
            // $question.find('.sfq-add-condition').off('click').on('click', () => {
            //     this.formBuilder.conditionEngine.addCondition(questionId);
            // });
            
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
            
            // ✅ NUEVO: Inicializar sortable para elementos freestyle
            this.initFreestyleSortable(questionId);
        }

        /**
         * ✅ NUEVO: Inicializar sistema de ordenamiento drag & drop para elementos freestyle
         */
        initFreestyleSortable(questionId) {
            const $elementsContainer = $(`#freestyle-elements-${questionId}`);
            
            if ($elementsContainer.length === 0 || !$.fn.sortable) {
                console.log('SFQ: Sortable container not found or jQuery UI not available for question:', questionId);
                return;
            }
            
            // Destruir sortable existente si existe
            if ($elementsContainer.hasClass('ui-sortable')) {
                $elementsContainer.sortable('destroy');
            }
            
            const self = this;
            
            $elementsContainer.sortable({
                items: '.sfq-freestyle-element',
                handle: '.sfq-freestyle-element-header',
                placeholder: 'sfq-freestyle-element-placeholder',
                cursor: 'grabbing',
                opacity: 0.8,
                tolerance: 'intersect', // ✅ CORREGIDO: Cambiar de 'pointer' a 'intersect' para mejor detección
                distance: 5,
                scroll: true,
                scrollSensitivity: 100,
                scrollSpeed: 20,
                containment: false, // ✅ CORREGIDO: Cambiar de 'parent' a false para permitir movimiento libre
                helper: 'clone',
                axis: false, // ✅ NUEVO: Permitir movimiento en ambas direcciones
                forceHelperSize: true, // ✅ NUEVO: Mantener tamaño del helper
                forcePlaceholderSize: true, // ✅ NUEVO: Mantener tamaño del placeholder
                start: function(event, ui) {
                    // Añadir clase visual al elemento que se está arrastrando
                    ui.item.addClass('sfq-dragging-element');
                    ui.placeholder.height(ui.item.outerHeight());
                    ui.placeholder.width(ui.item.outerWidth()); // ✅ NUEVO: Mantener ancho también
                    
                    // Crear placeholder personalizado para elementos freestyle
                    ui.placeholder.html(`
                        <div class="sfq-freestyle-placeholder-content">
                            <div class="sfq-freestyle-placeholder-icon">🔄</div>
                            <div class="sfq-freestyle-placeholder-text">Suelta aquí para reordenar elemento</div>
                        </div>
                    `);
                    
                    console.log('SFQ: Started dragging freestyle element:', ui.item.data('element-id'));
                },
                stop: function(event, ui) {
                    // Remover clase visual
                    ui.item.removeClass('sfq-dragging-element');
                    
                    // Actualizar orden de elementos
                    self.updateFreestyleElementsOrder(questionId);
                    
                    // Mostrar feedback visual
                    self.showFreestyleReorderFeedback(ui.item);
                    
                    console.log('SFQ: Finished dragging freestyle element:', ui.item.data('element-id'));
                },
                change: function(event, ui) {
                    // Actualizar placeholder dinámicamente
                    const elementType = ui.item.data('element-type');
                    const elementTypeNames = {
                        'text': '📝',
                        'video': '🎥',
                        'image': '🖼️',
                        'countdown': '⏰',
                        'phone': '📞',
                        'email': '📧',
                        'file_upload': '📤',
                        'button': '🔘',
                        'rating': '⭐',
                        'dropdown': '📋',
                        'checkbox': '☑️',
                        'legal_text': '⚖️',
                        'variable_display': '🔢',
                        'styled_text': '✨'
                    };
                    
                    const icon = elementTypeNames[elementType] || '🔄';
                    
                    ui.placeholder.html(`
                        <div class="sfq-freestyle-placeholder-content">
                            <div class="sfq-freestyle-placeholder-icon">${icon}</div>
                            <div class="sfq-freestyle-placeholder-text">Reordenando elemento ${elementType}</div>
                        </div>
                    `);
                },
                // ✅ NUEVO: Eventos adicionales para debugging
                over: function(event, ui) {
                    console.log('SFQ: Sortable over event triggered');
                },
                out: function(event, ui) {
                    console.log('SFQ: Sortable out event triggered');
                },
                beforeStop: function(event, ui) {
                    console.log('SFQ: Sortable beforeStop - current position:', ui.item.index());
                }
            });
            
            console.log('SFQ: Initialized sortable for freestyle elements in question:', questionId);
        }

        /**
         * ✅ NUEVO: Actualizar orden de elementos freestyle después del drag & drop
         */
        updateFreestyleElementsOrder(questionId) {
            const question = this.questions.find(q => q.id === questionId);
            if (!question || !question.freestyle_elements) {
                console.error('SFQ: Question or freestyle elements not found for order update:', questionId);
                return;
            }
            
            const $elementsContainer = $(`#freestyle-elements-${questionId}`);
            const newOrder = [];
            
            // Recorrer elementos en el nuevo orden del DOM
            $elementsContainer.find('.sfq-freestyle-element').each((index, element) => {
                const elementId = $(element).data('element-id');
                const freestyleElement = question.freestyle_elements.find(el => el.id === elementId);
                
                if (freestyleElement) {
                    // Actualizar el orden del elemento
                    freestyleElement.order = index;
                    newOrder.push(freestyleElement);
                    
                    console.log(`SFQ: Updated element ${elementId} to order ${index}`);
                }
            });
            
            // Actualizar el array de elementos con el nuevo orden
            question.freestyle_elements = newOrder;
            
            // Marcar formulario como modificado
            this.formBuilder.isDirty = true;
            
            console.log('SFQ: Updated freestyle elements order for question:', questionId);
            console.log('SFQ: New order:', newOrder.map(el => ({ id: el.id, type: el.type, order: el.order })));
        }

        /**
         * ✅ NUEVO: Mostrar feedback visual después de reordenar elementos freestyle
         */
        showFreestyleReorderFeedback(item) {
            // Añadir clase de feedback temporal
            item.addClass('sfq-freestyle-reordered');
            
            // Remover clase después de la animación
            setTimeout(() => {
                item.removeClass('sfq-freestyle-reordered');
            }, 800);
            
            // Mostrar notificación
            this.formBuilder.uiRenderer.showNotice('Elemento reordenado correctamente', 'success');
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
            
            // Configure element by clicking on preview (NEW FUNCTIONALITY)
            $question.find('.sfq-freestyle-element-preview').off('click').on('click', function() {
                const $element = $(this).closest('.sfq-freestyle-element');
                const elementId = $element.data('element-id');
                const elementType = $element.data('element-type');
                
                self.openElementConfigModal(questionId, elementId, elementType);
            });
            
            // Duplicate element - REMOVIDO: Ahora se maneja por event delegation en EventManager.js
            // $question.find('.sfq-duplicate-element').off('click').on('click', function() {
            //     const $element = $(this).closest('.sfq-freestyle-element');
            //     const elementId = $element.data('element-id');
            //     self.duplicateFreestyleElement(questionId, elementId);
            // });
            
            // Delete element - REMOVIDO: Ahora se maneja por event delegation en EventManager.js
            // $question.find('.sfq-delete-element').off('click').on('click', function() {
            //     const $element = $(this).closest('.sfq-freestyle-element');
            //     const elementId = $element.data('element-id');
            //     
            //     if (confirm('¿Estás seguro de eliminar este elemento?')) {
            //         self.deleteFreestyleElement(questionId, elementId);
            //     }
            // });
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
                          <option value="Open Sans" ${settings.font_family === 'Open Sans' || !settings.font_family ? 'selected' : ''}>Open Sans</option>
                            <option value="inherit" ${settings.font_family === 'inherit' || !settings.font_family ? 'selected' : ''}>Por defecto</option>
                            <option value="'Asap'" ${settings.font_family === 'Asap' ? 'selected' : ''}>Asap</option>
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
                
                <!-- ✅ NUEVO: Configuración de gradiente animado -->
                <div class="sfq-config-row">
                    <label class="sfq-config-label">
                        <input type="checkbox" class="sfq-config-input" data-setting="gradient_enabled" ${settings.gradient_enabled ? 'checked' : ''}>
                        🌈 Activar fondo animado con gradiente
                    </label>
                    <p class="description" style="margin-left: 20px; font-size: 11px; color: #666;">
                        Añade un fondo animado con gradiente de múltiples colores que se mueve suavemente
                    </p>
                </div>
                
                <!-- Panel avanzado de configuración de gradiente -->
                <div class="sfq-gradient-advanced-panel" style="display: ${settings.gradient_enabled ? 'block' : 'none'}; margin-top: 15px; padding: 15px; background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px;">
                    
                    <!-- Colores del gradiente -->
                    <div class="sfq-gradient-colors-section">
                        <h6 style="margin: 0 0 15px 0; font-size: 12px; font-weight: 600; color: #495057; text-transform: uppercase; letter-spacing: 0.5px;">
                            🎨 Colores del Gradiente
                        </h6>
                        <div class="sfq-gradient-colors-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-bottom: 20px;">
                            <div class="sfq-gradient-color-item">
                                <label style="display: block; font-size: 11px; color: #666; margin-bottom: 4px;">Color 1:</label>
                                <input type="color" class="sfq-config-input sfq-gradient-color-picker" data-setting="gradient_color_1" 
                                       value="${settings.gradient_color_1 || '#ee7752'}" style="width: 100%; height: 35px;">
                            </div>
                            <div class="sfq-gradient-color-item">
                                <label style="display: block; font-size: 11px; color: #666; margin-bottom: 4px;">Color 2:</label>
                                <input type="color" class="sfq-config-input sfq-gradient-color-picker" data-setting="gradient_color_2" 
                                       value="${settings.gradient_color_2 || '#e73c7e'}" style="width: 100%; height: 35px;">
                            </div>
                            <div class="sfq-gradient-color-item">
                                <label style="display: block; font-size: 11px; color: #666; margin-bottom: 4px;">Color 3:</label>
                                <input type="color" class="sfq-config-input sfq-gradient-color-picker" data-setting="gradient_color_3" 
                                       value="${settings.gradient_color_3 || '#23a6d5'}" style="width: 100%; height: 35px;">
                            </div>
                            <div class="sfq-gradient-color-item">
                                <label style="display: block; font-size: 11px; color: #666; margin-bottom: 4px;">Color 4:</label>
                                <input type="color" class="sfq-config-input sfq-gradient-color-picker" data-setting="gradient_color_4" 
                                       value="${settings.gradient_color_4 || '#23d5ab'}" style="width: 100%; height: 35px;">
                            </div>
                        </div>
                    </div>
                    
                    <!-- Opciones de animación -->
                    <div class="sfq-gradient-animation-section">
                        <h6 style="margin: 0 0 15px 0; font-size: 12px; font-weight: 600; color: #495057; text-transform: uppercase; letter-spacing: 0.5px;">
                            ⚡ Configuración de Animación
                        </h6>
                        
                        <div class="sfq-gradient-controls-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                            <div class="sfq-gradient-control-item">
                                <label style="display: block; font-size: 11px; color: #666; margin-bottom: 6px;">
                                    Velocidad (segundos):
                                </label>
                                <input type="range" class="sfq-config-input" data-setting="gradient_speed" 
                                       min="5" max="30" step="1" 
                                       value="${settings.gradient_speed || '15'}" 
                                       style="width: 100%;">
                                <span class="sfq-gradient-speed-display" style="font-size: 10px; color: #007cba; font-weight: 500;">
                                    ${settings.gradient_speed || '15'}s
                                </span>
                            </div>
                            
                            <div class="sfq-gradient-control-item">
                                <label style="display: block; font-size: 11px; color: #666; margin-bottom: 6px;">
                                    Ángulo (grados):
                                </label>
                                <input type="range" class="sfq-config-input" data-setting="gradient_angle" 
                                       min="-180" max="180" step="1" 
                                       value="${settings.gradient_angle || '-45'}" 
                                       style="width: 100%;">
                                <span class="sfq-gradient-angle-display" style="font-size: 10px; color: #007cba; font-weight: 500;">
                                    ${settings.gradient_angle || '-45'}°
                                </span>
                            </div>
                        </div>
                        
                        <div class="sfq-gradient-controls-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                            <div class="sfq-gradient-control-item">
                                <label style="display: block; font-size: 11px; color: #666; margin-bottom: 6px;">
                                    Tamaño del gradiente (%):
                                </label>
                                <input type="range" class="sfq-config-input" data-setting="gradient_size" 
                                       min="200" max="800" step="50" 
                                       value="${settings.gradient_size || '400'}" 
                                       style="width: 100%;">
                                <span class="sfq-gradient-size-display" style="font-size: 10px; color: #007cba; font-weight: 500;">
                                    ${settings.gradient_size || '400'}%
                                </span>
                                <small style="display: block; margin-top: 4px; color: #666; font-size: 10px;">
                                    400% es el valor recomendado para animación suave
                                </small>
                            </div>
                            
                            <div class="sfq-gradient-control-item">
                                <label style="display: block; font-size: 11px; color: #666; margin-bottom: 6px;">
                                    Opacidad del gradiente:
                                </label>
                                <input type="range" class="sfq-config-input" data-setting="gradient_opacity" 
                                       min="0" max="1" step="0.1" 
                                       value="${settings.gradient_opacity || '1'}" 
                                       style="width: 100%;">
                                <span class="sfq-gradient-opacity-display" style="font-size: 10px; color: #007cba; font-weight: 500;">
                                    ${Math.round((settings.gradient_opacity || '1') * 100)}%
                                </span>
                                <small style="display: block; margin-top: 4px; color: #666; font-size: 10px;">
                                    Controla la transparencia del gradiente animado
                                </small>
                            </div>
                        </div>
                        
                        <!-- Efecto de desenfoque de fondo (Glassmorphism) -->
                        <div class="sfq-gradient-controls-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                            <div class="sfq-gradient-control-item">
                                <label style="display: block; font-size: 11px; color: #666; margin-bottom: 6px;">
                                    Desenfoque de fondo (px):
                                </label>
                                <input type="range" class="sfq-config-input" data-setting="gradient_blur" 
                                       min="0" max="30" step="1" 
                                       value="${settings.gradient_blur || '0'}" 
                                       style="width: 100%;">
                                <span class="sfq-gradient-blur-display" style="font-size: 10px; color: #007cba; font-weight: 500;">
                                    ${settings.gradient_blur || '0'}px
                                </span>
                                <small style="display: block; margin-top: 4px; color: #666; font-size: 10px;">
                                    Efecto glassmorphism - desenfoque del contenido detrás
                                </small>
                            </div>
                            
                            <div class="sfq-gradient-control-item">
                                <label style="display: block; font-size: 11px; color: #666; margin-bottom: 6px;">
                                    Saturación del fondo (%):
                                </label>
                                <input type="range" class="sfq-config-input" data-setting="gradient_saturate" 
                                       min="50" max="200" step="10" 
                                       value="${settings.gradient_saturate || '100'}" 
                                       style="width: 100%;">
                                <span class="sfq-gradient-saturate-display" style="font-size: 10px; color: #007cba; font-weight: 500;">
                                    ${settings.gradient_saturate || '100'}%
                                </span>
                                <small style="display: block; margin-top: 4px; color: #666; font-size: 10px;">
                                    Intensidad de color del fondo desenfocado
                                </small>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Vista previa del gradiente -->
                    <div class="sfq-gradient-preview-section">
                        <h6 style="margin: 0 0 10px 0; font-size: 12px; font-weight: 600; color: #495057; text-transform: uppercase; letter-spacing: 0.5px;">
                            👁️ Vista Previa
                        </h6>
                        <div class="sfq-gradient-preview-button" style="
                            position: relative;
                            min-height: 50px;
                            border-radius: 8px;
                            overflow: hidden;
                            background: linear-gradient(${settings.gradient_angle || '-45'}deg, ${settings.gradient_color_1 || '#ee7752'}, ${settings.gradient_color_2 || '#e73c7e'}, ${settings.gradient_color_3 || '#23a6d5'}, ${settings.gradient_color_4 || '#23d5ab'});
                            background-size: ${settings.gradient_size || '400'}% ${settings.gradient_size || '400'}%;
                            animation: sfq-gradient-animation ${settings.gradient_speed || '15'}s ease infinite;
                            opacity: ${settings.gradient_opacity || '1'};
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                            border: 1px solid rgba(255,255,255,0.2);
                        ">
                            <span style="
                                color: white;
                                font-weight: 500;
                                text-shadow: 0 1px 2px rgba(0,0,0,0.3);
                                font-size: 14px;
                            ">
                                Vista previa del botón
                            </span>
                        </div>
                    </div>
                    
                    <!-- Opciones adicionales -->
                    <div class="sfq-gradient-additional-options" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e9ecef;">
                        <div class="sfq-config-row">
                            <label class="sfq-config-label">
                                <input type="checkbox" class="sfq-config-input" data-setting="gradient_hover_pause" ${settings.gradient_hover_pause ? 'checked' : ''}>
                                Pausar animación al pasar el ratón
                            </label>
                        </div>
                        <div class="sfq-config-row">
                            <label class="sfq-config-label">
                                <input type="checkbox" class="sfq-config-input" data-setting="gradient_reverse_animation" ${settings.gradient_reverse_animation ? 'checked' : ''}>
                                Invertir dirección de la animación
                            </label>
                        </div>
                    </div>
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
                
                <!-- ✅ NUEVO: Configuración de texto opcional -->
                <h6 style="margin-top: 20px; margin-bottom: 10px;">📝 Texto Opcional</h6>
                
                <label class="sfq-config-label">
                    Texto adicional (opcional):
                    <input type="text" class="sfq-config-input" data-setting="optional_text" 
                           value="${this.formBuilder.uiRenderer.escapeHtml(settings.optional_text || '')}" 
                           placeholder="Ej: puntos, €, %, etc.">
                    <small>Texto que aparecerá junto a la variable (ej: "100 puntos", "25€", "80%")</small>
                </label>
                
                <div class="sfq-config-row">
                    <label class="sfq-config-label">
                        Posición del texto:
                        <select class="sfq-config-input" data-setting="text_position">
                            <option value="right" ${settings.text_position === 'right' || !settings.text_position ? 'selected' : ''}>Derecha</option>
                            <option value="left" ${settings.text_position === 'left' ? 'selected' : ''}>Izquierda</option>
                            <option value="top" ${settings.text_position === 'top' ? 'selected' : ''}>Arriba</option>
                            <option value="bottom" ${settings.text_position === 'bottom' ? 'selected' : ''}>Abajo</option>
                        </select>
                    </label>
                    <label class="sfq-config-label">
                        Espaciado:
                        <select class="sfq-config-input" data-setting="text_spacing">
                            <option value="normal" ${settings.text_spacing === 'normal' || !settings.text_spacing ? 'selected' : ''}>Normal (8px)</option>
                            <option value="small" ${settings.text_spacing === 'small' ? 'selected' : ''}>Pequeño (4px)</option>
                            <option value="large" ${settings.text_spacing === 'large' ? 'selected' : ''}>Grande (12px)</option>
                            <option value="none" ${settings.text_spacing === 'none' ? 'selected' : ''}>Sin espacio</option>
                        </select>
                    </label>
                </div>
                
                <!-- ✅ NUEVO: Configuración independiente del texto opcional -->
                <h6 style="margin-top: 15px; margin-bottom: 10px;">🎨 Estilo del Texto Opcional</h6>
                
                <div class="sfq-config-row">
                    <label class="sfq-config-label">
                        Tamaño del texto:
                        <select class="sfq-config-input" data-setting="optional_text_size">
                            <option value="inherit" ${settings.optional_text_size === 'inherit' || !settings.optional_text_size ? 'selected' : ''}>Igual que la variable</option>
                            <option value="10" ${settings.optional_text_size === '10' ? 'selected' : ''}>10px</option>
                            <option value="12" ${settings.optional_text_size === '12' ? 'selected' : ''}>12px</option>
                            <option value="14" ${settings.optional_text_size === '14' ? 'selected' : ''}>14px</option>
                            <option value="16" ${settings.optional_text_size === '16' ? 'selected' : ''}>16px</option>
                            <option value="18" ${settings.optional_text_size === '18' ? 'selected' : ''}>18px</option>
                            <option value="20" ${settings.optional_text_size === '20' ? 'selected' : ''}>20px</option>
                            <option value="24" ${settings.optional_text_size === '24' ? 'selected' : ''}>24px</option>
                            <option value="28" ${settings.optional_text_size === '28' ? 'selected' : ''}>28px</option>
                        </select>
                    </label>
                    <label class="sfq-config-label">
                        Color del texto:
                        <input type="color" class="sfq-config-input" data-setting="optional_text_color" 
                               value="${settings.optional_text_color || 'inherit'}">
                        <small>Deja en "inherit" para usar el mismo color que la variable</small>
                    </label>
                </div>
                
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
                            <option value="Open Sans" ${settings.font_family === 'Open Sans' ? 'selected' : ''}>Open Sans</option>
                            <option value="inherit" ${settings.font_family === 'inherit' || !settings.font_family ? 'selected' : ''}>Por defecto</option>
                            <option value="'Asap'" ${settings.font_family === 'Asap' ? 'selected' : ''}>Asap</option>
                            <option value=" Arial, sans-serif" ${settings.font_family === 'Arial, sans-serif' ? 'selected' : ''}>Arial</option>
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
            
            // ✅ NUEVO: Inicializar estilos CSS para gradientes si es un botón
            if (element.type === 'button') {
                this.initGradientStyles();
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
            
            // ✅ NUEVO: Eventos específicos para gradiente animado
            $panel.find('[data-setting="gradient_enabled"]').on('change', function() {
                const isEnabled = $(this).is(':checked');
                const $gradientPanel = $panel.find('.sfq-gradient-advanced-panel');
                
                if (isEnabled) {
                    $gradientPanel.slideDown(300);
                } else {
                    $gradientPanel.slideUp(300);
                }
                
                // Actualizar vista previa
                self.updateGradientPreview($panel);
            });
            
            // Eventos para controles de gradiente
            $panel.find('[data-setting^="gradient_"]').on('input change', function() {
                const setting = $(this).data('setting');
                const value = $(this).val();
                
                // Actualizar displays específicos
                if (setting === 'gradient_speed') {
                    $panel.find('.sfq-gradient-speed-display').text(value + 's');
                } else if (setting === 'gradient_angle') {
                    $panel.find('.sfq-gradient-angle-display').text(value + '°');
                } else if (setting === 'gradient_size') {
                    $panel.find('.sfq-gradient-size-display').text(value + '%');
                } else if (setting === 'gradient_opacity') {
                    $panel.find('.sfq-gradient-opacity-display').text(Math.round(value * 100) + '%');
                } else if (setting === 'gradient_blur') {
                    $panel.find('.sfq-gradient-blur-display').text(value + 'px');
                } else if (setting === 'gradient_saturate') {
                    $panel.find('.sfq-gradient-saturate-display').text(value + '%');
                }
                
                // Actualizar vista previa en tiempo real
                self.updateGradientPreview($panel);
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
            
            // ✅ NUEVO: Eventos específicos para sección de video de pregunta
            if (['single_choice', 'multiple_choice', 'rating', 'text', 'email'].includes(question.type)) {
                this.bindQuestionVideoEvents($question, question);
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
            
            const newId = 'q_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9); // Ensure unique ID
            
            // Determine options based on question type
            let duplicatedOptions = [];
            if (original.type !== 'freestyle' && original.options && Array.isArray(original.options)) {
                duplicatedOptions = original.options.map(opt => ({ ...opt }));
            }

            // Determine freestyle_elements based on question type
            let duplicatedFreestyleElements = [];
            if (original.type === 'freestyle' && original.freestyle_elements && Array.isArray(original.freestyle_elements)) {
                duplicatedFreestyleElements = original.freestyle_elements.map(el => ({ 
                    ...el, 
                    id: 'element_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9) // Generate new IDs for elements
                })); 
            }

            const duplicate = {
                ...original,
                id: newId,
                text: original.text + ' (Copia)',
                options: duplicatedOptions,
                conditions: [], // Conditions should be duplicated separately if needed, but for now, start fresh
                freestyle_elements: duplicatedFreestyleElements, // Include duplicated freestyle elements
                global_settings: original.global_settings ? { ...original.global_settings } : {}, // Duplicate global settings
                settings: original.settings ? { ...original.settings } : {} // Duplicate question settings
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
            
            // Actualizar el array de preguntas manteniendo las pantallas finales separadas
            const finalScreenQuestions = this.questions.filter(q => q.pantallaFinal);
            const normalQuestions = newOrder.filter(q => !q.pantallaFinal);
            
            // Combinar manteniendo el orden correcto
            this.questions = [...normalQuestions, ...finalScreenQuestions];
            
            this.formBuilder.isDirty = true;
            
            console.log('SFQ: Updated questions order:', this.questions.map(q => ({ 
                id: q.id, 
                text: q.text.substring(0, 30) + '...', 
                order: q.order,
                pantallaFinal: q.pantallaFinal 
            })));
        }

        updateFinalScreensOrder() {
            const $finalScreensContainer = $('#sfq-final-screens-container');
            const finalScreenQuestions = [];
            
            $finalScreensContainer.find('.sfq-question-item').each((index, el) => {
                const questionId = $(el).attr('id');
                const question = this.questions.find(q => q.id === questionId);
                if (question) {
                    question.order = 1000 + index; // Usar números altos para pantallas finales
                    finalScreenQuestions.push(question);
                }
            });
            
            // Actualizar el array principal
            const normalQuestions = this.questions.filter(q => !q.pantallaFinal);
            this.questions = [...normalQuestions, ...finalScreenQuestions];
            
            this.formBuilder.isDirty = true;
            
            console.log('SFQ: Updated final screens order:', finalScreenQuestions.map(q => ({ 
                id: q.id, 
                text: q.text.substring(0, 30) + '...', 
                order: q.order 
            })));
        }

        showDragIndicator() {
            // Añadir clase al body para mostrar que estamos en modo drag
            $('body').addClass('sfq-dragging-active');
            
            // Mostrar indicadores visuales en las áreas de drop
            $('.sfq-questions-list, #sfq-final-screens-container').addClass('sfq-drop-zone-active');
        }

        hideDragIndicator() {
            // Remover clases visuales
            $('body').removeClass('sfq-dragging-active');
            $('.sfq-questions-list, #sfq-final-screens-container').removeClass('sfq-drop-zone-active');
        }

        showReorderFeedback(item) {
            // Mostrar feedback visual temporal
            item.addClass('sfq-reordered');
            
            setTimeout(() => {
                item.removeClass('sfq-reordered');
            }, 1000);
            
            // Mostrar notificación
            this.formBuilder.uiRenderer.showNotice('Pregunta reordenada correctamente', 'success');
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

        /**
         * ✅ NUEVO: Inicializar configuración del botón siguiente para preguntas freestyle
         */
        initializeFreestyleButtonSettings($question, question) {
            if (!question.settings || typeof question.settings !== 'object' || Array.isArray(question.settings)) {
                console.log('SFQ: FIXING INVALID SETTINGS for freestyle button - was:', typeof question.settings, Array.isArray(question.settings) ? '(array)' : '', question.settings);
                question.settings = {};
                console.log('SFQ: Initialized empty settings object for freestyle question', question.id);
            }
            
            // Inicializar checkbox de mostrar botón siguiente
            const showNextButton = question.settings.show_next_button !== false; // Por defecto true
            $question.find('.sfq-show-next-button-checkbox').prop('checked', showNextButton);
            
            // Inicializar texto del botón
            const buttonText = question.settings.next_button_text || '';
            $question.find('.sfq-next-button-text-input').val(buttonText);
            
            // Inicializar radio buttons de estilo
            const customStyle = question.settings.next_button_custom_style === true;
            const $styleRadios = $question.find('input[name^="button_style_"]');
            if (customStyle) {
                $styleRadios.filter('[value="custom"]').prop('checked', true);
                $question.find('.sfq-custom-button-panel').show();
            } else {
                $styleRadios.filter('[value="global"]').prop('checked', true);
                $question.find('.sfq-custom-button-panel').hide();
            }
            
            // Inicializar configuraciones de estilo personalizado si existen
            if (customStyle && question.settings.next_button_style) {
                const buttonStyle = question.settings.next_button_style;
                
                // Inicializar todos los controles de configuración
                $question.find('.sfq-config-input').each((index, input) => {
                    const $input = $(input);
                    const setting = $input.data('setting');
                    
                    if (setting && buttonStyle[setting] !== undefined) {
                        if ($input.attr('type') === 'checkbox') {
                            $input.prop('checked', buttonStyle[setting] === true);
                            
                            // ✅ CRÍTICO: Manejar checkbox de degradado específicamente
                            if (setting === 'gradient_enabled') {
                                const $gradientSetting = $question.find('.sfq-gradient-color-setting');
                                const $gradientAnimationSetting = $question.find('.sfq-gradient-animation-setting');
                                if (buttonStyle[setting]) {
                                    $gradientSetting.show();
                                    $gradientAnimationSetting.show();
                                } else {
                                    $gradientSetting.hide();
                                    $gradientAnimationSetting.hide();
                                }
                                console.log('SFQ: Initialized gradient checkbox to:', buttonStyle[setting]);
                            }
                        } else {
                            $input.val(buttonStyle[setting]);
                        }
                    }
                });
                
                // Actualizar displays de valores
                this.updateButtonConfigDisplaysForQuestion($question, buttonStyle);
            }
            
            // Mostrar/ocultar secciones según el estado del checkbox principal
            const $textSetting = $question.find('.sfq-next-button-text-setting');
            const $styleSetting = $question.find('.sfq-next-button-style-setting');
            
            if (showNextButton) {
                $textSetting.show();
                $styleSetting.show();
            } else {
                $textSetting.hide();
                $styleSetting.hide();
            }
            
            console.log('SFQ: Initialized freestyle button settings for question:', question.id);
            console.log('SFQ: Show next button:', showNextButton);
            console.log('SFQ: Custom style:', customStyle);
            console.log('SFQ: Button style settings:', question.settings.next_button_style);
        }
        
        /**
         * ✅ NUEVO: Actualizar displays de valores para configuración del botón
         */
        updateButtonConfigDisplaysForQuestion($question, buttonStyle) {
            // Actualizar displays de opacidad
            if (buttonStyle.background_opacity !== undefined) {
                $question.find('.sfq-bg-opacity-display').text(buttonStyle.background_opacity);
            }
            if (buttonStyle.border_opacity !== undefined) {
                $question.find('.sfq-border-opacity-display').text(buttonStyle.border_opacity);
            }
            
            // Actualizar displays de tamaño
            if (buttonStyle.border_radius !== undefined) {
                $question.find('.sfq-border-radius-display').text(buttonStyle.border_radius + 'px');
            }
            if (buttonStyle.font_size !== undefined) {
                $question.find('.sfq-font-size-display').text(buttonStyle.font_size + 'px');
            }
        }

        /**
         * ✅ NUEVO: Obtener pregunta por ID
         */
        getQuestion(questionId) {
            return this.questions.find(q => q.id === questionId);
        }

        /**
         * ✅ NUEVO: Inicializar estilos CSS para gradientes animados
         */
        initGradientStyles() {
            // Verificar si ya existen los estilos
            if (document.getElementById('sfq-gradient-button-styles')) {
                return;
            }

            // Crear elemento style
            const styleElement = document.createElement('style');
            styleElement.id = 'sfq-gradient-button-styles';
            styleElement.textContent = `
                /* Animación para gradientes de botones */
                @keyframes sfq-gradient-animation {
                    0% {
                        background-position: 0% 50%;
                    }
                    50% {
                        background-position: 100% 50%;
                    }
                    100% {
                        background-position: 0% 50%;
                    }
                }

                /* Estilos para el panel de gradiente */
                .sfq-gradient-advanced-panel {
                    transition: all 0.3s ease;
                }

                .sfq-gradient-colors-grid {
                    animation: fadeInUp 0.3s ease;
                }

                .sfq-gradient-color-picker {
                    border: 2px solid #e9ecef;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .sfq-gradient-color-picker:hover {
                    border-color: #007cba;
                    transform: scale(1.05);
                }

                .sfq-gradient-preview-button {
                    transition: all 0.3s ease;
                    cursor: pointer;
                }

                .sfq-gradient-preview-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 15px rgba(0,0,0,0.2) !important;
                }

                /* Animación de aparición */
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                /* Estilos para controles de rango */
                .sfq-gradient-control-item input[type="range"] {
                    -webkit-appearance: none;
                    appearance: none;
                    height: 6px;
                    background: #ddd;
                    border-radius: 3px;
                    outline: none;
                    transition: background 0.2s ease;
                }

                .sfq-gradient-control-item input[type="range"]:hover {
                    background: #bbb;
                }

                .sfq-gradient-control-item input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 18px;
                    height: 18px;
                    background: #007cba;
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    transition: all 0.2s ease;
                }

                .sfq-gradient-control-item input[type="range"]::-webkit-slider-thumb:hover {
                    background: #005a87;
                    transform: scale(1.1);
                }

                .sfq-gradient-control-item input[type="range"]::-moz-range-thumb {
                    width: 18px;
                    height: 18px;
                    background: #007cba;
                    border-radius: 50%;
                    cursor: pointer;
                    border: none;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    transition: all 0.2s ease;
                }

                .sfq-gradient-control-item input[type="range"]::-moz-range-thumb:hover {
                    background: #005a87;
                    transform: scale(1.1);
                }

                /* Responsive para móviles */
                @media (max-width: 768px) {
                    .sfq-gradient-colors-grid {
                        grid-template-columns: repeat(2, 1fr) !important;
                    }
                    
                    .sfq-gradient-controls-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
            `;

            // Añadir al head del documento
            document.head.appendChild(styleElement);
        }

        /**
         * ✅ NUEVO: Actualizar vista previa del gradiente en tiempo real
         */
        updateGradientPreview($panel) {
            const $previewElement = $panel.find('.sfq-gradient-preview-button');
            if ($previewElement.length === 0) return;

            // Obtener configuraciones actuales del panel
            const settings = {};
            $panel.find('[data-setting^="gradient_"]').each(function() {
                const setting = $(this).data('setting');
                let value = $(this).val();
                
                if ($(this).attr('type') === 'checkbox') {
                    value = $(this).is(':checked');
                }
                
                settings[setting] = value;
            });

            // Aplicar estilos solo si el gradiente está habilitado
            if (settings.gradient_enabled) {
                const color1 = settings.gradient_color_1 || '#ee7752';
                const color2 = settings.gradient_color_2 || '#e73c7e';
                const color3 = settings.gradient_color_3 || '#23a6d5';
                const color4 = settings.gradient_color_4 || '#23d5ab';
                const angle = settings.gradient_angle || '-45';
                const size = settings.gradient_size || '400';
                const speed = settings.gradient_speed || '15';
                const opacity = settings.gradient_opacity || '1';

                const gradient = `linear-gradient(${angle}deg, ${color1}, ${color2}, ${color3}, ${color4})`;
                
                $previewElement.css({
                    'background': gradient,
                    'background-size': `${size}% ${size}%`,
                    'animation': `sfq-gradient-animation ${speed}s ease infinite`,
                    'opacity': opacity
                });

                // Aplicar opciones adicionales
                if (settings.gradient_hover_pause) {
                    $previewElement.off('mouseenter mouseleave').on('mouseenter', function() {
                        $(this).css('animation-play-state', 'paused');
                    }).on('mouseleave', function() {
                        $(this).css('animation-play-state', 'running');
                    });
                }

                if (settings.gradient_reverse_animation) {
                    $previewElement.css('animation-direction', 'reverse');
                } else {
                    $previewElement.css('animation-direction', 'normal');
                }
            } else {
                // Resetear estilos si el gradiente está deshabilitado
                $previewElement.css({
                    'background': '#007cba',
                    'background-size': 'auto',
                    'animation': 'none',
                    'opacity': '1',
                    'animation-direction': 'normal'
                });
                $previewElement.off('mouseenter mouseleave');
            }
        }

        /**
         * ✅ NUEVO: Bind events específicos para sección de video de pregunta
         */
        bindQuestionVideoEvents($question, question) {
            const self = this;
            
            // Evento para cambio de URL de video
            $question.find('.sfq-question-video-url-input').off('input').on('input', function() {
                const url = $(this).val().trim();
                
                if (url && self.isValidVideoUrl(url)) {
                    self.updateQuestionVideoConfig(question, {
                        url: url
                    });
                    self.showQuestionVideoConfig($question);
                    $(this).removeClass('invalid').addClass('valid');
                } else if (url) {
                    $(this).removeClass('valid').addClass('invalid');
                    self.hideQuestionVideoConfig($question);
                } else {
                    $(this).removeClass('valid invalid');
                    self.hideQuestionVideoConfig($question);
                    self.clearQuestionVideoConfig(question);
                }
                
                self.formBuilder.isDirty = true;
            });
            
            // Eventos para configuración
            $question.find('.sfq-question-video-position').off('change').on('change', function() {
                self.updateQuestionVideoSetting(question, 'position', $(this).val());
            });
            
            $question.find('.sfq-question-video-width').off('input').on('input', function() {
                const value = $(this).val();
                $question.find('.video-width-display').text(value + 'px');
                self.updateQuestionVideoSetting(question, 'width', parseInt(value));
            });
            
            $question.find('.sfq-question-video-shadow').off('change').on('change', function() {
                self.updateQuestionVideoSetting(question, 'shadow', $(this).is(':checked'));
            });
            
            $question.find('.sfq-question-video-mobile-force').off('change').on('change', function() {
                const isChecked = $(this).is(':checked');
                self.updateQuestionVideoSetting(question, 'mobile_force_position', isChecked);
                
                // Mostrar/ocultar configuración de ancho móvil
                const $mobileConfig = $question.find('.sfq-video-mobile-width-config');
                if (isChecked) {
                    $mobileConfig.show();
                } else {
                    $mobileConfig.hide();
                }
            });
            
            $question.find('.sfq-question-video-mobile-width').off('input').on('input', function() {
                const value = $(this).val();
                $question.find('.video-mobile-width-display').text(value + 'px');
                self.updateQuestionVideoSetting(question, 'mobile_width', parseInt(value));
            });
            
            // Evento para eliminar video
            $question.find('.sfq-remove-question-video').off('click').on('click', function(e) {
                e.preventDefault();
                self.removeQuestionVideo($question, question);
            });
        }
        
        /**
         * ✅ NUEVO: Validar URL de video YouTube/Vimeo
         */
        isValidVideoUrl(url) {
            try {
                new URL(url);
                // Verificar que sea YouTube o Vimeo
                return /(?:youtube\.com|youtu\.be|vimeo\.com)/.test(url);
            } catch {
                return false;
            }
        }
        
        /**
         * ✅ NUEVO: Actualizar configuración de video de pregunta
         */
        updateQuestionVideoConfig(question, videoData) {
            if (!question.settings) {
                question.settings = {};
            }
            
            if (!question.settings.question_video) {
                question.settings.question_video = {};
            }
            
            Object.assign(question.settings.question_video, videoData);
            this.formBuilder.isDirty = true;
        }
        
        /**
         * ✅ NUEVO: Actualizar configuración específica de video
         */
        updateQuestionVideoSetting(question, setting, value) {
            if (!question.settings) {
                question.settings = {};
            }
            
            if (!question.settings.question_video) {
                question.settings.question_video = {};
            }
            
            question.settings.question_video[setting] = value;
            this.formBuilder.isDirty = true;
        }
        
        /**
         * ✅ NUEVO: Mostrar configuración de video
         */
        showQuestionVideoConfig($question) {
            $question.find('.sfq-question-video-config').show();
            $question.find('.sfq-question-video-preview').show();
        }
        
        /**
         * ✅ NUEVO: Ocultar configuración de video
         */
        hideQuestionVideoConfig($question) {
            $question.find('.sfq-question-video-config').hide();
            $question.find('.sfq-question-video-preview').hide();
        }
        
        /**
         * ✅ NUEVO: Limpiar configuración de video
         */
        clearQuestionVideoConfig(question) {
            if (question.settings && question.settings.question_video) {
                question.settings.question_video = {};
            }
        }
        
        /**
         * ✅ NUEVO: Eliminar video de pregunta
         */
        removeQuestionVideo($question, question) {
            // Limpiar input de URL
            $question.find('.sfq-question-video-url-input').val('').removeClass('valid invalid');
            
            // Limpiar configuración
            this.clearQuestionVideoConfig(question);
            
            // Ocultar configuración y preview
            this.hideQuestionVideoConfig($question);
            
            this.formBuilder.isDirty = true;
        }

        /**
         * ✅ NUEVO: Repoblar video de pregunta para tipos objetivo
         */
        repopulateQuestionVideo(questionId, question) {
            console.log('SFQ: === STARTING QUESTION VIDEO REPOPULATION ===');
            console.log('SFQ: Question ID:', questionId);
            console.log('SFQ: Question type:', question.type);
            console.log('SFQ: Question settings:', question.settings);
            
            // Verificar que sea un tipo de pregunta objetivo
            const targetTypes = ['single_choice', 'multiple_choice', 'rating', 'text', 'email'];
            if (!targetTypes.includes(question.type)) {
                console.log('SFQ: Question type not supported for question video:', question.type);
                return;
            }
            
            // Verificar que tenga configuración de video
            const videoConfig = question.settings?.question_video;
            if (!videoConfig || !videoConfig.url) {
                console.log('SFQ: No question video configuration found');
                return;
            }
            
            console.log('SFQ: Found question video config:', videoConfig);
            
            // ✅ CORREGIDO: Usar setTimeout para asegurar que el DOM esté completamente renderizado
            setTimeout(() => {
                this._performQuestionVideoRepopulation(questionId, question, videoConfig);
            }, 150);
        }
        
        /**
         * ✅ NUEVO: Función interna para realizar la repoblación de video de pregunta
         */
        _performQuestionVideoRepopulation(questionId, question, videoConfig) {
            console.log('SFQ: Performing delayed question video repopulation for question:', questionId);
            
            // Buscar el elemento de la pregunta
            let $question = $(`#${questionId}`);
            
            if ($question.length === 0) {
                $question = $(`.sfq-question-item[data-question-id="${questionId}"]`);
            }
            
            if ($question.length === 0) {
                $question = $(`#sfq-questions-container #${questionId}, #sfq-final-screens-container #${questionId}`);
            }
            
            if ($question.length === 0) {
                console.error('SFQ: Question element not found for video repopulation:', questionId);
                return;
            }
            
            console.log('SFQ: Found question element for video repopulation');
            
            // Buscar la sección de video de pregunta
            let $videoSection = $question.find('.sfq-question-video-section');
            
            if ($videoSection.length === 0) {
                console.warn('SFQ: Question video section not found, creating it...');
                this._createQuestionVideoSection($question, question);
                $videoSection = $question.find('.sfq-question-video-section');
            }
            
            if ($videoSection.length === 0) {
                console.error('SFQ: Could not create question video section');
                return;
            }
            
            // Actualizar el input de URL
            const $urlInput = $videoSection.find('.sfq-question-video-url-input');
            if ($urlInput.length > 0) {
                $urlInput.val(videoConfig.url).removeClass('invalid').addClass('valid');
                console.log('SFQ: Updated question video URL input');
            }
            
            // Actualizar configuraciones
            if (videoConfig.position) {
                $videoSection.find('.sfq-question-video-position').val(videoConfig.position);
            }
            
            if (videoConfig.width) {
                const $widthSlider = $videoSection.find('.sfq-question-video-width');
                $widthSlider.val(videoConfig.width);
                $videoSection.find('.video-width-display').text(videoConfig.width + 'px');
            }
            
            if (videoConfig.shadow !== undefined) {
                $videoSection.find('.sfq-question-video-shadow').prop('checked', videoConfig.shadow);
            }
            
            if (videoConfig.mobile_force_position !== undefined) {
                $videoSection.find('.sfq-question-video-mobile-force').prop('checked', videoConfig.mobile_force_position);
                
                // Mostrar/ocultar configuración de ancho móvil
                const $mobileConfig = $videoSection.find('.sfq-video-mobile-width-config');
                if (videoConfig.mobile_force_position) {
                    $mobileConfig.show();
                    
                    if (videoConfig.mobile_width) {
                        const $mobileWidthSlider = $videoSection.find('.sfq-question-video-mobile-width');
                        $mobileWidthSlider.val(videoConfig.mobile_width);
                        $videoSection.find('.video-mobile-width-display').text(videoConfig.mobile_width + 'px');
                    }
                } else {
                    $mobileConfig.hide();
                }
            }
            
            // Mostrar la configuración
            $videoSection.find('.sfq-question-video-config').show();
            
            // Mostrar el preview del video
            this._updateQuestionVideoPreview($videoSection, {
                url: videoConfig.url
            });
            
            console.log('SFQ: Successfully repopulated question video');
            console.log('SFQ: === FINISHED QUESTION VIDEO REPOPULATION ===');
        }
        
        /**
         * ✅ NUEVO: Crear sección de video de pregunta si no existe
         */
        _createQuestionVideoSection($question, question) {
            console.log('SFQ: Creating question video section');
            
            const videoSection = this.formBuilder.uiRenderer.renderQuestionVideoSection(question);
            
            // Insertar después de la sección de imagen o antes de los settings
            const $insertPoint = $question.find('.sfq-question-image-section').next();
            
            if ($insertPoint.length > 0) {
                $insertPoint.before(videoSection);
            } else {
                // Fallback: insertar después de la imagen o antes de los controles
                const $fallbackPoint = $question.find('.sfq-next-button-controls-universal, .sfq-question-settings').first();
                if ($fallbackPoint.length > 0) {
                    $fallbackPoint.before(videoSection);
                } else {
                    $question.find('.sfq-question-content').append(videoSection);
                }
            }
            
            console.log('SFQ: Created question video section');
        }
        
        /**
         * ✅ NUEVO: Actualizar preview de video de pregunta
         */
        _updateQuestionVideoPreview($videoSection, videoData) {
            console.log('SFQ: Updating question video preview with data:', videoData);
            
            const $previewContainer = $videoSection.find('.sfq-question-video-preview');
            
            if ($previewContainer.length === 0) {
                console.error('SFQ: Question video preview container not found');
                return;
            }
            
            const $embedPreview = $previewContainer.find('.sfq-video-embed-preview');
            
            if ($embedPreview.length > 0) {
                // Generar nuevo preview del video
                const videoPreviewHtml = this.formBuilder.uiRenderer.generateVideoPreview(videoData.url);
                $embedPreview.html(videoPreviewHtml);
                
                // Actualizar el tipo de video en el texto
                const videoType = this.formBuilder.uiRenderer.getVideoTypeFromUrl(videoData.url);
                $previewContainer.find('div:last-child').html(`🎥 ${videoType} - Vista previa`);
                
                $previewContainer.show();
                console.log('SFQ: Successfully updated question video preview');
            }
        }

        /**
         * ✅ NUEVO: Repoblar imagen de pregunta para tipos objetivo
         */
        repopulateQuestionImage(questionId, question) {
            console.log('SFQ: === STARTING QUESTION IMAGE REPOPULATION ===');
            console.log('SFQ: Question ID:', questionId);
            console.log('SFQ: Question type:', question.type);
            console.log('SFQ: Question settings:', question.settings);
            
            // Verificar que sea un tipo de pregunta objetivo
            const targetTypes = ['single_choice', 'multiple_choice', 'rating', 'text'];
            if (!targetTypes.includes(question.type)) {
                console.log('SFQ: Question type not supported for question image:', question.type);
                return;
            }
            
            // Verificar que tenga configuración de imagen
            const imageConfig = question.settings?.question_image;
            if (!imageConfig || !imageConfig.url) {
                console.log('SFQ: No question image configuration found');
                return;
            }
            
            console.log('SFQ: Found question image config:', imageConfig);
            
            // ✅ CORREGIDO: Usar setTimeout para asegurar que el DOM esté completamente renderizado
            setTimeout(() => {
                this._performQuestionImageRepopulation(questionId, question, imageConfig);
            }, 150);
        }
        
        /**
         * ✅ NUEVO: Función interna para realizar la repoblación de imagen de pregunta
         */
        _performQuestionImageRepopulation(questionId, question, imageConfig) {
            console.log('SFQ: Performing delayed question image repopulation for question:', questionId);
            
            // Buscar el elemento de la pregunta
            let $question = $(`#${questionId}`);
            
            if ($question.length === 0) {
                $question = $(`.sfq-question-item[data-question-id="${questionId}"]`);
            }
            
            if ($question.length === 0) {
                $question = $(`#sfq-questions-container #${questionId}, #sfq-final-screens-container #${questionId}`);
            }
            
            if ($question.length === 0) {
                console.error('SFQ: Question element not found for image repopulation:', questionId);
                return;
            }
            
            console.log('SFQ: Found question element for image repopulation');
            
            // Buscar la sección de imagen de pregunta
            let $imageSection = $question.find('.sfq-question-image-section');
            
            if ($imageSection.length === 0) {
                console.warn('SFQ: Question image section not found, creating it...');
                this._createQuestionImageSection($question, question);
                $imageSection = $question.find('.sfq-question-image-section');
            }
            
            if ($imageSection.length === 0) {
                console.error('SFQ: Could not create question image section');
                return;
            }
            
            // Actualizar el input de URL
            const $urlInput = $imageSection.find('.sfq-question-image-url-input');
            if ($urlInput.length > 0) {
                $urlInput.val(imageConfig.url).removeClass('invalid').addClass('valid');
                console.log('SFQ: Updated question image URL input');
            }
            
            // Actualizar configuraciones
            if (imageConfig.position) {
                $imageSection.find('.sfq-question-image-position').val(imageConfig.position);
            }
            
            if (imageConfig.width) {
                const $widthSlider = $imageSection.find('.sfq-question-image-width');
                $widthSlider.val(imageConfig.width);
                $imageSection.find('.width-display').text(imageConfig.width + 'px');
            }
            
            if (imageConfig.shadow !== undefined) {
                $imageSection.find('.sfq-question-image-shadow').prop('checked', imageConfig.shadow);
            }
            
            if (imageConfig.mobile_force_position !== undefined) {
                $imageSection.find('.sfq-question-image-mobile-force').prop('checked', imageConfig.mobile_force_position);
            }
            
            // Mostrar la configuración
            $imageSection.find('.sfq-question-image-config').show();
            
            // Mostrar el preview de la imagen
            this._updateQuestionImagePreview($imageSection, {
                url: imageConfig.url,
                alt: imageConfig.alt || 'Imagen de pregunta'
            });
            
            console.log('SFQ: Successfully repopulated question image');
            console.log('SFQ: === FINISHED QUESTION IMAGE REPOPULATION ===');
        }
        
        /**
         * ✅ NUEVO: Crear sección de imagen de pregunta si no existe
         */
        _createQuestionImageSection($question, question) {
            console.log('SFQ: Creating question image section');
            
            const imageSection = this.formBuilder.uiRenderer.renderQuestionImageSection(question);
            
            // Insertar después de las opciones o antes de los settings
            const $insertPoint = $question.find('.sfq-next-button-controls-universal, .sfq-question-settings').first();
            
            if ($insertPoint.length > 0) {
                $insertPoint.before(imageSection);
            } else {
                // Fallback: insertar al final del contenido
                $question.find('.sfq-question-content').append(imageSection);
            }
            
            console.log('SFQ: Created question image section');
        }
        
        /**
         * ✅ NUEVO: Actualizar preview de imagen de pregunta
         */
        _updateQuestionImagePreview($imageSection, imageData) {
            console.log('SFQ: Updating question image preview with data:', imageData);
            
            const $previewContainer = $imageSection.find('.sfq-question-image-preview');
            
            if ($previewContainer.length === 0) {
                console.error('SFQ: Question image preview container not found');
                return;
            }
            
            let $previewImage = $previewContainer.find('.sfq-preview-image');
            
            if ($previewImage.length === 0) {
                console.log('SFQ: Creating question image preview element');
                $previewContainer.find('.sfq-image-preview').html(`
                    <img src="" alt="Vista previa" class="sfq-preview-image">
                    <button type="button" class="sfq-remove-question-image" title="Eliminar imagen">
                        <span class="dashicons dashicons-no-alt"></span>
                    </button>
                `);
                $previewImage = $previewContainer.find('.sfq-preview-image');
            }
            
            if ($previewImage.length > 0) {
                $previewImage.attr('src', imageData.url);
                $previewImage.attr('alt', imageData.alt || 'Vista previa');
                
                // Manejar errores de carga
                $previewImage.off('error').on('error', function() {
                    console.warn('SFQ: Failed to load question image:', imageData.url);
                    $(this).attr('src', 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2VuPC90ZXh0Pjwvc3ZnPg==');
                    $(this).attr('alt', 'Error al cargar imagen');
                });
                
                $previewContainer.show();
                console.log('SFQ: Successfully updated question image preview');
            }
        }

        destroy() {
            if (this.container && $.fn.sortable) {
                this.container.sortable('destroy');
            }
        }
    }

    // Export para uso en otros módulos
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = SFQ_QuestionManager;
    } else {
        window.SFQ_QuestionManager = SFQ_QuestionManager;
    }

})(jQuery);
