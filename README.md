# Agents
Smart contract automation agents powered by [Permits protocol on Base network](https://basescan.org/address/0xa9606fB9Ebc5c7Fe8bfa78462ad914753BC761c6).

## Weather Agent
The Weather Agent (deployed at `0xd09bb071c4cc9bdf6b104f65df5bccf05add090c`) executes transactions based on weather conditions. It leverages:
- Tomorrow.io API for real-time weather data
- Claude 3.5 for natural language processing
- Viem for blockchain interactions

### Features
- Natural language weather condition parsing
- Support for multiple cities worldwide
- Flexible condition matching (temperature, precipitation, etc.)
- Gas-optimized execution

### Example Prompts
- "Execute when it's raining in London"
- "Trade when temperature exceeds 30°C in Bangkok" 
- "Trigger if wind speed is above 20mph in NewYork"

### Implementation
The agent:
1. Extracts city name from prompt using Claude
2. Fetches current weather from Tomorrow.io
3. Evaluates conditions against weather data
4. Executes permitted transactions when conditions match

### Setup
1. Clone repository
2. Install dependencies: `npm install`
3. Configure environment variables:
   ```
   OPENROUTER_API_KEY=
   WEATHER_API_KEY=
   AGENT_PK=
   ```
4. Deploy using Google Cloud Functions

## Planned Agents
- X Agent: Transaction automation based on tweet patterns
- Price Agent: DeFi automation based on token prices
- Time Agent: Scheduled transaction execution

## Contributing
PRs welcome! Please check issue tracker for current tasks.

## Security
- All agent contracts are open source
- Extensive test coverage required
- Regular security audits planned

## License
AGPL-3.0-or-later
