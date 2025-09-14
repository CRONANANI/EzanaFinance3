// Top Navigation Component JavaScript
class TopNav {
    constructor() {
        this.topnav = document.getElementById('topnav');
        this.menu = document.getElementById('topnav-menu');
        this.mobileToggle = document.getElementById('mobile-menu-toggle');
        this.userButton = document.getElementById('user-button');
        this.userMenu = document.getElementById('user-menu');
        this.isMobile = window.innerWidth <= 768;
        this.isMenuOpen = false;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.handleResize();
        this.setActiveLink();
        this.createMobileOverlay();
    }

    bindEvents() {
        // Mobile menu toggle
        if (this.mobileToggle) {
            this.mobileToggle.addEventListener('click', () => this.toggleMobileMenu());
        }

        // User menu toggle
        if (this.userButton && this.userMenu) {
            this.userButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleUserMenu();
            });
        }

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown')) {
                this.closeAllDropdowns();
            }
        });

        // Dropdown hover events
        const dropdowns = document.querySelectorAll('.dropdown');
        dropdowns.forEach(dropdown => {
            const toggle = dropdown.querySelector('.dropdown-toggle');
            const menu = dropdown.querySelector('.dropdown-menu');
            
            if (toggle && menu) {
                // Desktop hover
                dropdown.addEventListener('mouseenter', () => {
                    if (!this.isMobile) {
                        this.showDropdown(menu);
                    }
                });

                dropdown.addEventListener('mouseleave', () => {
                    if (!this.isMobile) {
                        this.hideDropdown(menu);
                    }
                });

                // Mobile click
                if (toggle.dataset.dropdown) {
                    toggle.addEventListener('click', (e) => {
                        if (this.isMobile) {
                            e.preventDefault();
                            this.toggleDropdown(menu);
                        }
                    });
                }
            }
        });

        // Handle navigation link clicks
        const navLinks = document.querySelectorAll('.topnav-link:not(.dropdown-toggle), .dropdown-item');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href && href !== '#') {
                    // Allow normal navigation
                    window.location.href = href;
                }
            });
        });

        // Window resize
        window.addEventListener('resize', () => this.handleResize());

        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    toggleMobileMenu() {
        this.isMenuOpen = !this.isMenuOpen;
        this.menu.classList.toggle('open', this.isMenuOpen);
        
        // Toggle mobile overlay
        const overlay = document.querySelector('.mobile-overlay');
        if (overlay) {
            overlay.classList.toggle('active', this.isMenuOpen);
        }

        // Update toggle icon
        const icon = this.mobileToggle.querySelector('i');
        if (icon) {
            icon.className = this.isMenuOpen ? 'bi bi-x' : 'bi bi-list';
        }
    }

    toggleUserMenu() {
        this.userMenu.classList.toggle('show');
    }

    toggleDropdown(menu) {
        const isOpen = menu.classList.contains('show');
        this.closeAllDropdowns();
        if (!isOpen) {
            menu.classList.add('show');
        }
    }

    showDropdown(menu) {
        this.hideAllDropdowns();
        menu.classList.add('show');
    }

    hideDropdown(menu) {
        menu.classList.remove('show');
    }

    closeAllDropdowns() {
        const dropdowns = document.querySelectorAll('.dropdown-menu');
        dropdowns.forEach(dropdown => {
            dropdown.classList.remove('show');
        });
    }

    hideAllDropdowns() {
        const dropdowns = document.querySelectorAll('.dropdown-menu');
        dropdowns.forEach(dropdown => {
            dropdown.classList.remove('show');
        });
    }

    setActiveLink() {
        const currentPath = window.location.pathname;
        const links = document.querySelectorAll('.topnav-link, .dropdown-item');
        
        links.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            
            if (href && currentPath.includes(href.replace('.html', ''))) {
                link.classList.add('active');
            }
        });
    }

    handleResize() {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= 768;
        
        if (wasMobile !== this.isMobile) {
            // Close mobile menu when switching to desktop
            if (!this.isMobile && this.isMenuOpen) {
                this.toggleMobileMenu();
            }
            
            // Close all dropdowns when switching modes
            this.closeAllDropdowns();
        }
    }

    handleKeyboard(e) {
        // Close mobile menu on Escape
        if (e.key === 'Escape') {
            if (this.isMobile && this.isMenuOpen) {
                this.toggleMobileMenu();
            }
            this.closeAllDropdowns();
        }
    }

    createMobileOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'mobile-overlay';
        overlay.addEventListener('click', () => {
            if (this.isMobile && this.isMenuOpen) {
                this.toggleMobileMenu();
            }
        });
        document.body.appendChild(overlay);
    }

    // Public methods
    openMobileMenu() {
        if (this.isMobile && !this.isMenuOpen) {
            this.toggleMobileMenu();
        }
    }

    closeMobileMenu() {
        if (this.isMobile && this.isMenuOpen) {
            this.toggleMobileMenu();
        }
    }

    // Method to update user name
    updateUserName(name) {
        const userNameElement = document.querySelector('.user-name');
        if (userNameElement) {
            userNameElement.textContent = name;
        }
    }
}

// Initialize top navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.topnav = new TopNav();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TopNav;
}
