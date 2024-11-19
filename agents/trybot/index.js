const { createPublicClient, createWalletClient, http } = require("viem");
const { base } = require("viem/chains");
const { toGcpAccount } = require("@nanidao/gcp-account");
const functions = require("@google-cloud/functions-framework");

const PERMITS_ADDRESS = "0xa9606fB9Ebc5c7Fe8bfa78462ad914753BC761c6"; // ADDRESS ON BASE

const chain = base; // DEFAULT CHAIN

async function evaluateCondition(commandString, context = {}) {
  try {
    const publicClient = createPublicClient({
      chain,
      transport: http(),
    });

    // Simulate the transaction
    await publicClient.simulateContract({
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
      args: [context.owner, commandString],
      account: context.agent, // The agent address that would execute this
    });

    // If simulation succeeds (doesn't revert), return true
    return true;
  } catch (error) {
    console.log("Transaction simulation failed:", error.message);
    return false;
  }
}

async function executePermits() {
  try {
    const CREDENTIALS = process.env.CREDENTIALS;
    if (!CREDENTIALS) {
      throw new Error("Agent CREDENTIALS not set");
    }

    // Set up clients
    const account = await toGcpAccount({ credentials: CREDENTIALS });
    console.log("Executor Account:", account.address);

    const walletClient = createWalletClient({
      chain,
      account: account,
      transport: http(),
    });

    const publicClient = createPublicClient({
      chain,
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
                {
                  internalType: "address",
                  name: "inputToken",
                  type: "address",
                },
                {
                  internalType: "address",
                  name: "outputToken",
                  type: "address",
                },
                {
                  internalType: "uint256",
                  name: "inputAmount",
                  type: "uint256",
                },
                { internalType: "bool", name: "isSwap", type: "bool" },
                {
                  internalType: "string",
                  name: "commandString",
                  type: "string",
                },
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

        // Check if conditions are met
        const shouldExecute = await evaluateCondition(permit.commandString, {
          owner: permit.owner,
          agent: account.address,
        });

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
exports.checkAndTryPermits = functions.http(
  "checkAndTryPermits",
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
