const { connect, keyStores, KeyPair, utils } = require('near-api-js');

async function main() {
  process.loadEnvFile && process.loadEnvFile();
  const accountId = process.env.NEAR_ACCOUNT_ID || 'meridiantest.testnet';
  const privateKey = process.env.NEAR_PRIVATE_KEY;
  if (!privateKey) throw new Error("NEAR_PRIVATE_KEY missing from environment");

  console.log(`Connecting to NEAR Testnet as contract owner: ${accountId}...`);
  const keyStore = new keyStores.InMemoryKeyStore();
  await keyStore.setKey('testnet', accountId, KeyPair.fromString(privateKey));

  const near = await connect({
    networkId: 'testnet',
    nodeUrl: 'https://rpc.testnet.near.org',
    keyStore,
  });

  const account = await near.account(accountId);
  const deposit = utils.format.parseNearAmount('0.02'); // 0.02 NEAR (covers 0.01 NEAR storage deposit + refund)

  console.log(`[1/3] Registering Sentinel Security Guard agent on-chain...`);
  try {
    const regOutcome = await account.functionCall({
      contractId: accountId,
      methodName: 'register_agent',
      args: {
        name: 'Sentinel Security Guard',
        role: 'PROVIDER',
        category: 'SECURITY_AUDIT',
        metadata_uri: 'ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      },
      gas: '30000000000000',
      attachedDeposit: deposit,
    });
    console.log(`      Registered Sentinel Security! Tx: ${regOutcome.transaction.hash}`);
  } catch (err) {
    console.warn(`      Registration note: ${err.message}`);
  }

  console.log(`[2/3] Querying on-chain agents list...`);
  const agents = await account.viewFunction({
    contractId: accountId,
    methodName: 'list_agents',
    args: { from_index: 0, limit: 10 },
  });
  console.log(`      On-chain Agents:`, agents);

  console.log(`[3/3] Creating initial on-chain Task #1 with 0.1 NEAR escrow...`);
  try {
    const taskDeposit = utils.format.parseNearAmount('0.11'); // 0.1 NEAR escrow + 0.01 NEAR storage
    const taskOutcome = await account.functionCall({
      contractId: accountId,
      methodName: 'create_task',
      args: {
        title: 'Rust Smart Contract AST Security Audit',
        category: 'SECURITY_AUDIT',
        description_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        deadline_ms: Date.now() + 86400000 * 7, // 7 days in future
      },
      gas: '30000000000000',
      attachedDeposit: taskDeposit,
    });
    console.log(`      Created Task #1! Tx: ${taskOutcome.transaction.hash}`);
  } catch (err) {
    console.warn(`      Task creation note: ${err.message}`);
  }

  const tasks = await account.viewFunction({
    contractId: accountId,
    methodName: 'list_tasks',
    args: { from_index: 0, limit: 10 },
  });
  console.log(`      On-chain Tasks:`, tasks);

  const stats = await account.viewFunction({
    contractId: accountId,
    methodName: 'get_marketplace_stats',
    args: {},
  });
  console.log(`\nFinal On-Chain State Stats:`, stats);
}

main().catch(console.error);
