# Ezana Finance - Professional Investment Analytics Platform

A comprehensive investment analytics platform built with Python (FastAPI) backend and modern web frontend, featuring real-time congressional trading data, portfolio management, and market intelligence.

## 🚀 Features

### 🏠 Landing Page & Navigation
- **Main Landing (`app/index.html`)**: Hero with left-aligned “Ezana Finance” title, “Your Network Is Your Net Worth” tagline, subtitle, and Sign Up / Learn More CTAs (no logo in hero). Antigravity particle background; center card preview hides on scroll past hero.
- **Nav Bar**: “Ezana Finance” text only (no logo icon); nav container aligned with hero content (max-width 1400px, padding 2rem).
- **FAQ Section**: Two-level accordion—categories (Getting Started, Congressional Trading, etc.) collapse by default; click category to expand questions, then click a question to reveal the answer. FAQ HTML inlined so it works without fetch (e.g. file://).
- **Landing Interactivity**: Congressional trading filter pills (All / Purchases / Sales / House / Senate); portfolio metrics auto-rotation; market intelligence tabs (Contracts / Lobbying / Patents); community feed Trending vs Recent toggle; CTAs wired (e.g. Explore Congressional Trading, Discover Market Intelligence → #resources, Join Community → sign-up); resources section with market intelligence links; contact support modal (mailto) from FAQ footer.
- **Responsive Sidebar Navigation**: Collapsible sidebar with smooth animations and mobile support (on other pages)
- **Research Tools Dropdown**: Hover-friendly menu (no gap between trigger and menu; stays open while moving to options; 200ms close delay)
- **Dark/Light Theme Toggle**: Seamless theme switching with persistent user preferences
- **Loading States**: Professional loading indicators and smooth page transitions

### 📊 Core Portfolio Management
- **Personal Portfolio Dashboard**: Real-time portfolio tracking with:
  - Total portfolio value, daily P&L, and time-preset charts (1D–All) with benchmark comparison (S&P 500, NASDAQ) and export (PNG, CSV, PDF)
  - **Enhanced Investment Feed** (left sidebar): filters (Show All, Congress Trades, Portfolio Alerts, Community, Market News), priority badges, sentiment, Mark as Read/Dismiss, clickable tickers with quick Buy/Sell
  - **Expanded metrics**: Today's P&L, Top Performer, Risk Score, Monthly Dividends, Market Performance, Asset Allocation, Volatility Score, Sharpe Ratio, Beta vs Market, Sector Exposure (all expand to charts)
  - **Quick Actions**: Refresh Data, Generate Report, Add Transaction, Run Analysis, Set Alerts, Add to Watchlist
  - **Interactive Asset Allocation**: Target vs Actual (Stocks/Bonds), rebalance suggestion, Quick rebalance
- **Asset Allocation Analysis**: Visual breakdown by asset class and sector; interactive pie and target-vs-actual panel
- **Risk Assessment**: Automated risk scoring and portfolio balance recommendations
- **Dividend Tracking**: Monthly dividend income monitoring and projections
- **Portfolio Charts**: Chart.js with type toggle (Line/Area), benchmark overlay, and export
- **Platform consistency**: Uniform hero and layout across all pages; shared card styling on research, watchlist, and community

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
FINNHUB_API_KEY=your-finnhub-api-key   # Get free key at finnhub.io - used for watchlist, market-analysis, company-research, dashboard

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
│   │   │   ├── shared.css    # Shared component styles
│   │   │   ├── pages-common.css      # Shared layout & hero (all pages)
│   │   │   └── research-pages-cards.css # Card styling (research/watchlist/community)
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
│   │   │   │   ├── portfolio-news-list.html/css/js
│   │   │   │   ├── chart-controls/          # Chart type, benchmark, export
│   │   │   │   ├── quick-actions/           # Refresh, Report, Alerts, etc.
│   │   │   │   └── asset-allocation-panel/  # Target vs Actual, rebalance
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
| Chart Controls | `components/pages/home-dashboard/chart-controls/*` | Chart type (Line/Area/Vs Benchmark), S&P 500/NASDAQ overlay, Export PNG/CSV/PDF |
| Quick Actions | `components/pages/home-dashboard/quick-actions/*` | Refresh, Report, Transaction, Analysis, Alerts, Watchlist |
| Asset Allocation Panel | `components/pages/home-dashboard/asset-allocation-panel/*` | Target vs Actual allocation, rebalance CTA |

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
| Notifications | `components/shared/notifications.html` | Notifications sidebar (Investment Feed) |
| Navigation Config | `components/navigation/navigation-config.js` | Navigation configuration |
| Navigation Styles | `components/navigation/navigation.css` | Navigation styling (Research Tools dropdown: no gap, hover bridge, close delay) |
| Navigation Logic | `components/navigation/navigation.js` | Navigation functionality (dropdown hover: 200ms close delay, cancel on re-enter) |
| Notifications Styles | `components/notifications/notifications-sidebar.css` | Notifications/Investment Feed styling (priority badges, sentiment, ticker actions) |
| Notifications Logic | `components/notifications/notifications-sidebar.js` | Feed filters, Mark as Read, Dismiss, sample data |
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
| Pages Common | `assets/css/pages-common.css` | Shared page layout, hero section (same size/format on all pages), responsive rules |
| Research Pages Cards | `assets/css/research-pages-cards.css` | Card headers with icons, dark theme overrides for research, watchlist, community pages |
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

### 📐 Platform-wide layout & consistency
- **Unified hero**: All pages (home dashboard, watchlist, community, company-research, market-analysis, economic-indicators, for-the-quants, financial-analytics) use the same hero card size and formatting via `assets/css/pages-common.css`. No page-specific hero overrides.
- **Page layout**: `.page-content` and `.dashboard-page-content` share the same max-width, padding, and responsive behavior. Main content margin adjusts when the Investment Feed sidebar is open or closed (sidebar closed = content expands into full width).
- **Investment Feed sidebar**: Left sidebar anchored to the top of the viewport; filter tabs (Show All, Congress Trades, Portfolio Alerts, Community, Market News); no separate bell toggle (collapse/expand via header controls). Used on dashboard and other pages that include the notifications component.
- **Research / Watchlist / Community**: Section headers and content use card styling from `research-pages-cards.css` (card headers with icons, dark theme) so these pages match the home dashboard card style.

### 🏠 Main Landing Page (`app/index.html`)
- **Hero Section**: Left-aligned layout—title “Ezana Finance”, tagline “Your Network Is Your Net Worth”, subtitle, and Sign Up / Learn More buttons on a consistent left edge; no logo or image beside the title. Antigravity particle background; card preview (right) fades out when scrolling past hero.
- **Navigation**: Brand “Ezana Finance” text only (white logo icon removed); nav bar aligned with hero (same max-width and padding).
- **Features Section**: Inlined feature blocks with congressional trading (filter pills), portfolio metrics (rotating sets), market intelligence (Contracts / Lobbying / Patents tabs), and community feed (Trending / Recent). CTAs link to docs, #resources, and sign-up.
- **Resources Section**: Market Intelligence Resources grid with links to congressional trading, company research, market analysis, economic indicators, government contracts, lobbying, patents, and financial analytics.
- **FAQ Section**: Inlined two-level accordion—categories collapsed by default; click to expand questions, then click a question for the answer. “Contact Support” opens a modal with mailto form.
- **Responsive Design**: Optimized for all device sizes with consistent left alignment at all breakpoints.
- **Other**: Prism/Split Text/Electric Border assets available; Bootstrap Icons.

### 📊 Home Dashboard (`pages/home-dashboard.html`)
- **Portfolio Overview**: Real-time portfolio value and performance metrics
- **Enhanced Investment Feed** (left sidebar): Filters (Show All, Congress Trades, Portfolio Alerts, Community, Market News); priority badges (High/Medium/Low); sentiment (Bullish/Bearish); Mark as Read and Dismiss; clickable tickers with quick Buy/Sell actions
- **Chart Controls**: Line / Area / Vs Benchmark toggle; S&P 500 and NASDAQ comparison overlay; Export to PNG, CSV, PDF; time presets 1D, 1W, 1M, 3M, 6M, 1Y, 3Y, 5Y, 10Y, All
- **Expanded Performance Metrics**: Today's P&L, Top Performer, Risk Score, Monthly Dividends, Market Performance, Asset Allocation, plus Volatility Score, Sharpe Ratio, Beta vs Market, Sector Exposure (all clickable to expand with charts)
- **Quick Actions Panel**: Refresh Data, Generate Report, Add Transaction, Run Analysis, Set Alerts, Add to Watchlist
- **Interactive Asset Allocation**: Target vs Actual (Stocks/Bonds), rebalance suggestion, Quick rebalance button; View chart opens full pie
- **Asset Allocation Charts**: Interactive pie charts (sector breakdown) when expanding allocation card
- **Responsive Grid Layout**: Adaptive cards; glass-morphism styling
- **Historical Charts**: Interactive portfolio performance charts with benchmark comparison

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
- **v3.5.0**: Dashboard enhancements and platform consistency — Enhanced Investment Feed (filters, priority/sentiment badges, Mark as Read, Dismiss, ticker quick actions); Chart controls (Line/Area/Vs Benchmark, S&P 500/NASDAQ overlay, Export PNG/CSV/PDF); expanded metrics (Volatility, Sharpe, Beta, Sector Exposure); Quick Actions panel; Interactive Asset Allocation (Target vs Actual, rebalance); uniform hero and layout across all pages via `pages-common.css`; research/watchlist/community card styling via `research-pages-cards.css`; notifications sidebar anchored to top, filter tabs
- **v3.5.1**: Research Tools dropdown hover fix — Dropdown stays visible when moving cursor from trigger to menu (CSS: zero gap, invisible bridge; JS: 200ms close delay, cancel on mouse re-enter); chevron rotates when open
- **v3.5.2**: Main landing overhauls — Hero: “Ezana Finance” title and “Your Network Is Your Net Worth” tagline, left-aligned; no logo in hero. Nav: white logo icon removed; brand text only; nav aligned with hero (1400px + 2rem). FAQ: two-level accordion (categories expand/collapse, then questions); inlined so it works without fetch; fixed double-init so category toggles work. Landing interactivity: congressional trading filters, portfolio metrics rotation, market intelligence tabs (Contracts/Lobbying/Patents), community feed Trending/Recent, CTAs and resources section, contact support modal.

## 🎯 Current Project Status

### ✅ Completed Features
- **Complete Frontend Application**: 9+ fully functional pages with modern UI
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
- **Dashboard Enhancements (v3.5.0)**: Enhanced Investment Feed with filters and priority/sentiment/tickers; chart controls and benchmark comparison; expanded performance metrics (Volatility, Sharpe, Beta, Sector); Quick Actions panel; Interactive Asset Allocation (Target vs Actual, rebalance)
- **Platform Consistency**: Uniform hero and page layout across all pages (`pages-common.css`); shared card styling for research, watchlist, and community (`research-pages-cards.css`); Investment Feed sidebar behavior and styling documented
- **Navigation**: Research Tools dropdown hover behavior fixed (menu remains open while moving to options; closes only when cursor leaves the dropdown area or after brief delay)
- **Main landing (v3.5.2)**: Hero and nav left-aligned with no logo in hero and no icon beside “Ezana Finance” in nav; FAQ two-level accordion (categories/questions) inlined and working; congressional filters, portfolio rotation, intel tabs, community toggle, resources section, contact modal

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