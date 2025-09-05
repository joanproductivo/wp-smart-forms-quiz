# Documentación de Webhooks - Smart Forms Quiz

## Introducción

Los webhooks permiten que Smart Forms Quiz envíe automáticamente los datos de los formularios completados a servicios externos como N8N, Zapier, Make.com, o cualquier endpoint HTTP personalizado. Esta funcionalidad es especialmente útil para automatizar flujos de trabajo y integrar los formularios con otros sistemas.

## Características Principales

- **Envío automático**: Los webhooks se disparan automáticamente cuando se completa un formulario
- **Configuración flexible**: Soporte para todos los formularios o formularios específicos
- **Seguridad**: Headers personalizados, timeouts configurables y validación de SSL
- **Reintentos automáticos**: Sistema de reintentos con backoff exponencial
- **Logs detallados**: Registro completo de todas las ejecuciones de webhooks
- **Pruebas integradas**: Función de prueba para validar la configuración

## Instalación y Configuración

### 1. Activación de la Funcionalidad

Los webhooks se activan automáticamente al instalar o actualizar el plugin. Las tablas necesarias se crean durante la activación:

- `wp_sfq_webhooks`: Configuración de webhooks
- `wp_sfq_webhook_logs`: Logs de ejecución

### 2. Acceso al Panel de Administración

1. Ve al menú de WordPress: **Smart Forms** → **Webhooks**
2. Aquí podrás gestionar todos tus webhooks

## Configuración de Webhooks

### Crear un Nuevo Webhook

1. Haz clic en **"Añadir Nuevo Webhook"**
2. Completa los campos requeridos:

#### Campos Obligatorios

- **Nombre**: Identificador descriptivo del webhook
- **URL**: Endpoint donde se enviarán los datos
- **Tipo**: 
  - `Todos los formularios`: Se ejecuta para cualquier formulario
  - `Formulario específico`: Solo para un formulario seleccionado

#### Campos Opcionales

- **Método HTTP**: GET, POST, PUT, PATCH (por defecto: POST)
- **Headers personalizados**: Headers adicionales en formato JSON
- **Estado**: Activar/desactivar el webhook

#### Ejemplo de Headers Personalizados

```json
{
  "Authorization": "Bearer tu-token-aqui",
  "Content-Type": "application/json",
  "X-Custom-Header": "valor-personalizado"
}
```

### 3. Guardar y Probar

1. Haz clic en **"Guardar Webhook"**
2. Usa el botón **"Probar"** para verificar que el endpoint responde correctamente

## Estructura del Payload

### Datos Enviados

Cuando se completa un formulario, se envía un payload JSON con la siguiente estructura:

```json
{
  "event": "form_submission",
  "timestamp": "2024-01-15T10:30:00Z",
  "form": {
    "id": 123,
    "title": "Formulario de Contacto",
    "type": "form"
  },
  "submission": {
    "id": 456,
    "user_id": 789,
    "user_ip": "192.168.1.1",
    "user_agent": "Mozilla/5.0...",
    "total_score": 85,
    "time_spent": 120,
    "completed_at": "2024-01-15T10:30:00Z",
    "variables": {
      "score_total": 85,
      "category_a": 30,
      "category_b": 55
    }
  },
  "responses": {
    "1": "Juan Pérez",
    "2": "juan@ejemplo.com",
    "3": ["Opción A", "Opción C"],
    "4": {
      "element_123": "clicked"
    }
  },
  "metadata": {
    "plugin_version": "1.0.0",
    "site_url": "https://mi-sitio.com",
    "webhook_id": 1
  }
}
```

### Descripción de Campos

#### Form
- `id`: ID único del formulario
- `title`: Título del formulario
- `type`: Tipo (form/quiz)

#### Submission
- `id`: ID único de la respuesta
- `user_id`: ID del usuario (null si es anónimo)
- `user_ip`: Dirección IP del usuario
- `user_agent`: User agent del navegador
- `total_score`: Puntuación total calculada
- `time_spent`: Tiempo empleado en segundos
- `completed_at`: Fecha y hora de completado (ISO 8601)
- `variables`: Variables calculadas del formulario

#### Responses
Objeto con las respuestas organizadas por ID de pregunta:
- Respuestas simples: string
- Respuestas múltiples: array
- Respuestas de elementos freestyle: objeto

## Integración con N8N

### 1. Configurar Webhook en N8N

1. Crea un nuevo workflow en N8N
2. Añade un nodo **"Webhook"**
3. Configura el método como **POST**
4. Copia la URL del webhook generada

### 2. Configurar en Smart Forms Quiz

1. Ve a **Smart Forms** → **Webhooks**
2. Crea un nuevo webhook con:
   - **URL**: La URL copiada de N8N
   - **Método**: POST
   - **Headers**: `{"Content-Type": "application/json"}`

### 3. Ejemplo de Workflow N8N

