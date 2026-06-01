// Only initialize Sentry client-side SDK in production.
// In dev, this pulls in the entire @sentry/nextjs + replay SDK,
// adding ~100s to the first page compilation on 8GB machines.
if (process.env.NODE_ENV === "production") {
  import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      enabled: true,
      sendDefaultPii: true,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      integrations: [
        Sentry.replayIntegration(),
      ],
    });
  });
}

// Router transition tracking (no-op in dev)
export const onRouterTransitionStart = (...args: unknown[]) => {
  if (process.env.NODE_ENV === "production") {
    import("@sentry/nextjs").then((Sentry) => {
      Sentry.captureRouterTransitionStart(...(args as Parameters<typeof Sentry.captureRouterTransitionStart>));
    });
  }
};

