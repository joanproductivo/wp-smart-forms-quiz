# 🔗 Implementación: Conexión de Pantallas Finales con Pantalla de Agradecimiento

## 📋 Análisis del Sistema Actual

### Conexión Existente `thank-you-message`

**Flujo actual:**
1. **Admin**: Campo `#thank-you-message` en `includes/class-sfq-admin.php`
2. **JavaScript**: Se guarda en `collectFormData()` como `thank_you_message`
3. **Base de Datos**: Se almacena en la tabla `sfq_forms.thank_you_message`
4. **Frontend**: Se renderiza en `includes/class-sfq-frontend.php` dentro de `.sfq-thank-you-message`

### Nueva Estructura de Pantallas Finales

**Estructura actual:**
- Sección: `sfq-final-screens-section`
- Pantalla por defecto: `sfq-default-final-screen` (data-screen-id="default")
- Campos disponibles:
  - `final-screen-icon-default`
  - `final-screen-video-default`
  - `final-screen-title-main-default`
  - `final-screen-title-sub-default`
  - `final-screen-message-default` ← **Este debe conectarse con la pantalla de agradecimiento**
  - `final-screen-button-text-default`
  - `final-screen-button-url-default`
  - `final-screen-logic-default`

---

## 🎯 Objetivo de la Implementación

**Migrar la funcionalidad** del campo `thank-you-message` a la nueva sección de pantallas finales, manteniendo compatibilidad hacia atrás y conectando los nuevos campos con la pantalla de agradecimiento real.

---

## 🔧 Pasos de Implementación

### 1. Modificar JavaScript - Sincronización Bidireccional

**Archivo**: `assets/js/admin-builder-v2.js`

#### 1.1 Actualizar `populateFormData()`

```javascript
// En la función populateFormData(), después de cargar thank_you_message:
$('#thank-you-message').val(formData.thank_you_message || '');

// NUEVO: Sincronizar con la pantalla final por defecto
$('#final-screen-message-default').val(formData.thank_you_message || '');

// Si existen datos de pantallas finales, cargarlos
if (formData.final_screens && Array.isArray(formData.final_screens)) {
    this.loadFinalScreensData(formData.final_screens);
}
```

#### 1.2 Crear función de sincronización

```javascript
// NUEVA FUNCIÓN: Sincronizar campos entre thank-you-message y pantalla final
syncThankYouFields() {
    const $thankYouMessage = $('#thank-you-message');
    const $finalScreenMessage = $('#final-screen-message-default');
    
    // Sincronización bidireccional
    $thankYouMessage.off('input.sync').on('input.sync', function() {
        $finalScreenMessage.val($(this).val());
        this.isDirty = true;
    }.bind(this));
    
    $finalScreenMessage.off('input.sync').on('input.sync', function() {
        $thankYouMessage.val($(this).val());
        this.isDirty = true;
    }.bind(this));
}
```

#### 1.3 Actualizar `collectFormData()`

```javascript
// En collectFormData(), mantener compatibilidad hacia atrás:
return {
    // ... otros campos ...
    thank_you_message: $('#thank-you-message').val(), // Mantener para compatibilidad
    final_screens: this.getFinalScreensData() // Nuevo sistema
};
```

#### 1.4 Mejorar `getFinalScreensData()`

```javascript
getFinalScreensData() {
    const finalScreens = [];
    
    $('.sfq-final-screen-item').each(function() {
        const $screen = $(this);
        const screenId = $screen.data('screen-id');
        
        const screenData = {
            id: screenId,
            icon: $screen.find('.sfq-final-screen-textarea').eq(0).val() || '',
            video_url: $screen.find('input[type="url"]').eq(0).val() || '',
            title_main: $screen.find('.sfq-final-screen-input').eq(0).val() || '',
            title_sub: $screen.find('.sfq-final-screen-input').eq(1).val() || '',
            message: $screen.find('.sfq-final-screen-textarea').eq(1).val() || '',
            button_text: $screen.find('.sfq-final-screen-input').eq(2).val() || '',
            button_url: $screen.find('input[type="url"]').eq(1).val() || '',
            logic: $screen.find('.sfq-final-screen-select').val() || 'always',
            is_default: screenId === 'default'
        };
        
        finalScreens.push(screenData);
    });
    
    console.log('SFQ: Collected final screens data:', finalScreens);
    return finalScreens;
}
```

