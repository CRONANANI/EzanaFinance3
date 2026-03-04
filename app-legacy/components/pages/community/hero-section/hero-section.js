// Community Hero Section Component JavaScript
class CommunityHeroSection {
    constructor() {
        this.init();
    }

    init() {
        console.log('Community Hero Section component initialized');
        this.setupAnimations();
    }

    setupAnimations() {
        // Add any hero section specific animations or interactions here
        const heroElement = document.querySelector('.community-hero');
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
        const titleElement = document.querySelector('.community-title');
        const subtitleElement = document.querySelector('.community-subtitle');
        
        if (titleElement) titleElement.textContent = title;
        if (subtitleElement) subtitleElement.textContent = subtitle;
    }
}

// Initialize community hero section when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CommunityHeroSection();
});

// Export for use in other modules
window.CommunityHeroSection = CommunityHeroSection;
