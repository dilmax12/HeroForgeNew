import { InferenceClient } from '@huggingface/inference';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { race = 'humano', klass = 'guerreiro', attrs = {} } = req.body || {};

    const hfToken = process.env.HF_TOKEN;
    const hfTextModel = process.env.HF_TEXT_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3';
    const hfImageModel = process.env.HF_IMAGE_MODEL || 'stabilityai/stable-diffusion-2-1';

    let nameLine = 'Herói Desconhecido';
    let historia = 'Um herói emerge das sombras, buscando seu destino.';
    let frase = 'Por glória e aventura!';
    let image = null;

    // 1) Texto via HF (se houver token)
    if (hfToken) {
      try {
        const hf = new InferenceClient(hfToken);
        const promptText = `Você é um narrador épico. Gere:\n- Nome (1-3 palavras) + epíteto,\n- História de origem 4-6 linhas,\n- Frase de impacto 1 linha.\nContexto: raça: ${race}, classe: ${klass}, atributos: ${JSON.stringify(attrs)}.\nSeja conciso e épico. Saída em texto puro.`;

        const chat = await hf.chatCompletion({
          model: hfTextModel,
          messages: [
            { role: 'system', content: 'Assistente de fantasia' },
            { role: 'user', content: promptText }
          ],
          max_tokens: 180,
          temperature: 0.7
        });

        const content = chat?.choices?.[0]?.message?.content || chat?.generated_text || '';
        const lines = content.split('\n').filter(Boolean);
        nameLine = lines[0] || nameLine;
        historia = lines.slice(1, 4).join('\n') || historia;
        frase = lines.slice(4).join(' ').trim() || frase;
      } catch (err) {
        // mantém valores padrão
        console.warn('HF text generation fallback:', err?.message || err);
      }
    }

    // 2) Imagem via Lexica
    const q = encodeURIComponent(`${nameLine}, ${race} ${klass}, fantasy portrait, detailed`);
    try {
      const resp = await fetch(`https://lexica.art/api/v1/search?q=${q}`);
      const data = await resp.json();
      image = data?.images?.[0]?.src || null;
    } catch (err) {
      console.warn('Lexica fetch failed:', err?.message || err);
      image = null;
    }

    // 3) Fallback imagem via HF textToImage
    if (!image && hfToken) {
      try {
        const hf = new InferenceClient(hfToken);
        const img = await hf.textToImage({
          inputs: `${nameLine}, ${race} ${klass}, epic fantasy portrait, detailed, studio lighting`,
          model: hfImageModel
        });
        image = img ? `data:image/png;base64,${img.toString('base64')}` : null;
      } catch (err) {
        console.warn('HF image generation fallback:', err?.message || err);
      }
    }

    // 4) Placeholder final
    if (!image) {
      image =
        'data:image/svg+xml;utf8,' +
        encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="100%" height="100%" fill="#1f2937"/><text x="50%" y="50%" fill="#f59e0b" font-size="24" text-anchor="middle" dominant-baseline="middle">${nameLine}</text></svg>`
        );
    }

    return res.json({ name: nameLine, story: historia, phrase: frase, image });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro IA' });
  }
}

