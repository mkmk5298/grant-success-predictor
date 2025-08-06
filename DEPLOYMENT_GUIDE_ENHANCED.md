# Grant Predictor Platform - Enterprise Production Deployment Guide v2.0

## Principal Engineer's Production Deployment Framework
> **Authority**: 15-year Principal Engineer perspective with 500+ production deployments
> **Objective**: Zero-downtime, zero-defect production deployment with complete observability
> **Methodology**: Wave-based deployment with progressive enhancement and validation gates

---

## 🚀 WAVE-BASED DEPLOYMENT STRATEGY

### Wave Overview
```
Wave 1: Foundation (Security & Configuration) → 2-3 hours
Wave 2: Quality Gates (Testing & Validation) → 1-2 hours  
Wave 3: Integration (CI/CD & Monitoring) → 2-3 hours
Wave 4: Deployment (Zero-Downtime Release) → 1 hour
Wave 5: Operations (Maintenance & Resilience) → Ongoing
```

---

## 📋 PRE-FLIGHT CHECKLIST

### Automated Validation Script
```bash
#!/bin/bash
# pre-flight-check.sh

echo "🔍 Starting Pre-Flight Validation..."

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"
if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Node version must be >= 18.0.0"
    exit 1
fi

# Check for required files
REQUIRED_FILES=(".env.example" "package.json" "next.config.js" "tsconfig.json")
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Missing required file: $file"
        exit 1
    fi
done

# Check for sensitive data
if git grep -q "sk_live\|sk_test" -- '*.js' '*.ts' '*.jsx' '*.tsx'; then
    echo "❌ Found hardcoded API keys in source files"
    exit 1
fi

echo "✅ Pre-flight checks passed"
```

---

## 🌊 WAVE 1: FOUNDATION - Security & Configuration

### TASK 1.1: Comprehensive Stripe Pricing Update ($19/month)

#### Automated Price Detection Script
```bash
# find-pricing.sh
echo "🔍 Searching for all pricing references..."

# Search patterns for pricing
PATTERNS=(
    '\$36'
    '36.*month'
    'three.*month'
    '3.*month'
    'quarterly'
    'price.*36'
    'amount.*3600'  # Stripe uses cents
)

for pattern in "${PATTERNS[@]}"; do
    echo "Searching for: $pattern"
    grep -r "$pattern" --include="*.{js,jsx,ts,tsx,json,md}" .
done
```

#### Updated Stripe Configuration
```typescript
// src/config/stripe.ts
export const STRIPE_CONFIG = {
  // Production pricing
  MONTHLY_PRICE: {
    amount: 1900, // $19.00 in cents
    currency: 'usd',
    interval: 'month',
    productId: process.env.STRIPE_PRODUCT_ID!,
    priceId: process.env.STRIPE_PRICE_ID!,
  },
  
  // Legacy pricing migration
  LEGACY_PRICING_CUTOFF: '2025-02-01', // Grandfather existing users
  
  // Webhook configuration
  WEBHOOK_TOLERANCE: 300, // 5 minutes
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // ms
}

// Migration script for existing subscribers
export async function migratePricing(customerId: string) {
  // Implementation for grandfathering or migration
}
```

#### Database Migration
```sql
-- migrations/001_update_pricing.sql
BEGIN;

-- Add pricing version tracking
ALTER TABLE subscriptions 
ADD COLUMN pricing_version VARCHAR(20) DEFAULT 'v2_monthly_19';

-- Update existing active subscriptions
UPDATE subscriptions 
SET 
  amount = 1900,
  interval = 'month',
  pricing_version = 'v2_monthly_19'
WHERE 
  status = 'active' 
  AND created_at >= '2025-02-01';

-- Create audit log
INSERT INTO pricing_changes (
  subscription_id, 
  old_amount, 
  new_amount, 
  changed_at, 
  reason
)
SELECT 
  id, 
  amount, 
  1900, 
  NOW(), 
  'v2_pricing_update'
FROM subscriptions 
WHERE status = 'active';

COMMIT;
```

### TASK 1.2: Automated File Cleanup with Backup

