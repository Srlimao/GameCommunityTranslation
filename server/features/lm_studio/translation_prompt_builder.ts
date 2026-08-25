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

export interface PromptRefinerParams extends PromptInputParams {
  draftTranslation: string;
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
1. GAME ENGINE TAG & FORMATTING INTEGRITY (CRITICAL):
   - Preserve all game engine tags, rich text markup, placeholders, and variables EXACTLY as they appear in the source text.
   - Specifically support Unreal Engine / Unity formatting syntax:
     * <b>text</> or <b>text</b> (CRITICAL: NEVER convert to Markdown **text** or *text*).
     * Custom style tags: <rare>text</>, <highlight>text</>, <warning>text</>, <param>{0}</>, etc.
     * Self-closing image/icon tags: <img id="..."/>
     * Placeholders: {0}, {value}, {player}, %s, %d, \\n, \\r
   - NEVER replace HTML/XML/Unreal tags with Markdown formatting. Keep the exact <tag>...</> or <tag>...</tag> structure around the translated words.
2. TONE & CONTEXT:
   - Maintain the tone, style, emotion, and character voice fitting the game's setting.
3. GLOSSARY COMPLIANCE:
   - Adhere strictly to all glossary terms provided.
4. CLEAN RAW OUTPUT:
   - Output ONLY the raw translated string. Never include explanations, conversational filler, surrounding quotation marks, or markdown code fences (\`\`\`).`;

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

Translate the source text to ${targetLanguageName}. Preserve all game tags (like <b>...</>) exactly as written. Return ONLY the translation:`;

    return {
      system: systemPrompt,
      user: userPrompt,
    };
  }

  /**
   * Builds prompt for Pass 2 (Verification, Auditor & Formatting Refiner).
   * Compares the source text with the draft translation, audits tag parity, and corrects formatting/grammar.
   */
  static buildRefinerPrompt(params: PromptRefinerParams): { system: string; user: string } {
    const {
      gameName,
      gameContext,
      baseLanguage,
      targetLanguageName,
      targetLanguageCode,
      keyPath,
      sourceText,
      draftTranslation,
      glossary,
      customInstructions,
    } = params;

    let glossarySection = '';
    if (glossary.length > 0) {
      const formattedItems = glossary
        .map(item => {
          const notesPart = item.notes ? ` (Note: ${item.notes})` : '';
          const catPart = item.category ? ` [${item.category}]` : '';
          return `- "${item.source_term}" -> "${item.target_term}"${catPart}${notesPart}`;
        })
        .join('\n');

      glossarySection = `\n### MANDATORY GLOSSARY CONSTRAINTS:\n${formattedItems}\n`;
    }

    const { systemAdditions, userContext } = this.parseContext(gameContext);

    let systemPrompt = `You are a professional game localization QA specialist and formatting auditor.
Your job is to compare a source game string against a draft translation, check for errors, formatting tag parity, and tone, then produce the final corrected translation in ${targetLanguageName} (${targetLanguageCode}).

### AUDIT CRITERIA & RULES:
1. FORMATTING & TAG INTEGRITY (HIGHEST PRIORITY):
   - Every tag present in the source text must be preserved in the final output (e.g. <b>...</>, <rare>...</>, <img id="..."/>, <highlight>...</>, <warning>...</>, <param>{0}</>).
   - If the draft translation converted HTML/Unreal tags into Markdown (like converting <b>text</> into **text** or *text*), FIX IT by restoring the exact game tag syntax around the translated words.
   - Preserve all variables ({0}, {value}, {player}, %s, %d, \\n) without translating or altering them.
2. ACCURACY & GLOSSARY:
   - Ensure mandatory glossary terms are used accurately.
   - Ensure the meaning and emotion are faithfully conveyed without omitting information.
3. OUTPUT FORMAT:
   - Output ONLY the final corrected translation string.
   - NEVER output commentary, explanations, reasoning, or markdown code fences (\`\`\`).`;

    if (systemAdditions.length > 0) {
      systemPrompt += `\n\n` + systemAdditions.join('\n\n');
    }

    const userPrompt = `### GAME CONTEXT:
Game: ${gameName}
${userContext ? `Context:\n${userContext}` : ''}
${glossarySection}
${customInstructions ? `Special Instructions:\n${customInstructions}\n` : ''}
### TRANSLATION AUDIT TASK:
- Key Path: ${keyPath}
- Source Text (${baseLanguage}): ${sourceText}
- Draft Translation (${targetLanguageName}): ${draftTranslation}

Compare the draft translation with the source text. Fix any formatting tag drifts (e.g., restore <b>...</> if markdown ** ** was used), variable issues, or translation errors.
Return ONLY the final corrected translation:`;

    return {
      system: systemPrompt,
      user: userPrompt,
    };
  }
}
