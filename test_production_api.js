#!/usr/bin/env node

/**
 * Production API Test Script
 * Tests the admin-to-student gold award workflow
 */

const https = require('https');

const BACKEND_URL = 'https://olympics-pwa-laurentian.onrender.com';
const FRONTEND_URL = 'https://olympics-pwa-laurentian-2025.vercel.app';

// Test data
const testAdmin = {
  email: 'admin@test.com',
  password: 'AdminPass123!'
};

const testStudent = {
  email: 'student@test.com', 
  username: 'teststudent',
  password: 'StudentPass123!',
  user_program: 'BPHE Kinesiology'
};

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data),
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testWorkflow() {
  console.log('🧪 Testing Production API Workflow');
  console.log('Frontend:', FRONTEND_URL);
  console.log('Backend:', BACKEND_URL);
  
  try {
    // 1. Test backend health
    console.log('\n1. Testing backend health...');
    const healthCheck = await makeRequest(`${BACKEND_URL}/`);
    console.log('✅ Backend health:', healthCheck.status, healthCheck.data);
    
    // 2. Test admin login
    console.log('\n2. Testing admin login...');
    const adminFormData = new URLSearchParams();
    adminFormData.append('username', testAdmin.email);
    adminFormData.append('password', testAdmin.password);
    
    const adminLogin = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': adminFormData.toString().length
      },
      body: adminFormData.toString()
    });
    
    console.log('Admin login result:', adminLogin.status, adminLogin.data);
    
    if (adminLogin.status === 200 && adminLogin.data.access_token) {
      const adminToken = adminLogin.data.access_token;
      console.log('✅ Admin authenticated successfully');
      
      // 3. Test student login
      console.log('\n3. Testing student login...');
      const studentFormData = new URLSearchParams();
      studentFormData.append('username', testStudent.email);
      studentFormData.append('password', testStudent.password);
      
      const studentLogin = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': studentFormData.toString().length
        },
        body: studentFormData.toString()
      });
      
      console.log('Student login result:', studentLogin.status, studentLogin.data);
      
      if (studentLogin.status === 200 && studentLogin.data.access_token) {
        const studentToken = studentLogin.data.access_token;
        console.log('✅ Student authenticated successfully');
        
        // 4. Get student profile before gold award
        console.log('\n4. Getting student profile before award...');
        const beforeProfile = await makeRequest(`${BACKEND_URL}/api/students/me/profile`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${studentToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Student profile before:', beforeProfile.status, beforeProfile.data?.stats?.gold);
        
        // 5. Admin awards gold to student
        console.log('\n5. Admin awarding 25 gold to student...');
        const goldAward = {
          type: 'gold',
          target_user_id: studentLogin.data.user.id,
          amount: 25,
          description: 'Test gold award from admin'
        };
        
        const awardResult = await makeRequest(`${BACKEND_URL}/api/admin/award`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(goldAward)
        });
        
        console.log('Gold award result:', awardResult.status, awardResult.data);
        
        // 6. Get student profile after gold award
        console.log('\n6. Getting student profile after award...');
        const afterProfile = await makeRequest(`${BACKEND_URL}/api/students/me/profile`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${studentToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Student profile after:', afterProfile.status, afterProfile.data?.stats?.gold);
        
        // Summary
        console.log('\n📊 WORKFLOW SUMMARY:');
        console.log('Gold before:', beforeProfile.data?.stats?.gold || 0);
        console.log('Gold awarded:', 25);
        console.log('Gold after:', afterProfile.data?.stats?.gold || 0);
        console.log('Gold increase:', (afterProfile.data?.stats?.gold || 0) - (beforeProfile.data?.stats?.gold || 0));
        
        if (afterProfile.data?.stats?.gold > beforeProfile.data?.stats?.gold) {
          console.log('✅ WORKFLOW SUCCESS: Gold was successfully awarded and visible!');
        } else {
          console.log('❌ WORKFLOW FAILED: Gold award not reflected in student profile');
        }
        
      } else {
        console.log('❌ Student login failed');
      }
      
    } else {
      console.log('❌ Admin login failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testWorkflow().catch(console.error);