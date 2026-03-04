/**
 * API Service for Ezana Finance
 * Handles all API calls to the backend
 * Client-side only - uses localStorage for tokens
 */

import { API_CONFIG } from './api-config';

export class ApiService {
  constructor() {
    this.baseURL = API_CONFIG.backend.baseURL;
    this.token = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
      this.refreshToken = localStorage.getItem('refresh_token');
    }
  }

  setTokens(accessToken, refreshToken) {
    this.token = accessToken;
    this.refreshToken = refreshToken;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
    }
  }

  clearTokens() {
    this.token = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_data');
    }
  }

  getHeaders(includeAuth = true) {
    const headers = { 'Content-Type': 'application/json' };
    if (includeAuth && this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(options.includeAuth !== false),
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (response.status === 401 && this.refreshToken) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          config.headers = this.getHeaders(true);
          const retryResponse = await fetch(url, config);
          return await this.handleResponse(retryResponse);
        }
      }

      return await this.handleResponse(response);
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async handleResponse(response) {
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch (_) {}
      throw new Error(errorMessage);
    }
    return await response.json();
  }

  async refreshAccessToken() {
    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: this.getHeaders(false),
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        this.setTokens(data.access_token, data.refresh_token);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
    this.clearTokens();
    return false;
  }

  async googleLogin(credential, email, name, picture, emailVerified) {
    return await this.request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential, email, name, picture, email_verified: emailVerified }),
      includeAuth: false,
    });
  }

  async login(email, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      includeAuth: false,
    });
    if (response.access_token) {
      this.setTokens(response.access_token, response.refresh_token);
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_data', JSON.stringify(response.user));
      }
    }
    return response;
  }

  async register(email, password, firstName, lastName) {
    return await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, first_name: firstName, last_name: lastName }),
      includeAuth: false,
    });
  }

  async getCurrentUser() {
    return await this.request('/auth/me');
  }

  async updateProfile(profileData) {
    return await this.request('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async getDashboard() {
    return await this.request('/user/dashboard');
  }

  async getPortfolio() {
    return await this.request('/portfolio');
  }

  async getWatchlist() {
    return await this.request('/watchlist');
  }

  async getMarketQuotes(symbols = []) {
    const symbolList = Array.isArray(symbols) ? symbols : [symbols];
    const query = encodeURIComponent(symbolList.filter(Boolean).join(','));
    return await this.request(`/market/quotes?symbols=${query}`, { includeAuth: false });
  }

  async getCongressionalTrading(limit = 100) {
    return await this.request(`/quiver/congressional-trading?limit=${limit}`, { includeAuth: false });
  }

  async getGovernmentContracts(limit = 50) {
    return await this.request(`/quiver/government-contracts?limit=${limit}`, { includeAuth: false });
  }

  async getHouseTrading(limit = 50) {
    return await this.request(`/quiver/house-trading?limit=${limit}`, { includeAuth: false });
  }

  async getSenatorTrading(limit = 50) {
    return await this.request(`/quiver/senator-trading?limit=${limit}`, { includeAuth: false });
  }

  async getLobbyingActivity(limit = 50) {
    return await this.request(`/quiver/lobbying-activity?limit=${limit}`, { includeAuth: false });
  }

  async getPatentMomentum(limit = 50) {
    return await this.request(`/quiver/patent-momentum?limit=${limit}`, { includeAuth: false });
  }

  async createPlaidLinkToken() {
    return await this.request('/plaid/link-token', {
      method: 'POST',
      body: JSON.stringify({ user_id: this.getCurrentUserId() }),
    });
  }

  async exchangePlaidToken(publicToken) {
    return await this.request('/plaid/exchange-token', {
      method: 'POST',
      body: JSON.stringify({ public_token: publicToken }),
    });
  }

  getCurrentUserId() {
    if (typeof window === 'undefined') return null;
    const userData = localStorage.getItem('user_data');
    return userData ? JSON.parse(userData).user?.id : null;
  }

  isAuthenticated() {
    return !!this.token;
  }

  getUserData() {
    if (typeof window === 'undefined') return null;
    const userData = localStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  }
}

export const apiService = new ApiService();
