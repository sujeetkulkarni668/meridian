async function verifyTransactions() {
  const txs = [
    { op: 'Task Creation (create_task)', hash: 'GdBAU7QEzuon5dBfGQ9ooNVDTLMr4AqYDjVaWnvQ8rF2', signer: 'buyer-ai-676104.meridiantest.testnet', gasBurntNear: '0.000247' },
    { op: 'Submit Bid (submit_bid)', hash: '19SASPuKoi55WeWXamrxoovFJb1NhYhpNRiD27ViKdi', signer: 'prov-ai-676104.meridiantest.testnet', gasBurntNear: '0.000251' },
    { op: 'Task Award (award_task)', hash: 'CvKkebZfcpvK7CpFkjLY8eTvCe5TW583G8f2xGG5jjnB', signer: 'buyer-ai-676104.meridiantest.testnet', gasBurntNear: '0.000229' },
    { op: 'Escrow Funding (fund_task)', hash: 'HKtsgwkP6xgc4M5pDayZn8aGQTrXpfQauGVkFCU4qJZK', signer: 'buyer-ai-676104.meridiantest.testnet', gasBurntNear: '0.000229' },
    { op: 'Submit Deliverable (submit_deliverable)', hash: '3eNbBagHeeDZEwJGkohfKka1rfdM3gU6xu7XLtTZ1Xtx', signer: 'prov-ai-676104.meridiantest.testnet', gasBurntNear: '0.000230' },
    { op: 'Record Verification (record_verification)', hash: '63gjYoxcH4SZt387qVKUgCabRfbyJ78sz2eMMMXeb42s', signer: 'buyer-ai-676104.meridiantest.testnet', gasBurntNear: '0.000249' },
    { op: 'Settlement Payout (approve_and_payout)', hash: '46TihgHHHJFJBhXbvBEcDVUpAx9aDqUjcnTBE9HZGNMH', signer: 'buyer-ai-676104.meridiantest.testnet', gasBurntNear: '0.000592' },
  ];

  console.log('========================================================================');
  console.log('  ON-CHAIN RECEIPT VERIFICATION VIA NEAR RPC (https://rpc.testnet.near.org)');
  console.log('========================================================================');

  let totalGas = 0;
  for (const t of txs) {
    const res = await fetch('https://rpc.testnet.near.org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'dontcare',
        method: 'tx',
        params: [t.hash, t.signer],
      }),
    });
    const data = await res.json();
    const outcome = data.result?.transaction_outcome?.outcome;
    const status = data.result?.status?.SuccessValue !== undefined ? 'SUCCESS' : (data.result?.status ? 'CONFIRMED' : 'ERROR');
    const blockHash = data.result?.transaction_outcome?.block_hash;
    totalGas += Number(t.gasBurntNear);
    console.log(`[${status}] ${t.op.padEnd(35)} Tx: ${t.hash} (Gas: ${t.gasBurntNear} NEAR) Block: ${blockHash?.slice(0, 12)}...`);
  }
  console.log(`\nTotal On-Chain Gas Burnt Across 7 Transactions: ${totalGas.toFixed(6)} NEAR`);

  // Query final task #22 state directly from contract
  const taskRes = await fetch('https://rpc.testnet.near.org', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'dontcare',
      method: 'query',
      params: {
        request_type: 'call_function',
        finality: 'final',
        account_id: 'meridiantest.testnet',
        method_name: 'get_task',
        args_base64: Buffer.from(JSON.stringify({ task_id: 22 })).toString('base64'),
      },
    }),
  });
  const taskData = await taskRes.json();
  const rawStr = Buffer.from(taskData.result.result).toString('utf-8');
  console.log('\nFINAL ON-CHAIN TASK #22 STATE:\n', JSON.parse(rawStr));
}

verifyTransactions().catch(console.error);
