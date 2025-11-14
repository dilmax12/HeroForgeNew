export async function getUserProfile(id: string): Promise<any> {
  const res = await fetch(`/api/users?action=get&id=${encodeURIComponent(id)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Falha ao obter perfil');
  return data.profile;
}

export async function upsertUserProfile(payload: { id: string; username?: string; email?: string | null }): Promise<any> {
  const res = await fetch(`/api/users?action=upsert`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Falha ao salvar perfil');
  return data.profile;
}

export async function getUserProgress(id: string): Promise<{ missionsCompleted: number; achievementsUnlocked: number; playtimeMinutes: number; lastLogin: string | null }> {
  const res = await fetch(`/api/users?action=progress&id=${encodeURIComponent(id)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Falha ao obter progresso');
  return data.progress;
}

