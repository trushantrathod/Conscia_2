import axios from 'axios';
import { auth } from '../config/firebase';

const apiClient = axios.create({
  // This tells React: "If we are live, use the live URL. If we are testing, use localhost."
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8080/api',
  withCredentials: true,
});

// Request Interceptor: Automatically attach the Firebase JWT to every backend request
apiClient.interceptors.request.use(
  async (config) => {
    // Force Axios to wait until Firebase determines the auth state
    await auth.authStateReady(); 
    
    const user = auth.currentUser;
    if (user) {
      // Get the fresh token
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle global API errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.error('Authentication error:', error.response.data.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient;