export async function triggerBackup(): Promise<{ ok: boolean; file?: string; size?: number; error?: string }> {
  try {
    const res = await fetch('/api/backup', { method: 'GET' });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data?.error || 'Falha ao iniciar backup' };
    return { ok: true, file: data.file, size: data.size };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
}