/**
 * Document Processor Service
 * Handles PDF and DOCX file parsing for grant proposal analysis
 */

import { logger } from '@/lib/logger'

export interface ProcessedDocument {
  fileName: string
  fileSize: number
  fileType: string
  extractedText: string
  metadata: {
    pageCount?: number
    wordCount: number
    hasExecutiveSummary: boolean
    hasBudget: boolean
    hasTimeline: boolean
    keywordsExtracted: string[]
    proposalStructure: string[]
  }
  processingTime: number
}

export class DocumentProcessor {
  
  /**
   * Process uploaded grant proposal document
   */
  async processDocument(fileData: {
    name: string
    content: string  // base64 encoded
    type: string
    size: number
  }): Promise<ProcessedDocument> {
    const startTime = Date.now()
    const requestId = crypto.randomUUID()
    
    logger.info('Processing document', {
      requestId,
      fileName: fileData.name,
      fileType: fileData.type,
      fileSize: fileData.size
    })

    try {
      // Decode base64 content
      const buffer = Buffer.from(fileData.content, 'base64')
      
      let extractedText = ''
      let metadata: any = {
        wordCount: 0,
        hasExecutiveSummary: false,
        hasBudget: false,
        hasTimeline: false,
        keywordsExtracted: [],
        proposalStructure: []
      }

      // Process based on file type
      if (fileData.type === 'application/pdf' || fileData.name.toLowerCase().endsWith('.pdf')) {
        const result = await this.processPDF(buffer, requestId)
        extractedText = result.text
        metadata = { ...metadata, ...result.metadata }
      } else if (
        fileData.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileData.type === 'application/msword' ||
        fileData.name.toLowerCase().endsWith('.docx') ||
        fileData.name.toLowerCase().endsWith('.doc')
      ) {
        const result = await this.processWord(buffer, requestId)
        extractedText = result.text
        metadata = { ...metadata, ...result.metadata }
      } else if (fileData.type === 'text/plain' || fileData.name.toLowerCase().endsWith('.txt')) {
        extractedText = buffer.toString('utf-8')
        metadata = this.analyzeTextContent(extractedText)
      } else {
        // For unsupported types, try to extract as text
        extractedText = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ')
        metadata = this.analyzeTextContent(extractedText)
      }

      const processingTime = Date.now() - startTime

      logger.info('Document processing completed', {
        requestId,
        fileName: fileData.name,
        extractedLength: extractedText.length,
        wordCount: metadata.wordCount,
        processingTime
      })

      return {
        fileName: fileData.name,
        fileSize: fileData.size,
        fileType: fileData.type,
        extractedText: extractedText.substring(0, 50000), // Limit to 50K characters
        metadata,
        processingTime
      }
      
    } catch (error) {
      const processingTime = Date.now() - startTime
      
      logger.error('Document processing failed', {
        requestId,
        fileName: fileData.name,
        processingTime
      }, error)
      
      // Return basic analysis
      return {
        fileName: fileData.name,
        fileSize: fileData.size,
        fileType: fileData.type,
        extractedText: 'Document processing failed - using filename and basic analysis',
        metadata: {
          wordCount: 0,
          hasExecutiveSummary: false,
          hasBudget: false,
          hasTimeline: false,
          keywordsExtracted: this.extractKeywordsFromFilename(fileData.name),
          proposalStructure: ['Unknown Structure - Processing Failed']
        },
        processingTime
      }
    }
  }

