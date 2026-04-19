const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.$queryRaw`
      SELECT content FROM rag_documents WHERE content LIKE '%茅台%'
    `;
    console.log('Found documents:');
    result.forEach(r => console.log(' -', r.content));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();