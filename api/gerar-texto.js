// Rota Serverless para Vercel: /api/gerar-texto
// Usa Hugging Face Inference Router para geração de texto

const HF_TOKEN = process.env.HF_TOKEN;
// Modelo open-source instrucional (pode ser trocado conforme preferência)
const MODEL_ID = process.env.HF_TEXT_MODEL || 'HuggingFaceH4/zephyr-7b-beta';
const HF_API = `https://router.huggingface.co/v1/chat/completions`;

/**
 * Normaliza diferentes formatos de resposta da Hugging Face
 */
function parseHFResponse(data) {
  // OpenAI-compatível: choices[0].message.content
  if (data && Array.isArray(data.choices) && data.choices[0]?.message?.content) {
    return data.choices[0].message.content;
  }
  // Fallbacks
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

/**
 * Limpa saída de nome gerado, removendo rótulos e epíteto.
 * Retorna apenas o nome (1-3 palavras), sem "Nome:" ou "Epíteto:".
 */
function normalizeNameOutput(text) {
  if (!text || typeof text !== 'string') return '';
  let t = text.replace(/\s+/g, ' ').trim();
  // Remove rótulo Nome:
  t = t.replace(/^Nome\s*[:\-]?\s*/i, '').trim();
  // Se vier "Nome: X Epíteto: Y", corta antes do epíteto
  t = t.replace(/Ep[íi]teto\s*[:\-].*$/i, '').trim();
  // Considera apenas a primeira linha
  t = t.split(/\r?\n/)[0].trim();
  // Remove aspas iniciais/finais
  t = t.replace(/^(["'“”`\[\(])+|(["'“”`\]\)])+$/g, '').trim();
  // Evita frases longas: se houver vírgula, pega a parte antes dela
  t = t.split(',')[0].trim();
  return t;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  if (!HF_TOKEN) {
    return res.status(500).json({ error: 'HF_TOKEN não configurado no servidor' });
  }

  try {
    // Em alguns ambientes serverless, req.body pode não estar populado. Tentar fallback de leitura manual.
    let body = req.body;
    if (!body || (typeof body === 'object' && Object.keys(body).length === 0)) {
      try {
        const raw = await new Promise((resolve, reject) => {
          let data = '';
          req.on('data', chunk => { data += chunk; });
          req.on('end', () => resolve(data));
          req.on('error', reject);
        });
        if (raw) {
          body = JSON.parse(raw);
        }
      } catch {
        // Ignora e segue com body vazio
      }
    }

    const { tipo, contexto = '' } = body || {};
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

    const messages = [{ role: 'user', content: prompt }];
    const modelWithProvider = MODEL_ID.includes(':') ? MODEL_ID : `${MODEL_ID}:auto`;

    const hfResponse = await fetch(HF_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model: modelWithProvider, messages })
    });

    // Tenta ler JSON, se falhar, lê texto puro
    let data;
    const text = await hfResponse.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = { generated_text: text };
    }

    if (!hfResponse.ok) {
      const message = data?.error || data?.message || 'Falha na geração';
      return res.status(hfResponse.status).json({ error: message });
    }

    const output = parseHFResponse(data) || 'Falha ao gerar resposta.';
    // Para tipo 'nome', garantir que retornamos apenas o nome limpo
    const resultado = tipo === 'nome' ? normalizeNameOutput(output) : output;
    return res.json({ resultado });
  } catch (error) {
    console.error('HF router error:', error);
    return res.status(500).json({ error: 'Erro ao conectar com a IA' });
  }
}
