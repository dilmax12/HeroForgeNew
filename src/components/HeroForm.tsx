// CACHE BUSTER - TIMESTAMP: 2024-12-19-19:52
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HeroCreationData, HeroRace, HeroClass, Alignment, Element, HeroAttributes } from '../types/hero';
import { useHeroStore, calculateDerivedAttributes } from '../store/heroStore';
import { generateStory } from '../utils/story';
import { gerarTexto } from '../services/groqTextService';
import { generateHeroWithAI } from '../services/heroCreateService';
import { notificationBus } from './NotificationSystem';

import { 
  generateName, 
  generateNameOptions, 
  getBattleQuote, 
  validateCustomName 
} from '../utils/nameGenerator';
import { 
  createInitialAttributes,
  validateAttributes,
  increaseAttribute,
  decreaseAttribute,
  canIncreaseAttribute,
  canDecreaseAttribute,
  calculateRemainingPoints,
  autoDistributePoints,
  ATTRIBUTE_INFO
} from '../utils/attributeSystem';
import { 
  ELEMENT_INFO, 
  generateRandomElement, 
  getRecommendedElements,
  getElementAdvantageInfo
} from '../utils/elementSystem';
import { getClassSkills } from '../utils/skillSystem';
import { medievalTheme, seasonalThemes, getSeasonalButtonGradient, getSeasonalButtonColors } from '../styles/medievalTheme';
import { useMonetizationStore } from '../store/monetizationStore';
import TalentTreePreview from './TalentTreePreview';
import { CLASS_METADATA } from '../utils/classRegistry';
import { getRaceCompatibility, getRecommendedAttributePlan } from '../utils/compatibility';
import { getElementSuggestionReason } from '../utils/synergyExplain';
import { getPrefs, setPrefs } from '../utils/userPreferences';
import { getRecommendedTalentPlan } from '../utils/talentRecommendations';
import { getClassPreset } from '../utils/buildPresets';
import { getPresetOptions, buildFromPreset } from '../utils/presetLibrary';
import { saveDraft, loadDraft, clearDraft } from '../utils/creationDraft';
import ErrorBoundary from './ErrorBoundary';
import { validateBuild } from '../utils/buildValidate';
import { buildChecklist, buildReadiness } from '../utils/buildSummary';
import { getClassTips } from '../utils/classTips';

