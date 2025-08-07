"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react"
import dynamic from 'next/dynamic'
import { motion } from "framer-motion"
import { Sparkles, TrendingUp, Target, Database, Brain, Rocket, Upload, AlertCircle, CheckCircle } from "lucide-react"
import GoogleAuthButton from "@/components/GoogleAuthButton"
import UploadCounter from "@/components/UploadCounter"
import PredictionResults from "@/components/PredictionResults"
import DocumentEnhancer from "@/components/DocumentEnhancer"

// Dynamically import heavy components
const DropInAnalyzer = dynamic(
  () => import("@/components/DropInAnalyzer"),
  { loading: () => <div className="animate-pulse bg-gray-100 rounded-lg h-96"></div> }
)

const PaymentModal = dynamic(
  () => import("@/components/PaymentModal"),
  { ssr: false }
)

// Types
interface GoogleUser {
  id: string
  email: string
  name: string
  picture: string
  verified_email: boolean
}

interface FileUploadState {
  file: File | null
  progress: number
  status: 'idle' | 'uploading' | 'success' | 'error'
  error?: string
}

interface AppState {
  user: GoogleUser | null
  sessionToken: string | null
  showPaymentModal: boolean
  fileUpload: FileUploadState
  predictionResult: any | null
  showEnhancer: boolean
  uploadedFileData: any | null
}

// Feature cards - memoized
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
] as const

// File validation constants
const ALLOWED_FILE_TYPES = ['.pdf', '.doc', '.docx', '.txt'] as const
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const UPLOAD_TIMEOUT = 30000 // 30 seconds

