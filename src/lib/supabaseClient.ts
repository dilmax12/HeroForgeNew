import { createClient } from '@supabase/supabase-js';

// Leitura obrigatória das variáveis de ambiente do Vite.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseDisabled = String(import.meta.env.VITE_SUPABASE_DISABLE || '').toLowerCase() === 'true';
export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey) && !supabaseDisabled;

// Pequeno fetch com retry/backoff para reduzir falhas de rede intermitentes
async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit, retries = 2, baseDelayMs = 300): Promise<Response> {
  let attempt = 0;
  while (true) {
    try {
      const res = await fetch(input, init);
      // Em caso de 5xx, tentamos novamente até o limite
      if (res.status >= 500 && attempt < retries) {
        attempt++;
        await new Promise((r) => setTimeout(r, baseDelayMs * attempt));
        continue;
      }
      return res;
    } catch (err: any) {
      const isAbortOrNetwork = err?.name === 'AbortError' || err instanceof TypeError;
      if (isAbortOrNetwork && attempt < retries) {
        attempt++;
        await new Promise((r) => setTimeout(r, baseDelayMs * attempt));
        continue;
      }
      throw err;
    }
  }
}

// Stub seguro para quando o Supabase não está configurado: não quebra a app e retorna erro amigável.
let warnedOnce = false;
function createDisabledClient() {
  const errorPayload = {
    data: null,
    error: { message: 'Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY', code: 'ENV_MISSING' }
  };
  const thenable = {
    then(resolve: (v: any) => void) {
      resolve(errorPayload);
      return Promise.resolve(errorPayload);
    }
  } as any;
  const builder = {
    select() { return builder; },
    insert() { return builder; },
    update() { return builder; },
    upsert() { return builder; },
    delete() { return builder; },
    eq() { return builder; },
    order() { return builder; },
    limit() { return builder; },
    // Faz o objeto ser awaitable
    then: thenable.then
  } as any;
  const client = {
    from() { return builder; },
    auth: {
      onAuthStateChange(_cb: any) {
        return { data: { subscription: { unsubscribe() {/* noop */} } }, error: { message: 'Supabase não configurado', code: 'ENV_MISSING' } };
      },
      async getUser() { return { data: { user: null }, error: { message: 'Supabase não configurado', code: 'ENV_MISSING' } }; },
      async getSession() { return { data: { session: null }, error: { message: 'Supabase não configurado', code: 'ENV_MISSING' } }; },
      async signOut() { return { data: {}, error: { message: 'Supabase não configurado', code: 'ENV_MISSING' } }; },
      async signInWithOAuth() { return { data: null, error: { message: 'Supabase não configurado', code: 'ENV_MISSING' } }; }
    }
  } as any;
  try {
    const shouldWarn = Boolean((import.meta as any)?.env?.PROD) && !supabaseDisabled;
    if (shouldWarn && !warnedOnce) {
      console.warn('[Supabase] Variáveis de ambiente ausentes. Configure .env.local com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY');
      warnedOnce = true;
    }
  } catch {}
  return client;
}

export const supabase: any = (supabaseConfigured)
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, { global: { fetch: fetchWithRetry as any } })
  : createDisabledClient();
