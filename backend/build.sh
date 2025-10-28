#!/usr/bin/env bash
# exit on error
set -o errexit

# Instalar dependencias
pip install -r requirements.txt

# No crear tablas automáticamente (ya las tienes en Railway)
echo "Build completado - Las tablas se crearán desde el backup"