/**
 * NextAuth Type Extensions
 * Extends NextAuth types to include custom user properties
 */

import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT, DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
    } & DefaultSession['user'];
    subscription?: {
      status: string;
      uploadsUsed: number;
      uploadsLimit: number;
    };
  }

  interface User extends DefaultUser {
    id: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    userId?: string;
    email?: string;
    accessToken?: string;
  }
}