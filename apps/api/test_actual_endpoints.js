#!/usr/bin/env node
/**
 * Test the ACTUAL API endpoints to confirm routing
 */

const API_BASE = 'http://localhost:8080';

async function testActualEndpoints() {
    console.log('🔍 TESTING ACTUAL API ENDPOINTS');
    console.log('=' .repeat(60));
    
    const endpoints = [
        '/api/me/profile',
        '/api/me/stats', 
        '/api/me/skills',
        '/api/gameboard/stations',
        '/api/units',
        '/api/lectures',
        '/api/admin/students',
        '/api/admin/stats',
    ];
    
    for (const endpoint of endpoints) {
        try {
            const response = await fetch(`${API_BASE}${endpoint}`);
            const status = response.status;
            const statusText = response.statusText;
            
            if (status === 200) {
                console.log(`✅ ${endpoint}: ${status} ${statusText}`);
            } else if (status === 401) {
                console.log(`🔑 ${endpoint}: ${status} ${statusText} (Auth Required)`);
            } else if (status === 404) {
                console.log(`❌ ${endpoint}: ${status} ${statusText} (NOT FOUND)`);
            } else {
                console.log(`⚠️  ${endpoint}: ${status} ${statusText}`);
            }
            
        } catch (error) {
            console.log(`💥 ${endpoint}: ERROR - ${error.message}`);
        }
    }
}

testActualEndpoints().catch(console.error);