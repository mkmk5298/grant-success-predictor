'use client'

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, X, CheckCircle, AlertCircle, Zap } from 'lucide-react'
import UploadCounter from './UploadCounter'
import UploadLimitReached from './PaymentWall/UploadLimitReached'
import { useUploadTracking } from './UploadCounter'

interface DocumentUploadProps {
  userId?: string
  userEmail?: string
  isSubscribed?: boolean
  onAnalysisComplete?: (result: any) => void
}

interface AnalysisResult {
  successProbability: number
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  matchingGrants: Array<{
    id: string
    title: string
    amount: number
    deadline: string
    match: number
  }>
  budgetAnalysis?: {
    total: number
    breakdown: Record<string, number>
    recommendations: string[]
  }
  competitiveAnalysis?: {
    score: number
    insights: string[]
  }
}

const mockAnalysisResult: AnalysisResult = {
  successProbability: 73,
  strengths: [
    "Well-defined project objectives and clear impact metrics",
    "Strong community partnerships and stakeholder support",
    "Experienced team with relevant track record",
    "Comprehensive budget with detailed justifications"
  ],
  weaknesses: [
    "Limited discussion of potential risks and mitigation strategies",
    "Could benefit from more specific evaluation methods",
    "Timeline could be more detailed for complex deliverables"
  ],
  recommendations: [
    "Add a detailed risk management section with specific mitigation strategies",
    "Include letters of commitment from key community partners",
    "Strengthen the evaluation methodology with measurable outcomes",
    "Consider adding a sustainability plan for project continuation",
    "Enhance the dissemination strategy to reach broader audiences"
  ],
  matchingGrants: [
    {
      id: "1",
      title: "Community Impact Innovation Fund",
      amount: 250000,
      deadline: "2025-03-15",
      match: 94
    },
    {
      id: "2",
      title: "Social Innovation Challenge Grant", 
      amount: 175000,
      deadline: "2025-02-28",
      match: 88
    },
    {
      id: "3",
      title: "Sustainable Development Initiative",
      amount: 300000,
      deadline: "2025-04-30",
      match: 82
    }
  ],
  budgetAnalysis: {
    total: 185000,
    breakdown: {
      "Personnel": 95000,
      "Equipment": 35000,
      "Travel": 12000,
      "Supplies": 18000,
      "Overhead": 25000
    },
    recommendations: [
      "Consider reducing equipment costs by 15% through bulk purchasing",
      "Personnel allocation looks appropriate for project scope",
      "Travel budget may be conservative - consider adding 20% buffer"
    ]
  },
  competitiveAnalysis: {
    score: 78,
    insights: [
      "Above average compared to similar proposals in this category",
      "Strong innovation factor sets you apart from competitors",
      "Community engagement approach is particularly compelling"
    ]
  }
}

