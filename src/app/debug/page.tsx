'use client';

export default function DebugPage() {
  return (
    <div className='p-8 bg-white text-black'>
      <h1 className='text-2xl font-bold mb-4'>Environment Debug</h1>
      <div className='space-y-2'>
        <p>Google Client ID: {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Not Set'}</p>
        <p>Stripe Key: {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? '✅ Set' : '❌ Not Set'}</p>
        <p>NextAuth URL: {process.env.NEXTAUTH_URL || 'Not visible in client'}</p>
      </div>
      <div className='mt-4 p-4 bg-gray-100 rounded'>
        <p className='text-sm'>Visit /debug after deployment to check environment variables</p>
      </div>
    </div>
  );
}