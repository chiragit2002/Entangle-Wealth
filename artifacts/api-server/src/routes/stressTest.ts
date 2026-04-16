/**
 * Stress Test Internal Routes
 * Only active when NODE_ENV !== "production".
 * Provides endpoints that allow stress tests to inject failures and verify
 * resilience mechanisms without mocking external dependencies.
 */
import { Router } from "express";
import { alpacaCircuit, anthropicCircuit, getAllCircuitStates } from "../lib/circuitBreaker";
import { aiQueue } from "../lib/aiQueue";
import { logger } from "../lib/logger";

const router = Router();

if (process.env.NODE_ENV === "production") {
  router.all("/{*path}", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });
} else {
  router.get("/stress-test/circuit-states", (_req, res) => {
    res.json({ circuits: getAllCircuitStates() });
  });

  router.post("/stress-test/circuit-breaker/inject-failures", async (_req, res) => {
    const results = [];
    for (let i = 0; i < 5; i++) {
      try {
        await alpacaCircuit.execute(() => Promise.reject(new Error("Injected failure")));
      } catch {
        results.push({ attempt: i + 1, state: alpacaCircuit.getState() });
      }
    }
    res.json({
      message: "Injected 5 failures into alpaca circuit",
      finalState: alpacaCircuit.getState(),
      steps: results,
    });
  });

  router.post("/stress-test/circuit-breaker/reset", (_req, res) => {
    alpacaCircuit.reset();
    anthropicCircuit.reset();
    res.json({ message: "Circuits reset", states: getAllCircuitStates() });
  });

  router.get("/stress-test/ai-queue/status", (_req, res) => {
    res.json({ aiQueue: aiQueue.getStatus() });
  });

  router.post("/stress-test/ai-queue/flood", async (_req, res) => {
    const FLOOD_COUNT = 60;
    const counts = { queued: 0, rejected: 0, errors: [] as string[] };

    const promises = [];
    for (let i = 0; i < FLOOD_COUNT; i++) {
      const p = aiQueue.enqueue(() =>
        new Promise<string>(resolve => setTimeout(() => resolve(`task-${i}`), 50))
      )
        .then(() => { counts.queued++; })
        .catch((err: Error) => {
          if (err.message?.includes("queue is full") || (err as NodeJS.ErrnoException).code === "QUEUE_FULL") {
            counts.rejected++;
          } else {
            counts.errors.push(err.message);
          }
        });
      promises.push(p);
    }

    await Promise.all(promises);

    res.json({
      flooded: FLOOD_COUNT,
      queued: counts.queued,
      rejected: counts.rejected,
      errors: counts.errors.slice(0, 5),
      finalQueueStatus: aiQueue.getStatus(),
    });
  });
}

export default router;
