/**
 * Clerk Frontend API Proxy Middleware
 *
 * Proxies Clerk Frontend API requests through your domain, enabling Clerk
 * authentication on custom domains and .replit.app deployments without
 * requiring CNAME DNS configuration.
 *
 * See: https://clerk.com/docs/guides/dashboard/dns-domains/proxy-fapi
 *
 * IMPORTANT:
 * - Only active in production (Clerk proxying doesn't work for dev instances)
 * - Must be mounted BEFORE express.json() middleware
 *
 * Usage in app.ts:
 *   import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
 *   app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
 */

import { createProxyMiddleware } from "http-proxy-middleware";
import type { RequestHandler } from "express";

const CLERK_FAPI = "https://frontend-api.clerk.dev";
export const CLERK_PROXY_PATH = "/api/__clerk";

export function validateClerkEnv(): void {
  const missingServer: string[] = [];
  if (!process.env.CLERK_SECRET_KEY) missingServer.push("CLERK_SECRET_KEY");

  if (missingServer.length > 0) {
    console.warn(
      `[Clerk] Missing server-side env vars: ${missingServer.join(", ")}. ` +
      "Authentication will not function in production. " +
      "Required variables: CLERK_SECRET_KEY (server), " +
      "VITE_CLERK_PUBLISHABLE_KEY (frontend), VITE_CLERK_PROXY_URL (frontend)."
    );
  } else if (process.env.NODE_ENV === "production") {
    console.info("[Clerk] CLERK_SECRET_KEY is set. FAPI proxy is active.");
  }
}

export function clerkProxyMiddleware(): RequestHandler {
  // Only run proxy in production — Clerk proxying doesn't work for dev instances
  if (process.env.NODE_ENV !== "production") {
    return (_req, _res, next) => next();
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    console.warn("[Clerk] CLERK_SECRET_KEY is not set — FAPI proxy disabled. Set CLERK_SECRET_KEY, VITE_CLERK_PUBLISHABLE_KEY, and VITE_CLERK_PROXY_URL for production auth.");
    return (_req, _res, next) => next();
  }

  return createProxyMiddleware({
    target: CLERK_FAPI,
    changeOrigin: true,
    pathRewrite: (path: string) =>
      path.replace(new RegExp(`^${CLERK_PROXY_PATH}`), ""),
    on: {
      proxyReq: (proxyReq, req) => {
        const protocol = req.headers["x-forwarded-proto"] || "https";
        const host = req.headers.host || "";
        const proxyUrl = `${protocol}://${host}${CLERK_PROXY_PATH}`;

        proxyReq.setHeader("Clerk-Proxy-Url", proxyUrl);
        proxyReq.setHeader("Clerk-Secret-Key", secretKey);

        const xff = req.headers["x-forwarded-for"];
        const clientIp =
          (Array.isArray(xff) ? xff[0] : xff)?.split(",")[0]?.trim() ||
          req.socket?.remoteAddress ||
          "";
        if (clientIp) {
          proxyReq.setHeader("X-Forwarded-For", clientIp);
        }
      },
    },
  }) as RequestHandler;
}
