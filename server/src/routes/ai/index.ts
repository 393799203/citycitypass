import { Router, type Request, type Response } from 'express';
import imageRouter from './image';
import ragRouter from './rag';
import { callAI } from '../../api/ai';

const router = Router();

router.use('/image', imageRouter);
router.use('/rag', ragRouter);

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'AI service is healthy' });
});

router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { prompt, history, images } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid prompt format' });
    }

    const result = await callAI(prompt, history, images);

    if (!result.success) {
      return res.status(200).json({
        success: false,
        error: result.error
      });
    }

    res.json({ success: true, data: { content: result.data } });
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 500,
        message: error.message || 'Chat failed'
      }
    });
  }
});

export default router;
