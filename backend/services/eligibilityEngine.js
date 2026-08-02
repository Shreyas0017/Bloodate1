/**
 * Configurable Blood Donation Eligibility Rules Engine.
 *
 * Each rule returns { pass: boolean, reason: string } or null (if not applicable).
 */

const RULES = {
  age: {
    min: 18,
    max: 65,
    check(data) {
      if (data.age == null) return null
      if (data.age < this.min) return { pass: false, reason: `Age ${data.age} is below the minimum required age of ${this.min}` }
      if (data.age > this.max) return { pass: false, reason: `Age ${data.age} exceeds the maximum allowed age of ${this.max}` }
      return { pass: true }
    }
  },
  weight: {
    min: 50,
    check(data) {
      if (data.weight == null) return null
      if (data.weight < this.min) return { pass: false, reason: `Weight ${data.weight}kg is below the minimum required ${this.min}kg` }
      return { pass: true }
    }
  },
  hemoglobin: {
    maleMin: 13.0,
    femaleMin: 12.5,
    check(data) {
      if (data.hemoglobin == null) return null
      const gender = (data.gender || '').toLowerCase()
      const threshold = gender === 'female' ? this.femaleMin : this.maleMin
      const label = gender === 'female' ? 'female' : 'male'
      if (data.hemoglobin < threshold) {
        return {
          pass: false,
          reason: `Hemoglobin level ${data.hemoglobin} g/dL is below the minimum required threshold of ${threshold} g/dL for ${label} donors`
        }
      }
      return { pass: true }
    }
  },
  bloodPressure: {
    systolicMin: 90, systolicMax: 180,
    diastolicMin: 60, diastolicMax: 100,
    check(data) {
      if (data.systolicBP == null && data.diastolicBP == null) return null
      const issues = []
      if (data.systolicBP != null) {
        if (data.systolicBP < this.systolicMin || data.systolicBP > this.systolicMax) {
          issues.push(`Systolic BP ${data.systolicBP} mmHg is outside the acceptable range (${this.systolicMin}-${this.systolicMax})`)
        }
      }
      if (data.diastolicBP != null) {
        if (data.diastolicBP < this.diastolicMin || data.diastolicBP > this.diastolicMax) {
          issues.push(`Diastolic BP ${data.diastolicBP} mmHg is outside the acceptable range (${this.diastolicMin}-${this.diastolicMax})`)
        }
      }
      if (issues.length > 0) return { pass: false, reason: issues.join('; ') }
      return { pass: true }
    }
  },
  hivStatus: {
    check(data) {
      if (!data.hivStatus) return null
      const s = data.hivStatus.toLowerCase()
      if (s === 'positive' || s === 'reactive') {
        return { pass: false, reason: 'HIV positive status detected — permanent ineligibility', permanent: true }
      }
      return { pass: true }
    }
  },
  hepatitisStatus: {
    check(data) {
      if (!data.hepatitisStatus) return null
      const s = data.hepatitisStatus.toLowerCase()
      if (s === 'positive' || s === 'reactive') {
        return { pass: false, reason: 'Hepatitis positive status detected — permanent ineligibility', permanent: true }
      }
      return { pass: true }
    }
  },
  malariaStatus: {
    check(data) {
      if (!data.malariaStatus) return null
      const s = data.malariaStatus.toLowerCase()
      if (s === 'positive' || s === 'detected') {
        return { pass: false, reason: 'Active malaria infection detected — temporarily ineligible (defer 3 months after treatment)' }
      }
      return { pass: true }
    }
  },
  reportDate: {
    maxAgeDays: 30,
    check(data) {
      if (!data.reportDate) return null
      const reportDate = new Date(data.reportDate)
      if (isNaN(reportDate.getTime())) return null
      const daysDiff = Math.floor((Date.now() - reportDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff > this.maxAgeDays) {
        return { pass: false, reason: `Report is ${daysDiff} days old, exceeding the ${this.maxAgeDays}-day maximum. Please submit a recent report.` }
      }
      if (daysDiff < 0) {
        return { pass: false, reason: `Report date is in the future — possible fraud indicator` }
      }
      return { pass: true }
    }
  },
  lastDonation: {
    maleGapDays: 90,
    femaleGapDays: 120,
    check(data) {
      if (!data.lastDonation) return null
      const lastDate = new Date(data.lastDonation)
      if (isNaN(lastDate.getTime())) return null
      const daysSince = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      const gender = (data.gender || '').toLowerCase()
      const requiredGap = gender === 'female' ? this.femaleGapDays : this.maleGapDays
      if (daysSince < requiredGap) {
        const remaining = requiredGap - daysSince
        return {
          pass: false,
          reason: `Only ${daysSince} days since last donation. Minimum gap is ${requiredGap} days for ${gender || 'male'} donors. Try again in ${remaining} days.`,
          retryAfterDays: remaining
        }
      }
      return { pass: true }
    }
  }
}

/**
 * Evaluate donor eligibility based on medical report data.
 * @param {object} reportData - Parsed medical values
 * @param {object} donorData  - Donor profile data (weight, lastDonation, gender)
 * @returns {{ status, reasons, missingDocuments, healthRisks, retryAfterDays, eligibilityConfidence, aiExplanation }}
 */
function evaluateEligibility(reportData, donorData = {}) {
  const merged = { ...reportData, ...donorData }
  const reasons = []
  const healthRisks = []
  const missingDocuments = []
  let isPermanent = false
  let maxRetry = 0

  // Check which critical fields are missing
  if (merged.hemoglobin == null) missingDocuments.push('Hemoglobin test results')
  if (merged.hivStatus == null) missingDocuments.push('HIV screening report')
  if (merged.hepatitisStatus == null) missingDocuments.push('Hepatitis screening report')
  if (merged.systolicBP == null && merged.diastolicBP == null) missingDocuments.push('Blood pressure reading')

  // Run each rule
  for (const [name, rule] of Object.entries(RULES)) {
    const result = rule.check(merged)
    if (!result) continue
    if (!result.pass) {
      reasons.push(result.reason)
      if (result.permanent) isPermanent = true
      if (result.retryAfterDays) maxRetry = Math.max(maxRetry, result.retryAfterDays)
      healthRisks.push(name)
    }
  }

  // Determine status
  let status
  if (isPermanent) {
    status = 'PERMANENTLY_INELIGIBLE'
  } else if (reasons.length > 0) {
    status = 'TEMPORARILY_INELIGIBLE'
  } else if (missingDocuments.length > 2) {
    status = 'PENDING_REVIEW'
  } else {
    status = 'ELIGIBLE'
  }

  // Calculate confidence based on how many fields were available
  const totalFields = ['hemoglobin', 'systolicBP', 'diastolicBP', 'hivStatus', 'hepatitisStatus',
    'malariaStatus', 'age', 'bloodGroup', 'sugarLevel', 'plateletCount', 'wbcCount', 'rbcCount']
  const availableFields = totalFields.filter(f => merged[f] != null).length
  const eligibilityConfidence = Math.round((availableFields / totalFields.length) * 100)

  // Generate human-readable explanation
  const aiExplanation = generateExplanation(status, reasons, missingDocuments, merged)

  return {
    status,
    reasons,
    missingDocuments,
    healthRisks,
    retryAfterDays: maxRetry || null,
    eligibilityConfidence,
    aiExplanation
  }
}

/**
 * Generate a human-readable explanation of the eligibility decision.
 */
function generateExplanation(status, reasons, missing, data) {
  const parts = []

  if (status === 'ELIGIBLE') {
    parts.push('Great news! Based on your medical report, you are eligible to donate blood.')
    if (data.hemoglobin) parts.push(`Your hemoglobin level is ${data.hemoglobin} g/dL, which meets the required threshold.`)
    if (data.systolicBP && data.diastolicBP) parts.push(`Your blood pressure (${data.systolicBP}/${data.diastolicBP} mmHg) is within normal range.`)
    parts.push('Thank you for your willingness to save lives!')
  } else if (status === 'PERMANENTLY_INELIGIBLE') {
    parts.push('Unfortunately, based on your medical report, you are permanently ineligible to donate blood.')
    reasons.forEach(r => parts.push(`• ${r}`))
    parts.push('This determination is based on standard blood donation safety guidelines to protect both donors and recipients.')
  } else if (status === 'TEMPORARILY_INELIGIBLE') {
    parts.push('You are currently temporarily ineligible to donate blood.')
    reasons.forEach(r => parts.push(`• ${r}`))
    parts.push('Once these conditions are resolved, you may be eligible to donate again. Please consult your healthcare provider.')
  } else {
    parts.push('Your eligibility is pending review by medical staff.')
    if (missing.length > 0) {
      parts.push('The following information is missing from your report:')
      missing.forEach(m => parts.push(`• ${m}`))
    }
  }

  return parts.join('\n')
}

module.exports = { evaluateEligibility, RULES }
