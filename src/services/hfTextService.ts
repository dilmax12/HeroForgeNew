export type TextoTipo = 'missao' | 'historia' | 'frase' | 'nome';

export async function gerarTexto(tipo: TextoTipo, contexto = ''): Promise<string> {
  const resp = await fetch('/api/gerar-texto', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tipo, contexto })
  });

  if (!resp.ok) {
    // Tenta extrair mensagem detalhada mesmo quando não é JSON
    const raw = await resp.text();
    let msg: string = `Falha ao gerar texto (${resp.status})`;
    try {
      const err = JSON.parse(raw);
      const e = err?.error ?? err?.message ?? err;
      if (typeof e === 'string') {
        msg = e;
      } else if (e && typeof e === 'object') {
        // Tenta extrair mensagem comum
        msg = e.message || e.msg || e.detail || JSON.stringify(e);
      }
    } catch {
      if (raw) msg = `${msg}: ${raw.slice(0, 200)}`;
    }
    throw new Error(msg);
  }

  const data = await resp.json();
  return data.resultado as string;
}
