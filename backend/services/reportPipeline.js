const prisma = require('../prismaClient')
const { extractText } = require('./ocrService')
const { parseReportWithAI } = require('./aiParserService')
const { evaluateEligibility } = require('./eligibilityEngine')
const { runFraudDetection } = require('./fraudDetection')
const { validateMedicalData } = require('../utils/validators')

/**
 * Full report processing pipeline.
 * Orchestrates: Upload → OCR → AI Parse → Medical Validation → Fraud Detection → Eligibility → DB Storage
 *
 * @param {string} reportId - MedicalReport ID
 */
async function processReport(reportId) {
  const report = await prisma.medicalReport.findUnique({
    where: { id: reportId },
    include: { upload: true, donor: true }
  })

  if (!report) throw new Error(`Report ${reportId} not found`)

  // Mark as processing
  await prisma.medicalReport.update({
    where: { id: reportId },
    data: { status: 'PROCESSING' }
  })

  try {
    // ── Step 1: OCR ──
    console.log(`[Pipeline] OCR starting for report ${reportId}`)
    const ocr = await extractText(report.upload.url, report.upload.originalName)

    await prisma.medicalReport.update({
      where: { id: reportId },
      data: {
        rawText: ocr.text,
        ocrConfidence: ocr.confidence,
        fileHash: ocr.fileHash
      }
    })

    // ── Step 2: AI Parsing ──
    console.log(`[Pipeline] AI parsing for report ${reportId}`)
    const parsed = await parseReportWithAI(ocr.text)

    // ── Step 2a: Medical Data Validation ──
    // Validate AI-parsed values are physiologically plausible before storing.
    const validationErrors = validateMedicalData(parsed)
    if (validationErrors.length > 0) {
      console.warn(`[Pipeline] Medical data validation warnings for report ${reportId}:`, validationErrors)
      // Log warnings but don't fail — partial data is still useful.
      // Downstream eligibility engine handles missing/null fields.
    }

    const parsedFields = {
      parsedData: parsed,
      patientName: parsed.patientName || null,
      age: parsed.age || null,
      gender: parsed.gender || null,
      bloodGroup: parsed.bloodGroup || null,
      hemoglobin: parsed.hemoglobin || null,
      systolicBP: parsed.systolicBP || null,
      diastolicBP: parsed.diastolicBP || null,
      sugarLevel: parsed.sugarLevel || null,
      plateletCount: parsed.plateletCount || null,
      wbcCount: parsed.wbcCount || null,
      rbcCount: parsed.rbcCount || null,
      hivStatus: parsed.hivStatus || null,
      hepatitisStatus: parsed.hepatitisStatus || null,
      malariaStatus: parsed.malariaStatus || null,
      reportDate: parsed.reportDate ? new Date(parsed.reportDate) : null,
      labName: parsed.labName || null,
      parseConfidence: parsed.confidence || null
    }

    // Nullify out-of-range values to prevent corrupt data from reaching the DB
    if (validationErrors.length > 0) {
      if (parsed.hemoglobin != null && (parsed.hemoglobin < 0 || parsed.hemoglobin > 25)) {
        parsedFields.hemoglobin = null
      }
      if (parsed.systolicBP != null && (parsed.systolicBP < 40 || parsed.systolicBP > 300)) {
        parsedFields.systolicBP = null
      }
      if (parsed.diastolicBP != null && (parsed.diastolicBP < 20 || parsed.diastolicBP > 200)) {
        parsedFields.diastolicBP = null
      }
      if (parsed.sugarLevel != null && (parsed.sugarLevel < 10 || parsed.sugarLevel > 1000)) {
        parsedFields.sugarLevel = null
      }
      if (parsed.age != null && (parsed.age < 0 || parsed.age > 150)) {
        parsedFields.age = null
      }
      // Nullify future report dates
      if (parsedFields.reportDate && parsedFields.reportDate > new Date()) {
        parsedFields.reportDate = null
      }
    }

    // Validate the reportDate is a real date
    if (parsedFields.reportDate && isNaN(parsedFields.reportDate.getTime())) {
      parsedFields.reportDate = null
    }

    await prisma.medicalReport.update({
      where: { id: reportId },
      data: parsedFields
    })

    // ── Step 3: Fraud Detection ──
    console.log(`[Pipeline] Fraud detection for report ${reportId}`)
    const fraud = await runFraudDetection({
      reportName: parsed.patientName,
      donorName: report.donor.name,
      fileHash: ocr.fileHash,
      donorId: report.donorId,
      rawText: ocr.text,
      ocrConfidence: ocr.confidence
    })

    await prisma.medicalReport.update({
      where: { id: reportId },
      data: { fraudRisk: fraud.fraudRisk }
    })

    // ── Step 4: Eligibility Check ──
    console.log(`[Pipeline] Eligibility check for report ${reportId}`)
    const donorData = {
      weight: report.donor.weight,
      gender: report.donor.gender || parsed.gender,
      lastDonation: report.donor.lastDonation
    }

    const eligibility = evaluateEligibility(parsed, donorData)

    // Create or update eligibility check
    const existingCheck = await prisma.eligibilityCheck.findUnique({
      where: { reportId }
    })

    const checkData = {
      donorId: report.donorId,
      status: eligibility.status,
      reasons: eligibility.reasons,
      missingDocuments: eligibility.missingDocuments,
      healthRisks: eligibility.healthRisks,
      retryAfterDays: eligibility.retryAfterDays,
      aiExplanation: eligibility.aiExplanation,
      eligibilityConfidence: eligibility.eligibilityConfidence
    }

    if (existingCheck) {
      await prisma.eligibilityCheck.update({
        where: { id: existingCheck.id },
        data: checkData
      })
    } else {
      await prisma.eligibilityCheck.create({
        data: { reportId, ...checkData }
      })
    }

    // Mark report as parsed
    await prisma.medicalReport.update({
      where: { id: reportId },
      data: { status: 'PARSED' }
    })

    console.log(`[Pipeline] Report ${reportId} processed successfully — Status: ${eligibility.status}`)
    return { success: true, status: eligibility.status }

  } catch (err) {
    console.error(`[Pipeline] Error processing report ${reportId}:`, err)

    await prisma.medicalReport.update({
      where: { id: reportId },
      data: { status: 'FAILED' }
    }).catch(() => {})

    return { success: false, error: err.message }
  }
}

module.exports = { processReport }
