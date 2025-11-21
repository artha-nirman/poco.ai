'use client';

import { useState } from 'react';

interface ApiResponse {
  success: boolean;
  model?: string;
  provider?: string;
  location?: string;
  prompt?: string;
  response?: string;
  metadata?: {
    responseTime: number;
    timestamp: string;
    tokenCount?: {
      promptTokens: number;
      candidatesTokens: number;
      totalTokens: number;
    };
    usageMetadata?: any;
  };
  error?: string;
  errorDetails?: string;
}

export default function GeminiTestPage() {
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [apiType, setApiType] = useState<'direct' | 'vertex'>('direct');
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash-exp');

  const models = [
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
  ];

  const testQuickDemo = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const endpoint = `/api/test/gemini?type=${apiType}`;
      console.log('🔍 Calling endpoint:', endpoint);
      console.log('🔍 API Type selected:', apiType);
      
      const response = await fetch(endpoint);
      const data = await response.json();
      
      console.log('🔍 Response from API:', data);
      setResult(data);
    } catch (error) {
      console.error('🔍 Error calling API:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      });
    } finally {
      setLoading(false);
    }
  };

  const testCustomPrompt = async () => {
    if (!customPrompt.trim()) {
      alert('Please enter a prompt');
      return;
    }

    setLoading(true);
    setResult(null);
    
    try {
      const endpoint = `/api/test/gemini?type=${apiType}`;
      console.log('🔍 Calling custom prompt endpoint:', endpoint);
      console.log('🔍 API Type selected:', apiType);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: customPrompt,
          model: selectedModel
        }),
      });
      const data = await response.json();
      
      console.log('🔍 Custom prompt response from API:', data);
      setResult(data);
    } catch (error) {
      console.error('🔍 Error calling custom prompt API:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Gemini AI Test Suite</h1>
        <p className="text-gray-600 mb-6">
          Test Google's Gemini models using both Direct API and Vertex AI approaches.
        </p>

        {/* API Type Selector */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Choose API Type</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div
              onClick={() => setApiType('direct')}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                apiType === 'direct' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-3">🔑</span>
                <div>
                  <h3 className="font-semibold">Direct API</h3>
                  <p className="text-sm text-gray-600">Generative Language API</p>
                </div>
              </div>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Simple API key authentication</li>
                <li>• Good for development & prototyping</li>
                <li>• Token usage tracking</li>
              </ul>
            </div>

            <div
              onClick={() => setApiType('vertex')}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                apiType === 'vertex' 
                  ? 'border-purple-500 bg-purple-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-3">🏢</span>
                <div>
                  <h3 className="font-semibold">Vertex AI</h3>
                  <p className="text-sm text-gray-600">Google Cloud Platform</p>
                </div>
              </div>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Enterprise-grade security</li>
                <li>• Better quotas & monitoring</li>
                <li>• Regional deployment</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Model Selector */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Select Model</h2>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-4">
          {/* Quick Test */}
          <div className="border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-2">Quick Test</h2>
            <p className="text-sm text-gray-600 mb-3">
              Send a simple test prompt to verify {apiType === 'direct' ? 'Direct API' : 'Vertex AI'} connectivity.
            </p>
            <button
              onClick={testQuickDemo}
              disabled={loading}
              className={`px-4 py-2 rounded-md text-white font-medium disabled:opacity-50 ${
                apiType === 'direct' 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {loading ? 'Testing...' : `Test ${apiType === 'direct' ? 'Direct API' : 'Vertex AI'}`}
            </button>
          </div>

          {/* Custom Prompt Test */}
          <div className="border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-2">Custom Prompt Test</h2>
            <div className="space-y-3">
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Enter your custom prompt here..."
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
              <button
                onClick={testCustomPrompt}
                disabled={loading || !customPrompt.trim()}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Testing...' : 'Test Custom Prompt'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">
            {result.success ? '✅ Success' : '❌ Error'}
          </h2>
          
          {result.success ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <h3 className="font-medium text-gray-700">Model</h3>
                  <p className="text-gray-900 font-mono text-sm">{result.model}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700">Provider</h3>
                  <p className="text-gray-900 font-mono text-sm">{result.provider}</p>
                </div>
                {result.location && (
                  <div>
                    <h3 className="font-medium text-gray-700">Location</h3>
                    <p className="text-gray-900 font-mono text-sm">{result.location}</p>
                  </div>
                )}
              </div>
              
              {result.prompt && (
                <div>
                  <h3 className="font-medium text-gray-700">Prompt</h3>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded border text-sm">
                    {result.prompt}
                  </p>
                </div>
              )}
              
              <div>
                <h3 className="font-medium text-gray-700">Response</h3>
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap text-green-800 text-sm">
                    {result.response}
                  </pre>
                </div>
              </div>
              
              {result.metadata && (
                <div>
                  <h3 className="font-medium text-gray-700">Metadata</h3>
                  <div className="bg-gray-50 p-3 rounded border text-sm space-y-1">
                    <p><strong>Response Time:</strong> {result.metadata.responseTime}ms</p>
                    <p><strong>Timestamp:</strong> {new Date(result.metadata.timestamp).toLocaleString()}</p>
                    {result.metadata.tokenCount && (
                      <div>
                        <p><strong>Token Usage:</strong></p>
                        <ul className="ml-4 text-xs">
                          <li>Prompt: {result.metadata.tokenCount.promptTokens}</li>
                          <li>Response: {result.metadata.tokenCount.candidatesTokens}</li>
                          <li>Total: {result.metadata.tokenCount.totalTokens}</li>
                        </ul>
                      </div>
                    )}
                    {result.metadata.usageMetadata && (
                      <div>
                        <p><strong>Usage Metadata:</strong></p>
                        <pre className="ml-4 text-xs bg-gray-100 p-2 rounded">
                          {JSON.stringify(result.metadata.usageMetadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <h3 className="font-medium text-red-800">Error Details</h3>
              <pre className="text-red-700 text-sm mt-2 whitespace-pre-wrap">
                {result.error}
              </pre>
              {result.errorDetails && (
                <p className="text-red-600 text-sm mt-2">
                  <strong>Suggestion:</strong> {result.errorDetails}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Setup Instructions */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-800 mb-2">📋 Direct API Setup</h3>
          <div className="text-blue-700 text-sm space-y-1">
            <p>1. Add <code>GOOGLE_GEMINI_API_KEY</code> to .env.local</p>
            <p>2. Enable <strong>Generative Language API</strong> in GCP Console</p>
            <p>3. Get API key from <a href="https://aistudio.google.com/" className="underline">Google AI Studio</a></p>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="font-medium text-purple-800 mb-2">📋 Vertex AI Setup</h3>
          <div className="text-purple-700 text-sm space-y-2">
            <div>
              <p className="font-medium">Required:</p>
              <p>• Add <code>GOOGLE_CLOUD_PROJECT_ID</code> to .env.local</p>
              <p>• Enable <strong>Vertex AI API</strong> in GCP Console</p>
            </div>
            <div>
              <p className="font-medium">Authentication (choose one):</p>
              <p>• <strong>Local Dev:</strong> <code>gcloud auth application-default login</code></p>
              <p>• <strong>Production:</strong> Add <code>GOOGLE_SERVICE_ACCOUNT_KEY</code> (JSON string)</p>
              <p>• <strong>Alternative:</strong> Set <code>GOOGLE_APPLICATION_CREDENTIALS</code> (file path)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}