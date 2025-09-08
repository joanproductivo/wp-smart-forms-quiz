/**
 * DataValidator - Validación y sanitización de datos
 * Smart Forms & Quiz - Admin Builder v2
 */

class DataValidator {
        normalizeBoolean(value) {
            if (typeof value === 'boolean') return value;
            if (typeof value === 'number') return value !== 0;
            if (typeof value === 'string') {
                const normalized = value.toLowerCase().trim();
                return ['1', 'true', 'yes', 'on'].includes(normalized);
            }
            return false;
        }

        validateEmail(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        }

        validateUrl(url) {
            try {
                new URL(url);
                return true;
            } catch {
                return false;
            }
        }

        sanitizeText(text) {
            if (typeof text !== 'string') return '';
            return text.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        }

        validateQuestion(question) {
            const errors = [];
            
            if (!question.text || question.text.trim() === '') {
                errors.push('El texto de la pregunta es requerido');
            }
            
            if (['single_choice', 'multiple_choice', 'image_choice'].includes(question.type)) {
                const validOptions = question.options.filter(opt => opt.text && opt.text.trim() !== '');
                if (validOptions.length < 2) {
                    errors.push('Se requieren al menos 2 opciones válidas');
                }
            }
            
            return {
                isValid: errors.length === 0,
                errors: errors
            };
        }
    }

// Export para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataValidator;
} else {
    window.DataValidator = DataValidator;
}
