#!/usr/bin/env tsx
import { Pool } from 'pg'

async function addMissingColumns() {
  console.log('🗄️ Adding missing columns to V2 tables...')
  
  try {
    // Load environment variables
    require('dotenv').config({ path: '.env.local' })
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    })
    
    console.log('📡 Connecting to database...')
    const client = await pool.connect()
    
    const alterStatements = [
      `ALTER TABLE v2_user_sessions 
       ADD COLUMN IF NOT EXISTS policy_text TEXT,
       ADD COLUMN IF NOT EXISTS policy_type TEXT,
       ADD COLUMN IF NOT EXISTS provider_name TEXT,
       ADD COLUMN IF NOT EXISTS user_preferences JSONB,
       ADD COLUMN IF NOT EXISTS request_metadata JSONB,
       ADD COLUMN IF NOT EXISTS analysis_results JSONB,
       ADD COLUMN IF NOT EXISTS error_code TEXT,
       ADD COLUMN IF NOT EXISTS error_message TEXT,
       ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW(),
       ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ DEFAULT NOW(),
       ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
       ADD COLUMN IF NOT EXISTS processing_time_ms INTEGER,
       ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0,
       ADD COLUMN IF NOT EXISTS current_stage TEXT,
       ADD COLUMN IF NOT EXISTS stages JSONB,
       ADD COLUMN IF NOT EXISTS estimated_completion TIMESTAMPTZ`,
      
      // Make country_name nullable since V2DatabaseSessionStore doesn't populate it initially
      `ALTER TABLE v2_user_sessions ALTER COLUMN country_name DROP NOT NULL`,
      
      // Drop and recreate the status constraint to match V2 interface
      `ALTER TABLE v2_user_sessions DROP CONSTRAINT IF EXISTS v2_user_sessions_status_check`,
      `ALTER TABLE v2_user_sessions ADD CONSTRAINT v2_user_sessions_status_check 
       CHECK (status IN ('created', 'queued', 'processing', 'completed', 'failed'))`,
      
      // Update existing rows to have started_at and last_updated
      `UPDATE v2_user_sessions 
       SET started_at = COALESCE(started_at, created_at),
           last_updated = COALESCE(last_updated, updated_at)
       WHERE started_at IS NULL OR last_updated IS NULL`,
       
      // Create missing indexes
      `CREATE INDEX IF NOT EXISTS idx_v2_user_sessions_started_at ON v2_user_sessions(started_at)`,
      `CREATE INDEX IF NOT EXISTS idx_v2_user_sessions_last_updated ON v2_user_sessions(last_updated)`
    ]
    
    for (const statement of alterStatements) {
      try {
        console.log(`📋 Executing: ${statement.substring(0, 50)}...`)
        await client.query(statement)
      } catch (error) {
        console.log(`⚠️  Error: ${error instanceof Error ? error.message : error}`)
      }
    }
    
    console.log('✅ V2 tables updated successfully!')
    
    client.release()
    await pool.end()
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

addMissingColumns()