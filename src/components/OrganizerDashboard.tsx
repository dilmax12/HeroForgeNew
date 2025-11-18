import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useHeroStore } from '../store/heroStore';
import { SocialEvent, listEvents, updateEvent, deleteEvent } from '../services/socialEventsService';
import { computeOccupancyPercent, isNearFull } from '../utils/eventsHelpers';
import { trackMetric } from '../utils/metricsSystem';

const OrganizerDashboard: React.FC = () => {
  const { getSelectedHero } = useHeroStore();
  const me = getSelectedHero();
  const ownerId = useMemo(() => me?.id || '', [me?.id]);
  const location = useLocation();
  const [events, setEvents] = useState<SocialEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [sortMode, setSortMode] = useState<'date'|'occupancy'>('date');
  const [nearFullOnly, setNearFullOnly] = useState(false);
  const { activeSeasonalTheme } = (useHeroStore() as any);
  const seasonalBorder = activeSeasonalTheme ? (seasonalThemes as any)[activeSeasonalTheme]?.border || 'border-slate-700' : 'border-slate-700';

  const load = async () => {
    if (!ownerId) { setEvents([]); return; }
    setLoading(true);
    try { const list = await listEvents(ownerId, { ownerId }); setEvents(list); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [ownerId]);

  useEffect(() => {
    try {
      const p = new URLSearchParams(location.search);
      const nf = p.get('nearFull');
      if (nf === '1') setNearFullOnly(true);
    } catch {}
  }, [location.search]);

  const save = async (id: string, updates: Partial<SocialEvent>) => {
    if (!ownerId) return;
    const ev = await updateEvent(id, ownerId, updates);
    setEvents(prev => prev.map(e => e.id===id ? ev : e));
  };

  const remove = async (id: string) => {
    if (!ownerId) return;
    const ok = await deleteEvent(id, ownerId);
    if (ok) setEvents(prev => prev.filter(e => e.id !== id));
  };

  useEffect(() => {
    try { trackMetric.custom?.('organizer_sort_changed', { mode: sortMode }); } catch {}
  }, [sortMode]);

  const exportEvents = async () => {
    try {
      if (!ownerId) return;
      const q = new URLSearchParams();
      q.set('ownerId', ownerId);
      const res = await fetch(`/api/events/export?${q.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data?.events || [], null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `events-${ownerId}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  const importEvents = async (file: File) => {
    try {
      if (!ownerId) return;
      setImporting(true);
      const text = await file.text();
      const list = JSON.parse(text);
      const res = await fetch('/api/events/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actorId: ownerId, events: Array.isArray(list) ? list : [] }) });
      if (res.ok) load();
    } catch {} finally { setImporting(false); }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {nearFullOnly && (
        <div className="mb-4 text-xs text-red-300 bg-red-900/20 border border-red-600/40 rounded p-3">Filtrando por eventos quase lotados (ocupação ≥ 90%).</div>
      )}
      {events.length>0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {(() => { const total = events.length; const avg = Math.round(events.reduce((sum,e)=> sum + computeOccupancyPercent(e.capacity, e.attendees), 0) / Math.max(1, total)); const near = events.filter(e=> isNearFull(e.capacity, e.attendees)).length; return (
            <>
              <div className={`bg-gray-800 p-4 rounded border ${seasonalBorder}`}><div className="text-sm text-slate-400">Eventos</div><div className="text-2xl font-bold text-white">{total}</div></div>
              <div className={`bg-gray-800 p-4 rounded border ${seasonalBorder}`}><div className="text-sm text-slate-400">Ocupação média</div><div className="text-2xl font-bold text-white">{avg}%</div></div>
              <div className={`bg-gray-800 p-4 rounded border ${seasonalBorder}`}><div className="text-sm text-slate-400">Quase lotados</div><div className="text-2xl font-bold text-white">{near}</div></div>
            </>
          ) })()}
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">🛠️ Painel do Organizador</h1>
        <div className="flex items-center gap-2">
          <button onClick={load} className={`${tokens.tabInactive}`}>Atualizar</button>
          <button onClick={exportEvents} className={`${tokens.tabActive}`}>Exportar</button>
          <label className={`${tokens.tabActive} cursor-pointer`}>
            Importar
            <input type="file" accept="application/json" onChange={e=>{ const f=e.target.files?.[0]; if (f) importEvents(f); }} className="hidden" />
          </label>
          {importing && <span className="text-xs text-slate-400">Importando…</span>}
          <label className="flex items-center gap-2 text-xs text-slate-400 ml-2">
            <span>Ordenar</span>
            <select value={sortMode} onChange={e=>setSortMode(e.target.value as any)} className="px-2 py-1 rounded border bg-slate-900 border-slate-600 text-slate-200">
              <option value="date">Data</option>
              <option value="occupancy">Ocupação</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-400 ml-2">
            <input type="checkbox" checked={nearFullOnly} onChange={e=>setNearFullOnly(e.target.checked)} /> Quase lotados
          </label>
        </div>
      </div>
      {!ownerId && <div className="bg-red-900/20 border border-red-600/40 p-4 rounded mb-6 text-red-300 text-sm">Selecione um herói para gerenciar seus eventos.</div>}
      {events.length>0 ? (
        <div className="space-y-4">
          {events
            .filter(e => nearFullOnly ? isNearFull((e as any).capacity, (e as any).attendees) : true)
            .slice()
            .sort((a,b) => {
              if (sortMode === 'occupancy') {
                return computeOccupancyPercent(b.capacity, b.attendees) - computeOccupancyPercent(a.capacity, a.attendees);
              }
              return new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime();
            })
            .map(e => (
            <div key={e.id} className={`bg-gray-800 p-4 rounded border ${seasonalBorder}`}>
              <div className="flex items-start justify-between">
                <div>
                  <input value={e.name} onChange={ev=>save(e.id, { name: ev.target.value })} className="text-lg font-semibold text-white w-full bg-transparent" />
                  <div className="text-xs text-slate-400">{new Date(e.dateTime).toLocaleString()}</div>
                  {(() => { const pct = computeOccupancyPercent(e.capacity, e.attendees); const near = isNearFull(e.capacity, e.attendees); return (
                    <div className="mt-1">
                      <div className="flex items-center gap-2">
                        {near && <span className="px-2 py-0.5 rounded bg-red-900/20 text-red-300 border border-red-600/40 text-[11px]">Quase lotado</span>}
                        <span className="text-[11px] text-slate-400">Ocupação: {pct}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-700 rounded mt-1">
                        <div className={`h-2 rounded ${near ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  ); })()}
                </div>
                <button onClick={()=>remove(e.id)} className="px-3 py-2 rounded bg-red-600 text-white">Excluir</button>
              </div>
              <textarea value={e.description||''} onChange={ev=>save(e.id, { description: ev.target.value })} rows={3} className="mt-2 w-full p-2 border rounded bg-slate-900 border-slate-600 text-slate-200" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                <input value={e.locationText||''} onChange={ev=>save(e.id, { locationText: ev.target.value })} placeholder="Localização" className="p-2 border rounded bg-slate-900 border-slate-600 text-slate-200" />
                <input value={e.lat?.toString()||''} onChange={ev=>save(e.id, { lat: ev.target.value ? Number(ev.target.value) : undefined })} placeholder="Lat" className="p-2 border rounded bg-slate-900 border-slate-600 text-slate-200" />
                <input value={e.lng?.toString()||''} onChange={ev=>save(e.id, { lng: ev.target.value ? Number(ev.target.value) : undefined })} placeholder="Lng" className="p-2 border rounded bg-slate-900 border-slate-600 text-slate-200" />
                <input type="number" value={e.capacity} onChange={ev=>save(e.id, { capacity: Number(ev.target.value) })} placeholder="Capacidade" className="p-2 border rounded bg-slate-900 border-slate-600 text-slate-200" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                <select value={e.privacy} onChange={ev=>save(e.id, { privacy: ev.target.value as any })} className="p-2 border rounded bg-slate-900 border-slate-600 text-slate-200">
                  <option value="public">Público</option>
                  <option value="private">Privado</option>
                  <option value="invite">Convidados</option>
                </select>
                <input value={(e.tags||[]).join(', ')} onChange={ev=>save(e.id, { tags: ev.target.value.split(',').map(s=>s.trim()).filter(Boolean) })} placeholder="Tags" className="p-2 border rounded col-span-3 bg-slate-900 border-slate-600 text-slate-200" />
              </div>
              <div className="text-xs text-slate-400 mt-2">ID: {e.id}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-slate-400">
          <div className="text-6xl mb-2">🛠️</div>
          <div>Nenhum evento criado</div>
        </div>
      )}
    </div>
  );
};

export default OrganizerDashboard;
import { seasonalThemes } from '../styles/medievalTheme';
import { tokens } from '../styles/designTokens';