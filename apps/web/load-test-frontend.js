/**
 * Frontend Load Testing Script for Olympics PWA
 * Run this in browser console to test concurrent user interactions
 */

class FrontendLoadTester {
    constructor() {
        this.baseUrl = window.location.origin;
        this.testResults = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            errors: []
        };
    }

    // Simulate concurrent student logins
    async simulateConcurrentLogins(userCount = 10) {
        console.log(`🚀 Testing ${userCount} concurrent logins...`);
        
        const loginPromises = [];
        for (let i = 1; i <= userCount; i++) {
            const loginData = {
                email: `loadtest${i}@olympics.com`,
                password: 'TestPass123!'
            };
            
            loginPromises.push(this.makeRequest('/api/auth/login', 'POST', loginData));
        }
        
        const results = await Promise.allSettled(loginPromises);
        const successful = results.filter(r => r.status === 'fulfilled').length;
        
        console.log(`✅ ${successful}/${userCount} concurrent logins successful`);
        return results;
    }

    // Simulate concurrent XP requests
    async simulateConcurrentXPRequests(tokens, count = 20) {
        console.log(`🏆 Testing ${count} concurrent XP requests...`);
        
        const xpPromises = [];
        for (let i = 0; i < count; i++) {
            const token = tokens[i % tokens.length];
            const headers = { 'Authorization': `Bearer ${token}` };
            
            // Random XP award
            const awardData = {
                type: 'xp',
                target_user_id: this.generateUUID(),
                amount: Math.floor(Math.random() * 100) + 50,
                description: `Load test XP award ${i}`
            };
            
            xpPromises.push(this.makeRequest('/api/admin/award', 'POST', awardData, headers));
        }
        
        const results = await Promise.allSettled(xpPromises);
        const successful = results.filter(r => r.status === 'fulfilled').length;
        
        console.log(`✅ ${successful}/${count} concurrent XP requests successful`);
        return results;
    }

    // Simulate concurrent dice rolls
    async simulateConcurrentDiceRolls(tokens, count = 30) {
        console.log(`🎲 Testing ${count} concurrent dice rolls...`);
        
        const dicePromises = [];
        for (let i = 0; i < count; i++) {
            const token = tokens[i % tokens.length];
            const headers = { 'Authorization': `Bearer ${token}` };
            
            const rollData = {
                station_id: Math.floor(Math.random() * 10) + 1,
                skill_level: Math.floor(Math.random() * 5) + 1
            };
            
            dicePromises.push(this.makeRequest('/api/gameboard/roll-dice', 'POST', rollData, headers));
        }
        
        const results = await Promise.allSettled(dicePromises);
        const successful = results.filter(r => r.status === 'fulfilled').length;
        
        console.log(`✅ ${successful}/${count} concurrent dice rolls successful`);
        return results;
    }

    // Test leaderboard updates under load
    async testLeaderboardUpdates(tokens, iterations = 10) {
        console.log(`📊 Testing leaderboard updates with ${tokens.length} concurrent users...`);
        
        for (let i = 0; i < iterations; i++) {
            const promises = tokens.map(token => {
                const headers = { 'Authorization': `Bearer ${token}` };
                return this.makeRequest('/api/leaderboard', 'GET', null, headers);
            });
            
            await Promise.allSettled(promises);
            console.log(`Iteration ${i + 1}/${iterations} completed`);
            
            // Small delay between iterations
            await this.delay(500);
        }
        
        console.log('✅ Leaderboard load test completed');
    }

    // Simulate real user behavior patterns
    async simulateRealisticUserBehavior(token, duration = 60000) {
        console.log(`👤 Simulating realistic user behavior for ${duration/1000}s...`);
        
        const headers = { 'Authorization': `Bearer ${token}` };
        const startTime = Date.now();
        let actionCount = 0;
        
        while (Date.now() - startTime < duration) {
            // Random user actions
            const actions = [
                () => this.makeRequest('/api/leaderboard', 'GET', null, headers),
                () => this.makeRequest('/api/player/stats', 'GET', null, headers),
                () => this.makeRequest('/api/gameboard/stations', 'GET', null, headers)
            ];
            
            try {
                const randomAction = actions[Math.floor(Math.random() * actions.length)];
                await randomAction();
                actionCount++;
                
                // Random delay between actions (2-15 seconds)
                await this.delay(Math.random() * 13000 + 2000);
            } catch (error) {
                this.testResults.errors.push(`User behavior: ${error.message}`);
            }
        }
        
        console.log(`👤 User completed ${actionCount} actions in ${duration/1000}s`);
        return actionCount;
    }

    // Test data integrity by checking consistency
    async testDataIntegrity(adminToken) {
        console.log('🔍 Testing data integrity...');
        
        const headers = { 'Authorization': `Bearer ${adminToken}` };
        
        try {
            // Get current leaderboard
            const leaderboard1 = await this.makeRequest('/api/leaderboard', 'GET', null, headers);
            
            // Simulate some activity
            await this.delay(1000);
            
            // Get leaderboard again
            const leaderboard2 = await this.makeRequest('/api/leaderboard', 'GET', null, headers);
            
            // Check for consistency
            if (JSON.stringify(leaderboard1) === JSON.stringify(leaderboard2)) {
                console.log('✅ Data consistency maintained');
            } else {
                console.log('⚠️ Data consistency may be affected by concurrent operations');
            }
            
        } catch (error) {
            console.log(`❌ Data integrity test failed: ${error.message}`);
        }
    }

    // Utility method to make HTTP requests
    async makeRequest(endpoint, method = 'GET', data = null, headers = {}) {
        const startTime = performance.now();
        
        try {
            const config = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                }
            };
            
            if (data) {
                config.body = JSON.stringify(data);
            }
            
            const response = await fetch(`${this.baseUrl}${endpoint}`, config);
            const result = await response.json();
            
            const responseTime = performance.now() - startTime;
            this.updateStats(true, responseTime);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${result.error || 'Request failed'}`);
            }
            
            return result;
            
        } catch (error) {
            const responseTime = performance.now() - startTime;
            this.updateStats(false, responseTime);
            this.testResults.errors.push(error.message);
            throw error;
        }
    }

    // Update test statistics
    updateStats(success, responseTime) {
        this.testResults.totalRequests++;
        
        if (success) {
            this.testResults.successfulRequests++;
        } else {
            this.testResults.failedRequests++;
        }
        
        // Update average response time
        this.testResults.averageResponseTime = (
            (this.testResults.averageResponseTime * (this.testResults.totalRequests - 1) + responseTime) /
            this.testResults.totalRequests
        );
    }

    // Generate UUID for test data
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // Utility delay function
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Run comprehensive frontend load test
    async runComprehensiveTest() {
        console.log('🏔️ OLYMPICS PWA - FRONTEND LOAD TEST');
        console.log('=====================================');
        
        try {
            // Step 1: Test concurrent logins
            const loginResults = await this.simulateConcurrentLogins(15);
            const successfulTokens = loginResults
                .filter(r => r.status === 'fulfilled')
                .map(r => r.value.data.access_token)
                .filter(token => token);
            
            if (successfulTokens.length === 0) {
                console.log('❌ No successful logins. Cannot continue with load test.');
                return;
            }
            
            console.log(`✅ ${successfulTokens.length} tokens available for testing`);
            
            // Step 2: Test concurrent dice rolls
            await this.simulateConcurrentDiceRolls(successfulTokens, 25);
            
            // Step 3: Test leaderboard under load
            await this.testLeaderboardUpdates(successfulTokens, 5);
            
            // Step 4: Test realistic user behavior
            const behaviorPromises = successfulTokens.slice(0, 5).map(token =>
                this.simulateRealisticUserBehavior(token, 30000) // 30 seconds each
            );
            
            await Promise.all(behaviorPromises);
            
            // Step 5: Test data integrity
            if (successfulTokens.length > 0) {
                await this.testDataIntegrity(successfulTokens[0]);
            }
            
            // Generate report
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Load test failed:', error);
        }
    }

    // Generate test report
    generateReport() {
        console.log('\n📊 FRONTEND LOAD TEST RESULTS');
        console.log('==============================');
        console.log(`Total Requests: ${this.testResults.totalRequests}`);
        console.log(`Successful: ${this.testResults.successfulRequests}`);
        console.log(`Failed: ${this.testResults.failedRequests}`);
        console.log(`Success Rate: ${((this.testResults.successfulRequests / this.testResults.totalRequests) * 100).toFixed(2)}%`);
        console.log(`Average Response Time: ${this.testResults.averageResponseTime.toFixed(2)}ms`);
        
        if (this.testResults.errors.length > 0) {
            console.log(`\n⚠️ Errors (${this.testResults.errors.length}):`);
            this.testResults.errors.slice(0, 5).forEach(error => console.log(`- ${error}`));
        }
        
        // Performance assessment
        console.log('\n🎯 Performance Assessment:');
        if (this.testResults.averageResponseTime < 500) {
            console.log('✅ Response time excellent (< 500ms)');
        } else if (this.testResults.averageResponseTime < 2000) {
            console.log('⚠️ Response time acceptable (< 2s)');
        } else {
            console.log('❌ Response time needs improvement (> 2s)');
        }
        
        const successRate = (this.testResults.successfulRequests / this.testResults.totalRequests) * 100;
        if (successRate > 99) {
            console.log('✅ Success rate excellent (> 99%)');
        } else if (successRate > 95) {
            console.log('⚠️ Success rate acceptable (> 95%)');
        } else {
            console.log('❌ Success rate needs improvement (< 95%)');
        }
    }
}

// Usage instructions
console.log('🏔️ Olympics PWA Frontend Load Tester Loaded!');
console.log('');
console.log('To run the comprehensive load test:');
console.log('const tester = new FrontendLoadTester();');
console.log('await tester.runComprehensiveTest();');
console.log('');
console.log('Or run individual tests:');
console.log('await tester.simulateConcurrentLogins(20);');
console.log('await tester.simulateConcurrentDiceRolls(tokens, 30);');
console.log('await tester.testLeaderboardUpdates(tokens, 10);');

// Make the class available globally
window.FrontendLoadTester = FrontendLoadTester;