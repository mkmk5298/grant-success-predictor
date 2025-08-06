// Quality Gates Configuration
// Defines thresholds and metrics for production readiness

export const QUALITY_METRICS = {
  // Performance budgets
  performance: {
    lighthouse: {
      performance: 90,
      accessibility: 95,
      bestPractices: 95,
      seo: 90,
      pwa: 80,
    },
    webVitals: {
      LCP: 2500, // Largest Contentful Paint (ms)
      FID: 100,  // First Input Delay (ms)
      CLS: 0.1,  // Cumulative Layout Shift
      TTFB: 800, // Time to First Byte (ms)
      FCP: 1800, // First Contentful Paint (ms)
    },
    bundleSize: {
      maxInitialJS: 200,    // KB
      maxTotalJS: 500,      // KB
      maxCSS: 100,          // KB
      maxFirstLoad: 300,    // KB
      maxPageWeight: 1000,  // KB total
    },
  },
  
  // Code quality thresholds
  codeQuality: {
    coverage: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
    complexity: {
      maxCyclomatic: 10,
      maxDepth: 4,
      maxLines: 300,
      maxParams: 4,
    },
    duplication: {
      maxPercentage: 5,
      minLines: 50,
    },
  },
  
  // Security thresholds
  security: {
    vulnerabilities: {
      critical: 0,
      high: 0,
      medium: 3,
      low: 10,
    },
    headers: {
      required: [
        'X-Frame-Options',
        'X-Content-Type-Options',
        'Strict-Transport-Security',
        'Content-Security-Policy',
      ],
    },
    dependencies: {
      maxOutdated: 5,
      maxDeprecated: 0,
    },
  },
  
  // API performance
  api: {
    responseTime: {
      p50: 200,  // ms
      p95: 500,  // ms
      p99: 1000, // ms
      max: 3000, // ms
    },
    errorRate: {
      max: 0.1,     // 0.1%
      warning: 0.05, // 0.05%
    },
    availability: {
      target: 99.9,  // %
      minimum: 99.5, // %
    },
  },
  
  // Database performance
  database: {
    queryTime: {
      p50: 50,   // ms
      p95: 200,  // ms
      p99: 500,  // ms
      max: 2000, // ms
    },
    connectionPool: {
      maxConnections: 20,
      minConnections: 2,
      idleTimeout: 10000, // ms
    },
  },
  
  // Deployment criteria
  deployment: {
    buildTime: {
      max: 300,    // seconds
      warning: 180, // seconds
    },
    testsPassing: {
      required: true,
      minCoverage: 80,
    },
    preDeployChecks: [
      'type-check',
      'lint',
      'test:ci',
      'security:audit',
    ],
  },
};

// Validation function for CI/CD pipeline
export function validateQualityGates(metrics: any): { 
  passed: boolean; 
  failures: string[]; 
  warnings: string[] 
} {
  const failures: string[] = [];
  const warnings: string[] = [];
  
  // Check performance metrics
  if (metrics.lighthouse) {
    Object.entries(QUALITY_METRICS.performance.lighthouse).forEach(([key, threshold]) => {
      if (metrics.lighthouse[key] < threshold) {
        failures.push(`Lighthouse ${key}: ${metrics.lighthouse[key]} < ${threshold}`);
      }
    });
  }
  
  // Check bundle sizes
  if (metrics.bundleSize) {
    Object.entries(QUALITY_METRICS.performance.bundleSize).forEach(([key, maxSize]) => {
      if (metrics.bundleSize[key] > maxSize) {
        failures.push(`Bundle ${key}: ${metrics.bundleSize[key]}KB > ${maxSize}KB`);
      }
    });
  }
  
  // Check security vulnerabilities
  if (metrics.vulnerabilities) {
    if (metrics.vulnerabilities.critical > 0) {
      failures.push(`Critical vulnerabilities: ${metrics.vulnerabilities.critical}`);
    }
    if (metrics.vulnerabilities.high > 0) {
      failures.push(`High vulnerabilities: ${metrics.vulnerabilities.high}`);
    }
    if (metrics.vulnerabilities.medium > QUALITY_METRICS.security.vulnerabilities.medium) {
      warnings.push(`Medium vulnerabilities: ${metrics.vulnerabilities.medium}`);
    }
  }
  
  return {
    passed: failures.length === 0,
    failures,
    warnings,
  };
}

// Export for use in monitoring
export default QUALITY_METRICS;