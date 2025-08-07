/**
 * Document Enhancement Service
 * Applies AI-powered improvements to grant proposals
 */

import { logger } from '@/lib/logger'

export interface DocumentSection {
  title: string
  content: string
  type: 'executive_summary' | 'project_description' | 'budget' | 'timeline' | 'impact' | 'team' | 'other'
  improvements?: string[]
}

export interface EnhancementOptions {
  level: 'basic' | 'advanced' | 'comprehensive'
  targetSections?: string[]
  aiProvider: 'openai' | 'anthropic' | 'both'
  preserveFormatting?: boolean
  generateExecutiveSummary?: boolean
  strengthenImpactStatements?: boolean
  improveBudgetJustification?: boolean
  addDataAndEvidence?: boolean
}

export interface EnhancementResult {
  originalDocument: string
  enhancedDocument: string
  sections: DocumentSection[]
  improvements: {
    section: string
    type: string
    original: string
    enhanced: string
    reason: string
  }[]
  metrics: {
    readabilityScore: number
    clarityScore: number
    impactScore: number
    overallImprovement: number
  }
  processingTime: number
}

export class DocumentEnhancer {
  private openaiKey: string | undefined
  private anthropicKey: string | undefined

  constructor() {
    this.openaiKey = process.env.OPENAI_API_KEY
    this.anthropicKey = process.env.ANTHROPIC_API_KEY
  }

  /**
   * Main enhancement method
   */
  async enhanceDocument(
    documentContent: string,
    documentType: string,
    options: EnhancementOptions
  ): Promise<EnhancementResult> {
    const startTime = Date.now()
    
    logger.info('Starting document enhancement', {
      documentType,
      level: options.level,
      provider: options.aiProvider
    })

    try {
      // 1. Parse document into sections
      const sections = await this.parseDocument(documentContent, documentType)
      
      // 2. Analyze weaknesses in each section
      const weaknesses = await this.analyzeWeaknesses(sections)
      
      // 3. Apply enhancements based on level and options
      const enhancedSections = await this.applySectionEnhancements(
        sections,
        weaknesses,
        options
      )
      
      // 4. Generate executive summary if needed
      if (options.generateExecutiveSummary && !this.hasExecutiveSummary(sections)) {
        const executiveSummary = await this.generateExecutiveSummary(enhancedSections)
        enhancedSections.unshift(executiveSummary)
      }
      
      // 5. Compile enhanced document
      const enhancedDocument = this.compileSections(enhancedSections)
      
      // 6. Calculate improvement metrics
      const metrics = await this.calculateMetrics(documentContent, enhancedDocument)
      
      // 7. Generate improvement changelog
      const improvements = this.generateChangelog(sections, enhancedSections)
      
      const processingTime = Date.now() - startTime
      
      logger.info('Document enhancement completed', {
        processingTime,
        improvementScore: metrics.overallImprovement,
        sectionsEnhanced: enhancedSections.length
      })
      
      return {
        originalDocument: documentContent,
        enhancedDocument,
        sections: enhancedSections,
        improvements,
        metrics,
        processingTime
      }
    } catch (error) {
      logger.error('Document enhancement failed', {}, error)
      throw new Error('Failed to enhance document: ' + (error as Error).message)
    }
  }

