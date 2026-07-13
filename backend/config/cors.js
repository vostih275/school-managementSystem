// List of allowed origins for CORS
const allowedOrigins = [
    // Development
    /^http:\/\/localhost(:\d+)?$/,  // All localhost ports
    /^http:\/\/127\.0\.0\.1(:\d+)?$/,  // All 127.0.0.1 ports
    
    // Production
    'https://aic-school-system-c0j6.onrender.com',
    'http://aic-school-system-c0j6.onrender.com',
    
    // Add any other production domains here
];

// Allow an optional domain from environment variables (e.g. FRONTEND_URL set in Render)
if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

module.exports = {
    allowedOrigins
};
