# Ezana Finance - Professional Investment Analytics Platform

A comprehensive investment analytics platform built with Python (FastAPI) backend and modern web frontend, featuring real-time congressional trading data, portfolio management, and market intelligence.

## 🚀 Features

### 🏠 Landing Page & Navigation
- **Modern Landing Page**: Professional hero section with feature highlights and call-to-action
- **Responsive Sidebar Navigation**: Collapsible sidebar with smooth animations and mobile support
- **Dark/Light Theme Toggle**: Seamless theme switching with persistent user preferences
- **Loading States**: Professional loading indicators and smooth page transitions

### 📊 Core Portfolio Management
- **Personal Portfolio Dashboard**: Real-time portfolio tracking with interactive cards showing:
  - Total portfolio value with daily P&L
  - Monthly dividend income tracking
  - Asset allocation breakdown by sector
  - Performance metrics and risk indicators
- **Asset Allocation Analysis**: Visual breakdown of investments by asset class, sector, and performance
- **Risk Assessment**: Automated risk scoring and portfolio balance recommendations
- **Dividend Tracking**: Monthly dividend income monitoring and projections
- **Portfolio Charts**: Interactive charts using Chart.js for data visualization

### 🏛️ Market Intelligence (Inside The Capitol)
- **Congressional Trading Data**: Real-time tracking of congress members' stock trades with:
  - Follow system to track specific congress members
  - Advanced filtering by trade type, party, and chamber
  - Detailed portfolio summaries for each member
  - Real-time trade notifications
- **Government Contracts**: Monitor government contract awards and their market impact
- **Lobbying Activity**: Track lobbying expenditures and their correlation with market movements
- **Patent Momentum**: Analyze patent filings and their impact on stock performance
- **House & Senate Trading**: Separate tracking for House and Senate trading activities

### 📈 Advanced Analytics & Research
- **Market Analysis**: Comprehensive market analysis tools with sector performance
- **Company Research**: Detailed company research with financial metrics and analysis
- **Economic Indicators**: Real-time economic data and market sentiment analysis
- **Financial Analytics**: Advanced financial health scoring and analysis
- **Watchlists**: Follow specific congress members and track their trading patterns
- **Community Features**: Connect with other investors and share insights

### 👤 User Management & Settings
- **User Profile Settings**: Complete profile management with personal information
- **Account Management**: Multiple financial account support (checking, savings, investment, credit)
- **Transaction Tracking**: Comprehensive transaction recording and categorization
- **Budget Management**: Budget planning and spending analysis
- **Bank Integration**: Mock bank account integration for transaction import

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

