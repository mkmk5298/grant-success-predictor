import { NextRequest, NextResponse } from 'next/server'
import { incrementUploadCount, trackAnalyticsEvent } from '@/lib/database'

export async function POST(req: NextRequest) {
  try {
    const { fileName } = await req.json().catch(() => ({}))
    const userId = req.headers.get('x-user-id')
    const userEmail = req.headers.get('x-user-email') 
    const sessionId = req.headers.get('x-session-id') || req.cookies.get('session-id')?.value
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'

    const success = await incrementUploadCount(
      userId || undefined, 
      sessionId, 
      ipAddress, 
      fileName
    )

    if (success) {
      // Track analytics event
      await trackAnalyticsEvent('upload_started', userId || undefined, sessionId, {
        fileName,
        ipAddress,
        userAgent: req.headers.get('user-agent')
      })

      return NextResponse.json({
        success: true,
        message: 'Upload count incremented'
      })
    } else {
      return NextResponse.json({
        error: 'Failed to increment upload count'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Failed to increment upload:', error)
    return NextResponse.json({
      error: 'Internal Server Error'
    }, { status: 500 })
  }
}