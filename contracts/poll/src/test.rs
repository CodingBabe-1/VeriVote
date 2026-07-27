use super::*;
use soroban_sdk::testutils::Address as _;

/// Helper to set up a test environment with Poll + VoterRegistry
fn setup_poll(env: &Env) -> (Address, Address, PollClient, Address, String) {
    let creator = Address::generate(env);
    let voter_registry_id = Address::generate(env);
    let question = String::from_str(env, "What is your favorite color?");
    let mut options = Vec::new(env);
    options.push_back(String::from_str(env, "Red"));
    options.push_back(String::from_str(env, "Blue"));
    options.push_back(String::from_str(env, "Green"));

    let poll_id = env.register(Poll, ());
    let poll_client = PollClient::new(env, &poll_id);
    poll_client.init(&creator, &question, &options, &voter_registry_id);

    (poll_id, creator, poll_client, voter_registry_id, question)
}

#[test]
fn test_initialize_poll() {
    let env = Env::default();
    let (_poll_id, creator, poll_client, voter_registry_id, question) = setup_poll(&env);

    let info = poll_client.poll_info();
    assert_eq!(info.question, question);
    assert_eq!(info.options.len(), 3);
    assert_eq!(info.is_closed, false);
    assert_eq!(info.creator, creator);
    assert_eq!(info.voter_registry, voter_registry_id);
    assert_eq!(info.total_votes, 0);
}

#[test]
fn test_get_question_and_options() {
    let env = Env::default();
    let (_poll_id, _creator, poll_client, _voter_registry_id, question) = setup_poll(&env);

    assert_eq!(poll_client.question(), question);

    let opts = poll_client.opts();
    assert_eq!(opts.len(), 3);
    assert_eq!(opts.get(0).unwrap(), String::from_str(&env, "Red"));
    assert_eq!(opts.get(1).unwrap(), String::from_str(&env, "Blue"));
    assert_eq!(opts.get(2).unwrap(), String::from_str(&env, "Green"));
}

#[test]
fn test_initial_results_empty() {
    let env = Env::default();
    let (_poll_id, _creator, poll_client, _voter_registry_id, _question) = setup_poll(&env);

    let results = poll_client.results();
    assert_eq!(results.len(), 3);
    assert_eq!(results.get(0).unwrap(), 0);
    assert_eq!(results.get(1).unwrap(), 0);
    assert_eq!(results.get(2).unwrap(), 0);
}

#[test]
#[should_panic(expected = "poll already initialized")]
fn test_cannot_initialize_twice() {
    let env = Env::default();
    let creator = Address::generate(&env);
    let voter_registry_id = Address::generate(&env);
    let question = String::from_str(&env, "Q?");
    let mut options = Vec::new(&env);
    options.push_back(String::from_str(&env, "A"));
    options.push_back(String::from_str(&env, "B"));

    let poll_id = env.register(Poll, ());
    let poll_client = PollClient::new(&env, &poll_id);
    poll_client.init(&creator, &question, &options, &voter_registry_id);
    poll_client.init(&creator, &question, &options, &voter_registry_id);
}

#[test]
#[should_panic(expected = "must have at least 2 options")]
fn test_initialize_with_too_few_options() {
    let env = Env::default();
    let creator = Address::generate(&env);
    let voter_registry_id = Address::generate(&env);
    let question = String::from_str(&env, "Q?");
    let mut options = Vec::new(&env);
    options.push_back(String::from_str(&env, "OnlyOne"));

    let poll_id = env.register(Poll, ());
    let poll_client = PollClient::new(&env, &poll_id);
    poll_client.init(&creator, &question, &options, &voter_registry_id);
}

#[test]
fn test_close_poll_by_creator() {
    let env = Env::default();
    let creator = Address::generate(&env);
    let voter_registry_id = Address::generate(&env);
    let question = String::from_str(&env, "Q?");
    let mut options = Vec::new(&env);
    options.push_back(String::from_str(&env, "A"));
    options.push_back(String::from_str(&env, "B"));

    let poll_id = env.register(Poll, ());
    let poll_client = PollClient::new(&env, &poll_id);
    poll_client.init(&creator, &question, &options, &voter_registry_id);

    assert!(!poll_client.poll_info().is_closed);

    env.mock_all_auths();
    poll_client.close(&creator);

    assert!(poll_client.poll_info().is_closed);
}

#[test]
#[should_panic]
fn test_cannot_close_poll_by_non_creator() {
    let env = Env::default();
    let creator = Address::generate(&env);
    let non_creator = Address::generate(&env);
    let voter_registry_id = Address::generate(&env);
    let question = String::from_str(&env, "Q?");
    let mut options = Vec::new(&env);
    options.push_back(String::from_str(&env, "A"));
    options.push_back(String::from_str(&env, "B"));

    let poll_id = env.register(Poll, ());
    let poll_client = PollClient::new(&env, &poll_id);
    poll_client.init(&creator, &question, &options, &voter_registry_id);

    poll_client.close(&non_creator);
}
