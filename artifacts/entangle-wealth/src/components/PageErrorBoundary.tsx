import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  errorMessage?: string;
}

export class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error?.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex flex-col items-center justify-center py-10 px-4 text-center gap-3"
          style={{
            background: "rgba(239,68,68,0.03)",
            border: "1px solid rgba(239,68,68,0.10)",
          }}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400/50" />
            <span className="text-xs font-mono text-white/50">
              {this.props.fallbackTitle ?? "Module unavailable"}
            </span>
          </div>
          <p className="text-[11px] text-white/30 max-w-xs">
            This section encountered an error. Other modules continue working normally.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono text-white/40 hover:text-white/70 transition-colors"
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
