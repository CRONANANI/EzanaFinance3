// VIX Card Component JavaScript
class VIXCard {
    constructor() {
        this.init();
    }

    init() {
        console.log('VIX Card component initialized');
        this.setupEventListeners();
        this.updateData();
    }

    setupEventListeners() {
        const cardElement = document.querySelector('.market-overview-card.vix');
        if (cardElement) {
            cardElement.addEventListener('click', () => {
                this.handleCardClick();
            });
        }
    }

    handleCardClick() {
        console.log('VIX card clicked');
        // Add logic to show detailed VIX analysis
        // This could open a modal, navigate to a detailed page, etc.
    }

    updateData() {
        // Add logic to fetch and update VIX data
        // This could make API calls to get real-time data
        console.log('Updating VIX data...');
    }

    // Method to update the card with new data
    updateCardData(data) {
        const valueElement = document.querySelector('.market-overview-card.vix .market-overview-value');
        const changeElement = document.querySelector('.market-overview-card.vix .market-overview-change');
        
        if (valueElement && data.value) {
            valueElement.textContent = data.value;
        }
        
        if (changeElement && data.change) {
            changeElement.textContent = data.change;
            changeElement.className = `market-overview-change ${data.change.includes('-') ? 'negative' : ''}`;
        }
    }
}

// Initialize VIX card when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VIXCard();
});

// Export for use in other modules
window.VIXCard = VIXCard;
