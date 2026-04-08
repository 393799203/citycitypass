import { Router, type Request, type Response } from 'express';
import { ragService } from '../../services/rag';

const router = Router();

router.post('/add', async (req: Request, res: Response) => {
  try {
    const { content, metadata } = req.body;
    
    if (!content) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    const documentId = await ragService.addDocument(content, metadata || {});
    
    res.json({ success: true, data: { documentId } });
  } catch (error) {
    console.error('Add document error:', error);
    res.status(500).json({ success: false, message: 'Failed to add document' });
  }
});

router.post('/query', async (req: Request, res: Response) => {
  try {
    const { query, topK = 3 } = req.body;
    
    if (!query) {
      return res.status(400).json({ success: false, message: 'Query is required' });
    }

    const documents = await ragService.query(query, topK);
    
    res.json({ success: true, data: documents });
  } catch (error) {
    console.error('Query documents error:', error);
    res.status(500).json({ success: false, message: 'Failed to query documents' });
  }
});

router.get('/count', async (req: Request, res: Response) => {
  try {
    const count = ragService.getDocumentCount();
    res.json({ success: true, data: { count } });
  } catch (error) {
    console.error('Get document count error:', error);
    res.status(500).json({ success: false, message: 'Failed to get document count' });
  }
});

router.delete('/clear', async (req: Request, res: Response) => {
  try {
    ragService.clearDocuments();
    res.json({ success: true, message: 'Documents cleared successfully' });
  } catch (error) {
    console.error('Clear documents error:', error);
    res.status(500).json({ success: false, message: 'Failed to clear documents' });
  }
});

export default router;
