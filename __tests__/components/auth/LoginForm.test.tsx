import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginForm from '@/components/auth/LoginForm'
import { createMockUser } from '@/__tests__/utils/test-utils'

// Mock the auth context
const mockLogin = jest.fn()
const mockSetUser = jest.fn()

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    setUser: mockSetUser,
    user: null,
    isAuthenticated: false,
  }),
}))

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders login form correctly', () => {
    render(<LoginForm onSwitchToRegister={jest.fn()} onForgotPassword={jest.fn()} />)

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument()
  })

  it('shows validation errors for empty fields', async () => {
    render(<LoginForm onSwitchToRegister={jest.fn()} onForgotPassword={jest.fn()} />)

    const loginButton = screen.getByRole('button', { name: /login/i })
    fireEvent.click(loginButton)

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  it('shows validation error for invalid email format', async () => {
    render(<LoginForm onSwitchToRegister={jest.fn()} onForgotPassword={jest.fn()} />)

    const emailInput = screen.getByLabelText(/email/i)
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })

    const loginButton = screen.getByRole('button', { name: /login/i })
    fireEvent.click(loginButton)

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
    })
  })

  it('calls login function with valid credentials', async () => {
    const mockUser = createMockUser()
    mockLogin.mockResolvedValueOnce({ success: true, user: mockUser })

    render(<LoginForm onSwitchToRegister={jest.fn()} onForgotPassword={jest.fn()} />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const loginButton = screen.getByRole('button', { name: /login/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(loginButton)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })
  })

  it('shows loading state during login', async () => {
    mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(<LoginForm onSwitchToRegister={jest.fn()} onForgotPassword={jest.fn()} />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const loginButton = screen.getByRole('button', { name: /login/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(loginButton)

    expect(screen.getByText(/logging in/i)).toBeInTheDocument()
    expect(loginButton).toBeDisabled()
  })

  it('shows error message on login failure', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'))

    render(<LoginForm onSwitchToRegister={jest.fn()} onForgotPassword={jest.fn()} />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const loginButton = screen.getByRole('button', { name: /login/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(loginButton)

    await waitFor(() => {
      expect(screen.getByText(/login failed/i)).toBeInTheDocument()
    })
  })

  it('clears form after successful login', async () => {
    const mockUser = createMockUser()
    mockLogin.mockResolvedValueOnce({ success: true, user: mockUser })

    render(<LoginForm onSwitchToRegister={jest.fn()} onForgotPassword={jest.fn()} />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const loginButton = screen.getByRole('button', { name: /login/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(loginButton)

    await waitFor(() => {
      expect(emailInput).toHaveValue('')
      expect(passwordInput).toHaveValue('')
    })
  })

  it('toggles password visibility', () => {
    render(<LoginForm onSwitchToRegister={jest.fn()} onForgotPassword={jest.fn()} />)

    const passwordInput = screen.getByLabelText(/password/i)
    const toggleButton = screen.getByRole('button', { name: /toggle password visibility/i })

    expect(passwordInput).toHaveAttribute('type', 'password')

    fireEvent.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'text')

    fireEvent.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('handles form submission with Enter key', async () => {
    const mockUser = createMockUser()
    mockLogin.mockResolvedValueOnce({ success: true, user: mockUser })

    render(<LoginForm onSwitchToRegister={jest.fn()} onForgotPassword={jest.fn()} />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })

    fireEvent.keyPress(passwordInput, { key: 'Enter', code: 'Enter' })

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })
  })

  it('prevents form submission when validation fails', async () => {
    render(<LoginForm onSwitchToRegister={jest.fn()} onForgotPassword={jest.fn()} />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const loginButton = screen.getByRole('button', { name: /login/i })

    // Fill only email, leave password empty
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.click(loginButton)

    await waitFor(() => {
      expect(mockLogin).not.toHaveBeenCalled()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  it('shows remember me checkbox', () => {
    render(<LoginForm onSwitchToRegister={jest.fn()} onForgotPassword={jest.fn()} />)

    const rememberMeCheckbox = screen.getByRole('checkbox', { name: /remember me/i })
    expect(rememberMeCheckbox).toBeInTheDocument()
    expect(rememberMeCheckbox).not.toBeChecked()
  })

  it('toggles remember me checkbox', () => {
    render(<LoginForm onSwitchToRegister={jest.fn()} onForgotPassword={jest.fn()} />)

    const rememberMeCheckbox = screen.getByRole('checkbox', { name: /remember me/i })

    fireEvent.click(rememberMeCheckbox)
    expect(rememberMeCheckbox).toBeChecked()

    fireEvent.click(rememberMeCheckbox)
    expect(rememberMeCheckbox).not.toBeChecked()
  })
})
