"use client"

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle, 
  AlertTriangle, 
  Target, 
  TrendingUp, 
  DollarSign, 
  Users, 
  FileText, 
  Clock,
  Lightbulb,
  Zap,
  Award,
  ArrowRight,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react'

interface AdviceItem {
  id: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  category: 'immediate' | 'strategic' | 'budget' | 'narrative'
  actionable: boolean
  timeframe?: string
  impact?: 'high' | 'medium' | 'low'
}

interface AIAdviceDisplayProps {
  advice: {
    immediateActions?: string[]
    strategicImprovements?: string[]
    redFlags?: string[]
    competitiveAdvantages?: string[]
    budgetOptimization?: any
    narrativeFramework?: any
    confidence?: number
    provider?: string
    processingTime?: number
  }
  successProbability: number
  organizationName: string
  fundingAmount: number
  isLoading?: boolean
}

const priorityColors = {
  high: 'bg-red-50 border-red-200 text-red-800',
  medium: 'bg-yellow-50 border-yellow-200 text-yellow-800', 
  low: 'bg-green-50 border-green-200 text-green-800'
}

const categoryIcons = {
  immediate: Clock,
  strategic: Target,
  budget: DollarSign,
  narrative: FileText
}

const categoryColors = {
  immediate: 'bg-red-500',
  strategic: 'bg-blue-500', 
  budget: 'bg-green-500',
  narrative: 'bg-purple-500'
}

