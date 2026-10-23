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

# Encerra qualquer processo Node legado rodando no host da VPS cujo diretório seja vistabem
echo "🧹 Parando processos Node legados no host..."
systemctl stop vistabem 2>/dev/null || true
systemctl disable vistabem 2>/dev/null || true

for pid in $(pgrep -f 'node' 2>/dev/null || true); do
  cwd=$(readlink -f /proc/$pid/cwd 2>/dev/null || true)
  if [ -n "$cwd" ] && [[ "$cwd" == *"vistabem"* ]]; then
    echo "🎯 Processo zumbi detectado no host! PID: $pid (cwd: $cwd). Encerrando com kill -9..."
    kill -9 "$pid" 2>/dev/null || true
  fi
done

# Mata especificamente qualquer processo remanescente de node src/server.js no host
kill -9 3484886 2>/dev/null || true
pkill -9 -f 'node src/server.js' 2>/dev/null || true

fuser -k 3010/tcp 2>/dev/null || true

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

echo "🔍 [5/6] Inspecionando containers ativos e rede Docker proxy..."
docker ps --format "table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Ports}}"
docker network inspect proxy 2>/dev/null | grep -E '"(Name|IPv4Address|Aliases)"' || true

echo "🔍 Portas e processos escutando 3010 no host:"
(ss -tulpn 2>/dev/null || netstat -tlpn 2>/dev/null) | grep 3010 || true

echo "🔍 Processos Node rodando no host:"
ps aux | grep -i node | grep -v 'grep' || true

# Reinicia o container do Nginx Proxy Manager (npm) para purgar a tabela interna de DNS/upstream
echo "🔄 [6/7] Purgando cache DNS de upstream no Nginx Proxy Manager (npm)..."
docker restart npm 2>/dev/null || docker kill -s HUP npm 2>/dev/null || true

echo "🔍 Configuração do upstream vistabem no NPM:"
docker exec npm grep -rn "vistabem" /data/nginx/ 2>/dev/null || docker exec npm grep -rn "3010" /data/nginx/ 2>/dev/null || true

echo "🧪 [7/7] Validando estabilidade local na porta 3010..."
sleep 5
for i in 1 2 3 4 5; do
  echo "--- Teste Local Home $i ---"
  curl -s -o /dev/null -w "Home: %{http_code} | Bytes: %{size_download}\n" http://127.0.0.1:3010/
  echo "--- Teste Local Categoria Feminino $i ---"
  curl -s -o /dev/null -w "Feminino: %{http_code} | Bytes: %{size_download}\n" http://127.0.0.1:3010/categoria/feminino
done

echo "📋 Logs recentes do vistabem-app:"
docker logs --tail 40 vistabem-app || true

echo "===================================================="
echo "✨ Deploy concluído com sucesso!"
echo "===================================================="