#### 1.5 Inicializar sincronización

```javascript
// En la función init() o después de cargar datos:
initializeModules() {
    this.questionManager.init();
    this.conditionEngine.init();
    this.uiRenderer.init();
    
    // NUEVO: Inicializar sincronización de campos
    this.syncThankYouFields();
    
    if (typeof PreviewManager !== 'undefined') {
        this.previewManager = new PreviewManager(this);
    }
}
```

### 2. Modificar Backend PHP - Base de Datos

**Archivo**: `includes/class-sfq-database.php`

#### 2.1 Actualizar estructura de tabla

```php
// En create_tables() o en una migración:
public function add_final_screens_column() {
    global $wpdb;
    
    $table_name = $wpdb->prefix . 'sfq_forms';
    
    // Verificar si la columna ya existe
    $column_exists = $wpdb->get_results(
        $wpdb->prepare(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = 'final_screens'",
            DB_NAME,
            $table_name
        )
    );
    
    if (empty($column_exists)) {
        $wpdb->query(
            "ALTER TABLE {$table_name} 
             ADD COLUMN final_screens LONGTEXT NULL AFTER thank_you_message"
        );
    }
}
```

#### 2.2 Actualizar `save_form()`

```php
// En save_form(), después de procesar thank_you_message:
public function save_form($form_data) {
    global $wpdb;
    
    // ... código existente ...
    
    $data = array(
        // ... campos existentes ...
        'thank_you_message' => wp_kses_post($form_data['thank_you_message'] ?? ''),
        'final_screens' => json_encode($form_data['final_screens'] ?? []), // NUEVO
        // ... otros campos ...
    );
    
    // COMPATIBILIDAD: Si hay datos de pantallas finales, sincronizar con thank_you_message
    if (!empty($form_data['final_screens'])) {
        $defaultScreen = null;
        foreach ($form_data['final_screens'] as $screen) {
            if ($screen['is_default'] === true || $screen['id'] === 'default') {
                $defaultScreen = $screen;
                break;
            }
        }
        
        // Si encontramos la pantalla por defecto, usar su mensaje
        if ($defaultScreen && !empty($defaultScreen['message'])) {
            $data['thank_you_message'] = wp_kses_post($defaultScreen['message']);
        }
    }
    
    // ... resto del código de guardado ...
}
```

#### 2.3 Actualizar `get_form()`

```php
// En get_form(), después de obtener los datos:
public function get_form($form_id) {
    global $wpdb;
    
    $form = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}sfq_forms WHERE id = %d",
        $form_id
    ));
    
    if ($form) {
        // Decodificar JSON de pantallas finales
        if (!empty($form->final_screens)) {
            $form->final_screens = json_decode($form->final_screens, true);
        } else {
            // MIGRACIÓN: Si no hay pantallas finales pero sí thank_you_message, crear pantalla por defecto
            if (!empty($form->thank_you_message)) {
                $form->final_screens = [
                    [
                        'id' => 'default',
                        'icon' => '',
                        'video_url' => '',
                        'title_main' => '',
                        'title_sub' => '',
                        'message' => $form->thank_you_message,
                        'button_text' => '',
                        'button_url' => '',
                        'logic' => 'always',
                        'is_default' => true
                    ]
                ];
            }
        }
        
        // ... procesar otros campos ...
    }
    
    return $form;
}
```

### 3. Modificar Frontend PHP - Renderizado

**Archivo**: `includes/class-sfq-frontend.php`

#### 3.1 Actualizar renderizado de pantalla de agradecimiento

