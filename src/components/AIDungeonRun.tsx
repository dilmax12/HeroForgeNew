import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHeroStore } from '../store/heroStore';
import { dynamicMissionsAI } from '../services/dynamicMissionsAI';
import { generateOutcomeNarrative } from '../services/narratorAI';
import { resolveCombat } from '../utils/combat';
import BattleModal from './BattleModal';
import { worldStateManager } from '../utils/worldState';
import { rankSystem } from '../utils/rankSystem';

type StageOutcome = {
  success: boolean;
  narrative: string;
  xp?: number;
  gold?: number;
  loot?: string;
  combat?: {
    enemies: string[];
    victory: boolean;
  };
  rest?: { healedHp: number };
  chest?: { isMimic: boolean; item?: string };
};

// Etapas por rank: F/E=3, D/C=4, B=5, A=6, S=7
const getStageCountByRank = (rank?: 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S') => {
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

export default function AIDungeonRun() {
  const hero = useHeroStore(s => s.getSelectedHero());
  const getHeroParty = useHeroStore(s => s.getHeroParty);
  const updateHero = useHeroStore(s => s.updateHero);
  const gainXP = useHeroStore(s => s.gainXP);
  const gainGold = useHeroStore(s => s.gainGold);
  const updateDailyGoalProgress = useHeroStore(s => s.updateDailyGoalProgress);

  const [stageIndex, setStageIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState('');
  const [choices, setChoices] = useState<Array<{ key: string; text: string; success: number }>>([]);
  const [outcome, setOutcome] = useState<StageOutcome | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [battleEnemies, setBattleEnemies] = useState<Array<{ type: string; count: number; level?: number }>>([]);
  const [showBattle, setShowBattle] = useState(false);
  const [pendingEvent, setPendingEvent] = useState<'none' | 'combat' | 'rest' | 'chest'>('none');
  const [pendingChoice, setPendingChoice] = useState<string>('');
  const [pendingSuccess, setPendingSuccess] = useState<boolean>(false);
  const [runCounted, setRunCounted] = useState(false);

  const stagesTotal = useMemo(() => {
    const currentRank = hero?.rankData?.currentRank as ('F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S') | undefined;
    return getStageCountByRank(currentRank);
  }, [hero?.rankData?.currentRank]);

  const difficulty: 'easy' | 'medium' | 'hard' = useMemo(() => {
    const lvl = hero?.progression.level || 1;
    if (lvl < 4) return 'easy';
    if (lvl < 8) return 'medium';
    return 'hard';
  }, [hero?.progression.level]);

  const maxHp = hero?.derivedAttributes.hp || 1;
  const currentHp = hero?.derivedAttributes.currentHp ?? maxHp;
  const isRecovering = currentHp <= 0;

  const inflightRef = useRef(false);

  useEffect(() => {
    // Gera a descrição e as opções da etapa atual via IA
    const run = async () => {
      if (inflightRef.current) return; // evita chamadas concorrentes
      inflightRef.current = true;
      setLoading(true);
      setOutcome(null);
      try {
        if (!hero) return;
        const ctx = `Masmorra IA — Etapa ${stageIndex + 1}/${stagesTotal}. Herói: ${hero.name} nível ${hero.progression.level}.`; 
        const aiMission = await dynamicMissionsAI.generateMission({ hero, missionType: 'mystery', difficulty, context: ctx });
        setDescription(aiMission.description);
        // Opções genéricas com chances baseadas em atributos simples do herói
        const base = Math.min(0.85, 0.3 + (hero.derivedAttributes.power || 5) / 40);
        const cautious = Math.min(0.95, base + 0.1);
        const bold = Math.max(0.25, base - 0.1);
        setChoices([
          { key: 'Explorar', text: 'Explorar a sala e procurar pistas', success: base },
          { key: 'Cautela', text: 'Avançar com cautela evitando armadilhas', success: cautious },
          { key: 'Audácia', text: 'Forçar passagem correndo riscos por recompensas', success: bold },
        ]);
      } catch (err) {
        // Fallback visual quando a geração da missão falhar
        console.warn('[AIDungeonRun] Falha ao gerar missão IA, usando opções locais:', err);
        const base = Math.min(0.85, 0.3 + (hero?.derivedAttributes.power || 5) / 40);
        const cautious = Math.min(0.95, base + 0.1);
        const bold = Math.max(0.25, base - 0.1);
        setDescription(`Etapa ${stageIndex + 1}/${stagesTotal}: A sala está silenciosa, com marcas de batalha recentes nas paredes.`);
        setChoices([
          { key: 'Explorar', text: 'Vasculhar a área em busca de pistas', success: base },
          { key: 'Cautela', text: 'Prosseguir com cuidado, evitando armadilhas', success: cautious },
          { key: 'Audácia', text: 'Forçar passagem em busca de atalhos', success: bold },
        ]);
      } finally {
        setLoading(false);
        inflightRef.current = false;
      }
    };
    run();
  }, [stageIndex, hero?.id, difficulty, stagesTotal]);

  if (!hero) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center">
        <h2 className="text-2xl font-bold mb-2">Masmorra IA</h2>
        <p className="text-gray-600">Nenhum herói selecionado. Selecione um herói para iniciar a aventura.</p>
      </div>
    );
  }

  const STAMINA_COST_PER_STAGE = 2;
  const applyStaminaCost = (amount: number) => {
    worldStateManager.consumeStamina(hero, amount);
    updateHero(hero.id, { stamina: hero.stamina });
  };

  const healHero = (amount: number) => {
    const heroId = hero.id;
    const maxHp = hero.derivedAttributes.hp || 20;
    const curHp = hero.derivedAttributes.currentHp ?? maxHp;
    const healed = Math.min(maxHp, curHp + amount);
    updateHero(heroId, { derivedAttributes: { ...hero.derivedAttributes, currentHp: healed } });
    return healed - curHp;
  };

  const handleChoice = async (key: string, successChance: number) => {
    if (loading) return;
    if (isRecovering) return; // Penalidade: não pode avançar enquanto em recuperação
    setLoading(true);
    try {
      applyStaminaCost(STAMINA_COST_PER_STAGE);

      const roll = Math.random();
      const success = roll < successChance;

      // Decide evento desta etapa
      let event: 'none' | 'combat' | 'rest' | 'chest' = 'none';
      const r = Math.random();
      if (!success) {
        event = r < 0.7 ? 'combat' : 'chest';
      } else {
        if (r < 0.3) event = 'rest';
        else if (r < 0.6) event = 'chest';
        else event = 'none';
      }

      let stageOutcome: StageOutcome = { success, narrative: '' };

      if (event === 'combat') {
        const templates = ['Goblin', 'Esqueleto', 'Bandido'];
        const chosen = templates[Math.floor(Math.random() * templates.length)];
        const questEnemies = [{ type: chosen, count: 1, level: hero.progression.level }];
        setBattleEnemies(questEnemies);
        setPendingEvent('combat');
        setPendingChoice(key);
        setPendingSuccess(success);
        setShowBattle(true);
        setLoading(false);
        return; // narrativa e outcome serão tratados após batalha
      } else if (event === 'rest') {
        const healed = healHero(Math.round((hero.derivedAttributes.hp || 20) * 0.35));
        stageOutcome.rest = { healedHp: healed };
        stageOutcome.xp = success ? 6 : 3;
        gainXP(hero.id, stageOutcome.xp);
      } else if (event === 'chest') {
        const isMimic = Math.random() < 0.28;
        if (isMimic) {
          const chosen = 'Esqueleto';
          const questEnemies = [{ type: chosen, count: 1, level: hero.progression.level }];
          setBattleEnemies(questEnemies);
          setPendingEvent('chest');
          setPendingChoice(key);
          setPendingSuccess(success);
          setOutcome({ success, narrative: '', chest: { isMimic: true, gold: 0 } });
          setShowBattle(true);
          setLoading(false);
          return;
        } else {
          // Nas masmorras não há pagamento de ouro
          const items = ['Poção de Cura', 'Runas antigas', 'Talismã simples'];
          const item = Math.random() < 0.5 ? items[Math.floor(Math.random() * items.length)] : undefined;
          stageOutcome.chest = { isMimic: false, item };
          stageOutcome.xp = 8;
          gainXP(hero.id, 8);
        }
      } else {
        // apenas progresso
        stageOutcome.xp = success ? 8 : 3;
        gainXP(hero.id, stageOutcome.xp);
      }

      const rewardSummary = `${stageOutcome.xp ? `${stageOutcome.xp} XP` : ''}`;
      const consequence = event === 'combat' ? (stageOutcome.combat?.victory ? 'vitória em combate' : 'derrota em combate')
        : event === 'rest' ? 'recupera forças na sala de descanso'
        : event === 'chest' ? (stageOutcome.chest?.isMimic ? 'baú era um mímico' : 'baú com tesouros')
        : 'progresso seguro';
      const line = await generateOutcomeNarrative({
        heroName: hero.name,
        questTitle: 'Masmorra IA',
        success: stageOutcome.success,
        rewardSummary,
        consequence,
      });
      stageOutcome.narrative = line;
      setOutcome(stageOutcome);
      setLog(prev => [...prev, `Etapa ${stageIndex + 1}: ${line}`]);
    } finally {
      setLoading(false);
    }
  };

  const nextStage = () => {
    if (stageIndex + 1 >= stagesTotal) return;
    setStageIndex(i => i + 1);
  };

  const restart = () => {
    setStageIndex(0);
    setDescription('');
    setChoices([]);
    setOutcome(null);
    setLog([]);
    setRunCounted(false);
  };

  const finished = stageIndex + 1 >= stagesTotal && !!outcome;

  // Ao concluir as etapas, contar como missão concluída para progresso de rank
  useEffect(() => {
    if (!finished || runCounted) return;
    const store = useHeroStore.getState();
    const current = store.heroes.find(h => h.id === hero.id);
    if (!current) return;
    const newStats = {
      ...current.stats,
      questsCompleted: (current.stats.questsCompleted || 0) + 1,
      lastActiveAt: new Date().toISOString()
    };
    // Atualizar estatísticas do herói
    store.updateHero(hero.id, { stats: newStats });
    // Garantir rankData e atualizar progresso de rank
    const ensuredRankData = current.rankData ?? rankSystem.initializeRankData(current);
    const newRankData = rankSystem.updateRankData({ ...current, stats: newStats }, ensuredRankData);
    store.updateHero(hero.id, { rankData: newRankData });
    // Atualizar metas diárias de missão concluída
    updateDailyGoalProgress(hero.id, 'quest-completed', 1);
    setRunCounted(true);
  }, [finished, runCounted, hero.id, updateDailyGoalProgress]);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-white">Masmorra IA</h2>
      <p className="text-gray-300">Etapa {stageIndex + 1} de {stagesTotal} • Dificuldade: {difficulty}</p>
      <div className="mt-4 p-4 border rounded bg-gray-800 border-gray-700">
        <p className="text-gray-200 whitespace-pre-line">{description}</p>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          {choices.map(ch => (
            <button
              key={ch.key}
              onClick={() => handleChoice(ch.key, ch.success)}
              className="border border-gray-700 bg-gray-700 text-gray-100 px-3 py-2 rounded hover:bg-gray-600 disabled:opacity-50"
              disabled={loading || !!outcome || showBattle}
            >
              <div className="font-medium text-white">{ch.key}</div>
              <div className="text-sm text-gray-200">{ch.text}</div>
              <div className="text-xs text-gray-300">Sucesso ~{Math.round(ch.success * 100)}%</div>
            </button>
          ))}
        </div>

        {outcome && (
          <div className="mt-4 p-3 bg-gray-700 rounded">
            <div className="text-lg font-semibold text-white">Resultado: {outcome.success ? 'Sucesso' : 'Falha'}</div>
            <p className="mt-1 text-gray-200">{outcome.narrative}</p>
            {outcome.rest && (
              <div className="mt-2 text-sm text-gray-300">Sala de descanso: +{outcome.rest.healedHp} HP</div>
            )}
            {outcome.chest && (
              <div className="mt-2 text-sm text-gray-300">{outcome.chest.isMimic ? 'Era um Mímico!' : `Baú encontrado`} {outcome.chest.item ? `• Item: ${outcome.chest.item}` : ''}</div>
            )}
            {outcome.combat && (
              <div className="mt-2 text-sm text-gray-300">Combate contra {outcome.combat.enemies.join(', ')} — {outcome.combat.victory ? 'Vitória' : 'Derrota'}</div>
            )}
            {outcome.xp && (
              <div className="mt-1 text-xs text-gray-300">Recompensas: {outcome.xp} XP</div>
            )}
            <div className="mt-3 flex gap-2">
              {!finished && (
                <button onClick={nextStage} className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700">Prosseguir</button>
              )}
              {finished && (
                <button onClick={restart} className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Reiniciar masmorra</button>
              )}
            </div>
          </div>
        )}

        <div className="mt-6">
          <h3 className="text-white font-semibold">Registro</h3>
          <ul className="mt-2 text-sm text-gray-300 list-disc pl-5">
            {log.map((l, i) => <li key={i}>{l}</li>)}
          </ul>
        </div>
      </div>
      {showBattle && battleEnemies.length > 0 && (
        <BattleModal
          hero={hero}
          enemies={battleEnemies as any}
          floor={stageIndex + 1}
          partyRarityBonusPercent={(getHeroParty(hero.id)?.members.length || 0) >= 4 ? 5 : 0}
          onClose={() => setShowBattle(false)}
          onResult={(res) => {
            // aplicar recompensas e narrativa pós-batalha
            gainXP(hero.id, res.xpGained || 0);

            // Aplicar dano ao HP atual e verificar morte (recuperação)
            const curHp = hero.derivedAttributes.currentHp ?? (hero.derivedAttributes.hp || 0);
            const newHp = Math.max(0, curHp - (res.damage || 0));
            updateHero(hero.id, { derivedAttributes: { ...hero.derivedAttributes, currentHp: newHp } });

            const victory = res.victory;
            const rewardSummary = `${res.xpGained || 0} XP`;
            const consequence = pendingEvent === 'combat' ? (victory ? 'vitória em combate' : 'derrota em combate') : 'baú era um mímico';

            generateOutcomeNarrative({
              heroName: hero.name,
              questTitle: 'Masmorra IA',
              success: pendingSuccess || victory,
              rewardSummary,
              consequence,
            }).then(line => {
              const updated: StageOutcome = {
                success: pendingSuccess || victory,
                narrative: line,
                xp: (outcome?.xp || 0) + (res.xpGained || 0),
                combat: { enemies: battleEnemies.map(e => e.type), victory },
                rest: outcome?.rest,
                chest: outcome?.chest || (pendingEvent === 'chest' ? { isMimic: true } : undefined),
              };
              setOutcome(updated);
              setLog(prev => [...prev, `Etapa ${stageIndex + 1}: ${line}`]);
              if (newHp <= 0) {
                setLog(prev => [...prev, `⚠️ ${hero.name} caiu na masmorra e está em recuperação. Aguarde a regeneração de vida.`]);
              }
              setShowBattle(false);
              setBattleEnemies([]);
              setPendingEvent('none');
              setPendingChoice('');
              setPendingSuccess(false);
            });
          }}
        />
      )}
    </div>
  );
}
