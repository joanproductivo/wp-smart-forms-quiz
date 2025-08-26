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
            
            this.init();
        }

        init() {
            this.bindEvents();
            this.initializeForm();
            
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

            // Mostrar primera pregunta
            const firstQuestion = this.container.querySelector('.sfq-question-screen');
            if (firstQuestion) {
                this.showScreen(firstQuestion);
                this.updateProgress();
                // Asegurar que el botón siguiente se actualice correctamente
                this.updateNextButtonVisibility(firstQuestion);
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
                    console.log('Redirecting immediately to:', redirectResult.redirectUrl);
                    // Redirección inmediata
                    window.location.href = redirectResult.redirectUrl;
                    return;
                }

                // Si hay salto de pregunta, configurarlo
                if (redirectResult && redirectResult.skipToQuestion) {
                    this.skipToQuestion = redirectResult.skipToQuestion;
                }

                // Actualizar variables si las hay
                if (redirectResult && redirectResult.variables) {
                    this.variables = { ...this.variables, ...redirectResult.variables };
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
            console.log('Processing conditions for question:', questionId, 'answer:', element.dataset.value);
            
            // Obtener condiciones del elemento primero
            const conditions = element.dataset.conditions;
            
            if (conditions) {
                try {
                    const conditionsList = JSON.parse(conditions);
                    const localResult = this.evaluateConditionsForRedirect(conditionsList, questionId);
                    
                    if (localResult.shouldRedirect) {
                        return localResult;
                    }
                } catch (e) {
                    console.error('Error procesando condiciones locales:', e);
                }
            }
            
            // Siempre hacer petición AJAX para obtener condiciones del servidor
            try {
                const ajaxResult = await this.checkConditionsViaAjax(questionId, element.dataset.value);
                return ajaxResult;
            } catch (error) {
                console.error('Error en petición AJAX de condiciones:', error);
                return { shouldRedirect: false };
            }
        }

        evaluateConditionsForRedirect(conditions, questionId) {
            const answer = this.responses[questionId];
            const result = {
                shouldRedirect: false,
                redirectUrl: null,
                skipToQuestion: null,
                variables: {}
            };
            
            for (const condition of conditions) {
                if (this.evaluateConditionImmediate(condition, answer, questionId)) {
                    console.log('Condition matched:', condition);
                    
                    // Aplicar acción de la condición
                    switch (condition.action_type) {
                        case 'redirect_url':
                            console.log('Local condition: Redirecting to:', condition.action_value);
                            result.shouldRedirect = true;
                            result.redirectUrl = condition.action_value;
                            return result; // Retornar inmediatamente para redirección
                            
                        case 'add_variable':
                            const varName = condition.action_value;
                            const varAmount = parseInt(condition.variable_amount) || 1;
                            result.variables[varName] = (this.variables[varName] || 0) + varAmount;
                            break;
                            
                        case 'goto_question':
                            result.skipToQuestion = condition.action_value;
                            break;
                    }
                }
            }
            
            return result;
        }

        evaluateConditionImmediate(condition, answer, questionId) {
            switch (condition.condition_type) {
                case 'answer_equals':
                    return answer === condition.condition_value;
                    
                case 'answer_contains':
                    return answer && answer.toString().includes(condition.condition_value);
                    
                case 'variable_greater':
                    const varName = condition.condition_value;
                    const threshold = parseInt(condition.variable_amount) || 0;
                    return (this.variables[varName] || 0) > threshold;
                    
                case 'variable_less':
                    const varName2 = condition.condition_value;
                    const threshold2 = parseInt(condition.variable_amount) || 0;
                    return (this.variables[varName2] || 0) < threshold2;
                    
                case 'variable_equals':
                    const varName3 = condition.condition_value;
                    const value = parseInt(condition.variable_amount) || 0;
                    return (this.variables[varName3] || 0) === value;
                    
                default:
                    return false;
            }
        }

        async checkConditionsViaAjax(questionId, answer) {
            console.log('Checking conditions via AJAX for question:', questionId, 'answer:', answer);
            
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
                console.log('AJAX response:', ajaxResult);
                
                if (ajaxResult.success && ajaxResult.data) {
                    // Actualizar variables si las hay
                    if (ajaxResult.data.variables) {
                        result.variables = ajaxResult.data.variables;
                    }
                    
                    // Verificar redirección
                    if (ajaxResult.data.redirect_url) {
                        console.log('AJAX condition: Redirecting to:', ajaxResult.data.redirect_url);
                        result.shouldRedirect = true;
                        result.redirectUrl = ajaxResult.data.redirect_url;
                        return result;
                    }
                    
                    // Verificar salto de pregunta
                    if (ajaxResult.data.next_question_id) {
                        result.skipToQuestion = ajaxResult.data.next_question_id;
                    }
                } else {
                    console.warn('AJAX request failed or returned no data:', ajaxResult);
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

            // Buscar siguiente pregunta
            let nextQuestion = this.skipToQuestion ? 
                this.container.querySelector(`[data-question-id="${this.skipToQuestion}"]`) :
                currentQuestion.nextElementSibling;

            // Resetear skip
            this.skipToQuestion = null;

            // Si no hay más preguntas, mostrar pantalla final
            if (!nextQuestion || !nextQuestion.classList.contains('sfq-question-screen')) {
                this.submitForm();
                return;
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

            // Mostrar nueva pantalla con animación
            screen.classList.add('active', `slide-${direction}`);
            this.currentScreen = screen;

            // Controlar visibilidad del botón siguiente
            this.updateNextButtonVisibility(screen);

            // Hacer scroll al top
            this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
                    
                default:
                    return true;
            }
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

                console.log('Submitting form with responses:', this.responses);
                console.log('Variables:', this.variables);

                const response = await fetch(sfq_ajax.ajax_url, {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();
                console.log('Submit response:', result);

                if (result.success) {
                    // PRIORITY 1: Verificar si hay redirección condicional desde el resultado del servidor
                    if (result.data && result.data.redirect_url) {
                        console.log('Redirecting to conditional URL:', result.data.redirect_url);
                        window.location.href = result.data.redirect_url;
                        return;
                    }
                    
                    // PRIORITY 2: Verificar redirección configurada en el formulario
                    const configuredRedirectUrl = this.container.querySelector('#sfq-redirect-url-' + this.formId);
                    if (configuredRedirectUrl && configuredRedirectUrl.value) {
                        console.log('Redirecting to configured URL:', configuredRedirectUrl.value);
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
                    throw new Error(result.data?.message || 'Error al enviar el formulario');
                }
            } catch (error) {
                console.error('Error submitting form:', error);
                this.showError('Ha ocurrido un error al enviar el formulario. Por favor, intenta de nuevo.');
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
                <span class="sfq-processing-text">Procesando...</span>
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
`;
document.head.appendChild(style);
