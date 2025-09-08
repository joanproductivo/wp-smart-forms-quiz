/**
 * ImageManager - Gestión de imágenes
 * Smart Forms & Quiz - Admin Builder v2
 */

(function($) {
    'use strict';

    class SFQ_ImageManager {
    constructor(formBuilder) {
        this.formBuilder = formBuilder;
        this.mediaUploader = null;
    }

    /**
     * Inicializar ImageManager
     */
    init() {
        // No hay inicialización específica requerida para ImageManager
        // Los eventos se manejan a través del EventManager
    }

    /**
     * Abrir selector de imagen de fondo
     */
    openBackgroundImageSelector() {
        if (typeof wp === 'undefined' || !wp.media) {
            alert('Error: WordPress Media Library no está disponible.');
            return;
        }

        // Crear la instancia una sola vez y guardarla en la clase
        if (!this.mediaUploader) {
            this.mediaUploader = wp.media({
                title: 'Seleccionar Imagen de Fondo',
                button: { text: 'Usar esta imagen' },
                multiple: false,
                library: { type: 'image' }
            });

            this.mediaUploader.on('select', () => {
                const attachment = this.mediaUploader.state().get('selection').first().toJSON();
                console.log('Selected background:', attachment);

                if (!this.isValidImageAttachment(attachment)) {
                    alert('Error: El archivo seleccionado no es una imagen válida');
                    return;
                }

                this.setBackgroundImage(attachment);
                this.mediaUploader.close();
            });
        }

        this.mediaUploader.open();
    }

    /**
     * Abrir WordPress Media Library para opciones de imagen
     */
    openMediaLibrary($button, $optionItem, question, optionIndex) {
        // Verificar que wp.media esté disponible
        if (typeof wp === 'undefined' || !wp.media) {
            alert('Error: WordPress Media Library no está disponible. Asegúrate de que wp_enqueue_media() esté cargado.');
            console.error('SFQ: wp.media is not available. Make sure wp_enqueue_media() is called.');
            return;
        }


        // Crear instancia del media uploader
        const mediaUploader = wp.media({
            title: 'Seleccionar Imagen para Opción',
            button: {
                text: 'Usar esta imagen'
            },
            multiple: false,
            library: {
                type: 'image' // ✅ SEGURIDAD: Solo imágenes
            }
        });

        // Evento cuando se selecciona una imagen
        mediaUploader.on('select', () => {
            const attachment = mediaUploader.state().get('selection').first().toJSON();


            // ✅ VALIDACIÓN: Verificar que sea una imagen válida
            if (!this.isValidAttachment(attachment)) {
                alert('Error: El archivo seleccionado no es una imagen válida');
                return;
            }

            // Actualizar la opción con los datos de la imagen
            this.updateImageOption($optionItem, attachment, question, optionIndex);
        });

        // Abrir el uploader
        mediaUploader.open();
    }

    /**
     * Validar attachment de WordPress Media Library
     */
    isValidAttachment(attachment) {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];

        // Verificar tipo MIME
        if (!validTypes.includes(attachment.mime)) {
            console.error('SFQ: Invalid MIME type:', attachment.mime);
            return false;
        }

        // Verificar extensión
        if (attachment.filename) {
            const extension = attachment.filename.split('.').pop().toLowerCase();
            if (!validExtensions.includes(extension)) {
                console.error('SFQ: Invalid file extension:', extension);
                return false;
            }
        }

        // Verificar que tenga URL
        if (!attachment.url) {
            console.error('SFQ: No URL found in attachment');
            return false;
        }

        return true;
    }

    /**
     * Validar attachment de imagen de fondo
     */
    isValidImageAttachment(attachment) {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        return validTypes.includes(attachment.mime) && attachment.url;
    }

    /**
     * Validar URL de imagen manual
     */
    isValidImageUrl(url) {
        // Verificar que sea una URL válida
        try {
            new URL(url);
        } catch {
            return false;
        }

        // Verificar extensión de imagen
        const validExtensions = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;
        return validExtensions.test(url);
    }

    /**
     * Establecer imagen de fondo
     */
    setBackgroundImage(attachment) {
        const url = attachment.url;

        // Actualizar input de URL
        $('#background-image-url').val(url).removeClass('invalid').addClass('valid');

        // Mostrar preview
        this.updateBackgroundImagePreview(url);

        // Marcar como modificado
        this.formBuilder.isDirty = true;
        this.formBuilder.updatePreviewStyles();
    }

    /**
     * Actualizar opción con imagen seleccionada
     */
    updateImageOption($optionItem, attachment, question, optionIndex) {
        console.log('SFQ: Updating image option', optionIndex, 'with attachment:', attachment);

        // Actualizar input de URL
        $optionItem.find('.sfq-image-url-input').val(attachment.url).removeClass('invalid').addClass('valid');

        // Actualizar datos de la opción
        if (!question.options[optionIndex]) {
            question.options[optionIndex] = { text: '', value: '' };
        }

        question.options[optionIndex].image = attachment.url;
        question.options[optionIndex].image_id = attachment.id || '';
        question.options[optionIndex].image_alt = attachment.alt || attachment.title || '';

        console.log('SFQ: Updated option data:', question.options[optionIndex]);

        // Mostrar preview
        this.updateImagePreview($optionItem, {
            url: attachment.url,
            alt: attachment.alt || attachment.title || 'Imagen seleccionada'
        });

        // Marcar formulario como modificado
        this.formBuilder.isDirty = true;
    }

    /**
     * Actualizar preview de imagen de fondo
     */
    updateBackgroundImagePreview(url) {
        const $preview = $('#background-image-preview');
        const $previewImg = $preview.find('img');

        if ($previewImg.length === 0) {
            $preview.html(`<img src="${url}" alt="Vista previa" style="max-width: 100%; height: auto; border-radius: 4px;">`);
        } else {
            $previewImg.attr('src', url);
        }

        $preview.show();
        $('#background-image-remove').show();
    }

    /**
     * Mostrar preview de imagen con verificaciones robustas
     */
    updateImagePreview($optionItem, imageData) {
        console.log('SFQ: Updating image preview with data:', imageData);

        const $previewContainer = $optionItem.find('.sfq-image-preview-container');

        if ($previewContainer.length === 0) {
            console.error('SFQ: Preview container not found, creating it...');
            // ✅ NUEVO: Crear contenedor de preview si no existe
            this._createImagePreviewContainer($optionItem);
            return this.updateImagePreview($optionItem, imageData); // Recursión para intentar de nuevo
        }

        let $previewImage = $previewContainer.find('.sfq-preview-image');

        // ✅ NUEVO: Crear imagen de preview si no existe
        if ($previewImage.length === 0) {
            console.log('SFQ: Preview image element not found, creating it...');
            $previewContainer.find('.sfq-image-preview').html(`
                <img src="" alt="Vista previa" class="sfq-preview-image">
                <button type="button" class="sfq-remove-image" title="Eliminar imagen">
                    <span class="dashicons dashicons-no-alt"></span>
                </button>
            `);
            $previewImage = $previewContainer.find('.sfq-preview-image');
        }

        // ✅ CORREGIDO: Actualizar imagen con manejo de errores
        if ($previewImage.length > 0) {
            $previewImage.attr('src', imageData.url);
            $previewImage.attr('alt', imageData.alt || 'Vista previa');

            // ✅ NUEVO: Manejar errores de carga de imagen
            $previewImage.off('error').on('error', function() {
                console.warn('SFQ: Failed to load image:', imageData.url);
                $(this).attr('src', 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2VuPC90ZXh0Pjwvc3ZnPg==');
                $(this).attr('alt', 'Error al cargar imagen');
            });

            $previewContainer.show();
            console.log('SFQ: Successfully updated image preview for URL:', imageData.url);
        } else {
            console.error('SFQ: Could not create or find preview image element');
        }
    }

    /**
     * Crear contenedor de preview de imagen si no existe
     */
    _createImagePreviewContainer($optionItem) {
        console.log('SFQ: Creating image preview container');

        const previewHtml = `
            <div class="sfq-image-preview-container" style="display: none;">
                <div class="sfq-image-preview">
                    <img src="" alt="Vista previa" class="sfq-preview-image">
                    <button type="button" class="sfq-remove-image" title="Eliminar imagen">
                        <span class="dashicons dashicons-no-alt"></span>
                    </button>
                </div>
            </div>
        `;

        // Buscar la sección de imagen o crearla
        let $imageSection = $optionItem.find('.sfq-image-upload-section');

        if ($imageSection.length === 0) {
            // Si no existe la sección de imagen, crearla completa
            const optionIndex = $optionItem.index();
            this._createImageUploadSection($optionItem, optionIndex);
            $imageSection = $optionItem.find('.sfq-image-upload-section');
        }

        // Añadir el contenedor de preview si no existe
        if ($imageSection.find('.sfq-image-preview-container').length === 0) {
            $imageSection.find('.sfq-image-controls').after(previewHtml);
            console.log('SFQ: Created image preview container');
        }
    }

    /**
     * Crear sección de subida de imagen si no existe
     */
    _createImageUploadSection($optionItem, index) {
        console.log('SFQ: Creating image upload section for option', index);

        const imageUploadHtml = `
            <div class="sfq-image-upload-section">
                <div class="sfq-image-controls">
                    <button type="button" class="button sfq-upload-image-btn" 
                            data-option-index="${index}">
                        <span class="dashicons dashicons-upload"></span>
                        Subir Imagen
                    </button>
                    <input type="url" class="sfq-image-url-input" 
                           name="options[${index}][image]"
                           placeholder="O pega URL de imagen..." 
                           value="">
                </div>
                <div class="sfq-image-preview-container" style="display: none;">
                    <div class="sfq-image-preview">
                        <img src="" alt="Vista previa" class="sfq-preview-image">
                        <button type="button" class="sfq-remove-image" title="Eliminar imagen">
                            <span class="dashicons dashicons-no-alt"></span>
                        </button>
                    </div>
                </div>
                
                <!-- Campos ocultos para datos adicionales de la imagen -->
                <input type="hidden" name="options[${index}][image_id]" value="">
                <input type="hidden" name="options[${index}][image_alt]" value="">
            </div>
        `;

        // Insertar después del input de texto de la opción
        $optionItem.find('.sfq-option-input').after(imageUploadHtml);

        console.log('SFQ: Created image upload section for option', index);
    }

    /**
     * Ocultar preview de imagen de fondo
     */
    hideBackgroundImagePreview() {
        $('#background-image-preview').hide().empty();
        $('#background-image-remove').hide();
    }

    /**
     * Ocultar preview de imagen
     */
    hideImagePreview($optionItem) {
        $optionItem.find('.sfq-image-preview-container').hide();
    }

    /**
     * Eliminar imagen de fondo
     */
    removeBackgroundImage() {
        $('#background-image-url').val('').removeClass('valid invalid');
        this.hideBackgroundImagePreview();
        this.formBuilder.isDirty = true;
        this.formBuilder.updatePreviewStyles();
    }

    /**
     * Eliminar imagen de opción
     */
    removeImage($optionItem, question, optionIndex) {
        console.log('SFQ: Removing image from option', optionIndex);

        // Limpiar input de URL
        $optionItem.find('.sfq-image-url-input').val('').removeClass('valid invalid');

        // Limpiar datos de la opción
        if (question.options[optionIndex]) {
            question.options[optionIndex].image = '';
            question.options[optionIndex].image_id = '';
            question.options[optionIndex].image_alt = '';
        }

        // Ocultar preview
        this.hideImagePreview($optionItem);

        // Marcar formulario como modificado
        this.formBuilder.isDirty = true;

        console.log('SFQ: Image removed from option', optionIndex);
    }

    /**
     * Repoblar previews de imagen después de cargar datos con timing mejorado
     */
    repopulateImagePreviews(questionId, question) {
        console.log('SFQ: === STARTING IMAGE REPOPULATION ===');
        console.log('SFQ: Question ID:', questionId);
        console.log('SFQ: Question type:', question.type);
        console.log('SFQ: Options count:', question.options ? question.options.length : 0);

        // ✅ CORREGIDO: Usar setTimeout para asegurar que el DOM esté completamente renderizado
        setTimeout(() => {
            this._performImageRepopulation(questionId, question);
        }, 150); // Delay suficiente para que el DOM esté listo
    }

    /**
     * Función interna para realizar la repoblación con verificaciones robustas
     */
    _performImageRepopulation(questionId, question) {
        console.log('SFQ: Performing delayed image repopulation for question:', questionId);

        // ✅ CORREGIDO: Múltiples selectores para encontrar el elemento
        let $question = $(`#${questionId}`);

        // Si no se encuentra con el ID directo, buscar por atributo data
        if ($question.length === 0) {
            $question = $(`.sfq-question-item[data-question-id="${questionId}"]`);
            console.log('SFQ: Trying alternative selector with data-question-id');
        }

        // Si aún no se encuentra, buscar en ambos contenedores
        if ($question.length === 0) {
            $question = $(`#sfq-questions-container #${questionId}, #sfq-final-screens-container #${questionId}`);
            console.log('SFQ: Trying container-specific selectors');
        }

        if ($question.length === 0) {
            console.error('SFQ: Question element not found after all attempts:', questionId);
            console.log('SFQ: Available question elements:', $('.sfq-question-item').map(function() { return this.id; }).get());
            return;
        }

        console.log('SFQ: Found question element:', $question.attr('id'));

        // Verificar que tenga opciones con imágenes
        if (!question.options || question.options.length === 0) {
            console.log('SFQ: No options found for question:', questionId);
            return;
        }

        // ✅ CORREGIDO: Verificar que existan elementos de opción en el DOM
        const $optionItems = $question.find('.sfq-option-item');
        console.log('SFQ: Found option items in DOM:', $optionItems.length);

        if ($optionItems.length === 0) {
            console.error('SFQ: No option items found in DOM for question:', questionId);
            // ✅ NUEVO: Intentar re-renderizar la pregunta si no hay opciones en el DOM
            console.log('SFQ: Attempting to re-render question options...');
            this._reRenderQuestionOptions(questionId, question);
            return;
        }

        // Procesar cada opción que tenga imagen
        question.options.forEach((option, index) => {
            if (option.image && option.image.trim() !== '') {
                console.log(`SFQ: Processing option ${index} with image:`, option.image);

                const $optionItem = $optionItems.eq(index);

                if ($optionItem.length > 0) {
                    console.log('SFQ: Found option item for index', index);

                    // ✅ CORREGIDO: Verificar que exista la sección de imagen
                    let $imageSection = $optionItem.find('.sfq-image-upload-section');

                    if ($imageSection.length === 0) {
                        console.warn('SFQ: Image upload section not found, creating it...');
                        this._createImageUploadSection($optionItem, index);
                        $imageSection = $optionItem.find('.sfq-image-upload-section');
                    }

                    if ($imageSection.length > 0) {
                        // Actualizar el input de URL
                        const $urlInput = $imageSection.find('.sfq-image-url-input');
                        if ($urlInput.length > 0) {
                            $urlInput.val(option.image).removeClass('invalid').addClass('valid');
                            console.log('SFQ: Updated URL input for option', index);
                        } else {
                            console.warn('SFQ: URL input not found for option', index);
                        }

                        // Mostrar el preview de la imagen
                        this.updateImagePreview($optionItem, {
                            url: option.image,
                            alt: option.image_alt || 'Imagen cargada'
                        });

                        console.log('SFQ: Successfully repopulated image preview for option', index);
                    } else {
                        console.error('SFQ: Could not create image upload section for option', index);
                    }
                } else {
                    console.warn('SFQ: Option element not found for index:', index);
                }
            } else {
                console.log(`SFQ: Option ${index} has no image, skipping`);
            }
        });

        console.log('SFQ: === FINISHED IMAGE REPOPULATION ===');
    }

    /**
     * Re-renderizar opciones de pregunta si no existen en el DOM
     */
    _reRenderQuestionOptions(questionId, question) {
        console.log('SFQ: Re-rendering options for question:', questionId);

        const $question = $(`#${questionId}`);
        const $optionsContainer = $question.find(`#options-${questionId}`);

        if ($optionsContainer.length === 0) {
            console.error('SFQ: Options container not found for question:', questionId);
            return;
        }

        // Limpiar opciones existentes
        $optionsContainer.empty();

        // Re-renderizar cada opción
        question.options.forEach((option, index) => {
            const optionHtml = this.formBuilder.uiRenderer.renderOption(option, index + 1, question.type);
            $optionsContainer.append(optionHtml);
        });

        // Re-vincular eventos
        this.formBuilder.questionManager.bindOptionEvents(questionId);

        console.log('SFQ: Re-rendered', question.options.length, 'options for question:', questionId);

        // ✅ NUEVO: Intentar repoblación nuevamente después de re-renderizar
        setTimeout(() => {
            this._performImageRepopulation(questionId, question);
        }, 100);
    }
}

    // Export para uso en otros módulos
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = SFQ_ImageManager;
    } else {
        window.SFQ_ImageManager = SFQ_ImageManager;
    }

})(jQuery);
