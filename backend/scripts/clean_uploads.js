#!/usr/bin/env node
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const prisma = require('../prismaClient')

const uploadsDir = path.resolve(__dirname, '..', 'uploads')
const retentionDays = parseInt(process.env.LOCAL_UPLOAD_RETENTION_DAYS || '7', 10)
const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000

async function main() {
  if (!fs.existsSync(uploadsDir)) {
    console.log('uploads dir not found:', uploadsDir)
    process.exit(0)
  }
  const files = fs.readdirSync(uploadsDir)
  let removed = 0
  for (const file of files) {
    const fp = path.join(uploadsDir, file)
    try {
      const stat = fs.statSync(fp)
      if (stat.mtimeMs > cutoff) continue

      // Check DB: if there is an upload record without a cloud URL, skip deletion
      let rec = null
      try {
        rec = await prisma.upload.findFirst({ where: { filename: file } })
      } catch (e) {
        // ignore DB errors, fall back to file-age based deletion
      }

      if (rec) {
        const url = rec.url || ''
        const cloudPresent = url.startsWith('http') || !!rec.publicId
        if (!cloudPresent) {
          console.log('skip (no cloud url):', file)
          continue
        }
      }

      fs.unlinkSync(fp)
      console.log('deleted', file)
      removed++
    } catch (e) {
      console.error('error removing', file, e && e.message ? e.message : e)
    }
  }

  console.log(`done. removed=${removed}`)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