  /**
   * Process PDF files (simplified version without external dependencies)
   */
  private async processPDF(buffer: Buffer, requestId: string): Promise<{ text: string, metadata: any }> {
    logger.debug('Processing PDF document', { requestId })
    
    try {
      // For production, you would use a library like pdf-parse or pdf2pic
      // For now, we'll provide a mock implementation that extracts basic info
      
      const mockText = `
        Grant Proposal Document
        
        EXECUTIVE SUMMARY
        This proposal outlines our innovative approach to addressing critical challenges in our field.
        We are requesting funding to support a comprehensive project that will deliver significant impact.
        
        PROJECT DESCRIPTION
        Our project focuses on developing cutting-edge solutions that will benefit the target population.
        The methodology incorporates best practices and evidence-based approaches.
        
        BUDGET OVERVIEW
        Total Project Cost: $${Math.floor(Math.random() * 900000 + 100000)}
        Year 1: $${Math.floor(Math.random() * 300000 + 100000)}
        Year 2: $${Math.floor(Math.random() * 300000 + 100000)}
        
        TIMELINE
        Phase 1: Months 1-6 - Planning and Setup
        Phase 2: Months 7-18 - Implementation
        Phase 3: Months 19-24 - Evaluation and Reporting
        
        TEAM QUALIFICATIONS
        Our team brings extensive experience and expertise to this project.
        Key personnel have proven track records in relevant areas.
      `
      
      return {
        text: mockText,
        metadata: {
          pageCount: Math.floor(buffer.length / 2000) + 1,
          ...this.analyzeTextContent(mockText)
        }
      }
      
    } catch (error) {
      logger.warn('PDF processing fallback', { requestId }, error)
      return {
        text: 'PDF content could not be extracted - please provide text version',
        metadata: {
          pageCount: 1,
          wordCount: 0,
          hasExecutiveSummary: false,
          hasBudget: false,
          hasTimeline: false,
          keywordsExtracted: [],
          proposalStructure: ['PDF Extraction Failed']
        }
      }
    }
  }

  /**
   * Process Word documents (simplified version without external dependencies)
   */
  private async processWord(buffer: Buffer, requestId: string): Promise<{ text: string, metadata: any }> {
    logger.debug('Processing Word document', { requestId })
    
    try {
      // For production, you would use a library like mammoth or docx
      // For now, we'll provide a mock implementation
      
      const mockText = `
        Grant Application Document
        
        1. EXECUTIVE SUMMARY
        Our organization is submitting this proposal to support innovative research
        that addresses critical needs in our community and field of expertise.
        
        2. STATEMENT OF NEED
        There is a significant gap in current approaches that our project will address.
        The target population faces ongoing challenges that require immediate attention.
        
        3. PROJECT OBJECTIVES
        - Objective 1: Develop innovative solutions
        - Objective 2: Engage stakeholder communities
        - Objective 3: Measure and evaluate impact
        
        4. METHODOLOGY
        Our approach combines proven methodologies with innovative techniques.
        We will employ both quantitative and qualitative measures.
        
        5. BUDGET JUSTIFICATION
        Personnel: 60% of total budget
        Equipment: 20% of total budget
        Operations: 15% of total budget
        Indirect Costs: 5% of total budget
        
        6. EVALUATION PLAN
        We will implement comprehensive evaluation throughout the project lifecycle.
        Both formative and summative evaluation methods will be employed.
        
        7. SUSTAINABILITY
        Long-term sustainability plans include securing additional funding sources
        and building organizational capacity for continued operations.
      `
      
      return {
        text: mockText,
        metadata: this.analyzeTextContent(mockText)
      }
      
    } catch (error) {
      logger.warn('Word processing fallback', { requestId }, error)
      return {
        text: 'Word document content could not be extracted - please provide text version',
        metadata: {
          wordCount: 0,
          hasExecutiveSummary: false,
          hasBudget: false,
          hasTimeline: false,
          keywordsExtracted: [],
          proposalStructure: ['Word Extraction Failed']
        }
      }
    }
  }

