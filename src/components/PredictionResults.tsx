"use client"

import React from "react"
import { motion } from "framer-motion"
import { TrendingUp, Target, Lightbulb, Award, FileText } from "lucide-react"
import CountUp from "react-countup"

interface PredictionResultsProps {
  result: {
    successProbability: number
    confidence: string
    recommendations?: string[]
    matchingGrants?: Array<{
      id: string
      title: string
      amount: number
      deadline: string
      match: number
    }>
    documentAnalysis?: {
      fileName: string
      wordCount: number
      hasExecutiveSummary: boolean
      processingTime: number
    }
  }
  organizationName?: string
  fundingAmount?: number
  onClose?: () => void
  onEnhance?: () => void
}

export default function PredictionResults({ 
  result, 
  organizationName = "Your Organization",
  fundingAmount = 100000,
  onClose,
  onEnhance 
}: PredictionResultsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="space-y-6 mt-6"
    >
      {/* Document Analysis Summary */}
      {result.documentAnalysis && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">Document Analysis Complete</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">File Name</p>
              <p className="font-semibold text-gray-900">{result.documentAnalysis.fileName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Word Count</p>
              <p className="font-semibold text-gray-900">{result.documentAnalysis.wordCount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Executive Summary</p>
              <p className="font-semibold text-gray-900">
                {result.documentAnalysis.hasExecutiveSummary ? "✅ Included" : "❌ Missing"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Processing Time</p>
              <p className="font-semibold text-gray-900">{result.documentAnalysis.processingTime}ms</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Success Probability */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-8 text-center"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2">
            <TrendingUp className="w-6 h-6 text-purple-600" />
            <h3 className="text-2xl font-bold text-gray-900">Grant Success Probability</h3>
          </div>
          
          <div className="text-6xl font-bold">
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              <CountUp end={result.successProbability} duration={2} />%
            </span>
          </div>
          
          <div className="text-gray-600">
            <p className="text-lg font-medium">
              Confidence Level: <span className="text-purple-600 capitalize">{result.confidence}</span>
            </p>
            <p className="mt-2">
              Based on AI analysis of {organizationName}&apos;s proposal for ${fundingAmount.toLocaleString()}
            </p>
          </div>
        </div>
      </motion.div>

      {/* AI Recommendations */}
      {result.recommendations && result.recommendations.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-8"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-6 h-6 text-purple-600" />
              <h3 className="text-xl font-bold text-gray-900">AI Recommendations to Improve Success</h3>
            </div>
            <div className="space-y-3">
              {result.recommendations.map((recommendation, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className="flex items-start gap-3 p-3 bg-white/60 rounded-lg"
                >
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-600 font-bold text-sm">{index + 1}</span>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{recommendation}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* AI Document Enhancement CTA */}
      {result.documentAnalysis && onEnhance && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-8 text-center"
        >
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-white">Let AI Fix Your Document!</h3>
            <p className="text-white/90 max-w-2xl mx-auto">
              Our AI can automatically implement these recommendations directly in your document. 
              Get an enhanced version with improved clarity, stronger impact statements, and better structure.
            </p>
            <button
              onClick={onEnhance}
              className="px-8 py-4 bg-white text-purple-600 rounded-full hover:bg-gray-100 transition-colors font-bold text-lg inline-flex items-center gap-2"
            >
              <FileText className="w-5 h-5" />
              Enhance Document with AI
            </button>
          </div>
        </motion.div>
      )}

      {/* Matching Grants */}
      {result.matchingGrants && result.matchingGrants.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white border border-gray-200 rounded-lg p-8"
        >
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              Top Matching Grants
            </h3>
            
            <div className="space-y-4">
              {result.matchingGrants.map((grant, index) => (
                <motion.div
                  key={grant.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                  className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{grant.title}</h4>
                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4" />
                          <span>${grant.amount.toLocaleString()}</span>
                        </div>
                        <span>Due: {grant.deadline}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">{grant.match}%</div>
                      <div className="text-xs text-gray-500">match</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Action Buttons */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex gap-4 justify-center"
      >
        <button 
          type="button"
          onClick={onClose}
          className="px-6 py-3 bg-white text-gray-900 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors font-medium"
          style={{ 
            pointerEvents: 'auto',
            cursor: 'pointer',
            position: 'relative',
            zIndex: 50,
            color: '#111827',
            backgroundColor: '#ffffff'
          }}
        >
          Upload Another Document
        </button>
        <button 
          type="button"
          onClick={() => {
            // Store results and redirect to signup
            sessionStorage.setItem('savedResults', JSON.stringify(result))
            window.location.href = '/auth/signup'
          }}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full hover:from-purple-700 hover:to-pink-700 transition-colors font-medium"
          style={{ 
            pointerEvents: 'auto',
            cursor: 'pointer',
            position: 'relative',
            zIndex: 50
          }}
        >
          Save Results & Create Account
        </button>
      </motion.div>
    </motion.div>
  )
}