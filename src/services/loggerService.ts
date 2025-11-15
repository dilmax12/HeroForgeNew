import { supabase } from '../lib/supabaseClient';

function getDeviceId(): string {
  try {
    const k = 'hfn:deviceId';
    const existing = localStorage.getItem(k);
    if (existing) return existing;
    const rand = crypto.getRandomValues(new Uint8Array(8));
    const id = 'dev-' + Array.from(rand).map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(k, id);
    return id;
  } catch {
    return 'dev-unknown';
  }
}

export async function logActivity(event: Record<string, any>): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    let userId: string | null = null;
    try {
      const { data } = await supabase.auth.getUser();
      userId = data?.user?.id || null;
    } catch {}
    const payload = { ts: new Date().toISOString(), deviceId: getDeviceId(), userId, ...event };
    const res = await fetch('/api/logs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data?.error || 'Falha ao registrar log' };
    return { ok: true, id: data.id };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
}