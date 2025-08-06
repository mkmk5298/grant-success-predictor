"use client"

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Zap, BarChart3, Clock, Shield, AlertCircle } from 'lucide-react'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface PaymentError {
  message: string
  code?: string
}

interface PaymentResponse {
  success: boolean
  data?: {
    subscription: any
    client_secret: string
    expiresAt: string
  }
  error?: PaymentError
  message?: string
}

export default function PaymentModal({ isOpen, onClose, onSuccess }: PaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Get subscription price from environment variable
  const subscriptionPrice = process.env.NEXT_PUBLIC_SUBSCRIPTION_PRICE || '19'

  const handleSubscribe = useCallback(async () => {
    if (isProcessing) return

    setIsProcessing(true)
    setError(null)
    
    try {
      // Call the Stripe checkout endpoint
      const response = await fetch('/api/v1/payments/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add user headers if available from local storage or context
          'x-user-id': localStorage.getItem('userId') || '',
          'x-user-email': localStorage.getItem('userEmail') || '',
          'x-session-id': localStorage.getItem('sessionId') || ''
        },
        signal: AbortSignal.timeout(30000) // 30 second timeout
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url
      } else if (data.sessionId) {
        // Alternative: Use Stripe.js to redirect (if loaded)
        const stripe = (window as any).Stripe
        if (stripe && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
          const stripeInstance = stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
          const { error } = await stripeInstance.redirectToCheckout({ sessionId: data.sessionId })
          if (error) {
            throw new Error(error.message)
          }
        } else {
          throw new Error('Stripe checkout URL not provided')
        }
      } else {
        throw new Error('Invalid response from payment server')
      }
      
    } catch (error) {
      // Payment processing error
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred during payment processing'
      setError(errorMessage)
      setIsProcessing(false)
    }
  }, [isProcessing])

  const handleCloseClick = useCallback(() => {
    if (isProcessing) return
    setError(null)
    onClose()
  }, [isProcessing, onClose])

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCloseClick()
    }
  }, [handleCloseClick])

  const features = useMemo(() => [
    { icon: Zap, text: "Unlimited grant matching" },
    { icon: BarChart3, text: "AI success predictions" },
    { icon: Clock, text: "Priority processing" },
    { icon: Shield, text: "Advanced analytics" },
  ], [])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-modal-title"
          aria-describedby="payment-modal-description"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={handleCloseClick}
              disabled={isProcessing}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              aria-label="Close payment modal"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>

            {/* Header */}
            <div className="text-center space-y-4 mb-8">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-2xl" role="img" aria-label="Money bag">💰</span>
              </div>
              <div>
                <h2 id="payment-modal-title" className="text-2xl font-bold text-gray-900 mb-2">
                  Upgrade to Grant Predictor Pro
                </h2>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl font-bold text-gray-900">${subscriptionPrice}</span>
                  <span className="text-gray-600">/ month</span>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-red-800">Payment Failed</h3>
                    <p className="text-red-700 text-sm mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Features */}
            <div id="payment-modal-description" className="space-y-4 mb-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.text}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <feature.icon className="w-4 h-4 text-green-600" aria-hidden="true" />
                  </div>
                  <span className="text-gray-700 font-medium">{feature.text}</span>
                </motion.div>
              ))}
            </div>

            {/* CTA Button */}
            <button
              onClick={handleSubscribe}
              disabled={isProcessing}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold h-12 rounded-lg flex items-center justify-center gap-2 disabled:cursor-not-allowed transition-all duration-200"
              type="button"
              aria-describedby={error ? 'payment-error' : undefined}
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" aria-hidden="true" />
                  Subscribe Now
                </>
              )}
            </button>

            {/* Footer */}
            <p className="text-xs text-gray-500 text-center mt-4">
              🔒 Secure payment powered by Stripe. Cancel anytime.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}