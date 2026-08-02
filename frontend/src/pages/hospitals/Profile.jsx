import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getHospitalById, updateHospital } from '../../api'

export default function HospitalProfile() {
  const { user, token, role } = useAuth()
  const [hospital, setHospital] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' })
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const canEdit = role === 'HOSPITAL_ADMIN' || role === 'SUPER_ADMIN'

  const load = async () => {
    if (!user?.hospitalId) return
    setLoading(true)
    try {
      const data = await getHospitalById(user.hospitalId)
      setHospital(data)
      setForm({
        name: data?.name || '',
        email: data?.email || '',
        phone: data?.phone || '',
        address: data?.address || ''
      })
    } catch (err) {
      console.error(err)
      setError('Unable to load hospital profile.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [user?.hospitalId])

  const submit = async (e) => {
    e.preventDefault()
    if (!hospital) return
    setMessage('')
    setError('')
    try {
      const updated = await updateHospital(hospital.id, form, token)
      setHospital(updated)
      setMessage('Hospital profile updated.')
    } catch (err) {
      console.error(err)
      setError('Unable to update profile.')
    }
  }

  if (!user?.hospitalId) {
    return (
      <div className="panel p-6">
        <h2 className="text-2xl font-bold">Hospital Profile</h2>
        <p className="text-sm text-slate-500 mt-2">No hospital is linked to this account.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Hospital Profile</h2>
            <p className="text-sm text-slate-500">Manage hospital contact details and location.</p>
          </div>
          <div className="text-xs text-slate-500">{hospital?.name || 'Loading...'}</div>
        </div>
        {(message || error) && (
          <div className="mt-4 text-sm">
            {message && <div className="text-emerald-600">{message}</div>}
            {error && <div className="text-rose-600">{error}</div>}
          </div>
        )}
      </section>

      <section className="panel p-6">
        {loading ? (
          <div className="text-sm text-slate-500">Loading profile...</div>
        ) : (
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Hospital name"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none"
              disabled={!canEdit}
              required
            />
            <input
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="Email"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none"
              disabled={!canEdit}
            />
            <input
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              placeholder="Phone"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none"
              disabled={!canEdit}
            />
            <input
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
              placeholder="Address"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none"
              disabled={!canEdit}
            />
            {canEdit && (
              <div className="md:col-span-2">
                <button className="btn-primary" type="submit">Save changes</button>
              </div>
            )}
          </form>
        )}
      </section>
    </div>
  )
}
