/**
 * API Endpoints Testing Suite
 * Tests all major API endpoints for functionality and error handling
 */

const BASE_URL = 'http://localhost:3000'

describe('Grant Predictor API Tests', () => {
  
  // Test Health Check API
  describe('Health Check API', () => {
    test('GET /api/health should return system status', async () => {
      const response = await fetch(`${BASE_URL}/api/health`)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data).toHaveProperty('status')
      expect(data).toHaveProperty('services')
      expect(data.services).toHaveProperty('openai')
      expect(data.services).toHaveProperty('database')
      expect(data.services).toHaveProperty('stripe')
    })
  })

  // Test Grants API
  describe('Grants API', () => {
    test('GET /api/v1/grants should return grants list', async () => {
      const response = await fetch(`${BASE_URL}/api/v1/grants`)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('grants')
      expect(Array.isArray(data.data.grants)).toBe(true)
      expect(data.data.grants.length).toBeGreaterThan(0)
    })

    test('GET /api/v1/grants with filters should return filtered results', async () => {
      const response = await fetch(`${BASE_URL}/api/v1/grants?category=Technology&min_amount=100000`)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.filters_applied).toHaveProperty('category')
    })

    test('POST /api/v1/grants should return matching grants', async () => {
      const requestBody = {
        organizationType: 'nonprofit',
        fundingAmount: 250000,
        keywords: ['technology', 'innovation']
      }
      
      const response = await fetch(`${BASE_URL}/api/v1/grants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })
      
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('matched_grants')
      expect(data.data).toHaveProperty('total_matches')
    })
  })

  // Test Predictions API
  describe('Predictions API', () => {
    test('GET /api/v1/predictions should return API info', async () => {
      const response = await fetch(`${BASE_URL}/api/v1/predictions`)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('message')
      expect(data.data).toHaveProperty('features')
    })

    test('POST /api/v1/predictions should generate prediction', async () => {
      const requestBody = {
        organizationName: 'Test Innovation Lab',
        organizationType: 'nonprofit',
        fundingAmount: 150000,
        experienceLevel: 'intermediate',
        hasPartnership: true,
        hasPreviousGrants: false
      }
      
      const response = await fetch(`${BASE_URL}/api/v1/predictions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })
      
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('successProbability')
      expect(data.data).toHaveProperty('confidence')
      expect(data.data).toHaveProperty('recommendations')
      expect(data.data.successProbability).toBeGreaterThan(0)
      expect(data.data.successProbability).toBeLessThanOrEqual(100)
    })

    test('POST /api/v1/predictions with invalid data should return error', async () => {
      const requestBody = {
        organizationName: '',
        organizationType: 'invalid_type',
        fundingAmount: -1000
      }
      
      const response = await fetch(`${BASE_URL}/api/v1/predictions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })
      
      expect(response.status).toBe(400)
    })
  })

  // Test Rate Limiting
  describe('Rate Limiting', () => {
    test('Multiple rapid requests should trigger rate limiting', async () => {
      const requests = []
      
      // Make 35 requests rapidly (should exceed the 30/minute limit)
      for (let i = 0; i < 35; i++) {
        requests.push(
          fetch(`${BASE_URL}/api/v1/grants`).then(response => response.status)
        )
      }
      
      const responses = await Promise.all(requests)
      const rateLimitedResponses = responses.filter(status => status === 429)
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0)
    }, 30000) // 30 second timeout for this test
  })

  // Test Error Handling
  describe('Error Handling', () => {
    test('Invalid JSON should return 400 error', async () => {
      const response = await fetch(`${BASE_URL}/api/v1/predictions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'invalid json{'
      })
      
      expect(response.status).toBe(400)
    })

    test('Missing required fields should return validation error', async () => {
      const response = await fetch(`${BASE_URL}/api/v1/predictions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })
      
      expect(response.status).toBe(400)
    })
  })

  // Test File Upload Prediction
  describe('File Upload Prediction', () => {
    test('POST /api/v1/predictions with file data should process document', async () => {
      const mockFileData = {
        organizationName: 'Research University',
        organizationType: 'university',
        fundingAmount: 500000,
        experienceLevel: 'expert',
        hasPartnership: true,
        hasPreviousGrants: true,
        fileData: {
          name: 'grant_proposal.pdf',
          content: btoa('Mock grant proposal content for testing PDF processing'),
          type: 'application/pdf',
          size: 1024
        }
      }
      
      const response = await fetch(`${BASE_URL}/api/v1/predictions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mockFileData)
      })
      
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('documentAnalysis')
      if (data.data.documentAnalysis) {
        expect(data.data.documentAnalysis).toHaveProperty('fileName')
        expect(data.data.documentAnalysis).toHaveProperty('wordCount')
        expect(data.data.documentAnalysis).toHaveProperty('completenessScore')
      }
    }, 15000) // 15 second timeout for file processing
  })
})

// Test utility functions
function btoa(str) {
  return Buffer.from(str).toString('base64')
}

// Mock console methods to reduce test output noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn()
}