```bash
#!/bin/bash
# cleanup-production.sh

# Create backup before cleanup
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
echo "📦 Creating backup in $BACKUP_DIR..."
mkdir -p "$BACKUP_DIR"

# Files to backup before deletion
BACKUP_FILES=(".env.local" ".env.production" "*.log")
for file in "${BACKUP_FILES[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "$BACKUP_DIR/"
    fi
done

# Automated cleanup
echo "🧹 Cleaning up development artifacts..."

# Safe deletion with confirmation
CLEANUP_DIRS=(
    ".next"
    "node_modules"
    "coverage"
    "dist"
    "build"
    ".turbo"
)

CLEANUP_FILES=(
    "*.log"
    ".DS_Store"
    "Thumbs.db"
    "*.swp"
    "*.swo"
    "*.tmp"
    "*.temp"
    ".env.local"
    ".env.production"
)

for dir in "${CLEANUP_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "  Removing directory: $dir"
        rm -rf "$dir"
    fi
done

for pattern in "${CLEANUP_FILES[@]}"; do
    find . -name "$pattern" -type f -delete 2>/dev/null
done

echo "✅ Cleanup completed. Backup saved to $BACKUP_DIR"
```

### TASK 1.3: Enhanced .gitignore Configuration
```gitignore
# === Dependencies ===
node_modules/
.pnp/
.pnp.js
.yarn/

# === Testing ===
coverage/
*.lcov
.nyc_output/
test-results/
playwright-report/
playwright/.cache/

# === Next.js ===
.next/
out/
build/
dist/
.turbo/

# === Production ===
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*
.pnpm-debug.log*

# === Environment ===
.env
.env.local
.env.production
.env.staging
.env*.local
!.env.example
!.env.test

# === IDE ===
.vscode/*
!.vscode/extensions.json
!.vscode/settings.json.example
.idea/
*.swp
*.swo
*~
.project
.classpath
.c9/
*.launch
.settings/

# === OS ===
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db
desktop.ini

# === Vercel ===
.vercel
.now

# === TypeScript ===
*.tsbuildinfo
next-env.d.ts

# === Package managers ===
pnpm-lock.yaml
package-lock.json
!yarn.lock

# === Temporary ===
*.tmp
*.temp
*.cache
.cache/

# === Security ===
*.pem
*.key
*.cert
*.crt
```

---

## 🌊 WAVE 2: QUALITY GATES - Testing & Performance

### TASK 2.1: Comprehensive Testing Setup

```json
// package.json - Enhanced scripts
{
  "scripts": {
    "test": "jest",
    "test:coverage": "jest --coverage --coverageReporters=text-lcov",
    "test:ci": "jest --ci --coverage --maxWorkers=2",
    "test:e2e": "playwright test",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "lighthouse": "lighthouse http://localhost:3000 --output=json --output-path=./lighthouse-report.json",
    "bundle-analyze": "ANALYZE=true next build",
    "type-check": "tsc --noEmit --incremental",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "security:audit": "npm audit --audit-level=moderate",
    "security:check": "npx snyk test"
  }
}
```

### TASK 2.2: Performance Budget Configuration

```javascript
// next.config.js - Performance budgets
module.exports = {
  experimental: {
    webVitalsAttribution: ['CLS', 'LCP', 'FID', 'FCP', 'TTFB'],
  },
  
  // Performance monitoring
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Bundle size limits
      config.performance = {
        maxAssetSize: 200000, // 200KB
        maxEntrypointSize: 300000, // 300KB
        hints: 'error',
      };
    }
    return config;
  },
  
  // Image optimization
  images: {
    domains: ['stripe.com', 'googleapis.com'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' *.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' *.stripe.com api.openai.com;"
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ],
      },
    ];
  },
};
```

### TASK 2.3: Quality Metrics & Thresholds

```typescript
// quality-gates.config.ts
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
    },
    bundleSize: {
      maxInitialJS: 200, // KB
      maxTotalJS: 500,   // KB
      maxCSS: 100,       // KB
    },
  },
  
  // Code quality
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
  },
};
```

---

## 🌊 WAVE 3: INTEGRATION - CI/CD & Monitoring

