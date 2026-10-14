#!/bin/bash
set -e

echo "===================================================="
echo "💜 Iniciando Deploy Automático — Vista Bem"
echo "===================================================="

cd "$(dirname "$0")"

git config --global --add safe.directory /opt/docker/vistabem 2>/dev/null || true

echo "📥 [1/4] Baixando atualizações do GitHub (main)..."
git fetch origin main
git reset --hard origin/main

echo "🧹 [2/4] Removendo arquivos não rastreados (mantendo .env e data/)..."
git clean -fd -e .env -e data/

echo "🐳 [3/4] Reconstruindo containers..."
docker compose down --remove-orphans
docker compose up -d --build --remove-orphans

echo "===================================================="
echo "✨ [4/4] Deploy concluído!"
echo "===================================================="
