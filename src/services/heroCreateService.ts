export interface HeroCreateResponse {
  name: string;
  story: string;
  phrase: string;
  image: string | null;
}

export async function generateHeroWithAI(params: {
  race: string;
  klass: string;
  attrs: Record<string, number>;
}): Promise<HeroCreateResponse> {
  const resp = await fetch('/api/hero-create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!resp.ok) {
    throw new Error(`Erro ao gerar herói: ${resp.status}`);
  }

  return resp.json();
}

