import React, { useEffect, useMemo, useState } from 'react'
import { getFileUrl } from '../api'
import { useAuth } from '../context/AuthContext'

export default function Requests(){
  const [requests, setRequests] = useState([])
  const [hospitals, setHospitals] = useState([])
  const [form, setForm] = useState({ hospitalId: '', bloodType: '', quantity: '' })
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const { token, role, user } = useAuth()

  useEffect(()=>{ load() },[])

  useEffect(() => {
    if (user?.hospitalId) {
      setForm(prev => ({ ...prev, hospitalId: user.hospitalId }))
    }
  }, [user])

  const load = async ()=>{
    try {
      const list = await import('../api').then(m=>m.getRequests(token))
      setRequests(list || [])
      const h = await import('../api').then(m=>m.getHospitals())
      setHospitals(h || [])
    } catch (e) { console.error(e) }
  }

  const setStatus = async (id, status) => {
    try {
      await import('../api').then(m=>m.updateRequestStatus(id, status, token))
      load()
    } catch (e) { console.error(e) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this request?')) return
    try {
      await import('../api').then(m=>m.deleteRequest(id, token))
      load()
    } catch (e) { console.error(e) }
  }

  const create = async (e) => {
    e.preventDefault()
    if (!form.hospitalId || !form.bloodType || !form.quantity) return
    try {
      await import('../api').then(m=>m.createRequest(form, token))
      setForm({ hospitalId: user?.hospitalId || '', bloodType: '', quantity: '' })
      load()
    } catch (e) { console.error(e) }
  }

  const filteredRequests = useMemo(() => {
    if (statusFilter === 'ALL') return requests
    return requests.filter(r => r.status === statusFilter)
  }, [requests, statusFilter])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Requests</h2>
          <p className="text-sm text-slate-500">Create and manage blood requests.</p>
        </div>
        <span className="text-xs text-slate-500">Total: {filteredRequests.length}</span>
      </div>

      <div className="panel p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Request queue</div>
            <div className="text-xs text-slate-500">Track blood demand, volunteer donors, and status updates.</div>
          </div>
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All</option>
            <option value="PENDING">Pending</option>
            <option value="FULFILLED">Fulfilled</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {!token ? (
          <div className="text-sm text-slate-500">Login to create a request.</div>
        ) : (
          <form onSubmit={create} className="grid gap-3 md:grid-cols-3">
            {user?.hospitalId ? (
              <div className="w-full bg-slate-50 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 font-medium flex items-center">
                Hospital: {hospitals.find(h => h.id === user.hospitalId)?.name || 'Loading your hospital...'}
              </div>
            ) : (
              <select value={form.hospitalId} onChange={e=>setForm({...form,hospitalId:e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none" required>
                <option value="">Select hospital</option>
                {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            )}
            <input value={form.bloodType} onChange={e=>setForm({...form,bloodType:e.target.value})} placeholder="Blood type (A+, O-)" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none" required />
            <input value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})} placeholder="Units" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none" required />
            <div className="md:col-span-3">
              <button className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700" type="submit">Create request</button>
            </div>
          </form>
        )}
      </div>

      <div className="grid gap-4">
        {filteredRequests.length===0 ? <div className="text-sm text-slate-500">No requests</div> : (
          filteredRequests.map(r=> {
            const isOwnerOrAdmin = role === 'SUPER_ADMIN' || (role === 'HOSPITAL_ADMIN' && r.hospitalId === user?.hospitalId)
            const isStaffOrAdminOfHospital = role === 'SUPER_ADMIN' || ((role === 'HOSPITAL_ADMIN' || role === 'HOSPITAL_STAFF') && r.hospitalId === user?.hospitalId)
            const volunteers = r.interests || []
            
            return (
              <div key={r.id} className="panel p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{r.bloodType} — {r.quantity} units</div>
                    <div className="text-xs text-slate-500">Hospital: {r.hospital?.name || r.hospitalId}</div>
                    <div className="text-xs text-slate-500">Status: {r.status} • Volunteers: {r._count?.interests ?? volunteers.length}</div>
                  </div>
                  <div className="flex gap-2">
                    {isStaffOrAdminOfHospital && r.status === 'PENDING' && (
                      <>
                        <button className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs hover:bg-emerald-700" onClick={()=>setStatus(r.id, 'FULFILLED')}>Fulfill</button>
                        <button className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs hover:bg-rose-700" onClick={()=>setStatus(r.id, 'CANCELLED')}>Cancel</button>
                      </>
                    )}
                    {isOwnerOrAdmin && (
                      <button className="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs hover:bg-slate-800" onClick={()=>handleDelete(r.id)}>Delete</button>
                    )}
                  </div>
                </div>

                {isStaffOrAdminOfHospital && (
                  <div className="rounded-xl border border-slate-200 p-3">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Interested donors</div>
                    {volunteers.length === 0 ? (
                      <div className="text-sm text-slate-500 mt-2">No donors have volunteered yet.</div>
                    ) : (
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {volunteers.map((interest) => {
                          const donor = interest.donor || {}
                          const latestCheck = donor.eligibilityChecks?.[0]
                          const latestReport = latestCheck?.report || donor.medicalReports?.[0]
                          const upload = latestReport?.upload
                          return (
                            <div key={interest.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                              <div className="font-semibold">{donor.name || 'Donor'} ({donor.bloodType || '—'})</div>
                              <div className="text-xs text-slate-500">{donor.phone || 'No phone'} • {donor.email || 'No email'}</div>
                              <div className="text-xs text-slate-500">Eligibility: {latestCheck?.status || 'Pending review'}</div>
                              <div className="text-xs text-slate-500">DOB: {donor.dateOfBirth ? new Date(donor.dateOfBirth).toLocaleDateString() : '—'} • Parent: {donor.parentName || '—'}</div>
                              {upload?.id && (
                                <div className="mt-2">
                                  <a className="text-xs font-semibold text-red-600" href={getFileUrl(upload.id, token)} target="_blank" rel="noreferrer">
                                    View medical report
                                  </a>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
