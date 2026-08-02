import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function AdminLogin() {
  const { login, user } = useAuth()
  const [form, setForm] = useState({ email: 'admin@bloodate.test', password: 'password' })
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await login(form.email, form.password)
    } catch (err) {
      setError('Invalid credentials')
    }
  }

  return (
    <div className="panel p-8 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-2">Admin Login</h2>
      <p className="text-sm text-slate-500 mb-6">Admins can access system-wide controls and reports.</p>
      {user ? (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700">
          Logged in as {user.email}. You can now access admin routes.
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none" placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
          <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none" placeholder="Password" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} />
          {error && <div className="text-xs text-rose-600">{error}</div>}
          <button className="w-full px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800" type="submit">Login</button>
        </form>
      )}
    </div>
  )
}
