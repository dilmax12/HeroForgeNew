import { useState } from 'react';
import { HeroCreationData, HeroRace, HeroClass, Alignment } from '../types/hero';
import { useHeroStore } from '../store/heroStore';
import { generateStory } from '../utils/story';

const initialAttributes = {
  forca: 0,
  destreza: 0,
  constituicao: 0,
  inteligencia: 0,
  sabedoria: 0,
  carisma: 0
};

const HeroForm = () => {
  const createHero = useHeroStore(state => state.createHero);
  
  const [formData, setFormData] = useState<HeroCreationData>({
    name: '',
    race: 'humano',
    class: 'guerreiro',
    alignment: 'neutro-puro',
    background: '',
    attributes: initialAttributes,
    backstory: '',
    shortBio: ''
  });

  const [pointsLeft, setPointsLeft] = useState(18);
  const [limitWarning, setLimitWarning] = useState<string>('');
  const [loadingStory, setLoadingStory] = useState<boolean>(false);
  
  const handleAttributeChange = (attr: keyof typeof formData.attributes, nextValue: number) => {
    const currentValue = formData.attributes[attr];
    const clamped = Math.max(0, Math.min(10, nextValue));
    const diff = clamped - currentValue;

    // Se exceder 18, mostrar aviso e não aplicar
    if (diff > 0 && pointsLeft - diff < 0) {
      setLimitWarning('Limite de 18 pontos atingido.');
      setTimeout(() => setLimitWarning(''), 1500);
      return;
    }

    setFormData(prev => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [attr]: clamped
      }
    }));

    setPointsLeft(prev => prev - diff);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação básica
    if (!formData.name.trim()) {
      alert('O nome do herói é obrigatório!');
      return;
    }
    
    createHero(formData);
    
    // Reset do formulário
    setFormData({
      name: '',
      race: 'humano',
      class: 'guerreiro',
      alignment: 'neutro-puro',
      background: '',
      attributes: initialAttributes,
      backstory: '',
      shortBio: ''
    });
    setPointsLeft(18);
  };
  
  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold text-center mb-6 text-amber-400">Forjar Novo Herói</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações básicas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300">Nome</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300">Raça</label>
            <select
              value={formData.race}
              onChange={(e) => setFormData({...formData, race: e.target.value as HeroRace})}
              className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
            >
              <option value="humano">Humano</option>
              <option value="elfo">Elfo</option>
              <option value="anao">Anão</option>
              <option value="orc">Orc</option>
              <option value="halfling">Halfling</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">Classe</label>
            <select
              value={formData.class}
              onChange={(e) => setFormData({...formData, class: e.target.value as HeroClass})}
              className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
            >
              <option value="guerreiro">Guerreiro</option>
              <option value="mago">Mago</option>
              <option value="ladino">Ladino</option>
              <option value="clerigo">Clérigo</option>
              <option value="patrulheiro">Patrulheiro</option>
              <option value="paladino">Paladino</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">Alinhamento</label>
            <select
              value={formData.alignment}
              onChange={(e) => setFormData({...formData, alignment: e.target.value as Alignment})}
              className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
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
        </div>

        {/* Atributos */}
        <div>
          <h3 className="text-xl font-semibold text-amber-400 mb-2">Atributos</h3>
          <p className="text-sm text-amber-300 mb-2 font-semibold">Pontos restantes: {pointsLeft}</p>
          {limitWarning && (
            <p className="text-sm text-red-400 mb-4">{limitWarning}</p>
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(formData.attributes).map(([attr, value]) => (
              <div key={attr} className="flex flex-col items-center">
                <label className="block text-sm font-medium text-gray-300 capitalize">{attr}</label>
                <div className="flex items-center mt-1">
                  <button
                    type="button"
                    onClick={() => handleAttributeChange(attr as keyof typeof formData.attributes, value - 1)}
                    className="px-2 py-1 bg-red-700 rounded-l-md disabled:opacity-50"
                    disabled={value <= 0}
                  >
                    -
                  </button>
                  <span className="px-4 py-1 bg-gray-700">{value}</span>
                  <button
                    type="button"
                    onClick={() => handleAttributeChange(attr as keyof typeof formData.attributes, value + 1)}
                    className="px-2 py-1 bg-green-700 rounded-r-md disabled:opacity-50"
                    disabled={pointsLeft <= 0 || value >= 10}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Background */}
        <div>
          <label className="block text-sm font-medium text-gray-300">Antecedente</label>
          <select
            value={formData.background}
            onChange={(e) => setFormData({...formData, background: e.target.value})}
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
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
          </div>
          <textarea
            value={formData.backstory || ''}
            onChange={(e) => setFormData({...formData, backstory: e.target.value})}
            rows={4}
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
            placeholder="Conte a história do seu herói..."
          />
        </div>
        
        {/* Botão de envio */}
        <div className="flex justify-center">
          <button
            type="submit"
            className="px-6 py-3 bg-amber-600 hover:bg-amber-700 rounded-md font-bold transition-colors disabled:opacity-60"
            disabled={Object.values(formData.attributes).reduce((s,v)=>s+v,0) > 18 || !formData.name.trim()}
          >
            Forjar Herói
          </button>
        </div>
      </form>
    </div>
  );
};

export default HeroForm;