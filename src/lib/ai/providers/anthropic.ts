/**
 * Anthropic Provider  
 * Claude integration for grant advice
 */

import { AIProvider, AdviceRequest, AdviceResponse } from '../config';
import crypto from 'crypto';

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string;
  stop_sequence?: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class AnthropicProvider {
  private config: AIProvider;
  
  constructor(config: AIProvider) {
    this.config = config;
  }
  
  async generateAdvice(request: AdviceRequest, prompt: string): Promise<AdviceResponse> {
    const startTime = Date.now();
    
    try {
      // Replace template variables in prompt
      const processedPrompt = this.processPromptTemplate(prompt, request);
      
      const response = await fetch(`${this.config.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.config.apiKey!,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          messages: [
            {
              role: 'user',
              content: `${processedPrompt}\n\nImportant: Respond with valid JSON only. Structure your response with clear categories and actionable items.`
            }
          ]
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Anthropic API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }
      
      const data: AnthropicResponse = await response.json();
      const contentText = data.content[0].text;
      
      // Extract JSON from response (Claude sometimes adds explanatory text)
      const jsonMatch = contentText.match(/\{[\s\S]*\}/);
      const jsonContent = jsonMatch ? jsonMatch[0] : contentText;
      
      let content;
      try {
        content = JSON.parse(jsonContent);
      } catch (parseError) {
        // Fallback: structure the text response
        content = {
          advice: contentText,
          formatted: false,
          note: "Response was not in JSON format, structured as text"
        };
      }
      
      return {
        id: crypto.randomUUID(),
        analysisId: request.analysisId,
        provider: 'anthropic',
        model: data.model,
        adviceType: request.adviceType,
        content,
        confidence: this.calculateConfidence(content),
        processingTime: Date.now() - startTime,
        tokenUsage: data.usage.input_tokens + data.usage.output_tokens,
        createdAt: new Date(),
      };
      
    } catch (error) {
      console.error('Anthropic Provider Error:', error);
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
    let confidence = 75; // Claude typically gives high-quality responses
    
    // Increase confidence based on content structure
    if (content.immediateActions && Array.isArray(content.immediateActions)) {
      confidence += 5;
    }
    
    if (content.strategicImprovements && Array.isArray(content.strategicImprovements)) {
      confidence += 5;
    }
    
    if (content.redFlags && Array.isArray(content.redFlags)) {
      confidence += 3;
    }
    
    if (content.formatted !== false) {
      confidence += 7; // Well-formatted JSON response
    }
    
    // Check for detailed, specific advice
    const hasSpecifics = JSON.stringify(content).includes('$') || 
                        JSON.stringify(content).includes('%') ||
                        JSON.stringify(content).length > 1200;
    
    if (hasSpecifics) {
      confidence += 5;
    }
    
    return Math.min(confidence, 95);
  }
  
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.config.apiKey!,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hello' }]
        })
      });
      
      return response.ok;
    } catch (error) {
      console.error('Anthropic connection test failed:', error);
      return false;
    }
  }
}