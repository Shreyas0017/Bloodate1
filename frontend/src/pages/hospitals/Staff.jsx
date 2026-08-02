import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { inviteUser, listHospitalUsers } from '../../api'

export default function HospitalStaff() {
  const { token } = useAuth()
  const [staff, setStaff] = useState([])
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    try {
      const list = await listHospitalUsers(token)
      setStaff(list || [])
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setMessage('')
    setError('')
    if (!form.email || !form.password) return
    try {
      await inviteUser({
        name: form.name.trim() || undefined,
        email: form.email.trim(),
        password: form.password,
        role: 'HOSPITAL_STAFF'
      }, token)
      setForm({ name: '', email: '', password: '' })
      await load()
      setMessage('Staff account created.')
    } catch (err) {
      console.error(err)
      setError('Unable to create staff account.')
    }
  }

  const remove = async (id) => {
    if (!window.confirm('Are you sure you want to remove this staff member?')) return
    try {
      const { deleteUser } = await import('../../api')
      await deleteUser(id, token)
      load()
    } catch (e) { console.error(e) }
  }

  const admins = staff.filter(member => member.role === 'HOSPITAL_ADMIN')
  const members = staff.filter(member => member.role === 'HOSPITAL_STAFF')

  return (
    <div className="space-y-8">
      <section className="panel p-6">
        <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Hospital Team</div>
        <h2 className="text-2xl font-bold mt-2">Staff management</h2>
        <p className="text-sm text-slate-500">Invite staff who handle blood donation work.</p>
        {(message || error) && (
          <div className="mt-4 text-sm">
            {message && <div className="text-emerald-600">{message}</div>}
            {error && <div className="text-rose-600">{error}</div>}
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="panel p-6">
          <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Invite</div>
          <h3 className="text-lg font-semibold mt-2">Add staff member</h3>
          <form onSubmit={submit} className="mt-4 space-y-3">
            <input value={form.name} onChange={e=>setForm({ ...form, name: e.target.value })} placeholder="Full name (optional)" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none" />
            <input value={form.email} onChange={e=>setForm({ ...form, email: e.target.value })} placeholder="Staff email" type="email" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none" />
            <input value={form.password} onChange={e=>setForm({ ...form, password: e.target.value })} placeholder="Temporary password" type="password" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none" />
            <button className="btn-primary w-full" type="submit">Create staff account</button>
          </form>
        </div>

        <div className="panel p-6">
          <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Overview</div>
          <h3 className="text-lg font-semibold mt-2">Team directory</h3>
          <div className="mt-4 space-y-4">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-[0.2em]">Hospital admins</div>
              {admins.length === 0 ? (
                <div className="text-sm text-slate-500 mt-2">No admins listed.</div>
              ) : (
                <div className="mt-2 space-y-2">
                  {admins.map(member => (
                    <div key={member.id} className="panel p-3">
                      <div className="text-sm font-semibold">{member.name || 'Admin user'}</div>
                      <div className="text-xs text-slate-500">{member.email}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-[0.2em]">Hospital staff</div>
              {members.length === 0 ? (
                <div className="text-sm text-slate-500 mt-2">No staff yet.</div>
              ) : (
                <div className="mt-2 space-y-2">
                  {members.map(member => (
                    <div key={member.id} className="panel p-3 flex justify-between items-start">
                      <div>
                        <div className="text-sm font-semibold">{member.name || 'Staff member'}</div>
                        <div className="text-xs text-slate-500">{member.email}</div>
                      </div>
                      <button className="text-xs text-rose-600 hover:underline" onClick={() => remove(member.id)}>Delete</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
