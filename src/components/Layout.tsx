import { Outlet, Link, useLocation } from 'react-router-dom';
import { useHeroStore } from '../store/heroStore';
import EnhancedHUD from './EnhancedHUD';
import NotificationSystem, { useNotifications } from './NotificationSystem';
import QuickNavigation from './QuickNavigation';

const Layout = () => {
  const location = useLocation();
  const { getSelectedHero } = useHeroStore();
  const selectedHero = getSelectedHero();
  const { notifications, removeNotification } = useNotifications();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navLinkClass = (path: string) => {
    return `hover:text-amber-400 transition-colors ${
      isActive(path) ? 'text-amber-400 font-semibold' : ''
    }`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="text-2xl font-bold text-amber-400">
              🏰 Forjador de Heróis
            </Link>
            
            {/* Herói Selecionado */}
            {selectedHero && (
              <div className="hidden md:flex items-center space-x-3 bg-gray-700 px-4 py-2 rounded-lg">
                <span className="text-2xl">{selectedHero.avatar}</span>
                <div>
                  <div className="text-sm font-medium flex items-center space-x-2">
                    <span>{selectedHero.name}</span>
                    {selectedHero.activeTitle && selectedHero.titles.find(t => t.id === selectedHero.activeTitle) && (
                      <span className="text-amber-400 text-xs">
                        {selectedHero.titles.find(t => t.id === selectedHero.activeTitle)?.badge} 
                        {selectedHero.titles.find(t => t.id === selectedHero.activeTitle)?.name}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {selectedHero.class} • Nível {selectedHero.progression.level}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <nav className="mt-4">
            <ul className="flex flex-wrap space-x-6">
              <li>
                <Link to="/" className={navLinkClass('/')}>
                  👥 Heróis
                </Link>
              </li>
              <li>
                <Link to="/create" className={navLinkClass('/create')}>
                  ➕ Criar Herói
                </Link>
              </li>
              <li>
                <Link to="/progression" className={navLinkClass('/progression')}>
                  📈 Progressão
                </Link>
              </li>
              <li>
                <Link to="/quests" className={navLinkClass('/quests')}>
                  🗡️ Missões
                </Link>
              </li>
              <li>
                <Link to="/guilds" className={navLinkClass('/guilds')}>
                  🏰 Guildas
                </Link>
              </li>
              <li>
                <Link to="/titles" className={navLinkClass('/titles')}>
                  🏆 Títulos
                </Link>
              </li>
              <li>
                <Link to="/leaderboards" className={navLinkClass('/leaderboards')}>
                  📊 Rankings
                </Link>
              </li>
              <li>
                <Link to="/playtest" className={navLinkClass('/playtest')}>
                  📊 Playtest
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      
      <main className="container mx-auto py-8 px-4">
        <Outlet />
      </main>
      
      {/* Enhanced HUD - only show when a hero is selected */}
      {selectedHero && <EnhancedHUD hero={selectedHero} />}
      
      {/* Notification System */}
      <NotificationSystem 
        notifications={notifications} 
        onRemove={removeNotification} 
      />
      
      {/* Quick Navigation */}
      <QuickNavigation />
      
      <footer className="bg-gray-800 py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Forjador de Heróis - Criado com React, TypeScript e Zustand</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;