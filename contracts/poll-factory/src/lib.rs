#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env, IntoVal, String, Vec};

/// Factory contract that deploys and registers new Poll contract instances.
/// Keeps an index of all active/closed polls, and acts as the entry point
/// the frontend queries for "list all polls."
#[contract]
pub struct PollFactory;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Polls,
    PollCount,
    VoterRegistry,
    PollWasmHash,
    Admin,
}

#[contracttype]
#[derive(Clone)]
pub struct PollEntry {
    pub id: Address,
    pub question: String,
    pub creator: Address,
    pub is_closed: bool,
    pub total_votes: u32,
    pub created_at: u64,
}

#[contractimpl]
impl PollFactory {
    /// Initialize the factory with the VoterRegistry contract address and Poll WASM hash.
    pub fn init(env: Env, admin: Address, voter_registry: Address, poll_wasm_hash: BytesN<32>) {
        if env.storage().instance().has(&DataKey::VoterRegistry) {
            panic!("factory already initialized");
        }

        let polls: Vec<PollEntry> = Vec::new(&env);
        env.storage().instance().set(&DataKey::Polls, &polls);
        env.storage().instance().set(&DataKey::PollCount, &0u32);
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::VoterRegistry, &voter_registry);
        env.storage()
            .instance()
            .set(&DataKey::PollWasmHash, &poll_wasm_hash);
    }

    /// Create a new poll by deploying a Poll contract and initializing it.
    /// Returns the Address of the newly deployed Poll contract.
    pub fn create(
        env: Env,
        creator: Address,
        question: String,
        options: Vec<String>,
    ) -> Address {
        creator.require_auth();

        if options.len() < 2 {
            panic!("must have at least 2 options");
        }
        if options.len() > 10 {
            panic!("too many options (max 10)");
        }

        // Get the voter registry address
        let voter_registry: Address = env
            .storage()
            .instance()
            .get(&DataKey::VoterRegistry)
            .expect("factory not initialized");

        // Get the stored Poll WASM hash
        let poll_wasm_hash: BytesN<32> = env
            .storage()
            .instance()
            .get(&DataKey::PollWasmHash)
            .expect("factory not initialized");

        // Generate a unique salt from the poll count
        let poll_count: u32 = env.storage().instance().get(&DataKey::PollCount).expect("factory not initialized");
        let mut salt_bytes = [0u8; 32];
        salt_bytes[28..32].copy_from_slice(&poll_count.to_be_bytes());
        let salt = BytesN::from_array(&env, &salt_bytes);

        // Deploy a new Poll contract instance using deploy_v2
        let poll_address = env
            .deployer()
            .with_current_contract(salt)
            .deploy_v2(poll_wasm_hash, ());

        // Cross-contract call: initialize the poll via Poll.init(creator, question, options, voter_registry)
        env.invoke_contract::<()>(
            &poll_address,
            &soroban_sdk::symbol_short!("init"),
            soroban_sdk::vec![
                &env,
                creator.into_val(&env),
                question.into_val(&env),
                options.into_val(&env),
                voter_registry.into_val(&env),
            ],
        );

        // Register poll in the index
        let mut polls: Vec<PollEntry> = env
            .storage()
            .instance()
            .get(&DataKey::Polls)
            .expect("factory not initialized");
        let mut count: u32 = env.storage().instance().get(&DataKey::PollCount).expect("factory not initialized");

        polls.push_back(PollEntry {
            id: poll_address.clone(),
            question: question.clone(),
            creator: creator.clone(),
            is_closed: false,
            total_votes: 0,
            created_at: env.ledger().timestamp(),
        });
        count += 1;

        env.storage().instance().set(&DataKey::Polls, &polls);
        env.storage().instance().set(&DataKey::PollCount, &count);

        // Emit event
        env.events().publish(
            (soroban_sdk::symbol_short!("new_poll"),),
            (poll_address.clone(), creator, question),
        );

        poll_address
    }

    /// Get all polls
    pub fn polls(env: Env) -> Vec<PollEntry> {
        env.storage().instance().get(&DataKey::Polls).unwrap_or(Vec::new(&env))
    }

    /// Get total number of polls created
    pub fn count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::PollCount)
            .unwrap_or(0)
    }

    /// Get the voter registry address
    pub fn registry(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::VoterRegistry)
            .expect("factory not initialized")
    }

    /// Update the stored Poll WASM hash (for upgrades, admin only)
    pub fn set_hash(env: Env, admin: Address, new_hash: BytesN<32>) {
        admin.require_auth();
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("factory not initialized");
        if admin != stored_admin {
            panic!("only admin can update wasm hash");
        }
        env.storage()
            .instance()
            .set(&DataKey::PollWasmHash, &new_hash);
    }
}

#[cfg(test)]
mod test;
