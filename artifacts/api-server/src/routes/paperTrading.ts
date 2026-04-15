import { Router } from "express";
import { db } from "@workspace/db";
import { paperPortfoliosTable, paperTradesTable, paperPositionsTable, paperOptionsTradesTable, paperOptionsPositionsTable, paperOrdersTable, dailySpinsTable, userXpTable, xpTransactionsTable, streaksTable, usersTable, balanceTransactionsTable } from "@workspace/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { resolveUserId } from "../lib/resolveUserId";
import { logger } from "../lib/logger";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { validateBody, z } from "../lib/validateRequest";
import { getLivePrice, getLivePrices } from "../lib/priceService";
import { eventBus } from "../lib/agents/EventBus";
import type { InferSelectModel } from "drizzle-orm";

type DbPosition = InferSelectModel<typeof paperPositionsTable>;

interface PositionWithLiveData extends DbPosition {
  currentPrice?: number;
  unrealizedPnl?: number;
}

const router = Router();

const DEFAULT_STARTING_CASH = 100_000;

function getTodayUTC(): string {
  return new Date().toISOString().split("T")[0];
}

async function ensurePortfolio(userId: string) {
  const [existing] = await db
    .select()
    .from(paperPortfoliosTable)
    .where(eq(paperPortfoliosTable.userId, userId));

  if (existing) return existing;

  const [created] = await db
    .insert(paperPortfoliosTable)
    .values({ userId, cashBalance: DEFAULT_STARTING_CASH })
    .returning();
  return created;
}

async function getPositions(userId: string) {
  return db
    .select()
    .from(paperPositionsTable)
    .where(and(eq(paperPositionsTable.userId, userId)));
}

router.get("/paper-trading/portfolio", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as AuthenticatedRequest).userId;
    const dbUserId = await resolveUserId(clerkId, req);
    if (!dbUserId) {
      res.json({ cashBalance: DEFAULT_STARTING_CASH, positions: [], trades: [], portfolioValue: 0, totalValue: DEFAULT_STARTING_CASH, startingCash: DEFAULT_STARTING_CASH, marketDataAvailable: false });
      return;
    }

    const portfolio = await ensurePortfolio(dbUserId);
    const positions = await getPositions(dbUserId);
    const trades = await db
      .select()
      .from(paperTradesTable)
      .where(eq(paperTradesTable.userId, dbUserId))
      .orderBy(desc(paperTradesTable.createdAt))
      .limit(50);

    const activePositions = positions.filter(p => p.quantity !== 0);

    const optionsPositions = await db
      .select()
      .from(paperOptionsPositionsTable)
      .where(eq(paperOptionsPositionsTable.userId, dbUserId));
    const activeOptionsPositions = optionsPositions.filter(p => p.contracts > 0);

    const optionsTrades = await db
      .select()
      .from(paperOptionsTradesTable)
      .where(eq(paperOptionsTradesTable.userId, dbUserId))
      .orderBy(desc(paperOptionsTradesTable.createdAt))
      .limit(20);

    let portfolioValue: number | null = null;
    let marketDataAvailable = true;
    let positionsWithLivePrice: PositionWithLiveData[] = [...activePositions];

    if (activePositions.length > 0) {
      const symbols = activePositions.map(p => p.symbol);
      const livePrices = await getLivePrices(symbols);

      if (Object.keys(livePrices).length === 0 && symbols.length > 0) {
        marketDataAvailable = false;
      } else {
        portfolioValue = 0;
        positionsWithLivePrice = activePositions.map(pos => {
          const lp = livePrices[pos.symbol];
          if (lp) {
            const qty = pos.quantity;
            portfolioValue = (portfolioValue ?? 0) + Math.abs(qty) * lp * (qty < 0 ? -1 : 1);
            return { ...pos, currentPrice: lp, unrealizedPnl: qty * (lp - Math.abs(pos.avgCost)) };
          }
          portfolioValue = (portfolioValue ?? 0) + Math.abs(pos.quantity) * pos.avgCost * (pos.quantity < 0 ? -1 : 1);
          return pos;
        });
      }
    } else {
      portfolioValue = 0;
    }

    const optionsValue = activeOptionsPositions.reduce((sum, p) => sum + p.contracts * p.avgPremium * 100, 0);

    res.json({
      cashBalance: portfolio.cashBalance,
      positions: positionsWithLivePrice,
      trades,
      portfolioValue: portfolioValue !== null ? portfolioValue + optionsValue : null,
      totalValue: portfolioValue !== null ? portfolio.cashBalance + portfolioValue + optionsValue : null,
      startingCash: DEFAULT_STARTING_CASH,
      optionsPositions: activeOptionsPositions,
      optionsTrades,
      marketDataAvailable,
    });
  } catch (err) {
    logger.error({ err }, "Paper trading portfolio error");
    res.status(500).json({ error: "Failed to load portfolio" });
  }
});

