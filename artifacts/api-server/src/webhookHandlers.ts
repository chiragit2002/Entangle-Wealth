import Stripe from 'stripe';
import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { sendZapierWebhook } from './lib/zapierWebhook';
import { logger } from './lib/logger';
import { db } from '@workspace/db';
import { usersTable, paperPortfoliosTable, virtualCashPurchasesTable } from '@workspace/db/schema';
import { eq } from 'drizzle-orm';

interface StripeCheckoutSession {
  metadata?: Record<string, string>;
  customer?: string | null;
  amount_total?: number | null;
}

interface StripeSubscription {
  metadata?: Record<string, string>;
  customer?: string | { id: string } | null;
  status?: string;
  items?: {
    data?: Array<{
      price?: {
        unit_amount?: number | null;
        product?: string | null;
      };
    }>;
  };
}

interface StripeInvoice {
  id: string;
  metadata?: Record<string, string>;
  customer?: string | { id: string } | null;
  amount_paid?: number;
}

async function resolveUserIdFromStripeCustomer(
  stripeCustomerId: string | null | undefined
): Promise<string | null> {
  if (!stripeCustomerId) return null;
  try {
    const [user] = await db
      .select({ id: usersTable.id, subscriptionTier: usersTable.subscriptionTier })
      .from(usersTable)
      .where(eq(usersTable.stripeCustomerId, stripeCustomerId));
    return user?.id || null;
  } catch {
    return null;
  }
}

async function resolveUserTierFromStripeCustomer(
  stripeCustomerId: string | null | undefined
): Promise<string | null> {
  if (!stripeCustomerId) return null;
  try {
    const [user] = await db
      .select({ subscriptionTier: usersTable.subscriptionTier })
      .from(usersTable)
      .where(eq(usersTable.stripeCustomerId, stripeCustomerId));
    return user?.subscriptionTier || null;
  } catch {
    return null;
  }
}

async function resolvePlanTierFromPrice(
  stripe: Stripe,
  priceProductId: string | null | undefined
): Promise<string | null> {
  if (!priceProductId) return null;
  try {
    const product = await stripe.products.retrieve(priceProductId);
    return product.metadata?.tier || null;
  } catch {
    return null;
  }
}

function extractCustomerId(customer: string | { id: string } | null | undefined): string | null {
  if (!customer) return null;
  if (typeof customer === 'string') return customer;
  return customer.id || null;
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string) {
    const stripeSync = await getStripeSync();
    await stripeSync.processWebhook(payload, signature);

    try {
      const stripe = await getUncachableStripeClient();
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!endpointSecret) return;

      const event = stripe.webhooks.constructEvent(payload, signature, endpointSecret);

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as unknown as StripeCheckoutSession;
          const metaUserId = session.metadata?.userId || null;
          const stripeCustomerId = typeof session.customer === 'string' ? session.customer : null;
          const userId = metaUserId || await resolveUserIdFromStripeCustomer(stripeCustomerId);

          if (session.metadata?.type === 'virtual_cash' && userId && session.metadata?.virtualAmount) {
            const virtualAmount = Number(session.metadata.virtualAmount);
            const sessionId = (event.data.object as any).id as string;

            try {
              const alreadyProcessed = await db
                .select({ id: virtualCashPurchasesTable.id })
                .from(virtualCashPurchasesTable)
                .where(eq(virtualCashPurchasesTable.stripeSessionId, sessionId));

              if (alreadyProcessed.length === 0) {
                const [existingPortfolio] = await db
                  .select()
                  .from(paperPortfoliosTable)
                  .where(eq(paperPortfoliosTable.userId, userId));

                if (existingPortfolio) {
                  await db
                    .update(paperPortfoliosTable)
                    .set({ cashBalance: existingPortfolio.cashBalance + virtualAmount, updatedAt: new Date() })
                    .where(eq(paperPortfoliosTable.userId, userId));
                } else {
                  await db
                    .insert(paperPortfoliosTable)
                    .values({ userId, cashBalance: 100000 + virtualAmount });
                }

                await db.insert(virtualCashPurchasesTable).values({
                  userId,
                  stripeSessionId: sessionId,
                  amountPaidCents: session.amount_total || 0,
                  virtualAmountCredited: virtualAmount,
                });

                logger.info({ userId, virtualAmount, sessionId }, 'Virtual cash credited to paper trading account');
              }
            } catch (err) {
              logger.error({ err, userId, virtualAmount, sessionId }, 'Failed to credit virtual cash');
            }
          } else {
            const planTier = await resolveUserTierFromStripeCustomer(stripeCustomerId);
            sendZapierWebhook('subscription_changed', {
              action: 'created',
              userId,
              planTier,
              amount: session.amount_total,
              subscriptionStatus: 'active',
            }).catch(err => logger.warn({ err, userId, planTier }, 'Failed to send subscription_changed (created) Zapier webhook'));
          }
          break;
        }
        case 'customer.subscription.updated': {
          const sub = event.data.object as unknown as StripeSubscription;
          const stripeCustomerId = extractCustomerId(sub.customer);
          const metaUserId = sub.metadata?.userId || null;
          const userId = metaUserId || await resolveUserIdFromStripeCustomer(stripeCustomerId);
          const priceProductId = sub.items?.data?.[0]?.price?.product || null;
          const planTier = await resolvePlanTierFromPrice(stripe, priceProductId) ||
            await resolveUserTierFromStripeCustomer(stripeCustomerId);

          sendZapierWebhook('subscription_changed', {
            action: 'updated',
            userId,
            planTier,
            amount: sub.items?.data?.[0]?.price?.unit_amount || null,
            subscriptionStatus: sub.status || null,
          }).catch(err => logger.warn({ err, userId, planTier }, 'Failed to send subscription_changed (updated) Zapier webhook'));
          break;
        }
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as unknown as StripeInvoice;
          const stripeCustomerId = extractCustomerId(invoice.customer);
          const metaUserId = invoice.metadata?.userId || null;
          const userId = metaUserId || await resolveUserIdFromStripeCustomer(stripeCustomerId);

          sendZapierWebhook('payment_received', {
            userId,
            amount: invoice.amount_paid,
            invoiceId: invoice.id,
          }).catch(err => logger.warn({ err, userId, invoiceId: invoice.id }, 'Failed to send payment_received Zapier webhook'));
          break;
        }
      }
    } catch (err) {
      logger.warn({ error: err }, '[zapier] Failed to dispatch Stripe event to Zapier');
    }
  }
}
