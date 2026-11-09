export interface NearNetworkConfig {
  networkId: "testnet" | "mainnet";
  nodeUrl: string;
  walletUrl: string;
  helperUrl: string;
  explorerUrl: string;
  contractId: string;
}

export function getNearConfig(): NearNetworkConfig {
  const networkId = (process.env.NEAR_NETWORK || "testnet") as "testnet" | "mainnet";

  if (networkId === "mainnet") {
    return {
      networkId: "mainnet",
      nodeUrl: "https://rpc.mainnet.near.org",
      walletUrl: "https://wallet.near.org",
      helperUrl: "https://helper.mainnet.near.org",
      explorerUrl: "https://nearblocks.io",
      contractId: process.env.NEAR_CONTRACT_ID || "meridian_core.near",
    };
  }

  return {
    networkId: "testnet",
    nodeUrl: process.env.NEAR_RPC_URL || "https://rpc.testnet.near.org",
    walletUrl: "https://testnet.mynearwallet.com",
    helperUrl: "https://helper.testnet.near.org",
    explorerUrl: "https://testnet.nearblocks.io",
    contractId: process.env.NEAR_CONTRACT_ID || "meridian_core.testnet",
  };
}
