import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initSentry } from "./lib/sentry";
import { initInteractionSignals } from "./lib/interactionSignals";

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
        }
      });
  });
}
