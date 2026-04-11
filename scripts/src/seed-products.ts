import { getUncachableStripeClient } from './stripeClient';

const VIRTUAL_CASH_TIERS = [
  { name: 'Practice Cash $10,000', amount: 100, virtualAmount: 10000 },
  { name: 'Practice Cash $50,000', amount: 500, virtualAmount: 50000 },
  { name: 'Practice Cash $100,000', amount: 1000, virtualAmount: 100000 },
  { name: 'Practice Cash $250,000', amount: 2500, virtualAmount: 250000 },
  { name: 'Practice Cash $500,000', amount: 5000, virtualAmount: 500000 },
  { name: 'Practice Cash $1,000,000', amount: 10000, virtualAmount: 1000000 },
];

async function seedVirtualCashProducts(stripe: Awaited<ReturnType<typeof getUncachableStripeClient>>) {
  const existing = await stripe.products.search({ query: "metadata['type']:'virtual_cash'" });
  if (existing.data.length >= VIRTUAL_CASH_TIERS.length) {
    console.log('Virtual cash products already exist, skipping');
    return;
  }

  for (const tier of VIRTUAL_CASH_TIERS) {
    const product = await stripe.products.create({
      name: tier.name,
      description: `Add $${tier.virtualAmount.toLocaleString()} in virtual practice cash to your paper trading account`,
      metadata: {
        type: 'virtual_cash',
        virtualAmount: String(tier.virtualAmount),
      },
    });

    await stripe.prices.create({
      product: product.id,
      unit_amount: tier.amount,
      currency: 'usd',
    });

    console.log(`Created virtual cash product: ${tier.name} (${tier.virtualAmount} virtual cash for $${(tier.amount / 100).toFixed(2)})`);
  }
}

async function createProducts() {
  const stripe = await getUncachableStripeClient();

  const existingProducts = await stripe.products.search({ query: "name:'EntangleWealth Pro'" });
  if (existingProducts.data.length === 0) {
    const proProduct = await stripe.products.create({
      name: 'EntangleWealth Pro',
      description: 'Unlimited AI stock analysis, priority support, advanced portfolio tools',
      metadata: { tier: 'pro' },
    });

    await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 2900,
      currency: 'usd',
      recurring: { interval: 'month' },
    });

    await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 29000,
      currency: 'usd',
      recurring: { interval: 'year' },
    });

    console.log('Created Pro product:', proProduct.id);

    const enterpriseProduct = await stripe.products.create({
      name: 'EntangleWealth Enterprise',
      description: 'Everything in Pro plus API access, white-label reports, dedicated support',
      metadata: { tier: 'enterprise' },
    });

    await stripe.prices.create({
      product: enterpriseProduct.id,
      unit_amount: 9900,
      currency: 'usd',
      recurring: { interval: 'month' },
    });

    await stripe.prices.create({
      product: enterpriseProduct.id,
      unit_amount: 99000,
      currency: 'usd',
      recurring: { interval: 'year' },
    });

    console.log('Created Enterprise product:', enterpriseProduct.id);
  } else {
    console.log('Subscription products already exist, skipping');
  }

  await seedVirtualCashProducts(stripe);
  console.log('Done! Products will sync to database via webhooks.');
}

createProducts().catch(console.error);
