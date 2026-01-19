/**
 * Stripe決済履歴のメタデータ調査スクリプト
 * 全ての顧客、サブスクリプション、決済のメタデータを確認
 */

import 'dotenv/config';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

interface StripeCustomer {
  id: string;
  email: string | null;
  name: string | null;
  metadata: Record<string, string>;
  created: number;
}

interface StripeSubscription {
  id: string;
  customer: string;
  status: string;
  metadata: Record<string, string>;
  items: {
    data: Array<{
      price: {
        id: string;
        nickname: string | null;
        product: string;
      };
    }>;
  };
}

interface StripeCharge {
  id: string;
  customer: string | null;
  amount: number;
  currency: string;
  description: string | null;
  metadata: Record<string, string>;
  created: number;
}

interface StripeProduct {
  id: string;
  name: string;
  metadata: Record<string, string>;
}

async function fetchStripe(endpoint: string): Promise<any> {
  const response = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
    },
  });
  return response.json();
}

async function main() {
  console.log('=== Stripe メタデータ調査 ===\n');

  // 1. 全顧客のメタデータを確認
  console.log('【1. 顧客のメタデータ】');
  const customers = await fetchStripe('/customers?limit=100');
  let customersWithMetadata = 0;
  let customersWithDiscordId = 0;
  let customersWithLmessageId = 0;

  for (const customer of customers.data as StripeCustomer[]) {
    const metadataKeys = Object.keys(customer.metadata || {});
    if (metadataKeys.length > 0) {
      customersWithMetadata++;
      console.log(`  顧客 ${customer.id} (${customer.email}): ${JSON.stringify(customer.metadata)}`);
      if (customer.metadata.discord_id) customersWithDiscordId++;
      if (customer.metadata.lmessage_user_id) customersWithLmessageId++;
    }
  }
  console.log(`  合計: ${customers.data.length}件中、メタデータあり: ${customersWithMetadata}件`);
  console.log(`  - discord_id あり: ${customersWithDiscordId}件`);
  console.log(`  - lmessage_user_id あり: ${customersWithLmessageId}件`);
  console.log('');

  // 2. 全サブスクリプションのメタデータを確認
  console.log('【2. サブスクリプションのメタデータ】');
  const subscriptions = await fetchStripe('/subscriptions?limit=100&status=all');
  let subsWithMetadata = 0;
  let subsWithDiscordId = 0;
  let subsWithLmessageId = 0;

  for (const sub of subscriptions.data as StripeSubscription[]) {
    const metadataKeys = Object.keys(sub.metadata || {});
    if (metadataKeys.length > 0) {
      subsWithMetadata++;
      console.log(`  サブスク ${sub.id} (${sub.status}): ${JSON.stringify(sub.metadata)}`);
      if (sub.metadata.discord_id) subsWithDiscordId++;
      if (sub.metadata.lmessage_product_id) subsWithLmessageId++;
    }
  }
  console.log(`  合計: ${subscriptions.data.length}件中、メタデータあり: ${subsWithMetadata}件`);
  console.log(`  - discord_id あり: ${subsWithDiscordId}件`);
  console.log(`  - lmessage_product_id あり: ${subsWithLmessageId}件`);
  console.log('');

  // 3. 最近の決済（Charges）のメタデータを確認
  console.log('【3. 決済（Charges）のメタデータ】');
  const charges = await fetchStripe('/charges?limit=100');
  let chargesWithMetadata = 0;

  for (const charge of charges.data as StripeCharge[]) {
    const metadataKeys = Object.keys(charge.metadata || {});
    if (metadataKeys.length > 0) {
      chargesWithMetadata++;
      const date = new Date(charge.created * 1000).toISOString().split('T')[0];
      console.log(`  決済 ${charge.id} (${date}, ¥${charge.amount}): ${JSON.stringify(charge.metadata)}`);
    }
  }
  console.log(`  合計: ${charges.data.length}件中、メタデータあり: ${chargesWithMetadata}件`);
  console.log('');

  // 4. 商品のメタデータを確認
  console.log('【4. 商品のメタデータ】');
  const products = await fetchStripe('/products?limit=100');
  let productsWithMetadata = 0;

  for (const product of products.data as StripeProduct[]) {
    const metadataKeys = Object.keys(product.metadata || {});
    console.log(`  商品 ${product.id} (${product.name}): ${metadataKeys.length > 0 ? JSON.stringify(product.metadata) : 'メタデータなし'}`);
    if (metadataKeys.length > 0) productsWithMetadata++;
  }
  console.log(`  合計: ${products.data.length}件中、メタデータあり: ${productsWithMetadata}件`);
  console.log('');

  // 5. PaymentIntentsのメタデータを確認
  console.log('【5. PaymentIntentsのメタデータ】');
  const paymentIntents = await fetchStripe('/payment_intents?limit=50');
  let pisWithMetadata = 0;

  for (const pi of paymentIntents.data) {
    const metadataKeys = Object.keys(pi.metadata || {});
    if (metadataKeys.length > 0) {
      pisWithMetadata++;
      const date = new Date(pi.created * 1000).toISOString().split('T')[0];
      console.log(`  PI ${pi.id} (${date}, ¥${pi.amount}): ${JSON.stringify(pi.metadata)}`);
    }
  }
  console.log(`  合計: ${paymentIntents.data.length}件中、メタデータあり: ${pisWithMetadata}件`);
  console.log('');

  // サマリー
  console.log('=== サマリー ===');
  console.log(`顧客: ${customers.data.length}件中 ${customersWithMetadata}件にメタデータあり`);
  console.log(`サブスクリプション: ${subscriptions.data.length}件中 ${subsWithMetadata}件にメタデータあり`);
  console.log(`決済: ${charges.data.length}件中 ${chargesWithMetadata}件にメタデータあり`);
  console.log(`商品: ${products.data.length}件中 ${productsWithMetadata}件にメタデータあり`);
  console.log(`PaymentIntents: ${paymentIntents.data.length}件中 ${pisWithMetadata}件にメタデータあり`);

  if (customersWithDiscordId === 0 && subsWithDiscordId === 0) {
    console.log('\n⚠️ 警告: discord_id が保存されている決済データはありません');
  }
  if (customersWithLmessageId === 0 && subsWithLmessageId === 0) {
    console.log('⚠️ 警告: lmessage_user_id / lmessage_product_id が保存されている決済データはありません');
  }
}

main().catch(console.error);
