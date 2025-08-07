/**
 * AI Advice Service
 * Intelligent provider selection and fallback handling
 */

import { 
  aiConfig, 
  getAvailableProviders, 
  getPrimaryProvider, 
  getSecondaryProvider,
  advicePrompts,
  AdviceRequest, 
  AdviceResponse 
} from './config';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { logger } from '../logger';

export class AIAdviceService {
  private openaiProvider?: OpenAIProvider;
  private anthropicProvider?: AnthropicProvider;
  
  constructor() {
    // Initialize providers if available
    if (aiConfig.openai.enabled) {
      this.openaiProvider = new OpenAIProvider(aiConfig.openai);
    }
    
    if (aiConfig.anthropic.enabled) {
      this.anthropicProvider = new AnthropicProvider(aiConfig.anthropic);
    }
  }
  
  /**
   * Generate comprehensive grant improvement advice
   */
  async generateAdvice(request: AdviceRequest): Promise<AdviceResponse> {
    const providers = getAvailableProviders();
    
    if (providers.length === 0) {
      throw new Error('No AI providers are configured. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variables.');
    }
    
    const prompt = this.getPromptForAdviceType(request.adviceType);
    
    // Try primary provider first
    let lastError: Error | null = null;
    
    for (const provider of providers) {
      try {
        logger.info('Attempting AI advice generation', {
          provider: provider.name,
          model: provider.model,
          adviceType: request.adviceType,
          analysisId: request.analysisId
        });
        
        const response = await this.generateWithProvider(provider, request, prompt);
        
        logger.info('AI advice generated successfully', {
          provider: provider.name,
          confidence: response.confidence,
          processingTime: response.processingTime,
          tokenUsage: response.tokenUsage
        });
        
        return response;
        
      } catch (error) {
        lastError = error as Error;
        logger.warn('AI provider failed, trying next', {
          provider: provider.name,
          error: lastError.message
        });
        
        // Continue to next provider
        continue;
      }
    }
    
    // All providers failed
    throw new Error(`All AI providers failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }
  
  /**
   * Generate advice with specific provider
   */
  private async generateWithProvider(
    provider: any,
    request: AdviceRequest,
    prompt: string
  ): Promise<AdviceResponse> {
    if (provider.name === 'openai' && this.openaiProvider) {
      return await this.openaiProvider.generateAdvice(request, prompt);
    } else if (provider.name === 'anthropic' && this.anthropicProvider) {
      return await this.anthropicProvider.generateAdvice(request, prompt);
    } else {
      throw new Error(`Provider ${provider.name} not available`);
    }
  }
  
  /**
   * Get prompt template for advice type
   */
  private getPromptForAdviceType(adviceType: string): string {
    switch (adviceType) {
      case 'narrative':
        return advicePrompts.narrativeImprovement;
      case 'budget':
        return advicePrompts.budgetOptimization;
      case 'comprehensive':
      case 'strategic':
      default:
        return advicePrompts.grantImprovement;
    }
  }
  
  /**
   * Test AI provider connections
   */
  async testConnections(): Promise<{
    openai: boolean;
    anthropic: boolean;
    available: string[];
  }> {
    const results = {
      openai: false,
      anthropic: false,
      available: [] as string[]
    };
    
    if (this.openaiProvider) {
      try {
        results.openai = await this.openaiProvider.testConnection();
        if (results.openai) {
          results.available.push('openai');
        }
      } catch (error) {
        logger.warn('OpenAI connection test failed', { error });
      }
    }
    
    if (this.anthropicProvider) {
      try {
        results.anthropic = await this.anthropicProvider.testConnection();
        if (results.anthropic) {
          results.available.push('anthropic');
        }
      } catch (error) {
        logger.warn('Anthropic connection test failed', { error });
      }
    }
    
    return results;
  }
  
  /**
   * Get available providers info
   */
  getProvidersInfo(): {
    total: number;
    enabled: string[];
    primary: string | null;
    secondary: string | null;
  } {
    const providers = getAvailableProviders();
    const primary = getPrimaryProvider();
    const secondary = getSecondaryProvider();
    
    return {
      total: providers.length,
      enabled: providers.map(p => p.name),
      primary: primary?.name || null,
      secondary: secondary?.name || null,
    };
  }
  
  /**
   * Generate multiple advice types for comprehensive analysis
   */
  async generateComprehensiveAdvice(request: AdviceRequest): Promise<{
    comprehensive: AdviceResponse;
    narrative?: AdviceResponse;
    budget?: AdviceResponse;
  }> {
    const results: any = {};
    
    // Always generate comprehensive advice
    results.comprehensive = await this.generateAdvice({
      ...request,
      adviceType: 'comprehensive'
    });
    
    // Generate additional advice types if we have multiple providers or high success
    const providersInfo = this.getProvidersInfo();
    
    if (providersInfo.total > 1 || request.successProbability < 60) {
      try {
        results.narrative = await this.generateAdvice({
          ...request,
          adviceType: 'narrative'
        });
      } catch (error) {
        logger.warn('Failed to generate narrative advice', { error });
      }
      
      try {
        results.budget = await this.generateAdvice({
          ...request,
          adviceType: 'budget'
        });
      } catch (error) {
        logger.warn('Failed to generate budget advice', { error });
      }
    }
    
    return results;
  }
  
  /**
   * Rate limit check for AI usage
   */
  async checkRateLimit(userId?: string): Promise<boolean> {
    // Implement rate limiting logic here
    // For now, return true (no limits)
    return true;
  }
}