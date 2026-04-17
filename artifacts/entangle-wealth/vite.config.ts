import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
// import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { sentryVitePlugin } from "@sentry/vite-plugin";

const rawPort = process.env.PORT;

const port = rawPort ? Number(rawPort) : 3000;

if (rawPort && (Number.isNaN(port) || port <= 0)) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  envDir: path.resolve(import.meta.dirname, "..", ".."),
  envPrefix: "VITE_",
  plugins: [
    react(),
    tailwindcss(),
    // runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
    ...(process.env.NODE_ENV === "production" && process.env.SENTRY_AUTH_TOKEN
      ? [
          sentryVitePlugin({
            org: "entaglewealth",
            project: "entangle-wealth-frontend",
            authToken: process.env.SENTRY_AUTH_TOKEN,
            sourcemaps: {
              filesToDeleteAfterUpload: ["./dist/public/**/*.js.map"],
            },
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
      "@solana/web3.js": path.resolve(import.meta.dirname, "src/stubs/solana.ts"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV === "production" ? "hidden" : false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-")) {
            return "vendor-recharts";
          }
          if (id.includes("node_modules/lightweight-charts")) {
            return "vendor-lightweight-charts";
          }
          if (id.includes("node_modules/lucide-react")) {
            return "vendor-lucide";
          }
          if (id.includes("node_modules/jspdf") || id.includes("node_modules/html2canvas")) {
            return "vendor-pdf";
          }
          if (id.includes("node_modules/@clerk")) {
            return "vendor-clerk";
          }
          if (id.includes("node_modules/@sentry")) {
            return "vendor-sentry";
          }
          if (id.includes("node_modules/@tanstack/react-query")) {
            return "vendor-react-query";
          }
          if (id.includes("node_modules/react-dom") || id.includes("node_modules/react/")) {
            return "vendor-react";
          }
        },
      },
    },
  },
  optimizeDeps: {
    exclude: [
      "@solana/web3.js",
      "@solana/wallet-adapter-react",
      "@solana/wallet-adapter-base",
      "@solana/wallet-standard",
      "@solana-mobile/wallet-adapter-mobile",
      "@solana/wallet-standard-wallet-adapter-base",
    ],
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/api": "http://localhost:8080",
    },
    hmr: process.env.REPL_ID
      ? { clientPort: 443, protocol: "wss" }
      : true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
