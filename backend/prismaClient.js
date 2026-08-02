const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  log: ['error', 'warn'],
  errorFormat: 'minimal'
})

// Verify database connectivity on startup and exit if it fails.
// This surfaces misconfigured DATABASE_URL immediately rather than at
// runtime when the first query is made.
prisma.$connect()
  .then(() => console.log('✓ Database connected'))
  .catch((err) => {
    console.error('✗ Database connection failed:', err.message)
    process.exit(1)
  })

// Cleanly disconnect when the process exits.
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

module.exports = prisma
