import React, { useState } from 'react';
import { useGameSettingsStore } from '../store/gameSettingsStore';
import { tokens } from '../styles/designTokens';

const ParametersPanel: React.FC = () => {
  const s = useGameSettingsStore();
  const update = s.updateSettings;
  const [tmp, setTmp] = useState<any>({});
  const apply = () => { update(tmp); setTmp({}); };
  const reset = () => s.resetDefaults();
  return (
    <div className={`${tokens.cardBase} border border-gray-700`}>
      <h2 className="text-2xl font-bold mb-4">⚙️ Parâmetros</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-gray-300" title="Intensidade dos efeitos de relacionamento (descontos/buffs)">Intensidade de Relacionamento (%)</label>
          <input type="range" min={0} max={100} defaultValue={s.relationIntensityPercent ?? 100} onChange={(e) => setTmp({ ...tmp, relationIntensityPercent: Number(e.target.value) })} className="w-full" />
          <div className="text-xs text-gray-400">Atual: {tmp.relationIntensityPercent ?? (s.relationIntensityPercent ?? 100)}%</div>
        </div>
        <div>
          <label className="text-sm text-gray-300" title="Eventos por dia em cascata">Frequência de Eventos/Dia</label>
          <input type="number" min={1} max={5} defaultValue={s.eventsCascadePerDay ?? 2} onChange={(e) => setTmp({ ...tmp, eventsCascadePerDay: Number(e.target.value) })} className="w-full border rounded px-2 py-1 bg-gray-900 text-gray-200 border-gray-700" />
        </div>
        <div>
          <label className="text-sm text-gray-300" title="Cooldown entre interações espontâneas">Cooldown entre Interações (min)</label>
          <input type="number" min={5} max={60} defaultValue={(s.interactionsCooldownMinutes ?? Math.round((s.npcInteractionCooldownSeconds ?? 90)/60))} onChange={(e) => setTmp({ ...tmp, interactionsCooldownMinutes: Number(e.target.value), npcInteractionCooldownSeconds: Number(e.target.value) * 60 })} className="w-full border rounded px-2 py-1 bg-gray-900 text-gray-200 border-gray-700" />
        </div>
        <div>
          <label className="text-sm text-gray-300" title="Permite ou desativa eventos aleatórios">Eventos Aleatórios</label>
          <select defaultValue={String(s.randomEventsEnabled ?? true)} onChange={(e) => setTmp({ ...tmp, randomEventsEnabled: e.target.value === 'true' })} className="w-full border rounded px-2 py-1 bg-gray-900 text-gray-200 border-gray-700">
            <option value="true">Ativos</option>
            <option value="false">Desativados</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-300" title="Cooldown em dias para eventos especiais">Cooldown de Eventos (dias)</label>
          <div className="flex items-center gap-2">
            <input type="number" min={2} max={4} defaultValue={s.eventsCooldownDaysMin ?? 2} onChange={(e) => setTmp({ ...tmp, eventsCooldownDaysMin: Number(e.target.value) })} className="w-full border rounded px-2 py-1 bg-gray-900 text-gray-200 border-gray-700" />
            <input type="number" min={2} max={4} defaultValue={s.eventsCooldownDaysMax ?? 4} onChange={(e) => setTmp({ ...tmp, eventsCooldownDaysMax: Number(e.target.value) })} className="w-full border rounded px-2 py-1 bg-gray-900 text-gray-200 border-gray-700" />
          </div>
        </div>
        <div>
          <label className="text-sm text-gray-300" title="Probabilidade mínima de auto-interação">Chance Mín. (%)</label>
          <input type="range" min={0} max={100} defaultValue={s.autoChanceMinPercent ?? 30} onChange={(e) => setTmp({ ...tmp, autoChanceMinPercent: Number(e.target.value) })} className="w-full" />
          <div className="text-xs text-gray-400">Atual: {tmp.autoChanceMinPercent ?? (s.autoChanceMinPercent ?? 30)}%</div>
        </div>
        <div>
          <label className="text-sm text-gray-300" title="Probabilidade máxima de auto-interação">Chance Máx. (%)</label>
          <input type="range" min={0} max={100} defaultValue={s.autoChanceMaxPercent ?? 70} onChange={(e) => setTmp({ ...tmp, autoChanceMaxPercent: Number(e.target.value) })} className="w-full" />
          <div className="text-xs text-gray-400">Atual: {tmp.autoChanceMaxPercent ?? (s.autoChanceMaxPercent ?? 70)}%</div>
        </div>
        <div>
          <label className="text-sm text-gray-300" title="Ativar som nas notificações">Som nas Notificações</label>
          <select defaultValue={String(s.notifSoundEnabled ?? true)} onChange={(e) => setTmp({ ...tmp, notifSoundEnabled: e.target.value === 'true' })} className="w-full border rounded px-2 py-1 bg-gray-900 text-gray-200 border-gray-700">
            <option value="true">Ativo</option>
            <option value="false">Desativado</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-300" title="Prioridade de notificações">Prioridade</label>
          <select defaultValue={s.notifPriorityMode || 'important_first'} onChange={(e) => setTmp({ ...tmp, notifPriorityMode: e.target.value })} className="w-full border rounded px-2 py-1 bg-gray-900 text-gray-200 border-gray-700">
            <option value="important_first">Importantes primeiro</option>
            <option value="normal">Normal</option>
          </select>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <button onClick={apply} className="px-3 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700">Aplicar</button>
        <button onClick={reset} className="px-3 py-2 rounded bg-gray-600 text-white hover:bg-gray-700">Reset</button>
      </div>
    </div>
  );
};

export default ParametersPanel;