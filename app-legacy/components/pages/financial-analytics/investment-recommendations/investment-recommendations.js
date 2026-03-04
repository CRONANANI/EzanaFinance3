// Investment Recommendations Card Component JavaScript
class InvestmentRecommendations {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.recommendations = [];
        this.currentRiskTolerance = 'moderate';
        this.init();
    }

    init() {
        this.loadRecommendations();
        this.setupEventListeners();
    }

    async loadRecommendations() {
        try {
            // Simulate API call based on risk tolerance
            const data = this.getRecommendationsForRisk(this.currentRiskTolerance);
            this.recommendations = data;
            this.renderRecommendations();
        } catch (error) {
            console.error('Error loading recommendations:', error);
        }
    }

    getRecommendationsForRisk(riskTolerance) {
        const recommendations = {
            conservative: [
                { symbol: 'BND', name: 'Vanguard Total Bond Market ETF', allocation: 50, return: '3-6%', risk: 'low', description: 'Income generation and stability' },
                { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', allocation: 30, return: '7-10%', risk: 'medium', description: 'Balanced growth with diversification' },
                { symbol: 'VXUS', name: 'Vanguard Total International Stock ETF', allocation: 20, return: '6-9%', risk: 'medium', description: 'International diversification' }
            ],
            moderate: [
                { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', allocation: 40, return: '7-10%', risk: 'medium', description: 'Balanced growth with diversification' },
                { symbol: 'BND', name: 'Vanguard Total Bond Market ETF', allocation: 30, return: '3-6%', risk: 'low', description: 'Income generation and stability' },
                { symbol: 'VXUS', name: 'Vanguard Total International Stock ETF', allocation: 20, return: '6-9%', risk: 'medium', description: 'International diversification' },
                { symbol: 'VNQ', name: 'Vanguard Real Estate Investment Trust ETF', allocation: 10, return: '5-8%', risk: 'medium', description: 'Real estate exposure and inflation hedge' }
            ],
            aggressive: [
                { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', allocation: 50, return: '7-10%', risk: 'medium', description: 'Balanced growth with diversification' },
                { symbol: 'VXUS', name: 'Vanguard Total International Stock ETF', allocation: 25, return: '6-9%', risk: 'medium', description: 'International diversification' },
                { symbol: 'VNQ', name: 'Vanguard Real Estate Investment Trust ETF', allocation: 15, return: '5-8%', risk: 'medium', description: 'Real estate exposure and inflation hedge' },
                { symbol: 'QQQ', name: 'Invesco QQQ Trust', allocation: 10, return: '8-12%', risk: 'high', description: 'Technology growth exposure' }
            ]
        };
        
        return recommendations[riskTolerance] || recommendations.moderate;
    }

    renderRecommendations() {
        const grid = this.container.querySelector('.recommendations-grid');
        if (!grid) return;

        // Clear existing content
        grid.innerHTML = '';

        // Render each recommendation
        this.recommendations.forEach((rec, index) => {
            const card = this.createRecommendationCard(rec, index);
            grid.appendChild(card);
        });
    }

    createRecommendationCard(recommendation, index) {
        const card = document.createElement('div');
        card.className = `recommendation-card ${recommendation.symbol.toLowerCase()}`;
        card.innerHTML = `
            <div class="recommendation-header">
                <div class="ticker-symbol">${recommendation.symbol}</div>
                <div class="allocation">
                    <div class="allocation-percentage">${recommendation.allocation}%</div>
                    <div class="allocation-label">Allocation</div>
                </div>
            </div>
            <div class="recommendation-info">
                <div class="fund-name">${recommendation.name}</div>
                <div class="expected-return">Expected Return: ${recommendation.return}</div>
            </div>
            <div class="recommendation-description">
                ${recommendation.description}
            </div>
            <div class="recommendation-tags">
                <span class="tag etf">ETF</span>
                <span class="tag ${recommendation.risk}-risk">${recommendation.risk.charAt(0).toUpperCase() + recommendation.risk.slice(1)} Risk</span>
            </div>
        `;
        
        // Add click handler
        card.addEventListener('click', () => {
            this.showRecommendationDetails(recommendation);
        });
        
        return card;
    }

    setupEventListeners() {
        const riskSelector = this.container.querySelector('#risk-tolerance');
        if (riskSelector) {
            riskSelector.addEventListener('change', (e) => {
                this.updateRiskTolerance(e.target.value);
            });
        }

        const refreshBtn = this.container.querySelector('.refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshRecommendations();
            });
        }
    }

    updateRiskTolerance(riskTolerance) {
        this.currentRiskTolerance = riskTolerance;
        this.loadRecommendations();
        this.showNotification(`Updated recommendations for ${riskTolerance} risk tolerance`, 'info');
    }

    async refreshRecommendations() {
        const refreshBtn = this.container.querySelector('.refresh-btn');
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.textContent = 'Refreshing...';
        }

        try {
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Reload recommendations
            await this.loadRecommendations();
            this.showNotification('Recommendations updated successfully!', 'success');
        } catch (error) {
            console.error('Error refreshing recommendations:', error);
            this.showNotification('Failed to refresh recommendations', 'error');
        } finally {
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.textContent = 'Refresh';
            }
        }
    }

    showRecommendationDetails(recommendation) {
        // Create modal with detailed information
        const modal = document.createElement('div');
        modal.className = 'recommendation-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${recommendation.symbol} - ${recommendation.name}</h3>
                    <button onclick="this.closest('.recommendation-modal').remove()" class="modal-close">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="detail-section">
                        <h4>Allocation Details</h4>
                        <div class="detail-item">
                            <span>Recommended Allocation</span>
                            <span>${recommendation.allocation}%</span>
                        </div>
                        <div class="detail-item">
                            <span>Expected Return</span>
                            <span>${recommendation.return}</span>
                        </div>
                        <div class="detail-item">
                            <span>Risk Level</span>
                            <span>${recommendation.risk.charAt(0).toUpperCase() + recommendation.risk.slice(1)}</span>
                        </div>
                    </div>
                    <div class="detail-section">
                        <h4>Description</h4>
                        <p>${recommendation.description}</p>
                    </div>
                    <div class="detail-section">
                        <h4>Actions</h4>
                        <div class="action-buttons">
                            <button onclick="addToWatchlist('${recommendation.symbol}')" class="btn btn-primary">
                                Add to Watchlist
                            </button>
                            <button onclick="viewFundDetails('${recommendation.symbol}')" class="btn btn-secondary">
                                View Fund Details
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal styles
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        document.body.appendChild(modal);
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            z-index: 1000;
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize investment recommendations when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const recommendationsCard = document.getElementById('investment-recommendations');
    if (recommendationsCard) {
        new InvestmentRecommendations('investment-recommendations');
    }
});

// Global functions
function updateInvestmentRecommendations() {
    const recommendations = window.investmentRecommendationsInstance;
    if (recommendations) {
        const riskSelector = document.getElementById('risk-tolerance');
        if (riskSelector) {
            recommendations.updateRiskTolerance(riskSelector.value);
        }
    }
}

function refreshRecommendations() {
    const recommendations = window.investmentRecommendationsInstance;
    if (recommendations) {
        recommendations.refreshRecommendations();
    }
}

function addToWatchlist(symbol) {
    console.log('Adding to watchlist:', symbol);
    // Implement watchlist functionality
}

function viewFundDetails(symbol) {
    console.log('Viewing fund details:', symbol);
    // Implement fund details functionality
}
