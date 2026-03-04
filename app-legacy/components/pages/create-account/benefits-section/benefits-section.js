// Benefits Section Component JavaScript

class BenefitsSection {
    constructor() {
        this.init();
    }

    init() {
        this.setupAnimations();
    }

    setupAnimations() {
        // Add intersection observer for scroll animations
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            });

            // Observe all benefit items
            document.querySelectorAll('.benefit-item').forEach(item => {
                item.style.opacity = '0';
                item.style.transform = 'translateY(20px)';
                item.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                observer.observe(item);
            });
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new BenefitsSection();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BenefitsSection;
}
