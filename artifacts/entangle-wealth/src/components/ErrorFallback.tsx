import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export default function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground text-sm">
            We ran into an unexpected issue loading this page. Please try again. If the problem persists, contact support.
          </p>
        </div>
        <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-left">
          <p className="text-xs font-mono text-red-400 break-all">
            {import.meta.env.DEV ? error.message : "An unexpected error occurred. Please try again."}
          </p>
        </div>
        <button
          onClick={resetErrorBoundary}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-black font-semibold hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    </div>
  );
}
