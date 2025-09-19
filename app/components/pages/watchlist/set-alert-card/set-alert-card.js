// Set Alert Card Component JavaScript
class SetAlertCard {
    constructor() {
        this.init();
    }

    init() {
        console.log('Set Alert Card component initialized');
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Add any specific event listeners for the set alert card
        const cardElement = document.querySelector('.set-alert-card');
        if (cardElement) {
            cardElement.addEventListener('click', (e) => {
                // Don't trigger if clicking the button directly
                if (!e.target.closest('.card-action-btn')) {
                    this.handleCardClick();
                }
            });
        }
    }

    handleCardClick() {
        console.log('Set Alert card clicked');
        // Add any card-specific click behavior here
    }

    // Method to open alert settings
    openAlertSettings() {
        console.log('Opening alert settings...');
        // Add logic to open alert settings modal or page
        // This could trigger a modal, redirect to settings, etc.
        
        // Example: Show a simple message for now
        alert('Alert settings would open here. You can configure price alerts, notification preferences, and more.');
    }
}

// Initialize set alert card when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SetAlertCard();
});

// Global function for button click
function openAlertSettings() {
    const card = new SetAlertCard();
    card.openAlertSettings();
}

// Export for use in other modules
window.SetAlertCard = SetAlertCard;
