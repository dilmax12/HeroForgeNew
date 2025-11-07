// Serverless route: /api/groq-chat
// Simplified Groq OpenAI-compatible proxy to avoid nested path issues.

const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || '';
const GROQ_API_URL = process.env.GROQ_API_URL || process.env.VITE_GROQ_API_URL || 'https://api.groq.com/openai/v1';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: { message: 'GROQ_API_KEY ausente no servidor' } });
  }

  try {
    let body = req.body;
    if (!body || (typeof body === 'object' && Object.keys(body).length === 0)) {
      try {
        const raw = await new Promise((resolve, reject) => {
          let data = '';
          req.on('data', chunk => { data += chunk; });
          req.on('end', () => resolve(data));
          req.on('error', reject);
        });
        if (raw) body = JSON.parse(raw);
      } catch {}
    }

    const { model, messages, max_tokens, temperature } = body || {};

    const url = `${GROQ_API_URL}/chat/completions`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        // Usa modelo recomendado atual para alta compatibilidade
        model: model || (process.env.VITE_AI_MODEL || 'llama-3.1-8b-instant'),
        messages: Array.isArray(messages) ? messages : [],
        max_tokens: typeof max_tokens === 'number' ? max_tokens : 1500,
        temperature: typeof temperature === 'number' ? temperature : 0.7
      })
    });

    const text = await response.text();
    if (!response.ok) {
      let err;
      try { err = JSON.parse(text); } catch {}
      return res.status(response.status).json(err || { error: { message: text || 'Falha na chamada ao Groq' } });
    }

    try {
      const json = JSON.parse(text);
      return res.status(200).json(json);
    } catch {
      return res.status(200).send(text);
    }
  } catch (error) {
    console.error('Groq proxy error:', error?.message || String(error));
    return res.status(500).json({ error: { message: error?.message || 'Erro ao chamar Groq' } });
  }
}
