/**
 * Ezana Finance - Email Verification Page
 */

class VerifyEmailForm {
  constructor() {
    this.form = document.getElementById('verifyForm');
    this.codeInputs = document.querySelectorAll('.code-input');
    this.codeError = document.getElementById('codeError');
    this.verifyBtn = document.getElementById('verifyBtn');
    this.resendBtn = document.getElementById('resendBtn');
    this.emailDisplay = document.getElementById('emailDisplay');

    this.email = this.getEmailFromParams();

    this.init();
  }

  getEmailFromParams() {
    const params = new URLSearchParams(window.location.search);
    return params.get('email') || '';
  }

  init() {
    if (this.emailDisplay) {
      this.emailDisplay.textContent = this.email || 'your email';
    }

    if (!this.email) {
      window.location.href = 'signup.html';
      return;
    }

    this.setupCodeInputs();
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));

    if (this.resendBtn) {
      this.resendBtn.addEventListener('click', () => this.resendCode());
    }
  }

  setupCodeInputs() {
    this.codeInputs.forEach((input, i) => {
      input.addEventListener('input', (e) => {
        const val = e.target.value.replace(/\D/g, '');
        e.target.value = val.slice(-1);

        if (val && i < this.codeInputs.length - 1) {
          this.codeInputs[i + 1].focus();
        }

        this.clearCodeError();
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && i > 0) {
          this.codeInputs[i - 1].focus();
        }

        if (e.key === 'ArrowLeft' && i > 0) {
          this.codeInputs[i - 1].focus();
        }
        if (e.key === 'ArrowRight' && i < this.codeInputs.length - 1) {
          this.codeInputs[i + 1].focus();
        }
      });

      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pasted = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6);
        pasted.split('').forEach((char, j) => {
          if (this.codeInputs[i + j]) {
            this.codeInputs[i + j].value = char;
          }
        });
        if (this.codeInputs[i + pasted.length - 1]) {
          this.codeInputs[i + pasted.length - 1].focus();
        }
        this.clearCodeError();
      });
    });
  }

  getCode() {
    return Array.from(this.codeInputs)
      .map((i) => i.value)
      .join('');
  }

  clearCodeError() {
    this.codeError.classList.remove('visible');
    this.codeError.textContent = '';
    this.codeInputs.forEach((i) => i.classList.remove('error'));
  }

  showCodeError(msg) {
    this.codeError.textContent = msg;
    this.codeError.classList.add('visible');
    this.codeInputs.forEach((i) => i.classList.add('error'));
  }

  async handleSubmit(e) {
    e.preventDefault();

    const code = this.getCode();

    if (code.length !== 6) {
      this.showCodeError('Please enter the complete 6-digit code');
      return;
    }

    this.verifyBtn.disabled = true;
    this.verifyBtn.classList.add('loading');

    try {
      const result = await this.verifyCode(this.email, code);

      if (result.success) {
        this.showToast('Email verified! Redirecting...', 'success');

        setTimeout(() => {
          window.location.href = 'sign-in.html';
        }, 1500);
      } else {
        throw new Error(result.message || 'Verification failed');
      }
    } catch (err) {
      this.showCodeError(err.message || 'Invalid code. Please try again.');
      this.verifyBtn.disabled = false;
      this.verifyBtn.classList.remove('loading');
    }
  }

  async verifyCode(email, code) {
    if (window.apiService) {
      try {
        const res = await fetch(`${window.apiService.baseURL}/auth/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code })
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.detail || data.message || 'Verification failed');
        }

        return { success: true, ...data };
      } catch (e) {
        throw e;
      }
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: 'Email verified successfully'
        });
      }, 1500);
    });
  }

  async resendCode() {
    this.resendBtn.disabled = true;
    this.resendBtn.textContent = 'Sending...';

    try {
      await this.sendVerificationCode(this.email);
      this.showToast('Verification code sent.', 'success');
      this.resendBtn.textContent = 'Resend Code';
    } catch (e) {
      this.showToast('Failed to resend code.', 'error');
      this.resendBtn.textContent = 'Resend Code';
    } finally {
      this.resendBtn.disabled = false;
    }
  }

  async sendVerificationCode(email) {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ success: true }), 1500);
    });
  }

  showToast(message, type) {
    const toast = document.createElement('div');
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
    `;
    toast.style.background =
      type === 'error'
        ? 'linear-gradient(135deg, #ef4444, #dc2626)'
        : 'linear-gradient(135deg, #10b981, #059669)';
    toast.style.color = '#fff';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new VerifyEmailForm();
});
