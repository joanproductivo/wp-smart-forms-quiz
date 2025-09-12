(function($) {
    'use strict';

    const SfqAjaxLoader = {
        config: {
            ajax_url: sfq_ajax ? sfq_ajax.ajax_url : '/wp-admin/admin-ajax.php',
            nonce: sfq_ajax ? sfq_ajax.nonce : '', // Initial nonce from WordPress
            load_form_action: 'sfq_get_full_form'
        },

        init: function() {
            this.loadForms();
        },

        loadForms: function() {
            const self = this;
            $('.sfq-form-ajax-placeholder').each(function() {
                const $placeholder = $(this);
                const formId = $placeholder.data('form-id');
                const sessionId = $placeholder.data('session-id'); // Obtener session_id del placeholder

                if (!formId || !sessionId) {
                    console.error('SFQ AJAX Loader: Missing form ID or session ID for placeholder.', $placeholder);
                    $placeholder.html('<p style="color: red;">' + 'Error: Formulario incompleto.' + '</p>');
                    return;
                }

                self.fetchForm(formId, sessionId, $placeholder);
            });
        },

        fetchForm: function(formId, sessionId, $placeholder) {
            const self = this;

            $.ajax({
                url: self.config.ajax_url,
                type: 'POST',
                data: {
                    action: self.config.load_form_action,
                    form_id: formId,
                    session_id: sessionId,
                    nonce: self.config.nonce // Usar el nonce inicial
                },
                beforeSend: function(xhr) {
                    // Añadir headers anti-cache para la petición AJAX
                    xhr.setRequestHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
                    xhr.setRequestHeader('Pragma', 'no-cache');
                    xhr.setRequestHeader('Expires', '0');
                    xhr.setRequestHeader('X-SFQ-Cache-Bypass', '1');
                },
                success: function(response) {
                    if (response.success && response.data.html) {
                        $placeholder.replaceWith(response.data.html); // Reemplazar placeholder con el HTML del formulario

                        // Actualizar el nonce global si se proporciona uno nuevo
                        if (response.data.nonce) {
                            self.config.nonce = response.data.nonce;
                            // Disparar un evento para que otros scripts (como cache-compat.js) puedan actualizar su nonce
                            $(document).trigger('sfq:nonce-updated', [response.data.nonce]);
                        }

                        // Inicializar el formulario recién cargado
                        self.initializeLoadedForm(formId, response.data.settings, response.data.session_id);
                    } else {
                        console.error(`SFQ AJAX Loader: Error loading form ${formId}:`, response.data.message || 'Unknown error');
                        $placeholder.html('<p style="color: red;">' + (response.data.message || 'Error al cargar el formulario.') + '</p>');
                    }
                },
                error: function(xhr, status, error) {
                    console.error(`SFQ AJAX Loader: AJAX error for form ${formId}:`, status, error, xhr);
                    $placeholder.html('<p style="color: red;">' + 'Error de conexión al cargar el formulario.' + '</p>');
                }
            });
        },

        initializeLoadedForm: function(formId, settings, sessionId) {
            // Asumimos que SmartFormQuiz es la clase principal que inicializa el formulario
            // y que está disponible globalmente o se carga con frontend.js
            if (typeof SmartFormQuiz !== 'undefined') {
                const $formContainer = $(`#sfq-form-${formId}`);
                if ($formContainer.length && !$formContainer.data('initialized')) {
                    // Pasar la configuración y el session_id al constructor de SmartFormQuiz
                    new SmartFormQuiz($formContainer[0], {
                        formId: formId,
                        settings: settings,
                        sessionId: sessionId
                    });
                    $formContainer.data('initialized', true);
                }
            } else {
                console.warn('SFQ AJAX Loader: SmartFormQuiz is not defined. Ensure frontend.js is loaded.');
            }

            // Disparar un evento personalizado para que otros módulos puedan reaccionar
            $(document).trigger('sfq:form-ajax-loaded', [formId, settings, sessionId]);
        }
    };

    $(document).ready(function() {
        // Asegurarse de que sfq_ajax esté definido para obtener la URL de AJAX y el nonce inicial
        if (typeof sfq_ajax === 'undefined') {
            console.warn('SFQ AJAX Loader: sfq_ajax is not defined. Using fallback values.');
            window.sfq_ajax = {
                ajax_url: '/wp-admin/admin-ajax.php',
                nonce: '' // No nonce disponible, se intentará refrescar
            };
        }
        SfqAjaxLoader.init();
    });

})(jQuery);
