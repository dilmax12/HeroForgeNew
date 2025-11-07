export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const HF_TOKEN = process.env.HF_TOKEN;
  // Padrão estável por defeito; env pode sobrescrever
  const MODEL = process.env.HF_IMAGE_MODEL || 'stabilityai/sd-turbo';
  if (!HF_TOKEN) {
    return res.status(500).json({ error: 'HF_TOKEN não configurado' });
  }

  const { prompt = '' } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Campo "prompt" é obrigatório' });
  }

  try {
    // Usar Inference API direta para maior estabilidade
    const response = await fetch(`https://api-inference.huggingface.co/models/${MODEL}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ inputs: prompt })
    });

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      return res.status(200).json({ imagem: `data:image/png;base64,${base64}` });
    }

    // Fallback Lexica: sem chave, retorna URL direta
    try {
      const lexica = await fetch(`https://lexica.art/api/v1/search?q=${encodeURIComponent(prompt)}`);
      if (lexica.ok) {
        const data = await lexica.json();
        const first = Array.isArray(data?.images) ? data.images[0] : null;
        const src = first?.src || '';
        if (src) return res.status(200).json({ imagem: src });
      }
      // Fallback adicional: Unsplash random baseado em prompt (sem chave)
      const unsplashUrl = `https://source.unsplash.com/1024x1024/?${encodeURIComponent(prompt)}`;
      return res.status(200).json({ imagem: unsplashUrl });
      const errText = await response.text();
      let err;
      try { err = JSON.parse(errText); } catch { err = { error: errText }; }
      const message = err?.error || err?.message || 'Falha ao gerar imagem';
      // Fallback final: placeholder SVG
      const placeholder = generatePlaceholderImage(prompt);
      return res.status(200).json({ imagem: placeholder });
    } catch (lexErr) {
      // Fallback final: placeholder SVG em caso de erro Lexica
      const unsplashUrl = `https://source.unsplash.com/1024x1024/?${encodeURIComponent(prompt)}`;
      if (unsplashUrl) return res.status(200).json({ imagem: unsplashUrl });
      const placeholder = generatePlaceholderImage(prompt);
      return res.status(200).json({ imagem: placeholder });
    }
  } catch (error) {
    console.error(error);
    // Tentativa final: Lexica
    try {
      const lexica = await fetch(`https://lexica.art/api/v1/search?q=${encodeURIComponent(prompt)}`);
      if (lexica.ok) {
        const data = await lexica.json();
        const first = Array.isArray(data?.images) ? data.images[0] : null;
        const src = first?.src || '';
        if (src) return res.status(200).json({ imagem: src });
      }
    } catch {}
    // Fallback final: placeholder SVG
    const placeholder = generatePlaceholderImage(prompt);
    return res.status(200).json({ imagem: placeholder });
  }
}

// Helper: gera um placeholder SVG com o prompt
function generatePlaceholderImage(prompt) {
  const safeText = (prompt || '').toString().slice(0, 120).replace(/[<>]/g, '');
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1f2937"/>
      <stop offset="100%" stop-color="#111827"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <rect x="24" y="24" width="464" height="464" rx="16" fill="#0b0f1a" stroke="#d1a54a" stroke-width="3" opacity="0.8"/>
  <text x="256" y="180" font-family="serif" font-size="28" fill="#f5deb3" text-anchor="middle">Imagem não disponível</text>
  <text x="256" y="220" font-family="serif" font-size="22" fill="#d1a54a" text-anchor="middle">Placeholder</text>
  <text x="256" y="280" font-family="serif" font-size="18" fill="#cbd5e1" text-anchor="middle">${safeText}</text>
  <text x="256" y="450" font-family="serif" font-size="14" fill="#9ca3af" text-anchor="middle">Hero Forge - Fallback</text>
</svg>`;
  const base64 = Buffer.from(svg, 'utf-8').toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}
