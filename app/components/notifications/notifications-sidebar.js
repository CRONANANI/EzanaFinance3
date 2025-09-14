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
        this.renderNotifications();
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
            
            return `
                <div class="notification-item ${unreadClass}" onclick="notificationsSidebar.markAsRead('${notification.id}')">
                    <div class="notification-header">
                        <div class="notification-icon ${notification.type}">
                            <i class="bi ${notification.icon}"></i>
                        </div>
                        <h4 class="notification-title">${notification.title}</h4>
                        <span class="notification-time">${timeAgo}</span>
                    </div>
                    <div class="notification-content">${notification.content}</div>
                    ${notification.actions.length > 0 ? `
                        <div class="notification-actions">
                            ${notification.actions.map(action => `
                                <button class="notification-action-btn" onclick="event.stopPropagation(); notificationsSidebar.handleAction('${notification.id}', '${action.type}')">
                                    ${action.label}
                                </button>
                            `).join('')}
                        </div>
                    ` : ''}
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
                type: 'congress',
                title: 'New Congress Trade Alert',
                content: 'Rep. Nancy Pelosi made a new trade in NVDA worth $1.2M',
                actions: [
                    { type: 'view', label: 'View Trade' },
                    { type: 'follow', label: 'Follow Rep' }
                ]
            },
            {
                type: 'stocks',
                title: 'Stock Price Alert',
                content: 'AAPL has reached your target price of $180.00',
                actions: [
                    { type: 'view', label: 'View Chart' },
                    { type: 'dismiss', label: 'Dismiss' }
                ]
            },
            {
                type: 'community',
                title: 'New Comment on Thread',
                content: 'John Doe commented on "Market Analysis Q4 2024"',
                actions: [
                    { type: 'view', label: 'View Thread' }
                ]
            },
            {
                type: 'news',
                title: 'Breaking News',
                content: 'Federal Reserve announces interest rate decision',
                actions: [
                    { type: 'view', label: 'Read More' }
                ]
            },
            {
                type: 'watchlist',
                title: 'Watchlist Update',
                content: 'TSLA added 3 new followers to your watchlist',
                actions: [
                    { type: 'view', label: 'View Watchlist' }
                ]
            }
        ];

        sampleNotifications.forEach(notification => {
            this.addNotification(notification);
        });
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
