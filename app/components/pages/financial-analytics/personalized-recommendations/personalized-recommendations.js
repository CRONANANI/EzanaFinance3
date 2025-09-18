// Personalized Recommendations Card Component JavaScript
class PersonalizedRecommendations {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.recommendations = [];
        this.init();
    }

    init() {
        this.loadRecommendations();
        this.setupEventListeners();
    }

    async loadRecommendations() {
        try {
            // Simulate API call
            const data = [
                {
                    type: 'success',
                    title: 'Excellent Savings Rate',
                    description: 'Your 25.4% savings rate is well above the recommended 20%. Keep up the great work!',
                    icon: 'bi-check-circle',
                    priority: 'high'
                },
                {
                    type: 'info',
                    title: 'Consider Tax-Advantaged Accounts',
                    description: 'With your strong savings rate, consider maximizing contributions to 401(k) and IRA accounts for tax benefits.',
                    icon: 'bi-info-circle',
                    priority: 'medium'
                },
                {
                    type: 'warning',
                    title: 'Optimize Investment Allocation',
                    description: 'Consider rebalancing your portfolio quarterly to maintain your target asset allocation.',
                    icon: 'bi-lightbulb',
                    priority: 'medium'
                },
                {
                    type: 'tip',
                    title: 'Emergency Fund Optimization',
                    description: 'Your emergency fund covers 5.2 months of expenses. Consider moving excess funds to higher-yield investments.',
                    icon: 'bi-graph-up-arrow',
                    priority: 'low'
                }
            ];
            
            this.recommendations = data;
            this.renderRecommendations();
        } catch (error) {
            console.error('Error loading recommendations:', error);
        }
    }

    renderRecommendations() {
        const recommendationsList = this.container.querySelector('.recommendations-list');
        if (!recommendationsList) return;

        // Clear existing content
        recommendationsList.innerHTML = '';

        // Sort recommendations by priority
        const sortedRecommendations = this.recommendations.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });

        // Render each recommendation
        sortedRecommendations.forEach((rec, index) => {
            const recommendationItem = this.createRecommendationItem(rec, index);
            recommendationsList.appendChild(recommendationItem);
        });
    }

    createRecommendationItem(recommendation, index) {
        const item = document.createElement('div');
        item.className = `recommendation-item ${recommendation.type}`;
        item.innerHTML = `
            <div class="recommendation-icon">
                <i class="bi ${recommendation.icon}"></i>
            </div>
            <div class="recommendation-content">
                <h4 class="recommendation-title">${recommendation.title}</h4>
                <p class="recommendation-description">${recommendation.description}</p>
            </div>
        `;
        
        // Add click handler for more details
        item.addEventListener('click', () => {
            this.showRecommendationDetails(recommendation);
        });
        
        // Add animation delay
        item.style.animationDelay = `${index * 0.1}s`;
        
        return item;
    }

    setupEventListeners() {
        // Add any additional event listeners here
    }

    showRecommendationDetails(recommendation) {
        // Create modal with detailed information
        const modal = document.createElement('div');
        modal.className = 'recommendation-details-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <div class="modal-title-section">
                        <div class="modal-icon ${recommendation.type}">
                            <i class="bi ${recommendation.icon}"></i>
                        </div>
                        <h3>${recommendation.title}</h3>
                    </div>
                    <button onclick="this.closest('.recommendation-details-modal').remove()" class="modal-close">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="recommendation-details">
                        <p class="recommendation-description">${recommendation.description}</p>
                        
                        <div class="recommendation-actions">
                            <h4>Recommended Actions</h4>
                            <ul class="action-list">
                                ${this.getActionSteps(recommendation).map(action => `<li>${action}</li>`).join('')}
                            </ul>
                        </div>
                        
                        <div class="recommendation-priority">
                            <span class="priority-label">Priority:</span>
                            <span class="priority-badge ${recommendation.priority}">${recommendation.priority.charAt(0).toUpperCase() + recommendation.priority.slice(1)}</span>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button onclick="markRecommendationAsRead('${recommendation.title}')" class="btn btn-primary">
                        Mark as Read
                    </button>
                    <button onclick="this.closest('.recommendation-details-modal').remove()" class="btn btn-secondary">
                        Close
                    </button>
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

    getActionSteps(recommendation) {
        const actionSteps = {
            'Excellent Savings Rate': [
                'Continue maintaining your current savings rate',
                'Consider increasing savings if income grows',
                'Set up automatic transfers to savings account'
            ],
            'Consider Tax-Advantaged Accounts': [
                'Review your 401(k) contribution limits',
                'Open an IRA if you don\'t have one',
                'Consider Roth vs Traditional IRA based on your tax situation',
                'Set up automatic contributions'
            ],
            'Optimize Investment Allocation': [
                'Review your current portfolio allocation',
                'Set up quarterly rebalancing reminders',
                'Consider target-date funds for simplicity',
                'Monitor performance against benchmarks'
            ],
            'Emergency Fund Optimization': [
                'Calculate your ideal emergency fund size (3-6 months expenses)',
                'Move excess emergency funds to high-yield savings',
                'Consider money market accounts or short-term CDs',
                'Keep emergency fund easily accessible'
            ]
        };
        
        return actionSteps[recommendation.title] || ['Review this recommendation and take appropriate action'];
    }

    addRecommendation(recommendation) {
        this.recommendations.push(recommendation);
        this.renderRecommendations();
    }

    removeRecommendation(title) {
        this.recommendations = this.recommendations.filter(rec => rec.title !== title);
        this.renderRecommendations();
    }

    markAsRead(title) {
        const recommendation = this.recommendations.find(rec => rec.title === title);
        if (recommendation) {
            recommendation.read = true;
            this.renderRecommendations();
            this.showNotification('Recommendation marked as read', 'success');
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
}

// Initialize personalized recommendations when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const recommendationsCard = document.getElementById('personalized-recommendations');
    if (recommendationsCard) {
        new PersonalizedRecommendations('personalized-recommendations');
    }
});

// Global functions
function markRecommendationAsRead(title) {
    const recommendations = window.personalizedRecommendationsInstance;
    if (recommendations) {
        recommendations.markAsRead(title);
    }
}
