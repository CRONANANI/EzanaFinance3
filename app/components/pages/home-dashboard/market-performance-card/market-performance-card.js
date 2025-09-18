// Market Performance Card Component
class MarketPerformanceCard {
    constructor() {
        this.data = {
            performance: '+8.4%',
            comparison: 'vs S&P 500: +6.2%',
            trend: 'positive'
        };
    }

    init() {
        this.render();
        this.setupEventListeners();
    }

    render() {
        // Component is rendered via HTML, this method can be used for dynamic updates
        console.log('Market Performance card initialized');
    }

    setupEventListeners() {
        // Add any event listeners if needed
    }

    updateData(newData) {
        this.data = { ...this.data, ...newData };
        this.render();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MarketPerformanceCard;
} else {
    window.MarketPerformanceCard = MarketPerformanceCard;
}
