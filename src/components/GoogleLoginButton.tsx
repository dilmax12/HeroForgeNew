import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { loginWithGoogleCredential } from '../services/authService';
import { supabase, supabaseConfigured } from '../lib/supabaseClient';
import { notificationBus } from './NotificationSystem';

declare global {
  interface Window { google: any; }
}

const GoogleLoginButton: React.FC = () => {
  const btnRef = useRef<HTMLDivElement>(null);
  const login = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || isAuthenticated) return;
    const init = () => {
      if (!window.google || !btnRef.current) return;
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (resp: any) => {
            try {
              setLoading(true);
              const u = await loginWithGoogleCredential(resp.credential);
              login(u, resp.credential);
              try { notificationBus.emit({ type: 'achievement', title: 'Login Google', message: 'Autenticado com sucesso', icon: '✅', duration: 2500 }); } catch {}
            } catch (err) {
              console.error('Login Google falhou', err);
              try { notificationBus.emit({ type: 'error', title: 'Falha no Login Google', message: 'Verifique configuração e tente novamente', duration: 3500 }); } catch {}
            } finally { setLoading(false); }
          }
        });
        window.google.accounts.id.renderButton(btnRef.current, { theme: 'outline', size: 'large' });
      } catch (err) {
        console.error('Erro inicializando Google Identity', err);
      }
    };
    if (window.google) {
      init();
    } else {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = init;
      s.onerror = () => {};
      document.head.appendChild(s);
    }
  }, [login, isAuthenticated]);

  if (isAuthenticated) {
    return (
      <div className="flex items-center space-x-2">
        {user?.picture && (
          <img src={user.picture} alt="avatar" className="w-8 h-8 rounded-full" />
        )}
        <span className="text-sm">Olá, {user?.name || user?.email}</span>
      </div>
    );
  }

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    return <span className="text-xs text-red-300">Google Login não configurado</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <div ref={btnRef} />
      {supabaseConfigured && (
        <button
          onClick={async () => {
            try {
              setLoading(true);
              await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
            } catch {
              try { notificationBus.emit({ type: 'error', title: 'OAuth Google (Supabase)', message: 'Falha ao redirecionar', duration: 3000 }); } catch {}
            } finally { setLoading(false); }
          }}
          className={`px-2 py-1 rounded ${loading ? 'bg-gray-600 opacity-60' : 'bg-gray-700 hover:bg-gray-600'} text-white text-xs`}
          disabled={loading}
        >Supabase</button>
      )}
    </div>
  );
};

export default GoogleLoginButton;

