// Notifications Sidebar JavaScript

class NotificationsSidebar {
    constructor() {
        this.notifications = [];
        this.currentFilter = 'all';
        this.isOpen = false;
        this.init();
    }

    init() {
        this.loadNotifications();
        
        // If no notifications exist, load sample data
        if (this.notifications.length === 0) {
            this.loadSampleNotifications();
        } else {
            this.renderNotifications();
        }
        
        this.updateNotificationCount();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Close sidebar when clicking outside
        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('notifications-sidebar');
            const toggle = document.getElementById('notifications-toggle');
            
            if (this.isOpen && !sidebar.contains(e.target) && !toggle.contains(e.target)) {
                this.closeSidebar();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'b') {
                e.preventDefault();
                this.toggleSidebar();
            }
        });
    }

    // Toggle sidebar visibility
    toggleSidebar() {
        const sidebar = document.getElementById('notifications-sidebar');
        const toggle = document.getElementById('notifications-toggle');
        
        if (this.isOpen) {
            this.closeSidebar();
        } else {
            this.openSidebar();
        }
    }

    openSidebar() {
        const sidebar = document.getElementById('notifications-sidebar');
        const toggle = document.getElementById('notifications-toggle');
        
        sidebar.classList.add('open');
        toggle.style.transform = 'scale(1.1)';
        this.isOpen = true;
        
        // Mark all as read when opening
        this.markAllAsRead();
    }

    closeSidebar() {
        const sidebar = document.getElementById('notifications-sidebar');
        const toggle = document.getElementById('notifications-toggle');
        
        sidebar.classList.remove('open');
        toggle.style.transform = 'scale(1)';
        this.isOpen = false;
    }

    // Add a new notification
    addNotification(notification) {
        const newNotification = {
            id: Date.now() + Math.random(),
            type: notification.type || 'general',
            title: notification.title,
            content: notification.content,
            time: new Date(),
            read: false,
            actions: notification.actions || [],
            icon: notification.icon || this.getDefaultIcon(notification.type),
            ...notification
        };

        this.notifications.unshift(newNotification);
        this.saveNotifications();
        this.renderNotifications();
        this.updateNotificationCount();
        this.showNotificationToast(newNotification);
    }

    // Get default icon based on notification type
    getDefaultIcon(type) {
        const icons = {
            congress: 'bi-building',
            stocks: 'bi-graph-up',
            community: 'bi-people',
            watchlist: 'bi-bookmark-star',
            news: 'bi-newspaper',
            general: 'bi-bell'
        };
        return icons[type] || icons.general;
    }

    // Show toast notification for new items
    showNotificationToast(notification) {
        const toast = document.createElement('div');
        toast.className = 'notification-toast';
        toast.innerHTML = `
            <div class="toast-content">
                <i class="bi ${notification.icon}"></i>
                <div>
                    <strong>${notification.title}</strong>
                    <p>${notification.content}</p>
                </div>
            </div>
        `;
        
        // Add toast styles
        toast.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 15px;
            box-shadow: var(--shadow-lg);
            z-index: 1001;
            max-width: 300px;
            animation: slideInFromRight 0.3s ease-out;
        `;
        
        document.body.appendChild(toast);
        
        // Remove after 5 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOutToRight 0.3s ease-in';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    // Filter notifications
    filterNotifications(filter) {
        this.currentFilter = filter;
        
        // Update filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        
        this.renderNotifications();
    }

    // Render notifications list
    renderNotifications() {
        const container = document.getElementById('notifications-list');
        const emptyState = document.getElementById('notifications-empty');
        
        let filteredNotifications = this.notifications;
        if (this.currentFilter !== 'all') {
            filteredNotifications = this.notifications.filter(n => n.type === this.currentFilter);
        }
        
        if (filteredNotifications.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'flex';
            return;
        }
        
        emptyState.style.display = 'none';
        
        container.innerHTML = filteredNotifications.map(notification => {
            const timeAgo = this.getTimeAgo(notification.time);
            const unreadClass = notification.read ? '' : 'unread';
            const unreadBadge = notification.read ? '' : '<div class="unread-badge"></div>';
            
            return `
                <div class="notification-item ${unreadClass}" onclick="notificationsSidebar.markAsRead('${notification.id}')">
                    ${unreadBadge}
                    <div class="notification-content">
                        <div class="notification-icon ${notification.type}">
                            <i class="bi ${notification.icon}"></i>
                        </div>
                        <div class="notification-text">
                            <div class="notification-title">${notification.title}</div>
                            <div class="notification-description">${notification.content}</div>
                            <div class="notification-meta">
                                <div class="notification-time">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M17 13H11V7H12.5V11.5H17V13Z"/>
                                    </svg>
                                    ${timeAgo}
                                </div>
                                <div class="notification-badge">${notification.badge || notification.type}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Mark notification as read
    markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id == notificationId);
        if (notification) {
            notification.read = true;
            this.saveNotifications();
            this.renderNotifications();
            this.updateNotificationCount();
        }
    }

    // Mark all notifications as read
    markAllAsRead() {
        this.notifications.forEach(notification => {
            notification.read = true;
        });
        this.saveNotifications();
        this.renderNotifications();
        this.updateNotificationCount();
    }

    // Handle notification actions
    handleAction(notificationId, actionType) {
        const notification = this.notifications.find(n => n.id == notificationId);
        if (!notification) return;

        switch (actionType) {
            case 'view':
                // Navigate to relevant page
                this.navigateToNotification(notification);
                break;
            case 'dismiss':
                this.removeNotification(notificationId);
                break;
            case 'follow':
                // Handle follow action
                this.handleFollowAction(notification);
                break;
            default:
                console.log(`Action ${actionType} not implemented`);
        }
    }

    // Navigate to notification context
    navigateToNotification(notification) {
        const routes = {
            congress: 'inside-the-capitol',
            stocks: 'market-analysis',
            community: 'community',
            watchlist: 'watchlists'
        };
        
        const route = routes[notification.type];
        if (route) {
            switchTab(route);
            this.closeSidebar();
        }
    }

    // Handle follow action
    handleFollowAction(notification) {
        // Implement follow logic based on notification type
        console.log(`Following ${notification.type} notification:`, notification);
        this.showToast('Action completed!', 'success');
    }

    // Remove notification
    removeNotification(notificationId) {
        this.notifications = this.notifications.filter(n => n.id != notificationId);
        this.saveNotifications();
        this.renderNotifications();
        this.updateNotificationCount();
    }

    // Update notification count
    updateNotificationCount() {
        const unreadCount = this.notifications.filter(n => !n.read).length;
        const countElement = document.getElementById('notification-count');
        countElement.textContent = unreadCount;
        countElement.style.display = unreadCount > 0 ? 'flex' : 'none';
    }

    // Get time ago string
    getTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    }

    // Load notifications from localStorage
    loadNotifications() {
        const saved = localStorage.getItem('ezana-notifications');
        if (saved) {
            this.notifications = JSON.parse(saved).map(n => ({
                ...n,
                time: new Date(n.time)
            }));
        } else {
            // Load sample notifications
            this.loadSampleNotifications();
        }
    }

    // Save notifications to localStorage
    saveNotifications() {
        localStorage.setItem('ezana-notifications', JSON.stringify(this.notifications));
    }

    // Load sample notifications for demo
    loadSampleNotifications() {
        const sampleNotifications = [
            {
                id: '1',
                type: 'watchlist',
                title: 'Nancy Pelosi Stock Trade Alert',
                content: 'Rep. Nancy Pelosi disclosed new NVIDIA stock purchases worth $1.2M',
                time: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
                read: false,
                icon: 'bi-star-fill',
                badge: 'Watchlist'
            },
            {
                id: '2',
                type: 'news',
                title: 'AAPL Breaking News',
                content: 'Apple announces record Q4 earnings, stock up 5% in after-hours trading',
                time: new Date(Date.now() - 8 * 60 * 1000), // 8 minutes ago
                read: false,
                icon: 'bi-newspaper',
                badge: 'News'
            },
            {
                id: '3',
                type: 'portfolio',
                title: 'Portfolio Alert',
                content: 'Your portfolio gained $2,847.31 today (+2.26%)',
                time: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
                read: true,
                icon: 'bi-graph-up',
                badge: 'Portfolio'
            },
            {
                id: '4',
                type: 'social',
                title: 'Friend Activity',
                content: 'Alex commented on your Tesla discussion thread',
                time: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
                read: false,
                icon: 'bi-person',
                badge: 'Social'
            },
            {
                id: '5',
                type: 'watchlist',
                title: 'Dan Crenshaw Trade Alert',
                content: 'Rep. Dan Crenshaw sold defense stocks before committee vote',
                time: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
                read: true,
                icon: 'bi-star-fill',
                badge: 'Watchlist'
            },
            {
                id: '6',
                type: 'research',
                title: 'Market Analysis',
                content: 'New research report on your TSLA position shows strong buy signals',
                time: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
                read: true,
                icon: 'bi-newspaper',
                badge: 'Research'
            },
            {
                id: '7',
                type: 'payment',
                title: 'Dividend Payment',
                content: 'Received $127.50 dividend payment from MSFT',
                time: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
                read: true,
                icon: 'bi-graph-up',
                badge: 'Payment'
            }
        ];

        this.notifications = sampleNotifications;
        this.saveNotifications();
        this.renderNotifications(); // Immediately render the notifications
    }

    // Show toast message
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--primary);
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 1002;
            animation: slideInFromRight 0.3s ease-out;
        `;
        
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}

// Global functions for HTML onclick handlers
function toggleSidebar() {
    const sidebar = document.getElementById('notifications-sidebar');
    if (!sidebar) {
        console.error('Sidebar element not found');
        return;
    }
    
    sidebar.classList.toggle('collapsed');
    
    // Adjust main content margin
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        if (sidebar.classList.contains('collapsed')) {
            mainContent.style.marginLeft = '60px';
        } else {
            mainContent.style.marginLeft = '350px';
        }
    }
    
    const collapseBtn = document.querySelector('.collapse-btn svg');
    if (collapseBtn) {
        if (sidebar.classList.contains('collapsed')) {
            collapseBtn.innerHTML = '<path d="M8.59 16.59L10 18L16 12L10 6L8.59 7.41L13.17 12Z"/>';
        } else {
            collapseBtn.innerHTML = '<path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12Z"/>';
        }
    } else {
        console.error('Collapse button not found');
    }
}

function toggleNotificationsSidebar() {
    if (window.notificationsSidebar) {
        window.notificationsSidebar.toggleSidebar();
    }
}

function markAllAsRead() {
    if (window.notificationsSidebar) {
        window.notificationsSidebar.markAllAsRead();
    }
}

function openNotificationSettings() {
    // Implement notification settings modal
    console.log('Opening notification settings...');
}

function filterNotifications(filter) {
    if (window.notificationsSidebar) {
        window.notificationsSidebar.filterNotifications(filter);
    }
}

// Initialize notifications sidebar when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.notificationsSidebar = new NotificationsSidebar();
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInFromRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutToRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
