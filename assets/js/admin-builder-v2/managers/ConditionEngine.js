/**
 * ConditionEngine - Motor de lógica condicional avanzado
 * Smart Forms & Quiz - Admin Builder v2
 */

(function($) {
    'use strict';

    class ConditionEngine {
        constructor(formBuilder) {
            this.formBuilder = formBuilder;
            this.conditions = {};
        }

        init() {
            // Initialize conditions storage
            this.setupGlobalEventDelegation();
        }

        /**
         * Configurar event delegation para eliminación de condiciones - CORREGIDO
         */
        setupGlobalEventDelegation() {
            const self = this;
            
            // Event delegation para botones de eliminar condición
            $(document).off('click.sfq-condition-delete').on('click.sfq-condition-delete', '.sfq-condition-delete', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                if (!confirm('¿Estás seguro de eliminar esta condición?')) {
                    return;
                }
                
                const $condition = $(this).closest('.sfq-condition-item');
                const conditionId = $condition.attr('id');
                
                if (!conditionId) {
                    console.error('SFQ: No condition ID found for deletion');
                    return;
                }
                
                // Encontrar la pregunta que contiene esta condición
                const $questionContainer = $condition.closest('.sfq-question-item');
                const questionId = $questionContainer.attr('id');
                
                if (!questionId) {
                    console.error('SFQ: No question ID found for condition deletion');
                    return;
                }
                
                console.log('SFQ: Deleting condition', conditionId, 'from question', questionId);
                self.deleteCondition(conditionId, questionId);
            });
            
            console.log('SFQ: Event delegation for condition deletion set up');
        }

        loadConditions(questionId, conditionsData) {
            if (!conditionsData || !Array.isArray(conditionsData)) return;
            
            console.log('SFQ: Loading conditions for question', questionId, ':', conditionsData);
            
            this.conditions[questionId] = conditionsData.map((cond, index) => {
                // ✅ CRÍTICO: Usar campos separados para variable_amount y comparison_value
                const condition = {
                    id: 'c_' + questionId + '_' + index,
                    type: cond.condition_type || 'answer_equals',
                    value: cond.condition_value || '',
                    action: cond.action_type || 'goto_question',
                    actionValue: cond.action_value || '',
                    operator: cond.variable_operation || '',
                    amount: cond.variable_amount || 0,  // Para acciones de variables
                    comparisonValue: cond.comparison_value || ''  // Para condiciones de variables
                };
                
                console.log('SFQ: Restored condition with separate fields:', condition);
                
                return condition;
            });
            
            console.log('SFQ: Processed conditions for question', questionId, ':', this.conditions[questionId]);
            
            // Render conditions
            this.renderConditions(questionId);
            
            // CRÍTICO: Re-poblar dropdowns después de renderizar
            setTimeout(() => {
                this.repopulateConditionDropdowns(questionId);
            }, 100);
        }

        renderConditions(questionId) {
            const $container = $(`#conditions-${questionId}`);
            if (!$container.length) return;
            
            console.log('SFQ: Rendering conditions for question', questionId);
            
            // Clear existing conditions (keep add button)
            $container.find('.sfq-condition-item').remove();
            
            const conditions = this.conditions[questionId] || [];
            console.log('SFQ: Conditions to render:', conditions);
            
            conditions.forEach(condition => {
                const html = this.formBuilder.uiRenderer.renderCondition(condition);
                $container.find('.sfq-add-condition').before(html);
                this.bindConditionEvents(condition.id, questionId);
            });
            
            console.log('SFQ: Rendered', conditions.length, 'conditions for question', questionId);
        }

        addCondition(questionId) {
            // ✅ CRÍTICO: Usar el mismo formato que loadConditions para consistencia
            const conditionIndex = (this.conditions[questionId] || []).length;
            const conditionId = 'c_' + questionId + '_' + conditionIndex;
            
            const condition = {
                id: conditionId,
                type: 'answer_equals',
                value: '',
                action: 'goto_question',
                actionValue: '',
                operator: '',
                amount: 0,
                comparisonValue: 0  // ✅ CRÍTICO: Inicializar comparisonValue
            };
            
            console.log('SFQ: Creating new condition with unified ID format:', condition);
            
            if (!this.conditions[questionId]) {
                this.conditions[questionId] = [];
            }
            this.conditions[questionId].push(condition);
            
            const html = this.formBuilder.uiRenderer.renderCondition(condition);
            $(`#conditions-${questionId} .sfq-add-condition`).before(html);
            this.bindConditionEvents(conditionId, questionId);
            
            this.formBuilder.isDirty = true;
        }

        bindConditionEvents(conditionId, questionId) {
            const $condition = $(`#${conditionId}`);
            const conditions = this.conditions[questionId] || [];
            const condition = conditions.find(c => c.id === conditionId);
            
            if (!condition) return;
            
            const self = this; // Guardar referencia al contexto correcto
            
            // Update condition fields
            $condition.find('.sfq-condition-type').off('change').on('change', function() {
                const newConditionType = $(this).val();
                condition.type = newConditionType;
                
                // Regenerar el campo de valor de condición según el nuevo tipo
                const newConditionValueField = self.formBuilder.uiRenderer.generateConditionValueField(condition);
                $condition.find('.sfq-condition-value-container').html(newConditionValueField);
                
                // Rebind events para los nuevos campos
                self.bindConditionValueEvents($condition, condition);
                
                self.formBuilder.isDirty = true;
            });
            
            // Bind initial condition value events
            this.bindConditionValueEvents($condition, condition);
            
            // Handle action type change - regenerate action value field and show/hide amount field
            $condition.find('.sfq-action-type').off('change').on('change', function() {
                const newActionType = $(this).val();
                condition.action = newActionType;
                
                // Limpiar el valor anterior si cambia el tipo de acción
                condition.actionValue = '';
                
                // Regenerar el campo de valor de acción
                const newActionValueField = self.formBuilder.uiRenderer.generateActionValueField(condition);
                $condition.find('.sfq-action-value-container').html(newActionValueField);
                
                // Mostrar/ocultar campo de cantidad según el tipo de acción
                const $amountRow = $condition.find('.sfq-condition-amount-row');
                const $amountLabel = $condition.find('.sfq-condition-amount-label');
                
                if (['add_variable', 'set_variable'].includes(newActionType)) {
                    $amountRow.show();
                    $amountLabel.text(newActionType === 'add_variable' ? 'Cantidad a sumar:' : 'Valor a establecer:');
                } else {
                    $amountRow.hide();
                }
                
                // Rebind events para el nuevo campo
                self.bindActionValueEvents($condition, condition);
                
                self.formBuilder.isDirty = true;
            });
            
            // Handle amount field changes
            $condition.find('.sfq-condition-amount').off('input').on('input', function() {
                condition.amount = parseInt($(this).val()) || 0;
                self.formBuilder.isDirty = true;
            });
            
            // Bind initial action value events
            this.bindActionValueEvents($condition, condition);
            
            // Delete condition button - REMOVIDO: Ahora se maneja por event delegation
            // El event delegation global se encarga de todos los botones de eliminar
        }

        /**
         * Bind events para el campo de valor de acción - MEJORADO
         */
        bindActionValueEvents($condition, condition) {
            const self = this;
            
            // Handle input/change events for action value
            $condition.find('.sfq-action-value').off('input change keyup').on('input change keyup', function() {
                condition.actionValue = $(this).val();
                self.formBuilder.isDirty = true;
                console.log('SFQ: Updated action value for condition', condition.id, 'to:', condition.actionValue);
            });
            
            // Handle select events for dropdowns - MEJORADO con más eventos
            $condition.find('.sfq-question-dropdown, .sfq-variable-dropdown').off('change click focus').on('change click focus', function() {
                const newValue = $(this).val();
                if (newValue !== condition.actionValue) {
                    condition.actionValue = newValue;
                    self.formBuilder.isDirty = true;
                    console.log('SFQ: Updated dropdown value for condition', condition.id, 'to:', condition.actionValue);
                }
            });
            
            // CRÍTICO: Asegurar que el valor inicial esté establecido correctamente
            const $actionValue = $condition.find('.sfq-action-value, .sfq-question-dropdown, .sfq-variable-dropdown');
            if ($actionValue.length > 0 && condition.actionValue) {
                $actionValue.val(condition.actionValue);
                console.log('SFQ: Set initial value for condition', condition.id, 'to:', condition.actionValue);
            }
        }

        /**
         * Bind events para los campos de valor de condición
         */
        bindConditionValueEvents($condition, condition) {
            const self = this;
            
            // Para condiciones de respuesta (campo simple)
            $condition.find('.sfq-condition-value').off('input').on('input', function() {
                condition.value = $(this).val();
                self.formBuilder.isDirty = true;
                console.log('SFQ: Updated condition value for condition', condition.id, 'to:', condition.value);
            });
            
            // Para condiciones de variables (campos compuestos)
            $condition.find('.sfq-condition-variable-name').off('change').on('change', function() {
                condition.value = $(this).val(); // El nombre de la variable va en 'value'
                self.formBuilder.isDirty = true;
                console.log('SFQ: Updated variable name for condition', condition.id, 'to:', condition.value);
            });
            
            // ✅ CRÍTICO: Event binding para el campo de valor de comparación
            $condition.find('.sfq-condition-comparison-value').off('input').on('input', function() {
                condition.comparisonValue = $(this).val(); // El valor de comparación va en 'comparisonValue'
                self.formBuilder.isDirty = true;
                console.log('SFQ: Updated comparison value for condition', condition.id, 'to:', condition.comparisonValue);
            });
        }


        /**
         * CRÍTICO: Re-poblar dropdowns de condiciones después de cargar
         */
        repopulateConditionDropdowns(questionId) {
            console.log('SFQ: Re-populating condition dropdowns for question', questionId);
            
            const conditions = this.conditions[questionId] || [];
            
            conditions.forEach(condition => {
                const $conditionElement = $(`#${condition.id}`);
                if ($conditionElement.length === 0) {
                    console.warn('SFQ: Condition element not found:', condition.id);
                    return;
                }
                
                // Re-generar el campo de valor de acción con el valor correcto
                if (condition.action === 'goto_question') {
                    const newDropdown = this.formBuilder.uiRenderer.generateQuestionDropdown(condition.actionValue);
                    $conditionElement.find('.sfq-action-value-container').html(newDropdown);
                    
                    // Re-bind events para el nuevo dropdown
                    this.bindActionValueEvents($conditionElement, condition);
                    
                    console.log('SFQ: Re-populated question dropdown for condition', condition.id, 'with value', condition.actionValue);
                } else if (condition.action === 'add_variable' || condition.action === 'set_variable') {
                    const newVariableField = this.formBuilder.uiRenderer.generateVariableField(condition.actionValue);
                    $conditionElement.find('.sfq-action-value-container').html(newVariableField);
                    
                    // Re-bind events para el nuevo campo
                    this.bindActionValueEvents($conditionElement, condition);
                    
                    console.log('SFQ: Re-populated variable field for condition', condition.id, 'with value', condition.actionValue);
                }
            });
            
            console.log('SFQ: Finished re-populating dropdowns for question', questionId);
        }

        /**
         * Eliminar una condición específica - MEJORADO CON LOGGING DETALLADO
         */
        deleteCondition(conditionId, questionId) {
            console.log('🗑️ SFQ: === STARTING CONDITION DELETION ===');
            console.log('🗑️ SFQ: Condition ID to delete:', conditionId);
            console.log('🗑️ SFQ: Question ID:', questionId);
            
            // Verificar que existe el array de condiciones para esta pregunta
            if (!this.conditions[questionId]) {
                console.error('❌ SFQ: No conditions array found for question', questionId);
                console.log('🔍 SFQ: Available question IDs:', Object.keys(this.conditions));
                return;
            }
            
            const conditions = this.conditions[questionId];
            console.log('📋 SFQ: Current conditions array before deletion:');
            console.table(conditions.map((c, index) => ({
                index: index,
                id: c.id,
                type: c.type,
                action: c.action
            })));
            
            // Encontrar el índice de la condición a eliminar
            const conditionIndex = conditions.findIndex(c => c.id === conditionId);
            
            if (conditionIndex === -1) {
                console.error('❌ SFQ: Condition not found for deletion:', conditionId);
                console.log('🔍 SFQ: Available condition IDs:', conditions.map(c => c.id));
                console.log('🔍 SFQ: Searching for exact matches...');
                conditions.forEach((c, index) => {
                    console.log(`   Index ${index}: "${c.id}" === "${conditionId}" ? ${c.id === conditionId}`);
                });
                return;
            }
            
            console.log('✅ SFQ: Found condition at index', conditionIndex);
            
            // Mostrar el estado antes de la eliminación
            console.log('📊 SFQ: Array state before splice:');
            console.log('   - Array length:', conditions.length);
            console.log('   - Condition to remove:', conditions[conditionIndex]);
            
            // Eliminar la condición del array
            const removedCondition = conditions.splice(conditionIndex, 1)[0];
            console.log('✂️ SFQ: Spliced condition:', removedCondition);
            
            // Mostrar el estado después de la eliminación
            console.log('📊 SFQ: Array state after splice:');
            console.log('   - New array length:', conditions.length);
            console.log('   - Remaining conditions:', conditions.map(c => c.id));
            
            // Actualizar el array de condiciones
            this.conditions[questionId] = conditions;
            console.log('💾 SFQ: Updated conditions array in this.conditions[' + questionId + ']');
            
            // Verificar que la actualización fue exitosa
            const verifyArray = this.conditions[questionId];
            console.log('🔍 SFQ: Verification - conditions array now contains:', verifyArray.map(c => c.id));
            
            // Eliminar el elemento del DOM
            const $condition = $(`#${conditionId}`);
            if ($condition.length === 0) {
                console.error('❌ SFQ: DOM element not found for condition', conditionId);
            } else {
                console.log('🎭 SFQ: Removing DOM element for condition', conditionId);
                $condition.fadeOut(300, function() {
                    $(this).remove();
                    console.log('✅ SFQ: DOM element removed for condition', conditionId);
                });
            }
            
            // Marcar el formulario como modificado
            this.formBuilder.isDirty = true;
            console.log('💾 SFQ: Marked form as dirty');
            
            console.log('🎉 SFQ: === CONDITION DELETION COMPLETED ===');
            console.log('📈 SFQ: Final summary:');
            console.log('   - Deleted condition ID:', conditionId);
            console.log('   - From question:', questionId);
            console.log('   - Remaining conditions:', this.conditions[questionId].length);
            console.log('   - Remaining IDs:', this.conditions[questionId].map(c => c.id));
        }

        getConditionsData(questionId) {
            const conditions = this.conditions[questionId] || [];
            
            // Debug: Mostrar las condiciones que se van a guardar
            console.log('SFQ: Getting conditions data for question ' + questionId + ':', conditions);
            
            const conditionsData = conditions.map(cond => {
                // ✅ CRÍTICO: Normalizar comparison_value según el contexto
                let normalizedComparisonValue = cond.comparisonValue || '';
                
                // Si es una condición de variable y el valor parece numérico, convertirlo
                if (['variable_greater', 'variable_less', 'variable_equals'].includes(cond.type)) {
                    if (normalizedComparisonValue !== '' && !isNaN(normalizedComparisonValue)) {
                        // Es numérico, convertir a número para consistencia
                        normalizedComparisonValue = parseFloat(normalizedComparisonValue);
                    }
                    // Si no es numérico, mantener como string
                }
                
                const conditionData = {
                    condition_type: cond.type,
                    condition_value: cond.value,
                    action_type: cond.action,
                    action_value: cond.actionValue,
                    variable_operation: cond.operator,
                    variable_amount: cond.amount || 0,  // Para acciones de variables
                    comparison_value: normalizedComparisonValue  // Normalizado según contexto
                };
                
                console.log('SFQ: Mapped condition with normalized comparison_value:', conditionData);
                return conditionData;
            });
            
            console.log('SFQ: Final mapped conditions data for question ' + questionId + ':', conditionsData);
            
            return conditionsData;
        }

        destroy() {
            this.conditions = {};
        }
    }

    // Export para uso en otros módulos
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ConditionEngine;
    } else {
        window.ConditionEngine = ConditionEngine;
    }

})(jQuery);
