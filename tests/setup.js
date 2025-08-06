/**
 * Jest Test Setup for Next.js 15 with React 19
 * Global configuration and utilities for tests
 */

// Import testing library matchers
import '@testing-library/jest-dom';

// Set test timeout to 30 seconds for API tests
jest.setTimeout(30000);

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
  redirect: jest.fn(),
  notFound: jest.fn(),
}));

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img {...props} />;
  },
}));

// Mock Next.js Link component
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...rest }) => {
    return <a href={href} {...rest}>{children}</a>;
  },
}));

// Mock Next.js dynamic imports
jest.mock('next/dynamic', () => {
  return function dynamic(importFunc, options = {}) {
    const Component = importFunc();
    if (options.ssr === false) {
      return Component;
    }
    return Component;
  };
});

// Mock window.matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Note: window.location is provided by jsdom and works out of the box
// We can access it via window.location in tests

// Setup proper fetch mock
const createFetchMock = () => {
  return jest.fn().mockImplementation((url) => {
    // Mock successful response by default
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: jest.fn().mockResolvedValue({
        success: true,
        message: 'Mock response',
        data: {}
      }),
      text: jest.fn().mockResolvedValue('Mock response text'),
      blob: jest.fn().mockResolvedValue(new Blob()),
      headers: new Headers(),
      url: url
    });
  });
};

// Set up global fetch mock
global.fetch = createFetchMock();

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
    expect(response).toHaveProperty('success');
    expect(response).toHaveProperty('data');
    expect(response).toHaveProperty('message');
    if (response.success === false) {
      expect(response).toHaveProperty('error');
    }
  },
  
  // Helper to wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Helper to mock fetch for specific tests
  mockFetch: (mockImplementation) => {
    global.fetch.mockImplementation(mockImplementation);
  },
  
  // Helper to reset fetch mock
  resetFetch: () => {
    global.fetch = createFetchMock();
  }
};

// Environment variable setup for tests
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

// Suppress console output during tests unless explicitly needed
const originalConsole = global.console;
const mockConsole = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: originalConsole.warn,
  error: originalConsole.error
};

// Apply console mock by default
global.console = mockConsole;

// Helper to restore console for specific tests
global.restoreConsole = () => {
  global.console = originalConsole;
};

// Clean up after each test
afterEach(() => {
  // Clear all mocks but keep implementations
  jest.clearAllMocks();
  
  // Reset fetch to default mock
  global.fetch = createFetchMock();
  
  // Reset console mock
  global.console = mockConsole;
});

// Clean up after all tests
afterAll(() => {
  // Restore original console
  global.console = originalConsole;
});