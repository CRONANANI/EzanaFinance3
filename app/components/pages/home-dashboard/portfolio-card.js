// Portfolio Card Component JavaScript
class PortfolioCard {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.chart = null;
        this.init();
    }

    init() {
        this.loadPortfolioData();
        this.initializeChart();
        this.setupEventListeners();
    }

    async loadPortfolioData() {
        try {
            // Simulate API call
            const data = {
                totalValue: 127843.52,
                change: 2847.31,
                changePercent: 2.28,
                lastUpdated: new Date()
            };
            
            this.updatePortfolioDisplay(data);
        } catch (error) {
            console.error('Error loading portfolio data:', error);
        }
    }

    updatePortfolioDisplay(data) {
        const valueElement = this.container.querySelector('.portfolio-value');
        const changeElement = this.container.querySelector('.change-positive');
        const updatedElement = this.container.querySelector('.updated-time');

        if (valueElement) {
            valueElement.textContent = `$${data.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        }

        if (changeElement) {
            const changeClass = data.change >= 0 ? 'change-positive' : 'change-negative';
            changeElement.className = changeClass;
            changeElement.innerHTML = `
                <i class="bi bi-arrow-${data.change >= 0 ? 'up' : 'down'}"></i>
                $${Math.abs(data.change).toLocaleString('en-US', { minimumFractionDigits: 2 })} 
                (${data.change >= 0 ? '+' : ''}${data.changePercent.toFixed(2)}%)
            `;
        }

        if (updatedElement) {
            const now = new Date();
            const diffMinutes = Math.floor((now - data.lastUpdated) / (1000 * 60));
            updatedElement.textContent = `Updated ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
        }
    }

    initializeChart() {
        const chartContainer = this.container.querySelector('.chart-placeholder');
        if (!chartContainer) return;

        // Create a simple chart placeholder
        chartContainer.innerHTML = `
            <div class="chart-content">
                <canvas id="portfolioChart" width="400" height="200"></canvas>
            </div>
        `;

        // Initialize Chart.js if available
        if (typeof Chart !== 'undefined') {
            this.createChart();
        }
    }

    createChart() {
        const ctx = document.getElementById('portfolioChart');
        if (!ctx) return;

        const data = this.generateMockData();
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Portfolio Value',
                    data: data.values,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#94a3b8'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#94a3b8'
                        }
                    }
                }
            }
        });
    }

    generateMockData() {
        const labels = [];
        const values = [];
        const baseValue = 120000;
        
        for (let i = 30; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            
            const variation = (Math.random() - 0.5) * 2000;
            const value = baseValue + variation + (i * 100);
            values.push(value);
        }
        
        return { labels, values };
    }

    setupEventListeners() {
        const timeSelector = this.container.querySelector('.time-selector select');
        if (timeSelector) {
            timeSelector.addEventListener('change', (e) => {
                this.updateTimeRange(e.target.value);
            });
        }
    }

    updateTimeRange(timeRange) {
        console.log('Updating time range:', timeRange);
        // Update chart data based on selected time range
        if (this.chart) {
            const data = this.generateMockDataForRange(timeRange);
            this.chart.data.labels = data.labels;
            this.chart.data.datasets[0].data = data.values;
            this.chart.update();
        }
    }

    generateMockDataForRange(timeRange) {
        const labels = [];
        const values = [];
        const baseValue = 120000;
        let days = 30;
        
        switch (timeRange) {
            case '1': days = 30; break;
            case '3': days = 90; break;
            case '6': days = 180; break;
            case '12': days = 365; break;
            case '36': days = 1095; break;
            case '60': days = 1825; break;
            case '120': days = 3650; break;
            case 'all': days = 3650; break;
        }
        
        const step = Math.max(1, Math.floor(days / 30));
        
        for (let i = days; i >= 0; i -= step) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            
            const variation = (Math.random() - 0.5) * 2000;
            const value = baseValue + variation + (i * 10);
            values.push(value);
        }
        
        return { labels, values };
    }
}

// Initialize portfolio card when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const portfolioCard = document.getElementById('portfolio-card');
    if (portfolioCard) {
        new PortfolioCard('portfolio-card');
    }
});
