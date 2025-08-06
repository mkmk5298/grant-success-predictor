import { NextRequest, NextResponse } from 'next/server'
import { trackAnalyticsEvent } from '@/lib/database'

export async function POST(req: NextRequest) {
  try {
    const { eventType, eventData } = await req.json()
    const userId = req.headers.get('x-user-id')
    const sessionId = req.headers.get('x-session-id')

    await trackAnalyticsEvent(eventType, userId || undefined, sessionId || undefined, eventData)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Analytics tracking error:', error)
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    )
  }
}