```json
{
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "httpMethod": "POST",
        "path": "smart-forms-webhook",
        "responseMode": "responseNode"
      }
    },
    {
      "name": "Procesar Datos",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "// Procesar datos del formulario\nconst formData = items[0].json;\nconst responses = formData.responses;\n\n// Extraer email y nombre\nconst email = responses['2'];\nconst nombre = responses['1'];\n\nreturn [{\n  json: {\n    email: email,\n    nombre: nombre,\n    puntuacion: formData.submission.total_score\n  }\n}];"
      }
    },
    {
      "name": "Enviar Email",
      "type": "n8n-nodes-base.emailSend",
      "parameters": {
        "toEmail": "={{$json.email}}",
        "subject": "Gracias por completar el formulario",
        "text": "Hola {{$json.nombre}}, tu puntuación fue: {{$json.puntuacion}}"
      }
    }
  ]
}
```

## Integración con Zapier

### 1. Crear Zap

1. Ve a Zapier y crea un nuevo Zap
2. Selecciona **"Webhooks by Zapier"** como trigger
3. Elige **"Catch Hook"**
4. Copia la URL del webhook

### 2. Configurar en Smart Forms Quiz

Similar a N8N, usa la URL proporcionada por Zapier.

### 3. Procesar Datos

Zapier automáticamente parseará el JSON y te permitirá usar los campos en acciones posteriores.

## Integración con Make.com (Integromat)

### 1. Crear Escenario

1. Crea un nuevo escenario en Make.com
2. Añade un módulo **"Webhooks"** → **"Custom webhook"**
3. Copia la URL generada

### 2. Estructura de Datos

Make.com detectará automáticamente la estructura cuando reciba el primer webhook.

## Seguridad y Mejores Prácticas

### 1. Validación de Origen

Para verificar que los webhooks provienen de tu sitio:

```php
// En tu endpoint receptor
$expected_signature = hash_hmac('sha256', $payload, 'tu-clave-secreta');
$received_signature = $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'] ?? '';

if (!hash_equals($expected_signature, $received_signature)) {
    http_response_code(401);
    exit('Unauthorized');
}
```

### 2. Headers de Seguridad

Configura headers personalizados para autenticación:

```json
{
  "Authorization": "Bearer tu-token-secreto",
  "X-API-Key": "tu-api-key",
  "X-Webhook-Source": "smart-forms-quiz"
}
```

### 3. Validación SSL

Los webhooks validan automáticamente los certificados SSL. Para desarrollo local, puedes usar URLs HTTP.

### 4. Timeouts

- Timeout de conexión: 10 segundos
- Timeout de respuesta: 30 segundos
- Reintentos: 3 intentos con backoff exponencial

## Monitoreo y Logs

### 1. Ver Logs

Los logs de webhooks se muestran en la página de administración y incluyen:

- Timestamp de ejecución
- Estado (éxito/error)
- Código de respuesta HTTP
- Tiempo de respuesta
- Mensaje de error (si aplica)

### 2. Estados de Webhook

- **Activo**: El webhook se ejecuta normalmente
- **Inactivo**: El webhook está deshabilitado
- **Error**: Fallos consecutivos (se desactiva automáticamente tras 5 fallos)

### 3. Limpieza de Logs

Los logs se mantienen por 30 días por defecto. Puedes configurar este período o limpiar logs manualmente.

## Solución de Problemas

### Webhook No Se Ejecuta

1. **Verificar estado**: Asegúrate de que el webhook esté activo
2. **Comprobar URL**: Verifica que la URL sea correcta y accesible
3. **Revisar logs**: Busca errores en los logs de webhook
4. **Probar manualmente**: Usa el botón "Probar" para verificar conectividad

### Errores Comunes

#### Error 404 - Not Found
- La URL del webhook no existe o es incorrecta
- El servicio de destino está caído

#### Error 401/403 - Unauthorized/Forbidden
- Headers de autenticación incorrectos o faltantes
- Token de API expirado o inválido

#### Error 500 - Internal Server Error
- Error en el código del endpoint receptor
- Problema con el formato de datos enviados

#### Timeout
- El endpoint tarda más de 30 segundos en responder
- Problemas de conectividad de red

### Debugging

Para debugging avanzado, puedes usar servicios como:

- **RequestBin**: https://requestbin.com/
- **Webhook.site**: https://webhook.site/
- **ngrok**: Para exponer endpoints locales

## Ejemplos de Uso

### 1. Notificación por Email

```javascript
// Endpoint Node.js/Express
app.post('/webhook/smart-forms', (req, res) => {
  const { form, submission, responses } = req.body;
  
  // Extraer email del formulario
  const email = responses['2']; // Asumiendo que la pregunta 2 es el email
  const nombre = responses['1']; // Asumiendo que la pregunta 1 es el nombre
  
  // Enviar email de confirmación
  sendEmail({
    to: email,
    subject: `Gracias por completar: ${form.title}`,
    body: `Hola ${nombre}, hemos recibido tu respuesta.`
  });
  
  res.status(200).json({ success: true });
});
```

