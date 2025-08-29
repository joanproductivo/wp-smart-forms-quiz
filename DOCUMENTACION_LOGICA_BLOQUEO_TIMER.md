# 📋 DOCUMENTACIÓN COMPLETA: LÓGICA DE BLOQUEO Y TIMER

## 🎯 PROPÓSITO DEL DOCUMENTO
Esta documentación detalla toda la lógica del sistema de bloqueo de formularios y timer en el plugin Smart Forms Quiz, incluyendo todas las opciones de comportamiento al expirar el timer y sus implementaciones técnicas.

---

## 📊 ESTRUCTURA GENERAL DEL SISTEMA

### 🔄 FLUJO DE VERIFICACIONES ACTUALIZADO
```
INICIO → ¿Formulario bloqueado manualmente?
         ├─ NO → Verificar límites automáticos → Mostrar formulario
         └─ SÍ → ¿Hay timer configurado?
                 ├─ NO → Bloquear SIEMPRE
                 └─ SÍ → ¿Timer expirado?
                         ├─ NO → Mostrar contador regresivo
                         └─ SÍ → ¿Opción "No mostrar formulario"?
                                 ├─ NO → Mostrar formulario
                                 └─ SÍ → ¿Opción "Ocultar todo"?
                                         ├─ SÍ → NO RENDERIZAR NADA
                                         └─ NO → MANTENER CONTADOR 00:00:00:00
```

### 🏗️ ARQUITECTURA DE ARCHIVOS
- **`class-sfq-frontend.php`**: Lógica principal de renderizado y verificaciones
- **`frontend.js`**: Manejo del timer en cliente y persistencia
- **`class-sfq-ajax.php`**: Peticiones AJAX para contenido dinámico
- **`class-sfq-limits.php`**: Verificación de límites automáticos

---

## 🔒 TIPOS DE BLOQUEO

### 1️⃣ BLOQUEO MANUAL SIN TIMER
**Archivo**: `class-sfq-frontend.php` líneas 45-75
**Condición**: `$settings['block_form'] = true` Y NO hay timer
**Comportamiento**: Bloquea SIEMPRE el formulario
**Código de error**: `FORM_BLOCKED`

```php
if (isset($settings['block_form']) && $settings['block_form'] && !$timer_expired_request) {
    if (empty($styles['block_form_enable_timer']) || empty($styles['block_form_timer_date'])) {
        // Formulario bloqueado sin timer - bloquear siempre
        $block_check = array(
            'allowed' => false,
            'code' => 'FORM_BLOCKED',
            'message' => __('Este formulario está temporalmente bloqueado.', 'smart-forms-quiz')
        );
        return $this->render_limit_message($form_id, $block_check, $form->style_settings);
    }
}
```

### 2️⃣ BLOQUEO MANUAL CON TIMER - ACTIVO
**Archivo**: `class-sfq-frontend.php` líneas 76-95
**Condición**: `$settings['block_form'] = true` Y hay timer Y `current_time < timer_time`
**Comportamiento**: Muestra contador regresivo
**Código de error**: `FORM_BLOCKED_WITH_TIMER`

```php
if ($current_timestamp < $timer_timestamp) {
    // El timer aún no ha expirado - mostrar mensaje con timer
    $block_check = array(
        'allowed' => false,
        'code' => 'FORM_BLOCKED_WITH_TIMER',
        'message' => __('Este formulario está temporalmente bloqueado.', 'smart-forms-quiz'),
        'timer_date' => $timer_date,
        'timer_timezone' => $timezone,
        'timer_utc_timestamp' => $timer_timestamp,
        // ... más configuraciones del timer
    );
    return $this->render_limit_message($form_id, $block_check, $styles);
}
```

### 3️⃣ BLOQUEO MANUAL CON TIMER - EXPIRADO
**Archivo**: `class-sfq-frontend.php` líneas 76-95
**Condición**: `$settings['block_form'] = true` Y hay timer Y `current_time >= timer_time`
**Comportamiento**: PERMITE acceso al formulario (continúa con renderizado normal)

```php
if ($current_timestamp >= $timer_timestamp) {
    // El timer ya expiró - NO bloquear el formulario
    // Continuar con el renderizado normal del formulario
}
```

### 4️⃣ LÍMITES AUTOMÁTICOS
**Archivo**: `class-sfq-limits.php`
**Tipos**:
- Límites de envío por período
- Programación (fechas de inicio/fin)
- Requerimiento de login
- Límite máximo de participantes

