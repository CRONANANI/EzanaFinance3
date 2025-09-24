// Registration Page Component JavaScript

class RegistrationPage {
    constructor() {
        this.init();
    }

    async init() {
        await this.loadComponents();
        this.setupEventListeners();
    }

    async loadComponents() {
        try {
            // Load registration form
            const formResponse = await fetch('../components/pages/create-account/registration-form/registration-form.html');
            const formHTML = await formResponse.text();
            document.getElementById('registration-form-container').innerHTML = formHTML;

            // Load benefits section
            const benefitsResponse = await fetch('../components/pages/create-account/benefits-section/benefits-section.html');
            const benefitsHTML = await benefitsResponse.text();
            document.getElementById('benefits-section-container').innerHTML = benefitsHTML;

            // Load CSS files
            this.loadCSS('../components/pages/create-account/registration-form/registration-form.css');
            this.loadCSS('../components/pages/create-account/benefits-section/benefits-section.css');

            // Load JavaScript files
            this.loadJS('../components/pages/create-account/registration-form/registration-form.js');
            this.loadJS('../components/pages/create-account/benefits-section/benefits-section.js');

        } catch (error) {
            console.error('Error loading components:', error);
        }
    }

    loadCSS(href) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
    }

    loadJS(src) {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        document.head.appendChild(script);
    }

    setupEventListeners() {
        // Add any page-level event listeners here
        console.log('Registration page initialized');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new RegistrationPage();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RegistrationPage;
}
