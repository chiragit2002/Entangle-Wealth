import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, virtualCashPurchasesTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { getUncachableStripeClient, getStripePublishableKey } from "../stripeClient";
import { resolveUserId } from "../lib/resolveUserId";
import { validateBody, z } from "../lib/validateRequest";
import { logger } from "../lib/logger";
import { isPromoActive, PROMO_END_ISO } from "../lib/userDailyLimits";
import { stripeCircuit } from "../lib/circuitBreaker";

const PriceIdSchema = z.object({
  priceId: z.string().regex(/^price_/, "Must be a valid Stripe price ID"),
});

const router = Router();

router.get("/stripe/promo", async (_req, res) => {
  const promo = isPromoActive();
  res.json({
    active: promo,
    endsAt: PROMO_END_ISO,
    message: promo ? "All Pro features are free during our launch promotion!" : null,
  });
});

router.get("/stripe/config", async (_req, res) => {
  try {
    const publishableKey = await stripeCircuit.execute(() => getStripePublishableKey());
    res.json({ publishableKey });
  } catch (error) {
    logger.error({ err: error }, "Error getting Stripe config");
    res.status(503).json({ error: "Stripe service temporarily unavailable" });
  }
});

router.get("/stripe/products", async (_req, res) => {
  try {
    const result = await stripeCircuit.execute(async () => {
      const stripe = await getUncachableStripeClient();
      const products = await stripe.products.list({ active: true, limit: 10 });
      const prices = await stripe.prices.list({ active: true, limit: 50 });

      return products.data
        .map((product) => {
          const productPrices = prices.data.filter(
            (p) => p.product === product.id
          );
          return productPrices.map((price) => ({
            id: product.id,
            name: product.name,
            description: product.description,
            metadata: product.metadata,
            price_id: price.id,
            unit_amount: price.unit_amount,
            currency: price.currency,
            recurring: price.recurring,
          }));
        })
        .flat()
        .sort((a, b) => (a.unit_amount || 0) - (b.unit_amount || 0));
    });

    res.json(result);
  } catch (error) {
    logger.warn({ err: error }, "Stripe products unavailable, returning empty list");
    res.status(200).json([]);
  }
});