---

## ⏰ SISTEMA DE TIMER

### 🔧 CONFIGURACIONES PRINCIPALES

#### A) Configuraciones Básicas
```php
// En $styles (style_settings)
'block_form_enable_timer' => true/false,           // Habilitar timer
'block_form_timer_date' => '2024-12-31 23:59:59', // Fecha objetivo
'block_form_timer_timezone' => 'Europe/Madrid',    // Zona horaria
'block_form_timer_text' => 'El formulario se abrirá en:', // Texto del contador
```

#### B) Configuraciones de Expiración
```php
'block_form_timer_show_form' => true/false,        // No mostrar formulario al expirar
'block_form_timer_hide_all' => true/false,         // 🆕 Ocultar todo completamente al expirar
'block_form_timer_opened_text' => '¡Formulario disponible!', // Texto al expirar
```

#### C) Configuraciones de Mensaje Disponible
```php
'available_icon' => '✅',
'available_title' => '¡El formulario ya está disponible!',
'available_description' => 'Puedes acceder al formulario ahora.',
'available_button_text' => 'Acceder al formulario',
'available_button_url' => '', // URL personalizada o vacío para recargar
```

### 🕐 LÓGICA DE CONVERSIÓN UTC
**Archivo**: `class-sfq-frontend.php` líneas 720-750

```php
private function convert_to_utc_timestamp($date_string, $timezone_string) {
    try {
        $timezone = new DateTimeZone($timezone_string);
        $datetime = new DateTime($date_string, $timezone);
        $datetime->setTimezone(new DateTimeZone('UTC'));
        return $datetime->getTimestamp();
    } catch (Exception $e) {
        // Fallbacks para errores de zona horaria
        error_log('SFQ Timer Timezone Error: ' . $e->getMessage());
        // ... lógica de fallback
    }
}
```

---

## 🌐 LÓGICA JAVASCRIPT DEL TIMER

### 📍 UBICACIÓN Y ESTRUCTURA
**Archivo**: `class-sfq-frontend.php` líneas 400-600 (JavaScript embebido)

### 🔄 FLUJO DE EJECUCIÓN ACTUALIZADO
```javascript
1. Inicializar timer con timestamp UTC del servidor
2. Verificar estado previo en localStorage (oculto completamente o expirado)
3. Actualizar contador cada segundo
4. Al expirar → Verificar configuraciones:
   ├─ block_form_timer_show_form = false → Mostrar mensaje de disponibilidad + botón acceso
   └─ block_form_timer_show_form = true → ¿Ocultar todo?
       ├─ block_form_timer_hide_all = true → OCULTAR TODO COMPLETAMENTE
       └─ block_form_timer_hide_all = false → Mantener contador en 00:00:00:00
```

### 💾 SISTEMA DE PERSISTENCIA MEJORADO
```javascript
// Estados de persistencia
localStorage.setItem('sfq_timer_expired_' + formId, Date.now().toString());           // Timer expirado (5 min)
localStorage.setItem('sfq_timer_expired_hide_all_' + formId, Date.now().toString()); // Oculto completamente (24h)

// Verificar estado al cargar página
function initializeClock() {
    // 1. Verificar si debe estar completamente oculto
    const hideAllExpiredTime = localStorage.getItem('sfq_timer_expired_hide_all_' + formId);
    if (hideAllExpiredTime) {
        const expiredTimestamp = parseInt(hideAllExpiredTime);
        const now = Date.now();
        
        // Si expiró hace menos de 24 horas, mantener oculto
        if (now - expiredTimestamp < 24 * 60 * 60 * 1000) {
            const limitContainer = document.querySelector('.sfq-limit-message-container');
            if (limitContainer) {
                limitContainer.style.display = 'none';
            }
            return;
        }
    }
    
    // 2. Verificar estado de expiración normal
    const expiredTime = localStorage.getItem('sfq_timer_expired_' + formId);
    if (expiredTime) {
        // Si expiró hace menos de 5 minutos, mostrar estado expirado
        if (now - expiredTimestamp < 5 * 60 * 1000) {
            handleTimerExpired();
            return;
        }
    }
    
    // 3. Continuar con timer normal
    updateClock();
    timeinterval = setInterval(updateClock, 1000);
}
```

