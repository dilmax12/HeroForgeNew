import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useHeroStore } from '../store/heroStore';
import EnhancedHUD from './EnhancedHUD';
import NotificationSystem, { useNotifications } from './NotificationSystem';
import QuickNavigation from './QuickNavigation';
import { medievalTheme, getClassIcon } from '../styles/medievalTheme';
import GoogleLoginButton from './GoogleLoginButton';

const Layout = () => {
  const location = useLocation();
  const [hudVisible, setHudVisible] = useState(true);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <header className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 shadow-2xl shadow-amber-500/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="text-2xl font-bold text-amber-400 font-serif">
              {medievalTheme.icons.ui.castle} Forjador de Heróis
            </Link>
            <div className="flex items-center space-x-4">
              <GoogleLoginButton />
            </div>
            
            {/* Herói Selecionado */}
            {selectedHero && (
              <div className="hidden md:flex items-center space-x-3 bg-slate-800 border border-amber-400 px-4 py-2 rounded-lg">
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
                  <div className="text-xs text-amber-600">
                    {getClassIcon(selectedHero.class)} {selectedHero.class} • Nível {selectedHero.progression.level}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <nav className="mt-4">
            <ul className="flex flex-wrap space-x-6">
              <li>
                <Link to="/" className={navLinkClass('/')}>
                  {medievalTheme.icons.ui.users} Heróis
                </Link>
              </li>
              <li>
                <Link to="/create" className={navLinkClass('/create')}>
                  {medievalTheme.icons.ui.plus} Criar Herói
                </Link>
              </li>
              <li>
                <Link to="/progression" className={navLinkClass('/progression')}>
                  {medievalTheme.icons.ui.chart} Progressão
                </Link>
              </li>
              <li>
                <Link to="/evolution" className={navLinkClass('/evolution')}>
                  {medievalTheme.icons.ranks.Elite} Evolução
                </Link>
              </li>
              <li>
                <Link to="/quests" className={navLinkClass('/quests')}>
                  {medievalTheme.icons.ui.sword} Missões
                </Link>
              </li>
              <li>
                <Link to="/guilds" className={navLinkClass('/guilds')}>
                  {medievalTheme.icons.ui.castle} Guildas
                </Link>
              </li>
              <li>
                <Link to="/titles" className={navLinkClass('/titles')}>
                  {medievalTheme.icons.ranks.Mestre} Títulos
                </Link>
              </li>
              <li>
                <Link to="/leaderboards" className={navLinkClass('/leaderboards')}>
                  {medievalTheme.icons.ui.chart} Rankings
                </Link>
              </li>
              <li>
                <Link to="/playtest" className={navLinkClass('/playtest')}>
                  {medievalTheme.icons.ui.chart} Playtest
                </Link>
              </li>
              <li>
                <Link to="/shop" className={navLinkClass('/shop')}>
                  🏪 Loja
                </Link>
              </li>
              <li>
                <Link to="/training" className={navLinkClass('/training')}>
                  💪 Treinamento
                </Link>
              </li>
              <li>
                <Link to="/ai-avatar" className={navLinkClass('/ai-avatar')}>
                  🎭 Avatar IA
                </Link>
              </li>
              <li>
                <Link to="/ai-missions" className={navLinkClass('/ai-missions')}>
                  🗡️ Missões IA
                </Link>
              </li>
              <li>
                <Link to="/ai-recommendations" className={navLinkClass('/ai-recommendations')}>
                  🧠 Recomendações IA
                </Link>
              </li>
              <li>
                <Link to="/world-state-demo" className={navLinkClass('/world-state-demo')}>
                  🌍 Demo Sistema
                </Link>
              </li>
              <li>
                <Link to="/enhanced-quests" className={navLinkClass('/enhanced-quests')}>
                  📜 Missões Narrativas
                </Link>
              </li>
              <li>
                <Link to="/hero-journal" className={navLinkClass('/hero-journal')}>
                  📖 Diário do Herói
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      
      <main className="container mx-auto py-8 px-4">
        <Outlet />
      </main>
      
      {/* Enhanced HUD - show/hide with toggle */}
      {selectedHero && hudVisible && <EnhancedHUD hero={selectedHero} />}

      {/* HUD Toggle Button */}
      {selectedHero && (
        <button
          aria-label={hudVisible ? 'Ocultar HUD' : 'Mostrar HUD'}
          title={hudVisible ? 'Ocultar HUD' : 'Mostrar HUD'}
          onClick={() => setHudVisible(v => !v)}
          className={`fixed ${hudVisible ? 'bottom-4 right-4' : 'bottom-4 right-4'} z-50 px-3 py-2 rounded-full shadow-lg transition-colors 
            ${hudVisible ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-amber-600 text-white hover:bg-amber-700'}`}
        >
          {hudVisible ? 'Ocultar Painel' : 'Mostrar Painel'}
        </button>
      )}
      
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
