/**
 * AI Service Configuration
 * Dual-provider setup with intelligent fallback
 */

export interface AIProvider {
  name: 'openai' | 'anthropic';
  enabled: boolean;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  maxTokens: number;
  temperature: number;
  priority: number; // 1 = highest priority
}

export const aiConfig: Record<string, AIProvider> = {
  openai: {
    name: 'openai',
    enabled: !!process.env.OPENAI_API_KEY,
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    maxTokens: 2000,
    temperature: 0.7,
    priority: 1,
  },
  anthropic: {
    name: 'anthropic',
    enabled: !!process.env.ANTHROPIC_API_KEY,
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-3-sonnet-20240229',
    maxTokens: 2000,
    temperature: 0.7,
    priority: 2,
  }
};

export const advicePrompts = {
  grantImprovement: `You are a world-class grant writing expert with 20+ years of experience helping organizations secure millions in funding. 

Given the following grant analysis data, provide specific, actionable advice to improve the grant application's success rate:

Grant Analysis:
- Organization: {organizationName} ({organizationType})
- Funding Request: $\{fundingAmount\}
- Experience Level: {experienceLevel}
- Has Partnerships: {hasPartnership}
- Previous Grants: {hasPreviousGrants}
- Success Probability: {successProbability}%

Please provide:

1. **IMMEDIATE ACTIONS** (3-5 specific steps to take right now)
2. **STRATEGIC IMPROVEMENTS** (3-4 longer-term improvements)
3. **RED FLAGS TO FIX** (Critical issues that could cause rejection)
4. **COMPETITIVE ADVANTAGES** (How to stand out from other applicants)
5. **BUDGET OPTIMIZATION** (Specific advice on funding amount and allocation)

Make your advice:
- Specific and actionable (not generic)
- Tailored to their organization type and experience level
- Evidence-based with clear reasoning
- Prioritized by impact on success rate

Format as structured JSON with clear categories and action items.`,

  narrativeImprovement: `As an expert grant narrative writer, help improve this organization's story for maximum funding impact.

Organization Details:
{organizationData}

Current Challenges:
- Success rate: {successProbability}%
- Funding request: $\{fundingAmount\}
- Experience: {experienceLevel}

Provide a comprehensive narrative improvement strategy including:

1. **COMPELLING STORY FRAMEWORK**
   - Hook/opening that captures attention
   - Problem statement with urgency and scale
   - Solution narrative with clear outcomes
   - Impact story with measurable results

2. **EVIDENCE STRENGTHENING**
   - Data points to collect and highlight
   - Case studies and testimonials to gather
   - Partnerships to emphasize or develop

3. **DIFFERENTIATION STRATEGY**
   - Unique value proposition
   - Competitive advantages to highlight
   - Innovation aspects to emphasize

4. **RISK MITIGATION**
   - Common concerns funders have
   - How to address potential objections
   - Credibility builders to include

Return structured JSON with specific, actionable narrative improvements.`,

  budgetOptimization: `You are a grant budget optimization specialist. Analyze this funding request and provide specific budget improvement recommendations.

Current Request:
- Amount: $\{fundingAmount\}
- Organization Type: {organizationType}
- Experience Level: {experienceLevel}
- Success Rate: {successProbability}%

Provide budget optimization advice:

1. **OPTIMAL FUNDING RANGE**
   - Recommended amount based on success probability
   - Justification for the recommendation
   - Alternative amounts with trade-offs

2. **BUDGET ALLOCATION STRATEGY**
   - Ideal distribution across categories
   - What funders want to see prioritized
   - Cost-effectiveness improvements

3. **MATCHING FUNDS & LEVERAGE**
   - Matching requirements to consider
   - How to show financial sustainability
   - Leverage opportunities

4. **COST JUSTIFICATION TIPS**
   - How to justify major expenses
   - Detail level expectations
   - Common budget mistakes to avoid

Return as structured JSON with specific dollar amounts and percentages where applicable.`
};

export interface AdviceRequest {
  organizationName: string;
  organizationType: string;
  fundingAmount: number;
  experienceLevel: string;
  hasPartnership: boolean;
  hasPreviousGrants: boolean;
  successProbability: number;
  analysisId: string;
  userId?: string;
  adviceType: 'comprehensive' | 'narrative' | 'budget' | 'strategic';
}

export interface AdviceResponse {
  id: string;
  analysisId: string;
  provider: 'openai' | 'anthropic';
  model: string;
  adviceType: string;
  content: {
    immediateActions?: string[];
    strategicImprovements?: string[];
    redFlags?: string[];
    competitiveAdvantages?: string[];
    budgetOptimization?: any;
    narrativeFramework?: any;
    [key: string]: any;
  };
  confidence: number;
  processingTime: number;
  tokenUsage: number;
  createdAt: Date;
}

export const getAvailableProviders = (): AIProvider[] => {
  return Object.values(aiConfig)
    .filter(provider => provider.enabled)
    .sort((a, b) => a.priority - b.priority);
};

export const getPrimaryProvider = (): AIProvider | null => {
  const providers = getAvailableProviders();
  return providers.length > 0 ? providers[0] : null;
};

export const getSecondaryProvider = (): AIProvider | null => {
  const providers = getAvailableProviders();
  return providers.length > 1 ? providers[1] : null;
};