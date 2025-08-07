/**
 * OpenAI Provider
 * GPT-4 integration for grant advice
 */

import { AIProvider, AdviceRequest, AdviceResponse } from '../config';
import crypto from 'crypto';

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIProvider {
  private config: AIProvider;
  
  constructor(config: AIProvider) {
    this.config = config;
  }
  
  async generateAdvice(request: AdviceRequest, prompt: string): Promise<AdviceResponse> {
    const startTime = Date.now();
    
    try {
      // Replace template variables in prompt
      const processedPrompt = this.processPromptTemplate(prompt, request);
      
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: 'You are a world-class grant writing expert. Provide specific, actionable advice in structured JSON format. Be thorough but concise.'
            },
            {
              role: 'user',
              content: processedPrompt
            }
          ],
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          response_format: { type: "json_object" }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }
      
      const data: OpenAIResponse = await response.json();
      const content = JSON.parse(data.choices[0].message.content);
      
      return {
        id: crypto.randomUUID(),
        analysisId: request.analysisId,
        provider: 'openai',
        model: data.model,
        adviceType: request.adviceType,
        content,
        confidence: this.calculateConfidence(content),
        processingTime: Date.now() - startTime,
        tokenUsage: data.usage.total_tokens,
        createdAt: new Date(),
      };
      
    } catch (error) {
      console.error('OpenAI Provider Error:', error);
      throw error;
    }
  }
  
  private processPromptTemplate(prompt: string, request: AdviceRequest): string {
    return prompt
      .replace(/\{organizationName\}/g, request.organizationName)
      .replace(/\{organizationType\}/g, request.organizationType)
      .replace(/\\{fundingAmount\\}/g, request.fundingAmount.toLocaleString())
      .replace(/\{experienceLevel\}/g, request.experienceLevel)
      .replace(/\{hasPartnership\}/g, request.hasPartnership.toString())
      .replace(/\{hasPreviousGrants\}/g, request.hasPreviousGrants.toString())
      .replace(/\{successProbability\}/g, request.successProbability.toString())
      .replace(/\{organizationData\}/g, JSON.stringify({
        name: request.organizationName,
        type: request.organizationType,
        experience: request.experienceLevel,
        partnerships: request.hasPartnership,
        previousGrants: request.hasPreviousGrants
      }));
  }
  
  private calculateConfidence(content: any): number {
    let confidence = 70; // Base confidence
    
    // Increase confidence based on content structure
    if (content.immediateActions && Array.isArray(content.immediateActions)) {
      confidence += 5;
    }
    
    if (content.strategicImprovements && Array.isArray(content.strategicImprovements)) {
      confidence += 5;
    }
    
    if (content.redFlags && Array.isArray(content.redFlags)) {
      confidence += 5;
    }
    
    if (content.competitiveAdvantages && Array.isArray(content.competitiveAdvantages)) {
      confidence += 5;
    }
    
    // Check for detailed, specific advice
    const hasSpecifics = JSON.stringify(content).includes('$') || 
                        JSON.stringify(content).includes('%') ||
                        JSON.stringify(content).length > 1000;
    
    if (hasSpecifics) {
      confidence += 10;
    }
    
    return Math.min(confidence, 95);
  }
  
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 5
        })
      });
      
      return response.ok;
    } catch (error) {
      console.error('OpenAI connection test failed:', error);
      return false;
    }
  }
}