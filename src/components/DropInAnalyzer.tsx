"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Building, DollarSign, TrendingUp, Award, Zap, Target } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { calculateSuccessProbability, formatCurrency } from "@/lib/utils"
import CountUp from "react-countup"

interface AnalysisData {
  organizationName: string
  organizationType: string
  fundingAmount: number
  experienceLevel: string
  hasPartnership: boolean
  hasPreviousGrants: boolean
}

interface PredictionResult {
  successProbability: number
  recommendedActions: string[]
  matchingGrants: Array<{
    id: string
    title: string
    amount: number
    deadline: string
    match: number
  }>
}

const organizationTypes = [
  { value: "nonprofit", label: "Non-Profit Organization" },
  { value: "university", label: "University/Research Institution" },
  { value: "startup", label: "Startup/Small Business" },
  { value: "corporation", label: "Corporation/Enterprise" },
  { value: "individual", label: "Individual/Freelancer" }
]

const experienceLevels = [
  { value: "beginner", label: "First-time applicant" },
  { value: "intermediate", label: "Some grant experience" },
  { value: "expert", label: "Extensive grant history" }
]

const mockGrants = [
  {
    id: "1",
    title: "Innovation in Sustainability Grant",
    amount: 250000,
    deadline: "2025-03-15",
    match: 94
  },
  {
    id: "2", 
    title: "Community Development Fund",
    amount: 150000,
    deadline: "2025-02-28",
    match: 88
  },
  {
    id: "3",
    title: "Technology Advancement Initiative",
    amount: 500000,
    deadline: "2025-04-30",
    match: 82
  }
]

export default function DropInAnalyzer() {
  const [data, setData] = useState<AnalysisData>({
    organizationName: "",
    organizationType: "",
    fundingAmount: 100000,
    experienceLevel: "",
    hasPartnership: false,
    hasPreviousGrants: false
  })

  const [prediction, setPrediction] = useState<PredictionResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Real-time analysis when data changes
  useEffect(() => {
    if (data.organizationName && data.organizationType && data.experienceLevel) {
      setIsAnalyzing(true)
      
      // Call actual prediction API
      const fetchPrediction = async () => {
        try {
          const response = await fetch('/api/v1/predictions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
          })
          
          const result = await response.json()
          
          if (result.success) {
            setPrediction({
              successProbability: result.prediction.successProbability,
              recommendedActions: result.prediction.recommendations,
              matchingGrants: mockGrants // Could be enhanced with real grant matching API
            })
          } else {
            // Fallback to client-side calculation
            const successProbability = calculateSuccessProbability(data)
            setPrediction({
              successProbability,
              recommendedActions: [
                "Strengthen your project narrative with specific impact metrics",
                "Partner with established organizations in your field",
                "Prepare detailed budget justification documents",
                "Gather letters of support from key stakeholders"
              ],
              matchingGrants: mockGrants
            })
          }
        } catch (error) {
          console.error('Prediction API error:', error)
          // Fallback to client-side calculation
          const successProbability = calculateSuccessProbability(data)
          setPrediction({
            successProbability,
            recommendedActions: [
              "Strengthen your project narrative with specific impact metrics",
              "Partner with established organizations in your field", 
              "Prepare detailed budget justification documents",
              "Gather letters of support from key stakeholders"
            ],
            matchingGrants: mockGrants
          })
        } finally {
          setIsAnalyzing(false)
        }
      }

      const timer = setTimeout(fetchPrediction, 800)
      return () => clearTimeout(timer)
    }
  }, [data])

  const handleInputChange = (field: keyof AnalysisData, value: string | number | boolean) => {
    setData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-6">
      {/* Input Form - White card style matching the main interface */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Organization Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Building className="w-4 h-4" />
              Organization Name
            </label>
            <Input
              placeholder="Enter your organization name"
              value={data.organizationName}
              onChange={(e) => handleInputChange("organizationName", e.target.value)}
              className="rounded-donotpay border-gray-300 focus:border-purple-400 focus:ring-purple-400"
            />
          </div>

          {/* Organization Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Organization Type
            </label>
            <Select value={data.organizationType} onValueChange={(value) => handleInputChange("organizationType", value)}>
              <SelectTrigger className="rounded-donotpay">
                <SelectValue placeholder="Select organization type" />
              </SelectTrigger>
              <SelectContent>
                {organizationTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Funding Amount */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Funding Amount Needed
            </label>
            <Input
              type="number"
              placeholder="100000"
              value={data.fundingAmount}
              onChange={(e) => handleInputChange("fundingAmount", parseInt(e.target.value) || 0)}
              className="rounded-donotpay border-gray-300 focus:border-purple-400 focus:ring-purple-400"
            />
          </div>

          {/* Experience Level */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Award className="w-4 h-4" />
              Grant Experience
            </label>
            <Select value={data.experienceLevel} onValueChange={(value) => handleInputChange("experienceLevel", value)}>
              <SelectTrigger className="rounded-donotpay">
                <SelectValue placeholder="Select experience level" />
              </SelectTrigger>
              <SelectContent>
                {experienceLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Checkboxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={data.hasPartnership}
              onChange={(e) => handleInputChange("hasPartnership", e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
            />
            <span className="text-gray-700">Has strategic partnerships</span>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={data.hasPreviousGrants}
              onChange={(e) => handleInputChange("hasPreviousGrants", e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
            />
            <span className="text-gray-700">Previously received grants</span>
          </label>
        </div>
      </div>

      {/* Results */}
      <AnimatePresence>
        {(prediction || isAnalyzing) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            {isAnalyzing ? (
              <div className="bg-gray-50 rounded-donotpay p-8 text-center">
                <div className="inline-flex items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-400 border-t-transparent"></div>
                  <span className="text-gray-700">Analyzing your grant potential...</span>
                </div>
              </div>
            ) : prediction && (
              <div className="space-y-6">
                {/* Success Probability */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-donotpay p-8 text-center"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2">
                      <TrendingUp className="w-6 h-6 text-purple-600" />
                      <h3 className="text-2xl font-bold text-gray-900">Success Probability</h3>
                    </div>
                    
                    <div className="text-6xl font-bold">
                      <span className="gradient-text">
                        <CountUp end={prediction.successProbability} duration={2} />%
                      </span>
                    </div>
                    
                    <p className="text-gray-600 max-w-md mx-auto">
                      Based on our AI analysis of your organization profile and current grant landscape
                    </p>
                  </div>
                </motion.div>

                {/* Matching Grants */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white border border-gray-200 rounded-donotpay p-8"
                >
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <Target className="w-5 h-5 text-purple-600" />
                      Top Matching Grants
                    </h3>
                    
                    <div className="grid gap-4">
                      {prediction.matchingGrants.map((grant, index) => (
                        <motion.div
                          key={grant.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="bg-gray-50 rounded-donotpay p-4 border border-gray-100 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div className="space-y-2">
                              <h4 className="font-semibold text-gray-900">{grant.title}</h4>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span>{formatCurrency(grant.amount)}</span>
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

                {/* Save Results CTA */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-donotpay p-8 text-center"
                >
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-gray-900">Want to save these results?</h3>
                    <p className="text-gray-600">
                      Create a free account to track your applications, get personalized recommendations, and access our grant database.
                    </p>
                    <div className="flex gap-4 justify-center">
                      <button className="btn-pill btn-gradient text-white px-6 py-3 font-medium">
                        Create Free Account
                      </button>
                      <button className="btn-pill btn-outline text-gray-700 px-6 py-3 font-medium">
                        Continue as Guest
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}