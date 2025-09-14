/**
 * EventManager - Gestión centralizada de eventos
 * Smart Forms & Quiz - Admin Builder v2
 */

(function($) {
    'use strict';

    class SFQ_EventManager {
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
        
        // Toggle all questions button
        $('#sfq-toggle-all-questions').on('click' + ns, (e) => {
            e.preventDefault();
            this.handleToggleAllQuestions(e);
        });

        // Form field changes
        $('#form-title, #form-description, #form-type').on('change' + ns, () => {
            if (!this.formBuilder.isDestroyed) {
                this.formBuilder.isDirty = true;
            }
        });
        
            // Settings checkboxes
            $('.sfq-tab-content input[type="checkbox"]').on('change' + ns, (e) => {
                if (!this.formBuilder.isDestroyed) {
                    this.formBuilder.isDirty = true;
                    // If auto-save checkbox changes, re-setup auto-save
                    if ($(e.target).attr('id') === 'enable-auto-save') {
                        this.formBuilder.setupAutoSave();
                    }
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
        
        // ✅ NUEVO: Eventos para timer de bloqueo de formulario
        this.bindBlockFormTimerEvents();
        
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
        
        // Delegación para eliminar elementos (condiciones, elementos freestyle, etc.)
        $(document).on('click' + ns + '-delegation', '.sfq-delete-element', (e) => {
            this.handleDeleteElement(e);
        });
        
        // Delegación para plegar/expandir contenido de pregunta
        $(document).on('click' + ns + '-delegation', '.sfq-toggle-question-content', (e) => {
            this.handleToggleQuestionContent(e);
        });
        
        // ✅ NUEVO: Delegación para eventos de imagen de pregunta
        $(document).on('click' + ns + '-delegation', '.sfq-upload-question-image-btn', (e) => {
            this.handleUploadQuestionImage(e);
        });
        
        $(document).on('input' + ns + '-delegation', '.sfq-question-image-url-input', (e) => {
            this.handleQuestionImageUrlInput(e);
        });
        
        $(document).on('click' + ns + '-delegation', '.sfq-remove-question-image', (e) => {
            this.handleRemoveQuestionImage(e);
        });
        
        $(document).on('change' + ns + '-delegation', '.sfq-question-image-position, .sfq-question-image-width, .sfq-question-image-shadow, .sfq-question-image-mobile-force', (e) => {
            this.handleQuestionImageSettingsChange(e);
        });
        
        $(document).on('input' + ns + '-delegation', '.sfq-question-image-width', (e) => {
            this.handleQuestionImageWidthChange(e);
        });
        
        // ✅ NUEVO: Delegación para ancho personalizado de móvil
        $(document).on('input' + ns + '-delegation', '.sfq-question-image-mobile-width', (e) => {
            this.handleQuestionImageMobileWidthChange(e);
        });

        // ✅ NUEVO: Delegación para cambios en el tipo de condición
        $(document).on('change' + ns + '-delegation', '.sfq-condition-type', (e) => {
            const $select = $(e.currentTarget);
            const $conditionItem = $select.closest('.sfq-condition-item');
            const conditionId = $conditionItem.attr('id');
            const $questionItem = $select.closest('.sfq-question-item');
            const questionId = $questionItem.attr('id');

            const question = this.formBuilder.questionManager.getQuestion(questionId);
            // CRÍTICO: Obtener la condición directamente del ConditionEngine para asegurar que sea la instancia correcta
            const condition = this.formBuilder.conditionEngine.conditions[questionId]?.find(c => c.id === conditionId);
            if (!condition) {
                console.error('SFQ EventManager: Condition object not found in ConditionEngine for ID:', conditionId);
                return;
            }
            console.log('SFQ EventManager: Retrieved condition object for type change:', condition);

            const newConditionType = $select.val();
            condition.type = newConditionType;
            // CRÍTICO: Limpiar el valor anterior si cambia el tipo de condición para evitar datos inconsistentes
            condition.value = ''; 
            condition.comparisonValue = ''; // También limpiar comparisonValue si aplica

            // Regenerar el campo de valor de condición según el nuevo tipo
            const newConditionValueField = this.formBuilder.uiRenderer.generateConditionValueField(condition);
            $conditionItem.find('.sfq-condition-value-container').html(newConditionValueField);

            // Rebind events para los nuevos campos
            this.formBuilder.conditionEngine.bindConditionValueEvents($conditionItem, condition);
            this.formBuilder.isDirty = true;
            console.log('SFQ EventManager: Condition type changed for', conditionId, 'to', newConditionType);
        });

        // ✅ NUEVO: Delegación para cambios en el tipo de acción
        $(document).on('change' + ns + '-delegation', '.sfq-action-type', (e) => {
            const $select = $(e.currentTarget);
            const $conditionItem = $select.closest('.sfq-condition-item');
            const conditionId = $conditionItem.attr('id');
            const $questionItem = $select.closest('.sfq-question-item');
            const questionId = $questionItem.attr('id');

            // CRÍTICO: Obtener la condición directamente del ConditionEngine para asegurar que sea la instancia correcta
            const condition = this.formBuilder.conditionEngine.conditions[questionId]?.find(c => c.id === conditionId);
            if (!condition) {
                console.error('SFQ EventManager: Condition object not found in ConditionEngine for ID:', conditionId);
                return;
            }
            console.log('SFQ EventManager: Retrieved condition object for action change:', condition);

            const newActionType = $select.val();
            condition.action = newActionType;
            condition.actionValue = ''; // Limpiar el valor anterior si cambia el tipo de acción
            condition.amount = 0; // También limpiar amount si cambia el tipo de acción

            // Regenerar el campo de valor de acción
            const newActionValueField = this.formBuilder.uiRenderer.generateActionValueField(condition);
            $conditionItem.find('.sfq-action-value-container').html(newActionValueField);

            // Mostrar/ocultar campo de cantidad según el tipo de acción
            const $amountRow = $conditionItem.find('.sfq-condition-amount-row');
            const $amountLabel = $conditionItem.find('.sfq-condition-amount-label');
            
            if (['add_variable', 'set_variable'].includes(newActionType)) {
                $amountRow.slideDown(200);
                $amountLabel.text(newActionType === 'add_variable' ? 'Cantidad a sumar:' : 'Valor a establecer:');
            } else {
                $amountRow.slideUp(200);
            }

            // Rebind events para el nuevo campo
            this.formBuilder.conditionEngine.bindActionValueEvents($conditionItem, condition);
            this.formBuilder.isDirty = true;
            console.log('SFQ EventManager: Action type changed for', conditionId, 'to', newActionType);
        });

        // ✅ NUEVO: Delegación para cambios en el campo de cantidad (amount)
        $(document).on('input' + ns + '-delegation', '.sfq-condition-amount', (e) => {
            const $input = $(e.currentTarget);
            const $conditionItem = $input.closest('.sfq-condition-item');
            const conditionId = $conditionItem.attr('id');
            const $questionItem = $input.closest('.sfq-question-item');
            const questionId = $questionItem.attr('id');

            // CRÍTICO: Obtener la condición directamente del ConditionEngine para asegurar que sea la instancia correcta
            const condition = this.formBuilder.conditionEngine.conditions[questionId]?.find(c => c.id === conditionId);
            if (!condition) {
                console.error('SFQ EventManager: Condition object not found in ConditionEngine for ID:', conditionId);
                return;
            }
            console.log('SFQ EventManager: Retrieved condition object for amount change:', condition);

            condition.amount = parseInt($input.val()) || 0;
            this.formBuilder.isDirty = true;
            console.log('SFQ EventManager: Condition amount changed for', conditionId, 'to', condition.amount);
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
     * Manejar eliminar elemento (condiciones, elementos freestyle, etc.)
     */
    handleDeleteElement(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const $button = $(e.currentTarget);
        const $element = $button.closest('[data-element-type], .sfq-condition-item, .sfq-variable-item');
        
        if ($element.length === 0) {
            console.warn('SFQ: No element found to delete');
            return;
        }
        
        // Determinar el tipo de elemento a eliminar
        if ($element.hasClass('sfq-condition-item')) {
            // Eliminar condición
            this.handleDeleteCondition($element);
        } else if ($element.hasClass('sfq-variable-item')) {
            // Eliminar variable global
            this.handleDeleteVariable($element);
        } else if ($element.attr('data-element-type')) {
            // Eliminar elemento freestyle
            this.handleDeleteFreestyleElement($element);
        } else {
            console.warn('SFQ: Unknown element type to delete');
        }
    }

    /**
     * Manejar eliminar condición
     */
    handleDeleteCondition($conditionElement) {
        const conditionId = $conditionElement.attr('id');
        const $questionItem = $conditionElement.closest('.sfq-question-item');
        const questionId = $questionItem.attr('id');
        
        if (confirm('¿Estás seguro de eliminar esta condición?')) {
            // Eliminar del ConditionEngine
            if (this.formBuilder.conditionEngine) {
                this.formBuilder.conditionEngine.removeCondition(questionId, conditionId);
            }
            
            // Eliminar del DOM
            $conditionElement.slideUp(300, function() {
                $(this).remove();
            });
            
            this.formBuilder.isDirty = true;
            console.log('SFQ: Deleted condition:', conditionId);
        }
    }

    /**
     * Manejar eliminar variable global
     */
    handleDeleteVariable($variableElement) {
        const variableName = $variableElement.data('variable-name');
        
        if (confirm('¿Estás seguro de eliminar esta variable global?')) {
            // Eliminar del VariableManager
            if (this.formBuilder.variableManager) {
                this.formBuilder.variableManager.deleteVariable(variableName);
            }
            
            // Eliminar del DOM
            $variableElement.slideUp(300, function() {
                $(this).remove();
            });
            
            this.formBuilder.isDirty = true;
            console.log('SFQ: Deleted variable:', variableName);
        }
    }

    /**
     * Manejar eliminar elemento freestyle
     */
    handleDeleteFreestyleElement($element) {
        const elementId = $element.data('element-id');
        const elementType = $element.attr('data-element-type');
        const $questionItem = $element.closest('.sfq-question-item');
        const questionId = $questionItem.attr('id');
        
        if (confirm(`¿Estás seguro de eliminar este elemento ${elementType}?`)) {
            // ✅ CORREGIDO: Llamar al método correcto del QuestionManager
            if (this.formBuilder.questionManager) {
                this.formBuilder.questionManager.deleteFreestyleElement(questionId, elementId);
            }
            
            this.formBuilder.isDirty = true;
            console.log('SFQ: Deleted freestyle element:', elementId, elementType);
        }
    }

    /**
     * Manejar plegado/expansión del contenido de una pregunta
     */
    handleToggleQuestionContent(e) {
        e.preventDefault();
        const $button = $(e.currentTarget);
        const $questionItem = $button.closest('.sfq-question-item');
        const $questionContent = $questionItem.find('.sfq-question-content');
        const questionId = $questionItem.attr('id');
            const question = this.formBuilder.questionManager.getQuestion(questionId);

            if (!question) return;

            const $titlePreview = $questionItem.find('.sfq-question-title-preview');

            // Toggle class for content visibility
            $questionContent.slideToggle(300, () => {
                const isCollapsed = $questionContent.is(':hidden');
                $questionItem.toggleClass('sfq-collapsed', isCollapsed);
                $button.find('.dashicons')
                       .toggleClass('dashicons-arrow-up', !isCollapsed)
                       .toggleClass('dashicons-arrow-down', isCollapsed);
                
                // Update visibility of the title preview
                if (isCollapsed) {
                    $titlePreview.addClass('visible');
                    // Update the title preview text when collapsing
                    const currentText = question.text || 'Pregunta sin título';
                    const truncatedText = currentText.substring(0, 60) + (currentText.length > 60 ? '...' : '');
                    $titlePreview.text(truncatedText);
                } else {
                    $titlePreview.removeClass('visible');
                }

                // Save collapse state
                if (!question.settings) {
                    question.settings = {};
                }
                question.settings.collapsed = isCollapsed;
                this.formBuilder.isDirty = true;
            });
        }

    /**
     * Manejar plegado/expansión de todas las preguntas
     */
    handleToggleAllQuestions(e) {
        e.preventDefault();
        const $button = $(e.currentTarget);
        const $allQuestions = $('.sfq-question-item');
        const $allQuestionContents = $allQuestions.find('.sfq-question-content');
        const $allToggleButtons = $allQuestions.find('.sfq-toggle-question-content .dashicons');

        // Determine if we should collapse or expand
        // If any question is currently expanded, we collapse all. Otherwise, we expand all.
        const shouldCollapseAll = $allQuestionContents.filter(':visible').length > 0;

        $allQuestionContents.each((index, element) => {
            const $content = $(element);
            const $questionItem = $content.closest('.sfq-question-item');
            const questionId = $questionItem.attr('id');
            const question = this.formBuilder.questionManager.getQuestion(questionId);
            const $toggleButtonIcon = $questionItem.find('.sfq-toggle-question-content .dashicons');
            const $titlePreview = $questionItem.find('.sfq-question-title-preview');

            if (shouldCollapseAll) {
                $content.slideUp(300);
                $questionItem.addClass('sfq-collapsed');
                $toggleButtonIcon.removeClass('dashicons-arrow-up').addClass('dashicons-arrow-down');
                $titlePreview.addClass('visible'); // Show title preview when collapsed
                if (question) {
                    question.settings.collapsed = true;
                    const currentText = question.text || 'Pregunta sin título';
                    const truncatedText = currentText.substring(0, 60) + (currentText.length > 60 ? '...' : '');
                    $titlePreview.text(truncatedText); // Update text when collapsing
                }
            } else {
                $content.slideDown(300);
                $questionItem.removeClass('sfq-collapsed');
                $toggleButtonIcon.removeClass('dashicons-arrow-down').addClass('dashicons-arrow-up');
                $titlePreview.removeClass('visible'); // Hide title preview when expanded
                if (question) question.settings.collapsed = false;
            }
        });

        // Update global button text and icon
        $button.find('.dashicons')
               .toggleClass('dashicons-editor-expand', !shouldCollapseAll)
               .toggleClass('dashicons-editor-contract', shouldCollapseAll);
        // To prevent overlapping, we should only have one text element or manage its visibility.
        // For now, let's just update the text content of the button directly.
        $button.text(shouldCollapseAll ? 'Expandir Todo' : 'Plegar Todo');
        // Re-add the dashicon if it was removed by .text()
        if (shouldCollapseAll) {
            $button.prepend('<span class="dashicons dashicons-editor-contract"></span> ');
        } else {
            $button.prepend('<span class="dashicons dashicons-editor-expand"></span> ');
        }


        this.formBuilder.isDirty = true;
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
     * ✅ NUEVO: Vincular eventos para timer de bloqueo de formulario
     */
    bindBlockFormTimerEvents() {
        const ns = this.eventNamespace;
        
        // Delegar al BlockFormTimerManager si está disponible
        if (this.formBuilder.blockFormTimerManager) {
            // ✅ CORREGIDO: Usar bindEvents() que es el método correcto en BlockFormTimerManager
            this.formBuilder.blockFormTimerManager.bindEvents();
            console.log('SFQ EventManager: Block form timer events delegated to BlockFormTimerManager');
        } else {
            console.warn('SFQ EventManager: BlockFormTimerManager not available, binding basic events');
            
            // Fallback básico para el checkbox principal
            $('#block-form-enable-timer').off('change' + ns).on('change' + ns, (e) => {
                if ($(e.target).is(':checked')) {
                    $('#block-form-timer-settings').slideDown();
                    $('#block-form-timer-available-section').slideDown();
                    
                    // Mostrar la sección de colores del mensaje de disponibilidad
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
                    
                    // Ocultar la sección de colores del mensaje de disponibilidad
                    $('.sfq-message-config-section').each(function() {
                        const $section = $(this);
                        const titleText = $section.find('h4').text();
                        // Buscar específicamente la sección que NO incluye "Bloqueo" en el título
                        if (titleText.includes('🎨 Colores del Mensaje') && !titleText.includes('Bloqueo')) {
                            $section.slideUp();
                        }
                    });
                }
                
                if (!this.formBuilder.isDestroyed) {
                    this.formBuilder.isDirty = true;
                }
            });
            
            // Fallback para mostrar/ocultar opción de desaparecer completamente
            $('#block-form-timer-show-form').off('change' + ns).on('change' + ns, (e) => {
                if ($(e.target).is(':checked')) {
                    $('#block-form-timer-hide-all-container').slideDown();
                } else {
                    $('#block-form-timer-hide-all-container').slideUp();
                }
                
                if (!this.formBuilder.isDestroyed) {
                    this.formBuilder.isDirty = true;
                }
            });
            
            // ✅ NUEVO: Fallback para campos del timer
            const timerFields = [
                '#block-form-timer-date',
                '#block-form-timer-text', 
                '#block-form-timer-opened-text',
                '#block-form-timer-show-form',
                '#block-form-timer-hide-all'
            ];
            
            $(timerFields.join(', ')).off('change input' + ns).on('change input' + ns, () => {
                if (!this.formBuilder.isDestroyed) {
                    this.formBuilder.isDirty = true;
                }
            });
            
            // ✅ NUEVO: Fallback para campos del mensaje de disponibilidad del timer
            const availabilityFields = [
                '#block-form-timer-available-icon',
                '#block-form-timer-available-title',
                '#block-form-timer-available-description',
                '#block-form-timer-available-button-text',
                '#block-form-timer-available-button-url'
            ];
            
            $(availabilityFields.join(', ')).off('change input' + ns).on('change input' + ns, () => {
                if (!this.formBuilder.isDestroyed) {
                    this.formBuilder.isDirty = true;
                }
            });
            
            // ✅ NUEVO: Fallback para colores del timer de bloqueo
            const timerColorFields = [
                '#block-form-bg-color',
                '#block-form-border-color', 
                '#block-form-icon-color',
                '#block-form-title-color',
                '#block-form-text-color',
                '#block-form-button-bg-color',
                '#block-form-button-text-color',
                '#block-form-timer-unit-bg-color',
                '#block-form-timer-container-bg-color',
                '#block-form-timer-container-border-color',
                '#block-form-timer-unit-border-color',
                '#block-form-disable-shadow'
            ];
            
            $(timerColorFields.join(', ')).off('change' + ns).on('change' + ns, () => {
                if (!this.formBuilder.isDestroyed) {
                    this.formBuilder.isDirty = true;
                }
            });
            
            // ✅ NUEVO: Fallback para colores del mensaje de disponibilidad
            const availabilityColorFields = [
                '#block-form-timer-available-bg-color',
                '#block-form-timer-available-border-color',
                '#block-form-timer-available-icon-color',
                '#block-form-timer-available-title-color',
                '#block-form-timer-available-text-color',
                '#block-form-timer-available-button-bg-color',
                '#block-form-timer-available-button-text-color'
            ];
            
            $(availabilityColorFields.join(', ')).off('change' + ns).on('change' + ns, () => {
                if (!this.formBuilder.isDestroyed) {
                    this.formBuilder.isDirty = true;
                }
            });
        }
        
        console.log('SFQ EventManager: Block form timer events bound');
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
            const $gradientAdvancedPanel = $question.find('.sfq-gradient-advanced-panel');
            
            console.log('SFQ: Gradient checkbox changed:', $checkbox.is(':checked'));
            
            if ($checkbox.is(':checked')) {
                // Mostrar tanto el panel básico como el avanzado
                $gradientSetting.slideDown(300);
                $gradientAnimationSetting.slideDown(300);
                $gradientAdvancedPanel.slideDown(300);
                console.log('SFQ: Showing gradient settings');
                
                // Actualizar vista previa después de mostrar el panel
                setTimeout(() => {
                    this.updateButtonGradientPreview($question);
                }, 350);
            } else {
                $gradientSetting.slideUp(300);
                $gradientAnimationSetting.slideUp(300);
                $gradientAdvancedPanel.slideUp(300);
                console.log('SFQ: Hiding gradient settings');
            }
            
            this.updateQuestionButtonSettings($question);
        });
        
        // ✅ NUEVO: Eventos específicos para el panel avanzado de gradiente
        $(document).off('change input' + ns, '.sfq-gradient-color-picker').on('change input' + ns, '.sfq-gradient-color-picker', (e) => {
            const $input = $(e.currentTarget);
            const $question = $input.closest('.sfq-question-item');
            
            console.log('SFQ: Gradient color changed:', $input.data('setting'), $input.val());
            
            // Actualizar vista previa en tiempo real
            this.updateButtonGradientPreview($question);
            this.updateQuestionButtonSettings($question);
        });
        
        // Eventos para controles de rango del gradiente
        $(document).off('input' + ns, 'input[data-setting="gradient_speed"]').on('input' + ns, 'input[data-setting="gradient_speed"]', (e) => {
            const $input = $(e.currentTarget);
            const $question = $input.closest('.sfq-question-item');
            const value = $input.val();
            
            // Actualizar display del valor
            $input.siblings('.sfq-gradient-speed-display').text(value + 's');
            
            // Actualizar vista previa
            this.updateButtonGradientPreview($question);
            this.updateQuestionButtonSettings($question);
        });
        
        $(document).off('input' + ns, 'input[data-setting="gradient_angle"]').on('input' + ns, 'input[data-setting="gradient_angle"]', (e) => {
            const $input = $(e.currentTarget);
            const $question = $input.closest('.sfq-question-item');
            const value = $input.val();
            
            // Actualizar display del valor
            $input.siblings('.sfq-gradient-angle-display').text(value + '°');
            
            // Actualizar vista previa
            this.updateButtonGradientPreview($question);
            this.updateQuestionButtonSettings($question);
        });
        
        $(document).off('input' + ns, 'input[data-setting="gradient_size"]').on('input' + ns, 'input[data-setting="gradient_size"]', (e) => {
            const $input = $(e.currentTarget);
            const $question = $input.closest('.sfq-question-item');
            const value = $input.val();
            
            // Actualizar display del valor
            $input.siblings('.sfq-gradient-size-display').text(value + '%');
            
            // Actualizar vista previa
            this.updateButtonGradientPreview($question);
            this.updateQuestionButtonSettings($question);
        });
        
        // ✅ NUEVO: Evento para opacidad del gradiente
        $(document).off('input' + ns, 'input[data-setting="gradient_opacity"]').on('input' + ns, 'input[data-setting="gradient_opacity"]', (e) => {
            const $input = $(e.currentTarget);
            const $question = $input.closest('.sfq-question-item');
            const value = parseFloat($input.val());
            
            // Actualizar display del valor (convertir a porcentaje)
            $input.siblings('.sfq-gradient-opacity-display').text(Math.round(value * 100) + '%');
            
            // Actualizar vista previa
            this.updateButtonGradientPreview($question);
            this.updateQuestionButtonSettings($question);
        });
        
        // ✅ NUEVO: Evento para desenfoque de fondo (glassmorphism)
        $(document).off('input' + ns, 'input[data-setting="gradient_blur"]').on('input' + ns, 'input[data-setting="gradient_blur"]', (e) => {
            const $input = $(e.currentTarget);
            const $question = $input.closest('.sfq-question-item');
            const value = $input.val();
            
            // Actualizar display del valor
            $input.siblings('.sfq-gradient-blur-display').text(value + 'px');
            
            // Actualizar vista previa
            this.updateButtonGradientPreview($question);
            this.updateQuestionButtonSettings($question);
        });
        
        // ✅ NUEVO: Evento para saturación del fondo
        $(document).off('input' + ns, 'input[data-setting="gradient_saturate"]').on('input' + ns, 'input[data-setting="gradient_saturate"]', (e) => {
            const $input = $(e.currentTarget);
            const $question = $input.closest('.sfq-question-item');
            const value = $input.val();
            
            // Actualizar display del valor
            $input.siblings('.sfq-gradient-saturate-display').text(value + '%');
            
            // Actualizar vista previa
            this.updateButtonGradientPreview($question);
            this.updateQuestionButtonSettings($question);
        });
        
        // Eventos para opciones adicionales del gradiente
        $(document).off('change' + ns, 'input[data-setting="gradient_hover_pause"]').on('change' + ns, 'input[data-setting="gradient_hover_pause"]', (e) => {
            const $checkbox = $(e.currentTarget);
            const $question = $checkbox.closest('.sfq-question-item');
            
            console.log('SFQ: Gradient hover pause changed:', $checkbox.is(':checked'));
            
            this.updateButtonGradientPreview($question);
            this.updateQuestionButtonSettings($question);
        });
        
        $(document).off('change' + ns, 'input[data-setting="gradient_reverse_animation"]').on('change' + ns, 'input[data-setting="gradient_reverse_animation"]', (e) => {
            const $checkbox = $(e.currentTarget);
            const $question = $checkbox.closest('.sfq-question-item');
            
            console.log('SFQ: Gradient reverse animation changed:', $checkbox.is(':checked'));
            
            this.updateButtonGradientPreview($question);
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
     * ✅ NUEVO: Manejar subida de imagen de pregunta
     */
    handleUploadQuestionImage(e) {
        e.preventDefault();
        const $button = $(e.currentTarget);
        const $question = $button.closest('.sfq-question-item');
        const questionId = $question.attr('id');
        
        // Verificar que wp.media esté disponible
        if (typeof wp === 'undefined' || !wp.media) {
            alert('Error: WordPress Media Library no está disponible.');
            return;
        }
        
        console.log('SFQ: Opening Media Library for question image:', questionId);
        
        // Crear instancia del media uploader
        const mediaUploader = wp.media({
            title: 'Seleccionar Imagen para Pregunta',
            button: {
                text: 'Usar esta imagen'
            },
            multiple: false,
            library: {
                type: 'image'
            }
        });
        
        // Evento cuando se selecciona una imagen
        mediaUploader.on('select', () => {
            const attachment = mediaUploader.state().get('selection').first().toJSON();
            console.log('SFQ: Selected attachment:', attachment);
            
            // Validar que sea una imagen válida
            if (!this.isValidImageAttachment(attachment)) {
                alert('Error: El archivo seleccionado no es una imagen válida');
                return;
            }
            
            // Actualizar la pregunta con los datos de la imagen
            this.updateQuestionImage($question, attachment);
        });
        
        // Abrir el uploader
        mediaUploader.open();
    }
    
    /**
     * ✅ NUEVO: Manejar input de URL de imagen de pregunta
     */
    handleQuestionImageUrlInput(e) {
        const $input = $(e.currentTarget);
        const url = $input.val().trim();
        const $question = $input.closest('.sfq-question-item');
        
        if (url && this.isValidImageUrl(url)) {
            // URL válida
            $input.removeClass('invalid').addClass('valid');
            
            // Crear objeto attachment simulado para URL manual
            const attachment = {
                url: url,
                id: '',
                alt: 'Imagen desde URL',
                title: 'Imagen desde URL'
            };
            
            this.updateQuestionImage($question, attachment);
        } else if (url) {
            // URL inválida
            $input.removeClass('valid').addClass('invalid');
            this.hideQuestionImagePreview($question);
        } else {
            // Campo vacío
            $input.removeClass('valid invalid');
            this.hideQuestionImagePreview($question);
            this.clearQuestionImageData($question);
        }
    }
    
    /**
     * ✅ NUEVO: Manejar eliminación de imagen de pregunta
     */
    handleRemoveQuestionImage(e) {
        e.preventDefault();
        const $button = $(e.currentTarget);
        const $question = $button.closest('.sfq-question-item');
        
        this.removeQuestionImage($question);
    }
    
    /**
     * ✅ NUEVO: Manejar cambios en configuración de imagen de pregunta
     */
    handleQuestionImageSettingsChange(e) {
        const $input = $(e.currentTarget);
        const $question = $input.closest('.sfq-question-item');
        
        this.updateQuestionImageSettings($question);
    }
    
    /**
     * ✅ NUEVO: Manejar cambio de ancho de imagen de pregunta
     */
    handleQuestionImageWidthChange(e) {
        const $input = $(e.currentTarget);
        const value = $input.val();
        const $question = $input.closest('.sfq-question-item');
        
        // Actualizar display del valor
        $input.siblings('.width-display').text(value + 'px');
        
        // Actualizar configuración
        this.updateQuestionImageSettings($question);
    }
    
    /**
     * ✅ NUEVO: Manejar cambio de ancho personalizado para móvil
     */
    handleQuestionImageMobileWidthChange(e) {
        const $input = $(e.currentTarget);
        const value = $input.val();
        const $question = $input.closest('.sfq-question-item');
        
        // Actualizar display del valor
        $input.siblings('.mobile-width-display').text(value + 'px');
        
        // Actualizar configuración
        this.updateQuestionImageSettings($question);
    }
    
    /**
     * ✅ NUEVO: Actualizar imagen de pregunta
     */
    updateQuestionImage($question, attachment) {
        const questionId = $question.attr('id');
        const question = this.formBuilder.questionManager.getQuestion(questionId);
        
        if (!question) return;
        
        // Inicializar settings si no existen
        if (!question.settings || typeof question.settings !== 'object') {
            question.settings = {};
        }
        
        // Crear/actualizar configuración de imagen
        question.settings.question_image = {
            url: attachment.url,
            id: attachment.id || '',
            alt: attachment.alt || attachment.title || 'Imagen de pregunta',
            position: question.settings.question_image?.position || 'top',
            width: question.settings.question_image?.width || 300,
            shadow: question.settings.question_image?.shadow || false,
            mobile_force_position: question.settings.question_image?.mobile_force_position || false
        };
        
        // Actualizar input de URL
        const $urlInput = $question.find('.sfq-question-image-url-input');
        $urlInput.val(attachment.url).removeClass('invalid').addClass('valid');
        
        // Mostrar configuración y preview
        this.showQuestionImageConfig($question);
        this.updateQuestionImagePreview($question, attachment);
        
        // Marcar formulario como modificado
        this.formBuilder.isDirty = true;
        
        console.log('SFQ: Updated question image:', question.settings.question_image);
    }
    
    /**
     * ✅ NUEVO: Mostrar configuración de imagen de pregunta
     */
    showQuestionImageConfig($question) {
        const $configSection = $question.find('.sfq-question-image-config');
        $configSection.slideDown(300);
        
        // Repoblar valores de configuración
        const question = this.formBuilder.questionManager.getQuestion($question.attr('id'));
        if (question?.settings?.question_image) {
            const imageConfig = question.settings.question_image;
            
            $question.find('.sfq-question-image-position').val(imageConfig.position || 'top');
            $question.find('.sfq-question-image-width').val(imageConfig.width || 300);
            $question.find('.width-display').text((imageConfig.width || 300) + 'px');
            $question.find('.sfq-question-image-shadow').prop('checked', imageConfig.shadow || false);
            $question.find('.sfq-question-image-mobile-force').prop('checked', imageConfig.mobile_force_position || false);
        }
    }
    
    /**
     * ✅ NUEVO: Actualizar preview de imagen de pregunta
     */
    updateQuestionImagePreview($question, attachment) {
        const $previewContainer = $question.find('.sfq-question-image-preview');
        const $previewImage = $previewContainer.find('.sfq-preview-image');
        
        $previewImage.attr('src', attachment.url);
        $previewImage.attr('alt', attachment.alt || 'Vista previa');
        $previewContainer.slideDown(300);
    }
    
    /**
     * ✅ NUEVO: Ocultar preview de imagen de pregunta
     */
    hideQuestionImagePreview($question) {
        const $previewContainer = $question.find('.sfq-question-image-preview');
        $previewContainer.slideUp(300);
    }
    
    /**
     * ✅ NUEVO: Eliminar imagen de pregunta
     */
    removeQuestionImage($question) {
        const questionId = $question.attr('id');
        const question = this.formBuilder.questionManager.getQuestion(questionId);
        
        if (!question) return;
        
        // Limpiar datos de imagen
        if (question.settings && question.settings.question_image) {
            delete question.settings.question_image;
        }
        
        // Limpiar interfaz
        const $urlInput = $question.find('.sfq-question-image-url-input');
        $urlInput.val('').removeClass('valid invalid');
        
        // Ocultar configuración y preview
        $question.find('.sfq-question-image-config').slideUp(300);
        this.hideQuestionImagePreview($question);
        
        // Marcar formulario como modificado
        this.formBuilder.isDirty = true;
        
        console.log('SFQ: Removed question image for:', questionId);
    }
    
    /**
     * ✅ NUEVO: Limpiar datos de imagen de pregunta
     */
    clearQuestionImageData($question) {
        const questionId = $question.attr('id');
        const question = this.formBuilder.questionManager.getQuestion(questionId);
        
        if (question?.settings?.question_image) {
            delete question.settings.question_image;
            this.formBuilder.isDirty = true;
        }
        
        // Ocultar configuración
        $question.find('.sfq-question-image-config').slideUp(300);
    }
    
    /**
     * ✅ NUEVO: Actualizar configuración de imagen de pregunta
     */
    updateQuestionImageSettings($question) {
        const questionId = $question.attr('id');
        const question = this.formBuilder.questionManager.getQuestion(questionId);
        
        if (!question?.settings?.question_image) return;
        
        // Recoger valores de configuración
        const position = $question.find('.sfq-question-image-position').val();
        const width = parseInt($question.find('.sfq-question-image-width').val()) || 300;
        const shadow = $question.find('.sfq-question-image-shadow').is(':checked');
        const mobileForce = $question.find('.sfq-question-image-mobile-force').is(':checked');
        const mobileWidth = parseInt($question.find('.sfq-question-image-mobile-width').val()) || 150;
        
        // ✅ NUEVO: Mostrar/ocultar campo de ancho personalizado para móvil
        const $mobileWidthConfig = $question.find('.sfq-mobile-width-config');
        if (mobileForce) {
            $mobileWidthConfig.slideDown(100);
        } else {
            $mobileWidthConfig.slideUp(300);
        }
        
        // Actualizar configuración
        question.settings.question_image.position = position;
        question.settings.question_image.width = width;
        question.settings.question_image.shadow = shadow;
        question.settings.question_image.mobile_force_position = mobileForce;
        question.settings.question_image.mobile_width = mobileWidth;
        
        // Marcar formulario como modificado
        this.formBuilder.isDirty = true;
        
        console.log('SFQ: Updated question image settings:', question.settings.question_image);
    }
    
    /**
     * ✅ NUEVO: Validar attachment de imagen
     */
    isValidImageAttachment(attachment) {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        
        // Verificar tipo MIME
        if (!validTypes.includes(attachment.mime)) {
            console.error('SFQ: Invalid MIME type:', attachment.mime);
            return false;
        }
        
        // Verificar que tenga URL
        if (!attachment.url) {
            console.error('SFQ: No URL found in attachment');
            return false;
        }
        
        return true;
    }
    
    /**
     * ✅ NUEVO: Validar URL de imagen
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
            case 'gradient_speed':
                $input.siblings('.sfq-gradient-speed-display').text(value + 's');
                break;
            case 'gradient_angle':
                $input.siblings('.sfq-gradient-angle-display').text(value + '°');
                break;
            case 'gradient_size':
                $input.siblings('.sfq-gradient-size-display').text(value + '%');
                break;
        }
    }
    
        /**
         * ✅ NUEVO: Actualizar vista previa del gradiente del botón
         */
        updateButtonGradientPreview($question) {
            if (!$question.length) return;
            
            const $previewButton = $question.find('.sfq-gradient-preview-button');
            if (!$previewButton.length) return;
            
            // Recoger configuraciones del gradiente
            const settings = {};
            $question.find('.sfq-config-input').each((index, input) => {
                const $input = $(input);
                const setting = $input.data('setting');
                
                if (setting && setting.startsWith('gradient_')) {
                    if ($input.attr('type') === 'checkbox') {
                        settings[setting] = $input.is(':checked');
                    } else if ($input.attr('type') === 'range') {
                        settings[setting] = parseFloat($input.val()) || 0;
                    } else {
                        settings[setting] = $input.val() || '';
                    }
                }
            });
            
            // Valores por defecto
            const color1 = settings.gradient_color_1 || '#ee7752';
            const color2 = settings.gradient_color_2 || '#e73c7e';
            const color3 = settings.gradient_color_3 || '#23a6d5';
            const color4 = settings.gradient_color_4 || '#23d5ab';
            const angle = settings.gradient_angle || '-45';
            const size = settings.gradient_size || '400';
            const speed = settings.gradient_speed || '15';
            const opacity = settings.gradient_opacity || '1';
            
            // Crear gradiente CSS
            const gradient = `linear-gradient(${angle}deg, ${color1}, ${color2}, ${color3}, ${color4})`;
            
            // ✅ NUEVO: Crear efectos de glassmorphism
            const blur = settings.gradient_blur || '0';
            const saturate = settings.gradient_saturate || '100';
            
            let backdropFilter = '';
            if (parseInt(blur) > 0 || parseInt(saturate) !== 100) {
                const filters = [];
                if (parseInt(blur) > 0) {
                    filters.push(`blur(${blur}px)`);
                }
                if (parseInt(saturate) !== 100) {
                    filters.push(`saturate(${saturate}%)`);
                }
                backdropFilter = filters.join(' ');
            }
            
            // Aplicar estilos a la vista previa
            const styles = {
                'background': gradient,
                'background-size': `${size}% ${size}%`,
                'animation-duration': `${speed}s`,
                'opacity': opacity
            };
            
            // Añadir backdrop-filter si hay efectos de glassmorphism
            if (backdropFilter) {
                styles['-webkit-backdrop-filter'] = backdropFilter;
                styles['backdrop-filter'] = backdropFilter;
            }
            
            $previewButton.css(styles);
            
            // Aplicar opciones adicionales
            if (settings.gradient_hover_pause) {
                $previewButton.off('mouseenter.gradient mouseleave.gradient');
                $previewButton.on('mouseenter.gradient', function() {
                    $(this).css('animation-play-state', 'paused');
                }).on('mouseleave.gradient', function() {
                    $(this).css('animation-play-state', 'running');
                });
            } else {
                $previewButton.off('mouseenter.gradient mouseleave.gradient');
                $previewButton.css('animation-play-state', 'running');
            }
            
            if (settings.gradient_reverse_animation) {
                $previewButton.css('animation-direction', 'reverse');
            } else {
                $previewButton.css('animation-direction', 'normal');
            }
            
            console.log('SFQ: Updated button gradient preview with settings:', settings);
        }

        /**
         * ✅ NUEVO: Aplicar estilos de gradiente al botón en el frontend
         */
        applyGradientToFrontendButton(buttonConfig, $button) {
            if (!buttonConfig.gradient_enabled || !$button.length) {
                return;
            }

            // Valores por defecto
            const color1 = buttonConfig.gradient_color_1 || '#ee7752';
            const color2 = buttonConfig.gradient_color_2 || '#e73c7e';
            const color3 = buttonConfig.gradient_color_3 || '#23a6d5';
            const color4 = buttonConfig.gradient_color_4 || '#23d5ab';
            const angle = buttonConfig.gradient_angle || '-45';
            const size = buttonConfig.gradient_size || '400';
            const speed = buttonConfig.gradient_speed || '15';

            // Crear gradiente CSS
            const gradient = `linear-gradient(${angle}deg, ${color1}, ${color2}, ${color3}, ${color4})`;

            // Crear animación CSS única para este botón
            const animationName = `sfq-gradient-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            this.createGradientAnimationCSS(animationName);

            // Aplicar estilos al botón
            $button.css({
                'background': gradient,
                'background-size': `${size}% ${size}%`,
                'animation': `${animationName} ${speed}s ease infinite`,
                'position': 'relative',
                'overflow': 'hidden'
            });

            // Aplicar opciones adicionales
            if (buttonConfig.gradient_hover_pause) {
                $button.on('mouseenter.gradient', function() {
                    $(this).css('animation-play-state', 'paused');
                }).on('mouseleave.gradient', function() {
                    $(this).css('animation-play-state', 'running');
                });
            }

            if (buttonConfig.gradient_reverse_animation) {
                $button.css('animation-direction', 'reverse');
            }

            console.log('SFQ: Applied gradient to frontend button:', buttonConfig);
        }

        /**
         * ✅ NUEVO: Crear animación CSS para gradiente
         */
        createGradientAnimationCSS(animationName) {
            // Verificar si ya existe una hoja de estilos para animaciones
            let styleSheet = document.getElementById('sfq-gradient-animations');
            if (!styleSheet) {
                styleSheet = document.createElement('style');
                styleSheet.id = 'sfq-gradient-animations';
                document.head.appendChild(styleSheet);
            }

            // Crear regla de animación
            const animationRule = `
                @keyframes ${animationName} {
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
            `;

            // Añadir la regla a la hoja de estilos
            try {
                styleSheet.sheet.insertRule(animationRule, styleSheet.sheet.cssRules.length);
            } catch (error) {
                console.error('SFQ: Error creating gradient animation:', error);
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
        module.exports = SFQ_EventManager;
    } else {
        window.SFQ_EventManager = SFQ_EventManager;
    }

})(jQuery);
