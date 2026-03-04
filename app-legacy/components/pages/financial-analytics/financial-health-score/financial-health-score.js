// Financial Health Score Card Component JavaScript
class FinancialHealthScore {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.init();
    }

    init() {
        this.loadHealthData();
        this.setupEventListeners();
        this.animateScoreCircle();
    }

    async loadHealthData() {
        try {
            // Simulate API call
            const data = {
                overallScore: 8.7,
                level: 'Excellent',
                components: {
                    savingsRate: { value: 23.5, score: 94 },
                    emergencyFund: { value: 5.2, score: 87 },
                    totalBalance: { value: 58830, score: 85 }
                }
            };
            
            this.updateHealthDisplay(data);
        } catch (error) {
            console.error('Error loading health data:', error);
        }
    }

    updateHealthDisplay(data) {
        // Update overall score
        const scoreValue = this.container.querySelector('#health-score-value');
        const healthLevel = this.container.querySelector('#health-level');
        
        if (scoreValue) {
            scoreValue.textContent = data.overallScore;
        }
        
        if (healthLevel) {
            healthLevel.textContent = data.level;
        }

        // Update component scores
        const savingsRate = this.container.querySelector('#savings-rate');
        const savingsScore = this.container.querySelector('#savings-score');
        
        if (savingsRate) {
            savingsRate.textContent = `${data.components.savingsRate.value}%`;
        }
        if (savingsScore) {
            savingsScore.textContent = `${data.components.savingsRate.score}/100`;
        }

        const emergencyFund = this.container.querySelector('#emergency-fund');
        const emergencyScore = this.container.querySelector('#emergency-score');
        
        if (emergencyFund) {
            emergencyFund.textContent = `${data.components.emergencyFund.value} months`;
        }
        if (emergencyScore) {
            emergencyScore.textContent = `${data.components.emergencyFund.score}/100`;
        }

        const totalBalance = this.container.querySelector('#total-balance');
        const balanceScore = this.container.querySelector('#balance-score');
        
        if (totalBalance) {
            totalBalance.textContent = `$${data.components.totalBalance.value.toLocaleString()}`;
        }
        if (balanceScore) {
            balanceScore.textContent = `${data.components.totalBalance.score}/100`;
        }
    }

    animateScoreCircle() {
        const circle = this.container.querySelector('#health-score-circle');
        if (!circle) return;

        const score = 8.7; // Current score
        const maxScore = 10;
        const circumference = 2 * Math.PI * 54; // radius = 54
        const offset = circumference - (score / maxScore) * circumference;

        // Set initial state
        circle.style.strokeDasharray = circumference;
        circle.style.strokeDashoffset = circumference;

        // Animate to final state
        setTimeout(() => {
            circle.style.transition = 'stroke-dashoffset 1s ease-in-out';
            circle.style.strokeDashoffset = offset;
        }, 500);
    }

    setupEventListeners() {
        const refreshBtn = this.container.querySelector('.refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshHealth();
            });
        }
    }

    async refreshHealth() {
        const refreshBtn = this.container.querySelector('.refresh-btn');
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise mr-2 animate-spin"></i>Refreshing...';
        }

        try {
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Reload data
            await this.loadHealthData();
            this.animateScoreCircle();
            
            // Show success message
            this.showNotification('Health score updated successfully!', 'success');
        } catch (error) {
            console.error('Error refreshing health data:', error);
            this.showNotification('Failed to refresh health score', 'error');
        } finally {
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise mr-2"></i>Refresh';
            }
        }
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

    updateScore(newScore) {
        const scoreValue = this.container.querySelector('#health-score-value');
        if (scoreValue) {
            scoreValue.textContent = newScore;
        }
        
        // Update circle animation
        this.animateScoreCircle();
        
        // Update level based on score
        const healthLevel = this.container.querySelector('#health-level');
        if (healthLevel) {
            let level = 'Poor';
            if (newScore >= 8) level = 'Excellent';
            else if (newScore >= 6) level = 'Good';
            else if (newScore >= 4) level = 'Fair';
            
            healthLevel.textContent = level;
        }
    }
}

// Initialize financial health score when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const healthScoreCard = document.getElementById('financial-health-score');
    if (healthScoreCard) {
        new FinancialHealthScore('financial-health-score');
    }
});

// Global function for refresh button
function refreshFinancialHealth() {
    const healthScore = window.financialHealthScoreInstance;
    if (healthScore) {
        healthScore.refreshHealth();
    }
}
