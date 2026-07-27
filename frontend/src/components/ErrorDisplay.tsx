/**
 * ErrorDisplay — Differentiated error UI for three error categories.
 */
import React from 'react';
import { ErrorCategory, AppError } from '@/lib/errors';

interface ErrorDisplayProps {
  error: AppError;
  onRetry?: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onRetry }) => {
  const getErrorConfig = () => {
    switch (error.category) {
      case ErrorCategory.ELIGIBILITY:
        return {
          icon: '🚫',
          title: 'Not Eligible',
          className: 'error-eligibility',
        };
      case ErrorCategory.WALLET:
        return {
          icon: '🔑',
          title: 'Wallet Error',
          className: 'error-wallet',
        };
      case ErrorCategory.NETWORK:
        return {
          icon: '🌐',
          title: 'Network Error',
          className: 'error-network',
        };
      case ErrorCategory.CONTRACT:
        return {
          icon: '📜',
          title: 'Contract Error',
          className: 'error-contract',
        };
      default:
        return {
          icon: '⚠️',
          title: 'Error',
          className: 'error-unknown',
        };
    }
  };

  const config = getErrorConfig();

  return (
    <div className={`error-display ${config.className}`}>
      <div className="error-header">
        <span className="error-icon">{config.icon}</span>
        <span className="error-title">{config.title}</span>
      </div>
      <p className="error-message">{error.userMessage}</p>
      <div className="error-actions">
        {error.retryable && onRetry && (
          <button className="btn btn-retry btn-sm" onClick={onRetry}>
            🔄 Retry
          </button>
        )}
        {error.category === ErrorCategory.WALLET && (
          <a
            href="https://freighter.app"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-sm"
          >
            Install Freighter →
          </a>
        )}
      </div>
      <style jsx>{`
        .error-display {
          border-radius: 12px;
          padding: 24px;
          margin: 16px 0;
          animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .error-eligibility {
          background: #fef2f2;
          border: 1px solid #fecaca;
        }
        .error-eligibility .error-icon { color: #dc2626; }
        .error-eligibility .error-title { color: #991b1b; }
        .error-wallet {
          background: #fff7ed;
          border: 1px solid #fed7aa;
        }
        .error-wallet .error-icon { color: #ea580c; }
        .error-wallet .error-title { color: #9a3412; }
        .error-network {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
        }
        .error-network .error-icon { color: #2563eb; }
        .error-network .error-title { color: #1e40af; }
        .error-contract {
          background: #fefce8;
          border: 1px solid #fef08a;
        }
        .error-contract .error-icon { color: #ca8a04; }
        .error-contract .error-title { color: #854d0e; }
        .error-unknown {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
        }
        .error-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }
        .error-icon {
          font-size: 24px;
        }
        .error-title {
          font-size: 16px;
          font-weight: 600;
        }
        .error-message {
          color: #374151;
          font-size: 14px;
          line-height: 1.5;
          margin: 0 0 16px;
        }
        .error-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
      `}</style>
    </div>
  );
};
