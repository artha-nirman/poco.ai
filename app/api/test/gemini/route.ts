import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'direct';

  console.log('🔍 GET request received with type:', type);

  console.log('🔍 Routing to Direct Gemini API handler');
  return handleDirectAPI();
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'direct';
  
  console.log('🔍 POST request received with type:', type);
  
  const body = await request.json();
  const { prompt, model: selectedModel } = body;

  if (!prompt) {
    return NextResponse.json({
      success: false,
      error: 'Prompt is required'
    }, { status: 400 });
  }

  console.log('🔍 Routing to Direct Gemini API custom prompt handler');
  return handleDirectAPIWithPrompt(prompt, selectedModel);
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