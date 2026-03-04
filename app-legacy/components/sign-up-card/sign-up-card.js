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

// OAuth Configuration
const OAUTH_CONFIG = {
    google: {
        clientId: 'YOUR_GOOGLE_CLIENT_ID', // Replace with your actual Google Client ID
        redirectUri: window.location.origin + '/sign-up.html'
    },
    facebook: {
        appId: 'YOUR_FACEBOOK_APP_ID' // Replace with your actual Facebook App ID
    }
};

// Initialize OAuth providers
function initializeOAuth() {
    // Initialize Google OAuth
    if (typeof google !== 'undefined') {
        google.accounts.id.initialize({
            client_id: OAUTH_CONFIG.google.clientId,
            callback: handleGoogleResponse,
            auto_select: false,
            cancel_on_tap_outside: true
        });
    }

    // Initialize Facebook OAuth
    if (typeof FB !== 'undefined') {
        FB.init({
            appId: OAUTH_CONFIG.facebook.appId,
            cookie: true,
            xfbml: true,
            version: 'v18.0'
        });
    }
}

// Social sign up functions
function signUpWithGoogle() {
    console.log('Initiating Google sign-up');
    
    if (typeof google === 'undefined') {
        showErrorMessage('Google OAuth not loaded. Please refresh the page and try again.');
        return;
    }

    // Show loading state
    const googleBtn = document.querySelector('.google-btn');
    const originalText = googleBtn.innerHTML;
    googleBtn.innerHTML = '<i class="bi bi-google"></i> Connecting...';
    googleBtn.disabled = true;

    try {
        // Use Google One Tap or Popup flow
        google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                // Fallback to popup flow
                google.accounts.oauth2.initTokenClient({
                    client_id: OAUTH_CONFIG.google.clientId,
                    scope: 'email profile',
                    callback: handleGoogleResponse
                }).requestAccessToken();
            }
        });
    } catch (error) {
        console.error('Google OAuth error:', error);
        showErrorMessage('Failed to initiate Google sign-up. Please try again.');
        resetGoogleButton(googleBtn, originalText);
    }
}

function signUpWithFacebook() {
    console.log('Initiating Facebook sign-up');
    
    if (typeof FB === 'undefined') {
        showErrorMessage('Facebook OAuth not loaded. Please refresh the page and try again.');
        return;
    }

    // Show loading state
    const facebookBtn = document.querySelector('.facebook-btn');
    const originalText = facebookBtn.innerHTML;
    facebookBtn.innerHTML = '<i class="bi bi-facebook"></i> Connecting...';
    facebookBtn.disabled = true;

    FB.login((response) => {
        if (response.authResponse) {
            handleFacebookResponse(response);
        } else {
            console.log('Facebook login cancelled');
            showErrorMessage('Facebook sign-up was cancelled.');
            resetFacebookButton(facebookBtn, originalText);
        }
    }, {
        scope: 'email,public_profile',
        return_scopes: true
    });
}

// Handle Google OAuth response
function handleGoogleResponse(response) {
    console.log('Google OAuth response:', response);
    
    try {
        // Decode the JWT token to get user info
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        const userData = {
            provider: 'google',
            id: payload.sub,
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
            verified: payload.email_verified
        };

        processOAuthSignUp(userData);
    } catch (error) {
        console.error('Error processing Google response:', error);
        showErrorMessage('Failed to process Google sign-up. Please try again.');
    }
}

// Handle Facebook OAuth response
function handleFacebookResponse(response) {
    console.log('Facebook OAuth response:', response);
    
    FB.api('/me', { fields: 'id,name,email,picture' }, (userInfo) => {
        try {
            const userData = {
                provider: 'facebook',
                id: userInfo.id,
                email: userInfo.email,
                name: userInfo.name,
                picture: userInfo.picture?.data?.url,
                verified: true // Facebook emails are typically verified
            };

            processOAuthSignUp(userData);
        } catch (error) {
            console.error('Error processing Facebook response:', error);
            showErrorMessage('Failed to process Facebook sign-up. Please try again.');
        }
    });
}

// Process OAuth sign-up data
function processOAuthSignUp(userData) {
    console.log('Processing OAuth sign-up:', userData);
    
    // Show success message
    showSuccessMessage(`${userData.provider.charAt(0).toUpperCase() + userData.provider.slice(1)} sign-up successful! Redirecting...`);
    
    // Here you would typically send the user data to your backend
    // For now, we'll simulate a successful sign-up
    setTimeout(() => {
        // Store user data in localStorage for demo purposes
        localStorage.setItem('userData', JSON.stringify(userData));
        localStorage.setItem('isAuthenticated', 'true');
        
        // Redirect to dashboard or sign-in page
        window.location.href = 'home-dashboard.html';
    }, 2000);
}

// Utility functions
function resetGoogleButton(button, originalText) {
    button.innerHTML = originalText;
    button.disabled = false;
}

function resetFacebookButton(button, originalText) {
    button.innerHTML = originalText;
    button.disabled = false;
}

function showErrorMessage(message) {
    // Create error message element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message-popup';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #ef4444, #dc2626);
        color: white;
        padding: 1rem 2rem;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(239, 68, 68, 0.3);
        z-index: 1000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
    `;

    document.body.appendChild(errorDiv);

    // Remove after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new SignUpCard();
    
    // Initialize OAuth after a short delay to ensure SDKs are loaded
    setTimeout(() => {
        initializeOAuth();
    }, 1000);
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
