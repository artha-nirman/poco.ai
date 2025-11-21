'use client';

import { useState } from 'react';
import PolicyAnalyzer from './components/PolicyAnalyzer';
import PrivacyProtection from './components/PrivacyProtection';
import SystemStatusIndicator from './components/SystemStatusIndicator';
import { Shield, Zap, Users, CheckCircle, Lock, Eye, Settings, Database } from 'lucide-react';

export default function Home() {
  const [analysisSessionId, setAnalysisSessionId] = useState<string | null>(null);

  const handleDocumentProcessed = (sessionId: string) => {
    console.log('🔄 Document processed callback received with sessionId:', sessionId);
    setAnalysisSessionId(sessionId);
    console.log('✅ Analysis session ID set to:', sessionId);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 py-24">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
            Smart Health Insurance
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Comparison</span>
          </h1>
          <p className="text-xl text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed">
            AI-powered analysis of your policy with instant recommendations from Australia's top providers.
          </p>
          
          <div className="flex justify-center items-center gap-12 mb-10 text-gray-300">
            <div className="flex items-center">
              <Shield className="w-6 h-6 text-cyan-400 mr-3" />
              <span className="font-medium">Privacy-First</span>
            </div>
            <div className="flex items-center">
              <Zap className="w-6 h-6 text-cyan-400 mr-3" />
              <span className="font-medium">Under 3 Minutes</span>
            </div>
            <div className="flex items-center">
              <Users className="w-6 h-6 text-cyan-400 mr-3" />
              <span className="font-medium">All Major Providers</span>
            </div>
          </div>
          
          <div className="text-center">
            <a href="#upload" className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold px-10 py-4 rounded-full text-lg shadow-2xl transform hover:scale-105 transition-all duration-300 inline-block">
              Start Free Analysis
            </a>
            <p className="text-gray-400 text-sm mt-4">
              No signup required • Complete privacy guarantee
            </p>
          </div>
        </div>
      </section>

      {/* Upload Your Current Policy Section */}
      <section id="upload" className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Upload Your Policy
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Drag & drop or click to upload • PDF, Word, or image files
            </p>
          </div>
          <PrivacyProtection onDocumentProcessed={handleDocumentProcessed} />
        </div>
      </section>

      {/* Analysis Results Section */}
      {analysisSessionId && (
        <section className="py-12 bg-background">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <PolicyAnalyzer sessionId={analysisSessionId} />
          </div>
        </section>
      )}

      {/* Privacy Protection Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Enterprise-Grade Privacy
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Your data is automatically protected with bank-level security before any AI analysis begins
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Data Detection Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-8 border border-blue-100 dark:border-gray-700 shadow-xl">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                <Eye className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Smart Detection
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Personal Info</span>
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">Encrypted</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Policy Data</span>
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">Anonymized</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Medical Info</span>
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">Isolated</span>
                </div>
              </div>
            </div>

            {/* User Control Card */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-8 border border-purple-100 dark:border-gray-700 shadow-xl">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mb-6">
                <Settings className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Your Control
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Personal Results</span>
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Optional</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Location Data</span>
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Your Choice</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Data Retention</span>
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Configurable</span>
                </div>
              </div>
            </div>

            {/* Data Rights Card */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-8 border border-green-100 dark:border-gray-700 shadow-xl">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                <Database className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Data Rights
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Auto-deletion</span>
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">24 Hours</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Right to Erasure</span>
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">Instant</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Audit Trail</span>
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">Complete</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* System Status Section */}
      <section className="py-12 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
              System Status
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Real-time security monitoring
            </p>
          </div>
          <SystemStatusIndicator />
        </div>
      </section>
    </div>
  );
}