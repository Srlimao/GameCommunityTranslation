import { KeyTranslationItem, TranslationIssue } from '../../types/client_types.ts';

export interface CodeValidationSummary {
  totalChecked: number;
  cleanCount: number;
  tabMismatches: number;
  symbolMismatches: number;
  bracketMismatches: number;
  tagMismatches: number;
  newlineMismatches: number;
}

export interface CodeValidationResult {
  summary: CodeValidationSummary;
  issues: TranslationIssue[];
}

export class CodeValidator {
  /**
   * Validates code symbols, tab counts, placeholders, and formatting parity between source and translation.
   */
  static validateAll(items: KeyTranslationItem[]): CodeValidationResult {
    const issues: TranslationIssue[] = [];
    let tabCount = 0;
    let symbolCount = 0;
    let bracketCount = 0;
    let tagCount = 0;
    let newlineCount = 0;

    for (const item of items) {
      if (!item.translated_text || item.translated_text.trim().length === 0) {
        continue;
      }

      const itemIssues = this.validateItem(item);
      if (itemIssues.length > 0) {
        for (const iss of itemIssues) {
          if (iss.issue_type === 'tab_mismatch') tabCount++;
          else if (iss.issue_type === 'symbol_mismatch') symbolCount++;
          else if (iss.issue_type === 'placeholder_mismatch') bracketCount++;
          else if (iss.issue_type === 'formatting_loss') newlineCount++;
          issues.push(iss);
        }
      }
    }

    const totalChecked = items.length;
    const itemsWithIssues = new Set(issues.map((i) => i.key_path)).size;

    return {
      summary: {
        totalChecked,
        cleanCount: Math.max(0, totalChecked - itemsWithIssues),
        tabMismatches: tabCount,
        symbolMismatches: symbolCount,
        bracketMismatches: bracketCount,
        tagMismatches: tagCount,
        newlineMismatches: newlineCount,
      },
      issues,
    };
  }

