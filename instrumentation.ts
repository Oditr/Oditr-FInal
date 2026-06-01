export async function register() {
  // Only register Sentry instrumentation in production
  // In dev, this pulls in @sentry/node + @opentelemetry (~120MB) and kills performance
  if (process.env.NODE_ENV !== 'production') return

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = (...args: unknown[]) => {
  // Only capture in production
  if (process.env.NODE_ENV !== 'production') return
  import("@sentry/nextjs").then((Sentry) => {
    Sentry.captureRequestError(...(args as Parameters<typeof Sentry.captureRequestError>))
  })
}

