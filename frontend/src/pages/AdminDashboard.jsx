import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import { createHospital, getHospitals, inviteUser } from '../api'

export default function AdminDashboard() {
  const { user, role, token } = useAuth()
  const [hospitals, setHospitals] = useState([])
  const [hospitalForm, setHospitalForm] = useState({ name: '', email: '', phone: '', address: '' })
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '', hospitalId: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  if (!user) {
    return (
      <div className="panel p-8 max-w-xl mx-auto">
        <h2 className="text-2xl font-bold mb-2">Admin Access</h2>
        <p className="text-sm text-slate-500 mb-4">Please sign in from the login page.</p>
        <Link className="inline-block text-sm text-red-600" to="/login">Go to Login</Link>
      </div>
    )
  }
  if (role !== 'SUPER_ADMIN') {
    return (
      <div className="panel p-8 max-w-xl mx-auto">
        <h2 className="text-2xl font-bold mb-2">Not authorized</h2>
        <p className="text-sm text-slate-500">You do not have admin access.</p>
      </div>
    )
  }
  useEffect(() => {
    const load = async () => {
      try {
        const list = await getHospitals()
        setHospitals(list || [])
      } catch (err) {
        console.error(err)
      }
    }
    load()
  }, [])

  const submitHospital = async (e) => {
    e.preventDefault()
    setMessage('')
    setError('')
    if (!hospitalForm.name) return
    try {
      await createHospital(hospitalForm, token)
      setHospitalForm({ name: '', email: '', phone: '', address: '' })
      const list = await getHospitals()
      setHospitals(list || [])
      setMessage('Hospital created successfully.')
    } catch (err) {
      console.error(err)
      setError('Unable to create hospital.')
    }
  }

  const submitHospitalAdmin = async (e) => {
    e.preventDefault()
    setMessage('')
    setError('')
    if (!adminForm.email || !adminForm.password || !adminForm.hospitalId) return
    try {
      await inviteUser({
        name: adminForm.name.trim() || undefined,
        email: adminForm.email.trim(),
        password: adminForm.password,
        role: 'HOSPITAL_ADMIN',
        hospitalId: adminForm.hospitalId
      }, token)
      setAdminForm({ name: '', email: '', password: '', hospitalId: '' })
      setMessage('Hospital admin access created.')
    } catch (err) {
      console.error(err)
      setError('Unable to create hospital admin.')
    }
  }

  return (
    <div className="space-y-8">
      <section className="panel p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Admin Control</div>
            <h2 className="text-2xl font-bold mt-2">Hospital Network Panel</h2>
            <p className="text-sm text-slate-500">Create hospitals, assign access, and supervise operations.</p>
          </div>
          <div className="text-xs text-slate-500">{user ? user.email : 'Guest'}</div>
        </div>
        {(message || error) && (
          <div className="mt-4 text-sm">
            {message && <div className="text-emerald-600">{message}</div>}
            {error && <div className="text-rose-600">{error}</div>}
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="panel p-6">
          <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Create Hospital</div>
          <h3 className="text-lg font-semibold mt-2">Add a new hospital</h3>
          <form onSubmit={submitHospital} className="mt-4 grid gap-3 md:grid-cols-2">
            <input value={hospitalForm.name} onChange={e=>setHospitalForm({...hospitalForm, name: e.target.value})} placeholder="Hospital name" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none" />
            <input value={hospitalForm.email} onChange={e=>setHospitalForm({...hospitalForm, email: e.target.value})} placeholder="Email" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none" />
            <input value={hospitalForm.phone} onChange={e=>setHospitalForm({...hospitalForm, phone: e.target.value})} placeholder="Phone" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none" />
            <input value={hospitalForm.address} onChange={e=>setHospitalForm({...hospitalForm, address: e.target.value})} placeholder="Address" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none" />
            <div className="md:col-span-2">
              <button className="btn-primary" type="submit">Create hospital</button>
            </div>
          </form>
        </div>

        <div className="panel p-6">
          <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Access</div>
          <h3 className="text-lg font-semibold mt-2">Assign hospital admin</h3>
          <form onSubmit={submitHospitalAdmin} className="mt-4 space-y-3">
            <input value={adminForm.name} onChange={e=>setAdminForm({...adminForm, name: e.target.value})} placeholder="Full name (optional)" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none" />
            <input value={adminForm.email} onChange={e=>setAdminForm({...adminForm, email: e.target.value})} placeholder="Admin email" type="email" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none" />
            <input value={adminForm.password} onChange={e=>setAdminForm({...adminForm, password: e.target.value})} placeholder="Temporary password" type="password" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none" />
            <select value={adminForm.hospitalId} onChange={e=>setAdminForm({...adminForm, hospitalId: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none">
              <option value="">Select hospital</option>
              {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
            <button className="btn-primary w-full" type="submit">Create hospital admin</button>
          </form>
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Network</div>
            <h3 className="text-lg font-semibold mt-2">Hospitals onboarded</h3>
          </div>
          <span className="text-xs text-slate-500">Total: {hospitals.length}</span>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hospitals.length === 0 ? (
            <div className="text-sm text-slate-500">No hospitals yet.</div>
          ) : (
            hospitals.map(h => (
              <div key={h.id} className="panel p-4">
                <div className="text-sm font-semibold">{h.name}</div>
                <div className="text-xs text-slate-500 mt-1">{h.address || 'No address yet'}</div>
                <div className="text-xs text-slate-500">{h.phone || 'No phone'} • {h.email || 'No email'}</div>
              </div>
            ))
          )}
        </div>
        <div className="mt-4 text-xs text-slate-500">
          Need to manage users? Visit <Link className="text-red-600 font-semibold" to="/admin/users">user directory</Link>.
        </div>
      </section>
    </div>
  )
}
