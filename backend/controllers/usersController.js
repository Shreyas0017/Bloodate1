const prisma = require('../prismaClient')
const bcrypt = require('bcrypt')
const asyncHandler = require('../utils/asyncHandler')

async function getMe(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, name: true, email: true, role: true, hospitalId: true, createdAt: true }
  })
  res.json(user)
}

async function listUsers(req, res) {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, hospitalId: true, createdAt: true }
  })
  res.json(users)
}

async function listUsersOrganized(req, res) {
  // Fetch all users with donor profile and hospital
  const allUsers = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true, role: true, hospitalId: true, createdAt: true,
      donor: {
        select: {
          id: true, name: true, bloodType: true, phone: true, dateOfBirth: true,
          address: true, city: true, state: true, gender: true, weight: true,
          lastDonation: true, parentName: true, emergencyContactName: true,
          emergencyContactPhone: true, zip: true
        }
      },
      hospital: { select: { id: true, name: true, address: true, phone: true, email: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  // Fetch all hospitals to build the hospital groups
  const hospitals = await prisma.hospital.findMany({
    select: { id: true, name: true, address: true, phone: true, email: true, createdAt: true }
  })

  const superAdmins = allUsers.filter(u => u.role === 'SUPER_ADMIN')
  const donors = allUsers.filter(u => u.role === 'DONOR')

  const hospitalGroups = hospitals.map(h => ({
    ...h,
    admins: allUsers.filter(u => u.role === 'HOSPITAL_ADMIN' && u.hospitalId === h.id),
    staff: allUsers.filter(u => u.role === 'HOSPITAL_STAFF' && u.hospitalId === h.id)
  }))

  res.json({ superAdmins, hospitals: hospitalGroups, donors })
}

async function getUserById(req, res) {
  const { id } = req.params
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, hospitalId: true, createdAt: true }
  })
  if (!user) return res.status(404).json({ error: 'not found' })
  res.json(user)
}

async function createUser(req, res) {
  const { name, email, password, role, hospitalId } = req.body
  if (!email || !password || !role) return res.status(400).json({ error: 'email, password, and role required' })

  const allowedRoles = ['HOSPITAL_ADMIN', 'HOSPITAL_STAFF']
  let targetHospitalId = hospitalId || null

  if (req.user.role === 'SUPER_ADMIN') {
    if (!allowedRoles.includes(role)) return res.status(400).json({ error: 'invalid role' })
  } else if (req.user.role === 'HOSPITAL_ADMIN') {
    if (role !== 'HOSPITAL_STAFF') return res.status(403).json({ error: 'forbidden' })
    targetHospitalId = req.user.hospitalId
  } else {
    return res.status(403).json({ error: 'forbidden' })
  }

  if (!targetHospitalId) return res.status(400).json({ error: 'hospitalId required' })

  const hospital = await prisma.hospital.findUnique({ where: { id: targetHospitalId } })
  if (!hospital) return res.status(404).json({ error: 'hospital not found' })

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return res.status(409).json({ error: 'email already in use' })

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role, hospitalId: targetHospitalId }
  })
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, hospitalId: user.hospitalId })
}

async function listHospitalUsers(req, res) {
  if (!req.user.hospitalId) return res.json([])
  const users = await prisma.user.findMany({
    where: { hospitalId: req.user.hospitalId, role: { in: ['HOSPITAL_ADMIN', 'HOSPITAL_STAFF'] } },
    select: { id: true, name: true, email: true, role: true, createdAt: true }
  })
  res.json(users)
}

async function deleteUser(req, res) {
  const { id } = req.params
  const targetUser = await prisma.user.findUnique({ where: { id } })
  if (!targetUser) return res.status(404).json({ error: 'not found' })

  if (req.user.role === 'SUPER_ADMIN') {
    // allowed
  } else if (req.user.role === 'HOSPITAL_ADMIN') {
    if (targetUser.hospitalId !== req.user.hospitalId || targetUser.role !== 'HOSPITAL_STAFF') {
      return res.status(403).json({ error: 'forbidden' })
    }
  } else {
    return res.status(403).json({ error: 'forbidden' })
  }

  await prisma.user.delete({ where: { id } })
  res.json({ success: true })
}

module.exports = {
  getMe:               asyncHandler(getMe),
  listUsers:           asyncHandler(listUsers),
  listUsersOrganized:  asyncHandler(listUsersOrganized),
  getUserById:         asyncHandler(getUserById),
  createUser:          asyncHandler(createUser),
  listHospitalUsers:   asyncHandler(listHospitalUsers),
  deleteUser:          asyncHandler(deleteUser),
}
