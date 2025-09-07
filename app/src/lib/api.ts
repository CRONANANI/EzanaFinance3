const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Auth token management
export const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem('authToken', token);
};

export const removeAuthToken = (): void => {
  localStorage.removeItem('authToken');
};

// API request helper
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(url, config);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Auth API
export const authAPI = {
  register: (userData: {
    email: string;
    username: string;
    password: string;
    first_name: string;
    last_name: string;
  }) => apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),

  login: (credentials: { username: string; password: string }) =>
    apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  getCurrentUser: () => apiRequest('/api/auth/me'),
};

// Accounts API
export const accountsAPI = {
  getAccounts: () => apiRequest('/api/accounts/'),
  
  createAccount: (accountData: {
    name: string;
    account_type: string;
    currency?: string;
    description?: string;
  }) => apiRequest('/api/accounts/', {
    method: 'POST',
    body: JSON.stringify(accountData),
  }),

  getAccount: (id: number) => apiRequest(`/api/accounts/${id}`),
  
  updateAccount: (id: number, updateData: any) =>
    apiRequest(`/api/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    }),

  deleteAccount: (id: number) =>
    apiRequest(`/api/accounts/${id}`, { method: 'DELETE' }),
};

// Transactions API
export const transactionsAPI = {
  getTransactions: (params?: {
    skip?: number;
    limit?: number;
    category?: string;
    transaction_type?: string;
    account_id?: number;
    start_date?: string;
    end_date?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return apiRequest(`/api/transactions/?${queryParams}`);
  },

  createTransaction: (transactionData: {
    amount: number;
    description: string;
    category: string;
    transaction_type: string;
    date: string;
    account_id: number;
  }) => apiRequest('/api/transactions/', {
    method: 'POST',
    body: JSON.stringify(transactionData),
  }),

  getTransaction: (id: number) => apiRequest(`/api/transactions/${id}`),
  
  updateTransaction: (id: number, updateData: any) =>
    apiRequest(`/api/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    }),

  deleteTransaction: (id: number) =>
    apiRequest(`/api/transactions/${id}`, { method: 'DELETE' }),

  getMonthlySummary: (year: number, month: number) =>
    apiRequest(`/api/transactions/summary/monthly?year=${year}&month=${month}`),
};

// Budgets API
export const budgetsAPI = {
  getBudgets: (params?: { skip?: number; limit?: number; active_only?: boolean }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return apiRequest(`/api/budgets/?${queryParams}`);
  },

  createBudget: (budgetData: {
    name: string;
    category: string;
    amount: number;
    period: string;
    start_date: string;
    end_date: string;
  }) => apiRequest('/api/budgets/', {
    method: 'POST',
    body: JSON.stringify(budgetData),
  }),

  getBudget: (id: number) => apiRequest(`/api/budgets/${id}`),
  
  updateBudget: (id: number, updateData: any) =>
    apiRequest(`/api/budgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    }),

  deleteBudget: (id: number) =>
    apiRequest(`/api/budgets/${id}`, { method: 'DELETE' }),

  getBudgetsOverview: () => apiRequest('/api/budgets/status/overview'),
};
