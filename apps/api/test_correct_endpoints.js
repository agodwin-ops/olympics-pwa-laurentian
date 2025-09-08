#!/usr/bin/env node
/**
 * Test the CORRECT API endpoints with proper prefixes
 */

const API_BASE = 'http://localhost:8080';

async function testCorrectEndpoints() {
    console.log('🔍 TESTING CORRECT API ENDPOINTS WITH PREFIXES');
    console.log('=' .repeat(60));
    
    // Based on router prefixes found in code
    const endpoints = [
        // Students router (/students prefix)
        '/api/students/me/profile',
        '/api/students/me/stats', 
        '/api/students/me/skills',
        '/api/students/gameboard/stations',
        
        // Admin router (no prefix, direct /api)
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
    
    console.log('\n🎯 CONCLUSION: API client needs to use correct prefixes!');
}

testCorrectEndpoints().catch(console.error);