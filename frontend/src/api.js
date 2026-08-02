const BASE = import.meta.env.VITE_API_BASE_URL || '/api'

export async function fetchDonors() {
  try {
    const res = await fetch(`${BASE}/donors`)
    return await res.json()
  } catch (err) { return [] }
}

export async function getMyDonorProfile(token) {
  const res = await fetch(`${BASE}/donors/me`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) return null
  return await res.json()
}

export async function updateMyDonorProfile(payload, token) {
  const res = await fetch(`${BASE}/donors/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('update failed')
  return await res.json()
}

export async function createDonor(payload) {
  try {
    const res = await fetch(`${BASE}/donors`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    return await res.json()
  } catch (err) { return null }
}

export async function login(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  if (!res.ok) throw new Error('login failed')
  return await res.json()
}

export async function registerUser(payload) {
  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('register failed')
  return await res.json()
}

export async function uploadFile(file, token, opts = {}) {
  const fd = new FormData()
  fd.append('file', file)
  if (opts.hospitalId) fd.append('hospitalId', opts.hospitalId)
  if (opts.donorId) fd.append('donorId', opts.donorId)
  const res = await fetch(`${BASE}/uploads`, { method: 'POST', body: fd, headers: { Authorization: `Bearer ${token}` } })
  return await res.json()
}

export async function getHospitals() {
  try {
    const res = await fetch(`${BASE}/hospitals`)
    return await res.json()
  } catch (e) { return [] }
}

export async function getHospitalById(id) {
  const res = await fetch(`${BASE}/hospitals/${id}`)
  if (!res.ok) return null
  return await res.json()
}

export async function updateHospital(id, payload, token) {
  const res = await fetch(`${BASE}/hospitals/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('update failed')
  return await res.json()
}

export async function createHospital(payload, token) {
  const res = await fetch(`${BASE}/hospitals`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) })
  return await res.json()
}

export async function inviteUser(payload, token) {
  const res = await fetch(`${BASE}/users/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('invite failed')
  return await res.json()
}

export async function listHospitalUsers(token) {
  const res = await fetch(`${BASE}/users/hospital`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) return []
  return await res.json()
}

export async function getRequests(token) {
  const res = await fetch(`${BASE}/requests`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) return []
  return await res.json()
}

export async function createRequestInterest(id, payload, token) {
  const res = await fetch(`${BASE}/requests/${id}/interest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload || {})
  })
  if (!res.ok) throw new Error('interest failed')
  return await res.json()
}

export async function createRequest(payload, token) {
  const res = await fetch(`${BASE}/requests`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) })
  return await res.json()
}

export async function updateRequestStatus(id, status, token) {
  const res = await fetch(`${BASE}/requests/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ status }) })
  return await res.json()
}

export async function listUploads(token) {
  const res = await fetch(`${BASE}/uploads`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) return []
  return await res.json()
}

export async function listStock(token) {
  const res = await fetch(`${BASE}/stock`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) return []
  return await res.json()
}

export async function createStock(payload, token) {
  const res = await fetch(`${BASE}/stock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('stock create failed')
  return await res.json()
}

export async function listUsers(token) {
  const res = await fetch(`${BASE}/users`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) return []
  return await res.json()
}

export async function listUsersOrganized(token) {
  const res = await fetch(`${BASE}/users/organized`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return await res.json()
}

export async function getMe(token) {
  const res = await fetch(`${BASE}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) return null
  return await res.json()
}

export async function deleteUser(id, token) {
  const res = await fetch(`${BASE}/users/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error('delete failed')
  return await res.json()
}

export async function uploadMedicalReport(files, donorId, token) {
  const fd = new FormData()
  if (Array.isArray(files)) {
    files.forEach(file => fd.append('files', file))
  } else if (files instanceof FileList) {
    for (let i = 0; i < files.length; i++) {
      fd.append('files', files[i])
    }
  } else {
    fd.append('files', files)
  }
  fd.append('donorId', donorId)
  
  const res = await fetch(`${BASE}/eligibility/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd
  })
  if (!res.ok) throw new Error('upload failed')
  return await res.json()
}

export async function getEligibilityStatus(donorId, token) {
  const res = await fetch(`${BASE}/eligibility/status/${donorId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error('fetch failed')
  return await res.json()
}

export async function getReportDetails(reportId, token) {
  const res = await fetch(`${BASE}/eligibility/report/${reportId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error('fetch failed')
  return await res.json()
}

export async function getDonorDashboard(donorId, token) {
  const res = await fetch(`${BASE}/eligibility/dashboard/${donorId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error('fetch failed')
  return await res.json()
}

export async function reviewEligibility(checkId, payload, token) {
  const res = await fetch(`${BASE}/eligibility/review/${checkId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('review failed')
  return await res.json()
}

export async function getPendingReviews(token) {
  const res = await fetch(`${BASE}/eligibility/pending`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) return []
  return await res.json()
}

export async function getAllEligibilityChecks(token) {
  const res = await fetch(`${BASE}/eligibility/all`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) return []
  return await res.json()
}

export async function listAllEligibilityChecks(token) {
  const res = await fetch(`${BASE}/eligibility/all`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error('failed to load all checks')
  return await res.json()
}

export async function deleteMedicalReport(reportId, token) {
  const res = await fetch(`${BASE}/eligibility/report/${reportId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error('failed to delete report')
  return await res.json()
}

export async function deleteRequest(id, token) {
  const res = await fetch(`${BASE}/requests/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error('delete request failed')
  return await res.json()
}

export function getFileUrl(uploadId, token) {
  return `${BASE}/eligibility/file/${uploadId}?token=${token}`
}
