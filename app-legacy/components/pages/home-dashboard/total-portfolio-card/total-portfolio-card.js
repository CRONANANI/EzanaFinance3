// Total Portfolio Value Card Component

class TotalPortfolioCard {
    constructor() {
        this.init();
    }

    init() {
        this.initializeChart();
        this.setupEventListeners();
        console.log('Total Portfolio Card initialized');
    }

    initializeChart() {
        // Wait for DOM to be ready
        setTimeout(() => {
            const canvas = document.getElementById('portfolio-chart');
            if (canvas && typeof updatePortfolioChart === 'function') {
                console.log('Initializing portfolio chart...');
                // Force canvas dimensions
                canvas.width = 800;
                canvas.height = 400;
                updatePortfolioChart();
            } else {
                console.log('Canvas or updatePortfolioChart function not found');
                console.log('Canvas element:', canvas);
                console.log('updatePortfolioChart function:', typeof updatePortfolioChart);
            }
        }, 100);
    }

    setupEventListeners() {
        // Listen for chart updates
        const select = document.getElementById('portfolio-time-period');
        if (select) {
            select.addEventListener('change', () => {
                console.log('Time period changed to:', select.value);
                this.updateChart();
            });
        }
    }

    updateChart() {
        const canvas = document.getElementById('portfolio-chart');
        if (canvas && typeof updatePortfolioChart === 'function') {
            console.log('Updating portfolio chart...');
            updatePortfolioChart();
        }
    }

    refreshData() {
        console.log('Refreshing portfolio data...');
        const lastUpdated = document.getElementById('portfolio-last-updated');
        if (lastUpdated) {
            const now = new Date();
            lastUpdated.textContent = now.toLocaleString();
        }
        
        // Add refresh animation
        const refreshBtn = document.querySelector('.refresh-btn');
        if (refreshBtn) {
            refreshBtn.style.transform = 'rotate(360deg)';
            setTimeout(() => {
                refreshBtn.style.transform = 'rotate(0deg)';
            }, 500);
        }
        
        // Update chart
        this.updateChart();
    }
}

// Global functions for onclick handlers
function refreshPortfolioData() {
    if (window.totalPortfolioCard) {
        window.totalPortfolioCard.refreshData();
    }
}

function updatePortfolioChart() {
    if (window.totalPortfolioCard) {
        window.totalPortfolioCard.updateChart();
    }
}

// Initialize portfolio card when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing total portfolio card...');
    setTimeout(() => {
        window.totalPortfolioCard = new TotalPortfolioCard();
        console.log('Total portfolio card initialized');
    }, 500);
});

// Also try to initialize when window loads
window.addEventListener('load', function() {
    if (!window.totalPortfolioCard) {
        console.log('Window loaded, initializing total portfolio card...');
        window.totalPortfolioCard = new TotalPortfolioCard();
        console.log('Total portfolio card initialized on window load');
    }
});

// Force chart initialization with multiple attempts
let chartInitAttempts = 0;
const maxChartAttempts = 10;

function forceChartInit() {
    chartInitAttempts++;
    console.log(`Chart initialization attempt ${chartInitAttempts}`);
    
    const canvas = document.getElementById('portfolio-chart');
    if (canvas && typeof updatePortfolioChart === 'function') {
        canvas.width = 800;
        canvas.height = 400;
        updatePortfolioChart();
        console.log('Chart force initialized successfully!');
    } else if (chartInitAttempts < maxChartAttempts) {
        setTimeout(forceChartInit, 200);
    } else {
        console.log('Max chart initialization attempts reached');
    }
}

// Start force initialization
setTimeout(forceChartInit, 100);
setTimeout(forceChartInit, 500);
setTimeout(forceChartInit, 1000);
