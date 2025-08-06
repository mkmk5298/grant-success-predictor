'use client'

import { useState, useEffect } from 'react'
import { Crown, Calendar, CreditCard, Zap, Users, FileText, TrendingUp, AlertCircle } from 'lucide-react'

interface SubscriptionDashboardProps {
  userId: string
  userEmail: string
}

interface UserStats {
  uploadCount: number
  totalAnalyses: number
  subscriptionStatus: 'free' | 'active' | 'cancelled' | 'expired'
  subscriptionEnd?: string
  plan: 'free' | 'pro'
}

export default function SubscriptionDashboard({ userId, userEmail }: SubscriptionDashboardProps) {
  const [stats, setStats] = useState<UserStats>({
    uploadCount: 0,
    totalAnalyses: 0,
    subscriptionStatus: 'free',
    plan: 'free'
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUserStats()
  }, [userId])

  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/v1/users/stats', {
        headers: {
          'x-user-id': userId,
          'x-user-email': userEmail
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (confirm('Are you sure you want to cancel your subscription? You will lose access to unlimited analyses at the end of your billing period.')) {
      try {
        const response = await fetch('/api/v1/subscriptions/cancel', {
          method: 'POST',
          headers: {
            'x-user-id': userId,
            'x-user-email': userEmail
          }
        })

        if (response.ok) {
          alert('Subscription cancelled successfully. You will retain access until your current period ends.')
          fetchUserStats()
        } else {
          alert('Failed to cancel subscription. Please try again or contact support.')
        }
      } catch (error) {
        alert('Failed to cancel subscription. Please try again or contact support.')
      }
    }
  }

  const handleUpgradeToPro = async () => {
    try {
      const response = await fetch('/api/v1/payments/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'x-user-email': userEmail
        }
      })

      const data = await response.json()
      if (data.sessionId) {
        // Redirect to Stripe Checkout
        const stripe = await import('@stripe/stripe-js').then(mod => 
          mod.loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
        )
        await stripe?.redirectToCheckout({ sessionId: data.sessionId })
      }
    } catch (error) {
      alert('Failed to start subscription. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-xl mb-6"></div>
          <div className="grid md:grid-cols-3 gap-6">
            {[1,2,3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const isPro = stats.subscriptionStatus === 'active'
  const isCancelled = stats.subscriptionStatus === 'cancelled'
  const isExpired = stats.subscriptionStatus === 'expired'

  return (
    <div className="space-y-6">
      {/* Subscription Status Card */}
      <div className={`rounded-xl p-8 ${
        isPro ? 'bg-gradient-to-r from-purple-500 to-blue-600 text-white' :
        isCancelled ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white' :
        isExpired ? 'bg-gradient-to-r from-gray-500 to-gray-600 text-white' :
        'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {isPro ? (
              <Crown className="w-12 h-12 text-yellow-300" />
            ) : (
              <Users className="w-12 h-12" />
            )}
            <div>
              <h2 className="text-3xl font-bold">
                {isPro ? 'Grant Predictor Pro' : 'Free Account'}
              </h2>
              <p className="text-lg opacity-90">
                {isPro ? 'Unlimited access to all features' :
                 isCancelled ? 'Subscription cancelled - expires soon' :
                 isExpired ? 'Subscription expired' :
                 'Limited to 2 free analyses'}
              </p>
            </div>
          </div>

          <div className="text-right">
            {isPro && stats.subscriptionEnd && (
              <div>
                <div className="text-sm opacity-75">Renews on</div>
                <div className="text-xl font-semibold">
                  {new Date(stats.subscriptionEnd).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Usage Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Current Period</p>
              <p className="text-3xl font-bold text-gray-900">
                {isPro ? stats.totalAnalyses : `${stats.uploadCount}/2`}
              </p>
              <p className="text-sm text-gray-500">
                {isPro ? 'Analyses used' : 'Free analyses'}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Analyses</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalAnalyses}</p>
              <p className="text-sm text-gray-500">All time</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-3xl font-bold text-gray-900">73%</p>
              <p className="text-sm text-gray-500">Average probability</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      {!isPro ? (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-8 border border-blue-200">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Crown className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">Upgrade to Pro</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Get unlimited grant analyses, AI recommendations, and access to our complete grant database.
            </p>
            <div className="text-4xl font-bold text-blue-600">$19/month</div>
            <button
              onClick={handleUpgradeToPro}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors"
            >
              Upgrade Now
            </button>
            <div className="text-sm text-gray-500">
              Cancel anytime • 30-day money-back guarantee
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-8 border border-gray-200">
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Subscription Management
            </h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Plan</p>
                <p className="text-lg font-semibold">Grant Predictor Pro - $19/month</p>
              </div>
              
              {stats.subscriptionEnd && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">
                    {isCancelled ? 'Expires on' : 'Next billing date'}
                  </p>
                  <p className="text-lg font-semibold">
                    {new Date(stats.subscriptionEnd).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {isCancelled && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-orange-700">
                  <AlertCircle className="w-5 h-5" />
                  <p className="font-medium">Subscription Cancelled</p>
                </div>
                <p className="text-sm text-orange-600 mt-1">
                  Your subscription will end on {stats.subscriptionEnd && new Date(stats.subscriptionEnd).toLocaleDateString()}. 
                  You can reactivate anytime before this date.
                </p>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors">
                View Billing History
              </button>
              {!isCancelled && (
                <button
                  onClick={handleCancelSubscription}
                  className="text-red-600 hover:text-red-700 px-6 py-2 font-medium transition-colors"
                >
                  Cancel Subscription
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pro Features */}
      {isPro && (
        <div className="bg-white rounded-xl p-8 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Your Pro Benefits</h3>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: FileText, title: "Unlimited Uploads", description: "Upload and analyze as many grant proposals as you need" },
              { icon: Zap, title: "AI Recommendations", description: "Get detailed AI-powered improvement suggestions" },
              { icon: TrendingUp, title: "Success Predictions", description: "Advanced probability calculations for your proposals" },
              { icon: Users, title: "Grant Database", description: "Access to 2M+ grants with detailed matching" },
              { icon: Calendar, title: "Priority Processing", description: "Faster analysis and priority support" },
              { icon: CreditCard, title: "Export Reports", description: "Download detailed PDF reports to share" }
            ].map((benefit, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="bg-green-100 p-2 rounded-lg flex-shrink-0">
                  <benefit.icon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{benefit.title}</h4>
                  <p className="text-sm text-gray-600">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}