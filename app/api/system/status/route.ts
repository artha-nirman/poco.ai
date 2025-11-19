import { NextResponse } from 'next/server';
import { createSessionStore } from '@/lib/database/session-store';

export async function GET() {
  try {
    // Load environment variables to check DATABASE_URL
    require('dotenv').config({ path: '.env.local' });
    const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    
    const sessionStore = createSessionStore();
    const storeType = databaseUrl ? 'database' : 'file-memory';
    
    // Try to perform a basic operation to check if the store is working
    let storeStatus = 'unknown';
    try {
      // Create a test session to verify the store is working
      const testSessionId = `test_${Date.now()}_health_check`;
      await sessionStore.createSession(testSessionId);
      await sessionStore.deleteSession(testSessionId);
      storeStatus = 'healthy';
    } catch (error) {
      storeStatus = 'error';
      console.error('Session store health check failed:', error);
    }

    return NextResponse.json({
      sessionStore: {
        type: storeType,
        status: storeStatus,
        description: storeType === 'database' 
          ? 'Using PostgreSQL database for session storage'
          : 'Using file-based memory store with persistent cache',
        databaseConfigured: !!databaseUrl
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('System status error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get system status',
        sessionStore: {
          type: 'unknown',
          status: 'error',
          description: 'Unable to determine session store status'
        },
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}