### TASK 3.1: GitHub Actions CI/CD Pipeline

```yaml
# .github/workflows/production-deploy.yml
name: Production Deployment Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  quality-gates:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci --prefer-offline --no-audit
      
      - name: Type checking
        run: npm run type-check
      
      - name: Linting
        run: npm run lint
      
      - name: Unit tests
        run: npm run test:ci
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
      
      - name: Security audit
        run: npm audit --audit-level=high
      
      - name: Build test
        run: npm run build
        env:
          NEXT_PUBLIC_APP_URL: ${{ secrets.NEXT_PUBLIC_APP_URL }}
      
      - name: Bundle size check
        uses: andresz1/size-limit-action@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          build_script: build
  
  performance-testing:
    runs-on: ubuntu-latest
    needs: quality-gates
    steps:
      - uses: actions/checkout@v3
      
      - name: Lighthouse CI
        uses: treosh/lighthouse-ci-action@v9
        with:
          configPath: './lighthouserc.json'
          uploadArtifacts: true
          temporaryPublicStorage: true
  
  deploy-preview:
    runs-on: ubuntu-latest
    needs: quality-gates
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel Preview
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ env.VERCEL_ORG_ID }}
          vercel-project-id: ${{ env.VERCEL_PROJECT_ID }}
          scope: ${{ env.VERCEL_ORG_ID }}
  
  deploy-production:
    runs-on: ubuntu-latest
    needs: [quality-gates, performance-testing]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel Production
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ env.VERCEL_ORG_ID }}
          vercel-project-id: ${{ env.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          scope: ${{ env.VERCEL_ORG_ID }}
      
      - name: Run smoke tests
        run: |
          npm install -g newman
          newman run ./tests/postman/production-smoke-tests.json
        env:
          PRODUCTION_URL: ${{ secrets.PRODUCTION_URL }}
      
      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Production deployment completed'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### TASK 3.2: Enhanced Vercel Configuration

```json
// vercel.json - Production-ready configuration
{
  "version": 2,
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm ci --prefer-offline",
  "regions": ["iad1", "sfo1"],
  
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30,
      "memory": 1024
    },
    "app/api/webhooks/stripe/*.ts": {
      "maxDuration": 60,
      "memory": 1024
    }
  },
  
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-store, max-age=0"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ],
  
  "rewrites": [
    {
      "source": "/robots.txt",
      "destination": "/api/robots"
    }
  ],
  
  "env": {
    "NODE_ENV": "production",
    "NEXT_TELEMETRY_DISABLED": "1"
  },
  
  "github": {
    "enabled": true,
    "autoAlias": true
  }
}
```

### TASK 3.3: Comprehensive Monitoring Setup

```typescript
// src/lib/monitoring.ts
import * as Sentry from '@sentry/nextjs';

// Sentry configuration
export function initMonitoring() {
  if (process.env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.VERCEL_ENV || 'production',
      
      // Performance monitoring
      tracesSampleRate: 0.1,
      profilesSampleRate: 0.1,
      
      // Session tracking
      autoSessionTracking: true,
      
      // Release tracking
      release: process.env.VERCEL_GIT_COMMIT_SHA,
      
      // Error filtering
      beforeSend(event, hint) {
        // Filter out non-critical errors
        if (event.exception) {
          const error = hint.originalException;
          // Skip network errors during development
          if (error?.message?.includes('NetworkError')) {
            return null;
          }
        }
        return event;
      },
      
      // Integrations
      integrations: [
        new Sentry.BrowserTracing({
          routingInstrumentation: Sentry.nextRouterInstrumentation,
        }),
      ],
    });
  }
}

// Custom metrics tracking
export function trackMetric(name: string, value: number, tags?: Record<string, string>) {
  if (typeof window !== 'undefined' && window.analytics) {
    window.analytics.track('Metric', {
      metric_name: name,
      metric_value: value,
      ...tags,
    });
  }
}

