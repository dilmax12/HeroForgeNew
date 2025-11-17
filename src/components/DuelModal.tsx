import React, { useEffect, useState } from 'react';
import { useHeroStore } from '../store/heroStore';
import { Sword, Wand2, UserX, Heart, Target, Crown, Shield, Droplets } from 'lucide-react';
import { SHOP_ITEMS } from '../utils/shop';

const DuelModal: React.FC = () => {
  const { duelOverlay, setDuelOverlay } = useHeroStore() as any;
  const open = !!duelOverlay;
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(1200);
  useEffect(() => { setStep(0); }, [open]);
  useEffect(() => {
    if (!playing) return;
    const iv = setInterval(() => setStep(s => Math.min((duelOverlay.log || []).length - 1, s + 1)), Math.max(300, speedMs));
    return () => clearInterval(iv);
  }, [playing, speedMs, duelOverlay]);
  if (!open) return null;
  const log: string[] = duelOverlay.log || [];
  const a = duelOverlay.aName || 'Herói A';
  const b = duelOverlay.bName || 'Herói B';
  const winnerId = duelOverlay.winnerId;
  const turns = duelOverlay.turns;
  const rewards = duelOverlay.rewards || { xp: 0, gold: 0 };
  const frames = duelOverlay.frames || [];
  const initial = duelOverlay.initial || { aHp: 1, bHp: 1, aMp: 1, bMp: 1 };
  const line = log[step] || '';
  const isMagic = /lançou magia/.test(line);
  const isCrit = /(crítico)/.test(line);
  const aHpNow = frames[step]?.aHp ?? initial.aHp;
  const bHpNow = frames[step]?.bHp ?? initial.bHp;
  const aMpNow = frames[step]?.aMp ?? initial.aMp;
  const bMpNow = frames[step]?.bMp ?? initial.bMp;
  const aHpPct = Math.max(0, Math.min(100, Math.floor((aHpNow / initial.aHp) * 100)));
  const bHpPct = Math.max(0, Math.min(100, Math.floor((bHpNow / initial.bHp) * 100)));
  const aMpPct = Math.max(0, Math.min(100, Math.floor((aMpNow / initial.aMp) * 100)));
  const bMpPct = Math.max(0, Math.min(100, Math.floor((bMpNow / initial.bMp) * 100)));
  const classIcon = (cls: string) => {
    switch (cls) {
      case 'guerreiro': return <Sword className="w-5 h-5"/>;
      case 'mago': return <Wand2 className="w-5 h-5"/>;
      case 'ladino': return <UserX className="w-5 h-5"/>;
      case 'clerigo': return <Heart className="w-5 h-5"/>;
      case 'patrulheiro': return <Target className="w-5 h-5"/>;
      case 'paladino': return <Crown className="w-5 h-5"/>;
      default: return <Sword className="w-5 h-5"/>;
    }
  };
  const aClass = duelOverlay.aClass || 'guerreiro';
  const bClass = duelOverlay.bClass || 'guerreiro';
  const findItemIcon = (id?: string) => {
    if (!id) return null;
    const it = SHOP_ITEMS.find(i => i.id === id);
    return it?.icon || null;
  };
  const aWeaponIcon = findItemIcon(duelOverlay.aWeaponId);
  const bWeaponIcon = findItemIcon(duelOverlay.bWeaponId);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={() => setDuelOverlay(undefined)} />
      <div className="relative w-full max-w-xl bg-white rounded-lg border border-gray-300 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-bold text-lg text-gray-800">⚔️ Duelo</div>
          <button onClick={() => setDuelOverlay(undefined)} className="text-gray-600">✖</button>
        </div>
        <div className="text-sm text-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">{classIcon(aClass)} <span>{a}</span> {aWeaponIcon && <span className="text-xl">{aWeaponIcon}</span>}</div>
          <div>Turnos: {turns}</div>
          <div className="flex items-center gap-2"><span>{b}</span> {classIcon(bClass)} {bWeaponIcon && <span className="text-xl">{bWeaponIcon}</span>}</div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-gray-600"><Shield className="w-3 h-3"/> HP</div>
            <div className="h-3 bg-gray-200 rounded overflow-hidden">
              <div className="h-3 bg-emerald-500 transition-all duration-500" style={{ width: `${aHpPct}%` }} />
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600"><Droplets className="w-3 h-3"/> MP</div>
            <div className="h-3 bg-gray-200 rounded overflow-hidden">
              <div className="h-3 bg-blue-500 transition-all duration-500" style={{ width: `${aMpPct}%` }} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-gray-600"><Shield className="w-3 h-3"/> HP</div>
            <div className="h-3 bg-gray-200 rounded overflow-hidden">
              <div className="h-3 bg-red-500 transition-all duration-500" style={{ width: `${bHpPct}%` }} />
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600"><Droplets className="w-3 h-3"/> MP</div>
            <div className="h-3 bg-gray-200 rounded overflow-hidden">
              <div className="h-3 bg-indigo-500 transition-all duration-500" style={{ width: `${bMpPct}%` }} />
            </div>
          </div>
        </div>
        <div className={`mt-3 h-32 rounded flex items-center justify-center ${isMagic ? 'bg-purple-100' : 'bg-amber-100'} ${isCrit ? 'ring-2 ring-red-400' : ''}`}>
          <div className="text-center">
            <div className="text-xl font-semibold text-gray-800">{line || '—'}</div>
            <div className="mt-2 text-4xl">{isMagic ? '✨' : '⚔️'}{isCrit ? '💥' : ''}</div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <button onClick={() => setStep(s => Math.max(0, s - 1))} className="px-3 py-1 rounded bg-gray-600 text-white hover:bg-gray-700">Anterior</button>
          <div className="text-xs text-gray-500">{step + 1}/{log.length}</div>
          <button onClick={() => setStep(s => Math.min(log.length - 1, s + 1))} className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700">Próximo</button>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setPlaying(p => !p)} className={`px-3 py-1 rounded ${playing ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white`}>{playing ? 'Pausar' : 'Play'}</button>
            <label className="text-xs text-gray-600 flex items-center gap-1">
              <input type="checkbox" onChange={(e) => {
                if (e.target.checked) { setPlaying(true); }
              }} /> Até o fim
            </label>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span>Velocidade</span>
            <input type="range" min={300} max={2000} step={100} value={speedMs} onChange={(e) => setSpeedMs(Number(e.target.value))} />
          </div>
        </div>
        <div className="mt-3 p-2 bg-gray-50 rounded border text-sm text-gray-700">Recompensas: {rewards.xp} XP • {rewards.gold} ouro</div>
        <div className="mt-2 text-xs text-gray-500">Vencedor: {winnerId}</div>
      </div>
    </div>
  );
};

export default DuelModal;