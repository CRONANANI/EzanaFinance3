// Technical Analysis Card Component JavaScript
class TechnicalAnalysisCard {
    constructor() {
        this.init();
    }

    init() {
        console.log('Technical Analysis Card component initialized');
        this.setupEventListeners();
        this.updateData();
    }

    setupEventListeners() {
        const cardElement = document.querySelector('.analysis-card.technical-analysis-card');
        if (cardElement) {
            cardElement.addEventListener('click', () => {
                this.handleCardClick();
            });
        }

        const viewDetailsButton = document.querySelector('.technical-analysis-card .technical-analysis-header button');
        if (viewDetailsButton) {
            viewDetailsButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleViewDetailsClick();
            });
        }
    }

    handleCardClick() {
        console.log('Technical Analysis card clicked');
        // Add logic to show detailed technical analysis
        // This could open a modal, navigate to a detailed page, etc.
    }

    handleViewDetailsClick() {
        console.log('View Details button clicked');
        // Add logic to show detailed technical analysis view
        // This could open a modal, navigate to a detailed page, etc.
    }

    updateData() {
        // Add logic to fetch and update technical analysis data
        // This could make API calls to get real-time data
        console.log('Updating technical analysis data...');
    }

    // Method to update the card with new technical analysis data
    updateCardData(data) {
        // Update Moving Averages
        if (data.movingAverages) {
            const maElement = document.querySelector('.technical-analysis-card .space-y-4 > div:nth-child(1) .font-semibold');
            if (maElement) {
                maElement.textContent = data.movingAverages.signal;
                maElement.className = `font-semibold ${data.movingAverages.signal.toLowerCase() === 'bullish' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`;
            }
        }

        // Update RSI
        if (data.rsi) {
            const rsiElement = document.querySelector('.technical-analysis-card .space-y-4 > div:nth-child(2) .font-semibold');
            if (rsiElement) {
                rsiElement.textContent = data.rsi.value;
            }
        }

        // Update MACD
        if (data.macd) {
            const macdElement = document.querySelector('.technical-analysis-card .space-y-4 > div:nth-child(3) .font-semibold');
            if (macdElement) {
                macdElement.textContent = data.macd.signal;
                macdElement.className = `font-semibold ${data.macd.signal.toLowerCase() === 'positive' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`;
            }
        }
    }
}

// Initialize Technical Analysis card when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TechnicalAnalysisCard();
});

// Export for use in other modules
window.TechnicalAnalysisCard = TechnicalAnalysisCard;
