import { vi, Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
  },
}));

const mockSupabase = supabase as Mock<typeof supabase>;

describe('useAuth', () => {
  const mockUser: User = {
    id: 'test-user-id',
    email: 'test@example.com',
    created_at: '2023-01-01T00:00:00Z',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    confirmation_sent_at: '2023-01-01T00:00:00Z',
  };

  const mockSession: Session = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Date.now() / 1000 + 3600,
    token_type: 'bearer',
    user: mockUser,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    });
  });

  describe('initialization', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => useAuth());
      
      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBe(null);
      expect(result.current.session).toBe(null);
    });

    it('should set user and session when getSession returns data', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.session).toEqual(mockSession);
    });

    it('should handle getSession error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation();
      
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session error' } as any,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(consoleSpy).toHaveBeenCalledWith('Error getting session:', expect.any(Object));
      expect(result.current.user).toBe(null);
      expect(result.current.session).toBe(null);
      
      consoleSpy.mockRestore();
    });
  });

  describe('signUp', () => {
    it('should call supabase signUp with correct data', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const registerData = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
      };

      let signUpResult;
      await act(async () => {
        signUpResult = await result.current.signUp(registerData);
      });

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: registerData.email,
        password: registerData.password,
        options: {
          data: {
            full_name: registerData.fullName,
          },
        },
      });
      
      expect(signUpResult).toEqual({ error: null });
    });

    it('should return error when signUp fails', async () => {
      const mockError = { message: 'Email already exists' };
      
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError as any,
      });

      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let signUpResult;
      await act(async () => {
        signUpResult = await result.current.signUp({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      expect(signUpResult).toEqual({ error: mockError });
    });
  });

  describe('signIn', () => {
    it('should call supabase signInWithPassword with correct data', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      let signInResult;
      await act(async () => {
        signInResult = await result.current.signIn(loginData);
      });

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith(loginData);
      expect(signInResult).toEqual({ error: null });
    });

    it('should return error when signIn fails', async () => {
      const mockError = { message: 'Invalid credentials' };
      
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError as any,
      });

      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let signInResult;
      await act(async () => {
        signInResult = await result.current.signIn({
          email: 'test@example.com',
          password: 'wrongpassword',
        });
      });

      expect(signInResult).toEqual({ error: mockError });
    });
  });

  describe('signOut', () => {
    it('should call supabase signOut', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let signOutResult;
      await act(async () => {
        signOutResult = await result.current.signOut();
      });

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      expect(signOutResult).toEqual({ error: null });
    });

    it('should return error when signOut fails', async () => {
      const mockError = { message: 'Sign out failed' };
      
      mockSupabase.auth.signOut.mockResolvedValue({ error: mockError as any });

      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let signOutResult;
      await act(async () => {
        signOutResult = await result.current.signOut();
      });

      expect(signOutResult).toEqual({ error: mockError });
    });
  });

  describe('resetPassword', () => {
    it('should call supabase resetPasswordForEmail', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const email = 'test@example.com';

      let resetResult;
      await act(async () => {
        resetResult = await result.current.resetPassword(email);
      });

      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(email);
      expect(resetResult).toEqual({ error: null });
    });

    it('should return error when resetPassword fails', async () => {
      const mockError = { message: 'Reset failed' };
      
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: mockError as any,
      });

      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let resetResult;
      await act(async () => {
        resetResult = await result.current.resetPassword('test@example.com');
      });

      expect(resetResult).toEqual({ error: mockError });
    });
  });
});