### 🎯 FUNCIÓN CRÍTICA ACTUALIZADA: `handleTimerExpired()`
```javascript
function handleTimerExpired() {
    if (timerExpired) return; // Evitar múltiples ejecuciones
    
    timerExpired = true;
    clearInterval(timeinterval);
    
    const showFormSetting = '<?php echo esc_js($styles['block_form_timer_show_form'] ?? false); ?>';
    const hideAllSetting = '<?php echo esc_js($styles['block_form_timer_hide_all'] ?? false); ?>';
    
    if (showFormSetting === '1' || showFormSetting === 'true') {
        // Verificar si debe ocultar todo completamente
        if (hideAllSetting === '1' || hideAllSetting === 'true') {
            // 🆕 NUEVA FUNCIONALIDAD: Ocultar completamente todo el contenedor
            const limitContainer = document.querySelector('.sfq-limit-message-container');
            if (limitContainer) {
                limitContainer.style.transition = 'opacity 0.5s ease, height 0.5s ease';
                limitContainer.style.opacity = '0';
                limitContainer.style.height = '0';
                limitContainer.style.overflow = 'hidden';
                limitContainer.style.margin = '0';
                limitContainer.style.padding = '0';
                
                setTimeout(() => {
                    limitContainer.style.display = 'none';
                }, 500);
            }
            
            // Guardar estado en localStorage (24 horas de duración)
            localStorage.setItem('sfq_timer_expired_hide_all_' + formId, Date.now().toString());
            return;
        }
        
        // Comportamiento anterior: Solo mantener contador visible
        timerElement.classList.add('expired', 'keep-visible');
        if (timerTextEl) timerTextEl.textContent = openedText;
        
        // Mantener números en 00:00:00:00
        if (daysSpan) daysSpan.textContent = '00';
        if (hoursSpan) hoursSpan.textContent = '00';
        if (minutesSpan) minutesSpan.textContent = '00';
        if (secondsSpan) secondsSpan.textContent = '00';
        
        // Guardar estado en localStorage (5 minutos de duración)
        localStorage.setItem('sfq_timer_expired_' + formId, Date.now().toString());
        return;
    }
    
    // Comportamiento normal: mostrar mensaje de disponibilidad
    timerElement.classList.add('expired');
    setTimeout(() => showFormAvailableMessage(), 2000);
}
```

---

## 🚨 PROBLEMA IDENTIFICADO Y SOLUCIONADO ✅

### 📋 DESCRIPCIÓN DEL PROBLEMA (RESUELTO)
**Opción**: "🚫 No mostrar ningún mensaje ni formulario al terminar, dejar el contador en pantalla"
**Campo**: `block_form_timer_show_form = true` (cuando está ACTIVADO)

#### ✅ Comportamiento Esperado:
1. Timer activo → Mostrar contador regresivo
2. Timer expirado → Mantener contador en 00:00:00:00 con mensaje "El tiempo se agotó"
3. Al recargar página → Mantener el mismo estado (contador visible, NO formulario)

#### ❌ Comportamiento Anterior (PROBLEMA SOLUCIONADO):
1. Timer activo → ✅ Funciona correctamente
2. Timer expirado → ✅ Mantiene contador visible
3. Al recargar página → ❌ Muestra formulario en lugar del contador

### 🔍 CAUSA RAÍZ (IDENTIFICADA Y CORREGIDA)
**Archivo**: `class-sfq-frontend.php` función `is_timer_expired_request()` líneas ~650

**Problema Original**: La función solo verificaba el estado natural del timer pero NO consideraba la configuración `block_form_timer_show_form` para mantener el contador visible.

```php
// CÓDIGO ANTERIOR (PROBLEMÁTICO)
private function is_timer_expired_request($form_id) {
    // Verificar si el timer ya expiró naturalmente
    if ($current_timestamp >= $timer_timestamp) {
        return true; // 🚨 PROBLEMA: Siempre permitía bypass
    }
    return false;
}
```

---

## ✅ SOLUCIÓN IMPLEMENTADA

### 1️⃣ MODIFICACIÓN DE `is_timer_expired_request()` ✅
**Archivo**: `class-sfq-frontend.php` líneas ~650
**Estado**: ✅ IMPLEMENTADO

```php
private function is_timer_expired_request($form_id) {
    // ... verificaciones existentes ...
    
    // Verificar si el timer ya expiró naturalmente
    if ($current_timestamp >= $timer_timestamp) {
        // 🆕 NUEVA LÓGICA: Verificar configuración de mostrar formulario
        if (isset($styles['block_form_timer_show_form']) && $styles['block_form_timer_show_form']) {
            // Si está configurado para MANTENER SOLO EL TIMER, NO permitir bypass
            return false;
        }
        return true;
    }
    
    return false;
}
```