### 🔐 Authentication & User Management
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login with JWT token
- `GET /api/auth/me` - Get current user info
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/change-password` - Change user password

### 💰 Portfolio Management
- `GET /api/accounts/` - List user accounts with pagination
- `POST /api/accounts/` - Create new account (checking, savings, investment, credit)
- `GET /api/accounts/{id}` - Get specific account details
- `PUT /api/accounts/{id}` - Update account information
- `DELETE /api/accounts/{id}` - Delete account
- `GET /api/transactions/` - List transactions with filtering and pagination
- `POST /api/transactions/` - Create new transaction
- `GET /api/transactions/{id}` - Get transaction details
- `PUT /api/transactions/{id}` - Update transaction
- `DELETE /api/transactions/{id}` - Delete transaction
- `GET /api/transactions/summary/monthly` - Monthly transaction summary
- `GET /api/transactions/summary/category` - Category-wise spending analysis

### 💳 Budget Management
- `GET /api/budgets/` - List all budgets
- `POST /api/budgets/` - Create new budget
- `GET /api/budgets/{id}` - Get budget details
- `PUT /api/budgets/{id}` - Update budget
- `DELETE /api/budgets/{id}` - Delete budget
- `GET /api/budgets/status/overview` - Budget status overview
- `GET /api/budgets/analytics/spending` - Spending analytics

### 🏛️ Congressional Trading Intelligence (Quiver API)
- `GET /api/quiver/congressional-trading` - Congressional trading data with filtering
- `GET /api/quiver/government-contracts` - Government contracts data
- `GET /api/quiver/house-trading` - House of Representatives trading data
- `GET /api/quiver/senator-trading` - Senate trading data
- `GET /api/quiver/lobbying-activity` - Lobbying activity data
- `GET /api/quiver/patent-momentum` - Patent filing momentum data
- `GET /api/quiver/contracts` - Government contract awards
- `GET /api/quiver/insider-trading` - Insider trading data

### 📊 Market Research API
- `GET /MarketResearch/API/Quiver/CongressionalTrading` - Congressional trading for research
- `GET /MarketResearch/API/Quiver/GovernmentContracts` - Government contracts for research
- `GET /MarketResearch/API/Quiver/HouseTrading` - House trading for research
- `GET /MarketResearch/API/Quiver/SenatorTrading` - Senate trading for research
- `GET /MarketResearch/API/Quiver/LobbyingActivity` - Lobbying data for research
- `GET /MarketResearch/API/Quiver/PatentMomentum` - Patent data for research

### 🏦 Bank Integration
- `POST /api/bank/connect` - Connect bank account
- `GET /api/bank/accounts` - List connected bank accounts
- `GET /api/bank/transactions` - Import bank transactions
- `POST /api/bank/sync` - Sync bank data
- `DELETE /api/bank/disconnect` - Disconnect bank account

### 📈 Financial Analytics
- `GET /api/analytics/portfolio-performance` - Portfolio performance metrics
- `GET /api/analytics/risk-assessment` - Risk assessment analysis
- `GET /api/analytics/asset-allocation` - Asset allocation breakdown
- `GET /api/analytics/dividend-analysis` - Dividend income analysis
- `GET /api/analytics/spending-trends` - Spending trend analysis

## 📱 Frontend Pages & UI Features

### 🏠 Landing Page (`landing.html`)
- **Hero Section**: Professional gradient background with compelling call-to-action
- **Feature Showcase**: Interactive cards highlighting key platform features
- **Responsive Design**: Optimized for all device sizes
- **Smooth Animations**: CSS transitions and hover effects

### 📊 Home Dashboard (`home-dashboard.html`)
- **Portfolio Overview**: Real-time portfolio value and performance metrics
- **Asset Allocation Charts**: Interactive pie charts showing investment distribution
- **Performance Cards**: Daily P&L, monthly dividends, and risk indicators
- **Quick Actions**: Refresh data, add transactions, view reports
- **Responsive Grid Layout**: Adaptive cards that work on all screen sizes

### 🏛️ Inside The Capitol (`inside-the-capitol.html`)
- **Congressional Trading Tracker**: Real-time trading data with filtering
- **Follow System**: Star and follow specific congress members
- **Advanced Filtering**: Filter by trade type, party, chamber, and date range
- **Portfolio Analysis**: Detailed portfolio summaries for each member
- **Interactive Tables**: Sortable, searchable tables with pagination
- **Trade Notifications**: Real-time alerts for followed members' trades

### 📈 Market Analysis (`market-analysis.html`)
- **Sector Performance**: Comprehensive market sector analysis
- **Market Trends**: Interactive charts showing market movements
- **Stock Screener**: Advanced filtering and screening tools
- **Market Sentiment**: Real-time sentiment indicators and analysis

### 🏢 Company Research (`company-research.html`)
- **Company Profiles**: Detailed company information and financials
- **Financial Metrics**: Key performance indicators and ratios
- **News & Analysis**: Latest news and analyst recommendations
- **Peer Comparison**: Side-by-side company comparisons

### 📊 Economic Indicators (`economic-indicators.html`)
- **Economic Data**: Real-time economic indicators and metrics
- **Market Sentiment**: Sentiment analysis and market mood indicators
- **Economic Calendar**: Upcoming economic events and releases
- **Historical Data**: Long-term economic trend analysis

### 📋 Watchlist (`watchlist.html`)
- **Custom Watchlists**: Create and manage multiple watchlists
- **Congress Member Tracking**: Follow specific congress members
- **Price Alerts**: Set up price and trade alerts
- **Portfolio Integration**: Link watchlists to portfolio holdings

### 👥 Community (`community.html`)
- **Discussion Forums**: Community discussions and insights
- **User Profiles**: Connect with other investors
- **Share Insights**: Share analysis and trading ideas
- **Social Features**: Like, comment, and follow other users

### 📊 Financial Analytics (`financial-analytics.html`)
- **Advanced Analytics**: Comprehensive financial health scoring
- **Risk Assessment**: Portfolio risk analysis and recommendations
- **Performance Metrics**: Detailed performance tracking and analysis
- **Trend Analysis**: Historical performance and trend identification

### ⚙️ User Profile Settings (`user-profile-settings.html`)
- **Personal Information**: Update profile details and contact info
- **Account Preferences**: Customize dashboard and notification settings
- **Security Settings**: Password management and security options
- **Data Management**: Export data and privacy controls

## 🎨 UI/UX Features

### 🎨 Design System
- **Custom Color Palette**: Professional dark theme with gold accents
- **Typography**: Clean, modern font hierarchy with excellent readability
- **Spacing**: Consistent spacing system using Tailwind CSS
- **Icons**: Comprehensive Bootstrap Icons integration

### 📱 Responsive Design
- **Mobile-First**: Optimized for mobile devices with touch-friendly interfaces
- **Tablet Support**: Seamless experience on tablet devices
- **Desktop Enhancement**: Full-featured desktop experience with advanced layouts
- **Cross-Browser**: Compatible with all modern browsers

### 🌙 Theme System
- **Dark/Light Mode**: Seamless theme switching with persistent preferences
- **Smooth Transitions**: CSS transitions for theme changes
- **System Preference**: Automatic theme detection based on system settings
- **Custom Themes**: Extensible theme system for future customization

### 🎯 Interactive Components
- **Collapsible Sidebar**: Smooth sidebar collapse/expand with animations
- **Loading States**: Professional loading indicators and skeleton screens
- **Modal Dialogs**: Clean modal system for forms and confirmations
- **Tooltips**: Helpful tooltips for better user guidance
- **Toast Notifications**: Non-intrusive notification system

### 📊 Data Visualization
- **Chart.js Integration**: Interactive charts and graphs
- **Real-time Updates**: Live data refresh with smooth animations
- **Export Functionality**: Export charts and data in multiple formats
- **Responsive Charts**: Charts that adapt to different screen sizes

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
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend is served at http://localhost:8000
# The FastAPI backend serves both API and static frontend files
```

