/**
 * Smart Forms & Quiz - Admin Forms List
 * Manejo de la lista principal de formularios con estadísticas en tiempo real
 */

(function($) {
    'use strict';

    class SFQFormsList {
        constructor() {
            this.init();
        }

        init() {
            this.bindEvents();
            this.initCopyShortcode();
            this.loadFormStatistics(); // Cargar estadísticas al iniciar
        }

        bindEvents() {
            // Duplicate form buttons
            $(document).on('click', '.sfq-duplicate-form', (e) => {
                e.preventDefault();
                const formId = $(e.currentTarget).data('form-id');
                this.duplicateForm(formId, $(e.currentTarget));
            });

            // Delete form buttons
            $(document).on('click', '.sfq-delete-form', (e) => {
                e.preventDefault();
                const formId = $(e.currentTarget).data('form-id');
                this.deleteForm(formId, $(e.currentTarget));
            });
        }

        /**
         * Cargar estadísticas de todos los formularios
         */
        async loadFormStatistics() {
            // Obtener todos los formularios en la página
            const formCards = $('.sfq-form-card');
            
            if (formCards.length === 0) {
                return;
            }

            // Mostrar indicador de carga
            formCards.each(function() {
                const formId = $(this).data('form-id');
                $(`#views-${formId}`).html('<span class="sfq-loading-spinner"></span>');
                $(`#completed-${formId}`).html('<span class="sfq-loading-spinner"></span>');
                $(`#rate-${formId}`).html('<span class="sfq-loading-spinner"></span>');
            });

            // Cargar estadísticas para cada formulario
            formCards.each(async (index, card) => {
                const formId = $(card).data('form-id');
                await this.loadSingleFormStats(formId);
            });
        }

        /**
         * Cargar estadísticas de un formulario específico
         */
        async loadSingleFormStats(formId) {
            try {
                const response = await $.ajax({
                    url: sfq_ajax.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'sfq_get_form_quick_stats',
                        nonce: sfq_ajax.nonce,
                        form_id: formId
                    },
                    timeout: 10000
                });

                if (response.success && response.data) {
                    // Actualizar los valores en la tarjeta
                    this.updateFormCard(formId, response.data);
                } else {
                    // Si hay error, mostrar valores por defecto
                    this.updateFormCard(formId, {
                        views: 0,
                        completed: 0,
                        rate: 0
                    });
                }
            } catch (error) {
                // En caso de error, mostrar valores por defecto
                this.updateFormCard(formId, {
                    views: 0,
                    completed: 0,
                    rate: 0
                });
            }
        }

        /**
         * Actualizar los valores en la tarjeta del formulario
         */
        updateFormCard(formId, stats) {
            // Animar la actualización de los números
            this.animateNumber(`#views-${formId}`, stats.views || 0);
            this.animateNumber(`#completed-${formId}`, stats.completed || 0);
            this.animateNumber(`#partial-${formId}`, stats.partial_responses || 0);
            
            // Actualizar la tasa de conversión
            const rateElement = $(`#rate-${formId}`);
            const rateValue = stats.rate || 0;
            rateElement.text(`${rateValue}%`);
            
            // Añadir color según el rendimiento
            if (rateValue >= 70) {
                rateElement.addClass('sfq-rate-high').removeClass('sfq-rate-medium sfq-rate-low');
            } else if (rateValue >= 40) {
                rateElement.addClass('sfq-rate-medium').removeClass('sfq-rate-high sfq-rate-low');
            } else {
                rateElement.addClass('sfq-rate-low').removeClass('sfq-rate-high sfq-rate-medium');
            }
        }

        /**
         * Animar el cambio de número
         */
        animateNumber(selector, endValue) {
            const element = $(selector);
            const startValue = 0;
            const duration = 1000;
            const startTime = Date.now();
            
            const animate = () => {
                const currentTime = Date.now();
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Función de easing
                const easeOutQuart = 1 - Math.pow(1 - progress, 4);
                const currentValue = Math.floor(startValue + (endValue - startValue) * easeOutQuart);
                
                element.text(currentValue.toLocaleString());
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };
            
            animate();
        }

        async duplicateForm(formId, $button) {
            if (!formId) {
                this.showNotice('ID de formulario inválido', 'error');
                return;
            }

            // Disable button and show loading
            const originalText = $button.html();
            $button.prop('disabled', true).html('<span class="sfq-loading-spinner"></span> Duplicando...');

            try {
                const response = await $.ajax({
                    url: sfq_ajax.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'sfq_duplicate_form',
                        nonce: sfq_ajax.nonce,
                        form_id: formId
                    },
                    timeout: 30000
                });

                if (response.success) {
                    this.showNotice('Formulario duplicado correctamente', 'success');
                    // Reload page to show the new form
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    throw new Error(response.data?.message || 'Error al duplicar el formulario');
                }
            } catch (error) {
                this.showNotice('Error al duplicar: ' + error.message, 'error');
            } finally {
                $button.prop('disabled', false).html(originalText);
            }
        }

        async deleteForm(formId, $button) {
            if (!formId) {
                this.showNotice('ID de formulario inválido', 'error');
                return;
            }

            // Confirm deletion
            if (!confirm(sfq_ajax.strings.confirm_delete_form || '¿Estás seguro de eliminar este formulario? Esta acción no se puede deshacer.')) {
                return;
            }

            // Disable button and show loading
            const originalText = $button.html();
            $button.prop('disabled', true).html('<span class="sfq-loading-spinner"></span> Eliminando...');

            try {
                const response = await $.ajax({
                    url: sfq_ajax.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'sfq_delete_form',
                        nonce: sfq_ajax.nonce,
                        form_id: formId
                    },
                    timeout: 30000
                });

                if (response.success) {
                    this.showNotice('Formulario eliminado correctamente', 'success');
                    // Remove the form card with animation
                    const $formCard = $button.closest('.sfq-form-card');
                    $formCard.fadeOut(300, function() {
                        $(this).remove();
                        // Check if no forms left
                        if ($('.sfq-form-card').length === 0) {
                            window.location.reload();
                        }
                    });
                } else {
                    throw new Error(response.data?.message || 'Error al eliminar el formulario');
                }
            } catch (error) {
                this.showNotice('Error al eliminar: ' + error.message, 'error');
                $button.prop('disabled', false).html(originalText);
            }
        }

        initCopyShortcode() {
            $(document).on('click', '.sfq-copy-shortcode', function(e) {
                e.preventDefault();
                const shortcode = $(this).data('shortcode');
                
                // Create temporary input to copy text
                const $temp = $('<input>');
                $('body').append($temp);
                $temp.val(shortcode).select();
                document.execCommand('copy');
                $temp.remove();
                
                // Show feedback
                const $button = $(this);
                const originalHtml = $button.html();
                $button.html('<span class="dashicons dashicons-yes"></span>');
                
                setTimeout(() => {
                    $button.html(originalHtml);
                }, 2000);
            });
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
            
            // Auto-remove after 4 seconds
            setTimeout(() => {
                $notice.fadeOut(300, function() {
                    $(this).remove();
                });
            }, 4000);
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

    // Initialize when DOM is ready
    $(document).ready(function() {
        // Only initialize on forms list page
        if ($('.sfq-forms-grid').length > 0 || $('.sfq-empty-state').length > 0) {
            new SFQFormsList();
        }
    });

    // Añadir estilos para los indicadores de tasa
    const style = document.createElement('style');
    style.textContent = `
        .sfq-loading-spinner {
            display: inline-block;
            width: 14px;
            height: 14px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #007cba;
            border-radius: 50%;
            animation: sfq-spin 1s linear infinite;
        }
        
        @keyframes sfq-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .sfq-rate-high {
            color: #46b450;
            font-weight: bold;
        }
        
        .sfq-rate-medium {
            color: #f0b849;
            font-weight: bold;
        }
        
        .sfq-rate-low {
            color: #dc3232;
            font-weight: bold;
        }
        
        .sfq-stat-value {
            transition: all 0.3s ease;
        }
    `;
    document.head.appendChild(style);

})(jQuery);
