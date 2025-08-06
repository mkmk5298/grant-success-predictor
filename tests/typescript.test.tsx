/**
 * TypeScript and TSX Support Test
 * Verifies that Jest works correctly with TypeScript and TSX files
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

interface ComponentProps {
  title: string;
  count?: number;
}

const TypeScriptComponent: React.FC<ComponentProps> = ({ title, count = 0 }) => {
  return (
    <div data-testid="typescript-component">
      <h1>{title}</h1>
      <span>Count: {count}</span>
    </div>
  );
};

describe('TypeScript Support', () => {
  test('TypeScript component renders correctly', () => {
    render(<TypeScriptComponent title="Test Title" count={5} />);
    
    expect(screen.getByTestId('typescript-component')).toBeInTheDocument();
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Count: 5')).toBeInTheDocument();
  });

  test('Optional props work correctly', () => {
    render(<TypeScriptComponent title="Test Without Count" />);
    
    expect(screen.getByText('Count: 0')).toBeInTheDocument();
  });

  test('TypeScript types work in test code', () => {
    interface TestData {
      id: number;
      name: string;
      active: boolean;
    }

    const testData: TestData = {
      id: 1,
      name: 'Test Item',
      active: true
    };

    expect(testData.id).toBe(1);
    expect(testData.name).toBe('Test Item');
    expect(testData.active).toBe(true);
  });

  test('Type assertions work correctly', () => {
    render(<TypeScriptComponent title="Type Test" />);
    
    const element = screen.getByTestId('typescript-component') as HTMLDivElement;
    expect(element.tagName).toBe('DIV');
  });
});