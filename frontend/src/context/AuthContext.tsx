import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  landlordId: number | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('access_token')
  );

  useEffect(() => {
    if (token) {
      api
        .get<User>('/auth/me')
        .then((res) => setUser(res.data))
        .catch(() => doLogout());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const doLogout = () => {
    localStorage.removeItem('access_token');
    setToken(null);
    setUser(null);
  };

  const login = async (email: string, password: string) => {
    const res = await api.post<{ access_token: string }>('/auth/login', {
      email,
      password,
    });
    const { access_token } = res.data;
    localStorage.setItem('access_token', access_token);
    setToken(access_token);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout: doLogout,
        isAdmin: user?.role === 'ADMIN',
        landlordId: user?.landlord_id ?? null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
