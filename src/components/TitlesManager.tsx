import React, { useRef, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useHeroStore } from '../store/heroStore';
import { trackMetric } from '../utils/metricsSystem';
import { Title } from '../types/hero';
import { 
  getTitlesByCategory, 
  getTitlesByRarity, 
  getActiveTitle, 
  formatTitleDisplay,
  getRarityColor,
  getRarityBg
} from '../utils/titles';
import { getTitleAttributeBonus, AVAILABLE_TITLES } from '../utils/titles';
import { generateDynamicTitleForHero } from '../services/titleAIService';

const TitlesManager: React.FC = () => {
  const { getSelectedHero, setActiveTitle, addTitleToSelectedHero, toggleFavoriteTitle } = useHeroStore();
  const selectedHero = getSelectedHero();
  const [selectedCategory, setSelectedCategory] = useState<'all' | Title['category']>('all');
  const [selectedRarity, setSelectedRarity] = useState<'all' | Title['rarity']>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showNewOnly, setShowNewOnly] = useState(false);
  const [sortMode, setSortMode] = useState<'name' | 'rarity' | 'recent' | 'favoritesFirst'>('favoritesFirst');
  const [suggestedTitleId, setSuggestedTitleId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [celebration, setCelebration] = useState<string | null>(null);
  const [celebrationTitle, setCelebrationTitle] = useState<Title | null>(null);
  const prevTitlesRef = useRef<string[]>(selectedHero?.titles?.map(t => t.id) || []);
  const location = useLocation();
  useEffect(() => {
    try {
      const p = new URLSearchParams(location.search);
      const q = p.get('q') || '';
      const fav = p.get('fav');
      const cat = p.get('category') as any;
      const rar = p.get('rarity') as any;
      const sort = p.get('sort') as any;
      const nw = p.get('new');
      if (q) setSearchTerm(q);
      if (fav) setShowFavoritesOnly(fav === '1');
      if (nw) setShowNewOnly(nw === '1');
      if (cat) setSelectedCategory(cat);
      if (rar) setSelectedRarity(rar);
      if (sort) setSortMode(sort);
    } catch {}
  }, [location.search]);

  if (!selectedHero) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-amber-400 mb-4">Selecione um Herói</h2>
        <p className="text-gray-300">Você precisa selecionar um herói para gerenciar títulos.</p>
      </div>
    );
  }

  const activeTitle = getActiveTitle(selectedHero);

  // Filtrar títulos
  let filteredTitles = selectedHero.titles;

  if (selectedCategory !== 'all') {
    filteredTitles = getTitlesByCategory(filteredTitles, selectedCategory);
  }

  if (selectedRarity !== 'all') {
    filteredTitles = getTitlesByRarity(filteredTitles, selectedRarity);
  }

  if (searchTerm) {
    filteredTitles = filteredTitles.filter(title =>
      title.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      title.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  if (showFavoritesOnly) {
    filteredTitles = filteredTitles.filter(t => t.favorite);
  }
  if (showNewOnly) {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    filteredTitles = filteredTitles.filter(t => new Date(t.unlockedAt).getTime() >= cutoff);
  }

  const rarityRank: Record<Title['rarity'], number> = {
    comum: 1,
    raro: 2,
    epico: 3,
    lendario: 4,
    especial: 5
  } as const;

  filteredTitles = [...filteredTitles].sort((a, b) => {
    switch (sortMode) {
      case 'name':
        return a.name.localeCompare(b.name, 'pt-BR');
      case 'rarity':
        return (rarityRank[b.rarity] - rarityRank[a.rarity]) || a.name.localeCompare(b.name, 'pt-BR');
      case 'recent':
        return new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime();
      case 'favoritesFirst':
      default:
        return (Number(!!b.favorite) - Number(!!a.favorite))
          || (rarityRank[b.rarity] - rarityRank[a.rarity])
          || a.name.localeCompare(b.name, 'pt-BR');
    }
  });

  

  const suggestBestTitle = () => {
    let bestId: string | null = null;
    let bestScore = -Infinity;
    selectedHero.titles.forEach(t => {
      const bonus = getTitleAttributeBonus(t.id);
      const bonusSum = Object.values(bonus).reduce((acc, v) => acc + (typeof v === 'number' ? v : 0), 0);
      const recentBoost = Date.now() - new Date(t.unlockedAt).getTime() < 24 * 60 * 60 * 1000 ? 1 : 0;
      const score = ((rarityRank as any)[t.rarity] || 0) * 10 + bonusSum * 2 + recentBoost;
      if (score > bestScore) {
        bestScore = score;
        bestId = t.id;
      }
    });
    if (bestId) {
      setSuggestedTitleId(bestId);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      const t = selectedHero.titles.find(x => x.id === bestId);
      setToastMessage(t ? `Sugestão: ${t.name}` : 'Sugestão disponível');
      toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 2000);
      try { trackMetric.featureUsed(selectedHero.id, 'titles-suggest-best'); } catch {}
    }
  };

  const equipSuggested = () => {
    if (!suggestedTitleId) return;
    setActiveTitle(suggestedTitleId);
    const t = selectedHero.titles.find(x => x.id === suggestedTitleId);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToastMessage(t ? `Equipado: ${t.name}` : 'Sugestão equipada');
    toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 2000);
    try { trackMetric.featureUsed(selectedHero.id, 'titles-equip-suggestion'); } catch {}
  };

  React.useEffect(() => {
    const currentIds = selectedHero.titles.map(t => t.id);
    const prevIds = prevTitlesRef.current;
    const added = currentIds.filter(id => !prevIds.includes(id));
    if (added.length) {
      const addedTitle = selectedHero.titles.find(t => t.id === added[0]);
      if (addedTitle) {
        if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
        setToastMessage(`Novo título desbloqueado: ${addedTitle.name}`);
        if (addedTitle.rarity === 'epico' || addedTitle.rarity === 'lendario') {
          setCelebration('✨');
          setCelebrationTitle(addedTitle);
        }
        toastTimerRef.current = window.setTimeout(() => {
          setToastMessage(null);
          setCelebration(null);
          setCelebrationTitle(null);
        }, 2500);
      }
    }
    prevTitlesRef.current = currentIds;
  }, [selectedHero.titles.length]);

  const handleSetActiveTitle = (titleId: string) => {
    setActiveTitle(titleId);
    const t = selectedHero.titles.find(t => t.id === titleId);
    const msg = t ? `Título equipado: ${t.name}` : 'Título equipado';
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 2000);
    try { trackMetric.featureUsed(selectedHero.id, 'titles-equip'); } catch {}
  };

  const handleRemoveActiveTitle = () => {
    setActiveTitle(undefined);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToastMessage('Título removido');
    toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 2000);
    try { trackMetric.featureUsed(selectedHero.id, 'titles-remove'); } catch {}
  };

  const handleGenerateAITitle = async () => {
    if (!selectedHero || generating) return;
    try {
      setGenerating(true);
      const newTitle = await generateDynamicTitleForHero(selectedHero);
      addTitleToSelectedHero(newTitle, true);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      setToastMessage(`Título gerado: ${newTitle.name}`);
      toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 2500);
      try { trackMetric.featureUsed(selectedHero.id, 'titles-generate-ai'); } catch {}
    } catch (err) {
      console.error('Falha ao gerar título por IA:', err);
      alert('Não foi possível gerar um título por IA agora. Tente novamente em instantes.');
    } finally {
      setGenerating(false);
    }
  };

  const getCategoryIcon = (category: Title['category']) => {
    switch (category) {
      case 'combat': return '⚔️';
      case 'exploration': return '🗺️';
      case 'social': return '👥';
      case 'achievement': return '🏆';
      case 'special': return '⭐';
      default: return '📜';
    }
  };

  const getCategoryName = (category: Title['category']) => {
    switch (category) {
      case 'combat': return 'Combate';
      case 'exploration': return 'Exploração';
      case 'social': return 'Social';
      case 'achievement': return 'Conquistas';
      case 'special': return 'Especial';
      default: return 'Outros';
    }
  };

  const getRarityName = (rarity: Title['rarity']) => {
    switch (rarity) {
      case 'comum': return 'Comum';
      case 'raro': return 'Raro';
      case 'epico': return 'Épico';
      case 'lendario': return 'Lendário';
      case 'especial': return 'Especial';
      default: return 'Desconhecido';
    }
  };

  return (
    <div className="container mx-auto p-6">
      {toastMessage && (
        <div className="fixed right-6 top-6 z-50 bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-md shadow">
          {toastMessage}
        </div>
      )}
      {celebration && celebrationTitle && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="pointer-events-auto bg-gray-900/90 border border-amber-600 text-white px-6 py-4 rounded-xl shadow-xl">
            <div className="text-5xl text-amber-400 text-center">{celebration}</div>
            <div className="mt-2 text-center text-xl">
              <span className="mr-2 text-3xl">{celebrationTitle.badge}</span>
              <span>{celebrationTitle.name}</span>
            </div>
            <div className="mt-3 text-center">
              <button
                onClick={() => {
                  const shareText = `${formatTitleDisplay(selectedHero)} — novo título conquistado!`;
                  const shareUrl = `${window.location.origin}/hero/${selectedHero.id}`;
                  if ((navigator as any).share) {
                    (navigator as any).share({ title: 'HeroForge', text: shareText, url: shareUrl }).catch(() => {
                      try { navigator.clipboard?.writeText(shareUrl); } catch {}
                    });
                  } else {
                    try { navigator.clipboard?.writeText(shareUrl); } catch {}
                    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
                    setToastMessage('Link copiado para compartilhar');
                    toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 2000);
                  }
                  try { trackMetric.featureUsed(selectedHero.id, 'titles-share-celebration'); } catch {}
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-md font-medium"
              >
                Compartilhar
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-bold text-amber-400">Gerenciar Títulos</h2>
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={suggestBestTitle}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm"
              title="Sugerir melhor título"
            >
              Sugerir Melhor
            </button>
            <button
              onClick={equipSuggested}
              disabled={!suggestedTitleId}
              className={`px-3 py-2 rounded-md text-sm ${suggestedTitleId ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-700 cursor-not-allowed'}`}
              title="Equipar sugestão"
            >
              Equipar Sugestão
            </button>
            <button
              onClick={() => {
                const entries = selectedHero.titles.map(t => ({ id: t.id, favorite: !!t.favorite }));
                const json = JSON.stringify(entries);
                try { navigator.clipboard?.writeText(json); } catch {}
                if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
                setToastMessage('Títulos (com favoritos) exportados');
                toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 2000);
                try { trackMetric.featureUsed(selectedHero.id, 'titles-export-favorites'); } catch {}
              }}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm"
              title="Exportar títulos"
            >
              Exportar
            </button>
            <button
              onClick={() => {
                const input = window.prompt('Cole o JSON com IDs de títulos');
                if (!input) return;
                try {
                  const ids = JSON.parse(input);
                  if (Array.isArray(ids)) {
                    ids.forEach((entry: any) => {
                      const id = typeof entry === 'string' ? entry : entry?.id;
                      const fav = typeof entry === 'object' ? !!entry?.favorite : false;
                      if (!id) return;
                      const tpl = AVAILABLE_TITLES.find(t => t.id === id);
                      if (tpl) {
                        addTitleToSelectedHero({ ...tpl, unlockedAt: new Date() }, false);
                        if (fav) toggleFavoriteTitle(id, true);
                      }
                    });
                    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
                    setToastMessage('Títulos importados');
                    toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 2000);
                    try { trackMetric.featureUsed(selectedHero.id, 'titles-import-favorites'); } catch {}
                  }
                } catch {}
              }}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm"
              title="Importar títulos"
            >
              Importar
            </button>
          </div>
        </div>
        
        {/* Título Ativo */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
          <h3 className="text-xl font-bold text-white mb-4">Título Ativo</h3>
          {activeTitle ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-4xl">{activeTitle.badge}</span>
                <div>
                  <h4 className={`text-lg font-bold ${getRarityColor(activeTitle.rarity)}`}>
                    {activeTitle.name}
                  </h4>
                  <p className="text-gray-300 text-sm">{activeTitle.description}</p>
                  <p className="text-amber-400 text-sm mt-1">
                    Como será exibido: {formatTitleDisplay(selectedHero)}
                  </p>
                  {(() => {
                    const medal = (selectedHero.stats as any)?.profileMedal;
                    const valid = medal?.expiresAt ? Date.now() < new Date(medal.expiresAt).getTime() : false;
                    if (!valid) return null;
                    return (
                      <div className="mt-2 text-xs text-amber-300 flex items-center gap-2">
                        <span>Medalha ativa:</span>
                        <span className="flex items-center gap-1">{medal.icon} {medal.name}</span>
                        <span className="text-gray-400">expira {new Date(medal.expiresAt).toLocaleDateString()}</span>
                      </div>
                    );
                  })()}
                  {/* Bônus passivos */}
                  {(() => {
                    const bonus = getTitleAttributeBonus(activeTitle.id);
                    const entries = Object.entries(bonus).filter(([, v]) => typeof v === 'number' && v !== 0);
                    if (!entries.length) return null;
                    return (
                      <div className="mt-2 text-xs text-gray-300">
                        <span className="font-semibold">Bônus passivo:</span>{' '}
                        {entries.map(([attr, val], idx) => (
                          <span key={attr}>
                            {attr} +{val}{idx < entries.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </div>
                    );
                  })()}

                  {activeTitle && suggestedTitleId && (() => {
                    const suggested = selectedHero.titles.find(t => t.id === suggestedTitleId);
                    if (!suggested) return null;
                    const a = getTitleAttributeBonus(activeTitle.id);
                    const b = getTitleAttributeBonus(suggested.id);
                    const keys = Array.from(new Set([ ...Object.keys(a), ...Object.keys(b) ]));
                    const rows = keys.map(k => ({ k, av: Number((a as any)[k]||0), bv: Number((b as any)[k]||0), dv: Number((b as any)[k]||0) - Number((a as any)[k]||0) }));
                    return (
                      <div className="mt-3 text-xs">
                        <div className="font-semibold text-white mb-1">Comparação com Sugestão</div>
                        <div className="grid grid-cols-3 gap-2 text-gray-300">
                          <div className="font-medium">Atributo</div>
                          <div className="font-medium">Ativo</div>
                          <div className="font-medium">Sugestão</div>
                          {rows.map(r => (
                            <React.Fragment key={r.k}>
                              <div>{r.k}</div>
                              <div className="text-gray-200">{r.av >= 0 ? `+${r.av}` : `${r.av}`}</div>
                              <div className={r.dv > 0 ? 'text-green-400' : r.dv < 0 ? 'text-red-400' : 'text-gray-200'}>
                                {r.bv >= 0 ? `+${r.bv}` : `${r.bv}`} {r.dv !== 0 && <span className="ml-1">({r.dv>0?'+':''}{r.dv})</span>}
                              </div>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
              <button
                onClick={handleRemoveActiveTitle}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md font-medium transition-colors"
              >
                Remover Título
              </button>
              <button
                onClick={() => {
                  try {
                    const text = formatTitleDisplay(selectedHero);
                    navigator.clipboard?.writeText(text);
                    alert('Exibição copiada para a área de transferência');
                  } catch {
                    alert('Não foi possível copiar automaticamente. Copie manualmente: ' + formatTitleDisplay(selectedHero));
                  }
                }}
                className="ml-3 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md font-medium transition-colors"
                title="Copiar exibição"
              >
                Copiar Exibição
              </button>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">Nenhum título ativo</p>
              <p className="text-sm text-gray-500">
                Selecione um título abaixo para exibi-lo em seu perfil
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
        <h3 className="text-lg font-bold text-white mb-4">Filtros</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Busca */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Buscar Título
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nome ou descrição..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Categoria
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Todas as Categorias</option>
              <option value="combat">⚔️ Combate</option>
              <option value="exploration">🗺️ Exploração</option>
              <option value="social">👥 Social</option>
              <option value="achievement">🏆 Conquistas</option>
              <option value="special">⭐ Especial</option>
            </select>
          </div>

          {/* Raridade */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Raridade
            </label>
            <select
              value={selectedRarity}
              onChange={(e) => setSelectedRarity(e.target.value as any)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Todas as Raridades</option>
              <option value="comum">Comum</option>
              <option value="raro">Raro</option>
              <option value="epico">Épico</option>
              <option value="lendario">Lendário</option>
              <option value="especial">Especial</option>
            </select>
          </div>

          {/* Ordenação */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Ordenar por
            </label>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as any)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="favoritesFirst">Favoritos primeiro</option>
              <option value="rarity">Raridade</option>
              <option value="recent">Mais recentes</option>
              <option value="name">Nome (A–Z)</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center space-x-3">
          <input
            id="favOnly"
            type="checkbox"
            checked={showFavoritesOnly}
            onChange={(e) => setShowFavoritesOnly(e.target.checked)}
            className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-600 rounded"
          />
          <label htmlFor="favOnly" className="text-sm text-gray-300">Mostrar apenas favoritos</label>
          <input
            id="newOnly"
            type="checkbox"
            checked={showNewOnly}
            onChange={(e) => setShowNewOnly(e.target.checked)}
            className="ml-4 h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-600 rounded"
          />
          <label htmlFor="newOnly" className="text-sm text-gray-300">Apenas novos (24h)</label>
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSelectedRarity('all');
              setSearchTerm('');
              setShowFavoritesOnly(false);
              setShowNewOnly(false);
              setSortMode('favoritesFirst');
            }}
            className="ml-4 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm"
            title="Limpar filtros"
          >
            Limpar filtros
          </button>
        </div>
      </div>

      {/* Top 3 Títulos (ranking por pontuação) */}
      {selectedHero.titles.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-white">Top 3 Títulos</h3>
            <button
              onClick={() => {
                const items = [...selectedHero.titles]
                  .map(t => {
                    const bonus = getTitleAttributeBonus(t.id);
                    const bonusSum = Object.values(bonus).reduce((acc, v) => acc + (typeof v === 'number' ? v : 0), 0);
                    const recentBoost = Date.now() - new Date(t.unlockedAt).getTime() < 24 * 60 * 60 * 1000 ? 1 : 0;
                    const score = (rarityRank[t.rarity] || 0) * 10 + bonusSum * 2 + recentBoost;
                    return { id: t.id, score };
                  })
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 3);
                items.forEach(i => toggleFavoriteTitle(i.id, true));
                if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
                setToastMessage('Favoritos atualizados com Top 3');
                toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 2000);
                try { trackMetric.featureUsed(selectedHero.id, 'titles-favorite-top3'); } catch {}
              }}
              className="px-3 py-2 bg-amber-600 hover:bg-amber-700 rounded-md text-sm"
            >
              Favoritar Top 3
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...selectedHero.titles]
              .map(t => {
                const bonus = getTitleAttributeBonus(t.id);
                const bonusSum = Object.values(bonus).reduce((acc, v) => acc + (typeof v === 'number' ? v : 0), 0);
                const recentBoost = Date.now() - new Date(t.unlockedAt).getTime() < 24 * 60 * 60 * 1000 ? 1 : 0;
                const score = (rarityRank[t.rarity] || 0) * 10 + bonusSum * 2 + recentBoost;
                return { t, score };
              })
              .sort((a, b) => b.score - a.score)
              .slice(0, 3)
              .map(({ t, score }) => (
                <div key={t.id} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`text-sm font-bold ${getRarityColor(t.rarity)}`}>{t.name}</div>
                      <div className="text-xs text-gray-400">Pontuação: {score}</div>
                    </div>
                    <div className="text-2xl">{t.badge}</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Lista de Títulos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTitles.map(title => (
          <div 
            key={title.id} 
            className={`bg-gray-800 rounded-lg p-6 border transition-all hover:border-amber-500 ${
              activeTitle?.id === title.id ? 'border-amber-500 bg-amber-900/10 animate-pulse' : 'border-gray-700'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{title.badge}</span>
                <div>
                  <h4 className={`text-lg font-bold ${getRarityColor(title.rarity)}`}>
                    {title.name}
                  </h4>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${getRarityColor(title.rarity)} ${getRarityBg(title.rarity)}`}>
                      {getRarityName(title.rarity)}
                    </span>
                    {suggestedTitleId === title.id && (
                      <span className="px-2 py-1 rounded-md text-xs font-medium bg-green-900/20 text-green-400">
                        Sugestão
                      </span>
                    )}
                    {Date.now() - new Date(title.unlockedAt).getTime() < 24 * 60 * 60 * 1000 && (
                      <span className="px-2 py-1 rounded-md text-xs font-medium bg-amber-900/20 text-amber-400">
                        Novo
                      </span>
                    )}
                    <span className="text-gray-400 text-xs flex items-center space-x-1">
                      <span>{getCategoryIcon(title.category)}</span>
                      <span>{getCategoryName(title.category)}</span>
                    </span>
                    {(() => {
                      const bonus = getTitleAttributeBonus(title.id);
                      const entries = Object.entries(bonus).filter(([, v]) => typeof v === 'number' && v !== 0).slice(0, 3);
                      if (!entries.length) return null;
                      return (
                        <span className="text-gray-300 text-xs">
                          {entries.map(([attr, val], idx) => (
                            <span key={attr} className="ml-1 px-1.5 py-0.5 bg-gray-700 rounded">
                              {attr} +{val}
                            </span>
                          ))}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
              <button
                onClick={() => toggleFavoriteTitle(title.id)}
                className={`ml-2 px-2 py-1 rounded-md text-xs font-medium ${title.favorite ? 'bg-amber-600 hover:bg-amber-700 text-black' : 'bg-gray-700 hover:bg-gray-600 text-white'} transition-colors`}
                title={title.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              >
                {title.favorite ? '★ Favorito' : '☆ Favoritar'}
              </button>
            </div>

            <p className="text-gray-300 text-sm mb-4">{title.description}</p>

            <div className="text-xs text-gray-400 mb-4">
              Desbloqueado em: {new Date(title.unlockedAt).toLocaleDateString('pt-BR')}
            </div>

            <div className="flex justify-end">
              {activeTitle?.id === title.id ? (
                <span className="px-4 py-2 bg-amber-600 rounded-md font-medium text-sm">
                  ✓ Ativo
                </span>
              ) : (
                <button
                  onClick={() => handleSetActiveTitle(title.id)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-medium text-sm transition-colors"
                >
                  Equipar Título
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredTitles.length === 0 && (
        <div className="text-center p-8">
          <p className="text-gray-400 mb-4">
            {selectedHero.titles.length === 0 
              ? 'Você ainda não possui títulos desbloqueados.'
              : 'Nenhum título encontrado com os filtros aplicados.'
            }
          </p>
          {selectedHero.titles.length === 0 && (
            <p className="text-sm text-gray-500">
              Complete conquistas e missões para desbloquear títulos!
            </p>
          )}
        </div>
      )}

      {/* Estatísticas */}
      <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-bold text-white mb-4">Estatísticas de Títulos</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-amber-400">{selectedHero.titles.length}</div>
            <div className="text-sm text-gray-400">Total</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-400">
              {getTitlesByRarity(selectedHero.titles, 'comum').length}
            </div>
            <div className="text-sm text-gray-400">Comuns</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-400">
              {getTitlesByRarity(selectedHero.titles, 'raro').length}
            </div>
            <div className="text-sm text-gray-400">Raros</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-400">
              {getTitlesByRarity(selectedHero.titles, 'epico').length}
            </div>
            <div className="text-sm text-gray-400">Épicos</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-400">
              {getTitlesByRarity(selectedHero.titles, 'lendario').length}
            </div>
            <div className="text-sm text-gray-400">Lendários</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TitlesManager;
