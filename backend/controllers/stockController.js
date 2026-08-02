const prisma = require('../prismaClient')

async function listStock(req, res) {
  try {
    const where = {}
    if (req.user && req.user.role !== 'SUPER_ADMIN') {
      if (req.user.hospitalId) where.hospitalId = req.user.hospitalId
    } else if (req.query.hospitalId) {
      where.hospitalId = req.query.hospitalId
    }
    const stocks = await prisma.bloodStock.findMany({ where, include: { hospital: true } })
    res.json(stocks)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'internal' })
  }
}

// Create or increment stock for a hospital+bloodType
async function createStock(req, res) {
  try {
    const { hospitalId, bloodType, quantity } = req.body
    const targetHospitalId = req.user && req.user.role === 'SUPER_ADMIN' ? hospitalId : req.user && req.user.hospitalId
    if (!targetHospitalId || !bloodType || !quantity) return res.status(400).json({ error: 'hospitalId, bloodType and quantity are required' })
    const q = parseInt(quantity, 10)
    if (Number.isNaN(q) || q <= 0) return res.status(400).json({ error: 'quantity must be a positive integer' })

    const hospital = await prisma.hospital.findUnique({ where: { id: targetHospitalId } })
    if (!hospital) return res.status(404).json({ error: 'hospital not found' })

    // Try to find existing stock and increment, otherwise create
    const existing = await prisma.bloodStock.findFirst({ where: { hospitalId: targetHospitalId, bloodType } })
    if (existing) {
      const updated = await prisma.bloodStock.update({ where: { id: existing.id }, data: { quantity: { increment: q } } })
      return res.json(updated)
    }

    const s = await prisma.bloodStock.create({ data: { hospitalId: targetHospitalId, bloodType, quantity: q } })
    res.json(s)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'internal' })
  }
}

module.exports = { listStock, createStock }
