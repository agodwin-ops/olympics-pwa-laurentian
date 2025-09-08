#!/usr/bin/env node
/**
 * Debug Auth Context Logs
 * Simulate auth context behavior step by step
 */

// Mock localStorage and sessionStorage
const localStorage = {
    getItem: (key) => null, // Simulate no stored data
    setItem: (key, value) => console.log(`📦 localStorage.setItem(${key}, ${value})`),
    removeItem: (key) => console.log(`🗑️ localStorage.removeItem(${key})`)
};

const sessionStorage = {
    getItem: (key) => null,
    setItem: (key, value) => console.log(`📦 sessionStorage.setItem(${key}, ${value})`),
    removeItem: (key) => console.log(`🗑️ sessionStorage.removeItem(${key})`)
};

// Mock API client
const apiClient = {
    setToken: (token) => console.log(`🔑 apiClient.setToken(${token})`),
    getCurrentUser: async () => {
        console.log('📡 apiClient.getCurrentUser() called');
        // Simulate 401 error
        throw new Error('Authentication required');
    }
};

// Mock React state functions
let mockUser = null;
let mockLoading = true;

const setUser = (user) => {
    mockUser = user;
    console.log(`👤 setUser(${user ? 'user object' : 'null'})`);
};

const setLoading = (loading) => {
    mockLoading = loading;
    console.log(`⏳ setLoading(${loading})`);
};

// Simulate the checkAuthStatus function
async function checkAuthStatus() {
    console.log('🔍 PWA Session Recovery: Checking for existing authentication...');
    
    try {
        // Check multiple storage locations for better mobile PWA persistence
        const storedToken = localStorage.getItem('olympics_auth_token') || 
                           sessionStorage.getItem('olympics_auth_token');
        const storedUser = localStorage.getItem('olympics_user') || 
                          sessionStorage.getItem('olympics_user');
        
        console.log(`💾 Stored Token: ${storedToken ? 'found' : 'not found'}`);
        console.log(`💾 Stored User: ${storedUser ? 'found' : 'not found'}`);
        
        if (storedToken) {
            console.log('✅ Found stored token, validating with server...');
            
            // Set token for API client
            apiClient.setToken(storedToken);
            
            try {
                // Validate token with server and get current user data
                const response = await apiClient.getCurrentUser();
                
                if (response.success && response.data) {
                    console.log('✅ Token valid, user authenticated:', response.data.email || response.data.username);
                    setUser(response.data);
                    console.log('🎯 PWA Session Recovery: Successfully restored user session');
                } else {
                    throw new Error('Token validation failed');
                }
            } catch (apiError) {
                console.log('❌ Token invalid or expired, checking for cached user data...');
                
                // If API call fails but we have cached user data, try to use it temporarily
                if (storedUser) {
                    try {
                        const userData = JSON.parse(storedUser);
                        console.log('⚠️ Using cached user data (offline mode):', userData.email || userData.username);
                        setUser(userData);
                        
                        // Keep the token in case network comes back
                        return;
                    } catch (parseError) {
                        console.log('❌ Cached user data corrupted');
                    }
                }
                
                // Clear everything if token is invalid and no valid cache
                localStorage.removeItem('olympics_user');
                localStorage.removeItem('olympics_auth_token');
                sessionStorage.removeItem('olympics_user');
                sessionStorage.removeItem('olympics_auth_token');
                apiClient.setToken(null);
                setUser(null);
            }
        } else {
            console.log('❌ No stored token found - user needs to login');
            // No token found, user needs to login
            apiClient.setToken(null);
            setUser(null);
        }
    } catch (error) {
        console.error('❌ PWA Session Recovery failed:', error.message);
        // Clear potentially corrupted auth data
        localStorage.removeItem('olympics_user');
        localStorage.removeItem('olympics_auth_token');
        sessionStorage.removeItem('olympics_user');
        sessionStorage.removeItem('olympics_auth_token');
        apiClient.setToken(null);
        setUser(null);
    } finally {
        setLoading(false);
        console.log(`🎯 Final State: loading=${mockLoading}, user=${mockUser ? 'set' : 'null'}`);
    }
}

console.log('🎯 Simulating Auth Context Behavior...\n');
console.log('🔢 Initial State: loading=true, user=null\n');

checkAuthStatus().then(() => {
    console.log('\n✅ Auth context simulation completed');
    console.log(`📊 Result: loading=${mockLoading}, user=${mockUser ? 'authenticated' : 'null'}`);
    
    if (mockLoading === false && mockUser === null) {
        console.log('🎯 EXPECTED: Should redirect to onboarding');
    } else if (mockLoading === true) {
        console.log('❌ PROBLEM: Still in loading state');
    }
}).catch(error => {
    console.log(`💥 Simulation failed: ${error.message}`);
});