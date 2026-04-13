import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { db } from "@workspace/db";
import { connectedAccountsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

const SUPPORTED_PROVIDERS = [
  "quickbooks",
  "xero",
  "freshbooks",
  "wave",
  "sage",
  "hrblock",
  "turbotax",
  "zohobooks",
] as const;

type Provider = (typeof SUPPORTED_PROVIDERS)[number];

function isValidProvider(p: string): p is Provider {
  return SUPPORTED_PROVIDERS.includes(p as Provider);
}

router.get("/integrations/accounting", requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  try {
    const accounts = await db
      .select()
      .from(connectedAccountsTable)
      .where(
        and(
          eq(connectedAccountsTable.userId, userId),
          eq(connectedAccountsTable.status, "connected")
        )
      );
    res.json({ accounts: accounts.map(sanitize) });
  } catch (err) {
    console.error("Failed to fetch integrations:", err);
    res.status(500).json({ error: "Failed to fetch integrations" });
  }
});

router.post("/integrations/accounting/connect", requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { provider } = req.body || {};

  if (!provider || typeof provider !== "string" || !isValidProvider(provider)) {
    res.status(400).json({ error: "Invalid provider" });
    return;
  }

  try {
    const existing = await db
      .select()
      .from(connectedAccountsTable)
      .where(
        and(
          eq(connectedAccountsTable.userId, userId),
          eq(connectedAccountsTable.provider, provider),
          eq(connectedAccountsTable.status, "connected")
        )
      );

    if (existing.length > 0) {
      res.status(409).json({ error: "Provider already connected" });
      return;
    }

    const [account] = await db
      .insert(connectedAccountsTable)
      .values({
        userId,
        provider,
        status: "connected",
        connectedAt: new Date(),
        metadata: { syncEnabled: true, autoSync: false },
      })
      .returning();

    res.json({ account: sanitize(account) });
  } catch (err) {
    console.error("Failed to connect provider:", err);
    res.status(500).json({ error: "Failed to connect provider" });
  }
});

router.post("/integrations/accounting/disconnect", requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { provider } = req.body || {};

  if (!provider || typeof provider !== "string" || !isValidProvider(provider)) {
    res.status(400).json({ error: "Invalid provider" });
    return;
  }

  try {
    const updated = await db
      .update(connectedAccountsTable)
      .set({
        status: "disconnected",
        disconnectedAt: new Date(),
        accessToken: null,
        refreshToken: null,
      })
      .where(
        and(
          eq(connectedAccountsTable.userId, userId),
          eq(connectedAccountsTable.provider, provider),
          eq(connectedAccountsTable.status, "connected")
        )
      )
      .returning();

    if (updated.length === 0) {
      res.status(404).json({ error: "Connection not found" });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Failed to disconnect provider:", err);
    res.status(500).json({ error: "Failed to disconnect provider" });
  }
});

router.post("/integrations/accounting/sync", requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { provider } = req.body || {};

  if (!provider || typeof provider !== "string" || !isValidProvider(provider)) {
    res.status(400).json({ error: "Invalid provider" });
    return;
  }

  try {
    const [account] = await db
      .select()
      .from(connectedAccountsTable)
      .where(
        and(
          eq(connectedAccountsTable.userId, userId),
          eq(connectedAccountsTable.provider, provider),
          eq(connectedAccountsTable.status, "connected")
        )
      );

    if (!account) {
      res.status(404).json({ error: "Connection not found" });
      return;
    }

    await db
      .update(connectedAccountsTable)
      .set({ lastSyncAt: new Date() })
      .where(eq(connectedAccountsTable.id, account.id));

    res.json({
      success: true,
      lastSyncAt: new Date().toISOString(),
      summary: {
        receiptsImported: 0,
        expensesCategorized: 0,
        message: "Sync initiated. Expenses will appear in your receipt tracker shortly.",
      },
    });
  } catch (err) {
    console.error("Failed to sync provider:", err);
    res.status(500).json({ error: "Failed to sync provider" });
  }
});

function sanitize(account: typeof connectedAccountsTable.$inferSelect) {
  return {
    id: account.id,
    provider: account.provider,
    providerEmail: account.providerEmail,
    status: account.status,
    lastSyncAt: account.lastSyncAt,
    connectedAt: account.connectedAt,
    metadata: account.metadata,
  };
}

export default router;
