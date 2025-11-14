import React from 'react';
import DialogueFrame from './DialogueFrame';
import { useMonetizationStore } from '../store/monetizationStore';

interface Props {
  open: boolean;
  onClose: () => void;
  previewFrameId?: 'medieval' | 'futurista' | 'noir';
}

const ThemePreviewModal: React.FC<Props> = ({ open, onClose, previewFrameId }) => {
  const { setActiveFrame } = useMonetizationStore();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] bg-black/60 flex items-center justify-center">
      <div className="w-[92vw] max-w-2xl rounded-2xl border border-white/20 bg-slate-900 shadow-2xl">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="text-sm text-gray-200">Pré-visualização de Moldura</div>
          <button onClick={onClose} className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600">Fechar</button>
        </div>
        <div className="p-4 space-y-3">
          {/* Temporariamente força a moldura durante preview */}
          <div>
            <DialogueFrame>
              <div className="text-white font-semibold mb-1">Exemplo de Diálogo</div>
              <div className="text-gray-300">Uma mensagem aparece com a moldura selecionada para você avaliar o estilo antes da compra.</div>
              <div className="text-xs text-gray-400 mt-1">Visual: {previewFrameId || 'medieval'}</div>
            </DialogueFrame>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setActiveFrame(previewFrameId)} className="px-3 py-2 text-xs rounded bg-amber-600 hover:bg-amber-700 text-white">Aplicar</button>
            <button onClick={onClose} className="px-3 py-2 text-xs rounded bg-gray-700 hover:bg-gray-600">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemePreviewModal;