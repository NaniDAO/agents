import { PublicClient } from "viem";
import { GetBalanceParams } from "./params";

export const getBalance = async (
  client: PublicClient,
  params: GetBalanceParams,
) => {
  try {
    const balance = await client.getBalance({
      address: params.address,
    });
    return { balance };
  } catch (error) {
    return "Failed to get balance for " + params.address;
  }
};
