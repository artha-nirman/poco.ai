'use client';

import { useState, useEffect } from 'react';
import { Upload, Clock, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { AnalysisResults, ComparisonResult } from '@/lib/types';
import SystemStatusIndicator from './SystemStatusIndicator';

interface ProgressData {
  stage: string;
  progress: number;
  estimatedTimeRemaining: number;
  isComplete: boolean;
  error?: string;
}

export default function PolicyAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use SSE for real-time progress updates
  useEffect(() => {
    if (!sessionId || results) return;

    console.log(`Setting up SSE for session: ${sessionId}`);
    
    const eventSource = new EventSource(`/api/policies/progress/${sessionId}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('SSE message:', data);
        
        switch (data.type) {
          case 'connected':
            console.log('SSE connected for session:', data.sessionId);
            break;
            
          case 'progress':
            setProgress(data.progress);
            break;
            
          case 'results':
            setResults(data.results);
            setProgress(null); // Clear progress once results are loaded
            eventSource.close();
            break;
            
          case 'error':
            setError(data.error);
            eventSource.close();
            break;
        }
      } catch (err) {
        console.error('Failed to parse SSE data:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE error:', err);
      setError('Connection error - please try again');
      eventSource.close();
    };

    // Cleanup function
    return () => {
      console.log('Closing SSE connection');
      eventSource.close();
    };
  }, [sessionId, results]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Please select a PDF file');
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be under 10MB');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setSessionId(null);
    setProgress(null);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append('policy', file);

      const response = await fetch('/api/policies/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      setSessionId(data.sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const resetAnalysis = () => {
    setFile(null);
    setSessionId(null);
    setProgress(null);
    setResults(null);
    setError(null);
    setIsUploading(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Policy Analysis Tool
        </h1>
        <p className="text-gray-600">
          Upload your health insurance policy to compare with Australian providers
        </p>
      </div>

      {/* System Status Indicator */}
      <SystemStatusIndicator />

      {/* File Upload Section */}
      {!sessionId && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
          <div className="text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <div className="mb-4">
              <label htmlFor="file-upload" className="cursor-pointer">
                <span className="text-lg font-medium text-blue-600 hover:text-blue-500">
                  Choose your policy PDF
                </span>
                <input
                  id="file-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>
            {file && (
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
                </p>
              </div>
            )}
            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Clock className="animate-spin -ml-1 mr-3 h-5 w-5" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="-ml-1 mr-3 h-5 w-5" />
                  Start Analysis
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Progress Section */}
      {progress && !results && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Analysis Progress</h2>
            {progress.isComplete ? (
              <CheckCircle className="h-6 w-6 text-green-500" />
            ) : (
              <Clock className="h-6 w-6 text-blue-500" />
            )}
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>{progress.stage}</span>
                <span>{progress.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
            </div>
            
            {!progress.isComplete && progress.estimatedTimeRemaining > 0 && (
              <p className="text-sm text-gray-500">
                Estimated time remaining: {formatTime(progress.estimatedTimeRemaining)}
              </p>
            )}
            
            {progress.error && (
              <div className="text-red-600 text-sm">
                Error: {progress.error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results Section */}
      {results && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Analysis Results</h2>
            <button
              onClick={resetAnalysis}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              Analyze Another Policy
            </button>
          </div>

          {/* Metadata */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Policy Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">File:</span> {file?.name || 'Unknown'}
              </div>
              <div>
                <span className="font-medium">Processing Time:</span> {formatTime(results.processingTimeMs)}
              </div>
              <div>
                <span className="font-medium">Session ID:</span> {results.sessionId}
              </div>
              <div>
                <span className="font-medium">Policies Compared:</span> {results.totalPoliciesCompared}
              </div>
              <div>
                <span className="font-medium">Confidence:</span> {Math.round(results.confidence * 100)}%
              </div>
              <div>
                <span className="font-medium">Generated:</span> {new Date(results.generatedAt).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Comparison Rankings */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Policy Comparisons</h3>
            <div className="space-y-4">
              {results.recommendations.map((result, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">
                        {result.policy.providerName} - {result.policy.policyName}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {result.policy.policyTier} | {formatCurrency(result.policy.premiumRange.single.min)}-{formatCurrency(result.policy.premiumRange.single.max)}/year
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-blue-600">
                        {(result.overallScore * 100).toFixed(1)}% match
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-green-700 mb-2">Why This Policy Works</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {result.reasoning.map((reason: string, i: number) => (
                          <li key={i} className="flex items-start">
                            <span className="text-green-500 mr-2">•</span>
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-red-700 mb-2">Potential Drawbacks</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {result.potentialDrawbacks.map((drawback: string, i: number) => (
                          <li key={i} className="flex items-start">
                            <span className="text-red-500 mr-2">•</span>
                            {drawback}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}