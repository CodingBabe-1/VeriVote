/**
 * @file Contract ABI specification for PollFactory.
 * Used to generate type-safe contract bindings via soroban-cli.
 *
 * Generate bindings with:
 *   soroban contract bindings typescript \
 *     --contract-id <FACTORY_ID> \
 *     --output-dir frontend/src/contracts \
 *     --network testnet
 */
export const FACTORY_SPEC = {
  functions: {
    init: {
      args: [
        'admin: Address',
        'voter_registry: Address',
        'poll_wasm_hash: BytesN<32>',
      ],
      returns: 'void',
    },
    create: {
      args: [
        'creator: Address',
        'question: String',
        'options: Vec<String>',
      ],
      returns: 'Address',
    },
    polls: { args: [], returns: 'Vec<PollEntry>' },
    count: { args: [], returns: 'u32' },
    registry: { args: [], returns: 'Address' },
    set_hash: { args: ['admin: Address', 'new_hash: BytesN<32>'], returns: 'void' },
  },
  events: {
    new_poll: '(poll_address, creator, question)',
  },
  description: 'Factory contract that deploys and registers Poll contracts',
} as const;
