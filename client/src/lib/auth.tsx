import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from './queryClient';
import type { User, UserWithConductor } from '@shared/schema';

interface AuthContextType {
  user: UserWithConductor | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<UserWithConductor>;
  register: (data: RegisterData) => Promise<UserWithConductor>;
  logout: () => Promise<void>;
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
  
  const { data: user, isLoading } = useQuery<UserWithConductor | null>({
    queryKey: ['/api/auth/me'],
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await apiRequest('POST', '/api/auth/login', data);
      if (!res.ok) throw new Error('Login failed');
      return res.json();
    },
    onSuccess: async (data) => {
      // Update the cache immediately with the user data
      queryClient.setQueryData(['/api/auth/me'], data.user);
      // Also invalidate to ensure fresh data
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
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

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading, login, register, logout }}>
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
