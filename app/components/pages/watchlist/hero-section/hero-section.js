// Watchlist Hero Section Component JavaScript
class WatchlistHeroSection {
    constructor() {
        this.init();
    }

    init() {
        console.log('Watchlist Hero Section component initialized');
        this.setupAnimations();
    }

    setupAnimations() {
        // Add any hero section specific animations or interactions here
        const heroElement = document.querySelector('.watchlist-hero');
        if (heroElement) {
            // Add intersection observer for scroll animations if needed
            this.observeScrollAnimations(heroElement);
        }
    }

    observeScrollAnimations(element) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, { threshold: 0.1 });

        observer.observe(element);
    }

    // Method to update hero content dynamically if needed
    updateContent(title, subtitle) {
        const titleElement = document.querySelector('.watchlist-title');
        const subtitleElement = document.querySelector('.watchlist-subtitle');
        
        if (titleElement) titleElement.textContent = title;
        if (subtitleElement) subtitleElement.textContent = subtitle;
    }
}

// Initialize watchlist hero section when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WatchlistHeroSection();
});

// Export for use in other modules
window.WatchlistHeroSection = WatchlistHeroSection;
