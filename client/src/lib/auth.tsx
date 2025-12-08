import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, getQueryFn } from './queryClient';
import { preloadByUserType, preloadDriverResourcesOnLogin } from './preload';
import type { User, UserWithConductor } from '@shared/schema';

interface VerificationStatus {
  cedulaVerificada: boolean;
  telefonoVerificado: boolean;
  fotoVerificada?: boolean;
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

function hasSessionCookie(): boolean {
  if (typeof document === 'undefined') return true;
  return document.cookie.includes('connect.sid');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [pendingVerification, setPendingVerification] = useState<VerificationStatus | null>(null);
  const [pendingVerificationUser, setPendingVerificationUser] = useState<UserWithConductor | null>(null);
  
  // Check cookie existence for instant feedback (no network request needed)
  const cookieExists = hasSessionCookie();
  
  const { data: user, isLoading: queryLoading } = useQuery<UserWithConductor | null>({
    queryKey: ['/api/auth/me'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    retry: false,
    // Only fetch if cookie exists - saves a network request for logged out users
    enabled: cookieExists,
  });
  
  // If no cookie exists, we know immediately user is not logged in
  // This provides instant feedback without waiting for API call
  const isLoading = cookieExists ? queryLoading : false;

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; userType?: string }) => {
      const API_BASE_URL = import.meta.env.VITE_API_URL || '';
      const fullUrl = API_BASE_URL ? `${API_BASE_URL}/api/auth/login` : '/api/auth/login';
      
      const res = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      
      let responseData;
      try {
        responseData = await res.json();
      } catch {
        if (!res.ok) throw new Error('Login failed');
        return { user: null };
      }
      
      if (res.status === 403 && responseData?.requiresVerification) {
        const verificationError = new Error(responseData.message) as VerificationError;
        verificationError.requiresVerification = true;
        verificationError.verificationStatus = responseData.verificationStatus;
        verificationError.redirectTo = responseData.redirectTo;
        verificationError.user = responseData.user;
        throw verificationError;
      }
      
      if (!res.ok) throw new Error(responseData?.message || 'Login failed');
      return responseData;
    },
    onSuccess: async (data) => {
      // Clear any pending verification state
      setPendingVerification(null);
      setPendingVerificationUser(null);
      // Update the cache immediately with the user data
      if (data?.user) {
        queryClient.setQueryData(['/api/auth/me'], data.user);
        // Preload resources based on user type for faster navigation
        preloadByUserType(data.user.userType);
        // Additional fast preload for drivers (backwards compatibility)
        if (data.user.userType === 'conductor') {
          preloadDriverResourcesOnLogin();
        }
      }
      // Also invalidate to ensure fresh data
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
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
      queryClient.setQueryData(['/api/auth/me'], data.user);
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/auth/logout', {});
      if (!res.ok) throw new Error('Logout failed');
    },
    onSuccess: () => {
      queryClient.setQueryData(['/api/auth/me'], null);
      setPendingVerification(null);
      setPendingVerificationUser(null);
    },
  });

  const checkAccounts = async (email: string, password: string): Promise<CheckAccountsResult> => {
    const API_BASE_URL = import.meta.env.VITE_API_URL || '';
    const fullUrl = API_BASE_URL ? `${API_BASE_URL}/api/auth/check-accounts` : '/api/auth/check-accounts';
    
    const res = await fetch(fullUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data?.message || 'Error verificando cuentas');
    }
    
    return data;
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
    await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
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
