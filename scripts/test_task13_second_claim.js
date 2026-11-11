const { connect, keyStores, KeyPair } = require('near-api-js');

async function main() {
  process.loadEnvFile && process.loadEnvFile();
  const parentId = process.env.NEAR_ACCOUNT_ID || 'meridiantest.testnet';
  const privateKey = process.env.NEAR_PRIVATE_KEY;

  const keyStore = new keyStores.InMemoryKeyStore();
  const parentKeyPair = KeyPair.fromString(privateKey);
  await keyStore.setKey('testnet', parentId, parentKeyPair);

  const near = await connect({
    networkId: 'testnet',
    nodeUrl: 'https://test.rpc.fastnear.com',
    keyStore,
  });
  const account = await near.account(parentId);

  const task = await account.viewFunction({
    contractId: parentId,
    methodName: 'get_task',
    args: { task_id: 13 },
  });
  console.log(`Task #13 Escrow Balance: ${task.escrow_amount} yoctoNEAR`);

  try {
    console.log("Calling claim_surplus_refund a second time on Task #13...");
    await account.functionCall({
      contractId: parentId,
      methodName: 'claim_surplus_refund',
      args: { task_id: 13 },
      gas: '50000000000000',
      attachedDeposit: '0',
    });
    console.log("FAIL: Second claim should NOT have succeeded!");
  } catch (err) {
    console.log(">>> PASS: Second claim rejected cleanly with panic:");
    console.log(`    ${err.message}`);
  }
}

main().catch(console.error);
