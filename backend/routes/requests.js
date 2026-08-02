const express = require('express')
const router = express.Router()
const { createRequest, listRequests, updateRequestStatus, deleteRequest, createInterest } = require('../controllers/requestsController')
const { authenticate, requireRole } = require('../middleware/auth')

router.post('/', authenticate, createRequest)
router.get('/', authenticate, requireRole(['HOSPITAL_ADMIN', 'HOSPITAL_STAFF', 'DONOR']), listRequests)
router.post('/:id/interest', authenticate, requireRole('DONOR'), createInterest)
router.patch('/:id/status', authenticate, requireRole('HOSPITAL_ADMIN'), updateRequestStatus)
router.delete('/:id', authenticate, requireRole('HOSPITAL_ADMIN'), deleteRequest)

module.exports = router
