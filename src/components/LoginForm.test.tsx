import { vi, Mock } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';
import { useAuth } from '@/hooks/useAuth';

// Mock useAuth hook
vi.mock('@/hooks/useAuth');
const mockUseAuth = useAuth as Mock<typeof useAuth>;

describe('LoginForm', () => {
  const mockSignIn = vi.fn();
  const mockResetPassword = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockOnSwitchToRegister = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signIn: mockSignIn,
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPassword: mockResetPassword,
    });
  });

  it('should render login form correctly', () => {
    render(<LoginForm />);
    
    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/forgot your password/i)).toBeInTheDocument();
  });

  it('should handle form input changes', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    
    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('should submit login form successfully', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({ error: null });
    
    render(<LoginForm onSuccess={mockOnSuccess} />);
    
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
    
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it('should display error on login failure', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Invalid credentials';
    mockSignIn.mockResolvedValue({ error: { message: errorMessage } });
    
    render(<LoginForm />);
    
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('should show loading state during submission', async () => {
    const user = userEvent.setup();
    let resolveSignIn: (value: any) => void;
    const signInPromise = new Promise(resolve => {
      resolveSignIn = resolve;
    });
    mockSignIn.mockReturnValue(signInPromise);
    
    render(<LoginForm />);
    
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    
    expect(screen.getByText(/signing in.../i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /signing in.../i })).toBeDisabled();
    
    resolveSignIn!({ error: null });
    
    await waitFor(() => {
      expect(screen.getByText(/sign in/i)).toBeInTheDocument();
    });
  });

  it('should switch to register when switch button is clicked', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSwitchToRegister={mockOnSwitchToRegister} />);
    
    await user.click(screen.getByText(/sign up/i));
    
    expect(mockOnSwitchToRegister).toHaveBeenCalled();
  });

  it('should show password reset form when forgot password is clicked', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    
    await user.click(screen.getByText(/forgot your password/i));
    
    expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument();
    expect(screen.getByText(/send reset email/i)).toBeInTheDocument();
  });

  it('should handle password reset submission', async () => {
    const user = userEvent.setup();
    mockResetPassword.mockResolvedValue({ error: null });
    
    render(<LoginForm />);
    
    // Switch to reset password form
    await user.click(screen.getByText(/forgot your password/i));
    
    // Fill and submit reset form
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /send reset email/i }));
    
    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith('test@example.com');
    });
    
    // Should show success message and return to login
    expect(screen.getByText(/password reset email sent/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
  });

  it('should handle password reset error', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Email not found';
    mockResetPassword.mockResolvedValue({ error: { message: errorMessage } });
    
    render(<LoginForm />);
    
    // Switch to reset password form
    await user.click(screen.getByText(/forgot your password/i));
    
    // Fill and submit reset form
    await user.type(screen.getByLabelText(/email address/i), 'notfound@example.com');
    await user.click(screen.getByRole('button', { name: /send reset email/i }));
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('should clear error when user types after error', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Invalid credentials';
    mockSignIn.mockResolvedValue({ error: { message: errorMessage } });
    
    render(<LoginForm />);
    
    // Trigger error
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
    
    // Error should clear when user types
    await user.type(screen.getByLabelText(/email address/i), 'new@example.com');
    
    expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();
  });
});