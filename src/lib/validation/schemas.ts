/**
 * Input Validation Schemas using Zod
 * Comprehensive validation for all API endpoints and user inputs
 */

import { z } from 'zod'

// Base validation patterns
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
const FILENAME_REGEX = /^[a-zA-Z0-9._-]+\.[a-zA-Z]{2,4}$/
const SAFE_STRING_REGEX = /^[a-zA-Z0-9\s\-_.,!?()]+$/

// Custom validation helpers
export const sanitizeString = (str: string): string => {
  return str.trim().replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
}

export const validateFileType = (mimeType: string, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(mimeType)
}

// Common field schemas
export const emailSchema = z.string()
  .min(1, 'Email is required')
  .max(254, 'Email too long')
  .regex(EMAIL_REGEX, 'Invalid email format')
  .transform(sanitizeString)

export const nameSchema = z.string()
  .min(1, 'Name is required')
  .max(100, 'Name too long')
  .regex(/^[a-zA-Z\s\-'\.]+$/, 'Name contains invalid characters')
  .transform(sanitizeString)

export const organizationNameSchema = z.string()
  .min(1, 'Organization name is required')
  .max(255, 'Organization name too long')
  .regex(SAFE_STRING_REGEX, 'Organization name contains invalid characters')
  .transform(sanitizeString)

export const organizationTypeSchema = z.enum([
  'nonprofit', 
  'university', 
  'startup', 
  'corporation', 
  'individual'
], {
  errorMap: () => ({ message: 'Invalid organization type' })
})

export const experienceLevelSchema = z.enum([
  'beginner', 
  'intermediate', 
  'expert'
], {
  errorMap: () => ({ message: 'Invalid experience level' })
})

export const fundingAmountSchema = z.number()
  .min(1000, 'Minimum funding amount is $1,000')
  .max(10000000, 'Maximum funding amount is $10,000,000')
  .int('Funding amount must be a whole number')

// File validation schema
export const fileDataSchema = z.object({
  name: z.string()
    .min(1, 'Filename is required')
    .max(255, 'Filename too long')
    .regex(FILENAME_REGEX, 'Invalid filename format')
    .refine(
      (filename) => !filename.includes('..') && !filename.includes('/') && !filename.includes('\\'),
      'Filename contains invalid path characters'
    )
    .refine(
      (filename) => {
        const suspiciousPatterns = [
          /\.exe$/i, /\.bat$/i, /\.cmd$/i, /\.com$/i, /\.scr$/i, 
          /\.pif$/i, /\.js$/i, /\.vbs$/i, /\.jar$/i, /\.php$/i
        ]
        return !suspiciousPatterns.some(pattern => pattern.test(filename))
      },
      'File type not allowed for security reasons'
    ),
  type: z.string()
    .refine(
      (mimeType) => [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ].includes(mimeType),
      'Invalid file type'
    ),
  size: z.number()
    .min(100, 'File too small or empty')
    .max(10 * 1024 * 1024, 'File too large (max 10MB)'),
  content: z.string()
    .min(1, 'File content is required')
    .max(50 * 1024 * 1024, 'Base64 content too large') // Base64 is ~33% larger
})

// Application data schema
export const applicationSchema = z.object({
  projectTitle: z.string()
    .min(1, 'Project title is required')
    .max(500, 'Project title too long')
    .regex(SAFE_STRING_REGEX, 'Project title contains invalid characters')
    .transform(sanitizeString)
    .optional(),
  projectSummary: z.string()
    .max(2000, 'Project summary too long')
    .regex(SAFE_STRING_REGEX, 'Project summary contains invalid characters')
    .transform(sanitizeString)
    .optional(),
  proposalText: z.string()
    .max(50000, 'Proposal text too long')
    .transform(sanitizeString)
    .optional()
})

// Main prediction request schema
export const predictionRequestSchema = z.object({
  organizationName: organizationNameSchema,
  organizationType: organizationTypeSchema,
  fundingAmount: fundingAmountSchema.default(100000),
  experienceLevel: experienceLevelSchema,
  hasPartnership: z.boolean().default(false),
  hasPreviousGrants: z.boolean().default(false),
  userId: z.string()
    .uuid('Invalid user ID format')
    .optional(),
  sessionToken: z.string()
    .min(10, 'Invalid session token')
    .max(1000, 'Session token too long')
    .optional(),
  fileData: fileDataSchema.optional(),
  application: applicationSchema.optional(),
  userEmail: emailSchema.optional(),
  userName: nameSchema.optional()
})

// User creation/update schemas
export const createUserSchema = z.object({
  email: emailSchema,
  name: nameSchema,
  googleId: z.string()
    .min(1, 'Google ID is required')
    .max(100, 'Google ID too long')
    .optional(),
  picture: z.string()
    .url('Invalid picture URL')
    .max(500, 'Picture URL too long')
    .optional(),
  organizationName: organizationNameSchema.optional(),
  organizationType: organizationTypeSchema.optional()
})

export const updateUserSchema = createUserSchema.partial()

// Authentication schemas
export const authRequestSchema = z.object({
  email: emailSchema,
  provider: z.enum(['google'], {
    errorMap: () => ({ message: 'Invalid auth provider' })
  }),
  token: z.string()
    .min(1, 'Auth token is required')
    .max(2000, 'Auth token too long')
})

// Signup request schema
export const authSignupSchema = z.object({
  email: emailSchema,
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  name: nameSchema,
  organizationName: organizationNameSchema.optional(),
  organizationType: organizationTypeSchema.optional(),
  savedResults: z.any().optional()
})

// Grant search schema
export const grantSearchSchema = z.object({
  query: z.string()
    .min(1, 'Search query is required')
    .max(200, 'Search query too long')
    .regex(SAFE_STRING_REGEX, 'Search query contains invalid characters')
    .transform(sanitizeString),
  category: z.string()
    .max(100, 'Category too long')
    .regex(SAFE_STRING_REGEX, 'Category contains invalid characters')
    .transform(sanitizeString)
    .optional(),
  minAmount: z.number()
    .min(0, 'Minimum amount cannot be negative')
    .max(10000000, 'Minimum amount too high')
    .optional(),
  maxAmount: z.number()
    .min(0, 'Maximum amount cannot be negative')
    .max(10000000, 'Maximum amount too high')
    .optional(),
  deadline: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .optional(),
  limit: z.number()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(10),
  offset: z.number()
    .min(0, 'Offset cannot be negative')
    .default(0)
}).refine(
  (data) => !data.minAmount || !data.maxAmount || data.minAmount <= data.maxAmount,
  {
    message: 'Minimum amount cannot be greater than maximum amount',
    path: ['minAmount']
  }
)

// Payment/subscription schemas
export const subscriptionSchema = z.object({
  priceId: z.string()
    .min(1, 'Price ID is required')
    .max(100, 'Price ID too long')
    .regex(/^price_[a-zA-Z0-9_]+$/, 'Invalid Stripe price ID format'),
  userId: z.string()
    .uuid('Invalid user ID format'),
  successUrl: z.string()
    .url('Invalid success URL')
    .max(500, 'Success URL too long'),
  cancelUrl: z.string()
    .url('Invalid cancel URL')
    .max(500, 'Cancel URL too long')
})

// Analytics event schema
export const analyticsEventSchema = z.object({
  eventType: z.string()
    .min(1, 'Event type is required')
    .max(100, 'Event type too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid event type format'),
  userId: z.string()
    .uuid('Invalid user ID format')
    .optional(),
  sessionId: z.string()
    .min(1, 'Session ID is required')
    .max(100, 'Session ID too long')
    .optional(),
  eventData: z.record(z.any()).optional()
})

// Rate limit bypass schema (for admin/testing)
export const rateLimitBypassSchema = z.object({
  identifier: z.string()
    .min(1, 'Identifier is required')
    .max(100, 'Identifier too long'),
  adminKey: z.string()
    .min(1, 'Admin key is required')
    .refine(
      (key) => key === process.env.ADMIN_BYPASS_KEY,
      'Invalid admin key'
    )
})

// Validation utility functions
export const validateRequest = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
      
      throw new Error(`Validation failed: ${JSON.stringify(formattedErrors)}`)
    }
    throw error
  }
}

export const validateRequestSafe = <T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean
  data?: T
  errors?: Array<{ field: string; message: string; code: string }>
} => {
  try {
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
      
      return { success: false, errors: formattedErrors }
    }
    return { 
      success: false, 
      errors: [{ field: 'unknown', message: 'Unknown validation error', code: 'internal_error' }] 
    }
  }
}

// Export all schemas for use in API routes
export const schemas = {
  predictionRequest: predictionRequestSchema,
  createUser: createUserSchema,
  updateUser: updateUserSchema,
  authRequest: authRequestSchema,
  authSignup: authSignupSchema,
  grantSearch: grantSearchSchema,
  subscription: subscriptionSchema,
  analyticsEvent: analyticsEventSchema,
  rateLimitBypass: rateLimitBypassSchema,
  fileData: fileDataSchema,
  application: applicationSchema
}