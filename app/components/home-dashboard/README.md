# Home Dashboard Components

This directory contains the component files for the home dashboard page.

## Components

### Portfolio Detail Cards
- **File**: `portfolio-detail-cards.css`
- **Description**: Styles for the main portfolio value card and component cards
- **Features**: 
  - Expandable portfolio card with chart
  - Component cards in single column layout
  - Responsive design
  - Hover effects and animations

### Asset Allocation Card
- **File**: `asset-allocation-card.css`
- **Description**: Styles for the asset allocation chart and insights
- **Features**:
  - Pie chart visualization
  - Market insights section
  - Responsive chart container

### Transactions and Actions
- **File**: `transactions-and-actions.css`
- **Description**: Styles for recent transactions and quick actions sections
- **Features**:
  - Transaction list with icons
  - Quick action buttons grid
  - Consistent spacing and alignment

### Recent Transactions
- **File**: `recent-transactions.html`, `recent-transactions.js`
- **Description**: Component for displaying recent transaction history
- **Features**:
  - Dynamic transaction loading
  - Transaction type icons (buy/sell/dividend)
  - "View All" functionality
  - Responsive design

### Quick Actions
- **File**: `quick-actions.html`, `quick-actions.js`
- **Description**: Component for quick action buttons
- **Features**:
  - Add Investment button
  - View Analytics button
  - Settings button
  - Capitol Insights button
  - Dynamic button management

## Usage

### Including Components
To use these components in your HTML pages:

```html
<!-- Include CSS -->
<link rel="stylesheet" href="components/home-dashboard/portfolio-detail-cards.css">
<link rel="stylesheet" href="components/home-dashboard/asset-allocation-card.css">
<link rel="stylesheet" href="components/home-dashboard/transactions-and-actions.css">

<!-- Include JavaScript -->
<script src="components/home-dashboard/recent-transactions.js"></script>
<script src="components/home-dashboard/quick-actions.js"></script>
```

### Loading Component HTML
To load component HTML dynamically:

```javascript
// Load recent transactions
fetch('components/home-dashboard/recent-transactions.html')
    .then(response => response.text())
    .then(html => {
        document.getElementById('transactions-container').innerHTML = html;
    });

// Load quick actions
fetch('components/home-dashboard/quick-actions.html')
    .then(response => response.text())
    .then(html => {
        document.getElementById('actions-container').innerHTML = html;
    });
```

## JavaScript API

### Recent Transactions
- `recentTransactions.loadRecentTransactions()` - Load transaction data
- `recentTransactions.refreshTransactions()` - Refresh the transactions display
- `recentTransactions.viewAllTransactions()` - Handle "View All" button click

### Quick Actions
- `quickActions.handleAddInvestment()` - Handle add investment button
- `quickActions.handleViewAnalytics()` - Handle view analytics button
- `quickActions.handleSettings()` - Handle settings button
- `quickActions.addQuickActionButton(title, icon, onClick, className)` - Add new action button
- `quickActions.removeQuickActionButton(className)` - Remove action button

## Styling

All components use CSS custom properties for theming and are fully responsive. The components follow the design system established in the main application.

### CSS Custom Properties Used
- `--card` - Card background color
- `--foreground` - Primary text color
- `--muted-foreground` - Secondary text color
- `--primary` - Primary accent color
- `--border` - Border color
- `--shadow-lg` - Large shadow
- `--shadow-xl` - Extra large shadow

## Responsive Design

All components are responsive and adapt to different screen sizes:
- **Desktop**: Full layout with side-by-side components
- **Tablet**: Adjusted spacing and sizing
- **Mobile**: Stacked layout with optimized touch targets
