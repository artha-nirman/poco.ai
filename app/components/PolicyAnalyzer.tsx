'use client';

import { useState, useEffect } from 'react';
import { Clock, CheckCircle, AlertCircle, TrendingUp, DollarSign, Shield, Award, ArrowRight, ExternalLink } from 'lucide-react';
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
    if (!sessionId || results) {
      console.log('🚫 SSE not starting:', { sessionId, hasResults: !!results });
      return;
    }

    console.log(`🔗 Setting up SSE for session: ${sessionId}`);
    
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

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-success-600';
    if (score >= 0.6) return 'text-brand-secondary';
    return 'text-warning-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 0.8) return 'bg-success-500';
    if (score >= 0.6) return 'bg-brand-secondary';
    return 'bg-warning-500';
  };

  // Don't render anything if there's no sessionId
  if (!sessionId) {
    return null;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Error Display */}
      {error && (
        <div className="card p-6 border-error-200 bg-error-50">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-6 w-6 text-error-500 flex-shrink-0" />
            <div>
              <h3 className="text-heading-sm font-medium text-error-900 mb-1">Analysis Error</h3>
              <p className="text-body-sm text-error-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Progress Section */}
      {progress && !results && (
        <div className="card p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-heading-lg font-semibold text-gray-900">
              Analyzing Your Policy
            </h2>
            <div className="flex items-center space-x-2">
              {progress.isComplete ? (
                <CheckCircle className="h-6 w-6 text-success-500" />
              ) : (
                <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          </div>
          
          <div className="space-y-6">
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-body-md font-medium text-gray-900">{progress.stage}</span>
                <span className="text-body-sm text-gray-500">{progress.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="gradient-bg h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
            </div>
            
            {/* Time Remaining */}
            {!progress.isComplete && progress.estimatedTimeRemaining > 0 && (
              <div className="flex items-center justify-center space-x-2 text-body-sm text-gray-500 bg-gray-50 rounded-lg p-4">
                <Clock className="w-4 h-4" />
                <span>Estimated time remaining: {formatTime(progress.estimatedTimeRemaining)}</span>
              </div>
            )}
            
            {/* Error in Progress */}
            {progress.error && (
              <div className="bg-error-50 border border-error-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-error-500" />
                  <span className="text-body-sm text-error-800">{progress.error}</span>
                </div>
              </div>
            )}

            {/* Educational Content While Processing */}
            <div className="bg-brand-primary bg-opacity-5 rounded-lg p-6">
              <h3 className="text-heading-sm font-medium text-brand-primary mb-3">
                What We're Analyzing
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
                <div className="flex items-start space-x-2">
                  <Shield className="w-4 h-4 text-brand-primary mt-0.5 flex-shrink-0" />
                  <span>Coverage limits and benefits</span>
                </div>
                <div className="flex items-start space-x-2">
                  <DollarSign className="w-4 h-4 text-brand-primary mt-0.5 flex-shrink-0" />
                  <span>Premium costs and excess amounts</span>
                </div>
                <div className="flex items-start space-x-2">
                  <Clock className="w-4 h-4 text-brand-primary mt-0.5 flex-shrink-0" />
                  <span>Waiting periods and conditions</span>
                </div>
                <div className="flex items-start space-x-2">
                  <Award className="w-4 h-4 text-brand-primary mt-0.5 flex-shrink-0" />
                  <span>Additional benefits and extras</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Section */}
      {results && (
        <div className="space-y-6 animate-slide-up">
          {/* Results Header */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-600 p-6 text-center">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 gradient-accent rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Analysis Complete
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
              Compared with {results.totalPoliciesCompared} major Australian providers
            </p>
            
            {/* Key Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-brand-primary mb-1">
                  {formatTime(results.processingTimeMs / 1000)}
                </div>
                <div className="text-xs text-gray-700 dark:text-gray-300">Processing Time</div>
              </div>
              <div>
                <div className="text-lg font-bold text-brand-secondary mb-1">
                  {results.totalPoliciesCompared}
                </div>
                <div className="text-xs text-gray-700 dark:text-gray-300">Policies Compared</div>
              </div>
              <div>
                <div className="text-lg font-bold text-success-600 mb-1">
                  {Math.round(results.confidence * 100)}%
                </div>
                <div className="text-xs text-gray-700 dark:text-gray-300">Confidence</div>
              </div>
              <div>
                <div className="text-lg font-bold text-brand-accent mb-1">
                  {results.recommendations?.length || 0}
                </div>
                <div className="text-xs text-gray-700 dark:text-gray-300">Matches</div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Policy Recommendations
            </h3>

            <div className="space-y-4">
              {results.recommendations.map((result, index) => (
                <div 
                  key={index} 
                  className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-600 hover:shadow-xl p-6 transition-all duration-200 ${
                    index === 0 ? 'ring-2 ring-brand-accent ring-opacity-50' : ''
                  }`}
                >
                  {/* Rank Badge */}
                  {index === 0 && (
                    <div className="inline-flex items-center bg-brand-accent text-white text-xs font-medium px-2 py-1 rounded-full mb-3">
                      <Award className="w-3 h-3 mr-1" />
                      Best Match
                    </div>
                  )}

                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                    {/* Policy Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-heading-md font-semibold text-gray-900 mb-2">
                            {result.policy.providerName} - {result.policy.policyName}
                          </h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-700 dark:text-gray-300">
                            <span className="flex items-center">
                              <Shield className="w-4 h-4 mr-1" />
                              {result.policy.policyTier}
                            </span>
                            <span className="flex items-center">
                              <DollarSign className="w-4 h-4 mr-1" />
                              {formatCurrency(result.policy.premiumRange.single.min)}-{formatCurrency(result.policy.premiumRange.single.max)}/year
                            </span>
                          </div>
                        </div>

                        {/* Match Score */}
                        <div className="text-center">
                          <div className="relative w-16 h-16 mb-2">
                            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                className="text-gray-200"
                              />
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                strokeDasharray={`${2 * Math.PI * 40}`}
                                strokeDashoffset={`${2 * Math.PI * 40 * (1 - result.overallScore)}`}
                                className={getScoreColor(result.overallScore)}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className={`text-body-sm font-bold ${getScoreColor(result.overallScore)}`}>
                                {(result.overallScore * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <div className="text-body-xs text-gray-500">Match Score</div>
                        </div>
                      </div>

                      {/* Reasons Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <h5 className="flex items-center text-body-md font-medium text-success-700 mb-3">
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Why This Policy Works
                          </h5>
                          <ul className="space-y-2">
                            {result.reasoning.slice(0, 3).map((reason: string, i: number) => (
                              <li key={i} className="flex items-start text-body-sm text-gray-700">
                                <div className="w-1.5 h-1.5 bg-success-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h5 className="flex items-center text-body-md font-medium text-warning-700 mb-3">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            Consider These Points
                          </h5>
                          <ul className="space-y-2">
                            {result.potentialDrawbacks.slice(0, 3).map((drawback: string, i: number) => (
                              <li key={i} className="flex items-start text-body-sm text-gray-700">
                                <div className="w-1.5 h-1.5 bg-warning-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                <span>{drawback}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex items-center justify-between pt-6 border-t border-gray-100 mt-6">
                    <div className="text-body-sm text-gray-500">
                      Ranking: #{index + 1} of {results.recommendations.length}
                    </div>
                    <div className="flex items-center space-x-3">
                      <button className="btn-outline text-body-sm px-4 py-2">
                        View Details
                      </button>
                      <button className="btn-primary text-body-sm px-4 py-2 flex items-center">
                        Get Quote
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Session Info */}
          <div className="card p-6 bg-gray-50">
            <h4 className="text-heading-sm font-medium text-gray-900 mb-4">Analysis Details</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-body-lg font-semibold text-brand-primary mb-1">
                  {results.sessionId.substring(0, 8)}...
                </div>
                <div className="text-body-xs text-gray-500">Session ID</div>
              </div>
              <div>
                <div className="text-body-lg font-semibold text-brand-secondary mb-1">
                  {new Date(results.generatedAt).toLocaleDateString()}
                </div>
                <div className="text-body-xs text-gray-500">Generated</div>
              </div>
              <div>
                <div className="text-body-lg font-semibold text-success-600 mb-1">
                  {Math.round(results.confidence * 100)}%
                </div>
                <div className="text-body-xs text-gray-500">Confidence</div>
              </div>
              <div>
                <div className="text-body-lg font-semibold text-brand-accent mb-1">
                  AUS
                </div>
                <div className="text-body-xs text-gray-500">Providers</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}