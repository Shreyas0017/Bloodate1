const prisma = require('../prismaClient')

async function listHospitals(req, res) {
  const hospitals = await prisma.hospital.findMany()
  res.json(hospitals)
}

async function createHospital(req, res) {
  const { name, address, phone, email } = req.body
  const h = await prisma.hospital.create({ data: { name, address, phone, email } })
  res.json(h)
}

async function getHospital(req, res) {
  const { id } = req.params
  const h = await prisma.hospital.findUnique({ where: { id } })
  if (!h) return res.status(404).json({ error: 'not found' })
  res.json(h)
}

async function updateHospital(req, res) {
  const { id } = req.params
  const target = await prisma.hospital.findUnique({ where: { id } })
  if (!target) return res.status(404).json({ error: 'not found' })

  if (req.user.role !== 'SUPER_ADMIN') {
    if (req.user.role !== 'HOSPITAL_ADMIN' || req.user.hospitalId !== id) {
      return res.status(403).json({ error: 'forbidden' })
    }
  }

  const { name, address, phone, email } = req.body
  const updated = await prisma.hospital.update({
    where: { id },
    data: {
      name: name ?? target.name,
      address: address ?? target.address,
      phone: phone ?? target.phone,
      email: email ?? target.email
    }
  })
  res.json(updated)
}

module.exports = { listHospitals, createHospital, getHospital, updateHospital }
