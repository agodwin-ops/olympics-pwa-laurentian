#!/usr/bin/env node
/**
 * Dashboard Loading Diagnostics
 * Tests all API endpoints the dashboard depends on
 */

const API_BASE = 'http://localhost:8080';

// Test authentication and user endpoints
async function testDashboardEndpoints() {
    console.log('🔍 DASHBOARD LOADING DIAGNOSTICS');
    console.log('=' .repeat(60));
    
    const endpoints = [
        // Core health check
        { name: 'API Health', url: `${API_BASE}/health`, method: 'GET' },
        
        // Auth endpoints that dashboard needs
        { name: 'Get Profile (No Auth)', url: `${API_BASE}/api/profile`, method: 'GET' },
        { name: 'Units List', url: `${API_BASE}/api/units`, method: 'GET' },
        { name: 'Lectures List', url: `${API_BASE}/api/lectures`, method: 'GET' },
        { name: 'Player Stats (No Auth)', url: `${API_BASE}/api/players/stats`, method: 'GET' },
        { name: 'Gameboard Stations', url: `${API_BASE}/api/gameboard/stations`, method: 'GET' },
        
        // Admin endpoints 
        { name: 'Admin Users', url: `${API_BASE}/api/admin/users`, method: 'GET' },
        { name: 'Admin Stats', url: `${API_BASE}/api/admin/stats`, method: 'GET' },
    ];
    
    console.log('Testing critical API endpoints dashboard depends on...\n');
    
    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint.url, {
                method: endpoint.method,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const status = response.status;
            const statusText = response.statusText;
            
            if (status === 200) {
                const data = await response.text();
                const preview = data.length > 100 ? data.substring(0, 100) + '...' : data;
                console.log(`✅ ${endpoint.name}: ${status} ${statusText}`);
                console.log(`   Response: ${preview}\n`);
            } else if (status === 401) {
                console.log(`🔑 ${endpoint.name}: ${status} ${statusText} (Auth Required - Expected)\n`);
            } else if (status === 404) {
                console.log(`❌ ${endpoint.name}: ${status} ${statusText} (ENDPOINT MISSING)\n`);
            } else {
                console.log(`⚠️  ${endpoint.name}: ${status} ${statusText}\n`);
            }
            
        } catch (error) {
            console.log(`💥 ${endpoint.name}: FAILED - ${error.message}\n`);
        }
    }
    
    console.log('=' .repeat(60));
    console.log('🎯 NEXT: Test dashboard page directly...');
    
    // Test the actual dashboard route
    try {
        console.log('\n🌐 Testing dashboard page HTML...');
        const dashboardResponse = await fetch('http://localhost:3001/dashboard');
        console.log(`Dashboard page: ${dashboardResponse.status} ${dashboardResponse.statusText}`);
        
        if (dashboardResponse.status === 200) {
            const html = await dashboardResponse.text();
            const hasError = html.includes('Application error') || html.includes('500') || html.includes('error');
            
            if (hasError) {
                console.log('❌ Dashboard page contains error indicators');
                // Look for specific error patterns
                const errorMatch = html.match(/<title>([^<]*error[^<]*)<\/title>/i);
                if (errorMatch) {
                    console.log(`   Error title: ${errorMatch[1]}`);
                }
            } else {
                console.log('✅ Dashboard page loaded successfully (no obvious errors)');
            }
        }
        
    } catch (error) {
        console.log(`💥 Dashboard page test failed: ${error.message}`);
    }
}

// Run the diagnostics
testDashboardEndpoints().catch(console.error);