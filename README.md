# Omega Nobi Wallet Tracker

A comprehensive crypto wallet portfolio tracker built with NestJS, MySQL, and Alchemy API. This application allows you to track multiple crypto wallets across different networks, with smart filtering to avoid dust/spam tokens using a whitelist system.

## Features

- 🏦 **Multi-Wallet Management**: Track multiple wallet addresses with custom names and descriptions
- 🌐 **Multi-Network Support**: Support for Ethereum, Polygon, and other EVM networks
- 🔍 **Alchemy Integration**: Real-time token balance fetching using Alchemy's powerful API
- ⚡ **Smart Filtering**: Automatic spam/dust token detection and whitelist system
- ⏰ **Automated Tracking**: Scheduled balance updates every 5 minutes
- 💰 **USD Values**: Real-time USD price tracking for whitelisted tokens
- 📊 **Portfolio Analytics**: Total portfolio value and detailed balance breakdowns
- 🔒 **Database Storage**: Persistent data storage using MySQL
- 📚 **API Documentation**: Complete Swagger/OpenAPI documentation
- 🎯 **RESTful API**: Clean REST endpoints for all operations

## Prerequisites

- Node.js 18+ 
- MySQL 5.7+
- Alchemy API Key ([Get one here](https://www.alchemy.com/))

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd omega_nobi_wallet
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Database configuration
   DATABASE_HOST=localhost
   DATABASE_PORT=3306
   DATABASE_USERNAME=your_mysql_username
   DATABASE_PASSWORD=your_mysql_password
   DATABASE_NAME=omega_nobi_wallet

   # Alchemy API configuration
   ALCHEMY_API_KEY=your_alchemy_api_key_here
   ALCHEMY_BASE_URL=https://api.g.alchemy.com/data/v1

   # Application configuration
   APP_PORT=3000
   NODE_ENV=development
   ```

4. **Create MySQL database**
   ```sql
   CREATE DATABASE omega_nobi_wallet;
   ```

5. **Run database migrations** (if any)
   ```bash
   npm run migration:run
   ```

## Usage

### Development

Start the development server:
```bash
npm run start:dev
```

The API will be available at:
- **API**: http://localhost:3000/api/v1
- **Swagger Documentation**: http://localhost:3000/api/docs

### Production

Build and start the production server:
```bash
npm run build
npm run start:prod
```

## API Endpoints

### Wallets
- `GET /api/v1/wallets` - Get all wallets
- `POST /api/v1/wallets` - Create a new wallet
- `GET /api/v1/wallets/:id` - Get wallet by ID
- `GET /api/v1/wallets/address/:address` - Get wallet by address
- `PATCH /api/v1/wallets/:id` - Update wallet
- `DELETE /api/v1/wallets/:id` - Delete wallet
- `GET /api/v1/wallets/:id/balances` - Get wallet token balances
- `GET /api/v1/wallets/:id/total-value` - Get total USD value

### Whitelist
- `GET /api/v1/whitelist` - Get all whitelisted tokens
- `POST /api/v1/whitelist` - Add token to whitelist
- `GET /api/v1/whitelist/:id` - Get whitelist token by ID
- `PATCH /api/v1/whitelist/:id` - Update whitelist token
- `DELETE /api/v1/whitelist/:id` - Remove token from whitelist
- `POST /api/v1/whitelist/initialize-defaults` - Initialize default tokens
- `GET /api/v1/whitelist/check/:network/:tokenAddress` - Check if token is whitelisted

### Tracker
- `POST /api/v1/tracker/track-all` - Manually trigger tracking for all wallets
- `POST /api/v1/tracker/track/:walletId` - Track specific wallet
- `GET /api/v1/tracker/stats` - Get tracking statistics

## Examples

### Adding a Wallet

```bash
curl -X POST http://localhost:3000/api/v1/wallets \\
  -H "Content-Type: application/json" \\
  -d '{
    "address": "0x455e53cbb86018ac2b8092fdcd39d8444affc3f6",
    "name": "My Main Wallet",
    "description": "Primary DeFi wallet",
    "networks": ["eth-mainnet", "polygon-mainnet"],
    "active": true
  }'
```

### Adding a Token to Whitelist

```bash
curl -X POST http://localhost:3000/api/v1/whitelist \\
  -H "Content-Type: application/json" \\
  -d '{
    "tokenAddress": "0xa0b86a33e6ba23340b2b5b58c9634a4412ccdd0d",
    "network": "eth-mainnet",
    "symbol": "USDC",
    "name": "USD Coin",
    "decimals": 6,
    "category": "stablecoin",
    "minBalance": "0.01"
  }'