const HeroForm = () => {
  const [formData, setFormData] = useState<HeroCreationData>({
    name: '',
    race: 'humano',
    class: 'guerreiro',
    alignment: 'neutro-puro',
    attributes: createInitialAttributes(),
    background: '',
    backstory: '',
    element: 'physical',
    skills: [],
    image: '',
    battleQuote: ''
  });
  
  const [loadingStory, setLoadingStory] = useState(false);
  const [loadingName, setLoadingName] = useState(false);
  const [loadingNameAI, setLoadingNameAI] = useState(false);
  const [loadingQuoteAI, setLoadingQuoteAI] = useState(false);
  const [loadingHFStory, setLoadingHFStory] = useState(false);
  const [loadingHeroAI, setLoadingHeroAI] = useState(false);
  const [loadingImageAI, setLoadingImageAI] = useState(false);
  const [nameOptions, setNameOptions] = useState<string[]>([]);
  const [showNameOptions, setShowNameOptions] = useState(false);
  const [showSkillDetails, setShowSkillDetails] = useState<string | null>(null);
  const [showElementTooltip, setShowElementTooltip] = useState(false);
  const [limitWarning, setLimitWarning] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [creationLog, setCreationLog] = useState<string[]>([]);
  const [decisionHistory, setDecisionHistory] = useState<Array<{ field: 'class'|'race'|'element'; prev: string; next: string; timestamp: string }>>([]);
  const [redoHistory, setRedoHistory] = useState<Array<{ field: 'class'|'race'|'element'; prev: string; next: string; timestamp: string }>>([]);
  const { createHero, acceptReferralInvite } = useHeroStore();
  const { activeSeasonalTheme } = useMonetizationStore();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const referralCode = searchParams.get('ref') || undefined;
  const inviterBy = searchParams.get('by') || undefined;

  const remainingPoints = calculateRemainingPoints(formData.attributes);
  const classSkills = getClassSkills(formData.class);

  const derivedPreview = React.useMemo(() => {
    try {
      return calculateDerivedAttributes(formData.attributes as HeroAttributes, formData.class, 1);
    } catch {
      return undefined;
    }
  }, [formData.attributes, formData.class]);

  useEffect(() => {
    const adv = getElementAdvantageInfo(formData.element);
    console.log('[hero-form] element-adv', { element: formData.element, adv });
    console.log('[hero-form] class-meta', CLASS_METADATA[formData.class]);
    const prefs = getPrefs();
    if (typeof prefs.autoSuggestDisabled === 'boolean') setDisableAutoSuggestion(prefs.autoSuggestDisabled);
  }, [formData.element, formData.class]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && (e.key.toLowerCase() === 'v')) {
        const res = validateBuild(formData as any)
        if (res.ok) setLimitWarning('Build válido ✅')
        else setLimitWarning(res.issues.join(' • '))
      } else if (e.altKey && (e.key.toLowerCase() === 'a')) {
        const recEls = getRecommendedElements(formData.class, formData.race)
        if (recEls.length) handleElementChange(recEls[0] as Element)
        handleAutoDistributeRecommended()
        setFormData(prev => ({ ...prev, plannedTalents: getRecommendedTalentPlan(prev.class) }))
        setLimitWarning('Recomendações aplicadas')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [formData])

  const draftTimer = useRef<number | null>(null);
  useEffect(() => {
    if (draftTimer.current) window.clearTimeout(draftTimer.current)
    draftTimer.current = window.setTimeout(() => { saveDraft(formData) }, 300)
  }, [formData]);

  useEffect(() => {
    const handler = () => { try { saveDraft(formData) } catch {} };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [formData]);

  const handleGenerateName = async () => {
    setLoadingName(true);
    try {
      const options = generateNameOptions(formData.race);
      setNameOptions(options);
      setShowNameOptions(true);
    } catch (error) {
      console.error('Erro ao gerar nomes:', error);
    } finally {
      setLoadingName(false);
    }
  };

  const handleSelectName = (name: string) => {
    setFormData(prev => ({ ...prev, name }));
    setShowNameOptions(false);
  };

  const handleGenerateNameAI = async () => {
    setLoadingNameAI(true);
    try {
      const nome = await gerarTexto('nome');
      if (nome) {
        setFormData(prev => ({ ...prev, name: nome }));
        setShowNameOptions(false);
      }
    } catch (error) {
      console.error('Erro ao gerar nome via IA:', error);
    } finally {
      setLoadingNameAI(false);
    }
  };

  const handleAttributeChange = (attribute: keyof HeroAttributes, increase: boolean) => {
    let newAttributes = formData.attributes;
    
    if (increase && canIncreaseAttribute(formData.attributes, attribute)) {
      newAttributes = increaseAttribute(formData.attributes, attribute);
    } else if (!increase && canDecreaseAttribute(formData.attributes, attribute)) {
      newAttributes = decreaseAttribute(formData.attributes, attribute);
    }
    
    if (newAttributes !== formData.attributes) {
      setFormData(prev => ({ ...prev, attributes: newAttributes }));
    }
  };

  const handleAutoDistribute = () => {
    const newAttributes = autoDistributePoints(formData.attributes);
    setFormData(prev => ({ ...prev, attributes: newAttributes }));
  };

  const handleAutoDistributeRecommended = () => {
    const plan = getRecommendedAttributePlan(formData.class);
    const rc = getRaceCompatibility(formData.class, formData.race as any);
    const weights: Record<string, number> = { alta: rc.ok ? 3 : 2, media: 1, baixa: 0.5 } as any;
    const elemBonus: Record<string, number> = {
      forca: formData.element === 'fire' ? 1 : 0,
      destreza: formData.element === 'thunder' || formData.element === 'ice' ? 1 : 0,
      constituicao: formData.element === 'earth' ? 1 : 0,
      inteligencia: formData.element === 'dark' || formData.element === 'ice' ? 1 : 0,
      sabedoria: formData.element === 'light' ? 1 : 0,
      carisma: 0
    } as any;
    let remaining = calculateRemainingPoints(formData.attributes);
    let attrs = { ...formData.attributes } as any;
    const order = plan.sort((a,b) => (((weights[a.priority] + (elemBonus[a.attribute] || 0)) * (advWeights[a.attribute] || 1)) > ((weights[b.priority] + (elemBonus[b.attribute] || 0)) * (advWeights[b.attribute] || 1)) ? -1 : 1));
    while (remaining > 0) {
      let progressed = false;
      for (const p of order) {
        if (remaining <= 0) break;
        const attrKey = p.attribute as any;
        if (canIncreaseAttribute(attrs, attrKey)) {
          attrs = increaseAttribute(attrs, attrKey);
          remaining = calculateRemainingPoints(attrs);
          progressed = true;
        }
      }
      if (!progressed) break;
    }
    setFormData(prev => ({ ...prev, attributes: attrs }));
  };

  const [elementAutoSuggested, setElementAutoSuggested] = useState(false);
  const [prevElement, setPrevElement] = useState<Element | null>(null);
  const [disableAutoSuggestion, setDisableAutoSuggestion] = useState(false);
  const [showSuggestionInfo, setShowSuggestionInfo] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advWeights, setAdvWeights] = useState<Record<string, number>>({ forca:1, destreza:1, constituicao:1, inteligencia:1, sabedoria:1, carisma:1 });

  const handleElementChange = (element: Element) => {
    setFormData(prev => ({ 
      ...prev, 
      element,
      skills: getClassSkills(prev.class)
    }));
    setElementAutoSuggested(false);
    setPrevElement(null);
    setCreationLog(prev => [...prev, `Elemento alterado para ${element}`]);
    setDecisionHistory(prev => [...prev, { field: 'element', prev: String(formData.element), next: String(element), timestamp: new Date().toISOString() }]);
    setRedoHistory([]);
  };

  const handleGenerateRandomElement = () => {
    const randomElement = generateRandomElement();
    handleElementChange(randomElement);
  };

  const handleClassChange = (newClass: HeroClass) => {
    const meta = CLASS_METADATA[newClass];
    if (meta?.requirements) {
      const check = meta.requirements({ attributes: formData.attributes, race: formData.race });
      if (!check.ok) { setLimitWarning(check.message || 'Requisitos da classe não atendidos.'); return; }
    }
    const newSkills = getClassSkills(newClass);
    const newBattleQuote = getBattleQuote(newClass);
    const recEls = getRecommendedElements(newClass, formData.race);
    const nextElement = disableAutoSuggestion ? formData.element : ((formData.element === 'physical' || !recEls.includes(formData.element)) && recEls.length ? (recEls[0] as Element) : formData.element);
    
    setFormData(prev => ({ 
      ...prev, 
      class: newClass,
      skills: newSkills,
      battleQuote: newBattleQuote,
      element: nextElement,
      plannedTalents: []
    }));
    if (!disableAutoSuggestion && nextElement !== formData.element) { setPrevElement(formData.element); setElementAutoSuggested(true); setShowSuggestionInfo(true); }
    setCreationLog(prev => [...prev, `Classe alterada para ${newClass}`]);
    setDecisionHistory(prev => [...prev, { field: 'class', prev: String(formData.class), next: String(newClass), timestamp: new Date().toISOString() }]);
    setRedoHistory([]);
  };

  

  const handleRaceChange = (race: HeroRace) => {
    const recEls = getRecommendedElements(formData.class, race);
    const nextElement = disableAutoSuggestion ? formData.element : ((formData.element === 'physical' || !recEls.includes(formData.element)) && recEls.length ? (recEls[0] as Element) : formData.element);
    setFormData(prev => ({ ...prev, race, element: nextElement }));
    if (!disableAutoSuggestion && nextElement !== formData.element) { setPrevElement(formData.element); setElementAutoSuggested(true); setShowSuggestionInfo(true); }
    setCreationLog(prev => [...prev, `Raça alterada para ${race}`]);
    setDecisionHistory(prev => [...prev, { field: 'race', prev: String(formData.race), next: String(race), timestamp: new Date().toISOString() }]);
    setRedoHistory([]);
  };

  const applyClassBaseAttributes = () => {
    const meta = CLASS_METADATA[formData.class];
    if (meta) {
      setFormData(prev => ({ ...prev, attributes: { ...meta.baseAttributes } }));
    }
  };

  const finalizeCreation = () => {
    try {
      const created = createHero(formData);
      if (referralCode) {
        acceptReferralInvite(referralCode, created.id);
        try {
          const inv = useHeroStore.getState().getReferralInviteByCode(referralCode);
          if (inv?.id) {
            useHeroStore.getState().logReferralActivity(inv.id, 'accepted', inviterBy ? `by:${inviterBy}` : `new:${created.id}`);
          }
        } catch {}
      }
      setConfirmOpen(false);
      navigate('/');
    } catch (error) {
      console.error('Erro ao criar herói:', error);
      setLimitWarning('Erro ao criar herói. Tente novamente.');
    }
  };

  const handleGenerateBattleQuote = () => {
    const quote = getBattleQuote(formData.class);
    setFormData(prev => ({ ...prev, battleQuote: quote }));
  };

  const handleGenerateBattleQuoteAI = async () => {
    setLoadingQuoteAI(true);
    try {
      const frase = await gerarTexto('frase');
      if (frase) {
        setFormData(prev => ({ ...prev, battleQuote: frase }));
        notificationBus.emit({
          type: 'achievement',
          title: 'Frase gerada!',
          message: 'A frase de batalha foi atualizada.',
          icon: '💬',
          duration: 3500
        });
      }
    } catch (error) {
      console.error('Erro ao gerar frase via IA:', error);
      notificationBus.emit({
        type: 'quest',
        title: 'Falha ao gerar frase',
        message: 'Verifique a chave de IA e a conexão.',
        icon: '⚠️',
        duration: 4500
      });
    } finally {
      setLoadingQuoteAI(false);
    }
  };

  const handleGenerateHeroAI = async () => {
    setLoadingHeroAI(true);
    try {
      const result = await generateHeroWithAI({
        race: formData.race,
        klass: formData.class,
        attrs: formData.attributes as Record<string, number>
      });
      setFormData(prev => ({
        ...prev,
        name: result.name || prev.name,
        backstory: result.story || prev.backstory,
        battleQuote: result.phrase || prev.battleQuote,
        image: result.image || prev.image
      }));
      setShowNameOptions(false);
      notificationBus.emit({
        type: 'achievement',
        title: 'Herói gerado!',
        message: 'Nome, história, frase e imagem atualizados.',
        icon: '🧙',
        duration: 4500
      });
    } catch (error) {
      console.error('Erro ao gerar herói via IA:', error);
      setLimitWarning('Falha ao gerar herói com IA. Tente novamente.');
      notificationBus.emit({
        type: 'quest',
        title: 'Falha ao gerar herói',
        message: 'Tente novamente mais tarde.',
        icon: '⚠️',
        duration: 4500
      });
    } finally {
      setLoadingHeroAI(false);
    }
  };

  const handleGenerateImageAI = async () => {
    setLoadingImageAI(true);
    try {
      const result = await generateHeroWithAI({
        race: formData.race,
        klass: formData.class,
        attrs: formData.attributes as Record<string, number>
      });
      if (result.image) {
        setFormData(prev => ({ ...prev, image: result.image }));
        notificationBus.emit({
          type: 'achievement',
          title: 'Avatar gerado!',
          message: 'Imagem criada com IA usando seus dados.',
          icon: '🖼️',
          duration: 4000
        });
      } else {
        setLimitWarning('A IA não retornou uma imagem. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao gerar imagem via IA:', error);
      setLimitWarning('Falha ao gerar imagem com IA. Tente novamente mais tarde.');
      notificationBus.emit({
        type: 'quest',
        title: 'Falha na geração de imagem',
        message: 'Tente novamente mais tarde.',
        icon: '⚠️',
        duration: 4500
      });
    } finally {
      setLoadingImageAI(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setFormData(prev => ({ ...prev, image: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const meta = CLASS_METADATA[formData.class];
    if (meta?.requirements) {
      const check = meta.requirements({ attributes: formData.attributes, race: formData.race });
      if (!check.ok) {
        setLimitWarning(check.message || 'Requisitos da classe não atendidos.');
        return;
      }
    }
    
    const validation = validateAttributes(formData.attributes);
    if (!validation.valid) {
      setLimitWarning(validation.errors.join(', ') || 'Atributos inválidos');
      return;
    }
    
    if (!formData.name.trim()) {
      setLimitWarning('Nome é obrigatório');
      return;
    }

    const nameValidation = validateCustomName(formData.name);
    if (!nameValidation.valid) {
      setLimitWarning(nameValidation.message || 'Nome inválido');
      return;
    }
    
    setConfirmOpen(true);
  };
  const handleUndoLastDecision = () => {
    const last = decisionHistory.slice(-1)[0];
    if (!last) return;
    setDecisionHistory(prev => prev.slice(0, -1));
    setRedoHistory(prev => [...prev, last]);
    if (last.field === 'class') {
      const prevClass = last.prev as HeroClass;
      const newSkills = getClassSkills(prevClass);
      const newQuote = getBattleQuote(prevClass);
      setFormData(prev => ({ ...prev, class: prevClass, skills: newSkills, battleQuote: newQuote }));
      setCreationLog(prev => [...prev, `Desfeito: classe voltou para ${prevClass}`]);
    } else if (last.field === 'race') {
      const prevRace = last.prev as HeroRace;
      setFormData(prev => ({ ...prev, race: prevRace }));
      setCreationLog(prev => [...prev, `Desfeito: raça voltou para ${prevRace}`]);
    } else if (last.field === 'element') {
      const prevEl = last.prev as Element;
      setFormData(prev => ({ ...prev, element: prevEl, skills: getClassSkills(prev.class) }));
      setCreationLog(prev => [...prev, `Desfeito: elemento voltou para ${prevEl}`]);
    }
  };

  const handleRedoLastDecision = () => {
    const last = redoHistory.slice(-1)[0];
    if (!last) return;
    setRedoHistory(prev => prev.slice(0, -1));
    setDecisionHistory(prev => [...prev, last]);
    if (last.field === 'class') {
      const nextClass = last.next as HeroClass;
      const newSkills = getClassSkills(nextClass);
      const newQuote = getBattleQuote(nextClass);
      setFormData(prev => ({ ...prev, class: nextClass, skills: newSkills, battleQuote: newQuote }));
      setCreationLog(prev => [...prev, `Refeito: classe alterada para ${nextClass}`]);
    } else if (last.field === 'race') {
      const nextRace = last.next as HeroRace;
      setFormData(prev => ({ ...prev, race: nextRace }));
      setCreationLog(prev => [...prev, `Refeito: raça alterada para ${nextRace}`]);
    } else if (last.field === 'element') {
      const nextEl = last.next as Element;
      setFormData(prev => ({ ...prev, element: nextEl, skills: getClassSkills(prev.class) }));
      setCreationLog(prev => [...prev, `Refeito: elemento alterado para ${nextEl}`]);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold text-amber-400 mb-2 text-center">Forjar Novo Herói - Versão 3.0</h2>
      {(() => { const r = buildReadiness(formData as any); return (
        <div className={`mb-4 p-2 rounded text-sm text-center ${r.status === 'ok' ? 'bg-emerald-700/30 text-emerald-200' : r.status === 'warn' ? 'bg-amber-700/30 text-amber-200' : 'bg-red-700/30 text-red-200'}`}>Prontidão do build: {r.message}</div>
      ) })()}
      <div className="mb-4 flex items-center justify-end gap-2">
        <select
          onChange={(e) => {
            const p = getPresetOptions().find(x => x.id === e.target.value)
            if (p) setFormData(prev => ({ ...prev, ...(buildFromPreset(p) as any) }))
          }}
          defaultValue=""
          className="px-2 py-1 rounded bg-gray-700 text-white text-xs"
        >
          <option value="" disabled>Carregar preset...</option>
          {getPresetOptions().map(o => (<option key={o.id} value={o.id}>{o.name}</option>))}
        </select>
        <button
          type="button"
          onClick={async () => { try { await navigator.clipboard.writeText(JSON.stringify({ name: formData.name, race: formData.race, class: formData.class, attributes: formData.attributes, element: formData.element, plannedTalents: formData.plannedTalents || [] })); } catch {} }}
          className="px-3 py-1 rounded bg-indigo-600 text-white text-xs hover:bg-indigo-700"
        >
          Exportar build
        </button>
        <button
          type="button"
          onClick={() => {
            const raw = window.prompt('Cole o JSON do build') || ''
            try {
              const b = JSON.parse(raw)
              if (b && typeof b === 'object') {
                setFormData(prev => ({ ...prev, name: b.name || prev.name, race: b.race || prev.race, class: b.class || prev.class, attributes: b.attributes || prev.attributes, element: b.element || prev.element, plannedTalents: Array.isArray(b.plannedTalents) ? b.plannedTalents : (prev.plannedTalents || []) }))
              }
            } catch {}
          }}
          className="px-3 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700"
        >
          Importar build
        </button>
        <button
          type="button"
          onClick={() => {
            const d = loadDraft(); if (d) setFormData(prev => ({ ...prev, ...d as any }))
          }}
          className="px-3 py-1 rounded bg-gray-600 text-white text-xs hover:bg-gray-700"
        >
          Carregar rascunho
        </button>
        <button
          type="button"
          onClick={() => { clearDraft(); }}
          className="px-3 py-1 rounded bg-gray-600 text-white text-xs hover:bg-gray-700"
        >
          Limpar rascunho
        </button>
        <button
          type="button"
          onClick={() => {
            const res = validateBuild(formData as any)
            if (res.ok) setLimitWarning('Build válido ✅')
            else setLimitWarning(res.issues.join(' • '))
          }}
          className="px-3 py-1 rounded bg-amber-600 text-white text-xs hover:bg-amber-700"
        >
          Validar build
        </button>
        <button
          type="button"
          onClick={() => {
            setFormData(prev => ({ ...prev, name: '', race: 'humano', class: 'guerreiro', attributes: createInitialAttributes(), element: 'physical', plannedTalents: [] }))
            setLimitWarning('Build resetado')
          }}
          className="px-3 py-1 rounded bg-gray-600 text-white text-xs hover:bg-gray-700"
        >
          Resetar build
        </button>
      </div>
      
      <ErrorBoundary>
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Seção 1: Raça e Nome */}
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="text-xl font-semibold text-amber-400 mb-4">1. Raça e Nome</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300">Raça</label>
              <select
                value={formData.race}
                onChange={(e) => handleRaceChange(e.target.value as HeroRace)}
                className="mt-1 block w-full rounded-md bg-gray-600 border-gray-500 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="humano">Humano</option>
                <option value="elfo">Elfo</option>
                <option value="anao">Anão</option>
                <option value="orc">Orc</option>
                <option value="halfling">Halfling</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300">Nome</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="mt-1 block w-full rounded-md bg-gray-600 border-gray-500 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Nome do herói"
                  required
                />
                <button
                  type="button"
                  onClick={handleGenerateName}
                  disabled={loadingName}
                  className="mt-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-md text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {loadingName ? '...' : '🎲'}
                </button>
                <button
                  type="button"
                  onClick={handleGenerateNameAI}
                  disabled={loadingNameAI}
                  className="mt-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {loadingNameAI ? '...' : '🤖 IA'}
                </button>
                {/* Botão 'Gerar com IA' removido por não estar em uso */}
              </div>
              
              {showNameOptions && (
                <div className="mt-2 p-2 bg-gray-600 rounded-md">
                  <p className="text-xs text-gray-300 mb-2">Sugestões para {formData.race}:</p>
                  <div className="flex flex-wrap gap-1">
                    {nameOptions.map((name, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSelectName(name)}
                        className="px-2 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs transition-colors"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {getClassTips(formData.class).length > 0 && (
                <div className="mt-2 p-2 rounded bg-gray-800 text-xs text-gray-200">
                  <div className="font-semibold">Dicas de classe</div>
                  <ul className="mt-1 list-disc pl-5">
                    {getClassTips(formData.class).map((t, i) => (<li key={`tip-${i}`}>{t}</li>))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Seção 2: Classe e Skills */}
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="text-xl font-semibold text-amber-400 mb-4">2. Classe e Habilidades</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300">Classe</label>
            <div role="radiogroup" aria-label="Seleção de classe" className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.values(CLASS_METADATA).map((meta, idx, arr) => (
                <button
                  key={meta.id}
                  type="button"
                  role="radio"
                  aria-checked={formData.class === meta.id}
                  onClick={() => handleClassChange(meta.id)}
                  onKeyDown={(e) => {
                    const ids = arr.map(m => m.id as HeroClass);
                    const curIdx = ids.indexOf(formData.class);
                    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                      const next = ids[(curIdx + 1) % ids.length];
                      handleClassChange(next);
                    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                      const prev = ids[(curIdx - 1 + ids.length) % ids.length];
                      handleClassChange(prev);
                    }
                  }}
                  className={`text-left p-3 rounded border transition-transform duration-200 active:scale-95 focus:scale-105 ${formData.class === meta.id ? 'border-amber-500 bg-amber-500/20' : 'border-gray-600 bg-gray-700'} hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                  tabIndex={0}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-white font-semibold">{meta.icon} {meta.name}</div>
                    {formData.class === meta.id && <span className="text-xs text-amber-300">Selecionado</span>}
                  </div>
                  <p className="text-xs text-gray-300 mt-1">{meta.description}</p>
                  <div className="mt-2 text-xs text-gray-400">Atributos base: {Object.entries(meta.baseAttributes).map(([k,v]) => `${k}:${v}`).join(' • ')}</div>
                  <div className="mt-2 text-xs text-emerald-300">Vantagens: {meta.advantages.join(', ')}</div>
                  {meta.disadvantages.length > 0 && <div className="mt-1 text-xs text-red-300">Desvantagens: {meta.disadvantages.join(', ')}</div>}
                  {meta.requirements && (() => { const c = meta.requirements({ attributes: formData.attributes, race: formData.race }); return <div className={`mt-1 text-xs ${c.ok ? 'text-emerald-300' : 'text-yellow-300'}`}>{c.ok ? 'Requisitos atendidos' : c.message || 'Requisitos pendentes'}</div>; })()}
                </button>
              ))}
            </div>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={applyClassBaseAttributes} className={`px-3 py-1 rounded bg-gradient-to-r ${getSeasonalButtonGradient(activeSeasonalTheme as any)} text-white hover:brightness-110`}>Aplicar atributos base da classe</button>
            <button type="button" onClick={handleGenerateBattleQuote} className={`px-3 py-1 rounded bg-gradient-to-r ${getSeasonalButtonGradient(activeSeasonalTheme as any)} text-white hover:brightness-110 flex items-center gap-2`}>
              {(seasonalThemes as any)[activeSeasonalTheme || '']?.accents?.[0] || ''}
              <span>Gerar Frase de Batalha</span>
            </button>
          </div>
          <div className="mt-3 p-3 rounded bg-gray-700">
            <div className="text-white font-semibold">Sinergias</div>
            <div className="mt-2 flex items-center gap-2">
              <label className="text-xs text-gray-300 flex items-center gap-1">
                <input type="checkbox" checked={disableAutoSuggestion} onChange={(e) => { setDisableAutoSuggestion(e.target.checked); setPrefs({ autoSuggestDisabled: e.target.checked }); }} />
                Não sugerir automaticamente
              </label>
              <button type="button" onClick={handleUndoLastDecision} className="px-2 py-1 rounded bg-gray-600 text-white text-xs">Desfazer última decisão</button>
              <button type="button" onClick={handleRedoLastDecision} className="px-2 py-1 rounded bg-gray-600 text-white text-xs">Refazer</button>
              <button type="button" onClick={() => { const p = getClassPreset(formData.class, formData.race); setFormData(prev => ({ ...prev, attributes: p.attributes, element: p.element, plannedTalents: p.plannedTalents })); }} className="px-2 py-1 rounded bg-emerald-600 text-white text-xs">Aplicar preset de classe</button>
              <button type="button" onClick={() => { const recEls = getRecommendedElements(formData.class, formData.race); if (recEls.length) handleElementChange(recEls[0] as Element); handleAutoDistributeRecommended(); setFormData(prev => ({ ...prev, plannedTalents: getRecommendedTalentPlan(prev.class) })); setLimitWarning('Recomendações aplicadas'); }} className="px-2 py-1 rounded bg-amber-600 text-white text-xs">Aplicar recomendações</button>
            </div>
            <div className="text-xs text-gray-300 mt-1">Elementos recomendados: {getRecommendedElements(formData.class, formData.race).join(', ')}</div>
              <div className="mt-2 flex flex-wrap gap-2">
              {getRecommendedElements(formData.class, formData.race).map(el => (
                <button
                  key={el}
                  type="button"
                  onClick={() => handleElementChange(el as Element)}
                  onKeyDown={(e) => {
                    const els = getRecommendedElements(formData.class, formData.race)
                    const idx = els.indexOf(formData.element)
                    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                      const next = els[(idx + 1) % els.length]
                      handleElementChange(next as Element)
                    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                      const prev = els[(idx - 1 + els.length) % els.length]
                      handleElementChange(prev as Element)
                    }
                  }}
                  className={`px-2 py-1 rounded text-xs ${formData.element === el ? 'bg-amber-600 text-white' : 'bg-gray-600 text-gray-200 hover:bg-gray-500'}`}
                  role="button" aria-selected={formData.element === el} tabIndex={0}
                >
                  {el}
                </button>
              ))}
            </div>
              {CLASS_METADATA[formData.class]?.suggestedRaces?.length && (
                <div className="mt-2">
                  <div className="text-xs text-amber-300">Raças sugeridas:</div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {CLASS_METADATA[formData.class]?.suggestedRaces?.map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleRaceChange(r as HeroRace)}
                        onKeyDown={(e) => {
                          const rs = CLASS_METADATA[formData.class]?.suggestedRaces || []
                          const idx = rs.indexOf(formData.race)
                          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                            const next = rs[(idx + 1) % rs.length]
                            handleRaceChange(next as HeroRace)
                          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                            const prev = rs[(idx - 1 + rs.length) % rs.length]
                            handleRaceChange(prev as HeroRace)
                          }
                        }}
                        className={`px-2 py-1 rounded text-xs ${formData.race === r ? 'bg-amber-600 text-white' : 'bg-gray-600 text-gray-200 hover:bg-gray-500'}`}
                        role="button" aria-selected={formData.race === r} tabIndex={0}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {elementAutoSuggested && (
                <div className="mt-2 p-2 rounded bg-gray-800 text-xs text-amber-300">
                  <div className="flex items-center gap-2">
                    <span>Elemento sugerido automaticamente: {formData.element}</span>
                    {prevElement && (
                      <button type="button" onClick={() => handleElementChange(prevElement)} className="px-2 py-0.5 rounded bg-gray-600 text-white">Reverter</button>
                    )}
                    {showSuggestionInfo && (
                      <button type="button" onClick={() => setShowSuggestionInfo(false)} className="px-2 py-0.5 rounded bg-gray-600 text-white">Entendi</button>
                    )}
                  </div>
                  {showSuggestionInfo && (
                    <div className="mt-1 text-gray-300">{getElementSuggestionReason(formData.class, formData.race, formData.element)}</div>
                  )}
                </div>
              )}
            {(() => {
              const advObj: any = getElementAdvantageInfo(formData.element);
              const strong = Array.isArray(advObj?.strong) ? advObj.strong.join(', ') : String(advObj?.strong || '');
              const weak = Array.isArray(advObj?.weak) ? advObj.weak.join(', ') : String(advObj?.weak || '');
              const neutral = Array.isArray(advObj?.neutral) ? advObj.neutral.join(', ') : String(advObj?.neutral || '');
              return (
                <div className="text-xs text-gray-400">Vantagens do elemento atual ({formData.element}): Forte contra {strong} • Fraco contra {weak} • Neutro {neutral}</div>
              );
            })()}
            <div className="mt-2 p-2 rounded bg-gray-800 text-xs text-gray-200">
              <div className="font-semibold">Resumo de recomendações</div>
              <div className="mt-1">Elemento recomendado: {getRecommendedElements(formData.class, formData.race)[0] || '—'}</div>
              <div>Raças sugeridas: {(CLASS_METADATA[formData.class]?.suggestedRaces || []).join(', ') || '—'}</div>
              <div className="mt-1">Plano de atributos recomendado: {getRecommendedAttributePlan(formData.class).map(p => `${p.attribute}:${p.priority}`).join(' • ')}</div>
              <div className="mt-1 text-gray-400">Atalho: Alt+A aplica recomendações</div>
            </div>
            {CLASS_METADATA[formData.class]?.suggestedRaces?.length && (
              <div className="text-xs text-amber-300 mt-1">Raças sugeridas: {CLASS_METADATA[formData.class]?.suggestedRaces?.join(', ')}</div>
            )}
            {(() => {
              const rc = getRaceCompatibility(formData.class, formData.race as any)
              return <div className={`text-xs mt-1 ${rc.ok ? 'text-emerald-300' : 'text-yellow-300'}`}>Compatibilidade da raça atual: {rc.message}</div>
            })()}
            <div className="mt-2 text-xs text-gray-300">Distribuição recomendada de atributos:</div>
            <ul className="mt-1 text-xs text-gray-400 list-disc pl-5">
              {getRecommendedAttributePlan(formData.class).map((p) => (
                <li key={p.attribute}>{p.attribute}: prioridade {p.priority} — {p.hint}</li>
              ))}
            </ul>
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
            {derivedPreview && (
              <div className="p-3 rounded bg-gray-700">
                <div className="text-white font-semibold">Pré-visualização de atributos derivados</div>
                <div className="mt-2 text-xs text-gray-300">HP: {derivedPreview.hp} • MP: {derivedPreview.mp} • Iniciativa: {derivedPreview.initiative} • Classe de Armadura: {derivedPreview.armorClass} • Sorte: {derivedPreview.luck}</div>
              </div>
            )}
          </div>
          </div>

          <div>
            <h4 className="text-lg font-medium text-gray-300 mb-2">Habilidades Iniciais:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {classSkills.map((skill) => (
                <div key={skill.id} className="bg-gray-600 p-3 rounded-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-medium text-white">{skill.name}</h5>
                      <p className="text-xs text-gray-300">{skill.type}{skill.element ? ` • ${skill.element}` : ''}</p>
                      <p className="text-xs text-amber-300">Custo: {skill.cost}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSkillDetails(showSkillDetails === skill.id ? null : skill.id)}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      ℹ️
                    </button>
                  </div>
                  
                  {showSkillDetails === skill.id && (
                    <div className="mt-2 p-2 bg-gray-700 rounded text-xs">
                      <p className="text-gray-300">{skill.description}</p>
                      {skill.basePower && <p className="text-amber-300">Poder: {skill.basePower}</p>}
                      {skill.duration && <p className="text-green-300">Duração: {skill.duration} turnos</p>}
                      {skill.cooldown && <p className="text-red-300">Cooldown: {skill.cooldown} turnos</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 p-4 rounded bg-gray-700">
            <div className="flex items-center gap-3">
              <div className="text-3xl">{(medievalTheme.icons.classes as any)[formData.class?.[0].toUpperCase() + formData.class?.slice(1)] || '🧝'}</div>
              <div>
                <div className="text-white font-semibold">Prévia: {formData.name || '—'} • {formData.class}</div>
                <div className="text-xs text-gray-300">Alinhamento: {formData.alignment} • Raça: {formData.race}</div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
              {buildChecklist(formData as any).map((c, i) => (
                <div key={`chk-${i}`} className={`p-2 rounded text-xs ${c.status === 'ok' ? 'bg-emerald-700/30 text-emerald-200' : c.status === 'warn' ? 'bg-amber-700/30 text-amber-200' : 'bg-red-700/30 text-red-200'}`}>
                  <div className="font-semibold">{c.label}</div>
                  {c.detail && <div>{c.detail}</div>}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-white font-semibold">Árvore de Talentos</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => { try { await navigator.clipboard.writeText(JSON.stringify(formData.plannedTalents || [])); } catch {} }}
                  className="px-3 py-1 rounded bg-indigo-600 text-white text-xs hover:bg-indigo-700"
                >
                  Exportar plano
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const raw = window.prompt('Cole o JSON do plano de talentos') || ''
                    try { const arr = JSON.parse(raw); if (Array.isArray(arr)) setFormData(prev => ({ ...prev, plannedTalents: arr })) } catch {}
                  }}
                  className="px-3 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700"
                >
                  Importar plano
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, plannedTalents: getRecommendedTalentPlan(prev.class) }))}
                  className="px-3 py-1 rounded bg-emerald-600 text-white text-xs hover:bg-emerald-700"
                >
                  Aplicar plano sugerido
                </button>
              </div>
            </div>
            <TalentTreePreview heroClass={formData.class} plannedTalents={formData.plannedTalents || []} currentLevel={1} onToggle={(id) => setFormData(prev => ({ ...prev, plannedTalents: (prev.plannedTalents || []).includes(id) ? (prev.plannedTalents || []).filter(x => x !== id) : [...(prev.plannedTalents || []), id] }))} />
          </div>
        </div>

        {/* Seção 3: Atributos */}
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="text-xl font-semibold text-amber-400 mb-4">3. Atributos</h3>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-amber-300 font-semibold">
              Pontos restantes: {remainingPoints}
            </p>
            <button
              type="button"
              onClick={handleAutoDistribute}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
            >
              Auto-Distribuir
            </button>
            <button
              type="button"
              onClick={handleAutoDistributeRecommended}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 rounded text-sm transition-colors"
            >
              Auto-distribuir recomendações
            </button>
            <button
              type="button"
              onClick={() => setAdvancedOpen(v => !v)}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-sm transition-colors"
            >
              {advancedOpen ? 'Ocultar avançado' : 'Personalização avançada'}
            </button>
          </div>
          
          {limitWarning && (
            <p className="text-sm text-red-400 mb-4">{limitWarning}</p>
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(formData.attributes).map(([attr, value]) => (
              <div key={attr} className="flex flex-col items-center">
                <label className="block text-sm font-medium text-gray-300 capitalize mb-1">
                  {attr}
                </label>
                <p className="text-xs text-gray-400 text-center mb-2">
                  {ATTRIBUTE_INFO[attr as keyof HeroAttributes].description}
                </p>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => handleAttributeChange(attr as keyof HeroAttributes, false)}
                    className="px-2 py-1 bg-red-700 hover:bg-red-600 rounded-l-md disabled:opacity-50 transition-colors"
                    disabled={!canDecreaseAttribute(formData.attributes, attr as keyof HeroAttributes)}
                  >
                    -
                  </button>
                  <span className="px-4 py-1 bg-gray-600 min-w-[3rem] text-center">{value}</span>
                  <button
                    type="button"
                    onClick={() => handleAttributeChange(attr as keyof HeroAttributes, true)}
                    className="px-2 py-1 bg-green-700 hover:bg-green-600 rounded-r-md disabled:opacity-50 transition-colors"
                    disabled={!canIncreaseAttribute(formData.attributes, attr as keyof HeroAttributes)}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
          {advancedOpen && (
            <div className="mt-4 p-3 rounded bg-gray-800">
              <div className="text-white font-semibold mb-2">Pesos avançados de atributos</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.keys(advWeights).map((k) => (
                  <div key={`w-${k}`} className="text-xs text-gray-300">
                    <div className="flex items-center justify-between">
                      <span className="capitalize">{k}</span>
                      <span className="text-amber-300">{advWeights[k].toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={3}
                      step={0.1}
                      value={advWeights[k]}
                      onChange={(e) => setAdvWeights(prev => ({ ...prev, [k]: Number(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs text-gray-400">Os pesos influenciam a auto-distribuição recomendada, permitindo personalização avançada.</div>
            </div>
          )}
        </div>

        {/* Seção 4: Elemento */}
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="text-xl font-semibold text-amber-400 mb-4">4. Elemento</h3>
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={handleGenerateRandomElement}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors bg-gradient-to-r ${getSeasonalButtonGradient(activeSeasonalTheme as any)} text-white hover:brightness-110 flex items-center gap-2`}
            >
              {(seasonalThemes as any)[activeSeasonalTheme || '']?.accents?.[0] || ''}
              <span>🎲 Gerar Aleatório</span>
            </button>
            <button
              type="button"
              onClick={() => setShowElementTooltip(!showElementTooltip)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors bg-gradient-to-r ${getSeasonalButtonGradient(activeSeasonalTheme as any)} text-white hover:brightness-110`}
            >
              ℹ️ Relações
            </button>
          </div>

          {showElementTooltip && (
            <div className="mb-4 p-3 bg-gray-600 rounded-md text-sm">
              <h5 className="font-medium text-white mb-2">Vantagens Elementais:</h5>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <p>Fogo vence Gelo</p>
                <p>Gelo vence Trovão</p>
                <p>Trovão vence Terra</p>
                <p>Terra vence Fogo</p>
                <p>Luz contra Sombra</p>
                <p>Físico é neutro</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
            {Object.entries(ELEMENT_INFO).map(([element, info]) => (
              <button
                key={element}
                type="button"
                onClick={() => handleElementChange(element as Element)}
                className={`p-3 rounded-md text-center transition-colors ${
                  formData.element === element
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                }`}
              >
                <div className="text-2xl mb-1">{info.icon}</div>
                <div className="text-xs">{info.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Seção 5: Imagem */}
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="text-xl font-semibold text-amber-400 mb-4">5. Imagem do Herói</h3>
          <div className="flex gap-4 items-start">
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-medium transition-colors"
              >
                📁 Upload de Imagem
              </button>
              <p className="text-xs text-gray-400 mt-1">
                Formatos aceitos: JPG, PNG, GIF (máx. 5MB)
              </p>
            </div>

            <div className="flex-1">
              <button
                type="button"
                onClick={handleGenerateImageAI}
                disabled={loadingImageAI}
                className={`w-full px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-60 bg-gradient-to-r ${getSeasonalButtonGradient(activeSeasonalTheme as any)} text-white hover:brightness-110 flex items-center gap-2`}
              >
                {(seasonalThemes as any)[activeSeasonalTheme || '']?.accents?.[0] || ''}
                <span>{loadingImageAI ? 'Gerando...' : '🤖 Gerar Avatar IA'}</span>
              </button>
              <p className="text-xs text-gray-400 mt-1">
                Usa raça, classe e atributos para criar a imagem.
              </p>
            </div>

            {formData.image && (
              <div className="w-24 h-24 bg-gray-600 rounded-md overflow-hidden">
                <img
                  src={formData.image.includes('image.pollinations.ai/prompt/')
                    ? formData.image
                        .replace('https://image.pollinations.ai/prompt/', '/api/pollinations-image?prompt=')
                        .replace('?n=1&', '&')
                    : formData.image}
                  alt="Preview do herói"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>

        {/* Seção 6: Frase de Batalha */}
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="text-xl font-semibold text-amber-400 mb-4">6. Frase de Batalha</h3>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={handleGenerateBattleQuote}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors bg-gradient-to-r ${getSeasonalButtonGradient(activeSeasonalTheme as any)} text-white hover:brightness-110 flex items-center gap-2`}
            >
              {(seasonalThemes as any)[activeSeasonalTheme || '']?.accents?.[0] || ''}
              <span>🎲 Gerar Aleatória</span>
            </button>
            <button
              type="button"
              onClick={handleGenerateBattleQuoteAI}
              disabled={loadingQuoteAI}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-60 bg-gradient-to-r ${getSeasonalButtonGradient(activeSeasonalTheme as any)} text-white hover:brightness-110 flex items-center gap-2`}
            >
              {(seasonalThemes as any)[activeSeasonalTheme || '']?.accents?.[0] || ''}
              <span>{loadingQuoteAI ? 'Gerando...' : '🤖 Gerar com IA'}</span>
            </button>
          </div>
          <textarea
            value={formData.battleQuote || ''}
            onChange={(e) => setFormData({...formData, battleQuote: e.target.value})}
            rows={2}
            className="w-full rounded-md bg-gray-600 border-gray-500 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Digite uma frase épica para seu herói..."
          />
        </div>

        
        
        {/* História */}
        <div>
          <label className="block text-sm font-medium text-gray-300">História</label>
          <div className="flex gap-3 mb-2">
            <button
              type="button"
              onClick={() => {
                setLoadingStory(true);
                setTimeout(() => {
                  const story = generateStory(formData);
                  setFormData(prev => ({ ...prev, backstory: story }));
                  setLoadingStory(false);
                }, 600);
              }}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-60 bg-gradient-to-r ${getSeasonalButtonGradient(activeSeasonalTheme as any)} text-white hover:brightness-110 flex items-center gap-2`}
              disabled={loadingStory || !formData.name.trim()}
            >
              {(seasonalThemes as any)[activeSeasonalTheme || '']?.accents?.[0] || ''}
              <span>{loadingStory ? 'Gerando...' : 'Gerar história'}</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                setLoadingHFStory(true);
                try {
                  const contexto = `${formData.name || 'Herói'}, classe ${formData.class}, raça ${formData.race}, elemento ${formData.element}`;
                  const historia = await gerarTexto('historia', contexto);
                  setFormData(prev => ({ ...prev, backstory: historia }));
                  notificationBus.emit({
                    type: 'achievement',
                    title: 'História gerada!',
                    message: 'A história do herói foi atualizada.',
                    icon: '📖',
                    duration: 4000
                  });
                } catch (error) {
                  console.error('Erro ao gerar história via IA:', error);
                  notificationBus.emit({
                    type: 'quest',
                    title: 'Falha ao gerar história',
                    message: 'Verifique a chave de IA e a conexão.',
                    icon: '⚠️',
                    duration: 4500
                  });
                } finally {
                  setLoadingHFStory(false);
                }
              }}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium transition-colors disabled:opacity-60"
              disabled={loadingHFStory || !formData.name.trim()}
            >
              {loadingHFStory ? 'Gerando...' : '🤖 História (IA)'}
            </button>
          </div>
          <textarea
            value={formData.backstory || ''}
            onChange={(e) => setFormData({...formData, backstory: e.target.value})}
            rows={4}
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Conte a história do seu herói..."
          />
        </div>
        
        {/* Botão de envio */}
        <div className="flex justify-center">
          <button
            type="submit"
            className="px-8 py-4 bg-amber-600 hover:bg-amber-700 rounded-md font-bold text-lg transition-colors disabled:opacity-60"
            disabled={!validateAttributes(formData.attributes).valid || !formData.name.trim()}
          >
            ⚔️ Forjar Herói
          </button>
        </div>
      </form>
      </ErrorBoundary>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="confirm-create-title">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmOpen(false)}></div>
          <div className="relative z-10 w-full max-w-lg rounded-lg border border-gray-700 bg-gray-800 p-4 shadow-xl">
            <h2 id="confirm-create-title" className="text-lg font-bold text-white">Confirmar Criação</h2>
            <p className="text-sm text-gray-300 mt-1">Você está prestes a criar {formData.name || 'um herói'} da classe {formData.class}. Deseja concluir?</p>
            <div className="mt-3 text-xs text-gray-400">Atributos: {Object.entries(formData.attributes).map(([k,v]) => `${k}:${v}`).join(' • ')}</div>
            {formData.plannedTalents && formData.plannedTalents.length > 0 && (
              <div className="mt-1 text-xs text-amber-300">Talentos planejados: {formData.plannedTalents.length}</div>
            )}
            {creationLog.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-gray-300">Histórico de decisões:</div>
                <ul className="mt-1 text-xs text-gray-400 list-disc pl-5">
                  {creationLog.slice(-6).map((e, i) => (<li key={`log-${i}`}>{e}</li>))}
                </ul>
                <div className="mt-2 flex gap-2 justify-end">
                  <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(JSON.stringify(creationLog)); } catch {} }} className="px-2 py-1 rounded bg-gray-600 text-white text-xs">Exportar histórico</button>
                </div>
              </div>
            )}
            {(() => { const r = buildReadiness(formData as any); return (
              <div className={`mt-2 p-2 rounded text-xs text-center ${r.status === 'ok' ? 'bg-emerald-700/30 text-emerald-200' : r.status === 'warn' ? 'bg-amber-700/30 text-amber-200' : 'bg-red-700/30 text-red-200'}`}>Prontidão: {r.message}</div>
            ) })()}
            <div className="mt-4 flex gap-2 justify-end">
              <button type="button" onClick={() => setConfirmOpen(false)} className="px-3 py-2 rounded bg-gray-600 text-white hover:bg-gray-700">Voltar</button>
              {(() => { const r = buildReadiness(formData as any); const disabled = r.status === 'error'; return (
                <button type="button" onClick={finalizeCreation} disabled={disabled} className={`px-3 py-2 rounded ${disabled ? 'bg-gray-500 text-gray-300 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>Confirmar</button>
              ) })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeroForm;
