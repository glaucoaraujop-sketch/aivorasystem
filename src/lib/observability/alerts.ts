import { logger, serializeError, type LogFields } from './logger'

// Alertas de anomalia. Sempre registra em log estruturado; se ALERT_WEBHOOK_URL
// estiver configurado, dispara um POST para um workflow n8n (que decide o
// destino final: WhatsApp, e-mail, etc.). Envio é "fire-and-forget".
const WEBHOOK = process.env.ALERT_WEBHOOK_URL

export type AlertLevel = 'warning' | 'critical'

export async function sendAlert(level: AlertLevel, title: string, fields: LogFields = {}): Promise<void> {
  // 1) Sempre loga (serve de trilha mesmo sem webhook)
  const logFn = level === 'critical' ? logger.error : logger.warn
  logFn('alert', { alert: title, level, ...fields })

  // 2) Dispara webhook se configurado
  if (!WEBHOOK) return
  try {
    await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service: 'rep-moveis',
        level,
        title,
        ts: new Date().toISOString(),
        ...fields,
      }),
      signal: AbortSignal.timeout(4000),
    })
  } catch (e) {
    logger.warn('alert.webhook_falhou', { error: serializeError(e) })
  }
}
