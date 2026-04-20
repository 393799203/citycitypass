import { Pool } from 'pg';
import { getAIConfig } from '../config/ai';

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
  embedding?: boolean;
  score: number;
  rank: number;
}

interface SearchOptions {
  topK?: number;
  filters?: Record<string, any>;
  mode?: SearchMode;
  ownerId?: string;
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
      const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/zlai';
      this.pool = new Pool({ connectionString: databaseUrl });

      await this.checkVectorExtension();
      await this.ensureTables();
      await this.initializeKnowledgeBase();

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

  private async initializeKnowledgeBase() {
    if (!this.pool) return;

    // 检查是否需要初始化知识库
    const shouldInitialize = process.env.RAG_INITIALIZE_KNOWLEDGE_BASE === 'true';
    if (!shouldInitialize) {
      console.log('[RAG] Knowledge base initialization is disabled via environment variable');
      return;
    }

    const result = await this.pool.query('SELECT COUNT(*) FROM rag_documents');
    if (Number(result.rows[0].count) > 0) {
      console.log('[RAG] Knowledge base already exists, skipping init');
      return;
    }

    console.log('[RAG] Initializing knowledge base...');

    const knowledgeBase = [
      {
        originalId: 'fmt_order',
        type: 'format',
        category: 'order',
        title: '销售订单格式',
        content: '销售订单格式/订购/下单：{"intent": "create_order", "type": "sales_order", "data": {"ownerId": "主体ID", "receiver": "客户姓名", "phone": "电话", "province": "省份", "city": "城市", "address": "详细地址", "items": [{"productName": "商品名称", "spec": "规格", "packaging": "包装", "quantity": 数量}]}}'
      },
      {
        originalId: 'fmt_purchase',
        type: 'format',
        category: 'order',
        title: '采购订单格式',
        content: '采购订单格式/采购：{"intent": "create_purchase_order", "type": "purchase_order", "data": {"supplierId": "供应商ID", "warehouseId": "仓库ID", "orderDate": "订单日期", "expectedDate": "预计到货日期", "remark": "备注", "items": [{"productName": "商品名称", "itemType": "PRODUCT", "skuId": "SKU ID", "bundleId": "套装ID", "quantity": 数量, "price": 单价, "productionDate": "生产日期", "expireDate": "过期日期"}]}}'
      },
      {
        originalId: 'fmt_inbound',
        type: 'format',
        category: 'inventory',
        title: '入库单格式',
        content: '入库单格式/入库：{"intent": "create_inbound", "type": "inbound_order", "data": {"warehouseId": "仓库ID", "source": "PURCHASE", "remark": "备注", "purchaseOrderId": "采购单ID", "returnOrderId": "退货单ID", "items": [{"productName": "商品名称", "type": "PRODUCT", "skuId": "SKU ID", "bundleId": "套装ID", "supplierMaterialId": "供应商物料ID", "quantity": 数量, "locationId": "库位ID", "skuBatchId": "SKU批次ID", "bundleBatchId": "套装批次ID"}]}}'
      },
      {
        originalId: 'fmt_dispatch',
        type: 'format',
        category: 'dispatch',
        title: '调度配送格式',
        content: '调度配送格式：{"intent": "create_dispatch", "type": "dispatch_order", "data": {"orderId": null, "items": [{"orderItemId": null, "vehicleId": null, "driverId": null}]}}'
      },
      {
        originalId: 'prod_maotai',
        type: 'product',
        category: 'product',
        title: '茅台商品规格',
        content: '【茅台商品】品牌：茅台 规格：500ml 包装：箱(6瓶)/双瓶/单瓶 价格：箱(6瓶)约9500元/双瓶约3300元/单瓶约1700元'
      },
      {
        originalId: 'prod_qingdao',
        type: 'product',
        category: 'product',
        title: '青岛啤酒商品规格',
        content: '【青岛啤酒】品牌：青岛啤酒 规格：500ml/330ml 包装：箱(12瓶)/箱(24瓶)/瓶 啤酒类商品常用包装：箱(12瓶)、箱(24瓶)、瓶装'
      },
      {
        originalId: 'rule_order_cancel',
        type: 'rule',
        category: 'order',
        title: '订单取消规则',
        content: '订单取消规则：订单只有在一键待审核、待确认、待配货、已确认、待发货状态下可以取消。已发货、已配送、已完成、已取消的订单不能取消。'
      },
      {
        originalId: 'rule_stock',
        type: 'rule',
        category: 'inventory',
        title: '库存查询规则',
        content: '库存查询规则：库存按SKU和仓库维度存储。可以通过商品名称、品牌、SKU编码搜索库存。库存不足时需要先入库再出库。'
      },
      {
        originalId: 'rule_batch',
        type: 'rule',
        category: 'batch',
        title: '批次追踪规则',
        content: '批次追踪规则：批次记录商品的入库和出库历史。每笔入库生成批次号，每笔出库关联批次号。支持按批次号查询商品流向。'
      },
      {
        originalId: 'proc_order_create',
        type: 'process',
        category: 'order',
        title: '创建订单流程',
        content: '创建订单流程：1) 填写客户信息(姓名、电话、地址) 2) 选择商品(名称、规格、包装、数量) 3) 确认订单信息 4) 提交审核。订单创建后需要审核才能配货。'
      },
      {
        originalId: 'proc_dispatch',
        type: 'process',
        category: 'dispatch',
        title: '调度配送流程',
        content: '调度配送流程：1) 查看待配送订单 2) 选择订单进行调度 3) 分配车辆和司机 4) 确认发车。配送完成后系统自动更新订单状态。'
      },
      {
        originalId: 'proc_return',
        type: 'process',
        category: 'return',
        title: '退货处理流程',
        content: '退货处理流程：客户申请退货 → 审核通过 → 仓库收货 → 质检(合格/不合格) → 合格商品入库 → 退款给客户。退货单需要关联原订单。'
      }
    ];

    for (const doc of knowledgeBase) {
      try {
        const embedding = await this.generateEmbedding(doc.content);
        await this.pool.query(`
          INSERT INTO rag_documents (content, metadata, embedding)
          VALUES ($1, $2, $3)
        `, [doc.content, JSON.stringify({
          originalId: doc.originalId,
          type: doc.type,
          category: doc.category,
          title: doc.title
        }), JSON.stringify(embedding)]);
      } catch (error) {
        console.error(`[RAG] Failed to insert document ${doc.originalId}:`, error);
      }
    }

    console.log(`[RAG] Knowledge base initialized with ${knowledgeBase.length} documents`);
  }

