import { GlossaryCandidate, TranslationIssue, AIProviderType } from '../types/client_types.ts';
import { CloudGamesStore } from './cloud_games_store.ts';
import { CloudTranslationsStore } from './cloud_translations_store.ts';
import { CloudGlossaryStore } from './cloud_glossary_store.ts';
import { CloudSettingsStore } from './cloud_settings_store.ts';
import { BrowserAIService } from '../features/ai/browser_ai_service.ts';

export class QaApiService {
  static async analyzeWithGemini(gameId: string, languageCode: string): Promise<{ candidates: GlossaryCandidate[]; issues: TranslationIssue[]; message?: string }> {
    const game = await CloudGamesStore.getGame(gameId);
    if (!game) throw new Error('Game not found');
    const targetLang = game.languages?.find((l) => l.language_code === languageCode);
    const glossary = await CloudGlossaryStore.getGlossary(gameId, languageCode);
    const translations = await CloudTranslationsStore.getTranslations(gameId, languageCode);
    const settings = await CloudSettingsStore.getSettings();

    const totalValid = translations.filter((t) => t.source_text?.trim() && t.translated_text?.trim());
    const validPairs = totalValid.slice(0, 150);
    if (validPairs.length === 0) return { candidates: [], issues: [], message: 'No translated pairs to inspect.' };

    const glossaryList = glossary.map((g) => `- "${g.source_term}" -> "${g.target_term}"`).join('\n');
    const pairsList = validPairs.map((p, idx) => `[Item ${idx + 1}] Key: ${p.key_path}\nSource: "${p.source_text}"\nTranslation: "${p.translated_text}"`).join('\n\n');
    const systemInstruction = 'You are a Lead Game Localization Director. Analyze translated pairs against source text and lore. Output valid JSON with "candidates" and "issues".';
    const prompt = `Game: ${game.name}\n${game.context_prompt ? `Lore:\n${game.context_prompt}\n` : ''}Target: ${targetLang?.language_name || languageCode} (${languageCode})\nGlossary:\n${glossaryList || 'None'}\n\nTranslation Pairs:\n${pairsList}`;

    const res = await BrowserAIService.generateStructuredJson<{ candidates?: GlossaryCandidate[]; issues?: TranslationIssue[] }>(prompt, systemInstruction, settings);
    const message = totalValid.length > validPairs.length
      ? `AI QA completed: Audited top ${validPairs.length} of ${totalValid.length} translated keys.`
      : `AI QA completed: Audited all ${validPairs.length} translated keys.`;

    return { candidates: res.candidates || [], issues: res.issues || [], message };
  }

  static async fixSingleIssue(params: {
    gameId: string; languageCode: string; issue: { key_path: string; source_text: string; translated_text: string; issue_type: string; message: string };
  }): Promise<{ fixed_translation: string; explanation?: string }> {
    const game = await CloudGamesStore.getGame(params.gameId);
    if (!game) throw new Error('Game not found');
    const targetLang = game.languages?.find((l) => l.language_code === params.languageCode);
    const settings = await CloudSettingsStore.getSettings();
    const langLabel = targetLang?.language_name
      ? `${targetLang.language_name} (${params.languageCode})`
      : params.languageCode;

    return await BrowserAIService.fixSingleIssue({
      gameName: game.name,
      contextPrompt: game.context_prompt,
      targetLanguage: langLabel,
      whitelistTags: game.whitelist_tags,
      issue: params.issue,
    }, settings);
  }
}
