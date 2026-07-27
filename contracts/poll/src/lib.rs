#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, IntoVal, Map, String, Vec};

/// Per-poll logic: stores the question, options, vote counts, and voter records.
/// Makes a cross-contract call to VoterRegistry.eligible() on every vote().
#[contract]
pub struct Poll;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Question,
    Options,
    VoteCounts,
    IsClosed,
    Creator,
    VoterRegistry,
    Voters,
}

#[contracttype]
#[derive(Clone)]
pub struct PollInfo {
    pub question: String,
    pub options: Vec<String>,
    pub vote_counts: Vec<u32>,
    pub is_closed: bool,
    pub creator: Address,
    pub voter_registry: Address,
    pub total_votes: u32,
}

#[contractimpl]
impl Poll {
    /// Initialize a new poll
    pub fn init(
        env: Env,
        creator: Address,
        question: String,
        options: Vec<String>,
        voter_registry: Address,
    ) {
        if env.storage().instance().has(&DataKey::Question) {
            panic!("poll already initialized");
        }
        if options.len() < 2 {
            panic!("must have at least 2 options");
        }
        if options.len() > 10 {
            panic!("too many options (max 10)");
        }

        let mut vote_counts = Vec::new(&env);
        for _ in 0..options.len() {
            vote_counts.push_back(0u32);
        }

        let voters: Map<Address, u32> = Map::new(&env);

        env.storage().instance().set(&DataKey::Question, &question);
        env.storage().instance().set(&DataKey::Options, &options);
        env.storage().instance().set(&DataKey::VoteCounts, &vote_counts);
        env.storage().instance().set(&DataKey::IsClosed, &false);
        env.storage().instance().set(&DataKey::Creator, &creator);
        env.storage().instance().set(&DataKey::VoterRegistry, &voter_registry);
        env.storage().instance().set(&DataKey::Voters, &voters);
    }

    /// Cast a vote. Before recording, makes a cross-contract call to
    /// VoterRegistry.eligible(voter, self_address). If the check fails,
    /// the entire transaction fails atomically.
    pub fn vote(env: Env, voter: Address, option_index: u32) {
        voter.require_auth();

        // Check poll is not closed
        let is_closed: bool = env.storage().instance().get(&DataKey::IsClosed).expect("poll not initialized");
        if is_closed {
            panic!("poll is closed");
        }

        // Validate option index
        let options: Vec<String> = env.storage().instance().get(&DataKey::Options).expect("poll not initialized");
        if option_index >= options.len() {
            panic!("invalid option index");
        }

        // Check voter hasn't already voted in this poll (local check)
        let voters: Map<Address, u32> = env.storage().instance().get(&DataKey::Voters).expect("poll not initialized");
        if voters.contains_key(voter.clone()) {
            panic!("you have already voted in this poll");
        }

        // Cross-contract call: check eligibility via VoterRegistry.eligible(voter, poll_id)
        let registry_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::VoterRegistry)
            .expect("poll not initialized");

        // Call VoterRegistry.eligible(voter, poll_address)
        let eligible_val = env.invoke_contract::<bool>(
            &registry_addr,
            &soroban_sdk::symbol_short!("eligible"),
            soroban_sdk::vec![
                &env,
                voter.into_val(&env),
                env.current_contract_address().into_val(&env),
            ],
        );

        if !eligible_val {
            panic!("you are not eligible to vote in this poll");
        }

        // Record the vote locally
        let mut vote_counts: Vec<u32> =
            env.storage().instance().get(&DataKey::VoteCounts).expect("poll not initialized");
        let current = vote_counts.get(option_index).expect("option index out of bounds");
        vote_counts.set(option_index, current + 1);
        env.storage().instance().set(&DataKey::VoteCounts, &vote_counts);

        // Record voter
        let mut voters: Map<Address, u32> = env.storage().instance().get(&DataKey::Voters).expect("poll not initialized");
        voters.set(voter.clone(), option_index);
        env.storage().instance().set(&DataKey::Voters, &voters);

        // Cross-contract call: record vote in VoterRegistry.rec_vote(poll_id, voter)
        env.invoke_contract::<()>(
            &registry_addr,
            &soroban_sdk::symbol_short!("rec_vote"),
            soroban_sdk::vec![
                &env,
                env.current_contract_address().into_val(&env),
                voter.into_val(&env),
            ],
        );

        // Emit event for real-time streaming
        env.events()
            .publish(
                (soroban_sdk::symbol_short!("voted"),),
                (env.current_contract_address(), option_index, voter),
            );

    }

    /// Get poll results (vote counts per option)
    pub fn results(env: Env) -> Vec<u32> {
        env.storage().instance().get(&DataKey::VoteCounts).expect("poll not initialized")
    }

    /// Get the poll question
    pub fn question(env: Env) -> String {
        env.storage().instance().get(&DataKey::Question).expect("poll not initialized")
    }

    /// Get poll options
    pub fn opts(env: Env) -> Vec<String> {
        env.storage().instance().get(&DataKey::Options).expect("poll not initialized")
    }

    /// Close the poll (creator only)
    pub fn close(env: Env, creator: Address) {
        creator.require_auth();
        let stored_creator: Address =
            env.storage().instance().get(&DataKey::Creator).expect("poll not initialized");
        if creator != stored_creator {
            panic!("only the creator can close this poll");
        }

        let is_closed: bool = env.storage().instance().get(&DataKey::IsClosed).expect("poll not initialized");
        if is_closed {
            panic!("poll is already closed");
        }

        env.storage().instance().set(&DataKey::IsClosed, &true);

        // Emit event
        env.events()
            .publish(
                (soroban_sdk::symbol_short!("closed"),),
                (env.current_contract_address(),),
            );
    }

    /// Get full poll info
    pub fn poll_info(env: Env) -> PollInfo {
        let question: String = env.storage().instance().get(&DataKey::Question).expect("poll not initialized");
        let options: Vec<String> = env.storage().instance().get(&DataKey::Options).expect("poll not initialized");
        let vote_counts: Vec<u32> =
            env.storage().instance().get(&DataKey::VoteCounts).expect("poll not initialized");
        let is_closed: bool = env.storage().instance().get(&DataKey::IsClosed).expect("poll not initialized");
        let creator: Address = env.storage().instance().get(&DataKey::Creator).expect("poll not initialized");
        let voter_registry: Address =
            env.storage().instance().get(&DataKey::VoterRegistry).expect("poll not initialized");

        let mut total_votes: u32 = 0;
        for c in vote_counts.iter() {
            total_votes += c;
        }

        PollInfo {
            question,
            options,
            vote_counts,
            is_closed,
            creator,
            voter_registry,
            total_votes,
        }
    }
}

#[cfg(test)]
mod test;
