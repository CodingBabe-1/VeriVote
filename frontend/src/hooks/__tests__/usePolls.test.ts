/**
 * Integration tests for usePolls hook: voting and create poll flows.
 * Mocks Freighter signTransaction and Soroban RPC calls.
 */

// Mock @stellar/freighter-api
const mockSignTransaction = jest.fn();
jest.mock('@stellar/freighter-api', () => ({
  isConnected: () => Promise.resolve({ isConnected: false }),
  requestAccess: () =>
    Promise.resolve({ address: 'GABCDEF1234567890' }),
  signTransaction: mockSignTransaction,
}));

// Mock soroban.ts
const mockFetchPolls = jest.fn();
const mockFetchPollInfo = jest.fn();
const mockCastVote = jest.fn();
const mockCreatePoll = jest.fn();
const mockSubmitSignedTx = jest.fn();

jest.mock('@/lib/soroban', () => ({
  fetchPolls: () => mockFetchPolls(),
  fetchPollInfo: (id: string) => mockFetchPollInfo(id),
  castVote: (pollId: string, optionIndex: number, signer: string) =>
    mockCastVote(pollId, optionIndex, signer),
  createPoll: (creator: string, question: string, options: string[]) =>
    mockCreatePoll(creator, question, options),
  submitSignedTransaction: (xdr: string) => mockSubmitSignedTx(xdr),
}));

import { renderHook, act } from '@testing-library/react';
import { usePollDetail, useCreatePoll } from '../usePolls';
import { ErrorCategory } from '@/lib/errors';

describe('usePollDetail — vote flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchPollInfo.mockResolvedValue({
      question: 'Test?',
      options: ['A', 'B'],
      vote_counts: [5, 3],
      is_closed: false,
      creator: 'GCREATOR123',
      voter_registry: 'CREGISTRY123',
      total_votes: 8,
    });
    mockCastVote.mockResolvedValue({
      txHash: 'abc123',
      txXdr: 'AAAAAg...',
    });
    mockSignTransaction.mockResolvedValue({
      signedTxXdr: 'AAAAAg...signed',
      signerAddress: 'GABCDEF1234567890',
    });
    mockSubmitSignedTx.mockResolvedValue('onchain_hash_xyz');
  });

  it('executes full vote flow: castVote → sign → submit', async () => {
    const { result } = renderHook(() => usePollDetail('POLL_ID_1'));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      const r = await result.current.vote(0, 'GABCDEF1234567890');
      expect(r.txHash).toBe('onchain_hash_xyz');
    });

    expect(mockCastVote).toHaveBeenCalledWith(
      'POLL_ID_1',
      0,
      'GABCDEF1234567890'
    );
    expect(mockSignTransaction).toHaveBeenCalledWith('AAAAAg...', {
      networkPassphrase: expect.any(String),
    });
    expect(mockSubmitSignedTx).toHaveBeenCalledWith('AAAAAg...signed');
  });

  it('sets error when voting simulation fails', async () => {
    mockCastVote.mockRejectedValue(new Error('poll is closed'));

    const { result } = renderHook(() => usePollDetail('POLL_ID_2'));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      try {
        await result.current.vote(0, 'GABCDEF1234567890');
      } catch {
        // expected
      }
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.category).toBe(ErrorCategory.CONTRACT);
    expect(result.current.error?.retryable).toBe(false);
  });

  it('sets error when Freighter signing fails', async () => {
    mockCastVote.mockResolvedValue({
      txHash: 'abc',
      txXdr: 'AAAAAg...',
    });
    mockSignTransaction.mockResolvedValue({
      signedTxXdr: '',
      signerAddress: '',
      error: { message: 'user rejected', code: 1 },
    });

    const { result } = renderHook(() => usePollDetail('POLL_ID_3'));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      try {
        await result.current.vote(0, 'GABCDEF1234567890');
      } catch {
        // expected
      }
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.category).toBe(ErrorCategory.WALLET);
  });
});

describe('useCreatePoll — create flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreatePoll.mockResolvedValue({
      txHash: 'create123',
      txXdr: 'AAAAAw...',
      pollAddress: 'CNEWPOLL123456',
    });
    mockSignTransaction.mockResolvedValue({
      signedTxXdr: 'AAAAAw...signed',
      signerAddress: 'GABCDEF1234567890',
    });
    mockSubmitSignedTx.mockResolvedValue('create_hash_xyz');
  });

  it('executes full create flow: createPoll → sign → submit', async () => {
    const { result } = renderHook(() => useCreatePoll());

    let pollAddress = '';

    await act(async () => {
      const r = await result.current.create(
        'Test Question',
        ['Option A', 'Option B'],
        'GABCDEF1234567890'
      );
      pollAddress = r.pollAddress;
    });

    expect(pollAddress).toBe('CNEWPOLL123456');
    expect(mockCreatePoll).toHaveBeenCalledWith(
      'GABCDEF1234567890',
      'Test Question',
      ['Option A', 'Option B']
    );
    expect(mockSignTransaction).toHaveBeenCalledWith('AAAAAw...', {
      networkPassphrase: expect.any(String),
    });
    expect(mockSubmitSignedTx).toHaveBeenCalledWith('AAAAAw...signed');
    expect(result.current.creating).toBe(false);
  });

  it('sets error when create poll fails', async () => {
    mockCreatePoll.mockRejectedValue(new Error('too many options (max 10)'));

    const { result } = renderHook(() => useCreatePoll());

    await act(async () => {
      try {
        await result.current.create(
          'Test?',
          ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'],
          'GABCDEF1234567890'
        );
      } catch {
        // expected
      }
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.category).toBe(ErrorCategory.CONTRACT);
    expect(result.current.creating).toBe(false);
  });

  it('resets creating state and sets error on signing failure', async () => {
    mockCreatePoll.mockResolvedValue({
      txHash: 'create123',
      txXdr: 'AAAAAw...',
      pollAddress: 'CNEWPOLL123456',
    });
    mockSignTransaction.mockRejectedValue(new Error('wallet not connected'));

    const { result } = renderHook(() => useCreatePoll());

    await act(async () => {
      try {
        await result.current.create(
          'Test Question',
          ['A', 'B'],
          'GABCDEF1234567890'
        );
      } catch {
        // expected
      }
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.category).toBe(ErrorCategory.WALLET);
    expect(result.current.creating).toBe(false);
  });
});
