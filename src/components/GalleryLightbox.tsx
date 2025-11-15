import React, { useEffect, useRef, useState } from 'react';
import { Hero } from '../types/hero';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GalleryLightboxProps {
  items: Hero[];
  index: number;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
}

const GalleryLightbox: React.FC<GalleryLightboxProps> = ({ items, index, onClose, onNavigate }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prevFocusRef = useRef<Element | null>(null);
  const [scale, setScale] = useState(1);
  const [startX, setStartX] = useState<number | null>(null);
  const [startY, setStartY] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [panning, setPanning] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  const current = items[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onNavigate(Math.max(0, index - 1));
      if (e.key === 'ArrowRight') onNavigate(Math.min(items.length - 1, index + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, items.length, onClose, onNavigate]);

  useEffect(() => {
    setScale(1);
    setError(false);
  }, [index]);

  useEffect(() => {
    prevFocusRef.current = document.activeElement;
    setTimeout(() => containerRef.current?.focus(), 0);
    return () => {
      const el = prevFocusRef.current as HTMLElement | null;
      if (el && typeof el.focus === 'function') el.focus();
    };
  }, []);

  useEffect(() => {
    const preload = (h?: Hero) => {
      if (!h || !h.image) return;
      const url = h.image.includes('image.pollinations.ai/prompt/')
        ? h.image.replace('https://image.pollinations.ai/prompt/', '/api/pollinations-image?prompt=').replace('?n=1&','&')
        : h.image;
      const img = new Image();
      img.src = url;
    };
    preload(items[index - 1]);
    preload(items[index + 1]);
  }, [index, items]);

  const requestFs = () => {
    const el = containerRef.current;
    if (el && el.requestFullscreen) el.requestFullscreen().catch(() => {});
  };

  const onPointerDown = (e: React.PointerEvent) => {
    setStartX(e.clientX);
    setStartY(e.clientY);
    if (scale > 1) setPanning(true);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (startX === null) return;
    if (!panning) {
      const dx = e.clientX - startX;
      if (dx > 50) onNavigate(Math.max(0, index - 1));
      if (dx < -50) onNavigate(Math.min(items.length - 1, index + 1));
    }
    setStartX(null);
    setStartY(null);
    setPanning(false);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!panning || startX === null || startY === null) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const maxX = 300;
    const maxY = 300;
    setOffsetX(Math.max(-maxX, Math.min(maxX, dx)));
    setOffsetY(Math.max(-maxY, Math.min(maxY, dy)));
  };

  const onWheel: React.WheelEventHandler = (e) => {
    if (e.ctrlKey || e.shiftKey || e.altKey) return;
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(s => Math.max(1, Math.min(3, s + delta)));
  };

  const onDoubleClick = () => {
    setScale(s => (s > 1 ? 1 : 2));
    if (scale <= 1) { setOffsetX(0); setOffsetY(0); }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Visualização em tela cheia"
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col"
    >
      <div className="flex items-center justify-between p-3 text-white">
        <div className="flex items-center gap-2">
          <button aria-label="Fechar" onClick={onClose} className="p-2 rounded hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
          <button aria-label="Zoom in" onClick={() => setScale(s => Math.min(3, s + 0.25))} className="p-2 rounded hover:bg-white/10">
            <ZoomIn className="w-5 h-5" />
          </button>
          <button aria-label="Zoom out" onClick={() => setScale(s => Math.max(1, s - 0.25))} className="p-2 rounded hover:bg-white/10">
            <ZoomOut className="w-5 h-5" />
          </button>
          <button aria-label="Tela cheia" onClick={requestFs} className="p-2 rounded hover:bg-white/10">
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
        <div className="text-sm">{index + 1} / {items.length}</div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerMove={onPointerMove}
        onWheel={onWheel}
        onDoubleClick={onDoubleClick}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'Tab') {
            const root = containerRef.current;
            if (!root) return;
            const nodes = Array.from(root.querySelectorAll('button')) as HTMLElement[];
            if (!nodes.length) return;
            const active = document.activeElement as HTMLElement | null;
            let i = nodes.findIndex(n => n === active);
            if (e.shiftKey) i = i <= 0 ? nodes.length - 1 : i - 1;
            else i = i >= nodes.length - 1 ? 0 : i + 1;
            nodes[i]?.focus();
            e.preventDefault();
          }
        }}
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={current?.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {current?.image && !error ? (
              <img
                src={current.image.includes('image.pollinations.ai/prompt/')
                  ? current.image
                      .replace('https://image.pollinations.ai/prompt/', '/api/pollinations-image?prompt=')
                      .replace('?n=1&', '&')
                  : current.image}
                alt={current.name}
                className="max-h-full max-w-full object-contain"
                style={{ transform: `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale})` }}
                loading="lazy"
                decoding="async"
                onError={() => setError(true)}
              />
            ) : (
              <div className="text-white text-6xl">🦸</div>
            )}
            {error && (
              <div className="absolute bottom-4 left-4 right-4 text-center text-red-300 text-sm">Falha ao carregar a imagem</div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="p-3 flex items-center justify-between text-white">
        <button aria-label="Anterior" onClick={() => onNavigate(Math.max(0, index - 1))} className="p-2 rounded hover:bg-white/10">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2 overflow-x-auto">
          {items.slice(Math.max(0, index - 3), Math.min(items.length, index + 4)).map((h) => (
            <button
              key={h.id}
              aria-label={h.name}
              onClick={() => onNavigate(items.findIndex(x => x.id === h.id))}
              className={`w-16 h-16 rounded border ${h.id === current?.id ? 'border-yellow-400' : 'border-white/20'} overflow-hidden flex-shrink-0`}
            >
              {h.image ? (
                <img src={h.image.includes('image.pollinations.ai/prompt/')
                  ? h.image.replace('https://image.pollinations.ai/prompt/', '/api/pollinations-image?prompt=').replace('?n=1&','&')
                  : h.image} alt={h.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">🦸</div>
              )}
            </button>
          ))}
        </div>
        <button aria-label="Próximo" onClick={() => onNavigate(Math.min(items.length - 1, index + 1))} className="p-2 rounded hover:bg-white/10">
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default GalleryLightbox;