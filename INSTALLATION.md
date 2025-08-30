# Instrucciones de Instalación y Uso - Smart Forms & Quiz

## 🚀 Instalación

### Método 1: Instalación Manual
1. Sube la carpeta `smart-forms-quiz` a `/wp-content/plugins/`
2. Ve a **Plugins** en el panel de WordPress
3. Busca "Smart Forms & Quiz" y haz clic en **Activar**

### Método 2: Subir ZIP
1. Comprime la carpeta `smart-forms-quiz` en un archivo ZIP
2. Ve a **Plugins > Añadir nuevo** en WordPress
3. Haz clic en **Subir plugin**
4. Selecciona el archivo ZIP y haz clic en **Instalar ahora**
5. Activa el plugin

## ⚠️ Solución de Problemas Iniciales

### Si las tablas no se crean automáticamente:

1. **Desactiva y reactiva el plugin** para forzar la creación de tablas

2. **Verificación manual de tablas:**
   - Ve a phpMyAdmin o tu gestor de base de datos
   - Verifica que existan estas tablas:
     - `wp_sfq_forms`
     - `wp_sfq_questions`
     - `wp_sfq_responses`
     - `wp_sfq_submissions`
     - `wp_sfq_analytics`
     - `wp_sfq_conditions`

3. **Si siguen sin crearse, ejecuta este código:**
   ```php
   // Añade esto temporalmente en functions.php de tu tema
   add_action('init', function() {
       if (class_exists('SFQ_Activator')) {
           SFQ_Activator::activate();
           echo 'Tablas creadas';
           die();
       }
   });
   ```
   - Visita tu sitio una vez
   - Elimina el código de functions.php

## 📝 Uso Básico

### Crear tu primer formulario:

1. Ve a **Smart Forms & Quiz** en el menú de WordPress
2. Haz clic en **Nuevo Formulario**
3. Completa los campos básicos:
   - **Título**: Nombre de tu formulario
   - **Descripción**: Descripción opcional
   - **Tipo**: Selecciona "Formulario" o "Quiz"

### Añadir preguntas:

1. En el panel lateral, haz clic en el tipo de pregunta que deseas añadir:
   - **Texto**: Para respuestas cortas
   - **Email**: Para direcciones de correo
   - **Opción Única**: Radio buttons
   - **Opción Múltiple**: Checkboxes
   - **Valoración**: Sistema de estrellas

2. Para cada pregunta puedes:
   - Escribir el texto de la pregunta
   - Marcarla como obligatoria
   - Añadir opciones (para preguntas de selección)
   - Configurar lógica condicional

### Configurar estilos:

1. Ve a la pestaña **Estilos**
2. Personaliza:
   - Colores principales
   - Radio de bordes
   - Fuente
   - Colores de fondo

### Guardar y publicar:

1. Haz clic en **Guardar Formulario**
2. Copia el shortcode que aparece (ej: `[smart_form id="1"]`)
3. Pega el shortcode en cualquier página o entrada

## 🔧 Características Avanzadas

### Lógica Condicional:

1. En cada pregunta, expande **Lógica condicional**
2. Añade condiciones como:
   - Si la respuesta es igual a X, ir a pregunta Y
   - Si la variable es mayor que Z, redirigir a URL
   - Sumar puntos a variables

### Variables y Puntuación:

- Las variables se acumulan durante el formulario
- Puedes usar variables para:
  - Calcular puntuaciones en quiz
  - Determinar rutas condicionales
  - Mostrar resultados personalizados

### Estadísticas:

- Ve a **Estadísticas** para ver:
  - Total de vistas
  - Formularios completados
  - Tasa de conversión
  - Tiempo promedio

## 🐛 Depuración

### Activar modo debug:

Añade esto a `wp-config.php`:
```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
```

### Verificar errores JavaScript:

1. Abre la consola del navegador (F12)
2. Ve a la pestaña **Console**
3. Busca errores relacionados con `sfq_`

### Logs del plugin:

Los errores se registran en:
`/wp-content/debug.log`

## 📋 Checklist de Verificación

- [ ] El plugin está activado
- [ ] Las tablas de base de datos existen
- [ ] El menú "Smart Forms & Quiz" aparece en WordPress
- [ ] Puedes crear un nuevo formulario
- [ ] Puedes añadir preguntas
- [ ] El botón "Guardar Formulario" funciona
- [ ] El shortcode se genera correctamente
- [ ] El formulario se muestra en el frontend
- [ ] Las respuestas se envían correctamente
- [ ] Los analytics se registran

## 🆘 Soporte

Si encuentras problemas:

