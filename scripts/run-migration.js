#!/usr/bin/env node

/**
 * V2 Database Schema Executor
 * Runs the unified V2 database schema from docs/database/schemas.sql
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

async function initializeV2Database() {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  
  if (!dbUrl) {
    console.error('❌ Database URL not found in environment variables');
    console.log('Please set DATABASE_URL or POSTGRES_URL in .env.local');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔄 Initializing V2 database schema...');
    
    // Read unified V2 schema file
    const schemaPath = path.join(__dirname, '..', 'docs', 'database', 'schemas.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute complete V2 schema
    await pool.query(schemaSql);
    
    console.log('✅ V2 Database schema initialized successfully');
    
    // Verify V2 tables were created
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name LIKE 'v2_%'
      AND table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📋 V2 Tables created:');
    result.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`)
    });
    
    // Verify provider data
    const providerCheck = await pool.query('SELECT COUNT(*) FROM v2_providers WHERE onboarding_status = $1', ['active']);
    console.log(`📊 Active V2 providers: ${providerCheck.rows[0].count}`);
    
    // Verify country configurations
    const countryCheck = await pool.query('SELECT country_code FROM v2_country_configurations WHERE is_active = true');
    console.log(`🌏 Configured countries: ${countryCheck.rows.map(r => r.country_code).join(', ')}`);
    
    console.log('🎉 V2 Database ready for V2DatabaseSessionStore and Provider Services!');
    
  } catch (error) {
    console.error('❌ V2 Database initialization failed:', error.message);
    if (error.detail) console.error('Details:', error.detail);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  initializeV2Database().catch(console.error);
}

module.exports = { initializeV2Database };