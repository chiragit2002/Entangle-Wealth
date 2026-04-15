import { Router } from "express";
import { logger } from "../lib/logger.js";
import { runQuantEngine, getEngineStatus, getCachedSignals } from "../lib/quantEngine/index.js";

const router = Router();

router.get("/quant/signals", async (req, res) => {
  try {
    const signals = getCachedSignals();

    if (signals.length === 0) {
      const fresh = await runQuantEngine(false);
      res.json({
        signals: fresh,
        meta: {
          count: fresh.length,
          generatedAt: getEngineStatus().lastRunAt,
          cached: false,
        },
      });
      return;
    }

    res.json({
      signals,
      meta: {
        count: signals.length,
        generatedAt: getEngineStatus().lastRunAt,
        cached: true,
      },
    });
  } catch (err) {
    logger.error({ err }, "GET /quant/signals failed");
    res.status(502).json({ error: "Failed to fetch quant signals" });
  }
});

router.get("/quant/status", (_req, res) => {
  try {
    const status = getEngineStatus();
    res.json(status);
  } catch (err) {
    logger.error({ err }, "GET /quant/status failed");
    res.status(500).json({ error: "Failed to get engine status" });
  }
});

router.post("/quant/run", async (req, res) => {
  try {
    const status = getEngineStatus();
    if (status.isRunning) {
      res.status(409).json({ error: "Engine is already running", status });
      return;
    }

    logger.info("POST /quant/run: manual trigger");

    res.json({ message: "Engine run triggered", status: getEngineStatus() });

    runQuantEngine(true).catch(err =>
      logger.error({ err }, "POST /quant/run: background run failed"),
    );
  } catch (err) {
    logger.error({ err }, "POST /quant/run failed");
    res.status(500).json({ error: "Failed to trigger engine run" });
  }
});

export default router;
