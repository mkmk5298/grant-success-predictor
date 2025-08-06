// Upload limit checking middleware
import { NextRequest, NextResponse } from 'next/server'
import { getUploadCount, hasActiveSubscription, getUserByEmail } from '@/lib/database'

export async function checkUploadLimit(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const userEmail = req.headers.get('x-user-email')
    const sessionId = req.headers.get('x-session-id') || req.cookies.get('session-id')?.value
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'

    // Get current upload count
    const uploadCount = await getUploadCount(userId || undefined, sessionId, ipAddress)

    // Check if user has exceeded free limit
    if (uploadCount >= 2) {
      // Check if user has active subscription
      if (userId) {
        const hasSubscription = await hasActiveSubscription(userId)
        if (!hasSubscription) {
          return NextResponse.json({
            error: "Payment Required",
            message: "You've used your 2 free analyses",
            upgradeUrl: "/subscribe",
            uploadCount,
            limitReached: true
          }, { status: 402 })
        }
      } else {
        return NextResponse.json({
          error: "Payment Required", 
          message: "You've used your 2 free analyses",
          upgradeUrl: "/subscribe",
          uploadCount,
          limitReached: true
        }, { status: 402 })
      }
    }

    return NextResponse.json({
      uploadCount,
      remainingUploads: 2 - uploadCount,
      limitReached: false
    })

  } catch (error) {
    console.error('Upload limit check failed:', error)
    return NextResponse.json({
      error: "Internal Server Error",
      message: "Failed to check upload limit"
    }, { status: 500 })
  }
}

export function getClientUploadTracker() {
  return `
    const trackUserUploads = {
      getUploadCount: () => {
        const localCount = parseInt(localStorage.getItem('uploadCount') || '0')
        const sessionCount = parseInt(sessionStorage.getItem('uploadCount') || '0')
        return Math.max(localCount, sessionCount)
      },
      
      incrementUpload: async () => {
        const current = trackUserUploads.getUploadCount()
        const newCount = current + 1
        
        localStorage.setItem('uploadCount', newCount.toString())
        sessionStorage.setItem('uploadCount', newCount.toString())
        
        // Sync with backend
        try {
          await fetch('/api/v1/uploads/increment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-session-id': trackUserUploads.getSessionId()
            }
          })
        } catch (error) {
          console.error('Failed to sync upload count:', error)
        }
        
        return newCount
      },
      
      hasReachedLimit: () => {
        return trackUserUploads.getUploadCount() >= 2
      },
      
      getSessionId: () => {
        let sessionId = sessionStorage.getItem('sessionId')
        if (!sessionId) {
          sessionId = 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now()
          sessionStorage.setItem('sessionId', sessionId)
        }
        return sessionId
      },
      
      getRemainingUploads: () => {
        return Math.max(0, 2 - trackUserUploads.getUploadCount())
      }
    }
    
    window.trackUserUploads = trackUserUploads
  `
}