```php
// En render_form(), en la sección de pantalla de agradecimiento:
<!-- Pantalla de agradecimiento -->
<div class="sfq-screen sfq-thank-you-screen">
    <div class="sfq-thank-you-content">
        <?php
        // NUEVO: Obtener datos de la pantalla final por defecto
        $finalScreen = $this->getFinalScreenData($form, 'default');
        ?>
        
        <!-- Icono de éxito -->
        <div class="sfq-success-icon">
            <?php if (!empty($finalScreen['icon'])) : ?>
                <?php echo $this->renderFinalScreenIcon($finalScreen['icon']); ?>
            <?php else : ?>
                <!-- Icono por defecto -->
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                    <circle cx="40" cy="40" r="38" stroke="currentColor" stroke-width="4"/>
                    <path d="M25 40L35 50L55 30" stroke="currentColor" stroke-width="4" 
                          stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            <?php endif; ?>
        </div>
        
        <!-- Video (si existe) -->
        <?php if (!empty($finalScreen['video_url'])) : ?>
            <div class="sfq-thank-you-video">
                <?php echo $this->renderVideoEmbed($finalScreen['video_url']); ?>
            </div>
        <?php endif; ?>
        
        <!-- Títulos personalizados -->
        <?php if (!empty($finalScreen['title_main']) || !empty($finalScreen['title_sub'])) : ?>
            <?php if (!empty($finalScreen['title_main'])) : ?>
                <h2 class="sfq-thank-you-title-main"><?php echo wp_kses_post($finalScreen['title_main']); ?></h2>
            <?php endif; ?>
            <?php if (!empty($finalScreen['title_sub'])) : ?>
                <h3 class="sfq-thank-you-title-sub"><?php echo wp_kses_post($finalScreen['title_sub']); ?></h3>
            <?php endif; ?>
        <?php endif; ?>
        
        <!-- Mensaje personalizable -->
        <?php if (!empty($finalScreen['message'])) : ?>
            <div class="sfq-thank-you-message">
                <?php echo wp_kses_post($finalScreen['message']); ?>
            </div>
        <?php elseif (!empty($form->thank_you_message)) : ?>
            <!-- Fallback para compatibilidad -->
            <div class="sfq-thank-you-message">
                <?php echo wp_kses_post($form->thank_you_message); ?>
            </div>
        <?php else : ?>
            <h2><?php _e('¡Gracias por completar el formulario!', 'smart-forms-quiz'); ?></h2>
            <p><?php _e('Tu respuesta ha sido registrada correctamente.', 'smart-forms-quiz'); ?></p>
        <?php endif; ?>
        
        <!-- Botón personalizado -->
        <?php if (!empty($finalScreen['button_text']) && !empty($finalScreen['button_url'])) : ?>
            <div class="sfq-thank-you-button">
                <a href="<?php echo esc_url($finalScreen['button_url']); ?>" 
                   class="sfq-button sfq-button-primary" 
                   target="_blank" rel="noopener">
                    <?php echo esc_html($finalScreen['button_text']); ?>
                </a>
            </div>
        <?php endif; ?>
        
        <!-- Mensaje de redirección (mantener funcionalidad existente) -->
        <?php if (!empty($form->redirect_url)) : ?>
            <p class="sfq-redirect-message">
                <?php _e('Serás redirigido en unos segundos...', 'smart-forms-quiz'); ?>
            </p>
        <?php endif; ?>
    </div>
</div>
```

#### 3.2 Crear funciones auxiliares

