import React, { useMemo, useState } from 'react';
import { useHeroStore } from '../store/heroStore';
import { seasonalThemes } from '../styles/medievalTheme';

const ActivitiesPanel: React.FC = () => {
  const { activitiesLog } = useHeroStore() as any;
  const [filter, setFilter] = useState<'all'|'dialogue'|'rumor'|'tip'|'event'>('all');
  const [loc, setLoc] = useState<'all'|'tavern'|'guild'>('all');
  const items = useMemo(() => {
    const arr = Array.isArray(activitiesLog) ? activitiesLog : [];
    return arr
      .filter((e: any) => (filter==='all'|| e.type===filter) && (loc==='all' || e.location===loc))
      .sort((a: any,b: any) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  }, [activitiesLog, filter, loc]);
  const seasonalBorder = (seasonalThemes as any)[useHeroStore.getState().useMonetizationStore?.activeSeasonalTheme || '']?.border || 'border-slate-700';
  return (
    <div className={`bg-gray-800 p-6 rounded-lg border ${seasonalBorder} text-slate-200`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-2xl font-bold text-white">🗂️ Atividades</h2>
        <div className="flex items-center gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="border rounded px-2 py-1 text-sm bg-slate-900 border-slate-600 text-slate-200">
            <option value="all">Todas</option>
            <option value="dialogue">Diálogos</option>
            <option value="rumor">Rumores</option>
            <option value="tip">Dicas</option>
            <option value="event">Eventos</option>
          </select>
          <select value={loc} onChange={(e) => setLoc(e.target.value as any)} className="border rounded px-2 py-1 text-sm bg-slate-900 border-slate-600 text-slate-200">
            <option value="all">Todos locais</option>
            <option value="tavern">Taverna</option>
            <option value="guild">Guilda</option>
          </select>
        </div>
      </div>
      <ul className="space-y-2">
        {items.map((e: any, idx: number) => (
          <li key={`${e.ts}-${idx}`} className="p-3 rounded border bg-slate-800 border-slate-700 flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-100">{e.text}</div>
              <div className="text-xs text-slate-400">{new Date(e.ts).toLocaleString()} • {e.location || '—'} • {e.type}</div>
            </div>
            <div className="text-xs text-slate-400">{e.importance === 'high' ? 'Importante' : e.importance === 'low' ? 'Leve' : 'Normal'}</div>
          </li>
        ))}
        {items.length === 0 && (
          <li className="p-3 rounded border bg-slate-800 border-slate-700 text-sm text-slate-400">Sem atividades no filtro atual.</li>
        )}
      </ul>
    </div>
  );
};

export default ActivitiesPanel;