const TradeSchema = z.object({
  symbol: z.string().min(1).max(10).regex(/^[A-Za-z]{1,10}$/, "Symbol must be 1-10 letters"),
  side: z.enum(["buy", "sell", "short_sell", "short_cover"]),
  quantity: z.number().int().positive().max(1_000_000),
  orderType: z.enum(["market", "limit", "stop", "time_based"]).optional().default("market"),
  limitPrice: z.number().positive().optional(),
  stopPrice: z.number().positive().optional(),
  expiresAt: z.string().datetime().optional(),
});

router.post("/paper-trading/trade", requireAuth, validateBody(TradeSchema), async (req, res) => {
  try {
    const clerkId = (req as AuthenticatedRequest).userId;
    const dbUserId = await resolveUserId(clerkId, req);
    if (!dbUserId) {
      res.status(400).json({ error: "User not found. Please complete onboarding first." });
      return;
    }

    const { symbol, side, quantity, orderType = "market", limitPrice, stopPrice, expiresAt } = req.body;
    const qty = Math.floor(Number(quantity));
    const upperSymbol = symbol.toUpperCase();

    const px = await getLivePrice(upperSymbol);
    if (!px || px <= 0) {
      res.status(503).json({
        error: `Market data temporarily unavailable — trading paused for ${upperSymbol}. Please try again shortly.`,
        marketDataUnavailable: true,
      });
      return;
    }

    if (orderType === "market") {
      const result = await executeMarketOrder(dbUserId, upperSymbol, side, qty, px);
      if (result.error) {
        res.status(400).json({ error: result.error });
        return;
      }
      logger.info({ userId: dbUserId, symbol: upperSymbol, side, quantity: qty, price: px, orderType }, "Market order executed");
      res.json(result);
    } else {
      const result = await placePendingOrder(dbUserId, upperSymbol, side, qty, px, orderType, limitPrice, stopPrice, expiresAt);
      if (result.error) {
        res.status(400).json({ error: result.error });
        return;
      }
      logger.info({ userId: dbUserId, symbol: upperSymbol, side, quantity: qty, orderType, limitPrice, stopPrice }, "Pending order placed");
      res.json(result);
    }
  } catch (err) {
    logger.error({ err }, "Paper trading error");
    res.status(500).json({ error: "Trade execution failed" });
  }
});

