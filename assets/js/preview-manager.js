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
            this.isEnabled = true;
            this.currentPreview = null;
            this.currentContext = null;
            this.debounceTimers = {};
            this.previewContainer = null;
            this.isMinimized = true;
            this.isDragging = false;
            this.dragOffset = { x: 0, y: 0 };
            this.minimizedButton = null;
            this.lastPosition = null; // Para recordar la última posición
            
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
            this.createPreviewContainer();
            this.bindEvents();
            this.checkIfEnabled();
            this.showRestoreButton(); // Siempre mostrar el botón de restaurar
        }

        createPreviewContainer() {
            // Crear contenedor principal de previsualización
            this.previewContainer = $(`
                <div class="sfq-preview-floating" id="sfq-preview-floating">
                    <div class="sfq-preview-header sfq-draggable-handle">
                        <span class="sfq-preview-title">Vista Previa</span>
                        <div class="sfq-preview-controls">
                            <button class="sfq-preview-minimize" type="button" title="Minimizar">−</button>
                            <button class="sfq-preview-close" type="button" title="Cerrar">&times;</button>
                        </div>
                    </div>
                    <div class="sfq-preview-content">
                        <!-- El contenido se renderizará aquí -->
                    </div>
                    <div class="sfq-preview-footer">
                        <small class="sfq-preview-info">Previsualización en tiempo real • Arrastra para mover</small>
                    </div>
                </div>
            `);
            
            // Crear botón minimizado
            this.minimizedButton = $(`
                <div class="sfq-preview-minimized" id="sfq-preview-minimized">
                    <button class="sfq-preview-restore" type="button" title="Mostrar previsualización">
                        <span class="dashicons dashicons-visibility"></span>
                        Vista Previa en Vivo
                    </button>
                </div>
            `);
            
            // Añadir al body pero ocultos inicialmente
            $('body').append(this.previewContainer);
            $('body').append(this.minimizedButton);
            this.previewContainer.hide();
            this.minimizedButton.show();
            
            // Bind eventos de control
            this.bindPreviewControls();
            this.makeDraggable();
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
            
            // Removido: ya no ocultamos automáticamente al hacer blur
            // La previsualización ahora es persistente hasta que el usuario la cierre o minimice
            
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
            
            // NUEVOS EVENTOS PARA CAMPOS DE ESTILO
            // Eventos para campos de color y estilos en tab-style
            $(document).on('focus' + ns, '#tab-style input, #tab-style select', (e) => {
                if (this.isEnabled) {
                    this.handleStyleFocus(e);
                }
            });
            
            // Eventos para color pickers (WordPress wp-color-picker)
            $(document).on('change' + ns, '#tab-style .sfq-color-picker', (e) => {
                if (this.isEnabled && this.currentContext === 'style') {
                    this.debounceUpdate('style-colors', () => {
                        this.updateStylePreview();
                    });
                }
            });
            
            // Eventos para range slider (border-radius)
            $(document).on('input' + ns, '#tab-style #border-radius', (e) => {
                if (this.isEnabled && this.currentContext === 'style') {
                    this.debounceUpdate('style-border-radius', () => {
                        this.updateStylePreview();
                    });
                }
            });
            
            // Eventos para select de fuente
            $(document).on('change' + ns, '#tab-style #font-family', (e) => {
                if (this.isEnabled && this.currentContext === 'style') {
                    this.debounceUpdate('style-font', () => {
                        this.updateStylePreview();
                    });
                }
            });
            
            // Eventos específicos para WordPress Color Picker
            $(document).on('wpcolorpickerchange' + ns, '#tab-style .sfq-color-picker', (e) => {
                if (this.isEnabled && this.currentContext === 'style') {
                    this.debounceUpdate('style-colors-wp', () => {
                        this.updateStylePreview();
                    });
                }
            });
            
            // Eventos para elementos internos del WordPress Color Picker
            $(document).on('click' + ns, '.wp-picker-holder, .iris-picker, .iris-picker-inner, .iris-square, .iris-square-inner, .iris-strip, .iris-slider', (e) => {
                if (this.isEnabled) {
                    // Mantener el contexto de estilo activo
                    this.currentContext = 'style';
                    
                    // Cancelar cualquier timer de ocultación
                    if (this.hideTimer) {
                        clearTimeout(this.hideTimer);
                        this.hideTimer = null;
                    }
                    
                    // Actualizar previsualización después de un pequeño delay para que el color se aplique
                    setTimeout(() => {
                        if (this.currentContext === 'style') {
                            this.updateStylePreview();
                        }
                    }, 50);
                }
            });
            
            // Eventos para cambios en tiempo real del iris picker
            $(document).on('irischange' + ns, '#tab-style .sfq-color-picker', (e) => {
                if (this.isEnabled && this.currentContext === 'style') {
                    this.debounceUpdate('style-colors-iris', () => {
                        this.updateStylePreview();
                    });
                }
            });
            
            // Eventos para el selector de fuente
            $(document).on('click' + ns, '#tab-style .sfq-select', (e) => {
                if (this.isEnabled) {
                    this.currentContext = 'style';
                    
                    // Cancelar timer de ocultación
                    if (this.hideTimer) {
                        clearTimeout(this.hideTimer);
                        this.hideTimer = null;
                    }
                    
                    // Mostrar previsualización si no está visible
                    if (!this.currentPreview) {
                        this.showStylePreview($(e.target));
                    }
                }
            });
            
            // ✅ NUEVO: Eventos específicos para campos de imagen de fondo
            $(document).on('focus' + ns, '#background-image-url, #background-size, #background-repeat, #background-position, #background-attachment', (e) => {
                if (this.isEnabled) {
                    this.handleStyleFocus(e);
                }
            });
            
            $(document).on('input change' + ns, '#background-image-url, #background-size, #background-repeat, #background-position, #background-attachment', (e) => {
                if (this.isEnabled && this.currentContext === 'style') {
                    this.debounceUpdate('style-background-image', () => {
                        this.updateStylePreview();
                    });
                }
            });
            
            // ✅ NUEVO: Eventos para sliders de opacidad
            $(document).on('focus' + ns, '.sfq-opacity-control', (e) => {
                if (this.isEnabled) {
                    this.handleStyleFocus(e);
                }
            });
            
            $(document).on('input' + ns, '.sfq-opacity-control', (e) => {
                if (this.isEnabled && this.currentContext === 'style') {
                    this.debounceUpdate('style-opacity', () => {
                        this.updateStylePreview();
                    });
                }
            });
            
            // ✅ NUEVO: Eventos para opacidad de imagen de fondo
            $(document).on('input' + ns, '#background-opacity', (e) => {
                if (this.isEnabled && this.currentContext === 'style') {
                    this.debounceUpdate('style-background-opacity', () => {
                        this.updateStylePreview();
                    });
                }
            });
            
            // ✅ NUEVO: Eventos para overlay de imagen de fondo
            $(document).on('change' + ns, '#background-overlay', (e) => {
                if (this.isEnabled && this.currentContext === 'style') {
                    this.debounceUpdate('style-background-overlay', () => {
                        this.updateStylePreview();
                    });
                }
            });
            
            $(document).on('input' + ns, '#background-overlay-opacity', (e) => {
                if (this.isEnabled && this.currentContext === 'style') {
                    this.debounceUpdate('style-background-overlay-opacity', () => {
                        this.updateStylePreview();
                    });
                }
            });
            
            $(document).on('change' + ns, '#background-overlay-color', (e) => {
                if (this.isEnabled && this.currentContext === 'style') {
                    this.debounceUpdate('style-background-overlay-color', () => {
                        this.updateStylePreview();
                    });
                }
            });
            
            // ✅ NUEVO: Eventos para botones de imagen de fondo
            $(document).on('click' + ns, '#select-background-image, #remove-background-image', (e) => {
                if (this.isEnabled) {
                    this.currentContext = 'style';
                    
                    // Cancelar timer de ocultación
                    if (this.hideTimer) {
                        clearTimeout(this.hideTimer);
                        this.hideTimer = null;
                    }
                    
                    // Mostrar previsualización si no está visible
                    if (!this.currentPreview) {
                        this.showStylePreview($(e.target));
                    }
                    
                    // Actualizar después de un pequeño delay para que los cambios se apliquen
                    setTimeout(() => {
                        if (this.currentContext === 'style') {
                            this.updateStylePreview();
                        }
                    }, 100);
                }
            });
            
            $(document).on('blur' + ns, '#tab-style input, #tab-style select', (e) => {
                // Solo ocultar si no se está interactuando con el color picker
                if (this.isEnabled && !$(e.relatedTarget).closest('.wp-picker-container, .wp-picker-holder').length) {
                    this.scheduleHidePreview();
                }
            });
            
            // Evento para activar/desactivar previsualización
            $(document).on('change' + ns, '#enable-floating-preview', (e) => {
                this.togglePreview($(e.target).is(':checked'));
            });
            
            // Limpiar al cambiar de tab
           // $(document).on('click' + ns, '.sfq-tab-button', () => {
          //      this.hidePreview();
          //  });
            
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
            } else {
                this.isEnabled = false;
            }
            
            // IMPORTANTE: El botón de restaurar siempre se muestra, independientemente del estado del checkbox
            // Esto permite que el usuario pueda activar la previsualización haciendo clic en el botón
        }

        togglePreview(enabled) {
            this.isEnabled = enabled;
            if (!enabled) {
                this.hidePreview();
            }
        }

        handleQuestionFocus(e) {
            const input = $(e.target);
            const questionContainer = input.closest('.sfq-question-item');
            
            
            if (questionContainer.length) {
                this.currentContext = 'question';
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

        handleStyleFocus(e) {
            const input = $(e.target);
            this.currentContext = 'style';
            this.showStylePreview(input);
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

        showStylePreview(focusedInput) {
            
            // Crear una pregunta de ejemplo para mostrar los estilos
            const sampleQuestionData = {
                text: 'Pregunta de ejemplo para mostrar estilos',
                type: 'single_choice',
                required: true,
                options: ['Opción 1', 'Opción 2', 'Opción 3']
            };
            
            // Renderizar previsualización con los estilos actuales
            const previewHtml = this.renderQuestionPreview(sampleQuestionData);
            
            // Mostrar previsualización a la DERECHA (como solicita el usuario)
            this.showPreview(previewHtml, focusedInput, 'right');
            
            // Actualizar título
            this.previewContainer.find('.sfq-preview-title').text('Vista Previa - Estilos');
        }

        showPreview(content, referenceElement, preferredSide = 'left') {
            
            if (!this.previewContainer) {
                return;
            }
            
            // Actualizar contenido
            this.previewContainer.find('.sfq-preview-content').html(content);
            
            // Calcular posición
            const position = this.calculatePosition(referenceElement, preferredSide);
            
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
            const previewHeight = 400; // Altura estimada de la previsualización
            const margin = 20; // Margen mínimo desde los bordes
            
            // Obtener posición y dimensiones del elemento de referencia
            const elementOffset = referenceElement.offset();
            const elementWidth = referenceElement.outerWidth();
            const elementHeight = referenceElement.outerHeight();
            
            let left, top;
            
            if (preferredSide === 'left') {
                // Intentar posicionar a la izquierda del elemento
                left = elementOffset.left - previewWidth - margin;
                
                // Si no cabe a la izquierda, ponerlo a la derecha
                if (left < margin) {
                    left = elementOffset.left + elementWidth + margin;
                }
                
                // Si tampoco cabe a la derecha, centrarlo en la pantalla
                if (left + previewWidth > windowWidth - margin) {
                    left = (windowWidth - previewWidth) / 2;
                }
            } else {
                // Intentar posicionar a la derecha del elemento
                left = elementOffset.left + elementWidth + margin;
                
                // Si no cabe a la derecha, ponerlo a la izquierda
                if (left + previewWidth > windowWidth - margin) {
                    left = elementOffset.left - previewWidth - margin;
                }
                
                // Si tampoco cabe a la izquierda, centrarlo en la pantalla
                if (left < margin) {
                    left = (windowWidth - previewWidth) / 2;
                }
            }
            
            // Calcular posición vertical - alinear con el elemento pero ajustar si es necesario
            top = elementOffset.top;
            
            // Ajustar si se sale por arriba
            if (top < margin) {
                top = margin;
            }
            
            // Ajustar si se sale por abajo
            if (top + previewHeight > windowHeight - margin) {
                top = windowHeight - previewHeight - margin;
                
                // Si aún no cabe, ponerlo en la parte superior
                if (top < margin) {
                    top = margin;
                }
            }
            
            // Asegurar límites finales
            left = Math.max(margin, Math.min(left, windowWidth - previewWidth - margin));
            top = Math.max(margin, Math.min(top, windowHeight - previewHeight - margin));
            
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
            
            // ✅ CORREGIDO: Separar estilos de fondo de la opacidad
            let containerStyles = `background: ${styles.backgroundColor}; padding: 20px; border-radius: ${styles.borderRadius}; position: relative;`;
            
            // ✅ NUEVO: Estructura con soporte para imagen de fondo como pseudo-elemento
            let html = `<div class="sfq-preview-question-content" style="${containerStyles}">`;
            
            // ✅ CORREGIDO: Imagen de fondo como pseudo-elemento con opacidad independiente
            if (styles.backgroundImageUrl && styles.backgroundImageUrl.trim() !== '') {
                html += `<div class="sfq-preview-background-image" style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-image: url('${styles.backgroundImageUrl}');
                    background-size: ${styles.backgroundSize};
                    background-repeat: ${styles.backgroundRepeat};
                    background-position: ${styles.backgroundPosition};
                    background-attachment: ${styles.backgroundAttachment};
                    opacity: ${styles.backgroundOpacity};
                    pointer-events: none;
                    border-radius: inherit;
                    z-index: 0;
                "></div>`;
            }
            
            // ✅ NUEVO: Añadir overlay si está activado
            if (styles.backgroundImageUrl && styles.backgroundOverlay) {
                html += `<div class="sfq-preview-overlay" style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: ${styles.backgroundOverlayColor};
                    opacity: ${styles.backgroundOverlayOpacity};
                    pointer-events: none;
                    border-radius: inherit;
                    z-index: 1;
                "></div>`;
            }
            
            // ✅ NUEVO: Contenedor con z-index para estar sobre el overlay
            html += `<div class="sfq-preview-content-wrapper" style="position: relative; z-index: 2;">`;
            
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
            html += `</div>`; // Cerrar content-wrapper
            html += `</div>`; // Cerrar question-content
            return html;
        }

        renderSingleChoiceOptions(options, styles) {
            let html = `<div class="sfq-options-grid" style="display: grid; gap: 1rem; grid-template-columns: 1fr;">`;
            options.forEach((option, index) => {
                html += `
                    <div class="sfq-option-card" style="
                        background: ${styles.optionsBackgroundColor} !important;
                        border: 2px solid ${styles.optionsBorderColor} !important;
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
                        color: ${styles.textColor} !important;
                    ">
                        <input type="radio" class="sfq-hidden-input" style="position: absolute; opacity: 0; pointer-events: none;">
                        <span class="sfq-option-text" style="font-size: 1.1rem; font-weight: 500; flex: 1; color: ${styles.textColor} !important;">
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
                        background: ${styles.optionsBackgroundColor} !important;
                        border: 2px solid ${styles.optionsBorderColor} !important;
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
                                    border: 2px solid ${styles.optionsBorderColor} !important;
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
                                <span style="font-size: 1.1rem; font-weight: 500; color: ${styles.textColor} !important;">
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
            const optionsBorderColor = $('#options-border-color').val() || '#e0e0e0';
            const textColor = $('#text-color').val() || '#333333';
            const borderRadius = $('#border-radius').val() || '12';
            const fontFamily = $('#font-family').val() || 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
            
            // ✅ NUEVO: Obtener valores de opacidad
            const primaryColorOpacity = $('#primary-color-opacity').val() || '1';
            const secondaryColorOpacity = $('#secondary-color-opacity').val() || '1';
            const backgroundColorOpacity = $('#background-color-opacity').val() || '1';
            const optionsBackgroundColorOpacity = $('#options-background-color-opacity').val() || '1';
            const optionsBorderColorOpacity = $('#options-border-color-opacity').val() || '1';
            const textColorOpacity = $('#text-color-opacity').val() || '1';
            
            // ✅ NUEVO: Obtener configuración de imagen de fondo
            const backgroundImageUrl = $('#background-image-url').val() || '';
            const backgroundSize = $('#background-size').val() || 'cover';
            const backgroundRepeat = $('#background-repeat').val() || 'no-repeat';
            const backgroundPosition = $('#background-position').val() || 'center center';
            const backgroundAttachment = $('#background-attachment').val() || 'scroll';
            const backgroundOpacity = $('#background-opacity').val() || '1';
            
            // ✅ NUEVO: Obtener configuración de overlay
            const backgroundOverlay = $('#background-overlay').is(':checked');
            const backgroundOverlayColor = $('#background-overlay-color').val() || '#000000';
            const backgroundOverlayOpacity = $('#background-overlay-opacity').val() || '0.3';
            
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
            
            return {
                primaryColor: applyOpacity(primaryColor, primaryColorOpacity),
                secondaryColor: applyOpacity(secondaryColor, secondaryColorOpacity),
                backgroundColor: applyOpacity(backgroundColor, backgroundColorOpacity),
                optionsBackgroundColor: applyOpacity(optionsBackgroundColor, optionsBackgroundColorOpacity),
                optionsBorderColor: applyOpacity(optionsBorderColor, optionsBorderColorOpacity),
                textColor: applyOpacity(textColor, textColorOpacity),
                borderColor: '#e0e0e0',
                borderRadius: borderRadius + 'px',
                fontFamily: fontFamily,
                shadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                shadowHover: '0 4px 16px rgba(0, 0, 0, 0.15)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                // ✅ NUEVO: Propiedades de imagen de fondo
                backgroundImageUrl: backgroundImageUrl,
                backgroundSize: backgroundSize,
                backgroundRepeat: backgroundRepeat,
                backgroundPosition: backgroundPosition,
                backgroundAttachment: backgroundAttachment,
                backgroundOpacity: backgroundOpacity,
                backgroundOverlay: backgroundOverlay,
                backgroundOverlayColor: backgroundOverlayColor,
                backgroundOverlayOpacity: backgroundOverlayOpacity
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

        updateStylePreview() {
            if (!this.currentPreview) return;
            
            
            // Crear una pregunta de ejemplo para mostrar los estilos actualizados
            const sampleQuestionData = {
                text: 'Pregunta de ejemplo para mostrar estilos',
                type: 'single_choice',
                required: true,
                options: ['Opción 1', 'Opción 2', 'Opción 3']
            };
            
            // Renderizar previsualización con los estilos actuales
            const previewHtml = this.renderQuestionPreview(sampleQuestionData);
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

        bindPreviewControls() {
            // Botón de cerrar
            this.previewContainer.find('.sfq-preview-close').on('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.forceMinimizePreview();
            });
            
            // Botón de minimizar
            this.previewContainer.find('.sfq-preview-minimize').on('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.forceMinimizePreview();
            });
            
            // Botón de restaurar (en el botón minimizado)
            this.minimizedButton.find('.sfq-preview-restore').on('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.restorePreviewAndActivate();
            });
        }

        makeDraggable() {
            const $handle = this.previewContainer.find('.sfq-draggable-handle');
            
            $handle.on('mousedown', (e) => {
                this.isDragging = true;
                
                // Calcular offset desde el punto de clic
                const containerOffset = this.previewContainer.offset();
                this.dragOffset = {
                    x: e.pageX - containerOffset.left,
                    y: e.pageY - containerOffset.top
                };
                
                // Añadir clase de arrastre
                this.previewContainer.addClass('sfq-dragging');
                $('body').addClass('sfq-dragging-active');
                
                // Prevenir selección de texto
                e.preventDefault();
            });
            
            $(document).on('mousemove', (e) => {
                if (!this.isDragging) return;
                
                // Calcular nueva posición
                const newLeft = e.pageX - this.dragOffset.x;
                const newTop = e.pageY - this.dragOffset.y;
                
                // Límites de la ventana
                const windowWidth = $(window).width();
                const windowHeight = $(window).height();
                const containerWidth = this.previewContainer.outerWidth();
                const containerHeight = this.previewContainer.outerHeight();
                
                // Aplicar límites
                const constrainedLeft = Math.max(0, Math.min(newLeft, windowWidth - containerWidth));
                const constrainedTop = Math.max(0, Math.min(newTop, windowHeight - containerHeight));
                
                // Aplicar posición
                this.previewContainer.css({
                    left: constrainedLeft + 'px',
                    top: constrainedTop + 'px'
                });
            });
            
            $(document).on('mouseup', () => {
                if (this.isDragging) {
                    this.isDragging = false;
                    this.previewContainer.removeClass('sfq-dragging');
                    $('body').removeClass('sfq-dragging-active');
                }
            });
        }

        minimizePreview() {
            if (!this.previewContainer || this.isMinimized) return;
            
            this.isMinimized = true;
            
            // Ocultar previsualización con animación
            this.previewContainer.fadeOut(200, () => {
                // Mostrar botón minimizado en la parte inferior central
                this.minimizedButton.css({
                    position: 'fixed',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 9999
                }).fadeIn(200);
            });
        }

        forceMinimizePreview() {
            // Debug info removed for production
            
            // Cancelar cualquier animación pendiente
            if (this.previewContainer) {
                this.previewContainer.stop(true, false);
            }
            if (this.minimizedButton) {
                this.minimizedButton.stop(true, false);
            }
            
            // Forzar el estado minimizado
            this.isMinimized = true;
            
            // Ocultar inmediatamente la ventana de previsualización
            if (this.previewContainer) {
                this.previewContainer.hide();
            }
            
            // Mostrar inmediatamente el botón minimizado
            if (this.minimizedButton) {
                this.minimizedButton.css({
                    position: 'fixed',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 9999,
                    display: 'block'
                });
            }
            
            // Limpiar referencias de previsualización activa
            this.currentPreview = null;
            this.currentContext = null;
            
        }

        restorePreview() {
            if (!this.minimizedButton || !this.isMinimized) return;
            
            this.isMinimized = false;
            
            // Ocultar botón minimizado
            this.minimizedButton.fadeOut(200, () => {
                // Mostrar previsualización en la última posición conocida
                if (this.lastPosition) {
                    this.previewContainer.css({
                        left: this.lastPosition.left + 'px',
                        top: this.lastPosition.top + 'px'
                    });
                }
                this.previewContainer.fadeIn(200);
            });
        }

        restorePreviewAndActivate() {
            
            // Activar el sistema de previsualización
            this.isEnabled = true;
            
            // Marcar el checkbox de enable-floating-preview si existe
            const enableCheckbox = $('#enable-floating-preview');
            if (enableCheckbox.length && !enableCheckbox.is(':checked')) {
                enableCheckbox.prop('checked', true).trigger('change');
            }
            
            // Restaurar la ventana de previsualización
            this.restorePreview();
            
            // Mostrar una previsualización de ejemplo si no hay contenido activo
            if (!this.currentPreview) {
                // Crear una pregunta de ejemplo para mostrar
                const sampleQuestionData = {
                    text: 'Vista previa activada - Haz clic en cualquier campo para ver la previsualización',
                    type: 'single_choice',
                    required: false,
                    options: ['La previsualización está ahora activa', 'Edita cualquier campo para ver los cambios']
                };
                
                // Renderizar previsualización de ejemplo
                const previewHtml = this.renderQuestionPreview(sampleQuestionData);
                
                // Mostrar previsualización en el centro
                this.previewContainer.find('.sfq-preview-content').html(previewHtml);
                this.previewContainer.find('.sfq-preview-title').text('Vista Previa - Activada');
                
                // Posicionar en el centro-derecha
                const windowWidth = $(window).width();
                const previewWidth = 380;
                const position = {
                    left: windowWidth - previewWidth - 20,
                    top: 80
                };
                
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
                this.currentContext = 'activated';
            }
            
        }

        showRestoreButton() {
            // Mostrar siempre el botón de restaurar al inicializar
            if (this.minimizedButton) {
                this.minimizedButton.css({
                    position: 'fixed',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 9999
                }).show();
                this.isMinimized = true;
            }
        }

        hidePreview() {
            if (this.previewContainer && this.previewContainer.is(':visible')) {
                this.previewContainer.fadeOut(this.config.animationDuration);
            }
            
            if (this.minimizedButton && this.minimizedButton.is(':visible')) {
                this.minimizedButton.fadeOut(this.config.animationDuration);
            }
            
            this.currentPreview = null;
            this.currentContext = null;
            this.isMinimized = false;
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
            
            // Remover contenedores
            if (this.previewContainer) {
                this.previewContainer.remove();
                this.previewContainer = null;
            }
            
            if (this.minimizedButton) {
                this.minimizedButton.remove();
                this.minimizedButton = null;
            }
            
            // Limpiar referencias
            this.currentPreview = null;
            this.currentContext = null;
            this.isMinimized = false;
            this.isDragging = false;
        }
    }

    // Exponer clase globalmente
    window.PreviewManager = PreviewManager;

})(jQuery);
