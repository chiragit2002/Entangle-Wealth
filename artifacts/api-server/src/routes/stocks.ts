import { Router } from "express";
import {
  searchStocks,
  getStockBySymbol,
  getAllStocks,
  getTopMovers,
  getSectorSummary,
  getStocksBySector,
} from "../data/nasdaq-stocks";
import { stockCache } from "../lib/cache";

const router = Router();

router.get("/stocks", (req, res) => {
  const query = (req.query.q as string) || "";
  const sector = req.query.sector as string | undefined;
  const capTier = req.query.capTier as string | undefined;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.max(1, Math.min(parseInt(req.query.limit as string) || 50, 50));
  const sortBy = (req.query.sortBy as string) || "symbol";
  const sortDir = (req.query.sortDir as string) === "desc" ? "desc" : "asc";

  let results = query ? searchStocks(query, 5000) : getAllStocks();

  if (sector) {
    results = results.filter(s => s.sector === sector);
  }
  if (capTier) {
    results = results.filter(s => s.capTier === capTier);
  }

  const validSortFields = ["symbol", "name", "price", "changePercent", "volume", "marketCap"] as const;
  type SortField = typeof validSortFields[number];
  if (validSortFields.includes(sortBy as SortField)) {
    results = [...results].sort((a, b) => {
      const aVal = a[sortBy as SortField];
      const bVal = b[sortBy as SortField];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
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

router.get("/stocks/sectors/:sector", (req, res) => {
  const stocks = getStocksBySector(req.params.sector);
  if (stocks.length === 0) {
    res.status(404).json({ error: "Sector not found" });
    return;
  }
  res.json({ sector: req.params.sector, count: stocks.length, stocks: stocks.slice(0, 100) });
});

router.get("/stocks/:symbol", (req, res) => {
  const stock = getStockBySymbol(req.params.symbol);
  if (!stock) {
    res.status(404).json({ error: "Stock not found" });
    return;
  }
  res.json(stock);
});

export default router;
