#!/usr/bin/env node

/**
 * Critical Features Test Script
 * Run before every production deployment to ensure core functionality works
 * Usage: node scripts/test-critical-features.js
 */

const fs = require('fs');
const path = require('path');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const errors = [];

// Helper functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function testPass(testName) {
  totalTests++;
  passedTests++;
  log(`  ✅ ${testName}`, 'green');
}

function testFail(testName, error) {
  totalTests++;
  failedTests++;
  log(`  ❌ ${testName}`, 'red');
  errors.push({ test: testName, error: error.message || error });
}

function section(title) {
  console.log('');
  log(`━━━ ${title} ━━━`, 'cyan');
}

// Test 1: Check CSS for text visibility fixes
function testTextVisibility() {
  section('Text Visibility CSS Fixes');
  
  try {
    const cssPath = path.join(__dirname, '..', 'src', 'app', 'globals.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    
    // Check for emergency visibility fixes
    if (cssContent.includes('/* EMERGENCY PRODUCTION HOTFIX')) {
      testPass('Emergency CSS visibility fixes present');
    } else {
      testFail('Emergency CSS visibility fixes', 'Missing critical CSS fixes');
    }
    
    // Check for proper text color definitions
    if (cssContent.includes('.text-gray-800') && cssContent.includes('#1f2937')) {
      testPass('Text color utilities properly defined');
    } else {
      testFail('Text color utilities', 'Missing text color definitions');
    }
    
    // Check for white background text fix
    if (cssContent.includes('.bg-white') && cssContent.includes('#111827 !important')) {
      testPass('White background text contrast fixed');
    } else {
      testFail('White background contrast', 'White backgrounds may have invisible text');
    }
    
  } catch (error) {
    testFail('CSS file check', error);
  }
}

// Test 2: Check environment variables configuration
function testEnvironmentSetup() {
  section('Environment Variables Setup');
  
  try {
    const envExamplePath = path.join(__dirname, '..', '.env.example');
    const envContent = fs.readFileSync(envExamplePath, 'utf8');
    
    // Check for required environment variables
    const requiredVars = [
      'DATABASE_URL',
      'STRIPE_SECRET_KEY',
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL'
    ];
    
    requiredVars.forEach(varName => {
      if (envContent.includes(varName)) {
        testPass(`${varName} documented in .env.example`);
      } else {
        testFail(`${varName} documentation`, 'Missing from .env.example');
      }
    });
    
  } catch (error) {
    testFail('Environment configuration check', error);
  }
}

// Test 3: Check API endpoints exist
function testAPIEndpoints() {
  section('API Endpoints');
  
  const endpoints = [
    { path: 'src/app/api/v1/auth/google/route.ts', name: 'Google OAuth endpoint' },
    { path: 'src/app/api/v1/payments/create-subscription/route.ts', name: 'Stripe payment endpoint' },
    { path: 'src/app/api/v1/predictions/route.ts', name: 'Predictions endpoint' },
    { path: 'src/app/api/health/route.ts', name: 'Health check endpoint' }
  ];
  
  endpoints.forEach(endpoint => {
    const fullPath = path.join(__dirname, '..', endpoint.path);
    try {
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('export') && (content.includes('POST') || content.includes('GET'))) {
          testPass(endpoint.name);
        } else {
          testFail(endpoint.name, 'Endpoint exists but missing exports');
        }
      } else {
        testFail(endpoint.name, 'Endpoint file not found');
      }
    } catch (error) {
      testFail(endpoint.name, error);
    }
  });
}

// Test 4: Check component fixes
function testComponentFixes() {
  section('Component Fixes');
  
  try {
    // Check PaymentModal for Stripe integration
    const paymentModalPath = path.join(__dirname, '..', 'src', 'components', 'PaymentModal.tsx');
    const paymentContent = fs.readFileSync(paymentModalPath, 'utf8');
    
    if (paymentContent.includes('window.location.href = data.url')) {
      testPass('PaymentModal Stripe redirect implemented');
    } else {
      testFail('PaymentModal Stripe redirect', 'Missing Stripe checkout redirect');
    }
    
    // Check GoogleAuthButton
    const authButtonPath = path.join(__dirname, '..', 'src', 'components', 'GoogleAuthButton.tsx');
    const authContent = fs.readFileSync(authButtonPath, 'utf8');
    
    if (authContent.includes('/api/v1/auth/google')) {
      testPass('GoogleAuthButton API endpoint configured');
    } else {
      testFail('GoogleAuthButton endpoint', 'Missing or incorrect auth endpoint');
    }
    
  } catch (error) {
    testFail('Component checks', error);
  }
}

// Test 5: Check package.json configuration
function testPackageConfiguration() {
  section('Package Configuration');
  
  try {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Check React version
    if (packageJson.dependencies.react === '18.3.1') {
      testPass('React version 18.3.1 (stable)');
    } else {
      testFail('React version', `Found ${packageJson.dependencies.react}, expected 18.3.1`);
    }
    
    // Check for critical dependencies
    const criticalDeps = ['stripe', '@stripe/stripe-js', 'next', 'react', 'react-dom'];
    criticalDeps.forEach(dep => {
      if (packageJson.dependencies[dep]) {
        testPass(`${dep} installed`);
      } else {
        testFail(`${dep} dependency`, 'Missing critical dependency');
      }
    });
    
    // Check for build scripts
    if (packageJson.scripts.build && packageJson.scripts.start) {
      testPass('Build and start scripts configured');
    } else {
      testFail('Build scripts', 'Missing build or start script');
    }
    
  } catch (error) {
    testFail('Package configuration check', error);
  }
}

// Test 6: Check TypeScript configuration
function testTypeScriptConfig() {
  section('TypeScript Configuration');
  
  try {
    const tsconfigPath = path.join(__dirname, '..', 'tsconfig.json');
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    
    if (tsconfig.compilerOptions.strict) {
      testPass('TypeScript strict mode enabled');
    } else {
      testFail('TypeScript strict mode', 'Strict mode should be enabled for production');
    }
    
    if (tsconfig.compilerOptions.jsx === 'preserve') {
      testPass('JSX configuration correct for Next.js');
    } else {
      testFail('JSX configuration', 'JSX should be set to "preserve" for Next.js');
    }
    
  } catch (error) {
    testFail('TypeScript configuration check', error);
  }
}

// Main test runner
async function runTests() {
  log('🚨 PRODUCTION READINESS TESTS', 'yellow');
  log('================================', 'yellow');
  
  testTextVisibility();
  testEnvironmentSetup();
  testAPIEndpoints();
  testComponentFixes();
  testPackageConfiguration();
  testTypeScriptConfig();
  
  // Summary
  console.log('');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
  log('TEST SUMMARY', 'blue');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
  
  log(`Total Tests: ${totalTests}`, 'cyan');
  log(`Passed: ${passedTests}`, 'green');
  log(`Failed: ${failedTests}`, failedTests > 0 ? 'red' : 'green');
  
  if (errors.length > 0) {
    console.log('');
    log('FAILED TESTS:', 'red');
    errors.forEach(err => {
      log(`  • ${err.test}: ${err.error}`, 'red');
    });
  }
  
  console.log('');
  if (failedTests === 0) {
    log('✅ ALL TESTS PASSED - READY FOR PRODUCTION!', 'green');
    process.exit(0);
  } else {
    log('❌ CRITICAL ISSUES FOUND - FIX BEFORE DEPLOYING!', 'red');
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  log('Fatal error running tests:', 'red');
  console.error(error);
  process.exit(1);
});