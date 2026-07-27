/**
 * Hook: Poll data fetching and management.
 */
import { useState, useEffect, useCallback } from 'react';
import { fetchPolls, fetchPollInfo, castVote, PollEntry, PollInfo } from '@/lib/soroban';
import { parseError, AppError } from '@/lib/errors';

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

  const vote = useCallback(
    async (optionIndex: number, signerPublicKey: string) => {
      setVoting(true);
      setError(null);
      try {
        const result = await castVote(pollId, optionIndex, signerPublicKey);
        await loadPoll(); // Refresh data after vote
        return result;
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
