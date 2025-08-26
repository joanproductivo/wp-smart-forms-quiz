# Smart Forms & Quiz - Plugin WordPress

Un plugin moderno y eficiente para crear formularios y quiz interactivos con diseño atractivo, lógica condicional avanzada y analytics integrado.

## 🎯 Características Principales

### Diseño Moderno
- ✨ Interfaz moderna con cards y bordes redondeados
- 🎨 Totalmente personalizable (colores, fuentes, bordes)
- 📱 Responsive y optimizado para móviles
- 🌙 Compatible con modo oscuro
- ⚡ Transiciones suaves y animaciones elegantes

### Tipos de Preguntas
- **Opción única**: Cards clickeables con diseño moderno (no radio buttons tradicionales)
- **Opción múltiple**: Checkboxes estilizados
- **Campo de texto**: Input minimalista con validación
- **Email**: Campo con validación automática
- **Valoración**: Estrellas o emojis interactivos
- **Selección de imagen**: Grid visual de imágenes

### Funcionalidades Avanzadas
- 🚀 **Auto-avance**: Pasa automáticamente a la siguiente pregunta al responder
- 🔄 **Lógica condicional**: Saltos y redirecciones basadas en respuestas
- 📊 **Variables y puntuación**: Sistema de variables acumulativas
- 🎯 **Redirecciones inteligentes**: Dirige a URLs específicas según condiciones
- 💾 **Guardado parcial**: Opción de guardar progreso
- 🔀 **Aleatorización**: Mezcla el orden de las preguntas

### Analytics Integrado
- 📈 Contador de visitas únicas
- ✅ Tasa de completado
- ⏱️ Tiempo promedio de respuesta
- 📊 Análisis por pregunta
- 📱 Estadísticas por dispositivo
- 📉 Embudo de conversión

## 📦 Instalación

### Requisitos
- WordPress 5.0 o superior
- PHP 7.2 o superior
- MySQL 5.6 o superior

### Pasos de Instalación

1. **Descarga el plugin**
   ```bash
   # Clona o descarga el repositorio
   git clone [url-del-repositorio]
   ```

2. **Sube a WordPress**
   - Copia la carpeta `smart-forms-quiz` a `/wp-content/plugins/`
   - O sube el ZIP desde el panel de WordPress

3. **Activa el plugin**
   - Ve a **Plugins** en tu panel de WordPress
   - Busca "Smart Forms & Quiz"
   - Haz clic en **Activar**

4. **Configuración inicial**
   - El plugin creará automáticamente las tablas necesarias
   - Aparecerá un nuevo menú "Smart Forms" en el panel

## 🚀 Uso Básico

### Crear un Formulario/Quiz

1. **Accede al constructor**
   - Ve a **Smart Forms → Crear Nuevo**

2. **Configura los datos básicos**
   - **Título**: Nombre de tu formulario
   - **Tipo**: Selecciona entre Formulario o Quiz
   - **Introducción**: Configura la pantalla de bienvenida
   - **Mensaje final**: Personaliza el mensaje de agradecimiento

3. **Añade preguntas**
   - Haz clic en el tipo de pregunta deseado
   - Escribe el texto de la pregunta
   - Configura las opciones de respuesta
   - Marca como obligatoria si es necesario

4. **Personaliza el diseño**
   - **Colores**: Primario, secundario, fondo y texto
   - **Bordes**: Ajusta el radio de los bordes (0-30px)
   - **Fuente**: Elige entre varias opciones

5. **Configura el comportamiento**
   - ✅ Mostrar barra de progreso
   - ✅ Avanzar automáticamente
   - ✅ Permitir volver atrás
   - ✅ Aleatorizar preguntas
   - ✅ Guardar respuestas parciales

6. **Guarda el formulario**
   - Haz clic en **Guardar Formulario**

### Insertar en una Página

#### Método 1: Shortcode
```
[smart_form id="1"]
```

#### Método 2: Shortcode con opciones
```
[smart_form id="1" class="mi-clase" style="max-width: 600px;"]
```

#### Método 3: Block Editor (Gutenberg)
- Busca el bloque "Smart Form"
- Selecciona el formulario de la lista

### Configurar Lógica Condicional

1. **En cada pregunta**, despliega "Lógica condicional"

2. **Tipos de condiciones**:
   - **Si responde X → Ir a pregunta Y**
   - **Si responde X → Redirigir a URL**
   - **Si responde X → Sumar puntos a variable**

3. **Ejemplo de uso**:
   ```
   Pregunta: "¿Cuál es tu experiencia?"
   - Principiante → Ir a preguntas básicas
   - Intermedio → Ir a preguntas intermedias
   - Avanzado → Ir a preguntas avanzadas
   ```

