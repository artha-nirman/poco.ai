'use client';

import { useState } from 'react';
import PolicyAnalyzer from './components/PolicyAnalyzer';
import PrivacyProtection from './components/PrivacyProtection';
import SystemStatusIndicator from './components/SystemStatusIndicator';

export default function Home() {
  const [analysisSessionId, setAnalysisSessionId] = useState<string | null>(null);

  const handleDocumentProcessed = (sessionId: string) => {
    setAnalysisSessionId(sessionId);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Poco.ai
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Privacy-first health insurance comparison powered by AI. 
            Upload your policy, get personalized recommendations, all while keeping your data secure.
          </p>
        </div>
        
        <div className="mb-6">
          <SystemStatusIndicator />
        </div>

        {/* Privacy Protection and Document Upload */}
        <div className="mb-8">
          <PrivacyProtection onDocumentProcessed={handleDocumentProcessed} />
        </div>

        {/* Policy Analysis Results */}
        {analysisSessionId && (
          <div className="max-w-4xl mx-auto">
            <PolicyAnalyzer sessionId={analysisSessionId} />
          </div>
        )}
      </div>
    </main>
  );
}