**Cambio Clave**: Ahora verifica `block_form_timer_show_form = true` y NO permite bypass del bloqueo.

### 2️⃣ NUEVA LÓGICA DE RENDERIZADO ✅
**Archivo**: `class-sfq-frontend.php` líneas ~50-60
**Estado**: ✅ IMPLEMENTADO

```php
if ($current_timestamp >= $timer_timestamp) {
    // El timer ya expiró - verificar si debe mantener contador visible
    if (isset($styles['block_form_timer_show_form']) && $styles['block_form_timer_show_form']) {
        // 🆕 NUEVA VERIFICACIÓN: Si debe ocultar todo completamente
        if (isset($styles['block_form_timer_hide_all']) && $styles['block_form_timer_hide_all']) {
            // No renderizar nada - devolver cadena vacía
            return '';
        }
        
        // Renderizar contador en estado expirado (mantener solo timer visible)
        $block_check = array(
            'allowed' => false,
            'code' => 'FORM_BLOCKED_WITH_TIMER_EXPIRED',
            'message' => __('Este formulario está temporalmente bloqueado.', 'smart-forms-quiz'),
            'timer_date' => $timer_date,
            'timer_timezone' => $timezone,
            'timer_utc_timestamp' => $timer_timestamp,
            'timer_text' => $styles['block_form_timer_opened_text'] ?? __('¡El tiempo se agotó!', 'smart-forms-quiz'),
            'timer_expired' => true,
            'keep_counter_visible' => true,
            // Incluir todas las configuraciones del timer para renderizado completo
            'available_icon' => $styles['block_form_timer_available_icon'] ?? '✅',
            // ... resto de configuraciones de disponibilidad
        );
        return $this->render_limit_message($form_id, $block_check, $styles);
    }
    // Si no debe mantener contador, continuar con renderizado normal del formulario
}
```

**Nuevos Códigos**: 
- `FORM_BLOCKED_WITH_TIMER_EXPIRED` para timer expirado pero visible
- `return ''` para ocultar todo completamente cuando `block_form_timer_hide_all = true`

### 3️⃣ ACTUALIZACIÓN DE `render_limit_message()` ✅
**Archivo**: `class-sfq-frontend.php` líneas ~400-450
**Estado**: ✅ IMPLEMENTADO

```php
case 'FORM_BLOCKED_WITH_TIMER_EXPIRED':
    $icon = !empty($styles['block_form_icon']) ? $this->process_icon_content($styles['block_form_icon']) : '<svg>...</svg>';
    $title = !empty($styles['block_form_title']) ? $styles['block_form_title'] : __('Formulario temporalmente bloqueado', 'smart-forms-quiz');
    $custom_message = !empty($styles['block_form_description']) ? $styles['block_form_description'] : $message;
    $button_text = $styles['block_form_button_text'] ?? '';
    $button_url = $styles['block_form_button_url'] ?? '';
    $use_block_colors = true;
    break;
```

**Y en el renderizado del timer**:

```php
<?php if (($limit_type === 'FORM_BLOCKED_WITH_TIMER' || $limit_type === 'FORM_BLOCKED_WITH_TIMER_EXPIRED') && isset($limit_check['timer_date'])) : ?>
    <div class="sfq-timer-container">
        <div class="sfq-timer-text">
            <?php echo esc_html($limit_check['timer_text'] ?? __('El formulario se abrirá en:', 'smart-forms-quiz')); ?>
        </div>
        <div class="sfq-countdown-timer <?php echo $limit_type === 'FORM_BLOCKED_WITH_TIMER_EXPIRED' ? 'expired keep-visible' : ''; ?>" 
             data-target-date="<?php echo esc_attr($limit_check['timer_date']); ?>"
             data-form-id="<?php echo esc_attr($form_id); ?>"
             data-show-form="<?php echo esc_attr($styles['block_form_timer_show_form'] ? 'true' : 'false'); ?>">
            <div class="sfq-countdown-display">
                <!-- Unidades del contador con valores 00 para estado expirado -->
                <div class="sfq-countdown-unit">
                    <span class="sfq-countdown-number" id="days-<?php echo $form_id; ?>"><?php echo $limit_type === 'FORM_BLOCKED_WITH_TIMER_EXPIRED' ? '00' : '0'; ?></span>
                    <span class="sfq-countdown-label"><?php _e('días', 'smart-forms-quiz'); ?></span>
                </div>
                <!-- ... resto de unidades (horas, minutos, segundos) -->
            </div>
        </div>
    </div>
<?php endif; ?>
```

