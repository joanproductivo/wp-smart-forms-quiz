/**
 * Smart Forms & Quiz - Frontend JavaScript
 * Maneja la navegación, lógica condicional y envío de formularios
 */

(function() {
    'use strict';

    class SmartFormQuiz {
        constructor(container) {
            this.container = container;
            this.formId = container.dataset.formId;
            this.sessionId = container.dataset.sessionId;
            this.settings = JSON.parse(container.dataset.settings || '{}');
            
            this.currentScreen = null;
            this.currentQuestionIndex = 0;
            this.responses = {};
            this.variables = {};
            this.startTime = Date.now();
            this.questionStartTime = Date.now();
            
            // ✅ NUEVO: Variables para guardado parcial
            this.savePartialEnabled = this.settings.save_partial || false;
            this.savePartialInterval = null;
            this.lastSaveTime = 0;
            this.savePartialDelay = 3000; // 3 segundos después de cambios
            this.savePartialTimer = null;
            
            // ✅ CRÍTICO: Inicializar variables globales desde el campo oculto
            this.initializeGlobalVariables();
            
            this.init();
        }

        /**
         * Inicializar variables globales desde la configuración del formulario
         */
        initializeGlobalVariables() {
            const variablesInput = document.getElementById(`sfq-variables-${this.formId}`);
            if (variablesInput && variablesInput.value) {
                try {
                    const globalVariables = JSON.parse(variablesInput.value);
                    this.variables = { ...globalVariables };
                    console.log('SFQ Frontend Debug: Initialized global variables:', this.variables);
                } catch (e) {
                    console.error('SFQ Frontend Error: Failed to parse global variables:', e);
                    this.variables = {};
                }
            } else {
                console.log('SFQ Frontend Debug: No global variables found, using empty object');
                this.variables = {};
            }
        }

        init() {
            this.bindEvents();
            this.initializeForm();
            
            // ✅ CORREGIDO: Retrasar inicialización del guardado parcial
            if (this.savePartialEnabled) {
                // Retrasar la inicialización para permitir que se ejecute la lógica condicional inicial
                setTimeout(() => {
                    this.initializePartialSaveDelayed();
                }, 1000); // 1 segundo de retraso
            }
            
            // Registrar vista del formulario
            this.trackEvent('view');
        }

        bindEvents() {
            // Botón de inicio
            const startButton = this.container.querySelector('.sfq-start-button');
            if (startButton) {
                startButton.addEventListener('click', () => this.startForm());
            }

            // Opciones de respuesta única
            this.container.querySelectorAll('.sfq-single-choice .sfq-option-card').forEach(card => {
                card.addEventListener('click', (e) => this.handleSingleChoice(e));
            });

            // Opciones múltiples
            this.container.querySelectorAll('.sfq-checkbox-input').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => this.handleMultipleChoice(e));
            });

            // Campos de texto
            this.container.querySelectorAll('.sfq-text-input').forEach(input => {
                input.addEventListener('input', (e) => this.handleTextInput(e));
            });

            // Rating
            this.container.querySelectorAll('.sfq-star, .sfq-emoji').forEach(button => {
                button.addEventListener('click', (e) => this.handleRating(e));
            });

            // Selección de imagen
            this.container.querySelectorAll('.sfq-image-option').forEach(option => {
                option.addEventListener('click', (e) => this.handleImageChoice(e));
            });

            // Elementos freestyle
            this.bindFreestyleEvents();

            // Botones de navegación
            this.container.querySelectorAll('.sfq-next-button').forEach(button => {
                button.addEventListener('click', () => this.nextQuestion());
            });

            this.container.querySelectorAll('.sfq-prev-button').forEach(button => {
                button.addEventListener('click', () => this.previousQuestion());
            });

            // Prevenir envío de formulario por defecto
            this.container.addEventListener('submit', (e) => e.preventDefault());
            
            // Inicializar botones de todas las preguntas al cargar
            this.initializeAllQuestionButtons();
        }

        initializeForm() {
            // Verificar si la pantalla de introducción está habilitada
            const showIntroScreen = this.settings.show_intro_screen !== false; // Por defecto true
            
            if (!showIntroScreen) {
                // Si la intro está deshabilitada, ir directamente a la primera pregunta
                this.startForm();
                return;
            }
            
            // Mostrar primera pantalla activa (intro)
            const activeScreen = this.container.querySelector('.sfq-screen.active');
            if (activeScreen) {
                this.currentScreen = activeScreen;
                // Actualizar botón siguiente si es una pregunta
                if (activeScreen.classList.contains('sfq-question-screen')) {
                    this.updateNextButtonVisibility(activeScreen);
                }
            }
        }

        startForm() {
            this.trackEvent('start');
            
            // Ocultar pantalla de intro si existe
            const introScreen = this.container.querySelector('.sfq-intro-screen');
            if (introScreen) {
                introScreen.classList.remove('active');
            }

            // ✅ CORREGIDO: Buscar primera pregunta que NO sea pantalla final
            const firstQuestion = this.getFirstNonFinalQuestion();
            if (firstQuestion) {
                this.showScreen(firstQuestion);
                this.updateProgress();
                // Asegurar que el botón siguiente se actualice correctamente
                this.updateNextButtonVisibility(firstQuestion);
            } else {
                // Si no hay preguntas normales, ir directamente al final
                this.submitForm();
            }
        }

        async handleSingleChoice(e) {
            const card = e.currentTarget;
            const questionContainer = card.closest('.sfq-single-choice');
            const questionId = questionContainer.dataset.questionId;
            
            // Remover selección previa
            questionContainer.querySelectorAll('.sfq-option-card').forEach(c => {
                c.classList.remove('selected');
                c.querySelector('input').checked = false;
            });

            // Marcar como seleccionado
            card.classList.add('selected');
            card.querySelector('input').checked = true;

            // Guardar respuesta
            this.responses[questionId] = card.dataset.value;

            // Mostrar indicador de procesamiento
            this.showProcessingIndicator(questionContainer);

            try {
                // Procesar condiciones inmediatamente (ahora es async)
                const redirectResult = await this.processConditionsImmediate(card, questionId);
                
                if (redirectResult && redirectResult.shouldRedirect) {
                    // ✅ NUEVO: Marcar como completado antes de redirigir si es necesario
                    if (redirectResult.markAsCompleted) {
                        console.log('SFQ: Marking form as completed before redirect to:', redirectResult.redirectUrl);
                        
                        // Mostrar indicador de procesamiento elegante
                        this.showRedirectProcessingIndicator();
                        
                        try {
                            // Marcar como completado silenciosamente
                            await this.markFormAsCompleted();
                            
                            // Pequeña pausa para que el usuario vea el indicador
                            setTimeout(() => {
                                window.location.href = redirectResult.redirectUrl;
                            }, 1500);
                        } catch (error) {
                            console.error('SFQ: Error marking form as completed before redirect:', error);
                            // Redirigir de todos modos
                            window.location.href = redirectResult.redirectUrl;
                        }
                    } else {
                        // Redirección inmediata sin marcar como completado
                        window.location.href = redirectResult.redirectUrl;
                    }
                    return;
                }

                // Si hay salto de pregunta, configurarlo
                if (redirectResult && redirectResult.skipToQuestion) {
                    this.skipToQuestion = redirectResult.skipToQuestion;
                }

                // ✅ CRÍTICO: Actualizar variables si las hay
                if (redirectResult && redirectResult.variables) {
                    console.log('SFQ Frontend Debug: Updating variables from:', this.variables, 'to:', redirectResult.variables);
                    this.variables = { ...redirectResult.variables };
                    console.log('SFQ Frontend Debug: Variables updated to:', this.variables);
                }

            } catch (error) {
                console.error('Error processing conditions:', error);
                this.showError('Error al procesar las condiciones. Continuando...');
            } finally {
                // Ocultar indicador de procesamiento
                this.hideProcessingIndicator(questionContainer);
            }

            // Auto-avanzar si está configurado y no hay redirección
            if (this.settings.auto_advance) {
                setTimeout(() => this.nextQuestion(), 300);
            }
        }

        handleMultipleChoice(e) {
            const checkbox = e.target;
            const card = checkbox.closest('.sfq-option-card');
            const questionContainer = checkbox.closest('.sfq-multiple-choice');
            const questionId = questionContainer.dataset.questionId;

            // Toggle selección visual
            if (checkbox.checked) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }

            // Guardar respuestas múltiples
            const selectedValues = [];
            questionContainer.querySelectorAll('.sfq-checkbox-input:checked').forEach(cb => {
                selectedValues.push(cb.value);
            });
            this.responses[questionId] = selectedValues;
        }

        handleTextInput(e) {
            const input = e.target;
            const questionId = input.name.replace('question_', '');
            this.responses[questionId] = input.value;
        }

        handleRating(e) {
            e.preventDefault();
            const button = e.currentTarget;
            const wrapper = button.closest('.sfq-rating-wrapper');
            const questionId = wrapper.dataset.questionId;
            const value = button.dataset.value;

            // Limpiar selección previa
            wrapper.querySelectorAll('.sfq-star, .sfq-emoji').forEach(b => {
                b.classList.remove('active');
            });

            // Marcar hasta el seleccionado (para estrellas)
            if (button.classList.contains('sfq-star')) {
                const stars = wrapper.querySelectorAll('.sfq-star');
                stars.forEach((star, index) => {
                    if (index < value) {
                        star.classList.add('active');
                    }
                });
            } else {
                // Para emojis, solo marcar el seleccionado
                button.classList.add('active');
            }

            // Guardar valor
            wrapper.querySelector('input[type="hidden"]').value = value;
            this.responses[questionId] = value;

            // Auto-avanzar si está configurado
            if (this.settings.auto_advance) {
                setTimeout(() => this.nextQuestion(), 300);
            }
        }

        handleImageChoice(e) {
            const option = e.currentTarget;
            const grid = option.closest('.sfq-image-grid');
            const questionId = grid.dataset.questionId;

            // Limpiar selección previa
            grid.querySelectorAll('.sfq-image-option').forEach(opt => {
                opt.classList.remove('selected');
                const input = opt.querySelector('input');
                if (input) input.checked = false;
            });

            // Marcar como seleccionado
            option.classList.add('selected');
            const input = option.querySelector('input');
            if (input) input.checked = true;

            // Guardar respuesta
            this.responses[questionId] = option.dataset.value;

            // Auto-avanzar si está configurado
            if (this.settings.auto_advance) {
                setTimeout(() => this.nextQuestion(), 300);
            }
        }

        processConditions(element) {
            const conditions = element.dataset.conditions;
            if (!conditions) return;

            try {
                const conditionsList = JSON.parse(conditions);
                conditionsList.forEach(condition => {
                    this.evaluateCondition(condition);
                });
            } catch (e) {
                console.error('Error procesando condiciones:', e);
            }
        }

        async processConditionsImmediate(element, questionId) {
            // ✅ CORREGIDO: Verificar si hay atributo conditions (aunque esté vacío)
            const conditions = element.dataset.conditions;
            let hasLocalConditions = false;
            let hasConditionsAttribute = false;
            
            if (conditions !== undefined) {
                hasConditionsAttribute = true;
                console.log('SFQ Frontend Debug: Found conditions attribute:', conditions);
                
                try {
                    const conditionsList = JSON.parse(conditions);
                    hasLocalConditions = Array.isArray(conditionsList) && conditionsList.length > 0;
                    
                    if (hasLocalConditions) {
                        console.log('SFQ Frontend Debug: Processing local conditions:', conditionsList);
                        const localResult = this.evaluateConditionsForRedirect(conditionsList, questionId);
                        
                        // ✅ CRÍTICO: Aplicar variables actualizadas al estado global
                        if (localResult.variables) {
                            console.log('SFQ Frontend Debug: Applying local variables to global state:', localResult.variables);
                            this.variables = { ...localResult.variables };
                        }
                        
                        if (localResult.shouldRedirect || localResult.skipToQuestion) {
                            return localResult;
                        }
                    } else {
                        console.log('SFQ Frontend Debug: Local conditions array is empty, checking server conditions');
                    }
                } catch (e) {
                    console.error('Error procesando condiciones locales:', e);
                }
            } else {
                console.log('SFQ Frontend Debug: No conditions attribute found on element');
            }
            
            // ✅ CORREGIDO: Hacer petición AJAX si hay atributo conditions (aunque esté vacío)
            // El servidor puede tener condiciones adicionales no presentes en el frontend
            if (hasConditionsAttribute) {
                console.log('SFQ Frontend Debug: Making AJAX call to check server conditions');
                try {
                    const ajaxResult = await this.checkConditionsViaAjax(questionId, element.dataset.value);
                    
                    // ✅ CRÍTICO: Aplicar variables del servidor al estado global
                    if (ajaxResult && ajaxResult.variables) {
                        console.log('SFQ Frontend Debug: Applying AJAX variables to global state:', ajaxResult.variables);
                        this.variables = { ...ajaxResult.variables };
                    }
                    
                    return ajaxResult;
                } catch (error) {
                    console.error('Error en petición AJAX de condiciones:', error);
                    return { 
                        shouldRedirect: false, 
                        skipToQuestion: null,
                        variables: this.variables 
                    };
                }
            } else {
                // ✅ CORREGIDO: Solo si NO hay atributo conditions, no hacer AJAX
                console.log('SFQ Frontend Debug: No conditions attribute, skipping AJAX call');
                return { 
                    shouldRedirect: false, 
                    skipToQuestion: null,
                    variables: this.variables 
                };
            }
        }

        evaluateConditionsForRedirect(conditions, questionId) {
            const answer = this.responses[questionId];
            const result = {
                shouldRedirect: false,
                redirectUrl: null,
                skipToQuestion: null,
                variables: { ...this.variables } // Empezar con variables actuales
            };
            
            console.log('SFQ Frontend Debug: Evaluating conditions for question', questionId);
            console.log('SFQ Frontend Debug: Current answer:', answer);
            console.log('SFQ Frontend Debug: Current variables:', this.variables);
            console.log('SFQ Frontend Debug: Conditions to evaluate:', conditions);
            
            for (const condition of conditions) {
                console.log('SFQ Frontend Debug: Evaluating condition:', condition);
                
                if (this.evaluateConditionImmediate(condition, answer, questionId)) {
                    console.log('SFQ Frontend Debug: Condition matched! Executing action:', condition.action_type);
                    
                    // ✅ CRÍTICO: Ejecutar acciones de variables correctamente
                    switch (condition.action_type) {
                        case 'redirect_url':
                            result.shouldRedirect = true;
                            result.redirectUrl = condition.action_value;
                            result.markAsCompleted = true; // ✅ NUEVO: Marcar para completar antes de redirigir
                            console.log('SFQ Frontend Debug: Setting redirect to:', condition.action_value);
                            return result; // Retornar inmediatamente para redirección
                            
                        case 'add_variable':
                            const varName = condition.action_value;
                            const varAmount = parseInt(condition.variable_amount) || 0;
                            const currentValue = result.variables[varName] || 0;
                            const newValue = currentValue + varAmount;
                            result.variables[varName] = newValue;
                            
                            console.log(`SFQ Frontend Debug: ADD_VARIABLE - Variable: ${varName}, Current: ${currentValue}, Adding: ${varAmount}, New: ${newValue}`);
                            break;
                            
                        case 'set_variable':
                            const setVarName = condition.action_value;
                            const setValue = condition.variable_amount;
                            result.variables[setVarName] = setValue;
                            
                            console.log(`SFQ Frontend Debug: SET_VARIABLE - Variable: ${setVarName}, Set to: ${setValue}`);
                            break;
                            
                        case 'goto_question':
                            result.skipToQuestion = condition.action_value;
                            console.log('SFQ Frontend Debug: Setting skip to question:', condition.action_value);
                            break;
                            
                        case 'skip_to_end':
                            result.skipToQuestion = 'end';
                            console.log('SFQ Frontend Debug: Skipping to end');
                            break;
                            
                        case 'show_message':
                            console.log('SFQ Frontend Debug: Show message:', condition.action_value);
                            // Los mensajes se pueden manejar aquí en el futuro
                            break;
                    }
                } else {
                    console.log('SFQ Frontend Debug: Condition did not match');
                }
            }
            
            console.log('SFQ Frontend Debug: Final result variables:', result.variables);
            return result;
        }

        evaluateConditionImmediate(condition, answer, questionId) {
            switch (condition.condition_type) {
                case 'answer_equals':
                    return answer === condition.condition_value;
                    
                case 'answer_contains':
                    return answer && answer.toString().includes(condition.condition_value);
                    
                case 'answer_not_equals':
                    return answer !== condition.condition_value;
                    
                case 'variable_greater':
                    const varName = condition.condition_value;
                    const comparisonValue = this.getComparisonValue(condition);
                    const varValue = this.variables[varName] || 0;
                    return this.smartCompare(varValue, comparisonValue, '>');
                    
                case 'variable_less':
                    const varName2 = condition.condition_value;
                    const comparisonValue2 = this.getComparisonValue(condition);
                    const varValue2 = this.variables[varName2] || 0;
                    return this.smartCompare(varValue2, comparisonValue2, '<');
                    
                case 'variable_equals':
                    const varName3 = condition.condition_value;
                    const comparisonValue3 = this.getComparisonValue(condition);
                    const varValue3 = this.variables[varName3] || 0;
                    return this.smartCompare(varValue3, comparisonValue3, '==');
                    
                default:
                    return false;
            }
        }

        /**
         * Obtener valor de comparación con fallback para compatibilidad
         */
        getComparisonValue(condition) {
            // Priorizar comparison_value si existe y no está vacío
            if (condition.comparison_value !== undefined && condition.comparison_value !== '') {
                return condition.comparison_value;
            }
            
            // Fallback a variable_amount para compatibilidad con datos existentes
            return condition.variable_amount || 0;
        }

        /**
         * Comparación inteligente que maneja números y texto automáticamente
         */
        smartCompare(value1, value2, operator) {
            // Si ambos valores parecen números, comparar como números
            if (!isNaN(value1) && !isNaN(value2)) {
                const num1 = parseFloat(value1);
                const num2 = parseFloat(value2);
                
                switch (operator) {
                    case '>':
                        return num1 > num2;
                    case '<':
                        return num1 < num2;
                    case '==':
                        return num1 === num2;
                    default:
                        return false;
                }
            }
            
            // Si alguno no es numérico, comparar como strings
            const str1 = String(value1);
            const str2 = String(value2);
            
            switch (operator) {
                case '>':
                    return str1.localeCompare(str2) > 0;
                case '<':
                    return str1.localeCompare(str2) < 0;
                case '==':
                    return str1 === str2;
                default:
                    return false;
            }
        }

        async checkConditionsViaAjax(questionId, answer) {
            const result = {
                shouldRedirect: false,
                redirectUrl: null,
                skipToQuestion: null,
                variables: {}
            };
            
            try {
                const formData = new FormData();
                formData.append('action', 'sfq_get_next_question');
                formData.append('nonce', sfq_ajax.nonce);
                formData.append('form_id', this.formId);
                formData.append('current_question_id', questionId);
                formData.append('answer', answer);
                formData.append('variables', JSON.stringify(this.variables));

                const response = await fetch(sfq_ajax.ajax_url, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const ajaxResult = await response.json();
                
                if (ajaxResult.success && ajaxResult.data) {
                    // Actualizar variables si las hay
                    if (ajaxResult.data.variables) {
                        result.variables = ajaxResult.data.variables;
                    }
                    
                    // Verificar redirección
                    if (ajaxResult.data.redirect_url) {
                        result.shouldRedirect = true;
                        result.redirectUrl = ajaxResult.data.redirect_url;
                        result.markAsCompleted = true; // ✅ CRÍTICO: Marcar para completar antes de redirigir
                        console.log('SFQ Frontend Debug: Server redirect detected, marking for completion:', ajaxResult.data.redirect_url);
                        return result;
                    }
                    
                    // ✅ CORREGIDO: Solo establecer skipToQuestion si hay navegación condicional real
                    if (ajaxResult.data.next_question_id && ajaxResult.data.has_conditional_navigation) {
                        result.skipToQuestion = ajaxResult.data.next_question_id;
                        console.log('SFQ Frontend Debug: Server confirmed conditional navigation to:', ajaxResult.data.next_question_id);
                    } else if (ajaxResult.data.next_question_id && !ajaxResult.data.has_conditional_navigation) {
                        console.log('SFQ Frontend Debug: Server returned next_question_id but no conditional navigation - ignoring for sequential flow');
                    }
                } else {
                    // AJAX request failed or returned no data
                }
                
            } catch (error) {
                console.error('Error in AJAX conditions check:', error);
                // No lanzar el error, solo loggearlo y continuar
            }
            
            return result;
        }

        evaluateCondition(condition) {
            // Procesar diferentes tipos de condiciones
            switch (condition.type) {
                case 'add_variable':
                    const currentValue = this.variables[condition.variable] || 0;
                    this.variables[condition.variable] = currentValue + condition.value;
                    break;
                    
                case 'set_variable':
                    this.variables[condition.variable] = condition.value;
                    break;
                    
                case 'redirect':
                    if (this.checkVariableCondition(condition)) {
                        this.redirectUrl = condition.url;
                    }
                    break;
                    
                case 'skip_to':
                    if (this.checkVariableCondition(condition)) {
                        this.skipToQuestion = condition.question_id;
                    }
                    break;
            }
        }

        checkVariableCondition(condition) {
            if (!condition.if) return true;
            
            const variable = this.variables[condition.if.variable] || 0;
            const value = condition.if.value;
            
            switch (condition.if.operator) {
                case '>':
                    return variable > value;
                case '<':
                    return variable < value;
                case '>=':
                    return variable >= value;
                case '<=':
                    return variable <= value;
                case '==':
                    return variable == value;
                case '!=':
                    return variable != value;
                default:
                    return false;
            }
        }

        nextQuestion() {
            const currentQuestion = this.currentScreen;
            if (!currentQuestion) return;

            // Validar respuesta requerida
            if (!this.validateCurrentQuestion()) {
                this.showError('Por favor, responde a esta pregunta antes de continuar.');
                return;
            }

            // Registrar tiempo en la pregunta
            const timeSpent = Date.now() - this.questionStartTime;
            this.trackEvent('question_answered', {
                question_id: currentQuestion.dataset.questionId,
                time_spent: timeSpent
            });

            // Verificar si hay redirección condicional
            if (this.redirectUrl) {
                window.location.href = this.redirectUrl;
                return;
            }

            let nextQuestion = null;

            // ✅ CORREGIDO: Lógica de navegación mejorada con debug adicional
            console.log('SFQ: Navigation check - skipToQuestion:', this.skipToQuestion);
            
            if (this.skipToQuestion) {
                // Navegación condicional - puede ir a cualquier pregunta, incluyendo pantallas finales
                nextQuestion = this.container.querySelector(`[data-question-id="${this.skipToQuestion}"]`);
                console.log('SFQ: Conditional navigation to question:', this.skipToQuestion);
                
                // Resetear skip después de usarlo
                this.skipToQuestion = null;
            } else {
                // Navegación secuencial - DEBE saltar pantallas finales
                nextQuestion = this.getNextNonFinalQuestion(currentQuestion);
                console.log('SFQ: Sequential navigation - looking for next non-final question');
            }

            // Si no hay más preguntas normales, ir al final
            if (!nextQuestion || !nextQuestion.classList.contains('sfq-question-screen')) {
                console.log('SFQ: No more questions found, submitting form');
                this.submitForm();
                return;
            }

            // Verificar si la pregunta encontrada es una pantalla final (solo para debug)
            if (this.isQuestionPantallaFinal(nextQuestion)) {
                console.log('SFQ: Next question is a final screen:', nextQuestion.dataset.questionId);
            } else {
                console.log('SFQ: Next question is normal:', nextQuestion.dataset.questionId);
            }

            // Cambiar a siguiente pregunta
            this.showScreen(nextQuestion);
            this.currentQuestionIndex++;
            this.updateProgress();
            this.questionStartTime = Date.now();
        }

        previousQuestion() {
            const currentQuestion = this.currentScreen;
            if (!currentQuestion) return;

            // Buscar pregunta anterior
            let prevQuestion = currentQuestion.previousElementSibling;
            
            // Saltar pantalla de intro si existe
            if (prevQuestion && prevQuestion.classList.contains('sfq-intro-screen')) {
                prevQuestion = prevQuestion.previousElementSibling;
            }

            if (prevQuestion && prevQuestion.classList.contains('sfq-question-screen')) {
                this.showScreen(prevQuestion, 'right');
                this.currentQuestionIndex--;
                this.updateProgress();
            }
        }

        showScreen(screen, direction = 'left') {
            // Ocultar pantalla actual
            if (this.currentScreen) {
                this.currentScreen.classList.remove('active', 'slide-left', 'slide-right');
            }

            // ✅ MEJORADO: Verificación preventiva para pantallas finales
            if (screen.classList.contains('sfq-question-screen')) {
                const isPantallaFinal = this.isQuestionPantallaFinal(screen);
                
                if (isPantallaFinal) {
                    console.log('SFQ: Accessing final screen via conditional logic:', screen.dataset.questionId);
                    
                    // ✅ CRÍTICO: Añadir clase para mostrar la pantalla final (override del CSS)
                    screen.classList.add('sfq-conditional-access');
                    
                    // Mostrar nueva pantalla con animación
                    screen.classList.add('active', `slide-${direction}`);
                    this.currentScreen = screen;
                    
                    // Manejar llegada a pantalla final
                    this.handlePantallaFinalReached(screen);
                    return;
                } else {
                    // ✅ NUEVO: Para preguntas normales, asegurar que NO tengan clase de acceso condicional
                    screen.classList.remove('sfq-conditional-access');
                }
            }

            // Mostrar nueva pantalla con animación (para preguntas normales)
            screen.classList.add('active', `slide-${direction}`);
            this.currentScreen = screen;

            // Controlar visibilidad del botón siguiente
            this.updateNextButtonVisibility(screen);

            // Hacer scroll al top solo si está habilitado
            if (this.settings.auto_scroll_to_form !== false) {
                this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }

        initializeAllQuestionButtons() {
            // Inicializar el texto de todos los botones de pregunta al cargar la página
            this.container.querySelectorAll('.sfq-question-screen').forEach(screen => {
                this.updateNextButtonVisibility(screen);
            });
        }

        updateNextButtonVisibility(screen) {
            // Solo aplicar a pantallas de pregunta
            if (!screen.classList.contains('sfq-question-screen')) {
                return;
            }

            const nextButton = screen.querySelector('.sfq-next-button');
            if (!nextButton) {
                return;
            }

            // Obtener configuración de la pregunta desde el atributo data
            const showNextButton = screen.dataset.showNextButton;
            const customButtonText = screen.dataset.nextButtonText;
            
            // Si no hay configuración específica, mostrar por defecto
            if (showNextButton === undefined || showNextButton === null || showNextButton === '') {
                nextButton.style.display = 'inline-block';
            } else {
                // Convertir a booleano y aplicar
                const shouldShow = showNextButton === 'true' || showNextButton === '1';
                nextButton.style.display = shouldShow ? 'inline-block' : 'none';
            }

            // Actualizar el texto del botón si hay texto personalizado
            if (customButtonText && customButtonText.trim() !== '') {
                nextButton.textContent = customButtonText;
            } else {
                // Usar texto por defecto basado en si es la última pregunta
                const questionIndex = parseInt(screen.dataset.questionIndex) || 0;
                const totalQuestions = this.container.querySelectorAll('.sfq-question-screen').length;
                const isLastQuestion = questionIndex === totalQuestions - 1;
                
                nextButton.textContent = isLastQuestion ? 'Finalizar' : 'Siguiente';
            }
        }

        updateProgress() {
            const progressBar = this.container.querySelector('.sfq-progress-fill');
            if (!progressBar) return;

            // ✅ CORREGIDO: Si estamos en una pantalla final, completar la barra al 100%
            if (this.currentScreen && this.isQuestionPantallaFinal(this.currentScreen)) {
                console.log('SFQ: Final screen detected - setting progress to 100%');
                progressBar.style.width = '100%';
                
                // ✅ ELEGANTE: Hacer desaparecer la barra después de completarse
                const progressContainer = this.container.querySelector('.sfq-progress-bar');
                if (progressContainer) {
                    setTimeout(() => {
                        progressContainer.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
                        progressContainer.style.opacity = '0';
                        progressContainer.style.transform = 'translateY(-10px)';
                        
                        // Ocultar completamente después de la animación
                        setTimeout(() => {
                            progressContainer.style.display = 'none';
                        }, 800);
                    }, 1000); // Esperar 1 segundo después de completar al 100%
                }
                return;
            }

            const totalQuestions = this.container.querySelectorAll('.sfq-question-screen').length;
            const progress = ((this.currentQuestionIndex + 1) / totalQuestions) * 100;
            progressBar.style.width = `${progress}%`;
        }

        validateCurrentQuestion() {
            const currentQuestion = this.currentScreen;
            if (!currentQuestion) return true;

            const questionId = currentQuestion.dataset.questionId;
            const questionType = currentQuestion.dataset.questionType;

            // Verificar si es requerida
            const isRequired = currentQuestion.querySelector('.sfq-required');
            if (!isRequired) return true;

            // Validar según tipo
            switch (questionType) {
                case 'single_choice':
                case 'image_choice':
                    return this.responses[questionId] !== undefined;
                    
                case 'multiple_choice':
                    return this.responses[questionId] && this.responses[questionId].length > 0;
                    
                case 'text':
                case 'email':
                    const input = currentQuestion.querySelector('.sfq-text-input');
                    return input && input.value.trim() !== '' && input.checkValidity();
                    
                case 'rating':
                    return this.responses[questionId] !== undefined;
                    
                case 'freestyle':
                    return this.validateFreestyleQuestion(currentQuestion);
                    
                default:
                    return true;
            }
        }

        /**
         * Vincular eventos para elementos freestyle
         */
        bindFreestyleEvents() {
            // Inputs de texto freestyle
            this.container.querySelectorAll('.sfq-freestyle-input, .sfq-freestyle-textarea').forEach(input => {
                input.addEventListener('input', (e) => this.handleFreestyleInput(e));
            });

            // Selects freestyle
            this.container.querySelectorAll('.sfq-freestyle-select').forEach(select => {
                select.addEventListener('change', (e) => this.handleFreestyleSelect(e));
            });

            // Checkboxes freestyle
            this.container.querySelectorAll('.sfq-freestyle-checkbox, .sfq-legal-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => this.handleFreestyleCheckbox(e));
            });

            // Rating freestyle
            this.container.querySelectorAll('.sfq-freestyle-star, .sfq-freestyle-heart, .sfq-freestyle-emoji').forEach(button => {
                button.addEventListener('click', (e) => this.handleFreestyleRating(e));
            });

            // Botones freestyle
            this.container.querySelectorAll('.sfq-freestyle-button').forEach(button => {
                button.addEventListener('click', (e) => this.handleFreestyleButton(e));
            });

            // Imágenes clickeables freestyle
            this.container.querySelectorAll('.sfq-clickable-image').forEach(image => {
                image.addEventListener('click', (e) => this.handleFreestyleImageClick(e));
            });

            // File uploads freestyle
            this.container.querySelectorAll('.sfq-file-input').forEach(input => {
                input.addEventListener('change', (e) => this.handleFreestyleFileUpload(e));
            });

            // Inicializar countdowns freestyle
            this.initializeFreestyleCountdowns();
        }

        /**
         * Manejar input de texto freestyle
         */
        handleFreestyleInput(e) {
            const input = e.target;
            const elementId = input.id.replace('element_', '');
            const questionContainer = input.closest('.sfq-freestyle-container');
            const questionId = questionContainer.dataset.questionId;

            // Inicializar respuesta freestyle si no existe
            if (!this.responses[questionId]) {
                this.responses[questionId] = {};
            }

            this.responses[questionId][elementId] = input.value;
        }

        /**
         * Manejar select freestyle
         */
        handleFreestyleSelect(e) {
            const select = e.target;
            const elementId = select.id.replace('element_', '');
            const questionContainer = select.closest('.sfq-freestyle-container');
            const questionId = questionContainer.dataset.questionId;

            // Inicializar respuesta freestyle si no existe
            if (!this.responses[questionId]) {
                this.responses[questionId] = {};
            }

            this.responses[questionId][elementId] = select.value;
        }

        /**
         * Manejar checkbox freestyle
         */
        handleFreestyleCheckbox(e) {
            const checkbox = e.target;
            const elementId = checkbox.id.replace('element_', '');
            const questionContainer = checkbox.closest('.sfq-freestyle-container');
            const questionId = questionContainer.dataset.questionId;

            // Inicializar respuesta freestyle si no existe
            if (!this.responses[questionId]) {
                this.responses[questionId] = {};
            }

            this.responses[questionId][elementId] = checkbox.checked ? checkbox.value : '';
        }

        /**
         * Manejar rating freestyle
         */
        handleFreestyleRating(e) {
            e.preventDefault();
            const button = e.currentTarget;
            const wrapper = button.closest('.sfq-freestyle-rating-wrapper');
            const elementId = wrapper.dataset.elementId;
            const questionContainer = wrapper.closest('.sfq-freestyle-container');
            const questionId = questionContainer.dataset.questionId;
            const value = button.dataset.value;
            const ratingType = wrapper.dataset.type;

            // Limpiar selección previa
            wrapper.querySelectorAll('.sfq-freestyle-star, .sfq-freestyle-heart, .sfq-freestyle-emoji').forEach(b => {
                b.classList.remove('active');
            });

            // Marcar hasta el seleccionado (para estrellas)
            if (ratingType === 'stars') {
                const stars = wrapper.querySelectorAll('.sfq-freestyle-star');
                stars.forEach((star, index) => {
                    if (index < value) {
                        star.classList.add('active');
                    }
                });
            } else {
                // Para hearts y emojis, solo marcar el seleccionado
                button.classList.add('active');
            }

            // Actualizar campo oculto
            const hiddenInput = wrapper.querySelector('.sfq-rating-value');
            if (hiddenInput) {
                hiddenInput.value = value;
            }

            // Inicializar respuesta freestyle si no existe
            if (!this.responses[questionId]) {
                this.responses[questionId] = {};
            }

            this.responses[questionId][elementId] = value;
        }

        /**
         * Manejar click en botón freestyle
         */
        handleFreestyleButton(e) {
            const button = e.currentTarget;
            const elementId = button.dataset.elementId;
            const questionContainer = button.closest('.sfq-freestyle-container');
            const questionId = questionContainer.dataset.questionId;

            // Actualizar campo oculto para tracking
            const tracker = questionContainer.querySelector(`.sfq-button-click-tracker`);
            if (tracker) {
                tracker.value = 'clicked_' + Date.now();
            }

            // Inicializar respuesta freestyle si no existe
            if (!this.responses[questionId]) {
                this.responses[questionId] = {};
            }

            this.responses[questionId][elementId] = 'clicked';

            // Si es un botón con URL, el navegador manejará la navegación automáticamente
        }

        /**
         * Manejar click en imagen freestyle
         */
        handleFreestyleImageClick(e) {
            const imageContainer = e.currentTarget;
            const elementId = imageContainer.dataset.elementId;
            const questionContainer = imageContainer.closest('.sfq-freestyle-container');
            const questionId = questionContainer.dataset.questionId;

            // Actualizar campo oculto para tracking
            const tracker = imageContainer.querySelector('.sfq-image-click-tracker');
            if (tracker) {
                tracker.value = 'clicked_' + Date.now();
            }

            // Inicializar respuesta freestyle si no existe
            if (!this.responses[questionId]) {
                this.responses[questionId] = {};
            }

            this.responses[questionId][elementId] = 'clicked';

            // Añadir efecto visual
            imageContainer.style.transform = 'scale(0.95)';
            setTimeout(() => {
                imageContainer.style.transform = 'scale(1)';
            }, 150);
        }

        /**
         * Manejar subida de archivos freestyle
         */
        handleFreestyleFileUpload(e) {
            const input = e.target;
            const elementId = input.id.replace('element_', '');
            const questionContainer = input.closest('.sfq-freestyle-container');
            const questionId = questionContainer.dataset.questionId;
            const uploadArea = input.closest('.sfq-file-upload-area');
            const preview = uploadArea.querySelector('.sfq-file-preview');

            // Inicializar respuesta freestyle si no existe
            if (!this.responses[questionId]) {
                this.responses[questionId] = {};
            }

            if (input.files && input.files.length > 0) {
                const fileNames = Array.from(input.files).map(file => file.name);
                this.responses[questionId][elementId] = fileNames;

                // Mostrar preview
                if (preview) {
                    preview.innerHTML = '';
                    preview.style.display = 'block';

                    Array.from(input.files).forEach(file => {
                        const fileItem = document.createElement('div');
                        fileItem.className = 'sfq-file-item';
                        fileItem.innerHTML = `
                            <span class="sfq-file-name">📎 ${file.name}</span>
                            <span class="sfq-file-size">(${this.formatFileSize(file.size)})</span>
                        `;
                        preview.appendChild(fileItem);
                    });
                }
            } else {
                this.responses[questionId][elementId] = [];
                if (preview) {
                    preview.style.display = 'none';
                }
            }
        }

        /**
         * Inicializar countdowns freestyle
         */
        initializeFreestyleCountdowns() {
            this.container.querySelectorAll('.sfq-freestyle-countdown').forEach(countdown => {
                const targetDate = countdown.dataset.targetDate;
                const finishedText = countdown.dataset.finishedText;
                const elementId = countdown.closest('.sfq-freestyle-countdown-wrapper').dataset.elementId;

                if (!targetDate) return;

                const targetTime = new Date(targetDate).getTime();

                const updateCountdown = () => {
                    const now = new Date().getTime();
                    const distance = targetTime - now;

                    if (distance < 0) {
                        // Countdown terminado
                        countdown.innerHTML = `<div class="sfq-countdown-finished">${finishedText}</div>`;
                        return;
                    }

                    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                    // Actualizar números
                    const daysEl = countdown.querySelector('[data-unit="days"]');
                    const hoursEl = countdown.querySelector('[data-unit="hours"]');
                    const minutesEl = countdown.querySelector('[data-unit="minutes"]');
                    const secondsEl = countdown.querySelector('[data-unit="seconds"]');

                    if (daysEl) daysEl.textContent = days.toString().padStart(2, '0');
                    if (hoursEl) hoursEl.textContent = hours.toString().padStart(2, '0');
                    if (minutesEl) minutesEl.textContent = minutes.toString().padStart(2, '0');
                    if (secondsEl) secondsEl.textContent = seconds.toString().padStart(2, '0');
                };

                // Actualizar inmediatamente y luego cada segundo
                updateCountdown();
                setInterval(updateCountdown, 1000);
            });
        }

        /**
         * Validar pregunta freestyle
         */
        validateFreestyleQuestion(questionScreen) {
            const questionId = questionScreen.dataset.questionId;
            const freestyleContainer = questionScreen.querySelector('.sfq-freestyle-container');
            
            if (!freestyleContainer) return true;

            // Obtener elementos requeridos
            const requiredElements = freestyleContainer.querySelectorAll('[required], .sfq-required');
            
            for (const element of requiredElements) {
                const elementId = element.id ? element.id.replace('element_', '') : null;
                
                if (!elementId) continue;

                // Verificar si hay respuesta para este elemento
                const hasResponse = this.responses[questionId] && 
                                  this.responses[questionId][elementId] && 
                                  this.responses[questionId][elementId] !== '';

                if (!hasResponse) {
                    // Hacer scroll al elemento problemático
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Añadir clase de error temporal
                    element.classList.add('sfq-validation-error');
                    setTimeout(() => {
                        element.classList.remove('sfq-validation-error');
                    }, 3000);
                    
                    return false;
                }

                // Validación específica para emails
                if (element.type === 'email' && !element.checkValidity()) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('sfq-validation-error');
                    setTimeout(() => {
                        element.classList.remove('sfq-validation-error');
                    }, 3000);
                    return false;
                }
            }

            return true;
        }

        /**
         * Formatear tamaño de archivo
         */
        formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        showError(message) {
            // Crear elemento de error si no existe
            let errorDiv = this.container.querySelector('.sfq-error-message');
            if (!errorDiv) {
                errorDiv = document.createElement('div');
                errorDiv.className = 'sfq-error-message';
                this.currentScreen.querySelector('.sfq-question-content').appendChild(errorDiv);
            }

            errorDiv.textContent = message;
            errorDiv.style.display = 'block';

            // Ocultar después de 3 segundos
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 3000);
        }

        async submitForm() {
            console.log('SFQ: Starting form submission (normal flow)');
            
            // ✅ CRÍTICO: Desactivar sistema de guardado parcial ANTES de procesar
            this.disablePartialSave();
            
            // Calcular tiempo total
            const totalTime = Math.floor((Date.now() - this.startTime) / 1000);

            // Preparar datos
            const formData = new FormData();
            formData.append('action', 'sfq_submit_response');
            formData.append('nonce', sfq_ajax.nonce);
            formData.append('form_id', this.formId);
            formData.append('session_id', this.sessionId);
            formData.append('responses', JSON.stringify(this.responses));
            formData.append('variables', JSON.stringify(this.variables));
            formData.append('time_spent', totalTime);

            try {
                // Mostrar loading
                this.showLoading();

                const response = await fetch(sfq_ajax.ajax_url, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();

                if (result.success) {
                    console.log('SFQ: Form submitted successfully (normal flow)');
                    
                    // PRIORITY 1: Verificar si hay redirección condicional desde el resultado del servidor
                    if (result.data && result.data.redirect_url) {
                        window.location.href = result.data.redirect_url;
                        return;
                    }
                    
                    // PRIORITY 2: Verificar redirección configurada en el formulario
                    const configuredRedirectUrl = this.container.querySelector('#sfq-redirect-url-' + this.formId);
                    if (configuredRedirectUrl && configuredRedirectUrl.value) {
                        setTimeout(() => {
                            window.location.href = configuredRedirectUrl.value;
                        }, 2000);
                        
                        // Mostrar mensaje de redirección
                        this.showThankYouScreen();
                        const thankYouScreen = this.container.querySelector('.sfq-thank-you-screen');
                        if (thankYouScreen) {
                            const redirectMessage = document.createElement('div');
                            redirectMessage.className = 'sfq-redirect-message';
                            redirectMessage.innerHTML = '<p>Redirigiendo en 2 segundos...</p>';
                            thankYouScreen.appendChild(redirectMessage);
                        }
                        return;
                    }

                    // PRIORITY 3: Mostrar pantalla de agradecimiento normal
                    this.showThankYouScreen();
                } else {
                    // Manejo mejorado de errores del servidor
                    let errorMessage = 'Error al enviar el formulario';
                    
                    if (result.data) {
                        if (typeof result.data === 'string') {
                            errorMessage = result.data;
                        } else if (result.data.message) {
                            errorMessage = result.data.message;
                        } else if (result.data.code) {
                            switch (result.data.code) {
                                case 'INVALID_NONCE':
                                    errorMessage = 'Error de seguridad. Por favor, recarga la página e intenta de nuevo.';
                                    break;
                                case 'RATE_LIMIT_EXCEEDED':
                                    errorMessage = 'Demasiadas peticiones. Por favor, espera un momento antes de intentar de nuevo.';
                                    break;
                                case 'INSUFFICIENT_PERMISSIONS':
                                    errorMessage = 'No tienes permisos para realizar esta acción.';
                                    break;
                                default:
                                    errorMessage = `Error: ${result.data.code}`;
                            }
                        }
                    }
                    
                    throw new Error(errorMessage);
                }
            } catch (error) {
                console.error('Error submitting form:', error);
                
                // Mostrar mensaje de error más específico
                let errorMessage = 'Ha ocurrido un error al enviar el formulario. Por favor, intenta de nuevo.';
                
                if (error.message && error.message !== 'Error al enviar el formulario') {
                    errorMessage = error.message;
                }
                
                this.showError(errorMessage);
            } finally {
                this.hideLoading();
            }
        }

        showThankYouScreen() {
            const thankYouScreen = this.container.querySelector('.sfq-thank-you-screen');
            if (thankYouScreen) {
                this.showScreen(thankYouScreen);
            }

            // Ocultar barra de progreso
            const progressBar = this.container.querySelector('.sfq-progress-bar');
            if (progressBar) {
                progressBar.style.display = 'none';
            }
        }

        showLoading() {
            // Crear overlay de loading
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'sfq-loading-overlay';
            loadingDiv.innerHTML = '<div class="sfq-loading"></div>';
            this.container.appendChild(loadingDiv);
        }

        hideLoading() {
            const loadingDiv = this.container.querySelector('.sfq-loading-overlay');
            if (loadingDiv) {
                loadingDiv.remove();
            }
        }

        async trackEvent(eventType, eventData = {}) {
            const formData = new FormData();
            formData.append('action', 'sfq_track_event');
            formData.append('nonce', sfq_ajax.nonce);
            formData.append('form_id', this.formId);
            formData.append('session_id', this.sessionId);
            formData.append('event_type', eventType);
            formData.append('event_data', JSON.stringify(eventData));

            try {
                await fetch(sfq_ajax.ajax_url, {
                    method: 'POST',
                    body: formData
                });
            } catch (error) {
                console.error('Error tracking event:', error);
            }
        }

        /**
         * Mostrar indicador de procesamiento durante evaluación de condiciones
         */
        showProcessingIndicator(container) {
            // Remover indicador existente si lo hay
            this.hideProcessingIndicator(container);
            
            const indicator = document.createElement('div');
            indicator.className = 'sfq-processing-indicator';
            indicator.innerHTML = `
                <div class="sfq-processing-spinner"></div>
                <span class="sfq-processing-text">...</span>
            `;
            
            // Añadir al contenedor de la pregunta
            container.appendChild(indicator);
            
            // Añadir clase para efectos visuales
            container.classList.add('sfq-processing');
        }

        /**
         * Ocultar indicador de procesamiento
         */
        hideProcessingIndicator(container) {
            const indicator = container.querySelector('.sfq-processing-indicator');
            if (indicator) {
                indicator.remove();
            }
            container.classList.remove('sfq-processing');
        }

        /**
         * ✅ NUEVO: Mostrar mensaje de procesamiento personalizado
         */
        showProcessingMessage(message) {
            // Remover mensaje existente si lo hay
            this.hideProcessingMessage();
            
            const indicator = document.createElement('div');
            indicator.className = 'sfq-processing-message';
            indicator.innerHTML = `
                <div class="sfq-processing-spinner"></div>
                <span class="sfq-processing-text">${message}</span>
            `;
            
            // Añadir al contenedor principal del formulario
            this.container.appendChild(indicator);
            
            // Añadir clase para efectos visuales
            this.container.classList.add('sfq-processing-form');
        }

        /**
         * ✅ NUEVO: Ocultar mensaje de procesamiento personalizado
         */
        hideProcessingMessage() {
            const indicator = this.container.querySelector('.sfq-processing-message');
            if (indicator) {
                indicator.remove();
            }
            this.container.classList.remove('sfq-processing-form');
        }

        /**
         * ✅ NUEVO: Mostrar indicador elegante de procesamiento para redirección
         */
        showRedirectProcessingIndicator() {
            // Remover indicador existente si lo hay
            this.hideRedirectProcessingIndicator();
            
            // Obtener configuraciones del formulario (por ahora usar valores por defecto)
            const settings = this.settings || {};
            const indicatorText = settings.processing_indicator_text || '';
            const indicatorOpacity = settings.processing_indicator_opacity || '0.8';
            const indicatorBgColor = settings.processing_indicator_bg_color || '#ffffff';
            const indicatorTextColor = settings.processing_indicator_text_color || '#666666';
            const indicatorSpinnerColor = settings.processing_indicator_spinner_color || '#007cba';
            
            const indicator = document.createElement('div');
            indicator.className = 'sfq-redirect-processing-overlay';
            
            // Crear contenido del indicador
            let content = `<div class="sfq-redirect-processing-spinner"></div>`;
            
            // Solo añadir texto si está configurado
            if (indicatorText && indicatorText.trim() !== '') {
                content += `<span class="sfq-redirect-processing-text">${indicatorText}</span>`;
            }
            
            indicator.innerHTML = `<div class="sfq-redirect-processing-content">${content}</div>`;
            
            // Aplicar estilos personalizados
            indicator.style.backgroundColor = `rgba(${this.hexToRgb(indicatorBgColor)}, ${indicatorOpacity})`;
            indicator.style.color = indicatorTextColor;
            
            // Aplicar color del spinner
            const spinnerElement = indicator.querySelector('.sfq-redirect-processing-spinner');
            if (spinnerElement) {
                spinnerElement.style.borderTopColor = indicatorSpinnerColor;
            }
            
            // Añadir al contenedor principal del formulario
            this.container.appendChild(indicator);
            
            // Añadir clase para efectos visuales
            this.container.classList.add('sfq-redirect-processing');
            
            // Animar la aparición
            setTimeout(() => {
                indicator.classList.add('show');
            }, 10);
        }

        /**
         * ✅ NUEVO: Ocultar indicador de procesamiento para redirección
         */
        hideRedirectProcessingIndicator() {
            const indicator = this.container.querySelector('.sfq-redirect-processing-overlay');
            if (indicator) {
                indicator.remove();
            }
            this.container.classList.remove('sfq-redirect-processing');
        }

        /**
         * ✅ NUEVO: Convertir hex a RGB para transparencias
         */
        hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? 
                `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
                '255, 255, 255';
        }

        /**
         * ✅ NUEVO: Inicializar sistema de guardado parcial con retraso (después de lógica condicional)
         */
        async initializePartialSaveDelayed() {
            console.log('SFQ Partial Save: Initializing partial save system (delayed)');
            
            // ✅ CRÍTICO: Verificar PRIMERO si el formulario ya está completado
            const isCompleted = await this.checkIfFormCompleted();
            
            if (isCompleted) {
                console.log('SFQ Partial Save: Form already completed, skipping partial save initialization');
                return;
            }
            
            // Solo si NO está completado, proceder con parciales
            await this.loadPartialResponse();
            
            // Configurar auto-guardado
            this.setupAutoSave();
            
            // Configurar guardado antes de salir de la página
            this.setupBeforeUnloadSave();
        }

        /**
         * ✅ CORREGIDO: Inicializar sistema de guardado parcial con verificación previa
         */
        async initializePartialSave() {
            console.log('SFQ Partial Save: Initializing partial save system');
            
            // ✅ CRÍTICO: Verificar PRIMERO si el formulario ya está completado
            const isCompleted = await this.checkIfFormCompleted();
            
            if (isCompleted) {
                console.log('SFQ Partial Save: Form already completed, skipping partial save initialization');
                return;
            }
            
            // Solo si NO está completado, proceder con parciales
            await this.loadPartialResponse();
            
            // Configurar auto-guardado
            this.setupAutoSave();
            
            // Configurar guardado antes de salir de la página
            this.setupBeforeUnloadSave();
        }

        /**
         * ✅ NUEVO: Cargar respuesta parcial existente
         */
        async loadPartialResponse() {
            if (!this.formId || !this.sessionId) {
                console.log('SFQ Partial Save: Missing form ID or session ID');
                return;
            }

            try {
                const formData = new FormData();
                formData.append('action', 'sfq_get_partial_response');
                formData.append('nonce', sfq_ajax.nonce);
                formData.append('form_id', this.formId);
                formData.append('session_id', this.sessionId);

                const response = await fetch(sfq_ajax.ajax_url, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();

                if (result.success && result.data && result.data.has_partial) {
                    console.log('SFQ Partial Save: Found partial response, restoring...');
                    
                    // Restaurar respuestas
                    if (result.data.responses && typeof result.data.responses === 'object') {
                        this.responses = { ...result.data.responses };
                    }
                    
                    // Restaurar variables
                    if (result.data.variables && typeof result.data.variables === 'object') {
                        this.variables = { ...result.data.variables };
                    }
                    
                    // Restaurar estado visual del formulario
                    this.restoreFormState();
                    
                    // Mostrar notificación de recuperación
                    this.showPartialRestoreNotification(result.data.expires_in_hours);
                    
                    console.log('SFQ Partial Save: Partial response restored successfully');
                } else {
                    console.log('SFQ Partial Save: No partial response found');
                }
            } catch (error) {
                console.error('SFQ Partial Save: Error loading partial response:', error);
            }
        }

        /**
         * ✅ NUEVO: Restaurar estado visual del formulario
         */
        restoreFormState() {
            // Restaurar respuestas de opción única
            Object.keys(this.responses).forEach(questionId => {
                const answer = this.responses[questionId];
                
                // Buscar contenedor de pregunta
                const questionContainer = this.container.querySelector(`[data-question-id="${questionId}"]`);
                if (!questionContainer) return;
                
                const questionType = questionContainer.dataset.questionType;
                
                switch (questionType) {
                    case 'single_choice':
                        this.restoreSingleChoice(questionContainer, answer);
                        break;
                        
                    case 'multiple_choice':
                        this.restoreMultipleChoice(questionContainer, answer);
                        break;
                        
                    case 'text':
                    case 'email':
                        this.restoreTextInput(questionContainer, answer);
                        break;
                        
                    case 'rating':
                        this.restoreRating(questionContainer, answer);
                        break;
                        
                    case 'image_choice':
                        this.restoreImageChoice(questionContainer, answer);
                        break;
                        
                    case 'freestyle':
                        this.restoreFreestyle(questionContainer, answer);
                        break;
                }
            });
        }

        /**
         * ✅ NUEVO: Restaurar respuesta única
         */
        restoreSingleChoice(container, answer) {
            const cards = container.querySelectorAll('.sfq-option-card');
            cards.forEach(card => {
                const input = card.querySelector('input');
                if (card.dataset.value === answer) {
                    card.classList.add('selected');
                    if (input) input.checked = true;
                } else {
                    card.classList.remove('selected');
                    if (input) input.checked = false;
                }
            });
        }

        /**
         * ✅ NUEVO: Restaurar respuesta múltiple
         */
        restoreMultipleChoice(container, answers) {
            if (!Array.isArray(answers)) return;
            
            const checkboxes = container.querySelectorAll('.sfq-checkbox-input');
            checkboxes.forEach(checkbox => {
                const card = checkbox.closest('.sfq-option-card');
                if (answers.includes(checkbox.value)) {
                    checkbox.checked = true;
                    if (card) card.classList.add('selected');
                } else {
                    checkbox.checked = false;
                    if (card) card.classList.remove('selected');
                }
            });
        }

        /**
         * ✅ NUEVO: Restaurar input de texto
         */
        restoreTextInput(container, answer) {
            const input = container.querySelector('.sfq-text-input');
            if (input && answer) {
                input.value = answer;
            }
        }

        /**
         * ✅ NUEVO: Restaurar rating
         */
        restoreRating(container, answer) {
            const wrapper = container.querySelector('.sfq-rating-wrapper');
            if (!wrapper || !answer) return;
            
            const value = parseInt(answer);
            const buttons = wrapper.querySelectorAll('.sfq-star, .sfq-emoji');
            
            buttons.forEach((button, index) => {
                if (button.classList.contains('sfq-star')) {
                    // Para estrellas, marcar hasta el valor seleccionado
                    if (index < value) {
                        button.classList.add('active');
                    } else {
                        button.classList.remove('active');
                    }
                } else {
                    // Para emojis, marcar solo el seleccionado
                    if (parseInt(button.dataset.value) === value) {
                        button.classList.add('active');
                    } else {
                        button.classList.remove('active');
                    }
                }
            });
            
            // Actualizar campo oculto
            const hiddenInput = wrapper.querySelector('input[type="hidden"]');
            if (hiddenInput) {
                hiddenInput.value = answer;
            }
        }

        /**
         * ✅ NUEVO: Restaurar selección de imagen
         */
        restoreImageChoice(container, answer) {
            const options = container.querySelectorAll('.sfq-image-option');
            options.forEach(option => {
                const input = option.querySelector('input');
                if (option.dataset.value === answer) {
                    option.classList.add('selected');
                    if (input) input.checked = true;
                } else {
                    option.classList.remove('selected');
                    if (input) input.checked = false;
                }
            });
        }

        /**
         * ✅ NUEVO: Restaurar elementos freestyle
         */
        restoreFreestyle(container, answers) {
            if (!answers || typeof answers !== 'object') return;
            
            Object.keys(answers).forEach(elementId => {
                const value = answers[elementId];
                const element = container.querySelector(`#element_${elementId}`);
                
                if (!element) return;
                
                const elementType = element.type || element.tagName.toLowerCase();
                
                switch (elementType) {
                    case 'text':
                    case 'email':
                    case 'textarea':
                        element.value = value;
                        break;
                        
                    case 'select':
                        element.value = value;
                        break;
                        
                    case 'checkbox':
                        element.checked = !!value;
                        break;
                        
                    default:
                        // Para elementos personalizados como rating
                        if (element.closest('.sfq-freestyle-rating-wrapper')) {
                            this.restoreFreestyleRating(element.closest('.sfq-freestyle-rating-wrapper'), value);
                        }
                }
            });
        }

        /**
         * ✅ NUEVO: Restaurar rating freestyle
         */
        restoreFreestyleRating(wrapper, value) {
            const ratingValue = parseInt(value);
            const buttons = wrapper.querySelectorAll('.sfq-freestyle-star, .sfq-freestyle-heart, .sfq-freestyle-emoji');
            const ratingType = wrapper.dataset.type;
            
            buttons.forEach((button, index) => {
                if (ratingType === 'stars') {
                    if (index < ratingValue) {
                        button.classList.add('active');
                    } else {
                        button.classList.remove('active');
                    }
                } else {
                    if (parseInt(button.dataset.value) === ratingValue) {
                        button.classList.add('active');
                    } else {
                        button.classList.remove('active');
                    }
                }
            });
            
            const hiddenInput = wrapper.querySelector('.sfq-rating-value');
            if (hiddenInput) {
                hiddenInput.value = value;
            }
        }

        /**
         * ✅ NUEVO: Configurar auto-guardado
         */
        setupAutoSave() {
            // Configurar guardado con debounce
            const debouncedSave = this.debounce(() => {
                this.savePartialResponse();
            }, this.savePartialDelay);
            
            // Escuchar cambios en todos los inputs del formulario
            this.container.addEventListener('input', debouncedSave);
            this.container.addEventListener('change', debouncedSave);
            
            // Guardado periódico cada 30 segundos si hay cambios
            this.savePartialInterval = setInterval(() => {
                if (this.hasUnsavedChanges()) {
                    this.savePartialResponse();
                }
            }, 30000);
        }

        /**
         * ✅ NUEVO: Configurar guardado antes de salir
         */
        setupBeforeUnloadSave() {
            window.addEventListener('beforeunload', () => {
                if (this.hasUnsavedChanges()) {
                    // Guardado síncrono antes de salir
                    navigator.sendBeacon(sfq_ajax.ajax_url, new URLSearchParams({
                        action: 'sfq_save_partial_response',
                        nonce: sfq_ajax.nonce,
                        form_id: this.formId,
                        session_id: this.sessionId,
                        responses: JSON.stringify(this.responses),
                        variables: JSON.stringify(this.variables),
                        current_question: this.currentQuestionIndex
                    }));
                }
            });
        }

        /**
         * ✅ NUEVO: Verificar si hay cambios sin guardar
         */
        hasUnsavedChanges() {
            const currentTime = Date.now();
            return (currentTime - this.lastSaveTime) > 5000 && Object.keys(this.responses).length > 0;
        }

        /**
         * ✅ NUEVO: Guardar respuesta parcial
         */
        async savePartialResponse() {
            if (!this.formId || !this.sessionId || Object.keys(this.responses).length === 0) {
                return;
            }

            try {
                const formData = new FormData();
                formData.append('action', 'sfq_save_partial_response');
                formData.append('nonce', sfq_ajax.nonce);
                formData.append('form_id', this.formId);
                formData.append('session_id', this.sessionId);
                formData.append('responses', JSON.stringify(this.responses));
                formData.append('variables', JSON.stringify(this.variables));
                formData.append('current_question', this.currentQuestionIndex);

                const response = await fetch(sfq_ajax.ajax_url, {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        this.lastSaveTime = Date.now();
                        console.log('SFQ Partial Save: Response saved successfully');
                        this.showSaveIndicator();
                    }
                }
            } catch (error) {
                console.error('SFQ Partial Save: Error saving partial response:', error);
            }
        }

        /**
         * ✅ NUEVO: Mostrar indicador de guardado
         */
        showSaveIndicator() {
            // Crear o actualizar indicador de guardado
            let indicator = this.container.querySelector('.sfq-save-indicator');
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.className = 'sfq-save-indicator';
                indicator.innerHTML = '✓ Guardado';
                this.container.appendChild(indicator);
            }
            
            indicator.classList.add('show');
            
            // Ocultar después de 2 segundos
            setTimeout(() => {
                indicator.classList.remove('show');
            }, 2000);
        }

        /**
         * ✅ NUEVO: Mostrar notificación de recuperación
         */
        showPartialRestoreNotification(hoursLeft) {
            const notification = document.createElement('div');
            notification.className = 'sfq-restore-notification';
            notification.innerHTML = `
                <div class="sfq-restore-content">
                    <span class="sfq-restore-icon">✦</span>
                    <div class="sfq-restore-text">
                        <strong>Respuestas recuperadas</strong>
                        <small>Se han restaurado tus respuestas anteriores (expiran en ${hoursLeft}h)</small>
                    </div>
                    <button class="sfq-restore-close" onclick="this.parentElement.parentElement.remove()">×</button>
                </div>
            `;
            
            this.container.insertBefore(notification, this.container.firstChild);
            
            // Auto-ocultar después de 8 segundos
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 8000);
        }

        /**
         * ✅ NUEVO: Función debounce para optimizar guardado
         */
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        /**
         * ✅ NUEVO: Limpiar recursos de guardado parcial
         */
        cleanupPartialSave() {
            if (this.savePartialInterval) {
                clearInterval(this.savePartialInterval);
                this.savePartialInterval = null;
            }
            
            if (this.savePartialTimer) {
                clearTimeout(this.savePartialTimer);
                this.savePartialTimer = null;
            }
        }

        /**
         * ✅ MEJORADO: Verificar si una pregunta es una pantalla final con detección robusta
         */
        isQuestionPantallaFinal(questionScreen) {
            if (!questionScreen || !questionScreen.classList.contains('sfq-question-screen')) {
                return false;
            }
            
            // 1. Verificar atributo data-pantalla-final
            const pantallaFinalAttr = questionScreen.dataset.pantallaFinal;
            if (pantallaFinalAttr === 'true') {
                console.log('SFQ: Question detected as final screen via data-pantalla-final:', questionScreen.dataset.questionId);
                return true;
            }
            
            // 2. Verificar clase CSS específica
            if (questionScreen.classList.contains('sfq-final-screen-hidden')) {
                console.log('SFQ: Question detected as final screen via CSS class:', questionScreen.dataset.questionId);
                return true;
            }
            
            // 3. Verificar si es una pregunta freestyle con pantallaFinal en el DOM
            const questionType = questionScreen.dataset.questionType;
            if (questionType === 'freestyle') {
                const freestyleContainer = questionScreen.querySelector('.sfq-freestyle-container');
                if (freestyleContainer && freestyleContainer.dataset.pantallaFinal === 'true') {
                    console.log('SFQ: Question detected as final screen via freestyle container:', questionScreen.dataset.questionId);
                    return true;
                }
            }
            
            return false;
        }

        /**
         * ✅ CORREGIDO: Manejar llegada a pantalla final
         */
        async handlePantallaFinalReached(questionScreen) {
            const questionId = questionScreen.dataset.questionId;
            
            console.log('SFQ: Reached final screen:', questionId);
            
            // Ocultar botón siguiente si existe
            const nextButton = questionScreen.querySelector('.sfq-next-button');
            if (nextButton) {
                nextButton.style.display = 'none';
            }
            
            // Registrar tiempo en la pregunta final
            const timeSpent = Date.now() - this.questionStartTime;
            this.trackEvent('question_answered', {
                question_id: questionId,
                time_spent: timeSpent
            });
            
            // ✅ CORREGIDO: NO ejecutar submitForm() automáticamente
            // La pantalla final personalizada ES la pantalla final definitiva
            // El usuario debe permanecer en esta pantalla sin más navegación
            console.log('SFQ: Final screen reached - form will be completed when user manually submits or through other means');
            
            // Opcional: Marcar el formulario como completado en el backend sin mostrar la pantalla de agradecimiento
            this.markFormAsCompleted();
        }

        /**
         * ✅ CORREGIDO: Obtener siguiente pregunta que NO sea pantalla final
         */
        getNextNonFinalQuestion(currentQuestion) {
            let next = currentQuestion.nextElementSibling;
            
            console.log('SFQ: Starting search for next non-final question from:', currentQuestion.dataset.questionId);
            
            // Buscar la siguiente pregunta que no sea pantalla final
            while (next) {
                // Solo considerar elementos que sean pantallas de pregunta
                if (next.classList.contains('sfq-question-screen')) {
                    console.log('SFQ: Checking question:', next.dataset.questionId);
                    
                    // Verificar si es una pantalla final
                    if (this.isQuestionPantallaFinal(next)) {
                        console.log('SFQ: Skipping final screen in sequential navigation:', next.dataset.questionId);
                        next = next.nextElementSibling;
                        continue;
                    }
                    
                    // Es una pregunta normal, la devolvemos
                    console.log('SFQ: Found next non-final question:', next.dataset.questionId);
                    return next;
                }
                
                // Si no es una pantalla de pregunta, continuar buscando
                next = next.nextElementSibling;
            }
            
            // No hay más preguntas normales
            console.log('SFQ: No more non-final questions found');
            return null;
        }

        /**
         * ✅ NUEVO: Obtener primera pregunta que NO sea pantalla final
         */
        getFirstNonFinalQuestion() {
            const allQuestions = this.container.querySelectorAll('.sfq-question-screen');
            
            for (const question of allQuestions) {
                if (!this.isQuestionPantallaFinal(question)) {
                    return question;
                }
                console.log('SFQ: Skipping final screen in initial navigation:', question.dataset.questionId);
            }
            
            // No hay preguntas normales
            return null;
        }

        /**
         * ✅ MEJORADO: Verificar si el formulario ya está completado con logging detallado
         */
        async checkIfFormCompleted() {
            console.log('SFQ Partial Save: Starting completion check...');
            console.log('SFQ Partial Save: Form ID:', this.formId, 'Session ID:', this.sessionId);
            
            if (!this.formId || !this.sessionId) {
                console.log('SFQ Partial Save: Missing form ID or session ID for completion check');
                return false;
            }

            try {
                const formData = new FormData();
                formData.append('action', 'sfq_get_partial_response');
                formData.append('nonce', sfq_ajax.nonce);
                formData.append('form_id', this.formId);
                formData.append('session_id', this.sessionId);

                console.log('SFQ Partial Save: Sending AJAX request to check completion...');

                const response = await fetch(sfq_ajax.ajax_url, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
                console.log('SFQ Partial Save: Server response:', result);

                // Si la respuesta indica que el formulario ya está completado
                if (result.success && result.data) {
                    console.log('SFQ Partial Save: Checking completion indicators...');
                    console.log('SFQ Partial Save: has_partial:', result.data.has_partial);
                    console.log('SFQ Partial Save: message:', result.data.message);
                    console.log('SFQ Partial Save: completed_at:', result.data.completed_at);
                    console.log('SFQ Partial Save: submission_id:', result.data.submission_id);
                    
                    if (!result.data.has_partial) {
                        // Verificar si el mensaje indica que está completado
                        if (result.data.message && result.data.message.includes('ya está completado')) {
                            console.log('SFQ Partial Save: ✅ Form completion detected via server message');
                            return true;
                        }
                        
                        // Verificar si hay datos de submission completado
                        if (result.data.completed_at && result.data.submission_id) {
                            console.log('SFQ Partial Save: ✅ Form completion detected via submission data');
                            return true;
                        }
                        
                        // ✅ NUEVO: Verificar si el mensaje indica que no hay respuesta parcial por estar completado
                        if (result.data.message && result.data.message.includes('No hay respuesta parcial')) {
                            console.log('SFQ Partial Save: ⚠️ No partial response found - checking if form is completed...');
                            // Hacer una verificación adicional más directa
                            const isCompleted = await this.checkCompletionDirectly();
                            if (isCompleted) {
                                console.log('SFQ Partial Save: ✅ Form completion confirmed via direct check');
                                return true;
                            }
                        }
                    }
                }

                console.log('SFQ Partial Save: ❌ Form not detected as completed');
                return false;
            } catch (error) {
                console.error('SFQ Partial Save: Error checking form completion:', error);
                return false; // En caso de error, asumir que no está completado
            }
        }

        /**
         * ✅ NUEVO: Verificación directa de completado usando endpoint específico
         */
        async checkCompletionDirectly() {
            console.log('SFQ Partial Save: Performing direct completion check...');
            
            try {
                const formData = new FormData();
                formData.append('action', 'sfq_check_form_completion');
                formData.append('nonce', sfq_ajax.nonce);
                formData.append('form_id', this.formId);
                formData.append('session_id', this.sessionId);

                const response = await fetch(sfq_ajax.ajax_url, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
                console.log('SFQ Partial Save: Direct completion check result:', result);

                if (result.success && result.data) {
                    const isCompleted = result.data.is_completed || false;
                    console.log('SFQ Partial Save: Direct check - Form completed:', isCompleted);
                    return isCompleted;
                }

                return false;
            } catch (error) {
                console.error('SFQ Partial Save: Error in direct completion check:', error);
                return false;
            }
        }

        /**
         * ✅ NUEVO: Marcar formulario como completado sin mostrar pantalla de agradecimiento
         */
        async markFormAsCompleted() {
            console.log('SFQ: Marking form as completed silently');
            
            // ✅ NUEVO: Desactivar sistema de guardado parcial inmediatamente
            this.disablePartialSave();
            
            // ✅ CRÍTICO: Limpiar respuestas parciales ANTES de marcar como completado
            await this.cleanupPartialResponsesExplicitly();
            
            try {
                const formData = new FormData();
                formData.append('action', 'sfq_submit_response');
                formData.append('nonce', sfq_ajax.nonce);
                formData.append('form_id', this.formId);
                formData.append('session_id', this.sessionId);
                formData.append('responses', JSON.stringify(this.responses));
                formData.append('variables', JSON.stringify(this.variables));
                formData.append('time_spent', Math.floor((Date.now() - this.startTime) / 1000));
                formData.append('silent_completion', 'true'); // Indicar que es completado silencioso

                const response = await fetch(sfq_ajax.ajax_url, {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        console.log('SFQ: Form marked as completed successfully');
                        
                        // Verificar si hay redirección condicional
                        if (result.data && result.data.redirect_url) {
                            setTimeout(() => {
                                window.location.href = result.data.redirect_url;
                            }, 2000);
                        }
                    }
                }
            } catch (error) {
                console.error('SFQ: Error marking form as completed:', error);
            }
        }

        /**
         * ✅ NUEVO: Limpiar respuestas parciales explícitamente
         */
        async cleanupPartialResponsesExplicitly() {
            if (!this.formId || !this.sessionId) {
                return;
            }

            console.log('SFQ Partial Save: Cleaning up partial responses explicitly');

            try {
                const formData = new FormData();
                formData.append('action', 'sfq_cleanup_partial_for_session');
                formData.append('nonce', sfq_ajax.nonce);
                formData.append('form_id', this.formId);
                formData.append('session_id', this.sessionId);

                const response = await fetch(sfq_ajax.ajax_url, {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        console.log('SFQ Partial Save: Partial responses cleaned up successfully');
                    }
                }
            } catch (error) {
                console.error('SFQ Partial Save: Error cleaning up partial responses:', error);
            }
        }

        /**
         * ✅ NUEVO: Desactivar sistema de guardado parcial
         */
        disablePartialSave() {
            console.log('SFQ Partial Save: Disabling partial save system - form completed');
            
            // Limpiar intervalos y timers
            this.cleanupPartialSave();
            
            // Marcar como deshabilitado
            this.savePartialEnabled = false;
            
            // Remover event listeners
            this.container.removeEventListener('input', this.debouncedSave);
            this.container.removeEventListener('change', this.debouncedSave);
            
            // Ocultar indicadores si están visibles
            const saveIndicator = this.container.querySelector('.sfq-save-indicator');
            if (saveIndicator) {
                saveIndicator.remove();
            }
        }
    }

    // Inicializar cuando el DOM esté listo
    document.addEventListener('DOMContentLoaded', function() {
        // Buscar todos los formularios en la página
        document.querySelectorAll('.sfq-form-container').forEach(container => {
            new SmartFormQuiz(container);
        });
    });

    // Exponer clase globalmente por si se necesita
    window.SmartFormQuiz = SmartFormQuiz;
})();

