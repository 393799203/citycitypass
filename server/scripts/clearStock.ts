const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.stockIn.deleteMany({});
  await prisma.stockLock.deleteMany({});
  await prisma.stock.deleteMany({});
  console.log('All stock data cleared');
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
