import { AIService } from '../ai_providers/ai_service.ts';
import { GlossaryCandidate, GlossaryEntry, TranslationIssue } from '../../types/domain_types.ts';

export interface AnalysisInput {
  gameName: string;
  gameContext: string;
  targetLanguageName: string;
  targetLanguageCode: string;
  existingGlossary: GlossaryEntry[];
  translationPairs: Array<{
    keyPath: string;
    sourceText: string;
    translatedText: string;
  }>;
  userId?: string;
}

export interface AnalysisOutput {
  candidates: GlossaryCandidate[];
  issues: TranslationIssue[];
}

export class GlossaryExtractor {
  static async analyzeTranslations(input: AnalysisInput): Promise<AnalysisOutput> {
    const { gameName, gameContext, targetLanguageName, targetLanguageCode, existingGlossary, translationPairs, userId } = input;

    // Filter out pairs that are empty
    const validPairs = translationPairs.filter(p => p.sourceText?.trim() && p.translatedText?.trim());
    if (validPairs.length === 0) {
      return { candidates: [], issues: [] };
    }

    const existingGlossaryList = existingGlossary
      .map(g => `- "${g.source_term}" -> "${g.target_term}" (${g.category})`)
      .join('\n');

    const pairsList = validPairs
      .slice(0, 100) // Process up to 100 pairs per batch for optimal context
      .map((p, idx) => `[Item ${idx + 1}] Key: ${p.keyPath}\nSource: "${p.sourceText}"\nTranslation: "${p.translatedText}"`)
      .join('\n\n');

    const systemInstruction = `You are a Lead Game Localization Director & Terminology Specialist.
Your task is to analyze translated game text pairs against the original source text and the game's world lore.
Identify:
1. Candidate Glossary Terms: Key recurring terms (character names, faction names, special abilities, unique locations, UI concepts, game mechanics) that SHOULD be standardized in the game glossary to ensure consistency.
2. Translation Quality Issues: Missing or corrupted placeholders (like {player} or {0} or %s), severe tone mismatches, or glossary violations.

Output MUST be valid JSON adhering to this exact schema:
{
  "candidates": [
    {
      "source_term": "string (original name/term in source language)",
      "suggested_translation": "string (standardized translation in target language)",
      "category": "Character" | "Item" | "Location" | "UI" | "Lore" | "General",
      "explanation": "string (why this term should be in the glossary)",
      "sample_context": "string (short context where it appeared)"
    }
  ],
  "issues": [
    {
      "key_path": "string",
      "source_text": "string",
      "translated_text": "string",
      "issue_type": "placeholder_mismatch" | "terminology_inconsistency" | "formatting_loss" | "meaning_drift",
      "message": "string (concise explanation of the problem)",
      "suggestion": "string (optional corrected translation)"
    }
  ]
}`;

    const prompt = `### GAME CONTEXT:
Game: ${gameName}
${gameContext ? `Lore & Setting:\n${gameContext}` : ''}
Target Language: ${targetLanguageName} (${targetLanguageCode})

### CURRENT EXISTING GLOSSARY (Do not suggest terms already in this list):
${existingGlossaryList || 'None'}

### TRANSLATION PAIRS TO INSPECT:
${pairsList}

Analyze the pairs and return candidate glossary entries and any translation issues in valid JSON format:`;

    const result = await AIService.generateStructuredJson<AnalysisOutput>(prompt, systemInstruction, userId);
    return {
      candidates: Array.isArray(result?.candidates) ? result.candidates : [],
      issues: Array.isArray(result?.issues) ? result.issues : [],
    };
  }
}