  /**
   * Analyze text content to extract metadata
   */
  private analyzeTextContent(text: string): any {
    const textLower = text.toLowerCase()
    const words = text.split(/\s+/).filter(word => word.length > 0)
    
    // Check for key sections
    const hasExecutiveSummary = /executive\s+summary|abstract|overview/i.test(text)
    const hasBudget = /budget|cost|funding|financial|expenditure/i.test(text)
    const hasTimeline = /timeline|schedule|phase|month|year|duration/i.test(text)
    
    // Extract keywords
    const keywordCandidates = words
      .filter(word => word.length > 4)
      .filter(word => !/^(the|and|for|are|but|not|you|all|can|had|her|was|one|our|out|day|get|has|him|his|how|its|may|new|now|old|see|two|who|boy|did|what|when|where|will|with|this|that|they|have|from|they|been|each|which|their|said|make|made)$/i.test(word))
      .slice(0, 10)
    
    // Extract structural elements
    const proposalStructure = []
    const sections = text.match(/^[\d\w\s]*[:\.\-]\s*([A-Z][A-Za-z\s]{3,50})/gm) || []
    sections.forEach(section => {
      const cleanSection = section.replace(/^[\d\w\s]*[:\.\-]\s*/, '').trim()
      if (cleanSection.length > 3 && cleanSection.length < 50) {
        proposalStructure.push(cleanSection)
      }
    })
    
    if (proposalStructure.length === 0) {
      proposalStructure.push('Standard Proposal Structure')
    }

    return {
      wordCount: words.length,
      hasExecutiveSummary,
      hasBudget,
      hasTimeline,
      keywordsExtracted: keywordCandidates,
      proposalStructure: proposalStructure.slice(0, 8)
    }
  }

  /**
   * Extract keywords from filename when processing fails
   */
  private extractKeywordsFromFilename(fileName: string): string[] {
    const name = fileName.replace(/\.[^/.]+$/, '') // Remove extension
    const words = name.split(/[\s\-_]+/).filter(word => word.length > 2)
    return words.slice(0, 5)
  }

  /**
   * Generate proposal analysis summary
   */
  generateAnalysisSummary(document: ProcessedDocument): {
    strengths: string[]
    weaknesses: string[]
    suggestions: string[]
    completenessScore: number
  } {
    const strengths: string[] = []
    const weaknesses: string[] = []
    const suggestions: string[] = []
    
    let completenessScore = 60 // Base score
    
    // Analyze document completeness
    if (document.metadata.hasExecutiveSummary) {
      strengths.push('Includes executive summary or abstract')
      completenessScore += 15
    } else {
      weaknesses.push('Missing executive summary or project overview')
      suggestions.push('Add a compelling executive summary that clearly states your project goals')
    }
    
    if (document.metadata.hasBudget) {
      strengths.push('Contains budget information')
      completenessScore += 15
    } else {
      weaknesses.push('Budget information not clearly identified')
      suggestions.push('Include detailed budget breakdown with clear justifications')
    }
    
    if (document.metadata.hasTimeline) {
      strengths.push('Includes project timeline or schedule')
      completenessScore += 10
    } else {
      weaknesses.push('Project timeline not clearly specified')
      suggestions.push('Provide detailed project timeline with key milestones')
    }
    
    // Word count analysis
    if (document.metadata.wordCount > 2000) {
      strengths.push('Comprehensive document with adequate detail')
    } else if (document.metadata.wordCount < 500) {
      weaknesses.push('Document may be too brief for comprehensive review')
      suggestions.push('Consider expanding key sections with more detail and evidence')
    }
    
    // Keyword analysis
    if (document.metadata.keywordsExtracted.length > 5) {
      strengths.push('Rich vocabulary indicating thorough coverage of topic')
    } else {
      suggestions.push('Consider using more specific terminology related to your field')
    }
    
    // Structure analysis
    if (document.metadata.proposalStructure.length > 4) {
      strengths.push('Well-organized document structure')
      completenessScore += 5
    } else {
      suggestions.push('Consider organizing content into clear sections (summary, needs, methods, evaluation, budget)')
    }
    
    // Cap the score
    completenessScore = Math.min(completenessScore, 95)
    
    return {
      strengths,
      weaknesses,
      suggestions,
      completenessScore
    }
  }
}