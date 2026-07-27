/**
 * Tests for wallet hook - state transitions.
 * Tests connect, disconnect, and error states.
 */
import { renderHook, act } from '@testing-library/react';

// Mock window.freighterApi
const mockFreighterApi = {
  isConnected: jest.fn(),
  getPublicKey: jest.fn(),
  requestAccess: jest.fn(),
};

beforeAll(() => {
  (window as unknown as Record<string, unknown>).freighterApi = mockFreighterApi;
});

afterAll(() => {
  delete (window as unknown as Record<string, unknown>).freighterApi;
});

// Dynamic import to avoid issues with module-level window references
describe('useWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with disconnected state', async () => {
    mockFreighterApi.isConnected.mockResolvedValue(false);

    const { useWallet } = await import('../useWallet');
    const { result } = renderHook(() => useWallet());

    expect(result.current.connected).toBe(false);
    expect(result.current.publicKey).toBeNull();
    expect(result.current.isConnecting).toBe(false);
  });

  it('detects Freighter not installed', async () => {
    // Remove Freighter API
    delete (window as unknown as Record<string, unknown>).freighterApi;

    const { useWallet } = await import('../useWallet');
    const { result } = renderHook(() => useWallet());

    // Error should be set
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(result.current.connected).toBe(false);
    expect(result.current.error).toContain('not installed');
  });

  it('connects successfully when Freighter is available', async () => {
    (window as unknown as Record<string, unknown>).freighterApi = {
      isConnected: jest.fn().mockResolvedValue(true),
      getPublicKey: jest.fn().mockResolvedValue('GABCDEF1234567890'),
      requestAccess: jest.fn().mockResolvedValue(true),
    };

    const { useWallet } = await import('../useWallet');
    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.connected).toBe(true);
    expect(result.current.publicKey).toBe('GABCDEF1234567890');
    expect(result.current.error).toBeNull();
  });

  it('handles connection rejection', async () => {
    (window as unknown as Record<string, unknown>).freighterApi = {
      isConnected: jest.fn().mockResolvedValue(false),
      getPublicKey: jest.fn(),
      requestAccess: jest.fn().mockRejectedValue(new Error('user rejected')),
    };

    const { useWallet } = await import('../useWallet');
    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.connected).toBe(false);
    expect(result.current.error).toContain('rejected');
  });
});
