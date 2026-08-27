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
  private static readonly TAG_REGEX = /<[^<>]+>|\[\/?[a-zA-Z0-9_#:=."'\-\s\\\/]+\]/g;
  private static readonly PLACEHOLDER_REGEX = /(\{[^{}]+\}|%[0-9]*\$?[a-zA-Z]|\$[0-9]+)/g;

  static validateAll(items: KeyTranslationItem[], whitelistTags?: string[]): CodeValidationResult {
    const issues: TranslationIssue[] = [];
    let tabCount = 0, symbolCount = 0, bracketCount = 0, tagCount = 0, newlineCount = 0;

    for (const item of items) {
      if (!item.translated_text?.trim()) continue;
      const itemIssues = this.validateItem(item, whitelistTags);
      for (const iss of itemIssues) {
        if (iss.issue_type === 'tab_mismatch') tabCount++;
        else if (iss.issue_type === 'symbol_mismatch') symbolCount++;
        else if (iss.issue_type === 'placeholder_mismatch') bracketCount++;
        else if (iss.issue_type === 'tag_mismatch') tagCount++;
        else if (iss.issue_type === 'formatting_loss') newlineCount++;
        issues.push(iss);
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

  static validateItem(item: KeyTranslationItem, whitelistTags?: string[]): TranslationIssue[] {
    const issues: TranslationIssue[] = [];
    const src = item.source_text || '';
    const trg = item.translated_text || '';
    this.checkTagParity(item, src, trg, issues, whitelistTags);
    this.checkPlaceholderParity(item, src, trg, issues);
    this.checkBracketBalance(item, src, trg, issues);
    this.checkTabParity(item, src, trg, issues);
    this.checkFormattingParity(item, src, trg, issues);
    return issues;
  }

  private static checkTagParity(item: KeyTranslationItem, src: string, trg: string, issues: TranslationIssue[], whitelistTags?: string[]): void {
    const srcTags = src.match(this.TAG_REGEX) || [];
    const trgTags = trg.match(this.TAG_REGEX) || [];
    const srcFreq = this.getFrequencyMap(srcTags);
    const trgFreq = this.getFrequencyMap(trgTags);

    if (whitelistTags && whitelistTags.length > 0) {
      const validSet = new Set<string>([...whitelistTags, ...srcTags, '</>']);
      const invalidTags: string[] = [];
      for (const [tag, count] of Object.entries(trgFreq)) {
        if (!validSet.has(tag)) invalidTags.push(`${tag}${count > 1 ? ` (${count})` : ''}`);
      }
      const missingTags: string[] = [];
      for (const [tag, count] of Object.entries(srcFreq)) {
        if (!trgFreq[tag] && trgTags.length === 0) missingTags.push(`${tag}${count > 1 ? ` (${count})` : ''}`);
      }
      if (invalidTags.length > 0 || missingTags.length > 0) {
        const details = [invalidTags.length > 0 ? `Corrupted/Not in whitelist: ${invalidTags.join(', ')}` : '', missingTags.length > 0 ? `Missing tag(s): ${missingTags.join(', ')}` : ''].filter(Boolean).join('. ');
        issues.push({ key_id: item.key_id, language_id: item.language_id, key_path: item.key_path, source_text: src, translated_text: trg, issue_type: 'tag_mismatch', message: `Tag whitelist validation: ${details}.`, suggestion: this.fixTagsAndTokens(src, trg) });
      }
    } else {
      const missingTags: string[] = [];
      for (const [tag, count] of Object.entries(srcFreq)) {
        const trgCount = trgFreq[tag] || 0;
        if (trgCount < count) missingTags.push(`${tag}${count - trgCount > 1 ? ` (missing ${count - trgCount})` : ''}`);
      }
      const extraTags: string[] = [];
      for (const [tag, count] of Object.entries(trgFreq)) {
        const srcCount = srcFreq[tag] || 0;
        if (srcCount < count) extraTags.push(`${tag}${count - srcCount > 1 ? ` (extra ${count - srcCount})` : ''}`);
      }
      if (missingTags.length > 0 || extraTags.length > 0) {
        const details = [missingTags.length > 0 ? `Missing in translation: ${missingTags.join(', ')}` : '', extraTags.length > 0 ? `Unexpected/Not in original: ${extraTags.join(', ')}` : ''].filter(Boolean).join('. ');
        issues.push({ key_id: item.key_id, language_id: item.language_id, key_path: item.key_path, source_text: src, translated_text: trg, issue_type: 'tag_mismatch', message: `Tag parity mismatch: ${details}.`, suggestion: this.fixTagsAndTokens(src, trg) });
      }
    }
  }

  private static checkPlaceholderParity(item: KeyTranslationItem, src: string, trg: string, issues: TranslationIssue[]): void {
    const srcFreq = this.getFrequencyMap(src.match(this.PLACEHOLDER_REGEX) || []);
    const trgFreq = this.getFrequencyMap(trg.match(this.PLACEHOLDER_REGEX) || []);
    const missing: string[] = [];
    for (const [token, count] of Object.entries(srcFreq)) {
      const trgCount = trgFreq[token] || 0;
      if (trgCount < count) missing.push(`${token}${count - trgCount > 1 ? ` (${count - trgCount})` : ''}`);
    }
    const extra: string[] = [];
    for (const [token, count] of Object.entries(trgFreq)) {
      const srcCount = srcFreq[token] || 0;
      if (srcCount < count) extra.push(`${token}${count - srcCount > 1 ? ` (${count - srcCount})` : ''}`);
    }
    if (missing.length > 0 || extra.length > 0) {
      const details = [missing.length > 0 ? `Missing: ${missing.join(', ')}` : '', extra.length > 0 ? `Unexpected: ${extra.join(', ')}` : ''].filter(Boolean).join('. ');
      issues.push({ key_id: item.key_id, language_id: item.language_id, key_path: item.key_path, source_text: src, translated_text: trg, issue_type: 'placeholder_mismatch', message: `Variable placeholder mismatch: ${details}.`, suggestion: this.fixTagsAndTokens(src, trg) });
    }
  }

  private static checkBracketBalance(item: KeyTranslationItem, src: string, trg: string, issues: TranslationIssue[]): void {
    const bracketPairs = [{ open: '{', close: '}', name: 'Curly braces {}' }, { open: '[', close: ']', name: 'Square brackets []' }];
    for (const b of bracketPairs) {
      const srcOpen = (src.match(new RegExp(`\\${b.open}`, 'g')) || []).length;
      const srcClose = (src.match(new RegExp(`\\${b.close}`, 'g')) || []).length;
      const trgOpen = (trg.match(new RegExp(`\\${b.open}`, 'g')) || []).length;
      const trgClose = (trg.match(new RegExp(`\\${b.close}`, 'g')) || []).length;
      if (srcOpen !== trgOpen || srcClose !== trgClose) {
        issues.push({ key_id: item.key_id, language_id: item.language_id, key_path: item.key_path, source_text: src, translated_text: trg, issue_type: 'symbol_mismatch', message: `${b.name} mismatch: Source (${srcOpen} '${b.open}', ${srcClose} '${b.close}') vs Translation (${trgOpen} '${b.open}', ${trgClose} '${b.close}').`, suggestion: this.fixTagsAndTokens(src, trg) });
      }
    }
  }

  private static checkTabParity(item: KeyTranslationItem, src: string, trg: string, issues: TranslationIssue[]): void {
    const srcTabs = (src.match(/\t/g) || []).length;
    const trgTabs = (trg.match(/\t/g) || []).length;
    if (srcTabs !== trgTabs) {
      issues.push({ key_id: item.key_id, language_id: item.language_id, key_path: item.key_path, source_text: src, translated_text: trg, issue_type: 'tab_mismatch', message: `Tab character mismatch: Source has ${srcTabs} tab(s) [\\t], translation has ${trgTabs}.`, suggestion: this.fixTabs(src, trg, srcTabs) });
    }
  }

  private static checkFormattingParity(item: KeyTranslationItem, src: string, trg: string, issues: TranslationIssue[]): void {
    const srcNewlines = (src.match(/\n/g) || []).length;
    const trgNewlines = (trg.match(/\n/g) || []).length;
    if (srcNewlines !== trgNewlines && srcNewlines > 0) {
      issues.push({ key_id: item.key_id, language_id: item.language_id, key_path: item.key_path, source_text: src, translated_text: trg, issue_type: 'formatting_loss', message: `Newline count mismatch: Source has ${srcNewlines} newline(s) [\\n], translation has ${trgNewlines}.`, suggestion: this.fixNewlines(src, trg) });
    }
    if (src.endsWith(':') && !trg.endsWith(':') && !trg.endsWith('：')) {
      issues.push({ key_id: item.key_id, language_id: item.language_id, key_path: item.key_path, source_text: src, translated_text: trg, issue_type: 'formatting_loss', message: 'Trailing colon ":" missing in translation.', suggestion: trg + ':' });
    }
  }

  private static getFrequencyMap(arr: string[]): Record<string, number> {
    const map: Record<string, number> = {};
    for (const item of arr) map[item] = (map[item] || 0) + 1;
    return map;
  }

  private static fixTabs(src: string, trg: string, srcTabs: number): string {
    const leading = (src.match(/^\t+/) || [''])[0].length;
    const trailing = (src.match(/\t+$/) || [''])[0].length;
    let fixed = trg.replace(/^\t+/, '').replace(/\t+$/, '');
    if (leading > 0) fixed = '\t'.repeat(leading) + fixed;
    if (trailing > 0) fixed = fixed + '\t'.repeat(trailing);
    const curr = (fixed.match(/\t/g) || []).length;
    if (curr < srcTabs) fixed = fixed + '\t'.repeat(srcTabs - curr);
    return fixed;
  }

  private static fixNewlines(src: string, trg: string): string {
    const leading = (src.match(/^\n+/) || [''])[0].length;
    const trailing = (src.match(/\n+$/) || [''])[0].length;
    let fixed = trg.replace(/^\n+/, '').replace(/\n+$/, '');
    if (leading > 0) fixed = '\n'.repeat(leading) + fixed;
    if (trailing > 0) fixed = fixed + '\n'.repeat(trailing);
    return fixed;
  }

  private static fixTagsAndTokens(src: string, trg: string): string {
    let fixed = trg
      .replace(/<([a-zA-Z0-9_#:=."'\-]+)\s*\\+>/g, '<$1>')
      .replace(/<\/\s*\\+>/g, '</>')
      .replace(/<\\\s*([a-zA-Z0-9_#:=."'\-]+)>/g, '</$1>')
      .replace(/<\\\s*\/>/g, '</>')
      .replace(/\\<([a-zA-Z0-9_#:=."'\-]+)>/g, '<$1>')
      .replace(/\\<\\?\/([a-zA-Z0-9_#:=."'\-]+)>/g, '</$1>')
      .replace(/\\<\/\>/g, '</>')
      .replace(/\[([a-zA-Z0-9_#:=."'\-]+)\s*\\+\]/g, '[$1]')
      .replace(/\[\/\s*\\+\]/g, '[/]');

    const srcPlaceholders = src.match(this.PLACEHOLDER_REGEX) || [];
    for (const token of srcPlaceholders) {
      if (!fixed.includes(token)) {
        const cleanName = token.replace(/[{}]/g, '').trim();
        const looseRegex = new RegExp(`\\{\\s*${cleanName}\\s*\\}`, 'g');
        if (looseRegex.test(fixed)) fixed = fixed.replace(looseRegex, token);
        else if (src.endsWith(token)) fixed = fixed.trimEnd() + ' ' + token;
      }
    }
    return fixed;
  }
}
