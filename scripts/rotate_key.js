const fs = require('fs');
const path = require('path');
const { connect, keyStores, KeyPair, providers } = require('near-api-js');

async function rotateKey() {
  process.loadEnvFile && process.loadEnvFile();
  const accountId = process.env.NEAR_ACCOUNT_ID || 'meridiantest.testnet';
  const currentPrivateKey = process.env.NEAR_PRIVATE_KEY;

  if (!currentPrivateKey) {
    throw new Error('Current NEAR_PRIVATE_KEY is missing from .env');
  }

  const currentKeyPair = KeyPair.fromString(currentPrivateKey);
  const oldPublicKey = currentKeyPair.getPublicKey();
  console.log(`[1/6] Current Account: ${accountId}`);
  console.log(`      Current Public Key to be revoked: ${oldPublicKey.toString()}`);

  // 1. Generate new Ed25519 KeyPair
  const newKeyPair = KeyPair.fromRandom('ED25519');
  const newPublicKey = newKeyPair.getPublicKey();
  const newPrivateKey = newKeyPair.toString();
  console.log(`[2/6] Generated replacement KeyPair:`);
  console.log(`      New Public Key: ${newPublicKey.toString()}`);

  // 2. Setup connection with current key
  const keyStore = new keyStores.InMemoryKeyStore();
  await keyStore.setKey('testnet', accountId, currentKeyPair);

  const near = await connect({
    networkId: 'testnet',
    nodeUrl: 'https://rpc.testnet.near.org',
    keyStore,
  });

  const account = await near.account(accountId);

  // 3. Add the new key as a FullAccess key
  console.log(`[3/6] Adding new key ${newPublicKey.toString()} on-chain via addKey transaction...`);
  const addKeyOutcome = await account.addKey(newPublicKey);
  console.log(`      New Key Added! Tx: ${addKeyOutcome.transaction.hash}`);

  // 4. Verify new key in access key list
  const rpcProvider = new providers.JsonRpcProvider({ url: 'https://rpc.testnet.near.org' });
  const keyListBefore = await rpcProvider.query({
    request_type: 'view_access_key_list',
    finality: 'final',
    account_id: accountId,
  });
  console.log(`[4/6] On-chain keys currently: ${keyListBefore.keys.map(k => k.public_key).join(', ')}`);

  // 5. Delete the old key using the NEW key
  console.log(`[5/6] Revoking old exposed key ${oldPublicKey.toString()} using new key...`);
  await keyStore.setKey('testnet', accountId, newKeyPair);
  const accountWithNewKey = await near.account(accountId);
  const deleteKeyOutcome = await accountWithNewKey.deleteKey(oldPublicKey);
  console.log(`      Old Key Revoked! Tx: ${deleteKeyOutcome.transaction.hash}`);

  // 6. Verify revocation on-chain
  const keyListAfter = await rpcProvider.query({
    request_type: 'view_access_key_list',
    finality: 'final',
    account_id: accountId,
  });
  console.log(`[6/6] Final On-chain Key List after revocation:`);
  console.log(JSON.stringify(keyListAfter.keys, null, 2));

  const oldKeyStillExists = keyListAfter.keys.some(k => k.public_key === oldPublicKey.toString());
  const newKeyActive = keyListAfter.keys.some(k => k.public_key === newPublicKey.toString());

  if (oldKeyStillExists || !newKeyActive) {
    throw new Error('Key rotation failed: old key still active or new key not found!');
  }

  // Update .env with new key
  const envPath = path.resolve(__dirname, '../.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  envContent = envContent.replace(
    /NEAR_PRIVATE_KEY=.*/,
    `NEAR_PRIVATE_KEY="${newPrivateKey}"`
  );
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log(`\n>>> KEY ROTATION COMPLETE & VERIFIED! <<<`);
  console.log(`Revoked Old Key: ${oldPublicKey.toString()} (Tx: ${deleteKeyOutcome.transaction.hash})`);
  console.log(`Active New Key:  ${newPublicKey.toString()} (Tx: ${addKeyOutcome.transaction.hash})`);
  console.log(`.env updated with secure replacement private key.`);
}

rotateKey().catch(err => {
  console.error('Key rotation error:', err);
  process.exit(1);
});
