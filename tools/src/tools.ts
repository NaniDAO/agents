import {
  getBalanceParams,
  getPriceParams,
  sendTokenParams,
  swapTokenParams,
  getTokenBalanceParams,
} from "./params";
import {
  getBalancePrompt,
  getPricePrompt,
  sendTokenPrompt,
  swapTokenPrompt,
  getTokenBalancePrompt,
} from "./prompts";

export type Tool = {
  method: string;
  name: string;
  description: string;
  parameters: any;
  type: "read" | "write";
};

const tools: Tool[] = [
  {
    method: "get_balance",
    name: "Get Balance",
    description: getBalancePrompt,
    parameters: getBalanceParams,
    type: "read",
  },
  {
    method: "get_token_balance",
    name: "Get Token Balance",
    description: getTokenBalancePrompt,
    parameters: getTokenBalanceParams,
    type: "read",
  },
  {
    method: "get_price",
    name: "Get Price",
    description: getPricePrompt,
    parameters: getPriceParams,
    type: "read",
  },
  {
    method: "send_token",
    name: "Send Token",
    description: sendTokenPrompt,
    parameters: sendTokenParams,
    type: "write",
  },
  {
    method: "swap_token",
    name: "Swap Token",
    description: swapTokenPrompt,
    parameters: swapTokenParams,
    type: "write",
  },
];

export default tools;
