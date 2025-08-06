import { NextRequest, NextResponse } from 'next/server'
import { getUserByEmail, getUploadCount, hasActiveSubscription } from '@/lib/database'

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const userEmail = req.headers.get('x-user-email')

    if (!userId && !userEmail) {
      return NextResponse.json({
        error: 'User ID or email required'
      }, { status: 400 })
    }

    let user = null
    if (userEmail) {
      user = await getUserByEmail(userEmail)
    }

    const uploadCount = await getUploadCount(userId || undefined)
    const hasSubscription = userId ? await hasActiveSubscription(userId) : false

    const stats = {
      uploadCount,
      totalAnalyses: user?.total_analyses || 0,
      subscriptionStatus: hasSubscription ? 'active' : 'free',
      subscriptionEnd: user?.subscription_end,
      plan: hasSubscription ? 'pro' : 'free'
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Failed to fetch user stats:', error)
    return NextResponse.json({
      error: 'Failed to fetch user stats'
    }, { status: 500 })
  }
}