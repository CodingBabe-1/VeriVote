/**
 * Centralized error-mapping layer.
 * Translates raw contract/RPC errors into user-facing messages consistently.
 */

export enum ErrorCategory {
  ELIGIBILITY = 'ELIGIBILITY',
  WALLET = 'WALLET',
  NETWORK = 'NETWORK',
  CONTRACT = 'CONTRACT',
  UNKNOWN = 'UNKNOWN',
}

export interface AppError {
  category: ErrorCategory;
  userMessage: string;
  technicalMessage: string;
  retryable: boolean;
}

/**
 * Parse a raw error from contract invocation or RPC call
 * and return a structured, user-facing error object.
 */
export function parseError(error: unknown): AppError {
  const message = extractErrorMessage(error);
  const lower = message.toLowerCase();

  // Duplicate / ineligible vote errors
  if (
    lower.includes('already voted') ||
    lower.includes('not eligible') ||
    lower.includes('eligible to vote') ||
    lower.includes('eligibility') ||
    lower.includes('voted in this poll')
  ) {
    return {
      category: ErrorCategory.ELIGIBILITY,
      userMessage: "You're not eligible to vote in this poll.",
      technicalMessage: message,
      retryable: false,
    };
  }

  // Wallet / signature errors
  if (
    lower.includes('freighter') ||
    lower.includes('wallet not installed') ||
    lower.includes('user rejected') ||
    lower.includes('signature') ||
    lower.includes('auth') ||
    lower.includes('not connected')
  ) {
    const isRejection = lower.includes('rejected') || lower.includes('declined');
    return {
      category: ErrorCategory.WALLET,
      userMessage: isRejection
        ? 'Transaction was rejected. Please try again.'
        : 'Please connect your wallet (Freighter) to continue.',
      technicalMessage: message,
      retryable: !isRejection,
    };
  }

  // Network / RPC / simulation errors
  if (
    lower.includes('network') ||
    lower.includes('timeout') ||
    lower.includes('rpc') ||
    lower.includes('simulation failed') ||
    lower.includes('insufficient') ||
    lower.includes('fee') ||
    lower.includes('dropped') ||
    lower.includes('connection')
  ) {
    return {
      category: ErrorCategory.NETWORK,
      userMessage: 'Network error — please try again.',
      technicalMessage: message,
      retryable: true,
    };
  }

  // Contract-level errors
  if (
    lower.includes('contract') ||
    lower.includes('panic') ||
    lower.includes('poll is closed') ||
    lower.includes('invalid option') ||
    lower.includes('too many options')
  ) {
    return {
      category: ErrorCategory.CONTRACT,
      userMessage: message,
      technicalMessage: message,
      retryable: false,
    };
  }

  // Unknown fallback
  return {
    category: ErrorCategory.UNKNOWN,
    userMessage: 'An unexpected error occurred. Please try again.',
    technicalMessage: message,
    retryable: true,
  };
}

function extractErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    if (typeof err.message === 'string') return err.message;
    if (typeof err.error === 'string') return err.error;
    if (typeof err.toString === 'function') return (err.toString as () => string)();
  }
  return 'Unknown error';
}
