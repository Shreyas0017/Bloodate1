const express = require('express');
const router = express.Router();
const controller = require('../controllers/donorsController');
const { authenticate, requireRole } = require('../middleware/auth')

// Public read access — donors list and individual profiles are viewable
router.get('/', controller.getAll);
router.get('/:id', controller.getById);

// Authenticated donor — own profile management
router.get('/me', authenticate, requireRole('DONOR'), controller.getMine);
router.patch('/me', authenticate, requireRole('DONOR'), controller.updateMine);

// Protected mutation routes — were previously unauthenticated (Issues #16, #17, #18)
router.post('/', authenticate, requireRole('SUPER_ADMIN'), controller.create);
router.put('/:id', authenticate, requireRole(['SUPER_ADMIN', 'HOSPITAL_ADMIN']), controller.update);
router.delete('/:id', authenticate, requireRole('SUPER_ADMIN'), controller.remove);

module.exports = router;
