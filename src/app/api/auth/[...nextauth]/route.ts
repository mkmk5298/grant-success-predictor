/**
 * NextAuth Configuration with Database Integration
 * L10 Distinguished Engineer Implementation
 */

import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { UserService } from '@/lib/database/services/UserService';
import { EncryptJWT, jwtDecrypt } from 'jose';

// Encryption key for JWT tokens
const getJWTSecret = () => {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET must be set for token encryption')
  }
  return new TextEncoder().encode(secret)
}

// Encrypt sensitive token data
async function encryptToken(payload: any): Promise<string> {
  return await new EncryptJWT(payload)
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .encrypt(getJWTSecret())
}

// Decrypt sensitive token data
async function decryptToken(encryptedToken: string): Promise<any> {
  try {
    const { payload } = await jwtDecrypt(encryptedToken, getJWTSecret())
    return payload
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Token decryption failed:', error)
    }
    return null
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    })
  ],
  
  secret: process.env.NEXTAUTH_SECRET,
  
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        try {
          // Check if user exists
          let dbUser = await UserService.findByEmail(user.email!);
          
          if (!dbUser) {
            // Create new user
            dbUser = await UserService.createUser({
              email: user.email!,
              name: user.name || profile?.name,
              picture: user.image || profile?.image,
              googleId: account.providerAccountId,
              emailVerified: true,
            });
          } else {
            // Update existing user
            await UserService.updateUser(dbUser.id, {
              name: user.name || profile?.name || dbUser.name,
              picture: user.image || profile?.image || dbUser.picture,
              googleId: account.providerAccountId,
            });
            
            // Update login timestamp
            await UserService.updateLastLogin(dbUser.id);
          }
          
          // Store user ID in the token
          user.id = dbUser.id;
          
          return true;
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error during sign in:', error);
          }
          return false;
        }
      }
      
      return true;
    },
    
    async jwt({ token, account, user }) {
      // Initial sign in
      if (account && user) {
        // Encrypt sensitive access token before storing
        if (account.access_token) {
          try {
            token.encryptedAccessToken = await encryptToken({ 
              accessToken: account.access_token,
              provider: account.provider,
              expiresAt: account.expires_at
            });
            // Remove plain text access token
            delete token.accessToken;
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.error('Failed to encrypt access token:', error);
            }
            // Fallback: don't store access token if encryption fails
          }
        }
        
        token.userId = user.id;
        token.email = user.email || undefined;
      }
      
      // Return previous token if the access token has not expired yet
      return token;
    },
    
    async session({ session, token }) {
      // Send properties to the client
      if (token && session.user) {
        session.user.id = token.userId as string;
        session.user.email = token.email as string;
        
        // Fetch fresh user data from database
        try {
          const dbUser = await UserService.findById(token.userId as string);
          
          if (dbUser) {
            session.user.name = dbUser.name || session.user.name;
            session.user.image = dbUser.picture || session.user.image;
            
            // Add subscription status to session
            (session as any).subscription = {
              status: dbUser.subscriptionStatus,
              uploadsUsed: dbUser.uploadsUsed,
              uploadsLimit: dbUser.uploadsLimit,
            };
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error fetching user data:', error);
          }
        }
      }
      
      return session;
    },
    
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    }
  },
  
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
  },
  
  events: {
    async signIn({ user, account }) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`User ${user.email} signed in via ${account?.provider}`);
      }
    },
    async signOut({ session, token }) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`User signed out`);
      }
    },
    async createUser({ user }) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`New user created: ${user.email}`);
      }
    },
    async updateUser({ user }) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`User updated: ${user.email}`);
      }
    },
    async linkAccount({ user, account }) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Account linked: ${account.provider} for ${user.email}`);
      }
    },
    async session({ session, token }) {
      // Could be used for session tracking
    }
  },
  
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };