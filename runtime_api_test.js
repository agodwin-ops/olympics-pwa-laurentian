#!/usr/bin/env node

/**
 * Runtime API Test - Tests actual API calls made by the frontend
 * This simulates what the browser JavaScript would do
 */

const https = require('https');

const FRONTEND_URL = 'https://olympics-pwa-laurentian-2025.vercel.app';

async function testRuntimeAPIConfiguration() {
  console.log('🔍 Testing Runtime API Configuration');
  console.log('This tests what API URL the frontend JavaScript actually uses\n');
  
  // Test 1: Check if the frontend tries to call the correct API endpoint
  console.log('1. Testing API endpoint accessibility from frontend perspective...');
  
  try {
    // Simulate what the frontend would do - try to call auth endpoint
    const testCalls = [
      'https://olympics-pwa-laurentian.onrender.com/api/auth/me',
      'http://localhost:8080/api/auth/me'
    ];
    
    for (const url of testCalls) {
      try {
        console.log(`Testing: ${url}`);
        
        const response = await makeRequest(url);
        console.log(`  Status: ${response.status}`);
        console.log(`  Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
        
        if (url.includes('olympics-pwa-laurentian.onrender.com') && response.status === 401) {
          console.log('  ✅ Production API accessible (401 = correct auth required response)');
        } else if (url.includes('localhost')) {
          console.log('  ❌ Localhost would fail in production environment');
        }
        
      } catch (error) {
        if (url.includes('localhost')) {
          console.log(`  ✅ Localhost correctly fails: ${error.message}`);
        } else {
          console.log(`  ❌ Production API error: ${error.message}`);
        }
      }
      console.log('');
    }
    
    // Test 2: Check if there's a mismatch in the frontend configuration
    console.log('2. Analyzing potential configuration issues...');
    
    // The issue might be in the api-client.ts file itself
    // Let's check what the default fallback is
    console.log('Checking api-client.ts configuration:');
    console.log('- Default fallback: http://localhost:8080');
    console.log('- Production should use: NEXT_PUBLIC_API_BASE_URL env var');
    console.log('');
    
    console.log('🔍 POTENTIAL ISSUES:');
    console.log('1. Environment variable not being read at build time');
    console.log('2. Static site generation caching the localhost URL');
    console.log('3. Client-side hydration issue');
    console.log('4. Network request being made before environment variable is available');
    console.log('');
    
    console.log('💡 DEBUGGING STEPS:');
    console.log('1. Check browser developer tools → Network tab');
    console.log('2. Look for actual API calls when user logs in');
    console.log('3. See which URL is being called (localhost vs production)');
    console.log('4. If localhost calls are happening, it confirms environment variable issue');
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      timeout: 5000
    };
    
    const client = urlObj.protocol === 'https:' ? https : require('http');
    
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    req.end();
  });
}

// Run the test
testRuntimeAPIConfiguration().catch(console.error);