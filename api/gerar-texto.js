// Rota Serverless para Vercel: /api/gerar-texto
// Redireciona geração de texto para Groq (OpenAI-compatível) para maior estabilidade

const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || '';
const GROQ_API_URL = process.env.GROQ_API_URL || process.env.VITE_GROQ_API_URL || 'https://api.groq.com/openai/v1';
// Força modelo estável independentemente da env para evitar 404/400
const DEFAULT_MODEL = 'llama-3.1-8b-instant';
const GROQ_FALLBACK_MODELS = [
  'llama-3.1-8b-instant',
  'llama-3.1-70b-versatile',
  'gemma2-9b-it'
];

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

  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY não configurado no servidor' });
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
    // Tenta sequencialmente modelos Groq até obter sucesso
    let output = '';
    for (const model of GROQ_FALLBACK_MODELS) {
      const groqResp = await fetch(`${GROQ_API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model, messages, max_tokens: 512, temperature: 0.7 })
      });
      const raw = await groqResp.text();
      let json; try { json = JSON.parse(raw); } catch { json = { error: { message: raw } }; }
      if (groqResp.ok) {
        output = Array.isArray(json?.choices) ? (json.choices[0]?.message?.content || '') : '';
        break;
      }
    }
    if (!output) {
      return res.status(403).json({ error: 'Nenhum modelo Groq habilitado para este projeto. Habilite pelo menos um nas configurações do projeto no console Groq.' });
    }
    // Para tipo 'nome', garantir que retornamos apenas o nome limpo
    const resultado = tipo === 'nome' ? normalizeNameOutput(output) : output;
    return res.json({ resultado });
  } catch (error) {
    console.error('Groq text error:', error);
    return res.status(500).json({ error: 'Erro ao conectar com a IA (Groq)' });
  }
}
