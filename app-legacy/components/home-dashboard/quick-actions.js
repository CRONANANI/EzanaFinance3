// Quick Actions Component JavaScript

// Function to handle Add Investment button click
function handleAddInvestment() {
    console.log('Opening add investment modal...');
    // This would typically open a modal or navigate to a form
    // For now, we'll just show an alert
    alert('Add Investment feature coming soon!');
}

// Function to handle View Analytics button click
function handleViewAnalytics() {
    console.log('Opening analytics view...');
    // This would typically navigate to analytics page or open a modal
    alert('Analytics view coming soon!');
}

// Function to handle Settings button click
function handleSettings() {
    console.log('Opening settings...');
    // This would typically navigate to settings page
    switchTab('user-profile-settings');
}

// Function to handle Capitol Insights button click
function handleCapitolInsights() {
    console.log('Navigating to Capitol Insights...');
    switchTab('inside-the-capitol');
}

// Function to initialize quick actions
function initializeQuickActions() {
    // Add event listeners to quick action buttons
    const addInvestmentBtn = document.querySelector('.quick-action-button.add-investment');
    if (addInvestmentBtn) {
        addInvestmentBtn.addEventListener('click', handleAddInvestment);
    }
    
    const viewAnalyticsBtn = document.querySelector('.quick-action-button.view-analytics');
    if (viewAnalyticsBtn) {
        viewAnalyticsBtn.addEventListener('click', handleViewAnalytics);
    }
    
    const settingsBtn = document.querySelector('.quick-action-button.settings');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', handleSettings);
    }
    
    // Capitol Insights button already has onclick handler in HTML
    // No need to add event listener here
}

// Function to add a new quick action button dynamically
function addQuickActionButton(title, icon, onClick, className = '') {
    const quickActionsGrid = document.querySelector('.quick-actions-grid');
    if (!quickActionsGrid) return;
    
    const button = document.createElement('button');
    button.className = `quick-action-button ${className}`;
    button.onclick = onClick;
    
    button.innerHTML = `
        <div class="quick-action-content">
            <div class="quick-action-icon">
                <i class="bi ${icon}"></i>
            </div>
            <span class="quick-action-title">${title}</span>
        </div>
    `;
    
    quickActionsGrid.appendChild(button);
}

// Function to remove a quick action button
function removeQuickActionButton(className) {
    const button = document.querySelector(`.quick-action-button.${className}`);
    if (button) {
        button.remove();
    }
}

// Initialize quick actions when component loads
document.addEventListener('DOMContentLoaded', function() {
    initializeQuickActions();
});

// Export functions for use in other components
window.quickActions = {
    handleAddInvestment,
    handleViewAnalytics,
    handleSettings,
    handleCapitolInsights,
    initializeQuickActions,
    addQuickActionButton,
    removeQuickActionButton
};
