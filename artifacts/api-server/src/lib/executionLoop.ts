import { logger } from "./logger";
import type { Orchestrator, OrchestratorInput, OrchestratorResult } from "./agents/Orchestrator";
import type { ExecutionAgent, ExecuteOutcome, ExecutionDecision } from "./agents/ExecutionAgent";
import type { ExchangeAdapter } from "./exchange/ExchangeAdapter";
import type { KillSwitchResult } from "./agents/KillSwitchAgent";

export interface ExecutionLoopEntry {
  input: OrchestratorInput;
  orchestratorResult: OrchestratorResult | null;
  outcome: ExecuteOutcome;
  killSwitchOverridden: boolean;
  timestamp: string;
  durationMs: number;
}

export interface ExecutionLoopOptions {
  defaultShareSize?: number;
  stopOnError?: boolean;
}

export async function runExecutionLoop(
  orchestrator: Orchestrator,
  executionAgent: ExecutionAgent,
  adapter: ExchangeAdapter,
  stream: AsyncIterable<OrchestratorInput>,
  options: ExecutionLoopOptions = {},
): Promise<ExecutionLoopEntry[]> {
  const { defaultShareSize = 1, stopOnError = false } = options;
  const results: ExecutionLoopEntry[] = [];

  for await (const input of stream) {
    const cycleStart = Date.now();
    const timestamp = new Date().toISOString();

    try {
      const orchestratorResult = await orchestrator.runCycle(input);
      const { killSwitch } = orchestratorResult;

      let decision: ExecutionDecision = orchestratorResult.decision;
      let killSwitchOverridden = false;

      if (killSwitch.triggered && decision.action !== "EXIT") {
        killSwitchOverridden = true;
        decision = {
          ...decision,
          action: "EXIT",
          rationale: `[KILL SWITCH] ${killSwitch.reasons.join("; ")} | Original: ${decision.rationale}`,
          score: 0,
        };
        logger.warn(
          { strategyId: input.strategyId, symbol: input.symbol, reasons: killSwitch.reasons },
          "[ExecutionLoop] Kill switch active — forcing EXIT inline",
        );
      }

      let outcome: ExecuteOutcome;

      try {
        outcome = await executionAgent.execute(decision, adapter, defaultShareSize);
      } catch (execErr) {
        logger.error({ execErr, strategyId: input.strategyId, symbol: input.symbol }, "[ExecutionLoop] Execution error");
        if (stopOnError) throw execErr;
        outcome = { routed: false, reason: `execution error: ${String(execErr)}` };
      }

      const durationMs = Date.now() - cycleStart;
      const entry: ExecutionLoopEntry = {
        input,
        orchestratorResult,
        outcome,
        killSwitchOverridden,
        timestamp,
        durationMs,
      };

      results.push(entry);

      logger.info(
        {
          strategyId: input.strategyId,
          symbol: input.symbol,
          action: decision.action,
          routed: outcome.routed,
          killSwitchOverridden,
          durationMs,
        },
        "[ExecutionLoop] Cycle complete",
      );
    } catch (cycleErr) {
      logger.error({ cycleErr, strategyId: input.strategyId, symbol: input.symbol }, "[ExecutionLoop] Cycle failed");
      if (stopOnError) throw cycleErr;

      results.push({
        input,
        orchestratorResult: null,
        outcome: { routed: false, reason: `cycle error: ${String(cycleErr)}` },
        killSwitchOverridden: false,
        timestamp,
        durationMs: Date.now() - cycleStart,
      });
    }
  }

  return results;
}

export async function* asyncIterableFromArray<T>(items: T[]): AsyncIterable<T> {
  for (const item of items) {
    yield item;
  }
}

export function buildKillSwitchSummary(killSwitch: KillSwitchResult): string {
  if (!killSwitch.triggered) return "ALLOW";
  return `EXIT: ${killSwitch.reasons.join("; ")}`;
}
