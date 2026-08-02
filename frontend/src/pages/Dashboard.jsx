import React from 'react'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()
  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Dashboard</h2>
            <p className="text-sm text-slate-500">Overview and quick actions.</p>
          </div>
          <div className="text-xs text-slate-500">{user ? user.email : 'Guest'}</div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="panel p-4">
          <div className="text-xs text-slate-500">Status</div>
          <div className="text-lg font-semibold">Operational</div>
        </div>
        <div className="panel p-4">
          <div className="text-xs text-slate-500">Requests</div>
          <div className="text-lg font-semibold">Live</div>
        </div>
        <div className="panel p-4">
          <div className="text-xs text-slate-500">Uploads</div>
          <div className="text-lg font-semibold">Secure</div>
        </div>
      </section>
    </div>
  )
}
