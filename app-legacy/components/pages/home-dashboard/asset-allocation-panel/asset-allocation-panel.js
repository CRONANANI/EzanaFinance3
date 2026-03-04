/**
 * Asset Allocation Panel - rebalance action
 */
function rebalanceAllocation() {
    if (window.notificationsSidebar && window.notificationsSidebar.showToast) {
        window.notificationsSidebar.showToast('Rebalance order submitted – connect to broker for execution', 'info');
    }
    console.log('Quick rebalance requested');
}

window.rebalanceAllocation = rebalanceAllocation;
