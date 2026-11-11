const { connect, keyStores, KeyPair } = require('near-api-js');

async function main() {
  process.loadEnvFile && process.loadEnvFile();
  const parentId = process.env.NEAR_ACCOUNT_ID || 'meridiantest.testnet';
  const privateKey = process.env.NEAR_PRIVATE_KEY;
  if (!privateKey) throw new Error("NEAR_PRIVATE_KEY missing from environment");

  console.log("==========================================================================");
  console.log("  MERIDIAN LIVE NEAR TESTNET: SURPLUS REFUND FAILURE AUDIT");
  console.log("==========================================================================");

  const keyStore = new keyStores.InMemoryKeyStore();
  const parentKeyPair = KeyPair.fromString(privateKey);
  await keyStore.setKey('testnet', parentId, parentKeyPair);

  const near = await connect({
    networkId: 'testnet',
    nodeUrl: 'https://rpc.testnet.near.org',
    keyStore,
  });
  const parentAccount = await near.account(parentId);

  // Ephemeral Buyer Account
  const buyerId = `ebuyer-${Date.now().toString().slice(-6)}.${parentId}`;
  const buyerKeyPair = KeyPair.fromRandom('ed25519');
  await keyStore.setKey('testnet', buyerId, buyerKeyPair);

  console.log(`[Step 1/8] Creating ephemeral buyer subaccount: ${buyerId}...`);
  await parentAccount.createAccount(
    buyerId,
    buyerKeyPair.publicKey,
    '350000000000000000000000' // 0.35 NEAR to cover account storage + task deposit
  );
  console.log(`           Created ${buyerId} successfully.`);

  const buyerAccount = await near.account(buyerId);

  // Escrow = 0.05 NEAR (Deposit = 0.06 NEAR: 0.01 storage + 0.05 escrow)
  // Agreed price = 0.02 NEAR.
  // Surplus refund = 0.03 NEAR!
  console.log(`[Step 2/8] Ephemeral buyer creating task with 0.05 NEAR escrow (0.06 deposit)...`);
  const createOutcome = await buyerAccount.functionCall({
    contractId: parentId,
    methodName: 'create_task',
    args: {
      title: 'Surplus Refund Failure & Recovery Test',
      category: 'AUDIT',
      description_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      deadline_ms: Date.now() + 86400000,
    },
    gas: '100000000000000', // 100 TGas
    attachedDeposit: '60000000000000000000000', // 0.06 NEAR
  });
  const stats = await parentAccount.viewFunction({
    contractId: parentId,
    methodName: 'get_marketplace_stats',
  });
  const taskId = stats.total_tasks;
  console.log(`           Created Task #${taskId} (Tx: ${createOutcome.transaction.hash})`);

  console.log(`[Step 3/8] Awarding Task #${taskId} to provider ${parentId} at 0.02 NEAR...`);
  const awardOutcome = await buyerAccount.functionCall({
    contractId: parentId,
    methodName: 'award_task',
    args: {
      task_id: taskId,
      provider_id: parentId,
      agreed_price: '20000000000000000000000', // 0.02 NEAR
    },
    gas: '100000000000000',
    attachedDeposit: '0',
  });
  console.log(`           Awarded Task #${taskId} (Tx: ${awardOutcome.transaction.hash})`);

  console.log(`[Step 4/8] Provider submitting deliverable...`);
  const submitOutcome = await parentAccount.functionCall({
    contractId: parentId,
    methodName: 'submit_deliverable',
    args: {
      task_id: taskId,
      deliverable_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    },
    gas: '100000000000000',
    attachedDeposit: '0',
  });
  console.log(`           Deliverable submitted (Tx: ${submitOutcome.transaction.hash})`);

  console.log(`[Step 5/8] ADVERSARIAL ACTION: Deleting buyer account ${buyerId} prior to payout...`);
  const deleteOutcome = await buyerAccount.deleteAccount(parentId);
  console.log(`           Buyer account ${buyerId} deleted! (Tx: ${deleteOutcome.transaction.hash})`);

  const providerBalBefore = await parentAccount.getAccountBalance();

  console.log(`[Step 6/8] Executing approve_and_payout (Provider payout succeeds, Surplus refund fails)...`);
  const payoutOutcome = await parentAccount.functionCall({
    contractId: parentId,
    methodName: 'approve_and_payout',
    args: { task_id: taskId },
    gas: '200000000000000', // Testing exact 200 TGas frontend configuration
    attachedDeposit: '0',
  });
  console.log(`           Approve & Payout Tx Hash: ${payoutOutcome.transaction.hash}`);

  for (const r of payoutOutcome.receipts_outcome) {
    if (r.outcome.logs && r.outcome.logs.length > 0) {
      console.log(`           [On-Chain Log]:`, r.outcome.logs.join(' | '));
    }
  }

  const providerBalAfter = await parentAccount.getAccountBalance();
  const providerDelta = (BigInt(providerBalAfter.total) - BigInt(providerBalBefore.total));
  console.log(`           Provider balance change: ${(Number(providerDelta) / 1e24).toFixed(4)} NEAR`);

  console.log(`\n=== VERIFYING TASK STATE AFTER SURPLUS REFUND FAILURE ===`);
  const taskAfterPayout = await parentAccount.viewFunction({
    contractId: parentId,
    methodName: 'get_task',
    args: { task_id: taskId },
  });
  console.log(`Task #${taskId} Status:                ${taskAfterPayout.status}`);
  console.log(`Task #${taskId} Preserved Escrow:      ${(Number(taskAfterPayout.escrow_amount) / 1e24).toFixed(4)} NEAR`);

  console.log(`\n[Step 7/8] Recreating buyer account ${buyerId} to recover surplus...`);
  await parentAccount.createAccount(
    buyerId,
    buyerKeyPair.publicKey,
    '200000000000000000000000' // 0.2 NEAR
  );
  console.log(`           Recreated ${buyerId} successfully.`);

  const buyerBalBeforeRecovery = await (await near.account(buyerId)).getAccountBalance();

  console.log(`[Step 8/8] Buyer recovering preserved surplus via claim_surplus_refund()...`);
  const recoveredBuyerAccount = await near.account(buyerId);
  const claimOutcome = await recoveredBuyerAccount.functionCall({
    contractId: parentId,
    methodName: 'claim_surplus_refund',
    args: { task_id: taskId },
    gas: '100000000000000',
    attachedDeposit: '0',
  });
  console.log(`           Recovery Tx Hash: ${claimOutcome.transaction.hash}`);

  for (const r of claimOutcome.receipts_outcome) {
    if (r.outcome.logs && r.outcome.logs.length > 0) {
      console.log(`           [Recovery Log]:`, r.outcome.logs.join(' | '));
    }
  }

  const buyerBalAfterRecovery = await recoveredBuyerAccount.getAccountBalance();
  const buyerDelta = BigInt(buyerBalAfterRecovery.total) - BigInt(buyerBalBeforeRecovery.total);
  console.log(`           Buyer balance change: +${(Number(buyerDelta) / 1e24).toFixed(4)} NEAR`);

  const taskAfterRecovery = await parentAccount.viewFunction({
    contractId: parentId,
    methodName: 'get_task',
    args: { task_id: taskId },
  });
  console.log(`Task #${taskId} Final Escrow Amount:   ${(Number(taskAfterRecovery.escrow_amount) / 1e24).toFixed(4)} NEAR`);

  console.log(`\n=== VERIFYING REJECTION OF SECOND CLAIM ATTEMPT ===`);
  try {
    await recoveredBuyerAccount.functionCall({
      contractId: parentId,
      methodName: 'claim_surplus_refund',
      args: { task_id: taskId },
      gas: '50000000000000',
      attachedDeposit: '0',
    });
    console.log("FAIL: Second claim should NOT have succeeded!");
  } catch (err) {
    console.log(`>>> PASS: Second claim rejected cleanly on Testnet:`);
    console.log(`    ${err.message}`);
  }
}

main().catch(console.error);
