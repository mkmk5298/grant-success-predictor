'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileEdit, 
  Download, 
  Sparkles, 
  CheckCircle, 
  Loader2, 
  FileText,
  TrendingUp,
  AlertCircle,
  Eye,
  ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DocumentEnhancerProps {
  fileData: {
    name: string
    content: string
    type: string
    size: number
  }
  onClose?: () => void
}

interface EnhancementResult {
  enhancedDocument: string
  fileName: string
  sections: any[]
  improvements: any[]
  metrics: {
    readabilityScore: number
    clarityScore: number
    impactScore: number
    overallImprovement: number
  }
  downloadUrl?: string
}

export default function DocumentEnhancer({ fileData, onClose }: DocumentEnhancerProps) {
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [enhancementResult, setEnhancementResult] = useState<EnhancementResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedLevel, setSelectedLevel] = useState<'basic' | 'advanced' | 'comprehensive'>('advanced')
  const [showComparison, setShowComparison] = useState(false)
  const [enhancementProgress, setEnhancementProgress] = useState(0)

  const enhanceDocument = async () => {
    setIsEnhancing(true)
    setError(null)
    setEnhancementProgress(0)
    
    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setEnhancementProgress(prev => Math.min(prev + 10, 90))
    }, 500)
    
    try {
      const response = await fetch('/api/v1/enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileData: {
            name: fileData.name,
            content: fileData.content,
            type: fileData.type
          },
          enhancementLevel: selectedLevel,
          aiProvider: 'both',
          options: {
            preserveFormatting: true,
            generateExecutiveSummary: true,
            strengthenImpactStatements: true,
            improveBudgetJustification: true,
            addDataAndEvidence: true
          }
        })
      })
      
      clearInterval(progressInterval)
      setEnhancementProgress(100)
      
      if (!response.ok) {
        throw new Error('Enhancement failed')
      }
      
      const result = await response.json()
      
      if (result.success && result.data) {
        setEnhancementResult(result.data)
      } else {
        throw new Error(result.error?.message || 'Enhancement failed')
      }
      
    } catch (err) {
      clearInterval(progressInterval)
      setError(err instanceof Error ? err.message : 'Failed to enhance document')
      console.error('Enhancement error:', err)
    } finally {
      setIsEnhancing(false)
    }
  }

  const downloadEnhancedDocument = () => {
    if (!enhancementResult) return
    
    // Create a blob from the base64 data
    const byteCharacters = atob(enhancementResult.enhancedDocument)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: fileData.type })
    
    // Create download link
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = enhancementResult.fileName
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-8 mt-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <FileEdit className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI Document Enhancement</h2>
            <p className="text-gray-600">Improve your grant proposal with AI</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        )}
      </div>

      {/* File Info */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-gray-600" />
          <div>
            <p className="font-medium text-gray-900">{fileData.name}</p>
            <p className="text-sm text-gray-600">
              {(fileData.size / 1024).toFixed(1)} KB • Ready for enhancement
            </p>
          </div>
        </div>
      </div>

      {!enhancementResult && !isEnhancing && (
        <>
          {/* Enhancement Level Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Enhancement Level</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  level: 'basic' as const,
                  title: 'Basic',
                  description: 'Grammar, clarity, and conciseness',
                  icon: '✨'
                },
                {
                  level: 'advanced' as const,
                  title: 'Advanced',
                  description: 'Impact, metrics, and active voice',
                  icon: '⚡'
                },
                {
                  level: 'comprehensive' as const,
                  title: 'Comprehensive',
                  description: 'Complete rewrite for maximum impact',
                  icon: '🚀'
                }
              ].map((option) => (
                <button
                  key={option.level}
                  onClick={() => setSelectedLevel(option.level)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedLevel === option.level
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-2">{option.icon}</div>
                  <h4 className="font-semibold text-gray-900">{option.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Enhancement Features */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">AI Enhancement Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                'Generate executive summary if missing',
                'Strengthen impact statements',
                'Improve budget justification',
                'Add supporting data and evidence',
                'Fix grammar and readability issues',
                'Convert to active voice'
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Enhance Button */}
          <button
            onClick={enhanceDocument}
            className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors font-medium text-lg flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            Enhance Document with AI
          </button>
        </>
      )}

      {/* Enhancement Progress */}
      {isEnhancing && (
        <div className="space-y-6">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Enhancing Your Document...
            </h3>
            <p className="text-gray-600">
              Our AI is analyzing and improving your grant proposal
            </p>
          </div>
          
          <div className="bg-gray-200 rounded-full h-3">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${enhancementProgress}%` }}
              className="bg-gradient-to-r from-purple-600 to-pink-600 h-3 rounded-full"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { step: 'Analyzing', complete: enhancementProgress > 30 },
              { step: 'Enhancing', complete: enhancementProgress > 60 },
              { step: 'Finalizing', complete: enhancementProgress > 90 }
            ].map((step, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 ${
                  step.complete ? 'text-green-600' : 'text-gray-400'
                }`}
              >
                {step.complete ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-current" />
                )}
                <span className="font-medium">{step.step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enhancement Results */}
      {enhancementResult && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Success Message */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-green-700 font-medium">
                  Document enhanced successfully!
                </p>
              </div>
            </div>

            {/* Improvement Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                {
                  label: 'Overall Improvement',
                  value: enhancementResult.metrics.overallImprovement,
                  icon: TrendingUp,
                  color: 'purple'
                },
                {
                  label: 'Readability',
                  value: enhancementResult.metrics.readabilityScore,
                  icon: Eye,
                  color: 'blue'
                },
                {
                  label: 'Clarity',
                  value: enhancementResult.metrics.clarityScore,
                  icon: Sparkles,
                  color: 'green'
                },
                {
                  label: 'Impact',
                  value: enhancementResult.metrics.impactScore,
                  icon: FileEdit,
                  color: 'pink'
                }
              ].map((metric, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <metric.icon className={`w-4 h-4 text-${metric.color}-600`} />
                    <span className="text-sm text-gray-600">{metric.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{metric.value}%</p>
                </div>
              ))}
            </div>

            {/* Improvements Made */}
            {enhancementResult.improvements.length > 0 && (
              <div className="bg-purple-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">
                  {enhancementResult.improvements.length} Improvements Made
                </h3>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {enhancementResult.improvements.slice(0, 5).map((improvement, index) => (
                    <div key={index} className="bg-white rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">
                            {improvement.section}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {improvement.reason}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={downloadEnhancedDocument}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download Enhanced Document
              </button>
              
              <button
                onClick={() => setShowComparison(!showComparison)}
                className="px-6 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Eye className="w-5 h-5" />
                {showComparison ? 'Hide' : 'View'} Comparison
              </button>
            </div>

            {/* Before/After Comparison */}
            {showComparison && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="border border-gray-200 rounded-lg p-6"
              >
                <h3 className="font-semibold text-gray-900 mb-4">Document Comparison</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Original</h4>
                    <div className="bg-gray-50 rounded-lg p-4 h-40 overflow-y-auto">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {Buffer.from(fileData.content, 'base64').toString('utf-8').substring(0, 500)}...
                      </p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Enhanced</h4>
                    <div className="bg-green-50 rounded-lg p-4 h-40 overflow-y-auto">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {Buffer.from(enhancementResult.enhancedDocument, 'base64').toString('utf-8').substring(0, 500)}...
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Try Another Document */}
            <div className="text-center pt-4">
              <button
                onClick={() => {
                  setEnhancementResult(null)
                  setError(null)
                }}
                className="text-purple-600 hover:text-purple-700 font-medium inline-flex items-center gap-2"
              >
                Enhance Again with Different Settings
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  )
}