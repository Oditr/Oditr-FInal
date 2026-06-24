// ── Oditr Intelligence Engine — Structured Logger ──
// Lightweight structured logging with namespace prefixes.
// All intelligence modules use this for consistent, filterable output.

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  namespace: string
  message: string
  data?: Record<string, unknown>
  timestamp: string
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

// Default minimum level — can be overridden via env
const MIN_LEVEL: LogLevel =
  (process.env.VITALFIX_LOG_LEVEL as LogLevel) || 'info'

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL]
}

function formatEntry(entry: LogEntry): string {
  const prefix = `[${entry.namespace}]`
  const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : ''
  return `${prefix} ${entry.message}${dataStr}`
}

/**
 * Create a namespaced logger for an intelligence module.
 *
 * Usage:
 *   const log = createLogger('intelligence:framework')
 *   log.info('Detected Next.js', { confidence: 85 })
 *   // Output: [intelligence:framework] Detected Next.js {"confidence":85}
 */
export function createLogger(namespace: string) {
  const emit = (level: LogLevel, message: string, data?: Record<string, unknown>) => {
    if (!shouldLog(level)) return

    const entry: LogEntry = {
      level,
      namespace,
      message,
      data,
      timestamp: new Date().toISOString(),
    }

    const formatted = formatEntry(entry)

    switch (level) {
      case 'debug':
        console.debug(formatted)
        break
      case 'info':
        console.log(formatted)
        break
      case 'warn':
        console.warn(formatted)
        break
      case 'error':
        console.error(formatted)
        break
    }
  }

  return {
    debug: (msg: string, data?: Record<string, unknown>) => emit('debug', msg, data),
    info: (msg: string, data?: Record<string, unknown>) => emit('info', msg, data),
    warn: (msg: string, data?: Record<string, unknown>) => emit('warn', msg, data),
    error: (msg: string, data?: Record<string, unknown>) => emit('error', msg, data),
  }
}