```php
/**
 * Obtener datos de una pantalla final específica
 */
private function getFinalScreenData($form, $screenId = 'default') {
    if (empty($form->final_screens)) {
        // Fallback: crear pantalla por defecto desde thank_you_message
        return [
            'id' => 'default',
            'icon' => '',
            'video_url' => '',
            'title_main' => '',
            'title_sub' => '',
            'message' => $form->thank_you_message ?? '',
            'button_text' => '',
            'button_url' => '',
            'logic' => 'always',
            'is_default' => true
        ];
    }
    
    // Buscar la pantalla específica
    foreach ($form->final_screens as $screen) {
        if ($screen['id'] === $screenId || ($screenId === 'default' && $screen['is_default'])) {
            return $screen;
        }
    }
    
    // Si no se encuentra, devolver la primera o crear vacía
    return $form->final_screens[0] ?? [
        'id' => $screenId,
        'icon' => '',
        'video_url' => '',
        'title_main' => '',
        'title_sub' => '',
        'message' => '',
        'button_text' => '',
        'button_url' => '',
        'logic' => 'always',
        'is_default' => $screenId === 'default'
    ];
}

/**
 * Renderizar icono de pantalla final
 */
private function renderFinalScreenIcon($iconData) {
    if (empty($iconData)) {
        return '';
    }
    
    // Detectar si es una URL de imagen
    if (filter_var($iconData, FILTER_VALIDATE_URL)) {
        return '<img src="' . esc_url($iconData) . '" alt="Icon" class="sfq-final-screen-image-icon">';
    }
    
    // Detectar si es SVG
    if (strpos($iconData, '<svg') !== false) {
        return wp_kses($iconData, [
            'svg' => ['width' => [], 'height' => [], 'viewBox' => [], 'fill' => [], 'xmlns' => []],
            'path' => ['d' => [], 'fill' => [], 'stroke' => [], 'stroke-width' => [], 'stroke-linecap' => [], 'stroke-linejoin' => []],
            'circle' => ['cx' => [], 'cy' => [], 'r' => [], 'fill' => [], 'stroke' => [], 'stroke-width' => []],
            'rect' => ['x' => [], 'y' => [], 'width' => [], 'height' => [], 'fill' => [], 'stroke' => [], 'stroke-width' => []],
            'g' => ['fill' => [], 'stroke' => []],
        ]);
    }
    
    // Asumir que es emoji o texto
    return '<span class="sfq-final-screen-text-icon">' . esc_html($iconData) . '</span>';
}

/**
 * Renderizar embed de video
 */
private function renderVideoEmbed($videoUrl) {
    if (empty($videoUrl)) {
        return '';
    }
    
    // YouTube
    if (preg_match('/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/', $videoUrl, $matches)) {
        $videoId = $matches[1];
        return '<div class="sfq-video-embed sfq-youtube-embed">
                    <iframe src="https://www.youtube.com/embed/' . esc_attr($videoId) . '" 
                            frameborder="0" allowfullscreen></iframe>
                </div>';
    }
    
    // Vimeo
    if (preg_match('/vimeo\.com\/(\d+)/', $videoUrl, $matches)) {
        $videoId = $matches[1];
        return '<div class="sfq-video-embed sfq-vimeo-embed">
                    <iframe src="https://player.vimeo.com/video/' . esc_attr($videoId) . '" 
                            frameborder="0" allowfullscreen></iframe>
                </div>';
    }
    
    // Video directo (MP4, etc.)
    if (preg_match('/\.(mp4|webm|ogg)$/i', $videoUrl)) {
        return '<div class="sfq-video-embed sfq-direct-video">
                    <video controls>
                        <source src="' . esc_url($videoUrl) . '" type="video/mp4">
                        Tu navegador no soporta el elemento video.
                    </video>
                </div>';
    }
    
    return '';
}
```

### 4. Migración de Datos Existentes

**Archivo**: `includes/class-sfq-migration.php` (crear si no existe)

