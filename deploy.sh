#!/bin/bash
set -e

echo "===================================================="
echo "💜 Iniciando Deploy Automático — Vista Bem"
echo "===================================================="

cd "$(dirname "$0")"

git config --global --add safe.directory /opt/docker/vistabem 2>/dev/null || true
git remote set-url origin https://github.com/andrebontempo/vistabem.git 2>/dev/null || true

echo "📥 [1/5] Baixando atualizações do GitHub (main)..."
git fetch origin main
git reset --hard origin/main

echo "🧹 [2/5] Removendo arquivos não rastreados (mantendo .env e data/)..."
git clean -fd -e .env -e data/

# Cria o .env inicial caso ainda não exista
if [ ! -f ".env" ]; then
  echo "⚠️ Arquivo .env não encontrado. Copiando de .env.example..."
  cp .env.example .env
fi

echo "🌐 [3/5] Verificando rede externa Docker proxy e limpando instâncias órfãs..."
docker network create proxy 2>/dev/null || true

# Encerra e remove qualquer container antigo da aplicação vistabem para evitar instâncias duplicadas na rede proxy
docker ps -a --format '{{.ID}} {{.Names}}' | grep -i 'vistabem' | grep -v 'mongo' | awk '{print $1}' | while read -r cid; do
  if [ -n "$cid" ]; then
    echo "Parando e removendo container legado/zumbi da aplicação: $cid"
    docker stop "$cid" 2>/dev/null || true
    docker rm -f "$cid" 2>/dev/null || true
  fi
done

# Desconecta quaisquer endpoints fantasmas da rede proxy
docker network disconnect -f proxy vistabem 2>/dev/null || true
docker network disconnect -f proxy vistabem-app 2>/dev/null || true
docker network disconnect -f proxy vistabem_nginx 2>/dev/null || true

# Derruba o compose atual com remoção de órfãos
docker compose down --remove-orphans 2>/dev/null || true

echo "🐳 [4/5] Reconstruindo container único oficial..."
docker compose up -d --build --remove-orphans

echo "🔍 [5/6] Inspecionando rede Docker proxy e endpoints conectados..."
docker network inspect proxy 2>/dev/null || true

echo "🧪 [6/6] Validando estabilidade local na porta 3010..."
sleep 4
for i in 1 2 3 4 5; do
  echo "--- Teste Local $i ---"
  curl -s -o /dev/null -w "Status: %{http_code} | Bytes: %{size_download}\n" http://127.0.0.1:3010/
done

echo "===================================================="
echo "✨ Deploy concluído com sucesso!"
echo "===================================================="
