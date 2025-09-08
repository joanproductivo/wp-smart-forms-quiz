# 📋 GUÍA COMPLETA: CREAR MÓDULOS EN ARQUITECTURA MODULAR V2

## 🎯 PROPÓSITO DE ESTA GUÍA
Esta guía detalla paso a paso cómo crear un nuevo módulo funcional en la arquitectura modular v2 del Smart Forms Quiz, basándose en la experiencia real de implementar el `BlockFormTimerManager`.

---

## 📊 ESTRUCTURA DE LA ARQUITECTURA MODULAR V2

### 🗂️ ORGANIZACIÓN DE CARPETAS
```
assets/js/admin-builder-v2/
├── main.js                    # Punto de entrada principal
├── core/                      # Módulos core (obligatorios)
│   ├── FormBuilderCore.js     # Controlador principal
│   └── StateManager.js        # Gestión de estado
├── managers/                  # Gestores de funcionalidad
│   ├── QuestionManager.js     # Gestión de preguntas
│   ├── ConditionEngine.js     # Motor de condiciones
│   └── EventManager.js        # Gestión de eventos
├── components/                # Componentes específicos
│   ├── DataValidator.js       # Validación de datos
│   ├── UIRenderer.js          # Renderizado de UI
│   ├── FreestyleElements.js   # Elementos freestyle
│   ├── ImageManager.js        # Gestión de imágenes
│   ├── VariableManager.js     # Variables globales
│   ├── StyleManager.js        # Gestión de estilos
│   └── BlockFormTimerManager.js # ✅ EJEMPLO: Timer de bloqueo
└── config/                    # Configuraciones
    ├── Constants.js           # Constantes globales
    └── ElementTypes.js        # Tipos de elementos
```

---

## 🚀 PASO A PASO: CREAR UN NUEVO MÓDULO

### **PASO 1: PLANIFICACIÓN DEL MÓDULO**

#### 1.1 Definir el Propósito
- **¿Qué funcionalidad va a manejar?**
- **¿Es un módulo core, manager o component?**
- **¿Qué dependencias tiene?**

#### 1.2 Elegir la Ubicación
- **`core/`**: Funcionalidad esencial (StateManager, FormBuilderCore)
- **`managers/`**: Gestores de funcionalidad compleja (QuestionManager, EventManager)
- **`components/`**: Componentes específicos y opcionales (ImageManager, StyleManager)

#### 1.3 Definir la Interfaz
- **Métodos públicos que expondrá**
- **Eventos que manejará**
- **Datos que gestionará**

---

### **PASO 2: CREAR EL ARCHIVO DEL MÓDULO**

#### 2.1 Estructura Básica del Módulo
```javascript
/**
 * NombreDelModulo - Descripción breve
 * Smart Forms & Quiz - Admin Builder v2
 */

(function($) {
    'use strict';

    class NombreDelModulo {
        constructor(formBuilder) {
            this.formBuilder = formBuilder;
            this.eventNamespace = '.' + this.formBuilder.instanceId + '_nombremodulo';
            
            // Propiedades específicas del módulo
            this.isInitialized = false;
            this.moduleData = {};
        }

        /**
         * Inicializar el módulo
         */
        init() {
            if (this.isInitialized) return;
            
            console.log('SFQ: Initializing NombreDelModulo...');
            
            // Inicialización específica
            this.setupModule();
            this.bindEvents();
            
            this.isInitialized = true;
            console.log('SFQ: NombreDelModulo initialized successfully');
        }

        /**
         * Configurar el módulo
         */
        setupModule() {
            // Configuración específica del módulo
        }

        /**
         * Vincular eventos
         */
        bindEvents() {
            const ns = this.eventNamespace;
            
            // Eventos específicos del módulo
            // Ejemplo: $('#elemento').on('click' + ns, () => this.handleClick());
        }

        /**
         * Método público principal
         */
        metodoPrincipal() {
            // Funcionalidad principal
        }

        /**
         * Recopilar datos del módulo para guardado
         */
        collectModuleData() {
            return {
                // Datos a guardar
            };
        }

        /**
         * Poblar datos del módulo desde la base de datos
         */
        populateModuleData(data) {
            // Cargar datos guardados
        }

        /**
         * Destruir el módulo
         */
        destroy() {
            if (!this.isInitialized) return;
            
            // Limpiar eventos
            const ns = this.eventNamespace;
            $(document).off(ns);
            $('*').off(ns);
            
            // Limpiar referencias
            this.formBuilder = null;
            this.moduleData = null;
            
            this.isInitialized = false;
            console.log('SFQ: NombreDelModulo destroyed');
        }
    }

    // Export para uso en otros módulos
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = NombreDelModulo;
    } else {
        window.SFQ_NombreDelModulo = NombreDelModulo;
    }

})(jQuery);
```

