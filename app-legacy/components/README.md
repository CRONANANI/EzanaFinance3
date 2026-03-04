# Ezana Finance Components

This directory contains all reusable components for the Ezana Finance application, organized by functionality and scope.

## 📁 Directory Structure

```
components/
├── shared/              # Components used across multiple pages
├── pages/              # Page-specific components
│   ├── home-dashboard/ # Home dashboard components
│   ├── community/      # Community page components
│   ├── watchlist/      # Watchlist page components
│   ├── inside-the-capitol/ # Congressional trading components
│   └── research-tools/ # Research tools components
├── navigation/         # Navigation components
├── notifications/      # Notifications components
└── ui/                # UI utility components
```

## 🔧 Component Usage

### Loading Components Dynamically

Use the component loader utility to dynamically load components:

```javascript
// Load a single component
await loadComponent('components/pages/home-dashboard/portfolio-card', 'portfolio-container');

// Load multiple components
await loadComponents([
    { path: 'components/shared/navigation', containerId: 'nav-container' },
    { path: 'components/shared/notifications', containerId: 'notifications-container' }
]);
```

### Component Structure

Each component follows this structure:
```
component-name/
├── component-name.html    # HTML template
├── component-name.css     # Component styles
├── component-name.js      # Component logic
└── README.md             # Component documentation (optional)
```

## 📋 Component Index

### 🏠 Home Dashboard Components

| Component | Description | Files |
|-----------|-------------|-------|
| Portfolio Card | Main portfolio value display with chart | `portfolio-card.*` |
| Metrics Grid | 6 metric cards in 2-column layout | `metrics-grid.*` |
| Today's P&L | Daily profit/loss display | `todays-pnl-card.*` |
| Top Performer | Best performing stock | `top-performer-card.*` |
| Risk Score | Portfolio risk assessment | `risk-score-card.*` |
| Monthly Dividends | Dividend income tracking | `monthly-dividends-card.*` |
| Market Performance | Market index performance | `market-performance-card.*` |
| Asset Allocation | Portfolio allocation breakdown | `asset-allocation-card.*` |
| Market News | Relevant market news | `market-news-card.*` |
| Portfolio News List | News list component | `portfolio-news-list.*` |

### 👥 Community Components

| Component | Description | Files |
|-----------|-------------|-------|
| Community Cards | Main community action cards | `community-cards.*` |
| Trophy Cabinet | User achievements display | `trophy-cabinet.*` |

### 📋 Watchlist Components

| Component | Description | Files |
|-----------|-------------|-------|
| Watchlist Cards | Watchlist management cards | `watchlist-cards.*` |

### 🏛️ Inside The Capitol Components

| Component | Description | Files |
|-----------|-------------|-------|
| Congressional Trading | Congress trading data | `congressional-trading-card.*` |
| Government Contracts | Contract awards | `government-contracts-card.*` |
| House Trading | House trading activity | `house-trading-card.*` |
| Senator Trading | Senate trading activity | `senator-trading-card.*` |
| Lobbying Activity | Lobbying expenditure | `lobbying-activity-card.*` |
| Patent Momentum | Patent filing data | `patent-momentum-card.*` |
| Market Sentiment | Market sentiment analysis | `market-sentiment-card.*` |
| Insights Section | Key insights display | `insights-section.*` |
| Summary Stats | Summary statistics | `summary-stats-cards.*` |

### 🔧 Research Tools Components

| Component | Description | Files |
|-----------|-------------|-------|
| Company Research | Company analysis tools | `company-research-cards.*` |
| Market Analysis | Market analysis tools | `market-analysis-cards.*` |
| Economic Indicators | Economic data tools | `economic-indicators-cards.*` |

### 🔧 Shared Components

| Component | Description | Files |
|-----------|-------------|-------|
| Navigation | Main navigation bar | `shared/navigation.html` |
| Notifications | Notifications sidebar | `shared/notifications.html` |

### 🎨 UI Components

| Component | Description | Files |
|-----------|-------------|-------|
| Prism Background | 3D background effect | `ui/prism-background.*` |
| Shiny Text | Text animation effects | `ui/shiny-text.*` |

## 🎨 Styling Guidelines

### CSS Variables
All components use CSS variables defined in `assets/css/shared.css`:

```css
:root {
    --primary-color: #10b981;
    --secondary-color: #3b82f6;
    --accent-color: #8b5cf6;
    --background-dark: #0f172a;
    --background-medium: #1e293b;
    --background-light: #334155;
    --text-primary: #e2e8f0;
    --text-secondary: #94a3b8;
    --border-color: rgba(255, 255, 255, 0.1);
    --border-radius: 0.75rem;
    --transition: all 0.3s ease;
}
```

### Component Styling
- Use CSS variables for consistent theming
- Include hover states and transitions
- Ensure responsive design for all screen sizes
- Follow the established design system

## 📱 Responsive Design

All components are designed with a mobile-first approach:

- **Mobile (640px and below)**: Single column layout, compact spacing
- **Tablet (641px - 1024px)**: Two column layout where appropriate
- **Desktop (1025px and above)**: Full multi-column layout

## 🔧 JavaScript Guidelines

### Component Classes
Each component should be implemented as a JavaScript class:

```javascript
class ComponentName {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadData();
    }

    setupEventListeners() {
        // Event listener setup
    }

    loadData() {
        // Data loading logic
    }
}
```

### Event Handling
- Use event delegation for dynamic content
- Clean up event listeners when components are destroyed
- Use consistent naming conventions for event handlers

## 📚 Best Practices

1. **Modularity**: Each component should be self-contained
2. **Reusability**: Design components to be reusable across pages
3. **Performance**: Use efficient DOM manipulation and event handling
4. **Accessibility**: Include proper ARIA labels and keyboard navigation
5. **Documentation**: Document component props and usage
6. **Testing**: Include error handling and fallback states

## 🚀 Adding New Components

1. Create the component directory in the appropriate location
2. Add HTML, CSS, and JavaScript files
3. Follow the established naming conventions
4. Include proper error handling and responsive design
5. Update this README with the new component information
6. Test the component across different screen sizes

## 🔍 Component Discovery

To find a specific component:

1. **By Page**: Look in `pages/[page-name]/` directory
2. **By Function**: Check the component index above
3. **By Type**: Look in `shared/` for cross-page components
4. **By UI Element**: Check `ui/` for utility components

## 📞 Support

For questions about components:
- Check the individual component README files
- Review the main project README.md
- Create an issue in the GitHub repository
