// API configuration and utility functions
const API_BASE_URL = (window.API_CONFIG?.BASE_URL || 'http://localhost:5000') + '/api';

// Helper function to handle API requests
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined
        });

        const data = await response.json();

        if (!response.ok) {
            const error = new Error(data.message || 'Something went wrong');
            error.status = response.status;
            throw error;
        }

        return data;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Auth API methods
export const authApi = {
    async login(email, password) {
        return apiRequest('/auth/login', {
            method: 'POST',
            body: { email, password }
        });
    },

    async register(userData) {
        return apiRequest('/auth/register', {
            method: 'POST',
            body: userData
        });
    },

    async getProfile(role) {
        return apiRequest(`/${role}/profile`);
    },

    async updateProfile(role, profileData) {
        return apiRequest(`/${role}/profile`, {
            method: 'PUT',
            body: profileData
        });
    },

    async changePassword(currentPassword, newPassword) {
        return apiRequest('/auth/change-password', {
            method: 'POST',
            body: { currentPassword, newPassword }
        });
    }
};

// Export the base API request function for other API modules
export { apiRequest };