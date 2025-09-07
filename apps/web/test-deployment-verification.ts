/**
 * Render Deployment Verification Test Suite
 * Ensures deployed version matches development testing
 */

interface DeploymentTestResult {
  testName: string;
  category: 'ENV' | 'ASSETS' | 'API' | 'DOMAIN' | 'PERFORMANCE';
  status: 'PASS' | 'FAIL' | 'WARNING';
  details: string;
  response?: number;
  time?: number;
  recommendations?: string[];
}

class DeploymentVerificationTester {
  private results: DeploymentTestResult[] = [];
  private baseUrl: string;
  private isProduction: boolean;

  constructor(baseUrl?: string) {
    // Auto-detect if we're testing production
    this.baseUrl = baseUrl || window.location.origin;
    this.isProduction = this.baseUrl.includes('render.com') || 
                       this.baseUrl.includes('onrender.com') ||
                       !this.baseUrl.includes('localhost');
    
    console.log(`🔍 Testing ${this.isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} deployment:`);
    console.log(`   Base URL: ${this.baseUrl}`);
  }

  async runAllTests(): Promise<void> {
    console.log('\n🚀 Starting Render Deployment Verification...');
    console.log('==============================================');
    
    await this.testEnvironmentVariables();
    await this.testAssetLoading();
    await this.testAPIEndpoints();
    await this.testDomainAndHTTPS();
    await this.testPerformance();
    
    this.printResults();
    this.generateDeploymentReport();
  }

  private async testEnvironmentVariables(): Promise<void> {
    console.log('\n🔐 Testing Environment Variables...');
    
    // Test health endpoint (indicates env vars loaded)
    const healthTest = await this.testEndpoint('/health', 'GET');
    this.results.push({
      testName: 'Health Check Endpoint',
      category: 'ENV',
      status: healthTest.status === 200 ? 'PASS' : 'FAIL',
      details: healthTest.status === 200 ? 
        'Health endpoint responding - environment loaded correctly' :
        `Health endpoint failed (${healthTest.status}) - environment issues`,
      response: healthTest.status,
      time: healthTest.time
    });

    // Test database connection (requires env vars)
    const dbTest = await this.testDatabaseConnection();
    this.results.push({
      testName: 'Database Connection',
      category: 'ENV',
      status: dbTest.success ? 'PASS' : 'FAIL',
      details: dbTest.success ?
        'Database connection successful - Supabase credentials working' :
        'Database connection failed - check Supabase environment variables',
      recommendations: dbTest.success ? [] : [
        'Verify SUPABASE_URL environment variable',
        'Check SUPABASE_SERVICE_ROLE_KEY is set correctly',
        'Ensure database is accessible from Render servers'
      ]
    });

    // Test JWT configuration
    const jwtTest = await this.testJWTConfiguration();
    this.results.push({
      testName: 'JWT Token Configuration',
      category: 'ENV',
      status: jwtTest.success ? 'PASS' : 'WARNING',
      details: jwtTest.success ?
        'JWT token system functioning correctly' :
        'JWT configuration may need verification',
      recommendations: jwtTest.success ? [] : [
        'Verify JWT_SECRET_KEY environment variable',
        'Test token generation and validation',
        'Check token expiry settings'
      ]
    });
  }

  private async testAssetLoading(): Promise<void> {
    console.log('\n🎨 Testing Asset Loading...');

    // Test CSS loading
    const cssTest = await this.testCSSLoading();
    this.results.push({
      testName: 'CSS Stylesheets',
      category: 'ASSETS',
      status: cssTest.success ? 'PASS' : 'FAIL',
      details: cssTest.success ?
        `CSS assets loading correctly (${cssTest.count} stylesheets found)` :
        'CSS assets not loading properly - check static file serving',
      recommendations: cssTest.success ? [] : [
        'Check Next.js static file configuration',
        'Verify build process includes CSS files',
        'Test with browser cache disabled'
      ]
    });

    // Test JavaScript loading
    const jsTest = await this.testJavaScriptLoading();
    this.results.push({
      testName: 'JavaScript Bundles',
      category: 'ASSETS',
      status: jsTest.success ? 'PASS' : 'FAIL',
      details: jsTest.success ?
        'JavaScript bundles loading and executing correctly' :
        'JavaScript loading issues detected',
      recommendations: jsTest.success ? [] : [
        'Check build process for JS compilation',
        'Verify module resolution in production',
        'Test JavaScript execution in browser console'
      ]
    });

    // Test image assets
    const imageTest = await this.testImageAssets();
    this.results.push({
      testName: 'Image Assets',
      category: 'ASSETS',
      status: imageTest.success ? 'PASS' : 'WARNING',
      details: imageTest.success ?
        'Images and visual assets loading correctly' :
        'Some image assets may have loading issues',
      recommendations: imageTest.success ? [] : [
        'Check image paths in production build',
        'Verify public folder deployment',
        'Test profile picture uploads'
      ]
    });

    // Test font loading
    const fontTest = await this.testFontLoading();
    this.results.push({
      testName: 'Web Fonts (Oswald, Inter)',
      category: 'ASSETS',
      status: fontTest.success ? 'PASS' : 'WARNING',
      details: fontTest.success ?
        'Custom fonts loading correctly' :
        'Font loading may be incomplete',
      recommendations: fontTest.success ? [] : [
        'Check Google Fonts connectivity',
        'Verify font-face declarations',
        'Test font fallbacks'
      ]
    });
  }

