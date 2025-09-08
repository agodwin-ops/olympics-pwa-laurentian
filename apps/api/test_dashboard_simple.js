#!/usr/bin/env node
/**
 * Simple Dashboard Test - No External Dependencies
 * Tests what the dashboard returns when accessed directly
 */

async function testDashboard() {
    console.log('🔍 SIMPLE DASHBOARD TEST');
    console.log('=' .repeat(60));
    
    try {
        console.log('📡 Fetching dashboard page...');
        const response = await fetch('http://localhost:3001/dashboard');
        const html = await response.text();
        
        console.log(`📄 Response: ${response.status} ${response.statusText}`);
        
        // Analyze the HTML content
        if (html.includes('Loading Olympics RPG')) {
            console.log('❌ ISSUE CONFIRMED: Dashboard shows loading screen');
            console.log('   This means the React component is stuck in loading state');
            console.log('   The auth context is likely not completing properly');
        } else if (html.includes('onboarding') || html.includes('login')) {
            console.log('✅ EXPECTED: Dashboard redirects to onboarding/login when not authenticated');
        } else if (html.includes('Dashboard') || html.includes('Gameboard')) {
            console.log('🎉 UNEXPECTED: Dashboard loaded with content');
        } else if (html.includes('error') || html.includes('Error')) {
            console.log('❌ ERROR STATE: Dashboard shows error page');
            // Try to extract error details
            const errorMatch = html.match(/<title>([^<]*error[^<]*)<\/title>/i);
            if (errorMatch) {
                console.log(`   Error title: ${errorMatch[1]}`);
            }
        } else {
            console.log('❓ UNKNOWN STATE: Cannot determine dashboard state');
            console.log('   HTML preview:', html.substring(0, 200) + '...');
        }
        
        // Check for specific loading indicators
        if (html.includes('Preparing your Olympic dashboard')) {
            console.log('🎯 DIAGNOSIS: Auth context loading state is the issue');
            console.log('   Dashboard is waiting for authentication context to resolve');
            console.log('   Either API call is failing or taking too long to complete');
        }
        
    } catch (error) {
        console.log(`💥 Dashboard test failed: ${error.message}`);
        
        if (error.message.includes('fetch')) {
            console.log('🔌 Network issue - is the frontend server running on port 3001?');
        }
    }
}

console.log('🎯 Testing if dashboard is stuck in loading state...\n');
testDashboard().catch(console.error);