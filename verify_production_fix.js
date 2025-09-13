#!/usr/bin/env node

/**
 * Production Fix Verification Script
 * Verifies that the frontend is now properly connecting to the production backend
 */

const https = require('https');

const FRONTEND_URL = 'https://olympics-pwa-laurentian-2025.vercel.app';
const EXPECTED_BACKEND = 'https://olympics-pwa-laurentian.onrender.com';

async function verifyFix() {
  console.log('🔍 Verifying Production API Fix');
  console.log('Frontend:', FRONTEND_URL);
  console.log('Expected Backend:', EXPECTED_BACKEND);
  
  return new Promise((resolve, reject) => {
    console.log('\n1. Checking frontend deployment...');
    
    const req = https.request(`${FRONTEND_URL}/onboarding`, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('✅ Frontend accessible, status:', res.statusCode);
        
        // Check for API URL references
        const hasProductionAPI = data.includes('olympics-pwa-laurentian.onrender.com');
        const hasLocalhostAPI = data.includes('localhost:8080');
        
        console.log('\n2. API Configuration Check:');
        console.log('- Production API URL found:', hasProductionAPI ? '✅' : '❌');
        console.log('- Localhost API URL found:', hasLocalhostAPI ? '⚠️  (This should be fixed after redeploy)' : '✅');
        
        if (!hasProductionAPI && hasLocalhostAPI) {
          console.log('\n🔄 DEPLOYMENT STATUS: Changes committed, waiting for Vercel redeploy');
          console.log('   The fix will take effect after the next Vercel deployment');
        } else if (hasProductionAPI && !hasLocalhostAPI) {
          console.log('\n✅ SUCCESS: Frontend now uses production API!');
          console.log('   Cross-device gold awards should now work correctly');
        }
        
        console.log('\n📋 NEXT STEPS:');
        console.log('1. Push changes to trigger Vercel redeploy: git push');
        console.log('2. Wait 2-3 minutes for deployment');
        console.log('3. Test admin gold award → student device visibility');
        console.log('4. Real-time updates should sync every 30 seconds');
        
        resolve({ hasProductionAPI, hasLocalhostAPI });
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function provideTroubleshootingSteps() {
  console.log('\n🔧 TROUBLESHOOTING WORKFLOW:');
  console.log('If the issue persists after deployment:');
  console.log('');
  console.log('1. Check Vercel Environment Variables:');
  console.log('   - Go to https://vercel.com/dashboard');
  console.log('   - Navigate to your project settings');
  console.log('   - Verify NEXT_PUBLIC_API_BASE_URL = https://olympics-pwa-laurentian.onrender.com');
  console.log('');
  console.log('2. Test Cross-Device Workflow:');
  console.log('   - Admin logs in on Device A');
  console.log('   - Student logs in on Device B');  
  console.log('   - Admin awards gold to student');
  console.log('   - Student should see gold update within 30 seconds');
  console.log('');
  console.log('3. Check Browser Developer Tools:');
  console.log('   - Open Network tab');
  console.log('   - Look for API calls to olympics-pwa-laurentian.onrender.com');
  console.log('   - Any calls to localhost indicate environment issue');
}

// Run verification
verifyFix()
  .then(() => provideTroubleshootingSteps())
  .catch(console.error);