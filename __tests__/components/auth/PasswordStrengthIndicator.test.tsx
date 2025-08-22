import React from 'react'
import { render, screen } from '@testing-library/react'
import PasswordStrengthIndicator from '@/components/auth/PasswordStrengthIndicator'

describe('PasswordStrengthIndicator', () => {
  it('renders with empty password', () => {
    render(<PasswordStrengthIndicator password="" />)
    
    expect(screen.getByText(/password strength/i)).toBeInTheDocument()
    expect(screen.getByText(/very weak/i)).toBeInTheDocument()
  })

  it('shows very weak for short password', () => {
    render(<PasswordStrengthIndicator password="123" />)
    
    expect(screen.getByText(/very weak/i)).toBeInTheDocument()
  })

  it('shows weak for basic password', () => {
    render(<PasswordStrengthIndicator password="password" />)
    
    expect(screen.getByText(/weak/i)).toBeInTheDocument()
  })

  it('shows fair for password with numbers', () => {
    render(<PasswordStrengthIndicator password="password123" />)
    
    expect(screen.getByText(/fair/i)).toBeInTheDocument()
  })

  it('shows good for password with mixed case and numbers', () => {
    render(<PasswordStrengthIndicator password="Password123" />)
    
    expect(screen.getByText(/good/i)).toBeInTheDocument()
  })

  it('shows strong for complex password', () => {
    render(<PasswordStrengthIndicator password="Password123!" />)
    
    expect(screen.getByText(/strong/i)).toBeInTheDocument()
  })

  it('shows very strong for very complex password', () => {
    render(<PasswordStrengthIndicator password="P@ssw0rd123!Complex" />)
    
    expect(screen.getByText(/very strong/i)).toBeInTheDocument()
  })

  it('displays strength requirements', () => {
    render(<PasswordStrengthIndicator password="" />)
    
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument()
    expect(screen.getByText(/mix of uppercase and lowercase/i)).toBeInTheDocument()
    expect(screen.getByText(/include numbers/i)).toBeInTheDocument()
    expect(screen.getByText(/special characters/i)).toBeInTheDocument()
  })

  it('updates strength when password changes', () => {
    const { rerender } = render(<PasswordStrengthIndicator password="" />)
    
    expect(screen.getByText(/very weak/i)).toBeInTheDocument()
    
    rerender(<PasswordStrengthIndicator password="password123" />)
    expect(screen.getByText(/fair/i)).toBeInTheDocument()
    
    rerender(<PasswordStrengthIndicator password="Password123!" />)
    expect(screen.getByText(/strong/i)).toBeInTheDocument()
  })

  it('shows appropriate color classes for different strengths', () => {
    const { container } = render(<PasswordStrengthIndicator password="password123" />)
    
    const strengthText = screen.getByText(/fair/i)
    expect(strengthText).toHaveClass('text-yellow-600')
  })

  it('handles special characters correctly', () => {
    render(<PasswordStrengthIndicator password="Pass@word#123" />)
    
    expect(screen.getByText(/strong/i)).toBeInTheDocument()
  })

  it('handles unicode characters', () => {
    render(<PasswordStrengthIndicator password="Pässwörd123!" />)
    
    expect(screen.getByText(/strong/i)).toBeInTheDocument()
  })
})
