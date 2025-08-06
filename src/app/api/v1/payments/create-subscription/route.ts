import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { trackAnalyticsEvent } from '@/lib/database'

export async function POST(req: NextRequest) {
  try {
    // Initialize Stripe client
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-02-24.acacia'
    })

    const userId = req.headers.get('x-user-id')
    const userEmail = req.headers.get('x-user-email')
    const sessionId = req.headers.get('x-session-id')
    
    // Get origin for redirect URLs
    const origin = req.headers.get('origin') || 'http://localhost:3000'
    
    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Grant Predictor Pro',
              description: 'Unlimited grant analysis and AI recommendations',
            },
            unit_amount: 1900, // $19.00 in cents
            recurring: {
              interval: 'month'
            }
          },
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${origin}/dashboard?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${origin}/?cancelled=true`,
      customer_email: userEmail || undefined,
      metadata: {
        userId: userId || '',
        sessionId: sessionId || ''
      },
      subscription_data: {
        metadata: {
          userId: userId || '',
          sessionId: sessionId || ''
        }
      }
    })

    // Track analytics event
    await trackAnalyticsEvent('payment_wall_checkout_started', userId || undefined, sessionId || undefined, {
      priceId: 'grant_predictor_pro_monthly',
      amount: 1900
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url
    })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}