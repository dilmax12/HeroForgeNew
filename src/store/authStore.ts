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
      sessionStorage.setItem('hf_user', JSON.stringify({ user }));
    } catch {}
    set({ user, token: null, isAuthenticated: true });
  },
  logout: () => {
    try { sessionStorage.removeItem('hf_user'); } catch {}
    set({ user: null, token: null, isAuthenticated: false });
  }
}));

try {
  const raw = sessionStorage.getItem('hf_user');
  if (raw) {
    const { user } = JSON.parse(raw);
    useAuthStore.setState({ user, token: null, isAuthenticated: true });
  }
} catch {}

