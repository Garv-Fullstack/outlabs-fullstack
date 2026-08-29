import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { AuthUser, AuthState } from '../types/auth.types.js';
import { authApi } from '../api/auth.api.js';
import { ApiError } from '../api/client.js';

interface AuthContextValue extends AuthState {
  checkSession: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const checkSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const userData = await authApi.getMe();
      setUser(userData);
      setAuthenticated(true);
    } catch (err) {
      setUser(null);
      setAuthenticated(false);
      if (err instanceof ApiError) {
        if (err.statusCode === 401) {
          // Normal unauthenticated session state
          setError(null);
        } else {
          setError(err.message);
        }
      } else {
        setError('Unable to reach server. Please check your network connection.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await authApi.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setAuthenticated(false);
      setError(null);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const value: AuthContextValue = {
    user,
    loading,
    authenticated,
    error,
    checkSession,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
