/**
 * StateManager - Gestión centralizada del estado
 * Smart Forms & Quiz - Admin Builder v2
 */

(function($) {
    'use strict';

    class StateManager {
        constructor() {
            this.state = {
                formData: {},
                questions: [],
                selectedQuestion: null,
                clipboard: null
            };
            this.listeners = {};
        }

        setState(key, value) {
            const oldValue = this.state[key];
            this.state[key] = value;
            this.notify(key, value, oldValue);
        }

        getState(key) {
            return key ? this.state[key] : this.state;
        }

        subscribe(key, callback) {
            if (!this.listeners[key]) {
                this.listeners[key] = [];
            }
            this.listeners[key].push(callback);
        }

        notify(key, newValue, oldValue) {
            if (this.listeners[key]) {
                this.listeners[key].forEach(callback => {
                    callback(newValue, oldValue);
                });
            }
        }
    }

    // Export para uso en otros módulos
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = StateManager;
    } else {
        window.StateManager = StateManager;
    }

})(jQuery);
