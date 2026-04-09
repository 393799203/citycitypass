import { Pool } from 'pg';

const EMBEDDING_DIMENSION = 1536;
const DEFAULT_TOP_K = 5;

enum SearchMode {
  KEYWORD = 'keyword',
  VECTOR = 'vector',
  HYBRID = 'hybrid'
}

interface SearchResult {
  id: string;
  content: string;
  metadata?: Record<string, any>;
  score: number;
  rank: number;
}

interface SearchOptions {
  topK?: number;
  filters?: Record<string, any>;
  mode?: SearchMode;
}

class RAGService {
  private pool: Pool | null = null;
  private hasVectorExtension: boolean = false;
  private searchMode: SearchMode = SearchMode.KEYWORD;
  private embeddingCache: Map<string, { embedding: number[]; timestamp: number }> = new Map();
  private readonly EMBEDDING_CACHE_TTL = 5 * 60 * 1000;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPool();
  }

  private async initPool() {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._doInit();
    return this.initPromise;
  }

  private async _doInit() {
    try {
      const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/citycitypass';
      this.pool = new Pool({ connectionString: databaseUrl });

      await this.checkVectorExtension();
      await this.ensureTables();

      const mode = process.env.RAG_SEARCH_MODE as SearchMode;
      if (mode && Object.values(SearchMode).includes(mode)) {
        this.searchMode = mode;
      } else {
        this.searchMode = this.hasVectorExtension ? SearchMode.HYBRID : SearchMode.KEYWORD;
      }

      console.log(`[RAG] Search mode: ${this.searchMode}, Vector extension: ${this.hasVectorExtension}`);
      this.initialized = true;
    } catch (error) {
      console.error('[RAG] Failed to initialize:', error);
      this.pool = null;
    }
  }

  private async ensureInitialized() {
    if (this.initialized) return;
    if (this.initPromise) await this.initPromise;
  }

  private async checkVectorExtension(): Promise<boolean> {
    if (!this.pool) return false;

    try {
      const result = await this.pool.query(`
        SELECT * FROM pg_extension WHERE extname = 'vector'
      `);
      this.hasVectorExtension = result.rows.length > 0;
      return this.hasVectorExtension;
    } catch (error) {
      console.error('[RAG] Failed to check vector extension:', error);
      return false;
    }
  }

  private async ensureTables(): Promise<void> {
    if (!this.pool) return;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(`
        CREATE TABLE IF NOT EXISTS rag_documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          content TEXT NOT NULL,
          metadata JSONB DEFAULT '{}',
          embedding TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_rag_documents_metadata
        ON rag_documents USING GIN (metadata)
      `);

      await client.query('COMMIT');
      console.log('[RAG] Tables ready');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[RAG] Failed to create tables:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async addDocument(
    content: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    await this.ensureInitialized();

    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    const embedding = await this.generateEmbedding(content);

    const result = await this.pool.query(`
      INSERT INTO rag_documents (content, metadata, embedding)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [content, JSON.stringify(metadata || {}), JSON.stringify(embedding)]);

    return result.rows[0].id;
  }

  async addDocuments(
    documents: Array<{ content: string; metadata?: Record<string, any> }>
  ): Promise<string[]> {
    await this.ensureInitialized();

    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const ids: string[] = [];

      for (const doc of documents) {
        const embedding = await this.generateEmbedding(doc.content);

        const result = await client.query(`
          INSERT INTO rag_documents (content, metadata, embedding)
          VALUES ($1, $2, $3)
          RETURNING id
        `, [doc.content, JSON.stringify(doc.metadata || {}), JSON.stringify(embedding)]);

        ids.push(result.rows[0].id);
      }

      await client.query('COMMIT');
      return ids;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async search(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    await this.ensureInitialized();

    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    const { topK = DEFAULT_TOP_K, filters, mode } = options;
    const searchMode = mode || this.searchMode;

    switch (searchMode) {
      case SearchMode.VECTOR:
        return this.vectorSearch(query, topK, filters);
      case SearchMode.HYBRID:
        return this.hybridSearch(query, topK, filters);
      case SearchMode.KEYWORD:
      default:
        return this.keywordSearch(query, topK, filters);
    }
  }

  private async vectorSearch(
    query: string,
    topK: number,
    filters?: Record<string, any>
  ): Promise<SearchResult[]> {
    const queryEmbedding = await this.generateEmbedding(query);

    let queryStr = `
      SELECT
        id,
        content,
        metadata,
        1 - (embedding::vector <=> $1::vector) as score,
        ROW_NUMBER() OVER (ORDER BY (1 - (embedding::vector <=> $1::vector)) DESC) as rank
      FROM rag_documents
      WHERE embedding IS NOT NULL
    `;

    const params: any[] = [JSON.stringify(queryEmbedding)];
    let paramIndex = 2;

    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        queryStr += ` AND metadata->>'${key}' = $${paramIndex}`;
        params.push(value);
        paramIndex++;
      }
    }

    queryStr += ` ORDER BY embedding::vector <=> $1::vector LIMIT $${paramIndex}`;
    params.push(topK);

    const result = await this.pool!.query(queryStr, params);

    return result.rows.map(row => ({
      id: row.id,
      content: row.content,
      metadata: row.metadata,
      score: Number(row.score),
      rank: Number(row.rank)
    }));
  }

  private async keywordSearch(
    query: string,
    topK: number,
    filters?: Record<string, any>
  ): Promise<SearchResult[]> {
    let searchTerms = query.split(/\s+/).filter(w => w.length > 0);

    if (searchTerms.length === 1 && /[\u4e00-\u9fa5]/.test(searchTerms[0])) {
      const term = searchTerms[0];
      searchTerms = [];
      for (let i = 0; i < term.length - 1; i++) {
        searchTerms.push(term.substring(i, i + 2));
      }
    }

    const likePatterns: string[] = [];
    for (const term of searchTerms) {
      likePatterns.push(`%${term}%`);
    }
    const uniquePatterns = [...new Set(likePatterns)].slice(0, 10);

    const scoreCases = uniquePatterns.map((_, i) =>
      `CASE WHEN content ILIKE $${i + 1} THEN 0.1 ELSE 0 END`
    ).join(' + ');

    const whereCases = uniquePatterns.map((_, i) =>
      `content ILIKE $${i + 1}`
    ).join(' OR ');

    let queryStr = `
      SELECT
        id,
        content,
        metadata,
        ${scoreCases} as score,
        ROW_NUMBER() OVER (ORDER BY ${scoreCases} DESC) as rank
      FROM rag_documents
      WHERE ${whereCases}
      ORDER BY ${scoreCases} DESC
      LIMIT ${Number(topK)}
    `;

    const params: any[] = [...uniquePatterns];

    const result = await this.pool!.query(queryStr, params);

    return result.rows.map(row => ({
      id: row.id,
      content: row.content,
      metadata: row.metadata,
      score: Number(row.score),
      rank: Number(row.rank)
    }));
  }

  private async hybridSearch(
    query: string,
    topK: number,
    filters?: Record<string, any>,
    vectorWeight: number = 0.5,
    keywordWeight: number = 0.5
  ): Promise<SearchResult[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    const searchTerms = query.split(/\s+/).filter(w => w.length > 0);

    const likePatterns: string[] = searchTerms.map(term => `%${term}%`);
    const uniquePatterns = [...new Set(likePatterns)].slice(0, 5);

    let queryStr = `
      WITH vector_results AS (
        SELECT
          id,
          content,
          metadata,
          1 - (embedding::vector <=> $1::vector) as vector_score,
          ROW_NUMBER() OVER (ORDER BY (1 - (embedding::vector <=> $1::vector)) DESC) as vector_rank
        FROM rag_documents
        WHERE embedding IS NOT NULL
      ),
      keyword_results AS (
        SELECT
          id,
          ${uniquePatterns.map((_, i) =>
            `CASE WHEN content ILIKE $${i + 2} THEN 1 ELSE 0 END`
          ).join(' + ')} as keyword_score,
          ROW_NUMBER() OVER (ORDER BY (${uniquePatterns.map((_, i) =>
            `CASE WHEN content ILIKE $${i + 2} THEN 1 ELSE 0 END`
          ).join(' + ')}) DESC) as keyword_rank
        FROM rag_documents
        WHERE ${uniquePatterns.map((_, i) => `content ILIKE $${i + 2}`).join(' OR ')}
      )
      SELECT
        v.id,
        v.content,
        v.metadata,
        (${vectorWeight} * COALESCE(v.vector_score / NULLIF(v.vector_rank, 0), 0) +
         ${keywordWeight} * COALESCE(k.keyword_score / NULLIF(k.keyword_rank, 0), 0)) as score,
        ROW_NUMBER() OVER (ORDER BY (${vectorWeight} * COALESCE(v.vector_score / NULLIF(v.vector_rank, 0), 0) +
         ${keywordWeight} * COALESCE(k.keyword_score / NULLIF(k.keyword_rank, 0), 0)) DESC) as rank
      FROM vector_results v
      LEFT JOIN keyword_results k ON v.id = k.id
      ORDER BY rank
      LIMIT ${Number(topK)}
    `;

    const params: any[] = [JSON.stringify(queryEmbedding), ...uniquePatterns];

    const result = await this.pool!.query(queryStr, params);

    return result.rows.map(row => ({
      id: row.id,
      content: row.content,
      metadata: row.metadata,
      score: Number(row.score),
      rank: Number(row.rank)
    }));
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const cacheKey = text.toLowerCase().trim();
    const now = Date.now();
    const cached = this.embeddingCache.get(cacheKey);

    if (cached && (now - cached.timestamp) < this.EMBEDDING_CACHE_TTL) {
      console.log(`[RAG] Cache hit: "${text.substring(0, 30)}..."`);
      return cached.embedding;
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY || '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'}`,
        },
        body: JSON.stringify({
          model: 'openai/text-embedding-3-small',
          input: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Embedding API error: ${response.status}`);
      }

      const data: any = await response.json();
      const embedding = data.data[0].embedding;

      this.embeddingCache.set(cacheKey, { embedding, timestamp: now });

      if (this.embeddingCache.size > 1000) {
        const oldestKey = [...this.embeddingCache.entries()]
          .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
        this.embeddingCache.delete(oldestKey);
      }

      return embedding;
    } catch (error) {
      console.error('[RAG] Failed to generate embedding:', error);
      return this.generateFallbackEmbedding(text);
    }
  }

  private generateFallbackEmbedding(text: string): number[] {
    const hash = this.simpleHash(text);
    const embedding: number[] = [];

    for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
      embedding.push(((hash * (i + 1)) % 1000) / 1000 - 0.5);
    }

    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  async deleteDocument(id: string): Promise<boolean> {
    await this.ensureInitialized();

    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    const result = await this.pool.query(`
      DELETE FROM rag_documents WHERE id = $1
    `, [id]);

    return (result.rowCount || 0) > 0;
  }

  async deleteAllDocuments(): Promise<number> {
    await this.ensureInitialized();

    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    const result = await this.pool.query(`DELETE FROM rag_documents`);
    return result.rowCount || 0;
  }

  async getDocumentCount(): Promise<number> {
    await this.ensureInitialized();

    if (!this.pool) {
      return 0;
    }

    const result = await this.pool.query(`
      SELECT COUNT(*) as count FROM rag_documents
    `);

    return Number(result.rows[0].count);
  }

  async getStats(): Promise<{
    totalDocuments: number;
    hasVectorExtension: boolean;
    searchMode: string;
    embeddingDimension: number;
  }> {
    await this.ensureInitialized();

    return {
      totalDocuments: await this.getDocumentCount(),
      hasVectorExtension: this.hasVectorExtension,
      searchMode: this.searchMode,
      embeddingDimension: EMBEDDING_DIMENSION,
    };
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.initialized = false;
    }
  }

  getSearchMode(): SearchMode {
    return this.searchMode;
  }

  setSearchMode(mode: SearchMode): void {
    if (!Object.values(SearchMode).includes(mode)) {
      throw new Error(`Invalid search mode: ${mode}`);
    }
    this.searchMode = mode;
    console.log(`[RAG] Search mode changed to: ${mode}`);
  }
}

export const ragService = new RAGService();
export { SearchMode };
export default RAGService;