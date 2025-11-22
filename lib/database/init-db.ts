#!/usr/bin/env tsx
import { Pool } from 'pg'
import fs from 'fs/promises'
import path from 'path'

async function initializeDatabase() {
  console.log('🗄️ Initializing Poco.ai database...')
  
  try {
    // Load environment variables
    require('dotenv').config({ path: '.env.local' })
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    })
    
    console.log('📡 Connecting to database...')
    const client = await pool.connect()
    
    // Read schema file
    const schemaPath = path.join(process.cwd(), 'docs', 'database', 'schemas.sql')
    const schema = await fs.readFile(schemaPath, 'utf-8')
    
    console.log('📋 Executing schema...')
    
    // For complex schemas with dollar quotes, execute individual statements
    const statements = [
      // Core tables without complex syntax
      `CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id TEXT UNIQUE NOT NULL,
        channel TEXT NOT NULL DEFAULT 'web',
        status TEXT NOT NULL DEFAULT 'created',
        input_metadata JSONB,
        processing_state JSONB,
        analysis_results JSONB,
        recommendations JSONB,
        metadata JSONB,
        analysis_progress JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
        CHECK (expires_at > created_at),
        CHECK (status IN ('created', 'processing', 'completed', 'failed', 'expired'))
      )`,
      
      `CREATE TABLE IF NOT EXISTS provider_policies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider_code TEXT NOT NULL,
        policy_name TEXT NOT NULL,
        policy_type TEXT NOT NULL,
        policy_details JSONB NOT NULL,
        search_keywords TEXT[],
        search_text TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE,
        CHECK (policy_type IN ('hospital', 'extras', 'combined'))
      )`,
      
      `CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,

      // V2 Database Tables for Country-Agnostic Architecture
      `CREATE TABLE IF NOT EXISTS v2_user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id TEXT UNIQUE NOT NULL,
        country_code TEXT NOT NULL,
        country_name TEXT,
        status TEXT NOT NULL DEFAULT 'created',
        progress_percentage INTEGER DEFAULT 0,
        current_stage TEXT DEFAULT 'initializing',
        stages JSONB,
        estimated_completion TIMESTAMPTZ,
        started_at TIMESTAMPTZ DEFAULT NOW(),
        last_updated TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
        policy_text TEXT,
        policy_type TEXT,
        provider_name TEXT,
        user_preferences JSONB,
        request_metadata JSONB,
        error_code TEXT,
        error_message TEXT,
        CHECK (status IN ('created', 'processing', 'completed', 'failed', 'expired')),
        CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
      )`,

      `CREATE TABLE IF NOT EXISTS v2_analysis_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id TEXT NOT NULL REFERENCES v2_user_sessions(session_id) ON DELETE CASCADE,
        country_code TEXT NOT NULL,
        analysis_data JSONB NOT NULL,
        policy JSONB,
        recommendations JSONB,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,

      `CREATE TABLE IF NOT EXISTS v2_country_configurations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        country_code TEXT UNIQUE NOT NULL,
        country_name TEXT NOT NULL,
        config_data JSONB NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      
      // Indexes
      `CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id)`,
      `CREATE INDEX IF NOT EXISTS idx_user_sessions_status ON user_sessions(status)`,
      `CREATE INDEX IF NOT EXISTS idx_user_sessions_created_at ON user_sessions(created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at)`,
      `CREATE INDEX IF NOT EXISTS idx_user_sessions_channel ON user_sessions(channel)`,
      `CREATE INDEX IF NOT EXISTS idx_provider_policies_provider_code ON provider_policies(provider_code)`,
      `CREATE INDEX IF NOT EXISTS idx_provider_policies_policy_type ON provider_policies(policy_type)`,
      `CREATE INDEX IF NOT EXISTS idx_provider_policies_is_active ON provider_policies(is_active)`,
      
      // V2 Indexes
      `CREATE INDEX IF NOT EXISTS idx_v2_user_sessions_session_id ON v2_user_sessions(session_id)`,
      `CREATE INDEX IF NOT EXISTS idx_v2_user_sessions_country_code ON v2_user_sessions(country_code)`,
      `CREATE INDEX IF NOT EXISTS idx_v2_user_sessions_status ON v2_user_sessions(status)`,
      `CREATE INDEX IF NOT EXISTS idx_v2_user_sessions_expires_at ON v2_user_sessions(expires_at)`,
      `CREATE INDEX IF NOT EXISTS idx_v2_user_sessions_started_at ON v2_user_sessions(started_at)`,
      `CREATE INDEX IF NOT EXISTS idx_v2_user_sessions_last_updated ON v2_user_sessions(last_updated)`,
      `CREATE INDEX IF NOT EXISTS idx_v2_analysis_results_session_id ON v2_analysis_results(session_id)`,
      `CREATE INDEX IF NOT EXISTS idx_v2_analysis_results_country_code ON v2_analysis_results(country_code)`,
      `CREATE INDEX IF NOT EXISTS idx_v2_country_configurations_country_code ON v2_country_configurations(country_code)`,
      `CREATE INDEX IF NOT EXISTS idx_v2_country_configurations_is_active ON v2_country_configurations(is_active)`
    ]
    
    for (const statement of statements) {
      try {
        await client.query(statement)
      } catch (error) {
        console.log(`⚠️  Statement: ${statement.substring(0, 50)}...`)
        console.log(`⚠️  Error: ${error instanceof Error ? error.message : error}`)
      }
    }
    
    // Verify tables were created
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    
    console.log('✅ Database initialized successfully!')
    console.log('📋 Created tables:')
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`)
    })
    
    // Test session creation
    const testSessionId = `init-test-${Date.now()}`
    await client.query(`
      INSERT INTO user_sessions (session_id, status, created_at, updated_at)
      VALUES ($1, 'created', NOW(), NOW())
    `, [testSessionId])
    
    await client.query('DELETE FROM user_sessions WHERE session_id = $1', [testSessionId])
    console.log('✅ Session table test: SUCCESS')
    
    client.release()
    await pool.end()
    
    console.log('🎉 Database is ready for use!')
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    process.exit(1)
  }
}

initializeDatabase()