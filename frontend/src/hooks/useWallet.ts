/**
 * Hook: Wallet connection via Freighter browser extension.
 * Manages connect/disconnect state and provides the connected wallet's public key.
 */
import { useState, useEffect, useCallback } from 'react';

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
      // Check if Freighter is installed
      if (typeof window === 'undefined') return;

      const freighter = (window as unknown as Record<string, unknown>).freighterApi;
      if (!freighter) {
        setState((prev) => ({
          ...prev,
          connected: false,
          error: 'Freighter wallet is not installed',
        }));
        return;
      }

      // Check if already connected
      const api = freighter as { isConnected?: () => Promise<boolean>; getPublicKey?: () => Promise<string> };
      const isConnected = api.isConnected ? await api.isConnected() : false;

      if (isConnected && api.getPublicKey) {
        const publicKey = await api.getPublicKey();
        setState({
          connected: true,
          publicKey,
          error: null,
          isConnecting: false,
        });
      }
    } catch (err) {
      setState({
        connected: false,
        publicKey: null,
        error: 'Failed to check wallet connection',
        isConnecting: false,
      });
    }
  }, []);

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      const freighter = (window as unknown as Record<string, unknown>).freighterApi;
      if (!freighter) {
        setState((prev) => ({
          ...prev,
          isConnecting: false,
          error: 'Please install the Freighter browser extension to connect your wallet.',
        }));
        return;
      }

      const api = freighter as { isConnected?: () => Promise<boolean>; getPublicKey?: () => Promise<string>; requestAccess?: () => Promise<boolean> };

      // Request access
      if (api.requestAccess) {
        await api.requestAccess();
      }

      const isConnected = api.isConnected ? await api.isConnected() : false;

      if (isConnected && api.getPublicKey) {
        const publicKey = await api.getPublicKey();
        setState({
          connected: true,
          publicKey,
          error: null,
          isConnecting: false,
        });
      } else {
        setState((prev) => ({
          ...prev,
          isConnecting: false,
          error: 'Failed to connect wallet. Please try again.',
        }));
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Wallet connection failed';
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: message.includes('rejected')
          ? 'Connection request was rejected.'
          : 'Wallet connection failed. Please try again.',
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
