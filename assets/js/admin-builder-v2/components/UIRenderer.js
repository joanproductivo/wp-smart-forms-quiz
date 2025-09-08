/**
 * UIRenderer - Renderizado de componentes UI
 * Smart Forms & Quiz - Admin Builder v2
 */

(function($) {
    'use strict';

    class UIRenderer {
        constructor(formBuilder) {
            this.formBuilder = formBuilder;
        }

        init() {
            // Initialize UI components
        }

        renderQuestion(question) {
            if (question.type === 'freestyle') {
                return this.renderFreestyleQuestion(question);
            }
            
            const typeLabels = {
                'single_choice': 'Opción Única',
                'multiple_choice': 'Opción Múltiple',
                'text': 'Texto',
                'email': 'Email',
                'rating': 'Valoración',
                'image_choice': 'Selección de Imagen',
                'freestyle': 'Estilo Libre'
            };

            let optionsHtml = '';
            if (['single_choice', 'multiple_choice', 'image_choice'].includes(question.type)) {
                const optionsList = question.options.map((option, index) => 
                    this.renderOption(option, index + 1, question.type)
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
                            <label>
                                <input type="checkbox" class="sfq-hide-title-checkbox" 
                                       ${question.settings?.hide_title ? 'checked' : ''}>
                                Ocultar título de la pregunta
                            </label>
                            <label>
                                <input type="checkbox" class="sfq-block-question-checkbox" 
                                       ${question.settings?.block_question ? 'checked' : ''}>
                                Bloquear formulario en esta pregunta
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

        renderFreestyleQuestion(question) {
            const elementsHtml = this.renderFreestyleElements(question.freestyle_elements || []);
            const controlsHtml = this.renderFreestyleControls(question.id);
            const isFinaleScreen = question.pantallaFinal || false;

            const html = `
                <div class="sfq-question-item sfq-freestyle-question ${isFinaleScreen ? 'sfq-final-screen' : ''}" id="${question.id}" data-type="freestyle" data-final-screen="${isFinaleScreen}">
                    <div class="sfq-question-header">
                        <span class="sfq-question-type-label">${isFinaleScreen ? '🏁 Pantalla Final' : 'Estilo Libre'}</span>
                        <div class="sfq-question-actions">
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
                        
                        <div class="sfq-freestyle-container">
                            <div class="sfq-freestyle-elements" id="freestyle-elements-${question.id}">
                                ${elementsHtml}
                            </div>
                            
                            ${controlsHtml}
                        </div>
                        
                        <div class="sfq-question-settings">
                            <label>
                                <input type="checkbox" class="sfq-required-checkbox" 
                                       ${question.required ? 'checked' : ''}>
                                Pregunta obligatoria
                            </label>
                            <label>
                                <input type="checkbox" class="sfq-hide-title-checkbox" 
                                       ${question.settings?.hide_title ? 'checked' : ''}>
                                Ocultar título de la pregunta
                            </label>
                            <label>
                                <input type="checkbox" class="sfq-block-question-checkbox" 
                                       ${question.settings?.block_question ? 'checked' : ''}>
                                Bloquear formulario en esta pregunta
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

        renderFreestyleElements(elements) {
            if (!elements || elements.length === 0) {
                return '<div class="sfq-freestyle-empty">No hay elementos añadidos</div>';
            }
            
            return elements.map(element => this.renderFreestyleElement(element)).join('');
        }

        renderFreestyleElement(element) {
            const elementTypes = {
                'text': '📝 Texto',
                'video': '🎥 Video', 
                'image': '🖼️ Imagen',
                'countdown': '⏰ Cuenta atrás',
                'phone': '📞 Teléfono',
                'email': '📧 Email',
                'file_upload': '📤 Subir imagen',
                'button': '🔘 Botón',
                'rating': '⭐ Valoración',
                'dropdown': '📋 Desplegable',
                'checkbox': '☑️ Opción Check',
                'legal_text': '⚖️ Texto RGPD',
                'variable_display': '🔢 Mostrar Variable',
                'styled_text': '✨ Texto Estilizado'
            };
            
            return `
                <div class="sfq-freestyle-element" data-element-id="${element.id}" data-element-type="${element.type}">
                    <div class="sfq-freestyle-element-header">
                        <span class="sfq-freestyle-element-type">${elementTypes[element.type] || element.type}</span>
                        <div class="sfq-freestyle-element-actions">
                            <button class="sfq-freestyle-action sfq-configure-element" type="button" title="Configurar">
                                <span class="dashicons dashicons-admin-generic"></span>
                            </button>
                            <button class="sfq-freestyle-action sfq-duplicate-element" type="button" title="Duplicar">
                                <span class="dashicons dashicons-admin-page"></span>
                            </button>
                            <button class="sfq-freestyle-action sfq-delete-element" type="button" title="Eliminar">
                                <span class="dashicons dashicons-trash"></span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="sfq-freestyle-element-content">
                        <div class="sfq-freestyle-element-label">
                            <label style="display: block; margin-bottom: 5px; font-size: 12px; color: #666; font-weight: 500;">
                                Texto que verá el usuario (ej: "Tu nombre completo", "Selecciona una opción"):
                            </label>
                            <input type="text" placeholder="Ej: Tu nombre completo, Selecciona una opción..." 
                                   value="${this.escapeHtml(element.label)}" 
                                   class="sfq-element-label-input">
                        </div>
                        
                        <div class="sfq-freestyle-element-preview">
                            ${this.renderElementPreview(element)}
                        </div>
                    </div>
                </div>
            `;
        }

        renderFreestyleControls(questionId) {
            return `
                <div class="sfq-freestyle-controls">
                    <div class="sfq-freestyle-add-buttons">
                        <button class="sfq-add-freestyle-element" data-type="text" data-question="${questionId}">
                            📝 Texto
                        </button>
                        <button class="sfq-add-freestyle-element" data-type="video" data-question="${questionId}">
                            🎥 Video
                        </button>
                        <button class="sfq-add-freestyle-element" data-type="image" data-question="${questionId}">
                            🖼️ Imagen
                        </button>
                        <button class="sfq-add-freestyle-element" data-type="countdown" data-question="${questionId}">
                            ⏰ Cuenta atrás
                        </button>
                        <button class="sfq-add-freestyle-element" data-type="phone" data-question="${questionId}">
                            📞 Teléfono
                        </button>
                        <button class="sfq-add-freestyle-element" data-type="email" data-question="${questionId}">
                            📧 Email
                        </button>
                        <button class="sfq-add-freestyle-element" data-type="file_upload" data-question="${questionId}">
                            📤 Subir imagen
                        </button>
                        <button class="sfq-add-freestyle-element" data-type="button" data-question="${questionId}">
                            🔘 Botón
                        </button>
                        <button class="sfq-add-freestyle-element" data-type="rating" data-question="${questionId}">
                            ⭐ Valoración
                        </button>
                        <button class="sfq-add-freestyle-element" data-type="dropdown" data-question="${questionId}">
                            📋 Desplegable
                        </button>
                        <button class="sfq-add-freestyle-element" data-type="checkbox" data-question="${questionId}">
                            ☑️ Opción Check
                        </button>
                        <button class="sfq-add-freestyle-element" data-type="legal_text" data-question="${questionId}">
                            ⚖️ Texto RGPD
                        </button>
                        <button class="sfq-add-freestyle-element" data-type="variable_display" data-question="${questionId}">
                            🔢 Mostrar Variable
                        </button>
                        <button class="sfq-add-freestyle-element" data-type="styled_text" data-question="${questionId}">
                            ✨ Texto Estilizado
                        </button>
                    </div>
                </div>
            `;
        }

        // ✅ NUEVO: Función helper para convertir hex a rgba
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

        renderElementPreview(element) {
            switch (element.type) {
                case 'text':
                    return `<input type="text" placeholder="${element.settings?.placeholder || 'Texto de ejemplo'}" disabled>`;
                case 'email':
                    return `<input type="email" placeholder="${element.settings?.placeholder || 'email@ejemplo.com'}" disabled>`;
                case 'phone':
                    return `<input type="tel" placeholder="${element.settings?.placeholder || '+34 600 000 000'}" disabled>`;
                case 'rating':
                    return `<div class="sfq-rating-preview">⭐⭐⭐⭐⭐</div>`;
                case 'button':
                    return `<button disabled>${element.settings?.button_text || 'Botón de ejemplo'}</button>`;
                case 'checkbox':
                    return `<label><input type="checkbox" disabled> ${element.settings?.checkbox_text || 'Opción de ejemplo'}</label>`;
                case 'dropdown':
                    return `<select disabled><option>Selecciona una opción</option></select>`;
                case 'video':
                    return `<div class="sfq-video-preview">🎥 Video: ${element.settings?.video_url || 'URL no configurada'}</div>`;
                case 'image':
                    return `<div class="sfq-image-preview">🖼️ Imagen: ${element.settings?.image_url || 'URL no configurada'}</div>`;
                case 'countdown':
                    return `<div class="sfq-countdown-preview">⏰ Cuenta atrás: ${element.settings?.target_date || 'Fecha no configurada'}</div>`;
                case 'file_upload':
                    return `<div class="sfq-file-preview">📤 Subir archivo</div>`;
                case 'legal_text':
                    return `<div class="sfq-legal-preview">⚖️ ${element.settings?.text_content || 'Texto legal'}</div>`;
                case 'variable_display':
                    const variableName = element.settings?.variable_name || 'variable_no_seleccionada';
                    const previewValue = element.settings?.preview_value || '0';
                    const bgColor = this.hexToRgba(element.settings?.background_color || '#f8f9fa', element.settings?.background_opacity || 1);
                    const borderColor = this.hexToRgba(element.settings?.border_color || '#e9ecef', element.settings?.border_opacity || 1);
                    return `<div class="sfq-variable-display-preview" style="
                        padding: 12px 16px;
                        background: ${bgColor};
                        border: 2px solid ${borderColor};
                        border-radius: ${element.settings?.border_radius || '8'}px;
                        color: ${element.settings?.text_color || '#333333'};
                        font-size: ${element.settings?.font_size || '16'}px;
                        font-weight: ${element.settings?.font_weight || 'normal'};
                        text-align: ${element.settings?.text_align || 'center'};
                        ${element.settings?.text_shadow ? 'text-shadow: 1px 1px 2px rgba(0,0,0,0.3);' : ''}
                    ">
                        🔢 Variable: <strong>${variableName}</strong> = ${previewValue}
                    </div>`;
                case 'styled_text':
                    const textContent = element.settings?.text_content || 'Texto de ejemplo';
                    const textType = element.settings?.text_type || 'paragraph';
                    const tagName = textType === 'title' ? 'h2' : 'p';
                    const styledBgColor = this.hexToRgba(element.settings?.background_color || '#ffffff', element.settings?.background_opacity || 0);
                    const styledBorderColor = this.hexToRgba(element.settings?.border_color || '#e0e0e0', element.settings?.border_opacity || 0);
                    
                    // Aplicar ancho personalizado si está configurado
                    let widthStyle = '';
                    if (element.settings?.width_type === 'full') {
                        widthStyle = 'width: 100%;';
                    } else if (element.settings?.width_type === 'custom' && element.settings?.custom_width) {
                        widthStyle = `width: ${element.settings.custom_width}px; max-width: 100%;`;
                    }
                    
                    return `<${tagName} class="sfq-styled-text-preview" style="
                        font-family: ${element.settings?.font_family || 'inherit'};
                        font-size: ${element.settings?.font_size || '16'}px;
                        font-weight: ${element.settings?.font_weight || 'normal'};
                        font-style: ${element.settings?.italic ? 'italic' : 'normal'};
                        text-decoration: ${element.settings?.strikethrough ? 'line-through' : 'none'};
                        color: ${element.settings?.text_color || '#333333'};
                        text-align: ${element.settings?.text_align || 'left'};
                        background: ${styledBgColor};
                        border: 2px solid ${styledBorderColor};
                        border-radius: ${element.settings?.border_radius || '0'}px;
                        padding: 12px;
                        margin: auto;
                        ${widthStyle}
                        ${element.settings?.text_shadow ? 'text-shadow: 2px 2px 4px rgba(0,0,0,0.3);' : ''}
                        ${element.settings?.box_shadow ? 'box-shadow: 0 4px 8px rgba(0,0,0,0.1);' : ''}
                    ">
                        ✨ ${textContent}
                    </${tagName}>`;
                default:
                    return `<div class="sfq-element-preview">Vista previa de ${element.type}</div>`;
            }
        }

        renderOption(option, index, questionType = null) {
            // Determinar si es una pregunta de tipo image_choice
            const isImageChoice = questionType === 'image_choice';
            
            // HTML base para todas las opciones
            let optionHtml = `
                <div class="sfq-option-item">
                    <input type="text" class="sfq-option-input" 
                           placeholder="Opción ${index}" 
                           value="${this.escapeHtml(option.text || '')}">
            `;
            
            // ✅ NUEVO: Añadir interfaz de subida de imágenes para image_choice
            if (isImageChoice) {
                const hasImage = option.image && option.image.trim() !== '';
                
                optionHtml += `
                    <div class="sfq-image-upload-section">
                        <div class="sfq-image-controls">
                            <button type="button" class="button sfq-upload-image-btn" 
                                    data-option-index="${index - 1}">
                                <span class="dashicons dashicons-upload"></span>
                                Subir Imagen
                            </button>
                            <input type="url" class="sfq-image-url-input ${hasImage ? 'valid' : ''}" 
                                   name="options[${index - 1}][image]"
                                   placeholder="O pega URL de imagen..." 
                                   value="${this.escapeHtml(option.image || '')}">
                        </div>
                        <div class="sfq-image-preview-container" style="display: ${hasImage ? 'block' : 'none'};">
                            <div class="sfq-image-preview">
                                <img src="${this.escapeHtml(option.image || '')}" 
                                     alt="${this.escapeHtml(option.image_alt || 'Vista previa')}" 
                                     class="sfq-preview-image">
                                <button type="button" class="sfq-remove-image" title="Eliminar imagen">
                                    <span class="dashicons dashicons-no-alt"></span>
                                </button>
                            </div>
                        </div>
                        
                        <!-- Campos ocultos para datos adicionales de la imagen -->
                        <input type="hidden" name="options[${index - 1}][image_id]" 
                               value="${this.escapeHtml(option.image_id || '')}">
                        <input type="hidden" name="options[${index - 1}][image_alt]" 
                               value="${this.escapeHtml(option.image_alt || '')}">
                    </div>
                `;
            }
            
            // Botón de eliminar opción
            optionHtml += `
                    <button class="sfq-option-remove" type="button">
                        <span class="dashicons dashicons-trash"></span>
                    </button>
                </div>
            `;
            
            return optionHtml;
        }

        renderCondition(condition) {
            // Generar el campo de valor de acción dinámicamente
            const actionValueField = this.generateActionValueField(condition);
            
            return `
                <div class="sfq-condition-item" id="${condition.id}">
                    <div class="sfq-condition-header">
                        <span class="sfq-condition-title">Condición</span>
                        <button class="sfq-condition-delete" type="button" title="Eliminar condición">
                            <span class="dashicons dashicons-trash"></span>
                        </button>
                    </div>
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
                        <div class="sfq-condition-value-container">
                            ${this.generateConditionValueField(condition)}
                        </div>
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
                        <div class="sfq-action-value-container">
                            ${actionValueField}
                        </div>
                    </div>
                    <div class="sfq-condition-amount-row" style="display: ${['add_variable', 'set_variable'].includes(condition.action) ? 'flex' : 'none'};">
                        <label class="sfq-condition-amount-label">
                            ${condition.action === 'add_variable' ? 'Cantidad a sumar:' : 'Valor a establecer:'}
                        </label>
                        <input type="number" class="sfq-condition-amount" 
                               placeholder="${condition.action === 'add_variable' ? '5' : '10'}" 
                               value="${condition.amount || ''}"
                               min="0" step="1">
                    </div>
                </div>
            `;
        }

        /**
         * Generar el campo de valor de acción según el tipo de acción
         */
        generateActionValueField(condition) {
            switch (condition.action) {
                case 'goto_question':
                    return this.generateQuestionDropdown(condition.actionValue);
                case 'redirect_url':
                    return `<input type="url" class="sfq-action-value" 
                                   placeholder="https://ejemplo.com" 
                                   value="${this.escapeHtml(condition.actionValue)}">`;
                case 'show_message':
                    return `<textarea class="sfq-action-value" 
                                      placeholder="Mensaje a mostrar" 
                                      rows="2">${this.escapeHtml(condition.actionValue)}</textarea>`;
                case 'add_variable':
                case 'set_variable':
                    return this.generateVariableField(condition.actionValue);
                default:
                    return `<input type="text" class="sfq-action-value" 
                                   placeholder="Valor de acción" 
                                   value="${this.escapeHtml(condition.actionValue)}">`;
            }
        }

        /**
         * Generar desplegable con las preguntas disponibles - MEJORADO con mapeo de IDs
         */
        generateQuestionDropdown(selectedValue) {
            const questions = this.formBuilder.questionManager.questions || [];
            
            let options = '<option value="">Selecciona una pregunta...</option>';
            
            questions.forEach((question, index) => {
                const questionNumber = index + 1;
                const questionText = question.text || 'Pregunta sin título';
                const truncatedText = questionText.length > 50 ? 
                    questionText.substring(0, 50) + '...' : questionText;
                
                // CRÍTICO: Usar el ID real de la base de datos si existe, sino usar el ID temporal
                const questionId = question.originalId || question.id;
                
                // CRÍTICO: Mejorar la lógica de selección para manejar tanto IDs temporales como reales
                let isSelected = false;
                
                if (selectedValue) {
                    // Primero intentar match directo
                    if (selectedValue == questionId) {
                        isSelected = true;
                    } 
                    // Si no hay match directo, verificar si el selectedValue es un ID temporal
                    // que mapea al ID real de esta pregunta
                    else if (question.originalId && selectedValue == question.id) {
                        isSelected = true;
                        console.log('SFQ: Mapped temporal ID', selectedValue, 'to real ID', question.originalId);
                    }
                    // También verificar el mapeo inverso usando el idMapping del QuestionManager
                    else if (this.formBuilder.questionManager.idMapping.has(selectedValue)) {
                        const mappedId = this.formBuilder.questionManager.idMapping.get(selectedValue);
                        if (mappedId == questionId) {
                            isSelected = true;
                            console.log('SFQ: Used ID mapping', selectedValue, '->', mappedId);
                        }
                    }
                }
                
                const selectedAttr = isSelected ? 'selected' : '';
                
                options += `<option value="${questionId}" ${selectedAttr}>
                    Pregunta ${questionNumber}: ${this.escapeHtml(truncatedText)}
                </option>`;
            });
            
            return `<select class="sfq-action-value sfq-question-dropdown">
                        ${options}
                    </select>`;
        }

        /**
         * Generar campo para variables globales
         */
        generateVariableField(selectedValue) {
            const variables = this.formBuilder.getGlobalVariables() || [];
            
            if (variables.length === 0) {
                return `<input type="text" class="sfq-action-value" 
                               placeholder="Nombre de la variable" 
                               value="${this.escapeHtml(selectedValue)}">
                        <small style="display: block; color: #666; font-size: 11px; margin-top: 4px;">
                            💡 Tip: Crea variables globales en la pestaña "Variables"
                        </small>`;
            }
            
            let options = '<option value="">Selecciona una variable...</option>';
            
            variables.forEach(variable => {
                const isSelected = selectedValue === variable.name ? 'selected' : '';
                options += `<option value="${variable.name}" ${isSelected}>
                    ${this.escapeHtml(variable.name)} (${variable.type})
                </option>`;
            });
            
            return `<select class="sfq-action-value sfq-variable-dropdown">
                        ${options}
                    </select>`;
        }

        /**
         * Generar el campo de valor de condición según el tipo de condición
         */
        generateConditionValueField(condition) {
            switch (condition.type) {
                case 'variable_greater':
                case 'variable_less':
                case 'variable_equals':
                    // Para condiciones de variables, mostrar dropdown de variables + campo de valor
                    return this.generateVariableConditionFields(condition);
                case 'answer_equals':
                case 'answer_contains':
                case 'answer_not_equals':
                default:
                    // Para condiciones de respuesta, campo de texto simple
                    return `<input type="text" class="sfq-condition-value" 
                                   placeholder="Valor" 
                                   value="${this.escapeHtml(condition.value)}">`;
            }
        }

        /**
         * Generar campos específicos para condiciones de variables
         */
        generateVariableConditionFields(condition) {
            const variables = this.formBuilder.getGlobalVariables() || [];
            
            // ✅ CRÍTICO: Usar directamente condition.value y condition.comparisonValue
            const variableName = condition.value || '';
            const comparisonValue = condition.comparisonValue || '';
            
            console.log('SFQ: Generating variable condition fields for condition:', condition.id);
            console.log('SFQ: Variable name:', variableName);
            console.log('SFQ: Comparison value:', comparisonValue);
            
            if (variables.length === 0) {
                return `<div class="sfq-variable-condition-fields">
                            <input type="text" class="sfq-condition-variable-name" 
                                   placeholder="Nombre de variable" 
                                   value="${this.escapeHtml(variableName)}"
                                   style="width: 45%; margin-right: 10px;">
                            <input type="text" class="sfq-condition-comparison-value" 
                                   placeholder="Valor a comparar" 
                                   value="${this.escapeHtml(comparisonValue)}"
                                   style="width: 45%;">
                            <small style="display: block; color: #666; font-size: 11px; margin-top: 4px;">
                                💡 Tip: Crea variables globales en la pestaña "Variables"
                            </small>
                        </div>`;
            }
            
            let variableOptions = '<option value="">Selecciona una variable...</option>';
            
            variables.forEach(variable => {
                const isSelected = variableName === variable.name ? 'selected' : '';
                variableOptions += `<option value="${variable.name}" ${isSelected}>
                    ${this.escapeHtml(variable.name)} (${variable.type})
                </option>`;
            });
            
            return `<div class="sfq-variable-condition-fields">
                        <select class="sfq-condition-variable-name" style="width: 45%; margin-right: 10px;">
                            ${variableOptions}
                        </select>
                        <input type="text" class="sfq-condition-comparison-value" 
                               placeholder="Valor a comparar" 
                               value="${this.escapeHtml(comparisonValue)}"
                               style="width: 45%;">
                    </div>`;
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

    // Export para uso en otros módulos
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = UIRenderer;
    } else {
        window.UIRenderer = UIRenderer;
    }

})(jQuery);
