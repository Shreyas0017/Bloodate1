import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getPendingReviews, getAllEligibilityChecks, reviewEligibility, getFileUrl } from '../../api'

const STATUS_COLORS = {
  ELIGIBLE: '#059669',
  TEMPORARILY_INELIGIBLE: '#d97706',
  PERMANENTLY_INELIGIBLE: '#dc2626',
  PENDING_REVIEW: '#2563eb',
}
const STATUS_LABELS = {
  ELIGIBLE: 'Eligible',
  TEMPORARILY_INELIGIBLE: 'Temporarily Ineligible',
  PERMANENTLY_INELIGIBLE: 'Permanently Ineligible',
  PENDING_REVIEW: 'Pending Review',
}
const FRAUD_COLORS = { Low: '#059669', Medium: '#d97706', High: '#dc2626' }

const NORMAL_RANGES = {
  hemoglobin: [12.5, 17.5], systolicBP: [90, 140], diastolicBP: [60, 90],
  sugarLevel: [70, 140], plateletCount: [150, 400], wbcCount: [4, 11],
  rbcCount: [4.5, 5.5], age: [18, 65],
}

function rangeColor(key, val) {
  if (val == null) return '#6b7280'
  const r = NORMAL_RANGES[key]
  if (!r) return '#a5b4fc'
  return val >= r[0] && val <= r[1] ? '#059669' : '#dc2626'
}

function Badge({ status }) {
  const bg = STATUS_COLORS[status] || '#6b7280'
  return (
    <span style={{ background: bg + '22', color: bg, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, letterSpacing: 0.3 }}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

function ProgressBar({ label, value, color = '#6366f1' }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
        <span>{label}</span><span style={{ color }}>{value != null ? `${value}%` : '—'}</span>
      </div>
      <div style={{ height: 6, borderRadius: 4, background: '#1e293b' }}>
        <div style={{ height: '100%', borderRadius: 4, width: `${value ?? 0}%`, background: `linear-gradient(90deg, ${color}, ${color}aa)`, transition: 'width 1s cubic-bezier(.4,0,.2,1)' }} />
      </div>
    </div>
  )
}

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  const bg = type === 'success' ? 'linear-gradient(135deg,#059669,#047857)' : 'linear-gradient(135deg,#dc2626,#b91c1c)'
  return (
    <div style={{ position: 'fixed', top: 28, right: 28, zIndex: 9999, padding: '14px 28px', borderRadius: 12, background: bg, color: '#fff', fontSize: 14, fontWeight: 500, boxShadow: '0 8px 32px #0008', animation: 'fadeSlideIn .35s ease' }}>
      {message}
    </div>
  )
}

