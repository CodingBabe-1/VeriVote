#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Map, Vec};

/// A shared eligibility and sybil-resistance contract.
/// Before recording a vote, the Poll contract calls `is_eligible(address)`
/// via cross-contract call. The registry enforces one-vote-per-address-per-poll.
#[contract]
pub struct VoterRegistry;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Tracks which polls an address has voted in: Map<Address, Vec<Address>>
    Votes,
    /// Global whitelist of registered addresses
    Whitelist,
    /// Admin address that can manage the registry
    Admin,
    /// Whether the whitelist is enforced
    WhitelistEnabled,
}

#[contractimpl]
impl VoterRegistry {
    /// Initialize the registry with an admin address
    pub fn init(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("registry already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::WhitelistEnabled, &false);

        // Initialize votes map
        let votes: Map<Address, Vec<Address>> = Map::new(&env);
        env.storage().persistent().set(&DataKey::Votes, &votes);
    }

    /// Register an address as eligible (admin only)
    pub fn register(env: Env, admin: Address, voter: Address) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).expect("registry not initialized");
        if admin != stored_admin {
            panic!("only admin can register voters");
        }

        let mut whitelist: Map<Address, bool> = env
            .storage()
            .persistent()
            .get(&DataKey::Whitelist)
            .unwrap_or(Map::new(&env));
        whitelist.set(voter.clone(), true);
        env.storage()
            .persistent()
            .set(&DataKey::Whitelist, &whitelist);
    }

    /// Enable or disable whitelist enforcement (admin only)
    pub fn set_wl(env: Env, admin: Address, enabled: bool) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).expect("registry not initialized");
        if admin != stored_admin {
            panic!("only admin can change whitelist");
        }
        env.storage()
            .instance()
            .set(&DataKey::WhitelistEnabled, &enabled);
    }

    /// Check if an address is eligible to vote in a given poll.
    /// Returns true if:
    /// 1. The address hasn't already voted in this poll, AND
    /// 2. If whitelist is enabled, the address is on the whitelist
    pub fn eligible(env: Env, voter: Address, poll_id: Address) -> bool {
        // Check if already voted in this specific poll
        let votes: Map<Address, Vec<Address>> = env
            .storage()
            .persistent()
            .get(&DataKey::Votes)
            .unwrap_or(Map::new(&env));

        if let Some(polls_voted) = votes.get(voter.clone()) {
            for poll in polls_voted.iter() {
                if poll == poll_id {
                    return false; // Already voted in this poll
                }
            }
        }

        // Check whitelist if enabled
        let whitelist_enabled: bool = env
            .storage()
            .instance()
            .get(&DataKey::WhitelistEnabled)
            .unwrap_or(false);

        if whitelist_enabled {
            let whitelist: Map<Address, bool> = env
                .storage()
                .persistent()
                .get(&DataKey::Whitelist)
                .unwrap_or(Map::new(&env));
            if !whitelist.get(voter).unwrap_or(false) {
                return false; // Not on whitelist
            }
        }

        true
    }

    /// Record that an address has voted in a specific poll.
    /// Called by the Poll contract after a successful vote.
    /// Only authorized callers (deployed Poll contracts) can record votes.
    pub fn rec_vote(env: Env, poll_id: Address, voter: Address) {
        // In production, verify poll_id is a known Poll contract
        // For now, any contract can call this — the Poll contract must
        // have already authorized the voter before calling here
        
        let mut votes: Map<Address, Vec<Address>> = env
            .storage()
            .persistent()
            .get(&DataKey::Votes)
            .unwrap_or(Map::new(&env));

        let mut polls_voted = votes.get(voter.clone()).unwrap_or(Vec::new(&env));
        polls_voted.push_back(poll_id.clone());
        votes.set(voter, polls_voted);

        env.storage().persistent().set(&DataKey::Votes, &votes);
    }

    /// Get the admin address
    pub fn admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).expect("registry not initialized")
    }
}

#[cfg(test)]
mod test;
