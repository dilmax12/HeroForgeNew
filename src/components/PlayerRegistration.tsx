import React, { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabaseClient';
import SupabaseAuthPanel from './SupabaseAuthPanel';
import { useHeroStore } from '../store/heroStore';
import { isUsernameAvailable } from '../services/playersService';
import { upsertUserProfile, getUserProgress } from '../services/userService';
import { logActivity } from '../services/loggerService';

const PlayerRegistration: React.FC = () => {
  const { createHero, addItemToInventory, getSelectedHero, selectHero } = useHeroStore();
  const selectedHero = getSelectedHero();

  const [sbUserId, setSbUserId] = useState<string | null>(null);
  const [sbEmail, setSbEmail] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<null | boolean>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [useEmailPassword, setUseEmailPassword] = useState(false);
  const [cloudSync, setCloudSync] = useState(true);
  function isValidEmail(v: string) {
    const s = (v || '').trim();
    return /.+@.+\..+/.test(s);
  }
  function isValidUsername(v: string) {
    const s = (v || '').trim().toLowerCase();
    return s.length >= 3 && /^[a-z0-9_\.\-]+$/.test(s);
  }
  function isStrongPassword(v: string) {
    const s = String(v || '');
    if (s.length < 12) return false;
    const hasUpper = /[A-Z]/.test(s);
    const hasLower = /[a-z]/.test(s);
    const hasNumber = /[0-9]/.test(s);
    const hasSpecial = /[^A-Za-z0-9]/.test(s);
    return hasUpper && hasLower && hasNumber && hasSpecial;
  }
  

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadUser() {
      try {
        const { data } = await supabase.auth.getUser();
        if (!mounted) return;
        const u = data?.user || null;
        setSbUserId(u?.id || null);
        setSbEmail(u?.email || null);
      } catch {}
    }
    loadUser();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSbUserId(session?.user?.id || null);
      setSbEmail(session?.user?.email || null);
    });
    return () => { mounted = false; sub?.subscription.unsubscribe(); };
  }, []);

  

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!username) { setUsernameAvailable(null); return; }
      setCheckingUsername(true);
      try {
        const ok = await isUsernameAvailable(username.trim().toLowerCase());
        setUsernameAvailable(ok);
      } catch {
        setUsernameAvailable(null);
      }
      setCheckingUsername(false);
    }, 400);
    return () => clearTimeout(t);
  }, [username]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      // Fluxo opcional: criar conta via email/senha
      let userId = sbUserId;
      if (useEmailPassword) {
        if (!emailInput || !passwordInput) {
          setError('Informe email e senha.');
          return;
        }
        if (!isValidEmail(emailInput)) {
          setError('Formato de email inválido.');
          return;
        }
        if (!isStrongPassword(passwordInput)) {
          setError('Senha fraca. Use 12+ caracteres, com maiúsculas, minúsculas, números e especiais.');
          return;
        }
        const { data, error: signUpErr } = await supabase.auth.signUp({ email: emailInput, password: passwordInput, options: { emailRedirectTo: window.location.origin } });
        if (signUpErr) {
          setError(signUpErr.message || 'Falha ao criar conta');
          return;
        }
        userId = data?.user?.id || null;
        setSbUserId(userId);
        setSbEmail(data?.user?.email || null);
      }

      if (!userId && cloudSync) {
        setError('Você precisa estar logado no Supabase (OTP, Google ou Email/Senha).');
        return;
      }

      // Validar unicidade de username (cliente) antes de persistir
      if (username && cloudSync) {
        if (!isValidUsername(username)) {
          setError('Username inválido. Use letras/números/._- e mínimo de 3 caracteres.');
          return;
        }
        const available = await isUsernameAvailable(username.trim().toLowerCase());
        if (!available) {
          setError('Nome de usuário já está em uso. Escolha outro.');
          return;
        }
      }

      if (cloudSync && userId) {
        await upsertUserProfile({ id: userId, username: username ? username.trim().toLowerCase() : undefined, email: (sbEmail || emailInput) || null });
      }
      setMessage('Conta configurada com sucesso. Você pode criar heróis depois.');
      try {
        if (cloudSync && userId) {
          const progress = await getUserProgress(userId);
          setMessage(`Conta pronta. Progresso: ${progress.missionsCompleted} missões, ${progress.achievementsUnlocked} conquistas, ${progress.playtime_minutes || progress.playtimeMinutes}m.`);
        }
      } catch {}
      if (cloudSync && userId) {
        try { await logActivity({ type: 'registration', userId, username: username || null, email: sbEmail || emailInput || null }); } catch {}
      }
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">📝 Cadastro e Login</h1>
      {!sbUserId && (
        <div className="mb-4">
          <div className="text-sm text-gray-700 mb-2">Faça login para habilitar o salvamento no Supabase.</div>
          <SupabaseAuthPanel />
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Nome de usuário</label>
          <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-white text-gray-900 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="ex: aventureiro123" />
          <div className="mt-1 text-xs">
            {checkingUsername && <span className="text-gray-500">Verificando...</span>}
            {!checkingUsername && username && usernameAvailable === true && <span className="text-green-700">Disponível</span>}
            {!checkingUsername && username && usernameAvailable === false && <span className="text-red-700">Indisponível</span>}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={cloudSync} onChange={e => setCloudSync(e.target.checked)} />
            <span>Salvar na nuvem (Supabase)</span>
          </label>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={useEmailPassword} onChange={e => setUseEmailPassword(e.target.checked)} />
            <span>Criar/usar conta com email e senha</span>
          </label>
          {useEmailPassword && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Email (opcional)</label>
                <input type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)} className="w-full bg-white text-gray-900 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="seu@email.com" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Senha</label>
                <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className="w-full bg-white text-gray-900 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="mínimo 12 caracteres e complexa" />
                <div className="mt-1 text-xs">
                  {passwordInput.length === 0 && <span className="text-gray-500">Informe uma senha</span>}
                  {passwordInput.length > 0 && !isStrongPassword(passwordInput) && <span className="text-red-700">Fraca</span>}
                  {passwordInput.length >= 12 && isStrongPassword(passwordInput) && <span className="text-green-700">Forte</span>}
                </div>
              </div>
            </div>
          )}
          {!useEmailPassword && (
            <div className="text-xs text-gray-500 mt-2">Dica: você pode usar login por link (OTP) no painel acima ou Google. Email é opcional.</div>
          )}
        </div>

        

        <div className="flex items-center gap-2">
          <button type="submit" disabled={saving} className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50">Salvar conta</button>
          {saving && (<span className="text-sm text-gray-600">Salvando...</span>)}
          {sbEmail && (<span className="text-xs text-gray-500">Logado: {sbEmail}</span>)}
        </div>
      </form>

      {message && (
        <div className="mt-3 p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">{message}</div>
      )}
      {error && (
        <div className="mt-3 p-3 rounded bg-red-50 border border-red-200 text-red-800 text-sm">{error}</div>
      )}
    </div>
  );
};

export default PlayerRegistration;
