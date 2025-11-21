import { NextRequest, NextResponse } from 'next/server';
import { VertexAI } from '@google-cloud/vertexai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'vertex';

  console.log('🔍 GET request received with type:', type);

  if (type === 'direct') {
    console.log('🔍 Routing to Direct API handler');
    return handleDirectAPI();
  } else {
    console.log('🔍 Routing to Vertex AI handler');
    return handleVertexAI();
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'vertex';
  
  console.log('🔍 POST request received with type:', type);
  
  const body = await request.json();
  const { prompt, model: selectedModel } = body;

  if (!prompt) {
    return NextResponse.json({
      success: false,
      error: 'Prompt is required'
    }, { status: 400 });
  }

  if (type === 'direct') {
    console.log('🔍 Routing to Direct API custom prompt handler');
    return handleDirectAPIWithPrompt(prompt, selectedModel);
  } else {
    console.log('🔍 Routing to Vertex AI custom prompt handler');
    return handleVertexAIWithPrompt(prompt, selectedModel);
  }
}

async function handleDirectAPI() {
  try {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'GOOGLE_GEMINI_API_KEY not found in environment variables'
      }, { status: 400 });
    }

    console.log('🤖 Testing Gemini via Direct API...');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 200,
      }
    });

    const prompt = "Hello! Please respond with a brief message confirming you're working via Direct Gemini API. Also tell me what model you are and today's date.";

    console.log('📤 Sending prompt to Gemini Direct API...');
    const startTime = Date.now();

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('✅ Gemini Direct API responded successfully');
    console.log('⏱️ Response time:', duration + 'ms');

    return NextResponse.json({
      success: true,
      model: "gemini-2.0-flash-exp",
      provider: "Generative Language API (Direct)",
      prompt,
      response: text,
      metadata: {
        responseTime: duration,
        timestamp: new Date().toISOString(),
        tokenCount: response.usageMetadata ? {
          promptTokens: response.usageMetadata.promptTokenCount,
          candidatesTokens: response.usageMetadata.candidatesTokenCount,
          totalTokens: response.usageMetadata.totalTokenCount
        } : null
      }
    });

  } catch (error) {
    console.error('❌ Gemini Direct API test failed:', error);
    
    let errorMessage = 'Unknown error occurred';
    let errorDetails = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (errorMessage.includes('SERVICE_DISABLED')) {
        errorDetails = 'Generative Language API is not enabled. Enable it in Google Cloud Console.';
      } else if (errorMessage.includes('permission')) {
        errorDetails = 'API key lacks proper permissions. Check your API key configuration.';
      } else if (errorMessage.includes('quota')) {
        errorDetails = 'API quota exceeded. Check your usage limits in Google Cloud Console.';
      }
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      errorDetails,
      provider: "Generative Language API (Direct)"
    }, { status: 500 });
  }
}

async function handleDirectAPIWithPrompt(prompt: string, selectedModel?: string) {
  try {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'GOOGLE_GEMINI_API_KEY not found in environment variables'
      }, { status: 400 });
    }

    console.log('🤖 Custom Gemini Direct API test with prompt:', prompt.substring(0, 50) + '...');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: selectedModel || "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 500,
      }
    });

    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const endTime = Date.now();

    return NextResponse.json({
      success: true,
      model: selectedModel || "gemini-2.0-flash-exp",
      provider: "Generative Language API (Direct)",
      prompt,
      response: text,
      metadata: {
        responseTime: endTime - startTime,
        timestamp: new Date().toISOString(),
        tokenCount: response.usageMetadata ? {
          promptTokens: response.usageMetadata.promptTokenCount,
          candidatesTokens: response.usageMetadata.candidatesTokenCount,
          totalTokens: response.usageMetadata.totalTokenCount
        } : null
      }
    });

  } catch (error) {
    console.error('❌ Custom Gemini Direct API test failed:', error);
    
    let errorMessage = 'Unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      provider: "Generative Language API (Direct)"
    }, { status: 500 });
  }
}

