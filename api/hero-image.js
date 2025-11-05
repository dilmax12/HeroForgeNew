export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const prompt = (req.query?.prompt || '').toString();
  if (!prompt) {
    return res.status(400).json({ error: 'Campo "prompt" é obrigatório' });
  }

  try {
    const resp = await fetch(`https://lexica.art/api/v1/search?q=${encodeURIComponent(prompt)}`);
    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).json({ error: text || 'Falha ao buscar imagem' });
    }
    const data = await resp.json();
    const first = Array.isArray(data?.images) ? data.images[0] : null;
    const src = first?.src || '';
    if (!src) {
      return res.status(404).json({ error: 'Nenhuma imagem encontrada' });
    }
    return res.status(200).json({ image: src, prompt: first?.prompt });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Falha ao buscar imagem' });
  }
}
