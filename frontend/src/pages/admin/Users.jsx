import React, { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { listUsersOrganized, deleteUser } from '../../api'

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmt(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function age(dob) {
  if (!dob) return null
  const d = new Date(dob)
  return Math.floor((Date.now() - d) / 31557600000)
}
function initials(name, email) {
  const src = name || email || '?'
  return src.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

// ─── role badge ───────────────────────────────────────────────────────────────
const ROLE_CONFIG = {
  SUPER_ADMIN:    { label: 'Super Admin',    bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', icon: '🛡️' },
  HOSPITAL_ADMIN: { label: 'Hospital Admin', bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6', icon: '🏥' },
  HOSPITAL_STAFF: { label: 'Hospital Staff', bg: 'rgba(16,185,129,0.12)', color: '#10b981', icon: '👨‍⚕️' },
  DONOR:          { label: 'Donor',           bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', icon: '🩸' },
}

function RoleBadge({ role }) {
  const cfg = ROLE_CONFIG[role] || { label: role, bg: '#eee', color: '#333', icon: '👤' }
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
      letterSpacing: 0.3, display: 'inline-flex', alignItems: 'center', gap: 4
    }}>
      <span>{cfg.icon}</span> {cfg.label}
    </span>
  )
}

// ─── avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, email, role, size = 38 }) {
  const cfg = ROLE_CONFIG[role] || { bg: '#eee', color: '#555' }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: cfg.bg, color: cfg.color, border: `2px solid ${cfg.color}33`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, flexShrink: 0
    }}>
      {initials(name, email)}
    </div>
  )
}