async function handleVertexAI() {
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    if (!projectId) {
      return NextResponse.json({
        success: false,
        error: 'GOOGLE_CLOUD_PROJECT_ID not found in environment variables'
      }, { status: 400 });
    }

    console.log('🤖 Testing Gemini via Vertex AI...');
    console.log('📍 Project ID:', projectId);

    // Initialize Vertex AI with proper authentication
    let vertexAI;
    
    // Check if we have service account credentials
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    
    if (serviceAccountKey) {
      // Production: Use service account key from environment variable
      console.log('📋 Using service account key from environment variable');
      const credentials = JSON.parse(serviceAccountKey);
      vertexAI = new VertexAI({
        project: projectId,
        location: 'us-central1',
        googleAuthOptions: {
          credentials: credentials
        }
      });
    } else if (credentialsPath) {
      // Alternative: Use credentials file path
      console.log('📋 Using service account from credentials file:', credentialsPath);
      vertexAI = new VertexAI({
        project: projectId,
        location: 'us-central1',
        googleAuthOptions: {
          keyFilename: credentialsPath
        }
      });
    } else {
      // Development: Use application default credentials (gcloud auth)
      console.log('📋 Using application default credentials (local development)');
      vertexAI = new VertexAI({
        project: projectId,
        location: 'us-central1',
      });
    }

    const model = vertexAI.preview.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        maxOutputTokens: 200,
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
      },
    });

    const prompt = "Hello! Please respond with a brief message confirming you're working via Vertex AI. Also tell me what model you are and today's date.";

    console.log('📤 Sending prompt to Gemini via Vertex AI...');
    const startTime = Date.now();

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || 'No response text found';

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('✅ Vertex AI Gemini responded successfully');
    console.log('⏱️ Response time:', duration + 'ms');

    return NextResponse.json({
      success: true,
      model: "gemini-2.0-flash-exp",
      provider: "Vertex AI",
      location: "us-central1",
      prompt,
      response: text,
      metadata: {
        responseTime: duration,
        timestamp: new Date().toISOString(),
        usageMetadata: response.usageMetadata || null
      }
    });

  } catch (error) {
    console.error('❌ Vertex AI Gemini test failed:', error);
    
    let errorMessage = 'Unknown error occurred';
    let errorDetails = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (error.message.includes('permission') || error.message.includes('credentials')) {
        errorDetails = 'Authentication failed. For production: set GOOGLE_SERVICE_ACCOUNT_KEY. For local development: run "gcloud auth application-default login" or set GOOGLE_APPLICATION_CREDENTIALS.';
      } else if (error.message.includes('quota')) {
        errorDetails = 'Quota exceeded. Check your Vertex AI quotas in Google Cloud Console.';
      } else if (error.message.includes('not found')) {
        errorDetails = 'Model not found. Make sure gemini-2.0-flash-exp is available in your region.';
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('network')) {
        errorDetails = 'Network error. Check your internet connection and Google Cloud API endpoints.';
      }
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      errorDetails,
      provider: "Vertex AI"
    }, { status: 500 });
  }
}

async function handleVertexAIWithPrompt(prompt: string, selectedModel?: string) {
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    if (!projectId) {
      return NextResponse.json({
        success: false,
        error: 'GOOGLE_CLOUD_PROJECT_ID not found in environment variables'
      }, { status: 400 });
    }

    console.log('🤖 Custom Vertex AI test with prompt:', prompt.substring(0, 50) + '...');

    // Initialize Vertex AI with proper authentication
    let vertexAI;
    
    // Check if we have service account credentials
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    
    if (serviceAccountKey) {
      // Production: Use service account key from environment variable
      console.log('📋 Using service account key from environment variable');
      const credentials = JSON.parse(serviceAccountKey);
      vertexAI = new VertexAI({
        project: projectId,
        location: 'us-central1',
        googleAuthOptions: {
          credentials: credentials
        }
      });
    } else if (credentialsPath) {
      // Alternative: Use credentials file path
      console.log('📋 Using service account from credentials file:', credentialsPath);
      vertexAI = new VertexAI({
        project: projectId,
        location: 'us-central1',
        googleAuthOptions: {
          keyFilename: credentialsPath
        }
      });
    } else {
      // Development: Use application default credentials (gcloud auth)
      console.log('📋 Using application default credentials (local development)');
      vertexAI = new VertexAI({
        project: projectId,
        location: 'us-central1',
      });
    }

    const model = vertexAI.preview.getGenerativeModel({
      model: selectedModel || 'gemini-2.0-flash-exp',
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
      },
    });

    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || 'No response text found';
    const endTime = Date.now();

    return NextResponse.json({
      success: true,
      model: selectedModel || 'gemini-2.0-flash-exp',
      provider: "Vertex AI",
      location: "us-central1",
      prompt,
      response: text,
      metadata: {
        responseTime: endTime - startTime,
        timestamp: new Date().toISOString(),
        usageMetadata: response.usageMetadata || null
      }
    });

  } catch (error) {
    console.error('❌ Custom Vertex AI test failed:', error);
    
    let errorMessage = 'Unknown error occurred';
    let errorDetails = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (error.message.includes('permission') || error.message.includes('credentials')) {
        errorDetails = 'Authentication failed. For production: set GOOGLE_SERVICE_ACCOUNT_KEY. For local development: run "gcloud auth application-default login" or set GOOGLE_APPLICATION_CREDENTIALS.';
      } else if (error.message.includes('quota')) {
        errorDetails = 'Quota exceeded. Check your Vertex AI quotas in Google Cloud Console.';
      } else if (error.message.includes('not found')) {
        errorDetails = 'Model not found. Make sure the selected model is available in your region.';
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('network')) {
        errorDetails = 'Network error. Check your internet connection and Google Cloud API endpoints.';
      }
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      errorDetails,
      provider: "Vertex AI"
    }, { status: 500 });
  }
}