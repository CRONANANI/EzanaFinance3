# Notifications Sidebar Component

A collapsible notifications sidebar that provides real-time updates from across the Ezana Finance application.

## Features

- **Collapsible Design**: Toggle button on the left side of the screen
- **Real-time Notifications**: Live updates from different app sections
- **Categorized Filtering**: Filter by Congress, Stocks, Community, etc.
- **Interactive Actions**: Click to view, follow, or dismiss notifications
- **Responsive Design**: Works on desktop and mobile devices
- **Persistent Storage**: Notifications saved to localStorage
- **Toast Notifications**: Pop-up alerts for new notifications

## Notification Types

### Congress Notifications
- New trades by followed representatives
- Congressional activity alerts
- Policy updates affecting investments

### Stock Notifications
- Price alerts and targets reached
- Earnings announcements
- Market analysis updates
- Portfolio performance alerts

### Community Notifications
- New comments on followed threads
- Friend activity updates
- Discussion mentions
- Expert insights shared

### Watchlist Notifications
- New followers added to watchlists
- Price movements on watched stocks
- Analyst rating changes
- News articles about watched companies

## Usage

### Basic Integration
```html
<!-- Include CSS -->
<link rel="stylesheet" href="components/notifications/notifications-sidebar.css">

<!-- Include HTML -->
<div id="notifications-sidebar" class="notifications-sidebar">
    <!-- Sidebar content -->
</div>

<!-- Include JavaScript -->
<script src="components/notifications/notifications-sidebar.js"></script>
```

### Adding Notifications Programmatically
```javascript
// Add a new notification
notificationsSidebar.addNotification({
    type: 'congress',
    title: 'New Congress Trade',
    content: 'Rep. Smith made a trade in AAPL',
    actions: [
        { type: 'view', label: 'View Trade' },
        { type: 'follow', label: 'Follow Rep' }
    ]
});
```

### Keyboard Shortcuts
- `Ctrl + B`: Toggle notifications sidebar

## API Methods

### `toggleSidebar()`
Opens or closes the notifications sidebar

### `addNotification(notification)`
Adds a new notification to the list

### `markAsRead(notificationId)`
Marks a specific notification as read

### `markAllAsRead()`
Marks all notifications as read

### `filterNotifications(filter)`
Filters notifications by type (all, congress, stocks, community)

### `removeNotification(notificationId)`
Removes a notification from the list

## Styling

The component uses CSS custom properties for theming:
- `--primary`: Main accent color
- `--card`: Background color
- `--border`: Border color
- `--foreground`: Text color
- `--muted-foreground`: Secondary text color

## Responsive Behavior

- **Desktop**: 350px wide sidebar, pushes main content to the right
- **Tablet**: Full-width sidebar overlay
- **Mobile**: Full-screen sidebar overlay

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Dependencies

- Bootstrap Icons for icons
- CSS Custom Properties for theming
- localStorage for persistence
