import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, getQueryFn } from './queryClient';
import { preloadByUserType, preloadDriverResourcesOnLogin } from './preload';
import { CapacitorHttp } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';
import type { User, UserWithConductor } from '@shared/schema';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://app.gruard.com';

function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

function getFullUrl(path: string): string {
  if (isNativePlatform()) {
    return `${API_BASE_URL}${path}`;
  }
  if (API_BASE_URL && !API_BASE_URL.includes('localhost')) {
    return `${API_BASE_URL}${path}`;
  }
  return path;
}

interface VerificationStatus {
  cedulaVerificada: boolean;
  telefonoVerificado: boolean;
  fotoVerificada?: boolean;
  licenciaVerificada?: boolean;
  categoriasConfiguradas?: boolean;
  vehiculosRegistrados?: boolean;
}

interface VerificationError extends Error {
  requiresVerification: boolean;
  verificationStatus: VerificationStatus;
  redirectTo: string;
  user: UserWithConductor;
}

interface AccountInfo {
  userType: 'cliente' | 'conductor';
  nombre: string;
  apellido: string | null;
  fotoUrl: string | null;
}

interface CheckAccountsResult {
  requiresDisambiguation: boolean;
  accounts: AccountInfo[];
}

interface LoginOptions {
  userType?: string;
}

interface AuthContextType {
  user: UserWithConductor | null;
  isLoading: boolean;
  pendingVerification: VerificationStatus | null;
  pendingVerificationUser: UserWithConductor | null;
  login: (email: string, password: string, options?: LoginOptions) => Promise<UserWithConductor>;
  checkAccounts: (email: string, password: string) => Promise<CheckAccountsResult>;
  register: (data: RegisterData) => Promise<UserWithConductor>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearPendingVerification: () => void;
}

