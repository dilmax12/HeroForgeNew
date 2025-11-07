// Rota Serverless genérica para Vercel: /api/hf-text
// Encaminha prompts livres para Hugging Face (prioriza Inference API direta)

const HF_TOKEN = process.env.HF_TOKEN;
// Padrão estável por defeito; env pode sobrescrever
const MODEL_ID = process.env.HF_TEXT_MODEL || 'mistralai/Mistral-7B-Instruct-v0.2';
// Router v1 (OpenAI-compatible) usado apenas como fallback
const HF_ROUTER_API = `https://router.huggingface.co/v1/chat/completions`;
const FALLBACK_MODELS = [
  'mistralai/Mistral-7B-Instruct-v0.2',
  'google/gemma-2-9b-it'
];

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
    
    const tryInference = async (model) => {
      const url = `https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`;
      const body = {
        inputs: systemMessage ? `${systemMessage}\n\n${prompt}` : prompt,
        parameters: {
          max_new_tokens: Math.min(typeof maxTokens === 'number' ? maxTokens : 128, 256),
          temperature: typeof temperature === 'number' ? temperature : 0.7,
          return_full_text: false
        }
      };
      const resp = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${HF_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const raw = await resp.text();
      let data; try { data = JSON.parse(raw); } catch { data = [{ generated_text: raw }]; }
      return { ok: resp.ok, status: resp.status, data, raw };
    };

    // 1) Tenta o modelo configurado na Inference API
    const first = await tryInference(MODEL_ID);
    if (first.ok) {
      const output = parseHFResponse(first.data) || '';
      return res.json({ text: output });
    }

    // 2) Tenta modelos fallback estáveis na Inference API
    for (const m of FALLBACK_MODELS) {
      const r = await tryInference(m);
      if (r.ok) {
        const output = parseHFResponse(r.data) || '';
        return res.json({ text: output });
      }
    }

    // 3) Fallback final: Router v1
    try {
      const routerResp = await fetch(HF_ROUTER_API, {
        method: 'POST',
        headers: { Authorization: `Bearer ${HF_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL_ID, messages, max_tokens: maxTokens, temperature })
      });
      const routerRaw = await routerResp.text();
      let routerData; try { routerData = JSON.parse(routerRaw); } catch { routerData = { generated_text: routerRaw }; }
      if (!routerResp.ok) {
        const errObj = routerData?.error || routerData;
        const message = typeof errObj === 'string' ? errObj : (errObj?.message || 'Falha na geração');
        return res.status(routerResp.status).json({ error: { message } });
      }
      const output2 = parseHFResponse(routerData) || '';
      return res.json({ text: output2 });
    } catch (err) {
      return res.status(500).json({ error: { message: 'Erro ao conectar com a IA' } });
    }
  } catch (error) {
    console.error('HF router error:', error);
    return res.status(500).json({ error: { message: 'Erro ao conectar com a IA' } });
  }
}
