/**
 * Ezana Finance - Sign In Page
 * Handles authentication via email/password and social providers
 */

const OAUTH_CONFIG = {
  google: { clientId: window.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID' }
};

class SignInForm {
  constructor() {
    this.form = document.getElementById('signinForm');
    this.submitBtn = document.getElementById('submitBtn');
    this.emailInput = document.getElementById('email');
    this.passwordInput = document.getElementById('password');
    this.rememberMeInput = document.getElementById('rememberMe');
    this.togglePasswordBtn = document.getElementById('togglePassword');

    this.init();
  }

  init() {
    if (!this.form) return;
    this.attachEventListeners();
    this.initParticleCanvas();
    this.initSocialButtons();
  }

  initParticleCanvas() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
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
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
        ctx.fill();
      });
      requestAnimationFrame(animate);
    };
    resize();
    window.addEventListener('resize', resize);
    animate();
  }

  initSocialButtons() {
    const googleBtn = document.getElementById('googleSignInBtn');
    if (googleBtn) googleBtn.addEventListener('click', () => this.signInWithGoogle());
    const msBtn = document.getElementById('microsoftSignInBtn');
    if (msBtn) msBtn.addEventListener('click', () => this.signInWithMicrosoft());
    const yahooBtn = document.getElementById('yahooSignInBtn');
    if (yahooBtn) yahooBtn.addEventListener('click', () => this.signInWithYahoo());
  }

  signInWithGoogle() {
    if (typeof google === 'undefined') {
      this.showToast('Google sign-in not loaded. Refresh and try again.', 'error');
      return;
    }
    if (OAUTH_CONFIG.google.clientId === 'YOUR_GOOGLE_CLIENT_ID') {
      this.showToast('Configure Google Client ID to enable Google sign-in.', 'error');
      return;
    }
    try {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: OAUTH_CONFIG.google.clientId,
        scope: 'openid email profile',
        callback: async (tokenResponse) => {
          try {
            const res = await fetch(
              `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${tokenResponse.access_token}`
            );
            const userInfo = await res.json();
            this.processOAuthSignIn({ provider: 'google', ...userInfo });
          } catch (e) {
            this.showToast('Failed to sign in with Google.', 'error');
          }
        }
      });
      tokenClient.requestAccessToken();
    } catch (e) {
      this.showToast('Google sign-in failed.', 'error');
    }
  }

  signInWithMicrosoft() {
    this.showToast('Microsoft sign-in would be initiated here.', 'info');
  }

  signInWithYahoo() {
    this.showToast('Yahoo sign-in would be initiated here.', 'info');
  }

  processOAuthSignIn(userData) {
    this.showToast('Signed in successfully! Redirecting...', 'success');
    localStorage.setItem('userData', JSON.stringify(userData));
    localStorage.setItem('isAuthenticated', 'true');
    setTimeout(() => {
      window.location.href = 'home-dashboard.html';
    }, 1000);
  }

  attachEventListeners() {
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    this.emailInput.addEventListener('blur', () => this.validateEmail());
    this.emailInput.addEventListener('input', () => this.clearError('email'));
    this.passwordInput.addEventListener('blur', () => this.validatePassword());
    this.passwordInput.addEventListener('input', () => this.clearError('password'));
    if (this.togglePasswordBtn) {
      this.togglePasswordBtn.addEventListener('click', () => this.togglePasswordVisibility());
    }
  }

  validateEmail() {
    const value = this.emailInput.value.trim();
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) {
      this.showError('email', 'Email address is required');
      return false;
    }
    if (!regex.test(value)) {
      this.showError('email', 'Please enter a valid email address');
      return false;
    }
    this.clearError('email');
    this.emailInput.classList.add('success');
    return true;
  }

  validatePassword() {
    const value = this.passwordInput.value;
    if (!value) {
      this.showError('password', 'Password is required');
      return false;
    }
    this.clearError('password');
    this.passwordInput.classList.add('success');
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
    if (input) input.classList.remove('error');
    if (error) {
      error.classList.remove('visible');
      error.textContent = '';
    }
  }

  togglePasswordVisibility() {
    const icon = this.togglePasswordBtn.querySelector('i');
    if (this.passwordInput.type === 'password') {
      this.passwordInput.type = 'text';
      icon.classList.replace('bi-eye', 'bi-eye-slash');
    } else {
      this.passwordInput.type = 'password';
      icon.classList.replace('bi-eye-slash', 'bi-eye');
    }
  }

  async handleSubmit(e) {
    e.preventDefault();
    if (!this.validateEmail() || !this.validatePassword()) return;

    this.setLoadingState(true);
    const formData = {
      email: this.emailInput.value.trim(),
      password: this.passwordInput.value,
      rememberMe: this.rememberMeInput?.checked ?? false
    };

    try {
      const response = await this.signIn(formData);
      if (response.success || response.access_token) {
        if (response.access_token && window.apiService) {
          window.apiService.setTokens(response.access_token, response.refresh_token);
          if (response.user) localStorage.setItem('user_data', JSON.stringify(response.user));
        } else if (response.token) {
          localStorage.setItem('authToken', response.token);
        }
        this.showToast('Sign in successful! Redirecting...', 'success');
        setTimeout(() => {
          window.location.href = 'home-dashboard.html';
        }, 800);
      } else {
        throw new Error(response.message || response.detail || 'Invalid credentials');
      }
    } catch (error) {
      this.showError('password', error.message || 'Invalid email or password');
    } finally {
      this.setLoadingState(false);
    }
  }

  async signIn(formData) {
    if (window.apiService) {
      try {
        return await window.apiService.login(formData.email, formData.password);
      } catch (e) {
        throw e;
      }
    }
    return new Promise((resolve) => {
      setTimeout(() => resolve({
        success: true,
        token: 'mock_jwt_' + Date.now(),
        user: { email: formData.email, name: 'User' }
      }), 1500);
    });
  }

  setLoadingState(isLoading) {
    this.submitBtn.disabled = isLoading;
    this.submitBtn.classList.toggle('loading', isLoading);
  }

  showToast(message, type) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `position:fixed;top:20px;right:20px;padding:1rem 1.5rem;border-radius:12px;font-weight:500;z-index:9999;color:#fff;`;
    toast.style.background = type === 'error' ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#10b981,#059669)';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.signInForm = new SignInForm();
});
