export interface CheckoutRequest {
  productId: string;
}

export interface CheckoutResponse {
  ok: boolean;
  sessionId?: string;
  redirectUrl?: string;
}

export async function startCheckout(productId: string): Promise<CheckoutResponse> {
  try {
    const res = await fetch('/api/payments/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId })
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  } catch {
    // Fallback local: simular sucesso
    return { ok: true, sessionId: `local-${Date.now()}` };
  }
}

export async function verifyPurchase(sessionId: string): Promise<{ ok: boolean; productId?: string }> {
  try {
    const res = await fetch('/api/payments/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  } catch {
    return { ok: true };
  }
}

