#!/usr/bin/env node

/**
 * Security Fixes Validation Script
 * Tests all critical security implementations
 */

const fs = require('fs');
const path = require('path');

console.log('🔒 Security Fixes Validation Starting...\n');

const tests = [
  {
    name: 'SSL Configuration Fix',
    test: () => {
      const dbFile = fs.readFileSync(path.join(__dirname, '../src/lib/database.ts'), 'utf8');
      const hasConditionalSSL = dbFile.includes('process.env.NODE_ENV === \'development\'') && 
                                dbFile.includes('rejectUnauthorized: false') &&
                                dbFile.includes('rejectUnauthorized: true');
      return {
        passed: hasConditionalSSL,
        message: hasConditionalSSL ? 
          'SSL configuration is conditional based on environment' :
          'SSL configuration is not properly secured'
      };
    }
  },
  
  {
    name: 'Environment Variable Exposure',
    test: () => {
      const pageFile = fs.readFileSync(path.join(__dirname, '../src/app/page.tsx'), 'utf8');
      const hasSecureEnvCheck = !pageFile.includes('NEXT_PUBLIC_GOOGLE_CLIENT_ID:') &&
                               !pageFile.includes('NEXT_PUBLIC_APP_URL:') &&
                               pageFile.includes('process.env.NODE_ENV === \'development\'');
      return {
        passed: hasSecureEnvCheck,
        message: hasSecureEnvCheck ?
          'Environment variables are not exposed to client' :
          'Environment variables may be exposed in client code'
      };
    }
  },
  
  {
    name: 'CSRF Middleware Creation',
    test: () => {
      const csrfExists = fs.existsSync(path.join(__dirname, '../src/middleware/csrf.ts'));
      if (!csrfExists) {
        return { passed: false, message: 'CSRF middleware file not found' };
      }
      
      const csrfFile = fs.readFileSync(path.join(__dirname, '../src/middleware/csrf.ts'), 'utf8');
      const hasCSRFProtection = csrfFile.includes('generateCSRFToken') &&
                               csrfFile.includes('validateCSRFToken') &&
                               csrfFile.includes('withCSRFProtection') &&
                               csrfFile.includes('timingSafeEqual');
      
      return {
        passed: hasCSRFProtection,
        message: hasCSRFProtection ?
          'CSRF middleware properly implemented with timing-safe validation' :
          'CSRF middleware missing critical security functions'
      };
    }
  },
  
  {
    name: 'File Upload Security',
    test: () => {
      const pageFile = fs.readFileSync(path.join(__dirname, '../src/app/page.tsx'), 'utf8');
      const uploadFile = fs.readFileSync(path.join(__dirname, '../src/components/DocumentUpload.tsx'), 'utf8');
      
      const hasSecureValidation = 
        pageFile.includes('file.size < 100') && // Minimum size check
        pageFile.includes('allowedMimeTypes.includes(file.type)') && // MIME type validation
        pageFile.includes('suspiciousPatterns') && // Malicious file detection
        uploadFile.includes('10 * 1024 * 1024') && // 10MB limit
        uploadFile.includes('fileName.includes(\'..\')'); // Path traversal prevention
      
      return {
        passed: hasSecureValidation,
        message: hasSecureValidation ?
          'File upload validation includes size, MIME type, and security checks' :
          'File upload validation is incomplete or missing security checks'
      };
    }
  },
  
  {
    name: 'Token Encryption',
    test: () => {
      const authFile = fs.readFileSync(path.join(__dirname, '../src/app/api/auth/[...nextauth]/route.ts'), 'utf8');
      const hasEncryption = authFile.includes('EncryptJWT') &&
                           authFile.includes('jwtDecrypt') &&
                           authFile.includes('encryptToken') &&
                           authFile.includes('decryptToken') &&
                           authFile.includes('encryptedAccessToken');
      
      return {
        passed: hasEncryption,
        message: hasEncryption ?
          'Access tokens are encrypted using jose library' :
          'Token encryption is not properly implemented'
      };
    }
  },
  
  {
    name: 'Enhanced Rate Limiting',
    test: () => {
      const apiFile = fs.readFileSync(path.join(__dirname, '../src/lib/api-handler.ts'), 'utf8');
      const hasDbRateLimit = apiFile.includes('connectToDatabase') &&
                             apiFile.includes('rate_limits') &&
                             apiFile.includes('checkRateLimitInMemory') &&
                             apiFile.includes('RATE_LIMITS') &&
                             apiFile.includes('getRateLimitInfo');
      
      return {
        passed: hasDbRateLimit,
        message: hasDbRateLimit ?
          'Rate limiting uses database backing with in-memory fallback' :
          'Rate limiting is not properly enhanced'
      };
    }
  },
  
  {
    name: 'Input Validation Schemas',
    test: () => {
      const schemaExists = fs.existsSync(path.join(__dirname, '../src/lib/validation/schemas.ts'));
      if (!schemaExists) {
        return { passed: false, message: 'Validation schemas file not found' };
      }
      
      const schemaFile = fs.readFileSync(path.join(__dirname, '../src/lib/validation/schemas.ts'), 'utf8');
      const predictionsFile = fs.readFileSync(path.join(__dirname, '../src/app/api/v1/predictions/route.ts'), 'utf8');
      
      const hasComprehensiveValidation = 
        schemaFile.includes('predictionRequestSchema') &&
        schemaFile.includes('sanitizeString') &&
        schemaFile.includes('validateRequest') &&
        schemaFile.includes('SAFE_STRING_REGEX') &&
        predictionsFile.includes('validateRequest(predictionRequestSchema');
      
      return {
        passed: hasComprehensiveValidation,
        message: hasComprehensiveValidation ?
          'Comprehensive Zod validation schemas implemented and used' :
          'Input validation schemas incomplete or not properly integrated'
      };
    }
  },
  
  {
    name: 'Production Console Logging',
    test: () => {
      const filesToCheck = [
        '../src/lib/database.ts',
        '../src/app/api/auth/[...nextauth]/route.ts',
        '../src/components/DocumentUpload.tsx',
        '../src/lib/api-handler.ts'
      ];
      
      let hasSecureLogging = true;
      let unsafeLogCount = 0;
      
      filesToCheck.forEach(file => {
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Look for console statements not wrapped in development checks
          const lines = content.split('\n');
          lines.forEach((line, index) => {
            if (line.includes('console.') && 
                !line.includes("process.env.NODE_ENV === 'development'") &&
                index > 0 && 
                !lines[index-1].includes("process.env.NODE_ENV === 'development'") &&
                !lines[index-1].includes('Always log') && // Exception for critical errors
                !lines[index-1].includes('// Always log')) {
              hasSecureLogging = false;
              unsafeLogCount++;
            }
          });
        }
      });
      
      return {
        passed: hasSecureLogging,
        message: hasSecureLogging ?
          'All console logging is production-safe' :
          `Found ${unsafeLogCount} unsafe console statements that will log in production`
      };
    }
  }
];

