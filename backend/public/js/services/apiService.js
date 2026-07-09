const API_BASE_URL = 'https://api.render.com/deploy/srv-d2mmj8bipnbc73f2ega0?key=YOAfkT9DZA4/api';

// Helper function to handle API requests
async function fetchData(endpoint, options = {}) {
    try {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
            credentials: 'include' // Important for cookies if using httpOnly cookies
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Something went wrong');
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Dashboard API
const dashboardApi = {
    // Get dashboard statistics
    getStats: async () => {
        return fetchData('/dashboard/stats');
    },
    
    // Get quick stats for the dashboard
    getQuickStats: async () => {
        return fetchData('/dashboard/quick-stats');
    },
    
    // Get recent activities
    getRecentActivities: async () => {
        return fetchData('/dashboard/recent-activities');
    }
};

// Export the API methods
export { dashboardApi };

// Authentication API
const authApi = {
    login: async (email, password) => {
        return fetchData('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    },

    register: async (userData) => {
        return fetchData('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },

    getProfile: async (role) => {
        const endpoint = role === 'teacher' ? '/teachers/profile' : '/students/profile';
        return fetchData(endpoint);
    }
};

