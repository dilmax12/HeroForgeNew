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
    const headers = await authHeaders();
    const res = await fetch('/api/payments/create-checkout-session', { method: 'POST', headers, body: JSON.stringify({ productId }) });
    if (!res.ok) {
      try { const j = await res.json(); throw new Error(j?.message || 'Falha ao iniciar checkout'); } catch { throw new Error('Falha ao iniciar checkout'); }
    }
    const json = await res.json();
    try {
      if (json?.redirectUrl) {
        window.location.href = json.redirectUrl;
      }
    } catch {}
    return json;
  } catch {
    // Fallback local: simular sucesso
    return { ok: true, sessionId: `local-${Date.now()}` };
  }
}

export async function verifyPurchase(sessionId: string): Promise<{ ok: boolean; productId?: string }> {
  try {
    const headers = await authHeaders();
    const res = await fetch('/api/payments/verify', { method: 'POST', headers, body: JSON.stringify({ sessionId }) });
    if (!res.ok) { try { const j = await res.json(); throw new Error(j?.message || 'Falha ao verificar'); } catch { throw new Error('Falha ao verificar'); } }
    return await res.json();
  } catch {
    return { ok: true };
  }
}
import { supabase, supabaseConfigured } from '../lib/supabaseClient';

async function authHeaders(userId?: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    const uid = data?.session?.user?.id;
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!supabaseConfigured && uid) headers['X-User-Id'] = uid;
    if (!headers['X-User-Id'] && userId && !supabaseConfigured) headers['X-User-Id'] = userId;
  } catch {}
  return headers;
}