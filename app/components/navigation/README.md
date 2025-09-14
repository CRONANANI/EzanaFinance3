# Navigation Component

A comprehensive navigation component that controls the top navigation bar functionality for the Ezana Finance web application.

## Features

- **Responsive Design**: Adapts to mobile, tablet, and desktop screens
- **Dropdown Menus**: Hover and click-activated dropdown navigation
- **Mobile Support**: Collapsible mobile menu with overlay
- **Keyboard Navigation**: Full keyboard accessibility support
- **User Menu**: Profile dropdown with settings and logout
- **Dynamic Content**: Support for adding/removing navigation items
- **Theme Support**: Dark and light theme compatibility
- **Loading States**: Visual feedback during navigation
- **Notifications**: Badge support for user notifications
- **Configuration**: Easy customization through config file

## Files

- `navigation.js` - Main navigation component class
- `navigation.css` - Styling and responsive design
- `navigation-config.js` - Configuration and settings
- `README.md` - Documentation

## Usage

### Basic Integration

1. Include the CSS file in your HTML head:
```html
<link rel="stylesheet" href="app/components/navigation/navigation.css">
```

2. Include the JavaScript files before closing body tag:
```html
<script src="app/components/navigation/navigation-config.js"></script>
<script src="app/components/navigation/navigation.js"></script>
```

3. Add the navigation HTML to your page:
```html
<nav class="topnav" id="topnav">
    <!-- Navigation content -->
</nav>
```

### HTML Structure

The navigation expects specific HTML structure with these IDs:
- `#topnav` - Main navigation container
- `#topnav-menu` - Navigation menu container
- `#mobile-menu-toggle` - Mobile menu toggle button
- `#user-button` - User menu button
- `#user-menu` - User dropdown menu

## JavaScript API

### Initialization

The navigation component automatically initializes when the DOM is loaded:

```javascript
// Navigation is available globally
window.navigation = new Navigation();
```

### Public Methods

#### Navigation Control
```javascript
// Toggle mobile menu
window.navigation.toggleMobileMenu();

// Open/close mobile menu
window.navigation.openMobileMenu();
window.navigation.closeMobileMenu();

// Navigate to a specific URL
window.navigation.navigateTo('home-dashboard.html');
```

#### Dropdown Control
```javascript
// Show/hide specific dropdown
window.navigation.showDropdownById('dropdown-home');
window.navigation.hideDropdownById('dropdown-components');

// Close all dropdowns
window.navigation.closeAllDropdowns();
```

#### User Management
```javascript
// Update user information
window.navigation.updateUserName('Jane Doe');
window.navigation.updateUserEmail('jane@example.com');

// Add/remove notifications
window.navigation.addNotification(5);
window.navigation.removeNotification();
```

#### Dynamic Content
```javascript
// Add new navigation item
window.navigation.addNavigationItem({
    text: 'New Page',
    href: 'new-page.html',
    icon: 'bi bi-star',
    dropdown: false
});

// Add dropdown item
window.navigation.addNavigationItem({
    text: 'New Section',
    dropdown: true,
    children: [
        {
            text: 'Sub Item 1',
            href: 'sub1.html',
            icon: 'bi bi-circle'
        },
        {
            text: 'Sub Item 2',
            href: 'sub2.html',
            icon: 'bi bi-circle-fill'
        }
    ]
});
```

## Configuration

### Navigation Items

Edit `navigation-config.js` to modify navigation items:

```javascript
const NavigationConfig = {
    menuItems: [
        {
            text: 'Home',
            dropdown: true,
            children: [
                {
                    text: 'Dashboard',
                    href: 'home-dashboard.html',
                    icon: 'bi bi-house-door'
                }
            ]
        }
    ]
};
```

### Theme Customization

```javascript
const NavigationConfig = {
    theme: {
        dark: {
            background: '#000000',
            text: '#ffffff',
            accent: '#10b981'
        }
    }
};
```

### Responsive Breakpoints

```javascript
const NavigationConfig = {
    breakpoints: {
        mobile: 768,
        tablet: 1024,
        desktop: 1200
    }
};
```

## CSS Customization

### CSS Variables

Override CSS variables for custom styling:

```css
:root {
    --nav-height: 64px;
    --nav-bg: #000000;
    --nav-text: #ffffff;
    --nav-accent: #10b981;
    --nav-transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Custom Classes

Add custom classes for specific styling:

```css
.navigation-link.custom-link {
    background: linear-gradient(45deg, #10b981, #059669);
    color: white;
}
```

## Events

### Custom Events

The navigation component dispatches custom events:

```javascript
// Listen for navigation changes
document.addEventListener('navigation:changed', (e) => {
    console.log('Navigation changed:', e.detail);
});

// Listen for mobile menu toggle
document.addEventListener('navigation:mobileToggle', (e) => {
    console.log('Mobile menu toggled:', e.detail.isOpen);
});
```

## Keyboard Shortcuts

- `Escape` - Close mobile menu and dropdowns
- `Alt + M` - Toggle mobile menu
- `Arrow Up/Down` - Navigate dropdown items
- `Enter` - Select dropdown item

## Browser Support

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## Dependencies

- Bootstrap Icons (for icons)
- Modern CSS features (CSS Grid, Flexbox, Custom Properties)
- ES6+ JavaScript features

## Accessibility

- Full keyboard navigation support
- ARIA labels and roles
- Focus management
- Screen reader compatibility
- High contrast mode support
- Reduced motion support

## Performance

- Lazy loading of dropdown content
- Efficient event delegation
- Minimal DOM manipulation
- CSS transitions for smooth animations
- Debounced resize events
