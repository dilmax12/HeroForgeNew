import React, { useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabaseClient';
import SupabaseAuthPanel from './SupabaseAuthPanel';
import { useHeroStore } from '../store/heroStore';
import type { HeroCreationData, Quest } from '../types/hero';
import { ensurePlayerProfile } from '../services/playersService';
import { saveHero } from '../services/heroesService';
import { saveQuest } from '../services/questsService';
import { SHOP_ITEMS } from '../utils/shop';

const PlayerRegistration: React.FC = () => {
  const { createHero, addItemToInventory, getSelectedHero, selectHero } = useHeroStore();
  const selectedHero = getSelectedHero();

  const [sbUserId, setSbUserId] = useState<string | null>(null);
  const [sbEmail, setSbEmail] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [heroName, setHeroName] = useState('');
  const [heroRace, setHeroRace] = useState<'humano'|'elfo'|'anao'|'orc'|'halfling'>('humano');
  const [heroClass, setHeroClass] = useState<'guerreiro'|'mago'|'ladino'|'clerigo'|'patrulheiro'|'paladino'|'arqueiro'>('guerreiro');
  const [missionTitle, setMissionTitle] = useState('');
  const [missionDescription, setMissionDescription] = useState('');
  const [initialItems, setInitialItems] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadUser() {
      try {
        const { data } = await supabase.auth.getUser();
        if (!mounted) return;
        const u = data?.user || null;
        setSbUserId(u?.id || null);
        setSbEmail(u?.email || null);
      } catch {}
    }
    loadUser();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSbUserId(session?.user?.id || null);
      setSbEmail(session?.user?.email || null);
    });
    return () => { mounted = false; sub?.subscription.unsubscribe(); };
  }, []);

  const availableItems = useMemo(() => SHOP_ITEMS.map(i => ({ id: i.id, name: i.name })), []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      // Valida sessão do Supabase
      if (!sbUserId) {
        setError('Você precisa estar logado no Supabase para salvar seus dados.');
        return;
      }

      // Garante o perfil do jogador
      await ensurePlayerProfile(sbUserId, username || null);

      // Cria herói localmente usando o store (preenche o objeto completo)
      const creationData: HeroCreationData = {
        name: heroName || 'Herói Anônimo',
        race: heroRace,
        class: heroClass,
        alignment: 'neutro-puro',
        background: 'folk-hero',
        attributes: {
          forca: 3, destreza: 3, constituicao: 3, inteligencia: 3, sabedoria: 3, carisma: 3
        },
        element: 'physical',
        skills: [],
        shortBio: 'Criado via cadastro básico'
      };
      const hero = createHero(creationData);
      selectHero(hero.id);

      // Adiciona itens iniciais ao inventário local
      initialItems.forEach(itemId => addItemToInventory(hero.id, itemId, 1));

      // Persiste herói no Supabase
      const stored = await saveHero(sbUserId, hero);
      if (!stored) {
        setError('Falha ao salvar o herói no Supabase.');
        return;
      }

      // Cria missão simples se preenchida e persiste
      if (missionTitle && missionDescription) {
        const quest: Quest = {
          id: uuidv4(),
          title: missionTitle,
          description: missionDescription,
          type: 'historia',
          difficulty: 'facil',
          levelRequirement: 1,
          rewards: { gold: 10, xp: 20, items: [] },
          repeatable: false,
          narrative: { intro: missionDescription, situation: 'Cadastre sua primeira missão.', outcome: '' }
        };
        await saveQuest(sbUserId, hero.id, quest, 'active');
      }

      setMessage('Cadastro salvo com sucesso! Seu herói, itens e missão foram registrados.');
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">📝 Cadastro Básico de Jogador</h1>
      {!sbUserId && (
        <div className="mb-4">
          <div className="text-sm text-gray-700 mb-2">Faça login para habilitar o salvamento no Supabase.</div>
          <SupabaseAuthPanel />
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Nome de usuário</label>
          <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-white text-gray-900 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="ex: aventureiro123" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Nome do Herói</label>
            <input type="text" value={heroName} onChange={e => setHeroName(e.target.value)} className="w-full bg-white text-gray-900 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="ex: Arion" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Raça</label>
            <select value={heroRace} onChange={e => setHeroRace(e.target.value as any)} className="w-full bg-white text-gray-900 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
              {['humano','elfo','anao','orc','halfling'].map(r => (<option key={r} value={r}>{r}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Classe</label>
            <select value={heroClass} onChange={e => setHeroClass(e.target.value as any)} className="w-full bg-white text-gray-900 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
              {['guerreiro','mago','ladino','clerigo','patrulheiro','paladino','arqueiro'].map(c => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Itens iniciais</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded p-2">
            {availableItems.map(item => (
              <label key={item.id} className="flex items-center gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={initialItems.includes(item.id)}
                  onChange={e => {
                    setInitialItems(prev => e.target.checked ? [...prev, item.id] : prev.filter(i => i !== item.id));
                  }}
                />
                <span className="font-mono text-xs bg-gray-100 border border-gray-200 px-1 rounded">{item.id}</span>
                <span>{item.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Título da missão</label>
            <input type="text" value={missionTitle} onChange={e => setMissionTitle(e.target.value)} className="w-full bg-white text-gray-900 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="ex: Primeiro passo" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Descrição da missão</label>
            <input type="text" value={missionDescription} onChange={e => setMissionDescription(e.target.value)} className="w-full bg-white text-gray-900 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="ex: Fale com o mestre da guilda" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="submit" disabled={saving || !heroName} className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50">Salvar cadastro</button>
          {saving && (<span className="text-sm text-gray-600">Salvando...</span>)}
          {sbEmail && (<span className="text-xs text-gray-500">Logado: {sbEmail}</span>)}
        </div>
      </form>

      {message && (
        <div className="mt-3 p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">{message}</div>
      )}
      {error && (
        <div className="mt-3 p-3 rounded bg-red-50 border border-red-200 text-red-800 text-sm">{error}</div>
      )}
    </div>
  );
};

export default PlayerRegistration;
