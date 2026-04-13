import Stripe from 'stripe';
import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { sendZapierWebhook } from './lib/zapierWebhook';
import { logger } from './lib/logger';
import { db } from '@workspace/db';
import { usersTable, paperPortfoliosTable, virtualCashPurchasesTable, webhookEventsTable } from '@workspace/db/schema';
import { eq, sql } from 'drizzle-orm';

async function resolveUserIdFromStripeCustomer(
  stripeCustomerId: string | null | undefined
): Promise<string | null> {
  if (!stripeCustomerId) return null;
  try {
    const [user] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.stripeCustomerId, stripeCustomerId));
    return user?.id || null;
  } catch {
    return null;
  }
}

async function resolveUserTierFromId(userId: string): Promise<string | null> {
  const [user] = await db
    .select({ subscriptionTier: usersTable.subscriptionTier })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  return user?.subscriptionTier || null;
}

async function resolvePlanTierFromProduct(
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

function extractCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined
): string | null {
  if (!customer) return null;
  if (typeof customer === 'string') return customer;
  return customer.id || null;
}

async function logWebhookEvent(params: {
  eventId: string;
  eventType: string;
  stripeCustomerId: string | null;
  userId: string | null;
  tierBefore: string | null;
  tierAfter: string | null;
  status: 'success' | 'error';
  errorMessage?: string;
}): Promise<void> {
  await db.insert(webhookEventsTable).values({
    eventId: params.eventId,
    eventType: params.eventType,
    stripeCustomerId: params.stripeCustomerId,
    userId: params.userId,
    tierBefore: params.tierBefore,
    tierAfter: params.tierAfter,
    status: params.status,
    errorMessage: params.errorMessage || null,
  }).onConflictDoNothing();
}

