# Ezana Finance - Professional Investment Analytics Platform

A comprehensive investment analytics platform built with Python (FastAPI) backend and modern web frontend, featuring real-time congressional trading data, portfolio management, and market intelligence.

## 🚀 Features

### Core Portfolio Management
- **Personal Portfolio Dashboard**: Real-time portfolio tracking with interactive cards
- **Asset Allocation Analysis**: Visual breakdown of investments by asset class, sector, and performance
- **Risk Assessment**: Automated risk scoring and portfolio balance recommendations
- **Dividend Tracking**: Monthly dividend income monitoring and projections

### Market Intelligence (Inside The Capitol)
- **Congressional Trading Data**: Real-time tracking of congress members' stock trades
- **Government Contracts**: Monitor government contract awards and their market impact
- **Lobbying Activity**: Track lobbying expenditures and their correlation with market movements
- **Patent Momentum**: Analyze patent filings and their impact on stock performance

### Advanced Analytics
- **Watchlists**: Follow specific congress members and track their trading patterns
- **Community Features**: Connect with other investors and share insights
- **Research Tools**: Comprehensive market analysis and company research tools
- **Economic Indicators**: Real-time economic data and market sentiment analysis

## 🛠️ Tech Stack

### Backend (Python)
- **FastAPI**: Modern, fast web framework for building APIs
- **SQLAlchemy**: Database ORM with PostgreSQL/SQLite support
- **Pydantic**: Data validation and settings management
- **httpx**: Async HTTP client for external API integration
- **JWT Authentication**: Secure user authentication and authorization

### Frontend (Modern Web)
- **Vanilla JavaScript**: Lightweight, fast, and responsive
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **Chart.js**: Interactive charts and data visualization
- **Bootstrap Icons**: Comprehensive icon library

### External APIs
- **Quiver Quantitative API**: Congressional trading and government data
- **Market Data APIs**: Real-time stock prices and market information

## 📋 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+ (for frontend development)
- PostgreSQL (production) or SQLite (development)

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/CRONANANI/EzanaFinance3.git
   cd EzanaFinance3
   ```

2. **Set up Python environment**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run database migrations**
   ```bash
   alembic upgrade head
   ```

5. **Start the backend server**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup

The frontend is served directly by the FastAPI backend. Simply navigate to:
```
http://localhost:8000
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Database
DATABASE_URL=sqlite:///./ezana_finance.db
# For PostgreSQL: DATABASE_URL=postgresql://username:password@localhost/dbname

# Security
SECRET_KEY=your-super-secret-jwt-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# External APIs
QUIVER_API_KEY=your-quiver-api-key
FINNHUB_API_KEY=your-finnhub-api-key

# Environment
ENVIRONMENT=development
DEBUG=True

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8000
```

## 📁 Project Structure

```
EzanaFinance3/
├── backend/                     # FastAPI Python backend
│   ├── routers/                # API route handlers
│   │   ├── auth.py            # Authentication endpoints
│   │   ├── accounts.py        # Account management
│   │   ├── transactions.py    # Transaction handling
│   │   ├── budgets.py         # Budget management
│   │   ├── quiver.py          # Quiver API integration
│   │   └── market_research.py # Market research endpoints
│   ├── models.py              # Database models
│   ├── schemas.py             # Pydantic schemas
│   ├── database.py            # Database configuration
│   ├── main.py                # FastAPI application
│   └── requirements.txt       # Python dependencies
├── app/                        # Frontend web application
│   ├── index.html             # Main HTML file
│   ├── app.js                 # JavaScript functionality
│   ├── styles.css             # Custom CSS styles
│   └── dist/                  # Built assets (if using build tools)
└── README.md                  # This file
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info

### Portfolio Management
- `GET /api/accounts/` - List user accounts
- `POST /api/accounts/` - Create new account
- `GET /api/transactions/` - List transactions
- `POST /api/transactions/` - Create transaction
- `GET /api/budgets/` - List budgets
- `POST /api/budgets/` - Create budget