async function executeMarketOrder(
  dbUserId: string,
  upperSymbol: string,
  side: string,
  qty: number,
  px: number,
  orderId?: number,
) {
  const totalCost = qty * px;

  return await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${dbUserId.toString()} || '_paper_trade'))`);

    const lockedRows = await tx.execute<{ id: number; cash_balance: number; user_id: string }>(
      sql`SELECT id, cash_balance, user_id FROM paper_portfolios WHERE user_id = ${dbUserId} FOR UPDATE`
    );
    const rows = Array.isArray(lockedRows) ? lockedRows : (lockedRows as { rows: { id: number; cash_balance: number; user_id: string }[] }).rows ?? [];
    const lockedPortfolio = rows[0] ?? null;

    let currentCash: number;
    if (lockedPortfolio) {
      currentCash = Number(lockedPortfolio.cash_balance);
    } else {
      const [created] = await tx
        .insert(paperPortfoliosTable)
        .values({ userId: dbUserId, cashBalance: DEFAULT_STARTING_CASH })
        .returning();
      currentCash = created.cashBalance;
    }

    if (side === "buy") {
      if (currentCash < totalCost) {
        return { error: "> INSUFFICIENT FUNDS — ORDER REJECTED" };
      }

      const newCash = currentCash - totalCost;
      await tx.execute(
        sql`UPDATE paper_portfolios SET cash_balance = cash_balance - ${totalCost}, updated_at = NOW() WHERE user_id = ${dbUserId}`
      );

      await tx.insert(balanceTransactionsTable).values({
        userId: dbUserId,
        transactionType: 'trade_buy',
        amount: -totalCost,
        balanceBefore: currentCash,
        balanceAfter: newCash,
        source: 'trade',
        referenceId: `buy_${upperSymbol}_${qty}_@${px.toFixed(2)}`,
      });

      const [existingPos] = await tx
        .select()
        .from(paperPositionsTable)
        .where(and(eq(paperPositionsTable.userId, dbUserId), eq(paperPositionsTable.symbol, upperSymbol)));

      if (existingPos) {
        const newQty = existingPos.quantity + qty;
        const newAvgCost = ((existingPos.quantity * existingPos.avgCost) + totalCost) / newQty;
        await tx
          .update(paperPositionsTable)
          .set({ quantity: newQty, avgCost: newAvgCost, updatedAt: new Date() })
          .where(eq(paperPositionsTable.id, existingPos.id));
      } else {
        await tx
          .insert(paperPositionsTable)
          .values({ userId: dbUserId, symbol: upperSymbol, quantity: qty, avgCost: px });
      }
    } else if (side === "sell") {
      const [existingPos] = await tx
        .select()
        .from(paperPositionsTable)
        .where(and(eq(paperPositionsTable.userId, dbUserId), eq(paperPositionsTable.symbol, upperSymbol)));

      if (!existingPos || existingPos.quantity < qty) {
        return { error: `> INSUFFICIENT SHARES — ORDER REJECTED` };
      }

      const newCash = currentCash + totalCost;
      await tx.execute(
        sql`UPDATE paper_portfolios SET cash_balance = cash_balance + ${totalCost}, updated_at = NOW() WHERE user_id = ${dbUserId}`
      );

      await tx.insert(balanceTransactionsTable).values({
        userId: dbUserId,
        transactionType: 'trade_sell',
        amount: totalCost,
        balanceBefore: currentCash,
        balanceAfter: newCash,
        source: 'trade',
        referenceId: `sell_${upperSymbol}_${qty}_@${px.toFixed(2)}`,
      });

      const newQty = existingPos.quantity - qty;
      if (newQty === 0) {
        await tx.delete(paperPositionsTable).where(eq(paperPositionsTable.id, existingPos.id));
      } else {
        await tx
          .update(paperPositionsTable)
          .set({ quantity: newQty, updatedAt: new Date() })
          .where(eq(paperPositionsTable.id, existingPos.id));
      }
    } else if (side === "short_sell") {
      const [existingPos] = await tx
        .select()
        .from(paperPositionsTable)
        .where(and(eq(paperPositionsTable.userId, dbUserId), eq(paperPositionsTable.symbol, upperSymbol)));

      const newCash = currentCash + totalCost;
      await tx.execute(
        sql`UPDATE paper_portfolios SET cash_balance = cash_balance + ${totalCost}, updated_at = NOW() WHERE user_id = ${dbUserId}`
      );

      await tx.insert(balanceTransactionsTable).values({
        userId: dbUserId,
        transactionType: 'trade_short_sell',
        amount: totalCost,
        balanceBefore: currentCash,
        balanceAfter: newCash,
        source: 'trade',
        referenceId: `short_sell_${upperSymbol}_${qty}_@${px.toFixed(2)}`,
      });

      if (existingPos) {
        const newQty = existingPos.quantity - qty;
        const newAvgCost = newQty === 0 ? 0 : Math.abs(((existingPos.quantity * existingPos.avgCost) - totalCost) / newQty);
        await tx
          .update(paperPositionsTable)
          .set({ quantity: newQty, avgCost: newQty < 0 ? px : newAvgCost, updatedAt: new Date() })
          .where(eq(paperPositionsTable.id, existingPos.id));
      } else {
        await tx
          .insert(paperPositionsTable)
          .values({ userId: dbUserId, symbol: upperSymbol, quantity: -qty, avgCost: px });
      }
    } else if (side === "short_cover") {
      const [existingPos] = await tx
        .select()
        .from(paperPositionsTable)
        .where(and(eq(paperPositionsTable.userId, dbUserId), eq(paperPositionsTable.symbol, upperSymbol)));

      if (!existingPos || existingPos.quantity >= 0 || Math.abs(existingPos.quantity) < qty) {
        return { error: `> INSUFFICIENT SHORT POSITION — ORDER REJECTED` };
      }

      if (currentCash < totalCost) {
        return { error: "> INSUFFICIENT FUNDS — ORDER REJECTED" };
      }

      const newCash = currentCash - totalCost;
      await tx.execute(
        sql`UPDATE paper_portfolios SET cash_balance = cash_balance - ${totalCost}, updated_at = NOW() WHERE user_id = ${dbUserId}`
      );

      await tx.insert(balanceTransactionsTable).values({
        userId: dbUserId,
        transactionType: 'trade_short_cover',
        amount: -totalCost,
        balanceBefore: currentCash,
        balanceAfter: newCash,
        source: 'trade',
        referenceId: `short_cover_${upperSymbol}_${qty}_@${px.toFixed(2)}`,
      });

      const newQty = existingPos.quantity + qty;
      if (newQty === 0) {
        await tx.delete(paperPositionsTable).where(eq(paperPositionsTable.id, existingPos.id));
      } else {
        await tx
          .update(paperPositionsTable)
          .set({ quantity: newQty, updatedAt: new Date() })
          .where(eq(paperPositionsTable.id, existingPos.id));
      }
    }

    await tx.insert(paperTradesTable).values({
      userId: dbUserId,
      symbol: upperSymbol,
      side,
      quantity: qty,
      price: px,
      totalCost,
      orderType: "market",
      orderId: orderId ?? null,
    });

    return { success: true, message: `${side.toUpperCase().replace("_", " ")} ${qty} ${upperSymbol} @ $${px.toFixed(2)}` };
  });
}

async function placePendingOrder(
  dbUserId: string,
  upperSymbol: string,
  side: string,
  qty: number,
  currentPx: number,
  orderType: string,
  limitPrice?: number,
  stopPrice?: number,
  expiresAt?: string,
) {
  const refPrice = limitPrice || stopPrice || currentPx;
  const reservedCash = (side === "buy" || side === "short_cover") ? qty * refPrice : 0;

  return await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${dbUserId.toString()} || '_paper_trade'))`);

    const lockedRows = await tx.execute<{ id: number; cash_balance: number }>(
      sql`SELECT id, cash_balance FROM paper_portfolios WHERE user_id = ${dbUserId} FOR UPDATE`
    );
    const rows = Array.isArray(lockedRows) ? lockedRows : (lockedRows as { rows: { id: number; cash_balance: number }[] }).rows ?? [];
    const lockedPortfolio = rows[0] ?? null;

    let currentCash: number;
    if (lockedPortfolio) {
      currentCash = Number(lockedPortfolio.cash_balance);
    } else {
      const [created] = await tx
        .insert(paperPortfoliosTable)
        .values({ userId: dbUserId, cashBalance: DEFAULT_STARTING_CASH })
        .returning();
      currentCash = created.cashBalance;
    }

    if (reservedCash > 0 && currentCash < reservedCash) {
      return { error: "> INSUFFICIENT FUNDS TO RESERVE FOR ORDER — ORDER REJECTED" };
    }

    if (reservedCash > 0) {
      await tx.execute(
        sql`UPDATE paper_portfolios SET cash_balance = cash_balance - ${reservedCash}, updated_at = NOW() WHERE user_id = ${dbUserId}`
      );
      await tx.insert(balanceTransactionsTable).values({
        userId: dbUserId,
        transactionType: 'order_reserve',
        amount: -reservedCash,
        balanceBefore: currentCash,
        balanceAfter: currentCash - reservedCash,
        source: 'pending_order',
        referenceId: `reserve_${side}_${upperSymbol}_${qty}_${orderType}`,
      });
    }

    const [order] = await tx.insert(paperOrdersTable).values({
      userId: dbUserId,
      symbol: upperSymbol,
      side,
      orderType,
      quantity: qty,
      limitPrice: limitPrice ?? null,
      stopPrice: stopPrice ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      status: "pending",
      reservedCash,
    }).returning();

    return {
      success: true,
      orderId: order.id,
      message: `${orderType.toUpperCase()} order placed: ${side.toUpperCase().replace("_", " ")} ${qty} ${upperSymbol}${limitPrice ? ` @ limit $${limitPrice.toFixed(2)}` : ""}${stopPrice ? ` @ stop $${stopPrice.toFixed(2)}` : ""}`,
    };
  });
}

