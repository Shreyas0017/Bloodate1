import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { registerUser } from '../api'

const roleDestinations = {
  SUPER_ADMIN: '/admin/dashboard',
  HOSPITAL_ADMIN: '/hospitals',
  HOSPITAL_STAFF: '/hospitals/blood-bank',
  DONOR: '/user'
}

export default function Login() {
  const { login, user, role, loading } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showSignup, setShowSignup] = useState(false)
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm: ''
  })
  const [signupError, setSignupError] = useState('')
  const [signupSubmitting, setSignupSubmitting] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (user && role) {
      const destination = roleDestinations[role] || '/'
      navigate(destination, { replace: true })
    }
  }, [user, role, navigate])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(form.email.trim(), form.password)
    } catch (err) {
      setError('Invalid credentials')
      setSubmitting(false)
    }
  }

  const isBusy = submitting || loading
  const isSignupBusy = signupSubmitting || loading

  const submitSignup = async (e) => {
    e.preventDefault()
    setSignupError('')
    if (signupForm.password !== signupForm.confirm) {
      setSignupError('Passwords do not match')
      return
    }
    setSignupSubmitting(true)
    try {
      await registerUser({
        name: signupForm.name.trim() || undefined,
        email: signupForm.email.trim(),
        password: signupForm.password,
        role: 'DONOR'
      })
      await login(signupForm.email.trim(), signupForm.password)
    } catch (err) {
      setSignupError('Unable to create account')
      setSignupSubmitting(false)
    }
  }
  return (
    <div className="max-w-xl mx-auto">
      <section className="panel p-8">
        <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Portal Access</div>
        <h1 className="text-3xl font-bold mt-2">Log in to Bloodate</h1>
        <p className="text-sm text-slate-500 mt-2">Sign in to continue.</p>

        {user && role ? (
          <div className="mt-6 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700">
            Signed in as {user.email}. Redirecting now.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none"
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
              required
            />
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none"
              placeholder="Password"
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              autoComplete="current-password"
              required
            />
            {error && <div className="text-xs text-rose-600">{error}</div>}
            <button className="btn-primary w-full" type="submit" disabled={isBusy}>
              {isBusy ? 'Signing in...' : 'Login'}
            </button>
          </form>
        )}
        {!user && (
          <div className="mt-6 border-t border-slate-100 pt-5">
            <button
              type="button"
              className="text-sm font-semibold text-slate-700 hover:text-red-600"
              onClick={() => setShowSignup((value) => !value)}
            >
              {showSignup ? 'Hide user sign up' : 'Sign up as user'}
            </button>
            {showSignup && (
              <form onSubmit={submitSignup} className="mt-4 space-y-3">
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none"
                  placeholder="Full name"
                  value={signupForm.name}
                  onChange={e => setSignupForm({ ...signupForm, name: e.target.value })}
                  autoComplete="name"
                  required
                />
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none"
                  placeholder="Email"
                  type="email"
                  value={signupForm.email}
                  onChange={e => setSignupForm({ ...signupForm, email: e.target.value })}
                  autoComplete="email"
                  required
                />
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none"
                  placeholder="Password"
                  type="password"
                  value={signupForm.password}
                  onChange={e => setSignupForm({ ...signupForm, password: e.target.value })}
                  autoComplete="new-password"
                  required
                />
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none"
                  placeholder="Confirm password"
                  type="password"
                  value={signupForm.confirm}
                  onChange={e => setSignupForm({ ...signupForm, confirm: e.target.value })}
                  autoComplete="new-password"
                  required
                />
                {signupError && <div className="text-xs text-rose-600">{signupError}</div>}
                <button className="btn-primary w-full" type="submit" disabled={isSignupBusy}>
                  {isSignupBusy ? 'Creating account...' : 'Create user account'}
                </button>
              </form>
            )}
          </div>
        )}

        <div className="mt-6 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">Need access?</span> Hospitals and admins are created by system admins.
        </div>
        <Link to="/" className="mt-4 inline-flex text-xs font-semibold text-slate-600 hover:text-red-600">
          Back to landing
        </Link>
      </section>
    </div>
  )
}
