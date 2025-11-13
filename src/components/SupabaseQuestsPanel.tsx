import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useHeroStore } from '../store/heroStore';
import { saveQuest, listQuestsByHero, StoredQuest } from '../services/questsService';

const SupabaseQuestsPanel: React.FC = () => {
  const { getSelectedHero, getHeroQuests } = useHeroStore();
  const selectedHero = getSelectedHero();
  const activeQuests = selectedHero ? getHeroQuests(selectedHero.id) : [];
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quests, setQuests] = useState<StoredQuest[]>([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      const u = data?.user || null;
      setUserId(u?.id || null);
      setEmail(u?.email || null);
    }
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUserId(session?.user?.id || null);
      setEmail(session?.user?.email || null);
    });
    return () => { sub?.subscription.unsubscribe(); };
  }, []);

  async function handleSaveActiveQuests() {
    if (!userId || !selectedHero) {
      setError('É necessário estar logado e ter um herói selecionado.');
      return;
    }
    if (activeQuests.length === 0) {
      setError('Nenhuma missão ativa para salvar.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      for (const q of activeQuests) {
        await saveQuest(userId, selectedHero.id, q, 'active');
      }
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleListQuests() {
    if (!userId || !selectedHero) {
      setError('Faça login e selecione um herói.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await listQuestsByHero(userId, selectedHero.id);
      setQuests(list);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">📜 Supabase Quests</h2>
      <div className="text-sm text-gray-700 mb-2">Usuário: {email ? `${email} (id: ${userId})` : '—'}</div>
      <div className="text-sm text-gray-700 mb-2">Herói selecionado: {selectedHero ? `${selectedHero.name} (id: ${selectedHero.id})` : '—'}</div>
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={handleSaveActiveQuests}
          className="px-3 py-2 bg-white text-blue-700 border border-blue-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={loading || !userId || !selectedHero || activeQuests.length === 0}
        >
          {loading ? 'Salvando...' : 'Salvar missões ativas no Supabase'}
        </button>
        <button
          onClick={handleListQuests}
          className="px-3 py-2 bg-white text-green-700 border border-green-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={loading || !userId || !selectedHero}
        >
          {loading ? 'Carregando...' : 'Listar missões do Supabase'}
        </button>
      </div>
      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2 mb-3">Erro: {error}</div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {quests.length === 0 && (
          <div className="text-xs text-gray-500">Nenhuma missão listada ainda.</div>
        )}
        {quests.map((q) => (
          <div key={q.id} className="bg-white p-3 rounded border border-gray-200">
            <div className="text-xs text-gray-500">id: {q.id}</div>
            <div className="text-xs text-gray-500">hero_id: {q.hero_id}</div>
            <div className="text-xs text-gray-500">status: {q.status || '—'}</div>
            <div className="text-sm text-gray-900">título: {String(q?.data?.title || '—')}</div>
            <div className="text-xs text-gray-500">dificuldade: {String(q?.data?.difficulty || '—')}</div>
            <div className="text-xs text-gray-500">nível req: {String(q?.data?.levelRequirement ?? '—')}</div>
          </div>
        ))}
      </div>
      <div className="text-xs text-gray-500 mt-2">Requer tabela `quests` com colunas: id (PK), user_id, hero_id, data (jsonb), status, timestamps.</div>
    </div>
  );
};

export default SupabaseQuestsPanel;

