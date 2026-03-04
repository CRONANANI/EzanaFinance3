// Notification Helper Functions
// These functions can be called from anywhere in the app to trigger notifications

class NotificationHelpers {
    // Congress-related notifications
    static notifyCongressTrade(representative, company, amount, tradeType) {
        if (window.notificationsSidebar) {
            window.notificationsSidebar.addNotification({
                type: 'congress',
                title: 'New Congress Trade Alert',
                content: `${representative} made a ${tradeType} trade in ${company} worth ${amount}`,
                actions: [
                    { type: 'view', label: 'View Trade Details' },
                    { type: 'follow', label: 'Follow Representative' }
                ],
                data: {
                    representative,
                    company,
                    amount,
                    tradeType
                }
            });
        }
    }

    static notifyCongressActivity(activity, description) {
        if (window.notificationsSidebar) {
            window.notificationsSidebar.addNotification({
                type: 'congress',
                title: 'Congressional Activity',
                content: `${activity}: ${description}`,
                actions: [
                    { type: 'view', label: 'View Details' }
                ]
            });
        }
    }

    // Stock-related notifications
    static notifyStockPriceAlert(symbol, currentPrice, targetPrice, direction) {
        if (window.notificationsSidebar) {
            window.notificationsSidebar.addNotification({
                type: 'stocks',
                title: 'Price Alert Triggered',
                content: `${symbol} ${direction} ${currentPrice} (target: ${targetPrice})`,
                actions: [
                    { type: 'view', label: 'View Chart' },
                    { type: 'dismiss', label: 'Dismiss Alert' }
                ],
                data: {
                    symbol,
                    currentPrice,
                    targetPrice,
                    direction
                }
            });
        }
    }

    static notifyEarningsAnnouncement(symbol, earnings, estimate) {
        if (window.notificationsSidebar) {
            const beat = earnings > estimate ? 'beat' : 'missed';
            window.notificationsSidebar.addNotification({
                type: 'stocks',
                title: 'Earnings Announcement',
                content: `${symbol} ${beat} estimates: $${earnings} vs $${estimate} expected`,
                actions: [
                    { type: 'view', label: 'View Analysis' }
                ]
            });
        }
    }

    static notifyPortfolioUpdate(change, percentage) {
        if (window.notificationsSidebar) {
            const direction = change >= 0 ? 'gained' : 'lost';
            window.notificationsSidebar.addNotification({
                type: 'stocks',
                title: 'Portfolio Update',
                content: `Your portfolio ${direction} ${Math.abs(change)} (${percentage}%) today`,
                actions: [
                    { type: 'view', label: 'View Portfolio' }
                ]
            });
        }
    }

    // Community-related notifications
    static notifyNewComment(threadTitle, commenter, comment) {
        if (window.notificationsSidebar) {
            window.notificationsSidebar.addNotification({
                type: 'community',
                title: 'New Comment',
                content: `${commenter} commented on "${threadTitle}": ${comment.substring(0, 100)}...`,
                actions: [
                    { type: 'view', label: 'View Thread' }
                ]
            });
        }
    }

    static notifyThreadMention(threadTitle, mentioner) {
        if (window.notificationsSidebar) {
            window.notificationsSidebar.addNotification({
                type: 'community',
                title: 'You were mentioned',
                content: `${mentioner} mentioned you in "${threadTitle}"`,
                actions: [
                    { type: 'view', label: 'View Thread' }
                ]
            });
        }
    }

    static notifyExpertInsight(expert, insight) {
        if (window.notificationsSidebar) {
            window.notificationsSidebar.addNotification({
                type: 'community',
                title: 'Expert Insight',
                content: `${expert} shared: ${insight.substring(0, 100)}...`,
                actions: [
                    { type: 'view', label: 'Read Full Insight' }
                ]
            });
        }
    }

    // Watchlist-related notifications
    static notifyWatchlistAddition(symbol, follower) {
        if (window.notificationsSidebar) {
            window.notificationsSidebar.addNotification({
                type: 'watchlist',
                title: 'Watchlist Update',
                content: `${follower} added ${symbol} to their watchlist`,
                actions: [
                    { type: 'view', label: 'View Watchlist' }
                ]
            });
        }
    }

    static notifyAnalystRating(symbol, oldRating, newRating, analyst) {
        if (window.notificationsSidebar) {
            window.notificationsSidebar.addNotification({
                type: 'watchlist',
                title: 'Analyst Rating Change',
                content: `${analyst} changed ${symbol} rating from ${oldRating} to ${newRating}`,
                actions: [
                    { type: 'view', label: 'View Analysis' }
                ]
            });
        }
    }

    // News-related notifications
    static notifyBreakingNews(headline, source) {
        if (window.notificationsSidebar) {
            window.notificationsSidebar.addNotification({
                type: 'news',
                title: 'Breaking News',
                content: `${source}: ${headline}`,
                actions: [
                    { type: 'view', label: 'Read Article' }
                ]
            });
        }
    }

    static notifyMarketNews(symbol, headline) {
        if (window.notificationsSidebar) {
            window.notificationsSidebar.addNotification({
                type: 'news',
                title: 'Market News',
                content: `${symbol}: ${headline}`,
                actions: [
                    { type: 'view', label: 'Read More' }
                ]
            });
        }
    }

    // System notifications
    static notifySystemUpdate(message, type = 'info') {
        if (window.notificationsSidebar) {
            window.notificationsSidebar.addNotification({
                type: 'general',
                title: 'System Update',
                content: message,
                actions: [
                    { type: 'dismiss', label: 'Dismiss' }
                ]
            });
        }
    }

    static notifyFeatureUpdate(feature, description) {
        if (window.notificationsSidebar) {
            window.notificationsSidebar.addNotification({
                type: 'general',
                title: 'New Feature Available',
                content: `${feature}: ${description}`,
                actions: [
                    { type: 'view', label: 'Learn More' }
                ]
            });
        }
    }

    // Utility functions
    static notifyCustom(type, title, content, actions = []) {
        if (window.notificationsSidebar) {
            window.notificationsSidebar.addNotification({
                type,
                title,
                content,
                actions
            });
        }
    }

    // Demo function to show sample notifications
    static showDemoNotifications() {
        // Force reload sample notifications
        if (window.notificationsSidebar) {
            window.notificationsSidebar.forceReloadSampleNotifications();
            window.notificationsSidebar.showToast('Demo notifications loaded!', 'success');
        }
    }
}

// Make functions globally available
window.NotificationHelpers = NotificationHelpers;

// Example usage in other parts of the app:
/*
// In congress trading component
NotificationHelpers.notifyCongressTrade('Rep. Smith', 'AAPL', '$500K', 'sell');

// In stock analysis component
NotificationHelpers.notifyStockPriceAlert('TSLA', '$250.00', '$245.00', 'exceeded');

// In community component
NotificationHelpers.notifyNewComment('Market Discussion', 'User123', 'Interesting point about the market trends');

// In watchlist component
NotificationHelpers.notifyWatchlistAddition('MSFT', 'Investor456');

// Custom notification
NotificationHelpers.notifyCustom('custom', 'Custom Alert', 'This is a custom notification', [
    { type: 'view', label: 'View Details' }
]);
*/
