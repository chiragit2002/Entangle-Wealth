import { Component, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

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
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-white/30" />
          </div>
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-white/70">
              {this.props.fallbackTitle ?? "Something went wrong"}
            </h2>
            <p className="text-sm text-white/40 max-w-sm">
              This section encountered an error. Your data is safe — try refreshing.
            </p>
          </div>
          <button
            onClick={() => {
              this.setState({ hasError: false });
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white/60 hover:text-white hover:bg-white/[0.10] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
