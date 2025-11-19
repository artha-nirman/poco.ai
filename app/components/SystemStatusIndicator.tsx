'use client';

import { useState, useEffect } from 'react';

interface SystemStatus {
  sessionStore: {
    type: 'database' | 'file-memory' | 'unknown';
    status: 'healthy' | 'error' | 'unknown';
    description: string;
    databaseConfigured: boolean;
  };
  timestamp: string;
}

export default function SystemStatusIndicator() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/system/status');
        if (!response.ok) throw new Error('Failed to fetch system status');
        const data = await response.json();
        setStatus(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
    // Refresh status every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600">Checking system status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span className="text-sm text-red-700">System status check failed: {error}</span>
        </div>
      </div>
    );
  }

  if (!status) return null;

  const getStatusColor = () => {
    if (status.sessionStore.status === 'healthy') return 'green';
    if (status.sessionStore.status === 'error') return 'red';
    return 'yellow';
  };

  const getStatusIcon = () => {
    if (status.sessionStore.type === 'database') return '🗄️';
    if (status.sessionStore.type === 'file-memory') return '💾';
    return '❓';
  };

  const statusColor = getStatusColor();
  const statusIcon = getStatusIcon();

  return (
    <div className={`bg-${statusColor}-50 border border-${statusColor}-200 rounded-lg p-3 mb-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 bg-${statusColor}-500 rounded-full ${
            status.sessionStore.status === 'healthy' ? 'animate-pulse' : ''
          }`}></div>
          <span className="text-sm font-medium">
            {statusIcon} Session Store: {status.sessionStore.type === 'database' ? 'Database' : 'File-Memory'}
          </span>
        </div>
        <span className={`text-xs text-${statusColor}-600 uppercase tracking-wide`}>
          {status.sessionStore.status}
        </span>
      </div>
      <p className={`text-sm text-${statusColor}-700 mt-1 ml-4`}>
        {status.sessionStore.description}
      </p>
      {status.sessionStore.type === 'file-memory' && status.sessionStore.databaseConfigured && (
        <p className="text-xs text-orange-600 mt-1 ml-4">
          ⚠️ Database configured but connection failed - using fallback storage
        </p>
      )}
    </div>
  );
}