import { z } from "zod";
import { Address } from "abitype/zod";

export const getBalanceParams = z.object({
  address: Address.optional().describe(
    "The address to query balance. If not provided, uses connected account.",
  ),
});

export const getPriceParams = z.object({
  ticker: z.string().describe("The ticker symbol to query price for"),
});

export const getTokenBalanceParams = z.object({
  address: Address.optional().describe(
    "The address to query balance. If not provided, uses connected account.",
  ),
  ticker: z.string().describe("The ticker symbol to query token balance for"),
});

export type GetBalanceParams = z.infer<typeof getBalanceParams>;
export type GetPriceParams = z.infer<typeof getPriceParams>;
export type GetTokenBalanceParams = z.infer<typeof getTokenBalanceParams>;
