# 📊 Funcionalidad de Estadísticas de Formularios

## Descripción General

La funcionalidad de estadísticas proporciona análisis detallados de las respuestas de cada formulario, incluyendo distribución porcentual de respuestas, análisis geográfico por países, y capacidad de exportación de datos.

## Características Principales

### 1. **Página de Estadísticas Dedicada**
- Cada formulario tiene su propia página de estadísticas
- Accesible mediante el botón con icono de gráfico circular en la lista de formularios
- URL: `admin.php?page=sfq-form-statistics&form_id={ID}`

### 2. **Visualización de Datos**

#### Estadísticas de Preguntas
- **Porcentaje de respuestas** para cada opción
- **Gráficos de dona** para visualizar la distribución
- **Número total de respuestas** por pregunta
- Ejemplo: "¿Qué color te gusta?" 
  - Rojo: 45% (450 respuestas)
  - Verde: 35% (350 respuestas)
  - Azul: 20% (200 respuestas)

#### Análisis por País
- **Distribución geográfica** de respuestas
- **Porcentaje por país** con banderas visuales
- **Filtrado por país específico** para ver patrones locales
- Detección automática del país mediante IP

#### Línea de Tiempo
- **Evolución temporal** de respuestas
- **Gráficos de línea** para tendencias
- Comparación de períodos

#### Respuestas Individuales
- **Tabla detallada** de cada respuesta
- Información del usuario, fecha, país
- Búsqueda y filtrado avanzado

### 3. **Filtros Disponibles**

#### Filtros de Fecha
- Hoy
- Esta semana
- Este mes
- Este año
- Rango personalizado

#### Filtros Geográficos
- Todos los países
- País específico
- Comparación entre países

### 4. **Exportación de Datos**
- **Formato CSV** para análisis externo
- Incluye todos los datos filtrados
- Estadísticas agregadas y respuestas individuales

## Archivos del Sistema

### Backend (PHP)
- `includes/admin/class-sfq-form-statistics.php` - Lógica principal de estadísticas
- `includes/class-sfq-admin.php` - Integración con el panel de administración
- `includes/class-sfq-loader.php` - Carga de recursos y enrutamiento

### Frontend (JavaScript/CSS)
- `assets/js/admin-form-statistics.js` - Interactividad y gráficos
- `assets/css/admin-form-statistics.css` - Estilos y diseño responsivo

## Cómo Usar

### Para Administradores

1. **Acceder a las estadísticas**
   - Navega a "Smart Forms" en el panel de WordPress
   - Localiza el formulario deseado
   - Haz clic en el botón con icono de gráfico circular (🥧)

2. **Analizar respuestas**
   - Revisa el resumen general en las tarjetas superiores
   - Navega entre las pestañas para diferentes vistas
   - Usa los filtros para períodos específicos

3. **Análisis por país**
   - Selecciona la pestaña "Análisis por País"
   - Elige un país del selector
   - Observa cómo varían las respuestas por región

4. **Exportar datos**
   - Aplica los filtros deseados
   - Haz clic en "Exportar CSV"
   - Abre el archivo en Excel o Google Sheets

### Para Desarrolladores

#### Añadir nuevos tipos de gráficos
```javascript
// En admin-form-statistics.js
createCustomChart(canvasId, data) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
        type: 'radar', // o cualquier tipo de Chart.js
        data: data,
        options: {
            // configuración personalizada
        }
    });
}
```

#### Extender las estadísticas
```php
// En class-sfq-form-statistics.php
public function get_custom_statistics($form_id, $filters = []) {
    // Tu lógica personalizada
    return $custom_stats;
}
```

## Requisitos Técnicos

- WordPress 5.0+
- PHP 7.2+
- MySQL 5.6+
- Navegador moderno con soporte para JavaScript ES6

## Seguridad

- Verificación de permisos con `manage_smart_forms`
- Sanitización de todos los inputs
- Nonces para prevenir CSRF
- Escape de datos en la salida

## Rendimiento

- Consultas optimizadas con índices
- Cache de resultados frecuentes
- Carga asíncrona de datos
- Paginación para grandes conjuntos de datos

## Solución de Problemas

### Las estadísticas no se cargan
1. Verifica que todos los archivos estén presentes
2. Revisa la consola del navegador para errores JavaScript
3. Confirma que el usuario tiene permisos adecuados

### Los gráficos no se muestran
1. Asegúrate de que Chart.js esté cargado
2. Verifica que no haya conflictos con otros plugins
3. Revisa que los datos estén en el formato correcto

### La exportación CSV falla
1. Verifica los permisos de escritura
2. Confirma que no hay límites de memoria PHP
3. Revisa el log de errores de WordPress

## Actualizaciones Futuras

- [ ] Integración con Google Analytics
- [ ] Reportes automatizados por email
- [ ] Comparación entre múltiples formularios
- [ ] Exportación a PDF
- [ ] Dashboard personalizable
- [ ] Webhooks para integraciones externas

## Soporte

Para reportar problemas o sugerir mejoras, usa el comando `/reportbug` en el chat o contacta al equipo de desarrollo.

---

**Versión:** 1.0.0  
**Última actualización:** Enero 2025  
**Autor:** Smart Forms Quiz Team
