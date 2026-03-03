# Ezana Finance Backend

Firebase Cloud Functions backend with Plaid, Finnhub, and QuiverQuant integrations.

## Architecture

- **Firebase Cloud Functions**: Serverless API (Node.js/TypeScript)
- **Firestore**: User profiles, real-time cache
- **PostgreSQL**: Portfolios, holdings, transactions, price history, congressional trades
- **External APIs**: Plaid, Finnhub, QuiverQuant

## Setup

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

### 2. Create Firebase Project

```bash
firebase use --add
# Select or create project "ezana-finance"
```

### 3. Enable Firebase Services

In [Firebase Console](https://console.firebase.google.com):

- Enable **Authentication** (Email/Password, Google)
- Enable **Firestore Database**
- Enable **Realtime Database** (for quote cache)

### 4. PostgreSQL

Create database and run schema:

```bash
createdb ezana_finance
psql ezana_finance -f database/schema.sql
```

For local development, ensure PostgreSQL is running and set env vars.

### 5. Environment Variables

Copy and configure:

```bash
cp .env.example .env
# Edit .env with your API keys
```

For Cloud Functions, set via Firebase:

```bash
firebase functions:config:set \
  postgres.host="your-host" \
  postgres.port="5432" \
  postgres.db="ezana_finance" \
  postgres.user="your-user" \
  postgres.password="your-password" \
  plaid.client_id="your-client-id" \
  plaid.secret="your-secret" \
  plaid.env="sandbox" \
  finnhub.api_key="your-key" \
  quiver.api_key="your-key"
```

Use `firebase functions:config:get` to view. Functions read from `process.env` when using dotenv or Functions config.

### 6. Install & Build

```bash
cd functions
npm install
npm run build
```

### 7. Deploy

```bash
firebase deploy --only functions
```

## API Endpoints

Base URL: `https://us-central1-ezana-finance.cloudfunctions.net/api`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /health | No | Health check |
| GET | /auth/me | Yes | Current user |
| GET | /portfolio | Yes | List portfolios |
| POST | /portfolio/link-token | Yes | Plaid link token |
| POST | /portfolio/exchange-token | Yes | Exchange Plaid token |
| POST | /portfolio/sync | Yes | Sync portfolios |
| GET | /market/quote/:symbol | Optional | Stock quote |
| POST | /market/quotes | Optional | Batch quotes |
| GET | /market/history/:symbol | Optional | Price history |
| GET | /market/profile/:symbol | Optional | Company profile |
| GET | /congress/trades | Optional | Congressional trades |
| GET | /congress/trades/trending | Optional | Trending stocks |
| GET | /congress/lobbying | Optional | Lobbying data |
| GET | /congress/contracts | Optional | Gov contracts |

## Scheduled Functions

- **updatePrices**: Every 5 min (market hours) - Refresh quote cache
- **syncCongressionalTrades**: Daily midnight - Sync congress data
- **syncPortfolios**: Hourly (market hours) - Sync Plaid accounts
- **fetchHistoricalData**: Weekly Sunday 2am - Fetch price history

## Auth Triggers

- **onUserCreate**: Sync new Firebase user to PostgreSQL
- **onUserDelete**: Clean up user data from all databases
