import { Router } from "express";
import type { NasdaqStock } from "../data/nasdaq-stocks";
import {
  searchStocks,
  getStockBySymbol,
  getFilteredStocks,
  getSortedStocks,
  getTopMovers,
  getSectorSummary,
  getStocksBySector,
} from "../data/nasdaq-stocks";
import { stockCache } from "../lib/cache";
import { validateQuery, validateParams, z } from "../lib/validateRequest";
import { getLivePrices } from "../lib/priceService";
import { logger } from "../lib/logger";

const router = Router();

const StocksQuerySchema = z.object({
  q: z.string().max(100).optional().default(""),
  sector: z.string().max(100).optional(),
  capTier: z.string().max(50).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  sortBy: z.enum(["symbol", "name", "price", "changePercent", "volume", "marketCap"]).optional().default("symbol"),
  sortDir: z.enum(["asc", "desc"]).optional().default("asc"),
});

const SectorParamsSchema = z.object({
  sector: z.string().min(1).max(100),
});

const SymbolParamsSchema = z.object({
  symbol: z.string().min(1).max(20).regex(/^[A-Z0-9.^-]+$/i, "Invalid stock symbol"),
});

// Stock data endpoints are intentionally public — market data is non-sensitive
// and allows unauthenticated browsing to support the public-facing experience.
const VALID_SORT_FIELDS = ["symbol", "name", "price", "changePercent", "volume", "marketCap"] as const;
type StockSortField = typeof VALID_SORT_FIELDS[number];

router.get("/stocks", validateQuery(StocksQuerySchema), (req, res) => {
  const query = (req.query.q as string) || "";
  const sector = req.query.sector as string | undefined;
  const capTier = req.query.capTier as string | undefined;
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  const sortBy = ((req.query.sortBy as string) || "symbol") as StockSortField;
  const sortDir = (req.query.sortDir as string) === "desc" ? "desc" : "asc";
  const isValidSort = VALID_SORT_FIELDS.includes(sortBy);

  let results: NasdaqStock[];

  if (query) {
    // Full-text search: retrieve then filter and sort at request time
    results = searchStocks(query, 5000);
    if (sector) results = results.filter(s => s.sector === sector);
    if (capTier) results = results.filter(s => s.capTier === capTier);
    if (isValidSort) {
      results = [...results].sort((a, b) => {
        const aVal = a[sortBy], bVal = b[sortBy];
        if (typeof aVal === "string" && typeof bVal === "string") {
          return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
      });
    }
  } else if (sector || capTier) {
    // Filter-only: use pre-built index then sort the (much smaller) result set
    results = getFilteredStocks(sector, capTier);
    if (isValidSort) {
      results = [...results].sort((a, b) => {
        const aVal = a[sortBy], bVal = b[sortBy];
        if (typeof aVal === "string" && typeof bVal === "string") {
          return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
      });
    }
  } else {
    // No search query, no filter: use pre-sorted full index directly
    results = isValidSort ? getSortedStocks(sortBy, sortDir) : getSortedStocks();
  }

  const total = results.length;
  const offset = (page - 1) * limit;
  const paged = results.slice(offset, offset + limit);

  res.json({
    stocks: paged,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

const SearchQuerySchema = z.object({
  q: z.string().min(1).max(50),
});

router.get("/stocks/search", validateQuery(SearchQuerySchema), async (req, res) => {
  try {
    const q = (req.query.q as string) || "";
    if (!q.trim()) {
      res.json({ results: [] });
      return;
    }

    const matches = searchStocks(q.trim(), 20);
    if (matches.length === 0) {
      res.json({ results: [] });
      return;
    }

    const symbols = matches.map(s => s.symbol);
    let livePricesData: Record<string, number> = {};
    let marketDataAvailable = true;
    try {
      livePricesData = await getLivePrices(symbols);
    } catch {
      marketDataAvailable = false;
    }

    const results = matches.map(stock => {
      const livePrice = livePricesData[stock.symbol];
      const prevClose = stock.price;
      const currentPrice = livePrice ?? prevClose;
      const changePercent = livePrice && prevClose > 0
        ? ((livePrice - prevClose) / prevClose) * 100
        : 0;

      return {
        symbol: stock.symbol,
        name: stock.name,
        sector: stock.sector,
        livePrice: livePrice ?? null,
        staticPrice: prevClose,
        changePercent: Number(changePercent.toFixed(2)),
        marketDataAvailable: !!livePrice,
      };
    });

    res.json({ results, marketDataAvailable });
  } catch (err) {
    logger.error({ err }, "Stock search error");
    res.status(500).json({ error: "Stock search failed" });
  }
});

router.get("/stocks/movers", (_req, res) => {
  const cacheKey = "movers:20";
  const cached = stockCache.get(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }
  const movers = getTopMovers(20);
  stockCache.set(cacheKey, movers);
  res.json(movers);
});

router.get("/stocks/sectors", (_req, res) => {
  const cacheKey = "sectors:summary";
  const cached = stockCache.get(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }
  const result = { sectors: getSectorSummary() };
  stockCache.set(cacheKey, result);
  res.json(result);
});

router.get("/stocks/sectors/:sector", validateParams(SectorParamsSchema), (req, res) => {
  const stocks = getStocksBySector(req.params.sector as string);
  if (stocks.length === 0) {
    res.status(404).json({ error: "Sector not found" });
    return;
  }
  res.json({ sector: req.params.sector as string, count: stocks.length, stocks: stocks.slice(0, 100) });
});

router.get("/stocks/:symbol", validateParams(SymbolParamsSchema), (req, res) => {
  const stock = getStockBySymbol(req.params.symbol as string);
  if (!stock) {
    res.status(404).json({ error: "Stock not found" });
    return;
  }
  res.json(stock);
});

export default router;
