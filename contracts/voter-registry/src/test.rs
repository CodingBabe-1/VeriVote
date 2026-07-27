use super::*;
use soroban_sdk::testutils::Address as _;

#[test]
fn test_initialize() {
    let env = Env::default();
    let admin = Address::generate(&env);

    let contract_id = env.register(VoterRegistry, ());
    let client = VoterRegistryClient::new(&env, &contract_id);
    client.init(&admin);

    let stored_admin = client.admin();
    assert_eq!(stored_admin, admin);
}

#[test]
fn test_register_and_check_eligibility() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let voter = Address::generate(&env);
    let poll_id = Address::generate(&env);

    let contract_id = env.register(VoterRegistry, ());
    let client = VoterRegistryClient::new(&env, &contract_id);

    // Initialize
    client.init(&admin);

    // Register voter and enable whitelist (admin auth required)
    env.mock_all_auths();
    client.register(&admin, &voter);
    client.set_wl(&admin, &true);

    // Voter should be eligible
    assert!(client.eligible(&voter, &poll_id));
}

#[test]
fn test_ineligible_without_whitelist() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let voter = Address::generate(&env);
    let poll_id = Address::generate(&env);

    let contract_id = env.register(VoterRegistry, ());
    let client = VoterRegistryClient::new(&env, &contract_id);

    client.init(&admin);
    env.mock_all_auths();
    client.set_wl(&admin, &true);

    // Voter is NOT on whitelist -> should be ineligible
    assert!(!client.eligible(&voter, &poll_id));
}

#[test]
fn test_double_vote_prevention() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let voter = Address::generate(&env);
    let poll_id = Address::generate(&env);

    let contract_id = env.register(VoterRegistry, ());
    let client = VoterRegistryClient::new(&env, &contract_id);

    client.init(&admin);
    env.mock_all_auths();
    client.register(&admin, &voter);
    client.set_wl(&admin, &true);

    // First check: eligible
    assert!(client.eligible(&voter, &poll_id));

    // Record vote: rec_vote(poll_id, voter)
    client.rec_vote(&poll_id, &voter);

    // Second check: NOT eligible (already voted)
    assert!(!client.eligible(&voter, &poll_id));
}

#[test]
fn test_eligibility_without_whitelist() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let voter = Address::generate(&env);
    let poll_id = Address::generate(&env);

    let contract_id = env.register(VoterRegistry, ());
    let client = VoterRegistryClient::new(&env, &contract_id);

    client.init(&admin);
    // Whitelist is disabled by default -> everyone is eligible until they vote

    assert!(client.eligible(&voter, &poll_id));

    // rec_vote with (poll_id, voter) signature
    client.rec_vote(&poll_id, &voter);

    assert!(!client.eligible(&voter, &poll_id));
}
