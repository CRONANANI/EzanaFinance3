# Sidebar Component

A modern, responsive sidebar navigation component for the Ezana Finance web application.

## Features

- **Responsive Design**: Adapts to mobile and desktop screens
- **Collapsible**: Can be collapsed to icon-only view on desktop
- **Submenu Support**: Nested navigation with smooth animations
- **Active State**: Highlights current page
- **Dark Mode**: Supports dark theme
- **Keyboard Navigation**: Full keyboard accessibility
- **Smooth Animations**: CSS transitions for all interactions

## Files

- `sidebar.html` - HTML structure
- `sidebar.css` - Styling and animations
- `sidebar.js` - JavaScript functionality
- `README.md` - Documentation

## Usage

### Basic Integration

1. Include the CSS file in your HTML head:
```html
<link rel="stylesheet" href="app/components/sidebar/sidebar.css">
```

2. Include the JavaScript file before closing body tag:
```html
<script src="app/components/sidebar/sidebar.js"></script>
```

3. Add the sidebar HTML to your page:
```html
<aside class="sidebar" id="sidebar">
    <!-- Sidebar content -->
</aside>
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
    --sidebar-width: 280px;
    --sidebar-width-collapsed: 60px;
    --sidebar-bg: #ffffff;
    --sidebar-accent: #10b981;
    /* ... more variables */
}
```

### Dark Mode

Add `data-theme="dark"` to enable dark mode:

```html
<html data-theme="dark">
```

## JavaScript API

The sidebar exposes several methods:

```javascript
// Toggle sidebar (mobile) or collapse/expand (desktop)
window.sidebar.toggleSidebar();

// Collapse sidebar (desktop only)
window.sidebar.collapse();

// Expand sidebar (desktop only)
window.sidebar.expand();

// Open sidebar (mobile only)
window.sidebar.open();

// Close sidebar
window.sidebar.close();
```

## Keyboard Shortcuts

- `Escape` - Close sidebar (mobile)
- `Ctrl/Cmd + B` - Toggle sidebar

## Responsive Behavior

- **Desktop (>768px)**: Fixed sidebar with collapse/expand functionality
- **Mobile (≤768px)**: Overlay sidebar that slides in from the left

## Browser Support

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## Dependencies

- Bootstrap Icons (for icons)
- Modern CSS features (CSS Grid, Flexbox, Custom Properties)
