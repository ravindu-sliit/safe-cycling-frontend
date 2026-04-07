import axios from 'axios';

// Create a central Axios instance
const api = axios.create({
  baseURL: 'http://localhost:5000/api', // Change this later when you deploy!
});

// Intercept requests to automatically add the Auth Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token'); // Assuming you save the JWT here
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  },
);

export default api;
