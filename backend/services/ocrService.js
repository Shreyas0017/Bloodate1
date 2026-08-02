const Tesseract = require('tesseract.js')
const pdfParse = require('pdf-parse')
const https = require('https')
const http = require('http')
const path = require('path')
const crypto = require('crypto')

const DOWNLOAD_TIMEOUT_MS = 30000 // 30 seconds

/**
 * Download a file from a URL into a Buffer.
 * Enforces a timeout to prevent indefinite hangs on slow/unresponsive servers.
 */
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http

    const timer = setTimeout(() => {
      reject(new Error(`Download timed out after ${DOWNLOAD_TIMEOUT_MS}ms: ${url}`))
    }, DOWNLOAD_TIMEOUT_MS)

    client.get(url, (res) => {
      // Follow redirects (one level)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        clearTimeout(timer)
        return downloadFile(res.headers.location).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        clearTimeout(timer)
        return reject(new Error(`HTTP ${res.statusCode} downloading ${url}`))
      }
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        clearTimeout(timer)
        resolve(Buffer.concat(chunks))
      })
      res.on('error', (err) => {
        clearTimeout(timer)
        reject(err)
      })
    }).on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

/**
 * Compute SHA-256 hash of a buffer for duplicate detection.
 */
function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

/**
 * Extract text from PDF buffer.
 */
async function extractTextFromPDF(buffer) {
  const data = await pdfParse(buffer)
  return {
    text: data.text || '',
    confidence: data.text && data.text.trim().length > 20 ? 85 : 40,
    pages: data.numpages || 1
  }
}

/**
 * Extract text from image buffer using Tesseract OCR.
 */
async function extractTextFromImage(buffer) {
  const { data } = await Tesseract.recognize(buffer, 'eng', {
    logger: () => {} // silent
  })
  return {
    text: data.text || '',
    confidence: data.confidence || 0,
    words: data.words?.length || 0
  }
}

/**
 * Main OCR entry point.
 * @param {string} fileUrl - URL of the file (Cloudinary or local)
 * @param {string} originalName - Original filename for extension detection
 * @returns {{ text: string, confidence: number, fileHash: string }}
 */
async function extractText(fileUrl, originalName) {
  // Download the file
  let buffer
  if (fileUrl.startsWith('http')) {
    buffer = await downloadFile(fileUrl)
  } else {
    const fs = require('fs')
    buffer = fs.readFileSync(fileUrl)
  }

  const fileHash = hashBuffer(buffer)
  const ext = path.extname(originalName || '').toLowerCase()

  let result
  if (ext === '.pdf') {
    result = await extractTextFromPDF(buffer)
  } else if (['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'].includes(ext)) {
    result = await extractTextFromImage(buffer)
  } else {
    // Try image OCR as fallback
    try {
      result = await extractTextFromImage(buffer)
    } catch {
      result = await extractTextFromPDF(buffer)
    }
  }

  return {
    text: result.text,
    confidence: Math.round(result.confidence || 0),
    fileHash
  }
}

module.exports = { extractText, hashBuffer, downloadFile }