### Market Intelligence
- `GET /api/quiver/congressional-trading` - Congressional trading data
- `GET /api/quiver/government-contracts` - Government contracts
- `GET /api/quiver/house-trading` - House trading data
- `GET /api/quiver/senator-trading` - Senate trading data
- `GET /api/quiver/lobbying-activity` - Lobbying activity
- `GET /api/quiver/patent-momentum` - Patent data

### Market Research
- `GET /MarketResearch/API/Quiver/CongressionalTrading` - Congressional trading
- `GET /MarketResearch/API/Quiver/GovernmentContracts` - Government contracts
- `GET /MarketResearch/API/Quiver/HouseTrading` - House trading
- `GET /MarketResearch/API/Quiver/LobbyingActivity` - Lobbying data

## 🎯 Key Features Explained

### Congressional Trading Tracker
Monitor real-time congressional trading activity with:
- **Follow System**: Star and follow specific congress members
- **Advanced Filtering**: Filter by trade type, party, chamber
- **Portfolio Analysis**: View detailed portfolio summaries for congress members
- **Notification System**: Get alerts for trades by followed members

### Interactive Dashboard
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Dark/Light Mode**: Toggle between themes
- **Real-time Updates**: Live data refresh with loading indicators
- **Expandable Cards**: Detailed views with charts and tables

### Data Visualization
- **Portfolio Charts**: Interactive charts showing portfolio performance
- **Asset Allocation**: Pie charts with sector and performance breakdowns
- **Trading Tables**: Sortable, filterable tables with pagination
- **Risk Metrics**: Visual risk assessment with color-coded indicators

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt password hashing
- **CORS Configuration**: Configurable cross-origin resource sharing
- **Input Validation**: Pydantic model validation
- **SQL Injection Protection**: SQLAlchemy ORM protection

## 🚀 Deployment

### Development
```bash
# Backend
cd backend
uvicorn main:app --reload

# Frontend is served at http://localhost:8000
```

### Production (Azure)

#### Backend (Azure App Service)
1. Create Azure App Service with Python 3.11
2. Configure environment variables in Azure portal
3. Deploy using GitHub Actions or Azure CLI

#### Frontend (Azure Static Web Apps)
The frontend is served directly by the FastAPI backend, so no separate deployment needed.

### Docker Deployment
```bash
# Build and run with Docker
docker build -t ezana-finance .
docker run -p 8000:8000 ezana-finance
```

## 📊 Database Schema

### Core Tables
- **users**: User authentication and profile data
- **accounts**: Financial accounts (checking, savings, investment)
- **transactions**: Financial transactions and transfers
- **budgets**: Budget planning and tracking

### Market Intelligence Tables
- **congress_trading_data**: Congressional trading records
- **government_contract_data**: Government contract awards
- **lobbying_activity_data**: Lobbying expenditure records
- **followed_congress_people**: User's followed congress members
- **watchlists**: User's stock watchlists

## 🧪 Testing

```bash
# Run backend tests
cd backend
pytest

# Run with coverage
pytest --cov=.
```

## 📈 Performance

- **Fast API Response**: Sub-100ms API response times
- **Efficient Caching**: Redis caching for external API calls
- **Database Optimization**: Indexed queries and connection pooling
- **Frontend Optimization**: Minified assets and lazy loading

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in the `/docs` folder
- Review the API documentation at `http://localhost:8000/docs`

## 🔮 Roadmap

### Upcoming Features
- **AI-Powered Insights**: Machine learning analysis of trading patterns
- **Mobile App**: React Native mobile application
- **Social Features**: Enhanced community and sharing features
- **Advanced Analytics**: More sophisticated market analysis tools
- **Real-time Notifications**: Push notifications for important events

### Version History
- **v1.0.0**: Initial release with core portfolio management
- **v2.0.0**: Added congressional trading tracker
- **v3.0.0**: Enhanced market intelligence and community features

---

**Built with ❤️ by the Ezana Finance Team**

For more information, visit our [GitHub repository](https://github.com/CRONANANI/EzanaFinance3) or check out the live demo.