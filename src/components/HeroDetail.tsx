import { useParams, Link, useNavigate } from 'react-router-dom';
import { useHeroStore } from '../store/heroStore';

const HeroDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { heroes, deleteHero } = useHeroStore();
  
  const hero = heroes.find(h => h.id === id);
  
  if (!hero) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-amber-400 mb-4">Herói não encontrado</h2>
        <p className="text-gray-300 mb-6">O herói que você está procurando não existe.</p>
        <Link 
          to="/" 
          className="px-6 py-3 bg-amber-600 hover:bg-amber-700 rounded-md font-bold transition-colors"
        >
          Voltar para Lista
        </Link>
      </div>
    );
  }
  
  const handleDelete = () => {
    if (window.confirm('Tem certeza que deseja deletar este herói?')) {
      deleteHero(hero.id);
      navigate('/');
    }
  };
  
  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="p-8">
          <h2 className="text-3xl font-bold text-amber-400 mb-6">{hero.name}</h2>
          {hero.image && (
            <div className="mb-6">
              <img
                src={hero.image}
                alt={`Avatar de ${hero.name}`}
                className="w-40 h-40 rounded-lg object-cover border border-gray-700 shadow-md"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/160x160?text=Avatar';
                }}
              />
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Informações Básicas</h3>
              <div className="space-y-2 text-gray-300">
                <p><span className="text-amber-400 font-medium">Raça:</span> {hero.race.charAt(0).toUpperCase() + hero.race.slice(1)}</p>
                <p><span className="text-amber-400 font-medium">Classe:</span> {hero.class.charAt(0).toUpperCase() + hero.class.slice(1)}</p>
                <p><span className="text-amber-400 font-medium">Nível:</span> {hero.progression.level}</p>
                <p><span className="text-amber-400 font-medium">Alinhamento:</span> {hero.alignment.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</p>
                {hero.background && (
                  <p><span className="text-amber-400 font-medium">Antecedente:</span> {hero.background.charAt(0).toUpperCase() + hero.background.slice(1)}</p>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Atributos</h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(hero.attributes).map(([key, value]) => (
                  <div key={key} className="bg-gray-700 p-3 rounded-md">
                    <span className="text-amber-400 font-medium capitalize">{key}:</span> {value}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-white mb-4">Atributos Derivados</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(hero.derivedAttributes).map(([key, value]) => (
                <div key={key} className="bg-gray-700 p-3 rounded-md">
                  <span className="text-amber-400 font-medium capitalize">{key}:</span> {value}
                </div>
              ))}
            </div>
          </div>
          
          {hero.backstory && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-white mb-4">História</h3>
              <p className="text-gray-300 bg-gray-700 p-4 rounded-md">{hero.backstory}</p>
            </div>
          )}
          
          {hero.objective && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-white mb-4">Objetivo</h3>
              <p className="text-gray-300 bg-gray-700 p-4 rounded-md">{hero.objective}</p>
            </div>
          )}
          
          {hero.battleCry && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-white mb-4">Grito de Guerra</h3>
              <p className="text-gray-300 bg-gray-700 p-4 rounded-md italic">"{hero.battleCry}"</p>
            </div>
          )}
          
          <div className="flex justify-between mt-8">
            <Link 
              to="/" 
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-md font-bold transition-colors"
            >
              Voltar
            </Link>
            <button
              onClick={handleDelete}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-md font-bold transition-colors"
            >
              Deletar Herói
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroDetail;
