import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RequireRole({ role, redirectTo, children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return <div className="panel p-6 text-sm text-slate-500">Loading...</div>
  }
  if (!user) return <Navigate to={redirectTo} replace />
  if (role) {
    const allowed = Array.isArray(role) ? role : [role]
    if (!allowed.includes(user.role)) return <Navigate to={redirectTo} replace />
  }
  return children
}
