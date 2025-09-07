# Ezana Finance

A comprehensive personal finance management application built with modern web technologies and deployed on Microsoft Azure.

## 🚀 Tech Stack

### Frontend
- **React 19** with TypeScript
- **Tailwind CSS 4** for styling
- **React Query** (@tanstack/react-query) for data fetching
- **React Router 7** for navigation
- **Vite** as build tool

### Backend
- **FastAPI** (Python) for REST API
- **SQLAlchemy** for database ORM
- **PostgreSQL** (production) / SQLite (development)
- **JWT** authentication
- **Pydantic** for data validation

### Deployment
- **Azure Static Web Apps** for frontend
- **Azure App Service** for backend API
- **Azure Database for PostgreSQL** (production)

## 📋 Features

- **User Authentication**: Secure registration and login
- **Dashboard**: Overview of financial status
- **Account Management**: Multiple account types (checking, savings, credit, investment)
- **Transaction Tracking**: Income, expenses, and transfers
- **Budget Management**: Set and monitor budgets with alerts
- **Financial Reports**: Monthly summaries and category breakdowns
- **Responsive Design**: Works on desktop and mobile devices

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+
- Git

### Frontend Setup
```bash
cd app
npm install
npm run dev
```
The frontend will be available at http://localhost:5173

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```
The API will be available at http://localhost:8000
- Interactive API docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Environment Configuration

#### Frontend (.env in app/ directory)
```
VITE_API_URL=http://localhost:8000
```

#### Backend (.env in backend/ directory)
```
DATABASE_URL=sqlite:///./ezana_finance.db
ENVIRONMENT=development
SECRET_KEY=your-super-secret-jwt-key-here-change-this-in-production
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

## 🚀 Azure Deployment

### Backend (Azure App Service)
1. Create an Azure App Service with Python 3.11 runtime
2. Set up environment variables in Azure portal:
   - `DATABASE_URL`: PostgreSQL connection string
   - `SECRET_KEY`: Strong JWT secret key
   - `ENVIRONMENT`: production
   - `CORS_ORIGINS`: Your frontend domain
3. Deploy using GitHub Actions (configured in `backend/azure-deploy.yml`)

### Frontend (Azure Static Web Apps)
1. Create an Azure Static Web App
2. Connect to your GitHub repository
3. Set build configuration:
   - App location: `/app`
   - Output location: `dist`
4. The deployment workflow is in `app/.github/workflows/azure-static-web-apps.yml`

## 📁 Project Structure

```
EzanaFinance3/
├── app/                          # Frontend React application
│   ├── src/
│   │   ├── components/           # Reusable UI components
│   │   ├── contexts/            # React contexts (Auth)
│   │   ├── lib/                 # API utilities
│   │   ├── pages/               # Page components
│   │   └── ...
│   ├── package.json
│   └── vite.config.ts
├── backend/                      # FastAPI backend
│   ├── routers/                 # API route handlers
│   │   ├── auth.py
│   │   ├── accounts.py
│   │   ├── transactions.py
│   │   └── budgets.py
│   ├── models.py                # Database models
│   ├── schemas.py               # Pydantic schemas
│   ├── database.py              # Database configuration
│   ├── main.py                  # FastAPI app
│   └── requirements.txt
└── README.md
```

## 🔧 API Endpoints

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
- `GET /api/transactions/summary/monthly` - Monthly summary

### Budgets
- `GET /api/budgets/` - List budgets
- `POST /api/budgets/` - Create budget
- `GET /api/budgets/status/overview` - Budget overview

## 🔒 Security Features

- Password hashing with bcrypt
- JWT token-based authentication
- CORS configuration
- Input validation with Pydantic
- SQL injection protection via SQLAlchemy ORM

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd app
npm test
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Support

For support, email [your-email@example.com] or create an issue in the GitHub repository.