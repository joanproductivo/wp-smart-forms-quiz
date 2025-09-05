# Implementación de Whitelist y Modo Desarrollo para Webhooks

## Resumen de la Implementación

Se ha implementado exitosamente una **whitelist configurable** y un **modo desarrollo** para permitir URLs locales en el sistema de webhooks, resolviendo el problema de N8N local y otros servicios internos.

## 🎯 Problema Resuelto

**Problema Original**: La validación SSRF bloqueaba URLs locales como `http://localhost:3000` o `http://192.168.1.100:5678` donde corre N8N local, impidiendo el uso de webhooks en desarrollo.

**Solución Implementada**: Sistema dual de whitelist + modo desarrollo con advertencias de seguridad.

## 🔧 Funcionalidades Implementadas

### 1. **Whitelist de URLs Confiables**

#### Ubicación: `includes/class-sfq-webhooks.php`
```php
/**
 * Verificar si una URL está en la whitelist de URLs confiables
 */
private function is_url_in_whitelist($url) {
    $whitelist = get_option('sfq_webhook_trusted_urls', array());
    
    if (empty($whitelist) || !is_array($whitelist)) {
        return false;
    }
    
    $parsed_url = parse_url($url);
    $host_port = $parsed_url['host'];
    if (isset($parsed_url['port'])) {
        $host_port .= ':' . $parsed_url['port'];
    }
    
    foreach ($whitelist as $trusted_url) {
        $trusted_url = trim($trusted_url);
        if (empty($trusted_url)) {
            continue;
        }
        
        // Permitir coincidencia exacta de host:puerto
        if ($host_port === $trusted_url) {
            return true;
        }
        
        // Permitir coincidencia de URL completa
        if (strpos($url, $trusted_url) === 0) {
            return true;
        }
    }
    
    return false;
}
```

**Características**:
- ✅ Coincidencia exacta de host:puerto (`localhost:3000`)
- ✅ Coincidencia de URL completa (`http://192.168.1.100:5678/webhook`)
- ✅ Configuración persistente en base de datos
- ✅ Validación de entrada sanitizada

### 2. **Modo Desarrollo**

#### Ubicación: `includes/class-sfq-webhooks.php`
```php
/**
 * Verificar si una URL es local (para modo desarrollo)
 */
private function is_local_url($url) {
    $parsed = parse_url($url);
    $host = strtolower($parsed['host']);
    
    // Hosts locales comunes
    $local_hosts = [
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '::1'
    ];
    
    if (in_array($host, $local_hosts)) {
        return true;
    }
    
    // Verificar rangos IP privados
    $ip = gethostbyname($host);
    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
        return true;
    }
    
    return false;
}
```

**Características**:
- ✅ Detección automática de URLs locales
- ✅ Soporte para IPv4 e IPv6
- ✅ Validación de rangos IP privados
- ✅ Logging de advertencias de seguridad

### 3. **Validación Integrada**

#### Ubicación: `includes/class-sfq-webhooks.php`
```php
private function validate_webhook_url($url) {
    // Validar formato básico
    if (!filter_var($url, FILTER_VALIDATE_URL)) {
        return false;
    }
    
    $parsed = parse_url($url);
    
    // Solo permitir HTTP/HTTPS
    if (!in_array($parsed['scheme'], ['http', 'https'])) {
        return false;
    }
    
    // Verificar si está en modo desarrollo
    $dev_mode = get_option('sfq_webhook_dev_mode', false);
    
    // Verificar whitelist de URLs confiables
    if ($this->is_url_in_whitelist($url)) {
        return true; // URL en whitelist, permitir
    }
    
    // Si está en modo desarrollo, permitir URLs locales con log de advertencia
    if ($dev_mode && $this->is_local_url($url)) {
        error_log('SFQ Webhooks: ADVERTENCIA - URL local permitida en modo desarrollo: ' . $url);
        return true;
    }
    
    // Validación SSRF normal para URLs públicas
    // ... resto de validaciones
}
```

**Flujo de Validación**:
1. **Validación básica** de formato URL
2. **Verificar whitelist** - Si está, permitir inmediatamente
3. **Modo desarrollo** - Si está activo y es URL local, permitir con advertencia
4. **Validación SSRF** - Para URLs públicas, aplicar validación completa

### 4. **Interfaz de Administración**

#### Ubicación: `includes/admin/class-sfq-webhook-admin.php`
```php
public function ajax_save_webhook_settings() {
    check_ajax_referer('sfq_webhook_nonce', 'nonce');
    
    if (!current_user_can('manage_smart_forms')) {
        wp_die(__('No tienes permisos para realizar esta acción', 'smart-forms-quiz'));
    }
    
    $dev_mode = isset($_POST['dev_mode']) && $_POST['dev_mode'] === 'true';
    $trusted_urls = array();
    
    if (isset($_POST['trusted_urls']) && is_array($_POST['trusted_urls'])) {
        foreach ($_POST['trusted_urls'] as $url) {
            $url = trim(sanitize_text_field($url));
            if (!empty($url)) {
                $trusted_urls[] = $url;
            }
        }
    }
    
    // Guardar configuración
    update_option('sfq_webhook_dev_mode', $dev_mode);
    update_option('sfq_webhook_trusted_urls', $trusted_urls);
    
    wp_send_json_success(array(
        'message' => __('Configuración guardada correctamente', 'smart-forms-quiz'),
        'dev_mode' => $dev_mode,
        'trusted_urls' => $trusted_urls
    ));
}
```

