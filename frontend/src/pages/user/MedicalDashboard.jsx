import React, { useEffect, useState, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  getMyDonorProfile,
  uploadMedicalReport,
  getDonorDashboard,
  getReportDetails,
  deleteMedicalReport
} from '../../api'

const STATUS_DETAILS = {
  ELIGIBLE: { label: 'Eligible to Donate', color: '#059669', desc: 'You meet all medical criteria for blood donation.', icon: '❤️' },
  TEMPORARILY_INELIGIBLE: { label: 'Temporarily Ineligible', color: '#d97706', desc: 'You are currently not eligible, but can donate after a waiting period.', icon: '⚠️' },
  PERMANENTLY_INELIGIBLE: { label: 'Permanently Ineligible', color: '#dc2626', desc: 'You are medically unfit to donate blood due to permanent conditions.', icon: '❌' },
  PENDING_REVIEW: { label: 'Pending Review', color: '#2563eb', desc: 'Your report is being reviewed manually by our medical staff.', icon: '📋' },
  NO_REPORTS: { label: 'No Reports Uploaded', color: '#64748b', desc: 'Please upload a medical report to verify your donation eligibility.', icon: '🩸' },
}

const NORMAL_RANGES = {
  hemoglobin: { male: [13.0, 18.0], female: [12.5, 16.0], unit: 'g/dL', label: 'Hemoglobin' },
  systolicBP: { male: [90, 180], female: [90, 180], unit: 'mmHg', label: 'Systolic BP' },
  diastolicBP: { male: [60, 100], female: [60, 100], unit: 'mmHg', label: 'Diastolic BP' },
  sugarLevel: { male: [70, 140], female: [70, 140], unit: 'mg/dL', label: 'Blood Sugar' },
  plateletCount: { male: [150, 450], female: [150, 450], unit: 'k/µL', label: 'Platelets' },
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])
  
  const bg = type === 'success' ? 'linear-gradient(135deg, #059669, #047857)' : 'linear-gradient(135deg, #dc2626, #b91c1c)'
  return (
    <div style={{
      position: 'fixed', top: 24, right: 24, zIndex: 10000,
      padding: '16px 24px', borderRadius: 12, color: '#fff',
      fontWeight: 600, fontSize: 14, boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
      background: bg, display: 'flex', alignItems: 'center', gap: 10,
      animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <span>{type === 'success' ? '✅' : '❌'}</span>
      <span>{message}</span>
    </div>
  )
}

export default function MedicalDashboard() {
  const { user, token } = useAuth()
  const [donorId, setDonorId] = useState(null)
  const [donorProfile, setDonorProfile] = useState(null)
  
  // Loading & Error states
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [loadingDashboard, setLoadingDashboard] = useState(false)
  const [dashboardData, setDashboardData] = useState(null)
  const [toast, setToast] = useState(null)

  // Upload States
  const [selectedFiles, setSelectedFiles] = useState([])
  const [isDragActive, setIsDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  // Detail view state for past reports
  const [expandedReportId, setExpandedReportId] = useState(null)

  // Toast helper
  const showToast = (message, type = 'success') => setToast({ message, type })

  // Load donor profile for this user
  const loadDonorProfile = async () => {
    if (!token) return
    setLoadingProfile(true)
    try {
      const profile = await getMyDonorProfile(token)
      if (profile) {
        setDonorId(profile.id)
        setDonorProfile(profile)
        await loadDashboard(profile.id)
      } else setDonorProfile(null)
    } catch (err) {
      console.error('Error finding donor profile:', err)
      showToast('Error loading donor profile', 'error')
    } finally {
      setLoadingProfile(false)
    }
  }

  // Load Eligibility Dashboard data
  const loadDashboard = async (id) => {
    setLoadingDashboard(true)
    try {
      const data = await getDonorDashboard(id, token)
      setDashboardData(data)
    } catch (err) {
      console.error('Error loading eligibility dashboard:', err)
      showToast('Failed to load eligibility details', 'error')
    } finally {
      setLoadingDashboard(false)
    }
  }

  useEffect(() => {
    loadDonorProfile()
  }, [user, token])

  // Upload handlers
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true)
    } else if (e.type === 'dragleave') {
      setIsDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      addFiles(e.dataTransfer.files)
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      addFiles(e.target.files)
    }
    if (e.target) e.target.value = ''
  }

  const addFiles = (files) => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/tiff', 'image/webp']
    const newFiles = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (validTypes.includes(file.type) || /\.(pdf|jpg|jpeg|png|bmp|tiff|webp)$/i.test(file.name)) {
        if (file.size > 15 * 1024 * 1024) {
          showToast(`File ${file.name} exceeds 15MB limit.`, 'error')
          continue
        }
        newFiles.push(file)
      } else {
        showToast(`Invalid file type for ${file.name}. Only PDF and images are accepted.`, 'error')
      }
    }

    if (selectedFiles.length + newFiles.length > 5) {
      showToast('You can upload a maximum of 5 files at a time.', 'error')
      return
    }

    setSelectedFiles(prev => [...prev, ...newFiles])
  }

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUploadSubmit = async () => {
    if (selectedFiles.length === 0) return
    setUploading(true)
    try {
      const result = await uploadMedicalReport(selectedFiles, donorId, token)
      showToast(result.success ? 'Medical reports uploaded successfully! Analysis has started in the background.' : 'Processing started')
      setSelectedFiles([])
      // Reload dashboard after a brief delay so processing has some time
      setTimeout(() => loadDashboard(donorId), 3000)
    } catch (err) {
      console.error(err)
      showToast('Error uploading report', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteReport = async (e, reportId) => {
    e.stopPropagation()
    if (!window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) return
    try {
      await deleteMedicalReport(reportId, token)
      showToast('Report deleted successfully')
      loadDashboard(donorId)
    } catch (err) {
      console.error('Delete error', err)
      showToast('Error deleting report', 'error')
    }
  }

  const triggerCamera = (e) => {
    if (e) e.stopPropagation()
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment')
      fileInputRef.current.click()
    }
  }

  const triggerBrowse = (e) => {
    if (e) e.stopPropagation()
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture')
      fileInputRef.current.click()
    }
  }

  // Inject CSS Keyframes for animations
  useEffect(() => {
    if (!document.getElementById('medical-dashboard-animations')) {
      const style = document.createElement('style')
      style.id = 'medical-dashboard-animations'
      style.textContent = `
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(220, 38, 38, 0); }
          100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
        }
        @keyframes rotateGauge {
          from { stroke-dashoffset: 314; }
        }
        @keyframes skeletonShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .skeleton {
          background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%);
          background-size: 200% 100%;
          animation: skeletonShimmer 1.5s infinite;
          border-radius: 8px;
        }
      `
      document.head.appendChild(style)
    }
  }, [])

  // Check value status and return color code
  const getValStatus = (key, val, gender = 'Male') => {
    if (val == null) return { color: '#64748b', status: 'Unknown' }
    const rangeObj = NORMAL_RANGES[key]
    if (!rangeObj) return { color: '#e2e8f0', status: '—' }
    const bounds = gender?.toLowerCase() === 'female' && rangeObj.female ? rangeObj.female : rangeObj.male
    const isNormal = val >= bounds[0] && val <= bounds[1]
    return {
      color: isNormal ? '#059669' : '#dc2626',
      status: isNormal ? 'Normal' : 'Abnormal',
      range: `${bounds[0]} - ${bounds[1]} ${rangeObj.unit}`
    }
  }

  // Styles
  const dashboardContainer = {
    maxWidth: 1100, margin: '0 auto', padding: '24px',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    color: '#e2e8f0', minHeight: '80vh'
  }

  const glassPanel = {
    background: 'linear-gradient(135deg, rgba(30,41,59,0.7), rgba(15,23,42,0.85))',
    border: '1px solid rgba(148,163,184,0.1)',
    borderRadius: '16px', padding: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    marginBottom: '24px'
  }

  // Render Loader
  if (loadingProfile) {
    return (
      <div style={dashboardContainer}>
        <div style={{ height: 60, marginBottom: 24 }} className="skeleton" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          <div style={{ height: 350 }} className="skeleton" />
          <div style={{ height: 350 }} className="skeleton" />
        </div>
      </div>
    )
  }

  // Render No Profile View
  if (!donorProfile) {
    return (
      <div style={dashboardContainer}>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        
        <div style={{ ...glassPanel, maxWidth: 550, margin: '40px auto', textAlign: 'center' }}>
          <div style={{ fontSize: 50, marginBottom: 12 }}>🩸</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: '#f1f5f9' }}>Profile setup required</h2>
          <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>
            Please complete your donor profile from the main dashboard so eligibility checks and uploads can be linked to you.
          </p>
          <a href="/user" style={{ display: 'inline-block', padding: '10px 16px', background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: '#fff', borderRadius: 8, fontWeight: 700, textDecoration: 'none' }}>
            Go to profile
          </a>
        </div>
      </div>
    )
  }

  // Extract variables safely
  const status = dashboardData?.currentStatus || 'NO_REPORTS'
  const latestCheck = dashboardData?.latestCheck || null
  const readiness = dashboardData?.readiness || 0
  const reports = dashboardData?.reports || []
  const healthTrends = dashboardData?.healthTrends || []

  const statusConfig = STATUS_DETAILS[status] || STATUS_DETAILS.NO_REPORTS
  const dashRadius = 50
  const strokeCircumference = 2 * Math.PI * dashRadius
  const strokeOffset = strokeCircumference - (readiness / 100) * strokeCircumference
  const nextSteps = (() => {
    if (status === 'ELIGIBLE') {
      return ['Stay hydrated and rested before donating.', 'Respond quickly to urgent requests.', 'Upload a new report every 90 days.']
    }
    if (status === 'TEMPORARILY_INELIGIBLE') {
      return ['Follow the waiting period guidance from medical staff.', 'Keep your contact info updated.', 'Upload a new report after the waiting period.']
    }
    if (status === 'PERMANENTLY_INELIGIBLE') {
      return ['You can still help by sharing requests to others.', 'Keep your profile updated for future reviews.', 'Reach out to support with any questions.']
    }
    return ['Upload a recent medical report.', 'Ensure your donor profile details are accurate.', 'Watch for updates from the admin team.']
  })()

  return (
    <div style={dashboardContainer}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Hero Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b, #4c1d95, #7f1d1d)',
        borderRadius: 24, padding: '32px', marginBottom: 28, position: 'relative',
        overflow: 'hidden', boxShadow: '0 12px 40px rgba(127,29,29,0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20, position: 'relative', zIndex: 2 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.5, color: '#fda4af', fontWeight: 600 }}>
              <span>🩸</span> donor dashboard
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 800, margin: '8px 0', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
              Hello, {donorProfile.name}
            </h1>
            <p style={{ margin: 0, color: '#f3f4f6', fontSize: 14, opacity: 0.9 }}>
              Group: <strong style={{ color: '#fecdd3' }}>{donorProfile.bloodType || 'Unknown'}</strong> &middot; Gender: {donorProfile.gender} &middot; Weight: {donorProfile.weight}kg
            </p>
          </div>

          <div style={{
            background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)',
            padding: '14px 20px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 14,
            backdropFilter: 'blur(8px)'
          }}>
            <div style={{ fontSize: 24 }}>{statusConfig.icon}</div>
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#94a3b8', fontWeight: 600 }}>Verification Status</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: statusConfig.color }}>{statusConfig.label}</div>
            </div>
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: -20, right: -20, fontSize: 160, opacity: 0.05, select: 'none', pointerEvents: 'none' }}>🩸</div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)', gap: 24 }}>
        
        {/* Left Column: Readiness + Upload */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Readiness Meter */}
          <div style={{ ...glassPanel, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 20 }}>Donation Readiness</h3>
            
            <div style={{ position: 'relative', width: 140, height: 140, marginBottom: 16 }}>
              <svg width="140" height="140" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                {/* Background Circle */}
                <circle cx="60" cy="60" r={dashRadius} fill="transparent" stroke="#1e293b" strokeWidth="8" />
                {/* Foreground Circle */}
                <circle cx="60" cy="60" r={dashRadius} fill="transparent"
                  stroke={statusConfig.color} strokeWidth="8"
                  strokeDasharray={strokeCircumference}
                  strokeDashoffset={strokeOffset}
                  strokeLinecap="round"
                  style={{
                    transition: 'stroke-dashoffset 0.8s ease-in-out',
                    animation: 'rotateGauge 1s ease-out'
                  }}
                />
              </svg>
              {/* Inner Circle Label */}
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center'
              }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9' }}>{readiness}%</span>
                <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Ready</span>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>
              {statusConfig.desc}
            </p>
          </div>

          {/* Next Steps */}
          <div style={glassPanel}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Next steps</h3>
            <div style={{ display: 'grid', gap: 10, fontSize: 13, color: '#cbd5e1' }}>
              {nextSteps.map((step, index) => (
                <div key={index} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ color: '#fda4af' }}>•</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Upload Section */}
          <div style={glassPanel}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 }}>Upload Medical Report</h3>
            
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerBrowse}
              style={{
                border: isDragActive ? '2px dashed #dc2626' : '2px dashed rgba(148,163,184,0.25)',
                borderRadius: 12, padding: '24px 16px', textAlign: 'center', background: isDragActive ? 'rgba(220,38,38,0.05)' : 'rgba(15,23,42,0.3)',
                transition: 'all 0.2s ease', cursor: 'pointer', position: 'relative'
              }}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept=".pdf,.jpg,.jpeg,.png,.bmp,.tiff,.webp" style={{ display: 'none' }} />
              
              <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#cbd5e1' }}>Drag & drop your report here</div>
              <div style={{ fontSize: 12, color: '#64748b', margin: '4px 0 14px' }}>Accepts PDF, JPG, PNG (Max 15MB)</div>
              
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button type="button" onClick={triggerBrowse}
                  style={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.15)', color: '#e2e8f0', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Browse Files
                </button>
                <button type="button" onClick={triggerCamera}
                  style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', color: '#fca5a5', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  📷 Use Camera
                </button>
              </div>
            </div>

            {/* Selected File Previews */}
            {selectedFiles.length > 0 && (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Selected Files ({selectedFiles.length})</div>
                {selectedFiles.map((file, idx) => (
                  <div key={idx} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#0f172a', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.08)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{ fontSize: 16 }}>{file.type === 'application/pdf' ? '📄' : '🖼️'}</span>
                      <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#cbd5e1' }}>{file.name}</span>
                    </div>
                    <button type="button" onClick={() => removeFile(idx)}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4, fontSize: 14 }}>
                      &times;
                    </button>
                  </div>
                ))}

                <button type="button" onClick={handleUploadSubmit} disabled={uploading}
                  style={{
                    width: '100%', padding: '10px', background: 'linear-gradient(135deg, #059669, #047857)',
                    color: '#fff', borderRadius: 8, fontWeight: 700, border: 'none', cursor: uploading ? 'wait' : 'pointer',
                    marginTop: 8, transition: 'opacity 0.2s', opacity: uploading ? 0.7 : 1
                  }}>
                  {uploading ? 'Analyzing Report...' : 'Verify Eligibility'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Analysis, Health Trends & History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* AI Explanation / Analysis Results */}
          {latestCheck && (
            <div style={glassPanel}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 }}>AI Eligibility Analysis</h3>
              
              {/* Confidence bars */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 14, marginBottom: 20 }}>
                <div style={{ background: 'rgba(15,23,42,0.4)', padding: 12, borderRadius: 10, border: '1px solid rgba(148,163,184,0.05)' }}>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>OCR Quality</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#818cf8', marginTop: 4 }}>{latestCheck.report?.ocrConfidence ? `${latestCheck.report.ocrConfidence}%` : '—'}</div>
                </div>
                <div style={{ background: 'rgba(15,23,42,0.4)', padding: 12, borderRadius: 10, border: '1px solid rgba(148,163,184,0.05)' }}>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Eligibility Conf.</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#059669', marginTop: 4 }}>{latestCheck.eligibilityConfidence ? `${latestCheck.eligibilityConfidence}%` : '—'}</div>
                </div>
                <div style={{ background: 'rgba(15,23,42,0.4)', padding: 12, borderRadius: 10, border: '1px solid rgba(148,163,184,0.05)' }}>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Fraud Risk</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: latestCheck.report?.fraudRisk === 'High' ? '#ef4444' : latestCheck.report?.fraudRisk === 'Medium' ? '#f59e0b' : '#10b981', marginTop: 4 }}>{latestCheck.report?.fraudRisk || 'Low'}</div>
                </div>
              </div>

              {/* Text explanation */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12, borderLeft: `4px solid ${statusConfig.color}`, marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>AI Decision Logic</div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: '#e2e8f0' }}>
                  {latestCheck.aiExplanation || 'No decision explanation generated.'}
                </p>
              </div>

              {/* Reasons & Risks */}
              {latestCheck.reasons && latestCheck.reasons.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', marginBottom: 6 }}>Ineligibility Reasons</div>
                  {latestCheck.reasons.map((r, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, fontSize: 12, color: '#fca5a5', marginBottom: 4 }}>
                      <span>❌</span> <span>{r}</span>
                    </div>
                  ))}
                </div>
              )}

              {latestCheck.healthRisks && latestCheck.healthRisks.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', marginBottom: 6 }}>Detected Health Warnings</div>
                  {latestCheck.healthRisks.map((r, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, fontSize: 12, color: '#fde047', marginBottom: 4 }}>
                      <span>⚠️</span> <span>{r}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Health Trends */}
          {healthTrends.length > 0 && (
            <div style={glassPanel}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 }}>Health Metrics (From Reports)</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
                {(() => {
                  const latestRep = dashboardData.reports.find(r => r.status === 'PARSED')
                  if (!latestRep) return null
                  
                  const metrics = [
                    { key: 'hemoglobin', icon: '🧪' },
                    { key: 'systolicBP', icon: '🩺' },
                    { key: 'sugarLevel', icon: '🍬' },
                    { key: 'plateletCount', icon: '🔬' }
                  ]

                  return metrics.map(({ key, icon }) => {
                    const val = latestRep[key]
                    const details = getValStatus(key, val, donorProfile.gender)
                    
                    return (
                      <div key={key} style={{ background: 'rgba(15,23,42,0.4)', padding: 14, borderRadius: 12, border: '1px solid rgba(148,163,184,0.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 14 }}>{icon}</span>
                          <span style={{ fontSize: 9, color: details.color, background: details.color + '15', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>{details.status}</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 10 }}>{NORMAL_RANGES[key].label}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9', marginTop: 2 }}>
                          {val != null ? `${val} ` : '—'}
                          <span style={{ fontSize: 10, fontWeight: 400, color: '#64748b' }}>{NORMAL_RANGES[key].unit}</span>
                        </div>
                        <div style={{ fontSize: 9, color: '#475569', marginTop: 4 }}>Normal: {details.range?.split(' ')[0]}</div>
                      </div>
                    )
                  })
                })()}
              </div>
            </div>
          )}

          {/* Timeline / History */}
          <div style={glassPanel}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 }}>Report History</h3>
            
            {reports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b', fontSize: 13 }}>
                No reports submitted yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {reports.map((report) => {
                  const check = report.eligibilityCheck
                  const isExpanded = expandedReportId === report.id
                  
                  return (
                    <div key={report.id} style={{
                      background: 'rgba(15,23,42,0.4)', borderRadius: 12, border: '1px solid rgba(148,163,184,0.06)',
                      overflow: 'hidden', transition: 'all 0.25s ease'
                    }}>
                      <div
                        onClick={() => setExpandedReportId(isExpanded ? null : report.id)}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', cursor: 'pointer' }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {report.upload?.originalName || 'Medical Report'}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
                            {new Date(report.createdAt).toLocaleDateString()} &middot; Status: <strong style={{ color: report.status === 'PARSED' ? '#059669' : report.status === 'PROCESSING' ? '#3b82f6' : report.status === 'FAILED' ? '#ef4444' : '#64748b' }}>{report.status}</strong>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {check && (
                            <span style={{
                              fontSize: 10, fontWeight: 700, color: STATUS_DETAILS[check.status]?.color,
                              background: (STATUS_DETAILS[check.status]?.color || '#64748b') + '15', padding: '2px 8px', borderRadius: 20
                            }}>
                              {STATUS_DETAILS[check.status]?.label}
                            </span>
                          )}
                          <button 
                            type="button" 
                            onClick={(e) => handleDeleteReport(e, report.id)} 
                            style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', cursor: 'pointer', padding: '4px 6px', fontSize: '12px', borderRadius: '4px', transition: 'all 0.2s' }} 
                            title="Delete Report"
                          >
                            🗑️
                          </button>
                          <span style={{ color: '#64748b', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', fontSize: 12 }}>▶</span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{ padding: '0 18px 18px', borderTop: '1px solid rgba(148,163,184,0.05)', background: 'rgba(0,0,0,0.1)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Extracted Data</div>
                              <div style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <div>Name: <span style={{ color: '#cbd5e1' }}>{report.patientName || '—'}</span></div>
                                <div>Age/Gender: <span style={{ color: '#cbd5e1' }}>{report.age || '—'} / {report.gender || '—'}</span></div>
                                <div>Blood Group: <span style={{ color: '#cbd5e1' }}>{report.bloodGroup || '—'}</span></div>
                                <div>Hemoglobin: <span style={{ color: '#cbd5e1' }}>{report.hemoglobin != null ? `${report.hemoglobin} g/dL` : '—'}</span></div>
                              </div>
                            </div>

                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Processing Details</div>
                              <div style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <div>Lab Name: <span style={{ color: '#cbd5e1' }}>{report.labName || '—'}</span></div>
                                <div>Report Date: <span style={{ color: '#cbd5e1' }}>{report.reportDate ? new Date(report.reportDate).toLocaleDateString() : '—'}</span></div>
                                <div>OCR Match Conf: <span style={{ color: '#cbd5e1' }}>{report.ocrConfidence != null ? `${report.ocrConfidence}%` : '—'}</span></div>
                                <div>
                                  <a href={report.upload?.url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>
                                    📄 View Report
                                  </a>
                                </div>
                              </div>
                            </div>
                          </div>

                          {check?.adminRemarks && (
                            <div style={{ marginTop: 12, background: 'rgba(37,99,235,0.05)', padding: 10, borderRadius: 8, border: '1px dashed rgba(37,99,235,0.2)' }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase' }}>Medical Staff Remarks</div>
                              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#93c5fd' }}>{check.adminRemarks}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}
