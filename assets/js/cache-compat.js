/**
 * Compatibilidad con plugins de cache
 * Maneja nonces dinámicos y contenido que no debe ser cacheado
 */

(function($) {
    'use strict';
    
    // Configuración global
    const CacheCompat = {
        config: window.sfqCacheCompat || {},
        nonce: null,
        nonceExpiry: null,
        refreshTimer: null,
        isRefreshing: false,
        
        init: function() {
            this.setupNonceManagement();
            this.setupCacheBypass();
            this.setupEventListeners();
            this.startNonceRefreshTimer();
        },
        
        /**
         * Configurar manejo de nonces dinámicos
         */
        setupNonceManagement: function() {
            // Obtener nonce actual de los formularios
            const nonceInputs = $('input[name="nonce"]');
            if (nonceInputs.length > 0) {
                this.nonce = nonceInputs.first().val();
                this.calculateNonceExpiry();
            }
            
            // Interceptar peticiones AJAX para actualizar nonces automáticamente
            this.interceptAjaxRequests();
        },
        
        /**
         * Calcular cuándo expira el nonce actual
         */
        calculateNonceExpiry: function() {
            if (this.config.nonce_lifetime) {
                this.nonceExpiry = Date.now() + (this.config.nonce_lifetime * 1000);
            }
        },
        
        /**
         * Interceptar peticiones AJAX para manejar nonces
         */
        interceptAjaxRequests: function() {
            const self = this;
            
            // Interceptar jQuery AJAX
            $(document).ajaxSend(function(event, xhr, settings) {
                // Solo interceptar peticiones a admin-ajax.php con acciones SFQ
                if (settings.url && settings.url.includes('admin-ajax.php') && 
                    settings.data && settings.data.includes('action=sfq_')) {
                    
                    console.log('SFQ Cache Compat: Intercepting AJAX request:', settings.data);
                    
                    // ✅ MEJORADO: Verificar si el nonce está próximo a expirar
                    if (self.isNonceNearExpiry()) {
                        console.log('SFQ Cache Compat: Nonce near expiry, refreshing before request');
                        // Pausar la petición y refrescar nonce primero
                        xhr.abort();
                        self.refreshNonceAndRetry(settings);
                        return false;
                    }
                    
                    // ✅ MEJORADO: Asegurar que se use el nonce más reciente
                    if (self.nonce && settings.data) {
                        const oldData = settings.data;
                        settings.data = self.updateNonceInData(settings.data);
                        console.log('SFQ Cache Compat: Updated nonce in request data');
                    }
                    
                    // ✅ NUEVO: Añadir headers anti-cache específicos para WP Cache
                    xhr.setRequestHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
                    xhr.setRequestHeader('Pragma', 'no-cache');
                    xhr.setRequestHeader('Expires', '0');
                    xhr.setRequestHeader('X-SFQ-Cache-Bypass', '1');
                    
                    // ✅ NUEVO: Añadir timestamp único para evitar cache
                    const timestamp = Date.now();
                    if (typeof settings.data === 'string') {
                        settings.data += '&_cache_bust=' + timestamp;
                    } else if (typeof settings.data === 'object') {
                        settings.data._cache_bust = timestamp;
                    }
                }
            });
            
            // ✅ MEJORADO: Manejar errores de nonce expirado con detección más robusta
            $(document).ajaxError(function(event, xhr, settings, error) {
                // Solo procesar errores de peticiones SFQ
                if (!settings.url || !settings.url.includes('admin-ajax.php') || 
                    !settings.data || !settings.data.includes('action=sfq_')) {
                    return;
                }
                
                console.log('SFQ Cache Compat: AJAX error detected:', {
                    status: xhr.status,
                    statusText: xhr.statusText,
                    responseText: xhr.responseText,
                    responseJSON: xhr.responseJSON
                });
                
                let isNonceError = false;
                
                // ✅ MEJORADO: Detección múltiple de errores de nonce
                if (xhr.responseJSON) {
                    const response = xhr.responseJSON;
                    
                    // Verificar diferentes formatos de error de nonce
                    if (!response.success) {
                        const errorData = response.data;
                        
                        // Formato 1: String que contiene 'nonce'
                        if (typeof errorData === 'string' && 
                            (errorData.includes('nonce') || errorData.includes('seguridad'))) {
                            isNonceError = true;
                        }
                        
                        // Formato 2: Objeto con código de error
                        if (typeof errorData === 'object' && errorData.code) {
                            if (errorData.code === 'INVALID_NONCE' || 
                                errorData.code === 'rest_cookie_invalid_nonce') {
                                isNonceError = true;
                            }
                        }
                        
                        // Formato 3: Mensaje directo
                        if (response.message && 
                            (response.message.includes('nonce') || response.message.includes('seguridad'))) {
                            isNonceError = true;
                        }
                    }
                } else if (xhr.responseText) {
                    // ✅ NUEVO: Verificar también en responseText para casos edge
                    const responseText = xhr.responseText.toLowerCase();
                    if (responseText.includes('nonce') || 
                        responseText.includes('security') || 
                        responseText.includes('seguridad')) {
                        isNonceError = true;
                    }
                }
                
                // ✅ NUEVO: También considerar errores 403 como posibles errores de nonce
                if (xhr.status === 403) {
                    console.log('SFQ Cache Compat: 403 error detected, treating as potential nonce error');
                    isNonceError = true;
                }
                
                if (isNonceError) {
                    console.log('SFQ Cache Compat: Nonce error confirmed, attempting refresh and retry');
                    self.refreshNonceAndRetry(settings);
                } else {
                    console.log('SFQ Cache Compat: Non-nonce error, not retrying');
                }
            });
        },
        
        /**
         * Verificar si el nonce está próximo a expirar
         */
        isNonceNearExpiry: function() {
            if (!this.nonceExpiry) {
                return false;
            }
            
            // Considerar "próximo a expirar" si quedan menos de 5 minutos
            const fiveMinutes = 5 * 60 * 1000;
            return (Date.now() + fiveMinutes) >= this.nonceExpiry;
        },
        
        /**
         * Actualizar nonce en los datos de la petición
         */
        updateNonceInData: function(data) {
            if (typeof data === 'string') {
                // Reemplazar nonce en string de datos
                return data.replace(/nonce=[^&]*/, 'nonce=' + encodeURIComponent(this.nonce));
            } else if (typeof data === 'object') {
                // Actualizar nonce en objeto
                data.nonce = this.nonce;
                return data;
            }
            return data;
        },
        
        /**
         * Refrescar nonce y reintentar petición
         */
        refreshNonceAndRetry: function(originalSettings) {
            const self = this;
            
            if (this.isRefreshing) {
                // Si ya estamos refrescando, esperar y reintentar
                setTimeout(function() {
                    self.refreshNonceAndRetry(originalSettings);
                }, 1000);
                return;
            }
            
            this.refreshNonce().then(function() {
                // Actualizar datos con nuevo nonce
                originalSettings.data = self.updateNonceInData(originalSettings.data);
                
                // Reintentar petición original
                $.ajax(originalSettings);
            }).catch(function(error) {
                console.error('SFQ Cache Compat: Error refreshing nonce:', error);
                
                // Mostrar mensaje de error al usuario
                self.showNonceError();
            });
        },
        
        /**
         * Refrescar nonce vía AJAX
         */
        refreshNonce: function() {
            const self = this;
            
            return new Promise(function(resolve, reject) {
                if (self.isRefreshing) {
                    reject(new Error('Already refreshing nonce'));
                    return;
                }
                
                self.isRefreshing = true;
                
                $.ajax({
                    url: self.config.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'sfq_refresh_nonce',
                        old_nonce: self.nonce,
                        session_id: self.getSessionId()
                    },
                    success: function(response) {
                        if (response.success && response.data.nonce) {
                            // Actualizar nonce en memoria
                            self.nonce = response.data.nonce;
                            self.calculateNonceExpiry();
                            
                            // Actualizar nonce en todos los formularios
                            self.updateNonceInForms(response.data.nonce);
                            
                            console.log('SFQ Cache Compat: Nonce refreshed successfully');
                            resolve(response.data.nonce);
                        } else {
                            reject(new Error('Invalid nonce refresh response'));
                        }
                    },
                    error: function(xhr, status, error) {
                        reject(new Error('Nonce refresh failed: ' + error));
                    },
                    complete: function() {
                        self.isRefreshing = false;
                    }
                });
            });
        },
        
        /**
         * Actualizar nonce en todos los formularios
         */
        updateNonceInForms: function(newNonce) {
            // Actualizar inputs de nonce
            $('input[name="nonce"]').val(newNonce);
            
            // Actualizar nonce en configuración global de formularios
            if (window.sfqConfig) {
                window.sfqConfig.nonce = newNonce;
            }
            
            // Disparar evento personalizado para que otros scripts puedan reaccionar
            $(document).trigger('sfq:nonce-updated', [newNonce]);
        },
        
        /**
         * Obtener session ID actual
         */
        getSessionId: function() {
            // Intentar obtener de formularios
            const sessionInput = $('input[name="session_id"]').first();
            if (sessionInput.length > 0) {
                return sessionInput.val();
            }
            
            // Intentar obtener de cookies
            const sessionCookie = this.getCookie('sfq_session_id');
            if (sessionCookie) {
                return sessionCookie;
            }
            
            // Intentar obtener de localStorage
            const sessionStorage = localStorage.getItem('sfq_session_id');
            if (sessionStorage) {
                return sessionStorage;
            }
            
            return '';
        },
        
        /**
         * Configurar bypass de cache para contenido dinámico
         */
        setupCacheBypass: function() {
            // Añadir parámetros anti-cache a peticiones críticas
            this.addCacheBustingParams();
            
            // Configurar headers para evitar cache en peticiones AJAX
            $.ajaxSetup({
                beforeSend: function(xhr, settings) {
                    if (settings.url && settings.url.includes('admin-ajax.php') && 
                        settings.data && settings.data.includes('action=sfq_')) {
                        
                        // Añadir headers anti-cache
                        xhr.setRequestHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                        xhr.setRequestHeader('Pragma', 'no-cache');
                        xhr.setRequestHeader('Expires', '0');
                    }
                }
            });
        },
        
        /**
         * Añadir parámetros anti-cache
         */
        addCacheBustingParams: function() {
            const timestamp = Date.now();
            
            // Añadir timestamp a formularios para evitar cache
            $('.sfq-form-container').each(function() {
                const $form = $(this);
                if (!$form.find('input[name="cache_bust"]').length) {
                    $form.append('<input type="hidden" name="cache_bust" value="' + timestamp + '">');
                }
            });
        },
        
        /**
         * Configurar event listeners
         */
        setupEventListeners: function() {
            const self = this;
            
            // Escuchar eventos de formularios
            $(document).on('sfq:form-loaded', function() {
                self.setupNonceManagement();
            });
            
            // Escuchar cambios de visibilidad de página
            document.addEventListener('visibilitychange', function() {
                if (!document.hidden) {
                    // Página visible de nuevo, verificar nonce
                    if (self.isNonceNearExpiry()) {
                        self.refreshNonce();
                    }
                }
            });
            
            // Escuchar eventos de focus en ventana
            $(window).on('focus', function() {
                if (self.isNonceNearExpiry()) {
                    self.refreshNonce();
                }
            });
        },
        
        /**
         * Iniciar timer para refrescar nonce automáticamente
         */
        startNonceRefreshTimer: function() {
            const self = this;
            
            if (this.config.refresh_interval && this.config.refresh_interval > 0) {
                this.refreshTimer = setInterval(function() {
                    if (self.isNonceNearExpiry()) {
                        self.refreshNonce().catch(function(error) {
                            console.warn('SFQ Cache Compat: Automatic nonce refresh failed:', error);
                        });
                    }
                }, this.config.refresh_interval);
            }
        },
        
        /**
         * Mostrar error de nonce al usuario
         */
        showNonceError: function() {
            const message = 'Ha ocurrido un error de seguridad. Por favor, recarga la página e intenta de nuevo.';
            
            // Intentar usar el sistema de notificaciones del plugin si existe
            if (window.sfqNotifications && typeof window.sfqNotifications.show === 'function') {
                window.sfqNotifications.show(message, 'error');
            } else {
                // Fallback a alert nativo
                alert(message);
            }
        },
        
        /**
         * Obtener cookie por nombre
         */
        getCookie: function(name) {
            const value = "; " + document.cookie;
            const parts = value.split("; " + name + "=");
            if (parts.length === 2) {
                return parts.pop().split(";").shift();
            }
            return null;
        },
        
        /**
         * Limpiar timers al destruir
         */
        destroy: function() {
            if (this.refreshTimer) {
                clearInterval(this.refreshTimer);
                this.refreshTimer = null;
            }
        }
    };
    
    // Inicializar cuando el DOM esté listo
    $(document).ready(function() {
        // ✅ CRÍTICO: Inicializar siempre, incluso sin configuración previa
        // Esto asegura que el sistema esté disponible cuando WP Cache cause problemas
        if (window.sfqCacheCompat) {
            CacheCompat.init();
            
            // Hacer disponible globalmente para debug
            window.sfqCacheCompat.instance = CacheCompat;
        } else {
            // ✅ NUEVO: Inicialización de emergencia para casos de WP Cache
            console.log('SFQ Cache Compat: No config found, initializing emergency mode');
            
            // Crear configuración mínima de emergencia
            window.sfqCacheCompat = {
                ajax_url: sfq_ajax ? sfq_ajax.ajax_url : '/wp-admin/admin-ajax.php',
                nonce_lifetime: 43200, // 12 horas por defecto
                refresh_interval: 300000 // 5 minutos
            };
            
            CacheCompat.init();
            window.sfqCacheCompat.instance = CacheCompat;
        }
    });
    
    // Limpiar al salir de la página
    $(window).on('beforeunload', function() {
        if (window.sfqCacheCompat && window.sfqCacheCompat.instance) {
            window.sfqCacheCompat.instance.destroy();
        }
    });
    
})(jQuery);
