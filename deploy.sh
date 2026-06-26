#!/bin/bash
# Deploy com health-check e ROLLBACK AUTOMÁTICO — rodar no VPS após cada atualização.
# Se o build/start ou o health check (/api/health) falhar, reverte para o commit
# anterior, reconstrói e reinicia automaticamente.
#
# Variáveis sobrescrevíveis (export antes de rodar):
#   APP_DIR        diretório da app           (padrão /var/www/aivorasystem)
#   APP_NAME       nome do processo no pm2     (padrão aivorasystem)
#   HEALTH_URL     endpoint de health         (padrão http://localhost:3000/api/health)
#   HEALTH_RETRIES tentativas de health       (padrão 10)
#   HEALTH_DELAY   intervalo entre tentativas (padrão 3s)
set -uo pipefail

APP_DIR="${APP_DIR:-/var/www/aivorasystem}"
APP_NAME="${APP_NAME:-aivorasystem}"
HEALTH_URL="${HEALTH_URL:-http://localhost:3000/api/health}"
HEALTH_RETRIES="${HEALTH_RETRIES:-10}"
HEALTH_DELAY="${HEALTH_DELAY:-3}"

cd "$APP_DIR" || { echo "XXX Diretório $APP_DIR não encontrado"; exit 1; }

PREV_SHA="$(git rev-parse HEAD)"
echo "==> Commit atual (alvo de rollback): $PREV_SHA"

build_and_start() {
  echo "==> Instalando dependências..."
  npm ci --production=false || return 1
  echo "==> Gerando build..."
  npm run build || return 1
  echo "==> (Re)iniciando serviço..."
  export COMMIT_SHA="$(git rev-parse --short HEAD)"
  pm2 restart "$APP_NAME" --update-env || pm2 start ecosystem.config.js --update-env || return 1
  return 0
}

health_ok() {
  echo "==> Verificando health em $HEALTH_URL ..."
  local code
  for i in $(seq 1 "$HEALTH_RETRIES"); do
    code="$(curl -s -o /dev/null -w '%{http_code}' "$HEALTH_URL" 2>/dev/null || echo 000)"
    if [ "$code" = "200" ]; then
      echo "==> Health OK (HTTP 200) na tentativa $i"
      return 0
    fi
    echo "   tentativa $i/$HEALTH_RETRIES: HTTP $code — aguardando ${HEALTH_DELAY}s"
    sleep "$HEALTH_DELAY"
  done
  return 1
}

rollback() {
  echo "!!! Falha no deploy — revertendo para $PREV_SHA"
  git reset --hard "$PREV_SHA"
  if build_and_start && health_ok; then
    echo "==> Rollback concluído com sucesso. Versão restaurada: $(git rev-parse --short HEAD)"
    pm2 status
    exit 1
  fi
  echo "XXX Rollback TAMBÉM falhou no health — intervenção manual necessária."
  pm2 status
  exit 2
}

echo "==> Atualizando código (origin/main)..."
git fetch origin main || { echo "XXX git fetch falhou"; exit 1; }
git reset --hard origin/main

if ! build_and_start; then
  echo "!!! Build/start falhou"
  rollback
fi

if ! health_ok; then
  echo "!!! Health check falhou após o deploy"
  rollback
fi

echo "==> Deploy concluído e SAUDÁVEL! Versão: $(git rev-parse --short HEAD)"
pm2 status
