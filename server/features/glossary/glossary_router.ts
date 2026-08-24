import { Router, Request, Response } from 'express';
import { GlossaryRepository } from './glossary_repository.ts';

export const glossaryRouter = Router();

// GET glossary for game
glossaryRouter.get('/games/:gameId/glossary', (req: Request, res: Response) => {
  try {
    const { language } = req.query;
    const entries = GlossaryRepository.getByGame(req.params.gameId, language as string);
    res.json({ success: true, glossary: entries });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST single glossary entry
glossaryRouter.post('/games/:gameId/glossary', (req: Request, res: Response) => {
  try {
    const { source_term, target_term, target_language, category, notes } = req.body;
    if (!source_term || !target_term) {
      return res.status(400).json({ success: false, error: 'source_term and target_term are required' });
    }
    const entry = GlossaryRepository.add({
      game_id: req.params.gameId,
      source_term,
      target_term,
      target_language,
      category,
      notes,
    });
    res.json({ success: true, entry });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST batch add glossary entries (e.g. from Gemini AI Inspector)
glossaryRouter.post('/games/:gameId/glossary/batch', (req: Request, res: Response) => {
  try {
    const { entries } = req.body;
    if (!Array.isArray(entries)) {
      return res.status(400).json({ success: false, error: 'entries array is required' });
    }

    const prepared = entries.map((item: any) => ({
      game_id: req.params.gameId,
      source_term: item.source_term,
      target_term: item.target_term || item.suggested_translation,
      target_language: item.target_language || '',
      category: item.category || 'General',
      notes: item.explanation || item.notes || '',
    }));

    const addedCount = GlossaryRepository.addBatch(prepared);
    res.json({ success: true, addedCount });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update glossary entry
glossaryRouter.put('/games/:gameId/glossary/:id', (req: Request, res: Response) => {
  try {
    const { source_term, target_term, target_language, category, notes } = req.body;
    const updated = GlossaryRepository.update(req.params.id, {
      source_term,
      target_term,
      target_language,
      category,
      notes,
    });
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Glossary entry not found' });
    }
    res.json({ success: true, entry: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE glossary entry
glossaryRouter.delete('/games/:gameId/glossary/:id', (req: Request, res: Response) => {
  try {
    const success = GlossaryRepository.delete(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