### 2. Guardar en Base de Datos

```python
# Endpoint Python/Flask
@app.route('/webhook/smart-forms', methods=['POST'])
def handle_webhook():
    data = request.json
    
    # Guardar en base de datos
    submission = {
        'form_id': data['form']['id'],
        'form_title': data['form']['title'],
        'user_email': data['responses'].get('2'),
        'score': data['submission']['total_score'],
        'completed_at': data['submission']['completed_at']
    }
    
    db.submissions.insert_one(submission)
    
    return jsonify({'status': 'success'})
```

### 3. Integración con CRM

```php
// Endpoint PHP para CRM
<?php
$input = json_decode(file_get_contents('php://input'), true);

$responses = $input['responses'];
$submission = $input['submission'];

// Crear contacto en CRM
$contact_data = [
    'name' => $responses['1'],
    'email' => $responses['2'],
    'phone' => $responses['3'] ?? '',
    'score' => $submission['total_score'],
    'source' => 'Smart Forms Quiz'
];

// Enviar a CRM via API
$crm_response = sendToCRM($contact_data);

http_response_code(200);
echo json_encode(['success' => true, 'crm_id' => $crm_response['id']]);
?>
```

## API de Webhooks

### Endpoints Disponibles

#### GET /wp-json/sfq/v1/webhooks
Lista todos los webhooks (requiere autenticación de admin)

#### POST /wp-json/sfq/v1/webhooks
Crea un nuevo webhook (requiere autenticación de admin)

#### PUT /wp-json/sfq/v1/webhooks/{id}
Actualiza un webhook existente (requiere autenticación de admin)

#### DELETE /wp-json/sfq/v1/webhooks/{id}
Elimina un webhook (requiere autenticación de admin)

### Ejemplo de Uso de API

```javascript
// Crear webhook via API REST
fetch('/wp-json/sfq/v1/webhooks', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-WP-Nonce': wpApiSettings.nonce
  },
  body: JSON.stringify({
    name: 'Mi Webhook',
    url: 'https://mi-endpoint.com/webhook',
    type: 'all_forms',
    method: 'POST',
    active: true
  })
});
```

## Hooks y Filtros de WordPress

### Hooks de Acción

```php
// Antes de enviar webhook
do_action('sfq_before_webhook_send', $webhook_id, $payload);

// Después de enviar webhook
do_action('sfq_after_webhook_send', $webhook_id, $response, $payload);

// Cuando falla un webhook
do_action('sfq_webhook_failed', $webhook_id, $error, $payload);
```

### Filtros

```php
// Modificar payload antes de enviar
add_filter('sfq_webhook_payload', function($payload, $form_id, $submission_id) {
    // Añadir datos personalizados
    $payload['custom_data'] = get_custom_form_data($form_id);
    return $payload;
}, 10, 3);

// Modificar headers del webhook
add_filter('sfq_webhook_headers', function($headers, $webhook_id) {
    $headers['X-Custom-Header'] = 'valor-personalizado';
    return $headers;
}, 10, 2);

// Modificar timeout
add_filter('sfq_webhook_timeout', function($timeout) {
    return 60; // 60 segundos
});
```

## Migración y Backup

### Exportar Configuración

```php
// Exportar todos los webhooks
$webhooks = get_option('sfq_webhooks_export');
file_put_contents('webhooks-backup.json', json_encode($webhooks));
```

### Importar Configuración

```php
// Importar webhooks desde backup
$webhooks = json_decode(file_get_contents('webhooks-backup.json'), true);
update_option('sfq_webhooks_import', $webhooks);
```

## Rendimiento y Escalabilidad

### 1. Ejecución Asíncrona

Los webhooks se ejecutan de forma asíncrona usando WordPress Cron para no afectar la experiencia del usuario.

### 2. Límites de Rate

- Máximo 10 webhooks por formulario
- Máximo 100 ejecuciones por minuto por webhook
- Timeout automático tras 5 fallos consecutivos

### 3. Optimizaciones

- Los logs se limpian automáticamente
- Caché de configuración de webhooks
- Compresión gzip en payloads grandes

## Soporte y Recursos

### Documentación Adicional

- [API REST de WordPress](https://developer.wordpress.org/rest-api/)
- [Documentación de N8N](https://docs.n8n.io/)
- [Documentación de Zapier](https://zapier.com/developer)

### Comunidad

- GitHub Issues para reportar bugs
- Foro de WordPress para soporte general
- Documentación en línea actualizada

---

**Versión**: 1.0.0  
**Última actualización**: Enero 2024  
**Compatibilidad**: WordPress 5.0+, PHP 7.4+
