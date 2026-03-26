import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getMe, login as loginRequest, logout as logoutRequest } from '../services/authService';
import { getCurrentSubscription } from '../services/billingService';
import { BillingSubscription, User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  authLoading: boolean;
  billingLoading: boolean;
  billingSubscription: BillingSubscription | null;
  billingRestricted: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshBilling: () => Promise<void>;
  isAdmin: boolean;
  landlordId: number | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('access_token')
  );
  const [authLoading, setAuthLoading] = useState<boolean>(Boolean(token));
  const [billingLoading, setBillingLoading] = useState<boolean>(false);
  const [billingSubscription, setBillingSubscription] = useState<BillingSubscription | null>(null);

  const refreshBilling = async () => {
    if (!token || user?.role !== 'LANDLORD') {
      setBillingSubscription(null);
      setBillingLoading(false);
      return;
    }

    setBillingLoading(true);
    try {
      const subscription = await getCurrentSubscription();
      setBillingSubscription(subscription);
    } catch {
      setBillingSubscription(null);
    } finally {
      setBillingLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      setAuthLoading(true);
      getMe()
        .then((res) => setUser(res.data))
        .catch(() => doLogout())
        .finally(() => setAuthLoading(false));
    } else {
      setAuthLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const doLogout = () => {
    localStorage.removeItem('access_token');
    setToken(null);
    setUser(null);
    setAuthLoading(false);
    setBillingSubscription(null);
    setBillingLoading(false);
  };

  useEffect(() => {
    void refreshBilling();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.role, user?.id]);

  const login = async (email: string, password: string) => {
    setAuthLoading(true);
    try {
      const res = await loginRequest(email, password);
      const { access_token } = res.data;
      localStorage.setItem('access_token', access_token);
      setToken(access_token);
    } catch (error) {
      setAuthLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await logoutRequest();
    } catch {
      // Client-side logout should still succeed if the API call fails.
    } finally {
      doLogout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        authLoading,
        billingLoading,
        billingSubscription,
        billingRestricted: user?.role === 'LANDLORD'
          && billingSubscription?.subscription_status === 'TRIAL_EXPIRED',
        login,
        logout,
        refreshBilling,
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
