import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initSentry, Sentry } from "./lib/sentry";
import { initInteractionSignals } from "./lib/interactionSignals";

// production error tracking with privacy safeguards, completely disabled in dev.
initSentry();
initInteractionSignals();

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((err) => {
        if (import.meta.env.DEV) {
          console.warn("[SW] Registration failed (non-fatal):", err);
        } else {
          console.error("[SW] Registration failed:", err);
          Sentry.captureException(err, { tags: { context: "service_worker_registration" } });
        }
      });
  });
}
