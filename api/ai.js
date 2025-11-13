// Endpoint unificado de IA: /api/ai?action=<hf-text|text|groq-chat|image|hero-image|groq-openai-chat-completions>

const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || '';
const GROQ_API_URL = process.env.GROQ_API_URL || process.env.VITE_GROQ_API_URL || 'https://api.groq.com/openai/v1';
const HF_TOKEN = process.env.HF_TOKEN;

// Defaults
const HF_TEXT_MODEL = process.env.HF_TEXT_MODEL || 'HuggingFaceH4/zephyr-7b-beta';
const HF_IMAGE_MODEL = process.env.HF_IMAGE_MODEL || 'stabilityai/sd-turbo';
const GROQ_FALLBACK_MODELS = [
  'llama-3.1-8b-instant',
  'llama-3.1-70b-versatile',
  'gemma2-9b-it'
];

function parseHFResponse(data) {
  if (data && Array.isArray(data.choices) && data.choices[0]?.message?.content) {
    return data.choices[0].message.content;
  }
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

async function readBody(req) {
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
  return body || {};
}

export default async function handler(req, res) {
  try {
    const action = (req.query?.action || req.body?.action || '').toString();
    if (!action) return res.status(400).json({ error: 'Missing action' });

    // === Texto via Groq (gerar-texto) ===
    if (action === 'text') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
      if (!GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY não configurado no servidor' });
      const body = await readBody(req);
      const { tipo, contexto = '' } = body || {};
      if (!tipo) return res.status(400).json({ error: 'Campo "tipo" é obrigatório' });
      let prompt = '';
      switch (tipo) {
        case 'missao':
          prompt = `Crie uma missão medieval curta e envolvente para um herói. Contexto: ${contexto}. Forneça um objetivo, local e desafio em 2-3 linhas.`;
          break;
        case 'historia':
          prompt = `Crie a história de origem de um herói medieval em 4-6 linhas. Contexto: ${contexto}. Estilo épico, com tom inspirador e coeso.`;
          break;
        case 'frase':
          prompt = 'Gere uma frase inspiradora de fantasia épica, curta e memorável.';
          break;
        case 'nome':
          prompt = 'Crie um nome original de fantasia medieval para um herói ou heroína (1-3 palavras) e um epíteto estiloso.';
          break;
        default:
          return res.status(400).json({ error: 'Tipo inválido' });
      }
      const messages = [{ role: 'user', content: prompt }];
      let output = '';
      for (const model of GROQ_FALLBACK_MODELS) {
        const groqResp = await fetch(`${GROQ_API_URL}/chat/completions`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages, max_tokens: 512, temperature: 0.7 })
        });
        const raw = await groqResp.text();
        let json; try { json = JSON.parse(raw); } catch { json = { error: { message: raw } }; }
        if (groqResp.ok) {
          output = Array.isArray(json?.choices) ? (json.choices[0]?.message?.content || '') : '';
          break;
        }
      }
      if (!output) return res.status(403).json({ error: 'Nenhum modelo Groq habilitado para este projeto.' });
      return res.json({ resultado: output });
    }

    // === Chat via Groq ===
    if (action === 'groq-chat') {
      if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method not allowed' } });
      if (!GROQ_API_KEY) return res.status(500).json({ error: { message: 'GROQ_API_KEY ausente no servidor' } });
      const body = await readBody(req);
      const { model, messages, max_tokens, temperature } = body || {};
      const url = `${GROQ_API_URL}/chat/completions`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: (!model || /\//.test(model) || /huggingface/i.test(model))
            ? 'llama-3.1-8b-instant'
            : (model || (process.env.VITE_AI_MODEL || 'llama-3.1-8b-instant')),
          messages: Array.isArray(messages) ? messages : [],
          max_tokens: typeof max_tokens === 'number' ? max_tokens : 1500,
          temperature: typeof temperature === 'number' ? temperature : 0.7
        })
      });
      const text = await response.text();
      if (!response.ok) {
        let err; try { err = JSON.parse(text); } catch {}
        return res.status(response.status).json(err || { error: { message: text || 'Falha na chamada ao Groq' } });
      }
      try { const json = JSON.parse(text); return res.status(200).json(json); }
      catch { return res.status(200).send(text); }
    }

    // === Groq OpenAI-compatible chat/completions ===
    if (action === 'groq-openai-chat-completions') {
      if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method not allowed' } });
      if (!GROQ_API_KEY) return res.status(500).json({ error: { message: 'GROQ_API_KEY ausente no servidor' } });
      const body = await readBody(req);
      const { model, messages, max_tokens, temperature } = body || {};
      const url = `${GROQ_API_URL}/chat/completions`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: model || (process.env.VITE_AI_MODEL || 'llama-3.3-70b-versatile'),
          messages: Array.isArray(messages) ? messages : [],
          max_tokens: typeof max_tokens === 'number' ? max_tokens : 1500,
          temperature: typeof temperature === 'number' ? temperature : 0.7
        })
      });
      const text = await response.text();
      if (!response.ok) {
        let err; try { err = JSON.parse(text); } catch {}
        return res.status(response.status).json(err || { error: { message: text || 'Falha na chamada ao Groq' } });
      }
      try { const json = JSON.parse(text); return res.status(200).json(json); }
      catch { return res.status(200).send(text); }
    }

    // === Texto via Hugging Face ===
    if (action === 'hf-text') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
      if (!HF_TOKEN) return res.status(500).json({ error: 'HF_TOKEN não configurado no servidor' });
      const body = await readBody(req);
      const { prompt = '', systemMessage = '', maxTokens = 512, temperature = 0.7 } = body || {};
      if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'Campo "prompt" é obrigatório' });
      const messages = [];
      if (systemMessage) messages.push({ role: 'system', content: systemMessage });
      messages.push({ role: 'user', content: prompt });
      const tryInference = async (model) => {
        const url = `https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`;
        const body = {
          inputs: systemMessage ? `${systemMessage}\n\n${prompt}` : prompt,
          parameters: { max_new_tokens: Math.min(typeof maxTokens === 'number' ? maxTokens : 128, 256), temperature: typeof temperature === 'number' ? temperature : 0.7, return_full_text: false }
        };
        const resp = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${HF_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const raw = await resp.text();
        let data; try { data = JSON.parse(raw); } catch { data = [{ generated_text: raw }]; }
        return { ok: resp.ok, status: resp.status, data, raw };
      };
      const first = await tryInference(HF_TEXT_MODEL);
      if (first.ok) { const output = parseHFResponse(first.data) || ''; return res.json({ text: output }); }
      for (const m of ['HuggingFaceH4/zephyr-7b-beta','mistralai/Mistral-7B-Instruct-v0.2','google/gemma-2-9b-it']) {
        const r = await tryInference(m);
        if (r.ok) { const output = parseHFResponse(r.data) || ''; return res.json({ text: output }); }
      }
      try {
        const routerResp = await fetch('https://router.huggingface.co/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${HF_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: HF_TEXT_MODEL, messages, max_tokens: maxTokens, temperature }) });
        const routerRaw = await routerResp.text(); let routerData; try { routerData = JSON.parse(routerRaw); } catch { routerData = { generated_text: routerRaw }; }
        if (!routerResp.ok) { const errObj = routerData?.error || routerData; const message = typeof errObj === 'string' ? errObj : (errObj?.message || 'Falha na geração'); return res.status(routerResp.status).json({ error: { message } }); }
        const output2 = parseHFResponse(routerData) || ''; return res.json({ text: output2 });
      } catch (err) { return res.status(500).json({ error: { message: 'Erro ao conectar com a IA' } }); }
    }

    // === Imagem via Hugging Face (POST) ===
    if (action === 'image') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      if (!HF_TOKEN) return res.status(500).json({ error: 'HF_TOKEN não configurado' });
      const body = await readBody(req);
      const { prompt = '' } = body || {};
      if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'Campo "prompt" é obrigatório' });
      try {
        const response = await fetch(`https://api-inference.huggingface.co/models/${HF_IMAGE_MODEL}`, { method: 'POST', headers: { Authorization: `Bearer ${HF_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ inputs: prompt }) });
        if (response.ok) { const arrayBuffer = await response.arrayBuffer(); const base64 = Buffer.from(arrayBuffer).toString('base64'); return res.status(200).json({ imagem: `data:image/png;base64,${base64}` }); }
        // Fallback Lexica/Unsplash/placeholder
        try {
          const lexica = await fetch(`https://lexica.art/api/v1/search?q=${encodeURIComponent(prompt)}`);
          if (lexica.ok) { const data = await lexica.json(); const first = Array.isArray(data?.images) ? data.images[0] : null; const src = first?.src || ''; if (src) return res.status(200).json({ imagem: src }); }
          const unsplashUrl = `https://source.unsplash.com/1024x1024/?${encodeURIComponent(prompt)}`; return res.status(200).json({ imagem: unsplashUrl });
        } catch {
          const unsplashUrl = `https://source.unsplash.com/1024x1024/?${encodeURIComponent(prompt)}`; if (unsplashUrl) return res.status(200).json({ imagem: unsplashUrl });
          const placeholder = generatePlaceholderImage(prompt); return res.status(200).json({ imagem: placeholder });
        }
      } catch (error) {
        // Tentativa final: Lexica
        try { const lexica = await fetch(`https://lexica.art/api/v1/search?q=${encodeURIComponent(prompt)}`); if (lexica.ok) { const data = await lexica.json(); const first = Array.isArray(data?.images) ? data.images[0] : null; const src = first?.src || ''; if (src) return res.status(200).json({ imagem: src }); } } catch {}
        const placeholder = generatePlaceholderImage(prompt); return res.status(200).json({ imagem: placeholder });
      }
    }

    // === Imagem de herói via Lexica (GET) ===
    if (action === 'hero-image') {
      if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
      const prompt = (req.query?.prompt || '').toString();
      if (!prompt) return res.status(400).json({ error: 'Campo "prompt" é obrigatório' });
      try {
        const resp = await fetch(`https://lexica.art/api/v1/search?q=${encodeURIComponent(prompt)}`);
        if (!resp.ok) { const text = await resp.text(); return res.status(resp.status).json({ error: text || 'Falha ao buscar imagem' }); }
        const data = await resp.json(); const first = Array.isArray(data?.images) ? data.images[0] : null; const src = first?.src || '';
        if (!src) return res.status(404).json({ error: 'Nenhuma imagem encontrada' });
        return res.status(200).json({ image: src, prompt: first?.prompt });
      } catch (err) { return res.status(500).json({ error: err?.message || 'Falha ao buscar imagem' }); }
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('AI unified error:', error);
    return res.status(500).json({ error: 'Erro na rota unificada de IA' });
  }
}

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
