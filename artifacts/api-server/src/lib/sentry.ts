import * as Sentry from "@sentry/node";

const dsn = process.env.SENTRY_DSN;
const environment = process.env.SENTRY_ENVIRONMENT || "development";

export function initSentry() {
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: environment === "production" ? 0.1 : 0,
    beforeSend(event) {
      scrubSensitiveData(event);
      return event;
    },
  });
}

function scrubSensitiveData(event: Sentry.ErrorEvent): void {
  if (event.request?.headers) {
    delete event.request.headers["authorization"];
    delete event.request.headers["Authorization"];
    delete event.request.headers["cookie"];
    delete event.request.headers["Cookie"];
    delete event.request.headers["x-csrf-token"];
    delete event.request.headers["X-CSRF-Token"];
  }

  if (event.request?.cookies) {
    event.request.cookies = {};
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
