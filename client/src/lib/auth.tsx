import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, getQueryFn } from './queryClient';
import { preloadDriverResourcesOnLogin } from './preload';
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

interface AuthContextType {
  user: UserWithConductor | null;
  isLoading: boolean;
  pendingVerification: VerificationStatus | null;
  pendingVerificationUser: UserWithConductor | null;
  login: (email: string, password: string) => Promise<UserWithConductor>;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [pendingVerification, setPendingVerification] = useState<VerificationStatus | null>(null);
  const [pendingVerificationUser, setPendingVerificationUser] = useState<UserWithConductor | null>(null);
  
  const { data: user, isLoading } = useQuery<UserWithConductor | null>({
    queryKey: ['/api/auth/me'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await apiRequest('POST', '/api/auth/login', data);
      
      // Try to parse JSON response, handle empty or malformed responses
      let responseData;
      try {
        responseData = await res.json();
      } catch {
        if (!res.ok) throw new Error('Login failed');
        return { user: null };
      }
      
      // Handle 403 with verification required
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
        // Preload driver resources immediately after login for faster dashboard load
        if (data.user.userType === 'conductor') {
          preloadDriverResourcesOnLogin();
        }
      }
      // Also invalidate to ensure fresh data
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
    onError: (error: any) => {
      // If verification is required, store the state temporarily
      if (error?.requiresVerification) {
        setPendingVerification(error.verificationStatus);
        setPendingVerificationUser(error.user);
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

  const login = async (email: string, password: string) => {
    const result = await loginMutation.mutateAsync({ email, password });
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
