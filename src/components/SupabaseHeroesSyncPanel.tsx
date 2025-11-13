import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useHeroStore } from '../store/heroStore';
import { saveHero, listHeroesByUser, StoredHero, getStoredHeroVersion, sanitizeStoredHeroData } from '../services/heroesService';

const SupabaseHeroesSyncPanel: React.FC = () => {
  const { getSelectedHero, importHero } = useHeroStore();
  const selectedHero = getSelectedHero();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [heroes, setHeroes] = useState<StoredHero[]>([]);

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

  async function handleSaveSelected() {
    if (!userId || !selectedHero) {
      setError('É necessário estar logado e ter um herói selecionado.');
      return;
    }
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      await saveHero(userId, selectedHero);
      console.log('[SupabaseHeroesSyncPanel] Herói salvo no Supabase');
      setInfo('Herói salvo com sucesso.');
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleListHeroes() {
    if (!userId) {
      setError('Faça login para listar seus heróis.');
      return;
    }
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const list = await listHeroesByUser(userId);
      setHeroes(list);
      console.log('[SupabaseHeroesSyncPanel] Heróis listados do Supabase', list?.length ?? 0);
      setInfo(`Heróis carregados (${list?.length ?? 0}).`);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  function handleImportHero(h: StoredHero) {
    try {
      const sanitized = sanitizeStoredHeroData(h.data);
      const ok = importHero(sanitized, true);
      if (!ok) setError('Falha ao importar herói.');
      if (ok) {
        console.log('[SupabaseHeroesSyncPanel] Herói importado para o jogo', h.id);
        setInfo('Herói importado com sucesso.');
      }
    } catch (err: any) {
      setError(err?.message || String(err));
    }
  }

  function handleImportAll() {
    try {
      heroes.forEach(h => {
        const sanitized = sanitizeStoredHeroData(h.data);
        importHero(sanitized, false);
      });
      console.log('[SupabaseHeroesSyncPanel] Todos os heróis importados para o jogo');
      setInfo('Todos os heróis importados.');
    } catch (err: any) {
      setError(err?.message || String(err));
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">🗃️ Supabase Heroes Sync</h2>
      <div className="text-sm text-gray-700 mb-2">Usuário: {email ? `${email} (id: ${userId})` : '—'}</div>
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={handleSaveSelected}
          className="px-3 py-2 bg-white text-blue-700 border border-blue-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={loading || !selectedHero || !userId}
          title={!userId ? 'Faça login para salvar' : !selectedHero ? 'Selecione um herói' : ''}
        >
          {loading ? 'Salvando...' : 'Salvar herói selecionado no Supabase'}
        </button>
        <button
          onClick={handleListHeroes}
          className="px-3 py-2 bg-white text-green-700 border border-green-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={loading || !userId}
          title={!userId ? 'Faça login para listar' : ''}
        >
          {loading ? 'Carregando...' : 'Listar heróis do Supabase'}
        </button>
        <button
          onClick={handleImportAll}
          className="px-3 py-2 bg-white text-amber-700 border border-amber-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={loading || heroes.length === 0}
          title={heroes.length === 0 ? 'Liste heróis para importar' : ''}
        >
          Importar todos para o jogo
        </button>
      </div>
      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2 mb-3">Erro: {error}</div>
      )}
      {info && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2 mb-3">{info}</div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {heroes.length === 0 && (
          <div className="text-xs text-gray-500">Nenhum herói listado ainda.</div>
        )}
        {heroes.map((h) => (
          <div key={h.id} className="bg-white p-3 rounded border border-gray-200">
            <div className="text-xs text-gray-500">id: {h.id}</div>
            <div className="text-xs text-gray-500">user_id: {h.user_id}</div>
            <div className="text-xs text-gray-500">versão: {String(getStoredHeroVersion(h.data))}</div>
            <div className="text-sm text-gray-900">nome: {String(h?.data?.name || '—')}</div>
            <div className="text-xs text-gray-500">classe: {String(h?.data?.class || '—')}</div>
            <div className="text-xs text-gray-500">nível: {String(h?.data?.progression?.level ?? h?.data?.level ?? '—')}</div>
            <div className="mt-2">
              <button
                onClick={() => handleImportHero(h)}
                className="px-3 py-1 bg-white text-amber-700 border border-amber-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Importar este herói
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="text-xs text-gray-500 mt-2">Requer tabela `heroes` com colunas: id (PK), user_id, data (jsonb), timestamps.</div>
    </div>
  );
};

export default SupabaseHeroesSyncPanel;
