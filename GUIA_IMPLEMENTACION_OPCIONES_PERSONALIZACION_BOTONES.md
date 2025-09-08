# Guía: Implementación de Opciones de Personalización de Botones

Esta guía documenta el proceso completo para añadir nuevas opciones de personalización a los botones del sistema Smart Forms & Quiz, basada en la implementación exitosa de las opciones de gradiente animado.

## 📋 Índice

1. [Arquitectura del Sistema](#arquitectura-del-sistema)
2. [Paso 1: Añadir la Interfaz de Usuario](#paso-1-añadir-la-interfaz-de-usuario)
3. [Paso 2: Procesar los Eventos de Configuración](#paso-2-procesar-los-eventos-de-configuración)
4. [Paso 3: Guardar las Configuraciones](#paso-3-guardar-las-configuraciones)
5. [Paso 4: Aplicar Estilos en el Frontend](#paso-4-aplicar-estilos-en-el-frontend)
6. [Paso 5: Renderizar en el Backend](#paso-5-renderizar-en-el-backend)
7. [Paso 6: Estilos CSS](#paso-6-estilos-css)
8. [Ejemplo Completo](#ejemplo-completo)
9. [Mejores Prácticas](#mejores-prácticas)

## 🏗️ Arquitectura del Sistema

### Flujo de Datos
```
UI (Admin) → EventManager → StateManager → Database → Frontend Rendering
```

### Archivos Involucrados
- **UI**: `assets/js/admin-builder-v2/components/UIRenderer.js`
- **Eventos**: `assets/js/admin-builder-v2/managers/EventManager.js`
- **Frontend**: `assets/js/frontend.js`
- **Backend**: `includes/class-sfq-frontend.php`

---

## Paso 1: Añadir la Interfaz de Usuario

### Ubicación
`assets/js/admin-builder-v2/components/UIRenderer.js` → función `renderButtonCustomizationOptions()`

### Estructura HTML
```html
<div class="sfq-config-group">
    <h6>🎨 Título de la Sección</h6>
    
    <div class="sfq-config-row">
        <label class="sfq-config-label">
            <input type="checkbox" class="sfq-config-input" data-setting="nueva_opcion_enabled" 
                   ${this.isChecked(buttonSettings.nueva_opcion_enabled) ? 'checked' : ''}>
            ✨ Activar nueva funcionalidad
        </label>
    </div>
    
    <!-- Panel avanzado (se muestra/oculta según checkbox) -->
    <div class="sfq-nueva-opcion-panel" style="display: ${this.isChecked(buttonSettings.nueva_opcion_enabled) ? 'block' : 'none'};">
        
        <!-- Controles específicos -->
        <div class="sfq-config-row">
            <label class="sfq-config-label">
                Color principal:
                <input type="color" class="sfq-config-input" data-setting="nueva_opcion_color" 
                       value="${buttonSettings.nueva_opcion_color || '#007cba'}">
            </label>
        </div>
        
        <!-- Control deslizante -->
        <div class="sfq-config-row">
            <label class="sfq-config-label">
                Intensidad:
                <input type="range" class="sfq-config-input" data-setting="nueva_opcion_intensidad" 
                       min="1" max="10" step="1" 
                       value="${buttonSettings.nueva_opcion_intensidad || '5'}">
                <span class="sfq-intensidad-display">${buttonSettings.nueva_opcion_intensidad || '5'}</span>
            </label>
        </div>
        
        <!-- Vista previa -->
        <div class="sfq-nueva-opcion-preview">
            <div class="sfq-preview-element" style="/* estilos dinámicos */">
                Vista previa
            </div>
        </div>
    </div>
</div>
```

### Puntos Clave
- **Usar `data-setting`**: Cada input debe tener el atributo `data-setting` con el nombre de la configuración
- **Función `isChecked()`**: Para checkboxes, usar esta función helper
- **Valores por defecto**: Siempre proporcionar valores por defecto con `||`
- **Paneles condicionales**: Mostrar/ocultar según el estado del checkbox principal

---

## Paso 2: Procesar los Eventos de Configuración

### Ubicación
`assets/js/admin-builder-v2/managers/EventManager.js` → función `setupButtonCustomizationEvents()`

### Código de Ejemplo
```javascript
// Evento para checkbox principal
$(document).on('change', '.sfq-config-input[data-setting="nueva_opcion_enabled"]', function() {
    const isEnabled = $(this).is(':checked');
    const $panel = $(this).closest('.sfq-button-customization-content').find('.sfq-nueva-opcion-panel');
    
    // Mostrar/ocultar panel
    if (isEnabled) {
        $panel.slideDown(200);
    } else {
        $panel.slideUp(200);
    }
    
    // Actualizar configuración
    this.updateButtonStyleSetting($(this), 'nueva_opcion_enabled', isEnabled);
});

// Evento para controles de color
$(document).on('change', '.sfq-config-input[data-setting^="nueva_opcion_color"]', function() {
    const setting = $(this).data('setting');
    const value = $(this).val();
    
    this.updateButtonStyleSetting($(this), setting, value);
    this.updateNuevaOpcionPreview($(this));
});

// Evento para controles deslizantes
$(document).on('input', '.sfq-config-input[data-setting="nueva_opcion_intensidad"]', function() {
    const value = $(this).val();
    const $display = $(this).siblings('.sfq-intensidad-display');
    
    // Actualizar display
    $display.text(value);
    
    // Actualizar configuración
    this.updateButtonStyleSetting($(this), 'nueva_opcion_intensidad', value);
    this.updateNuevaOpcionPreview($(this));
});
```

### Función Helper para Actualizar Vista Previa
```javascript
updateNuevaOpcionPreview($element) {
    const $container = $element.closest('.sfq-button-customization-content');
    const $preview = $container.find('.sfq-nueva-opcion-preview .sfq-preview-element');
    
    // Obtener configuraciones actuales
    const settings = this.getCurrentButtonSettings($container);
    
    // Aplicar estilos dinámicos
    const color = settings.nueva_opcion_color || '#007cba';
    const intensidad = settings.nueva_opcion_intensidad || '5';
    
    $preview.css({
        'background-color': color,
        'opacity': intensidad / 10,
        // ... más estilos según la funcionalidad
    });
}
```

---

## Paso 3: Guardar las Configuraciones

### El Sistema Automático
El sistema ya maneja automáticamente el guardado a través de:
- `updateButtonStyleSetting()` → actualiza el estado local
- `saveQuestion()` → guarda en la base de datos

### Verificar Guardado
Las configuraciones se almacenan en:
```json
{
  "settings": {
    "next_button_style": {
      "nueva_opcion_enabled": true,
      "nueva_opcion_color": "#ff6b6b",
      "nueva_opcion_intensidad": "7"
    }
  }
}
```

---

## Paso 4: Aplicar Estilos en el Frontend

### Ubicación
`assets/js/frontend.js` → función `applyCustomButtonStyles()`

### Código de Ejemplo
```javascript
applyCustomButtonStyles() {
    const customButtons = document.querySelectorAll('.sfq-next-button[data-custom-style="true"]');
    
    customButtons.forEach(button => {
        try {
            const styleConfig = JSON.parse(button.dataset.styleConfig || '{}');
            
            // Verificar si la nueva opción está habilitada
            if (styleConfig.nueva_opcion_enabled) {
                this.applyNuevaOpcionStyles(button, styleConfig);
            }
            
        } catch (error) {
            console.error('SFQ: Error applying nueva opción styles:', error);
        }
    });
}

applyNuevaOpcionStyles(button, config) {
    const color = config.nueva_opcion_color || '#007cba';
    const intensidad = parseInt(config.nueva_opcion_intensidad || '5');
    
    // Crear estilos únicos
    const uniqueId = 'sfq-nueva-opcion-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    button.classList.add(uniqueId);
    
    // Generar CSS dinámico
    const css = `
        .${uniqueId} {
            background-color: ${color} !important;
            opacity: ${intensidad / 10} !important;
            /* ... más estilos */
        }
        
        .${uniqueId}:hover {
            opacity: ${Math.min(1, (intensidad + 2) / 10)} !important;
        }
    `;
    
    // Inyectar CSS
    this.injectCSS(css, uniqueId);
}
```

### Función Helper para Inyectar CSS
```javascript
injectCSS(css, id) {
    // Remover CSS anterior si existe
    const existingStyle = document.getElementById(id);
    if (existingStyle) {
        existingStyle.remove();
    }
    
    // Crear nuevo elemento style
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
}
```

---

## Paso 5: Renderizar en el Backend

### Ubicación
`includes/class-sfq-frontend.php` → función `generate_button_styles()`

### Código de Ejemplo
```php
private function generate_button_styles($style_config) {
    $styles = array();
    
    // ... estilos existentes ...
    
    // ✅ NUEVO: Aplicar nueva opción
    $nueva_opcion_enabled = false;
    if (isset($style_config['nueva_opcion_enabled'])) {
        $nueva_opcion_enabled = ($style_config['nueva_opcion_enabled'] === true || 
                               $style_config['nueva_opcion_enabled'] === 'true' || 
                               $style_config['nueva_opcion_enabled'] === '1' || 
                               $style_config['nueva_opcion_enabled'] === 1);
    }
    
    if ($nueva_opcion_enabled) {
        $color = $style_config['nueva_opcion_color'] ?? '#007cba';
        $intensidad = intval($style_config['nueva_opcion_intensidad'] ?? '5');
        
        $styles['background-color'] = $color . ' !important';
        $styles['opacity'] = ($intensidad / 10) . ' !important';
        
        // Efectos adicionales según la funcionalidad
        if (!empty($style_config['nueva_opcion_efecto_especial'])) {
            $styles['transform'] = 'scale(1.05) !important';
            $styles['transition'] = 'all 0.3s ease !important';
        }
    }
    
    // ... resto del código ...
    
    return trim($style_string);
}
```

### Incluir Datos en el HTML
```php
// En la función de renderizado de botones
$button_data_attrs = 'data-custom-style="true" data-style-config=\'' . json_encode($style_config) . '\'';

// En el HTML del botón
<button class="<?php echo esc_attr($button_classes); ?>" 
        <?php echo !empty($button_styles) ? 'style="' . esc_attr($button_styles) . '"' : ''; ?>
        <?php echo $button_data_attrs; ?>>
    <?php echo esc_html($button_text); ?>
</button>
```

---

## Paso 6: Estilos CSS

### Ubicación
`assets/js/admin-builder-v2/components/UIRenderer.js` → función `initNuevaOpcionStyles()`

### CSS para el Admin
```javascript
initNuevaOpcionStyles() {
    if (document.getElementById('sfq-nueva-opcion-admin-styles')) {
        return;
    }

    const styleElement = document.createElement('style');
    styleElement.id = 'sfq-nueva-opcion-admin-styles';
    styleElement.textContent = `
        /* Estilos para el panel de administración */
        .sfq-nueva-opcion-panel {
            transition: all 0.3s ease;
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 15px;
        }
        
        .sfq-nueva-opcion-preview {
            margin-top: 15px;
            text-align: center;
        }
        
        .sfq-preview-element {
            display: inline-block;
            padding: 12px 24px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            transition: all 0.3s ease;
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .sfq-nueva-opcion-panel {
                padding: 10px;
            }
        }
    `;

    document.head.appendChild(styleElement);
}
```

### CSS para el Frontend
```css
/* En assets/css/frontend.css o inyectado dinámicamente */
.sfq-nueva-opcion-effect {
    position: relative;
    overflow: hidden;
}

.sfq-nueva-opcion-effect::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
    transition: left 0.5s ease;
}

.sfq-nueva-opcion-effect:hover::before {
    left: 100%;
}
```

---

## Ejemplo Completo

### Implementación de "Efecto Brillo"

#### 1. UI (UIRenderer.js)
```html
<div class="sfq-config-row">
    <label class="sfq-config-label">
        <input type="checkbox" class="sfq-config-input" data-setting="shine_effect_enabled" 
               ${this.isChecked(buttonSettings.shine_effect_enabled) ? 'checked' : ''}>
        ✨ Activar efecto brillo
    </label>
</div>

<div class="sfq-shine-effect-panel" style="display: ${this.isChecked(buttonSettings.shine_effect_enabled) ? 'block' : 'none'};">
    <div class="sfq-config-row">
        <label class="sfq-config-label">
            Velocidad del brillo:
            <input type="range" class="sfq-config-input" data-setting="shine_speed" 
                   min="1" max="5" step="1" 
                   value="${buttonSettings.shine_speed || '3'}">
            <span class="sfq-shine-speed-display">${buttonSettings.shine_speed || '3'}s</span>
        </label>
    </div>
</div>
```

#### 2. Eventos (EventManager.js)
```javascript
$(document).on('change', '.sfq-config-input[data-setting="shine_effect_enabled"]', function() {
    const isEnabled = $(this).is(':checked');
    const $panel = $(this).closest('.sfq-button-customization-content').find('.sfq-shine-effect-panel');
    
    if (isEnabled) {
        $panel.slideDown(200);
    } else {
        $panel.slideUp(200);
    }
    
    this.updateButtonStyleSetting($(this), 'shine_effect_enabled', isEnabled);
});
```

#### 3. Frontend (frontend.js)
```javascript
applyShineEffect(button, config) {
    const speed = parseInt(config.shine_speed || '3');
    const uniqueId = 'sfq-shine-' + Date.now();
    
    button.classList.add(uniqueId);
    
    const css = `
        .${uniqueId} {
            position: relative;
            overflow: hidden;
        }
        
        .${uniqueId}::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
            animation: shine-effect ${speed}s ease-in-out infinite;
        }
        
        @keyframes shine-effect {
            0% { left: -100%; }
            50% { left: 100%; }
            100% { left: 100%; }
        }
    `;
    
    this.injectCSS(css, uniqueId);
}
```

#### 4. Backend (class-sfq-frontend.php)
```php
// En generate_button_styles()
$shine_enabled = ($style_config['shine_effect_enabled'] === true || 
                 $style_config['shine_effect_enabled'] === 'true');

if ($shine_enabled) {
    $styles['position'] = 'relative !important';
    $styles['overflow'] = 'hidden !important';
}
```

---

## 🎯 Mejores Prácticas

### 1. **Nomenclatura Consistente**
- Usar prefijos descriptivos: `gradient_`, `shine_`, `shadow_`
- Mantener coherencia en los nombres de configuraciones
- Usar snake_case para configuraciones internas

### 2. **Valores por Defecto y Manejo de Opacidad**
- Siempre proporcionar valores por defecto sensatos
- **⚠️ CRÍTICO**: Para valores de opacidad que pueden ser 0, NO usar el operador `||`
- Usar verificación explícita para permitir valores 0:
```javascript
// ❌ INCORRECTO - No permite opacidad 0
const opacity = config.opacity || 1;

// ✅ CORRECTO - Permite opacidad 0
const opacity = config.opacity !== undefined && 
                config.opacity !== null && 
                config.opacity !== '' 
    ? parseFloat(config.opacity) 
    : 1;
```
- Usar el operador `??` en PHP para valores que pueden ser 0
- Documentar los rangos válidos para cada configuración

### 3. **Validación de Datos**
```javascript
// Validar rangos numéricos
const intensidad = Math.max(1, Math.min(10, parseInt(value) || 5));

// Validar colores hexadecimales
const isValidHex = /^#[0-9A-F]{6}$/i.test(color);
```

### 4. **Sobrescribir Estilos del Tema**
- **⚠️ CRÍTICO**: Usar `setProperty()` con `!important` para sobrescribir CSS del tema:
```javascript
// ❌ INCORRECTO - Los temas pueden sobrescribir
button.style.backgroundColor = color;

// ✅ CORRECTO - Garantiza prioridad
button.style.setProperty('background-color', color, 'important');
```
- Aplicar `!important` a todas las propiedades críticas
- Usar `setProperty()` para mayor control sobre la especificidad

### 5. **Optimización de Rendimiento**
- Usar `requestAnimationFrame` para animaciones complejas
- Implementar debouncing para eventos de input frecuentes
- Reutilizar estilos CSS cuando sea posible

### 6. **Compatibilidad**
- Probar en diferentes navegadores
- Usar prefijos CSS cuando sea necesario
- Implementar fallbacks para funcionalidades avanzadas

### 6. **Debugging**
```javascript
// Añadir logs informativos
console.log('SFQ: Applying nueva opción styles:', config);

// Manejar errores graciosamente
try {
    this.applyNuevaOpcionStyles(button, config);
} catch (error) {
    console.error('SFQ: Error in nueva opción:', error);
}
```

### 7. **Documentación**
- Comentar código complejo
- Documentar parámetros y valores esperados
- Mantener esta guía actualizada con nuevas implementaciones

---

## 🔧 Herramientas de Desarrollo

### Inspección de Configuraciones
```javascript
// En la consola del navegador
console.log('Button configs:', 
    Array.from(document.querySelectorAll('[data-style-config]'))
         .map(btn => JSON.parse(btn.dataset.styleConfig))
);
```

### Testing de Estilos
```javascript
// Función helper para probar estilos
function testButtonStyle(selector, config) {
    const button = document.querySelector(selector);
    if (button) {
        button.dataset.styleConfig = JSON.stringify(config);
        // Reaplica estilos
        window.SFQFrontend.applyCustomButtonStyles();
    }
}
```

---

Esta guía proporciona un framework completo para implementar nuevas opciones de personalización de botones. Siguiendo estos pasos y mejores prácticas, se pueden añadir funcionalidades avanzadas de manera consistente y mantenible.