  /**
   * Parse document into logical sections
   */
  private async parseDocument(content: string, type: string): Promise<DocumentSection[]> {
    const sections: DocumentSection[] = []
    
    // Common section headers to look for
    const sectionPatterns = [
      { pattern: /executive\s+summary/i, type: 'executive_summary' as const },
      { pattern: /project\s+description/i, type: 'project_description' as const },
      { pattern: /budget/i, type: 'budget' as const },
      { pattern: /timeline/i, type: 'timeline' as const },
      { pattern: /impact/i, type: 'impact' as const },
      { pattern: /team|personnel/i, type: 'team' as const }
    ]
    
    // Split content by common section delimiters
    const lines = content.split('\n')
    let currentSection: DocumentSection | null = null
    let currentContent: string[] = []
    
    for (const line of lines) {
      // Check if this line is a section header
      let isHeader = false
      for (const { pattern, type } of sectionPatterns) {
        if (pattern.test(line)) {
          // Save previous section if exists
          if (currentSection) {
            currentSection.content = currentContent.join('\n').trim()
            sections.push(currentSection)
          }
          
          // Start new section
          currentSection = {
            title: line.trim(),
            content: '',
            type
          }
          currentContent = []
          isHeader = true
          break
        }
      }
      
      if (!isHeader && currentSection) {
        currentContent.push(line)
      } else if (!isHeader && !currentSection) {
        // First content before any header
        if (!sections.length) {
          currentSection = {
            title: 'Introduction',
            content: '',
            type: 'other'
          }
        }
        currentContent.push(line)
      }
    }
    
    // Save last section
    if (currentSection) {
      currentSection.content = currentContent.join('\n').trim()
      sections.push(currentSection)
    }
    
    // If no sections found, treat entire document as one section
    if (sections.length === 0) {
      sections.push({
        title: 'Main Content',
        content: content,
        type: 'other'
      })
    }
    
    return sections
  }

  /**
   * Analyze weaknesses in document sections
   */
  private async analyzeWeaknesses(sections: DocumentSection[]): Promise<Map<string, string[]>> {
    const weaknesses = new Map<string, string[]>()
    
    for (const section of sections) {
      const sectionWeaknesses: string[] = []
      
      // Check for common issues
      if (section.content.length < 100) {
        sectionWeaknesses.push('Section is too brief')
      }
      
      // Check for vague language
      const vagueTerms = ['might', 'could', 'possibly', 'maybe', 'somewhat']
      const vagueCount = vagueTerms.filter(term => 
        section.content.toLowerCase().includes(term)
      ).length
      if (vagueCount > 2) {
        sectionWeaknesses.push('Contains vague or uncertain language')
      }
      
      // Check for lack of specifics
      const hasNumbers = /\d+/.test(section.content)
      const hasPercentages = /%/.test(section.content)
      if (!hasNumbers && !hasPercentages && section.type !== 'executive_summary') {
        sectionWeaknesses.push('Lacks specific data or metrics')
      }
      
      // Check for passive voice (simplified check)
      const passiveIndicators = ['was', 'were', 'been', 'being', 'be']
      const passiveCount = passiveIndicators.filter(word => 
        section.content.toLowerCase().includes(` ${word} `)
      ).length
      if (passiveCount > 5) {
        sectionWeaknesses.push('Excessive use of passive voice')
      }
      
      // Section-specific checks
      if (section.type === 'impact' && !section.content.toLowerCase().includes('measur')) {
        sectionWeaknesses.push('Missing measurable outcomes')
      }
      
      if (section.type === 'budget' && !section.content.includes('$')) {
        sectionWeaknesses.push('Budget section lacks specific amounts')
      }
      
      weaknesses.set(section.title, sectionWeaknesses)
    }
    
    return weaknesses
  }

  /**
   * Apply AI-powered enhancements to sections
   */
  private async applySectionEnhancements(
    sections: DocumentSection[],
    weaknesses: Map<string, string[]>,
    options: EnhancementOptions
  ): Promise<DocumentSection[]> {
    const enhancedSections: DocumentSection[] = []
    
    for (const section of sections) {
      const sectionWeaknesses = weaknesses.get(section.title) || []
      
      // Skip if no weaknesses and basic level
      if (sectionWeaknesses.length === 0 && options.level === 'basic') {
        enhancedSections.push(section)
        continue
      }
      
      // Apply enhancement based on provider
      let enhancedContent = section.content
      
      if (options.aiProvider === 'openai' || options.aiProvider === 'both') {
        enhancedContent = await this.enhanceWithOpenAI(
          enhancedContent,
          section.type,
          sectionWeaknesses,
          options
        )
      }
      
      if (options.aiProvider === 'anthropic' || options.aiProvider === 'both') {
        enhancedContent = await this.enhanceWithAnthropic(
          enhancedContent,
          section.type,
          sectionWeaknesses,
          options
        )
      }
      
      // Apply additional improvements based on options
      if (options.strengthenImpactStatements && section.type === 'impact') {
        enhancedContent = this.strengthenImpactStatements(enhancedContent)
      }
      
      if (options.improveBudgetJustification && section.type === 'budget') {
        enhancedContent = this.improveBudgetJustification(enhancedContent)
      }
      
      if (options.addDataAndEvidence) {
        enhancedContent = this.addSupportingEvidence(enhancedContent, section.type)
      }
      
      enhancedSections.push({
        ...section,
        content: enhancedContent,
        improvements: sectionWeaknesses
      })
    }
    
    return enhancedSections
  }

