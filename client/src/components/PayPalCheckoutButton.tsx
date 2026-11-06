import React, { useEffect, useRef, useState } from 'react';
import { CreditCard, CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { fetchPayPalConfig, createCheckoutOrder, captureCheckoutOrder } from '../api/client';

interface PayPalCheckoutButtonProps {
  circleId: string;
  cycleId: string;
  memberId: string;
  amount: number;
  onSuccess: () => void;
}

declare global {
  interface Window {
    paypal?: any;
  }
}

export const PayPalCheckoutButton: React.FC<PayPalCheckoutButtonProps> = ({
  circleId,
  cycleId,
  memberId,
  amount,
  onSuccess
}) => {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [paypalMode, setPaypalMode] = useState<'LIVE_SANDBOX' | 'SIMULATED_SANDBOX'>('SIMULATED_SANDBOX');
  const [sdkReady, setSdkReady] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const currentOrderIdRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function initPayPal() {
      try {
        const config = await fetchPayPalConfig();
        if (!isMounted) return;
        setPaypalMode(config.mode);

        const clientId = config.clientId || 'sb';

        // Check if PayPal SDK already loaded
        if (window.paypal && window.paypal.Buttons) {
          setSdkReady(true);
          setLoading(false);
          return;
        }

        // Dynamically load PayPal SDK script
        const scriptId = 'paypal-js-sdk';
        if (!document.getElementById(scriptId)) {
          const script = document.createElement('script');
          script.id = scriptId;
          script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&components=buttons`;
          script.async = true;
          script.onload = () => {
            if (isMounted) {
              setSdkReady(true);
              setLoading(false);
            }
          };
          script.onerror = () => {
            if (isMounted) {
              console.warn('Failed to load PayPal JS SDK script. Sandbox simulator fallback active.');
              setSdkReady(false);
              setLoading(false);
            }
          };
          document.body.appendChild(script);
        } else {
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn('PayPal init notice:', err);
          setLoading(false);
        }
      }
    }

    initPayPal();

    return () => {
      isMounted = false;
    };
  }, []);

  // Render PayPal Smart Payment Buttons if SDK is ready
  useEffect(() => {
    if (!sdkReady || !containerRef.current || !window.paypal?.Buttons) return;

    // Clear previous renders
    containerRef.current.innerHTML = '';

    try {
      window.paypal
        .Buttons({
          style: {
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'pay',
            height: 42
          },
          createOrder: async () => {
            setError(null);
            setStatusMessage('Creating PayPal Order on server...');
            setProcessing(true);
            try {
              const res = await createCheckoutOrder(circleId, cycleId, memberId, amount);
              if (res.error) throw new Error(res.error);
              currentOrderIdRef.current = res.orderId;
              setStatusMessage('Awaiting PayPal Authorization...');
              return res.orderId;
            } catch (err: any) {
              setError(err.message || 'Failed to create order');
              setProcessing(false);
              throw err;
            }
          },
          onApprove: async (data: any) => {
            setStatusMessage('Capturing approved order on server...');
            try {
              const orderId = data.orderID || currentOrderIdRef.current;
              const res = await captureCheckoutOrder(orderId);
              if (!res.success) {
                throw new Error(res.error || 'Server capture failed');
              }
              setStatusMessage('Payment verified & recorded to cryptographic ledger!');
              setProcessing(false);
              onSuccess();
            } catch (err: any) {
              setError(err.message || 'Payment capture failed');
              setProcessing(false);
            }
          },
          onCancel: () => {
            setProcessing(false);
            setStatusMessage(null);
            setError('Payment was cancelled. You can retry whenever you are ready.');
          },
          onError: (err: any) => {
            setProcessing(false);
            setStatusMessage(null);
            setError(err?.message || 'PayPal gateway encountered an error.');
          }
        })
        .render(containerRef.current);
    } catch (err) {
      console.warn('Error rendering PayPal buttons:', err);
    }
  }, [sdkReady, circleId, cycleId, memberId, amount]);

  // Direct Server-Side Checkout Action (Works in all environments seamlessly)
  const handleDirectServerCheckout = async () => {
    setError(null);
    setProcessing(true);
    setStatusMessage('Initiating PayPal Checkout order...');

    try {
      // Step 1: Create Order Server-Side
      const orderRes = await createCheckoutOrder(circleId, cycleId, memberId, amount);
      if (orderRes.error) throw new Error(orderRes.error);

      setStatusMessage('Capturing & validating payment with PayPal Sandbox...');
      // Step 2: Capture Order Server-Side
      const captureRes = await captureCheckoutOrder(orderRes.orderId, orderRes.contributionId);
      if (!captureRes.success) {
        throw new Error(captureRes.error || 'Capture verification failed');
      }

      setStatusMessage('Contribution confirmed & posted to SHA-256 audit ledger!');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Mode Badge */}
      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          PayPal Sandbox Gateway ({amount} USD)
        </span>
        <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
          {paypalMode === 'LIVE_SANDBOX' ? 'Live Sandbox Connected' : 'Sandbox Simulator Active'}
        </span>
      </div>

      {/* Official PayPal Buttons Container */}
      <div ref={containerRef} className="min-h-[44px]">
        {loading && (
          <div className="flex items-center justify-center py-3 text-xs text-slate-400 gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            <span>Loading PayPal Checkout SDK...</span>
          </div>
        )}
      </div>

      {/* Fallback / Direct Sandbox Button */}
      <button
        onClick={handleDirectServerCheckout}
        disabled={processing}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0070BA] to-[#003087] hover:brightness-110 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
      >
        <CreditCard className="w-4 h-4" />
        <span>
          {processing
            ? statusMessage || 'Processing Sandbox Payment...'
            : `Pay $${amount}.00 via PayPal Sandbox`}
        </span>
      </button>

      {/* Status or Progress Feedback */}
      {statusMessage && !error && (
        <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Error Feedback */}
      {error && (
        <div className="p-2.5 rounded-xl bg-red-950/25 border border-red-500/30 text-red-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-[10px] text-red-400 hover:text-white uppercase font-bold"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};
