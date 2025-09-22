#!/usr/bin/env node

/**
 * Test Admin → Student Gold Award Workflow
 * Tests the complete workflow from admin login to student receiving gold
 */

const https = require('https');

const BACKEND_URL = 'https://olympics-pwa-laurentian.onrender.com';

// Real credentials from our system
const testAdmin = {
  email: 'agodwin@laurentian.ca',
  password: 'HotPotato45%'
};

const testStudent = {
  id: '708dbc39-a4de-47ef-82a5-61ce77ecbd36',  // testuser1@laurentian.ca
  email: 'testuser1@laurentian.ca'
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
  console.log('🧪 Testing Complete Admin → Student Gold Award Workflow');
  console.log('Backend:', BACKEND_URL);

  try {
    // 1. Admin login
    console.log('\n1. Admin login...');
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

    if (adminLogin.status !== 200) {
      console.log('❌ Admin login failed:', adminLogin.status, adminLogin.data);
      return;
    }

    const adminToken = adminLogin.data.access_token;
    console.log('✅ Admin authenticated successfully');

    // 2. Get student's current gold amount
    console.log('\n2. Getting student current stats...');
    const studentBefore = await makeRequest(`${BACKEND_URL}/api/admin/students/${testStudent.id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (studentBefore.status !== 200) {
      console.log('❌ Failed to get student stats:', studentBefore.status, studentBefore.data);
      return;
    }

    const goldBefore = studentBefore.data.data?.stats?.gold || 0;
    console.log(`📊 Student current gold: ${goldBefore}`);

    // 3. Admin awards 25 gold to student
    console.log('\n3. Admin awarding 25 gold to student...');
    const goldAward = {
      type: 'gold',
      target_user_id: testStudent.id,
      amount: 25,
      description: 'Test gold award for integration workflow'
    };

    const awardResult = await makeRequest(`${BACKEND_URL}/api/admin/award`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(goldAward)
    });

    console.log('Award result:', awardResult.status, awardResult.data);

    if (awardResult.status !== 200) {
      console.log('❌ Gold award failed');
      return;
    }

    // 4. Verify student's updated gold amount
    console.log('\n4. Verifying student updated stats...');
    const studentAfter = await makeRequest(`${BACKEND_URL}/api/admin/students/${testStudent.id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (studentAfter.status !== 200) {
      console.log('❌ Failed to get updated student stats:', studentAfter.status, studentAfter.data);
      return;
    }

    const goldAfter = studentAfter.data.data?.stats?.gold || 0;
    const goldIncrease = goldAfter - goldBefore;

    console.log(`📊 Student updated gold: ${goldAfter}`);
    console.log(`📈 Gold increase: +${goldIncrease}`);

    // 5. Summary
    console.log('\n📋 WORKFLOW SUMMARY:');
    console.log(`Student: ${testStudent.email}`);
    console.log(`Gold before: ${goldBefore}`);
    console.log(`Gold awarded: 25`);
    console.log(`Gold after: ${goldAfter}`);
    console.log(`Actual increase: ${goldIncrease}`);

    if (goldIncrease === 25) {
      console.log('\n🎉 SUCCESS: Complete workflow working perfectly!');
      console.log('✅ Admin authentication: PASS');
      console.log('✅ Student lookup: PASS');
      console.log('✅ Gold award: PASS');
      console.log('✅ Data persistence: PASS');
    } else {
      console.log('\n⚠️  PARTIAL SUCCESS: Workflow completed but gold increase doesn\'t match');
      console.log(`Expected: +25, Got: +${goldIncrease}`);
    }

  } catch (error) {
    console.error('❌ Workflow test failed:', error.message);
  }
}

// Run the test
testWorkflow().catch(console.error);