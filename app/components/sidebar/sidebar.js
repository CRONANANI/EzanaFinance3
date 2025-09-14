// Sidebar Component JavaScript
class Sidebar {
    constructor() {
        this.sidebar = document.getElementById('sidebar');
        this.toggle = document.getElementById('sidebar-toggle');
        this.overlay = document.getElementById('sidebar-overlay');
        this.isCollapsed = false;
        this.isMobile = window.innerWidth <= 768;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.handleResize();
        this.setActiveLink();
    }

    bindEvents() {
        // Toggle button
        if (this.toggle) {
            this.toggle.addEventListener('click', () => this.toggleSidebar());
        }

        // Overlay click
        if (this.overlay) {
            this.overlay.addEventListener('click', () => this.closeSidebar());
        }

        // Submenu toggle
        const menuItems = document.querySelectorAll('.sidebar-item');
        menuItems.forEach(item => {
            const link = item.querySelector('.sidebar-link');
            const submenu = item.querySelector('.sidebar-submenu');
            
            if (link && submenu) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.toggleSubmenu(item);
                });
            }
        });

        // User profile link - close sidebar on mobile when clicked
        const userProfileLink = document.querySelector('.sidebar-user');
        if (userProfileLink) {
            userProfileLink.addEventListener('click', () => {
                if (this.isMobile) {
                    this.closeSidebar();
                }
            });
        }

        // Window resize
        window.addEventListener('resize', () => this.handleResize());

        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    toggleSidebar() {
        if (this.isMobile) {
            this.sidebar.classList.toggle('open');
            this.overlay.classList.toggle('active');
        } else {
            this.isCollapsed = !this.isCollapsed;
            this.sidebar.classList.toggle('collapsed', this.isCollapsed);
            
            // Update toggle icon
            const icon = this.toggle.querySelector('i');
            if (icon) {
                icon.className = this.isCollapsed ? 'bi bi-list' : 'bi bi-x-lg';
            }
        }
    }

    closeSidebar() {
        if (this.isMobile) {
            this.sidebar.classList.remove('open');
            this.overlay.classList.remove('active');
        }
    }

    toggleSubmenu(item) {
        const isExpanded = item.classList.contains('expanded');
        
        // Close all other submenus
        document.querySelectorAll('.sidebar-item.expanded').forEach(expandedItem => {
            if (expandedItem !== item) {
                expandedItem.classList.remove('expanded');
            }
        });

        // Toggle current submenu
        item.classList.toggle('expanded', !isExpanded);
    }

    setActiveLink() {
        const currentPath = window.location.pathname;
        const links = document.querySelectorAll('.sidebar-link');
        
        links.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            
            if (href && currentPath.includes(href.replace('.html', ''))) {
                link.classList.add('active');
                
                // Expand parent if it's a submenu item
                const parentItem = link.closest('.sidebar-item');
                if (parentItem && parentItem.querySelector('.sidebar-submenu')) {
                    parentItem.classList.add('expanded');
                }
            }
        });

        // Handle user profile link
        const userProfileLink = document.querySelector('.sidebar-user');
        if (userProfileLink) {
            const href = userProfileLink.getAttribute('href');
            if (href && currentPath.includes(href.replace('.html', ''))) {
                userProfileLink.classList.add('active');
            }
        }
    }

    handleResize() {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= 768;
        
        if (wasMobile !== this.isMobile) {
            if (this.isMobile) {
                this.sidebar.classList.remove('collapsed');
                this.sidebar.classList.remove('open');
                this.overlay.classList.remove('active');
            } else {
                this.sidebar.classList.remove('open');
                this.overlay.classList.remove('active');
            }
        }
    }

    handleKeyboard(e) {
        // Close sidebar on Escape key
        if (e.key === 'Escape' && this.isMobile) {
            this.closeSidebar();
        }
        
        // Toggle sidebar on Ctrl/Cmd + B
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            this.toggleSidebar();
        }
    }

    // Public methods
    collapse() {
        if (!this.isMobile) {
            this.isCollapsed = true;
            this.sidebar.classList.add('collapsed');
        }
    }

    expand() {
        if (!this.isMobile) {
            this.isCollapsed = false;
            this.sidebar.classList.remove('collapsed');
        }
    }

    open() {
        if (this.isMobile) {
            this.sidebar.classList.add('open');
            this.overlay.classList.add('active');
        }
    }

    close() {
        this.closeSidebar();
    }
}

// Initialize sidebar when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.sidebar = new Sidebar();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Sidebar;
}
