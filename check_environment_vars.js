#!/usr/bin/env node

/**
 * Environment Variables Diagnostic Script
 * Checks how the frontend is configured in production
 */

const https = require('https');

const FRONTEND_URL = 'https://olympics-pwa-laurentian-2025.vercel.app';

function checkFrontendEnvironment() {
  return new Promise((resolve, reject) => {
    // Create a simple page that will show the client-side environment variables
    const testHTML = `
    <html>
    <body>
    <script>
    document.body.innerHTML = '<pre>' + 
    'NEXT_PUBLIC_API_BASE_URL: ' + (window.location.hostname.includes('vercel') ? 
      'Production environment detected' : 'Local environment detected') + '\\n' +
    'Current hostname: ' + window.location.hostname + '\\n' +
    'Current protocol: ' + window.location.protocol + '\\n' +
    'Expected API URL in production: https://olympics-pwa-laurentian.onrender.com' +
    '</pre>';
    </script>
    </body>
    </html>
    `;
    
    console.log('🔍 Diagnosing Frontend Environment Configuration');
    console.log('Frontend URL:', FRONTEND_URL);
    
    // Try to access the onboarding page and check network requests
    const req = https.request(`${FRONTEND_URL}/onboarding`, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('✅ Frontend accessible, status:', res.statusCode);
        
        // Look for any API base URL hints in the HTML
        const hasApiRef = data.includes('olympics-pwa-laurentian.onrender.com');
        const hasLocalhostRef = data.includes('localhost:8080');
        
        console.log('API URL references found:');
        console.log('- Production API URL found:', hasApiRef ? '✅' : '❌');
        console.log('- Localhost API URL found:', hasLocalhostRef ? '⚠️' : '✅');
        
        if (hasLocalhostRef && !hasApiRef) {
          console.log('\n🚨 ISSUE IDENTIFIED: Frontend may be using localhost API URL in production!');
          console.log('This explains why admin awards are not showing up on student devices.');
          console.log('\nSOLUTION: Vercel environment variables need to be configured.');
        }
        
        resolve({ hasApiRef, hasLocalhostRef, statusCode: res.statusCode });
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function testCrossDeviceScenario() {
  console.log('\n🔄 Simulating Cross-Device Issue:');
  console.log('1. Admin on Device A: Awards 25 gold to student');
  console.log('2. Student on Device B: Should see updated gold amount');
  console.log('3. Issue: If frontend uses localhost:8080, Device B cannot connect to Device A\'s local server');
  console.log('\n💡 Expected behavior:');
  console.log('- Both devices should connect to: https://olympics-pwa-laurentian.onrender.com');
  console.log('- Real-time updates should work via periodic refresh (every 30 seconds)');
  console.log('- Gold changes should be immediately visible after refresh');
}

async function main() {
  try {
    await checkFrontendEnvironment();
    await testCrossDeviceScenario();
    
    console.log('\n📋 RECOMMENDED FIXES:');
    console.log('1. Set NEXT_PUBLIC_API_BASE_URL=https://olympics-pwa-laurentian.onrender.com in Vercel');
    console.log('2. Redeploy the frontend to pick up the new environment variable');
    console.log('3. Test the workflow again on separate devices');
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
  }
}

main();