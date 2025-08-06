/**
 * Jest Configuration Test
 * Verifies that Jest setup is working correctly with Next.js 15 and React 19
 */

import { render, screen } from '@testing-library/react';

// Test that our Jest configuration works with Next.js mocks
describe('Jest Configuration', () => {
  test('Jest setup is working correctly', () => {
    expect(true).toBe(true);
  });

  test('Global test utilities are available', () => {
    expect(global.testUtils).toBeDefined();
    expect(global.testUtils.createMockFile).toBeInstanceOf(Function);
    expect(global.testUtils.createMockOrganization).toBeInstanceOf(Function);
    expect(global.testUtils.validateApiResponse).toBeInstanceOf(Function);
  });

  test('Fetch mock is properly configured', async () => {
    const response = await fetch('http://test.com');
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('message', 'Mock response');
  });

  test('Next.js navigation mocks are working', () => {
    // These mocks should not throw errors
    const mockRouter = require('next/navigation').useRouter();
    const mockPathname = require('next/navigation').usePathname();
    const mockSearchParams = require('next/navigation').useSearchParams();
    
    expect(mockRouter).toBeDefined();
    expect(typeof mockRouter.push).toBe('function');
    expect(mockPathname).toBe('/');
    expect(mockSearchParams).toBeInstanceOf(URLSearchParams);
  });

  test('React component rendering works', () => {
    const TestComponent = () => <div>Hello Test</div>;
    render(<TestComponent />);
    
    expect(screen.getByText('Hello Test')).toBeInTheDocument();
  });

  test('JSX transforms work', () => {
    const TestComponent = () => {
      return <div data-testid="jsx-component">JSX works</div>;
    };
    
    render(<TestComponent />);
    expect(screen.getByTestId('jsx-component')).toBeInTheDocument();
  });

  test('Mock utilities work correctly', () => {
    const mockFile = global.testUtils.createMockFile('test.pdf', 'test content');
    const mockOrg = global.testUtils.createMockOrganization({
      organizationName: 'Custom Org'
    });
    
    expect(mockFile.name).toBe('test.pdf');
    expect(mockFile.type).toBe('application/pdf');
    expect(mockOrg.organizationName).toBe('Custom Org');
    expect(mockOrg.organizationType).toBe('nonprofit');
  });

  test('Environment variables are set correctly', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.NEXT_PUBLIC_APP_URL).toBe('http://localhost:3000');
  });

  test('Window mocks are configured', () => {
    expect(window.matchMedia).toBeDefined();
    expect(window.location).toBeDefined();
    expect(global.IntersectionObserver).toBeDefined();
    expect(global.ResizeObserver).toBeDefined();
  });
});