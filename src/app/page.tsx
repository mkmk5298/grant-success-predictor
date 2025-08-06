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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Debug 환경변수
  useEffect(() => {
    console.log('🚀 Home component mounted')
    console.log('Environment variables available:', {
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? 'Set' : 'Not set',
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
    })
  }, [])

  // 버튼 클릭 핸들러들
  const handleUpgradeClick = () => {
    console.log('🎯 Upgrade button clicked')
    setShowPaymentModal(true)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📁 File input changed')
    const file = event.target.files?.[0]
    if (file) {
      console.log('✅ File selected:', file.name, 'Size:', file.size)
      setSelectedFile(file)
      processFile(file)
    }
  }

  const handleDropZoneClick = () => {
    console.log('📤 Drop zone clicked')
    fileInputRef.current?.click()
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    console.log('🎯 File dragged over')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    console.log('📥 File dropped')
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      console.log('✅ Dropped file:', file.name)
      setSelectedFile(file)
      processFile(file)
    }
  }

  const processFile = async (file: File) => {
    console.log('⚡ Processing file:', file.name)
    setUploadProgress(10)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      setUploadProgress(50)
      
      const response = await fetch('/api/v1/predictions', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        }
      })
      
      setUploadProgress(80)
      
      if (response.ok) {
        const result = await response.json()
        console.log('✅ File processed successfully:', result)
        setUploadProgress(100)
      } else {
        console.error('❌ File processing failed:', response.status, response.statusText)
        const errorText = await response.text()
        console.error('Error details:', errorText)
      }
    } catch (error) {
      console.error('💥 File processing error:', error)
    } finally {
      setTimeout(() => setUploadProgress(0), 2000)
    }
  }

  const handleAuthSuccess = (userData: any) => {
    console.log('✅ Authentication successful:', userData)
    setUser(userData)
  }

  const handleAuthError = (error: any) => {
    console.error('❌ Authentication error:', error)
  }

  const handlePaymentSuccess = () => {
    console.log('💳 Payment successful!')
    setShowPaymentModal(false)
    // 사용자 상태 업데이트 등
  }

  const handlePaymentClose = () => {
    console.log('🚪 Payment modal closed')
    setShowPaymentModal(false)
  }

  const handleFeatureClick = (feature: any) => {
    console.log('🎯 Feature clicked:', feature.title)
    // 기능별 처리 로직
  }

  const handleNavClick = (section: string) => {
    console.log('🔗 Navigation clicked:', section)
    // 네비게이션 처리
  }

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
                onClick={() => console.log('🏠 Logo clicked')}
              >
                <span className="text-2xl">💰</span>
                <span className="text-xl font-bold gradient-text">Grant Predictor</span>
              </motion.div>
              
              <div className="flex items-center gap-4">
                {!user ? (
                  <GoogleAuthButton 
                    onSuccess={handleAuthSuccess}
                    onError={handleAuthError}
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <img 
                      src={user.picture} 
                      alt={user.name}
                      className="w-8 h-8 rounded-full"
                      onClick={() => console.log('👤 User profile clicked')}
                    />
                    <span className="text-white font-medium">{user.name}</span>
                  </div>
                )}
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleUpgradeClick}
                  className="btn-pill btn-gradient text-white font-medium px-6 py-2 rounded-full"
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
              <div 
                className="border-2 border-dashed border-gray-300 rounded-donotpay p-12 text-center hover:border-purple-400 transition-colors cursor-pointer"
                onClick={handleDropZoneClick}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-semibold text-gray-700 mb-2">
                  {selectedFile ? selectedFile.name : "Drop grant proposals here or click to upload"}
                </p>
                <p className="text-sm text-gray-500">
                  Support PDF, DOC, DOCX, TXT files (Max 10MB)
                </p>
                
                {uploadProgress > 0 && (
                  <div className="mt-4">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{uploadProgress}% uploaded</p>
                  </div>
                )}
                
                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  id="fileInput"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Quick Start Form - converted from form to div */}
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
                  onClick={() => handleFeatureClick(feature)}
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
                  <button onClick={() => handleNavClick('features')} className="block hover:text-white transition-colors text-left">Features</button>
                  <button onClick={() => handleNavClick('pricing')} className="block hover:text-white transition-colors text-left">Pricing</button>
                  <button onClick={() => handleNavClick('api')} className="block hover:text-white transition-colors text-left">API</button>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-white">Resources</h4>
                <div className="space-y-2 text-sm text-white/60">
                  <button onClick={() => handleNavClick('documentation')} className="block hover:text-white transition-colors text-left">Documentation</button>
                  <button onClick={() => handleNavClick('grants')} className="block hover:text-white transition-colors text-left">Grant Database</button>
                  <button onClick={() => handleNavClick('stories')} className="block hover:text-white transition-colors text-left">Success Stories</button>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-white">Company</h4>
                <div className="space-y-2 text-sm text-white/60">
                  <button onClick={() => handleNavClick('about')} className="block hover:text-white transition-colors text-left">About</button>
                  <button onClick={() => handleNavClick('contact')} className="block hover:text-white transition-colors text-left">Contact</button>
                  <button onClick={() => handleNavClick('privacy')} className="block hover:text-white transition-colors text-left">Privacy</button>
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
          onClose={handlePaymentClose}
          onSuccess={handlePaymentSuccess}
        />
      </div>
    </div>
  )
}