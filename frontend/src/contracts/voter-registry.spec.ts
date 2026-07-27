/**
 * @file Contract ABI specification for VoterRegistry.
 * Used to generate type-safe contract bindings via soroban-cli.
 * 
 * Generate bindings with:
 *   soroban contract bindings typescript \
 *     --contract-id <VOTER_REGISTRY_ID> \
 *     --output-dir frontend/src/contracts \
 *     --network testnet
 */
export const VOTER_REGISTRY_SPEC = {
  functions: {
    init: { args: ['admin: Address'], returns: 'void' },
    register: { args: ['admin: Address', 'voter: Address'], returns: 'void' },
    set_wl: { args: ['admin: Address', 'enabled: bool'], returns: 'void' },
    eligible: { args: ['voter: Address', 'poll_id: Address'], returns: 'bool' },
    rec_vote: { args: ['poll_id: Address', 'voter: Address'], returns: 'void' },
    admin: { args: [], returns: 'Address' },
  },
  events: {},
  description: 'Shared eligibility and sybil-resistance contract',
} as const;
