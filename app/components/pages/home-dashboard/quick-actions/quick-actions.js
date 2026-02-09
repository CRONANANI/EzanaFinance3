/**
 * Quick Actions Panel - Refresh, Report, Transaction, Analysis, Alerts, Watchlist
 */
(function () {
    function init() {
        const panel = document.getElementById('quick-actions-panel');
        if (!panel) return;

        panel.querySelectorAll('.quick-action-item').forEach(btn => {
            btn.addEventListener('click', function () {
                const action = this.getAttribute('data-action');
                handleAction(action);
            });
        });
    }

    function handleAction(action) {
        switch (action) {
            case 'refresh':
                if (window.notificationsSidebar) window.notificationsSidebar.forceReloadSampleNotifications?.();
                if (typeof loadDashboardData === 'function') loadDashboardData();
                if (typeof updateChart === 'function') updateChart();
                showToast('Data refreshed');
                break;
            case 'report':
                showToast('Generate Report – open reports page');
                if (typeof switchTab === 'function') switchTab('financial-analytics');
                break;
            case 'transaction':
                showToast('Add Transaction – open portfolio or transactions');
                break;
            case 'analysis':
                showToast('Run Analysis – open analytics');
                if (typeof switchTab === 'function') switchTab('financial-analytics');
                break;
            case 'alerts':
                showToast('Set Alerts – open notification settings');
                if (typeof openNotificationSettings === 'function') openNotificationSettings();
                break;
            case 'watchlist':
                if (typeof switchTab === 'function') switchTab('watchlist');
                else window.location.href = 'watchlist.html';
                break;
            default:
                break;
        }
    }

    function showToast(msg) {
        if (window.notificationsSidebar && window.notificationsSidebar.showToast) {
            window.notificationsSidebar.showToast(msg, 'success');
        } else {
            console.log(msg);
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})();
