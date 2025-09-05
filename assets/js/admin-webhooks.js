/**
 * JavaScript para la administración de webhooks
 */

(function($) {
    'use strict';

    // Debugging inicial

    // Verificar que jQuery está disponible
    if (typeof $ === 'undefined') {
        return;
    }

    // Verificar que el objeto AJAX está disponible
    if (typeof sfq_webhook_ajax === 'undefined') {
        return;
    }

    // Objeto principal para manejar webhooks
    const SFQWebhooks = {
        
        init: function() {
            this.bindEvents();
            this.loadWebhooks();
            this.initSecuritySettings();
        },

        bindEvents: function() {
            
            // ✅ CRÍTICO: Desregistrar eventos anteriores para evitar duplicados
            $(document).off('.sfq-webhooks');
            
            // Botones para añadir nuevo webhook
            $(document).on('click.sfq-webhooks', '#sfq-add-webhook, #sfq-add-first-webhook', this.showAddWebhookForm);
            
            // Botón para guardar webhook
            $(document).on('click.sfq-webhooks', '#sfq-save-webhook', this.saveWebhook);
            
            // Botón para cancelar
            $(document).on('click.sfq-webhooks', '#sfq-cancel-webhook', this.hideWebhookForm);
            
            // Cerrar modal con X
            $(document).on('click.sfq-webhooks', '.sfq-modal-close', this.hideWebhookForm);
            
            // Cerrar modal de logs
            $(document).on('click.sfq-webhooks', '#sfq-logs-modal .sfq-modal-close', this.hideLogsModal);
            
            // Cerrar modal al hacer clic fuera
            $(document).on('click.sfq-webhooks', '.sfq-modal', function(e) {
                if (e.target === this) {
                    SFQWebhooks.hideWebhookForm(e);
                }
            });
            
            // Botón para editar webhook
            $(document).on('click.sfq-webhooks', '.sfq-edit-webhook', this.editWebhook);
            
            // Botón para eliminar webhook
            $(document).on('click.sfq-webhooks', '.sfq-delete-webhook', this.deleteWebhook);
            
            // Botón para probar webhook
            $(document).on('click.sfq-webhooks', '.sfq-test-webhook', this.testWebhook);
            
            // Botón para ver logs
            $(document).on('click.sfq-webhooks', '.sfq-view-logs', this.viewWebhookLogs);
            
            // Toggle para activar/desactivar webhook
            $(document).on('change.sfq-webhooks', '.sfq-webhook-toggle', this.toggleWebhookStatus);
            
            // Cambio en el tipo de autenticación
            $(document).on('change.sfq-webhooks', '#auth-type', this.handleAuthTypeChange);
            
            // Gestión de headers personalizados
            $(document).on('click.sfq-webhooks', '#sfq-add-custom-header', this.addCustomHeader);
            $(document).on('click.sfq-webhooks', '.sfq-remove-custom-header', this.removeCustomHeader);
            $(document).on('input.sfq-webhooks', '.sfq-header-name, .sfq-header-value', this.syncHeadersToJSON);
            $(document).on('input.sfq-webhooks', '#custom-headers-json', this.syncJSONToHeaders);
            
            // Botones del modal de logs
            $(document).on('click.sfq-webhooks', '#sfq-refresh-logs', this.refreshLogs);
            $(document).on('click.sfq-webhooks', '#sfq-clear-logs', this.clearLogs);
            
            // Toggle para expandir/contraer detalles de logs
            $(document).on('click.sfq-webhooks', '.sfq-log-header', this.toggleLogDetails);
        },

        showAddWebhookForm: function(e) {
            e.preventDefault();
            
            // Limpiar campos del formulario
            $('#webhook-id').val('');
            $('#webhook-name').val('');
            $('#webhook-url').val('');
            $('#webhook-method').val('POST');
            $('#auth-type').val('none').trigger('change');
            $('#webhook-timeout').val('30');
            $('#webhook-retries').val('3');
            $('#webhook-retry-delay').val('300');
            $('#webhook-verify-ssl').prop('checked', true);
            
            // Limpiar campos de autenticación
            $('#bearer-token').val('');
            $('#basic-username').val('');
            $('#basic-password').val('');
            $('#api-key-name').val('');
            $('#api-key-value').val('');
            
            // Limpiar headers personalizados
            $('#sfq-custom-headers-list').empty();
            $('#custom-headers-json').val('');
            
            // Desmarcar todos los checkboxes de formularios
            $('input[name="form_ids[]"]').prop('checked', false);
            
            // Mostrar modal
            $('#sfq-webhook-modal').show();
            
            // Limpiar errores anteriores
            $('.field-error').remove();
            $('.error').removeClass('error');
        },

        hideWebhookForm: function(e) {
            e.preventDefault();
            $('#sfq-webhook-modal').hide();
        },

        hideLogsModal: function(e) {
            e.preventDefault();
            $('#sfq-logs-modal').hide();
        },

        saveWebhook: function(e) {
            e.preventDefault();
            
            const $button = $(this);
            const $form = $('#sfq-webhook-form');
            
            
            // ✅ CRÍTICO: Prevenir múltiples clics
            if ($button.prop('disabled') || $button.hasClass('saving')) {
                return;
            }
            
            // Validar formulario
            if (!SFQWebhooks.validateWebhookForm($form)) {
                return;
            }
            
            
            // ✅ CRÍTICO: Marcar como guardando para prevenir duplicados
            $button.addClass('saving').prop('disabled', true).text(sfq_webhook_ajax.strings.saving || 'Guardando...');
            
            // Recopilar datos del formulario manualmente
            const formData = {
                action: 'sfq_save_webhook',
                nonce: sfq_webhook_ajax.nonce,
                webhook_id: $('#webhook-id').val(),
                name: $('#webhook-name').val(),
                url: $('#webhook-url').val(),
                method: $('#webhook-method').val(),
                auth_type: $('#auth-type').val(),
                timeout: $('#webhook-timeout').val(),
                max_retries: $('#webhook-retries').val(),
                retry_delay: $('#webhook-retry-delay').val(),
                verify_ssl: $('#webhook-verify-ssl').is(':checked') ? '1' : '0',
            };
            
            // Añadir datos de autenticación según el tipo
            const authType = $('#auth-type').val();
            if (authType === 'bearer') {
                formData.bearer_token = $('#bearer-token').val();
            } else if (authType === 'basic') {
                formData.basic_username = $('#basic-username').val();
                formData.basic_password = $('#basic-password').val();
            } else if (authType === 'api_key') {
                formData.api_key_name = $('#api-key-name').val();
                formData.api_key_value = $('#api-key-value').val();
            }
            
            // Añadir headers personalizados
            formData.headers = SFQWebhooks.getCustomHeadersJSON();
            
            // Añadir formularios seleccionados
            const selectedForms = [];
            $('input[name="form_ids[]"]:checked').each(function() {
                selectedForms.push($(this).val());
            });
            formData.form_ids = selectedForms;
            
            // Enviar petición AJAX
            $.ajax({
                url: sfq_webhook_ajax.ajax_url,
                type: 'POST',
                data: formData,
                success: function(response) {
                    if (response.success) {
                        SFQWebhooks.showNotice('success', response.data.message || 'Webhook guardado correctamente');
                        SFQWebhooks.hideWebhookForm({preventDefault: function(){}});
                        SFQWebhooks.loadWebhooks();
                    } else {
                        SFQWebhooks.showNotice('error', response.data.message || 'Error al guardar webhook');
                    }
                },
                error: function(xhr, status, error) {
                    SFQWebhooks.showNotice('error', 'Error de conexión: ' + error);
                },
                complete: function() {
                    $button.removeClass('saving').prop('disabled', false).text('Guardar Webhook');
                }
            });
        },

        editWebhook: function(e) {
            e.preventDefault();
            
            const webhookId = $(this).data('webhook-id');
            
            // Cargar datos del webhook
            $.ajax({
                url: sfq_webhook_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'sfq_get_webhook',
                    webhook_id: webhookId,
                    nonce: sfq_webhook_ajax.nonce
                },
                success: function(response) {
                    if (response.success) {
                        
                        // ✅ CRÍTICO: Mostrar modal ANTES de poblar datos
                        $('#sfq-webhook-modal').show();
                        $('#sfq-modal-title').text('Editar Webhook');
                        
                        // ✅ CRÍTICO: Poblar datos después de mostrar modal
                        setTimeout(function() {
                            SFQWebhooks.populateWebhookForm(response.data.webhook);
                        }, 100);
                        
                    } else {
                        SFQWebhooks.showNotice('error', response.data.message || 'Error al cargar webhook');
                    }
                },
                error: function(xhr, status, error) {
                    SFQWebhooks.showNotice('error', 'Error de conexión: ' + error);
                }
            });
        },

        deleteWebhook: function(e) {
            e.preventDefault();
            
            if (!confirm('¿Estás seguro de que quieres eliminar este webhook?')) {
                return;
            }
            
            const webhookId = $(this).data('webhook-id');
            const $card = $(this).closest('.sfq-webhook-card');
            
            $.ajax({
                url: sfq_webhook_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'sfq_delete_webhook',
                    webhook_id: webhookId,
                    nonce: sfq_webhook_ajax.nonce
                },
                success: function(response) {
                    if (response.success) {
                        $card.fadeOut(300, function() {
                            $(this).remove();
                        });
                        SFQWebhooks.showNotice('success', response.data.message || 'Webhook eliminado correctamente');
                    } else {
                        SFQWebhooks.showNotice('error', response.data.message || 'Error al eliminar webhook');
                    }
                },
                error: function() {
                    SFQWebhooks.showNotice('error', 'Error de conexión');
                }
            });
        },

        testWebhook: function(e) {
            e.preventDefault();
            
            const webhookId = $(this).data('webhook-id');
            const $button = $(this);
            
            $button.prop('disabled', true).text('Probando...');
            
            $.ajax({
                url: sfq_webhook_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'sfq_test_webhook',
                    webhook_id: webhookId,
                    nonce: sfq_webhook_ajax.nonce
                },
                success: function(response) {
                    if (response.success) {
                        SFQWebhooks.showNotice('success', 'Webhook probado correctamente. Código de respuesta: ' + response.data.status_code);
                    } else {
                        SFQWebhooks.showNotice('error', response.data.message || 'Error al probar webhook');
                    }
                },
                error: function() {
                    SFQWebhooks.showNotice('error', 'Error de conexión');
                },
                complete: function() {
                    $button.prop('disabled', false).text('Probar');
                }
            });
        },

        toggleWebhookStatus: function() {
            const webhookId = $(this).data('webhook-id');
            const isActive = $(this).is(':checked');
            
            $.ajax({
                url: sfq_webhook_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'sfq_toggle_webhook',
                    webhook_id: webhookId,
                    is_active: isActive,
                    nonce: sfq_webhook_ajax.nonce
                },
                success: function(response) {
                    if (response.success) {
                        SFQWebhooks.showNotice('success', 'Estado del webhook actualizado');
                    } else {
                        SFQWebhooks.showNotice('error', response.data.message || 'Error al actualizar estado');
                        // Revertir el toggle si hay error
                        $(this).prop('checked', !isActive);
                    }
                }.bind(this),
                error: function() {
                    SFQWebhooks.showNotice('error', 'Error de conexión');
                    $(this).prop('checked', !isActive);
                }.bind(this)
            });
        },

        loadWebhooks: function() {
            const $container = $('.sfq-webhooks-list');
            
            $container.html('<div class="sfq-loading">Cargando webhooks...</div>');
            
            $.ajax({
                url: sfq_webhook_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'sfq_get_webhooks',
                    nonce: sfq_webhook_ajax.nonce
                },
                success: function(response) {
                    if (response.success) {
                        SFQWebhooks.renderWebhooksList(response.data.webhooks);
                    } else {
                        $container.html('<div class="sfq-error">Error al cargar webhooks</div>');
                    }
                },
                error: function() {
                    $container.html('<div class="sfq-error">Error de conexión</div>');
                }
            });
        },

        renderWebhooksList: function(webhooks) {
            const $container = $('.sfq-webhooks-list');
            
            if (!webhooks || webhooks.length === 0) {
                $container.html('<div class="sfq-no-webhooks">No hay webhooks configurados</div>');
                return;
            }
            
            let html = '';
            
            webhooks.forEach(function(webhook) {
                html += '<div class="sfq-webhook-card" data-webhook-id="' + webhook.id + '">';
                html += '  <div class="sfq-webhook-header">';
                html += '    <div class="sfq-webhook-info">';
                html += '      <h3>' + SFQWebhooks.escapeHtml(webhook.name) + '</h3>';
                html += '      <span class="sfq-webhook-url">' + SFQWebhooks.escapeHtml(webhook.url) + '</span>';
                html += '    </div>';
                html += '    <div class="sfq-webhook-status">';
                html += '      <label class="sfq-toggle">';
                html += '        <input type="checkbox" class="sfq-webhook-toggle" data-webhook-id="' + webhook.id + '"' + (webhook.is_active ? ' checked' : '') + '>';
                html += '        <span class="sfq-toggle-slider"></span>';
                html += '      </label>';
                html += '      <span class="sfq-status-text">' + (webhook.is_active ? 'Activo' : 'Inactivo') + '</span>';
                html += '    </div>';
                html += '  </div>';
                html += '  <div class="sfq-webhook-details">';
                html += '    <div class="sfq-webhook-meta">';
                html += '      <span class="sfq-meta-item"><strong>Método:</strong> ' + webhook.method.toUpperCase() + '</span>';
                html += '      <span class="sfq-meta-item"><strong>Timeout:</strong> ' + webhook.timeout + 's</span>';
                html += '      <span class="sfq-meta-item"><strong>Reintentos:</strong> ' + webhook.max_retries + '</span>';
                html += '      <span class="sfq-meta-item"><strong>SSL:</strong> ' + (webhook.verify_ssl ? 'Verificar' : 'No verificar') + '</span>';
                html += '    </div>';
                html += '    <div class="sfq-webhook-stats" id="webhook-stats-' + webhook.id + '">';
                html += '      <div class="sfq-stat"><span class="sfq-stat-value">-</span><span class="sfq-stat-label">Enviados</span></div>';
                html += '      <div class="sfq-stat"><span class="sfq-stat-value">-</span><span class="sfq-stat-label">Exitosos</span></div>';
                html += '      <div class="sfq-stat"><span class="sfq-stat-value">-</span><span class="sfq-stat-label">Fallidos</span></div>';
                html += '      <div class="sfq-stat"><span class="sfq-stat-value">-%</span><span class="sfq-stat-label">Tasa éxito</span></div>';
                html += '    </div>';
                html += '  </div>';
                html += '  <div class="sfq-webhook-actions">';
                html += '    <button class="button sfq-edit-webhook" data-webhook-id="' + webhook.id + '">';
                html += '      <span class="dashicons dashicons-edit"></span> Editar';
                html += '    </button>';
                html += '    <button class="button sfq-test-webhook" data-webhook-id="' + webhook.id + '">';
                html += '      <span class="dashicons dashicons-admin-tools"></span> Probar';
                html += '    </button>';
                html += '    <button class="button sfq-view-logs" data-webhook-id="' + webhook.id + '">';
                html += '      <span class="dashicons dashicons-list-view"></span> Logs';
                html += '    </button>';
                html += '    <button class="button sfq-delete-webhook" data-webhook-id="' + webhook.id + '">';
                html += '      <span class="dashicons dashicons-trash"></span> Eliminar';
                html += '    </button>';
                html += '  </div>';
                html += '</div>';
            });
            
            $container.html(html);
            
            // Cargar estadísticas para cada webhook
            webhooks.forEach(function(webhook) {
                SFQWebhooks.loadWebhookStats(webhook.id);
            });
        },

        loadWebhookStats: function(webhookId) {
            $.ajax({
                url: sfq_webhook_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'sfq_get_webhook_stats',
                    webhook_id: webhookId,
                    days: 7,
                    nonce: sfq_webhook_ajax.nonce
                },
                success: function(response) {
                    if (response.success) {
                        const stats = response.data;
                        const $statsContainer = $('#webhook-stats-' + webhookId);
                        
                        $statsContainer.find('.sfq-stat').eq(0).find('.sfq-stat-value').text(stats.total_attempts);
                        $statsContainer.find('.sfq-stat').eq(1).find('.sfq-stat-value').text(stats.successful);
                        $statsContainer.find('.sfq-stat').eq(2).find('.sfq-stat-value').text(stats.failed);
                        $statsContainer.find('.sfq-stat').eq(3).find('.sfq-stat-value').text(stats.success_rate + '%');
                    }
                },
                error: function() {
                    // Silenciar errores de estadísticas para no molestar al usuario
                }
            });
        },

        populateWebhookForm: function(webhook) {
            
            // ✅ CRÍTICO: Limpiar errores anteriores
            $('.field-error').remove();
            $('.error').removeClass('error');
            
            // Poblar campos básicos
            $('#webhook-id').val(webhook.id || '');
            $('#webhook-name').val(webhook.name || '');
            $('#webhook-url').val(webhook.url || '');
            $('#webhook-method').val(webhook.method || 'POST');
            $('#webhook-timeout').val(webhook.timeout || 30);
            $('#webhook-retries').val(webhook.max_retries || 3);
            $('#webhook-retry-delay').val(webhook.retry_delay || 300);
            $('#webhook-verify-ssl').prop('checked', webhook.verify_ssl == 1 || webhook.verify_ssl === true);
            
            
            // ✅ CRÍTICO: Manejar tipo de autenticación
            const authType = webhook.auth_type || 'none';
            $('#auth-type').val(authType);
            
            // ✅ CRÍTICO: Disparar cambio para mostrar campos de autenticación
            setTimeout(function() {
                $('#auth-type').trigger('change');
                
                // Poblar datos de autenticación después de mostrar campos
                setTimeout(function() {
                    if (webhook.auth_data && typeof webhook.auth_data === 'object') {
                        
                        switch (authType) {
                            case 'bearer':
                                $('#bearer-token').val(webhook.auth_data.token || '');
                                break;
                            case 'basic':
                                $('#basic-username').val(webhook.auth_data.username || '');
                                $('#basic-password').val(webhook.auth_data.password || '');
                                break;
                            case 'api_key':
                                $('#api-key-name').val(webhook.auth_data.key || '');
                                $('#api-key-value').val(webhook.auth_data.value || '');
                                break;
                        }
                    }
                }, 50);
            }, 50);
            
            // ✅ CRÍTICO: Poblar filtros de formularios
            // Primero desmarcar todos
            $('input[name="form_ids[]"]').prop('checked', false);
            
            if (webhook.form_filters && webhook.form_filters.form_ids && Array.isArray(webhook.form_filters.form_ids)) {
                webhook.form_filters.form_ids.forEach(function(formId) {
                    const $checkbox = $('input[name="form_ids[]"][value="' + formId + '"]');
                    if ($checkbox.length) {
                        $checkbox.prop('checked', true);
                    } else {
                    }
                });
            } else {
            }
            
            // ✅ CRÍTICO: Poblar headers personalizados
            SFQWebhooks.populateCustomHeaders(webhook.headers || '');
            
        },

        validateWebhookForm: function($form) {
            let isValid = true;
            
            // Validar nombre
            const name = $('#webhook-name').val().trim();
            if (!name) {
                SFQWebhooks.showFieldError('#webhook-name', 'El nombre es requerido');
                isValid = false;
            } else if (name.length > 255) {
                SFQWebhooks.showFieldError('#webhook-name', 'El nombre no puede exceder 255 caracteres');
                isValid = false;
            }
            
            // Validar URL
            const url = $('#webhook-url').val().trim();
            if (!url) {
                SFQWebhooks.showFieldError('#webhook-url', 'La URL es requerida');
                isValid = false;
            } else if (!SFQWebhooks.isValidUrl(url)) {
                SFQWebhooks.showFieldError('#webhook-url', 'La URL no es válida');
                isValid = false;
            } else if (SFQWebhooks.isDangerousUrl(url)) {
                SFQWebhooks.showFieldError('#webhook-url', 'URL potencialmente peligrosa detectada');
                isValid = false;
            }
            
            // Validar timeout
            const timeout = parseInt($('#webhook-timeout').val());
            if (timeout < 5 || timeout > 120) {
                SFQWebhooks.showFieldError('#webhook-timeout', 'Timeout debe estar entre 5 y 120 segundos');
                isValid = false;
            }
            
            // Validar reintentos
            const retries = parseInt($('#webhook-retries').val());
            if (retries < 0 || retries > 10) {
                SFQWebhooks.showFieldError('#webhook-retries', 'Reintentos debe estar entre 0 y 10');
                isValid = false;
            }
            
            // Validar retraso
            const delay = parseInt($('#webhook-retry-delay').val());
            if (delay < 60 || delay > 3600) {
                SFQWebhooks.showFieldError('#webhook-retry-delay', 'Retraso debe estar entre 60 y 3600 segundos');
                isValid = false;
            }
            
            // Headers personalizados - Sin validación en frontend
            // El backend se encarga de la validación y sanitización
            // Esto evita bloqueos innecesarios en el guardado
            
            // Validar autenticación
            const authType = $('#auth-type').val();
            if (authType === 'bearer') {
                const token = $('#bearer-token').val().trim();
                if (!token) {
                    SFQWebhooks.showFieldError('#bearer-token', 'Token es requerido para Bearer Auth');
                    isValid = false;
                }
            } else if (authType === 'basic') {
                const username = $('#basic-username').val().trim();
                const password = $('#basic-password').val().trim();
                if (!username || !password) {
                    SFQWebhooks.showFieldError('#basic-username', 'Usuario y contraseña son requeridos para Basic Auth');
                    isValid = false;
                }
            } else if (authType === 'api_key') {
                const keyName = $('#api-key-name').val().trim();
                const keyValue = $('#api-key-value').val().trim();
                if (!keyName || !keyValue) {
                    SFQWebhooks.showFieldError('#api-key-name', 'Nombre y valor de API Key son requeridos');
                    isValid = false;
                }
            }
            
            return isValid;
        },

        showFieldError: function(fieldSelector, message) {
            const $field = $(fieldSelector);
            $field.addClass('error');
            
            // Remover error anterior si existe
            $field.next('.field-error').remove();
            
            // Añadir nuevo mensaje de error
            $field.after('<div class="field-error">' + message + '</div>');
            
            // Remover error después de 5 segundos
            setTimeout(function() {
                $field.removeClass('error');
                $field.next('.field-error').fadeOut(300, function() {
                    $(this).remove();
                });
            }, 5000);
        },

        handleWebhookTypeChange: function() {
            const type = $(this).val();
            const $formSelect = $('#webhook_form_id').closest('tr');
            
            if (type === 'specific_form') {
                $formSelect.show();
            } else {
                $formSelect.hide();
                $('#webhook_form_id').val('');
            }
        },

        handleAuthTypeChange: function() {
            const authType = $(this).val();
            
            // Ocultar todos los campos de autenticación
            $('.auth-fields').hide();
            $('#auth-fields').hide();
            
            // Mostrar campos específicos según el tipo
            if (authType !== 'none') {
                $('#auth-fields').show();
                $('#' + authType + '-fields').show();
            }
        },

        handleFormChange: function() {
            // Aquí se puede añadir lógica adicional cuando cambia el formulario seleccionado
        },

        getWebhookTypeLabel: function(type) {
            const types = {
                'all_forms': 'Todos los formularios',
                'specific_form': 'Formulario específico'
            };
            return types[type] || type;
        },

        getFormLabel: function(formId) {
            if (!formId) return 'Todos';
            
            // Buscar en el select de formularios
            const $option = $('#webhook_form_id option[value="' + formId + '"]');
            return $option.length ? $option.text() : 'Formulario #' + formId;
        },

        isValidUrl: function(url) {
            try {
                new URL(url);
                return url.startsWith('http://') || url.startsWith('https://');
            } catch (e) {
                return false;
            }
        },

        isDangerousUrl: function(url) {
            try {
                const parsedUrl = new URL(url);
                const hostname = parsedUrl.hostname.toLowerCase();
                
                
                // Solo bloquear localhost y IPs privadas básicas
                // Las URLs públicas como n8nhook.mimandanga.com son válidas
                const dangerousHosts = [
                    'localhost',
                    '127.0.0.1',
                    '0.0.0.0',
                    '::1'
                ];
                
                if (dangerousHosts.includes(hostname)) {
                    return true;
                }
                
                // Solo bloquear IPs privadas reales, no dominios públicos
                // Clase A: 10.0.0.0/8
                if (hostname.match(/^10\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/)) {
                    return true;
                }
                
                // Clase B: 172.16.0.0/12
                if (hostname.match(/^172\.(1[6-9]|2[0-9]|3[01])\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/)) {
                    return true;
                }
                
                // Clase C: 192.168.0.0/16
                if (hostname.match(/^192\.168\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/)) {
                    return true;
                }
                
                // Bloquear esquemas peligrosos
                const dangerousSchemes = ['file', 'ftp', 'gopher', 'ldap', 'dict'];
                if (dangerousSchemes.includes(parsedUrl.protocol.replace(':', ''))) {
                    return true;
                }
                
                return false;
            } catch (e) {
                return true; // Si no se puede parsear, considerarlo peligroso
            }
        },

        isValidJSON: function(str) {
            try {
                JSON.parse(str);
                return true;
            } catch (e) {
                return false;
            }
        },

        escapeHtml: function(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        unescapeHtml: function(text) {
            const div = document.createElement('div');
            div.innerHTML = text;
            return div.textContent || div.innerText || '';
        },

        showNotice: function(type, message) {
            
            // Remover notices anteriores
            $('.sfq-notice').remove();
            
            // Asegurar que tenemos un mensaje
            if (!message || message.trim() === '') {
                message = type === 'success' ? 'Operación completada' : 'Ha ocurrido un error';
            }
            
            const noticeClass = type === 'success' ? 'notice-success' : 'notice-error';
            const notice = $('<div class="notice ' + noticeClass + ' is-dismissible sfq-notice"></div>');
            const paragraph = $('<p></p>').text(message);
            notice.append(paragraph);
            
            // Añadir botón de cerrar
            const dismissButton = $('<button type="button" class="notice-dismiss"><span class="screen-reader-text">Descartar este aviso.</span></button>');
            notice.append(dismissButton);
            
            
            // Insertar después del título
            const $target = $('.wrap h1').first();
            if ($target.length) {
                $target.after(notice);
            } else {
                // Fallback: insertar al inicio del wrap
                $('.wrap').prepend(notice);
            }
            
            // Manejar clic en cerrar
            dismissButton.on('click', function() {
                notice.fadeOut(300, function() {
                    $(this).remove();
                });
            });
            
            // Auto-remover después de 5 segundos para notices de éxito
            if (type === 'success') {
                setTimeout(function() {
                    if (notice.is(':visible')) {
                        notice.fadeOut(300, function() {
                            $(this).remove();
                        });
                    }
                }, 5000);
            }
            
            // Scroll al notice
            setTimeout(function() {
                if (notice.offset()) {
                    $('html, body').animate({
                        scrollTop: notice.offset().top - 50
                    }, 300);
                }
            }, 100);
        },

        // Funciones para logs de webhooks
        viewWebhookLogs: function(e) {
            e.preventDefault();
            
            const webhookId = $(this).data('webhook-id');
            
            // Guardar el ID del webhook actual para otras funciones
            SFQWebhooks.currentWebhookId = webhookId;
            
            // Mostrar modal de logs
            $('#sfq-logs-modal').show();
            
            // Cargar logs
            SFQWebhooks.loadWebhookLogs(webhookId);
        },

        loadWebhookLogs: function(webhookId, limit = 50) {
            const $logsContainer = $('#sfq-logs-list');
            const $loadingContainer = $('.sfq-logs-loading');
            
            // Mostrar loading
            $loadingContainer.show();
            $logsContainer.hide();
            
            $.ajax({
                url: sfq_webhook_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'sfq_get_webhook_logs',
                    webhook_id: webhookId,
                    limit: limit,
                    nonce: sfq_webhook_ajax.nonce
                },
                success: function(response) {
                    if (response.success) {
                        SFQWebhooks.renderWebhookLogs(response.data.logs);
                    } else {
                        $logsContainer.html('<div class="sfq-no-logs">Error al cargar logs: ' + (response.data.message || 'Error desconocido') + '</div>');
                    }
                },
                error: function(xhr, status, error) {
                    $logsContainer.html('<div class="sfq-no-logs">Error de conexión al cargar logs</div>');
                },
                complete: function() {
                    $loadingContainer.hide();
                    $logsContainer.show();
                }
            });
        },

        renderWebhookLogs: function(logs) {
            const $logsContainer = $('#sfq-logs-list');
            
            if (!logs || logs.length === 0) {
                $logsContainer.html('<div class="sfq-no-logs">No hay logs disponibles para este webhook</div>');
                return;
            }
            
            let html = '';
            
            logs.forEach(function(log) {
                const statusClass = log.status === 'success' ? 'success' : 'failed';
                const statusText = log.status === 'success' ? 'Éxito' : 'Fallo';
                const createdAt = new Date(log.created_at).toLocaleString();
                
                html += '<div class="sfq-log-entry">';
                html += '  <div class="sfq-log-header">';
                html += '    <div class="sfq-log-info">';
                html += '      <span class="sfq-log-date">' + createdAt + '</span>';
                html += '      <span class="sfq-log-status ' + statusClass + '">' + statusText + '</span>';
                if (log.status_code) {
                    html += '      <span class="sfq-log-code">HTTP ' + log.status_code + '</span>';
                }
                html += '    </div>';
                html += '    <span class="sfq-log-toggle">▼</span>';
                html += '  </div>';
                html += '  <div class="sfq-log-details">';
                
                // Información básica
                html += '    <div class="sfq-log-detail-row">';
                html += '      <span class="sfq-log-detail-label">URL:</span>';
                html += '      <span class="sfq-log-detail-value">' + SFQWebhooks.escapeHtml(log.url || 'N/A') + '</span>';
                html += '    </div>';
                
                html += '    <div class="sfq-log-detail-row">';
                html += '      <span class="sfq-log-detail-label">Método:</span>';
                html += '      <span class="sfq-log-detail-value">' + (log.method || 'POST') + '</span>';
                html += '    </div>';
                
                if (log.status_code) {
                    html += '    <div class="sfq-log-detail-row">';
                    html += '      <span class="sfq-log-detail-label">Código de estado:</span>';
                    html += '      <span class="sfq-log-detail-value">' + log.status_code + '</span>';
                    html += '    </div>';
                }
                
                if (log.response_time) {
                    html += '    <div class="sfq-log-detail-row">';
                    html += '      <span class="sfq-log-detail-label">Tiempo de respuesta:</span>';
                    html += '      <span class="sfq-log-detail-value">' + log.response_time + 'ms</span>';
                    html += '    </div>';
                }
                
                if (log.error_message) {
                    html += '    <div class="sfq-log-detail-row">';
                    html += '      <span class="sfq-log-detail-label">Error:</span>';
                    html += '      <span class="sfq-log-detail-value sfq-error-text">' + SFQWebhooks.escapeHtml(log.error_message) + '</span>';
                    html += '    </div>';
                }
                
                // Datos enviados
                if (log.request_data) {
                    html += '    <div class="sfq-log-detail-row">';
                    html += '      <span class="sfq-log-detail-label">Datos enviados:</span>';
                    html += '      <div class="sfq-log-json">' + SFQWebhooks.formatJSON(log.request_data) + '</div>';
                    html += '    </div>';
                }
                
                // Respuesta recibida
                if (log.response_data) {
                    html += '    <div class="sfq-log-detail-row">';
                    html += '      <span class="sfq-log-detail-label">Respuesta:</span>';
                    html += '      <div class="sfq-log-json">' + SFQWebhooks.formatJSON(log.response_data) + '</div>';
                    html += '    </div>';
                }
                
                html += '  </div>';
                html += '</div>';
            });
            
            $logsContainer.html(html);
        },

        toggleLogDetails: function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            
            const $header = $(e.currentTarget);
            const $details = $header.next('.sfq-log-details');
            const $toggle = $header.find('.sfq-log-toggle');
            
            
            if ($details.length === 0) {
                return;
            }
            
            if ($details.hasClass('expanded')) {
                $details.removeClass('expanded').hide();
                $toggle.text('▼');
            } else {
                $details.addClass('expanded').show();
                $toggle.text('▲');
            }
            
        },

        refreshLogs: function(e) {
            e.preventDefault();
            
            if (SFQWebhooks.currentWebhookId) {
                SFQWebhooks.loadWebhookLogs(SFQWebhooks.currentWebhookId);
            }
        },

        clearLogs: function(e) {
            e.preventDefault();
            
            if (!confirm('¿Estás seguro de que quieres limpiar todos los logs de este webhook?')) {
                return;
            }
            
            const webhookId = SFQWebhooks.currentWebhookId;
            const $button = $(this);
            
            $button.prop('disabled', true).text('Limpiando...');
            
            $.ajax({
                url: sfq_webhook_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'sfq_clear_webhook_logs',
                    webhook_id: webhookId,
                    nonce: sfq_webhook_ajax.nonce
                },
                success: function(response) {
                    if (response.success) {
                        SFQWebhooks.showNotice('success', response.data.message || 'Logs limpiados correctamente');
                        SFQWebhooks.loadWebhookLogs(webhookId); // Recargar logs
                    } else {
                        SFQWebhooks.showNotice('error', response.data.message || 'Error al limpiar logs');
                    }
                },
                error: function() {
                    SFQWebhooks.showNotice('error', 'Error de conexión');
                },
                complete: function() {
                    $button.prop('disabled', false).text('Limpiar Logs');
                }
            });
        },

        formatJSON: function(jsonString) {
            try {
                const parsed = JSON.parse(jsonString);
                return JSON.stringify(parsed, null, 2);
            } catch (e) {
                return jsonString; // Devolver tal como está si no es JSON válido
            }
        },

        // Funciones para configuración de seguridad
        initSecuritySettings: function() {
            // ✅ CRÍTICO: Usar namespaces para evitar handlers duplicados
            // Eventos para configuración de seguridad
            $(document).on('click.sfq-webhooks', '#sfq-add-trusted-url', this.addTrustedUrl);
            $(document).on('click.sfq-webhooks', '.sfq-remove-url', this.removeTrustedUrl);
            $(document).on('change.sfq-webhooks', '#sfq-dev-mode', this.toggleDevMode);
            $(document).on('submit.sfq-webhooks', '#sfq-security-settings-form', this.saveSecuritySettings);
        },

        addTrustedUrl: function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Prevenir múltiples ejecuciones
            const $button = $(this);
            if ($button.prop('disabled')) {
                return;
            }
            
            // Deshabilitar temporalmente el botón
            $button.prop('disabled', true);
            
            const $list = $('#sfq-trusted-urls-list');
            const $newItem = $('<div class="sfq-trusted-url-item">' +
                '<input type="text" name="trusted_urls[]" value="" placeholder="localhost:5678">' +
                '<button type="button" class="button sfq-remove-url">❌</button>' +
                '</div>');
            
            $list.append($newItem);
            $newItem.find('input').focus();
            
            // Rehabilitar el botón después de un breve delay
            setTimeout(function() {
                $button.prop('disabled', false);
            }, 200);
        },

        removeTrustedUrl: function(e) {
            e.preventDefault();
            $(this).closest('.sfq-trusted-url-item').fadeOut(300, function() {
                $(this).remove();
            });
        },

        toggleDevMode: function() {
            const isChecked = $(this).is(':checked');
            const $label = $('.sfq-toggle-label');
            
            $label.text(isChecked ? 'Activado' : 'Desactivado');
            
            // Mostrar/ocultar advertencia
            const $warning = $('.notice-warning.inline');
            if (isChecked) {
                if ($warning.length === 0) {
                    const warningHtml = '<div class="notice notice-warning inline">' +
                        '<p><strong>⚠️ ADVERTENCIA:</strong> ' +
                        'El modo desarrollo está activado. Todas las URLs locales serán permitidas. NO usar en producción.</p>' +
                        '</div>';
                    $('.sfq-dev-mode-toggle').after(warningHtml);
                }
            } else {
                $warning.remove();
            }
        },

        saveSecuritySettings: function(e) {
            e.preventDefault();
            
            const $button = $(this);
            const $status = $('.sfq-save-status');
            
            // Recopilar URLs confiables
            const trustedUrls = [];
            $('#sfq-trusted-urls-list input').each(function() {
                const url = $(this).val().trim();
                if (url) {
                    trustedUrls.push(url);
                }
            });
            
            // Estado del modo desarrollo
            const devMode = $('#sfq-dev-mode').is(':checked');
            
            // Mostrar loading
            $button.prop('disabled', true).text('Guardando...');
            $status.hide();
            
            // Enviar datos
            $.ajax({
                url: sfq_webhook_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'sfq_save_webhook_settings',
                    dev_mode: devMode,
                    trusted_urls: trustedUrls,
                    nonce: sfq_webhook_ajax.nonce
                },
                success: function(response) {
                    if (response.success) {
                        SFQWebhooks.showNotice('success', response.data.message || 'Configuración guardada correctamente');
                        $status.text('✅ Guardado').css('color', '#46b450').show();
                    } else {
                        SFQWebhooks.showNotice('error', response.data.message || 'Error al guardar configuración');
                        $status.text('❌ Error').css('color', '#dc3232').show();
                    }
                },
                error: function() {
                    SFQWebhooks.showNotice('error', 'Error de conexión');
                    $status.text('❌ Error de conexión').css('color', '#dc3232').show();
                },
                complete: function() {
                    $button.prop('disabled', false).text('💾 Guardar Configuración');
                    
                    // Ocultar status después de 3 segundos
                    setTimeout(function() {
                        $status.fadeOut();
                    }, 3000);
                }
            });
        },

        // Funciones para headers personalizados
        addCustomHeader: function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Prevenir múltiples ejecuciones
            const $button = $(this);
            if ($button.prop('disabled')) {
                return;
            }
            
            // Deshabilitar temporalmente el botón
            $button.prop('disabled', true);
            
            const $list = $('#sfq-custom-headers-list');
            const $newItem = $('<div class="sfq-custom-header-item">' +
                '<div class="sfq-header-row">' +
                    '<input type="text" class="sfq-header-name" placeholder="X-Custom-Header" value="">' +
                    '<input type="text" class="sfq-header-value" placeholder="valor" value="">' +
                    '<button type="button" class="button sfq-remove-custom-header">❌</button>' +
                '</div>' +
                '</div>');
            
            $list.append($newItem);
            $newItem.find('.sfq-header-name').focus();
            
            // Sincronizar con JSON después de añadir
            setTimeout(function() {
                SFQWebhooks.syncHeadersToJSON();
            }, 100);
            
            // Rehabilitar el botón después de un breve delay
            setTimeout(function() {
                $button.prop('disabled', false);
            }, 200);
        },

        removeCustomHeader: function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const $item = $(this).closest('.sfq-custom-header-item');
            $item.fadeOut(300, function() {
                $(this).remove();
                // Sincronizar con JSON después de eliminar
                SFQWebhooks.syncHeadersToJSON();
            });
        },

        syncHeadersToJSON: function() {
            const headers = {};
            let hasHeaders = false;
            
            $('.sfq-custom-header-item').each(function() {
                const name = $(this).find('.sfq-header-name').val().trim();
                const value = $(this).find('.sfq-header-value').val().trim();
                
                if (name && value) {
                    headers[name] = value;
                    hasHeaders = true;
                }
            });
            
            const jsonString = hasHeaders ? JSON.stringify(headers, null, 2) : '';
            $('#custom-headers-json').val(jsonString);
            
        },

        syncJSONToHeaders: function() {
            const jsonString = $('#custom-headers-json').val().trim();
            
            if (!jsonString) {
                // Si el JSON está vacío, limpiar todos los headers
                $('#sfq-custom-headers-list').empty();
                return;
            }
            
            try {
                const headers = JSON.parse(jsonString);
                
                if (typeof headers === 'object' && headers !== null && !Array.isArray(headers)) {
                    // Limpiar headers existentes
                    $('#sfq-custom-headers-list').empty();
                    
                    // Añadir headers desde JSON
                    Object.keys(headers).forEach(function(name) {
                        const value = headers[name];
                        if (name && value) {
                            const $newItem = $('<div class="sfq-custom-header-item">' +
                                '<div class="sfq-header-row">' +
                                    '<input type="text" class="sfq-header-name" placeholder="X-Custom-Header" value="' + SFQWebhooks.escapeHtml(name) + '">' +
                                    '<input type="text" class="sfq-header-value" placeholder="valor" value="' + SFQWebhooks.escapeHtml(value) + '">' +
                                    '<button type="button" class="button sfq-remove-custom-header">❌</button>' +
                                '</div>' +
                                '</div>');
                            
                            $('#sfq-custom-headers-list').append($newItem);
                        }
                    });
                    
                }
            } catch (e) {
                // No hacer nada si el JSON es inválido, dejar que el usuario lo corrija
            }
        },

        populateCustomHeaders: function(headersString) {
            
            // Limpiar headers existentes
            $('#sfq-custom-headers-list').empty();
            $('#custom-headers-json').val('');
            
            if (!headersString || headersString.trim() === '') {
                return;
            }
            
            try {
                const headers = JSON.parse(headersString);
                
                if (typeof headers === 'object' && headers !== null && !Array.isArray(headers)) {
                    // Poblar el JSON textarea
                    $('#custom-headers-json').val(JSON.stringify(headers, null, 2));
                    
                    // Poblar los campos individuales
                    Object.keys(headers).forEach(function(name) {
                        const value = headers[name];
                        if (name && value) {
                            const $newItem = $('<div class="sfq-custom-header-item">' +
                                '<div class="sfq-header-row">' +
                                    '<input type="text" class="sfq-header-name" placeholder="X-Custom-Header" value="' + SFQWebhooks.escapeHtml(name) + '">' +
                                    '<input type="text" class="sfq-header-value" placeholder="valor" value="' + SFQWebhooks.escapeHtml(value) + '">' +
                                    '<button type="button" class="button sfq-remove-custom-header">❌</button>' +
                                '</div>' +
                                '</div>');
                            
                            $('#sfq-custom-headers-list').append($newItem);
                        }
                    });
                    
                }
            } catch (e) {
                // Si no es JSON válido, mostrar como texto plano en el textarea
                $('#custom-headers-json').val(headersString);
            }
        },

        getCustomHeadersJSON: function() {
            // Primero intentar obtener desde el JSON textarea
            const jsonString = $('#custom-headers-json').val().trim();
            
            if (jsonString) {
                try {
                    JSON.parse(jsonString); // Validar que es JSON válido
                    return jsonString;
                } catch (e) {
                }
            }
            
            // Si no hay JSON válido, construir desde los campos individuales
            const headers = {};
            let hasHeaders = false;
            
            $('.sfq-custom-header-item').each(function() {
                const name = $(this).find('.sfq-header-name').val().trim();
                const value = $(this).find('.sfq-header-value').val().trim();
                
                if (name && value) {
                    headers[name] = value;
                    hasHeaders = true;
                }
            });
            
            return hasHeaders ? JSON.stringify(headers) : '';
        }
    };

    // Inicializar cuando el documento esté listo
    $(document).ready(function() {
        if ($('.sfq-webhooks-wrap').length) {
            SFQWebhooks.init();
        }
    });

})(jQuery);
