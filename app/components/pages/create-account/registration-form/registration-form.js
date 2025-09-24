// Registration Form Component JavaScript

class RegistrationForm {
    constructor() {
        this.form = null;
        this.init();
    }

    init() {
        this.form = document.getElementById('registrationForm');
        if (this.form) {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Real-time validation
        this.setupRealTimeValidation();

        // Password strength validation
        this.setupPasswordValidation();
    }

    handleSubmit(e) {
        e.preventDefault();
        
        // Clear previous errors
        this.clearErrors();
        
        // Validate form
        if (this.validateForm()) {
            this.submitForm();
        }
    }

    validateForm() {
        let isValid = true;
        
        // Validate first name
        const firstName = document.getElementById('firstName');
        if (!firstName.value.trim()) {
            this.showError('firstNameError', 'First name is required');
            isValid = false;
        }
        
        // Validate last name
        const lastName = document.getElementById('lastName');
        if (!lastName.value.trim()) {
            this.showError('lastNameError', 'Last name is required');
            isValid = false;
        }
        
        // Validate email
        const email = document.getElementById('email');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.value.trim()) {
            this.showError('emailError', 'Email is required');
            isValid = false;
        } else if (!emailRegex.test(email.value)) {
            this.showError('emailError', 'Please enter a valid email address');
            isValid = false;
        }
        
        // Validate phone
        const phone = document.getElementById('phone');
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phone.value.trim()) {
            this.showError('phoneError', 'Phone number is required');
            isValid = false;
        } else if (!phoneRegex.test(phone.value.replace(/\s/g, ''))) {
            this.showError('phoneError', 'Please enter a valid phone number');
            isValid = false;
        }
        
        // Validate date of birth
        const dateOfBirth = document.getElementById('dateOfBirth');
        if (!dateOfBirth.value) {
            this.showError('dateOfBirthError', 'Date of birth is required');
            isValid = false;
        } else {
            const birthDate = new Date(dateOfBirth.value);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();
            if (age < 18) {
                this.showError('dateOfBirthError', 'You must be at least 18 years old');
                isValid = false;
            }
        }
        
        // Validate account type
        const accountType = document.getElementById('accountType');
        if (!accountType.value) {
            this.showError('accountTypeError', 'Please select an account type');
            isValid = false;
        }
        
        // Validate password
        const password = document.getElementById('password');
        if (!password.value) {
            this.showError('passwordError', 'Password is required');
            isValid = false;
        } else if (password.value.length < 8) {
            this.showError('passwordError', 'Password must be at least 8 characters long');
            isValid = false;
        }
        
        // Validate confirm password
        const confirmPassword = document.getElementById('confirmPassword');
        if (!confirmPassword.value) {
            this.showError('confirmPasswordError', 'Please confirm your password');
            isValid = false;
        } else if (password.value !== confirmPassword.value) {
            this.showError('confirmPasswordError', 'Passwords do not match');
            isValid = false;
        }
        
        // Validate terms checkbox
        const terms = document.getElementById('terms');
        if (!terms.checked) {
            this.showError('termsError', 'You must agree to the terms and conditions');
            isValid = false;
        }
        
        return isValid;
    }

    setupRealTimeValidation() {
        document.querySelectorAll('.form-input, .form-select').forEach(input => {
            input.addEventListener('blur', () => {
                const fieldName = input.name;
                const errorElement = document.getElementById(fieldName + 'Error');
                
                if (input.hasAttribute('required') && !input.value.trim()) {
                    this.showError(fieldName + 'Error', 'This field is required');
                } else {
                    errorElement.style.display = 'none';
                }
            });
        });
    }

    setupPasswordValidation() {
        const password = document.getElementById('password');
        const confirmPassword = document.getElementById('confirmPassword');

        if (password) {
            password.addEventListener('input', () => {
                const passwordValue = password.value;
                const errorElement = document.getElementById('passwordError');
                
                if (passwordValue.length > 0 && passwordValue.length < 8) {
                    this.showError('passwordError', 'Password must be at least 8 characters long');
                } else if (passwordValue.length >= 8) {
                    errorElement.style.display = 'none';
                }
            });
        }

        if (confirmPassword) {
            confirmPassword.addEventListener('input', () => {
                const passwordValue = password.value;
                const confirmPasswordValue = confirmPassword.value;
                const errorElement = document.getElementById('confirmPasswordError');
                
                if (confirmPasswordValue.length > 0 && passwordValue !== confirmPasswordValue) {
                    this.showError('confirmPasswordError', 'Passwords do not match');
                } else if (passwordValue === confirmPasswordValue) {
                    errorElement.style.display = 'none';
                }
            });
        }
    }

    submitForm() {
        // Show loading state
        const submitBtn = document.getElementById('submitBtn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Creating Account...';
        submitBtn.disabled = true;
        
        // Simulate API call
        setTimeout(() => {
            // Show success message
            this.showSuccess('Account created successfully! Redirecting to dashboard...');
            
            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
                window.location.href = 'home-dashboard.html';
            }, 2000);
        }, 2000);
    }

    showError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    showSuccess(message) {
        // Create success message element
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.style.display = 'block';
        successDiv.style.background = 'rgba(16, 185, 129, 0.1)';
        successDiv.style.border = '1px solid rgba(16, 185, 129, 0.3)';
        successDiv.style.borderRadius = '12px';
        successDiv.style.padding = '1rem';
        successDiv.style.marginTop = '1rem';
        successDiv.style.textAlign = 'center';
        successDiv.innerHTML = `<i class="bi bi-check-circle"></i> ${message}`;
        
        // Insert after form
        this.form.parentNode.insertBefore(successDiv, this.form.nextSibling);
    }

    clearErrors() {
        const errorElements = document.querySelectorAll('.error-message');
        errorElements.forEach(element => {
            element.style.display = 'none';
            element.textContent = '';
        });
    }
}

// Global functions for external use
function showTerms() {
    alert('Terms of Service would be displayed here. This is a demo.');
}

function showPrivacy() {
    alert('Privacy Policy would be displayed here. This is a demo.');
}

function showLogin() {
    alert('Login page would be displayed here. This is a demo.');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new RegistrationForm();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RegistrationForm;
}
