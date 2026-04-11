import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, virtualCashPurchasesTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { getUncachableStripeClient, getStripePublishableKey } from "../stripeClient";
import { resolveUserId } from "../lib/resolveUserId";

const router = Router();

router.get("/stripe/config", async (_req, res) => {
  try {
    const publishableKey = await getStripePublishableKey();
    res.json({ publishableKey });
  } catch (error) {
    console.error("Error getting Stripe config:", error);
    res.status(500).json({ error: "Failed to get Stripe configuration" });
  }
});

router.get("/stripe/products", async (_req, res) => {
  try {
    const stripe = await getUncachableStripeClient();
    const products = await stripe.products.list({ active: true, limit: 10 });
    const prices = await stripe.prices.list({ active: true, limit: 50 });

    const result = products.data
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

    res.json(result);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.json([]);
  }
});

router.post("/stripe/create-checkout", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const { priceId } = req.body;

  if (!priceId || typeof priceId !== "string" || !priceId.startsWith("price_")) {
    res.status(400).json({ error: "Valid price ID required" });
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();

    const price = await stripe.prices.retrieve(priceId);
    if (!price.active) {
      res.status(400).json({ error: "Price is no longer available" });
      return;
    }
    const product = await stripe.products.retrieve(price.product as string);
    const tier = product.metadata?.tier;
    if (!tier || !["pro", "enterprise"].includes(tier)) {
      res.status(400).json({ error: "Invalid product" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (user.kycStatus !== "verified" && user.kycStatus !== "pending_review") {
      res.status(403).json({ error: "KYC verification required before making payments." });
      return;
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

    const domains = process.env.REPLIT_DOMAINS?.split(",") || [];
    const baseUrl = domains.length > 0 ? `https://${domains[0]}` : "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${baseUrl}/profile?payment=success`,
      cancel_url: `${baseUrl}/profile?payment=cancelled`,
      metadata: { userId: user.id },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

router.get("/stripe/subscription", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
    if (!user || !user.stripeSubscriptionId) {
      res.json({ active: false, tier: "free" });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

    res.json({
      active: subscription.status === "active",
      tier: user.subscriptionTier || "free",
      status: subscription.status,
      currentPeriodEnd: (subscription as any).current_period_end ?? null,
    });
  } catch (error) {
    console.error("Subscription check error:", error);
    res.json({ active: false, tier: "free" });
  }
});

router.get("/stripe/virtual-cash-products", async (_req, res) => {
  try {
    const stripe = await getUncachableStripeClient();
    const products = await stripe.products.list({ active: true, limit: 50 });
    const prices = await stripe.prices.list({ active: true, limit: 100 });

    const virtualCashProducts = products.data
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

    res.json(virtualCashProducts);
  } catch (error) {
    console.error("Error fetching virtual cash products:", error);
    res.json([]);
  }
});

router.post("/stripe/create-virtual-cash-checkout", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const { priceId } = req.body;

  if (!priceId || typeof priceId !== "string" || !priceId.startsWith("price_")) {
    res.status(400).json({ error: "Valid price ID required" });
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();

    const price = await stripe.prices.retrieve(priceId);
    if (!price.active) {
      res.status(400).json({ error: "Price is no longer available" });
      return;
    }
    const product = await stripe.products.retrieve(price.product as string);
    if (product.metadata?.type !== "virtual_cash" || !product.metadata?.virtualAmount) {
      res.status(400).json({ error: "Invalid product — not a virtual cash package" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
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

    const domains = process.env.REPLIT_DOMAINS?.split(",") || [];
    const baseUrl = domains.length > 0 ? `https://${domains[0]}` : "http://localhost:3000";

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

    res.json({ url: session.url });
  } catch (error) {
    console.error("Virtual cash checkout error:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
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
    console.error("Error fetching purchase history:", error);
    res.json([]);
  }
});

router.post("/stripe/create-portal", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
    if (!user?.stripeCustomerId) {
      res.status(400).json({ error: "No billing account found" });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const domains = process.env.REPLIT_DOMAINS?.split(",") || [];
    const baseUrl = domains.length > 0 ? `https://${domains[0]}` : "http://localhost:3000";

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${baseUrl}/profile`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Portal error:", error);
    res.status(500).json({ error: "Failed to create portal session" });
  }
});

export default router;
