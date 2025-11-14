export async function logActivity(event: Record<string, any>): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const res = await fetch('/api/logs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(event) });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data?.error || 'Falha ao registrar log' };
    return { ok: true, id: data.id };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
}