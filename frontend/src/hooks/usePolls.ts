/**
 * Hook: Poll data fetching and voting management.
 * Orchestrates the full vote flow: build & simulate → sign via Freighter → submit.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  fetchPolls,
  fetchPollInfo,
  castVote,
  createPoll,
  submitSignedTransaction,
  PollEntry,
  PollInfo,
} from '@/lib/soroban';
import { parseError, AppError } from '@/lib/errors';
import { signTransaction } from '@stellar/freighter-api';

const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ||
  'Test SDF Network ; September 2015';

export function usePolls() {
  const [polls, setPolls] = useState<PollEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);

  const loadPolls = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPolls();
      setPolls(data);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPolls();
  }, [loadPolls]);

  return { polls, loading, error, refetch: loadPolls };
}

export function usePollDetail(pollId: string) {
  const [poll, setPoll] = useState<PollInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [voting, setVoting] = useState(false);

  const loadPoll = useCallback(async () => {
    if (!pollId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPollInfo(pollId);
      setPoll(data);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setLoading(false);
    }
  }, [pollId]);

  useEffect(() => {
    loadPoll();
  }, [loadPoll]);

  /**
   * Full vote flow:
   *   1. castVote → build & simulate transaction, get txXdr
   *   2. signTransaction via Freighter
   *   3. submitSignedTransaction to the network
   */
  const vote = useCallback(
    async (optionIndex: number, signerPublicKey: string) => {
      setVoting(true);
      setError(null);
      try {
        // Step 1: Build and simulate the vote transaction
        const { txXdr } = await castVote(pollId, optionIndex, signerPublicKey);

        // Step 2: Sign the transaction XDR via Freighter
        const signResult = await signTransaction(txXdr, {
          networkPassphrase: NETWORK_PASSPHRASE,
        });

        if (signResult.error) {
          throw new Error(
            signResult.error.message || 'Transaction signing failed'
          );
        }

        // Step 3: Submit the signed transaction to the network
        const txHash = await submitSignedTransaction(
          signResult.signedTxXdr
        );

        await loadPoll(); // Refresh poll data after vote
        return { txHash };
      } catch (err) {
        const appError = parseError(err);
        setError(appError);
        throw appError;
      } finally {
        setVoting(false);
      }
    },
    [pollId, loadPoll]
  );

  return { poll, loading, error, voting, vote, refetch: loadPoll };
}

/**
 * Hook: Create poll flow.
 * Orchestrates: createPoll (build+simulate) → sign via Freighter → submit.
 */
export function useCreatePoll() {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const create = useCallback(
    async (
      question: string,
      options: string[],
      signerPublicKey: string
    ) => {
      setCreating(true);
      setError(null);
      try {
        // Step 1: Build and simulate the create transaction
        const { txXdr, pollAddress } = await createPoll(
          signerPublicKey,
          question,
          options
        );

        // Step 2: Sign via Freighter
        const signResult = await signTransaction(txXdr, {
          networkPassphrase: NETWORK_PASSPHRASE,
        });

        if (signResult.error) {
          throw new Error(
            signResult.error.message || 'Transaction signing failed'
          );
        }

        // Step 3: Submit
        await submitSignedTransaction(signResult.signedTxXdr);

        return { pollAddress };
      } catch (err) {
        const appError = parseError(err);
        setError(appError);
        throw appError;
      } finally {
        setCreating(false);
      }
    },
    []
  );

  const dismissError = useCallback(() => setError(null), []);

  return { creating, error, create, dismissError };
}
