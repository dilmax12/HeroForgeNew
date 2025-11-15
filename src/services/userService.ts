export type UserProfile = { userId: string; displayName: string; avatarUrl?: string; bio?: string; interests: string[] };

export async function getProfile(userId: string): Promise<UserProfile> {
  const q = new URLSearchParams();
  q.set('userId', userId);
  const res = await fetch(`/api/users/profile?${q.toString()}`);
  if (!res.ok) throw new Error(`Falha ao obter perfil: ${res.status}`);
  const data = await res.json();
  return data?.profile as UserProfile;
}

export async function saveProfile(profile: UserProfile): Promise<UserProfile> {
  const res = await fetch('/api/users/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile) });
  if (!res.ok) throw new Error(`Falha ao salvar perfil: ${res.status}`);
  const data = await res.json();
  return data?.profile as UserProfile;
}

export async function listFriends(userId: string): Promise<string[]> {
  const q = new URLSearchParams();
  q.set('userId', userId);
  const res = await fetch(`/api/users/friends?${q.toString()}`);
  if (!res.ok) throw new Error(`Falha ao listar amigos: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data?.friends) ? data.friends as string[] : [];
}

export async function addFriend(userId: string, targetId: string): Promise<boolean> {
  const res = await fetch('/api/users/friends/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, targetId }) });
  if (!res.ok) throw new Error(`Falha ao adicionar amigo: ${res.status}`);
  const data = await res.json();
  return !!data?.ok;
}

export async function removeFriend(userId: string, targetId: string): Promise<boolean> {
  const res = await fetch('/api/users/friends/remove', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, targetId }) });
  if (!res.ok) throw new Error(`Falha ao remover amigo: ${res.status}`);
  const data = await res.json();
  return !!data?.ok;
}

export async function listNotifications(userId: string): Promise<any[]> {
  const q = new URLSearchParams();
  q.set('viewerId', userId);
  const res = await fetch(`/api/notifications/list?${q.toString()}`);
  if (!res.ok) throw new Error(`Falha ao listar notificações: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data?.notifications) ? data.notifications : [];
}

export async function listEventsHistory(userId: string): Promise<any[]> {
  const q = new URLSearchParams();
  q.set('viewerId', userId);
  const res = await fetch(`/api/events/history?${q.toString()}`);
  if (!res.ok) {
    if (res.status === 404) return [];
    try {
      const err = await res.json();
      console.error('Eventos histórico erro', err);
    } catch {}
    return [];
  }
  const data = await res.json();
  return Array.isArray(data?.events) ? data.events : [];
}

export type UserProgress = {
  missionsCompleted: number;
  achievementsUnlocked: number;
  playtimeMinutes: number;
};

export async function getUserProgress(userId: string): Promise<UserProgress> {
  try {
    const { loadLocalQuests, loadLocalHeroes } = await import('./localStore');
    const quests = loadLocalQuests(userId);
    const heroes = loadLocalHeroes(userId);
    const localCompleted = Array.isArray(quests) ? quests.filter((q: any) => q?.status === 'completed').length : 0;
    const storeHeroes = Array.isArray(heroes) ? heroes : [];
    let completedFromHeroes = 0;
    let achievementsFromHeroes = 0;
    let playtimeFromHeroes = 0;
    for (const h of storeHeroes) {
      try {
        completedFromHeroes += Array.isArray(h?.completedQuests) ? h.completedQuests.length : (h?.stats?.questsCompleted || 0);
        achievementsFromHeroes += Array.isArray(h?.achievements) ? h.achievements.filter((a: any) => a?.unlocked).length : (h?.stats?.achievementsUnlocked || 0);
        playtimeFromHeroes += Number(h?.stats?.totalPlayTime || 0);
      } catch {}
    }
    return {
      missionsCompleted: localCompleted + completedFromHeroes,
      achievementsUnlocked: achievementsFromHeroes,
      playtimeMinutes: playtimeFromHeroes,
    };
  } catch {
    return { missionsCompleted: 0, achievementsUnlocked: 0, playtimeMinutes: 0 };
  }
}

export async function upsertUserProfile(payload: { id: string; username?: string; email?: string | null }): Promise<boolean> {
  try {
    const res = await fetch('/api/users/profile/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) return false;
    const data = await res.json().catch(() => ({}));
    return !!(data && (data.ok === true || data.profile));
  } catch {
    return false;
  }
}

