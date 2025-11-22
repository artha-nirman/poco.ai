/**
 * V2 Flexible Session Store - Country-Agnostic Database Operations
 * Supports the new flexible JSONB schema for multiple countries
 */

import { Pool, PoolClient } from 'pg'
import type { 
  V2AnalysisRequest,
  V2AnalysisResponse,
  V2SessionProgress,
  V2ErrorResponse 
} from '@/lib/types/v2/api'
import type { CountryConfiguration } from '@/lib/types/v2/index'

export interface V2SessionStore {
  // Session management
  createSession(sessionId: string, countryCode: string, request: V2AnalysisRequest): Promise<void>
  getSessionProgress(sessionId: string): Promise<V2SessionProgress | null>
  updateSessionProgress(sessionId: string, progress: Partial<V2SessionProgress>): Promise<void>
  
  // Results management
  getSessionResults(sessionId: string): Promise<V2AnalysisResponse | null>
  setSessionResults(sessionId: string, results: V2AnalysisResponse): Promise<void>
  
  // Analysis management
  storeAnalysis(analysis: V2AnalysisResponse): Promise<void>
  getAnalysis(analysisId: string): Promise<V2AnalysisResponse | null>
  
  // Country configuration
  storeCountryConfiguration(config: CountryConfiguration): Promise<void>
  getCountryConfiguration(countryCode: string): Promise<CountryConfiguration | null>
  
  // Cleanup and maintenance
  deleteSession(sessionId: string): Promise<void>
  cleanup(): Promise<number>
}

export class V2DatabaseSessionStore implements V2SessionStore {
  private pool: Pool
  private isConnected = false

  constructor(connectionString?: string) {
    // Load environment variables
    require('dotenv').config({ path: '.env.local' })
    
    const dbUrl = connectionString || process.env.DATABASE_URL || process.env.POSTGRES_URL
    console.log('🗄️ V2 Connecting to database...')
    
    this.pool = new Pool({
      connectionString: dbUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })

    this.initializeConnection()
  }

  private async initializeConnection(): Promise<void> {
    try {
      const client = await this.pool.connect()
      await client.query('SELECT 1')
      client.release()
      this.isConnected = true
      console.log('✅ V2 Database session store connected successfully')
    } catch (error) {
      console.error('❌ Failed to connect to V2 database session store:', error)
      this.isConnected = false
    }
  }

  async createSession(sessionId: string, countryCode: string, request: V2AnalysisRequest): Promise<void> {
    if (!this.isConnected) {
      await this.initializeConnection()
    }
    
    try {
      await this.pool.query(
        `INSERT INTO v2_user_sessions (
          session_id, country_code, status, policy_text, policy_type, 
          provider_name, user_preferences, request_metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (session_id) DO UPDATE SET
         last_updated = NOW(),
         policy_text = EXCLUDED.policy_text,
         user_preferences = EXCLUDED.user_preferences`,
        [
          sessionId,
          countryCode.toUpperCase(),
          'created',
          request.policy_text,
          request.policy_type,
          request.provider_name,
          JSON.stringify(request.user_preferences || {}),
          JSON.stringify(request.request_metadata || {})
        ]
      )
      console.log(`✅ V2 Session ${sessionId} created for country ${countryCode}`)
    } catch (error) {
      console.error('❌ Error creating V2 session:', error)
      throw error
    }
  }

  async getSessionProgress(sessionId: string): Promise<V2SessionProgress | null> {
    if (!this.isConnected) {
      await this.initializeConnection()
    }
    
    try {
      const result = await this.pool.query(
        `SELECT 
          session_id, country_code, country_name, status,
          progress_percentage, current_stage, stages,
          estimated_completion, started_at, last_updated,
          error_code, error_message
         FROM v2_user_sessions
         WHERE session_id = $1`,
        [sessionId]
      )

      if (result.rows.length === 0) {
        console.log(`⚠️  Session ${sessionId} not found in database`)
        return null
      }

      const row = result.rows[0]
      return {
        session_id: row.session_id,
        country: row.country_code,
        status: row.status,
        progress_percentage: row.progress_percentage || 0,
        current_stage: row.current_stage || 'Initializing',
        stages: row.stages || [],
        estimated_completion: row.estimated_completion,
        started_at: row.started_at,
        last_updated: row.last_updated
      }
    } catch (error) {
      console.error('❌ Error getting V2 session progress:', error)
      return null
    }
  }