router.post("/stripe/create-checkout", requireAuth, validateBody(PriceIdSchema), async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const { priceId } = req.body;

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const domains = process.env.REPLIT_DOMAINS?.split(",") || [];
    const baseUrl = domains.length > 0 ? `https://${domains[0]}` : "http://localhost:3000";

    const sessionUrl = await stripeCircuit.execute(async () => {
      const stripe = await getUncachableStripeClient();

      const price = await stripe.prices.retrieve(priceId);
      if (!price.active) throw Object.assign(new Error("Price is no longer available"), { status: 400 });

      const product = await stripe.products.retrieve(price.product as string);
      const tier = product.metadata?.tier;
      if (!tier || !["pro", "enterprise"].includes(tier)) {
        throw Object.assign(new Error("Invalid product"), { status: 400 });
      }

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          metadata: { userId: user.id },
        });
        customerId = customer.id;
        await db.update(usersTable).set({ stripeCustomerId: customerId }).where(eq(usersTable.id, user.id));
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${baseUrl}/profile?payment=success`,
        cancel_url: `${baseUrl}/profile?payment=cancelled`,
        metadata: { userId: user.id },
      });

      return session.url;
    });

    res.json({ url: sessionUrl });
  } catch (error) {
    const errObj = error as { status?: number; message?: string };
    if (errObj.status === 400) {
      res.status(400).json({ error: errObj.message || "Invalid request" });
      return;
    }
    logger.error({ err: error }, "Checkout error");
    res.status(503).json({ error: "Payment service temporarily unavailable" });
  }
});

router.get("/stripe/subscription", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;

  try {
    const promo = isPromoActive();

    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
    if (!user || !user.stripeSubscriptionId) {
      res.json({ active: promo, tier: promo ? "promo" : "free", promo });
      return;
    }

    const subData = await stripeCircuit.execute(async () => {
      const stripe = await getUncachableStripeClient();
      return stripe.subscriptions.retrieve(user.stripeSubscriptionId!);
    });

    res.json({
      active: subData.status === "active" || promo,
      tier: user.subscriptionTier || (promo ? "promo" : "free"),
      status: subData.status,
      currentPeriodEnd: (subData as any).current_period_end ?? null,
      promo,
    });
  } catch (error) {
    logger.error({ err: error }, "Subscription check error");
    res.status(503).json({ error: "Payment service temporarily unavailable" });
  }
});

router.get("/stripe/virtual-cash-products", async (_req, res) => {
  try {
    const virtualCashProducts = await stripeCircuit.execute(async () => {
      const stripe = await getUncachableStripeClient();
      const products = await stripe.products.list({ active: true, limit: 50 });
      const prices = await stripe.prices.list({ active: true, limit: 100 });

      return products.data
        .filter((p) => p.metadata?.type === "virtual_cash")
        .map((product) => {
          const price = prices.data.find((pr) => pr.product === product.id);
          if (!price) return null;
          return {
            productId: product.id,
            priceId: price.id,
            name: product.name,
            description: product.description,
            virtualAmount: Number(product.metadata.virtualAmount),
            unitAmount: price.unit_amount,
            currency: price.currency,
          };
        })
        .filter(Boolean)
        .sort((a, b) => (a!.unitAmount || 0) - (b!.unitAmount || 0));
    });

    res.json(virtualCashProducts);
  } catch (error) {
    logger.error({ err: error }, "Error fetching virtual cash products");
    res.status(503).json({ error: "Payment service temporarily unavailable" });
  }
});

router.post("/stripe/create-virtual-cash-checkout", requireAuth, validateBody(PriceIdSchema), async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const { priceId } = req.body;

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (user.kycStatus !== "verified" && user.kycStatus !== "pending_review") {
      res.status(403).json({ error: "KYC verification required before making real-money purchases. Please complete identity verification in your profile settings." });
      return;
    }

    const domains = process.env.REPLIT_DOMAINS?.split(",") || [];
    const baseUrl = domains.length > 0 ? `https://${domains[0]}` : "http://localhost:3000";

    const sessionUrl = await stripeCircuit.execute(async () => {
      const stripe = await getUncachableStripeClient();

      const price = await stripe.prices.retrieve(priceId);
      if (!price.active) throw Object.assign(new Error("Price is no longer available"), { status: 400 });

      const product = await stripe.products.retrieve(price.product as string);
      if (product.metadata?.type !== "virtual_cash" || !product.metadata?.virtualAmount) {
        throw Object.assign(new Error("Invalid product — not a virtual cash package"), { status: 400 });
      }

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          metadata: { userId: user.id },
        });
        customerId = customer.id;
        await db.update(usersTable).set({ stripeCustomerId: customerId }).where(eq(usersTable.id, user.id));
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "payment",
        success_url: `${baseUrl}/?payment=success&type=virtual_cash`,
        cancel_url: `${baseUrl}/?payment=cancelled`,
        metadata: {
          userId: user.id,
          type: "virtual_cash",
          virtualAmount: product.metadata.virtualAmount,
        },
      });

      return session.url;
    });

    res.json({ url: sessionUrl });
  } catch (error) {
    const errObj = error as { status?: number; message?: string };
    if (errObj.status === 400) {
      res.status(400).json({ error: errObj.message || "Invalid request" });
      return;
    }
    logger.error({ err: error }, "Virtual cash checkout error");
    res.status(503).json({ error: "Payment service temporarily unavailable" });
  }
});

router.get("/stripe/virtual-cash-purchases", requireAuth, async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  try {
    const dbUserId = await resolveUserId(clerkId, req);
    if (!dbUserId) {
      res.json([]);
      return;
    }

    const purchases = await db
      .select()
      .from(virtualCashPurchasesTable)
      .where(eq(virtualCashPurchasesTable.userId, dbUserId))
      .orderBy(desc(virtualCashPurchasesTable.createdAt))
      .limit(50);

    res.json(purchases);
  } catch (error) {
    logger.error({ err: error }, "Error fetching purchase history");
    res.status(500).json({ error: "Failed to fetch purchase history" });
  }
});

router.post("/stripe/create-portal", requireAuth, validateBody(z.object({}).strict()), async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
    if (!user?.stripeCustomerId) {
      res.status(400).json({ error: "No billing account found" });
      return;
    }

    const domains = process.env.REPLIT_DOMAINS?.split(",") || [];
    const baseUrl = domains.length > 0 ? `https://${domains[0]}` : "http://localhost:3000";

    const sessionUrl = await stripeCircuit.execute(async () => {
      const stripe = await getUncachableStripeClient();
      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId!,
        return_url: `${baseUrl}/profile`,
      });
      return session.url;
    });

    res.json({ url: sessionUrl });
  } catch (error) {
    logger.error({ err: error }, "Portal error");
    res.status(503).json({ error: "Payment service temporarily unavailable" });
  }
});

export default router;
