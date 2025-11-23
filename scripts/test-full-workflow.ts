#!/usr/bin/env tsx
/**
 * Full Workflow Integration Test
 * 
 * This test simulates the complete policy analysis workflow:
 * 1. Start session
 * 2. Submit policy for analysis  
 * 3. Track progress updates
 * 4. Verify completion and results
 * 
 * Usage: npx tsx scripts/test-full-workflow.ts
 */

import dotenv from 'dotenv'
import fetch from 'node-fetch'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: '.env.local' })

interface V2ProgressResponse {
  session_id: string
  status: 'processing' | 'completed' | 'failed'
  progress_percentage: number
  current_stage: string
  stage_details?: {
    message?: string
    estimated_remaining_time?: number
  }
}

interface V2AnalysisResponse {
  session_id: string
  country_code: string
  country_name: string
  analysis_metadata: {
    confidence_score: number
    processing_time_ms: number
  }
  user_policy: {
    detected_type: string
  }
  recommendations: Array<{
    provider: { name: string }
    policy: { name: string }
    score: { overall: number }
  }>
}

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

// Sample policy PDF for testing
const SAMPLE_POLICY_PATH = path.join(__dirname, '..', 'test', 'samples', 'user-policies', 'user1-cbhs-policy-statement.pdf')

class WorkflowTester {
  private sessionId: string = ''
  private testResults: { step: string; success: boolean; duration: number; details?: any }[] = []

  async log(step: string, success: boolean, duration: number, details?: any) {
    this.testResults.push({ step, success, duration, details })
    const status = success ? '✅' : '❌'
    const timing = `(${duration}ms)`
    console.log(`${status} ${step} ${timing}`)
    if (details && !success) {
      console.log(`   Details:`, details)
    }
  }

  async runTest(): Promise<boolean> {
    console.log('🚀 Starting Full Workflow Integration Test')
    console.log(`📍 Base URL: ${BASE_URL}`)
    console.log(`🕒 Test started at: ${new Date().toISOString()}\n`)

    try {
      // Step 1: Test server health
      await this.testServerHealth()

      // Step 2: Test database connection  
      await this.testDatabaseHealth()

      // Step 3: Start analysis session
      await this.startAnalysisSession()

      // Step 4: Track progress through completion
      await this.trackProgressToCompletion()

      // Step 5: Verify final results
      await this.verifyResults()

      // Step 6: Test cleanup
      await this.testCleanup()

      return this.summarizeResults()

    } catch (error) {
      console.error('\n❌ Test suite failed with error:', error)
      return false
    }
  }

  async testServerHealth(): Promise<void> {
    const start = Date.now()
    
    try {
      const response = await fetch(`${BASE_URL}/api/system/status`, {
        timeout: 5000
      } as any)
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json() as any
      const duration = Date.now() - start
      
      await this.log('Server Health Check', true, duration, { 
        status: data.status, 
        uptime: data.uptime 
      })
      
    } catch (error) {
      const duration = Date.now() - start
      await this.log('Server Health Check', false, duration, { error: (error as Error).message })
      throw error
    }
  }

  async testDatabaseHealth(): Promise<void> {
    const start = Date.now()
    
    try {
      const response = await fetch(`${BASE_URL}/api/system/status`, {
        timeout: 5000
      } as any)
      
      const data = await response.json() as any
      const duration = Date.now() - start
      
      if (data.sessionStore?.status !== 'healthy') {
        throw new Error(`Database not connected: ${data.sessionStore?.status}`)
      }
      
      await this.log('Database Health Check', true, duration, { 
        sessionStore: data.sessionStore 
      })
      
    } catch (error) {
      const duration = Date.now() - start
      await this.log('Database Health Check', false, duration, { error: (error as Error).message })
      throw error
    }
  }

  async startAnalysisSession(): Promise<void> {
    const start = Date.now()
    
    try {
      // Check if the sample PDF file exists
      if (!fs.existsSync(SAMPLE_POLICY_PATH)) {
        throw new Error(`Sample policy PDF not found at: ${SAMPLE_POLICY_PATH}`)
      }

      const formData = new FormData()
      const policyBuffer = fs.readFileSync(SAMPLE_POLICY_PATH)
      const policyBlob = new Blob([policyBuffer], { type: 'application/pdf' })
      formData.append('policy', policyBlob, 'user1-cbhs-policy-statement.pdf')
      
      const response = await fetch(`${BASE_URL}/api/v2/au/policies/analyze`, {
        method: 'POST',
        body: formData,
        timeout: 30000
      } as any)
      
      if (!response.ok) {
        const errorData = await response.json() as any
        throw new Error(`Analysis request failed: ${response.status} - ${errorData.message}`)
      }
      
      const data = await response.json() as { session_id: string; status: string; message: string; estimated_time: string }
      this.sessionId = data.session_id
      const duration = Date.now() - start
      
      await this.log('Start Analysis Session', true, duration, { 
        sessionId: this.sessionId,
        message: data.message,
        estimatedTime: data.estimated_time
      })
      
    } catch (error) {
      const duration = Date.now() - start
      await this.log('Start Analysis Session', false, duration, { error: (error as Error).message })
      throw error
    }
  }

