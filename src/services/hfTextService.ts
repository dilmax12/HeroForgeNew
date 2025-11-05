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
    let msg = `Falha ao gerar texto (${resp.status})`;
    try {
      const err = JSON.parse(raw);
      msg = err.error || err.message || msg;
    } catch {
      if (raw) msg = `${msg}: ${raw.slice(0, 200)}`;
    }
    throw new Error(msg);
  }

  const data = await resp.json();
  return data.resultado as string;
}
