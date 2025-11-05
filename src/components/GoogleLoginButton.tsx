import React, { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { loginWithGoogleCredential } from '../services/authService';

declare global {
  interface Window { google: any; }
}

const GoogleLoginButton: React.FC = () => {
  const btnRef = useRef<HTMLDivElement>(null);
  const login = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google || !btnRef.current) return;

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (resp: any) => {
          try {
            const u = await loginWithGoogleCredential(resp.credential);
            login(u, resp.credential);
          } catch (err) {
            console.error('Login Google falhou', err);
            alert('Falha ao autenticar com Google.');
          }
        }
      });
      window.google.accounts.id.renderButton(btnRef.current, { theme: 'outline', size: 'large' });
    } catch (err) {
      console.error('Erro inicializando Google Identity', err);
    }
  }, [login]);

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

  return <div ref={btnRef} />;
};

export default GoogleLoginButton;

