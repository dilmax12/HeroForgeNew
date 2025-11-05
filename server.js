// Servidor Express local para desenvolvimento
import express from 'express';
import dotenv from 'dotenv';
import { InferenceClient } from '@huggingface/inference';

dotenv.config();

const app = express();
app.use(express.json());

const HF_TOKEN = process.env.HF_TOKEN;
const MODEL_ID = process.env.HF_TEXT_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3';
const HF_API_INFERENCE_BASE = `https://router.huggingface.co/hf-inference/models/`;
const HF_IMAGE_MODEL = 'stabilityai/stable-diffusion-2';

// Cliente oficial da Hugging Face para Providers/Router
const hfClient = new InferenceClient(HF_TOKEN, { provider: 'hf-inference' });

// Busca por imagem no Lexica.art (gratuito, sem chave)
async function lexicaSearchImage(prompt) {
  const url = `https://lexica.art/api/v1/search?q=${encodeURIComponent(prompt)}`;
  const resp = await fetch(url, { method: 'GET' });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Lexica API: ${resp.status} ${resp.statusText} ${txt.slice(0,200)}`);
  }
  const data = await resp.json();
  const first = Array.isArray(data?.images) ? data.images[0] : null;
  const src = first?.src || '';
  if (!src) throw new Error('Lexica: nenhuma imagem encontrada para o prompt');
  return src;
}

function parseHFResponse(data) {
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

// Limpa saída de nome gerado, removendo rótulos e epíteto
function normalizeNameOutput(text) {
  if (!text || typeof text !== 'string') return '';
  let t = text.replace(/\s+/g, ' ').trim();
  // Remove rótulo Nome:
  t = t.replace(/^Nome\s*[:\-]?\s*/i, '').trim();
  // Corta qualquer parte de epíteto
  t = t.replace(/Ep[íi]teto\s*[:\-].*$/i, '').trim();
  // Primeira linha apenas
  t = t.split(/\r?\n/)[0].trim();
  // Remove aspas
  t = t.replace(/^(["'“”`\[\(])+|(["'“”`\]\)])+$/g, '').trim();
  // Parte antes da primeira vírgula
  t = t.split(',')[0].trim();
  return t;
}

// Gera uma imagem placeholder SVG quando todas as opções falham
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

// Fallback via API pública de Inference: texto
async function hfApiTextGeneration(model, prompt, maxTokens = 128, temperature = 0.7) {
  const url = `https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`;
  const body = {
    inputs: prompt,
    parameters: {
      max_new_tokens: Math.min(maxTokens || 128, 256),
      temperature: typeof temperature === 'number' ? temperature : 0.7,
      return_full_text: false
    }
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`API Inference ${model}: ${resp.status} ${resp.statusText} ${text.slice(0,200)}`);
  }
  const ct = resp.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    const json = await resp.json();
    return parseHFResponse(json);
  }
  const text = await resp.text();
  try { const json = JSON.parse(text); return parseHFResponse(json); } catch { return text; }
}

// Fallback via API pública de Inference: imagem
async function hfApiTextToImage(model, prompt) {
  const url = `https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ inputs: prompt })
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`API Inference ${model}: ${resp.status} ${resp.statusText} ${text.slice(0,200)}`);
  }
  const arrayBuffer = await resp.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}

// Fallback via Router hf-inference: imagem (substitui API pública desativada)
async function hfRouterTextToImage(model, prompt) {
  const url = `${HF_API_INFERENCE_BASE}${encodeURIComponent(model)}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ inputs: prompt })
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Router hf-inference image ${model}: ${resp.status} ${resp.statusText} ${text.slice(0,200)}`);
  }
  const arrayBuffer = await resp.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}

// Fallback via Router v1 chat completions com sufixo de provedor em model
async function hfRouterChatCompletion(model, messages, options = {}) {
  const url = 'https://router.huggingface.co/v1/chat/completions';
  const modelWithProvider = options.provider ? `${model}@${options.provider}` : model;
  const body = {
    model: modelWithProvider,
    messages,
    max_tokens: options.max_tokens || 64,
    temperature: typeof options.temperature === 'number' ? options.temperature : 0.7
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Router v1 chat ${modelWithProvider}: ${resp.status} ${resp.statusText} ${text.slice(0,200)}`);
  }
  const json = await resp.json();
  return json?.choices?.[0]?.message?.content || '';
}

