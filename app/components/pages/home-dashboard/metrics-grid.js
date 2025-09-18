// Metrics Grid Component JavaScript
class MetricsGrid {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.metrics = [];
        this.init();
    }

    init() {
        this.loadMetricsData();
        this.setupEventListeners();
    }

    async loadMetricsData() {
        try {
            // Simulate API call
            const data = {
                todaysPnl: { value: 1234.56, change: 2.1 },
                topPerformer: { symbol: 'AAPL', change: 5.2 },
                riskScore: { score: 7.2, level: 'Moderate' },
                monthlyDividends: { amount: 456.78, change: 12.3 },
                marketPerformance: { change: 3.4, index: 'S&P 500' },
                assetAllocation: { stocks: 60, bonds: 40 }
            };
            
            this.updateMetricsDisplay(data);
        } catch (error) {
            console.error('Error loading metrics data:', error);
        }
    }

    updateMetricsDisplay(data) {
        const cards = this.container.querySelectorAll('.metric-card');
        
        cards.forEach((card, index) => {
            const valueElement = card.querySelector('.metric-value');
            const subtitleElement = card.querySelector('.metric-subtitle');
            
            if (!valueElement || !subtitleElement) return;
            
            switch (index) {
                case 0: // Today's P&L
                    valueElement.textContent = `+$${data.todaysPnl.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
                    subtitleElement.textContent = `+${data.todaysPnl.change}%`;
                    break;
                case 1: // Top Performer
                    valueElement.textContent = data.topPerformer.symbol;
                    subtitleElement.textContent = `+${data.topPerformer.change}%`;
                    break;
                case 2: // Risk Score
                    valueElement.textContent = data.riskScore.score;
                    subtitleElement.textContent = data.riskScore.level;
                    break;
                case 3: // Monthly Dividends
                    valueElement.textContent = `$${data.monthlyDividends.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
                    subtitleElement.textContent = `+${data.monthlyDividends.change}%`;
                    break;
                case 4: // Market Performance
                    valueElement.textContent = `+${data.marketPerformance.change}%`;
                    subtitleElement.textContent = data.marketPerformance.index;
                    break;
                case 5: // Asset Allocation
                    valueElement.textContent = `${data.assetAllocation.stocks}/${data.assetAllocation.bonds}`;
                    subtitleElement.textContent = 'Stocks/Bonds';
                    break;
            }
        });
    }

    setupEventListeners() {
        const cards = this.container.querySelectorAll('.metric-card');
        
        cards.forEach((card, index) => {
            card.addEventListener('click', () => {
                this.handleCardClick(index, card);
            });
            
            card.addEventListener('mouseenter', () => {
                this.handleCardHover(card, true);
            });
            
            card.addEventListener('mouseleave', () => {
                this.handleCardHover(card, false);
            });
        });
    }

    handleCardClick(index, card) {
        console.log(`Clicked metric card ${index}`);
        
        // Add click animation
        card.style.transform = 'scale(0.95)';
        setTimeout(() => {
            card.style.transform = '';
        }, 150);
        
        // Navigate to relevant page or show details
        switch (index) {
            case 0: // Today's P&L
                this.showPnlDetails();
                break;
            case 1: // Top Performer
                this.showTopPerformerDetails();
                break;
            case 2: // Risk Score
                this.showRiskDetails();
                break;
            case 3: // Monthly Dividends
                this.showDividendDetails();
                break;
            case 4: // Market Performance
                this.showMarketDetails();
                break;
            case 5: // Asset Allocation
                this.showAllocationDetails();
                break;
        }
    }

    handleCardHover(card, isHovering) {
        if (isHovering) {
            card.style.transform = 'translateY(-2px)';
            card.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.3)';
        } else {
            card.style.transform = '';
            card.style.boxShadow = '';
        }
    }

    showPnlDetails() {
        // Show P&L details modal or navigate to P&L page
        console.log('Showing P&L details');
    }

    showTopPerformerDetails() {
        // Show top performer details
        console.log('Showing top performer details');
    }

    showRiskDetails() {
        // Show risk analysis details
        console.log('Showing risk details');
    }

    showDividendDetails() {
        // Show dividend analysis
        console.log('Showing dividend details');
    }

    showMarketDetails() {
        // Show market performance details
        console.log('Showing market details');
    }

    showAllocationDetails() {
        // Show asset allocation breakdown
        console.log('Showing allocation details');
    }

    refreshData() {
        this.loadMetricsData();
    }
}

// Initialize metrics grid when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const metricsGrid = document.getElementById('metrics-grid');
    if (metricsGrid) {
        new MetricsGrid('metrics-grid');
    }
});
