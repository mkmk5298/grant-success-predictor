"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Sparkles, TrendingUp, Target, Database, Brain, Rocket, Upload } from "lucide-react"
import DropInAnalyzer from "@/components/DropInAnalyzer"
import GoogleAuthButton from "@/components/GoogleAuthButton"
import PaymentModal from "@/components/PaymentModal"

// Feature cards
const features = [
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    description: "Advanced machine learning algorithms analyze your grant potential in real-time"
  },
  {
    icon: Target,
    title: "Perfect Grant Matching",
    description: "Find the most relevant grants based on your organization profile and needs"
  },
  {
    icon: TrendingUp,
    title: "Success Prediction",
    description: "Get accurate probability scores based on historical data and grant patterns"
  },
  {
    icon: Database,
    title: "Comprehensive Database",
    description: "Access to 50,000+ grants from federal, state, and private foundations"
  }
]

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  return (
    <div className="relative min-h-screen overflow-hidden animated-bg">
      {/* Content */}
      <div className="relative z-10">
        {/* DoNotPay-style Header */}
        <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/20">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3"
              >
                <span className="text-2xl">💰</span>
                <span className="text-xl font-bold gradient-text">Grant Predictor</span>
              </motion.div>
              
              <div className="flex items-center gap-4">
                {!user ? (
                  <GoogleAuthButton 
                    onSuccess={setUser}
                    onError={(error) => console.error(error)}
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <img 
                      src={user.picture} 
                      alt={user.name}
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="text-white font-medium">{user.name}</span>
                  </div>
                )}
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowPaymentModal(true)}
                  className="btn-pill btn-gradient text-white font-medium"
                >
                  Upgrade to Pro
                </motion.button>
              </div>
            </div>
          </div>
        </header>

        {/* Chat Interface Hero */}
        <section className="pt-32 pb-12 px-6">
          <div className="container mx-auto max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center space-y-6 mb-12"
            >
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                <span className="gradient-text">AI Grant Assistant</span>
              </h1>
              
              <p className="text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
                Find perfect grants, predict success rates, and maximize your funding opportunities
              </p>
            </motion.div>

            {/* Chat Interface Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-donotpay-lg p-8 shadow-2xl"
            >
              {/* Welcome Message */}
              <div className="mb-8 p-6 bg-gray-50 rounded-donotpay">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                    AI
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-800 leading-relaxed">
                      👋 Welcome! I'm your AI Grant Assistant. I analyze 2+ million federal grants, 
                      foundation opportunities, and research funding to help you find perfect matches 
                      and predict success rates. Upload your grant documents or ask me anything!
                    </p>
                  </div>
                </div>
              </div>

              {/* Drop Zone */}
              <div className="border-2 border-dashed border-gray-300 rounded-donotpay p-12 text-center hover:border-purple-400 transition-colors cursor-pointer">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-semibold text-gray-700 mb-2">
                  Drop grant proposals here or click to upload
                </p>
                <p className="text-sm text-gray-500">
                  Support PDF, DOC, DOCX, TXT files (Max 10MB)
                </p>
              </div>

              {/* Quick Start Form */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <DropInAnalyzer />
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-6">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center space-y-8 mb-16"
            >
              <h2 className="text-4xl font-bold gradient-text">
                Why Choose GrantPredictor?
              </h2>
              <p className="text-xl text-white/70 max-w-2xl mx-auto">
                Cutting-edge technology meets grant expertise to give you the ultimate advantage in securing funding.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="glass rounded-2xl p-6 text-center space-y-4 group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center mx-auto group-hover:shadow-lg group-hover:shadow-blue-500/25 transition-all">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                  <p className="text-white/70 text-sm leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 bg-black/20 backdrop-blur-xl">
          <div className="container mx-auto px-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                    <Rocket className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-bold gradient-text">GrantPredictor</span>
                </div>
                <p className="text-white/60 text-sm">
                  AI-powered grant success prediction platform helping organizations secure funding faster.
                </p>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-white">Platform</h4>
                <div className="space-y-2 text-sm text-white/60">
                  <a href="#" className="block hover:text-white transition-colors">Features</a>
                  <a href="#" className="block hover:text-white transition-colors">Pricing</a>
                  <a href="#" className="block hover:text-white transition-colors">API</a>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-white">Resources</h4>
                <div className="space-y-2 text-sm text-white/60">
                  <a href="#" className="block hover:text-white transition-colors">Documentation</a>
                  <a href="#" className="block hover:text-white transition-colors">Grant Database</a>
                  <a href="#" className="block hover:text-white transition-colors">Success Stories</a>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-white">Company</h4>
                <div className="space-y-2 text-sm text-white/60">
                  <a href="#" className="block hover:text-white transition-colors">About</a>
                  <a href="#" className="block hover:text-white transition-colors">Contact</a>
                  <a href="#" className="block hover:text-white transition-colors">Privacy</a>
                </div>
              </div>
            </div>
            
            <div className="border-t border-white/10 mt-12 pt-8 text-center text-white/60 text-sm">
              © 2025 GrantPredictor. All rights reserved.
            </div>
          </div>
        </footer>

        {/* Payment Modal */}
        <PaymentModal 
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            // Handle successful payment
            console.log('Payment successful!')
          }}
        />
      </div>
    </div>
  )
}
