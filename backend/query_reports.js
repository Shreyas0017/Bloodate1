const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const reports = await prisma.medicalReport.findMany({
    orderBy: { createdAt: 'desc' },
    take: 2,
    include: { upload: true }
  });
  console.log(JSON.stringify(reports, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