```php
<?php
/**
 * Migración de datos para pantallas finales
 */

class SFQ_Final_Screens_Migration {
    
    public function __construct() {
        add_action('admin_init', array($this, 'check_migration_needed'));
    }
    
    /**
     * Verificar si se necesita migración
     */
    public function check_migration_needed() {
        $migration_version = get_option('sfq_final_screens_migration_version', '0');
        
        if (version_compare($migration_version, '1.0', '<')) {
            $this->migrate_thank_you_messages();
            update_option('sfq_final_screens_migration_version', '1.0');
        }
    }
    
    /**
     * Migrar mensajes de agradecimiento existentes a pantallas finales
     */
    private function migrate_thank_you_messages() {
        global $wpdb;
        
        $forms = $wpdb->get_results(
            "SELECT id, thank_you_message FROM {$wpdb->prefix}sfq_forms 
             WHERE thank_you_message IS NOT NULL 
             AND thank_you_message != '' 
             AND (final_screens IS NULL OR final_screens = '')"
        );
        
        foreach ($forms as $form) {
            $finalScreens = [
                [
                    'id' => 'default',
                    'icon' => '',
                    'video_url' => '',
                    'title_main' => '',
                    'title_sub' => '',
                    'message' => $form->thank_you_message,
                    'button_text' => '',
                    'button_url' => '',
                    'logic' => 'always',
                    'is_default' => true
                ]
            ];
            
            $wpdb->update(
                $wpdb->prefix . 'sfq_forms',
                ['final_screens' => json_encode($finalScreens)],
                ['id' => $form->id],
                ['%s'],
                ['%d']
            );
        }
    }
}

// Inicializar migración
new SFQ_Final_Screens_Migration();
```

### 5. CSS Adicional para Nuevos Elementos

**Archivo**: `assets/css/frontend.css`

```css
/* Estilos para elementos de pantallas finales */
.sfq-thank-you-title-main {
    font-size: 28px;
    font-weight: 700;
    color: var(--sfq-text-color);
    margin: 0 0 10px 0;
    text-align: center;
}

.sfq-thank-you-title-sub {
    font-size: 18px;
    font-weight: 400;
    color: var(--sfq-secondary-color);
    margin: 0 0 20px 0;
    text-align: center;
}

.sfq-thank-you-video {
    margin: 20px 0;
    text-align: center;
}

.sfq-video-embed {
    position: relative;
    width: 100%;
    max-width: 560px;
    margin: 0 auto;
    aspect-ratio: 16/9;
    border-radius: var(--sfq-border-radius);
    overflow: hidden;
}

.sfq-video-embed iframe,
.sfq-video-embed video {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: none;
}

.sfq-final-screen-image-icon {
    max-width: 80px;
    max-height: 80px;
    object-fit: contain;
}

.sfq-final-screen-text-icon {
    font-size: 48px;
    line-height: 1;
}

.sfq-thank-you-button {
    margin-top: 20px;
    text-align: center;
}

.sfq-button {
    display: inline-block;
    padding: 12px 24px;
    border-radius: var(--sfq-border-radius);
    text-decoration: none;
    font-weight: 600;
    transition: all 0.3s ease;
    border: none;
    cursor: pointer;
}

.sfq-button-primary {
    background-color: var(--sfq-primary-color);
    color: white;
}

.sfq-button-primary:hover {
    background-color: var(--sfq-secondary-color);
    transform: translateY(-1px);
}

/* Responsive */
@media (max-width: 768px) {
    .sfq-thank-you-title-main {
        font-size: 24px;
    }
    
    .sfq-thank-you-title-sub {
        font-size: 16px;
    }
    
    .sfq-video-embed {
        max-width: 100%;
    }
    
    .sfq-final-screen-text-icon {
        font-size: 36px;
    }
}
```

---

## 🧪 Testing y Validación

### Casos de Prueba

1. **Compatibilidad hacia atrás**:
   - Formularios existentes con `thank_you_message` deben seguir funcionando
   - La migración debe crear automáticamente pantallas finales

2. **Sincronización bidireccional**:
   - Cambios en `thank-you-message` deben reflejarse en `final-screen-message-default`
   - Cambios en `final-screen-message-default` deben reflejarse en `thank-you-message`

3. **Renderizado frontend**:
   - Iconos (emoji, SVG, URL) deben renderizarse correctamente
   - Videos de YouTube/Vimeo deben embeberse correctamente
   - Títulos y botones personalizados deben aparecer

4. **Guardado de datos**:
   - Los datos de pantallas finales deben guardarse en `final_screens`
   - El campo `thank_you_message` debe mantenerse sincronizado

### Script de Testing

