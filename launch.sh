#!/bin/bash
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR" || exit 1

echo "========================================="
echo "   Iniciando SonicVault..."
echo "========================================="


# Abrir el navegador en segundo plano una vez que inicie el servidor
(
  sleep 3
  if command -v xdg-open > /dev/null; then
    xdg-open "http://localhost:5173"
  fi
) &

# Ejecutar el servidor de desarrollo
npm run dev
