import express, { type Express } from "express";
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
import router from "./routes";
import seoRouter from "./routes/seo";
import { logger } from "./lib/logger";

const app: Express = express();

app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
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

app.use(compression());

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
  skip: (req) => req.path.startsWith(CLERK_PROXY_PATH) || req.path === "/api/stripe/webhook",
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

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(csrfProtection);
app.use(inputSanitizer);

app.use("/api/users", bruteForceGuard);
app.use("/api/kyc", bruteForceGuard);
app.use("/api/stripe", bruteForceGuard);

app.use(clerkMiddleware());

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

app.use(seoRouter);
app.use("/api", router);

export default app;
