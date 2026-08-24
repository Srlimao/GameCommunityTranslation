import { Router, Request, Response } from 'express';
import { GamesRepository } from '../games/games_repository.ts';
import { TranslationsRepository } from '../translations/translations_repository.ts';
import { GlossaryRepository } from '../glossary/glossary_repository.ts';
import { GlossaryExtractor } from './glossary_extractor.ts';
import { AIService } from '../ai_providers/ai_service.ts';

export const geminiRouter = Router();

// POST test Gemini connection
geminiRouter.post('/test', async (req: Request, res: Response) => {
  try {
    const { apiKey, model } = req.body;
    const result = await AIService.testProvider('gemini', { apiKey, model });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, models: [] });
  }
});

// POST analyze game translations with Gemini to extract glossary and QA checks
geminiRouter.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { gameId, languageCode } = req.body;
    if (!gameId || !languageCode) {
      return res.status(400).json({ success: false, error: 'gameId and languageCode are required' });
    }

    const game = GamesRepository.getById(gameId);
    if (!game) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }

    const languages = TranslationsRepository.getLanguages(gameId);
    const targetLang = languages.find(l => l.language_code === languageCode);
    if (!targetLang) {
      return res.status(404).json({ success: false, error: 'Language not found' });
    }

    const existingGlossary = GlossaryRepository.getByGame(gameId, languageCode);
    const translations = TranslationsRepository.getTranslations(gameId, languageCode);

    const validPairs = translations
      .filter(t => t.translated_text && t.translated_text.trim().length > 0)
      .map(t => ({
        keyPath: t.key_path,
        sourceText: t.source_text,
        translatedText: t.translated_text,
      }));

    if (validPairs.length === 0) {
      return res.json({
        success: true,
        candidates: [],
        issues: [],
        message: 'No translated keys available for analysis yet. Translate some keys first!',
      });
    }

    const analysis = await GlossaryExtractor.analyzeTranslations({
      gameName: game.name,
      gameContext: game.context_prompt,
      targetLanguageName: targetLang.language_name,
      targetLanguageCode: targetLang.language_code,
      existingGlossary,
      translationPairs: validPairs,
      userId: (req as any).user?.id,
    });

    res.json({
      success: true,
      candidates: analysis.candidates,
      issues: analysis.issues,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