#### 2.2 Ejemplo Real: BlockFormTimerManager
**Archivo**: `assets/js/admin-builder-v2/components/BlockFormTimerManager.js`

```javascript
/**
 * BlockFormTimerManager - Gestión del timer de bloqueo de formularios
 * Smart Forms & Quiz - Admin Builder v2
 */

(function($) {
    'use strict';

    class BlockFormTimerManager {
        constructor(formBuilder) {
            this.formBuilder = formBuilder;
            this.eventNamespace = '.' + this.formBuilder.instanceId + '_timer';
            this.isInitialized = false;
        }

        init() {
            if (this.isInitialized) return;
            
            console.log('SFQ: Initializing BlockFormTimerManager...');
            this.bindEvents();
            this.isInitialized = true;
        }

        bindEvents() {
            const ns = this.eventNamespace;
            
            // Checkbox principal del timer
            $('#block-form-enable-timer').off('change' + ns).on('change' + ns, (e) => {
                this.handleTimerToggle(e);
            });
            
            // Otros eventos específicos del timer...
        }

        handleTimerToggle(e) {
            if ($(e.target).is(':checked')) {
                $('#block-form-timer-settings').slideDown();
                $('#block-form-timer-available-section').slideDown();
            } else {
                $('#block-form-timer-settings').slideUp();
                $('#block-form-timer-available-section').slideUp();
            }
            
            if (!this.formBuilder.isDestroyed) {
                this.formBuilder.isDirty = true;
            }
        }

        // Más métodos específicos...
    }

    // Export
    window.SFQ_BlockFormTimerManager = BlockFormTimerManager;

})(jQuery);
```

---

### **PASO 3: INTEGRAR EN FormBuilderCore**

#### 3.1 Añadir al Constructor
**Archivo**: `assets/js/admin-builder-v2/core/FormBuilderCore.js`

```javascript
initializeModules() {
    // ... módulos existentes ...
    
    // ✅ AÑADIR: Inicializar el nuevo módulo
    this.nombreDelModulo = window.SFQ_NombreDelModulo ? new window.SFQ_NombreDelModulo(this) : null;
    
    console.log('SFQ: Modules initialized successfully');
}
```

#### 3.2 Añadir a la Inicialización
```javascript
initializeModuleComponents() {
    // ... inicializaciones existentes ...
    
    // ✅ AÑADIR: Inicializar el nuevo módulo
    if (this.nombreDelModulo) {
        this.nombreDelModulo.init();
    }
}
```

#### 3.3 Añadir al Método de Destrucción
```javascript
destroy() {
    // ... destrucciones existentes ...
    
    // ✅ AÑADIR: Destruir el nuevo módulo
    if (this.nombreDelModulo) {
        this.nombreDelModulo.destroy();
    }
    
    // Limpiar referencia
    this.nombreDelModulo = null;
}
```

#### 3.4 Integrar en Guardado de Datos (si aplica)
```javascript
collectStyleSettings() {
    return {
        // ... configuraciones existentes ...
        
        // ✅ AÑADIR: Datos del nuevo módulo
        ...this.collectNombreDelModuloSettings()
    };
}

collectNombreDelModuloSettings() {
    const settings = {};

    // ✅ AÑADIR: Recopilar datos via el módulo
    if (this.nombreDelModulo) {
        const moduleSettings = this.nombreDelModulo.collectModuleData();
        Object.assign(settings, moduleSettings);
    }

    return settings;
}
```

#### 3.5 Integrar en Carga de Datos (si aplica)
```javascript
populateStyleSettings(styles) {
    // ... poblaciones existentes ...
    
    // ✅ AÑADIR: Poblar datos del nuevo módulo
    this.populateNombreDelModuloSettings(styles);
}

populateNombreDelModuloSettings(styles) {
    // ✅ AÑADIR: Poblar via el módulo
    if (this.nombreDelModulo) {
        this.nombreDelModulo.populateModuleData(styles);
    }
}
```

---

### **PASO 4: INTEGRAR EN EventManager (si maneja eventos)**

#### 4.1 Añadir Método de Vinculación
**Archivo**: `assets/js/admin-builder-v2/managers/EventManager.js`

```javascript
bindGlobalEvents() {
    // ... eventos existentes ...
    
    // ✅ AÑADIR: Eventos del nuevo módulo
    this.bindNombreDelModuloEvents();
}

/**
 * ✅ NUEVO: Vincular eventos del nuevo módulo
 */
bindNombreDelModuloEvents() {
    const ns = this.eventNamespace;
    
    // Delegar al módulo si está disponible
    if (this.formBuilder.nombreDelModulo) {
        this.formBuilder.nombreDelModulo.bindEvents();
        console.log('SFQ EventManager: NombreDelModulo events delegated');
    } else {
        console.warn('SFQ EventManager: NombreDelModulo not available, binding fallback events');
        
        // Fallback básico si el módulo no está disponible
        $('#elemento-principal').off('change' + ns).on('change' + ns, (e) => {
            // Lógica básica de fallback
        });
    }
    
    console.log('SFQ EventManager: NombreDelModulo events bound');
}
```

