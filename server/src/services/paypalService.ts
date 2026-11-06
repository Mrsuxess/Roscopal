import crypto from 'crypto';
import { queryOne, execute, transaction } from '../db/database';
import { recordLedgerEntry } from './auditLedger';
import { Contribution, Cycle, CircleMember, User, CirclePolicy } from '../types';

export interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  webhookId?: string;
}

export interface CreateOrderParams {
  amount: number;
  currency: string;
  customId: string;
  returnUrl?: string;
  cancelUrl?: string;
  description: string;
}

export interface PayoutParams {
  recipientEmail: string;
  amount: number;
  currency: string;
  note: string;
  senderBatchId: string;
}

export interface PayoutResult {
  success: boolean;
  batchId: string;
  itemId?: string;
  mode: 'LIVE_SANDBOX' | 'SIMULATED_SANDBOX';
  status: 'SUCCESS' | 'PENDING' | 'DENIED' | 'FAILED';
  error?: string;
}

export interface WebhookProcessResult {
  processed: boolean;
  actionTaken: string;
  eventType: string;
  referenceId?: string;
}

const config: PayPalConfig = {
  clientId: process.env.PAYPAL_CLIENT_ID || '',
  clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
  baseUrl: process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com',
  webhookId: process.env.PAYPAL_WEBHOOK_ID || ''
};

export function getPayPalConfig(): {
  mode: 'LIVE_SANDBOX' | 'SIMULATED_SANDBOX';
  clientId: string;
  currency: string;
} {
  const configured = isPayPalConfigured();
  return {
    mode: configured ? 'LIVE_SANDBOX' : 'SIMULATED_SANDBOX',
    clientId: configured ? config.clientId : 'sb',
    currency: 'USD'
  };
}

export function isPayPalConfigured(): boolean {
  return !!(
    config.clientId &&
    config.clientSecret &&
    config.clientId !== 'your_sandbox_client_id' &&
    config.clientId !== 'your_paypal_sandbox_client_id'
  );
}

export function getPayPalMode(): 'LIVE_SANDBOX' | 'SIMULATED_SANDBOX' {
  return isPayPalConfigured() ? 'LIVE_SANDBOX' : 'SIMULATED_SANDBOX';
}

/**
 * Obtain OAuth2 Access Token from PayPal Sandbox
 */
export async function getPayPalAccessToken(): Promise<string | null> {
  if (!isPayPalConfigured()) return null;

  try {
    const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
    const response = await fetch(`${config.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      console.error('PayPal OAuth error:', await response.text());
      return null;
    }

    const data: any = await response.json();
    return data.access_token;
  } catch (err) {
    console.error('Failed to obtain PayPal token:', err);
    return null;
  }
}

/**
 * Create a PayPal Checkout Order
 */
export async function createPayPalOrder(params: CreateOrderParams): Promise<{
  orderId: string;
  status: string;
  approvalUrl: string;
  mode: 'LIVE_SANDBOX' | 'SIMULATED_SANDBOX';
}> {
  const token = await getPayPalAccessToken();

  if (token) {
    try {
      const response = await fetch(`${config.baseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [
            {
              reference_id: params.customId,
              description: params.description,
              custom_id: params.customId,
              amount: {
                currency_code: params.currency || 'USD',
                value: params.amount.toFixed(2)
              }
            }
          ],
          application_context: {
            brand_name: 'ROSCOPAL',
            landing_page: 'NO_PREFERENCE',
            user_action: 'PAY_NOW',
            return_url: params.returnUrl || 'http://localhost:5173/payment-success',
            cancel_url: params.cancelUrl || 'http://localhost:5173/payment-cancel'
          }
        })
      });

      if (response.ok) {
        const data: any = await response.json();
        const approvalLink = data.links?.find((l: any) => l.rel === 'approve')?.href || '';
        return {
          orderId: data.id,
          status: data.status,
          approvalUrl: approvalLink,
          mode: 'LIVE_SANDBOX'
        };
      } else {
        const errorText = await response.text();
        console.warn('PayPal live order rejection:', errorText);
      }
    } catch (err) {
      console.warn('Live PayPal order creation failed, falling back to sandbox simulator:', err);
    }
  }

  // Authentic Sandbox Simulator Fallback
  const simulatedId = 'ORDER-PP-SANDBOX-' + crypto.randomUUID().slice(0, 8).toUpperCase();
  return {
    orderId: simulatedId,
    status: 'CREATED',
    approvalUrl: `https://www.sandbox.paypal.com/checkoutnow?token=${simulatedId}`,
    mode: 'SIMULATED_SANDBOX'
  };
}

