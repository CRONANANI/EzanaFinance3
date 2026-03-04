// Export Data Card Component JavaScript
class ExportDataCard {
    constructor() {
        this.init();
    }

    init() {
        console.log('Export Data Card component initialized');
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Add any specific event listeners for the export data card
        const cardElement = document.querySelector('.export-data-card');
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
        console.log('Export Data card clicked');
        // Add any card-specific click behavior here
    }

    // Method to export watchlist data
    exportWatchlistData() {
        console.log('Exporting watchlist data...');
        // Add logic to export watchlist data
        // This could trigger a download, show format options, etc.
        
        // Example: Show format selection for now
        const format = prompt('Select export format:\n1. CSV\n2. Excel\n3. PDF\n\nEnter number (1-3):');
        
        if (format) {
            const formats = {
                '1': 'CSV',
                '2': 'Excel', 
                '3': 'PDF'
            };
            
            const selectedFormat = formats[format];
            if (selectedFormat) {
                console.log(`Exporting data in ${selectedFormat} format...`);
                alert(`Your watchlist data is being exported in ${selectedFormat} format. Download will start shortly.`);
            } else {
                alert('Invalid format selection. Please try again.');
            }
        }
    }
}

// Initialize export data card when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ExportDataCard();
});

// Global function for button click
function exportWatchlistData() {
    const card = new ExportDataCard();
    card.exportWatchlistData();
}

// Export for use in other modules
window.ExportDataCard = ExportDataCard;
