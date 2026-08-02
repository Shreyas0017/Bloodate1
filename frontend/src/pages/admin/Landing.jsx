import React from 'react'
import { Link } from 'react-router-dom'

export default function AdminLanding() {
  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <h2 className="text-2xl font-bold">Admin Landing</h2>
        <p className="text-sm text-slate-500">System controls, reports, and user management.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="panel p-4">
          <div className="text-xs text-slate-500">Admin Dashboard</div>
          <div className="text-lg font-semibold">Overview</div>
          <Link className="inline-block mt-3 text-sm text-red-600" to="/admin/dashboard">Open dashboard</Link>
        </div>
        <div className="panel p-4">
          <div className="text-xs text-slate-500">Users</div>
          <div className="text-lg font-semibold">Access control</div>
          <Link className="inline-block mt-3 text-sm text-red-600" to="/admin/users">Open users</Link>
        </div>
        <div className="panel p-4">
          <div className="text-xs text-slate-500">Hospital data</div>
          <div className="text-lg font-semibold">Network monitoring</div>
          <Link className="inline-block mt-3 text-sm text-red-600" to="/admin/hospitals">Open hospitals</Link>
        </div>
      </section>
    </div>
  )
}
