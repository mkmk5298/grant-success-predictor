/**
 * Jest Test Setup
 * Global configuration and utilities for tests
 */

// Set test timeout to 30 seconds for API tests
jest.setTimeout(30000)

// Global test utilities
global.testUtils = {
  // Helper to create mock file data
  createMockFile: (name, content, type = 'application/pdf') => ({
    name,
    content: Buffer.from(content).toString('base64'),
    type,
    size: Buffer.byteLength(content, 'utf8')
  }),
  
  // Helper to create mock organization data
  createMockOrganization: (overrides = {}) => ({
    organizationName: 'Test Organization',
    organizationType: 'nonprofit',
    fundingAmount: 100000,
    experienceLevel: 'intermediate',
    hasPartnership: false,
    hasPreviousGrants: false,
    ...overrides
  }),
  
  // Helper to validate API response structure
  validateApiResponse: (response) => {
    expect(response).toHaveProperty('success')
    expect(response).toHaveProperty('data')
    expect(response).toHaveProperty('message')
    if (response.success === false) {
      expect(response).toHaveProperty('error')
    }
  },
  
  // Helper to wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms))
}

// Mock fetch for tests that don't need actual HTTP calls
const originalFetch = global.fetch
global.fetch = jest.fn()

// Restore fetch for integration tests
global.restoreFetch = () => {
  global.fetch = originalFetch
}

// Environment variable setup for tests
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

// Suppress console output during tests unless explicitly needed
const originalConsole = global.console
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: originalConsole.warn,
  error: originalConsole.error
}

// Restore console for specific tests
global.restoreConsole = () => {
  global.console = originalConsole
}

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
})