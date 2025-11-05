import { create } from 'zustand';

type User = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
};

type AuthState = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  login: (user, token) => {
    try {
      localStorage.setItem('hf_hero_auth', JSON.stringify({ user, token }));
    } catch {}
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    try { localStorage.removeItem('hf_hero_auth'); } catch {}
    set({ user: null, token: null, isAuthenticated: false });
  }
}));

// try restore from localStorage
try {
  const raw = localStorage.getItem('hf_hero_auth');
  if (raw) {
    const { user, token } = JSON.parse(raw);
    useAuthStore.setState({ user, token, isAuthenticated: true });
  }
} catch {}

