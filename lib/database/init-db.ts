#!/usr/bin/env tsx
import { Pool } from 'pg'
import fs from 'fs/promises'
import path from 'path'

async function initializeDatabase() {
  console.log('🗄️ Initializing Poco.ai V2 database...')
  
  try {
    // Load environment variables
    require('dotenv').config({ path: '.env.local' })
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    })
    
    console.log('📡 Connecting to database...')
    const client = await pool.connect()
    
    // Read the unified V2 schema file
    const schemaPath = path.join(process.cwd(), 'docs', 'database', 'schemas.sql')
    const schema = await fs.readFile(schemaPath, 'utf-8')
    
    console.log('📋 Executing unified V2 schema...')
    
    // Execute the complete schema
    await client.query(schema)
    
    // Verify tables were created
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'v2_%'
      ORDER BY table_name
    `)
    
    console.log('✅ V2 Database initialized successfully!')
    console.log('📋 V2 Tables created:')
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`)
    })
    
    // Test V2 session creation
    const testSessionId = `v2-init-test-${Date.now()}`
    await client.query(`
      INSERT INTO v2_user_sessions (session_id, country_code, status, created_at)
      VALUES ($1, 'AU', 'created', NOW())
    `, [testSessionId])
    
    await client.query('DELETE FROM v2_user_sessions WHERE session_id = $1', [testSessionId])
    console.log('✅ V2 session table test: SUCCESS')
    
    client.release()
    await pool.end()
    
    console.log('🎉 V2 Database is ready for use!')
    
  } catch (error) {
    console.error('❌ V2 Database initialization failed:', error)
    process.exit(1)
  }
}

initializeDatabase()