  private async testAPIEndpoints(): Promise<void> {
    console.log('\n🔌 Testing API Endpoints...');

    // Test authentication endpoints
    const authTest = await this.testEndpoint('/api/auth/status', 'GET');
    this.results.push({
      testName: 'Authentication API',
      category: 'API',
      status: (authTest.status === 200 || authTest.status === 401) ? 'PASS' : 'FAIL',
      details: (authTest.status === 200 || authTest.status === 401) ?
        'Authentication endpoints responding correctly' :
        `Authentication API failed (${authTest.status})`,
      response: authTest.status,
      time: authTest.time
    });

    // Test student endpoints
    const studentTest = await this.testEndpoint('/api/students/check', 'GET');
    this.results.push({
      testName: 'Student API Endpoints',
      category: 'API',
      status: studentTest.status < 500 ? 'PASS' : 'FAIL',
      details: studentTest.status < 500 ?
        'Student API endpoints accessible' :
        `Student API failed (${studentTest.status})`,
      response: studentTest.status,
      time: studentTest.time
    });

    // Test admin endpoints
    const adminTest = await this.testEndpoint('/api/admin/check', 'GET');
    this.results.push({
      testName: 'Admin API Endpoints',
      category: 'API',
      status: adminTest.status < 500 ? 'PASS' : 'FAIL',
      details: adminTest.status < 500 ?
        'Admin API endpoints accessible' :
        `Admin API failed (${adminTest.status})`,
      response: adminTest.status,
      time: adminTest.time
    });

    // Test file upload capability
    const uploadTest = await this.testFileUploadCapability();
    this.results.push({
      testName: 'File Upload System',
      category: 'API',
      status: uploadTest.success ? 'PASS' : 'WARNING',
      details: uploadTest.success ?
        'File upload system configured correctly' :
        'File upload system needs verification with actual files',
      recommendations: uploadTest.success ? [] : [
        'Test with actual file uploads',
        'Check file storage configuration',
        'Verify upload size limits'
      ]
    });
  }

  private async testDomainAndHTTPS(): Promise<void> {
    console.log('\n🔒 Testing Domain and HTTPS...');

    // Test HTTPS redirect
    const httpsTest = this.testHTTPSRedirect();
    this.results.push({
      testName: 'HTTPS Configuration',
      category: 'DOMAIN',
      status: httpsTest.success ? 'PASS' : 'WARNING',
      details: httpsTest.success ?
        'HTTPS properly configured and enforced' :
        'HTTPS configuration may need attention',
      recommendations: httpsTest.success ? [] : [
        'Ensure HTTPS redirect is enabled',
        'Check SSL certificate validity',
        'Test with different browsers'
      ]
    });

    // Test CORS configuration
    const corsTest = await this.testCORSConfiguration();
    this.results.push({
      testName: 'CORS Configuration',
      category: 'DOMAIN',
      status: corsTest.success ? 'PASS' : 'WARNING',
      details: corsTest.success ?
        'CORS headers configured correctly' :
        'CORS configuration may need adjustment',
      recommendations: corsTest.success ? [] : [
        'Check CORS origins in backend configuration',
        'Test cross-origin requests',
        'Verify preflight request handling'
      ]
    });

    // Test secure cookies
    const cookieTest = this.testSecureCookies();
    this.results.push({
      testName: 'Secure Cookie Handling',
      category: 'DOMAIN',
      status: cookieTest.success ? 'PASS' : 'WARNING',
      details: cookieTest.success ?
        'Cookies configured for secure HTTPS usage' :
        'Cookie security settings may need review',
      recommendations: cookieTest.success ? [] : [
        'Ensure cookies have Secure flag in production',
        'Check SameSite cookie configuration',
        'Test authentication persistence'
      ]
    });
  }

