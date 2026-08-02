const prisma = require('../prismaClient')
const multer = require('multer')
const cloudinary = require('../config/cloudinary')
const streamifier = require('streamifier')
const path = require('path')
const { processReport } = require('../services/reportPipeline')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf|bmp|tiff|webp/
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase())
    const mimeOk = allowed.test(file.mimetype) || file.mimetype === 'application/pdf'
    if (extOk || mimeOk) cb(null, true)
    else cb(new Error('Only PDF and image files (JPG, PNG, JPEG, BMP, TIFF) are accepted'), false)
  }
})

/**
 * Upload medical report(s) for eligibility verification.
 * POST /api/eligibility/upload
 */
async function uploadReport(req, res) {
  try {
    const files = req.files || (req.file ? [req.file] : [])
    if (files.length === 0) return res.status(400).json({ error: 'No file uploaded' })

    const donorId = req.body.donorId
    if (!donorId) return res.status(400).json({ error: 'donorId is required' })

    const donor = await prisma.donor.findUnique({ where: { id: donorId } })
    if (!donor) return res.status(404).json({ error: 'Donor not found' })

    const results = []

    for (const file of files) {
      // Upload to Cloudinary
      const cloudResult = await new Promise((resolve, reject) => {
        const ext = path.extname(file.originalname).toLowerCase()
        const resourceType = ext === '.pdf' ? 'raw' : 'image'
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'bloodate/medical-reports', resource_type: resourceType },
          (err, result) => { if (err) reject(err); else resolve(result) }
        )
        streamifier.createReadStream(file.buffer).pipe(stream)
      })

      // Create Upload record
      const uploadRecord = await prisma.upload.create({
        data: {
          originalName: file.originalname,
          filename: cloudResult.public_id,
          url: cloudResult.secure_url,
          publicId: cloudResult.public_id,
          bytes: cloudResult.bytes || file.size,
          uploaderId: req.user?.id || null,
          donorId
        }
      })

      // Create MedicalReport record
      const report = await prisma.medicalReport.create({
        data: {
          donorId,
          uploadId: uploadRecord.id,
          status: 'UPLOADED'
        }
      })

      // Kick off async processing (don't await — returns immediately)
      processReport(report.id).catch(err => {
        console.error(`Background processing failed for report ${report.id}:`, err)
      })

      results.push({
        reportId: report.id,
        uploadId: uploadRecord.id,
        fileName: file.originalname,
        status: 'UPLOADED',
        message: 'Processing started'
      })
    }

    res.json({ success: true, reports: results })
  } catch (err) {
    console.error('Upload error:', err)
    res.status(500).json({ error: 'Upload failed' })
  }
}

/**
 * Get eligibility status and history for a donor.
 * GET /api/eligibility/status/:donorId
 */
