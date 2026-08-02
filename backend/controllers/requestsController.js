const prisma = require('../prismaClient')

async function createRequest(req, res) {
  try {
    if (req.user?.role === 'DONOR') return res.status(403).json({ error: 'forbidden' })
    let { donorId, hospitalId, bloodType, quantity } = req.body
    if (req.user && req.user.hospitalId && req.user.role !== 'SUPER_ADMIN') {
      hospitalId = req.user.hospitalId
    }
    if (!hospitalId || !bloodType || !quantity) return res.status(400).json({ error: 'hospitalId, bloodType and quantity are required' })
    const q = parseInt(quantity, 10)
    if (Number.isNaN(q) || q <= 0) return res.status(400).json({ error: 'quantity must be a positive integer' })

    // optional donor check
    if (donorId) {
      const donor = await prisma.donor.findUnique({ where: { id: donorId } })
      if (!donor) return res.status(404).json({ error: 'donor not found' })
    }

    const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } })
    if (!hospital) return res.status(404).json({ error: 'hospital not found' })

    const data = { hospitalId, bloodType, quantity: q }
    if (donorId) data.donorId = donorId
    const r = await prisma.request.create({ data })
    res.json(r)
  } catch (err) {
    console.error('[ERROR] createRequest:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

async function listRequests(req, res) {
  try {
    const role = req.user?.role
    const include = {
      hospital: true,
      _count: { select: { interests: true } }
    }

    if (role !== 'DONOR') {
      include.interests = {
        orderBy: { createdAt: 'desc' },
        include: {
          donor: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              bloodType: true,
              gender: true,
              weight: true,
              dateOfBirth: true,
              parentName: true,
              city: true,
              state: true,
              eligibilityChecks: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                include: {
                  report: {
                    include: { upload: true }
                  }
                }
              },
              medicalReports: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                include: { upload: true }
              }
            }
          }
        }
      }
    }

    const where = {}
    if ((role === 'HOSPITAL_ADMIN' || role === 'HOSPITAL_STAFF') && req.user?.hospitalId) {
      where.hospitalId = req.user.hospitalId
    }

    const list = await prisma.request.findMany({
      where,
      include,
      orderBy: { createdAt: 'desc' }
    })

    if (role === 'DONOR') {
      // Only look up by userId — no email-based auto-association
      const donor = await prisma.donor.findFirst({ where: { userId: req.user.id } })
      if (donor) {
        const interests = await prisma.donationInterest.findMany({
          where: { donorId: donor.id },
          select: { requestId: true }
        })
        const interestSet = new Set(interests.map(i => i.requestId))
        return res.json(list.map(item => ({
          ...item,
          userInterested: interestSet.has(item.id)
        })))
      }
    }

    res.json(list)
  } catch (err) {
    console.error('[ERROR] listRequests:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

async function createInterest(req, res) {
  try {
    const { id } = req.params
    const { message } = req.body

    const request = await prisma.request.findUnique({ where: { id } })
    if (!request) return res.status(404).json({ error: 'request not found' })

    // Only look up donor by userId — no email-based auto-association
    const donor = await prisma.donor.findFirst({ where: { userId: req.user.id } })
    if (!donor) return res.status(400).json({ error: 'donor profile not found' })

    const existing = await prisma.donationInterest.findUnique({
      where: { donorId_requestId: { donorId: donor.id, requestId: id } }
    })
    if (existing) return res.json(existing)

    const interest = await prisma.donationInterest.create({
      data: { donorId: donor.id, requestId: id, message: message || null }
    })
    res.json(interest)
  } catch (err) {
    console.error('[ERROR] createInterest:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * Update status. If marking as FULFILLED, decrement the hospital's stock
 * inside a serializable transaction to prevent race conditions.
 */
async function updateRequestStatus(req, res) {
  try {
    const { id } = req.params
    const { status } = req.body
    if (!status) return res.status(400).json({ error: 'status is required' })

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.request.findUnique({ where: { id } })
      if (!existing) {
        const err = new Error('request not found')
        err.status = 404
        throw err
      }

      // Only decrement stock when transitioning INTO fulfilled for the first time
      if (status === 'FULFILLED' && existing.status !== 'FULFILLED') {
        if (!existing.hospitalId) {
          const err = new Error('request has no hospital associated')
          err.status = 400
          throw err
        }

        // Lock the stock row to prevent concurrent over-decrements
        const stocks = await tx.$queryRaw`
          SELECT * FROM "BloodStock"
          WHERE "hospitalId" = ${existing.hospitalId}
          AND "bloodType" = ${existing.bloodType}
          LIMIT 1
          FOR UPDATE
        `

        const stock = stocks[0]
        if (!stock || stock.quantity < existing.quantity) {
          const err = new Error('insufficient stock to fulfill request')
          err.status = 400
          throw err
        }

        await tx.bloodStock.update({
          where: { id: stock.id },
          data: { quantity: { decrement: existing.quantity } }
        })
      }

      return await tx.request.update({ where: { id }, data: { status } })
    }, {
      isolationLevel: 'Serializable'
    })

    res.json(result)
  } catch (err) {
    console.error('[ERROR] updateRequestStatus:', err)
    const status = err.status || 500
    const message = err.status ? err.message : 'Internal server error'
    res.status(status).json({ error: message })
  }
}

async function deleteRequest(req, res) {
  try {
    const { id } = req.params
    const request = await prisma.request.findUnique({ where: { id } })
    if (!request) return res.status(404).json({ error: 'Request not found' })

    if (req.user.role !== 'SUPER_ADMIN') {
      if (req.user.role !== 'HOSPITAL_ADMIN' || request.hospitalId !== req.user.hospitalId) {
        return res.status(403).json({ error: 'forbidden' })
      }
    }

    await prisma.request.delete({ where: { id } })
    res.json({ success: true })
  } catch (err) {
    console.error('[ERROR] deleteRequest:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

module.exports = { createRequest, listRequests, updateRequestStatus, deleteRequest, createInterest }
