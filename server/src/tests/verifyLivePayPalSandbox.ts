import dotenv from 'dotenv';
dotenv.config();

import { 
  isPayPalConfigured, 
  getPayPalMode, 
  getPayPalAccessToken, 
  createPayPalOrder 
} from '../services/paypalService';
import { queryOne } from '../db/database';
import { initDatabase } from '../db/database';

async function main() {
  console.log('--- PayPal Sandbox Verification ---');

  // Step 2: Check credential detection (without printing secrets)
  const configured = isPayPalConfigured();
  const clientIdPresent = !!process.env.PAYPAL_CLIENT_ID;
  const clientSecretPresent = !!process.env.PAYPAL_CLIENT_SECRET;
  const webhookIdConfigured = !!process.env.PAYPAL_WEBHOOK_ID;

  console.log('Credentials Detected:', configured);
  console.log('Client ID Loaded:', clientIdPresent, '(length:', process.env.PAYPAL_CLIENT_ID?.length || 0, ')');
  console.log('Client Secret Loaded:', clientSecretPresent, '(length:', process.env.PAYPAL_CLIENT_SECRET?.length || 0, ')');
  console.log('Webhook ID Configured:', webhookIdConfigured);

  // Step 5: Verify Mode
  const mode = getPayPalMode();
  console.log('Operational Mode:', mode);

  if (!configured) {
    console.error('ERROR: PayPal credentials were not properly loaded.');
    process.exit(1);
  }

  // Step 3 & 4: Genuine OAuth access-token request
  console.log('\nRequesting genuine OAuth token from https://api-m.sandbox.paypal.com/v1/oauth2/token...');
  const token = await getPayPalAccessToken();

  if (token) {
    console.log('OAuth Token Result: SUCCESS');
    console.log('Token Received: YES (type: Bearer, length:', token.length, 'characters)');
  } else {
    console.error('OAuth Token Result: FAILED');
    process.exit(1);
  }

  // Step 6: Test genuine PayPal Sandbox Order creation
  console.log('\nTesting genuine PayPal Sandbox Order Creation via /v2/checkout/orders...');
  await initDatabase();

  try {
    const orderResult = await createPayPalOrder({
      amount: 100.00,
      currency: 'USD',
      customId: 'circle-diaspora-8:cycle-1:mem-test',
      description: 'ROSCOPAL Genuine Sandbox Verification Order'
    });

    console.log('Order Creation Result: SUCCESS');
    console.log('Order ID:', orderResult.orderId);
    console.log('Status:', orderResult.status);
    console.log('Approval URL Hostname:', new URL(orderResult.approvalUrl).hostname);
    console.log('Mode Tag:', orderResult.mode);
  } catch (err: any) {
    console.error('Order Creation Result: FAILED');
    console.error('Error Details:', err.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal execution error:', err.message);
  process.exit(1);
});
