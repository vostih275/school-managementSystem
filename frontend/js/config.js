// API Configuration - Using relative URLs for local development
console.log('[CONFIG] Loading config.js...');

const API_CONFIG = (() => {
    // Check if we're running in development or production
    const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.startsWith('127.');

    const PRODUCTION_BASE = 'https://aic-school-system-c0j6.onrender.com';
    const DEV_BASE = 'http://localhost:5000';

    const baseConfig = {
        // Production URLs
        PRODUCTION: {
            BASE_URL: PRODUCTION_BASE,
            API_BASE_URL: PRODUCTION_BASE + '/api'
        },
        // Development URLs (localhost)
        DEVELOPMENT: {
            BASE_URL: DEV_BASE,
            API_BASE_URL: DEV_BASE + '/api'
        }
    };

    // Select the appropriate config based on environment
    const envConfig = isProduction ? baseConfig.PRODUCTION : baseConfig.DEVELOPMENT;

    // Return the config with all URLs
    return {
        ...envConfig,
        AUTH_URL: `${envConfig.API_BASE_URL}/auth`,
        PAYMENTS_URL: `${envConfig.API_BASE_URL}/payments`,
        CLASSES_URL: `${envConfig.API_BASE_URL}/classes`,
        CLUBS_URL: `${envConfig.API_BASE_URL}/clubs`,
        BOOKS_URL: `${envConfig.API_BASE_URL}/books`,
        EVENTS_URL: `${envConfig.API_BASE_URL}/events`,
        BACKUP_URL: `${envConfig.API_BASE_URL}/backups`,
        // Add other endpoints as needed
        isProduction
    };
})();

// Make it available globally
window.API_CONFIG = API_CONFIG;
console.log('[CONFIG] API_CONFIG set:', window.API_CONFIG);

// Safe localStorage wrapper to handle tracking prevention
const safeStorage = {
    getItem: (key) => {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.warn('localStorage blocked, trying sessionStorage:', e);
            try {
                return sessionStorage.getItem(key);
            } catch (e2) {
                console.warn('sessionStorage also blocked:', e2);
                return window.__tempStorage?.[key] || null;
            }
        }
    },
    setItem: (key, value) => {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.warn('localStorage blocked, trying sessionStorage:', e);
            try {
                sessionStorage.setItem(key, value);
            } catch (e2) {
                console.warn('sessionStorage also blocked, using memory:', e2);
                window.__tempStorage = window.__tempStorage || {};
                window.__tempStorage[key] = value;
            }
        }
    },
    removeItem: (key) => {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            try {
                sessionStorage.removeItem(key);
            } catch (e2) {
                if (window.__tempStorage) {
                    delete window.__tempStorage[key];
                }
            }
        }
    }
};

// Make safe storage available globally
window.safeStorage = safeStorage;

// Helper function to get resource URL
function getResourceUrl(path) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    if (path.startsWith('data:')) return path;
    
    const cleanPath = path.replace(/^\/|^uploads\//g, '');
    if (path.includes('profile-photos/')) {
        return `${API_CONFIG.BASE_URL}/uploads/profile-photos/${cleanPath}`;
    }
    return `${API_CONFIG.BASE_URL}/uploads/${cleanPath}`;
}

/**
 * Wrapper for API requests with proper error handling and authentication
 * @param {string} endpoint - The API endpoint (e.g., '/auth/login')
 * @param {Object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<Object|string>} - The parsed JSON response or text if not JSON
 */
async function apiFetch(endpoint, options = {}) {
    // Skip token check for auth endpoints to prevent infinite loops
    const isAuthEndpoint = endpoint.includes('/auth/');
    const token = isAuthEndpoint ? null : localStorage.getItem('token');
    
    // Build the full URL, handling both relative and absolute endpoints
    const url = endpoint.startsWith('http') 
        ? endpoint 
        : `${endpoint.startsWith('/') ? '' : '/'}${endpoint}`.replace(/^\/api/, API_CONFIG.API_BASE_URL);
    
    // Set up headers
    const headers = new Headers({
        'Accept': 'application/json',
        ...(options.body && !(options.body instanceof FormData) && { 'Content-Type': 'application/json' }),
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...(options.headers || {})
    });

    // Prepare the request config
    const config = {
        ...options,
        headers,
        credentials: 'include',  // Important for cookies and auth
        mode: 'cors'            // Enable CORS
    };

    // Log request in development
    if (!API_CONFIG.isProduction) {
        console.log(`[API] ${config.method || 'GET'} ${url}`, { options });
    }

    try {
        const response = await fetch(url, config);
        
        // Handle non-2xx responses
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = await response.text();
            }
            
            const error = new Error(errorData.message || `HTTP error! status: ${response.status}`);
            error.status = response.status;
            error.response = response;
            error.data = errorData;
            throw error;
        }
        
        // For 204 No Content responses, return null
        if (response.status === 204) return null;
        
        // Try to parse JSON, but handle non-JSON responses
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }
        return await response.text();
        
    } catch (error) {
        console.error('API request failed:', {
            endpoint,
            error: error.message,
            status: error.status,
            data: error.data
        });
        
        // Handle common error cases
        if (error.status === 401) {
            // Unauthorized - redirect to login
            window.location.href = '/pages/login.html';
        }
        
        throw error;
    }
}

// Make it available globally
window.apiFetch = apiFetch;