/**
 * Tests for error mapping layer.
 * Covers all three error categories: eligibility, wallet, network.
 */
import { parseError, ErrorCategory } from '../errors';

describe('parseError', () => {
  describe('Eligibility errors', () => {
    it('detects "already voted" error', () => {
      const error = parseError('you have already voted in this poll');
      expect(error.category).toBe(ErrorCategory.ELIGIBILITY);
      expect(error.userMessage).toContain("not eligible");
      expect(error.retryable).toBe(false);
    });

    it('detects "not eligible" error', () => {
      const error = parseError('you are not eligible to vote in this poll');
      expect(error.category).toBe(ErrorCategory.ELIGIBILITY);
      expect(error.retryable).toBe(false);
    });

    it('detects eligibility check failure', () => {
      const error = parseError('eligibility check failed');
      expect(error.category).toBe(ErrorCategory.ELIGIBILITY);
    });
  });

  describe('Wallet errors', () => {
    it('detects Freighter not installed', () => {
      const error = parseError('freighter wallet not installed');
      expect(error.category).toBe(ErrorCategory.WALLET);
      expect(error.userMessage).toContain('connect your wallet');
      expect(error.retryable).toBe(true);
    });

    it('detects user rejected signing', () => {
      const error = parseError('user rejected the transaction');
      expect(error.category).toBe(ErrorCategory.WALLET);
      expect(error.userMessage).toContain('rejected');
      expect(error.retryable).toBe(false);
    });

    it('detects not connected wallet', () => {
      const error = parseError('wallet not connected');
      expect(error.category).toBe(ErrorCategory.WALLET);
    });
  });

  describe('Network errors', () => {
    it('detects timeout error', () => {
      const error = parseError('rpc connection timeout');
      expect(error.category).toBe(ErrorCategory.NETWORK);
      expect(error.userMessage).toContain('Network error');
      expect(error.retryable).toBe(true);
    });

    it('detects simulation failure', () => {
      const error = parseError('transaction simulation failed');
      expect(error.category).toBe(ErrorCategory.NETWORK);
      expect(error.retryable).toBe(true);
    });

    it('detects insufficient fee balance', () => {
      const error = parseError('insufficient balance for fee');
      expect(error.category).toBe(ErrorCategory.NETWORK);
    });
  });

  describe('Contract errors', () => {
    it('detects poll closed error', () => {
      const error = parseError('poll is closed');
      expect(error.category).toBe(ErrorCategory.CONTRACT);
      expect(error.retryable).toBe(false);
    });

    it('detects invalid option error', () => {
      const error = parseError('invalid option index');
      expect(error.category).toBe(ErrorCategory.CONTRACT);
    });
  });

  describe('Unknown errors', () => {
    it('falls back to unknown for unrecognized errors', () => {
      const error = parseError('something completely unexpected occurred');
      expect(error.category).toBe(ErrorCategory.UNKNOWN);
      expect(error.retryable).toBe(true);
    });

    it('handles Error objects', () => {
      const error = parseError(new Error('network timeout error'));
      expect(error.category).toBe(ErrorCategory.NETWORK);
    });

    it('handles null/undefined gracefully', () => {
      const error = parseError(null);
      expect(error.category).toBe(ErrorCategory.UNKNOWN);
    });
  });
});
