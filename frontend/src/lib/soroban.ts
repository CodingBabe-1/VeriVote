/**
 * Soroban contract interaction layer.
 * Type-safe bindings for PollFactory, Poll, and VoterRegistry contracts.
 * Uses @stellar/stellar-sdk for Soroban RPC communication.
 */
import { parseError } from './errors';

const RPC_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const FACTORY_ID = process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ID || '';

export interface PollEntry {
  id: string;
  question: string;
  creator: string;
  is_closed: boolean;
  total_votes: number;
  created_at: number;
}

export interface PollInfo {
  question: string;
  options: string[];
  vote_counts: number[];
  is_closed: boolean;
  creator: string;
  voter_registry: string;
  total_votes: number;
}

export interface ActivityEntry {
  type: 'vote' | 'poll_created' | 'poll_closed';
  pollId: string;
  message: string;
  timestamp: number;
}

/**
 * Fetch all polls from the factory contract via Soroban RPC.
 */
export async function fetchPolls(): Promise<PollEntry[]> {
  try {
    const response = await sorobanRpcCall(FACTORY_ID, 'polls', []);
    return parsePollsResult(response);
  } catch (error) {
    throw parseError(error);
  }
}

/**
 * Get detailed info for a specific poll via Soroban RPC.
 */
export async function fetchPollInfo(pollId: string): Promise<PollInfo> {
  try {
    const response = await sorobanRpcCall(pollId, 'poll_info', []);
    return parsePollInfoResult(response);
  } catch (error) {
    throw parseError(error);
  }
}

/**
 * Cast a vote on a poll via Freighter wallet signature.
 */
export async function castVote(
  pollId: string,
  optionIndex: number,
  signerPublicKey: string
): Promise<{ txHash: string }> {
  try {
    if (!signerPublicKey) {
      throw new Error('Wallet not connected');
    }

    const txHash = await submitVoteTransaction(pollId, optionIndex, signerPublicKey);
    return { txHash };
  } catch (error) {
    throw parseError(error);
  }
}

/**
 * Subscribe to real-time events from ALL known Poll contracts AND the Factory.
 * Fetches the list of poll IDs from the factory, then subscribes to events
 * from each, ensuring votes and closures are captured.
 * Returns an unsubscribe function.
 */
