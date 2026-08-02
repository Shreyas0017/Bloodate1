const express = require('express')
const router = express.Router()
const { authenticate, requireRole } = require('../middleware/auth')
const { getMe, listUsers, getUserById, createUser, listHospitalUsers, deleteUser, listUsersOrganized } = require('../controllers/usersController')

router.get('/me', authenticate, getMe)
router.delete('/:id', authenticate, deleteUser)
router.post('/invite', authenticate, createUser)
router.get('/hospital', authenticate, requireRole('HOSPITAL_ADMIN'), listHospitalUsers)
router.get('/organized', authenticate, requireRole('SUPER_ADMIN'), listUsersOrganized)
router.get('/', authenticate, requireRole('SUPER_ADMIN'), listUsers)
router.get('/:id', authenticate, requireRole('SUPER_ADMIN'), getUserById)

module.exports = router
