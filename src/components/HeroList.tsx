import { useHeroStore } from '../store/heroStore';
import { Link } from 'react-router-dom';

const HeroList = () => {
  const { heroes, deleteHero, selectHero } = useHeroStore();

  if (heroes.length === 0) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-amber-400 mb-4">Nenhum Herói Encontrado</h2>
        <p className="text-gray-300 mb-6">Você ainda não criou nenhum herói.</p>
        <Link 
          to="/create" 
          data-testid="create-hero-button"
          className="px-6 py-3 bg-amber-600 hover:bg-amber-700 rounded-md font-bold transition-colors"
        >
          Forjar Novo Herói
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h2 className="text-3xl font-bold text-center mb-8 text-amber-400">Seus Heróis</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {heroes.map(hero => (
          <div 
            key={hero.id} 
            className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700 hover:border-amber-500 transition-all"
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-full text-white font-bold`
                  }
                  style={{
                    background:
                      hero.class === 'guerreiro' ? '#b45309' :
                      hero.class === 'mago' ? '#2563eb' :
                      hero.class === 'ladino' ? '#10b981' :
                      hero.class === 'clerigo' ? '#a78bfa' :
                      hero.class === 'patrulheiro' ? '#22c55e' :
                      hero.class === 'paladino' ? '#f59e0b' : '#6b7280'
                  }}
                >
                  {hero.name
                    .split(' ')
                    .map(w => w[0]?.toUpperCase())
                    .slice(0,2)
                    .join('') || '?'}
                </div>
                <h3 className="text-xl font-bold text-white">{hero.name}</h3>
              </div>
              <div className="text-gray-300 mb-4">
                <p><span className="text-amber-400">Raça:</span> {hero.race.charAt(0).toUpperCase() + hero.race.slice(1)}</p>
                <p><span className="text-amber-400">Classe:</span> {hero.class.charAt(0).toUpperCase() + hero.class.slice(1)}</p>
                <p><span className="text-amber-400">Nível:</span> {hero.progression.level}</p>
                <div className="flex items-center space-x-4 mt-2 text-sm">
                  <span className="flex items-center space-x-1">
                    <span>🪙</span>
                    <span>{hero.progression.gold}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span>⭐</span>
                    <span>{hero.progression.xp}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span>🏆</span>
                    <span>{hero.stats.questsCompleted}</span>
                  </span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(hero.derivedAttributes).map(([key, value]) => (
                  <span 
                    key={key} 
                    className="px-2 py-1 bg-gray-700 rounded-md text-xs text-gray-300"
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1)}: {value}
                  </span>
                ))}
              </div>
              
              <div className="space-y-2 mt-4">
                <div className="flex justify-between">
                  <Link
                    to={`/hero/${hero.id}`}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-md text-sm font-medium transition-colors"
                    onClick={() => selectHero(hero.id)}
                  >
                    Visualizar
                  </Link>
                  <button
                    onClick={() => deleteHero(hero.id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-sm font-medium transition-colors"
                  >
                    Deletar
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/progression"
                    className="px-2 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-xs font-medium transition-colors text-center"
                    onClick={() => selectHero(hero.id)}
                  >
                    📈 Progressão
                  </Link>
                  <Link
                    to="/quests"
                    className="px-2 py-2 bg-green-600 hover:bg-green-700 rounded-md text-xs font-medium transition-colors text-center"
                    onClick={() => selectHero(hero.id)}
                  >
                    🗡️ Missões
                  </Link>
                  <Link
                    to="/guilds"
                    className="px-2 py-2 bg-purple-600 hover:bg-purple-700 rounded-md text-xs font-medium transition-colors text-center"
                    onClick={() => selectHero(hero.id)}
                  >
                    🏰 Guildas
                  </Link>
                  <Link
                    to="/titles"
                    className="px-2 py-2 bg-amber-600 hover:bg-amber-700 rounded-md text-xs font-medium transition-colors text-center"
                    onClick={() => selectHero(hero.id)}
                  >
                    🏆 Títulos
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Link
          to="/quests"
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg text-center transition-colors"
        >
          <div className="text-2xl mb-2">⚔️</div>
          <div className="font-medium">Missões</div>
        </Link>
        <Link
          to="/guilds"
          className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg text-center transition-colors"
        >
          <div className="text-2xl mb-2">🏰</div>
          <div className="font-medium">Guildas</div>
        </Link>
        <Link
          to="/titles"
          className="bg-amber-600 hover:bg-amber-700 text-white p-4 rounded-lg text-center transition-colors"
        >
          <div className="text-2xl mb-2">👑</div>
          <div className="font-medium">Títulos</div>
        </Link>
        <Link
          to="/leaderboards"
          className="bg-yellow-600 hover:bg-yellow-700 text-white p-4 rounded-lg text-center transition-colors"
        >
          <div className="text-2xl mb-2">🏆</div>
          <div className="font-medium">Rankings</div>
        </Link>
        <Link
          to="/playtest"
          className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg text-center transition-colors"
        >
          <div className="text-2xl mb-2">📊</div>
          <div className="font-medium">Playtest</div>
        </Link>
      </div>
      
      <div className="text-center mt-8">
        <Link 
          to="/create" 
          className="px-6 py-3 bg-amber-600 hover:bg-amber-700 rounded-md font-bold transition-colors inline-block"
        >
          Forjar Novo Herói
        </Link>
      </div>
    </div>
  );
};

export default HeroList;