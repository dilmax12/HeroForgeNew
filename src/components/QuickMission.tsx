import { useEffect, useMemo, useState } from 'react';
import { useHeroStore } from '../store/heroStore';
import { generateMission, resolveMission, Mission } from '../services/missionService';
import { notificationBus } from './NotificationSystem';
import { playSuccess, playFailure, playLevelUp, resumeAudioContextIfNeeded } from '../utils/audioEffects';
import { logActivity } from '../utils/activitySystem';

export default function QuickMission({ autoStart = false, compact = false }: { autoStart?: boolean; compact?: boolean } = {}) {
  const selectedHeroId = useHeroStore(s => s.selectedHeroId);
  const heroes = useHeroStore(s => s.heroes);
  const gainXP = useHeroStore(s => s.gainXP);
  const hero = useMemo(() => heroes.find(h => h.id === selectedHeroId), [heroes, selectedHeroId]);
  const [loading, setLoading] = useState(false);
  const [mission, setMission] = useState<Mission | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [levelUp, setLevelUp] = useState<number | null>(null);

  function xpForLevel(level: number) {
    // espelha lógica do store: level*100 + (level-1)*50
    return level * 100 + (level - 1) * 50;
  }

  useEffect(() => {
    if (levelUp) {
      const t = setTimeout(() => setLevelUp(null), 1800);
      return () => clearTimeout(t);
    }
  }, [levelUp]);

  // Auto iniciar geração de missão em modo simples
  useEffect(() => {
    if (autoStart && hero && !mission && !loading) {
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, hero?.id]);

  async function handleGenerate() {
    if (!hero) return;
    resumeAudioContextIfNeeded();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const m = await generateMission({ hero: { name: hero.name, class: hero.class, level: hero.progression.level, attributes: hero.attributes } });
      setMission(m);
      // Toast de missão gerada
      notificationBus.emit({
        type: 'quest',
        title: 'Missão gerada',
        message: `${m.objective || 'Objetivo desconhecido'} • Dificuldade: ${m.difficulty}`,
        duration: 3200
      });
    } catch (err: any) {
      setError(err?.message || 'Falha ao gerar missão');
    } finally {
      setLoading(false);
    }
  }

  async function handleChoice(key: 'A' | 'B' | 'C') {
    if (!hero || !mission) return;
    resumeAudioContextIfNeeded();
    setLoading(true);
    setError('');
    try {
      const prevLevel = hero.progression.level;
      const r = await resolveMission({ mission, choice: key, hero: { level: hero.progression.level } });
      setResult(r);
      // Toast de resultado
      notificationBus.emit({
        type: 'quest',
        title: r.success ? 'Missão concluída' : 'Missão falhou',
        message: mission.objective || mission.description,
        icon: r.success ? '⚔️' : '❌',
        duration: 3500
      });
      // Áudio
      if (r.success) {
        playSuccess();
      } else {
        playFailure();
      }
      // Aplicar XP imediatamente para simplificar o MVP
      if (r?.xp) {
        gainXP(hero.id, r.xp);
        // Toast de XP
        notificationBus.emit({
          type: 'xp',
          title: 'XP Ganho!',
          message: 'Missão rápida',
          value: r.xp,
          duration: 2800
        });
        const updatedHero = heroes.find(h => h.id === hero.id);
        if (updatedHero && updatedHero.progression.level > prevLevel) {
          setLevelUp(updatedHero.progression.level);
          playLevelUp();
          // Log de level up
          logActivity.levelUp({
            heroId: updatedHero.id,
            heroName: updatedHero.name,
            heroClass: updatedHero.class,
            heroLevel: updatedHero.progression.level
          });
        }
        // Log de missão concluída
        if (r.success) {
          logActivity.questCompleted({
            heroId: hero.id,
            heroName: hero.name,
            heroClass: hero.class,
            heroLevel: hero.progression.level,
            questName: mission.objective || mission.description,
            questDifficulty: mission.difficulty,
            xpGained: r.xp
          });
        }
      }
      // Título conquistado
      if (r.title) {
        notificationBus.emit({
          type: 'achievement',
          title: 'Título conquistado!',
          message: r.title,
          icon: '👑',
          duration: 4200
        });
        logActivity.titleEarned({
          heroId: hero.id,
          heroName: hero.name,
          heroClass: hero.class,
          heroLevel: hero.progression.level,
          titleEarned: r.title
        });
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao resolver missão');
    } finally {
      setLoading(false);
    }
  }

  if (!hero) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center">
        <div className="text-6xl mb-4">🗡️</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Selecione um herói</h2>
        <p className="text-gray-600">Escolha um herói para jogar uma missão rápida.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {!compact && (
        <>
          <h2 className="text-2xl font-bold text-white">Missão Rápida</h2>
          <p className="text-gray-300">Herói: {hero.name} (Nível {hero.progression.level}) • ⭐ Estrelas: {hero.progression.stars || 0}</p>
          {hero.activeTitle && (
            <p className="text-sm text-gray-400 mt-1">Título ativo: <span className="font-medium">{hero.activeTitle}</span></p>
          )}
        </>
      )}
      <div className="mt-2">
        {(() => {
          const currentLevel = hero.progression.level;
          const xpTotal = hero.progression.xp;
          const xpCurBase = xpForLevel(currentLevel);
          const xpNextBase = xpForLevel(currentLevel + 1);
          const xpIntoLevel = Math.max(0, xpTotal - xpCurBase);
          const xpNeeded = Math.max(1, xpNextBase - xpCurBase);
          const pct = Math.min(100, Math.max(0, Math.round((xpIntoLevel / xpNeeded) * 100)));
          return (
            <div>
              <div className="text-sm text-gray-300">XP atual: {xpIntoLevel} / {xpNeeded} ({pct}%)</div>
              <div className="w-full h-2 bg-gray-700 rounded mt-1">
                <div className="h-2 bg-green-500 rounded" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })()}
      </div>

      {!compact && (
        <div className="mt-4">
          <button
            onClick={handleGenerate}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Gerando...' : mission ? 'Gerar outra missão' : 'Gerar missão'}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>
      )}

      {mission && (
        <div className="mt-6 p-4 border rounded bg-gray-800 border-gray-700 shadow-sm">
          <h3 className="text-xl font-semibold text-white">Descrição</h3>
          <p className="mt-2 text-gray-200">{mission.description}</p>
          <div className="mt-3 text-sm text-gray-300">Dificuldade: <span className="font-medium">{mission.difficulty}</span></div>

          <h4 className="mt-4 font-semibold">Escolhas</h4>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {mission.choices.map(ch => (
              <button
                key={ch.key}
                onClick={() => handleChoice(ch.key as any)}
                className="border border-gray-700 bg-gray-700 text-gray-100 px-3 py-2 rounded hover:bg-gray-600"
                disabled={loading || !!result}
              >
                <div className="font-medium text-white">{ch.key}</div>
                <div className="text-sm text-gray-200">{ch.text}</div>
                <div className="text-xs text-gray-300">Sucesso ~{Math.round(ch.success * 100)}%</div>
              </button>
            ))}
          </div>

          {result && (
            <div className="mt-4 p-3 bg-gray-700 rounded">
              <div className="text-lg font-semibold text-white">Resultado: {result.success ? 'Sucesso' : 'Falha'}</div>
              <p className="mt-1 text-gray-200">{result.narrative}</p>
              <div className="mt-2 text-sm text-gray-200">XP ganho: <span className="font-medium">{result.xp}</span></div>
              {(result.title || result.loot) && (
                <div className="mt-1 text-sm text-gray-300">{result.title ? `Título: ${result.title}` : ''} {result.loot ? `Loot: ${result.loot}` : ''}</div>
              )}
              <div className="mt-2 text-xs text-gray-300">Roll: {result.roll?.toFixed(2)} • Prob: {Math.round((result.prob || 0) * 100)}%</div>
              <div className="mt-3">
                <button onClick={() => { setMission(null); setResult(null); }} className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700">Nova missão</button>
              </div>
            </div>
          )}
        </div>
      )}

      {levelUp && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
          <div className="bg-black bg-opacity-50 absolute inset-0" />
          <div className="relative z-10 text-center p-6 rounded-xl bg-gray-800 shadow-xl border border-gray-700">
            <div className="text-5xl mb-2">🎉</div>
            <div className="text-xl font-bold text-white">Nível {levelUp} alcançado!</div>
            <div className="text-sm text-gray-300">
              +1 ⭐ Estrela • Novo título: {hero.activeTitle || '—'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
