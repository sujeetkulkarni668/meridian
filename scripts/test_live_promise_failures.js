const { connect, keyStores, KeyPair } = require('near-api-js');

async function testLivePromiseFailure() {
  process.loadEnvFile && process.loadEnvFile();
  const accountId = process.env.NEAR_ACCOUNT_ID || 'meridiantest.testnet';
  const privateKey = process.env.NEAR_PRIVATE_KEY;
  if (!privateKey) throw new Error("NEAR_PRIVATE_KEY missing");

  console.log("=== MERIDIAN LIVE NEAR TESTNET PROMISE FAILURE AUDIT ===");
  const keyStore = new keyStores.InMemoryKeyStore();
  const keyPair = KeyPair.fromString(privateKey);
  await keyStore.setKey('testnet', accountId, keyPair);

  const near = await connect({
    networkId: 'testnet',
    nodeUrl: 'https://rpc.testnet.near.org',
    keyStore,
  });
  const account = await near.account(accountId);

  // Non-existent recipient account on Testnet
  const nonExistentProvider = `non-existent-prov-${Date.now()}.testnet`;
  console.log(`[1/5] Using non-existent provider account: ${nonExistentProvider}`);

  // Create task with 0.05 NEAR deposit (0.01 storage + 0.04 escrow)
  console.log(`[2/5] Creating adversarial test task...`);
  const createOutcome = await account.functionCall({
    contractId: accountId,
    methodName: 'create_task',
    args: {
      title: 'Adversarial Promise Failure Verification Task',
      category: 'SECURITY',
      description_hash: '3a7acb4f34535e7d5b1e45ff0ecd829404b4daec81a386f2c3d5a9ec01b1dc6b',
      deadline_ms: Date.now() + 86400000,
    },
    gas: '100000000000000', // 100 TGas
    attachedDeposit: '50000000000000000000000', // 0.05 NEAR
  });
  console.log(`      Create Task Tx Hash: ${createOutcome.transaction.hash}`);

  // Get task ID from execution result or stats
  let taskId;
  if (createOutcome.status && createOutcome.status.SuccessValue) {
    taskId = JSON.parse(Buffer.from(createOutcome.status.SuccessValue, 'base64').toString());
  } else {
    const stats = await account.viewFunction({
      contractId: accountId,
      methodName: 'get_marketplace_stats',
    });
    taskId = stats.total_tasks;
  }
  const task = await account.viewFunction({
    contractId: accountId,
    methodName: 'get_task',
    args: { task_id: taskId },
  });
  console.log(`      Created Task ID: #${taskId}, Initial Escrow: ${(Number(task.escrow_amount) / 1e24).toFixed(4)} NEAR`);

  // Award task to non-existent provider with 0.04 NEAR agreed price
  console.log(`[3/5] Awarding task #${taskId} to ${nonExistentProvider} with 0.04 NEAR agreed price...`);
  const awardOutcome = await account.functionCall({
    contractId: accountId,
    methodName: 'award_task',
    args: {
      task_id: taskId,
      provider_id: nonExistentProvider,
      agreed_price: '40000000000000000000000', // 0.04 NEAR
    },
    gas: '100000000000000',
    attachedDeposit: '0',
  });
  console.log(`      Award Task Tx Hash: ${awardOutcome.transaction.hash}`);

  // Submit deliverable using owner authorization
  console.log(`[4/5] Submitting deliverable for task #${taskId}...`);
  const submitOutcome = await account.functionCall({
    contractId: accountId,
    methodName: 'submit_deliverable',
    args: {
      task_id: taskId,
      deliverable_hash: '3a7acb4f34535e7d5b1e45ff0ecd829404b4daec81a386f2c3d5a9ec01b1dc6b',
    },
    gas: '100000000000000',
    attachedDeposit: '0',
  });
  console.log(`      Submit Deliverable Tx Hash: ${submitOutcome.transaction.hash}`);

  // Approve and payout - NEAR runtime will attempt to transfer 0.04 NEAR to non-existent account
  // This will fail the transfer action, and NEAR callback on_payout_completed will execute!
  console.log(`[5/5] Calling approve_and_payout (Transfer to non-existent account should fail on-chain)...`);
  try {
    const payoutOutcome = await account.functionCall({
      contractId: accountId,
      methodName: 'approve_and_payout',
      args: { task_id: taskId },
      gas: '250000000000000', // 250 TGas to guarantee callback execution
      attachedDeposit: '0',
    });
    console.log(`      Approve and Payout Tx Hash: ${payoutOutcome.transaction.hash}`);
    console.log(`      Receipts Count: ${payoutOutcome.receipts_outcome.length}`);
    for (const r of payoutOutcome.receipts_outcome) {
      if (r.outcome.logs && r.outcome.logs.length > 0) {
        console.log(`      [Receipt Log]:`, r.outcome.logs.join(' | '));
      }
      if (r.outcome.status && r.outcome.status.Failure) {
        console.log(`      [Receipt Failure observed]:`, JSON.stringify(r.outcome.status.Failure));
      }
    }
  } catch (err) {
    console.log(`      Approve & Payout encountered error:`, err.message);
  }

  // Verify task state after failure callback execution
  console.log(`\n=== VERIFYING FINAL TASK STATE AFTER ASYNC CALLBACK ===`);
  const finalTask = await account.viewFunction({
    contractId: accountId,
    methodName: 'get_task',
    args: { task_id: taskId },
  });
  console.log(`Task #${taskId} Status: ${finalTask.status}`);
  console.log(`Task #${taskId} Escrow Amount: ${(Number(finalTask.escrow_amount) / 1e24).toFixed(4)} NEAR`);
  console.log(`Task #${taskId} Unclaimed Buyer Refund: ${(Number(finalTask.unclaimed_buyer_refund) / 1e24).toFixed(4)} NEAR`);

  if (finalTask.status === 'Verified' && Number(finalTask.escrow_amount) > 0) {
    console.log(`>>> SUCCESS: Live promise failure handled correctly! Escrow was restored and status rolled back to Verified.`);
  } else if (finalTask.status === 'Completed') {
    console.log(`>>> NOTE: Task marked Completed, let's verify if non-existent account auto-refunded or transferred.`);
  }

  // Also test claim_surplus_refund with 0 unclaimed (should reject)
  console.log(`\n=== TESTING DOUBLE-CLAIM REJECTION ON claim_surplus_refund ===`);
  try {
    await account.functionCall({
      contractId: accountId,
      methodName: 'claim_surplus_refund',
      args: { task_id: taskId },
      gas: '50000000000000',
      attachedDeposit: '0',
    });
    console.log(`UNEXPECTED: claim_surplus_refund succeeded when no unclaimed funds!`);
  } catch (err) {
    console.log(`>>> PASS: claim_surplus_refund correctly rejected duplicate or empty claim: ${err.message}`);
  }
}

testLivePromiseFailure().catch(console.error);
