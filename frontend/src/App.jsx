import React from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import Hospitals from './pages/Hospitals'
import Requests from './pages/Requests'
import AdminUsers from './pages/admin/Users'
import NotFound from './pages/NotFound'
import { useAuth } from './context/AuthContext'
import AdminDashboard from './pages/AdminDashboard'
import HospitalLanding from './pages/HospitalLanding'
import Login from './pages/Login'
import UserHome from './pages/user/Home'
import RequireRole from './routes/RequireRole'
import HospitalDashboard from './pages/hospitals/Dashboard'
import BloodBank from './pages/hospitals/BloodBank'
import HospitalStaff from './pages/hospitals/Staff'
import MedicalDashboard from './pages/user/MedicalDashboard'
import EligibilityReview from './pages/hospitals/EligibilityReview'
import HospitalProfile from './pages/hospitals/Profile'

export default function App() {
  const { user, role, logout, token, loading } = useAuth()
  return (
    <BrowserRouter>
      <div className="min-h-screen text-slate-900">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="page-shell py-3 flex items-center justify-between">
            <Link to="/" className="text-red-600 font-bold text-lg tracking-wide">Bloodate</Link>
            <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
              {(role === 'HOSPITAL_ADMIN' || role === 'HOSPITAL_STAFF') && (
                <>
                  <Link className="text-slate-600 hover:text-red-600" to="/hospitals/blood-bank">Blood Bank</Link>
                  <Link className="text-slate-600 hover:text-red-600" to="/hospitals/requests">Requests</Link>
                  <Link className="text-slate-600 hover:text-red-600" to="/hospitals/profile">Profile</Link>
                  {role === 'HOSPITAL_ADMIN' && <Link className="text-slate-600 hover:text-red-600" to="/hospitals/staff">Staff</Link>}
                </>
              )}
              {role === 'DONOR' && (
                <>
                  <Link className="text-slate-600 hover:text-red-600" to="/user">Registry</Link>
                  <Link className="text-slate-600 hover:text-red-600" to="/user/medical">Medical Reports</Link>
                </>
              )}
              {role === 'SUPER_ADMIN' && (
                <>
                  <Link className="text-slate-600 hover:text-red-600" to="/admin/dashboard">Admin</Link>
                  <Link className="text-slate-600 hover:text-red-600" to="/admin/users">Users</Link>
                  <Link className="text-slate-600 hover:text-red-600" to="/admin/eligibility">Eligibility</Link>
                </>
              )}
            </nav>
            <div className="flex items-center gap-3">
              {loading && <span className="text-xs text-slate-500">Loading...</span>}
              {user ? (
                <div className="flex items-center gap-2">
                  <span className="chip">{user.role}</span>
                  <span className="text-xs text-slate-600 hidden sm:block">{user.email}</span>
                  <button onClick={logout} className="px-3 py-1.5 rounded-md bg-slate-900 text-white text-xs hover:bg-slate-800">Logout</button>
                </div>
              ) : (
                <Link to="/login" className="btn-primary btn-sm">Login</Link>
              )}
            </div>
          </div>
        </header>

        <main className="page-shell py-8">
          <Routes>
            <Route path="/" element={<Home/>} />
            <Route path="/login" element={<Login/>} />
            <Route path="/user" element={
              <RequireRole role="DONOR" redirectTo="/login">
                <UserHome/>
              </RequireRole>
            } />
            <Route path="/user/medical" element={
              <RequireRole role="DONOR" redirectTo="/login">
                <MedicalDashboard/>
              </RequireRole>
            } />
            <Route path="/admin" element={
              <RequireRole role="SUPER_ADMIN" redirectTo="/login">
                <AdminDashboard/>
              </RequireRole>
            } />
            <Route path="/admin/dashboard" element={
              <RequireRole role="SUPER_ADMIN" redirectTo="/login">
                <AdminDashboard/>
              </RequireRole>
            } />
            <Route path="/admin/users" element={
              <RequireRole role="SUPER_ADMIN" redirectTo="/login">
                <AdminUsers/>
              </RequireRole>
            } />
            <Route path="/admin/hospitals" element={
              <RequireRole role="SUPER_ADMIN" redirectTo="/login">
                <Hospitals/>
              </RequireRole>
            } />
            <Route path="/hospitals" element={
              <RequireRole role={["HOSPITAL_ADMIN", "HOSPITAL_STAFF"]} redirectTo="/login">
                <HospitalLanding/>
              </RequireRole>
            } />
            <Route path="/hospitals/dashboard" element={
              <RequireRole role={["HOSPITAL_ADMIN", "HOSPITAL_STAFF"]} redirectTo="/login">
                <HospitalDashboard/>
              </RequireRole>
            } />
            <Route path="/hospitals/requests" element={
              <RequireRole role={["HOSPITAL_ADMIN", "HOSPITAL_STAFF"]} redirectTo="/login">
                <Requests/>
              </RequireRole>
            } />
            <Route path="/hospitals/blood-bank" element={
              <RequireRole role={["HOSPITAL_ADMIN", "HOSPITAL_STAFF"]} redirectTo="/login">
                <BloodBank/>
              </RequireRole>
            } />
            <Route path="/hospitals/profile" element={
              <RequireRole role={["HOSPITAL_ADMIN", "HOSPITAL_STAFF"]} redirectTo="/login">
                <HospitalProfile/>
              </RequireRole>
            } />
            <Route path="/hospitals/staff" element={
              <RequireRole role="HOSPITAL_ADMIN" redirectTo="/login">
                <HospitalStaff/>
              </RequireRole>
            } />
            <Route path="/admin/eligibility" element={
              <RequireRole role="SUPER_ADMIN" redirectTo="/login">
                <EligibilityReview/>
              </RequireRole>
            } />
            <Route path="*" element={<NotFound/>} />
          </Routes>
        </main>

        <footer className="border-t border-slate-200 bg-white">
          <div className="page-shell py-4 text-xs text-slate-500">
            Built for fast donor discovery, secure uploads, and hospital coordination.
          </div>
        </footer>
      </div>
    </BrowserRouter>
  )
}