  async trackProgressToCompletion(): Promise<void> {
    const maxAttempts = 30
    const pollInterval = 2000 // 2 seconds
    let attempts = 0
    let lastProgress = -1
    
    console.log(`\n📊 Tracking progress for session: ${this.sessionId}`)
    
    while (attempts < maxAttempts) {
      const start = Date.now()
      attempts++
      
      try {
        const response = await fetch(`${BASE_URL}/api/v2/au/policies/progress/${this.sessionId}`, {
          timeout: 10000
        } as any)
        
        if (!response.ok) {
          throw new Error(`Progress check failed: ${response.status}`)
        }
        
        const progress = await response.json() as V2ProgressResponse
        const duration = Date.now() - start
        
        // Log progress if it changed
        if (progress.progress_percentage !== lastProgress) {
          console.log(`   📈 ${progress.progress_percentage}% - ${progress.current_stage} ${progress.stage_details?.message ? `(${progress.stage_details.message})` : ''}`)
          lastProgress = progress.progress_percentage
        }
        
        // Check if completed
        if (progress.status === 'completed') {
          await this.log('Track Progress to Completion', true, attempts * pollInterval, { 
            finalStatus: progress.status,
            finalProgress: progress.progress_percentage,
            attempts: attempts
          })
          return
        }
        
        // Check if failed
        if (progress.status === 'failed') {
          throw new Error(`Analysis failed: ${progress.stage_details?.message || 'Unknown error'}`)
        }
        
        // Wait before next check
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, pollInterval))
        }
        
      } catch (error) {
        const duration = Date.now() - start
        await this.log('Track Progress to Completion', false, duration, { 
          error: (error as Error).message,
          attempts: attempts
        })
        throw error
      }
    }
    
    throw new Error(`Progress tracking timed out after ${maxAttempts} attempts`)
  }

  async verifyResults(): Promise<void> {
    const start = Date.now()
    
    try {
      const response = await fetch(`${BASE_URL}/api/v2/au/policies/results/${this.sessionId}`, {
        timeout: 10000
      } as any)
      
      if (!response.ok) {
        throw new Error(`Results retrieval failed: ${response.status}`)
      }
      
      const results = await response.json() as V2AnalysisResponse
      const duration = Date.now() - start
      
      // Verify results structure
      const validations = [
        { check: 'Has session_id', valid: !!results.session_id },
        { check: 'Has country_code', valid: !!results.country_code },
        { check: 'Has user_policy', valid: !!results.user_policy },
        { check: 'Has recommendations', valid: !!results.recommendations },
        { check: 'Has analysis_metadata', valid: !!results.analysis_metadata },
        { check: 'Processing time recorded', valid: typeof results.analysis_metadata.processing_time_ms === 'number' }
      ]
      
      const failedValidations = validations.filter(v => !v.valid)
      
      if (failedValidations.length > 0) {
        throw new Error(`Result validation failed: ${failedValidations.map(f => f.check).join(', ')}`)
      }
      
      await this.log('Verify Results', true, duration, { 
        sessionId: results.session_id,
        processingTime: results.analysis_metadata.processing_time_ms,
        validations: validations.length
      })
      
    } catch (error) {
      const duration = Date.now() - start
      await this.log('Verify Results', false, duration, { error: (error as Error).message })
      throw error
    }
  }

  async testCleanup(): Promise<void> {
    const start = Date.now()
    
    try {
      // Test session cleanup (if endpoint exists)
      const response = await fetch(`${BASE_URL}/api/policies/sessions/${this.sessionId}`, {
        method: 'DELETE',
        timeout: 5000
      } as any)
      
      // Don't fail if cleanup endpoint doesn't exist (405 method not allowed)
      const duration = Date.now() - start
      
      if (response.status === 404 || response.status === 405) {
        await this.log('Test Cleanup', true, duration, { 
          note: 'Cleanup endpoint not implemented (expected)' 
        })
      } else if (response.ok) {
        await this.log('Test Cleanup', true, duration, { 
          status: 'Session cleaned up successfully' 
        })
      } else {
        await this.log('Test Cleanup', false, duration, { 
          status: response.status,
          statusText: response.statusText 
        })
      }
      
    } catch (error) {
      const duration = Date.now() - start
      await this.log('Test Cleanup', true, duration, { 
        note: 'Cleanup test skipped (connection error expected)' 
      })
    }
  }

  summarizeResults(): boolean {
    const totalTests = this.testResults.length
    const passedTests = this.testResults.filter(r => r.success).length
    const failedTests = totalTests - passedTests
    const totalDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0)
    
    console.log('\n' + '='.repeat(60))
    console.log('📋 TEST SUMMARY')
    console.log('='.repeat(60))
    console.log(`✅ Passed: ${passedTests}`)
    console.log(`❌ Failed: ${failedTests}`)
    console.log(`⏱️  Total Duration: ${totalDuration}ms`)
    console.log(`🕒 Completed at: ${new Date().toISOString()}`)
    
    if (failedTests > 0) {
      console.log('\n❌ FAILED TESTS:')
      this.testResults
        .filter(r => !r.success)
        .forEach(r => console.log(`   - ${r.step}: ${r.details?.error || 'Unknown error'}`))
    }
    
    console.log('='.repeat(60))
    
    return failedTests === 0
  }
}

// Main execution
async function main() {
  const tester = new WorkflowTester()
  const success = await tester.runTest()
  process.exit(success ? 0 : 1)
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

export { WorkflowTester }