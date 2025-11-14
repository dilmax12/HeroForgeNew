import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useHeroStore } from '../store/heroStore';
import { SHOP_ITEMS, ITEM_SETS } from '../utils/shop';
import NarrativeChapters from './NarrativeChapters';
import { getAvailableRecipes } from '../utils/forging';
import { useHeroStore } from '../store/heroStore';

const HeroDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { heroes, deleteHero, createReferralInvite, getReferralInvitesForHero, craftItem } = useHeroStore();
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [creatingInvite, setCreatingInvite] = useState(false);
  
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
  
  // Helpers para exibir itens
  const getItemName = (itemId?: string) => {
    if (!itemId) return '-';
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    return item ? item.name : itemId;
  };
  const inventoryEntries = Object
    .entries(hero.inventory.items || {})
    .filter(([, qty]) => (qty as number) > 0);
  const myInvites = getReferralInvitesForHero(hero.id);

  // Detectar conjunto ativo
  const equipped = [hero.inventory.equippedWeapon, hero.inventory.equippedArmor, hero.inventory.equippedAccessory].filter(Boolean);
  const equippedSetIds = equipped
    .map(itemId => SHOP_ITEMS.find(i => i.id === itemId)?.setId)
    .filter((sid): sid is string => !!sid);
  const activeSetId = equippedSetIds.length === 3 && new Set(equippedSetIds).size === 1 ? equippedSetIds[0] : null;
  const activeSet = activeSetId ? ITEM_SETS[activeSetId] : null;

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="max-w-full sm:max-w-5xl mx-auto space-y-6">
        {/* Header minimalista */}
        <div className="flex items-center justify-between bg-gray-800/70 border border-white/10 rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-4">
            {hero.image && (
              <img
                src={hero.image}
                alt={`Avatar de ${hero.name}`}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover border border-gray-700"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/160x160?text=Avatar'; }}
              />
            )}
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">{hero.name}</h2>
              <div className="text-sm text-gray-400">{hero.class} • {hero.race}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="px-3 py-1 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 text-sm">Nível {hero.progression.level}</span>
            <span className="px-3 py-1 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-sm">Rank {hero.rankData?.currentRank || 'F'}</span>
          </div>
        </div>

        {/* Cards compactos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl p-4 bg-gray-800/70 border border-white/10">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-3">Informações</h3>
            <div className="grid grid-cols-2 gap-3 text-sm text-gray-300">
              <div><span className="text-gray-400">Alinhamento</span><div className="text-white">{hero.alignment.split('-').map(w => w[0].toUpperCase()+w.slice(1)).join(' ')}</div></div>
              {hero.background && <div><span className="text-gray-400">Antecedente</span><div className="text-white">{hero.background[0].toUpperCase()+hero.background.slice(1)}</div></div>}
              <div><span className="text-gray-400">XP</span><div className="text-white">{hero.progression.xp}</div></div>
              <div><span className="text-gray-400">Ouro</span><div className="text-white">{hero.progression.gold}</div></div>
              <div><span className="text-gray-400">Missões</span><div className="text-white">{hero.stats?.questsCompleted || 0}</div></div>
              <div><span className="text-gray-400">Rank Atual</span><div className="text-white">{hero.rankData?.currentRank || 'F'}</div></div>
            </div>
          </div>
          <div className="rounded-xl p-4 bg-gray-800/70 border border-white/10">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-3">Equipamentos</h3>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-gray-700/50 p-3 rounded-md">
                <div className="text-gray-400">Arma</div>
                <div className="text-white">{getItemName(hero.inventory.equippedWeapon)}</div>
              </div>
              <div className="bg-gray-700/50 p-3 rounded-md">
                <div className="text-gray-400">Armadura</div>
                <div className="text-white">{getItemName(hero.inventory.equippedArmor)}</div>
              </div>
              <div className="bg-gray-700/50 p-3 rounded-md">
                <div className="text-gray-400">Acessório</div>
                <div className="text-white">{getItemName(hero.inventory.equippedAccessory)}</div>
              </div>
            </div>
            {activeSet && (
              <div className="mt-4 bg-emerald-700/20 border border-emerald-500/30 rounded-md p-3">
                <div className="text-emerald-300 text-sm font-semibold">Bônus de Conjunto Ativo</div>
                <div className="text-white text-sm mt-1">{activeSet.name}</div>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {Object.entries(activeSet.bonus).map(([attr, val]) => (
                    <div key={attr} className="bg-gray-700/40 px-2 py-1 rounded">
                      <span className="text-gray-300 capitalize">{attr}</span>
                      <span className="text-white ml-1">+{val as number}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Atributos */}
        <div className="rounded-xl p-4 bg-gray-800/70 border border-white/10">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-3">Atributos</h3>
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
        </div>

        {/* Inventário */}
        <div className="rounded-xl p-4 bg-gray-800/70 border border-white/10">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-3">Inventário</h3>
          {inventoryEntries.length === 0 && (
            <div className="text-sm text-gray-400">Sem itens no inventário.</div>
          )}
          {inventoryEntries.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {inventoryEntries.map(([itemId, qty]) => {
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

          {/* Forja Simples */}
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-white mb-2">Forja Simples</h4>
            {(() => {
              const recipes = getAvailableRecipes(hero);
              if (recipes.length === 0) return (<div className="text-xs text-gray-400">Nenhuma receita disponível com seus materiais e rank atual.</div>);
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {recipes.map(r => (
                    <div key={r.id} className="bg-gray-700/50 p-3 rounded-md flex items-center justify-between">
                      <div>
                        <div className="text-white text-sm font-medium">{r.name}</div>
                        <div className="text-xs text-gray-300">Insumos: {r.inputs.map(i => `${i.qty}x ${SHOP_ITEMS.find(s => s.id === i.id)?.name || i.id}`).join(', ')}</div>
                      </div>
                      <button
                        onClick={() => craftItem(hero.id, r.id)}
                        className="px-3 py-1 rounded bg-emerald-600 text-white text-xs hover:bg-emerald-700"
                      >
                        Forjar
                      </button>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Capítulos da Jornada */}
        <NarrativeChapters />

        {/* Convites e Compartilhamento */}
        <div className="rounded-xl p-4 bg-gray-800/70 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base sm:text-lg font-semibold text-white">Convidar Amigos</h3>
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
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-md text-sm font-semibold"
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
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-sm font-semibold"
                >
                  Copiar
                </button>
              </div>
            </div>
          )}

          <div className="mt-4">
            <h4 className="text-sm font-semibold text-gray-200 mb-2">Seus convites</h4>
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
                    <div className="text-xs text-gray-400">
                      criado em {new Date(inv.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="flex justify-between">
          <Link 
            to="/" 
            className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-700 hover:bg-gray-600 rounded-md font-bold transition-colors text-sm sm:text-base"
          >
            Voltar
          </Link>
          <button
            onClick={handleDelete}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-red-600 hover:bg-red-700 rounded-md font-bold transition-colors text-sm sm:text-base"
          >
            Deletar Herói
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeroDetail;
