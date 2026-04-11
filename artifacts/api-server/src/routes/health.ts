import { Router, type IRouter } from "express";
import { getAuthEventStats } from "../lib/authEventLogger";

const router: IRouter = Router();

const startTime = Date.now();
let activeConnections = 0;

export function trackConnections(server: any): void {
  server.on("connection", (socket: any) => {
    activeConnections++;
    socket.on("close", () => {
      activeConnections--;
    });
  });
}

router.get("/healthz", (_req, res) => {
  const mem = process.memoryUsage();
  const uptimeMs = Date.now() - startTime;
  const uptimeSeconds = Math.floor(uptimeMs / 1000);
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = uptimeSeconds % 60;

  res.json({
    status: "ok",
    uptime: {
      seconds: uptimeSeconds,
      formatted: `${hours}h ${minutes}m ${seconds}s`,
    },
    memory: {
      rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(mem.external / 1024 / 1024)}MB`,
    },
    connections: activeConnections,
    node: process.version,
    platform: process.platform,
    auth: getAuthEventStats(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
