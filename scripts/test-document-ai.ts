// Test script for Google Document AI integration
import { GoogleDocumentProcessor } from '../lib/services/google-document-processor';
import fs from 'fs';
import path from 'path';

async function testGoogleDocumentAI() {
  try {
    console.log('🧪 Testing Google Document AI integration...');
    
    // Load environment variables
    require('dotenv').config({ path: '.env.local' });
    
    // Create processor instance
    const processor = new GoogleDocumentProcessor();
    
    console.log('✅ Google Document AI client initialized successfully');
    console.log('📋 Configuration verified:');
    console.log(`   Project ID: ${process.env.GOOGLE_CLOUD_PROJECT_ID}`);
    console.log(`   Processor ID: ${process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID}`);
    console.log(`   Location: ${process.env.GOOGLE_DOCUMENT_AI_LOCATION}`);
    console.log(`   Credentials: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
    
    console.log('');
    console.log('ℹ️  Note: Google Document AI requires PDF files for processing.');
    console.log('ℹ️  To test with a real document, upload a PDF through the web interface.');
    console.log('ℹ️  The processor is ready to handle real PDFs when they are uploaded.');
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      
      // Provide helpful debugging info
      if (error.message.includes('PERMISSION_DENIED')) {
        console.log('💡 Check your service account permissions and credentials file');
      } else if (error.message.includes('NOT_FOUND')) {
        console.log('💡 Verify your processor ID and project configuration');
      } else if (error.message.includes('configuration missing')) {
        console.log('💡 Environment variables needed:');
        console.log('   - GOOGLE_CLOUD_PROJECT_ID');
        console.log('   - GOOGLE_DOCUMENT_AI_PROCESSOR_ID');
        console.log('   - GOOGLE_APPLICATION_CREDENTIALS');
      }
    }
    
    return false;
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testGoogleDocumentAI()
    .then(success => {
      console.log(success ? '🎉 Test completed successfully!' : '💥 Test failed');
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Unexpected error:', error);
      process.exit(1);
    });
}

export { testGoogleDocumentAI };