// Performance monitoring
export function measurePerformance() {
  if (typeof window !== 'undefined' && window.performance) {
    const perfData = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    const metrics = {
      dns: perfData.domainLookupEnd - perfData.domainLookupStart,
      tcp: perfData.connectEnd - perfData.connectStart,
      ttfb: perfData.responseStart - perfData.requestStart,
      download: perfData.responseEnd - perfData.responseStart,
      domInteractive: perfData.domInteractive - perfData.fetchStart,
      domComplete: perfData.domComplete - perfData.fetchStart,
    };
    
    Object.entries(metrics).forEach(([key, value]) => {
      trackMetric(`performance.${key}`, value);
    });
  }
}
```

---

## 🌊 WAVE 4: ZERO-DOWNTIME DEPLOYMENT

### TASK 4.1: Blue-Green Deployment Strategy

```bash
#!/bin/bash
# blue-green-deploy.sh

set -e

# Configuration
PRODUCTION_URL="https://grant-predictor.vercel.app"
STAGING_URL="https://grant-predictor-staging.vercel.app"
HEALTH_CHECK_PATH="/api/health"
ROLLBACK_TIMEOUT=300 # 5 minutes

echo "🚀 Starting Blue-Green Deployment..."

# Step 1: Deploy to staging
echo "📦 Deploying to staging environment..."
vercel --prod --scope=$VERCEL_SCOPE --env=staging

# Step 2: Health check staging
echo "🏥 Running health checks on staging..."
for i in {1..10}; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL$HEALTH_CHECK_PATH")
    if [ "$STATUS" = "200" ]; then
        echo "✅ Staging health check passed"
        break
    fi
    if [ "$i" = "10" ]; then
        echo "❌ Staging health check failed"
        exit 1
    fi
    sleep 10
done

# Step 3: Run smoke tests
echo "🧪 Running smoke tests..."
npm run test:e2e -- --grep @smoke

# Step 4: Traffic shift
echo "🔄 Shifting traffic to new version..."
vercel alias set $STAGING_URL $PRODUCTION_URL

# Step 5: Monitor for errors
echo "📊 Monitoring for errors (5 minutes)..."
START_TIME=$(date +%s)
while [ $(($(date +%s) - START_TIME)) -lt $ROLLBACK_TIMEOUT ]; do
    ERROR_RATE=$(curl -s "$PRODUCTION_URL/api/metrics" | jq '.errorRate')
    if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
        echo "⚠️ High error rate detected: $ERROR_RATE"
        echo "🔙 Initiating rollback..."
        vercel rollback
        exit 1
    fi
    sleep 30
done

echo "✅ Deployment successful!"
```

### TASK 4.2: Database Migration Strategy

```typescript
// src/lib/migrations/runner.ts
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

interface Migration {
  version: number;
  name: string;
  up: string;
  down: string;
}

export class MigrationRunner {
  private pool: Pool;
  
  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }
  
  async runMigrations() {
    // Create migrations table
    await this.createMigrationsTable();
    
    // Get pending migrations
    const pending = await this.getPendingMigrations();
    
    for (const migration of pending) {
      console.log(`Running migration: ${migration.name}`);
      
      try {
        await this.pool.query('BEGIN');
        
        // Run migration
        await this.pool.query(migration.up);
        
        // Record migration
        await this.pool.query(
          'INSERT INTO migrations (version, name, executed_at) VALUES ($1, $2, NOW())',
          [migration.version, migration.name]
        );
        
        await this.pool.query('COMMIT');
        console.log(`✅ Migration ${migration.name} completed`);
        
      } catch (error) {
        await this.pool.query('ROLLBACK');
        console.error(`❌ Migration ${migration.name} failed:`, error);
        throw error;
      }
    }
  }
  
  async rollback(steps: number = 1) {
    const executed = await this.getExecutedMigrations(steps);
    
    for (const migration of executed.reverse()) {
      console.log(`Rolling back: ${migration.name}`);
      
      try {
        await this.pool.query('BEGIN');
        
        // Run rollback
        await this.pool.query(migration.down);
        
        // Remove migration record
        await this.pool.query(
          'DELETE FROM migrations WHERE version = $1',
          [migration.version]
        );
        
        await this.pool.query('COMMIT');
        console.log(`✅ Rollback ${migration.name} completed`);
        
      } catch (error) {
        await this.pool.query('ROLLBACK');
        console.error(`❌ Rollback ${migration.name} failed:`, error);
        throw error;
      }
    }
  }
  
  private async createMigrationsTable() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
  }
  
  private async getPendingMigrations(): Promise<Migration[]> {
    // Implementation to read migration files and check against executed
    return [];
  }
  
  private async getExecutedMigrations(limit: number): Promise<Migration[]> {
    // Implementation to get executed migrations
    return [];
  }
}
```

---

## 🌊 WAVE 5: OPERATIONS EXCELLENCE

### TASK 5.1: Incident Response Runbook

```markdown
# INCIDENT RESPONSE PLAYBOOK