// Estilos adicionales para loading, errores e indicadores de procesamiento
const style = document.createElement('style');
style.textContent = `
    .sfq-loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    }
    
    .sfq-error-message {
        background: #fee;
        color: #c33;
        padding: 1rem;
        border-radius: 8px;
        margin-top: 1rem;
        display: none;
        animation: shake 0.5s;
    }
    
    .sfq-processing-indicator {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 1rem 1.5rem;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        font-size: 0.9rem;
        color: #666;
    }
    
    .sfq-processing-spinner {
        width: 20px;
        height: 20px;
        border: 2px solid #f3f3f3;
        border-top: 2px solid #007cba;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    
    .sfq-processing-text {
        font-weight: 500;
        white-space: nowrap;
    }
    
    .sfq-processing {
        position: relative;
        pointer-events: none;
        opacity: 0.7;
    }
    
    .sfq-processing .sfq-option-card {
        cursor: not-allowed;
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    /* Mejoras visuales para redirección */
    .sfq-redirect-message {
        text-align: center;
        padding: 1rem;
        background: #e7f3ff;
        border: 1px solid #b3d9ff;
        border-radius: 8px;
        margin-top: 1rem;
        color: #0066cc;
        font-weight: 500;
    }
    
    .sfq-redirect-message p {
        margin: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
    }
    
    .sfq-redirect-message p::before {
        content: "↗";
        font-size: 1.2em;
        animation: pulse 1.5s infinite;
    }
    
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
    
    /* ✅ NUEVOS: Estilos para guardado parcial */
    .sfq-save-indicator {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 0.85rem;
        font-weight: 500;
        z-index: 10000;
        opacity: 0;
        transform: translateY(-10px);
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(40, 167, 69, 0.3);
    }
    
    .sfq-save-indicator.show {
        opacity: 1;
        transform: translateY(0);
    }
    
    .sfq-restore-notification {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 12px;
        margin-bottom: 20px;
        box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
        animation: slideInDown 0.5s ease-out;
    }
    
    .sfq-restore-content {
        display: flex;
        align-items: center;
        padding: 16px 20px;
        gap: 12px;
    }
    
    .sfq-restore-icon {
        font-size: 1.5rem;
        animation: rotate 2s linear infinite;
    }
    
    .sfq-restore-text {
        flex: 1;
        line-height: 1.4;
    }
    
    .sfq-restore-text strong {
        display: block;
        font-size: 1rem;
        margin-bottom: 2px;
    }
    
    .sfq-restore-text small {
        font-size: 0.85rem;
        opacity: 0.9;
    }
    
    .sfq-restore-close {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 1.2rem;
        line-height: 1;
        transition: background 0.2s ease;
    }
    
    .sfq-restore-close:hover {
        background: rgba(255, 255, 255, 0.3);
    }
    
    @keyframes slideInDown {
        from {
            opacity: 0;
            transform: translateY(-30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes rotate {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }
    
    /* ✅ NUEVOS: Estilos para indicador elegante de redirección */
    .sfq-redirect-processing-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    
    .sfq-redirect-processing-overlay.show {
        opacity: 1;
    }
    
    .sfq-redirect-processing-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        padding: 2rem;
        background: rgba(255, 255, 255, 0.95);
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        text-align: center;
        min-width: 200px;
    }
    
    .sfq-redirect-processing-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid rgba(0, 124, 186, 0.2);
        border-top: 3px solid #007cba;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    
    .sfq-redirect-processing-text {
        font-size: 1rem;
        font-weight: 500;
        color: #666;
        margin: 0;
        white-space: nowrap;
    }
    
    /* Responsive para móviles */
    @media (max-width: 768px) {
        .sfq-save-indicator {
            top: 10px;
            right: 10px;
            font-size: 0.8rem;
            padding: 6px 12px;
        }
        
        .sfq-restore-notification {
            margin: 10px;
            border-radius: 8px;
        }
        
        .sfq-restore-content {
            padding: 12px 16px;
            gap: 10px;
        }
        
        .sfq-restore-icon {
            font-size: 1.3rem;
        }
        
        .sfq-restore-text strong {
            font-size: 0.9rem;
        }
        
        .sfq-restore-text small {
            font-size: 0.8rem;
        }
        
        .sfq-redirect-processing-content {
            padding: 1.5rem;
            min-width: 160px;
        }
        
        .sfq-redirect-processing-spinner {
            width: 32px;
            height: 32px;
            border-width: 2px;
        }
        
        .sfq-redirect-processing-text {
            font-size: 0.9rem;
        }
    }
`;
document.head.appendChild(style);
