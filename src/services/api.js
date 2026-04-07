import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Create a central Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Intercept requests to automatically add the Auth Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token'); // Assuming you save the JWT here
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;