router.get("/paper-trading/orders", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as AuthenticatedRequest).userId;
    const dbUserId = await resolveUserId(clerkId, req);
    if (!dbUserId) {
      res.json({ orders: [] });
      return;
    }

    const status = req.query.status as string | undefined;
    let query = db.select().from(paperOrdersTable).where(eq(paperOrdersTable.userId, dbUserId));

    const orders = await db.select().from(paperOrdersTable)
      .where(and(
        eq(paperOrdersTable.userId, dbUserId),
        status ? eq(paperOrdersTable.status, status) : undefined,
      ))
      .orderBy(desc(paperOrdersTable.createdAt))
      .limit(100);

    res.json({ orders });
  } catch (err) {
    logger.error({ err }, "Failed to fetch orders");
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

router.get("/paper-trading/orders/history", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as AuthenticatedRequest).userId;
    const dbUserId = await resolveUserId(clerkId, req);
    if (!dbUserId) {
      res.json({ orders: [] });
      return;
    }

    const orders = await db.select().from(paperOrdersTable)
      .where(and(
        eq(paperOrdersTable.userId, dbUserId),
        inArray(paperOrdersTable.status, ["filled", "cancelled", "expired"]),
      ))
      .orderBy(desc(paperOrdersTable.createdAt))
      .limit(100);

    res.json({ orders });
  } catch (err) {
    logger.error({ err }, "Failed to fetch order history");
    res.status(500).json({ error: "Failed to fetch order history" });
  }
});

