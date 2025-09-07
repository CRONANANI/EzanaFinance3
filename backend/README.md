# Ezana Finance API

A comprehensive finance management API built with FastAPI.

## Features

- **User Authentication**: JWT-based authentication with registration and login
- **Account Management**: Create and manage multiple financial accounts
- **Transaction Tracking**: Record income, expenses, and transfers
- **Budget Management**: Set and track budgets with spending analysis
- **Financial Reports**: Monthly summaries and category breakdowns

## Tech Stack

- **FastAPI**: Modern, fast web framework for building APIs
- **SQLAlchemy**: SQL toolkit and ORM
- **PostgreSQL**: Production database (SQLite for development)
- **JWT**: Secure authentication
- **Pydantic**: Data validation and serialization

## Setup

### Development

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run the development server:**
   ```bash
   uvicorn main:app --reload --port 8000
   ```

4. **Access the API:**
   - API: http://localhost:8000
   - Interactive docs: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

### Production (Azure App Service)

1. **Set up Azure App Service:**
   - Create a new App Service with Python runtime
   - Configure environment variables in Azure portal
   - Set up PostgreSQL database

2. **Deploy using GitHub Actions:**
   - Configure the `azure-deploy.yml` workflow
   - Add `AZURE_WEBAPP_PUBLISH_PROFILE` secret to GitHub

3. **Environment Variables for Production:**
   ```
   DATABASE_URL=postgresql://user:pass@host:port/dbname
   SECRET_KEY=your-production-secret-key
   ENVIRONMENT=production
   CORS_ORIGINS=https://your-frontend-domain.com
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Accounts
- `GET /api/accounts/` - List user accounts
- `POST /api/accounts/` - Create new account
- `GET /api/accounts/{id}` - Get account details
- `PUT /api/accounts/{id}` - Update account
- `DELETE /api/accounts/{id}` - Delete account

### Transactions
- `GET /api/transactions/` - List transactions (with filters)
- `POST /api/transactions/` - Create transaction
- `GET /api/transactions/{id}` - Get transaction details
- `PUT /api/transactions/{id}` - Update transaction
- `DELETE /api/transactions/{id}` - Delete transaction
- `GET /api/transactions/summary/monthly` - Monthly summary

### Budgets
- `GET /api/budgets/` - List budgets
- `POST /api/budgets/` - Create budget
- `GET /api/budgets/{id}` - Get budget details
- `PUT /api/budgets/{id}` - Update budget
- `DELETE /api/budgets/{id}` - Delete budget
- `GET /api/budgets/status/overview` - Budget overview

## Database Models

### User
- Email, username, password (hashed)
- First name, last name
- Created/updated timestamps

### Account
- Name, type (checking, savings, credit, investment)
- Balance, currency
- User relationship

### Transaction
- Amount, description, category
- Transaction type (income, expense, transfer)
- Date, account relationship

### Budget
- Name, category, amount, period
- Start/end dates, spent amount
- User relationship

## Security

- Passwords are hashed using bcrypt
- JWT tokens for authentication
- CORS properly configured
- Input validation with Pydantic
- SQL injection protection via SQLAlchemy ORM