  async updateSessionProgress(sessionId: string, progress: Partial<V2SessionProgress>): Promise<void> {
    if (!this.isConnected) {
      await this.initializeConnection()
    }
    
    try {
      const setClause = []
      const values = []
      let paramIndex = 1

      if (progress.status) {
        setClause.push(`status = $${paramIndex++}`)
        values.push(progress.status)
      }
      if (progress.progress_percentage !== undefined) {
        setClause.push(`progress_percentage = $${paramIndex++}`)
        values.push(progress.progress_percentage)
      }
      if (progress.current_stage) {
        setClause.push(`current_stage = $${paramIndex++}`)
        values.push(progress.current_stage)
      }
      if (progress.stages) {
        setClause.push(`stages = $${paramIndex++}`)
        values.push(JSON.stringify(progress.stages))
      }
      if (progress.estimated_completion) {
        setClause.push(`estimated_completion = $${paramIndex++}`)
        values.push(progress.estimated_completion)
      }

      setClause.push(`last_updated = NOW()`)
      values.push(sessionId)

      await this.pool.query(
        `UPDATE v2_user_sessions SET ${setClause.join(', ')} WHERE session_id = $${paramIndex}`,
        values
      )
    } catch (error) {
      console.error('❌ Error updating V2 session progress:', error)
      throw error
    }
  }

  async getSessionResults(sessionId: string): Promise<V2AnalysisResponse | null> {
    if (!this.isConnected) {
      await this.initializeConnection()
    }
    
    try {
      const result = await this.pool.query(
        'SELECT analysis_results FROM v2_user_sessions WHERE session_id = $1',
        [sessionId]
      )

      if (result.rows.length === 0 || !result.rows[0].analysis_results) {
        return null
      }

      return result.rows[0].analysis_results as V2AnalysisResponse
    } catch (error) {
      console.error('❌ Error getting V2 session results:', error)
      return null
    }
  }

  async setSessionResults(sessionId: string, results: V2AnalysisResponse): Promise<void> {
    if (!this.isConnected) {
      await this.initializeConnection()
    }
    
    try {
      await this.pool.query(
        `UPDATE v2_user_sessions 
         SET analysis_results = $1,
             status = 'completed',
             completed_at = NOW(),
             processing_time_ms = $2,
             last_updated = NOW()
         WHERE session_id = $3`,
        [
          JSON.stringify(results),
          results.metadata.processing_time_ms,
          sessionId
        ]
      )
      console.log(`✅ V2 Results stored for session ${sessionId}`)
    } catch (error) {
      console.error('❌ Error setting V2 session results:', error)
      throw error
    }
  }

  async storeAnalysis(analysis: V2AnalysisResponse): Promise<void> {
    if (!this.isConnected) {
      await this.initializeConnection()
    }
    
    try {
      await this.pool.query(
        `INSERT INTO v2_policy_analysis (
          analysis_id, session_id, country_code, policy_analysis, insights,
          comparison_data, export_options, regulatory_compliance, 
          risk_assessment, confidence_score, api_version, 
          country_config_version, privacy_level
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (analysis_id) DO UPDATE SET
         policy_analysis = EXCLUDED.policy_analysis,
         insights = EXCLUDED.insights,
         last_accessed = NOW()`,
        [
          analysis.analysis_id,
          analysis.analysis_id, // Using analysis_id as session_id for now
          analysis.country,
          JSON.stringify(analysis.policy),
          JSON.stringify(analysis.insights),
          JSON.stringify(analysis.comparison || {}),
          JSON.stringify({}), // Export options
          JSON.stringify(analysis.policy.regulatory_compliance),
          JSON.stringify(analysis.policy.risk_assessment),
          analysis.policy.confidence,
          analysis.metadata.api_version,
          analysis.metadata.country_config_version,
          analysis.metadata.privacy_level
        ]
      )
    } catch (error) {
      console.error('❌ Error storing V2 analysis:', error)
      throw error
    }
  }

