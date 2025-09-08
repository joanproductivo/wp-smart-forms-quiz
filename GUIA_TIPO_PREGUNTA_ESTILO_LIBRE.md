# Guía para el Tipo de Pregunta "Estilo Libre"
## Smart Forms & Quiz Plugin - WordPress

### Versión: 1.0
### Fecha: Agosto 2025

---

## 📋 Índice

1. [Introducción](#introducción)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Implementación Actual](#implementación-actual)
4. [Elementos Disponibles](#elementos-disponibles)
5. [Estructura de Datos](#estructura-de-datos)
6. [Flujo de Desarrollo](#flujo-de-desarrollo)
7. [Buenas Prácticas](#buenas-prácticas)
8. [Roadmap de Desarrollo](#roadmap-de-desarrollo)

---

## 🎯 Introducción

El tipo de pregunta **"Estilo Libre"** es una innovación revolucionaria que permite crear preguntas completamente personalizables combinando múltiples tipos de elementos en una sola pregunta. A diferencia de los tipos tradicionales (opción única, múltiple, texto, etc.), el Estilo Libre ofrece flexibilidad total para crear experiencias de usuario únicas.

### Características Principales

- **Flexibilidad Total**: Combina diferentes tipos de elementos en una sola pregunta
- **12 Tipos de Elementos**: Desde texto básico hasta elementos multimedia y interactivos
- **Configuración Individual**: Cada elemento tiene sus propias opciones de configuración
- **Interfaz Intuitiva**: Sistema de arrastrar y soltar para organizar elementos
- **Responsive**: Adaptable a todos los dispositivos
- **Extensible**: Arquitectura preparada para añadir nuevos tipos de elementos

---

## 🏗️ Arquitectura del Sistema

### Componentes Principales

#### 1. **Admin Interface** (`includes/class-sfq-admin.php`)
- **Botón de Tipo**: Añadido en la grid de tipos de pregunta
- **Renderizado**: Integrado en el sistema de tabs existente
- **Identificador**: `data-type="freestyle"`

#### 2. **JavaScript Core** (Arquitectura Modular v2)
- **FormBuilderCore** (`assets/js/admin-builder-v2/core/FormBuilderCore.js`): Controlador principal
- **QuestionManager** (`assets/js/admin-builder-v2/managers/QuestionManager.js`): Manejo de preguntas freestyle
- **UIRenderer** (`assets/js/admin-builder-v2/components/UIRenderer.js`): Renderizado de elementos freestyle
- **FreestyleElements** (`assets/js/admin-builder-v2/components/FreestyleElements.js`): Gestión específica de elementos freestyle
- **EventManager** (`assets/js/admin-builder-v2/managers/EventManager.js`): Gestión de eventos con namespaces únicos
- **StateManager** (`assets/js/admin-builder-v2/core/StateManager.js`): Gestión centralizada del estado

#### 3. **CSS Styling** (`assets/css/admin-consolidated.css`)
- **Estilos Específicos**: Diseño único para elementos freestyle
- **Responsive Design**: Adaptación móvil
- **Visual Hierarchy**: Jerarquía visual clara

#### 4. **Data Structure**
```javascript
{
    id: 'q_timestamp_random',
    type: 'freestyle',
    text: 'Pregunta principal',
    freestyle_elements: [
        {
            id: 'element_timestamp_index',
            type: 'text|video|image|etc',
            label: 'Etiqueta del elemento',
            settings: { /* configuraciones específicas */ },
            order: 0,
            value: ''
        }
    ],
    required: boolean,
    global_settings: {
        layout: 'vertical|horizontal',
        spacing: 'normal|compact|wide',
        show_element_numbers: boolean
    }
}
```

---

## 🚀 Implementación Actual

### ✅ Fase 1: Estructura Base (COMPLETADA)

#### 1. **Admin Interface**
```php
// Botón añadido en class-sfq-admin.php
<button class="sfq-add-question" data-type="freestyle">
    <span class="dashicons dashicons-admin-tools"></span>
    <?php _e('Estilo Libre', 'smart-forms-quiz'); ?>
</button>
```

#### 2. **JavaScript Core**
- ✅ **createQuestionObject()**: Procesamiento de datos freestyle
- ✅ **renderFreestyleQuestion()**: Renderizado de pregunta freestyle
- ✅ **renderFreestyleElements()**: Renderizado de elementos
- ✅ **renderFreestyleControls()**: Controles para añadir elementos
- ✅ **bindFreestyleEvents()**: Eventos específicos

#### 3. **CSS Styling**
- ✅ **Contenedor Principal**: `.sfq-freestyle-question`
- ✅ **Elementos**: `.sfq-freestyle-element`
- ✅ **Controles**: `.sfq-freestyle-controls`
- ✅ **Responsive**: Adaptación móvil completa

#### 4. **Elementos Base**
- ✅ **12 Tipos Definidos**: Todos los elementos planificados
- ✅ **Previsualizaciones**: Vista previa de cada elemento
- ✅ **Estructura de Datos**: Formato JSON consistente

---

## 🧩 Elementos Disponibles

### 1. **Elementos Básicos**
| Elemento | Emoji | Descripción | Estado |
|----------|-------|-------------|--------|
| Texto | 📝 | Campo de texto simple | ⏳ Pendiente |
| Email | 📧 | Campo de email con validación | ⏳ Pendiente |
| Teléfono | 📞 | Campo de teléfono con formato | ⏳ Pendiente |

### 2. **Elementos Multimedia**
| Elemento | Emoji | Descripción | Estado |
|----------|-------|-------------|--------|
| Video | 🎥 | Embed de YouTube/Vimeo | ⏳ Pendiente |
| Imagen | 🖼️ | Imagen con URL o upload | ⏳ Pendiente |
| Subir Imagen | 📤 | Upload de archivos | ⏳ Pendiente |

### 3. **Elementos Interactivos**
| Elemento | Emoji | Descripción | Estado |
|----------|-------|-------------|--------|
| Botón | 🔘 | Botón personalizable | ⏳ Pendiente |
| Valoración | ⭐ | Estrellas/corazones | ⏳ Pendiente |
| Desplegable | 📋 | Select con opciones | ⏳ Pendiente |
| Opción Check | ☑️ | Checkbox individual | ⏳ Pendiente |

### 4. **Elementos Especiales**
| Elemento | Emoji | Descripción | Estado |
|----------|-------|-------------|--------|
| Cuenta Atrás | ⏰ | Timer/countdown | ⏳ Pendiente |
| Texto RGPD | ⚖️ | Texto legal/normativa | ⏳ Pendiente |

---

## 📊 Estructura de Datos

### Pregunta Freestyle Completa
```javascript
{
    // Identificación
    id: "q_1693123456789_abc123",
    originalId: 42, // ID en base de datos
    type: "freestyle",
    
    // Contenido
    text: "¿Cuál es tu experiencia con nuestro producto?",
    
    // Elementos freestyle
    freestyle_elements: [
        {
            id: "element_1693123456790_def456",
            type: "text",
            label: "Nombre completo",
            order: 0,
            settings: {
                placeholder: "Introduce tu nombre",
                required: true,
                max_length: 100
            },
            value: ""
        },
        {
            id: "element_1693123456791_ghi789",
            type: "rating",
            label: "Calificación general",
            order: 1,
            settings: {
                max_rating: 5,
                style: "stars", // stars, hearts, thumbs
                required: true
            },
            value: ""
        },
        {
            id: "element_1693123456792_jkl012",
            type: "video",
            label: "Video explicativo",
            order: 2,
            settings: {
                video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                autoplay: false,
                controls: true
            },
            value: ""
        }
    ],
    
    // Configuración global
    global_settings: {
        layout: "vertical", // vertical, horizontal, grid
        spacing: "normal", // compact, normal, wide
        show_element_numbers: false,
        allow_reorder: false
    },
    
    // Propiedades estándar
    required: true,
    order: 0,
    conditions: [],
    settings: {
        show_next_button: true,
        next_button_text: "Continuar"
    }
}
```

### Configuraciones por Tipo de Elemento

#### Texto
```javascript
settings: {
    placeholder: "Texto de ejemplo",
    required: true,
    max_length: 500,
    min_length: 0,
    validation_pattern: "", // regex
    input_type: "text" // text, textarea
}
```

#### Email
```javascript
settings: {
    placeholder: "email@ejemplo.com",
    required: true,
    validate_domain: false,
    allowed_domains: [] // ["gmail.com", "empresa.com"]
}
```

#### Valoración
```javascript
settings: {
    max_rating: 5,
    style: "stars", // stars, hearts, thumbs, numbers
    required: true,
    allow_half: false,
    labels: ["Muy malo", "Malo", "Regular", "Bueno", "Excelente"]
}
```

#### Video
```javascript
settings: {
    video_url: "",
    platform: "youtube", // youtube, vimeo, direct
    autoplay: false,
    controls: true,
    width: "100%",
    height: "315px"
}
```

---

## 🔄 Flujo de Desarrollo

### Fase 1: Estructura Base ✅
- [x] Botón en admin interface
- [x] JavaScript core functions
- [x] CSS styling básico
- [x] Estructura de datos
- [x] Renderizado base

### Fase 2: Elementos Básicos ⏳
- [ ] Implementar elemento Texto
- [ ] Implementar elemento Email
- [ ] Implementar elemento Teléfono
- [ ] Sistema de validación
- [ ] Configuraciones individuales

### Fase 3: Elementos Multimedia ⏳
- [ ] Implementar elemento Video
- [ ] Implementar elemento Imagen
- [ ] Implementar Subir Imagen
- [ ] Gestión de archivos
- [ ] Optimización de carga

### Fase 4: Elementos Interactivos ⏳
- [ ] Implementar Botón
- [ ] Implementar Valoración
- [ ] Implementar Desplegable
- [ ] Implementar Opción Check
- [ ] Lógica de interacción

### Fase 5: Elementos Especiales ⏳
- [ ] Implementar Cuenta Atrás
- [ ] Implementar Texto RGPD
- [ ] Funcionalidades avanzadas
- [ ] Integración con sistemas externos

### Fase 6: Testing y Pulido ⏳
- [ ] Testing exhaustivo
- [ ] Optimización de rendimiento
- [ ] Documentación completa
- [ ] Casos de uso reales

---

## 📋 Buenas Prácticas

### 1. **Nomenclatura Consistente**
```javascript
// ✅ CORRECTO - Sigue el patrón establecido
'freestyle_elements'
'element_settings'
'global_settings'

// ❌ INCORRECTO - No sigue el patrón
'freestyleElements'
'elementConfig'
'globalOptions'
```

### 2. **Estructura de IDs**
```javascript
// ✅ CORRECTO - IDs únicos y descriptivos
questionId: 'q_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
elementId: 'element_' + Date.now() + '_' + index

// ❌ INCORRECTO - IDs genéricos
questionId: 'question_1'
elementId: 'element_1'
```

### 3. **Gestión de Eventos**
```javascript
// ✅ CORRECTO - Eventos con namespace
$question.find('.sfq-add-freestyle-element').off('click').on('click', handler);

// ❌ INCORRECTO - Eventos sin cleanup
$question.find('.sfq-add-freestyle-element').on('click', handler);
```

### 4. **Validación de Datos**
```javascript
// ✅ CORRECTO - Validación robusta
if (!Array.isArray(elements)) return [];
if (!element.type || !element.id) continue;

// ❌ INCORRECTO - Sin validación
elements.forEach(element => processElement(element));
```

### 5. **Renderizado Seguro**
```javascript
// ✅ CORRECTO - Escape de HTML
value="${this.escapeHtml(element.label)}"

// ❌ INCORRECTO - Sin escape
value="${element.label}"
```

---

## 🛠️ Implementación de Nuevos Elementos

### Pasos para Añadir un Nuevo Elemento

#### 1. **Definir el Tipo**
```javascript
// En renderFreestyleControls()
<button class="sfq-add-freestyle-element" data-type="nuevo_tipo" data-question="${questionId}">
    🆕 Nuevo Elemento
</button>
```

#### 2. **Añadir Etiqueta**
```javascript
// En renderFreestyleElement()
const elementTypes = {
    // ... elementos existentes
    'nuevo_tipo': '🆕 Nuevo Elemento'
};
```

#### 3. **Crear Preview**
```javascript
// En renderElementPreview()
case 'nuevo_tipo':
    return `<div class="sfq-nuevo-preview">Vista previa del nuevo elemento</div>`;
```

#### 4. **Implementar Configuración**
```javascript
// Crear método específico
renderNuevoTipoConfig(element) {
    return `
        <div class="sfq-element-config">
            <label>Configuración específica</label>
            <input type="text" class="sfq-nuevo-config" value="${element.settings?.config || ''}">
        </div>
    `;
}
```

#### 5. **Añadir Eventos**
```javascript
// En bindFreestyleElementEvents()
$question.find('.sfq-nuevo-config').off('input').on('input', function() {
    if (!element.settings) element.settings = {};
    element.settings.config = $(this).val();
    self.formBuilder.isDirty = true;
});
```

#### 6. **Estilos CSS**
```css
.sfq-nuevo-preview {
    padding: 8px 12px;
    background: #e3f2fd;
    border-radius: 4px;
    color: #1976d2;
    font-size: 12px;
    text-align: center;
}
```

#### 7. **✅ CRÍTICO: Validación Backend (PHP)**
**⚠️ PASO OBLIGATORIO:** Todo nuevo elemento debe ser añadido a las validaciones PHP para evitar errores de seguridad.

**Archivos a actualizar:**

**A. `includes/class-sfq-ajax.php`**
```php
// Buscar la función validate_question_data() y añadir el nuevo tipo
$valid_element_types = array('text', 'video', 'image', 'countdown', 'phone', 'email', 'file_upload', 'button', 'rating', 'dropdown', 'checkbox', 'legal_text', 'variable_display', 'nuevo_tipo');
```

**B. `includes/class-sfq-database.php`**
```php
// Buscar la función process_freestyle_elements() y añadir el nuevo tipo
$valid_types = ['text', 'video', 'image', 'countdown', 'phone', 'email', 'file_upload', 'button', 'rating', 'dropdown', 'checkbox', 'legal_text', 'variable_display', 'nuevo_tipo'];
```

**❌ Error Común:** Olvidar actualizar las validaciones PHP causará que el elemento no se guarde correctamente y puede generar errores de seguridad.

#### 8. **✅ CRÍTICO: Funciones de Utilidad JavaScript**
**⚠️ PASO OBLIGATORIO:** Si el elemento usa colores con opacidad, asegurar que existan las funciones de utilidad necesarias.

**Verificar en `assets/js/admin-builder-v2.js` que existe la función `hexToRgba()`:**
```javascript
// En la clase UIRenderer, debe existir:
hexToRgba(hex, alpha = 1) {
    // Eliminar el # si existe
    hex = hex.replace('#', '');
    
    // Convertir hex de 3 dígitos a 6 dígitos
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    }
    
    // Extraer componentes RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
```

**❌ Error Común:** Usar `hexToRgba()` sin verificar que la función existe causará errores JavaScript que impedirán el funcionamiento del elemento.

#### 9. **✅ CRÍTICO: Implementación Frontend (PHP)**
**⚠️ PASO OBLIGATORIO:** Todo nuevo elemento debe ser implementado en el frontend para que los usuarios puedan verlo en los formularios públicos.

**Archivos a actualizar:**

**A. `includes/class-sfq-frontend.php` - Añadir case en render_freestyle_element()**
```php
// Buscar el método render_freestyle_element() y añadir el nuevo tipo
switch ($element_type) {
    // ... casos existentes
    case 'nuevo_tipo':
        $this->render_freestyle_nuevo_tipo($element, $question_id);
        break;
        
    default:
        echo '<p>' . sprintf(__('Tipo de elemento "%s" no soportado', 'smart-forms-quiz'), esc_html($element_type)) . '</p>';
}
```

**B. `includes/class-sfq-frontend.php` - Implementar método de renderizado**
```php
/**
 * Renderizar elemento nuevo_tipo freestyle
 */
private function render_freestyle_nuevo_tipo($element, $question_id) {
    $settings = $element['settings'] ?? array();
    
    // Procesar configuraciones del elemento
    $config_value = $settings['config_value'] ?? 'valor_por_defecto';
    
    // Aplicar estilos si es necesario
    $styles = array();
    if (!empty($settings['color'])) {
        $styles['color'] = $settings['color'];
    }
    
    // Convertir estilos a string CSS
    $style_string = '';
    foreach ($styles as $property => $value) {
        $style_string .= $property . ': ' . $value . '; ';
    }
    
    ?>
    <div class="sfq-freestyle-nuevo-tipo-wrapper">
        <div class="sfq-freestyle-nuevo-tipo" 
             data-element-id="<?php echo esc_attr($element['id']); ?>"
             style="<?php echo esc_attr(trim($style_string)); ?>">
            
            <!-- Contenido del elemento -->
            <?php echo esc_html($config_value); ?>
        </div>
        
        <!-- Campo oculto para tracking -->
        <input type="hidden" 
               name="freestyle[<?php echo $question_id; ?>][<?php echo $element['id']; ?>]"
               value="nuevo_tipo_displayed"
               class="sfq-nuevo-tipo-tracker">
    </div>
    <?php
}
```

**❌ Error Común:** Olvidar implementar el frontend causará el error "Tipo de elemento 'nuevo_tipo' no soportado" cuando los usuarios vean el formulario público.

**⚠️ Puntos Importantes del Frontend:**
- **Sanitización**: Usar `esc_html()`, `esc_attr()`, `esc_url()` según corresponda
- **Estilos**: Aplicar estilos inline desde las configuraciones del elemento
- **Tracking**: Incluir campo oculto para registrar interacciones
- **Accesibilidad**: Usar estructura HTML semántica
- **Responsive**: Asegurar que funcione en dispositivos móviles

---

## 🔍 Debugging y Troubleshooting

### Problemas Comunes

#### 1. **Elementos No Se Renderizan**
```javascript
// Verificar estructura de datos
console.log('Freestyle elements:', question.freestyle_elements);

// Verificar tipo de pregunta
console.log('Question type:', question.type);
```

#### 2. **Eventos No Funcionan**
```javascript
// Verificar binding de eventos
console.log('Events bound for question:', questionId);

// Verificar namespace
const ns = '.' + this.instanceId;
```

#### 3. **Configuraciones No Se Guardan**
```javascript
// Verificar isDirty flag
this.formBuilder.isDirty = true;

// Verificar estructura de settings
if (!element.settings) element.settings = {};
```

#### 4. **✅ NUEVO: Error "hexToRgba is not defined"**
**Síntoma:** Error JavaScript al usar elementos con colores y opacidad.
**Causa:** Falta la función `hexToRgba()` en la clase `UIRenderer`.
**Solución:** Verificar que existe la función en `assets/js/admin-builder-v2.js`:
```javascript
// Debe existir en la clase UIRenderer
hexToRgba(hex, alpha = 1) {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    }
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
```

#### 5. **✅ NUEVO: Elemento No Se Guarda en Base de Datos**
**Síntoma:** El elemento se crea pero desaparece al recargar el formulario.
**Causa:** Falta validación PHP para el nuevo tipo de elemento.
**Solución:** Añadir el tipo a las validaciones PHP:

**En `includes/class-sfq-ajax.php`:**
```php
$valid_element_types = array('text', 'video', 'image', 'countdown', 'phone', 'email', 'file_upload', 'button', 'rating', 'dropdown', 'checkbox', 'legal_text', 'variable_display', 'NUEVO_TIPO');
```

**En `includes/class-sfq-database.php`:**
```php
$valid_types = ['text', 'video', 'image', 'countdown', 'phone', 'email', 'file_upload', 'button', 'rating', 'dropdown', 'checkbox', 'legal_text', 'variable_display', 'NUEVO_TIPO'];
```

#### 5b. **✅ CASO REAL: Elemento styled_text Desaparecía al Recargar**
**Síntoma:** El elemento `styled_text` se creaba correctamente pero desaparecía al recargar el editor de formulario.
**Causa:** El elemento `styled_text` NO estaba incluido en la lista de tipos válidos en la función `validate_and_structure_freestyle_elements()` del archivo AJAX.
**Ubicación del problema:** `includes/class-sfq-ajax.php` - función `validate_and_structure_freestyle_elements()`

**Solución aplicada:**
```php
// ✅ CRÍTICO: Añadir 'styled_text' a la lista de tipos válidos
$valid_types = ['text', 'video', 'image', 'countdown', 'phone', 'email', 'file_upload', 'button', 'rating', 'dropdown', 'checkbox', 'legal_text', 'variable_display', 'styled_text'];
```

**Proceso de debugging usado:**
1. Añadir logging detallado en `get_form_data()` (AJAX)
2. Añadir logging específico en `validate_and_structure_freestyle_elements()` (AJAX)  
3. Añadir logging en `process_freestyle_elements()` (Database)
4. Reproducir el problema y analizar logs
5. Identificar que el elemento se filtraba en la validación AJAX
6. Añadir `'styled_text'` a `$valid_types`

**Lección aprendida:** Siempre verificar que los nuevos tipos de elementos estén incluidos en **TODAS** las validaciones, tanto en Database como en AJAX.

#### 6. **✅ NUEVO: Settings del Elemento Se Pierden**
**Síntoma:** Las configuraciones del elemento no persisten al recargar.
**Causa:** Mapeo incompleto en `getQuestionsData()`.
**Solución:** Verificar que el mapeo preserve todos los settings:
```javascript
// En getQuestionsData() - CORRECTO
baseData.freestyle_elements = (question.freestyle_elements || []).map(element => {
    return {
        id: element.id,
        type: element.type,
        label: element.label || '',
        settings: element.settings || {}, // ✅ CRÍTICO: Preservar objeto completo
        order: element.order || 0,
        value: element.value || ''
    };
});
```

#### 7. **✅ NUEVO: Error "Tipo de elemento no soportado" en Frontend**
**Síntoma:** Mensaje "Tipo de elemento 'nuevo_tipo' no soportado" aparece en formularios públicos.
**Causa:** Falta implementación del elemento en el archivo `class-sfq-frontend.php`.
**Solución:** Implementar soporte frontend completo:

**Paso 1 - Añadir case en switch:**
```php
// En includes/class-sfq-frontend.php, método render_freestyle_element()
case 'nuevo_tipo':
    $this->render_freestyle_nuevo_tipo($element, $question_id);
    break;
```

**Paso 2 - Implementar método de renderizado:**
```php
private function render_freestyle_nuevo_tipo($element, $question_id) {
    $settings = $element['settings'] ?? array();
    // ... implementación completa del elemento
}
```

**Verificación:** Comprobar que el elemento se muestra correctamente en el formulario público sin errores.

#### 8. **✅ NUEVO: Elemento Se Ve Mal en Frontend**
**Síntoma:** El elemento aparece pero sin estilos o con formato incorrecto.
**Causa:** Falta aplicación de estilos desde las configuraciones del elemento.
**Solución:** Verificar aplicación correcta de estilos:

```php
// ✅ CORRECTO: Aplicar estilos desde settings
$styles = array();
if (!empty($settings['color'])) {
    $styles['color'] = $settings['color'];
}
if (!empty($settings['font_size'])) {
    $styles['font-size'] = intval($settings['font_size']) . 'px';
}

// Convertir a CSS inline
$style_string = '';
foreach ($styles as $property => $value) {
    $style_string .= $property . ': ' . $value . '; ';
}

// Aplicar en el HTML
echo '<div style="' . esc_attr(trim($style_string)) . '">';
```

#### 9. **✅ NUEVO: Elemento No Responde a Interacciones**
**Síntoma:** Elementos interactivos (botones, checkboxes) no funcionan en frontend.
**Causa:** Falta JavaScript para manejar interacciones o campos ocultos mal configurados.
**Solución:** Verificar estructura HTML y campos de tracking:

```php
// ✅ CORRECTO: Incluir campos ocultos para tracking
<input type="hidden" 
       name="freestyle[<?php echo $question_id; ?>][<?php echo $element['id']; ?>]"
       value="elemento_interactuado"
       class="sfq-elemento-tracker">

// Para elementos interactivos, usar atributos data correctos
<button data-element-id="<?php echo esc_attr($element['id']); ?>"
        class="sfq-interactive-element">
    Texto del botón
</button>
```

### Herramientas de Debug

#### 1. **Console Logging**
```javascript
// En desarrollo, añadir logs
console.log('SFQ Freestyle: Adding element', elementType);
console.log('SFQ Freestyle: Element config', element.settings);
```

#### 2. **Data Validation**
```javascript
// Validar datos antes de procesar
const isValidElement = (element) => {
    return element && 
           element.id && 
           element.type && 
           typeof element.order === 'number';
};
```

#### 3. **✅ NUEVO: Debugging de Validaciones PHP**
```php
// En includes/class-sfq-ajax.php - Añadir logs temporales
error_log('SFQ: Validating element type: ' . $element['type']);
error_log('SFQ: Valid types: ' . json_encode($valid_element_types));

// En includes/class-sfq-database.php - Añadir logs temporales
error_log('SFQ: Processing freestyle element: ' . $element['type']);
error_log('SFQ: Element settings: ' . json_encode($element['settings']));
```

### ⚠️ Checklist de Verificación para Nuevos Elementos

Antes de considerar completo un nuevo elemento, verificar:

- [ ] **Frontend JavaScript:**
  - [ ] Botón añadido en `renderFreestyleControls()`
  - [ ] Etiqueta añadida en `elementTypes`
  - [ ] Preview implementado en `renderElementPreview()`
  - [ ] Configuración implementada en método específico
  - [ ] Eventos añadidos en `bindFreestyleElementEvents()`
  - [ ] Función `hexToRgba()` existe si usa colores

- [ ] **Backend PHP:**
  - [ ] Tipo añadido en `class-sfq-ajax.php` validaciones
  - [ ] Tipo añadido en `class-sfq-database.php` validaciones
  - [ ] Logs de debugging implementados

- [ ] **CSS:**
  - [ ] Estilos específicos para el elemento
  - [ ] Preview styles implementados

- [ ] **Testing:**
  - [ ] Elemento se crea correctamente
  - [ ] Configuraciones se guardan y recuperan
  - [ ] No hay errores JavaScript
  - [ ] Elemento persiste al recargar formulario

---

## 📈 Roadmap de Desarrollo

### Versión 1.1 - Elementos Básicos
- [ ] Texto con validación avanzada
- [ ] Email con verificación de dominio
- [ ] Teléfono con formato internacional
- [ ] Sistema de validación unificado

### Versión 1.2 - Multimedia
- [ ] Video con múltiples plataformas
- [ ] Imagen con editor básico
- [ ] Upload con progress bar
- [ ] Gestión de archivos multimedia

### Versión 1.3 - Interactividad
- [ ] Botones con acciones personalizadas
- [ ] Valoración con estilos múltiples
- [ ] Desplegables con búsqueda
- [ ] Checkboxes con dependencias

### Versión 1.4 - Elementos Avanzados
- [ ] Cuenta atrás con eventos
- [ ] Texto RGPD con versiones
- [ ] Elementos condicionales
- [ ] Integración con APIs externas

### Versión 2.0 - Funcionalidades Avanzadas
- [ ] Drag & Drop para reordenar
- [ ] Templates predefinidos
- [ ] Importar/Exportar elementos
- [ ] Marketplace de elementos

---

## 🎯 Casos de Uso

### 1. **Formulario de Contacto Avanzado**
```
Pregunta: "Cuéntanos sobre tu proyecto"
Elementos:
- 📝 Nombre completo
- 📧 Email de contacto
- 📞 Teléfono (opcional)
- 📋 Tipo de proyecto (desplegable)
- 📝 Descripción del proyecto (textarea)
- 📤 Subir archivo de referencia
- ⚖️ Acepto términos y condiciones
```

### 2. **Encuesta de Satisfacción**
```
Pregunta: "Evalúa tu experiencia"
Elementos:
- 🎥 Video explicativo del producto
- ⭐ Calificación general (1-5 estrellas)
- ⭐ Calidad del producto
- ⭐ Atención al cliente
- ⭐ Facilidad de uso
- 📝 Comentarios adicionales
- 🔘 Recomendarías a un amigo
```

### 3. **Registro de Evento**
```
Pregunta: "Regístrate para el evento"
Elementos:
- 🖼️ Banner del evento
- ⏰ Cuenta atrás hasta el evento
- 📝 Nombre completo
- 📧 Email
- 📞 Teléfono
- 📋 Sesiones de interés
- ☑️ Necesidades dietéticas especiales
- ⚖️ Política de privacidad
```

---

## 📚 Referencias y Recursos

### Documentación Relacionada
- [GUIA_IMPLEMENTACION_NUEVAS_OPCIONES.md](./GUIA_IMPLEMENTACION_NUEVAS_OPCIONES_EN_FORMULARIOS.md)
- [DOCUMENTACION_VIDEO_YOUTUBE_VIMEO.md](./DOCUMENTACION_VIDEO_YOUTUBE_VIMEO.md)
- [GUIA_PREVISUALIZACION_FLOTANTE.md](./GUIA_PREVISUALIZACION_FLOTANTE.md)

### Archivos Clave (Arquitectura Modular v2)
- `includes/class-sfq-admin.php` - Interface de administración
- `assets/js/admin-builder-v2/main.js` - Punto de entrada y orquestador
- `assets/js/admin-builder-v2/core/FormBuilderCore.js` - Controlador principal
- `assets/js/admin-builder-v2/components/FreestyleElements.js` - Gestión específica de elementos freestyle
- `assets/js/admin-builder-v2/components/UIRenderer.js` - Renderizado de componentes UI
- `assets/js/admin-builder-v2/managers/QuestionManager.js` - Gestión de preguntas
- `assets/js/admin-builder-v2/managers/EventManager.js` - Gestión de eventos con namespaces únicos
- `assets/js/admin-builder-v2/core/StateManager.js` - Gestión centralizada del estado
- `assets/css/admin-consolidated.css` - Estilos CSS
- `includes/class-sfq-ajax.php` - Procesamiento AJAX
- `includes/class-sfq-frontend.php` - Renderizado frontend

### Patrones de Código (Arquitectura Modular)
- **Singleton Pattern**: FormBuilderCore con instancia única
- **Observer Pattern**: StateManager para cambios de estado
- **Factory Pattern**: FreestyleElements para creación de elementos
- **Strategy Pattern**: UIRenderer para renderizado según tipo
- **Command Pattern**: EventManager para gestión de eventos
- **Module Pattern**: Cada componente como módulo independiente

---

## 🔄 Changelog

### v1.0.0 - Agosto 2025
- ✅ Implementación inicial de estructura base
- ✅ 12 tipos de elementos definidos
- ✅ Sistema de renderizado completo
- ✅ CSS responsive implementado
- ✅ Arquitectura extensible establecida

---

**📝 Nota**: Esta guía debe actualizarse con cada nueva implementación de elemento. Los patrones aquí establecidos garantizan consistencia y escalabilidad del sistema.

---

*Documento creado para Smart Forms & Quiz Plugin v1.5.0*
*Última actualización: Agosto 2025*
*Autor: Sistema de IA - Cline*
