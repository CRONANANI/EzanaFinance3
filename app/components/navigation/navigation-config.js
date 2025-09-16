// Navigation Configuration
const NavigationConfig = {
    // Brand configuration
    brand: {
        name: 'Ezana Finance',
        icon: 'bi bi-graph-up',
        href: 'home-dashboard.html'
    },

    // Navigation menu items - matches landing page structure
    menuItems: [
        {
            text: 'Dashboard',
            href: 'home-dashboard.html',
            icon: 'bi bi-house',
            dropdown: false
        },
        {
            text: 'Research Tools',
            dropdown: true,
            children: [
                {
                    text: 'Company Research',
                    href: 'company-research.html',
                    icon: 'bi bi-building'
                },
                {
                    text: 'Market Analysis',
                    href: 'market-analysis.html',
                    icon: 'bi bi-search'
                },
                {
                    text: 'Economic Indicators',
                    href: 'economic-indicators.html',
                    icon: 'bi bi-graph-up-arrow'
                }
            ]
        },
        {
            text: 'Watchlist',
            href: 'watchlist.html',
            icon: 'bi bi-heart',
            dropdown: false
        },
        {
            text: 'Community',
            href: 'community.html',
            icon: 'bi bi-people',
            dropdown: false
        }
    ],

    // User menu configuration
    userMenu: {
        name: 'John Doe',
        email: 'john@example.com',
        avatar: 'bi bi-person-circle',
        items: [
            {
                text: 'Profile Settings',
                href: 'user-profile-settings.html',
                icon: 'bi bi-person'
            },
            {
                text: 'Preferences',
                href: 'preferences.html',
                icon: 'bi bi-gear'
            },
            {
                text: 'Help & Support',
                href: 'support.html',
                icon: 'bi bi-question-circle'
            },
            {
                text: 'Sign Out',
                href: '#',
                icon: 'bi bi-box-arrow-right',
                action: 'signOut'
            }
        ]
    },

    // Responsive breakpoints
    breakpoints: {
        mobile: 768,
        tablet: 1024,
        desktop: 1200
    },

    // Animation settings
    animations: {
        duration: 200,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        dropdownDelay: 100
    },

    // Theme settings
    theme: {
        dark: {
            background: '#000000',
            text: '#ffffff',
            hover: '#374151',
            border: '#374151',
            accent: '#10b981'
        },
        light: {
            background: '#ffffff',
            text: '#000000',
            hover: '#f3f4f6',
            border: '#e5e7eb',
            accent: '#10b981'
        }
    },

    // Keyboard shortcuts
    shortcuts: {
        toggleMobileMenu: 'Alt+M',
        closeDropdown: 'Escape',
        navigateUp: 'ArrowUp',
        navigateDown: 'ArrowDown',
        selectItem: 'Enter'
    },

    // API endpoints for dynamic content
    api: {
        userProfile: '/api/user/profile',
        notifications: '/api/user/notifications',
        navigationItems: '/api/navigation/items'
    },

    // Feature flags
    features: {
        notifications: true,
        search: false,
        themeToggle: true,
        keyboardNavigation: true,
        touchGestures: true
    },

    // Accessibility settings
    accessibility: {
        announceChanges: true,
        highContrast: false,
        reducedMotion: false,
        focusVisible: true
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavigationConfig;
} else {
    window.NavigationConfig = NavigationConfig;
}
