// Share List Card Component JavaScript
class ShareListCard {
    constructor() {
        this.init();
    }

    init() {
        console.log('Share List Card component initialized');
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Add any specific event listeners for the share list card
        const cardElement = document.querySelector('.share-list-card');
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
        console.log('Share List card clicked');
        // Add any card-specific click behavior here
    }

    // Method to share watchlist
    shareWatchlist() {
        console.log('Sharing watchlist...');
        // Add logic to share watchlist
        // This could generate a shareable link, open share modal, etc.
        
        // Example: Show sharing options for now
        const shareMethod = prompt('Select sharing method:\n1. Generate Link\n2. Share on Social Media\n3. Email Invite\n4. Copy to Clipboard\n\nEnter number (1-4):');
        
        if (shareMethod) {
            const methods = {
                '1': 'Generate Link',
                '2': 'Share on Social Media', 
                '3': 'Email Invite',
                '4': 'Copy to Clipboard'
            };
            
            const selectedMethod = methods[shareMethod];
            if (selectedMethod) {
                console.log(`Sharing via ${selectedMethod}...`);
                
                if (selectedMethod === 'Copy to Clipboard') {
                    // Simulate copying a shareable link
                    const shareLink = 'https://ezanafinance.com/watchlist/share/abc123';
                    navigator.clipboard.writeText(shareLink).then(() => {
                        alert('Shareable link copied to clipboard!');
                    }).catch(() => {
                        alert(`Shareable link: ${shareLink}`);
                    });
                } else {
                    alert(`Watchlist sharing via ${selectedMethod} would open here.`);
                }
            } else {
                alert('Invalid sharing method selection. Please try again.');
            }
        }
    }
}

// Initialize share list card when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ShareListCard();
});

// Global function for button click
function shareWatchlist() {
    const card = new ShareListCard();
    card.shareWatchlist();
}

// Export for use in other modules
window.ShareListCard = ShareListCard;
