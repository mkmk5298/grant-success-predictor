'use client'

import { useState, useEffect } from 'react'
import { Upload, Zap } from 'lucide-react'

interface UploadCounterProps {
  userId?: string
  userEmail?: string
  isSubscribed?: boolean
  onLimitReached?: () => void
}

export default function UploadCounter({ 
  userId, 
  userEmail, 
  isSubscribed = false, 
  onLimitReached 
}: UploadCounterProps) {
  const [uploadCount, setUploadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [sessionId, setSessionId] = useState('')

  useEffect(() => {
    // Generate or get session ID
    let sid = sessionStorage.getItem('sessionId')
    if (!sid) {
      sid = 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now()
      sessionStorage.setItem('sessionId', sid)
    }
    setSessionId(sid)

    // Check current upload count
    checkUploadCount()
  }, [userId])

  const checkUploadCount = async () => {
    try {
      const response = await fetch('/api/v1/uploads/check-limit', {
        method: 'GET',
        headers: {
          'x-user-id': userId || '',
          'x-user-email': userEmail || '',
          'x-session-id': sessionId
        }
      })

      const data = await response.json()
      
      if (response.ok) {
        setUploadCount(data.uploadCount || 0)
        
        // If limit reached and not subscribed, trigger payment wall
        if (data.limitReached && !isSubscribed && onLimitReached) {
          onLimitReached()
        }
      }
    } catch (error) {
      console.error('Failed to check upload count:', error)
    } finally {
      setLoading(false)
    }
  }

  const incrementCount = async () => {
    try {
      await fetch('/api/v1/uploads/increment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId || '',
          'x-user-email': userEmail || '',
          'x-session-id': sessionId
        }
      })
      
      setUploadCount(prev => prev + 1)
    } catch (error) {
      console.error('Failed to increment upload count:', error)
    }
  }

  if (loading) {
    return (
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <div className="animate-pulse flex items-center space-x-2">
          <div className="w-5 h-5 bg-blue-200 rounded"></div>
          <div className="h-4 bg-blue-200 rounded w-32"></div>
        </div>
      </div>
    )
  }

  if (isSubscribed) {
    return (
      <div className="bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-yellow-300" />
            <span className="font-semibold">Pro Member</span>
          </div>
          <div className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
            Unlimited Uploads
          </div>
        </div>
      </div>
    )
  }

  const remainingUploads = Math.max(0, 2 - uploadCount)
  
  return (
    <div className={`rounded-lg p-4 mb-6 ${
      uploadCount === 0 ? 'bg-green-50 border-green-200' :
      uploadCount === 1 ? 'bg-yellow-50 border-yellow-200' :
      'bg-red-50 border-red-200'
    } border`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Upload className={`w-5 h-5 ${
            uploadCount === 0 ? 'text-green-600' :
            uploadCount === 1 ? 'text-yellow-600' :
            'text-red-600'
          }`} />
          <span className="font-semibold">
            {uploadCount === 0 ? 'Try 2 FREE grant analyses!' :
             uploadCount === 1 ? '1 free analysis remaining' :
             'Free analyses used'}
          </span>
        </div>
        
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          uploadCount === 0 ? 'bg-green-100 text-green-800' :
          uploadCount === 1 ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {uploadCount >= 2 ? 
            'Upgrade to Pro!' : 
            `${remainingUploads} left`
          }
        </div>
      </div>
      
      {uploadCount >= 2 && (
        <div className="mt-3 pt-3 border-t border-red-200">
          <p className="text-sm text-red-700">
            <strong>Subscribe for unlimited access!</strong> Get unlimited analyses, AI recommendations, and more for just $19/month.
          </p>
        </div>
      )}
    </div>
  )
}

// Export the increment function for use in other components
export const useUploadTracking = () => {
  const [sessionId, setSessionId] = useState('')

  useEffect(() => {
    let sid = sessionStorage.getItem('sessionId')
    if (!sid) {
      sid = 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now()
      sessionStorage.setItem('sessionId', sid)
    }
    setSessionId(sid)
  }, [])

  const trackUpload = async (userId?: string, userEmail?: string, fileName?: string) => {
    try {
      const response = await fetch('/api/v1/uploads/increment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId || '',
          'x-user-email': userEmail || '',
          'x-session-id': sessionId
        },
        body: JSON.stringify({ fileName })
      })
      
      return response.ok
    } catch (error) {
      console.error('Failed to track upload:', error)
      return false
    }
  }

  return { trackUpload }
}