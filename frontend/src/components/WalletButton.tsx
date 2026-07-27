/**
 * WalletButton — Connect/Disconnect wallet button.
 * Shows connected state with truncated public key and full address on hover.
 */
import React from 'react';
import { useWallet } from '@/hooks/useWallet';

export const WalletButton: React.FC = () => {
  const { connected, publicKey, error, isConnecting, connect, disconnect } = useWallet();

  const truncateAddress = (addr: string): string => {
    if (addr.length <= 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (error) {
    return (
      <div className="wallet-error" title={error}>
        <button className="btn btn-danger btn-sm" onClick={connect} disabled={isConnecting}>
          {isConnecting ? 'Connecting...' : '⚠️ Connect Wallet'}
        </button>
        <span className="error-tooltip">{error}</span>
        <style jsx>{`
          .wallet-error {
            position: relative;
            display: inline-flex;
            align-items: center;
            gap: 8px;
          }
          .error-tooltip {
            display: none;
            position: absolute;
            top: 100%;
            right: 0;
            background: #fff;
            border: 1px solid #e74c3c;
            border-radius: 8px;
            padding: 12px 16px;
            font-size: 13px;
            color: #e74c3c;
            white-space: nowrap;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 100;
            margin-top: 8px;
          }
          .wallet-error:hover .error-tooltip {
            display: block;
          }
        `}</style>
      </div>
    );
  }

  if (connected && publicKey) {
    return (
      <div className="wallet-connected">
        <span className="wallet-badge" title={publicKey}>
          <span className="dot" />
          {truncateAddress(publicKey)}
        </span>
        <button className="btn btn-outline btn-sm" onClick={disconnect}>
          Disconnect
        </button>
        <style jsx>{`
          .wallet-connected {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .wallet-badge {
            display: flex;
            align-items: center;
            gap: 8px;
            background: #f0fdf4;
            color: #166534;
            border: 1px solid #bbf7d0;
            padding: 8px 16px;
            border-radius: 24px;
            font-size: 14px;
            font-family: monospace;
            cursor: default;
            transition: all 0.2s ease;
          }
          .wallet-badge:hover {
            background: #dcfce7;
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #22c55e;
            animation: pulse 2s infinite;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <button
      className="btn btn-primary"
      onClick={connect}
      disabled={isConnecting}
    >
      {isConnecting ? (
        <span className="connecting">
          <span className="spinner" /> Connecting...
        </span>
      ) : (
        '🔑 Connect Wallet'
      )}
      <style jsx>{`
        .connecting {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
};
