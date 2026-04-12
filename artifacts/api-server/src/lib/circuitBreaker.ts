import { logger } from "./logger";

type CircuitState = "closed" | "open" | "half-open";

interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeMs?: number;
  name: string;
}

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeMs: number;
  readonly name: string;

  constructor(options: CircuitBreakerOptions) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeMs = options.resetTimeMs ?? 60_000;
    this.name = options.name;
  }

  async execute<T>(fn: () => Promise<T>, fallback?: () => T): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime >= this.resetTimeMs) {
        this.state = "half-open";
        logger.info({ circuit: this.name }, "Circuit half-open, attempting probe");
      } else {
        if (fallback) return fallback();
        throw new Error(`Circuit breaker [${this.name}] is OPEN`);
      }
    }

    try {
      const result = await fn();
      this.failureCount = 0;
      if (this.state === "half-open") {
        this.state = "closed";
        logger.info({ circuit: this.name }, "Circuit closed after successful probe");
      }
      return result;
    } catch (err) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      const currentState = this.state;
      if (this.failureCount >= this.failureThreshold && currentState !== "open") {
        this.state = "open";
        logger.error(
          { circuit: this.name, failureCount: this.failureCount },
          "Circuit breaker OPENED after consecutive failures"
        );
      }

      if (fallback) return fallback();
      throw err;
    }
  }

  getState(): { name: string; state: CircuitState; failureCount: number; lastFailureTime: number } {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  reset(): void {
    this.state = "closed";
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }
}

export const alpacaCircuit = new CircuitBreaker({ name: "alpaca", failureThreshold: 5, resetTimeMs: 60_000 });
export const anthropicCircuit = new CircuitBreaker({ name: "anthropic", failureThreshold: 5, resetTimeMs: 60_000 });

const registeredCircuits: CircuitBreaker[] = [alpacaCircuit, anthropicCircuit];

export function registerCircuit(cb: CircuitBreaker): void {
  registeredCircuits.push(cb);
}

export function getAllCircuitStates() {
  return registeredCircuits.map((c) => c.getState());
}
