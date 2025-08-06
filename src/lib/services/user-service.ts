/**
 * Enhanced User Service for Grant Predictor
 * Handles user authentication, profile management, and subscription tracking
 */

import { createUser, getUserByEmail, updateUserProfile as dbUpdateUserProfile, updateUserUsage } from '@/lib/database'
import { logger } from '@/lib/logger'

export interface UserProfile {
  id: string
  email: string
  name: string
  googleId?: string
  picture?: string
  organizationName?: string
  organizationType?: string
  subscriptionStatus: 'free' | 'pro' | 'enterprise'
  subscriptionEnd?: Date
  profileData?: {
    mission?: string
    focusAreas?: string[]
    annualBudget?: number
    staffSize?: number
    yearsOperating?: number
    previousGrants?: string[]
    geographicScope?: string[]
  }
  usage: {
    totalAnalyses: number
    monthlyAnalyses: number
    lastAnalysis?: Date
  }
  createdAt: Date
  updatedAt: Date
}

export interface CreateUserRequest {
  email: string
  name: string
  googleId?: string
  picture?: string
  organizationName?: string
  organizationType?: string
}

export interface UpdateProfileRequest {
  organizationName?: string
  organizationType?: string
  profileData?: {
    mission?: string
    focusAreas?: string[]
    annualBudget?: number
    staffSize?: number
    yearsOperating?: number
    previousGrants?: string[]
    geographicScope?: string[]
  }
}

export class UserService {
  
  async createOrUpdateUser(userData: CreateUserRequest): Promise<UserProfile | null> {
    try {
      logger.info('Creating or updating user', {
        email: userData.email,
        name: userData.name,
        hasGoogleId: !!userData.googleId
      })

      const existingUser = await getUserByEmail(userData.email)
      
      if (existingUser) {
        // User exists, update if needed
        logger.info('User already exists, updating profile', {
          userId: existingUser.id,
          email: userData.email
        })
        
        return this.mapDbUserToProfile(existingUser)
      }

      // Create new user
      const newUser = await createUser({
        email: userData.email,
        name: userData.name,
        googleId: userData.googleId,
        picture: userData.picture
      })

      if (!newUser) {
        throw new Error('Failed to create user in database')
      }

      logger.info('New user created successfully', {
        userId: newUser.id,
        email: userData.email
      })

      return this.mapDbUserToProfile(newUser)

    } catch (error) {
      logger.error('Failed to create or update user', {
        email: userData.email
      }, error)
      return null
    }
  }

  async getUserProfile(email: string): Promise<UserProfile | null> {
    try {
      const user = await getUserByEmail(email)
      
      if (!user) {
        return null
      }

      return this.mapDbUserToProfile(user)

    } catch (error) {
      logger.error('Failed to get user profile', { email }, error)
      return null
    }
  }

  async updateUserProfile(
    email: string, 
    updates: UpdateProfileRequest
  ): Promise<UserProfile | null> {
    try {
      logger.info('Updating user profile', {
        email,
        hasOrganizationUpdates: !!(updates.organizationName || updates.organizationType),
        hasProfileDataUpdates: !!updates.profileData
      })

      // Update user profile in database
      const updatedUser = await dbUpdateUserProfile(email, {
        organizationName: updates.organizationName,
        organizationType: updates.organizationType,
        profileData: updates.profileData
      })
      
      if (!updatedUser) {
        logger.warn('User profile update failed - user not found', { email })
        return null
      }

      logger.info('User profile updated successfully', {
        email,
        userId: updatedUser.id
      })

      return this.mapDbUserToProfile(updatedUser)

    } catch (error) {
      logger.error('Failed to update user profile', { email }, error)
      return null
    }
  }

  async canUserMakeAnalysis(email: string): Promise<{ canAnalyze: boolean, reason?: string }> {
    try {
      const user = await getUserByEmail(email)
      
      if (!user) {
        return { canAnalyze: true, reason: 'Guest user - allowed one free analysis' }
      }

      // Check subscription status
      if (user.subscription_status === 'pro' || user.subscription_status === 'enterprise') {
        return { canAnalyze: true }
      }

      // For free users, check if they've used their free analysis
      // This would be implemented with proper usage tracking
      return { canAnalyze: true, reason: 'Free analysis available' }

    } catch (error) {
      logger.error('Failed to check user analysis permissions', { email }, error)
      return { canAnalyze: false, reason: 'Error checking permissions' }
    }
  }