## Severity Levels
- **P0**: Complete outage, payment processing down
- **P1**: Major functionality broken, >30% users affected
- **P2**: Partial outage, <30% users affected  
- **P3**: Minor issues, workaround available
- **P4**: Cosmetic issues, no user impact

## Response Times
- P0: Immediate (< 5 minutes)
- P1: 15 minutes
- P2: 1 hour
- P3: 4 hours
- P4: Next business day

## Escalation Path
1. On-call engineer (PagerDuty)
2. Team lead
3. Engineering manager
4. CTO

## Common Issues & Solutions

### High Error Rate
```bash
# Check application logs
vercel logs --output json | jq '.[] | select(.level=="error")'

# Check error tracking
curl -H "Authorization: Bearer $SENTRY_TOKEN" \
  https://sentry.io/api/0/projects/grant-predictor/issues/

# Scale up if needed
vercel scale grant-predictor 3
```

### Database Connection Issues
```bash
# Check connection pool
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Reset connections
psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) 
  FROM pg_stat_activity 
  WHERE state = 'idle' AND state_change < NOW() - INTERVAL '10 minutes';"
```

### Payment Processing Failures
```bash
# Check Stripe webhook status
curl https://api.stripe.com/v1/webhook_endpoints \
  -u $STRIPE_SECRET_KEY:

# Replay failed webhooks
curl -X POST https://api.stripe.com/v1/webhook_endpoints/{id}/replay \
  -u $STRIPE_SECRET_KEY:
```
```

### TASK 5.2: Automated Health Checks

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import Stripe from 'stripe';

interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  details?: any;
}

export async function GET() {
  const checks: HealthCheck[] = [];
  const startTime = Date.now();
  
  // Database health
  try {
    const dbStart = Date.now();
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query('SELECT 1');
    await pool.end();
    
    checks.push({
      service: 'database',
      status: 'healthy',
      responseTime: Date.now() - dbStart,
    });
  } catch (error) {
    checks.push({
      service: 'database',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      details: error.message,
    });
  }
  
  // Stripe health
  try {
    const stripeStart = Date.now();
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-02-24.acacia',
    });
    await stripe.balance.retrieve();
    
    checks.push({
      service: 'stripe',
      status: 'healthy',
      responseTime: Date.now() - stripeStart,
    });
  } catch (error) {
    checks.push({
      service: 'stripe',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      details: error.message,
    });
  }
  
  // OpenAI/Anthropic health
  try {
    const aiStart = Date.now();
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    });
    
    checks.push({
      service: 'ai',
      status: response.ok ? 'healthy' : 'degraded',
      responseTime: Date.now() - aiStart,
    });
  } catch (error) {
    checks.push({
      service: 'ai',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      details: error.message,
    });
  }
  
  // Overall health
  const unhealthyServices = checks.filter(c => c.status === 'unhealthy');
  const degradedServices = checks.filter(c => c.status === 'degraded');
  
  const overallStatus = 
    unhealthyServices.length > 0 ? 'unhealthy' :
    degradedServices.length > 0 ? 'degraded' : 'healthy';
  
  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    responseTime: Date.now() - startTime,
    checks,
    version: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
  }, {
    status: overallStatus === 'healthy' ? 200 : 503,
  });
}
```

---

## 📊 POST-DEPLOYMENT VALIDATION

