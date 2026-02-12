// Notifications Sidebar JavaScript

class NotificationsSidebar {
    constructor() {
        this.notifications = [];
        this.currentFilter = 'all';
        this.isOpen = false;
        this.init();
    }

    init() {
        console.log('Initializing notifications sidebar...');
        // Always load sample notifications for demo
        this.loadSampleNotifications();
        this.updateNotificationCount();
        this.setupEventListeners();
        
        // Sync body class with sidebar state (for content margin)
        const sidebar = document.getElementById('notifications-sidebar');
        if (sidebar && sidebar.classList.contains('open')) {
            document.body.classList.add('sidebar-open');
        }

        // Open sidebar by default on home dashboard
        if (window.location.pathname.includes('home-dashboard') || window.location.pathname.includes('index')) {
            setTimeout(() => {
                this.openSidebar();
            }, 100);
        }

        console.log('Notifications sidebar initialized with', this.notifications.length, 'notifications');
    }

    setupEventListeners() {
        // Bind nav notification toggle (from navigation component)
        const navNotificationToggle = document.getElementById('notificationToggle');
        if (navNotificationToggle) {
            navNotificationToggle.addEventListener('click', () => this.toggleSidebar());
        }

        // Close sidebar when clicking outside
        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('notifications-sidebar');
            const toggle = document.getElementById('notifications-toggle');
            const navToggle = document.getElementById('notificationToggle');
            if (this.isOpen && sidebar && !sidebar.contains(e.target) && !toggle?.contains(e.target) && !navToggle?.contains(e.target)) {
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
        document.body.classList.add('sidebar-open');
        if (toggle) toggle.style.transform = 'scale(1.1)';
        this.isOpen = true;
        
        this.markAllAsRead();
    }

    closeSidebar() {
        const sidebar = document.getElementById('notifications-sidebar');
        const toggle = document.getElementById('notifications-toggle');
        
        sidebar.classList.remove('open');
        document.body.classList.remove('sidebar-open');
        if (toggle) toggle.style.transform = 'scale(1)';
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

    // Filter notifications (all | congress | portfolio_alerts | community | market_news)
    filterNotifications(filter) {
        this.currentFilter = filter;
        
        const btn = document.querySelector(`.filter-btn[data-filter="${filter}"]`);
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        
        this.renderNotifications();
    }

    // Render notifications list
    renderNotifications() {
        console.log('Rendering notifications...', this.notifications.length, 'notifications');
        const container = document.getElementById('notifications-list');
        const emptyState = document.getElementById('notifications-empty');
        
        if (!container) {
            console.error('Notifications list container not found');
            return;
        }
        
        let filteredNotifications = this.notifications;
        if (this.currentFilter !== 'all') {
            if (this.currentFilter === 'portfolio_alerts') {
                filteredNotifications = this.notifications.filter(n => n.type === 'portfolio_alerts' || (n.type === 'stocks' && (n.badge === 'Portfolio' || n.badge === 'Alert')));
            } else if (this.currentFilter === 'market_news') {
                filteredNotifications = this.notifications.filter(n => n.type === 'market_news' || n.type === 'news' || (n.type === 'stocks' && ['Earnings', 'Market', 'Research'].includes(n.badge)));
            } else {
                filteredNotifications = this.notifications.filter(n => n.type === this.currentFilter);
            }
        }
        
        if (filteredNotifications.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'flex';
            return;
        }
        
        emptyState.style.display = 'none';
        
        container.innerHTML = filteredNotifications.map(notification => {
            const timeAgo = this.getTimeAgo(notification.time);
            const unreadClass = notification.read ? 'read' : 'unread';
            const unreadBadge = notification.read ? '' : '<div class="unread-badge"></div>';
            const priority = notification.priority || 'medium';
            const priorityLabel = { high: '🔴 High', medium: '🟡 Medium', low: '🟢 Low' }[priority] || '🟡 Medium';
            const sentiment = notification.sentiment;
            const sentimentHtml = sentiment === 'bullish' ? '<span class="sentiment-badge bullish" title="Bullish"><i class="bi bi-graph-up-arrow"></i></span>' : sentiment === 'bearish' ? '<span class="sentiment-badge bearish" title="Bearish"><i class="bi bi-graph-down-arrow"></i></span>' : '';
            const ticker = notification.ticker || '';
            const tickerHtml = ticker ? `<div class="notification-ticker"><a href="#" class="ticker-link" onclick="event.preventDefault(); notificationsSidebar.quickTickerAction('${ticker}', 'view')">${ticker}</a><button type="button" class="ticker-action-btn buy" onclick="event.stopPropagation(); notificationsSidebar.quickTickerAction('${ticker}', 'buy')" title="Quick buy">Buy</button><button type="button" class="ticker-action-btn sell" onclick="event.stopPropagation(); notificationsSidebar.quickTickerAction('${ticker}', 'sell')" title="Quick sell">Sell</button></div>` : '';
            const badgeDisplay = notification.badge || (notification.type === 'congress' ? 'Congress' : notification.type === 'portfolio_alerts' ? 'Portfolio' : notification.type === 'market_news' ? 'News' : notification.type);
            return `
                <div class="notification-item ${unreadClass}" data-id="${notification.id}">
                    ${unreadBadge}
                    <div class="notification-content" onclick="notificationsSidebar.markAsRead('${notification.id}')">
                        <div class="notification-icon ${notification.type}">
                            <i class="bi ${notification.icon}"></i>
                        </div>
                        <div class="notification-text">
                            <div class="notification-meta-top">
                                <span class="priority-badge priority-${priority}">${priorityLabel}</span>
                                ${sentimentHtml}
                                <span class="notification-type-badge">${badgeDisplay}</span>
                            </div>
                            <div class="notification-title">${notification.title}</div>
                            <div class="notification-description">${notification.content}</div>
                            ${tickerHtml}
                            <div class="notification-meta">
                                <div class="notification-time">${timeAgo}</div>
                                <div class="notification-actions-inline">
                                    <button type="button" class="action-link mark-read" onclick="event.stopPropagation(); notificationsSidebar.markAsRead('${notification.id}')" title="Mark as read">Mark read</button>
                                    <button type="button" class="action-link dismiss" onclick="event.stopPropagation(); notificationsSidebar.removeNotification('${notification.id}')" title="Dismiss">Dismiss</button>
                                </div>
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

    // Remove notification (Dismiss)
    removeNotification(notificationId) {
        this.notifications = this.notifications.filter(n => n.id != notificationId);
        this.saveNotifications();
        this.renderNotifications();
        this.updateNotificationCount();
    }

    // Quick action for ticker (buy/sell/view) - can wire to trading or watchlist
    quickTickerAction(ticker, action) {
        if (action === 'buy') {
            this.showToast(`Quick buy ${ticker} – connect to broker`, 'info');
        } else if (action === 'sell') {
            this.showToast(`Quick sell ${ticker} – connect to broker`, 'info');
        } else {
            switchTab('watchlist');
        }
    }

    // Update notification count
    updateNotificationCount() {
        const unreadCount = this.notifications.filter(n => !n.read).length;
        const badge = document.getElementById('notificationCountBadge');
        
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
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

    // Load sample notifications for demo (priority: high|medium|low; sentiment: bullish|bearish; ticker for quick actions)
    loadSampleNotifications() {
        console.log('Loading sample notifications...');
        const sampleNotifications = [
            { id: '1', type: 'congress', title: 'Nancy Pelosi Trade Alert', content: 'Rep. Nancy Pelosi disclosed new NVIDIA stock purchases worth $1.2M', time: new Date(Date.now() - 2 * 60 * 1000), read: false, icon: 'bi-building', badge: 'Congress', priority: 'high', sentiment: 'bullish', ticker: 'NVDA' },
            { id: '2', type: 'market_news', title: 'AAPL Breaking News', content: 'Apple announces record Q4 earnings, stock up 5% in after-hours trading', time: new Date(Date.now() - 8 * 60 * 1000), read: false, icon: 'bi-graph-up', badge: 'Earnings', priority: 'high', sentiment: 'bullish', ticker: 'AAPL' },
            { id: '3', type: 'portfolio_alerts', title: 'Portfolio Alert', content: 'Your portfolio gained $2,847.31 today (+2.26%)', time: new Date(Date.now() - 60 * 60 * 1000), read: true, icon: 'bi-graph-up', badge: 'Portfolio', priority: 'medium', sentiment: 'bullish' },
            { id: '4', type: 'community', title: 'Community Discussion', content: 'Alex commented on your Tesla discussion thread', time: new Date(Date.now() - 2 * 60 * 60 * 1000), read: false, icon: 'bi-people', badge: 'Community', priority: 'low' },
            { id: '5', type: 'congress', title: 'Dan Crenshaw Trade Alert', content: 'Rep. Dan Crenshaw sold defense stocks before committee vote', time: new Date(Date.now() - 4 * 60 * 60 * 1000), read: true, icon: 'bi-building', badge: 'Congress', priority: 'high', sentiment: 'bearish' },
            { id: '6', type: 'market_news', title: 'Market Analysis', content: 'New research report on your TSLA position shows strong buy signals', time: new Date(Date.now() - 6 * 60 * 60 * 1000), read: true, icon: 'bi-graph-up', badge: 'Research', priority: 'medium', sentiment: 'bullish', ticker: 'TSLA' },
            { id: '7', type: 'portfolio_alerts', title: 'Dividend Payment', content: 'Received $127.50 dividend payment from MSFT', time: new Date(Date.now() - 24 * 60 * 60 * 1000), read: true, icon: 'bi-graph-up', badge: 'Payment', priority: 'low', ticker: 'MSFT' },
            { id: '8', type: 'congress', title: 'Senate Trading Activity', content: 'Sen. Richard Burr sold $1.8M in airline stocks before market crash', time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), read: true, icon: 'bi-building', badge: 'Congress', priority: 'high', sentiment: 'bearish' },
            { id: '9', type: 'market_news', title: 'Market Volatility Alert', content: 'S&P 500 dropped 2.3% - consider rebalancing your portfolio', time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), read: true, icon: 'bi-graph-down', badge: 'Market', priority: 'high', sentiment: 'bearish' },
            { id: '10', type: 'community', title: 'New Discussion Thread', content: 'Sarah started a discussion about renewable energy stocks', time: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), read: true, icon: 'bi-people', badge: 'Community', priority: 'low' },
            { id: '11', type: 'congress', title: 'House Committee Vote', content: 'Financial Services Committee votes on banking regulations tomorrow', time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), read: true, icon: 'bi-building', badge: 'Congress', priority: 'medium' },
            { id: '12', type: 'market_news', title: 'Earnings Report', content: 'Tesla Q4 earnings beat expectations, stock up 8% pre-market', time: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), read: true, icon: 'bi-graph-up', badge: 'Earnings', priority: 'high', sentiment: 'bullish', ticker: 'TSLA' }
        ];

        this.notifications = sampleNotifications;
        this.saveNotifications();
        this.renderNotifications(); // Immediately render the notifications
    }

    // Force reload sample notifications (clears localStorage first)
    forceReloadSampleNotifications() {
        localStorage.removeItem('ezana-notifications');
        this.loadSampleNotifications();
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
    console.log('DOM loaded, initializing notifications sidebar...');
    window.notificationsSidebar = new NotificationsSidebar();
    
    // Force reload sample data after a short delay to ensure everything is loaded
    setTimeout(() => {
        if (window.notificationsSidebar) {
            console.log('Force reloading sample notifications...');
            window.notificationsSidebar.forceReloadSampleNotifications();
        }
    }, 500);
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

// Global function for sidebar collapse/expand (narrow strip vs full width)
function toggleSidebarCollapse() {
    const sidebar = document.getElementById('notifications-sidebar');
    const collapseBtn = document.querySelector('.notifications-collapse i');
    const sidebarWidth = 280; /* match --sidebar-width in theme */

    if (sidebar) {
        const isCollapsed = sidebar.classList.contains('collapsed');

        if (isCollapsed) {
            sidebar.classList.remove('collapsed');
            document.body.classList.add('sidebar-open');
            if (collapseBtn) {
                collapseBtn.className = 'bi bi-chevron-double-left';
            }
        } else {
            sidebar.classList.add('collapsed');
            document.body.classList.remove('sidebar-open');
            if (collapseBtn) {
                collapseBtn.className = 'bi bi-chevron-double-right';
            }
        }
    }
}

// Add click handler for collapsed state expand
document.addEventListener('click', function(e) {
    const sidebar = document.getElementById('notifications-sidebar');
    if (sidebar && sidebar.classList.contains('collapsed')) {
        const rect = sidebar.getBoundingClientRect();
        const clickX = e.clientX;
        const clickY = e.clientY;
        
        // Check if click is on the collapsed sidebar area or expand button
        if (clickX >= rect.left && clickX <= rect.right + 30 && 
            clickY >= rect.top && clickY <= rect.bottom) {
            toggleSidebarCollapse();
        }
    }
});

// Make function globally available
window.toggleSidebarCollapse = toggleSidebarCollapse;