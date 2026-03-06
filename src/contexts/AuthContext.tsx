import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiFetch, clearAuthToken, setAuthToken } from '@/lib/apiClient';

interface JwtUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isWebsiteHead?: boolean;
  permissions?: Array<{ page_name: string; can_view: boolean; can_edit: boolean }>;
  status?: string;
}

interface AuthContextType {
  user: JwtUser | null;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<JwtUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const storedUser = localStorage.getItem('loggedInUser');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser) as JwtUser);
        } catch {
          localStorage.removeItem('loggedInUser');
        }
      }
      setIsLoading(false);
    };

    init();
  }, []);

  const login = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const result = await apiFetch<{ token: string; user: JwtUser }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      setAuthToken(result.token);
      localStorage.setItem('loggedInUser', JSON.stringify(result.user));
      setUser(result.user);
      return { error: null };
    } catch (e) {
      return { error: (e as Error)?.message || 'Login failed' };
    }
  };

  const signup = async (email: string, password: string, fullName: string): Promise<{ error: string | null }> => {
    try {
      await apiFetch('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, fullName }),
      });
      return { error: null };
    } catch (e) {
      return { error: (e as Error)?.message || 'Signup failed' };
    }
  };

  const logout = async () => {
    clearAuthToken();
    localStorage.removeItem('loggedInUser');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      signup,
      logout, 
      isAuthenticated: !!user,
      isLoading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
