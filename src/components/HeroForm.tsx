// CACHE BUSTER - TIMESTAMP: 2024-12-19-19:52
import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HeroCreationData, HeroRace, HeroClass, Alignment, Element, HeroAttributes } from '../types/hero';
import { useHeroStore } from '../store/heroStore';
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
  const [nameOptions, setNameOptions] = useState<string[]>([]);
  const [showNameOptions, setShowNameOptions] = useState(false);
  const [showSkillDetails, setShowSkillDetails] = useState<string | null>(null);
  const [showElementTooltip, setShowElementTooltip] = useState(false);
  const [limitWarning, setLimitWarning] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { createHero, acceptReferralInvite } = useHeroStore();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const referralCode = searchParams.get('ref') || undefined;

  const remainingPoints = calculateRemainingPoints(formData.attributes);
  const classSkills = getClassSkills(formData.class);

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

  const handleElementChange = (element: Element) => {
    setFormData(prev => ({ 
      ...prev, 
      element,
      skills: getClassSkills(prev.class)
    }));
  };

  const handleGenerateRandomElement = () => {
    const randomElement = generateRandomElement();
    handleElementChange(randomElement);
  };

  const handleClassChange = (newClass: HeroClass) => {
    const newSkills = getClassSkills(newClass);
    const newBattleQuote = getBattleQuote(newClass);
    
    setFormData(prev => ({ 
      ...prev, 
      class: newClass,
      skills: newSkills,
      battleQuote: newBattleQuote
    }));
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
    
    try {
      const created = createHero(formData);
      if (referralCode) {
        acceptReferralInvite(referralCode, created.id);
      }
      navigate('/');
    } catch (error) {
      console.error('Erro ao criar herói:', error);
      setLimitWarning('Erro ao criar herói. Tente novamente.');
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold text-amber-400 mb-6 text-center">Forjar Novo Herói - Versão 3.0</h2>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Seção 1: Raça e Nome */}
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="text-xl font-semibold text-amber-400 mb-4">1. Raça e Nome</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300">Raça</label>
              <select
                value={formData.race}
                onChange={(e) => setFormData({...formData, race: e.target.value as HeroRace})}
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
            </div>
          </div>
        </div>

        {/* Seção 2: Classe e Skills */}
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="text-xl font-semibold text-amber-400 mb-4">2. Classe e Habilidades</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300">Classe</label>
            <select
              value={formData.class}
              onChange={(e) => handleClassChange(e.target.value as HeroClass)}
              className="mt-1 block w-full rounded-md bg-gray-600 border-gray-500 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="guerreiro">Guerreiro</option>
              <option value="mago">Mago</option>
              <option value="arqueiro">Arqueiro</option>
              <option value="clerigo">Clérigo</option>
              <option value="ladino">Ladino</option>
            </select>
          </div>

          <div>
            <h4 className="text-lg font-medium text-gray-300 mb-2">Habilidades Iniciais:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {classSkills.map((skill) => (
                <div key={skill.id} className="bg-gray-600 p-3 rounded-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-medium text-white">{skill.name}</h5>
                      <p className="text-xs text-gray-300">{skill.type} • {skill.element}</p>
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
        </div>

        {/* Seção 4: Elemento */}
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="text-xl font-semibold text-amber-400 mb-4">4. Elemento</h3>
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={handleGenerateRandomElement}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-md text-sm font-medium transition-colors"
            >
              🎲 Gerar Aleatório
            </button>
            <button
              type="button"
              onClick={() => setShowElementTooltip(!showElementTooltip)}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium transition-colors"
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
            
            {formData.image && (
              <div className="w-24 h-24 bg-gray-600 rounded-md overflow-hidden">
                <img
                  src={formData.image}
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
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-md text-sm font-medium transition-colors"
            >
              🎲 Gerar Aleatória
            </button>
            <button
              type="button"
              onClick={handleGenerateBattleQuoteAI}
              disabled={loadingQuoteAI}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium transition-colors disabled:opacity-60"
            >
              {loadingQuoteAI ? 'Gerando...' : '🤖 Gerar com IA'}
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

        {/* Informações Adicionais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300">Alinhamento</label>
            <select
              value={formData.alignment}
              onChange={(e) => setFormData({...formData, alignment: e.target.value as Alignment})}
              className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="leal-bom">Leal e Bom</option>
              <option value="neutro-bom">Neutro e Bom</option>
              <option value="caotico-bom">Caótico e Bom</option>
              <option value="leal-neutro">Leal e Neutro</option>
              <option value="neutro-puro">Verdadeiramente Neutro</option>
              <option value="caotico-neutro">Caótico e Neutro</option>
              <option value="leal-mal">Leal e Mau</option>
              <option value="neutro-mal">Neutro e Mau</option>
              <option value="caotico-mal">Caótico e Mau</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">Antecedente</label>
            <select
              value={formData.background}
              onChange={(e) => setFormData({...formData, background: e.target.value})}
              className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Selecione um antecedente</option>
              <option value="acolyte">Acólito</option>
              <option value="criminal">Criminoso</option>
              <option value="folk-hero">Herói do Povo</option>
              <option value="noble">Nobre</option>
              <option value="sage">Sábio</option>
              <option value="soldier">Soldado</option>
            </select>
          </div>
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
              className="px-3 py-2 bg-amber-600 hover:bg-amber-700 rounded-md text-sm font-medium transition-colors disabled:opacity-60"
              disabled={loadingStory || !formData.name.trim()}
            >
              {loadingStory ? 'Gerando...' : 'Gerar história'}
            </button>
            <button
              type="button"
              onClick={async () => {
                setLoadingHFStory(true);
                try {
                  const contexto = `${formData.name || 'Herói'}, classe ${formData.class}, raça ${formData.race}, elemento ${formData.element}, alinhamento ${formData.alignment}${formData.background ? ', antecedente ' + formData.background : ''}`;
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
    </div>
  );
};

export default HeroForm;
