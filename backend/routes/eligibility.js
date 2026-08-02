const express = require('express')
const router = express.Router()
const { authenticate, requireRole } = require('../middleware/auth')
const {
  upload,
  uploadReport,
  getEligibilityStatus,
  getReportDetails,
  getDonorDashboard,
  reviewEligibility,
  listPendingReviews,
  listAllChecks,
  deleteReport,
  viewFile
} = require('../controllers/eligibilityController')

// Upload medical report(s) — any authenticated user
router.post('/upload', authenticate, upload.array('files', 5), uploadReport)

// Get donor eligibility status
router.get('/status/:donorId', authenticate, getEligibilityStatus)

// Get single report details
router.get('/report/:reportId', authenticate, getReportDetails)

// Full donor medical dashboard data
router.get('/dashboard/:donorId', authenticate, getDonorDashboard)

// Admin review/override
router.patch('/review/:checkId', authenticate, requireRole('SUPER_ADMIN'), reviewEligibility)

// List pending reviews (hospital admin)
router.get('/pending', authenticate, requireRole('SUPER_ADMIN'), listPendingReviews)

// List all checks (admin overview)
router.get('/all', authenticate, requireRole('SUPER_ADMIN'), listAllChecks)
// Delete a report
router.delete('/report/:reportId', authenticate, deleteReport)

// Proxy a file
router.get('/file/:uploadId', authenticate, viewFile)

module.exports = router
