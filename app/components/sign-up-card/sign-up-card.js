// Sign Up Card Component JavaScript

class SignUpCard {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupFormValidation();
    }

    setupEventListeners() {
        const form = document.getElementById('signUpForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // Real-time validation
        const inputs = ['fullName', 'email', 'password', 'confirmPassword'];
        inputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('blur', () => this.validateField(inputId));
                input.addEventListener('input', () => this.clearError(inputId));
            }
        });

        // Terms checkbox validation
        const termsCheckbox = document.querySelector('input[name="terms"]');
        if (termsCheckbox) {
            termsCheckbox.addEventListener('change', () => this.validateTerms());
        }
    }

    setupFormValidation() {
        // Initialize validation state
        this.validationState = {
            fullName: { isValid: false, message: '' },
            email: { isValid: false, message: '' },
            password: { isValid: false, message: '' },
            confirmPassword: { isValid: false, message: '' },
            terms: { isValid: false, message: '' }
        };
    }

    validateField(fieldName) {
        switch (fieldName) {
            case 'fullName':
                return this.validateFullName();
            case 'email':
                return this.validateEmail();
            case 'password':
                return this.validatePassword();
            case 'confirmPassword':
                return this.validateConfirmPassword();
            default:
                return false;
        }
    }

    validateFullName() {
        const fullNameInput = document.getElementById('fullName');
        const fullName = fullNameInput.value.trim();

        if (!fullName) {
            this.setError('fullName', 'Full name is required.');
            return false;
        } else if (fullName.length < 2) {
            this.setError('fullName', 'Full name must be at least 2 characters long.');
            return false;
        } else {
            this.clearError('fullName');
            this.validationState.fullName = { isValid: true, message: '' };
            return true;
        }
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
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
            this.setError('password', 'Password must contain at least one uppercase letter, one lowercase letter, and one number.');
            return false;
        } else {
            this.clearError('password');
            this.validationState.password = { isValid: true, message: '' };
            // Re-validate confirm password if it has been filled
            if (document.getElementById('confirmPassword').value) {
                this.validateConfirmPassword();
            }
            return true;
        }
    }

    validateConfirmPassword() {
        const passwordInput = document.getElementById('password');
        const confirmPasswordInput = document.getElementById('confirmPassword');
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (!confirmPassword) {
            this.setError('confirmPassword', 'Please confirm your password.');
            return false;
        } else if (password !== confirmPassword) {
            this.setError('confirmPassword', 'Passwords do not match.');
            return false;
        } else {
            this.clearError('confirmPassword');
            this.validationState.confirmPassword = { isValid: true, message: '' };
            return true;
        }
    }

    validateTerms() {
        const termsCheckbox = document.querySelector('input[name="terms"]');
        
        if (!termsCheckbox.checked) {
            this.setError('terms', 'You must agree to the Terms and Conditions.');
            return false;
        } else {
            this.clearError('terms');
            this.validationState.terms = { isValid: true, message: '' };
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
        const fullNameValid = this.validateFullName();
        const emailValid = this.validateEmail();
        const passwordValid = this.validatePassword();
        const confirmPasswordValid = this.validateConfirmPassword();
        const termsValid = this.validateTerms();
        
        return fullNameValid && emailValid && passwordValid && confirmPasswordValid && termsValid;
    }

    handleSubmit(event) {
        event.preventDefault();
        
        if (!this.validateForm()) {
            return;
        }

        const formData = new FormData(event.target);
        const data = {
            fullName: formData.get('fullName'),
            email: formData.get('email'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword'),
            terms: formData.get('terms') === 'on',
            newsletter: formData.get('newsletter') === 'on'
        };

        console.log('Sign up data:', data);
        
        // Show loading state
        const submitBtn = event.target.querySelector('.submit-btn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creating account...';
        submitBtn.disabled = true;

        // Simulate API call
        setTimeout(() => {
            // Reset button
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            
            // Here you would typically make an API call to your backend
            // For now, we'll just show a success message
            this.showSuccessMessage('Account created successfully! Redirecting to sign in...');
            
            // Redirect to sign in page after successful registration
            setTimeout(() => {
                window.location.href = 'sign-in.html';
            }, 2000);
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

// Social sign up functions
function signUpWithGoogle() {
    console.log('Sign up with Google');
    // Here you would integrate with Google OAuth
    alert('Google sign-up would be implemented here');
}

function signUpWithFacebook() {
    console.log('Sign up with Facebook');
    // Here you would integrate with Facebook OAuth
    alert('Facebook sign-up would be implemented here');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new SignUpCard();
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