  /**
   * Enhance content using OpenAI
   */
  private async enhanceWithOpenAI(
    content: string,
    sectionType: string,
    weaknesses: string[],
    options: EnhancementOptions
  ): Promise<string> {
    if (!this.openaiKey) {
      logger.warn('OpenAI API key not configured, skipping OpenAI enhancement')
      return content
    }
    
    const prompt = this.buildEnhancementPrompt(content, sectionType, weaknesses, options.level)
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: 'You are an expert grant writer specializing in creating compelling, clear, and data-driven grant proposals. Improve the given text while maintaining its core message and structure.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })
      })
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`)
      }
      
      const result = await response.json()
      return result.choices[0].message.content || content
      
    } catch (error) {
      logger.error('OpenAI enhancement failed', {}, error)
      return content // Return original if enhancement fails
    }
  }

  /**
   * Enhance content using Anthropic Claude
   */
  private async enhanceWithAnthropic(
    content: string,
    sectionType: string,
    weaknesses: string[],
    options: EnhancementOptions
  ): Promise<string> {
    if (!this.anthropicKey) {
      logger.warn('Anthropic API key not configured, skipping Anthropic enhancement')
      return content
    }
    
    const prompt = this.buildEnhancementPrompt(content, sectionType, weaknesses, options.level)
    
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.anthropicKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-opus-20240229',
          max_tokens: 2000,
          messages: [
            {
              role: 'user',
              content: `You are an expert grant writer. Improve this grant proposal section while maintaining clarity and impact:\n\n${prompt}`
            }
          ]
        })
      })
      
      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.statusText}`)
      }
      
      const result = await response.json()
      return result.content[0].text || content
      
    } catch (error) {
      logger.error('Anthropic enhancement failed', {}, error)
      return content // Return original if enhancement fails
    }
  }

  /**
   * Build enhancement prompt for AI
   */
  private buildEnhancementPrompt(
    content: string,
    sectionType: string,
    weaknesses: string[],
    level: string
  ): string {
    let prompt = `Enhance this ${sectionType} section of a grant proposal.\n\n`
    
    if (weaknesses.length > 0) {
      prompt += `Identified issues to address:\n${weaknesses.map(w => `- ${w}`).join('\n')}\n\n`
    }
    
    prompt += `Enhancement level: ${level}\n`
    prompt += `Requirements:\n`
    
    if (level === 'basic') {
      prompt += '- Fix grammar and clarity issues\n'
      prompt += '- Make sentences more concise\n'
    } else if (level === 'advanced') {
      prompt += '- Strengthen value propositions\n'
      prompt += '- Add specific metrics and data where appropriate\n'
      prompt += '- Use active voice and action-oriented language\n'
    } else {
      prompt += '- Completely rewrite for maximum impact\n'
      prompt += '- Add compelling statistics and evidence\n'
      prompt += '- Create powerful emotional and logical appeals\n'
      prompt += '- Ensure perfect alignment with grant requirements\n'
    }
    
    prompt += `\nOriginal text:\n${content}\n\n`
    prompt += 'Enhanced version:'
    
    return prompt
  }

  /**
   * Additional enhancement methods
   */
  private strengthenImpactStatements(content: string): string {
    // Add power words and quantifiable impacts
    let enhanced = content
    
    // Replace weak impact words with stronger ones
    const replacements = [
      { from: /will help/gi, to: 'will transform' },
      { from: /may improve/gi, to: 'will significantly enhance' },
      { from: /could benefit/gi, to: 'will directly benefit' },
      { from: /some people/gi, to: 'thousands of individuals' },
      { from: /positive change/gi, to: 'measurable transformation' }
    ]
    
    for (const { from, to } of replacements) {
      enhanced = enhanced.replace(from, to)
    }
    
    return enhanced
  }

  private improveBudgetJustification(content: string): string {
    // Add justification phrases if not present
    let enhanced = content
    
    if (!enhanced.includes('essential for')) {
      enhanced += '\n\nEach budget item is essential for project success and has been carefully calculated based on current market rates and project requirements.'
    }
    
    if (!enhanced.includes('cost-effective')) {
      enhanced += '\n\nOur budget represents a cost-effective investment that maximizes impact while minimizing expenses through strategic partnerships and resource sharing.'
    }
    
    return enhanced
  }

  private addSupportingEvidence(content: string, sectionType: string): string {
    // Add relevant statistics based on section type
    let enhanced = content
    
    if (sectionType === 'impact' && !content.includes('%')) {
      enhanced += '\n\nBased on similar successful initiatives, we project a 40-60% improvement in key metrics within the first year of implementation.'
    }
    
    if (sectionType === 'project_description' && !content.includes('research')) {
      enhanced += '\n\nThis approach is supported by recent research and best practices in the field, ensuring evidence-based implementation.'
    }
    
    return enhanced
  }

  /**
   * Generate executive summary if missing
   */
  private async generateExecutiveSummary(sections: DocumentSection[]): Promise<DocumentSection> {
    // Compile key points from all sections
    const keyPoints: string[] = []
    
    for (const section of sections) {
      // Extract first sentence or key point from each section
      const firstSentence = section.content.split('.')[0] + '.'
      if (firstSentence.length > 20) {
        keyPoints.push(firstSentence)
      }
    }
    
    const summary = `This proposal presents a comprehensive initiative that addresses critical needs in our target community. ${keyPoints.slice(0, 3).join(' ')} Through strategic implementation and careful resource management, this project will deliver measurable impact and sustainable outcomes.`
    
    return {
      title: 'Executive Summary',
      content: summary,
      type: 'executive_summary'
    }
  }

  /**
   * Helper methods
   */
  private hasExecutiveSummary(sections: DocumentSection[]): boolean {
    return sections.some(s => s.type === 'executive_summary')
  }

  private compileSections(sections: DocumentSection[]): string {
    return sections.map(s => `${s.title}\n\n${s.content}`).join('\n\n---\n\n')
  }

  private async calculateMetrics(original: string, enhanced: string): Promise<any> {
    // Simple metrics calculation
    const originalWords = original.split(/\s+/).length
    const enhancedWords = enhanced.split(/\s+/).length
    
    // Readability improvements (simplified)
    const originalSentences = original.split(/[.!?]+/).length
    const enhancedSentences = enhanced.split(/[.!?]+/).length
    
    const originalAvgWords = originalWords / originalSentences
    const enhancedAvgWords = enhancedWords / enhancedSentences
    
    // Calculate scores (0-100)
    const readabilityScore = Math.min(100, Math.max(0, 100 - Math.abs(enhancedAvgWords - 15) * 5))
    const clarityScore = Math.min(100, (enhancedSentences / originalSentences) * 100)
    const impactScore = 75 // Placeholder - would need more sophisticated analysis
    const overallImprovement = (readabilityScore + clarityScore + impactScore) / 3
    
    return {
      readabilityScore: Math.round(readabilityScore),
      clarityScore: Math.round(clarityScore),
      impactScore: Math.round(impactScore),
      overallImprovement: Math.round(overallImprovement)
    }
  }

  private generateChangelog(
    original: DocumentSection[],
    enhanced: DocumentSection[]
  ): any[] {
    const improvements: any[] = []
    
    for (let i = 0; i < original.length; i++) {
      if (original[i].content !== enhanced[i].content) {
        improvements.push({
          section: original[i].title,
          type: 'content_enhancement',
          original: original[i].content.substring(0, 100) + '...',
          enhanced: enhanced[i].content.substring(0, 100) + '...',
          reason: enhanced[i].improvements?.join(', ') || 'General improvements'
        })
      }
    }
    
    return improvements
  }
}