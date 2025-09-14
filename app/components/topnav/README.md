# Top Navigation Component

A modern, responsive top navigation bar component that matches the design in your reference image.

## Features

- **Horizontal Layout**: Clean horizontal navigation bar at the top of the page
- **Dropdown Menus**: Multiple dropdown menus with hover and click interactions
- **Responsive Design**: Adapts to mobile and desktop screens
- **Dark Theme**: Black background with white text (matches reference image)
- **User Menu**: User profile dropdown with settings and logout options
- **Mobile Support**: Collapsible mobile menu with overlay
- **Keyboard Navigation**: Full keyboard accessibility support

## Files

- `topnav.html` - HTML structure
- `topnav.css` - Styling and responsive design
- `topnav.js` - JavaScript functionality
- `README.md` - Documentation

## Navigation Structure

### Main Menu Items:
1. **Home** (Dropdown)
   - Dashboard
   - Analytics
   - Overview

2. **Components** (Dropdown)
   - Portfolio
   - Watchlist
   - Analytics

3. **Docs** (Direct Link)
   - Documentation page

4. **List** (Dropdown)
   - Watchlist
   - Holdings
   - Transactions

5. **Simple** (Dropdown)
   - Market Analysis
   - Company Research
   - Economic Indicators

6. **With Icon** (Dropdown)
   - Inside the Capitol
   - Community
   - Settings

### User Menu:
- Profile Settings
- Preferences
- Help & Support
- Sign Out

## Usage

### Basic Integration

1. Include the CSS file in your HTML head:
```html
<link rel="stylesheet" href="app/components/topnav/topnav.css">
```

2. Include the JavaScript file before closing body tag:
```html
<script src="app/components/topnav/topnav.js"></script>
```

3. Add the topnav HTML to your page:
```html
<nav class="topnav" id="topnav">
    <!-- Navigation content -->
</nav>
```

### Main Content Adjustment

Wrap your main content in a container with the `main-content` class:

```html
<div class="main-content">
    <!-- Your page content -->
</div>
```

## Customization

### CSS Variables

The component uses CSS custom properties for easy theming:

```css
:root {
    --topnav-height: 64px;
    --topnav-bg: #000000;
    --topnav-text: #ffffff;
    --topnav-accent: #10b981;
    /* ... more variables */
}
```

### Light Mode

Add `data-theme="light"` to enable light mode:

```html
<html data-theme="light">
```

## JavaScript API

The topnav exposes several methods:

```javascript
// Toggle mobile menu
window.topnav.openMobileMenu();
window.topnav.closeMobileMenu();

// Update user name
window.topnav.updateUserName('New Name');
```

## Responsive Behavior

- **Desktop (>768px)**: Full horizontal navigation with hover dropdowns
- **Mobile (≤768px)**: Collapsible menu that slides down from the top

## Browser Support

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## Dependencies

- Bootstrap Icons (for icons)
- Modern CSS features (CSS Grid, Flexbox, Custom Properties)
