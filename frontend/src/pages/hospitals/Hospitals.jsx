import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function Hospitals() {
  const [hospitals, setHospitals] = useState([])
  const [form, setForm] = useState({ name: '', address: '', phone: '', email: '' })
  const { token, role } = useAuth()
  useEffect(()=>{ load() },[])
  const load = async ()=>{
    const list = await import('../../api').then(m=>m.getHospitals())
    setHospitals(list || [])
  }
  const add = async (e)=>{
    e.preventDefault()
    if (!form.name) return
    try {
      await import('../../api').then(m=>m.createHospital(form, token))
      setForm({ name: '', address: '', phone: '', email: '' })
      load()
    } catch (err) { console.error(err) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Hospitals</h2>
          <p className="text-sm text-slate-500">Manage hospitals and contact details.</p>
        </div>
        <span className="text-xs text-slate-500">Total: {hospitals.length}</span>
      </div>

      <div className="panel p-6">
        {role !== 'SUPER_ADMIN' ? (
          <div className="text-sm text-slate-500">Login as admin to add hospitals.</div>
        ) : (
          <form onSubmit={add} className="grid gap-3 md:grid-cols-2">
            <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Hospital name" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none" />
            <input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="Email" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none" />
            <input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Phone" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none" />
            <input value={form.address} onChange={e=>setForm({...form,address:e.target.value})} placeholder="Address" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none" />
            <div className="md:col-span-2">
              <button className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700" type="submit">Add hospital</button>
            </div>
          </form>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {hospitals.length===0 ? <div className="text-sm text-slate-500">No hospitals yet.</div> : (
          hospitals.map(h=> (
            <div key={h.id} className="panel p-4">
              <div className="font-semibold text-sm">{h.name}</div>
              <div className="text-xs text-slate-500 mt-1">{h.address || 'No address yet'}</div>
              <div className="text-xs text-slate-500">{h.phone || 'No phone'} • {h.email || 'No email'}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
