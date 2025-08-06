"use client"

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'

interface GoogleUser {
  id: string
  email: string
  name: string
  picture: string
  verified_email: boolean
}

interface AuthResponse {
  success: boolean
  data?: {
    user: GoogleUser
    sessionToken: string
    expiresAt: string
  }
  error?: {
    message: string
    code?: string
  }
  message?: string
}

interface GoogleAuthButtonProps {
  onSuccess?: (user: GoogleUser, sessionToken: string) => void
  onError?: (error: string) => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function GoogleAuthButton({ 
  onSuccess, 
  onError, 
  disabled = false,
  size = 'md'
}: GoogleAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleSignIn = useCallback(async () => {
    if (isLoading || disabled) return

    setIsLoading(true)
    
    try {
      
      // For demo: Mock authentication with API call structure
      const response = await fetch('/api/v1/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: 'mock-google-token-for-demo'
        }),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })
      
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data: AuthResponse = await response.json()
      
      if (data.success && data.data) {
        onSuccess?.(data.data.user, data.data.sessionToken)
      } else {
        const errorMessage = data.error?.message || data.message || 'Authentication failed'
        console.error('❌ Authentication failed:', data.error || data.message)
        onError?.(errorMessage)
      }
      
    } catch (error) {
      console.error('💥 Google sign-in error:', error)
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Google sign-in failed. Please try again.'
      onError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, disabled, onSuccess, onError])

  const sizeClasses = {
    sm: 'h-10 px-4 text-sm',
    md: 'h-12 px-6 text-base',
    lg: 'h-14 px-8 text-lg'
  }

  const iconSize = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5', 
    lg: 'w-6 h-6'
  }

  return (
    <motion.button
      whileHover={!disabled && !isLoading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !isLoading ? { scale: 0.98 } : {}}
      onClick={handleGoogleSignIn}
      disabled={isLoading || disabled}
      type="button"
      aria-describedby={isLoading ? 'google-auth-loading' : undefined}
      className={`
        ${sizeClasses[size]}
        bg-white text-gray-900 hover:bg-gray-50 
        disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
        border border-gray-300 hover:border-gray-400 disabled:border-gray-200
        rounded-lg font-medium transition-all duration-200
        flex items-center justify-center gap-2
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        shadow-sm hover:shadow-md disabled:shadow-none
      `}
    >
      {isLoading ? (
        <>
          <div 
            className={`${iconSize[size]} border-2 border-gray-400 border-t-transparent rounded-full animate-spin`} 
            aria-hidden="true"
          />
          <span id="google-auth-loading">Signing in...</span>
        </>
      ) : (
        <>
          <svg 
            className={iconSize[size]} 
            viewBox="0 0 24 24"
            aria-label="Google logo"
          >
            <path
              fill="#4285f4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34a853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#fbbc05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#ea4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>Sign in with Google</span>
        </>
      )}
    </motion.button>
  )
}