import { connect, keyStores, KeyPair, providers, utils } from "near-api-js";
import { getNearConfig } from "./config";
import { formatYoctoToNear } from "./units";

export interface OnChainAgent {
  account_id: string;
  name: string;
  role: string;
  category: string;
  metadata_uri: string;
  reputation_score: number;
  total_tasks_completed: number;
  registered_at_ms: number;
  active: boolean;
}

export interface OnChainTask {
  task_id: number;
  buyer_id: string;
  title: string;
  category: string;
  description_hash: string;
  deadline_ms: number;
  status: string;
  assigned_provider?: string | null;
  agreed_price: string;
  escrow_amount: string;
  deliverable_hash?: string | null;
  deliverable_uri?: string | null;
  verification?: {
    verifier_id: string;
    score: number;
    verdict: string;
    rationale: string;
    verified_at_ms: number;
  } | null;
  created_at_ms: number;
  settled_at_ms?: number | null;
}

export class NearClient {
  private config = getNearConfig();
  private provider = new providers.JsonRpcProvider({ url: this.config.nodeUrl });

  /**
   * Check connection to NEAR RPC node.
   */
  async checkHealth(): Promise<{ status: "ONLINE" | "OFFLINE"; blockHeight?: number; network: string; error?: string }> {
    try {
      const status = await this.provider.status();
      return {
        status: "ONLINE",
        blockHeight: status.sync_info.latest_block_height,
        network: this.config.networkId,
      };
    } catch (err: any) {
      return {
        status: "OFFLINE",
        network: this.config.networkId,
        error: err?.message || "Failed to reach NEAR RPC",
      };
    }
  }

  /**
   * Get account balance in NEAR.
   */
  async getAccountBalance(accountId: string): Promise<{ totalNear: string; availableNear: string }> {
    try {
      const raw = await this.provider.query<any>({
        request_type: "view_account",
        finality: "final",
        account_id: accountId,
      });

      return {
        totalNear: formatYoctoToNear(raw.amount),
        availableNear: formatYoctoToNear(raw.amount),
      };
    } catch (err) {
      return { totalNear: "0", availableNear: "0" };
    }
  }

  /**
   * Generic contract view call.
   */
  async viewMethod<T>(methodName: string, args: Record<string, any> = {}): Promise<T | null> {
    const contractId = this.config.contractId;
    if (!contractId) return null;

    try {
      const res = await this.provider.query<any>({
        request_type: "call_function",
        finality: "final",
        account_id: contractId,
        method_name: methodName,
        args_base64: Buffer.from(JSON.stringify(args)).toString("base64"),
      });

      const parsed = JSON.parse(Buffer.from(res.result).toString("utf-8"));
      return parsed as T;
    } catch (err: any) {
      // Contract might not yet be deployed on this specific testnet account
      return null;
    }
  }

  /**
   * Fetch agents listed in smart contract.
   */
  async getContractAgents(limit: number = 50): Promise<OnChainAgent[]> {
    const res = await this.viewMethod<OnChainAgent[]>("list_agents", { limit });
    return res || [];
  }

  /**
   * Fetch tasks listed in smart contract.
   */
  async getContractTasks(limit: number = 50): Promise<OnChainTask[]> {
    const res = await this.viewMethod<OnChainTask[]>("list_tasks", { limit });
    return res || [];
  }

  /**
   * Fetch single task from smart contract.
   */
  async getContractTask(taskId: number): Promise<OnChainTask | null> {
    return this.viewMethod<OnChainTask>("get_task", { task_id: taskId });
  }

  /**
   * Get marketplace stats directly from smart contract.
   */
  async getContractStats(): Promise<any> {
    return this.viewMethod<any>("get_marketplace_stats", {});
  }

  /**
   * Query transaction status from NEAR RPC.
   */
  async getTxStatus(txHash: string, accountId: string): Promise<any> {
    try {
      return await this.provider.txStatus(txHash, accountId);
    } catch (err: any) {
      return { error: err.message };
    }
  }

  /**
   * Execute backend signed transaction if credentials are configured.
   */
  async callChangeMethod(
    methodName: string,
    args: Record<string, any> = {},
    attachedYocto: string = "0"
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    const signerId = process.env.NEAR_ACCOUNT_ID;
    const privateKey = process.env.NEAR_PRIVATE_KEY;
    const contractId = this.config.contractId;

    if (!signerId || !privateKey) {
      return {
        success: false,
        error: "NO_SIGNER_KEY: Direct backend signing requires NEAR_ACCOUNT_ID and NEAR_PRIVATE_KEY. Client wallet signing recommended.",
      };
    }

    try {
      const keyStore = new keyStores.InMemoryKeyStore();
      const keyPair = KeyPair.fromString(privateKey as any);
      await keyStore.setKey(this.config.networkId, signerId, keyPair);

      const near = await connect({
        networkId: this.config.networkId,
        nodeUrl: this.config.nodeUrl,
        keyStore,
      });

      const account = await near.account(signerId);
      const outcome = await account.functionCall({
        contractId,
        methodName,
        args,
        gas: BigInt("300000000000000"), // 300 TGas
        attachedDeposit: BigInt(attachedYocto),
      });

      return {
        success: true,
        txHash: outcome.transaction.hash,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Function call transaction failed",
      };
    }
  }
}

export const nearClient = new NearClient();
