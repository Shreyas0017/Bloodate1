const stringSimilarity = require('string-similarity')
const prisma = require('../prismaClient')

/**
 * Fraud Detection Service for medical reports.
 */

/**
 * Check if the patient name on the report matches the donor's profile name.
 * @returns {{ match: boolean, similarity: number, detail: string }}
 */
function checkNameMatch(reportName, donorName) {
  if (!reportName || !donorName) {
    return { match: null, similarity: 0, detail: 'Unable to verify — name missing from report or profile' }
  }

  const normalize = (s) => s.toLowerCase().replace(/[^a-z\s]/g, '').trim()
  const rn = normalize(reportName)
  const dn = normalize(donorName)

  if (!rn || !dn) {
    return { match: null, similarity: 0, detail: 'Unable to verify — name could not be parsed' }
  }

  const similarity = stringSimilarity.compareTwoStrings(rn, dn)

  if (similarity >= 0.8) {
    return { match: true, similarity: Math.round(similarity * 100), detail: 'Name matches donor profile' }
  } else if (similarity >= 0.5) {
    return { match: false, similarity: Math.round(similarity * 100), detail: `Partial name match (${Math.round(similarity * 100)}%) — manual verification recommended` }
  } else {
    return { match: false, similarity: Math.round(similarity * 100), detail: 'Name on report does not match donor profile — potential fraud' }
  }
}

/**
 * Check if this report has already been uploaded (duplicate detection via file hash).
 * @returns {{ isDuplicate: boolean, existingReportId: string|null, detail: string }}
 */
async function checkDuplicateReport(fileHash, donorId) {
  if (!fileHash) return { isDuplicate: false, existingReportId: null, detail: 'No file hash available' }

  const existing = await prisma.medicalReport.findFirst({
    where: { fileHash, donorId },
    orderBy: { createdAt: 'desc' }
  })

  if (existing) {
    return {
      isDuplicate: true,
      existingReportId: existing.id,
      detail: `Duplicate report detected — this exact file was previously uploaded on ${existing.createdAt.toISOString().split('T')[0]}`
    }
  }

  // Also check across all donors (same file used by different donors)
  const anyExisting = await prisma.medicalReport.findFirst({
    where: { fileHash },
    orderBy: { createdAt: 'desc' }
  })

  if (anyExisting) {
    return {
      isDuplicate: true,
      existingReportId: anyExisting.id,
      detail: 'This exact file has been used by another donor — potential fraud'
    }
  }

  return { isDuplicate: false, existingReportId: null, detail: 'No duplicate detected' }
}

/**
 * Check OCR text consistency — flag suspiciously clean or manipulated text.
 */
function checkOCRConsistency(rawText, ocrConfidence) {
  const issues = []

  if (!rawText || rawText.trim().length < 50) {
    issues.push('Very little text extracted — report may be blank or severely damaged')
  }

  if (ocrConfidence != null && ocrConfidence < 30) {
    issues.push('Very low OCR confidence — document may be heavily edited or corrupt')
  }

  // Check for suspiciously perfect text (might be a typed/edited document)
  const lineCount = (rawText || '').split('\n').filter(l => l.trim()).length
  const avgLineLen = rawText ? rawText.length / Math.max(lineCount, 1) : 0

  if (lineCount < 3 && avgLineLen > 200) {
    issues.push('Document structure is unusual — may not be a genuine medical report')
  }

  return issues
}

/**
 * Run all fraud detection checks and return an overall risk assessment.
 * @returns {{ fraudRisk: 'Low'|'Medium'|'High', checks: object[], fraudProbability: number }}
 */
async function runFraudDetection({ reportName, donorName, fileHash, donorId, rawText, ocrConfidence }) {
  const checks = []
  let riskScore = 0

  // 1. Name matching
  const nameCheck = checkNameMatch(reportName, donorName)
  checks.push({ type: 'name_match', ...nameCheck })
  if (nameCheck.match === false) riskScore += nameCheck.similarity < 30 ? 40 : 20

  // 2. Duplicate detection
  const dupeCheck = await checkDuplicateReport(fileHash, donorId)
  checks.push({ type: 'duplicate', ...dupeCheck })
  if (dupeCheck.isDuplicate) riskScore += 50

  // 3. OCR consistency
  const consistencyIssues = checkOCRConsistency(rawText, ocrConfidence)
  checks.push({ type: 'ocr_consistency', issues: consistencyIssues, hasIssues: consistencyIssues.length > 0 })
  riskScore += consistencyIssues.length * 15

  // Determine overall risk
  let fraudRisk
  if (riskScore >= 50) fraudRisk = 'High'
  else if (riskScore >= 20) fraudRisk = 'Medium'
  else fraudRisk = 'Low'

  return {
    fraudRisk,
    fraudProbability: Math.min(100, riskScore),
    checks
  }
}

module.exports = { runFraudDetection, checkNameMatch, checkDuplicateReport, checkOCRConsistency }
