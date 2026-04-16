const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');

const prisma = new PrismaClient();
const pool = new Pool({ connectionString: 'postgresql://dingyuebo@localhost:5432/citycitypass' });

const EMBEDDING_API = 'https://api.siliconflow.cn/v1/embeddings';
const EMBEDDING_MODEL = 'BAAI/bge-m3';
const API_KEY = 'sk-zgplwjaynnfbgmjwvdvtkmpabzhbwwhamxdfusaebuwnlwff';

async function generateEmbedding(text) {
  console.log('Calling embedding API...');
  const response = await fetch(EMBEDDING_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
    }),
  });

  const data = await response.json();
  console.log('Response status:', response.status);
  console.log('Response data:', JSON.stringify(data).substring(0, 500));

  if (data.error) {
    throw new Error(data.error.message || 'Embedding API error');
  }

  if (!data.data || !data.data[0]) {
    throw new Error('Invalid response format from embedding API');
  }

  return data.data[0].embedding;
}

async function updateEmbeddings() {
  console.log('Fetching documents without embeddings...');

  const docs = await prisma.$queryRaw`
    SELECT id, content FROM rag_documents WHERE embedding IS NULL OR embedding = ''
  `;

  console.log(`Found ${docs.length} documents without embeddings`);

  for (const doc of docs) {
    try {
      console.log(`\nGenerating embedding for document ${doc.id}...`);
      const embedding = await generateEmbedding(doc.content);
      const embeddingJson = JSON.stringify(embedding);

      await pool.query(
        'UPDATE rag_documents SET embedding = $1 WHERE id = $2',
        [embeddingJson, doc.id]
      );

      console.log(`  ✓ Updated document ${doc.id}`);
    } catch (err) {
      console.error(`  ✗ Failed to update document ${doc.id}:`, err.message);
      break;
    }
  }

  await prisma.$disconnect();
  await pool.end();
  console.log('\nDone!');
}

updateEmbeddings();