/**
 * Smart Forms & Quiz - Admin Builder v2
 * Punto de entrada principal - Arquitectura modular
 */

(function($) {
    'use strict';

    // Initialize when DOM is ready - SINGLETON PATTERN
    $(document).ready(function() {
        // Only initialize on the form builder page
        if ($('.sfq-builder-wrap').length > 0) {
            // CRITICAL: Prevent multiple initializations
            if (window.sfqFormBuilderV2InitLock) {
                return;
            }
            
            // Set initialization lock
            window.sfqFormBuilderV2InitLock = true;
            
            // Destroy old builder if exists
            if (window.sfqFormBuilder && typeof window.sfqFormBuilder.destroy === 'function') {
                window.sfqFormBuilder.destroy();
                window.sfqFormBuilder = null;
            }
            
            // Destroy existing v2 builder if exists
            if (window.sfqFormBuilderV2 && typeof window.sfqFormBuilderV2.destroy === 'function') {
                window.sfqFormBuilderV2.destroy();
                window.sfqFormBuilderV2 = null;
            }
            
            // Verificar que todas las clases estén disponibles
            const requiredClasses = [
                'SFQ_FormBuilderCore',
                'SFQ_StateManager', 
                'SFQ_DataValidator',
                'SFQ_QuestionManager',
                'SFQ_ConditionEngine',
                'SFQ_UIRenderer',
                'SFQ_EventManager',
                'SFQ_FreestyleElements',
                'SFQ_ImageManager',
                'SFQ_VariableManager',
                'SFQ_StyleManager',
                'SFQ_BlockFormTimerManager'
            ];
            
            const missingClasses = requiredClasses.filter(className => {
                return typeof window[className] === 'undefined';
            });
            
            if (missingClasses.length > 0) {
                console.error('SFQ Builder v2: Missing required classes:', missingClasses);
                console.error('SFQ Builder v2: Make sure all module files are loaded correctly');
                return;
            }
            
            // Small delay to ensure cleanup is complete
            setTimeout(() => {
                try {
                    // Inicializar el SFQ_FormBuilderCore que automáticamente inicializa todos los módulos
                    window.sfqFormBuilderV2 = new SFQ_FormBuilderCore();
                    
                    console.log('SFQ Builder v2: Successfully initialized with modular architecture');
                    console.log('SFQ Builder v2: Modules loaded:', {
                        core: !!window.sfqFormBuilderV2.stateManager,
                        questions: !!window.sfqFormBuilderV2.questionManager,
                        conditions: !!window.sfqFormBuilderV2.conditionEngine,
                        ui: !!window.sfqFormBuilderV2.uiRenderer,
                        events: !!window.sfqFormBuilderV2.eventManager,
                        freestyle: !!window.sfqFormBuilderV2.freestyleElements,
                        images: !!window.sfqFormBuilderV2.imageManager,
                        variables: !!window.sfqFormBuilderV2.variableManager,
                        styles: !!window.sfqFormBuilderV2.styleManager,
                        blockFormTimer: !!window.sfqFormBuilderV2.blockFormTimerManager
                    });
                    
                } catch (error) {
                    console.error('SFQ Builder v2: Initialization error:', error);
                    
                    // Fallback: intentar cargar el archivo monolítico si existe
                    if (typeof window.sfqFormBuilderV2Fallback !== 'undefined') {
                        console.warn('SFQ Builder v2: Falling back to monolithic version');
                        window.sfqFormBuilderV2 = new window.sfqFormBuilderV2Fallback();
                    }
                }
                
                // Release lock after initialization
                setTimeout(() => {
                    window.sfqFormBuilderV2InitLock = false;
                }, 100);
            }, 50);
        }
    });

})(jQuery);
