// Session management with database primary storage and file-based fallback
import { Pool } from 'pg';
import { ProgressState, AnalysisResults } from '@/lib/types';

export interface SessionStore {
  getProgress(sessionId: string): Promise<ProgressState | null>;
  setProgress(sessionId: string, progress: ProgressState): Promise<void>;
  getResults(sessionId: string): Promise<AnalysisResults | null>;
  setResults(sessionId: string, results: AnalysisResults): Promise<void>;
  createSession(sessionId: string): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  cleanup(): Promise<number>;
}

export class DatabaseSessionStore implements SessionStore {
  private pool: Pool;
  private isConnected = false;

  constructor(connectionString?: string) {
    // Load environment variables
    require('dotenv').config({ path: '.env.local' });
    
    const dbUrl = connectionString || process.env.DATABASE_URL || process.env.POSTGRES_URL;
    console.log('🗄️ Connecting to database...');
    console.log('🗄️ Database URL:', dbUrl?.replace(/:[^:@]*@/, ':***@'));
    
    this.pool = new Pool({
      connectionString: dbUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      // Add connection pool settings for better reliability
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // Initialize connection
    this.initializeConnection();
  }

  private async initializeConnection(): Promise<void> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      this.isConnected = true;
      console.log('✅ Database session store connected successfully');
    } catch (error) {
      console.error('❌ Failed to connect to database session store:', error);
      this.isConnected = false;
    }
  }

