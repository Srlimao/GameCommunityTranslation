import { GlossaryEntry } from '../../types/domain_types.ts';

export interface PromptInputParams {
  gameName: string;
  gameContext: string;
  baseLanguage: string;
  targetLanguageName: string;
  targetLanguageCode: string;
  keyPath: string;
  sourceText: string;
  glossary: GlossaryEntry[];
  customInstructions?: string;
}

export class TranslationPromptBuilder {
  static buildPrompt(params: PromptInputParams): { system: string; user: string } {
    const {
      gameName,
      gameContext,
      baseLanguage,
      targetLanguageName,
      targetLanguageCode,
      keyPath,
      sourceText,
      glossary,
      customInstructions,
    } = params;

    // Format glossary if present
    let glossarySection = '';
    if (glossary.length > 0) {
      const formattedItems = glossary
        .map(item => {
          const notesPart = item.notes ? ` (Note: ${item.notes})` : '';
          const catPart = item.category ? ` [${item.category}]` : '';
          return `- "${item.source_term}" -> "${item.target_term}"${catPart}${notesPart}`;
        })
        .join('\n');

      glossarySection = `\n### MANDATORY GLOSSARY (Strictly enforce these exact terms):\n${formattedItems}\n`;
    }

    const systemPrompt = `You are a professional video game localization specialist and translator.
Translate game text accurately from ${baseLanguage} into ${targetLanguageName} (${targetLanguageCode}).

### RULES & CONSTRAINTS:
1. Preserve all placeholders, variables, tags, and formatting codes EXACTLY as they are (e.g., {0}, {player}, {count}, %s, %d, <color=...>, [b], \\n, etc.). Do not translate variable names.
2. Maintain the tone, style, emotion, and character voice fitting the game's setting.
3. Adhere strictly to all glossary terms provided.
4. Output ONLY the raw translated string. Never include explanations, conversational filler, quotation marks, or markdown fences unless part of the original text.`;

    const userPrompt = `### GAME INFORMATION:
Game: ${gameName}
${gameContext ? `Context & Lore:\n${gameContext}` : ''}
${glossarySection}
${customInstructions ? `Special Instructions:\n${customInstructions}\n` : ''}
### TRANSLATION TASK:
- Key Path: ${keyPath}
- Source Text (${baseLanguage}): ${sourceText}
- Target Language: ${targetLanguageName} (${targetLanguageCode})

Translate the source text to ${targetLanguageName}. Return ONLY the translation:`;

    return {
      system: systemPrompt,
      user: userPrompt,
    };
  }
}
