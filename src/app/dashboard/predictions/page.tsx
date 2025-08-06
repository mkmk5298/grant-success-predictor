"use client"

import React, { useState, Suspense } from "react"
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from "framer-motion"
import { Brain, Target, TrendingUp, BarChart3, RefreshCw, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { calculateSuccessProbability } from "@/lib/utils"

// Dynamically import heavy 3D component
const PredictionEngine3D = dynamic(
  () => import("@/components/PredictionEngine3D"),
  { 
    loading: () => <div className="h-[400px] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>,
    ssr: false 
  }
)

// Mock prediction data
const mockPredictions = [
  {
    id: 1,
    title: "Innovation in Sustainability Grant",
    organization: "EPA Environmental Innovation Program",
    successProbability: 94,
    lastUpdated: "2025-01-15",
    factors: [
      {
        name: "Organizational Fit",
        score: 96,
        impact: "Excellent alignment with EPA's environmental mission and sustainability goals"
      },
      {
        name: "Project Innovation",
        score: 92,
        impact: "High innovation score due to novel technology approach and measurable impact"
      },
      {
        name: "Financial Readiness", 
        score: 89,
        impact: "Strong budget preparation with detailed cost breakdowns and justifications"
      },
      {
        name: "Team Expertise",
        score: 94,
        impact: "Outstanding team credentials with relevant experience and track record"
      },
      {
        name: "Market Timing",
        score: 98,
        impact: "Perfect timing with current environmental policy focus and funding priorities"
      }
    ],
    recommendations: [
      "Strengthen partnership documentation with additional letters of support",
      "Include more specific metrics on environmental impact measurement",
      "Add detailed timeline with key milestones and deliverables",
      "Prepare contingency plans for potential implementation challenges"
    ]
  },
  {
    id: 2,
    title: "Community Development Fund",
    organization: "HUD Community Development",
    successProbability: 76,
    lastUpdated: "2025-01-14",
    factors: [
      {
        name: "Community Impact",
        score: 84,
        impact: "Strong community need demonstration with clear beneficiary identification"
      },
      {
        name: "Organizational Capacity",
        score: 72,
        impact: "Good capacity but could benefit from additional staffing documentation"
      },
      {
        name: "Budget Justification",
        score: 78,
        impact: "Adequate budget with room for more detailed cost-benefit analysis"
      },
      {
        name: "Stakeholder Support",
        score: 68,
        impact: "Moderate support - needs additional community endorsements"
      },
      {
        name: "Sustainability Plan",
        score: 80,
        impact: "Solid long-term planning with identified funding continuation strategies"
      }
    ],
    recommendations: [
      "Gather additional community endorsements and letters of support",
      "Strengthen organizational capacity section with staff qualifications",
      "Develop more detailed cost-benefit analysis for all budget items",
      "Add specific metrics for measuring community impact and success"
    ]
  }
]

export default function PredictionsPage() {
  const [selectedPrediction, setSelectedPrediction] = useState(mockPredictions[0])
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsRefreshing(false)
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-400"
    if (score >= 80) return "text-blue-400"
    if (score >= 70) return "text-yellow-400"
    return "text-red-400"
  }

  const getScoreBadgeColor = (score: number) => {
    if (score >= 90) return "bg-green-500/20 text-green-400 border-green-400/30"
    if (score >= 80) return "bg-blue-500/20 text-blue-400 border-blue-400/30"
    if (score >= 70) return "bg-yellow-500/20 text-yellow-400 border-yellow-400/30"
    return "bg-red-500/20 text-red-400 border-red-400/30"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-3xl p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">AI Success Predictions</h1>
            <p className="text-white/70">
              Advanced machine learning analysis of your grant applications
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Updating...' : 'Refresh'}
            </Button>
            <Button variant="gradient" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Prediction Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockPredictions.map((prediction) => (
            <motion.div
              key={prediction.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedPrediction(prediction)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedPrediction.id === prediction.id
                  ? 'bg-blue-500/20 border-blue-400/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-white text-sm">{prediction.title}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getScoreBadgeColor(prediction.successProbability)}`}>
                  {prediction.successProbability}%
                </span>
              </div>
              <p className="text-white/60 text-xs mb-2">{prediction.organization}</p>
              <div className="flex items-center justify-between text-xs text-white/50">
                <span>Updated: {prediction.lastUpdated}</span>
                <div className="flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" />
                  <span>{prediction.factors.length} factors</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Selected Prediction Analysis */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedPrediction.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Overview Stats */}
          <div className="glass rounded-2xl p-8 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">{selectedPrediction.title}</h2>
                <p className="text-white/70">{selectedPrediction.organization}</p>
              </div>
              <div className="text-right">
                <div className={`text-4xl font-bold ${getScoreColor(selectedPrediction.successProbability)}`}>
                  {selectedPrediction.successProbability}%
                </div>
                <p className="text-white/60 text-sm">Success Probability</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400 mb-1">
                  {selectedPrediction.factors.length}
                </div>
                <p className="text-white/60 text-sm">Analysis Factors</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400 mb-1">
                  {selectedPrediction.factors.filter(f => f.score >= 80).length}
                </div>
                <p className="text-white/60 text-sm">Strong Factors</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400 mb-1">
                  {Math.round(selectedPrediction.factors.reduce((acc, f) => acc + f.score, 0) / selectedPrediction.factors.length)}
                </div>
                <p className="text-white/60 text-sm">Average Score</p>
              </div>
            </div>
          </div>

          {/* 3D Analysis */}
          <PredictionEngine3D prediction={selectedPrediction} />
        </motion.div>
      </AnimatePresence>

      {/* Historical Performance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass rounded-2xl p-8"
      >
        <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-green-400" />
          Prediction Accuracy Tracking
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-white/5 rounded-xl">
            <div className="text-3xl font-bold text-green-400 mb-2">94%</div>
            <p className="text-white/70 text-sm mb-1">Overall Accuracy</p>
            <p className="text-white/50 text-xs">Based on 247 predictions</p>
          </div>
          <div className="text-center p-6 bg-white/5 rounded-xl">
            <div className="text-3xl font-bold text-blue-400 mb-2">87%</div>
            <p className="text-white/70 text-sm mb-1">High Confidence</p>
            <p className="text-white/50 text-xs">Predictions {'>'}90%</p>
          </div>
          <div className="text-center p-6 bg-white/5 rounded-xl">
            <div className="text-3xl font-bold text-purple-400 mb-2">12ms</div>
            <p className="text-white/70 text-sm mb-1">Analysis Speed</p>
            <p className="text-white/50 text-xs">Average processing time</p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-500/10 rounded-xl border border-blue-400/20">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-blue-400" />
            <span className="text-blue-300 font-medium text-sm">AI Insights</span>
          </div>
          <p className="text-white/80 text-sm leading-relaxed">
            Our machine learning models continuously improve by analyzing successful grant applications 
            and funding patterns. Your current predictions benefit from over 50,000 historical data points 
            and real-time market analysis.
          </p>
        </div>
      </motion.div>
    </div>
  )
}