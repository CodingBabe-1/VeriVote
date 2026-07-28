/**
 * Soroban contract interaction layer.
 * Type-safe bindings for PollFactory, Poll, and VoterRegistry contracts.
 * Uses @stellar/stellar-sdk for Soroban RPC communication, Contract
 * initialization, TransactionBuilder, and XDR SCVal encoding/decoding.
 */
import {
  SorobanRpc,
  Contract,
  TransactionBuilder,
  Address,
  xdr,
  scValToNative,
  nativeToScVal,
  Networks,
  BASE_FEE,
} from '@stellar/stellar-sdk';
import { parseError } from './errors';

const RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ||
  'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE || Networks.TESTNET;
const FACTORY_ID = process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ID || '';

/** SorobanRpc.Server — single instance for all RPC communication */
const server = new SorobanRpc.Server(RPC_URL);

/**
 * A funded Testnet account used as the source for read-only simulations.
 * This is the well-known Friendbot-funded testnet account.
 */
const READ_SOURCE_PK =
  'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNM5QV';

// ─── Public types ───────────────────────────────────────────────────────────

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

// ─── Contract instances (reusable) ──────────────────────────────────────────

function getContract(contractId: string): Contract {
  return new Contract(contractId);
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Create a new poll via the PollFactory contract.
 * Builds the transaction, simulates it, and returns the XDR for Freighter signing.
 * After signing and submitting, the returned pollAddress points to the new Poll contract.
 */
export async function createPoll(
  creator: string,
  question: string,
  options: string[]
): Promise<{ txHash: string; txXdr: string; pollAddress: string }> {
  try {
    if (!creator) {
      throw new Error('Wallet not connected');
    }
    if (!question.trim()) {
      throw new Error('Question is required');
    }
    if (options.length < 2) {
      throw new Error('At least 2 options required');
    }
    if (options.length > 10) {
      throw new Error('Maximum 10 options allowed');
    }

    return await buildAndSimulateCreateTx(creator, question.trim(), options);
  } catch (error) {
    throw parseError(error);
  }
}

/**
 * Fetch all polls from the factory contract via SorobanRpc.Server.simulateTransaction.
 * Uses a Contract instance to build the invocation operation, then decodes the
 * return value with scValToNative.
 */
export async function fetchPolls(): Promise<PollEntry[]> {
  try {
    const retval = await simulateReadCall(FACTORY_ID, 'polls', []);
    const decoded = scValToNative(retval);
    return parsePollsArray(decoded);
  } catch (error) {
    throw parseError(error);
  }
}

/**
 * Get detailed info for a specific poll via SorobanRpc.Server.simulateTransaction.
 */
export async function fetchPollInfo(pollId: string): Promise<PollInfo> {
  try {
    const retval = await simulateReadCall(pollId, 'poll_info', []);
    const decoded = scValToNative(retval);
    return parsePollInfoMap(decoded);
  } catch (error) {
    throw parseError(error);
  }
}

/**
 * Cast a vote on a poll.  Builds a proper Soroban transaction with
 * TransactionBuilder, simulates it via the RPC server, then returns the
 * assembled transaction XDR so Freighter can sign and submit it.
 */
export async function castVote(
  pollId: string,
  optionIndex: number,
  signerPublicKey: string
): Promise<{ txHash: string; txXdr: string }> {
  try {
    if (!signerPublicKey) {
      throw new Error('Wallet not connected');
    }

    return await buildAndSimulateVoteTx(pollId, optionIndex, signerPublicKey);
  } catch (error) {
    throw parseError(error);
  }
}

/**
 * Subscribe to real-time events from ALL known Poll contracts AND the Factory.
 * Uses SorobanRpc.Server.getEvents (proper SDK method) instead of raw fetch.
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
          const retval = await simulateReadCall(FACTORY_ID, 'polls', []);
          const decoded = scValToNative(retval);
          const polls = parsePollsArray(decoded);
          pollIds = polls.map((p) => p.id);
        } catch {
          // Factory may not be deployed yet; continue
        }

        // 2. Build list of contracts to watch: factory + all polls
        const contractsToWatch = [FACTORY_ID, ...pollIds].filter(Boolean);

        // 3. Fetch events for all watched contracts via SorobanRpc.Server.getEvents
        for (const contractId of contractsToWatch) {
          try {
            const eventsResponse = await server.getEvents({
              startLedger: 0,
              filters: [
                {
                  type: 'contract',
                  contractIds: [contractId],
                  topics: [['*']],
                },
              ],
              limit: 50,
            });

            const events = eventsResponse.events || [];
            for (const event of events) {
              const activity = parseEventToActivity(event, contractId);
              if (activity) onEvent(activity);
            }
          } catch {
            // Individual contract fetch failure; skip and continue
          }
        }
      } catch (error) {
        onError(
          error instanceof Error ? error : new Error('Event stream error')
        );
      }

      // Poll every 5 seconds
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  };

  pollEvents();

  return () => {
    polling = false;
  };
}

/**
 * Submit a signed transaction XDR to the network.
 * Call this after Freighter has signed the transaction.
 * Converts the XDR string back into a Transaction for sendTransaction.
 */
export async function submitSignedTransaction(
  signedTxXdr: string
): Promise<string> {
  // Convert XDR string back to a Transaction using the SDK's static method
  const tx = TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);

  const response = await server.sendTransaction(tx);

  if (response.status === 'ERROR') {
    const errDetail = response.errorResult
      ? response.errorResult.toXDR('base64')
      : 'unknown error';
    throw new Error(`Transaction submission failed: ${errDetail}`);
  }

  return response.hash;
}