---

### **PASO 5: CARGAR EL MÓDULO EN EL SISTEMA**

#### 5.1 Verificar Carga en main.js
**Archivo**: `assets/js/admin-builder-v2/main.js`

```javascript
// Verificar que todas las clases estén disponibles
const requiredClasses = [
    'FormBuilderCore',
    'StateManager', 
    'DataValidator',
    'QuestionManager',
    'ConditionEngine',
    'UIRenderer',
    'EventManager',
    'FreestyleElements',
    'ImageManager',
    'VariableManager',
    'StyleManager',
    'SFQ_NombreDelModulo'  // ✅ AÑADIR: Verificar nuevo módulo
];

const missingClasses = requiredClasses.filter(className => {
    return typeof window[className] === 'undefined' && 
           typeof window['SFQ_' + className] === 'undefined';
});
```

#### 5.2 Cargar en WordPress (si es necesario)
**Archivo**: `includes/class-sfq-admin.php`

```php
public function enqueue_admin_scripts($hook) {
    // ... scripts existentes ...
    
    // ✅ AÑADIR: Cargar nuevo módulo
    wp_enqueue_script(
        'sfq-nombre-del-modulo',
        SFQ_PLUGIN_URL . 'assets/js/admin-builder-v2/components/NombreDelModulo.js',
        array('jquery', 'sfq-admin-builder-core'),
        SFQ_VERSION,
        true
    );
}
```

---

### **PASO 6: ELEMENTOS HTML NECESARIOS (si aplica)**

#### 6.1 Añadir Elementos en el Admin
**Archivo**: `includes/class-sfq-admin.php`

```php
<!-- ✅ AÑADIR: Elementos HTML para el nuevo módulo -->
<div class="sfq-field-group">
    <h4><?php _e('Configuración del Nuevo Módulo', 'smart-forms-quiz'); ?></h4>
    
    <div class="sfq-field-row">
        <label>
            <input type="checkbox" id="modulo-activar">
            <?php _e('Activar funcionalidad', 'smart-forms-quiz'); ?>
        </label>
    </div>
    
    <div id="modulo-configuracion" style="display: none;">
        <div class="sfq-field-row">
            <label><?php _e('Configuración específica', 'smart-forms-quiz'); ?></label>
            <input type="text" id="modulo-config-input">
        </div>
    </div>
</div>
```

---

### **PASO 7: TESTING Y DEBUGGING**

#### 7.1 Verificaciones Básicas
```javascript
// En la consola del navegador:

// 1. Verificar que el módulo se carga
console.log('Módulo disponible:', typeof window.SFQ_NombreDelModulo);

// 2. Verificar que se inicializa
console.log('Módulo inicializado:', window.sfqFormBuilderV2.nombreDelModulo);

// 3. Verificar eventos
// Interactuar con los elementos y verificar que los eventos se disparan

// 4. Verificar guardado/carga
// Guardar el formulario y recargar para verificar persistencia
```

#### 7.2 Logging para Debug
```javascript
// Añadir logs detallados en el módulo
console.log('SFQ NombreDelModulo: Evento disparado', eventData);
console.log('SFQ NombreDelModulo: Datos recopilados', collectedData);
console.log('SFQ NombreDelModulo: Datos poblados', populatedData);
```

---

## 🎯 EJEMPLO COMPLETO: BlockFormTimerManager

### **CASO DE ESTUDIO REAL**

#### **Problema Original**
- La funcionalidad del timer de bloqueo se perdió en la refactorización
- Estaba en el archivo monolítico `old/admin-builder-v2.js`
- Necesitaba ser modularizada manteniendo toda la funcionalidad

#### **Solución Implementada**

1. **Creación del Módulo**
   - ✅ Archivo: `assets/js/admin-builder-v2/components/BlockFormTimerManager.js`
   - ✅ Clase: `SFQ_BlockFormTimerManager`
   - ✅ Funcionalidad completa del timer

2. **Integración en FormBuilderCore**
   - ✅ Inicialización: `this.blockFormTimerManager = new SFQ_BlockFormTimerManager(this)`
   - ✅ Guardado: `collectBlockFormSettings()` via el módulo
   - ✅ Carga: `populateBlockFormSettings()` via el módulo

3. **Integración en EventManager**
   - ✅ Método: `bindBlockFormTimerEvents()`
   - ✅ Delegación al módulo cuando está disponible
   - ✅ Fallback básico si no está disponible

4. **Elementos HTML**
   - ✅ Ya existían en `includes/class-sfq-admin.php`
   - ✅ IDs correctos: `#block-form-enable-timer`, etc.