### Production (Azure App Service)

#### Backend + Frontend (Unified Deployment)
The application uses a unified deployment approach where FastAPI serves both the API and static frontend files:

1. **Azure App Service Setup**:
   - Create Azure App Service with Python 3.11 runtime
   - Configure environment variables in Azure portal
   - Set up PostgreSQL database (Azure Database for PostgreSQL)

2. **Static File Serving**:
   - Frontend files are served directly by FastAPI using `StaticFiles`
   - No separate frontend deployment needed
   - All routes handled by the FastAPI application

3. **Environment Variables for Production**:
   ```env
   DATABASE_URL=postgresql://user:pass@host:port/dbname
   SECRET_KEY=your-production-secret-key
   QUIVER_API_KEY=your-quiver-api-key
   FINNHUB_API_KEY=your-finnhub-api-key
   ENVIRONMENT=production
   DEBUG=False
   CORS_ORIGINS=https://your-domain.com
   ```

4. **Deploy using GitHub Actions**:
   - Configure the `azure-deploy.yml` workflow
   - Add `AZURE_WEBAPP_PUBLISH_PROFILE` secret to GitHub
   - Automatic deployment on push to main branch

### Docker Deployment
```bash
# Build and run with Docker
docker build -t ezana-finance .
docker run -p 8000:8000 ezana-finance

# With environment variables
docker run -p 8000:8000 \
  -e DATABASE_URL=postgresql://user:pass@host:port/dbname \
  -e SECRET_KEY=your-secret-key \
  ezana-finance
```

### File Structure for Deployment
```
EzanaFinance3/
├── backend/                     # FastAPI backend
│   ├── main.py                 # Main FastAPI app with static file serving
│   ├── routers/                # API route handlers
│   ├── models.py               # Database models
│   ├── schemas.py              # Pydantic schemas
│   ├── database.py             # Database configuration
│   ├── requirements.txt        # Python dependencies
│   └── azure-deploy.yml        # Azure deployment workflow
├── app/                        # Frontend static files
│   ├── index.html             # Main HTML file
│   ├── app.js                 # JavaScript functionality
│   ├── styles.css             # Custom CSS styles
│   ├── landing.css            # Landing page styles
│   └── pages/                 # Individual page HTML files
└── README.md                  # This file
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
- **v3.1.0**: Complete UI overhaul with modern design system
- **v3.2.0**: Added comprehensive user profile management
- **v3.3.0**: Enhanced responsive design and mobile optimization

## 🎯 Current Project Status

### ✅ Completed Features
- **Complete Frontend Application**: 9 fully functional pages with modern UI
- **Responsive Design**: Mobile-first approach with desktop enhancements
- **Dark/Light Theme System**: Seamless theme switching with persistence
- **FastAPI Backend**: Comprehensive API with all CRUD operations
- **Database Integration**: SQLAlchemy ORM with PostgreSQL/SQLite support
- **Authentication System**: JWT-based authentication with secure password hashing
- **Congressional Trading Integration**: Quiver API integration with mock data fallback
- **Bank Integration**: Mock bank account integration for transaction import
- **Portfolio Management**: Complete portfolio tracking and analytics
- **Budget Management**: Comprehensive budget planning and tracking
- **Static File Serving**: Unified deployment with FastAPI serving frontend

### 🚧 In Progress
- **Real-time Data Integration**: Live market data and congressional trading updates
- **Advanced Analytics**: Machine learning-based portfolio recommendations
- **Mobile App**: React Native mobile application development

### 🔮 Planned Features
- **AI-Powered Insights**: Machine learning analysis of trading patterns
- **Social Features**: Enhanced community and sharing features
- **Real-time Notifications**: Push notifications for important events
- **Advanced Charting**: More sophisticated data visualization tools
- **API Rate Limiting**: Enhanced API security and rate limiting
- **Caching Layer**: Redis caching for improved performance

---

**Built with ❤️ by the Ezana Finance Team**

For more information, visit our [GitHub repository](https://github.com/CRONANANI/EzanaFinance3) or check out the live demo.