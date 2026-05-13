import { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import api, { API_BASE } from '../services/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'userToken';
const USER_KEY = 'userData';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStorageData();
  }, []);

  const loadStorageData = async () => {
    try {
      const savedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      const savedUser = await SecureStore.getItemAsync(USER_KEY);
      
      if (savedToken && savedUser) {
        setToken(savedToken);
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        // Verify token in background
        verifyToken(savedToken);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to load storage data', err);
      setLoading(false);
    }
  };

  const verifyToken = async (t) => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(res.data));
    } catch (err) {
      if (err.response?.status === 401) {
        console.warn('[AuthContext] Token verification failed (401):', err.message);
        logout();
      } else {
        console.warn('[AuthContext] Token verification failed (non-401):', err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, user } = res.data;
      
      setToken(token);
      setUser(user);
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
      
      return res.data;
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Login failed');
    }
  };

  const register = async (name, email, password) => {
    try {
      const res = await api.post('/auth/register', { name, email, password });
      const { token, user } = res.data;
      
      setToken(token);
      setUser(user);
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
      
      return res.data;
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Registration failed');
    }
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(res.data));
      return res.data;
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
