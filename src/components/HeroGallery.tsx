import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Hero, HeroClass, Element } from '../types/hero';
import { HeroGalleryCard } from './HeroGalleryCard';
import { useHeroStore } from '../store/heroStore';
import { Search, Filter, Grid, List, Plus, ArrowUpDown, Trash2 } from 'lucide-react';
const GalleryLightbox = React.lazy(() => import('./GalleryLightbox'));
import { getUsed as getSlotsUsed, getCapacity as getSlotsCapacity, getNextSlotPrice } from '../services/heroSlots';

interface HeroGalleryProps {
  onCreateHero?: () => void;
  onHeroSelect?: (hero: Hero) => void;
  onHeroEdit?: (hero: Hero) => void;
  onHeroImageChange?: (hero: Hero) => void;
  showCreateButton?: boolean;
  cardSize?: 'small' | 'medium' | 'large';
  viewMode?: 'grid' | 'list';
}

export const HeroGallery: React.FC<HeroGalleryProps> = ({
  onCreateHero,
  onHeroSelect,
  onHeroEdit,
  onHeroImageChange,
  showCreateButton = true,
  cardSize = 'medium',
  viewMode: initialViewMode = 'grid'
}) => {
  const heroes = useHeroStore(s => s.heroes);
  const createHero = useHeroStore(s => s.createHero);
  const deleteHero = useHeroStore(s => s.deleteHero);
  const getSelectedHero = useHeroStore(s => s.getSelectedHero);
  const purchaseHeroSlotForSelected = useHeroStore(s => s.purchaseHeroSlotForSelected);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState<HeroClass | 'all'>('all');
  const [selectedElement, setSelectedElement] = useState<Element | 'all'>('all');
  const [selectedRace, setSelectedRace] = useState<string | 'all'>('all');
  const [viewMode, setViewMode] = useState(initialViewMode);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'level' | 'rank' | 'createdAt' | 'xp' | 'gold'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  
  const prefetchRef = useRef<number>(0);
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const nonNpcHeroes = useMemo(() => heroes.filter((h: any) => h.origin !== 'npc'), [heroes]);
  const slotsUsed = useMemo(() => getSlotsUsed(nonNpcHeroes), [nonNpcHeroes]);
  const slotsCap = useMemo(() => getSlotsCapacity(nonNpcHeroes), [nonNpcHeroes]);
  const canCreate = slotsUsed < slotsCap;
  const nextPrice = useMemo(() => getNextSlotPrice(), [heroes]);
  const uniqueRaces = useMemo(() => Array.from(new Set(heroes.map(h => h.race))).sort(), [heroes]);

  // Filtrar heróis baseado nos critérios
  const filteredHeroes = useMemo(() => {
    return heroes.filter(hero => {
      if (hero.origin === 'npc') return false;
      const q = debouncedSearch.toLowerCase();
      const matchesSearch = hero.name.toLowerCase().includes(q) ||
                           hero.class.toLowerCase().includes(q) ||
                           hero.race.toLowerCase().includes(q);
      
      const matchesClass = selectedClass === 'all' || hero.class === selectedClass;
      const matchesElement = selectedElement === 'all' || hero.element === selectedElement;
      const matchesRace = selectedRace === 'all' || hero.race === selectedRace;

      return matchesSearch && matchesClass && matchesElement && matchesRace;
    });
  }, [heroes, debouncedSearch, selectedClass, selectedElement, selectedRace]);

  const sortedHeroes = useMemo(() => {
    const list = [...filteredHeroes];
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'level':
          cmp = (a.progression?.level || 0) - (b.progression?.level || 0);
          break;
        case 'rank':
          cmp = (a.progression?.rank || 'F').localeCompare(b.progression?.rank || 'F');
          break;
        case 'createdAt':
          cmp = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
          break;
        case 'xp':
          cmp = (a.progression?.xp || 0) - (b.progression?.xp || 0);
          break;
        case 'gold':
          cmp = (a.progression?.gold || 0) - (b.progression?.gold || 0);
          break;
        default:
          cmp = 0;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filteredHeroes, sortBy, sortOrder]);

  

  
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchTerm), 200);
    return () => clearTimeout(id);
  }, [searchTerm]);

  useEffect(() => {
    try {
      const qs = Object.fromEntries(searchParams);
      const getStr = (k: string) => (typeof qs[k] === 'string' ? qs[k] : undefined);
      const vm = getStr('vm'); if (vm) setViewMode(vm as any);
      const sb = getStr('sb'); if (sb) setSortBy(sb as any);
      const so = getStr('so'); if (so) setSortOrder(so as any);
      const sc = getStr('sc'); if (sc) setSelectedClass(sc as any);
      const se = getStr('se'); if (se) setSelectedElement(se as any);
      const sr = getStr('sr'); if (sr) setSelectedRace(sr as any);
      const q = getStr('q'); if (q) setSearchTerm(q);
      if (!vm && !sb && !so && !sc && !se && !sr && !q) {
        const raw = localStorage.getItem('gallery_prefs');
        if (raw) {
          const p = JSON.parse(raw);
          if (p && typeof p === 'object') {
            if (typeof p.viewMode === 'string') setViewMode(p.viewMode);
            if (typeof p.sortBy === 'string') setSortBy(p.sortBy);
            if (typeof p.sortOrder === 'string') setSortOrder(p.sortOrder);
            if (typeof p.selectedClass === 'string') setSelectedClass(p.selectedClass);
            if (typeof p.selectedElement === 'string') setSelectedElement(p.selectedElement);
            if (typeof p.selectedRace === 'string') setSelectedRace(p.selectedRace);
            if (typeof p.searchTerm === 'string') setSearchTerm(p.searchTerm);
          }
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const p = { viewMode, sortBy, sortOrder, selectedClass, selectedElement, selectedRace, searchTerm };
      localStorage.setItem('gallery_prefs', JSON.stringify(p));
    } catch {}
  }, [viewMode, sortBy, sortOrder, selectedClass, selectedElement, selectedRace, searchTerm]);

  useEffect(() => {
    try {
      const params: Record<string, string> = {};
      params.vm = String(viewMode);
      params.sb = String(sortBy);
      params.so = String(sortOrder);
      if (selectedClass !== 'all') params.sc = String(selectedClass);
      if (selectedElement !== 'all') params.se = String(selectedElement);
      if (selectedRace !== 'all') params.sr = String(selectedRace);
      if (searchTerm) params.q = String(searchTerm);
      setSearchParams(params, { replace: true });
    } catch {}
  }, [viewMode, sortBy, sortOrder, selectedClass, selectedElement, selectedRace, searchTerm]);

  useEffect(() => {
    const start = prefetchRef.current;
    const end = Math.min(sortedHeroes.length, start + 24);
    for (let i = start; i < end; i++) {
      const h = sortedHeroes[i];
      if (!h?.image) continue;
      try {
        const raw = h.image;
        const url = raw.includes('image.pollinations.ai/prompt/')
          ? raw.replace('https://image.pollinations.ai/prompt/', '/api/pollinations-image?prompt=').replace('?n=1&','&')
          : raw;
        const img = new Image();
        img.loading = 'lazy';
        img.decoding = 'async';
        img.src = url;
      } catch {}
    }
    prefetchRef.current = end;
  }, [sortedHeroes]);

  const handleHeroClick = useCallback((hero: Hero) => {
    const idx = sortedHeroes.findIndex(h => h.id === hero.id);
    setLightboxIndex(idx >= 0 ? idx : null);
    onHeroSelect?.(hero);
  }, [sortedHeroes, onHeroSelect]);

  

  const handleRemoveSelected = useCallback(() => {
    const sel = getSelectedHero?.();
    if (sel) deleteHero(sel.id);
  }, [getSelectedHero, deleteHero]);

  const gridClasses = {
    small: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
    medium: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
    large: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
  };

  const moveFocus = (delta: number) => {
    try {
      const nodes = Array.from(document.querySelectorAll('[data-hero-card="1"]')) as HTMLElement[];
      if (!nodes.length) return;
      const active = document.activeElement as HTMLElement | null;
      let idx = nodes.findIndex(n => n === active);
      if (idx === -1) idx = 0;
      const next = Math.max(0, Math.min(nodes.length - 1, idx + delta));
      nodes[next]?.focus();
    } catch {}
  };

    const onGridKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); moveFocus(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); moveFocus(-1); }
    else if (e.key === 'Enter') { const el = document.activeElement as HTMLElement | null; el?.click(); }
    else if (e.key === 'Escape') { setLightboxIndex(null); }
    else if (e.key.toLowerCase() === 'f') { setShowFilters(s => !s); }
    else if (e.key.toLowerCase() === 'v') { setViewMode(m => m === 'grid' ? 'list' : 'grid'); }
    else if (e.key === 'Home') { e.preventDefault(); moveFocus(-9999); }
    else if (e.key === 'End') { e.preventDefault(); moveFocus(9999); }
    else if (e.key === 'PageDown') { window.scrollBy?.({ top: window.innerHeight, behavior: 'smooth' } as any); }
    else if (e.key === 'PageUp') { window.scrollBy?.({ top: -window.innerHeight, behavior: 'smooth' } as any); }
  };

  return (
    <div className="w-full space-y-6">
      {/* Cabeçalho com Controles */}
      <div className="bg-gradient-to-r from-amber-900/20 to-yellow-800/20 backdrop-blur-sm rounded-lg border border-yellow-500/30 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Título e Contador */}
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-yellow-400 font-serif">
              Galeria de Heróis
            </h2>
            <span className="bg-yellow-600/20 text-yellow-300 px-3 py-1 rounded-full text-sm" role="status" aria-live="polite" aria-atomic="true">
              {sortedHeroes.length} {sortedHeroes.length === 1 ? 'herói' : 'heróis'}
            </span>
          </div>

          {/* Controles */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar heróis..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-black/30 border border-yellow-500/30 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 w-40 sm:w-64"
              />
            </div>

            {/* Ordenação */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <ArrowUpDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  aria-label="Ordenar por"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="pl-10 pr-8 py-2 bg-black/30 border border-yellow-500/30 rounded-md text-white focus:outline-none focus:border-yellow-400"
                >
                  <option value="name">Nome</option>
                  <option value="level">Nível</option>
                  <option value="rank">Rank</option>
                  <option value="createdAt">Criado</option>
                  <option value="xp">XP</option>
                  <option value="gold">Ouro</option>
                </select>
              </div>
              <button
                aria-label="Alternar ordem"
                onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                className={`p-2 rounded-md border transition-colors ${sortOrder==='asc'?'bg-black/30 text-yellow-400 hover:bg-yellow-600/20':'bg-yellow-600 text-white'}`}
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>
            </div>

            {/* Botão de Filtros */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-md border transition-colors ${
                showFilters 
                  ? 'bg-yellow-600 border-yellow-500 text-white' 
                  : 'bg-black/30 border-yellow-500/30 text-yellow-400 hover:bg-yellow-600/20'
              }`}
            >
              <Filter className="w-4 h-4" />
            </button>

            {/* Modo de Visualização */}
            <div className="flex border border-yellow-500/30 rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-yellow-600 text-white' 
                    : 'bg-black/30 text-yellow-400 hover:bg-yellow-600/20'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-yellow-600 text-white' 
                    : 'bg-black/30 text-yellow-400 hover:bg-yellow-600/20'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Botão Criar Herói e Slots */}
            {showCreateButton && (
              <button
                onClick={onCreateHero}
                disabled={!canCreate}
                className={`${canCreate?'bg-yellow-600 hover:bg-yellow-500 text-white':'bg-gray-700 text-gray-300 cursor-not-allowed'} px-3 sm:px-4 py-2 rounded-md font-bold transition-colors flex items-center gap-2 text-sm sm:text-base w-full sm:w-auto`}
              >
                <Plus className="w-4 h-4" />
                <span>{canCreate?'Criar Herói':`Slots ${slotsUsed}/${slotsCap}`}</span>
              </button>
            )}
            <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded bg-black/30 border border-yellow-500/30 text-yellow-300 text-xs">Slots {slotsUsed}/{slotsCap}</span>
            <button onClick={() => purchaseHeroSlotForSelected()} className="px-3 py-2 rounded bg-amber-600 hover:bg-amber-700 text-white text-sm">Comprar slot ({nextPrice})</button>
          </div>

            

            
            <button
              onClick={handleRemoveSelected}
              className="bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded-md font-bold transition-colors text-sm flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Remover Selecionado
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="px-2 py-1 rounded bg-gray-700 text-white text-xs">Busca: "{searchTerm}" ✕</button>
          )}
          {selectedClass !== 'all' && (
            <button onClick={() => setSelectedClass('all')} className="px-2 py-1 rounded bg-gray-700 text-white text-xs">Classe: {selectedClass} ✕</button>
          )}
          {selectedElement !== 'all' && (
            <button onClick={() => setSelectedElement('all')} className="px-2 py-1 rounded bg-gray-700 text-white text-xs">Elemento: {selectedElement} ✕</button>
          )}
          {selectedRace !== 'all' && (
            <button onClick={() => setSelectedRace('all')} className="px-2 py-1 rounded bg-gray-700 text-white text-xs">Raça: {selectedRace} ✕</button>
          )}
        </div>

        {/* Filtros Expandidos */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-yellow-500/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Filtro por Classe */}
              <div>
                <label className="block text-sm font-medium text-yellow-300 mb-2">
                  Classe
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value as HeroClass | 'all')}
                  className="w-full bg-black/30 border border-yellow-500/30 rounded-md text-white p-2 focus:outline-none focus:border-yellow-400"
                >
                  <option value="all">Todas as Classes</option>
                  <option value="guerreiro">Guerreiro</option>
                  <option value="mago">Mago</option>
                  <option value="ladino">Ladino</option>
                  <option value="clerigo">Clérigo</option>
                  <option value="patrulheiro">Patrulheiro</option>
                  <option value="paladino">Paladino</option>
                  <option value="arqueiro">Arqueiro</option>
                </select>
              </div>

              {/* Filtro por Elemento */}
              <div>
                <label className="block text-sm font-medium text-yellow-300 mb-2">
                  Elemento
                </label>
                <select
                  value={selectedElement}
                  onChange={(e) => setSelectedElement(e.target.value as Element | 'all')}
                  className="w-full bg-black/30 border border-yellow-500/30 rounded-md text-white p-2 focus:outline-none focus:border-yellow-400"
                >
                  <option value="all">Todos os Elementos</option>
                  <option value="fire">🔥 Fogo</option>
                  <option value="ice">❄️ Gelo</option>
                  <option value="thunder">⚡ Raio</option>
                  <option value="earth">🌍 Terra</option>
                  <option value="light">✨ Luz</option>
                  <option value="dark">🌑 Sombra</option>
                  <option value="physical">⚔️ Físico</option>
                </select>
              </div>

              {/* Filtro por Raça */}
              <div>
                <label className="block text-sm font-medium text-yellow-300 mb-2">
                  Raça
                </label>
                <select
                  value={selectedRace}
                  onChange={(e) => setSelectedRace(e.target.value as any)}
                  className="w-full bg-black/30 border border-yellow-500/30 rounded-md text-white p-2 focus:outline-none focus:border-yellow-400"
                >
                  <option value="all">Todas as Raças</option>
                  {uniqueRaces.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => { setSearchTerm(''); setSelectedClass('all'); setSelectedElement('all'); setSelectedRace('all'); }}
                className="px-3 py-2 rounded bg-gray-700 text-white text-xs"
                aria-label="Resetar filtros"
              >Resetar filtros</button>
            </div>
          </div>
        )}
      </div>

      {/* Grid de Heróis */}
      {sortedHeroes.length > 0 ? (
        <div ref={listContainerRef} className={`${viewMode === 'grid' ? `grid ${gridClasses[cardSize]} gap-4 sm:gap-6` : 'flex flex-col space-y-4'}`}
          role="list"
          aria-label="Galeria de Heróis"
          onKeyDown={onGridKeyDown}
        >
          {sortedHeroes.map((hero, idx) => (
            <HeroGalleryCard
              key={hero.id}
              hero={hero}
              onClick={() => handleHeroClick(hero)}
              size={viewMode === 'list' ? 'small' : cardSize}
              showDetails={true}
              onEdit={onHeroEdit}
              onImageChange={onHeroImageChange}
              onDelete={() => setConfirmDeleteId(hero.id)}
              index={idx}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-4xl sm:text-6xl mb-4">🦸</div>
          <h3 className="text-xl font-bold text-yellow-400 mb-2">
            Nenhum herói encontrado
          </h3>
          <p className="text-gray-400 mb-6">
            {searchTerm || selectedClass !== 'all' || selectedElement !== 'all'
              ? 'Tente ajustar os filtros de busca.'
              : 'Você ainda não criou nenhum herói.'}
          </p>
          {showCreateButton && (
            <button
              onClick={onCreateHero}
              className="bg-yellow-600 hover:bg-yellow-500 text-white px-6 py-3 rounded-md font-bold transition-colors flex items-center space-x-2 mx-auto"
            >
              <Plus className="w-5 h-5" />
              <span>Criar Primeiro Herói</span>
            </button>
          )}
        </div>
      )}

      
      

      {lightboxIndex !== null && (
        <React.Suspense fallback={null}>
          <GalleryLightbox
            items={sortedHeroes}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNavigate={(newIdx) => setLightboxIndex(Math.max(0, Math.min(newIdx, sortedHeroes.length - 1)))}
          />
        </React.Suspense>
      )}
      
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl border border-yellow-500/30 bg-black/80 p-5 text-white">
            <div className="text-lg font-semibold mb-2">Confirmar Exclusão</div>
            <div className="text-sm text-gray-300">Tem certeza que deseja remover este herói da galeria?</div>
            <div className="mt-4 flex gap-2">
              <button aria-busy={isDeleting} onClick={() => {
                setIsDeleting(true);
                setTimeout(() => {
                  try { deleteHero(confirmDeleteId!); (window as any).notificationBus?.emit?.({ type: 'item', title: 'Herói removido', message: 'Personagem excluído da galeria.', icon: '🗑️', duration: 2500 }); } catch {}
                  setIsDeleting(false);
                  setConfirmDeleteId(null);
                }, 600);
              }} className={`px-3 py-2 rounded ${isDeleting ? 'bg-gray-700 cursor-wait' : 'bg-red-600 hover:bg-red-500'} text-white`}>{isDeleting ? 'Excluindo…' : 'Confirmar'}</button>
              <button onClick={() => setConfirmDeleteId(null)} className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeroGallery;
