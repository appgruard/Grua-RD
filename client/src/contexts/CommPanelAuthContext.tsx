import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';

interface CommPanelUser {
  id: string;
  email: string;
  nombre: string;
}

interface CommPanelAuthContextType {
  user: CommPanelUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  apiRequest: <T = any>(url: string, options?: RequestInit) => Promise<T>;
}

const CommPanelAuthContext = createContext<CommPanelAuthContextType | null>(null);

const STORAGE_KEY = 'comm_panel_auth';

export function CommPanelAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CommPanelUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const { token: storedToken, user: storedUser, expiresAt } = JSON.parse(stored);
        if (new Date(expiresAt) > new Date()) {
          setToken(storedToken);
          setUser(storedUser);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/comm-panel/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const data = await response.json();
        return { success: false, error: data.message || 'Credenciales inválidas' };
      }

      const data = await response.json();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        token: data.token,
        user: data.user,
        expiresAt
      }));

      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Error de conexión' };
    }
  };

  const logout = async () => {
    if (token) {
      try {
        await fetch('/api/comm-panel/logout', {
          method: 'POST',
          headers: { 'x-comm-panel-token': token }
        });
      } catch {}
    }
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
    setLocation('/admin/communications/login');
  };

  const apiRequest = async <T = any>(url: string, options: RequestInit = {}): Promise<T> => {
    if (!token) {
      throw new Error('No autenticado');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'x-comm-panel-token': token,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 401) {
      logout();
      throw new Error('Sesión expirada');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(error.message);
    }

    return response.json();
  };

  return (
    <CommPanelAuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!token && !!user,
      isLoading,
      login,
      logout,
      apiRequest
    }}>
      {children}
    </CommPanelAuthContext.Provider>
  );
}

export function useCommPanelAuth() {
  const context = useContext(CommPanelAuthContext);
  if (!context) {
    throw new Error('useCommPanelAuth must be used within CommPanelAuthProvider');
  }
  return context;
}

export function CommPanelProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useCommPanelAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/admin/communications/login');
    }
  }, [isLoading, isAuthenticated, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
