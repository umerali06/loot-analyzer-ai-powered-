/**
 * Password Security Configuration
 * This file contains configurable settings for password requirements and validation
 */

export const PASSWORD_CONFIG = {
  // Length requirements
  minLength: 8,
  maxLength: 128,
  recommendedLength: 12,

  // Character requirements
  requireUppercase: false,
  requireLowercase: true,
  requireNumbers: false,
  requireSpecialChars: false,

  // Scoring weights
  scoring: {
    length: {
      min: 1,
      recommended: 2,
      max: 3
    },
    characterTypes: {
      uppercase: 1,
      lowercase: 1,
      numbers: 1,
      specialChars: 1,
      unicode: 1
    },
    penalties: {
      repeatingChars: -1,
      sequentialChars: -1,
      keyboardPatterns: -2,
      commonWords: -2,
      lowEntropy: -1
    }
  },

  // Common passwords to avoid
  commonPasswords: [
    'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
    'admin', 'letmein', 'welcome', 'monkey', 'dragon', 'master', 'hello',
    'login', 'passw0rd', 'admin123', 'user', 'test', 'guest', 'demo',
    '12345678', 'qwerty123', 'password1', '123123', 'admin1', 'root',
    'administrator', 'user123', 'test123', 'guest123', 'demo123'
  ],

  // Keyboard patterns to avoid
  keyboardPatterns: [
    'qwerty', 'asdfgh', 'zxcvbn', '123456', '654321', 'qazwsx',
    'edcrfv', 'tgbyhn', 'ujmikl', 'plokij', 'mnbvcx', 'lkjhgf'
  ],

  // Sequential patterns to avoid
  sequentialPatterns: [
    'abc', 'bcd', 'cde', 'def', 'efg', 'fgh', 'ghi', 'hij', 'ijk', 'jkl',
    'klm', 'lmn', 'mno', 'nop', 'opq', 'pqr', 'qrs', 'rst', 'stu', 'tuv',
    'uvw', 'vwx', 'wxy', 'xyz', '123', '234', '345', '456', '567', '678',
    '789', '012', '321', '432', '543', '654', '765', '876', '987', '210'
  ],

  // Salt rounds for bcrypt (higher = more secure but slower)
  bcryptSaltRounds: 12,

  // Rate limiting for password attempts
  rateLimit: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    lockoutDuration: 30 * 60 * 1000 // 30 minutes
  },

  // Password history (prevent reuse of recent passwords)
  passwordHistory: {
    enabled: true,
    maxHistory: 5
  },

  // Expiration policy
  expiration: {
    enabled: true,
    daysUntilExpiry: 90, // 3 months
    warningDays: 14 // Show warning 2 weeks before expiry
  }
}

/**
 * Get password strength thresholds
 */
export const getPasswordStrengthThresholds = () => ({
  weak: 3,
  medium: 6,
  strong: 8
})

/**
 * Get password requirements text for UI display
 */
export const getPasswordRequirements = () => [
  `At least ${PASSWORD_CONFIG.minLength} characters long`,
  'Contains lowercase letters (a-z)',
  'Recommended: Mix of uppercase, numbers, and symbols',
  'Avoid common words or patterns',
  'No sequential characters (abc, 123)',
  'No repeating characters (aaa)'
]

/**
 * Get password security tips
 */
export const getPasswordSecurityTips = () => [
  'Use a mix of uppercase, lowercase, numbers, and symbols',
  'Avoid common words and patterns',
  'Make it at least 12 characters long',
  'Consider using a passphrase instead',
  'Don\'t reuse passwords across accounts',
  'Use a password manager for better security',
  'Change passwords regularly',
  'Never share your password with anyone'
]
