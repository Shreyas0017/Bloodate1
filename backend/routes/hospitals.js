const express = require('express')
const router = express.Router()
const { listHospitals, createHospital, getHospital, updateHospital } = require('../controllers/hospitalsController')
const { authenticate, requireRole } = require('../middleware/auth')

router.get('/', listHospitals)
router.post('/', authenticate, requireRole('SUPER_ADMIN'), createHospital)
router.get('/:id', getHospital)
router.patch('/:id', authenticate, requireRole(['HOSPITAL_ADMIN']), updateHospital)

module.exports = router