async function updateUserTier(
  userId: string,
  newTier: string,
  context: string
): Promise<void> {
  const updated = await db
    .update(usersTable)
    .set({ subscriptionTier: newTier })
    .where(eq(usersTable.id, userId))
    .returning({ id: usersTable.id });

  if (updated.length === 0) {
    throw new Error(`${context}: db update affected 0 rows for userId ${userId}`);
  }
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string) {
    const stripeSync = await getStripeSync();
    await stripeSync.processWebhook(payload, signature);

    const stripe = await getUncachableStripeClient();
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!endpointSecret) return;

    const event = stripe.webhooks.constructEvent(payload, signature, endpointSecret);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const metaUserId = session.metadata?.userId || null;
        const stripeCustomerId = typeof session.customer === 'string' ? session.customer : null;

        if (session.metadata?.type === 'virtual_cash' && metaUserId && session.metadata?.virtualAmount) {
          const userId = metaUserId;
          const virtualAmount = Number(session.metadata.virtualAmount);
          const sessionId = session.id;

          await db.transaction(async (tx) => {
            await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${sessionId}))`);

            const alreadyProcessed = await tx
              .select({ id: virtualCashPurchasesTable.id })
              .from(virtualCashPurchasesTable)
              .where(eq(virtualCashPurchasesTable.stripeSessionId, sessionId));

            if (alreadyProcessed.length > 0) return;

            const [existingPortfolio] = await tx
              .select()
              .from(paperPortfoliosTable)
              .where(eq(paperPortfoliosTable.userId, userId));

            if (existingPortfolio) {
              await tx
                .update(paperPortfoliosTable)
                .set({ cashBalance: existingPortfolio.cashBalance + virtualAmount, updatedAt: new Date() })
                .where(eq(paperPortfoliosTable.userId, userId));
            } else {
              await tx
                .insert(paperPortfoliosTable)
                .values({ userId, cashBalance: 100000 + virtualAmount });
            }

            await tx.insert(virtualCashPurchasesTable).values({
              userId,
              stripeSessionId: sessionId,
              amountPaidCents: session.amount_total || 0,
              virtualAmountCredited: virtualAmount,
            });

            logger.info({ userId, virtualAmount, sessionId }, 'Virtual cash credited to paper trading account');
          });

          await logWebhookEvent({
            eventId: event.id,
            eventType: event.type,
            stripeCustomerId,
            userId,
            tierBefore: null,
            tierAfter: null,
            status: 'success',
          });
        } else {
          const userId = metaUserId || await resolveUserIdFromStripeCustomer(stripeCustomerId);

          if (!userId) {
            await logWebhookEvent({
              eventId: event.id,
              eventType: event.type,
              stripeCustomerId,
              userId: null,
              tierBefore: null,
              tierAfter: null,
              status: 'error',
              errorMessage: 'Could not resolve userId from checkout session',
            });
            throw new Error(`checkout.session.completed: cannot resolve userId for customer ${stripeCustomerId}`);
          }

          const expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
            expand: ['line_items.data.price.product'],
          });

          let newTier: string | null = null;
          const lineItem = expandedSession.line_items?.data?.[0];
          const price = lineItem?.price;
          if (
            price &&
            typeof price.product === 'object' &&
            price.product !== null &&
            !('deleted' in price.product)
          ) {
            newTier = (price.product as Stripe.Product).metadata?.tier || null;
          }

          if (!newTier) {
            await logWebhookEvent({
              eventId: event.id,
              eventType: event.type,
              stripeCustomerId,
              userId,
              tierBefore: null,
              tierAfter: null,
              status: 'error',
              errorMessage: 'Could not resolve tier from product metadata',
            });
            throw new Error(`checkout.session.completed: cannot resolve tier for userId ${userId}`);
          }

          const tierBefore = await resolveUserTierFromId(userId);

          const updateData: Partial<typeof usersTable.$inferInsert> = { subscriptionTier: newTier };
          if (typeof session.subscription === 'string') {
            updateData.stripeSubscriptionId = session.subscription;
          }

          const updated = await db
            .update(usersTable)
            .set(updateData)
            .where(eq(usersTable.id, userId))
            .returning({ id: usersTable.id });

          if (updated.length === 0) {
            await logWebhookEvent({
              eventId: event.id,
              eventType: event.type,
              stripeCustomerId,
              userId,
              tierBefore,
              tierAfter: newTier,
              status: 'error',
              errorMessage: 'DB update affected 0 rows',
            });
            throw new Error(`checkout.session.completed: db update affected 0 rows for userId ${userId}`);
          }

          logger.info({ userId, newTier, tierBefore }, 'Updated subscription tier on checkout.session.completed');

          await logWebhookEvent({
            eventId: event.id,
            eventType: event.type,
            stripeCustomerId,
            userId,
            tierBefore,
            tierAfter: newTier,
            status: 'success',
          });

          sendZapierWebhook('subscription_changed', {
            action: 'created',
            userId,
            planTier: newTier,
            amount: session.amount_total,
            subscriptionStatus: 'active',
          }).catch(err => logger.warn({ err, userId, newTier }, 'Failed to send subscription_changed (created) Zapier webhook'));
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const stripeCustomerId = extractCustomerId(sub.customer);
        const metaUserId = sub.metadata?.userId || null;
        const userId = metaUserId || await resolveUserIdFromStripeCustomer(stripeCustomerId);

        const isCanceled = sub.status === 'canceled' || sub.status === 'unpaid';
        let newTier: string | null = null;

        if (isCanceled) {
          newTier = 'free';
        } else {
          const priceProductId = sub.items?.data?.[0]?.price?.product;
          const productId =
            typeof priceProductId === 'string'
              ? priceProductId
              : priceProductId && typeof priceProductId === 'object'
              ? (priceProductId as Stripe.Product).id
              : null;
          newTier = await resolvePlanTierFromProduct(stripe, productId);
        }

        if (!userId) {
          await logWebhookEvent({
            eventId: event.id,
            eventType: event.type,
            stripeCustomerId,
            userId: null,
            tierBefore: null,
            tierAfter: newTier,
            status: 'error',
            errorMessage: 'Could not resolve userId from subscription',
          });
          throw new Error(`customer.subscription.updated: cannot resolve userId for customer ${stripeCustomerId}`);
        }

        if (!newTier) {
          await logWebhookEvent({
            eventId: event.id,
            eventType: event.type,
            stripeCustomerId,
            userId,
            tierBefore: null,
            tierAfter: null,
            status: 'error',
            errorMessage: 'Could not resolve tier from subscription product metadata',
          });
          throw new Error(`customer.subscription.updated: cannot resolve tier for userId ${userId}`);
        }

        const tierBefore = await resolveUserTierFromId(userId);

        await updateUserTier(userId, newTier, 'customer.subscription.updated');
        logger.info({ userId, newTier, tierBefore, status: sub.status }, 'Updated subscription tier on customer.subscription.updated');

        await logWebhookEvent({
          eventId: event.id,
          eventType: event.type,
          stripeCustomerId,
          userId,
          tierBefore,
          tierAfter: newTier,
          status: 'success',
        });

        sendZapierWebhook('subscription_changed', {
          action: 'updated',
          userId,
          planTier: newTier,
          amount: sub.items?.data?.[0]?.price?.unit_amount || null,
          subscriptionStatus: sub.status || null,
        }).catch(err => logger.warn({ err, userId, newTier }, 'Failed to send subscription_changed (updated) Zapier webhook'));
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeCustomerId = extractCustomerId(invoice.customer);
        const metaUserId = invoice.metadata?.userId || null;
        const userId = metaUserId || await resolveUserIdFromStripeCustomer(stripeCustomerId);

        await logWebhookEvent({
          eventId: event.id,
          eventType: event.type,
          stripeCustomerId,
          userId,
          tierBefore: null,
          tierAfter: null,
          status: 'success',
        });

        sendZapierWebhook('payment_received', {
          userId,
          amount: invoice.amount_paid,
          invoiceId: invoice.id,
        }).catch(err => logger.warn({ err, userId, invoiceId: invoice.id }, 'Failed to send payment_received Zapier webhook'));
        break;
      }

      default: {
        await logWebhookEvent({
          eventId: event.id,
          eventType: event.type,
          stripeCustomerId: null,
          userId: null,
          tierBefore: null,
          tierAfter: null,
          status: 'success',
        });
        break;
      }
    }
  }
}