```

### Getting Wallet Balances (Filtered)

```bash
# Get only whitelisted tokens, excluding dust
curl "http://localhost:3000/api/v1/wallets/{walletId}/balances?whitelistedOnly=true&excludeDust=true"
```

## Database Schema

### Wallets Table
- `id` (UUID) - Primary key
- `address` (VARCHAR) - Wallet address (unique)
- `name` (VARCHAR) - Optional wallet name
- `description` (TEXT) - Optional description
- `active` (BOOLEAN) - Whether wallet is being tracked
- `networks` (JSON) - Array of network names
- `lastTracked` (TIMESTAMP) - Last tracking time
- `createdAt` / `updatedAt` (TIMESTAMP)

### Wallet Balances Table
- `id` (UUID) - Primary key
- `walletId` (UUID) - Foreign key to wallets
- `tokenAddress` (VARCHAR) - Token contract address (null for native)
- `network` (VARCHAR) - Network name
- `balance` (VARCHAR) - Raw hex balance
- `balanceDecimal` (DECIMAL) - Human-readable balance
- `usdValue` (DECIMAL) - USD value if available
- `symbol`, `name`, `decimals`, `logo` - Token metadata
- `isWhitelisted` (BOOLEAN) - Whether token is whitelisted
- `isDust` (BOOLEAN) - Whether token is flagged as spam/dust
- `createdAt` / `updatedAt` (TIMESTAMP)

### Whitelist Tokens Table
- `id` (UUID) - Primary key
- `tokenAddress` (VARCHAR) - Token contract address (null for native)
- `network` (VARCHAR) - Network name
- `symbol`, `name`, `decimals`, `logo` - Token metadata
- `active` (BOOLEAN) - Whether token is active in whitelist
- `category` (VARCHAR) - Token category (stablecoin, defi, etc.)
- `minBalance` (DECIMAL) - Minimum balance to track
- `description` (TEXT) - Token description
- `createdAt` / `updatedAt` (TIMESTAMP)

## Spam/Dust Detection

The application automatically identifies spam tokens using these patterns:
- Tokens with suspicious names/symbols containing URLs
- Tokens with "claim", "airdrop", "visit" keywords
- Tokens mimicking popular tokens (USDT, ETH, etc.)
- Tokens with promotional messages in metadata

Detected spam tokens are flagged as `isDust: true` and can be filtered out.

## Scheduled Tasks

- **Wallet Tracking**: Runs every 5 minutes to update balances for all active wallets
- **Rate Limiting**: 1-second delay between wallet tracking requests to respect API limits

## Configuration

Key configuration options in `.env`:

- `BALANCE_UPDATE_INTERVAL`: How often to update balances (default: 300000ms = 5 minutes)
- `DATABASE_*`: MySQL connection settings
- `ALCHEMY_API_KEY`: Your Alchemy API key
- `APP_PORT`: Server port (default: 3000)

## Error Handling

The application includes comprehensive error handling:
- Database connection failures
- Alchemy API rate limits and errors
- Invalid wallet addresses
- Duplicate wallet/token entries
- Missing required fields

## Development

### Scripts

- `npm run start:dev` - Development server with hot reload
- `npm run build` - Build for production
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run migration:generate` - Generate new migration
- `npm run migration:run` - Run pending migrations

### Adding New Networks

To support additional networks:

1. Add network name to supported networks in validation
2. Update default tokens in `WhitelistService.createDefaultTokens()`
3. Ensure Alchemy API supports the network

## Monitoring

Track application health using these endpoints:

- `GET /api/v1/tracker/stats` - Get tracking statistics
- Check logs for tracking cycles and errors
- Monitor database growth and performance

## Security Considerations

- Store sensitive environment variables securely
- Use HTTPS in production
- Implement authentication if needed
- Regular database backups
- Monitor for suspicious API usage

## Troubleshooting

### Common Issues

1. **Database Connection Fails**
   - Check MySQL is running
   - Verify credentials in `.env`
   - Ensure database exists

2. **Alchemy API Errors**
   - Verify API key is valid
   - Check API rate limits
   - Ensure sufficient Alchemy credits

3. **No Balances Showing**
   - Initialize default whitelist tokens
   - Check if wallet is marked as active
   - Verify networks are correctly configured

4. **High Database Growth**
   - Implement balance history cleanup
   - Consider archiving old data
   - Optimize whitelist to reduce tracked tokens

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

[Your License Here]

## Support

For support, please [create an issue](link-to-issues) or contact [your-email].