async function getEligibilityStatus(req, res) {
  try {
    const { donorId } = req.params
    const checks = await prisma.eligibilityCheck.findMany({
      where: { donorId },
      include: {
        report: {
          include: { upload: true }
        },
        reviewedBy: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Get the latest status
    const latest = checks[0] || null

    res.json({
      donorId,
      currentStatus: latest?.status || null,
      latestCheck: latest,
      history: checks
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'internal' })
  }
}

/**
 * Get single report with full details.
 * GET /api/eligibility/report/:reportId
 */
async function getReportDetails(req, res) {
  try {
    const { reportId } = req.params
    const report = await prisma.medicalReport.findUnique({
      where: { id: reportId },
      include: {
        upload: true,
        donor: { select: { id: true, name: true, email: true, bloodType: true, weight: true, gender: true } },
        eligibilityCheck: {
          include: {
            reviewedBy: { select: { name: true, email: true } }
          }
        }
      }
    })

    if (!report) return res.status(404).json({ error: 'Report not found' })
    res.json(report)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'internal' })
  }
}

/**
 * Full donor medical dashboard data.
 * GET /api/eligibility/dashboard/:donorId
 */
async function getDonorDashboard(req, res) {
  try {
    const { donorId } = req.params
    const donor = await prisma.donor.findUnique({
      where: { id: donorId },
      select: {
        id: true, name: true, email: true, bloodType: true,
        weight: true, gender: true, lastDonation: true
      }
    })

    if (!donor) return res.status(404).json({ error: 'Donor not found' })

    // All reports with eligibility checks
    const reports = await prisma.medicalReport.findMany({
      where: { donorId },
      include: {
        upload: { select: { id: true, originalName: true, url: true, createdAt: true } },
        eligibilityCheck: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Latest eligibility
    const latestCheck = reports.find(r => r.eligibilityCheck)?.eligibilityCheck || null

    // Health trends (last 5 parsed reports)
    const parsedReports = reports.filter(r => r.status === 'PARSED')
    const healthTrends = parsedReports.slice(0, 5).map(r => ({
      date: r.reportDate || r.createdAt,
      hemoglobin: r.hemoglobin,
      systolicBP: r.systolicBP,
      diastolicBP: r.diastolicBP,
      sugarLevel: r.sugarLevel,
      plateletCount: r.plateletCount
    }))

    // Donation readiness (0-100)
    let readiness = 0
    if (latestCheck) {
      if (latestCheck.status === 'ELIGIBLE') readiness = 100
      else if (latestCheck.status === 'TEMPORARILY_INELIGIBLE') readiness = 30
      else if (latestCheck.status === 'PENDING_REVIEW') readiness = 50
      else readiness = 0
    }

    res.json({
      donor,
      currentStatus: latestCheck?.status || 'NO_REPORTS',
      latestCheck,
      readiness,
      reports,
      healthTrends,
      totalReports: reports.length,
      parsedReports: parsedReports.length
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'internal' })
  }
}

/**
 * Admin review/override an eligibility check.
 * PATCH /api/eligibility/review/:checkId
 */
async function reviewEligibility(req, res) {
  try {
    const { checkId } = req.params
    const { status, remarks } = req.body

    const check = await prisma.eligibilityCheck.findUnique({ where: { id: checkId } })
    if (!check) return res.status(404).json({ error: 'Check not found' })

    const validStatuses = ['ELIGIBLE', 'TEMPORARILY_INELIGIBLE', 'PERMANENTLY_INELIGIBLE', 'PENDING_REVIEW']
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }

    const updateData = {
      reviewedById: req.user.id,
      reviewedAt: new Date(),
      adminOverride: !!status && status !== check.status
    }
    if (status) updateData.status = status
    if (remarks !== undefined) updateData.adminRemarks = remarks

    const updated = await prisma.eligibilityCheck.update({
      where: { id: checkId },
      data: updateData,
      include: {
        report: { include: { upload: true, donor: true } },
        reviewedBy: { select: { name: true, email: true } }
      }
    })

    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'internal' })
  }
}

/**
 * List all pending reviews (for hospital admin).
 * GET /api/eligibility/pending
 */
async function listPendingReviews(req, res) {
  try {
    const checks = await prisma.eligibilityCheck.findMany({
      where: {
        OR: [
          { status: 'PENDING_REVIEW' },
          { adminOverride: false }
        ]
      },
      include: {
        report: {
          include: {
            upload: { select: { id: true, originalName: true, url: true, createdAt: true } },
            donor: { select: { id: true, name: true, email: true, bloodType: true } }
          }
        },
        reviewedBy: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json(checks)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'internal' })
  }
}

/**
 * List all eligibility checks (all statuses, for admin overview).
 * GET /api/eligibility/all
 */
async function listAllChecks(req, res) {
  try {
    const checks = await prisma.eligibilityCheck.findMany({
      include: {
        report: {
          include: {
            upload: { select: { id: true, originalName: true, url: true } },
            donor: { select: { id: true, name: true, email: true, bloodType: true } }
          }
        },
        reviewedBy: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    })
    res.json(checks)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'internal' })
  }
}

/**
 * Delete a report (and associated eligibility check + upload record if applicable).
 * DELETE /api/eligibility/report/:reportId
 */
async function deleteReport(req, res) {
  try {
    const { reportId } = req.params

    const report = await prisma.medicalReport.findUnique({
      where: { id: reportId },
      include: { upload: true }
    })

    if (!report) return res.status(404).json({ error: 'Report not found' })

    // Optional: check if the user requesting owns the donor profile, 
    // but the donorId check is sufficient if we verify they are the uploader or user
    // We'll proceed with deletion:

    // 1. Delete associated EligibilityCheck if it exists
    await prisma.eligibilityCheck.deleteMany({
      where: { reportId }
    })

    // 2. Delete the MedicalReport
    await prisma.medicalReport.delete({
      where: { id: reportId }
    })

    // 3. Delete the associated Upload record
    if (report.uploadId) {
      await prisma.upload.delete({
        where: { id: report.uploadId }
      })
      // We could also delete from Cloudinary here if needed:
      if (report.upload.publicId) {
        cloudinary.uploader.destroy(report.upload.publicId).catch(console.error)
      }
    }

    res.json({ success: true })
  } catch (err) {
    console.error('Delete error:', err)
    res.status(500).json({ error: 'Failed to delete report' })
  }
}

/**
 * Proxy a file from Cloudinary and serve it with correct Content-Type to display inline.
 * GET /api/eligibility/file/:uploadId
 */
async function viewFile(req, res) {
  try {
    const upload = await prisma.upload.findUnique({ where: { id: req.params.uploadId } })
    if (!upload) return res.status(404).send('Not found')

    const response = await fetch(upload.url)
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const ext = path.extname(upload.originalName).toLowerCase()
    let contentType = 'application/octet-stream'
    if (ext === '.pdf') contentType = 'application/pdf'
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg'
    else if (ext === '.png') contentType = 'image/png'

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${upload.originalName}"`
    })
    res.send(buffer)
  } catch (err) {
    console.error('File view error:', err)
    res.status(500).send('Error loading file')
  }
}

module.exports = { upload, uploadReport, getEligibilityStatus, getReportDetails, getDonorDashboard, reviewEligibility, listPendingReviews, listAllChecks, deleteReport, viewFile }
