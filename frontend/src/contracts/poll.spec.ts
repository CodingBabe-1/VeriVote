/**
 * @file Contract ABI specification for Poll contract.
 * Used to generate type-safe contract bindings via soroban-cli.
 *
 * Generate bindings with:
 *   soroban contract bindings typescript \
 *     --contract-id <POLL_ID> \
 *     --output-dir frontend/src/contracts \
 *     --network testnet
 */
export const POLL_SPEC = {
  functions: {
    init: {
      args: [
        'creator: Address',
        'question: String',
        'options: Vec<String>',
        'voter_registry: Address',
      ],
      returns: 'void',
    },
    vote: { args: ['voter: Address', 'option_index: u32'], returns: 'void' },
    results: { args: [], returns: 'Vec<u32>' },
    question: { args: [], returns: 'String' },
    opts: { args: [], returns: 'Vec<String>' },
    close: { args: ['creator: Address'], returns: 'void' },
    poll_info: {
      args: [],
      returns: 'PollInfo { question, options, vote_counts, is_closed, creator, voter_registry, total_votes }',
    },
  },
  events: {
    voted: '(poll_address, option_index, voter)',
    closed: '(poll_address)',
  },
  description: 'Per-poll voting logic contract',
} as const;
