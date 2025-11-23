'use client';

import { useState } from 'react';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface PolicyAnalyzerProps {
  countryConfiguration: any;
  apiEndpoint: string;
  progressEndpoint: string;
  resultsEndpoint: string;
  className?: string;
}

export default function PolicyAnalyzer({ 
  countryConfiguration,
  apiEndpoint,
  progressEndpoint, 
  resultsEndpoint,
  className = ''
}: PolicyAnalyzerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<any>(null);
  const [results, setResults] = useState<any>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('policy', file);

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to analyze policy');
      }

      const analysisResponse = await response.json();
      
      if (analysisResponse.session_id) {
        // Start SSE for real-time progress updates  
        startSSEConnection(analysisResponse.session_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
    }
  };

  const startSSEConnection = (sessionId: string) => {
    // Check if EventSource is supported
    if (typeof EventSource === 'undefined') {
      setError('Real-time updates not supported in this browser');
      return;
    }
    
    // Build the correct SSE URL for V2 endpoint  
    const sseUrl = `${progressEndpoint}/${sessionId}`;
    
    try {
      // Create EventSource
      const eventSource = new EventSource(sseUrl, {
        withCredentials: false
      });

      eventSource.onopen = () => {
        setError(null); // Clear any connection errors
      };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'connected':
            setError(null);
            break;
            
          case 'progress':
            setProgress(data.progress);
            break;
            
          case 'results':
            setResults(data.results);
            setProgress(null);
            setIsLoading(false);
            eventSource.close();
            break;
            
          case 'error':
            setError(data.error);
            setIsLoading(false);
            eventSource.close();
            break;
        }
      } catch (err) {
        setError('Connection error - please try again');
        setIsLoading(false);
        eventSource.close();
      }
    };

    eventSource.onerror = (event) => {
      if (eventSource.readyState === EventSource.CLOSED) {
        setError('Connection lost - please refresh the page');
        setIsLoading(false);
      } else {
        setError('Connection error - please try again');
        setIsLoading(false);
      }
      eventSource.close();
    };
    } catch (error) {
      setError('Failed to establish real-time connection');
      setIsLoading(false);
    }
  };

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Error Display */}
      {error && (
        <div className="card p-6 border-red-200 bg-red-50">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <div>
              <h3 className="font-medium text-red-900">Analysis Error</h3>
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* File Upload */}
      {!isLoading && !results && (
        <div className="card p-8">
          <h2 className="text-xl font-semibold mb-6">Upload Your Policy Document</h2>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileUpload}
            className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg"
          />
        </div>
      )}

      {/* Progress */}
      {progress && !results && (
        <div className="card p-8">
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="h-5 w-5 text-blue-500" />
            <span>Analyzing...</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-blue-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress.progress || progress.progress_percentage || 0}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {progress.stage || progress.current_stage || progress.message || 'Processing...'}
          </p>
          {progress.estimatedTimeRemaining > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Estimated time remaining: {Math.ceil(progress.estimatedTimeRemaining / 1000)}s
            </p>
          )}
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="card p-8">
          <div className="flex items-center space-x-2 mb-6">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <h2 className="text-xl font-semibold">Analysis Complete</h2>
          </div>
          
          <div className="space-y-6">
            {/* Summary */}
            <div>
              <h3 className="font-semibold mb-3">Analysis Summary</h3>
              <p className="text-gray-700">
                Analysis completed for {countryConfiguration.countryName || countryConfiguration.name}. 
                {results.recommendations?.length || 0} recommendations found.
              </p>
            </div>

            {/* Recommendations */}
            {results.recommendations && results.recommendations.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Top Recommendations</h3>
                <div className="space-y-3">
                  {results.recommendations.slice(0, 3).map((rec: any, index: number) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <h4 className="font-medium">{rec.provider?.name || 'Unknown Provider'}</h4>
                      <p className="text-sm text-gray-600">{rec.policy?.name || 'Policy'}</p>
                      <p className="text-sm">
                        Premium: {rec.premium?.currency} {rec.premium?.amount || 0}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            {results.metadata && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Analysis Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium">API Version</div>
                    <div className="text-gray-600">{results.metadata.api_version || '2.0'}</div>
                  </div>
                  <div>
                    <div className="font-medium">Processing Time</div>
                    <div className="text-gray-600">{results.metadata.processing_time_ms || 0}ms</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { PolicyAnalyzer };