  async getAnalysis(analysisId: string): Promise<V2AnalysisResponse | null> {
    if (!this.isConnected) {
      await this.initializeConnection()
    }
    
    try {
      const result = await this.pool.query(
        `SELECT 
          a.analysis_id, a.country_code, c.country_name,
          a.policy_analysis, a.insights, a.comparison_data,
          a.regulatory_compliance, a.risk_assessment,
          a.confidence_score, a.api_version, a.country_config_version,
          a.privacy_level, a.generated_at
         FROM v2_policy_analysis a
         JOIN v2_country_configurations c ON a.country_code = c.country_code
         WHERE a.analysis_id = $1 AND a.expires_at > NOW()`,
        [analysisId]
      )

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]
      
      // Update access count
      await this.pool.query(
        'UPDATE v2_policy_analysis SET accessed_count = accessed_count + 1, last_accessed = NOW() WHERE analysis_id = $1',
        [analysisId]
      )

      return {
        analysis_id: row.analysis_id,
        country: row.country_code,
        country_name: row.country_name,
        policy: row.policy_analysis,
        insights: row.insights,
        comparison: row.comparison_data,
        metadata: {
          processing_time_ms: 0, // Would be stored separately
          api_version: row.api_version,
          country_config_version: row.country_config_version,
          privacy_level: row.privacy_level,
          pii_protection_applied: false, // Would be tracked separately
          completed_at: row.generated_at
        }
      }
    } catch (error) {
      console.error('❌ Error getting V2 analysis:', error)
      return null
    }
  }

  async storeCountryConfiguration(config: CountryConfiguration): Promise<void> {
    if (!this.isConnected) {
      await this.initializeConnection()
    }
    
    try {
      await this.pool.query(
        `INSERT INTO v2_country_configurations (
          country_code, country_name, currency, configuration
        ) VALUES ($1, $2, $3, $4)
         ON CONFLICT (country_code) DO UPDATE SET
         country_name = EXCLUDED.country_name,
         currency = EXCLUDED.currency,
         configuration = EXCLUDED.configuration,
         updated_at = NOW()`,
        [
          config.countryCode,
          config.countryName,
          config.currency,
          JSON.stringify(config)
        ]
      )
      console.log(`✅ Country configuration stored for ${config.countryCode}`)
    } catch (error) {
      console.error('❌ Error storing country configuration:', error)
      throw error
    }
  }

  async getCountryConfiguration(countryCode: string): Promise<CountryConfiguration | null> {
    if (!this.isConnected) {
      await this.initializeConnection()
    }
    
    try {
      const result = await this.pool.query(
        'SELECT configuration FROM v2_country_configurations WHERE country_code = $1 AND is_active = true',
        [countryCode.toUpperCase()]
      )

      if (result.rows.length === 0) {
        return null
      }

      return result.rows[0].configuration as CountryConfiguration
    } catch (error) {
      console.error('❌ Error getting country configuration:', error)
      return null
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    if (!this.isConnected) {
      await this.initializeConnection()
    }
    
    try {
      await this.pool.query(
        'DELETE FROM v2_user_sessions WHERE session_id = $1',
        [sessionId]
      )
      console.log(`✅ V2 Session ${sessionId} deleted`)
    } catch (error) {
      console.error('❌ Error deleting V2 session:', error)
      throw error
    }
  }

  async cleanup(): Promise<number> {
    if (!this.isConnected) {
      await this.initializeConnection()
    }
    
    try {
      const result = await this.pool.query('SELECT cleanup_old_data()')
      const deletedCount = result.rows[0].cleanup_old_data || 0
      
      if (deletedCount > 0) {
        console.log(`🗄️ V2 Cleaned up ${deletedCount} old records`)
      }
      
      return deletedCount
    } catch (error) {
      console.error('❌ Error during V2 cleanup:', error)
      return 0
    }
  }

  async close(): Promise<void> {
    await this.pool.end()
    console.log('🗄️ V2 Database connection pool closed')
  }
}

// In-memory fallback store for development
export class V2MemorySessionStore implements V2SessionStore {
  private sessions = new Map<string, any>()
  private analyses = new Map<string, V2AnalysisResponse>()
  private countryConfigs = new Map<string, CountryConfiguration>()

