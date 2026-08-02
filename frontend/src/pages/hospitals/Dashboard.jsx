import React from 'react'
import { useAuth } from '../../context/AuthContext'
import { Link } from 'react-router-dom'

export default function HospitalDashboard() {
  const { user } = useAuth()
  const canManageStaff = user?.role === 'HOSPITAL_ADMIN'
  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Hospital Dashboard</h2>
            <p className="text-sm text-slate-500">Hospital-level overview and alerts.</p>
          </div>
          <div className="text-xs text-slate-500">{user ? user.email : 'Hospital'}</div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="panel p-4">
          <div className="text-xs text-slate-500">Blood Bank</div>
          <div className="text-lg font-semibold">Inventory</div>
          <Link className="inline-block mt-3 text-sm text-red-600" to="/hospitals/blood-bank">Open blood bank</Link>
        </div>
        <div className="panel p-4">
          <div className="text-xs text-slate-500">Requests</div>
          <div className="text-lg font-semibold">Active</div>
          <Link className="inline-block mt-3 text-sm text-red-600" to="/hospitals/requests">Open requests</Link>
        </div>
        <div className="panel p-4">
          <div className="text-xs text-slate-500">Profile</div>
          <div className="text-lg font-semibold">Hospital</div>
          <Link className="inline-block mt-3 text-sm text-red-600" to="/hospitals/profile">View profile</Link>
        </div>
      </section>

      {canManageStaff && (
        <section className="grid gap-4 md:grid-cols-2">
          <div className="panel p-4">
            <div className="text-xs text-slate-500">Staff</div>
            <div className="text-lg font-semibold">Hospital team</div>
            <Link className="inline-block mt-3 text-sm text-red-600" to="/hospitals/staff">Manage staff</Link>
          </div>
          <div className="panel p-4">
            <div className="text-xs text-slate-500">Donor Interest</div>
            <div className="text-lg font-semibold">Volunteers</div>
            <Link className="inline-block mt-3 text-sm text-red-600" to="/hospitals/requests">View interested donors</Link>
          </div>
        </section>
      )}
    </div>
  )
}
