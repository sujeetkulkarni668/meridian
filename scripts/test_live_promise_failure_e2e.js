const { connect, keyStores, KeyPair } = require('near-api-js');

async function main() {
  process.loadEnvFile && process.loadEnvFile();
  const parentId = process.env.NEAR_ACCOUNT_ID || 'meridiantest.testnet';
  const privateKey = process.env.NEAR_PRIVATE_KEY;
  if (!privateKey) throw new Error("NEAR_PRIVATE_KEY missing");

  console.log("==================================================================");
  console.log("  MERIDIAN LIVE NEAR TESTNET ADVERSARIAL PROMISE FAILURE AUDIT");
  console.log("==================================================================");

  const keyStore = new keyStores.InMemoryKeyStore();
  const parentKeyPair = KeyPair.fromString(privateKey);
  await keyStore.setKey('testnet', parentId, parentKeyPair);

  const near = await connect({
    networkId: 'testnet',
    nodeUrl: 'https://rpc.testnet.near.org',
    keyStore,
  });
  const parentAccount = await near.account(parentId);

  // Generate subaccount for ephemeral provider
  const subId = `ephem-${Date.now().toString().slice(-6)}.${parentId}`;
  const subKeyPair = KeyPair.fromRandom('ed25519');
  await keyStore.setKey('testnet', subId, subKeyPair);

  console.log(`[Step 1/7] Creating ephemeral subaccount: ${subId}...`);
  await parentAccount.createAccount(
    subId,
    subKeyPair.publicKey,
    '200000000000000000000000' // 0.2 NEAR
  );
  console.log(`           Created ${subId} successfully.`);

  const subAccount = await near.account(subId);

  console.log(`[Step 2/7] Registering ephemeral provider agent...`);
  await subAccount.functionCall({
    contractId: parentId,
    methodName: 'register_agent',
    args: {
      name: 'Ephemeral Adversary Agent',
      role: 'PROVIDER',
      category: 'SECURITY',
      metadata_uri: 'ipfs://bafybeiadversaryephemeral123456789',
    },
    gas: '50000000000000',
    attachedDeposit: '10000000000000000000000', // 0.01 NEAR storage deposit
  });
  console.log(`           Provider agent registered.`);

  console.log(`[Step 3/7] Buyer (${parentId}) creating task with 0.05 NEAR deposit (0.04 escrow)...`);
  const createOutcome = await parentAccount.functionCall({
    contractId: parentId,
    methodName: 'create_task',
    args: {
      title: 'Ephemeral Account Promise Failure Test',
      category: 'SECURITY',
      description_hash: 'c8939c36d22e86338b1ad4d96a7dd7cf66133f920f7895bc27b03b30616b3f90',
      deadline_ms: Date.now() + 86400000,
    },
    gas: '80000000000000',
    attachedDeposit: '50000000000000000000000', // 0.05 NEAR
  });
  const stats = await parentAccount.viewFunction({
    contractId: parentId,
    methodName: 'get_marketplace_stats',
  });
  const taskId = stats.total_tasks;
  console.log(`           Created Task #${taskId} (Tx: ${createOutcome.transaction.hash})`);

  console.log(`[Step 4/7] Awarding Task #${taskId} to ${subId} at 0.04 NEAR...`);
  const awardOutcome = await parentAccount.functionCall({
    contractId: parentId,
    methodName: 'award_task',
    args: {
      task_id: taskId,
      provider_id: subId,
      agreed_price: '40000000000000000000000',
    },
    gas: '80000000000000',
    attachedDeposit: '0',
  });
  console.log(`           Awarded Task #${taskId} (Tx: ${awardOutcome.transaction.hash})`);

  console.log(`[Step 5/7] Provider (${subId}) submitting deliverable...`);
  const submitOutcome = await subAccount.functionCall({
    contractId: parentId,
    methodName: 'submit_deliverable',
    args: {
      task_id: taskId,
      deliverable_hash: 'c8939c36d22e86338b1ad4d96a7dd7cf66133f920f7895bc27b03b30616b3f90',
    },
    gas: '80000000000000',
    attachedDeposit: '0',
  });
  console.log(`           Deliverable submitted (Tx: ${submitOutcome.transaction.hash})`);

  console.log(`[Step 6/7] ADVERSARIAL ACTION: Deleting provider account ${subId} from NEAR Testnet...`);
  const deleteOutcome = await subAccount.deleteAccount(parentId);
  console.log(`           Provider account deleted! (Tx: ${deleteOutcome.transaction.hash})`);

  console.log(`[Step 7/7] Calling approve_and_payout to transfer 0.04 NEAR to the now-deleted provider...`);
  const payoutOutcome = await parentAccount.functionCall({
    contractId: parentId,
    methodName: 'approve_and_payout',
    args: { task_id: taskId },
    gas: '250000000000000', // 250 TGas
    attachedDeposit: '0',
  });
  console.log(`           Approve & Payout Tx Hash: ${payoutOutcome.transaction.hash}`);
  console.log(`           Receipts outcomes count: ${payoutOutcome.receipts_outcome.length}`);

  for (const r of payoutOutcome.receipts_outcome) {
    if (r.outcome.logs && r.outcome.logs.length > 0) {
      console.log(`           [On-Chain Log]:`, r.outcome.logs.join(' | '));
    }
  }

  // Inspect task state after failure callback execution
  console.log("\n==================================================================");
  console.log("  VERIFYING ON-CHAIN CONTRACT STATE AFTER LIVE PROMISE FAILURE");
  console.log("==================================================================");
  const taskAfter = await parentAccount.viewFunction({
    contractId: parentId,
    methodName: 'get_task',
    args: { task_id: taskId },
  });
  console.log(`Task #${taskId} Status:                ${taskAfter.status}`);
  console.log(`Task #${taskId} Escrow Amount:         ${(Number(taskAfter.escrow_amount) / 1e24).toFixed(4)} NEAR`);
  console.log(`Task #${taskId} Unclaimed Surplus:     ${(Number(taskAfter.unclaimed_buyer_refund) / 1e24).toFixed(4)} NEAR`);

  console.log("\n==================================================================");
  console.log("  VERIFYING claim_surplus_refund() SAFETY");
  console.log("==================================================================");
  try {
    await parentAccount.functionCall({
      contractId: parentId,
      methodName: 'claim_surplus_refund',
      args: { task_id: taskId },
      gas: '50000000000000',
      attachedDeposit: '0',
    });
    console.log("FAIL: claim_surplus_refund should have rejected when unclaimed balance is 0!");
  } catch (err) {
    console.log(`PASS: Correctly rejected empty/duplicate claim: ${err.message}`);
  }
}

main().catch(console.error);
