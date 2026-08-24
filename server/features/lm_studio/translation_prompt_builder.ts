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
  private static parseContext(rawContext: string): { systemAdditions: string[]; userContext: string } {
    const systemAdditions: string[] = [];
    let userContext = rawContext || '';

    if (!rawContext || !rawContext.trim()) {
      return { systemAdditions, userContext: '' };
    }

    try {
      if (rawContext.trim().startsWith('{') && rawContext.includes('loreElements')) {
        const parsed = JSON.parse(rawContext);

        // 1. Style Guide Constraints
        if (parsed.styleGuide) {
          const sg = parsed.styleGuide;
          const rules: string[] = [];
          if (sg.grammaticalGender) rules.push(`- Gender Policy: ${sg.grammaticalGender.replace(/_/g, ' ')}`);
          if (sg.genderNote) rules.push(`  (${sg.genderNote})`);
          if (sg.punctuationConvention) rules.push(`- Punctuation Policy: ${sg.punctuationConvention.replace(/_/g, ' ')}`);
          if (sg.honorificsPolicy) rules.push(`- Honorifics Policy: ${sg.honorificsPolicy.replace(/_/g, ' ')}`);
          if (sg.uiLengthConstraint) rules.push(`- Length Constraint: ${sg.uiLengthConstraint.replace(/_/g, ' ')}`);
          if (sg.customLocaleRules) rules.push(`- Locale Directives: ${sg.customLocaleRules}`);
          if (rules.length > 0) {
            systemAdditions.push(`### STYLE GUIDE & CONSTRAINTS:\n${rules.join('\n')}`);
          }
        }

        // 2. Lore Elements for System Prompt
        if (Array.isArray(parsed.loreElements)) {
          const systemLore = parsed.loreElements.filter((l: any) => l.target === 'system_prompt');
          if (systemLore.length > 0) {
            const loreText = systemLore
              .map((l: any) => `- [${l.category}] ${l.concept} (Priority: ${l.importance}): ${l.description}`)
              .join('\n');
            systemAdditions.push(`### WORLD LORE & TERMINOLOGY:\n${loreText}`);
          }

          const preContextLore = parsed.loreElements.filter((l: any) => l.target === 'pre_context' || l.target === 'user_task');
          if (preContextLore.length > 0) {
            userContext = preContextLore
              .map((l: any) => `- [${l.category}] ${l.concept}: ${l.description}`)
              .join('\n');
          } else {
            userContext = '';
          }
        }

        // 3. Characters Dossier
        if (Array.isArray(parsed.characters) && parsed.characters.length > 0) {
          const charText = parsed.characters
            .map((c: any) => `* Character: ${c.name} (${c.role}) | Register: ${c.register} | Quirks: ${c.speechPatterns}`)
            .join('\n');
          systemAdditions.push(`### CHARACTER VOICE DOSSIER:\n${charText}`);
        }

        if (parsed.rawNotes?.trim()) {
          userContext += (userContext ? '\n' : '') + parsed.rawNotes.trim();
        }

        return { systemAdditions, userContext };
      }
    } catch {
      // Plain text fallback
    }

    return { systemAdditions, userContext };
  }

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

    const { systemAdditions, userContext } = this.parseContext(gameContext);

    let systemPrompt = `You are a professional video game localization specialist and translator.
Translate game text accurately from ${baseLanguage} into ${targetLanguageName} (${targetLanguageCode}).

### RULES & CONSTRAINTS:
1. Preserve all placeholders, variables, tags, and formatting codes EXACTLY as they are (e.g., {0}, {player}, {count}, %s, %d, <color=...>, [b], \\n, etc.). Do not translate variable names.
2. Maintain the tone, style, emotion, and character voice fitting the game's setting.
3. Adhere strictly to all glossary terms provided.
4. Output ONLY the raw translated string. Never include explanations, conversational filler, quotation marks, or markdown fences unless part of the original text.`;

    if (systemAdditions.length > 0) {
      systemPrompt += `\n\n` + systemAdditions.join('\n\n');
    }

    const userPrompt = `### GAME INFORMATION:
Game: ${gameName}
${userContext ? `Context & Lore:\n${userContext}` : ''}
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
