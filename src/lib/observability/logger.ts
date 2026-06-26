// Logging estruturado em JSON (uma linha por evento) — pronto para coletores
// de log (EasyPanel/Docker capturam stdout). Nunca usar console.log solto.

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type LogFields = Record<string, unknown>

const SERVICE = 'rep-moveis'

// Serializa um erro preservando nome, mensagem e stack trace completo.
export function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...((err as any).cause ? { cause: String((err as any).cause) } : {}),
    }
  }
  return { message: String(err) }
}

function emit(level: LogLevel, msg: string, fields: LogFields) {
  const entry = { ts: new Date().toISOString(), level, service: SERVICE, msg, ...fields }
  const line = JSON.stringify(entry)
  if (level === 'error' || level === 'warn') console.error(line)
  else console.log(line)
}

export interface Logger {
  debug: (msg: string, fields?: LogFields) => void
  info: (msg: string, fields?: LogFields) => void
  warn: (msg: string, fields?: LogFields) => void
  error: (msg: string, fields?: LogFields) => void
  child: (base: LogFields) => Logger
}

// Cria um logger que sempre inclui os campos base (ex: requestId, endpoint).
export function createLogger(base: LogFields = {}): Logger {
  const make = (level: LogLevel) => (msg: string, fields: LogFields = {}) =>
    emit(level, msg, { ...base, ...fields })
  return {
    debug: make('debug'),
    info: make('info'),
    warn: make('warn'),
    error: make('error'),
    child: (more: LogFields) => createLogger({ ...base, ...more }),
  }
}

// Logger global (sem contexto de request) para uso fora de rotas.
export const logger = createLogger()
