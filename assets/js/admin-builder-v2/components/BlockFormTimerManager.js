/**
 * BlockFormTimerManager - Gestión del timer de bloqueo de formularios
 * Smart Forms & Quiz - Admin Builder v2
 */

(function($) {
    'use strict';

    class SFQ_BlockFormTimerManager {
        constructor(formBuilder) {
            this.formBuilder = formBuilder;
            this.eventNamespace = '.' + this.formBuilder.instanceId + '_timer';
        }

        init() {
            console.log('SFQ BlockFormTimerManager: Initializing...');
            this.bindEvents();
        }

        /**
         * Método público para vincular eventos (requerido por EventManager)
         */
        bindEvents() {
            this.bindTimerEvents();
        }

        /**
         * Vincular todos los eventos relacionados con el timer de bloqueo
         */
        bindTimerEvents() {
            const ns = this.eventNamespace;
            
            // Limpiar eventos previos
            this.unbindTimerEvents();
            
            // Event listener para activar/desactivar timer
            $('#block-form-enable-timer').on('change' + ns, (e) => {
                this.handleTimerToggle(e);
            });
            
            // Event listener para mostrar/ocultar la opción de desaparecer completamente
            $('#block-form-timer-show-form').on('change' + ns, (e) => {
                this.handleShowFormToggle(e);
            });
            
            // Event listeners para campos del timer
            const timerFields = [
                '#block-form-timer-date',
                '#block-form-timer-text', 
                '#block-form-timer-opened-text',
                '#block-form-timer-show-form',
                '#block-form-timer-hide-all'
            ];
            
            $(timerFields.join(', ')).on('change input' + ns, () => {
                if (!this.formBuilder.isDestroyed) {
                    this.formBuilder.isDirty = true;
                }
            });
            
            // Event listeners para campos del mensaje de disponibilidad del timer
            const availabilityFields = [
                '#block-form-timer-available-icon',
                '#block-form-timer-available-title',
                '#block-form-timer-available-description',
                '#block-form-timer-available-button-text',
                '#block-form-timer-available-button-url'
            ];
            
            $(availabilityFields.join(', ')).on('change input' + ns, () => {
                if (!this.formBuilder.isDestroyed) {
                    this.formBuilder.isDirty = true;
                }
            });
            
            // Event listeners para colores del timer de bloqueo
            const timerColorFields = [
                '#block-form-bg-color',
                '#block-form-border-color', 
                '#block-form-icon-color',
                '#block-form-title-color',
                '#block-form-text-color',
                '#block-form-button-bg-color',
                '#block-form-button-text-color',
                '#block-form-timer-unit-bg-color',
                '#block-form-timer-container-bg-color',
                '#block-form-timer-container-border-color',
                '#block-form-timer-unit-border-color',
                '#block-form-disable-shadow'
            ];
            
            $(timerColorFields.join(', ')).on('change' + ns, () => {
                if (!this.formBuilder.isDestroyed) {
                    this.formBuilder.isDirty = true;
                }
            });
            
            // Event listeners para colores del mensaje de disponibilidad
            const availabilityColorFields = [
                '#block-form-timer-available-bg-color',
                '#block-form-timer-available-border-color',
                '#block-form-timer-available-icon-color',
                '#block-form-timer-available-title-color',
                '#block-form-timer-available-text-color',
                '#block-form-timer-available-button-bg-color',
                '#block-form-timer-available-button-text-color'
            ];
            
            $(availabilityColorFields.join(', ')).on('change' + ns, () => {
                if (!this.formBuilder.isDestroyed) {
                    this.formBuilder.isDirty = true;
                }
            });
            
            console.log('SFQ BlockFormTimerManager: Timer events bound');
        }

        /**
         * Manejar activación/desactivación del timer
         */
        handleTimerToggle(e) {
            const $checkbox = $(e.target);
            const isChecked = $checkbox.is(':checked');
            
            if (isChecked) {
                $('#block-form-timer-settings').slideDown();
                $('#block-form-timer-available-section').slideDown();
                
                // Mostrar la sección de colores del mensaje de disponibilidad
                $('.sfq-message-config-section').each(function() {
                    const $section = $(this);
                    const titleText = $section.find('h4').text();
                    // Buscar específicamente la sección que NO incluye "Bloqueo" en el título
                    if (titleText.includes('🎨 Colores del Mensaje') && !titleText.includes('Bloqueo')) {
                        $section.slideDown();
                    }
                });
            } else {
                $('#block-form-timer-settings').slideUp();
                $('#block-form-timer-available-section').slideUp();
                
                // Ocultar la sección de colores del mensaje de disponibilidad
                $('.sfq-message-config-section').each(function() {
                    const $section = $(this);
                    const titleText = $section.find('h4').text();
                    // Buscar específicamente la sección que NO incluye "Bloqueo" en el título
                    if (titleText.includes('🎨 Colores del Mensaje') && !titleText.includes('Bloqueo')) {
                        $section.slideUp();
                    }
                });
            }
            
            if (!this.formBuilder.isDestroyed) {
                this.formBuilder.isDirty = true;
            }
        }

        /**
         * Manejar toggle de mostrar formulario al expirar
         */
        handleShowFormToggle(e) {
            const $checkbox = $(e.target);
            const isChecked = $checkbox.is(':checked');
            
            if (isChecked) {
                $('#block-form-timer-hide-all-container').slideDown();
            } else {
                $('#block-form-timer-hide-all-container').slideUp();
            }
            
            if (!this.formBuilder.isDestroyed) {
                this.formBuilder.isDirty = true;
            }
        }

        /**
         * Poblar configuraciones del timer desde los datos del formulario
         */
        populateTimerSettings(styles) {
            console.log('SFQ BlockFormTimerManager: Populating timer settings:', styles);
            
            // Configuraciones básicas del timer
            $('#block-form-enable-timer').prop('checked', styles.block_form_enable_timer === true).trigger('change');
            $('#block-form-timer-date').val(styles.block_form_timer_date || '');
            $('#block-form-timer-text').val(styles.block_form_timer_text || '');
            $('#block-form-timer-opened-text').val(styles.block_form_timer_opened_text || '');
            $('#block-form-timer-show-form').prop('checked', styles.block_form_timer_show_form === true).trigger('change');
            $('#block-form-timer-hide-all').prop('checked', styles.block_form_timer_hide_all === true);
            
            // Configuraciones del mensaje de disponibilidad del timer
            $('#block-form-timer-available-icon').val(styles.block_form_timer_available_icon || '');
            $('#block-form-timer-available-title').val(styles.block_form_timer_available_title || '');
            $('#block-form-timer-available-description').val(styles.block_form_timer_available_description || '');
            $('#block-form-timer-available-button-text').val(styles.block_form_timer_available_button_text || '');
            $('#block-form-timer-available-button-url').val(styles.block_form_timer_available_button_url || '');
            
            // Colores del mensaje de disponibilidad del timer
            $('#block-form-timer-available-bg-color').val(styles.block_form_timer_available_bg_color || '#f8f9fa').trigger('change');
            $('#block-form-timer-available-border-color').val(styles.block_form_timer_available_border_color || '#e9ecef').trigger('change');
            $('#block-form-timer-available-icon-color').val(styles.block_form_timer_available_icon_color || '#28a745').trigger('change');
            $('#block-form-timer-available-title-color').val(styles.block_form_timer_available_title_color || '#28a745').trigger('change');
            $('#block-form-timer-available-text-color').val(styles.block_form_timer_available_text_color || '#666666').trigger('change');
            $('#block-form-timer-available-button-bg-color').val(styles.block_form_timer_available_button_bg_color || '#28a745').trigger('change');
            $('#block-form-timer-available-button-text-color').val(styles.block_form_timer_available_button_text_color || '#ffffff').trigger('change');
            
            // Colores específicos de bloqueo de formulario con timer
            $('#block-form-timer-unit-bg-color').val(styles.block_form_timer_unit_bg_color || '#ffffff').trigger('change');
            $('#block-form-timer-container-bg-color').val(styles.block_form_timer_container_bg_color || '#f8f9fa').trigger('change');
            $('#block-form-timer-container-border-color').val(styles.block_form_timer_container_border_color || '#e9ecef').trigger('change');
            $('#block-form-timer-unit-border-color').val(styles.block_form_timer_unit_border_color || '#e9ecef').trigger('change');
            $('#block-form-disable-shadow').prop('checked', styles.block_form_disable_shadow === true);
            
            console.log('SFQ BlockFormTimerManager: Timer settings populated');
        }

        /**
         * Recopilar configuraciones del timer para guardar
         */
        collectTimerSettings() {
            const timerSettings = {
                // Configuración básica del timer
                block_form_enable_timer: $('#block-form-enable-timer').is(':checked'),
                block_form_timer_date: $('#block-form-timer-date').val() || '',
                block_form_timer_text: $('#block-form-timer-text').val() || '',
                block_form_timer_opened_text: $('#block-form-timer-opened-text').val() || '',
                block_form_timer_show_form: $('#block-form-timer-show-form').is(':checked'),
                block_form_timer_hide_all: $('#block-form-timer-hide-all').is(':checked'),
                
                // Configuración del mensaje de disponibilidad del timer
                block_form_timer_available_icon: $('#block-form-timer-available-icon').val() || '',
                block_form_timer_available_title: $('#block-form-timer-available-title').val() || '',
                block_form_timer_available_description: $('#block-form-timer-available-description').val() || '',
                block_form_timer_available_button_text: $('#block-form-timer-available-button-text').val() || '',
                block_form_timer_available_button_url: $('#block-form-timer-available-button-url').val() || '',
                
                // Colores del mensaje de disponibilidad del timer
                block_form_timer_available_bg_color: $('#block-form-timer-available-bg-color').val() || '#f8f9fa',
                block_form_timer_available_border_color: $('#block-form-timer-available-border-color').val() || '#e9ecef',
                block_form_timer_available_icon_color: $('#block-form-timer-available-icon-color').val() || '#28a745',
                block_form_timer_available_title_color: $('#block-form-timer-available-title-color').val() || '#28a745',
                block_form_timer_available_text_color: $('#block-form-timer-available-text-color').val() || '#666666',
                block_form_timer_available_button_bg_color: $('#block-form-timer-available-button-bg-color').val() || '#28a745',
                block_form_timer_available_button_text_color: $('#block-form-timer-available-button-text-color').val() || '#ffffff',
                
                // Colores específicos del timer de bloqueo
                block_form_timer_unit_bg_color: $('#block-form-timer-unit-bg-color').val() || '#ffffff',
                block_form_timer_container_bg_color: $('#block-form-timer-container-bg-color').val() || '#f8f9fa',
                block_form_timer_container_border_color: $('#block-form-timer-container-border-color').val() || '#e9ecef',
                block_form_timer_unit_border_color: $('#block-form-timer-unit-border-color').val() || '#e9ecef',
                block_form_disable_shadow: $('#block-form-disable-shadow').is(':checked')
            };
            
            console.log('SFQ BlockFormTimerManager: Collected timer settings:', timerSettings);
            return timerSettings;
        }

        /**
         * Desvincular eventos del timer
         */
        unbindTimerEvents() {
            const ns = this.eventNamespace;
            
            // Desvincular todos los eventos relacionados con el timer
            $('#block-form-enable-timer').off(ns);
            $('#block-form-timer-show-form').off(ns);
            
            // Campos del timer
            const timerFields = [
                '#block-form-timer-date',
                '#block-form-timer-text', 
                '#block-form-timer-opened-text',
                '#block-form-timer-show-form',
                '#block-form-timer-hide-all'
            ];
            $(timerFields.join(', ')).off(ns);
            
            // Campos del mensaje de disponibilidad
            const availabilityFields = [
                '#block-form-timer-available-icon',
                '#block-form-timer-available-title',
                '#block-form-timer-available-description',
                '#block-form-timer-available-button-text',
                '#block-form-timer-available-button-url'
            ];
            $(availabilityFields.join(', ')).off(ns);
            
            // Colores del timer
            const timerColorFields = [
                '#block-form-bg-color',
                '#block-form-border-color', 
                '#block-form-icon-color',
                '#block-form-title-color',
                '#block-form-text-color',
                '#block-form-button-bg-color',
                '#block-form-button-text-color',
                '#block-form-timer-unit-bg-color',
                '#block-form-timer-container-bg-color',
                '#block-form-timer-container-border-color',
                '#block-form-timer-unit-border-color',
                '#block-form-disable-shadow'
            ];
            $(timerColorFields.join(', ')).off(ns);
            
            // Colores del mensaje de disponibilidad
            const availabilityColorFields = [
                '#block-form-timer-available-bg-color',
                '#block-form-timer-available-border-color',
                '#block-form-timer-available-icon-color',
                '#block-form-timer-available-title-color',
                '#block-form-timer-available-text-color',
                '#block-form-timer-available-button-bg-color',
                '#block-form-timer-available-button-text-color'
            ];
            $(availabilityColorFields.join(', ')).off(ns);
        }

        /**
         * Destruir el BlockFormTimerManager
         */
        destroy() {
            this.unbindTimerEvents();
            console.log('SFQ BlockFormTimerManager: Destroyed');
        }
    }

    // Export para uso en otros módulos
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = SFQ_BlockFormTimerManager;
    } else {
        window.SFQ_BlockFormTimerManager = SFQ_BlockFormTimerManager;
    }

})(jQuery);
