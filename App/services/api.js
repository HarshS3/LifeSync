import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Change this to your local machine IP for physical device testing
// Example: http://192.168.1.5:5000
export const API_BASE = 'https://lifesync.onrender.com/api'; // Make sure this matches exactly your render URL

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add auth token
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('userToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
