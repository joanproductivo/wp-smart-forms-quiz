/**
 * Smart Forms & Quiz - Admin Forms List
 * Manejo de la lista principal de formularios
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
                console.error('Error duplicating form:', error);
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
                console.error('Error deleting form:', error);
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

})(jQuery);
