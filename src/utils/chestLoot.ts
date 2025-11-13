import { Item } from '../types/hero';
import { SHOP_ITEMS } from './shop';

/**
 * Utilitário de loot de baús de masmorras.
 * Retorna 1-2 itens com base no tier de raridade solicitado.
 * Tipos elegíveis: weapon, armor, accessory.
 */
export type ChestTier = 'comum' | 'raro' | 'epico' | 'lendario';

export function generateChestLoot(tier: ChestTier): Item[] {
  const eligibleTypes = new Set(['weapon', 'armor', 'accessory']);
  const rarityOrder = ['comum', 'raro', 'epico', 'lendario'] as const;

  // Para tier 'comum', restringir à raridade comum; para demais, permitir mínimo por tier
  const minIndex = rarityOrder.indexOf(tier);
  const pool = SHOP_ITEMS.filter(i => {
    if (!eligibleTypes.has(i.type)) return false;
    const rIdx = rarityOrder.indexOf(i.rarity as typeof rarityOrder[number]);
    if (tier === 'comum') return rIdx === 0;
    return rIdx >= minIndex;
  });

  if (pool.length === 0) return [];

  const pick = () => pool[Math.floor(Math.random() * pool.length)];
  const items: Item[] = [pick()];

  // Chance de 2º item para tiers acima de comum
  if (tier !== 'raro' && tier !== 'comum' && Math.random() < 0.35) {
    items.push(pick());
  }

  // Evitar duplicatas simples
  const unique: Record<string, Item> = {};
  for (const it of items) unique[it.id] = it;
  return Object.values(unique);
}
