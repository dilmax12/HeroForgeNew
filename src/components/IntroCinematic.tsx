import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getAltharionLore } from '../utils/story';

const supportedVersions = ['short', 'cinematic', 'game_intro', 'topics', 'full'] as const;

const lineVariants = {
  initial: { opacity: 0, y: 10 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.8 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.6 } }
};

const IntroCinematic: React.FC = () => {
  const location = useLocation();
  const lore = React.useMemo(() => {
    const params = new URLSearchParams(location.search);
    const v = params.get('version') || 'short';
    const key = (supportedVersions as readonly string[]).includes(v) ? (v as any) : 'game_intro';
    const data = getAltharionLore(key as any) as any;
    const linesArr = data?.lines || data?.script || data?.paragraphs || [];
    const title = data?.title || 'Narração Inicial do Jogo';
    const lines: string[] = Array.isArray(linesArr) ? linesArr : [];
    const isCinematic = key === 'cinematic';
    return { title, lines, isCinematic };
  }, [location.search]);
  const [index, setIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const navigate = useNavigate();
  const nextTimeout = useRef<number | null>(null);
  const ambientRef = useRef<HTMLAudioElement | null>(null);
  const crescendoRef = useRef<HTMLAudioElement | null>(null);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  // TTS helpers
  const voices = useMemo(() => {
    return window.speechSynthesis?.getVoices() || [];
  }, []);

  const pickVoice = () => {
    const vs = window.speechSynthesis?.getVoices() || voices;

    const matchesGooglePtBr = (v: SpeechSynthesisVoice) => {
      const name = (v?.name || '').toLowerCase();
      const uri = (v?.voiceURI || '').toLowerCase();
      const hay = name + ' ' + uri;
      return hay.includes('google') && hay.match(/portugu[eê]s|portugues/) && hay.match(/brasil|brazil|pt-br/);
    };

    // Tentar nomes comuns
    const preferredNames = [
      'Google português do Brasil',
      'Google Português do Brasil',
      'Google PT-BR',
      'Google Brazilian Portuguese'
    ].map(n => n.toLowerCase());

    const voiceByName = vs.find(v => preferredNames.includes((v.name || '').toLowerCase()));
    const voiceByHeuristic = vs.find(matchesGooglePtBr);
    if (voiceByName) return voiceByName;
    if (voiceByHeuristic) return voiceByHeuristic;

    // Caso não haja Google, preferir pt-BR/pt-* e nomes femininos
    const isFemaleName = (name: string) => {
      const n = (name || '').toLowerCase();
      return /female|femin|mulher|ana|camila|luciana|maria|vit[oó]ria|helena|gabriela|bruna|carla|laura/.test(n);
    };
    const preferPool = (pool: SpeechSynthesisVoice[]) => {
      if (!pool.length) return null;
      const sorted = [...pool].sort((a, b) => Number(isFemaleName(b.name)) - Number(isFemaleName(a.name)));
      return sorted[0];
    };

    const ptbr = vs.filter(v => (v.lang || '').toLowerCase() === 'pt-br');
    const pt = vs.filter(v => (v.lang || '').toLowerCase().startsWith('pt'));
    return preferPool(ptbr) || preferPool(pt) || preferPool(vs) || vs[0];
  };

  const computeDelay = (text: string) => {
    const base = 1400;
    const perCharMs = 45;
    const maxMs = 9000;
    return Math.min(maxMs, base + perCharMs * Math.min(text.length, 160));
  };

  const speak = (text: string, onEnd?: () => void) => {
    try {
      if (!ttsEnabled || !window.speechSynthesis) {
        onEnd?.();
        return;
      }
      const utter = new SpeechSynthesisUtterance(text);
      const voice = pickVoice();
      if (voice) utter.voice = voice;
      // Forçar pt-BR para evitar variações
      utter.lang = 'pt-BR';
      // Leve ajuste para soar mais feminina
      utter.rate = 0.92;
      utter.pitch = 1.08;
      utter.onstart = () => {
        // sincronização iniciada
      };
      utter.onend = () => onEnd?.();
      utter.onerror = () => {
        // Em alguns navegadores, erros disparam rapidamente; avançar com atraso proporcional
        setTimeout(() => onEnd?.(), computeDelay(text));
      };
      utterRef.current = utter;
      window.speechSynthesis.speak(utter);
    } catch {
      onEnd?.();
    }
  };

  // Avanço de linhas: usa onend da TTS quando ativada; senão usa delay dinâmico
  useEffect(() => {
    const text = lore.lines[index];
    if (!autoPlay || !text) return () => {};

    // Limpar qualquer timeout anterior
    if (nextTimeout.current) {
      clearTimeout(nextTimeout.current);
      nextTimeout.current = null;
    }

    if (ttsEnabled && window.speechSynthesis) {
      // Limpar fila anterior apenas se houver algo falando/pendente
      try {
        const synth = window.speechSynthesis as SpeechSynthesis;
        // @ts-ignore: pending existe em alguns navegadores
        if (synth.speaking || (synth as any).pending) synth.cancel();
      } catch {}
      // Falar e avançar somente quando a narração terminar
      const id = setTimeout(() => {
        speak(text, () => {
          setIndex((i) => Math.min(i + 1, lore.lines.length));
        });
      }, 50);
      return () => {
        // não cancelar aqui para não cortar; apenas limpar timeout se existir
        clearTimeout(id);
        if (nextTimeout.current) { clearTimeout(nextTimeout.current); nextTimeout.current = null; }
      };
    } else {
      // Sem TTS: usar atraso proporcional ao tamanho do texto
      const delayMs = computeDelay(text);
      nextTimeout.current = window.setTimeout(() => {
        setIndex((i) => Math.min(i + 1, lore.lines.length));
      }, delayMs);
      return () => {
        if (nextTimeout.current) {
          clearTimeout(nextTimeout.current);
          nextTimeout.current = null;
        }
      };
    }
  }, [index, autoPlay, ttsEnabled, lore.lines]);

  // Música ambiente e crescendo com fade
  useEffect(() => {
    // Preparar players
    if (!ambientRef.current) {
      const base = (import.meta.env && import.meta.env.BASE_URL) || '/';
      const ambientSrc = `${base}audio/intro-ambient.mp3`;
      const a = new Audio(ambientSrc);
      a.preload = 'auto';
      a.loop = true;
      a.volume = 0;
      ambientRef.current = a;
      a.play().catch(() => {/* arquivo opcional ou bloqueio de autoplay */});
      // Fade-in mais sutil para ambient
      let v = 0;
      const id = setInterval(() => {
        v = Math.min(0.25, v + 0.02);
        a.volume = v;
        if (v >= 0.25) clearInterval(id);
      }, 500);
    }
    if (!crescendoRef.current) {
      const base = (import.meta.env && import.meta.env.BASE_URL) || '/';
      const crescendoSrc = `${base}audio/intro-crescendo.mp3`;
      const c = new Audio(crescendoSrc);
      c.preload = 'auto';
      c.loop = true;
      c.volume = 0;
      crescendoRef.current = c;
    }
    return () => {
      // Fade-out suave ao desmontar
      const a = ambientRef.current;
      const c = crescendoRef.current;
      if (a) {
        let v = a.volume;
        const id = setInterval(() => {
          v = Math.max(0, v - 0.05);
          a.volume = v;
          if (v <= 0) { clearInterval(id); a.pause(); }
        }, 150);
      }
      if (c) {
        let v = c.volume;
        const id = setInterval(() => {
          v = Math.max(0, v - 0.05);
          c.volume = v;
          if (v <= 0) { clearInterval(id); c.pause(); }
        }, 150);
      }
    };
  }, []);

  // Ativar crescendo na segunda metade
  useEffect(() => {
    const c = crescendoRef.current;
    if (!c) return;
    const threshold = Math.floor(lore.lines.length * 0.75);
    if (index >= threshold) {
      c.play().catch(() => {});
      let v = c.volume;
      const id = setInterval(() => {
        v = Math.min(0.35, v + 0.02);
        c.volume = v;
        if (v >= 0.35) clearInterval(id);
      }, 500);
      return () => clearInterval(id);
    }
  }, [index]);

  const isFinished = index >= lore.lines.length;

  const handleSkip = () => {
    window.speechSynthesis?.cancel();
    try { localStorage.setItem('introSeen', '1'); } catch {}
    const a = ambientRef.current;
    const c = crescendoRef.current;
    if (a) {
      let v = a.volume;
      const id = setInterval(() => {
        v = Math.max(0, v - 0.05);
        a.volume = v;
        if (v <= 0) { clearInterval(id); a.pause(); }
      }, 150);
    }
    if (c) {
      let v = c.volume;
      const id = setInterval(() => {
        v = Math.max(0, v - 0.05);
        c.volume = v;
        if (v <= 0) { clearInterval(id); c.pause(); }
      }, 150);
    }
    navigate('/journey');
  };

  // Marcar como vista quando termina
  useEffect(() => {
    if (isFinished) {
      try { localStorage.setItem('introSeen', '1'); } catch {}
      // Fade-out ao finalizar
      const a = ambientRef.current;
      const c = crescendoRef.current;
      if (a) {
        let v = a.volume;
        const id = setInterval(() => {
          v = Math.max(0, v - 0.05);
          a.volume = v;
          if (v <= 0) { clearInterval(id); a.pause(); }
        }, 150);
      }
      if (c) {
        let v = c.volume;
        const id = setInterval(() => {
          v = Math.max(0, v - 0.05);
          c.volume = v;
          if (v <= 0) { clearInterval(id); c.pause(); }
        }, 150);
      }
    }
  }, [isFinished]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Partículas simples */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[60vw] h-[60vw] rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-[30vw] h-[30vw] rounded-full bg-indigo-500/10 blur-3xl" />
        {lore.isCinematic && (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[40vw] h-[40vw] rounded-full bg-cyan-400/10 blur-3xl animate-pulse" />
        )}
      </div>

      <div className="relative z-10 container mx-auto px-6 py-10 flex flex-col items-center text-center">
        <div className="text-amber-400 text-sm tracking-widest uppercase mb-4" aria-live="polite">{lore.title}</div>
        <div className="max-w-3xl">
          <AnimatePresence mode="wait">
            {!isFinished && (
              <motion.p
                key={index}
                variants={lineVariants}
                initial="initial"
                animate="enter"
                exit="exit"
                className="text-xl md:text-2xl text-slate-100 font-serif leading-relaxed"
              >
                {lore.lines[index]}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Controles */}
          {!isFinished && (
            <div className="mt-8 flex items-center justify-center gap-3 text-sm">
              <button
                className="px-3 py-2 rounded bg-amber-600 text-white hover:bg-amber-700"
                onClick={() => {
                  setAutoPlay((v) => {
                    const nv = !v;
                    if (window.speechSynthesis && ttsEnabled) {
                      nv ? window.speechSynthesis.resume() : window.speechSynthesis.pause();
                    }
                    return nv;
                  });
                }}
                aria-label={autoPlay ? 'Pausar' : 'Reproduzir'}
              >
                {autoPlay ? 'Pausar' : 'Reproduzir'}
              </button>
              <button
                className={`px-3 py-2 rounded ${ttsEnabled ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                onClick={() => setTtsEnabled((v) => {
                  const nv = !v;
                  if (!nv) {
                    try { window.speechSynthesis?.cancel(); } catch {}
                  }
                  return nv;
                })}
                aria-label={ttsEnabled ? 'Desativar Narração' : 'Ativar Narração'}
              >
                {ttsEnabled ? 'Narração Ativada' : 'Narração Desativada'}
              </button>
              <button
                className="px-3 py-2 rounded bg-gray-700 text-gray-200 hover:bg-gray-600"
                onClick={handleSkip}
              >
                Pular
              </button>
            </div>
          )}
        </div>

        {/* Final */}
        {isFinished && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="mt-12 bg-slate-800/60 backdrop-blur-sm border border-amber-500/40 rounded-xl p-6 w-full max-w-xl"
          >
            <div className="text-4xl md:text-5xl text-amber-400 mb-2">⚔️</div>
            <div className="text-slate-200 text-lg mb-4 font-medium">
              O selo da Guilda de Altharion brilha diante de você.
            </div>
            <div className="flex items-center justify-center gap-3">
              <Link
                to="/create"
                className="px-5 py-3 rounded bg-amber-600 text-white hover:bg-amber-700 shadow"
              >
                Forjar Herói
              </Link>
              <Link
                to="/journey"
                className="px-5 py-3 rounded bg-gray-700 text-gray-200 hover:bg-gray-600"
              >
                Ir ao Início
              </Link>
            </div>
            <div className="mt-4 text-xs text-gray-400">A introdução será mostrada uma vez; você pode revisitá-la via /intro.</div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default IntroCinematic;
