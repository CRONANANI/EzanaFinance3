/**
 * Ezana Finance - Sign Up Page
 * Handles form validation, submission, email confirmation, and Google OAuth
 */

class SignUpForm {
  constructor() {
    this.form = document.getElementById('signupForm');
    this.submitBtn = document.getElementById('submitBtn');
    this.successModal = document.getElementById('successModal');

    this.fullNameInput = document.getElementById('fullName');
    this.emailInput = document.getElementById('email');
    this.passwordInput = document.getElementById('password');
    this.confirmPasswordInput = document.getElementById('confirmPassword');
    this.termsInput = document.getElementById('terms');

    this.togglePasswordBtn = document.getElementById('togglePassword');
    this.toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPassword');
    this.passwordStrength = document.getElementById('passwordStrength');

    this.verifyNowBtn = document.getElementById('verifyNowBtn');
    this.resendCodeBtn = document.getElementById('resendCodeBtn');
    this.closeModalBtn = document.getElementById('closeModal');
    this.googleSignUpBtn = document.getElementById('googleSignUpBtn');

    this.isValid = {
      fullName: false,
      email: false,
      password: false,
      confirmPassword: false,
      terms: false
    };

    this.init();
  }

  init() {
    if (!this.form) return;

    this.attachEventListeners();
    this.setupPasswordRequirements();
    this.initParticleCanvas();
  }

