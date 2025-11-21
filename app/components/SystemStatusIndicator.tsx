'use client';

import { useState, useEffect } from 'react';
import { Database, HardDrive, CheckCircle, AlertCircle, Clock } from 'lucide-react';

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
  const [isExpanded, setIsExpanded] = useState(false);

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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-600 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-gray-400 animate-spin" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">System Status</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Checking systems...</div>
            </div>
          </div>
          <div className="status-dot bg-gray-400 animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 rounded-xl shadow-lg border border-red-200 dark:border-red-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-red-100 dark:bg-red-800 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-red-900 dark:text-red-100">System Check Failed</div>
              <div className="text-xs text-red-700 dark:text-red-300">{error}</div>
            </div>
          </div>
          <div className="status-dot bg-red-500"></div>
        </div>
      </div>
    );
  }

  if (!status) return null;

  const getStatusConfig = () => {
    if (status.sessionStore.status === 'healthy') {
      return {
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800',
        iconBg: 'bg-green-100 dark:bg-green-800',
        iconColor: 'text-green-600 dark:text-green-400',
        dotColor: 'bg-green-500',
        textColor: 'text-green-900 dark:text-green-100',
        subtextColor: 'text-green-700 dark:text-green-300'
      };
    } else if (status.sessionStore.status === 'error') {
      return {
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800', 
        iconBg: 'bg-red-100 dark:bg-red-800',
        iconColor: 'text-red-600 dark:text-red-400',
        dotColor: 'bg-red-500',
        textColor: 'text-red-900 dark:text-red-100',
        subtextColor: 'text-red-700 dark:text-red-300'
      };
    } else {
      return {
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
        iconBg: 'bg-yellow-100 dark:bg-yellow-800', 
        iconColor: 'text-yellow-600 dark:text-yellow-400',
        dotColor: 'bg-yellow-500',
        textColor: 'text-yellow-900 dark:text-yellow-100',
        subtextColor: 'text-yellow-700 dark:text-yellow-300'
      };
    }
  };

  const getIcon = () => {
    if (status.sessionStore.type === 'database') return Database;
    if (status.sessionStore.type === 'file-memory') return HardDrive;
    return AlertCircle;
  };

  const getStatusText = () => {
    const type = status.sessionStore.type === 'database' ? 'Database' : 'File Storage';
    return `${type} • ${status.sessionStore.status.charAt(0).toUpperCase()}${status.sessionStore.status.slice(1)}`;
  };

  const statusConfig = getStatusConfig();
  const IconComponent = getIcon();

  return (
    <div className={`rounded-xl shadow-lg transition-all duration-200 ${statusConfig.bgColor} ${statusConfig.borderColor} border`}>
      <div className="p-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 ${statusConfig.iconBg} rounded-lg flex items-center justify-center`}>
              <IconComponent className={`w-4 h-4 ${statusConfig.iconColor}`} />
            </div>
            <div className="text-left">
              <div className={`text-sm font-medium ${statusConfig.textColor}`}>
                System Status
              </div>
              <div className={`text-xs ${statusConfig.subtextColor}`}>
                {getStatusText()}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {status.sessionStore.status === 'healthy' && (
              <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />
            )}
            <div className={`status-dot ${statusConfig.dotColor} ${
              status.sessionStore.status === 'healthy' ? 'animate-pulse-slow' : ''
            }`}></div>
          </div>
        </button>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 space-y-3 animate-slide-up">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-700 dark:text-gray-300">
              <div>
                <span className="font-medium">Storage Type:</span>
                <span className="ml-1">{status.sessionStore.type === 'database' ? 'PostgreSQL' : 'File System'}</span>
              </div>
              <div>
                <span className="font-medium">Last Check:</span>
                <span className="ml-1">{new Date(status.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
            
            <div>
              <div className="text-xs font-medium mb-1 text-gray-800 dark:text-gray-200">Status Details:</div>
              <div className="text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-md p-2 border border-gray-200 dark:border-gray-600">
                {status.sessionStore.description}
              </div>
            </div>

            {status.sessionStore.type === 'file-memory' && status.sessionStore.databaseConfigured && (
              <div className="flex items-start space-x-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-md p-2 border border-yellow-200 dark:border-yellow-800">
                <AlertCircle className="w-3 h-3 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-yellow-800 dark:text-yellow-200">
                  Database configured but connection failed. Using fallback file storage. 
                  Sessions may not persist between server restarts.
                </div>
              </div>
            )}

            <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
              <span>Auto-refresh: 30s</span>
              <div className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 bg-brand-primary rounded-full opacity-60"></div>
                <div className="w-1.5 h-1.5 bg-brand-secondary rounded-full opacity-40"></div>
                <div className="w-1.5 h-1.5 bg-brand-accent rounded-full opacity-60"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}