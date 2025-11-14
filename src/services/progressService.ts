import { supabase } from '../lib/supabaseClient';

export async function updateProgressDelta(delta: { missionsCompleted?: number; achievementsUnlocked?: number; playtimeMinutes?: number; lastLogin?: string | null }) {
  try {
    const { data } = await supabase.auth.getUser();
    const userId = data?.user?.id || null;
    if (!userId) return;
    await fetch('/api/player-progress?action=delta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, missionsCompleted: delta.missionsCompleted || 0, achievementsUnlocked: delta.achievementsUnlocked || 0, playtimeMinutes: delta.playtimeMinutes || 0, lastLogin: delta.lastLogin || null })
    });
  } catch {}
}

let heartbeatTimer: any = null;
export function startPlaytimeHeartbeat(intervalMinutes = 1) {
  stopPlaytimeHeartbeat();
  const ms = Math.max(1, intervalMinutes) * 60 * 1000;
  heartbeatTimer = setInterval(() => {
    updateProgressDelta({ playtimeMinutes: intervalMinutes });
  }, ms);
}

export function stopPlaytimeHeartbeat() {
  if (heartbeatTimer) {
    try { clearInterval(heartbeatTimer); } catch {}
    heartbeatTimer = null;
  }
}