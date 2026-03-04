// Sign In Form Component JavaScript

class SignInForm {
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

    async handleSubmit(event) {
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

        try {
            // Call the API to authenticate
            const response = await window.apiService.login(data.email, data.password);
            
            // Show success message
            this.showSuccessMessage('Sign in successful! Redirecting...');
            
            // Store user data if remember me is checked
            if (data.remember) {
                localStorage.setItem('remember_user', 'true');
            }
            
            // Redirect after a short delay
            setTimeout(() => {
                window.location.href = 'home-dashboard.html';
            }, 1500);

        } catch (error) {
            console.error('Sign in error:', error);
            this.showErrorMessage(error.message || 'Sign in failed. Please try again.');
        } finally {
            // Reset button
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
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
// OAuth Configuration (same as sign-up)
const OAUTH_CONFIG = {
    google: {
        clientId: 'YOUR_GOOGLE_CLIENT_ID', // Replace with your actual Google Client ID
        redirectUri: window.location.origin + '/sign-in.html'
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
            callback: handleGoogleSignInResponse,
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

function signInWithGoogle() {
    console.log('Initiating Google sign-in');
    
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
                    callback: handleGoogleSignInResponse
                }).requestAccessToken();
            }
        });
    } catch (error) {
        console.error('Google OAuth error:', error);
        showErrorMessage('Failed to initiate Google sign-in. Please try again.');
        resetGoogleButton(googleBtn, originalText);
    }
}

function signInWithFacebook() {
    console.log('Initiating Facebook sign-in');
    
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
            handleFacebookSignInResponse(response);
        } else {
            console.log('Facebook login cancelled');
            showErrorMessage('Facebook sign-in was cancelled.');
            resetFacebookButton(facebookBtn, originalText);
        }
    }, {
        scope: 'email,public_profile',
        return_scopes: true
    });
}

// Handle Google OAuth response for sign-in
function handleGoogleSignInResponse(response) {
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

        processOAuthSignIn(userData);
    } catch (error) {
        console.error('Error processing Google response:', error);
        showErrorMessage('Failed to process Google sign-in. Please try again.');
    }
}

// Handle Facebook OAuth response for sign-in
function handleFacebookSignInResponse(response) {
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

            processOAuthSignIn(userData);
        } catch (error) {
            console.error('Error processing Facebook response:', error);
            showErrorMessage('Failed to process Facebook sign-in. Please try again.');
        }
    });
}

// Process OAuth sign-in data
function processOAuthSignIn(userData) {
    console.log('Processing OAuth sign-in:', userData);
    
    // Show success message
    showSuccessMessage(`${userData.provider.charAt(0).toUpperCase() + userData.provider.slice(1)} sign-in successful! Redirecting...`);
    
    // Here you would typically send the user data to your backend
    // For now, we'll simulate a successful sign-in
    setTimeout(() => {
        // Store user data in localStorage for demo purposes
        localStorage.setItem('userData', JSON.stringify(userData));
        localStorage.setItem('isAuthenticated', 'true');
        
        // Redirect to dashboard
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
    new SignInForm();
    
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
