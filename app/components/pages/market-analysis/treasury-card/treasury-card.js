// 10Y Treasury Card Component JavaScript
class TreasuryCard {
    constructor() {
        this.init();
    }

    init() {
        console.log('10Y Treasury Card component initialized');
        this.setupEventListeners();
        this.updateData();
    }

    setupEventListeners() {
        const cardElement = document.querySelector('.market-overview-card.treasury');
        if (cardElement) {
            cardElement.addEventListener('click', () => {
                this.handleCardClick();
            });
        }
    }

    handleCardClick() {
        console.log('10Y Treasury card clicked');
        // Add logic to show detailed Treasury analysis
        // This could open a modal, navigate to a detailed page, etc.
    }

    updateData() {
        // Add logic to fetch and update Treasury data
        // This could make API calls to get real-time data
        console.log('Updating 10Y Treasury data...');
    }

    // Method to update the card with new data
    updateCardData(data) {
        const valueElement = document.querySelector('.market-overview-card.treasury .market-overview-value');
        const changeElement = document.querySelector('.market-overview-card.treasury .market-overview-change');
        
        if (valueElement && data.value) {
            valueElement.textContent = data.value;
        }
        
        if (changeElement && data.change) {
            changeElement.textContent = data.change;
            changeElement.className = `market-overview-change ${data.change.includes('-') ? 'negative' : ''}`;
        }
    }
}

// Initialize Treasury card when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TreasuryCard();
});

// Export for use in other modules
window.TreasuryCard = TreasuryCard;
