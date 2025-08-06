"use client"

import React, { useRef, useState, useEffect } from "react"
import { motion } from "framer-motion"
import { TrendingUp, Brain, Target, Zap } from "lucide-react"

// Simplified 3D-style visualization without actual 3D
function SuccessMeter({ percentage }: { percentage: number }) {
  const getColor = (percentage: number) => {
    if (percentage >= 90) return "#10b981" // green
    if (percentage >= 80) return "#3b82f6" // blue
    if (percentage >= 70) return "#f59e0b" // yellow
    return "#ef4444" // red
  }

  const color = getColor(percentage)

  return (
    <div className="relative w-64 h-64 mx-auto">
      {/* Main success sphere */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
        className="absolute inset-0 rounded-full border-4 flex items-center justify-center"
        style={{ 
          borderColor: color,
          background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`,
          boxShadow: `0 0 50px ${color}40`
        }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="text-4xl font-bold text-white"
        >
          {percentage}%
        </motion.div>
      </motion.div>
      
      {/* Animated rings */}
      {[1, 2, 3].map((ring, index) => (
        <motion.div
          key={ring}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1 + index * 0.2, opacity: 0.3 - index * 0.1 }}
          transition={{ 
            delay: 0.2 + index * 0.1, 
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse"
          }}
          className="absolute inset-0 rounded-full border-2"
          style={{ borderColor: color }}
        />
      ))}
    </div>
  )
}

// Floating prediction factors
function PredictionFactors({ factors }: { factors: Array<{ name: string; value: number }> }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
      {factors.map((factor, index) => (
        <motion.div
          key={factor.name}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 + index * 0.1 }}
          className="text-center p-4 bg-white/5 rounded-xl border border-white/10"
        >
          <div 
            className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold"
            style={{ 
              backgroundColor: factor.value > 80 ? "#10b981" : factor.value > 60 ? "#3b82f6" : "#f59e0b"
            }}
          >
            {factor.value}
          </div>
          <h4 className="text-white font-medium text-sm">{factor.name}</h4>
        </motion.div>
      ))}
    </div>
  )
}

interface PredictionEngine3DProps {
  prediction: {
    successProbability: number
    factors: Array<{
      name: string
      score: number
      impact: string
    }>
  }
}

export default function PredictionEngine3D({ prediction }: PredictionEngine3DProps) {
  // Convert factors for display
  const factorsDisplay = prediction.factors.map((factor) => ({
    name: factor.name.split(' ')[0], // Shortened name
    value: factor.score
  }))

  return (
    <div className="space-y-8">
      {/* Visualization */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="glass rounded-2xl p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-400" />
            AI Success Analysis
          </h2>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30">
            <Zap className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-300 font-medium">AI Powered</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-black/40 to-black/20 rounded-xl p-8 border border-white/10">
          <SuccessMeter percentage={prediction.successProbability} />
          <PredictionFactors factors={factorsDisplay} />
        </div>

        <div className="mt-6 text-center">
          <p className="text-white/70 text-sm">
            ⚡ AI-powered real-time analysis based on 50,000+ historical data points
          </p>
        </div>
      </motion.div>

      {/* Factor Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass rounded-2xl p-8"
      >
        <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
          <Target className="w-5 h-5 text-blue-400" />
          Success Factors Analysis
        </h3>

        <div className="grid gap-4">
          {prediction.factors.map((factor, index) => (
            <motion.div
              key={factor.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium">{factor.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-white text-lg font-bold">{factor.score}%</span>
                  <TrendingUp className={`w-4 h-4 ${
                    factor.score >= 80 ? 'text-green-400' : 
                    factor.score >= 60 ? 'text-blue-400' : 
                    'text-yellow-400'
                  }`} />
                </div>
              </div>
              
              <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${factor.score}%` }}
                  transition={{ delay: 0.5 + index * 0.1, duration: 0.8 }}
                  className={`h-full rounded-full ${
                    factor.score >= 80 ? 'bg-gradient-to-r from-green-600 to-emerald-600' :
                    factor.score >= 60 ? 'bg-gradient-to-r from-blue-600 to-cyan-600' :
                    'bg-gradient-to-r from-yellow-600 to-orange-600'
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-pulse" />
              </div>
              
              <p className="text-white/60 text-sm mt-2">{factor.impact}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="glass rounded-2xl p-8"
      >
        <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
          <Zap className="w-5 h-5 text-yellow-400" />
          AI Recommendations
        </h3>

        <div className="space-y-4">
          {[
            "Strengthen your project narrative with specific impact metrics and measurable outcomes",
            "Develop strategic partnerships with established organizations in your sector",
            "Prepare comprehensive budget documentation with detailed cost justifications",
            "Gather compelling letters of support from key stakeholders and beneficiaries"
          ].map((recommendation, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              className="flex items-start gap-3 p-4 bg-white/5 rounded-xl border border-white/10"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-sm font-bold">{index + 1}</span>
              </div>
              <p className="text-white/80 leading-relaxed">{recommendation}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}