export default function DocumentUpload({ 
  userId, 
  userEmail, 
  isSubscribed = false, 
  onAnalysisComplete 
}: DocumentUploadProps) {
  const [uploadCount, setUploadCount] = useState(0)
  const [showPaymentWall, setShowPaymentWall] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { trackUpload } = useUploadTracking()

  const handleLimitReached = () => {
    setShowPaymentWall(true)
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    handleFiles(droppedFiles)
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : []
    handleFiles(selectedFiles)
  }

  const handleFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => {
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ]
      const maxSize = 50 * 1024 * 1024 // 50MB
      
      if (!validTypes.includes(file.type)) {
        setError(`${file.name} is not a supported file type. Please upload PDF, DOC, DOCX, or TXT files.`)
        return false
      }
      
      if (file.size > maxSize) {
        setError(`${file.name} is too large. Maximum file size is 50MB.`)
        return false
      }
      
      return true
    })

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles])
      setError(null)
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const startAnalysis = async () => {
    if (files.length === 0) {
      setError('Please upload at least one document')
      return
    }

    // Check upload limit before proceeding
    try {
      const response = await fetch('/api/v1/uploads/check-limit', {
        headers: {
          'x-user-id': userId || '',
          'x-user-email': userEmail || ''
        }
      })
      
      const limitData = await response.json()
      if (limitData.limitReached && !isSubscribed) {
        setShowPaymentWall(true)
        return
      }
    } catch (error) {
      console.error('Failed to check upload limit:', error)
    }

    setUploading(true)
    setError(null)

    try {
      // Track the upload
      await trackUpload(userId, userEmail, files[0].name)
      
      // Simulate upload
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setUploading(false)
      setAnalyzing(true)

      // Simulate analysis
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      setAnalysisResult(mockAnalysisResult)
      onAnalysisComplete?.(mockAnalysisResult)
      
    } catch (error) {
      setError('Failed to analyze document. Please try again.')
    } finally {
      setUploading(false)
      setAnalyzing(false)
    }
  }

  const resetUpload = () => {
    setFiles([])
    setAnalysisResult(null)
    setError(null)
  }

  if (analysisResult) {
    return (
      <div className="space-y-6">
        {/* Analysis Results */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6"
        >
          {/* Success Probability Header */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-8 text-center">
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <h2 className="text-3xl font-bold text-gray-900">Analysis Complete</h2>
              </div>
              <div className="text-6xl font-bold text-green-600">
                {analysisResult.successProbability}%
              </div>
              <p className="text-xl text-gray-700">Success Probability</p>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Based on our comprehensive AI analysis of your grant proposal, including content quality, 
                budget structure, and competitive landscape assessment.
              </p>
            </div>
          </div>

          {/* Detailed Analysis */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Strengths */}
            <div className="bg-green-50 rounded-xl p-6">
              <h3 className="text-xl font-bold text-green-800 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Key Strengths
              </h3>
              <ul className="space-y-2">
                {analysisResult.strengths.map((strength, index) => (
                  <li key={index} className="flex items-start gap-2 text-green-700">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2"></div>
                    <span className="text-sm">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Areas for Improvement */}
            <div className="bg-yellow-50 rounded-xl p-6">
              <h3 className="text-xl font-bold text-yellow-800 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Areas for Improvement
              </h3>
              <ul className="space-y-2">
                {analysisResult.weaknesses.map((weakness, index) => (
                  <li key={index} className="flex items-start gap-2 text-yellow-700">
                    <div className="w-1.5 h-1.5 bg-yellow-600 rounded-full mt-2"></div>
                    <span className="text-sm">{weakness}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="bg-blue-50 rounded-xl p-6">
            <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              AI-Powered Recommendations
            </h3>
            <div className="space-y-3">
              {analysisResult.recommendations.map((recommendation, index) => (
                <div key={index} className="bg-white rounded-lg p-4 border border-blue-200">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-blue-700 text-sm">{recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Matching Grants */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Top Matching Grants</h3>
            <div className="grid gap-4">
              {analysisResult.matchingGrants.map((grant, index) => (
                <div key={grant.id} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-900">{grant.title}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>${grant.amount.toLocaleString()}</span>
                        <span>Deadline: {grant.deadline}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">{grant.match}%</div>
                      <div className="text-xs text-gray-500">compatibility</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <button 
              onClick={resetUpload}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Analyze Another Document
            </button>
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Download Full Report
            </button>
          </div>
        </motion.div>

        {/* Payment wall if limit reached */}
        <UploadLimitReached 
          isOpen={showPaymentWall}
          onClose={() => setShowPaymentWall(false)}
          allowClose={true}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Upload Counter */}
      <UploadCounter
        userId={userId}
        userEmail={userEmail}
        isSubscribed={isSubscribed}
        onLimitReached={handleLimitReached}
      />

      {/* Upload Area */}
      <div className="space-y-6">
        <div
          className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
            dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 bg-gray-50 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
              <Upload className="w-8 h-8 text-blue-600" />
            </div>
            
            <div>
              <p className="text-xl font-semibold text-gray-900">
                Drop your grant proposal here
              </p>
              <p className="text-gray-600 mt-2">
                Or click to browse and select your files
              </p>
            </div>
            
            <div className="text-sm text-gray-500">
              Supports PDF, DOC, DOCX, and TXT files up to 50MB each
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Uploaded Files</h4>
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Analysis Button */}
        {files.length > 0 && (
          <div className="text-center">
            <button
              onClick={startAnalysis}
              disabled={uploading || analyzing}
              className={`px-8 py-4 text-white font-semibold rounded-xl transition-all transform hover:scale-105 ${
                uploading || analyzing
                  ? 'bg-gray-400 cursor-not-allowed transform-none'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg'
              }`}
            >
              {uploading ? 'Uploading...' : analyzing ? 'Analyzing Document...' : 'Analyze Grant Proposal'}
            </button>
            
            {(uploading || analyzing) && (
              <div className="mt-4">
                <div className="w-64 mx-auto bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: uploading ? '60%' : '90%' }}></div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {uploading ? 'Processing your document...' : 'Running AI analysis...'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment Wall */}
      <UploadLimitReached 
        isOpen={showPaymentWall}
        onClose={() => setShowPaymentWall(false)}
        uploadCount={uploadCount}
        allowClose={false}
      />
    </div>
  )
}