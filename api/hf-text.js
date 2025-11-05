// Rota Serverless genérica para Vercel: /api/hf-text
// Encaminha prompts livres para o Hugging Face Inference Router

const HF_TOKEN = process.env.HF_TOKEN;
const MODEL_ID = process.env.HF_TEXT_MODEL || 'HuggingFaceH4/zephyr-7b-beta';
// Use OpenAI-compatible chat completions endpoint; model must include a provider suffix
const HF_API = `https://router.huggingface.co/v1/chat/completions`;

function parseHFResponse(data) {
  // OpenAI-compatible response: choices[0].message.content
  if (data && Array.isArray(data.choices) && data.choices[0]?.message?.content) {
    return data.choices[0].message.content;
  }
  // Fallbacks for legacy formats
  if (Array.isArray(data)) {
    const first = data[0];
    if (first && typeof first.generated_text === 'string') return first.generated_text;
    if (first && typeof first.text === 'string') return first.text;
  }
  if (data && typeof data.generated_text === 'string') return data.generated_text;
  if (data && data.outputs && Array.isArray(data.outputs)) {
    const first = data.outputs[0];
    if (first && typeof first.text === 'string') return first.text;
    if (typeof data.text === 'string') return data.text;
  }
  return '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  if (!HF_TOKEN) {
    return res.status(500).json({ error: 'HF_TOKEN não configurado no servidor' });
  }

  try {
    const { prompt = '', systemMessage = '', maxTokens = 512, temperature = 0.7 } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Campo "prompt" é obrigatório' });
    }

    const messages = [];
    if (systemMessage) {
      messages.push({ role: 'system', content: systemMessage });
    }
    messages.push({ role: 'user', content: prompt });

    // Ensure model has provider suffix, default to :auto
    const modelWithProvider = MODEL_ID.includes(':') ? MODEL_ID : `${MODEL_ID}:auto`;

    const hfResponse = await fetch(HF_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelWithProvider,
        messages,
        max_tokens: maxTokens,
        temperature
      })
    });

    const raw = await hfResponse.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = { generated_text: raw }; }

    if (!hfResponse.ok) {
      const message = data?.error || data?.message || 'Falha na geração';
      return res.status(hfResponse.status).json({ error: message });
    }

    const output = parseHFResponse(data) || '';
    return res.json({ text: output });
  } catch (error) {
    console.error('HF router error:', error);
    return res.status(500).json({ error: 'Erro ao conectar com a IA' });
  }
}
