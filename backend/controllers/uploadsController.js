const fs = require('fs')
const path = require('path')
const fetch = global.fetch || require('node-fetch')

const prisma = require('../prismaClient')
const crypto = require('crypto')

// Cloudinary credentials — no hardcoded defaults.
// If these are not set, cloud uploads will fail gracefully with a warning.
const CLOUDINARY_URL = process.env.CLOUDINARY_URL || null
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.warn('WARNING: Cloudinary credentials not fully set — cloud uploads may fail')
}

const DEFAULT_CLOUDINARY_URL = CLOUDINARY_CLOUD_NAME
  ? `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`
  : null

let cloudinary = null
try {
  cloudinary = require('cloudinary').v2
  if (CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET && CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
      cloud_name: CLOUDINARY_CLOUD_NAME,
      api_key: CLOUDINARY_API_KEY,
      api_secret: CLOUDINARY_API_SECRET
    })
  }
} catch (e) {
  cloudinary = null
}

async function uploadHandler(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'no file uploaded' })
    // simple server-side validation: ensure file size and mimetype respected
    const maxBytes = parseInt(process.env.MAX_UPLOAD_BYTES || '5242880', 10)
    if (req.file.size > maxBytes) return res.status(400).json({ error: 'file too large' })
    const uploadsDir = path.resolve(__dirname, '..', 'uploads')
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

    const localPath = path.join(uploadsDir, req.file.filename)

    // File already saved by multer to a temp location (req.file.path)
    // Forward file to Cloudinary (signed if credentials are present)
    const form = new FormData()
    form.append('file', fs.createReadStream(req.file.path))

    let cloudJson = null
    try {
      if (cloudinary) {
        // Use Cloudinary SDK upload_stream for reliable uploading
        cloudJson = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'bloodate' },
            (error, result) => {
              if (error) return reject(error)
              resolve(result)
            }
          )
          fs.createReadStream(req.file.path).pipe(uploadStream)
        })
      } else if (DEFAULT_CLOUDINARY_URL) {
        const uploadUrl = CLOUDINARY_URL || DEFAULT_CLOUDINARY_URL
        if (process.env.CLOUDINARY_UPLOAD_PRESET) {
          form.append('upload_preset', process.env.CLOUDINARY_UPLOAD_PRESET)
        }
        const resp = await fetch(uploadUrl, { method: 'POST', body: form })
        cloudJson = await resp.json()
      } else {
        console.warn('No Cloudinary configuration — file saved locally only')
      }
    } catch (cloudErr) {
      console.error('cloud upload failed', cloudErr && cloudErr.message ? cloudErr.message : cloudErr)
      cloudJson = { error: 'cloud upload failed' }
    }

    // Save a copy locally in uploads folder
    const dest = fs.createWriteStream(localPath)
    const src = fs.createReadStream(req.file.path)
    await new Promise((resolve, reject) => {
      src.pipe(dest)
      src.on('end', resolve)
      src.on('error', reject)
    })

    // Remove temp multer file
    try { fs.unlinkSync(req.file.path) } catch (e) {}

    // persist metadata to DB if cloud upload returned a URL
    let uploadRecord = null
    try {
      const url = (cloudJson && (cloudJson.secure_url || cloudJson.url)) || `/uploads/${req.file.filename}`
      const publicId = (cloudJson && cloudJson.public_id) || null
      const bytes = (cloudJson && cloudJson.bytes) || req.file.size || null
      const data = {
        originalName: req.file.originalname,
        filename: req.file.filename,
        url,
        publicId,
        bytes
      }
      // allow associating with hospitalId or donorId from body
      if (req.body && req.body.hospitalId) data.hospitalId = req.body.hospitalId
      if (req.body && req.body.donorId) data.donorId = req.body.donorId
      if (req.user && req.user.id) data.uploaderId = req.user.id

      uploadRecord = await prisma.upload.create({ data })
    } catch (dbErr) {
      console.error('[ERROR] saving upload metadata:', dbErr.message)
    }

    // Optionally clean local copy after successful cloud upload
    if (
      process.env.CLEAN_LOCAL_AFTER_UPLOAD === 'true' &&
      cloudJson &&
      (cloudJson.secure_url || cloudJson.url)
    ) {
      try { fs.unlinkSync(localPath) } catch (e) {}
    }

    return res.json({ localPath: `/uploads/${req.file.filename}`, cloud: cloudJson, record: uploadRecord })
  } catch (err) {
    console.error('[ERROR] uploadHandler:', err.message)
    return res.status(500).json({ error: 'upload failed' })
  }
}

// list uploads (admin/hospital admin)
async function listUploads(req, res) {
  try {
    const uploads = await prisma.upload.findMany({ orderBy: { createdAt: 'desc' }, take: 200 })
    return res.json(uploads)
  } catch (e) {
    console.error('[ERROR] list uploads:', e.message)
    return res.status(500).json({ error: 'Failed to retrieve uploads' })
  }
}

module.exports = { uploadHandler, listUploads }
