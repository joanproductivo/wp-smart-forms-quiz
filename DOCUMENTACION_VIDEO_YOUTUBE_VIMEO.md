# Documentación: Campo de Video YouTube/Vimeo en Mensajes de Bloqueo

## Resumen de la Funcionalidad

Se ha agregado un nuevo campo opcional para insertar videos de YouTube o Vimeo en los mensajes de bloqueo de formularios. Esta funcionalidad permite a los usuarios mostrar contenido multimedia explicativo cuando un formulario está bloqueado.

## Archivos Modificados

### 1. `includes/class-sfq-admin.php`
**Cambios realizados:**
- Agregado nuevo campo de entrada de URL de video en la sección "Configuración de contenido para Formulario Bloqueado"
- Campo ubicado estratégicamente entre el icono y el título personalizado
- Incluye placeholder y descripción explicativa

**Código agregado:**
```html
<div class="sfq-field-row">
    <label>🎥 Video de YouTube/Vimeo (opcional)</label>
    <input type="url" id="block-form-video-url" class="sfq-input" 
           placeholder="https://www.youtube.com/watch?v=... o https://vimeo.com/...">
    <small>Pega la URL completa del video de YouTube o Vimeo. Se insertará automáticamente como embed responsivo encima del título.</small>
</div>
```

### 2. `assets/js/admin-builder-v2.js`
**Cambios realizados:**
- Agregado `#block-form-video-url` a los event listeners para detectar cambios
- Incluido el campo en la función `collectFormData()` para guardado
- Agregado a la función `populateFormData()` para carga de datos

**Código agregado:**
```javascript
// Event listeners
$('#block-form-icon, #block-form-video-url, #block-form-title, ...').on('change input' + ns, () => {
    if (!this.isDestroyed) {
        this.isDirty = true;
    }
});

// Guardado
block_form_video_url: $('#block-form-video-url').val() || '',

// Carga
$('#block-form-video-url').val(styles.block_form_video_url || '');
```

### 3. `includes/class-sfq-frontend.php`
**Cambios realizados:**
- Agregada lógica para mostrar video en mensajes de bloqueo
- Implementadas funciones de conversión de URL a embed
- Soporte para YouTube y Vimeo con detección automática

**Funciones agregadas:**
```php
private function convert_video_url_to_embed($url)
private function create_youtube_embed($video_id)
private function create_vimeo_embed($video_id)
```

## Funcionalidades Implementadas

### 1. Detección Automática de Plataforma
- **YouTube**: Detecta URLs de youtube.com y youtu.be
- **Vimeo**: Detecta URLs de vimeo.com
- **Regex avanzado**: Maneja diferentes formatos de URL

### 2. Embed Responsivo
- **Aspect ratio 16:9**: Mantiene proporciones correctas
- **Responsive design**: Se adapta a diferentes tamaños de pantalla
- **Estilos integrados**: Bordes redondeados y sombras

### 3. Optimización de Rendimiento
- **Lazy loading**: Los videos se cargan solo cuando son necesarios
- **Parámetros optimizados**: 
  - YouTube: `rel=0&showinfo=0&modestbranding=1`
  - Vimeo: `title=0&byline=0&portrait=0`

### 4. Seguridad
- **Sanitización**: URLs validadas y escapadas
- **Regex seguro**: Previene inyección de código malicioso
- **Atributos seguros**: Solo se permiten parámetros específicos

## Ubicación del Video

El video se muestra **encima del icono y título** en el mensaje de bloqueo, con las siguientes características:

- **Posición**: Primera en el orden visual
- **Margen**: 25px inferior para separación
- **Contenedor**: Clase `.sfq-video-container`
- **Visibilidad**: Solo en mensajes de bloqueo (no en otros tipos de límite)

## Ejemplos de URLs Soportadas

### YouTube
```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
https://youtu.be/dQw4w9WgXcQ
https://www.youtube.com/embed/dQw4w9WgXcQ
https://www.youtube.com/v/dQw4w9WgXcQ
```

### Vimeo
```
https://vimeo.com/123456789
https://player.vimeo.com/video/123456789
https://vimeo.com/channels/staffpicks/123456789
https://vimeo.com/groups/shortfilms/videos/123456789
```

## Código HTML Generado

### YouTube
```html
<div class="sfq-video-embed" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; background: #000; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
    <iframe src="https://www.youtube.com/embed/VIDEO_ID?rel=0&showinfo=0&modestbranding=1" 
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" 
            allowfullscreen 
            loading="lazy"
            title="Video de YouTube">
    </iframe>
</div>
```

### Vimeo
```html
<div class="sfq-video-embed" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; background: #000; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
    <iframe src="https://player.vimeo.com/video/VIDEO_ID?title=0&byline=0&portrait=0" 
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" 
            allowfullscreen 
            loading="lazy"
            title="Video de Vimeo">
    </iframe>
</div>
```

## Flujo de Funcionamiento

1. **Configuración**: Usuario pega URL de video en el campo del admin
2. **Guardado**: JavaScript captura y guarda la URL en la base de datos
3. **Renderizado**: PHP detecta la URL y la convierte a embed
4. **Visualización**: Video se muestra responsivamente en el mensaje de bloqueo

## Consideraciones Técnicas

### Rendimiento
- **Lazy loading**: Evita carga innecesaria de recursos
- **Embed optimizado**: Parámetros mínimos para mejor rendimiento
- **CSS inline**: Evita dependencias externas

### Compatibilidad
- **Responsive**: Funciona en todos los dispositivos
- **Cross-browser**: Compatible con navegadores modernos
- **Accesibilidad**: Incluye atributos `title` apropiados

### Mantenimiento
- **Código modular**: Funciones separadas para cada plataforma
- **Fácil extensión**: Estructura permite agregar más plataformas
- **Error handling**: Manejo graceful de URLs inválidas

## Casos de Uso

1. **Videos explicativos**: Mostrar por qué el formulario está bloqueado
2. **Contenido promocional**: Videos de productos o servicios
3. **Instrucciones**: Guías sobre cuándo estará disponible el formulario
4. **Entretenimiento**: Contenido mientras esperan la apertura

## Limitaciones

- **Solo YouTube y Vimeo**: No soporta otras plataformas de video
- **Solo mensajes de bloqueo**: No disponible en otros tipos de límite
- **Requiere conexión**: Los videos necesitan internet para cargar
- **Dependencia externa**: Depende de la disponibilidad de YouTube/Vimeo

## Futuras Mejoras Posibles

1. **Más plataformas**: Soporte para Dailymotion, Wistia, etc.
2. **Video local**: Subida de archivos de video al servidor
3. **Configuración avanzada**: Autoplay, controles personalizados
4. **Analytics**: Seguimiento de reproducciones de video
5. **Caché**: Almacenamiento local de metadatos de video

## Conclusión

La funcionalidad de video YouTube/Vimeo enriquece significativamente los mensajes de bloqueo, permitiendo comunicación más efectiva con los usuarios. La implementación es robusta, segura y fácil de usar, manteniendo la simplicidad para el usuario final mientras proporciona flexibilidad técnica.
