// Navigation Component - Controls top navigation bar functionality
class Navigation {
    constructor() {
        this.topnav = document.getElementById('topnav');
        this.menu = document.getElementById('topnav-menu');
        this.mobileToggle = document.getElementById('mobile-menu-toggle');
        this.userButton = document.getElementById('user-button');
        this.userMenu = document.getElementById('user-menu');
        this.isMobile = window.innerWidth <= 768;
        this.isMenuOpen = false;
        this.activeDropdown = null;
        
        this.init();
    }

    init() {
        this.generateNavigationHTML();
        this.bindEvents();
        this.handleResize();
        this.setActiveLink();
        this.createMobileOverlay();
        this.initializeDropdowns();
    }

    generateNavigationHTML() {
        // Only generate if navigation doesn't exist
        if (document.getElementById('topnav')) {
            return;
        }

        const config = window.NavigationConfig || NavigationConfig;
        
        // Create navigation container
        const topnav = document.createElement('nav');
        topnav.className = 'topnav';
        topnav.id = 'topnav';

        // Create navigation content
        const navContent = document.createElement('div');
        navContent.className = 'nav-container';

        // Create brand section
        const brandSection = document.createElement('div');
        brandSection.className = 'logo';
        brandSection.innerHTML = `
            <a href="${config.brand.href}" class="brand-link">
                <div class="logo-icon">
                    <i class="${config.brand.icon}"></i>
                </div>
                <span class="logo-text">${config.brand.name}</span>
            </a>
        `;

        // Create navigation menu
        const navMenu = document.createElement('ul');
        navMenu.className = 'nav-menu';
        navMenu.id = 'topnav-menu';

        // Generate menu items
        config.menuItems.forEach(item => {
            const li = document.createElement('li');
            li.className = 'nav-item';

            if (item.dropdown) {
                li.classList.add('dropdown');
                li.innerHTML = `
                    <a href="#" class="nav-link">
                        ${item.icon ? `<i class="${item.icon}"></i>` : ''}
                        ${item.text}
                        <i class="bi bi-chevron-down"></i>
                    </a>
                    <div class="dropdown-content">
                        ${item.children.map(child => `
                            <a href="${child.href}" class="dropdown-item">${child.text}</a>
                        `).join('')}
                    </div>
                `;
            } else {
                li.innerHTML = `
                    <a href="${item.href}" class="nav-link">
                        ${item.icon ? `<i class="${item.icon}"></i>` : ''}
                        ${item.text}
                    </a>
                `;
            }

            navMenu.appendChild(li);
        });

        // Create user section
        const userSection = document.createElement('div');
        userSection.className = 'navigation-user';
        userSection.innerHTML = `
            <div class="user-dropdown">
                <button class="user-button" id="user-button">
                    <i class="${config.userMenu.avatar} user-avatar"></i>
                    <span class="user-name">${config.userMenu.name}</span>
                    <i class="bi bi-chevron-down"></i>
                </button>
                <div class="dropdown-menu user-menu" id="user-menu">
                    ${config.userMenu.items.map(item => `
                        <a href="${item.href}" class="dropdown-item">
                            <i class="${item.icon}"></i>
                            ${item.text}
                        </a>
                    `).join('')}
                </div>
            </div>
        `;

        // Create mobile toggle
        const mobileToggle = document.createElement('button');
        mobileToggle.className = 'mobile-menu-toggle';
        mobileToggle.id = 'mobile-menu-toggle';
        mobileToggle.innerHTML = '<i class="bi bi-list"></i>';

        // Assemble navigation
        navContent.appendChild(brandSection);
        navContent.appendChild(navMenu);
        navContent.appendChild(userSection);
        navContent.appendChild(mobileToggle);
        topnav.appendChild(navContent);

        // Insert navigation at the beginning of body
        document.body.insertBefore(topnav, document.body.firstChild);

        // Update references
        this.topnav = topnav;
        this.menu = navMenu;
        this.mobileToggle = mobileToggle;
        this.userButton = document.getElementById('user-button');
        this.userMenu = document.getElementById('user-menu');
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

        // Window resize
        window.addEventListener('resize', () => this.handleResize());

        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Navigation link clicks
        this.bindNavigationLinks();
    }

