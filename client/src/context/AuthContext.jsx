import { createContext, useContext, useState, useEffect } from 'react'
import { API_BASE } from '../config'

const AuthContext = createContext(null)

const TOKEN_KEY = 'lifesync_token'
const USER_KEY = 'lifesync_user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load from localStorage on mount
    const savedToken = localStorage.getItem(TOKEN_KEY)
    const savedUser = localStorage.getItem(USER_KEY)
    
    if (savedToken && savedUser) {
      try {
        setUser(JSON.parse(savedUser))
        setToken(savedToken)
        // Verify token is still valid
        verifyToken(savedToken)
      } catch (err) {
        console.error('Failed to parse user from local storage', err)
        logout()
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }, [])

  const verifyToken = async (t) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${t}` },
      })
      if (res.ok) {
        const userData = await res.json()
        setUser(userData)
        localStorage.setItem(USER_KEY, JSON.stringify(userData))
      } else if (res.status === 401) {
        // Token strictly invalid or user not found, clear auth
        console.warn('[AuthContext] Token verification failed (401):', res.status)
        logout()
      } else {
        // For 500, 404 (other than user not found), or other status codes, 
        // we keep the session active as it might be a temporary server issue.
        console.warn('[AuthContext] Token verification returned error status:', res.status)
      }
    } catch (err) {
      console.error('[AuthContext] Verify token failed (network or other):', err)
      // On network error, we don't logout immediately to allow offline use/recovery
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    
    const data = await res.json()
    
    if (!res.ok) {
      throw new Error(data.error || 'Login failed')
    }
    
    setToken(data.token)
    setUser(data.user)
    localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))
    
    return data
  }

  const register = async (name, email, password) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })
    
    const data = await res.json()
    
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed')
    }
    
    setToken(data.token)
    setUser(data.user)
    localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))
    
    return data
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  const refreshUser = async () => {
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const userData = await res.json()
        setUser(userData)
        localStorage.setItem(USER_KEY, JSON.stringify(userData))
        return userData
      }
    } catch (err) {
      console.error('Failed to refresh user:', err)
    }
  }

  const getAuthHeaders = () => ({
    Authorization: token ? `Bearer ${token}` : '',
    'Content-Type': 'application/json',
  })

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser, getAuthHeaders }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
