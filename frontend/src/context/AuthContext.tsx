import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import api from '../api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (role: 'client' | 'manager' | 'admin', email: string, password: string) => Promise<void>;
  register: (data: { phone: string; email: string; name: string; surname: string; password: string; confirmPassword: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  const login = async (role: 'client' | 'manager' | 'admin', email: string, password: string) => {
    const endpoint = role === 'client' ? '/auth/client/login' : role === 'manager' ? '/auth/manager/login' : '/auth/admin/login';
    const { data } = await api.post(endpoint, { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const register = async (formData: { phone: string; email: string; name: string; surname: string; password: string; confirmPassword: string }) => {
    const { data } = await api.post('/auth/client/register', formData);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch { /* ignore */ }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
