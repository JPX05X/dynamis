// API Configuration
const API_CONFIG = {
  // In development, use the full URL with port 3001
  // In production, this will be handled by relative URLs
  BASE_URL: window.location.hostname === 'localhost' 
    ? 'http://localhost:3001/api' 
    : '/api'
};

// Make it globally available
window.API_CONFIG = API_CONFIG;
