// Hero Section Component JavaScript
class HeroSection {
    constructor() {
        this.init();
    }

    init() {
        console.log('Hero Section component initialized');
        this.setupAnimations();
    }

    setupAnimations() {
        // Add any hero section specific animations or interactions here
        const heroElement = document.querySelector('.dashboard-hero');
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
        const titleElement = document.querySelector('.dashboard-title');
        const subtitleElement = document.querySelector('.dashboard-subtitle');
        
        if (titleElement) titleElement.textContent = title;
        if (subtitleElement) subtitleElement.textContent = subtitle;
    }
}

// Initialize hero section when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new HeroSection();
});

// Export for use in other modules
window.HeroSection = HeroSection;
