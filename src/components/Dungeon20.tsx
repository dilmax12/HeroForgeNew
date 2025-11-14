import React, { useEffect, useMemo, useState } from 'react';
import { useHeroStore } from '../store/heroStore';
import { saveDungeonRun, startDungeonRun, updateDungeonRun, finishDungeonRun } from '../services/dungeonService';
import { addGuildReputation } from '../services/guildService';
import { dungeonConfig, computeRewardMultiplier, isBossFloor } from '../utils/dungeonConfig';
import { logActivity } from '../utils/activitySystem';
import { generateChestLoot } from '../utils/chestLoot';
import { SHOP_ITEMS } from '../utils/shop';
import BattleModal from './BattleModal';
import { RankLevel } from '../types/ranks';
import { useHeroStore as useStoreRef } from '../store/heroStore';

type FloorResult = {
  floor: number;
  success: boolean;
  event: 'none' | 'combat' | 'trap' | 'chest' | 'rest';
  xpGained: number;
  goldGained: number;
  narrative: string;
  itemsAwarded?: string[];
  itemIdsAwarded?: string[];
};

const FLOORS_TOTAL = 20; // usado apenas para compatibilidade com payload anterior

export default function Dungeon20() {
  const hero = useHeroStore(s => s.getSelectedHero());
  const gainXP = useHeroStore(s => s.gainXP);
  const gainGold = useHeroStore(s => s.gainGold);
  const updateHero = useHeroStore(s => s.updateHero);
  const getHeroParty = useHeroStore(s => s.getHeroParty);
  const addItemToInventory = useHeroStore(s => s.addItemToInventory);
  const equipItem = useHeroStore(s => s.equipItem);
  const unequipItem = useHeroStore(s => s.unequipItem);
  const generateEggForSelected = useStoreRef(s => s.generateEggForSelected);

  const [floorIndex, setFloorIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<FloorResult[]>([]);
  const [awaitingDecision, setAwaitingDecision] = useState(false);
  const [streak, setStreak] = useState(0);
  const [startedAt, setStartedAt] = useState<string | undefined>(undefined);
  const [battleEnemies, setBattleEnemies] = useState<Array<{ type: string; count: number; level?: number }>>([]);
  const [showBattle, setShowBattle] = useState(false);
  const [exitedVoluntarily, setExitedVoluntarily] = useState(false);
  const [pendingEvent, setPendingEvent] = useState<'none' | 'ancient_chest' | 'mystic_shrine' | 'dark_trap' | 'mysterious_merchant' | 'secret_gate' | 'echo_of_past' >('none');
  const [awaitingEventChoice, setAwaitingEventChoice] = useState(false);
  const [awaitingCombatChoice, setAwaitingCombatChoice] = useState(false);
  const [blessingFloors, setBlessingFloors] = useState(0);
  const [blessingMult, setBlessingMult] = useState(1);
  const [trapFloors, setTrapFloors] = useState(0);
  const [trapPenaltyMult, setTrapPenaltyMult] = useState(1);
  const [lootFeedback, setLootFeedback] = useState<string | null>(null);
  const useItem = useHeroStore(s => s.useItem);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  const totalXP = useMemo(() => log.reduce((acc, r) => acc + r.xpGained, 0), [log]);
  const totalGold = useMemo(() => log.reduce((acc, r) => acc + r.goldGained, 0), [log]);

  // Limite diário removido

  // Limite de andares por rank (similar ao AIDungeonRun)
  const getMaxFloorsByRank = (rank?: RankLevel) => {
    switch (rank) {
      case 'F':
      case 'E':
        return 3;
      case 'D':
      case 'C':
        return 4;
      case 'B':
        return 5;
      case 'A':
        return 6;
      case 'S':
        return 7;
      default:
        return 3;
    }
  };
  const heroRank: RankLevel | undefined = hero?.rankData?.currentRank as RankLevel | undefined;
  const maxFloorsAllowed = getMaxFloorsByRank(heroRank);

  const startRun = () => {
    // Gate: exigir rank D ou superior para entrar
    if (!hero) {
      setError('Selecione um herói para jogar a Dungeon.');
      return;
    }
    if (!heroRank || heroRank === 'F' || heroRank === 'E') {
      setError('Rank insuficiente. A Dungeon Infinita requer rank D ou superior.');
      return;
    }
    setRunning(true);
    setFinished(false);
    setFloorIndex(0);
    setLog([]);
    setError(null);
    setAwaitingDecision(false);
    setStreak(0);
    const started = new Date().toISOString();
    setStartedAt(started);
    setExitedVoluntarily(false);
    setPendingEvent('none');
    setAwaitingEventChoice(false);
    setBlessingFloors(0);
    setBlessingMult(1);
    setTrapFloors(0);
    setTrapPenaltyMult(1);
    // Iniciar persistência remota (offline seguro)
    (async () => {
      if (!hero) return;
      const res = await startDungeonRun(hero, started);
      if (res.ok && res.runId) {
        setActiveRunId(res.runId);
      } else {
        setActiveRunId(null);
      }
    })();
  };

  const makeNarrative = (success: boolean, event: FloorResult['event'], xp: number, gold: number) => {
    const base = success ? 'Você avança com determinação.' : 'Você tropeça e sofre um revés.';
    const ev = event === 'combat' ? 'Um combate acirrado ocorre.'
      : event === 'trap' ? 'Uma armadilha quase te pega.'
      : event === 'chest' ? 'Você encontra um baú modesto.'
      : event === 'rest' ? 'Você encontra um canto seguro para descansar.'
      : 'O corredor está silencioso.';
    return `${base} ${ev} (+${xp} XP, +${gold} ouro)`;
  };

  const handleChoice = (risk: 'safe' | 'normal' | 'risky') => {
    if (!hero || loading || finished) return;
    setLoading(true);
    try {
      // Probabilidade básica e recompensa
      const baseSuccess = risk === 'safe' ? 0.8 : risk === 'normal' ? 0.6 : 0.4;
      const roll = Math.random();
      const success = roll < baseSuccess;

      // Evento aleatório (nova tabela de eventos)
      let event: FloorResult['event'] = 'none';
      const re = Math.random();
      // 30% combate, 10% santuário, 12% baú, 10% armadilha, 8% mercador, 5% portão, 10% eco, 15% nada
      if (re < 0.30) event = 'combat';
      else if (re < 0.40) { setPendingEvent('mystic_shrine'); setAwaitingEventChoice(true); event = 'rest'; }
      else if (re < 0.52) { setPendingEvent('ancient_chest'); setAwaitingEventChoice(true); event = 'chest'; }
      else if (re < 0.62) { setPendingEvent('dark_trap'); event = 'trap'; }
      else if (re < 0.70) { setPendingEvent('mysterious_merchant'); setAwaitingEventChoice(true); event = 'none'; }
      else if (re < 0.75) { setPendingEvent('secret_gate'); setAwaitingEventChoice(true); event = 'none'; }
      else if (re < 0.85) { setPendingEvent('echo_of_past'); setAwaitingEventChoice(true); event = 'none'; }
      else event = 'none';

      // Floor atual e boss
      const currentFloor = floorIndex + 1;
      // Impedir escolhas além do limite por rank
      if (currentFloor > maxFloorsAllowed) {
        setLoading(false);
        setFinished(true);
        setAwaitingDecision(false);
        const result: FloorResult = {
          floor: currentFloor,
          success: true,
          event: 'none',
          xpGained: 0,
          goldGained: 0,
          narrative: `Um portal selado bloqueia seu caminho. Rank atual (${heroRank || '—'}) permite até ${maxFloorsAllowed} andares.`
        };
        const newLog = [...log, result];
        setLog(newLog);
        if (activeRunId) {
          updateDungeonRun(activeRunId, {
            max_floor_reached: newLog.length,
            total_xp: newLog.reduce((acc, r) => acc + r.xpGained, 0),
            total_gold: newLog.reduce((acc, r) => acc + r.goldGained, 0),
            logs: newLog
          });
        }
        return;
      }
      const boss = isBossFloor(currentFloor);

      // Combate real quando o evento for 'combat'
      if (event === 'combat') {
        const templates = boss ? ['Troll'] : ['Goblin', 'Esqueleto', 'Bandido', 'Lobo'];
        const chosen = templates[Math.floor(Math.random() * templates.length)];
        const count = boss ? 1 : (Math.random() < 0.2 ? 2 : 1);
        const level = Math.max(1, Math.floor((hero.progression.level || 1) + currentFloor * 0.3));
        const questEnemies = [{ type: chosen, count, level }];
        setBattleEnemies(questEnemies);
        setAwaitingCombatChoice(true);
        // Esperar ação do jogador: atacar, usar item ou fugir
        return;
      }

      // Recompensas com multiplicador de streak e bônus (incluem benção/armadilha)
      const baseXp = success ? (risk === 'safe' ? 5 : risk === 'normal' ? 8 : 12) : 3;
      const baseGold = success ? (risk === 'safe' ? 1 : risk === 'normal' ? 2 : 3) : 0;
      const mult = computeRewardMultiplier(streak) * blessingMult * trapPenaltyMult;
      const bossRewardMult = boss ? 1.5 : 1;
      const xp = Math.round(baseXp * mult * bossRewardMult);
      const gold = Math.round(baseGold * mult * bossRewardMult);

      gainXP(hero.id, xp);
      gainGold(hero.id, gold);

      const result: FloorResult = {
        floor: currentFloor,
        success,
        event,
        xpGained: xp,
        goldGained: gold,
        narrative: makeNarrative(success, event, xp, gold)
      };
      const newLog = [...log, result];
      setLog(newLog);
      // Persistência incremental
      if (activeRunId) {
        updateDungeonRun(activeRunId, {
          max_floor_reached: newLog.length,
          total_xp: newLog.reduce((acc, r) => acc + r.xpGained, 0),
          total_gold: newLog.reduce((acc, r) => acc + r.goldGained, 0),
          logs: newLog
        });
      }

      // Log atividades básicas
      if (success && event === 'combat') {
        logActivity.combatVictory({ heroId: hero.id, heroName: hero.name, heroClass: hero.class, enemiesDefeated: boss ? ['Boss da faixa'] : ['Guardas da masmorra'] });
      } else if (event === 'chest' || event === 'rest' || event === 'trap') {
        logActivity.eventCompleted({ heroId: hero.id, heroName: hero.name, heroClass: hero.class, eventCompleted: event });
      }

      // Após resolver o andar, acionar decisão (se nenhum evento pendente exigir escolha)
      if (!awaitingEventChoice) setAwaitingDecision(true);

      // Penalidade de morte em boss (para combate tratado acima)
      if (boss && !success && event === 'combat') {
        // Penalidade de morte em boss no modo normal
        const goldLoss = Math.round(totalGold * dungeonConfig.deathPenalty.normal.gold);
        const xpLoss = Math.round(totalXP * dungeonConfig.deathPenalty.normal.xp);
        gainGold(hero.id, -goldLoss);
        gainXP(hero.id, -xpLoss);
        setFinished(true);
        setRunning(false);
        setAwaitingDecision(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const ascend = () => {
    if (finished) return;
    // Respeitar limite de andares por rank: finalizar ao atingir limite
    if ((floorIndex + 1) >= maxFloorsAllowed) {
      setAwaitingDecision(false);
      setFinished(true);
      const result: FloorResult = {
        floor: floorIndex + 1,
        success: true,
        event: 'none',
        xpGained: 0,
        goldGained: 0,
        narrative: `Você atingiu o limite de andares permitido pelo seu rank (${heroRank || '—'}). Avance de rank para desbloquear mais andares.`
      };
      const newLog = [...log, result];
      setLog(newLog);
      if (activeRunId) {
        updateDungeonRun(activeRunId, {
          max_floor_reached: newLog.length,
          total_xp: newLog.reduce((acc, r) => acc + r.xpGained, 0),
          total_gold: newLog.reduce((acc, r) => acc + r.goldGained, 0),
          logs: newLog
        });
      }
      return;
    }
    setAwaitingDecision(false);
    setStreak(s => s + 1);
    setFloorIndex(i => i + 1);
    // reduzir duração de benção/armadilha
    if (blessingFloors > 0) setBlessingFloors(n => {
      const next = n - 1; if (next <= 0) setBlessingMult(1); return Math.max(0, next);
    });
    if (trapFloors > 0) setTrapFloors(n => {
      const next = n - 1; if (next <= 0) setTrapPenaltyMult(1); return Math.max(0, next);
    });
  };

  const exitRun = async () => {
    setAwaitingDecision(false);
    setFinished(true);
    setRunning(false);
    setExitedVoluntarily(true);
    await saveRun();
  };

  const saveRun = async () => {
    if (!hero) return;
    const victory = exitedVoluntarily; // vitória quando o jogador decide sair com prêmios
    const payload = {
      max_floor_reached: log.length,
      victory,
      total_xp: totalXP,
      total_gold: totalGold,
      logs: log,
      finished_at: new Date().toISOString(),
      started_at: startedAt
    };
    if (activeRunId) {
      const res = await finishDungeonRun(activeRunId, {
        victory,
        max_floor_reached: payload.max_floor_reached,
        total_xp: payload.total_xp,
        total_gold: payload.total_gold,
        logs: payload.logs,
        finished_at: payload.finished_at
      });
      if (!res.ok) setError(res.error || 'Falha ao salvar run.');
    } else {
      const res = await saveDungeonRun(hero, payload);
      if (!res.ok) setError(res.error || 'Falha ao salvar run.');
    }
    if (!res.ok) setError(res.error || 'Falha ao salvar run.');
    // Pequeno bônus de reputação por concluir
    if (victory) await addGuildReputation(hero, 25);
    setBlockedToday(true);
  };

  const resetRun = () => {
    setRunning(false);
    setFinished(false);
    setFloorIndex(0);
    setLog([]);
    setError(null);
  };

  const handleEventAction = (action: string) => {
    if (!hero) return;
    const currentFloor = floorIndex + 1;
    const boss = isBossFloor(currentFloor);
    const mult = computeRewardMultiplier(streak) * blessingMult * trapPenaltyMult;
    const bossRewardMult = boss ? 1.5 : 1;

    switch (pendingEvent) {
      case 'ancient_chest': {
        if (action === 'open') {
          // Probabilidades base: comum 70, raro 20, épico 8, lendário 2
          // Aplicar viés por andar e bônus de party completa (+5%)
          const party = getHeroParty(hero.id);
          const partyComplete = !!party && party.members.length >= 4;
          const floorBias = (dungeonConfig.rarityIncreasePerFloor || 0) * currentFloor; // em % acumulado
          const partyBonus = partyComplete ? 5 : 0; // +5%
          const roll = Math.min(100, Math.random() * 100 + floorBias + partyBonus);
          let tier: 'comum' | 'raro' | 'epico' | 'lendario' = 'comum';
          if (roll >= 98) tier = 'lendario'; else if (roll >= 90) tier = 'epico'; else if (roll >= 70) tier = 'raro';
          // Gerar loot de baú com suporte a 'comum'
          const items = generateChestLoot(tier as any);
          const gold = Math.round((tier === 'comum' ? 10 : tier === 'raro' ? 25 : tier === 'epico' ? 60 : 150) * mult * bossRewardMult);
          gainGold(hero.id, gold);
          // Conceder itens ao inventário
          if (items.length) {
            items.forEach(it => {
              addItemToInventory(hero.id, it.id, 1);
            });
          }
          // Chance de Ovo Misterioso em baús épicos/lendários
          if ((tier === 'epico' || tier === 'lendario') && Math.random() < 0.2) {
            generateEggForSelected();
          }
          const itemNames = items.map(i => i.name);
          const itemIds = items.map(i => i.id);
          const result: FloorResult = { floor: currentFloor, success: true, event: 'chest', xpGained: 0, goldGained: gold, narrative: `Baú antigo: ${tier.toUpperCase()} • +${gold} ouro${items.length ? ' • Itens raros' : ''}` };
          if (itemNames.length) {
            result.itemsAwarded = itemNames;
            result.itemIdsAwarded = itemIds;
          }
          const newLog = [...log, result];
          setLog(newLog);
          if (activeRunId) {
            updateDungeonRun(activeRunId, {
              max_floor_reached: newLog.length,
              total_xp: newLog.reduce((acc, r) => acc + r.xpGained, 0),
              total_gold: newLog.reduce((acc, r) => acc + r.goldGained, 0),
              logs: newLog
            });
          }
        } else {
          const result: FloorResult = { floor: currentFloor, success: true, event: 'none', xpGained: 0, goldGained: 0, narrative: 'Você deixou o baú intacto.' };
          const newLog = [...log, result];
          setLog(newLog);
          if (activeRunId) {
            updateDungeonRun(activeRunId, {
              max_floor_reached: newLog.length,
              total_xp: newLog.reduce((acc, r) => acc + r.xpGained, 0),
              total_gold: newLog.reduce((acc, r) => acc + r.goldGained, 0),
              logs: newLog
            });
          }
        }
        break;
      }
      case 'mystic_shrine': {
        if (action === 'heal') {
          const maxHp = hero.derivedAttributes.hp || 1;
          const curHp = hero.derivedAttributes.currentHp ?? maxHp;
          const healed = Math.min(maxHp, curHp + Math.round(maxHp * 0.5));
          updateHero(hero.id, { derivedAttributes: { ...hero.derivedAttributes, currentHp: healed } });
          {
            const result: FloorResult = { floor: currentFloor, success: true, event: 'rest', xpGained: 4, goldGained: 0, narrative: 'Santuário místico: você recupera forças (+HP).' };
            const newLog = [...log, result];
            setLog(newLog);
            if (activeRunId) {
              updateDungeonRun(activeRunId, {
                max_floor_reached: newLog.length,
                total_xp: newLog.reduce((acc, r) => acc + r.xpGained, 0),
                total_gold: newLog.reduce((acc, r) => acc + r.goldGained, 0),
                logs: newLog
              });
            }
          }
          gainXP(hero.id, Math.round(4 * mult));
        } else if (action === 'bless') {
          setBlessingFloors(3);
          setBlessingMult(1.15);
          {
            const result: FloorResult = { floor: currentFloor, success: true, event: 'rest', xpGained: 6, goldGained: 0, narrative: 'Santuário místico: bênção temporária por 3 andares.' };
            const newLog = [...log, result];
            setLog(newLog);
            if (activeRunId) {
              updateDungeonRun(activeRunId, {
                max_floor_reached: newLog.length,
                total_xp: newLog.reduce((acc, r) => acc + r.xpGained, 0),
                total_gold: newLog.reduce((acc, r) => acc + r.goldGained, 0),
                logs: newLog
              });
            }
          }
          gainXP(hero.id, Math.round(6 * mult));
        }
        break;
      }
      case 'dark_trap': {
        const damage = Math.round((hero.derivedAttributes.hp || 20) * 0.25);
        const curHp = hero.derivedAttributes.currentHp ?? (hero.derivedAttributes.hp || 0);
        const newHp = Math.max(0, curHp - damage);
        updateHero(hero.id, { derivedAttributes: { ...hero.derivedAttributes, currentHp: newHp } });
        setTrapFloors(3);
        setTrapPenaltyMult(0.9);
        {
          const result: FloorResult = { floor: currentFloor, success: false, event: 'trap', xpGained: 0, goldGained: 0, narrative: 'Armadilha sombria: você sofre dano e fica debilitado por 3 andares.' };
          const newLog = [...log, result];
          setLog(newLog);
          if (activeRunId) {
            updateDungeonRun(activeRunId, {
              max_floor_reached: newLog.length,
              total_xp: newLog.reduce((acc, r) => acc + r.xpGained, 0),
              total_gold: newLog.reduce((acc, r) => acc + r.goldGained, 0),
              logs: newLog
            });
          }
        }
        break;
      }
      case 'mysterious_merchant': {
        if (action === 'buy') {
          const cost = Math.round(50 * bossRewardMult);
          if (hero.progression.gold >= cost) {
            gainGold(hero.id, -cost);
            const merchandise = generateChestLoot('raro');
            const chosen = merchandise[0];
            if (chosen) {
              addItemToInventory(hero.id, chosen.id, 1);
            }
            {
              const result: FloorResult = { floor: currentFloor, success: true, event: 'none', xpGained: 0, goldGained: -cost, narrative: `Mercador misterioso: você compra ${chosen ? chosen.name : 'um artefato'} por ${cost} ouro.` };
              if (chosen) {
                result.itemsAwarded = [chosen.name];
                result.itemIdsAwarded = [chosen.id];
              }
              const newLog = [...log, result];
              setLog(newLog);
              if (activeRunId) {
                updateDungeonRun(activeRunId, {
                  max_floor_reached: newLog.length,
                  total_xp: newLog.reduce((acc, r) => acc + r.xpGained, 0),
                  total_gold: newLog.reduce((acc, r) => acc + r.goldGained, 0),
                  logs: newLog
                });
              }
            }
          } else {
            const result: FloorResult = { floor: currentFloor, success: false, event: 'none', xpGained: 0, goldGained: 0, narrative: 'Mercador misterioso: ouro insuficiente.' };
            const newLog = [...log, result];
            setLog(newLog);
            if (activeRunId) {
              updateDungeonRun(activeRunId, {
                max_floor_reached: newLog.length,
                total_xp: newLog.reduce((acc, r) => acc + r.xpGained, 0),
                total_gold: newLog.reduce((acc, r) => acc + r.goldGained, 0),
                logs: newLog
              });
            }
          }
        } else {
          const result: FloorResult = { floor: currentFloor, success: true, event: 'none', xpGained: 0, goldGained: 0, narrative: 'Mercador misterioso: você recusa a oferta.' };
          const newLog = [...log, result];
          setLog(newLog);
          if (activeRunId) {
            updateDungeonRun(activeRunId, {
              max_floor_reached: newLog.length,
              total_xp: newLog.reduce((acc, r) => acc + r.xpGained, 0),
              total_gold: newLog.reduce((acc, r) => acc + r.goldGained, 0),
              logs: newLog
            });
          }
        }
        break;
      }
      case 'secret_gate': {
        const dirForward = Math.random() < 0.7;
        const delta = dirForward ? (1 + Math.floor(Math.random() * 3)) : (-(1 + Math.floor(Math.random() * 2)));
        setFloorIndex(i => Math.max(0, i + delta));
        const result: FloorResult = { floor: currentFloor, success: true, event: 'none', xpGained: 0, goldGained: 0, narrative: `Portão secreto: você é teleportado ${dirForward ? `${delta} andares à frente` : `${Math.abs(delta)} andares atrás`}.` };
        const newLog = [...log, result];
        setLog(newLog);
        if (activeRunId) {
          updateDungeonRun(activeRunId, {
            max_floor_reached: newLog.length,
            total_xp: newLog.reduce((acc, r) => acc + r.xpGained, 0),
            total_gold: newLog.reduce((acc, r) => acc + r.goldGained, 0),
            logs: newLog
          });
        }
        break;
      }
      case 'echo_of_past': {
        const result: FloorResult = { floor: currentFloor, success: true, event: 'none', xpGained: 2, goldGained: 0, narrative: 'Eco do passado: “O corredor escurece… passos ecoam nas sombras. Um olhar flamejante te observa.”' };
        const newLog = [...log, result];
        setLog(newLog);
        if (activeRunId) {
          updateDungeonRun(activeRunId, {
            max_floor_reached: newLog.length,
            total_xp: newLog.reduce((acc, r) => acc + r.xpGained, 0),
            total_gold: newLog.reduce((acc, r) => acc + r.goldGained, 0),
            logs: newLog
          });
        }
        gainXP(hero.id, Math.round(2 * mult));
        break;
      }
    }
    setPendingEvent('none');
    setAwaitingEventChoice(false);
    setAwaitingDecision(true);
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-white">Dungeon Infinita</h2>
      <p className="text-gray-300">Andar atual: {floorIndex + 1} {isBossFloor(floorIndex + 1) ? '— Boss' : ''}</p>
      <p className="text-indigo-300">Limite por rank: até {maxFloorsAllowed} andares ({heroRank || '—'})</p>
      <p className="text-indigo-300">Streak: {streak} • Multiplicador: x{computeRewardMultiplier(streak).toFixed(2)}</p>

      {/* Limite diário removido */}

      {!running && !finished && (
        <div className="mt-4">
          <button
            onClick={startRun}
            disabled={!hero || !heroRank || heroRank === 'F' || heroRank === 'E'}
            className="px-3 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Iniciar Tentativa
          </button>
          {(!heroRank || heroRank === 'F' || heroRank === 'E') && (
            <div className="mt-2 text-sm text-red-300">Requer rank D ou superior para entrar.</div>
          )}
        </div>
      )}

      {running && (
        <div className="mt-4 p-4 border rounded bg-gray-800 border-gray-700">
          <div className="text-gray-200">Andar {floorIndex + 1}</div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button onClick={() => handleChoice('safe')} disabled={loading} className="border border-gray-700 bg-gray-700 text-gray-100 px-3 py-2 rounded hover:bg-gray-600 disabled:opacity-50">Seguro</button>
            <button onClick={() => handleChoice('normal')} disabled={loading} className="border border-gray-700 bg-gray-700 text-gray-100 px-3 py-2 rounded hover:bg-gray-600 disabled:opacity-50">Padrão</button>
            <button onClick={() => handleChoice('risky')} disabled={loading} className="border border-gray-700 bg-gray-700 text-gray-100 px-3 py-2 rounded hover:bg-gray-600 disabled:opacity-50">Arriscado</button>
          </div>
          {awaitingCombatChoice && battleEnemies.length > 0 && (
            <div className="mt-4 p-3 border border-red-700 bg-red-900/20 rounded">
              <div className="text-white font-semibold">Combate</div>
              <div className="mt-1 text-gray-200">Inimigos: {battleEnemies.map(e => `${e.count} ${e.type}${e.count>1?'s':''}`).join(', ')}</div>
              <div className="mt-2 flex gap-2">
                <button onClick={() => { setAwaitingCombatChoice(false); setShowBattle(true); }} className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700">Atacar</button>
                <button onClick={() => {
                  const maxHp = hero.derivedAttributes.hp || 1;
                  const curHp = hero.derivedAttributes.currentHp ?? maxHp;
                  const healed = Math.min(maxHp, curHp + 20);
                  updateHero(hero.id, { derivedAttributes: { ...hero.derivedAttributes, currentHp: healed } });
                  setAwaitingCombatChoice(false);
                  setShowBattle(true);
                }} className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700">Usar item</button>
                <button onClick={() => {
                  const fleeSuccess = Math.random() < 0.6;
                  if (fleeSuccess) {
                    setLog(prev => [...prev, { floor: floorIndex + 1, success: true, event: 'none', xpGained: 2, goldGained: 0, narrative: 'Você fugiu do combate.' }]);
                    gainXP(hero.id, 2);
                    setAwaitingCombatChoice(false);
                    setAwaitingDecision(true);
                  } else {
                    setAwaitingCombatChoice(false);
                    setShowBattle(true);
                  }
                }} className="px-3 py-2 rounded bg-gray-600 text-white hover:bg-gray-700">Fugir</button>
              </div>
            </div>
          )}
          {awaitingDecision && !finished && (
            <div className="mt-4 flex items-center gap-3">
              <button onClick={ascend} className="px-3 py-2 rounded bg-purple-600 text-white hover:bg-purple-700">Subir</button>
              <button onClick={exitRun} className="px-3 py-2 rounded bg-amber-600 text-black hover:bg-amber-500">Sair com prêmios</button>
              <span className="text-sm text-gray-400">Multiplicador atual: x{computeRewardMultiplier(streak).toFixed(2)}</span>
            </div>
          )}
          {awaitingEventChoice && !finished && (
            <div className="mt-4 p-3 border border-indigo-700 bg-indigo-900/20 rounded">
              <div className="text-white font-semibold">Eventos Aleatórios</div>
              {pendingEvent === 'ancient_chest' && (
                <div className="mt-2 text-gray-200">
                  Baú Antigo: abrir pode dar loot raro ou ser armadilha.
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => handleEventAction('open')} className="px-3 py-2 rounded bg-amber-600 text-black hover:bg-amber-500">Abrir</button>
                    <button onClick={() => handleEventAction('skip')} className="px-3 py-2 rounded bg-gray-600 text-white hover:bg-gray-700">Ignorar</button>
                  </div>
                </div>
              )}
              {pendingEvent === 'mystic_shrine' && (
                <div className="mt-2 text-gray-200">
                  Santuário Místico: cura HP ou concede bênção temporária.
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => handleEventAction('heal')} className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700">Cura</button>
                    <button onClick={() => handleEventAction('bless')} className="px-3 py-2 rounded bg-purple-600 text-white hover:bg-purple-700">Bênção</button>
                  </div>
                </div>
              )}
              {pendingEvent === 'mysterious_merchant' && (
                <div className="mt-2 text-gray-200">
                  Mercador Misterioso: vende itens raros por ouro coletado.
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => handleEventAction('buy')} className="px-3 py-2 rounded bg-yellow-600 text-black hover:bg-yellow-500">Comprar</button>
                    <button onClick={() => handleEventAction('skip')} className="px-3 py-2 rounded bg-gray-600 text-white hover:bg-gray-700">Recusar</button>
                  </div>
                </div>
              )}
              {pendingEvent === 'secret_gate' && (
                <div className="mt-2 text-gray-200">
                  Portão Secreto: teleporta 1-3 andares à frente (ou atrás).
                  <div className="mt-2">
                    <button onClick={() => handleEventAction('teleport')} className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Usar Portão</button>
                  </div>
                </div>
              )}
              {pendingEvent === 'echo_of_past' && (
                <div className="mt-2 text-gray-200">
                  Eco do Passado: mostra uma história curta do mundo.
                  <div className="mt-2">
                    <button onClick={() => handleEventAction('listen')} className="px-3 py-2 rounded bg-gray-600 text-white hover:bg-gray-700">Escutar</button>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="mt-4">
            <h3 className="text-white font-semibold">Registro</h3>
            <ul className="mt-2 text-sm text-gray-300 list-disc pl-5">
              {log.map((r) => (
                <li key={r.floor}>Andar {r.floor}: {r.narrative}</li>
              ))}
            </ul>
          </div>
          {log.some(r => (r.itemIdsAwarded && r.itemIdsAwarded.length > 0) || (r.itemsAwarded && r.itemsAwarded.length > 0)) && (
            <div className="mt-4">
              <h3 className="text-white font-semibold">Loot por Andar</h3>
              <ul className="mt-2 text-sm text-gray-200 list-disc pl-5">
                {log.filter(r => (r.itemIdsAwarded && r.itemIdsAwarded.length > 0) || (r.itemsAwarded && r.itemsAwarded.length > 0)).map((r) => (
                  <li key={`loot-${r.floor}`} className="flex flex-col gap-1">
                    <span>Andar {r.floor}:</span>
                    <div className="flex flex-wrap gap-2">
                      {(r.itemIdsAwarded && r.itemIdsAwarded.length > 0 ? r.itemIdsAwarded : []).map((itemId) => {
                        const item = SHOP_ITEMS.find(i => i.id === itemId);
                        const rarityClass = item?.rarity === 'lendario' ? 'bg-yellow-600' : item?.rarity === 'epico' ? 'bg-purple-600' : item?.rarity === 'raro' ? 'bg-blue-600' : 'bg-gray-600';
                        const equipable = item && (item.type === 'weapon' || item.type === 'armor' || item.type === 'accessory');
                        const consumable = item?.type === 'consumable';
                        const isEquipped = !!hero && (
                          (item?.type === 'weapon' && hero.inventory.equippedWeapon === itemId) ||
                          (item?.type === 'armor' && hero.inventory.equippedArmor === itemId) ||
                          (item?.type === 'accessory' && hero.inventory.equippedAccessory === itemId)
                        );
                        const bonusParts: string[] = [];
                        if (item?.bonus) {
                          Object.entries(item.bonus).forEach(([k, v]) => {
                            if (typeof v === 'number' && v !== 0) bonusParts.push(`${k}: ${v > 0 ? '+' : ''}${v}`);
                          });
                        }
                        const tooltip = equipable
                          ? `${item?.name} — ${bonusParts.length ? bonusParts.join(', ') : 'sem bônus'}`
                          : consumable
                          ? `${item?.name} — Consumível`
                          : item?.name || itemId;
                        return (
                          <button
                            key={`${r.floor}-${itemId}`}
                            title={tooltip}
                            onClick={() => {
                              if (!hero) return;
                              if (equipable) {
                                if (isEquipped) {
                                  const ok = unequipItem(hero.id, itemId);
                                  setLootFeedback(ok ? `${item?.name} desequipado!` : `Não foi possível desequipar ${item?.name}.`);
                                } else {
                                  const ok = equipItem(hero.id, itemId);
                                  setLootFeedback(ok ? `${item?.name} equipado!` : `Não foi possível equipar ${item?.name}.`);
                                }
                              } else if (consumable) {
                                const ok = useItem(hero.id, itemId);
                                const itemName = item?.name || itemId;
                                if (ok) {
                                  // Detalhe fica no Inventory via store; aqui damos um resumo simples
                                  setLootFeedback(`${itemName} usado! Efeito aplicado.`);
                                } else {
                                  setLootFeedback(`Não foi possível usar ${itemName}.`);
                                }
                              } else {
                                return;
                              }
                              setTimeout(() => setLootFeedback(null), 2000);
                            }}
                            className={`px-2 py-1 rounded ${rarityClass} text-white text-xs hover:opacity-90`}
                          >
                            {item?.icon ? `${item.icon} ` : ''}{item?.name || itemId}{equipable ? (isEquipped ? ' • Desequipar' : ' • Equipar') : consumable ? ' • Usar' : ''}
                          </button>
                        );
                      })}
                      {!r.itemIdsAwarded && r.itemsAwarded && r.itemsAwarded.length > 0 && (
                        <span className="px-2 py-1 rounded bg-gray-600 text-white text-xs">{r.itemsAwarded.join(', ')}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {lootFeedback && (
                <div className="mt-2 text-xs text-green-300">{lootFeedback}</div>
              )}
            </div>
          )}
          <div className="mt-4 text-sm text-gray-200">Total: {totalXP} XP, {totalGold} ouro</div>
        </div>
      )}

      {finished && (
        <div className="mt-4 p-3 bg-gray-700 rounded">
          <div className="text-lg font-semibold text-white">Run finalizada</div>
          <div className="text-sm text-gray-300">Andares concluídos: {log.length} • Total: {totalXP} XP, {totalGold} ouro</div>
          {error && <div className="mt-2 text-red-300">{error}</div>}
          <div className="mt-3 flex gap-2">
            <button onClick={saveRun} className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700">Salvar tentativa</button>
            <button onClick={resetRun} className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Reiniciar</button>
          </div>
        </div>
      )}

      {showBattle && battleEnemies.length > 0 && hero && (
        <BattleModal
          hero={hero as any}
          enemies={battleEnemies as any}
          floor={floorIndex + 1}
          partyRarityBonusPercent={(getHeroParty(hero.id)?.members.length || 0) >= 4 ? 5 : 0}
          onClose={() => setShowBattle(false)}
          onResult={(res) => {
            const currentFloor = floorIndex + 1;
            const boss = isBossFloor(currentFloor);
            const mult = computeRewardMultiplier(streak);
          const bossRewardMult = boss ? 1.5 : 1;
            const xp = Math.round((res.xpGained || 0) * mult * bossRewardMult);
            const gold = Math.round((res.goldGained || 0) * mult * bossRewardMult);

            // Aplicar recompensas e dano
            gainXP(hero.id, xp);
            gainGold(hero.id, gold);
            const curHp = hero.derivedAttributes.currentHp ?? (hero.derivedAttributes.hp || 0);
            const newHp = Math.max(0, curHp - (res.damage || 0));
            updateHero(hero.id, { derivedAttributes: { ...hero.derivedAttributes, currentHp: newHp } });

            const victory = !!res.victory;
            const result: FloorResult = {
              floor: currentFloor,
              success: victory,
              event: 'combat',
              xpGained: xp,
              goldGained: gold,
              narrative: makeNarrative(victory, 'combat', xp, gold)
            };
            const newLog = [...log, result];
            setLog(newLog);
            if (activeRunId) {
              updateDungeonRun(activeRunId, {
                max_floor_reached: newLog.length,
                total_xp: newLog.reduce((acc, r) => acc + r.xpGained, 0),
                total_gold: newLog.reduce((acc, r) => acc + r.goldGained, 0),
                logs: newLog
              });
            }

            // Drops especiais de boss: Essência Bestial e Pergaminho de Montaria
            if (victory && boss) {
              if (Math.random() < 0.3) addItemToInventory(hero.id, 'essencia-bestial', 1);
              if (Math.random() < 0.25) addItemToInventory(hero.id, 'pergaminho-montaria', 1);
            }

            if (victory) {
              logActivity.combatVictory({ heroId: hero.id, heroName: hero.name, heroClass: hero.class, enemiesDefeated: boss ? ['Boss da faixa'] : battleEnemies.map(e => e.type) });
              setAwaitingDecision(true);
            } else {
              // Derrota: penalidade maior se for boss
              if (boss) {
                const goldLoss = Math.round(totalGold * dungeonConfig.deathPenalty.normal.gold);
                const xpLoss = Math.round(totalXP * dungeonConfig.deathPenalty.normal.xp);
                gainGold(hero.id, -goldLoss);
                gainXP(hero.id, -xpLoss);
              }
              setFinished(true);
              setRunning(false);
              setAwaitingDecision(false);
            }

            setShowBattle(false);
            setBattleEnemies([]);

            if (victory && boss) {
              const rank = (hero.rankData?.currentRank || 'F') as RankLevel;
              const rankBonusMap: Record<RankLevel, number> = { F: 0, E: 0.02, D: 0.04, C: 0.06, B: 0.08, A: 0.1, S: 0.12 };
              const rb = rankBonusMap[rank] || 0;
              const essenceChance = Math.min(0.6, 0.3 + rb);
              const scrollChance = Math.min(0.5, 0.25 + rb * 0.5);
              if (Math.random() < essenceChance) addItemToInventory(hero.id, 'essencia-bestial', 1);
              if (Math.random() < scrollChance) addItemToInventory(hero.id, 'pergaminho-montaria', 1);
            }
          }}
        />
      )}
    </div>
  );
}
