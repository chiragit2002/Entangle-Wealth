import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
import { inputSanitizer } from "./middlewares/inputSanitizer";
import { bruteForceGuard } from "./middlewares/bruteForce";
import { csrfProtection } from "./middlewares/csrfProtection";
import { authEventTracker } from "./middlewares/authEventTracker";
import { metricsMiddleware } from "./middlewares/metricsMiddleware";
import { globalErrorHandler } from "./middlewares/errorHandler";
import {
  userApiLimiter,
  userAiLimiter,
  userTradingLimiter,
  userKycLimiter,
} from "./middlewares/userRateLimit";
import { trackSensitiveEndpointAccess, trackUserRequest } from "./lib/authEventLogger";
import router from "./routes";
import seoRouter from "./routes/seo";
import { logger } from "./lib/logger";
import { getAuth } from "@clerk/express";

const app: Express = express();

app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "https://*.clerk.accounts.dev",
          "https://js.stripe.com",
          "https://challenges.cloudflare.com",
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
        connectSrc: [
          "'self'",
          "https://*.clerk.accounts.dev",
          "https://api.stripe.com",
          "https://data.alpaca.markets",
          "https://paper-api.alpaca.markets",
          "wss://stream.data.alpaca.markets",
          "https://*.replit.dev",
          "https://*.replit.app",
          "https://*.repl.co",
        ],
        frameSrc: [
          "'self'",
          "https://*.clerk.accounts.dev",
          "https://js.stripe.com",
          "https://challenges.cloudflare.com",
        ],
        workerSrc: ["'self'", "blob:"],
        childSrc: ["'self'", "blob:"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'", "https://*.replit.dev", "https://*.replit.app", "https://*.repl.co"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xContentTypeOptions: true,
    xDnsPrefetchControl: { allow: false },
    xDownloadOptions: true,
    xFrameOptions: false,
    xPermittedCrossDomainPolicies: { permittedPolicies: "none" },
    xPoweredBy: false,
    xXssProtection: true,
  })
);

app.use(compression({
  filter: (req) => {
    if (req.path === "/api/alerts/stream") return false;
    return true;
  },
}));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
  skip: (req) => req.path.startsWith(CLERK_PROXY_PATH) || req.path === "/api/stripe/webhook" || req.path === "/api/alerts/stream",
});
app.use(apiLimiter);

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "AI rate limit exceeded. Please wait before trying again." },
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(metricsMiddleware);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

const allowedOrigins = new Set<string>();
const replitDomains = process.env.REPLIT_DOMAINS?.split(",") || [];
for (const d of replitDomains) {
  allowedOrigins.add(`https://${d.trim()}`);
}
const replitDevDomain = process.env.REPLIT_DEV_DOMAIN;
if (replitDevDomain) {
  allowedOrigins.add(`https://${replitDevDomain}`);
}
allowedOrigins.add("http://localhost");
for (let p = 3000; p <= 3010; p++) {
  allowedOrigins.add(`http://localhost:${p}`);
}
const envPort = process.env.PORT;
if (envPort) {
  allowedOrigins.add(`http://localhost:${envPort}`);
}

app.use(cors({
  credentials: true,
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(csrfProtection);
app.use(inputSanitizer);

app.use("/api/auth", bruteForceGuard);
app.use("/api/users", bruteForceGuard);
app.use("/api/kyc", bruteForceGuard);
app.use("/api/stripe", bruteForceGuard);

app.use(clerkMiddleware());
app.use(authEventTracker);

app.use((req, _res, next) => {
  const auth = getAuth(req);
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const fullPath = req.originalUrl.split("?")[0];
  trackSensitiveEndpointAccess(auth?.userId ?? undefined, ip, fullPath);
  if (auth?.userId) {
    trackUserRequest(auth.userId, fullPath);
  }
  next();
});

app.use("/api/taxgpt", aiLimiter);
app.use("/api/analyze-document", aiLimiter);
app.use("/api/analyze", aiLimiter);
app.use("/api/marketing/generate", rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Marketing AI rate limit exceeded. Max 5 requests per minute." },
}));

app.use("/api/taxgpt", userAiLimiter);
app.use("/api/analyze-document", userAiLimiter);
app.use("/api/analyze", userAiLimiter);
app.use("/api/paper-trading", userTradingLimiter);
app.use("/api/kyc", userKycLimiter);
app.use("/api", userApiLimiter);

app.use(seoRouter);
app.use("/api", seoRouter);
app.use("/api", router);

app.use(globalErrorHandler);

export default app;