### 4️⃣ NUEVO TIPO DE BLOQUEO AGREGADO ✅

#### 🆕 BLOQUEO MANUAL CON TIMER - EXPIRADO PERO VISIBLE
**Archivo**: `class-sfq-frontend.php` líneas ~50-70
**Condición**: `$settings['block_form'] = true` Y hay timer Y `current_time >= timer_time` Y `block_form_timer_show_form = true`
**Comportamiento**: Mantiene contador visible en 00:00:00:00 con mensaje de tiempo agotado
**Código de error**: `FORM_BLOCKED_WITH_TIMER_EXPIRED`

```php
if ($current_timestamp >= $timer_timestamp) {
    if (isset($styles['block_form_timer_show_form']) && $styles['block_form_timer_show_form']) {
        // Renderizar contador en estado expirado (mantener solo timer visible)
        $block_check = array(
            'allowed' => false,
            'code' => 'FORM_BLOCKED_WITH_TIMER_EXPIRED',
            'timer_expired' => true,
            'keep_counter_visible' => true
            // ... configuraciones completas del timer
        );
        return $this->render_limit_message($form_id, $block_check, $styles);
    }
    // Si no debe mantener contador, continuar con renderizado normal
}
```

---

## 🎯 COMPORTAMIENTO ACTUAL COMPLETO (TODAS LAS OPCIONES)

### **Cuando `block_form_timer_show_form = false` (DESACTIVADO - "Mostrar formulario al expirar")**
- ✅ **Timer activo**: Muestra contador regresivo normal
- ✅ **Timer expirado**: Muestra mensaje de disponibilidad + botón acceso
- ✅ **Al recargar página**: Permite acceso normal al formulario

### **Cuando `block_form_timer_show_form = true` (ACTIVADO - "No mostrar formulario")**

#### **Sub-opción: `block_form_timer_hide_all = false` (DESACTIVADO - "Mantener contador visible")**
- ✅ **Timer activo**: Muestra contador regresivo normal
- ✅ **Timer expirado**: Mantiene contador visible en 00:00:00:00 con mensaje "¡El tiempo se agotó!"
- ✅ **Al recargar página**: Mantiene el contador visible en 00:00:00:00 (NO muestra formulario)

#### **Sub-opción: `block_form_timer_hide_all = true` (ACTIVADO - "Ocultar todo completamente") 🆕**
- ✅ **Timer activo**: Muestra contador regresivo normal
- ✅ **Timer expirado**: JavaScript oculta todo el contenedor con animación suave
- ✅ **Al recargar página**: PHP no renderiza nada (página completamente limpia)

### 🔧 DETALLES TÉCNICOS DE LA SOLUCIÓN COMPLETA

1. **Persistencia PHP Dual**: 
   - Lógica servidor para mantener estado sin JavaScript
   - Verificación de `block_form_timer_hide_all` para no renderizar nada

2. **Nuevos códigos de bloqueo**: 
   - `FORM_BLOCKED_WITH_TIMER_EXPIRED` para timer expirado pero visible
   - `return ''` para ocultar todo completamente

3. **Sistema de persistencia JavaScript mejorado**:
   - `sfq_timer_expired_{formId}` (5 minutos) para contador visible
   - `sfq_timer_expired_hide_all_{formId}` (24 horas) para ocultación completa

4. **Animaciones suaves**: Transición de opacity y height antes de ocultar completamente

5. **Renderizado completo**: Timer se muestra con todas sus configuraciones y estilos

6. **Estados visuales correctos**: Clases CSS aplicadas automáticamente según el estado

---

## 📚 FUNCIONES CLAVE Y SUS RESPONSABILIDADES

### 🔧 CLASE `SFQ_Frontend`

#### `render_form($form_id)`
**Responsabilidad**: Punto de entrada principal para renderizar formularios
**Ubicación**: líneas 25-150
**Lógica**:
1. Verificar bloqueo manual PRIMERO
2. Verificar timer si está configurado
3. Verificar límites automáticos
4. Renderizar formulario o mensaje de bloqueo
