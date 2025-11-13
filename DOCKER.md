# Docker Deployment Guide

This guide explains how to run the Nobi Wallet Tracker using Docker.

## Prerequisites

- Docker installed (v20.10 or higher)
- Docker Compose installed (v2.0 or higher)
- Alchemy API key

## Quick Start

1. **Setup environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your `ALCHEMY_API_KEY`

2. **Start the application**
   ```bash
   ./docker-start.sh
   ```

3. **Access the application**
   - Application: http://localhost:3000
   - API Documentation: http://localhost:3000/api/docs

## Docker Services

The application runs two services:

### MySQL Database
- **Container**: `nobi-mysql`
- **Port**: 3306
- **Database**: `nobi_wallet_tracker`
- **Credentials**: root / nobicuan888
- **Data**: Persisted in `mysql_data` volume

### NestJS Application
- **Container**: `nobi-wallet-tracker`
- **Port**: 3000
- **Reports**: Stored in `./reports` directory
- **Logs**: View with `docker-compose logs -f app`

## Common Commands

### Start Services
```bash
./docker-start.sh
# or
docker-compose up -d
```

### Stop Services
```bash
./docker-stop.sh
# or
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Application only
docker-compose logs -f app

# MySQL only
docker-compose logs -f mysql
```

### Restart Services
```bash
docker-compose restart

# Restart app only
docker-compose restart app
```

### Rebuild Application
```bash
docker-compose build app
docker-compose up -d app
```

### Access MySQL Shell
```bash
docker exec -it nobi-mysql mysql -u root -pnobicuan888 nobi_wallet_tracker
```

### Access Application Shell
```bash
docker exec -it nobi-wallet-tracker sh
```

## Adding Wallets

Once the services are running, add wallets using the API:

```bash
curl -X POST http://localhost:3000/api/v1/wallets \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x455e53cbb86018ac2b8092fdcd39d8444affc3f6",
    "name": "NOBI LABS LEDGER",
    "networks": ["eth-mainnet", "polygon-mainnet", "arb-mainnet", "bsc-mainnet", "base-mainnet"]
  }'
```

Or use the provided script:
```bash
./scripts/add-wallets.sh
```

## Tracking Wallets

### Manual Tracking
```bash
# Track all wallets
curl -X POST http://localhost:3000/api/v1/tracker/track-all

# Get tracking stats
curl http://localhost:3000/api/v1/tracker/stats
```

### Automatic Tracking
The application automatically tracks all wallets every 5 minutes via cron job.

## Balance Reports

### Generate Report
```bash
curl -X POST http://localhost:3000/api/v1/tracker/reports/generate
```

### View Latest Report
```bash
# JSON format
curl http://localhost:3000/api/v1/tracker/reports/latest

# CSV format
curl http://localhost:3000/api/v1/tracker/reports/latest?format=csv
```

### List All Reports
```bash
curl http://localhost:3000/api/v1/tracker/reports/list
```

Reports are stored in `./reports` directory:
- `balance-report-latest.json`
- `balance-report-latest.csv`
- `balance-report-YYYY-MM-DD.json`
- `balance-report-YYYY-MM-DD.csv`

## Automatic Daily Reports

The application generates balance reports automatically at midnight (00:00) every day.

## Data Persistence

- **MySQL Data**: Stored in Docker volume `mysql_data`
- **Reports**: Stored in `./reports` directory on host machine

To remove all data:
```bash
docker-compose down -v
```

## Troubleshooting

### Services won't start
```bash
# Check logs
docker-compose logs

# Check if ports are available
lsof -i :3000
lsof -i :3306
```

### Application can't connect to database
```bash
# Check MySQL health
docker-compose ps mysql

# Wait for MySQL to be ready
docker-compose up -d mysql
sleep 10
docker-compose up -d app
```

### Rebuild from scratch
```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

## Environment Variables

Required variables in `.env`:

```bash
# Application
NODE_ENV=production
PORT=3000

# Database (use 'mysql' as host for Docker)
DATABASE_HOST=mysql
DATABASE_PORT=3306
DATABASE_USERNAME=root
DATABASE_PASSWORD=nobicuan888
DATABASE_NAME=nobi_wallet_tracker

# Alchemy API
ALCHEMY_API_KEY=your_alchemy_api_key_here
```

## Network Architecture

```
┌─────────────────────────────────────┐
│         Docker Network              │
│        (nobi-network)               │
│                                     │
│  ┌──────────────┐  ┌─────────────┐ │
│  │   MySQL      │  │   NestJS    │ │
│  │ nobi-mysql   │◄─┤    App      │ │
│  │  Port: 3306  │  │ Port: 3000  │ │
│  └──────────────┘  └─────────────┘ │
│         ▲                  ▲        │
└─────────┼──────────────────┼────────┘
          │                  │
    Host: 3306         Host: 3000
          │                  │
     MySQL Client      Web Browser/API
```

## Production Deployment

For production:

1. Change default passwords in `.env`
2. Use secrets management for sensitive data
3. Configure proper backup for `mysql_data` volume
4. Set up reverse proxy (nginx) with SSL
5. Configure firewall rules
6. Enable Docker restart policies
7. Set up monitoring and alerts

## Support

For issues or questions, check:
- Application logs: `docker-compose logs -f app`
- Database logs: `docker-compose logs -f mysql`
- API documentation: http://localhost:3000/api/docs
