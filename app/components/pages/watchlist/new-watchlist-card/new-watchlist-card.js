// New Watchlist Card Component JavaScript
class NewWatchlistCard {
    constructor() {
        this.init();
    }

    init() {
        console.log('New Watchlist Card component initialized');
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Add any specific event listeners for the new watchlist card
        const cardElement = document.querySelector('.new-watchlist-card');
        if (cardElement) {
            cardElement.addEventListener('click', (e) => {
                // Don't trigger if clicking the button directly
                if (!e.target.closest('.card-action-btn')) {
                    this.handleCardClick();
                }
            });
        }
    }

    handleCardClick() {
        console.log('New Watchlist card clicked');
        // Add any card-specific click behavior here
    }

    // Method to create a new watchlist
    createNewWatchlist() {
        console.log('Creating new watchlist...');
        // Add logic to open watchlist creation modal or form
        // This could trigger a modal, redirect to a form, etc.
        
        // Example: Show a simple prompt for now
        const watchlistName = prompt('Enter name for new watchlist:');
        if (watchlistName && watchlistName.trim()) {
            console.log(`Creating watchlist: ${watchlistName}`);
            // Here you would typically make an API call to create the watchlist
            // For now, just show a success message
            alert(`Watchlist "${watchlistName}" created successfully!`);
        }
    }
}

// Initialize new watchlist card when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new NewWatchlistCard();
});

// Global function for button click
function createNewWatchlist() {
    const card = new NewWatchlistCard();
    card.createNewWatchlist();
}

// Export for use in other modules
window.NewWatchlistCard = NewWatchlistCard;