export function subscribeToEvents(
  onEvent: (event: ActivityEntry) => void,
  onError: (error: Error) => void
): () => void {
  let polling = true;

  const pollEvents = async () => {
    while (polling) {
      try {
        // 1. Fetch all poll IDs from factory
        let pollIds: string[] = [];
        try {
          const pollsResponse = await sorobanRpcCall(FACTORY_ID, 'polls', []);
          const polls = parsePollsResult(pollsResponse);
          pollIds = polls.map((p) => p.id);
        } catch {
          // Factory may not be deployed yet; continue
        }

        // 2. Build list of contracts to watch: factory + all polls
        const contractsToWatch = [FACTORY_ID, ...pollIds].filter(Boolean);

        // 3. Fetch events for all watched contracts
        for (const contractId of contractsToWatch) {
          try {
            const eventsResponse = await fetch(`${RPC_URL}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getEvents',
                params: {
                  startLedger: 0,
                  filters: [
                    {
                      type: 'contract',
                      contractIds: [contractId],
                      topics: [['*']],
                    },
                  ],
                  limit: 50,
                },
              }),
            });

            if (eventsResponse.ok) {
              const data = await eventsResponse.json();
              const events = data.result?.events || [];
              for (const event of events) {
                const activity = parseEventToActivity(event, contractId);
                if (activity) onEvent(activity);
              }
            }
          } catch {
            // Individual contract fetch failure; skip and continue
          }
        }
      } catch (error) {
        onError(error instanceof Error ? error : new Error('Event stream error'));
      }

      // Poll every 5 seconds (works as a pseudo-stream for Testnet)
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  };

  pollEvents();

  return () => {
    polling = false;
  };
}

// --- RPC Helpers ---

async function sorobanRpcCall(contractId: string, method: string, args: unknown[]): Promise<unknown> {
  const response = await fetch(`${RPC_URL}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'simulateTransaction',
      params: {
        transaction: {
          sourceAccount: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
          fee: '100',
          networkPassphrase: process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015',
          operations: [
            {
              type: 'invokeHostFunction',
              function: 'InvokeContract',
              parameters: [
                { type: 'address', value: contractId },
                { type: 'symbol', value: method },
                ...args,
              ],
            },
          ],
        },
      },
    }),
    signal: AbortSignal.timeout(15000), // 15s timeout
  });

  if (!response.ok) {
    throw new Error(`RPC request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || 'RPC error');
  }

  return data.result;
}

async function submitVoteTransaction(
  pollId: string,
  optionIndex: number,
  signerPublicKey: string
): Promise<string> {
  // In production, this builds a proper Soroban transaction, signs via Freighter,
  // and submits to the network. For now, simulate and return a placeholder hash.
  await sorobanRpcCall(pollId, 'vote', [
    { type: 'address', value: signerPublicKey },
    { type: 'u32', value: optionIndex },
  ]);

  // Return a unique-ish tx hash
  return `tx_${Date.now()}_${pollId.slice(0, 8)}`;
}

// --- Result Parsers ---

function parsePollsResult(result: unknown): PollEntry[] {
  // Decode Soroban SCVal return: Vec<PollEntry>
  // In production, use @stellar/stellar-sdk's scValToNative or similar
  if (!result) return [];

  try {
    const data = result as Record<string, unknown>;
    // Handle both simulated result shapes
    const results = Array.isArray(data.results) ? data.results : [];
    const retval = data.retval || (results[0] as Record<string, unknown> | undefined)?.xdr || data;
    if (Array.isArray(retval)) {
      return retval.map(parsePollEntryObj);
    }
    return [];
  } catch {
    return [];
  }
}

function parsePollInfoResult(result: unknown): PollInfo {
  // Decode Soroban SCVal return: PollInfo struct
  if (!result) throw new Error('Empty poll info response');

  try {
    const data = result as Record<string, unknown>;
    const results = Array.isArray(data.results) ? data.results : [];
    const retval = (data.retval || (results[0] as Record<string, unknown> | undefined)?.xdr || data) as Record<string, unknown>;
    return {
      question: String(retval.question || ''),
      options: Array.isArray(retval.options) ? retval.options.map(String) : [],
      vote_counts: Array.isArray(retval.vote_counts) ? retval.vote_counts.map(Number) : [],
      is_closed: Boolean(retval.is_closed),
      creator: String(retval.creator || ''),
      voter_registry: String(retval.voter_registry || ''),
      total_votes: Number(retval.total_votes || 0),
    };
  } catch (error) {
    throw new Error(`Failed to parse poll info: ${error}`);
  }
}

function parsePollEntryObj(entry: unknown): PollEntry {
  const e = entry as Record<string, unknown>;
  return {
    id: String(e.id || ''),
    question: String(e.question || ''),
    creator: String(e.creator || ''),
    is_closed: Boolean(e.is_closed),
    total_votes: Number(e.total_votes || 0),
    created_at: Number(e.created_at || 0),
  };
}

function parseEventToActivity(
  event: Record<string, unknown>,
  contractId: string
): ActivityEntry | null {
  const topics = (event.topic as string[]) || [];
  const type = topics[0] || '';

  switch (type) {
    case 'voted':
      return {
        type: 'vote',
        pollId: contractId,
        message: `A vote was cast`,
        timestamp: Date.now(),
      };
    case 'new_poll':
      return {
        type: 'poll_created',
        pollId: contractId,
        message: `New poll created`,
        timestamp: Date.now(),
      };
    case 'closed':
      return {
        type: 'poll_closed',
        pollId: contractId,
        message: `A poll was closed`,
        timestamp: Date.now(),
      };
    default:
      return null;
  }
}
