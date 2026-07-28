/**
 * Tests for wallet hook - state transitions.
 * Tests connect, disconnect, and error states using @stellar/freighter-api.
 */
import { renderHook, act } from '@testing-library/react';

// Mock @stellar/freighter-api
const mockIsConnected = jest.fn();
const mockRequestAccess = jest.fn();

jest.mock('@stellar/freighter-api', () => ({
  isConnected: () => mockIsConnected(),
  requestAccess: () => mockRequestAccess(),
}));

describe('useWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: Freighter not connected, no error
    mockIsConnected.mockResolvedValue({ isConnected: false });
  });

  it('initializes with disconnected state', async () => {
    const { useWallet } = await import('../useWallet');
    const { result } = renderHook(() => useWallet());

    // Initial state before effects resolve
    expect(result.current.connected).toBe(false);
    expect(result.current.publicKey).toBeNull();
    expect(result.current.isConnecting).toBe(false);
  });

  it('detects already-connected Freighter on mount', async () => {
    mockIsConnected.mockResolvedValue({ isConnected: true });
    mockRequestAccess.mockResolvedValue({ address: 'GABCDEF1234567890' });

    const { useWallet } = await import('../useWallet');
    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(result.current.connected).toBe(true);
    expect(result.current.publicKey).toBe('GABCDEF1234567890');
  });

  it('detects Freighter error on mount', async () => {
    mockIsConnected.mockResolvedValue({
      isConnected: false,
      error: { message: 'freighter not found', code: -1 },
    });

    const { useWallet } = await import('../useWallet');
    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(result.current.connected).toBe(false);
    expect(result.current.error).toContain('not found');
  });

  it('connects successfully via requestAccess', async () => {
    mockRequestAccess.mockResolvedValue({ address: 'GABCDEF1234567890' });

    const { useWallet } = await import('../useWallet');
    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.connected).toBe(true);
    expect(result.current.publicKey).toBe('GABCDEF1234567890');
    expect(result.current.error).toBeNull();
    expect(mockRequestAccess).toHaveBeenCalled();
  });

  it('handles connection rejection', async () => {
    mockRequestAccess.mockResolvedValue({
      address: '',
      error: { message: 'user rejected', code: 1 },
    });

    const { useWallet } = await import('../useWallet');
    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.connected).toBe(false);
    expect(result.current.error).toContain('rejected');
  });

  it('handles Freighter not installed during connect', async () => {
    mockRequestAccess.mockResolvedValue({
      address: '',
      error: { message: 'freighter not found', code: -1 },
    });

    const { useWallet } = await import('../useWallet');
    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.connected).toBe(false);
    expect(result.current.error).toContain('Freighter browser extension');
  });
});
