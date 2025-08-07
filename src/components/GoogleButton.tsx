'use client';
import { signIn } from 'next-auth/react';

export default function GoogleButton() {
  const handleLogin = async () => {
    try {
      console.log('Google login attempt...');
      const result = await signIn('google', { 
        callbackUrl: '/dashboard',
        redirect: true 
      });
      console.log('Login result:', result);
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed - check console');
    }
  };

  return (
    <button
      onClick={handleLogin}
      className='w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50'
      style={{ color: '#374151', backgroundColor: '#ffffff' }}
    >
      Sign in with Google
    </button>
  );
}