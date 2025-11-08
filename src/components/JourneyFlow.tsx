import React, { useMemo, useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useHeroStore } from '../store/heroStore';
import { medievalTheme } from '../styles/medievalTheme';
import NarrativeChapters from './NarrativeChapters';
import { getOrRunDailyResult } from '../services/idleBattleService';

const StepCard: React.FC<{
  title: string;
  description: string;
  icon: string;
  ctaLabel: string;
  to: string;
  highlight?: boolean;
}> = ({ title, description, icon, ctaLabel, to, highlight }) => {
  const navigate = useNavigate();
  return (
    <div
      className={`rounded-xl p-6 border transition-all duration-300 ${
        highlight ? 'border-amber-400 bg-amber-900/10' : 'border-white/20 bg-white/10'
      } hover:bg-white/15 hover:border-amber-400`}
    >
      <div className="flex items-start space-x-4">
        <div className="text-4xl">{icon}</div>
        <div className="flex-1">
          <div className="text-xl font-bold text-amber-300 mb-1">{title}</div>
          <div className="text-gray-300 text-sm mb-4">{description}</div>
          <button
            onClick={() => navigate(to)}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-yellow-600 text-white font-semibold hover:from-amber-700 hover:to-yellow-700 transition-all duration-200"
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const ProgressBar: React.FC<{ percent: number; label?: string }> = ({ percent, label }) => {
  return (
    <div>
      {label && <div className="text-xs text-gray-400 mb-1">{label}</div>}
      <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-3 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full transition-all duration-500"
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
      </div>
    </div>
  );
};

const JourneyFlow: React.FC = () => {
  const { getSelectedHero, heroes } = useHeroStore();
  const hero = getSelectedHero();
  const [daily, setDaily] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const referralCode = new URLSearchParams(location.search).get('ref') || undefined;

  // Redirecionar primeira visita para a introdução cinematográfica
  useEffect(() => {
    try {
      const seen = localStorage.getItem('introSeen');
      if (!seen) {
        navigate('/intro');
      }
    } catch {}
  }, []);

  const xpPercent = useMemo(() => {
    if (!hero) return 0;
    const currentXp = hero.progression?.xp ?? 0;
    const level = hero.progression?.level ?? 1;
    const nextLevelXp = level * 100 + (level - 1) * 50;
    const prevLevelXp = (level - 1) * 100 + (level - 2 >= 0 ? (level - 2) * 50 : 0);
    const inLevelXp = Math.max(0, currentXp - prevLevelXp);
    const levelSpan = Math.max(1, nextLevelXp - prevLevelXp);
    return Math.round((inLevelXp / levelSpan) * 100);
  }, [hero]);

  useEffect(() => {
    if (hero) {
      const result = getOrRunDailyResult(hero);
      setDaily(result);
    }
  }, [hero]);

  async function submitDaily() {
    if (!hero) return;
    try {
      setSubmitting(true);
      await fetch('/api/daily/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hero })
      });
      const resp = await fetch('/api/daily/leaderboard');
      const data = await resp.json();
      setLeaderboard(Array.isArray(data?.entries) ? data.entries : []);
    } catch (err) {
      console.warn('Falha ao enviar resultado diário:', err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-amber-400 font-serif mb-2">
          {medievalTheme.icons.ui.guild} Jornada do Herói
        </h1>
        <p className="text-gray-300">Fluxo minimalista para começar e evoluir rápido.</p>
      </div>

      {/* Status Rápido */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl p-4 bg-white/10 border border-white/20">
          <div className="text-sm text-gray-400">Heróis</div>
          <div className="text-2xl font-bold">{heroes.length}</div>
        </div>
        <div className="rounded-xl p-4 bg-white/10 border border-white/20">
          <div className="text-sm text-gray-400">Nível</div>
          <div className="text-2xl font-bold">{hero?.progression?.level ?? 1}</div>
        </div>
        <div className="rounded-xl p-4 bg-white/10 border border-white/20">
          <ProgressBar percent={xpPercent} label="Progresso para o próximo nível" />
        </div>
      </div>

      {/* Capítulos sugeridos pela IA */}
      <NarrativeChapters />

      {/* Resultados Diários (Modo Ocioso) */}
      <div className="mt-8 rounded-xl p-6 bg-white/10 border border-white/20" data-testid="idle-daily-panel">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xl font-bold text-amber-300">{medievalTheme.icons.ui.calendar} Resultados Diários</div>
          <button
            onClick={submitDaily}
            disabled={!hero || submitting}
            className={`px-4 py-2 rounded-lg text-white font-semibold transition-all duration-200 ${submitting ? 'bg-gray-600' : 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700'}`}
          >
            {submitting ? 'Enviando...' : 'Enviar para Ranking'}
          </button>
        </div>
        {daily && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="rounded-lg p-4 bg-white/5 border border-white/10">
              <div className="text-sm text-gray-400">Execuções</div>
              <div className="text-2xl font-bold">{daily.runs?.length ?? 0}</div>
            </div>
            <div className="rounded-lg p-4 bg-white/5 border border-white/10">
              <div className="text-sm text-gray-400">XP Hoje</div>
              <div className="text-2xl font-bold">{daily.xpTotal ?? 0}</div>
            </div>
            <div className="rounded-lg p-4 bg-white/5 border border-white/10">
              <div className="text-sm text-gray-400">Ouro Hoje</div>
              <div className="text-2xl font-bold">{daily.goldTotal ?? 0}</div>
            </div>
            <div className="rounded-lg p-4 bg-white/5 border border-white/10">
              <div className="text-sm text-gray-400">Vitórias</div>
              <div className="text-2xl font-bold">{daily.victories ?? 0}</div>
            </div>
          </div>
        )}
        {Array.isArray(leaderboard) && leaderboard.length > 0 && (
          <div className="mt-4">
            <div className="text-sm text-gray-300 mb-2">Top de hoje</div>
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((entry: any, idx: number) => (
                <div key={`${entry.heroId}_${idx}`} className={`flex items-center justify-between p-3 rounded-lg border ${hero && entry.heroId === (hero.id || hero.name) ? 'border-amber-400 bg-amber-900/10' : 'border-white/10 bg-white/5'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400">#{idx + 1}</span>
                    <span className="font-semibold text-white">{entry.heroName}</span>
                    <span className="text-gray-400 text-sm">({entry.class})</span>
                  </div>
                  <div className="text-sm text-gray-200">
                    <span className="mr-3">XP: {entry.xpToday}</span>
                    <span className="mr-3">Ouro: {entry.goldToday}</span>
                    <span>Vitórias: {entry.victoriesToday}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Passos Essenciais */}
      <div className="space-y-4">
        <StepCard
          title="Criar Herói (com IA)"
          description="Nome, frase, imagem e história gerados pela IA."
          icon="🛠️"
          ctaLabel="Forjar Herói"
          to={referralCode ? `/create?ref=${referralCode}` : "/create"}
          highlight={!hero}
        />
        <StepCard
          title="Ver Galeria"
          description="Veja seus heróis e personalize visuais."
          icon="🖼️"
          ctaLabel="Abrir Galeria"
          to="/gallery"
        />
        <StepCard
          title="Missões IA"
          description="Desafios com escolhas que afetam XP, ouro e reputação."
          icon="🗡️"
          ctaLabel="Ir para Missões"
          to="/quests"
        />
        <StepCard
          title="Evoluir Herói"
          description="Ganhe XP e suba de nível com recompensas visuais."
          icon="🏆"
          ctaLabel="Ver Evolução"
          to="/evolution"
        />
      </div>

      {/* Banner de Convite */}
      {referralCode && (
        <div className="mt-6 rounded-xl p-4 bg-emerald-900/20 border border-emerald-500/40">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-emerald-300">🎁 Convite recebido</div>
              <div className="text-sm text-gray-200">Crie seu herói com este convite para ajudar quem te convidou a ganhar bônus.</div>
            </div>
            <Link
              to={`/create?ref=${referralCode}`}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              Criar com convite
            </Link>
          </div>
        </div>
      )}

      {/* Secção Final */}
      <div className="mt-10 rounded-xl p-6 bg-white/5 border border-white/10">
        <div className="text-gray-300 text-sm mb-3">No final da jornada:</div>
        <div className="flex flex-wrap gap-3">
          <Link to="/leaderboards" className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm">
            {medievalTheme.icons.ui.leaderboard} Ranking
          </Link>
          <Link to="/shop" className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm">
            🏪 Loja
          </Link>
          <span className="px-3 py-2 rounded-lg bg-gray-800 text-gray-400 text-sm">
            🏰 Comunidade (Futuro)
          </span>
        </div>
      </div>
    </div>
  );
};

export default JourneyFlow;
