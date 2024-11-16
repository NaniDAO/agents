const { createPublicClient, createWalletClient, http } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { base } = require("viem/chains");
const OpenAI = require("openai");
const functions = require("@google-cloud/functions-framework");

const PERMITS_ADDRESS = "0xa9606fB9Ebc5c7Fe8bfa78462ad914753BC761c6";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

async function evaluateCondition(prompt, context = {}) {
  try {
    const completion = await openai.chat.completions.create({
      model: "anthropic/claude-3.5-sonnet",
      messages: [
        {
          role: "system",
          content: "You are evaluating execution conditions for DeFi transactions. Respond with only 'true' or 'false' based on whether the condition is met given the context.",
        },
        {
          role: "user",
          content: `Condition: "${prompt}"\nContext: ${JSON.stringify(context)}`,
        },
      ],
    });

    const decision = completion.choices[0]?.message?.content?.trim().toLowerCase();
    return decision === "true";
  } catch (error) {
    console.error("Error evaluating condition:", error);
    return false;
  }
}

async function executePermits() {
  try {
    const PRIVATE_KEY = process.env.AGENT_PK;
    if (!PRIVATE_KEY) {
      throw new Error("Agent private key not set");
    }

    // Set up clients
    const account = privateKeyToAccount(PRIVATE_KEY);
    console.log("Executor account:", account.address);

    const walletClient = createWalletClient({
      chain: base,
      account: account,
      transport: http(),
    });

    const publicClient = createPublicClient({
      chain: base,
      transport: http(),
    });

    // Get all active permits for this agent
    const activePermits = await publicClient.readContract({
      address: PERMITS_ADDRESS,
      abi: [
        {
          inputs: [{ internalType: "address", name: "agent", type: "address" }],
          name: "getAllActivePermissionsForAgent",
          outputs: [
            {
              components: [
                { internalType: "bool", name: "active", type: "bool" },
                { internalType: "uint32", name: "usesLeft", type: "uint32" },
                { internalType: "uint48", name: "timeLeft", type: "uint48" },
                { internalType: "address", name: "inputToken", type: "address" },
                { internalType: "address", name: "outputToken", type: "address" },
                { internalType: "uint256", name: "inputAmount", type: "uint256" },
                { internalType: "bool", name: "isSwap", type: "bool" },
                { internalType: "string", name: "commandString", type: "string" },
                { internalType: "string", name: "prompt", type: "string" },
                { internalType: "uint48", name: "createdAt", type: "uint48" },
                { internalType: "uint48", name: "lastUsedAt", type: "uint48" },
                { internalType: "address", name: "owner", type: "address" },
                { internalType: "address", name: "agent", type: "address" },
              ],
              internalType: "struct Permits.PermissionDetails[]",
              name: "",
              type: "tuple[]",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "getAllActivePermissionsForAgent",
      args: [account.address],
    });

    console.log(`Found ${activePermits.length} active permits`);

    // Process each active permit
    for await (const permit of activePermits) {
      try {
        // Skip permits without prompts
        if (!permit.prompt) {
          console.log("Skipping permit without condition prompt");
          continue;
        }

        console.log(`Evaluating condition: ${permit.prompt}`);
        
        // Gather relevant context (can be expanded based on needs)
        const context = {
          timestamp: Date.now(),
          isSwap: permit.isSwap,
          inputToken: permit.inputToken,
          outputToken: permit.outputToken,
          inputAmount: permit.inputAmount.toString(),
        };

        // Check if conditions are met
        const shouldExecute = await evaluateCondition(permit.prompt, context);
        
        if (!shouldExecute) {
          console.log("Conditions not met, skipping execution");
          continue;
        }

        console.log(`Executing permit for owner ${permit.owner}`);
        console.log(`Command: ${permit.commandString}`);
        
        await walletClient.writeContract({
          address: PERMITS_ADDRESS,
          abi: [
            {
              inputs: [
                { internalType: "address", name: "owner", type: "address" },
                { internalType: "string", name: "command", type: "string" },
              ],
              name: "execute",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
          ],
          functionName: "execute",
          args: [permit.owner, permit.commandString],
        });
        
        console.log("Permit execution successful");
      } catch (error) {
        console.error(`Failed to process permit: ${error.message}`);
        continue;
      }
    }
  } catch (error) {
    console.error("Fatal error in executePermits:", error);
    throw error;
  }
}

// Cloud Function entry point
exports.checkAndExecutePermits = functions.http(
  "checkAndExecutePermits",
  async (req, res) => {
    try {
      await executePermits();
      res.status(200).send("Permits checked and executed successfully");
    } catch (error) {
      console.error("Error:", error);
      res.status(500).send("Error executing permits");
    }
  },
);