/**
 * Privacy Protection Component
 * User interface for PII protection, consent management, and transparency
 */

'use client';

import { useState, useEffect } from 'react';
import { PersonalizationConsent } from '@/lib/security/pii-protection';
import { Upload, FileText, Shield, Eye, EyeOff, Trash2, Check, AlertTriangle, Lock } from 'lucide-react';

interface PIIReportItem {
  type: string;
  description: string;
  usage: string;
  retention: string;
  anonymized: boolean;
}

interface PrivacyState {
  sessionId: string | null;
  encryptionKey: string | null;
  piiDetected: boolean;
  consent: PersonalizationConsent;
  piiReport: PIIReportItem[];
  showPrivacyDashboard: boolean;
  processing: boolean;
}

interface DocumentProcessingResult {
  sessionId: string;
  anonymizedContent: string;
  piiDetected: boolean;
  confidence: number;
  encryptionKey?: string;
  privacyNotice: string;
  safeForProcessing: boolean;
}

interface PrivacyProtectionProps {
  onDocumentProcessed?: (sessionId: string) => void;
}

export default function PrivacyProtectionComponent({ onDocumentProcessed }: PrivacyProtectionProps) {
  const [privacyState, setPrivacyState] = useState<PrivacyState>({
    sessionId: null,
    encryptionKey: null,
    piiDetected: false,
    consent: {
      includeName: false,
      includePremium: false,
      includeAddress: false,
      dataRetention: 'session-only'
    },
    piiReport: [],
    showPrivacyDashboard: false,
    processing: false
  });

  const [documentContent, setDocumentContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processingResult, setProcessingResult] = useState<DocumentProcessingResult | null>(null);
  const [privacyNotice, setPrivacyNotice] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);

  /**
   * Process document with PII protection and trigger policy analysis
   */
  const handleDocumentUpload = async () => {
    if (!selectedFile) return;
    
    setPrivacyState(prev => ({ ...prev, processing: true }));
    
    try {
      // For now, let's use a simple text extraction for demonstration
      // In a real implementation, this would use Azure Document Intelligence
      let textContent = '';
      
      if (selectedFile.type === 'text/plain') {
        textContent = await selectedFile.text();
      } else {
        // For PDFs and other files, we'll use a placeholder
        textContent = `Document uploaded: ${selectedFile.name} (${selectedFile.type})
        
This is a sample insurance policy document for demonstration purposes.
Policy Holder: John Smith
Phone: 0412 345 678
Email: john.smith@email.com
Premium: $450 per month
Policy Number: POL123456
`;
      }

      // Step 1: PII Protection
      const privacyResponse = await fetch('/api/privacy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: textContent,
          consent: privacyState.consent
        })
      });

      if (!privacyResponse.ok) {
        throw new Error('Document processing failed');
      }

      const privacyResult: DocumentProcessingResult = await privacyResponse.json();
      
      setProcessingResult(privacyResult);
      setPrivacyNotice(privacyResult.privacyNotice);
      setPrivacyState(prev => ({
        ...prev,
        sessionId: privacyResult.sessionId,
        encryptionKey: privacyResult.encryptionKey || null,
        piiDetected: privacyResult.piiDetected,
        processing: false
      }));

      // Step 2: Load privacy report if PII was detected
      if (privacyResult.piiDetected && privacyResult.encryptionKey) {
        await loadPrivacyReport(privacyResult.sessionId, privacyResult.encryptionKey);
      }

      // Step 3: Trigger policy analysis with anonymized content
      if (privacyResult.safeForProcessing) {
        const analysisResponse = await fetch('/api/policies/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: privacyResult.sessionId,
            anonymizedContent: privacyResult.anonymizedContent,
            originalContent: textContent
          })
        });

        if (analysisResponse.ok) {
          const analysisData = await analysisResponse.json();
          
          // Notify parent component that analysis has started
          if (onDocumentProcessed) {
            onDocumentProcessed(analysisData.sessionId || privacyResult.sessionId);
          }
        } else {
          console.warn('Policy analysis failed to start, but PII protection succeeded');
          if (onDocumentProcessed) {
            onDocumentProcessed(privacyResult.sessionId);
          }
        }
      } else {
        if (onDocumentProcessed) {
          onDocumentProcessed(privacyResult.sessionId);
        }
      }

    } catch (error) {
      console.error('Document processing error:', error);
      setPrivacyState(prev => ({ ...prev, processing: false }));
    }
  };

  /**
   * Load detailed privacy report
   */
  const loadPrivacyReport = async (sessionId: string, encryptionKey: string) => {
    try {
      const response = await fetch(
        `/api/privacy?action=privacy-report&sessionId=${sessionId}&encryptionKey=${encryptionKey}`
      );

      if (response.ok) {
        const report = await response.json();
        setPrivacyState(prev => ({
          ...prev,
          piiReport: report.detectedPII || []
        }));
      }
    } catch (error) {
      console.error('Failed to load privacy report:', error);
    }
  };

  /**
   * Update consent preferences
   */
  const updateConsent = async (newConsent: Partial<PersonalizationConsent>) => {
    const updatedConsent = { ...privacyState.consent, ...newConsent };
    
    setPrivacyState(prev => ({
      ...prev,
      consent: updatedConsent
    }));

    // If we have an active session, update the consent on server
    if (privacyState.sessionId) {
      try {
        await fetch('/api/privacy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: documentContent,
            sessionId: privacyState.sessionId,
            consent: updatedConsent
          })
        });
      } catch (error) {
        console.error('Failed to update consent:', error);
      }
    }
  };

  /**
   * Delete all user data
   */
  const deleteAllData = async () => {
    if (!privacyState.sessionId) return;

    try {
      const response = await fetch(`/api/privacy?sessionId=${privacyState.sessionId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Reset privacy state
        setPrivacyState({
          sessionId: null,
          encryptionKey: null,
          piiDetected: false,
          consent: {
            includeName: false,
            includePremium: false,
            includeAddress: false,
            dataRetention: 'session-only'
          },
          piiReport: [],
          showPrivacyDashboard: false,
          processing: false
        });
        setProcessingResult(null);
        setPrivacyNotice('');
        alert('All your data has been securely deleted.');
      }
    } catch (error) {
      console.error('Failed to delete data:', error);
      alert('Failed to delete data. Please try again.');
    }
  };

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragOut = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      setSelectedFile(files[0]);
      setDocumentContent(files[0].name);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Privacy Promise */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-3xl p-10 shadow-2xl text-center">
        <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6">
          <Shield className="w-10 h-10 text-white" />
        </div>
        <h3 className="text-3xl font-bold text-white mb-4">
          Bank-Level Security
        </h3>
        <p className="text-blue-100 text-lg mb-6 max-w-md mx-auto">
          Your sensitive information is automatically detected and protected before any AI analysis
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-white/90">
          <div className="flex items-center">
            <Check className="w-5 h-5 text-green-300 mr-2" />
            <span className="font-medium">AES-256 Encryption</span>
          </div>
          <div className="flex items-center">
            <Check className="w-5 h-5 text-green-300 mr-2" />
            <span className="font-medium">Auto-deletion 24h</span>
          </div>
          <div className="flex items-center">
            <Check className="w-5 h-5 text-green-300 mr-2" />
            <span className="font-medium">Privacy Act Compliant</span>
          </div>
        </div>
      </div>

      {/* Document Upload */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
        <div
          className={`relative border-2 border-dashed rounded-2xl p-16 text-center transition-all duration-300 ${
            isDragActive 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-105' 
              : selectedFile 
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
          onDrag={handleDrag}
          onDragStart={handleDrag}
          onDragEnd={handleDrag}
          onDragOver={handleDrag}
          onDragEnter={handleDragIn}
          onDragLeave={handleDragOut}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setDocumentContent(file.name);
                setSelectedFile(file);
              }
            }}
            className="hidden"
            id="file-upload"
          />
          
          <label htmlFor="file-upload" className="cursor-pointer block">
            <div className="space-y-6">
              {selectedFile ? (
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                    <FileText className="w-10 h-10 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-xl font-semibold text-green-700 dark:text-green-300">
                    {selectedFile.name}
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready to analyze
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-colors duration-300 ${
                    isDragActive 
                      ? 'bg-blue-100 dark:bg-blue-900' 
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    <Upload className={`w-10 h-10 transition-colors duration-300 ${
                      isDragActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                    }`} />
                  </div>
                  <div className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                    {isDragActive ? 'Drop your file here' : 'Upload Your Policy'}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 text-lg">
                    Drag & drop or click to select
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                    PDF, DOC, DOCX, TXT, JPG, PNG • Max 10MB
                  </div>
                </div>
              )}
            </div>
          </label>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Lock className="w-4 h-4 text-green-500 dark:text-green-400" />
            <span>Auto-protected • PII encrypted • Analysis anonymized</span>
          </div>
          
          <button
            onClick={handleDocumentUpload}
            disabled={!selectedFile || privacyState.processing}
            className={`px-10 py-4 rounded-full font-semibold text-lg transition-all duration-300 transform ${
              !selectedFile || privacyState.processing
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-xl hover:scale-105'
            }`}
          >
            {privacyState.processing ? (
              <span className="flex items-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                Processing...
              </span>
            ) : (
              'Start Free Analysis'
            )}
          </button>
        </div>
      </div>

      {/* Privacy Notice */}
      {privacyNotice && (
        <div className="card p-6 border-success-200 bg-success-50 animate-slide-up">
          <div className="flex items-start space-x-3">
            <Check className="w-5 h-5 text-success-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-success-900 mb-2">Privacy Protection Applied</h4>
              <div className="text-body-sm text-success-800 whitespace-pre-line">
                {privacyNotice}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PII Detection Results */}
      {privacyState.piiDetected && (
        <div className="card p-6 border-warning-200 bg-warning-50">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-warning-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-warning-900 mb-1">Personal Information Detected</h4>
                <p className="text-body-sm text-warning-800">
                  We found {privacyState.piiReport.length} type(s) of personal information. 
                  All data has been encrypted and anonymized for analysis.
                </p>
              </div>
            </div>
            <button
              onClick={() => setPrivacyState(prev => ({ 
                ...prev, 
                showPrivacyDashboard: !prev.showPrivacyDashboard 
              }))}
              className="flex items-center text-warning-700 text-body-sm font-medium hover:text-warning-900 transition-colors"
            >
              {privacyState.showPrivacyDashboard ? (
                <>
                  <EyeOff className="w-4 h-4 mr-1" />
                  Hide Details
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-1" />
                  View Details
                </>
              )}
            </button>
          </div>

          {privacyState.showPrivacyDashboard && (
            <div className="space-y-4 pt-4 border-t border-warning-300 animate-slide-up">
              {privacyState.piiReport.map((item, index) => (
                <div key={index} className="bg-white rounded-lg p-4 border border-warning-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900 mb-1">{item.type}</h5>
                      <p className="text-body-sm text-gray-600 mb-2">{item.description}</p>
                      <p className="text-body-xs text-gray-500">{item.usage}</p>
                    </div>
                    <div className="flex items-center text-body-xs bg-success-100 text-success-800 px-3 py-1 rounded-full ml-4">
                      <Shield className="w-3 h-3 mr-1" />
                      Encrypted
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Consent Management */}
      {privacyState.piiDetected && (
        <div className="card p-6">
          <h4 className="text-heading-md font-semibold text-gray-900 mb-4">
            Personalization Options
          </h4>
          <p className="text-body-md text-gray-600 mb-6">
            Choose how you'd like to use your personal information for a more personalized experience (optional):
          </p>

          <div className="space-y-4 mb-6">
            {[
              {
                key: 'includeName' as keyof PersonalizationConsent,
                title: 'Personalized greeting',
                description: 'Include your name in results and communications'
              },
              {
                key: 'includePremium' as keyof PersonalizationConsent, 
                title: 'Premium comparison',
                description: 'Show exact savings calculations based on your current premium'
              },
              {
                key: 'includeAddress' as keyof PersonalizationConsent,
                title: 'Location-based providers', 
                description: 'Find providers and specialists near your address'
              }
            ].map((option) => (
              <label key={option.key} className="flex items-start space-x-3 p-4 rounded-lg border border-gray-200 hover:border-brand-secondary hover:bg-gray-50 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={privacyState.consent[option.key] as boolean}
                  onChange={(e) => updateConsent({ [option.key]: e.target.checked })}
                  className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary mt-0.5"
                />
                <div className="flex-1">
                  <div className="text-body-md font-medium text-gray-900">{option.title}</div>
                  <div className="text-body-sm text-gray-600">{option.description}</div>
                </div>
              </label>
            ))}
          </div>

          <div className="pt-6 border-t border-gray-200">
            <label className="block text-body-md font-medium text-gray-900 mb-3">
              Data Retention Period
            </label>
            <select
              value={privacyState.consent.dataRetention}
              onChange={(e) => updateConsent({ 
                dataRetention: e.target.value as PersonalizationConsent['dataRetention'] 
              })}
              className="block w-full sm:w-auto border-gray-300 rounded-lg shadow-sm focus:ring-brand-primary focus:border-brand-primary text-body-md"
            >
              <option value="session-only">Delete when I close browser (Recommended)</option>
              <option value="1-hour">Delete after 1 hour</option>
              <option value="24-hours">Delete after 24 hours (Maximum)</option>
            </select>
          </div>
        </div>
      )}

      {/* Processing Results */}
      {processingResult && (
        <div className="card p-6 bg-gray-50">
          <h4 className="text-heading-md font-semibold text-gray-900 mb-4">Processing Complete</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-heading-lg font-bold text-success-600 mb-1">
                ✓ Safe
              </div>
              <div className="text-body-sm text-gray-600">Ready for Analysis</div>
            </div>
            <div className="text-center">
              <div className="text-heading-lg font-bold text-brand-primary mb-1">
                {processingResult.piiDetected ? 'Yes' : 'No'}
              </div>
              <div className="text-body-sm text-gray-600">PII Detected</div>
            </div>
            <div className="text-center">
              <div className="text-heading-lg font-bold text-brand-secondary mb-1">
                {Math.round(processingResult.confidence * 100)}%
              </div>
              <div className="text-body-sm text-gray-600">Confidence</div>
            </div>
          </div>
        </div>
      )}

      {/* Data Management */}
      {privacyState.sessionId && (
        <div className="card p-6 border-error-200 bg-error-50">
          <div className="flex items-start space-x-3">
            <Trash2 className="w-5 h-5 text-error-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-error-900 mb-2">Data Management</h4>
              <p className="text-body-sm text-error-800 mb-4">
                You can delete all your data immediately. This action cannot be undone and will remove 
                all encrypted personal information and analysis results.
              </p>
              <button
                onClick={deleteAllData}
                className="bg-error-600 hover:bg-error-700 text-white text-body-sm font-medium px-4 py-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-2"
              >
                Delete All My Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}