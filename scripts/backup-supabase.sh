#!/bin/bash
# ============================================================
# Backup lógico do banco Supabase (rodar na VPS via cron)
# ============================================================
# Faz pg_dump das schemas de dados, compacta, faz rotação e (opcional)
# envia uma cópia offsite via rclone.
#
# Pré-requisitos na VPS:
#   - postgresql-client 17 (pg_dump compatível com o Supabase PG17)
#   - (offsite) rclone configurado com um remote (ex.: Backblaze B2)
#
# Configuração (variáveis de ambiente — use /etc/aivora-backup.env):
#   SUPABASE_DB_URL   (obrigatório)  string de conexão do Supabase (URI)
#   BACKUP_DIR        (opcional)     pasta local   [padrão /var/backups/aivora]
#   RETENCAO_DIAS     (opcional)     dias a manter [padrão 14]
#   RCLONE_REMOTE     (opcional)     destino offsite, ex.: "b2:meu-bucket/aivora"
#                                    se vazio, não envia offsite
set -euo pipefail

# Carrega segredos de um arquivo, se existir (mantém senha fora do cron/git)
if [ -f /etc/aivora-backup.env ]; then
  set -a; . /etc/aivora-backup.env; set +a
fi

BACKUP_DIR="${BACKUP_DIR:-/var/backups/aivora}"
RETENCAO_DIAS="${RETENCAO_DIAS:-14}"
RCLONE_REMOTE="${RCLONE_REMOTE:-}"
STAMP="$(date +%Y%m%d-%H%M%S)"
ARQUIVO="aivora-${STAMP}.sql.gz"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  log "ERRO: SUPABASE_DB_URL não definido (configure /etc/aivora-backup.env)"; exit 1
fi
command -v pg_dump >/dev/null || { log "ERRO: pg_dump não encontrado (instale postgresql-client-17)"; exit 1; }

mkdir -p "$BACKUP_DIR"

log "Iniciando backup → $BACKUP_DIR/$ARQUIVO"
# Dump das schemas com seus dados (negócio + acessos SaaS).
# auth/storage são gerenciados pelo Supabase e não entram aqui.
pg_dump "$SUPABASE_DB_URL" \
  --schema=aivora_rep --schema=public \
  --no-owner --no-privileges \
  | gzip > "$BACKUP_DIR/$ARQUIVO"

TAMANHO="$(du -h "$BACKUP_DIR/$ARQUIVO" | cut -f1)"
log "Dump concluído ($TAMANHO)"

# Envio offsite (opcional)
if [ -n "$RCLONE_REMOTE" ]; then
  if command -v rclone >/dev/null; then
    log "Enviando offsite → $RCLONE_REMOTE"
    rclone copy "$BACKUP_DIR/$ARQUIVO" "$RCLONE_REMOTE" --no-traverse
    # Rotação offsite: remove cópias com mais de N dias no remote
    rclone delete "$RCLONE_REMOTE" --min-age "${RETENCAO_DIAS}d" --include 'aivora-*.sql.gz' || true
    log "Offsite ok"
  else
    log "AVISO: RCLONE_REMOTE definido mas rclone não está instalado — pulando offsite"
  fi
fi

# Rotação local
find "$BACKUP_DIR" -name 'aivora-*.sql.gz' -mtime +"$RETENCAO_DIAS" -delete
log "Rotação local concluída (mantendo $RETENCAO_DIAS dias)"
log "Backup finalizado com sucesso."
