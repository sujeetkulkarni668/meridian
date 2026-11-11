const fs = require('fs');
const path = require('path');
const { connect, keyStores, KeyPair } = require('near-api-js');

async function deploy() {
  process.loadEnvFile && process.loadEnvFile();
  const accountId = process.env.NEAR_ACCOUNT_ID || 'meridiantest.testnet';
  const privateKey = process.env.NEAR_PRIVATE_KEY;
  if (!privateKey) throw new Error("NEAR_PRIVATE_KEY is missing from environment");
  const wasmPath = path.resolve(__dirname, '../contracts/meridian_core/target/wasm32-unknown-unknown/release/meridian_core.wasm');

  console.log(`[1/5] Loading compiled WASM from: ${wasmPath}`);
  if (!fs.existsSync(wasmPath)) {
    throw new Error(`WASM binary not found at ${wasmPath}. Run contracts/build.ps1 first.`);
  }
  const wasmBinary = fs.readFileSync(wasmPath);
  console.log(`      WASM binary size: ${wasmBinary.length} bytes (${(wasmBinary.length / 1024).toFixed(2)} KB)`);

  console.log(`[2/5] Setting up NEAR Testnet signer: ${accountId}`);
  const keyStore = new keyStores.InMemoryKeyStore();
  const keyPair = KeyPair.fromString(privateKey);
  await keyStore.setKey('testnet', accountId, keyPair);

  const near = await connect({
    networkId: 'testnet',
    nodeUrl: 'https://rpc.testnet.near.org',
    keyStore,
  });

  const account = await near.account(accountId);
  const balance = await account.getAccountBalance();
  console.log(`      Account balance: ${(Number(balance.available) / 1e24).toFixed(4)} NEAR`);

  console.log(`[3/5] Deploying contract code to ${accountId}...`);
  const deployOutcome = await account.deployContract(wasmBinary);
  console.log(`      Deployment Tx Hash: ${deployOutcome.transaction.hash}`);
  console.log(`      Explorer Link: https://testnet.nearblocks.io/txns/${deployOutcome.transaction.hash}`);

  console.log(`[4/5] Initializing contract state via new({ owner_id: "${accountId}" })...`);
  try {
    const initOutcome = await account.functionCall({
      contractId: accountId,
      methodName: 'new',
      args: { owner_id: accountId },
      gas: '30000000000000', // 30 TGas
      attachedDeposit: '0',
    });
    console.log(`      Initialization Tx Hash: ${initOutcome.transaction.hash}`);
  } catch (err) {
    if (err.message && err.message.includes('Contract is already initialized')) {
      console.log(`      Contract state already initialized.`);
    } else {
      console.warn(`      Initialization note: ${err.message}`);
    }
  }

  console.log(`[5/5] Querying deployed contract view methods...`);
  const stats = await account.viewFunction({
    contractId: accountId,
    methodName: 'get_marketplace_stats',
    args: {},
  });
  console.log(`      Marketplace Stats:`, stats);

  const isPaused = await account.viewFunction({
    contractId: accountId,
    methodName: 'is_paused',
    args: {},
  });
  console.log(`      Circuit Breaker is_paused: ${isPaused}`);

  console.log(`\n>>> SMART CONTRACT DEPLOYMENT TO NEAR TESTNET COMPLETE! <<<`);
  console.log(`Contract ID: ${accountId}`);
  console.log(`Owner ID:    ${accountId}`);
  console.log(`Network:     testnet`);
}

deploy().catch(err => {
  console.error('Deployment failed:', err);
  process.exit(1);
});
