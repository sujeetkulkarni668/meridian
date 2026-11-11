const { connect, keyStores, KeyPair } = require('near-api-js');

async function testSecondClaim() {
  process.loadEnvFile && process.loadEnvFile();
  const parentId = process.env.NEAR_ACCOUNT_ID || 'meridiantest.testnet';
  const privateKey = process.env.NEAR_PRIVATE_KEY;

  const keyStore = new keyStores.InMemoryKeyStore();
  const parentKeyPair = KeyPair.fromString(privateKey);
  await keyStore.setKey('testnet', parentId, parentKeyPair);

  const near = await connect({
    networkId: 'testnet',
    nodeUrl: 'https://rpc.testnet.near.org',
    keyStore,
  });
  const parentAccount = await near.account(parentId);

  const taskId = 11;
  const task = await parentAccount.viewFunction({
    contractId: parentId,
    methodName: 'get_task',
    args: { task_id: taskId },
  });
  console.log(`Task #11 Escrow balance after first claim: ${task.escrow_amount} yoctoNEAR`);

  try {
    console.log("Calling claim_surplus_refund a SECOND time (should be rejected)...");
    await parentAccount.functionCall({
      contractId: parentId,
      methodName: 'claim_surplus_refund',
      args: { task_id: taskId },
      gas: '50000000000000',
      attachedDeposit: '0',
    });
    console.log("FAIL: Second claim should NOT have succeeded!");
  } catch (err) {
    console.log(">>> PASS: Second claim rejected cleanly with error:");
    console.log(`    ${err.message}`);
  }
}

testSecondClaim().catch(console.error);
