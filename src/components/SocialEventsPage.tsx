import React, { useEffect, useMemo, useState } from 'react';
import { useHeroStore } from '../store/heroStore';
import { SocialEvent, listEvents, listEventsPaged, createEvent, recommendEventsPaged } from '../services/socialEventsService';
import { listFriends } from '../services/userService';
import { Link, useNavigate } from 'react-router-dom';
import { useMonetizationStore } from '../store/monetizationStore';
import { computeOccupancyPercent, isNearFull } from '../utils/eventsHelpers';
import { trackMetric } from '../utils/metricsSystem';

const SocialEventsPage: React.FC = () => {
  const { getSelectedHero } = useHeroStore();
  const me = getSelectedHero();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'explore' | 'create'>('explore');
  const [events, setEvents] = useState<SocialEvent[]>([]);
  const [recommended, setRecommended] = useState<SocialEvent[]>([]);
  const [filters, setFilters] = useState<{ tag: string }>({ tag: '' });
  const [loading, setLoading] = useState(false);
  const [sortMode, setSortMode] = useState<'date'|'occupancy'>('date');
  const [nearFullOnly, setNearFullOnly] = useState(false);
  const [limitRecommended, setLimitRecommended] = useState(6);
  const [recOffset, setRecOffset] = useState(0);
  const [limitEvents, setLimitEvents] = useState(9);
  const [eventsOffset, setEventsOffset] = useState(0);
  const [hasMoreRec, setHasMoreRec] = useState(true);
  const [hasMoreEvents, setHasMoreEvents] = useState(true);
  const [loadingMoreRec, setLoadingMoreRec] = useState(false);
  const [loadingMoreEvents, setLoadingMoreEvents] = useState(false);
  const [errorRec, setErrorRec] = useState<string | null>(null);
  const [errorEvents, setErrorEvents] = useState<string | null>(null);
  const [retryRecCount, setRetryRecCount] = useState(0);
  const [retryEventsCount, setRetryEventsCount] = useState(0);
  const [name, setName] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [locationText, setLocationText] = useState('');
  const [lat, setLat] = useState<string>('');
  const [lng, setLng] = useState<string>('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState<number>(100);
  const [tags, setTags] = useState<string>('');
  const [privacy, setPrivacy] = useState<'public' | 'private' | 'invite'>('public');
  const [invitedCsv, setInvitedCsv] = useState('');
  const [friends, setFriends] = useState<string[]>([]);
  const isLogged = !!me;
  const { seasonPassActive } = useMonetizationStore();

  const viewerId = useMemo(() => me?.id || '', [me?.id]);

  const load = async () => {
    if (!viewerId) { setEvents([]); setRecommended([]); return; }
    setLoading(true);
    try {
      try { trackMetric.featureUsed(me?.id || 'system', 'events_initial_load_started'); } catch {}
      const listPaged = await listEventsPaged(viewerId, { tag: filters.tag || undefined, limit: limitEvents, offset: 0 });
      setEvents(listPaged.items);
      setEventsOffset(listPaged.items.length);
      setHasMoreEvents(!!listPaged.pagination?.hasMore);
      const recPaged = await recommendEventsPaged(viewerId, tags ? tags.split(',').map(s => s.trim()).join(',') : undefined, { limit: limitRecommended, offset: 0 });
      setRecommended(recPaged.items);
      setRecOffset(recPaged.items.length);
      setHasMoreRec(!!recPaged.pagination?.hasMore);
      try { trackMetric.featureUsed(me?.id || 'system', 'events_initial_load_completed'); } catch {}
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [viewerId]);
  useEffect(() => { (async () => { if (!viewerId) { setFriends([]); return; } try { const f = await listFriends(viewerId); setFriends(f); } catch {} })(); }, [viewerId]);

  useEffect(() => {
    if (tab === 'create') {
      if (seasonPassActive?.active && capacity === 100) {
        setCapacity(200);
        try { trackMetric.featureUsed(me?.id || 'system', 'event_capacity_auto_applied'); } catch {}
      }
    }
  }, [tab, seasonPassActive?.active]);

  useEffect(() => {
    try { trackMetric.featureUsed(me?.id || 'system', 'events_sort_changed'); } catch {}
  }, [sortMode]);

  const showMoreRecommended = async () => {
    try {
      setLoadingMoreRec(true);
      setErrorRec(null);
      const recPaged = await recommendEventsPaged(viewerId, tags ? tags.split(',').map(s => s.trim()).join(',') : undefined, { limit: limitRecommended, offset: recOffset });
      const map = new Map<string, SocialEvent>();
      [...recommended, ...recPaged.items].forEach(e => map.set(e.id, e));
      setRecommended(Array.from(map.values()));
      setRecOffset(recOffset + recPaged.items.length);
      setHasMoreRec(!!recPaged.pagination?.hasMore);
      trackMetric.featureUsed(me?.id || 'system', 'events_load_more_backend_recommended');
    } catch {
      setErrorRec('Falha ao carregar recomendações');
      try { trackMetric.featureUsed(me?.id || 'system', 'events_load_more_backend_recommended_error'); } catch {}
      if (retryRecCount < 1) {
        setRetryRecCount(retryRecCount + 1);
        setTimeout(() => { showMoreRecommended(); }, 800);
      }
    } finally {
      setLoadingMoreRec(false);
    }
  };

  const showMoreEvents = async () => {
    try {
      setLoadingMoreEvents(true);
      setErrorEvents(null);
      const listPaged = await listEventsPaged(viewerId, { tag: filters.tag || undefined, limit: limitEvents, offset: eventsOffset });
      const map = new Map<string, SocialEvent>();
      [...events, ...listPaged.items].forEach(e => map.set(e.id, e));
      setEvents(Array.from(map.values()));
      setEventsOffset(eventsOffset + listPaged.items.length);
      setHasMoreEvents(!!listPaged.pagination?.hasMore);
      trackMetric.featureUsed(me?.id || 'system', 'events_load_more_backend_list');
    } catch {
      setErrorEvents('Falha ao carregar eventos');
      try { trackMetric.featureUsed(me?.id || 'system', 'events_load_more_backend_list_error'); } catch {}
      if (retryEventsCount < 1) {
        setRetryEventsCount(retryEventsCount + 1);
        setTimeout(() => { showMoreEvents(); }, 800);
      }
    } finally {
      setLoadingMoreEvents(false);
    }
  };

  const sortedRecommended = useMemo(() => {
    const arr = recommended.slice();
    arr.sort((a,b) => {
      if (sortMode === 'occupancy') {
        return computeOccupancyPercent(b.capacity, b.attendees) - computeOccupancyPercent(a.capacity, a.attendees);
      }
      return new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime();
    });
    return arr;
  }, [recommended, sortMode]);

  const sortedEvents = useMemo(() => {
    const arr = events.slice();
    arr.sort((a,b) => {
      if (sortMode === 'occupancy') {
        return computeOccupancyPercent(b.capacity, b.attendees) - computeOccupancyPercent(a.capacity, a.attendees);
      }
      return new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime();
    });
    return arr;
  }, [events, sortMode]);

  const handleCreate = async () => {
    if (!viewerId) return;
    const invited = invitedCsv.split(',').map(s => s.trim()).filter(Boolean);
    const payload = {
      name: name.trim(),
      dateTime: new Date(dateTime).toISOString(),
      locationText: locationText.trim() || undefined,
      lat: lat ? Number(lat) : undefined,
      lng: lng ? Number(lng) : undefined,
      description: description.trim() || undefined,
      capacity: capacity,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      privacy,
      ownerId: viewerId,
      invitedIds: invited
    };
    if (!payload.name || !payload.dateTime) return;
    setLoading(true);
    try {
      const ev = await createEvent(payload);
      setName(''); setDateTime(''); setLocationText(''); setLat(''); setLng(''); setDescription(''); setCapacity(100); setTags(''); setPrivacy('public'); setInvitedCsv('');
      setTab('explore');
      const list = await listEvents(viewerId);
      setEvents(list);
      navigate(`/event/${ev.id}`);
    } catch {}
    setLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">🎉 Eventos Sociais</h1>
        <div className="flex gap-2">
          <button onClick={() => setTab('explore')} className={`px-4 py-2 rounded ${tab==='explore'?'bg-blue-600 text-white':'bg-gray-200 text-gray-800'}`}>Explorar</button>
          <button onClick={() => setTab('create')} className={`px-4 py-2 rounded ${tab==='create'?'bg-green-600 text-white':'bg-gray-200 text-gray-800'}`}>Criar Evento</button>
          <Link to="/organizer" className="px-4 py-2 rounded bg-purple-600 text-white">Painel do Organizador</Link>
        </div>
      </div>

      {!isLogged && (
        <div className="bg-red-50 border border-red-200 p-4 rounded mb-6 text-red-700 text-sm">Selecione um herói para atuar como usuário atual.</div>
      )}

      {tab==='explore' && (
        <div className="space-y-8">
          <div className="bg-white p-4 rounded border">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-sm text-gray-700">Tag</label>
                <input value={filters.tag} onChange={(e)=>setFilters({ tag: e.target.value })} placeholder="ex: música, jogos" className="mt-1 w-full p-2 border rounded" />
              </div>
              <button onClick={load} className="px-4 py-2 rounded bg-gray-800 text-white">Filtrar</button>
              <label className="flex items-center gap-2 text-xs text-gray-600 ml-2">
                <input type="checkbox" checked={nearFullOnly} onChange={e=>setNearFullOnly(e.target.checked)} />
                Quase lotados
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-600 ml-2">
                <span>Ordenar</span>
                <select value={sortMode} onChange={e=>setSortMode(e.target.value as any)} className="px-2 py-1 rounded border">
                  <option value="date">Data</option>
                  <option value="occupancy">Ocupação</option>
                </select>
              </label>
            </div>
          </div>
          {nearFullOnly && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-3">Filtrando por eventos quase lotados (ocupação ≥ 90%).</div>
          )}
          {(loading && recommended.length===0) && (
            <div>
              <div className="text-sm text-gray-600 inline-flex items-center gap-2 mb-3">
                <span className="inline-block animate-spin h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full" />
                <span>Carregando sugestões…</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white p-4 rounded border animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                    <div className="h-3 bg-gray-200 rounded w-1/3 mt-2" />
                    <div className="h-24 bg-gray-100 rounded mt-4" />
                  </div>
                ))}
              </div>
            </div>
          )}
          {recommended.length>0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold text-gray-800">Sugestões para você</h2>
                <button onClick={load} className="px-3 py-1 rounded bg-gray-200">Atualizar</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedRecommended
                  .filter(ev => {
                    if (!nearFullOnly) return true;
                    return isNearFull(ev.capacity, ev.attendees);
                  })
                  .map(ev => (
                  <div key={ev.id} className="bg-white p-4 rounded border hover:shadow">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-lg font-semibold text-gray-800">{ev.name}</div>
                        <div className="text-xs text-gray-600">{new Date(ev.dateTime).toLocaleString()}</div>
                        {ev.locationText && <div className="text-xs text-gray-600">{ev.locationText}</div>}
                      </div>
                      <div className="text-2xl">📍</div>
                    </div>
                    {isNearFull(ev.capacity, ev.attendees) ? (<div className="mt-1 text-[11px] px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 inline-block">Quase lotado</div>) : null}
                    <div className="text-sm text-gray-700 mt-2 line-clamp-3">{ev.description}</div>
                    <div className="mt-1 text-[11px] text-gray-600">Ocupação: {computeOccupancyPercent(ev.capacity, ev.attendees)}%</div>
                    <div className="w-full h-2 bg-gray-200 rounded mt-1">
                      <div className={`h-2 rounded ${isNearFull(ev.capacity, ev.attendees) ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${computeOccupancyPercent(ev.capacity, ev.attendees)}%` }} />
                    </div>
                    <div className="mt-2 text-xs text-gray-500">{ev.tags.join(', ')}</div>
                    <div className="mt-3">
                      <button onClick={()=>navigate(`/event/${ev.id}`)} className="w-full px-3 py-2 rounded bg-blue-600 text-white">Ver Detalhes</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                {hasMoreRec ? (
                  <button onClick={showMoreRecommended} disabled={loadingMoreRec} className="px-3 py-2 rounded bg-gray-200">{loadingMoreRec ? (<span className="inline-flex items-center gap-2"><span className="inline-block animate-spin h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full" /> Carregando…</span>) : 'Mostrar mais'}</button>
                ) : (
                  <span className="text-xs text-gray-500">Fim das recomendações</span>
                )}
                {errorRec && (
                  <div className="text-xs text-red-600 mt-1 inline-flex items-center gap-2">
                    <span>{errorRec}</span>
                    <button onClick={showMoreRecommended} className="px-2 py-0.5 rounded bg-red-100 text-red-700">Tentar novamente</button>
                  </div>
                )}
              </div>
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold text-gray-800">Todos os eventos</h2>
              <button onClick={load} className="px-3 py-1 rounded bg-gray-200">Atualizar</button>
            </div>
            {(loading && events.length===0) && (
              <div>
                <div className="text-sm text-gray-600 inline-flex items-center gap-2 mb-3">
                  <span className="inline-block animate-spin h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full" />
                  <span>Carregando eventos…</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white p-4 rounded border animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-2/3" />
                      <div className="h-3 bg-gray-200 rounded w-1/3 mt-2" />
                      <div className="h-24 bg-gray-100 rounded mt-4" />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {events.length>0 ? (<>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedEvents
                  .filter(ev => {
                    if (!nearFullOnly) return true;
                    return isNearFull(ev.capacity, ev.attendees);
                  })
                  .map(ev => (
                  <div key={ev.id} className="bg-white p-4 rounded border hover:shadow">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-lg font-semibold text-gray-800">{ev.name}</div>
                        <div className="text-xs text-gray-600">{new Date(ev.dateTime).toLocaleString()}</div>
                        {ev.locationText && <div className="text-xs text-gray-600">{ev.locationText}</div>}
                      </div>
                      <div className="text-2xl">🎟️</div>
                    </div>
                    {isNearFull(ev.capacity, ev.attendees) ? (<div className="mt-1 text-[11px] px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 inline-block">Quase lotado</div>) : null}
                    <div className="text-sm text-gray-700 mt-2 line-clamp-3">{ev.description}</div>
                    <div className="mt-1 text-[11px] text-gray-600">Ocupação: {computeOccupancyPercent(ev.capacity, ev.attendees)}%</div>
                    <div className="w-full h-2 bg-gray-200 rounded mt-1">
                      <div className={`h-2 rounded ${isNearFull(ev.capacity, ev.attendees) ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${computeOccupancyPercent(ev.capacity, ev.attendees)}%` }} />
                    </div>
                    <div className="mt-2 text-xs text-gray-500">Capacidade: {ev.capacity}</div>
                    <div className="mt-3">
                      <button onClick={()=>navigate(`/event/${ev.id}`)} className="w-full px-3 py-2 rounded bg-blue-600 text-white">Ver Detalhes</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                {hasMoreEvents ? (
                  <button onClick={showMoreEvents} disabled={loadingMoreEvents} className="px-3 py-2 rounded bg-gray-200">{loadingMoreEvents ? (<span className="inline-flex items-center gap-2"><span className="inline-block animate-spin h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full" /> Carregando…</span>) : 'Mostrar mais'}</button>
                ) : (
                  <span className="text-xs text-gray-500">Fim dos resultados</span>
                )}
                {errorEvents && (
                  <div className="text-xs text-red-600 mt-1 inline-flex items-center gap-2">
                    <span>{errorEvents}</span>
                    <button onClick={showMoreEvents} className="px-2 py-0.5 rounded bg-red-100 text-red-700">Tentar novamente</button>
                  </div>
                )}
              </div>
            </>) : (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-2">🎟️</div>
                <div>Nenhum evento disponível</div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab==='create' && (
        <div className="max-w-2xl mx-auto bg-white p-6 rounded border">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700">Nome</label>
              <input value={name} onChange={e=>setName(e.target.value)} className="mt-1 w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Data/Horário</label>
              <input type="datetime-local" value={dateTime} onChange={e=>setDateTime(e.target.value)} className="mt-1 w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Localização</label>
              <input value={locationText} onChange={e=>setLocationText(e.target.value)} className="mt-1 w-full p-2 border rounded" />
              <div className="grid grid-cols-2 gap-2 mt-2">
                <input placeholder="Lat" value={lat} onChange={e=>setLat(e.target.value)} className="p-2 border rounded" />
                <input placeholder="Lng" value={lng} onChange={e=>setLng(e.target.value)} className="p-2 border rounded" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-700">Descrição</label>
              <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={4} className="mt-1 w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Limite de participantes</label>
              <input type="number" value={capacity} onChange={e=>setCapacity(Number(e.target.value))} className="mt-1 w-full p-2 border rounded" />
              <div className="text-xs text-gray-500 mt-1">{seasonPassActive?.active ? 'Passe de temporada ativo: capacidade recomendada ampliada.' : 'Capacidade padrão.'}</div>
              <div className="mt-2">
                <button onClick={()=>setCapacity(seasonPassActive?.active ? 200 : 100)} className="px-3 py-2 rounded bg-gray-800 text-white text-xs">Aplicar capacidade sugerida</button>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-700">Categorias/tags (separadas por vírgula)</label>
              <input value={tags} onChange={e=>setTags(e.target.value)} className="mt-1 w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Privacidade</label>
              <select value={privacy} onChange={e=>setPrivacy(e.target.value as any)} className="mt-1 w-full p-2 border rounded">
                <option value="public">Público</option>
                <option value="private">Privado</option>
                <option value="invite">Convidados específicos</option>
              </select>
            </div>
            {privacy !== 'public' && (
              <div>
                <label className="block text-sm text-gray-700">Convidados (IDs separados por vírgula)</label>
                <input value={invitedCsv} onChange={e=>setInvitedCsv(e.target.value)} className="mt-1 w-full p-2 border rounded" />
                {friends.length>0 && (
                  <div className="mt-2">
                    <div className="text-xs text-gray-600 mb-1">Selecione amigos para adicionar</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {friends.map(fid => (
                        <button key={fid} type="button" onClick={() => {
                          const ids = invitedCsv.split(',').map(s=>s.trim()).filter(Boolean);
                          if (!ids.includes(fid)) setInvitedCsv(ids.concat(fid).join(', '));
                        }} className="px-2 py-1 rounded bg-gray-200 text-gray-800 hover:bg-gray-300 text-xs">
                          {fid.slice(0,6)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <button onClick={handleCreate} disabled={!name.trim() || !dateTime || loading || !isLogged} className="w-full px-4 py-2 rounded bg-green-600 text-white">Criar Evento</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialEventsPage;