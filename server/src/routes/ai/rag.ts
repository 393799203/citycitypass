import { Router, Request, Response } from 'express';
import { ragService, SearchMode } from '../../services/rag';

const router = Router();

router.post('/add', async (req: Request, res: Response) => {
  try {
    const { content, metadata } = req.body;
    const ownerId = req.headers['x-owner-id'] as string;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Content is required'
      });
    }

    const id = await ragService.addDocument(content, metadata, ownerId);

    res.json({
      success: true,
      data: { id }
    });
  } catch (error: any) {
    console.error('Add document error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add document'
    });
  }
});

router.post('/add-batch', async (req: Request, res: Response) => {
  try {
    const { documents } = req.body;
    const ownerId = req.headers['x-owner-id'] as string;

    if (!documents || !Array.isArray(documents)) {
      return res.status(400).json({
        success: false,
        message: 'Documents array is required'
      });
    }

    const ids = await ragService.addDocuments(documents, ownerId);

    res.json({
      success: true,
      data: { ids, count: ids.length }
    });
  } catch (error: any) {
    console.error('Add documents batch error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add documents'
    });
  }
});

router.post('/search', async (req: Request, res: Response) => {
  try {
    const { query, topK, filters, mode } = req.body;
    const ownerId = req.headers['x-owner-id'] as string;

    const validMode = mode && Object.values(SearchMode).includes(mode) ? mode as SearchMode : undefined;

    const results = await ragService.search(query || '', {
      topK: topK || 5,
      filters,
      mode: validMode,
      ownerId
    });

    res.json({
      success: true,
      data: results
    });
  } catch (error: any) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Search failed'
    });
  }
});

router.post('/hybrid-search', async (req: Request, res: Response) => {
  try {
    const { query, topK, filters, vectorWeight, keywordWeight } = req.body;
    const ownerId = req.headers['x-owner-id'] as string;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query is required'
      });
    }

    const results = await ragService.search(query, {
      topK: topK || 5,
      filters,
      mode: SearchMode.HYBRID,
      ownerId
    });

    res.json({
      success: true,
      data: results
    });
  } catch (error: any) {
    console.error('Hybrid search error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Hybrid search failed'
    });
  }
});

router.delete('/delete/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await ragService.deleteDocument(id);

    res.json({
      success: deleted,
      message: deleted ? 'Document deleted' : 'Document not found'
    });
  } catch (error: any) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete document'
    });
  }
});

router.delete('/clear', async (req: Request, res: Response) => {
  try {
    const count = await ragService.deleteAllDocuments();

    res.json({
      success: true,
      data: { deletedCount: count }
    });
  } catch (error: any) {
    console.error('Clear documents error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to clear documents'
    });
  }
});

router.get('/count', async (req: Request, res: Response) => {
  try {
    const count = await ragService.getDocumentCount();

    res.json({
      success: true,
      data: { count }
    });
  } catch (error: any) {
    console.error('Get count error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get count'
    });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await ragService.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get stats'
    });
  }
});

router.get('/mode', async (req: Request, res: Response) => {
  try {
    const mode = ragService.getSearchMode();

    res.json({
      success: true,
      data: { mode }
    });
  } catch (error: any) {
    console.error('Get mode error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get mode'
    });
  }
});

router.post('/mode', async (req: Request, res: Response) => {
  try {
    const { mode } = req.body;

    if (!mode) {
      return res.status(400).json({
        success: false,
        message: 'Mode is required (keyword, vector, hybrid)'
      });
    }

    ragService.setSearchMode(mode as SearchMode);

    res.json({
      success: true,
      data: { mode: ragService.getSearchMode() }
    });
  } catch (error: any) {
    console.error('Set mode error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to set mode'
    });
  }
});

router.post('/update-embedding/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Document ID is required'
      });
    }

    const success = await ragService.updateEmbedding(id);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    res.json({
      success: true,
      message: 'Embedding updated successfully'
    });
  } catch (error: any) {
    console.error('Update embedding error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update embedding'
    });
  }
});

router.post('/generate-embedding', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Text is required'
      });
    }

    const embedding = await ragService.generateEmbedding(text);

    res.json({
      success: true,
      data: {
        embedding,
        dimension: embedding.length
      }
    });
  } catch (error: any) {
    console.error('Generate embedding error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate embedding'
    });
  }
});

export default router;