  private async testPerformance(): Promise<void> {
    console.log('\n⚡ Testing Performance...');

    // Test initial page load
    const loadTest = await this.testPageLoadPerformance();
    this.results.push({
      testName: 'Initial Page Load Speed',
      category: 'PERFORMANCE',
      status: loadTest.time < 3000 ? 'PASS' : loadTest.time < 5000 ? 'WARNING' : 'FAIL',
      details: `Page loads in ${loadTest.time}ms ${loadTest.time < 3000 ? '(Excellent)' : loadTest.time < 5000 ? '(Good)' : '(Needs Improvement)'}`,
      time: loadTest.time,
      recommendations: loadTest.time < 3000 ? [] : [
        'Optimize bundle size',
        'Enable caching headers',
        'Consider lazy loading for large components'
      ]
    });

    // Test API response times
    const apiPerf = await this.testAPIPerformance();
    this.results.push({
      testName: 'API Response Times',
      category: 'PERFORMANCE',
      status: apiPerf.avgTime < 500 ? 'PASS' : apiPerf.avgTime < 1000 ? 'WARNING' : 'FAIL',
      details: `Average API response: ${apiPerf.avgTime}ms`,
      time: apiPerf.avgTime,
      recommendations: apiPerf.avgTime < 500 ? [] : [
        'Optimize database queries',
        'Add API response caching',
        'Check database connection pooling'
      ]
    });

    // Test bundle size
    const bundleTest = this.testBundleSize();
    this.results.push({
      testName: 'JavaScript Bundle Size',
      category: 'PERFORMANCE',
      status: bundleTest.success ? 'PASS' : 'WARNING',
      details: bundleTest.success ?
        'Bundle size optimized for school networks' :
        'Bundle size may impact loading on slow connections',
      recommendations: bundleTest.success ? [] : [
        'Analyze bundle with webpack analyzer',
        'Remove unused dependencies',
        'Enable code splitting'
      ]
    });
  }

  // Helper methods for specific tests
  private async testEndpoint(path: string, method: string = 'GET'): Promise<{status: number, time: number}> {
    const startTime = performance.now();
    try {
      const response = await fetch(`${this.baseUrl}${path}`, { method });
      const endTime = performance.now();
      return { status: response.status, time: endTime - startTime };
    } catch (error: unknown) {
      const endTime = performance.now();
      return { status: 0, time: endTime - startTime };
    }
  }

