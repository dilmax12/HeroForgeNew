import React, { useEffect, useMemo, useState } from 'react';
import { useHeroStore } from '../store/heroStore';
import { listInbox, listOutbox, sendGuildLetter, GuildLetter } from '../services/messagesService';

type BoxTab = 'compose' | 'inbox' | 'outbox';

const Messenger: React.FC = () => {
  const { heroes, selectedHeroId, getSelectedHero } = useHeroStore();
  const me = getSelectedHero();
  const [tab, setTab] = useState<BoxTab>('compose');
  const [toHeroId, setToHeroId] = useState<string>('');
  const [subject, setSubject] = useState<string>('Carta da Guilda');
  const [body, setBody] = useState<string>('Saudações! Que seus passos sejam guiados pelos ventos da aventura.');
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [inbox, setInbox] = useState<GuildLetter[]>([]);
  const [outbox, setOutbox] = useState<GuildLetter[]>([]);
  const recipients = useMemo(() => heroes.filter(h => h.id !== selectedHeroId), [heroes, selectedHeroId]);

  const loadBoxes = async () => {
    if (!me) return;
    const i = await listInbox(me.id, 50);
    const o = await listOutbox(me.id, 50);
    setInbox(i.data || []);
    setOutbox(o.data || []);
  };

  useEffect(() => { loadBoxes(); }, [selectedHeroId]);

  const handleSend = async () => {
    setError(undefined);
    if (!me) { setError('Selecione um herói para enviar cartas.'); return; }
    if (!toHeroId) { setError('Escolha o destinatário.'); return; }
    if (!subject.trim() || !body.trim()) { setError('Preencha assunto e conteúdo.'); return; }
    const toHero = heroes.find(h => h.id === toHeroId);
    if (!toHero) { setError('Destinatário inválido.'); return; }
    setSending(true);
    const res = await sendGuildLetter(me, toHero.id, toHero.name, subject, body);
    setSending(false);
    if (!res.ok) { setError(res.error || 'Falha ao enviar.'); return; }
    setSubject('Carta da Guilda');
    setBody('Saudações! Que seus passos sejam guiados pelos ventos da aventura.');
    loadBoxes();
    setTab('outbox');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white/10 border border-white/20 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-amber-300">✉️ Cartas e Mensageiros</h1>
            <p className="text-sm text-gray-300">Roleplay assíncrono entre heróis da guilda.</p>
          </div>
          <div className="text-3xl">🕯️</div>
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={() => setTab('compose')} className={`px-3 py-2 rounded ${tab === 'compose' ? 'bg-amber-600 text-black' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}>✍️ Escrever</button>
          <button onClick={() => { setTab('inbox'); loadBoxes(); }} className={`px-3 py-2 rounded ${tab === 'inbox' ? 'bg-amber-600 text-black' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}>📥 Inbox</button>
          <button onClick={() => { setTab('outbox'); loadBoxes(); }} className={`px-3 py-2 rounded ${tab === 'outbox' ? 'bg-amber-600 text-black' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}>📤 Enviadas</button>
        </div>

        {tab === 'compose' && (
          <div className="mt-6">
            {!me && (
              <div className="mt-3 bg-red-900/30 border border-red-500/40 text-red-200 text-xs md:text-sm px-3 py-2 rounded">
                Selecione um herói ativo para enviar cartas.
              </div>
            )}
            {me && (
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-300 mb-1">Destinatário</div>
                  <select value={toHeroId} onChange={e => setToHeroId(e.target.value)} className="w-full px-3 py-2 rounded bg-gray-800 text-gray-200 border border-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500">
                    <option value="">Selecione um herói…</option>
                    {recipients.map(h => (
                      <option key={h.id} value={h.id}>{h.name} (Lv {h.progression.level})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="text-sm text-gray-300 mb-1">Assunto</div>
                  <input value={subject} onChange={e => setSubject(e.target.value)} className="w-full px-3 py-2 rounded bg-gray-800 text-gray-200 border border-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                <div>
                  <div className="text-sm text-gray-300 mb-1">Conteúdo</div>
                  <textarea value={body} onChange={e => setBody(e.target.value)} rows={6} className="w-full px-3 py-2 rounded bg-gray-800 text-gray-200 border border-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                {error && <div className="text-xs text-red-300">{error}</div>}
                <button onClick={handleSend} disabled={sending} className="px-4 py-2 rounded bg-amber-600 text-black hover:bg-amber-700">{sending ? 'Enviando…' : 'Enviar Carta'}</button>
              </div>
            )}
          </div>
        )}

        {tab === 'inbox' && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold text-amber-300 mb-2">📥 Mensagens recebidas</h2>
            <ul className="space-y-3">
              {inbox.map(m => (
                <li key={m.id} className="bg-gray-800/60 border border-white/10 rounded p-3">
                  <div className="text-xs text-gray-400">De: <span className="text-amber-300 font-semibold">{m.author_name}</span> • {new Date(m.created_at).toLocaleString()}</div>
                  <div className="text-gray-200 mt-1 font-semibold">{m.subject}</div>
                  <div className="text-gray-200 mt-1 whitespace-pre-line">{m.body}</div>
                </li>
              ))}
            </ul>
            {inbox.length === 0 && <div className="text-xs text-gray-400">Sua caixa de entrada está vazia.</div>}
          </div>
        )}

        {tab === 'outbox' && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold text-amber-300 mb-2">📤 Mensagens enviadas</h2>
            <ul className="space-y-3">
              {outbox.map(m => (
                <li key={m.id} className="bg-gray-800/60 border border-white/10 rounded p-3">
                  <div className="text-xs text-gray-400">Para: <span className="text-amber-300 font-semibold">{m.to_hero_name}</span> • {new Date(m.created_at).toLocaleString()}</div>
                  <div className="text-gray-200 mt-1 font-semibold">{m.subject}</div>
                  <div className="text-gray-200 mt-1 whitespace-pre-line">{m.body}</div>
                </li>
              ))}
            </ul>
            {outbox.length === 0 && <div className="text-xs text-gray-400">Você ainda não enviou cartas.</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default Messenger;
