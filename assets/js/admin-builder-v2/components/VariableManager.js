/**
 * VariableManager - Gestión de variables globales
 * Smart Forms & Quiz - Admin Builder v2
 */

(function($) {
    'use strict';

    class SFQ_VariableManager {
    constructor(formBuilder) {
        this.formBuilder = formBuilder;
    }

    /**
     * Inicializar VariableManager
     */
    init() {
        console.log('SFQ: VariableManager initialized');
        // No hay inicialización específica requerida para VariableManager
        // Los eventos se manejan a través del EventManager
    }

    /**
     * Mostrar modal de variable
     */
    showVariableModal(variableData = null) {
        const isEdit = variableData !== null;
        const modalHtml = `
            <div class="sfq-variable-modal">
                <div class="sfq-variable-modal-content">
                    <div class="sfq-variable-modal-header">
                        <h3>${isEdit ? '✏️ Editar Variable' : '➕ Añadir Variable Global'}</h3>
                        <button class="sfq-variable-modal-close" type="button">&times;</button>
                    </div>
                    
                    <div class="sfq-variable-modal-body">
                        <div class="sfq-variable-form-group">
                            <label>Nombre de la variable</label>
                            <input type="text" id="sfq-variable-name" class="sfq-variable-input" 
                                   value="${isEdit ? this.escapeHtml(variableData.name) : ''}"
                                   placeholder="Ej: puntos_total, categoria_usuario">
                            <small>Solo letras, números y guiones bajos. Sin espacios.</small>
                        </div>
                        
                        <div class="sfq-variable-form-group">
                            <label>Descripción</label>
                            <textarea id="sfq-variable-description" class="sfq-variable-textarea" rows="3"
                                      placeholder="Describe para qué se usa esta variable">${isEdit ? this.escapeHtml(variableData.description) : ''}</textarea>
                        </div>
                        
                        <div class="sfq-variable-form-group">
                            <label>Tipo de variable</label>
                            <select id="sfq-variable-type" class="sfq-variable-select">
                                <option value="number" ${isEdit && variableData.type === 'number' ? 'selected' : ''}>Número</option>
                                <option value="text" ${isEdit && variableData.type === 'text' ? 'selected' : ''}>Texto</option>
                                <option value="boolean" ${isEdit && variableData.type === 'boolean' ? 'selected' : ''}>Verdadero/Falso</option>
                            </select>
                        </div>
                        
                        <div class="sfq-variable-form-group">
                            <label>Valor inicial</label>
                            <input type="text" id="sfq-variable-initial-value" class="sfq-variable-input"
                                   value="${isEdit ? this.escapeHtml(variableData.initial_value) : '0'}"
                                   placeholder="Valor por defecto al iniciar el formulario">
                            <small>Para números usa 0, para texto deja vacío, para boolean usa true o false</small>
                        </div>
                    </div>
                    
                    <div class="sfq-variable-modal-footer">
                        <button type="button" class="button button-secondary sfq-variable-cancel">Cancelar</button>
                        <button type="button" class="button button-primary sfq-variable-save">
                            ${isEdit ? 'Actualizar Variable' : 'Crear Variable'}
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Añadir modal al DOM
        $('body').append(modalHtml);
        
        // Bind events
        this.bindVariableModalEvents(isEdit, variableData);
    }

    /**
     * Vincular eventos del modal de variables
     */
    bindVariableModalEvents(isEdit, variableData) {
        const self = this;
        
        // Cerrar modal
        $('.sfq-variable-modal-close, .sfq-variable-cancel').on('click', function() {
            $('.sfq-variable-modal').fadeOut(300, function() {
                $(this).remove();
            });
        });
        
        // Cerrar al hacer clic fuera
        $('.sfq-variable-modal').on('click', function(e) {
            if (e.target === this) {
                $(this).fadeOut(300, function() {
                    $(this).remove();
                });
            }
        });
        
        // Validación en tiempo real del nombre
        $('#sfq-variable-name').on('input', function() {
            const value = $(this).val();
            const isValid = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value);
            
            if (value && !isValid) {
                $(this).css('border-color', '#dc3232');
                $(this).siblings('small').text('Solo letras, números y guiones bajos. Debe empezar con letra o guión bajo.').css('color', '#dc3232');
            } else {
                $(this).css('border-color', '');
                $(this).siblings('small').text('Solo letras, números y guiones bajos. Sin espacios.').css('color', '');
            }
        });
        
        // Cambio de tipo de variable
        $('#sfq-variable-type').on('change', function() {
            const type = $(this).val();
            const $initialValue = $('#sfq-variable-initial-value');
            
            switch (type) {
                case 'number':
                    $initialValue.attr('placeholder', '0').val(isEdit ? variableData?.initial_value : '0');
                    $initialValue.siblings('small').text('Valor numérico inicial (ej: 0, 100, -5)');
                    break;
                case 'text':
                    $initialValue.attr('placeholder', 'Texto inicial').val(isEdit ? variableData?.initial_value : '');
                    $initialValue.siblings('small').text('Texto inicial (puede estar vacío)');
                    break;
                case 'boolean':
                    $initialValue.attr('placeholder', 'true o false').val(isEdit ? variableData?.initial_value : 'false');
                    $initialValue.siblings('small').text('true (verdadero) o false (falso)');
                    break;
            }
        });
        
        // Guardar variable
        $('.sfq-variable-save').on('click', function() {
            const name = $('#sfq-variable-name').val().trim();
            const description = $('#sfq-variable-description').val().trim();
            const type = $('#sfq-variable-type').val();
            const initialValue = $('#sfq-variable-initial-value').val().trim();
            
            // Validaciones
            if (!name) {
                alert('El nombre de la variable es obligatorio');
                return;
            }
            
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
                alert('El nombre de la variable solo puede contener letras, números y guiones bajos, y debe empezar con letra o guión bajo');
                return;
            }
            
            if (!description) {
                alert('La descripción es obligatoria');
                return;
            }
            
            // Validar valor inicial según tipo
            if (type === 'number' && initialValue && isNaN(initialValue)) {
                alert('El valor inicial debe ser un número válido');
                return;
            }
            
            if (type === 'boolean' && initialValue && !['true', 'false'].includes(initialValue.toLowerCase())) {
                alert('El valor inicial para boolean debe ser "true" o "false"');
                return;
            }
            
            // Verificar que no existe otra variable con el mismo nombre (solo en modo crear)
            if (!isEdit && self.variableExists(name)) {
                alert('Ya existe una variable con ese nombre');
                return;
            }
            
            // Crear/actualizar variable
            const variable = {
                id: isEdit ? variableData.id : 'var_' + Date.now(),
                name: name,
                description: description,
                type: type,
                initial_value: initialValue || (type === 'number' ? '0' : type === 'boolean' ? 'false' : '')
            };
            
            if (isEdit) {
                self.updateVariable(variable);
            } else {
                self.addVariable(variable);
            }
            
            // Cerrar modal
            $('.sfq-variable-modal').fadeOut(300, function() {
                $(this).remove();
            });
        });
    }

    /**
     * Verificar si existe una variable con el nombre dado
     */
    variableExists(name) {
        const variables = this.getGlobalVariables();
        return variables.some(v => v.name === name);
    }

    /**
     * Añadir nueva variable
     */
    addVariable(variable) {
        let variables = this.getGlobalVariables();
        variables.push(variable);
        this.saveGlobalVariables(variables);
        this.renderVariables();
        this.formBuilder.isDirty = true;
    }

    /**
     * Actualizar variable existente
     */
    updateVariable(variable) {
        let variables = this.getGlobalVariables();
        const index = variables.findIndex(v => v.id === variable.id);
        if (index !== -1) {
            variables[index] = variable;
            this.saveGlobalVariables(variables);
            this.renderVariables();
            this.formBuilder.isDirty = true;
        }
    }

    /**
     * Eliminar variable
     */
    deleteVariable(variableId) {
        if (!confirm('¿Estás seguro de eliminar esta variable? Esta acción no se puede deshacer.')) {
            return;
        }
        
        let variables = this.getGlobalVariables();
        variables = variables.filter(v => v.id !== variableId);
        this.saveGlobalVariables(variables);
        this.renderVariables();
        this.formBuilder.isDirty = true;
    }

    /**
     * Obtener variables globales
     */
    getGlobalVariables() {
        const formData = this.formBuilder.stateManager.getState('formData');
        return formData?.global_variables || [];
    }

    /**
     * Guardar variables globales
     */
    saveGlobalVariables(variables) {
        const formData = this.formBuilder.stateManager.getState('formData') || {};
        formData.global_variables = variables;
        this.formBuilder.stateManager.setState('formData', formData);
    }

    /**
     * Renderizar lista de variables
     */
    renderVariables() {
        console.log('SFQ: === RENDERING VARIABLES ===');
        
        const variables = this.getGlobalVariables();
        console.log('SFQ: Variables to render:', variables);
        
        const $container = $('#sfq-global-variables-list');
        
        if (!$container.length) {
            console.warn('SFQ: Variables container #sfq-global-variables-list not found');
            return;
        }
        
        if (variables.length === 0) {
            console.log('SFQ: No variables found, showing empty state');
            $container.html(`
                <div class="sfq-variables-empty">
                    <span class="dashicons dashicons-admin-settings"></span>
                    <p>No hay variables globales creadas</p>
                    <p>Las variables te permiten crear lógica avanzada en tus formularios</p>
                </div>
            `);
            return;
        }
        
        console.log('SFQ: Rendering', variables.length, 'variables');
        const variablesHtml = variables.map(variable => this.renderVariable(variable)).join('');
        $container.html(variablesHtml);
        
        // Bind events para cada variable
        this.bindVariableEvents();
        
        console.log('SFQ: Variables rendered successfully');
    }

    /**
     * Renderizar una variable individual
     */
    renderVariable(variable) {
        const typeIcons = {
            'number': '🔢',
            'text': '📝',
            'boolean': '☑️'
        };
        
        const typeNames = {
            'number': 'Número',
            'text': 'Texto',
            'boolean': 'Verdadero/Falso'
        };
        
        return `
            <div class="sfq-variable-item" data-variable-id="${variable.id}">
                <div class="sfq-variable-icon">
                    ${typeIcons[variable.type] || '🔢'}
                </div>
                <div class="sfq-variable-content">
                    <div class="sfq-variable-name">${this.escapeHtml(variable.name)}</div>
                    <div class="sfq-variable-description">
                        ${this.escapeHtml(variable.description)} 
                        <span style="color: #999; font-size: 11px;">(${typeNames[variable.type]})</span>
                    </div>
                </div>
                <div class="sfq-variable-value">
                    ${this.escapeHtml(variable.initial_value)}
                </div>
                <div class="sfq-variable-actions">
                    <button class="sfq-variable-action edit" type="button" title="Editar variable">
                        <span class="dashicons dashicons-edit"></span>
                    </button>
                    <button class="sfq-variable-action delete" type="button" title="Eliminar variable">
                        <span class="dashicons dashicons-trash"></span>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Vincular eventos de variables
     */
    bindVariableEvents() {
        const self = this;
        
        // Editar variable
        $('.sfq-variable-action.edit').off('click').on('click', function() {
            const $item = $(this).closest('.sfq-variable-item');
            const variableId = $item.data('variable-id');
            const variables = self.getGlobalVariables();
            const variable = variables.find(v => v.id === variableId);
            
            if (variable) {
                self.showVariableModal(variable);
            }
        });
        
        // Eliminar variable
        $('.sfq-variable-action.delete').off('click').on('click', function() {
            const $item = $(this).closest('.sfq-variable-item');
            const variableId = $item.data('variable-id');
            self.deleteVariable(variableId);
        });
    }

    /**
     * Validar variable
     */
    validateVariable(variable) {
        const errors = [];
        
        // Validar nombre
        if (!variable.name || variable.name.trim() === '') {
            errors.push('El nombre de la variable es obligatorio');
        } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable.name)) {
            errors.push('El nombre de la variable solo puede contener letras, números y guiones bajos');
        }
        
        // Validar descripción
        if (!variable.description || variable.description.trim() === '') {
            errors.push('La descripción es obligatoria');
        }
        
        // Validar tipo
        if (!['number', 'text', 'boolean'].includes(variable.type)) {
            errors.push('Tipo de variable no válido');
        }
        
        // Validar valor inicial según tipo
        if (variable.type === 'number' && variable.initial_value && isNaN(variable.initial_value)) {
            errors.push('El valor inicial debe ser un número válido');
        }
        
        if (variable.type === 'boolean' && variable.initial_value && 
            !['true', 'false'].includes(variable.initial_value.toLowerCase())) {
            errors.push('El valor inicial para boolean debe ser "true" o "false"');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Obtener variables para dropdown
     */
    getVariablesForDropdown() {
        const variables = this.getGlobalVariables();
        return variables.map(variable => ({
            value: variable.name,
            text: `${variable.name} (${variable.type})`,
            type: variable.type
        }));
    }

    /**
     * Buscar variable por nombre
     */
    findVariableByName(name) {
        const variables = this.getGlobalVariables();
        return variables.find(v => v.name === name);
    }

    /**
     * Exportar variables
     */
    exportVariables() {
        const variables = this.getGlobalVariables();
        const dataStr = JSON.stringify(variables, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = 'sfq-variables.json';
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }

    /**
     * Importar variables
     */
    importVariables(file) {
        const reader = new FileReader();
        const self = this;
        
        reader.onload = function(e) {
            try {
                const variables = JSON.parse(e.target.result);
                
                if (!Array.isArray(variables)) {
                    throw new Error('El archivo no contiene un array de variables válido');
                }
                
                // Validar cada variable
                const validationErrors = [];
                variables.forEach((variable, index) => {
                    const validation = self.validateVariable(variable);
                    if (!validation.isValid) {
                        validationErrors.push(`Variable ${index + 1}: ${validation.errors.join(', ')}`);
                    }
                });
                
                if (validationErrors.length > 0) {
                    alert('Errores en el archivo:\n' + validationErrors.join('\n'));
                    return;
                }
                
                // Generar nuevos IDs para evitar conflictos
                const processedVariables = variables.map(variable => ({
                    ...variable,
                    id: 'var_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
                }));
                
                // Combinar con variables existentes
                const existingVariables = self.getGlobalVariables();
                const combinedVariables = [...existingVariables, ...processedVariables];
                
                self.saveGlobalVariables(combinedVariables);
                self.renderVariables();
                self.formBuilder.isDirty = true;
                
                alert(`Se importaron ${processedVariables.length} variables correctamente`);
                
            } catch (error) {
                alert('Error al importar variables: ' + error.message);
            }
        };
        
        reader.readAsText(file);
    }

    /**
     * Limpiar todas las variables
     */
    clearAllVariables() {
        if (!confirm('¿Estás seguro de eliminar TODAS las variables? Esta acción no se puede deshacer.')) {
            return;
        }
        
        this.saveGlobalVariables([]);
        this.renderVariables();
        this.formBuilder.isDirty = true;
    }

    /**
     * Escapar HTML
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
}

    // Export para uso en otros módulos
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = SFQ_VariableManager;
    } else {
        window.SFQ_VariableManager = SFQ_VariableManager;
    }

})(jQuery);
