import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// Dynamically get the host IP during development to support switching between networks
const getDevIp = () => {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return 'localhost';
  // hostUri looks like "192.168.1.9:8081"
  return hostUri.split(':')[0];
};

const DEV_API_ORIGIN = `http://${getDevIp()}:5000`;
const PROD_API_ORIGIN = 'https://lifesync-5ahi.onrender.com';

// Note: localhost works for simulators/emulators and desktop-hosted local testing.
// For a physical phone on Wi-Fi, replace localhost with your machine's LAN IP.
export const API_BASE = `${__DEV__ ? DEV_API_ORIGIN : PROD_API_ORIGIN}/api`;

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
