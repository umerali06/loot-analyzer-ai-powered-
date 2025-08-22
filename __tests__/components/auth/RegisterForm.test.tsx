import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RegisterForm from '@/components/auth/RegisterForm'
import { createMockUser } from '@/__tests__/utils/test-utils'

// Mock the auth context
const mockRegister = jest.fn()
const mockSetUser = jest.fn()

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    register: mockRegister,
    setUser: mockSetUser,
    user: null,
    isAuthenticated: false,
  }),
}))

describe('RegisterForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders registration form correctly', () => {
    render(<RegisterForm onSwitchToLogin={jest.fn()} />)

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument()
    expect(screen.getByText(/already have an account/i)).toBeInTheDocument()
  })

  it('shows validation errors for empty fields', async () => {
    render(<RegisterForm onSwitchToLogin={jest.fn()} />)

    const registerButton = screen.getByRole('button', { name: /register/i })
    fireEvent.click(registerButton)

    await waitFor(() => {
      expect(screen.getByText(/username is required/i)).toBeInTheDocument()
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      expect(screen.getByText(/confirm password is required/i)).toBeInTheDocument()
    })
  })

  it('shows validation error for invalid email format', async () => {
    render(<RegisterForm onSwitchToLogin={jest.fn()} />)

    const emailInput = screen.getByLabelText(/email/i)
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })

    const registerButton = screen.getByRole('button', { name: /register/i })
    fireEvent.click(registerButton)

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
    })
  })

  it('shows validation error for short password', async () => {
    render(<RegisterForm onSwitchToLogin={jest.fn()} />)

    const passwordInput = screen.getByLabelText(/password/i)
    fireEvent.change(passwordInput, { target: { value: '123' } })

    const registerButton = screen.getByRole('button', { name: /register/i })
    fireEvent.click(registerButton)

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
    })
  })

  it('shows validation error for password mismatch', async () => {
    render(<RegisterForm onSwitchToLogin={jest.fn()} />)

    const passwordInput = screen.getByLabelText(/password/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)

    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'different123' } })

    const registerButton = screen.getByRole('button', { name: /register/i })
    fireEvent.click(registerButton)

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    })
  })

  it('calls register function with valid credentials', async () => {
    const mockUser = createMockUser()
    mockRegister.mockResolvedValueOnce({ success: true, user: mockUser })

    render(<RegisterForm onSwitchToLogin={jest.fn()} />)

    const usernameInput = screen.getByLabelText(/username/i)
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const registerButton = screen.getByRole('button', { name: /register/i })

    fireEvent.change(usernameInput, { target: { value: 'testuser' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(registerButton)

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      })
    })
  })

  it('shows loading state during registration', async () => {
    mockRegister.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(<RegisterForm onSwitchToLogin={jest.fn()} />)

    const usernameInput = screen.getByLabelText(/username/i)
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const registerButton = screen.getByRole('button', { name: /register/i })

    fireEvent.change(usernameInput, { target: { value: 'testuser' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(registerButton)

    expect(screen.getByText(/registering/i)).toBeInTheDocument()
    expect(registerButton).toBeDisabled()
  })

  it('shows error message on registration failure', async () => {
    mockRegister.mockRejectedValueOnce(new Error('Registration failed'))

    render(<RegisterForm onSwitchToLogin={jest.fn()} />)

    const usernameInput = screen.getByLabelText(/username/i)
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const registerButton = screen.getByRole('button', { name: /register/i })

    fireEvent.change(usernameInput, { target: { value: 'testuser' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(registerButton)

    await waitFor(() => {
      expect(screen.getByText(/registration failed/i)).toBeInTheDocument()
    })
  })

  it('clears form after successful registration', async () => {
    const mockUser = createMockUser()
    mockRegister.mockResolvedValueOnce({ success: true, user: mockUser })

    render(<RegisterForm onSwitchToLogin={jest.fn()} />)

    const usernameInput = screen.getByLabelText(/username/i)
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const registerButton = screen.getByRole('button', { name: /register/i })

    fireEvent.change(usernameInput, { target: { value: 'testuser' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(registerButton)

    await waitFor(() => {
      expect(usernameInput).toHaveValue('')
      expect(emailInput).toHaveValue('')
      expect(passwordInput).toHaveValue('')
      expect(confirmPasswordInput).toHaveValue('')
    })
  })

  it('toggles password visibility', () => {
    render(<RegisterForm onSwitchToLogin={jest.fn()} />)

    const passwordInput = screen.getByLabelText(/password/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const toggleButtons = screen.getAllByRole('button', { name: /toggle password visibility/i })

    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(confirmPasswordInput).toHaveAttribute('type', 'password')

    // Toggle password visibility
    fireEvent.click(toggleButtons[0])
    expect(passwordInput).toHaveAttribute('type', 'text')

    fireEvent.click(toggleButtons[0])
    expect(passwordInput).toHaveAttribute('type', 'password')

    // Toggle confirm password visibility
    fireEvent.click(toggleButtons[1])
    expect(confirmPasswordInput).toHaveAttribute('type', 'text')

    fireEvent.click(toggleButtons[1])
    expect(confirmPasswordInput).toHaveAttribute('type', 'password')
  })

  it('handles form submission with Enter key', async () => {
    const mockUser = createMockUser()
    mockRegister.mockResolvedValueOnce({ success: true, user: mockUser })

    render(<RegisterForm onSwitchToLogin={jest.fn()} />)

    const usernameInput = screen.getByLabelText(/username/i)
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)

    fireEvent.change(usernameInput, { target: { value: 'testuser' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })

    fireEvent.keyPress(confirmPasswordInput, { key: 'Enter', code: 'Enter' })

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      })
    })
  })

  it('prevents form submission when validation fails', async () => {
    render(<RegisterForm onSwitchToLogin={jest.fn()} />)

    const usernameInput = screen.getByLabelText(/username/i)
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const registerButton = screen.getByRole('button', { name: /register/i })

    // Fill only username, leave other fields empty
    fireEvent.change(usernameInput, { target: { value: 'testuser' } })
    fireEvent.click(registerButton)

    await waitFor(() => {
      expect(mockRegister).not.toHaveBeenCalled()
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      expect(screen.getByText(/confirm password is required/i)).toBeInTheDocument()
    })
  })

  it('calls onSwitchToLogin when switching to login', () => {
    const mockSwitchToLogin = jest.fn()
    render(<RegisterForm onSwitchToLogin={mockSwitchToLogin} />)

    const switchButton = screen.getByText(/already have an account/i)
    fireEvent.click(switchButton)

    expect(mockSwitchToLogin).toHaveBeenCalled()
  })
})