export default function AIAdviceDisplay({ 
  advice, 
  successProbability, 
  organizationName, 
  fundingAmount,
  isLoading = false 
}: AIAdviceDisplayProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'immediate' | 'strategic' | 'competitive'>('overview')
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set())

  const handleCopyToClipboard = async (text: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedItems(prev => new Set([...prev, itemId]))
      setTimeout(() => {
        setCopiedItems(prev => {
          const newSet = new Set(prev)
          newSet.delete(itemId)
          return newSet
        })
      }, 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const formatAdviceItems = (items: string[] = [], category: AdviceItem['category'], priority: AdviceItem['priority'] = 'medium'): AdviceItem[] => {
    return items.map((item, index) => ({
      id: `${category}-${index}`,
      title: item.split(':')[0] || item.substring(0, 50) + '...',
      description: item,
      priority,
      category,
      actionable: true,
      timeframe: category === 'immediate' ? '1-2 weeks' : '1-3 months',
      impact: priority
    }))
  }

  const allAdviceItems = [
    ...formatAdviceItems(advice.immediateActions, 'immediate', 'high'),
    ...formatAdviceItems(advice.strategicImprovements, 'strategic', 'medium'),
    ...formatAdviceItems(advice.redFlags, 'immediate', 'high'),
    ...formatAdviceItems(advice.competitiveAdvantages, 'strategic', 'low')
  ]

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600'
    if (rate >= 60) return 'text-yellow-600'  
    return 'text-red-600'
  }

  const getSuccessRateBackground = (rate: number) => {
    if (rate >= 80) return 'bg-green-500'
    if (rate >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-400 border-t-transparent"></div>
            <span className="text-gray-700 font-medium">AI is analyzing your grant and generating personalized advice...</span>
          </div>
          <div className="text-sm text-gray-500 mb-6">
            Using advanced AI models to provide tailored recommendations (typically under 1 minute)
          </div>
          
          {/* Progress Steps */}
          <div className="max-w-md mx-auto">
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>Analyzing</span>
              <span>Processing</span>
              <span>Generating</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1">
              <motion.div 
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-1 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 45, ease: "linear" }}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              AI Grant Improvement Advice
            </h3>
            <p className="text-purple-100 mt-1">
              Personalized recommendations for {organizationName}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {successProbability}%
            </div>
            <div className="text-sm text-purple-100">
              Success Rate
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm text-purple-100 mb-2">
            <span>Grant Success Probability</span>
            <span>{successProbability}% likely to succeed</span>
          </div>
          <div className="w-full bg-purple-500/30 rounded-full h-2">
            <motion.div 
              className={`h-2 rounded-full ${getSuccessRateBackground(successProbability)}`}
              initial={{ width: 0 }}
              animate={{ width: `${successProbability}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'overview', label: 'Overview', icon: Target },
            { id: 'immediate', label: 'Immediate Actions', icon: Clock },
            { id: 'strategic', label: 'Strategic', icon: TrendingUp },
            { id: 'competitive', label: 'Advantages', icon: Award }
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-red-500 rounded-full p-2">
                      <AlertTriangle className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-700">
                        {(advice.immediateActions?.length || 0) + (advice.redFlags?.length || 0)}
                      </div>
                      <div className="text-sm text-red-600">Critical Actions</div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-500 rounded-full p-2">
                      <Target className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-700">
                        {advice.strategicImprovements?.length || 0}
                      </div>
                      <div className="text-sm text-blue-600">Strategic Plans</div>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-500 rounded-full p-2">
                      <Award className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-700">
                        {advice.competitiveAdvantages?.length || 0}
                      </div>
                      <div className="text-sm text-green-600">Advantages</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Priority Actions */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-red-500" />
                    Top Priority Actions
                  </h4>
                  <div className="space-y-2">
                    {advice.immediateActions?.slice(0, 3).map((action, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{action}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Key Advantages */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4 text-green-500" />
                    Your Competitive Edge
                  </h4>
                  <div className="space-y-2">
                    {advice.competitiveAdvantages?.slice(0, 3).map((advantage, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <Zap className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{advantage}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Confidence */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-purple-900">AI Analysis Confidence</h4>
                    <p className="text-sm text-purple-700 mt-1">
                      Based on comprehensive analysis using {advice.provider || 'advanced AI'} models
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-purple-700">
                      {advice.confidence || 85}%
                    </div>
                    <div className="text-xs text-purple-600">
                      {advice.processingTime ? `Generated in ${(advice.processingTime / 1000).toFixed(1)}s` : 'Highly accurate'}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'immediate' && (
            <motion.div
              key="immediate"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Critical Actions - Start These Immediately
                </h4>
                <p className="text-sm text-red-700">
                  These actions will have the biggest impact on your grant success rate. Complete within 1-2 weeks.
                </p>
              </div>

              {[...(advice.immediateActions || []), ...(advice.redFlags || [])].map((action, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="bg-red-500 rounded-full p-1">
                          <Clock className="w-3 h-3 text-white" />
                        </div>
                        <span className="font-medium text-gray-900">Action #{index + 1}</span>
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                          High Priority
                        </span>
                      </div>
                      <p className="text-gray-700 mb-3">{action}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          1-2 weeks
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          High impact
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopyToClipboard(action, `immediate-${index}`)}
                      className="ml-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedItems.has(`immediate-${index}`) ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {activeTab === 'strategic' && (
            <motion.div
              key="strategic"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Strategic Improvements - Long-term Success
                </h4>
                <p className="text-sm text-blue-700">
                  Build these capabilities over 1-3 months to strengthen future grant applications.
                </p>
              </div>

              {(advice.strategicImprovements || []).map((improvement, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="bg-blue-500 rounded-full p-1">
                          <Target className="w-3 h-3 text-white" />
                        </div>
                        <span className="font-medium text-gray-900">Strategy #{index + 1}</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                          Strategic
                        </span>
                      </div>
                      <p className="text-gray-700 mb-3">{improvement}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          1-3 months
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Medium impact
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopyToClipboard(improvement, `strategic-${index}`)}
                      className="ml-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedItems.has(`strategic-${index}`) ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {activeTab === 'competitive' && (
            <motion.div
              key="competitive"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Your Competitive Advantages
                </h4>
                <p className="text-sm text-green-700">
                  Leverage these strengths in your grant narrative to stand out from other applicants.
                </p>
              </div>

              {(advice.competitiveAdvantages || []).map((advantage, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="bg-green-500 rounded-full p-1">
                          <Award className="w-3 h-3 text-white" />
                        </div>
                        <span className="font-medium text-gray-900">Advantage #{index + 1}</span>
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                          Strength
                        </span>
                      </div>
                      <p className="text-gray-700 mb-3">{advantage}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          Use immediately
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          High differentiation
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopyToClipboard(advantage, `advantage-${index}`)}
                      className="ml-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedItems.has(`advantage-${index}`) ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Lightbulb className="w-4 h-4" />
            <span>AI-powered advice tailored for {fundingAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} grant</span>
          </div>
          <button className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1 font-medium">
            Export Advice
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}