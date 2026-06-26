// Métricas de performance do processo (tempo de vida, memória, CPU).
// Usado pelo health check e disponível para qualquer rota.

function round(n: number) {
  return Math.round(n * 10) / 10
}
function mb(bytes: number) {
  return round(bytes / 1024 / 1024)
}

export function collectSystemMetrics() {
  const mem = process.memoryUsage()
  const cpu = process.cpuUsage()
  return {
    uptime_s: round(process.uptime()),
    memory_mb: {
      rss: mb(mem.rss),
      heapUsed: mb(mem.heapUsed),
      heapTotal: mb(mem.heapTotal),
      external: mb(mem.external),
    },
    cpu_s: {
      user: round(cpu.user / 1e6),
      system: round(cpu.system / 1e6),
    },
    node: process.version,
    pid: process.pid,
  }
}
