/**
 * Database Models
 * Comprehensive data models for Grant Predictor Platform
 */

// User Model
export interface User {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  googleId: string | null;
  emailVerified: boolean;
  
  // Subscription info
  subscriptionStatus: 'free' | 'trial' | 'active' | 'cancelled' | 'expired';
  subscriptionId: string | null;
  subscriptionEndDate: Date | null;
  stripeCustomerId: string | null;
  
  // Usage tracking
  uploadsUsed: number;
  uploadsLimit: number;
  lastUploadDate: Date | null;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  loginCount: number;
}

// Session Model (for NextAuth)
export interface Session {
  id: string;
  sessionToken: string;
  userId: string;
  expires: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Account Model (for OAuth providers)
export interface Account {
  id: string;
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refreshToken: string | null;
  accessToken: string | null;
  expiresAt: number | null;
  tokenType: string | null;
  scope: string | null;
  idToken: string | null;
  sessionState: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Grant Analysis Model
export interface GrantAnalysis {
  id: string;
  userId: string | null; // Can be null for guest users
  sessionId: string; // Track guest sessions
  
  // Organization info
  organizationName: string;
  organizationType: 'nonprofit' | 'university' | 'startup' | 'corporation' | 'individual';
  fundingAmount: number;
  experienceLevel: 'beginner' | 'intermediate' | 'expert';
  hasPartnership: boolean;
  hasPreviousGrants: boolean;
  
  // File info (if uploaded)
  fileName: string | null;
  fileSize: number | null;
  fileType: string | null;
  fileUrl: string | null; // S3 or cloud storage URL
  
  // Analysis results
  successProbability: number;
  recommendations: string[];
  matchingGrants: MatchingGrant[];
  
  // AI Processing
  aiModel: string;
  processingTime: number; // in milliseconds
  tokenUsage: number | null;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  tags: string[];
}

// Matching Grant Model
export interface MatchingGrant {
  id: string;
  analysisId: string;
  
  // Grant details
  grantId: string;
  title: string;
  fundingOrganization: string;
  amount: number;
  deadline: Date;
  matchPercentage: number;
  
  // Requirements
  eligibilityCriteria: string[];
  requiredDocuments: string[];
  
  // URLs
  applicationUrl: string | null;
  guidelinesUrl: string | null;
  
  // Metadata
  createdAt: Date;
  category: string;
  tags: string[];
}

// Subscription Model (Stripe integration)
export interface Subscription {
  id: string;
  userId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  stripePriceId: string;
  
  // Status
  status: 'active' | 'cancelled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid';
  cancelAtPeriodEnd: boolean;
  
  // Dates
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelledAt: Date | null;
  endedAt: Date | null;
  trialStart: Date | null;
  trialEnd: Date | null;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Payment Model
export interface Payment {
  id: string;
  userId: string;
  subscriptionId: string | null;
  
  // Stripe info
  stripePaymentIntentId: string;
  stripeInvoiceId: string | null;
  
  // Payment details
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled';
  paymentMethod: string;
  
  // Metadata
  description: string | null;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Upload Session Model (for tracking free uploads)
export interface UploadSession {
  id: string;
  sessionId: string; // Browser session ID
  ipAddress: string;
  userAgent: string;
  
  // Tracking
  uploadsCount: number;
  firstUploadAt: Date;
  lastUploadAt: Date;
  
  // Limits
  isBlocked: boolean;
  blockReason: string | null;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Audit Log Model
export interface AuditLog {
  id: string;
  userId: string | null;
  sessionId: string | null;
  
  // Action details
  action: string;
  entity: string;
  entityId: string | null;
  
  // Changes
  oldValues: Record<string, any> | null;
  newValues: Record<string, any> | null;
  
  // Context
  ipAddress: string;
  userAgent: string;
  
  // Metadata
  createdAt: Date;
  metadata: Record<string, any>;
}

// Grant Database Model (for grant matching)
export interface Grant {
  id: string;
  
  // Basic info
  title: string;
  description: string;
  fundingOrganization: string;
  organizationType: string;
  
  // Funding details
  minAmount: number;
  maxAmount: number;
  averageAmount: number;
  currency: string;
  
  // Dates
  openDate: Date;
  deadline: Date;
  announcementDate: Date | null;
  
  // Eligibility
  eligibleOrganizationTypes: string[];
  eligibleRegions: string[];
  eligibleSectors: string[];
  requiredDocuments: string[];
  
  // URLs
  applicationUrl: string;
  guidelinesUrl: string | null;
  contactEmail: string | null;
  
  // Statistics
  totalApplications: number;
  successRate: number;
  averageProcessingTime: number; // in days
  
  // Metadata
  isActive: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  lastVerifiedAt: Date;
}

// API Key Model (for API access)
export interface ApiKey {
  id: string;
  userId: string;
  key: string;
  name: string;
  
  // Permissions
  scopes: string[];
  rateLimit: number; // requests per minute
  
  // Usage
  usageCount: number;
  lastUsedAt: Date | null;
  
  // Status
  isActive: boolean;
  expiresAt: Date | null;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Webhook Model (for external integrations)
export interface Webhook {
  id: string;
  userId: string;
  
  // Configuration
  url: string;
  events: string[];
  secret: string;
  
  // Status
  isActive: boolean;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  failureCount: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Notification Model
export interface Notification {
  id: string;
  userId: string;
  
  // Content
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  actionUrl: string | null;
  
  // Status
  isRead: boolean;
  readAt: Date | null;
  
  // Metadata
  createdAt: Date;
  expiresAt: Date | null;
}

// Feature Flag Model (for gradual rollouts)
export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  
  // Configuration
  isEnabled: boolean;
  rolloutPercentage: number;
  
  // Targeting
  targetUserIds: string[];
  targetUserGroups: string[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string;
}

// All model types are already exported as interfaces above

// Type guards
export function isUser(obj: any): obj is User {
  return obj && typeof obj.email === 'string' && typeof obj.id === 'string';
}

export function isGrantAnalysis(obj: any): obj is GrantAnalysis {
  return obj && typeof obj.organizationName === 'string' && typeof obj.successProbability === 'number';
}

export function isSubscription(obj: any): obj is Subscription {
  return obj && typeof obj.stripeSubscriptionId === 'string' && typeof obj.status === 'string';
}