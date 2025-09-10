/**
 * Constants - Constantes del sistema
 * Smart Forms & Quiz - Admin Builder v2
 */

const Constants = {
    /**
     * Información de la versión
     */
    VERSION: '2.5',
    BUILD_DATE: '2025-01-08',
    
    /**
     * Configuración general
     */
    CONFIG: {
        // Límites del sistema
        MAX_QUESTIONS: 1000,
        MAX_OPTIONS_PER_QUESTION: 20,
        MAX_FREESTYLE_ELEMENTS: 1000,
        MAX_CONDITIONS_PER_QUESTION: 10,
        MAX_VARIABLES: 50,
        
        // Timeouts y delays
        AUTO_SAVE_INTERVAL: 30000, // 30 segundos
        DEBOUNCE_DELAY: 500,
        ANIMATION_DURATION: 300,
        NOTIFICATION_DURATION: 3000,
        
        // Tamaños de archivo
        MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
        MAX_VIDEO_SIZE: 100 * 1024 * 1024, // 100MB
        
        // Validaciones
        MIN_QUESTION_TEXT_LENGTH: 1,
        MAX_QUESTION_TEXT_LENGTH: 1000,
        MIN_OPTION_TEXT_LENGTH: 1,
        MAX_OPTION_TEXT_LENGTH: 200,
        
        // Configuración de UI
        SIDEBAR_WIDTH: 300,
        PREVIEW_WIDTH: 400,
        MIN_CONTAINER_WIDTH: 320,
        MAX_CONTAINER_WIDTH: 1200
    },

    /**
     * Mensajes del sistema
     */
    MESSAGES: {
        // Éxito
        FORM_SAVED: 'Formulario guardado correctamente',
        QUESTION_ADDED: 'Pregunta añadida correctamente',
        QUESTION_DELETED: 'Pregunta eliminada correctamente',
        QUESTION_DUPLICATED: 'Pregunta duplicada correctamente',
        CONDITION_ADDED: 'Condición añadida correctamente',
        CONDITION_DELETED: 'Condición eliminada correctamente',
        VARIABLE_ADDED: 'Variable añadida correctamente',
        VARIABLE_UPDATED: 'Variable actualizada correctamente',
        VARIABLE_DELETED: 'Variable eliminada correctamente',
        STYLES_APPLIED: 'Estilos aplicados correctamente',
        PRESET_APPLIED: 'Preset aplicado correctamente',
        
        // Errores
        SAVE_ERROR: 'Error al guardar el formulario',
        LOAD_ERROR: 'Error al cargar el formulario',
        VALIDATION_ERROR: 'Error de validación',
        NETWORK_ERROR: 'Error de conexión',
        PERMISSION_ERROR: 'No tienes permisos para realizar esta acción',
        
        // Advertencias
        UNSAVED_CHANGES: 'Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?',
        DELETE_CONFIRMATION: '¿Estás seguro de eliminar este elemento?',
        RESET_CONFIRMATION: '¿Estás seguro de resetear todos los cambios?',
        
        // Información
        LOADING: 'Cargando...',
        SAVING: 'Guardando...',
        PROCESSING: 'Procesando...',
        NO_QUESTIONS: 'No hay preguntas todavía',
        NO_VARIABLES: 'No hay variables globales creadas',
        NO_CONDITIONS: 'No hay condiciones configuradas'
    },

    /**
     * Clases CSS
     */
    CSS_CLASSES: {
        // Estados
        LOADING: 'sfq-loading',
        SAVING: 'sfq-saving',
        ERROR: 'sfq-error',
        SUCCESS: 'sfq-success',
        WARNING: 'sfq-warning',
        DIRTY: 'sfq-dirty',
        VALID: 'sfq-valid',
        INVALID: 'sfq-invalid',
        
        // Componentes
        FORM_CONTAINER: 'sfq-form-container',
        QUESTION_ITEM: 'sfq-question-item',
        OPTION_ITEM: 'sfq-option-item',
        CONDITION_ITEM: 'sfq-condition-item',
        VARIABLE_ITEM: 'sfq-variable-item',
        FREESTYLE_ELEMENT: 'sfq-freestyle-element',
        
        // Interacciones
        DRAGGING: 'sfq-dragging',
        DROPPING: 'sfq-dropping',
        SELECTED: 'sfq-selected',
        ACTIVE: 'sfq-active',
        COLLAPSED: 'sfq-collapsed',
        EXPANDED: 'sfq-expanded',
        
        // Animaciones
        FADE_IN: 'sfq-fade-in',
        FADE_OUT: 'sfq-fade-out',
        SLIDE_DOWN: 'sfq-slide-down',
        SLIDE_UP: 'sfq-slide-up',
        BOUNCE: 'sfq-bounce'
    },

    /**
     * Selectores DOM
     */
    SELECTORS: {
        // Contenedores principales
        BUILDER_WRAP: '.sfq-builder-wrap',
        QUESTIONS_CONTAINER: '#sfq-questions-container',
        FINAL_SCREENS_CONTAINER: '#sfq-final-screens-container',
        VARIABLES_LIST: '#sfq-global-variables-list',
        
        // Botones
        SAVE_BUTTON: '#sfq-save-form',
        PREVIEW_BUTTON: '#sfq-preview-form',
        ADD_QUESTION_BUTTONS: '.sfq-add-question',
        ADD_VARIABLE_BUTTON: '#sfq-add-variable',
        
        // Formularios
        FORM_TITLE: '#form-title',
        FORM_DESCRIPTION: '#form-description',
        FORM_TYPE: '#form-type',
        
        // Tabs
        TAB_BUTTONS: '.sfq-tab-button',
        TAB_CONTENTS: '.sfq-tab-content',
        
        // Modales
        VARIABLE_MODAL: '.sfq-variable-modal',
        PREVIEW_MODAL: '.sfq-builder-preview'
    },

    /**
     * Eventos personalizados
     */
    EVENTS: {
        // Formulario
        FORM_LOADED: 'sfq:formLoaded',
        FORM_SAVED: 'sfq:formSaved',
        FORM_DIRTY: 'sfq:formDirty',
        FORM_CLEAN: 'sfq:formClean',
        
        // Preguntas
        QUESTION_ADDED: 'sfq:questionAdded',
        QUESTION_DELETED: 'sfq:questionDeleted',
        QUESTION_UPDATED: 'sfq:questionUpdated',
        QUESTION_REORDERED: 'sfq:questionReordered',
        
        // Condiciones
        CONDITION_ADDED: 'sfq:conditionAdded',
        CONDITION_DELETED: 'sfq:conditionDeleted',
        CONDITION_UPDATED: 'sfq:conditionUpdated',
        
        // Variables
        VARIABLE_ADDED: 'sfq:variableAdded',
        VARIABLE_UPDATED: 'sfq:variableUpdated',
        VARIABLE_DELETED: 'sfq:variableDeleted',
        
        // Estilos
        STYLES_UPDATED: 'sfq:stylesUpdated',
        PRESET_APPLIED: 'sfq:presetApplied',
        
        // Elementos freestyle
        ELEMENT_ADDED: 'sfq:elementAdded',
        ELEMENT_DELETED: 'sfq:elementDeleted',
        ELEMENT_UPDATED: 'sfq:elementUpdated',
        ELEMENT_REORDERED: 'sfq:elementReordered',
        
        // Imágenes
        IMAGE_SELECTED: 'sfq:imageSelected',
        IMAGE_UPLOADED: 'sfq:imageUploaded',
        IMAGE_REMOVED: 'sfq:imageRemoved',
        
        // UI
        TAB_CHANGED: 'sfq:tabChanged',
        MODAL_OPENED: 'sfq:modalOpened',
        MODAL_CLOSED: 'sfq:modalClosed',
        PREVIEW_OPENED: 'sfq:previewOpened',
        PREVIEW_CLOSED: 'sfq:previewClosed'
    },

    /**
     * Configuración de AJAX
     */
    AJAX: {
        TIMEOUT: 30000,
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000,
        
        ACTIONS: {
            SAVE_FORM: 'sfq_save_form',
            LOAD_FORM: 'sfq_get_form_data',
            DELETE_FORM: 'sfq_delete_form',
            DUPLICATE_FORM: 'sfq_duplicate_form',
            UPLOAD_IMAGE: 'sfq_upload_image',
            DELETE_IMAGE: 'sfq_delete_image'
        }
    },

    /**
     * Configuración de validación
     */
    VALIDATION: {
        PATTERNS: {
            EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            URL: /^https?:\/\/.+/,
            PHONE: /^[\+]?[1-9][\d]{0,15}$/,
            VARIABLE_NAME: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
            HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
            IMAGE_URL: /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i
        },
        
        MESSAGES: {
            REQUIRED: 'Este campo es obligatorio',
            INVALID_EMAIL: 'Introduce un email válido',
            INVALID_URL: 'Introduce una URL válida',
            INVALID_PHONE: 'Introduce un número de teléfono válido',
            INVALID_VARIABLE_NAME: 'El nombre de variable solo puede contener letras, números y guiones bajos',
            INVALID_COLOR: 'Introduce un color hexadecimal válido',
            INVALID_NUMBER: 'Introduce un número válido',
            MIN_LENGTH: 'Debe tener al menos {min} caracteres',
            MAX_LENGTH: 'No puede tener más de {max} caracteres',
            MIN_VALUE: 'El valor debe ser mayor o igual a {min}',
            MAX_VALUE: 'El valor debe ser menor o igual a {max}'
        }
    },

    /**
     * Configuración de tipos de archivo
     */
    FILE_TYPES: {
        IMAGES: {
            EXTENSIONS: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
            MIME_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
            MAX_SIZE: 10 * 1024 * 1024 // 10MB
        },
        
        VIDEOS: {
            EXTENSIONS: ['mp4', 'webm', 'ogg'],
            MIME_TYPES: ['video/mp4', 'video/webm', 'video/ogg'],
            MAX_SIZE: 100 * 1024 * 1024 // 100MB
        },
        
        DOCUMENTS: {
            EXTENSIONS: ['pdf', 'doc', 'docx', 'txt'],
            MIME_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
            MAX_SIZE: 25 * 1024 * 1024 // 25MB
        }
    },

    /**
     * Configuración de colores por defecto
     */
    DEFAULT_COLORS: {
        PRIMARY: '#007cba',
        SECONDARY: '#6c757d',
        SUCCESS: '#28a745',
        WARNING: '#ffc107',
        ERROR: '#dc3545',
        INFO: '#17a2b8',
        LIGHT: '#f8f9fa',
        DARK: '#343a40',
        WHITE: '#ffffff',
        BLACK: '#000000'
    },

    /**
     * Configuración de fuentes
     */
    FONTS: {
        SYSTEM: [
            { value: 'inherit', text: 'Por defecto del sistema' },
            { value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', text: 'Sistema' }
        ],
        
        WEB_SAFE: [
            { value: 'Arial, sans-serif', text: 'Arial' },
            { value: 'Helvetica, sans-serif', text: 'Helvetica' },
            { value: 'Georgia, serif', text: 'Georgia' },
            { value: '"Times New Roman", serif', text: 'Times New Roman' },
            { value: 'Verdana, sans-serif', text: 'Verdana' },
            { value: '"Courier New", monospace', text: 'Courier New' },
            { value: '"Trebuchet MS", sans-serif', text: 'Trebuchet MS' }
        ],
        
        GOOGLE: [
            { value: '"Open Sans", sans-serif', text: 'Open Sans' },
            { value: '"Roboto", sans-serif', text: 'Roboto' },
            { value: '"Lato", sans-serif', text: 'Lato' },
            { value: '"Montserrat", sans-serif', text: 'Montserrat' },
            { value: '"Poppins", sans-serif', text: 'Poppins' },
            { value: '"Asap", sans-serif', text: 'Asap' }
        ]
    },

    /**
     * Configuración de iconos
     */
    ICONS: {
        // Tipos de pregunta
        SINGLE_CHOICE: '🔘',
        MULTIPLE_CHOICE: '☑️',
        TEXT: '📝',
        EMAIL: '📧',
        RATING: '⭐',
        IMAGE_CHOICE: '🖼️',
        FREESTYLE: '🎨',
        
        // Elementos freestyle
        VIDEO: '🎥',
        IMAGE: '🖼️',
        COUNTDOWN: '⏰',
        PHONE: '📞',
        FILE_UPLOAD: '📤',
        BUTTON: '🔘',
        DROPDOWN: '📋',
        CHECKBOX: '☑️',
        LEGAL_TEXT: '⚖️',
        VARIABLE_DISPLAY: '🔢',
        STYLED_TEXT: '✨',
        
        // Acciones
        ADD: '➕',
        EDIT: '✏️',
        DELETE: '🗑️',
        DUPLICATE: '📋',
        SAVE: '💾',
        LOAD: '📂',
        PREVIEW: '👁️',
        SETTINGS: '⚙️',
        
        // Estados
        SUCCESS: '✅',
        ERROR: '❌',
        WARNING: '⚠️',
        INFO: 'ℹ️',
        LOADING: '⏳'
    },

    /**
     * Configuración de temas predefinidos
     */
    THEMES: {
        MODERN: {
            name: 'Moderno',
            colors: {
                primary: '#007cba',
                secondary: '#6c757d',
                background: '#ffffff',
                text: '#212529'
            }
        },
        
        CLASSIC: {
            name: 'Clásico',
            colors: {
                primary: '#0073aa',
                secondary: '#666666',
                background: '#ffffff',
                text: '#333333'
            }
        },
        
        DARK: {
            name: 'Oscuro',
            colors: {
                primary: '#bb86fc',
                secondary: '#03dac6',
                background: '#121212',
                text: '#ffffff'
            }
        },
        
        MINIMAL: {
            name: 'Minimalista',
            colors: {
                primary: '#000000',
                secondary: '#666666',
                background: '#ffffff',
                text: '#000000'
            }
        }
    },

    /**
     * Configuración de breakpoints responsivos
     */
    BREAKPOINTS: {
        XS: 480,
        SM: 768,
        MD: 992,
        LG: 1200,
        XL: 1400
    },

    /**
     * Configuración de localStorage
     */
    STORAGE: {
        PREFIX: 'sfq_builder_',
        KEYS: {
            FORM_DRAFT: 'form_draft',
            USER_PREFERENCES: 'user_preferences',
            RECENT_COLORS: 'recent_colors',
            SIDEBAR_STATE: 'sidebar_state',
            TAB_STATE: 'tab_state'
        },
        
        EXPIRY: {
            DRAFT: 24 * 60 * 60 * 1000, // 24 horas
            PREFERENCES: 30 * 24 * 60 * 60 * 1000, // 30 días
            COLORS: 7 * 24 * 60 * 60 * 1000 // 7 días
        }
    },

    /**
     * Configuración de debug
     */
    DEBUG: {
        ENABLED: false, // Se puede activar desde la consola
        LOG_LEVEL: 'info', // 'debug', 'info', 'warn', 'error'
        LOG_PREFIX: 'SFQ Builder v2:',
        PERFORMANCE_MONITORING: false
    },

    /**
     * Utilidades
     */
    UTILS: {
        /**
         * Generar ID único
         */
        generateId(prefix = 'sfq') {
            return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        },

        /**
         * Formatear tamaño de archivo
         */
        formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        },

        /**
         * Validar email
         */
        isValidEmail(email) {
            return this.VALIDATION.PATTERNS.EMAIL.test(email);
        },

        /**
         * Validar URL
         */
        isValidUrl(url) {
            try {
                new URL(url);
                return true;
            } catch {
                return false;
            }
        },

        /**
         * Escapar HTML
         */
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
        },

        /**
         * Debounce function
         */
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func.apply(this, args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        /**
         * Throttle function
         */
        throttle(func, limit) {
            let inThrottle;
            return function() {
                const args = arguments;
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        /**
         * Deep clone object
         */
        deepClone(obj) {
            if (obj === null || typeof obj !== 'object') return obj;
            if (obj instanceof Date) return new Date(obj.getTime());
            if (obj instanceof Array) return obj.map(item => this.deepClone(item));
            if (typeof obj === 'object') {
                const clonedObj = {};
                for (const key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        clonedObj[key] = this.deepClone(obj[key]);
                    }
                }
                return clonedObj;
            }
        },

        /**
         * Obtener valor anidado de objeto
         */
        getNestedValue(obj, path, defaultValue = null) {
            const keys = path.split('.');
            let current = obj;
            
            for (const key of keys) {
                if (current === null || current === undefined || !current.hasOwnProperty(key)) {
                    return defaultValue;
                }
                current = current[key];
            }
            
            return current;
        },

        /**
         * Establecer valor anidado en objeto
         */
        setNestedValue(obj, path, value) {
            const keys = path.split('.');
            const lastKey = keys.pop();
            let current = obj;
            
            for (const key of keys) {
                if (!current[key] || typeof current[key] !== 'object') {
                    current[key] = {};
                }
                current = current[key];
            }
            
            current[lastKey] = value;
        }
    }
};

// Export para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Constants;
} else {
    window.SFQ_Constants = Constants;
}
