require('dotenv').config()
const prisma = require('./prismaClient')
const bcrypt = require('bcrypt')

async function seed() {
  await prisma.donor.deleteMany()
  const sample = [
    { name: 'Alice Johnson', email: 'alice@example.com', phone: '555-0101', bloodType: 'A+' },
    { name: 'Bob Smith', email: 'bob@example.com', phone: '555-0202', bloodType: 'O-' },
    { name: 'Carol Lee', email: 'carol@example.com', phone: '555-0303', bloodType: 'B+' }
  ]
  for (const d of sample) {
    await prisma.donor.create({ data: d })
  }
  console.log('Seeded', sample.length, 'donors')

  // create a sample hospital and stock
  await prisma.hospital.deleteMany()
  const hospital = await prisma.hospital.create({ data: { name: 'City Hospital', address: '123 Main St', phone: '555-1000', email: 'city@hospital.test' } })
  await prisma.bloodStock.create({ data: { hospitalId: hospital.id, bloodType: 'A+', quantity: 10 } })
  console.log('Created sample hospital and stock')

  // create admin and hospital users for testing
  await prisma.user.deleteMany()
  const seedPassword = process.env.SEED_DEFAULT_PASSWORD
  if (!seedPassword) {
    throw new Error('SEED_DEFAULT_PASSWORD must be set in backend/.env before running the seed script')
  }
  const adminPass = await bcrypt.hash(seedPassword, 10)
  const admin = await prisma.user.create({ data: { name: 'Admin', email: 'admin@bloodate.test', passwordHash: adminPass, role: 'SUPER_ADMIN' } })
  const hospitalAdmin = await prisma.user.create({ data: { name: 'Hospital Admin', email: 'hospital@bloodate.test', passwordHash: adminPass, role: 'HOSPITAL_ADMIN', hospitalId: hospital.id } })
  const hospitalStaff = await prisma.user.create({ data: { name: 'Hospital Staff', email: 'staff@bloodate.test', passwordHash: adminPass, role: 'HOSPITAL_STAFF', hospitalId: hospital.id } })
  console.log('Created admin user', admin.email)
  console.log('Created hospital admin', hospitalAdmin.email)
  console.log('Created hospital staff', hospitalStaff.email)
}

seed()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
