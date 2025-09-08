#!/usr/bin/env node
/**
 * Test Auth API Response
 * Check what happens when we call /api/auth/me without token
 */

const API_BASE = 'http://localhost:8080';

async function testAuthAPI() {
    console.log('🔍 TESTING AUTH API RESPONSE');
    console.log('=' .repeat(60));
    
    try {
        console.log('📡 Calling /api/auth/me without token...');
        
        const response = await fetch(`${API_BASE}/api/auth/me`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`📄 Response Status: ${response.status} ${response.statusText}`);
        
        let responseData;
        try {
            responseData = await response.json();
            console.log('📦 Response Data:', JSON.stringify(responseData, null, 2));
        } catch (jsonError) {
            console.log('❌ Failed to parse response as JSON');
            const text = await response.text();
            console.log('📄 Raw Response:', text);
        }
        
        // Test what API client would do
        console.log('\n🔧 Simulating API Client behavior...');
        if (response.status === 401) {
            console.log('✅ 401 status detected - should clear token and set user to null');
            console.log('✅ Then should set loading to false and redirect to onboarding');
        } else {
            console.log(`❌ Unexpected status: ${response.status}`);
        }
        
    } catch (error) {
        console.log(`💥 Auth API test failed: ${error.message}`);
        
        if (error.message.includes('fetch')) {
            console.log('🔌 Network issue - is the API server running on port 8080?');
        }
    }
}

console.log('🎯 Testing what happens when auth API is called without token...\n');
testAuthAPI().catch(console.error);