4. **Variables y puntuación**:
   ```
   Si responde "Opción A" → Sumar 10 a variable "score"
   Si variable "score" > 50 → Redirigir a "ejemplo.com/aprobado"
   Si variable "score" <= 50 → Redirigir a "ejemplo.com/reprobado"
   ```

## 📊 Analytics y Estadísticas

### Ver Estadísticas Globales
1. Ve a **Smart Forms → Analytics**
2. Selecciona el rango de fechas
3. Visualiza métricas generales

### Estadísticas por Formulario
- **Vistas**: Número de personas que vieron el formulario
- **Inicios**: Personas que comenzaron a responder
- **Completados**: Formularios terminados
- **Tasa de abandono**: Porcentaje de abandonos

### Exportar Datos
1. Ve a la sección de Analytics
2. Selecciona el formulario
3. Elige formato (CSV o JSON)
4. Haz clic en **Exportar**

## 🎨 Personalización Avanzada

### CSS Personalizado
Puedes añadir CSS adicional usando las clases:
```css
/* Contenedor principal */
.sfq-form-container { }

/* Cards de opciones */
.sfq-option-card { }

/* Botones */
.sfq-button-primary { }

/* Barra de progreso */
.sfq-progress-bar { }
```

### Variables CSS
El plugin usa variables CSS que puedes sobrescribir:
```css
.sfq-form-container {
    --sfq-primary-color: #007cba;
    --sfq-secondary-color: #6c757d;
    --sfq-background-color: #ffffff;
    --sfq-text-color: #333333;
    --sfq-border-radius: 12px;
}
```

### Hooks y Filtros

#### Filtros disponibles:
```php
// Modificar datos antes de guardar
add_filter('sfq_before_save_submission', 'mi_funcion', 10, 2);

// Personalizar email de notificación
add_filter('sfq_notification_message', 'mi_mensaje_personalizado', 10, 3);

// Modificar configuración de formulario
add_filter('sfq_form_settings', 'mis_configuraciones', 10, 2);
```

#### Actions disponibles:
```php
// Después de enviar formulario
add_action('sfq_after_submission', 'mi_accion', 10, 2);

// Al ver un formulario
add_action('sfq_form_viewed', 'registrar_vista', 10, 2);
```

## 🔧 Solución de Problemas

### El formulario no se muestra
1. Verifica que el shortcode tenga el ID correcto
2. Comprueba que el formulario esté activo
3. Revisa la consola del navegador por errores JS

### Las respuestas no se guardan
1. Verifica los permisos de la base de datos
2. Comprueba que las tablas se crearon correctamente
3. Revisa el log de errores de WordPress

### Problemas de estilo
1. Limpia la caché del navegador
2. Verifica conflictos con el tema
3. Prueba en modo incógnito

### Error al activar el plugin
1. Verifica la versión de PHP (mínimo 7.2)
2. Comprueba la versión de WordPress (mínimo 5.0)
3. Revisa los permisos de escritura

## 📝 Ejemplos de Uso

### Quiz de Personalidad
```
1. ¿Prefieres trabajar solo o en equipo?
   - Solo → +10 puntos "introvertido"
   - Equipo → +10 puntos "extrovertido"

2. ¿Qué prefieres en tu tiempo libre?
   - Leer → +10 puntos "introvertido"
   - Salir con amigos → +10 puntos "extrovertido"

Final:
- Si "introvertido" > "extrovertido" → Mostrar resultado A
- Si "extrovertido" > "introvertido" → Mostrar resultado B
```

### Formulario de Contacto Inteligente
```
1. ¿Qué tipo de consulta tienes?
   - Ventas → Redirigir a formulario de ventas
   - Soporte → Redirigir a formulario de soporte
   - General → Continuar con preguntas generales
```

### Encuesta de Satisfacción
```
1. Valoración con estrellas (1-5)
2. Si valoración < 3 → Preguntar qué mejorar
3. Si valoración >= 4 → Preguntar qué les gustó
4. Solicitar email para seguimiento (opcional)
```

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está licenciado bajo GPL v2 o posterior - ver el archivo [LICENSE](LICENSE) para más detalles.

## 🆘 Soporte

- 📧 Email: planasjoan@gmail.com

## 🎉 Características Próximas

- [ ] Integración con servicios de email (Mailchimp, SendGrid)
- [ ] Plantillas prediseñadas
- [ ] Exportación a PDF
- [ ] Campos avanzados (firma, ubicación, archivo)
- [ ] Integración con pagos (Stripe, PayPal)
- [ ] Webhooks personalizados
- [ ] API REST completa
- [ ] Modo multiidioma

---

**Desarrollado con ❤️ para la comunidad WordPress**
