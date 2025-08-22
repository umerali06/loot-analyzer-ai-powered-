'use client'

import React from 'react'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface PasswordStrengthIndicatorProps {
  validation: {
    isValid: boolean
    score: number
    errors: string[]
    warnings: string[]
  }
}



export default function PasswordStrengthIndicator({ validation }: PasswordStrengthIndicatorProps) {
  const getStrengthColor = (score: number): string => {
    if (score <= 2) return 'text-red-600'
    if (score <= 3) return 'text-orange-600'
    if (score <= 4) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getStrengthText = (score: number): string => {
    if (score <= 2) return 'Weak'
    if (score <= 3) return 'Fair'
    if (score <= 4) return 'Good'
    return 'Strong'
  }

  const getStrengthBarColor = (score: number): string => {
    if (score <= 2) return 'bg-red-500'
    if (score <= 3) return 'bg-orange-500'
    if (score <= 4) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const strengthScore = validation.score
  const strengthPercentage = (strengthScore / 5) * 100

  if (strengthScore === 0) return null

  return (
    <div className="mt-3 space-y-3">
      {/* Strength Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Password Strength</span>
          <span className={`text-sm font-semibold ${getStrengthColor(strengthScore)}`}>
            {getStrengthText(strengthScore)}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getStrengthBarColor(strengthScore)}`}
            style={{ width: `${strengthPercentage}%` }}
          />
        </div>
      </div>

      {/* Validation Messages */}
      {validation.errors.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-red-700">Issues to fix:</h4>
          {validation.errors.map((error, index) => (
            <div key={index} className="flex items-center space-x-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          ))}
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-yellow-700">Suggestions:</h4>
          {validation.warnings.map((warning, index) => (
            <div key={index} className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-700">{warning}</span>
            </div>
          ))}
        </div>
      )}

             {/* Tips */}
       {strengthScore < 4 && (
         <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
           <div className="flex items-start space-x-2">
             <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
             <div className="text-sm text-blue-800">
               <p className="font-medium mb-1">Tips for a stronger password:</p>
               <ul className="space-y-1 text-xs">
                 <li>• Make it at least 8 characters long</li>
                 <li>• Include uppercase letters (A-Z)</li>
                 <li>• Include lowercase letters (a-z)</li>
                 <li>• Include numbers (0-9)</li>
                 <li>• Include special characters (!@#$%^&*)</li>
               </ul>
             </div>
           </div>
         </div>
       )}
    </div>
  )
}