// ─── User Detail Modal ────────────────────────────────────────────────────────
function UserModal({ user, onClose, onDelete }) {
  if (!user) return null
  const d = user.donor

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 20, width: '100%', maxWidth: 560,
          maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
          animation: 'slideUp 0.25s ease'
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4c1d95 100%)',
          borderRadius: '20px 20px 0 0', padding: '28px 28px 24px',
          position: 'relative', color: '#fff'
        }}>
          <button onClick={onClose} style={{
            position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)',
            border: 'none', color: '#fff', width: 32, height: 32, borderRadius: 8,
            cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>×</button>

          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)', border: '3px solid rgba(255,255,255,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 700, color: '#fff', flexShrink: 0
            }}>
              {initials(user.name || d?.name, user.email)}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{user.name || d?.name || 'Unnamed User'}</div>
              <div style={{ fontSize: 13, opacity: 0.75, marginTop: 2 }}>{user.email}</div>
              <div style={{ marginTop: 8 }}><RoleBadge role={user.role} /></div>
            </div>
          </div>

          {d?.bloodType && (
            <div style={{
              position: 'absolute', top: 20, right: 60,
              background: '#ef4444', color: '#fff', borderRadius: 10, padding: '4px 12px',
              fontSize: 16, fontWeight: 800, letterSpacing: 1
            }}>
              {d.bloodType}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px' }}>
          {/* Account section */}
          <Section title="Account" icon="👤">
            <Row label="User ID" value={<code style={{ fontSize: 11, background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{user.id}</code>} />
            <Row label="Joined" value={fmt(user.createdAt)} />
            {user.hospital && <Row label="Hospital" value={user.hospital.name} />}
          </Section>

          {/* Donor profile */}
          {d && (
            <Section title="Donor Profile" icon="🩸">
              {d.name && <Row label="Full Name" value={d.name} />}
              {d.gender && <Row label="Gender" value={d.gender} />}
              {d.dateOfBirth && <Row label="Date of Birth" value={`${fmt(d.dateOfBirth)} (${age(d.dateOfBirth)} yrs)`} />}
              {d.phone && <Row label="Phone" value={d.phone} />}
              {d.weight && <Row label="Weight" value={`${d.weight} kg`} />}
              {d.bloodType && <Row label="Blood Type" value={<span style={{ color: '#ef4444', fontWeight: 700 }}>{d.bloodType}</span>} />}
              {d.lastDonation && <Row label="Last Donation" value={fmt(d.lastDonation)} />}
              {(d.address || d.city || d.state) && (
                <Row label="Address" value={[d.address, d.city, d.state, d.zip].filter(Boolean).join(', ')} />
              )}
              {d.parentName && <Row label="Parent Name" value={d.parentName} />}
              {d.emergencyContactName && <Row label="Emergency Contact" value={`${d.emergencyContactName}${d.emergencyContactPhone ? ' — ' + d.emergencyContactPhone : ''}`} />}
            </Section>
          )}

          {/* Delete */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={onClose} style={{
              background: 'none', color: '#6b7280', border: '1px solid #e5e7eb',
              padding: '8px 20px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13
            }}>Close</button>
            <button onClick={() => onDelete(user.id)} style={{
              background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca',
              padding: '8px 20px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13
            }}>Delete User</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, icon, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{icon}</span> {title}
      </div>
      <div style={{ background: '#f9fafb', borderRadius: 12, overflow: 'hidden', border: '1px solid #f3f4f6' }}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', padding: '10px 14px', borderBottom: '1px solid #f3f4f6', gap: 8 }}>
      <div style={{ width: 140, flexShrink: 0, fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#1f2937', fontWeight: 500 }}>{value}</div>
    </div>
  )
}

// ─── User Row Card (compact) ──────────────────────────────────────────────────
function UserRow({ user, onClick }) {
  return (
    <div
      onClick={() => onClick(user)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', cursor: 'pointer', borderRadius: 12,
        transition: 'background 0.15s', background: 'transparent'
      }}
      onMouseEnter={e => e.currentTarget.style.background = '#f8faff'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <Avatar name={user.name || user.donor?.name} email={user.email} role={user.role} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {user.name || user.donor?.name || 'Unnamed'}
        </div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {user.email}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        {user.donor?.bloodType && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', background: '#fef2f2', padding: '1px 7px', borderRadius: 99 }}>
            {user.donor.bloodType}
          </span>
        )}
        <span style={{ fontSize: 11, color: '#9ca3af' }}>{fmt(user.createdAt)}</span>
      </div>
      <div style={{ color: '#d1d5db', fontSize: 16 }}>›</div>
    </div>
  )
}

// ─── Collapsible Group ────────────────────────────────────────────────────────
function Group({ title, icon, color, count, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden', border: '1px solid #f3f4f6' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer',
          borderBottom: open ? '1px solid #f3f4f6' : 'none', textAlign: 'left'
        }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: 12, background: color + '18',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0
        }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{title}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            background: color + '18', color: color, fontWeight: 700,
            fontSize: 13, padding: '2px 12px', borderRadius: 99
          }}>{count}</span>
          <span style={{ color: '#9ca3af', fontSize: 18, transition: 'transform 0.2s', display: 'block', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
        </div>
      </button>
      {open && <div>{children}</div>}
    </div>
  )
}

// ─── Hospital Group (nested) ──────────────────────────────────────────────────
function HospitalGroup({ hospital, onUserClick }) {
  const [open, setOpen] = useState(false)
  const total = hospital.admins.length + hospital.staff.length

  return (
    <div style={{ border: '1px solid #f3f4f6', borderRadius: 12, margin: '8px 12px', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px', background: open ? '#f8faff' : '#fafafa',
          border: 'none', cursor: 'pointer', textAlign: 'left',
          borderBottom: open ? '1px solid #e5e7eb' : 'none'
        }}
      >
        <div style={{
          width: 34, height: 34, borderRadius: 10, background: 'rgba(59,130,246,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0
        }}>🏥</div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1e3a8a' }}>{hospital.name}</div>
          {hospital.address && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{hospital.address}</div>}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {hospital.admins.length > 0 && (
            <span style={{ fontSize: 11, background: 'rgba(59,130,246,0.12)', color: '#3b82f6', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>
              {hospital.admins.length} admin{hospital.admins.length !== 1 ? 's' : ''}
            </span>
          )}
          {hospital.staff.length > 0 && (
            <span style={{ fontSize: 11, background: 'rgba(16,185,129,0.12)', color: '#10b981', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>
              {hospital.staff.length} staff
            </span>
          )}
          {total === 0 && <span style={{ fontSize: 11, color: '#9ca3af' }}>No users</span>}
          <span style={{ color: '#9ca3af', fontSize: 16, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
        </div>
      </button>

      {open && (
        <div>
          {hospital.admins.length > 0 && (
            <div>
              <div style={{ padding: '8px 16px 4px', fontSize: 11, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Admins
              </div>
              {hospital.admins.map(u => <UserRow key={u.id} user={u} onClick={onUserClick} />)}
            </div>
          )}
          {hospital.staff.length > 0 && (
            <div>
              <div style={{ padding: '8px 16px 4px', fontSize: 11, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: 0.8, borderTop: hospital.admins.length > 0 ? '1px solid #f3f4f6' : 'none' }}>
                Staff
              </div>
              {hospital.staff.map(u => <UserRow key={u.id} user={u} onClick={onUserClick} />)}
            </div>
          )}
          {total === 0 && (
            <div style={{ padding: '20px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              No users assigned to this hospital
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminUsers() {
  const { token } = useAuth()
  const [data, setData] = useState({ superAdmins: [], hospitals: [], donors: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await listUsersOrganized(token)
      setData(result)
    } catch (e) {
      console.error('[AdminUsers] load failed:', e)
      setError(`Failed to load users: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return
    try {
      await deleteUser(id, token)
      setSelected(null)
      load()
    } catch (e) {
      alert('Failed to delete user.')
    }
  }

  // filter helpers
  const q = search.toLowerCase().trim()
  const filterUsers = (arr) => !q ? arr : arr.filter(u =>
    (u.name || '').toLowerCase().includes(q) ||
    (u.email || '').toLowerCase().includes(q) ||
    (u.donor?.name || '').toLowerCase().includes(q) ||
    (u.donor?.bloodType || '').toLowerCase().includes(q)
  )
  const filterHospitals = (arr) => !q ? arr : arr.map(h => ({
    ...h,
    admins: filterUsers(h.admins),
    staff: filterUsers(h.staff)
  })).filter(h =>
    h.name.toLowerCase().includes(q) ||
    h.admins.length > 0 || h.staff.length > 0
  )

  const filteredSuperAdmins = filterUsers(data.superAdmins)
  const filteredHospitals = filterHospitals(data.hospitals)
  const filteredDonors = filterUsers(data.donors)
  const totalUsers = data.superAdmins.length +
    data.hospitals.reduce((s, h) => s + h.admins.length + h.staff.length, 0) +
    data.donors.length

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', 'Space Grotesk', Arial, sans-serif" }}>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      {/* Page header */}
      <div style={{ marginBottom: 28, animation: 'fadeIn 0.3s ease' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#111827', letterSpacing: -0.5 }}>
              User Management
            </h1>
            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
              {loading ? 'Loading…' : `${totalUsers} total users across all roles`}
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            style={{
              background: loading ? '#f3f4f6' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
              color: loading ? '#9ca3af' : '#fff', border: 'none',
              padding: '10px 20px', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            {loading ? '⏳ Loading…' : '↻ Refresh'}
          </button>
        </div>

        {/* Stats strip */}
        {!loading && (
          <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Super Admins', count: data.superAdmins.length, color: '#ef4444', icon: '🛡️' },
              { label: 'Hospitals', count: data.hospitals.length, color: '#3b82f6', icon: '🏥' },
              { label: 'Hospital Users', count: data.hospitals.reduce((s,h)=>s+h.admins.length+h.staff.length,0), color: '#10b981', icon: '👨‍⚕️' },
              { label: 'Donors', count: data.donors.length, color: '#f59e0b', icon: '🩸' },
            ].map(s => (
              <div key={s.label} style={{
                background: '#fff', border: '1px solid #f3f4f6', borderRadius: 14,
                padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12,
                boxShadow: '0 1px 6px rgba(0,0,0,0.05)', flex: '1 1 150px'
              }}>
                <div style={{ fontSize: 22 }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.count}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, fontWeight: 500 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div style={{ marginTop: 16, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 16 }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or blood type…"
            style={{
              width: '100%', padding: '11px 14px 11px 40px', borderRadius: 12,
              border: '1px solid #e5e7eb', fontSize: 14, background: '#fff',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)', outline: 'none',
              fontFamily: 'inherit', boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', padding: '14px 18px', borderRadius: 12, marginBottom: 20, fontSize: 14 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background: '#fff', borderRadius: 16, height: 72, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', animation: 'pulse 1.5s ease-in-out infinite', opacity: 0.7 }} />
          ))}
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.4s ease' }}>

          {/* ── Super Admins ── */}
          <Group
            title="Super Admins"
            icon="🛡️"
            color="#ef4444"
            count={filteredSuperAdmins.length}
            defaultOpen={true}
          >
            {filteredSuperAdmins.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No super admins found</div>
            ) : (
              filteredSuperAdmins.map(u => <UserRow key={u.id} user={u} onClick={setSelected} />)
            )}
          </Group>

          {/* ── Hospitals ── */}
          <Group
            title="Hospitals & Their Users"
            icon="🏥"
            color="#3b82f6"
            count={filteredHospitals.length + ' hospitals'}
            defaultOpen={true}
          >
            {filteredHospitals.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No hospitals found</div>
            ) : (
              <div style={{ paddingBottom: 12 }}>
                {filteredHospitals.map(h => (
                  <HospitalGroup key={h.id} hospital={h} onUserClick={setSelected} />
                ))}
              </div>
            )}
          </Group>

          {/* ── Donors ── */}
          <Group
            title="Donors / Public Users"
            icon="🩸"
            color="#f59e0b"
            count={filteredDonors.length}
            defaultOpen={false}
          >
            {filteredDonors.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No donors found</div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              }}>
                {filteredDonors.map(u => (
                  <div key={u.id} style={{ borderRight: '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6' }}>
                    <UserRow user={u} onClick={setSelected} />
                  </div>
                ))}
              </div>
            )}
          </Group>
        </div>
      )}

      {/* Modal */}
      <UserModal user={selected} onClose={() => setSelected(null)} onDelete={handleDelete} />
    </div>
  )
}
