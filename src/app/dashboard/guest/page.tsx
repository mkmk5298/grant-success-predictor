'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { User, TrendingUp, FileText, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function GuestDashboard() {
  const [analysis, setAnalysis] = useState<any>(null)
  
  useEffect(() => {
    // Load guest analysis from session storage
    const savedAnalysis = sessionStorage.getItem('guestAnalysis')
    if (savedAnalysis) {
      setAnalysis(JSON.parse(savedAnalysis))
    }
  }, [])
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Guest Dashboard</h1>
                  <p className="text-white/70">Limited access mode</p>
                </div>
              </div>
              <Link
                href="/auth/signup"
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full hover:from-purple-700 hover:to-pink-700 transition-colors font-medium"
              >
                Create Account
              </Link>
            </div>
            
            {/* Alert */}
            <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
              <p className="text-yellow-200">
                ⚠️ You&apos;re using a guest account. Your data will be lost when you close the browser. 
                <Link href="/auth/signup" className="underline ml-2">Create an account</Link> to save your analysis.
              </p>
            </div>
          </div>
          
          {/* Analysis Results */}
          {analysis && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-8"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-6">Your Analysis Results</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold text-gray-900">Success Probability</h3>
                  </div>
                  <p className="text-3xl font-bold text-purple-600">
                    {analysis.successProbability}%
                  </p>
                </div>
                
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Matching Grants</h3>
                  </div>
                  <p className="text-3xl font-bold text-blue-600">
                    {analysis.matchingGrants?.length || 0}
                  </p>
                </div>
              </div>
              
              {/* Recommendations */}
              {analysis.recommendedActions && (
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Recommendations</h3>
                  <div className="space-y-3">
                    {analysis.recommendedActions.map((action: string, index: number) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs text-purple-600 font-bold">{index + 1}</span>
                        </div>
                        <p className="text-gray-700">{action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* CTA */}
              <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Ready to apply for grants?</h3>
                <p className="text-gray-600 mb-4">
                  Create a free account to access our full grant database and track your applications.
                </p>
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full hover:from-purple-700 hover:to-pink-700 transition-colors font-medium"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          )}
          
          {!analysis && (
            <div className="bg-white rounded-2xl p-12 text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-4">No Analysis Found</h2>
              <p className="text-gray-600 mb-6">
                Start by analyzing your grant application from the home page.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full hover:from-purple-700 hover:to-pink-700 transition-colors font-medium"
              >
                Go to Home
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}