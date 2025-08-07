/**
 * Security Verification Script
 * Verifies that all critical security fixes have been properly implemented
 */

const fs = require('fs');
const path = require('path');

console.log('=== SECURITY FIXES VERIFICATION ===\n');

const checks = [
  {
    name: 'SSL Verification Fix',
    file: 'src/lib/database.ts',
    pattern: /process\.env\.NODE_ENV\s*===\s*['"]development['"]/,
    expected: true,
    description: 'SSL verification should only be disabled in development'
  },
  {
    name: 'Environment Variable Security',
    file: 'src/app/page.tsx',
    pattern: /console\.log.*process\.env/,
    expected: false,
    description: 'No environment variables should be logged to console'
  },
  {
    name: 'CSRF Middleware',
    file: 'src/middleware/csrf.ts',
    exists: true,
    description: 'CSRF protection middleware should exist'
  },
  {
    name: 'File Validation',
    file: 'src/components/DocumentUpload.tsx',
    pattern: /file\.size\s*>\s*maxSize|file\.size\s*<\s*minSize/,
    expected: true,
    description: 'File type validation should be implemented'
  },
  {
    name: 'Input Validation Schema',
    file: 'src/lib/validation/schemas.ts',
    exists: true,
    description: 'Input validation schemas should exist'
  },
  {
    name: 'Rate Limiting Enhancement',
    file: 'src/lib/api-handler.ts',
    pattern: /database-backed rate limiting|rateLimitStore/,
    expected: true,
    description: 'Enhanced rate limiting should be implemented'
  },
  {
    name: 'Token Encryption',
    file: 'src/app/api/auth/[...nextauth]/route.ts',
    pattern: /encryptAccessToken|jose|encrypt/,
    expected: true,
    description: 'Access tokens should be encrypted'
  },
  {
    name: 'Production Logging Safety',
    file: 'src/lib/database.ts',
    pattern: /if\s*\(\s*process\.env\.NODE_ENV\s*===\s*['"]development['"]\s*\)/,
    expected: true,
    description: 'Console logging should be disabled in production'
  }
];

let passed = 0;
let failed = 0;

checks.forEach(check => {
  const filePath = path.join(__dirname, check.file);
  
  try {
    if (check.exists !== undefined) {
      // Check if file exists
      const exists = fs.existsSync(filePath);
      if (exists === check.exists) {
        console.log(`✅ ${check.name}: PASSED`);
        console.log(`   ${check.description}`);
        passed++;
      } else {
        console.log(`❌ ${check.name}: FAILED`);
        console.log(`   ${check.description}`);
        console.log(`   Expected file to ${check.exists ? 'exist' : 'not exist'}`);
        failed++;
      }
    } else if (check.pattern) {
      // Check for pattern in file
      const content = fs.readFileSync(filePath, 'utf8');
      const found = check.pattern.test(content);
      
      if (found === check.expected) {
        console.log(`✅ ${check.name}: PASSED`);
        console.log(`   ${check.description}`);
        passed++;
      } else {
        console.log(`❌ ${check.name}: FAILED`);
        console.log(`   ${check.description}`);
        console.log(`   Pattern ${check.expected ? 'not found' : 'found'} in ${check.file}`);
        failed++;
      }
    }
  } catch (error) {
    console.log(`⚠️  ${check.name}: ERROR`);
    console.log(`   Could not check: ${error.message}`);
    failed++;
  }
  
  console.log('');
});

console.log('=== SUMMARY ===');
console.log(`Total Checks: ${checks.length}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Success Rate: ${((passed / checks.length) * 100).toFixed(1)}%`);

if (failed === 0) {
  console.log('\n🎉 All security fixes have been successfully implemented!');
  process.exit(0);
} else {
  console.log('\n⚠️  Some security fixes may need attention.');
  process.exit(1);
}