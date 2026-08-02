const express = require('express')
const router = express.Router()
const { listStock, createStock } = require('../controllers/stockController')
const { authenticate, requireRole } = require('../middleware/auth')

router.get('/', authenticate, requireRole(['HOSPITAL_ADMIN', 'HOSPITAL_STAFF']), listStock)
router.post('/', authenticate, requireRole(['HOSPITAL_ADMIN', 'HOSPITAL_STAFF']), createStock)

module.exports = router
