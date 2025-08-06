"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Zap, BarChart3, Clock, Shield } from 'lucide-react'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function PaymentModal({ isOpen, onClose, onSuccess }: PaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSubscribe = async () => {
    setIsProcessing(true)
    
    try {
      const response = await fetch('/api/v1/payments/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: 'price_grant_predictor_pro',
          customerId: null, // Will be created if needed
          paymentMethodId: null // Mock payment method
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        onSuccess?.()
        onClose()
      } else {
        console.error('Payment failed:', data.error)
      }
      
      setIsProcessing(false)
    } catch (error) {
      console.error('Payment processing error:', error)
      setIsProcessing(false)
    }
  }

  const features = [
    { icon: Zap, text: "Unlimited grant matching" },
    { icon: BarChart3, text: "AI success predictions" },
    { icon: Clock, text: "Priority processing" },
    { icon: Shield, text: "Advanced analytics" },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-donotpay-lg p-8 max-w-md w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>

            {/* Header */}
            <div className="text-center space-y-4 mb-8">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Upgrade to Grant Predictor Pro
                </h2>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl font-bold text-gray-900">$36</span>
                  <span className="text-gray-600">/ 3 months</span>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-4 mb-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.text}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <feature.icon className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-gray-700 font-medium">{feature.text}</span>
                </motion.div>
              ))}
            </div>

            {/* CTA Button */}
            <button
              onClick={handleSubscribe}
              disabled={isProcessing}
              className="w-full btn-pill btn-gradient text-white font-semibold h-12 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Subscribe Now
                </>
              )}
            </button>

            {/* Footer */}
            <p className="text-xs text-gray-500 text-center mt-4">
              Secure payment powered by Stripe. Cancel anytime.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}