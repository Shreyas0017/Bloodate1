import React from 'react'
import { Link } from 'react-router-dom'

export default function HospitalLanding() {
  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <h2 className="text-2xl font-bold">Hospital Portal</h2>
        <p className="text-sm text-slate-500">Manage requests, blood bank inventory, and uploads from one place.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="panel p-5">
          <h3 className="text-lg font-semibold">Blood Bank</h3>
          <p className="text-sm text-slate-500">Track inventory and log incoming units.</p>
          <Link className="inline-block mt-3 text-sm text-red-600" to="/hospitals/blood-bank">Open blood bank</Link>
        </div>
        <div className="panel p-5">
          <h3 className="text-lg font-semibold">Requests</h3>
          <p className="text-sm text-slate-500">Create and fulfill blood requests.</p>
          <Link className="inline-block mt-3 text-sm text-red-600" to="/hospitals/requests">Open requests</Link>
        </div>
        <div className="panel p-5">
          <h3 className="text-lg font-semibold">Profile</h3>
          <p className="text-sm text-slate-500">Manage hospital contact details.</p>
          <Link className="inline-block mt-3 text-sm text-red-600" to="/hospitals/profile">Open profile</Link>
        </div>
        <div className="panel p-5">
          <h3 className="text-lg font-semibold">Dashboard</h3>
          <p className="text-sm text-slate-500">Quick hospital insights.</p>
          <Link className="inline-block mt-3 text-sm text-red-600" to="/hospitals/dashboard">Open dashboard</Link>
        </div>
      </section>
    </div>
  )
}