export default function Home() {
  // State management with proper typing
  const [state, setState] = useState<AppState>({
    user: null,
    sessionToken: null,
    showPaymentModal: false,
    fileUpload: {
      file: null,
      progress: 0,
      status: 'idle',
      error: undefined
    },
    predictionResult: null,
    showEnhancer: false,
    uploadedFileData: null
  })
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadAbortController = useRef<AbortController | null>(null)
  
  // Environment validation (server-side only for production)
  useEffect(() => {
    // Only check environment in development mode for debugging
    if (process.env.NODE_ENV === 'development') {
      const hasRequiredEnvVars = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
      if (!hasRequiredEnvVars) {
        console.warn('⚠️ Missing required environment variables for full functionality')
      }
    }

    // Cleanup on unmount
    return () => {
      if (uploadAbortController.current) {
        uploadAbortController.current.abort()
      }
    }
  }, [])

  // File validation helper with comprehensive security checks
  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB. Current size: ${(file.size / 1024 / 1024).toFixed(1)}MB`
      }
    }

    // Check minimum file size (prevent empty files)
    if (file.size < 100) { // 100 bytes minimum
      return {
        valid: false,
        error: 'File is too small or empty. Please select a valid document.'
      }
    }

    // Check file extension
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_FILE_TYPES.includes(fileExtension as any)) {
      return {
        valid: false,
        error: `File type not supported. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`
      }
    }

    // Check MIME type (more reliable than extension)
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]
    
    if (!allowedMimeTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File MIME type not supported. Detected type: ${file.type}`
      }
    }

    // Validate file name (prevent path traversal and malicious names)
    const fileName = file.name
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return {
        valid: false,
        error: 'File name contains invalid characters'
      }
    }

    // Check for suspicious file names
    const suspiciousPatterns = [
      /\.exe$/i, /\.bat$/i, /\.cmd$/i, /\.com$/i, /\.scr$/i, 
      /\.pif$/i, /\.js$/i, /\.vbs$/i, /\.jar$/i, /\.php$/i
    ]
    
    if (suspiciousPatterns.some(pattern => pattern.test(fileName))) {
      return {
        valid: false,
        error: 'File type is not allowed for security reasons'
      }
    }

    return { valid: true }
  }, [])

  // Optimized event handlers with proper error handling
  const handleUpgradeClick = useCallback(() => {
    setState(prev => ({ ...prev, showPaymentModal: true }))
  }, [])

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    
    if (file) {
      
      const validation = validateFile(file)
      if (!validation.valid) {
        setState(prev => ({
          ...prev,
          fileUpload: {
            ...prev.fileUpload,
            status: 'error',
            error: validation.error
          }
        }))
        return
      }
      
      setState(prev => ({
        ...prev,
        fileUpload: {
          file,
          progress: 0,
          status: 'idle',
          error: undefined
        }
      }))
      
      processFile(file)
    }

    // Reset input for repeated uploads of same file
    event.target.value = ''
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validateFile])

  const handleDropZoneClick = useCallback(() => {
    if (state.fileUpload.status === 'uploading') return
    fileInputRef.current?.click()
  }, [state.fileUpload.status])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Visual feedback could be added here
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (state.fileUpload.status === 'uploading') return
    
    const files = e.dataTransfer.files
    
    if (files.length > 0) {
      const file = files[0]
      
      const validation = validateFile(file)
      if (!validation.valid) {
        setState(prev => ({
          ...prev,
          fileUpload: {
            ...prev.fileUpload,
            status: 'error',
            error: validation.error
          }
        }))
        return
      }
      
      setState(prev => ({
        ...prev,
        fileUpload: {
          file,
          progress: 0,
          status: 'idle',
          error: undefined
        }
      }))
      
      processFile(file)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.fileUpload.status, validateFile])

  const processFile = useCallback(async (file: File) => {
    
    // Cancel any existing upload
    if (uploadAbortController.current) {
      uploadAbortController.current.abort()
    }
    
    // Create new abort controller
    uploadAbortController.current = new AbortController()
    
    setState(prev => ({
      ...prev,
      fileUpload: {
        ...prev.fileUpload,
        status: 'uploading',
        progress: 10,
        error: undefined
      }
    }))
    
    try {
      // Convert file to base64 for JSON transmission
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      
      setState(prev => ({
        ...prev,
        fileUpload: { ...prev.fileUpload, progress: 30 }
      }))
      
      // Create mock prediction data based on file analysis
      const mockPredictionData = {
        organizationName: file.name.replace(/\.[^/.]+$/, ''), // Use filename as org name
        organizationType: 'nonprofit', // Default type
        fundingAmount: 100000, // Default amount
        experienceLevel: 'intermediate', // Default experience
        hasPartnership: false,
        hasPreviousGrants: false,
        fileData: {
          name: file.name,
          size: file.size,
          type: file.type,
          content: fileBase64.split(',')[1] // Remove data:mime;base64, prefix
        }
      }
      
      const response = await fetch('/api/v1/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(mockPredictionData),
        signal: AbortSignal.timeout(UPLOAD_TIMEOUT)
      })
      
      setState(prev => ({
        ...prev,
        fileUpload: { ...prev.fileUpload, progress: 70 }
      }))
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: { message: `HTTP ${response.status}: ${response.statusText}` }
        }))
        throw new Error(errorData.error?.message || `Upload failed with status ${response.status}`)
      }
      
      const result = await response.json()
      
      // Store the prediction result and file data for enhancement
      setState(prev => ({
        ...prev,
        fileUpload: {
          ...prev.fileUpload,
          status: 'success',
          progress: 100,
          error: undefined
        },
        predictionResult: result.data || result, // Store the prediction data
        uploadedFileData: {
          name: file.name,
          content: fileBase64.split(',')[1], // Store base64 without prefix
          type: file.type,
          size: file.size
        }
      }))
      
      // Reset progress after success display
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          fileUpload: { ...prev.fileUpload, progress: 0, status: 'idle' }
        }))
      }, 3000)
      
    } catch (error) {
      // Log error for debugging (removed console.error for production)
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred during file processing'
        
      setState(prev => ({
        ...prev,
        fileUpload: {
          ...prev.fileUpload,
          status: 'error',
          progress: 0,
          error: errorMessage
        }
      }))
    }
  }, [])

  const handleAuthSuccess = useCallback((user: GoogleUser, sessionToken: string) => {
    
    setState(prev => ({
      ...prev,
      user,
      sessionToken
    }))
  }, [])

  const handleAuthError = useCallback((error: string) => {
    // Log authentication error (removed console.error for production)
    // Could show toast notification here
  }, [])

  const handlePaymentSuccess = useCallback(() => {
    setState(prev => ({
      ...prev,
      showPaymentModal: false
    }))
    // Could update user's subscription status here
  }, [])

  const handlePaymentClose = useCallback(() => {
    setState(prev => ({
      ...prev,
      showPaymentModal: false
    }))
  }, [])

  const handleFeatureClick = useCallback((feature: any) => {
    // Could navigate to feature-specific page or show detailed info
  }, [])

  const handleNavClick = useCallback((section: string) => {
    // Could implement smooth scrolling or navigation
  }, [])

  // Memoized computed values
  const isUploading = useMemo(() => state.fileUpload.status === 'uploading', [state.fileUpload.status])
  const hasUploadError = useMemo(() => state.fileUpload.status === 'error', [state.fileUpload.status])
  const hasUploadSuccess = useMemo(() => state.fileUpload.status === 'success', [state.fileUpload.status])

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
                onClick={() => {}}
              >
                <span className="text-2xl">💰</span>
                <span className="text-xl font-bold gradient-text">Grant Predictor</span>
              </motion.div>
              
              <div className="flex items-center gap-4">
                {!state.user ? (
                  <GoogleAuthButton 
                    onSuccess={handleAuthSuccess}
                    onError={handleAuthError}
                    size="sm"
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {}}
                      className="flex items-center gap-3 p-1 rounded-lg hover:bg-white/10 transition-colors"
                      aria-label={`User profile: ${state.user.name}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={state.user.picture} 
                        alt={`${state.user.name}'s profile picture`}
                        className="w-8 h-8 rounded-full ring-2 ring-white/20"
                        loading="lazy"
                      />
                      <span className="text-white font-medium">{state.user.name}</span>
                    </button>
                  </div>
                )}
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleUpgradeClick}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium px-6 py-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-transparent"
                  type="button"
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
                      👋 Welcome! I&apos;m your AI Grant Assistant. I analyze 2+ million federal grants, 
                      foundation opportunities, and research funding to help you find perfect matches 
                      and predict success rates. Upload your grant documents or ask me anything!
                    </p>
                  </div>
                </div>
              </div>

              {/* Upload Counter - CRITICAL: Show free uploads remaining */}
              <UploadCounter 
                userId={state.user?.id}
                userEmail={state.user?.email}
                isSubscribed={false}
                onLimitReached={() => setState(prev => ({ ...prev, showPaymentModal: true }))}
              />

              {/* Drop Zone */}
              <div 
                className={`
                  border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200
                  ${hasUploadError ? 'border-red-300 bg-red-50' : 
                    hasUploadSuccess ? 'border-green-300 bg-green-50' :
                    isUploading ? 'border-purple-400 bg-purple-50' :
                    'border-gray-300 hover:border-purple-400 cursor-pointer'}
                `}
                onClick={handleDropZoneClick}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                aria-describedby="upload-instructions"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleDropZoneClick()
                  }
                }}
              >
                {hasUploadError ? (
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                ) : hasUploadSuccess ? (
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                ) : (
                  <Upload 
                    className={`w-12 h-12 mx-auto mb-4 ${isUploading ? 'text-purple-500 animate-pulse' : 'text-gray-400'}`} 
                  />
                )}
                
                <div className="space-y-2">
                  <p className={`text-lg font-semibold mb-2 ${
                    hasUploadError ? 'text-red-700' :
                    hasUploadSuccess ? 'text-green-700' :
                    isUploading ? 'text-purple-700' :
                    'text-gray-700'
                  }`}>
                    {hasUploadError ? 'Upload Failed' :
                     hasUploadSuccess ? 'Upload Successful' :
                     isUploading ? 'Processing...' :
                     state.fileUpload.file ? state.fileUpload.file.name : 
                     "Drop grant proposals here or click to upload"}
                  </p>
                  
                  <p id="upload-instructions" className="text-sm text-gray-500">
                    {hasUploadError && state.fileUpload.error ? (
                      <span className="text-red-600">{state.fileUpload.error}</span>
                    ) : (
                      `Support ${ALLOWED_FILE_TYPES.join(', ')} files (Max ${MAX_FILE_SIZE / 1024 / 1024}MB)`
                    )}
                  </p>
                </div>
                
                {state.fileUpload.progress > 0 && (
                  <div className="mt-4" role="progressbar" aria-valuenow={state.fileUpload.progress} aria-valuemin={0} aria-valuemax={100}>
                    <div className="bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          hasUploadError ? 'bg-red-500' :
                          hasUploadSuccess ? 'bg-green-500' :
                          'bg-purple-600'
                        }`}
                        style={{ width: `${state.fileUpload.progress}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {hasUploadError ? 'Upload failed' :
                       hasUploadSuccess ? 'Upload complete' :
                       `${state.fileUpload.progress}% uploaded`}
                    </p>
                  </div>
                )}
                
                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  id="fileInput"
                  type="file"
                  accept={ALLOWED_FILE_TYPES.join(',')}
                  onChange={handleFileUpload}
                  className="sr-only"
                  aria-label="Upload grant proposal file"
                />
              </div>

              {/* Prediction Results Display */}
              {state.predictionResult && !state.showEnhancer && (
                <PredictionResults 
                  result={state.predictionResult}
                  organizationName={state.fileUpload.file?.name.replace(/\.[^/.]+$/, '') || 'Your Organization'}
                  fundingAmount={100000}
                  onClose={() => setState(prev => ({ ...prev, predictionResult: null, fileUpload: { ...prev.fileUpload, status: 'idle' } }))}
                  onEnhance={() => setState(prev => ({ ...prev, showEnhancer: true }))}
                />
              )}

              {/* Document Enhancer */}
              {state.showEnhancer && state.uploadedFileData && (
                <DocumentEnhancer
                  fileData={state.uploadedFileData}
                  onClose={() => setState(prev => ({ ...prev, showEnhancer: false }))}
                />
              )}

              {/* API Health Status - Removed from public view for security */}

              {/* Quick Start Form - converted from form to div */}
              {!state.predictionResult && (
                <div className="pt-6 border-t border-gray-200">
                  <DropInAnalyzer />
                </div>
              )}
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
          isOpen={state.showPaymentModal}
          onClose={handlePaymentClose}
          onSuccess={handlePaymentSuccess}
        />
      </div>
    </div>
  )
}