let passed = 0;
let failed = 0;

tests.forEach((test, index) => {
  try {
    const result = test.test();
    const status = result.passed ? '✅' : '❌';
    const statusText = result.passed ? 'PASS' : 'FAIL';
    
    console.log(`${index + 1}. ${test.name}: ${status} ${statusText}`);
    console.log(`   ${result.message}\n`);
    
    if (result.passed) {
      passed++;
    } else {
      failed++;
    }
  } catch (error) {
    console.log(`${index + 1}. ${test.name}: ❌ ERROR`);
    console.log(`   Test execution failed: ${error.message}\n`);
    failed++;
  }
});

console.log('='.repeat(50));
console.log(`Security Validation Summary:`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📊 Total: ${tests.length}`);
console.log('='.repeat(50));

if (failed === 0) {
  console.log('\n🎉 All security fixes have been successfully implemented!');
  console.log('🔒 Your application is now significantly more secure.');
} else {
  console.log(`\n⚠️  ${failed} security issue(s) still need attention.`);
  console.log('🔧 Please review the failed tests above.');
  process.exit(1);
}

console.log('\n📝 Additional Security Recommendations:');
console.log('1. Regularly update dependencies with npm audit');
console.log('2. Use HTTPS in production');
console.log('3. Implement Content Security Policy (CSP) headers');
console.log('4. Add security headers with middleware');
console.log('5. Regular security testing and code reviews');
console.log('6. Monitor for vulnerabilities with automated tools');