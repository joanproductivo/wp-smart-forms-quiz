/**
 * Smart Forms & Quiz - Frontend JavaScript
 * Maneja la navegación, lógica condicional y envío de formularios
 */

(function() {
    'use strict';

    /**
     * ✅ FASE 2: Motor Unificado de Lógica Condicional con Optimizaciones Avanzadas
     * Centraliza todo el procesamiento de condiciones con evaluación local inteligente
     */
    class ConditionalLogicEngine {
        constructor(formInstance) {
            this.form = formInstance;
            this.cache = new Map();
            this.debugEnabled = true;
        }

        /**
         * Punto de entrada principal para procesar condiciones
         * @param {string} questionId - ID de la pregunta
         * @param {Object} trigger - Información del trigger que activó el procesamiento
         * @returns {Promise<Object>} Resultado del procesamiento
         */
        async processConditions(questionId, trigger) {
            const startTime = performance.now();
            
           

            try {
                // Construir contexto para evaluación
                const context = this.buildContext(questionId, trigger);
                
                // Obtener condiciones aplicables
                const conditions = await this.getApplicableConditions(questionId, trigger);
                
                if (!conditions || conditions.length === 0) {
                    return this.getDefaultResult(context);
                }

                // Evaluar condiciones en orden de prioridad
                for (const condition of conditions) {
                    if (this.shouldEvaluateCondition(condition, trigger)) {
                        const result = await this.evaluateCondition(condition, context);
                        
                        if (result.shouldExecute) {
                            const actionResult = await this.executeAction(result.action, context);
                            
                          
                            
                            return actionResult;
                        }
                    }
                }

                // No se ejecutó ninguna acción
                return this.getDefaultResult(context);

            } catch (error) {
                console.error('🔧 ConditionalEngine: Error processing conditions:', error);
                return this.getErrorResult(context, error);
            }
        }

        /**
         * Construir contexto para evaluación de condiciones
         */
        buildContext(questionId, trigger) {
            return {
                questionId,
                trigger,
                answer: trigger.answer,
                variables: { ...this.form.variables },
                responses: { ...this.form.responses },
                isSecureMode: this.form.isSecureMode,
                timestamp: Date.now()
            };
        }

        /**
         * Obtener condiciones aplicables según el trigger
         */
        async getApplicableConditions(questionId, trigger) {
            // Intentar obtener de cache primero
            const cacheKey = `${questionId}_${trigger.type}`;
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }

            let conditions = [];

            switch (trigger.type) {
                case 'answer':
                    conditions = await this.getAnswerConditions(questionId, trigger);
                    break;
                    
                case 'navigation':
                    conditions = await this.getNavigationConditions(questionId, trigger);
                    break;
                    
                case 'variable_change':
                    conditions = await this.getVariableConditions(questionId, trigger);
                    break;
                    
                default:
                    conditions = await this.getAllConditions(questionId);
            }

            // Cachear resultado
            this.cache.set(cacheKey, conditions);
            return conditions;
        }

        /**
         * ✅ EXPANDIDO: Obtener condiciones de respuesta desde el DOM (elemento + pregunta)
         */
        async getAnswerConditions(questionId, trigger) {
            const allConditions = [];
            
            // 1. Obtener condiciones del elemento clickeado (comportamiento original)
            const element = trigger.element;
            if (element && element.dataset.conditions) {
                try {
                    const elementConditions = JSON.parse(element.dataset.conditions);
                    if (Array.isArray(elementConditions)) {
                        allConditions.push(...elementConditions);
                    }
                } catch (e) {
                    console.error('🔧 ConditionalEngine: Error parsing element conditions:', e);
                }
            }
            
            // 2. ✅ NUEVO: Obtener condiciones a nivel de pregunta (incluyendo variable_*)
            const questionContainer = this.form.container.querySelector(`[data-question-id="${questionId}"]`);
            if (questionContainer) {
                // Buscar todos los elementos con condiciones en la pregunta
                const conditionsElements = questionContainer.querySelectorAll('[data-conditions]');
                
                for (const condElement of conditionsElements) {
                    // Evitar duplicar las condiciones del elemento ya procesado
                    if (condElement === element) continue;
                    
                    try {
                        const conditions = JSON.parse(condElement.dataset.conditions || '[]');
                        if (Array.isArray(conditions)) {
                            // Incluir todas las condiciones (answer_* y variable_*)
                            allConditions.push(...conditions);
                        }
                    } catch (e) {
                        console.error('🔧 ConditionalEngine: Error parsing question-level conditions:', e);
                    }
                }
            }
            
            return allConditions;
        }

        /**
         * Obtener condiciones de navegación 
         */
        async getNavigationConditions(questionId, trigger) {
            const questionContainer = this.form.container.querySelector(`[data-question-id="${questionId}"]`);
            if (!questionContainer) return [];

            const allConditions = [];

            // 1. Obtener condiciones del contenedor de la pregunta en sí
            if (questionContainer.dataset.conditions) {
                try {
                    const containerConditions = JSON.parse(questionContainer.dataset.conditions);
                    if (Array.isArray(containerConditions)) {
                        allConditions.push(...containerConditions);
                    }
                } catch (e) {
                    console.error('🔧 ConditionalEngine: Error parsing question container conditions:', e);
                }
            }

            // 2. Obtener condiciones de los elementos dentro de la pregunta
            const conditionsElements = questionContainer.querySelectorAll('[data-conditions]');

            for (const element of conditionsElements) {
                // Evitar duplicar si el elemento es el propio contenedor de la pregunta (aunque ya se maneja arriba)
                if (element === questionContainer) continue; 
                
                try {
                    const conditions = JSON.parse(element.dataset.conditions || '[]');
                    if (Array.isArray(conditions)) {
                        allConditions.push(...conditions);
                    }
                } catch (e) {
                    console.error('🔧 ConditionalEngine: Error parsing navigation conditions from element:', e);
                }
            }

            return allConditions;
        }

        /**
         * Obtener todas las condiciones (fallback)
         */
        async getAllConditions(questionId) {
            // Implementación para obtener todas las condiciones
            // Combina condiciones del DOM y del servidor si es necesario
            return [];
        }

        /**
         * ✅ CORREGIDO: Determinar si una condición debe evaluarse según el trigger
         * Procesar todas las condiciones en orden sin filtrar por tipo
         */
        shouldEvaluateCondition(condition, trigger) {
            // ✅ SOLUCIÓN: Procesar todas las condiciones en el orden que aparecen
            // sin importar si son de respuesta o variable
            return true;
        }

        /**
         * Evaluar una condición específica
         */
        async evaluateCondition(condition, context) {
            const result = {
                shouldExecute: false,
                action: null,
                variables: { ...context.variables }
            };

            try {
                const conditionMet = this.evaluateConditionLogic(condition, context);
                
                if (conditionMet) {
                    result.shouldExecute = true;
                    result.action = {
                        type: condition.action_type,
                        value: condition.action_value,
                        variable: condition.action_variable || condition.action_value,
                        amount: condition.variable_amount,
                        condition: condition
                    };
                }

                return result;
                
            } catch (error) {
                console.error('🔧 ConditionalEngine: Error evaluating condition:', error);
                return result;
            }
        }

        /**
         * Lógica de evaluación de condiciones (extraída y unificada)
         */
        evaluateConditionLogic(condition, context) {
            const { answer, variables } = context;

            switch (condition.condition_type) {
                case 'answer_equals':
                    // ✅ CORREGIDO: Manejar arrays para respuestas múltiples
                    if (Array.isArray(answer)) {
                        return answer.includes(condition.condition_value);
                    }
                    return answer === condition.condition_value;
                    
                case 'answer_contains':
                    if (Array.isArray(answer)) {
                        return answer.some(val => val && val.toString().includes(condition.condition_value));
                    }
                    return answer && answer.toString().includes(condition.condition_value);
                    
                case 'answer_not_equals':
                    // ✅ CORREGIDO: Manejar arrays para respuestas múltiples
                    if (Array.isArray(answer)) {
                        return !answer.includes(condition.condition_value);
                    }
                    return answer !== condition.condition_value;
                    
                case 'answer_greater':
                    // ✅ IMPLEMENTADO: Condición answer_greater
                    const answerValue1 = Array.isArray(answer) ? Math.max(...answer.map(v => parseFloat(v) || 0)) : (parseFloat(answer) || 0);
                    const compareValue1 = parseFloat(condition.condition_value) || 0;
                    return answerValue1 > compareValue1;
                    
                case 'answer_less':
                    // ✅ IMPLEMENTADO: Condición answer_less
                    const answerValue2 = Array.isArray(answer) ? Math.min(...answer.map(v => parseFloat(v) || 0)) : (parseFloat(answer) || 0);
                    const compareValue2 = parseFloat(condition.condition_value) || 0;
                    return answerValue2 < compareValue2;
                    
                case 'variable_greater':
                    // ✅ CORREGIDO: Usar condition.condition_value como nombre de variable y convertir a número
                    const varValue1 = parseFloat(variables[condition.condition_value] || 0); // Convertir a número
                    const compareValue3 = parseFloat(this.getComparisonValue(condition) || 0); // Convertir a número
                    return this.smartCompare(varValue1, compareValue3, '>');
                    
                case 'variable_greater_equal':
                    // ✅ NUEVO: Variable es mayor o igual que y convertir a número
                    const varValue1_ge = parseFloat(variables[condition.condition_value] || 0); // Convertir a número
                    const compareValue3_ge = parseFloat(this.getComparisonValue(condition) || 0); // Convertir a número
                    return this.smartCompare(varValue1_ge, compareValue3_ge, '>=');
                    
                case 'variable_less':
                    // ✅ CORREGIDO: Usar condition.condition_value como nombre de variable y convertir a número
                    const varValue2 = parseFloat(variables[condition.condition_value] || 0); // Convertir a número
                    const compareValue4 = parseFloat(this.getComparisonValue(condition) || 0); // Convertir a número
                    return this.smartCompare(varValue2, compareValue4, '<');
                    
                case 'variable_less_equal':
                    // ✅ NUEVO: Variable es menor o igual que y convertir a número
                    const varValue2_le = parseFloat(variables[condition.condition_value] || 0); // Convertir a número
                    const compareValue4_le = parseFloat(this.getComparisonValue(condition) || 0); // Convertir a número
                    return this.smartCompare(varValue2_le, compareValue4_le, '<=');
                    
                case 'variable_equals':
                    // ✅ CORREGIDO: Usar condition.condition_value como nombre de variable y convertir a número
                    const varValue3 = parseFloat(variables[condition.condition_value] || 0); // Convertir a número
                    const compareValue5 = parseFloat(this.getComparisonValue(condition) || 0); // Convertir a número
                    return this.smartCompare(varValue3, compareValue5, '==');
                    
                default:
                    console.warn('🔧 ConditionalEngine: Unknown condition type:', condition.condition_type);
                    return false;
            }
        }

        /**
         * Ejecutar acción basada en el resultado de la condición
         */
        async executeAction(action, context) {
            const result = {
                shouldRedirect: false,
                redirectUrl: null,
                skipToQuestion: null,
                variables: { ...context.variables },
                markAsCompleted: false
            };

            try {
                switch (action.type) {
                    case 'redirect_url':
                        result.shouldRedirect = true;
                        result.redirectUrl = action.value;
                        result.markAsCompleted = true;
                        break;
                        
                    case 'add_variable':
                        const currentValue = parseFloat(result.variables[action.variable] || 0); // Convertir a número
                        const addAmount = parseFloat(action.amount) || 0; // Convertir a número
                        result.variables[action.variable] = currentValue + addAmount;
                        break;
                        
                    case 'set_variable':
                        // ✅ NUEVO: Convertir a número si el valor es numérico
                        result.variables[action.variable] = !isNaN(action.amount) && action.amount !== null && action.amount !== '' 
                            ? parseFloat(action.amount) 
                            : action.amount;
                        break;
                        
                    case 'goto_question':
                        result.skipToQuestion = action.value;
                        break;
                        
                    case 'skip_to_end':
                        result.skipToQuestion = 'end';
                        break;
                        
                    default:
                        console.warn('🔧 ConditionalEngine: Unknown action type:', action.type);
                }

                // Actualizar variables en el formulario
                this.form.variables = { ...result.variables };

                return result;
                
            } catch (error) {
                console.error('🔧 ConditionalEngine: Error executing action:', error);
                return result;
            }
        }

        /**
         * Funciones de utilidad (reutilizadas del código existente)
         */
        getComparisonValue(condition) {
            if (condition.comparison_value !== undefined && condition.comparison_value !== '') {
                return condition.comparison_value;
            }
            return condition.variable_amount || 0;
        }

        smartCompare(value1, value2, operator) {

            if (!isNaN(value1) && !isNaN(value2)) {
                const num1 = parseFloat(value1);
                const num2 = parseFloat(value2);
                
                switch (operator) {
                    case '>': return num1 > num2;
                    case '>=': return num1 >= num2;
                    case '<': return num1 < num2;
                    case '<=': return num1 <= num2;
                    case '==': return num1 === num2;
                    default: return false;
                }
            }
            
            const str1 = String(value1);
            const str2 = String(value2);
            
            switch (operator) {
                case '>': return str1.localeCompare(str2) > 0;
                case '>=': return str1.localeCompare(str2) >= 0;
                case '<': return str1.localeCompare(str2) < 0;
                case '<=': return str1.localeCompare(str2) <= 0;
                case '==': return str1 === str2;
                default: return false;
            }
        }

        getDefaultResult(context) {
            return {
                shouldRedirect: false,
                redirectUrl: null,
                skipToQuestion: null,
                variables: { ...context.variables },
                markAsCompleted: false
            };
        }

        getErrorResult(context, error) {
            console.error('🔧 ConditionalEngine: Returning error result:', error);
            return this.getDefaultResult(context);
        }

        /**
         * Limpiar cache (útil para testing o cambios dinámicos)
         */
        clearCache() {
            this.cache.clear();
        }
    }

    class SmartFormQuiz {
        constructor(container) {
            this.container = container;
            this.formId = container.dataset.formId;
            this.sessionId = container.dataset.sessionId;
            this.settings = JSON.parse(container.dataset.settings || '{}');
            
            // Configuración para compatibilidad con cache
            this.config = {
                ajaxUrl: sfq_ajax.ajax_url,
                nonce: sfq_ajax.nonce,
                formId: parseInt(this.formId),
                sessionId: this.sessionId,
                settings: this.settings
            };
            
            this.currentScreen = null;
            this.currentQuestionIndex = 0;
            this.responses = {};
            this.variables = {};
            this.startTime = Date.now();
            this.questionStartTime = Date.now();
            
            // ✅ NUEVO: Motor unificado de lógica condicional
            this.conditionalEngine = new ConditionalLogicEngine(this);
            
            // ✅ NUEVO: Sistema de optimización de condiciones
            this.conditionsCache = new Map();
            this.navigationMap = null;
            this.isSecureMode = container.dataset.secureLoading === 'true';
            // Removed this.optimizationEnabled = true; as it's no longer used.
            
            // ✅ NUEVO: Variables para guardado parcial
            this.savePartialEnabled = this.settings.save_partial || false;
            this.savePartialInterval = null;
            this.lastSaveTime = 0;
            this.savePartialDelay = 3000; // 3 segundos después de cambios
            this.savePartialTimer = null;
            
            // ✅ SOLUCIÓN: Sistema de estado para controlar navegación
            this.navigationState = {
                isProcessing: false,
                canNavigate: true,
                pendingNavigation: null
            };
            
            // ✅ SOLUCIÓN: Variables para controlar procesamiento de texto pendiente
            this.hasPendingTextProcessing = false;
            this.pendingTextInput = null;
            this.textInputTimeout = null;
            
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
                    // ✅ NUEVO: Normalizar variables a números si son numéricas
                    for (const key in globalVariables) {
                        if (globalVariables.hasOwnProperty(key) && !isNaN(globalVariables[key]) && globalVariables[key] !== null && globalVariables[key] !== '') {
                            globalVariables[key] = parseFloat(globalVariables[key]);
                        }
                    }
                    this.variables = { ...globalVariables };
                    
                    // ✅ NUEVO: Actualizar DOM inmediatamente después de inicializar variables
                    setTimeout(() => {
                        this.updateVariablesInDOM();
                    }, 100); // Pequeño delay para asegurar que el DOM esté listo
                    
                } catch (e) {
                    this.variables = {};
                }
            } else {
                this.variables = {};
            }
        }

        /**
         * ✅ CRÍTICO: Actualizar variables si las hay
         */
        updateVariablesInDOM() {
            
            // Buscar todos los elementos que muestran variables
            const variableElements = this.container.querySelectorAll('.sfq-variable-value[data-variable]');
            
            variableElements.forEach(element => {
                const variableName = element.dataset.variable;
                if (this.variables.hasOwnProperty(variableName)) {
                    const newValue = this.variables[variableName];
                    
                    // ✅ NUEVO: Añadir animación suave al cambio de valor
                    if (element.textContent !== newValue.toString()) {
                        element.style.transition = 'all 0.3s ease';
                        element.style.transform = 'scale(1.1)';
                        element.style.opacity = '0.7';
                        
                        setTimeout(() => {
                            element.textContent = newValue;
                            element.style.transform = 'scale(1)';
                            element.style.opacity = '1';
                        }, 150);
                    }
                }
            });
        }

        init() {
            this.bindEvents();
            this.initializeForm();
            
            // ✅ NUEVO: Aplicar estilos de imagen de fondo
            this.applyBackgroundImageStyles();
              // ✅ NUEVO: Aplicar estilos personalizados de botones
            this.applyCustomButtonStyles();
           
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
        
        // ✅ NUEVO: Inicializar sistema de seguimiento de vistas de botones
        this.initializeButtonViewTracking();
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
                // ✅ REFACTORIZADO: Usar motor unificado de lógica condicional
                const trigger = {
                    type: 'answer',
                    hasAnswer: true,
                    answer: card.dataset.value,
                    element: card
                };

                const redirectResult = await this.conditionalEngine.processConditions(questionId, trigger);
                
                if (redirectResult && redirectResult.shouldRedirect) {
                    // ✅ NUEVO: Marcar como completado antes de redirigir si es necesario
                    if (redirectResult.markAsCompleted) {
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
                    this.variables = { ...redirectResult.variables };
                    // ✅ NUEVO: Actualizar DOM con nuevos valores
                    this.updateVariablesInDOM();
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

        async handleMultipleChoice(e) {
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

            // Mostrar indicador de procesamiento
            this.showProcessingIndicator(questionContainer);

            try {
                // ✅ REFACTORIZADO: Usar motor unificado de lógica condicional
                const trigger = {
                    type: 'answer',
                    hasAnswer: true,
                    answer: selectedValues,
                    element: checkbox
                };

                const redirectResult = await this.conditionalEngine.processConditions(questionId, trigger);
                
                if (redirectResult && redirectResult.shouldRedirect) {
                    // ✅ NUEVO: Marcar como completado antes de redirigir si es necesario
                    if (redirectResult.markAsCompleted) {
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
                    this.variables = { ...redirectResult.variables };
                    // ✅ NUEVO: Actualizar DOM con nuevos valores
                    this.updateVariablesInDOM();
                }

            } catch (error) {
                console.error('Error processing conditions:', error);
                this.showError('Error al procesar las condiciones. Continuando...');
            } finally {
                // Ocultar indicador de procesamiento
                this.hideProcessingIndicator(questionContainer);
            }
        }

        async handleTextInput(e) {
            const input = e.target;
            const questionId = input.name.replace('question_', '');
            this.responses[questionId] = input.value;

            // ✅ SOLUCIÓN: Marcar que hay procesamiento pendiente
            this.hasPendingTextProcessing = true;
            this.pendingTextInput = { input, questionId };

            // ✅ AÑADIR: Procesar condiciones con debounce para evitar spam
            clearTimeout(this.textInputTimeout);
            this.textInputTimeout = setTimeout(async () => {
                await this.processTextInputConditions(input, questionId);
            }, 300); // Reducido de 500ms a 300ms para mejor responsividad
        }

        /**
         * ✅ NUEVO: Procesar condiciones de input de texto (extraído para reutilización)
         */
        async processTextInputConditions(input, questionId) {
            try {
                // ✅ REFACTORIZADO: Usar motor unificado de lógica condicional
                const trigger = {
                    type: 'answer',
                    hasAnswer: true,
                    answer: input.value,
                    element: input
                };

                const redirectResult = await this.conditionalEngine.processConditions(questionId, trigger);
                
                if (redirectResult && redirectResult.shouldRedirect) {
                    // ✅ NUEVO: Marcar como completado antes de redirigir si es necesario
                    if (redirectResult.markAsCompleted) {
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
                    this.variables = { ...redirectResult.variables };
                    // ✅ NUEVO: Actualizar DOM con nuevos valores
                    this.updateVariablesInDOM();
                }
                
            } catch (error) {
                console.error('Error processing conditions:', error);
                this.showError('Error al procesar las condiciones. Continuando...');
            } finally {
                // ✅ SOLUCIÓN: Marcar que el procesamiento ha terminado
                this.hasPendingTextProcessing = false;
                this.pendingTextInput = null;
            }
        }

        async handleRating(e) {
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

            // Mostrar indicador de procesamiento
            this.showProcessingIndicator(wrapper);

            try {
                // ✅ REFACTORIZADO: Usar motor unificado de lógica condicional
                const trigger = {
                    type: 'answer',
                    hasAnswer: true,
                    answer: value,
                    element: button
                };

                const redirectResult = await this.conditionalEngine.processConditions(questionId, trigger);
                
                if (redirectResult && redirectResult.shouldRedirect) {
                    // ✅ NUEVO: Marcar como completado antes de redirigir si es necesario
                    if (redirectResult.markAsCompleted) {
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
                    this.variables = { ...redirectResult.variables };
                    // ✅ NUEVO: Actualizar DOM con nuevos valores
                    this.updateVariablesInDOM();
                }

            } catch (error) {
                console.error('Error processing conditions:', error);
                this.showError('Error al procesar las condiciones. Continuando...');
            } finally {
                // Ocultar indicador de procesamiento
                this.hideProcessingIndicator(wrapper);
            }

            // Auto-avanzar si está configurado y no hay redirección
            if (this.settings.auto_advance) {
                setTimeout(() => this.nextQuestion(), 300);
            }
        }

        async handleImageChoice(e) {
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

            // Guardar respuesta - buscar valor en sfq-image-label
            const imageLabel = option.querySelector('.sfq-image-label');
            const responseValue = imageLabel ? imageLabel.textContent.trim() : (option.dataset.value || '');
            this.responses[questionId] = responseValue;

            // Mostrar indicador de procesamiento
            this.showProcessingIndicator(grid);

            try {
                // ✅ REFACTORIZADO: Usar motor unificado de lógica condicional
                const trigger = {
                    type: 'answer',
                    hasAnswer: true,
                    answer: responseValue,
                    element: option
                };

                const redirectResult = await this.conditionalEngine.processConditions(questionId, trigger);
                
                if (redirectResult && redirectResult.shouldRedirect) {
                    // ✅ NUEVO: Marcar como completado antes de redirigir si es necesario
                    if (redirectResult.markAsCompleted) {
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
                    this.variables = { ...redirectResult.variables };
                    // ✅ NUEVO: Actualizar DOM con nuevos valores
                    this.updateVariablesInDOM();
                }

            } catch (error) {
                console.error('Error processing conditions:', error);
                this.showError('Error al procesar las condiciones. Continuando...');
            } finally {
                // Ocultar indicador de procesamiento
                this.hideProcessingIndicator(grid);
            }

            // Auto-avanzar si está configurado y no hay redirección
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

        // Removed processConditionsImmediate, evaluateConditionsForRedirect, evaluateConditionImmediate, processConditionsOptimized, processConditionsNormalMode, processConditionsSecureMode
        // These functions are replaced by direct calls to this.conditionalEngine.processConditions() in event handlers.
        // The checkConditionsViaAjax is retained for server-side condition evaluation fallback, as the new engine does not have this built-in.
        // The elementShouldHaveConditions is also retained as it's used by checkConditionsViaAjax.

        /**
         * ✅ DELEGADO: Usar funciones del motor unificado
         */
        getComparisonValue(condition) {
            return this.conditionalEngine.getComparisonValue(condition);
        }

        /**
         * ✅ DELEGADO: Usar funciones del motor unificado
         */
        smartCompare(value1, value2, operator) {
            return this.conditionalEngine.smartCompare(value1, value2, operator);
        }

        /**
         * ✅ MEJORADO: Determinar si un elemento debería tener condiciones con detección más precisa
         * Retained for checkConditionsViaAjax fallback.
         */
        elementShouldHaveConditions(element) {
            // 1. Verificar atributo explícito data-has-conditions (más confiable)
            if (element.dataset.hasConditions === 'true') {
                return true;
            }
            
            if (element.dataset.hasConditions === 'false') {
                return false;
            }
            
            // 2. Verificar contenido del atributo data-conditions
            const conditions = element.dataset.conditions;
            if (conditions && conditions !== 'undefined' && conditions !== 'null' && conditions !== '[]') {
                try {
                    const parsed = JSON.parse(conditions);
                    return Array.isArray(parsed) && parsed.length > 0;
                } catch (e) {
                    return false;
                }
            }
            
            // 3. Heurística basada en el valor (como fallback)
            const value = element.dataset.value;
            if (value) {
                const conditionalPatterns = [
                    /^(sí|si|yes|y)$/i,
                    /^(no|n)$/i,
                    /^\d+$/,
                    /^opcion[_\s]*\d+$/i,
                ];
                
                return conditionalPatterns.some(pattern => pattern.test(value));
            }
            
            return false;
        }

        async checkConditionsViaAjax(questionId, answer) {
            const result = {
                shouldRedirect: false,
                redirectUrl: null,
                skipToQuestion: null,
                variables: {}
            };
            
            let retryCount = 0;
            const maxRetries = 2;
            
            while (retryCount <= maxRetries) {
                try {
                    
                    const formData = new FormData();
                    formData.append('action', 'sfq_get_next_question');
                    formData.append('nonce', this.getCurrentNonce());
                    formData.append('form_id', this.formId);
                    formData.append('current_question_id', questionId);
                    formData.append('answer', answer);
                    formData.append('variables', JSON.stringify(this.variables));

                    // ✅ MEJORADO: Headers anti-cache más agresivos para WP Cache
                    const response = await fetch(this.config.ajaxUrl, {
                        method: 'POST',
                        body: formData,
                        headers: {
                            'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
                            'Pragma': 'no-cache',
                            'Expires': '0',
                            'X-SFQ-Cache-Bypass': '1',
                            'X-SFQ-Timestamp': Date.now().toString()
                        }
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
                            return result;
                        }
                        
                        // ✅ CORREGIDO: Solo establecer skipToQuestion si hay navegación condicional real
                        if (ajaxResult.data.next_question_id && ajaxResult.data.has_conditional_navigation) {
                            result.skipToQuestion = ajaxResult.data.next_question_id;
                        } else if (ajaxResult.data.next_question_id && !ajaxResult.data.has_conditional_navigation) {
                        }
                        
                        // ✅ ÉXITO: Petición completada correctamente
                        return result;
                        
                    } else {
                        
                        // Verificar si es un error de nonce
                        if (ajaxResult && !ajaxResult.success && ajaxResult.data && 
                            (ajaxResult.data.includes && ajaxResult.data.includes('nonce') || 
                             ajaxResult.data.code === 'INVALID_NONCE')) {
                            
                            // Intentar refrescar nonce y reintentar
                            if (window.sfqCacheCompat && window.sfqCacheCompat.instance && retryCount < maxRetries) {
                                try {
                                    await window.sfqCacheCompat.instance.refreshNonce();
                                    
                                    retryCount++;
                                    continue; // Reintentar con nuevo nonce
                                } catch (nonceError) {
                                }
                            }
                        }
                        
                        // Si llegamos aquí, no pudimos recuperarnos del error
                        throw new Error('Server returned unsuccessful response');
                    }
                    
                } catch (error) {
                    
                    // Verificar si es un error de red o nonce
                    if ((error.message.includes('nonce') || error.message.includes('403') || error.message.includes('401')) && retryCount < maxRetries) {
                        
                        if (window.sfqCacheCompat && window.sfqCacheCompat.instance) {
                            try {
                                await window.sfqCacheCompat.instance.refreshNonce();
                                
                                retryCount++;
                                continue; // Reintentar una vez más
                            } catch (recoveryError) {
                            }
                        }
                    }
                    
                    // Si es el último intento o no es un error recuperable, salir del bucle
                    if (retryCount >= maxRetries) {
                        break;
                    }
                    
                    retryCount++;
                }
            }
            
            // ✅ NUEVO: Sistema de fallback cuando AJAX falla completamente
            return this.fallbackConditionalLogic(questionId, answer);
        }
        
        /**
         * ✅ CORREGIDO: Procesar condiciones para navegación sin duplicación
         * SOLO procesa condiciones basadas en variables globales (no duplicar condiciones de respuesta)
         */
        async processConditionsForNavigation(questionId) {
            
            try {
                // ✅ REFACTORIZADO: Usar motor unificado con trigger de navegación
                const currentResponseForQuestion = this.responses[questionId];

                const trigger = {
                    type: 'navigation',
                    hasAnswer: currentResponseForQuestion !== undefined,
                    answer: currentResponseForQuestion, // Pass the actual response object/value
                    element: null
                };

                const result = await this.conditionalEngine.processConditions(questionId, trigger);
                
                
                // Solo hacer AJAX si realmente no hay condiciones locales (redirección, salto o cambio de variables)
                // const hasLocalConditions = result.shouldRedirect || result.skipToQuestion || 
                //                           Object.keys(result.variables).length > Object.keys(this.variables).length;
                
                //  if (!hasLocalConditions) {
                 //        console.log('🔧 Navigation: No local navigation conditions, checking server');
                        
                //          try {
                 //             const ajaxResult = await this.checkConditionsViaAjax(questionId, null);
                            
                 //             if (ajaxResult && (ajaxResult.shouldRedirect || ajaxResult.skipToQuestion)) {
                  //                console.log('🔧 Navigation: Server returned navigation result', ajaxResult);
                  //               return ajaxResult;
                  //            }
                            
                            // Actualizar variables del servidor
                  //         if (ajaxResult && ajaxResult.variables) {
                   //              result.variables = { ...ajaxResult.variables };
                   //           }
                   //       } catch (error) {
                    //         console.error('🔧 Navigation: Server check failed', error);
                    //      }
                // }
                
                return result;
                
            } catch (error) {
                console.error('🔧 Navigation: Error processing navigation conditions', error);
                return {
                    shouldRedirect: false,
                    redirectUrl: null,
                    skipToQuestion: null,
                    variables: { ...this.variables }
                };
            }
        }

        /**
         * ✅ NUEVO: Encontrar el elemento DOM que corresponde a una respuesta específica
         */
        findElementForAnswer(questionContainer, answer) {
            // Buscar por valor exacto en elementos con data-value
            let element = questionContainer.querySelector(`[data-value="${answer}"]`);
            if (element) return element;
            
            // Para respuestas múltiples, buscar cualquier elemento que contenga el valor
            if (Array.isArray(answer)) {
                for (const value of answer) {
                    element = questionContainer.querySelector(`[data-value="${value}"]`);
                    if (element) return element;
                }
            }
            
            // Para inputs de texto, buscar el input que tenga ese valor
            const textInputs = questionContainer.querySelectorAll('input[type="text"], input[type="email"], textarea');
            for (const input of textInputs) {
                if (input.value === answer) return input;
            }
            
            // Para elementos freestyle, buscar por ID del elemento
            const freestyleElements = questionContainer.querySelectorAll('[id^="element_"]');
            for (const el of freestyleElements) {
                if (el.value === answer || el.textContent === answer) return el;
            }
            
            return null;
        }

        /**
         * ✅ NUEVO: Sistema de fallback para lógica condicional cuando AJAX falla
         */
        fallbackConditionalLogic(questionId, answer) {
            console.log('SFQ Fallback: Executing fallback conditional logic for question:', questionId);
            
            const result = {
                shouldRedirect: false,
                redirectUrl: null,
                skipToQuestion: null,
                variables: { ...this.variables } // Mantener variables actuales
            };
            
            try {
                // ✅ ESTRATEGIA 1: Aplicar lógica condicional básica basada en patrones comunes
                const fallbackResult = this.applyBasicConditionalPatterns(questionId, answer);
                if (fallbackResult.shouldRedirect || fallbackResult.skipToQuestion) {
                    console.log('SFQ Fallback: Basic patterns matched:', fallbackResult);
                    return fallbackResult;
                }
                
                // ✅ ESTRATEGIA 2: Continuar con navegación secuencial normal
                
                // Mostrar notificación discreta al usuario sobre el modo fallback
                this.showFallbackNotification();
                
                return result;
                
            } catch (error) {
                console.error('SFQ Fallback: Error in fallback logic:', error);
                
                // En caso de error total, continuar secuencialmente
                return result;
            }
        }
        
        /**
         * ✅ NUEVO: Aplicar patrones condicionales básicos comunes
         */
        applyBasicConditionalPatterns(questionId, answer) {
            const result = {
                shouldRedirect: false,
                redirectUrl: null,
                skipToQuestion: null,
                variables: { ...this.variables }
            };
            
            // Patrones comunes de respuestas que suelen tener lógica condicional
            const commonPatterns = [
                // Patrón 1: Respuestas de "Sí/No" que suelen saltar preguntas
                {
                    pattern: /^(sí|si|yes|y)$/i,
                    action: 'continue', // Continuar normalmente
                    variableUpdate: { 'positive_responses': 1 }
                },
                {
                    pattern: /^(no|n)$/i,
                    action: 'skip_ahead', // Saltar algunas preguntas
                    variableUpdate: { 'negative_responses': 1 }
                },
                
                // Patrón 2: Respuestas numéricas que suelen acumular puntos
                {
                    pattern: /^\d+$/,
                    action: 'add_score',
                    variableUpdate: function(answer) {
                        const score = parseInt(answer) || 0;
                        return { 'total_score': score };
                    }
                },
                
                // Patrón 3: Respuestas que indican finalización temprana
                {
                    pattern: /^(salir|exit|quit|terminar|finalizar)$/i,
                    action: 'end_form'
                }
            ];
            
            for (const pattern of commonPatterns) {
                if (pattern.pattern.test(answer)) {
                    console.log('SFQ Fallback: Matched pattern:', pattern.pattern, 'for answer:', answer);
                    
                    // Aplicar actualización de variables
                    if (pattern.variableUpdate) {
                        if (typeof pattern.variableUpdate === 'function') {
                            const updates = pattern.variableUpdate(answer);
                            Object.keys(updates).forEach(key => {
                                const currentValue = result.variables[key] || 0;
                                result.variables[key] = currentValue + updates[key];
                            });
                        } else {
                            Object.keys(pattern.variableUpdate).forEach(key => {
                                const currentValue = result.variables[key] || 0;
                                result.variables[key] = currentValue + pattern.variableUpdate[key];
                            });
                        }
                    }
                    
                    // Aplicar acción
                    switch (pattern.action) {
                        case 'skip_ahead':
                            // Intentar saltar 2-3 preguntas hacia adelante
                            const currentIndex = this.currentQuestionIndex;
                            const targetIndex = currentIndex + 2;
                            const allQuestions = this.container.querySelectorAll('.sfq-question-screen');
                            
                            if (targetIndex < allQuestions.length) {
                                const targetQuestion = allQuestions[targetIndex];
                                if (targetQuestion) {
                                    result.skipToQuestion = targetQuestion.dataset.questionId;
                                    console.log('SFQ Fallback: Skipping ahead to question:', result.skipToQuestion);
                                }
                            }
                            break;
                            
                        case 'end_form':
                            result.skipToQuestion = 'end';
                            console.log('SFQ Fallback: Ending form early');
                            break;
                            
                        case 'continue':
                        case 'add_score':
                        default:
                            // Continuar normalmente, solo aplicar variables
                            break;
                    }
                    
                    break; // Solo aplicar el primer patrón que coincida
                }
            }
            
            return result;
        }
        
        /**
         * ✅ NUEVO: Mostrar notificación discreta sobre modo fallback
         */
        showFallbackNotification() {
            // Solo mostrar una vez por sesión
            if (this.fallbackNotificationShown) {
                return;
            }
            
            this.fallbackNotificationShown = true;
            
            const notification = document.createElement('div');
            notification.className = 'sfq-fallback-notification';
            notification.innerHTML = `
                <div class="sfq-fallback-content">
                    <span class="sfq-fallback-icon">⚡</span>
                    <div class="sfq-fallback-text">
                        <small>Modo de compatibilidad activado</small>
                    </div>
                </div>
            `;
            
            this.container.appendChild(notification);
            
            // Auto-ocultar después de 3 segundos
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.style.opacity = '0';
                    setTimeout(() => {
                        notification.remove();
                    }, 300);
                }
            }, 3000);
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

        async nextQuestion() {
            const currentQuestion = this.currentScreen;
            if (!currentQuestion) return;

            // ✅ SOLUCIÓN DEFINITIVA: Procesar INMEDIATAMENTE cualquier texto escrito
            const questionId = currentQuestion.dataset.questionId;
            const textInputs = currentQuestion.querySelectorAll('.sfq-text-input, .sfq-freestyle-input, .sfq-freestyle-textarea');
            
            
            // BLOQUEAR completamente hasta procesar TODOS los inputs de texto
            for (const input of textInputs) {
                const inputValue = input.value ? input.value.trim() : '';
                
                if (inputValue !== '') {
                    console.log('🔧 FOUND TEXT TO PROCESS:', inputValue);
                    
                    // Mostrar indicador visual de que estamos procesando
                    this.showProcessingIndicator(currentQuestion);
                    
                    // Cancelar TODOS los timeouts pendientes
                    clearTimeout(this.textInputTimeout);
                    clearTimeout(this.freestyleInputTimeout);
                    
                    // Procesar INMEDIATAMENTE y ESPERAR el resultado completo
                    try {
                        
                        const trigger = {
                            type: 'answer',
                            hasAnswer: true,
                            answer: inputValue,
                            element: input
                        };

                        // ESPERAR hasta que se complete el procesamiento
                        const redirectResult = await this.conditionalEngine.processConditions(questionId, trigger);
                        
                        console.log('🔧 PROCESSING RESULT:', redirectResult);
                        
                        // Si hay redirección, ejecutarla INMEDIATAMENTE
                        if (redirectResult && redirectResult.shouldRedirect) {
                            console.log('🔧 REDIRECTING TO:', redirectResult.redirectUrl);
                            
                            if (redirectResult.markAsCompleted) {
                                this.showRedirectProcessingIndicator();
                                try {
                                    await this.markFormAsCompleted();
                                    setTimeout(() => {
                                        window.location.href = redirectResult.redirectUrl;
                                    }, 1500);
                                } catch (error) {
                                    window.location.href = redirectResult.redirectUrl;
                                }
                            } else {
                                window.location.href = redirectResult.redirectUrl;
                            }
                            return; // SALIR INMEDIATAMENTE
                        }

                        // Si hay salto de pregunta, configurarlo
                        if (redirectResult && redirectResult.skipToQuestion) {
                            console.log('🔧 SKIPPING TO QUESTION:', redirectResult.skipToQuestion);
                            this.skipToQuestion = redirectResult.skipToQuestion;
                        }

                        // Actualizar variables
                        if (redirectResult && redirectResult.variables) {
                            console.log('🔧 UPDATING VARIABLES:', redirectResult.variables);
                            this.variables = { ...redirectResult.variables };
                            this.updateVariablesInDOM();
                        }
                        
                    } catch (error) {
                        console.error('🔧 ERROR PROCESSING TEXT CONDITIONS:', error);
                    } finally {
                        // Ocultar indicador de procesamiento
                        this.hideProcessingIndicator(currentQuestion);
                    }
                }
            }
            

            // Validar respuesta requerida
            if (!this.validateCurrentQuestion()) {
                this.showError('Por favor, responde a esta pregunta antes de continuar.');
                return;
            }

            // ✅ NUEVO: Verificar si la pregunta actual tiene bloqueo activado
            if (this.isQuestionBlocked(currentQuestion)) {
              
                this.showBlockedMessage(currentQuestion);
                return;
            }

            // ✅ CORREGIDO: SOLO procesar condiciones si NO hay respuesta específica
            // Si hay respuesta, las condiciones ya se procesaron en handleSingleChoice/handleMultipleChoice/etc.
            const hasCurrentAnswer = this.responses[questionId] !== undefined;
            
           
            // ✅ SOLUCIÓN: Solo procesar condiciones de navegación si NO hay respuesta específica
            // Esto evita duplicar el procesamiento que ya se hizo en los handlers de respuesta
            if (!hasCurrentAnswer) {

                
                try {
                    // Mostrar indicador de procesamiento
                    this.showProcessingIndicator(currentQuestion);
                    
                    const redirectResult = await this.processConditionsForNavigation(questionId);
                    
                  
                    
                    if (redirectResult && redirectResult.shouldRedirect) {
                        // ✅ NUEVO: Marcar como completado antes de redirigir si es necesario
                        if (redirectResult.markAsCompleted) {
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
                        this.variables = { ...redirectResult.variables };
                       
                        // ✅ NUEVO: Actualizar DOM con nuevos valores
                        this.updateVariablesInDOM();
                    }
                    
                } catch (error) {
                   
                    this.showError('Error al procesar las condiciones. Continuando...');
                } finally {
                    // Ocultar indicador de procesamiento
                    this.hideProcessingIndicator(currentQuestion);
                }
            } else {
              
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

            // ✅ NUEVO: Verificar si estamos en modo seguro
            const secureLoading = this.container.dataset.secureLoading === 'true';
            

            let nextQuestion = null;

            // ✅ CORREGIDO: Lógica de navegación mejorada con debug adicional
            
            if (this.skipToQuestion) {
                // Navegación condicional - puede ir a cualquier pregunta, incluyendo pantallas finales
                if (secureLoading) {
                    // En modo seguro, cargar pregunta dinámicamente
                   
                    await this.loadQuestionSecurely(this.skipToQuestion);
                    this.skipToQuestion = null;
                    return;
                } else {
                    // En modo normal, buscar en DOM
                    nextQuestion = this.container.querySelector(`[data-question-id="${this.skipToQuestion}"]`);
                   
                    this.skipToQuestion = null;
                }
            } else {
                // Navegación secuencial
                if (secureLoading) {
                    // En modo seguro, cargar siguiente pregunta vía AJAX
                    await this.loadNextQuestionSecurely();
                    return;
                } else {
                    // En modo normal, buscar siguiente pregunta en DOM
                    nextQuestion = this.getNextNonFinalQuestion(currentQuestion);
                }
            }

            // Solo para modo normal: verificar si hay más preguntas
            if (!secureLoading) {
                if (!nextQuestion || !nextQuestion.classList.contains('sfq-question-screen')) {
                 
                    this.submitForm();
                    return;
                }

                // Verificar si la pregunta encontrada es una pantalla final (solo para debug)
                if (this.isQuestionPantallaFinal(nextQuestion)) {
                   
                }

                // Cambiar a siguiente pregunta
                this.showScreen(nextQuestion);
                this.currentQuestionIndex++;
                this.updateProgress();
                this.questionStartTime = Date.now();
            }
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

            // ✅ NUEVO: Verificar si la pregunta tiene bloqueo activado
            const isBlocked = this.isQuestionBlocked(screen);
            if (isBlocked) {
              
                nextButton.style.display = 'none';
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
                
                nextButton.textContent = isLastQuestion ? 'Siguiente' : 'Siguiente';
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

            // Hacer clickeable el área de subida de archivos
            this.container.querySelectorAll('.sfq-file-upload-area').forEach(uploadArea => {
                const fileInput = uploadArea.querySelector('.sfq-file-input');
                if (fileInput) {
                    // Click en el área para abrir selector de archivos
                    uploadArea.addEventListener('click', (e) => {
                        // Solo si no se hizo click en el input directamente
                        if (e.target !== fileInput) {
                            e.preventDefault();
                            fileInput.click();
                        }
                    });

                    // Drag & Drop functionality
                    uploadArea.addEventListener('dragover', (e) => {
                        e.preventDefault();
                        uploadArea.classList.add('drag-over');
                    });

                    uploadArea.addEventListener('dragleave', (e) => {
                        e.preventDefault();
                        uploadArea.classList.remove('drag-over');
                    });

                    uploadArea.addEventListener('drop', (e) => {
                        e.preventDefault();
                        uploadArea.classList.remove('drag-over');
                        
                        const files = e.dataTransfer.files;
                        if (files.length > 0) {
                            // Asignar archivos al input y disparar evento change
                            fileInput.files = files;
                            const changeEvent = new Event('change', { bubbles: true });
                            fileInput.dispatchEvent(changeEvent);
                        }
                    });
                }
            });

            // Inicializar countdowns freestyle
            this.initializeFreestyleCountdowns();
        }

        /**
         * Manejar input de texto freestyle
         */
        async handleFreestyleInput(e) {
            const input = e.target;
            const elementId = input.id.replace('element_', '');
            const questionContainer = input.closest('.sfq-freestyle-container');
            const questionId = questionContainer.dataset.questionId;

        
            // Inicializar respuesta freestyle si no existe
            if (!this.responses[questionId]) {
                this.responses[questionId] = {};
            }

            this.responses[questionId][elementId] = input.value;

            // ✅ SOLUCIÓN: Procesar condiciones usando el elemento real en lugar de temporal
            clearTimeout(this.freestyleInputTimeout);
            this.freestyleInputTimeout = setTimeout(async () => {
                try {
                    // Mostrar indicador de procesamiento
                    const questionScreen = input.closest('.sfq-question-screen');
                    if (questionScreen) {
                        this.showProcessingIndicator(questionScreen);
                    }

                   
                    // ✅ REFACTORIZADO: Usar motor unificado de lógica condicional directamente
                    const trigger = {
                        type: 'answer',
                        hasAnswer: true,
                        answer: input.value,
                        element: input // Pass the actual input element
                    };

                    const redirectResult = await this.conditionalEngine.processConditions(questionId, trigger);
                    
                    if (redirectResult && redirectResult.shouldRedirect) {
                        // ✅ NUEVO: Marcar como completado antes de redirigir si es necesario
                        if (redirectResult.markAsCompleted) {
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

                    // If there's a question skip, configure it
                    if (redirectResult && redirectResult.skipToQuestion) {
                        this.skipToQuestion = redirectResult.skipToQuestion;
                    }

                    // ✅ CRÍTICO: Update variables if any
                    if (redirectResult && redirectResult.variables) {
                        this.variables = { ...redirectResult.variables };
                        // ✅ NUEVO: Update DOM with new values
                        this.updateVariablesInDOM();
                    }
                    
                } catch (error) {
                    console.error('Error processing conditions in freestyle input:', error);
                    this.showError('Error al procesar las condiciones. Continuando...');
                } finally {
                    // Hide processing indicator
                    const questionScreen = input.closest('.sfq-question-screen');
                    if (questionScreen) {
                        this.hideProcessingIndicator(questionScreen);
                    }
                }
            }, 500); // Wait 500ms after the user stops typing
        }

        /**
         * Manejar select freestyle
         */
        async handleFreestyleSelect(e) {
            const select = e.target;
            const elementId = select.id.replace('element_', '');
            const questionContainer = select.closest('.sfq-freestyle-container');
            const questionId = questionContainer.dataset.questionId;

            // Inicializar respuesta freestyle si no existe
            if (!this.responses[questionId]) {
                this.responses[questionId] = {};
            }

            this.responses[questionId][elementId] = select.value;

            // Mostrar indicador de procesamiento
            const questionScreen = select.closest('.sfq-question-screen');
            if (questionScreen) {
                this.showProcessingIndicator(questionScreen);
            }

            try {
                // ✅ REFACTORIZADO: Usar motor unificado de lógica condicional
                const trigger = {
                    type: 'answer',
                    hasAnswer: true,
                    answer: select.value,
                    element: select
                };

                const redirectResult = await this.conditionalEngine.processConditions(questionId, trigger);
                
                if (redirectResult && redirectResult.shouldRedirect) {
                    // ✅ NUEVO: Marcar como completado antes de redirigir si es necesario
                    if (redirectResult.markAsCompleted) {
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
                    this.variables = { ...redirectResult.variables };
                    // ✅ NUEVO: Actualizar DOM con nuevos valores
                    this.updateVariablesInDOM();
                }
                
            } catch (error) {
                console.error('Error processing conditions:', error);
                this.showError('Error al procesar las condiciones. Continuando...');
            } finally {
                // Ocultar indicador de procesamiento
                if (questionScreen) {
                    this.hideProcessingIndicator(questionScreen);
                }
            }
        }

        /**
         * Manejar checkbox freestyle
         */
        async handleFreestyleCheckbox(e) {
            const checkbox = e.target;
            const elementId = checkbox.id.replace('element_', '');
            const questionContainer = checkbox.closest('.sfq-freestyle-container');
            const questionId = questionContainer.dataset.questionId;

            // Inicializar respuesta freestyle si no existe
            if (!this.responses[questionId]) {
                this.responses[questionId] = {};
            }

            this.responses[questionId][elementId] = checkbox.checked ? checkbox.value : '';

            // Mostrar indicador de procesamiento
            const questionScreen = checkbox.closest('.sfq-question-screen');
            if (questionScreen) {
                this.showProcessingIndicator(questionScreen);
            }

            try {
                // ✅ REFACTORIZADO: Usar motor unificado de lógica condicional
                const trigger = {
                    type: 'answer',
                    hasAnswer: true,
                    answer: checkbox.checked ? checkbox.value : '',
                    element: checkbox
                };

                const redirectResult = await this.conditionalEngine.processConditions(questionId, trigger);
                
                if (redirectResult && redirectResult.shouldRedirect) {
                    // ✅ NUEVO: Marcar como completado antes de redirigir si es necesario
                    if (redirectResult.markAsCompleted) {
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
                    this.variables = { ...redirectResult.variables };
                    // ✅ NUEVO: Actualizar DOM con nuevos valores
                    this.updateVariablesInDOM();
                }
                
            } catch (error) {
                console.error('Error processing conditions:', error);
                this.showError('Error al procesar las condiciones. Continuando...');
            } finally {
                // Ocultar indicador de procesamiento
                if (questionScreen) {
                    this.hideProcessingIndicator(questionScreen);
                }
            }
        }

        /**
         * Manejar rating freestyle
         */
        async handleFreestyleRating(e) {
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

            // Mostrar indicador de procesamiento
            const questionScreen = wrapper.closest('.sfq-question-screen');
            if (questionScreen) {
                this.showProcessingIndicator(questionScreen);
            }

            try {
                // ✅ REFACTORIZADO: Usar motor unificado de lógica condicional
                const trigger = {
                    type: 'answer',
                    hasAnswer: true,
                    answer: value,
                    element: button
                };

                const redirectResult = await this.conditionalEngine.processConditions(questionId, trigger);
                
                if (redirectResult && redirectResult.shouldRedirect) {
                    // ✅ NUEVO: Marcar como completado antes de redirigir si es necesario
                    if (redirectResult.markAsCompleted) {
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
                    this.variables = { ...redirectResult.variables };
                    // ✅ NUEVO: Actualizar DOM con nuevos valores
                    this.updateVariablesInDOM();
                }
                
            } catch (error) {
                console.error('Error processing conditions:', error);
                this.showError('Error al procesar las condiciones. Continuando...');
            } finally {
                // Ocultar indicador de procesamiento
                if (questionScreen) {
                    this.hideProcessingIndicator(questionScreen);
                }
            }
        }

        /**
         * Manejar click en botón freestyle
         */
        async handleFreestyleButton(e) {
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

            // Mostrar indicador de procesamiento
            const questionScreen = button.closest('.sfq-question-screen');
            if (questionScreen) {
                this.showProcessingIndicator(questionScreen);
            }

            try {
                // ✅ REFACTORIZADO: Usar motor unificado de lógica condicional
                const trigger = {
                    type: 'answer',
                    hasAnswer: true,
                    answer: 'clicked',
                    element: button
                };

                const redirectResult = await this.conditionalEngine.processConditions(questionId, trigger);
                
                if (redirectResult && redirectResult.shouldRedirect) {
                    // ✅ NUEVO: Marcar como completado antes de redirigir si es necesario
                    if (redirectResult.markAsCompleted) {
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
                    this.variables = { ...redirectResult.variables };
                    // ✅ NUEVO: Actualizar DOM con nuevos valores
                    this.updateVariablesInDOM();
                }
                
            } catch (error) {
                console.error('Error processing conditions:', error);
                this.showError('Error al procesar las condiciones. Continuando...');
            } finally {
                // Ocultar indicador de procesamiento
                if (questionScreen) {
                    this.hideProcessingIndicator(questionScreen);
                }
            }

            // ✅ NUEVO: Guardar el clic inmediatamente en el servidor
            try {
                await this.saveButtonClickImmediately(questionId, elementId, button);
            } catch (error) {
                console.error('SFQ: Error saving button click:', error);
                // Continuar con el comportamiento normal aunque falle el guardado
            }

            // Si es un botón con URL, el navegador manejará la navegación automáticamente
        }

        /**
         * Manejar click en imagen freestyle
         */
        async handleFreestyleImageClick(e) { // Made async
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

            // Mostrar indicador de procesamiento
            const questionScreen = imageContainer.closest('.sfq-question-screen');
            if (questionScreen) {
                this.showProcessingIndicator(questionScreen);
            }

            try {
                // ✅ REFACTORIZADO: Usar motor unificado de lógica condicional
                const trigger = {
                    type: 'answer',
                    hasAnswer: true,
                    answer: 'clicked',
                    element: imageContainer // Pass the actual image container element
                };

                const redirectResult = await this.conditionalEngine.processConditions(questionId, trigger);
                
                if (redirectResult && redirectResult.shouldRedirect) {
                    if (redirectResult.markAsCompleted) {
                        this.showRedirectProcessingIndicator();
                        try {
                            await this.markFormAsCompleted();
                            setTimeout(() => {
                                window.location.href = redirectResult.redirectUrl;
                            }, 1500);
                        } catch (error) {
                            console.error('SFQ: Error marking form as completed before redirect:', error);
                            window.location.href = redirectResult.redirectUrl;
                        }
                    } else {
                        window.location.href = redirectResult.redirectUrl;
                    }
                    return;
                }

                if (redirectResult && redirectResult.skipToQuestion) {
                    this.skipToQuestion = redirectResult.skipToQuestion;
                }

                if (redirectResult && redirectResult.variables) {
                    this.variables = { ...redirectResult.variables };
                    this.updateVariablesInDOM();
                }
                
            } catch (error) {
                console.error('Error processing conditions in freestyle image click:', error);
                this.showError('Error al procesar las condiciones. Continuando...');
            } finally {
                if (questionScreen) {
                    this.hideProcessingIndicator(questionScreen);
                }
            }

            // Añadir efecto visual
            imageContainer.style.transform = 'scale(0.95)';
            setTimeout(() => {
                imageContainer.style.transform = 'scale(1)';
            }, 150);
        }

        /**
         * Manejar subida de archivos freestyle
         */
        async handleFreestyleFileUpload(e) { // Made async
            const input = e.target;
            const elementId = input.id.replace('element_', '');
            const questionContainer = input.closest('.sfq-freestyle-container');
            const questionId = questionContainer.dataset.questionId;
            const uploadArea = input.closest('.sfq-file-upload-area');
            const preview = uploadArea.querySelector('.sfq-file-preview');

            console.log('SFQ File Upload: Starting file upload process');
            console.log('SFQ File Upload: Element ID:', elementId);
            console.log('SFQ File Upload: Question ID:', questionId);
            console.log('SFQ File Upload: Files selected:', input.files ? input.files.length : 0);

            // Inicializar respuesta freestyle si no existe
            if (!this.responses[questionId]) {
                this.responses[questionId] = {};
            }

            // Limpiar errores previos
            this.hideFileErrors(uploadArea);

            if (input.files && input.files.length > 0) {
                console.log('SFQ File Upload: Processing', input.files.length, 'files');
                
                // Validar archivos antes de procesarlos
                const validFiles = this.validateFiles(input.files, uploadArea);
                
                if (validFiles.length > 0) {
                    console.log('SFQ File Upload: Valid files found:', validFiles.length);
                    // Subir archivos al servidor
                    await this.uploadFiles(validFiles, elementId, questionId, uploadArea, preview); // Await uploadFiles
                } else {
                    console.log('SFQ File Upload: No valid files found');
                    // Limpiar input si no hay archivos válidos
                    input.value = '';
                    this.responses[questionId][elementId] = [];
                    if (preview) {
                        preview.style.display = 'none';
                    }
                }
            } else {
                console.log('SFQ File Upload: No files selected');
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
         * Validar archivos según configuración del elemento
         */
        validateFiles(files, uploadArea) {
            const elementConfig = this.getElementConfig(uploadArea);
            const validFiles = [];
            const errors = [];

            Array.from(files).forEach(file => {
                // Validar tipo de archivo
                if (!this.isValidFileType(file, elementConfig.accept)) {
                    errors.push(`${file.name}: Tipo de archivo no permitido`);
                    return;
                }

                // Validar tamaño
                if (!this.isValidFileSize(file, elementConfig.max_size)) {
                    errors.push(`${file.name}: Archivo demasiado grande (máximo ${elementConfig.max_size})`);
                    return;
                }

                validFiles.push(file);
            });

            // Mostrar errores si los hay
            if (errors.length > 0) {
                this.showFileErrors(uploadArea, errors);
            } else {
                this.hideFileErrors(uploadArea);
            }

            return validFiles;
        }

        /**
         * Obtener configuración del elemento de subida
         */
        getElementConfig(uploadArea) {
            const input = uploadArea.querySelector('.sfq-file-input');
            return {
                accept: input.getAttribute('accept') || 'image/*',
                max_size: uploadArea.dataset.maxSize || '5MB',
                multiple: input.hasAttribute('multiple')
            };
        }

        /**
         * Validar tipo de archivo
         */
        isValidFileType(file, acceptAttribute) {
            if (acceptAttribute === '*') return true;

            const acceptedTypes = acceptAttribute.split(',').map(type => type.trim());
            
            for (const acceptedType of acceptedTypes) {
                if (acceptedType.startsWith('.')) {
                    // Extensión específica
                    const extension = '.' + file.name.split('.').pop().toLowerCase();
                    if (extension === acceptedType.toLowerCase()) {
                        return true;
                    }
                } else if (acceptedType.includes('/*')) {
                    // Tipo MIME genérico (ej: image/*)
                    const baseType = acceptedType.split('/')[0];
                    if (file.type.startsWith(baseType + '/')) {
                        return true;
                    }
                } else if (file.type === acceptedType) {
                    // Tipo MIME específico
                    return true;
                }
            }

            return false;
        }

        /**
         * Validar tamaño de archivo
         */
        isValidFileSize(file, maxSizeStr) {
            const maxBytes = this.parseFileSize(maxSizeStr);
            return file.size <= maxBytes;
        }

        /**
         * Convertir string de tamaño a bytes
         */
        parseFileSize(sizeStr) {
            const units = {
                'B': 1,
                'KB': 1024,
                'MB': 1024 * 1024,
                'GB': 1024 * 1024 * 1024
            };

            const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)$/i);
            if (!match) return 5 * 1024 * 1024; // Default 5MB

            const size = parseFloat(match[1]);
            const unit = match[2].toUpperCase();
            return size * (units[unit] || 1);
        }

        /**
         * Subir archivos al servidor
         */
        async uploadFiles(files, elementId, questionId, uploadArea, preview) {
            console.log('SFQ File Upload: Starting upload process for', files.length, 'files');
            
            // Mostrar indicador de carga
            this.showUploadProgress(uploadArea, true);
            
            const uploadedFiles = [];
            
            try {
                // Subir archivos uno por uno (el servidor espera un archivo por petición)
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    console.log('SFQ File Upload: Uploading file', i + 1, 'of', files.length, ':', file.name);
                    
                    const formData = new FormData();
                    formData.append('action', 'sfq_upload_file');
                    formData.append('nonce', sfq_ajax.nonce);
                    formData.append('form_id', this.formId);
                    formData.append('element_id', elementId);
                    formData.append('file', file); // El servidor espera 'file', no 'files[0]'

                    const response = await fetch(sfq_ajax.ajax_url, {
                        method: 'POST',
                        body: formData
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const result = await response.json();
                    console.log('SFQ File Upload: Server response for', file.name, ':', result);

                    if (result.success && result.data && result.data.file) {
                        uploadedFiles.push(result.data.file);
                        console.log('SFQ File Upload: File uploaded successfully:', result.data.file);
                    } else {
                        const errorMessage = result.data?.message || 'Error al subir archivo';
                        console.error('SFQ File Upload: Upload failed for', file.name, ':', errorMessage);
                        throw new Error(`${file.name}: ${errorMessage}`);
                    }
                }

                // Guardar información de archivos subidos
                this.responses[questionId][elementId] = uploadedFiles;
                
                // Mostrar preview de archivos subidos
                this.showUploadedFiles(preview, uploadedFiles);
                
                console.log('SFQ File Upload: All files uploaded successfully:', uploadedFiles);
                
            } catch (error) {
                console.error('SFQ File Upload: Upload error:', error);
                this.showFileErrors(uploadArea, [error.message]);
                
                // Limpiar respuestas en caso de error
                this.responses[questionId][elementId] = [];
            } finally {
                this.showUploadProgress(uploadArea, false);
            }
        }

        /**
         * Mostrar archivos subidos en el preview
         */
        showUploadedFiles(preview, files) {
            if (!preview) return;

            preview.innerHTML = '';
            preview.style.display = 'block';

            files.forEach(file => {
                const fileItem = document.createElement('div');
                fileItem.className = 'sfq-file-item';
                
                // Usar el nombre correcto del archivo (filename o original_name)
                const fileName = file.filename || file.original_name || file.name || 'Archivo';
                const fileSize = file.size || 0;
                const fileUrl = file.url || '';
                const fileType = file.type || '';
                
                // Mostrar preview de imagen si es una imagen
                if (file.is_image || (fileType && fileType.startsWith('image/'))) {
                    // Usar thumbnail_url si está disponible, sino usar url principal
                    const imageUrl = file.thumbnail_url || fileUrl;
                    
                    fileItem.innerHTML = `
                        <div class="sfq-file-image-preview">
                            <img src="${imageUrl}" alt="${fileName}" loading="lazy">
                        </div>
                        <div class="sfq-file-info">
                            <span class="sfq-file-name">${fileName}</span>
                            <span class="sfq-file-size">(${this.formatFileSize(fileSize)})</span>
                        </div>
                    `;
                } else {
                    // Para archivos no imagen, mostrar icono genérico
                    fileItem.innerHTML = `
                        <span class="sfq-file-name">📎 ${fileName}</span>
                        <span class="sfq-file-size">(${this.formatFileSize(fileSize)})</span>
                    `;
                }
                
                preview.appendChild(fileItem);
            });
        }

        /**
         * Mostrar/ocultar indicador de progreso de subida
         */
        showUploadProgress(uploadArea, show) {
            let progressIndicator = uploadArea.querySelector('.sfq-upload-progress');
            
            if (show) {
                if (!progressIndicator) {
                    progressIndicator = document.createElement('div');
                    progressIndicator.className = 'sfq-upload-progress';
                    progressIndicator.innerHTML = `
                        <div class="sfq-upload-spinner"></div>
                        <span>Subiendo archivos...</span>
                    `;
                    uploadArea.appendChild(progressIndicator);
                }
                progressIndicator.style.display = 'flex';
                uploadArea.classList.add('uploading');
            } else {
                if (progressIndicator) {
                    progressIndicator.style.display = 'none';
                }
                uploadArea.classList.remove('uploading');
            }
        }

        /**
         * Mostrar errores de archivo
         */
        showFileErrors(uploadArea, errors) {
            let errorContainer = uploadArea.querySelector('.sfq-file-errors');
            
            if (!errorContainer) {
                errorContainer = document.createElement('div');
                errorContainer.className = 'sfq-file-errors';
                uploadArea.appendChild(errorContainer);
            }

            errorContainer.innerHTML = errors.map(error => 
                `<div class="sfq-file-error">⚠️ ${error}</div>`
            ).join('');
            
            errorContainer.style.display = 'block';

            // Auto-ocultar después de 5 segundos
            setTimeout(() => {
                this.hideFileErrors(uploadArea);
            }, 5000);
        }

        /**
         * Ocultar errores de archivo
         */
        hideFileErrors(uploadArea) {
            const errorContainer = uploadArea.querySelector('.sfq-file-errors');
            if (errorContainer) {
                errorContainer.style.display = 'none';
            }
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
                  
                    
                    // ✅ NUEVO: Verificar si el servidor indica que debe disparar webhook
                    const shouldTriggerWebhook = result.data && result.data.trigger_webhook;
                    const submissionId = result.data && result.data.submission_id;
                    
                    if (shouldTriggerWebhook && submissionId) {
                      
                        
                        // Mostrar pantalla de éxito PRIMERO
                        this.showThankYouScreen();
                        
                        // Disparar webhook DESPUÉS de mostrar éxito (con pequeño delay)
                        setTimeout(() => {
                            this.triggerWebhookPostSuccess(submissionId);
                        }, 500); // 500ms delay para que el usuario vea el éxito primero
                        
                        // Manejar redirecciones después del webhook
                        this.handlePostWebhookRedirection(result.data);
                        return;
                    }
                    
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
                <span class="sfq-processing-text"></span>
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
     * ✅ NUEVO: Mostrar indicador de procesamiento elegante para redirección
     */
    showRedirectProcessingIndicator() {
        // Remover indicador existente si lo hay
        this.hideRedirectProcessingIndicator();
        
        // Obtener configuración de colores del formulario
        const indicatorBgColor = this.settings.redirect_indicator_bg_color || '#ffffff';
        const indicatorTextColor = this.settings.redirect_indicator_text_color || '#666666';
        const indicatorSpinnerColor = this.settings.redirect_indicator_spinner_color || '#007cba';
        const indicatorOpacity = this.settings.redirect_indicator_opacity || '0.95';
        const indicatorText = this.settings.redirect_indicator_text || '';
        
        // Crear overlay elegante
        const indicator = document.createElement('div');
        indicator.className = 'sfq-redirect-processing-overlay';
        
        // Contenido del indicador
        const content = `
            <div class="sfq-redirect-processing-spinner"></div>
            <p class="sfq-redirect-processing-text">${indicatorText}</p>
        `;
        
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
            
            // ✅ CRÍTICO: Verificar PRIMERO si el formulario ya está completado
            const isCompleted = await this.checkIfFormCompleted();
            
            if (isCompleted) {
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
            
            // ✅ CRÍTICO: Verificar PRIMERO si el formulario ya está completado
            const isCompleted = await this.checkIfFormCompleted();
            
            if (isCompleted) {
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
                    
                } else {
                }
            } catch (error) {
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
                        this.showSaveIndicator();
                    }
                }
            } catch (error) {
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
            
            // Auto-ocultar después de 5 segundos
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 3000);
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
             
                return true;
            }
            
            // 2. Verificar clase CSS específica
            if (questionScreen.classList.contains('sfq-final-screen-hidden')) {

            }
            
            // 3. Verificar si es una pregunta freestyle con pantallaFinal en el DOM
            const questionType = questionScreen.dataset.questionType;
            if (questionType === 'freestyle') {
                const freestyleContainer = questionScreen.querySelector('.sfq-freestyle-container');
                if (freestyleContainer && freestyleContainer.dataset.pantallaFinal === 'true') {
                   
                }
            }
            
            return false;
        }

        /**
         * ✅ CORREGIDO: Manejar llegada a pantalla final
         */
        async handlePantallaFinalReached(questionScreen) {
            const questionId = questionScreen.dataset.questionId;
            
           
            
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
           
            
            // Opcional: Marcar el formulario como completado en el backend sin mostrar la pantalla de agradecimiento
            this.markFormAsCompleted();
        }

        /**
         * ✅ CORREGIDO: Obtener siguiente pregunta que NO sea pantalla final
         */
        getNextNonFinalQuestion(currentQuestion) {
            let next = currentQuestion.nextElementSibling;
            
            
            // Buscar la siguiente pregunta que no sea pantalla final
            while (next) {
                // Solo considerar elementos que sean pantallas de pregunta
                if (next.classList.contains('sfq-question-screen')) {
                    
                    // Verificar si es una pantalla final
                    if (this.isQuestionPantallaFinal(next)) {
                       
                        next = next.nextElementSibling;
                        continue;
                    }
                    
                    // Es una pregunta normal, la devolvemos
                    return next;
                }
                
                // Si no es una pantalla de pregunta, continuar buscando
                next = next.nextElementSibling;
            }
            
            // No hay más preguntas normales
           
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
             
            }
            
            // No hay preguntas normales
            return null;
        }

        /**
         * ✅ MEJORADO: Verificar si el formulario ya está completado con logging detallado
         */
        async checkIfFormCompleted() {
            
            if (!this.formId || !this.sessionId) {
                return false;
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

                // Si la respuesta indica que el formulario ya está completado
                if (result.success && result.data) {
                    
                    if (!result.data.has_partial) {
                        // Verificar si el mensaje indica que está completado
                        if (result.data.message && result.data.message.includes('ya está completado')) {
                            return true;
                        }
                        
                        // Verificar si hay datos de submission completado
                        if (result.data.completed_at && result.data.submission_id) {
                            return true;
                        }
                        
                        // ✅ NUEVO: Verificar si el mensaje indica que no hay respuesta parcial por estar completado
                        if (result.data.message && result.data.message.includes('No hay respuesta parcial')) {
                            // Hacer una verificación adicional más directa
                            const isCompleted = await this.checkCompletionDirectly();
                            if (isCompleted) {
                                return true;
                            }
                        }
                    }
                }

                return false;
            } catch (error) {
                return false; // En caso de error, asumir que no está completado
            }
        }

        /**
         * ✅ NUEVO: Verificación directa de completado usando endpoint específico
         */
        async checkCompletionDirectly() {
            
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

                if (result.success && result.data) {
                    const isCompleted = result.data.is_completed || false;
                    return isCompleted;
                }

                return false;
            } catch (error) {
                return false;
            }
        }

        /**
         * ✅ CORREGIDO: Marcar formulario como completado Y disparar webhook
         */
        async markFormAsCompleted() {
           
            
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
                    
                        
                        // ✅ CRÍTICO: Verificar si el servidor indica que debe disparar webhook
                        const shouldTriggerWebhook = result.data && result.data.trigger_webhook;
                        const submissionId = result.data && result.data.submission_id;
                        
                        if (shouldTriggerWebhook && submissionId) {
                           
                            // ✅ NUEVO: Disparar webhook para completado silencioso también
                            setTimeout(() => {
                                this.triggerWebhookPostSuccess(submissionId);
                            }, 500); // 500ms delay
                        }
                        
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
                    }
                }
            } catch (error) {
            }
        }

        /**
         * ✅ NUEVO: Desactivar sistema de guardado parcial
         */
        disablePartialSave() {
            
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

        /**
         * ✅ NUEVO: Cargar siguiente pregunta de forma segura vía AJAX
         */
        async loadNextQuestionSecurely() {

            
            try {
                const formData = new FormData();
                formData.append('action', 'sfq_get_secure_question');
                formData.append('nonce', this.getCurrentNonce());
                formData.append('form_id', this.formId);
                formData.append('session_id', this.sessionId);
                formData.append('question_index', this.currentQuestionIndex + 1);

                const response = await fetch(this.config.ajaxUrl, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
              

                if (result.success && result.data) {
                    if (result.data.html) {
                        // ✅ SOLUCIÓN: Verificar si es una pantalla final
                        if (result.data.is_final_screen) {
                          
                            
                            // Para pantallas finales, usar método específico
                            this.insertDynamicFinalScreen(result.data.html, result.data.question_id);
                            
                            // Marcar como completado silenciosamente
                            await this.markFormAsCompleted();
                        } else {
                            // Insertar nueva pregunta normal en el contenedor dinámico
                            this.insertDynamicQuestion(result.data.html, result.data.question_index);
                            
                            // Actualizar índice de pregunta actual
                            this.currentQuestionIndex = result.data.question_index;
                            this.questionStartTime = Date.now();
                            
                            // Actualizar progreso
                            this.updateProgress();
                        }
                      
                    } else if (result.data.use_default_final_screen) {
                        // ✅ NUEVA SOLUCIÓN: Usar pantalla final por defecto del sistema

                        this.submitForm();
                    } else if (result.data.is_last_question || result.data.form_completed) {
                        // ✅ SOLUCIÓN: Manejar finalización cuando no hay pantallas finales
                      
                        this.submitForm();
                    }
                } else {

                    this.showError('Error al cargar la siguiente pregunta.');
                }
            } catch (error) {
            
                this.showError('Error de conexión al cargar la siguiente pregunta.');
            }
        }

        /**
         * ✅ CORREGIDO: Cargar pregunta específica de forma segura (para navegación condicional)
         */
        async loadQuestionSecurely(questionId) {

            try {
                const formData = new FormData();
                formData.append('action', 'sfq_get_secure_question');
                formData.append('nonce', this.getCurrentNonce());
                formData.append('form_id', this.formId);
                formData.append('session_id', this.sessionId);
                formData.append('question_id', questionId);

                const response = await fetch(this.config.ajaxUrl, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
               

                if (result.success && result.data && result.data.html) {
                    // ✅ CORREGIDO: Manejar pantallas finales correctamente
                    if (result.data.is_final_screen) {
                      
                        
                        // Para pantallas finales, usar método específico
                        this.insertDynamicFinalScreen(result.data.html, questionId);
                        
                        // Marcar como completado silenciosamente
                        await this.markFormAsCompleted();
                        
                        
                    } else {
                        // Para preguntas normales, usar método estándar
                        this.insertDynamicQuestion(result.data.html, result.data.question_index, questionId);
                        
                        // Actualizar índice si es una pregunta normal
                        if (result.data.question_index !== undefined) {
                            this.currentQuestionIndex = result.data.question_index;
                        }
                        
                        this.questionStartTime = Date.now();
                        this.updateProgress();
                        
                       
                    }
                } else {
            
                    this.showError('Error al cargar la pregunta solicitada.');
                }
            } catch (error) {

                this.showError('Error de conexión al cargar la pregunta.');
            }
        }

        /**
         * ✅ NUEVO: Insertar pregunta dinámica en el DOM
         */
        insertDynamicQuestion(questionHtml, questionIndex, specificQuestionId = null) {

            
            // Ocultar pregunta actual
            if (this.currentScreen) {
                this.currentScreen.classList.remove('active');
            }

            // Obtener contenedor dinámico
            const dynamicContainer = this.container.querySelector('#sfq-dynamic-questions-container');
            if (!dynamicContainer) {
               
                return;
            }

            // Limpiar contenedor dinámico
            dynamicContainer.innerHTML = '';

            // Crear elemento temporal para parsear HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = questionHtml;
            
            // Obtener la pregunta parseada
            const questionElement = tempDiv.querySelector('.sfq-question-screen');
            if (!questionElement) {
                console.error('SFQ Secure: No question screen found in HTML');
                return;
            }

            // Añadir al contenedor dinámico
            dynamicContainer.appendChild(questionElement);

            // Activar la nueva pregunta
            questionElement.classList.add('active');
            this.currentScreen = questionElement;

            // Reinicializar eventos para la nueva pregunta
            this.bindEventsForNewQuestion(questionElement);

            // Actualizar visibilidad del botón siguiente
            this.updateNextButtonVisibility(questionElement);

            // ✅ SOLUCIÓN: Actualizar variables en DOM después de insertar la pregunta
            setTimeout(() => {
             
                this.updateVariablesInDOM();
            }, 100);

            // Hacer scroll si está habilitado
            if (this.settings.auto_scroll_to_form !== false) {
                this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

           
        }

        /**
         * ✅ CORREGIDO: Insertar pantalla final dinámica en el DOM
         */
        insertDynamicFinalScreen(finalScreenHtml, questionId) {
           
            
            // Ocultar pregunta actual
            if (this.currentScreen) {
                this.currentScreen.classList.remove('active');
            }

            // Obtener contenedor dinámico
            const dynamicContainer = this.container.querySelector('#sfq-dynamic-questions-container');
            if (!dynamicContainer) {
               
                return;
            }

            // Limpiar contenedor dinámico
            dynamicContainer.innerHTML = '';

            // ✅ CORREGIDO: Insertar HTML directamente y buscar elementos
            dynamicContainer.innerHTML = finalScreenHtml;
            
            // ✅ NUEVO: Buscar el elemento de pantalla final insertado
            let finalScreenElement = dynamicContainer.querySelector('.sfq-final-screen');
            
            if (!finalScreenElement) {
                // Si no encuentra .sfq-final-screen, buscar .sfq-screen
                finalScreenElement = dynamicContainer.querySelector('.sfq-screen');
                
                if (finalScreenElement) {
          
                    finalScreenElement.classList.add('sfq-final-screen');
                } else {
                    console.error('SFQ Secure: No screen element found in HTML');
                    console.error('SFQ Secure: Available elements:', dynamicContainer.innerHTML);
                    return;
                }
            }

            // Activar la nueva pantalla final
            finalScreenElement.classList.add('active');
            this.currentScreen = finalScreenElement;

            // ✅ CRÍTICO: Marcar como pantalla final para el progreso
            finalScreenElement.dataset.pantallaFinal = 'true';
            finalScreenElement.dataset.questionId = questionId;

            // Reinicializar eventos para la pantalla final (si tiene elementos interactivos)
            this.bindEventsForNewQuestion(finalScreenElement);

            // ✅ SOLUCIÓN: Actualizar variables en DOM después de insertar la pantalla final
            setTimeout(() => {
               
                this.updateVariablesInDOM();
            }, 100);

            // Actualizar progreso al 100% para pantallas finales
            this.updateProgress();

            // Hacer scroll si está habilitado
            if (this.settings.auto_scroll_to_form !== false) {
                this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

          
        }

        /**
         * ✅ NUEVO: Vincular eventos para pregunta recién cargada
         */
        bindEventsForNewQuestion(questionElement) {
            

            // Opciones de respuesta única
            questionElement.querySelectorAll('.sfq-single-choice .sfq-option-card').forEach(card => {
                card.addEventListener('click', (e) => this.handleSingleChoice(e));
            });

            // Opciones múltiples
            questionElement.querySelectorAll('.sfq-checkbox-input').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => this.handleMultipleChoice(e));
            });

            // Campos de texto
            questionElement.querySelectorAll('.sfq-text-input').forEach(input => {
                input.addEventListener('input', (e) => this.handleTextInput(e));
            });

            // Rating
            questionElement.querySelectorAll('.sfq-star, .sfq-emoji').forEach(button => {
                button.addEventListener('click', (e) => this.handleRating(e));
            });

            // Selección de imagen
            questionElement.querySelectorAll('.sfq-image-option').forEach(option => {
                option.addEventListener('click', (e) => this.handleImageChoice(e));
            });

            // Botones de navegación
            questionElement.querySelectorAll('.sfq-next-button').forEach(button => {
                button.addEventListener('click', () => this.nextQuestion());
            });

            questionElement.querySelectorAll('.sfq-prev-button').forEach(button => {
                button.addEventListener('click', () => this.previousQuestion());
            });

            // Elementos freestyle si existen
            this.bindFreestyleEventsForElement(questionElement);

           
        }

        /**
         * ✅ NUEVO: Vincular eventos freestyle para elemento específico
         */
        bindFreestyleEventsForElement(element) {
            // Inputs de texto freestyle
            element.querySelectorAll('.sfq-freestyle-input, .sfq-freestyle-textarea').forEach(input => {
                input.addEventListener('input', (e) => this.handleFreestyleInput(e));
            });

            // Selects freestyle
            element.querySelectorAll('.sfq-freestyle-select').forEach(select => {
                select.addEventListener('change', (e) => this.handleFreestyleSelect(e));
            });

            // Checkboxes freestyle
            element.querySelectorAll('.sfq-freestyle-checkbox, .sfq-legal-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => this.handleFreestyleCheckbox(e));
            });

            // Rating freestyle
            element.querySelectorAll('.sfq-freestyle-star, .sfq-freestyle-heart, .sfq-freestyle-emoji').forEach(button => {
                button.addEventListener('click', (e) => this.handleFreestyleRating(e));
            });

            // Botones freestyle
            element.querySelectorAll('.sfq-freestyle-button').forEach(button => {
                button.addEventListener('click', (e) => this.handleFreestyleButton(e));
            });

            // Imágenes clickeables freestyle
            element.querySelectorAll('.sfq-clickable-image').forEach(image => {
                image.addEventListener('click', (e) => this.handleFreestyleImageClick(e));
            });

            // File uploads freestyle
            element.querySelectorAll('.sfq-file-input').forEach(input => {
                input.addEventListener('change', (e) => this.handleFreestyleFileUpload(e));
            });

            // Hacer clickeable el área de subida de archivos
            element.querySelectorAll('.sfq-file-upload-area').forEach(uploadArea => {
                const fileInput = uploadArea.querySelector('.sfq-file-input');
                if (fileInput) {
                    uploadArea.addEventListener('click', (e) => {
                        if (e.target !== fileInput) {
                            e.preventDefault();
                            fileInput.click();
                        }
                    });

                    // Drag & Drop functionality
                    uploadArea.addEventListener('dragover', (e) => {
                        e.preventDefault();
                        uploadArea.classList.add('drag-over');
                    });

                    uploadArea.addEventListener('dragleave', (e) => {
                        e.preventDefault();
                        uploadArea.classList.remove('drag-over');
                    });

                    uploadArea.addEventListener('drop', (e) => {
                        e.preventDefault();
                        uploadArea.classList.remove('drag-over');
                        
                        const files = e.dataTransfer.files;
                        if (files.length > 0) {
                            fileInput.files = files;
                            const changeEvent = new Event('change', { bubbles: true });
                            fileInput.dispatchEvent(changeEvent);
                        }
                    });
                }
            });

            // Inicializar countdowns freestyle para este elemento
            this.initializeFreestyleCountdownsForElement(element);
        }

        /**
         * ✅ NUEVO: Inicializar countdowns freestyle para elemento específico
         */
        initializeFreestyleCountdownsForElement(element) {
            element.querySelectorAll('.sfq-freestyle-countdown').forEach(countdown => {
                const targetDate = countdown.dataset.targetDate;
                const finishedText = countdown.dataset.finishedText;
                const elementId = countdown.closest('.sfq-freestyle-countdown-wrapper').dataset.elementId;

                if (!targetDate) return;

                const targetTime = new Date(targetDate).getTime();

                const updateCountdown = () => {
                    const now = new Date().getTime();
                    const distance = targetTime - now;

                    if (distance < 0) {
                        countdown.innerHTML = `<div class="sfq-countdown-finished">${finishedText}</div>`;
                        return;
                    }

                    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                    const daysEl = countdown.querySelector('[data-unit="days"]');
                    const hoursEl = countdown.querySelector('[data-unit="hours"]');
                    const minutesEl = countdown.querySelector('[data-unit="minutes"]');
                    const secondsEl = countdown.querySelector('[data-unit="seconds"]');

                    if (daysEl) daysEl.textContent = days.toString().padStart(2, '0');
                    if (hoursEl) hoursEl.textContent = hours.toString().padStart(2, '0');
                    if (minutesEl) minutesEl.textContent = minutes.toString().padStart(2, '0');
                    if (secondsEl) secondsEl.textContent = seconds.toString().padStart(2, '0');
                };

                updateCountdown();
                setInterval(updateCountdown, 1000);
            });
        }

        /**
         * ✅ NUEVO: Aplicar estilos de imagen de fondo desde la configuración
         */
        applyBackgroundImageStyles() {
            // Obtener configuración de imagen de fondo desde los settings
            const backgroundImageUrl = this.settings.background_image_url;
            const backgroundImageSize = this.settings.background_image_size || 'cover';
            const backgroundImageRepeat = this.settings.background_image_repeat || 'no-repeat';
            const backgroundImagePosition = this.settings.background_image_position || 'center center';
            const backgroundImageAttachment = this.settings.background_image_attachment || 'scroll';
            const backgroundOverlayOpacity = this.settings.background_overlay_opacity || 0;


            // Solo aplicar si hay una imagen configurada
            if (backgroundImageUrl && backgroundImageUrl.trim() !== '') {
                // Aplicar variables CSS al contenedor del formulario
                this.container.style.setProperty('--sfq-background-image-url', `url("${backgroundImageUrl}")`);
                this.container.style.setProperty('--sfq-background-image-size', backgroundImageSize);
                this.container.style.setProperty('--sfq-background-image-repeat', backgroundImageRepeat);
                this.container.style.setProperty('--sfq-background-image-position', backgroundImagePosition);
                this.container.style.setProperty('--sfq-background-image-attachment', backgroundImageAttachment);
                this.container.style.setProperty('--sfq-background-overlay-opacity', backgroundOverlayOpacity);

            } else {
            }
        }
 /**
         * ✅ NUEVO: Aplicar estilos personalizados de botones con gradiente animado
         */
        applyCustomButtonStyles() {
            // Buscar todos los botones con estilos personalizados
            const customButtons = this.container.querySelectorAll('.sfq-next-button[data-custom-style="true"]');
            
            customButtons.forEach(button => {
                this.applyButtonCustomStyles(button);
            });

            // También aplicar a botones que se cargan dinámicamente
            this.observeForNewButtons();
        }

        /**
         * ✅ NUEVO: Observar botones que se cargan dinámicamente
         */
        observeForNewButtons() {
            // Configurar observer para detectar nuevos botones
            if (window.MutationObserver) {
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                // Buscar botones personalizados en el nodo añadido
                                const newButtons = node.querySelectorAll ? 
                                    node.querySelectorAll('.sfq-next-button[data-custom-style="true"]') : [];
                                
                                newButtons.forEach(button => {
                                    this.applyButtonCustomStyles(button);
                                });

                                // También verificar si el nodo mismo es un botón personalizado
                                if (node.classList && node.classList.contains('sfq-next-button') && 
                                    node.dataset.customStyle === 'true') {
                                    this.applyButtonCustomStyles(node);
                                }
                            }
                        });
                    });
                });

                observer.observe(this.container, {
                    childList: true,
                    subtree: true
                });
            }
        }

        /**
         * ✅ NUEVO: Aplicar estilos personalizados a un botón específico
         */
        applyButtonCustomStyles(button) {
            // Obtener configuración de estilos del botón desde data attributes
            const buttonConfig = this.extractButtonStyleConfig(button);
            
            if (!buttonConfig) {
                return;
            }


            // Aplicar estilos básicos
            this.applyBasicButtonStyles(button, buttonConfig);
            
            // Aplicar gradiente animado si está habilitado
            if (buttonConfig.gradient_enabled) {
                this.applyAnimatedGradient(button, buttonConfig);
            }
        }

        /**
         * ✅ NUEVO: Extraer configuración de estilos del botón
         */
        extractButtonStyleConfig(button) {
            try {
                const configData = button.dataset.styleConfig;
                if (!configData) {
                    return null;
                }
                
                const config = JSON.parse(configData);
               
                return config;
            } catch (error) {
                console.error('SFQ: Error parsing button style config:', error);
                return null;
            }
        }

        /**
         * ✅ SOLUCIONADO: Aplicar estilos básicos del botón con !important para sobrescribir CSS del tema
         */
        applyBasicButtonStyles(button, config) {
            
            // ✅ SOLUCIÓN DEFINITIVA: Usar setProperty con !important para sobrescribir estilos del tema
            if (config.background_color) {
                // ✅ CORREGIDO: Permitir opacidad 0 usando verificación explícita
                const bgOpacity = config.background_opacity !== undefined && config.background_opacity !== null && config.background_opacity !== '' 
                    ? parseFloat(config.background_opacity) 
                    : 1;
                
                // Si no hay gradiente, aplicar color de fondo sólido con opacidad
                if (!config.gradient_enabled) {
                    const bgColor = this.hexToRgba(config.background_color, bgOpacity);
                    button.style.setProperty('background-color', bgColor, 'important');
                } else {
                    // Si hay gradiente, el color de fondo se usa como fallback
                    button.style.setProperty('background-color', config.background_color, 'important');
                }
            }

            if (config.text_color) {
                button.style.setProperty('color', config.text_color, 'important');
            }

            if (config.border_color) {
                const borderOpacity = parseFloat(config.border_opacity || 1);
                const borderColor = this.hexToRgba(config.border_color, borderOpacity);
                button.style.setProperty('border-color', borderColor, 'important');
                button.style.setProperty('border-width', '1px', 'important');
                button.style.setProperty('border-style', 'solid', 'important');
            }

            // Dimensiones y forma
            if (config.border_radius) {
                button.style.setProperty('border-radius', config.border_radius + 'px', 'important');
            }

            if (config.font_size) {
                button.style.setProperty('font-size', config.font_size + 'px', 'important');
            }

            if (config.font_weight) {
                button.style.setProperty('font-weight', config.font_weight, 'important');
            }

            // Efectos
            if (config.text_shadow) {
                button.style.setProperty('text-shadow', '1px 1px 2px rgba(0,0,0,0.3)', 'important');
            }

            if (config.box_shadow) {
                button.style.setProperty('box-shadow', '0 4px 8px rgba(0,0,0,0.1)', 'important');
            }

            // Alineación
            if (config.alignment) {
                const buttonContainer = button.parentElement;
                if (buttonContainer) {
                    buttonContainer.style.setProperty('text-align', config.alignment, 'important');
                }
            }

            // Asegurar que el botón tenga posición relativa para efectos
            button.style.setProperty('position', 'relative', 'important');
            button.style.setProperty('overflow', 'hidden', 'important');
        }

        /**
         * ✅ ACTUALIZADO: Aplicar gradiente animado al botón con efectos avanzados
         */
        applyAnimatedGradient(button, config) {
            // Colores del gradiente
            const color1 = config.gradient_color_1 || '#ee7752';
            const color2 = config.gradient_color_2 || '#e73c7e';
            const color3 = config.gradient_color_3 || '#23a6d5';
            const color4 = config.gradient_color_4 || '#23d5ab';
            
            // Configuración de animación
            const speed = config.gradient_speed || 15;
            const angle = config.gradient_angle || -45;
            const size = config.gradient_size || 400;
            
            // ✅ NUEVO: Efectos avanzados
            const opacity = parseFloat(config.gradient_opacity || 1);
            const blur = config.gradient_blur || 0;
            const saturate = config.gradient_saturate || 100;
            
            // ✅ SOLUCIÓN: Aplicar opacidad a los colores del gradiente individualmente
            const color1WithOpacity = this.applyOpacityToColor(color1, opacity);
            const color2WithOpacity = this.applyOpacityToColor(color2, opacity);
            const color3WithOpacity = this.applyOpacityToColor(color3, opacity);
            const color4WithOpacity = this.applyOpacityToColor(color4, opacity);
            
            // Crear gradiente CSS con colores que incluyen opacidad
            const gradient = `linear-gradient(${angle}deg, ${color1WithOpacity}, ${color2WithOpacity}, ${color3WithOpacity}, ${color4WithOpacity})`;
            
            // Aplicar estilos del gradiente
            button.style.background = gradient;
            button.style.backgroundSize = `${size}% ${size}%`;
            button.style.position = 'relative';
            button.style.overflow = 'hidden';
            
            // ✅ CRÍTICO: NO aplicar opacidad al botón completo (mantener texto opaco)
            // La opacidad se aplica directamente a los colores del gradiente
            
            // ✅ NUEVO: Aplicar efectos de glassmorphism
            if (parseInt(blur) > 0 || parseInt(saturate) !== 100) {
                const filters = [];
                
                if (parseInt(blur) > 0) {
                    filters.push(`blur(${blur}px)`);
                }
                
                if (parseInt(saturate) !== 100) {
                    filters.push(`saturate(${saturate}%)`);
                }
                
                const backdropFilter = filters.join(' ');
                button.style.backdropFilter = backdropFilter;
                button.style.webkitBackdropFilter = backdropFilter; // Safari support
                
            }
            
            // Crear animación CSS única para este botón
            const animationName = `sfq-gradient-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            this.createGradientAnimation(animationName);
            
            // ✅ CORREGIDO: Aplicar animación con !important para sobrescribir CSS del tema
            button.style.setProperty('animation', `${animationName} ${speed}s ease infinite`, 'important');
            
            
            // Configuraciones adicionales
            if (config.gradient_hover_pause) {
                button.addEventListener('mouseenter', () => {
                    button.style.animationPlayState = 'paused';
                });
                
                button.addEventListener('mouseleave', () => {
                    button.style.animationPlayState = 'running';
                });
            }
            
            if (config.gradient_reverse_animation) {
                button.style.animationDirection = 'reverse';
            }
        }

        /**
         * ✅ NUEVO: Crear animación CSS para gradiente
         */
        createGradientAnimation(animationName) {
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
                if (styleSheet.sheet) {
                    styleSheet.sheet.insertRule(animationRule, styleSheet.sheet.cssRules.length);
                } else {
                    // Fallback para navegadores que no soportan sheet.insertRule inmediatamente
                    styleSheet.textContent += animationRule;
                }
            } catch (error) {
                console.error('SFQ: Error creating gradient animation:', error);
                // Fallback: añadir al textContent
                styleSheet.textContent += animationRule;
            }
        }

        /**
         * ✅ NUEVO: Convertir hex a rgba (helper function)
         */
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

        /**
         * ✅ NUEVO: Aplicar opacidad a un color individual del gradiente
         */
        applyOpacityToColor(color, opacity) {
            // Si la opacidad es 1, devolver el color original
            if (opacity >= 1) {
                return color;
            }
            
            // Convertir el color a RGBA con la opacidad especificada
            return this.hexToRgba(color, opacity);
        }

        /**
         * ✅ MEJORADO: Obtener nonce actual con validación robusta
         */
        getCurrentNonce() {
            
            let nonce = null;
            
            // PRIORIDAD 1: Sistema de compatibilidad con cache
            if (window.sfqCacheCompat && window.sfqCacheCompat.instance) {
                const cacheCompatNonce = window.sfqCacheCompat.instance.nonce;
                if (cacheCompatNonce && cacheCompatNonce.trim() !== '') {
                    return cacheCompatNonce;
                }
            }
            
            // PRIORIDAD 2: Nonce de configuración del formulario
            if (this.config.nonce && this.config.nonce.trim() !== '') {
                nonce = this.config.nonce;
            }
            
            // PRIORIDAD 3: Nonce global de AJAX
            if (!nonce && window.sfq_ajax && window.sfq_ajax.nonce && window.sfq_ajax.nonce.trim() !== '') {
                nonce = window.sfq_ajax.nonce;
            }
            
            // PRIORIDAD 4: Buscar nonce en inputs del DOM
            if (!nonce) {
                const nonceInput = document.querySelector('input[name="nonce"]');
                if (nonceInput && nonceInput.value && nonceInput.value.trim() !== '') {
                    nonce = nonceInput.value;
                }
            }
            
            // PRIORIDAD 5: Buscar en meta tags (si el tema los incluye)
            if (!nonce) {
                const nonceMeta = document.querySelector('meta[name="sfq-nonce"]');
                if (nonceMeta && nonceMeta.content && nonceMeta.content.trim() !== '') {
                    nonce = nonceMeta.content;
                }
            }
            
            // ✅ NUEVO: Validar que el nonce no esté obviamente expirado
            if (nonce && this.isNonceObviouslyExpired(nonce)) {
                
                // Intentar refrescar nonce si el sistema de cache compat está disponible
                if (window.sfqCacheCompat && window.sfqCacheCompat.instance && 
                    typeof window.sfqCacheCompat.instance.refreshNonce === 'function') {
                    
                    // Refrescar de forma asíncrona (no bloquear)
                    window.sfqCacheCompat.instance.refreshNonce().then(function(newNonce) {
                    }).catch(function(error) {
                    });
                }
            }
            
            if (!nonce) {
                return '';
            }
            
            return nonce;
        }
        
        /**
         * ✅ NUEVO: Verificar si un nonce está obviamente expirado
         */
        isNonceObviouslyExpired(nonce) {
            // Los nonces de WordPress tienen un formato específico
            // Si es muy corto o contiene caracteres extraños, probablemente esté corrupto
            if (!nonce || nonce.length < 8 || nonce.length > 15) {
                return true;
            }
            
            // Si contiene solo caracteres no alfanuméricos, probablemente esté corrupto
            if (!/^[a-zA-Z0-9]+$/.test(nonce)) {
                return true;
            }
            
            // Si es un nonce conocido como expirado o de prueba
            const knownExpiredNonces = ['expired', 'invalid', 'test', '00000000', '11111111'];
            if (knownExpiredNonces.includes(nonce.toLowerCase())) {
                return true;
            }
            
            return false;
        }

        /**
         * ✅ NUEVO: Verificar si una pregunta tiene bloqueo activado
         */
        isQuestionBlocked(questionScreen) {
            if (!questionScreen) return false;
            
            // Verificar atributo data-block-question
            const blockQuestion = questionScreen.dataset.blockQuestion;
            if (blockQuestion === 'true' || blockQuestion === '1') {
               
                return true;
            }
            
            // Verificar si hay un elemento con clase de bloqueo
            const blockIndicator = questionScreen.querySelector('.sfq-question-blocked');
            if (blockIndicator) {
              
            }
            
            return false;
        }

        /**
         * ✅ NUEVO: Mostrar mensaje de bloqueo del formulario
         */
        showBlockedMessage(questionScreen) {
            console.log('SFQ: Showing blocked message for question:', questionScreen.dataset.questionId);
            
            // Ocultar la pregunta actual
            if (this.currentScreen) {
                this.currentScreen.classList.remove('active');
            }
            
            // Crear mensaje de bloqueo personalizado
            const blockedMessage = this.createBlockedMessage();
            
            // Insertar el mensaje en el contenedor
            const container = this.container.querySelector('#sfq-dynamic-questions-container') || this.container;
            
            // Limpiar contenedor dinámico si existe
            const dynamicContainer = this.container.querySelector('#sfq-dynamic-questions-container');
            if (dynamicContainer) {
                dynamicContainer.innerHTML = '';
                dynamicContainer.appendChild(blockedMessage);
            } else {
                // Si no hay contenedor dinámico, añadir después de la pregunta actual
                questionScreen.parentNode.insertBefore(blockedMessage, questionScreen.nextSibling);
            }
            
            // Activar el mensaje de bloqueo
            blockedMessage.classList.add('active');
            this.currentScreen = blockedMessage;
            
            // Ocultar barra de progreso
            const progressBar = this.container.querySelector('.sfq-progress-bar');
            if (progressBar) {
                progressBar.style.display = 'none';
            }
            
            // Hacer scroll al mensaje
            if (this.settings.auto_scroll_to_form !== false) {
                this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            
            // Marcar formulario como completado silenciosamente (bloqueado)
            this.markFormAsCompleted();
        }

        /**
         * ✅ NUEVO: Crear mensaje de bloqueo personalizado
         */
        createBlockedMessage() {
            const blockedDiv = document.createElement('div');
            blockedDiv.className = 'sfq-screen sfq-blocked-screen';
            
            // Obtener configuración de bloqueo desde settings
            const blockIcon = this.settings.block_form_icon || '🔒';
            const blockTitle = this.settings.block_form_title || 'Formulario Bloqueado';
            const blockDescription = this.settings.block_form_description || 'Este formulario ha sido bloqueado en esta pregunta.';
            const blockButtonText = this.settings.block_form_button_text || '';
            const blockButtonUrl = this.settings.block_form_button_url || '';
            
            // Crear contenido del mensaje
            let content = `
                <div class="sfq-blocked-content">
                    <div class="sfq-blocked-icon">${blockIcon}</div>
                    <h2 class="sfq-blocked-title">${this.escapeHtml(blockTitle)}</h2>
                    <div class="sfq-blocked-description">
                        ${this.escapeHtml(blockDescription)}
                    </div>
            `;
            
            // Añadir botón si está configurado
            if (blockButtonText && blockButtonUrl) {
                content += `
                    <div class="sfq-blocked-actions">
                        <a href="${this.escapeHtml(blockButtonUrl)}" class="sfq-blocked-button" target="_blank">
                            ${this.escapeHtml(blockButtonText)}
                        </a>
                    </div>
                `;
            }
            
            content += `</div>`;
            
            blockedDiv.innerHTML = content;
            
            return blockedDiv;
        }

        /**
         * ✅ NUEVO: Guardar clic de botón inmediatamente en el servidor
         */
        async saveButtonClickImmediately(questionId, elementId, button) {
          
            try {
                const formData = new FormData();
                formData.append('action', 'sfq_save_button_click');
                formData.append('nonce', this.getCurrentNonce());
                formData.append('form_id', this.formId);
                formData.append('session_id', this.sessionId);
                formData.append('question_id', questionId);
                formData.append('element_id', elementId);
                formData.append('click_timestamp', Date.now());
                
                // Incluir información adicional del botón si está disponible
                const buttonText = button.textContent || button.innerText || '';
                const buttonUrl = button.href || button.dataset.url || '';
                
                formData.append('button_text', buttonText);
                formData.append('button_url', buttonUrl);

                const response = await fetch(this.config.ajaxUrl, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
                
                if (result.success) {
                   
                } else {
                   
                }
                
            } catch (error) {
                console.error('SFQ: Error saving button click:', error);
                // No lanzar el error para no interrumpir el flujo normal
            }
        }

        /**
         * ✅ NUEVO: Función helper para escapar HTML
         */
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

        /**
         * ✅ NUEVO: Inicializar sistema de seguimiento de vistas de botones
         */
        initializeButtonViewTracking() {
            
            // Configurar observer para detectar cuando aparecen botones en pantalla
            this.setupButtonViewObserver();
            
            // Registrar vistas de botones ya visibles
            this.registerVisibleButtons();
        }

        /**
         * ✅ NUEVO: Configurar observer para detectar botones que aparecen en pantalla
         */
        setupButtonViewObserver() {
            // Verificar soporte para Intersection Observer
            if (!window.IntersectionObserver) {
                this.setupButtonViewFallback();
                return;
            }

            // Configurar observer con umbral del 50% de visibilidad
            const observerOptions = {
                root: null,
                rootMargin: '0px',
                threshold: 0.5
            };

            this.buttonViewObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.handleButtonBecameVisible(entry.target);
                    }
                });
            }, observerOptions);

            // Observar todos los botones de preguntas estilo libre
            this.observeFreestyleButtons();
        }

        /**
         * ✅ NUEVO: Observar botones de preguntas estilo libre
         */
        observeFreestyleButtons() {
            // Buscar todos los botones en preguntas freestyle
            const freestyleButtons = this.container.querySelectorAll('.sfq-freestyle-button[href], .sfq-freestyle-button[data-url]');
            
            
            freestyleButtons.forEach(button => {
                // Solo observar botones que tengan URL
                const hasUrl = button.href || button.dataset.url;
                if (hasUrl && this.buttonViewObserver) {
                    this.buttonViewObserver.observe(button);
                }
            });
        }

        /**
         * ✅ NUEVO: Manejar cuando un botón se vuelve visible
         */
        async handleButtonBecameVisible(button) {
            // Verificar si ya se registró la vista de este botón
            if (button.dataset.viewRegistered === 'true') {
                return;
            }


            // Marcar como vista registrada para evitar duplicados
            button.dataset.viewRegistered = 'true';

            // Obtener información del botón
            const buttonInfo = this.extractButtonInfo(button);
            
            if (buttonInfo) {
                await this.registerButtonView(buttonInfo);
            }
        }

        /**
         * ✅ NUEVO: Extraer información del botón
         */
        extractButtonInfo(button) {
            // Encontrar el contenedor de la pregunta
            const questionContainer = button.closest('.sfq-question-screen');
            if (!questionContainer) {
                return null;
            }

            // Verificar que sea una pregunta estilo libre
            const questionType = questionContainer.dataset.questionType;
            if (questionType !== 'freestyle') {
                return null;
            }

            const questionId = questionContainer.dataset.questionId;
            const elementId = button.dataset.elementId;
            const buttonText = button.textContent?.trim() || button.innerText?.trim() || '';
            const buttonUrl = button.href || button.dataset.url || '';

            if (!questionId || !elementId || !buttonUrl) {
                
                return null;
            }

            return {
                questionId: parseInt(questionId),
                elementId: elementId,
                buttonText: buttonText,
                buttonUrl: buttonUrl
            };
        }

        /**
         * ✅ NUEVO: Registrar vista de botón en el servidor
         */
        async registerButtonView(buttonInfo) {

            try {
                const formData = new FormData();
                formData.append('action', 'sfq_register_button_view');
                formData.append('nonce', this.getCurrentNonce());
                formData.append('form_id', this.formId);
                formData.append('question_id', buttonInfo.questionId);
                formData.append('element_id', buttonInfo.elementId);
                formData.append('session_id', this.sessionId);
                formData.append('button_text', buttonInfo.buttonText);
                formData.append('button_url', buttonInfo.buttonUrl);

                const response = await fetch(this.config.ajaxUrl, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
                
                if (result.success) {
                } else {
                }
                
            } catch (error) {
                // No lanzar el error para no interrumpir el flujo normal
            }
        }

        /**
         * ✅ NUEVO: Registrar vistas de botones ya visibles (para botones que aparecen inmediatamente)
         */
        registerVisibleButtons() {
            // Usar setTimeout para permitir que el DOM se estabilice
            setTimeout(() => {
                const visibleButtons = this.container.querySelectorAll('.sfq-freestyle-button[href], .sfq-freestyle-button[data-url]');
                
                visibleButtons.forEach(button => {
                    // Verificar si el botón está visible en la pantalla actual
                    const questionContainer = button.closest('.sfq-question-screen');
                    if (questionContainer && questionContainer.classList.contains('active')) {
                        // Verificar si está realmente visible usando getBoundingClientRect
                        const rect = button.getBoundingClientRect();
                        const isVisible = rect.top >= 0 && rect.left >= 0 && 
                                        rect.bottom <= window.innerHeight && 
                                        rect.right <= window.innerWidth;
                        
                        if (isVisible) {
                            this.handleButtonBecameVisible(button);
                        }
                    }
                });
            }, 1000); // Esperar 1 segundo para que se complete la inicialización
        }

        /**
         * ✅ NUEVO: Sistema de fallback para navegadores sin IntersectionObserver
         */
        setupButtonViewFallback() {
            
            // Usar eventos de scroll y resize para detectar visibilidad
            let scrollTimeout;
            const checkVisibility = () => {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    this.checkButtonVisibilityFallback();
                }, 250);
            };

            window.addEventListener('scroll', checkVisibility);
            window.addEventListener('resize', checkVisibility);
            
            // Verificación inicial
            setTimeout(() => {
                this.checkButtonVisibilityFallback();
            }, 1000);
        }

        /**
         * ✅ NUEVO: Verificar visibilidad de botones (fallback)
         */
        checkButtonVisibilityFallback() {
            const buttons = this.container.querySelectorAll('.sfq-freestyle-button[href], .sfq-freestyle-button[data-url]');
            
            buttons.forEach(button => {
                if (button.dataset.viewRegistered === 'true') {
                    return;
                }

                // Verificar si está en una pregunta activa
                const questionContainer = button.closest('.sfq-question-screen');
                if (!questionContainer || !questionContainer.classList.contains('active')) {
                    return;
                }

                // Verificar visibilidad usando getBoundingClientRect
                const rect = button.getBoundingClientRect();
                const isVisible = rect.top >= 0 && rect.left >= 0 && 
                                rect.bottom <= window.innerHeight && 
                                rect.right <= window.innerWidth;
                
                if (isVisible) {
                    this.handleButtonBecameVisible(button);
                }
            });
        }

        /**
         * ✅ NUEVO: Disparar webhook después de mostrar éxito al usuario
         */
        async triggerWebhookPostSuccess(submissionId) {
          
            try {
                const formData = new FormData();
                formData.append('action', 'sfq_trigger_webhook');
                formData.append('nonce', this.getCurrentNonce());
                formData.append('form_id', this.formId);
                formData.append('submission_id', submissionId);

                const response = await fetch(this.config.ajaxUrl, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
                
                if (result.success) {
                 
                } else {
                    console.warn('SFQ: Webhook trigger failed:', result.data);
                }
                
            } catch (error) {
                console.error('SFQ: Error triggering webhook post-success:', error);
                // No interrumpir el flujo aunque falle el webhook
            }
        }

        /**
         * ✅ NUEVO: Manejar redirecciones después del webhook
         */
        handlePostWebhookRedirection(responseData) {
            
            
            // PRIORITY 1: Verificar si hay redirección condicional desde el resultado del servidor
            if (responseData && responseData.redirect_url) {
                setTimeout(() => {
                    window.location.href = responseData.redirect_url;
                }, 2000); // Dar tiempo para que se complete el webhook
                
                // Mostrar mensaje de redirección
                const thankYouScreen = this.container.querySelector('.sfq-thank-you-screen');
                if (thankYouScreen) {
                    const redirectMessage = document.createElement('div');
                    redirectMessage.className = 'sfq-redirect-message';
                    redirectMessage.innerHTML = '<p>Redirigiendo en 2 segundos...</p>';
                    thankYouScreen.appendChild(redirectMessage);
                }
                return;
            }
            
            // PRIORITY 2: Verificar redirección configurada en el formulario
            const configuredRedirectUrl = this.container.querySelector('#sfq-redirect-url-' + this.formId);
            if (configuredRedirectUrl && configuredRedirectUrl.value) {
                setTimeout(() => {
                    window.location.href = configuredRedirectUrl.value;
                }, 3000); // Dar más tiempo para webhook + mostrar éxito
                
                // Mostrar mensaje de redirección
                const thankYouScreen = this.container.querySelector('.sfq-thank-you-screen');
                if (thankYouScreen) {
                    const redirectMessage = document.createElement('div');
                    redirectMessage.className = 'sfq-redirect-message';
                    redirectMessage.innerHTML = '<p>Redirigiendo en 3 segundos...</p>';
                    thankYouScreen.appendChild(redirectMessage);
                }
                return;
            }
            
            // PRIORITY 3: No hay redirección, mantener pantalla de agradecimiento
           
        }
    }

    // Inicializar cuando el DOM esté listo
    document.addEventListener('DOMContentLoaded', function() {
        // Buscar todos los formularios en la página que NO sean placeholders AJAX
        document.querySelectorAll('.sfq-form-container:not(.sfq-form-ajax-placeholder)').forEach(container => {
            // Solo inicializar si no ha sido inicializado ya (para evitar duplicados si el script se carga varias veces)
            if (!container.dataset.initialized) {
                new SmartFormQuiz(container);
                container.dataset.initialized = 'true';
            }
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
        background: rgba(255, 255, 255, 0);
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 1rem 1.5rem;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        font-size: 0.9rem;
        color: #66666657;
    }
    
    .sfq-processing-spinner {
        width: 20px;
        height: 20px;
        border: none;
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
    .sfq-question-content{
    z-index: 99999999999;
    position: relative;
    }
    .sfq-restore-notification {
        position: fixed !important;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
        animation: fadeIn 0.3s ease-in forwards;
        z-index: 10001;
        max-width: 90vw;
        width: auto;
        min-width: 300px;
    }
    @keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
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
    
    /* ✅ NUEVOS: Estilos para mensaje de bloqueo */
    .sfq-blocked-screen {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 400px;
        padding: 2rem;
        text-align: center;
    }
    
    .sfq-blocked-content {
        max-width: 500px;
        padding: 2rem;
        background: #f8f9fa;
        border: 2px solid #e9ecef;
        border-radius: 16px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }
    
    .sfq-blocked-icon {
        font-size: 4rem;
        margin-bottom: 1rem;
        opacity: 0.8;
    }
    
    .sfq-blocked-title {
        font-size: 1.5rem;
        font-weight: 600;
        color: #333;
        margin: 0 0 1rem 0;
    }
    
    .sfq-blocked-description {
        font-size: 1rem;
        color: #666;
        line-height: 1.6;
        margin-bottom: 1.5rem;
    }
    
    .sfq-blocked-actions {
        margin-top: 1.5rem;
    }
    
    .sfq-blocked-button {
        display: inline-block;
        padding: 12px 24px;
        background: #007cba;
        color: white;
        text-decoration: none;
        border-radius: 8px;
        font-weight: 500;
        transition: background 0.3s ease;
    }
    
    .sfq-blocked-button:hover {
        background: #005a87;
        color: white;
        text-decoration: none;
    }
    
    /* Responsive para mensaje de bloqueo */
    @media (max-width: 768px) {
        .sfq-blocked-screen {
            padding: 1rem;
            min-height: 300px;
        }
        
        .sfq-blocked-content {
            padding: 1.5rem;
        }
        
        .sfq-blocked-icon {
            font-size: 3rem;
        }
        
        .sfq-blocked-title {
            font-size: 1.3rem;
        }
        
        .sfq-blocked-description {
            font-size: 0.9rem;
        }
        
        .sfq-blocked-button {
            padding: 10px 20px;
            font-size: 0.9rem;
        }
    }
`;
document.head.appendChild(style);
