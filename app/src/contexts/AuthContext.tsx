import React, { createContext, useContext, useEffect, useState } from 'react';
import { authAPI, getAuthToken, setAuthToken, removeAuthToken } from '../lib/api';

interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  register: (userData: {
    email: string;
    username: string;
    password: string;
    first_name: string;
    last_name: string;
  }) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app start
    const initAuth = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const userData = await authAPI.getCurrentUser();
          setUser(userData);
        } catch (error) {
          // Token might be invalid, remove it
          removeAuthToken();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await authAPI.login({ username, password });
      setAuthToken(response.access_token);
      
      // Get user data
      const userData = await authAPI.getCurrentUser();
      setUser(userData);
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData: {
    email: string;
    username: string;
    password: string;
    first_name: string;
    last_name: string;
  }) => {
    try {
      await authAPI.register(userData);
      // Auto-login after registration
      await login(userData.username, userData.password);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
  };

  const value = {
    user,
    login,
    register,
    logout,
    isLoading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
