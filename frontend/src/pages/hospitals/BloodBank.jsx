import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { createStock, listStock } from '../../api'

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export default function BloodBank() {
  const { user, token } = useAuth()
  const [stocks, setStocks] = useState([])
  const [form, setForm] = useState({ bloodType: 'A+', quantity: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    try {
      const list = await listStock(token)
      setStocks(list || [])
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const totals = useMemo(() => {
    const tally = {}
    BLOOD_TYPES.forEach(type => { tally[type] = 0 })
    stocks.forEach(item => {
      if (tally[item.bloodType] === undefined) tally[item.bloodType] = 0
      tally[item.bloodType] += Number(item.quantity || 0)
    })
    return tally
  }, [stocks])

  const totalUnits = useMemo(() => Object.values(totals).reduce((sum, value) => sum + value, 0), [totals])
  const maxUnits = useMemo(() => Math.max(1, ...Object.values(totals)), [totals])
  const hospitalName = stocks[0]?.hospital?.name || 'Your hospital'

  const submit = async (e) => {
    e.preventDefault()
    setMessage('')
    setError('')
    if (!form.quantity) return
    try {
      await createStock({
        hospitalId: user?.hospitalId,
        bloodType: form.bloodType,
        quantity: Number(form.quantity)
      }, token)
      setForm({ bloodType: form.bloodType, quantity: '' })
      await load()
      setMessage('Stock updated.')
    } catch (err) {
      console.error(err)
      setError('Unable to update stock.')
    }
  }

  return (
    <div className="space-y-8">
      <section className="panel p-6 blood-bank-hero">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="chip">Blood Bank</div>
            <h2 className="text-2xl font-bold mt-3">{hospitalName} inventory</h2>
            <p className="text-sm text-slate-500">Track blood availability and update incoming units.</p>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Total Units</div>
            <div className="text-2xl font-bold text-red-600">{totalUnits}</div>
          </div>
        </div>
        {(message || error) && (
          <div className="mt-4 text-sm">
            {message && <div className="text-emerald-600">{message}</div>}
            {error && <div className="text-rose-600">{error}</div>}
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          {BLOOD_TYPES.map(type => {
            const units = totals[type] || 0
            const fill = Math.min(100, Math.round((units / maxUnits) * 100))
            const level = units < maxUnits * 0.3 ? 'low' : units < maxUnits * 0.7 ? 'mid' : 'high'
            return (
              <div key={type} className="panel p-4 blood-card">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-semibold">{type}</div>
                  <div className="text-xs text-slate-500">Units</div>
                </div>
                <div className="text-2xl font-bold mt-2 text-red-600">{units}</div>
                <div className="blood-meter mt-3">
                  <span className="blood-meter-fill" data-level={level} style={{ width: `${fill}%` }} />
                </div>
              </div>
            )
          })}
        </div>

        <div className="panel p-6">
          <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Update</div>
          <h3 className="text-lg font-semibold mt-2">Log new stock</h3>
          <form onSubmit={submit} className="mt-4 space-y-3">
            <select value={form.bloodType} onChange={e=>setForm({ ...form, bloodType: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none">
              {BLOOD_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
            <input value={form.quantity} onChange={e=>setForm({ ...form, quantity: e.target.value })} placeholder="Units received" type="number" min="1" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none" />
            <button className="btn-primary w-full" type="submit">Add units</button>
          </form>

          <div className="mt-6">
            <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Notes</div>
            <ul className="mt-2 space-y-2 text-xs text-slate-500">
              <li>Inventory is shared across hospital staff accounts.</li>
              <li>Use this panel after each donation or blood transfer.</li>
              <li>Low stock levels highlight the smallest groups.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
