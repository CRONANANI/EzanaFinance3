/**
 * API Service for Ezana Finance
 * Handles all API calls to the backend
 */

class ApiService {
    constructor() {
        this.baseURL = 'http://localhost:8000/api';
        this.token = localStorage.getItem('auth_token');
        this.refreshToken = localStorage.getItem('refresh_token');
    }

    /**
     * Set authentication tokens
     */
    setTokens(accessToken, refreshToken) {
        this.token = accessToken;
        this.refreshToken = refreshToken;
        localStorage.setItem('auth_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
    }

    /**
     * Clear authentication tokens
     */
    clearTokens() {
        this.token = null;
        this.refreshToken = null;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');
    }

    /**
     * Get headers for API requests
     */
    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json',
        };

        if (includeAuth && this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    /**
     * Make API request
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getHeaders(options.includeAuth !== false),
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (response.status === 401 && this.refreshToken) {
                // Try to refresh token
                const refreshed = await this.refreshAccessToken();
                if (refreshed) {
                    // Retry original request with new token
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

    /**
     * Handle API response
     */
    async handleResponse(response) {
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Refresh access token
     */
    async refreshAccessToken() {
        try {
            const response = await fetch(`${this.baseURL}/auth/refresh`, {
                method: 'POST',
                headers: this.getHeaders(false),
                body: JSON.stringify({ refresh_token: this.refreshToken })
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

    // Authentication methods
    async login(email, password) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
            includeAuth: false
        });

        if (response.access_token) {
            this.setTokens(response.access_token, response.refresh_token);
            localStorage.setItem('user_data', JSON.stringify(response.user));
        }

        return response;
    }

    async register(email, password, firstName, lastName) {
        return await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                email,
                password,
                first_name: firstName,
                last_name: lastName
            }),
            includeAuth: false
        });
    }

    async getCurrentUser() {
        return await this.request('/auth/me');
    }

    // User profile methods
    async updateProfile(profileData) {
        return await this.request('/user/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    }

    async getDashboard() {
        return await this.request('/user/dashboard');
    }

    // Portfolio methods
    async getPortfolio() {
        return await this.request('/portfolio');
    }

    // Watchlist methods
    async getWatchlist() {
        return await this.request('/watchlist');
    }

    // Plaid integration methods
    async createPlaidLinkToken() {
        return await this.request('/plaid/link-token', {
            method: 'POST',
            body: JSON.stringify({ user_id: this.getCurrentUserId() })
        });
    }

    async exchangePlaidToken(publicToken) {
        return await this.request('/plaid/exchange-token', {
            method: 'POST',
            body: JSON.stringify({ public_token: publicToken })
        });
    }

    // Utility methods
    getCurrentUserId() {
        const userData = localStorage.getItem('user_data');
        return userData ? JSON.parse(userData).user.id : null;
    }

    isAuthenticated() {
        return !!this.token;
    }

    getUserData() {
        const userData = localStorage.getItem('user_data');
        return userData ? JSON.parse(userData) : null;
    }
}

// Create global instance
window.apiService = new ApiService();