router.delete("/paper-trading/orders/:id", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as AuthenticatedRequest).userId;
    const dbUserId = await resolveUserId(clerkId, req);
    if (!dbUserId) {
      res.status(400).json({ error: "User not found" });
      return;
    }

    const orderId = parseInt(req.params.id as string);
    if (isNaN(orderId)) {
      res.status(400).json({ error: "Invalid order ID" });
      return;
    }

    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${dbUserId.toString()} || '_paper_trade'))`);

      const [order] = await tx.select().from(paperOrdersTable)
        .where(and(eq(paperOrdersTable.id, orderId), eq(paperOrdersTable.userId, dbUserId)));

      if (!order) {
        return { error: "Order not found" };
      }
      if (order.status !== "pending") {
        return { error: "Only pending orders can be cancelled" };
      }

      await tx.update(paperOrdersTable)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(paperOrdersTable.id, orderId));

      if (order.reservedCash > 0) {
        const lockedRows = await tx.execute<{ cash_balance: number }>(
          sql`SELECT cash_balance FROM paper_portfolios WHERE user_id = ${dbUserId} FOR UPDATE`
        );
        const rows = Array.isArray(lockedRows) ? lockedRows : (lockedRows as { rows: { cash_balance: number }[] }).rows ?? [];
        const currentCash = Number(rows[0]?.cash_balance ?? 0);

        await tx.execute(
          sql`UPDATE paper_portfolios SET cash_balance = cash_balance + ${order.reservedCash}, updated_at = NOW() WHERE user_id = ${dbUserId}`
        );

        await tx.insert(balanceTransactionsTable).values({
          userId: dbUserId,
          transactionType: 'order_cancel_refund',
          amount: order.reservedCash,
          balanceBefore: currentCash,
          balanceAfter: currentCash + order.reservedCash,
          source: 'pending_order',
          referenceId: `cancel_order_${orderId}`,
        });
      }

      logger.info({ userId: dbUserId, orderId, symbol: order.symbol, side: order.side, refundedCash: order.reservedCash }, "Order cancelled");
      return { success: true };
    });

    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result);

    eventBus.publish({
      eventType: "trade_executed",
      sourceAgent: "PaperTrading",
      payload: {
        userId: (req as AuthenticatedRequest).userId,
        symbol: upperSymbol,
        side,
        quantity: qty,
        price: px,
      },
    }).catch((err) => logger.warn({ err }, "Failed to publish trade_executed event"));
  } catch (err) {
    logger.error({ err }, "Failed to cancel order");
    res.status(500).json({ error: "Failed to cancel order" });
  }
});

export async function evaluatePendingOrders() {
  try {
    const pendingOrders = await db.select().from(paperOrdersTable)
      .where(eq(paperOrdersTable.status, "pending"));

    if (pendingOrders.length === 0) return;

    const symbolSet = new Set(pendingOrders.map(o => o.symbol));
    const symbols = [...symbolSet];
    const livePrices = await getLivePrices(symbols);

    for (const order of pendingOrders) {
      const price = livePrices[order.symbol];
      if (!price) continue;

      const now = new Date();

      if (order.expiresAt && now > order.expiresAt) {
        await db.update(paperOrdersTable)
          .set({ status: "expired", updatedAt: now })
          .where(eq(paperOrdersTable.id, order.id));

        if (order.reservedCash > 0) {
          await db.execute(
            sql`UPDATE paper_portfolios SET cash_balance = cash_balance + ${order.reservedCash}, updated_at = NOW() WHERE user_id = ${order.userId}`
          );
          await db.insert(balanceTransactionsTable).values({
            userId: order.userId,
            transactionType: 'order_expired_refund',
            amount: order.reservedCash,
            balanceBefore: 0,
            balanceAfter: order.reservedCash,
            source: 'pending_order',
            referenceId: `expire_order_${order.id}`,
          });
        }
        logger.info({ orderId: order.id, symbol: order.symbol, side: order.side }, "Order expired");
        continue;
      }

      let shouldFill = false;
      if (order.orderType === "limit") {
        if ((order.side === "buy" || order.side === "short_cover") && price <= (order.limitPrice ?? Infinity)) {
          shouldFill = true;
        } else if ((order.side === "sell" || order.side === "short_sell") && price >= (order.limitPrice ?? 0)) {
          shouldFill = true;
        }
      } else if (order.orderType === "stop") {
        if ((order.side === "sell" || order.side === "short_sell") && price <= (order.stopPrice ?? Infinity)) {
          shouldFill = true;
        } else if ((order.side === "buy" || order.side === "short_cover") && price >= (order.stopPrice ?? 0)) {
          shouldFill = true;
        }
      } else if (order.orderType === "time_based") {
        shouldFill = true;
      }

      if (!shouldFill) continue;

      await db.update(paperOrdersTable)
        .set({ status: "filled", filledAt: now, filledPrice: price, updatedAt: now })
        .where(eq(paperOrdersTable.id, order.id));

      const result = await executeMarketOrder(order.userId, order.symbol, order.side, order.quantity, price, order.id);
      if (result.error) {
        await db.update(paperOrdersTable)
          .set({ status: "rejected", updatedAt: now })
          .where(eq(paperOrdersTable.id, order.id));
        if (order.reservedCash > 0) {
          await db.execute(
            sql`UPDATE paper_portfolios SET cash_balance = cash_balance + ${order.reservedCash}, updated_at = NOW() WHERE user_id = ${order.userId}`
          );
        }
        logger.warn({ orderId: order.id, error: result.error }, "Order fill failed, rejecting");
      } else {
        if (order.reservedCash > 0) {
          const fillCost = order.quantity * price;
          const diff = order.reservedCash - fillCost;
          if (diff > 0.01) {
            await db.execute(
              sql`UPDATE paper_portfolios SET cash_balance = cash_balance + ${diff}, updated_at = NOW() WHERE user_id = ${order.userId}`
            );
          }
        }
        logger.info({ orderId: order.id, symbol: order.symbol, side: order.side, filledPrice: price, quantity: order.quantity }, "Order filled");
      }
    }
  } catch (err) {
    logger.error({ err }, "Order evaluation error");
  }
}

let orderEvalInterval: ReturnType<typeof setInterval> | null = null;

export function startOrderEvaluator() {
  if (orderEvalInterval) return;
  logger.info("Starting pending order evaluator (15s interval)");
  orderEvalInterval = setInterval(evaluatePendingOrders, 15_000);
  setTimeout(evaluatePendingOrders, 5_000);
}

export function stopOrderEvaluator() {
  if (orderEvalInterval) {
    clearInterval(orderEvalInterval);
    orderEvalInterval = null;
  }
}

router.post("/paper-trading/reset", requireAuth, validateBody(z.object({}).strict()), async (req, res) => {
  try {
    const clerkId = (req as AuthenticatedRequest).userId;
    const dbUserId = await resolveUserId(clerkId, req);
    if (!dbUserId) {
      res.status(400).json({ error: "User not found" });
      return;
    }

    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${dbUserId} || '_paper_trade'))`);

      const [portfolio] = await tx
        .select({ cashBalance: paperPortfoliosTable.cashBalance })
        .from(paperPortfoliosTable)
        .where(eq(paperPortfoliosTable.userId, dbUserId));

      const balanceBefore = portfolio?.cashBalance ?? DEFAULT_STARTING_CASH;

      await tx.delete(paperTradesTable).where(eq(paperTradesTable.userId, dbUserId));
      await tx.delete(paperPositionsTable).where(eq(paperPositionsTable.userId, dbUserId));
      await tx.delete(paperOptionsTradesTable).where(eq(paperOptionsTradesTable.userId, dbUserId));
      await tx.delete(paperOptionsPositionsTable).where(eq(paperOptionsPositionsTable.userId, dbUserId));
      await tx.delete(paperOrdersTable).where(eq(paperOrdersTable.userId, dbUserId));
      await tx
        .update(paperPortfoliosTable)
        .set({ cashBalance: DEFAULT_STARTING_CASH, updatedAt: new Date() })
        .where(eq(paperPortfoliosTable.userId, dbUserId));

      await tx.insert(balanceTransactionsTable).values({
        userId: dbUserId,
        transactionType: 'portfolio_reset',
        amount: DEFAULT_STARTING_CASH - balanceBefore,
        balanceBefore,
        balanceAfter: DEFAULT_STARTING_CASH,
        source: 'reset',
        referenceId: `reset_${Date.now()}`,
      });
    });

    const formattedBalance = DEFAULT_STARTING_CASH.toLocaleString("en-US");
    res.json({ success: true, message: `Portfolio reset to $${formattedBalance}` });
  } catch (err) {
    logger.error({ err }, "Paper trading reset error");
    res.status(500).json({ error: "Failed to reset portfolio" });
  }
});

