import { getUncachableStripeClient } from './stripeClient';

async function createProducts() {
  const stripe = await getUncachableStripeClient();

  const existingProducts = await stripe.products.search({ query: "name:'EntangleWealth Pro'" });
  if (existingProducts.data.length > 0) {
    console.log('Products already exist, skipping seed');
    return;
  }

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
  console.log('Done! Products will sync to database via webhooks.');
}

createProducts().catch(console.error);
