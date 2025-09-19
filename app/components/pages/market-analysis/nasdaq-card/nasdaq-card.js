// NASDAQ Card Component JavaScript
class NASDAQCard {
    constructor() {
        this.init();
    }

    init() {
        console.log('NASDAQ Card component initialized');
        this.setupEventListeners();
        this.updateData();
    }

    setupEventListeners() {
        const cardElement = document.querySelector('.market-overview-card.nasdaq');
        if (cardElement) {
            cardElement.addEventListener('click', () => {
                this.handleCardClick();
            });
        }
    }

    handleCardClick() {
        console.log('NASDAQ card clicked');
        // Add logic to show detailed NASDAQ analysis
        // This could open a modal, navigate to a detailed page, etc.
    }

    updateData() {
        // Add logic to fetch and update NASDAQ data
        // This could make API calls to get real-time data
        console.log('Updating NASDAQ data...');
    }

    // Method to update the card with new data
    updateCardData(data) {
        const valueElement = document.querySelector('.market-overview-card.nasdaq .market-overview-value');
        const changeElement = document.querySelector('.market-overview-card.nasdaq .market-overview-change');
        
        if (valueElement && data.value) {
            valueElement.textContent = data.value;
        }
        
        if (changeElement && data.change) {
            changeElement.textContent = data.change;
            changeElement.className = `market-overview-change ${data.change.includes('-') ? 'negative' : ''}`;
        }
    }
}

// Initialize NASDAQ card when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new NASDAQCard();
});

// Export for use in other modules
window.NASDAQCard = NASDAQCard;
