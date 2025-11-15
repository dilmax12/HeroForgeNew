import React, { useEffect, useMemo, useState } from 'react';
import { useHeroStore } from '../store/heroStore';
import { getProfile, saveProfile, UserProfile } from '../services/userService';

const UserProfilePage: React.FC = () => {
  const { getSelectedHero } = useHeroStore();
  const me = getSelectedHero();
  const userId = useMemo(() => me?.id || '', [me?.id]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!userId) { setProfile(null); return; }
    const p = await getProfile(userId);
    setProfile(p);
  };

  useEffect(() => { load(); }, [userId]);

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    try { const p = await saveProfile(profile); setProfile(p); } catch {}
    setSaving(false);
  };

  if (!userId) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="text-6xl mb-2">👤</div>
        <div className="text-gray-600">Selecione um herói para editar o perfil</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white p-6 rounded border">
        <div className="text-2xl font-bold text-gray-800 mb-4">Perfil</div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700">Nome de exibição</label>
            <input value={profile?.displayName||''} onChange={e=>setProfile(p=>({ ...(p||{ userId, displayName:'' , interests:[] }), displayName: e.target.value }))} className="mt-1 w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Avatar URL</label>
            <input value={profile?.avatarUrl||''} onChange={e=>setProfile(p=>({ ...(p||{ userId, displayName:'' , interests:[] }), avatarUrl: e.target.value }))} className="mt-1 w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Bio</label>
            <textarea value={profile?.bio||''} onChange={e=>setProfile(p=>({ ...(p||{ userId, displayName:'' , interests:[] }), bio: e.target.value }))} rows={4} className="mt-1 w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Interesses (tags separadas por vírgula)</label>
            <input value={(profile?.interests||[]).join(', ')} onChange={e=>setProfile(p=>({ ...(p||{ userId, displayName:'' , interests:[] }), interests: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) }))} className="mt-1 w-full p-2 border rounded" />
          </div>
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded bg-blue-600 text-white">Salvar</button>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;