// Fallback via Router v1: geração de imagens (OpenAI-compatible)
async function hfRouterImageGenerations(model, prompt, size = '512x512') {
  const url = 'https://router.huggingface.co/v1/images/generations';
  const body = { model, prompt, size, n: 1 };
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Router v1 images ${model}: ${resp.status} ${resp.statusText} ${text.slice(0,200)}`);
  }
  const json = await resp.json();
  const b64 = json?.data?.[0]?.b64_json || '';
  if (!b64 || typeof b64 !== 'string') throw new Error('Router v1 images: resposta sem b64_json');
  return b64;
}

// Fallback opcional: Inference Endpoint gerenciado (pago) se URLs forem configuradas
async function hfPaidEndpointText(url, prompt, maxTokens = 128, temperature = 0.7) {
  const body = {
    inputs: prompt,
    parameters: {
      max_new_tokens: Math.min(maxTokens || 128, 512),
      temperature: typeof temperature === 'number' ? temperature : 0.7,
      return_full_text: false
    }
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Paid Endpoint text: ${resp.status} ${resp.statusText} ${text.slice(0,200)}`);
  }
  const json = await resp.json();
  return parseHFResponse(json);
}

async function hfPaidEndpointImage(url, prompt) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ inputs: prompt })
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Paid Endpoint image: ${resp.status} ${resp.statusText} ${text.slice(0,200)}`);
  }
  const arrayBuffer = await resp.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}

app.post('/api/gerar-texto', async (req, res) => {
  if (!HF_TOKEN) {
    return res.status(500).json({ error: 'HF_TOKEN não configurado no servidor' });
  }

  const { tipo, contexto = '' } = req.body || {};
  if (!tipo) {
    return res.status(400).json({ error: 'Campo "tipo" é obrigatório' });
  }

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

  try {
    const models = [
      MODEL_ID,
      'google/gemma-2b-it',
      'tiiuae/falcon-7b-instruct',
      'Qwen/Qwen2.5-7B-Instruct'
    ];

    for (const model of models) {
      try {
        const data = await hfClient.chatCompletion({
          model,
          messages: [
            { role: 'system', content: 'Você é um assistente de fantasia medieval conciso.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 64,
          temperature: 0.7,
          provider: 'hf-inference'
        });
        let output = (data?.choices?.[0]?.message?.content) || '';
        if (output) {
          if (tipo === 'nome') output = normalizeNameOutput(output);
          return res.json({ resultado: output });
        }
      } catch (err) {
        const msg = (err && err.message) || 'Erro ao gerar';
        console.warn(`HF chatCompletion error (${model}):`, msg);
        // Fallback para textGeneration se chat falhar
        try {
          const gen = await hfClient.textGeneration({
            model,
            inputs: prompt,
            parameters: { max_new_tokens: 128, temperature: 0.7 },
            provider: 'hf-inference'
          });
          let genText = gen?.generated_text || parseHFResponse(gen);
          if (genText) {
            if (tipo === 'nome') genText = normalizeNameOutput(genText);
            return res.json({ resultado: genText });
          }
        } catch (fallbackErr) {
          console.warn(`HF textGeneration fallback error (${model}):`, fallbackErr?.message || String(fallbackErr));
          continue;
        }
      }
    }
    // Fallback: Router v1 com roteamento automático
    try {
      let output = await hfRouterChatCompletion('Qwen/Qwen2.5-7B-Instruct', [
        { role: 'system', content: 'Você é um assistente de fantasia medieval conciso.' },
        { role: 'user', content: prompt }
      ], { max_tokens: 64, temperature: 0.7 });
      if (output) {
        if (tipo === 'nome') output = normalizeNameOutput(output);
        return res.json({ resultado: output });
      }
    } catch (err) {
      console.warn('Router v1 fallback error (Qwen):', err?.message || String(err));
    }
    // Fallback final: Inference Endpoint pago, se configurado
    if (process.env.HF_ENDPOINT_URL) {
      try {
        const output = await hfPaidEndpointText(process.env.HF_ENDPOINT_URL, prompt, 64, 0.7);
        if (output) return res.json({ resultado: output });
      } catch (err) {
        console.warn('Paid Endpoint text error:', err?.message || String(err));
      }
    }
    return res.status(502).json({ error: 'Falha na geração com modelos disponíveis' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao conectar com a IA' });
  }
});

// Rota genérica para prompts livres: /api/hf-text
app.post('/api/hf-text', async (req, res) => {
  if (!HF_TOKEN) {
    return res.status(500).json({ error: 'HF_TOKEN não configurado no servidor' });
  }

  const { prompt = '', systemMessage = '', maxTokens = 512, temperature = 0.7 } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Campo "prompt" é obrigatório' });
  }

  const composed = systemMessage
    ? `System: ${systemMessage}\nUser: ${prompt}\nAssistant:`
    : prompt;

  try {
    const models = [
      MODEL_ID,
      'google/gemma-2b-it',
      'tiiuae/falcon-7b-instruct',
      'Qwen/Qwen2.5-7B-Instruct'
    ];

    for (const model of models) {
      try {
        const data = await hfClient.chatCompletion({
          model,
          messages: [
            ...(systemMessage ? [{ role: 'system', content: systemMessage }] : []),
            { role: 'user', content: prompt }
          ],
          max_tokens: maxTokens,
          temperature,
          provider: 'hf-inference'
        });
        const output = (data?.choices?.[0]?.message?.content) || '';
        if (output) return res.json({ text: output });
      } catch (err) {
        const msg = (err && err.message) || 'Erro ao gerar';
        console.warn(`HF chatCompletion error (${model}):`, msg);
        // Fallback para textGeneration se chat falhar
        try {
          const gen = await hfClient.textGeneration({
            model,
            inputs: composed,
            parameters: { max_new_tokens: Math.min(maxTokens || 128, 256), temperature: typeof temperature === 'number' ? temperature : 0.7 },
            provider: 'hf-inference'
          });
          const genText = gen?.generated_text || parseHFResponse(gen);
          if (genText) return res.json({ text: genText });
        } catch (fallbackErr) {
          console.warn(`HF textGeneration fallback error (${model}):`, fallbackErr?.message || String(fallbackErr));
          continue;
        }
      }
    }
    // Fallback: Router v1 com roteamento automático
    try {
      const output = await hfRouterChatCompletion('Qwen/Qwen2.5-7B-Instruct', [
        ...(systemMessage ? [{ role: 'system', content: systemMessage }] : []),
        { role: 'user', content: prompt }
      ], { max_tokens: maxTokens, temperature });
      if (output) return res.json({ text: output });
    } catch (err) {
      console.warn('Router v1 fallback error (Qwen):', err?.message || String(err));
    }
    // Fallback final: Inference Endpoint pago, se configurado
    if (process.env.HF_ENDPOINT_URL) {
      try {
        const output = await hfPaidEndpointText(process.env.HF_ENDPOINT_URL, composed, maxTokens, temperature);
        if (output) return res.json({ text: output });
      } catch (err) {
        console.warn('Paid Endpoint text error:', err?.message || String(err));
      }
    }
    return res.status(502).json({ error: 'Falha na geração com modelos disponíveis' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao conectar com a IA' });
  }
});

// Rota de geração de imagem via Hugging Face Stable Diffusion
app.post('/api/gerar-imagem', async (req, res) => {
  if (!HF_TOKEN) {
    return res.status(500).json({ error: 'HF_TOKEN não configurado no servidor' });
  }

  const { prompt = '' } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Campo "prompt" é obrigatório' });
  }

  try {
    const models = [
      'ByteDance/Hyper-SD',
      process.env.HF_IMAGE_MODEL || 'ByteDance/Hyper-SD',
      'ByteDance/Hyper-SD-Lite',
      'stabilityai/sd-turbo',
      'stabilityai/stable-diffusion-2-1',
      'runwayml/stable-diffusion-v1-5'
    ];

    for (const model of models) {
      try {
        const blob = await hfClient.textToImage({ model, inputs: prompt, provider: 'hf-inference' });
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        return res.json({ imagem: `data:image/png;base64,${base64}` });
      } catch (err) {
        const msg = (err && err.message) || 'Erro ao gerar imagem';
        console.warn(`HF textToImage error (${model}):`, msg);
        // Tentar fallback via Router hf-inference
        try {
          const base64 = await hfRouterTextToImage(model, prompt);
          return res.json({ imagem: `data:image/png;base64,${base64}` });
        } catch (routerErr) {
          console.warn(`Router hf-inference image fallback error (${model}):`, routerErr?.message || String(routerErr));
          // Tentar fallback via Router v1 OpenAI-compatible
          try {
            const base64 = await hfRouterImageGenerations(model, prompt, '512x512');
            return res.json({ imagem: `data:image/png;base64,${base64}` });
          } catch (routerV1Err) {
            console.warn(`Router v1 images fallback error (${model}):`, routerV1Err?.message || String(routerV1Err));
            continue;
          }
        }
      }
    }
    // Fallback final: Inference Endpoint pago, se configurado
    if (process.env.HF_IMAGE_ENDPOINT_URL) {
      try {
        const base64 = await hfPaidEndpointImage(process.env.HF_IMAGE_ENDPOINT_URL, prompt);
        return res.json({ imagem: `data:image/png;base64,${base64}` });
      } catch (err) {
        console.warn('Paid Endpoint image error:', err?.message || String(err));
      }
    }
    // Fallback gratuito: Lexica.art (retorna URL direta da imagem)
    try {
      const url = await lexicaSearchImage(prompt);
      return res.json({ imagem: url });
    } catch (lexErr) {
      console.warn('Lexica fallback error:', lexErr?.message || String(lexErr));
    }
    // Fallback final: placeholder SVG
    const placeholder = generatePlaceholderImage(prompt);
    return res.json({ imagem: placeholder });
  } catch (error) {
    console.error(error);
    // Em caso de erro inesperado, ainda retorna placeholder
    const placeholder = generatePlaceholderImage(prompt);
    return res.json({ imagem: placeholder });
  }
});

// Rota dedicada: /api/hero-image (GET) usando Lexica
app.get('/api/hero-image', async (req, res) => {
  const prompt = (req.query?.prompt || '').toString();
  if (!prompt) {
    return res.status(400).json({ error: 'Campo "prompt" é obrigatório' });
  }
  try {
    const url = await lexicaSearchImage(prompt);
    return res.json({ image: url });
  } catch (err) {
    const msg = err?.message || 'Falha ao buscar imagem';
    return res.status(502).json({ error: msg });
  }
});

// Login com Google: valida ID token via endpoint tokeninfo
app.post('/api/login-google', async (req, res) => {
  const { credential } = req.body || {};
  if (!credential) {
    return res.status(400).json({ error: 'Credencial Google ausente' });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: 'GOOGLE_CLIENT_ID não configurado' });
  }

  try {
    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    const payload = await verifyRes.json();

    if (!verifyRes.ok) {
      const message = payload?.error_description || payload?.error || 'Falha ao validar token';
      return res.status(401).json({ error: message });
    }

    if (payload.aud !== clientId) {
      return res.status(401).json({ error: 'Token inválido para este cliente' });
    }

    const user = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      email_verified: payload.email_verified
    };

    return res.json({ user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao validar token Google' });
  }
});

// Preparação de monetização: expõe configuração básica
app.get('/api/monetization/config', async (_req, res) => {
  const stripePublic = process.env.STRIPE_PUBLIC_KEY || '';
  const stripeEnabled = !!process.env.STRIPE_SECRET_KEY;
  const storeEnabled = true; // Loja já existe no app
  return res.json({
    stripeEnabled,
    stripePublicKey: stripePublic,
    storeEnabled
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor IA rodando na porta ${PORT}`);
});
