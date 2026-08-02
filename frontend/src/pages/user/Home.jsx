import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { createRequestInterest, getHospitals, getMyDonorProfile, getRequests, updateMyDonorProfile } from '../../api'
import { useAuth } from '../../context/AuthContext'

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const formatDate = (value) => {
  if (!value) return '—'
  try { return new Date(value).toLocaleDateString() } catch (e) { return value }
}

export default function Home() {
  const { user, token } = useAuth()
  const [profile, setProfile] = useState(null)
  const [hospitals, setHospitals] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [profileOpen, setProfileOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    dateOfBirth: '',
    parentName: '',
    phone: '',
    bloodType: 'O+',
    gender: 'Male',
    weight: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    emergencyContactName: '',
    emergencyContactPhone: ''
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    if (!token) return
    setLoading(true)
    try {
      const [profileData, hospitalData, requestData] = await Promise.all([
        getMyDonorProfile(token),
        getHospitals(),
        getRequests(token)
      ])
      setProfile(profileData)
      setHospitals(hospitalData || [])
      setRequests(requestData || [])
      if (profileData) {
        setForm({
          name: profileData.name || '',
          dateOfBirth: profileData.dateOfBirth ? profileData.dateOfBirth.split('T')[0] : '',
          parentName: profileData.parentName || '',
          phone: profileData.phone || '',
          bloodType: profileData.bloodType || 'O+',
          gender: profileData.gender || 'Male',
          weight: profileData.weight || '',
          address: profileData.address || '',
          city: profileData.city || '',
          state: profileData.state || '',
          zip: profileData.zip || '',
          emergencyContactName: profileData.emergencyContactName || '',
          emergencyContactPhone: profileData.emergencyContactPhone || ''
        })
      }
    } catch (err) {
      console.error(err)
      setError('Unable to load your dashboard data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [token])

  const pendingRequests = useMemo(() => {
    return (requests || []).filter(r => r.status === 'PENDING')
  }, [requests])

  const handleShare = async (req) => {
    const hospitalName = req.hospital?.name || 'a partner hospital'
    const text = `Urgent ${req.bloodType} blood needed at ${hospitalName}. Share with anyone who can help.`
    const url = window.location.origin

    try {
      if (navigator.share) {
        await navigator.share({ title: 'Bloodate Emergency Request', text, url })
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${text} ${url}`)
        setMessage('Share link copied to clipboard.')
      } else {
        window.prompt('Copy this request link', `${text} ${url}`)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleVolunteer = async (req) => {
    if (!token) return
    setMessage('')
    setError('')
    try {
      await createRequestInterest(req.id, {}, token)
      setRequests(prev => prev.map(item => (
        item.id === req.id
          ? { ...item, userInterested: true, _count: { ...item._count, interests: (item._count?.interests || 0) + 1 } }
          : item
      )))
      setMessage('Thanks! The hospital can now view your donor profile.')
    } catch (err) {
      console.error(err)
      setError('Unable to register your interest right now.')
    }
  }

  const saveProfile = async (e) => {
    e.preventDefault()
    setMessage('')
    setError('')
    try {
      const updated = await updateMyDonorProfile(form, token)
      setProfile(updated)
      setProfileOpen(false)
      setMessage('Profile updated successfully.')
    } catch (err) {
      console.error(err)
      setError('Unable to update your profile.')
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-gradient-to-br from-red-600 to-rose-500 text-white p-8 shadow-lg">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h1 className="text-3xl font-bold mb-2">Welcome back{profile?.name ? `, ${profile.name}` : ''}</h1>
            <p className="text-white/90 max-w-xl">Stay ready for urgent blood needs, track your eligibility, and respond to hospital requests.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs">Verified donor profile</span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs">Real-time hospital needs</span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs">Secure medical uploads</span>
            </div>
          </div>
          <div className="rounded-2xl bg-white/10 p-4 border border-white/20">
            <div className="text-sm text-white/80">Eligibility center</div>
            <div className="text-lg font-semibold">Keep reports updated</div>
            <div className="text-xs text-white/70 mt-2">Upload medical reports so hospitals can review your readiness.</div>
            <Link className="inline-block mt-3 text-xs bg-white text-rose-600 font-bold px-3 py-1.5 rounded-full hover:bg-rose-50 transition" to="/user/medical">Check eligibility &rarr;</Link>
          </div>
        </div>
      </section>

      {(message || error) && (
        <div className="panel p-4 text-sm">
          {message && <div className="text-emerald-600">{message}</div>}
          {error && <div className="text-rose-600">{error}</div>}
        </div>
      )}

      <section className="panel p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Your profile</h3>
            <p className="text-sm text-slate-500">Review your donor details and update them when needed.</p>
          </div>
          <button className="btn-primary btn-sm" type="button" onClick={() => setProfileOpen(true)} disabled={!profile}>
            {profile ? 'Edit profile' : 'Profile missing'}
          </button>
        </div>
        {loading ? (
          <div className="mt-4 text-sm text-slate-500">Loading profile...</div>
        ) : profile ? (
          <div className="mt-4 grid gap-3 md:grid-cols-3 text-sm">
            <div className="panel p-4">
              <div className="text-xs text-slate-400 uppercase tracking-[0.2em]">Identity</div>
              <div className="font-semibold mt-1">{profile.name}</div>
              <div className="text-xs text-slate-500">DOB: {formatDate(profile.dateOfBirth)}</div>
              <div className="text-xs text-slate-500">Parent: {profile.parentName || '—'}</div>
            </div>
            <div className="panel p-4">
              <div className="text-xs text-slate-400 uppercase tracking-[0.2em]">Contact</div>
              <div className="font-semibold mt-1">{profile.phone || '—'}</div>
              <div className="text-xs text-slate-500">{user?.email}</div>
              <div className="text-xs text-slate-500">Emergency: {profile.emergencyContactPhone || '—'}</div>
            </div>
            <div className="panel p-4">
              <div className="text-xs text-slate-400 uppercase tracking-[0.2em]">Health</div>
              <div className="font-semibold mt-1">{profile.bloodType || '—'} • {profile.gender || '—'}</div>
              <div className="text-xs text-slate-500">Weight: {profile.weight || '—'} kg</div>
              <div className="text-xs text-slate-500">City: {profile.city || '—'}</div>
            </div>
          </div>
        ) : (
          <div className="mt-4 text-sm text-slate-500">Profile not found. Please complete your donor profile.</div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Partner hospitals</h3>
          <span className="text-xs text-slate-500">Total: {hospitals.length}</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hospitals.length === 0 ? (
            <div className="text-sm text-slate-500">No hospitals onboarded yet.</div>
          ) : hospitals.map(h => (
            <div className="panel p-4" key={h.id}>
              <div className="text-sm font-semibold">{h.name}</div>
              <div className="text-xs text-slate-500 mt-1">{h.address || 'No address listed'}</div>
              <div className="text-xs text-slate-500">{h.phone || 'No phone'} • {h.email || 'No email'}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Emergency blood requests</h3>
          <span className="text-xs text-slate-500">Active: {pendingRequests.length}</span>
        </div>
        <div className="grid gap-4">
          {pendingRequests.length === 0 ? (
            <div className="text-sm text-slate-500">No emergency requests right now.</div>
          ) : pendingRequests.map(req => (
            <div className="panel p-4" key={req.id}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{req.bloodType} — {req.quantity} units</div>
                  <div className="text-xs text-slate-500">Hospital: {req.hospital?.name || 'Unknown'} • {formatDate(req.createdAt)}</div>
                  <div className="text-xs text-slate-500">Volunteers: {req._count?.interests ?? 0}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 hover:bg-slate-50" type="button" onClick={() => handleShare(req)}>
                    Share request
                  </button>
                  <button
                    className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-60"
                    type="button"
                    onClick={() => handleVolunteer(req)}
                    disabled={req.userInterested}
                  >
                    {req.userInterested ? 'Interest sent' : 'I can donate'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {profileOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/60 flex items-center justify-center p-4" onClick={() => setProfileOpen(false)}>
          <div className="panel p-6 w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Update donor profile</h3>
              <button className="text-slate-500" type="button" onClick={() => setProfileOpen(false)}>Close</button>
            </div>
            <form onSubmit={saveProfile} className="grid gap-3 md:grid-cols-2">
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" type="date" value={form.dateOfBirth} onChange={e => setForm({ ...form, dateOfBirth: e.target.value })} required />
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Parent/Guardian name" value={form.parentName} onChange={e => setForm({ ...form, parentName: e.target.value })} required />
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required />
              <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={form.bloodType} onChange={e => setForm({ ...form, bloodType: e.target.value })}>
                {BLOOD_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
              <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Weight (kg)" type="number" min="30" max="250" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} />
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="State" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} />
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="ZIP" value={form.zip} onChange={e => setForm({ ...form, zip: e.target.value })} />
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Emergency contact name" value={form.emergencyContactName} onChange={e => setForm({ ...form, emergencyContactName: e.target.value })} />
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Emergency contact phone" value={form.emergencyContactPhone} onChange={e => setForm({ ...form, emergencyContactPhone: e.target.value })} />
              <div className="md:col-span-2 flex justify-end gap-2">
                <button className="px-4 py-2 rounded-lg border border-slate-200 text-sm" type="button" onClick={() => setProfileOpen(false)}>Cancel</button>
                <button className="btn-primary" type="submit">Save profile</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
