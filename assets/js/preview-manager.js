/**
 * Smart Forms & Quiz - Preview Manager
 * Gestiona la previsualización flotante de preguntas y mensajes
 */

(function($) {
    'use strict';

    /**
     * PreviewManager - Controlador principal de previsualizaciones
     */
    class PreviewManager {
        constructor(formBuilder) {
            this.formBuilder = formBuilder;
            this.isEnabled = false;
            this.currentPreview = null;
            this.currentContext = null;
            this.debounceTimers = {};
            this.previewContainer = null;
            
            // Configuración
            this.config = {
                debounceDelay: 300,
                animationDuration: 250,
                offsetX: 20,
                offsetY: 0,
                minWidth: 300,
                maxWidth: 450
            };
            
            this.init();
        }

        init() {
            console.log('PreviewManager: Inicializando...');
            this.createPreviewContainer();
            this.bindEvents();
            this.checkIfEnabled();
            console.log('PreviewManager: Inicialización completa. Habilitado:', this.isEnabled);
        }

        createPreviewContainer() {
            // Crear contenedor principal de previsualización
            this.previewContainer = $(`
                <div class="sfq-preview-floating" id="sfq-preview-floating">
                    <div class="sfq-preview-header">
                        <span class="sfq-preview-title">Vista Previa</span>
                        <button class="sfq-preview-close" type="button">&times;</button>
                    </div>
                    <div class="sfq-preview-content">
                        <!-- El contenido se renderizará aquí -->
                    </div>
                    <div class="sfq-preview-footer">
                        <small class="sfq-preview-info">Previsualización en tiempo real</small>
                    </div>
                </div>
            `);
            
            // Añadir al body pero oculto inicialmente
            $('body').append(this.previewContainer);
            this.previewContainer.hide();
            
            // Bind close button
            this.previewContainer.find('.sfq-preview-close').on('click', () => {
                this.hidePreview();
            });
        }

        bindEvents() {
            const ns = '.preview-' + this.formBuilder.instanceId;
            
            // Eventos para campos de preguntas
            $(document).on('focus' + ns, '.sfq-question-text-input', (e) => {
                if (this.isEnabled) {
                    this.handleQuestionFocus(e);
                }
            });
            
            $(document).on('input' + ns, '.sfq-question-text-input', (e) => {
                if (this.isEnabled && this.currentContext === 'question') {
                    this.debounceUpdate('question-text', () => {
                        this.updateQuestionPreview(e.target);
                    });
                }
            });
            
            $(document).on('blur' + ns, '.sfq-question-text-input', (e) => {
                if (this.isEnabled) {
                    this.scheduleHidePreview();
                }
            });
            
            // Eventos para opciones de preguntas
            $(document).on('focus' + ns, '.sfq-option-input', (e) => {
                if (this.isEnabled) {
                    this.handleOptionFocus(e);
                }
            });
            
            $(document).on('input' + ns, '.sfq-option-input', (e) => {
                if (this.isEnabled && this.currentContext === 'question') {
                    this.debounceUpdate('question-options', () => {
                        this.updateQuestionPreview(e.target);
                    });
                }
            });
            
            // Eventos para campos de mensajes (tab configuración)
            $(document).on('focus' + ns, '#tab-limits input, #tab-limits textarea', (e) => {
                if (this.isEnabled) {
                    this.handleMessageFocus(e);
                }
            });
            
            $(document).on('input' + ns, '#tab-limits input, #tab-limits textarea', (e) => {
                if (this.isEnabled && this.currentContext === 'message') {
                    this.debounceUpdate('message-content', () => {
                        this.updateMessagePreview(e.target);
                    });
                }
            });
            
            $(document).on('blur' + ns, '#tab-limits input, #tab-limits textarea', (e) => {
                if (this.isEnabled) {
                    this.scheduleHidePreview();
                }
            });
            
            // Eventos para campos de bloqueo de formulario
            $(document).on('focus' + ns, '#tab-general #block-form-container input, #tab-general #block-form-container textarea', (e) => {
                if (this.isEnabled) {
                    this.handleBlockMessageFocus(e);
                }
            });
            
            $(document).on('input' + ns, '#tab-general #block-form-container input, #tab-general #block-form-container textarea', (e) => {
                if (this.isEnabled && this.currentContext === 'block-message') {
                    this.debounceUpdate('block-message-content', () => {
                        this.updateBlockMessagePreview(e.target);
                    });
                }
            });
            
            // Evento para activar/desactivar previsualización
            $(document).on('change' + ns, '#enable-floating-preview', (e) => {
                this.togglePreview($(e.target).is(':checked'));
            });
            
            // Limpiar al cambiar de tab
            $(document).on('click' + ns, '.sfq-tab-button', () => {
                this.hidePreview();
            });
            
            // Limpiar al hacer scroll
            $(window).on('scroll' + ns, () => {
                if (this.currentPreview) {
                    this.updatePosition();
                }
            });
            
            // Limpiar al redimensionar
            $(window).on('resize' + ns, () => {
                if (this.currentPreview) {
                    this.updatePosition();
                }
            });
        }

        checkIfEnabled() {
            // Verificar si la previsualización está habilitada en la configuración
            const enabledCheckbox = $('#enable-floating-preview');
            if (enabledCheckbox.length && enabledCheckbox.is(':checked')) {
                this.isEnabled = true;
                console.log('PreviewManager: Previsualización habilitada');
            } else {
                this.isEnabled = false;
                console.log('PreviewManager: Previsualización deshabilitada');
            }
        }

        togglePreview(enabled) {
            this.isEnabled = enabled;
            console.log('PreviewManager: Toggle preview to', enabled);
            if (!enabled) {
                this.hidePreview();
            }
        }

        handleQuestionFocus(e) {
            console.log('PreviewManager: Question focus detected', e.target);
            const input = $(e.target);
            const questionContainer = input.closest('.sfq-question-item');
            
            console.log('PreviewManager: Question container found:', questionContainer.length > 0);
            
            if (questionContainer.length) {
                this.currentContext = 'question';
                console.log('PreviewManager: Showing question preview');
                this.showQuestionPreview(questionContainer, input);
            }
        }

        handleOptionFocus(e) {
            const input = $(e.target);
            const questionContainer = input.closest('.sfq-question-item');
            
            if (questionContainer.length) {
                this.currentContext = 'question';
                this.showQuestionPreview(questionContainer, input);
            }
        }

        handleMessageFocus(e) {
            const input = $(e.target);
            this.currentContext = 'message';
            this.showMessagePreview(input);
        }

        handleBlockMessageFocus(e) {
            const input = $(e.target);
            this.currentContext = 'block-message';
            this.showBlockMessagePreview(input);
        }

        showQuestionPreview(questionContainer, focusedInput) {
            const questionType = questionContainer.data('type');
            const questionId = questionContainer.attr('id');
            
            // Obtener datos de la pregunta
            const questionData = this.extractQuestionData(questionContainer);
            
            // Renderizar previsualización
            const previewHtml = this.renderQuestionPreview(questionData);
            
            // Mostrar previsualización
            this.showPreview(previewHtml, focusedInput, 'left');
            
            // Actualizar título
            this.previewContainer.find('.sfq-preview-title').text('Vista Previa - Pregunta');
        }

        showMessagePreview(focusedInput) {
            const messageType = this.detectMessageType(focusedInput);
            const messageData = this.extractMessageData(focusedInput, messageType);
            
            // Renderizar previsualización
            const previewHtml = this.renderMessagePreview(messageData, messageType);
            
            // Mostrar previsualización
            this.showPreview(previewHtml, focusedInput, 'right');
            
            // Actualizar título
            this.previewContainer.find('.sfq-preview-title').text('Vista Previa - Mensaje');
        }

        showBlockMessagePreview(focusedInput) {
            const messageData = this.extractBlockMessageData();
            
            // Renderizar previsualización
            const previewHtml = this.renderBlockMessagePreview(messageData);
            
            // Mostrar previsualización
            this.showPreview(previewHtml, focusedInput, 'right');
            
            // Actualizar título
            this.previewContainer.find('.sfq-preview-title').text('Vista Previa - Bloqueo');
        }

        showPreview(content, referenceElement, preferredSide = 'left') {
            console.log('PreviewManager: showPreview called with content:', content.substring(0, 100) + '...');
            console.log('PreviewManager: previewContainer exists:', !!this.previewContainer);
            
            if (!this.previewContainer) {
                console.error('PreviewManager: previewContainer is null!');
                return;
            }
            
            // Actualizar contenido
            this.previewContainer.find('.sfq-preview-content').html(content);
            console.log('PreviewManager: Content updated');
            
            // Calcular posición
            const position = this.calculatePosition(referenceElement, preferredSide);
            console.log('PreviewManager: Position calculated:', position);
            
            // Aplicar posición y mostrar
            this.previewContainer.css({
                position: 'fixed',
                left: position.left + 'px',
                top: position.top + 'px',
                zIndex: 10000,
                display: 'block',
                visibility: 'visible',
                opacity: '1'
            });
            
            this.previewContainer.fadeIn(this.config.animationDuration);
            
            this.currentPreview = referenceElement;
            
            // Cancelar cualquier timer de ocultación pendiente
            if (this.hideTimer) {
                clearTimeout(this.hideTimer);
                this.hideTimer = null;
            }
        }

        hidePreview() {
            if (this.previewContainer && this.previewContainer.is(':visible')) {
                this.previewContainer.fadeOut(this.config.animationDuration);
            }
            this.currentPreview = null;
            this.currentContext = null;
        }

        scheduleHidePreview() {
            // Programar ocultación con delay para permitir hover sobre la previsualización
            this.hideTimer = setTimeout(() => {
                this.hidePreview();
            }, 500);
        }

        calculatePosition(referenceElement, preferredSide) {
            const windowWidth = $(window).width();
            const windowHeight = $(window).height();
            const previewWidth = 380; // Ancho fijo de la previsualización
            
            let left, top = 80; // Top fijo desde arriba
            
            if (preferredSide === 'left') {
                // Posicionar a la izquierda de la pantalla
                left = 20;
            } else {
                // Posicionar a la derecha de la pantalla
                left = windowWidth - previewWidth - 20;
            }
            
            // Asegurar que no se salga de los límites
            left = Math.max(20, Math.min(left, windowWidth - previewWidth - 20));
            
            return { left: left, top: top };
        }

        updatePosition() {
            if (this.currentPreview) {
                const position = this.calculatePosition(this.currentPreview, this.currentContext === 'question' ? 'left' : 'right');
                this.previewContainer.css({
                    left: position.left + 'px',
                    top: position.top + 'px'
                });
            }
        }

        extractQuestionData(questionContainer) {
            const questionText = questionContainer.find('.sfq-question-text-input').val() || 'Escribe tu pregunta aquí...';
            const questionType = questionContainer.data('type');
            const isRequired = questionContainer.find('.sfq-required-checkbox').is(':checked');
            
            let options = [];
            if (['single_choice', 'multiple_choice', 'image_choice'].includes(questionType)) {
                questionContainer.find('.sfq-option-input').each(function() {
                    const optionText = $(this).val();
                    if (optionText) {
                        options.push(optionText);
                    }
                });
                
                // Si no hay opciones, mostrar placeholders
                if (options.length === 0) {
                    options = ['Opción 1', 'Opción 2'];
                }
            }
            
            return {
                text: questionText,
                type: questionType,
                required: isRequired,
                options: options
            };
        }

        extractMessageData(focusedInput, messageType) {
            const inputId = focusedInput.attr('id');
            
            // Datos base del mensaje
            const data = {
                type: messageType,
                icon: '',
                title: '',
                description: '',
                buttonText: '',
                buttonUrl: ''
            };
            
            // Extraer datos según el tipo de mensaje
            switch (messageType) {
                case 'submission_limit':
                    data.icon = $('#limit-submission-icon').val() || '❌';
                    data.title = $('#limit-submission-title').val() || 'Límite de envíos alcanzado';
                    data.description = $('#limit-submission-description').val() || 'Has alcanzado el límite de envíos para este formulario.';
                    data.buttonText = $('#limit-submission-button-text').val() || 'Volver más tarde';
                    data.buttonUrl = $('#limit-submission-button-url').val() || '';
                    break;
                    
                case 'max_participants':
                    data.icon = $('#limit-participants-icon').val() || 'ℹ️';
                    data.title = $('#limit-participants-title').val() || 'Formulario completo';
                    data.description = $('#max-submissions-message').val() || 'Este formulario ha alcanzado el límite máximo de respuestas.';
                    data.buttonText = $('#limit-participants-button-text').val() || 'Ver otros formularios';
                    data.buttonUrl = $('#limit-participants-button-url').val() || '';
                    break;
                    
                case 'login_required':
                    data.icon = $('#limit-login-icon').val() || '🔒';
                    data.title = $('#limit-login-title').val() || 'Inicio de sesión requerido';
                    data.description = $('#limit-login-description').val() || 'Debes iniciar sesión para completar este formulario.';
                    data.buttonText = $('#limit-login-button-text').val() || 'Iniciar Sesión';
                    data.buttonUrl = '';
                    break;
                    
                case 'schedule':
                    data.icon = $('#limit-schedule-icon').val() || '🕐';
                    data.title = $('#limit-schedule-not-started-title').val() || 'Formulario no disponible aún';
                    data.description = $('#schedule-not-started-message').val() || 'Este formulario aún no está disponible.';
                    data.buttonText = $('#limit-schedule-button-text').val() || 'Volver al inicio';
                    data.buttonUrl = $('#limit-schedule-button-url').val() || '';
                    break;
            }
            
            return data;
        }

        extractBlockMessageData() {
            return {
                icon: $('#block-form-icon').val() || '🚫',
                title: $('#block-form-title').val() || 'Formulario temporalmente bloqueado',
                description: $('#block-form-description').val() || 'Este formulario está temporalmente fuera de servicio. Disculpa las molestias.',
                buttonText: $('#block-form-button-text').val() || 'Volver más tarde',
                buttonUrl: $('#block-form-button-url').val() || '',
                videoUrl: $('#block-form-video-url').val() || '',
                timerEnabled: $('#block-form-enable-timer').is(':checked'),
                timerDate: $('#block-form-timer-date').val() || '',
                timerText: $('#block-form-timer-text').val() || 'El formulario se abrirá en:'
            };
        }

        detectMessageType(focusedInput) {
            const inputId = focusedInput.attr('id');
            
            if (inputId.includes('limit-submission')) {
                return 'submission_limit';
            } else if (inputId.includes('limit-participants') || inputId.includes('max-submissions')) {
                return 'max_participants';
            } else if (inputId.includes('limit-login')) {
                return 'login_required';
            } else if (inputId.includes('limit-schedule') || inputId.includes('schedule-')) {
                return 'schedule';
            }
            
            return 'generic';
        }

        renderQuestionPreview(questionData) {
            const styles = this.getFormStyles();
            
            // Estructura exacta del frontend con fondo aplicado
            let html = `<div class="sfq-preview-question-content" style="background: ${styles.backgroundColor}; padding: 20px; border-radius: ${styles.borderRadius};">`;
            
            // Número de pregunta (opcional)
            html += `<div class="sfq-preview-question-number" style="color: ${styles.secondaryColor};">Pregunta 1</div>`;
            
            // Título de la pregunta con estilo exacto del frontend
            html += `<div class="sfq-preview-question-text" style="color: ${styles.textColor}; background: transparent;">
                ${this.escapeHtml(questionData.text)}
                ${questionData.required ? '<span class="sfq-required" style="color: #e74c3c;">*</span>' : ''}
            </div>`;
            
            // Contenedor de respuestas
            html += `<div class="sfq-preview-answer-container">`;
            
            // Renderizar según tipo
            switch (questionData.type) {
                case 'single_choice':
                    html += this.renderSingleChoiceOptions(questionData.options, styles);
                    break;
                case 'multiple_choice':
                    html += this.renderMultipleChoiceOptions(questionData.options, styles);
                    break;
                case 'text':
                case 'email':
                    html += this.renderTextInput(questionData.type, styles);
                    break;
                case 'rating':
                    html += this.renderRatingInput(styles);
                    break;
                default:
                    html += `<div class="sfq-preview-generic">Tipo de pregunta: ${questionData.type}</div>`;
            }
            
            html += `</div>`; // Cerrar answer-container
            html += `</div>`; // Cerrar question-content
            return html;
        }

        renderSingleChoiceOptions(options, styles) {
            let html = `<div class="sfq-options-grid" style="display: grid; gap: 1rem; grid-template-columns: 1fr;">`;
            options.forEach((option, index) => {
                html += `
                    <div class="sfq-option-card" style="
                        background: ${styles.optionsBackgroundColor};
                        border: 2px solid #e0e0e0;
                        border-radius: ${styles.borderRadius};
                        padding: 1.25rem 1.5rem;
                        cursor: pointer;
                        transition: ${styles.transition};
                        position: relative;
                        display: flex;
                        align-items: center;
                        gap: 1rem;
                        box-shadow: ${styles.shadow};
                        font-size: 1.1rem;
                        font-weight: 500;
                        color: ${styles.textColor};
                    ">
                        <input type="radio" class="sfq-hidden-input" style="position: absolute; opacity: 0; pointer-events: none;">
                        <span class="sfq-option-text" style="font-size: 1.1rem; font-weight: 500; flex: 1;">
                            ${this.escapeHtml(option)}
                        </span>
                    </div>
                `;
            });
            html += `</div>`;
            return html;
        }

        renderMultipleChoiceOptions(options, styles) {
            let html = `<div class="sfq-options-grid" style="display: grid; gap: 1rem; grid-template-columns: 1fr;">`;
            options.forEach((option, index) => {
                html += `
                    <div class="sfq-option-card sfq-checkbox-card" style="
                        background: ${styles.optionsBackgroundColor};
                        border: 2px solid #e0e0e0;
                        border-radius: ${styles.borderRadius};
                        padding: 1rem 1.25rem;
                        cursor: pointer;
                        transition: ${styles.transition};
                        position: relative;
                        display: flex;
                        align-items: center;
                        gap: 1rem;
                        box-shadow: ${styles.shadow};
                    ">
                        <div class="sfq-checkbox-wrapper" style="display: flex; align-items: center; width: 100%;">
                            <input type="checkbox" class="sfq-checkbox-input" style="display: none;">
                            <label style="display: flex; align-items: center; gap: 1rem; cursor: pointer; width: 100%;">
                                <div class="sfq-checkbox-box" style="
                                    width: 24px;
                                    height: 24px;
                                    border: 2px solid #d0d0d0;
                                    border-radius: 6px;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    transition: ${styles.transition};
                                    flex-shrink: 0;
                                ">
                                    <svg class="sfq-checkbox-icon" style="
                                        width: 16px;
                                        height: 16px;
                                        fill: white;
                                        opacity: 0;
                                        transform: scale(0);
                                        transition: ${styles.transition};
                                    " viewBox="0 0 24 24">
                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                    </svg>
                                </div>
                                <span style="font-size: 1.1rem; font-weight: 500; color: ${styles.textColor};">
                                    ${this.escapeHtml(option)}
                                </span>
                            </label>
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
            return html;
        }

        renderTextInput(type, styles) {
            const placeholder = type === 'email' ? 'tu@email.com' : 'Escribe tu respuesta aquí...';
            return `
                <div class="sfq-preview-text-input">
                    <input type="text" class="sfq-preview-text-field" placeholder="${placeholder}" readonly>
                    <div class="sfq-preview-input-line"></div>
                </div>
            `;
        }

        renderRatingInput(styles) {
            let html = `<div class="sfq-preview-rating">`;
            for (let i = 1; i <= 5; i++) {
                html += `<span class="sfq-preview-star" style="color: ${styles.primaryColor};">★</span>`;
            }
            html += `</div>`;
            return html;
        }

        renderMessagePreview(messageData, messageType) {
            const styles = this.getMessageStyles(messageType);
            
            let html = `<div class="sfq-preview-message-container" style="
                background-color: ${styles.backgroundColor};
                border-color: ${styles.borderColor};
                border-radius: 8px;
                padding: 20px;
                text-align: center;
            ">`;
            
            // Icono
            if (messageData.icon) {
                html += `<div class="sfq-preview-message-icon" style="
                    font-size: 32px;
                    margin-bottom: 12px;
                    color: ${styles.iconColor};
                ">${this.processIcon(messageData.icon)}</div>`;
            }
            
            // Título
            if (messageData.title) {
                html += `<h3 class="sfq-preview-message-title" style="
                    color: ${styles.titleColor};
                    margin: 0 0 8px 0;
                    font-size: 18px;
                    font-weight: 600;
                ">${this.escapeHtml(messageData.title)}</h3>`;
            }
            
            // Descripción
            if (messageData.description) {
                html += `<p class="sfq-preview-message-description" style="
                    color: ${styles.textColor};
                    margin: 0 0 16px 0;
                    line-height: 1.4;
                ">${this.escapeHtml(messageData.description)}</p>`;
            }
            
            // Botón
            if (messageData.buttonText) {
                html += `<button class="sfq-preview-message-button" style="
                    background-color: ${styles.buttonBgColor};
                    color: ${styles.buttonTextColor};
                    border: none;
                    padding: 10px 20px;
                    border-radius: 6px;
                    font-weight: 500;
                    cursor: pointer;
                ">${this.escapeHtml(messageData.buttonText)}</button>`;
            }
            
            html += `</div>`;
            return html;
        }

        renderBlockMessagePreview(messageData) {
            const styles = this.getBlockMessageStyles();
            
            let html = `<div class="sfq-preview-block-container" style="
                background-color: ${styles.backgroundColor};
                border-color: ${styles.borderColor};
                border-radius: 8px;
                padding: 20px;
                text-align: center;
            ">`;
            
            // Video (si existe)
            if (messageData.videoUrl) {
                html += `<div class="sfq-preview-video" style="
                    margin-bottom: 16px;
                    padding: 40px;
                    background: #f0f0f0;
                    border-radius: 6px;
                    color: #666;
                    font-size: 14px;
                ">📹 Video: ${this.escapeHtml(messageData.videoUrl)}</div>`;
            }
            
            // Icono
            if (messageData.icon) {
                html += `<div class="sfq-preview-block-icon" style="
                    font-size: 32px;
                    margin-bottom: 12px;
                    color: ${styles.iconColor};
                ">${this.processIcon(messageData.icon)}</div>`;
            }
            
            // Timer (si está habilitado)
            if (messageData.timerEnabled && messageData.timerDate) {
                html += `<div class="sfq-preview-timer" style="
                    margin-bottom: 16px;
                    padding: 12px;
                    background: ${styles.timerContainerBgColor};
                    border: 1px solid ${styles.timerContainerBorderColor};
                    border-radius: 6px;
                ">`;
                
                if (messageData.timerText) {
                    html += `<p style="margin: 0 0 8px 0; color: ${styles.textColor};">${this.escapeHtml(messageData.timerText)}</p>`;
                }
                
                html += `<div class="sfq-preview-countdown" style="
                    display: flex;
                    justify-content: center;
                    gap: 8px;
                ">`;
                
                ['Días', 'Horas', 'Min', 'Seg'].forEach(unit => {
                    html += `<div class="sfq-preview-timer-unit" style="
                        background: ${styles.timerUnitBgColor};
                        border: 1px solid ${styles.timerUnitBorderColor};
                        border-radius: 4px;
                        padding: 8px;
                        min-width: 40px;
                        text-align: center;
                    ">
                        <div style="font-weight: bold; color: ${styles.textColor};">00</div>
                        <div style="font-size: 10px; color: ${styles.textColor};">${unit}</div>
                    </div>`;
                });
                
                html += `</div></div>`;
            }
            
            // Título
            if (messageData.title) {
                html += `<h3 style="
                    color: ${styles.titleColor};
                    margin: 0 0 8px 0;
                    font-size: 18px;
                    font-weight: 600;
                ">${this.escapeHtml(messageData.title)}</h3>`;
            }
            
            // Descripción
            if (messageData.description) {
                html += `<p style="
                    color: ${styles.textColor};
                    margin: 0 0 16px 0;
                    line-height: 1.4;
                ">${this.escapeHtml(messageData.description)}</p>`;
            }
            
            // Botón
            if (messageData.buttonText) {
                html += `<button style="
                    background-color: ${styles.buttonBgColor};
                    color: ${styles.buttonTextColor};
                    border: none;
                    padding: 10px 20px;
                    border-radius: 6px;
                    font-weight: 500;
                    cursor: pointer;
                ">${this.escapeHtml(messageData.buttonText)}</button>`;
            }
            
            html += `</div>`;
            return html;
        }

        getFormStyles() {
            // Obtener colores desde la pestaña "Estilo" (tab-style)
            const primaryColor = $('#primary-color').val() || '#007cba';
            const secondaryColor = $('#secondary-color').val() || '#6c757d';
            const backgroundColor = $('#background-color').val() || '#ffffff';
            const optionsBackgroundColor = $('#options-background-color').val() || '#ffffff';
            const textColor = $('#text-color').val() || '#333333';
            const borderRadius = $('#border-radius').val() || '12';
            const fontFamily = $('#font-family').val() || 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
            
            return {
                primaryColor: primaryColor,
                secondaryColor: secondaryColor,
                backgroundColor: backgroundColor,
                optionsBackgroundColor: optionsBackgroundColor,
                textColor: textColor,
                borderColor: '#e0e0e0',
                borderRadius: borderRadius + 'px',
                fontFamily: fontFamily,
                shadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                shadowHover: '0 4px 16px rgba(0, 0, 0, 0.15)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            };
        }

        getMessageStyles(messageType) {
            return {
                backgroundColor: $('#limit-background-color').val() || '#f8f9fa',
                borderColor: $('#limit-border-color').val() || '#e9ecef',
                iconColor: $('#limit-icon-color').val() || '#6c757d',
                titleColor: $('#limit-title-color').val() || '#333333',
                textColor: $('#limit-text-color').val() || '#666666',
                buttonBgColor: $('#limit-button-bg-color').val() || '#007cba',
                buttonTextColor: $('#limit-button-text-color').val() || '#ffffff'
            };
        }

        getBlockMessageStyles() {
            return {
                backgroundColor: $('#block-form-bg-color').val() || '#f8f9fa',
                borderColor: $('#block-form-border-color').val() || '#e9ecef',
                iconColor: $('#block-form-icon-color').val() || '#dc3545',
                titleColor: $('#block-form-title-color').val() || '#333333',
                textColor: $('#block-form-text-color').val() || '#666666',
                buttonBgColor: $('#block-form-button-bg-color').val() || '#007cba',
                buttonTextColor: $('#block-form-button-text-color').val() || '#ffffff',
                timerUnitBgColor: $('#block-form-timer-unit-bg-color').val() || '#ffffff',
                timerContainerBgColor: $('#block-form-timer-container-bg-color').val() || '#f8f9fa',
                timerContainerBorderColor: $('#block-form-timer-container-border-color').val() || '#e9ecef',
                timerUnitBorderColor: $('#block-form-timer-unit-border-color').val() || '#e9ecef'
            };
        }

        processIcon(iconText) {
            if (!iconText) return '';
            
            // Si es una URL de imagen
            if (iconText.startsWith('http') && (iconText.includes('.png') || iconText.includes('.jpg') || iconText.includes('.gif') || iconText.includes('.svg'))) {
                return `<img src="${iconText}" alt="Icon" style="max-width: 32px; max-height: 32px;">`;
            }
            
            // Si es SVG
            if (iconText.includes('<svg')) {
                return iconText;
            }
            
            // Si es emoji o texto
            return iconText;
        }

        updateQuestionPreview(target) {
            if (!this.currentPreview) return;
            
            const questionContainer = $(target).closest('.sfq-question-item');
            if (questionContainer.length) {
                const questionData = this.extractQuestionData(questionContainer);
                const previewHtml = this.renderQuestionPreview(questionData);
                this.previewContainer.find('.sfq-preview-content').html(previewHtml);
            }
        }

        updateMessagePreview(target) {
            if (!this.currentPreview) return;
            
            const messageType = this.detectMessageType($(target));
            const messageData = this.extractMessageData($(target), messageType);
            const previewHtml = this.renderMessagePreview(messageData, messageType);
            this.previewContainer.find('.sfq-preview-content').html(previewHtml);
        }

        updateBlockMessagePreview(target) {
            if (!this.currentPreview) return;
            
            const messageData = this.extractBlockMessageData();
            const previewHtml = this.renderBlockMessagePreview(messageData);
            this.previewContainer.find('.sfq-preview-content').html(previewHtml);
        }

        debounceUpdate(key, callback) {
            if (this.debounceTimers[key]) {
                clearTimeout(this.debounceTimers[key]);
            }
            
            this.debounceTimers[key] = setTimeout(() => {
                callback();
                delete this.debounceTimers[key];
            }, this.config.debounceDelay);
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

        destroy() {
            const ns = '.preview-' + this.formBuilder.instanceId;
            
            // Limpiar event listeners
            $(document).off(ns);
            $(window).off(ns);
            
            // Limpiar timers
            Object.values(this.debounceTimers).forEach(timer => clearTimeout(timer));
            this.debounceTimers = {};
            
            if (this.hideTimer) {
                clearTimeout(this.hideTimer);
                this.hideTimer = null;
            }
            
            // Remover contenedor
            if (this.previewContainer) {
                this.previewContainer.remove();
                this.previewContainer = null;
            }
            
            // Limpiar referencias
            this.currentPreview = null;
            this.currentContext = null;
        }
    }

    // Exponer clase globalmente
    window.PreviewManager = PreviewManager;

})(jQuery);
