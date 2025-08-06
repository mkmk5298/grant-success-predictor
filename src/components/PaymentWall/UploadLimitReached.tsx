'use client'

import { useState } from 'react'
import { X, CheckCircle, Zap, Shield, TrendingUp, FileText, Mail, Download } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface UploadLimitReachedProps {
  isOpen: boolean
  onClose?: () => void
  uploadCount?: number
  allowClose?: boolean
}

const benefits = [
  {
    icon: FileText,
    title: "Unlimited grant proposal uploads",
    description: "Upload as many proposals as you need"
  },
  {
    icon: Zap,
    title: "AI-powered improvement suggestions", 
    description: "Get detailed AI recommendations"
  },
  {
    icon: TrendingUp,
    title: "Success probability predictions",
    description: "Know your chances before applying"
  },
  {
    icon: Shield,
    title: "Detailed matching with 2M+ grants",
    description: "Find the perfect grants for your organization"
  },
  {
    icon: Zap,
    title: "Priority processing",
    description: "Faster analysis and results"
  },
  {
    icon: Download,
    title: "Export detailed reports",
    description: "PDF reports you can share and reference"
  },
  {
    icon: Mail,
    title: "Email support",
    description: "Get help when you need it"
  }
]

export default function UploadLimitReached({ 
  isOpen, 
  onClose, 
  uploadCount = 2,
  allowClose = false 
}: UploadLimitReachedProps) {
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubscribe = async () => {
    setLoading(true)
    
    try {
      const response = await fetch('/api/v1/payments/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const { sessionId } = await response.json()
      
      if (sessionId) {
        const stripe = await stripePromise
        await stripe?.redirectToCheckout({ sessionId })
      } else {
        throw new Error('Failed to create checkout session')
      }
    } catch (error) {
      console.error('Subscription error:', error)
      alert('Failed to start subscription. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 rounded-t-2xl">
          {allowClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}
          
          <div className="text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-yellow-300" />
            </div>
            <h1 className="text-3xl font-bold mb-2">
              You&apos;ve Used Your {uploadCount} Free Analyses!
            </h1>
            <p className="text-xl text-blue-100">
              Unlock Unlimited Grant Analysis for Just <span className="text-yellow-300 font-bold">$19/month</span>
            </p>
          </div>
        </div>

        {/* Benefits */}
        <div className="p-8">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-800">
            What You Get with Grant Predictor Pro
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="bg-green-100 p-2 rounded-full flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <benefit.icon className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-800">{benefit.title}</h3>
                  </div>
                  <p className="text-gray-600 text-sm">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="bg-gray-50 rounded-xl p-6 mb-8">
            <div className="text-center">
              <div className="text-yellow-400 text-2xl mb-2">⭐⭐⭐⭐⭐</div>
              <p className="text-gray-700 italic mb-4">
                &quot;Grant Predictor Pro helped us secure $150,000 in funding. The AI suggestions were incredibly detailed and actionable!&quot;
              </p>
              <div className="font-semibold text-gray-800">Sarah Johnson</div>
              <div className="text-gray-600 text-sm">Executive Director, Community Arts Foundation</div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center space-y-4">
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xl font-bold py-4 px-12 rounded-full transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none shadow-lg"
            >
              {loading ? 'Starting Subscription...' : 'Start Unlimited Access - $19/month'}
            </button>
            
            <div className="text-sm text-gray-500">
              Cancel anytime • No long-term commitment • 30-day money-back guarantee
            </div>
            
            {allowClose && (
              <div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 text-sm underline"
                >
                  Maybe later
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}