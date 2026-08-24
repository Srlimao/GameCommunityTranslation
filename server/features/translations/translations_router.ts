import { Router, Request, Response } from 'express';
import { TranslationsRepository } from './translations_repository.ts';
import { GamesRepository } from '../games/games_repository.ts';
import { GlossaryRepository } from '../glossary/glossary_repository.ts';
import { AIService } from '../ai_providers/ai_service.ts';
import { BatchTranslationQueue } from './batch_translation_queue.ts';

export const translationsRouter = Router();

// GET languages with completion stats
translationsRouter.get('/games/:gameId/languages', (req: Request, res: Response) => {
  try {
    const stats = TranslationsRepository.getLanguages(req.params.gameId);
    res.json({ success: true, languages: stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST add target language
translationsRouter.post('/games/:gameId/languages', (req: Request, res: Response) => {
  try {
    const { language_code, language_name } = req.body;
    if (!language_code || !language_name) {
      return res.status(400).json({ success: false, error: 'language_code and language_name are required' });
    }
    const lang = TranslationsRepository.addLanguage(req.params.gameId, language_code, language_name);
    res.json({ success: true, language: lang });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE language
translationsRouter.delete('/games/:gameId/languages/:languageId', (req: Request, res: Response) => {
  try {
    const success = TranslationsRepository.deleteLanguage(req.params.languageId);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET translations for a language
translationsRouter.get('/games/:gameId/translations/:languageCode', (req: Request, res: Response) => {
  try {
    const { status, search } = req.query;
    const items = TranslationsRepository.getTranslations(
      req.params.gameId,
      req.params.languageCode,
      { status: status as string, search: search as string }
    );
    res.json({ success: true, items });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update single translation
translationsRouter.put('/games/:gameId/translations/item', (req: Request, res: Response) => {
  try {
    const { key_id, language_id, translated_text, status, model_used } = req.body;
    if (!key_id || !language_id) {
      return res.status(400).json({ success: false, error: 'key_id and language_id are required' });
    }
    TranslationsRepository.updateTranslation({
      keyId: key_id,
      languageId: language_id,
      translatedText: translated_text || '',
      status,
      modelUsed: model_used,
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST translate single key with LM Studio
translationsRouter.post('/translate/single', async (req: Request, res: Response) => {
  try {
    const { gameId, languageCode, keyId, keyPath, sourceText, customInstructions } = req.body;
    const game = GamesRepository.getById(gameId);
    if (!game) return res.status(404).json({ success: false, error: 'Game not found' });

    const languages = TranslationsRepository.getLanguages(gameId);
    const targetLang = languages.find(l => l.language_code === languageCode);
    if (!targetLang) return res.status(404).json({ success: false, error: 'Language not found' });

    const glossary = GlossaryRepository.getByGame(gameId, languageCode);
    const userId = (req as any).user?.id;

    const { text: translatedText, modelUsed } = await AIService.translate({
      gameName: game.name,
      gameContext: game.context_prompt,
      baseLanguage: game.base_language || 'en-US',
      targetLanguageName: targetLang.language_name,
      targetLanguageCode: targetLang.language_code,
      keyPath,
      sourceText,
      glossary,
      customInstructions,
    }, userId);

    TranslationsRepository.updateTranslation({
      keyId,
      languageId: targetLang.language_id,
      translatedText,
      status: 'ai_translated',
      modelUsed,
    });

    res.json({ success: true, translatedText });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST start batch translation
translationsRouter.post('/translate/batch', async (req: Request, res: Response) => {
  try {
    const { gameId, languageCode, onlyUntranslated, customInstructions } = req.body;
    const userId = (req as any).user?.id;
    const queue = BatchTranslationQueue.getInstance();
    const jobId = await queue.startBatch({ gameId, languageCode, onlyUntranslated, customInstructions, userId });
    res.json({ success: true, jobId });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST cancel batch
translationsRouter.post('/translate/cancel', (req: Request, res: Response) => {
  const { jobId } = req.body;
  const queue = BatchTranslationQueue.getInstance();
  const success = queue.cancelJob(jobId);
  res.json({ success });
});

// GET SSE stream for live batch translation progress
translationsRouter.get('/translate/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const queue = BatchTranslationQueue.getInstance();

  const onProgress = (data: any) => {
    res.write(`event: progress\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const onKeyDone = (data: any) => {
    res.write(`event: keyTranslated\ndata: ${JSON.stringify(data)}\n\n`);
  };

  queue.on('progress', onProgress);
  queue.on('keyTranslated', onKeyDone);

  req.on('close', () => {
    queue.off('progress', onProgress);
    queue.off('keyTranslated', onKeyDone);
    res.end();
  });
});
