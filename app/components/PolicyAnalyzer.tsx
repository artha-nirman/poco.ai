'use client';

import { useState, useEffect } from 'react';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { AnalysisResults } from '@/lib/types';

interface ProgressData {
  stage: string;
  progress: number;
  estimatedTimeRemaining: number;
  isComplete: boolean;
  error?: string;
}

interface PolicyAnalyzerProps {
  sessionId?: string | null;
  onAnalysisComplete?: (results: AnalysisResults) => void;
}

export default function PolicyAnalyzer({ sessionId, onAnalysisComplete }: PolicyAnalyzerProps) {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use SSE for real-time progress updates
  useEffect(() => {
    if (!sessionId || results) return;

    console.log(`Setting up SSE for session: ${sessionId}`);
    
    const eventSource = new EventSource(`/api/policies/progress/${sessionId}`);

    eventSource.onopen = (event) => {
      console.log('SSE connection opened:', event);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('SSE message received:', data);
        
        switch (data.type) {
          case 'connected':
            console.log('SSE connected for session:', data.sessionId);
            break;
            
          case 'progress':
            console.log('Setting progress:', data.progress);
            setProgress(data.progress);
            break;
            
          case 'results':
            console.log('Analysis complete, setting results');
            setResults(data.results);
            setProgress(null);
            if (onAnalysisComplete) {
              onAnalysisComplete(data.results);
            }
            eventSource.close();
            break;
            
          case 'error':
            console.error('SSE received error:', data.error);
            setError(data.error);
            eventSource.close();
            break;
            
          default:
            console.warn('Unknown SSE message type:', data.type);
        }
      } catch (err) {
        console.error('Failed to parse SSE data:', err, 'Raw data:', event.data);
      }
    };

    eventSource.onerror = (event) => {
      console.error('SSE connection error:', event);
      
      // Check the readyState to understand what happened
      if (eventSource.readyState === EventSource.CONNECTING) {
        console.log('SSE reconnecting...');
      } else if (eventSource.readyState === EventSource.CLOSED) {
        console.log('SSE connection closed');
        setError('Connection lost - please refresh the page');
      } else {
        console.log('SSE connection failed');
        setError('Connection error - please try again');
      }
      
      eventSource.close();
    };

    return () => {
      console.log('Cleaning up SSE connection');
      if (eventSource.readyState !== EventSource.CLOSED) {
        eventSource.close();
      }
    };
  }, [sessionId, results, onAnalysisComplete]);

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

  // Don't render anything if there's no sessionId
  if (!sessionId) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
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
          </div>

          {/* Metadata */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Policy Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
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