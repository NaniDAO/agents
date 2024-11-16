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

async function getWeather(city) {
  try {
    const response = await fetch(
      `https://api.tomorrow.io/v4/weather/forecast?location=${city}&apikey=${process.env.WEATHER_API_KEY}`,
    );

    if (!response.ok) {
      console.error(response);
      throw new Error("Weather API request failed");
    }

    const data = await response.json();

    return data.timelines.hourly[0];
  } catch (error) {
    console.error("Error fetching weather data:", error);
    return { error: error?.message };
  }
}

async function checkCondition(prompt) {
  try {
    const cityCompletion = await openai.chat.completions.create({
      model: "anthropic/claude-3.5-sonnet",
      messages: [
        {
          role: "system",
          content: `Extract and format the location for the Tomorrow.io weather API.

    Rules:
    - Format US cities as: CityName,StateName,USA (example: NewYork,NY,USA)
    - Format international cities with country: CityName
    - Use no spaces, separate with commas
    - Capitalize city names appropriately

    Common examples:
    - NewYork,NY,USA
    - LosAngeles,CA,USA
    - London
    - Paris
    - Tokyo
    - NewDelhi
    - Dubai
    - Singapore
    - Samui

    Respond with ONLY the formatted location string.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const city = cityCompletion.choices[0]?.message?.content?.trim();

    if (!city) {
      console.error("Could not extract city from prompt");
      return false;
    }

    // Get weather data for the city
    const weatherData = await getWeather(city);
    console.log("WEATHER DATA: ", weatherData);

    // Make the final decision based on weather data
    const decisionCompletion = await openai.chat.completions.create({
      model: "anthropic/claude-3.5-sonnet",
      messages: [
        {
          role: "system",
          content:
            "Based on the weather data and prompt condition, determine if the condition is met. Respond with ONLY 'true' or 'false'.",
        },
        {
          role: "user",
          content: `Weather condition prompt: "${prompt}"\nCurrent weather data: ${JSON.stringify(weatherData)}`,
        },
      ],
    });

    const decision = decisionCompletion.choices[0]?.message?.content
      ?.trim()
      .toLowerCase();

    return decision === "true";
  } catch (error) {
    console.error("Error in checkCondition:", error);
    return false;
  }
}

async function executePermits() {
  try {
    const PRIVATE_KEY = process.env.AGENT_PK;

    if (!PRIVATE_KEY) {
      throw new Error("Set agent private key");
    }

    const account = privateKeyToAccount(PRIVATE_KEY);
    console.log("ACCOUNT: ", account.address);

    const walletClient = createWalletClient({
      chain: base,
      account: account,
      transport: http(),
    });

    const publicClient = createPublicClient({
      chain: base,
      transport: http(),
    });

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

    for await (const permit of activePermits) {
      console.log("PERMIT", permit);
      const shouldExecute = await checkCondition(permit.prompt);
      console.log("SHOULD EXECUTE", shouldExecute);
      if (shouldExecute) {
        console.log("Executing permit:", permit.commandString);
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
      }
    }
  } catch (error) {
    console.error("Error in main:", error);
    process.exit(1);
  }
}

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
