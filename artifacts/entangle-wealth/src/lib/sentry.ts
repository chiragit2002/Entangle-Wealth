import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN;
const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT || "development";
const isDev = import.meta.env.DEV;

export function initSentry() {
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: isDev ? 0 : 0.1,
    replaysSessionSampleRate: isDev ? 0 : 0.1,
    replaysOnErrorSampleRate: isDev ? 0 : 1.0,
    beforeSend(event) {
      scrubSensitiveData(event);
      return event;
    },
    beforeSendTransaction(event) {
      return event;
    },
  });
}

function scrubSensitiveData(event: Sentry.ErrorEvent): void {
  if (event.request?.headers) {
    delete event.request.headers["Authorization"];
    delete event.request.headers["Cookie"];
    delete event.request.headers["cookie"];
  }

  if (event.extra) {
    for (const key of Object.keys(event.extra)) {
      const lower = key.toLowerCase();
      if (
        lower.includes("key") ||
        lower.includes("token") ||
        lower.includes("secret") ||
        lower.includes("password") ||
        lower.includes("auth")
      ) {
        event.extra[key] = "[Filtered]";
      }
    }
  }
}

export { Sentry };
