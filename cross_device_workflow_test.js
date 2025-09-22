#!/usr/bin/env node

/**
 * Cross-Device Workflow Analysis
 * Identifies potential issues beyond API URL configuration
 */

const https = require('https');

const BACKEND_URL = 'https://olympics-pwa-laurentian.onrender.com';

async function analyzeCrossDeviceIssues() {
  console.log('🔍 Cross-Device Workflow Analysis');
  console.log('Looking beyond API URL issues...\n');
  
  try {
    // Test 1: Backend Database Persistence
    console.log('1. Testing Backend Database Persistence...');
    const healthCheck = await makeRequest(`${BACKEND_URL}/`);
    console.log(`✅ Backend status: ${healthCheck.data.status}`);
    console.log(`✅ Database: ${healthCheck.data.database}`);
    
    // Test 2: Real-time Update Mechanism
    console.log('\n2. Analyzing Real-time Update Issues...');
    console.log('The dashboard has a 30-second periodic refresh, but:');
    
    const updateIssues = [
      'Token expiration: Admin and student tokens might expire at different times',
      'Database transactions: Gold award might not be committed immediately', 
      'Cache issues: Frontend might be caching old data',
      'Authentication state: Student might not be properly authenticated',
      'Race conditions: Update requests happening simultaneously'
    ];
    
    updateIssues.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}`);
    });
    
    // Test 3: Check Authentication Workflow
    console.log('\n3. Authentication Workflow Check...');
    console.log('Testing if auth endpoints are working correctly...');
    
    const authTest = await makeRequest(`${BACKEND_URL}/api/auth/me`);
    if (authTest.status === 401) {
      console.log('✅ Auth endpoint correctly requires authentication');
    } else {
      console.log('❌ Auth endpoint issue:', authTest);
    }
    
    // Test 4: Potential Solutions Analysis
    console.log('\n4. Potential Root Causes & Solutions...');
    
    const solutions = [
      {
        issue: 'Frontend still using localhost despite env vars',
        solution: 'Check browser DevTools Network tab for actual API calls',
        test: 'Admin login → check if calls go to olympics-pwa-laurentian.onrender.com'
      },
      {
        issue: 'Database transaction not persisting immediately',
        solution: 'Add database commit confirmation to award endpoint',
        test: 'Admin awards gold → immediately query database for confirmation'
      },
      {
        issue: 'Student token expired, preventing data refresh',
        solution: 'Check token refresh logic in periodic update',
        test: 'Student stays logged in for >8 hours, check if updates stop'
      },
      {
        issue: 'Caching preventing real-time updates',
        solution: 'Add cache-busting parameters to API calls',
        test: 'Hard refresh on student device should show updated gold'
      },
      {
        issue: 'Admin and student using different databases',
        solution: 'Verify both are connecting to same Supabase instance',
        test: 'Check if admin can see student in admin panel'
      }
    ];
    
    solutions.forEach((sol, i) => {
      console.log(`\n   ${i + 1}. ISSUE: ${sol.issue}`);
      console.log(`      SOLUTION: ${sol.solution}`);
      console.log(`      TEST: ${sol.test}`);
    });
    
    console.log('\n🎯 IMMEDIATE ACTION PLAN:');
    console.log('1. Have admin open browser DevTools → Network tab');
    console.log('2. Admin logs in and awards 25 gold to a student');
    console.log('3. Check what API URLs are being called');
    console.log('4. If localhost calls appear → environment variable issue persists');
    console.log('5. If production calls work → database/caching issue');
    console.log('6. Student should hard refresh browser and check for gold');
    
  } catch (error) {
    console.error('Analysis failed:', error.message);
  }
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, (res) => {
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
    req.end();
  });
}

// Run analysis
analyzeCrossDeviceIssues().catch(console.error);