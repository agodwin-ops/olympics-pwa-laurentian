#!/usr/bin/env node
/**
 * Test Dashboard Authentication Flow
 * Simulates what happens when user accesses dashboard
 */

const puppeteer = require('puppeteer');

async function testDashboardFlow() {
    console.log('🔍 TESTING DASHBOARD AUTHENTICATION FLOW');
    console.log('=' .repeat(60));
    
    let browser;
    try {
        // Launch browser  
        browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        // Listen for console logs from the page
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('PWA Session Recovery') || 
                text.includes('Auth') || 
                text.includes('API Request') ||
                text.includes('Failed to load') ||
                text.includes('ERROR')) {
                console.log(`📱 Browser Console: ${text}`);
            }
        });
        
        // Listen for uncaught errors
        page.on('pageerror', error => {
            console.log(`❌ Page Error: ${error.message}`);
        });
        
        // Clear any existing auth data  
        console.log('🧹 Clearing existing authentication data...');
        await page.evaluateOnNewDocument(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        
        console.log('🌐 Loading dashboard page...');
        const response = await page.goto('http://localhost:3001/dashboard', {
            waitUntil: 'networkidle0',
            timeout: 10000
        });
        
        console.log(`📄 Dashboard Response: ${response.status()} ${response.statusText()}`);
        
        // Wait a bit for any authentication checks to complete
        await page.waitForTimeout(3000);
        
        // Check what's currently displayed
        const pageContent = await page.evaluate(() => {
            const body = document.body;
            if (body.textContent.includes('Loading Olympics RPG')) {
                return 'loading_screen';
            } else if (body.textContent.includes('onboarding') || window.location.pathname.includes('onboarding')) {
                return 'redirected_to_onboarding';
            } else if (body.textContent.includes('Dashboard') || body.textContent.includes('Gameboard')) {
                return 'dashboard_loaded';
            } else {
                return 'unknown_state';
            }
        });
        
        const currentUrl = page.url();
        
        console.log(`🎯 Current State: ${pageContent}`);
        console.log(`🌐 Current URL: ${currentUrl}`);
        
        if (pageContent === 'loading_screen') {
            console.log('❌ PROBLEM: Dashboard stuck in loading state');
            console.log('   This suggests the auth context is not completing');
            console.log('   Check browser console logs above for API errors');
        } else if (pageContent === 'redirected_to_onboarding') {
            console.log('✅ EXPECTED: Dashboard correctly redirects to onboarding when not authenticated');
        } else if (pageContent === 'dashboard_loaded') {
            console.log('🎉 UNEXPECTED: Dashboard loaded without authentication - check mock data fallback');
        }
        
    } catch (error) {
        console.log(`💥 Test failed: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Check if puppeteer is available
async function checkPuppeteer() {
    try {
        await import('puppeteer');
        return true;
    } catch (error) {
        console.log('⚠️ Puppeteer not available, falling back to basic test');
        return false;
    }
}

// Basic test without puppeteer
async function basicDashboardTest() {
    console.log('🔍 BASIC DASHBOARD TEST (No Browser)');
    console.log('=' .repeat(60));
    
    try {
        const response = await fetch('http://localhost:3001/dashboard');
        const html = await response.text();
        
        if (html.includes('Loading Olympics RPG')) {
            console.log('📱 Dashboard shows loading screen');
            console.log('🔍 This indicates auth context may be stuck');
        } else if (html.includes('Dashboard') || html.includes('Gameboard')) {
            console.log('📱 Dashboard content loaded');
        }
        
        console.log(`📄 Response: ${response.status} ${response.statusText}`);
        
    } catch (error) {
        console.log(`💥 Basic test failed: ${error.message}`);
    }
}

// Run appropriate test
checkPuppeteer().then(hasPuppeteer => {
    if (hasPuppeteer) {
        return testDashboardFlow();
    } else {
        return basicDashboardTest();
    }
}).catch(console.error);