import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState, Suspense, lazy } from 'react';
import { useHeroStore } from '../store/heroStore';
import { SHOP_ITEMS, ITEM_SETS } from '../utils/shop';
import { getAvailableRecipes } from '../utils/forging';

const NarrativeChapters = lazy(() => import('./NarrativeChapters'));
const TalentPlanManager = lazy(() => import('./TalentPlanManager'));
const UpcomingSkills = lazy(() => import('./UpcomingSkills'));

const HeroDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { heroes, deleteHero, createReferralInvite, getReferralInvitesForHero, craftItem } = useHeroStore();
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'attributes' | 'inventory' | 'talents' | 'journey' | 'invites'
  >('overview');
  const [invQuery, setInvQuery] = useState('');
  const [invType, setInvType] = useState('Todos');
  
  const hero = heroes.find(h => h.id === id);
  
  if (!hero) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-amber-400 mb-4">Herói não encontrado</h2>
        <p className="text-gray-300 mb-6">O herói que você está procurando não existe.</p>
        <Link 
          to="/" 
          className="px-6 py-3 bg-amber-600 hover:bg-amber-700 rounded-md font-bold transition-colors"
        >
          Voltar para Lista
        </Link>
      </div>
    );
  }
  
  const handleDelete = () => {
    if (window.confirm('Tem certeza que deseja deletar este herói?')) {
      deleteHero(hero.id);
      navigate('/');
    }
  };
  
  // Helpers
  const getItemName = (itemId?: string) => {
    if (!itemId) return '-';
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    return item ? item.name : itemId;
  };

  const inventoryEntries = useMemo(
    () => Object
      .entries(hero.inventory.items || {})
      .filter(([, qty]) => (qty as number) > 0),
    [hero.inventory.items]
  );

  const filteredInventoryEntries = useMemo(() => {
    const q = invQuery.trim().toLowerCase();
    return inventoryEntries.filter(([itemId]) => {
      const item = SHOP_ITEMS.find(i => i.id === itemId);
      const name = (item?.name || itemId).toLowerCase();
      const type = (item?.type || '').toLowerCase();
      const matchesQuery = q ? name.includes(q) : true;
      const matchesType = invType === 'Todos' ? true : type === invType.toLowerCase();
      return matchesQuery && matchesType;
    });
  }, [inventoryEntries, invQuery, invType]);

  const myInvites = useMemo(() => getReferralInvitesForHero(hero.id), [hero.id, getReferralInvitesForHero]);

  // Detectar conjunto ativo (memo)
  const activeSet = useMemo(() => {
    const weapons = (hero.inventory.equippedWeapons || []).map(id => SHOP_ITEMS.find(i => i.id === id)?.setId).filter(Boolean) as string[];
    const armors = (hero.inventory.equippedArmorSlots || []).map(id => SHOP_ITEMS.find(i => i.id === id)?.setId).filter(Boolean) as string[];
    const accessories = (hero.inventory.equippedAccessories || []).map(id => SHOP_ITEMS.find(i => i.id === id)?.setId).filter(Boolean) as string[];
    for (const w of weapons) {
      if (armors.includes(w) && accessories.includes(w)) {
        return ITEM_SETS[w];
      }
    }
    return null;
  }, [hero.inventory.equippedWeapons, hero.inventory.equippedArmorSlots, hero.inventory.equippedAccessories]);

  const availableRecipes = useMemo(() => getAvailableRecipes(hero), [hero]);

  // SEO: título e descrição dinâmicos
  useEffect(() => {
    const title = `${hero.name} • Forjador de Heróis`;
    document.title = title;
    const descText = `${hero.name}, ${hero.class} ${hero.race}. Nível ${hero.progression.level}, rank ${hero.rankData?.currentRank || 'F'}. Veja atributos, equipamentos e jornada.`;
    let meta = document.head.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = descText;
    try {
      const canonicalHref = window.location.href;
      let link = Array.from(document.head.querySelectorAll('link[rel="canonical"]'))[0] as HTMLLinkElement | undefined;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'canonical';
        document.head.appendChild(link);
      }
      link.href = canonicalHref;
      const ogPairs: Array<[string, string]> = [
        ['og:title', title],
        ['og:description', descText],
        ['og:type', 'website'],
        ['og:url', canonicalHref],
        ['og:image', hero.image || ''],
        ['og:site_name', 'Forjador de Heróis']
      ];
      ogPairs.forEach(([prop, val]) => {
        if (!val) return;
        let tag = document.head.querySelector(`meta[property="${prop}"]`) as HTMLMetaElement | null;
        if (!tag) {
          tag = document.createElement('meta');
          tag.setAttribute('property', prop);
          document.head.appendChild(tag);
        }
        tag.setAttribute('content', val);
      });
      const twPairs: Array<[string, string]> = [
        ['twitter:card', 'summary_large_image'],
        ['twitter:title', title],
        ['twitter:description', descText],
        ['twitter:image', hero.image || '']
      ];
      twPairs.forEach(([name, val]) => {
        if (!val) return;
        let tag = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
        if (!tag) {
          tag = document.createElement('meta');
          tag.setAttribute('name', name);
          document.head.appendChild(tag);
        }
        tag.setAttribute('content', val);
      });
      const ld = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: hero.name,
        description: descText,
        url: canonicalHref,
        image: hero.image || undefined
      } as any;
      let ldEl = document.head.querySelector('script[type="application/ld+json"][data-hero="1"]');
      if (!ldEl) {
        ldEl = document.createElement('script');
        ldEl.setAttribute('type', 'application/ld+json');
        ldEl.setAttribute('data-hero', '1');
        document.head.appendChild(ldEl);
      }
      ldEl.textContent = JSON.stringify(ld);

      if ((hero.image || '').includes('image.pollinations.ai')) {
        const urls = ['https://image.pollinations.ai'];
        urls.forEach(href => {
          const ensure = (selector: string, factory: () => HTMLLinkElement) => {
            let el = document.head.querySelector(selector) as HTMLLinkElement | null;
            if (!el) { el = factory(); document.head.appendChild(el); }
            el.href = href;
          };
          ensure('link[rel="preconnect"][href="https://image.pollinations.ai"]', () => { const l = document.createElement('link'); l.rel = 'preconnect'; l.crossOrigin = 'anonymous'; return l; });
          ensure('link[rel="dns-prefetch"][href="https://image.pollinations.ai"]', () => { const l = document.createElement('link'); l.rel = 'dns-prefetch'; return l; });
        });
      }
    } catch {}
  }, [hero.name, hero.class, hero.race, hero.progression.level, hero.rankData?.currentRank]);

  return (
    <article className="container mx-auto p-4 sm:p-6" aria-labelledby="hero-title">
      <div className="max-w-full sm:max-w-5xl mx-auto space-y-6">
        <header className="group flex items-center justify-between rounded-xl p-4 sm:p-6 border border-white/10 bg-gray-800/70 shadow-sm">
          <div className="flex items-center gap-4">
            {hero.image && (
              <img
                src={hero.image.includes('image.pollinations.ai/prompt/')
                  ? hero.image
                      .replace('https://image.pollinations.ai/prompt/', '/api/pollinations-image?prompt=')
                      .replace('?n=1&', '&')
                  : hero.image}
                alt={`Avatar de ${hero.name}`}
                width={80}
                height={80}
                loading="eager"
                decoding="async"
                fetchpriority="high"
                sizes="(min-width: 640px) 80px, 64px"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover border border-gray-700 motion-safe:transition-transform motion-safe:duration-300 group-hover:scale-[1.03]"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/160x160?text=Avatar'; }}
              />
            )}
            <div>
              <h1 id="hero-title" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {hero.name}
              </h1>
              <p className="text-sm text-gray-300">{hero.class} • {hero.race}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="px-3 py-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-sm">Nível {hero.progression.level}</span>
            <span className="px-3 py-1 rounded-md bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 text-sm">Rank {hero.rankData?.currentRank || 'F'}</span>
          </div>
        </header>

        <nav aria-label="Navegação do painel" className="sticky top-0 z-20 -mx-4 sm:mx-0 bg-gray-900/60 backdrop-blur supports-[backdrop-filter]:bg-gray-900/40">
          <div className="px-4 sm:px-0 overflow-x-auto">
            <div className="flex gap-2 sm:gap-3 py-2">
              {[
                { id: 'overview', label: 'Visão Geral' },
                { id: 'attributes', label: 'Atributos' },
                { id: 'inventory', label: 'Inventário' },
                { id: 'talents', label: 'Talentos' },
                { id: 'journey', label: 'Jornada' },
                { id: 'invites', label: 'Convites' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`px-3 sm:px-4 py-2 rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${activeTab === t.id ? 'bg-indigo-600 text-white' : 'bg-gray-700/60 text-gray-200 hover:bg-gray-700'}`}
                  aria-current={activeTab === t.id ? 'page' : undefined}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </nav>

        {activeTab === 'overview' && (
          <section aria-label="Visão Geral" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl p-4 bg-gray-800/70 border border-white/10">
                <h2 className="text-base sm:text-lg font-semibold text-white mb-3">Informações</h2>
                <div className="grid grid-cols-2 gap-3 text-sm text-gray-300">
                  <div><span className="text-gray-400">XP</span><div className="text-white">{hero.progression.xp}</div></div>
                  <div><span className="text-gray-400">Ouro</span><div className="text-white">{hero.progression.gold}</div></div>
                  <div><span className="text-gray-400">Missões</span><div className="text-white">{hero.stats?.questsCompleted || 0}</div></div>
                  <div><span className="text-gray-400">Rank Atual</span><div className="text-white">{hero.rankData?.currentRank || 'F'}</div></div>
                  {hero.stats?.talentsUnlockedPlanned !== undefined && (
                    <div><span className="text-gray-400">Talentos planejados</span><div className="text-white">{hero.stats?.talentsUnlockedPlanned || 0} / {(hero.plannedTalents || []).length}</div></div>
                  )}
                </div>
              </div>
              <div className="rounded-xl p-4 bg-gray-800/70 border border-white/10">
                <h2 className="text-base sm:text-lg font-semibold text-white mb-3">Equipamentos</h2>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-gray-700/50 p-3 rounded-md">
                    <div className="text-gray-400">Armas</div>
                    <div className="text-white">{(hero.inventory.equippedWeapons||[]).slice(0,2).map(getItemName).join(', ') || '-'}</div>
                  </div>
                  <div className="bg-gray-700/50 p-3 rounded-md">
                    <div className="text-gray-400">Armaduras</div>
                    <div className="text-white">{(hero.inventory.equippedArmorSlots||[]).slice(0,4).map(getItemName).join(', ') || '-'}</div>
                  </div>
                  <div className="bg-gray-700/50 p-3 rounded-md">
                    <div className="text-gray-400">Acessórios</div>
                    <div className="text-white">{(hero.inventory.equippedAccessories||[]).slice(0,3).map(getItemName).join(', ') || '-'}</div>
                  </div>
                </div>
                {activeSet && (
                  <details className="mt-4 group rounded-md">
                    <summary className="cursor-pointer list-none flex items-center justify-between bg-emerald-700/20 border border-emerald-500/30 rounded-md p-3">
                      <div>
                        <div className="text-emerald-300 text-sm font-semibold">Bônus de Conjunto Ativo</div>
                        <div className="text-white text-sm mt-1">{activeSet.name}</div>
                      </div>
                      <span className="text-emerald-300 text-xs">ver detalhes</span>
                    </summary>
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      {Object.entries(activeSet.bonus).map(([attr, val]) => (
                        <div key={attr} className="bg-gray-700/40 px-2 py-1 rounded">
                          <span className="text-gray-300 capitalize">{attr}</span>
                          <span className="text-white ml-1">+{val as number}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
              <div className="rounded-xl p-4 bg-gray-800/70 border border-white/10">
                <h2 className="text-base sm:text-lg font-semibold text-white mb-3">Companheiros</h2>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-700/50 p-3 rounded-md">
                    <div className="text-gray-400">Mascote Ativo</div>
                    <div className="text-white">{(hero.pets||[]).find(p => p.id===hero.activePetId)?.name || '-'}</div>
                    {hero.activePetId && (
                      <div className="text-xs text-gray-300 mt-1">Refino: +{((hero.pets||[]).find(p => p.id===hero.activePetId)?.refineLevel||0)}%</div>
                    )}
                    <Link to="/pets" className="mt-2 inline-block px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">Gerenciar Mascotes</Link>
                  </div>
                  <div className="bg-gray-700/50 p-3 rounded-md">
                    <div className="text-gray-400">Montaria Ativa</div>
                    <div className="text-white">{(hero.mounts||[]).find(m => m.id===hero.activeMountId)?.name || '-'}</div>
                    {hero.activeMountId && (
                      <div className="text-xs text-gray-300 mt-1">Speed: +{((hero.mounts||[]).find(m => m.id===hero.activeMountId)?.speedBonus||0)} • Refino: +{((hero.mounts||[]).find(m => m.id===hero.activeMountId)?.refineLevel||0)}%</div>
                    )}
                    <Link to="/mounts" className="mt-2 inline-block px-3 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400">Gerenciar Montarias</Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'talents' && (
          <section aria-label="Talentos" className="space-y-4">
            <Suspense fallback={<div className="rounded-xl p-4 bg-gray-800/70 border border-white/10"><div className="animate-pulse space-y-3"><div className="h-5 w-40 bg-gray-700 rounded" /><div className="grid grid-cols-2 gap-3"><div className="h-16 bg-gray-700 rounded" /><div className="h-16 bg-gray-700 rounded" /></div></div></div>}>
              <TalentPlanManager />
            </Suspense>
            <Suspense fallback={<div className="rounded-xl p-4 bg-gray-800/70 border border-white/10"><div className="animate-pulse space-y-3"><div className="h-5 w-48 bg-gray-700 rounded" /><div className="grid grid-cols-3 gap-3"><div className="h-12 bg-gray-700 rounded" /><div className="h-12 bg-gray-700 rounded" /><div className="h-12 bg-gray-700 rounded" /></div></div></div>}>
              <UpcomingSkills />
            </Suspense>
          </section>
        )}

        {activeTab === 'attributes' && (
          <section className="rounded-xl p-4 bg-gray-800/70 border border-white/10" aria-labelledby="attr-title">
            <h2 id="attr-title" className="text-base sm:text-lg font-semibold text-white mb-3">Atributos</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
              {Object.entries(hero.attributes).map(([key, value]) => (
                <div key={key} className="bg-gray-700/50 p-3 rounded-md">
                  <div className="text-gray-400 capitalize">{key}</div>
                  <div className="text-white">{value}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {Object.entries(hero.derivedAttributes).map(([key, value]) => (
                <div key={key} className="bg-gray-700/50 p-3 rounded-md">
                  <div className="text-gray-400 capitalize">{key}</div>
                  <div className="text-white">{value as any}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'inventory' && (
          <section className="rounded-xl p-4 bg-gray-800/70 border border-white/10" aria-labelledby="inv-title">
            <h2 id="inv-title" className="text-base sm:text-lg font-semibold text-white mb-3">Inventário</h2>
            <div className="mb-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
              <input
                type="search"
                value={invQuery}
                onChange={(e) => setInvQuery(e.target.value)}
                placeholder="Buscar itens"
                className="w-full sm:max-w-xs px-3 py-2 rounded-md bg-gray-700 text-white text-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              />
              <select
                value={invType}
                onChange={(e) => setInvType(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 rounded-md bg-gray-700 text-white text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                <option>Todos</option>
                {Array.from(new Set(inventoryEntries.map(([id]) => (SHOP_ITEMS.find(i => i.id === id)?.type || '')).filter(Boolean))).map(t => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            {inventoryEntries.length === 0 && (
              <div className="text-sm text-gray-400">Sem itens no inventário.</div>
            )}
            {inventoryEntries.length > 0 && filteredInventoryEntries.length === 0 && (
              <div className="text-sm text-gray-400">Nenhum item corresponde aos filtros.</div>
            )}
            {filteredInventoryEntries.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredInventoryEntries.map(([itemId, qty]) => {
                  const item = SHOP_ITEMS.find(i => i.id === itemId);
                  return (
                    <div key={itemId} className="bg-gray-700/50 p-3 rounded-md">
                      <div className="text-white font-medium">{item ? item.name : itemId}</div>
                      <div className="text-xs text-gray-400">Qtd: {qty}</div>
                      {item?.rarity && <div className="text-xs mt-1 text-gray-300">Raridade: {item.rarity}</div>}
                      {item?.type && <div className="text-xs text-gray-300">Tipo: {item.type}</div>}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-white mb-2">Forja Simples</h3>
              <div className="mb-2">
                <Link to="/hero-forge" className="inline-flex items-center gap-2 px-2 py-1 rounded bg-amber-600 text-white text-xs hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">Ir à Forja ⚒️</Link>
              </div>
              {availableRecipes.length === 0 && (
                <div className="text-xs text-gray-400">Nenhuma receita disponível com seus materiais e rank atual.</div>
              )}
              {availableRecipes.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {availableRecipes.map(r => (
                    <div key={r.id} className="bg-gray-700/50 p-3 rounded-md flex items-center justify-between">
                      <div>
                        <div className="text-white text-sm font-medium">{r.name}</div>
                        <div className="text-xs text-gray-300">Insumos: {r.inputs.map(i => `${i.qty}x ${SHOP_ITEMS.find(s => s.id === i.id)?.name || i.id}`).join(', ')}</div>
                      </div>
                      <button onClick={() => craftItem(hero.id, r.id)} className="px-3 py-1 rounded bg-emerald-600 text-white text-xs hover:bg-emerald-700">Forjar</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'journey' && (
          <section aria-label="Jornada">
            <Suspense fallback={<div className="rounded-xl p-4 bg-gray-800/70 border border-white/10"><div className="animate-pulse space-y-3"><div className="h-5 w-32 bg-gray-700 rounded" /><div className="space-y-2"><div className="h-10 bg-gray-700 rounded" /><div className="h-10 bg-gray-700 rounded" /><div className="h-10 bg-gray-700 rounded" /></div></div></div>}>
              <NarrativeChapters />
            </Suspense>
          </section>
        )}

        {activeTab === 'invites' && (
          <section className="rounded-xl p-4 bg-gray-800/70 border border-white/10" aria-labelledby="invite-title">
            <div className="flex items-center justify-between mb-3">
              <h2 id="invite-title" className="text-base sm:text-lg font-semibold text-white">Convidar Amigos</h2>
              <button
                disabled={creatingInvite}
                onClick={() => {
                  setCreatingInvite(true);
                  const invite = createReferralInvite(hero.id);
                  if (invite) {
                    const base = window.location.origin;
                    const url = `${base}/create?ref=${invite.code}`;
                    setShareLink(url);
                  }
                  setCreatingInvite(false);
                }}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-md font-bold transition-colors text-sm"
              >
                {creatingInvite ? 'Gerando…' : 'Gerar link de convite'}
              </button>
            </div>
            {shareLink && (
              <div className="bg-gray-700/50 p-3 rounded-md flex items-center justify-between gap-3">
                <div className="text-sm text-white truncate" title={shareLink}>{shareLink}</div>
                <div className="flex items-center gap-2">
                  {typeof navigator !== 'undefined' && (navigator as any).share && (
                    <button
                      onClick={async () => {
                        try {
                          await (navigator as any).share({
                            title: 'Convite para o Forjador de Heróis',
                            text: 'Crie seu herói e entre na aventura! 🛡️',
                            url: shareLink
                          });
                        } catch (err) {
                          console.warn('Compartilhamento nativo cancelado/indisponível:', err);
                        }
                      }}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-md text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                    >
                      Compartilhar
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(shareLink);
                        alert('Link copiado para a área de transferência!');
                      } catch {
                        const ok = window.confirm('Não foi possível copiar automaticamente. Deseja abrir o link em nova aba?');
                        if (ok) window.open(shareLink, '_blank');
                      }
                    }}
                    className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
                  >
                    Copiar
                  </button>
                </div>
              </div>
            )}
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-200 mb-2">Seus convites</h3>
              {myInvites.length === 0 && (
                <div className="text-sm text-gray-400">Nenhum convite criado ainda.</div>
              )}
              {myInvites.length > 0 && (
                <div className="space-y-2">
                  {myInvites.map(inv => (
                    <div key={inv.id} className="bg-gray-700/40 p-3 rounded-md flex items-center justify-between">
                      <div className="text-sm text-gray-200">
                        Código: <span className="font-mono text-white">{inv.code}</span>
                        <span className="ml-3 px-2 py-1 rounded bg-gray-800 text-xs border border-white/10">{inv.status === 'pending' ? 'pendente' : 'aceito'}</span>
                        {inv.rewardGranted && <span className="ml-2 text-emerald-400 text-xs">bônus entregue</span>}
                      </div>
                      <div className="text-xs text-gray-400">criado em {new Date(inv.createdAt).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        <footer className="flex justify-between" aria-label="Ações da página">
          <Link to="/" className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-700 hover:bg-gray-600 rounded-md font-bold transition-colors text-sm sm:text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300">Voltar</Link>
          <button onClick={handleDelete} className="px-4 sm:px-6 py-2 sm:py-3 bg-red-600 hover:bg-red-700 rounded-md font-bold transition-colors text-sm sm:text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">Deletar Herói</button>
        </footer>
      </div>
    </article>
  );
};

export default HeroDetail;
