// Sign In Page JavaScript

class SignInPage {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupFormValidation();
    }

    setupEventListeners() {
        const form = document.getElementById('signInForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // Real-time validation
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');

        if (emailInput) {
            emailInput.addEventListener('blur', () => this.validateEmail());
            emailInput.addEventListener('input', () => this.clearError('email'));
        }

        if (passwordInput) {
            passwordInput.addEventListener('blur', () => this.validatePassword());
            passwordInput.addEventListener('input', () => this.clearError('password'));
        }
    }

    setupFormValidation() {
        // Initialize validation state
        this.validationState = {
            email: { isValid: false, message: '' },
            password: { isValid: false, message: '' }
        };
    }

    validateEmail() {
        const emailInput = document.getElementById('email');
        const email = emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email) {
            this.setError('email', 'Email is required.');
            return false;
        } else if (!emailRegex.test(email)) {
            this.setError('email', 'Please enter a valid email address.');
            return false;
        } else {
            this.clearError('email');
            this.validationState.email = { isValid: true, message: '' };
            return true;
        }
    }

    validatePassword() {
        const passwordInput = document.getElementById('password');
        const password = passwordInput.value;

        if (!password) {
            this.setError('password', 'Password is required.');
            return false;
        } else if (password.length < 6) {
            this.setError('password', 'Password must be at least 6 characters long.');
            return false;
        } else {
            this.clearError('password');
            this.validationState.password = { isValid: true, message: '' };
            return true;
        }
    }

    setError(field, message) {
        const input = document.getElementById(field);
        const errorElement = document.getElementById(field + 'Error');
        
        if (input) {
            input.classList.add('error');
        }
        
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
        
        this.validationState[field] = { isValid: false, message };
    }

    clearError(field) {
        const input = document.getElementById(field);
        const errorElement = document.getElementById(field + 'Error');
        
        if (input) {
            input.classList.remove('error');
        }
        
        if (errorElement) {
            errorElement.classList.remove('show');
        }
    }

    validateForm() {
        const emailValid = this.validateEmail();
        const passwordValid = this.validatePassword();
        
        return emailValid && passwordValid;
    }

    handleSubmit(event) {
        event.preventDefault();
        
        if (!this.validateForm()) {
            return;
        }

        const formData = new FormData(event.target);
        const data = {
            email: formData.get('email'),
            password: formData.get('password'),
            remember: formData.get('remember') === 'on'
        };

        console.log('Sign in data:', data);
        
        // Show loading state
        const submitBtn = event.target.querySelector('.submit-btn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Signing in...';
        submitBtn.disabled = true;

        // Simulate API call
        setTimeout(() => {
            // Reset button
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            
            // Here you would typically make an API call to your backend
            // For now, we'll just show a success message
            this.showSuccessMessage('Sign in successful! Redirecting...');
            
            // Redirect to dashboard after successful sign in
            setTimeout(() => {
                window.location.href = 'home-dashboard.html';
            }, 1500);
        }, 2000);
    }

    showSuccessMessage(message) {
        // Create success message element
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 1rem 2rem;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(successDiv);

        // Remove after 3 seconds
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }
}

// Social login functions
function signInWithGoogle() {
    console.log('Sign in with Google');
    // Here you would integrate with Google OAuth
    alert('Google sign-in would be implemented here');
}

function signInWithFacebook() {
    console.log('Sign in with Facebook');
    // Here you would integrate with Facebook OAuth
    alert('Facebook sign-in would be implemented here');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new SignInPage();
});

// Add CSS animation for success message
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);
