'use client';
import { useEffect, useState } from 'react';

export default function TestPage() {
  const [providers, setProviders] = useState<any>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  
  useEffect(() => {
    // 콘솔에 환경변수 출력
    console.log('Environment Variables Check:');
    console.log('GOOGLE_CLIENT_ID:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
    console.log('STRIPE_KEY:', process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
    console.log('All NEXT_PUBLIC vars:', Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC')));
  }, []);

  const testGoogleLogin = async () => {
    try {
      const response = await fetch('/api/auth/providers');
      const data = await response.json();
      setProviders(data);
      console.log('Available providers:', data);
    } catch (error) {
      console.error('Failed to fetch providers:', error);
    }
  };

  const testSession = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      setSessionData(data);
      console.log('Session data:', data);
    } catch (error) {
      console.error('Failed to fetch session:', error);
    }
  };

  return (
    <div style={{ padding: '50px', background: 'white', color: 'black', fontFamily: 'monospace' }}>
      <h1>🔍 Environment Test</h1>
      <hr />
      
      <h2>Client-side Variables:</h2>
      <div style={{ background: '#f0f0f0', padding: '20px', marginBottom: '20px', borderRadius: '5px' }}>
        <p><strong>GOOGLE_CLIENT_ID:</strong> {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Not Set'}</p>
        <p><strong>STRIPE_KEY:</strong> {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? '✅ Set' : '❌ Not Set'}</p>
        <p><strong>Value Preview:</strong></p>
        <ul>
          <li>Google: {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.substring(0, 20)}...</li>
          <li>Stripe: {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.substring(0, 20)}...</li>
        </ul>
      </div>

      <h2>API Tests:</h2>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={testGoogleLogin}
          style={{ padding: '10px 20px', background: '#4285f4', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          Test Auth Providers
        </button>
        <button 
          onClick={testSession}
          style={{ padding: '10px 20px', background: '#34a853', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          Test Session
        </button>
      </div>

      {providers && (
        <div style={{ background: '#e8f5e9', padding: '20px', marginBottom: '20px', borderRadius: '5px' }}>
          <h3>Available Auth Providers:</h3>
          <pre>{JSON.stringify(providers, null, 2)}</pre>
        </div>
      )}

      {sessionData && (
        <div style={{ background: '#e3f2fd', padding: '20px', marginBottom: '20px', borderRadius: '5px' }}>
          <h3>Current Session:</h3>
          <pre>{JSON.stringify(sessionData, null, 2)}</pre>
        </div>
      )}

      <h2>Quick Links:</h2>
      <div style={{ display: 'flex', gap: '10px' }}>
        <a href="/api/auth/signin" style={{ color: '#4285f4' }}>→ Sign In Page</a>
        <a href="/api/auth/providers" style={{ color: '#4285f4' }}>→ Providers API</a>
        <a href="/api/auth/session" style={{ color: '#4285f4' }}>→ Session API</a>
        <a href="/api/health" style={{ color: '#4285f4' }}>→ Health Check</a>
      </div>

      <div style={{ marginTop: '40px', padding: '20px', background: '#fff3cd', borderRadius: '5px' }}>
        <p><strong>⚠️ Debug Info:</strong></p>
        <p>1. Check browser console for detailed logs</p>
        <p>2. All environment variables starting with NEXT_PUBLIC_ are visible in client</p>
        <p>3. Server-only variables (without NEXT_PUBLIC_) are not visible here</p>
        <p>4. After adding env vars in Vercel, redeploy is required</p>
      </div>
    </div>
  );
}