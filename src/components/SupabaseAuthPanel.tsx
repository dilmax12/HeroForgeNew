import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ensurePlayerProfile } from '../services/playersService';

const SupabaseAuthPanel: React.FC = () => {
  const [email, setEmail] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  async function refreshUser() {
    const { data } = await supabase.auth.getUser();
    const u = data?.user || null;
    setUserEmail(u?.email || null);
    setUserId(u?.id || null);
    if (u?.id) {
      try { await fetch(`/api/users?action=touch-login&id=${encodeURIComponent(u.id)}`); } catch {}
    }
  }

  useEffect(() => {
    refreshUser();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refreshUser();
    });
    return () => { sub?.subscription.unsubscribe(); };
  }, []);

  async function signInWithEmail() {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin }
      });
      if (error) throw error;
      alert('Verifique seu e-mail para o link de login.');
      setEmail('');
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      await refreshUser();
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    setLoading(true);
    setError(null);
    try {
      const target = resetEmail || email;
      if (!target) {
        throw new Error('Informe o email para recuperação');
      }
      const { error } = await supabase.auth.resetPasswordForEmail(target, { redirectTo: window.location.origin });
      if (error) throw error;
      alert('Verifique seu email para instruções de redefinição de senha.');
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">🔐 Supabase Auth</h2>
      <div className="text-sm text-gray-700 mb-2">Usuário atual: {userEmail ? `${userEmail} (id: ${userId})` : '—'}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <label className="block text-sm text-gray-600 mb-2">Login por e-mail (OTP)</label>
          <input
            type="email"
            className="w-full bg-white text-gray-900 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="seu@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <button
            className="mt-2 px-3 py-2 bg-white text-green-700 border border-green-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onClick={signInWithEmail}
            disabled={loading || !email}
          >
            {loading ? 'Enviando...' : 'Enviar link de login'}
          </button>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <label className="block text-sm text-gray-600 mb-2">Sessão</label>
          <button
            className="px-3 py-2 bg-white text-blue-700 border border-blue-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onClick={refreshUser}
            disabled={loading}
          >
            Atualizar usuário
          </button>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <label className="block text-sm text-gray-600 mb-2">Recuperação de conta</label>
          <input
            type="email"
            className="w-full bg-white text-gray-900 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="seu@email.com"
            value={resetEmail}
            onChange={e => setResetEmail(e.target.value)}
          />
          <button
            className="mt-2 px-3 py-2 bg-white text-amber-700 border border-amber-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onClick={resetPassword}
            disabled={loading}
          >
            Enviar link de redefinição
          </button>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <label className="block text-sm text-gray-600 mb-2">Sair</label>
          <button
            className="px-3 py-2 bg-white text-red-700 border border-red-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onClick={signOut}
            disabled={loading || !userEmail}
          >
            {loading ? 'Saindo...' : 'Logout'}
          </button>
        </div>
      </div>
      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2 mt-3">
          Erro: {error}
        </div>
      )}
      <div className="text-xs text-gray-500 mt-2">
        Dica: em desenvolvimento, configure provedores ou use OTP. Ajuste RLS para tabelas que exigem usuário autenticado.
      </div>
    </div>
  );
};

export default SupabaseAuthPanel;