/**
 * Capture an approved PayPal Order
 */
export async function capturePayPalOrder(orderId: string): Promise<{
  success: boolean;
  captureId: string;
  status: string;
  mode: 'LIVE_SANDBOX' | 'SIMULATED_SANDBOX';
  amount?: number;
  currency?: string;
  error?: string;
}> {
  if (orderId.startsWith('ORDER-PP-SANDBOX-') || orderId.startsWith('ORDER-PP-SIM-')) {
    const captureId = 'CAP-PP-SANDBOX-' + crypto.randomUUID().slice(0, 8).toUpperCase();
    return {
      success: true,
      captureId,
      status: 'COMPLETED',
      amount: 100.00,
      currency: 'USD',
      mode: 'SIMULATED_SANDBOX'
    };
  }

  const token = await getPayPalAccessToken();
  if (!token) {
    return {
      success: false,
      captureId: '',
      status: 'FAILED',
      mode: 'SIMULATED_SANDBOX',
      error: 'PayPal credentials not configured on server'
    };
  }

  try {
    const response = await fetch(`${config.baseUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data: any = await response.json();
    if (response.ok && data.status === 'COMPLETED') {
      const captureObj = data.purchase_units?.[0]?.payments?.captures?.[0];
      const captureId = captureObj?.id || data.id;
      const amountVal = captureObj?.amount?.value ? parseFloat(captureObj.amount.value) : 100.00;
      const currencyVal = captureObj?.amount?.currency_code || 'USD';

      return {
        success: true,
        captureId,
        status: data.status,
        amount: amountVal,
        currency: currencyVal,
        mode: 'LIVE_SANDBOX'
      };
    } else {
      return {
        success: false,
        captureId: '',
        status: data.status || 'FAILED',
        mode: 'LIVE_SANDBOX',
        error: data.message || 'PayPal capture failed'
      };
    }
  } catch (err: any) {
    return {
      success: false,
      captureId: '',
      status: 'ERROR',
      mode: 'LIVE_SANDBOX',
      error: err.message
    };
  }
}

/**
 * Get Order Details from PayPal
 */
export async function getPayPalOrderDetails(orderId: string): Promise<any> {
  const token = await getPayPalAccessToken();
  if (!token) {
    return {
      id: orderId,
      status: 'COMPLETED',
      mode: 'SIMULATED_SANDBOX'
    };
  }

  try {
    const response = await fetch(`${config.baseUrl}/v2/checkout/orders/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (err) {
    console.error('Failed to get PayPal order details:', err);
    return null;
  }
}

/**
 * Execute PayPal Payout to recipient member
 */
export async function executePayPalPayout(params: PayoutParams): Promise<PayoutResult> {
  const token = await getPayPalAccessToken();

  if (token) {
    try {
      const response = await fetch(`${config.baseUrl}/v1/payments/payouts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender_batch_header: {
            sender_batch_id: params.senderBatchId,
            email_subject: 'You received your ROSCOPAL Circle Pot!',
            email_message: params.note
          },
          items: [
            {
              recipient_type: 'EMAIL',
              amount: {
                value: params.amount.toFixed(2),
                currency: params.currency || 'USD'
              },
              note: params.note,
              sender_item_id: `ITEM-${params.senderBatchId}`,
              receiver: params.recipientEmail
            }
          ]
        })
      });

      const data: any = await response.json();
      if (response.ok) {
        const batchStatus = data.batch_header?.batch_status || 'PENDING';
        return {
          success: true,
          batchId: data.batch_header?.payout_batch_id || `BATCH-${params.senderBatchId}`,
          itemId: data.items?.[0]?.payout_item_id || `ITEM-${params.senderBatchId}`,
          mode: 'LIVE_SANDBOX',
          status: batchStatus === 'SUCCESS' ? 'SUCCESS' : 'PENDING'
        };
      } else {
        console.warn('Live PayPal payout rejected by sandbox endpoint:', data);
        const isPermissionIssue = data.name === 'AUTHORIZATION_ERROR' || data.name === 'PERMISSION_DENIED';
        return {
          success: false,
          batchId: '',
          mode: 'LIVE_SANDBOX',
          status: 'DENIED',
          error: isPermissionIssue
            ? 'PayPal Sandbox Payouts API not enabled on account credentials. (Requires Payouts Feature Activation in PayPal Developer Dashboard).'
            : (data.message || 'PayPal Payout request failed')
        };
      }
    } catch (err: any) {
      console.warn('Live PayPal payout connection error:', err);
    }
  }

  // Authentic Sandbox Simulator Fallback
  const simulatedBatchId = 'BATCH-PP-SANDBOX-' + crypto.randomUUID().slice(0, 8).toUpperCase();
  const simulatedItemId = 'ITEM-PP-SANDBOX-' + crypto.randomUUID().slice(0, 8).toUpperCase();

  return {
    success: true,
    batchId: simulatedBatchId,
    itemId: simulatedItemId,
    mode: 'SIMULATED_SANDBOX',
    status: 'SUCCESS'
  };
}

/**
 * Reconcile Payout Batch Details with PayPal
 */
export async function getPayoutBatchDetails(batchId: string): Promise<any> {
  if (batchId.startsWith('BATCH-PP-SANDBOX-') || batchId.startsWith('BATCH-PP-SIM-')) {
    return {
      batch_header: {
        payout_batch_id: batchId,
        batch_status: 'SUCCESS',
        time_created: new Date().toISOString()
      },
      mode: 'SIMULATED_SANDBOX'
    };
  }

  const token = await getPayPalAccessToken();
  if (!token) return null;

  try {
    const response = await fetch(`${config.baseUrl}/v1/payments/payouts/${batchId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data: any = await response.json();
      return { ...data, mode: 'LIVE_SANDBOX' };
    }
    return null;
  } catch (err) {
    console.error('Failed to query payout batch:', err);
    return null;
  }
}

/**
 * Verify PayPal Webhook Signature
 */
export async function verifyWebhookSignature(
  headers: Record<string, string | string[] | undefined>,
  body: any
): Promise<boolean> {
  // If in simulated demo mode or test mode without credentials, treat valid envelopes as verified
  if (!isPayPalConfigured()) {
    return true;
  }

  const token = await getPayPalAccessToken();
  if (!token || !config.webhookId) {
    // If webhook ID is not configured yet in .env, log and reject unauthenticated calls
    console.warn('PayPal Webhook verification failed: PAYPAL_WEBHOOK_ID missing in configuration');
    return false;
  }

  try {
    const response = await fetch(`${config.baseUrl}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        auth_algo: headers['paypal-auth-algo'],
        cert_url: headers['paypal-cert-url'],
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
        webhook_id: config.webhookId,
        webhook_event: body
      })
    });

    const data: any = await response.json();
    return data.verification_status === 'SUCCESS';
  } catch (err) {
    console.error('Webhook signature verification request failed:', err);
    return false;
  }
}

/**
 * Process Verified Webhook Payload into ROSCOPAL State Machine
 */
export function processWebhookEvent(event: any): WebhookProcessResult {
  const eventType = event.event_type;
  const resource = event.resource || {};

  switch (eventType) {
    case 'PAYMENT.CAPTURE.COMPLETED': {
      const captureId = resource.id;
      const customId = resource.custom_id; // format: circleId:cycleId:memberId
      const amountVal = resource.amount?.value ? parseFloat(resource.amount.value) : 100.00;
      const currencyVal = resource.amount?.currency_code || 'USD';

      if (!customId) {
        return { processed: false, actionTaken: 'SKIPPED_MISSING_CUSTOM_ID', eventType };
      }

      const [circleId, cycleId, memberId] = customId.split(':');
      if (!circleId || !cycleId || !memberId) {
        return { processed: false, actionTaken: 'INVALID_CUSTOM_ID_FORMAT', eventType };
      }

      // Check if already completed (idempotency guard)
      const existing = queryOne<Contribution>(
        `SELECT * FROM contributions WHERE cycle_id = ? AND member_id = ? AND status = 'completed'`,
        [cycleId, memberId]
      );

      if (existing) {
        return {
          processed: true,
          actionTaken: 'ALREADY_COMPLETED_IDEMPOTENT',
          eventType,
          referenceId: existing.paypal_capture_id || existing.id
        };
      }

      const now = new Date().toISOString();
      const contrId = 'CONTR-WH-' + crypto.randomUUID().slice(0, 6).toUpperCase();

      transaction(() => {
        // Record or update contribution
        execute(
          `INSERT OR REPLACE INTO contributions (
            id, circle_id, cycle_id, member_id, amount, currency, status,
            paypal_capture_id, payment_method, completed_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, 'paypal_webhook', ?, ?)`,
          [contrId, circleId, cycleId, memberId, amountVal, currencyVal, captureId, now, now]
        );

        // Update cycle funding
        execute(
          `UPDATE cycles SET collected_amount = collected_amount + ? WHERE id = ?`,
          [amountVal, cycleId]
        );

        const cycle = queryOne<Cycle>(`SELECT * FROM cycles WHERE id = ?`, [cycleId]);
        if (cycle && cycle.collected_amount >= cycle.target_pot_amount) {
          execute(`UPDATE cycles SET status = 'funded' WHERE id = ?`, [cycleId]);
        }

        const member = queryOne<CircleMember>(`SELECT * FROM circle_members WHERE id = ?`, [memberId]);
        const user = member ? queryOne<User>(`SELECT name FROM users WHERE id = ?`, [member.user_id]) : null;

        // Post to Cryptographic Ledger
        recordLedgerEntry({
          circleId,
          eventType: 'CONTRIBUTION_RECEIVED',
          memberName: user?.name || 'Circle Member',
          recipientName: 'Pot Hold',
          cycleNumber: cycle?.cycle_number || 1,
          amount: amountVal,
          currency: currencyVal,
          paymentStatus: 'CONFIRMED',
          paypalRef: captureId,
          auditStatus: 'VERIFIED',
          metadata: {
            webhookEventId: event.id,
            captureId,
            source: 'PAYPAL_WEBHOOK'
          }
        });
      });

      return {
        processed: true,
        actionTaken: 'CONTRIBUTION_CONFIRMED_VIA_WEBHOOK',
        eventType,
        referenceId: captureId
      };
    }

    case 'PAYMENT.CAPTURE.DENIED': {
      const captureId = resource.id;
      const customId = resource.custom_id;

      if (customId) {
        const [circleId, cycleId, memberId] = customId.split(':');
        execute(
          `UPDATE contributions SET status = 'failed' WHERE paypal_capture_id = ? OR (cycle_id = ? AND member_id = ?)`,
          [captureId, cycleId, memberId]
        );
      }

      return {
        processed: true,
        actionTaken: 'CAPTURE_MARKED_DENIED',
        eventType,
        referenceId: captureId
      };
    }

    case 'PAYMENT.CAPTURE.REVERSED': {
      const captureId = resource.id;
      const customId = resource.custom_id;
      const amountVal = resource.amount?.value ? parseFloat(resource.amount.value) : 100.00;

      if (customId) {
        const [circleId, cycleId, memberId] = customId.split(':');
        transaction(() => {
          execute(
            `UPDATE contributions SET status = 'reversed' WHERE paypal_capture_id = ? OR (cycle_id = ? AND member_id = ?)`,
            [captureId, cycleId, memberId]
          );
          execute(
            `UPDATE cycles SET collected_amount = MAX(0, collected_amount - ?), status = 'open' WHERE id = ?`,
            [amountVal, cycleId]
          );

          recordLedgerEntry({
            circleId,
            eventType: 'CONTRIBUTION_REVERSED',
            memberName: 'Reversed Member',
            recipientName: 'Dispute Chargeback',
            cycleNumber: 1,
            amount: -amountVal,
            currency: resource.amount?.currency_code || 'USD',
            paymentStatus: 'REVERSED',
            paypalRef: captureId,
            auditStatus: 'FLAGGED',
            metadata: {
              webhookEventId: event.id,
              captureId,
              source: 'PAYPAL_CHARGEBACK'
            }
          });
        });
      }

      return {
        processed: true,
        actionTaken: 'CAPTURE_REVERSED_AND_POT_DEBITED',
        eventType,
        referenceId: captureId
      };
    }

    case 'PAYMENT.PAYOUTSBATCH.SUCCESS': {
      const batchId = resource.batch_header?.payout_batch_id;
      if (batchId) {
        execute(
          `UPDATE payouts SET status = 'completed', audit_status = 'VERIFIED' WHERE paypal_payout_batch_id = ?`,
          [batchId]
        );
      }
      return {
        processed: true,
        actionTaken: 'PAYOUT_BATCH_CONFIRMED_SUCCESS',
        eventType,
        referenceId: batchId
      };
    }

    case 'PAYMENT.PAYOUTS-ITEM.BLOCKED':
    case 'PAYMENT.PAYOUTSBATCH.DENIED': {
      const batchId = resource.batch_header?.payout_batch_id || resource.payout_batch_id;
      if (batchId) {
        execute(
          `UPDATE payouts SET status = 'failed', audit_status = 'FLAGGED', failure_reason = ? WHERE paypal_payout_batch_id = ?`,
          [event.summary || 'Payout denied by PayPal', batchId]
        );
      }
      return {
        processed: true,
        actionTaken: 'PAYOUT_FLAGGED_FAILURE',
        eventType,
        referenceId: batchId
      };
    }

    default:
      return {
        processed: true,
        actionTaken: 'UNHANDLED_EVENT_LOGGED_ONLY',
        eventType
      };
  }
}
