import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage?: string;
}

function getSessionId(): string {
  let id = sessionStorage.getItem("ew_session_id");
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem("ew_session_id", id);
  }
  return id;
}

async function logAuditError(payload: {
  pageUrl: string;
  issueType: string;
  severity: string;
  componentName?: string;
  errorMessage?: string;
  sessionId?: string;
}) {
  try {
    await fetch("/api/audit/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // best effort
  }
}

let globalHandlersInstalled = false;

function installGlobalHandlers() {
  if (globalHandlersInstalled) return;
  globalHandlersInstalled = true;

  window.addEventListener("error", (event) => {
    const message = event.error instanceof Error
      ? `${event.error.name}: ${event.error.message}`
      : event.message || "Unknown JS runtime error";

    logAuditError({
      pageUrl: window.location.pathname,
      issueType: "js_runtime_error",
      severity: "HIGH",
      componentName: event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : undefined,
      errorMessage: message,
      sessionId: getSessionId(),
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? `UnhandledPromise: ${reason.name}: ${reason.message}`
        : `UnhandledPromise: ${String(reason)}`;

    logAuditError({
      pageUrl: window.location.pathname,
      issueType: "unhandled_promise_rejection",
      severity: "HIGH",
      errorMessage: message,
      sessionId: getSessionId(),
    });
  });
}

export class AuditErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };

    if (typeof window !== "undefined") {
      installGlobalHandlers();
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error?.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const componentName = info.componentStack?.split("\n")[1]?.trim() ?? undefined;

    logAuditError({
      pageUrl: window.location.pathname,
      issueType: "react_crash",
      severity: "HIGH",
      componentName,
      errorMessage: `${error.name}: ${error.message}`,
      sessionId: getSessionId(),
    });
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        style={{
          minHeight: "100vh",
          background: "hsl(var(--card))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: "480px", width: "100%" }}>
          <div
            style={{
              padding: "1.5rem",
              border: "1px solid rgba(239,68,68,0.15)",
              background: "rgba(239,68,68,0.04)",
              fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <AlertTriangle style={{ width: "16px", height: "16px", color: "rgba(239,68,68,0.6)" }} />
              <span style={{ fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(239,68,68,0.6)" }}>
                Unhandled Error
              </span>
            </div>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
              A critical error occurred. The error has been logged automatically.
              {this.state.errorMessage && import.meta.env.DEV && (
                <span style={{ display: "block", marginTop: "0.5rem", color: "rgba(239,68,68,0.5)", fontSize: "11px", wordBreak: "break-all" }}>
                  {this.state.errorMessage}
                </span>
              )}
            </p>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={() => this.setState({ hasError: false })}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  padding: "0.375rem 0.875rem",
                  background: "#00B4D8",
                  color: "#0A0E1A",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                <RefreshCw style={{ width: "12px", height: "12px" }} />
                Retry
              </button>
              <button
                onClick={() => (window.location.href = "/dashboard")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  padding: "0.375rem 0.875rem",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.4)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: "11px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                <Home style={{ width: "12px", height: "12px" }} />
                Dashboard
              </button>
            </div>
          </div>
          <div style={{ marginTop: "0.5rem", fontSize: "9px", fontFamily: "inherit", color: "rgba(255,255,255,0.12)", letterSpacing: "0.1em" }}>
            ENTANGLEWEALTH · ERROR CAPTURED · AUDIT LOGGED
          </div>
        </div>
      </div>
    );
  }
}
