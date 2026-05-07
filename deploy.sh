#!/bin/bash
# Script de deploy — rodar no VPS após cada atualização
set -e

APP_DIR="/var/www/aivorasystem"

echo "==> Atualizando código..."
cd $APP_DIR
git pull origin main

echo "==> Instalando dependências..."
npm ci --production=false

echo "==> Gerando build..."
npm run build

echo "==> Reiniciando serviço..."
pm2 restart aivorasystem || pm2 start ecosystem.config.js

echo "==> Deploy concluído!"
pm2 status
