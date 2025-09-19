// Sector Performance Card Component JavaScript
class SectorPerformanceCard {
    constructor() {
        this.init();
    }

    init() {
        console.log('Sector Performance Card component initialized');
        this.setupEventListeners();
        this.updateData();
    }

    setupEventListeners() {
        const cardElement = document.querySelector('.analysis-card.sector-performance-card');
        if (cardElement) {
            cardElement.addEventListener('click', () => {
                this.handleCardClick();
            });
        }

        const timeSelect = document.querySelector('.sector-performance-card select');
        if (timeSelect) {
            timeSelect.addEventListener('change', (e) => {
                this.handleTimePeriodChange(e.target.value);
            });
        }
    }

    handleCardClick() {
        console.log('Sector Performance card clicked');
        // Add logic to show detailed sector performance
        // This could open a modal, navigate to a detailed page, etc.
    }

    handleTimePeriodChange(period) {
        console.log(`Time period changed to: ${period}`);
        // Add logic to update sector performance data based on time period
        this.updateData(period);
    }

    updateData(timePeriod = 'Today') {
        // Add logic to fetch and update sector performance data
        // This could make API calls to get real-time data
        console.log(`Updating sector performance data for: ${timePeriod}`);
    }

    // Method to update the card with new sector performance data
    updateCardData(data) {
        const sectors = [
            { name: 'Technology', color: 'emerald', value: '+2.34%' },
            { name: 'Healthcare', color: 'blue', value: '+1.89%' },
            { name: 'Financial', color: 'purple', value: '+1.45%' },
            { name: 'Energy', color: 'orange', value: '-0.78%' },
            { name: 'Real Estate', color: 'red', value: '-1.23%' }
        ];

        sectors.forEach((sector, index) => {
            const sectorElement = document.querySelector(`.sector-performance-card .space-y-3 > div:nth-child(${index + 1})`);
            if (sectorElement && data[sector.name]) {
                const valueElement = sectorElement.querySelector('.font-semibold');
                if (valueElement) {
                    valueElement.textContent = data[sector.name].value;
                    const isPositive = data[sector.name].value.includes('+');
                    valueElement.className = `font-semibold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`;
                }
            }
        });
    }
}

// Initialize Sector Performance card when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SectorPerformanceCard();
});

// Export for use in other modules
window.SectorPerformanceCard = SectorPerformanceCard;
