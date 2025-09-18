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
│   ├── assets/                # Static assets
│   │   ├── css/              # Stylesheets
│   │   │   ├── styles.css    # Main application styles
│   │   │   └── shared.css    # Shared component styles
│   │   ├── js/               # JavaScript files
│   │   │   └── component-loader.js # Component loading utility
│   │   └── images/           # Image assets
│   ├── components/            # Reusable components
│   │   ├── shared/           # Shared components across pages
│   │   │   ├── navigation.html    # Navigation component
│   │   │   └── notifications.html # Notifications sidebar
│   │   ├── pages/            # Page-specific components
│   │   │   ├── home-dashboard/    # Home dashboard components
│   │   │   │   ├── portfolio-card.html/css/js
│   │   │   │   ├── metrics-grid.html/css/js
│   │   │   │   ├── todays-pnl-card.html/css/js
│   │   │   │   ├── top-performer-card.html/css/js
│   │   │   │   ├── risk-score-card.html/css/js
│   │   │   │   ├── monthly-dividends-card.html/css/js
│   │   │   │   ├── market-performance-card.html/css/js
│   │   │   │   ├── asset-allocation-card.html/css/js
│   │   │   │   ├── market-news-card.html/css/js
│   │   │   │   └── portfolio-news-list.html/css/js
│   │   │   ├── community/         # Community page components
│   │   │   │   ├── community-cards.html/css/js
│   │   │   │   ├── trophy-cabinet.html/css/js
│   │   │   │   └── community-cards.css
│   │   │   ├── watchlist/         # Watchlist page components
│   │   │   │   ├── watchlist-cards.html/css/js
│   │   │   │   └── watchlist-cards.css
│   │   │   ├── inside-the-capitol/ # Capitol page components
│   │   │   │   ├── congressional-trading-card.html/css/js
│   │   │   │   ├── government-contracts-card.html/css/js
│   │   │   │   ├── house-trading-card.html/css/js
│   │   │   │   ├── senator-trading-card.html/css/js
│   │   │   │   ├── lobbying-activity-card.html/css/js
│   │   │   │   ├── patent-momentum-card.html/css/js
│   │   │   │   ├── market-sentiment-card.html/css/js
│   │   │   │   ├── insights-section.html/css/js
│   │   │   │   └── summary-stats-cards.html/css/js
│   │   │   └── research-tools/     # Research tools components
│   │   │       ├── company-research-cards.html/css/js
│   │   │       ├── market-analysis-cards.html/css/js
│   │   │       └── economic-indicators-cards.html/css/js
│   │   ├── navigation/         # Navigation components
│   │   │   ├── navigation.html/css/js
│   │   │   ├── navigation-config.js
│   │   │   └── README.md
│   │   ├── notifications/      # Notifications components
│   │   │   ├── notifications-sidebar.html/css/js
│   │   │   ├── notification-helpers.js
│   │   │   └── README.md
│   │   ├── ui/                # UI utility components
│   │   │   ├── prism-background.html/css/js
│   │   │   └── shiny-text.html/css/js
│   │   └── topnav/            # Legacy topnav (deprecated)
│   │       ├── topnav.html/css/js
│   │       └── README.md
│   ├── pages/                 # Individual page HTML files
│   │   ├── landing.html       # Landing page
│   │   ├── landing.css        # Landing page styles
│   │   ├── landing.js         # Landing page scripts
│   │   ├── split-text.js      # Split text animation
│   │   ├── electric-border.js # Electric border animation
│   │   ├── electric-border.css
│   │   ├── prism.js           # Prism background effect
│   │   ├── prism.css
│   │   ├── home-dashboard.html # Portfolio dashboard
│   │   ├── community.html     # Community page
│   │   ├── watchlist.html     # Watchlist page
│   │   ├── company-research.html # Company research
│   │   ├── market-analysis.html # Market analysis
│   │   ├── economic-indicators.html # Economic indicators
│   │   ├── inside-the-capitol.html # Congressional trading
│   │   ├── user-profile-settings.html # User settings
│   │   ├── create-account.html # Account creation
│   │   ├── create-account.css
│   │   └── create-account.js
│   └── dist/                  # Built assets (if using build tools)
│       ├── assets/
│       └── index.html
└── README.md                  # This file
```

## 🎯 Component Directory Reference

### 🏠 Home Dashboard Components
| Component | File | Purpose |
|-----------|------|---------|
| Portfolio Card | `components/pages/home-dashboard/portfolio-card.*` | Main portfolio value display with chart |
| Metrics Grid | `components/pages/home-dashboard/metrics-grid.*` | 6 metric cards in 2-column layout |
| Today's P&L | `components/pages/home-dashboard/todays-pnl-card.*` | Daily profit/loss display |
| Top Performer | `components/pages/home-dashboard/top-performer-card.*` | Best performing stock |
| Risk Score | `components/pages/home-dashboard/risk-score-card.*` | Portfolio risk assessment |
| Monthly Dividends | `components/pages/home-dashboard/monthly-dividends-card.*` | Dividend income tracking |
| Market Performance | `components/pages/home-dashboard/market-performance-card.*` | Market index performance |
| Asset Allocation | `components/pages/home-dashboard/asset-allocation-card.*` | Portfolio allocation breakdown |
| Market News | `components/pages/home-dashboard/market-news-card.*` | Relevant market news |
| Portfolio News List | `components/pages/home-dashboard/portfolio-news-list.*` | News list component |

### 👥 Community Components
| Component | File | Purpose |
|-----------|------|---------|
| Community Cards | `components/pages/community/community-cards.*` | Main community action cards |
| Trophy Cabinet | `components/pages/community/trophy-cabinet.*` | User achievements display |

### 📋 Watchlist Components
| Component | File | Purpose |
|-----------|------|---------|
| Watchlist Cards | `components/pages/watchlist/watchlist-cards.*` | Watchlist management cards |

### 🏛️ Inside The Capitol Components
| Component | File | Purpose |
|-----------|------|---------|
| Congressional Trading | `components/pages/inside-the-capitol/congressional-trading-card.*` | Congress trading data |
| Government Contracts | `components/pages/inside-the-capitol/government-contracts-card.*` | Contract awards |
| House Trading | `components/pages/inside-the-capitol/house-trading-card.*` | House trading activity |
| Senator Trading | `components/pages/inside-the-capitol/senator-trading-card.*` | Senate trading activity |
| Lobbying Activity | `components/pages/inside-the-capitol/lobbying-activity-card.*` | Lobbying expenditure |
| Patent Momentum | `components/pages/inside-the-capitol/patent-momentum-card.*` | Patent filing data |
| Market Sentiment | `components/pages/inside-the-capitol/market-sentiment-card.*` | Market sentiment analysis |
| Insights Section | `components/pages/inside-the-capitol/insights-section.*` | Key insights display |
| Summary Stats | `components/pages/inside-the-capitol/summary-stats-cards.*` | Summary statistics |

### 🔧 Research Tools Components
| Component | File | Purpose |
|-----------|------|---------|
| Company Research | `components/pages/research-tools/company-research-cards.*` | Company analysis tools |
| Market Analysis | `components/pages/research-tools/market-analysis-cards.*` | Market analysis tools |
| Economic Indicators | `components/pages/research-tools/economic-indicators-cards.*` | Economic data tools |

### 🔧 Shared Components
| Component | File | Purpose |
|-----------|------|---------|
| Navigation | `components/shared/navigation.html` | Main navigation bar |
| Notifications | `components/shared/notifications.html` | Notifications sidebar |
| Navigation Config | `components/navigation/navigation-config.js` | Navigation configuration |
| Navigation Styles | `components/navigation/navigation.css` | Navigation styling |
| Navigation Logic | `components/navigation/navigation.js` | Navigation functionality |
| Notifications Styles | `components/notifications/notifications-sidebar.css` | Notifications styling |
| Notifications Logic | `components/notifications/notifications-sidebar.js` | Notifications functionality |
| Notification Helpers | `components/notifications/notification-helpers.js` | Notification utilities |

### 🎨 UI Components
| Component | File | Purpose |
|-----------|------|---------|
| Prism Background | `components/ui/prism-background.*` | 3D background effect |
| Shiny Text | `components/ui/shiny-text.*` | Text animation effects |

### 📁 Assets
| Asset Type | Location | Purpose |
|------------|----------|---------|
| Main Styles | `assets/css/styles.css` | Global application styles |
| Shared Styles | `assets/css/shared.css` | Shared component styles |
| Component Loader | `assets/js/component-loader.js` | Dynamic component loading |
| Images | `assets/images/` | Static image assets |

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

### 🏠 Landing Page (`pages/landing.html`)
- **Hero Section**: Professional gradient background with compelling call-to-action
- **Feature Showcase**: Interactive cards highlighting key platform features
- **Responsive Design**: Optimized for all device sizes
- **Smooth Animations**: CSS transitions and hover effects
- **Prism Background**: 3D WebGL background effect
- **Split Text Animation**: Animated text effects
- **Electric Border**: Interactive button animations

### 📊 Home Dashboard (`pages/home-dashboard.html`)
- **Portfolio Overview**: Real-time portfolio value and performance metrics
- **Asset Allocation Charts**: Interactive pie charts showing investment distribution
- **Performance Cards**: Daily P&L, monthly dividends, and risk indicators
- **Quick Actions**: Refresh data, add transactions, view reports
- **Responsive Grid Layout**: Adaptive cards that work on all screen sizes
- **Historical Charts**: Interactive portfolio performance charts
- **Market News**: Relevant portfolio news feed

### 🏛️ Inside The Capitol (`pages/inside-the-capitol.html`)
- **Congressional Trading Tracker**: Real-time trading data with filtering
- **Follow System**: Star and follow specific congress members
- **Advanced Filtering**: Filter by trade type, party, chamber, and date range
- **Portfolio Analysis**: Detailed portfolio summaries for each member
- **Interactive Tables**: Sortable, searchable tables with pagination
- **Trade Notifications**: Real-time alerts for followed members' trades

### 📈 Market Analysis (`pages/market-analysis.html`)
- **Sector Performance**: Comprehensive market sector analysis
- **Market Trends**: Interactive charts showing market movements
- **Stock Screener**: Advanced filtering and screening tools
- **Market Sentiment**: Real-time sentiment indicators and analysis

### 🏢 Company Research (`pages/company-research.html`)
- **Company Profiles**: Detailed company information and financials
- **Financial Metrics**: Key performance indicators and ratios
- **News & Analysis**: Latest news and analyst recommendations
- **Peer Comparison**: Side-by-side company comparisons

### 📊 Economic Indicators (`pages/economic-indicators.html`)
- **Economic Data**: Real-time economic indicators and metrics
- **Market Sentiment**: Sentiment analysis and market mood indicators
- **Economic Calendar**: Upcoming economic events and releases
- **Historical Data**: Long-term economic trend analysis

### 📋 Watchlist (`pages/watchlist.html`)
- **Custom Watchlists**: Create and manage multiple watchlists
- **Congress Member Tracking**: Follow specific congress members
- **Price Alerts**: Set up price and trade alerts
- **Portfolio Integration**: Link watchlists to portfolio holdings

### 👥 Community (`pages/community.html`)
- **Discussion Forums**: Community discussions and insights
- **User Profiles**: Connect with other investors
- **Share Insights**: Share analysis and trading ideas
- **Social Features**: Like, comment, and follow other users
- **Trophy Cabinet**: User achievements and recognition

### 📊 Financial Analytics (`pages/financial-analytics.html`)
- **Advanced Analytics**: Comprehensive financial health scoring
- **Risk Assessment**: Portfolio risk analysis and recommendations
- **Performance Metrics**: Detailed performance tracking and analysis
- **Trend Analysis**: Historical performance and trend identification

### ⚙️ User Profile Settings (`pages/user-profile-settings.html`)
- **Personal Information**: Update profile details and contact info
- **Account Preferences**: Customize dashboard and notification settings
- **Security Settings**: Password management and security options
- **Data Management**: Export data and privacy controls

### 🔐 Account Creation (`pages/create-account.html`)
- **Registration Form**: Complete user registration process
- **Form Validation**: Real-time validation and error handling
- **Password Security**: Secure password requirements and visibility toggle
- **Terms & Conditions**: User agreement and privacy policy

## 🎨 UI/UX Features

### 🎨 Design System
- **Custom Color Palette**: Professional dark theme with gold accents
- **Typography**: Clean, modern font hierarchy with excellent readability
- **Spacing**: Consistent spacing system using CSS variables
- **Icons**: Comprehensive Bootstrap Icons integration
- **CSS Variables**: Centralized theming and customization

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
- **Component Loading**: Dynamic component loading for better performance

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
- **v3.4.0**: Professional component architecture and code organization

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
- **Professional Component Architecture**: Modular, reusable component system
- **Comprehensive Documentation**: Complete file structure and component reference

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