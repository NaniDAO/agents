import { type PublicClient, type WalletClient } from "viem";
import { getBalance } from "./read-functions";

class NaniAPI {
  publicClient: PublicClient;
  walletClient?: WalletClient;

  constructor(publicClient: PublicClient, walletClient?: WalletClient) {
    this.publicClient = publicClient;
    if (walletClient) {
      this.walletClient = walletClient;
    }
  }

  async run(method: string, arg: any) {
    if (method === "get_balance") {
      const output = JSON.stringify(await getBalance(this.publicClient, arg));
      return output;
    }
  }
}

export default NaniAPI;