  async recordAnalysisUsage(email: string): Promise<void> {
    try {
      logger.info('Recording analysis usage', { email })
      
      // Update user's usage counters in database
      const updatedUser = await updateUserUsage(email, true)
      
      if (updatedUser) {
        logger.info('Analysis usage recorded successfully', {
          email,
          totalAnalyses: updatedUser.total_analyses,
          monthlyAnalyses: updatedUser.monthly_analyses
        })
      } else {
        logger.warn('Failed to update usage counters', { email })
      }
      
    } catch (error) {
      logger.error('Failed to record analysis usage', { email }, error)
    }
  }

  async getUserAnalyticsData(email: string): Promise<any> {
    try {
      const user = await getUserByEmail(email)
      
      if (!user) {
        return null
      }

      // TODO: Get actual analytics from database
      return {
        totalAnalyses: 0,
        monthlyAnalyses: 0,
        averageSuccessRate: 0,
        topGrantCategories: [],
        recentAnalyses: []
      }

    } catch (error) {
      logger.error('Failed to get user analytics', { email }, error)
      return null
    }
  }

  async searchUsers(query: string, limit: number = 10): Promise<UserProfile[]> {
    try {
      // TODO: Implement user search functionality
      logger.info('Searching users', { query, limit })
      
      return []

    } catch (error) {
      logger.error('Failed to search users', { query }, error)
      return []
    }
  }

  async getUsersByOrganization(organizationType: string): Promise<UserProfile[]> {
    try {
      // TODO: Implement organization-based user query
      logger.info('Getting users by organization type', { organizationType })
      
      return []

    } catch (error) {
      logger.error('Failed to get users by organization', { organizationType }, error)
      return []
    }
  }

  private mapDbUserToProfile(dbUser: any): UserProfile {
    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      googleId: dbUser.google_id,
      picture: dbUser.picture,
      organizationName: dbUser.organization_name,
      organizationType: dbUser.organization_type,
      subscriptionStatus: dbUser.subscription_status || 'free',
      subscriptionEnd: dbUser.subscription_end ? new Date(dbUser.subscription_end) : undefined,
      profileData: this.parseProfileData(dbUser.profile_data),
      usage: {
        totalAnalyses: dbUser.total_analyses || 0,
        monthlyAnalyses: dbUser.monthly_analyses || 0,
        lastAnalysis: dbUser.last_analysis ? new Date(dbUser.last_analysis) : undefined
      },
      createdAt: new Date(dbUser.created_at),
      updatedAt: new Date(dbUser.updated_at)
    }
  }

  private parseProfileData(profileDataJson: any): any {
    if (!profileDataJson) {
      return {}
    }

    try {
      if (typeof profileDataJson === 'string') {
        return JSON.parse(profileDataJson)
      }
      return profileDataJson
    } catch (error) {
      logger.warn('Failed to parse profile data JSON', {}, error)
      return {}
    }
  }

  // Utility methods
  getSubscriptionLimits(subscriptionStatus: string): any {
    const limits = {
      free: {
        monthlyAnalyses: 3,
        advancedFeatures: false,
        prioritySupport: false
      },
      pro: {
        monthlyAnalyses: 50,
        advancedFeatures: true,
        prioritySupport: false
      },
      enterprise: {
        monthlyAnalyses: -1, // Unlimited
        advancedFeatures: true,
        prioritySupport: true
      }
    }

    return limits[subscriptionStatus as keyof typeof limits] || limits.free
  }

  isSubscriptionActive(user: UserProfile): boolean {
    if (user.subscriptionStatus === 'free') {
      return true
    }

    if (!user.subscriptionEnd) {
      return false
    }

    return new Date() < user.subscriptionEnd
  }

  getUserTier(user: UserProfile): 'free' | 'pro' | 'enterprise' {
    if (!this.isSubscriptionActive(user)) {
      return 'free'
    }

    return user.subscriptionStatus
  }

  // Service information
  getServiceInfo() {
    return {
      serviceName: 'User Service',
      version: '1.0.0',
      capabilities: [
        'User profile management',
        'Subscription tracking',
        'Usage analytics',
        'Permission management',
        'Organization management'
      ],
      supportedSubscriptionTiers: ['free', 'pro', 'enterprise'],
      lastUpdated: new Date().toISOString()
    }
  }
}