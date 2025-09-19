// S&P 500 Card Component JavaScript
class SP500Card {
    constructor() {
        this.init();
    }

    init() {
        console.log('S&P 500 Card component initialized');
        this.setupEventListeners();
        this.updateData();
    }

    setupEventListeners() {
        const cardElement = document.querySelector('.market-overview-card.s-p-500');
        if (cardElement) {
            cardElement.addEventListener('click', () => {
                this.handleCardClick();
            });
        }
    }

    handleCardClick() {
        console.log('S&P 500 card clicked');
        // Add logic to show detailed S&P 500 analysis
        // This could open a modal, navigate to a detailed page, etc.
    }

    updateData() {
        // Add logic to fetch and update S&P 500 data
        // This could make API calls to get real-time data
        console.log('Updating S&P 500 data...');
    }

    // Method to update the card with new data
    updateCardData(data) {
        const valueElement = document.querySelector('.market-overview-card.s-p-500 .market-overview-value');
        const changeElement = document.querySelector('.market-overview-card.s-p-500 .market-overview-change');
        
        if (valueElement && data.value) {
            valueElement.textContent = data.value;
        }
        
        if (changeElement && data.change) {
            changeElement.textContent = data.change;
            changeElement.className = `market-overview-change ${data.change.includes('-') ? 'negative' : ''}`;
        }
    }
}

// Initialize S&P 500 card when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SP500Card();
});

// Export for use in other modules
window.SP500Card = SP500Card;