interface RegisterData {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  phone?: string;
  userType: 'cliente' | 'conductor' | 'admin';
  conductorData?: {
    licencia: string;
    placaGrua: string;
    marcaGrua: string;
    modeloGrua: string;
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function hasSessionIndicator(): boolean {
  if (typeof window === 'undefined') return true;
  // In native apps, HTTP-only cookies are not visible to JavaScript
  // Always return true for native platforms to check session on server
  if (isNativePlatform()) {
    return true;
  }
  // Check sessionStorage for login indicator (set after successful login)
  // This is needed because session cookies are httpOnly and not readable by JS
  try {
    return sessionStorage.getItem('gruard_session_active') === 'true';
  } catch {
    return true; // If sessionStorage fails, default to checking with server
  }
}

function setSessionIndicator(active: boolean): void {
  if (typeof window === 'undefined') return;
  if (isNativePlatform()) return; // Native apps don't need this
  try {
    if (active) {
      sessionStorage.setItem('gruard_session_active', 'true');
    } else {
      sessionStorage.removeItem('gruard_session_active');
    }
  } catch {
    // Ignore sessionStorage errors
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [pendingVerification, setPendingVerification] = useState<VerificationStatus | null>(null);
  const [pendingVerificationUser, setPendingVerificationUser] = useState<UserWithConductor | null>(null);
  
  // Use state for session indicator to make it reactive
  const [sessionActive, setSessionActive] = useState(() => hasSessionIndicator());
  
  const { data: user, isLoading: queryLoading } = useQuery<UserWithConductor | null>({
    queryKey: ['/api/auth/me'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    retry: false,
    // Only fetch if session indicator exists - saves a network request for logged out users
    enabled: sessionActive,
    // Keep previous data during refetch to prevent flickering
    placeholderData: (previousData) => previousData,
  });
  
  // Only show loading if:
  // 1. Session is active AND query is loading AND we don't have user data yet
  // This prevents the spinner from appearing during background refetches
  const isLoading = sessionActive && queryLoading && !user;
  
  // If session indicator exists but server says not authenticated, clear the indicator
  // This handles cases where server session expired but local indicator persists
  useEffect(() => {
    if (sessionActive && !queryLoading && user === null) {
      setSessionIndicator(false);
      setSessionActive(false);
    }
  }, [sessionActive, queryLoading, user]);

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; userType?: string }) => {
      const fullUrl = getFullUrl('/api/auth/login');
      
      let responseData;
      let status: number;
      
      if (isNativePlatform()) {
        const response = await CapacitorHttp.request({
          url: fullUrl,
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          data: data,
          webFetchExtra: {
            credentials: 'include',
          },
        });
        status = response.status;
        responseData = response.data;
      } else {
        const res = await fetch(fullUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          credentials: 'include',
        });
        status = res.status;
        try {
          responseData = await res.json();
        } catch {
          if (!res.ok) throw new Error('Login failed');
          return { user: null };
        }
      }
      
      if (status === 403 && responseData?.requiresVerification) {
        const verificationError = new Error(responseData.message) as VerificationError;
        verificationError.requiresVerification = true;
        verificationError.verificationStatus = responseData.verificationStatus;
        verificationError.redirectTo = responseData.redirectTo;
        verificationError.user = responseData.user;
        throw verificationError;
      }
      
      if (status < 200 || status >= 300) throw new Error(responseData?.message || 'Login failed');
      return responseData;
    },
    onSuccess: async (data) => {
      // Clear any pending verification state
      setPendingVerification(null);
      setPendingVerificationUser(null);
      
      // Update the cache immediately with the user data
      if (data?.user) {
        // Set session indicator for web browsers (needed because cookies are httpOnly)
        setSessionIndicator(true);
        setSessionActive(true);
        queryClient.setQueryData(['/api/auth/me'], data.user);
        // Preload resources based on user type for faster navigation
        preloadByUserType(data.user.userType);
        // Additional fast preload for drivers (backwards compatibility)
        if (data.user.userType === 'conductor') {
          preloadDriverResourcesOnLogin();
        }
      }
      
      // Invalidate and refetch specific queries used by home/profile pages
      await queryClient.invalidateQueries({ queryKey: ['/api/services/my-services'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/client/insurance/status'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/linked-accounts'] });
      
      // Small delay to ensure session cookie is fully propagated on native platforms
      if (isNativePlatform()) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    },
    onError: async (error: any) => {
      // If verification is required, store the state temporarily
      if (error?.requiresVerification) {
        setPendingVerification(error.verificationStatus);
        setPendingVerificationUser(error.user);
        // Session is kept active on server, so invalidate query to get authenticated user
        // This allows verification endpoints to work properly
        await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const res = await apiRequest('POST', '/api/auth/register', data);
      if (!res.ok) throw new Error('Registration failed');
      return res.json();
    },
    onSuccess: async (data) => {
      // Set session indicator for web browsers (needed because cookies are httpOnly)
      setSessionIndicator(true);
      setSessionActive(true);
      queryClient.setQueryData(['/api/auth/me'], data.user);
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/auth/logout', {});
      if (!res.ok) throw new Error('Logout failed');
    },
    onSuccess: async () => {
      // Clear session indicator for web browsers
      setSessionIndicator(false);
      setSessionActive(false);
      // Clear all auth-related cache immediately
      queryClient.setQueryData(['/api/auth/me'], null);
      setPendingVerification(null);
      setPendingVerificationUser(null);
      // Also invalidate to prevent stale data on next login
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      // Clear all queries to ensure fresh state for next login
      queryClient.clear();
    },
  });

  const checkAccounts = async (email: string, password: string): Promise<CheckAccountsResult> => {
    const fullUrl = getFullUrl('/api/auth/check-accounts');
    
    let responseData;
    let status: number;
    
    if (isNativePlatform()) {
      const response = await CapacitorHttp.request({
        url: fullUrl,
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        data: { email, password },
        webFetchExtra: {
          credentials: 'include',
        },
      });
      status = response.status;
      responseData = response.data;
    } else {
      const res = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });
      status = res.status;
      responseData = await res.json();
    }
    
    if (status < 200 || status >= 300) {
      throw new Error(responseData?.message || 'Error verificando cuentas');
    }
    
    return responseData;
  };

  const login = async (email: string, password: string, options?: LoginOptions) => {
    const result = await loginMutation.mutateAsync({ 
      email, 
      password, 
      userType: options?.userType,
    });
    return result.user;
  };

  const register = async (data: RegisterData) => {
    const result = await registerMutation.mutateAsync(data);
    return result.user;
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const refreshUser = async () => {
    await queryClient.refetchQueries({ queryKey: ['/api/auth/me'] });
  };

  const clearPendingVerification = () => {
    setPendingVerification(null);
    setPendingVerificationUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user: user || null, 
      isLoading, 
      pendingVerification,
      pendingVerificationUser,
      login,
      checkAccounts,
      register, 
      logout, 
      refreshUser,
      clearPendingVerification,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
