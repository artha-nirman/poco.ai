'use client';

export default function TestIndexPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">AI Test Suite</h1>
        <p className="text-gray-600 mb-8">
          Test and compare AI model performance, authentication methods, and capabilities.
        </p>

        {/* Gemini Test */}
        <div className="border border-blue-200 rounded-lg p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center mr-4">
              <span className="text-2xl">🧠</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Gemini AI Test Suite</h2>
              <p className="text-sm text-gray-600">Test both Direct API and Vertex AI</p>
            </div>
          </div>
          
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">API Options:</span>
              <span className="font-medium text-blue-600">Direct API + Vertex AI</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Models Available:</span>
              <span className="font-medium text-green-600">Gemini 2.0 Flash, 1.5 Flash, 1.5 Pro</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Features:</span>
              <span className="font-medium">Switchable Authentication</span>
            </div>
          </div>

          <div className="space-y-2 mb-6">
            <h3 className="font-medium text-gray-900">Capabilities:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Toggle between Direct API and Vertex AI</li>
              <li>• Compare authentication methods</li>
              <li>• Test multiple Gemini models</li>
              <li>• Custom prompts and quick tests</li>
              <li>• Detailed response metadata</li>
              <li>• Token usage tracking</li>
            </ul>
          </div>

          <div className="space-y-2">
            <a
              href="/test/gemini"
              className="block w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center py-3 px-4 rounded-md hover:from-blue-700 hover:to-purple-700 transition-colors font-medium"
            >
              Launch Gemini Test Suite
            </a>
            <p className="text-xs text-gray-500 text-center">
              Supports both API key and GCP authentication
            </p>
          </div>
        </div>
      </div>

      {/* Setup Guide */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Setup Guide</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-blue-600 mb-2">Direct API Setup</h3>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Get API key from <a href="https://aistudio.google.com/" className="text-blue-600 underline">Google AI Studio</a></li>
              <li>Add <code className="bg-gray-200 px-1 rounded">GOOGLE_GEMINI_API_KEY</code> to .env.local</li>
              <li>Enable Generative Language API in GCP Console</li>
              <li>Test the connection</li>
            </ol>
          </div>
          
          <div>
            <h3 className="font-medium text-purple-600 mb-2">Vertex AI Setup</h3>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Enable Vertex AI API in GCP Console</li>
              <li>Run <code className="bg-gray-200 px-1 rounded">gcloud auth application-default login</code></li>
              <li>Add <code className="bg-gray-200 px-1 rounded">GOOGLE_CLOUD_PROJECT_ID</code> to .env.local</li>
              <li>Test the connection</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Environment Requirements */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-2">📋 Environment Variables</h3>
        <div className="text-blue-700 text-sm space-y-1">
          <p><code className="bg-blue-100 px-1 rounded">GOOGLE_GEMINI_API_KEY</code> - For Direct API access</p>
          <p><code className="bg-blue-100 px-1 rounded">GOOGLE_CLOUD_PROJECT_ID</code> - For Vertex AI access</p>
          <p><code className="bg-blue-100 px-1 rounded">GOOGLE_APPLICATION_CREDENTIALS</code> - Optional service account path</p>
        </div>
      </div>
    </div>
  );
}