// ─── RPC helpers ────────────────────────────────────────────────────────────

/**
 * Simulate a read-only contract call.
 * Builds a minimal TransactionBuilder transaction, simulates it via the RPC
 * server, and returns the SCVal retval.
 */
async function simulateReadCall(
  contractId: string,
  method: string,
  args: unknown[]
): Promise<xdr.ScVal> {
  const contract = getContract(contractId);

  // Convert native JS args to ScVal
  const scValArgs = args.map((a) => nativeToScVal(a));

  // Get the latest account state of our read-source
  const sourceAccount = await server.getAccount(READ_SOURCE_PK);

  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...scValArgs))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);

  if (SorobanRpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed: ${sim.error}`);
  }

  // On success, sim.result.retval is the SCVal return value
  const success = sim as SorobanRpc.Api.SimulateTransactionSuccessResponse;
  if (!success.result) {
    throw new Error('Simulation returned no result');
  }

  return success.result.retval;
}

/**
 * Build and simulate a create-poll transaction.
 * Calls PollFactory.create(creator, question, options).
 */
async function buildAndSimulateCreateTx(
  creator: string,
  question: string,
  options: string[]
): Promise<{ txHash: string; txXdr: string; pollAddress: string }> {
  const contract = getContract(FACTORY_ID);

  const creatorScVal = new Address(creator).toScVal();
  const questionScVal = nativeToScVal(question);
  const optionsScVal = nativeToScVal(options);

  const sourceAccount = await server.getAccount(creator);

  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call('create', creatorScVal, questionScVal, optionsScVal)
    )
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);

  if (SorobanRpc.Api.isSimulationError(sim)) {
    throw new Error(`Create poll simulation failed: ${sim.error}`);
  }

  const success = sim as SorobanRpc.Api.SimulateTransactionSuccessResponse;
  let pollAddress = '';
  if (success.result?.retval) {
    const decoded = scValToNative(success.result.retval);
    pollAddress =
      decoded && typeof decoded === 'object'
        ? String(
            (decoded as { toString?: () => string }).toString?.() ?? ''
          )
        : String(decoded ?? '');
  }

  const txXdr = tx.toXDR();
  const txHash = tx.hash().toString('hex');

  return { txHash, txXdr, pollAddress };
}

/**
 * Build and simulate a write (vote) transaction.
 * Returns both the transaction XDR (for Freighter signing) and a placeholder
 * hash until the transaction is actually submitted.
 */
async function buildAndSimulateVoteTx(
  pollId: string,
  optionIndex: number,
  signerPublicKey: string
): Promise<{ txHash: string; txXdr: string }> {
  const contract = getContract(pollId);

  // Build SCVal args: voter (Address) and option_index (u32)
  const voterScVal = new Address(signerPublicKey).toScVal();
  const optionScVal = nativeToScVal(optionIndex, { type: 'u32' });

  // Get signer's account from network
  const sourceAccount = await server.getAccount(signerPublicKey);

  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('vote', voterScVal, optionScVal))
    .setTimeout(30)
    .build();

  // Simulate to get the footprint and validate the call
  const sim = await server.simulateTransaction(tx);

  if (SorobanRpc.Api.isSimulationError(sim)) {
    throw new Error(`Vote simulation failed: ${sim.error}`);
  }

  // Return the transaction XDR so Freighter can sign it
  const txXdr = tx.toXDR();
  const txHash = tx.hash().toString('hex');

  return { txHash, txXdr };
}

// ─── SCVal → native decoders ───────────────────────────────────────────────

/**
 * Parse an SCVal-decoded polls result (an array of PollEntry maps).
 */
function parsePollsArray(decoded: unknown): PollEntry[] {
  if (!Array.isArray(decoded)) return [];

  return decoded.map((entry: Record<string, unknown>) => ({
    id:
      entry.id && typeof entry.id === 'object'
        ? String((entry.id as { toString?: () => string }).toString?.() ?? '')
        : String(entry.id ?? ''),
    question: String(entry.question ?? ''),
    creator:
      entry.creator && typeof entry.creator === 'object'
        ? String(
            (entry.creator as { toString?: () => string }).toString?.() ?? ''
          )
        : String(entry.creator ?? ''),
    is_closed: Boolean(entry.is_closed),
    total_votes: Number(entry.total_votes ?? 0),
    created_at: Number(entry.created_at ?? 0),
  }));
}

/**
 * Parse an SCVal-decoded PollInfo struct (returned as a map/object).
 */
function parsePollInfoMap(decoded: unknown): PollInfo {
  const d = decoded as Record<string, unknown>;

  if (!d || typeof d !== 'object') {
    throw new Error('Invalid poll info response');
  }

  return {
    question: String(d.question ?? ''),
    options: Array.isArray(d.options) ? d.options.map(String) : [],
    vote_counts: Array.isArray(d.vote_counts)
      ? d.vote_counts.map(Number)
      : [],
    is_closed: Boolean(d.is_closed),
    creator: String(
      d.creator && typeof d.creator === 'object'
        ? (d.creator as { toString?: () => string }).toString?.() ?? ''
        : d.creator ?? ''
    ),
    voter_registry: String(
      d.voter_registry && typeof d.voter_registry === 'object'
        ? (
            d.voter_registry as { toString?: () => string }
          ).toString?.() ?? ''
        : d.voter_registry ?? ''
    ),
    total_votes: Number(d.total_votes ?? 0),
  };
}

// ─── Event parsing ──────────────────────────────────────────────────────────

function parseEventToActivity(
  event: SorobanRpc.Api.EventResponse,
  contractId: string
): ActivityEntry | null {
  // Extract the first topic (event name symbol) as type indicator
  const topics = event.topic || [];
  if (topics.length === 0) return null;

  const firstTopic = topics[0];
  let typeStr = '';

  // Topics from getEvents are xdr.ScVal objects; decode via scValToNative
  try {
    const decoded = scValToNative(firstTopic as xdr.ScVal);
    typeStr = String(decoded ?? '');
  } catch {
    return null;
  }

  switch (typeStr) {
    case 'voted':
      return {
        type: 'vote',
        pollId: contractId,
        message: 'A vote was cast',
        timestamp: Date.now(),
      };
    case 'new_poll':
      return {
        type: 'poll_created',
        pollId: contractId,
        message: 'New poll created',
        timestamp: Date.now(),
      };
    case 'closed':
      return {
        type: 'poll_closed',
        pollId: contractId,
        message: 'A poll was closed',
        timestamp: Date.now(),
      };
    default:
      return null;
  }
}
