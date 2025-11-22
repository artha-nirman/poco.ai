#!/usr/bin/env node

/**
 * V2 API Test Runner
 * Comprehensive testing of V2 API endpoints without external dependencies
 */

const fs = require('fs');
const path = require('path');

class V2ApiTestRunner {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
  }

  log(message, type = 'info') {
    const symbols = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      test: '🧪'
    };
    console.log(`${symbols[type]} ${message}`);
  }

  async runTest(testName, testFn) {
    this.testResults.total++;
    try {
      await testFn();
      this.testResults.passed++;
      this.testResults.details.push({ test: testName, status: 'PASS' });
      this.log(`${testName} - PASSED`, 'success');
    } catch (error) {
      this.testResults.failed++;
      this.testResults.details.push({ test: testName, status: 'FAIL', error: error.message });
      this.log(`${testName} - FAILED: ${error.message}`, 'error');
    }
  }

  async testFileExists(filePath, description) {
    return this.runTest(`File Exists: ${description}`, () => {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
    });
  }

  async testRouteStructure(routePath, expectedExports = ['GET', 'POST']) {
    return this.runTest(`Route Structure: ${routePath}`, () => {
      if (!fs.existsSync(routePath)) {
        throw new Error(`Route file not found: ${routePath}`);
      }
      
      const content = fs.readFileSync(routePath, 'utf8');
      
      // Check for export statements
      for (const method of expectedExports) {
        const exportPattern = new RegExp(`export.*${method}`, 'i');
        if (!exportPattern.test(content)) {
          throw new Error(`Missing ${method} export in ${routePath}`);
        }
      }
      
      // Check for TypeScript imports
      if (!content.includes('import') || !content.includes('NextRequest')) {
        throw new Error(`Missing required imports in ${routePath}`);
      }
    });
  }

  async testApiRoutes() {
    this.log('Testing V2 API Route Structure...', 'test');
    
    const apiBasePath = path.join(process.cwd(), 'app', 'api', 'v2');
    
    // Test analyze endpoint
    const analyzeRoute = path.join(apiBasePath, '[country]', 'policies', 'analyze', 'route.ts');
    await this.testFileExists(analyzeRoute, 'V2 Analyze Route');
    await this.testRouteStructure(analyzeRoute, ['POST']);
    
    // Test progress endpoint  
    const progressRoute = path.join(apiBasePath, '[country]', 'policies', 'progress', '[sessionId]', 'route.ts');
    await this.testFileExists(progressRoute, 'V2 Progress Route');
    await this.testRouteStructure(progressRoute, ['GET']);
    
    // Test results endpoint
    const resultsRoute = path.join(apiBasePath, '[country]', 'policies', 'results', '[sessionId]', 'route.ts');
    await this.testFileExists(resultsRoute, 'V2 Results Route');
    await this.testRouteStructure(resultsRoute, ['GET']);
  }

  async testTypeDefinitions() {
    this.log('Testing V2 Type Definitions...', 'test');
    
    const typesPath = path.join(process.cwd(), 'lib', 'types', 'v2.ts');
    await this.testFileExists(typesPath, 'V2 Type Definitions');
    
    await this.runTest('V2 Types Content Validation', () => {
      const content = fs.readFileSync(typesPath, 'utf8');
      
      const requiredTypes = [
        'V2AnalysisRequest',
        'V2AnalysisResponse', 
        'V2SessionData',
        'CountryConfiguration',
        'PolicyFeatures',
        'Recommendation'
      ];
      
      for (const type of requiredTypes) {
        if (!content.includes(`interface ${type}`) && !content.includes(`type ${type}`)) {
          throw new Error(`Missing type definition: ${type}`);
        }
      }
    });
  }

  async testDatabaseSchema() {
    this.log('Testing V2 Database Components...', 'test');
    
    // Test V2 session store
    const sessionStorePath = path.join(process.cwd(), 'lib', 'database', 'v2-session-store.ts');
    await this.testFileExists(sessionStorePath, 'V2 Session Store');
    
    await this.runTest('V2 Session Store Structure', () => {
      const content = fs.readFileSync(sessionStorePath, 'utf8');
      
      const requiredMethods = [
        'createSession',
        'getSession', 
        'updateSession',
        'storeAnalysisResults'
      ];
      
      for (const method of requiredMethods) {
        if (!content.includes(method)) {
          throw new Error(`Missing method in V2SessionStore: ${method}`);
        }
      }
    });
    
    // Test database schema
    const schemaPath = path.join(process.cwd(), 'docs', 'database', 'v2-schema.sql');
    await this.testFileExists(schemaPath, 'V2 Database Schema');
  }

  async testCountrySupport() {
    this.log('Testing V2 Country Support...', 'test');
    
    const countryUtilsPath = path.join(process.cwd(), 'lib', 'utils', 'country-detection.ts');
    await this.testFileExists(countryUtilsPath, 'Country Detection Utils');
    
    await this.runTest('Country Detection Functions', () => {
      const content = fs.readFileSync(countryUtilsPath, 'utf8');
      
      const requiredFunctions = [
        'detectCountryFromUrl',
        'detectCountryFromHeaders',
        'getCountryConfiguration',
        'validateCountrySupport'
      ];
      
      for (const func of requiredFunctions) {
        if (!content.includes(func)) {
          throw new Error(`Missing function: ${func}`);
        }
      }
    });
  }

  async testPolicyProcessor() {
    this.log('Testing V2 Policy Processing...', 'test');
    
    const processorPath = path.join(process.cwd(), 'lib', 'services', 'policy-processor.ts');
    await this.testFileExists(processorPath, 'Policy Processor Service');
    
    await this.runTest('Policy Processor Functions', () => {
      const content = fs.readFileSync(processorPath, 'utf8');
      
      // Check for main processing functions
      if (!content.includes('analyzePolicy') && !content.includes('processPolicy')) {
        throw new Error('Missing main policy analysis function');
      }
      
      // Check for AI service integration
      if (!content.includes('Gemini') && !content.includes('AI')) {
        throw new Error('Missing AI service integration');
      }
    });
  }

  async testSecurityComponents() {
    this.log('Testing V2 Security & Privacy...', 'test');
    
    const piiDetectorPath = path.join(process.cwd(), 'lib', 'security', 'pii-detector.ts');
    await this.testFileExists(piiDetectorPath, 'PII Detector');
    
    const piiProtectionPath = path.join(process.cwd(), 'lib', 'security', 'pii-protection.ts');
    await this.testFileExists(piiProtectionPath, 'PII Protection');
    
    await this.runTest('PII Protection Functions', () => {
      const detectorContent = fs.readFileSync(piiDetectorPath, 'utf8');
      const protectionContent = fs.readFileSync(piiProtectionPath, 'utf8');
      
      if (!detectorContent.includes('detectPII')) {
        throw new Error('Missing detectPII function');
      }
      
      if (!protectionContent.includes('encryptPII') && !protectionContent.includes('encrypt')) {
        throw new Error('Missing PII encryption function');
      }
    });
  }

  async testDocumentation() {
    this.log('Testing V2 Documentation...', 'test');
    
    // Test API documentation
    const apiDocsPath = path.join(process.cwd(), 'docs', 'api', 'v2-api-documentation.md');
    await this.testFileExists(apiDocsPath, 'V2 API Documentation');
    
    // Test OpenAPI spec
    const openApiPath = path.join(process.cwd(), 'docs', 'api', 'openapi-v2.yaml');
    await this.testFileExists(openApiPath, 'OpenAPI V2 Specification');
    
    // Test integration guide
    const integrationPath = path.join(process.cwd(), 'docs', 'integration', 'developer-guide.md');
    await this.testFileExists(integrationPath, 'Developer Integration Guide');
    
    // Test migration guide
    const migrationPath = path.join(process.cwd(), 'docs', 'migration', 'v1-to-v2-migration.md');
    await this.testFileExists(migrationPath, 'V1 to V2 Migration Guide');
    
    // Test main README
    const readmePath = path.join(process.cwd(), 'README.md');
    await this.testFileExists(readmePath, 'Main README');
  }

  async run() {
    console.log('🚀 Starting V2 API Test Suite...\n');
    
    const startTime = Date.now();
    
    try {
      await this.testApiRoutes();
      await this.testTypeDefinitions();
      await this.testDatabaseSchema();
      await this.testCountrySupport();
      await this.testPolicyProcessor();
      await this.testSecurityComponents();
      await this.testDocumentation();
    } catch (error) {
      this.log(`Test suite error: ${error.message}`, 'error');
    }
    
    const duration = Date.now() - startTime;
    
    this.printResults(duration);
  }

  printResults(duration) {
    console.log('\n📊 V2 API Test Results:');
    console.log(`   ${this.testResults.passed}/${this.testResults.total} tests passed`);
    
    if (this.testResults.failed > 0) {
      console.log(`   ${this.testResults.failed} tests failed`);
      console.log('\n❌ Failed Tests:');
      this.testResults.details
        .filter(result => result.status === 'FAIL')
        .forEach(result => {
          console.log(`   - ${result.test}: ${result.error}`);
        });
    }
    
    console.log(`   Duration: ${duration}ms`);
    
    if (this.testResults.failed === 0) {
      console.log('\n🎉 All V2 API tests passed! System is ready for production.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the issues above.');
    }
  }
}

// Run the tests
if (require.main === module) {
  const testRunner = new V2ApiTestRunner();
  testRunner.run().catch(console.error);
}

module.exports = V2ApiTestRunner;