import React from 'react'
import { useAuth } from '../../context/AuthContext'

export default function AdminDashboard() {
  const { user } = useAuth()
  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Admin Dashboard</h2>
            <p className="text-sm text-slate-500">High level system metrics.</p>
          </div>
          <div className="text-xs text-slate-500">{user ? user.email : 'Admin'}</div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="panel p-4">
          <div className="text-xs text-slate-500">Users</div>
          <div className="text-lg font-semibold">Active</div>
        </div>
        <div className="panel p-4">
          <div className="text-xs text-slate-500">Hospitals</div>
          <div className="text-lg font-semibold">Connected</div>
        </div>
        <div className="panel p-4">
          <div className="text-xs text-slate-500">Requests</div>
          <div className="text-lg font-semibold">Monitored</div>
        </div>
      </section>
    </div>
  )
}