  async getProgress(sessionId: string): Promise<ProgressState | null> {
    if (!this.isConnected) {
      await this.initializeConnection();
    }
    
    try {
      const result = await this.pool.query(
        'SELECT analysis_progress FROM user_sessions WHERE session_id = $1',
        [sessionId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const progress = result.rows[0].analysis_progress;
      return progress ? {
        sessionId,
        stage: progress.stage || 'Unknown',
        progress: progress.progress || 0,
        message: progress.message || '',
        estimatedTimeRemaining: progress.estimatedTimeRemaining
      } : null;
    } catch (error) {
      console.error('Error getting progress:', error);
      return null;
    }
  }

  async setProgress(sessionId: string, progress: ProgressState): Promise<void> {
    if (!this.isConnected) {
      await this.initializeConnection();
    }
    
    try {
      await this.pool.query(
        `UPDATE user_sessions 
         SET analysis_progress = $1, 
             updated_at = NOW()
         WHERE session_id = $2`,
        [progress, sessionId]
      );
    } catch (error) {
      console.error('Error setting progress:', error);
      throw error;
    }
  }

  async getResults(sessionId: string): Promise<AnalysisResults | null> {
    if (!this.isConnected) {
      await this.initializeConnection();
    }
    
    try {
      const result = await this.pool.query(
        'SELECT analysis_results FROM user_sessions WHERE session_id = $1',
        [sessionId]
      );

      if (result.rows.length === 0 || !result.rows[0].analysis_results) {
        return null;
      }

      return result.rows[0].analysis_results as AnalysisResults;
    } catch (error) {
      console.error('Error getting results:', error);
      return null;
    }
  }

  async setResults(sessionId: string, results: AnalysisResults): Promise<void> {
    if (!this.isConnected) {
      await this.initializeConnection();
    }
    
    try {
      await this.pool.query(
        `UPDATE user_sessions 
         SET analysis_results = $1, 
             updated_at = NOW()
         WHERE session_id = $2`,
        [JSON.stringify(results), sessionId]
      );
    } catch (error) {
      console.error('Error setting results:', error);
      throw error;
    }
  }

  async createSession(sessionId: string): Promise<void> {
    if (!this.isConnected) {
      await this.initializeConnection();
    }
    
    try {
      await this.pool.query(
        `INSERT INTO user_sessions (session_id, status, created_at, updated_at)
         VALUES ($1, 'created', NOW(), NOW())
         ON CONFLICT (session_id) DO NOTHING`,
        [sessionId]
      );
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    if (!this.isConnected) {
      await this.initializeConnection();
    }
    
    try {
      await this.pool.query(
        'DELETE FROM user_sessions WHERE session_id = $1',
        [sessionId]
      );
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }

  async cleanup(): Promise<number> {
    if (!this.isConnected) {
      await this.initializeConnection();
    }
    
    try {
      const result = await this.pool.query(
        `DELETE FROM user_sessions 
         WHERE updated_at < NOW() - INTERVAL '24 hours'
         RETURNING session_id`
      );

      const deletedCount = result.rows.length;
      if (deletedCount > 0) {
        console.log(`🗄️ Cleaned up ${deletedCount} old sessions`);
      }
      
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up sessions:', error);
      return 0;
    }
  }
}

// File-based session store for fallback
import fs from 'fs/promises';
import path from 'path';

export class MemorySessionStore implements SessionStore {
  private sessions = new Map<string, { 
    progress: ProgressState | null; 
    results: AnalysisResults | null;
    createdAt: Date;
  }>();
  private cacheFile = path.join(process.cwd(), '.session-cache.json');

  constructor() {
    // Load sessions from file on startup
    this.loadFromFile();
  }

  private async loadFromFile(): Promise<void> {
    try {
      const data = await fs.readFile(this.cacheFile, 'utf-8');
      const cached = JSON.parse(data);
      
      for (const [sessionId, session] of Object.entries(cached)) {
        this.sessions.set(sessionId, {
          progress: (session as any).progress,
          results: (session as any).results,
          createdAt: new Date((session as any).createdAt)
        });
      }

      if (this.sessions.size > 0) {
        console.log(`📂 Loaded ${this.sessions.size} sessions from file cache`);
      }
    } catch (error) {
      console.warn('Failed to load session cache:', error);
    }
  }

  private async saveToFile(): Promise<void> {
    try {
      const toSave: any = {};
      for (const [sessionId, session] of this.sessions.entries()) {
        toSave[sessionId] = {
          progress: session.progress,
          results: session.results,
          createdAt: session.createdAt.toISOString()
        };
      }
      await fs.writeFile(this.cacheFile, JSON.stringify(toSave, null, 2));
      console.log(`📊 Now have ${this.sessions.size} sessions in memory and file`);
    } catch (error) {
      console.error('Failed to save session cache:', error);
    }
  }

  async getProgress(sessionId: string): Promise<ProgressState | null> {
    console.log(`📊 Getting progress for ${sessionId}, have ${this.sessions.size} sessions`);
    const session = this.sessions.get(sessionId);
    const result = session?.progress || null;
    console.log(`📊 Progress result: ${result?.progress}% - ${result?.message}`);
    return result;
  }

  async setProgress(sessionId: string, progress: ProgressState): Promise<void> {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = { progress: null, results: null, createdAt: new Date() };
      this.sessions.set(sessionId, session);
    }
    
    session.progress = progress;
    console.log(`📊 Setting progress for ${sessionId}: ${progress.progress}% - ${progress.message}`);
    
    await this.saveToFile();
    
    console.log(`[${sessionId}] ${progress.progress}% - ${progress.message}`);
  }

  async getResults(sessionId: string): Promise<AnalysisResults | null> {
    const session = this.sessions.get(sessionId);
    return session?.results || null;
  }

  async setResults(sessionId: string, results: AnalysisResults): Promise<void> {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = { progress: null, results: null, createdAt: new Date() };
      this.sessions.set(sessionId, session);
    }
    
    session.results = results;
    await this.saveToFile();
  }

  async createSession(sessionId: string): Promise<void> {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        progress: null,
        results: null,
        createdAt: new Date()
      });
      console.log(`🆕 Session ${sessionId} created. Total sessions: ${this.sessions.size}`);
      await this.saveToFile();
    } else {
      console.log(`🆕 Session ${sessionId} already exists`);
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    if (this.sessions.delete(sessionId)) {
      await this.saveToFile();
      console.log(`🗑️ Session ${sessionId} deleted`);
    }
  }

  async cleanup(): Promise<number> {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    let deletedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.createdAt < cutoffTime) {
        this.sessions.delete(sessionId);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      await this.saveToFile();
    }

    return deletedCount;
  }
}

// Global singleton management to prevent instance multiplication
declare global {
  var _sharedSessionStore: SessionStore | undefined;
}

export function createSessionStore(): SessionStore {
  // Return shared instance if already exists
  if (global._sharedSessionStore) {
    return global._sharedSessionStore;
  }

  // Try to use database first if DATABASE_URL is available
  try {
    require('dotenv').config({ path: '.env.local' });
    const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    
    if (databaseUrl) {
      console.log('💾 Using database session store');
      global._sharedSessionStore = new DatabaseSessionStore();
      return global._sharedSessionStore;
    }
  } catch (error) {
    console.warn('Failed to create database session store, falling back to memory store:', error);
  }

  // Fall back to memory store
  console.log('💾 Using in-memory session store for development');
  global._sharedSessionStore = new MemorySessionStore();
  return global._sharedSessionStore;
}