  async createSession(sessionId: string, countryCode: string, request: V2AnalysisRequest): Promise<void> {
    this.sessions.set(sessionId, {
      sessionId,
      countryCode: countryCode.toUpperCase(),
      status: 'created',
      progress_percentage: 0,
      current_stage: 'Initializing',
      stages: [],
      started_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      request
    })
    console.log(`✅ V2 Memory session ${sessionId} created`)
  }

  async getSessionProgress(sessionId: string): Promise<V2SessionProgress | null> {
    const session = this.sessions.get(sessionId)
    if (!session) return null
    
    return {
      session_id: session.sessionId,
      country: session.countryCode,
      status: session.status,
      progress_percentage: session.progress_percentage,
      current_stage: session.current_stage,
      stages: session.stages || [],
      estimated_completion: session.estimated_completion,
      started_at: session.started_at,
      last_updated: session.last_updated
    }
  }

  async updateSessionProgress(sessionId: string, progress: Partial<V2SessionProgress>): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (session) {
      Object.assign(session, progress)
      session.last_updated = new Date().toISOString()
    }
  }

  async getSessionResults(sessionId: string): Promise<V2AnalysisResponse | null> {
    const session = this.sessions.get(sessionId)
    return session?.results || null
  }

  async setSessionResults(sessionId: string, results: V2AnalysisResponse): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.results = results
      session.status = 'completed'
      session.completed_at = new Date().toISOString()
    }
  }

  async storeAnalysis(analysis: V2AnalysisResponse): Promise<void> {
    this.analyses.set(analysis.analysis_id, analysis)
  }

  async getAnalysis(analysisId: string): Promise<V2AnalysisResponse | null> {
    return this.analyses.get(analysisId) || null
  }

  async storeCountryConfiguration(config: CountryConfiguration): Promise<void> {
    this.countryConfigs.set(config.countryCode, config)
  }

  async getCountryConfiguration(countryCode: string): Promise<CountryConfiguration | null> {
    return this.countryConfigs.get(countryCode.toUpperCase()) || null
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId)
  }

  async cleanup(): Promise<number> {
    // Simple cleanup - remove old sessions
    let deletedCount = 0
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (new Date(session.started_at) < cutoffTime) {
        this.sessions.delete(sessionId)
        deletedCount++
      }
    }
    
    return deletedCount
  }
}

// Singleton management
declare global {
  var _v2SessionStore: V2SessionStore | undefined
}

export function createV2SessionStore(): V2SessionStore {
  if (global._v2SessionStore) {
    return global._v2SessionStore
  }

  try {
    require('dotenv').config({ path: '.env.local' })
    const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
    
    if (databaseUrl) {
      console.log('💾 Using V2 database session store')
      global._v2SessionStore = new V2DatabaseSessionStore()
      return global._v2SessionStore
    }
  } catch (error) {
    console.warn('Failed to create V2 database session store, falling back to memory:', error)
  }

  console.log('💾 Using V2 in-memory session store for development')
  global._v2SessionStore = new V2MemorySessionStore()
  return global._v2SessionStore
}

// Backwards compatibility - export SessionStore class
export class SessionStore {
  private static instance: V2SessionStore

  static getInstance(): V2SessionStore {
    if (!SessionStore.instance) {
      SessionStore.instance = createV2SessionStore()
    }
    return SessionStore.instance
  }

  // Legacy methods mapped to V2 store
  async getProgress(sessionId: string): Promise<any> {
    const store = SessionStore.getInstance()
    const progress = await store.getSessionProgress(sessionId)
    return progress ? {
      sessionId: progress.session_id,
      stage: progress.current_stage,
      progress: progress.progress_percentage,
      message: `${progress.current_stage} - ${progress.progress_percentage}%`,
      isComplete: progress.status === 'completed'
    } : null
  }

  async getResults(sessionId: string): Promise<any> {
    const store = SessionStore.getInstance()
    return store.getSessionResults(sessionId)
  }

  async setResults(sessionId: string, results: any): Promise<void> {
    const store = SessionStore.getInstance()
    return store.setSessionResults(sessionId, results)
  }

  async storeAnalysisResults(sessionId: string, results: any): Promise<void> {
    return this.setResults(sessionId, results)
  }

  async deleteSession(sessionId: string): Promise<void> {
    const store = SessionStore.getInstance()
    return store.deleteSession(sessionId)
  }
}