### Automated Smoke Tests
```javascript
// tests/smoke/production.test.js
const axios = require('axios');
const assert = require('assert');

const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://grant-predictor.vercel.app';

describe('Production Smoke Tests', () => {
  it('Homepage loads successfully', async () => {
    const response = await axios.get(PRODUCTION_URL);
    assert.equal(response.status, 200);
    assert(response.data.includes('Grant Predictor'));
  });
  
  it('API health check passes', async () => {
    const response = await axios.get(`${PRODUCTION_URL}/api/health`);
    assert.equal(response.status, 200);
    assert.equal(response.data.status, 'healthy');
  });
  
  it('Stripe checkout creates session', async () => {
    const response = await axios.post(`${PRODUCTION_URL}/api/v1/payments/create-subscription`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    assert(response.data.sessionId);
  });
  
  it('Static assets load with proper caching', async () => {
    const response = await axios.get(`${PRODUCTION_URL}/_next/static/chunks/main.js`);
    assert(response.headers['cache-control']);
    assert(response.headers['cache-control'].includes('immutable'));
  });
});
```

### Performance Monitoring Dashboard
```typescript
// src/lib/performance-monitor.ts
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  
  recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name)!;
    values.push(value);
    
    // Keep only last 100 values
    if (values.length > 100) {
      values.shift();
    }
    
    // Alert if threshold exceeded
    this.checkThresholds(name, value);
  }
  
  private checkThresholds(name: string, value: number) {
    const thresholds = {
      'api.response_time': 1000,
      'db.query_time': 500,
      'stripe.checkout_time': 3000,
      'page.load_time': 2500,
    };
    
    if (thresholds[name] && value > thresholds[name]) {
      console.error(`Performance threshold exceeded: ${name} = ${value}ms`);
      // Send alert to monitoring service
    }
  }
  
  getStats(metricName: string) {
    const values = this.metrics.get(metricName) || [];
    if (values.length === 0) return null;
    
    const sorted = [...values].sort((a, b) => a - b);
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }
}
```

---

## ✅ FINAL VALIDATION CHECKLIST

### Pre-Deployment
- [ ] All 6 original tasks completed
- [ ] Zero TypeScript errors (`npm run type-check`)
- [ ] Zero critical vulnerabilities (`npm audit`)
- [ ] All tests passing (`npm test`)
- [ ] Lighthouse score > 90
- [ ] Bundle size < 200KB initial JS
- [ ] All environment variables documented
- [ ] Database migrations tested
- [ ] Rollback procedure documented

### During Deployment
- [ ] Blue-green deployment successful
- [ ] Health checks passing
- [ ] No error spike detected
- [ ] Performance metrics within limits
- [ ] Smoke tests passing

### Post-Deployment
- [ ] Production URL accessible
- [ ] Payment flow functional
- [ ] Monitoring dashboards active
- [ ] Error tracking configured
- [ ] Team notified of deployment
- [ ] Documentation updated
- [ ] Customer support briefed

---

## 🎯 SUCCESS METRICS

```yaml
Deployment Success Criteria:
  - Zero downtime during deployment
  - Error rate < 0.1%
  - P95 response time < 500ms
  - All health checks green
  - No rollbacks required
  - Customer satisfaction maintained

Operational Excellence:
  - MTTR (Mean Time To Recovery) < 15 minutes
  - Deployment frequency: Daily
  - Change failure rate < 5%
  - Monitoring coverage > 95%
  - Incident detection < 2 minutes
```

---

## 📚 APPENDIX: Quick Reference

### Emergency Contacts
- On-Call Engineer: PagerDuty
- Stripe Support: +1-888-926-2289
- Vercel Support: support@vercel.com
- Database Admin: DBA team

### Useful Commands
```bash
# Quick rollback
vercel rollback --yes

# View recent deployments
vercel list

# Check logs
vercel logs --follow

# Scale application
vercel scale grant-predictor 5

# Emergency database backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

---

**Document Version**: 2.0  
**Last Updated**: February 2025  
**Maintained By**: Principal Engineering Team  
**Review Cycle**: Monthly

> 🔒 This document contains sensitive operational information. Handle with appropriate security measures.