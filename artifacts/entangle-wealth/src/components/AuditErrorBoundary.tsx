import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  countdown: number;
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
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, countdown: 5 };

    if (typeof window !== "undefined") {
      installGlobalHandlers();
    }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true, countdown: 5 };
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

    this.intervalId = setInterval(() => {
      this.setState((s) => {
        if (s.countdown <= 1) {
          clearInterval(this.intervalId!);
          window.location.href = "/dashboard";
          return s;
        }
        return { ...s, countdown: s.countdown - 1 };
      });
    }, 1000);
  }

  componentWillUnmount() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0A0E1A",
          color: "#00FF41",
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          padding: "2rem",
        }}
      >
        <pre
          style={{
            fontSize: "clamp(11px, 1.5vw, 14px)",
            lineHeight: 1.8,
            whiteSpace: "pre-wrap",
            maxWidth: "640px",
            textAlign: "left",
          }}
        >
          {`> SYSTEM ENCOUNTERED AN ERROR
> LOGGING FOR REVIEW
> REDIRECTING IN ${this.state.countdown} SECOND${this.state.countdown !== 1 ? "S" : ""}...

> [AUDIT] Error captured and logged.
> [AUDIT] Recovery initiated.`}
        </pre>
        <div
          style={{
            marginTop: "2rem",
            width: "100%",
            maxWidth: "640px",
            height: "2px",
            background: "#1a3a2a",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              height: "100%",
              width: `${((5 - this.state.countdown) / 5) * 100}%`,
              background: "#00FF41",
              transition: "width 1s linear",
            }}
          />
        </div>
        <button
          onClick={() => (window.location.href = "/dashboard")}
          style={{
            marginTop: "1.5rem",
            padding: "0.5rem 1.5rem",
            background: "transparent",
            border: "1px solid #00FF41",
            color: "#00FF41",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: "12px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          &gt; REDIRECT NOW
        </button>
      </div>
    );
  }
}