5. **Resultado**
   - ✅ Funcionalidad completamente restaurada
   - ✅ Compatible con arquitectura modular
   - ✅ Mantenible y extensible

---

## 📋 CHECKLIST PARA CREAR UN MÓDULO

### **Pre-Desarrollo**
- [ ] Definir propósito y alcance del módulo
- [ ] Elegir ubicación apropiada (core/managers/components)
- [ ] Identificar dependencias
- [ ] Planificar interfaz pública

### **Desarrollo del Módulo**
- [ ] Crear archivo con estructura básica
- [ ] Implementar constructor con formBuilder
- [ ] Añadir método `init()`
- [ ] Implementar `bindEvents()` si maneja eventos
- [ ] Añadir métodos específicos de funcionalidad
- [ ] Implementar `collectModuleData()` si guarda datos
- [ ] Implementar `populateModuleData()` si carga datos
- [ ] Añadir método `destroy()` para limpieza
- [ ] Exportar correctamente (`window.SFQ_NombreDelModulo`)

### **Integración en FormBuilderCore**
- [ ] Añadir inicialización en `initializeModules()`
- [ ] Añadir llamada a `init()` en `initializeModuleComponents()`
- [ ] Integrar en `collectStyleSettings()` si guarda datos
- [ ] Integrar en `populateStyleSettings()` si carga datos
- [ ] Añadir destrucción en `destroy()`

### **Integración en EventManager (si aplica)**
- [ ] Crear método `bindNombreDelModuloEvents()`
- [ ] Llamar desde `bindGlobalEvents()`
- [ ] Implementar delegación al módulo
- [ ] Añadir fallback básico

### **Elementos HTML (si aplica)**
- [ ] Añadir elementos necesarios en `class-sfq-admin.php`
- [ ] Verificar IDs y clases correctas
- [ ] Añadir estilos CSS si es necesario

### **Carga del Módulo**
- [ ] Verificar carga en `main.js`
- [ ] Añadir a `requiredClasses` si es obligatorio
- [ ] Cargar script en WordPress si es necesario

### **Testing**
- [ ] Verificar carga del módulo en consola
- [ ] Probar inicialización
- [ ] Verificar eventos funcionan
- [ ] Probar guardado/carga de datos
- [ ] Verificar destrucción correcta

### **Documentación**
- [ ] Comentar código adecuadamente
- [ ] Documentar métodos públicos
- [ ] Añadir logs para debugging
- [ ] Actualizar documentación del proyecto

---

## 🚨 ERRORES COMUNES Y SOLUCIONES

### **Error 1: Módulo no se carga**
```javascript
// ❌ Problema: Export incorrecto
window.NombreDelModulo = NombreDelModulo;

// ✅ Solución: Export con prefijo SFQ_
window.SFQ_NombreDelModulo = NombreDelModulo;
```

### **Error 2: Eventos no funcionan**
```javascript
// ❌ Problema: Namespace incorrecto o faltante
$('#elemento').on('click', handler);

// ✅ Solución: Usar namespace único
const ns = this.eventNamespace;
$('#elemento').on('click' + ns, handler);
```

### **Error 3: Datos no se guardan**
```javascript
// ❌ Problema: No integrado en collectStyleSettings
// El módulo recopila datos pero FormBuilderCore no los incluye

// ✅ Solución: Integrar en FormBuilderCore
collectStyleSettings() {
    return {
        ...this.collectNombreDelModuloSettings()
    };
}
```

### **Error 4: Memory leaks**
```javascript
// ❌ Problema: No limpiar eventos en destroy
destroy() {
    this.isInitialized = false;
}

// ✅ Solución: Limpiar eventos y referencias
destroy() {
    const ns = this.eventNamespace;
    $(document).off(ns);
    this.formBuilder = null;
    this.isInitialized = false;
}
```

### **Error 5: Dependencias circulares**
```javascript
// ❌ Problema: Módulos que se referencian mutuamente
// ModuloA llama a ModuloB y ModuloB llama a ModuloA

// ✅ Solución: Usar FormBuilderCore como mediador
// ModuloA -> FormBuilderCore -> ModuloB
this.formBuilder.otroModulo.metodo();
```

---

## 🎉 CONCLUSIÓN

Esta guía proporciona un framework completo para crear módulos robustos y mantenibles en la arquitectura modular v2. Siguiendo estos pasos, cualquier funcionalidad puede ser modularizada correctamente, manteniendo:

- **Separación de responsabilidades**
- **Reutilización de código**
- **Facilidad de mantenimiento**
- **Compatibilidad con el sistema existente**
- **Capacidad de testing individual**

El ejemplo del `BlockFormTimerManager` demuestra que incluso funcionalidades complejas pueden ser exitosamente modularizadas siguiendo esta metodología.