  attachEventListeners() {
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));

    this.fullNameInput.addEventListener('blur', () => this.validateFullName());
    this.fullNameInput.addEventListener('input', () => this.clearError('fullName'));

    this.emailInput.addEventListener('blur', () => this.validateEmail());
    this.emailInput.addEventListener('input', () => this.clearError('email'));

    this.passwordInput.addEventListener('input', () => {
      this.validatePassword();
      this.updatePasswordStrength();
      this.checkPasswordRequirements();
    });
    this.passwordInput.addEventListener('blur', () => this.validatePassword());

    this.confirmPasswordInput.addEventListener('input', () => this.validateConfirmPassword());
    this.confirmPasswordInput.addEventListener('blur', () => this.validateConfirmPassword());

    this.termsInput.addEventListener('change', () => this.validateTerms());

    if (this.togglePasswordBtn) {
      this.togglePasswordBtn.addEventListener('click', () => {
        this.togglePasswordVisibility(this.passwordInput, this.togglePasswordBtn);
      });
    }

    if (this.toggleConfirmPasswordBtn) {
      this.toggleConfirmPasswordBtn.addEventListener('click', () => {
        this.togglePasswordVisibility(this.confirmPasswordInput, this.toggleConfirmPasswordBtn);
      });
    }

    if (this.verifyNowBtn) {
      this.verifyNowBtn.addEventListener('click', () => this.goToVerification());
    }

    if (this.resendCodeBtn) {
      this.resendCodeBtn.addEventListener('click', () => this.resendCode());
    }

    if (this.closeModalBtn) {
      this.closeModalBtn.addEventListener('click', () => this.closeModal());
    }

    this.successModal.addEventListener('click', (e) => {
      if (e.target === this.successModal) this.closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.successModal.classList.contains('active')) {
        this.closeModal();
      }
    });

    /* Google sign-up handled by google-auth.js */
    const yahooBtn = document.getElementById('yahooSignUpBtn');
    if (yahooBtn) {
      yahooBtn.addEventListener('click', () => this.signUpWithYahoo());
    }
  }

  signUpWithYahoo() {
    this.showToast('Yahoo sign-up would be initiated here.', 'info');
  }

  setupPasswordRequirements() {
    this.requirements = {
      length: document.getElementById('req-length'),
      uppercase: document.getElementById('req-uppercase'),
      lowercase: document.getElementById('req-lowercase'),
      number: document.getElementById('req-number'),
      special: document.getElementById('req-special')
    };
  }

  initParticleCanvas() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];
    let animationId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = Array.from({ length: 50 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: 1 + Math.random() * 2
      }));
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
        ctx.fill();
      });
      animationId = requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener('resize', resize);
    animate();
  }

  validateFullName() {
    const value = this.fullNameInput.value.trim();

    if (!value) {
      this.showError('fullName', 'Full name is required');
      this.isValid.fullName = false;
      return false;
    }
    if (value.length < 2) {
      this.showError('fullName', 'Name must be at least 2 characters');
      this.isValid.fullName = false;
      return false;
    }
    if (!/^[a-zA-Z\s\-']+$/.test(value)) {
      this.showError('fullName', 'Name can only contain letters, spaces, hyphens, and apostrophes');
      this.isValid.fullName = false;
      return false;
    }

    this.clearError('fullName');
    this.fullNameInput.classList.add('success');
    this.isValid.fullName = true;
    return true;
  }

  validateEmail() {
    const value = this.emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!value) {
      this.showError('email', 'Email address is required');
      this.isValid.email = false;
      return false;
    }
    if (!emailRegex.test(value)) {
      this.showError('email', 'Please enter a valid email address');
      this.isValid.email = false;
      return false;
    }

    this.clearError('email');
    this.emailInput.classList.add('success');
    this.isValid.email = true;
    return true;
  }

  validatePassword() {
    const value = this.passwordInput.value;

    if (!value) {
      this.showError('password', 'Password is required');
      this.isValid.password = false;
      return false;
    }

    const requirements = this.checkPasswordRequirements();
    const allMet = Object.values(requirements).every(Boolean);

    if (!allMet) {
      this.showError('password', 'Password must meet all requirements');
      this.isValid.password = false;
      return false;
    }

    this.clearError('password');
    this.passwordInput.classList.add('success');
    this.isValid.password = true;

    if (this.confirmPasswordInput.value) {
      this.validateConfirmPassword();
    }

    return true;
  }

  checkPasswordRequirements() {
    const value = this.passwordInput.value;

    const requirements = {
      length: value.length >= 8,
      uppercase: /[A-Z]/.test(value),
      lowercase: /[a-z]/.test(value),
      number: /[0-9]/.test(value),
      special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value)
    };

    Object.keys(requirements).forEach((key) => {
      const el = this.requirements[key];
      if (el) {
        const icon = el.querySelector('i');
        if (icon) {
          icon.classList.remove('bi-circle', 'bi-check-circle-fill');
          icon.classList.add(requirements[key] ? 'bi-check-circle-fill' : 'bi-circle');
        }
        el.classList.toggle('met', requirements[key]);
      }
    });

    return requirements;
  }

  updatePasswordStrength() {
    const value = this.passwordInput.value;

    if (!value) {
      this.passwordStrength.className = 'password-strength';
      this.passwordStrength.querySelector('.strength-text').textContent = 'Password strength';
      return;
    }

    const requirements = this.checkPasswordRequirements();
    const metCount = Object.values(requirements).filter(Boolean).length;

    let strength = '';
    let text = '';

    if (metCount <= 2) {
      strength = 'weak';
      text = 'Weak';
    } else if (metCount === 3) {
      strength = 'fair';
      text = 'Fair';
    } else if (metCount === 4) {
      strength = 'good';
      text = 'Good';
    } else {
      strength = 'strong';
      text = 'Strong';
    }

    this.passwordStrength.className = `password-strength ${strength}`;
    this.passwordStrength.querySelector('.strength-text').textContent = text;
  }

  validateConfirmPassword() {
    const value = this.confirmPasswordInput.value;
    const passwordValue = this.passwordInput.value;

    if (!value) {
      this.showError('confirmPassword', 'Please confirm your password');
      this.isValid.confirmPassword = false;
      return false;
    }
    if (value !== passwordValue) {
      this.showError('confirmPassword', 'Passwords do not match');
      this.isValid.confirmPassword = false;
      return false;
    }

    this.clearError('confirmPassword');
    this.confirmPasswordInput.classList.add('success');
    this.isValid.confirmPassword = true;
    return true;
  }

  validateTerms() {
    if (!this.termsInput.checked) {
      this.showError('terms', 'You must accept the terms to continue');
      this.isValid.terms = false;
      return false;
    }

    this.clearError('terms');
    this.isValid.terms = true;
    return true;
  }

  showError(field, message) {
    const input = this[`${field}Input`];
    const error = document.getElementById(`${field}Error`);

    if (input) {
      input.classList.add('error');
      input.classList.remove('success');
    }

    if (error) {
      error.textContent = message;
      error.classList.add('visible');
    }
  }

  clearError(field) {
    const input = this[`${field}Input`];
    const error = document.getElementById(`${field}Error`);

    if (input) {
      input.classList.remove('error');
    }

    if (error) {
      error.classList.remove('visible');
      error.textContent = '';
    }
  }

  togglePasswordVisibility(input, button) {
    const icon = button.querySelector('i');
    if (input.type === 'password') {
      input.type = 'text';
      icon.classList.replace('bi-eye', 'bi-eye-slash');
    } else {
      input.type = 'password';
      icon.classList.replace('bi-eye-slash', 'bi-eye');
    }
  }

  async handleSubmit(e) {
    e.preventDefault();

    const valid =
      this.validateFullName() &&
      this.validateEmail() &&
      this.validatePassword() &&
      this.validateConfirmPassword() &&
      this.validateTerms();

    if (!valid) return;

    this.setLoadingState(true);

    const formData = {
      fullName: this.fullNameInput.value.trim(),
      email: this.emailInput.value.trim(),
      password: this.passwordInput.value,
      marketingOptIn: document.getElementById('marketing')?.checked ?? false
    };

    try {
      const response = await this.createAccount(formData);

      if (response.success) {
        this.showSuccessModal(formData.email);
      } else {
        throw new Error(response.message || 'Failed to create account');
      }
    } catch (error) {
      console.error('Sign up error:', error);
      this.showError('email', error.message || 'An error occurred. Please try again.');
    } finally {
      this.setLoadingState(false);
    }
  }

  async createAccount(formData) {
    if (window.apiService) {
      const [first, ...rest] = formData.fullName.trim().split(/\s+/);
      const lastName = rest.join(' ') || first;

      try {
        await window.apiService.register(
          formData.email,
          formData.password,
          first || '',
          lastName
        );
        return { success: true };
      } catch (e) {
        throw new Error(e.message || 'Registration failed');
      }
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: 'Account created successfully',
          userId: 'user_' + Date.now(),
          confirmationCodeSent: true
        });
      }, 2000);
    });
  }

  setLoadingState(isLoading) {
    if (isLoading) {
      this.submitBtn.disabled = true;
      this.submitBtn.classList.add('loading');
    } else {
      this.submitBtn.disabled = false;
      this.submitBtn.classList.remove('loading');
    }
  }

  showSuccessModal(email) {
    const userEmailEl = document.getElementById('userEmail');
    if (userEmailEl) userEmailEl.textContent = email;

    this.successModal.classList.add('active');
    this.successModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    this.successModal.classList.remove('active');
    this.successModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  goToVerification() {
    const email = this.emailInput.value.trim();
    const params = new URLSearchParams({ email });
    window.location.href = `verify-email.html?${params}`;
  }

  async resendCode() {
    const email = this.emailInput.value.trim();

    this.resendCodeBtn.disabled = true;
    this.resendCodeBtn.textContent = 'Sending...';

    try {
      await this.sendVerificationCode(email);
      this.resendCodeBtn.textContent = 'Code Sent!';
      this.showToast('Verification code sent. Check your email.', 'success');

      setTimeout(() => {
        this.resendCodeBtn.textContent = 'Resend Code';
        this.resendCodeBtn.disabled = false;
      }, 3000);
    } catch (error) {
      console.error('Resend code error:', error);
      this.resendCodeBtn.textContent = 'Failed - Try Again';
      this.resendCodeBtn.disabled = false;
      this.showToast('Failed to resend code.', 'error');
    }
  }

  async sendVerificationCode(email) {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ success: true }), 1500);
    });
  }

  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `signup-toast signup-toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      border-radius: 12px;
      font-size: 0.9375rem;
      font-weight: 500;
      z-index: 9999;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      animation: signupToastIn 0.3s ease;
    `;
    toast.style.background = type === 'error' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #10b981, #059669)';
    toast.style.color = '#fff';

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.signUpForm = new SignUpForm();
});
