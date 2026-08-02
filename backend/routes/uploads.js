const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')

const { uploadHandler, listUploads } = require('../controllers/uploadsController')
const { authenticate, requireRole } = require('../middleware/auth')

// store uploads to a temp folder; controller will copy to final location
const tempDir = path.resolve(__dirname, '..', 'tmp')
if (!require('fs').existsSync(tempDir)) require('fs').mkdirSync(tempDir, { recursive: true })

const storage = multer.diskStorage({
	destination: tempDir,
	filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
})

// Accept images only and limit size to 5MB
const upload = multer({
	storage,
	limits: { fileSize: parseInt(process.env.MAX_UPLOAD_BYTES || '5242880', 10) },
	fileFilter: (req, file, cb) => {
		const allowed = /jpeg|jpg|png|gif|webp/
		const ok = allowed.test(file.mimetype) || allowed.test(file.originalname)
		if (ok) cb(null, true)
		else cb(new Error('invalid file type'), false)
	}
})

// require authentication for uploads
router.post('/', authenticate, upload.single('file'), uploadHandler)

// list recent uploads (admin/ hospital-admin)
router.get('/', authenticate, requireRole('HOSPITAL_ADMIN'), listUploads)

module.exports = router