  private async ensureInitialized() {
    if (this.initialized) return;
    if (this.initPromise) {
      await this.initPromise;
    } else {
      this.initPromise = this._doInit();
      await this.initPromise;
    }
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
          owner_id UUID,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_rag_documents_metadata
        ON rag_documents USING GIN (metadata)
      `);

      // 添加 owner_id 列（如果表已存在但没有该列）
      try {
        await client.query(`
          ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS owner_id UUID
        `);
      } catch (e) {
        // 列可能已存在，忽略错误
      }

      // 创建 owner_id 索引
      try {
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_rag_documents_owner_id
          ON rag_documents (owner_id)
        `);
      } catch (e) {
        // 索引可能已存在，忽略错误
      }

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
    metadata?: Record<string, any>,
    ownerId?: string
  ): Promise<string> {
    await this.ensureInitialized();

    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    const embedding = await this.generateEmbedding(content);

    const result = await this.pool.query(`
      INSERT INTO rag_documents (content, metadata, embedding, owner_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [content, JSON.stringify(metadata || {}), JSON.stringify(embedding), ownerId || null]);

    return result.rows[0].id;
  }

  async addDocuments(
    documents: Array<{ content: string; metadata?: Record<string, any> }>,
    ownerId?: string
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
          INSERT INTO rag_documents (content, metadata, embedding, owner_id)
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `, [doc.content, JSON.stringify(doc.metadata || {}), JSON.stringify(embedding), ownerId || null]);

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

    const { topK = DEFAULT_TOP_K, filters, mode, ownerId } = options;
    let searchMode = mode || this.searchMode;

    if ((searchMode === SearchMode.VECTOR || searchMode === SearchMode.HYBRID) && !this.hasVectorExtension) {
      searchMode = SearchMode.KEYWORD;
      console.log('[RAG] Vector extension not available, falling back to KEYWORD mode');
    }

    switch (searchMode) {
      case SearchMode.VECTOR:
        return this.vectorSearch(query, topK, filters, ownerId);
      case SearchMode.HYBRID:
        return this.hybridSearch(query, topK, filters, ownerId);
      case SearchMode.KEYWORD:
      default:
        return this.keywordSearch(query, topK, filters, ownerId);
    }
  }

  private async vectorSearch(
    query: string,
    topK: number,
    filters?: Record<string, any>,
    ownerId?: string
  ): Promise<SearchResult[]> {
    console.log(`[RAG] Vector search for query: "${query}"`);
    const queryEmbedding = await this.generateEmbedding(query);
    console.log(`[RAG] Generated query embedding (first 5 values):`, queryEmbedding.slice(0, 5));

    // 先获取所有文档的嵌入向量，以便调试
    const allDocsResult = await this.pool!.query(`
      SELECT id, content, metadata, embedding
      FROM rag_documents
      WHERE embedding IS NOT NULL
    `);
    console.log(`[RAG] Found ${allDocsResult.rows.length} documents with embedding`);
    
    // 打印所有文档的内容和嵌入向量（前5个值）
    for (const doc of allDocsResult.rows) {
      console.log(`[RAG] Document: ${doc.content.substring(0, 50)}...`);
      try {
        const docEmbedding = JSON.parse(doc.embedding);
        console.log(`[RAG] Embedding (first 5 values):`, docEmbedding.slice(0, 5));
      } catch (error) {
        console.error(`[RAG] Failed to parse embedding for document ${doc.id}:`, error);
      }
    }

    let queryStr = `
      SELECT
        id,
        content,
        metadata,
        embedding,
        1 - (embedding::vector <=> $1::vector) as score,
        ROW_NUMBER() OVER (ORDER BY (1 - (embedding::vector <=> $1::vector)) DESC) as rank
      FROM rag_documents
      WHERE embedding IS NOT NULL
    `;

    const params: any[] = [JSON.stringify(queryEmbedding)];
    let paramIndex = 2;

    if (ownerId) {
      queryStr += ` AND owner_id = $${paramIndex}`;
      params.push(ownerId);
      paramIndex++;
    }

    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        queryStr += ` AND metadata->>'${key}' = $${paramIndex}`;
        params.push(value);
        paramIndex++;
      }
    }

    queryStr += ` ORDER BY embedding::vector <=> $1::vector LIMIT $${paramIndex}`;
    params.push(topK);

    console.log(`[RAG] Executing vector search query with params:`, params);
    const result = await this.pool!.query(queryStr, params);
    console.log(`[RAG] Vector search returned ${result.rows.length} results`);

    const searchResults = result.rows.map(row => ({
      id: row.id,
      content: row.content,
      metadata: row.metadata,
      embedding: !!row.embedding,
      score: Number(row.score),
      rank: Number(row.rank)
    }));

    console.log(`[RAG] Search results:`, searchResults.map(r => ({ id: r.id, score: r.score, content: r.content.substring(0, 50) })));
    return searchResults;
  }

  private async keywordSearch(
    query: string,
    topK: number,
    filters?: Record<string, any>,
    ownerId?: string
  ): Promise<SearchResult[]> {
    // 处理空查询的情况
    if (!query || query.trim() === '') {
      const limit = Number(topK);
      let queryStr = `
        SELECT
          id,
          content,
          metadata,
          embedding,
          0 as score,
          ROW_NUMBER() OVER (ORDER BY created_at DESC) as rank
        FROM rag_documents
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (ownerId) {
        queryStr += ` AND owner_id = $${paramIndex}`;
        params.push(ownerId);
        paramIndex++;
      }

      queryStr += ` LIMIT $${paramIndex}`;
      params.push(limit);

      const result = await this.pool!.query(queryStr, params);

      return result.rows.map(row => ({
        id: row.id,
        content: row.content,
        metadata: row.metadata,
        embedding: !!row.embedding,
        score: Number(row.score),
        rank: Number(row.rank)
      }));
    }

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

    // 如果没有搜索词，返回所有文档
    if (uniquePatterns.length === 0) {
      const limit = Number(topK);
      let queryStr = `
        SELECT
          id,
          content,
          metadata,
          embedding,
          0 as score,
          ROW_NUMBER() OVER (ORDER BY created_at DESC) as rank
        FROM rag_documents
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (ownerId) {
        queryStr += ` AND owner_id = $${paramIndex}`;
        params.push(ownerId);
        paramIndex++;
      }

      queryStr += ` LIMIT $${paramIndex}`;
      params.push(limit);

      const result = await this.pool!.query(queryStr, params);

      return result.rows.map(row => ({
        id: row.id,
        content: row.content,
        metadata: row.metadata,
        embedding: !!row.embedding,
        score: Number(row.score),
        rank: Number(row.rank)
      }));
    }

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
        embedding,
        ${scoreCases} as score,
        ROW_NUMBER() OVER (ORDER BY ${scoreCases} DESC) as rank
      FROM rag_documents
      WHERE ${whereCases}
    `;

    const params: any[] = [...uniquePatterns];
    let paramIndex = uniquePatterns.length + 1;

    if (ownerId) {
      queryStr += ` AND owner_id = $${paramIndex}`;
      params.push(ownerId);
      paramIndex++;
    }

    queryStr += ` ORDER BY ${scoreCases} DESC LIMIT $${paramIndex}`;
    params.push(Number(topK));

    const result = await this.pool!.query(queryStr, params);

    return result.rows.map(row => ({
      id: row.id,
      content: row.content,
      metadata: row.metadata,
      embedding: !!row.embedding,
      score: Number(row.score),
      rank: Number(row.rank)
    }));
  }

  private async hybridSearch(
    query: string,
    topK: number,
    filters?: Record<string, any>,
    ownerId?: string,
    vectorWeight: number = 0.5,
    keywordWeight: number = 0.5
  ): Promise<SearchResult[]> {
    // 处理空查询的情况
    if (!query || query.trim() === '') {
      const limit = Number(topK);
      let queryStr = `
        SELECT
          id,
          content,
          metadata,
          embedding,
          0 as score,
          ROW_NUMBER() OVER (ORDER BY created_at DESC) as rank
        FROM rag_documents
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (ownerId) {
        queryStr += ` AND owner_id = $${paramIndex}`;
        params.push(ownerId);
        paramIndex++;
      }

      queryStr += ` LIMIT $${paramIndex}`;
      params.push(limit);

      const result = await this.pool!.query(queryStr, params);

      return result.rows.map(row => ({
        id: row.id,
        content: row.content,
        metadata: row.metadata,
        embedding: !!row.embedding,
        score: Number(row.score),
        rank: Number(row.rank)
      }));
    }

    const queryEmbedding = await this.generateEmbedding(query);
    const searchTerms = query.split(/\s+/).filter(w => w.length > 0);

    const likePatterns: string[] = searchTerms.map(term => `%${term}%`);
    const uniquePatterns = [...new Set(likePatterns)].slice(0, 5);

    // 处理没有搜索词的情况
    if (uniquePatterns.length === 0) {
      const limit = Number(topK);
      let queryStr = `
        SELECT
          id,
          content,
          metadata,
          embedding,
          0 as score,
          ROW_NUMBER() OVER (ORDER BY created_at DESC) as rank
        FROM rag_documents
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (ownerId) {
        queryStr += ` AND owner_id = $${paramIndex}`;
        params.push(ownerId);
        paramIndex++;
      }

      queryStr += ` LIMIT $${paramIndex}`;
      params.push(limit);

      const result = await this.pool!.query(queryStr, params);

      return result.rows.map(row => ({
        id: row.id,
        content: row.content,
        metadata: row.metadata,
        embedding: !!row.embedding,
        score: Number(row.score),
        rank: Number(row.rank)
      }));
    }

    const ownerFilter = ownerId ? ' AND owner_id = $1' : '';
    const paramOffset = ownerId ? 1 : 0;

    const queryStr = `
      WITH vector_results AS (
        SELECT
          id,
          content,
          metadata,
          embedding,
          1 - (embedding::vector <=> $${1 + paramOffset}::vector) as vector_score,
          ROW_NUMBER() OVER (ORDER BY (1 - (embedding::vector <=> $${1 + paramOffset}::vector)) DESC) as vector_rank
        FROM rag_documents
        WHERE embedding IS NOT NULL${ownerFilter}
      ),
      keyword_results AS (
        SELECT
          id,
          ${uniquePatterns.map((_, i) =>
            `CASE WHEN content ILIKE $${1 + paramOffset + 1 + i} THEN 1 ELSE 0 END`
          ).join(' + ')} as keyword_score,
          ROW_NUMBER() OVER (ORDER BY (${uniquePatterns.map((_, i) =>
            `CASE WHEN content ILIKE $${1 + paramOffset + 1 + i} THEN 1 ELSE 0 END`
          ).join(' + ')}) DESC) as keyword_rank
        FROM rag_documents
        WHERE ${uniquePatterns.map((_, i) => `content ILIKE $${1 + paramOffset + 1 + i}`).join(' OR ')}${ownerFilter}
      )
      SELECT
        v.id,
        v.content,
        v.metadata,
        v.embedding,
        (${vectorWeight} * COALESCE(v.vector_score / NULLIF(v.vector_rank, 0), 0) +
         ${keywordWeight} * COALESCE(k.keyword_score / NULLIF(k.keyword_rank, 0), 0)) as score,
        ROW_NUMBER() OVER (ORDER BY (${vectorWeight} * COALESCE(v.vector_score / NULLIF(v.vector_rank, 0), 0) +
         ${keywordWeight} * COALESCE(k.keyword_score / NULLIF(k.keyword_rank, 0), 0)) DESC) as rank
      FROM vector_results v
      LEFT JOIN keyword_results k ON v.id = k.id
      ORDER BY rank
      LIMIT $${1 + paramOffset + 1 + uniquePatterns.length}
    `;

    const params: any[] = ownerId
      ? [ownerId, JSON.stringify(queryEmbedding), ...uniquePatterns, topK]
      : [JSON.stringify(queryEmbedding), ...uniquePatterns, topK];

    const result = await this.pool!.query(queryStr, params);

    return result.rows.map(row => ({
      id: row.id,
      content: row.content,
      metadata: row.metadata,
      embedding: !!row.embedding,
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
      // 使用SiliconFlow的嵌入向量API
      const aiConfig = getAIConfig();
      console.log(`[RAG] Using AI config for embedding: ${aiConfig.name}`);
      
      // SiliconFlow的embedding API端点
      const embeddingApiUrl = aiConfig.apiUrl.replace('/chat/completions', '/embeddings');
      const response = await fetch(embeddingApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: 'BAAI/bge-m3',  // 使用支持中文的embedding模型
          input: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Embedding API error: ${response.status}`);
      }

      const data: any = await response.json();
      console.log(`[RAG] Embedding API response:`, JSON.stringify(data).substring(0, 200));
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

  async updateEmbedding(id: string): Promise<boolean> {
    await this.ensureInitialized();

    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    // 先获取文档内容
    const docResult = await this.pool.query(`
      SELECT content FROM rag_documents WHERE id = $1
    `, [id]);

    if (docResult.rowCount === 0) {
      return false;
    }

    const content = docResult.rows[0].content;
    const embedding = await this.generateEmbedding(content);

    // 更新向量嵌入
    const updateResult = await this.pool.query(`
      UPDATE rag_documents
      SET embedding = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [JSON.stringify(embedding), id]);

    return (updateResult.rowCount || 0) > 0;
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