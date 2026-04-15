import { useState } from "react";
import {
  Github, Star, ExternalLink, Download, Zap, Shield, Code2, TrendingUp,
  ChevronDown, ChevronUp, Package, Clock, Users, CheckCircle2, AlertTriangle,
  Atom, Layers, BarChart3, Globe, Terminal, FileText, Sparkles, Eye,
  Database, Wifi, Palette, Table2, Lock, Cpu, BookOpen, ArrowRight
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

interface Library {
  name: string;
  repo: string;
  stars: string;
  license: string;
  language: string;
  description: string;
  howItHelps: string;
  install: string;
  features: string[];
  priority: "critical" | "high" | "medium" | "nice-to-have";
  category: string;
  lastActive: string;
  bundleSize?: string;
  currentlyUsing?: string;
}

const LIBRARY_DATA: Library[] = [
  {
    name: "TradingView Lightweight Charts",
    repo: "tradingview/lightweight-charts",
    stars: "9.5k+",
    license: "Apache-2.0",
    language: "TypeScript",
    description: "Performant financial charts | candlestick, area, line, histogram | rendered via HTML5 Canvas. The official TradingView charting library for web.",
    howItHelps: "Replace current Recharts-based stock charts with professional-grade financial charts. Candlestick rendering, crosshair, price scales, time scales, and real-time streaming updates via .update() API.",
    install: "pnpm add lightweight-charts",
    features: ["Candlestick / OHLC charts", "Real-time streaming .update()", "Custom indicators overlay", "Crosshair + tooltips", "Price / time scales", "Canvas-based (60fps)"],
    priority: "critical",
    category: "Charting",
    lastActive: "2026",
    bundleSize: "~45KB gzipped",
  },
  {
    name: "lightweight-charts-react-wrapper",
    repo: "trash-and-fire/lightweight-charts-react-wrapper",
    stars: "117",
    license: "MIT",
    language: "TypeScript",
    description: "React component-based wrapper for TradingView Lightweight Charts with JSX API, supporting custom series, price lines, and reactive updates.",
    howItHelps: "Declarative React wrapper so we can use Lightweight Charts as JSX components | <Chart>, <CandlestickSeries>, <VolumeSeries> | with reactive props.",
    install: "pnpm add lightweight-charts-react-wrapper",
    features: ["JSX component API", "Reactive prop updates", "Custom series support", "Price line components", "TypeScript-first"],
    priority: "critical",
    category: "Charting",
    lastActive: "2025",
  },
  {
    name: "@alpacahq/typescript-sdk",
    repo: "alpacahq/typescript-sdk",
    stars: "Growing",
    license: "Apache-2.0",
    language: "TypeScript",
    description: "Official Alpaca Markets TypeScript SDK for REST API and WebSocket streaming. Modern replacement for the older alpaca-ts library.",
    howItHelps: "Replace our manual Alpaca API calls with the official typed SDK. Provides typed responses, WebSocket streaming for real-time quotes, and built-in paper trading safety.",
    install: "pnpm add @alpacahq/typescript-sdk",
    features: ["Typed REST API client", "WebSocket market data streams", "Paper trading default", "OAuth support", "Latest trades/quotes/bars"],
    priority: "critical",
    category: "Market Data",
    lastActive: "2025",
    currentlyUsing: "Manual fetch calls to Alpaca REST API",
  },
  {
    name: "technicalindicators",
    repo: "anandanand84/technicalindicators",
    stars: "2.2k+",
    license: "MIT",
    language: "TypeScript",
    description: "A comprehensive JavaScript/TypeScript technical indicators library with pattern recognition. Supports RSI, MACD, SMA, Bollinger Bands, Ichimoku, and 50+ more.",
    howItHelps: "Powers our 55+ technical indicators calculation. Both static calculate() and streaming nextValue() APIs | ideal for both historical analysis and live tick data from Alpaca WebSocket.",
    install: "pnpm add technicalindicators",
    features: ["50+ indicators (RSI, MACD, SMA, EMA, BB)", "Streaming nextValue() for live data", "Pattern recognition (head & shoulders, etc.)", "TypeScript support", "Browser + Node compatible"],
    priority: "high",
    category: "Technical Analysis",
    lastActive: "2025",
    currentlyUsing: "Already integrated | validate version is current",
  },
  {
    name: "TanStack Table v8",
    repo: "TanStack/table",
    stars: "25k+",
    license: "MIT",
    language: "TypeScript",
    description: "Headless UI for building powerful tables & datagrids. Framework-agnostic core with React adapter. Sorting, filtering, pagination, grouping, and virtualization.",
    howItHelps: "Upgrade our stock screener from basic HTML tables to a pro-grade data grid with server-side sorting, column filtering, row selection, and virtual scrolling for 5,000+ NASDAQ stocks.",
    install: "pnpm add @tanstack/react-table",
    features: ["Headless (full styling control)", "Sorting / filtering / grouping", "Column pinning / resizing", "Row virtualization via @tanstack/virtual", "Server-side pagination"],
    priority: "high",
    category: "Data Display",
    lastActive: "2026",
    bundleSize: "~14KB gzipped",
  },
  {
    name: "@tanstack/react-virtual",
    repo: "TanStack/virtual",
    stars: "5.5k+",
    license: "MIT",
    language: "TypeScript",
    description: "Headless virtualization utility for rendering massive lists and tables. Only renders items visible in the viewport.",
    howItHelps: "Virtual scroll for our 5,000 NASDAQ stock lists, news feeds, and any large data set. Reduces DOM nodes from thousands to ~20 visible items, dramatically improving performance.",
    install: "pnpm add @tanstack/react-virtual",
    features: ["Vertical / horizontal / grid virtualization", "Dynamic row heights", "Scroll-to-index API", "Smooth scroll support", "Only ~2KB gzipped"],
    priority: "high",
    category: "Performance",
    lastActive: "2026",
    bundleSize: "~2KB gzipped",
  },
  {
    name: "@react-pdf/renderer",
    repo: "diegomura/react-pdf",
    stars: "15.9k+",
    license: "MIT",
    language: "TypeScript",
    description: "Create PDF documents using React components. Render PDFs in the browser or on the server with a familiar JSX + CSS-like syntax.",
    howItHelps: "Generate professional PDF reports (competitive analysis, résumé, portfolio summaries) using React components instead of imperative jsPDF. Better maintainability and consistent styling.",
    install: "pnpm add @react-pdf/renderer",
    features: ["React component-based PDF", "CSS Flexbox layout", "Custom fonts", "Image embedding", "Browser + server rendering"],
    priority: "high",
    category: "Export",
    lastActive: "2026",
    currentlyUsing: "jsPDF (imperative API | harder to maintain)",
  },
  {
    name: "Sonner",
    repo: "emilkowalski/sonner",
    stars: "10k+",
    license: "MIT",
    language: "TypeScript",
    description: "An opinionated toast notification component for React. Beautiful by default with stacking, types, promises, and dismissal.",
    howItHelps: "Replace our current toast system with a more polished, accessible notification system. Built-in promise toasts for async operations (saving, API calls), stacking, and dark mode support.",
    install: "pnpm add sonner",
    features: ["Promise-based toasts", "Stacking / swipe dismiss", "Dark mode built-in", "Types: success/error/info/warning", "Action buttons in toasts"],
    priority: "medium",
    category: "UI/UX",
    lastActive: "2026",
    bundleSize: "~5KB gzipped",
  },
  {
    name: "tsParticles",
    repo: "tsparticles/tsparticles",
    stars: "8k+",
    license: "MIT",
    language: "TypeScript",
    description: "Highly customizable particle animations | confetti, fireworks, mesh effects, and more. Includes React, Vue, and Angular integrations.",
    howItHelps: "Enhance our animated mesh background with GPU-accelerated particle effects. Add celebration confetti on trade signals, portfolio milestones, or achievement unlocks.",
    install: "pnpm add @tsparticles/react @tsparticles/slim",
    features: ["Confetti / fireworks presets", "Custom shapes and paths", "GPU-accelerated rendering", "React component wrapper", "Interactive (mouse/touch)"],
    priority: "medium",
    category: "Visual Effects",
    lastActive: "2026",
  },
  {
    name: "Reactive Resume",
    repo: "AmruthPillai/Reactive-Resume",
    stars: "29k+",
    license: "MIT",
    language: "TypeScript",
    description: "A free, self-hostable, privacy-first resume builder. Next.js + React + TypeScript with beautiful templates and PDF export via headless Chrome.",
    howItHelps: "Study their architecture for our Résumé Builder | template system, PDF rendering pipeline, and drag-and-drop section reordering. Could extract their template designs as inspiration.",
    install: "Reference architecture (not direct dependency)",
    features: ["15+ professional templates", "Drag-and-drop sections", "Real-time preview", "Self-hostable", "No tracking / privacy-first"],
    priority: "medium",
    category: "Reference Architecture",
    lastActive: "2026",
  },
  {
    name: "FinGPT",
    repo: "AI4Finance-Foundation/FinGPT",
    stars: "14k+",
    license: "MIT",
    language: "Python",
    description: "Open-source financial LLMs fine-tuned with LoRA on news and tweet sentiment datasets. Best-in-class financial sentiment analysis.",
    howItHelps: "Enhance our MiroFish News Intelligence with FinGPT's financial sentiment models. Could power more accurate sentiment scoring for our news feed and stock analysis.",
    install: "API integration (Python microservice)",
    features: ["Financial sentiment analysis", "LoRA fine-tuned models", "News + tweet datasets", "Multi-source training", "Real-time inference"],
    priority: "nice-to-have",
    category: "AI / ML",
    lastActive: "2026",
  },
  {
    name: "Glide Data Grid",
    repo: "glideapps/glide-data-grid",
    stars: "4k+",
    license: "MIT",
    language: "TypeScript",
    description: "A fast, Canvas-based React data grid that handles millions of rows with smooth scrolling. Used in production at Glide.",
    howItHelps: "Alternative to TanStack Table for scenarios where we need extreme performance | like rendering all 5,000 NASDAQ stocks with 20+ columns of live-updating data.",
    install: "pnpm add @glideapps/glide-data-grid",
    features: ["Canvas-based rendering", "Millions of rows", "Cell editing", "Custom cell renderers", "Smooth 60fps scrolling"],
    priority: "nice-to-have",
    category: "Data Display",
    lastActive: "2025",
  },
  {
    name: "react-resizable-panels",
    repo: "bvaughn/react-resizable-panels",
    stars: "4.2k+",
    license: "MIT",
    language: "TypeScript",
    description: "Resizable panel groups for React. Supports horizontal/vertical layouts with drag handles, collapse, and persistence.",
    howItHelps: "Add Bloomberg Terminal-style resizable panels to our dashboard and terminal pages. Users can resize chart vs watchlist vs news feed sections to their preference.",
    install: "pnpm add react-resizable-panels",
    features: ["Horizontal / vertical panels", "Drag handles", "Collapsible panels", "Layout persistence (localStorage)", "Nested panel groups"],
    priority: "high",
    category: "Layout",
    lastActive: "2026",
    bundleSize: "~7KB gzipped",
  },
  {
    name: "zustand",
    repo: "pmndrs/zustand",
    stars: "50k+",
    license: "MIT",
    language: "TypeScript",
    description: "A small, fast, scalable state management library for React. No boilerplate, no providers, works with React's concurrent features.",
    howItHelps: "Lightweight global state for watchlists, user preferences, theme settings, and cross-component data sharing without React Query overhead for non-server state.",
    install: "pnpm add zustand",
    features: ["Minimal boilerplate", "No providers needed", "Middleware (persist, devtools, immer)", "Works outside React", "~1KB gzipped"],
    priority: "medium",
    category: "State Management",
    lastActive: "2026",
    bundleSize: "~1KB gzipped",
  },
];

const PRIORITY_CONFIG = {
  critical: { color: "#ff3366", bg: "bg-red-500/10", border: "border-red-500/30", label: "CRITICAL", icon: Zap },
  high: { color: "#FFB800", bg: "bg-yellow-500/10", border: "border-yellow-500/30", label: "HIGH", icon: TrendingUp },
  medium: { color: "#00B4D8", bg: "bg-amber-1000/10", border: "border-amber-1000/30", label: "MEDIUM", icon: Star },
  "nice-to-have": { color: "#9c27b0", bg: "bg-purple-500/10", border: "border-purple-500/30", label: "EXPLORE", icon: Eye },
};

const CATEGORIES = [...new Set(LIBRARY_DATA.map(l => l.category))];

export default function OpenSourceIntel() {
  const [expandedLib, setExpandedLib] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const filteredLibs = LIBRARY_DATA.filter(lib => {
    if (filterPriority !== "all" && lib.priority !== filterPriority) return false;
    if (filterCategory !== "all" && lib.category !== filterCategory) return false;
    return true;
  });

  const criticalCount = LIBRARY_DATA.filter(l => l.priority === "critical").length;
  const highCount = LIBRARY_DATA.filter(l => l.priority === "high").length;
  const totalStars = "150k+";

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="container mx-auto px-4 md:px-6 py-8 max-w-6xl">
        <div className="mb-8">
          <p className="text-xs font-mono tracking-[0.3em] text-primary/80 uppercase mb-2">
            Quantum Open-Source Intelligence
          </p>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            <span className="text-primary">GitHub</span> Solution Entanglement Map
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Battle-tested open-source libraries discovered through quantum field scanning of GitHub's
            repository space. Each library is a particle that could entangle with EntangleWealth to
            strengthen our wavefunction.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Libraries Scanned", value: String(LIBRARY_DATA.length), icon: Package, color: "text-primary" },
            { label: "Critical Priority", value: String(criticalCount), icon: Zap, color: "text-red-400" },
            { label: "High Priority", value: String(highCount), icon: TrendingUp, color: "text-gold" },
            { label: "Combined Stars", value: totalStars, icon: Star, color: "text-yellow-400" },
          ].map((stat, i) => (
            <div key={i} className="glass-panel p-4 text-center">
              <stat.icon className={`w-5 h-5 mx-auto mb-1.5 ${stat.color}`} />
              <p className="text-2xl font-bold font-mono">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="glass-panel p-5 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-[60px]" />
          <div className="relative">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Atom className="w-5 h-5 text-primary" />
              Quantum Integration Strategy
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                <p className="text-sm font-semibold text-red-400 mb-1">Phase 1 | Immediate</p>
                <p className="text-xs text-muted-foreground">
                  TradingView Lightweight Charts + React wrapper for professional candlestick charts.
                  Alpaca TypeScript SDK for typed, WebSocket-streaming market data.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
                <p className="text-sm font-semibold text-gold mb-1">Phase 2 | Next Sprint</p>
                <p className="text-xs text-muted-foreground">
                  TanStack Table + Virtual for pro stock screener. @react-pdf/renderer for
                  React-native PDF export. Resizable panels for terminal layout.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-amber-1000/5 border border-amber-1000/20">
                <p className="text-sm font-semibold text-primary mb-1">Phase 3 | Enhancement</p>
                <p className="text-xs text-muted-foreground">
                  Sonner for toast notifications. tsParticles for visual effects. Zustand
                  for lightweight global state. FinGPT for AI sentiment models.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <div className="flex gap-1 p-1 rounded-lg bg-white/5 border border-white/10">
            {["all", "critical", "high", "medium", "nice-to-have"].map(p => (
              <button
                key={p}
                onClick={() => setFilterPriority(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  filterPriority === p
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                {p === "all" ? "All Priorities" : p === "nice-to-have" ? "Explore" : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex gap-1 p-1 rounded-lg bg-white/5 border border-white/10 flex-wrap">
            <button
              onClick={() => setFilterCategory("all")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                filterCategory === "all" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-white"
              }`}
            >
              All Categories
            </button>
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setFilterCategory(c)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  filterCategory === c ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-white"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredLibs.map((lib) => {
            const config = PRIORITY_CONFIG[lib.priority];
            const isExpanded = expandedLib === lib.name;
            return (
              <div
                key={lib.name}
                className={`glass-panel overflow-hidden transition-all hover:border-white/20 ${isExpanded ? "border-white/20" : ""}`}
              >
                <button
                  onClick={() => setExpandedLib(isExpanded ? null : lib.name)}
                  className="w-full p-4 md:p-5 text-left"
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                        <Github className="w-5 h-5 text-white/60" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-semibold">{lib.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${config.bg} border ${config.border}`}
                            style={{ color: config.color }}
                          >
                            {config.label}
                          </span>
                          <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-md bg-white/5">{lib.category}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{lib.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="flex items-center gap-1 text-yellow-400">
                        <Star className="w-3.5 h-3.5" />
                        <span className="text-xs font-mono">{lib.stars}</span>
                      </div>
                      <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-white/5">{lib.license}</span>
                      <span className="text-xs text-muted-foreground">{lib.language}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 md:px-5 pb-5 space-y-4 border-t border-white/5 pt-4 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">How It Helps EntangleWealth</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{lib.howItHelps}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Key Features</p>
                        <div className="space-y-1.5">
                          {lib.features.map((f, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                              {f}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 pt-2">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-xs">
                        <Terminal className="w-3.5 h-3.5 text-primary" />
                        <code className="font-mono text-primary">{lib.install}</code>
                      </div>
                      {lib.bundleSize && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-xs text-muted-foreground">
                          <Package className="w-3.5 h-3.5" /> {lib.bundleSize}
                        </div>
                      )}
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" /> Active: {lib.lastActive}
                      </div>
                      {lib.currentlyUsing && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-gold">
                          <AlertTriangle className="w-3.5 h-3.5" /> Current: {lib.currentlyUsing}
                        </div>
                      )}
                    </div>

                    <a
                      href={`https://github.com/${lib.repo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-primary/30 hover:bg-primary/5 transition-all text-sm"
                    >
                      <Github className="w-4 h-4" />
                      View on GitHub
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredLibs.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No libraries match the current filters.</p>
          </div>
        )}

        <div className="mt-12 glass-panel p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-400" />
            License Compliance Matrix
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">License</th>
                  <th className="text-center py-2 px-3 text-xs text-muted-foreground font-medium">Commercial OK</th>
                  <th className="text-center py-2 px-3 text-xs text-muted-foreground font-medium">Must Open Source?</th>
                  <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Libraries Using</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { license: "MIT", commercial: true, openSource: false, libs: LIBRARY_DATA.filter(l => l.license === "MIT").map(l => l.name) },
                  { license: "Apache-2.0", commercial: true, openSource: false, libs: LIBRARY_DATA.filter(l => l.license === "Apache-2.0").map(l => l.name) },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="py-2.5 px-3 font-mono text-xs">{row.license}</td>
                    <td className="py-2.5 px-3 text-center">
                      <CheckCircle2 className="w-4 h-4 text-green-400 mx-auto" />
                    </td>
                    <td className="py-2.5 px-3 text-center text-xs text-green-400">No</td>
                    <td className="py-2.5 px-3 text-xs text-muted-foreground">{row.libs.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-green-400/80 mt-3 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            All recommended libraries are fully commercial-safe (MIT or Apache-2.0)
          </p>
        </div>

        <div className="mt-8 glass-panel p-6 border-primary/20">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Quantum Field Scan Methodology
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This intelligence report was generated by scanning GitHub's quantum repository space across
            multiple dimensions: fintech/financial analysis, React charting libraries, TypeScript SDKs,
            technical indicators, data visualization, PDF generation, UI component libraries, and
            performance optimization tools. Each library was evaluated against health signals (star count,
            last commit recency, contributor count, license type, bundle size) and scored for
            EntangleWealth-specific fit. Only actively maintained, commercially safe, TypeScript-compatible
            libraries made the final entanglement map.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
