import { vi, Mock } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterForm } from './RegisterForm';
import { useAuth } from '@/hooks/useAuth';

// Mock useAuth hook
vi.mock('@/hooks/useAuth');
const mockUseAuth = useAuth as Mock<typeof useAuth>;

describe('RegisterForm', () => {
  const mockSignUp = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockOnSwitchToLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signIn: vi.fn(),
      signUp: mockSignUp,
      signOut: vi.fn(),
      resetPassword: vi.fn(),
    });
  });

  it('should render register form correctly', () => {
    render(<RegisterForm />);
    
    expect(screen.getByRole('heading', { name: /sign up/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  it('should handle form input changes', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);
    
    const fullNameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    
    await user.type(fullNameInput, 'John Doe');
    await user.type(emailInput, 'john@example.com');
    await user.type(passwordInput, 'Password123');
    await user.type(confirmPasswordInput, 'Password123');
    
    expect(fullNameInput).toHaveValue('John Doe');
    expect(emailInput).toHaveValue('john@example.com');
    expect(passwordInput).toHaveValue('Password123');
    expect(confirmPasswordInput).toHaveValue('Password123');
  });

  it('should submit registration form successfully', async () => {
    const user = userEvent.setup();
    mockSignUp.mockResolvedValue({ error: null });
    
    render(<RegisterForm onSuccess={mockOnSuccess} />);
    
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'Password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123');
    await user.click(screen.getByRole('button', { name: /sign up/i }));
    
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'john@example.com',
        password: 'Password123',
        fullName: 'John Doe',
      });
    });
    
    expect(screen.getByText(/registration successful/i)).toBeInTheDocument();
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it('should display error when passwords do not match', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);
    
    await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'Password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'DifferentPassword');
    await user.click(screen.getByRole('button', { name: /sign up/i }));
    
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('should validate password strength', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);
    
    // Test weak password (too short)
    await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'weak');
    await user.type(screen.getByLabelText(/confirm password/i), 'weak');
    await user.click(screen.getByRole('button', { name: /sign up/i }));
    
    expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('should validate password complexity', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);
    
    // Test password without uppercase, lowercase, and number
    await user.clear(screen.getByLabelText(/^password$/i));
    await user.clear(screen.getByLabelText(/confirm password/i));
    await user.type(screen.getByLabelText(/^password$/i), 'password');
    await user.type(screen.getByLabelText(/confirm password/i), 'password');
    await user.click(screen.getByRole('button', { name: /sign up/i }));
    
    expect(screen.getByText(/password must contain at least one uppercase letter/i)).toBeInTheDocument();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('should display error on registration failure', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Email already exists';
    mockSignUp.mockResolvedValue({ error: { message: errorMessage } });
    
    render(<RegisterForm />);
    
    await user.type(screen.getByLabelText(/email address/i), 'existing@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'Password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123');
    await user.click(screen.getByRole('button', { name: /sign up/i }));
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('should show loading state during submission', async () => {
    const user = userEvent.setup();
    let resolveSignUp: (value: any) => void;
    const signUpPromise = new Promise(resolve => {
      resolveSignUp = resolve;
    });
    mockSignUp.mockReturnValue(signUpPromise);
    
    render(<RegisterForm />);
    
    await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'Password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123');
    await user.click(screen.getByRole('button', { name: /sign up/i }));
    
    expect(screen.getByText(/creating account.../i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /creating account.../i })).toBeDisabled();
    
    resolveSignUp!({ error: null });
    
    await waitFor(() => {
      expect(screen.getByText(/^sign up$/i)).toBeInTheDocument();
    });
  });

  it('should switch to login when switch button is clicked', async () => {
    const user = userEvent.setup();
    render(<RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />);
    
    await user.click(screen.getByText(/sign in/i));
    
    expect(mockOnSwitchToLogin).toHaveBeenCalled();
  });

  it('should clear error when user types after error', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);
    
    // Trigger password mismatch error
    await user.type(screen.getByLabelText(/^password$/i), 'Password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'DifferentPassword');
    await user.click(screen.getByRole('button', { name: /sign up/i }));
    
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    
    // Error should clear when user types
    await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
    
    expect(screen.queryByText(/passwords do not match/i)).not.toBeInTheDocument();
  });

  it('should reset form after successful registration', async () => {
    const user = userEvent.setup();
    mockSignUp.mockResolvedValue({ error: null });
    
    render(<RegisterForm />);
    
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'Password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123');
    await user.click(screen.getByRole('button', { name: /sign up/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/registration successful/i)).toBeInTheDocument();
    });
    
    // Form should be reset
    expect(screen.getByLabelText(/full name/i)).toHaveValue('');
    expect(screen.getByLabelText(/email address/i)).toHaveValue('');
    expect(screen.getByLabelText(/^password$/i)).toHaveValue('');
    expect(screen.getByLabelText(/confirm password/i)).toHaveValue('');
  });
});