#!/bin/bash

# Script para eliminar todos los console.log, console.error, console.warn, etc. de archivos JavaScript
# para preparar el plugin de WordPress para producción

echo "🧹 Iniciando limpieza de logs de consola en archivos JavaScript..."

# Directorio de archivos JavaScript
JS_DIR="assets/js"

# Contador de archivos procesados
processed=0
total_removed=0

# Función para procesar un archivo
process_file() {
    local file="$1"
    local filename=$(basename "$file")
    
    echo "📄 Procesando: $filename"
    
    # Contar líneas antes
    lines_before=$(wc -l < "$file")
    
    # Crear backup temporal
    cp "$file" "$file.backup"
    
    # Eliminar líneas que contengan console.log, console.error, console.warn, etc.
    # Usando sed para eliminar líneas completas que contengan estos patrones
    sed -i.tmp '/console\.\(log\|error\|warn\|info\|debug\|trace\)/d' "$file"
    
    # Contar líneas después
    lines_after=$(wc -l < "$file")
    removed=$((lines_before - lines_after))
    
    echo "   ✅ Eliminadas $removed líneas de logs"
    
    # Limpiar archivo temporal
    rm -f "$file.tmp"
    
    total_removed=$((total_removed + removed))
    processed=$((processed + 1))
}

# Verificar que el directorio existe
if [ ! -d "$JS_DIR" ]; then
    echo "❌ Error: Directorio $JS_DIR no encontrado"
    exit 1
fi

# Procesar todos los archivos .js en el directorio
for js_file in "$JS_DIR"/*.js; do
    if [ -f "$js_file" ]; then
        process_file "$js_file"
    fi
done

echo ""
echo "🎉 Limpieza completada!"
echo "📊 Archivos procesados: $processed"
echo "🗑️  Total de líneas eliminadas: $total_removed"
echo ""
echo "💾 Se crearon backups con extensión .backup por seguridad"
echo "🔍 Revisa los archivos y si todo está bien, puedes eliminar los backups con:"
echo "   rm assets/js/*.backup"
