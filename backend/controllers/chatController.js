
import { processRAGQuery } from '../services/ragService.js';

export async function chat(req, res, next) {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'No message provided',
      });
    }

    const result = await processRAGQuery({
      query: message,
      history,
      userId: req.user.id,
    });

    res.json({
      success: true,
      answer: result.answer,
      sources: result.sources,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

export default { chat };
