# Guía para Implementar Nuevas Opciones de Formulario
## Smart Forms & Quiz Plugin - WordPress

### Versión: 1.0
### Fecha: Enero 2025

---

## 📋 Índice

1. [Introducción](#introducción)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Pasos para Implementar Nuevas Opciones](#pasos-para-implementar-nuevas-opciones)
4. [Ejemplo Práctico: Límite de Envíos](#ejemplo-práctico-límite-de-envíos)
5. [Validaciones y Seguridad](#validaciones-y-seguridad)
6. [Testing y Verificación](#testing-y-verificación)
7. [Buenas Prácticas](#buenas-prácticas)

---

## 🎯 Introducción

Este documento establece los requerimientos y procedimientos estándar para añadir nuevas opciones de configuración a los formularios del plugin Smart Forms & Quiz, asegurando:

- **Consistencia** con la arquitectura existente
- **Compatibilidad** con el sistema de duplicación
- **Seguridad** siguiendo las buenas prácticas de WordPress
- **Escalabilidad** para futuras implementaciones

---

## 🏗️ Arquitectura del Sistema

### Componentes Principales

#### 1. **Base de Datos** (`class-sfq-database.php`)
- **Tabla principal**: `wp_sfq_forms`
- **Campos de configuración**:
  - `settings` (LONGTEXT) - Configuraciones funcionales
  - `style_settings` (LONGTEXT) - Configuraciones de estilo
- **Formato**: JSON serializado
- **Transacciones**: Garantizan integridad de datos

#### 2. **Administración** (`class-sfq-admin.php`)
- **Estructura de tabs**:
  - General: Información básica
  - Preguntas: Gestión de preguntas
  - Estilo: Configuraciones visuales
  - **Configuración**: ⭐ **Aquí se añaden nuevas opciones**
- **Renderizado**: HTML + PHP
- **Validación**: Server-side
  - Límites: Limites de acceso a los formularios
  - Variables: Variables globales permiten para lógica condicional.

#### 3. **AJAX Handler** (`class-sfq-ajax.php`)
- **Guardado**: `save_form()` method
- **Duplicación**: `duplicate_form()` method
- **Validación**: Nonce + permisos
- **Rate limiting**: Prevención de spam

#### 4. **JavaScript** (`admin-builder-v2.js`)
- **Recolección**: `collectFormData()` method
- **Estado**: StateManager centralizado
- **Auto-guardado**: Cada 30 segundos
- **Validación**: Client-side

---

## 🔧 Pasos para Implementar Nuevas Opciones

### Paso 1: Planificación

#### 1.1 Definir la Opción
```markdown
- **Nombre**: Límite de Envíos
- **Tipo**: Configuración funcional (va en `settings`)
- **Campos necesarios**:
  - `submission_limit_enabled` (boolean)
  - `submission_limit_count` (integer)
  - `submission_limit_period` (string: 'hour', 'day', 'week', 'month')
  - `submission_limit_message` (string)
```

#### 1.2 Determinar Ubicación
- **Tab**: Configuración (tab-settings)
- **Sección**: Nueva sección "Límites de Envío"
- **Posición**: Después de las opciones existentes

### Paso 2: Modificaciones en Admin (`class-sfq-admin.php`)

#### 2.1 Añadir HTML en `render_form_builder()`

Localizar la sección `<!-- Tab Configuración -->` y añadir:

```php
<!-- Después de las opciones existentes, añadir nueva sección -->
<div class="sfq-field-group sfq-limits-section">
    <h4><?php _e('Límites de Envío', 'smart-forms-quiz'); ?></h4>
    
    <label>
        <input type="checkbox" id="submission-limit-enabled">
        <?php _e('Activar límite de envíos', 'smart-forms-quiz'); ?>
    </label>
    
    <div class="sfq-limit-settings" id="submission-limit-settings" style="display: none; margin-left: 20px; margin-top: 10px;">
        <div class="sfq-field-row">
            <label><?php _e('Máximo de envíos', 'smart-forms-quiz'); ?></label>
            <input type="number" id="submission-limit-count" min="1" max="1000" value="5" class="sfq-input-small">
        </div>
        
        <div class="sfq-field-row">
            <label><?php _e('Período de tiempo', 'smart-forms-quiz'); ?></label>
            <select id="submission-limit-period" class="sfq-select">
                <option value="hour"><?php _e('Por hora', 'smart-forms-quiz'); ?></option>
                <option value="day"><?php _e('Por día', 'smart-forms-quiz'); ?></option>
                <option value="week"><?php _e('Por semana', 'smart-forms-quiz'); ?></option>
                <option value="month"><?php _e('Por mes', 'smart-forms-quiz'); ?></option>
            </select>
        </div>
        
        <div class="sfq-field-row">
            <label><?php _e('Mensaje cuando se alcance el límite', 'smart-forms-quiz'); ?></label>
            <textarea id="submission-limit-message" class="sfq-textarea" rows="2" 
                      placeholder="<?php _e('Has alcanzado el límite de envíos. Inténtalo más tarde.', 'smart-forms-quiz'); ?>"></textarea>
        </div>
    </div>
</div>
```

#### 2.2 Añadir CSS para la nueva sección

```php
<!-- Añadir en la sección <style> existente -->
<style>
/* Estilos existentes... */

.sfq-limits-section {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 6px;
    padding: 15px;
    margin-top: 15px;
}

.sfq-limits-section h4 {
    margin: 0 0 15px 0;
    color: #495057;
    font-size: 14px;
    font-weight: 600;
}

.sfq-field-row {
    margin-bottom: 12px;
}

.sfq-field-row label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
    font-size: 13px;
}

.sfq-input-small {
    width: 80px;
}

.sfq-limit-settings {
    border-left: 3px solid #007cba;
    padding-left: 15px;
}
</style>
```

### Paso 3: Modificaciones en JavaScript (`admin-builder-v2.js`)

#### 3.1 Actualizar `bindGlobalEvents()`

Añadir después de los eventos existentes:

```javascript
// Submission limit toggle
$('#submission-limit-enabled').on('change' + ns, function() {
    $('#submission-limit-settings').toggle($(this).is(':checked'));
    if (!this.isDestroyed) {
        this.isDirty = true;
    }
});

// Submission limit fields
$('#submission-limit-count, #submission-limit-period, #submission-limit-message').on('change input' + ns, () => {
    if (!this.isDestroyed) {
        this.isDirty = true;
    }
});
```

#### 3.2 Actualizar `populateFormData()`

Añadir después de las configuraciones existentes:

```javascript
// Submission limits
$('#submission-limit-enabled').prop('checked', settings.submission_limit_enabled === true);
$('#submission-limit-count').val(settings.submission_limit_count || 5);
$('#submission-limit-period').val(settings.submission_limit_period || 'day');
$('#submission-limit-message').val(settings.submission_limit_message || '');

// Show/hide limit settings
$('#submission-limit-settings').toggle(settings.submission_limit_enabled === true);
```

#### 3.3 Actualizar `collectFormData()`

Modificar el objeto `settings`:

```javascript
settings: {
    // Configuraciones existentes...
    show_progress_bar: $('#show-progress-bar').is(':checked'),
    show_question_numbers: $('#show-question-numbers').is(':checked'),
    auto_advance: $('#auto-advance').is(':checked'),
    allow_back: $('#allow-back').is(':checked'),
    randomize_questions: $('#randomize-questions').is(':checked'),
    save_partial: $('#save-partial').is(':checked'),
    show_intro_screen: $('#show-intro-screen').is(':checked'),
    
    // ⭐ NUEVAS OPCIONES
    submission_limit_enabled: $('#submission-limit-enabled').is(':checked'),
    submission_limit_count: parseInt($('#submission-limit-count').val()) || 5,
    submission_limit_period: $('#submission-limit-period').val() || 'day',
    submission_limit_message: $('#submission-limit-message').val() || ''
}
```

### Paso 4: Validación en AJAX (`class-sfq-ajax.php`)

#### 4.1 Actualizar `validate_form_data()`

Añadir validaciones específicas:

```php
// Validar configuraciones de límite de envíos
if (isset($form_data['settings']['submission_limit_enabled']) && $form_data['settings']['submission_limit_enabled']) {
    $limit_count = intval($form_data['settings']['submission_limit_count'] ?? 0);
    $limit_period = $form_data['settings']['submission_limit_period'] ?? '';
    
    if ($limit_count < 1 || $limit_count > 1000) {
        $errors['submission_limit_count'] = __('El límite de envíos debe estar entre 1 y 1000', 'smart-forms-quiz');
    }
    
    $allowed_periods = array('hour', 'day', 'week', 'month');
    if (!in_array($limit_period, $allowed_periods)) {
        $errors['submission_limit_period'] = __('Período de tiempo inválido', 'smart-forms-quiz');
    }
    
    $limit_message = $form_data['settings']['submission_limit_message'] ?? '';
    if (strlen($limit_message) > 500) {
        $errors['submission_limit_message'] = __('El mensaje no puede exceder 500 caracteres', 'smart-forms-quiz');
    }
}
```

#### 4.2 Verificar `duplicate_form()`

El método existente ya copia automáticamente todas las configuraciones:

```php
// ✅ ESTE CÓDIGO YA EXISTE Y FUNCIONA CORRECTAMENTE
'settings' => $original_form->settings, // Copia TODAS las configuraciones
```

### Paso 5: Implementar Lógica de Límites

#### 5.1 Crear nueva clase `class-sfq-limits.php`

```php
<?php
/**
 * Manejo de límites de envío
 */

if (!defined('ABSPATH')) {
    exit;
}

class SFQ_Limits {
    
    private $database;
    
    public function __construct() {
        $this->database = new SFQ_Database();
    }
    
    /**
     * Verificar si se puede enviar el formulario
     */
    public function can_submit_form($form_id, $user_identifier = null) {
        $form = $this->database->get_form($form_id);
        
        if (!$form || !isset($form->settings['submission_limit_enabled']) || !$form->settings['submission_limit_enabled']) {
            return array('allowed' => true);
        }
        
        $limit_count = intval($form->settings['submission_limit_count'] ?? 5);
        $limit_period = $form->settings['submission_limit_period'] ?? 'day';
        $limit_message = $form->settings['submission_limit_message'] ?? __('Has alcanzado el límite de envíos. Inténtalo más tarde.', 'smart-forms-quiz');
        
        // Obtener identificador del usuario
        if (!$user_identifier) {
            $user_identifier = $this->get_user_identifier();
        }
        
        // Contar envíos en el período
        $submission_count = $this->count_submissions_in_period($form_id, $user_identifier, $limit_period);
        
        if ($submission_count >= $limit_count) {
            return array(
                'allowed' => false,
                'message' => $limit_message,
                'count' => $submission_count,
                'limit' => $limit_count,
                'period' => $limit_period
            );
        }
        
        return array(
            'allowed' => true,
            'count' => $submission_count,
            'limit' => $limit_count,
            'remaining' => $limit_count - $submission_count
        );
    }
    
    /**
     * Contar envíos en un período específico
     */
    private function count_submissions_in_period($form_id, $user_identifier, $period) {
        global $wpdb;
        
        // Calcular fecha de inicio según el período
        $date_intervals = array(
            'hour' => '1 HOUR',
            'day' => '1 DAY',
            'week' => '1 WEEK',
            'month' => '1 MONTH'
        );
        
        $interval = $date_intervals[$period] ?? '1 DAY';
        
        // Construir consulta según el tipo de identificador
        if (is_numeric($user_identifier)) {
            // Usuario registrado
            $count = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$wpdb->prefix}sfq_submissions 
                WHERE form_id = %d 
                AND user_id = %d 
                AND status = 'completed'
                AND completed_at >= DATE_SUB(NOW(), INTERVAL {$interval})",
                $form_id,
                $user_identifier
            ));
        } else {
            // Usuario por IP
            $count = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$wpdb->prefix}sfq_submissions 
                WHERE form_id = %d 
                AND user_ip = %s 
                AND status = 'completed'
                AND completed_at >= DATE_SUB(NOW(), INTERVAL {$interval})",
                $form_id,
                $user_identifier
            ));
        }
        
        return intval($count);
    }
    
    /**
     * Obtener identificador único del usuario
     */
    private function get_user_identifier() {
        if (is_user_logged_in()) {
            return get_current_user_id();
        }
        
        // Para usuarios no registrados, usar IP
        return SFQ_Utils::get_user_ip();
    }
    
    /**
     * Registrar intento de envío bloqueado
     */
    public function log_blocked_submission($form_id, $reason = 'limit_exceeded') {
        global $wpdb;
        
        $wpdb->insert(
            $wpdb->prefix . 'sfq_analytics',
            array(
                'form_id' => $form_id,
                'event_type' => 'submission_blocked',
                'event_data' => json_encode(array(
                    'reason' => $reason,
                    'user_identifier' => $this->get_user_identifier(),
                    'timestamp' => time()
                )),
                'user_ip' => SFQ_Utils::get_user_ip(),
                'session_id' => SFQ_Utils::get_or_create_session_id($form_id)
            ),
            array('%d', '%s', '%s', '%s', '%s')
        );
    }
}
```

#### 5.2 Integrar en `class-sfq-ajax.php`

Modificar el método `submit_response()`:

```php
public function submit_response() {
    // Código existente de verificación de nonce y rate limiting...
    
    $form_id = intval($_POST['form_id'] ?? 0);
    
    // ⭐ NUEVA VERIFICACIÓN DE LÍMITES
    $limits_checker = new SFQ_Limits();
    $limit_check = $limits_checker->can_submit_form($form_id);
    
    if (!$limit_check['allowed']) {
        // Registrar intento bloqueado
        $limits_checker->log_blocked_submission($form_id);
        
        wp_send_json_error(array(
            'message' => $limit_check['message'],
            'code' => 'SUBMISSION_LIMIT_EXCEEDED',
            'limit_info' => $limit_check
        ));
        return;
    }
    
    // Continuar con el código existente...
}
```

### Paso 6: Cargar la Nueva Clase

#### 6.1 Modificar `smart-forms-quiz.php`

Añadir después de las otras inclusiones:

```php
// Cargar clases principales
require_once SFQ_PLUGIN_DIR . 'includes/class-sfq-utils.php';
require_once SFQ_PLUGIN_DIR . 'includes/class-sfq-security.php';
require_once SFQ_PLUGIN_DIR . 'includes/class-sfq-activator.php';
require_once SFQ_PLUGIN_DIR . 'includes/class-sfq-loader.php';
require_once SFQ_PLUGIN_DIR . 'includes/class-sfq-database.php';
require_once SFQ_PLUGIN_DIR . 'includes/class-sfq-limits.php'; // ⭐ NUEVA LÍNEA
require_once SFQ_PLUGIN_DIR . 'includes/class-sfq-admin.php';
// ... resto de inclusiones
```

---

## 🔒 Validaciones y Seguridad

### Validaciones Obligatorias

#### 1. **Server-side** (PHP)
```php
// Sanitización
$limit_count = max(1, min(1000, intval($input)));
$limit_period = in_array($input, ['hour', 'day', 'week', 'month']) ? $input : 'day';
$limit_message = sanitize_textarea_field($input);

// Validación
if ($limit_count < 1 || $limit_count > 1000) {
    throw new Exception('Límite inválido');
}
```

#### 2. **Client-side** (JavaScript)
```javascript
// Validación en tiempo real
$('#submission-limit-count').on('input', function() {
    const value = parseInt($(this).val());
    if (value < 1 || value > 1000) {
        $(this).addClass('error');
    } else {
        $(this).removeClass('error');
    }
});
```

#### 3. **Nonce Verification**
```php
// Ya implementado en el sistema existente
if (!check_ajax_referer('sfq_nonce', 'nonce', false)) {
    wp_send_json_error(__('Error de seguridad', 'smart-forms-quiz'));
    return;
}
```

---

## 🧪 Testing y Verificación

### Checklist de Pruebas

#### ✅ Funcionalidad Básica
- [ ] La opción aparece en el tab Configuración
- [ ] Se puede activar/desactivar correctamente
- [ ] Los campos se muestran/ocultan según el estado
- [ ] Los valores se guardan correctamente
- [ ] Los valores se cargan correctamente al editar

#### ✅ Duplicación de Formularios
- [ ] Al duplicar, las configuraciones de límites se copian
- [ ] Los valores copiados son exactos
- [ ] No hay conflictos con otras configuraciones

#### ✅ Validación
- [ ] Valores fuera de rango son rechazados
- [ ] Períodos inválidos son rechazados
- [ ] Mensajes muy largos son rechazados
- [ ] Validación client-side funciona
- [ ] Validación server-side funciona

#### ✅ Lógica de Límites
- [ ] Los límites se aplican correctamente
- [ ] Los períodos de tiempo funcionan
- [ ] Los mensajes personalizados se muestran
- [ ] Los usuarios registrados vs anónimos se manejan bien
- [ ] Los logs de eventos bloqueados se registran

#### ✅ Seguridad
- [ ] Nonce verification funciona
- [ ] Permisos de usuario se verifican
- [ ] Rate limiting se aplica
- [ ] Sanitización de datos funciona
- [ ] No hay vulnerabilidades XSS

---

## 📋 Buenas Prácticas

### 1. **Nomenclatura Consistente**
```php
// ✅ CORRECTO - Sigue el patrón existente
'submission_limit_enabled'
'submission_limit_count'
'submission_limit_period'

// ❌ INCORRECTO - No sigue el patrón
'enableSubmissionLimit'
'maxSubmissions'
'timeframe'
```

### 2. **⚠️ CRÍTICO: Consistencia en Session ID con form_id**

**PROBLEMA COMÚN**: Inconsistencia entre guardado y verificación de session_id

Cuando implementes límites que usen `session_id`, es **CRÍTICO** que uses el mismo `form_id` tanto para guardar como para verificar:

```php
// ❌ PROBLEMÁTICO - Inconsistencia en form_id
class SFQ_Limits {
    private function get_user_identifier($limit_type = 'session_id') {
        if ($limit_type === 'session_id') {
            return SFQ_Utils::get_or_create_session_id(0); // ← form_id = 0 (genérico)
        }
    }
    
    private function check_max_submissions($form_id, $settings) {
        $current_user_identifier = $this->get_user_identifier($max_limit_type); // ← No pasa form_id
        // Busca con session_id genérico, pero se guardó con session_id específico
    }
}

// ✅ CORRECTO - Consistencia en form_id
class SFQ_Limits {
    private function get_user_identifier($limit_type = 'session_id', $form_id = null) {
        if ($limit_type === 'session_id') {
            $session_form_id = $form_id !== null ? $form_id : 0;
            return SFQ_Utils::get_or_create_session_id($session_form_id); // ← Usa form_id específico
        }
    }
    
    private function check_max_submissions($form_id, $settings) {
        $current_user_identifier = $this->get_user_identifier($max_limit_type, $form_id); // ← Pasa form_id
        // Busca con el MISMO session_id específico con el que se guardó
    }
}
```

**¿Por qué es importante?**

- `SFQ_Utils::get_or_create_session_id($form_id)` genera cookies específicas por formulario
- Cookie con `form_id = 5`: `sfq_session_5`
- Cookie con `form_id = 0`: `sfq_session` (genérica)
- **Diferentes cookies = diferentes session_ids = no reconoce al usuario**

**Síntomas del problema:**
- Límites de participantes no funcionan correctamente con `session_id`
- Usuarios existentes no son reconocidos como tales
- Funciona con IP pero no con session_id
- Especialmente problemático cuando `max_submissions = 1`

**Solución:**
1. Siempre pasar el `form_id` real a métodos que generen session_id
2. Usar el mismo `form_id` tanto para guardar como para verificar
3. Probar específicamente el caso `max_submissions = 1` con session_id

### 3. **Ubicación de Configuraciones**
```php
// ✅ Configuraciones funcionales van en 'settings'
$form->settings['submission_limit_enabled'] = true;

// ✅ Configuraciones visuales van en 'style_settings'
$form->style_settings['primary_color'] = '#007cba';
```

### 4. **Valores por Defecto**
```php
// ✅ Siempre proporcionar valores por defecto
$limit_count = intval($settings['submission_limit_count'] ?? 5);
$limit_period = $settings['submission_limit_period'] ?? 'day';
```

### 5. **Internacionalización**
```php
// ✅ Todos los textos deben ser traducibles
__('Límites de Envío', 'smart-forms-quiz')
_e('Activar límite de envíos', 'smart-forms-quiz')
```

### 6. **Manejo de Errores**
```php
// ✅ Siempre manejar errores gracefully
try {
    $result = $this->process_limits();
} catch (Exception $e) {
    error_log('SFQ Limits Error: ' . $e->getMessage());
    wp_send_json_error(__('Error interno', 'smart-forms-quiz'));
}
```

### 7. **Performance**
```php
// ✅ Usar cache cuando sea posible
$cache_key = "sfq_limits_{$form_id}_{$user_id}";
$cached_result = wp_cache_get($cache_key, 'sfq_limits');

if ($cached_result !== false) {
    return $cached_result;
}
```

---

## 🎯 Resumen de Archivos a Modificar

### Archivos Principales
1. **`includes/class-sfq-admin.php`** - Añadir HTML y CSS
2. **`assets/js/admin-builder-v2.js`** - Añadir JavaScript
3. **`includes/class-sfq-ajax.php`** - Añadir validaciones
4. **`smart-forms-quiz.php`** - Incluir nueva clase
5. **`includes/class-sfq-limits.php`** - ⭐ **NUEVO ARCHIVO**

### Modificaciones por Archivo
```
class-sfq-admin.php:
├── render_form_builder() → Añadir HTML
└── <style> → Añadir CSS

admin-builder-v2.js:
├── bindGlobalEvents() → Añadir event listeners
├── populateFormData() → Cargar valores
└── collectFormData() → Recopilar valores

class-sfq-ajax.php:
├── validate_form_data() → Añadir validaciones
└── submit_response() → Verificar límites

smart-forms-quiz.php:
└── require_once → Incluir nueva clase

class-sfq-limits.php:
└── NUEVO ARCHIVO COMPLETO
```

---

## 🚀 Próximos Pasos

1. **Implementar** siguiendo esta guía paso a paso
2. **Probar** cada funcionalidad según el checklist
3. **Documentar** cualquier desviación o mejora
4. **Actualizar** esta guía con lecciones aprendidas

---

**📝 Nota**: Esta guía debe seguirse para CUALQUIER nueva opción que se quiera añadir al formulario. Los patrones aquí establecidos garantizan consistencia y compatibilidad con todo el sistema existente.

---

*Documento creado para Smart Forms & Quiz Plugin v1.5.0*
*Última actualización: Agosto 2025*
