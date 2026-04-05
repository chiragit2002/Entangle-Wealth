import { getStripeSync } from './stripeClient';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string) {
    const stripeSync = await getStripeSync();
    await stripeSync.processWebhook(payload, signature);
  }
}
