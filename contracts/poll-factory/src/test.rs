use super::*;
use soroban_sdk::testutils::Address as _;

#[test]
fn test_initialize_factory() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let voter_registry = Address::generate(&env);
    let poll_wasm_hash = BytesN::from_array(&env, &[1u8; 32]);

    let factory_id = env.register(PollFactory, ());
    let factory_client = PollFactoryClient::new(&env, &factory_id);
    factory_client.init(&admin, &voter_registry, &poll_wasm_hash);

    assert_eq!(factory_client.count(), 0);
    assert_eq!(factory_client.registry(), voter_registry);

    let polls = factory_client.polls();
    assert_eq!(polls.len(), 0);
}

#[test]
#[should_panic(expected = "factory already initialized")]
fn test_cannot_initialize_twice() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let voter_registry = Address::generate(&env);
    let poll_wasm_hash = BytesN::from_array(&env, &[1u8; 32]);

    let factory_id = env.register(PollFactory, ());
    let factory_client = PollFactoryClient::new(&env, &factory_id);
    factory_client.init(&admin, &voter_registry, &poll_wasm_hash);
    factory_client.init(&admin, &voter_registry, &poll_wasm_hash);
}

#[test]
fn test_get_polls_returns_empty_initially() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let voter_registry = Address::generate(&env);
    let poll_wasm_hash = BytesN::from_array(&env, &[1u8; 32]);

    let factory_id = env.register(PollFactory, ());
    let factory_client = PollFactoryClient::new(&env, &factory_id);
    factory_client.init(&admin, &voter_registry, &poll_wasm_hash);

    let polls = factory_client.polls();
    assert_eq!(polls.len(), 0);
}

#[test]
#[should_panic(expected = "must have at least 2 options")]
fn test_create_poll_with_too_few_options() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let voter_registry = Address::generate(&env);
    let poll_wasm_hash = BytesN::from_array(&env, &[1u8; 32]);

    let factory_id = env.register(PollFactory, ());
    let factory_client = PollFactoryClient::new(&env, &factory_id);
    factory_client.init(&admin, &voter_registry, &poll_wasm_hash);

    let question = String::from_str(&env, "Q?");
    let mut options = Vec::new(&env);
    options.push_back(String::from_str(&env, "Only one"));

    env.mock_all_auths();
    factory_client.create(&creator, &question, &options);
}

#[test]
#[should_panic]
fn test_set_hash_requires_admin() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let non_admin = Address::generate(&env);
    let voter_registry = Address::generate(&env);
    let poll_wasm_hash = BytesN::from_array(&env, &[1u8; 32]);
    let new_hash = BytesN::from_array(&env, &[2u8; 32]);

    let factory_id = env.register(PollFactory, ());
    let factory_client = PollFactoryClient::new(&env, &factory_id);
    factory_client.init(&admin, &voter_registry, &poll_wasm_hash);

    // Non-admin tries to update hash — should panic
    factory_client.set_hash(&non_admin, &new_hash);
}