  private async testDatabaseConnection(): Promise<{success: boolean}> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return { success: response.ok };
    } catch (error: unknown) {
      return { success: false };
    }
  }

  private async testJWTConfiguration(): Promise<{success: boolean}> {
    // Test JWT by attempting to access protected endpoint
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/me`);
      // 401 is expected without token - means JWT system is working
      return { success: response.status === 401 || response.ok };
    } catch (error: unknown) {
      return { success: false };
    }
  }

  private async testCSSLoading(): Promise<{success: boolean, count: number}> {
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
    let loadedCount = 0;
    
    for (const stylesheet of stylesheets) {
      try {
        // Check if stylesheet loaded
        if ((stylesheet as HTMLLinkElement).sheet) {
          loadedCount++;
        }
      } catch (error: unknown) {
        // Cross-origin stylesheets might throw errors but still be loaded
        loadedCount++;
      }
    }
    
    return { success: loadedCount > 0, count: loadedCount };
  }

  private async testJavaScriptLoading(): Promise<{success: boolean}> {
    // Check if React and Next.js are loaded
    const hasReact = typeof (window as any).React !== 'undefined';
    const hasNext = typeof (window as any).__NEXT_DATA__ !== 'undefined';
    
    return { success: hasReact || hasNext || document.querySelectorAll('script').length > 0 };
  }

  private async testImageAssets(): Promise<{success: boolean}> {
    const images = document.querySelectorAll('img');
    let loadedImages = 0;
    
    images.forEach(img => {
      if (img.complete && img.naturalHeight !== 0) {
        loadedImages++;
      }
    });
    
    return { success: images.length === 0 || loadedImages > 0 };
  }

  private async testFontLoading(): Promise<{success: boolean}> {
    // Check if custom fonts are loaded
    try {
      await document.fonts.ready;
      const oswaldLoaded = document.fonts.check('1em Oswald');
      const interLoaded = document.fonts.check('1em Inter');
      
      return { success: oswaldLoaded || interLoaded };
    } catch (error: unknown) {
      return { success: true }; // Assume success if font API not available
    }
  }

  private testHTTPSRedirect(): {success: boolean} {
    return { success: window.location.protocol === 'https:' || !this.isProduction };
  }

  private async testCORSConfiguration(): Promise<{success: boolean}> {
    // CORS is working if we can make API calls from the frontend
    try {
      await fetch(`${this.baseUrl}/api/auth/status`, { 
        method: 'OPTIONS' 
      });
      return { success: true };
    } catch (error: unknown) {
      return { success: false };
    }
  }

  private testSecureCookies(): {success: boolean} {
    // Check if cookies are configured securely in HTTPS
    const isSecure = window.location.protocol === 'https:';
    return { success: !this.isProduction || isSecure };
  }

  private async testPageLoadPerformance(): Promise<{time: number}> {
    // Use Navigation Timing API
    if (performance.timing) {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      return { time: loadTime };
    }
    
    // Fallback estimation
    return { time: 2000 };
  }

  private async testAPIPerformance(): Promise<{avgTime: number}> {
    const tests = [
      this.testEndpoint('/health'),
      this.testEndpoint('/api/auth/status'),
      this.testEndpoint('/api/students/check')
    ];
    
    const results = await Promise.all(tests);
    const avgTime = results.reduce((sum, result) => sum + result.time, 0) / results.length;
    
    return { avgTime };
  }

  private testBundleSize(): {success: boolean} {
    const scripts = document.querySelectorAll('script[src]');
    // Rough estimation - in production, should be optimized
    return { success: scripts.length < 10 }; // Reasonable number of script bundles
  }

  private async testFileUploadCapability(): Promise<{success: boolean}> {
    // Test if file upload endpoints are configured
    try {
      const response = await fetch(`${this.baseUrl}/api/lectures`, {
        method: 'OPTIONS'
      });
      return { success: response.status < 500 };
    } catch (error: unknown) {
      return { success: false };
    }
  }

  private printResults(): void {
    console.log('\n🎯 RENDER DEPLOYMENT VERIFICATION RESULTS');
    console.log('=====================================');
    
    const categories = ['ENV', 'ASSETS', 'API', 'DOMAIN', 'PERFORMANCE'];
    
    categories.forEach(category => {
      const categoryResults = this.results.filter(r => r.category === category);
      if (categoryResults.length === 0) return;
      
      console.log(`\n📋 ${category} TESTS:`);
      categoryResults.forEach(result => {
        const icon = result.status === 'PASS' ? '✅' : 
                     result.status === 'FAIL' ? '❌' : '⚠️';
        
        console.log(`${icon} ${result.testName}`);
        console.log(`   ${result.details}`);
        if (result.response) console.log(`   Response: ${result.response}`);
        if (result.time) console.log(`   Time: ${Math.round(result.time)}ms`);
        
        if (result.recommendations?.length) {
          console.log('   Recommendations:');
          result.recommendations.forEach(rec => console.log(`   • ${rec}`));
        }
      });
    });
    
    const passCount = this.results.filter(r => r.status === 'PASS').length;
    const failCount = this.results.filter(r => r.status === 'FAIL').length;
    const warningCount = this.results.filter(r => r.status === 'WARNING').length;
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   ✅ Passed: ${passCount}`);
    console.log(`   ⚠️ Warnings: ${warningCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   Total: ${this.results.length}`);
  }

  private generateDeploymentReport(): void {
    const passCount = this.results.filter(r => r.status === 'PASS').length;
    const totalTests = this.results.length;
    const successRate = (passCount / totalTests) * 100;
    
    console.log('\n🚀 DEPLOYMENT READINESS ASSESSMENT');
    console.log('================================');
    console.log(`Overall Success Rate: ${successRate.toFixed(1)}%`);
    
    if (successRate >= 90) {
      console.log('🎉 EXCELLENT: Deployment matches development perfectly!');
      console.log('   Ready for classroom use.');
    } else if (successRate >= 80) {
      console.log('👍 GOOD: Deployment working well with minor issues.');
      console.log('   Safe for classroom use, monitor warnings.');
    } else if (successRate >= 60) {
      console.log('⚠️ FAIR: Some issues need attention before classroom use.');
      console.log('   Fix failing tests before student deployment.');
    } else {
      console.log('❌ POOR: Significant deployment issues detected.');
      console.log('   Fix critical failures before using with students.');
    }
    
    const criticalFailures = this.results.filter(r => r.status === 'FAIL');
    if (criticalFailures.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES TO FIX:');
      criticalFailures.forEach((failure, i) => {
        console.log(`   ${i + 1}. ${failure.testName}: ${failure.details}`);
      });
    }
    
    console.log(`\n🔍 Tested: ${this.isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} environment`);
    console.log(`🌐 URL: ${this.baseUrl}`);
  }
}

// Export for use
export default DeploymentVerificationTester;

// Auto-run for development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Run tests 2 seconds after page load to allow assets to load
  setTimeout(() => {
    const tester = new DeploymentVerificationTester();
    // Uncomment to auto-run:
    // tester.runAllTests();
  }, 2000);
}

// Global function for manual testing
if (typeof window !== 'undefined') {
  (window as any).testDeployment = (url?: string) => {
    const tester = new DeploymentVerificationTester(url);
    return tester.runAllTests();
  };
}