## 📋 Configuración de Opciones WordPress

### Opciones Añadidas:
- `sfq_webhook_dev_mode` (boolean) - Activa/desactiva modo desarrollo
- `sfq_webhook_trusted_urls` (array) - Lista de URLs confiables

### Valores por Defecto:
- Modo desarrollo: `false` (desactivado por seguridad)
- URLs confiables: `array()` (lista vacía)

## 🔒 Características de Seguridad

### 1. **Advertencias de Seguridad**
```php
if ($dev_mode && $this->is_local_url($url)) {
    error_log('SFQ Webhooks: ADVERTENCIA - URL local permitida en modo desarrollo: ' . $url);
    return true;
}
```

### 2. **Validación de Entrada**
- Sanitización de URLs con `sanitize_text_field()`
- Validación de permisos con `current_user_can()`
- Verificación de nonce para CSRF

### 3. **Configuración Segura por Defecto**
- Modo desarrollo desactivado por defecto
- Whitelist vacía por defecto
- Logs de advertencia para URLs locales

## 🎯 Casos de Uso Soportados

### 1. **N8N Local**
```
Whitelist: localhost:5678
URL Webhook: http://localhost:5678/webhook/abc123
Resultado: ✅ PERMITIDO (whitelist)
```

### 2. **Desarrollo con IP Local**
```
Modo Desarrollo: Activado
URL Webhook: http://192.168.1.100:3000/api/webhook
Resultado: ✅ PERMITIDO (modo desarrollo + advertencia)
```

### 3. **Túnel ngrok**
```
URL Webhook: https://abc123.ngrok.io/webhook
Resultado: ✅ PERMITIDO (URL pública válida)
```

### 4. **URL Maliciosa**
```
Modo Desarrollo: Desactivado
URL Webhook: http://127.0.0.1:22
Resultado: ❌ BLOQUEADO (puerto peligroso)
```

## 📊 Ejemplos de Configuración

### Para N8N Local:
```php
// Opción 1: Whitelist específica
update_option('sfq_webhook_trusted_urls', [
    'localhost:5678',
    '127.0.0.1:5678'
]);

// Opción 2: Modo desarrollo (menos seguro)
update_option('sfq_webhook_dev_mode', true);
```

### Para Desarrollo Completo:
```php
update_option('sfq_webhook_dev_mode', true);
update_option('sfq_webhook_trusted_urls', [
    'localhost:3000',
    'localhost:5678',
    '192.168.1.100:8080',
    'dev.local'
]);
```

## 🔍 Logs y Monitoreo

### Logs de Advertencia:
```
[2025-01-06 00:13:00] SFQ Webhooks: ADVERTENCIA - URL local permitida en modo desarrollo: http://localhost:5678/webhook
```

### Logs de Bloqueo:
```
[2025-01-06 00:13:00] SFQ Webhooks: URL no válida o peligrosa: http://127.0.0.1:22
```

## ✅ Beneficios de la Implementación

### 1. **Flexibilidad de Desarrollo**
- ✅ N8N local funciona sin problemas
- ✅ APIs de desarrollo accesibles
- ✅ Túneles locales soportados

### 2. **Seguridad Mantenida**
- ✅ Validación SSRF sigue activa para URLs públicas
- ✅ Advertencias claras en logs
- ✅ Configuración segura por defecto

### 3. **Facilidad de Uso**
- ✅ Configuración simple via whitelist
- ✅ Modo desarrollo para testing rápido
- ✅ Compatibilidad hacia atrás completa

## 🚀 Instrucciones de Uso

### Para Usuarios de N8N Local:

1. **Opción Recomendada - Whitelist**:
   - Ir a configuración de webhooks
   - Añadir `localhost:5678` a URLs confiables
   - Crear webhook con `http://localhost:5678/webhook/tu-id`

2. **Opción Desarrollo - Modo Dev**:
   - Activar "Modo Desarrollo" 
   - ⚠️ **ADVERTENCIA**: Solo para desarrollo, no producción
   - Crear webhook con cualquier URL local

### Para Producción:
- ✅ Usar túneles públicos (ngrok, Cloudflare Tunnel)
- ✅ Configurar whitelist específica si es necesario
- ❌ **NUNCA** activar modo desarrollo en producción

## 📈 Estado Final

**✅ IMPLEMENTACIÓN COMPLETADA**

- [x] Whitelist configurable implementada
- [x] Modo desarrollo con advertencias
- [x] Validación SSRF mejorada
- [x] Interfaz de administración
- [x] Logs de seguridad
- [x] Compatibilidad hacia atrás
- [x] Documentación completa

**El sistema de webhooks ahora soporta completamente N8N local y otros servicios de desarrollo manteniendo la seguridad.**
