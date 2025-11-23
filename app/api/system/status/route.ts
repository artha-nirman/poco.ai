import { NextResponse } from 'next/server';
import { createV2SessionStore } from '@/lib/database/v2-session-store';

export async function GET() {
  try {
    // Load environment variables to check DATABASE_URL
    require('dotenv').config({ path: '.env.local' });
    const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    
    const sessionStore = createV2SessionStore();
    const storeType = databaseUrl ? 'v2-database' : 'v2-mock';
    
    // Try to perform a basic operation to check if the store is working
    let storeStatus = 'unknown';
    try {
      // Create a test session to verify the store is working
      const testSessionId = `test_${Date.now()}_health_check`;
      await sessionStore.createSession(testSessionId, 'AU', {
        policy_text: 'test',
        policy_type: 'health',
        request_metadata: {
          timestamp: new Date().toISOString(),
          session_id: testSessionId
        }
      });
      await sessionStore.deleteSession(testSessionId);
      storeStatus = 'healthy';
    } catch (error) {
      storeStatus = 'error';
      console.error('V2 Session store health check failed:', error);
    }

    return NextResponse.json({
      sessionStore: {
        type: storeType,
        status: storeStatus,
        description: storeType === 'v2-database' 
          ? 'Using PostgreSQL database with V2 unified schema for session storage'
          : 'Using V2 mock session store for development',
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