  static validateItem(item: KeyTranslationItem): TranslationIssue[] {
    const issues: TranslationIssue[] = [];
    const src = item.source_text || '';
    const trg = item.translated_text || '';

    // 1. Tab count validation (\t)
    const srcTabs = (src.match(/\t/g) || []).length;
    const trgTabs = (trg.match(/\t/g) || []).length;
    if (srcTabs !== trgTabs) {
      const suggestion = this.fixTabs(src, trg, srcTabs, trgTabs);
      issues.push({
        key_id: item.key_id,
        language_id: item.language_id,
        key_path: item.key_path,
        source_text: src,
        translated_text: trg,
        issue_type: 'tab_mismatch',
        message: `Tab character count mismatch: Source contains ${srcTabs} tab(s) [\\t], but Translation contains ${trgTabs}.`,
        suggestion,
      });
    }

    // 2. Newline count validation (\n)
    const srcNewlines = (src.match(/\n/g) || []).length;
    const trgNewlines = (trg.match(/\n/g) || []).length;
    if (srcNewlines !== trgNewlines && srcNewlines > 0) {
      issues.push({
        key_id: item.key_id,
        language_id: item.language_id,
        key_path: item.key_path,
        source_text: src,
        translated_text: trg,
        issue_type: 'formatting_loss',
        message: `Newline count mismatch: Source contains ${srcNewlines} newline(s) [\\n], but Translation has ${trgNewlines}.`,
        suggestion: this.fixNewlines(src, trg),
      });
    }

    // 3. Brackets & Braces count / balance ({}, [], <>)
    const bracketPairs = [
      { open: '{', close: '}', name: 'Curly braces {}' },
      { open: '[', close: ']', name: 'Square brackets []' },
    ];

    for (const b of bracketPairs) {
      const srcOpen = (src.match(new RegExp(`\\${b.open}`, 'g')) || []).length;
      const srcClose = (src.match(new RegExp(`\\${b.close}`, 'g')) || []).length;
      const trgOpen = (trg.match(new RegExp(`\\${b.open}`, 'g')) || []).length;
      const trgClose = (trg.match(new RegExp(`\\${b.close}`, 'g')) || []).length;

      if (srcOpen !== trgOpen || srcClose !== trgClose) {
        issues.push({
          key_id: item.key_id,
          language_id: item.language_id,
          key_path: item.key_path,
          source_text: src,
          translated_text: trg,
          issue_type: 'symbol_mismatch',
          message: `${b.name} mismatch: Source has ${srcOpen} '${b.open}' and ${srcClose} '${b.close}', while Translation has ${trgOpen} '${b.open}' and ${trgClose} '${b.close}'.`,
          suggestion: this.fixMissingTokens(src, trg),
        });
      }
    }

    // 4. Placeholders & Variables: e.g. {0}, {player}, %s, %d, %1$s, $1, <color=...>, </color>, <b>, </b>
    const placeholderRegex = /(\{[^{}]+\}|%[0-9]*\$?[a-zA-Z]|<[^>]+>|\$[0-9]+)/g;
    const srcTokens = src.match(placeholderRegex) || [];
    const trgTokens = trg.match(placeholderRegex) || [];

    // Count frequency of tokens in source vs target
    const srcFreq = this.getFrequencyMap(srcTokens);
    const trgFreq = this.getFrequencyMap(trgTokens);

    const missingTokens: string[] = [];
    for (const [token, count] of Object.entries(srcFreq)) {
      const trgCount = trgFreq[token] || 0;
      if (trgCount < count) {
        missingTokens.push(`${token} (missing ${count - trgCount})`);
      }
    }

    const unexpectedTokens: string[] = [];
    for (const [token, count] of Object.entries(trgFreq)) {
      const srcCount = srcFreq[token] || 0;
      if (srcCount < count) {
        unexpectedTokens.push(`${token} (extra ${count - srcCount})`);
      }
    }

    if (missingTokens.length > 0 || unexpectedTokens.length > 0) {
      const detail = [
        missingTokens.length > 0 ? `Missing in translation: ${missingTokens.join(', ')}` : '',
        unexpectedTokens.length > 0 ? `Corrupted/Extra in translation: ${unexpectedTokens.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join('. ');

      issues.push({
        key_id: item.key_id,
        language_id: item.language_id,
        key_path: item.key_path,
        source_text: src,
        translated_text: trg,
        issue_type: 'placeholder_mismatch',
        message: `Code symbol/variable mismatch: ${detail}.`,
        suggestion: this.fixMissingTokens(src, trg),
      });
    }

    // 5. Trailing punctuation check (e.g. colon ":", semicolon ";")
    if (src.endsWith(':') && !trg.endsWith(':') && !trg.endsWith('：')) {
      issues.push({
        key_id: item.key_id,
        language_id: item.language_id,
        key_path: item.key_path,
        source_text: src,
        translated_text: trg,
        issue_type: 'formatting_loss',
        message: 'Trailing colon ":" missing in translation.',
        suggestion: trg + ':',
      });
    }

    return issues;
  }

  private static getFrequencyMap(arr: string[]): Record<string, number> {
    const map: Record<string, number> = {};
    for (const item of arr) {
      map[item] = (map[item] || 0) + 1;
    }
    return map;
  }

  private static fixTabs(src: string, trg: string, srcTabs: number, trgTabs: number): string {
    // If source starts with tabs, ensure target starts with same number of leading tabs
    const leadingSrcTabs = (src.match(/^\t+/) || [''])[0].length;
    const trailingSrcTabs = (src.match(/\t+$/) || [''])[0].length;
    let fixed = trg.replace(/^\t+/, '').replace(/\t+$/, '');

    if (leadingSrcTabs > 0) {
      fixed = '\t'.repeat(leadingSrcTabs) + fixed;
    }
    if (trailingSrcTabs > 0) {
      fixed = fixed + '\t'.repeat(trailingSrcTabs);
    }

    // If still missing internal tabs and source has tabs between words, match total count
    const fixedTabs = (fixed.match(/\t/g) || []).length;
    if (fixedTabs < srcTabs) {
      fixed = fixed + '\t'.repeat(srcTabs - fixedTabs);
    }
    return fixed;
  }

  private static fixNewlines(src: string, trg: string): string {
    const leadingNewlines = (src.match(/^\n+/) || [''])[0].length;
    const trailingNewlines = (src.match(/\n+$/) || [''])[0].length;
    let fixed = trg.replace(/^\n+/, '').replace(/\n+$/, '');

    if (leadingNewlines > 0) {
      fixed = '\n'.repeat(leadingNewlines) + fixed;
    }
    if (trailingNewlines > 0) {
      fixed = fixed + '\n'.repeat(trailingNewlines);
    }
    return fixed;
  }

  private static fixMissingTokens(src: string, trg: string): string {
    const placeholderRegex = /(\{[^{}]+\}|%[0-9]*\$?[a-zA-Z]|<[^>]+>|\$[0-9]+)/g;
    const srcTokens = src.match(placeholderRegex) || [];
    let fixed = trg;

    for (const token of srcTokens) {
      if (!fixed.includes(token)) {
        // Try common corrupted patterns, e.g. "{ player }" -> "{player}"
        const cleanName = token.replace(/[{}]/g, '').trim();
        const looseRegex = new RegExp(`\\{\\s*${cleanName}\\s*\\}`, 'g');
        if (looseRegex.test(fixed)) {
          fixed = fixed.replace(looseRegex, token);
        } else {
          // If completely missing and at end of source, append to target
          if (src.endsWith(token)) {
            fixed = fixed.trimEnd() + ' ' + token;
          }
        }
      }
    }
    return fixed;
  }
}
