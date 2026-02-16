/**
 * Google Sign-In with Google Identity Services
 * Uses credential (JWT) flow - token verified by backend
 */
(function () {
  'use strict';

  const GOOGLE_CLIENT_ID = window.GOOGLE_CLIENT_ID || '296880553171-tshf9f77hcrdqjikged1e1adf766mkbt.apps.googleusercontent.com';

  function getApiBase() {
    return window.EZANA_API_BASE || (window.apiService && window.apiService.baseURL)
      ? (window.apiService.baseURL.replace(/\/api$/, '') || '')
      : '';
  }

  class GoogleAuth {
    constructor() {
      this.clientId = GOOGLE_CLIENT_ID;
      this.initialized = false;
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.init());
      } else {
        this.init();
      }
    }

    init() {
      this.loadGoogleScript();
    }

    loadGoogleScript() {
      if (window.google && window.google.accounts) {
        this.initializeGoogleSignIn();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => this.initializeGoogleSignIn();
      document.head.appendChild(script);
    }

    initializeGoogleSignIn() {
      if (!window.google || !window.google.accounts || !window.google.accounts.id) {
        setTimeout(() => this.initializeGoogleSignIn(), 100);
        return;
      }
      window.google.accounts.id.initialize({
        client_id: this.clientId,
        callback: this.handleCredentialResponse.bind(this),
        auto_select: false,
        cancel_on_tap_outside: true
      });
      this.initialized = true;
      this.renderButtons();
    }

    renderButtons() {
      const signInBtn = document.getElementById('googleSignInBtn');
      if (signInBtn) {
        this.replaceWithGoogleButton(signInBtn, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          type: 'standard',
          width: signInBtn.offsetWidth || 320,
          logo_alignment: 'left'
        });
      }
      const signUpBtn = document.getElementById('googleSignUpBtn');
      if (signUpBtn) {
        this.replaceWithGoogleButton(signUpBtn, {
          theme: 'filled_blue',
          size: 'large',
          text: 'signup_with',
          type: 'standard',
          width: signUpBtn.offsetWidth || 320,
          logo_alignment: 'left'
        });
      }
    }

    replaceWithGoogleButton(container, options) {
      if (!container || !window.google || !window.google.accounts || !window.google.accounts.id) return;
      container.innerHTML = '';
      container.style.width = '100%';
      container.style.display = 'flex';
      container.style.justifyContent = 'center';
      try {
        window.google.accounts.id.renderButton(container, options);
      } catch (e) {
        console.warn('Google button render failed:', e);
      }
    }

    handleCredentialResponse(response) {
      const credential = response.credential;
      if (!credential) return;
      const payload = this.parseJwt(credential);
      this.authenticateUser(credential, payload);
    }

    parseJwt(token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map(function (c) { return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); })
            .join('')
        );
        return JSON.parse(jsonPayload);
      } catch (e) {
        return {};
      }
    }

    async authenticateUser(credential, userInfo) {
      try {
        let data;
        if (window.apiService && typeof window.apiService.googleLogin === 'function') {
          data = await window.apiService.googleLogin(
            credential,
            userInfo.email,
            userInfo.name,
            userInfo.picture,
            userInfo.email_verified
          );
        } else {
          const base = getApiBase();
          const url = (base || '') + '/api/auth/google';
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              credential: credential,
              email: userInfo.email,
              name: userInfo.name,
              picture: userInfo.picture,
              email_verified: userInfo.email_verified
            })
          });
          data = await response.json();
          if (!response.ok) {
            this.showToast(data.detail || data.message || 'Sign in failed', 'error');
            return;
          }
        }

        if (data && data.access_token) {
          if (window.apiService) {
            window.apiService.setTokens(data.access_token, data.refresh_token);
          } else {
            localStorage.setItem('auth_token', data.access_token);
            if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
          }
          if (data.user) localStorage.setItem('user_data', JSON.stringify(data.user));
          window.location.href = 'home-dashboard.html';
        } else {
          const msg = data.detail || data.message || 'Sign in failed';
          this.showToast(typeof msg === 'string' ? msg : (msg.msg || 'Sign in failed'), 'error');
        }
      } catch (error) {
        console.error('Google auth error:', error);
        this.showToast('An error occurred. Please try again.', 'error');
      }
    }

    showToast(message, type) {
      const toast = document.createElement('div');
      toast.textContent = message;
      toast.style.cssText = 'position:fixed;top:20px;right:20px;padding:1rem 1.5rem;border-radius:12px;font-weight:500;z-index:9999;color:#fff;';
      toast.style.background = type === 'error' ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#10b981,#059669)';
      document.body.appendChild(toast);
      setTimeout(function () { toast.remove(); }, 4000);
    }
  }

  window.GoogleAuth = GoogleAuth;
  window.googleAuth = new GoogleAuth();
})();