    bindNavigationLinks() {
        // Handle brand link
        const brandLink = document.querySelector('.brand-link');
        if (brandLink) {
            brandLink.addEventListener('click', (e) => {
                this.handleNavigationClick(e, brandLink);
            });
        }

        // Handle direct navigation links
        const directLinks = document.querySelectorAll('.nav-link:not(.dropdown-toggle)');
        directLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                this.handleNavigationClick(e, link);
            });
        });

        // Handle dropdown navigation links
        const dropdownLinks = document.querySelectorAll('.dropdown-item');
        dropdownLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                this.handleNavigationClick(e, link);
            });
        });

        // Handle user menu links
        const userMenuLinks = document.querySelectorAll('.user-menu .dropdown-item');
        userMenuLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                this.handleNavigationClick(e, link);
            });
        });
    }

    handleNavigationClick(e, link) {
        const href = link.getAttribute('href');
        
        // If it's a placeholder link (#), prevent default
        if (href === '#' || !href) {
            e.preventDefault();
            return;
        }

        // Close mobile menu if open
        if (this.isMobile && this.isMenuOpen) {
            this.toggleMobileMenu();
        }

        // Close all dropdowns
        this.closeAllDropdowns();

        // Update active state
        this.setActiveLink();

        // Show loading state if needed
        this.showLoadingState(link);
    }

    initializeDropdowns() {
        const dropdowns = document.querySelectorAll('.dropdown');
        dropdowns.forEach(dropdown => {
            const toggle = dropdown.querySelector('.nav-link');
            const menu = dropdown.querySelector('.dropdown-content');
            
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
                toggle.addEventListener('click', (e) => {
                    if (this.isMobile) {
                        e.preventDefault();
                        this.toggleDropdown(menu);
                    }
                });
            }
        });
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

        // Close all dropdowns when opening mobile menu
        if (this.isMenuOpen) {
            this.closeAllDropdowns();
        }
    }

    toggleUserMenu() {
        this.userMenu.classList.toggle('show');
        this.activeDropdown = this.userMenu.classList.contains('show') ? this.userMenu : null;
    }

    toggleDropdown(menu) {
        const isOpen = menu.classList.contains('show');
        this.closeAllDropdowns();
        if (!isOpen) {
            menu.classList.add('show');
            this.activeDropdown = menu;
        }
    }

    showDropdown(menu) {
        this.hideAllDropdowns();
        menu.classList.add('show');
        this.activeDropdown = menu;
    }

    hideDropdown(menu) {
        menu.classList.remove('show');
        if (this.activeDropdown === menu) {
            this.activeDropdown = null;
        }
    }

    closeAllDropdowns() {
        const dropdowns = document.querySelectorAll('.dropdown-content');
        dropdowns.forEach(dropdown => {
            dropdown.classList.remove('show');
        });
        this.activeDropdown = null;
    }

    hideAllDropdowns() {
        const dropdowns = document.querySelectorAll('.dropdown-content');
        dropdowns.forEach(dropdown => {
            dropdown.classList.remove('show');
        });
        this.activeDropdown = null;
    }

    setActiveLink() {
        const currentPath = window.location.pathname;
        const links = document.querySelectorAll('.nav-link, .dropdown-item');
        
        links.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            
            if (href && currentPath.includes(href.replace('.html', ''))) {
                link.classList.add('active');
                
                // If it's a dropdown item, also highlight the parent dropdown
                const dropdownItem = link.closest('.dropdown-item');
                if (dropdownItem) {
                    const parentDropdown = dropdownItem.closest('.dropdown');
                    const parentToggle = parentDropdown.querySelector('.nav-link');
                    if (parentToggle) {
                        parentToggle.classList.add('active');
                    }
                }
            }
        });

        // Handle user menu active state
        const userMenuLinks = document.querySelectorAll('.user-menu .dropdown-item');
        userMenuLinks.forEach(link => {
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

        // Toggle mobile menu on Alt+M
        if (e.altKey && e.key === 'm') {
            e.preventDefault();
            if (this.isMobile) {
                this.toggleMobileMenu();
            }
        }

        // Navigate with arrow keys when dropdown is open
        if (this.activeDropdown) {
            this.handleDropdownKeyboard(e);
        }
    }

    handleDropdownKeyboard(e) {
        const items = this.activeDropdown.querySelectorAll('.dropdown-item');
        const activeItem = this.activeDropdown.querySelector('.dropdown-item.active');
        let currentIndex = -1;

        if (activeItem) {
            currentIndex = Array.from(items).indexOf(activeItem);
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                currentIndex = (currentIndex + 1) % items.length;
                this.setActiveDropdownItem(items[currentIndex]);
                break;
            case 'ArrowUp':
                e.preventDefault();
                currentIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
                this.setActiveDropdownItem(items[currentIndex]);
                break;
            case 'Enter':
                e.preventDefault();
                if (activeItem) {
                    activeItem.click();
                }
                break;
        }
    }

    setActiveDropdownItem(item) {
        // Remove active class from all items
        const items = this.activeDropdown.querySelectorAll('.dropdown-item');
        items.forEach(i => i.classList.remove('active'));
        
        // Add active class to current item
        if (item) {
            item.classList.add('active');
        }
    }

    showLoadingState(link) {
        // Add loading state to clicked link
        const originalText = link.textContent;
        const loadingText = 'Loading...';
        
        link.textContent = loadingText;
        link.style.opacity = '0.7';
        
        // Remove loading state after a short delay
        setTimeout(() => {
            link.textContent = originalText;
            link.style.opacity = '1';
        }, 1000);
    }

    createMobileOverlay() {
        // Remove existing overlay if it exists
        const existingOverlay = document.querySelector('.mobile-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }

        const overlay = document.createElement('div');
        overlay.className = 'mobile-overlay';
        overlay.addEventListener('click', () => {
            if (this.isMobile && this.isMenuOpen) {
                this.toggleMobileMenu();
            }
        });
        document.body.appendChild(overlay);
    }

    // Public methods for external use
    navigateTo(url) {
        window.location.href = url;
    }

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

    updateUserName(name) {
        const userNameElement = document.querySelector('.user-name');
        if (userNameElement) {
            userNameElement.textContent = name;
        }
    }

    updateUserEmail(email) {
        // If you add user email display, update it here
        const userEmailElement = document.querySelector('.user-email');
        if (userEmailElement) {
            userEmailElement.textContent = email;
        }
    }

    addNotification(count) {
        // Add notification badge to user menu
        const userButton = document.querySelector('.user-button');
        if (userButton && count > 0) {
            let badge = userButton.querySelector('.notification-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'notification-badge';
                badge.style.cssText = `
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: #ef4444;
                    color: white;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                `;
                userButton.style.position = 'relative';
                userButton.appendChild(badge);
            }
            badge.textContent = count > 99 ? '99+' : count;
        }
    }

    removeNotification() {
        const badge = document.querySelector('.notification-badge');
        if (badge) {
            badge.remove();
        }
    }

    // Method to programmatically show/hide dropdowns
    showDropdownById(id) {
        const dropdown = document.getElementById(id);
        if (dropdown) {
            this.showDropdown(dropdown);
        }
    }

    hideDropdownById(id) {
        const dropdown = document.getElementById(id);
        if (dropdown) {
            this.hideDropdown(dropdown);
        }
    }

    // Method to add new navigation items dynamically
    addNavigationItem(item) {
        const { text, href, icon, dropdown = false, children = [] } = item;
        const topnavList = document.querySelector('.topnav-list');
        
        if (!topnavList) return;

        const li = document.createElement('li');
        li.className = 'topnav-item';
        
        if (dropdown) {
            li.classList.add('dropdown');
            li.innerHTML = `
                <a href="#" class="topnav-link dropdown-toggle" data-dropdown="${text.toLowerCase()}">
                    ${text}
                    <i class="bi bi-chevron-down dropdown-icon"></i>
                </a>
                <div class="dropdown-menu" id="dropdown-${text.toLowerCase()}">
                    ${children.map(child => `
                        <a href="${child.href}" class="dropdown-item">
                            <i class="${child.icon}"></i>
                            ${child.text}
                        </a>
                    `).join('')}
                </div>
            `;
        } else {
            li.innerHTML = `
                <a href="${href}" class="topnav-link">
                    ${icon ? `<i class="${icon}"></i>` : ''}
                    ${text}
                </a>
            `;
        }

        topnavList.appendChild(li);
        this.initializeDropdowns();
        this.bindNavigationLinks();
    }
}

// Initialize navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.navigation = new Navigation();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Navigation;
}
