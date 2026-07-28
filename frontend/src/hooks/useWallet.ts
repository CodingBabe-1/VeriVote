/**
 * Hook: Wallet connection via Freighter browser extension.
 * Uses @stellar/freighter-api (v3) for proper Freighter integration.
 * Manages connect/disconnect state and provides the connected wallet's public key.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  isConnected,
  requestAccess,
} from '@stellar/freighter-api';

interface WalletState {
  connected: boolean;
  publicKey: string | null;
  error: string | null;
  isConnecting: boolean;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    connected: false,
    publicKey: null,
    error: null,
    isConnecting: false,
  });

  const checkConnection = useCallback(async () => {
    try {
      if (typeof window === 'undefined') return;

      const result = await isConnected();

      if (result.error) {
        setState((prev) => ({
          ...prev,
          connected: false,
          error: result.error.message || 'Freighter wallet is not installed.',
        }));
        return;
      }

      if (result.isConnected) {
        // Already connected — requestAccess in v3 returns the address
        // and typically won't re-prompt if already authorized
        const accessResult = await requestAccess();
        if (accessResult.error) {
          setState((prev) => ({
            ...prev,
            connected: false,
            error: accessResult.error.message || 'Failed to get wallet address.',
          }));
        } else {
          setState({
            connected: true,
            publicKey: accessResult.address,
            error: null,
            isConnecting: false,
          });
        }
      } else {
        setState((prev) => ({
          ...prev,
          connected: false,
          error: null,
        }));
      }
    } catch (err) {
      setState({
        connected: false,
        publicKey: null,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to check wallet connection.',
        isConnecting: false,
      });
    }
  }, []);

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      const result = await requestAccess();

      if (result.error) {
        const msg = result.error.message || 'Wallet connection failed';
        setState((prev) => ({
          ...prev,
          isConnecting: false,
          error: msg.includes('reject') || msg.includes('denied')
            ? 'Connection request was rejected.'
            : 'Please install the Freighter browser extension to connect your wallet.',
        }));
      } else {
        setState({
          connected: true,
          publicKey: result.address,
          error: null,
          isConnecting: false,
        });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Wallet connection failed';

      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: message.includes('reject') || message.includes('denied')
          ? 'Connection request was rejected.'
          : 'Please install the Freighter browser extension to connect your wallet.',
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({
      connected: false,
      publicKey: null,
      error: null,
      isConnecting: false,
    });
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  return {
    ...state,
    connect,
    disconnect,
    checkConnection,
  };
}