const OptionsTradeSchema = z.object({
  symbol: z.string().min(1).max(10).regex(/^[A-Za-z]{1,10}$/, "Symbol must be 1-10 letters"),
  optionType: z.enum(["CALL", "PUT"]),
  strike: z.number().positive().max(100_000),
  expiration: z.string().min(1).max(20),
  side: z.enum(["buy", "sell"]),
  contracts: z.number().int().positive().max(10_000),
  premium: z.number().positive().max(100_000),
});

router.post("/paper-trading/options-trade", requireAuth, validateBody(OptionsTradeSchema), async (req, res) => {
  try {
    const clerkId = (req as AuthenticatedRequest).userId;
    const dbUserId = await resolveUserId(clerkId, req);
    if (!dbUserId) {
      res.status(400).json({ error: "User not found. Please complete onboarding first." });
      return;
    }

    const { symbol, optionType, strike, expiration, side, contracts } = req.body;
    const upperSymbol = symbol.toUpperCase();

    const underlyingPrice = await getLivePrice(upperSymbol);
    if (!underlyingPrice || underlyingPrice <= 0) {
      res.status(503).json({
        error: `Market data temporarily unavailable — trading paused for ${upperSymbol}. Please try again shortly.`,
        marketDataUnavailable: true,
      });
      return;
    }

    const premium = Math.max(0.01, Math.abs(underlyingPrice - strike) * 0.05 + underlyingPrice * 0.005);
    const totalCost = contracts * premium * 100;

    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${dbUserId.toString()} || '_paper_trade'))`);

      const lockedRows = await tx.execute<{ id: number; cash_balance: number; user_id: string }>(
        sql`SELECT id, cash_balance, user_id FROM paper_portfolios WHERE user_id = ${dbUserId} FOR UPDATE`
      );
      const rows = Array.isArray(lockedRows) ? lockedRows : (lockedRows as { rows: { id: number; cash_balance: number; user_id: string }[] }).rows ?? [];
      const lockedPortfolio = rows[0] ?? null;

      let currentCash: number;
      if (lockedPortfolio) {
        currentCash = Number(lockedPortfolio.cash_balance);
      } else {
        const [created] = await tx
          .insert(paperPortfoliosTable)
          .values({ userId: dbUserId, cashBalance: DEFAULT_STARTING_CASH })
          .returning();
        currentCash = created.cashBalance;
      }

      if (side === "buy") {
        if (currentCash < totalCost) {
          return { error: "> INSUFFICIENT FUNDS — ORDER REJECTED" };
        }

        const newCash = currentCash - totalCost;
        await tx.execute(
          sql`UPDATE paper_portfolios SET cash_balance = cash_balance - ${totalCost}, updated_at = NOW() WHERE user_id = ${dbUserId}`
        );

        await tx.insert(balanceTransactionsTable).values({
          userId: dbUserId,
          transactionType: 'options_buy',
          amount: -totalCost,
          balanceBefore: currentCash,
          balanceAfter: newCash,
          source: 'options_trade',
          referenceId: `buy_${upperSymbol}_${strike}_${optionType}_${contracts}contracts`,
        });

        const [existingPos] = await tx
          .select()
          .from(paperOptionsPositionsTable)
          .where(and(
            eq(paperOptionsPositionsTable.userId, dbUserId),
            eq(paperOptionsPositionsTable.symbol, upperSymbol),
            eq(paperOptionsPositionsTable.optionType, optionType),
            eq(paperOptionsPositionsTable.strike, strike),
            eq(paperOptionsPositionsTable.expiration, expiration)
          ));

        if (existingPos) {
          const newContracts = existingPos.contracts + contracts;
          const newAvgPremium = ((existingPos.contracts * existingPos.avgPremium) + (contracts * premium)) / newContracts;
          await tx
            .update(paperOptionsPositionsTable)
            .set({ contracts: newContracts, avgPremium: newAvgPremium, updatedAt: new Date() })
            .where(eq(paperOptionsPositionsTable.id, existingPos.id));
        } else {
          await tx
            .insert(paperOptionsPositionsTable)
            .values({ userId: dbUserId, symbol: upperSymbol, optionType, strike, expiration, contracts, avgPremium: premium });
        }
      } else {
        const [existingPos] = await tx
          .select()
          .from(paperOptionsPositionsTable)
          .where(and(
            eq(paperOptionsPositionsTable.userId, dbUserId),
            eq(paperOptionsPositionsTable.symbol, upperSymbol),
            eq(paperOptionsPositionsTable.optionType, optionType),
            eq(paperOptionsPositionsTable.strike, strike),
            eq(paperOptionsPositionsTable.expiration, expiration)
          ));

        if (!existingPos || existingPos.contracts < contracts) {
          return { error: "> INSUFFICIENT CONTRACTS — ORDER REJECTED" };
        }

        const newCash = currentCash + totalCost;
        await tx.execute(
          sql`UPDATE paper_portfolios SET cash_balance = cash_balance + ${totalCost}, updated_at = NOW() WHERE user_id = ${dbUserId}`
        );

        await tx.insert(balanceTransactionsTable).values({
          userId: dbUserId,
          transactionType: 'options_sell',
          amount: totalCost,
          balanceBefore: currentCash,
          balanceAfter: newCash,
          source: 'options_trade',
          referenceId: `sell_${upperSymbol}_${strike}_${optionType}_${contracts}contracts`,
        });

        const newContracts = existingPos.contracts - contracts;
        await tx
          .update(paperOptionsPositionsTable)
          .set({ contracts: newContracts, updatedAt: new Date() })
          .where(eq(paperOptionsPositionsTable.id, existingPos.id));
      }

      await tx.insert(paperOptionsTradesTable).values({
        userId: dbUserId,
        symbol: upperSymbol,
        optionType,
        strike,
        expiration,
        side,
        contracts,
        premium,
        totalCost,
      });

      return { success: true, message: `${side.toUpperCase()} ${contracts} ${upperSymbol} $${strike} ${optionType} @ $${premium.toFixed(2)}` };
    });

    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Options trade error");
    res.status(500).json({ error: "Options trade execution failed" });
  }
});

router.get("/paper-trading/options-positions", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as AuthenticatedRequest).userId;
    const dbUserId = await resolveUserId(clerkId, req);
    if (!dbUserId) {
      res.json({ positions: [], trades: [] });
      return;
    }

    const positions = await db
      .select()
      .from(paperOptionsPositionsTable)
      .where(eq(paperOptionsPositionsTable.userId, dbUserId));

    const trades = await db
      .select()
      .from(paperOptionsTradesTable)
      .where(eq(paperOptionsTradesTable.userId, dbUserId))
      .orderBy(desc(paperOptionsTradesTable.createdAt))
      .limit(50);

    res.json({
      positions: positions.filter(p => p.contracts > 0),
      trades,
    });
  } catch (err) {
    logger.error({ err }, "Options positions error");
    res.status(500).json({ error: "Failed to load options positions" });
  }
});

router.get("/paper-trading/spin/status", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as AuthenticatedRequest).userId;
    const dbUserId = await resolveUserId(clerkId, req);
    if (!dbUserId) {
      res.json({ canSpin: false, nextSpinAt: null, todaySpin: null });
      return;
    }

    const today = getTodayUTC();
    const [todaySpin] = await db
      .select()
      .from(dailySpinsTable)
      .where(and(eq(dailySpinsTable.userId, dbUserId), eq(dailySpinsTable.spinDate, today)));

    if (todaySpin) {
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);
      res.json({ canSpin: false, nextSpinAt: tomorrow.toISOString(), todaySpin });
      return;
    }

    res.json({ canSpin: true, nextSpinAt: null, todaySpin: null });
  } catch (err) {
    logger.error({ err }, "Spin status error");
    res.status(500).json({ error: "Failed to get spin status" });
  }
});

router.post("/paper-trading/spin", requireAuth, validateBody(z.object({}).strict()), (req, res) => {
  res.redirect(307, "/api/gamification/spin");
});

router.get("/paper-trading/spin/history", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as AuthenticatedRequest).userId;
    const dbUserId = await resolveUserId(clerkId, req);
    if (!dbUserId) {
      res.json([]);
      return;
    }

    const history = await db
      .select()
      .from(dailySpinsTable)
      .where(eq(dailySpinsTable.userId, dbUserId))
      .orderBy(desc(dailySpinsTable.createdAt))
      .limit(30);

    res.json(history);
  } catch (err) {
    logger.error({ err }, "Spin history error");
    res.status(500).json({ error: "Failed to fetch spin history" });
  }
});

export default router;
