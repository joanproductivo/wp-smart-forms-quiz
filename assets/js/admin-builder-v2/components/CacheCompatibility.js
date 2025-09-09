/**
 * CacheCompatibility - Compatibilidad con sistemas de cache
 * Smart Forms & Quiz - Admin Builder v2
 */

(function($) {
    'use strict';

    class SFQ_CacheCompatibility {
        constructor(formBuilder) {
            this.formBuilder = formBuilder;
            this.cacheDetected = false;
            this.wpRocketDetected = false;
        }

        init() {
            this.detectCachePlugins();
            this.setupCacheCompatibility();
            this.bindCacheEvents();
        }

        /**
         * Detectar plugins de cache activos
         */
        detectCachePlugins() {
            // Detectar WP Rocket
            if (typeof window.rocket_beacon !== 'undefined' || 
                document.querySelector('script[src*="wp-rocket"]') ||
                document.querySelector('link[href*="wp-rocket"]')) {
                this.wpRocketDetected = true;
                this.cacheDetected = true;
                console.log('SFQ: WP Rocket detected - enabling cache compatibility mode');
            }

            // Detectar otros plugins de cache comunes
            const cacheIndicators = [
                'w3tc', 'wp-super-cache', 'wp-fastest-cache', 
                'litespeed-cache', 'wp-optimize', 'autoptimize'
            ];

            cacheIndicators.forEach(indicator => {
                if (document.querySelector(`script[src*="${indicator}"]`) ||
                    document.querySelector(`link[href*="${indicator}"]`) ||
                    document.body.classList.contains(indicator)) {
                    this.cacheDetected = true;
                    console.log(`SFQ: Cache plugin detected (${indicator}) - enabling compatibility mode`);
                }
            });
        }

        /**
         * Configurar compatibilidad con cache
         */
        setupCacheCompatibility() {
            if (!this.cacheDetected) return;

            // Modo de carga segura automático si se detecta cache
            if (!this.formBuilder.stateManager.getState('secureLoadingForced')) {
                console.log('SFQ: Enabling secure loading due to cache detection');
                $('#secure-loading').prop('checked', true);
                this.formBuilder.stateManager.setState('secureLoadingForced', true);
            }

            // Optimizaciones específicas para WP Rocket
            if (this.wpRocketDetected) {
                this.setupWPRocketCompatibility();
            }

            // Delay adicional para inicialización
            this.addCacheDelay();
        }

        /**
         * Configuración específica para WP Rocket
         */
        setupWPRocketCompatibility() {
            // Excluir archivos críticos del minificado
            if (window.RocketBrowserCompatibilityChecker) {
                console.log('SFQ: Configuring WP Rocket compatibility');
            }

            // Asegurar que los eventos se vinculen después de la optimización
            $(document).on('rocket_lazyload_loaded', () => {
                console.log('SFQ: Re-binding events after WP Rocket lazy load');
                this.rebindEventsAfterCache();
            });
        }

        /**
         * Añadir delay para sistemas de cache
         */
        addCacheDelay() {
            const originalInit = this.formBuilder.init;
            this.formBuilder.init = function() {
                // Delay adicional para cache
                setTimeout(() => {
                    originalInit.call(this);
                }, this.cacheDetected ? 200 : 50);
            }.bind(this.formBuilder);
        }

        /**
         * Re-vincular eventos después de optimizaciones de cache
         */
        rebindEventsAfterCache() {
            if (this.formBuilder.questionManager) {
                // Re-vincular eventos de preguntas
                this.formBuilder.questionManager.questions.forEach(question => {
                    this.formBuilder.questionManager.bindQuestionEvents(question.id);
                });
            }

            if (this.formBuilder.conditionEngine) {
                // Re-vincular eventos de condiciones
                Object.keys(this.formBuilder.conditionEngine.conditions).forEach(questionId => {
                    this.formBuilder.conditionEngine.conditions[questionId].forEach(condition => {
                        this.formBuilder.conditionEngine.bindConditionEvents(condition.id, questionId);
                    });
                });
            }
        }

        /**
         * Eventos específicos para cache
         */
        bindCacheEvents() {
            // Evento cuando se activa/desactiva el modo seguro
            $(document).on('change', '#secure-loading', (e) => {
                const isEnabled = $(e.target).is(':checked');
                console.log('SFQ: Secure loading mode:', isEnabled ? 'enabled' : 'disabled');
                
                if (isEnabled && this.cacheDetected) {
                    this.showCacheNotice();
                }
            });

            // Detectar cambios dinámicos en cache
            this.monitorCacheChanges();
        }

        /**
         * Mostrar aviso sobre cache
         */
        showCacheNotice() {
            if (this.formBuilder.uiRenderer) {
                this.formBuilder.uiRenderer.showNotice(
                    'Modo de carga segura activado debido a la detección de plugins de cache', 
                    'info'
                );
            }
        }

        /**
         * Monitorear cambios dinámicos en cache
         */
        monitorCacheChanges() {
            // Observer para detectar cambios en el DOM por cache
            if (window.MutationObserver) {
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.type === 'childList') {
                            // Verificar si se añadieron scripts de cache
                            mutation.addedNodes.forEach((node) => {
                                if (node.nodeType === 1 && node.tagName === 'SCRIPT') {
                                    if (node.src && (node.src.includes('wp-rocket') || 
                                                   node.src.includes('cache'))) {
                                        console.log('SFQ: Cache script detected dynamically');
                                        this.cacheDetected = true;
                                        this.setupCacheCompatibility();
                                    }
                                }
                            });
                        }
                    });
                });

                observer.observe(document.head, {
                    childList: true,
                    subtree: true
                });
            }
        }

        /**
         * Optimizar guardado para cache
         */
        optimizeSaveForCache() {
            if (!this.cacheDetected) return;

            // Añadir parámetros anti-cache a las peticiones AJAX
            const originalAjax = $.ajax;
            $.ajax = function(options) {
                if (options.url && options.url.includes('sfq_save_form')) {
                    options.url += (options.url.includes('?') ? '&' : '?') + 
                                  '_cache_bust=' + Date.now();
                    options.cache = false;
                }
                return originalAjax.call(this, options);
            };
        }

        /**
         * Limpiar cache después de guardar
         */
        clearCacheAfterSave() {
            if (!this.cacheDetected) return;

            // Intentar limpiar cache específico si es posible
            if (this.wpRocketDetected && window.rocket_beacon) {
                // WP Rocket specific cache clearing
                console.log('SFQ: Attempting to clear WP Rocket cache');
            }

            // Forzar recarga de recursos críticos
            this.forceResourceReload();
        }

        /**
         * Forzar recarga de recursos críticos
         */
        forceResourceReload() {
            // Añadir timestamp a recursos críticos
            const timestamp = Date.now();
            
            // Recargar CSS si es necesario
            $('link[href*="admin-consolidated.css"]').each(function() {
                const href = $(this).attr('href');
                if (href && !href.includes('_v=')) {
                    $(this).attr('href', href + (href.includes('?') ? '&' : '?') + '_v=' + timestamp);
                }
            });
        }

        destroy() {
            // Limpiar observers y eventos
            if (this.mutationObserver) {
                this.mutationObserver.disconnect();
            }
        }
    }

    // Export para uso en otros módulos
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = SFQ_CacheCompatibility;
    } else {
        window.SFQ_CacheCompatibility = SFQ_CacheCompatibility;
    }

})(jQuery);
