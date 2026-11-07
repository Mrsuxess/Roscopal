import dotenv from 'dotenv';
dotenv.config();

import { getPayPalAccessToken } from '../services/paypalService';

async function inspect() {
  const token = await getPayPalAccessToken();
  if (!token) {
    console.error('Failed to get PayPal OAuth token');
    return;
  }
  console.log('OAuth Token obtained successfully.');

  const baseUrl = process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';

  // 1. Create a test order and inspect full PayPal response
  console.log('\n--- 1. Creating Order on PayPal Sandbox ---');
  const createRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: 'TEST-INSPECT-01',
          description: 'ROSCOPAL Merchant Inspection Test',
          amount: {
            currency_code: 'USD',
            value: '100.00'
          }
        }
      ],
      application_context: {
        brand_name: 'ROSCOPAL',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: 'http://localhost:5173/payment-success',
        cancel_url: 'http://localhost:5173/payment-cancel'
      }
    })
  });

  const orderData: any = await createRes.json();
  console.log('Create Order HTTP Status:', createRes.status);
  console.log('Create Order Response:', JSON.stringify(orderData, null, 2));

  if (orderData.id) {
    // 2. Fetch the order details
    console.log(`\n--- 2. Fetching Order Details for ${orderData.id} ---`);
    const getRes = await fetch(`${baseUrl}/v2/checkout/orders/${orderData.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const fetchedData: any = await getRes.json();
    console.log('Get Order HTTP Status:', getRes.status);
    console.log('Get Order Response:', JSON.stringify(fetchedData, null, 2));
    
    // Check payee details
    const payee = fetchedData.purchase_units?.[0]?.payee;
    console.log('\nPayee Details in Order:');
    console.log('Payee Merchant ID:', payee?.merchant_id);
    console.log('Payee Email:', payee?.email_address);
  }
}

inspect().catch(console.error);
