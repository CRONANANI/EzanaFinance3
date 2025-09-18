// Watchlist Cards Component JavaScript
class WatchlistCards {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.init();
    }

    init() {
        this.loadWatchlistData();
        this.setupEventListeners();
    }

    async loadWatchlistData() {
        try {
            // Simulate API call
            const data = {
                watchlists: { count: 3, stocks: 24 },
                congress: { members: 12, trades: 45 },
                alerts: { total: 8, active: 2 },
                portfolio: { linked: 60, holdings: 15 }
            };
            
            this.updateWatchlistDisplay(data);
        } catch (error) {
            console.error('Error loading watchlist data:', error);
        }
    }

    updateWatchlistDisplay(data) {
        const cards = this.container.querySelectorAll('.watchlist-card');
        
        cards.forEach((card, index) => {
            const stats = card.querySelectorAll('.stat');
            
            switch (index) {
                case 0: // My Watchlists
                    if (stats.length >= 2) {
                        stats[0].textContent = `${data.watchlists.count} Lists`;
                        stats[1].textContent = `${data.watchlists.stocks} Stocks`;
                    }
                    break;
                case 1: // Follow Congress
                    if (stats.length >= 2) {
                        stats[0].textContent = `${data.congress.members} Members`;
                        stats[1].textContent = `${data.congress.trades} Trades`;
                    }
                    break;
                case 2: // Price Alerts
                    if (stats.length >= 2) {
                        stats[0].textContent = `${data.alerts.total} Alerts`;
                        stats[1].textContent = `${data.alerts.active} Active`;
                    }
                    break;
                case 3: // Portfolio Integration
                    if (stats.length >= 2) {
                        stats[0].textContent = `${data.portfolio.linked}% Linked`;
                        stats[1].textContent = `${data.portfolio.holdings} Holdings`;
                    }
                    break;
            }
        });
    }

    setupEventListeners() {
        const cards = this.container.querySelectorAll('.watchlist-card');
        
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
        console.log(`Clicked watchlist card ${index}`);
        
        // Add click animation
        card.style.transform = 'scale(0.95)';
        setTimeout(() => {
            card.style.transform = '';
        }, 150);
        
        // Navigate to relevant page or show modal
        switch (index) {
            case 0: // My Watchlists
                this.manageWatchlists();
                break;
            case 1: // Follow Congress
                this.followCongress();
                break;
            case 2: // Price Alerts
                this.setPriceAlerts();
                break;
            case 3: // Portfolio Integration
                this.linkPortfolio();
                break;
        }
    }

    handleCardHover(card, isHovering) {
        if (isHovering) {
            card.style.transform = 'translateY(-4px)';
            card.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.3)';
        } else {
            card.style.transform = '';
            card.style.boxShadow = '';
        }
    }

    manageWatchlists() {
        console.log('Managing watchlists');
        this.showModal('My Watchlists', 'Create and manage your custom stock watchlists');
    }

    followCongress() {
        console.log('Following congress members');
        this.showModal('Follow Congress', 'Track congressional trading activity');
    }

    setPriceAlerts() {
        console.log('Setting price alerts');
        this.showModal('Price Alerts', 'Set up price alerts for your watched stocks');
    }

    linkPortfolio() {
        console.log('Linking portfolio');
        this.showModal('Portfolio Integration', 'Link your watchlists to portfolio holdings');
    }

    showModal(title, content) {
        // Create a simple modal for demonstration
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p>${content}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary">OK</button>
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
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;
        
        const modalContent = modal.querySelector('.modal-content');
        modalContent.style.cssText = `
            background: #1e293b;
            border-radius: 1rem;
            padding: 2rem;
            max-width: 500px;
            width: 90%;
            border: 1px solid rgba(255, 255, 255, 0.1);
        `;
        
        document.body.appendChild(modal);
        
        // Close modal functionality
        const closeBtn = modal.querySelector('.modal-close');
        const okBtn = modal.querySelector('.btn-primary');
        
        const closeModal = () => {
            document.body.removeChild(modal);
        };
        
        closeBtn.addEventListener('click', closeModal);
        okBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }
}

// Initialize watchlist cards when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const watchlistCards = document.getElementById('watchlist-cards');
    if (watchlistCards) {
        new WatchlistCards('watchlist-cards');
    }
});
