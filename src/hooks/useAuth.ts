import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { LoginCredentials, RegisterCredentials, AuthResponse } from '../types/auth';

/**
 * Custom hook for Supabase authentication
 * Provides login, register, logout functionality and user state management
 */
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get initial session
    const getSession = async (): Promise<void> => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        setUser(session?.user ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to get session');
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Login user with email and password
   */
  const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        setError(error.message);
        return { user: null, error: { message: error.message } };
      }

      return { 
        user: data.user ? {
          id: data.user.id,
          email: data.user.email!,
          created_at: data.user.created_at,
        } : null, 
        error: null 
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      return { user: null, error: { message: errorMessage } };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Register new user with email and password
   */
  const register = async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    try {
      setLoading(true);
      setError(null);

      if (credentials.password !== credentials.confirmPassword) {
        const errorMessage = 'Passwords do not match';
        setError(errorMessage);
        return { user: null, error: { message: errorMessage } };
      }

      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        setError(error.message);
        return { user: null, error: { message: error.message } };
      }

      return { 
        user: data.user ? {
          id: data.user.id,
          email: data.user.email!,
          created_at: data.user.created_at,
        } : null, 
        error: null 
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      return { user: null, error: { message: errorMessage } };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logout current user
   */
  const logout = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed');
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
  };
};