export default function EligibilityReview() {
  const { token } = useAuth()
  const [checks, setChecks] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pending')
  const [selected, setSelected] = useState(null)
  const [overrideStatus, setOverrideStatus] = useState('')
  const [remarks, setRemarks] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const data = tab === 'pending' ? await getPendingReviews(token) : await getAllEligibilityChecks(token)
      setChecks(Array.isArray(data) ? data : data?.data ?? [])
    } catch { setChecks([]) }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [tab, token])

  const stats = {
    total: checks.length,
    pending: checks.filter(c => c.status === 'PENDING_REVIEW').length,
    eligible: checks.filter(c => c.status === 'ELIGIBLE').length,
    ineligible: checks.filter(c => c.status === 'TEMPORARILY_INELIGIBLE' || c.status === 'PERMANENTLY_INELIGIBLE').length,
  }

  const handleSubmit = async () => {
    if (!overrideStatus) return
    setSubmitting(true)
    try {
      await reviewEligibility(selected.id, { status: overrideStatus, remarks }, token)
      setToast({ message: 'Review submitted successfully', type: 'success' })
      setSelected(null); setOverrideStatus(''); setRemarks('')
      fetchData()
    } catch { setToast({ message: 'Failed to submit review', type: 'error' }) }
    setSubmitting(false)
  }

  const handleRequestNew = async () => {
    setSubmitting(true)
    try {
      await reviewEligibility(selected.id, { status: 'PENDING_REVIEW', remarks: 'New report requested by admin. ' + remarks }, token)
      setToast({ message: 'New report requested', type: 'success' })
      setSelected(null); setRemarks('')
      fetchData()
    } catch { setToast({ message: 'Failed to request new report', type: 'error' }) }
    setSubmitting(false)
  }

  const openDetail = (check) => { setSelected(check); setOverrideStatus(check.status); setRemarks(check.adminRemarks || '') }

  /* ── Inline keyframes via style tag ── */
  useEffect(() => {
    if (!document.getElementById('elig-review-keyframes')) {
      const s = document.createElement('style'); s.id = 'elig-review-keyframes'
      s.textContent = `@keyframes fadeSlideIn{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}@keyframes modalIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`
      document.head.appendChild(s)
    }
  }, [])

  // Use global layout/panel styles so page matches admin pages
  const glassCard = 'panel'

  const renderStatCard = (label, value, color) => (
    <div className="panel p-4" style={{ flex: '1 1 140px', minWidth: 140, textAlign: 'center' }}>
      <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
      <div className="text-xs text-slate-500" style={{ marginTop: 4, letterSpacing: .5, textTransform: 'uppercase' }}>{label}</div>
    </div>
  )

  const renderCard = (check) => {
    const r = check.report || {}
    const donor = r.donor || {}
    return (
      <div key={check.id} onClick={() => openDetail(check)} className={`panel p-4`} style={{ cursor: 'pointer', transition: 'all .25s ease', marginBottom: 12, ...(selected?.id === check.id ? { border: '1px solid #6366f1' } : {}) }}>
        <div className="flex items-center justify-between flex-wrap" style={{ gap: 10 }}>
          <div className="flex items-center" style={{ gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, color: '#fff', flexShrink: 0 }}>
              {(donor.name || r.patientName || '?')[0].toUpperCase()}
            </div>
            <div>
              <div className="font-semibold">{donor.name || r.patientName || 'Unknown Donor'}</div>
              <div className="text-sm text-slate-500" style={{ marginTop: 2 }}>
                {r.bloodGroup || donor.bloodType || '—'} &middot; Age {r.age ?? '—'} &middot; {r.reportDate ? new Date(r.reportDate).toLocaleDateString() : '—'}
              </div>
            </div>
          </div>
          <div className="flex items-center" style={{ gap: 12 }}>
            {r.fraudRisk && <span className="text-xs font-semibold" style={{ color: FRAUD_COLORS[r.fraudRisk] || '#94a3b8', background: (FRAUD_COLORS[r.fraudRisk] || '#94a3b8') + '18', padding: '2px 9px', borderRadius: 8 }}>Risk: {r.fraudRisk}</span>}
            {check.eligibilityConfidence != null && <span className="text-xs" style={{ color: '#a5b4fc' }}>Confidence {check.eligibilityConfidence}%</span>}
            <Badge status={check.status} />
          </div>
        </div>
      </div>
    )
  }

  /* ── Detail Modal ── */
  const renderDetail = () => {
    if (!selected) return null
    const c = selected, r = c.report || {}, donor = r.donor || {}, upload = r.upload || {}
    const isImage = /\.(jpe?g|png|gif|webp)$/i.test(upload.originalName || '')
    const medicalFields = [
      ['Hemoglobin', r.hemoglobin, 'g/dL', 'hemoglobin'], ['Systolic BP', r.systolicBP, 'mmHg', 'systolicBP'],
      ['Diastolic BP', r.diastolicBP, 'mmHg', 'diastolicBP'], ['Sugar Level', r.sugarLevel, 'mg/dL', 'sugarLevel'],
      ['Platelet Count', r.plateletCount, '×10³/µL', 'plateletCount'], ['WBC Count', r.wbcCount, '×10³/µL', 'wbcCount'],
      ['RBC Count', r.rbcCount, '×10⁶/µL', 'rbcCount'], ['HIV Status', r.hivStatus, '', null],
      ['Hepatitis', r.hepatitisStatus, '', null], ['Malaria', r.malariaStatus, '', null],
    ]
    const infectionColor = (val) => !val ? '#6b7280' : val.toLowerCase() === 'negative' ? '#059669' : '#dc2626'

    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.4)', display: 'flex', justifyContent: 'center', alignItems: 'start', padding: '40px 16px', overflowY: 'auto' }}
        onClick={e => e.target === e.currentTarget && setSelected(null)}>
        <div className="panel p-6" style={{ width: '100%', maxWidth: 960, animation: 'modalIn .3s ease', position: 'relative' }}>
          {/* Close */}
          <button onClick={() => setSelected(null)} style={{ position: 'absolute', top: 16, right: 18, background: 'none', border: 'none', color: '#94a3b8', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>&times;</button>

          {/* Donor Header */}
          <div className="mb-4 border-b" style={{ paddingBottom: 12 }}>
            <div className="flex items-center" style={{ gap: 14, flexWrap: 'wrap' }}>
              <h2 className="text-lg font-bold text-slate-700" style={{ margin: 0 }}>{donor.name || r.patientName || 'Donor'}</h2>
              <Badge status={c.status} />
            </div>
            <div className="text-sm text-slate-500 mt-1">{donor.email || ''} &middot; {r.bloodGroup || donor.bloodType || ''} &middot; {r.gender || ''}, {r.age ?? ''} yrs &middot; Lab: {r.labName || '—'}</div>
          </div>

          {/* Split: Report + Data */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.4fr)', gap: 20 }}>
            {/* Left — Report Viewer */}
            <div className="panel p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase" style={{ marginBottom: 10, letterSpacing: .6 }}>Report Document</div>
              {isImage ? (
                <img src={upload.url} alt="report" style={{ width: '100%', borderRadius: 8, objectFit: 'contain', maxHeight: 320 }} />
              ) : upload.id ? (
                <iframe 
                  src={getFileUrl(upload.id, token)} 
                  style={{ width: '100%', height: '360px', borderRadius: 8, border: 'none', background: '#fff' }} 
                  title="Report PDF" 
                />
              ) : (
                <a href={upload.url} target="_blank" rel="noopener noreferrer" className="block text-center" style={{ padding: '32px 16px', color: '#2563eb', textDecoration: 'none', border: '1px dashed rgba(37,99,235,.18)', borderRadius: 8, fontSize: 13 }}>
                  📄 Open {upload.originalName || 'Report'}
                </a>
              )}
              <div className="text-xs text-slate-500 mt-2">
                {upload.originalName || '—'} &middot; {upload.createdAt ? new Date(upload.createdAt).toLocaleDateString() : ''}
              </div>
            </div>

            {/* Right — Medical Data */}
            <div className="panel p-4 overflow-x-auto">
              <div className="text-xs font-semibold text-slate-500 uppercase" style={{ marginBottom: 10, letterSpacing: .6 }}>Parsed Medical Data</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>{['Parameter', 'Value', 'Unit', 'Status'].map(h => <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: '#64748b', borderBottom: '1px solid rgba(226,232,240,.8)', fontWeight: 500, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {medicalFields.map(([label, val, unit, key], i) => {
                    const c2 = key ? rangeColor(key, val) : infectionColor(val)
                    const statusText = val == null ? 'Missing' : key ? (NORMAL_RANGES[key] ? (val >= NORMAL_RANGES[key][0] && val <= NORMAL_RANGES[key][1] ? 'Normal' : 'Abnormal') : '—') : (val?.toLowerCase?.() === 'negative' ? 'Clear' : 'Detected')
                    return (
                      <tr key={label} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(15,23,42,.02)' }}>
                        <td style={{ padding: '7px 10px', color: '#0f172a' }}>{label}</td>
                        <td style={{ padding: '7px 10px', fontWeight: 600, color: c2 }}>{val ?? '—'}</td>
                        <td style={{ padding: '7px 10px', color: '#64748b' }}>{unit}</td>
                        <td style={{ padding: '7px 10px' }}><span style={{ fontSize: 11, color: c2, background: c2 + '18', padding: '1px 8px', borderRadius: 6 }}>{statusText}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom — AI Scores + Explanation */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
            <div className="panel p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase" style={{ marginBottom: 12, letterSpacing: .6 }}>AI Confidence</div>
              <ProgressBar label="OCR Confidence" value={r.ocrConfidence} color="#6366f1" />
              <ProgressBar label="Eligibility Confidence" value={c.eligibilityConfidence} color="#059669" />
              <ProgressBar label="Parse Confidence" value={r.parseConfidence} color="#818cf8" />
              {r.fraudRisk && (
                <div className="text-sm font-semibold" style={{ marginTop: 8, color: FRAUD_COLORS[r.fraudRisk] }}>Fraud Risk: {r.fraudRisk}</div>
              )}
            </div>
            <div className="panel p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase" style={{ marginBottom: 8, letterSpacing: .6 }}>AI Explanation</div>
              <p className="text-sm text-slate-700" style={{ lineHeight: 1.6, margin: 0 }}>{c.aiExplanation || 'No explanation provided.'}</p>
              {c.reasons?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div className="text-xs text-slate-500 font-semibold" style={{ marginBottom: 4 }}>REASONS</div>
                  {c.reasons.map((r2, i) => <div key={i} className="text-sm" style={{ color: '#f59e0b', marginBottom: 2 }}>• {r2}</div>)}
                </div>
              )}
              {c.missingDocuments?.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div className="text-xs text-slate-500 font-semibold" style={{ marginBottom: 4 }}>MISSING DOCUMENTS</div>
                  {c.missingDocuments.map((d, i) => <div key={i} className="text-sm text-red-600" style={{ marginBottom: 2 }}>⚠ {d}</div>)}
                </div>
              )}
            </div>
          </div>

          {/* Admin Actions */}
          <div className="panel p-4 mt-5">
            <div className="text-xs font-semibold text-slate-500 uppercase" style={{ marginBottom: 14, letterSpacing: .6 }}>Admin Review</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, alignItems: 'start' }}>
              <div>
                <label className="text-xs text-slate-500 block mb-2">Override Status</label>
                <select value={overrideStatus} onChange={e => setOverrideStatus(e.target.value)}
                  className="w-full" style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(226,232,240,.8)', background: '#fff', color: '#0f172a', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
                  <option value="">Select status…</option>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-2">Medical Remarks</label>
                <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={3} placeholder="Enter review notes…"
                  className="w-full" style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(226,232,240,.8)', background: '#fff', color: '#0f172a', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button onClick={handleRequestNew} disabled={submitting} className="btn-inverse">
                Request New Report
              </button>
              <button onClick={handleSubmit} disabled={submitting || !overrideStatus} className="btn-primary" style={{ opacity: !overrideStatus ? 0.6 : 1 }}>
                {submitting ? 'Submitting…' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ── Main Render ── */
  return (
    <div className="space-y-6 page-shell">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Eligibility Reviews</h1>
        <p className="text-sm text-slate-500 mt-1">Review and manage blood donation eligibility checks</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
        {renderStatCard('Total', stats.total, '#a5b4fc')}
        {renderStatCard('Pending', stats.pending, '#2563eb')}
        {renderStatCard('Eligible', stats.eligible, '#059669')}
        {renderStatCard('Ineligible', stats.ineligible, '#dc2626')}
      </div>

      {/* Tabs */}
      <div className="inline-flex panel p-1" style={{ gap: 4, marginBottom: 20 }}>
        {['pending', 'all'].map(t => (
          <button key={t} onClick={() => { setTab(t); setSelected(null) }}
            className={`px-6 py-2 rounded ${tab === t ? 'bg-gradient-to-r from-indigo-500 to-indigo-400 text-white' : 'text-slate-500'}`}>
            {t === 'pending' ? 'Pending' : 'All Reviews'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="panel p-4" style={{ height: 80, background: 'linear-gradient(90deg,rgba(226,232,240,.6) 25%,rgba(226,232,240,.4) 50%,rgba(226,232,240,.6) 75%)', backgroundSize: '800px 100%', animation: 'shimmer 1.5s infinite linear' }} />
          ))}
        </div>
      ) : checks.length === 0 ? (
        <div className="panel p-6 text-center">
          <div className="text-3xl mb-2">✓</div>
          <div className="text-sm text-slate-500">No {tab === 'pending' ? 'pending' : ''} reviews found</div>
        </div>
      ) : (
        checks.map(renderCard)
      )}

      {renderDetail()}
    </div>
  )
}
