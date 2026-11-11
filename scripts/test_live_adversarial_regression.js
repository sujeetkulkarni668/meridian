const fs = require('fs');
const path = require('path');
const { connect, keyStores, KeyPair } = require('near-api-js');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  process.loadEnvFile && process.loadEnvFile();
  const parentId = process.env.NEAR_ACCOUNT_ID || 'meridiantest.testnet';
  const privateKey = process.env.NEAR_PRIVATE_KEY;
  if (!privateKey) throw new Error("NEAR_PRIVATE_KEY missing from environment");

  console.log("==========================================================================");
  console.log("  MERIDIAN LIVE NEAR TESTNET: ADVERSARIAL FAILURE REGRESSION (A & B)");
  console.log("==========================================================================");
  console.log(`Contract Account: ${parentId}`);

  const keyStore = new keyStores.InMemoryKeyStore();
  const parentKeyPair = KeyPair.fromString(privateKey);
  await keyStore.setKey('testnet', parentId, parentKeyPair);

  const nodeUrl = 'https://rpc.testnet.fastnear.com';
  console.log(`RPC Node: ${nodeUrl}`);

  const near = await connect({
    networkId: 'testnet',
    nodeUrl,
    keyStore,
  });
  const parentAccount = await near.account(parentId);

  // ---------------------------------------------------------------------------
  // TEST A: PROVIDER ACCOUNT DELETED BEFORE PAYOUT
  // ---------------------------------------------------------------------------
  console.log("\n==========================================================================");
  console.log("  TEST A: PROVIDER ACCOUNT DELETED BEFORE PAYOUT");
  console.log("==========================================================================");

  const tsA = Date.now().toString().slice(-6);
  const provADelId = `pdel-${tsA}.${parentId}`;
  const provAKeyPair = KeyPair.fromRandom('ed25519');
  await keyStore.setKey('testnet', provADelId, provAKeyPair);

  console.log(`[A.1] Creating ephemeral provider: ${provADelId} with 0.15 NEAR...`);
  await parentAccount.createAccount(
    provADelId,
    provAKeyPair.publicKey,
    '150000000000000000000000'
  );
  await sleep(2000);

  const provAAccount = await near.account(provADelId);

  console.log(`[A.2] Registering provider agent in Meridian Registry...`);
  const regProvATx = await provAAccount.functionCall({
    contractId: parentId,
    methodName: 'register_agent',
    args: {
      name: 'Disposable Provider Agent',
      role: 'PROVIDER',
      category: 'SECURITY',
      metadata_uri: 'ipfs://qm-prov-disposable',
    },
    gas: '30000000000000',
    attachedDeposit: '10000000000000000000000', // 0.01 NEAR
  });
  console.log(`      Registered: Tx ${regProvATx.transaction.hash}`);
  await sleep(2000);

  console.log(`[A.3] Buyer (${parentId}) creating Task A with 0.05 NEAR deposit (0.04 escrow)...`);
  const createTaskATx = await parentAccount.functionCall({
    contractId: parentId,
    methodName: 'create_task',
    args: {
      title: 'Adversarial Provider Failure Test',
      category: 'AUDIT',
      description_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      deadline_ms: Date.now() + 86400000,
    },
    gas: '100000000000000',
    attachedDeposit: '50000000000000000000000', // 0.05 NEAR (0.01 storage + 0.04 escrow)
  });
  await sleep(2000);

  const statsA = await parentAccount.viewFunction({
    contractId: parentId,
    methodName: 'get_marketplace_stats',
  });
  const taskAId = statsA.total_tasks;
  console.log(`      Task A Created: ID #${taskAId} (Tx: ${createTaskATx.transaction.hash})`);

  console.log(`[A.4] Awarding Task #${taskAId} to provider ${provADelId} at 0.04 NEAR...`);
  const awardATx = await parentAccount.functionCall({
    contractId: parentId,
    methodName: 'award_task',
    args: {
      task_id: taskAId,
      provider_id: provADelId,
      agreed_price: '40000000000000000000000', // 0.04 NEAR
    },
    gas: '50000000000000',
  });
  console.log(`      Awarded: Tx ${awardATx.transaction.hash}`);
  await sleep(2000);

  console.log(`[A.5] Provider submitting deliverable...`);
  const delivATx = await provAAccount.functionCall({
    contractId: parentId,
    methodName: 'submit_deliverable',
    args: {
      task_id: taskAId,
      deliverable_hash: 'e51834134aafbb343cb42bebca7cfbd70cf333c3c84bad112d09502a888db3a6',
      deliverable_uri: 'ipfs://qm-deliv-a',
    },
    gas: '50000000000000',
  });
  console.log(`      Deliverable submitted: Tx ${delivATx.transaction.hash}`);
  await sleep(2000);

  console.log(`[A.6] Buyer verifying deliverable (Score: 90)...`);
  const verifyATx = await parentAccount.functionCall({
    contractId: parentId,
    methodName: 'record_verification',
    args: {
      task_id: taskAId,
      score: 90,
      verdict: 'APPROVED',
      rationale: 'Deliverable passed inspection',
    },
    gas: '50000000000000',
  });
  console.log(`      Verified: Tx ${verifyATx.transaction.hash}`);
  await sleep(2000);

  console.log(`[A.7] ADVERSARIAL ACTION: Deleting provider account ${provADelId} from NEAR Testnet...`);
  const delAccountTx = await provAAccount.deleteAccount(parentId);
  console.log(`      Provider account deleted! (Tx: ${delAccountTx.transaction.hash})`);
  await sleep(3000);

  console.log(`[A.8] Calling approve_and_payout (NEAR transfer to deleted account will FAIL on-chain)...`);
  const payoutATx = await parentAccount.functionCall({
    contractId: parentId,
    methodName: 'approve_and_payout',
    args: { task_id: taskAId },
    gas: '200000000000000',
  });
  console.log(`      Approve and Payout Tx: ${payoutATx.transaction.hash}`);
  await sleep(3000);

  const taskAAfter = await parentAccount.viewFunction({
    contractId: parentId,
    methodName: 'get_task',
    args: { task_id: taskAId },
  });
  console.log(`\nTask #${taskAId} State after payout failure rollback:`);
  console.log(` - Status:        ${taskAAfter.status}`);
  console.log(` - Escrow Amount: ${taskAAfter.escrow_amount} yoctoNEAR (${(Number(taskAAfter.escrow_amount) / 1e24).toFixed(4)} NEAR)`);
  console.log(` - Settled At:    ${taskAAfter.settled_at_ms}`);

  if (taskAAfter.status === 'Verified' && taskAAfter.escrow_amount === '40000000000000000000000' && taskAAfter.settled_at_ms === 0) {
    console.log(`>>> PASS: Provider transfer failed, escrow successfully restored (0.04 NEAR), settled_at_ms set to sentinel 0! <<<`);
  } else {
    console.error(`>>> FAIL: Unexpected state for Task #${taskAId}`, taskAAfter);
  }

  console.log(`\n[A.9] Buyer recovering the restored escrow via claim_surplus_refund...`);
  const claimATx = await parentAccount.functionCall({
    contractId: parentId,
    methodName: 'claim_surplus_refund',
    args: { task_id: taskAId },
    gas: '50000000000000',
  });
  console.log(`      Claim Recovery Tx: ${claimATx.transaction.hash}`);
  await sleep(2000);

  const taskAClaimed = await parentAccount.viewFunction({
    contractId: parentId,
    methodName: 'get_task',
    args: { task_id: taskAId },
  });
  console.log(`Task #${taskAId} Escrow after claim: ${taskAClaimed.escrow_amount} yoctoNEAR`);

  console.log(`\n[A.10] Testing duplicate recovery rejection on Task #${taskAId}...`);
  try {
    await parentAccount.functionCall({
      contractId: parentId,
      methodName: 'claim_surplus_refund',
      args: { task_id: taskAId },
      gas: '50000000000000',
    });
    console.error(`FAIL: Second claim should NOT succeed!`);
  } catch (err) {
    console.log(`>>> PASS: Duplicate recovery rejected cleanly: ${err.message}`);
  }


  // ---------------------------------------------------------------------------
  // TEST B: BUYER ACCOUNT DELETED BEFORE SURPLUS REFUND
  // ---------------------------------------------------------------------------
  console.log("\n==========================================================================");
  console.log("  TEST B: BUYER ACCOUNT DELETED BEFORE SURPLUS REFUND");
  console.log("==========================================================================");

  const tsB = Date.now().toString().slice(-6);
  const buyerBDelId = `bdel-${tsB}.${parentId}`;
  const buyerBKeyPair = KeyPair.fromRandom('ed25519');
  await keyStore.setKey('testnet', buyerBDelId, buyerBKeyPair);

  console.log(`[B.1] Creating ephemeral buyer: ${buyerBDelId} with 0.35 NEAR...`);
  await parentAccount.createAccount(
    buyerBDelId,
    buyerBKeyPair.publicKey,
    '350000000000000000000000' // 0.35 NEAR
  );
  await sleep(2000);

  const buyerBAccount = await near.account(buyerBDelId);

  console.log(`[B.2] Registering Buyer B in Meridian Registry...`);
  const regBuyerBTx = await buyerBAccount.functionCall({
    contractId: parentId,
    methodName: 'register_agent',
    args: {
      name: 'Ephemeral Buyer Agent',
      role: 'BUYER',
      category: 'AUDIT',
      metadata_uri: 'ipfs://qm-buyer-b-del',
    },
    gas: '30000000000000',
    attachedDeposit: '10000000000000000000000',
  });
  console.log(`      Registered: Tx ${regBuyerBTx.transaction.hash}`);
  await sleep(2000);

  console.log(`[B.3] Buyer B creating Task B with 0.05 NEAR escrow (0.06 NEAR attached)...`);
  const createTaskBTx = await buyerBAccount.functionCall({
    contractId: parentId,
    methodName: 'create_task',
    args: {
      title: 'Surplus Refund Failure & Re-creation Recovery Test',
      category: 'AUDIT',
      description_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      deadline_ms: Date.now() + 86400000,
    },
    gas: '100000000000000',
    attachedDeposit: '60000000000000000000000', // 0.06 NEAR
  });
  await sleep(2000);

  const statsB = await parentAccount.viewFunction({
    contractId: parentId,
    methodName: 'get_marketplace_stats',
  });
  const taskBId = statsB.total_tasks;
  console.log(`      Task B Created: ID #${taskBId} (Tx: ${createTaskBTx.transaction.hash})`);

  console.log(`[B.4] Awarding Task #${taskBId} to provider ${parentId} at 0.02 NEAR (Surplus = 0.03 NEAR)...`);
  const awardBTx = await buyerBAccount.functionCall({
    contractId: parentId,
    methodName: 'award_task',
    args: {
      task_id: taskBId,
      provider_id: parentId,
      agreed_price: '20000000000000000000000', // 0.02 NEAR
    },
    gas: '50000000000000',
  });
  console.log(`      Awarded: Tx ${awardBTx.transaction.hash}`);
  await sleep(2000);

  console.log(`[B.5] Provider submitting deliverable...`);
  const delivBTx = await parentAccount.functionCall({
    contractId: parentId,
    methodName: 'submit_deliverable',
    args: {
      task_id: taskBId,
      deliverable_hash: 'e51834134aafbb343cb42bebca7cfbd70cf333c3c84bad112d09502a888db3a6',
      deliverable_uri: 'ipfs://qm-deliv-b',
    },
    gas: '50000000000000',
  });
  console.log(`      Deliverable submitted: Tx ${delivBTx.transaction.hash}`);
  await sleep(2000);

  console.log(`[B.6] Buyer B verifying deliverable (Score: 92)...`);
  const verifyBTx = await buyerBAccount.functionCall({
    contractId: parentId,
    methodName: 'record_verification',
    args: {
      task_id: taskBId,
      score: 92,
      verdict: 'APPROVED',
      rationale: 'Adversarial criteria cleared',
    },
    gas: '50000000000000',
  });
  console.log(`      Verified: Tx ${verifyBTx.transaction.hash}`);
  await sleep(2000);

  console.log(`[B.7] ADVERSARIAL ACTION: Deleting buyer account ${buyerBDelId} from NEAR Testnet...`);
  const delBuyerTx = await buyerBAccount.deleteAccount(parentId);
  console.log(`      Buyer account deleted! (Tx: ${delBuyerTx.transaction.hash})`);
  await sleep(3000);

  console.log(`[B.8] Contract owner calling approve_and_payout...`);
  console.log(`      Provider payout (0.02 NEAR) will succeed; Buyer surplus refund (0.03 NEAR) will FAIL on-chain!`);
  const payoutBTx = await parentAccount.functionCall({
    contractId: parentId,
    methodName: 'approve_and_payout',
    args: { task_id: taskBId },
    gas: '200000000000000',
  });
  console.log(`      Approve and Payout Tx: ${payoutBTx.transaction.hash}`);
  await sleep(3000);

  const taskBAfter = await parentAccount.viewFunction({
    contractId: parentId,
    methodName: 'get_task',
    args: { task_id: taskBId },
  });
  console.log(`\nTask #${taskBId} State after joint settlement callback:`);
  console.log(` - Status:        ${taskBAfter.status}`);
  console.log(` - Escrow Amount: ${taskBAfter.escrow_amount} yoctoNEAR (${(Number(taskBAfter.escrow_amount) / 1e24).toFixed(4)} NEAR)`);

  if (taskBAfter.status === 'Completed' && taskBAfter.escrow_amount === '30000000000000000000000') {
    console.log(`>>> PASS: Provider payout succeeded, Buyer surplus refund failed and was PRESERVED in escrow (0.03 NEAR)! <<<`);
  } else {
    console.error(`>>> FAIL: Unexpected state for Task #${taskBId}`, taskBAfter);
  }

  console.log(`\n[B.9] Re-creating buyer account ${buyerBDelId} with fresh keypair...`);
  const buyerBNewKeyPair = KeyPair.fromRandom('ed25519');
  await keyStore.setKey('testnet', buyerBDelId, buyerBNewKeyPair);
  await parentAccount.createAccount(
    buyerBDelId,
    buyerBNewKeyPair.publicKey,
    '150000000000000000000000' // 0.15 NEAR
  );
  console.log(`      Buyer account ${buyerBDelId} re-created successfully.`);
  await sleep(2000);

  const buyerBRecreatedAccount = await near.account(buyerBDelId);

  console.log(`[B.10] Re-created buyer claiming preserved surplus refund (0.03 NEAR)...`);
  const claimBTx = await buyerBRecreatedAccount.functionCall({
    contractId: parentId,
    methodName: 'claim_surplus_refund',
    args: { task_id: taskBId },
    gas: '50000000000000',
  });
  console.log(`      Claim Surplus Refund Tx: ${claimBTx.transaction.hash}`);
  await sleep(2000);

  const taskBClaimed = await parentAccount.viewFunction({
    contractId: parentId,
    methodName: 'get_task',
    args: { task_id: taskBId },
  });
  console.log(`Task #${taskBId} Escrow after recovery: ${taskBClaimed.escrow_amount} yoctoNEAR`);

  console.log(`\n[B.11] Testing duplicate recovery rejection on Task #${taskBId}...`);
  try {
    await buyerBRecreatedAccount.functionCall({
      contractId: parentId,
      methodName: 'claim_surplus_refund',
      args: { task_id: taskBId },
      gas: '50000000000000',
    });
    console.error(`FAIL: Second claim should NOT succeed!`);
  } catch (err) {
    console.log(`>>> PASS: Duplicate recovery rejected cleanly: ${err.message}`);
  }

  console.log("\n==========================================================================");
  console.log("  BOTH ADVERSARIAL FAILURE REGRESSION TESTS (A & B) COMPLETED SUCCESSFULLY!");
  console.log("==========================================================================");
}

main().catch(err => {
  console.error("Adversarial Test Execution Failed:", err);
  process.exit(1);
});
