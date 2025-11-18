import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useHeroStore } from '../store/heroStore';
import { SocialEvent, getEvent, attendEvent, fetchEventChat, sendEventChat, listEventMedia, addEventMedia, rateEvent, updateEvent } from '../services/socialEventsService';
import { computeOccupancyPercent, isNearFull } from '../utils/eventsHelpers';
import { trackMetric } from '../utils/metricsSystem';
import { listFriends } from '../services/userService';

const EventDetailPage: React.FC = () => {
  const { id } = useParams();
  const { getSelectedHero } = useHeroStore();
  const me = getSelectedHero();
  const viewerId = useMemo(() => me?.id || '', [me?.id]);
  const [ev, setEv] = useState<SocialEvent | null>(null);
  const [attStatus, setAttStatus] = useState<'yes'|'no'|'maybe'|''>('');
  const [chat, setChat] = useState<{ id: string; userId: string; text: string; ts: number }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [media, setMedia] = useState<{ id: string; userId: string; url: string; caption?: string; ts: number }[]>([]);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [rating, setRating] = useState<number>(5);
  const [ratingComment, setRatingComment] = useState('');
  const [friends, setFriends] = useState<string[]>([]);
  const [addingInvite, setAddingInvite] = useState<boolean>(false);
  const [presenceError, setPresenceError] = useState<string | null>(null);
  const [mediaRefreshCount, setMediaRefreshCount] = useState<number | null>(null);
  const [autoRefreshMedia, setAutoRefreshMedia] = useState(false);
  const [refreshIntervalSec, setRefreshIntervalSec] = useState(30);
  const mediaAutoRef = useRef<any>(null);
  const [autoRefreshChat, setAutoRefreshChat] = useState(false);
  const [chatIntervalSec, setChatIntervalSec] = useState(30);
  const chatAutoRef = useRef<any>(null);
  const [newMsgCount, setNewMsgCount] = useState(0);
  const [lastSeenTs, setLastSeenTs] = useState<number | null>(null);
  const initialAbortRef = useRef<AbortController | null>(null);
  const mediaAbortRef = useRef<AbortController | null>(null);
  const chatAbortRef = useRef<AbortController | null>(null);

  const load = async () => {
    if (!id) return;
    const e = await getEvent(id, viewerId);
    setEv(e);
    if (e) {
      const s = e.attendees?.[viewerId];
      setAttStatus((s as any) || '');
      setChatLoading(true);
      if (initialAbortRef.current) { try { initialAbortRef.current.abort(); } catch {} }
      initialAbortRef.current = new AbortController();
      const msgs = await fetchEventChat(e.id, initialAbortRef.current.signal);
      setChat(msgs);
      setLastSeenTs(msgs.length ? Math.max(...msgs.map(m => m.ts)) : null);
      setNewMsgCount(0);
      setChatLoading(false);
      setMediaLoading(true);
      const m = await listEventMedia(e.id, initialAbortRef.current.signal);
      setMedia(m);
      setMediaLoading(false);
    }
  };

  useEffect(() => { load(); }, [id, viewerId]);
  useEffect(() => { return () => { try { initialAbortRef.current?.abort(); } catch {} try { mediaAbortRef.current?.abort(); } catch {} try { chatAbortRef.current?.abort(); } catch {} }; }, []);
  useEffect(() => { (async () => { if (!viewerId) { setFriends([]); return; } try { const f = await listFriends(viewerId); setFriends(f); } catch {} })(); }, [viewerId]);

  const attendeesCount = useMemo(() => Object.values(ev?.attendees || {}).filter(v => v==='yes').length, [ev?.attendees]);
  const nearFull = useMemo(() => isNearFull(ev?.capacity, ev?.attendees), [ev?.capacity, ev?.attendees]);
  const occupancyPercent = useMemo(() => computeOccupancyPercent(ev?.capacity, ev?.attendees), [ev?.capacity, ev?.attendees]);

  const canRate = useMemo(() => {
    if (!ev) return false;
    const dt = new Date(ev.dateTime).getTime();
    const past = Date.now() >= dt;
    const attended = ev.attendees?.[viewerId] === 'yes';
    return past && attended;
  }, [ev, viewerId]);

  const googleMapSrc = useMemo(() => {
    if (!ev) return '';
    if (typeof ev.lat === 'number' && typeof ev.lng === 'number') {
      const q = `${ev.lat},${ev.lng}`;
      return `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
    }
    if (ev.locationText) {
      return `https://www.google.com/maps?q=${encodeURIComponent(ev.locationText)}&output=embed`;
    }
    return '';
  }, [ev?.lat, ev?.lng, ev?.locationText]);

  const setPresence = async (s: 'yes'|'no'|'maybe') => {
    if (!ev || !viewerId) return;
    try {
      setPresenceError(null);
      const updated = await attendEvent(ev.id, viewerId, s);
      setEv(updated);
      setAttStatus(s);
      try { trackMetric.featureUsed(me?.id || 'system', 'event_presence_set'); } catch {}
    } catch (err: any) {
      setPresenceError(err?.message || 'Falha ao confirmar presença');
    }
  };

  const sendMsg = async () => {
    if (!ev || !viewerId) return;
    const t = chatInput.trim();
    if (!t) return;
    const msg = await sendEventChat(ev.id, viewerId, t);
    setChat(prev => [...prev.slice(-99), msg]);
    setChatInput('');
  };

  const addMediaItem = async () => {
    if (!ev || !viewerId) return;
    const u = mediaUrl.trim();
    if (!u) return;
    setUploading(true);
    setUploadProgress(5);
    let timer: any = null;
    try {
      timer = setInterval(() => { setUploadProgress(p => Math.min(90, p + 15)); }, 150);
      const m = await addEventMedia(ev.id, viewerId, u, mediaCaption.trim() || undefined);
      setUploadProgress(100);
      setTimeout(() => { setUploading(false); setUploadProgress(0); }, 300);
      setMedia(prev => [...prev.slice(-99), m]);
      setMediaUrl('');
      setMediaCaption('');
      try { trackMetric.featureUsed(me?.id || 'system', 'event_media_add'); } catch {}
    } catch {
      setUploading(false);
      setUploadProgress(0);
    } finally {
      if (timer) clearInterval(timer);
    }
  };

  const submitRating = async () => {
    if (!ev || !viewerId) return;
    const ok = await rateEvent(ev.id, viewerId, rating, ratingComment.trim() || undefined);
    if (ok) {
      setRatingComment('');
    }
  };

  const addFriendInvite = async (fid: string) => {
    try {
      if (!ev || !viewerId || ev.ownerId !== viewerId) return;
      setAddingInvite(true);
      const invited = Array.isArray(ev?.invitedIds) ? ev.invitedIds.slice() : [];
      if (!invited.includes(fid)) invited.push(fid);
      const upd = await updateEvent(ev.id, viewerId, { invitedIds: invited });
      setEv(upd);
    } catch {} finally { setAddingInvite(false); }
  };

  useEffect(() => {
    if (!ev || !autoRefreshMedia) return;
    const tick = async () => {
      try {
        if (mediaAbortRef.current) { try { mediaAbortRef.current.abort(); } catch {} }
        mediaAbortRef.current = new AbortController();
        const m = await listEventMedia(ev.id, mediaAbortRef.current.signal);
        setMedia(m);
      } catch {}
    };
    mediaAutoRef.current = setInterval(tick, refreshIntervalSec * 1000);
    try { trackMetric.featureUsed(me?.id || 'system', 'event_media_auto_refresh_enabled'); } catch {}
    return () => {
      if (mediaAutoRef.current) {
        clearInterval(mediaAutoRef.current);
        mediaAutoRef.current = null;
        try { trackMetric.featureUsed(me?.id || 'system', 'event_media_auto_refresh_disabled'); } catch {}
      }
      try { mediaAbortRef.current?.abort(); } catch {}
    };
  }, [autoRefreshMedia, ev?.id, refreshIntervalSec]);

  useEffect(() => {
    if (!ev || !autoRefreshChat) return;
    const tick = async () => {
      try {
        if (chatAbortRef.current) { try { chatAbortRef.current.abort(); } catch {} }
        chatAbortRef.current = new AbortController();
        const msgs = await fetchEventChat(ev.id, chatAbortRef.current.signal);
        setChat(msgs);
        const latest = msgs.length ? Math.max(...msgs.map(m => m.ts)) : null;
        if (latest !== null && lastSeenTs !== null) {
          const count = msgs.filter(m => m.ts > lastSeenTs).length;
          setNewMsgCount(count);
        }
      } catch {}
    };
    chatAutoRef.current = setInterval(tick, chatIntervalSec * 1000);
    try { trackMetric.featureUsed(me?.id || 'system', 'event_chat_auto_refresh_enabled'); } catch {}
    return () => {
      if (chatAutoRef.current) {
        clearInterval(chatAutoRef.current);
        chatAutoRef.current = null;
        try { trackMetric.featureUsed(me?.id || 'system', 'event_chat_auto_refresh_disabled'); } catch {}
      }
      try { chatAbortRef.current?.abort(); } catch {}
    };
  }, [autoRefreshChat, ev?.id, chatIntervalSec]);

  const downloadICS = () => {
    if (!ev) return;
    const dt = new Date(ev.dateTime);
    const pad = (n: number) => String(n).padStart(2, '0');
    const toUTC = (d: Date) => {
      const yyyy = d.getUTCFullYear();
      const mm = pad(d.getUTCMonth() + 1);
      const dd = pad(d.getUTCDate());
      const HH = pad(d.getUTCHours());
      const MM = pad(d.getUTCMinutes());
      const SS = pad(d.getUTCSeconds());
      return `${yyyy}${mm}${dd}T${HH}${MM}${SS}Z`;
    };
    const start = toUTC(dt);
    const end = toUTC(new Date(dt.getTime() + 2 * 60 * 60 * 1000));
    const uid = `evt-${ev.id}@heroforgenew`;
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//HeroForgeNew//Social Events//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${start}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${(ev.name||'Evento').replace(/\r|\n/g,' ')}`,
      `DESCRIPTION:${(ev.description||'').replace(/\r|\n/g,' ')}`,
      `LOCATION:${(ev.locationText||'').replace(/\r|\n/g,' ')}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ev.name?.replace(/[^a-z0-9]+/gi,'-') || 'evento'}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    try { trackMetric.featureUsed(me?.id || 'system', 'event_ics_downloaded'); } catch {}
  };

  const shareEvent = () => {
    if (!ev) return;
    const url = window.location.origin + `/event/${ev.id}`;
    const text = `${ev.name} — ${new Date(ev.dateTime).toLocaleString()}${ev.locationText?` • ${ev.locationText}`:''}`;
    const body = `${text}\n${url}`;
    const wa = `https://wa.me/?text=${encodeURIComponent(body)}`;
    const mail = `mailto:?subject=${encodeURIComponent(ev.name||'Evento')}&body=${encodeURIComponent(body)}`;
    const tg = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    try {
      const nav: any = navigator;
      if (nav.share) {
        nav.share({ title: ev.name, text, url });
        try { trackMetric.featureUsed(me?.id || 'system', 'event_shared_native'); } catch {}
        return;
      }
    } catch {}
    window.open(wa, '_blank');
    try { trackMetric.featureUsed(me?.id || 'system', 'event_shared_whatsapp'); } catch {}
  };

  const copyEventLink = async () => {
    try {
      if (!ev) return;
      const url = window.location.origin + `/event/${ev.id}`;
      await navigator.clipboard.writeText(url);
      try { trackMetric.featureUsed(me?.id || 'system', 'event_link_copied'); } catch {}
    } catch {}
  };

  if (!ev) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="text-6xl mb-2">🎟️</div>
        <div className="text-gray-600">Evento não encontrado</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white p-6 rounded border">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-2xl font-bold text-gray-800">{ev.name}</div>
            <div className="text-sm text-gray-600">{new Date(ev.dateTime).toLocaleString()}</div>
            {ev.locationText && <div className="text-sm text-gray-600">{ev.locationText}</div>}
            <div className="text-sm text-gray-600 mt-1">Capacidade: {ev.capacity} • Confirmados: {attendeesCount}</div>
          </div>
          <div className="text-3xl">🎉</div>
        </div>
        <div className="mt-3 text-gray-800 whitespace-pre-line">{ev.description}</div>
        {nearFull && (
          <div className="mt-2 text-xs px-2 py-1 rounded bg-red-50 text-red-700 border border-red-200 inline-block">Quase lotado</div>
        )}
        <div className="mt-3">
          <div className="text-xs text-gray-600 mb-1">Ocupação</div>
          <div className="w-full h-2 bg-gray-200 rounded">
            <div className={`h-2 rounded ${nearFull ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${occupancyPercent}%` }} />
          </div>
          <div className="text-xs text-gray-600 mt-1">{occupancyPercent}%</div>
        </div>
        {googleMapSrc && (
          <div className="mt-4">
            <iframe title="map" src={googleMapSrc} className="w-full h-64 rounded border" loading="lazy" />
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <button onClick={()=>setPresence('yes')} disabled={attendeesCount >= (ev.capacity||0) && attStatus !== 'yes'} className={`px-3 py-2 rounded ${attStatus==='yes'?'bg-green-600 text-white':'bg-gray-200 text-gray-800'} ${attendeesCount >= (ev.capacity||0) && attStatus !== 'yes' ? 'opacity-60 cursor-not-allowed' : ''}`}>Vou</button>
          <button onClick={()=>setPresence('maybe')} className={`px-3 py-2 rounded ${attStatus==='maybe'?'bg-yellow-500 text-white':'bg-gray-200 text-gray-800'}`}>Talvez</button>
          <button onClick={()=>setPresence('no')} className={`px-3 py-2 rounded ${attStatus==='no'?'bg-red-500 text-white':'bg-gray-200 text-gray-800'}`}>Não vou</button>
          {presenceError && <span className="text-xs text-red-600 ml-2">{presenceError}</span>}
          <div className="ml-auto flex items-center gap-2">
            <button onClick={downloadICS} className="px-3 py-2 rounded bg-gray-800 text-white">Adicionar ao calendário</button>
            <button onClick={shareEvent} className="px-3 py-2 rounded bg-indigo-600 text-white">Compartilhar</button>
            <button onClick={copyEventLink} className="px-3 py-2 rounded bg-gray-200 text-gray-800">Copiar Link</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded border">
          <div className="font-semibold mb-2 flex items-center justify-between"><span>Chat do Evento</span><div className="flex items-center gap-2"><label className="flex items-center gap-1 text-xs text-gray-600"><input type="checkbox" checked={autoRefreshChat} onChange={e=>setAutoRefreshChat(e.target.checked)} /> Auto-refresh</label><select value={chatIntervalSec} onChange={e=>setChatIntervalSec(Number(e.target.value))} className="px-2 py-1 rounded border text-xs"><option value={15}>15s</option><option value={30}>30s</option><option value={60}>60s</option></select>{newMsgCount>0 && (<span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-xs">Novas {newMsgCount}</span>)}<button onClick={()=>{ const latest = chat.length ? Math.max(...chat.map(m=>m.ts)) : null; setLastSeenTs(latest); setNewMsgCount(0); }} className="px-2 py-1 rounded bg-gray-200 text-gray-800 text-xs">Marcar como lidas</button></div></div>
          <div className="max-h-60 overflow-y-auto border rounded p-2 bg-gray-50">
            {chatLoading && chat.length===0 && (
              <div className="space-y-2 animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            )}
            {chatSending && (
              <div className="text-xs text-gray-600">Enviando…</div>
            )}
            {chat.length>0 ? chat.map(m => (
              <div key={m.id} className="text-sm text-gray-800 flex justify-between">
                <span><span className="font-semibold">{m.userId.slice(0,6)}</span>: {m.text}</span>
                <span className="text-xs text-gray-500">{new Date(m.ts).toLocaleTimeString()}</span>
              </div>
            )) : <div className="text-xs text-gray-500">Sem mensagens ainda</div>}
          </div>
          <div className="flex gap-2 mt-2">
            <input value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Mensagem" className="flex-1 p-2 border rounded" />
            <button onClick={sendMsg} disabled={!chatInput.trim() || chatSending} className="px-3 py-2 rounded bg-blue-600 text-white">{chatSending ? 'Enviando…' : 'Enviar'}</button>
          </div>
        </div>

        <div className="bg-white p-4 rounded border">
          <div className="font-semibold mb-2 flex items-center justify-between">
            <span>Mídias</span>
            <div className="flex items-center gap-2">
              {viewerId === ev.ownerId && (
                <>
                  <label className="flex items-center gap-1 text-xs text-gray-600">
                    <input type="checkbox" checked={autoRefreshMedia} onChange={e=>setAutoRefreshMedia(e.target.checked)} /> Auto-refresh
                  </label>
                  <select value={refreshIntervalSec} onChange={e=>setRefreshIntervalSec(Number(e.target.value))} className="px-2 py-1 rounded border text-xs">
                    <option value={15}>15s</option>
                    <option value={30}>30s</option>
                    <option value={60}>60s</option>
                  </select>
                </>
              )}
              <button onClick={async()=>{ if (!ev) return; const prev = media.length; setMediaLoading(true); try { const m = await listEventMedia(ev.id); setMedia(m); setMediaRefreshCount(Math.max(0, m.length - prev)); try { trackMetric.featureUsed(me?.id || 'system', 'event_media_refresh'); } catch {} } finally { setMediaLoading(false);} }} className="px-2 py-1 rounded bg-gray-200 text-gray-800 text-xs">Atualizar</button>
            </div>
          </div>
          {mediaRefreshCount !== null && (
            <div className="text-xs text-gray-600 mb-2">Atualizado {mediaRefreshCount} itens</div>
          )}
          {mediaLoading && media.length===0 && (
            <div className="grid grid-cols-2 gap-3 animate-pulse">
              <div className="border rounded overflow-hidden">
                <div className="w-full h-32 bg-gray-200" />
              </div>
              <div className="border rounded overflow-hidden">
                <div className="w-full h-32 bg-gray-200" />
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {media.map(m => (
              <div key={m.id} className="border rounded overflow-hidden">
                <img src={m.url} alt={m.caption||''} className="w-full h-32 object-cover" />
                {m.caption && <div className="text-xs p-2 text-gray-700">{m.caption}</div>}
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input value={mediaUrl} onChange={e=>setMediaUrl(e.target.value)} placeholder="URL da imagem/vídeo" className="flex-1 p-2 border rounded" />
            <input value={mediaCaption} onChange={e=>setMediaCaption(e.target.value)} placeholder="Legenda (opcional)" className="flex-1 p-2 border rounded" />
            <button onClick={addMediaItem} disabled={!mediaUrl.trim() || uploading} className="px-3 py-2 rounded bg-indigo-600 text-white">{uploading ? 'Enviando…' : 'Adicionar'}</button>
          </div>
          {uploading && (
            <div className="mt-2">
              <div className="w-full h-2 bg-gray-200 rounded">
                <div className="h-2 rounded bg-indigo-600" style={{ width: `${uploadProgress}%` }} />
              </div>
              <div className="text-xs text-gray-600 mt-1">{uploadProgress}%</div>
            </div>
          )}
        </div>
      </div>

      {canRate && (
        <div className="bg-white p-4 rounded border">
          <div className="font-semibold mb-2">Avaliação pós-evento</div>
          <div className="flex items-center gap-3">
            <input type="range" min={1} max={5} value={rating} onChange={e=>setRating(Number(e.target.value))} />
            <div className="text-sm text-gray-700">{rating} ⭐</div>
          </div>
          <textarea value={ratingComment} onChange={e=>setRatingComment(e.target.value)} rows={3} placeholder="Comentário" className="mt-2 w-full p-2 border rounded" />
          <button onClick={submitRating} className="mt-2 px-3 py-2 rounded bg-amber-600 text-white">Enviar Avaliação</button>
        </div>
      )}

      {viewerId === ev.ownerId && (
        <div className="bg-white p-4 rounded border">
          <div className="font-semibold mb-2">Convidar Amigos</div>
          {friends.length>0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {friends.map(fid => (
                <button key={fid} onClick={()=>addFriendInvite(fid)} disabled={addingInvite || (ev.invitedIds||[]).includes(fid)} className={`px-2 py-1 rounded ${ (ev.invitedIds||[]).includes(fid) ? 'bg-gray-300 text-gray-700' : 'bg-indigo-600 text-white hover:bg-indigo-700' } text-xs`}>
                  {fid.slice(0,6)}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-500">Sua lista de amigos está vazia.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default EventDetailPage;