#!/usr/bin/env bash
# =============================================================================
# VeriVote Contract Deployment Script
# =============================================================================
# Usage: bash scripts/deploy.sh [network]
#   network: testnet (default) | mainnet | futurenet
#
# Steps:
#  1. Build all contracts with wasm target
#  2. Optimize WASM binaries
#  3. Deploy VoterRegistry
#  4. Deploy Poll contract (upload WASM for factory use)
#  5. Deploy PollFactory (initialized with registry + poll wasm hash)
#  6. Output deployed contract IDs to deployed-contracts.json
# =============================================================================

set -euo pipefail

NETWORK="${1:-testnet}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CONTRACTS_DIR="$PROJECT_DIR/contracts"
OUTPUT_FILE="$PROJECT_DIR/deployed-contracts.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== VeriVote Contract Deployment ===${NC}"
echo -e "Network: ${YELLOW}$NETWORK${NC}"
echo ""

# Source the secret key
if [ -z "${STELLAR_SECRET_KEY:-}" ]; then
    if [ -f "$PROJECT_DIR/.env" ]; then
        source "$PROJECT_DIR/.env"
    fi
fi
if [ -z "${STELLAR_SECRET_KEY:-}" ]; then
    echo -e "${RED}Error: STELLAR_SECRET_KEY not set.${NC}"
    echo "Export it or create a .env file with STELLAR_SECRET_KEY=<your_key>"
    exit 1
fi

# Network RPC URLs
case "$NETWORK" in
    testnet)
        RPC_URL="https://soroban-testnet.stellar.org"
        NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
        ;;
    mainnet)
        RPC_URL="https://soroban.stellar.org"
        NETWORK_PASSPHRASE="Public Global Stellar Network ; September 2015"
        ;;
    futurenet)
        RPC_URL="https://rpc-futurenet.stellar.org"
        NETWORK_PASSPHRASE="Test SDF Future Network ; October 2022"
        ;;
    *)
        echo -e "${RED}Unknown network: $NETWORK${NC}"
        exit 1
        ;;
esac

# Step 1: Build contracts
echo -e "${GREEN}[1/5] Building contracts...${NC}"
cd "$CONTRACTS_DIR"
cargo build --target wasm32v1-none --release

# Step 2: Optimize WASM
echo -e "${GREEN}[2/5] Optimizing WASM binaries...${NC}"
for wasm in target/wasm32v1-none/release/*.wasm; do
    if [ -f "$wasm" ]; then
        soroban contract optimize --wasm "$wasm"
    fi
done

# Step 3: Deploy VoterRegistry
echo -e "${GREEN}[3/5] Deploying VoterRegistry...${NC}"
VOTER_REGISTRY_WASM="$CONTRACTS_DIR/target/wasm32v1-none/release/voter_registry.optimized.wasm"
VOTER_REGISTRY_HASH=$(soroban contract install \
    --wasm "$VOTER_REGISTRY_WASM" \
    --source "$STELLAR_SECRET_KEY" \
    --network "$NETWORK")
VOTER_REGISTRY_ID=$(soroban contract deploy \
    --wasm-hash "$VOTER_REGISTRY_HASH" \
    --source "$STELLAR_SECRET_KEY" \
    --network "$NETWORK")
echo -e "  VoterRegistry ID: ${YELLOW}$VOTER_REGISTRY_ID${NC}"

# Step 4: Deploy Poll contract (upload WASM for factory)
echo -e "${GREEN}[4/5] Uploading Poll contract WASM...${NC}"
POLL_WASM="$CONTRACTS_DIR/target/wasm32v1-none/release/poll.optimized.wasm"
POLL_WASM_HASH=$(soroban contract install \
    --wasm "$POLL_WASM" \
    --source "$STELLAR_SECRET_KEY" \
    --network "$NETWORK")
echo -e "  Poll WASM Hash: ${YELLOW}$POLL_WASM_HASH${NC}"

# Step 5: Deploy PollFactory
echo -e "${GREEN}[5/5] Deploying PollFactory...${NC}"
POLL_FACTORY_WASM="$CONTRACTS_DIR/target/wasm32v1-none/release/poll_factory.optimized.wasm"
POLL_FACTORY_HASH=$(soroban contract install \
    --wasm "$POLL_FACTORY_WASM" \
    --source "$STELLAR_SECRET_KEY" \
    --network "$NETWORK")
POLL_FACTORY_ID=$(soroban contract deploy \
    --wasm-hash "$POLL_FACTORY_HASH" \
    --source "$STELLAR_SECRET_KEY" \
    --network "$NETWORK")

# Initialize the factory (admin is the deployer)
DEPLOYER_ADDRESS=$(soroban keys address "$STELLAR_SECRET_KEY")
soroban contract invoke \
    --id "$POLL_FACTORY_ID" \
    --source "$STELLAR_SECRET_KEY" \
    --network "$NETWORK" \
    -- \
    init \
    --admin "$DEPLOYER_ADDRESS" \
    --voter_registry "$VOTER_REGISTRY_ID" \
    --poll_wasm_hash "$POLL_WASM_HASH"

echo -e "  PollFactory ID: ${YELLOW}$POLL_FACTORY_ID${NC}"

# Output deployed contract IDs
echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"

cat > "$OUTPUT_FILE" <<EOF
{
  "network": "$NETWORK",
  "rpc_url": "$RPC_URL",
  "network_passphrase": "$NETWORK_PASSPHRASE",
  "contracts": {
    "voter_registry": "$VOTER_REGISTRY_ID",
    "poll_wasm_hash": "$POLL_WASM_HASH",
    "poll_factory": "$POLL_FACTORY_ID"
  },
  "deployed_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

echo -e "Contract IDs written to ${YELLOW}$OUTPUT_FILE${NC}"
echo ""
echo -e "${GREEN}Verify on Stellar Expert:${NC}"
echo -e "  VoterRegistry: https://stellar.expert/explorer/testnet/contract/$VOTER_REGISTRY_ID"
echo -e "  PollFactory:   https://stellar.expert/explorer/testnet/contract/$POLL_FACTORY_ID"
