/**
 * API configuration for different environments
 * - Local development: Uses the local Express server
 * - Netlify: Uses Netlify Functions
 */

// Default API URL for local development
let baseApiUrl = '';

// For production (Netlify) we'll use environment variables 
// or the netlify functions endpoint
if (import.meta.env.PROD) {
  // This will be replaced with the actual URL during deployment
  baseApiUrl = import.meta.env.VITE_API_URL || '/.netlify/functions';
}

export const apiConfig = {
  baseUrl: baseApiUrl,
  
  // Helper function to construct API URLs
  getUrl: (endpoint: string): string => {
    // Remove leading slash if present to avoid double slashes
    const normalizedEndpoint = endpoint.startsWith('/') 
      ? endpoint.substring(1) 
      : endpoint;
    
    return `${baseApiUrl}/${normalizedEndpoint}`;
  },
  
  // Function to handle API responses consistently
  handleResponse: async (response: Response) => {
    if (!response.ok) {
      // Try to get error message from response
      try {
        const errorData = await response.json();
        throw new Error(errorData.message || 'API request failed');
      } catch (e) {
        // If response is not JSON or other error
        throw new Error(`API request failed with status ${response.status}`);
      }
    }
    
    return response.json();
  }
};

// Example usage:
// const data = await fetch(apiConfig.getUrl('/api/staking-stats'))
//   .then(apiConfig.handleResponse);