```javascript
// Console testing script
function testFinalScreensConnection() {
    console.log('=== Testing Final Screens Connection ===');
    
    // Test 1: Sincronización de campos
    const thankYouField = document.getElementById('thank-you-message');
    const finalScreenField = document.getElementById('final-screen-message-default');
    
    if (thankYouField && finalScreenField) {
        thankYouField.value = 'Test message from thank-you';
        thankYouField.dispatchEvent(new Event('input'));
        
        setTimeout(() => {
            if (finalScreenField.value === 'Test message from thank-you') {
                console.log('✅ Sync thank-you → final-screen: OK');
            } else {
                console.log('❌ Sync thank-you → final-screen: FAILED');
            }
            
            // Test reverse sync
            finalScreenField.value = 'Test message from final-screen';
            finalScreenField.dispatchEvent(new Event('input'));
            
            setTimeout(() => {
                if (thankYouField.value === 'Test message from final-screen') {
                    console.log('✅ Sync final-screen → thank-you: OK');
                } else {
                    console.log('❌ Sync final-screen → thank-you: FAILED');
                }
            }, 100);
        }, 100);
    }
    
    // Test 2: Data collection
    if (window.sfqFormBuilderV2 && window.sfqFormBuilderV2.getFinalScreensData) {
        const finalScreensData = window.sfqFormBuilderV2.getFinalScreensData();
        console.log('Final screens data:', finalScreensData);
        
        if (finalScreensData.length > 0 && finalScreensData[0].message) {
            console.log('✅ Data collection: OK');
        } else {
            console.log('❌ Data collection: FAILED');
        }
    }
}

// Ejecutar después de que se cargue el builder
setTimeout(testFinalScreensConnection, 2000);
```

---

## 📝 Checklist de Implementación

### JavaScript (admin-builder-v2.js)
- [ ] Actualizar `populateFormData()` para cargar datos de pantallas finales
- [ ] Crear función `syncThankYouFields()` para sincronización bidireccional
- [ ] Actualizar `collectFormData()` para incluir `final_screens`
- [ ] Mejorar `getFinalScreensData()` para recopilar todos los campos
- [ ] Inicializar sincronización en `initializeModules()`

### PHP Backend (class-sfq-database.php)
- [ ] Añadir columna `final_screens` a la tabla `sfq_forms`
- [ ] Actualizar `save_form()` para guardar datos de pantallas finales
- [ ] Actualizar `get_form()` para cargar y migrar datos
- [ ] Implementar lógica de compatibilidad hacia atrás

### PHP Frontend (class-sfq-frontend.php)
- [ ] Actualizar renderizado de pantalla de agradecimiento
- [ ] Crear función `getFinalScreenData()`
- [ ] Crear función `renderFinalScreenIcon()`
- [ ] Crear función `renderVideoEmbed()`
- [ ] Implementar fallbacks para compatibilidad

### Migración (class-sfq-migration.php)
- [ ] Crear clase de migración
- [ ] Implementar migración automática de `thank_you_message` existentes
- [ ] Verificar versión de migración

### CSS (frontend.css)
- [ ] Añadir estilos para títulos personalizados
- [ ] Añadir estilos para videos embebidos
- [ ] Añadir estilos para iconos personalizados
- [ ] Añadir estilos para botones personalizados
- [ ] Implementar responsive design

### Testing
- [ ] Probar compatibilidad hacia atrás
- [ ] Probar sincronización bidireccional
- [ ] Probar renderizado de todos los elementos
- [ ] Probar migración automática
- [ ] Probar guardado y carga de datos

---

## 🚀 Resultado Esperado

Después de la implementación:

1. **Compatibilidad**: Los formularios existentes seguirán funcionando sin cambios
2. **Migración**: Los mensajes de agradecimiento existentes se migrarán automáticamente a pantallas finales
3. **Sincronización**: Los campos `thank-you-message` y `final-screen-message-default` estarán sincronizados
4. **Funcionalidad**: La pantalla de agradecimiento mostrará todos los elementos personalizados (iconos, videos, títulos, botones)
5. **Flexibilidad**: Se podrán crear múltiples pantallas finales con lógica condicional

La implementación mantiene la funcionalidad existente mientras añade las nuevas capacidades de personalización avanzada.
