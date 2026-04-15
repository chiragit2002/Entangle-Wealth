import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";

export type ConnectionState = "connected" | "degraded" | "disconnected";

interface ConnectionContextValue {
  state: ConnectionState;
  lastUpdated: number | null;
  reportSuccess: () => void;
  reportError: () => void;
  reportDegraded: () => void;
}

const ConnectionContext = createContext<ConnectionContextValue>({
  state: "connected",
  lastUpdated: null,
  reportSuccess: () => {},
  reportError: () => {},
  reportDegraded: () => {},
});

export function useConnection() {
  return useContext(ConnectionContext);
}

interface Props {
  children: ReactNode;
}

const DEGRADED_THRESHOLD = 2;
const DISCONNECTED_THRESHOLD = 5;
const RECOVERY_TIMEOUT_MS = 30_000;

export function ConnectionProvider({ children }: Props) {
  const [state, setState] = useState<ConnectionState>("connected");
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const errorCountRef = useRef(0);
  const recoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRecoveryTimer = () => {
    if (recoveryTimerRef.current) {
      clearTimeout(recoveryTimerRef.current);
      recoveryTimerRef.current = null;
    }
  };

  const scheduleRecoveryCheck = useCallback(() => {
    clearRecoveryTimer();
    recoveryTimerRef.current = setTimeout(() => {
      setState((prev) => {
        if (prev === "disconnected") return "degraded";
        return prev;
      });
    }, RECOVERY_TIMEOUT_MS);
  }, []);

  const reportSuccess = useCallback(() => {
    errorCountRef.current = 0;
    setLastUpdated(Date.now());
    clearRecoveryTimer();
    setState("connected");
  }, []);

  const reportDegraded = useCallback(() => {
    errorCountRef.current = Math.max(errorCountRef.current, DEGRADED_THRESHOLD);
    setState("degraded");
    scheduleRecoveryCheck();
  }, [scheduleRecoveryCheck]);

  const reportError = useCallback(() => {
    errorCountRef.current += 1;
    const count = errorCountRef.current;
    if (count >= DISCONNECTED_THRESHOLD) {
      setState("disconnected");
    } else if (count >= DEGRADED_THRESHOLD) {
      setState("degraded");
    }
    scheduleRecoveryCheck();
  }, [scheduleRecoveryCheck]);

  useEffect(() => {
    return () => clearRecoveryTimer();
  }, []);

  return (
    <ConnectionContext.Provider value={{ state, lastUpdated, reportSuccess, reportError, reportDegraded }}>
      {children}
    </ConnectionContext.Provider>
  );
}
