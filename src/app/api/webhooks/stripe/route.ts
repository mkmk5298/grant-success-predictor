import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createSubscription, updateUserProfile, trackAnalyticsEvent } from '@/lib/database'

export async function POST(req: NextRequest) {
  try {
    // Initialize Stripe client and webhook secret
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-02-24.acacia'
    })
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

    const body = await req.text()
    const signature = req.headers.get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    console.log('Processing Stripe webhook:', event.type)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.mode === 'subscription') {
          const subscriptionId = session.subscription as string
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          
          // Update user subscription status
          const userId = session.metadata?.userId
          if (userId) {
            await updateUserProfile(userId, {
              subscriptionStatus: 'active',
              subscriptionEnd: new Date(subscription.current_period_end * 1000)
            })

            // Store subscription in database
            await createSubscription({
              userId,
              stripeSubscriptionId: subscriptionId,
              status: subscription.status,
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000)
            })

            // Track conversion
            await trackAnalyticsEvent('subscription_started', userId, session.metadata?.sessionId, {
              subscriptionId,
              amount: session.amount_total,
              currency: session.currency
            })

            console.log('Subscription activated for user:', userId)
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        
        // Find user by subscription ID and update status
        const userId = subscription.metadata?.userId
        if (userId) {
          await updateUserProfile(userId, {
            subscriptionStatus: subscription.status as any,
            subscriptionEnd: new Date(subscription.current_period_end * 1000)
          })

          console.log('Subscription updated for user:', userId, 'Status:', subscription.status)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        
        // Find user by subscription ID and update status
        const userId = subscription.metadata?.userId
        if (userId) {
          await updateUserProfile(userId, {
            subscriptionStatus: 'cancelled',
            subscriptionEnd: new Date(subscription.current_period_end * 1000)
          })

          // Track cancellation
          await trackAnalyticsEvent('subscription_cancelled', userId, undefined, {
            subscriptionId: subscription.id,
            canceledAt: new Date().toISOString()
          })

          console.log('Subscription cancelled for user:', userId)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
          const userId = subscription.metadata?.userId
          
          if (userId) {
            // Track successful payment
            await trackAnalyticsEvent('payment_succeeded', userId, undefined, {
              subscriptionId: subscription.id,
              amount: invoice.amount_paid,
              currency: invoice.currency,
              invoiceId: invoice.id
            })

            console.log('Payment succeeded for user:', userId)
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
          const userId = subscription.metadata?.userId
          
          if (userId) {
            // Track failed payment
            await trackAnalyticsEvent('payment_failed', userId, undefined, {
              subscriptionId: subscription.id,
              amount: invoice.amount_due,
              currency: invoice.currency,
              invoiceId: invoice.id,
              failureReason: invoice.last_finalization_error?.message
            })

            console.log('Payment failed for user:', userId)
          }
        }
        break
      }

      default:
        console.log('Unhandled Stripe webhook event:', event.type)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}