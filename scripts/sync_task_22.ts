import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const buyerId = 'buyer-ai-676104.meridiantest.testnet';
  const contractId = 'meridiantest.testnet';
  const onChainTaskId = 22;

  let buyerUser = await prisma.user.findFirst({ where: { nearAccountId: buyerId } });
  if (!buyerUser) {
    buyerUser = await prisma.user.create({
      data: { nearAccountId: buyerId, role: 'BUYER' },
    });
  }

  const providerAgent = await prisma.agentProfile.findFirst({
    where: { slug: 'sentinel-security' },
  });

  const verifierAgent = await prisma.agentProfile.findFirst({
    where: { slug: 'veritas-verifier' },
  });

  // Check if task already partially created or delete previous partial
  const existingTask = await prisma.task.findFirst({ where: { taskNumber: onChainTaskId } });
  if (existingTask) {
    await prisma.blockchainTransaction.deleteMany({ where: { taskId: existingTask.id } });
    await prisma.contractAgreement.deleteMany({ where: { taskId: existingTask.id } });
    await prisma.deliverable.deleteMany({ where: { taskId: existingTask.id } });
    await prisma.verificationResult.deleteMany({ where: { taskId: existingTask.id } });
    await prisma.bid.deleteMany({ where: { taskId: existingTask.id } });
    await prisma.task.delete({ where: { id: existingTask.id } });
  }

  const syncedTask = await prisma.task.create({
    data: {
      taskNumber: onChainTaskId,
      title: 'Security Audit: Settlement Callbacks, Surplus Refunds, and Storage Deposits [INT-TEST-4722]',
      description: 'Rigorous smart contract security audit of NEAR Protocol settlement callbacks, surplus refund mechanics, and storage deposit guarantees.',
      requirementsJson: JSON.stringify([
        "Formal verification of callback execution flow",
        "Validation of surplus refund arithmetic",
        "Stress testing of storage deposit guarantees",
        "Identification and documentation of reentrancy vectors",
        "Provision of a remediation report",
        "Verification of NEAR storage staking requirements"
      ]),
      category: 'CODE_AUDIT',
      budgetNear: '0.05',
      budgetYocto: '50000000000000000000000',
      deadlineEpochMs: BigInt(Date.now() + 86400000),
      buyerId: buyerUser.id,
      buyerAccountId: buyerId,
      providerId: providerAgent?.id,
      status: 'COMPLETED',
      onChainTaskId: String(onChainTaskId),
    },
  });

  // Sync Bid
  await prisma.bid.create({
    data: {
      taskId: syncedTask.id,
      providerId: providerAgent!.id,
      proposedPriceNear: '0.035',
      proposedPriceYocto: '35000000000000000000000',
      deliveryTimeHours: 48,
      proposalPitch: 'I will perform a multi-stage audit: 1) Static analysis of callback handlers using custom invariant checks...',
      status: 'ACCEPTED',
      compositeScore: 92.5,
    },
  });

  // Sync Contract Agreement
  await prisma.contractAgreement.create({
    data: {
      taskId: syncedTask.id,
      agreedPriceNear: '0.035',
      agreedPriceYocto: '35000000000000000000000',
      escrowAddress: contractId,
      escrowFunded: true,
      fundedTxHash: 'HKtsgwkP6xgc4M5pDayZn8aGQTrXpfQauGVkFCU4qJZK',
      settledTxHash: '46TihgHHHJFJBhXbvBEcDVUpAx9aDqUjcnTBE9HZGNMH',
      status: 'RELEASED',
    },
  });

  // Sync Deliverable
  await prisma.deliverable.create({
    data: {
      taskId: syncedTask.id,
      content: fs.existsSync(path.resolve(__dirname, 'deliverable_e2e_22.md'))
        ? fs.readFileSync(path.resolve(__dirname, 'deliverable_e2e_22.md'), 'utf-8')
        : 'Formal security assessment verified.',
      deliverableHash: 'ed347b21ff420c35af89a87c198706af38a48025e8438a3e7ab790405ede0a77',
      metadataJson: JSON.stringify({ findingsCount: 3 }),
    },
  });

  // Sync Verification
  await prisma.verificationResult.create({
    data: {
      taskId: syncedTask.id,
      verifierAgentId: verifierAgent?.id || providerAgent!.id,
      verdict: 'CHANGES_REQUESTED',
      qualityScore: 65.0,
      verdictRationale: 'The audit identifies critical security flaws but lacks the depth required for a formal verification deliverable.',
      criteriaMetJson: JSON.stringify({
        "Formal verification of callback execution flow": false,
        "Validation of surplus refund arithmetic": true,
        "Stress testing of storage deposit guarantees": true,
        "Identification and documentation of reentrancy vectors": false,
        "Provision of a remediation report": true,
        "Verification of NEAR storage staking requirements": false
      }),
    },
  });

  // Sync All 7 Blockchain Transactions
  const txsToSync = [
    { name: 'create_task', hash: 'GdBAU7QEzuon5dBfGQ9ooNVDTLMr4AqYDjVaWnvQ8rF2', deposit: '10000000000000000000000', signer: buyerId },
    { name: 'submit_bid', hash: '19SASPuKoi55WeWXamrxoovFJb1NhYhpNRiD27ViKdi', deposit: '0', signer: 'prov-ai-676104.meridiantest.testnet' },
    { name: 'award_task', hash: 'CvKkebZfcpvK7CpFkjLY8eTvCe5TW583G8f2xGG5jjnB', deposit: '0', signer: buyerId },
    { name: 'fund_task', hash: 'HKtsgwkP6xgc4M5pDayZn8aGQTrXpfQauGVkFCU4qJZK', deposit: '50000000000000000000000', signer: buyerId },
    { name: 'submit_deliverable', hash: '3eNbBagHeeDZEwJGkohfKka1rfdM3gU6xu7XLtTZ1Xtx', deposit: '0', signer: 'prov-ai-676104.meridiantest.testnet' },
    { name: 'record_verification', hash: '63gjYoxcH4SZt387qVKUgCabRfbyJ78sz2eMMMXeb42s', deposit: '0', signer: buyerId },
    { name: 'approve_and_payout', hash: '46TihgHHHJFJBhXbvBEcDVUpAx9aDqUjcnTBE9HZGNMH', deposit: '0', signer: buyerId },
  ];

  for (const t of txsToSync) {
    await prisma.blockchainTransaction.create({
      data: {
        taskId: syncedTask.id,
        txHash: t.hash,
        signerId: t.signer,
        receiverId: contractId,
        methodName: t.name,
        depositYocto: t.deposit,
        status: 'SUCCESS',
        explorerUrl: `https://testnet.nearblocks.io/txns/${t.hash}`,
      },
    });
  }

  console.log(`Database synchronization complete for Task #22 with all 7 on-chain transactions.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
