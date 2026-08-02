const prisma = require('../prismaClient')

const VALID_BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

/**
 * GET /api/donors
 * Paginated list of all donors. Supports ?page=1&limit=20
 */
exports.getAll = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20))
    const skip = (page - 1) * limit

    const [donors, total] = await Promise.all([
      prisma.donor.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.donor.count()
    ])

    res.json({
      data: donors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (err) {
    console.error('[ERROR] getAll donors:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * GET /api/donors/me
 * Returns the donor profile linked to the authenticated user.
 * Does NOT auto-associate by email to prevent account hijacking.
 */
exports.getMine = async (req, res) => {
  try {
    const donor = await prisma.donor.findFirst({ where: { userId: req.user.id } })
    if (!donor) {
      return res.status(404).json({
        error: 'donor not found',
        message: 'No donor profile is linked to your account. Please contact support.'
      })
    }
    res.json(donor)
  } catch (err) {
    console.error('[ERROR] getMine:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * POST /api/donors
 * Create a new donor record. Requires SUPER_ADMIN role (enforced on route).
 */
exports.create = async (req, res) => {
  try {
    const data = { ...req.body }

    // Sanitize and type-coerce known fields
    if (data.bloodType && !VALID_BLOOD_TYPES.includes(data.bloodType)) {
      return res.status(400).json({ error: 'invalid bloodType' })
    }
    if (data.weight !== undefined && data.weight !== null) {
      data.weight = parseFloat(data.weight)
      if (isNaN(data.weight) || data.weight < 10 || data.weight > 500) {
        return res.status(400).json({ error: 'invalid weight' })
      }
    }
    if (data.dateOfBirth) {
      data.dateOfBirth = new Date(data.dateOfBirth)
      if (isNaN(data.dateOfBirth.getTime())) {
        return res.status(400).json({ error: 'invalid dateOfBirth' })
      }
    }
    if (data.lastDonation) {
      data.lastDonation = new Date(data.lastDonation)
      if (isNaN(data.lastDonation.getTime())) {
        return res.status(400).json({ error: 'invalid lastDonation' })
      }
    }

    const donor = await prisma.donor.create({ data })
    res.status(201).json(donor)
  } catch (err) {
    console.error('[ERROR] create donor:', err)
    res.status(400).json({ error: 'Failed to create donor' })
  }
}

/**
 * GET /api/donors/:id
 */
exports.getById = async (req, res) => {
  try {
    const donor = await prisma.donor.findUnique({ where: { id: req.params.id } })
    if (!donor) return res.status(404).json({ error: 'Not found' })
    res.json(donor)
  } catch (err) {
    console.error('[ERROR] getById donor:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * PUT /api/donors/:id
 * Update any donor. Requires SUPER_ADMIN or HOSPITAL_ADMIN (enforced on route).
 */
exports.update = async (req, res) => {
  try {
    const data = { ...req.body }
    if (data.dateOfBirth) data.dateOfBirth = new Date(data.dateOfBirth)
    if (data.lastDonation) data.lastDonation = new Date(data.lastDonation)
    if (data.weight !== undefined) data.weight = parseFloat(data.weight)
    if (data.bloodType && !VALID_BLOOD_TYPES.includes(data.bloodType)) {
      return res.status(400).json({ error: 'invalid bloodType' })
    }

    const donor = await prisma.donor.update({ where: { id: req.params.id }, data })
    res.json(donor)
  } catch (err) {
    console.error('[ERROR] update donor:', err)
    res.status(400).json({ error: 'Failed to update donor' })
  }
}

/**
 * PATCH /api/donors/me
 * Donor can update their own profile.
 */
exports.updateMine = async (req, res) => {
  try {
    const donor = await prisma.donor.findFirst({ where: { userId: req.user.id } })
    if (!donor) return res.status(404).json({ error: 'donor not found' })

    const data = { ...req.body }
    if (data.dateOfBirth) data.dateOfBirth = new Date(data.dateOfBirth)
    if (data.lastDonation) data.lastDonation = new Date(data.lastDonation)
    if (data.weight) data.weight = parseFloat(data.weight)
    if (data.bloodType && !VALID_BLOOD_TYPES.includes(data.bloodType)) {
      return res.status(400).json({ error: 'invalid bloodType' })
    }

    const updated = await prisma.donor.update({ where: { id: donor.id }, data })
    res.json(updated)
  } catch (err) {
    console.error('[ERROR] updateMine:', err)
    res.status(400).json({ error: 'Failed to update profile' })
  }
}

/**
 * DELETE /api/donors/:id
 * Requires SUPER_ADMIN role (enforced on route).
 */
exports.remove = async (req, res) => {
  try {
    await prisma.donor.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (err) {
    console.error('[ERROR] remove donor:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
