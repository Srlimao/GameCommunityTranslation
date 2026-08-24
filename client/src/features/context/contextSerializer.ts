import { StructuredGameContext, LoreElement, CharacterDossier, StyleGuideRules } from './types.ts';

export const DEFAULT_STYLE_GUIDE: StyleGuideRules = {
  grammaticalGender: 'neutral_default',
  genderNote: 'Use gender-neutral phrasing for protagonist unless specified by {player_gender} tag.',
  punctuationConvention: 'standard',
  honorificsPolicy: 'preserve_original',
  uiLengthConstraint: 'approximate_expansion_30',
  customLocaleRules: 'Keep variable tokens (e.g. {0}, {count}, <color=...>) strictly unmodified.',
};

export const DEFAULT_STRUCTURED_CONTEXT: StructuredGameContext = {
  loreElements: [
    {
      id: 'lore-1',
      category: 'World',
      concept: 'Aethelgard High Kingdom',
      description: 'Ancient continent suspended in crystal sky, deeply spiritual and traditional.',
      importance: 'high',
      target: 'system_prompt',
    },
    {
      id: 'lore-2',
      category: 'Magic/Tech',
      concept: 'Aetherite Shards',
      description: 'Glowing energy crystals used in both technology and divine rituals. Always capitalize.',
      importance: 'critical',
      target: 'system_prompt',
    },
  ],
  characters: [
    {
      id: 'char-1',
      name: 'Commander Valen',
      role: 'Veteran Knight of the Sun Vanguard',
      speechPatterns: 'Authoritative, concise military jargon, speaks with stoic restraint.',
      register: 'formal',
      sampleLines: ['Stand fast, recruit. The vanguard breaks for no one.'],
    },
    {
      id: 'char-2',
      name: 'Pip the Scrapper',
      role: 'Underground smuggler & tinkerer',
      speechPatterns: 'Fast-paced, uses underworld slang, short fragmented sentences.',
      register: 'rude_slang',
      sampleLines: ['Keep your voice down or the Enforcers will take our cut!'],
    },
  ],
  styleGuide: DEFAULT_STYLE_GUIDE,
  rawNotes: '',
};

export class ContextSerializer {
  static parse(raw: string | undefined): StructuredGameContext {
    if (!raw || !raw.trim()) {
      return JSON.parse(JSON.stringify(DEFAULT_STRUCTURED_CONTEXT));
    }

    try {
      if (raw.trim().startsWith('{') && raw.includes('loreElements')) {
        const parsed = JSON.parse(raw);
        return {
          loreElements: Array.isArray(parsed.loreElements) ? parsed.loreElements : [],
          characters: Array.isArray(parsed.characters) ? parsed.characters : [],
          styleGuide: { ...DEFAULT_STYLE_GUIDE, ...(parsed.styleGuide || {}) },
          rawNotes: parsed.rawNotes || '',
        };
      }
    } catch {
      // Fallback to plain text wrapping
    }

    return {
      loreElements: [
        {
          id: 'imported-raw',
          category: 'World',
          concept: 'Primary World Setting',
          description: raw.trim(),
          importance: 'high',
          target: 'system_prompt',
        },
      ],
      characters: [],
      styleGuide: DEFAULT_STYLE_GUIDE,
      rawNotes: raw,
    };
  }

  static serialize(context: StructuredGameContext): string {
    return JSON.stringify(context, null, 2);
  }

  static synthesizeSystemPrompt(context: StructuredGameContext, baseLang = 'en-US', targetLang = 'es-ES'): string {
    const lines: string[] = [];

    lines.push(`### LOCALIZATION SYSTEM DIRECTIVE`);
    lines.push(`Role: Lead Game Localization Specialist translating from ${baseLang} to ${targetLang}.`);
    lines.push(`Goal: Produce fluid, natural, character-accurate in-game translations while respecting system constraints.`);

    // 1. Style Guide Constraints
    lines.push(`\n### 1. STYLE GUIDE & GRAMMATICAL CONSTRAINTS:`);
    lines.push(`- Grammatical Gender Policy: ${context.styleGuide.grammaticalGender.replace(/_/g, ' ').toUpperCase()}`);
    if (context.styleGuide.genderNote) {
      lines.push(`  Details: ${context.styleGuide.genderNote}`);
    }
    lines.push(`- Punctuation Convention: ${context.styleGuide.punctuationConvention.replace(/_/g, ' ').toUpperCase()}`);
    lines.push(`- Honorifics Policy: ${context.styleGuide.honorificsPolicy.replace(/_/g, ' ').toUpperCase()}`);
    lines.push(`- UI Length Constraints: ${context.styleGuide.uiLengthConstraint.replace(/_/g, ' ').toUpperCase()}`);
    if (context.styleGuide.customLocaleRules) {
      lines.push(`- Additional Locale Directives:\n  ${context.styleGuide.customLocaleRules}`);
    }

    // 2. Lore Elements (System Prompt Targets)
    const systemLore = context.loreElements.filter((l) => l.target === 'system_prompt');
    if (systemLore.length > 0) {
      lines.push(`\n### 2. CORE WORLD LORE & TERMINOLOGY (INJECTION: SYSTEM PROMPT):`);
      for (const item of systemLore) {
        lines.push(`- [${item.category}] [Priority: ${item.importance.toUpperCase()}] ${item.concept}: ${item.description}`);
      }
    }

    // 3. Character Binder
    if (context.characters.length > 0) {
      lines.push(`\n### 3. CHARACTER REGISTER & VOICE DOSSIER:`);
      for (const char of context.characters) {
        lines.push(`* Character: ${char.name} (${char.role})`);
        lines.push(`  Register: ${char.register.replace(/_/g, ' ').toUpperCase()} | Quirks: ${char.speechPatterns}`);
        if (char.sampleLines.length > 0) {
          lines.push(`  Sample Voice: "${char.sampleLines.join(' / ')}"`);
        }
      }
    }

    if (context.rawNotes && context.rawNotes.trim()) {
      lines.push(`\n### 4. SUPPLEMENTAL PROJECT NOTES:\n${context.rawNotes.trim()}`);
    }

    return lines.join('\n');
  }

  static synthesizeUserPreContext(context: StructuredGameContext): string {
    const preContextLore = context.loreElements.filter((l) => l.target === 'pre_context');
    if (preContextLore.length === 0) return '';

    const lines: string[] = ['### IN-SCOPE LORE CONTEXT:'];
    for (const item of preContextLore) {
      lines.push(`- [${item.category}] [Priority: ${item.importance.toUpperCase()}] ${item.concept}: ${item.description}`);
    }
    return lines.join('\n');
  }
}
