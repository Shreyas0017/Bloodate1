import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getMe, login as apiLogin } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('accessToken'))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let ignore = false
    if (!token) {
      setUser(null)
      return
    }
    setLoading(true)
    getMe(token)
      .then((me) => { if (!ignore) setUser(me) })
      .catch(() => { if (!ignore) setUser(null) })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [token])

  const login = async (email, password) => {
    const res = await apiLogin(email, password)
    if (res && res.accessToken) {
      localStorage.setItem('accessToken', res.accessToken)
      setToken(res.accessToken)
    }
    return res
  }

  const logout = () => {
    localStorage.removeItem('accessToken')
    setToken(null)
    setUser(null)
  }

  const value = useMemo(() => ({ token, user, role: user?.role, login, logout, loading }), [token, user, loading])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
